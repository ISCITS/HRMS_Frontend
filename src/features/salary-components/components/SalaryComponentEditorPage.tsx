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
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import { useSalaryComponentLabels } from "@/features/salary-components/hooks/useSalaryComponentLabels";
import {
  createEmptySalaryComponentTextRow,
  createInitialSalaryComponentForm,
  salaryComponentService,
  toSalaryComponentFormValues
} from "@/features/salary-components/services/salaryComponentService";
import type {
  SalaryComponentFormOptions,
  SalaryComponentFormValues,
  SalaryComponentTextFormValue
} from "@/features/salary-components/types";

type SalaryComponentEditorPageProps = {
  strMode: "add" | "edit";
  intSalaryComponentID?: number;
};

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
  const [objFormOptions, setObjFormOptions] = useState<SalaryComponentFormOptions | null>(null);
  const [dicForm, setDicForm] = useState<SalaryComponentFormValues>(createInitialSalaryComponentForm());
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");

  useEffect(() => {
    let blnMounted = true;
    async function loadData() {
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
  }, [intSalaryComponentID, strMode]);

  const dicDependencyOptionByID = useMemo(() => {
    return new Map((objFormOptions?.lstDependencyComponents ?? []).map((dicOption) => [dicOption.intID, dicOption]));
  }, [objFormOptions]);
  const lstCategoryOptions = objFormOptions?.lstComponentCategories ?? [];
  const lstGroupOptions = objFormOptions?.lstComponentGroups ?? [];

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
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstTexts: [...dicPrevious.lstTexts, createEmptySalaryComponentTextRow()]
    }));
  }

  function handleRemoveLanguageRow(strRowID: string) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstTexts: dicPrevious.lstTexts.length === 1 ? dicPrevious.lstTexts : dicPrevious.lstTexts.filter((dicText) => dicText.strRowID !== strRowID)
    }));
  }

  async function handleSave() {
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

  if (blnLoading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: "#64748b" }}>{t("loading_salary_component_workspace", "Loading salary component workspace...")}</Typography>
        </Stack>
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
                disabled={blnSaving}
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
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>1. {t("basic_information", "Basic Information")}</Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
          <TextField label={t("component_code", "Component Code")} value={dicForm.strComponentCode} onChange={(objEvent) => updateRootField("strComponentCode", objEvent.target.value.toUpperCase())} fullWidth />
          <TextField label={t("component_name", "Component Name")} value={dicForm.strComponentName} onChange={(objEvent) => updateRootField("strComponentName", objEvent.target.value)} fullWidth />
          <TextField select label={t("component_category", "Component Category")} value={resolveSelectValue(lstCategoryOptions, dicForm.strComponentCategory)} onChange={(objEvent) => updateRootField("strComponentCategory", objEvent.target.value)} fullWidth>
            {lstCategoryOptions.map((strOption) => (
              <MenuItem key={strOption} value={strOption}>{strOption}</MenuItem>
            ))}
          </TextField>
          <TextField select label={t("component_group", "Component Group")} value={resolveSelectValue(lstGroupOptions, dicForm.strComponentGroup)} onChange={(objEvent) => updateRootField("strComponentGroup", objEvent.target.value)} fullWidth>
            <MenuItem value="">{t("none", "None")}</MenuItem>
            {lstGroupOptions.map((strOption) => (
              <MenuItem key={strOption} value={strOption}>{strOption}</MenuItem>
            ))}
          </TextField>
          <TextField label={t("description", "Description")} value={dicForm.strComponentDescription} onChange={(objEvent) => updateRootField("strComponentDescription", objEvent.target.value)} fullWidth multiline minRows={3} sx={{ gridColumn: { xs: "1 / -1", md: "1 / -1" } }} />
        </Box>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>2. {t("calculation_setup", "Calculation Setup")}</Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" } }}>
          <TextField select label={t("calculation_method", "Calculation Method")} value={resolveSelectValue(objFormOptions?.lstCalcMethods ?? [], dicForm.strCalcMethod)} onChange={(objEvent) => updateRootField("strCalcMethod", objEvent.target.value)} fullWidth>
            {(objFormOptions?.lstCalcMethods ?? []).map((strOption) => (
              <MenuItem key={strOption} value={strOption}>{strOption}</MenuItem>
            ))}
          </TextField>
          <TextField select label={t("rounding_rule", "Rounding Rule")} value={resolveSelectValue(objFormOptions?.lstRoundingRules ?? [], dicForm.strRoundingRule)} onChange={(objEvent) => updateRootField("strRoundingRule", objEvent.target.value)} fullWidth>
            <MenuItem value="">{t("none", "None")}</MenuItem>
            {(objFormOptions?.lstRoundingRules ?? []).map((strOption) => (
              <MenuItem key={strOption} value={strOption}>{strOption}</MenuItem>
            ))}
          </TextField>
          <TextField select label={t("default_periodicity", "Default Periodicity")} value={resolveSelectValue(objFormOptions?.lstDefaultPeriodicities ?? [], dicForm.strDefaultPeriodicity)} onChange={(objEvent) => updateRootField("strDefaultPeriodicity", objEvent.target.value)} fullWidth>
            {(objFormOptions?.lstDefaultPeriodicities ?? []).map((strOption) => (
              <MenuItem key={strOption} value={strOption}>{strOption}</MenuItem>
            ))}
          </TextField>
          <TextField select label={t("tax_treatment", "Tax Treatment")} value={resolveSelectValue(objFormOptions?.lstTaxTreatments ?? [], dicForm.strTaxTreatment)} onChange={(objEvent) => updateRootField("strTaxTreatment", objEvent.target.value)} fullWidth>
            <MenuItem value="">{t("none", "None")}</MenuItem>
            {(objFormOptions?.lstTaxTreatments ?? []).map((strOption) => (
              <MenuItem key={strOption} value={strOption}>{strOption}</MenuItem>
            ))}
          </TextField>
          <TextField label={t("formula_expression", "Formula Expression")} value={dicForm.strFormulaExpression} onChange={(objEvent) => updateRootField("strFormulaExpression", objEvent.target.value)} fullWidth multiline minRows={3} sx={{ gridColumn: { xs: "1 / -1", md: "span 2" } }} />
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 1.5 }}>
          <FormControlLabel control={<Switch checked={dicForm.blnAllowManualOverride} onChange={(objEvent) => updateRootField("blnAllowManualOverride", objEvent.target.checked)} />} label={t("allow_manual_override", "Allow manual override")} />
          <FormControlLabel control={<Switch checked={dicForm.blnIsActive} onChange={(objEvent) => updateRootField("blnIsActive", objEvent.target.checked)} />} label={t("active_component", "Active component")} />
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>3. {t("declaration_proof", "Declaration / Proof")}</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <FormControlLabel control={<Switch checked={dicForm.blnDeclarationRequired} onChange={(objEvent) => updateRootField("blnDeclarationRequired", objEvent.target.checked)} />} label={t("declaration_required", "Declaration required")} />
          <FormControlLabel control={<Switch checked={dicForm.blnProofRequired} onChange={(objEvent) => updateRootField("blnProofRequired", objEvent.target.checked)} />} label={t("proof_required", "Proof required")} />
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>4. {t("multilingual_text", "Multilingual Text")}</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.9rem", mt: 0.4 }}>
              {t("multilingual_text_help", "Add translated component names and descriptions for supported languages.")}
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={handleAddLanguageRow} sx={{ borderRadius: "12px" }}>
            {t("add_language", "Add Language")}
          </Button>
        </Stack>
        <Stack spacing={1.5}>
          {dicForm.lstTexts.map((dicText) => (
            <Box key={dicText.strRowID} sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", lg: "220px 1fr 1.1fr auto" }, alignItems: "start", border: "1px solid rgba(203,213,225,0.8)", borderRadius: "18px", p: 1.5, background: "#f8fafc" }}>
              <TextField select label={t("language", "Language")} value={dicText.intLanguageID} onChange={(objEvent) => updateTextRow(dicText.strRowID, "intLanguageID", Number(objEvent.target.value))} fullWidth>
                {(objFormOptions?.lstLanguages ?? []).map((dicLanguage) => (
                  <MenuItem key={dicLanguage.intID} value={dicLanguage.intID}>{dicLanguage.strLabel}</MenuItem>
                ))}
              </TextField>
              <TextField label={t("component_name", "Component Name")} value={dicText.strComponentName} onChange={(objEvent) => updateTextRow(dicText.strRowID, "strComponentName", objEvent.target.value)} fullWidth />
              <TextField label={t("description", "Description")} value={dicText.strComponentDescription} onChange={(objEvent) => updateTextRow(dicText.strRowID, "strComponentDescription", objEvent.target.value)} fullWidth />
              <Button color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => handleRemoveLanguageRow(dicText.strRowID)} sx={{ minHeight: 54 }}>
                {t("remove_button", "Remove")}
              </Button>
            </Box>
          ))}
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>5. {t("dependency_mapping", "Dependency Mapping")}</Typography>
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
