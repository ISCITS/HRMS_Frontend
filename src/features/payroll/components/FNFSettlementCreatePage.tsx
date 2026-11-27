"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { Alert, Autocomplete, Box, Button, IconButton, InputAdornment, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import PageNotices, { type PageNoticeInput } from "@/Common/components/PageNotices";
import { DetailPageHeader } from "@/components/master/MasterListUi";
import BlockingLoader from "@/components/shared/BlockingLoader";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { useFNFRights } from "@/features/payroll/hooks/useFNFRights";
import { createInitialFNFSettlementForm, fnfSettlementService } from "@/features/payroll/services/fnfSettlementService";
import type { FNFEmployeeOption, FNFEmployeePrefill, FNFSettlementFormValues } from "@/features/payroll/types";

// Everything the system already holds for the employee (employee master, an earlier cancelled
// settlement, leave balances on the last working date) is filled in when the employee is picked;
// salary days come from attendance when the settlement is calculated. All sections are on one page.
const lstExitTypes = ["resignation", "termination", "retirement", "death", "absconding", "dismissal", "retrenchment", "layoff", "contract_end", "permanent_disablement"];
// Manual entry used only when the employee has no leave plan / balances on the last working date.
const lstFallbackLeaveFields = [
  { strCode: "EL", strName: "EL", strTooltip: "Earned Leave" },
  { strCode: "PL", strName: "PL", strTooltip: "Paid Leave" },
  { strCode: "SL", strName: "SL", strTooltip: "Sick Leave" },
  { strCode: "COMPOFF", strName: "COMPOFF", strTooltip: "Compensatory off leave" },
];

// How long the "filled in from existing records" note stays on screen after an employee is picked.
const PREFILL_NOTE_VISIBLE_MS = 2000;

// Same column grid in every section so fields line up down the page.
const dicGridSx = { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(5, 1fr)" }, gap: 1.5 };
const dicFieldsetSx = { border: 0, p: 0, m: 0, minWidth: 0, "&:disabled": { opacity: 0.55 } };

/** Numbered, bordered section; the badge turns green when filled and red when a field needs attention. */
function FormSection({ intNumber, strTitle, blnDone, blnError, objNotices, objInfo, children, strControlId }: {
  intNumber: number; strTitle: string; blnDone?: boolean; blnError?: boolean; objNotices?: ReactNode; objInfo?: ReactNode; children: ReactNode; strControlId: string;
}) {
  const strBadgeColor = blnError ? "#dc2626" : blnDone ? "#16a34a" : "#1e4e8c";
  return (
    <Box component="section" data-controlid={strControlId} sx={{ border: "1px solid #e2e8f0", borderRadius: "10px", px: { xs: 1.5, md: 2 }, py: 1.5, backgroundColor: "#fff", minWidth: 0 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25, minHeight: 28 }}>
        <Box sx={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 800, color: "#fff", backgroundColor: strBadgeColor }}>
          {blnDone && !blnError ? <CheckCircleRoundedIcon sx={{ fontSize: 16 }} /> : intNumber}
        </Box>
        <Typography component="h3" sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>{strTitle}</Typography>
        {objNotices}
        <Box sx={{ flex: 1 }} />
        {objInfo}
      </Stack>
      {children}
    </Box>
  );
}

// Validation messages and source hints live in an icon at the end of the field (message on hover)
// instead of helper text, so every field keeps the same height and the grid stays aligned.
function FieldStatusIcon({ strError, strHint }: { strError?: string; strHint?: string }) {
  if (!strError && !strHint) return null;
  return (
    <Tooltip title={strError || strHint} placement="top" arrow>
      <Box component="span" tabIndex={0} role="img" aria-label={strError || strHint} sx={{ display: "inline-flex", cursor: "help", color: strError ? "error.main" : "text.disabled", "&:hover, &:focus-visible": { color: strError ? "error.dark" : "info.main" }, outline: "none" }}>
        {strError ? <ErrorOutlineRoundedIcon fontSize="small" /> : <InfoOutlinedIcon fontSize="small" />}
      </Box>
    </Tooltip>
  );
}

function statusAdornment(strError?: string, strHint?: string): ReactNode {
  return strError || strHint ? <InputAdornment position="end"><FieldStatusIcon strError={strError} strHint={strHint} /></InputAdornment> : undefined;
}

// Keep the Autocomplete clear/popup buttons in normal flow so the status icon can sit beside them.
const dicAutocompleteSx = {
  "& .MuiAutocomplete-inputRoot": { pr: "9px !important" },
  "& .MuiAutocomplete-endAdornment": { position: "static", transform: "none", display: "flex", alignItems: "center" },
};

function buildInitialWizardForm(): FNFSettlementFormValues {
  return { ...createInitialFNFSettlementForm(), lstLeaveEncashments: [] };
}

function isNonNegativeNumber(strValue?: string) {
  return !Number.isNaN(Number(strValue || 0)) && Number(strValue || 0) >= 0;
}

function toFieldText(objValue: number | string | null | undefined) {
  return objValue === null || objValue === undefined ? "" : String(objValue);
}

/** Notice served = resignation date to last working date (inclusive); shortfall = notice period - served. */
function computeNotice(strResignationDate: string, strLastWorkingDate: string, strNoticeDays: string) {
  if (!strResignationDate || !strLastWorkingDate) return null;
  const intServed = Math.max(0, Math.round((new Date(`${strLastWorkingDate}T00:00:00`).getTime() - new Date(`${strResignationDate}T00:00:00`).getTime()) / 86400000) + 1);
  return { strServed: String(intServed), strShortfall: String(Math.max(0, Number(strNoticeDays || 0) - intServed)) };
}

export default function FNFSettlementCreatePage() {
  const objRouter = useRouter();
  const [dicForm, setDicForm] = useState<FNFSettlementFormValues>(buildInitialWizardForm());
  const [strError, setStrError] = useState("");
  const [lstEmployeeOptions, setLstEmployeeOptions] = useState<FNFEmployeeOption[]>([]);
  const [dicErrors, setDicErrors] = useState<Partial<Record<keyof FNFSettlementFormValues, string>>>({});
  const [dicLeaveErrors, setDicLeaveErrors] = useState<Record<string, string>>({});
  const [blnSaving, setBlnSaving] = useState(false);
  const [blnOptionsLoading, setBlnOptionsLoading] = useState(true);
  const [objPrefill, setObjPrefill] = useState<FNFEmployeePrefill | null>(null);
  const [blnPrefillLoading, setBlnPrefillLoading] = useState(false);
  // The "filled in from existing records" note is shown briefly after an employee is picked, then fades out.
  const [blnShowPrefillNote, setBlnShowPrefillNote] = useState(false);
  const objPrefillNoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const objSelectedEmployee = useMemo(() => lstEmployeeOptions.find((objEmployee) => objEmployee.strEmployeeCode === dicForm.strEmployeeCode) || null, [lstEmployeeOptions, dicForm.strEmployeeCode]);
  const { blnLoading: blnRightsLoading, can } = useFNFRights();
  const blnHasSystemLeave = Boolean(objPrefill?.lstLeaveBalances.length);
  const decLeaveOverrideTotal = useMemo(() => (dicForm.lstLeaveEncashments || []).reduce((decTotal, dicLeave) => decTotal + Number(dicLeave.decEncashableDays || 0), 0), [dicForm.lstLeaveEncashments]);
  const decSystemLeaveTotal = useMemo(() => (objPrefill?.lstLeaveBalances || []).reduce((decTotal, dicLeave) => decTotal + dicLeave.decEncashableDays, 0), [objPrefill]);

  function hidePrefillNote() {
    if (objPrefillNoteTimer.current) clearTimeout(objPrefillNoteTimer.current);
    objPrefillNoteTimer.current = null;
    setBlnShowPrefillNote(false);
  }

  // Stop a pending hide timer if the page is left before it fires.
  useEffect(() => () => {
    if (objPrefillNoteTimer.current) clearTimeout(objPrefillNoteTimer.current);
  }, []);

  useEffect(() => {
    setBlnOptionsLoading(true);
    // Opened from Employee Separation ("Create F&F"): ?employee_id=<id> preselects that employee when
    // they are eligible. Read from the URL directly so the page needs no Suspense boundary.
    const strPreselectID = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("employee_id") : null;
    fnfSettlementService.listEmployeeOptions(true)
      .then((lstOptions) => {
        setLstEmployeeOptions(lstOptions);
        if (!strPreselectID) return;
        const objPreselected = lstOptions.find((objOption) => String(objOption.intID) === strPreselectID);
        if (objPreselected) {
          setDicForm((dicCurrent) => ({ ...dicCurrent, strEmployeeCode: objPreselected.strEmployeeCode }));
          void handleEmployeeChange(objPreselected);
        } else {
          setStrError("This employee is not eligible for a new F&F settlement: there is no active Employee Separation, or a settlement already exists.");
        }
      })
      .catch((objError) => setStrError(objError instanceof Error ? objError.message : "Unable to load FNF wizard options."))
      .finally(() => setBlnOptionsLoading(false));
  }, []);

  function updateField<TKey extends keyof FNFSettlementFormValues>(strKey: TKey, objValue: FNFSettlementFormValues[TKey]) {
    setDicForm((dicCurrent) => {
      const dicNext = { ...dicCurrent, [strKey]: objValue };
      // Served / shortfall days follow the dates and notice period unless HR edits them afterwards.
      if (strKey === "dtResignationDate" || strKey === "dtLastWorkingDate" || strKey === "decNoticePeriodDays") {
        const dicNotice = computeNotice(dicNext.dtResignationDate, dicNext.dtLastWorkingDate, dicNext.decNoticePeriodDays);
        if (dicNotice) return { ...dicNext, decNoticeServedDays: dicNotice.strServed, decNoticeShortfallDays: dicNotice.strShortfall };
      }
      return dicNext;
    });
    setDicErrors((dicCurrent) => ({ ...dicCurrent, [strKey]: undefined }));
  }

  async function handleEmployeeChange(objEmployee: FNFEmployeeOption | null) {
    setObjPrefill(null);
    hidePrefillNote();
    setDicForm((dicCurrent) => ({
      ...buildInitialWizardForm(),
      strRemarks: dicCurrent.strRemarks,
      strEmployeeCode: objEmployee?.strEmployeeCode || "",
      intEmployeeID: objEmployee?.intID || "",
      dtLastWorkingDate: objEmployee?.dtDateOfExit?.slice(0, 10) || "",
    }));
    setDicErrors({});
    setDicLeaveErrors({});
    if (!objEmployee) return;
    setBlnPrefillLoading(true);
    try {
      const objData = await fnfSettlementService.getEmployeePrefill(objEmployee.intID);
      setObjPrefill(objData);
      setBlnShowPrefillNote(true);
      objPrefillNoteTimer.current = setTimeout(() => setBlnShowPrefillNote(false), PREFILL_NOTE_VISIBLE_MS);
      setDicForm((dicCurrent) => {
        if (dicCurrent.intEmployeeID !== objEmployee.intID) return dicCurrent;
        return {
          ...dicCurrent,
          strExitType: objData.strExitType || dicCurrent.strExitType,
          strExitReason: objData.strExitReason || dicCurrent.strExitReason,
          dtResignationDate: objData.dtResignationDate?.slice(0, 10) || dicCurrent.dtResignationDate,
          dtLastWorkingDate: objData.dtLastWorkingDate?.slice(0, 10) || dicCurrent.dtLastWorkingDate,
          dtSettlementDate: dicCurrent.dtSettlementDate || objData.dtSettlementDate?.slice(0, 10) || "",
          decNoticePeriodDays: toFieldText(objData.decNoticePeriodDays) || dicCurrent.decNoticePeriodDays,
          decNoticeServedDays: toFieldText(objData.decNoticeServedDays) || dicCurrent.decNoticeServedDays,
          decNoticeShortfallDays: toFieldText(objData.decNoticeShortfallDays) || dicCurrent.decNoticeShortfallDays,
          // Override days start empty: the system balance is used unless HR types a number.
          lstLeaveEncashments: (objData.lstLeaveBalances.length ? objData.lstLeaveBalances.map((dicLeave) => ({ strLeaveTypeCode: dicLeave.strLeaveTypeCode, strLeaveTypeName: dicLeave.strLeaveTypeName }))
            : lstFallbackLeaveFields.map((dicLeave) => ({ strLeaveTypeCode: dicLeave.strCode, strLeaveTypeName: dicLeave.strName })))
            .map((dicLeave) => ({ ...dicLeave, decBalanceDays: "", decEncashableDays: "" })),
        };
      });
    } catch (objError) {
      setStrError(objError instanceof Error ? `Could not read the employee's existing exit data: ${objError.message}` : "Could not read the employee's existing exit data.");
    } finally {
      setBlnPrefillLoading(false);
    }
  }

  function updateLeaveOverride(strLeaveTypeCode: string, strValue: string) {
    setDicForm((dicCurrent) => ({
      ...dicCurrent,
      lstLeaveEncashments: (dicCurrent.lstLeaveEncashments || []).map((dicLeave) => dicLeave.strLeaveTypeCode === strLeaveTypeCode ? { ...dicLeave, decBalanceDays: strValue, decEncashableDays: strValue } : dicLeave),
    }));
    setDicLeaveErrors((dicCurrent) => ({ ...dicCurrent, [strLeaveTypeCode]: "" }));
  }

  function sourceHint(strField: string) {
    const strSource = objPrefill?.dicSources?.[strField];
    return strSource ? `Auto-filled from: ${strSource}` : undefined;
  }

  /** End adornment for a field: red error icon when invalid, otherwise a subtle info icon with the hint. */
  function fieldStatus(strKey: keyof FNFSettlementFormValues, strHint?: string) {
    return statusAdornment(dicErrors[strKey], strHint);
  }

  /** Validates every section at once; errors show as icons on the fields (message on hover). */
  function validateForm() {
    const dicNextErrors: Partial<Record<keyof FNFSettlementFormValues, string>> = {};
    if (!dicForm.strEmployeeCode.trim()) dicNextErrors.strEmployeeCode = "Employee is required.";
    if (!dicForm.strExitType.trim()) dicNextErrors.strExitType = "Exit type is required.";
    if (!dicForm.dtResignationDate) dicNextErrors.dtResignationDate = "Exit submitted date is required.";
    if (!dicForm.dtLastWorkingDate) dicNextErrors.dtLastWorkingDate = "Leaving date is required.";
    if (!dicForm.dtSettlementDate) dicNextErrors.dtSettlementDate = "Settlement date is required.";
    if (dicForm.dtResignationDate && dicForm.dtLastWorkingDate && dicForm.dtResignationDate > dicForm.dtLastWorkingDate) dicNextErrors.dtResignationDate = "Exit submitted date cannot be after the leaving date.";
    if (!isNonNegativeNumber(dicForm.decNoticePeriodDays)) dicNextErrors.decNoticePeriodDays = "Enter a valid non-negative number.";
    if (!isNonNegativeNumber(dicForm.decNoticeServedDays)) dicNextErrors.decNoticeServedDays = "Enter a valid non-negative number.";
    if (!isNonNegativeNumber(dicForm.decNoticeShortfallDays)) dicNextErrors.decNoticeShortfallDays = "Enter a valid non-negative number.";
    const dicNextLeaveErrors: Record<string, string> = {};
    (dicForm.lstLeaveEncashments || []).forEach((dicLeave) => {
      if (!isNonNegativeNumber(dicLeave.decEncashableDays)) dicNextLeaveErrors[dicLeave.strLeaveTypeCode] = "Enter a valid non-negative number of days.";
    });
    setDicErrors(dicNextErrors);
    setDicLeaveErrors(dicNextLeaveErrors);
    if (Object.keys(dicNextErrors).length || Object.keys(dicNextLeaveErrors).length) {
      setStrError("Some fields need attention. Hover the red icons to see what to fix.");
      return false;
    }
    setStrError("");
    return true;
  }

  function handleCancel() {
    setDicForm(buildInitialWizardForm());
    objRouter.push("/payroll/fnf-settlements");
  }

  async function handleSubmit() {
    if (!validateForm()) return;
    setBlnSaving(true);
    setStrError("");
    try {
      const strWizardSummary = [
        dicForm.strRemarks.trim(),
        decLeaveOverrideTotal ? `Leave days overridden by HR: ${decLeaveOverrideTotal}` : "",
      ].filter(Boolean).join("\n");
      // Only leave rows with override days are sent; the rest are calculated from leave records.
      const objCreated = await fnfSettlementService.createSettlement({ ...dicForm, strRemarks: strWizardSummary });
      objRouter.push(`/payroll/fnf-settlements/${objCreated.strRecordUUID}`);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to create FNF settlement.");
    } finally {
      setBlnSaving(false);
    }
  }

  if (!blnRightsLoading && !can("add")) {
    return <Alert severity="error">You do not have the right to create Full &amp; Final settlements.</Alert>;
  }

  const lstMissing = objPrefill ? [
    !objPrefill.dtResignationDate ? "exit submitted (resignation) date" : "",
    !objPrefill.strExitType ? "exit type" : "",
    objPrefill.decNoticePeriodDays === null ? "notice period" : "",
  ].filter(Boolean) : [];
  const blnNoticeAutoCalculated = Boolean(dicForm.dtResignationDate && dicForm.dtLastWorkingDate);
  const blnEmployeeChosen = Boolean(dicForm.strEmployeeCode);
  const blnResignationError = Boolean(dicErrors.strExitType || dicErrors.dtResignationDate || dicErrors.dtLastWorkingDate || dicErrors.dtSettlementDate);
  const blnResignationDone = blnEmployeeChosen && !blnResignationError && Boolean(dicForm.strExitType && dicForm.dtResignationDate && dicForm.dtLastWorkingDate && dicForm.dtSettlementDate);
  const blnNoticeError = Boolean(dicErrors.decNoticePeriodDays || dicErrors.decNoticeServedDays || dicErrors.decNoticeShortfallDays);
  const blnNoticeDone = blnEmployeeChosen && !blnNoticeError && dicForm.decNoticePeriodDays !== "";
  const lstEmployeeNotices: PageNoticeInput[] = [
    objPrefill && blnShowPrefillNote
      ? {
          strKey: "prefill-note",
          strSeverity: lstMissing.length ? "warning" : "success",
          objMessage: `${Object.keys(objPrefill.dicSources).length ? `Filled in from existing records: ${Object.entries(objPrefill.dicSources).map(([, strSource]) => strSource).filter((strSource, intIndex, lstAll) => lstAll.indexOf(strSource) === intIndex).join("; ")}.` : "No existing exit data found for this employee."}${lstMissing.length ? ` Not held anywhere in the system, please enter: ${lstMissing.join(", ")}.` : ""}`,
          blnToast: false,
        }
      : null,
  ];
  const lstLeaveNotices: PageNoticeInput[] = [
    blnHasSystemLeave
      ? { strKey: "leave-system-info", strSeverity: "info", objMessage: "Balances are read from leave records. Encashable days are used automatically; type days in Override only to change them.", blnToast: false }
      : null,
    blnEmployeeChosen && objPrefill && !blnHasSystemLeave && !blnPrefillLoading
      ? { strKey: "leave-manual-warning", strSeverity: "warning", objMessage: `${objPrefill?.strLeaveMessage || "No leave balances were found."} Enter encashable days manually if any are due; otherwise leave them blank.`, blnToast: false }
      : null,
  ];

  return (
    <Box className={styles.page}>
      <DetailPageHeader
        strSection="Employee Services"
        strListTitle="Full & Final Settlement"
        strListHref="/payroll/fnf-settlements"
        strCurrent="Add"
        lstNotices={[{ strKey: "error", strSeverity: "error", objMessage: strError, fnDismiss: () => setStrError("") }]}
      >
        <Button className={styles.secondaryButton} variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={handleCancel} controlId="payroll.fnf-settlement-create.back-top.button">Back</Button>
      </DetailPageHeader>
      <Box className={`${styles.tableCard} ${styles.fnfCreateCard}`}>
        <Box className={styles.detailScrollCard}>
          <Stack spacing={1.5} sx={{ p: { xs: 1.5, md: 2 } }}>
            {/* 1. Employee */}
            <FormSection
              intNumber={1}
              strTitle="Employee"
              blnDone={Boolean(objPrefill)}
              blnError={Boolean(dicErrors.strEmployeeCode)}
              strControlId="payroll.fnf-settlement-create.employee.section"
              objNotices={<PageNotices blnSmall strControlId="payroll.fnf-settlement-create.employee.notices" lstNotices={lstEmployeeNotices} />}
              objInfo={
                <Tooltip title="Only employees with an active Employee Separation (and no settlement yet) are listed. Add the separation under Employee Services > Employee Separation first. Exit details, notice period and leave balances are filled in automatically." placement="left" arrow>
                  <IconButton size="small" color="info" aria-label="Which employees are listed" controlId="payroll.fnf-settlement-create.employee-info.button"><InfoOutlinedIcon fontSize="small" /></IconButton>
                </Tooltip>
              }
            >
              <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: 2, alignItems: { xs: "stretch", lg: "center" } }}>
                <Autocomplete
                  size="small"
                  sx={{ ...dicAutocompleteSx, width: { xs: "100%", lg: 420 }, flexShrink: 0 }}
                  noOptionsText="No employees are ready for a settlement. Add an Employee Separation first (Employee Services > Employee Separation); employees who already have a settlement are not listed."
                  options={lstEmployeeOptions}
                  value={objSelectedEmployee}
                  loading={blnOptionsLoading}
                  getOptionLabel={(objOption) => objOption?.strLabel || ""}
                  isOptionEqualToValue={(objOption, objValue) => objOption.strEmployeeCode === objValue.strEmployeeCode}
                  onChange={(_, objValue) => { handleEmployeeChange(objValue).catch(() => undefined); }}
                  renderInput={(params) => <TextField {...params} label="Employee" placeholder="Search by name or code..." required error={Boolean(dicErrors.strEmployeeCode)} fullWidth controlId="payroll.fnf-settlement-create.employee-code.input"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (<><SearchRoundedIcon fontSize="small" sx={{ color: "action.active", ml: 0.5, mr: -0.5 }} />{params.InputProps.startAdornment}</>),
                      endAdornment: (<><FieldStatusIcon strError={dicErrors.strEmployeeCode} />{params.InputProps.endAdornment}</>),
                    }} />}
                />
                <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>
                  {objPrefill
                    ? `${objPrefill.intSeparationActionID ? "Settles the active Employee Separation. " : ""}Exit details, notice period and leave balances below are filled in from existing records.`
                    : "Pick the exiting employee. Exit details, notice period and leave balances are filled in automatically."}
                </Typography>
              </Box>
            </FormSection>

            {/* 2. Resignation details */}
            <FormSection intNumber={2} strTitle="Resignation Details" blnDone={blnResignationDone} blnError={blnResignationError} strControlId="payroll.fnf-settlement-create.resignation.section">
              <Box component="fieldset" disabled={!blnEmployeeChosen} sx={dicFieldsetSx}>
              <Box sx={dicGridSx}>
                <Autocomplete
                  size="small"
                  sx={dicAutocompleteSx}
                  disabled={!blnEmployeeChosen}
                  freeSolo
                  options={lstExitTypes}
                  value={dicForm.strExitType}
                  onChange={(_, objValue) => updateField("strExitType", objValue || "")}
                  onInputChange={(_, strValue) => updateField("strExitType", strValue)}
                  renderInput={(params) => <TextField {...params} label="Exit type" required error={Boolean(dicErrors.strExitType)} fullWidth controlId="payroll.fnf-settlement-create.exit-type.input"
                    InputProps={{ ...params.InputProps, endAdornment: (<><FieldStatusIcon strError={dicErrors.strExitType} strHint={sourceHint("strExitType")} />{params.InputProps.endAdornment}</>) }} />}
                />
                <TextField size="small" label="Exit submitted on" required type="date" InputLabelProps={{ shrink: true }} InputProps={{ endAdornment: fieldStatus("dtResignationDate", sourceHint("dtResignationDate")) }} value={dicForm.dtResignationDate} onChange={(e) => updateField("dtResignationDate", e.target.value)} error={Boolean(dicErrors.dtResignationDate)} fullWidth controlId="payroll.fnf-settlement-create.resignation-date.input" />
                <TextField size="small" label="Leaving Date" required type="date" InputLabelProps={{ shrink: true }} InputProps={{ readOnly: Boolean(objPrefill?.intSeparationActionID), endAdornment: fieldStatus("dtLastWorkingDate", objPrefill?.intSeparationActionID ? "From the Employee Separation. Cancel and re-add the separation to change it." : sourceHint("dtLastWorkingDate")) }} value={dicForm.dtLastWorkingDate} onChange={(e) => updateField("dtLastWorkingDate", e.target.value)} error={Boolean(dicErrors.dtLastWorkingDate)} fullWidth controlId="payroll.fnf-settlement-create.last-working-date.input" />
                <TextField size="small" label="Settlement Date" required type="date" InputLabelProps={{ shrink: true }} InputProps={{ endAdornment: fieldStatus("dtSettlementDate") }} value={dicForm.dtSettlementDate} onChange={(e) => updateField("dtSettlementDate", e.target.value)} error={Boolean(dicErrors.dtSettlementDate)} fullWidth controlId="payroll.fnf-settlement-create.settlement-date.input" />
                <TextField size="small" label="Exit reason" value={dicForm.strExitReason} onChange={(e) => updateField("strExitReason", e.target.value)} InputProps={{ endAdornment: fieldStatus("strExitReason", sourceHint("strExitReason")) }} fullWidth controlId="payroll.fnf-settlement-create.exit-reason.input" />
              </Box>
              </Box>
            </FormSection>

            {/* 3. Notice pay and 4. Remarks side by side */}
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "3fr 2fr" }, gap: 1.5, alignItems: "stretch" }}>
            <FormSection
              intNumber={3}
              strTitle="Notice Pay"
              blnDone={blnNoticeDone}
              blnError={blnNoticeError}
              strControlId="payroll.fnf-settlement-create.notice.section"
              objInfo={
                <Tooltip title="Notice pay or recovery is calculated from these days, the exit type and the F&F rules. Served and shortfall days follow the exit submitted date and the leaving date." placement="left" arrow>
                  <IconButton size="small" color="info" aria-label="How notice pay is calculated" controlId="payroll.fnf-settlement-create.notice-info.button"><InfoOutlinedIcon fontSize="small" /></IconButton>
                </Tooltip>
              }
            >
              <Box component="fieldset" disabled={!blnEmployeeChosen} sx={dicFieldsetSx}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1.5 }}>
                <TextField size="small" label="Notice Period Days" type="number" value={dicForm.decNoticePeriodDays} onChange={(e) => updateField("decNoticePeriodDays", e.target.value)} error={Boolean(dicErrors.decNoticePeriodDays)} InputProps={{ endAdornment: fieldStatus("decNoticePeriodDays", sourceHint("decNoticePeriodDays")) }} fullWidth controlId="payroll.fnf-settlement-create.notice-period-days.input" />
                <TextField size="small" label="Notice Served Days" type="number" value={dicForm.decNoticeServedDays} onChange={(e) => updateField("decNoticeServedDays", e.target.value)} error={Boolean(dicErrors.decNoticeServedDays)} InputProps={{ endAdornment: fieldStatus("decNoticeServedDays", blnNoticeAutoCalculated ? "Auto-calculated from the exit submitted date and the leaving date" : undefined) }} fullWidth controlId="payroll.fnf-settlement-create.notice-served-days.input" />
                <TextField size="small" label="Notice Shortfall Days" type="number" value={dicForm.decNoticeShortfallDays} onChange={(e) => updateField("decNoticeShortfallDays", e.target.value)} error={Boolean(dicErrors.decNoticeShortfallDays)} InputProps={{ endAdornment: fieldStatus("decNoticeShortfallDays", blnNoticeAutoCalculated ? "Notice period days - served days" : undefined) }} fullWidth controlId="payroll.fnf-settlement-create.notice-shortfall-days.input" />
              </Box>
              </Box>
            </FormSection>

            <FormSection intNumber={4} strTitle="Remarks" blnDone={Boolean(dicForm.strRemarks.trim())} strControlId="payroll.fnf-settlement-create.remarks.section">
              <TextField size="small" label="Remarks" placeholder="Optional" value={dicForm.strRemarks} onChange={(e) => updateField("strRemarks", e.target.value)} fullWidth disabled={!blnEmployeeChosen} controlId="payroll.fnf-settlement-create.remarks.input" />
            </FormSection>
            </Box>

            {/* 5. Leave encashment */}
            <FormSection
              intNumber={5}
              strTitle="Leave Encashment"
              blnDone={blnEmployeeChosen && !blnPrefillLoading}
              blnError={Object.values(dicLeaveErrors).some(Boolean)}
              strControlId="payroll.fnf-settlement-create.leave.section"
              objNotices={<PageNotices blnSmall strControlId="payroll.fnf-settlement-create.leave.notices" lstNotices={lstLeaveNotices} />}
            >
              {!blnEmployeeChosen ? (
                <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>Select the employee to read encashable leave days on the leaving date.</Typography>
              ) : blnHasSystemLeave ? (
                  <>
                    <Box component="table" className={styles.table} sx={{ width: "100%" }}>
                      <thead><tr><th>Leave Type</th><th>Balance on Leaving Date</th><th>Encashable (system)</th><th>Override Days</th></tr></thead>
                      <tbody>
                        {objPrefill?.lstLeaveBalances.map((dicLeave) => {
                          const dicValue = (dicForm.lstLeaveEncashments || []).find((dicCurrent) => dicCurrent.strLeaveTypeCode === dicLeave.strLeaveTypeCode);
                          return (
                            <tr key={dicLeave.strLeaveTypeCode}>
                              <td>{dicLeave.strLeaveTypeName} ({dicLeave.strLeaveTypeCode})</td>
                              <td>{dicLeave.decBalanceDays}</td>
                              <td>{dicLeave.blnEncashable ? dicLeave.decEncashableDays : "Not encashable"}</td>
                              <td><TextField size="small" type="number" placeholder="Use system" value={dicValue?.decEncashableDays || ""} onChange={(e) => updateLeaveOverride(dicLeave.strLeaveTypeCode, e.target.value)} disabled={!dicLeave.blnEncashable} error={Boolean(dicLeaveErrors[dicLeave.strLeaveTypeCode])} InputProps={{ endAdornment: statusAdornment(dicLeaveErrors[dicLeave.strLeaveTypeCode]) }} controlId={`payroll.fnf-settlement-create.leave-${dicLeave.strLeaveTypeCode.toLowerCase()}.input`} /></td>
                            </tr>
                          );
                        })}
                        <tr><td><strong>Total</strong></td><td /><td><strong>{decSystemLeaveTotal}</strong></td><td>{decLeaveOverrideTotal ? <strong>{decLeaveOverrideTotal}</strong> : null}</td></tr>
                      </tbody>
                    </Box>
                  </>
                ) : (
                  <Box sx={dicGridSx}>
                    {blnPrefillLoading ? <Alert severity="warning" sx={{ gridColumn: "1 / -1" }}>Reading leave balances...</Alert> : null}
                    {(dicForm.lstLeaveEncashments || []).map((dicLeave) => {
                      const dicField = lstFallbackLeaveFields.find((dicCurrent) => dicCurrent.strCode === dicLeave.strLeaveTypeCode);
                      return (
                        <Tooltip key={dicLeave.strLeaveTypeCode} title={dicField?.strTooltip || dicLeave.strLeaveTypeName} placement="top">
                          <TextField size="small" label={dicLeave.strLeaveTypeName} type="number" value={dicLeave.decEncashableDays} onChange={(e) => updateLeaveOverride(dicLeave.strLeaveTypeCode, e.target.value)} error={Boolean(dicLeaveErrors[dicLeave.strLeaveTypeCode])} InputProps={{ endAdornment: statusAdornment(dicLeaveErrors[dicLeave.strLeaveTypeCode]) }} fullWidth controlId={`payroll.fnf-settlement-create.leave-${dicLeave.strLeaveTypeCode.toLowerCase()}.input`} />
                        </Tooltip>
                      );
                    })}
                  </Box>
                )}
            </FormSection>
          </Stack>
        </Box>
        <Box className={styles.fnfWizardActions}>
          <Box sx={{ flex: 1 }} />
          <Button className={styles.secondaryButton} startIcon={<ArrowBackRoundedIcon />} onClick={handleCancel} controlId="payroll.fnf-settlement-create.back.button">Cancel</Button>
          <Button className={styles.primaryButton} startIcon={<SendRoundedIcon />} onClick={handleSubmit} disabled={blnSaving || blnPrefillLoading || !blnEmployeeChosen} controlId="payroll.fnf-settlement-create.submit.button">Submit</Button>
        </Box>
      </Box>
      <BlockingLoader blnOpen={blnSaving || blnPrefillLoading} strLabel={blnSaving ? "Saving settlement..." : "Reading employee exit data..."} />
    </Box>
  );
}
