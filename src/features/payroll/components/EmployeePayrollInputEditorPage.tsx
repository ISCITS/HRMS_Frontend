"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import TextsmsOutlinedIcon from "@mui/icons-material/TextsmsOutlined";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";

import styles from "@/features/payroll/components/PayrollScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import {
  createEmptyEmployeePayrollInputLine,
  createInitialEmployeePayrollInputForm,
  employeePayrollInputService,
  toEmployeePayrollInputFormValues,
} from "@/features/payroll/services/employeePayrollInputService";
import type {
  EmployeePayrollInputFormLine,
  EmployeePayrollInputFormOptions,
  EmployeePayrollInputFormValues,
} from "@/features/payroll/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

const lstEmployeePayrollInputModuleCodes = ["EMPLOYEE_PAYROLL_INPUT", "EMPLOYEE_PAYROLL_INPUTS", "PAYROLL_INPUT", "PAYROLL_INPUTS"];
const lstEmployeePayrollInputStatuses: EmployeePayrollInputFormValues["strStatus"][] = ["Draft", "Submitted", "Approved", "Locked"];
const lstEmployeePayrollInputLineTypes: Array<{ strCode: EmployeePayrollInputFormLine["strLineType"]; strLabelKey: string; strLabel: string }> = [
  { strCode: "addition", strLabelKey: "line_type_addition", strLabel: "Addition" },
  { strCode: "deduction", strLabelKey: "line_type_deduction", strLabel: "Deduction" },
  { strCode: "recovery", strLabelKey: "line_type_recovery", strLabel: "Recovery" },
  { strCode: "arrear", strLabelKey: "line_type_arrear", strLabel: "Arrear" },
  { strCode: "reimbursement", strLabelKey: "line_type_reimbursement", strLabel: "Reimbursement" },
];

type EmployeePayrollInputEditorPageProps = {
  strMode: "add" | "edit" | "view";
  intInputID?: number;
  strBackRoute?: string;
};

function formatAmount(decValue: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(decValue);
}

function parseAmount(strValue: string) {
  const decValue = Number(strValue);
  return Number.isFinite(decValue) ? decValue : 0;
}

function parseSelectNumber(strValue: string): number | "" {
  if (!strValue) {
    return "";
  }
  const intValue = Number(strValue);
  return Number.isFinite(intValue) ? intValue : "";
}

const objFieldSx = {
  "& .MuiInputLabel-root": {
    color: "#31456a",
    fontWeight: 700,
    fontSize: "0.82rem",
  },
  "& .MuiInputLabel-shrink": {
    transform: "translate(14px, -8px) scale(0.86)",
  },
  "& .MuiOutlinedInput-root": {
    borderRadius: "14px",
    backgroundColor: "#ffffff",
    minHeight: 40,
    "& fieldset": {
      borderColor: "rgba(189, 200, 226, 0.95)",
    },
    "&:hover fieldset": {
      borderColor: "#7c8fdf",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#5a54ff",
      boxShadow: "0 0 0 3px rgba(90, 84, 255, 0.12)",
    },
  },
  "& .MuiInputBase-input": {
    color: "#22335a",
    fontSize: "0.84rem",
    paddingTop: "9px",
    paddingBottom: "9px",
  },
  "& .MuiSelect-select": {
    minHeight: "unset !important",
  },
  "& .MuiFormHelperText-root": {
    color: "#5f719a",
    fontSize: "0.76rem",
    lineHeight: 1.35,
    marginLeft: 2,
    marginTop: "4px",
  },
};

const objReadOnlyFieldSx = {
  ...objFieldSx,
  "& .MuiOutlinedInput-root": {
    ...objFieldSx["& .MuiOutlinedInput-root"],
    backgroundColor: "#ffffff",
  },
};

export default function EmployeePayrollInputEditorPage({
  strMode,
  intInputID,
  strBackRoute,
}: EmployeePayrollInputEditorPageProps) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("employee-payroll-input");
  const { t: tCommon } = useModuleLabels("common");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstEmployeePayrollInputModuleCodes);
  const [dicForm, setDicForm] = useState<EmployeePayrollInputFormValues>(
    createInitialEmployeePayrollInputForm()
  );
  const [objOptions, setObjOptions] = useState<EmployeePayrollInputFormOptions | null>(
    null
  );
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const blnCanView = canViewAny() || canDoAny("list");
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanSave = strMode === "add" ? blnCanAdd : blnCanEdit;
  const blnReadOnly = strMode === "view" || (strMode === "edit" && blnCanView && !blnCanEdit);

  useEffect(() => {
    if (blnRightsLoading || (!blnCanView && !blnCanSave)) {
      setBlnLoading(false);
      return;
    }

    let blnMounted = true;

    async function loadPage() {
      setBlnLoading(true);
      setStrError("");
      try {
        const [objOptionsResult, objInputResult] = await Promise.allSettled([
          employeePayrollInputService.getFormOptions(),
          (strMode === "edit" || strMode === "view") && intInputID
            ? employeePayrollInputService.getEmployeePayrollInputById(intInputID)
            : Promise.resolve(null),
        ]);
        if (!blnMounted) {
          return;
        }

        if (objOptionsResult.status === "fulfilled") {
          setObjOptions(objOptionsResult.value);
        }

        if (objInputResult.status === "fulfilled" && objInputResult.value) {
          setDicForm(toEmployeePayrollInputFormValues(objInputResult.value));
        }

        const lstLoadErrors = [
          {
            strLabel: t("form_options_load_error", "Options"),
            objResult: objOptionsResult,
          },
          {
            strLabel: t("details_load_error", "Details"),
            objResult: objInputResult,
          },
        ]
          .filter(({ objResult }) => objResult.status === "rejected")
          .map(({ strLabel, objResult }) => {
            const strMessage =
              objResult.status === "rejected" && objResult.reason instanceof Error
                ? objResult.reason.message
                : "Unable to load payroll input workspace.";
            return `${strLabel}: ${strMessage}`;
          });
        if (lstLoadErrors.length) {
          setStrError(lstLoadErrors.join(" "));
        }
      } catch (objError) {
        if (blnMounted) {
          setStrError(
            objError instanceof Error
              ? objError.message
              : "Unable to load payroll input workspace."
          );
        }
      } finally {
        if (blnMounted) {
          setBlnLoading(false);
        }
      }
    }

    loadPage().catch(() => undefined);
    return () => {
      blnMounted = false;
    };
  }, [intInputID, strMode, blnRightsLoading, blnCanView, blnCanSave]);

  const dicSelectedEmployee = useMemo(
    () =>
      objOptions?.lstEmployees.find(
        (dicEmployee) => dicEmployee.intID === dicForm.intEmployeeID
      ) ?? null,
    [dicForm.intEmployeeID, objOptions]
  );

  const dicSelectedRun = useMemo(
    () =>
      objOptions?.lstPayrollRuns.find(
        (dicRun) => dicRun.intID === dicForm.intPayrollRunID
      ) ?? null,
    [dicForm.intPayrollRunID, objOptions]
  );

  const decTotalLines = useMemo(
    () =>
      dicForm.lstLines.reduce(
        (decTotal, dicLine) => decTotal + parseAmount(dicLine.strAmount),
        0
      ),
    [dicForm.lstLines]
  );

  const blnFormLocked =
    blnSaving || blnRightsLoading || !blnCanSave || blnReadOnly || dicForm.blnIsLocked || dicForm.strStatus === "Locked";

  function translateStatus(strStatus: string | null | undefined) {
    switch (strStatus) {
      case "Draft":
        return t("status_draft", "Draft");
      case "Submitted":
        return t("status_submitted", "Submitted");
      case "Locked":
        return t("status_locked", "Locked");
      case "Open":
        return t("status_open", "Open");
      case "Approved":
        return t("status_approved", "Approved");
      case "Processed":
        return t("status_processed", "Processed");
      case "Closed":
        return t("status_closed", "Closed");
      default:
        return strStatus ?? "";
    }
  }

  function updateField<TKey extends keyof EmployeePayrollInputFormValues>(
    strField: TKey,
    objValue: EmployeePayrollInputFormValues[TKey]
  ) {
    setDicForm((dicPrevious) => ({ ...dicPrevious, [strField]: objValue }));
  }

  function updateLine(
    intTempID: number,
    strField: keyof EmployeePayrollInputFormLine,
    objValue: EmployeePayrollInputFormLine[keyof EmployeePayrollInputFormLine]
  ) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstLines: dicPrevious.lstLines.map((dicLine) =>
        dicLine.intTempID === intTempID
          ? { ...dicLine, [strField]: objValue }
          : dicLine
      ),
    }));
  }

  function addLine() {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstLines: [...dicPrevious.lstLines, createEmptyEmployeePayrollInputLine()],
    }));
  }

  function removeLine(intTempID: number) {
    setDicForm((dicPrevious) => {
      const lstFilteredLines = dicPrevious.lstLines.filter(
        (dicLine) => dicLine.intTempID !== intTempID
      );
      return {
        ...dicPrevious,
        lstLines: lstFilteredLines.length
          ? lstFilteredLines
          : [createEmptyEmployeePayrollInputLine()],
      };
    });
  }

  function validateForm() {
    if (!dicForm.intEmployeeID) {
      return t("employee_required", "Employee is required.");
    }
    if (!dicForm.intPayrollRunID) {
      return t("payroll_run_required", "Payroll run is required.");
    }
    if (
      dicForm.lstLines.some(
        (dicLine) => !dicLine.intSalaryComponentID || !dicLine.strAmount.trim()
      )
    ) {
      return t(
        "input_line_required",
        "Each payroll input line must have a salary component and amount."
      );
    }
    if (
      dicForm.lstLines.some((dicLine) => Number.isNaN(Number(dicLine.strAmount)))
    ) {
      return t("amount_invalid", "Each input line amount must be a valid number.");
    }
    const lstComponentIDs = dicForm.lstLines.map((dicLine) =>
      Number(dicLine.intSalaryComponentID)
    );
    if (new Set(lstComponentIDs).size !== lstComponentIDs.length) {
      return t(
        "component_duplicate",
        "Each salary component can be used only once in a payroll input."
      );
    }
    return "";
  }

  async function saveRecord() {
    if (!blnCanSave) {
      return;
    }

    const strValidationError = validateForm();
    if (strValidationError) {
      setStrError(strValidationError);
      setStrSuccess("");
      return;
    }

    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      if ((strMode === "edit" || strMode === "view") && intInputID) {
        await employeePayrollInputService.updateEmployeePayrollInput(
          intInputID,
          dicForm
        );
        setStrSuccess(
          t("update_success", "Payroll input updated successfully.")
        );
      } else {
        await employeePayrollInputService.createEmployeePayrollInput(dicForm);
        setStrSuccess(
          t("save_success", "Payroll input saved successfully.")
        );
        setDicForm(createInitialEmployeePayrollInputForm());
      }
      window.setTimeout(() => {
        objRouter.push(strBackRoute || "/payroll/employee-payroll-inputs");
      }, 600);
    } catch (objError) {
      setStrError(
        objError instanceof Error
          ? objError.message
          : "Unable to save payroll input."
      );
    } finally {
      setBlnSaving(false);
    }
  }

  if (blnLoading) {
    return (
      <BlockingLoader
        blnOpen
        strLabel={t(
          "loading_employee_payroll_input",
          "Loading payroll input..."
        )}
      />
    );
  }

  return (
    <Stack
      spacing={2.5}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        minHeight: "100%",
        height: "auto",
        overflowX: "hidden",
        overflowY: "visible",
        pb: 2,
        px: { xs: 0, md: 0.5 },
      }}
    >
      <Paper
        sx={{
          borderRadius: "16px",
          p: { xs: 1.5, md: 2.1 },
          border: "1px solid rgba(214, 225, 244, 0.95)",
          boxShadow: "0 12px 28px rgba(156, 176, 208, 0.14)",
          background:
            "linear-gradient(90deg, rgba(228,241,252,0.96) 0%, rgba(222,232,250,0.96) 36%, rgba(228,224,248,0.96) 72%, rgba(238,220,245,0.96) 100%)",
        }}
      >
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: { xs: "1.65rem", md: "1.9rem" }, fontWeight: 900, color: "#10275b", letterSpacing: "-0.04em" }}>
                {strMode === "view"
                  ? t("view_title", "View Payroll Input")
                  : strMode === "edit"
                  ? t("edit_title", "Edit Payroll Input")
                  : t("add_title", "Create Payroll Input")}
              </Typography>
              <Typography sx={{ color: "#31456a", mt: 0.6, fontSize: "0.95rem", maxWidth: 780 }}>
                {t("subtitle", "Capture payroll adjustments and attendance-related inputs before payroll processing.")}
              </Typography>
            </Box>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.25}
              sx={{
                alignItems: { xs: "stretch", sm: "center" },
                alignSelf: { md: "flex-start" },
              }}
            >
              <Button
                data-testid="employee-payroll-input.editor.back.button"
                className={styles.secondaryButton}
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => objRouter.push(strBackRoute || "/payroll/employee-payroll-inputs")}
                disabled={blnSaving}
                sx={{
                  minWidth: 132,
                  minHeight: 40,
                  borderRadius: "14px !important",
                  background: "rgba(255,255,255,0.92) !important",
                  color: "#20376b !important",
                  borderColor: "rgba(172,184,216,0.95) !important",
                }}
              >
                {t("back_to_list", "Back to List")}
              </Button>
              {blnCanSave ? <Button
                data-testid="employee-payroll-input.editor.save.button"
                className={styles.primaryButton}
                startIcon={<SaveRoundedIcon />}
                onClick={saveRecord}
                disabled={blnSaving || (blnFormLocked && strMode === "edit")}
                sx={{ display: blnReadOnly ? "none" : undefined }}
                style={{
                  minWidth: 112,
                  minHeight: 40,
                  borderRadius: 14,
                }}
              >
                {blnSaving ? tCommon("processing", "Processing...") : tCommon("save", "Save")}
              </Button> : null}
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {strRightsError ? <Alert severity="warning">{strRightsError}</Alert> : null}
      {!blnCanView && !blnCanSave ? <Alert severity="warning">{t("access_denied", "Payroll input access is not available for your user group.")}</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}
      {blnReadOnly ? <Alert severity="info">{t("read_only_mode", "This payroll input is open in view mode.")}</Alert> : null}

      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.18fr) minmax(420px, 0.82fr)" }, alignItems: "start" }}>
        <Paper sx={{ borderRadius: "16px", p: { xs: 1.25, md: 1.6 }, border: "1px solid rgba(198,210,236,0.82)", boxShadow: "0 10px 22px rgba(126,147,190,0.10)" }}>
          <Stack spacing={1.1}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ width: 34, height: 34, borderRadius: "10px", display: "grid", placeItems: "center", background: "linear-gradient(180deg, #f0ebff 0%, #e7e1ff 100%)", color: "#5c46ff" }}>
                <PersonOutlineRoundedIcon />
              </Box>
              <Typography sx={{ fontWeight: 900, color: "#132759", fontSize: "0.96rem" }}>
                {t("section_employee_run", "1. Employee and Run Details")}
              </Typography>
            </Box>
            <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", xl: "repeat(3, minmax(200px, 250px))" }, justifyContent: "start" }}>
              <TextField
                select
                label={`${t("employee", "Employee")} *`}
                value={dicForm.intEmployeeID}
                onChange={(objEvent) => updateField("intEmployeeID", parseSelectNumber(objEvent.target.value))}
                disabled={blnFormLocked}
                fullWidth
                sx={objFieldSx}
              >
                <MenuItem value="">{t("select_employee", "Select Employee")}</MenuItem>
                {(objOptions?.lstEmployees ?? []).map((dicEmployee) => (
                  <MenuItem key={dicEmployee.intID} value={dicEmployee.intID}>
                    {dicEmployee.strCode} - {dicEmployee.strLabel}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label={`${t("payroll_run", "Payroll Run")} *`}
                value={dicForm.intPayrollRunID}
                onChange={(objEvent) => updateField("intPayrollRunID", parseSelectNumber(objEvent.target.value))}
                disabled={blnFormLocked}
                fullWidth
                sx={objFieldSx}
              >
                <MenuItem value="">{t("select_payroll_run", "Select Payroll Run")}</MenuItem>
                {(objOptions?.lstPayrollRuns ?? []).map((dicRun) => (
                  <MenuItem key={dicRun.intID} value={dicRun.intID}>
                    {dicRun.strCode} - {dicRun.strLabel}
                  </MenuItem>
                ))}
              </TextField>
              <TextField label={t("employee_code", "Employee Code")} value={dicSelectedEmployee?.strCode ?? ""} InputProps={{ readOnly: true }} placeholder="Enter Employee Code" fullWidth sx={objReadOnlyFieldSx} />
              <TextField label={`${t("payroll_month", "Payroll Month")} *`} value={dicSelectedRun?.dtPayrollMonth ?? ""} InputProps={{ readOnly: true, endAdornment: <InputAdornment position="end"><CalendarMonthOutlinedIcon sx={{ color: "#405789" }} /></InputAdornment> }} placeholder="Select Month" fullWidth sx={objReadOnlyFieldSx} />
              <TextField label={t("run_status", "Run Status")} value={translateStatus(dicSelectedRun?.strStatus)} InputProps={{ readOnly: true }} placeholder="Select Status" fullWidth sx={objReadOnlyFieldSx} />
              <TextField label={t("run_locked", "Run Locked")} value={dicSelectedRun ? (dicSelectedRun.blnIsLocked ? t("yes", "Yes") : t("no", "No")) : ""} InputProps={{ readOnly: true }} placeholder="Select" fullWidth sx={objReadOnlyFieldSx} />
            </Box>
          </Stack>
        </Paper>

        <Paper sx={{ borderRadius: "16px", p: { xs: 1.25, md: 1.6 }, border: "1px solid rgba(198,210,236,0.82)", boxShadow: "0 10px 22px rgba(126,147,190,0.10)" }}>
          <Stack spacing={1.1}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ width: 34, height: 34, borderRadius: "10px", display: "grid", placeItems: "center", background: "linear-gradient(180deg, #e4f2ff 0%, #d8ecff 100%)", color: "#2463eb" }}>
                <CalendarMonthOutlinedIcon />
              </Box>
              <Typography sx={{ fontWeight: 900, color: "#132759", fontSize: "0.96rem" }}>
                {t("section_attendance", "2. Attendance / LWP / LOP")}
              </Typography>
            </Box>
            <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(170px, 290px))" }, justifyContent: "start" }}>
              <TextField label={t("lwp_days", "LWP (Leave Without Pay)")} value={dicForm.strLwpDays} onChange={(objEvent) => updateField("strLwpDays", objEvent.target.value)} disabled={blnFormLocked} placeholder="Enter LWP Days" helperText={t("lwp_days_help", "Leave Without Pay days to be considered for payroll calculation.")} fullWidth sx={objFieldSx} />
              <TextField label={t("lop_days", "LOP (Loss of Pay)")} value={dicForm.strLopDays} onChange={(objEvent) => updateField("strLopDays", objEvent.target.value)} disabled={blnFormLocked} placeholder="Enter LOP Days" helperText={t("lop_days_help", "Additional Loss of Pay days impacting salary calculation.")} fullWidth sx={objFieldSx} />
            </Box>
          </Stack>
        </Paper>
      </Box>

      <Paper sx={{ borderRadius: "16px", p: 0, border: "1px solid rgba(198,210,236,0.82)", boxShadow: "0 10px 22px rgba(126,147,190,0.10)", overflow: "hidden" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1.25, mb: 0.75, flexWrap: "wrap" }}>
          <Box sx={{ px: { xs: 1.5, md: 2 }, pt: { xs: 1.5, md: 2 }, pb: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 0.75 }}>
              <Box sx={{ width: 34, height: 34, borderRadius: "10px", display: "grid", placeItems: "center", background: "linear-gradient(180deg, #ddfbef 0%, #ccf8e6 100%)", color: "#08a85f" }}>
                <PaymentsOutlinedIcon />
              </Box>
              <Typography sx={{ fontWeight: 900, color: "#132759", fontSize: "0.96rem" }}>
                {t("section_lines", "3. Payroll Adjustments")}
              </Typography>
            </Box>
            <Typography sx={{ color: "#4e648d", mt: 0.1, ml: { xs: 0, sm: 7 }, fontSize: "0.83rem" }}>
              {t("line_help", "Capture additions, deductions, arrears, and recoveries at salary component level.")}
            </Typography>
          </Box>
          {blnCanSave ? <Button className={styles.secondaryButton} startIcon={<AddRoundedIcon />} onClick={addLine} disabled={blnFormLocked} sx={{ mr: { xs: 1.5, md: 2 }, mt: { xs: 0, md: 1.5 }, minHeight: 34, borderRadius: "12px !important", borderColor: "#6a56ff !important", color: "#4b31ff !important", px: 1.5, fontSize: "0.8rem !important" }}>
            {t("add_line", "Add Payroll Adjustments")}
          </Button> : null}
        </Box>

        <Box sx={{ overflowX: "auto", overflowY: "auto", px: { xs: 0, md: 0 }, pb: 0 }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{`${t("component", "Component")} *`}</th>
                <th>{`${t("line_type", "Input Category")} *`}</th>
                <th>{`${t("amount", "Input Amount (INR)")} *`}</th>
                <th>{t("remarks", "Remarks")}</th>
                <th>{t("actions", "Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {dicForm.lstLines.map((dicLine) => (
                <tr key={dicLine.intTempID}>
                  <td>
                    <TextField
                      select
                      value={dicLine.intSalaryComponentID}
                      onChange={(objEvent) => updateLine(dicLine.intTempID, "intSalaryComponentID", parseSelectNumber(objEvent.target.value))}
                      disabled={blnFormLocked}
                      fullWidth
                      sx={objFieldSx}
                    >
                      <MenuItem value="">{t("select_component", "Select Component")}</MenuItem>
                      {(objOptions?.lstSalaryComponents ?? []).map((dicComponent) => (
                        <MenuItem key={dicComponent.intID} value={dicComponent.intID}>
                          {dicComponent.strLabel}
                        </MenuItem>
                      ))}
                    </TextField>
                  </td>
                  <td>
                    <TextField select value={dicLine.strLineType} onChange={(objEvent) => updateLine(dicLine.intTempID, "strLineType", objEvent.target.value as EmployeePayrollInputFormLine["strLineType"])} disabled={blnFormLocked} fullWidth sx={objFieldSx}>
                      {lstEmployeePayrollInputLineTypes.map((dicType) => (
                        <MenuItem key={dicType.strCode} value={dicType.strCode}>
                          {t(dicType.strLabelKey, dicType.strLabel)}
                        </MenuItem>
                      ))}
                    </TextField>
                  </td>
                  <td>
                    <TextField value={dicLine.strAmount} onChange={(objEvent) => updateLine(dicLine.intTempID, "strAmount", objEvent.target.value)} disabled={blnFormLocked} placeholder="0.00" fullWidth sx={objFieldSx} />
                  </td>
                  <td>
                    <TextField value={dicLine.strRemarks} onChange={(objEvent) => updateLine(dicLine.intTempID, "strRemarks", objEvent.target.value)} disabled={blnFormLocked} placeholder={t("line_remarks", "Optional remarks")} fullWidth sx={objFieldSx} />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {blnCanSave ? <Button onClick={() => removeLine(dicLine.intTempID)} disabled={blnFormLocked} sx={{ minWidth: 34, width: 34, height: 34, borderRadius: "10px", border: "1px solid rgba(255,169,169,0.9)", background: "#fff2f2", color: "#ff2c2c", "&:hover": { background: "#ffe3e3", borderColor: "#ff8f8f" } }}>
                      <DeleteOutlineRoundedIcon />
                    </Button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>

        <Box sx={{ mt: 0, display: "flex", justifyContent: "flex-end", gap: 1.25, alignItems: "center", flexWrap: "wrap", px: { xs: 1.5, md: 2 }, py: 1.4, background: "linear-gradient(180deg, rgba(246,248,255,0.82) 0%, rgba(241,245,255,0.98) 100%)", borderTop: "1px solid rgba(220,228,245,0.92)" }}>
          <Typography sx={{ color: "#50658f", fontWeight: 700, fontSize: "0.9rem" }}>{t("total_lines", "Total Input Value:")}</Typography>
          <Typography sx={{ fontWeight: 900, color: "#3928ff", fontSize: "1.1rem" }}>{formatAmount(decTotalLines)}</Typography>
        </Box>
      </Paper>

      <Paper sx={{ borderRadius: "16px", p: { xs: 1.25, md: 1.6 }, border: "1px solid rgba(198,210,236,0.82)", boxShadow: "0 10px 22px rgba(126,147,190,0.10)" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1.5 }}>
          <Box sx={{ width: 34, height: 34, borderRadius: "10px", display: "grid", placeItems: "center", background: "linear-gradient(180deg, #efeaff 0%, #e7e1ff 100%)", color: "#5d41ff" }}>
            <TextsmsOutlinedIcon />
          </Box>
          <Typography sx={{ fontWeight: 900, color: "#132759", fontSize: "0.96rem" }}>
            {t("section_remarks_status", "4. Remarks / Status")}
          </Typography>
        </Box>
        <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", xl: "minmax(210px, 250px) minmax(280px, 1fr)" }, justifyContent: "start" }}>
          <TextField select label={`${t("status", "Status")} *`} value={dicForm.strStatus} onChange={(objEvent) => updateField("strStatus", objEvent.target.value as EmployeePayrollInputFormValues["strStatus"])} disabled={blnFormLocked} fullWidth sx={objFieldSx}>
            {lstEmployeePayrollInputStatuses.map((strStatus) => (
              <MenuItem key={strStatus} value={strStatus}>
                {translateStatus(strStatus)}
              </MenuItem>
            ))}
          </TextField>
          <TextField label={t("remarks", "Remarks")} value={dicForm.strRemarks} onChange={(objEvent) => updateField("strRemarks", objEvent.target.value)} disabled={blnFormLocked} placeholder="Enter remarks" fullWidth sx={objFieldSx} />
        </Box>

        <FormControlLabel
          sx={{
            mt: 1.5,
            alignItems: "flex-start",
            ml: 0,
            mr: 0,
            "& .MuiFormControlLabel-label": {
              color: "#243969",
              fontWeight: 800,
            },
          }}
          control={
            <Switch
              inputProps={{ "data-testid": "employee-payroll-input.editor.locked.switch" } as InputHTMLAttributes<HTMLInputElement>}
              checked={dicForm.blnIsLocked}
              onChange={(_, blnChecked) => updateField("blnIsLocked", blnChecked)}
              disabled={blnFormLocked || dicForm.strStatus === "Locked"}
              sx={{
                mr: 1.5,
                "& .MuiSwitch-switchBase.Mui-checked": {
                  color: "#ffffff",
                },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                  backgroundColor: "#5a54ff",
                  opacity: 1,
                },
                "& .MuiSwitch-track": {
                  borderRadius: 999,
                  backgroundColor: "#b8c3da",
                  opacity: 1,
                },
              }}
            />
          }
          label={
            <Box>
              <Typography component="span" sx={{ display: "block", fontWeight: 800, color: "#243969" }}>
                {t("lock_record", "Lock payroll input")}
              </Typography>
              <Typography component="span" sx={{ display: "block", color: "#5f719a", fontWeight: 500 }}>
                {t("lock_record_help", "Enable to prevent further changes.")}
              </Typography>
            </Box>
          }
        />
      </Paper>
    </Stack>
  );
}
