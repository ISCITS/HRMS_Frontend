"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
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
import { useState } from "react";
import { useRouter } from "next/navigation";

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

  return (
    <Stack spacing={2.5} className={styles.page}>
      <Paper
        sx={{
          borderRadius: "28px",
          p: { xs: 2, md: 3 },
          border: "1px solid rgba(148,163,184,0.18)",
          background: "linear-gradient(135deg, #f8fbff 0%, #eef7f4 45%, #f8fafc 100%)",
        }}
      >
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: "1.7rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
                {t("add_title", "Create Payroll Run")}
              </Typography>
              <Typography sx={{ color: "#64748b", mt: 0.75 }}>
                {t("subtitle", "Open payroll run creation in a dedicated screen instead of a modal dialog.")}
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <Button
                className={styles.secondaryButton}
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => objRouter.push("/payroll/runs")}
                disabled={blnSaving}
              >
                {t("back_to_list", "Back to List")}
              </Button>
              <Button
                className={styles.primaryButton}
                startIcon={<SaveRoundedIcon />}
                onClick={saveRun}
                disabled={blnSaving}
              >
                {blnSaving ? tCommon("processing", "Processing...") : tCommon("save", "Save")}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}

      <Paper
        sx={{
          borderRadius: "24px",
          p: { xs: 2, md: 3 },
          border: "1px solid rgba(187, 213, 232, 0.7)",
          boxShadow: "var(--app-shadow-soft)",
        }}
      >
        <Stack spacing={2.5}>
          <Box>
            <Typography sx={{ color: "#0f172a", fontWeight: 800, fontSize: "1.05rem" }}>
              {t("basic_information", "Basic Information")}
            </Typography>
            <Typography sx={{ color: "#64748b", mt: 0.5 }}>
              {t("basic_information_help", "Capture the run identity, payroll month, workflow status, and lock state in a full-page form.")}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: 2,
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
              onChange={(objEvent) => updateField("dtPayrollMonth", objEvent.target.value)}
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
            </TextField>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={dicForm.blnIsLocked}
                onChange={(_, blnChecked) => updateField("blnIsLocked", blnChecked)}
                disabled={blnSaving}
              />
            }
            label={t("locked", "Locked")}
          />
        </Stack>
      </Paper>
    </Stack>
  );
}
