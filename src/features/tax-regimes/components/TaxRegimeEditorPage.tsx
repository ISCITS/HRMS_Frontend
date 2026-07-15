"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import RuleFolderRoundedIcon from "@mui/icons-material/RuleFolderRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import styles from "@/components/master/MasterScreen.module.css";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useTaxRegimeLabels } from "@/features/tax-regimes/hooks/useTaxRegimeLabels";
import { createInitialTaxRegimeForm, taxRegimeService, toTaxRegimeFormValues } from "@/features/tax-regimes/services/taxRegimeService";
import type { TaxRegimeFormOptions, TaxRegimeFormValues, TaxRegimeTextFormValue } from "@/features/tax-regimes/types";

type TaxRegimeEditorPageProps = {
  strMode: "add" | "edit" | "view";
  intTaxRegimeID?: number;
};

const lstTaxRegimeModuleCodes = ["TAX_REGIME", "TAX_REGIMES", "MASTER_TAX_REGIME", "TAX_SLAB", "TAX_SLABS", "MASTER_TAX_SLAB"];

function getDefaultTaxYearCode(objOptions: TaxRegimeFormOptions, strCurrentValue: string) {
  return strCurrentValue || objOptions.strDefaultEffectiveFromYear || objOptions.lstFinancialYears[0] || "";
}

function createFallbackTextRow(intLanguageID: number, strLanguageName: string): TaxRegimeTextFormValue {
  return {
    strRowID: `${Date.now()}-${intLanguageID}`,
    intLanguageID,
    strLanguageName,
    strRegimeName: "",
    strDescription: "",
  };
}

export default function TaxRegimeEditorPage({ strMode, intTaxRegimeID }: TaxRegimeEditorPageProps) {
  const objRouter = useRouter();
  const { t } = useTaxRegimeLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstTaxRegimeModuleCodes);
  const [objFormOptions, setObjFormOptions] = useState<TaxRegimeFormOptions | null>(null);
  const [dicForm, setDicForm] = useState<TaxRegimeFormValues>(createInitialTaxRegimeForm());
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnForcedViewMode = strMode === "view";
  const blnReadOnly = blnForcedViewMode || (strMode === "edit" && blnCanView && !blnCanEdit);
  const blnCanLoadWorkspace = strMode === "add" ? blnCanAdd : blnCanView;
  const blnCanSave = strMode === "add" ? blnCanAdd : strMode === "edit" ? blnCanEdit : false;
  const blnFieldDisabled = blnSaving || blnReadOnly || !blnCanSave;

  useEffect(() => {
    let blnMounted = true;
    async function loadData() {
      if (blnRightsLoading) {
        return;
      }
      if (!blnCanLoadWorkspace) {
        if (blnMounted) {
          setBlnLoading(false);
        }
        return;
      }
      setBlnLoading(true);
      setStrError("");
      try {
        const objOptions = await taxRegimeService.getFormOptions();
        if (!blnMounted) {
          return;
        }
        setObjFormOptions(objOptions);
        const lstLanguageRows = (objOptions.lstLanguages.length > 0 ? objOptions.lstLanguages : [{ intID: 1, strLabel: "English", strCode: "en" }]).map((dicLanguage) =>
          createFallbackTextRow(dicLanguage.intID, dicLanguage.strLabel),
        );
        if (strMode !== "add" && intTaxRegimeID) {
          const dicDetail = await taxRegimeService.getTaxRegimeById(intTaxRegimeID);
          if (!blnMounted) {
            return;
          }
          const dicNextForm = toTaxRegimeFormValues(dicDetail);
          dicNextForm.lstTexts = lstLanguageRows.map((dicLanguageRow) => {
            const dicExisting = dicNextForm.lstTexts.find((dicText) => dicText.intLanguageID === dicLanguageRow.intLanguageID);
            return dicExisting ?? dicLanguageRow;
          });
          setDicForm(dicNextForm);
        } else {
          setDicForm((dicPrevious) => ({
            ...dicPrevious,
            strCountryCode: objOptions.lstCountries[0]?.strCode ?? dicPrevious.strCountryCode,
            strTaxYearCode: getDefaultTaxYearCode(objOptions, dicPrevious.strTaxYearCode),
            strEffectiveFromYear: getDefaultTaxYearCode(objOptions, dicPrevious.strEffectiveFromYear),
            intRegimeTypeID: objOptions.lstRegimeTypeLookups[0]?.intID ?? "",
            strRegimeTypeCode: objOptions.lstRegimeTypeLookups[0]?.strValueCode ?? dicPrevious.strRegimeTypeCode,
            lstTexts: lstLanguageRows,
          }));
        }
      } catch (objError) {
        if (blnMounted) {
          setStrError(objError instanceof Error ? objError.message : t("load_workspace_failed", "Unable to load tax regime workspace."));
        }
      } finally {
        if (blnMounted) {
          setBlnLoading(false);
        }
      }
    }
    loadData().catch(() => undefined);
    return () => {
      blnMounted = false;
    };
  }, [blnCanLoadWorkspace, blnRightsLoading, intTaxRegimeID, strMode, t]);

  const lstEffectiveYearOptions = useMemo(() => {
    const lstOptions = [...(objFormOptions?.lstFinancialYears ?? [])];
    if (dicForm.strTaxYearCode && !lstOptions.includes(dicForm.strTaxYearCode)) {
      lstOptions.unshift(dicForm.strTaxYearCode);
    }
    return lstOptions;
  }, [dicForm.strTaxYearCode, objFormOptions]);

  function updateField<TKey extends keyof TaxRegimeFormValues>(strField: TKey, objValue: TaxRegimeFormValues[TKey]) {
    setDicForm((dicPrevious) => ({ ...dicPrevious, [strField]: objValue }));
  }

  function updateTextRow(strRowID: string, strField: keyof TaxRegimeTextFormValue, objValue: string) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstTexts: dicPrevious.lstTexts.map((dicText) => dicText.strRowID === strRowID ? { ...dicText, [strField]: objValue } : dicText),
      strRegimeName: strField === "strRegimeName" && dicPrevious.lstTexts[0]?.strRowID === strRowID ? objValue : dicPrevious.strRegimeName,
    }));
  }

  function updateRegimeType(intLookupID: number) {
    const dicSelectedLookup = objFormOptions?.lstRegimeTypeLookups.find((dicLookup) => dicLookup.intID === intLookupID);
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      intRegimeTypeID: intLookupID,
      strRegimeTypeCode: dicSelectedLookup?.strValueCode ?? dicPrevious.strRegimeTypeCode,
    }));
  }

  async function handleSave() {
    if (!blnCanSave) {
      return;
    }
    if (!dicForm.strRegimeCode.trim() || !dicForm.strTaxYearCode.trim() || !dicForm.lstTexts.some((dicText) => dicText.strRegimeName.trim())) {
      setStrError(t("validation_required_fields", "Regime code, tax year, and at least one regime name are required."));
      return;
    }
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicSavedRecord = strMode === "edit" && intTaxRegimeID
        ? await taxRegimeService.updateTaxRegime(intTaxRegimeID, dicForm)
        : await taxRegimeService.createTaxRegime(dicForm);
      setDicForm(toTaxRegimeFormValues(dicSavedRecord));
      setStrSuccess(strMode === "edit" ? t("update_success", "Tax regime updated successfully.") : t("create_success", "Tax regime created successfully."));
      if (strMode === "add") {
        objRouter.push(`/payroll/tax-regimes/edit/${dicSavedRecord.intID}`);
      }
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("save_failed", "Unable to save tax regime."));
    } finally {
      setBlnSaving(false);
    }
  }

  if (blnLoading || blnRightsLoading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: "#64748b" }}>{t("loading_workspace", "Loading tax regime workspace...")}</Typography>
        </Stack>
      </Box>
    );
  }

  if (!blnCanLoadWorkspace) {
    return (
      <Box className={styles.emptyState}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
          {strMode === "add" ? t("access_denied_add", "Tax regime create access is not available for your user group.") : t("access_denied", "Tax regime access is not available for your user group.")}
        </Typography>
        <Typography sx={{ mt: 1, color: "#64748b" }}>
          {t("access_denied_help", "Contact your administrator if you need tax regime access.")}
        </Typography>
        {strRightsError ? <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
      </Box>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ height: "100%", overflow: "auto", pr: 0.5 }}>
      <Paper sx={{ borderRadius: "28px", p: { xs: 2, md: 3 }, border: "1px solid rgba(148,163,184,0.18)", background: "linear-gradient(135deg, #fff9ef 0%, #f4f7ff 55%, #f8fafc 100%)" }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: "1.7rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
                {strMode === "add" ? t("add_tax_regime", "Add Tax Regime") : blnForcedViewMode ? t("view_tax_regime", "View Tax Regime") : t("edit_tax_regime", "Edit Tax Regime")}
              </Typography>
              <Typography sx={{ color: "#64748b", mt: 0.75 }}>
                {t("editor_description", "Configure the effective-dated tax regime header and use the action cards below for slabs and detailed tax rules.")}
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <Button className={styles.secondaryButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/payroll/tax-regimes")}>
                {t("back_to_list", "Back to list")}
              </Button>
              {strMode !== "add" && intTaxRegimeID ? (
                <>
                  <Button className={styles.secondaryButton} startIcon={<ReceiptLongRoundedIcon />} onClick={() => objRouter.push(`/payroll/tax-regimes/edit/${intTaxRegimeID}/slabs`)}>
                    {t("manage_slabs", "Manage Slabs")}
                  </Button>
                  <Button className={styles.secondaryButton} startIcon={<RuleFolderRoundedIcon />} onClick={() => objRouter.push(`/payroll/tax-regimes/edit/${intTaxRegimeID}/standard-deduction`)}>
                    {t("manage_tax_rules", "Manage Tax Rules")}
                  </Button>
                </>
              ) : null}
              {blnCanSave ? (
                <Button className={styles.primaryButton} startIcon={<SaveRoundedIcon />} onClick={handleSave} disabled={blnSaving}>
                  {blnSaving ? t("saving", "Saving...") : t("save", "Save Tax Regime")}
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}
      {blnReadOnly ? <Alert severity="info">{t("read_only_mode", "You have view-only access for Tax Regimes.")}</Alert> : null}

      <Paper sx={{ borderRadius: "24px", p: { xs: 2, md: 3 }, border: "1px solid rgba(187, 213, 232, 0.7)", boxShadow: "var(--app-shadow-soft)" }}>
        <Stack spacing={2.5}>
          <Typography sx={{ color: "#0f172a", fontWeight: 800, fontSize: "1.05rem" }}>{t("basic_information", "Basic Information")}</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
            <TextField label={t("regime_code", "Regime Code")} value={dicForm.strRegimeCode} onChange={(objEvent) => updateField("strRegimeCode", objEvent.target.value.toUpperCase())} disabled={blnFieldDisabled || strMode === "edit"} fullWidth helperText={strMode === "edit" ? t("regime_code_read_only", "Regime code is immutable after creation.") : t("regime_code_help", "Use a stable, business-friendly regime code.")} />
            <TextField label={t("country", "Country")} select value={dicForm.strCountryCode} onChange={(objEvent) => updateField("strCountryCode", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth>
              {(objFormOptions?.lstCountries ?? []).map((dicOption) => (
                <MenuItem key={dicOption.strCode ?? dicOption.intID} value={dicOption.strCode ?? ""}>{dicOption.strLabel}</MenuItem>
              ))}
            </TextField>
            <TextField label={t("currency", "Currency")} value={dicForm.strCurrencyCode} onChange={(objEvent) => updateField("strCurrencyCode", objEvent.target.value.toUpperCase())} disabled={blnFieldDisabled} fullWidth />
            <TextField label={t("tax_year", "Tax Year")} select value={dicForm.strTaxYearCode} onChange={(objEvent) => { updateField("strTaxYearCode", objEvent.target.value); updateField("strEffectiveFromYear", objEvent.target.value); }} disabled={blnFieldDisabled} fullWidth>
              {lstEffectiveYearOptions.map((strYearCode) => (
                <MenuItem key={strYearCode} value={strYearCode}>{strYearCode}</MenuItem>
              ))}
            </TextField>
            <TextField label={t("effective_from", "Effective From")} type="date" value={dicForm.dtEffectiveFrom} onChange={(objEvent) => updateField("dtEffectiveFrom", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label={t("effective_to", "Effective To")} type="date" value={dicForm.dtEffectiveTo} onChange={(objEvent) => updateField("dtEffectiveTo", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label={t("regime_type", "Regime Calculation Type")} select value={dicForm.intRegimeTypeID} onChange={(objEvent) => updateRegimeType(Number(objEvent.target.value))} disabled={blnFieldDisabled} fullWidth helperText={t("regime_type_help", "For India, Old and New regimes usually stay Progressive.")}>
              {(objFormOptions?.lstRegimeTypeLookups ?? []).map((dicLookup) => (
                <MenuItem key={dicLookup.intID} value={dicLookup.intID}>{dicLookup.strDisplayName}</MenuItem>
              ))}
            </TextField>
            <TextField label={t("rounding_rule", "Tax Rounding Rule")} value={dicForm.strRoundingRuleCode} onChange={(objEvent) => updateField("strRoundingRuleCode", objEvent.target.value.toUpperCase())} disabled={blnFieldDisabled} fullWidth />
            <TextField label={t("legal_reference", "Legal Reference")} value={dicForm.strLegalReference} onChange={(objEvent) => updateField("strLegalReference", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth />
            <TextField label={t("configuration_notes", "Configuration Notes")} value={dicForm.strConfigurationNotes} onChange={(objEvent) => updateField("strConfigurationNotes", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth multiline minRows={3} sx={{ gridColumn: { md: "1 / span 2" } }} />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
            <FormControlLabel control={<Switch checked={dicForm.blnIsDefaultRegime} onChange={(objEvent) => updateField("blnIsDefaultRegime", objEvent.target.checked)} disabled={blnFieldDisabled} />} label={t("set_as_default_regime", "Set as Default Regime")} />
            <FormControlLabel control={<Switch checked={dicForm.blnAllowEmployeeOptOut} onChange={(objEvent) => updateField("blnAllowEmployeeOptOut", objEvent.target.checked)} disabled={blnFieldDisabled || !dicForm.blnIsDefaultRegime} />} label={t("allow_employee_opt_out", "Allow Employee Opt-Out")} />
            <FormControlLabel control={<Switch checked={dicForm.blnStandardDeductionEnabled} onChange={(objEvent) => updateField("blnStandardDeductionEnabled", objEvent.target.checked)} disabled={blnFieldDisabled} />} label={t("standard_deduction_enabled", "Standard Deduction Enabled")} />
            <FormControlLabel control={<Switch checked={dicForm.blnRebateEnabled} onChange={(objEvent) => updateField("blnRebateEnabled", objEvent.target.checked)} disabled={blnFieldDisabled} />} label={t("rebate_enabled", "Rebate Enabled")} />
            <FormControlLabel control={<Switch checked={dicForm.blnSurchargeEnabled} onChange={(objEvent) => updateField("blnSurchargeEnabled", objEvent.target.checked)} disabled={blnFieldDisabled} />} label={t("surcharge_enabled", "Surcharge Enabled")} />
            <FormControlLabel control={<Switch checked={dicForm.blnCessEnabled} onChange={(objEvent) => updateField("blnCessEnabled", objEvent.target.checked)} disabled={blnFieldDisabled} />} label={t("cess_enabled", "Cess Enabled")} />
            <FormControlLabel control={<ActiveStatusSwitch blnIsActive={dicForm.blnIsActive} onChange={(blnChecked) => updateField("blnIsActive", blnChecked)} disabled={blnFieldDisabled} />} label={dicForm.blnIsActive ? t("active", "Active") : t("inactive", "Inactive")} />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" }, gap: 2 }}>
            <TextField label={t("standard_deduction_amount", "Default Standard Deduction Amount")} value={dicForm.decStandardDeductionAmount} onChange={(objEvent) => updateField("decStandardDeductionAmount", objEvent.target.value)} disabled={blnFieldDisabled} />
            <TextField label={t("cess_rate_percent", "Cess Rate % Summary")} value={dicForm.decCessRatePercent} onChange={(objEvent) => updateField("decCessRatePercent", objEvent.target.value)} disabled={blnFieldDisabled} />
            <TextField label={t("calculation_priority", "Calculation Priority")} value={dicForm.intCalculationPriority} onChange={(objEvent) => updateField("intCalculationPriority", objEvent.target.value)} disabled={blnFieldDisabled} />
            <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <Typography sx={{ fontSize: "0.875rem", color: "#64748b" }}>{t("regime_type_snapshot", "Regime Type")}</Typography>
              <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>{dicForm.strRegimeTypeCode}</Typography>
            </Box>
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: { xs: 2, md: 3 }, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Stack spacing={2}>
          <Typography sx={{ color: "#0f172a", fontWeight: 800, fontSize: "1.05rem" }}>{t("multilingual_text", "Regime Name Translations")}</Typography>
          {dicForm.lstTexts.map((dicText) => (
            <Box key={dicText.strRowID} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "200px 1fr 1fr" }, gap: 2 }}>
              <TextField label={t("language", "Language")} value={dicText.strLanguageName} disabled fullWidth />
              <TextField label={t("regime_name", "Regime Name")} value={dicText.strRegimeName} onChange={(objEvent) => updateTextRow(dicText.strRowID, "strRegimeName", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth />
              <TextField label={t("description", "Description")} value={dicText.strDescription} onChange={(objEvent) => updateTextRow(dicText.strRowID, "strDescription", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth />
            </Box>
          ))}
        </Stack>
      </Paper>

      {strMode !== "add" && intTaxRegimeID ? (
        <Paper sx={{ borderRadius: "24px", p: { xs: 2, md: 3 }, border: "1px solid rgba(148,163,184,0.18)" }}>
          <Stack spacing={2}>
            <Typography sx={{ color: "#0f172a", fontWeight: 800, fontSize: "1.05rem" }}>{t("manage_tax_rules", "Manage Tax Rules")}</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" }, gap: 2 }}>
              <Button variant="outlined" onClick={() => objRouter.push(`/payroll/tax-regimes/edit/${intTaxRegimeID}/standard-deduction`)}>{t("manage_standard_deduction", "Standard Deduction")}</Button>
              <Button variant="outlined" onClick={() => objRouter.push(`/payroll/tax-regimes/edit/${intTaxRegimeID}/rebate`)}>{t("manage_rebate", "Rebate")}</Button>
              <Button variant="outlined" onClick={() => objRouter.push(`/payroll/tax-regimes/edit/${intTaxRegimeID}/surcharge`)}>{t("manage_surcharge", "Surcharge")}</Button>
              <Button variant="outlined" onClick={() => objRouter.push(`/payroll/tax-regimes/edit/${intTaxRegimeID}/cess`)}>{t("manage_cess", "Cess")}</Button>
            </Box>
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}
