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

function SummaryRow({ strLabel, strValue }: { strLabel: string; strValue: string }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "220px 1fr" }, gap: 1, py: 0.75, borderBottom: "1px solid #f1f5f9" }}>
      <Typography sx={{ color: "#64748b", fontSize: "0.9rem" }}>{strLabel}</Typography>
      <Typography sx={{ color: "#0f172a", fontWeight: 600, fontSize: "0.9rem" }}>{strValue || "-"}</Typography>
    </Box>
  );
}

function Section({ intNumber, strTitle, strSubtitle, blnDone, children, strControlId }: { intNumber: number; strTitle: string; strSubtitle: string; blnDone?: boolean; children: ReactNode; strControlId: string }) {
  return (
    <Box component="section" data-controlid={strControlId} sx={{ border: "1px solid #e2e8f0", borderRadius: "10px", p: { xs: 2, md: 2.5 }, backgroundColor: "#fff" }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 2 }}>
        <Box sx={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 800, color: "#fff", backgroundColor: blnDone ? "#16a34a" : "#1e4e8c" }}>
          {blnDone ? <CheckCircleRoundedIcon sx={{ fontSize: 18 }} /> : intNumber}
        </Box>
        <Box>
          <Typography component="h3" sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1rem", lineHeight: 1.3 }}>{strTitle}</Typography>
          <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{strSubtitle}</Typography>
        </Box>
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

  const strTypeLabel = lstTypes.find((objType) => objType.strCode === dicForm.strSeparationType)?.strLabel || dicForm.strSeparationType;
  const objPolicy = objPreview?.dicPolicy;
  const blnDetailsDone = Boolean(dicForm.objEmployee) && !dicAllErrors.strSeparationType && !dicAllErrors.dtLastWorkingDate && !dicAllErrors.dtResignationDate && Boolean(dicForm.dtLastWorkingDate);
  const blnCanActivate = blnFormValid && Boolean(objPreview?.blnCanActivate) && !blnPreviewLoading && !blnSaving && (!objPreview?.lstWarnings.length || blnAcknowledged);

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
          <Stack spacing={2} sx={{ p: { xs: 1.5, md: 2 } }}>
            {/* 1. Employee */}
            <Section intNumber={1} strTitle="Employee" strSubtitle="Active employees without an open separation." blnDone={Boolean(dicForm.objEmployee)} strControlId="employee-separations.add.employee.section">
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(320px, 1fr) minmax(320px, 1fr)" }, gap: 2, alignItems: "start" }}>
                <Autocomplete
                  options={lstOptions}
                  value={dicForm.objEmployee}
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
                {dicForm.objEmployee ? (
                  <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, px: 2, py: 1 }} data-controlid="employee-separations.add.employee.card">
                    <SummaryRow strLabel="Department" strValue={dicForm.objEmployee.strDepartmentName || "-"} />
                    <SummaryRow strLabel="Unit" strValue={dicForm.objEmployee.strLocationName || "-"} />
                    <SummaryRow strLabel="Date of joining" strValue={formatDisplayDate(dicForm.objEmployee.dtDateOfJoining)} />
                    <SummaryRow strLabel="Notice period" strValue={dicForm.objEmployee.intNoticePeriodDays != null ? `${dicForm.objEmployee.intNoticePeriodDays} days` : "-"} />
                  </Box>
                ) : null}
              </Box>
            </Section>

            {/* 2. Separation details */}
            <Section intNumber={2} strTitle="Separation Details" strSubtitle="Type, reason and dates. The activation date is today's date, set by the server." blnDone={blnDetailsDone} strControlId="employee-separations.add.details.section">
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }, gap: 2 }}>
                <TextField select label="Separation type" required value={dicForm.strSeparationType} onChange={(e) => update("strSeparationType", e.target.value)} error={Boolean(fieldError("strSeparationType"))} helperText={fieldError("strSeparationType")} fullWidth controlId="employee-separations.add.type.select">
                  {lstTypes.map((objType) => <MenuItem key={objType.strCode} value={objType.strCode}>{objType.strLabel}</MenuItem>)}
                </TextField>
                <TextField label="Resignation / notice date" type="date" InputLabelProps={{ shrink: true }} value={dicForm.dtResignationDate} onChange={(e) => update("dtResignationDate", e.target.value)} error={Boolean(fieldError("dtResignationDate"))} helperText={fieldError("dtResignationDate")} fullWidth controlId="employee-separations.add.resignation-date.input" />
                <TextField label="Last working date" required type="date" InputLabelProps={{ shrink: true }} value={dicForm.dtLastWorkingDate} onChange={(e) => update("dtLastWorkingDate", e.target.value)} error={Boolean(fieldError("dtLastWorkingDate"))} helperText={fieldError("dtLastWorkingDate")} fullWidth controlId="employee-separations.add.lwd.input" />
                <TextField label="Activation date" type="date" InputLabelProps={{ shrink: true }} value={todayText()} InputProps={{ readOnly: true }} helperText="Set by the server on activation." fullWidth controlId="employee-separations.add.activation-date.input" />
                <TextField label="Separation reason" value={dicForm.strSeparationReason} onChange={(e) => update("strSeparationReason", e.target.value)} inputProps={{ maxLength: 300 }} fullWidth sx={{ gridColumn: { md: "span 2" } }} controlId="employee-separations.add.reason.input" />
                <TextField label="Remarks" placeholder="Optional" value={dicForm.strRemarks} onChange={(e) => update("strRemarks", e.target.value)} inputProps={{ maxLength: 1000 }} fullWidth sx={{ gridColumn: { md: "span 2" } }} controlId="employee-separations.add.remarks.input" />
              </Box>
            </Section>

            {/* 3. Payroll impact */}
            <Section intNumber={3} strTitle="Payroll Impact" strSubtitle="From which month regular payroll leaves this employee out, under the F&F rules. Updates as you fill the form." blnDone={Boolean(objPreview?.blnCanActivate)} strControlId="employee-separations.add.impact.section">
              {!blnFormValid ? (
                <Typography sx={{ color: "#64748b", fontSize: "0.9rem" }}>Select the employee and enter the last working date to see the payroll impact.</Typography>
              ) : blnPreviewLoading && !objPreview ? (
                <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={18} /><Typography sx={{ color: "#64748b" }}>Working out payroll impact...</Typography></Stack>
              ) : objPreview ? (
                <Stack spacing={2} sx={{ opacity: blnPreviewLoading ? 0.6 : 1 }}>
                  <Alert severity={objPreview.blnCanActivate ? "info" : "error"} icon={false} sx={{ fontWeight: 600 }}>{objPreview.strSummary}</Alert>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" }, gap: 2 }}>
                    <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, px: 2, py: 1 }}>
                      <SummaryRow strLabel="Policy in force" strValue={`${objPolicy?.strPolicyLabel ?? ""} (${objPolicy?.strSource === "DEFAULT" ? "built-in default" : objPolicy?.strSource === "COMPANY" ? "company rule" : "tenant rule"})`} />
                      <SummaryRow strLabel="Activation date" strValue={formatDisplayDate(objPreview.dtActivationDate)} />
                      <SummaryRow strLabel="Last working date" strValue={formatDisplayDate(objPreview.dtLastWorkingDate)} />
                      <SummaryRow strLabel="Regular payroll excluded from" strValue={objPreview.strExclusionFromMonthLabel} />
                    </Box>
                    {objPolicy?.blnAllowHrOverride ? (
                      <Stack spacing={2}>
                        <TextField select label="Override policy (optional)" value={dicForm.strOverridePolicyCode} onChange={(e) => update("strOverridePolicyCode", e.target.value)} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} fullWidth controlId="employee-separations.add.override.select">
                          <MenuItem value="">No override</MenuItem>
                          {lstPolicyOptions.map((objOption) => <MenuItem key={objOption.strCode} value={objOption.strCode}>{objOption.strLabel}</MenuItem>)}
                        </TextField>
                        <TextField label="Override reason" required={Boolean(dicForm.strOverridePolicyCode)} value={dicForm.strOverrideReason} onChange={(e) => update("strOverrideReason", e.target.value)} fullWidth controlId="employee-separations.add.override-reason.input" />
                      </Stack>
                    ) : null}
                  </Box>
                  {objPreview.lstErrors.length ? <Alert severity="error"><ul style={{ margin: 0, paddingLeft: 18 }}>{objPreview.lstErrors.map((objIssue) => <li key={objIssue.strCode}>{objIssue.strMessage}</li>)}</ul></Alert> : null}
                  {objPreview.lstWarnings.length ? <Alert severity="warning"><ul style={{ margin: 0, paddingLeft: 18 }}>{objPreview.lstWarnings.map((objIssue) => <li key={`${objIssue.strCode}-${objIssue.strMessage}`}>{objIssue.strMessage}</li>)}</ul></Alert> : null}
                </Stack>
              ) : null}
            </Section>

            {/* 4. Confirm */}
            <Section intNumber={4} strTitle="Confirm" strSubtitle="Review and activate. No F&F settlement is created; you can create it afterwards from the list." strControlId="employee-separations.add.confirm.section">
              {objPreview && blnFormValid ? (
                <Stack spacing={1.5}>
                  <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, px: 2, py: 1 }}>
                    <SummaryRow strLabel="Employee" strValue={`${objPreview.objEmployee.strEmployeeCode} - ${objPreview.objEmployee.strEmployeeName}`} />
                    <SummaryRow strLabel="Separation type" strValue={strTypeLabel} />
                    <SummaryRow strLabel="Resignation date" strValue={formatDisplayDate(dicForm.dtResignationDate)} />
                    <SummaryRow strLabel="Last working date" strValue={formatDisplayDate(objPreview.dtLastWorkingDate)} />
                    <SummaryRow strLabel="Policy applied" strValue={`${objPreview.strAppliedPolicyLabel}${objPreview.blnPolicyOverridden ? " (HR override)" : ""}`} />
                    <SummaryRow strLabel="Regular payroll excluded from" strValue={objPreview.strExclusionFromMonthLabel} />
                  </Box>
                  {objPreview.lstWarnings.length ? (
                    <FormControlLabel control={<Checkbox checked={blnAcknowledged} onChange={(e) => setBlnAcknowledged(e.target.checked)} controlId="employee-separations.add.acknowledge.checkbox" />} label="I have reviewed the payroll impact warnings above." />
                  ) : null}
                  <Typography variant="body2" sx={{ color: "#475569" }}>
                    Employment status and date of exit are not changed by this separation.
                  </Typography>
                </Stack>
              ) : (
                <Typography sx={{ color: "#64748b", fontSize: "0.9rem" }}>The summary appears here once the payroll impact is worked out.</Typography>
              )}
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
