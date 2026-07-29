"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  MenuItem,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { type HTMLAttributes, type InputHTMLAttributes, type ReactNode, useEffect, useMemo, useState } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { runFrontendAction } from "@/Common/utils/apiErrorHandler";
import CommonRowActions from "@/components/master/CommonRowActions";
import BlockingLoader from "@/components/shared/BlockingLoader";
import UserGroupMasterDialog from "@/features/security/components/UserGroupMasterDialog";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import styles from "@/components/master/MasterScreen.module.css";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { authHelpers } from "@/lib/auth";
import type { UserGroupFormPayload, UserGroupRecord, UserGroupRightSaveItem } from "@/models/SecurityModels";
import { securityApiService } from "@/features/security/services/securityApiService";

type FormMode = "add" | "edit" | "view";
type UserGroupTableRow = {
  intID: number;
  select: ReactNode;
  rowActions: ReactNode;
  strGroupCode: string;
  strGroupName: string;
  strGroupDescription: string;
  strGroupType: string;
  status: ReactNode;
};

const objEmptyForm: UserGroupFormPayload = {
  strGroupCode: "",
  strGroupName: "",
  strGroupDescription: "",
  strGroupType: "HR",
  intCompanyID: authHelpers.getCompanyID(),
  blnIsActive: true,
  intLanguageID: authHelpers.getLanguageID() ?? 1,
};

function mapRecordToForm(objRecord: UserGroupRecord): UserGroupFormPayload {
  return {
    strGroupCode: objRecord.strGroupCode,
    strGroupName: objRecord.strGroupName,
    strGroupDescription: objRecord.strGroupDescription ?? "",
    strGroupType: objRecord.strGroupType ?? "HR",
    intCompanyID: objRecord.intCompanyID,
    blnIsActive: objRecord.blnIsActive,
    intLanguageID: authHelpers.getLanguageID() ?? 1,
  };
}

export default function UserGroupMasterScreen() {
  const { t } = useModuleLabels("user_group");
  const {
    blnLoading: blnRightsLoading,
    strError: strRightsError,
    hasRightAny,
    canViewAny,
    isReadOnly,
  } = useModuleActionAccess(["USERGROUP", "USER_GROUP", "USER_GROUPS"]);
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
  const [dicFieldErrors, setDicFieldErrors] = useState<Partial<Record<"strGroupCode" | "strGroupName", string>>>({});
  const [strDialogError, setStrDialogError] = useState("");
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
    addButton: t("add_button", "Add User Group"),
    accessUnavailableTitle: t("access_unavailable_title", "User group access is not available for your user group"),
    accessUnavailableMessage: t("access_unavailable_message", "Contact your administrator if you need user group visibility."),
    emptyTitle: t("empty_title", "No user groups found"),
    emptyMessage: t("empty_message", "Add the first user group to start assigning dynamic menu and action rights from `tblmenu` and `tblaction`."),
    tableActions: t("table_actions", "Actions"),
    tableCode: t("table_code", "Code"),
    tableName: t("table_name", "Name"),
    tableDescription: t("table_description", "Description"),
    tableGroupType: t("table_group_type", "Group Type"),
    tableIsActive: t("table_is_active", "Is Active"),
    statusActive: t("status_active", "Active"),
    statusInactive: t("status_inactive", "Inactive"),
    noDescription: t("no_description", "No description configured."),
    loading: t("loading", "Loading user groups..."),
    processing: t("processing", "Processing..."),
    errorLoad: t("error_load", "Unable to load user groups."),
    validationGroupCodeRequired: t("validation_group_code_required", "Group code is required."),
    validationGroupNameRequired: t("validation_group_name_required", "Group name is required."),
    saveSuccess: t("save_success", "User group and rights saved successfully."),
    updateSuccess: t("update_success", "User group updated successfully."),
    errorSave: t("error_save", "Unable to save user group."),
    exportFileName: t("export_file_name", "user_groups"),
  };

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
  const blnCanAdd = hasRightAny("add");
  const blnCanEdit = hasRightAny("edit");
  const blnCanExport = hasRightAny("export");
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
    const strRowControlPrefix = `security.user-group.list.row.${objRecord.intID}`;
    return {
      intID: objRecord.intID,
      select: (
        <Checkbox
          checked={blnSelected}
          onChange={() => toggleSelection(objRecord.intID)}
          inputProps={{
            controlId: `${strRowControlPrefix}.select.checkbox`,
            "data-control-id": `${strRowControlPrefix}.select.checkbox`,
            "data-row-key": objRecord.intID,
          } as InputHTMLAttributes<HTMLInputElement>}
        />
      ),
      rowActions: (
        <CommonRowActions
          testIdPrefix={strRowControlPrefix}
          rowKey={objRecord.intID}
          blnCanView={blnCanView}
          blnCanEdit={blnCanEdit}
          onView={() => openDialog("view", objRecord)}
          onEdit={blnCanEdit ? () => openDialog("edit", objRecord) : undefined}
        />
      ),
      strGroupCode: objRecord.strGroupCode,
      strGroupName: objRecord.strGroupName,
      strGroupDescription: objRecord.strGroupDescription || dicLabels.noDescription,
      strGroupType: objRecord.strGroupType ?? "HR",
      status: (
        <span className={`${styles.statusPill} ${objRecord.blnIsActive ? styles.statusActive : styles.statusInactive}`}>
          {objRecord.blnIsActive ? dicLabels.statusActive : dicLabels.statusInactive}
        </span>
      ),
    };
  }), [blnCanEdit, blnCanView, dicLabels.noDescription, dicLabels.statusActive, dicLabels.statusInactive, lstFilteredRecords, lstSelectedIds]);
  const lstTableColumns = useMemo<CommonTableColumn<UserGroupTableRow>[]>(() => [
    {
      field: "select",
      headerName: (
        <Checkbox
          checked={blnAllFilteredSelected}
          indeterminate={blnSomeFilteredSelected}
          onChange={toggleSelectAll}
          disabled={lstFilteredRecords.length === 0}
          inputProps={{
            controlId: "security.user-group.list.select-all.checkbox",
            "data-control-id": "security.user-group.list.select-all.checkbox",
          } as InputHTMLAttributes<HTMLInputElement>}
        />
      ),
      width: 64,
      sortable: false,
      filterable: false,
      exportable: false
    },
    { field: "rowActions", headerName: dicLabels.tableActions, width: 140, sortable: false, filterable: false, exportable: false },
    { field: "strGroupCode", headerName: dicLabels.tableCode },
    { field: "strGroupName", headerName: dicLabels.tableName },
    { field: "strGroupDescription", headerName: dicLabels.tableDescription },
    { field: "strGroupType", headerName: dicLabels.tableGroupType },
    { field: "status", headerName: dicLabels.tableIsActive, sortable: false, filterable: false },
  ], [blnAllFilteredSelected, blnSomeFilteredSelected, dicLabels.tableActions, dicLabels.tableCode, dicLabels.tableDescription, dicLabels.tableGroupType, dicLabels.tableIsActive, dicLabels.tableName, lstFilteredRecords.length]);

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
    setDicFieldErrors({});
    setStrDialogError("");
    setBlnDialogOpen(true);
  }

  async function saveRecord(lstRights: UserGroupRightSaveItem[]) {
    const strGroupCode = objForm.strGroupCode.trim();
    const strGroupName = objForm.strGroupName.trim();
    const dicNextFieldErrors: Partial<Record<"strGroupCode" | "strGroupName", string>> = {};

    if (!strGroupCode) {
      dicNextFieldErrors.strGroupCode = dicLabels.validationGroupCodeRequired;
    }
    if (!strGroupName) {
      dicNextFieldErrors.strGroupName = dicLabels.validationGroupNameRequired;
    }

    setDicFieldErrors(dicNextFieldErrors);
    setStrDialogError("");

    if (Object.keys(dicNextFieldErrors).length > 0) {
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
        setDicFieldErrors({});
        setStrDialogError("");
        setObjToast({
          open: true,
          message: strSavedMode === "add" ? dicLabels.saveSuccess : dicLabels.updateSuccess,
          severity: "success",
        });
      },
      fnOnError: (objError) => setStrDialogError(objError.message || dicLabels.errorSave),
      fnFinally: () => setBlnSaving(false),
      strFallbackMessage: dicLabels.errorSave,
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
            inputProps={{ controlId: "security.user-group.search.name.input" }}
            fullWidth
          />
          <TextField
            placeholder={dicLabels.searchCodePlaceholder}
            value={dicSearchDraft.code}
            onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))}
            inputProps={{ controlId: "security.user-group.search.code.input" }}
            fullWidth
          />
          <TextField
            select
            label={dicLabels.searchStatusLabel}
            value={dicSearchDraft.status}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as "All" | "Active" | "Inactive" }))
            }
            SelectProps={{
              SelectDisplayProps: { "data-control-id": "security.user-group.search.status.select" } as HTMLAttributes<HTMLDivElement>,
            }}
            fullWidth
          >
            <MenuItem value="All" data-control-id="security.user-group.search.status.all.option">{dicLabels.searchStatusAll}</MenuItem>
            <MenuItem value="Active" data-control-id="security.user-group.search.status.active.option">{dicLabels.searchStatusActive}</MenuItem>
            <MenuItem value="Inactive" data-control-id="security.user-group.search.status.inactive.option">{dicLabels.searchStatusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button
              className={styles.primaryButton}
              startIcon={<SearchRoundedIcon />}
              onClick={() => setDicSearchApplied(dicSearchDraft)}
              data-control-id="security.user-group.search.button"
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
              data-control-id="security.user-group.clear.button"
            >
              {dicLabels.clearButton}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard}>
        <Box sx={{ overflowX: "auto", overflowY: "auto", minHeight: 0, flex: 1 }}>
          {blnLoading || blnRightsLoading ? null : !blnCanView ? (
            <Box className={styles.emptyState}>
              <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{dicLabels.accessUnavailableTitle}</Typography>
              <Typography sx={{ color: "#64748b", textAlign: "center" }}>{dicLabels.accessUnavailableMessage}</Typography>
            </Box>
          ) : lstFilteredRecords.length === 0 ? (
            <Box className={styles.emptyState}>
              <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{dicLabels.emptyTitle}</Typography>
              <Typography sx={{ color: "#64748b", textAlign: "center" }}>{dicLabels.emptyMessage}</Typography>
            </Box>
          ) : (
            <CommonTable
              columns={lstTableColumns}
              rows={lstTableRows}
              rowIdField="intID"
              emptyMessage={dicLabels.emptyMessage}
              exportFileName={dicLabels.exportFileName}
              showExportOptions={blnCanExport}
              defaultPageSize={10}
              pageSizeOptions={[10, 20, 50]}
              showPaginationSummary
              testIdPrefix="security.user-group.list"
              sx={{ p: 0, boxShadow: "none", background: "transparent" }}
              toolbarLeft={
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                  {blnCanAdd ? (
                    <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSaving || blnRightsLoading} data-control-id="security.user-group.add.button">
                      {dicLabels.addButton}
                    </Button>
                  ) : null}
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
          setDicFieldErrors({});
          setStrDialogError("");
        }}
        onChange={(objNextForm) => {
          setObjForm(objNextForm);
          setStrDialogError("");
          setDicFieldErrors((dicPrevious) => ({
            strGroupCode: dicPrevious.strGroupCode && objNextForm.strGroupCode.trim() ? undefined : dicPrevious.strGroupCode,
            strGroupName: dicPrevious.strGroupName && objNextForm.strGroupName.trim() ? undefined : dicPrevious.strGroupName,
          }));
        }}
        strSaveError={strDialogError}
        dicFieldErrors={dicFieldErrors}
        onSave={saveRecord}
      />

      <BlockingLoader blnOpen={blnLoading || blnRightsLoading || blnSaving} strLabel={blnSaving ? dicLabels.processing : dicLabels.loading} />
      <Snackbar open={objToast.open} autoHideDuration={3000} onClose={() => setObjToast((objPrevious) => ({ ...objPrevious, open: false }))}>
        <Alert severity={objToast.severity} variant="filled">
          {objToast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
