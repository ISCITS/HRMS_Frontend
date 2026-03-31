"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ToggleOnRoundedIcon from "@mui/icons-material/ToggleOnRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import UserGroupMasterDialog from "@/features/security/components/UserGroupMasterDialog";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import styles from "@/components/master/MasterScreen.module.css";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { authHelpers } from "@/lib/auth";
import type { UserGroupFormPayload, UserGroupRecord, UserGroupRightSaveItem } from "@/models/SecurityModels";
import { securityApiService } from "@/features/security/services/securityApiService";

type FormMode = "add" | "edit" | "view";
type ConfirmDialogState = {
  strTitle: string;
  strMessage: string;
  strConfirmLabel: string;
  fnOnConfirm: () => Promise<void>;
};

const objEmptyForm: UserGroupFormPayload = {
  strGroupCode: "",
  strGroupName: "",
  strGroupDescription: "",
  intCompanyID: authHelpers.getCompanyID(),
  blnIsActive: true,
  intLanguageID: authHelpers.getLanguageID() ?? 1,
};

function mapRecordToForm(objRecord: UserGroupRecord): UserGroupFormPayload {
  return {
    strGroupCode: objRecord.strGroupCode,
    strGroupName: objRecord.strGroupName,
    strGroupDescription: objRecord.strGroupDescription ?? "",
    intCompanyID: objRecord.intCompanyID,
    blnIsActive: objRecord.blnIsActive,
    intLanguageID: authHelpers.getLanguageID() ?? 1,
  };
}

export default function UserGroupMasterScreen() {
  const { t } = useModuleLabels("user_group");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(["USER_GROUP", "USER_GROUPS"]);
  const [lstRecords, setLstRecords] = useState<UserGroupRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strSearch, setStrSearch] = useState("");
  const [dicSearchDraft, setDicSearchDraft] = useState({ code: "", name: "", status: "All" as "All" | "Active" | "Inactive" });
  const [dicSearchApplied, setDicSearchApplied] = useState({ code: "", name: "", status: "All" as "All" | "Active" | "Inactive" });
  const [lstSelectedIds, setLstSelectedIds] = useState<number[]>([]);
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strMode, setStrMode] = useState<FormMode>("add");
  const [intEditingID, setIntEditingID] = useState<number | null>(null);
  const [objForm, setObjForm] = useState<UserGroupFormPayload>(objEmptyForm);
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objToast, setObjToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });
  const dicLabels = {
    searchNamePlaceholder: t("search_name_placeholder", "Search group name"),
    searchCodePlaceholder: t("search_code_placeholder", "Search group code"),
    searchStatusLabel: t("search_status_label", "Status"),
    searchStatusAll: t("search_status_all", "All"),
    searchStatusActive: t("search_status_active", "Active"),
    searchStatusInactive: t("search_status_inactive", "Inactive"),
    searchButton: t("search_button", "Search"),
    clearButton: t("clear_button", "Clear"),
    cancelButton: t("cancel_button", "Cancel"),
    addButton: t("add_button", "Add User Group"),
    exportExcelButton: t("export_excel_button", "Export Excel"),
    exportPdfButton: t("export_pdf_button", "Export PDF"),
    quickSearchPlaceholder: t("quick_search_placeholder", "Quick search"),
    accessUnavailableTitle: t("access_unavailable_title", "User group access is not available for your user group"),
    accessUnavailableMessage: t("access_unavailable_message", "Contact your administrator if you need user group visibility."),
    emptyTitle: t("empty_title", "No user groups found"),
    emptyMessage: t("empty_message", "Add the first user group to start assigning dynamic menu and action rights from `tblmenu` and `tblaction`."),
    tableActions: t("table_actions", "Actions"),
    tableCode: t("table_code", "Code"),
    tableName: t("table_name", "Name"),
    tableDescription: t("table_description", "Description"),
    tableIsActive: t("table_is_active", "Is Active"),
    statusActive: t("status_active", "Active"),
    statusInactive: t("status_inactive", "Inactive"),
    noDescription: t("no_description", "No description configured."),
    loading: t("loading", "Loading user groups..."),
    processing: t("processing", "Processing..."),
    errorLoad: t("error_load", "Unable to load user groups."),
    validationRequired: t("validation_group_code_name_required", "Group code and group name are required."),
    saveSuccess: t("save_success", "User group and rights saved successfully."),
    updateSuccess: t("update_success", "User group updated successfully."),
    errorSave: t("error_save", "Unable to save user group."),
    statusUpdateSuccess: t("status_update_success", "User group status updated successfully."),
    statusUpdateError: t("status_update_error", "Unable to update status."),
    confirmActivateTitle: t("confirm_activate_title", "Activate User Group"),
    confirmDeactivateTitle: t("confirm_deactivate_title", "Deactivate User Group"),
    confirmActivateMessage: t("confirm_activate_message", "Are you sure you want to mark this user group as active?"),
    confirmDeactivateMessage: t("confirm_deactivate_message", "Are you sure you want to mark this user group as inactive?"),
    confirmActivateLabel: t("confirm_activate_label", "Activate"),
    confirmDeactivateLabel: t("confirm_deactivate_label", "Deactivate"),
    confirmButton: t("confirm_button", "Confirm"),
    exportTitle: t("export_title", "User Groups"),
    exportFileName: t("export_file_name", "user_groups.csv"),
  };

  function openConfirmDialog(objDialog: ConfirmDialogState) {
    setObjConfirmDialog(objDialog);
  }

  function closeConfirmDialog() {
    setObjConfirmDialog(null);
  }

  async function executeConfirmedAction() {
    if (!objConfirmDialog) {
      return;
    }
    setBlnSaving(true);
    try {
      await objConfirmDialog.fnOnConfirm();
    } catch (objError) {
      setObjToast({
        open: true,
        message: objError instanceof Error ? objError.message : dicLabels.statusUpdateError,
        severity: "error",
      });
    } finally {
      setBlnSaving(false);
      closeConfirmDialog();
    }
  }

  async function loadUserGroups() {
    if (!canViewAny()) {
      setLstRecords([]);
      setLstSelectedIds([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      const objResult = await securityApiService.listUserGroups();
      setLstRecords(objResult.Data);
      setLstSelectedIds([]);
    } catch (objError) {
      setObjToast({
        open: true,
        message: objError instanceof Error ? objError.message : dicLabels.errorLoad,
        severity: "error",
      });
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }
    if (!canViewAny()) {
      setLstRecords([]);
      setLstSelectedIds([]);
      setBlnLoading(false);
      return;
    }
    loadUserGroups().catch(() => undefined);
  }, [blnRightsLoading]);

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanExport = canDoAny("export");
  const blnCanChangeStatus = canDoAny("edit");
  const blnReadOnly = isReadOnly();

  const lstFilteredRecords = useMemo(() => {
    return lstRecords.filter((objRecord) => {
      const blnCodeMatch = !dicSearchApplied.code || objRecord.strGroupCode.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
      const blnNameMatch =
        !dicSearchApplied.name ||
        [objRecord.strGroupName, objRecord.strGroupDescription ?? ""].join(" ").toLowerCase().includes(dicSearchApplied.name.toLowerCase());
      const blnStatusMatch =
        dicSearchApplied.status === "All" ||
        (dicSearchApplied.status === "Active" ? objRecord.blnIsActive : !objRecord.blnIsActive);
      return blnCodeMatch && blnNameMatch && blnStatusMatch;
    });
  }, [dicSearchApplied, lstRecords]);

  const lstVisibleRecords = useMemo(() => {
    const strNeedle = strSearch.trim().toLowerCase();
    if (!strNeedle) {
      return lstFilteredRecords;
    }
    return lstFilteredRecords.filter((objRecord) =>
      [objRecord.strGroupCode, objRecord.strGroupName, objRecord.strGroupDescription ?? ""].join(" ").toLowerCase().includes(strNeedle),
    );
  }, [lstFilteredRecords, strSearch]);

  const blnAllVisibleSelected = lstVisibleRecords.length > 0 && lstVisibleRecords.every((objRecord) => lstSelectedIds.includes(objRecord.intID));
  const blnSomeVisibleSelected = !blnAllVisibleSelected && lstSelectedIds.some((intID) => lstVisibleRecords.some((objRecord) => objRecord.intID === intID));

  function toggleSelection(intUserGroupID: number) {
    setLstSelectedIds((lstPrevious) =>
      lstPrevious.includes(intUserGroupID)
        ? lstPrevious.filter((intID) => intID !== intUserGroupID)
        : [...lstPrevious, intUserGroupID],
    );
  }

  function toggleSelectAll() {
    if (blnAllVisibleSelected) {
      setLstSelectedIds((lstPrevious) => lstPrevious.filter((intID) => !lstVisibleRecords.some((objRecord) => objRecord.intID === intID)));
      return;
    }
    setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstVisibleRecords.map((objRecord) => objRecord.intID)])]);
  }

  function downloadCsv() {
    const lstHeaders = [dicLabels.tableCode, dicLabels.tableName, dicLabels.tableDescription, dicLabels.tableIsActive];
    const lstRows = [
      lstHeaders.join(","),
      ...lstVisibleRecords.map((objRecord) =>
        [
          objRecord.strGroupCode,
          objRecord.strGroupName,
          objRecord.strGroupDescription ?? "",
          objRecord.blnIsActive ? dicLabels.statusActive : dicLabels.statusInactive
        ]
          .map((strValue) => `"${String(strValue).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ];
    const objBlob = new Blob([lstRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const strUrl = URL.createObjectURL(objBlob);
    const objLink = document.createElement("a");
    objLink.href = strUrl;
    objLink.download = dicLabels.exportFileName;
    objLink.click();
    URL.revokeObjectURL(strUrl);
  }

  function exportPdf() {
    const objWindow = window.open("", "_blank", "width=1200,height=800");
    if (!objWindow) {
      return;
    }
    const strRows = lstVisibleRecords
      .map(
        (objRecord) => `
          <tr>
            <td>${objRecord.strGroupCode}</td>
            <td>${objRecord.strGroupName}</td>
            <td>${objRecord.strGroupDescription ?? ""}</td>
            <td>${objRecord.blnIsActive ? dicLabels.statusActive : dicLabels.statusInactive}</td>
          </tr>
        `,
      )
      .join("");
    objWindow.document.write(`
      <html>
        <head>
          <title>${dicLabels.exportTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
            th { background: #e2e8f0; }
          </style>
        </head>
        <body>
          <h1>${dicLabels.exportTitle}</h1>
          <table>
            <thead>
              <tr><th>${dicLabels.tableCode}</th><th>${dicLabels.tableName}</th><th>${dicLabels.tableDescription}</th><th>${dicLabels.tableIsActive}</th></tr>
            </thead>
            <tbody>${strRows}</tbody>
          </table>
        </body>
      </html>
    `);
    objWindow.document.close();
    objWindow.focus();
    objWindow.print();
  }

  function openDialog(strNextMode: FormMode, objRecord?: UserGroupRecord) {
    setStrMode(strNextMode);
    setIntEditingID(objRecord?.intID ?? null);
    setObjForm(objRecord ? mapRecordToForm(objRecord) : { ...objEmptyForm });
    setBlnDialogOpen(true);
  }

  async function saveRecord(lstRights: UserGroupRightSaveItem[]) {
    const strGroupCode = objForm.strGroupCode.trim();
    const strGroupName = objForm.strGroupName.trim();

    if (!strGroupCode || !strGroupName) {
      setObjToast({
        open: true,
        message: dicLabels.validationRequired,
        severity: "error",
      });
      return;
    }

    setBlnSaving(true);
    try {
      if (strMode === "add") {
        const objResult = await securityApiService.createUserGroup({
          ...objForm,
          strGroupCode,
          strGroupName,
        });
        const objCreatedRecord = objResult.Data;
        if (lstRights.length > 0) {
          await securityApiService.saveUserGroupRights(objCreatedRecord.intID, lstRights);
        }
        await loadUserGroups();
        setBlnDialogOpen(false);
        setIntEditingID(null);
        setObjForm({ ...objEmptyForm });
        setObjToast({
          open: true,
          message: dicLabels.saveSuccess,
          severity: "success",
        });
        return;
      }

      if (intEditingID) {
        await securityApiService.updateUserGroup(intEditingID, {
          ...objForm,
          strGroupCode,
          strGroupName,
        });
        await securityApiService.saveUserGroupRights(intEditingID, lstRights);
      }

      await loadUserGroups();
      setBlnDialogOpen(false);
      setObjToast({
        open: true,
        message: dicLabels.updateSuccess,
        severity: "success",
      });
    } catch (objError) {
      setObjToast({
        open: true,
        message: objError instanceof Error ? objError.message : dicLabels.errorSave,
        severity: "error",
      });
    } finally {
      setBlnSaving(false);
    }
  }

  async function toggleStatus(objRecord: UserGroupRecord) {
    const blnNextIsActive = !objRecord.blnIsActive;
    openConfirmDialog({
      strTitle: blnNextIsActive ? dicLabels.confirmActivateTitle : dicLabels.confirmDeactivateTitle,
      strMessage: blnNextIsActive ? dicLabels.confirmActivateMessage : dicLabels.confirmDeactivateMessage,
      strConfirmLabel: blnNextIsActive ? dicLabels.confirmActivateLabel : dicLabels.confirmDeactivateLabel,
      fnOnConfirm: async () => {
        await securityApiService.updateUserGroupStatus(objRecord.intID, blnNextIsActive);
        await loadUserGroups();
        setObjToast({
          open: true,
          message: dicLabels.statusUpdateSuccess,
          severity: "success",
        });
      }
    });
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.controlsCard}>
        {strRightsError ? (
          <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography>
        ) : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? (
          <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>
            You have view-only access for User Group.
          </Typography>
        ) : null}
        <Box className={styles.searchRow}>
          <TextField
            placeholder={dicLabels.searchNamePlaceholder}
            value={dicSearchDraft.name}
            onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))}
            fullWidth
          />
          <TextField
            placeholder={dicLabels.searchCodePlaceholder}
            value={dicSearchDraft.code}
            onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))}
            fullWidth
          />
          <TextField
            select
            label={dicLabels.searchStatusLabel}
            value={dicSearchDraft.status}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as "All" | "Active" | "Inactive" }))
            }
            fullWidth
          >
            <MenuItem value="All">{dicLabels.searchStatusAll}</MenuItem>
            <MenuItem value="Active">{dicLabels.searchStatusActive}</MenuItem>
            <MenuItem value="Inactive">{dicLabels.searchStatusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button
              className={styles.primaryButton}
              startIcon={<SearchRoundedIcon />}
              onClick={() => setDicSearchApplied(dicSearchDraft)}
            >
              {dicLabels.searchButton}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                const dicEmpty = { code: "", name: "", status: "All" as const };
                setDicSearchDraft(dicEmpty);
                setDicSearchApplied(dicEmpty);
                setStrSearch("");
              }}
            >
              {dicLabels.clearButton}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 1 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {blnCanAdd ? (
              <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSaving || blnRightsLoading}>
                {dicLabels.addButton}
              </Button>
            ) : null}
            {blnCanExport ? (
              <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={downloadCsv} disabled={blnLoading || blnSaving || blnRightsLoading}>
                {dicLabels.exportExcelButton}
              </Button>
            ) : null}
            {blnCanExport ? (
              <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={exportPdf} disabled={blnLoading || blnSaving || blnRightsLoading}>
                {dicLabels.exportPdfButton}
              </Button>
            ) : null}
          </Box>
          <TextField
            placeholder={dicLabels.quickSearchPlaceholder}
            value={strSearch}
            onChange={(objEvent) => setStrSearch(objEvent.target.value)}
            sx={{ minWidth: { xs: "100%", md: 260 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ color: "#64748b" }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box
          sx={{
            overflowX: "auto",
            overflowY: "auto",
            minHeight: 0,
            flex: 1,
          }}
        >
          {blnLoading || blnRightsLoading ? <LinearProgress /> : null}
          {!blnCanView && !blnLoading && !blnRightsLoading ? (
            <Box sx={{ display: "grid", placeItems: "center", minHeight: 240, px: 3 }}>
              <Stack spacing={1} alignItems="center">
                <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{dicLabels.accessUnavailableTitle}</Typography>
                <Typography sx={{ color: "#64748b", textAlign: "center" }}>{dicLabels.accessUnavailableMessage}</Typography>
              </Stack>
            </Box>
          ) : lstVisibleRecords.length === 0 && !blnLoading && !blnRightsLoading ? (
            <Box sx={{ display: "grid", placeItems: "center", minHeight: 240, px: 3 }}>
              <Stack spacing={1} alignItems="center">
                <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{dicLabels.emptyTitle}</Typography>
                <Typography sx={{ color: "#64748b", textAlign: "center" }}>{dicLabels.emptyMessage}</Typography>
              </Stack>
            </Box>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th><Checkbox checked={blnAllVisibleSelected} indeterminate={blnSomeVisibleSelected} onChange={toggleSelectAll} /></th>
                  <th>{dicLabels.tableActions}</th>
                  <th>{dicLabels.tableCode}</th>
                  <th>{dicLabels.tableName}</th>
                  <th>{dicLabels.tableDescription}</th>
                  <th>{dicLabels.tableIsActive}</th>
                </tr>
              </thead>
              <tbody>
                {lstVisibleRecords.map((objRecord) => {
                  const blnSelected = lstSelectedIds.includes(objRecord.intID);
                  return (
                    <tr key={objRecord.intID} className={blnSelected ? styles.selectedRow : undefined}>
                      <td><Checkbox checked={blnSelected} onChange={() => toggleSelection(objRecord.intID)} /></td>
                      <td>
                        <Box className={styles.actionCell}>
                          {blnCanView ? <button className={`${styles.iconButton} ${styles.viewIcon}`} type="button" onClick={() => openDialog("view", objRecord)}><VisibilityOutlinedIcon fontSize="small" /></button> : null}
                          {blnCanEdit ? <button className={`${styles.iconButton} ${styles.editIcon}`} type="button" onClick={() => openDialog("edit", objRecord)}><EditOutlinedIcon fontSize="small" /></button> : null}
                          {blnCanChangeStatus ? <button className={`${styles.iconButton} ${styles.toggleIcon}`} type="button" onClick={() => toggleStatus(objRecord)}><ToggleOnRoundedIcon fontSize="small" /></button> : null}
                        </Box>
                      </td>
                      <td>{objRecord.strGroupCode}</td>
                      <td>{objRecord.strGroupName}</td>
                      <td>{objRecord.strGroupDescription || dicLabels.noDescription}</td>
                      <td>
                        <span className={`${styles.statusPill} ${objRecord.blnIsActive ? styles.statusActive : styles.statusInactive}`}>
                          {objRecord.blnIsActive ? dicLabels.statusActive : dicLabels.statusInactive}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Box>
      </Box>

      <UserGroupMasterDialog
        blnOpen={blnDialogOpen}
        strMode={strMode}
        intUserGroupID={intEditingID}
        objForm={objForm}
        blnSaving={blnSaving}
        onClose={() => {
          setBlnDialogOpen(false);
          setIntEditingID(null);
          setObjForm({ ...objEmptyForm });
        }}
        onChange={setObjForm}
        onSave={saveRecord}
      />

      <Dialog open={Boolean(objConfirmDialog)} onClose={closeConfirmDialog} PaperProps={{ className: styles.confirmDialogPaper }}>
        <DialogTitle className={styles.confirmDialogTitle}>{objConfirmDialog?.strTitle}</DialogTitle>
        <DialogContent className={styles.confirmDialogContent}>
          <Typography className={styles.confirmDialogMessage}>{objConfirmDialog?.strMessage}</Typography>
        </DialogContent>
        <DialogActions className={styles.confirmDialogActions}>
          <Button className={styles.textAction} onClick={closeConfirmDialog}>{dicLabels.cancelButton}</Button>
          <Button className={styles.primaryButton} onClick={executeConfirmedAction} disabled={blnSaving}>
            {objConfirmDialog?.strConfirmLabel ?? dicLabels.confirmButton}
          </Button>
        </DialogActions>
      </Dialog>

      <BlockingLoader blnOpen={blnLoading || blnSaving} strLabel={blnLoading ? dicLabels.loading : dicLabels.processing} />
      <BlockingLoader blnOpen={blnLoading || blnRightsLoading || blnSaving} strLabel={blnLoading || blnRightsLoading ? "Loading user groups..." : "Processing..."} />
      <Snackbar open={objToast.open} autoHideDuration={3000} onClose={() => setObjToast((objPrevious) => ({ ...objPrevious, open: false }))}>
        <Alert severity={objToast.severity} variant="filled">
          {objToast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
