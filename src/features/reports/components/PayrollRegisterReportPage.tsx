"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import ReportMultiSelectField, { getUniqueOptions } from "@/features/reports/components/ReportMultiSelectField";
import { payrollReportService } from "@/features/reports/services/payrollReportService";
import type { PayrollResultListRecord } from "@/features/payroll/types";

type SearchForm = {
  strSearchEmployee: string;
  strSearchRun: string;
  strStatus: string;
  strDepartment: string;
  strLocation: string;
  strPayrollMonth: string;
};

const dicEmptySearch: SearchForm = {
  strSearchEmployee: "",
  strSearchRun: "",
  strStatus: "All",
  strDepartment: "",
  strLocation: "",
  strPayrollMonth: "",
};
const lstRowsPerPageOptions = [10, 20, 50];

type PayrollRegisterLabels = {
  strEmployeeCode: string;
  strEmployeeName: string;
  strTaxRegime: string;
  strPayrollRun: string;
  strPayrollPeriod: string;
  strPayrollMonth: string;
  strCalendarDays: string;
  strPaidDays: string;
  strLwpDays: string;
  strLopDays: string;
  strOriginalSalary: string;
  strLwpReduction: string;
  strGrossEarnings: string;
  strEmployeeDeductions: string;
  strTax: string;
  strTaxableIncome: string;
  strAnnualTax: string;
  strMonthlyTds: string;
  strEmployerContributions: string;
  strNetPay: string;
  strStatus: string;
  strTotal: string;
  strReportTitle: string;
};

type LabelFn = (strKey: string, strFallback?: string) => string;

function buildPayrollRegisterLabels(t: LabelFn): PayrollRegisterLabels {
  return {
    strEmployeeCode: t("employee_code", "Employee Code"),
    strEmployeeName: t("employee_name", "Employee Name"),
    strTaxRegime: t("tax_regime", "Tax Regime"),
    strPayrollRun: t("payroll_run", "Payroll Run"),
    strPayrollPeriod: t("payroll_period", "Payroll Period"),
    strPayrollMonth: t("payroll_month", "Payroll Month"),
    strCalendarDays: t("calendar_days", "Calendar Days"),
    strPaidDays: t("paid_days", "Paid Days"),
    strLwpDays: t("lwp_days", "LWP Days"),
    strLopDays: t("lop_days", "LOP Days"),
    strOriginalSalary: t("original_salary", "Original Salary"),
    strLwpReduction: t("lwp_reduction", "LWP Reduction"),
    strGrossEarnings: t("gross_earnings", "Gross Earnings"),
    strEmployeeDeductions: t("employee_deductions", "Employee Deductions"),
    strTax: t("statutory_tax", "Statutory/Tax"),
    strTaxableIncome: t("taxable_income", "Taxable Income"),
    strAnnualTax: t("annual_tax", "Annual Tax"),
    strMonthlyTds: t("monthly_tds", "Monthly TDS"),
    strEmployerContributions: t("employer_contributions", "Employer Contributions"),
    strNetPay: t("net_pay", "Net Pay"),
    strStatus: t("status", "Status"),
    strTotal: t("total", "Total"),
    strReportTitle: t("payroll_register", "Payroll Register"),
  };
}

function formatMonth(strDate: string | null) {
  if (!strDate) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(new Date(strDate));
}

function formatCurrency(decValue: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(decValue || 0);
}

function toCsvValue(objValue: unknown) {
  return `"${String(objValue ?? "").replace(/"/g, '""')}"`;
}

function getNumber(decValue: number | null | undefined) {
  return Number(decValue ?? 0);
}

function getGrossEarnings(dicRow: PayrollResultListRecord) {
  return getNumber(dicRow.decGrossEarningsAmount ?? dicRow.decGrossAmount);
}

function getEmployeeDeductions(dicRow: PayrollResultListRecord) {
  return getNumber(dicRow.decEmployeeDeductionTotal ?? dicRow.decDeductionAmount);
}

function getTaxAmount(dicRow: PayrollResultListRecord) {
  return getNumber(dicRow.decTaxTotal ?? dicRow.decTaxAmount);
}

function downloadCsv(strFileName: string, lstRows: PayrollResultListRecord[], dicLabels: PayrollRegisterLabels) {
  const lstHeaders = [
    dicLabels.strEmployeeCode,
    dicLabels.strEmployeeName,
    dicLabels.strTaxRegime,
    dicLabels.strPayrollRun,
    dicLabels.strPayrollMonth,
    dicLabels.strCalendarDays,
    dicLabels.strPaidDays,
    dicLabels.strLwpDays,
    dicLabels.strLopDays,
    dicLabels.strOriginalSalary,
    dicLabels.strLwpReduction,
    dicLabels.strGrossEarnings,
    dicLabels.strEmployeeDeductions,
    dicLabels.strTax,
    dicLabels.strTaxableIncome,
    dicLabels.strAnnualTax,
    dicLabels.strMonthlyTds,
    dicLabels.strEmployerContributions,
    dicLabels.strNetPay,
    dicLabels.strStatus,
  ];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) =>
      [
        dicRow.strEmployeeCode,
        dicRow.strEmployeeName,
        dicRow.strRegimeUsed ?? "",
        dicRow.strRunName,
        dicRow.dtPayrollMonth ?? "",
        dicRow.decCalendarDays ?? "",
        dicRow.decPaidDays ?? "",
        dicRow.decLwpDays ?? "",
        dicRow.decLopDays ?? "",
        dicRow.decOriginalSalaryAmount ?? 0,
        dicRow.decLwpReductionAmount ?? 0,
        getGrossEarnings(dicRow),
        getEmployeeDeductions(dicRow),
        getTaxAmount(dicRow),
        dicRow.decTaxableIncome,
        dicRow.decAnnualTaxAmount,
        dicRow.decMonthlyTds,
        dicRow.decEmployerContributionTotal ?? 0,
        dicRow.decNetPayAmount,
        dicRow.strStatus,
      ].map(toCsvValue).join(",")
    ),
  ];
  const objBlob = new Blob([lstLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const strUrl = URL.createObjectURL(objBlob);
  const objLink = document.createElement("a");
  objLink.href = strUrl;
  objLink.download = strFileName;
  objLink.click();
  URL.revokeObjectURL(strUrl);
}

function exportPdf(strTitle: string, lstRows: PayrollResultListRecord[], dicLabels: PayrollRegisterLabels) {
  const objWindow = window.open("", "_blank", "width=1280,height=800");
  if (!objWindow) {
    return;
  }
  const strRows = lstRows.map((dicRow) => `
    <tr>
      <td>${dicRow.strEmployeeCode}</td>
      <td>${dicRow.strEmployeeName}</td>
      <td>${dicRow.strRegimeUsed ?? "-"}</td>
      <td>${formatMonth(dicRow.dtPayrollMonth)}</td>
      <td>${dicRow.decCalendarDays ?? "-"}</td>
      <td>${dicRow.decPaidDays ?? "-"}</td>
      <td>${dicRow.decLwpDays ?? "-"}</td>
      <td>${dicRow.decLopDays ?? "-"}</td>
      <td>${formatCurrency(dicRow.decOriginalSalaryAmount ?? 0)}</td>
      <td>${formatCurrency(dicRow.decLwpReductionAmount ?? 0)}</td>
      <td>${formatCurrency(getGrossEarnings(dicRow))}</td>
      <td>${formatCurrency(getEmployeeDeductions(dicRow))}</td>
      <td>${formatCurrency(getTaxAmount(dicRow))}</td>
      <td>${formatCurrency(dicRow.decTaxableIncome)}</td>
      <td>${formatCurrency(dicRow.decAnnualTaxAmount)}</td>
      <td>${formatCurrency(dicRow.decMonthlyTds)}</td>
      <td>${formatCurrency(dicRow.decEmployerContributionTotal ?? 0)}</td>
      <td>${formatCurrency(dicRow.decNetPayAmount)}</td>
      <td>${dicRow.strStatus}</td>
    </tr>
  `).join("");
  objWindow.document.write(`
    <html>
      <head>
        <title>${strTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          h1 { margin: 0 0 16px; font-size: 22px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          th { background: #e2e8f0; }
        </style>
      </head>
      <body>
        <h1>${strTitle}</h1>
        <table>
          <thead>
            <tr>
              <th>${dicLabels.strEmployeeCode}</th>
              <th>${dicLabels.strEmployeeName}</th>
              <th>${dicLabels.strTaxRegime}</th>
              <th>${dicLabels.strPayrollPeriod}</th>
              <th>${dicLabels.strCalendarDays}</th>
              <th>${dicLabels.strPaidDays}</th>
              <th>${dicLabels.strLwpDays}</th>
              <th>${dicLabels.strLopDays}</th>
              <th>${dicLabels.strOriginalSalary}</th>
              <th>${dicLabels.strLwpReduction}</th>
              <th>${dicLabels.strGrossEarnings}</th>
              <th>${dicLabels.strEmployeeDeductions}</th>
              <th>${dicLabels.strTax}</th>
              <th>${dicLabels.strTaxableIncome}</th>
              <th>${dicLabels.strAnnualTax}</th>
              <th>${dicLabels.strMonthlyTds}</th>
              <th>${dicLabels.strEmployerContributions}</th>
              <th>${dicLabels.strNetPay}</th>
              <th>${dicLabels.strStatus}</th>
            </tr>
          </thead>
          <tbody>${strRows}</tbody>
        </table>
      </body>
    </html>
  `);
  objWindow.document.close();
  objWindow.focus();
  objWindow.print();
}

export default function PayrollRegisterReportPage() {
  const { t } = useModuleLabels("reports");
  const dicLabels = useMemo(() => buildPayrollRegisterLabels(t), [t]);
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny } = useModuleActionAccess([
    "REPORTS",
    "PAYROLL_REGISTER",
    "REPORT_PAYROLL_REGISTER",
    "PAYROLL_RESULTS",
    "PAYROLL_RESULT",
  ]);
  const [lstRows, setLstRows] = useState<PayrollResultListRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(false);
  const [blnHasLoadedRows, setBlnHasLoadedRows] = useState(false);
  const [blnFilterDialogOpen, setBlnFilterDialogOpen] = useState(false);
  const [strError, setStrError] = useState("");
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [setSelectedRowIDs, setSetSelectedRowIDs] = useState<Set<number>>(new Set());
  const blnCanView = canViewAny() || canDoAny("view") || canDoAny("list");

  async function loadRows(objFilters: SearchForm) {
    setBlnLoading(true);
    setStrError("");
    try {
      setLstRows(await payrollReportService.getPayrollRegisterRows(objFilters));
      setBlnHasLoadedRows(true);
      setSetSelectedRowIDs(new Set());
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load payroll register.");
    } finally {
      setBlnLoading(false);
    }
  }

  const lstFilteredRows = useMemo(() => lstRows, [lstRows]);
  const dicFilterOptions = useMemo(() => ({
    lstEmployees: getUniqueOptions(lstRows.flatMap((dicRow) => [
      dicRow.strEmployeeCode,
      dicRow.strEmployeeName,
      `${dicRow.strEmployeeCode} - ${dicRow.strEmployeeName}`,
    ])),
    lstRuns: getUniqueOptions(lstRows.flatMap((dicRow) => [dicRow.strRunCode, dicRow.strRunName])),
    lstMonths: getUniqueOptions(lstRows.map((dicRow) => dicRow.dtPayrollMonth?.slice(0, 7))),
    lstDepartments: getUniqueOptions(lstRows.map((dicRow) => dicRow.strDepartmentName)),
    lstLocations: getUniqueOptions(lstRows.map((dicRow) => dicRow.strLocationName)),
    lstStatuses: getUniqueOptions(lstRows.map((dicRow) => dicRow.strStatus)),
  }), [lstRows]);

  const dicTotals = useMemo(() => lstFilteredRows.reduce(
    (dicAccumulator, dicRow) => ({
      decOriginalSalary: dicAccumulator.decOriginalSalary + (dicRow.decOriginalSalaryAmount || 0),
      decLwpReduction: dicAccumulator.decLwpReduction + (dicRow.decLwpReductionAmount || 0),
      decGross: dicAccumulator.decGross + getGrossEarnings(dicRow),
      decDeduction: dicAccumulator.decDeduction + getEmployeeDeductions(dicRow),
      decTax: dicAccumulator.decTax + getTaxAmount(dicRow),
      decEmployerContribution: dicAccumulator.decEmployerContribution + (dicRow.decEmployerContributionTotal || 0),
      decNet: dicAccumulator.decNet + (dicRow.decNetPayAmount || 0),
    }),
    { decOriginalSalary: 0, decLwpReduction: 0, decGross: 0, decDeduction: 0, decTax: 0, decEmployerContribution: 0, decNet: 0 },
  ), [lstFilteredRows]);
  const lstExportRows = setSelectedRowIDs.size > 0
    ? lstFilteredRows.filter((dicRow) => setSelectedRowIDs.has(dicRow.intID))
    : lstFilteredRows;
  const blnAllFilteredSelected = lstFilteredRows.length > 0 && lstFilteredRows.every((dicRow) => setSelectedRowIDs.has(dicRow.intID));
  const blnSomeFilteredSelected = !blnAllFilteredSelected && lstFilteredRows.some((dicRow) => setSelectedRowIDs.has(dicRow.intID));

  function toggleFilteredRows(blnChecked: boolean) {
    setSetSelectedRowIDs((setPrevious) => {
      const setNext = new Set(setPrevious);
      lstFilteredRows.forEach((dicRow) => {
        if (blnChecked) {
          setNext.add(dicRow.intID);
        } else {
          setNext.delete(dicRow.intID);
        }
      });
      return setNext;
    });
  }

  function toggleRow(intRowID: number, blnChecked: boolean) {
    setSetSelectedRowIDs((setPrevious) => {
      const setNext = new Set(setPrevious);
      if (blnChecked) {
        setNext.add(intRowID);
      } else {
        setNext.delete(intRowID);
      }
      return setNext;
    });
  }

  function applyFilters(dicFilters: SearchForm) {
    setDicSearchDraft(dicFilters);
    setBlnFilterDialogOpen(false);
    loadRows(dicFilters).catch(() => undefined);
  }

  function clearFilters() {
    setDicSearchDraft(dicEmptySearch);
    loadRows(dicEmptySearch).catch(() => undefined);
  }

  useEffect(() => {
    if (!blnCanView) {
      return;
    }
    loadRows(dicEmptySearch).catch(() => undefined);
  }, [blnCanView]);

  const lstTableRows = useMemo(
    () =>
      lstFilteredRows.map((dicRow) => ({
        intID: dicRow.intID,
        select: (
          <Checkbox
            inputProps={{ "controlId": "reports.payroll-register.row.select.checkbox", "data-row-key": String(dicRow.intID) } as InputHTMLAttributes<HTMLInputElement>}
            size="small"
            checked={setSelectedRowIDs.has(dicRow.intID)}
            onChange={(objEvent) => toggleRow(dicRow.intID, objEvent.target.checked)}
          />
        ),
        strEmployeeCode: dicRow.strEmployeeCode,
        strEmployeeName: dicRow.strEmployeeName,
        strRegimeUsed: dicRow.strRegimeUsed || "-",
        strPayrollPeriod: formatMonth(dicRow.dtPayrollMonth),
        decCalendarDays: dicRow.decCalendarDays ?? "-",
        decPaidDays: dicRow.decPaidDays ?? "-",
        decLwpDays: dicRow.decLwpDays ?? "-",
        decLopDays: dicRow.decLopDays ?? "-",
        decOriginalSalaryAmount: formatCurrency(dicRow.decOriginalSalaryAmount ?? 0),
        decLwpReductionAmount: formatCurrency(dicRow.decLwpReductionAmount ?? 0),
        decGrossEarningsAmount: formatCurrency(getGrossEarnings(dicRow)),
        decEmployeeDeductionTotal: formatCurrency(getEmployeeDeductions(dicRow)),
        decTaxTotal: formatCurrency(getTaxAmount(dicRow)),
        decTaxableIncome: formatCurrency(dicRow.decTaxableIncome),
        decAnnualTaxAmount: formatCurrency(dicRow.decAnnualTaxAmount),
        decMonthlyTds: formatCurrency(dicRow.decMonthlyTds),
        decEmployerContributionTotal: formatCurrency(dicRow.decEmployerContributionTotal ?? 0),
        decNetPayAmount: formatCurrency(dicRow.decNetPayAmount),
        strStatus: dicRow.strStatus,
      })),
    [lstFilteredRows, setSelectedRowIDs]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      {
        field: "select",
        headerName: (
          <Checkbox
            inputProps={{ "controlId": "reports.payroll-register.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>}
            size="small"
            checked={blnAllFilteredSelected}
            indeterminate={blnSomeFilteredSelected}
            onChange={(objEvent) => toggleFilteredRows(objEvent.target.checked)}
            disabled={lstFilteredRows.length === 0}
          />
        ),
        sortable: false,
        filterable: false,
        exportable: false,
        width: 56,
      },
      { field: "strEmployeeCode", headerName: dicLabels.strEmployeeCode, width: 150 },
      { field: "strEmployeeName", headerName: dicLabels.strEmployeeName, width: 220 },
      { field: "strRegimeUsed", headerName: dicLabels.strTaxRegime, width: 140 },
      { field: "strPayrollPeriod", headerName: dicLabels.strPayrollPeriod, width: 140 },
      { field: "decCalendarDays", headerName: dicLabels.strCalendarDays, width: 120, align: "right" },
      { field: "decPaidDays", headerName: dicLabels.strPaidDays, width: 110, align: "right" },
      { field: "decLwpDays", headerName: dicLabels.strLwpDays, width: 110, align: "right" },
      { field: "decLopDays", headerName: dicLabels.strLopDays, width: 110, align: "right" },
      { field: "decOriginalSalaryAmount", headerName: dicLabels.strOriginalSalary, width: 150, align: "right" },
      { field: "decLwpReductionAmount", headerName: dicLabels.strLwpReduction, width: 150, align: "right" },
      { field: "decGrossEarningsAmount", headerName: dicLabels.strGrossEarnings, width: 150, align: "right" },
      { field: "decEmployeeDeductionTotal", headerName: dicLabels.strEmployeeDeductions, width: 170, align: "right" },
      { field: "decTaxTotal", headerName: dicLabels.strTax, width: 140, align: "right" },
      { field: "decTaxableIncome", headerName: dicLabels.strTaxableIncome, width: 150, align: "right" },
      { field: "decAnnualTaxAmount", headerName: dicLabels.strAnnualTax, width: 140, align: "right" },
      { field: "decMonthlyTds", headerName: dicLabels.strMonthlyTds, width: 140, align: "right" },
      { field: "decEmployerContributionTotal", headerName: dicLabels.strEmployerContributions, width: 180, align: "right" },
      { field: "decNetPayAmount", headerName: dicLabels.strNetPay, width: 140, align: "right" },
      { field: "strStatus", headerName: dicLabels.strStatus, width: 120 },
    ],
    [blnAllFilteredSelected, blnSomeFilteredSelected, dicLabels, lstFilteredRows.length]
  );

  if (blnRightsLoading || (blnLoading && !blnHasLoadedRows)) {
    return <BlockingLoader blnOpen strLabel="Loading payroll register..." />;
  }

  return (
    <Box className={styles.page}>
      <Typography className={`${styles.breadcrumbs} ${styles.hiddenHeader}`}>Payroll Register</Typography>
      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader} sx={{ mb: 1.25 }}>
          <Box />
        </Box>
        <Box className={styles.reportSearchPanelRow}>
          <Box className={styles.reportSearchField}>
            <ReportMultiSelectField value={dicSearchDraft.strSearchEmployee} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchEmployee: strValue }))} options={dicFilterOptions.lstEmployees} placeholder="Search by employee code or name" controlId="reports.payroll-register.employee-search.input" />
          </Box>
          <Box className={styles.reportSearchField}>
            <ReportMultiSelectField value={dicSearchDraft.strSearchRun} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchRun: strValue }))} options={dicFilterOptions.lstRuns} placeholder="Payroll period or run" controlId="reports.payroll-register.run-search.input" />
          </Box>
          <Box className={styles.reportSearchField}>
            <ReportMultiSelectField value={dicSearchDraft.strPayrollMonth} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strPayrollMonth: strValue }))} options={dicFilterOptions.lstMonths} label="Payroll Month" placeholder="Payroll Month" controlId="reports.payroll-register.payroll-month.input" />
          </Box>
          <Box className={styles.reportSearchField}>
            <ReportMultiSelectField value={dicSearchDraft.strDepartment} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strDepartment: strValue }))} options={dicFilterOptions.lstDepartments} placeholder="Department" controlId="reports.payroll-register.department.input" />
          </Box>
          <Box className={styles.reportSearchField}>
            <ReportMultiSelectField value={dicSearchDraft.strLocation} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strLocation: strValue }))} options={dicFilterOptions.lstLocations} placeholder="Location" controlId="reports.payroll-register.location.input" />
          </Box>
          <Box className={styles.reportSearchField}>
            <ReportMultiSelectField label="Status" value={dicSearchDraft.strStatus === "All" ? "" : dicSearchDraft.strStatus} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: (strValue || "All") as SearchForm["strStatus"] }))} options={dicFilterOptions.lstStatuses.length ? dicFilterOptions.lstStatuses : ["Calculated", "Approved", "Published", "Paid"]} placeholder="All statuses" controlId="reports.payroll-register.status.select" />
          </Box>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => applyFilters(dicSearchDraft)} data-controlid="reports.payroll-register.search.button">Search</Button>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearFilters} data-controlid="reports.payroll-register.clear.button">Clear</Button>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          alignItems: "center",
          backgroundColor: "#f8fbff",
          border: "1px solid rgba(191,219,254,0.7)",
          borderRadius: "16px",
          color: "#1f2937",
          display: "flex",
          gap: 1,
          px: 1.5,
          py: 1.25,
        }}
      >
        <InfoOutlinedIcon sx={{ color: "#2b6cb0", fontSize: 20 }} />
        <Typography sx={{ color: "inherit", lineHeight: 1.5 }}>
          Employee-wise earnings, deductions, regime, taxable income, annual tax, monthly TDS, gross pay, and net pay from processed payroll results.
        </Typography>
      </Box>

      <Box className={styles.tableCard}>
        {!blnCanView && !strError ? <Alert severity="warning" sx={{ mb: 1.5 }}>Payroll register view access is not available for your user group.</Alert> : null}
        {strError ? <Alert severity="error" sx={{ mb: 1.5 }}>{strError}</Alert> : null}
        <CommonTable
          columns={lstTableColumns}
          rows={lstTableRows}
          rowIdField="intID"
          defaultPageSize={lstRowsPerPageOptions[0]}
          pageSizeOptions={lstRowsPerPageOptions}
          emptyMessage="No payroll register rows found for the current filters."
          showPaginationSummary
          withPaper={false}
          testIdPrefix="reports.payroll-register"
          toolbarLeft={(
            <Box className={styles.listUtilityActions}>
              {canDoAny("export") ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv("payroll-register.csv", lstExportRows, dicLabels)} data-controlid="reports.payroll-register.export-excel.button">Export Excel</Button> : null}
              {canDoAny("export") ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf(dicLabels.strReportTitle, lstExportRows, dicLabels)} data-controlid="reports.payroll-register.download-pdf.button">Download PDF</Button> : null}
              {setSelectedRowIDs.size > 0 ? <Typography sx={{ color: "#64748b", alignSelf: "center" }}>{setSelectedRowIDs.size} selected</Typography> : null}
            </Box>
          )}
          footerContent={lstFilteredRows.length > 0 ? (
            <Box sx={{ px: 1.5, py: 1.25, borderTop: "1px solid #e2e8f0" }}>
              <Box sx={{ minWidth: 2746, display: "grid", gridTemplateColumns: "56px 150px 220px 140px 140px 120px 110px 110px 110px 150px 150px 150px 170px 140px 150px 140px 140px 180px 140px 120px", alignItems: "center" }}>
                <Typography sx={{ fontWeight: 700, gridColumn: "1 / span 9" }}>{dicLabels.strTotal}</Typography>
                <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicTotals.decOriginalSalary)}</Typography>
                <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicTotals.decLwpReduction)}</Typography>
                <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicTotals.decGross)}</Typography>
                <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicTotals.decDeduction)}</Typography>
                <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicTotals.decTax)}</Typography>
                <Box />
                <Box />
                <Box />
                <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicTotals.decEmployerContribution)}</Typography>
                <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicTotals.decNet)}</Typography>
                <Box />
              </Box>
            </Box>
          ) : null}
          getRowSx={(dicRow) => setSelectedRowIDs.has(dicRow.intID) ? { backgroundColor: "rgba(37, 99, 235, 0.08)" } : undefined}
          sx={{ p: 0, boxShadow: "none", background: "transparent" }}
        />
      </Box>

      <Dialog open={blnFilterDialogOpen} maxWidth="sm" fullWidth>
        <DialogTitle>Payroll Register</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, pt: 1 }}>
            <TextField
              label="Payroll Month"
              type="month"
              value={dicSearchDraft.strPayrollMonth}
              onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strPayrollMonth: objEvent.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Department"
              value={dicSearchDraft.strDepartment}
              onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strDepartment: objEvent.target.value }))}
              fullWidth
            />
            <TextField
              label="Location"
              value={dicSearchDraft.strLocation}
              onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strLocation: objEvent.target.value }))}
              fullWidth
            />
            <TextField
              label="Status"
              select
              value={dicSearchDraft.strStatus}
              onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: objEvent.target.value as SearchForm["strStatus"] }))}
              fullWidth
            >
              <MenuItem value="All">All statuses</MenuItem>
              <MenuItem value="Calculated">Calculated</MenuItem>
              <MenuItem value="Approved">Approved</MenuItem>
              <MenuItem value="Published">Published</MenuItem>
              <MenuItem value="Paid">Paid</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => setDicSearchDraft(dicEmptySearch)}>Reset</Button>
          {blnHasLoadedRows ? <Button className={styles.secondaryButton} onClick={() => setBlnFilterDialogOpen(false)}>Close</Button> : null}
          <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => applyFilters(dicSearchDraft)} disabled={blnLoading}>Show Report</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
