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
      sx={{
        border: "1px solid #e8eef5",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: "#fff",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, px: 1.75, py: 1.25, flexWrap: "wrap" }}>
        <Skeleton variant="rounded" width={164} height={36} />
        <Box sx={{ display: "flex", gap: 1.25, alignItems: "center", flexWrap: "wrap" }}>
          <Skeleton variant="rounded" width={64} height={36} />
          <Skeleton variant="text" width={72} height={24} />
          <Skeleton variant="rounded" width={116} height={32} />
        </Box>
      </Box>
      <Box sx={{ minWidth: 800 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "110px 1fr 1.2fr 130px", bgcolor: "#edf3f9", borderTop: "1px solid #e8eef5", borderBottom: "1px solid #d9e3ee" }}>
          {[0, 1, 2, 3].map((intColumn) => (
            <Box key={intColumn} sx={{ px: 2, py: 1 }}>
              <Skeleton variant="text" width={intColumn === 0 ? 64 : intColumn === 3 ? 76 : 138} height={22} />
            </Box>
          ))}
        </Box>
        {Array.from({ length: intPayrollGroupSkeletonRows }).map((_, intIndex) => (
          <Box
            key={intIndex}
            sx={{
              display: "grid",
              gridTemplateColumns: "110px 1fr 1.2fr 130px",
              borderBottom: "1px solid #edf1f6",
              minHeight: 40,
              alignItems: "center",
            }}
          >
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="rounded" width={76} height={24} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${58 + (intIndex % 3) * 9}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${42 + (intIndex % 2) * 14}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="rounded" width={72} height={22} /></Box>
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
            data-control-id="payroll-groups.list.row.name.button"
            onClick={(objEvent) => {
              if (window.getSelection()?.toString()) {
                objEvent.stopPropagation();
                return;
              }
              openGroupEditor(blnCanEdit ? "edit" : "view", dicRow);
            }}
            sx={{ color: "#334155", cursor: "pointer", fontSize: "inherit", fontWeight: 500, textAlign: "left", textUnderlineOffset: "3px", userSelect: "text", WebkitUserSelect: "text", "&:hover": { color: "#0066df", textDecoration: "underline" }, "&:focus-visible": { outline: "2px solid #0066df", outlineOffset: 3 } }}
          >
            {dicRow.strPayrollGroupName}
          </Link>
        ),
        strDescription: dicRow.strDescription || "-",
        strStatusText: dicRow.blnIsActive ? "Active" : "Inactive",
        blnIsActive: (
          <span className={`${styles.statusPill} ${dicRow.blnIsActive ? styles.statusActive : styles.statusInactive}`}>
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
    <Box className={styles.page} sx={{ position: "relative" }}>
      <Breadcrumbs aria-label="breadcrumb" separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />} sx={{ fontSize: 13, py: 0.5, ml: "3px" }}>
        <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>{t("breadcrumb_masters", "Masters")}</Typography>
        <Typography component="h1" aria-current="page" sx={{ fontSize: "inherit", fontWeight: 700, color: "#243b53" }}>{t("breadcrumb_payroll_groups", "Payroll Groups")}</Typography>
      </Breadcrumbs>

      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {strRightsError ? (
          <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography>
        ) : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? (
          <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>
            {t("group_read_only_mode", "You have view-only access to Payroll Groups.")}
          </Typography>
        ) : null}
        <Box
          className={styles.searchRow}
          aria-busy={blnSearchPanelFrozen}
          sx={{
            alignItems: "center",
            "&&": { gridTemplateColumns: { xs: "1fr", md: "minmax(220px, 1.2fr) minmax(150px, 0.7fr) auto auto 1fr" } },
            "& .MuiButton-root": { alignSelf: "center" },
          }}
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
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }}
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
            <Button controlId="payroll-groups.list.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); }} disabled={blnSearchPanelFrozen}>
              {t("search", "Search")}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button
              controlId="payroll-groups.list.clear.button"
              className={styles.secondaryButton}
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

      <Box className={styles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {(blnLoading || blnRightsLoading) && !dicDialog.blnOpen ? (
          <PayrollGroupGridSkeleton />
        ) : !blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
              {t("group_access_denied", "You do not have access to Payroll Groups.")}
            </Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>
              {t("group_access_denied_help", "Contact your administrator if you believe this is a mistake.")}
            </Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName="payroll_groups"
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
            toolbarLeft={blnCanAdd ? (
              <Button controlId="payroll-groups.list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openGroupEditor("add")} disabled={blnLoading || blnRightsLoading}>
                {t("group_add_button", "Add Payroll Group")}
              </Button>
            ) : undefined}
            getRowSx={() => ({
              backgroundColor: "#fff",
              "&.MuiTableRow-hover:hover": { backgroundColor: "#f8fbff" },
              "&.MuiTableRow-hover:hover td:first-of-type .MuiLink-root": { textDecoration: "underline" },
            })}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
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
          <Box className={styles.switchRow} sx={{ minHeight: "auto", gap: 1, flexWrap: "nowrap" }}>
            <ActiveStatusSwitch
              testId="payroll-groups.dialog.active.switch"
              blnIsActive={objActiveState.blnIsActive}
              disabled={objActiveState.blnDisabled}
              sx={{
                width: 40,
                height: 22,
                p: 0,
                overflow: "visible",
                "& .MuiSwitch-switchBase": {
                  p: "3px",
                  color: "#fff",
                  transitionDuration: "180ms",
                  "&.Mui-checked": {
                    transform: "translateX(18px)",
                    color: "#fff",
                    "& + .MuiSwitch-track": { backgroundColor: "#00b86b", opacity: 1 },
                  },
                  "&.Mui-disabled": { color: "#fff", opacity: 0.7 },
                },
                "& .MuiSwitch-thumb": { width: 16, height: 16, boxShadow: "0 1px 3px rgba(15, 23, 42, 0.2)" },
                "& .MuiSwitch-track": { borderRadius: "11px", backgroundColor: "#98a2b3", opacity: 1, transition: "background-color 180ms" },
              }}
              onChange={(blnChecked) => objEditorRef.current?.setActive(blnChecked)}
            />
            <Typography className={styles.switchLabel} sx={{ fontSize: "12px !important", fontWeight: "600 !important", whiteSpace: "nowrap" }}>
              {t("active", "Active")}
            </Typography>
            <IconButton aria-label={t("close", "Close")} onClick={closeGroupEditor} size="small" sx={{ ml: 1, color: "#94a3b8" }}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Box>
        }
        paperClassName={styles.departmentDialogPaper}
        maxWidth={false}
        fullWidth={false}
        paperSx={{ "& .MuiButton-root": { fontSize: "12px !important", fontWeight: "600 !important" } }}
        contentSx={{ overflowX: "hidden", overflowY: "auto", px: "20px", py: "12px", borderColor: "#e5edf5" }}
        titleSx={{ px: 2.25, py: 1.25, fontSize: "16px", fontWeight: 700, maxHeight: 50 }}
        nodeFooterStart={<Typography sx={{ color: "#64748b", fontSize: "11px" }}>{t("required_fields_hint", "Required fields are marked")} <Box component="span" sx={{ color: "#dc2626" }}>*</Box></Typography>}
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
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
