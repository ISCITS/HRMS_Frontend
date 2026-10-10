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
  Snackbar,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { MasterBreadcrumbs, MasterGridSkeleton, MasterStatusPill, dicMasterRowSx, onSearchEnter } from "@/components/master/MasterListUi";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { payrollCycleService } from "@/features/payroll-cycles/services/payrollCycleService";
import type { PayrollCycleListRecord } from "@/features/payroll-cycles/types";
import { setPayrollScheduleSelectedID } from "@/features/payroll-cycles/utils/payrollScheduleRouteState";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type Status = "Active" | "Inactive";
type SearchForm = {
  strName: string;
  strStatus: "All" | Status;
};
type ToastState = {
  blnOpen: boolean;
  strMessage: string;
  strSeverity: "success" | "error";
};

const lstPayrollCycleModuleCodes = ["PAYROLL_CYCLE", "PAYROLL_CYCLES", "MASTER_PAYROLL_CYCLE"];
const dicEmptySearch: SearchForm = { strName: "", strStatus: "All" };

export default function PayrollCycleListPage() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("payroll-cycles");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstPayrollCycleModuleCodes);
  const [lstCycles, setLstCycles] = useState<PayrollCycleListRecord[]>([]);
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  function openScheduleEditor(intPayrollCycleID: number, strMode: "edit" | "view" = "edit") {
    setPayrollScheduleSelectedID(intPayrollCycleID);
    objRouter.push("/payroll/schedules/edit");
  }

  async function loadPayrollCycles() {
    if (!canViewAny()) {
      setLstCycles([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      setLstCycles(await payrollCycleService.getPayrollCycles());
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : t("schedule_load_list_failed"), "error");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }
    loadPayrollCycles().catch(() => undefined);
  }, [blnRightsLoading]);

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanExport = canDoAny("export");
  const blnReadOnly = isReadOnly();

  const lstFilteredRows = useMemo(() => {
    return lstCycles.filter((dicRow) => {
      const blnNameMatch = !dicSearchApplied.strName || dicRow.strCycleName.toLowerCase().includes(dicSearchApplied.strName.toLowerCase());
      const blnStatusMatch =
        dicSearchApplied.strStatus === "All" ||
        (dicSearchApplied.strStatus === "Active" ? dicRow.blnIsActive : !dicRow.blnIsActive);
      return blnNameMatch && blnStatusMatch;
    });
  }, [dicSearchApplied, lstCycles]);

  const lstTableRows = useMemo(
    () =>
      lstFilteredRows.map((dicRow) => ({
        id: dicRow.intID,
        strCycleNameSort: dicRow.strCycleName,
        strCycleName: (
          <Link
            className="app-master-first-column-link"
            component="button"
            type="button"
            underline="none"
            data-controlid="payroll-cycles.list.row.name.link"
            data-row-key={String(dicRow.intID)}
            onClick={(objEvent) => { objEvent.stopPropagation(); openScheduleEditor(dicRow.intID, blnCanEdit ? "edit" : "view"); }}
          >
            {dicRow.strCycleName}
          </Link>
        ),
        strPayrollGroup: (
          <Box>
            <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>{dicRow.strPayrollGroupName ?? "-"}</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>{dicRow.strPayrollGroupCode ?? "-"}</Typography>
          </Box>
        ),
        strPeriodType: dicRow.strPeriodType,
        blnIsActive: <MasterStatusPill blnActive={dicRow.blnIsActive} strActiveLabel={t("active")} strInactiveLabel={t("inactive")} />,
      })),
    [blnCanEdit, lstFilteredRows, objRouter, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "strCycleName", headerName: t("schedule_name", "Payroll Schedule"), sortAccessor: (dicRow) => dicRow.strCycleNameSort },
      { field: "strPayrollGroup", headerName: t("payroll_group"), sortable: false, filterable: false, width: 220 },
      { field: "strPeriodType", headerName: t("period_type") },
      { field: "blnIsActive", headerName: t("status"), sortable: false, filterable: false, width: 130 },
    ],
    [t]
  );

  function showToast(strMessage: string, strSeverity: ToastState["strSeverity"] = "success") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  function closeToast() {
    setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }));
  }

  const blnBusy = blnLoading || blnRightsLoading;

  function applySearch() {
    if (blnBusy) return;
    setDicSearchApplied(dicSearchDraft);
  }

  return (
    <Box className={styles.page}>
      <MasterBreadcrumbs strSection={t("breadcrumb_section", "Payroll")} strTitle={t("breadcrumb_title", "Payroll Schedules")} />

      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Box
          className={styles.searchRow}
          aria-busy={blnBusy}
          onKeyDown={onSearchEnter(applySearch)}
          sx={{
            alignItems: "center",
            "&&": { gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "minmax(220px, 1.4fr) minmax(160px, 0.8fr) max-content max-content 1fr" } },
            "& .MuiButton-root": { alignSelf: "center", whiteSpace: "nowrap" },
          }}
        >
          <TextField className="app-mui-text-field" controlId="payroll-cycles.list.cycle-name.input" inputProps={{ "controlId": "payroll-cycles.list.cycle-name.input" }} label={t("schedule_name", "Payroll Schedule")} placeholder={t("search_schedule", "Search payroll schedule")} value={dicSearchDraft.strName} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strName: objEvent.target.value }))} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }} size="small" disabled={blnBusy} fullWidth />
          <TextField className="app-mui-text-field" controlId="payroll-cycles.list.search-status.select" inputProps={{ "controlId": "payroll-cycles.list.search-status.select" }} select label={t("status")} value={dicSearchDraft.strStatus} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: objEvent.target.value as SearchForm["strStatus"] }))} size="small" disabled={blnBusy} fullWidth>
            <MenuItem controlId="payroll-cycles.list.search-status.all.option" value="All">{t("all")}</MenuItem>
            <MenuItem controlId="payroll-cycles.list.search-status.active.option" value="Active">{t("active")}</MenuItem>
            <MenuItem controlId="payroll-cycles.list.search-status.inactive.option" value="Inactive">{t("inactive")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button controlId="payroll-cycles.list.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={applySearch} disabled={blnBusy}>
              {t("search")}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button
              controlId="payroll-cycles.list.clear.button"
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicSearchDraft(dicEmptySearch);
                setDicSearchApplied(dicEmptySearch);
              }}
              disabled={blnBusy}
            >
              {t("clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      {strRightsError && !blnCanView && !blnBusy ? <Alert severity="warning">{strRightsError}</Alert> : null}
      {blnReadOnly ? <Alert severity="info">{t("schedule_read_only_mode")}</Alert> : null}

      <Box className={styles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <BlockingLoader blnOpen={blnSubmitting} strLabel={t("schedule_processing")} />
        {blnBusy ? (
          <MasterGridSkeleton strControlId="payroll-cycles.list.skeleton" intColumns={4} />
        ) : !blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
              {t("schedule_access_denied")}
            </Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>
              {t("schedule_access_denied_help")}
            </Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName="payroll_cycles"
            showExportOptions={blnCanExport}
            testIdPrefix="payroll-cycles.list"
            showPaginationSummary
            emptyMessage={t("schedule_no_records")}
            toolbarLeft={blnCanAdd ? (
              <Button controlId="payroll-cycles.list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/payroll/schedules/add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>
                {t("schedule_add_button")}
              </Button>
            ) : undefined}
            onRowClick={(dicRow) => openScheduleEditor(dicRow.id, blnCanEdit ? "edit" : "view")}
            minTableWidth={760}
            hideRowClickHint
            getRowSx={() => dicMasterRowSx}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        )}
      </Box>

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
