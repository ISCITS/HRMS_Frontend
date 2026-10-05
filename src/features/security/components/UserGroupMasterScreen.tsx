"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  InputAdornment,
  Link,
  MenuItem,
  Skeleton,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { type HTMLAttributes, type ReactNode, useEffect, useMemo, useState } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { runFrontendAction } from "@/Common/utils/apiErrorHandler";
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
  strGroupCode: string;
  strGroupName: ReactNode;
  strGroupNameText: string;
  strGroupDescription: string;
  strGroupType: string;
  intAssignedUserCount: number;
  strStatus: string;
  status: ReactNode;
};

const intUserGroupSkeletonRows = 8;

const objEmptyForm: UserGroupFormPayload = {
  strGroupCode: "",
  strGroupName: "",
  strGroupDescription: "",
  strGroupType: "HR",
  intCompanyID: authHelpers.getCompanyID(),
  blnIsActive: true,
  intLanguageID: authHelpers.getLanguageID() ?? 1,
};

function UserGroupGridSkeleton() {
  return (
    <Box
      data-control-id="security.user-group.list.skeleton"
      sx={{
        border: "1px solid #e8eef5",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: "#fff",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, px: 1.75, py: 1.25, flexWrap: "wrap" }}>
        <Skeleton variant="rounded" width={150} height={36} />
        <Box sx={{ display: "flex", gap: 1.25, alignItems: "center", flexWrap: "wrap" }}>
          <Skeleton variant="rounded" width={64} height={36} />
          <Skeleton variant="text" width={72} height={24} />
          <Skeleton variant="rounded" width={116} height={32} />
        </Box>
      </Box>
      <Box sx={{ minWidth: 1040 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 0.9fr 0.75fr 1.25fr 0.65fr 0.65fr",
            bgcolor: "#edf3f9",
            borderTop: "1px solid #e8eef5",
            borderBottom: "1px solid #d9e3ee",
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((intColumn) => (
            <Box key={intColumn} sx={{ px: 2, py: 1 }}>
              <Skeleton variant="text" width={intColumn === 3 ? 120 : intColumn >= 4 ? 84 : 110} height={22} />
            </Box>
          ))}
        </Box>
        {Array.from({ length: intUserGroupSkeletonRows }).map((_, intIndex) => (
          <Box
            key={intIndex}
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 0.9fr 0.75fr 1.25fr 0.65fr 0.65fr",
              borderBottom: "1px solid #edf1f6",
              minHeight: 40,
              alignItems: "center",
            }}
          >
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${58 + (intIndex % 3) * 10}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${42 + (intIndex % 2) * 12}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={48} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${64 + (intIndex % 2) * 10}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={34} height={20} sx={{ ml: "auto" }} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="rounded" width={72} height={22} /></Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

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
  const [dicSearchDraft, setDicSearchDraft] = useState({
    query: "",
    groupType: "All" as "All" | "HR" | "ESS" | "BOTH",
    status: "All" as "All" | "Active" | "Inactive",
  });
  const [dicSearchApplied, setDicSearchApplied] = useState({
    query: "",
    groupType: "All" as "All" | "HR" | "ESS" | "BOTH",
    status: "All" as "All" | "Active" | "Inactive",
  });
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
    searchNameOrCodeLabel: t("search_name_or_code_label", "Search group name or code"),
    searchNameOrCodePlaceholder: t("search_name_or_code_placeholder", "Search group name or code"),
    searchGroupTypeLabel: t("search_group_type_label", "Group type"),
    searchGroupTypeAll: t("search_group_type_all", "All"),
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
    tableGroupName: t("table_group_name", "Group name"),
    tableGroupCode: t("table_group_code", "Group code"),
    tableDescription: t("table_description", "Description"),
    tableGroupType: t("table_group_type", "Group Type"),
    tableAssignedUsers: t("table_assigned_users", "Assigned users"),
    tableStatus: t("table_status", "Status"),
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
      setBlnLoading(false);
      return;
    }

    setBlnLoading(true);

    await runFrontendAction({
      fnAction: () => securityApiService.listUserGroups(),
      fnOnSuccess: (objResult) => {
        setLstRecords(objResult.Data);
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
      const strSearch = dicSearchApplied.query.trim().toLowerCase();
      const blnSearchMatch =
        !strSearch ||
        [objRecord.strGroupName, objRecord.strGroupCode].join(" ").toLowerCase().includes(strSearch);
      const blnGroupTypeMatch =
        dicSearchApplied.groupType === "All" || objRecord.strGroupType === dicSearchApplied.groupType;
      const blnStatusMatch =
        dicSearchApplied.status === "All" ||
        (dicSearchApplied.status === "Active" ? objRecord.blnIsActive : !objRecord.blnIsActive);
      return blnSearchMatch && blnGroupTypeMatch && blnStatusMatch;
    });
  }, [dicSearchApplied, lstRecords]);

  const lstTableRows = useMemo<UserGroupTableRow[]>(() => lstFilteredRecords.map((objRecord) => {
    return {
      intID: objRecord.intID,
      strGroupCode: objRecord.strGroupCode,
      strGroupNameText: objRecord.strGroupName,
      strGroupName: (
        <Link
          component="button"
          type="button"
          underline="none"
          disabled={!blnCanView && !blnCanEdit}
          data-control-id="security.user-group.list.row.name.button"
          onClick={(objEvent) => {
            if (window.getSelection()?.toString()) {
              objEvent.stopPropagation();
              return;
            }
            openDialog(blnCanEdit ? "edit" : "view", objRecord);
          }}
          sx={{
            color: "#334155",
            cursor: "pointer",
            fontSize: "inherit",
            fontWeight: 500,
            textAlign: "left",
            textUnderlineOffset: "3px",
            userSelect: "text",
            WebkitUserSelect: "text",
            "&:hover": { color: "#0066df", textDecoration: "underline" },
            "&:focus-visible": { outline: "2px solid #0066df", outlineOffset: 3 },
          }}
        >
          {objRecord.strGroupName}
        </Link>
      ),
      strGroupDescription: objRecord.strGroupDescription || dicLabels.noDescription,
      strGroupType: objRecord.strGroupType ?? "HR",
      intAssignedUserCount: objRecord.intAssignedUserCount ?? 0,
      strStatus: objRecord.blnIsActive ? dicLabels.statusActive : dicLabels.statusInactive,
      status: (
        <span
          className={styles.statusPill}
          style={{
            background: objRecord.blnIsActive ? "#dcfce7" : "#fee2e2",
            color: objRecord.blnIsActive ? "#15803d" : "#dc2626",
          }}
        >
          {objRecord.blnIsActive ? dicLabels.statusActive : dicLabels.statusInactive}
        </span>
      ),
    };
  }), [blnCanEdit, blnCanView, dicLabels.noDescription, dicLabels.statusActive, dicLabels.statusInactive, lstFilteredRecords]);
  const lstTableColumns = useMemo<CommonTableColumn<UserGroupTableRow>[]>(() => [
    { field: "strGroupName", headerName: dicLabels.tableGroupName, sortAccessor: (objRow) => objRow.strGroupNameText },
    { field: "strGroupCode", headerName: dicLabels.tableGroupCode },
    { field: "strGroupType", headerName: dicLabels.tableGroupType },
    { field: "strGroupDescription", headerName: dicLabels.tableDescription },
    { field: "intAssignedUserCount", headerName: dicLabels.tableAssignedUsers, align: "right", width: 150 },
    { field: "status", headerName: dicLabels.tableStatus, sortAccessor: (objRow) => objRow.strStatus, filterable: false },
  ], [dicLabels.tableAssignedUsers, dicLabels.tableDescription, dicLabels.tableGroupCode, dicLabels.tableGroupName, dicLabels.tableGroupType, dicLabels.tableStatus]);

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
      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {strRightsError ? (
          <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography>
        ) : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? (
          <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>
            You have view-only access for User Group.
          </Typography>
        ) : null}
        <Box
          className={styles.searchRow}
          sx={{
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(280px, 1.4fr) minmax(180px, 0.7fr) minmax(180px, 0.7fr) auto auto",
            },
            alignItems: "center",
            "& .MuiButton-root": { alignSelf: "center" },
          }}
        >
          <TextField
            className="app-mui-text-field"
            label={dicLabels.searchNameOrCodeLabel}
            placeholder={dicLabels.searchNameOrCodePlaceholder}
            value={dicSearchDraft.query}
            onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, query: objEvent.target.value }))}
            inputProps={{ controlId: "security.user-group.search.name-code.input" }}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
                </InputAdornment>
              ),
            }}
            fullWidth
          />
          <TextField
            className="app-mui-text-field"
            select
            label={dicLabels.searchGroupTypeLabel}
            value={dicSearchDraft.groupType}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, groupType: objEvent.target.value as "All" | "HR" | "ESS" | "BOTH" }))
            }
            inputProps={{ controlId: "security.user-group.search.group-type.select" }}
            SelectProps={{
              SelectDisplayProps: { "data-control-id": "security.user-group.search.group-type.select" } as HTMLAttributes<HTMLDivElement>,
            }}
            size="small"
            fullWidth
          >
            <MenuItem value="All" data-control-id="security.user-group.search.group-type.all.option">{dicLabels.searchGroupTypeAll}</MenuItem>
            <MenuItem value="HR" data-control-id="security.user-group.search.group-type.hr.option">HR</MenuItem>
            <MenuItem value="ESS" data-control-id="security.user-group.search.group-type.ess.option">ESS</MenuItem>
            <MenuItem value="BOTH" data-control-id="security.user-group.search.group-type.both.option">BOTH</MenuItem>
          </TextField>
          <TextField
            className="app-mui-text-field"
            select
            label={dicLabels.searchStatusLabel}
            value={dicSearchDraft.status}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as "All" | "Active" | "Inactive" }))
            }
            inputProps={{ controlId: "security.user-group.search.status.select" }}
            SelectProps={{
              SelectDisplayProps: { "data-control-id": "security.user-group.search.status.select" } as HTMLAttributes<HTMLDivElement>,
            }}
            size="small"
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
                const dicEmpty = { query: "", groupType: "All" as const, status: "All" as const };
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

      <Box className={styles.tableCard} sx={{ p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Box sx={{ overflowX: "auto", overflowY: "auto", minHeight: 0, flex: 1 }}>
          {blnLoading || blnRightsLoading ? (
            <UserGroupGridSkeleton />
          ) : !blnCanView ? (
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
              showPaginationSummary
              testIdPrefix="security.user-group.list"
              minTableWidth={1040}
              hideRowClickHint
              onRowClick={(objRow) => {
                if (blnRightsLoading || blnLoading || blnSaving || (!blnCanEdit && !blnCanView)) return;
                const objRecord = lstFilteredRecords.find((dicRecord) => dicRecord.intID === objRow.intID);
                if (objRecord) openDialog(blnCanEdit ? "edit" : "view", objRecord);
              }}
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
              getRowSx={() => ({
                backgroundColor: "#fff",
                "&.MuiTableRow-hover:hover": { backgroundColor: "#f8fbff" },
                "&.MuiTableRow-hover:hover td:first-of-type .MuiLink-root": { textDecoration: "underline" },
              })}
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

      <Snackbar open={objToast.open} autoHideDuration={3000} onClose={() => setObjToast((objPrevious) => ({ ...objPrevious, open: false }))}>
        <Alert severity={objToast.severity} variant="filled">
          {objToast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
