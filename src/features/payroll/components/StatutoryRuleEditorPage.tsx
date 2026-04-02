"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import CommonPayrollDialog from "@/features/payroll/components/CommonPayrollDialog";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import {
  createInitialStatutoryRuleForm,
  statutoryRuleService,
  toStatutoryRuleFormValues,
} from "@/features/payroll/services/statutoryRuleService";
import type { StatutoryRuleFormValues } from "@/features/payroll/types";

type StatutoryRuleEditorPageProps = {
  strMode: "add" | "edit";
  intRuleID?: number;
};

export default function StatutoryRuleEditorPage({
  strMode,
  intRuleID,
}: StatutoryRuleEditorPageProps) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("statutory-rules");
  const { t: tCommon } = useModuleLabels("common");
  const [dicForm, setDicForm] = useState<StatutoryRuleFormValues>(
    createInitialStatutoryRuleForm()
  );
  const [blnLoading, setBlnLoading] = useState(strMode === "edit");
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");

  useEffect(() => {
    let blnMounted = true;

    async function loadRule() {
      if (strMode !== "edit" || !intRuleID) {
        return;
      }
      setBlnLoading(true);
      setStrError("");
      try {
        const dicRule = await statutoryRuleService.getStatutoryRuleById(intRuleID);
        if (!blnMounted) {
          return;
        }
        setDicForm(toStatutoryRuleFormValues(dicRule));
      } catch (objError) {
        if (blnMounted) {
          setStrError(
            objError instanceof Error
              ? objError.message
              : "Unable to load statutory rule."
          );
        }
      } finally {
        if (blnMounted) {
          setBlnLoading(false);
        }
      }
    }

    loadRule().catch(() => undefined);
    return () => {
      blnMounted = false;
    };
  }, [intRuleID, strMode]);

  function updateField<TKey extends keyof StatutoryRuleFormValues>(
    strField: TKey,
    objValue: StatutoryRuleFormValues[TKey]
  ) {
    setDicForm((dicPrevious) => ({ ...dicPrevious, [strField]: objValue }));
  }

  function validateForm() {
    if (!dicForm.strRuleCode.trim()) {
      return t("rule_code_required", "Rule code is required.");
    }
    if (!dicForm.dtEffectiveFrom) {
      return t("effective_from_required", "Effective from date is required.");
    }
    if (!dicForm.strRuleValue.trim() && !dicForm.strRuleConfig.trim()) {
      return t(
        "value_or_json_required",
        "Enter either a numeric value or an advanced JSON configuration."
      );
    }
    if (dicForm.strRuleValue.trim() && Number.isNaN(Number(dicForm.strRuleValue))) {
      return t("numeric_value_invalid", "Numeric value must be a valid number.");
    }
    if (dicForm.strRuleConfig.trim()) {
      try {
        JSON.parse(dicForm.strRuleConfig);
      } catch {
        return t("json_invalid", "Advanced JSON configuration must be valid JSON.");
      }
    }
    return "";
  }

  async function saveRule() {
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
      if (strMode === "edit" && intRuleID) {
        await statutoryRuleService.updateStatutoryRule(intRuleID, dicForm);
        setStrSuccess(t("update_success", "Statutory rule updated successfully."));
      } else {
        await statutoryRuleService.createStatutoryRule(dicForm);
        setStrSuccess(t("save_success", "Statutory rule saved successfully."));
        setDicForm(createInitialStatutoryRuleForm());
      }
      window.setTimeout(() => {
        objRouter.push("/payroll/statutory-rules");
      }, 600);
    } catch (objError) {
      setStrError(
        objError instanceof Error ? objError.message : "Unable to save statutory rule."
      );
    } finally {
      setBlnSaving(false);
    }
  }

  if (blnLoading) {
    return <BlockingLoader strLabel={t("loading_rule", "Loading statutory rule...")} />;
  }

  const nodeEditorContent = (
    <Stack spacing={1.5} sx={{ pt: 0.5 }}>
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}

      <Stack spacing={0.5}>
        <Typography className={styles.title}>
          {strMode === "edit"
            ? t("edit_title", "Edit Statutory Rule")
            : t("add_title", "Create Statutory Rule")}
        </Typography>
      </Stack>

      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
        <TextField
          label={t("rule_code", "Rule Code")}
          value={dicForm.strRuleCode}
          onChange={(objEvent) => updateField("strRuleCode", objEvent.target.value)}
          placeholder="pf_employee_rate"
          disabled={blnSaving}
          fullWidth
        />
        <TextField
          select
          label={t("scope", "Scope")}
          value={dicForm.strScopeType}
          onChange={(objEvent) => updateField("strScopeType", objEvent.target.value as StatutoryRuleFormValues["strScopeType"])}
          disabled={blnSaving}
          fullWidth
        >
          <MenuItem value="tenant">{t("scope_tenant", "Tenant-wide")}</MenuItem>
          <MenuItem value="company">{t("scope_company", "Company-specific")}</MenuItem>
        </TextField>
        <TextField
          type="date"
          label={t("effective_from", "Effective From")}
          value={dicForm.dtEffectiveFrom}
          onChange={(objEvent) => updateField("dtEffectiveFrom", objEvent.target.value)}
          disabled={blnSaving}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
        <TextField
          label={t("numeric_value", "Numeric Value")}
          value={dicForm.strRuleValue}
          onChange={(objEvent) => updateField("strRuleValue", objEvent.target.value)}
          placeholder="12.00"
          disabled={blnSaving}
          fullWidth
        />
      </Box>

      <Box
        sx={{
          border: "1px solid #d9e6ef",
          borderRadius: 2,
          backgroundColor: "#f8fafc",
          p: 1.5,
        }}
      >
        <Typography sx={{ fontWeight: 700, color: "#0f172a", mb: 0.5 }}>
          {t("advanced_json_config", "Advanced JSON Configuration")}
        </Typography>
        <Typography sx={{ color: "#64748b", fontSize: "0.88rem", mb: 1 }}>
          {t(
            "advanced_json_help",
            "Use this section only for rule-specific structured settings such as slabs, caps, or state-wise breakdowns."
          )}
        </Typography>
        <TextField
          multiline
          minRows={6}
          maxRows={10}
          value={dicForm.strRuleConfig}
          onChange={(objEvent) => updateField("strRuleConfig", objEvent.target.value)}
          placeholder={`{\n  "cap": 15000,\n  "rounding": "nearest"\n}`}
          disabled={blnSaving}
          fullWidth
        />
      </Box>

      <FormControlLabel
        control={
          <Switch
            checked={dicForm.blnIsActive}
            onChange={(_, blnChecked) => updateField("blnIsActive", blnChecked)}
            disabled={blnSaving}
          />
        }
        label={t("status_active", "Active")}
      />
    </Stack>
  );

  return (
    <Box className={styles.page}>
      <Typography className={styles.breadcrumbs}>
        {t("breadcrumbs_editor", "Payroll / Statutory Rules / Editor")}
      </Typography>
      <Box className={styles.topBar}>
        <Button
          className={styles.secondaryButton}
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => objRouter.push("/payroll/statutory-rules")}
        >
          {t("back_to_list", "Back to List")}
        </Button>
      </Box>

      <CommonPayrollDialog
        blnOpen
        onClose={() => objRouter.push("/payroll/statutory-rules")}
        onDialogClose={blnSaving ? undefined : () => objRouter.push("/payroll/statutory-rules")}
        strTitle={
          strMode === "edit"
            ? t("edit_title", "Edit Statutory Rule")
            : t("add_title", "Create Statutory Rule")
        }
        strSecondaryLabel={tCommon("cancel", "Cancel")}
        strPrimaryLabel={blnSaving ? tCommon("processing", "Processing...") : tCommon("save", "Save")}
        onPrimaryAction={saveRule}
        blnPrimaryDisabled={blnSaving}
        nodeContent={nodeEditorContent}
        paperClassName=""
        maxWidth="lg"
        paperSx={{
          width: "min(92vw, 1120px)",
          maxWidth: "1120px",
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
