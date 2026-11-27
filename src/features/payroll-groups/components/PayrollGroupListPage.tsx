"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Snackbar,
  Skeleton,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import { onSearchEnter } from "@/components/master/MasterListUi";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import PayrollGroupEditorPage, { type PayrollGroupEditorHandle } from "@/features/payroll-groups/components/PayrollGroupEditorPage";
import { payrollGroupService } from "@/features/payroll-groups/services/payrollGroupService";
import type { PayrollGroupListRecord } from "@/features/payroll-groups/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type Status = "Active" | "Inactive";
type DialogMode = "add" | "edit" | "view";
type SearchForm = {
  strName: string;
  strStatus: "All" | Status;
};
type ToastState = {
  blnOpen: boolean;
  strMessage: string;
  strSeverity: "success" | "error";
};

const lstPayrollGroupModuleCodes = ["PAYROLL_GROUP", "PAYROLL_GROUPS", "MASTER_PAYROLL_GROUP"];
const dicEmptySearch: SearchForm = { strName: "", strStatus: "All" };
const intPayrollGroupSkeletonRows = 8;

function PayrollGroupGridSkeleton() {
  return (
    <Box
      data-control-id="payroll-groups.list.skeleton"
      className="app-master-grid-skeleton"
    >
      <Box className="app-master-grid-skeleton-toolbar">
        <Skeleton variant="rounded" width={164} height={36} />
        <Box className="app-master-grid-skeleton-toolbar-actions">
          <Skeleton variant="rounded" width={64} height={36} />
          <Skeleton variant="text" width={72} height={24} />
          <Skeleton variant="rounded" width={116} height={32} />
        </Box>
      </Box>
      <Box className="app-master-grid-skeleton-table">
        <Box className="app-master-grid-skeleton-header">
          {[0, 1, 2, 3].map((intColumn) => (
            <Box key={intColumn} className="app-master-grid-skeleton-header-cell">
              <Skeleton variant="text" width={intColumn === 0 ? 64 : intColumn === 3 ? 76 : 138} height={22} />
            </Box>
          ))}
        </Box>
        {Array.from({ length: intPayrollGroupSkeletonRows }).map((_, intIndex) => (
          <Box
            key={intIndex}
            className="app-master-grid-skeleton-row"
          >
            <Box className="app-master-grid-skeleton-cell"><Skeleton variant="rounded" width={76} height={24} /></Box>
            <Box className="app-master-grid-skeleton-cell"><Skeleton variant="text" width={`${58 + (intIndex % 3) * 9}%`} height={20} /></Box>
            <Box className="app-master-grid-skeleton-cell"><Skeleton variant="text" width={`${42 + (intIndex % 2) * 14}%`} height={20} /></Box>
            <Box className="app-master-grid-skeleton-cell"><Skeleton variant="rounded" width={72} height={22} /></Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function PayrollGroupListPage() {
  const { t } = useModuleLabels("payroll-groups");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstPayrollGroupModuleCodes);
  const [lstGroups, setLstGroups] = useState<PayrollGroupListRecord[]>([]);
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting] = useState(false);
  const [dicDialog, setDicDialog] = useState<{ blnOpen: boolean; strMode: DialogMode; strPayrollGroupID?: string }>({
    blnOpen: false,
    strMode: "add"
  });
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  const objEditorRef = useRef<PayrollGroupEditorHandle>(null);
  const [objActiveState, setObjActiveState] = useState({ blnIsActive: true, blnDisabled: true });

  function openGroupEditor(strMode: DialogMode, dicRow?: PayrollGroupListRecord) {
    setDicDialog({
      blnOpen: true,
      strMode,
      strPayrollGroupID: dicRow?.strRecordUUID
    });
  }

  function closeGroupEditor() {
    setDicDialog((dicPrevious) => ({ ...dicPrevious, blnOpen: false }));
  }

  async function loadPayrollGroups() {
    if (!canViewAny()) {
      setLstGroups([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      setLstGroups(await payrollGroupService.getPayrollGroups());
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : t("group_load_list_failed", "Unable to load payroll groups."), "error");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }
    loadPayrollGroups().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blnRightsLoading]);

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanExport = canDoAny("export");
  const blnReadOnly = isReadOnly();
  const blnSearchPanelFrozen = blnLoading || blnRightsLoading || !blnCanView;

  const lstFilteredRows = useMemo(() => {
    return lstGroups.filter((dicRow) => {
      const blnNameMatch = !dicSearchApplied.strName || dicRow.strPayrollGroupName.toLowerCase().includes(dicSearchApplied.strName.toLowerCase());
      const blnStatusMatch =
        dicSearchApplied.strStatus === "All" ||
        (dicSearchApplied.strStatus === "Active" ? dicRow.blnIsActive : !dicRow.blnIsActive);
      return blnNameMatch && blnStatusMatch;
    });
  }, [dicSearchApplied, lstGroups]);

  const lstTableRows = useMemo(
    () =>
      lstFilteredRows.map((dicRow) => ({
        id: dicRow.intID,
        strPayrollGroupNameText: dicRow.strPayrollGroupName,
        strPayrollGroupName: (
          <Link
            component="button"
            type="button"
            underline="none"
            disabled={!blnCanView && !blnCanEdit}
            className="app-mui-link-muted app-master-first-column-link" data-control-id="payroll-groups.list.row.name.button"
            onClick={(objEvent) => {
              if (window.getSelection()?.toString()) {
                objEvent.stopPropagation();
                return;
              }
              openGroupEditor(blnCanEdit ? "edit" : "view", dicRow);
            }}
          >
            {dicRow.strPayrollGroupName}
          </Link>
        ),
        strDescription: dicRow.strDescription || "-",
        strStatusText: dicRow.blnIsActive ? "Active" : "Inactive",
        blnIsActive: (
          <span className={`app-master-status-pill ${dicRow.blnIsActive ? "app-master-status-active" : "app-master-status-inactive"}`}>
            {dicRow.blnIsActive ? t("active", "Active") : t("inactive", "Inactive")}
          </span>
        ),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [blnCanEdit, blnCanView, lstFilteredRows, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "strPayrollGroupName", headerName: t("payroll_group_name", "Payroll Group Name"), sortAccessor: (row) => row.strPayrollGroupNameText },
      { field: "strDescription", headerName: t("description", "Description"), width: 260 },
      { field: "blnIsActive", headerName: t("status", "Status"), filterable: false, width: 130, sortAccessor: (row) => row.strStatusText },
    ],
    [t]
  );

  function showToast(strMessage: string, strSeverity: ToastState["strSeverity"] = "success") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  function closeToast() {
    setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }));
  }

  return (
    <Box className={`${styles.page} app-master-page-relative`}>
      <Breadcrumbs className="app-breadcrumbs app-breadcrumbs-master" aria-label="breadcrumb" separator={<NavigateNextRoundedIcon className="app-breadcrumb-separator-icon" />}>
        <Typography className="app-breadcrumb-label">{t("breadcrumb_masters", "Masters")}</Typography>
        <Typography component="h1" className="app-breadcrumb-heading" aria-current="page">{t("breadcrumb_payroll_groups", "Payroll Groups")}</Typography>
      </Breadcrumbs>

      <Box className="app-master-search-panel">
        {strRightsError ? (
          <Typography className="app-master-access-message app-master-access-warning">{strRightsError}</Typography>
        ) : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? (
          <Typography className="app-master-access-message app-master-access-info">
            {t("group_read_only_mode", "You have view-only access to Payroll Groups.")}
          </Typography>
        ) : null}
        <Box
          className={`${styles.searchRow} ${styles.payrollGroupSearchRow} app-master-search-row-centered`}
          onKeyDown={onSearchEnter(() => { if (!blnSearchPanelFrozen) setDicSearchApplied(dicSearchDraft); })}
          aria-busy={blnSearchPanelFrozen}
        >
          <TextField
            className="app-mui-text-field"
            id="payroll-groups-search-name"
            controlId="payroll-groups.list.name.input"
            inputProps={{ "controlId": "payroll-groups.list.name.input" }}
            label={t("payroll_group_name", "Payroll Group Name")}
            value={dicSearchDraft.strName}
            onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strName: objEvent.target.value }))}
            placeholder={t("search_name_placeholder", "Search payroll group name")}
            size="small"
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon className="app-search-adornment-icon" /></InputAdornment> }}
            disabled={blnSearchPanelFrozen}
            fullWidth
          />
          <TextField
            className="app-mui-text-field"
            id="payroll-groups-search-status"
            controlId="payroll-groups.list.search-status.select"
            inputProps={{ "controlId": "payroll-groups.list.search-status.select" }}
            select
            label={t("status", "Status")}
            value={dicSearchDraft.strStatus}
            onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: objEvent.target.value as SearchForm["strStatus"] }))}
            size="small"
            disabled={blnSearchPanelFrozen}
            fullWidth
          >
            <MenuItem value="All">{t("all", "All")}</MenuItem>
            <MenuItem value="Active">{t("active", "Active")}</MenuItem>
            <MenuItem value="Inactive">{t("inactive", "Inactive")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button controlId="payroll-groups.list.search.button" className="app-btn app-btn-primary" size="small" startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); }} disabled={blnSearchPanelFrozen}>
              {t("search", "Search")}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button
              controlId="payroll-groups.list.clear.button"
              className="app-btn app-btn-outline"
              size="small"
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicSearchDraft(dicEmptySearch);
                setDicSearchApplied(dicEmptySearch);
              }}
              disabled={blnSearchPanelFrozen}
            >
              {t("clear", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className="app-master-table-panel app-master-page-relative">
        {(blnLoading || blnRightsLoading) && !dicDialog.blnOpen ? (
          <PayrollGroupGridSkeleton />
        ) : !blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography className="app-master-empty-title">
              {t("group_access_denied", "You do not have access to Payroll Groups.")}
            </Typography>
            <Typography className="app-master-empty-help">
              {t("group_access_denied_help", "Contact your administrator if you believe this is a mistake.")}
            </Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName="payroll_groups"
            exportButtonClassName="app-btn app-btn-outline"
            showExportOptions={blnCanExport}
            testIdPrefix="payroll-groups.list"
            showPaginationSummary
            hideRowClickHint
            onRowClick={(dicRow) => {
              if (blnRightsLoading || blnLoading || blnSubmitting || (!blnCanEdit && !blnCanView)) return;
              const dicGroup = lstGroups.find((dicItem) => dicItem.intID === dicRow.id);
              if (dicGroup) openGroupEditor(blnCanEdit ? "edit" : "view", dicGroup);
            }}
            minTableWidth={800}
            emptyMessage={t("group_no_records", "No payroll groups found.")}
            toolbarLeft={(
              <Box className="app-master-toolbar-actions">
                {blnCanAdd ? (
                  <Button controlId="payroll-groups.list.add.button" className="app-btn app-btn-primary" startIcon={<AddRoundedIcon />} onClick={() => openGroupEditor("add")} disabled={blnLoading || blnRightsLoading}>
                    {t("group_add_button", "Add Payroll Group")}
                  </Button>
                ) : null}
              </Box>
            )}
            className="app-master-common-table-reset"
          />
        )}
        <BlockingLoader blnOpen={blnSubmitting} strLabel={t("group_processing", "Processing...")} intZIndex={1400} blnLocal />
      </Box>

      <CommonMasterDialog
        blnOpen={dicDialog.blnOpen}
        onClose={closeGroupEditor}
        onDialogClose={(_, strReason) => {
          if (strReason !== "backdropClick") {
            closeGroupEditor();
          }
        }}
        rootTestId="payroll-groups.dialog"
        cancelButtonTestId="payroll-groups.dialog.cancel.button"
        primaryButtonTestId="payroll-groups.dialog.save.button"
        strSecondaryButtonClassName="app-btn app-btn-outline"
        strPrimaryButtonClassName="app-btn app-btn-primary"
        strTitle={
          dicDialog.strMode === "add"
            ? t("group_add_title", "Add Payroll Group")
            : dicDialog.strMode === "view" || !blnCanEdit
              ? t("group_view_title", "View Payroll Group")
              : t("group_edit_title", "Edit Payroll Group")
        }
        strSecondaryLabel={dicDialog.strMode === "view" || !blnCanEdit ? t("close", "Close") : t("cancel", "Cancel")}
        strPrimaryLabel={t("group_save", "Save")}
        onPrimaryAction={() => objEditorRef.current?.save()}
        blnHidePrimary={dicDialog.strMode === "view" || !blnCanEdit}
        nodeTitleAction={
          <Box className={`${styles.switchRow} app-master-dialog-status-row`}>
            <ActiveStatusSwitch
              className="app-master-dialog-status-switch"
              testId="payroll-groups.dialog.active.switch"
              blnIsActive={objActiveState.blnIsActive}
              disabled={objActiveState.blnDisabled}
              onChange={(blnChecked) => objEditorRef.current?.setActive(blnChecked)}
            />
            <Typography className={`${styles.switchLabel} app-master-dialog-status-text`}>
              {t("active", "Active")}
            </Typography>
            <IconButton aria-label={t("close", "Close")} onClick={closeGroupEditor} size="small" className="app-master-dialog-close-button app-master-dialog-close-button-spaced">
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Box>
        }
        paperClassName={`${styles.departmentDialogPaper} app-master-dialog-compact-buttons`}
        maxWidth={false}
        fullWidth={false}
        contentClassName="app-master-dialog-content-compact"
        nodeFooterStart={<Typography className="app-master-dialog-required-fields">{t("required_fields_hint", "Required fields are marked")} <Box component="span" className="app-master-dialog-required-asterisk">*</Box></Typography>}
        nodeContent={
          dicDialog.blnOpen ? (
            <PayrollGroupEditorPage
              ref={objEditorRef}
              strMode={dicDialog.strMode}
              strPayrollGroupID={dicDialog.strPayrollGroupID}
              blnEmbedded
              onActiveStateChange={setObjActiveState}
              onClose={closeGroupEditor}
              onSaved={(dicSavedRecord) => {
                closeGroupEditor();
                showToast(
                  dicDialog.strMode === "add"
                    ? t("group_create_success", "Payroll group created successfully.")
                    : t("group_update_success", "Payroll group updated successfully.")
                );
                loadPayrollGroups().catch(() => undefined);
              }}
            />
          ) : null
        }
      />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" className="app-master-toast-alert">
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
