"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BlockingLoader from "@/components/shared/BlockingLoader";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { createInitialFNFSettlementForm, fnfSettlementService } from "@/features/payroll/services/fnfSettlementService";
import type { FNFSettlementFormValues } from "@/features/payroll/types";

export default function FNFSettlementCreatePage() {
  const objRouter = useRouter();
  const [dicForm, setDicForm] = useState<FNFSettlementFormValues>(createInitialFNFSettlementForm());
  const [strError, setStrError] = useState("");
  const [dicErrors, setDicErrors] = useState<Partial<Record<keyof FNFSettlementFormValues, string>>>({});
  const [blnSaving, setBlnSaving] = useState(false);
  const objEmployeeCodeRef = useRef<HTMLInputElement | null>(null);
  const objExitTypeRef = useRef<HTMLInputElement | null>(null);
  const objLastWorkingDateRef = useRef<HTMLInputElement | null>(null);

  function updateField<TKey extends keyof FNFSettlementFormValues>(strKey: TKey, objValue: FNFSettlementFormValues[TKey]) {
    setDicForm((dicCurrent) => ({ ...dicCurrent, [strKey]: objValue }));
    setDicErrors((dicCurrent) => ({ ...dicCurrent, [strKey]: undefined }));
  }

  async function handleSave() {
    const dicNextErrors: Partial<Record<keyof FNFSettlementFormValues, string>> = {};
    if (!dicForm.strEmployeeCode.trim()) dicNextErrors.strEmployeeCode = "Employee code is required.";
    if (!dicForm.strExitType.trim()) dicNextErrors.strExitType = "Exit type is required.";
    if (!dicForm.dtLastWorkingDate) dicNextErrors.dtLastWorkingDate = "Last working date is required.";
    if (Object.keys(dicNextErrors).length) {
      setDicErrors(dicNextErrors);
      setStrError("Employee code, exit type, and last working date are required.");
      if (dicNextErrors.strEmployeeCode) objEmployeeCodeRef.current?.focus();
      else if (dicNextErrors.strExitType) objExitTypeRef.current?.focus();
      else objLastWorkingDateRef.current?.focus();
      return;
    }
    setBlnSaving(true);
    setStrError("");
    setDicErrors({});
    try {
      const objCreated = await fnfSettlementService.createSettlement(dicForm);
      objRouter.push(`/payroll/fnf-settlements/${objCreated.intID}`);
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
          <Box className={styles.fnfCreateTitleBlock}><Typography className={styles.breadcrumbs}>Payroll / Full and Final</Typography><Typography className={styles.title}>New FNF Settlement</Typography></Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
            <Button className={styles.secondaryButton} variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/payroll/fnf-settlements")}>Back</Button>
            <Button className={styles.primaryButton} variant="contained" startIcon={<SaveRoundedIcon />} onClick={handleSave} disabled={blnSaving}>Create Settlement</Button>
          </Stack>
        </Box>
      </Box>
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      <Box className={`${styles.tableCard} ${styles.fnfCreateCard}`}>
        <Box className={styles.detailScrollCard}>
          <Stack spacing={2} className={styles.fnfCreateForm}>
            <Box className={styles.fnfCreateGrid}>
              <TextField label="Employee Code" required value={dicForm.strEmployeeCode} onChange={(e) => updateField("strEmployeeCode", e.target.value)} inputRef={objEmployeeCodeRef} error={Boolean(dicErrors.strEmployeeCode)} helperText={dicErrors.strEmployeeCode} fullWidth />
              <TextField label="Settlement Number" value={dicForm.strSettlementNumber} onChange={(e) => updateField("strSettlementNumber", e.target.value)} fullWidth />
              <TextField label="Payroll Run ID" type="number" value={dicForm.intPayrollRunID} onChange={(e) => updateField("intPayrollRunID", e.target.value ? Number(e.target.value) : "")} fullWidth />
              <TextField label="Exit Type" required value={dicForm.strExitType} onChange={(e) => updateField("strExitType", e.target.value)} inputRef={objExitTypeRef} error={Boolean(dicErrors.strExitType)} helperText={dicErrors.strExitType} fullWidth />
              <TextField label="Resignation Date" type="date" InputLabelProps={{ shrink: true }} value={dicForm.dtResignationDate} onChange={(e) => updateField("dtResignationDate", e.target.value)} fullWidth />
              <TextField label="Last Working Date" required type="date" InputLabelProps={{ shrink: true }} value={dicForm.dtLastWorkingDate} onChange={(e) => updateField("dtLastWorkingDate", e.target.value)} inputRef={objLastWorkingDateRef} error={Boolean(dicErrors.dtLastWorkingDate)} helperText={dicErrors.dtLastWorkingDate} fullWidth />
              <TextField label="Settlement Date" type="date" InputLabelProps={{ shrink: true }} value={dicForm.dtSettlementDate} onChange={(e) => updateField("dtSettlementDate", e.target.value)} fullWidth />
              <TextField label="Settlement Month" type="date" InputLabelProps={{ shrink: true }} value={dicForm.dtSettlementMonth} onChange={(e) => updateField("dtSettlementMonth", e.target.value)} fullWidth />
              <TextField label="Currency" value={dicForm.strCurrencyCode} onChange={(e) => updateField("strCurrencyCode", e.target.value)} fullWidth />
              <TextField label="Notice Period Days" type="number" value={dicForm.decNoticePeriodDays} onChange={(e) => updateField("decNoticePeriodDays", e.target.value)} fullWidth />
              <TextField label="Notice Served Days" type="number" value={dicForm.decNoticeServedDays} onChange={(e) => updateField("decNoticeServedDays", e.target.value)} fullWidth />
              <TextField label="Notice Shortfall Days" type="number" value={dicForm.decNoticeShortfallDays} onChange={(e) => updateField("decNoticeShortfallDays", e.target.value)} fullWidth />
            </Box>
            <TextField label="Exit Reason" value={dicForm.strExitReason} onChange={(e) => updateField("strExitReason", e.target.value)} fullWidth multiline minRows={2} />
            <TextField label="Remarks" value={dicForm.strRemarks} onChange={(e) => updateField("strRemarks", e.target.value)} fullWidth multiline minRows={2} />
          </Stack>
        </Box>
      </Box>
      <BlockingLoader blnOpen={blnSaving} strLabel="Saving settlement..." />
    </Box>
  );
}
