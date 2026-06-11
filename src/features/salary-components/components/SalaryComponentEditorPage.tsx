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
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";

import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
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
  SalaryComponentDetailRecord,
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

function buildInputTestIdProps(strTestId: string) {
  return {
    "data-testid": strTestId,
  } as InputHTMLAttributes<HTMLInputElement>;
}

function buildSelectTestIdProps(strTestId: string) {
  return {
    "data-testid": strTestId,
    inputProps: buildInputTestIdProps(strTestId),
  };
}

function getCategoryLabel(strValue: string) {
  switch (normalizeSelectToken(strValue)) {
    case "earning":
      return "Earning";
    case "deduction":
      return "Deduction";
    case "employer":
    case "employercontribution":
    case "contribution":
      return "Employer Contribution";
    case "reimbursement":
      return "Reimbursement";
    default:
      return strValue;
  }
}

function getWageTypeLabel(strValue: "wages" | "nonWages") {
  return strValue === "wages" ? "Wage Component" : "Non-Wage Component";
}

function getTaxTreatmentLabel(strValue: string) {
  switch (normalizeSelectToken(strValue)) {
    case "taxable":
      return "Taxable";
    case "exempt":
      return "Exempt";
    case "partialexempt":
      return "Partially Exempt";
    case "pretax":
      return "Pre-Tax Deduction";
    case "nontaxable":
    case "nontax":
      return "Non-Taxable";
    case "deferred":
      return "Deferred";
    default:
      return strValue;
  }
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
  const [objDetail, setObjDetail] = useState<SalaryComponentDetailRecord | null>(null);
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
          setObjDetail(dicDetail);
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
  const blnIsReimbursementCategory = normalizeSelectToken(dicForm.strComponentCategory) === "reimbursement";
  const blnIsBenefitsGroup = normalizeSelectToken(dicForm.strComponentGroup) === "benefits";
  const blnShowFlexiSection = blnIsReimbursementCategory || blnIsBenefitsGroup || dicForm.blnIsFlexiBenefit;
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

  useEffect(() => {
    setDicForm((dicPrevious) => {
      const blnNextIsReimbursement = dicPrevious.blnIsReimbursement || normalizeSelectToken(dicPrevious.strComponentCategory) === "reimbursement";
      const dicNext = { ...dicPrevious, blnIsReimbursement: blnNextIsReimbursement };
      if (dicNext.strReimbursementType === "ctc_based") {
        dicNext.blnIncludedInCtc = true;
        dicNext.strSettlementMethod = "payroll";
      } else if (dicNext.strReimbursementType === "non_ctc_based") {
        dicNext.blnIncludedInCtc = false;
        dicNext.strSettlementMethod = "finance";
      }
      if (dicNext.strSettlementMethod === "finance") {
        dicNext.blnAutoPushToPayroll = false;
        dicNext.blnFinanceSettlementRequired = true;
      }
      if (dicNext.blnRequiresBills) {
        dicNext.blnProofRequired = true;
      }
      if (
        dicNext.blnIsReimbursement === dicPrevious.blnIsReimbursement
        && dicNext.blnIncludedInCtc === dicPrevious.blnIncludedInCtc
        && dicNext.strSettlementMethod === dicPrevious.strSettlementMethod
        && dicNext.blnAutoPushToPayroll === dicPrevious.blnAutoPushToPayroll
        && dicNext.blnFinanceSettlementRequired === dicPrevious.blnFinanceSettlementRequired
        && dicNext.blnProofRequired === dicPrevious.blnProofRequired
      ) {
        return dicPrevious;
      }
      return dicNext;
    });
  }, [dicForm.strComponentCategory, dicForm.strReimbursementType, dicForm.strSettlementMethod, dicForm.blnRequiresBills]);

  async function handleSave() {
    if (!blnCanSave) {
      return;
    }
    if (!dicForm.strComponentCode.trim() || !dicForm.strComponentName.trim() || !dicForm.strComponentCategory.trim() || !dicForm.strCalcMethod.trim()) {
      setStrError(t("salary_component_required_fields", "Component code, name, category, and calculation method are required."));
      return;
    }
    if (dicForm.strReimbursementType === "non_ctc_based" && dicForm.blnIncludedInCtc) {
      setStrError(t("non_ctc_not_in_ctc", "Non-CTC reimbursement cannot be included in CTC."));
      return;
    }
    if (dicForm.strSettlementMethod === "finance" && dicForm.blnAutoPushToPayroll) {
      setStrError(t("finance_cannot_auto_push", "Finance settlement cannot auto-push to payroll."));
      return;
    }
    setBlnSaving(true);
    setStrError("");
    try {
      const dicSavedRecord = strMode === "edit" && intSalaryComponentID
        ? await salaryComponentService.updateSalaryComponent(intSalaryComponentID, dicForm)
        : await salaryComponentService.createSalaryComponent(dicForm);
      setObjDetail(dicSavedRecord);
      setDicForm(toSalaryComponentFormValues(dicSavedRecord));
      setStrSuccess(
        strMode === "edit"
          ? t("salary_component_updated", "Salary component updated successfully.")
          : t("salary_component_created", "Salary component created successfully.")
      );
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
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ width: { xs: "100%", sm: "auto" } }}>
              <Button
                data-testid="salary-components.editor.back.button"
                className={styles.secondaryButton}
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => objRouter.push("/salary-components")}
                 sx={{
                  borderRadius: "14px",
                  height: 38,
                  minHeight: 38,
                  py: 0,
                  px: 2.25,
                  minWidth: 100,
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
                {t("back_button", "Back")}
              </Button>
              <Button
                data-testid="salary-components.editor.save.button"
                className={styles.primaryButton}
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
          <TextField
            label={t("component_name", "Component Name")}
            value={dicForm.strComponentName}
            onChange={(objEvent) => syncEnglishComponentText(objEvent.target.value, dicForm.strComponentDescription)}
            disabled={blnFieldDisabled}
            fullWidth
            data-testid="salary-components.editor.component-name.input"
            inputProps={buildInputTestIdProps("salary-components.editor.component-name.input")}
            sx={{ gridColumn: { xs: "1 / -1", md: "span 2" } }}
          />

          <TextField select label={t("component_category", "Component Category")} value={resolveSelectValue(lstCategoryOptions, dicForm.strComponentCategory)} onChange={(objEvent) => updateRootField("strComponentCategory", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth {...buildSelectTestIdProps("salary-components.editor.component-category.select")}>
            {lstCategoryOptions.map((strOption) => (
              <MenuItem key={strOption} value={strOption} data-testid={`salary-components.editor.component-category.${normalizeSelectToken(strOption)}.option`}>{getCategoryLabel(strOption)}</MenuItem>
            ))}
          </TextField>
          <TextField select label={t("payroll_group", "Payroll Group")} value={resolveSelectValue(lstGroupOptions, dicForm.strComponentGroup)} onChange={(objEvent) => updateRootField("strComponentGroup", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth {...buildSelectTestIdProps("salary-components.editor.component-group.select")}>
            <MenuItem value="" data-testid="salary-components.editor.component-group.none.option">{t("none", "None")}</MenuItem>
            {lstGroupOptions.map((strOption) => (
              <MenuItem key={strOption} value={strOption} data-testid={`salary-components.editor.component-group.${normalizeSelectToken(strOption)}.option`}>{strOption}</MenuItem>
            ))}
          </TextField>
          <TextField
            label={t("component_code", "Component Code")}
            value={dicForm.strComponentCode}
            onChange={(objEvent) => updateRootField("strComponentCode", objEvent.target.value.toUpperCase())}
            disabled={blnFieldDisabled || strMode === "edit"}
            helperText={strMode === "edit"
              ? t("component_code_read_only_help", "Component code can be entered during creation and is read-only after save.")
              : t("component_code_create_help", "Set the internal component code used for system references.")}
            fullWidth
            data-testid="salary-components.editor.component-code.input"
            inputProps={buildInputTestIdProps("salary-components.editor.component-code.input")}
          />
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
                control={<Radio disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.wage-type.wages.radio")} />}
                label={t("wages", getWageTypeLabel("wages"))}
                disabled={blnFieldDisabled}
              />
              <FormControlLabel
                value="nonWages"
                control={<Radio disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.wage-type.non-wages.radio")} />}
                label={t("non_wages", getWageTypeLabel("nonWages"))}
                disabled={blnFieldDisabled}
              />
            </RadioGroup>
          </Box>
          <Typography sx={{ gridColumn: { xs: "1 / -1", md: "1 / -1" }, mt: -1, color: "#64748b", fontSize: "0.84rem" }}>
            {t("wage_type_help", "Determines whether the component is considered part of wages for statutory calculations.")}
          </Typography>
          <TextField
            label={t("description", "Description")}
            value={dicForm.strComponentDescription}
            onChange={(objEvent) => syncEnglishComponentText(dicForm.strComponentName, objEvent.target.value)}
            disabled={blnFieldDisabled}
            fullWidth
            multiline
            minRows={3}
            data-testid="salary-components.editor.description.input"
            inputProps={buildInputTestIdProps("salary-components.editor.description.input")}
            sx={{ gridColumn: { xs: "1 / -1", md: "1 / -1" } }}
          />
        </Box>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>2. {t("calculation_setup", "Calculation Setup")}</Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" } }}>
          <TextField select label={t("calculation_method", "Calculation Method")} value={resolveSelectValue(objFormOptions?.lstCalcMethods ?? [], dicForm.strCalcMethod)} onChange={(objEvent) => updateRootField("strCalcMethod", objEvent.target.value)} disabled={blnFieldDisabled} helperText={t("calculation_method_help", "Defines how the component amount is calculated.")} fullWidth {...buildSelectTestIdProps("salary-components.editor.calculation-method.select")}>
            {(objFormOptions?.lstCalcMethods ?? []).map((strOption) => (
              <MenuItem key={strOption} value={strOption} data-testid={`salary-components.editor.calculation-method.${normalizeSelectToken(strOption)}.option`}>{strOption}</MenuItem>
            ))}
          </TextField>
          <TextField select label={t("rounding_rule", "Rounding Rule")} value={resolveSelectValue(objFormOptions?.lstRoundingRules ?? [], dicForm.strRoundingRule)} onChange={(objEvent) => updateRootField("strRoundingRule", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth {...buildSelectTestIdProps("salary-components.editor.rounding-rule.select")}>
            <MenuItem value="" data-testid="salary-components.editor.rounding-rule.none.option">{t("none", "None")}</MenuItem>
            {(objFormOptions?.lstRoundingRules ?? []).map((strOption) => (
              <MenuItem key={strOption} value={strOption} data-testid={`salary-components.editor.rounding-rule.${normalizeSelectToken(strOption)}.option`}>{strOption}</MenuItem>
            ))}
          </TextField>
          <TextField select label={t("default_periodicity", "Default Periodicity")} value={resolveSelectValue(objFormOptions?.lstDefaultPeriodicities ?? [], dicForm.strDefaultPeriodicity)} onChange={(objEvent) => updateRootField("strDefaultPeriodicity", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth {...buildSelectTestIdProps("salary-components.editor.default-periodicity.select")}>
            {(objFormOptions?.lstDefaultPeriodicities ?? []).map((strOption) => (
              <MenuItem key={strOption} value={strOption} data-testid={`salary-components.editor.default-periodicity.${normalizeSelectToken(strOption)}.option`}>{strOption}</MenuItem>
            ))}
          </TextField>
          <TextField select label={t("tax_treatment", "Tax Treatment")} value={resolveSelectValue(objFormOptions?.lstTaxTreatments ?? [], dicForm.strTaxTreatment)} onChange={(objEvent) => updateRootField("strTaxTreatment", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth {...buildSelectTestIdProps("salary-components.editor.tax-treatment.select")}>
            <MenuItem value="" data-testid="salary-components.editor.tax-treatment.none.option">{t("none", "None")}</MenuItem>
            {(objFormOptions?.lstTaxTreatments ?? []).map((strOption) => (
              <MenuItem key={strOption} value={strOption} data-testid={`salary-components.editor.tax-treatment.${normalizeSelectToken(strOption)}.option`}>{getTaxTreatmentLabel(strOption)}</MenuItem>
            ))}
          </TextField>
          <TextField label={t("formula_expression", "Formula Expression")} value={dicForm.strFormulaExpression} onChange={(objEvent) => updateRootField("strFormulaExpression", objEvent.target.value)} disabled={blnFieldDisabled} helperText={t("formula_expression_help", "Applicable only for formula-based calculation methods.")} fullWidth multiline minRows={3} data-testid="salary-components.editor.formula-expression.input" inputProps={buildInputTestIdProps("salary-components.editor.formula-expression.input")} sx={{ gridColumn: { xs: "1 / -1", md: "span 2" } }} />
        </Box>
      </Paper>

      {blnShowFlexiSection ? (
        <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>3. {t("flexi_reimbursement_configuration", "Flexi / Reimbursement Configuration")}</Typography>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" } }}>
            <FormControlLabel control={<Switch checked={dicForm.blnIsFlexiBenefit} onChange={(objEvent) => updateRootField("blnIsFlexiBenefit", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.is-flexi-benefit.switch")} />} label={t("is_flexi_benefit", "Is Flexi Benefit")} />
            <FormControlLabel control={<Switch checked={dicForm.blnIsReimbursement} onChange={(objEvent) => updateRootField("blnIsReimbursement", objEvent.target.checked)} disabled={blnFieldDisabled || blnIsReimbursementCategory} inputProps={buildInputTestIdProps("salary-components.editor.is-reimbursement.switch")} />} label={t("is_reimbursement", "Is Reimbursement")} />
            <FormControlLabel control={<Switch checked={dicForm.blnIncludedInCtc} onChange={(objEvent) => updateRootField("blnIncludedInCtc", objEvent.target.checked)} disabled={blnFieldDisabled || dicForm.strReimbursementType === "non_ctc_based"} inputProps={buildInputTestIdProps("salary-components.editor.included-in-ctc.switch")} />} label={t("included_in_ctc", "Included In CTC")} />
            <TextField
              select
              label={t("reimbursement_type", "Reimbursement Type")}
              value={dicForm.strReimbursementType}
              onChange={(objEvent) => updateRootField("strReimbursementType", objEvent.target.value as SalaryComponentFormValues["strReimbursementType"])}
              disabled={blnFieldDisabled || !dicForm.blnIsReimbursement}
              fullWidth
              {...buildSelectTestIdProps("salary-components.editor.reimbursement-type.select")}
            >
              <MenuItem value="none">{t("none", "None")}</MenuItem>
              {(objFormOptions?.lstReimbursementTypes ?? []).map((strOption) => (
                <MenuItem key={strOption} value={strOption}>{t(`reimbursement_type_${strOption}`, strOption === "ctc_based" ? "CTC Based" : "Non-CTC Based")}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={t("settlement_method", "Settlement Method")}
              value={dicForm.strSettlementMethod}
              onChange={(objEvent) => updateRootField("strSettlementMethod", objEvent.target.value as SalaryComponentFormValues["strSettlementMethod"])}
              disabled={blnFieldDisabled}
              fullWidth
              {...buildSelectTestIdProps("salary-components.editor.settlement-method.select")}
            >
              <MenuItem value="none">{t("none", "None")}</MenuItem>
              {(objFormOptions?.lstSettlementMethods ?? []).map((strOption) => (
                <MenuItem key={strOption} value={strOption}>{t(`settlement_method_${strOption}`, strOption === "payroll" ? "Payroll" : "Finance")}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={t("claim_limit_type", "Claim Limit Type")}
              value={dicForm.strClaimLimitType}
              onChange={(objEvent) => updateRootField("strClaimLimitType", objEvent.target.value as SalaryComponentFormValues["strClaimLimitType"])}
              disabled={blnFieldDisabled}
              fullWidth
              {...buildSelectTestIdProps("salary-components.editor.claim-limit-type.select")}
            >
              {(objFormOptions?.lstClaimLimitTypes ?? []).map((strOption) => (
                <MenuItem key={strOption} value={strOption}>
                  {t(`claim_limit_type_${strOption}`, strOption === "none" ? "No Limit" : strOption === "monthly" ? "Monthly" : "Yearly")}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="number"
              label={t("monthly_limit_amount", "Monthly Limit Amount")}
              value={dicForm.strMonthlyLimitAmount}
              onChange={(objEvent) => updateRootField("strMonthlyLimitAmount", objEvent.target.value)}
              disabled={blnFieldDisabled || (!dicForm.blnIsFlexiBenefit && dicForm.strClaimLimitType !== "monthly")}
              fullWidth
              data-testid="salary-components.editor.monthly-limit-amount.input"
              inputProps={{ ...buildInputTestIdProps("salary-components.editor.monthly-limit-amount.input"), min: 0, step: "0.01" }}
            />
            <TextField
              type="number"
              label={t("annual_limit_amount", "Annual Limit Amount")}
              value={dicForm.strAnnualLimitAmount}
              onChange={(objEvent) => updateRootField("strAnnualLimitAmount", objEvent.target.value)}
              disabled={blnFieldDisabled || (!dicForm.blnIsFlexiBenefit && dicForm.strClaimLimitType !== "yearly")}
              fullWidth
              data-testid="salary-components.editor.annual-limit-amount.input"
              inputProps={{ ...buildInputTestIdProps("salary-components.editor.annual-limit-amount.input"), min: 0, step: "0.01" }}
            />
            <TextField
              select
              label={t("residual_component", "Residual Component")}
              value={dicForm.intResidualComponentID}
              onChange={(objEvent) => updateRootField("intResidualComponentID", objEvent.target.value === "" ? "" : Number(objEvent.target.value))}
              disabled={blnFieldDisabled}
              fullWidth
              {...buildSelectTestIdProps("salary-components.editor.residual-component.select")}
            >
              <MenuItem value="">{t("none", "None")}</MenuItem>
              {(objFormOptions?.lstResidualComponents ?? []).filter((dicOption) => dicOption.intID !== intSalaryComponentID).map((dicOption) => (
                <MenuItem key={dicOption.intID} value={dicOption.intID}>{dicOption.strCode ? `${dicOption.strCode} - ${dicOption.strLabel}` : dicOption.strLabel}</MenuItem>
              ))}
            </TextField>
          </Box>
          <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, mt: 1.5 }}>
            <FormControlLabel control={<Switch checked={dicForm.blnRequiresBills} onChange={(objEvent) => updateRootField("blnRequiresBills", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.requires-bills.switch")} />} label={t("requires_bills", "Requires Bills")} />
            <FormControlLabel control={<Switch checked={dicForm.blnProofRequired} onChange={(objEvent) => updateRootField("blnProofRequired", objEvent.target.checked)} disabled={blnFieldDisabled || dicForm.blnRequiresBills} inputProps={buildInputTestIdProps("salary-components.editor.proof-required.switch")} />} label={t("proof_required", "Proof Required")} />
            <FormControlLabel control={<Switch checked={dicForm.blnAllowExcessClaim} onChange={(objEvent) => updateRootField("blnAllowExcessClaim", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.allow-excess-claim.switch")} />} label={t("allow_excess_claim", "Allow Excess Claim")} />
            <FormControlLabel control={<Switch checked={dicForm.blnExcessClaimTaxable} onChange={(objEvent) => updateRootField("blnExcessClaimTaxable", objEvent.target.checked)} disabled={blnFieldDisabled || !dicForm.blnAllowExcessClaim} inputProps={buildInputTestIdProps("salary-components.editor.excess-claim-taxable.switch")} />} label={t("excess_claim_taxable", "Excess Claim Taxable")} />
            <FormControlLabel control={<Switch checked={dicForm.blnAutoPushToPayroll} onChange={(objEvent) => updateRootField("blnAutoPushToPayroll", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.auto-push-to-payroll.switch")} />} label={t("auto_push_to_payroll", "Auto Push to Payroll")} />
            <FormControlLabel control={<Switch checked={dicForm.blnFinanceSettlementRequired} onChange={(objEvent) => updateRootField("blnFinanceSettlementRequired", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.finance-settlement-required.switch")} />} label={t("finance_settlement_required", "Finance Settlement Required")} />
          </Box>
        </Paper>
      ) : null}

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>{blnShowFlexiSection ? "4." : "3."} {t("statutory_and_payroll_flags", "Statutory & Payroll Flags")}</Typography>
        <Stack spacing={2}>
          {!blnIsReimbursementCategory ? (
            <Box>
              <Typography sx={{ fontWeight: 700, color: "#334155", mb: 1 }}>Statutory</Typography>
              <Box
                sx={{
                  display: "grid",
                  rowGap: 1.25,
                  columnGap: 3,
                  justifyContent: "start",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fit, minmax(220px, max-content))" },
                }}
              >
                <FormControlLabel control={<Switch checked={dicForm.blnIncludeInPF} onChange={(objEvent) => updateRootField("blnIncludeInPF", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.include-in-pf.switch")} />} label={t("include_in_pf", "Include In PF")} />
                <FormControlLabel control={<Switch checked={dicForm.blnIncludeInESIC} onChange={(objEvent) => updateRootField("blnIncludeInESIC", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.include-in-esic.switch")} />} label={t("include_in_esic", "Include In ESIC")} />
                <FormControlLabel control={<Switch checked={dicForm.blnIncludeInGratuity} onChange={(objEvent) => updateRootField("blnIncludeInGratuity", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.include-in-gratuity.switch")} />} label={t("include_in_gratuity", "Include In Gratuity")} />
              </Box>
            </Box>
          ) : null}
          <Box>
            <Typography sx={{ fontWeight: 700, color: "#334155", mb: 1 }}>Payroll Processing</Typography>
            <Box
              sx={{
                display: "grid",
                rowGap: 1.25,
                columnGap: 3,
                justifyContent: "start",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fit, minmax(220px, max-content))" },
              }}
            >
              <FormControlLabel control={<Switch checked={dicForm.blnIncludeInRemuneration} onChange={(objEvent) => updateRootField("blnIncludeInRemuneration", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.include-in-remuneration.switch")} />} label={t("include_in_remuneration", "Include In Remuneration")} />
              <FormControlLabel control={<Switch checked={dicForm.blnAllowManualOverride} onChange={(objEvent) => updateRootField("blnAllowManualOverride", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.allow-manual-override.switch")} />} label={t("allow_manual_override", "Allow Manual Override")} />
            </Box>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, color: "#334155", mb: 1 }}>Contribution Type</Typography>
            <Box
              sx={{
                display: "grid",
                rowGap: 1.25,
                columnGap: 3,
                justifyContent: "start",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fit, minmax(220px, max-content))" },
              }}
            >
              <FormControlLabel control={<Switch checked={dicForm.blnIsEmployeeDeduction} onChange={(objEvent) => updateRootField("blnIsEmployeeDeduction", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.employee-deduction.switch")} />} label={t("employee_deduction", "Employee Deduction")} />
              <FormControlLabel control={<Switch checked={dicForm.blnIsEmployerContribution} onChange={(objEvent) => updateRootField("blnIsEmployerContribution", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.employer-contribution.switch")} />} label={t("employer_contribution", "Employer Contribution")} />
            </Box>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, color: "#334155", mb: 1 }}>Component Status</Typography>
            <FormControlLabel control={<ActiveStatusSwitch testId="salary-components.editor.active-component.switch" blnIsActive={dicForm.blnIsActive} onChange={(blnChecked) => updateRootField("blnIsActive", blnChecked)} disabled={blnFieldDisabled} />} label={t("active_component", "Active Component")} />
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>{blnShowFlexiSection ? "5." : "4."} {t("payslip_configuration", "Payslip Configuration")}</Typography>
        <Box
          sx={{
            display: "grid",
            gap: 2,
            alignItems: "start",
            gridTemplateColumns: { xs: "1fr", md: "minmax(220px, 280px) repeat(2, minmax(0, 1fr))" },
            mb: 1.5,
          }}
        >
          <FormControlLabel
            sx={{ m: 0, pt: { xs: 0, md: 1.25 }, minHeight: 56, alignItems: "center" }}
            control={<Switch checked={dicForm.blnIncludeInPayslip} onChange={(objEvent) => updateRootField("blnIncludeInPayslip", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.include-in-payslip.switch")} />}
            label={t("show_on_payslip", "Show on Payslip")}
          />
          <TextField select label={t("payslip_section", "Payslip Section")} value={dicForm.strPayslipSection} onChange={(objEvent) => updateRootField("strPayslipSection", objEvent.target.value)} disabled={blnFieldDisabled || !dicForm.blnIncludeInPayslip} fullWidth {...buildSelectTestIdProps("salary-components.editor.payslip-section.select")}>
            <MenuItem value="" data-testid="salary-components.editor.payslip-section.none.option">{t("none", "None")}</MenuItem>
            {lstPayslipSections.map((strOption) => (
              <MenuItem key={strOption} value={strOption} data-testid={`salary-components.editor.payslip-section.${normalizeSelectToken(strOption)}.option`}>{strOption}</MenuItem>
            ))}
          </TextField>
          <TextField label={t("display_order", "Display Order")} value={dicForm.strDisplayOrder} onChange={(objEvent) => updateRootField("strDisplayOrder", objEvent.target.value.replace(/\D/g, ""))} disabled={blnFieldDisabled || !dicForm.blnIncludeInPayslip} fullWidth data-testid="salary-components.editor.display-order.input" inputProps={buildInputTestIdProps("salary-components.editor.display-order.input")} />
        </Box>
     </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>{blnShowFlexiSection ? "6." : "5."} {t("declaration_proof", "Declaration & Proof")}</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <FormControlLabel control={<Switch checked={dicForm.blnDeclarationRequired} onChange={(objEvent) => updateRootField("blnDeclarationRequired", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.declaration-required.switch")} />} label={t("declaration_required", "Declaration required")} />
          {!blnIsReimbursementCategory ? <FormControlLabel control={<Switch checked={dicForm.blnProofRequired} onChange={(objEvent) => updateRootField("blnProofRequired", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.proof-required.switch")} />} label={t("proof_required", "Proof Required")} /> : null}
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{blnShowFlexiSection ? "7." : "6."} {t("translations", "Translations")}</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.9rem", mt: 0.4 }}>
              {t("multilingual_text_help", "Add translated component names and descriptions for supported languages.")}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1.1, alignItems: "center", ml: "auto" }}>
            <Button className={styles.secondaryButton} startIcon={<AddRoundedIcon />} onClick={handleAddLanguageRow} disabled data-testid="salary-components.editor.multilingual.add-language.button">
              {t("add_language", "Add Language")}
            </Button>
            <Button
              className={styles.primaryButton}
              onClick={() => void handleTranslateClick()}
              disabled={blnFieldDisabled || dicTextTranslationLoading[dicForm.lstTexts[1]?.strRowID ?? ""]}
              data-testid="salary-components.editor.multilingual.translate.button"
            >
              {dicTextTranslationLoading[dicForm.lstTexts[1]?.strRowID ?? ""]
                ? <CircularProgress size={18} sx={{ color: "#ffffff" }} />
                : t("translate", "AI Translate")}
            </Button>
          </Box>
        </Stack>
        <Stack spacing={1.5}>
          {dicForm.lstTexts.map((dicText, intIndex) => (
            <Box key={dicText.strRowID} sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", lg: "220px 1fr 1.1fr auto" }, alignItems: "start", border: "1px solid rgba(203,213,225,0.8)", borderRadius: "18px", p: 1.5, background: "#f8fafc" }}>
              <TextField select label={t("language", "Language")} value={dicText.intLanguageID} onChange={(objEvent) => updateTextRow(dicText.strRowID, "intLanguageID", Number(objEvent.target.value))} disabled fullWidth data-testid="salary-components.editor.multilingual.language.select" inputProps={{ ...buildInputTestIdProps("salary-components.editor.multilingual.language.select"), "data-row-key": dicText.strRowID }}>
                {(objFormOptions?.lstLanguages ?? []).map((dicLanguage) => (
                  <MenuItem key={dicLanguage.intID} value={dicLanguage.intID} data-testid={`salary-components.editor.multilingual.language.${dicLanguage.intID}.option`}>{dicLanguage.strLabel}</MenuItem>
                ))}
              </TextField>
              <TextField
                label={t("component_name", "Component Name")}
                value={dicText.strComponentName}
                onChange={(objEvent) => updateTextRow(dicText.strRowID, "strComponentName", objEvent.target.value)}
                disabled={blnFieldDisabled || intIndex === 0}
                data-testid="salary-components.editor.multilingual.component-name.input"
                inputProps={{ ...buildInputTestIdProps("salary-components.editor.multilingual.component-name.input"), "data-row-key": dicText.strRowID }}
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
                data-testid="salary-components.editor.multilingual.description.input"
                inputProps={{ ...buildInputTestIdProps("salary-components.editor.multilingual.description.input"), "data-row-key": dicText.strRowID }}
                InputProps={{
                  endAdornment: dicTextTranslationLoading[dicText.strRowID]
                    ? <InputAdornment position="end"><CircularProgress size={18} sx={{ color: "#2563eb" }} /></InputAdornment>
                    : undefined
                }}
                fullWidth
              />
              <Button color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => handleRemoveLanguageRow(dicText.strRowID)} disabled data-testid="salary-components.editor.multilingual.remove.button" data-row-key={dicText.strRowID} sx={{ minHeight: 54 }}>
                {t("remove_button", "Remove")}
              </Button>
            </Box>
          ))}
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>{blnShowFlexiSection ? "8." : "7."} {t("calculation_dependencies", "Calculation Dependencies")}</Typography>
        <Typography sx={{ color: "#64748b", fontSize: "0.9rem", mb: 1.25 }}>
          {t("dependency_mapping_help", "Select salary components required for formula calculations.")}
        </Typography>
        <Box sx={{ maxWidth: 540 }}>
          <TextField
            select
            label={t("dependency_components", "Dependency Components")}
            value={dicForm.lstDependencyComponentIDs}
            onChange={(objEvent) => updateRootField("lstDependencyComponentIDs", parseMultiSelectNumberValues(objEvent.target.value))}
            data-testid="salary-components.editor.dependency-components.select"
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
                <MenuItem
                  key={dicOption.intID}
                  value={dicOption.intID}
                  data-testid={`salary-components.editor.dependency-components.${normalizeSelectToken(dicOption.strCode || dicOption.strLabel)}.option`}
                  data-option-key={dicOption.intID}
                >
                  <Checkbox
                    size="small"
                    checked={dicForm.lstDependencyComponentIDs.includes(dicOption.intID)}
                    inputProps={{
                      ...buildInputTestIdProps(`salary-components.editor.dependency-components.${normalizeSelectToken(dicOption.strCode || dicOption.strLabel)}.checkbox`),
                      "data-option-key": String(dicOption.intID)
                    } as InputHTMLAttributes<HTMLInputElement>}
                    sx={{ mr: 1 }}
                  />
                  <ListItemText primary={dicOption.strCode ? `${dicOption.strCode} - ${dicOption.strLabel}` : dicOption.strLabel} />
                </MenuItem>
              ))}
          </TextField>
        </Box>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>{blnShowFlexiSection ? "9." : "8."} {t("usage_information", "Usage Information")}</Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" } }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: "18px" }}>
            <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>Used In Salary Structures</Typography>
            <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1.4rem" }}>{objDetail?.intUsedInSalaryStructures ?? 0}</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: "18px" }}>
            <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>Assigned Employees</Typography>
            <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1.4rem" }}>{objDetail?.intAssignedEmployees ?? 0}</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: "18px" }}>
            <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>Formula References</Typography>
            <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1.4rem" }}>{objDetail?.intFormulaReferences ?? 0}</Typography>
          </Paper>
        </Box>
      </Paper>
    </Stack>
  );
}
