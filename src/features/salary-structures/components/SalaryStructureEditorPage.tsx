"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  InputAdornment,
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
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useSalaryStructureLabels } from "@/features/salary-structures/hooks/useSalaryStructureLabels";
import {
  createEmptyLineRow,
  createEmptyTextRow,
  createInitialSalaryStructureForm,
  salaryStructureService,
  toSalaryStructureFormValues
} from "@/features/salary-structures/services/salaryStructureService";
import { authHelpers } from "@/lib/auth";
import type {
  SalaryStructureFormOptions,
  SalaryStructureFormValues,
  SalaryStructureLineFormValue,
  SalaryStructureTextFormValue
} from "@/features/salary-structures/types";

type SalaryStructureEditorPageProps = {
  strMode: "add" | "edit";
  intSalaryStructureID?: number;
};

const lstSalaryStructureModuleCodes = ["SALARY_STRUCTURE", "SALARY_STRUCTURES", "MASTER_SALARY_STRUCTURE"];

function getNextLineOrder(lstLines: SalaryStructureLineFormValue[]) {
  if (lstLines.length === 0) {
    return 10;
  }
  return Math.max(...lstLines.map((dicLine) => dicLine.intLineOrder)) + 10;
}

function parseOptionalSelectNumber(strValue: string) {
  if (!strValue) {
    return "";
  }
  const intValue = Number(strValue);
  return Number.isInteger(intValue) && intValue > 0 ? intValue : "";
}

export default function SalaryStructureEditorPage({
  strMode,
  intSalaryStructureID
}: SalaryStructureEditorPageProps) {
  const objRouter = useRouter();
  const { t } = useSalaryStructureLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstSalaryStructureModuleCodes);
  const [objFormOptions, setObjFormOptions] = useState<SalaryStructureFormOptions | null>(null);
  const [dicForm, setDicForm] = useState<SalaryStructureFormValues>(createInitialSalaryStructureForm());
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
        const objOptions = await salaryStructureService.getFormOptions();
        if (!blnMounted) {
          return;
        }
        setObjFormOptions(objOptions);

        if (strMode === "edit" && intSalaryStructureID) {
          const dicDetail = await salaryStructureService.getSalaryStructureById(intSalaryStructureID);
          if (!blnMounted) {
            return;
          }
          setDicForm(toSalaryStructureFormValues(dicDetail));
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
          setStrError(objError instanceof Error ? objError.message : "Unable to load salary structure workspace.");
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
  }, [blnCanLoadWorkspace, blnRightsLoading, intSalaryStructureID, strMode]);

  const dicComponentByID = useMemo(() => {
    return new Map((objFormOptions?.lstSalaryComponents ?? []).map((dicOption) => [dicOption.intID, dicOption]));
  }, [objFormOptions]);
  const intDefaultLanguageID = authHelpers.getLanguageID() ?? objFormOptions?.lstLanguages[0]?.intID ?? 1;
  const intSecondaryLanguageID =
    authHelpers.getSecondaryLanguageID()
    ?? objFormOptions?.lstLanguages.find((dicLanguage) => dicLanguage.intID !== intDefaultLanguageID)?.intID
    ?? intDefaultLanguageID;

  function buildFixedLanguageRow(
    intLanguageID: number,
    strStructureName: string,
    strStructureDescription: string,
    lstExistingTexts: SalaryStructureTextFormValue[],
  ) {
    const dicExistingText = lstExistingTexts.find(
      (dicText) => Number(dicText.intLanguageID) === intLanguageID
    ) ?? createEmptyTextRow();
    const dicLanguage = (objFormOptions?.lstLanguages ?? []).find((dicOption) => dicOption.intID === intLanguageID);
    return {
      ...dicExistingText,
      intLanguageID,
      strLanguageName: dicLanguage?.strLabel ?? dicExistingText.strLanguageName ?? "",
      strStructureName,
      strStructureDescription,
    };
  }

  function ensureUniqueTextRowIDs(lstTexts: SalaryStructureTextFormValue[]) {
    const setUsedRowIDs = new Set<string>();
    return lstTexts.map((dicText) => {
      const strCandidateRowID = dicText.strRowID?.trim() || createEmptyTextRow().strRowID;
      if (!setUsedRowIDs.has(strCandidateRowID)) {
        setUsedRowIDs.add(strCandidateRowID);
        return dicText;
      }
      const strNewRowID = createEmptyTextRow().strRowID;
      setUsedRowIDs.add(strNewRowID);
      return {
        ...dicText,
        strRowID: strNewRowID,
      };
    });
  }

  function ensureTenantLanguageRows(dicValues: SalaryStructureFormValues) {
    const dicDefaultExistingText = dicValues.lstTexts.find(
      (dicText) => Number(dicText.intLanguageID) === intDefaultLanguageID
    );
    const dicDefaultRow = buildFixedLanguageRow(
      intDefaultLanguageID,
      dicValues.strStructureName,
      dicDefaultExistingText?.strStructureDescription ?? dicValues.lstTexts[0]?.strStructureDescription ?? "",
      dicValues.lstTexts,
    );
    const dicSecondaryExistingText = dicValues.lstTexts.find(
      (dicText) => Number(dicText.intLanguageID) === intSecondaryLanguageID
    );
    const dicSecondaryRow = buildFixedLanguageRow(
      intSecondaryLanguageID,
      dicSecondaryExistingText?.strStructureName ?? "",
      dicSecondaryExistingText?.strStructureDescription ?? "",
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

  function syncDefaultStructureText(strStructureName: string) {
    setDicForm((dicPrevious) => {
      const dicNext = ensureTenantLanguageRows({
        ...dicPrevious,
        strStructureName,
      });
      return {
        ...dicNext,
        lstTexts: dicNext.lstTexts.map((dicText, intIndex) => intIndex === 0
          ? {
              ...dicText,
              strStructureName,
            }
          : dicText),
      };
    });
  }

  function updateRootField<TKey extends keyof SalaryStructureFormValues>(strField: TKey, objValue: SalaryStructureFormValues[TKey]) {
    setDicForm((dicPrevious) => ({ ...dicPrevious, [strField]: objValue }));
  }

  function updateTextRow(strRowID: string, strField: keyof SalaryStructureTextFormValue, objValue: string | number) {
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

  function updateLineRow(strRowID: string, strField: keyof SalaryStructureLineFormValue, objValue: string | number | boolean) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstComponents: dicPrevious.lstComponents.map((dicLine) => {
        if (dicLine.strRowID !== strRowID) {
          return dicLine;
        }
        if (strField === "intSalaryComponentID") {
          const dicComponent = dicComponentByID.get(Number(objValue));
          return {
            ...dicLine,
            intSalaryComponentID: Number(objValue),
            strComponentCode: dicComponent?.strCode ?? "",
            strComponentName: dicComponent?.strLabel ?? ""
          };
        }
        if (strField === "strValueSource") {
          if (objValue === "Fixed") {
            return {
              ...dicLine,
              strValueSource: "Fixed",
              fltPercentageValue: "",
              intBasisComponentID: "",
              strFormulaExpression: ""
            };
          }
          if (objValue === "Percentage") {
            return {
              ...dicLine,
              strValueSource: "Percentage",
              fltFixedAmount: "",
              strFormulaExpression: ""
            };
          }
          return {
            ...dicLine,
            strValueSource: "Formula",
            fltFixedAmount: "",
            fltPercentageValue: "",
            intBasisComponentID: ""
          };
        }
        return { ...dicLine, [strField]: objValue };
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
    const strSourceStructureName = dicForm.strStructureName.trim();
    const strSourceStructureDescription = (
      dicForm.lstTexts.find((dicText) => Number(dicText.intLanguageID) === intDefaultLanguageID)?.strStructureDescription
      ?? dicForm.lstTexts[0]?.strStructureDescription
      ?? ""
    ).trim();
    const strSourceSignature = `${strSourceStructureName}||${strSourceStructureDescription}`;

    if (!dicSelectedLanguage || intLanguageID === intDefaultLanguageID || !strSourceStructureName) {
      return;
    }

    const dicCurrentRow = dicForm.lstTexts.find((dicText) => dicText.strRowID === strRowID);
    const strLastTranslatedSource = (dicLastTranslatedSourceByRow[strRowID] ?? "").trim();
    const blnShouldTranslate =
      !dicCurrentRow?.strStructureName.trim()
      || strLastTranslatedSource !== strSourceSignature;

    if (!blnShouldTranslate) {
      return;
    }

    setDicTextTranslationLoading((dicPrevious) => ({ ...dicPrevious, [strRowID]: true }));
    try {
      const [strTranslatedName, strTranslatedDescription] = await Promise.all([
        salaryStructureService.translateSalaryStructureText(
          strSourceStructureName,
          intDefaultLanguageID,
          intLanguageID,
        ),
        strSourceStructureDescription
          ? salaryStructureService.translateSalaryStructureText(
              strSourceStructureDescription,
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
              strStructureName: strTranslatedName,
              strStructureDescription: strTranslatedDescription,
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

  function handleAddLineRow() {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstComponents: [...dicPrevious.lstComponents, createEmptyLineRow(getNextLineOrder(dicPrevious.lstComponents))]
    }));
  }

  function handleRemoveLineRow(strRowID: string) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstComponents: dicPrevious.lstComponents.length === 1 ? dicPrevious.lstComponents : dicPrevious.lstComponents.filter((dicLine) => dicLine.strRowID !== strRowID)
    }));
  }

  async function handleSave() {
    if (!blnCanSave) {
      return;
    }
    if (!dicForm.strStructureCode.trim() || !dicForm.strStructureName.trim() || !dicForm.dtEffectiveFrom) {
      setStrError("Structure code, structure name, and effective from date are required.");
      return;
    }
    if (dicForm.lstComponents.filter((dicLine) => dicLine.intSalaryComponentID !== "").length === 0) {
      setStrError("At least one component line is required.");
      return;
    }
    setBlnSaving(true);
    setStrError("");
    try {
      const dicSavedRecord = strMode === "edit" && intSalaryStructureID
        ? await salaryStructureService.updateSalaryStructure(intSalaryStructureID, dicForm)
        : await salaryStructureService.createSalaryStructure(dicForm);
      setDicForm(toSalaryStructureFormValues(dicSavedRecord));
      setStrSuccess(`Salary structure ${strMode === "edit" ? "updated" : "created"} successfully.`);
      if (strMode === "add") {
        objRouter.push(`/salary-structures/edit/${dicSavedRecord.intID}`);
      }
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to save salary structure.");
    } finally {
      setBlnSaving(false);
    }
  }

  if (blnLoading || blnRightsLoading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: "#64748b" }}>{t("loading_salary_structure_workspace", "Loading salary structure workspace...")}</Typography>
        </Stack>
      </Box>
    );
  }

  if (!blnCanLoadWorkspace) {
    return (
      <Box className={styles.emptyState}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
          {strMode === "add"
            ? t("access_denied_add", "Salary structure create access is not available for your user group.")
            : t("access_denied", "Salary structure access is not available for your user group.")}
        </Typography>
        <Typography sx={{ mt: 1, color: "#64748b" }}>
          {t("access_denied_help", "Contact your administrator if you need salary structure access.")}
        </Typography>
        {strRightsError ? <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
      </Box>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ height: "100%", overflow: "auto", pr: 0.5 }}>
      <Paper
        sx={{
          borderRadius: "28px",
          p: { xs: 2, md: 3 },
          border: "1px solid rgba(148,163,184,0.18)",
          background: "linear-gradient(135deg, #f9fbff 0%, #eef4ff 50%, #f8fafc 100%)"
        }}
      >
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: "1.7rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
                {strMode === "edit"
                  ? t("edit_salary_structure", "Edit Salary Structure")
                  : t("add_salary_structure", "Add Salary Structure")}
              </Typography>
              <Typography sx={{ color: "#64748b", mt: 0.75 }}>
                {t(
                  "editor_description",
                  "Define structure header, company scope dates, multilingual text, and component-wise calculation rules in one workflow."
                )}
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => objRouter.push("/salary-structures")}
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
                  px: 1.75,
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
                {blnSaving ? t("saving", "Saving...") : t("save_button", "Save")}
              </Button>
            </Stack>
          </Stack>

          {strError ? <Alert severity="error" onClose={() => setStrError("")}>{strError}</Alert> : null}
          {strSuccess ? <Alert severity="success" onClose={() => setStrSuccess("")}>{strSuccess}</Alert> : null}
          {blnReadOnly ? <Alert severity="info">{t("read_only_mode", "You have view-only access for Salary Structure.")}</Alert> : null}
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>
          1. {t("structure_header", "Structure Header")}
        </Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
          <TextField
            label={t("structure_code", "Structure Code")}
            value={dicForm.strStructureCode}
            onChange={(objEvent) => updateRootField("strStructureCode", objEvent.target.value.toUpperCase())}
            disabled={blnFieldDisabled}
            fullWidth
          />
          <TextField
            label={t("structure_name", "Structure Name")}
            value={dicForm.strStructureName}
            onChange={(objEvent) => syncDefaultStructureText(objEvent.target.value)}
            disabled={blnFieldDisabled}
            fullWidth
          />
        </Box>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>
          2. {t("scope_and_dates", "Scope and Dates")}
        </Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" } }}>
          <TextField
            select
            label={t("currency", "Currency")}
            value={dicForm.strCurrencyCode}
            onChange={(objEvent) => updateRootField("strCurrencyCode", objEvent.target.value)}
            disabled={blnFieldDisabled}
            fullWidth
          >
            {(objFormOptions?.lstCurrencies ?? []).map((strCurrencyCode) => (
              <MenuItem key={strCurrencyCode} value={strCurrencyCode}>{strCurrencyCode}</MenuItem>
            ))}
          </TextField>
          <TextField
            type="date"
            label={t("effective_from", "Effective From")}
            value={dicForm.dtEffectiveFrom}
            onChange={(objEvent) => updateRootField("dtEffectiveFrom", objEvent.target.value)}
            InputLabelProps={{ shrink: true }}
            disabled={blnFieldDisabled}
            fullWidth
          />
          <TextField
            type="date"
            label={t("effective_to", "Effective To")}
            value={dicForm.dtEffectiveTo}
            onChange={(objEvent) => updateRootField("dtEffectiveTo", objEvent.target.value)}
            InputLabelProps={{ shrink: true }}
            disabled={blnFieldDisabled}
            fullWidth
          />
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 1.5 }}>
          <FormControlLabel
            control={<Switch checked={dicForm.blnIsDefault} onChange={(objEvent) => updateRootField("blnIsDefault", objEvent.target.checked)} disabled={blnFieldDisabled} />}
            label={t("default_structure", "Default Structure")}
          />
          <FormControlLabel
            control={<Switch checked={dicForm.blnIsActive} onChange={(objEvent) => updateRootField("blnIsActive", objEvent.target.checked)} disabled={blnFieldDisabled} />}
            label={t("active_structure", "Active Structure")}
          />
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
              3. {t("multilingual_text", "Multilingual Text")}
            </Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.9rem", mt: 0.4 }}>
              {t(
                "multilingual_text_help",
                "Maintain translated structure names and descriptions without exposing system fields."
              )}
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
            <Box
              key={dicText.strRowID}
              sx={{
                display: "grid",
                gap: 1.5,
                gridTemplateColumns: { xs: "1fr", lg: "220px 1fr 1.1fr auto" },
                alignItems: "start",
                border: "1px solid rgba(203,213,225,0.8)",
                borderRadius: "18px",
                p: 1.5,
                background: "#f8fafc"
              }}
            >
              <TextField
                select
                label={t("language", "Language")}
                value={dicText.intLanguageID}
                onChange={(objEvent) => updateTextRow(dicText.strRowID, "intLanguageID", Number(objEvent.target.value))}
                disabled
                fullWidth
              >
                {(objFormOptions?.lstLanguages ?? []).map((dicLanguage) => (
                  <MenuItem key={dicLanguage.intID} value={dicLanguage.intID}>{dicLanguage.strLabel}</MenuItem>
                ))}
              </TextField>
              <TextField
                label={t("structure_name", "Structure Name")}
                value={dicText.strStructureName}
                onChange={(objEvent) => updateTextRow(dicText.strRowID, "strStructureName", objEvent.target.value)}
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
                value={dicText.strStructureDescription}
                onChange={(objEvent) => updateTextRow(dicText.strRowID, "strStructureDescription", objEvent.target.value)}
                disabled={blnFieldDisabled}
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

      <Box>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 1.25 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
              4. {t("component_line_configuration", "Component Line Configuration")}
            </Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.9rem", mt: 0.4 }}>
              {t(
                "component_line_configuration_help",
                "Configure line order, value source, fixed or percentage rules, basis components, formula logic, range controls, and active flags in the same master-grid style."
              )}
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={handleAddLineRow} disabled={blnFieldDisabled} sx={{ borderRadius: "12px" }}>
            {t("add_line", "Add Line")}
          </Button>
        </Stack>

        <Box className={styles.tableCard}>
          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("line_order", "Line Order")}</th>
                  <th>{t("salary_component", "Salary Component")}</th>
                  <th>{t("value_source", "Value Source")}</th>
                  <th>{t("fixed_amount", "Fixed Amount")}</th>
                  <th>{t("percentage_value", "% Value")}</th>
                  <th>{t("basis_component", "Basis Component")}</th>
                  <th>{t("formula", "Formula")}</th>
                  <th>{t("min_amount", "Min")}</th>
                  <th>{t("max_amount", "Max")}</th>
                  <th>{t("mandatory", "Mandatory")}</th>
                  <th>{t("active", "Active")}</th>
                  <th>{t("action", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {dicForm.lstComponents.map((dicLine) => (
                  <tr key={dicLine.strRowID}>
                    <td>
                      <TextField
                        type="number"
                        size="small"
                        value={dicLine.intLineOrder}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "intLineOrder", Number(objEvent.target.value))}
                        disabled={blnFieldDisabled}
                        sx={{ minWidth: 110 }}
                      />
                    </td>
                    <td>
                      <TextField
                        select
                        size="small"
                        value={dicLine.intSalaryComponentID}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "intSalaryComponentID", parseOptionalSelectNumber(objEvent.target.value))}
                        disabled={blnFieldDisabled}
                        sx={{ minWidth: 220 }}
                      >
                        {(objFormOptions?.lstSalaryComponents ?? []).map((dicOption) => (
                          <MenuItem key={dicOption.intID} value={dicOption.intID}>
                            {dicOption.strCode ? `${dicOption.strCode} - ${dicOption.strLabel}` : dicOption.strLabel}
                          </MenuItem>
                        ))}
                      </TextField>
                    </td>
                    <td>
                      <TextField
                        select
                        size="small"
                        value={dicLine.strValueSource}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "strValueSource", objEvent.target.value)}
                        disabled={blnFieldDisabled}
                        sx={{ minWidth: 150 }}
                      >
                        {(objFormOptions?.lstValueSources ?? []).map((strValueSource) => (
                          <MenuItem key={strValueSource} value={strValueSource}>{strValueSource}</MenuItem>
                        ))}
                      </TextField>
                    </td>
                    <td>
                      <TextField
                        size="small"
                        value={dicLine.fltFixedAmount}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "fltFixedAmount", objEvent.target.value)}
                        disabled={blnFieldDisabled || dicLine.strValueSource !== "Fixed"}
                        sx={{ minWidth: 130 }}
                      />
                    </td>
                    <td>
                      <TextField
                        size="small"
                        value={dicLine.fltPercentageValue}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "fltPercentageValue", objEvent.target.value)}
                        disabled={blnFieldDisabled || dicLine.strValueSource !== "Percentage"}
                        sx={{ minWidth: 120 }}
                      />
                    </td>
                    <td>
                      <TextField
                        select
                        size="small"
                        value={dicLine.intBasisComponentID}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "intBasisComponentID", parseOptionalSelectNumber(objEvent.target.value))}
                        disabled={blnFieldDisabled || dicLine.strValueSource !== "Percentage"}
                        sx={{ minWidth: 210 }}
                      >
                        <MenuItem value="">{t("none", "None")}</MenuItem>
                        {dicForm.lstComponents
                          .filter((dicBasis) => dicBasis.strRowID !== dicLine.strRowID && dicBasis.intSalaryComponentID !== "")
                          .map((dicBasis) => (
                            <MenuItem key={dicBasis.strRowID} value={Number(dicBasis.intSalaryComponentID)}>
                              {dicBasis.strComponentCode ? `${dicBasis.strComponentCode} - ${dicBasis.strComponentName}` : dicBasis.strComponentName}
                            </MenuItem>
                          ))}
                      </TextField>
                    </td>
                    <td>
                      <TextField
                        size="small"
                        value={dicLine.strFormulaExpression}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "strFormulaExpression", objEvent.target.value)}
                        disabled={blnFieldDisabled || dicLine.strValueSource !== "Formula"}
                        sx={{ minWidth: 210 }}
                      />
                    </td>
                    <td>
                      <TextField
                        size="small"
                        value={dicLine.fltMinAmount}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "fltMinAmount", objEvent.target.value)}
                        disabled={blnFieldDisabled}
                        sx={{ minWidth: 120 }}
                      />
                    </td>
                    <td>
                      <TextField
                        size="small"
                        value={dicLine.fltMaxAmount}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "fltMaxAmount", objEvent.target.value)}
                        disabled={blnFieldDisabled}
                        sx={{ minWidth: 120 }}
                      />
                    </td>
                    <td>
                      <Switch
                        checked={dicLine.blnIsMandatory}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "blnIsMandatory", objEvent.target.checked)}
                        disabled={blnFieldDisabled}
                      />
                    </td>
                    <td>
                      <Switch
                        checked={dicLine.blnIsActive}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "blnIsActive", objEvent.target.checked)}
                        disabled={blnFieldDisabled}
                      />
                    </td>
                    <td>
                      <Button color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => handleRemoveLineRow(dicLine.strRowID)} disabled={blnFieldDisabled}>
                        {t("remove_button", "Remove")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Box>
      </Box>
    </Stack>
  );
}
