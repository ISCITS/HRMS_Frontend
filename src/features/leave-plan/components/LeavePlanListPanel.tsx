"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, Checkbox, InputAdornment, Link, MenuItem, Snackbar, Stack, TextField, Typography } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type InputHTMLAttributes } from "react";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { dicMasterNameLinkSx, dicMasterRowSxAnyColumn, MasterBreadcrumbs, MasterGridSkeleton } from "@/components/master/MasterListUi";
import styles from "@/components/master/MasterScreen.module.css";
import { useLeavePlans } from "@/features/leave-plan/hooks/useLeavePlans";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useActionRights } from "@/features/security/hooks/useActionRights";
import type { LeavePlan, LeavePlanFilters } from "@/features/leave-plan/types/LeavePlanTypes";

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };
type SearchForm = { code: string; name: string; status: "all" | "active" | "inactive" };
type ConfirmState = { strTitle: string; strMessage: string; strConfirmLabel: string; fnOnConfirm: () => Promise<void> } | null;

const dicEmptySearch: SearchForm = { code: "", name: "", status: "all" };

function formatDate(strValue: string | null): string {
  if (!strValue) return "—";
  const objDate = new Date(`${strValue}T00:00:00`);
  return Number.isNaN(objDate.getTime()) ? strValue : new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(objDate);
}

function StatusPill({ blnActive, strActive, strInactive }: { blnActive: boolean; strActive: string; strInactive: string }) {
  return (
    <span className={`app-master-status-pill ${blnActive ? "app-master-status-active" : "app-master-status-inactive"}`}>
      {blnActive ? strActive : strInactive}
    </span>
  );
}

export default function LeavePlanListPanel() {
  const objRouter = useRouter();
  const objSearchParams = useSearchParams();
  const { t } = useModuleLabels("leave_plan");
  const { canDo, blnLoading: blnRightsLoading } = useActionRights();

  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>({
    code: objSearchParams.get("code") ?? "",
    name: objSearchParams.get("name") ?? "",
    status: (objSearchParams.get("status") as SearchForm["status"]) || "all",
  });
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicSearchDraft);
  const [objConfirm, setObjConfirm] = useState<ConfirmState>(null);
  const [blnSaving, setBlnSaving] = useState(false);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  const [lstSelectedIds, setLstSelectedIds] = useState<number[]>([]);

  // Status stays a server filter; plan code and plan name are matched client-side because the
  // API's single `search` param spans both fields and cannot answer them separately.
  const objFilters = useMemo<LeavePlanFilters>(() => ({
    blnIsActive: dicSearchApplied.status === "all" ? undefined : dicSearchApplied.status === "active",
  }), [dicSearchApplied]);

  const { lstPlans, blnLoading, strError, setPlanStatus, deletePlan } = useLeavePlans(objFilters);

  const lstFilteredPlans = useMemo(() => {
    const strCode = dicSearchApplied.code.trim().toLowerCase();
    const strName = dicSearchApplied.name.trim().toLowerCase();
    return lstPlans.filter((objPlan) => {
      const blnCode = !strCode || objPlan.strPlanCode.toLowerCase().includes(strCode);
      const blnName = !strName || (objPlan.strDisplayName || objPlan.strPlanName).toLowerCase().includes(strName);
      return blnCode && blnName;
    });
  }, [lstPlans, dicSearchApplied]);
  // The Leave Plans menu grants the generic action set (view/edit/add/...); older ESS-style
  // setups use the compound LEAVE_VIEW/LEAVE_MANAGE codes, so accept either.
  const blnCanView = canDo("LEAVE_PLANS", "VIEW") || canDo("LEAVE_PLANS", "LEAVE_VIEW");
  const blnCanManage = canDo("LEAVE_PLANS", "EDIT") || canDo("LEAVE_PLANS", "ADD") || canDo("LEAVE_PLANS", "LEAVE_MANAGE");

  function showToast(strMessage: string, strSeverity: "success" | "error") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  function applySearch(dicSearch: SearchForm) {
    const dicNext = { ...dicSearch, code: dicSearch.code.trim(), name: dicSearch.name.trim() };
    setDicSearchDraft(dicNext);
    setDicSearchApplied(dicNext);
  }

  function openEditor(objPlan?: LeavePlan, blnView = false) {
    const strPath = objPlan ? `/leave/plans/${objPlan.strRecordUUID}` : "/leave/plans/new";
    objRouter.push(strPath);
  }

  // ---- Multi/single row selection + bulk actions (mirrors Salary Components) ----
  const blnAllSelected = lstFilteredPlans.length > 0 && lstFilteredPlans.every((objPlan) => lstSelectedIds.includes(objPlan.intID));
  const blnSomeSelected = !blnAllSelected && lstFilteredPlans.some((objPlan) => lstSelectedIds.includes(objPlan.intID));

  function toggleSelection(intID: number) {
    setLstSelectedIds((lstPrev) => (lstPrev.includes(intID) ? lstPrev.filter((intValue) => intValue !== intID) : [...lstPrev, intID]));
  }

  function toggleSelectAll() {
    if (blnAllSelected) {
      setLstSelectedIds((lstPrev) => lstPrev.filter((intID) => !lstFilteredPlans.some((objPlan) => objPlan.intID === intID)));
      return;
    }
    setLstSelectedIds((lstPrev) => [...new Set([...lstPrev, ...lstFilteredPlans.map((objPlan) => objPlan.intID)])]);
  }

  function bulkStatus(blnActive: boolean) {
    setObjConfirm({
      strTitle: blnActive ? t("bulk_activate_title", "Activate Leave Plans") : t("bulk_deactivate_title", "Deactivate Leave Plans"),
      strMessage: (blnActive ? t("bulk_activate_confirm", "Activate {count} Leave Plan(s)?") : t("bulk_deactivate_confirm", "Deactivate {count} Leave Plan(s)?")).replace("{count}", String(lstSelectedIds.length)),
      strConfirmLabel: blnActive ? t("activate", "Activate") : t("deactivate", "Deactivate"),
      fnOnConfirm: async () => {
        await Promise.all(lstSelectedIds.map((intID) => setPlanStatus(intID, blnActive)));
        showToast(blnActive ? t("bulk_activate_success", "Leave plans activated successfully.") : t("bulk_deactivate_success", "Leave plans deactivated successfully."), "success");
        setLstSelectedIds([]);
      },
    });
  }

  function bulkDelete() {
    setObjConfirm({
      strTitle: t("bulk_delete_title", "Delete Leave Plans"),
      strMessage: t("bulk_delete_confirm", "Delete {count} Leave Plan(s)? Any assigned to employees cannot be deleted and must be deactivated instead.").replace("{count}", String(lstSelectedIds.length)),
      strConfirmLabel: t("delete", "Delete"),
      fnOnConfirm: async () => {
        await Promise.all(lstSelectedIds.map((intID) => deletePlan(intID)));
        showToast(t("bulk_delete_success", "Leave plans removed successfully."), "success");
        setLstSelectedIds([]);
      },
    });
  }

  async function executeConfirm() {
    if (!objConfirm) return;
    setBlnSaving(true);
    try {
      await objConfirm.fnOnConfirm();
    } catch (objError) {
      showToast((await createApiRequestError(objError)).message, "error");
    } finally {
      setBlnSaving(false);
      setObjConfirm(null);
    }
  }

  function exportCsv() {
    const strHeader = [t("table_plan_code", "Plan Code"), t("table_plan_name", "Plan Name"), t("table_effective_from", "Effective From"), t("table_effective_to", "Effective To"), t("table_assigned_employees", "Current Assigned Employees"), t("table_status", "Status")].join(",");
    const strRows = lstFilteredPlans.map((objPlan) => [objPlan.strPlanCode, objPlan.strDisplayName || objPlan.strPlanName, objPlan.dtEffectiveFrom, objPlan.dtEffectiveTo ?? "", objPlan.intAssignedEmployeeCount ?? 0, objPlan.blnIsActive ? t("status_active", "Active") : t("status_inactive", "Inactive")].map((strCell) => `"${String(strCell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const strUrl = URL.createObjectURL(new Blob([`﻿${strHeader}\n${strRows}`], { type: "text/csv;charset=utf-8" }));
    const objLink = document.createElement("a");
    objLink.href = strUrl;
    objLink.download = "leave_plans.csv";
    objLink.click();
    URL.revokeObjectURL(strUrl);
  }

  const lstPlanRows = useMemo(
    () =>
      lstFilteredPlans.map((objPlan) => ({
        id: objPlan.intID,
        select: (
          <Checkbox
            checked={lstSelectedIds.includes(objPlan.intID)}
            onChange={() => toggleSelection(objPlan.intID)}
            inputProps={{ "data-control-id": "leave-plan.list.row.select.checkbox", "data-row-key": String(objPlan.intID) } as InputHTMLAttributes<HTMLInputElement>}
          />
        ),
        strPlanNameText: objPlan.strDisplayName || objPlan.strPlanName,
        strPlanName: (
          <Link
            component="button"
            type="button"
            underline="none"
            className="app-master-first-column-link"
            data-control-id="leave-plan.list.row.name.button"
            onClick={(objEvent) => {
              if (window.getSelection()?.toString()) { objEvent.stopPropagation(); return; }
              openEditor(objPlan, !blnCanManage);
            }}
            sx={dicMasterNameLinkSx}
          >
            {objPlan.strDisplayName || objPlan.strPlanName}
          </Link>
        ),
        strPlanCode: objPlan.strPlanCode,
        strStatusText: objPlan.blnIsActive ? "Active" : "Inactive",
        strEffectiveFrom: formatDate(objPlan.dtEffectiveFrom),
        strEffectiveTo: formatDate(objPlan.dtEffectiveTo),
        intAssigned: objPlan.intAssignedEmployeeCount ?? 0,
        blnStatus: <StatusPill blnActive={objPlan.blnIsActive} strActive={t("status_active", "Active")} strInactive={t("status_inactive", "Inactive")} />,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lstFilteredPlans, blnCanManage, lstSelectedIds],
  );

  const lstPlanColumns = useMemo<CommonTableColumn<(typeof lstPlanRows)[number]>[]>(
    () => [
      {
        field: "select",
        headerName: (
          <Checkbox
            checked={blnAllSelected}
            indeterminate={blnSomeSelected}
            onChange={toggleSelectAll}
            disabled={lstFilteredPlans.length === 0}
            inputProps={{ "data-control-id": "leave-plan.list.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>}
          />
        ),
        sortable: false,
        filterable: false,
        exportable: false,
        width: 56,
      },
      { field: "strPlanName", headerName: t("table_plan_name", "Plan Name"), width: 220, sortAccessor: (dicRow) => String(dicRow.strPlanNameText) },
      { field: "strPlanCode", headerName: t("table_plan_code", "Plan Code"), width: 150 },
      { field: "strEffectiveFrom", headerName: t("table_effective_from", "Effective From"), width: 140 },
      { field: "strEffectiveTo", headerName: t("table_effective_to", "Effective To"), width: 140 },
      { field: "intAssigned", headerName: t("table_assigned_employees", "Current Assigned Employees"), width: 190 },
      { field: "blnStatus", headerName: t("table_status", "Status"), filterable: false, width: 120, sortAccessor: (dicRow) => String(dicRow.strStatusText) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, blnAllSelected, blnSomeSelected, lstFilteredPlans.length],
  );

  const objTransparentTableSx = { p: 0, boxShadow: "none", background: "transparent" } as const;

  return (
    <Box className={styles.page} sx={{ position: "relative" }}>
      <MasterBreadcrumbs strSection={t("breadcrumb_leave", "Leave Management")} strTitle={t("breadcrumb_leave_plans", "Leave Plans")} />
      {/* Search / filter card */}
      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Box
          className={styles.searchRow}
          aria-busy={blnLoading || blnRightsLoading}
          sx={{
            alignItems: "center",
            "&&": { gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "minmax(200px, 1.2fr) minmax(180px, 1fr) minmax(150px, 0.7fr) auto auto 1fr" } },
            "& .MuiButton-root": { alignSelf: "center" },
          }}
        >
          <TextField
            className="app-mui-text-field"
            size="small"
            label={t("table_plan_name", "Plan Name")}
            value={dicSearchDraft.name}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, name: objEvent.target.value }))}
            placeholder={t("search_name_placeholder", "Search plan name")}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }}
            inputProps={{ "data-control-id": "leave-plan.list.search-name.input" }}
            disabled={blnLoading || blnRightsLoading}
            fullWidth
          />
          <TextField
            className="app-mui-text-field"
            size="small"
            label={t("table_plan_code", "Plan Code")}
            value={dicSearchDraft.code}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, code: objEvent.target.value }))}
            placeholder={t("search_code_placeholder", "Search plan code")}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }}
            inputProps={{ "data-control-id": "leave-plan.list.search-code.input" }}
            disabled={blnLoading || blnRightsLoading}
            fullWidth
          />
          <TextField
            className="app-mui-text-field"
            select
            size="small"
            label={t("filter_status", "Status")}
            value={dicSearchDraft.status}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, status: objEvent.target.value as SearchForm["status"] }))}
            inputProps={{ "data-control-id": "leave-plan.list.status.select" }}
            disabled={blnLoading || blnRightsLoading}
            fullWidth
          >
            <MenuItem value="all">{t("filter_all", "All")}</MenuItem>
            <MenuItem value="active">{t("status_active", "Active")}</MenuItem>
            <MenuItem value="inactive">{t("status_inactive", "Inactive")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => applySearch(dicSearchDraft)} disabled={blnLoading || blnRightsLoading} data-control-id="leave-plan.list.search.button">
              {t("search", "Search")}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicSearchDraft(dicEmptySearch);
                setDicSearchApplied(dicEmptySearch);
              }}
              disabled={blnLoading || blnRightsLoading}
              data-control-id="leave-plan.list.clear.button"
            >
              {t("clear", "Clear")}
            </Button>
          </Box>
        </Box>
        {blnCanManage && lstSelectedIds.length > 0 ? (
          <Box className={styles.bulkBar} data-control-id="leave-plan.list.bulk-actions.bar">
            <Typography className={styles.bulkCount}>{`${lstSelectedIds.length} ${t("bulk_rows_selected", "rows selected")}`}</Typography>
            <Button className={styles.bulkActivate} onClick={() => bulkStatus(true)} disabled={blnSaving} data-control-id="leave-plan.list.bulk-activate.button">{t("activate", "Activate")}</Button>
            <Button className={styles.bulkDeactivate} onClick={() => bulkStatus(false)} disabled={blnSaving} data-control-id="leave-plan.list.bulk-deactivate.button">{t("deactivate", "Deactivate")}</Button>
            <Button className={styles.bulkDelete} onClick={bulkDelete} disabled={blnSaving} data-control-id="leave-plan.list.bulk-delete.button">{t("delete", "Delete")}</Button>
          </Box>
        ) : null}
      </Box>

      {strError ? <Alert severity="error">{strError}</Alert> : null}

      {blnLoading || blnRightsLoading ? (
        <MasterGridSkeleton strControlId="leave-plan.list.skeleton" intColumns={7} />
      ) : !blnCanView ? (
        <Alert severity="warning">{t("access_denied", "Leave Plan access is not available for your user group.")}</Alert>
      ) : (
        <Box className={styles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
          <CommonTable
            columns={lstPlanColumns}
            rows={lstPlanRows}
            rowIdField="id"
            exportFileName="leave_plans"
            showPaginationSummary
            minTableWidth={1196}
            hideRowClickHint
            onRowClick={(dicRow) => {
              if (!blnCanView) return;
              const objPlan = lstPlans.find((objItem) => objItem.intID === dicRow.id);
              if (objPlan) openEditor(objPlan, !blnCanManage);
            }}
            getRowSx={(dicRow) => ({ ...dicMasterRowSxAnyColumn, ...(lstSelectedIds.includes(dicRow.id) ? { backgroundColor: "rgba(37, 99, 235, 0.08)" } : {}) })}
            emptyMessage={t("empty_message", "No Leave Plans found.")}
            toolbarLeft={
              <Stack direction="row" spacing={1}>
                {blnCanManage ? (
                  <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openEditor()} data-control-id="leave-plan.list.add.button">
                    {t("add_button", "Add Leave Plan")}
                  </Button>
                ) : null}
                <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={exportCsv} disabled={!lstFilteredPlans.length} data-control-id="leave-plan.list.export.button">
                  {t("export_excel", "Export Excel")}
                </Button>
              </Stack>
            }
            testIdPrefix="leave-plan.list"
            sx={objTransparentTableSx}
          />
        </Box>
      )}

      <CommonConfirmDialog
        blnOpen={Boolean(objConfirm)}
        strTitle={objConfirm?.strTitle}
        strMessage={objConfirm?.strMessage}
        strCancelLabel={t("cancel", "Cancel")}
        strConfirmLabel={objConfirm?.strConfirmLabel ?? t("confirm", "Confirm")}
        blnConfirmDisabled={blnSaving}
        onClose={() => setObjConfirm(null)}
        onConfirm={executeConfirm}
      />

      <Snackbar
        open={objToast.blnOpen}
        autoHideDuration={5000}
        onClose={() => setObjToast((objPrev) => ({ ...objPrev, blnOpen: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={objToast.strSeverity} variant="filled" onClose={() => setObjToast((objPrev) => ({ ...objPrev, blnOpen: false }))}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
