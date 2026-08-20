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
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
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

const lstStatutoryRuleModuleCodes = ["STATUTORY_RULE", "STATUTORY_RULES", "PAYROLL_STATUTORY_RULE", "PAYROLL_STATUTORY_RULES"];

export default function StatutoryRuleEditorPage({
  strMode,
  intRuleID,
}: StatutoryRuleEditorPageProps) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("statutory-rules");
  const { t: tCommon } = useModuleLabels("common");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstStatutoryRuleModuleCodes);
  const [dicForm, setDicForm] = useState<StatutoryRuleFormValues>(
    createInitialStatutoryRuleForm()
  );
  const [blnLoading, setBlnLoading] = useState(strMode === "edit");
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const blnCanView = canViewAny() || canDoAny("list");
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanSave = strMode === "add" ? blnCanAdd : blnCanEdit;
  const blnFieldDisabled = blnSaving || blnRightsLoading || !blnCanSave;

  useEffect(() => {
    if (blnRightsLoading || (strMode === "edit" && !blnCanView && !blnCanEdit)) {
      setBlnLoading(false);
      return;
    }

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
  }, [intRuleID, strMode, blnRightsLoading, blnCanView, blnCanEdit]);

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
    if (!blnCanSave) {
      return;
    }

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

  if (blnLoading || blnRightsLoading) {
    return <BlockingLoader blnOpen strLabel={t("loading_rule", "Loading statutory rule...")} />;
  }

  return (
    <Stack
      spacing={1.5}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        minHeight: "100%",
        height: "auto",
        overflowX: "hidden",
        overflowY: "visible",
        pb: 2,
      }}
    >
      <Paper
        sx={{
          borderRadius: "var(--app-card-radius)",
          p: "10px",
          border: "1px solid rgba(148,163,184,0.18)",
          background: "linear-gradient(135deg, #f8fbff 0%, #fef7ed 55%, #f8fafc 100%)",
        }}
      >
        <Stack spacing={1.25}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: "1.7rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
                {strMode === "edit"
                  ? t("edit_title", "Edit Statutory Rule")
                  : t("add_title", "Create Statutory Rule")}
              </Typography>
              <Typography sx={{ color: "#64748b", mt: 0.75 }}>
                {t("subtitle", "Maintain statutory logic in a dedicated workspace instead of opening the form in a popup.")}
              </Typography>
            </Box>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.25}
              sx={{
                alignItems: { xs: "stretch", sm: "center" },
                alignSelf: { md: "flex-start" },
              }}
            >
              <Button
                controlId="statutory-rules.editor.back.button"
                className={styles.secondaryButton}
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => objRouter.push("/payroll/statutory-rules")}
                disabled={blnSaving}
              >
                {t("back_to_list", "Back to List")}
              </Button>
              {blnCanSave ? <Button
                controlId="statutory-rules.editor.save.button"
                className={styles.primaryButton}
                startIcon={<SaveRoundedIcon />}
                onClick={saveRule}
                disabled={blnSaving}
              >
                {blnSaving ? tCommon("processing", "Processing...") : tCommon("save", "Save")}
              </Button> : null}
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {strRightsError ? <Alert severity="warning">{strRightsError}</Alert> : null}
      {!blnCanSave ? <Alert severity="warning">{t("save_access_denied", "Statutory rule save access is not available for your user group.")}</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}

      <Paper
        sx={{
          borderRadius: "var(--app-card-radius)",
          p: "10px",
          border: "1px solid rgba(187, 213, 232, 0.7)",
          boxShadow: "var(--app-shadow-soft)",
        }}
      >
        <Stack spacing={1.5}>
          <Box>
            <Typography sx={{ color: "#0f172a", fontWeight: 800, fontSize: "1.05rem" }}>
              {t("basic_information", "Basic Information")}
            </Typography>
            <Typography sx={{ color: "#64748b", mt: 0.5 }}>
              {t("basic_information_help", "Configure the rule metadata, effectivity date, and optional JSON payload in a full-page form.")}
            </Typography>
          </Box>

          <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
            <TextField
              label={t("rule_code", "Rule Code")}
              value={dicForm.strRuleCode}
              onChange={(objEvent) => updateField("strRuleCode", objEvent.target.value)}
              placeholder="pf_employee_rate"
              disabled={blnFieldDisabled}
              fullWidth
            />
            <TextField
              select
              label={t("scope", "Scope")}
              value={dicForm.strScopeType}
              onChange={(objEvent) => updateField("strScopeType", objEvent.target.value as StatutoryRuleFormValues["strScopeType"])}
              disabled={blnFieldDisabled}
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
              disabled={blnFieldDisabled}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label={t("numeric_value", "Numeric Value")}
              value={dicForm.strRuleValue}
              onChange={(objEvent) => updateField("strRuleValue", objEvent.target.value)}
              placeholder="12.00"
              disabled={blnFieldDisabled}
              fullWidth
            />
          </Box>

          <Box
            sx={{
              border: "1px solid #d9e6ef",
              borderRadius: 2,
              backgroundColor: "#f8fafc",
              p: 2,
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
              minRows={8}
              maxRows={14}
              value={dicForm.strRuleConfig}
              onChange={(objEvent) => updateField("strRuleConfig", objEvent.target.value)}
              placeholder={`{\n  "cap": 15000,\n  "rounding": "nearest"\n}`}
              disabled={blnFieldDisabled}
              fullWidth
            />
          </Box>

          <FormControlLabel
            control={
              <ActiveStatusSwitch
                blnIsActive={dicForm.blnIsActive}
                onChange={(blnChecked) => updateField("blnIsActive", blnChecked)}
                disabled={blnFieldDisabled}
              />
            }
            label={t("status_active", "Active")}
          />
        </Stack>
      </Paper>
    </Stack>
  );
}
