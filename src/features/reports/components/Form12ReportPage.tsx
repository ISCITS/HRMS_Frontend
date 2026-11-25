"use client";

import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { Box, Breadcrumbs, Button, MenuItem, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";

import CommonSearchableSelect from "@/Common/components/CommonSearchableSelect";
import PageNoticesfrom "@/Common/components/PageNotices";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import Form12ConfigDialog from "@/features/reports/components/Form12ConfigDialog";
import { Form12PayableGrid, Form12RegisterGrid } from "@/features/reports/components/Form12Grids";
import Form14IssueSummary from "@/features/reports/components/Form14IssueSummary";
import {
  form12ReportService,
  type Form12Filters,
  type Form12Group,
  type Form12Options,
  type Form12PageSize,
  type Form12Register,
  type Form12Sheet,
} from "@/features/reports/services/form12ReportService";
import { fmtDays } from "@/features/reports/utils/form12Grid";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

const lstMonthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type TabKey = "register" | "payable";

export default function Form12ReportPage() {
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny } = useModuleActionAccess(["FORM12_REPORT", "FORM12"]);
  const blnCanView = canViewAny() || canDoAny("form12_view");
  const blnCanExport = canDoAny("form12_export");
  const blnCanConfig = canDoAny("form12_config");

  const [objOptions, setObjOptions] = useState<Form12Options | null>(null);
  const [strYear, setStrYear] = useState("");
  const [strMonth, setStrMonth] = useState("");
  const [strDepartmentID, setStrDepartmentID] = useState("");
  const [strGroup, setStrGroup] = useState<Form12Group | "">("");
  const [strEmployeeID, setStrEmployeeID] = useState("");
  const [strPageSize, setStrPageSize] = useState<Form12PageSize>("A3");

  const [strTab, setStrTab] = useState<TabKey>("register");
  const [objRegister, setObjRegister] = useState<Form12Register | null>(null);
  // Filters the shown register was generated with; exports use these, not whatever is typed since.
  const [objAppliedFilters, setObjAppliedFilters] = useState<Form12Filters | null>(null);
  const [blnReportLoading, setBlnReportLoading] = useState(false);
  const [blnExporting, setBlnExporting] = useState(false);
  const [strError, setStrError] = useState("");
  const [blnConfigOpen, setBlnConfigOpen] = useState(false);
  // Guards against a slow response for an earlier selection overwriting the current one.
  const intRequestSequence = useRef(0);

  const blnBusy = blnRightsLoading || blnReportLoading || blnExporting;

  async function loadOptions() {
    try {
      const dicOptions = await form12ReportService.getOptions();
      setObjOptions(dicOptions);
      setStrYear((strPrevious) => strPrevious || String(dicOptions.intDefaultYear));
      setStrMonth((strPrevious) => strPrevious || String(dicOptions.intDefaultMonth));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load Form 12 filters.");
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
    setObjRegister(null);
    setObjAppliedFilters(null);
    setBlnReportLoading(false);
  }

  function getFilters(): Form12Filters {
    return {
      intYear: Number(strYear),
      intMonth: Number(strMonth),
      intDepartmentID: strDepartmentID ? Number(strDepartmentID) : null,
      intEmployeeID: strEmployeeID ? Number(strEmployeeID) : null,
      strGroup,
    };
  }

  async function generate(objFilters: Form12Filters = getFilters()) {
    const intSequence = intRequestSequence.current + 1;
    intRequestSequence.current = intSequence;
    setBlnReportLoading(true);
    setStrError("");
    setObjRegister(null);
    try {
      const dicResult = await form12ReportService.getRegister(objFilters);
      if (intRequestSequence.current === intSequence) {
        setObjRegister(dicResult);
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

  async function runExport(strFormat: "pdf" | "xlsx", strSheet: Form12Sheet) {
    if (!objAppliedFilters) {
      return;
    }
    setBlnExporting(true);
    setStrError("");
    try {
      const strFallback = `Form12_${objAppliedFilters.intYear}_${String(objAppliedFilters.intMonth).padStart(2, "0")}_${strSheet}.${strFormat}`;
      if (strFormat === "pdf") {
        await form12ReportService.printPdf(objAppliedFilters, { strPageSize, strSheet }, strFallback);
      } else {
        await form12ReportService.downloadExport(objAppliedFilters, { strFormat, strPageSize, strSheet }, strFallback);
      }
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to export the register.");
    } finally {
      setBlnExporting(false);
    }
  }

  const lstIssueGroups = useMemo(() => {
    const dicGroups = new Map<string, { strLabel: string; lstItems: Array<{ strCode: string; strSeverity: string; strMessage: string; intMonth: number | null }> }>();
    (objRegister?.lstIssues ?? []).forEach((dicIssue) => {
      const strKey = dicIssue.intEmployeeID === null ? "general" : String(dicIssue.intEmployeeID);
      const dicGroup = dicGroups.get(strKey) ?? { strLabel: dicIssue.intEmployeeID === null ? "" : `${dicIssue.strEmployeeCode} ${dicIssue.strName}`, lstItems: [] };
      dicGroup.lstItems.push({ strCode: dicIssue.strCode, strSeverity: dicIssue.strSeverity, strMessage: dicIssue.strMessage, intMonth: null });
      dicGroups.set(strKey, dicGroup);
    });
    return Array.from(dicGroups.entries()).map(([strKey, dicGroup]) => ({ strKey, ...dicGroup }));
  }, [objRegister]);

  const dicConfig = objOptions?.dicConfig;
  const dicSummary = objRegister?.dicSummary;
  const strSubtitle = dicConfig
    ? `Factories Act, 1948 · ${dicConfig.strSectionReference} · ${dicConfig.strRuleReference}${dicConfig.strState ? ` (${dicConfig.strState} Factories Rules)` : ""}`
    : "";
  const lstTiles: Array<{ strKey: string; strLabel: string; strValue: string }> = dicSummary
    ? [
      { strKey: "employees", strLabel: "Employees in register", strValue: String(dicSummary.intEmployees) },
      { strKey: "payable", strLabel: "Total payable days", strValue: fmtDays(dicSummary.decTotalPayableDays) || "0" },
      { strKey: "issues", strLabel: "Checks needing attention", strValue: String(dicSummary.intIssueCount) },
    ]
    : [];

  return (
    <Box className={styles.page}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
        <Breadcrumbs className="app-breadcrumbs" aria-label="breadcrumb" separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />} sx={{ ml: "3px" }}>
          <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>Reports</Typography>
          <Typography component="h1" className="app-breadcrumb-heading" aria-current="page">Form 12 – Register of Adult Workers</Typography>
        </Breadcrumbs>
        <PageNotices
          strControlId="reports.form12.notices"
          lstNotices={[
            !blnRightsLoading && !blnCanView ? { strKey: "rights", strSeverity: "warning", objMessage: "Form 12 view access is not available for your user group." } : null,
            { strKey: "error", strSeverity: "error", objMessage: strError, fnDismiss: () => setStrError("") },
            dicConfig && !dicConfig.blnLeaveMapped
              ? { strKey: "leave-unmapped", strSeverity: "warning", objMessage: "No leave types are mapped to the EL/CL/SL/RH/CPL columns – open Configuration.", blnToast: false }
              : null,
          ]}
        />
        <Box sx={{ flex: 1 }} />
        {blnCanConfig && blnCanView ? (
          <Button size="small" startIcon={<SettingsRoundedIcon />} onClick={() => setBlnConfigOpen(true)} controlId="reports.form12.config.button">
            Configuration
          </Button>
        ) : null}
      </Stack>

      {strSubtitle ? <Typography sx={{ color: "text.secondary", mt: -0.5 }}>{strSubtitle}</Typography> : null}

      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Box className={styles.reportSearchPanelRow} sx={{ py: "0 !important" }}>
          <Box className={styles.reportSearchField} sx={{ flexBasis: 110, minWidth: 100 }}>
            <TextField className="app-mui-text-field" size="small" select label="Year" value={strYear} required fullWidth InputLabelProps={{ shrink: true }}
              onChange={(objEvent) => { setStrYear(objEvent.target.value); clearReport(); }} disabled={blnBusy || !blnCanView} controlId="reports.form12.year.select">
              {(objOptions?.lstYears ?? []).map((intYear) => <MenuItem key={intYear} value={String(intYear)}>{intYear}</MenuItem>)}
            </TextField>
          </Box>
          <Box className={styles.reportSearchField} sx={{ flexBasis: 140, minWidth: 130 }}>
            <TextField className="app-mui-text-field" size="small" select label="Month" value={strMonth} required fullWidth InputLabelProps={{ shrink: true }}
              onChange={(objEvent) => { setStrMonth(objEvent.target.value); clearReport(); }} disabled={blnBusy || !blnCanView} controlId="reports.form12.month.select">
              {lstMonthNames.map((strName, intIndex) => <MenuItem key={strName} value={String(intIndex + 1)}>{strName}</MenuItem>)}
            </TextField>
          </Box>
          <Box className={styles.reportSearchField} sx={{ flex: "1 1 180px", minWidth: 160 }}>
            <TextField className="app-mui-text-field" size="small" select label="Department" value={strDepartmentID} fullWidth InputLabelProps={{ shrink: true }}
              SelectProps={{ displayEmpty: true }}
              onChange={(objEvent) => { setStrDepartmentID(objEvent.target.value); clearReport(); }} disabled={blnBusy || !blnCanView} controlId="reports.form12.department.select">
              <MenuItem value="">All departments</MenuItem>
              {(objOptions?.lstDepartments ?? []).map((dicDepartment) => <MenuItem key={dicDepartment.intID} value={String(dicDepartment.intID)}>{dicDepartment.strName}</MenuItem>)}
            </TextField>
          </Box>
          <Box className={styles.reportSearchField} sx={{ flex: "1 1 170px", minWidth: 150 }}>
            <TextField className="app-mui-text-field" size="small" select label="Group" value={strGroup} fullWidth InputLabelProps={{ shrink: true }}
              SelectProps={{ displayEmpty: true }}
              onChange={(objEvent) => { setStrGroup(objEvent.target.value as Form12Group | ""); clearReport(); }} disabled={blnBusy || !blnCanView} controlId="reports.form12.group.select">
              <MenuItem value="">All groups</MenuItem>
              {(objOptions?.lstGroups ?? []).map((dicGroup) => <MenuItem key={dicGroup.strCode} value={dicGroup.strCode}>{dicGroup.strLabel}</MenuItem>)}
            </TextField>
          </Box>
          <Box className={styles.reportSearchField} sx={{ flex: "1 1 200px", minWidth: 180 }}>
            <CommonSearchableSelect className="app-mui-text-field" label="Employee" placeholder="All employees"
              value={strEmployeeID === "" ? "" : Number(strEmployeeID)}
              options={(objOptions?.lstEmployees ?? []).map((dicEmployee) => ({ intID: dicEmployee.intID, strLabel: `${dicEmployee.strEmployeeCode} - ${dicEmployee.strName}` }))}
              onChange={(intValue) => { setStrEmployeeID(intValue === "" ? "" : String(intValue)); clearReport(); }}
              disabled={blnBusy || !blnCanView} controlId="reports.form12.employee.select" />
          </Box>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<PlayArrowRoundedIcon />} onClick={() => generate().catch(() => undefined)}
              disabled={blnBusy || !blnCanView || !strYear || !strMonth} controlId="reports.form12.generate.button">
              Generate register
            </Button>
          </Box>
        </Box>
      </Box>

      {lstTiles.length > 0 ? (
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)" } }}>
          {lstTiles.map((dicTile) => (
            <Box key={dicTile.strKey} sx={{ border: "1px solid #e2e8f0", borderRadius: "10px", px: 1.5, py: 1 }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>{dicTile.strLabel}</Typography>
              <Typography sx={{ fontSize: 22, fontWeight: 700 }}>{dicTile.strValue}</Typography>
            </Box>
          ))}
        </Box>
      ) : null}

      <Form14IssueSummary lstGroups={lstIssueGroups} strControlId="reports.form12.validations" />

      <Box className={styles.tableCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
          <Tabs value={strTab} onChange={(_objEvent, strValue: TabKey) => setStrTab(strValue)} controlId="reports.form12.tabs">
            <Tab value="register" label="Daily attendance register" controlId="reports.form12.tab.register" />
            <Tab value="payable" label="Payable days" controlId="reports.form12.tab.payable" />
          </Tabs>
          {blnCanExport ? (
            <Box className={styles.listUtilityActions}>
              <TextField className="app-mui-text-field" size="small" select label="Page size" value={strPageSize} sx={{ minWidth: 100 }} InputLabelProps={{ shrink: true }}
                onChange={(objEvent) => setStrPageSize(objEvent.target.value as Form12PageSize)} disabled={blnBusy} controlId="reports.form12.page-size.select">
                <MenuItem value="A3">A3</MenuItem>
                <MenuItem value="A4">A4</MenuItem>
              </TextField>
              <Button className={styles.secondaryButton} startIcon={<PrintRoundedIcon />} onClick={() => runExport("pdf", "both").catch(() => undefined)}
                disabled={blnBusy || !objRegister} controlId="reports.form12.export-pdf.button">
                Print (PDF)
              </Button>
              <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => runExport("xlsx", "both").catch(() => undefined)}
                disabled={blnBusy || !objRegister} controlId="reports.form12.export-xlsx.button">
                Export Excel
              </Button>
            </Box>
          ) : null}
        </Stack>
        {blnReportLoading ? <Typography sx={{ color: "text.secondary", py: 2 }}>Generating register…</Typography> : null}
        {!blnReportLoading && !objRegister ? (
          <Typography sx={{ color: "text.secondary", py: 2 }}>Select the month and filters, then Generate register.</Typography>
        ) : null}
        {objRegister && strTab === "register" ? <Form12RegisterGrid dicRegister={objRegister} /> : null}
        {objRegister && strTab === "payable" ? <Form12PayableGrid dicRegister={objRegister} /> : null}
      </Box>

      {blnConfigOpen ? (
        <Form12ConfigDialog
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
