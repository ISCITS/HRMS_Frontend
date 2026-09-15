"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import styles from "@/components/master/MasterScreen.module.css";
import CommonEditModeBanner from "@/Common/components/CommonEditModeBanner";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useVersionLogLabels } from "@/features/version-logs/hooks/useVersionLogLabels";
import {
  createInitialVersionLogForm,
  toVersionLogFormValues,
  versionLogService
} from "@/features/version-logs/services/versionLogService";
import type { VersionLogFormValues } from "@/features/version-logs/types";

type VersionLogEditorPageProps = {
  strMode: "add" | "edit" | "view";
  intVersionLogID?: number;
};

const lstModuleCodes = ["VERSION_LOG", "VERSION_LOGS", "MASTER_VERSION_LOG", "VERSION_LOG_MASTER"];

function formatDateTime(strValue: string | null | undefined) {
  if (!strValue) {
    return "-";
  }
  const objDate = new Date(strValue);
  if (Number.isNaN(objDate.getTime())) {
    return strValue;
  }
  return objDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function VersionLogEditorPage({
  strMode,
  intVersionLogID
}: VersionLogEditorPageProps) {
  const objRouter = useRouter();
  const { t } = useVersionLogLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstModuleCodes);
  const [dicForm, setDicForm] = useState<VersionLogFormValues>(createInitialVersionLogForm());
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const [strAddedOn, setStrAddedOn] = useState<string | null>(null);
  const [strUpdatedOn, setStrUpdatedOn] = useState<string | null>(null);

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
      setStrSuccess("");
      try {
        if (strMode === "edit" && intVersionLogID) {
          const dicDetail = await versionLogService.getVersionLogById(intVersionLogID);
          if (!blnMounted) {
            return;
          }
          setDicForm(toVersionLogFormValues(dicDetail));
          setStrAddedOn(dicDetail.dtAddedOn);
          setStrUpdatedOn(dicDetail.dtUpdatedOn);
        } else {
          setDicForm(createInitialVersionLogForm());
          setStrAddedOn(null);
          setStrUpdatedOn(null);
        }
      } catch (objError) {
        if (blnMounted) {
          setStrError(objError instanceof Error ? objError.message : t("load_workspace_failed", "Unable to load version log workspace."));
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
  }, [blnCanLoadWorkspace, blnRightsLoading, intVersionLogID, strMode, t]);

  function updateField<TKey extends keyof VersionLogFormValues>(strField: TKey, objValue: VersionLogFormValues[TKey]) {
    setDicForm((dicPrevious) => ({ ...dicPrevious, [strField]: objValue }));
  }

  async function handleSave() {
    if (!blnCanSave) {
      return;
    }
    if (!dicForm.strVersionCode.trim() || !dicForm.strVersionName.trim()) {
      setStrError(t("validation_required_fields", "Version code and version name are required."));
      return;
    }
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicSavedRecord = strMode === "edit" && intVersionLogID
        ? await versionLogService.updateVersionLog(intVersionLogID, dicForm)
        : await versionLogService.createVersionLog(dicForm);
      setDicForm(toVersionLogFormValues(dicSavedRecord));
      setStrAddedOn(dicSavedRecord.dtAddedOn);
      setStrUpdatedOn(dicSavedRecord.dtUpdatedOn);
      setStrSuccess(
        strMode === "edit"
          ? t("update_success", "Version log updated successfully.")
          : t("create_success", "Version log created successfully.")
      );
      if (strMode === "add") {
        const strNextMode = blnCanEdit ? "edit" : "view";
        objRouter.push(`/version-logs/edit/${dicSavedRecord.intID}`);
      }
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("save_failed", "Unable to save version log."));
    } finally {
      setBlnSaving(false);
    }
  }

  if (blnLoading || blnRightsLoading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: "#64748b" }}>{t("loading_workspace", "Loading version log workspace...")}</Typography>
        </Stack>
      </Box>
    );
  }

  if (!blnCanLoadWorkspace) {
    return (
      <Box className={styles.emptyState}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
          {strMode === "add"
            ? t("access_denied_add", "Version log create access is not available for your user group.")
            : t("access_denied", "Version log access is not available for your user group.")}
        </Typography>
        <Typography sx={{ mt: 1, color: "#64748b" }}>
          {t("access_denied_help", "Contact your administrator if you need version log access.")}
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
          background: "linear-gradient(135deg, #f8fbff 0%, #f1fdf6 48%, #f8fafc 100%)"
        }}
      >
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: "1.7rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
                {strMode === "add"
                  ? t("add_title", "Add Version Log")
                  : blnReadOnly
                    ? t("view_title", "View Version Log")
                    : t("edit_title", "Edit Version Log")}
              </Typography>
              <Typography sx={{ color: "#64748b", mt: 0.75 }}>
                {t("subtitle", "Track release identity, launch date, and rollout notes in one audited master record.")}
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <Button
                controlId="version-logs.editor.back.button"
                className={styles.secondaryButton}
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => objRouter.push("/version-logs")}
                sx={{
                  height: 38,
                  minHeight: 38,
                  py: 0,
                  px: 1.5,
                  fontSize: "0.9rem",
                  whiteSpace: "nowrap"
                }}
              >
                {t("back_to_list", "Back to list")}
              </Button>
              {blnCanSave ? (
                <Button
                  controlId="version-logs.editor.save.button"
                  className={styles.primaryButton}
                  startIcon={<SaveRoundedIcon />}
                  onClick={handleSave}
                  disabled={blnSaving}
                  sx={{
                    height: 38,
                    minHeight: 38,
                    py: 0,
                    px: 1.75,
                    fontSize: "0.9rem",
                    whiteSpace: "nowrap"
                  }}
                >
                  {blnSaving ? t("saving", "Saving...") : t("save", "Save Version Log")}
                </Button>
              ) : null}
            </Stack>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <Paper sx={{ p: 2, borderRadius: "22px", flex: 1, background: "rgba(255,255,255,0.72)", border: "1px solid rgba(148,163,184,0.14)" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("release_date", "Release Date")}</Typography>
              <Typography sx={{ mt: 0.75, fontWeight: 800, color: "#0f172a" }}>
                {dicForm.dtReleaseDate || t("not_set", "Not set")}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, borderRadius: "22px", flex: 1, background: "rgba(255,255,255,0.72)", border: "1px solid rgba(148,163,184,0.14)" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("added_on", "Added On")}</Typography>
              <Typography sx={{ mt: 0.75, fontWeight: 800, color: "#0f172a" }}>
                {formatDateTime(strAddedOn)}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, borderRadius: "22px", flex: 1, background: "rgba(255,255,255,0.72)", border: "1px solid rgba(148,163,184,0.14)" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("updated_on", "Updated On")}</Typography>
              <Typography sx={{ mt: 0.75, fontWeight: 800, color: "#0f172a" }}>
                {formatDateTime(strUpdatedOn)}
              </Typography>
            </Paper>
          </Stack>
        </Stack>
      </Paper>

      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}
      <CommonEditModeBanner
        blnReadOnly={blnReadOnly}
        strReadOnlyMessage={t("read_only_mode", "You have view-only access for Version Logs.")}
      />

      <Paper
        sx={{
          borderRadius: "24px",
          p: { xs: 2, md: 3 },
          border: "1px solid rgba(187, 213, 232, 0.7)",
          boxShadow: "var(--app-shadow-soft)"
        }}
      >
        <Stack spacing={2.5}>
          <Box>
            <Typography sx={{ color: "#0f172a", fontWeight: 800, fontSize: "1.05rem" }}>{t("basic_information", "Basic Information")}</Typography>
            <Typography sx={{ color: "#64748b", mt: 0.5 }}>
              {t("basic_information_help", "Keep the version code stable, the display name readable, and attach concise release notes for downstream support teams.")}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
              gap: 2
            }}
          >
            <TextField
              controlId="version-logs.editor.version-code.input"
              inputProps={{ "controlId": "version-logs.editor.version-code.input" }}
              label={t("version_code", "Version Code")}
              value={dicForm.strVersionCode}
              onChange={(objEvent) => updateField("strVersionCode", objEvent.target.value.toUpperCase())}
              disabled={blnFieldDisabled}
              fullWidth
            />

            <TextField
              controlId="version-logs.editor.version-name.input"
              inputProps={{ "controlId": "version-logs.editor.version-name.input" }}
              label={t("version_name", "Version Name")}
              value={dicForm.strVersionName}
              onChange={(objEvent) => updateField("strVersionName", objEvent.target.value)}
              disabled={blnFieldDisabled}
              fullWidth
            />

            <TextField
              controlId="version-logs.editor.release-date.input"
              inputProps={{ "controlId": "version-logs.editor.release-date.input" }}
              label={t("release_date", "Release Date")}
              type="date"
              value={dicForm.dtReleaseDate}
              onChange={(objEvent) => updateField("dtReleaseDate", objEvent.target.value)}
              disabled={blnFieldDisabled}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <Box sx={{ display: "flex", alignItems: "center" }}>
              <FormControlLabel
                control={<ActiveStatusSwitch testId="version-logs.editor.active.switch" blnIsActive={dicForm.blnIsActive} onChange={(blnChecked) => updateField("blnIsActive", blnChecked)} disabled={blnFieldDisabled} />}
                label={dicForm.blnIsActive ? t("active", "Active") : t("inactive", "Inactive")}
              />
            </Box>

            <TextField
              controlId="version-logs.editor.release-notes.input"
              inputProps={{ "controlId": "version-logs.editor.release-notes.input" }}
              label={t("release_notes", "Release Notes")}
              value={dicForm.strReleaseNotes}
              onChange={(objEvent) => updateField("strReleaseNotes", objEvent.target.value)}
              disabled={blnFieldDisabled}
              fullWidth
              multiline
              minRows={6}
              sx={{ gridColumn: { xs: "1 / -1", md: "1 / -1" } }}
            />
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}
