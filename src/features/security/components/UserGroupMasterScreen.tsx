"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
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
  LinearProgress,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { runFrontendAction } from "@/Common/utils/apiErrorHandler";
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
type UserGroupTableRow = {
  intID: number;
  select: ReactNode;
  rowActions: ReactNode;
  strGroupCode: string;
  strGroupName: string;
  strGroupDescription: string;
  status: ReactNode;
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
    exportFileName: t("export_file_name", "user_groups"),
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

    await runFrontendAction({
      fnAction: objConfirmDialog.fnOnConfirm,
      fnOnError: (objError) => setObjToast({
        open: true,
        message: objError.message,
        severity: "error",
      }),
      fnFinally: () => {
        setBlnSaving(false);
        closeConfirmDialog();
      },
      strFallbackMessage: dicLabels.statusUpdateError,
    });
  }

  async function loadUserGroups() {
    if (!canViewAny()) {
      setLstRecords([]);
      setLstSelectedIds([]);
      setBlnLoading(false);
      return;
    }

    setBlnLoading(true);

    await runFrontendAction({
      fnAction: () => securityApiService.listUserGroups(),
      fnOnSuccess: (objResult) => {
        setLstRecords(objResult.Data);
        setLstSelectedIds([]);
      },
      fnOnError: (objError) => setObjToast({
        open: true,
        message: objError.message,
        severity: "error",
      }),
      fnFinally: () => setBlnLoading(false),
      strFallbackMessage: dicLabels.errorLoad,
    });
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
    void loadUserGroups();
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

  const blnAllFilteredSelected = lstFilteredRecords.length > 0 && lstFilteredRecords.every((objRecord) => lstSelectedIds.includes(objRecord.intID));
  const blnSomeFilteredSelected = !blnAllFilteredSelected && lstSelectedIds.some((intID) => lstFilteredRecords.some((objRecord) => objRecord.intID === intID));
  const lstTableRows = useMemo<UserGroupTableRow[]>(() => lstFilteredRecords.map((objRecord) => {
    const blnSelected = lstSelectedIds.includes(objRecord.intID);
    return {
      intID: objRecord.intID,
      select: <Checkbox checked={blnSelected} onChange={() => toggleSelection(objRecord.intID)} />,
      rowActions: (
        <Box className={styles.actionCell}>
          {blnCanView ? <button className={`${styles.iconButton} ${styles.viewIcon}`} type="button" onClick={() => openDialog("view", objRecord)}><VisibilityOutlinedIcon fontSize="small" /></button> : null}
          {blnCanEdit ? <button className={`${styles.iconButton} ${styles.editIcon}`} type="button" onClick={() => openDialog("edit", objRecord)}><EditOutlinedIcon fontSize="small" /></button> : null}
          {blnCanChangeStatus ? <button className={`${styles.iconButton} ${styles.toggleIcon}`} type="button" onClick={() => toggleStatus(objRecord)}><ToggleOnRoundedIcon fontSize="small" /></button> : null}
        </Box>
      ),
      strGroupCode: objRecord.strGroupCode,
      strGroupName: objRecord.strGroupName,
      strGroupDescription: objRecord.strGroupDescription || dicLabels.noDescription,
      status: (
        <span className={`${styles.statusPill} ${objRecord.blnIsActive ? styles.statusActive : styles.statusInactive}`}>
          {objRecord.blnIsActive ? dicLabels.statusActive : dicLabels.statusInactive}
        </span>
      ),
    };
  }), [blnCanChangeStatus, blnCanEdit, blnCanView, dicLabels.noDescription, dicLabels.statusActive, dicLabels.statusInactive, lstFilteredRecords, lstSelectedIds]);
  const lstTableColumns = useMemo<CommonTableColumn<UserGroupTableRow>[]>(() => [
    { field: "select", headerName: "", width: 64, sortable: false, filterable: false, exportable: false },
    { field: "rowActions", headerName: dicLabels.tableActions, width: 140, sortable: false, filterable: false, exportable: false },
    { field: "strGroupCode", headerName: dicLabels.tableCode },
    { field: "strGroupName", headerName: dicLabels.tableName },
    { field: "strGroupDescription", headerName: dicLabels.tableDescription },
    { field: "status", headerName: dicLabels.tableIsActive, sortable: false, filterable: false },
  ], [dicLabels.tableActions, dicLabels.tableCode, dicLabels.tableDescription, dicLabels.tableIsActive, dicLabels.tableName]);

  function toggleSelection(intUserGroupID: number) {
    setLstSelectedIds((lstPrevious) =>
      lstPrevious.includes(intUserGroupID)
        ? lstPrevious.filter((intID) => intID !== intUserGroupID)
        : [...lstPrevious, intUserGroupID],
    );
  }

  function toggleSelectAll() {
    if (blnAllFilteredSelected) {
      setLstSelectedIds((lstPrevious) => lstPrevious.filter((intID) => !lstFilteredRecords.some((objRecord) => objRecord.intID === intID)));
      return;
    }
    setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstFilteredRecords.map((objRecord) => objRecord.intID)])]);
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
    await runFrontendAction({
      fnAction: async () => {
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
          return "add";
        }

        if (intEditingID) {
          await securityApiService.updateUserGroup(intEditingID, {
            ...objForm,
            strGroupCode,
            strGroupName,
          });
          await securityApiService.saveUserGroupRights(intEditingID, lstRights);
        }

        return "edit";
      },
      fnOnSuccess: async (strSavedMode) => {
        await loadUserGroups();
        setBlnDialogOpen(false);
        setIntEditingID(null);
        setObjForm({ ...objEmptyForm });
        setObjToast({
          open: true,
          message: strSavedMode === "add" ? dicLabels.saveSuccess : dicLabels.updateSuccess,
          severity: "success",
        });
      },
      fnOnError: (objError) => setObjToast({
        open: true,
        message: objError.message,
        severity: "error",
      }),
      fnFinally: () => setBlnSaving(false),
      strFallbackMessage: dicLabels.errorSave,
    });
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
              }}
            >
              {dicLabels.clearButton}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard}>
        <Box
          sx={{
            overflowX: "auto",
            overflowY: "auto",
            minHeight: 0,
            flex: 1,
          }}
        >
          {blnLoading || blnRightsLoading ? (
            <Box sx={{ minHeight: 240 }}>
              <LinearProgress />
            </Box>
          ) : !blnCanView ? (
            <Box sx={{ display: "grid", placeItems: "center", minHeight: 240, px: 3 }}>
              <Stack spacing={1} alignItems="center">
                <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{dicLabels.accessUnavailableTitle}</Typography>
                <Typography sx={{ color: "#64748b", textAlign: "center" }}>{dicLabels.accessUnavailableMessage}</Typography>
              </Stack>
            </Box>
          ) : lstFilteredRecords.length === 0 ? (
            <Box sx={{ display: "grid", placeItems: "center", minHeight: 240, px: 3 }}>
              <Stack spacing={1} alignItems="center">
                <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{dicLabels.emptyTitle}</Typography>
                <Typography sx={{ color: "#64748b", textAlign: "center" }}>{dicLabels.emptyMessage}</Typography>
              </Stack>
            </Box>
          ) : (
            <CommonTable
              columns={lstTableColumns}
              rows={lstTableRows}
              rowIdField="intID"
              emptyMessage={dicLabels.emptyMessage}
              exportFileName={dicLabels.exportFileName}
              showExportOptions={blnCanExport}
              toolbarLeft={
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                  {blnCanAdd ? (
                    <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSaving || blnRightsLoading}>
                      {dicLabels.addButton}
                    </Button>
                  ) : null}
                  <Checkbox checked={blnAllFilteredSelected} indeterminate={blnSomeFilteredSelected} onChange={toggleSelectAll} disabled={lstFilteredRecords.length === 0} />
                </Box>
              }
              getRowSx={(objRow) => lstSelectedIds.includes(objRow.intID) ? { backgroundColor: "rgba(37, 99, 235, 0.08)" } : undefined}
            />
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
      <Snackbar open={objToast.open} autoHideDuration={3000} onClose={() => setObjToast((objPrevious) => ({ ...objPrevious, open: false }))}>
        <Alert severity={objToast.severity} variant="filled">
          {objToast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
