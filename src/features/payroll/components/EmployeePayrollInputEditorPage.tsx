"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
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
                : "Unable to load employee payroll input workspace.";
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
              : "Unable to load employee payroll input workspace."
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
          t("update_success", "Employee payroll input updated successfully.")
        );
      } else {
        await employeePayrollInputService.createEmployeePayrollInput(dicForm);
        setStrSuccess(
          t("save_success", "Employee payroll input saved successfully.")
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
          : "Unable to save employee payroll input."
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
          "Loading employee payroll input..."
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
        pb: 3,
      }}
    >
      <Paper
        sx={{
          borderRadius: "28px",
          p: { xs: 2, md: 3 },
          border: "1px solid rgba(148,163,184,0.18)",
          background: "linear-gradient(135deg, #f8fbff 0%, #eef6ff 45%, #f8fafc 100%)",
        }}
      >
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: "1.7rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
                {strMode === "view"
                  ? t("view_title", "View Employee Payroll Input")
                  : strMode === "edit"
                  ? t("edit_title", "Edit Employee Payroll Input")
                  : t("add_title", "Create Employee Payroll Input")}
              </Typography>
              <Typography sx={{ color: "#64748b", mt: 0.75 }}>
                {t("subtitle", "Move employee payroll input maintenance out of popup mode and into a dedicated full screen.")}
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
              >
                {blnSaving ? tCommon("processing", "Processing...") : tCommon("save", "Save")}
              </Button> : null}
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {strRightsError ? <Alert severity="warning">{strRightsError}</Alert> : null}
      {!blnCanView && !blnCanSave ? <Alert severity="warning">{t("access_denied", "Employee payroll input access is not available for your user group.")}</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}
      {blnReadOnly ? <Alert severity="info">{t("read_only_mode", "This payroll input is open in view mode.")}</Alert> : null}

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>
          {t("section_employee_run", "1. Employee and Run Details")}
        </Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
          <TextField
            select
            label={t("employee", "Employee")}
            value={dicForm.intEmployeeID}
            onChange={(objEvent) => updateField("intEmployeeID", parseSelectNumber(objEvent.target.value))}
            disabled={blnFormLocked}
            fullWidth
          >
            <MenuItem value="">{t("select_employee", "Select employee")}</MenuItem>
            {(objOptions?.lstEmployees ?? []).map((dicEmployee) => (
              <MenuItem key={dicEmployee.intID} value={dicEmployee.intID}>
                {dicEmployee.strCode} - {dicEmployee.strLabel}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={t("payroll_run", "Payroll Run")}
            value={dicForm.intPayrollRunID}
            onChange={(objEvent) => updateField("intPayrollRunID", parseSelectNumber(objEvent.target.value))}
            disabled={blnFormLocked}
            fullWidth
          >
            <MenuItem value="">{t("select_payroll_run", "Select payroll run")}</MenuItem>
            {(objOptions?.lstPayrollRuns ?? []).map((dicRun) => (
              <MenuItem key={dicRun.intID} value={dicRun.intID}>
                {dicRun.strCode} - {dicRun.strLabel}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr 1fr" }, mt: 2 }}>
          <TextField label={t("employee_code", "Employee Code")} value={dicSelectedEmployee?.strCode ?? ""} InputProps={{ readOnly: true }} fullWidth />
          <TextField label={t("payroll_month", "Payroll Month")} value={dicSelectedRun?.dtPayrollMonth ?? ""} InputProps={{ readOnly: true }} fullWidth />
          <TextField label={t("run_status", "Run Status")} value={translateStatus(dicSelectedRun?.strStatus)} InputProps={{ readOnly: true }} fullWidth />
          <TextField label={t("run_locked", "Run Locked")} value={dicSelectedRun ? (dicSelectedRun.blnIsLocked ? t("yes", "Yes") : t("no", "No")) : ""} InputProps={{ readOnly: true }} fullWidth />
        </Box>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>
          {t("section_attendance", "2. Attendance / LWP / LOP")}
        </Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
          <TextField label={t("lwp_days", "LWP Days")} value={dicForm.strLwpDays} onChange={(objEvent) => updateField("strLwpDays", objEvent.target.value)} disabled={blnFormLocked} placeholder="0.00" fullWidth />
          <TextField label={t("lop_days", "LOP Days")} value={dicForm.strLopDays} onChange={(objEvent) => updateField("strLopDays", objEvent.target.value)} disabled={blnFormLocked} placeholder="0.00" fullWidth />
        </Box>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, mb: 1.5, flexWrap: "wrap" }}>
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
              {t("section_lines", "3. Input Lines")}
            </Typography>
            <Typography sx={{ color: "#64748b", mt: 0.25 }}>
              {t("line_help", "Capture additions, deductions, arrears, and recoveries at salary component level.")}
            </Typography>
          </Box>
          {blnCanSave ? <Button className={styles.secondaryButton} startIcon={<AddRoundedIcon />} onClick={addLine} disabled={blnFormLocked}>
            {t("add_line", "Add Line")}
          </Button> : null}
        </Box>

        <Box sx={{ overflowX: "auto", maxHeight: 260, overflowY: "auto" }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("component", "Component")}</th>
                <th>{t("line_type", "Line Type")}</th>
                <th>{t("amount", "Amount")}</th>
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
                    >
                      <MenuItem value="">{t("select_component", "Select component")}</MenuItem>
                      {(objOptions?.lstSalaryComponents ?? []).map((dicComponent) => (
                        <MenuItem key={dicComponent.intID} value={dicComponent.intID}>
                          {dicComponent.strCode} - {dicComponent.strLabel}
                        </MenuItem>
                      ))}
                    </TextField>
                  </td>
                  <td>
                    <TextField select value={dicLine.strLineType} onChange={(objEvent) => updateLine(dicLine.intTempID, "strLineType", objEvent.target.value as EmployeePayrollInputFormLine["strLineType"])} disabled={blnFormLocked} fullWidth>
                      {(objOptions?.lstLineTypes ?? []).map((dicType) => (
                        <MenuItem key={dicType.strCode} value={dicType.strCode}>
                          {dicType.strLabel}
                        </MenuItem>
                      ))}
                    </TextField>
                  </td>
                  <td>
                    <TextField value={dicLine.strAmount} onChange={(objEvent) => updateLine(dicLine.intTempID, "strAmount", objEvent.target.value)} disabled={blnFormLocked} placeholder="0.00" fullWidth />
                  </td>
                  <td>
                    <TextField value={dicLine.strRemarks} onChange={(objEvent) => updateLine(dicLine.intTempID, "strRemarks", objEvent.target.value)} disabled={blnFormLocked} placeholder={t("line_remarks", "Optional line remarks")} fullWidth />
                  </td>
                  <td>
                    {blnCanSave ? <Button className={styles.secondaryButton} startIcon={<DeleteOutlineRoundedIcon />} onClick={() => removeLine(dicLine.intTempID)} disabled={blnFormLocked}>
                      {t("remove", "Remove")}
                    </Button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>

        <Box sx={{ mt: 1, display: "flex", justifyContent: "flex-end", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Typography sx={{ color: "#64748b" }}>{t("total_lines", "Total Input Value")}</Typography>
          <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{formatAmount(decTotalLines)}</Typography>
        </Box>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>
          {t("section_remarks_status", "4. Remarks / Status")}
        </Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
          <TextField select label={t("status", "Status")} value={dicForm.strStatus} onChange={(objEvent) => updateField("strStatus", objEvent.target.value as EmployeePayrollInputFormValues["strStatus"])} disabled={blnFormLocked} fullWidth>
            {(objOptions?.lstStatuses ?? []).map((dicStatus) => (
              <MenuItem key={dicStatus.strCode} value={dicStatus.strCode}>
                {dicStatus.strLabel}
              </MenuItem>
            ))}
          </TextField>
          <TextField label={t("remarks", "Remarks")} value={dicForm.strRemarks} onChange={(objEvent) => updateField("strRemarks", objEvent.target.value)} disabled={blnFormLocked} multiline minRows={2} fullWidth />
        </Box>

        <FormControlLabel
          sx={{ mt: 1.25 }}
          control={
            <Switch
              inputProps={{ "data-testid": "employee-payroll-input.editor.locked.switch" } as InputHTMLAttributes<HTMLInputElement>}
              checked={dicForm.blnIsLocked}
              onChange={(_, blnChecked) => updateField("blnIsLocked", blnChecked)}
              disabled={blnFormLocked || dicForm.strStatus === "Locked"}
            />
          }
          label={t("lock_record", "Lock this payroll input")}
        />
      </Paper>
    </Stack>
  );
}
