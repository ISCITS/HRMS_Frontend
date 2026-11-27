"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Autocomplete, Box, Button, Checkbox, CircularProgress, FormControlLabel, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { ApiRequestError } from "@/Common/utils/apiErrorHandler";
import { DetailPageHeader } from "@/components/master/MasterListUi";
import BlockingLoader from "@/components/shared/BlockingLoader";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { useSeparationRights } from "@/features/employeeSeparation/hooks/useSeparationRights";
import { employeeSeparationService } from "@/features/employeeSeparation/services/employeeSeparationService";
import type { CodeLabel, SeparationEmployeeOption, SeparationPreview, SeparationRequest } from "@/features/employeeSeparation/types";
import { formatDisplayDate, todayText } from "@/features/employeeSeparation/utils";

const STR_ROUTE = "/employee-separations";

type FormState = {
  objEmployee: SeparationEmployeeOption | null;
  strSeparationType: string;
  strSeparationReason: string;
  dtResignationDate: string;
  dtLastWorkingDate: string;
  strRemarks: string;
  strOverridePolicyCode: string;
  strOverrideReason: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const dicInitialForm: FormState = {
  objEmployee: null, strSeparationType: "resignation", strSeparationReason: "", dtResignationDate: "", dtLastWorkingDate: "",
  strRemarks: "", strOverridePolicyCode: "", strOverrideReason: "",
};

/** Same chronology checks the server makes, so mistakes show next to the field straight away. */
function validateForm(dicForm: FormState): FieldErrors {
  const dicErrors: FieldErrors = {};
  const strToday = todayText();
  if (!dicForm.objEmployee) dicErrors.objEmployee = "Select an employee.";
  if (!dicForm.strSeparationType) dicErrors.strSeparationType = "Select the separation type.";
  if (!dicForm.dtLastWorkingDate) dicErrors.dtLastWorkingDate = "Last working date is required.";
  if (dicForm.objEmployee?.dtDateOfJoining && dicForm.dtLastWorkingDate && dicForm.dtLastWorkingDate < dicForm.objEmployee.dtDateOfJoining) dicErrors.dtLastWorkingDate = "Last working date is before the date of joining.";
  if (dicForm.dtResignationDate && dicForm.dtLastWorkingDate && dicForm.dtResignationDate > dicForm.dtLastWorkingDate) dicErrors.dtResignationDate = "Resignation date cannot be after the last working date.";
  if (dicForm.dtResignationDate && dicForm.dtResignationDate > strToday) dicErrors.dtResignationDate = "Resignation date cannot be in the future.";
  return dicErrors;
}

/** One "Label: value" item in the horizontal employee strip. */
function Fact({ strLabel, strValue }: { strLabel: string; strValue: string | null | undefined }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ color: "#64748b", fontSize: "0.72rem", lineHeight: 1.2, textTransform: "uppercase", letterSpacing: "0.02em" }}>{strLabel}</Typography>
      <Typography sx={{ color: "#0f172a", fontWeight: 700, fontSize: "0.88rem", lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={strValue || "-"}>{strValue || "-"}</Typography>
    </Box>
  );
}

function Section({ intNumber, strTitle, blnDone, children, strControlId }: { intNumber: number; strTitle: string; blnDone?: boolean; children: ReactNode; strControlId: string }) {
  return (
    <Box component="section" data-controlid={strControlId} sx={{ border: "1px solid #e2e8f0", borderRadius: "10px", px: { xs: 1.5, md: 2 }, py: 1.5, backgroundColor: "#fff" }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
        <Box sx={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 800, color: "#fff", backgroundColor: blnDone ? "#16a34a" : "#1e4e8c" }}>
          {blnDone ? <CheckCircleRoundedIcon sx={{ fontSize: 16 }} /> : intNumber}
        </Box>
        <Typography component="h3" sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>{strTitle}</Typography>
      </Stack>
      {children}
    </Box>
  );
}

export default function EmployeeSeparationAddPage() {
  const objRouter = useRouter();
  const { blnLoading: blnRightsLoading, can } = useSeparationRights();
  const [dicForm, setDicForm] = useState<FormState>(dicInitialForm);
  const [dicTouched, setDicTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [blnSubmitAttempted, setBlnSubmitAttempted] = useState(false);
  const [strError, setStrError] = useState("");
  const [lstTypes, setLstTypes] = useState<CodeLabel[]>([]);
  const [lstPolicyOptions, setLstPolicyOptions] = useState<CodeLabel[]>([]);
  const [strSearch, setStrSearch] = useState("");
  const [lstOptions, setLstOptions] = useState<SeparationEmployeeOption[]>([]);
  const [blnOptionsLoading, setBlnOptionsLoading] = useState(false);
  const [objPreview, setObjPreview] = useState<SeparationPreview | null>(null);
  const [blnPreviewLoading, setBlnPreviewLoading] = useState(false);
  const [blnAcknowledged, setBlnAcknowledged] = useState(false);
  const [blnSaving, setBlnSaving] = useState(false);
  const blnSubmitLock = useRef(false);
  const intPreviewSeq = useRef(0);
  const blnCanAdd = can("add");

  const dicAllErrors = useMemo(() => validateForm(dicForm), [dicForm]);
  const blnFormValid = Object.keys(dicAllErrors).length === 0;
  // Show a field's error once it was edited, or after Activate was pressed.
  function fieldError(strKey: keyof FormState) {
    return blnSubmitAttempted || dicTouched[strKey] ? dicAllErrors[strKey] : undefined;
  }

  useEffect(() => {
    employeeSeparationService.getLookups()
      .then((objLookups) => { setLstTypes(objLookups.lstSeparationTypes); setLstPolicyOptions(objLookups.lstPolicyOptions); })
      .catch((objError) => setStrError(objError instanceof Error ? objError.message : "Unable to load separation options."));
  }, []);

  // Server-side employee search, debounced.
  useEffect(() => {
    if (blnRightsLoading || !blnCanAdd) return;
    const intTimer = setTimeout(() => {
      setBlnOptionsLoading(true);
      employeeSeparationService.listEmployeeOptions(strSearch)
        .then(setLstOptions)
        .catch(() => setLstOptions([]))
        .finally(() => setBlnOptionsLoading(false));
    }, 300);
    return () => clearTimeout(intTimer);
  }, [strSearch, blnRightsLoading, blnCanAdd]);

  function buildRequest(blnAcknowledge: boolean): SeparationRequest {
    return {
      intEmployeeID: dicForm.objEmployee?.intID ?? 0,
      strSeparationType: dicForm.strSeparationType,
      strSeparationReason: dicForm.strSeparationReason.trim() || null,
      dtResignationDate: dicForm.dtResignationDate || null,
      dtLastWorkingDate: dicForm.dtLastWorkingDate,
      strRemarks: dicForm.strRemarks.trim() || null,
      strOverridePolicyCode: dicForm.strOverridePolicyCode || null,
      strOverrideReason: dicForm.strOverrideReason.trim() || null,
      blnAcknowledgeWarnings: blnAcknowledge,
    };
  }

  // Payroll impact refreshes by itself whenever the inputs that affect it change and are valid.
  useEffect(() => {
    setBlnAcknowledged(false);
    if (!blnFormValid) {
      setObjPreview(null);
      return;
    }
    const intSeq = ++intPreviewSeq.current;
    const intTimer = setTimeout(() => {
      setBlnPreviewLoading(true);
      employeeSeparationService.preview(buildRequest(false))
        .then((objResult) => { if (intSeq === intPreviewSeq.current) setObjPreview(objResult); })
        .catch((objError) => { if (intSeq === intPreviewSeq.current) { setObjPreview(null); setStrError(objError instanceof Error ? objError.message : "Unable to work out the payroll impact."); } })
        .finally(() => { if (intSeq === intPreviewSeq.current) setBlnPreviewLoading(false); });
    }, 450);
    return () => clearTimeout(intTimer);
  }, [blnFormValid, dicForm.objEmployee?.intID, dicForm.strSeparationType, dicForm.dtResignationDate, dicForm.dtLastWorkingDate, dicForm.strOverridePolicyCode, dicForm.strOverrideReason]);

  function update<TKey extends keyof FormState>(strKey: TKey, objValue: FormState[TKey]) {
    setDicForm((dicCurrent) => ({ ...dicCurrent, [strKey]: objValue }));
    setDicTouched((dicCurrent) => ({ ...dicCurrent, [strKey]: true }));
  }

  async function handleActivate() {
    setBlnSubmitAttempted(true);
    if (blnSubmitLock.current || !blnFormValid || !objPreview?.blnCanActivate) return;
    if (objPreview.lstWarnings.length && !blnAcknowledged) {
      setStrError("Tick the acknowledgement to confirm you have reviewed the warnings.");
      return;
    }
    blnSubmitLock.current = true; // no double submission
    setBlnSaving(true);
    setStrError("");
    try {
      const objCreated = await employeeSeparationService.activate(buildRequest(blnAcknowledged));
      objRouter.push(`${STR_ROUTE}?created=${encodeURIComponent(objCreated.strRecordUUID)}`);
    } catch (objError) {
      const objData = objError instanceof ApiRequestError ? (objError.objData as { objPreview?: SeparationPreview } | undefined) : undefined;
      if (objData?.objPreview) {
        setObjPreview(objData.objPreview); // the server re-checked; show what changed
        setBlnAcknowledged(false);
      }
      setStrError(objError instanceof Error ? objError.message : "Unable to activate the separation.");
      blnSubmitLock.current = false;
      setBlnSaving(false);
    }
  }

  const objEmployee = dicForm.objEmployee;
  const objPolicy = objPreview?.dicPolicy;
  const blnDetailsDone = Boolean(objEmployee) && !dicAllErrors.strSeparationType && !dicAllErrors.dtLastWorkingDate && !dicAllErrors.dtResignationDate && Boolean(dicForm.dtLastWorkingDate);
  const blnCanActivate = blnFormValid && Boolean(objPreview?.blnCanActivate) && !blnPreviewLoading && !blnSaving && (!objPreview?.lstWarnings.length || blnAcknowledged);

  // "<code> - <name> (<entity>, <department>, <unit>) will be excluded from Regular Payroll starting <Month YYYY> ..."
  function buildImpactMessage(objResult: SeparationPreview): string {
    const strCode = objResult.objEmployee?.strEmployeeCode || objEmployee?.strEmployeeCode || "";
    const strName = objResult.objEmployee?.strEmployeeName || objEmployee?.strEmployeeName || "";
    const lstPlace = [objEmployee?.strEntityName, objEmployee?.strDepartmentName, objEmployee?.strLocationName].filter(Boolean);
    const strWho = `${strCode} - ${strName}${lstPlace.length ? ` (${lstPlace.join(", ")})` : ""}`;
    const strPolicy = `${objResult.strAppliedPolicyLabel}${objResult.blnPolicyOverridden ? " - HR override" : ""}`;
    return `${strWho} will be excluded from Regular Payroll starting ${objResult.strExclusionFromMonthLabel} under ${strPolicy} (last working date ${formatDisplayDate(objResult.dtLastWorkingDate)}). F&F settlement may be created separately.`;
  }

  if (!blnRightsLoading && !blnCanAdd) {
    return (
      <Box className={styles.page}>
        <DetailPageHeader strSection="Employee Services" strListTitle="Employee Separation" strListHref={STR_ROUTE} strCurrent="Add Separation" />
        <Alert severity="warning">Adding separations is not available for your user group.</Alert>
      </Box>
    );
  }

  return (
    <Box className={styles.page} data-controlid="employee-separations.add.page">
      <DetailPageHeader
        strSection="Employee Services"
        strListTitle="Employee Separation"
        strListHref={STR_ROUTE}
        strCurrent="Add Separation"
        lstNotices={[{ strKey: "error", strSeverity: "error", objMessage: strError, fnDismiss: () => setStrError("") }]}
      >
        <Button className={styles.secondaryButton} variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push(STR_ROUTE)} controlId="employee-separations.add.back-top.button">Back</Button>
      </DetailPageHeader>

      <Box className={styles.tableCard}>
        <Box className={styles.detailScrollCard}>
          <Stack spacing={1.5} sx={{ p: { xs: 1.5, md: 2 } }}>
            {/* 1. Employee: search box and the selected employee's facts on one row */}
            <Section intNumber={1} strTitle="Employee" blnDone={Boolean(objEmployee)} strControlId="employee-separations.add.employee.section">
              <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: 2, alignItems: { xs: "stretch", lg: "center" } }}>
                <Autocomplete
                  sx={{ width: { xs: "100%", lg: 380 }, flexShrink: 0 }}
                  size="small"
                  options={lstOptions}
                  value={objEmployee}
                  loading={blnOptionsLoading}
                  filterOptions={(lstAll) => lstAll}
                  getOptionLabel={(objOption) => objOption?.strLabel || ""}
                  isOptionEqualToValue={(objOption, objValue) => objOption.intID === objValue.intID}
                  onInputChange={(_, strValue, strReason) => { if (strReason === "input") setStrSearch(strValue); }}
                  onChange={(_, objValue) => update("objEmployee", objValue)}
                  noOptionsText={strSearch ? "No active employee without an open separation matches." : "Type a code or name to search."}
                  renderInput={(params) => <TextField {...params} label="Employee" placeholder="Search by code or name..." required error={Boolean(fieldError("objEmployee"))} helperText={fieldError("objEmployee")} fullWidth controlId="employee-separations.add.employee.input"
                    InputProps={{ ...params.InputProps, startAdornment: (<><SearchRoundedIcon fontSize="small" sx={{ color: "action.active", ml: 0.5, mr: -0.5 }} />{params.InputProps.startAdornment}</>) }} />}
                />
                {objEmployee ? (
                  <Box
                    data-controlid="employee-separations.add.employee.card"
                    sx={{ flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))", xl: "repeat(6, minmax(0, 1fr))" }, gap: 1.5, px: 1.5, py: 0.75, border: "1px solid #e2e8f0", borderRadius: 2, backgroundColor: "#f8fafc" }}
                  >
                    <Fact strLabel="Entity" strValue={objEmployee.strEntityName} />
                    <Fact strLabel="Department" strValue={objEmployee.strDepartmentName} />
                    <Fact strLabel="Unit" strValue={objEmployee.strLocationName} />
                    <Fact strLabel="Designation" strValue={objEmployee.strDesignationName} />
                    <Fact strLabel="Date of joining" strValue={formatDisplayDate(objEmployee.dtDateOfJoining)} />
                    <Fact strLabel="Notice period" strValue={objEmployee.intNoticePeriodDays != null ? `${objEmployee.intNoticePeriodDays} days` : "-"} />
                  </Box>
                ) : (
                  <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>Active employees without an open separation.</Typography>
                )}
              </Box>
            </Section>

            {/* 2. Separation details: dates on one row, reason and remarks on the next */}
            <Section intNumber={2} strTitle="Separation Details" blnDone={blnDetailsDone} strControlId="employee-separations.add.details.section">
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 1.5 }}>
                <TextField select size="small" label="Separation type" required value={dicForm.strSeparationType} onChange={(e) => update("strSeparationType", e.target.value)} error={Boolean(fieldError("strSeparationType"))} helperText={fieldError("strSeparationType")} fullWidth controlId="employee-separations.add.type.select">
                  {lstTypes.map((objType) => <MenuItem key={objType.strCode} value={objType.strCode}>{objType.strLabel}</MenuItem>)}
                </TextField>
                <TextField size="small" label="Resignation / notice date" type="date" InputLabelProps={{ shrink: true }} value={dicForm.dtResignationDate} onChange={(e) => update("dtResignationDate", e.target.value)} error={Boolean(fieldError("dtResignationDate"))} helperText={fieldError("dtResignationDate")} fullWidth controlId="employee-separations.add.resignation-date.input" />
                <TextField size="small" label="Last working date" required type="date" InputLabelProps={{ shrink: true }} value={dicForm.dtLastWorkingDate} onChange={(e) => update("dtLastWorkingDate", e.target.value)} error={Boolean(fieldError("dtLastWorkingDate"))} helperText={fieldError("dtLastWorkingDate")} fullWidth controlId="employee-separations.add.lwd.input" />
                <TextField size="small" label="Activation date (today)" type="date" InputLabelProps={{ shrink: true }} value={todayText()} InputProps={{ readOnly: true }} fullWidth controlId="employee-separations.add.activation-date.input" />
                <TextField size="small" label="Separation reason" value={dicForm.strSeparationReason} onChange={(e) => update("strSeparationReason", e.target.value)} inputProps={{ maxLength: 300 }} fullWidth sx={{ gridColumn: { sm: "span 2" } }} controlId="employee-separations.add.reason.input" />
                <TextField size="small" label="Remarks" placeholder="Optional" value={dicForm.strRemarks} onChange={(e) => update("strRemarks", e.target.value)} inputProps={{ maxLength: 1000 }} fullWidth sx={{ gridColumn: { sm: "span 2" } }} controlId="employee-separations.add.remarks.input" />
              </Box>
            </Section>

            {/* 3. Payroll impact: one message; errors/warnings only when the server reports them */}
            <Section intNumber={3} strTitle="Payroll Impact" blnDone={Boolean(objPreview?.blnCanActivate)} strControlId="employee-separations.add.impact.section">
              {!blnFormValid ? (
                <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>Select the employee and enter the last working date to see the payroll impact.</Typography>
              ) : blnPreviewLoading && !objPreview ? (
                <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={16} /><Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>Working out payroll impact...</Typography></Stack>
              ) : objPreview ? (
                <Stack spacing={1} sx={{ opacity: blnPreviewLoading ? 0.6 : 1 }}>
                  {objPreview.lstErrors.length ? (
                    <Alert severity="error" sx={{ py: 0.25 }}><ul style={{ margin: 0, paddingLeft: 18 }}>{objPreview.lstErrors.map((objIssue) => <li key={objIssue.strCode}>{objIssue.strMessage}</li>)}</ul></Alert>
                  ) : (
                    <Alert severity="info" icon={false} sx={{ fontWeight: 600, py: 0.25 }} data-controlid="employee-separations.add.impact.message">{buildImpactMessage(objPreview)}</Alert>
                  )}
                  {objPreview.lstWarnings.length ? (
                    <Alert severity="warning" sx={{ py: 0.25 }}>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>{objPreview.lstWarnings.map((objIssue) => <li key={`${objIssue.strCode}-${objIssue.strMessage}`}>{objIssue.strMessage}</li>)}</ul>
                      <FormControlLabel sx={{ mt: 0.5 }} control={<Checkbox size="small" checked={blnAcknowledged} onChange={(e) => setBlnAcknowledged(e.target.checked)} controlId="employee-separations.add.acknowledge.checkbox" />} label="I have reviewed these warnings." />
                    </Alert>
                  ) : null}
                  {objPolicy?.blnAllowHrOverride ? (
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "260px 1fr" }, gap: 1.5 }}>
                      <TextField select size="small" label="Override policy (optional)" value={dicForm.strOverridePolicyCode} onChange={(e) => update("strOverridePolicyCode", e.target.value)} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} fullWidth controlId="employee-separations.add.override.select">
                        <MenuItem value="">No override</MenuItem>
                        {lstPolicyOptions.map((objOption) => <MenuItem key={objOption.strCode} value={objOption.strCode}>{objOption.strLabel}</MenuItem>)}
                      </TextField>
                      {dicForm.strOverridePolicyCode ? (
                        <TextField size="small" label="Override reason" required value={dicForm.strOverrideReason} onChange={(e) => update("strOverrideReason", e.target.value)} fullWidth controlId="employee-separations.add.override-reason.input" />
                      ) : null}
                    </Box>
                  ) : null}
                </Stack>
              ) : null}
            </Section>
          </Stack>
        </Box>
        <Box className={styles.fnfWizardActions}>
          <Box sx={{ flex: 1 }} />
          <Button className={styles.secondaryButton} onClick={() => objRouter.push(STR_ROUTE)} disabled={blnSaving} controlId="employee-separations.add.cancel.button">Cancel</Button>
          <Button className={styles.primaryButton} startIcon={<CheckCircleRoundedIcon />} onClick={() => void handleActivate()} disabled={!blnCanActivate} controlId="employee-separations.add.activate.button">
            Activate Separation
          </Button>
        </Box>
      </Box>
      <BlockingLoader blnOpen={blnSaving} strLabel="Activating separation..." />
    </Box>
  );
}
