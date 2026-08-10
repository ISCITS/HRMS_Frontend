"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, FormControlLabel, MenuItem, Snackbar, Switch, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";

import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useActionRights } from "@/features/security/hooks/useActionRights";
import { settingsService } from "@/features/settings/services/settingsService";
import type {
  ApplicationSettingDto,
  ApplicationSettingSaveRequest,
  SettingValueType,
} from "@/features/settings/types";

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };

type SearchForm = { name: string; value: string; status: "All" | "Active" | "Inactive" };

const dicEmptySearch: SearchForm = { name: "", value: "", status: "All" };

type EditForm = {
  intID: number | null;
  strSettingCode: string;
  strValueType: SettingValueType;
  strSettingValueText: string;
  strSettingValueNumber: string;
  blnSettingValueBoolean: boolean;
  strDescription: string;
  dtEffectiveFrom: string;
  dtEffectiveTo: string;
  blnIsActive: boolean;
};

const lstValueTypes: SettingValueType[] = ["TEXT", "NUMBER", "BOOLEAN", "JSON"];

const dicEmptyForm: EditForm = {
  intID: null,
  strSettingCode: "",
  strValueType: "TEXT",
  strSettingValueText: "",
  strSettingValueNumber: "",
  blnSettingValueBoolean: false,
  strDescription: "",
  dtEffectiveFrom: "",
  dtEffectiveTo: "",
  blnIsActive: true,
};

function prettifyCode(strCode: string): string {
  return (
    strCode
      .toLowerCase()
      .split("_")
      .filter(Boolean)
      .map((strWord) => strWord.charAt(0).toUpperCase() + strWord.slice(1))
      .join(" ") || "-"
  );
}

function displayValue(objSetting: ApplicationSettingDto): string {
  switch (objSetting.strValueType) {
    case "NUMBER":
      return objSetting.decSettingValueNumber != null ? String(objSetting.decSettingValueNumber) : "-";
    case "BOOLEAN":
      return objSetting.blnSettingValueBoolean ? "Yes" : "No";
    case "JSON":
      return objSetting.objSettingValueJson != null ? JSON.stringify(objSetting.objSettingValueJson) : "-";
    case "TEXT":
    default:
      return objSetting.strSettingValueText ?? "-";
  }
}

function toForm(objSetting: ApplicationSettingDto): EditForm {
  return {
    intID: objSetting.intID,
    strSettingCode: objSetting.strSettingCode,
    strValueType: objSetting.strValueType,
    strSettingValueText:
      objSetting.strValueType === "JSON"
        ? objSetting.objSettingValueJson != null
          ? JSON.stringify(objSetting.objSettingValueJson, null, 2)
          : ""
        : objSetting.strSettingValueText ?? "",
    strSettingValueNumber: objSetting.decSettingValueNumber != null ? String(objSetting.decSettingValueNumber) : "",
    blnSettingValueBoolean: Boolean(objSetting.blnSettingValueBoolean),
    strDescription: objSetting.strDescription ?? "",
    dtEffectiveFrom: objSetting.dtEffectiveFrom ?? "",
    dtEffectiveTo: objSetting.dtEffectiveTo ?? "",
    blnIsActive: objSetting.blnIsActive,
  };
}

// Leave Settings master screen: reuses the shared master-screen layout, row actions, and dialog so it
// matches the Designation master look-and-feel while editing tblapplication_setting LEAVE rows.
export default function LeaveSettingsPanel() {
  const { canDo, blnLoading: blnRightsLoading } = useActionRights();
  // Authorize against the Settings menu's own granular rights so the UI matches backend enforcement.
  const blnCanEdit = canDo("settings", "EDIT");

  const [lstSettings, setLstSettings] = useState<ApplicationSettingDto[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [dicForm, setDicForm] = useState<EditForm>(dicEmptyForm);
  const [blnIsNew, setBlnIsNew] = useState(false);

  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);

  // Filter values are committed only on Search/Clear so grid interactions stay predictable.
  const lstFilteredSettings = useMemo(() => {
    const strName = dicSearchApplied.name.trim().toLowerCase();
    const strValue = dicSearchApplied.value.trim().toLowerCase();
    return lstSettings.filter((objSetting) => {
      const blnNameMatch =
        !strName ||
        prettifyCode(objSetting.strSettingCode).toLowerCase().includes(strName) ||
        objSetting.strSettingCode.toLowerCase().includes(strName);
      const blnValueMatch = !strValue || displayValue(objSetting).toLowerCase().includes(strValue);
      const blnStatusMatch =
        dicSearchApplied.status === "All" ||
        (dicSearchApplied.status === "Active" ? objSetting.blnIsActive : !objSetting.blnIsActive);
      return blnNameMatch && blnValueMatch && blnStatusMatch;
    });
  }, [dicSearchApplied, lstSettings]);

  function showToast(strMessage: string, strSeverity: "success" | "error") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  async function loadSettings() {
    setBlnLoading(true);
    try {
      const lstResult = await settingsService.listLeaveSettings();
      setLstSettings(lstResult);
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  function openAdd() {
    setDicForm(dicEmptyForm);
    setBlnIsNew(true);
    setBlnDialogOpen(true);
  }

  function openEdit(objSetting: ApplicationSettingDto) {
    setDicForm(toForm(objSetting));
    setBlnIsNew(false);
    setBlnDialogOpen(true);
  }

  function updateForm<K extends keyof EditForm>(strKey: K, objValue: EditForm[K]) {
    setDicForm((dicPrev) => ({ ...dicPrev, [strKey]: objValue }));
  }

  function buildPayload(): ApplicationSettingSaveRequest | null {
    const strSettingCode = dicForm.strSettingCode.trim().toUpperCase();
    if (!strSettingCode) {
      showToast("Setting code is required.", "error");
      return null;
    }

    const objPayload: ApplicationSettingSaveRequest = {
      intID: dicForm.intID ?? undefined,
      strSettingCode,
      strValueType: dicForm.strValueType,
      strSettingValueText: null,
      decSettingValueNumber: null,
      blnSettingValueBoolean: null,
      objSettingValueJson: null,
      strDescription: dicForm.strDescription.trim() || null,
      dtEffectiveFrom: dicForm.dtEffectiveFrom || null,
      dtEffectiveTo: dicForm.dtEffectiveTo || null,
      blnIsActive: dicForm.blnIsActive,
    };

    if (dicForm.strValueType === "NUMBER") {
      const strRaw = dicForm.strSettingValueNumber.trim();
      if (strRaw === "" || Number.isNaN(Number(strRaw))) {
        showToast("A valid number value is required.", "error");
        return null;
      }
      objPayload.decSettingValueNumber = Number(strRaw);
    } else if (dicForm.strValueType === "BOOLEAN") {
      objPayload.blnSettingValueBoolean = dicForm.blnSettingValueBoolean;
    } else if (dicForm.strValueType === "JSON") {
      const strRaw = dicForm.strSettingValueText.trim();
      if (strRaw === "") {
        showToast("A JSON value is required.", "error");
        return null;
      }
      try {
        objPayload.objSettingValueJson = JSON.parse(strRaw);
      } catch {
        showToast("The JSON value is not valid.", "error");
        return null;
      }
    } else {
      objPayload.strSettingValueText = dicForm.strSettingValueText;
    }

    return objPayload;
  }

  async function handleSave() {
    const objPayload = buildPayload();
    if (!objPayload) return;
    setBlnSaving(true);
    try {
      await settingsService.saveLeaveSetting(objPayload);
      showToast("Leave setting saved successfully.", "success");
      setBlnDialogOpen(false);
      await loadSettings();
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    } finally {
      setBlnSaving(false);
    }
  }

  const blnBusy = blnLoading || blnRightsLoading;

  return (
    <Box className={styles.page}>
      <Box className={styles.controlsCard}>
        <Box className={styles.searchRow}>
          <TextField
            controlId="settings.leave.list.search-name.input"
            value={dicSearchDraft.name}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, name: objEvent.target.value }))}
            placeholder="Setting Name"
            fullWidth
          />
          <TextField
            controlId="settings.leave.list.search-value.input"
            value={dicSearchDraft.value}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, value: objEvent.target.value }))}
            placeholder="Setting Value"
            fullWidth
          />
          <TextField
            controlId="settings.leave.list.search-status.select"
            select
            label="Status"
            value={dicSearchDraft.status}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, status: objEvent.target.value as SearchForm["status"] }))}
            fullWidth
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Inactive">Inactive</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button
              controlId="settings.leave.list.search.button"
              className={styles.primaryButton}
              startIcon={<SearchRoundedIcon />}
              onClick={() => setDicSearchApplied(dicSearchDraft)}
              disabled={blnBusy}
            >
              Search
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button
              controlId="settings.leave.list.clear.button"
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicSearchDraft(dicEmptySearch);
                setDicSearchApplied(dicEmptySearch);
              }}
              disabled={blnBusy}
            >
              Clear
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 1.5 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1.05rem" }}>Setting</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.86rem", mt: 0.25 }}>
              Configure leave-module settings such as default approvers and the leave-year start.
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button controlId="settings.leave.refresh.button" className={styles.secondaryButton} startIcon={<RefreshRoundedIcon />} onClick={() => void loadSettings()} disabled={blnBusy}>
              Refresh
            </Button>
            {blnCanEdit ? (
              <Button controlId="settings.leave.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={openAdd} disabled={blnBusy}>
                Add Setting
              </Button>
            ) : null}
          </Box>
        </Box>

        <Box className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Actions</th>
                <th>Setting</th>
                <th>Type</th>
                <th>Value</th>
                <th>Effective From</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {lstFilteredSettings.length === 0 ? (
                <tr>
                  <td className={styles.emptyState} colSpan={6}>
                    No leave settings configured yet.
                  </td>
                </tr>
              ) : (
                lstFilteredSettings.map((objSetting) => (
                  <tr key={objSetting.intID}>
                    <td>
                      <CommonRowActions
                        testIdPrefix="settings.leave.row"
                        rowKey={objSetting.intID}
                        blnCanEdit={blnCanEdit}
                        onEdit={() => openEdit(objSetting)}
                      />
                    </td>
                    <td>
                      <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "0.9rem" }}>
                        {prettifyCode(objSetting.strSettingCode)}
                      </Typography>
                      <Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>
                        {objSetting.strSettingCode}
                        {objSetting.strDescription ? ` — ${objSetting.strDescription}` : ""}
                      </Typography>
                    </td>
                    <td>{objSetting.strValueType}</td>
                    <td style={{ maxWidth: 320, wordBreak: "break-word" }}>{displayValue(objSetting)}</td>
                    <td>{objSetting.dtEffectiveFrom ?? "-"}</td>
                    <td>
                      <span className={`${styles.statusPill} ${objSetting.blnIsActive ? styles.statusActive : styles.statusInactive}`}>
                        {objSetting.blnIsActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Box>
      </Box>

      <CommonMasterDialog
        blnOpen={blnDialogOpen}
        onClose={() => setBlnDialogOpen(false)}
        rootTestId="settings.leave.dialog"
        cancelButtonTestId="settings.leave.dialog.cancel.button"
        primaryButtonTestId="settings.leave.dialog.save.button"
        strTitle={blnIsNew ? "Add Leave Setting" : "Edit Leave Setting"}
        strSecondaryLabel="Cancel"
        strPrimaryLabel={blnSaving ? "Saving..." : "Save"}
        onPrimaryAction={() => void handleSave()}
        blnPrimaryDisabled={blnSaving || !blnCanEdit}
        titleSx={{ px: 2.25, py: 1.25, fontSize: "1rem", maxHeight: 50 }}
        paperSx={{ width: "min(640px, calc(100vw - 32px)) !important", maxWidth: "640px !important", m: 2 }}
        nodeTitleAction={
          <Box className={styles.switchRow} sx={{ minHeight: "auto", gap: 1, flexWrap: "nowrap" }}>
            <Typography className={styles.switchLabel}>Is Active</Typography>
            <ActiveStatusSwitch
              testId="settings.leave.dialog.active.switch"
              blnIsActive={dicForm.blnIsActive}
              onChange={(blnChecked) => updateForm("blnIsActive", blnChecked)}
            />
          </Box>
        }
        nodeContent={
          <Box sx={{ display: "grid", gap: 2, pt: 0.5 }}>
            <Box sx={{ display: "grid", gap: 1.6, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, alignItems: "start" }}>
              <TextField
                controlId="settings.leave.dialog.code.input"
                label="Setting Code"
                value={dicForm.strSettingCode}
                onChange={(objEvent) => updateForm("strSettingCode", objEvent.target.value)}
                disabled={!blnIsNew}
                helperText={blnIsNew ? "Stored uppercase, e.g. LEAVE_DEFAULT_APPROVER_SOURCE." : "Setting code cannot be changed."}
                fullWidth
              />
              <TextField
                controlId="settings.leave.dialog.type.select"
                select
                label="Value Type"
                value={dicForm.strValueType}
                onChange={(objEvent) => updateForm("strValueType", objEvent.target.value as SettingValueType)}
                fullWidth
              >
                {lstValueTypes.map((strType) => (
                  <MenuItem key={strType} value={strType}>
                    {strType}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            {dicForm.strValueType === "NUMBER" ? (
              <TextField
                controlId="settings.leave.dialog.value-number.input"
                label="Value"
                type="number"
                value={dicForm.strSettingValueNumber}
                onChange={(objEvent) => updateForm("strSettingValueNumber", objEvent.target.value)}
                fullWidth
              />
            ) : dicForm.strValueType === "BOOLEAN" ? (
              <FormControlLabel
                control={
                  <Switch
                    checked={dicForm.blnSettingValueBoolean}
                    onChange={(objEvent) => updateForm("blnSettingValueBoolean", objEvent.target.checked)}
                    inputProps={{ controlId: "settings.leave.dialog.value-boolean.switch" } as InputHTMLAttributes<HTMLInputElement>}
                  />
                }
                label={dicForm.blnSettingValueBoolean ? "Enabled" : "Disabled"}
              />
            ) : (
              <TextField
                controlId="settings.leave.dialog.value-text.input"
                label={dicForm.strValueType === "JSON" ? "Value (JSON)" : "Value"}
                value={dicForm.strSettingValueText}
                onChange={(objEvent) => updateForm("strSettingValueText", objEvent.target.value)}
                multiline={dicForm.strValueType === "JSON"}
                minRows={dicForm.strValueType === "JSON" ? 4 : 1}
                fullWidth
              />
            )}

            <TextField
              controlId="settings.leave.dialog.description.input"
              label="Description"
              value={dicForm.strDescription}
              onChange={(objEvent) => updateForm("strDescription", objEvent.target.value)}
              fullWidth
            />
            <Box sx={{ display: "grid", gap: 1.6, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
              <TextField
                controlId="settings.leave.dialog.effective-from.input"
                label="Effective From"
                type="date"
                value={dicForm.dtEffectiveFrom}
                onChange={(objEvent) => updateForm("dtEffectiveFrom", objEvent.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                controlId="settings.leave.dialog.effective-to.input"
                label="Effective To"
                type="date"
                value={dicForm.dtEffectiveTo}
                onChange={(objEvent) => updateForm("dtEffectiveTo", objEvent.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>
          </Box>
        }
      />

      <BlockingLoader blnOpen={blnBusy || blnSaving} strLabel={blnSaving ? "Processing..." : "Loading..."} intZIndex={1400} />

      <Snackbar
        open={objToast.blnOpen}
        autoHideDuration={3500}
        onClose={() => setObjToast((dicPrev) => ({ ...dicPrev, blnOpen: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          severity={objToast.strSeverity}
          variant="filled"
          sx={{ width: "100%" }}
          onClose={() => setObjToast((dicPrev) => ({ ...dicPrev, blnOpen: false }))}
        >
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
