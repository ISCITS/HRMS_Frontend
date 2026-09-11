"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { Alert, Autocomplete, Box, Button, MenuItem, Stack, Step, StepLabel, Stepper, TextField, Tooltip, Typography } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BlockingLoader from "@/components/shared/BlockingLoader";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { payrollCycleService } from "@/features/payroll-cycles/services/payrollCycleService";
import type { PayrollCycleListRecord } from "@/features/payroll-cycles/types";
import { createInitialFNFSettlementForm, fnfSettlementService } from "@/features/payroll/services/fnfSettlementService";
import type { FNFEmployeeOption, FNFSettlementFormValues } from "@/features/payroll/types";

const lstWizardSteps = ["Employee", "Resignation Details", "Notice Pay", "Work Days", "Leave Encashment", "Remarks"];
const lstLeaveFields = [
  { strCode: "COMPOFF", strName: "COMPOFF", strTooltip: "Compensatory off leave" },
  { strCode: "RH", strName: "RH", strTooltip: "Restricted Holiday" },
  { strCode: "EL", strName: "EL", strTooltip: "Earned Leave" },
  { strCode: "CLIII", strName: "CLIII", strTooltip: "Custom/company-specific leave type" },
  { strCode: "SL", strName: "SL", strTooltip: "Sick Leave" },
  { strCode: "PL", strName: "PL", strTooltip: "Paid Leave" },
];

function buildInitialWizardForm(): FNFSettlementFormValues {
  const dicForm = createInitialFNFSettlementForm();
  return {
    ...dicForm,
    decWorkDays: "0",
    decDaysWorked: "0",
    strPayrollCycleCode: "",
    lstLeaveEncashments: lstLeaveFields.map((dicLeave) => ({
      strLeaveTypeCode: dicLeave.strCode,
      strLeaveTypeName: dicLeave.strName,
      decBalanceDays: "0",
      decEncashableDays: "0",
    })),
  };
}

function isNonNegativeNumber(strValue?: string) {
  return !Number.isNaN(Number(strValue || 0)) && Number(strValue || 0) >= 0;
}

export default function FNFSettlementCreatePage() {
  const objRouter = useRouter();
  const [dicForm, setDicForm] = useState<FNFSettlementFormValues>(buildInitialWizardForm());
  const [intActiveStep, setIntActiveStep] = useState(0);
  const [strError, setStrError] = useState("");
  const [lstEmployeeOptions, setLstEmployeeOptions] = useState<FNFEmployeeOption[]>([]);
  const [lstPayrollCycles, setLstPayrollCycles] = useState<PayrollCycleListRecord[]>([]);
  const [dicErrors, setDicErrors] = useState<Partial<Record<keyof FNFSettlementFormValues, string>>>({});
  const [blnSaving, setBlnSaving] = useState(false);
  const [blnOptionsLoading, setBlnOptionsLoading] = useState(true);
  const [blnPayrollRunLoading, setBlnPayrollRunLoading] = useState(false);
  const [strPayrollRunHelper, setStrPayrollRunHelper] = useState("Select an employee to auto-select payroll run.");
  const intPayrollRunRequestRef = useRef(0);
  const objSelectedEmployee = useMemo(() => lstEmployeeOptions.find((objEmployee) => objEmployee.strEmployeeCode === dicForm.strEmployeeCode) || null, [lstEmployeeOptions, dicForm.strEmployeeCode]);
  const decLeaveTotal = useMemo(() => (dicForm.lstLeaveEncashments || []).reduce((decTotal, dicLeave) => decTotal + Number(dicLeave.decEncashableDays || 0), 0), [dicForm.lstLeaveEncashments]);

  useEffect(() => {
    setBlnOptionsLoading(true);
    Promise.all([fnfSettlementService.listEmployeeOptions(), payrollCycleService.getPayrollCycles()])
      .then(([lstEmployees, lstCycles]) => {
        setLstEmployeeOptions(lstEmployees);
        setLstPayrollCycles(lstCycles.filter((dicCycle) => dicCycle.blnIsActive));
      })
      .catch((objError) => setStrError(objError instanceof Error ? objError.message : "Unable to load FNF wizard options."))
      .finally(() => setBlnOptionsLoading(false));
  }, []);

  function updateField<TKey extends keyof FNFSettlementFormValues>(strKey: TKey, objValue: FNFSettlementFormValues[TKey]) {
    setDicForm((dicCurrent) => ({ ...dicCurrent, [strKey]: objValue }));
    setDicErrors((dicCurrent) => ({ ...dicCurrent, [strKey]: undefined }));
  }

  async function handleEmployeeChange(objEmployee: FNFEmployeeOption | null) {
    const intRequestID = intPayrollRunRequestRef.current + 1;
    intPayrollRunRequestRef.current = intRequestID;
    updateField("strEmployeeCode", objEmployee?.strEmployeeCode || "");
    updateField("intEmployeeID", objEmployee?.intID || "");
    updateField("intPayrollRunID", "");
    if (!objEmployee) {
      setBlnPayrollRunLoading(false);
      setStrPayrollRunHelper("Select an employee to auto-select payroll run.");
      return;
    }
    setBlnPayrollRunLoading(true);
    setStrPayrollRunHelper("Resolving payroll run...");
    try {
      const objRun = await fnfSettlementService.getDefaultPayrollRunForEmployee(objEmployee.intID);
      if (intPayrollRunRequestRef.current !== intRequestID) return;
      if (objRun?.intID) {
        updateField("intPayrollRunID", objRun.intID);
        const strRunState = objRun.blnIsLocked ? "locked" : objRun.strRunStatus;
        setStrPayrollRunHelper(`${objRun.strRunCode} - ${objRun.strRunName} (${strRunState})`);
      } else {
        setStrPayrollRunHelper("No payroll run found for this employee.");
      }
    } catch (objError) {
      if (intPayrollRunRequestRef.current !== intRequestID) return;
      setStrPayrollRunHelper(objError instanceof Error ? objError.message : "Unable to resolve payroll run.");
    } finally {
      if (intPayrollRunRequestRef.current === intRequestID) setBlnPayrollRunLoading(false);
    }
  }

  function updateLeaveValue(strLeaveTypeCode: string, strValue: string) {
    setDicForm((dicCurrent) => ({
      ...dicCurrent,
      lstLeaveEncashments: (dicCurrent.lstLeaveEncashments || []).map((dicLeave) => dicLeave.strLeaveTypeCode === strLeaveTypeCode ? { ...dicLeave, decBalanceDays: strValue, decEncashableDays: strValue } : dicLeave),
    }));
  }

  function validateStep(intStep: number) {
    const dicNextErrors: Partial<Record<keyof FNFSettlementFormValues, string>> = {};
    if (intStep === 0 && !dicForm.strEmployeeCode.trim()) dicNextErrors.strEmployeeCode = "Employee is required.";
    if (intStep === 1) {
      if (!dicForm.strExitType.trim()) dicNextErrors.strExitType = "Exit type is required.";
      if (!dicForm.dtResignationDate) dicNextErrors.dtResignationDate = "Exit submitted date is required.";
      if (!dicForm.dtLastWorkingDate) dicNextErrors.dtLastWorkingDate = "Leaving date is required.";
      if (!dicForm.dtSettlementDate) dicNextErrors.dtSettlementDate = "Settlement date is required.";
    }
    if (intStep === 2) {
      if (!isNonNegativeNumber(dicForm.decNoticePeriodDays)) dicNextErrors.decNoticePeriodDays = "Enter a valid non-negative number.";
      if (!isNonNegativeNumber(dicForm.decNoticeServedDays)) dicNextErrors.decNoticeServedDays = "Enter a valid non-negative number.";
      if (!isNonNegativeNumber(dicForm.decNoticeShortfallDays)) dicNextErrors.decNoticeShortfallDays = "Enter a valid non-negative number.";
      if (!dicForm.strPayrollCycleCode) dicNextErrors.strPayrollCycleCode = "Payroll run code is required.";
    }
    if (intStep === 3) {
      if (!isNonNegativeNumber(dicForm.decWorkDays)) dicNextErrors.decWorkDays = "Enter a valid non-negative number.";
      if (!isNonNegativeNumber(dicForm.decDaysWorked)) dicNextErrors.decDaysWorked = "Enter a valid non-negative number.";
    }
    if (intStep === 4 && (dicForm.lstLeaveEncashments || []).some((dicLeave) => !isNonNegativeNumber(dicLeave.decEncashableDays))) {
      setStrError("Leave encashment values must be valid non-negative numbers.");
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
    if (!validateStep(5)) return;
    setBlnSaving(true);
    setStrError("");
    try {
      const strWizardSummary = [
        dicForm.strRemarks.trim(),
        `Work Days: ${dicForm.decWorkDays || 0}`,
        `No. of Days worked: ${dicForm.decDaysWorked || 0}`,
        `Payroll run code: ${dicForm.strPayrollCycleCode || "-"}`,
        `Leave Encashment Total: ${decLeaveTotal}`,
      ].filter(Boolean).join("\n");
      const objCreated = await fnfSettlementService.createSettlement({ ...dicForm, strRemarks: strWizardSummary });
      objRouter.push(`/payroll/fnf-settlements/${objCreated.strRecordUUID}`);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to create FNF settlement.");
    } finally {
      setBlnSaving(false);
    }
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader}>
          <Button className={styles.secondaryButton} variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={handleCancel} controlId="payroll.fnf-settlement-create.back-top.button">Back</Button>
        </Box>
      </Box>
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
                <Autocomplete
                  options={lstEmployeeOptions}
                  value={objSelectedEmployee}
                  loading={blnOptionsLoading}
                  getOptionLabel={(objOption) => objOption?.strLabel || ""}
                  isOptionEqualToValue={(objOption, objValue) => objOption.strEmployeeCode === objValue.strEmployeeCode}
                  onChange={(_, objValue) => handleEmployeeChange(objValue).catch(() => undefined)}
                  renderInput={(params) => <TextField {...params} label="Employee" required error={Boolean(dicErrors.strEmployeeCode)} helperText={dicErrors.strEmployeeCode} fullWidth controlId="payroll.fnf-settlement-create.employee-code.input" />}
                />
              </Box>
            ) : null}

            {intActiveStep === 1 ? (
              <Box className={styles.fnfWizardGrid}>
                <TextField label="Exit type" required value={dicForm.strExitType} onChange={(e) => updateField("strExitType", e.target.value)} error={Boolean(dicErrors.strExitType)} helperText={dicErrors.strExitType} fullWidth controlId="payroll.fnf-settlement-create.exit-type.input" />
                <TextField label="Exit submitted on" required type="date" InputLabelProps={{ shrink: true }} value={dicForm.dtResignationDate} onChange={(e) => updateField("dtResignationDate", e.target.value)} error={Boolean(dicErrors.dtResignationDate)} helperText={dicErrors.dtResignationDate} fullWidth controlId="payroll.fnf-settlement-create.resignation-date.input" />
                <TextField label="Leaving Date" required type="date" InputLabelProps={{ shrink: true }} value={dicForm.dtLastWorkingDate} onChange={(e) => updateField("dtLastWorkingDate", e.target.value)} error={Boolean(dicErrors.dtLastWorkingDate)} helperText={dicErrors.dtLastWorkingDate} fullWidth controlId="payroll.fnf-settlement-create.last-working-date.input" />
                <TextField label="Settlement Date" required type="date" InputLabelProps={{ shrink: true }} value={dicForm.dtSettlementDate} onChange={(e) => updateField("dtSettlementDate", e.target.value)} error={Boolean(dicErrors.dtSettlementDate)} helperText={dicErrors.dtSettlementDate} fullWidth controlId="payroll.fnf-settlement-create.settlement-date.input" />
              </Box>
            ) : null}

            {intActiveStep === 2 ? (
              <Box className={styles.fnfWizardGrid}>
                <TextField label="Notice Period Days" type="number" value={dicForm.decNoticePeriodDays} onChange={(e) => updateField("decNoticePeriodDays", e.target.value)} error={Boolean(dicErrors.decNoticePeriodDays)} helperText={dicErrors.decNoticePeriodDays} fullWidth controlId="payroll.fnf-settlement-create.notice-period-days.input" />
                <TextField label="Notice Served Days" type="number" value={dicForm.decNoticeServedDays} onChange={(e) => updateField("decNoticeServedDays", e.target.value)} error={Boolean(dicErrors.decNoticeServedDays)} helperText={dicErrors.decNoticeServedDays} fullWidth controlId="payroll.fnf-settlement-create.notice-served-days.input" />
                <TextField label="Notice Shortfall Days" type="number" value={dicForm.decNoticeShortfallDays} onChange={(e) => updateField("decNoticeShortfallDays", e.target.value)} error={Boolean(dicErrors.decNoticeShortfallDays)} helperText={dicErrors.decNoticeShortfallDays} fullWidth controlId="payroll.fnf-settlement-create.notice-shortfall-days.input" />
                <TextField select label="Payroll run code" required value={dicForm.strPayrollCycleCode || ""} onChange={(e) => updateField("strPayrollCycleCode", e.target.value)} error={Boolean(dicErrors.strPayrollCycleCode)} helperText={dicErrors.strPayrollCycleCode || (blnPayrollRunLoading ? "Resolving employee payroll run..." : strPayrollRunHelper)} fullWidth controlId="payroll.fnf-settlement-create.payroll-cycle-code.select">
                  <MenuItem value="">Select payroll run code</MenuItem>
                  {lstPayrollCycles.map((dicCycle) => <MenuItem key={dicCycle.intID} value={dicCycle.strCycleCode}>{dicCycle.strCycleCode} - {dicCycle.strCycleName}</MenuItem>)}
                </TextField>
              </Box>
            ) : null}

            {intActiveStep === 3 ? (
              <Box className={styles.fnfWizardGrid}>
                <TextField label="Work Days" type="number" value={dicForm.decWorkDays || "0"} onChange={(e) => updateField("decWorkDays", e.target.value)} error={Boolean(dicErrors.decWorkDays)} helperText={dicErrors.decWorkDays} fullWidth controlId="payroll.fnf-settlement-create.work-days.input" />
                <TextField label="No. of Days worked" type="number" value={dicForm.decDaysWorked || "0"} onChange={(e) => updateField("decDaysWorked", e.target.value)} error={Boolean(dicErrors.decDaysWorked)} helperText={dicErrors.decDaysWorked} fullWidth controlId="payroll.fnf-settlement-create.days-worked.input" />
              </Box>
            ) : null}

            {intActiveStep === 4 ? (
              <Box className={styles.fnfWizardGrid}>
                {lstLeaveFields.map((dicLeave) => {
                  const dicLeaveValue = (dicForm.lstLeaveEncashments || []).find((dicCurrent) => dicCurrent.strLeaveTypeCode === dicLeave.strCode);
                  return (
                    <Tooltip key={dicLeave.strCode} title={dicLeave.strTooltip} placement="top">
                      <TextField label={dicLeave.strName} type="number" value={dicLeaveValue?.decEncashableDays || "0"} onChange={(e) => updateLeaveValue(dicLeave.strCode, e.target.value)} fullWidth controlId={`payroll.fnf-settlement-create.leave-${dicLeave.strCode.toLowerCase()}.input`} />
                    </Tooltip>
                  );
                })}
                <TextField label="Total" type="number" value={decLeaveTotal} disabled fullWidth controlId="payroll.fnf-settlement-create.leave-total.input" />
              </Box>
            ) : null}

            {intActiveStep === 5 ? (
              <TextField label="Remarks" value={dicForm.strRemarks} onChange={(e) => updateField("strRemarks", e.target.value)} fullWidth multiline minRows={5} controlId="payroll.fnf-settlement-create.remarks.input" />
            ) : null}
          </Stack>
        </Box>
        <Box className={styles.fnfWizardActions}>
          {intActiveStep > 0 ? <Button className={styles.secondaryButton} startIcon={<ArrowBackRoundedIcon />} onClick={handlePrevious} controlId="payroll.fnf-settlement-create.previous.button">Previous</Button> : null}
          <Box sx={{ flex: 1 }} />
          <Button className={styles.secondaryButton} startIcon={<ArrowBackRoundedIcon />} onClick={handleCancel} controlId="payroll.fnf-settlement-create.back.button">Back</Button>
          {intActiveStep < lstWizardSteps.length - 1 ? <Button className={styles.primaryButton} endIcon={<ArrowForwardRoundedIcon />} onClick={handleNext} controlId="payroll.fnf-settlement-create.next.button">Next</Button> : null}
          {intActiveStep === lstWizardSteps.length - 1 ? <Button className={styles.primaryButton} startIcon={<SendRoundedIcon />} onClick={handleSubmit} disabled={blnSaving} controlId="payroll.fnf-settlement-create.submit.button">Submit</Button> : null}
        </Box>
      </Box>
      <BlockingLoader blnOpen={blnSaving} strLabel="Saving settlement..." />
    </Box>
  );
}
