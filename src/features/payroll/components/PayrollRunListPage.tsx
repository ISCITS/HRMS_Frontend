"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import CommonRowActions from "@/components/master/CommonRowActions";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { payrollRunService } from "@/features/payroll/services/payrollRunService";
import type { PayrollRunListRecord } from "@/features/payroll/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type SearchForm = {
  strSearch: string;
  strSearchMonth: string;
  strStatus: "All" | "Open" | "Approved" | "Failed" | "Processed" | "Closed";
};

const dicEmptySearch: SearchForm = {
  strSearch: "",
  strSearchMonth: "",
  strStatus: "All",
};
const lstPayrollRunModuleCodes = ["PAYROLL_RUN", "PAYROLL_RUNS", "PAYROLL_PROCESS", "PAYROLL_PROCESSES"];

function formatMonth(strDate: string) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
  }).format(new Date(strDate));
}

function getStatusPillSx(strStatus: string) {
  const dicToneByStatus: Record<string, { background: string; color: string }> = {
    Open: { background: "#2563eb", color: "#fff" },
    Submitted: { background: "#ea580c", color: "#fff" },
    Approved: { background: "#16a34a", color: "#fff" },
    Failed: { background: "#dc2626", color: "#fff" },
    Processed: { background: "#0f766e", color: "#fff" },
    Closed: { background: "#475569", color: "#fff" },
  };
  return dicToneByStatus[strStatus] ?? { background: "#2563eb", color: "#fff" };
}

function getPayrollRunStatusLabel(strStatus: string) {
  const dicLabels: Record<string, string> = {
    Open: "Draft",
    Approved: "Approved",
    Failed: "Failed",
    Processed: "Processed",
    Closed: "Closed",
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
    return lstRuns.filter((dicRow) => {
      const blnSearchMatch =
        !strSearch ||
        dicRow.strRunCode.toLowerCase().includes(strSearch) ||
        dicRow.strRunName.toLowerCase().includes(strSearch);
      const blnMonthMatch =
        !strMonthSearch ||
        formatMonth(dicRow.dtPayrollMonth).toLowerCase().includes(strMonthSearch);
      const blnStatusMatch =
        dicSearchApplied.strStatus === "All" ||
        dicRow.strRunStatus === dicSearchApplied.strStatus;
      return blnSearchMatch && blnMonthMatch && blnStatusMatch;
    });
  }, [dicSearchApplied, lstRuns]);

  const lstTableRows = useMemo(
    () =>
      lstFilteredRows.map((dicRow) => ({
        id: dicRow.intID,
        action: (
          <CommonRowActions
            testIdPrefix="payroll-runs.list.row"
            rowKey={dicRow.intID}
            blnCanView={blnCanView}
            onView={() => objRouter.push(`/payroll/runs/${dicRow.intID}`)}
          />
        ),
        strRunName: dicRow.strRunName,
        dtPayrollMonth: formatMonth(dicRow.dtPayrollMonth),
        intInputCount: dicRow.dicSummary.intInputCount,
        strRunStatus: (
          <span className={styles.statusPill} style={getStatusPillSx(dicRow.strRunStatus)}>
            {getPayrollRunStatusLabel(dicRow.strRunStatus)}
          </span>
        ),
        blnIsLocked: dicRow.blnIsLocked ? t("yes", "Yes") : t("no", "No"),
        intProcessedCount: dicRow.dicSummary.intProcessedCount,
      })),
    [blnCanView, lstFilteredRows, objRouter, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "action", headerName: t("actions", "Actions"), sortable: false, filterable: false, exportable: false, width: 110 },
      { field: "strRunName", headerName: t("run_name", "Payroll Run") },
      { field: "dtPayrollMonth", headerName: t("payroll_month", "Payroll Month") },
      { field: "intInputCount", headerName: t("inputs", "Employees"), align: "right" },
      { field: "strRunStatus", headerName: t("status", "Status"), sortable: false, filterable: false, width: 140 },
      { field: "blnIsLocked", headerName: t("locked", "Locked") },
      { field: "intProcessedCount", headerName: t("submitted", "Processed"), align: "right" },
    ],
    [t]
  );

  if (blnLoading || blnRightsLoading) {
    return <BlockingLoader blnOpen strLabel={t("loading_runs", "Loading payroll runs...")} />;
  }

  return (
    <Box className={styles.page}>
      <Typography className={`${styles.breadcrumbs} ${styles.hiddenHeader}`}>
        {t("breadcrumbs", "Payroll / Payroll Runs")}
      </Typography>

      <Box className={styles.controlsCard}>
        <Box className={`${styles.searchRow} ${styles.payrollRunSearchRow}`}>
          <TextField
            controlId="payroll-runs.list.search.input"
            value={dicSearchDraft.strSearch}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({
                ...dicPrevious,
                strSearch: objEvent.target.value,
              }))
            }
            placeholder={t("search_placeholder", "Search by run code or name")}
            fullWidth
          />
          <TextField
            value={dicSearchDraft.strSearchMonth}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({
                ...dicPrevious,
                strSearchMonth: objEvent.target.value,
              }))
            }
            placeholder={t("month_placeholder", "Search payroll month")}
            fullWidth
          />
          <TextField
            select
            label={t("status", "Status")}
            value={dicSearchDraft.strStatus}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({
                ...dicPrevious,
                strStatus: objEvent.target.value as SearchForm["strStatus"],
              }))
            }
            fullWidth
          >
            <MenuItem value="All">{t("status_all", "All")}</MenuItem>
            <MenuItem value="Open">{t("status_open", "Draft")}</MenuItem>
            <MenuItem value="Approved">{t("status_approved", "Approved")}</MenuItem>
            <MenuItem value="Failed">{t("status_failed", "Failed")}</MenuItem>
            <MenuItem value="Processed">{t("status_processed", "Processed")}</MenuItem>
            <MenuItem value="Closed">{t("status_closed", "Closed")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button
              controlId="payroll-runs.list.search.button"
              className={styles.primaryButton}
              startIcon={<SearchRoundedIcon />}
              onClick={() => {
                setDicSearchApplied(dicSearchDraft);
                loadRuns(dicSearchDraft).catch(() => undefined);
              }}
            >
              {t("search", "Search")}
            </Button>
            <Button
              controlId="payroll-runs.list.clear.button"
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicSearchDraft(dicEmptySearch);
                setDicSearchApplied(dicEmptySearch);
                loadRuns(dicEmptySearch).catch(() => undefined);
              }}
            >
              {t("clear", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard}>
        {strRightsError ? <Alert severity="warning" sx={{ mb: 1.5 }}>{strRightsError}</Alert> : null}
        {strError ? <Alert severity="error" sx={{ mb: 1.5 }}>{strError}</Alert> : null}
        {!blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("access_denied", "Payroll run access is not available for your user group.")}</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>{t("access_denied_help", "Contact your administrator if you need payroll run visibility.")}</Typography>
          </Box>
        ) : null}
        {blnCanView ? (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            defaultPageSize={10}
            pageSizeOptions={[10, 20, 50]}
            exportFileName="payroll-runs"
            showExportOptions={blnCanExport}
            showPaginationSummary
            emptyMessage={t("empty_message", "No payroll runs found for the current filters.")}
            testIdPrefix="payroll-runs.list"
            toolbarLeft={blnCanAdd ? (
              <Button
                controlId="payroll-runs.list.add.button"
                className={styles.primaryButton}
                startIcon={<AddRoundedIcon />}
                onClick={() => objRouter.push("/payroll/runs/new")}
              >
                {t("add_button", "Add Payroll Run")}
              </Button>
            ) : undefined}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        ) : null}
      </Box>
    </Box>
  );
}
