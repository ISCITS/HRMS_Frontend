"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, CircularProgress, MenuItem, Snackbar, Stack, TextField, Typography } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import { useLeavePlans } from "@/features/leave-plan/hooks/useLeavePlans";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useActionRights } from "@/features/security/hooks/useActionRights";
import type { LeavePlan, LeavePlanFilters } from "@/features/leave-plan/types/LeavePlanTypes";

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };
type SearchForm = { search: string; status: "all" | "active" | "inactive"; effectiveOn: string };
type ConfirmState = { strTitle: string; strMessage: string; strConfirmLabel: string; fnOnConfirm: () => Promise<void> } | null;

const dicEmptySearch: SearchForm = { search: "", status: "all", effectiveOn: "" };

function formatDate(strValue: string | null): string {
  if (!strValue) return "—";
  const objDate = new Date(`${strValue}T00:00:00`);
  return Number.isNaN(objDate.getTime()) ? strValue : new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(objDate);
}

function StatusPill({ blnActive, strActive, strInactive }: { blnActive: boolean; strActive: string; strInactive: string }) {
  return (
    <span className={`${styles.statusPill} ${blnActive ? styles.statusActive : styles.statusInactive}`}>
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
    search: objSearchParams.get("search") ?? "",
    status: (objSearchParams.get("status") as SearchForm["status"]) || "all",
    effectiveOn: objSearchParams.get("effectiveOn") ?? "",
  });
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicSearchDraft);
  const [objConfirm, setObjConfirm] = useState<ConfirmState>(null);
  const [blnSaving, setBlnSaving] = useState(false);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  const objFilters = useMemo<LeavePlanFilters>(() => ({
    strSearch: dicSearchApplied.search.trim() || undefined,
    blnIsActive: dicSearchApplied.status === "all" ? undefined : dicSearchApplied.status === "active",
    dtEffectiveOn: dicSearchApplied.effectiveOn || undefined,
  }), [dicSearchApplied]);

  const { lstPlans, blnLoading, strError, setPlanStatus } = useLeavePlans(objFilters);
  const blnCanView = canDo("LEAVE", "LEAVE_VIEW") || canDo("LEAVE_MANAGEMENT", "LEAVE_VIEW");
  const blnCanManage = canDo("LEAVE", "LEAVE_MANAGE") || canDo("LEAVE_MANAGEMENT", "LEAVE_MANAGE");

  function showToast(strMessage: string, strSeverity: "success" | "error") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  function applySearch(dicSearch: SearchForm) {
    const dicNext = { ...dicSearch, search: dicSearch.search.trim() };
    setDicSearchDraft(dicNext);
    setDicSearchApplied(dicNext);
  }

  function openEditor(objPlan?: LeavePlan, blnView = false) {
    const strPath = objPlan ? `/leave/plans/${objPlan.intID}` : "/leave/plans/new";
    objRouter.push(`${strPath}${blnView ? "?mode=view" : ""}`);
  }

  function confirmDeactivate(objPlan: LeavePlan) {
    setObjConfirm({
      strTitle: t("deactivate_title", "Deactivate Leave Plan"),
      strMessage: t("deactivate_confirm", "Deactivate this Leave Plan? Existing history remains available and it can be re-activated from the editor."),
      strConfirmLabel: t("deactivate", "Deactivate"),
      fnOnConfirm: async () => {
        await setPlanStatus(objPlan.intID, false);
        showToast(t("deactivated_success", "Leave plan deactivated successfully."), "success");
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
    const strHeader = [t("table_plan_code", "Plan Code"), t("table_plan_name", "Plan Name"), t("table_country", "Country"), t("table_effective_from", "Effective From"), t("table_effective_to", "Effective To"), t("table_assigned_employees", "Assigned Employees"), t("table_status", "Status")].join(",");
    const strRows = lstPlans.map((objPlan) => [objPlan.strPlanCode, objPlan.strDisplayName || objPlan.strPlanName, objPlan.strCountryCode, objPlan.dtEffectiveFrom, objPlan.dtEffectiveTo ?? "", objPlan.intAssignedEmployeeCount ?? 0, objPlan.blnIsActive ? t("status_active", "Active") : t("status_inactive", "Inactive")].map((strCell) => `"${String(strCell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const strUrl = URL.createObjectURL(new Blob([`﻿${strHeader}\n${strRows}`], { type: "text/csv;charset=utf-8" }));
    const objLink = document.createElement("a");
    objLink.href = strUrl;
    objLink.download = "leave_plans.csv";
    objLink.click();
    URL.revokeObjectURL(strUrl);
  }

  const lstPlanRows = useMemo(
    () =>
      lstPlans.map((objPlan) => ({
        id: objPlan.intID,
        action: (
          <CommonRowActions
            testIdPrefix={`leave-plan.list.row.${objPlan.intID}`}
            rowKey={objPlan.intID}
            blnCanView
            blnCanEdit={blnCanManage}
            blnCanDelete={blnCanManage && objPlan.blnIsActive}
            onView={() => openEditor(objPlan, true)}
            onEdit={() => openEditor(objPlan)}
            onDelete={() => confirmDeactivate(objPlan)}
          />
        ),
        strPlanCode: objPlan.strPlanCode,
        strPlanName: objPlan.strDisplayName || objPlan.strPlanName,
        strCountryCode: objPlan.strCountryCode,
        strEffectiveFrom: formatDate(objPlan.dtEffectiveFrom),
        strEffectiveTo: formatDate(objPlan.dtEffectiveTo),
        intAssigned: objPlan.intAssignedEmployeeCount ?? 0,
        blnStatus: <StatusPill blnActive={objPlan.blnIsActive} strActive={t("status_active", "Active")} strInactive={t("status_inactive", "Inactive")} />,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lstPlans, blnCanManage],
  );

  const lstPlanColumns = useMemo<CommonTableColumn<(typeof lstPlanRows)[number]>[]>(
    () => [
      { field: "action", headerName: t("table_actions", "Actions"), sortable: false, filterable: false, exportable: false, width: 130 },
      { field: "strPlanCode", headerName: t("table_plan_code", "Plan Code"), width: 150 },
      { field: "strPlanName", headerName: t("table_plan_name", "Plan Name"), width: 220 },
      { field: "strCountryCode", headerName: t("table_country", "Country"), width: 100 },
      { field: "strEffectiveFrom", headerName: t("table_effective_from", "Effective From"), width: 140 },
      { field: "strEffectiveTo", headerName: t("table_effective_to", "Effective To"), width: 140 },
      { field: "intAssigned", headerName: t("table_assigned_employees", "Assigned Employees"), width: 160 },
      { field: "blnStatus", headerName: t("table_status", "Status"), sortable: false, width: 120 },
    ],
    [t],
  );

  const objTransparentTableSx = { p: 0, boxShadow: "none", background: "transparent" } as const;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, pb: 2 }}>
      {/* Search / filter card */}
      <Box className={styles.controlsCard}>
        <Box
          sx={{
            display: "grid",
            gap: 1.25,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
            alignItems: "center",
            mt: 1,
          }}
        >
          <TextField
            size="small"
            value={dicSearchDraft.search}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, search: objEvent.target.value }))}
            onKeyDown={(objEvent) => objEvent.key === "Enter" && applySearch(dicSearchDraft)}
            placeholder={t("search_placeholder", "Search plan code or name")}
            inputProps={{ "data-control-id": "leave-plan.list.search.input" }}
            fullWidth
          />
          <TextField
            select
            size="small"
            label={t("filter_status", "Status")}
            value={dicSearchDraft.status}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, status: objEvent.target.value as SearchForm["status"] }))}
            inputProps={{ "data-control-id": "leave-plan.list.status.select" }}
            fullWidth
          >
            <MenuItem value="all">{t("filter_all", "All")}</MenuItem>
            <MenuItem value="active">{t("status_active", "Active")}</MenuItem>
            <MenuItem value="inactive">{t("status_inactive", "Inactive")}</MenuItem>
          </TextField>
          <TextField
            type="date"
            size="small"
            label={t("filter_effective_on", "Effective On")}
            value={dicSearchDraft.effectiveOn}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, effectiveOn: objEvent.target.value }))}
            InputLabelProps={{ shrink: true }}
            inputProps={{ "data-control-id": "leave-plan.list.effective-on.input" }}
            fullWidth
          />
          <Box sx={{ display: "flex", gap: 1, gridColumn: { xs: "auto", lg: "span 3" }, justifyContent: { lg: "flex-end" } }}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => applySearch(dicSearchDraft)} disabled={blnLoading} data-control-id="leave-plan.list.search.button">
              {t("search", "Search")}
            </Button>
            <Button
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicSearchDraft(dicEmptySearch);
                setDicSearchApplied(dicEmptySearch);
              }}
              disabled={blnLoading}
              data-control-id="leave-plan.list.clear.button"
            >
              {t("clear", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      {strError ? <Alert severity="error">{strError}</Alert> : null}

      {blnLoading || blnRightsLoading ? (
        <Box sx={{ display: "grid", placeItems: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : !blnCanView ? (
        <Alert severity="warning">{t("access_denied", "Leave Plan access is not available for your user group.")}</Alert>
      ) : (
        <Box className={styles.tableCard} sx={{ flex: "0 0 auto" }}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a", px: 0.5, pt: 0.5 }}>{t("page_title", "Leave Plans")}</Typography>
          <CommonTable
            columns={lstPlanColumns}
            rows={lstPlanRows}
            rowIdField="id"
            defaultPageSize={10}
            pageSizeOptions={[10, 20, 50]}
            exportFileName="leave_plans"
            showPaginationSummary
            minTableWidth={1140}
            emptyMessage={t("empty_message", "No Leave Plans found.")}
            toolbarLeft={
              <Stack direction="row" spacing={1}>
                {blnCanManage ? (
                  <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openEditor()} data-control-id="leave-plan.list.add.button">
                    {t("add_button", "Add Leave Plan")}
                  </Button>
                ) : null}
                <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={exportCsv} disabled={!lstPlans.length} data-control-id="leave-plan.list.export.button">
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
