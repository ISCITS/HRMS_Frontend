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
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import styles from "@/components/master/MasterScreen.module.css";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import {
  createInitialPayrollGroupForm,
  payrollGroupService,
  toPayrollGroupFormValues
} from "@/features/payroll-groups/services/payrollGroupService";
import type {
  PayrollGroupDetailRecord,
  PayrollGroupFormOptions,
  PayrollGroupFormValues
} from "@/features/payroll-groups/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type PayrollGroupEditorPageProps = {
  strMode: "add" | "edit" | "view";
  intPayrollGroupID?: number;
};

const lstPayrollGroupModuleCodes = ["PAYROLL_GROUP", "PAYROLL_GROUPS", "MASTER_PAYROLL_GROUP"];

export default function PayrollGroupEditorPage({
  strMode,
  intPayrollGroupID
}: PayrollGroupEditorPageProps) {
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

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnForcedView = strMode === "view";
  const blnReadOnly = blnForcedView || (strMode === "edit" && blnCanView && !blnCanEdit);
  const blnCanLoadWorkspace = strMode === "add" ? blnCanAdd : blnCanView;
  const blnCanSave = !blnForcedView && (strMode === "add" ? blnCanAdd : blnCanEdit);
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
        if ((strMode === "edit" || strMode === "view") && intPayrollGroupID) {
          const dicDetail = await payrollGroupService.getPayrollGroupById(intPayrollGroupID);
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
  }, [blnCanLoadWorkspace, blnRightsLoading, intPayrollGroupID, strMode]);

  const lstUsedLanguageIDs = useMemo(
    () => new Set(dicForm.lstTexts.map((dicText) => dicText.intLanguageID)),
    [dicForm.lstTexts]
  );
  const lstAvailableLanguages = useMemo(
    () => (objFormOptions?.lstLanguages ?? []).filter((dicLanguage) => dicLanguage.intID !== 1),
    [objFormOptions]
  );

  function updateField<TKey extends keyof PayrollGroupFormValues>(strField: TKey, objValue: PayrollGroupFormValues[TKey]) {
    setDicForm((dicPrevious) => ({ ...dicPrevious, [strField]: objValue }));
  }

  function addTextRow() {
    const dicNextLanguage = lstAvailableLanguages.find((dicLanguage) => !lstUsedLanguageIDs.has(dicLanguage.intID));
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstTexts: [...dicPrevious.lstTexts, { intLanguageID: dicNextLanguage?.intID ?? "", strPayrollGroupName: "" }]
    }));
  }

  function removeTextRow(intIndex: number) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstTexts: dicPrevious.lstTexts.filter((_, intRowIndex) => intRowIndex !== intIndex)
    }));
  }

  function updateTextRow(intIndex: number, strField: "intLanguageID" | "strPayrollGroupName", objValue: number | string) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstTexts: dicPrevious.lstTexts.map((dicText, intRowIndex) =>
        intRowIndex === intIndex ? { ...dicText, [strField]: objValue } : dicText
      )
    }));
  }

  async function handleSave() {
    if (!blnCanSave) {
      return;
    }
    if (!dicForm.strPayrollGroupName.trim()) {
      setStrError(t("group_validation_required_fields", "Payroll Group Name is required."));
      return;
    }
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicSavedRecord = strMode === "edit" && intPayrollGroupID
        ? await payrollGroupService.updatePayrollGroup(intPayrollGroupID, dicForm)
        : await payrollGroupService.createPayrollGroup(dicForm);
      setDicForm(toPayrollGroupFormValues(dicSavedRecord));
      setObjUsage(dicSavedRecord.dicUsage);
      setStrSuccess(
        strMode === "edit"
          ? t("group_update_success", "Payroll group updated successfully.")
          : t("group_create_success", "Payroll group created successfully.")
      );
      if (strMode === "add") {
        objRouter.push(`/masters/payroll-groups/edit/${dicSavedRecord.intID}`);
      }
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("group_save_failed", "Unable to save payroll group."));
    } finally {
      setBlnSaving(false);
    }
  }

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
                {strMode === "view"
                  ? t("group_view_title", "View Payroll Group")
                  : strMode === "edit"
                    ? t("group_edit_title", "Edit Payroll Group")
                    : t("group_add_title", "Add Payroll Group")}
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
                  onClick={() => objRouter.push("/masters/payroll-groups")}
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

      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}
      {blnReadOnly ? <Alert severity="info">{t("group_read_only_mode", "You have view-only access to Payroll Groups.")}</Alert> : null}

      <Paper
        sx={{
          borderRadius: "var(--app-card-radius)",
          p: "10px",
          border: "1px solid rgba(187, 213, 232, 0.7)",
          boxShadow: "var(--app-shadow-soft)"
        }}
      >
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "flex-start" }} spacing={1.5}>
            <Box>
              <Typography sx={{ color: "#0f172a", fontWeight: 800, fontSize: "1.05rem" }}>{t("basic_information", "Basic Information")}</Typography>
              <Typography sx={{ color: "#64748b", mt: 0.5 }}>
                {t("group_basic_information_help", "Give this payroll group a clear, business-friendly name.")}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", alignItems: { xs: "flex-start", md: "flex-end" } }}>
              <FormControlLabel
                control={<ActiveStatusSwitch testId="payroll-groups.editor.active.switch" blnIsActive={dicForm.blnIsActive} onChange={(blnChecked) => updateField("blnIsActive", blnChecked)} disabled={blnFieldDisabled} />}
                label={dicForm.blnIsActive ? t("active", "Active") : t("inactive", "Inactive")}
                sx={{ m: 0, gap: 1, color: "#0f172a", "& .MuiFormControlLabel-label": { fontWeight: 700 } }}
              />
              <Typography sx={{ color: "#64748b", fontSize: "0.78rem", mt: 0.25, textAlign: { xs: "left", md: "right" } }}>
                {t("active_help", "Inactive groups cannot be assigned to new payroll schedules or employees.")}
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 1.25 }}>
            <TextField
              controlId="payroll-groups.editor.name.input"
              label={t("payroll_group_name", "Payroll Group Name")}
              required
              value={dicForm.strPayrollGroupName}
              onChange={(objEvent) => updateField("strPayrollGroupName", objEvent.target.value)}
              disabled={blnFieldDisabled}
              fullWidth
            />
            <TextField
              controlId="payroll-groups.editor.description.input"
              label={t("description", "Description")}
              placeholder={t("group_description_placeholder", "e.g. Staff, Worker, Consultant, Factory Payroll")}
              value={dicForm.strDescription}
              onChange={(objEvent) => updateField("strDescription", objEvent.target.value)}
              disabled={blnFieldDisabled}
              multiline
              minRows={1}
              maxRows={3}
              fullWidth
            />
          </Box>

          {objUsage ? (
            <Box sx={{ border: "1px dashed rgba(148,163,184,0.5)", borderRadius: "12px", p: 1.1, background: "#f8fafc" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                {t("usage_information", "Usage Information")}
              </Typography>
              <Typography sx={{ mt: 0.5, color: "#0f172a", fontWeight: 700 }}>
                {t(
                  "group_usage_summary",
                  `Used by ${objUsage.intPayrollCycleCount} payroll schedule(s) and ${objUsage.intEmployeeCount} employee(s).`
                )}
              </Typography>
            </Box>
          ) : null}
        </Stack>
      </Paper>

      <Paper
        sx={{
          borderRadius: "var(--app-card-radius)",
          p: "10px",
          border: "1px solid rgba(187, 213, 232, 0.7)",
          boxShadow: "var(--app-shadow-soft)"
        }}
      >
        <Stack spacing={1.25}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, gap: 1.25, flexWrap: "wrap" }}>
            <Box>
              <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("multilingual_text", "Multilingual Text")}</Typography>
              <Typography sx={{ color: "#64748b", fontSize: "0.86rem", mt: 0.25 }}>
                {t("group_multilingual_text_help", "Add translated payroll group names for other languages.")}
              </Typography>
            </Box>
            {!blnFieldDisabled && lstAvailableLanguages.some((dicLanguage) => !lstUsedLanguageIDs.has(dicLanguage.intID)) ? (
              <Button
                controlId="payroll-groups.editor.add-language.button"
                className={styles.secondaryButton}
                startIcon={<AddRoundedIcon />}
                onClick={addTextRow}
                sx={{ minHeight: 34 }}
              >
                {t("add_language", "Add Language")}
              </Button>
            ) : null}
          </Box>

          {dicForm.lstTexts.length === 0 ? (
            <Typography sx={{ color: "#94a3b8", fontSize: "0.85rem" }}>
              {t("group_no_translations", "No additional language translations added yet.")}
            </Typography>
          ) : (
            <Box sx={{ display: "grid", gap: 1.2 }}>
              {dicForm.lstTexts.map((dicText, intIndex) => (
                <Box
                  key={`${dicText.intLanguageID}-${intIndex}`}
                  sx={{
                    display: "grid",
                    gap: 1.2,
                    gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 0.9fr) minmax(0, 1.5fr) auto" },
                    alignItems: "center",
                    border: "1px solid rgba(203,213,225,0.8)",
                    borderRadius: "16px",
                    p: 1.2,
                    background: "#f8fafc",
                  }}
                >
                  <TextField
                    select
                    label={t("language", "Language")}
                    value={dicText.intLanguageID}
                    inputProps={{ "controlId": "payroll-groups.editor.language.select", "data-row-key": intIndex }}
                    onChange={(objEvent) => updateTextRow(intIndex, "intLanguageID", Number(objEvent.target.value))}
                    disabled={blnFieldDisabled}
                    fullWidth
                  >
                    {lstAvailableLanguages
                      .filter((dicLanguage) => dicLanguage.intID === dicText.intLanguageID || !lstUsedLanguageIDs.has(dicLanguage.intID))
                      .map((dicLanguage) => (
                        <MenuItem key={dicLanguage.intID} value={dicLanguage.intID}>{dicLanguage.strLabel}</MenuItem>
                      ))}
                  </TextField>
                  <TextField
                    label={t("payroll_group_name", "Payroll Group Name")}
                    value={dicText.strPayrollGroupName}
                    inputProps={{ "controlId": "payroll-groups.editor.translated-name.input", "data-row-key": intIndex }}
                    onChange={(objEvent) => updateTextRow(intIndex, "strPayrollGroupName", objEvent.target.value)}
                    disabled={blnFieldDisabled}
                    fullWidth
                  />
                  {!blnFieldDisabled ? (
                    <IconButton
                      controlId="payroll-groups.editor.remove-language.button"
                      data-row-key={intIndex}
                      onClick={() => removeTextRow(intIndex)}
                      aria-label={t("remove", "Remove")}
                      sx={{ color: "#dc2626" }}
                    >
                      <DeleteOutlineRoundedIcon />
                    </IconButton>
                  ) : null}
                </Box>
              ))}
            </Box>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
