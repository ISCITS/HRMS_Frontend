"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Autocomplete, Box, Button, Checkbox, FormControlLabel, MenuItem, Stack, Step, StepLabel, Stepper, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ApiRequestError } from "@/Common/utils/apiErrorHandler";
import { DetailPageHeader } from "@/components/master/MasterListUi";
import BlockingLoader from "@/components/shared/BlockingLoader";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { useSeparationRights } from "@/features/employeeSeparation/hooks/useSeparationRights";
import { employeeSeparationService } from "@/features/employeeSeparation/services/employeeSeparationService";
import type { CodeLabel, SeparationEmployeeOption, SeparationPreview, SeparationRequest } from "@/features/employeeSeparation/types";
import { formatDisplayDate, todayText } from "@/features/employeeSeparation/utils";

const STR_ROUTE = "/employee-separations";
const lstSteps = ["Employee", "Separation Details", "Payroll Impact", "Confirm"];
const lstStepHeaders = [
  { strTitle: "Select employee", strSubtitle: "Active employees without an open separation." },
  { strTitle: "Separation details", strSubtitle: "Type, reason and dates. The activation date is today's date, set by the server." },
  { strTitle: "Payroll impact", strSubtitle: "From which month regular payroll leaves this employee out, under the F&F rules." },
  { strTitle: "Confirm", strSubtitle: "Review and activate. No F&F settlement is created; you can create it afterwards." },
];

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

const dicInitialForm: FormState = {
  objEmployee: null, strSeparationType: "resignation", strSeparationReason: "", dtResignationDate: "", dtLastWorkingDate: "",
  strRemarks: "", strOverridePolicyCode: "", strOverrideReason: "",
};

function SummaryRow({ strLabel, strValue }: { strLabel: string; strValue: string }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "220px 1fr" }, gap: 1, py: 0.75, borderBottom: "1px solid #f1f5f9" }}>
      <Typography sx={{ color: "#64748b", fontSize: "0.9rem" }}>{strLabel}</Typography>
      <Typography sx={{ color: "#0f172a", fontWeight: 600, fontSize: "0.9rem" }}>{strValue || "-"}</Typography>
    </Box>
  );
}

export default function EmployeeSeparationAddPage() {
  const objRouter = useRouter();
  const { blnLoading: blnRightsLoading, can } = useSeparationRights();
  const [intStep, setIntStep] = useState(0);
  const [dicForm, setDicForm] = useState<FormState>(dicInitialForm);
  const [dicErrors, setDicErrors] = useState<Partial<Record<keyof FormState, string>>>({});
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
  const blnCanAdd = can("add");

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

  function update<TKey extends keyof FormState>(strKey: TKey, objValue: FormState[TKey]) {
    setDicForm((dicCurrent) => ({ ...dicCurrent, [strKey]: objValue }));
    setDicErrors((dicCurrent) => ({ ...dicCurrent, [strKey]: undefined }));
    setBlnAcknowledged(false);
    // Anything that changes the payroll impact invalidates the preview; the override fields sit on the
    // preview panel itself and re-run it instead (effect below).
    if (strKey !== "strOverridePolicyCode" && strKey !== "strOverrideReason") setObjPreview(null);
  }

  useEffect(() => {
    if (intStep !== 2 || !dicForm.objEmployee || !dicForm.dtLastWorkingDate) return;
    const intTimer = setTimeout(() => { void loadPreview(); }, 400);
    return () => clearTimeout(intTimer);
  }, [dicForm.strOverridePolicyCode, dicForm.strOverrideReason]);

  function buildRequest(): SeparationRequest {
    return {
      intEmployeeID: dicForm.objEmployee?.intID ?? 0,
      strSeparationType: dicForm.strSeparationType,
      strSeparationReason: dicForm.strSeparationReason.trim() || null,
      dtResignationDate: dicForm.dtResignationDate || null,
      dtLastWorkingDate: dicForm.dtLastWorkingDate,
      strRemarks: dicForm.strRemarks.trim() || null,
      strOverridePolicyCode: dicForm.strOverridePolicyCode || null,
      strOverrideReason: dicForm.strOverrideReason.trim() || null,
      blnAcknowledgeWarnings: blnAcknowledged,
    };
  }

  function validateStep(intCurrent: number): boolean {
    const dicNext: Partial<Record<keyof FormState, string>> = {};
    if (intCurrent === 0 && !dicForm.objEmployee) dicNext.objEmployee = "Select an employee.";
    if (intCurrent === 1) {
      const strToday = todayText();
      if (!dicForm.strSeparationType) dicNext.strSeparationType = "Select the separation type.";
      if (!dicForm.dtLastWorkingDate) dicNext.dtLastWorkingDate = "Last working date is required.";
      if (dicForm.objEmployee?.dtDateOfJoining && dicForm.dtLastWorkingDate && dicForm.dtLastWorkingDate < dicForm.objEmployee.dtDateOfJoining) dicNext.dtLastWorkingDate = "Last working date is before the date of joining.";
      if (dicForm.dtResignationDate && dicForm.dtLastWorkingDate && dicForm.dtResignationDate > dicForm.dtLastWorkingDate) dicNext.dtResignationDate = "Resignation date cannot be after the last working date.";
      if (dicForm.dtResignationDate && dicForm.dtResignationDate > strToday) dicNext.dtResignationDate = "Resignation date cannot be in the future.";
    }
    setDicErrors(dicNext);
    return Object.keys(dicNext).length === 0;
  }

  async function loadPreview() {
    setBlnPreviewLoading(true);
    setStrError("");
    try {
      setObjPreview(await employeeSeparationService.preview(buildRequest()));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to work out the payroll impact.");
    } finally {
      setBlnPreviewLoading(false);
    }
  }

  async function handleNext() {
    if (!validateStep(intStep)) return;
    if (intStep === 1 || (intStep === 2 && !objPreview)) await loadPreview();
    setIntStep((intCurrent) => Math.min(intCurrent + 1, lstSteps.length - 1));
  }

  async function handleActivate() {
    if (blnSubmitLock.current || !objPreview?.blnCanActivate) return;
    if (objPreview.lstWarnings.length && !blnAcknowledged) {
      setStrError("Tick the acknowledgement to confirm you have reviewed the warnings.");
      return;
    }
    blnSubmitLock.current = true; // no double submission
    setBlnSaving(true);
    setStrError("");
    try {
      const objCreated = await employeeSeparationService.activate(buildRequest());
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

  if (!blnRightsLoading && !blnCanAdd) {
    return (
      <Box className={styles.page}>
        <DetailPageHeader strSection="Employee Services" strListTitle="Employee Separation" strListHref={STR_ROUTE} strCurrent="Add" />
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

      <Box className={`${styles.tableCard} ${styles.fnfCreateCard}`}>
        <Box className={styles.detailScrollCard}>
          <Box className={styles.fnfWizardBody}>
            <Box className={styles.fnfStepperShell}>
              <Stepper activeStep={intStep} alternativeLabel>
                {lstSteps.map((strStep) => <Step key={strStep}><StepLabel>{strStep}</StepLabel></Step>)}
              </Stepper>
            </Box>

            <Box className={styles.fnfStepPanel}>
              <Box className={styles.fnfStepHeader}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography component="h3" className={styles.fnfStepTitle}>{lstStepHeaders[intStep].strTitle}</Typography>
                  <Typography className={styles.fnfStepSubtitle}>{lstStepHeaders[intStep].strSubtitle}</Typography>
                </Box>
              </Box>

              {intStep === 0 ? (
                <Stack spacing={2}>
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
                    renderInput={(params) => <TextField {...params} label="Employee" placeholder="Search by code or name..." required error={Boolean(dicErrors.objEmployee)} helperText={dicErrors.objEmployee} fullWidth controlId="employee-separations.add.employee.input"
                      InputProps={{ ...params.InputProps, startAdornment: (<><SearchRoundedIcon fontSize="small" sx={{ color: "action.active", ml: 0.5, mr: -0.5 }} />{params.InputProps.startAdornment}</>) }} />}
                  />
                  {dicForm.objEmployee ? (
                    <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, p: 2 }} data-controlid="employee-separations.add.employee.card">
                      <SummaryRow strLabel="Employee" strValue={`${dicForm.objEmployee.strEmployeeCode} - ${dicForm.objEmployee.strEmployeeName}`} />
                      <SummaryRow strLabel="Department" strValue={dicForm.objEmployee.strDepartmentName || "-"} />
                      <SummaryRow strLabel="Unit" strValue={dicForm.objEmployee.strLocationName || "-"} />
                      <SummaryRow strLabel="Date of joining" strValue={formatDisplayDate(dicForm.objEmployee.dtDateOfJoining)} />
                      <SummaryRow strLabel="Notice period" strValue={dicForm.objEmployee.intNoticePeriodDays != null ? `${dicForm.objEmployee.intNoticePeriodDays} days` : "-"} />
                    </Box>
                  ) : null}
                </Stack>
              ) : null}

              {intStep === 1 ? (
                <Box className={styles.fnfWizardGrid}>
                  <TextField select label="Separation type" required value={dicForm.strSeparationType} onChange={(e) => update("strSeparationType", e.target.value)} error={Boolean(dicErrors.strSeparationType)} helperText={dicErrors.strSeparationType} fullWidth controlId="employee-separations.add.type.select">
                    {lstTypes.map((objType) => <MenuItem key={objType.strCode} value={objType.strCode}>{objType.strLabel}</MenuItem>)}
                  </TextField>
                  <TextField label="Resignation / notice date" type="date" InputLabelProps={{ shrink: true }} value={dicForm.dtResignationDate} onChange={(e) => update("dtResignationDate", e.target.value)} error={Boolean(dicErrors.dtResignationDate)} helperText={dicErrors.dtResignationDate} fullWidth controlId="employee-separations.add.resignation-date.input" />
                  <TextField label="Last working date" required type="date" InputLabelProps={{ shrink: true }} value={dicForm.dtLastWorkingDate} onChange={(e) => update("dtLastWorkingDate", e.target.value)} error={Boolean(dicErrors.dtLastWorkingDate)} helperText={dicErrors.dtLastWorkingDate} fullWidth controlId="employee-separations.add.lwd.input" />
                  <TextField label="Activation date" type="date" InputLabelProps={{ shrink: true }} value={todayText()} InputProps={{ readOnly: true }} helperText="Set by the server when you confirm." fullWidth controlId="employee-separations.add.activation-date.input" />
                  <TextField label="Separation reason" value={dicForm.strSeparationReason} onChange={(e) => update("strSeparationReason", e.target.value)} inputProps={{ maxLength: 300 }} fullWidth className={styles.fnfSpanTwo} controlId="employee-separations.add.reason.input" />
                  <TextField label="Remarks" placeholder="Optional" value={dicForm.strRemarks} onChange={(e) => update("strRemarks", e.target.value)} inputProps={{ maxLength: 1000 }} fullWidth multiline minRows={3} className={styles.fnfSpanTwo} controlId="employee-separations.add.remarks.input" />
                </Box>
              ) : null}

              {intStep === 2 && objPreview ? (
                <Stack spacing={2} data-controlid="employee-separations.add.impact.panel">
                  <Alert severity={objPreview.blnCanActivate ? "info" : "error"} icon={false} sx={{ fontWeight: 600 }}>{objPreview.strSummary}</Alert>
                  <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, p: 2 }}>
                    <SummaryRow strLabel="Policy in force" strValue={`${objPolicy?.strPolicyLabel ?? ""} (${objPolicy?.strSource === "DEFAULT" ? "built-in default" : objPolicy?.strSource === "COMPANY" ? "company rule" : "tenant rule"})`} />
                    <SummaryRow strLabel="Activation date" strValue={formatDisplayDate(objPreview.dtActivationDate)} />
                    <SummaryRow strLabel="Last working date" strValue={formatDisplayDate(objPreview.dtLastWorkingDate)} />
                    <SummaryRow strLabel="Regular payroll excluded from" strValue={objPreview.strExclusionFromMonthLabel} />
                  </Box>
                  {objPolicy?.blnAllowHrOverride ? (
                    <Box className={styles.fnfWizardGrid}>
                      <TextField select label="Override policy (optional)" value={dicForm.strOverridePolicyCode} onChange={(e) => update("strOverridePolicyCode", e.target.value)} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} fullWidth controlId="employee-separations.add.override.select">
                        <MenuItem value="">No override</MenuItem>
                        {lstPolicyOptions.map((objOption) => <MenuItem key={objOption.strCode} value={objOption.strCode}>{objOption.strLabel}</MenuItem>)}
                      </TextField>
                      <TextField label="Override reason" required={Boolean(dicForm.strOverridePolicyCode)} value={dicForm.strOverrideReason} onChange={(e) => update("strOverrideReason", e.target.value)} fullWidth controlId="employee-separations.add.override-reason.input" />
                    </Box>
                  ) : null}
                  {objPreview.lstErrors.length ? <Alert severity="error"><ul style={{ margin: 0, paddingLeft: 18 }}>{objPreview.lstErrors.map((objIssue) => <li key={objIssue.strCode}>{objIssue.strMessage}</li>)}</ul></Alert> : null}
                  {objPreview.lstWarnings.length ? <Alert severity="warning"><ul style={{ margin: 0, paddingLeft: 18 }}>{objPreview.lstWarnings.map((objIssue) => <li key={`${objIssue.strCode}-${objIssue.strMessage}`}>{objIssue.strMessage}</li>)}</ul></Alert> : null}
                </Stack>
              ) : null}
              {intStep === 2 && !objPreview ? (
                <Button variant="outlined" onClick={() => void loadPreview()} disabled={blnPreviewLoading} controlId="employee-separations.add.preview.button">Work out payroll impact</Button>
              ) : null}

              {intStep === 3 && objPreview ? (
                <Stack spacing={2} data-controlid="employee-separations.add.confirm.panel">
                  <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, p: 2 }}>
                    <SummaryRow strLabel="Employee" strValue={`${objPreview.objEmployee.strEmployeeCode} - ${objPreview.objEmployee.strEmployeeName}`} />
                    <SummaryRow strLabel="Unit / Department" strValue={`${objPreview.objEmployee.strLocationName || "-"} / ${objPreview.objEmployee.strDepartmentName || "-"}`} />
                    <SummaryRow strLabel="Separation type" strValue={strTypeLabel} />
                    <SummaryRow strLabel="Reason" strValue={dicForm.strSeparationReason} />
                    <SummaryRow strLabel="Resignation date" strValue={formatDisplayDate(dicForm.dtResignationDate)} />
                    <SummaryRow strLabel="Last working date" strValue={formatDisplayDate(objPreview.dtLastWorkingDate)} />
                    <SummaryRow strLabel="Activation date" strValue={formatDisplayDate(objPreview.dtActivationDate)} />
                    <SummaryRow strLabel="Policy applied" strValue={`${objPreview.strAppliedPolicyLabel}${objPreview.blnPolicyOverridden ? " (HR override)" : ""}`} />
                    <SummaryRow strLabel="Regular payroll excluded from" strValue={objPreview.strExclusionFromMonthLabel} />
                  </Box>
                  <Alert severity={objPreview.blnCanActivate ? "info" : "error"} icon={false}>{objPreview.strSummary}</Alert>
                  {objPreview.lstErrors.length ? <Alert severity="error">{objPreview.lstErrors.map((objIssue) => objIssue.strMessage).join(" ")}</Alert> : null}
                  {objPreview.lstWarnings.length ? (
                    <Box>
                      <Alert severity="warning"><ul style={{ margin: 0, paddingLeft: 18 }}>{objPreview.lstWarnings.map((objIssue) => <li key={`${objIssue.strCode}-${objIssue.strMessage}`}>{objIssue.strMessage}</li>)}</ul></Alert>
                      <FormControlLabel control={<Checkbox checked={blnAcknowledged} onChange={(e) => setBlnAcknowledged(e.target.checked)} controlId="employee-separations.add.acknowledge.checkbox" />} label="I have reviewed these warnings." />
                    </Box>
                  ) : null}
                  <Typography variant="body2" sx={{ color: "#475569" }}>
                    Employment status and date of exit are not changed. The employee&apos;s F&amp;F settlement can be created from the list after activation.
                  </Typography>
                </Stack>
              ) : null}
            </Box>
          </Box>
        </Box>
        <Box className={styles.fnfWizardActions}>
          {intStep > 0 ? <Button className={styles.secondaryButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => setIntStep((intCurrent) => intCurrent - 1)} disabled={blnSaving} controlId="employee-separations.add.previous.button">Previous</Button> : null}
          <Box sx={{ flex: 1 }} />
          <Button className={styles.secondaryButton} onClick={() => objRouter.push(STR_ROUTE)} disabled={blnSaving} controlId="employee-separations.add.cancel.button">Cancel</Button>
          {intStep < lstSteps.length - 1 ? (
            <Button className={styles.primaryButton} endIcon={<ArrowForwardRoundedIcon />} onClick={() => void handleNext()} disabled={blnPreviewLoading || (intStep === 2 && !objPreview?.blnCanActivate)} controlId="employee-separations.add.next.button">Next</Button>
          ) : (
            <Button className={styles.primaryButton} startIcon={<CheckCircleRoundedIcon />} onClick={() => void handleActivate()} disabled={blnSaving || !objPreview?.blnCanActivate || (Boolean(objPreview?.lstWarnings.length) && !blnAcknowledged)} controlId="employee-separations.add.activate.button">
              Activate Separation
            </Button>
          )}
        </Box>
      </Box>
      <BlockingLoader blnOpen={blnSaving || (blnPreviewLoading && !objPreview)} strLabel={blnSaving ? "Activating separation..." : "Working out payroll impact..."} />
    </Box>
  );
}
