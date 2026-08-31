"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";

import styles from "@/features/payroll/components/PayrollScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
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
import CommonEditModeBanner from "@/Common/components/CommonEditModeBanner";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

const lstEmployeePayrollInputModuleCodes = ["EMPLOYEE_PAYROLL_INPUT", "EMPLOYEE_PAYROLL_INPUTS", "PAYROLL_INPUT", "PAYROLL_INPUTS"];
// Backend clsEmployeePayrollInputLineRequestSchema only accepts addition/deduction/arrear/
// recovery (an "earning" alias is normalized to "addition" server-side) - reimbursement is
// intentionally not offered here since the backend would reject it as a line_type; CTC
// reimbursements flow through the reimbursement-to-payroll linkage instead (strSourceType).
const lstEmployeePayrollInputLineTypes: Array<{ strCode: EmployeePayrollInputFormLine["strLineType"]; strLabelKey: string; strLabel: string }> = [
  { strCode: "addition", strLabelKey: "line_type_addition", strLabel: "Addition" },
  { strCode: "deduction", strLabelKey: "line_type_deduction", strLabel: "Deduction" },
  { strCode: "recovery", strLabelKey: "line_type_recovery", strLabel: "Recovery" },
  { strCode: "arrear", strLabelKey: "line_type_arrear", strLabel: "Arrear" },
];

type EmployeePayrollInputEditorPageProps = {
  strMode: "add" | "edit";
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

function parseOptionalDecimal(strValue: string) {
  const strTrimmedValue = strValue.trim();
  if (!strTrimmedValue) {
    return null;
  }
  const decValue = Number(strTrimmedValue);
  return Number.isFinite(decValue) ? decValue : Number.NaN;
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
    color: "#475569",
    fontWeight: 600,
    fontSize: "0.82rem",
  },
  "& .MuiInputLabel-asterisk": {
    color: "#d32f2f",
  },
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    minHeight: 40,
    "& fieldset": {
      borderColor: "#cbd5e1",
    },
    "&:hover fieldset": {
      borderColor: "#94a3b8",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#2563eb",
      boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.12)",
    },
  },
  "& .MuiInputBase-input": {
    color: "#0f172a",
    fontSize: "0.86rem",
    paddingTop: "9px",
    paddingBottom: "9px",
  },
  "& .MuiSelect-select": {
    minHeight: "unset !important",
  },
  "& .MuiFormHelperText-root": {
    color: "#64748b",
    fontSize: "0.75rem",
    lineHeight: 1.35,
    marginLeft: 2,
    marginTop: "4px",
  },
};

const objReadOnlyFieldSx = {
  ...objFieldSx,
  "& .MuiOutlinedInput-root": {
    ...objFieldSx["& .MuiOutlinedInput-root"],
    backgroundColor: "#f8fafc",
  },
};

export default function EmployeePayrollInputEditorPage({
  strMode,
  intInputID,
  strBackRoute,
}: EmployeePayrollInputEditorPageProps) {
  type FieldErrorState = Partial<Record<"intEmployeeID" | "intPayrollRunID" | "strManualLwpReason", string>>;

  const objRouter = useRouter();
  const { t, blnLoadingLabels, strLabelError } = useModuleLabels("employee-payroll-input");
  const { t: tCommon, blnLoadingLabels: blnCommonLabelsLoading, strLabelError: strCommonLabelError } = useModuleLabels("common");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstEmployeePayrollInputModuleCodes);
  const [dicForm, setDicForm] = useState<EmployeePayrollInputFormValues>(
    createInitialEmployeePayrollInputForm()
  );
  const [objOptions, setObjOptions] = useState<EmployeePayrollInputFormOptions | null>(
    null
  );
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnFormReady, setBlnFormReady] = useState(false);
  const [blnSaving, setBlnSaving] = useState(false);
  const [dicFieldErrors, setDicFieldErrors] = useState<FieldErrorState>({});
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const [blnAttendanceOverrideActive, setBlnAttendanceOverrideActive] = useState(false);
  const [blnOverrideDialogOpen, setBlnOverrideDialogOpen] = useState(false);
  const [strOverrideReason, setStrOverrideReason] = useState("");
  const [objDismissedNotices, setObjDismissedNotices] = useState<Set<string>>(new Set());
  const dismissNotice = (strKey: string) =>
    setObjDismissedNotices((setPrevious) => new Set(setPrevious).add(strKey));
  const blnCanView = canViewAny() || canDoAny("list");
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  // Opens read-only; Edit appears only when the server grants it, so no mode is in the URL.
  const [blnEditRequested, setBlnEditRequested] = useState(strMode === "add");
  const blnCanSave = blnEditRequested && (strMode === "add" ? blnCanAdd : blnCanEdit);
  const blnReadOnly = !blnEditRequested || (strMode === "edit" && blnCanView && !blnCanEdit);

  useEffect(() => {
    if (blnRightsLoading) {
      setBlnLoading(true);
      setBlnFormReady(false);
      return;
    }

    if (!blnCanView && !blnCanSave) {
      setBlnLoading(false);
      setBlnFormReady(false);
      return;
    }

    let blnMounted = true;

    async function loadPage() {
      setBlnLoading(true);
      setBlnFormReady(false);
      setStrError("");
      try {
        const [objOptionsResult, objInputResult] = await Promise.all([
          employeePayrollInputService.getFormOptions(),
          strMode === "edit" && intInputID
            ? employeePayrollInputService.getEmployeePayrollInputById(intInputID)
            : Promise.resolve(null),
        ]);
        if (!blnMounted) {
          return;
        }

        setObjOptions(objOptionsResult);
        setDicForm(
          objInputResult
            ? toEmployeePayrollInputFormValues(objInputResult)
            : createInitialEmployeePayrollInputForm()
        );
        setBlnAttendanceOverrideActive(false);
        setBlnFormReady(true);
      } catch (objError) {
        if (blnMounted) {
          setObjOptions(null);
          setBlnFormReady(false);
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

  const strSelectedRunStatus = (dicSelectedRun?.strStatus ?? "").trim().toLowerCase();
  const blnSelectedRunProcessed = strSelectedRunStatus === "processed";
  const blnSelectedRunBlocksInputChanges =
    Boolean(dicSelectedRun?.blnIsLocked) && !blnSelectedRunProcessed;
  const blnRecordLocked = dicForm.blnIsLocked || dicForm.strStatus === "Locked";
  const blnFormLocked =
    blnSaving || blnRightsLoading || !blnCanSave || blnReadOnly || blnRecordLocked || blnSelectedRunBlocksInputChanges;
  const blnLockControlDisabled =
    blnSaving || blnRightsLoading || !blnCanSave || blnReadOnly || blnSelectedRunBlocksInputChanges;
  const blnSaveDisabled =
    blnSaving ||
    !blnCanSave ||
    blnReadOnly ||
    blnSelectedRunBlocksInputChanges ||
    (strMode === "edit" && blnRecordLocked);
  const blnAttendanceSystemSourced = dicForm.strManualLwpSource === "SYSTEM_ATTENDANCE";
  const blnAttendanceFieldsLocked =
    blnFormLocked || (blnAttendanceSystemSourced && !blnAttendanceOverrideActive);
  const blnCanOverrideAttendance =
    blnAttendanceSystemSourced && !blnAttendanceOverrideActive && !blnFormLocked;

  useEffect(() => {
    if (!dicSelectedRun?.decCalendarDays || dicForm.strCalendarDays.trim()) {
      return;
    }
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      strCalendarDays: dicPrevious.strCalendarDays.trim()
        ? dicPrevious.strCalendarDays
        : String(dicSelectedRun.decCalendarDays ?? ""),
    }));
  }, [dicSelectedRun?.decCalendarDays, dicForm.strCalendarDays]);

  function updateField<TKey extends keyof EmployeePayrollInputFormValues>(
    strField: TKey,
    objValue: EmployeePayrollInputFormValues[TKey]
  ) {
    setDicForm((dicPrevious) => ({ ...dicPrevious, [strField]: objValue }));
    if (strField === "intEmployeeID" || strField === "intPayrollRunID" || strField === "strManualLwpReason") {
      setDicFieldErrors((dicPrevious) => ({ ...dicPrevious, [strField]: "" }));
    }
  }

  async function updateLocked(blnChecked: boolean) {
    if (!blnChecked && strMode === "edit" && intInputID && blnRecordLocked) {
      setBlnSaving(true);
      setStrError("");
      setStrSuccess("");
      try {
        const dicUnlockedRecord = await employeePayrollInputService.unlockEmployeePayrollInput(intInputID);
        setDicForm(toEmployeePayrollInputFormValues(dicUnlockedRecord));
        setStrSuccess(t("unlock_success", "Payroll input unlocked successfully."));
      } catch (objError) {
        setStrError(
          objError instanceof Error
            ? objError.message
            : t("unlock_error", "Unable to unlock payroll input.")
        );
      } finally {
        setBlnSaving(false);
      }
      return;
    }

    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      blnIsLocked: blnChecked,
      strStatus: blnChecked
        ? "Locked"
        : dicPrevious.strStatus === "Locked"
        ? "Draft"
        : dicPrevious.strStatus,
    }));
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

  function openOverrideDialog() {
    setStrOverrideReason("");
    setBlnOverrideDialogOpen(true);
  }

  function confirmOverride() {
    if (!strOverrideReason.trim()) {
      return;
    }
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      strManualLwpReason: dicPrevious.strManualLwpReason.trim() || strOverrideReason.trim(),
    }));
    setBlnAttendanceOverrideActive(true);
    setBlnOverrideDialogOpen(false);
  }

  function validateForm() {
    const dicNextFieldErrors: FieldErrorState = {};

    if (!dicForm.intEmployeeID) {
      dicNextFieldErrors.intEmployeeID = t("employee_required", "Employee is required.");
    }
    if (!dicForm.intPayrollRunID) {
      dicNextFieldErrors.intPayrollRunID = t("payroll_run_required", "Payroll run is required.");
    }
    if (Object.keys(dicNextFieldErrors).length > 0) {
      setDicFieldErrors(dicNextFieldErrors);
      return "";
    }
    if (blnSelectedRunBlocksInputChanges) {
      return t("payroll_run_locked_error", "Locked payroll runs cannot accept payroll input changes.");
    }
    const lstDayFields = [
      { strValue: dicForm.strCalendarDays, strLabel: t("calendar_days", "Calendar Days") },
      { strValue: dicForm.strWorkingDays, strLabel: t("working_days", "Working Days") },
      { strValue: dicForm.strPaidDays, strLabel: t("paid_days", "Paid Days") },
      { strValue: dicForm.strPayableDays, strLabel: t("payable_days", "Payable Days") },
      { strValue: dicForm.strLwpDays, strLabel: t("lwp_days_short", "LWP Days") },
      { strValue: dicForm.strLopDays, strLabel: t("lop_days_short", "LOP Days") },
    ];
    for (const dicDayField of lstDayFields) {
      const decValue = parseOptionalDecimal(dicDayField.strValue);
      if (Number.isNaN(decValue)) {
        return t("days_invalid", "{{field}} must be a valid number.").replace("{{field}}", dicDayField.strLabel);
      }
      if (decValue !== null && decValue < 0) {
        return t("days_negative", "{{field}} cannot be negative.").replace("{{field}}", dicDayField.strLabel);
      }
    }
    const decLwpDays = parseOptionalDecimal(dicForm.strLwpDays) ?? 0;
    const decLopDays = parseOptionalDecimal(dicForm.strLopDays) ?? 0;
    const decDenominator =
      parseOptionalDecimal(dicForm.strPayableDays) ??
      parseOptionalDecimal(dicForm.strWorkingDays) ??
      parseOptionalDecimal(dicForm.strCalendarDays) ??
      dicSelectedRun?.decCalendarDays ??
      null;
    if (decDenominator !== null && decDenominator <= 0 && (decLwpDays > 0 || decLopDays > 0)) {
      return t("denominator_required", "A positive payroll-period denominator is required for LWP/LOP days.");
    }
    if (decDenominator !== null && decLwpDays > decDenominator) {
      return t("lwp_exceeds_denominator", "LWP days cannot exceed the payroll-period denominator.");
    }
    if (decDenominator !== null && decLwpDays + decLopDays > decDenominator) {
      return t("payable_days_negative", "Paid/payable days cannot be negative.");
    }
    if ((decLwpDays > 0 || decLopDays > 0) && !dicForm.strManualLwpReason.trim()) {
      setDicFieldErrors({
        strManualLwpReason: t("manual_lwp_reason_required", "Manual LWP/LOP reason is required when LWP or LOP days are entered."),
      });
      return "";
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

    setDicFieldErrors({});
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
      if (strMode === "edit" && intInputID) {
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

  if (blnLoading || blnRightsLoading || blnLoadingLabels || blnCommonLabelsLoading) {
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

  if (!blnCanView && !blnCanSave) {
    return (
      <Stack spacing={2}>
        {strLabelError ? <Alert severity="warning">{strLabelError}</Alert> : null}
        {strCommonLabelError ? <Alert severity="warning">{strCommonLabelError}</Alert> : null}
        {strRightsError ? <Alert severity="warning">{strRightsError}</Alert> : null}
        <Alert severity="warning">{t("access_denied", "Payroll input access is not available for your user group.")}</Alert>
      </Stack>
    );
  }

  if (!blnFormReady || !objOptions) {
    return (
      <Stack spacing={2}>
        {strLabelError ? <Alert severity="warning">{strLabelError}</Alert> : null}
        {strCommonLabelError ? <Alert severity="warning">{strCommonLabelError}</Alert> : null}
        {strRightsError ? <Alert severity="warning">{strRightsError}</Alert> : null}
        <Alert severity="error">
          {strError || t("workspace_load_error", "Unable to load payroll input workspace.")}
        </Alert>
      </Stack>
    );
  }

  const lstAdjustmentRows = dicForm.lstLines.map((dicLine) => ({
    id: dicLine.intTempID,
    strComponent: (
      <TextField
        select
        value={dicLine.intSalaryComponentID}
        onChange={(objEvent) => updateLine(dicLine.intTempID, "intSalaryComponentID", parseSelectNumber(objEvent.target.value))}
        disabled={blnFormLocked}
        fullWidth
        size="small"
        sx={objFieldSx}
      >
        <MenuItem value="">{t("select_component", "Select Component")}</MenuItem>
        {(objOptions?.lstSalaryComponents ?? []).map((dicComponent) => (
          <MenuItem key={dicComponent.intID} value={dicComponent.intID}>
            {dicComponent.strLabel}
          </MenuItem>
        ))}
      </TextField>
    ),
    strCategory: (
      <TextField select value={dicLine.strLineType} onChange={(objEvent) => updateLine(dicLine.intTempID, "strLineType", objEvent.target.value as EmployeePayrollInputFormLine["strLineType"])} disabled={blnFormLocked} fullWidth size="small" sx={objFieldSx}>
        {lstEmployeePayrollInputLineTypes.map((dicType) => (
          <MenuItem key={dicType.strCode} value={dicType.strCode}>
            {t(dicType.strLabelKey, dicType.strLabel)}
          </MenuItem>
        ))}
      </TextField>
    ),
    strAmount: (
      <TextField value={dicLine.strAmount} onChange={(objEvent) => updateLine(dicLine.intTempID, "strAmount", objEvent.target.value)} disabled={blnFormLocked} placeholder="0.00" fullWidth size="small" sx={objFieldSx} />
    ),
    strRemarks: (
      <TextField value={dicLine.strRemarks} onChange={(objEvent) => updateLine(dicLine.intTempID, "strRemarks", objEvent.target.value)} disabled={blnFormLocked} placeholder={t("line_remarks", "Optional remarks")} fullWidth size="small" sx={objFieldSx} />
    ),
    strActions: blnCanSave ? (
      <Button onClick={() => removeLine(dicLine.intTempID)} disabled={blnFormLocked} sx={{ minWidth: 34, width: 34, height: 34, borderRadius: "10px", border: "1px solid rgba(255,169,169,0.9)", background: "#fff2f2", color: "#ff2c2c", "&:hover": { background: "#ffe3e3", borderColor: "#ff8f8f" } }}>
        <DeleteOutlineRoundedIcon />
      </Button>
    ) : null,
  }));

  const lstAdjustmentColumns: CommonTableColumn<(typeof lstAdjustmentRows)[number]>[] = [
    { field: "strComponent", headerName: `${t("component", "Component")} *`, width: 260, sortable: false },
    { field: "strCategory", headerName: `${t("line_type", "Input Category")} *`, width: 200, sortable: false },
    { field: "strAmount", headerName: `${t("amount", "Input Amount (INR)")} *`, width: 200, sortable: false },
    { field: "strRemarks", headerName: t("remarks", "Remarks"), width: 260, sortable: false },
    { field: "strActions", headerName: t("actions", "Actions"), width: 90, sortable: false, align: "center", exportable: false },
  ];

  return (
    <Stack
      spacing={1.5}
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
      {strLabelError && !objDismissedNotices.has("labelError") ? <Alert severity="warning" onClose={() => dismissNotice("labelError")}>{strLabelError}</Alert> : null}
      {strCommonLabelError && !objDismissedNotices.has("commonLabelError") ? <Alert severity="warning" onClose={() => dismissNotice("commonLabelError")}>{strCommonLabelError}</Alert> : null}
      {strRightsError && !objDismissedNotices.has("rightsError") ? <Alert severity="warning" onClose={() => dismissNotice("rightsError")}>{strRightsError}</Alert> : null}
      {!blnCanView && !blnCanSave ? <Alert severity="warning">{t("access_denied", "Payroll input access is not available for your user group.")}</Alert> : null}
      {strError ? <Alert severity="error" onClose={() => setStrError("")}>{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success" onClose={() => setStrSuccess("")}>{strSuccess}</Alert> : null}
      <CommonEditModeBanner
        blnReadOnly={blnReadOnly}
        blnCanEdit={strMode === "edit" && blnCanEdit}
        fnOnEdit={() => setBlnEditRequested(true)}
        strReadOnlyMessage={t("read_only_mode", "This payroll input is open in view mode.")}
      />
      {blnSelectedRunBlocksInputChanges && !objDismissedNotices.has("runBlocks") ? <Alert severity="warning" onClose={() => dismissNotice("runBlocks")}>{t("run_locked_input_warning", "Selected payroll run is locked, so payroll input cannot be edited.")}</Alert> : null}

      <Box
        sx={{
          background: "var(--app-surface-color)",
          border: "1px solid var(--app-card-border-color)",
          borderRadius: "var(--app-card-radius)",
          boxShadow: "var(--app-shadow-soft)",
          p: { xs: 1.5, md: 2 },
        }}
      >
      <Box sx={{ pt: 0.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", columnGap: 1, rowGap: 1.25, mb: 3 }}>
          <Typography sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 800, color: "#0f172a", fontSize: "0.96rem" }}>
            <PersonOutlineRoundedIcon sx={{ color: "#2563eb", fontSize: 20 }} />
            {t("section_employee_run", "Employee and Run Details").replace(/^\d+\.\s*/, "")}
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ alignItems: { xs: "stretch", sm: "center" } }}>
            <Button
              controlId="employee-payroll-input.editor.back.button"
              className={styles.secondaryButton}
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => objRouter.push(strBackRoute || "/payroll/employee-payroll-inputs")}
              disabled={blnSaving}
              sx={{ minWidth: 120, minHeight: 38 }}
            >
              {t("back_to_list", "Back to List")}
            </Button>
            {blnCanSave && !blnReadOnly ? (
              <Button
                controlId="employee-payroll-input.editor.locked.button"
                className={styles.secondaryButton}
                startIcon={dicForm.blnIsLocked ? <LockRoundedIcon /> : <LockOpenRoundedIcon />}
                onClick={() => updateLocked(!dicForm.blnIsLocked)}
                disabled={blnLockControlDisabled}
                sx={{ minWidth: 110, minHeight: 38 }}
              >
                {dicForm.blnIsLocked ? t("unlock_button", "Unlock") : t("lock_button", "Lock")}
              </Button>
            ) : null}
            {blnCanSave ? (
              <Button
                controlId="employee-payroll-input.editor.save.button"
                className={styles.primaryButton}
                startIcon={<SaveRoundedIcon />}
                onClick={saveRecord}
                disabled={blnSaveDisabled}
                sx={{ minWidth: 104, minHeight: 38, display: blnReadOnly ? "none" : undefined }}
              >
                {blnSaving ? tCommon("processing", "Processing...") : tCommon("save", "Save")}
              </Button>
            ) : null}
          </Stack>
        </Box>
        <Box sx={{ display: "grid", columnGap: 1.5, rowGap: 1.25, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" }, alignItems: "start" }}>
          <TextField
            select
            label={`${t("employee", "Employee")} *`}
            value={dicForm.intEmployeeID}
            onChange={(objEvent) => updateField("intEmployeeID", parseSelectNumber(objEvent.target.value))}
            disabled={blnFormLocked || strMode !== "add"}
            error={Boolean(dicFieldErrors.intEmployeeID)}
            helperText={dicFieldErrors.intEmployeeID || " "}
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
            disabled={blnFormLocked || strMode !== "add"}
            error={Boolean(dicFieldErrors.intPayrollRunID)}
            helperText={dicFieldErrors.intPayrollRunID || " "}
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
        </Box>
      </Box>

      <Box sx={{ pt: 1.5, mt: 1.5, borderTop: "1px solid #e2e8f0" }}>
        <Typography sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 800, color: "#0f172a", fontSize: "0.96rem", mb: 1.25 }}>
          <CalendarMonthOutlinedIcon sx={{ color: "#2563eb", fontSize: 20 }} />
          {t("section_attendance", "Attendance / LWP / LOP").replace(/^\d+\.\s*/, "")}
        </Typography>

        {blnAttendanceSystemSourced ? (
          <Alert
            severity="info"
            sx={{ mb: 1.25 }}
            action={
              blnCanOverrideAttendance ? (
                <Button color="inherit" size="small" onClick={openOverrideDialog} sx={{ fontWeight: 700 }}>
                  {t("override", "Override")}
                </Button>
              ) : undefined
            }
          >
            {blnAttendanceOverrideActive
              ? t(
                  "attendance_override_active",
                  "Editing values imported from Attendance & Leave Inputs. Saving will record this as a manual override."
                )
              : t(
                  "attendance_sourced_readonly",
                  "These values were imported from Attendance & Leave Inputs and are read-only. Use Override to edit them manually."
                )}
          </Alert>
        ) : null}

        <Box sx={{ display: "grid", columnGap: 1.5, rowGap: 1.25, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" }, alignItems: "start", width: "100%" }}>
          <TextField type="number" label={t("working_days", "Working Days")} value={dicForm.strWorkingDays} onChange={(objEvent) => updateField("strWorkingDays", objEvent.target.value)} disabled={blnAttendanceFieldsLocked} InputProps={{ readOnly: blnAttendanceFieldsLocked }} placeholder={t("enter_working_days", "Enter Working Days")} inputProps={{ min: 0, step: "0.5" } as InputHTMLAttributes<HTMLInputElement>} helperText={t("working_days_help", "HR-entered working days for the period.")} fullWidth sx={blnAttendanceFieldsLocked ? objReadOnlyFieldSx : objFieldSx} />
          <TextField type="number" label={t("payable_days", "Payable Days")} value={dicForm.strPayableDays} onChange={(objEvent) => updateField("strPayableDays", objEvent.target.value)} disabled={blnAttendanceFieldsLocked} InputProps={{ readOnly: blnAttendanceFieldsLocked }} placeholder={t("enter_payable_days", "Enter Payable Days")} inputProps={{ min: 0, step: "0.5" } as InputHTMLAttributes<HTMLInputElement>} helperText={t("payable_days_help", "Applicable denominator used for LWP/LOP validation when entered.")} fullWidth sx={blnAttendanceFieldsLocked ? objReadOnlyFieldSx : objFieldSx} />
          <TextField type="number" label={t("lwp_days", "LWP (Leave Without Pay)")} value={dicForm.strLwpDays} onChange={(objEvent) => updateField("strLwpDays", objEvent.target.value)} disabled={blnAttendanceFieldsLocked} InputProps={{ readOnly: blnAttendanceFieldsLocked }} placeholder={t("enter_lwp_days", "Enter LWP Days")} inputProps={{ min: 0, step: "0.5" } as InputHTMLAttributes<HTMLInputElement>} helperText={t("lwp_days_help", "Manual Leave Without Pay days for payroll processing.")} fullWidth sx={blnAttendanceFieldsLocked ? objReadOnlyFieldSx : objFieldSx} />
          <TextField type="number" label={t("lop_days", "LOP (Loss of Pay)")} value={dicForm.strLopDays} onChange={(objEvent) => updateField("strLopDays", objEvent.target.value)} disabled={blnAttendanceFieldsLocked} InputProps={{ readOnly: blnAttendanceFieldsLocked }} placeholder={t("enter_lop_days", "Enter LOP Days")} inputProps={{ min: 0, step: "0.5" } as InputHTMLAttributes<HTMLInputElement>} helperText={t("lop_days_help", "Manual Loss of Pay days for payroll processing.")} fullWidth sx={blnAttendanceFieldsLocked ? objReadOnlyFieldSx : objFieldSx} />
          <TextField label={t("manual_lwp_reason", "Manual LWP/LOP Reason")} value={dicForm.strManualLwpReason} onChange={(objEvent) => updateField("strManualLwpReason", objEvent.target.value)} disabled={blnAttendanceFieldsLocked} InputProps={{ readOnly: blnAttendanceFieldsLocked }} placeholder={t("enter_manual_lwp_reason", "Enter Manual LWP/LOP Reason")} error={Boolean(dicFieldErrors.strManualLwpReason)} helperText={dicFieldErrors.strManualLwpReason || t("manual_lwp_reason_help", "Reason is required when LWP or LOP days are entered.")} fullWidth sx={{ ...(blnAttendanceFieldsLocked ? objReadOnlyFieldSx : objFieldSx), gridColumn: "1 / -1" }} />
        </Box>
      </Box>

      <Box sx={{ pt: 1.5, mt: 1.5, borderTop: "1px solid #e2e8f0" }}>
        <Typography sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 800, color: "#0f172a", fontSize: "0.96rem", mb: 1.25 }}>
          <CalendarMonthOutlinedIcon sx={{ color: "#2563eb", fontSize: 20 }} />
          {t("technical_details", "Technical Details")}
        </Typography>
        <Box sx={{ display: "grid", columnGap: 1.5, rowGap: 1.25, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" }, alignItems: "start", width: "100%" }}>
          <TextField type="number" label={t("calendar_days", "Calendar Days")} value={dicForm.strCalendarDays} onChange={(objEvent) => updateField("strCalendarDays", objEvent.target.value)} disabled={blnAttendanceFieldsLocked} InputProps={{ readOnly: blnAttendanceFieldsLocked }} placeholder={t("enter_calendar_days", "Enter Calendar Days")} inputProps={{ min: 0, step: "0.5" } as InputHTMLAttributes<HTMLInputElement>} helperText={t("calendar_days_help", "Payroll-period calendar days.")} fullWidth sx={blnAttendanceFieldsLocked ? objReadOnlyFieldSx : objFieldSx} />
          <TextField type="number" label={t("paid_days", "Paid Days")} value={dicForm.strPaidDays} onChange={(objEvent) => updateField("strPaidDays", objEvent.target.value)} disabled={blnAttendanceFieldsLocked} InputProps={{ readOnly: blnAttendanceFieldsLocked }} placeholder={t("enter_paid_days", "Enter Paid Days")} inputProps={{ min: 0, step: "0.5" } as InputHTMLAttributes<HTMLInputElement>} helperText={t("paid_days_help", "Actual paid days entered by HR.")} fullWidth sx={blnAttendanceFieldsLocked ? objReadOnlyFieldSx : objFieldSx} />
          <TextField label={t("manual_lwp_source", "Manual Source")} value={dicForm.strManualLwpSource} InputProps={{ readOnly: true }} placeholder={t("manual_source_system", "System Captured")} fullWidth sx={objReadOnlyFieldSx} />
          <TextField label={t("manual_lwp_captured_on", "Captured On")} value={dicForm.dtManualLwpCapturedOn ?? ""} InputProps={{ readOnly: true }} placeholder={t("captured_on_placeholder", "Captured On")} fullWidth sx={objReadOnlyFieldSx} />
        </Box>
      </Box>

      <Dialog open={blnOverrideDialogOpen} onClose={() => setBlnOverrideDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, color: "#132759" }}>
          {t("override_attendance_title", "Override Attendance Values")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1.5, fontSize: "0.85rem" }}>
            {t(
              "override_attendance_help",
              "This will let you manually edit values imported from Attendance & Leave Inputs. Enter a reason for the override."
            )}
          </DialogContentText>
          <TextField
            autoFocus
            label={`${t("override_reason", "Override Reason")} *`}
            value={strOverrideReason}
            onChange={(objEvent) => setStrOverrideReason(objEvent.target.value)}
            fullWidth
            multiline
            minRows={2}
            sx={objFieldSx}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBlnOverrideDialogOpen(false)}>{t("cancel", "Cancel")}</Button>
          <Button variant="contained" onClick={confirmOverride} disabled={!strOverrideReason.trim()}>
            {t("override", "Override")}
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ pt: 1.5, mt: 1.5, borderTop: "1px solid #e2e8f0" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1.25, mb: 1, flexWrap: "wrap" }}>
          <Box>
            <Typography sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 800, color: "#0f172a", fontSize: "0.96rem" }}>
              <PaymentsOutlinedIcon sx={{ color: "#2563eb", fontSize: 20 }} />
              {t("section_lines", "Payroll Adjustments").replace(/^\d+\.\s*/, "")}
            </Typography>
            <Typography sx={{ color: "#64748b", mt: 0.35, fontSize: "0.83rem" }}>
              {t("line_help", "Capture additions, deductions, arrears, and recoveries at salary component level.")}
            </Typography>
          </Box>
          {blnCanSave ? <Button className={styles.secondaryButton} startIcon={<AddRoundedIcon />} onClick={addLine} disabled={blnFormLocked} sx={{ minHeight: 34 }}>
            {t("add_line", "Add Payroll Adjustments")}
          </Button> : null}
        </Box>

        <CommonTable
          columns={lstAdjustmentColumns}
          rows={lstAdjustmentRows}
          rowIdField="id"
          withPaper={false}
          hideToolbar
          hideRowClickHint
          minTableWidth={900}
          defaultPageSize={200}
          pageSizeOptions={[200]}
          emptyMessage={t("no_lines", "No payroll adjustments added.")}
          testIdPrefix="employee-payroll-input.adjustments"
        />

        <Box sx={{ mt: 0.5, display: "flex", justifyContent: "flex-end", gap: 1.25, alignItems: "center", flexWrap: "wrap", py: "10px", borderTop: "1px solid #e2e8f0" }}>
          <Typography sx={{ color: "#475569", fontWeight: 700, fontSize: "0.9rem" }}>{t("total_lines", "Total Input Value:")}</Typography>
          <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1.1rem" }}>{formatAmount(decTotalLines)}</Typography>
        </Box>
      </Box>
      </Box>
    </Stack>
  );
}
