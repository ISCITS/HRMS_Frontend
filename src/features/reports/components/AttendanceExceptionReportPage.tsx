"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Autocomplete, Box, Breadcrumbs, Button, Divider, IconButton, Popover, TextField, Typography } from "@mui/material";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useReportFilterOptions } from "../hooks/useReportFilterOptions";
import { leaveAttendanceReportService, type AttendanceExceptionRow } from "../services/leaveAttendanceReportService";
import type { ReportFilterOption } from "./ReportGridPage";

type SearchForm = {
  strFromDate: string;
  strToDate: string;
  strStatus: string;
  strSeverity: string;
  strExceptionType: string;
  strEmployeeID: string;
  strDepartmentID: string;
};

type DisplayRow = Record<string, ReactNode> & { intID: number };
type MoreFiltersForm = Pick<SearchForm, "strExceptionType" | "strEmployeeID" | "strDepartmentID">;

const dicDefaultSearch: SearchForm = {
  strFromDate: "",
  strToDate: "",
  strStatus: "OPEN,UNDER_REVIEW",
  strSeverity: "",
  strExceptionType: "",
  strEmployeeID: "",
  strDepartmentID: "",
};

const lstRowsPerPageOptions = [10, 20, 50];

function toCsvValue(objValue: unknown) {
  return `"${String(objValue ?? "").replace(/"/g, '""')}"`;
}

function csvTimestamp() {
  const objNow = new Date();
  const fnPad = (intValue: number) => String(intValue).padStart(2, "0");
  return `${objNow.getFullYear()}${fnPad(objNow.getMonth() + 1)}${fnPad(objNow.getDate())}_${fnPad(objNow.getHours())}${fnPad(objNow.getMinutes())}${fnPad(objNow.getSeconds())}`;
}

function downloadCsv(strFileName: string, lstRows: AttendanceExceptionRow[]) {
  const lstHeaders = ["Date", "Employee Code", "Employee", "Exception Type", "Severity", "Status", "Message", "Detected", "Assigned To", "Ageing (d)", "Reg. Ref", "Resolution"];
  const lstLines = [
    lstHeaders.map(toCsvValue).join(","),
    ...lstRows.map((dicRow) => [
      dicRow.dtWorkDate ?? "",
      dicRow.strEmployeeCode,
      dicRow.strEmployeeName,
      dicRow.strExceptionType,
      dicRow.strSeverity,
      dicRow.strStatus,
      dicRow.strMessage,
      dicRow.dtDetectedOn ? dicRow.dtDetectedOn.slice(0, 10) : "",
      dicRow.strAssignedTo ?? "",
      dicRow.intAgeingDays ?? "",
      dicRow.intRegularizationRequestID ?? "",
      dicRow.strResolutionCode ?? "",
    ].map(toCsvValue).join(",")),
  ];
  const objBlob = new Blob(["\uFEFF" + lstLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const strUrl = URL.createObjectURL(objBlob);
  const objLink = document.createElement("a");
  objLink.href = strUrl;
  objLink.download = strFileName;
  objLink.click();
  URL.revokeObjectURL(strUrl);
}

function SingleSelectFilter({
  strLabel,
  strValue,
  lstOptions,
  strControlId,
  fnOnChange,
  blnDisabled = false,
}: {
  strLabel: string;
  strValue: string;
  lstOptions: ReportFilterOption[];
  strControlId: string;
  fnOnChange: (strValue: string) => void;
  blnDisabled?: boolean;
}) {
  return (
    <Autocomplete
      size="small"
      options={lstOptions}
      value={lstOptions.find((objOption) => objOption.strValue === strValue) ?? null}
      disabled={blnDisabled}
      getOptionLabel={(objOption) => objOption.strLabel}
      isOptionEqualToValue={(objA, objB) => objA.strValue === objB.strValue}
      onChange={(_objEvent, objSelected) => fnOnChange(objSelected?.strValue ?? "")}
      fullWidth
      renderInput={(objParams) => (
        <TextField
          {...objParams}
          className="app-mui-text-field"
          label={strLabel}
          placeholder={`Search ${strLabel}...`}
          InputLabelProps={{ shrink: true }}
          inputProps={{ ...objParams.inputProps, "data-controlid": strControlId }}
          InputProps={{
            ...objParams.InputProps,
            startAdornment: (
              <>
                <SearchRoundedIcon fontSize="small" sx={{ color: "action.active", ml: 0.5, mr: -0.5 }} />
                {objParams.InputProps.startAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

export default function AttendanceExceptionReportPage() {
  const { t } = useModuleLabels("reports");
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny } = useModuleActionAccess(["REPORTS_ATTENDANCE_EXCEPTION", "REPORTS"]);
  const { lstEmployees, lstDepartments, lstExceptionTypes } = useReportFilterOptions();
  const [dicSearch, setDicSearch] = useState<SearchForm>(dicDefaultSearch);
  const [dicMoreFiltersDraft, setDicMoreFiltersDraft] = useState<MoreFiltersForm>({ strExceptionType: "", strEmployeeID: "", strDepartmentID: "" });
  const [objMoreFiltersAnchor, setObjMoreFiltersAnchor] = useState<HTMLElement | null>(null);
  const [lstRows, setLstRows] = useState<AttendanceExceptionRow[]>([]);
  const [blnLoading, setBlnLoading] = useState(false);
  const [strError, setStrError] = useState("");

  const blnCanView = canViewAny() || canDoAny("view") || canDoAny("list");
  const blnMoreFiltersOpen = Boolean(objMoreFiltersAnchor);
  const blnPageLoading = blnRightsLoading || blnLoading;

  const lstStatusOptions = useMemo<ReportFilterOption[]>(() => [
    { strValue: "OPEN,UNDER_REVIEW", strLabel: t("status_open_review", "Open + Under Review") },
    { strValue: "OPEN", strLabel: t("status_open", "Open") },
    { strValue: "UNDER_REVIEW", strLabel: t("status_under_review", "Under Review") },
    { strValue: "RESOLVED", strLabel: t("status_resolved", "Resolved") },
    { strValue: "IGNORED", strLabel: t("status_ignored", "Ignored") },
  ], [t]);

  const lstSeverityOptions = useMemo<ReportFilterOption[]>(() => [
    { strValue: "BLOCKING", strLabel: t("severity_blocking", "Blocking") },
    { strValue: "ERROR", strLabel: t("severity_error", "Error") },
    { strValue: "WARNING", strLabel: t("severity_warning", "Warning") },
  ], [t]);

  const lstTableRows = useMemo<DisplayRow[]>(() => lstRows.map((dicRow) => ({
    intID: dicRow.intID,
    dtWorkDate: dicRow.dtWorkDate ?? "-",
    strEmployeeCode: dicRow.strEmployeeCode,
    strEmployeeName: dicRow.strEmployeeName,
    strExceptionType: dicRow.strExceptionType,
    strSeverity: dicRow.strSeverity,
    strStatus: dicRow.strStatus,
    strMessage: dicRow.strMessage,
    dtDetectedOn: dicRow.dtDetectedOn ? dicRow.dtDetectedOn.slice(0, 10) : "-",
    strAssignedTo: dicRow.strAssignedTo ?? "-",
    intAgeingDays: dicRow.intAgeingDays ?? "-",
    intRegularizationRequestID: dicRow.intRegularizationRequestID ?? "-",
    strResolutionCode: dicRow.strResolutionCode ?? "-",
  })), [lstRows]);

  const lstColumns = useMemo<CommonTableColumn<DisplayRow>[]>(() => [
    { field: "dtWorkDate", headerName: t("date", "Date"), width: 120 },
    { field: "strEmployeeCode", headerName: t("employee_code", "Employee Code"), width: 140 },
    { field: "strEmployeeName", headerName: t("employee_name", "Employee"), width: 190 },
    { field: "strExceptionType", headerName: t("exception_type", "Type"), width: 190 },
    { field: "strSeverity", headerName: t("severity", "Severity"), width: 110 },
    { field: "strStatus", headerName: t("status", "Status"), width: 130 },
    { field: "strMessage", headerName: t("message", "Message"), width: 280 },
    { field: "dtDetectedOn", headerName: t("detected_on", "Detected"), width: 120 },
    { field: "strAssignedTo", headerName: t("assigned_to", "Assigned To"), width: 160 },
    { field: "intAgeingDays", headerName: t("ageing_days", "Ageing (d)"), width: 100, align: "right" },
    { field: "intRegularizationRequestID", headerName: t("regularization_ref", "Reg. Ref"), width: 100, align: "right" },
    { field: "strResolutionCode", headerName: t("resolution", "Resolution"), width: 150 },
  ], [t]);

  async function loadRows(dicFilters: SearchForm) {
    setBlnLoading(true);
    setStrError("");
    try {
      const objEnvelope = await leaveAttendanceReportService.getAttendanceExceptions({
        from_date: dicFilters.strFromDate,
        to_date: dicFilters.strToDate,
        status: dicFilters.strStatus,
        severity: dicFilters.strSeverity,
        exception_type: dicFilters.strExceptionType,
        employee_id: dicFilters.strEmployeeID,
        department_id: dicFilters.strDepartmentID,
      });
      setLstRows(objEnvelope.lstItems);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load attendance exceptions.");
      setLstRows([]);
    } finally {
      setBlnLoading(false);
    }
  }

  function clearFilters() {
    setDicSearch(dicDefaultSearch);
    setDicMoreFiltersDraft({ strExceptionType: "", strEmployeeID: "", strDepartmentID: "" });
    setObjMoreFiltersAnchor(null);
    loadRows(dicDefaultSearch).catch(() => undefined);
  }

  function clearMoreFilters() {
    setDicMoreFiltersDraft({ strExceptionType: "", strEmployeeID: "", strDepartmentID: "" });
  }

  function applyMoreFilters() {
    setDicSearch((dicPrevious) => ({ ...dicPrevious, ...dicMoreFiltersDraft }));
    setObjMoreFiltersAnchor(null);
  }

  useEffect(() => {
    if (!blnCanView) return;
    loadRows(dicDefaultSearch).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blnCanView]);

  return (
    <Box className={styles.page}>
      <Breadcrumbs className="app-breadcrumbs" aria-label="breadcrumb" separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />} sx={{ ml: "3px" }}>
        <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>{t("reports", "Reports")}</Typography>
        <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>{t("attendance_reports", "Attendance Reports")}</Typography>
        <Typography component="h1" className="app-breadcrumb-heading" aria-current="page">{t("attendance_exceptions", "Attendance Exception Report")}</Typography>
      </Breadcrumbs>

      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Box className={styles.reportSearchPanelRow}>
          <Box className={styles.reportSearchField} sx={{ flex: "0 1 170px", minWidth: 160 }}>
            <TextField className="app-mui-text-field" type="date" label={t("from_date", "From Date")} value={dicSearch.strFromDate} onChange={(objEvent) => setDicSearch((dicPrevious) => ({ ...dicPrevious, strFromDate: objEvent.target.value }))} disabled={blnPageLoading} fullWidth InputLabelProps={{ shrink: true }} />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flex: "0 1 170px", minWidth: 160 }}>
            <TextField className="app-mui-text-field" type="date" label={t("to_date", "To Date")} value={dicSearch.strToDate} onChange={(objEvent) => setDicSearch((dicPrevious) => ({ ...dicPrevious, strToDate: objEvent.target.value }))} disabled={blnPageLoading} fullWidth InputLabelProps={{ shrink: true }} />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flex: "1 1 210px", minWidth: 190 }}>
            <SingleSelectFilter strLabel={t("status", "Status")} strValue={dicSearch.strStatus} lstOptions={lstStatusOptions} fnOnChange={(strValue) => setDicSearch((dicPrevious) => ({ ...dicPrevious, strStatus: strValue }))} strControlId="reports.attendance-exceptions.status.select" blnDisabled={blnPageLoading} />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flex: "1 1 190px", minWidth: 170 }}>
            <SingleSelectFilter strLabel={t("severity", "Severity")} strValue={dicSearch.strSeverity} lstOptions={lstSeverityOptions} fnOnChange={(strValue) => setDicSearch((dicPrevious) => ({ ...dicPrevious, strSeverity: strValue }))} strControlId="reports.attendance-exceptions.severity.select" blnDisabled={blnPageLoading} />
          </Box>
          <Box className={styles.searchActions} sx={{ flex: "0 0 auto", ml: "auto" }}>
            <Button
              className={styles.secondaryButton}
              startIcon={<FilterListRoundedIcon />}
              onClick={(objEvent) => {
                setDicMoreFiltersDraft({
                  strExceptionType: dicSearch.strExceptionType,
                  strEmployeeID: dicSearch.strEmployeeID,
                  strDepartmentID: dicSearch.strDepartmentID,
                });
                setObjMoreFiltersAnchor(objEvent.currentTarget);
              }}
              aria-expanded={blnMoreFiltersOpen}
              aria-haspopup="dialog"
              disabled={blnPageLoading}
              data-controlid="reports.attendance-exceptions.more-filters.button"
            >
              More filters
            </Button>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => loadRows(dicSearch)} disabled={blnPageLoading} data-controlid="reports.attendance-exceptions.search.button">Search</Button>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearFilters} disabled={blnPageLoading} data-controlid="reports.attendance-exceptions.clear.button">Clear</Button>
          </Box>
        </Box>
        <Popover
          open={blnMoreFiltersOpen}
          anchorEl={objMoreFiltersAnchor}
          onClose={() => setObjMoreFiltersAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{
            paper: {
              sx: {
                mt: 1,
                width: 374,
                maxWidth: "calc(100vw - 24px)",
                border: "1px solid #d8e2ef",
                borderRadius: "22px",
                boxShadow: "0 18px 42px rgba(15, 23, 42, 0.18)",
                overflow: "hidden",
              },
            },
          }}
        >
          <Box data-controlid="reports.attendance-exceptions.more-filters.panel">
            <Box sx={{ px: 2.5, pt: 2.25, pb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>More filters</Typography>
              <IconButton size="small" onClick={() => setObjMoreFiltersAnchor(null)} aria-label="Close more filters" data-controlid="reports.attendance-exceptions.more-filters.close.button" sx={{ color: "#64748b" }}>
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </Box>
            <Box sx={{ px: 2.5, pb: 2, display: "grid", gap: 1.5 }}>
              <SingleSelectFilter strLabel={t("exception_type", "Exception Type")} strValue={dicMoreFiltersDraft.strExceptionType} lstOptions={lstExceptionTypes} fnOnChange={(strValue) => setDicMoreFiltersDraft((dicPrevious) => ({ ...dicPrevious, strExceptionType: strValue }))} strControlId="reports.attendance-exceptions.exception-type.select" blnDisabled={blnPageLoading} />
              <SingleSelectFilter strLabel={t("employee", "Employee")} strValue={dicMoreFiltersDraft.strEmployeeID} lstOptions={lstEmployees} fnOnChange={(strValue) => setDicMoreFiltersDraft((dicPrevious) => ({ ...dicPrevious, strEmployeeID: strValue }))} strControlId="reports.attendance-exceptions.employee.select" blnDisabled={blnPageLoading} />
              <SingleSelectFilter strLabel={t("department", "Department")} strValue={dicMoreFiltersDraft.strDepartmentID} lstOptions={lstDepartments} fnOnChange={(strValue) => setDicMoreFiltersDraft((dicPrevious) => ({ ...dicPrevious, strDepartmentID: strValue }))} strControlId="reports.attendance-exceptions.department.select" blnDisabled={blnPageLoading} />
            </Box>
            <Divider />
            <Box sx={{ px: 2.5, py: 1.75, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.25 }}>
              <Button onClick={clearMoreFilters} disabled={blnPageLoading} data-controlid="reports.attendance-exceptions.more-filters.clear-all.button" sx={{ px: 0, minWidth: 0, fontWeight: 700, textTransform: "none", color: "var(--app-primary-color)", "&:hover": { backgroundColor: "var(--app-primary-soft)" } }}>
                Clear all
              </Button>
              <Box sx={{ display: "flex", gap: 1.25 }}>
                <Button className={styles.secondaryButton} onClick={() => setObjMoreFiltersAnchor(null)} disabled={blnPageLoading} data-controlid="reports.attendance-exceptions.more-filters.cancel.button">Cancel</Button>
                <Button className={styles.primaryButton} onClick={applyMoreFilters} disabled={blnPageLoading} data-controlid="reports.attendance-exceptions.more-filters.apply.button">Apply</Button>
              </Box>
            </Box>
          </Box>
        </Popover>
      </Box>

      <Box sx={{ alignItems: "center", backgroundColor: "#f8fbff", border: "1px solid rgba(191,219,254,0.7)", borderRadius: "16px", color: "#1f2937", display: "flex", gap: 1, px: 1.5, py: 1.25 }}>
        <InfoOutlinedIcon sx={{ color: "#2b6cb0", fontSize: 20 }} />
        <Typography sx={{ color: "inherit", lineHeight: 1.5 }}>
          {t("attendance_exceptions_info", "Attendance exceptions with severity, status, ageing, regularization link and resolution. Defaults to open and under-review.")}
        </Typography>
      </Box>

      {!blnRightsLoading && !blnCanView && !strError ? <Alert severity="warning">Attendance exception report view access is not available for your user group.</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}

      <Box className={styles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <CommonTable
          columns={lstColumns}
          rows={lstTableRows}
          rowIdField="intID"
          defaultPageSize={lstRowsPerPageOptions[0]}
          pageSizeOptions={lstRowsPerPageOptions}
          emptyMessage={t("attendance_exceptions_empty", "No attendance exceptions found for the current filters.")}
          showPaginationSummary
          withPaper={false}
          testIdPrefix="reports.attendance-exceptions"
          loading={blnPageLoading}
          loadingHeaderSkeleton
          skeletonRowCount={10}
          wrapColumnHeaders
          hideRowClickHint
          onRowClick={() => undefined}
          toolbarLeft={canDoAny("export") ? (
            <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv(`attendance-exceptions_${csvTimestamp()}.csv`, lstRows)} disabled={!lstRows.length} data-controlid="reports.attendance-exceptions.export.button">Export CSV</Button>
          ) : null}
          sx={{ p: 0, boxShadow: "none", background: "transparent" }}
        />
      </Box>
    </Box>
  );
}
