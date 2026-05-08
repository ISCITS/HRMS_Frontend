"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  InputAdornment,
  ListItemText,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useSalaryComponentLabels } from "@/features/salary-components/hooks/useSalaryComponentLabels";
import {
  createEmptySalaryComponentTextRow,
  createInitialSalaryComponentForm,
  salaryComponentService,
  toSalaryComponentFormValues
} from "@/features/salary-components/services/salaryComponentService";
import { authHelpers } from "@/lib/auth";
import type {
  SalaryComponentFormOptions,
  SalaryComponentFormValues,
  SalaryComponentTextFormValue
} from "@/features/salary-components/types";

type SalaryComponentEditorPageProps = {
  strMode: "add" | "edit";
  intSalaryComponentID?: number;
};

const lstSalaryComponentModuleCodes = ["SALARY_COMPONENT", "SALARY_COMPONENTS", "MASTER_SALARY_COMPONENT"];

function parseMultiSelectNumberValues(objValue: string | string[]) {
  const lstRawValues = Array.isArray(objValue) ? objValue : objValue.split(",");
  return lstRawValues
    .map((strValue) => Number(strValue))
    .filter((intValue) => Number.isInteger(intValue) && intValue > 0);
}

function normalizeSelectToken(strValue: string) {
  return strValue.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function resolveSelectValue(lstOptions: string[], strValue: string | null | undefined) {
  if (!strValue) {
    return "";
  }
  const strNormalizedValue = normalizeSelectToken(strValue);
  const strMatchedValue = lstOptions.find(
    (strOption) => normalizeSelectToken(strOption) === strNormalizedValue
  );
  return strMatchedValue ?? strValue;
}

export default function SalaryComponentEditorPage({
  strMode,
  intSalaryComponentID
}: SalaryComponentEditorPageProps) {
  const objRouter = useRouter();
  const { t } = useSalaryComponentLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstSalaryComponentModuleCodes);
  const [objFormOptions, setObjFormOptions] = useState<SalaryComponentFormOptions | null>(null);
  const [dicForm, setDicForm] = useState<SalaryComponentFormValues>(createInitialSalaryComponentForm());
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const [dicTextTranslationLoading, setDicTextTranslationLoading] = useState<Record<string, boolean>>({});
  const [dicLastTranslatedSourceByRow, setDicLastTranslatedSourceByRow] = useState<Record<string, string>>({});

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnReadOnly = strMode === "edit" && blnCanView && !blnCanEdit;
  const blnCanLoadWorkspace = strMode === "add" ? blnCanAdd : blnCanView;
  const blnCanSave = strMode === "add" ? blnCanAdd : blnCanEdit;
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
        const objOptions = await salaryComponentService.getFormOptions();
        if (!blnMounted) {
          return;
        }
        setObjFormOptions(objOptions);
        if (strMode === "edit" && intSalaryComponentID) {
          const dicDetail = await salaryComponentService.getSalaryComponentById(intSalaryComponentID);
          if (!blnMounted) {
            return;
          }
          setDicForm(toSalaryComponentFormValues(dicDetail));
        } else {
          const intEnglishID = objOptions.lstLanguages.find((dicLanguage) => dicLanguage.strCode?.toLowerCase() === "en")?.intID ?? objOptions.lstLanguages[0]?.intID ?? "";
          setDicForm((dicPrevious) => ({
            ...dicPrevious,
            lstTexts: dicPrevious.lstTexts.map((dicText, intIndex) => intIndex === 0
              ? {
                  ...dicText,
                  intLanguageID: intEnglishID,
                  strLanguageName: objOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === intEnglishID)?.strLabel ?? ""
                }
              : dicText)
          }));
        }
      } catch (objError) {
        if (blnMounted) {
          setStrError(objError instanceof Error ? objError.message : "Unable to load salary component workspace.");
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
  }, [blnCanLoadWorkspace, blnRightsLoading, intSalaryComponentID, strMode]);

  const dicDependencyOptionByID = useMemo(() => {
    return new Map((objFormOptions?.lstDependencyComponents ?? []).map((dicOption) => [dicOption.intID, dicOption]));
  }, [objFormOptions]);
  const lstCategoryOptions = objFormOptions?.lstComponentCategories ?? [];
  const lstGroupOptions = objFormOptions?.lstComponentGroups ?? [];
  const lstPayslipSections = ["Earnings", "Deductions", "Information", "Employer Contributions"];
  const intDefaultLanguageID = authHelpers.getLanguageID() ?? objFormOptions?.lstLanguages[0]?.intID ?? 1;
  const intSecondaryLanguageID =
    authHelpers.getSecondaryLanguageID()
    ?? objFormOptions?.lstLanguages.find((dicLanguage) => dicLanguage.intID !== intDefaultLanguageID)?.intID
    ?? intDefaultLanguageID;

  function buildFixedLanguageRow(
    intLanguageID: number,
    strComponentName: string,
    strComponentDescription: string,
    lstExistingTexts: SalaryComponentTextFormValue[],
  ) {
    const dicExistingText = lstExistingTexts.find(
      (dicText) => Number(dicText.intLanguageID) === intLanguageID
    ) ?? createEmptySalaryComponentTextRow();
    const dicLanguage = (objFormOptions?.lstLanguages ?? []).find((dicOption) => dicOption.intID === intLanguageID);
    return {
      ...dicExistingText,
      intLanguageID,
      strLanguageName: dicLanguage?.strLabel ?? dicExistingText.strLanguageName ?? "",
      strComponentName,
      strComponentDescription,
    };
  }

  function ensureUniqueTextRowIDs(lstTexts: SalaryComponentTextFormValue[]) {
    const setUsedRowIDs = new Set<string>();
    return lstTexts.map((dicText) => {
      const strCandidateRowID = dicText.strRowID?.trim() || createEmptySalaryComponentTextRow().strRowID;
      if (!setUsedRowIDs.has(strCandidateRowID)) {
        setUsedRowIDs.add(strCandidateRowID);
        return dicText;
      }
      const strNewRowID = createEmptySalaryComponentTextRow().strRowID;
      setUsedRowIDs.add(strNewRowID);
      return {
        ...dicText,
        strRowID: strNewRowID,
      };
    });
  }

  function ensureTenantLanguageRows(dicValues: SalaryComponentFormValues) {
    const dicDefaultRow = buildFixedLanguageRow(
      intDefaultLanguageID,
      dicValues.strComponentName,
      dicValues.strComponentDescription,
      dicValues.lstTexts,
    );
    const dicSecondaryExistingText = dicValues.lstTexts.find(
      (dicText) => Number(dicText.intLanguageID) === intSecondaryLanguageID
    );
    const dicSecondaryRow = buildFixedLanguageRow(
      intSecondaryLanguageID,
      dicSecondaryExistingText?.strComponentName ?? "",
      dicSecondaryExistingText?.strComponentDescription ?? "",
      dicValues.lstTexts,
    );
    const lstRows = intSecondaryLanguageID === intDefaultLanguageID
      ? [dicDefaultRow]
      : [dicDefaultRow, dicSecondaryRow];
    return {
      ...dicValues,
      lstTexts: ensureUniqueTextRowIDs(lstRows),
    };
  }

  function syncEnglishComponentText(strComponentName: string, strComponentDescription: string) {
    setDicForm((dicPrevious) => {
      const dicNext = ensureTenantLanguageRows({
        ...dicPrevious,
        strComponentName,
        strComponentDescription,
      });
      return {
        ...dicNext,
        lstTexts: dicNext.lstTexts.map((dicText, intIndex) => intIndex === 0
          ? {
              ...dicText,
              strComponentName,
              strComponentDescription,
            }
          : dicText),
      };
    });
  }

  function updateRootField<TKey extends keyof SalaryComponentFormValues>(strField: TKey, objValue: SalaryComponentFormValues[TKey]) {
    setDicForm((dicPrevious) => ({ ...dicPrevious, [strField]: objValue }));
  }

  function updateTextRow(strRowID: string, strField: keyof SalaryComponentTextFormValue, objValue: string | number) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstTexts: dicPrevious.lstTexts.map((dicText) => {
        if (dicText.strRowID !== strRowID) {
          return dicText;
        }
        if (strField === "intLanguageID") {
          const dicLanguage = (objFormOptions?.lstLanguages ?? []).find((dicOption) => dicOption.intID === Number(objValue));
          return {
            ...dicText,
            intLanguageID: Number(objValue),
            strLanguageName: dicLanguage?.strLabel ?? ""
          };
        }
        return { ...dicText, [strField]: objValue };
      })
    }));
  }

  function handleAddLanguageRow() {
    setDicForm((dicPrevious) => ensureTenantLanguageRows(dicPrevious));
  }

  function handleRemoveLanguageRow(strRowID: string) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstTexts: dicPrevious.lstTexts.filter((dicText) => dicText.strRowID !== strRowID)
    }));
  }

  async function translateTextRow(strRowID: string, intLanguageID: number) {
    const dicSelectedLanguage = (objFormOptions?.lstLanguages ?? []).find((dicLanguage) => dicLanguage.intID === intLanguageID);
    const strSourceComponentName = dicForm.strComponentName.trim();
    const strSourceComponentDescription = dicForm.strComponentDescription.trim();
    const strSourceSignature = `${strSourceComponentName}||${strSourceComponentDescription}`;

    if (!dicSelectedLanguage || intLanguageID === intDefaultLanguageID || !strSourceComponentName) {
      return;
    }

    const dicCurrentRow = dicForm.lstTexts.find((dicText) => dicText.strRowID === strRowID);
    const strLastTranslatedSource = (dicLastTranslatedSourceByRow[strRowID] ?? "").trim();
    const blnShouldTranslate =
      !dicCurrentRow?.strComponentName.trim()
      || strLastTranslatedSource !== strSourceSignature;

    if (!blnShouldTranslate) {
      return;
    }

    setDicTextTranslationLoading((dicPrevious) => ({ ...dicPrevious, [strRowID]: true }));
    try {
      const [strTranslatedName, strTranslatedDescription] = await Promise.all([
        salaryComponentService.translateSalaryComponentText(
          strSourceComponentName,
          intDefaultLanguageID,
          intLanguageID,
        ),
        strSourceComponentDescription
          ? salaryComponentService.translateSalaryComponentText(
              strSourceComponentDescription,
              intDefaultLanguageID,
              intLanguageID,
            )
          : Promise.resolve(""),
      ]);
      setDicForm((dicPrevious) => ({
        ...dicPrevious,
        lstTexts: dicPrevious.lstTexts.map((dicText) => dicText.strRowID === strRowID
          ? {
              ...dicText,
              intLanguageID,
              strLanguageName: dicSelectedLanguage.strLabel,
              strComponentName: strTranslatedName,
              strComponentDescription: strTranslatedDescription,
            }
          : dicText),
      }));
      setDicLastTranslatedSourceByRow((dicPrevious) => ({
        ...dicPrevious,
        [strRowID]: strSourceSignature,
      }));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("request_failed", "Translation request failed."));
    } finally {
      setDicTextTranslationLoading((dicPrevious) => ({ ...dicPrevious, [strRowID]: false }));
    }
  }

  async function handleTranslateClick() {
    const dicSecondaryRow = dicForm.lstTexts[1];
    if (!dicSecondaryRow) {
      return;
    }
    await translateTextRow(dicSecondaryRow.strRowID, Number(dicSecondaryRow.intLanguageID) || intSecondaryLanguageID);
  }

  useEffect(() => {
    if ((objFormOptions?.lstLanguages ?? []).length === 0) {
      return;
    }
    setDicForm((dicPrevious) => ensureTenantLanguageRows(dicPrevious));
  }, [intDefaultLanguageID, intSecondaryLanguageID, objFormOptions?.lstLanguages.length]);

  async function handleSave() {
    if (!blnCanSave) {
      return;
    }
    if (!dicForm.strComponentCode.trim() || !dicForm.strComponentName.trim() || !dicForm.strComponentCategory.trim() || !dicForm.strCalcMethod.trim()) {
      setStrError("Component code, name, category, and calculation method are required.");
      return;
    }
    setBlnSaving(true);
    setStrError("");
    try {
      const dicSavedRecord = strMode === "edit" && intSalaryComponentID
        ? await salaryComponentService.updateSalaryComponent(intSalaryComponentID, dicForm)
        : await salaryComponentService.createSalaryComponent(dicForm);
      setDicForm(toSalaryComponentFormValues(dicSavedRecord));
      setStrSuccess(`Salary component ${strMode === "edit" ? "updated" : "created"} successfully.`);
      if (strMode === "add") {
        objRouter.push(`/salary-components/edit/${dicSavedRecord.intID}`);
      }
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to save salary component.");
    } finally {
      setBlnSaving(false);
    }
  }

  if (blnLoading || blnRightsLoading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: "#64748b" }}>{t("loading_salary_component_workspace", "Loading salary component workspace...")}</Typography>
        </Stack>
      </Box>
    );
  }

  if (!blnCanLoadWorkspace) {
    return (
      <Box className={styles.emptyState}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
          {strMode === "add"
            ? t("access_denied_add", "Salary component create access is not available for your user group.")
            : t("access_denied", "Salary component access is not available for your user group.")}
        </Typography>
        <Typography sx={{ mt: 1, color: "#64748b" }}>
          {t("access_denied_help", "Contact your administrator if you need salary component access.")}
        </Typography>
        {strRightsError ? <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
      </Box>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ height: "100%", overflow: "auto", pr: 0.5 }}>
      <Paper sx={{ borderRadius: "28px", p: { xs: 2, md: 3 }, border: "1px solid rgba(148,163,184,0.18)", background: "linear-gradient(135deg, #f9fbff 0%, #eef4ff 50%, #f8fafc 100%)" }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: "1.7rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
                {strMode === "edit"
                  ? t("edit_salary_component", "Edit Salary Component")
                  : t("add_salary_component", "Add Salary Component")}
              </Typography>
              <Typography sx={{ color: "#64748b", mt: 0.75 }}>
                {t(
                  "editor_description",
                  "Configure calculation rules, compliance flags, multilingual labels, and dependency mapping in one reusable component master."
                )}
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => objRouter.push("/salary-components")}
                sx={{
                  borderRadius: "14px",
                  height: 38,
                  minHeight: 38,
                  py: 0,
                  px: 1.5,
                  fontSize: "0.9rem",
                  whiteSpace: "nowrap",
                  "& .MuiButton-startIcon": {
                    mr: 0.75,
                    "& svg": {
                      fontSize: "1rem"
                    }
                  }
                }}
              >
                {t("back_button", "Back")}
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveRoundedIcon />}
                onClick={handleSave}
                disabled={!blnCanSave || blnSaving}
                sx={{
                  borderRadius: "14px",
                  height: 38,
                  minHeight: 38,
                  py: 0,
                  px: 2.25,
                  minWidth: 168,
                  fontSize: "0.9rem",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  "& .MuiButton-startIcon": {
                    mr: 0.75,
                    "& svg": {
                      fontSize: "1rem"
                    }
                  }
                }}
              >
                {blnSaving ? t("saving", "Saving...") : t("save_component", "Save Component")}
              </Button>
            </Stack>
          </Stack>

          {strError ? <Alert severity="error" onClose={() => setStrError("")}>{strError}</Alert> : null}
          {strSuccess ? <Alert severity="success" onClose={() => setStrSuccess("")}>{strSuccess}</Alert> : null}
          {blnReadOnly ? <Alert severity="info">{t("read_only_mode", "You have view-only access for Salary Component.")}</Alert> : null}
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>1. {t("basic_information", "Basic Information")}</Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" } }}>
          <TextField label={t("component_code", "Component Code")} value={dicForm.strComponentCode} onChange={(objEvent) => updateRootField("strComponentCode", objEvent.target.value.toUpperCase())} disabled={blnFieldDisabled} fullWidth />
          <TextField
            label={t("component_name", "Component Name")}
            value={dicForm.strComponentName}
            onChange={(objEvent) => syncEnglishComponentText(objEvent.target.value, dicForm.strComponentDescription)}
            disabled={blnFieldDisabled}
            fullWidth
            sx={{ gridColumn: { xs: "1 / -1", md: "span 2" } }}
          />

          <TextField select label={t("component_category", "Component Category")} value={resolveSelectValue(lstCategoryOptions, dicForm.strComponentCategory)} onChange={(objEvent) => updateRootField("strComponentCategory", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth>
            {lstCategoryOptions.map((strOption) => (
              <MenuItem key={strOption} value={strOption}>{strOption}</MenuItem>
            ))}
          </TextField>
          <TextField select label={t("component_group", "Component Group")} value={resolveSelectValue(lstGroupOptions, dicForm.strComponentGroup)} onChange={(objEvent) => updateRootField("strComponentGroup", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth>
            <MenuItem value="">{t("none", "None")}</MenuItem>
            {lstGroupOptions.map((strOption) => (
              <MenuItem key={strOption} value={strOption}>{strOption}</MenuItem>
            ))}
          </TextField>
          <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5, minHeight: 56 }}>
            <Typography sx={{ fontSize: "0.875rem", color: "rgba(15, 23, 42, 0.6)", whiteSpace: "nowrap" }}>
              {t("wage_type", "Wage Type")}
            </Typography>
            <RadioGroup
              row
              value={dicForm.blnIsWages ? "wages" : "nonWages"}
              onChange={(objEvent) => updateRootField("blnIsWages", objEvent.target.value === "wages")}
              sx={{ flexWrap: "nowrap" }}
            >
              <FormControlLabel
                value="wages"
                control={<Radio disabled={blnFieldDisabled} />}
                label={t("wages", "Wages")}
                disabled={blnFieldDisabled}
              />
              <FormControlLabel
                value="nonWages"
                control={<Radio disabled={blnFieldDisabled} />}
                label={t("non_wages", "Non Wages")}
                disabled={blnFieldDisabled}
              />
            </RadioGroup>
          </Box>
          <TextField
            label={t("description", "Description")}
            value={dicForm.strComponentDescription}
            onChange={(objEvent) => syncEnglishComponentText(dicForm.strComponentName, objEvent.target.value)}
            disabled={blnFieldDisabled}
            fullWidth
            multiline
            minRows={3}
            sx={{ gridColumn: { xs: "1 / -1", md: "1 / -1" } }}
          />
        </Box>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>2. {t("calculation_setup", "Calculation Setup")}</Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" } }}>
          <TextField select label={t("calculation_method", "Calculation Method")} value={resolveSelectValue(objFormOptions?.lstCalcMethods ?? [], dicForm.strCalcMethod)} onChange={(objEvent) => updateRootField("strCalcMethod", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth>
            {(objFormOptions?.lstCalcMethods ?? []).map((strOption) => (
              <MenuItem key={strOption} value={strOption}>{strOption}</MenuItem>
            ))}
          </TextField>
          <TextField select label={t("rounding_rule", "Rounding Rule")} value={resolveSelectValue(objFormOptions?.lstRoundingRules ?? [], dicForm.strRoundingRule)} onChange={(objEvent) => updateRootField("strRoundingRule", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth>
            <MenuItem value="">{t("none", "None")}</MenuItem>
            {(objFormOptions?.lstRoundingRules ?? []).map((strOption) => (
              <MenuItem key={strOption} value={strOption}>{strOption}</MenuItem>
            ))}
          </TextField>
          <TextField select label={t("default_periodicity", "Default Periodicity")} value={resolveSelectValue(objFormOptions?.lstDefaultPeriodicities ?? [], dicForm.strDefaultPeriodicity)} onChange={(objEvent) => updateRootField("strDefaultPeriodicity", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth>
            {(objFormOptions?.lstDefaultPeriodicities ?? []).map((strOption) => (
              <MenuItem key={strOption} value={strOption}>{strOption}</MenuItem>
            ))}
          </TextField>
          <TextField select label={t("tax_treatment", "Tax Treatment")} value={resolveSelectValue(objFormOptions?.lstTaxTreatments ?? [], dicForm.strTaxTreatment)} onChange={(objEvent) => updateRootField("strTaxTreatment", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth>
            <MenuItem value="">{t("none", "None")}</MenuItem>
            {(objFormOptions?.lstTaxTreatments ?? []).map((strOption) => (
              <MenuItem key={strOption} value={strOption}>{strOption}</MenuItem>
            ))}
          </TextField>
          <TextField label={t("formula_expression", "Formula Expression")} value={dicForm.strFormulaExpression} onChange={(objEvent) => updateRootField("strFormulaExpression", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth multiline minRows={3} sx={{ gridColumn: { xs: "1 / -1", md: "span 2" } }} />
        </Box>
        <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" }, mt: 1.5 }}>
           <FormControlLabel control={<Switch checked={dicForm.blnAllowManualOverride} onChange={(objEvent) => updateRootField("blnAllowManualOverride", objEvent.target.checked)} disabled={blnFieldDisabled} />} label={t("allow_manual_override", "Allow manual override")} />
          <FormControlLabel control={<Switch checked={dicForm.blnIsActive} onChange={(objEvent) => updateRootField("blnIsActive", objEvent.target.checked)} disabled={blnFieldDisabled} />} label={t("active_component", "Active component")} />
          <FormControlLabel control={<Switch checked={dicForm.blnIncludeInPF} onChange={(objEvent) => updateRootField("blnIncludeInPF", objEvent.target.checked)} disabled={blnFieldDisabled} />} label={t("include_in_pf", "Include In PF")} />
          <FormControlLabel control={<Switch checked={dicForm.blnIncludeInESIC} onChange={(objEvent) => updateRootField("blnIncludeInESIC", objEvent.target.checked)} disabled={blnFieldDisabled} />} label={t("include_in_esic", "Include In ESIC")} />
          <FormControlLabel control={<Switch checked={dicForm.blnIncludeInGratuity} onChange={(objEvent) => updateRootField("blnIncludeInGratuity", objEvent.target.checked)} disabled={blnFieldDisabled} />} label={t("include_in_gratuity", "Include In Gratuity")} />
          <FormControlLabel control={<Switch checked={dicForm.blnIsEmployeeDeduction} onChange={(objEvent) => updateRootField("blnIsEmployeeDeduction", objEvent.target.checked)} disabled={blnFieldDisabled} />} label={t("employee_deduction", "Employee Deduction")} />
          <FormControlLabel control={<Switch checked={dicForm.blnIsEmployerContribution} onChange={(objEvent) => updateRootField("blnIsEmployerContribution", objEvent.target.checked)} disabled={blnFieldDisabled} />} label={t("employer_contribution", "Employer Contribution")} />
          <FormControlLabel control={<Switch checked={dicForm.blnIncludeInRemuneration} onChange={(objEvent) => updateRootField("blnIncludeInRemuneration", objEvent.target.checked)} disabled={blnFieldDisabled} />} label={t("include_in_remuneration", "Include In Remuneration")} />
          <FormControlLabel control={<Switch checked={dicForm.blnIncludeInPayslip} onChange={(objEvent) => updateRootField("blnIncludeInPayslip", objEvent.target.checked)} disabled={blnFieldDisabled} />} label={t("include_in_payslip", "Include In Payslip")} />
        </Box>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>3. {t("payroll_payslip_flags", "Payroll / Payslip Flags")}</Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, mb: 1.5 }}>
          <TextField select label={t("payslip_section", "Payslip Section")} value={dicForm.strPayslipSection} onChange={(objEvent) => updateRootField("strPayslipSection", objEvent.target.value)} disabled={blnFieldDisabled || !dicForm.blnIncludeInPayslip} fullWidth>
            <MenuItem value="">{t("none", "None")}</MenuItem>
            {lstPayslipSections.map((strOption) => (
              <MenuItem key={strOption} value={strOption}>{strOption}</MenuItem>
            ))}
          </TextField>
          <TextField label={t("display_order", "Display Order")} value={dicForm.strDisplayOrder} onChange={(objEvent) => updateRootField("strDisplayOrder", objEvent.target.value.replace(/\D/g, ""))} disabled={blnFieldDisabled || !dicForm.blnIncludeInPayslip} fullWidth />
        </Box>
     </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>4. {t("declaration_proof", "Declaration / Proof")}</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <FormControlLabel control={<Switch checked={dicForm.blnDeclarationRequired} onChange={(objEvent) => updateRootField("blnDeclarationRequired", objEvent.target.checked)} disabled={blnFieldDisabled} />} label={t("declaration_required", "Declaration required")} />
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>5. {t("multilingual_text", "Multilingual Text")}</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.9rem", mt: 0.4 }}>
              {t("multilingual_text_help", "Add translated component names and descriptions for supported languages.")}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1.1, alignItems: "center", ml: "auto" }}>
            <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={handleAddLanguageRow} disabled sx={{ borderRadius: "12px" }}>
              {t("add_language", "Add Language")}
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleTranslateClick()}
              disabled={blnFieldDisabled || dicTextTranslationLoading[dicForm.lstTexts[1]?.strRowID ?? ""]}
              sx={{ minWidth: 108, borderRadius: "12px", background: "#2563eb", boxShadow: "none", "&:hover": { background: "#1d4ed8", boxShadow: "none" } }}
            >
              {dicTextTranslationLoading[dicForm.lstTexts[1]?.strRowID ?? ""]
                ? <CircularProgress size={18} sx={{ color: "#ffffff" }} />
                : t("translate", "Translate")}
            </Button>
          </Box>
        </Stack>
        <Stack spacing={1.5}>
          {dicForm.lstTexts.map((dicText, intIndex) => (
            <Box key={dicText.strRowID} sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", lg: "220px 1fr 1.1fr auto" }, alignItems: "start", border: "1px solid rgba(203,213,225,0.8)", borderRadius: "18px", p: 1.5, background: "#f8fafc" }}>
              <TextField select label={t("language", "Language")} value={dicText.intLanguageID} onChange={(objEvent) => updateTextRow(dicText.strRowID, "intLanguageID", Number(objEvent.target.value))} disabled fullWidth>
                {(objFormOptions?.lstLanguages ?? []).map((dicLanguage) => (
                  <MenuItem key={dicLanguage.intID} value={dicLanguage.intID}>{dicLanguage.strLabel}</MenuItem>
                ))}
              </TextField>
              <TextField
                label={t("component_name", "Component Name")}
                value={dicText.strComponentName}
                onChange={(objEvent) => updateTextRow(dicText.strRowID, "strComponentName", objEvent.target.value)}
                disabled={blnFieldDisabled || intIndex === 0}
                InputProps={{
                  endAdornment: dicTextTranslationLoading[dicText.strRowID]
                    ? <InputAdornment position="end"><CircularProgress size={18} sx={{ color: "#2563eb" }} /></InputAdornment>
                    : undefined
                }}
                fullWidth
              />
              <TextField
                label={t("description", "Description")}
                value={dicText.strComponentDescription}
                onChange={(objEvent) => updateTextRow(dicText.strRowID, "strComponentDescription", objEvent.target.value)}
                disabled={blnFieldDisabled || intIndex === 0}
                InputProps={{
                  endAdornment: dicTextTranslationLoading[dicText.strRowID]
                    ? <InputAdornment position="end"><CircularProgress size={18} sx={{ color: "#2563eb" }} /></InputAdornment>
                    : undefined
                }}
                fullWidth
              />
              <Button color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => handleRemoveLanguageRow(dicText.strRowID)} disabled sx={{ minHeight: 54 }}>
                {t("remove_button", "Remove")}
              </Button>
            </Box>
          ))}
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>6. {t("dependency_mapping", "Dependency Mapping")}</Typography>
        <Typography sx={{ color: "#64748b", fontSize: "0.9rem", mb: 1.25 }}>
          {t("dependency_mapping_help", "Select upstream components this component depends on for basis or formula evaluation.")}
        </Typography>
        <Box sx={{ maxWidth: 540 }}>
          <TextField
            select
            label={t("dependency_components", "Dependency Components")}
            value={dicForm.lstDependencyComponentIDs}
            onChange={(objEvent) => updateRootField("lstDependencyComponentIDs", parseMultiSelectNumberValues(objEvent.target.value))}
            SelectProps={{ multiple: true, renderValue: (lstSelected) => (
              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                {(lstSelected as Array<string | number>).map((objValue) => {
                  const intValue = Number(objValue);
                  const dicOption = dicDependencyOptionByID.get(intValue);
                  return <Chip key={String(objValue)} size="small" label={dicOption?.strCode ? `${dicOption.strCode} - ${dicOption.strLabel}` : dicOption?.strLabel ?? String(objValue)} />;
                })}
              </Box>
            ) }}
            disabled={blnFieldDisabled}
            fullWidth
          >
            {(objFormOptions?.lstDependencyComponents ?? [])
              .filter((dicOption) => dicOption.intID !== intSalaryComponentID)
              .map((dicOption) => (
                <MenuItem key={dicOption.intID} value={dicOption.intID}>
                  <Checkbox
                    size="small"
                    checked={dicForm.lstDependencyComponentIDs.includes(dicOption.intID)}
                    sx={{ mr: 1 }}
                  />
                  <ListItemText primary={dicOption.strCode ? `${dicOption.strCode} - ${dicOption.strLabel}` : dicOption.strLabel} />
                </MenuItem>
              ))}
          </TextField>
        </Box>
      </Paper>
    </Stack>
  );
}
