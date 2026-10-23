"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { Alert, Autocomplete, Box, Button, Stack, Step, StepLabel, Stepper, TextField, Tooltip } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DetailPageHeader } from "@/components/master/MasterListUi";
import BlockingLoader from "@/components/shared/BlockingLoader";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { useFNFRights } from "@/features/payroll/hooks/useFNFRights";
import { createInitialFNFSettlementForm, fnfSettlementService } from "@/features/payroll/services/fnfSettlementService";
import type { FNFEmployeeOption, FNFEmployeePrefill, FNFSettlementFormValues } from "@/features/payroll/types";

// Everything the system already holds for the employee (employee master, an earlier cancelled
// settlement, leave balances on the last working date) is filled in when the employee is picked;
// salary days come from attendance when the settlement is calculated.
const lstWizardSteps = ["Employee", "Resignation Details", "Notice Pay", "Leave Encashment", "Remarks"];
const lstExitTypes = ["resignation", "termination", "retirement", "death", "absconding", "dismissal", "retrenchment", "layoff", "contract_end", "permanent_disablement"];
// Manual entry used only when the employee has no leave plan / balances on the last working date.
const lstFallbackLeaveFields = [
  { strCode: "EL", strName: "EL", strTooltip: "Earned Leave" },
  { strCode: "PL", strName: "PL", strTooltip: "Paid Leave" },
  { strCode: "SL", strName: "SL", strTooltip: "Sick Leave" },
  { strCode: "COMPOFF", strName: "COMPOFF", strTooltip: "Compensatory off leave" },
];

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
  const [intActiveStep, setIntActiveStep] = useState(0);
  const [strError, setStrError] = useState("");
  const [lstEmployeeOptions, setLstEmployeeOptions] = useState<FNFEmployeeOption[]>([]);
  const [dicErrors, setDicErrors] = useState<Partial<Record<keyof FNFSettlementFormValues, string>>>({});
  const [blnSaving, setBlnSaving] = useState(false);
  const [blnOptionsLoading, setBlnOptionsLoading] = useState(true);
  const [objPrefill, setObjPrefill] = useState<FNFEmployeePrefill | null>(null);
  const [blnPrefillLoading, setBlnPrefillLoading] = useState(false);
  const objSelectedEmployee = useMemo(() => lstEmployeeOptions.find((objEmployee) => objEmployee.strEmployeeCode === dicForm.strEmployeeCode) || null, [lstEmployeeOptions, dicForm.strEmployeeCode]);
  const { blnLoading: blnRightsLoading, can } = useFNFRights();
  const blnHasSystemLeave = Boolean(objPrefill?.lstLeaveBalances.length);
  const decLeaveOverrideTotal = useMemo(() => (dicForm.lstLeaveEncashments || []).reduce((decTotal, dicLeave) => decTotal + Number(dicLeave.decEncashableDays || 0), 0), [dicForm.lstLeaveEncashments]);
  const decSystemLeaveTotal = useMemo(() => (objPrefill?.lstLeaveBalances || []).reduce((decTotal, dicLeave) => decTotal + dicLeave.decEncashableDays, 0), [objPrefill]);

  useEffect(() => {
    setBlnOptionsLoading(true);
    fnfSettlementService.listEmployeeOptions(true)
      .then(setLstEmployeeOptions)
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
    setDicForm((dicCurrent) => ({
      ...buildInitialWizardForm(),
      strRemarks: dicCurrent.strRemarks,
      strEmployeeCode: objEmployee?.strEmployeeCode || "",
      intEmployeeID: objEmployee?.intID || "",
      dtLastWorkingDate: objEmployee?.dtDateOfExit?.slice(0, 10) || "",
    }));
    setDicErrors({});
    if (!objEmployee) return;
    setBlnPrefillLoading(true);
    try {
      const objData = await fnfSettlementService.getEmployeePrefill(objEmployee.intID);
      setObjPrefill(objData);
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
  }

  function sourceHint(strField: string, strError?: string) {
    if (strError) return strError;
    const strSource = objPrefill?.dicSources?.[strField];
    return strSource ? `Auto-filled from: ${strSource}` : undefined;
  }

  function validateStep(intStep: number) {
    const dicNextErrors: Partial<Record<keyof FNFSettlementFormValues, string>> = {};
    if (intStep === 0 && !dicForm.strEmployeeCode.trim()) dicNextErrors.strEmployeeCode = "Employee is required.";
    if (intStep === 1) {
      if (!dicForm.strExitType.trim()) dicNextErrors.strExitType = "Exit type is required.";
      if (!dicForm.dtResignationDate) dicNextErrors.dtResignationDate = "Exit submitted date is required.";
      if (!dicForm.dtLastWorkingDate) dicNextErrors.dtLastWorkingDate = "Leaving date is required.";
      if (!dicForm.dtSettlementDate) dicNextErrors.dtSettlementDate = "Settlement date is required.";
      if (dicForm.dtResignationDate && dicForm.dtLastWorkingDate && dicForm.dtResignationDate > dicForm.dtLastWorkingDate) dicNextErrors.dtResignationDate = "Exit submitted date cannot be after the leaving date.";
    }
    if (intStep === 2) {
      if (!isNonNegativeNumber(dicForm.decNoticePeriodDays)) dicNextErrors.decNoticePeriodDays = "Enter a valid non-negative number.";
      if (!isNonNegativeNumber(dicForm.decNoticeServedDays)) dicNextErrors.decNoticeServedDays = "Enter a valid non-negative number.";
      if (!isNonNegativeNumber(dicForm.decNoticeShortfallDays)) dicNextErrors.decNoticeShortfallDays = "Enter a valid non-negative number.";
    }
    if (intStep === 3 && (dicForm.lstLeaveEncashments || []).some((dicLeave) => !isNonNegativeNumber(dicLeave.decEncashableDays))) {
      setStrError("Leave override days must be valid non-negative numbers.");
      return false;
    }
    setDicErrors(dicNextErrors);
    if (Object.keys(dicNextErrors).length) {
      setStrError("Please complete the required fields before continuing.");
      return false;
    }
    setStrError("");
    return true;
  }

  function handleNext() {
    if (!validateStep(intActiveStep)) return;
    setIntActiveStep((intCurrent) => Math.min(intCurrent + 1, lstWizardSteps.length - 1));
  }

  function handlePrevious() {
    setStrError("");
    setIntActiveStep((intCurrent) => Math.max(intCurrent - 1, 0));
  }

  function handleCancel() {
    setDicForm(buildInitialWizardForm());
    objRouter.push("/payroll/fnf-settlements");
  }

  async function handleSubmit() {
    if (!validateStep(4)) return;
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

  return (
    <Box className={styles.page}>
      <DetailPageHeader strSection="Employee Services" strListTitle="Full & Final Settlement" strListHref="/payroll/fnf-settlements" strCurrent="Add">
        <Button className={styles.secondaryButton} variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={handleCancel} controlId="payroll.fnf-settlement-create.back-top.button">Back</Button>
      </DetailPageHeader>
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      <Box className={`${styles.tableCard} ${styles.fnfCreateCard}`}>
        <Box className={styles.detailScrollCard}>
          <Stack spacing={3} className={styles.fnfCreateForm}>
            <Box className={styles.fnfStepperShell}>
              <Stepper activeStep={intActiveStep} alternativeLabel>
                {lstWizardSteps.map((strStep) => <Step key={strStep}><StepLabel>{strStep}</StepLabel></Step>)}
              </Stepper>
            </Box>

            {intActiveStep === 0 ? (
              <Box className={styles.fnfWizardSingleField}>
                {!blnOptionsLoading && !lstEmployeeOptions.length ? (
                  <Alert severity="info" sx={{ mb: 2 }}>No employees are ready for a settlement. Set the date of exit in the employee master first; employees who already have a settlement are not listed.</Alert>
                ) : (
                  <Alert severity="info" sx={{ mb: 2 }}>Only employees with a date of exit in the employee master (and no settlement yet) are listed. Their exit details, notice period and leave balances are filled in automatically.</Alert>
                )}
                <Autocomplete
                  options={lstEmployeeOptions}
                  value={objSelectedEmployee}
                  loading={blnOptionsLoading}
                  getOptionLabel={(objOption) => objOption?.strLabel || ""}
                  isOptionEqualToValue={(objOption, objValue) => objOption.strEmployeeCode === objValue.strEmployeeCode}
                  onChange={(_, objValue) => { handleEmployeeChange(objValue).catch(() => undefined); }}
                  renderInput={(params) => <TextField {...params} label="Employee" placeholder="Search employee..." required error={Boolean(dicErrors.strEmployeeCode)} helperText={dicErrors.strEmployeeCode} fullWidth controlId="payroll.fnf-settlement-create.employee-code.input"
                    InputProps={{ ...params.InputProps, startAdornment: (<><SearchRoundedIcon fontSize="small" sx={{ color: "action.active", ml: 0.5, mr: -0.5 }} />{params.InputProps.startAdornment}</>) }} />}
                />
                {objPrefill ? (
                  <Alert severity={lstMissing.length ? "warning" : "success"} sx={{ mt: 2 }}>
                    {Object.keys(objPrefill.dicSources).length ? `Filled in from existing records: ${Object.entries(objPrefill.dicSources).map(([, strSource]) => strSource).filter((strSource, intIndex, lstAll) => lstAll.indexOf(strSource) === intIndex).join("; ")}.` : "No existing exit data found for this employee."}
                    {lstMissing.length ? ` Not held anywhere in the system, please enter: ${lstMissing.join(", ")}.` : ""}
                  </Alert>
                ) : null}
              </Box>
            ) : null}

            {intActiveStep === 1 ? (
              <Box className={styles.fnfWizardGrid}>
                <Autocomplete
                  freeSolo
                  options={lstExitTypes}
                  value={dicForm.strExitType}
                  onChange={(_, objValue) => updateField("strExitType", objValue || "")}
                  onInputChange={(_, strValue) => updateField("strExitType", strValue)}
                  renderInput={(params) => <TextField {...params} label="Exit type" required error={Boolean(dicErrors.strExitType)} helperText={sourceHint("strExitType", dicErrors.strExitType)} fullWidth controlId="payroll.fnf-settlement-create.exit-type.input" />}
                />
                <TextField label="Exit submitted on" required type="date" InputLabelProps={{ shrink: true }} value={dicForm.dtResignationDate} onChange={(e) => updateField("dtResignationDate", e.target.value)} error={Boolean(dicErrors.dtResignationDate)} helperText={sourceHint("dtResignationDate", dicErrors.dtResignationDate)} fullWidth controlId="payroll.fnf-settlement-create.resignation-date.input" />
                <TextField label="Leaving Date" required type="date" InputLabelProps={{ shrink: true }} value={dicForm.dtLastWorkingDate} onChange={(e) => updateField("dtLastWorkingDate", e.target.value)} error={Boolean(dicErrors.dtLastWorkingDate)} helperText={sourceHint("dtLastWorkingDate", dicErrors.dtLastWorkingDate)} fullWidth controlId="payroll.fnf-settlement-create.last-working-date.input" />
                <TextField label="Settlement Date" required type="date" InputLabelProps={{ shrink: true }} value={dicForm.dtSettlementDate} onChange={(e) => updateField("dtSettlementDate", e.target.value)} error={Boolean(dicErrors.dtSettlementDate)} helperText={dicErrors.dtSettlementDate} fullWidth controlId="payroll.fnf-settlement-create.settlement-date.input" />
                <TextField label="Exit reason" value={dicForm.strExitReason} onChange={(e) => updateField("strExitReason", e.target.value)} helperText={sourceHint("strExitReason")} fullWidth sx={{ gridColumn: "1 / -1" }} controlId="payroll.fnf-settlement-create.exit-reason.input" />
              </Box>
            ) : null}

            {intActiveStep === 2 ? (
              <Box className={styles.fnfWizardGrid}>
                <Alert severity="info" sx={{ gridColumn: "1 / -1" }}>Served and shortfall days are worked out from the exit submitted date and the leaving date. Notice pay or recovery is then calculated from these days, the exit type and the F&amp;F rules.</Alert>
                <TextField label="Notice Period Days" type="number" value={dicForm.decNoticePeriodDays} onChange={(e) => updateField("decNoticePeriodDays", e.target.value)} error={Boolean(dicErrors.decNoticePeriodDays)} helperText={sourceHint("decNoticePeriodDays", dicErrors.decNoticePeriodDays)} fullWidth controlId="payroll.fnf-settlement-create.notice-period-days.input" />
                <TextField label="Notice Served Days" type="number" value={dicForm.decNoticeServedDays} onChange={(e) => updateField("decNoticeServedDays", e.target.value)} error={Boolean(dicErrors.decNoticeServedDays)} helperText={dicErrors.decNoticeServedDays || (dicForm.dtResignationDate && dicForm.dtLastWorkingDate ? "Auto-calculated from the dates" : undefined)} fullWidth controlId="payroll.fnf-settlement-create.notice-served-days.input" />
                <TextField label="Notice Shortfall Days" type="number" value={dicForm.decNoticeShortfallDays} onChange={(e) => updateField("decNoticeShortfallDays", e.target.value)} error={Boolean(dicErrors.decNoticeShortfallDays)} helperText={dicErrors.decNoticeShortfallDays || (dicForm.dtResignationDate && dicForm.dtLastWorkingDate ? "Notice period - served days" : undefined)} fullWidth controlId="payroll.fnf-settlement-create.notice-shortfall-days.input" />
              </Box>
            ) : null}

            {intActiveStep === 3 ? (
              <Box>
                {blnHasSystemLeave ? (
                  <>
                    <Alert severity="info" sx={{ mb: 2 }}>Balances on the leaving date are read from leave records. The encashable days follow each leave policy and are used automatically; type days in Override only to change them.</Alert>
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
                              <td><TextField size="small" type="number" placeholder="Use system" value={dicValue?.decEncashableDays || ""} onChange={(e) => updateLeaveOverride(dicLeave.strLeaveTypeCode, e.target.value)} disabled={!dicLeave.blnEncashable} controlId={`payroll.fnf-settlement-create.leave-${dicLeave.strLeaveTypeCode.toLowerCase()}.input`} /></td>
                            </tr>
                          );
                        })}
                        <tr><td><strong>Total</strong></td><td /><td><strong>{decSystemLeaveTotal}</strong></td><td>{decLeaveOverrideTotal ? <strong>{decLeaveOverrideTotal}</strong> : null}</td></tr>
                      </tbody>
                    </Box>
                  </>
                ) : (
                  <Box className={styles.fnfWizardGrid}>
                    <Alert severity="warning" sx={{ gridColumn: "1 / -1" }}>{blnPrefillLoading ? "Reading leave balances..." : `${objPrefill?.strLeaveMessage || "No leave balances were found."} Enter encashable days manually if any are due; otherwise leave them blank.`}</Alert>
                    {(dicForm.lstLeaveEncashments || []).map((dicLeave) => {
                      const dicField = lstFallbackLeaveFields.find((dicCurrent) => dicCurrent.strCode === dicLeave.strLeaveTypeCode);
                      return (
                        <Tooltip key={dicLeave.strLeaveTypeCode} title={dicField?.strTooltip || dicLeave.strLeaveTypeName} placement="top">
                          <TextField label={dicLeave.strLeaveTypeName} type="number" value={dicLeave.decEncashableDays} onChange={(e) => updateLeaveOverride(dicLeave.strLeaveTypeCode, e.target.value)} fullWidth controlId={`payroll.fnf-settlement-create.leave-${dicLeave.strLeaveTypeCode.toLowerCase()}.input`} />
                        </Tooltip>
                      );
                    })}
                  </Box>
                )}
              </Box>
            ) : null}

            {intActiveStep === 4 ? (
              <TextField label="Remarks" value={dicForm.strRemarks} onChange={(e) => updateField("strRemarks", e.target.value)} fullWidth multiline minRows={5} controlId="payroll.fnf-settlement-create.remarks.input" />
            ) : null}
          </Stack>
        </Box>
        <Box className={styles.fnfWizardActions}>
          {intActiveStep > 0 ? <Button className={styles.secondaryButton} startIcon={<ArrowBackRoundedIcon />} onClick={handlePrevious} controlId="payroll.fnf-settlement-create.previous.button">Previous</Button> : null}
          <Box sx={{ flex: 1 }} />
          <Button className={styles.secondaryButton} startIcon={<ArrowBackRoundedIcon />} onClick={handleCancel} controlId="payroll.fnf-settlement-create.back.button">Back</Button>
          {intActiveStep < lstWizardSteps.length - 1 ? <Button className={styles.primaryButton} endIcon={<ArrowForwardRoundedIcon />} onClick={handleNext} disabled={blnPrefillLoading} controlId="payroll.fnf-settlement-create.next.button">Next</Button> : null}
          {intActiveStep === lstWizardSteps.length - 1 ? <Button className={styles.primaryButton} startIcon={<SendRoundedIcon />} onClick={handleSubmit} disabled={blnSaving} controlId="payroll.fnf-settlement-create.submit.button">Submit</Button> : null}
        </Box>
      </Box>
      <BlockingLoader blnOpen={blnSaving || blnPrefillLoading} strLabel={blnSaving ? "Saving settlement..." : "Reading employee exit data..."} />
    </Box>
  );
}
