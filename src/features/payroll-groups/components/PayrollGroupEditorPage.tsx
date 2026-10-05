"use client";

import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import styles from "@/components/master/MasterScreen.module.css";
import { authHelpers } from "@/lib/auth";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import {
  createInitialPayrollGroupForm,
  payrollGroupService,
  toPayrollGroupFormValues
} from "@/features/payroll-groups/services/payrollGroupService";
import type {
  PayrollGroupDetailRecord,
  PayrollGroupFormOptions,
  PayrollGroupFormValues,
  PayrollGroupTextFormValue
} from "@/features/payroll-groups/types";
import CommonEditModeBanner from "@/Common/components/CommonEditModeBanner";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type PayrollGroupEditorPageProps = {
  strMode: "add" | "edit" | "view";
  /** Public identifier from the URL. */
  strPayrollGroupID?: string;
  blnEmbedded?: boolean;
  onClose?: () => void;
  onSaved?: (dicRecord: PayrollGroupDetailRecord) => void;
  /** Embedded mode: the parent dialog renders the Active switch in its title, like Department master. */
  onActiveStateChange?: (dicState: { blnIsActive: boolean; blnDisabled: boolean }) => void;
};

const lstPayrollGroupModuleCodes = ["PAYROLL_GROUP", "PAYROLL_GROUPS", "MASTER_PAYROLL_GROUP"];

export type PayrollGroupEditorHandle = {
  save: () => void;
  setActive: (blnIsActive: boolean) => void;
};

const PayrollGroupEditorPage = forwardRef<PayrollGroupEditorHandle, PayrollGroupEditorPageProps>(function PayrollGroupEditorPage({
  strMode,
  strPayrollGroupID,
  blnEmbedded = false,
  onClose,
  onSaved,
  onActiveStateChange
}, ref) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("payroll-groups");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstPayrollGroupModuleCodes);
  const [objFormOptions, setObjFormOptions] = useState<PayrollGroupFormOptions | null>(null);
  const [dicForm, setDicForm] = useState<PayrollGroupFormValues>(createInitialPayrollGroupForm());
  const [objUsage, setObjUsage] = useState<PayrollGroupDetailRecord["dicUsage"]>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const [strNameError, setStrNameError] = useState("");
  const objNameInputRef = useRef<HTMLInputElement>(null);
  const [dicTextTranslationLoading, setDicTextTranslationLoading] = useState<Record<number, boolean>>({});
  const [dicLastTranslatedSourceByLanguage, setDicLastTranslatedSourceByLanguage] = useState<Record<number, string>>({});

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  // Rights decide the mode: a caller holding the edit right lands straight in an editable form,
  // a caller holding only view gets the same screen read-only. Nothing about the mode travels in
  // the URL, so there is no mode for a user to flip and no extra Edit click on the way in.
  const blnReadOnly = strMode === "add" ? !blnCanAdd : !blnCanEdit;
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
        const objOptions = await payrollGroupService.getFormOptions();
        if (!blnMounted) {
          return;
        }
        setObjFormOptions(objOptions);
        if ((strMode === "edit" || strMode === "view") && strPayrollGroupID) {
          const dicDetail = await payrollGroupService.getPayrollGroupById(strPayrollGroupID);
          if (!blnMounted) {
            return;
          }
          setDicForm(toPayrollGroupFormValues(dicDetail));
          setObjUsage(dicDetail.dicUsage);
        }
      } catch (objError) {
        if (blnMounted) {
          setStrError(objError instanceof Error ? objError.message : t("group_load_workspace_failed", "Unable to load payroll group."));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blnCanLoadWorkspace, blnRightsLoading, strPayrollGroupID, strMode]);

  // Fixed two-row multilingual structure (tenant primary + tenant secondary language),
  // matching every other master screen's pattern (see DepartmentMasterPanel.tsx) rather
  // than a free-form add/remove list.
  const intDefaultLanguageID =
    authHelpers.getLanguageID() ??
    objFormOptions?.lstLanguages[0]?.intID ??
    1;
  const intSecondaryLanguageID = authHelpers.getSecondaryLanguageID();

  function buildFixedLanguageRow(
    intLanguageID: number,
    strPayrollGroupName: string,
    lstExistingTexts: PayrollGroupTextFormValue[]
  ): PayrollGroupTextFormValue {
    const dicLanguage = (objFormOptions?.lstLanguages ?? []).find((dicItem) => dicItem.intID === intLanguageID);
    return {
      intLanguageID,
      strLanguageName: dicLanguage?.strLabel ?? "",
      strPayrollGroupName
    };
  }

  function ensureTenantLanguageRows(dicValues: PayrollGroupFormValues): PayrollGroupFormValues {
    const dicDefaultRow = buildFixedLanguageRow(intDefaultLanguageID, dicValues.strPayrollGroupName, dicValues.lstTexts);
    if (!intSecondaryLanguageID) {
      return {
        ...dicValues,
        intLanguageID: intDefaultLanguageID,
        lstTexts: [dicDefaultRow]
      };
    }
    const dicSecondaryExistingText = dicValues.lstTexts.find(
      (dicText) => Number(dicText.intLanguageID) === intSecondaryLanguageID
    );
    const dicSecondaryRow = buildFixedLanguageRow(
      intSecondaryLanguageID,
      dicSecondaryExistingText?.strPayrollGroupName ?? "",
      dicValues.lstTexts
    );
    return {
      ...dicValues,
      intLanguageID: intDefaultLanguageID,
      lstTexts: [dicDefaultRow, dicSecondaryRow]
    };
  }

  function updateField<TKey extends keyof PayrollGroupFormValues>(strField: TKey, objValue: PayrollGroupFormValues[TKey]) {
    setDicForm((dicPrevious) => ({ ...dicPrevious, [strField]: objValue }));
  }

  function syncPrimaryPayrollGroupName(strPayrollGroupName: string) {
    setDicForm((dicPrevious) => {
      const dicNext = ensureTenantLanguageRows(dicPrevious);
      return {
        ...dicNext,
        strPayrollGroupName,
        lstTexts: dicNext.lstTexts.map((dicText, intIndex) =>
          intIndex === 0 ? { ...dicText, strPayrollGroupName } : dicText
        )
      };
    });
  }

  function updateTextRow(intIndex: number, objValue: string) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstTexts: dicPrevious.lstTexts.map((dicText, intRowIndex) =>
        intRowIndex === intIndex ? { ...dicText, strPayrollGroupName: objValue } : dicText
      )
    }));
  }

  async function translateSecondaryLanguageRow() {
    if (!objFormOptions || !intSecondaryLanguageID || intSecondaryLanguageID === intDefaultLanguageID) {
      return;
    }
    const strSourceName = dicForm.strPayrollGroupName.trim();
    if (!strSourceName) {
      return;
    }
    const strLastTranslatedSource = (dicLastTranslatedSourceByLanguage[intSecondaryLanguageID] ?? "").trim();
    const dicSecondaryRow = dicForm.lstTexts[1];
    const blnShouldTranslate = !dicSecondaryRow?.strPayrollGroupName.trim() || strLastTranslatedSource !== strSourceName;
    if (!blnShouldTranslate) {
      return;
    }

    setDicTextTranslationLoading((dicPrevious) => ({ ...dicPrevious, [intSecondaryLanguageID]: true }));
    try {
      const strTranslatedName = await payrollGroupService.translatePayrollGroupText(
        strSourceName,
        intDefaultLanguageID,
        intSecondaryLanguageID
      );
      setDicForm((dicPrevious) => {
        const dicNext = ensureTenantLanguageRows(dicPrevious);
        return {
          ...dicNext,
          lstTexts: dicNext.lstTexts.map((dicText, intIndex) =>
            intIndex === 1 ? { ...dicText, strPayrollGroupName: strTranslatedName } : dicText
          )
        };
      });
      setDicLastTranslatedSourceByLanguage((dicPrevious) => ({ ...dicPrevious, [intSecondaryLanguageID]: strSourceName }));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("group_translate_failed", "Unable to translate payroll group name."));
    } finally {
      setDicTextTranslationLoading((dicPrevious) => ({ ...dicPrevious, [intSecondaryLanguageID]: false }));
    }
  }

  useEffect(() => {
    if (!objFormOptions || objFormOptions.lstLanguages.length === 0) {
      return;
    }
    setDicForm((dicPrevious) => ensureTenantLanguageRows(dicPrevious));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intDefaultLanguageID, intSecondaryLanguageID, objFormOptions?.lstLanguages.length]);

  async function handleSave() {
    if (!blnCanSave) {
      return;
    }
    if (!dicForm.strPayrollGroupName.trim()) {
      setStrError("");
      setStrNameError(t("group_validation_required_fields", "Payroll Group Name is required."));
      objNameInputRef.current?.focus();
      return;
    }
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicSavedRecord = strMode === "edit" && strPayrollGroupID
        ? await payrollGroupService.updatePayrollGroup(strPayrollGroupID, dicForm)
        : await payrollGroupService.createPayrollGroup(dicForm);
      setDicForm(toPayrollGroupFormValues(dicSavedRecord));
      setObjUsage(dicSavedRecord.dicUsage);
      setStrSuccess(
        strMode === "edit"
          ? t("group_update_success", "Payroll group updated successfully.")
          : t("group_create_success", "Payroll group created successfully.")
      );
      onSaved?.(dicSavedRecord);
      if (blnEmbedded) {
        return;
      }
      if (strMode === "add") {
        objRouter.push(`/masters/payroll-groups/edit/${dicSavedRecord.strRecordUUID}`);
      }
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("group_save_failed", "Unable to save payroll group."));
    } finally {
      setBlnSaving(false);
    }
  }

  useImperativeHandle(ref, () => ({
    save: () => {
      void handleSave();
    },
    setActive: (blnIsActive: boolean) => updateField("blnIsActive", blnIsActive)
  }));

  // Send the user straight to the first field that needs fixing.
  useEffect(() => {
    if (strNameError) {
      objNameInputRef.current?.focus();
    }
  }, [strNameError]);

  useEffect(() => {
    onActiveStateChange?.({ blnIsActive: dicForm.blnIsActive, blnDisabled: blnFieldDisabled });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dicForm.blnIsActive, blnFieldDisabled]);

  if (blnLoading || blnRightsLoading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: "#64748b" }}>{t("group_loading_workspace", "Loading payroll group...")}</Typography>
        </Stack>
      </Box>
    );
  }

  if (!blnCanLoadWorkspace) {
    return (
      <Box className={styles.emptyState}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
          {strMode === "add"
            ? t("group_access_denied_add", "You do not have access to add Payroll Groups.")
            : t("group_access_denied", "You do not have access to Payroll Groups.")}
        </Typography>
        <Typography sx={{ mt: 1, color: "#64748b" }}>
          {t("group_access_denied_help", "Contact your administrator if you believe this is a mistake.")}
        </Typography>
        {strRightsError ? <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
      </Box>
    );
  }

  const nodeFormContent = (
    <>
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess && !blnEmbedded ? <Alert severity="success">{strSuccess}</Alert> : null}
      <CommonEditModeBanner
        blnReadOnly={blnReadOnly}
        strReadOnlyMessage={t("group_read_only_mode", "You have view-only access to Payroll Groups.")}
      />

      <Box sx={{ display: "grid", gap: "12px" }}>
        {!blnEmbedded ? (
          <FormControlLabel
            control={<ActiveStatusSwitch testId="payroll-groups.editor.active.switch" blnIsActive={dicForm.blnIsActive} onChange={(blnChecked) => updateField("blnIsActive", blnChecked)} disabled={blnFieldDisabled} />}
            label={dicForm.blnIsActive ? t("active", "Active") : t("inactive", "Inactive")}
            sx={{ m: 0, gap: 1, color: "#0f172a", "& .MuiFormControlLabel-label": { fontWeight: 700 } }}
          />
        ) : null}
        <Box sx={{ display: "grid", columnGap: 1.6, rowGap: "12px", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, alignItems: "start" }}>
          {strMode === "add" ? (
            <Box sx={{ gridColumn: "1 / -1" }}>
              <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{t("basic_information", "Basic Information")}</Typography>
              <Typography sx={{ fontSize: "11px", color: "#64748b", mt: 0.25, mb: 1 }}>
                {t("group_basic_information_help", "Give this payroll group a clear, business-friendly name.")}
              </Typography>
            </Box>
          ) : null}
          <TextField
            className="app-mui-text-field"
            controlId="payroll-groups.editor.name.input"
            label={t("payroll_group_name", "Payroll Group Name")}
            placeholder={t("group_name_placeholder", "Enter payroll group name")}
            size="small"
            required
            autoFocus={!blnFieldDisabled}
            inputRef={objNameInputRef}
            error={Boolean(strNameError)}
            helperText={strNameError || undefined}
            value={dicForm.strPayrollGroupName}
            onChange={(objEvent) => {
              setStrError("");
              setStrNameError("");
              syncPrimaryPayrollGroupName(objEvent.target.value);
            }}
            disabled={blnFieldDisabled}
            fullWidth
          />
          <TextField
            className="app-mui-text-field"
            controlId="payroll-groups.editor.description.input"
            label={t("description", "Description")}
            placeholder={t("group_description_placeholder", "e.g. Staff, Worker, Consultant")}
            size="small"
            value={dicForm.strDescription}
            onChange={(objEvent) => updateField("strDescription", objEvent.target.value)}
            disabled={blnFieldDisabled}
            fullWidth
          />
        </Box>

        {objUsage ? (
          <Typography sx={{ color: "#64748b", fontSize: "12px" }}>
            {t(
              "group_usage_summary",
              `Used by ${objUsage.intPayrollCycleCount} payroll schedule(s) and ${objUsage.intEmployeeCount} employee(s).`
            )}
          </Typography>
        ) : null}

        {intSecondaryLanguageID && dicForm.lstTexts.length > 1 ? (
          <Box sx={{ border: "1px solid #e3edfc", borderRadius: "6px", overflow: "hidden", background: "#f7faff" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", p: 1, borderBottom: "1px solid #e3edfc", background: "#eff6ff" }}>
              <LanguageRoundedIcon sx={{ color: "#1473cf" }} />
              <Box sx={{ flex: 1, minWidth: 180 }}>
                <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{t("language_translations", "Language Translations")}</Typography>
                <Typography sx={{ color: "#64748b", fontSize: "11px", mt: 0.25 }}>
                  {t("group_multilingual_text_help", "Provide translated payroll group names for the application languages you want to support.")}
                </Typography>
              </Box>
              <Tooltip title={t("translate_help", "Generate suggested translations using AI. Review before saving.")} arrow>
                <span>
                  <Button
                    controlId="payroll-groups.editor.translate.button"
                    className={styles.secondaryButton}
                    variant="outlined"
                    startIcon={<AutoAwesomeRoundedIcon />}
                    onClick={() => void translateSecondaryLanguageRow()}
                    disabled={blnFieldDisabled || !dicForm.strPayrollGroupName.trim() || Boolean(dicTextTranslationLoading[intSecondaryLanguageID])}
                    sx={{ minHeight: 34, whiteSpace: "nowrap", background: "#fff" }}
                  >
                    {t("translate", "AI Translate")}
                  </Button>
                </span>
              </Tooltip>
            </Box>
            <Box sx={{ display: "grid", gap: 1.5, p: 1 }}>
              {dicForm.lstTexts.slice(1).map((dicText, intOffset) => {
                const intIndex = intOffset + 1;
                const strLanguageLabel = (objFormOptions?.lstLanguages ?? []).find((dicLanguage) => dicLanguage.intID === Number(dicText.intLanguageID))?.strLabel ?? dicText.strLanguageName ?? "";
                return (
                  <Box key={dicText.intLanguageID || intIndex} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(100px, 0.3fr) minmax(0, 1fr)" }, alignItems: "center", gap: 1.5 }}>
                    <Typography component="label" htmlFor={`payroll-group-translation-${intIndex}`} sx={{ fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>
                      {strLanguageLabel}
                    </Typography>
                    <TextField
                      className="app-mui-text-field"
                      id={`payroll-group-translation-${intIndex}`}
                      placeholder={t("group_translated_name_placeholder", "Enter payroll group name in {language}").replace("{language}", strLanguageLabel)}
                      value={dicText.strPayrollGroupName}
                      inputProps={{ "controlId": "payroll-groups.editor.translated-name.input", "data-row-key": intIndex }}
                      onChange={(objEvent) => updateTextRow(intIndex, objEvent.target.value)}
                      disabled={blnFieldDisabled}
                      InputProps={{
                        endAdornment: dicTextTranslationLoading[Number(dicText.intLanguageID)]
                          ? (
                              <InputAdornment position="end">
                                <CircularProgress size={18} sx={{ color: "#2563eb" }} />
                              </InputAdornment>
                            )
                          : undefined,
                      }}
                      fullWidth
                    />
                  </Box>
                );
              })}
            </Box>
          </Box>
        ) : null}
      </Box>
    </>
  );

  if (blnEmbedded) {
    return (
      <Stack spacing={1.5} sx={{ pr: 0.5 }}>
        {nodeFormContent}
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5} sx={{ height: "100%", overflow: "auto", pr: 0.5 }}>
      <Paper
        sx={{
          borderRadius: "var(--app-card-radius)",
          p: "10px",
          border: "1px solid rgba(148,163,184,0.18)",
          background: "linear-gradient(135deg, #f8fbff 0%, #eef7f4 48%, #f8fafc 100%)"
        }}
      >
        <Stack spacing={1.25}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: "1.7rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
                {strMode === "add"
                  ? t("group_add_title", "Add Payroll Group")
                  : blnReadOnly
                    ? t("group_view_title", "View Payroll Group")
                    : t("group_edit_title", "Edit Payroll Group")}
              </Typography>
              <Typography sx={{ color: "#64748b", mt: 0.75 }}>
                {t("group_subtitle", "Group employees for payroll processing and scheduling.")}
              </Typography>
            </Box>
            <Stack spacing={1.25} alignItems={{ xs: "flex-start", md: "flex-end" }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                <Button
                  controlId="payroll-groups.editor.back.button"
                  className={styles.secondaryButton}
                  startIcon={<ArrowBackRoundedIcon />}
                  onClick={() => onClose ? onClose() : objRouter.push("/masters/payroll-groups")}
                  sx={{ height: 38, minHeight: 38, py: 0, px: 1.5, fontSize: "0.9rem", whiteSpace: "nowrap" }}
                >
                  {t("group_back_to_list", "Back to List")}
                </Button>
                {blnCanSave ? (
                  <Button
                    controlId="payroll-groups.editor.save.button"
                    className={styles.primaryButton}
                    startIcon={<SaveRoundedIcon />}
                    onClick={handleSave}
                    disabled={blnSaving}
                    sx={{ height: 38, minHeight: 38, py: 0, px: 1.75, fontSize: "0.9rem", whiteSpace: "nowrap" }}
                  >
                    {blnSaving ? t("group_saving", "Saving...") : t("group_save", "Save")}
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {nodeFormContent}
    </Stack>
  );
});

export default PayrollGroupEditorPage;
