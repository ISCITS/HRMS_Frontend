"use client";

import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import {
  Box,
  Breadcrumbs,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import CommonSearchableSelect from "@/Common/components/CommonSearchableSelect";
import CommonTable,{ type CommonTableColumn } from "@/Common/components/CommonTable";
import PageNotices from "@/Common/components/PageNotices";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import Form14CloseDialog from "@/features/reports/components/Form14CloseDialog";
import Form14ConfigDialog from "@/features/reports/components/Form14ConfigDialog";
import Form14IssueSummary from "@/features/reports/components/Form14IssueSummary";
import Form14PreviewDialog from "@/features/reports/components/Form14PreviewDialog";
import {
  form14ReportService,
  type Form14Filters,
  type Form14List,
  type Form14ListIssue,
  type Form14Options,
  type Form14PageSize,
  type Form14Status,
} from "@/features/reports/services/form14ReportService";
import { fmtNum, form14Months } from "@/features/reports/utils/form14Grid";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

const lstRowsPerPageOptions = [20, 50, 100];

const dicStatusLabels: Record<Form14Status, string> = { both: "Both", active: "Active", discharged: "Discharged" };

function groupIssues(lstIssues: Form14ListIssue[]) {
  const dicGroups = new Map<number, { strEmployeeCode: string; strName: string; lstItems: Form14ListIssue[] }>();
  lstIssues.forEach((dicIssue) => {
    const dicGroup = dicGroups.get(dicIssue.intEmployeeID) ?? { strEmployeeCode: dicIssue.strEmployeeCode, strName: dicIssue.strName, lstItems: [] };
    dicGroup.lstItems.push(dicIssue);
    dicGroups.set(dicIssue.intEmployeeID, dicGroup);
  });
  return Array.from(dicGroups.entries());
}

export default function Form14ReportPage() {
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny } = useModuleActionAccess(["FORM14_REPORT", "FORM14"]);
  const blnCanView = canViewAny() || canDoAny("form14_view");
  const blnCanExport = canDoAny("form14_export");
  const blnCanClose = canDoAny("form14_close");
  const blnCanConfig = canDoAny("form14_config");

  const [objOptions, setObjOptions] = useState<Form14Options | null>(null);
  const [strYear, setStrYear] = useState("");
  const [strDepartmentID, setStrDepartmentID] = useState("");
  const [objPickedEmployee, setObjPickedEmployee] = useState<{ intEmployeeID: number; strLabel: string } | null>(null);
  const [strStatus, setStrStatus] = useState<Form14Status>("both");
  const [blnShowAdditional, setBlnShowAdditional] = useState(true);
  const [strPageSize, setStrPageSize] = useState<Form14PageSize>("A4");

  const [objReport, setObjReport] = useState<Form14List | null>(null);
  // Filters the shown report was generated with; exports and the year-end close use these.
  const [objAppliedFilters, setObjAppliedFilters] = useState<Form14Filters | null>(null);
  const [blnReportLoading, setBlnReportLoading] = useState(false);
  const [blnExporting, setBlnExporting] = useState(false);
  const [strError, setStrError] = useState("");
  const [intPreviewEmployeeID, setIntPreviewEmployeeID] = useState<number | null>(null);
  const [blnCloseOpen, setBlnCloseOpen] = useState(false);
  const [blnConfigOpen, setBlnConfigOpen] = useState(false);
  // Guards against a slow response for an earlier selection overwriting the current one.
  const intRequestSequence = useRef(0);

  const blnBusy = blnRightsLoading || blnReportLoading || blnExporting;

  async function loadOptions() {
    try {
      const dicOptions = await form14ReportService.getOptions();
      setObjOptions(dicOptions);
      setStrYear(String(dicOptions.intDefaultYear));
      setBlnShowAdditional(dicOptions.dicConfig.blnShowAdditionalColumns);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load Form 14 filters.");
    }
  }

  useEffect(() => {
    if (!blnCanView) {
      return;
    }
    loadOptions().catch(() => undefined);
  }, [blnCanView]);

  function clearReport() {
    intRequestSequence.current += 1;
    setObjReport(null);
    setObjAppliedFilters(null);
    setBlnReportLoading(false);
  }

  function getFilters(): Form14Filters {
    return {
      intYear: Number(strYear),
      intDepartmentID: strDepartmentID ? Number(strDepartmentID) : null,
      intEmployeeID: objPickedEmployee?.intEmployeeID ?? null,
      strStatus,
      strSearch: "",
    };
  }

  async function generate(objFilters: Form14Filters = getFilters()) {
    const intSequence = intRequestSequence.current + 1;
    intRequestSequence.current = intSequence;
    setBlnReportLoading(true);
    setStrError("");
    setObjReport(null);
    try {
      const dicResult = await form14ReportService.getRegisterList(objFilters);
      if (intRequestSequence.current === intSequence) {
        setObjReport(dicResult);
        setObjAppliedFilters(objFilters);
      }
    } catch (objError) {
      if (intRequestSequence.current === intSequence) {
        setStrError(objError instanceof Error ? objError.message : "Unable to generate the register.");
      }
    } finally {
      if (intRequestSequence.current === intSequence) {
        setBlnReportLoading(false);
      }
    }
  }

  async function runExport(strFormat: "pdf" | "xlsx") {
    if (!objAppliedFilters) {
      return;
    }
    setBlnExporting(true);
    setStrError("");
    try {
      const strFallback = `Form14_${objAppliedFilters.intYear}_all.${strFormat}`;
      if (strFormat === "pdf") {
        await form14ReportService.printPdf(objAppliedFilters, { strPageSize, blnShowAdditional }, strFallback);
      } else {
        await form14ReportService.downloadExport(objAppliedFilters, { strFormat, strPageSize, blnShowAdditional }, strFallback);
      }
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to export the register.");
    } finally {
      setBlnExporting(false);
    }
  }

  function pickEmployee(intEmployeeID: number, strLabel: string) {
    setObjPickedEmployee({ intEmployeeID, strLabel });
    const objFilters: Form14Filters = { ...(objAppliedFilters ?? getFilters()), intEmployeeID, strSearch: "" };
    generate(objFilters).catch(() => undefined);
  }

  const lstTableRows = useMemo(
    () =>
      (objReport?.lstEmployees ?? []).map((dicRow) => ({
        intID: dicRow.intEmployeeID,
        strEmployeeCode: dicRow.strEmployeeCode,
        strName: dicRow.strName,
        strDepartment: dicRow.strDepartment || "-",
        strQualifying: `${fmtNum(dicRow.decQualifyingDays) || "0"} / ${dicRow.intEligibilityDays}`,
        decQualifyingSortValue: dicRow.decQualifyingDays,
        strOpeningEl: fmtNum(dicRow.decOpeningEl) || "0",
        decOpeningElSortValue: dicRow.decOpeningEl,
        strElTaken: fmtNum(dicRow.decElTaken) || "0",
        decElTakenSortValue: dicRow.decElTaken,
        strElBalance: fmtNum(dicRow.decElBalance) || "0",
        decElBalanceSortValue: dicRow.decElBalance,
        strChecks: dicRow.intIssueCount === 0 ? "OK" : `${dicRow.intIssueCount} issue${dicRow.intIssueCount === 1 ? "" : "s"}`,
        action: (
          <Stack direction="row" spacing={0.5}>
            <Button size="small" variant="outlined" onClick={() => setIntPreviewEmployeeID(dicRow.intEmployeeID)} controlId="reports.form14.table.view.button">
              View Form 14
            </Button>
            <Button size="small" onClick={() => pickEmployee(dicRow.intEmployeeID, `${dicRow.strEmployeeCode} ${dicRow.strName}`)} disabled={blnBusy} controlId="reports.form14.table.filter-worker.button">
              Only this worker
            </Button>
          </Stack>
        ),
      })),
    // pickEmployee reads the current filters on click; rows only depend on the report and busy flag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [objReport, blnBusy],
  );

  const lstTableColumns = useMemo<CommonTableColumn<Record<string, ReactNode>>[]>(
    () => {
      const numeric = (strField: string, strHeader: string, strSortField: string, intWidth: number): CommonTableColumn<Record<string, ReactNode>> => ({
        field: strField,
        headerName: strHeader,
        width: intWidth,
        align: "right",
        sortAccessor: (dicRow) => Number(dicRow[strSortField] ?? 0),
      });
      return [
        { field: "strEmployeeCode", headerName: "Emp code", width: 110 },
        { field: "strName", headerName: "Name", width: 200 },
        { field: "strDepartment", headerName: "Department", width: 160 },
        numeric("strQualifying", "Qualifying days", "decQualifyingSortValue", 140),
        numeric("strOpeningEl", "Opening EL", "decOpeningElSortValue", 110),
        numeric("strElTaken", "EL taken", "decElTakenSortValue", 100),
        numeric("strElBalance", "EL balance", "decElBalanceSortValue", 110),
        { field: "strChecks", headerName: "Checks", width: 100 },
        { field: "action", headerName: "Action", width: 260, sortable: false, filterable: false, exportable: false },
      ];
    },
    [],
  );

  const dicSummary = objReport?.dicSummary;
  const lstIssueGroups = useMemo(() => groupIssues(objReport?.lstIssues ?? []), [objReport]);
  const dicConfig = objOptions?.dicConfig;
  const strSubtitle = dicConfig
    ? `Factories Act, 1948 · Sec 79/80 · ${dicConfig.strRuleReference}${dicConfig.strState ? ` (${dicConfig.strState} Factories Rules)` : ""} · Regime: ${dicConfig.strRegime}`
    : "";

  const lstTiles: Array<{ strKey: string; strLabel: string; strValue: string }> = dicSummary
    ? [
      { strKey: "workers", strLabel: "Workers in register", strValue: String(dicSummary.intWorkers) },
      { strKey: "on-track", strLabel: `On track for the eligibility threshold`, strValue: String(dicSummary.intOnTrack) },
      { strKey: "issues", strLabel: "Validation issues", strValue: String(dicSummary.intIssueCount) },
      { strKey: "year-status", strLabel: "Year status", strValue: dicSummary.strYearStatus },
    ]
    : [];

  return (
    <Box className={styles.page}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
        <Breadcrumbs className="app-breadcrumbs" aria-label="breadcrumb" separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />} sx={{ ml: "3px" }}>
          <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>Reports</Typography>
          <Typography component="h1" className="app-breadcrumb-heading" aria-current="page">Form 14 – Leave with Wages Register</Typography>
        </Breadcrumbs>
        <PageNotices
          strControlId="reports.form14.notices"
          lstNotices={[
            !blnRightsLoading && !blnCanView ? { strKey: "rights", strSeverity: "warning", objMessage: "Form 14 view access is not available for your user group." } : null,
            { strKey: "error", strSeverity: "error", objMessage: strError, fnDismiss: () => setStrError("") },
            dicConfig && !dicConfig.blnElMapped
              ? { strKey: "el-unmapped", strSeverity: "warning", objMessage: "EL leave type is not mapped – open Configuration.", blnToast: false }
              : null,
          ]}
        />
        <Box sx={{ flex: 1 }} />
        {blnCanConfig && blnCanView ? (
          <Button size="small" startIcon={<SettingsRoundedIcon />} onClick={() => setBlnConfigOpen(true)} controlId="reports.form14.config.button">
            Configuration
          </Button>
        ) : null}
      </Stack>

      {strSubtitle ? <Typography sx={{ color: "text.secondary", mt: -0.5 }}>{strSubtitle}</Typography> : null}

      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Box className={styles.reportSearchPanelRow} sx={{ py: "0 !important" }}>
          <Box className={styles.reportSearchField} sx={{ flexBasis: 140, minWidth: 130 }}>
            <TextField
              className="app-mui-text-field"
              size="small"
              select
              label="Calendar year"
              value={strYear}
              onChange={(objEvent) => { setStrYear(objEvent.target.value); clearReport(); }}
              disabled={blnBusy || !blnCanView}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              controlId="reports.form14.year.select"
            >
              {(objOptions?.lstYears ?? []).map((intYear) => <MenuItem key={intYear} value={String(intYear)}>{intYear}</MenuItem>)}
            </TextField>
          </Box>
          <Box className={styles.reportSearchField} sx={{ flex: "1 1 200px", minWidth: 180 }}>
            <TextField
              className="app-mui-text-field"
              size="small"
              select
              label="Department"
              value={strDepartmentID}
              onChange={(objEvent) => { setStrDepartmentID(objEvent.target.value); clearReport(); }}
              disabled={blnBusy || !blnCanView}
              fullWidth
              InputLabelProps={{ shrink: true }}
              SelectProps={{ displayEmpty: true }}
              controlId="reports.form14.department.select"
            >
              <MenuItem value="">All departments</MenuItem>
              {(objOptions?.lstDepartments ?? []).map((dicDepartment) => <MenuItem key={dicDepartment.intID} value={String(dicDepartment.intID)}>{dicDepartment.strName}</MenuItem>)}
            </TextField>
          </Box>
          <Box className={styles.reportSearchField} sx={{ flex: "1 1 220px", minWidth: 200 }}>
            <CommonSearchableSelect
              className="app-mui-text-field"
              label="Employee"
              placeholder="All employees"
              value={objPickedEmployee ? objPickedEmployee.intEmployeeID : ""}
              options={(objOptions?.lstEmployees ?? []).map((dicEmployee) => ({
                intID: dicEmployee.intID,
                strLabel: `${dicEmployee.strEmployeeCode} - ${dicEmployee.strName}`,
              }))}
              onChange={(intValue) => {
                const dicEmployee = (objOptions?.lstEmployees ?? []).find((dicItem) => dicItem.intID === intValue);
                setObjPickedEmployee(dicEmployee ? { intEmployeeID: dicEmployee.intID, strLabel: `${dicEmployee.strEmployeeCode} ${dicEmployee.strName}` } : null);
                clearReport();
              }}
              disabled={blnBusy || !blnCanView}
              controlId="reports.form14.employee.select"
            />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flexBasis: 150, minWidth: 140 }}>
            <TextField
              className="app-mui-text-field"
              size="small"
              select
              label="Status"
              value={strStatus}
              onChange={(objEvent) => { setStrStatus(objEvent.target.value as Form14Status); clearReport(); }}
              disabled={blnBusy || !blnCanView}
              fullWidth
              InputLabelProps={{ shrink: true }}
              controlId="reports.form14.status.select"
            >
              {(Object.keys(dicStatusLabels) as Form14Status[]).map((strValue) => <MenuItem key={strValue} value={strValue}>{dicStatusLabels[strValue]}</MenuItem>)}
            </TextField>
          </Box>
          <Box className={styles.reportSearchField} sx={{ flex: "0 0 auto" }}>
            <FormControlLabel
              control={<Checkbox size="small" checked={blnShowAdditional} onChange={(objEvent) => setBlnShowAdditional(objEvent.target.checked)} disabled={blnBusy || !blnCanView} controlId="reports.form14.show-additional.checkbox" />}
              label="Show additional columns"
            />
          </Box>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<PlayArrowRoundedIcon />} onClick={() => generate().catch(() => undefined)} disabled={blnBusy || !blnCanView || !strYear} controlId="reports.form14.generate.button">
              Generate register
            </Button>
          </Box>
        </Box>
      </Box>


      {lstTiles.length > 0 ? (
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" } }}>
          {lstTiles.map((dicTile) => (
            <Box key={dicTile.strKey} sx={{ border: "1px solid #e2e8f0", borderRadius: "10px", px: 1.5, py: 1 }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>{dicTile.strLabel}</Typography>
              <Typography sx={{ fontSize: 22, fontWeight: 700 }}>{dicTile.strValue}</Typography>
            </Box>
          ))}
        </Box>
      ) : null}

      <Form14IssueSummary
        lstGroups={lstIssueGroups.map(([intEmployeeID, dicGroup]) => ({
          strKey: String(intEmployeeID),
          strLabel: `${dicGroup.strEmployeeCode} ${dicGroup.strName}`,
          lstItems: dicGroup.lstItems,
        }))}
        strControlId="reports.form14.validations"
      />

      <Box className={styles.tableCard} sx={{ p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <CommonTable
          columns={lstTableColumns}
          rows={lstTableRows as unknown as Record<string, ReactNode>[]}
          rowIdField="intID"
          defaultPageSize={lstRowsPerPageOptions[0]}
          pageSizeOptions={lstRowsPerPageOptions}
          emptyMessage={objReport ? "No workers match the selected filters." : "Select the calendar year and filters, then Generate register."}
          showPaginationSummary
          withPaper={false}
          testIdPrefix="reports.form14"
          loading={blnReportLoading}
          loadingHeaderSkeleton
          skeletonRowCount={10}
          hideRowClickHint
          onRowClick={() => undefined}
          toolbarLeft={(
            <Box className={styles.listUtilityActions}>
              {blnCanExport ? (
                <>
                  <TextField
                    className="app-mui-text-field"
                    size="small"
                    select
                    label="Page size"
                    value={strPageSize}
                    onChange={(objEvent) => setStrPageSize(objEvent.target.value as Form14PageSize)}
                    disabled={blnBusy}
                    sx={{ minWidth: 100 }}
                    InputLabelProps={{ shrink: true }}
                    controlId="reports.form14.page-size.select"
                  >
                    <MenuItem value="A4">A4</MenuItem>
                    <MenuItem value="A3">A3</MenuItem>
                  </TextField>
                  <Button className={styles.secondaryButton} startIcon={<PrintRoundedIcon />} onClick={() => runExport("pdf").catch(() => undefined)} disabled={blnBusy || !objReport} controlId="reports.form14.export-pdf.button">
                    Print all (PDF)
                  </Button>
                  <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => runExport("xlsx").catch(() => undefined)} disabled={blnBusy || !objReport} controlId="reports.form14.export-xlsx.button">
                    Export Excel
                  </Button>
                </>
              ) : null}
              {blnCanClose && objReport ? (
                <Button className={styles.secondaryButton} onClick={() => setBlnCloseOpen(true)} disabled={blnBusy} controlId="reports.form14.year-end-close.button">
                  Year-end close
                </Button>
              ) : null}
            </Box>
          )}
          sx={{ p: 0, boxShadow: "none", background: "transparent" }}
        />
      </Box>

      {intPreviewEmployeeID !== null && objAppliedFilters ? (
        <Form14PreviewDialog
          intEmployeeID={intPreviewEmployeeID}
          intYear={objAppliedFilters.intYear}
          blnShowAdditional={blnShowAdditional}
          blnCanExport={blnCanExport}
          blnCanClose={blnCanClose}
          onClose={() => setIntPreviewEmployeeID(null)}
          onChanged={() => { generate(objAppliedFilters).catch(() => undefined); }}
        />
      ) : null}

      {blnCloseOpen && objAppliedFilters ? (
        <Form14CloseDialog
          objFilters={objAppliedFilters}
          onClose={() => setBlnCloseOpen(false)}
          onClosed={() => { generate(objAppliedFilters).catch(() => undefined); }}
        />
      ) : null}

      {blnConfigOpen ? (
        <Form14ConfigDialog
          onClose={() => setBlnConfigOpen(false)}
          onSaved={() => {
            clearReport();
            loadOptions().catch(() => undefined);
          }}
        />
      ) : null}
    </Box>
  );
}
