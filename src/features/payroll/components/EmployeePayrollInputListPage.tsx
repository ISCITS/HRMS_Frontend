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
  Typography,
} from "@mui/material";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { MasterBreadcrumbs, MasterGridSkeleton, MasterStatusPill, dicMasterRowSx, onSearchEnter } from "@/components/master/MasterListUi";
import styles from "@/components/master/MasterScreen.module.css";
import { withBasePath } from "@/lib/basePath";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { employeePayrollInputService } from "@/features/payroll/services/employeePayrollInputService";
import type {
  EmployeePayrollInputListRecord,
  PayrollRunOption,
} from "@/features/payroll/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type SearchForm = {
  strSearchEmployee: string;
  intPayrollRunID: number | null;
  strStatus: "All" | "Draft" | "Submitted" | "Locked";
};

type ToastState = {
  blnOpen: boolean;
  strMessage: string;
  strSeverity: "success" | "error";
};

const dicEmptySearch: SearchForm = {
  strSearchEmployee: "",
  intPayrollRunID: null,
  strStatus: "All",
};
const lstEmployeePayrollInputModuleCodes = ["EMPLOYEE_PAYROLL_INPUT", "EMPLOYEE_PAYROLL_INPUTS", "PAYROLL_INPUT", "PAYROLL_INPUTS"];
function formatDate(strDate: string | null) {
  if (!strDate) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(strDate));
}

function formatNumber(decValue: number | null) {
  if (decValue === null) {
    return "-";
  }
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(decValue);
}

export default function EmployeePayrollInputListPage() {
  return (
    <Suspense fallback={<MasterGridSkeleton strControlId="employee-payroll-input.list.skeleton" intColumns={11} />}>
      <EmployeePayrollInputSearchPage />
    </Suspense>
  );
}

function EmployeePayrollInputSearchPage() {
  const objSearchParams = useSearchParams();
  const strRunID = objSearchParams.get("runId") ?? objSearchParams.get("intPayrollRunID");
  const intQueryRunID = strRunID && Number.isSafeInteger(Number(strRunID)) && Number(strRunID) > 0
    ? Number(strRunID)
    : null;
  return <EmployeePayrollInputList key={intQueryRunID ?? "all"} intInitialRunID={intQueryRunID} />;
}

function EmployeePayrollInputList({ intInitialRunID }: { intInitialRunID: number | null }) {
  const dicInitialSearch = useMemo(() => ({ ...dicEmptySearch, intPayrollRunID: intInitialRunID }), [intInitialRunID]);
  const { t } = useModuleLabels("employee-payroll-input");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstEmployeePayrollInputModuleCodes);
  const [lstInputs, setLstInputs] = useState<EmployeePayrollInputListRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [lstPayrollRuns, setLstPayrollRuns] = useState<PayrollRunOption[]>([]);
  const [blnRunsLoading, setBlnRunsLoading] = useState(true);
  const [strRunOptionsError, setStrRunOptionsError] = useState("");
  const [dicSearchDraft, setDicSearchDraft] =
    useState<SearchForm>(dicInitialSearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicInitialSearch);
  const [objToast, setObjToast] = useState<ToastState>({
    blnOpen: false,
    strMessage: "",
    strSeverity: "success",
  });
  const blnCanView = canViewAny() || canDoAny("list");
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanExport = canDoAny("export");

  const loadInputs = useCallback(async (objFilters: SearchForm) => {
    if (!blnCanView) {
      setLstInputs([]);
      setBlnLoading(false);
      return;
    }

    setBlnLoading(true);
    setStrError("");
    try {
      setLstInputs(
        await employeePayrollInputService.getEmployeePayrollInputs(objFilters)
      );
    } catch (objError) {
      setStrError(
        objError instanceof Error
          ? objError.message
          : "Unable to load payroll inputs."
      );
    } finally {
      setBlnLoading(false);
    }
  }, [blnCanView]);

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }

    loadInputs(dicInitialSearch).catch(() => undefined);
  }, [blnRightsLoading, dicInitialSearch, loadInputs]);

  useEffect(() => {
    if (blnRightsLoading || !blnCanView) return;
    let blnCancelled = false;
    employeePayrollInputService.getFormOptions()
      .then((dicOptions) => {
        if (!blnCancelled) {
          setLstPayrollRuns(dicOptions.lstPayrollRuns);
          setStrRunOptionsError("");
        }
      })
      .catch((objError: unknown) => {
        if (!blnCancelled) setStrRunOptionsError(objError instanceof Error ? objError.message : "Unable to load payroll runs.");
      })
      .finally(() => {
        if (!blnCancelled) setBlnRunsLoading(false);
      });
    return () => { blnCancelled = true; };
  }, [blnRightsLoading, blnCanView]);

  const lstFilteredRows = useMemo(() => {
    return lstInputs.filter((dicRow) => {
      const strEmployeeSearch = dicSearchApplied.strSearchEmployee.trim().toLowerCase();
      const blnEmployeeMatch =
        !strEmployeeSearch ||
        dicRow.strEmployeeCode.toLowerCase().includes(strEmployeeSearch) ||
        dicRow.strEmployeeName.toLowerCase().includes(strEmployeeSearch);
      const blnRunMatch =
        !dicSearchApplied.intPayrollRunID ||
        dicRow.intPayrollRunID === dicSearchApplied.intPayrollRunID;
      const blnStatusMatch =
        dicSearchApplied.strStatus === "All" ||
        dicRow.strStatus.toLowerCase() === dicSearchApplied.strStatus.toLowerCase();
      return blnEmployeeMatch && blnRunMatch && blnStatusMatch;
    });
  }, [dicSearchApplied, lstInputs]);

  function showToast(
    strMessage: string,
    strSeverity: ToastState["strSeverity"] = "success"
  ) {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  function navigateToFullScreen(strPath: string) {
    window.location.assign(withBasePath(strPath));
  }

  const openInput = useCallback((strRecordUUID: string) => {
    window.location.assign(withBasePath(`/payroll/employee-payroll-inputs/${strRecordUUID}/edit`));
  }, []);

  const lstTableRows = useMemo(
    () =>
      lstFilteredRows.map((dicRow) => ({
        id: dicRow.intID,
        strRecordUUID: dicRow.strRecordUUID,
        strEmployeeNameSort: dicRow.strEmployeeName,
        strEmployeeName: (
          <Link
            className="app-master-first-column-link"
            component="button"
            type="button"
            underline="none"
            data-controlid="employee-payroll-inputs.list.row.name.link"
            data-row-key={String(dicRow.intID)}
            onClick={(objEvent) => { objEvent.stopPropagation(); openInput(dicRow.strRecordUUID); }}
          >
            {dicRow.strEmployeeName}
          </Link>
        ),
        strEmployeeCode: dicRow.strEmployeeCode,
        strRunName: dicRow.strRunName,
        dtPayrollMonth: formatDate(dicRow.dtPayrollMonth),
        dtPayrollMonthSortValue: dicRow.dtPayrollMonth ? new Date(dicRow.dtPayrollMonth).getTime() : 0,
        strAttendanceSource:
          dicRow.strManualLwpSource === "CLIENT_PAYABLE_DAYS_IMPORT"
            ? t("source_client_import", "Client Payable Days Import")
            : dicRow.strManualLwpSource === "SYSTEM_ATTENDANCE"
            ? t("source_attendance", "Attendance & Leave Inputs")
            : dicRow.strManualLwpSource
              ? t("source_manual", "Manual")
              : t("source_not_set", "Not Set"),
        decPayableDays: formatNumber(dicRow.decPayableDays),
        decPayableDaysSortValue: Number(dicRow.decPayableDays ?? 0),
        decPaidDays: formatNumber(dicRow.decPaidDays),
        decPaidDaysSortValue: Number(dicRow.decPaidDays ?? 0),
        decLwpDays: formatNumber(dicRow.decLwpDays),
        decLwpDaysSortValue: Number(dicRow.decLwpDays ?? 0),
        decLopDays: formatNumber(dicRow.decLopDays),
        decLopDaysSortValue: Number(dicRow.decLopDays ?? 0),
        intAdjustmentLineCount: dicRow.intAdjustmentLineCount ?? 0,
        strStatus: <MasterStatusPill blnActive={dicRow.strStatus !== "Locked"} strActiveLabel={dicRow.strStatus} strInactiveLabel={dicRow.strStatus} />,
      })),
    [lstFilteredRows, t, openInput]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "strEmployeeName", headerName: t("employee_name", "Employee Name"), sortAccessor: (dicRow) => dicRow.strEmployeeNameSort },
      { field: "strEmployeeCode", headerName: t("employee_code", "Employee Code") },
      { field: "strRunName", headerName: t("payroll_run", "Payroll Run") },
      { field: "dtPayrollMonth", headerName: t("payroll_month", "Payroll Period"), sortAccessor: (dicRow) => dicRow.dtPayrollMonthSortValue },
      { field: "strAttendanceSource", headerName: t("attendance_source", "Attendance Source") },
      { field: "decPayableDays", headerName: t("payable_days", "Payable Days"), align: "right", sortAccessor: (dicRow) => dicRow.decPayableDaysSortValue },
      { field: "decPaidDays", headerName: t("paid_days", "Paid Days"), align: "right", sortAccessor: (dicRow) => dicRow.decPaidDaysSortValue },
      { field: "decLwpDays", headerName: t("lwp_days", "LWP"), align: "right", sortAccessor: (dicRow) => dicRow.decLwpDaysSortValue },
      { field: "decLopDays", headerName: t("lop_days", "LOP"), align: "right", sortAccessor: (dicRow) => dicRow.decLopDaysSortValue },
      { field: "intAdjustmentLineCount", headerName: t("adjustments", "Adjustments"), align: "right" },
      { field: "strStatus", headerName: t("status", "Status"), sortable: false, filterable: false, width: 130 },
    ],
    [t]
  );

  const blnBusy = blnLoading || blnRightsLoading;

  function applySearch() {
    if (blnBusy) return;
    setDicSearchApplied(dicSearchDraft);
    loadInputs(dicSearchDraft).catch(() => undefined);
  }

  return (
    <Box className={styles.page}>
      <MasterBreadcrumbs strSection={t("breadcrumb_section", "Payroll")} strTitle={t("breadcrumb_title", "Payroll Input")} />

      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Box
          className={styles.searchRow}
          aria-busy={blnBusy}
          onKeyDown={onSearchEnter(applySearch)}
          sx={{
            alignItems: "center",
            "&&": { gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "minmax(220px, 1fr) minmax(280px, 1.5fr) minmax(150px, 0.8fr) max-content max-content" } },
            "& .MuiButton-root": { alignSelf: "center", whiteSpace: "nowrap" },
          }}
        >
          <TextField
            className="app-mui-text-field"
            size="small"
            controlId="employee-payroll-input.list.employee-search.input"
            label={t("employee", "Employee")}
            value={dicSearchDraft.strSearchEmployee}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({
                ...dicPrevious,
                strSearchEmployee: objEvent.target.value,
              }))
            }
            placeholder={t(
              "employee_search_placeholder",
              "Search by employee code or name"
            )}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }}
            disabled={blnBusy}
            fullWidth
          />
          <TextField
            className="app-mui-text-field"
            size="small"
            select
            controlId="employee-payroll-input.list.payroll-run.select"
            label={t("payroll_run", "Payroll Run")}
            value={dicSearchDraft.intPayrollRunID ?? ""}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({
                ...dicPrevious,
                intPayrollRunID: objEvent.target.value ? Number(objEvent.target.value) : null,
              }))
            }
            disabled={blnBusy || blnRunsLoading}
            fullWidth
          >
            <MenuItem value="">{t("all_payroll_runs", "All payroll runs")}</MenuItem>
            {dicSearchDraft.intPayrollRunID && !lstPayrollRuns.some((dicRun) => dicRun.intID === dicSearchDraft.intPayrollRunID) ? (
              <MenuItem value={dicSearchDraft.intPayrollRunID}>
                {t("payroll_run", "Payroll Run")} #{dicSearchDraft.intPayrollRunID}
              </MenuItem>
            ) : null}
            {lstPayrollRuns.map((dicRun) => (
              <MenuItem key={dicRun.intID} value={dicRun.intID}>
                {dicRun.strLabel} ({dicRun.strCode})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            className="app-mui-text-field"
            size="small"
            select
            label={t("status", "Status")}
            value={dicSearchDraft.strStatus}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({
                ...dicPrevious,
                strStatus: objEvent.target.value as SearchForm["strStatus"],
              }))
            }
            disabled={blnBusy}
            fullWidth
          >
            <MenuItem value="All">{t("status_all", "All statuses")}</MenuItem>
            <MenuItem value="Draft">{t("status_draft", "Draft")}</MenuItem>
            <MenuItem value="Submitted">{t("status_submitted", "Submitted")}</MenuItem>
            <MenuItem value="Locked">{t("status_locked", "Locked")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button
              controlId="employee-payroll-input.list.search.button"
              className={styles.primaryButton}
              startIcon={<SearchRoundedIcon />}
              onClick={applySearch}
              disabled={blnBusy}
            >
              {t("search", "Search")}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button
              controlId="employee-payroll-input.list.clear.button"
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicSearchDraft(dicEmptySearch);
                setDicSearchApplied(dicEmptySearch);
                loadInputs(dicEmptySearch).catch(() => undefined);
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
      {strRunOptionsError ? <Alert severity="error">{strRunOptionsError}</Alert> : null}

      <Box className={styles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {blnBusy ? (
          <MasterGridSkeleton strControlId="employee-payroll-input.list.skeleton" intColumns={11} />
        ) : !blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("access_denied", "Payroll input access is not available for your user group.")}</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>{t("access_denied_help", "Contact your administrator if you need payroll input visibility.")}</Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName="employee-payroll-inputs"
            showExportOptions={blnCanExport}
            showPaginationSummary
            emptyMessage={t("empty_message", "No payroll inputs found for the current filters.")}
            testIdPrefix="employee-payroll-input.list"
            toolbarLeft={blnCanAdd ? (
              <Button
                controlId="employee-payroll-input.list.add.button"
                className={styles.primaryButton}
                startIcon={<AddRoundedIcon />}
                onClick={() => navigateToFullScreen("/payroll/employee-payroll-inputs/new")}
              >
                {t("employee_payroll_input_add_button", "Add Payroll Input")}
              </Button>
            ) : undefined}
            onRowClick={(dicRow) => openInput(dicRow.strRecordUUID)}
            minTableWidth={1300}
            hideRowClickHint
            getRowSx={() => dicMasterRowSx}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        )}
      </Box>

      <Snackbar
        open={objToast.blnOpen}
        autoHideDuration={3200}
        onClose={() =>
          setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }))
        }
      >
        <Alert severity={objToast.strSeverity} variant="filled">
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
