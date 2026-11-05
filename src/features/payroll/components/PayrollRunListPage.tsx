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
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonSearchableSelect from "@/Common/components/CommonSearchableSelect";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { MasterBreadcrumbs, MasterGridSkeleton, MasterMoreFilters, dicMasterRowSx, onSearchEnter } from "@/components/master/MasterListUi";
import masterStyles from "@/components/master/MasterScreen.module.css";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { payrollRunService } from "@/features/payroll/services/payrollRunService";
import type { PayrollRunListRecord } from "@/features/payroll/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type SearchForm = {
  strSearch: string;
  strSearchMonth: string;
  strSearchGroup: string;
  strStatus: "All" | "DRAFT" | "VALIDATED" | "PROCESSED" | "FINALIZED" | "CANCELLED";
  strRunType: string;
};

const dicEmptySearch: SearchForm = {
  strSearch: "",
  strSearchMonth: "",
  strSearchGroup: "",
  strStatus: "All",
  strRunType: "All",
};

// REGULAR/VARIABLE_PAY are the two run types the user actually creates via the New Payroll Run
// form ("Regular Payroll" / "Seprate Payroll"); anything else is labeled generically so a future
// run type (e.g. off-cycle, final settlement) still shows up as a usable filter option.
function getRunTypeFilterLabel(strRunTypeCode: string): string {
  const dicLabels: Record<string, string> = {
    REGULAR: "Regular Payroll",
    VARIABLE_PAY: "Separate Payroll",
  };
  return (
    dicLabels[strRunTypeCode] ??
    strRunTypeCode
      .toLowerCase()
      .split("_")
      .map((strWord) => strWord.charAt(0).toUpperCase() + strWord.slice(1))
      .join(" ")
  );
}
const lstPayrollRunModuleCodes = ["PAYROLL_RUN", "PAYROLL_RUNS", "PAYROLL_PROCESS", "PAYROLL_PROCESSES"];

function formatMonth(strDate: string) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
  }).format(new Date(strDate));
}

function getStatusPillSx(strStatus: string) {
  const dicToneByStatus: Record<string, { background: string; color: string }> = {
    DRAFT: { background: "#2563eb", color: "#fff" },
    VALIDATED: { background: "#16a34a", color: "#fff" },
    PROCESSED: { background: "#0f766e", color: "#fff" },
    FINALIZED: { background: "#475569", color: "#fff" },
    CANCELLED: { background: "#dc2626", color: "#fff" },
  };
  return dicToneByStatus[strStatus] ?? { background: "#2563eb", color: "#fff" };
}

function getPayrollRunStatusLabel(strStatus: string) {
  const dicLabels: Record<string, string> = {
    DRAFT: "Draft",
    VALIDATED: "Validated",
    PROCESSED: "Processed",
    FINALIZED: "Finalized",
    CANCELLED: "Cancelled",
  };
  return dicLabels[strStatus] ?? strStatus;
}

export default function PayrollRunListPage() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("payroll-runs");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstPayrollRunModuleCodes);
  const [lstRuns, setLstRuns] = useState<PayrollRunListRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const blnCanView = canViewAny() || canDoAny("list");
  const blnCanAdd = canDoAny("add");
  const blnCanExport = canDoAny("export");
  const lstStatusOptions = useMemo(() => ([
    { intID: "All", strLabel: t("status_all", "All") },
    { intID: "DRAFT", strLabel: t("status_draft", "Draft") },
    { intID: "VALIDATED", strLabel: t("status_validated", "Validated") },
    { intID: "PROCESSED", strLabel: t("status_processed", "Processed") },
    { intID: "FINALIZED", strLabel: t("status_finalized", "Finalized") },
    { intID: "CANCELLED", strLabel: t("status_cancelled", "Cancelled") },
  ]), [t]);
  const lstRunTypeOptions = useMemo(() => {
    const setRunTypeCodes = new Set(lstRuns.map((dicRun) => dicRun.strRunTypeCode).filter(Boolean));
    return [
      { intID: "All", strLabel: t("run_type_all", "All") },
      ...Array.from(setRunTypeCodes)
        .sort()
        .map((strRunTypeCode) => ({ intID: strRunTypeCode, strLabel: getRunTypeFilterLabel(strRunTypeCode) })),
    ];
  }, [lstRuns, t]);

  async function loadRuns(objFilters: SearchForm = dicSearchApplied) {
    if (!blnCanView) {
      setLstRuns([]);
      setBlnLoading(false);
      return;
    }

    setBlnLoading(true);
    setStrError("");
    try {
      setLstRuns(await payrollRunService.getPayrollRuns(objFilters));
    } catch (objError) {
      setStrError(
        objError instanceof Error
          ? objError.message
          : "Unable to load payroll runs."
      );
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }

    loadRuns().catch(() => undefined);
  }, [blnRightsLoading, blnCanView]);

  const lstFilteredRows = useMemo(() => {
    const strSearch = dicSearchApplied.strSearch.trim().toLowerCase();
    const strMonthSearch = dicSearchApplied.strSearchMonth.trim().toLowerCase();
    const strGroupSearch = dicSearchApplied.strSearchGroup.trim().toLowerCase();
    return lstRuns.filter((dicRow) => {
      const blnSearchMatch =
        !strSearch ||
        dicRow.strRunName.toLowerCase().includes(strSearch);
      const blnMonthMatch =
        !strMonthSearch ||
        formatMonth(dicRow.dtPayrollMonth).toLowerCase().includes(strMonthSearch);
      const blnGroupMatch =
        !strGroupSearch ||
        (dicRow.strPayrollGroupName ?? "").toLowerCase().includes(strGroupSearch) ||
        (dicRow.strPayrollScheduleName ?? "").toLowerCase().includes(strGroupSearch);
      const blnStatusMatch =
        dicSearchApplied.strStatus === "All" ||
        dicRow.strRunStatus === dicSearchApplied.strStatus;
      const blnRunTypeMatch =
        dicSearchApplied.strRunType === "All" ||
        dicRow.strRunTypeCode === dicSearchApplied.strRunType;
      return blnSearchMatch && blnMonthMatch && blnGroupMatch && blnStatusMatch && blnRunTypeMatch;
    });
  }, [dicSearchApplied, lstRuns]);

  function openRun(strRecordUUID: string) {
    objRouter.push(`/payroll/runs/${strRecordUUID}`);
  }

  const lstTableRows = useMemo(
    () =>
      lstFilteredRows.map((dicRow) => ({
        id: dicRow.intID,
        strRecordUUID: dicRow.strRecordUUID,
        strRunNameSort: dicRow.strRunName,
        strRunName: (
          <Link
            className="app-master-first-column-link"
            component="button"
            type="button"
            underline="none"
            data-controlid="payroll-runs.list.row.name.link"
            data-row-key={String(dicRow.intID)}
            onClick={(objEvent) => { objEvent.stopPropagation(); openRun(dicRow.strRecordUUID); }}
          >
            {dicRow.strRunName}
          </Link>
        ),
        dtPayrollMonth: formatMonth(dicRow.dtPayrollMonth),
        strPayrollSchedule: dicRow.strPayrollGroupName ?? dicRow.strPayrollScheduleName ?? "-",
        intInputCount: dicRow.dicSummary.intInputCount,
        strRunStatus: (
          <span className={styles.statusPill} style={getStatusPillSx(dicRow.strRunStatus)}>
            {getPayrollRunStatusLabel(dicRow.strRunStatus)}
          </span>
        ),
        dtLastProcessedOn: dicRow.dtLastExecutedOn
          ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(dicRow.dtLastExecutedOn))
          : "-",
      })),
    [lstFilteredRows, objRouter, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "strRunName", headerName: t("run_name", "Payroll Run"), sortAccessor: (dicRow) => dicRow.strRunNameSort },
      { field: "dtPayrollMonth", headerName: t("payroll_month", "Payroll Period") },
      { field: "strPayrollSchedule", headerName: t("payroll_group", "Payroll Schedule / Group") },
      { field: "intInputCount", headerName: t("inputs", "Employees"), align: "right" },
      { field: "strRunStatus", headerName: t("status", "Status"), sortable: false, filterable: false, width: 140 },
      { field: "dtLastProcessedOn", headerName: t("last_processed_on", "Last Processed On") },
    ],
    [t]
  );

  const blnBusy = blnLoading || blnRightsLoading;
  const intActiveMoreFilters = (dicSearchDraft.strSearchGroup.trim() ? 1 : 0) + (dicSearchDraft.strRunType !== "All" ? 1 : 0);

  function applySearch() {
    if (blnBusy) return;
    setDicSearchApplied(dicSearchDraft);
    loadRuns(dicSearchDraft).catch(() => undefined);
  }

  return (
    <Box className={masterStyles.page}>
      <MasterBreadcrumbs strSection={t("breadcrumb_section", "Payroll")} strTitle={t("breadcrumb_title", "Payroll Runs")} />

      <Box className={masterStyles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Box
          className={masterStyles.searchRow}
          aria-busy={blnBusy}
          onKeyDown={onSearchEnter(applySearch)}
          sx={{
            alignItems: "center",
            "&&": { gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "minmax(200px, 1.3fr) minmax(160px, 1fr) minmax(160px, 1fr) max-content max-content max-content" } },
            "& .MuiButton-root": { alignSelf: "center", whiteSpace: "nowrap" },
          }}
        >
          <TextField
            className="app-mui-text-field"
            size="small"
            controlId="payroll-runs.list.search.input"
            label={t("run_name", "Payroll Run")}
            value={dicSearchDraft.strSearch}
            onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearch: objEvent.target.value }))}
            placeholder={t("search_placeholder", "Search by run name")}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }}
            disabled={blnBusy}
            fullWidth
          />
          <TextField
            className="app-mui-text-field"
            size="small"
            label={t("payroll_month", "Payroll Period")}
            value={dicSearchDraft.strSearchMonth}
            onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchMonth: objEvent.target.value }))}
            placeholder={t("month_placeholder", "Search payroll period")}
            disabled={blnBusy}
            fullWidth
          />
          <CommonSearchableSelect
            className="app-mui-text-field"
            controlId="payroll-runs.list.search-status.select"
            label={t("status", "Status")}
            value={dicSearchDraft.strStatus}
            options={lstStatusOptions}
            onChange={(value) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: (value || "All") as SearchForm["strStatus"] }))}
            size="small"
            disabled={blnBusy}
            fullWidth
          />
          <MasterMoreFilters
            strControlPrefix="payroll-runs.list"
            intActiveCount={intActiveMoreFilters}
            blnDisabled={blnBusy}
            onApply={applySearch}
            onClearAll={() => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchGroup: "", strRunType: "All" }))}
            onCancel={() => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchGroup: dicSearchApplied.strSearchGroup, strRunType: dicSearchApplied.strRunType }))}
          >
            <TextField
              className="app-mui-text-field"
              size="small"
              controlId="payroll-runs.list.search-group.input"
              label={t("payroll_group", "Payroll Group")}
              value={dicSearchDraft.strSearchGroup}
              onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchGroup: objEvent.target.value }))}
              placeholder={t("group_placeholder", "Search payroll group")}
              fullWidth
            />
            <CommonSearchableSelect
              className="app-mui-text-field"
              controlId="payroll-runs.list.search-run-type.select"
              label={t("run_type", "Run Type")}
              value={dicSearchDraft.strRunType}
              options={lstRunTypeOptions}
              onChange={(value) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strRunType: value || "All" }))}
              size="small"
              fullWidth
            />
          </MasterMoreFilters>
          <Box className={masterStyles.searchActions}>
            <Button controlId="payroll-runs.list.search.button" className={masterStyles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={applySearch} disabled={blnBusy}>
              {t("search", "Search")}
            </Button>
          </Box>
          <Box className={masterStyles.searchActions}>
            <Button
              controlId="payroll-runs.list.clear.button"
              className={masterStyles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicSearchDraft(dicEmptySearch);
                setDicSearchApplied(dicEmptySearch);
                loadRuns(dicEmptySearch).catch(() => undefined);
              }}
              disabled={blnBusy}
            >
              {t("clear", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      {strRightsError ? <Alert severity="warning">{strRightsError}</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}

      <Box className={masterStyles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {blnBusy ? (
          <MasterGridSkeleton strControlId="payroll-runs.list.skeleton" intColumns={6} />
        ) : !blnCanView ? (
          <Box className={masterStyles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("access_denied", "Payroll run access is not available for your user group.")}</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>{t("access_denied_help", "Contact your administrator if you need payroll run visibility.")}</Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName="payroll-runs"
            showExportOptions={blnCanExport}
            showPaginationSummary
            emptyMessage={t("empty_message", "No payroll runs found for the current filters.")}
            testIdPrefix="payroll-runs.list"
            toolbarLeft={blnCanAdd ? (
              <Button
                controlId="payroll-runs.list.add.button"
                className={masterStyles.primaryButton}
                startIcon={<AddRoundedIcon />}
                onClick={() => objRouter.push("/payroll/runs/new")}
              >
                {t("add_button", "Add Payroll Run")}
              </Button>
            ) : undefined}
            onRowClick={(dicRow) => openRun(dicRow.strRecordUUID)}
            minTableWidth={900}
            hideRowClickHint
            getRowSx={() => dicMasterRowSx}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        )}
      </Box>
    </Box>
  );
}
