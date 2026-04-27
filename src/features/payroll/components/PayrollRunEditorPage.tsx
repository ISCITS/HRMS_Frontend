"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useRouter } from "next/navigation";

import CommonPayrollDialog from "@/features/payroll/components/CommonPayrollDialog";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import {
  createInitialPayrollRunForm,
  payrollRunService,
} from "@/features/payroll/services/payrollRunService";
import type { PayrollRunFormValues } from "@/features/payroll/types";

export default function PayrollRunEditorPage() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("payroll-runs");
  const { t: tCommon } = useModuleLabels("common");
  const [dicForm, setDicForm] = useState<PayrollRunFormValues>(
    createInitialPayrollRunForm()
  );
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");

  function updateField<TKey extends keyof PayrollRunFormValues>(
    strField: TKey,
    objValue: PayrollRunFormValues[TKey]
  ) {
    setDicForm((dicPrevious) => ({ ...dicPrevious, [strField]: objValue }));
  }

  function validateForm() {
    if (!dicForm.strRunCode.trim()) {
      return t("run_code_required", "Run code is required.");
    }
    if (!dicForm.strRunName.trim()) {
      return t("run_name_required", "Run name is required.");
    }
    if (!dicForm.dtPayrollMonth) {
      return t("payroll_month_required", "Payroll month is required.");
    }
    return "";
  }

  async function saveRun() {
    const strValidationError = validateForm();
    if (strValidationError) {
      setStrError(strValidationError);
      return;
    }

    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicRun = await payrollRunService.createPayrollRun(dicForm);
      setStrSuccess(t("save_success", "Payroll run saved successfully."));
      window.setTimeout(() => {
        objRouter.push(`/payroll/runs/${dicRun.intID}`);
      }, 500);
    } catch (objError) {
      setStrError(
        objError instanceof Error ? objError.message : "Unable to save payroll run."
      );
    } finally {
      setBlnSaving(false);
    }
  }

  const nodeEditorContent = (
    <Stack spacing={1.5} sx={{ pt: 0.5 }}>
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}

      <Typography className={styles.title}>
        {t("add_title", "Create Payroll Run")}
      </Typography>

      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        }}
      >
        <TextField
          label={t("run_code", "Run Code")}
          value={dicForm.strRunCode}
          onChange={(objEvent) => updateField("strRunCode", objEvent.target.value)}
          disabled={blnSaving}
          fullWidth
        />
        <TextField
          label={t("run_name", "Run Name")}
          value={dicForm.strRunName}
          onChange={(objEvent) => updateField("strRunName", objEvent.target.value)}
          disabled={blnSaving}
          fullWidth
        />
        <TextField
          type="date"
          label={t("payroll_month", "Payroll Month")}
          value={dicForm.dtPayrollMonth}
          onChange={(objEvent) =>
            updateField("dtPayrollMonth", objEvent.target.value)
          }
          InputLabelProps={{ shrink: true }}
          disabled={blnSaving}
          fullWidth
        />
        <TextField
          select
          label={t("status", "Status")}
          value={dicForm.strRunStatus}
          onChange={(objEvent) =>
            updateField("strRunStatus", objEvent.target.value as PayrollRunFormValues["strRunStatus"])
          }
          disabled={blnSaving}
          fullWidth
        >
          <MenuItem value="Open">{t("status_open", "Open")}</MenuItem>
          <MenuItem value="Submitted">{t("status_submitted", "Submitted")}</MenuItem>
          <MenuItem value="Approved">{t("status_approved", "Approved")}</MenuItem>
          <MenuItem value="Processed">{t("status_processed", "Processed")}</MenuItem>
          <MenuItem value="Closed">{t("status_closed", "Closed")}</MenuItem>
        </TextField>
      </Box>
    </Stack>
  );

  return (
    <Box className={styles.page}>
      <Typography className={styles.breadcrumbs}>
        {t("breadcrumbs_new", "Payroll / Payroll Runs / New")}
      </Typography>
      <Box className={styles.topBar}>
        <Button
          className={styles.secondaryButton}
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => objRouter.push("/payroll/runs")}
        >
          {t("back_to_list", "Back to List")}
        </Button>
      </Box>

      <CommonPayrollDialog
        blnOpen
        onClose={() => objRouter.push("/payroll/runs")}
        onDialogClose={blnSaving ? undefined : () => objRouter.push("/payroll/runs")}
        strTitle={t("add_title", "Create Payroll Run")}
        strSecondaryLabel={tCommon("cancel", "Cancel")}
        strPrimaryLabel={
          blnSaving ? tCommon("processing", "Processing...") : tCommon("save", "Save")
        }
        onPrimaryAction={saveRun}
        blnPrimaryDisabled={blnSaving}
        nodeContent={nodeEditorContent}
        paperClassName=""
        maxWidth="md"
        paperSx={{
          width: "min(92vw, 980px)",
          maxWidth: "980px",
          maxHeight: "82vh",
          borderRadius: 2,
          overflow: "hidden",
          background:
            "linear-gradient(180deg, rgba(250,253,255,1) 0%, rgba(255,255,255,1) 55%, rgba(247,250,252,1) 100%)",
          "& .MuiDialogTitle-root": {
            px: 3,
            py: 2,
            borderBottom: "1px solid #d9e6ef",
            fontWeight: 800,
          },
          "& .MuiDialogContent-root": {
            px: 3,
            py: 2,
          },
          "& .MuiDialogActions-root": {
            px: 3,
            py: 2,
            borderTop: "1px solid #d9e6ef",
            background: "rgba(255,255,255,0.96)",
            position: "sticky",
            bottom: 0,
          },
        }}
      />
    </Box>
  );
}
