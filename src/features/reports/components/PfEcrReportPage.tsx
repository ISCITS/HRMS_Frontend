"use client";

import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import {
  pfEcrReportService,
  type PfEcrEntityOption,
  type PfEcrExportFormat,
  type PfEcrFilters,
  type PfEcrReport,
  type PfEcrReturnType,
  type PfEcrRunOption,
} from "@/features/reports/services/pfEcrReportService";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

const lstRowsPerPageOptions = [20, 50, 100];

type ReturnColumn = { strKey: string; strLabel: string; intWidth: number; blnNumber: boolean };

// Columns in the order of each return's upload file; the grid uses the same sequence.
const dicReturnColumns: Record<PfEcrReturnType, ReturnColumn[]> = {
  PF: [
    { strKey: "strUan", strLabel: "UAN", intWidth: 140, blnNumber: false },
    { strKey: "strMemberName", strLabel: "Member Name", intWidth: 220, blnNumber: false },
    { strKey: "intGrossWages", strLabel: "Gross Wages", intWidth: 120, blnNumber: true },
    { strKey: "intEpfWages", strLabel: "EPF Wages", intWidth: 110, blnNumber: true },
    { strKey: "intEpsWages", strLabel: "EPS Wages", intWidth: 110, blnNumber: true },
    { strKey: "intEdliWages", strLabel: "EDLI Wages", intWidth: 110, blnNumber: true },
    { strKey: "intEeShare", strLabel: "EE Share Remitted", intWidth: 140, blnNumber: true },
    { strKey: "intEpsContribution", strLabel: "EPS Contribution Remitted", intWidth: 170, blnNumber: true },
    { strKey: "intErShare", strLabel: "ER Share Remitted", intWidth: 140, blnNumber: true },
    { strKey: "intNcpDays", strLabel: "NCP Days", intWidth: 100, blnNumber: true },
    { strKey: "intRefundOfAdvances", strLabel: "Refund of Advances", intWidth: 150, blnNumber: true },
  ],
  ESIC: [
    { strKey: "strIpNumber", strLabel: "IP Number", intWidth: 130, blnNumber: false },
    { strKey: "strIpName", strLabel: "IP Name", intWidth: 240, blnNumber: false },
    { strKey: "intDays", strLabel: "Days Paid", intWidth: 110, blnNumber: true },
    { strKey: "intWages", strLabel: "Total Monthly Wages", intWidth: 170, blnNumber: true },
    { strKey: "strReasonCode", strLabel: "Reason Code", intWidth: 120, blnNumber: false },
    { strKey: "strLastWorkingDay", strLabel: "Last Working Day", intWidth: 150, blnNumber: false },
  ],
};

const dicReturnTotals: Record<PfEcrReturnType, Array<{ strKey: string; strLabel: string }>> = {
  PF: [
    { strKey: "intGrossWages", strLabel: "Gross Wages" },
    { strKey: "intEpfWages", strLabel: "EPF Wages" },
    { strKey: "intEpsWages", strLabel: "EPS Wages" },
    { strKey: "intEdliWages", strLabel: "EDLI Wages" },
    { strKey: "intEeShare", strLabel: "EE Share" },
    { strKey: "intEpsContribution", strLabel: "EPS Contribution" },
    { strKey: "intErShare", strLabel: "ER Share" },
    { strKey: "intNcpDays", strLabel: "NCP Days" },
    { strKey: "intRefundOfAdvances", strLabel: "Refunds" },
  ],
  ESIC: [
    { strKey: "intDays", strLabel: "Days Paid" },
    { strKey: "intWages", strLabel: "Total Monthly Wages" },
  ],
};

// Upload files each return can be exported as, in the client's template layouts.
const dicReturnExports: Record<PfEcrReturnType, Array<{ strFormat: PfEcrExportFormat; strLabel: string }>> = {
  PF: [
    { strFormat: "xls", strLabel: "Export Excel" },
    { strFormat: "txt", strLabel: "Export TXT" },
  ],
  ESIC: [
    { strFormat: "xls", strLabel: "Export ESIC ECR" },
    { strFormat: "mc", strLabel: "Export MC Template" },
  ],
};

function formatNumber(intValue: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(intValue || 0);
}

function getPreviousMonth() {
  const dtNow = new Date();
  const dtPrevious = new Date(dtNow.getFullYear(), dtNow.getMonth() - 1, 1);
  return `${dtPrevious.getFullYear()}-${String(dtPrevious.getMonth() + 1).padStart(2, "0")}`;
}

export default function PfEcrReportPage() {
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny } = useModuleActionAccess([
    "REPORTS",
    "PF_ECR_REPORT",
    "STATUTORY_REPORT",
    "REPORT_STATUTORY",
    "PAYROLL_RESULTS",
    "PAYROLL_RESULT",
  ]);
  const blnCanView = canViewAny() || canDoAny("view") || canDoAny("list");
  const blnCanExport = canDoAny("export");

  const [strReturnType, setStrReturnType] = useState<PfEcrReturnType>("PF");
  const [strPayrollMonth, setStrPayrollMonth] = useState("");
  const [strEntity, setStrEntity] = useState("");
  const [strPayrollRunID, setStrPayrollRunID] = useState("");
  const [lstEntities, setLstEntities] = useState<PfEcrEntityOption[]>([]);
  const [lstRuns, setLstRuns] = useState<PfEcrRunOption[]>([]);
  const [objReport, setObjReport] = useState<PfEcrReport | null>(null);
  const [blnOptionsLoading, setBlnOptionsLoading] = useState(false);
  const [blnReportLoading, setBlnReportLoading] = useState(false);
  const [blnExporting, setBlnExporting] = useState(false);
  // Format waiting for confirmation because some members cannot be filed.
  const [strConfirmFormat, setStrConfirmFormat] = useState<PfEcrExportFormat | "">("");
  const [strError, setStrError] = useState("");
  // Guards against a slow response for an earlier selection overwriting the current one.
  const intRequestSequence = useRef(0);

  const blnBusy = blnRightsLoading || blnOptionsLoading || blnReportLoading || blnExporting;
  const blnCanGenerate = Boolean(strPayrollMonth && strEntity && strPayrollRunID) && !blnBusy;

  async function loadOptions(strMonth: string) {
    setBlnOptionsLoading(true);
    setStrError("");
    try {
      const objOptions = await pfEcrReportService.getOptions(strMonth);
      setLstEntities(objOptions.lstEntities);
      setLstRuns(objOptions.lstRuns);
      setStrEntity((strPrevious) => (objOptions.lstEntities.some((dicEntity) => dicEntity.strValue === strPrevious) ? strPrevious : ""));
      setStrPayrollRunID(objOptions.lstRuns.length === 1 ? objOptions.lstRuns[0].strValue : "");
      return objOptions;
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load PF ECR filters.");
      return null;
    } finally {
      setBlnOptionsLoading(false);
    }
  }

  useEffect(() => {
    if (!blnCanView) {
      return;
    }
    (async () => {
      const objInitial = await pfEcrReportService.getOptions("").catch(() => null);
      const strMonth = objInitial?.strDefaultPayrollMonth || getPreviousMonth();
      setStrPayrollMonth(strMonth);
      await loadOptions(strMonth);
    })().catch(() => undefined);
  }, [blnCanView]);

  function clearReport() {
    intRequestSequence.current += 1;
    setObjReport(null);
  }

  function handleMonthChange(strMonth: string) {
    setStrPayrollMonth(strMonth);
    clearReport();
    setStrPayrollRunID("");
    if (strMonth) {
      loadOptions(strMonth).catch(() => undefined);
    } else {
      setLstRuns([]);
    }
  }

  function handleReturnTypeChange(strValue: PfEcrReturnType) {
    setStrReturnType(strValue);
    clearReport();
  }

  function handleEntityChange(strValue: string) {
    // Never carry another entity's rows forward.
    setStrEntity(strValue);
    clearReport();
  }

  function handleRunChange(strValue: string) {
    setStrPayrollRunID(strValue);
    clearReport();
  }

  function getFilters(): PfEcrFilters {
    return { strPayrollMonth, strEntity, strPayrollRunID, strReturnType };
  }

  async function generateReport() {
    const intSequence = intRequestSequence.current + 1;
    intRequestSequence.current = intSequence;
    setBlnReportLoading(true);
    setStrError("");
    setObjReport(null);
    try {
      const objResult = await pfEcrReportService.getReport(getFilters());
      if (intRequestSequence.current === intSequence) {
        setObjReport(objResult);
      }
    } catch (objError) {
      if (intRequestSequence.current === intSequence) {
        setStrError(objError instanceof Error ? objError.message : "Unable to generate the report.");
      }
    } finally {
      if (intRequestSequence.current === intSequence) {
        setBlnReportLoading(false);
      }
    }
  }

  async function exportFile(strFormat: PfEcrExportFormat) {
    if (!objReport) {
      return;
    }
    setStrConfirmFormat("");
    setBlnExporting(true);
    setStrError("");
    try {
      const strFallbackFileName = objReport.dicSummary.strFileName.replace(/\.xlsx$/i, strFormat === "txt" ? ".txt" : ".xls");
      await pfEcrReportService.downloadFile(getFilters(), strFormat, strFallbackFileName);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to export the file.");
    } finally {
      setBlnExporting(false);
    }
  }

  function requestExport(strFormat: PfEcrExportFormat) {
    if (objReport && objReport.dicIssueCounts.Blocking > 0) {
      setStrConfirmFormat(strFormat);
      return;
    }
    exportFile(strFormat).catch(() => undefined);
  }

  // The columns follow the return the shown report was generated for, not the selector.
  const strShownReturnType: PfEcrReturnType = objReport?.strReturnType ?? strReturnType;
  const lstReturnColumns = dicReturnColumns[strShownReturnType];

  const lstTableRows = useMemo(
    () =>
      (objReport?.lstRows ?? []).map((dicRow) => ({
        intID: dicRow.intEmployeeID,
        strEmployeeCode: dicRow.strEmployeeCode,
        ...Object.fromEntries(
          lstReturnColumns.flatMap((dicColumn) => {
            const objValue = dicRow[dicColumn.strKey];
            return dicColumn.blnNumber
              ? [[dicColumn.strKey, formatNumber(Number(objValue ?? 0))], [`${dicColumn.strKey}SortValue`, Number(objValue ?? 0)]]
              : [[dicColumn.strKey, objValue ? String(objValue) : "-"]];
          }),
        ),
      })),
    [objReport, lstReturnColumns],
  );

  const lstTableColumns = useMemo<CommonTableColumn<Record<string, ReactNode>>[]>(
    () => [
      { field: "strEmployeeCode", headerName: "Employee Code", width: 130 },
      ...lstReturnColumns.map((dicColumn) => ({
        field: dicColumn.strKey,
        headerName: dicColumn.strLabel,
        width: dicColumn.intWidth,
        ...(dicColumn.blnNumber
          ? { align: "right" as const, sortAccessor: (dicRow: Record<string, ReactNode>) => Number(dicRow[`${dicColumn.strKey}SortValue`] ?? 0) }
          : {}),
      })),
    ],
    [lstReturnColumns],
  );

  const dicIssueCounts = objReport?.dicIssueCounts;
  // Only what stops a member from being filed is shown; warnings stay off this screen.
  const lstBlockingIssues = (objReport?.lstIssues ?? []).filter((dicIssue) => dicIssue.strSeverity === "Blocking");

  return (
    <Box className={styles.page}>
      <Breadcrumbs className="app-breadcrumbs" aria-label="breadcrumb" separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />} sx={{ ml: "3px" }}>
        <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>Reports</Typography>
        <Typography component="h1" className="app-breadcrumb-heading" aria-current="page">PF / ESIC ECR Report</Typography>
      </Breadcrumbs>

      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Box className={styles.reportSearchPanelRow} sx={{ py: "0 !important" }}>
          <Box className={styles.reportSearchField} sx={{ flexBasis: 150, minWidth: 140 }}>
            <TextField
              className="app-mui-text-field"
              size="small"
              select
              label="Return"
              value={strReturnType}
              onChange={(objEvent) => handleReturnTypeChange(objEvent.target.value as PfEcrReturnType)}
              disabled={blnBusy || !blnCanView}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              controlId="reports.pf-ecr.return-type.select"
            >
              <MenuItem value="PF">PF (EPFO)</MenuItem>
              <MenuItem value="ESIC">ESIC</MenuItem>
            </TextField>
          </Box>
          <Box className={styles.reportSearchField} sx={{ flexBasis: 180, minWidth: 170 }}>
            <TextField
              className="app-mui-text-field"
              size="small"
              type="month"
              label="Payroll Month"
              value={strPayrollMonth}
              onChange={(objEvent) => handleMonthChange(objEvent.target.value)}
              disabled={blnBusy || !blnCanView}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              controlId="reports.pf-ecr.payroll-month.input"
            />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flex: "1 1 240px", minWidth: 220 }}>
            <TextField
              className="app-mui-text-field"
              size="small"
              select
              label="Entity"
              value={strEntity}
              onChange={(objEvent) => handleEntityChange(objEvent.target.value)}
              disabled={blnBusy || !blnCanView}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              SelectProps={{ displayEmpty: true }}
              controlId="reports.pf-ecr.entity.select"
            >
              <MenuItem value="" disabled>Select entity</MenuItem>
              {lstEntities.map((dicEntity) => (
                <MenuItem key={dicEntity.strValue} value={dicEntity.strValue}>{dicEntity.strLabel}</MenuItem>
              ))}
            </TextField>
          </Box>
          <Box className={styles.reportSearchField} sx={{ flex: "1 1 280px", minWidth: 240 }}>
            <TextField
              className="app-mui-text-field"
              size="small"
              select
              label="Payroll Run"
              value={strPayrollRunID}
              onChange={(objEvent) => handleRunChange(objEvent.target.value)}
              disabled={blnBusy || !blnCanView || lstRuns.length === 0}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              SelectProps={{ displayEmpty: true }}
              helperText={strPayrollMonth && !blnOptionsLoading && lstRuns.length === 0 ? "No processed payroll run for this month." : undefined}
              controlId="reports.pf-ecr.payroll-run.select"
            >
              <MenuItem value="" disabled>Select payroll run</MenuItem>
              {lstRuns.map((dicRun) => (
                <MenuItem key={dicRun.strValue} value={dicRun.strValue}>
                  {dicRun.strLabel} ({dicRun.strRunStatus}{dicRun.blnIsLocked ? ", Locked" : ""})
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<PlayArrowRoundedIcon />} onClick={() => generateReport().catch(() => undefined)} disabled={!blnCanGenerate} controlId="reports.pf-ecr.generate.button">
              Generate
            </Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ alignItems: "center", backgroundColor: "#f8fbff", border: "1px solid rgba(191,219,254,0.7)", borderRadius: "16px", color: "#1f2937", display: "flex", gap: 1, px: 1.5, py: 1.25 }}>
        <InfoOutlinedIcon sx={{ color: "#2b6cb0", fontSize: 20 }} />
        <Typography sx={{ color: "inherit", lineHeight: 1.5 }}>
          Employee-wise PF (EPFO) or ESIC return values for one entity and one processed payroll run, in the upload-file layouts. Values come from the frozen payroll results; nothing is recalculated or saved.
        </Typography>
      </Box>

      {!blnRightsLoading && !blnCanView ? <Alert severity="warning">PF ECR report view access is not available for your user group.</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}

      {lstBlockingIssues.length > 0 ? (
        <Alert severity="error">
          <Typography sx={{ fontWeight: 600 }}>
            {objReport?.intExcludedCount ? `${objReport.intExcludedCount} member(s) left out of the upload files` : "Needs attention before filing"}
          </Typography>
          <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5, maxHeight: 160, overflowY: "auto" }}>
            {lstBlockingIssues.map((dicIssue, intIndex) => (
              <Typography component="li" variant="body2" key={`${dicIssue.strEmployeeCode}-${intIndex}`}>
                {dicIssue.strEmployeeCode ? `${dicIssue.strEmployeeCode} ${dicIssue.strEmployeeName}: ` : ""}{dicIssue.strIssue}
              </Typography>
            ))}
          </Box>
        </Alert>
      ) : null}

      <Box className={styles.tableCard} sx={{ p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <CommonTable
          columns={lstTableColumns}
          rows={lstTableRows as unknown as Record<string, ReactNode>[]}
          rowIdField="intID"
          defaultPageSize={lstRowsPerPageOptions[0]}
          pageSizeOptions={lstRowsPerPageOptions}
          emptyMessage={objReport ? `No ${strShownReturnType} members for this entity in the selected run.` : "Select return, payroll month, entity and payroll run, then Generate."}
          showPaginationSummary
          withPaper={false}
          testIdPrefix="reports.pf-ecr"
          loading={blnReportLoading}
          loadingHeaderSkeleton
          skeletonRowCount={10}
          hideRowClickHint
          onRowClick={() => undefined}
          toolbarLeft={(
            <Box className={styles.listUtilityActions}>
              {blnCanExport && objReport
                ? dicReturnExports[strShownReturnType].map((dicExport) => (
                  <Button
                    key={dicExport.strFormat}
                    className={styles.secondaryButton}
                    startIcon={<DownloadRoundedIcon />}
                    onClick={() => requestExport(dicExport.strFormat)}
                    disabled={blnBusy || objReport.intMemberCount === 0}
                    controlId={`reports.pf-ecr.export-${strShownReturnType.toLowerCase()}-${dicExport.strFormat}.button`}
                  >
                    {dicExport.strLabel}
                  </Button>
                ))
                : null}
            </Box>
          )}
          footerContent={objReport && objReport.lstRows.length > 0 ? (
            <Box sx={{ px: 1.5, py: 1.25, borderTop: "1px solid #e2e8f0", display: "flex", flexWrap: "wrap", columnGap: 3, rowGap: 0.75 }}>
              <Typography sx={{ fontWeight: 700 }}>Total ({objReport.intMemberCount} members)</Typography>
              {dicReturnTotals[strShownReturnType].map((dicColumn) => (
                <Typography key={dicColumn.strKey} sx={{ fontWeight: 600 }}>
                  {dicColumn.strLabel}: {formatNumber(objReport.dicTotals[dicColumn.strKey] ?? 0)}
                </Typography>
              ))}
            </Box>
          ) : null}
          sx={{ p: 0, boxShadow: "none", background: "transparent" }}
        />
      </Box>

      <Dialog open={Boolean(strConfirmFormat)} onClose={() => setStrConfirmFormat("")}>
        <DialogTitle>Export with issues?</DialogTitle>
        <DialogContent>
          <Typography>
            {dicIssueCounts?.Blocking ?? 0} issue(s) need attention (listed above). Members without a valid UAN / IP number are left out of the file.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStrConfirmFormat("")} controlId="reports.pf-ecr.export-cancel.button">Cancel</Button>
          <Button variant="contained" onClick={() => { if (strConfirmFormat) { exportFile(strConfirmFormat).catch(() => undefined); } }} controlId="reports.pf-ecr.export-confirm.button">Export anyway</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
