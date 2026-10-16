"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Breadcrumbs, Button, Checkbox, Typography } from "@mui/material";
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";
import { useSearchParams } from "next/navigation";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { ReportMoreFilters, SingleSelectFilter } from "@/features/reports/components/ReportFilterUi";
import { getUniqueOptions } from "@/features/reports/components/ReportMultiSelectField";
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
type MoreFiltersForm = Pick<SearchForm, "strDepartment" | "strLocation">;
const dicEmptyMoreFilters: MoreFiltersForm = { strDepartment: "", strLocation: "" };

function normalizeQueryMonth(strValue: string | null) {
  const strTrimmed = String(strValue ?? "").trim();
  return /^\d{4}-\d{2}/.test(strTrimmed) ? strTrimmed.slice(0, 7) : "";
}

function buildInitialSearchFromQuery(objSearchParams: { get: (strKey: string) => string | null }): SearchForm {
  const strPayrollMonth = normalizeQueryMonth(objSearchParams.get("month"));
  return strPayrollMonth ? { ...dicEmptySearch, strPayrollMonth } : dicEmptySearch;
}

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
  const objSearchParams = useSearchParams();
  const dicInitialSearch = useMemo(() => buildInitialSearchFromQuery(objSearchParams), [objSearchParams]);
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
  const [dicMoreFiltersDraft, setDicMoreFiltersDraft] = useState<MoreFiltersForm>(dicEmptyMoreFilters);
  const [strError, setStrError] = useState("");
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicInitialSearch);
  const [setSelectedRowIDs, setSetSelectedRowIDs] = useState<Set<number>>(new Set());
  const blnCanView = canViewAny() || canDoAny("view") || canDoAny("list");
  const blnPageLoading = blnRightsLoading || blnLoading;

  async function loadRows(objFilters: SearchForm) {
    setBlnLoading(true);
    setStrError("");
    try {
      setLstRows(await payrollReportService.getPayrollRegisterRows(objFilters));
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
    loadRows(dicFilters).catch(() => undefined);
  }

  function clearFilters() {
    setDicSearchDraft(dicEmptySearch);
    setDicMoreFiltersDraft(dicEmptyMoreFilters);
    loadRows(dicEmptySearch).catch(() => undefined);
  }

  function applyMoreFilters() {
    applyFilters({ ...dicSearchDraft, ...dicMoreFiltersDraft });
  }

  useEffect(() => {
    if (!blnCanView) {
      return;
    }
    loadRows(dicInitialSearch).catch(() => undefined);
  }, [blnCanView, dicInitialSearch]);

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
        strPayrollPeriodSortValue: dicRow.dtPayrollMonth ? new Date(dicRow.dtPayrollMonth).getTime() : 0,
        decCalendarDays: dicRow.decCalendarDays ?? "-",
        decPaidDays: dicRow.decPaidDays ?? "-",
        decLwpDays: dicRow.decLwpDays ?? "-",
        decLopDays: dicRow.decLopDays ?? "-",
        decOriginalSalaryAmount: formatCurrency(dicRow.decOriginalSalaryAmount ?? 0),
        decOriginalSalaryAmountSortValue: Number(dicRow.decOriginalSalaryAmount ?? 0),
        decLwpReductionAmount: formatCurrency(dicRow.decLwpReductionAmount ?? 0),
        decLwpReductionAmountSortValue: Number(dicRow.decLwpReductionAmount ?? 0),
        decGrossEarningsAmount: formatCurrency(getGrossEarnings(dicRow)),
        decGrossEarningsAmountSortValue: getGrossEarnings(dicRow),
        decEmployeeDeductionTotal: formatCurrency(getEmployeeDeductions(dicRow)),
        decEmployeeDeductionTotalSortValue: getEmployeeDeductions(dicRow),
        decTaxTotal: formatCurrency(getTaxAmount(dicRow)),
        decTaxTotalSortValue: getTaxAmount(dicRow),
        decTaxableIncome: formatCurrency(dicRow.decTaxableIncome),
        decTaxableIncomeSortValue: Number(dicRow.decTaxableIncome ?? 0),
        decAnnualTaxAmount: formatCurrency(dicRow.decAnnualTaxAmount),
        decAnnualTaxAmountSortValue: Number(dicRow.decAnnualTaxAmount ?? 0),
        decMonthlyTds: formatCurrency(dicRow.decMonthlyTds),
        decMonthlyTdsSortValue: Number(dicRow.decMonthlyTds ?? 0),
        decEmployerContributionTotal: formatCurrency(dicRow.decEmployerContributionTotal ?? 0),
        decEmployerContributionTotalSortValue: Number(dicRow.decEmployerContributionTotal ?? 0),
        decNetPayAmount: formatCurrency(dicRow.decNetPayAmount),
        decNetPayAmountSortValue: Number(dicRow.decNetPayAmount ?? 0),
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
      { field: "strEmployeeName", headerName: dicLabels.strEmployeeName, width: 220 },
      { field: "strEmployeeCode", headerName: dicLabels.strEmployeeCode, width: 150 },
      { field: "strRegimeUsed", headerName: dicLabels.strTaxRegime, width: 140 },
      { field: "strPayrollPeriod", headerName: dicLabels.strPayrollPeriod, width: 140, sortAccessor: (dicRow) => dicRow.strPayrollPeriodSortValue },
      { field: "decCalendarDays", headerName: dicLabels.strCalendarDays, width: 120, align: "right" },
      { field: "decPaidDays", headerName: dicLabels.strPaidDays, width: 110, align: "right" },
      { field: "decLwpDays", headerName: dicLabels.strLwpDays, width: 110, align: "right" },
      { field: "decLopDays", headerName: dicLabels.strLopDays, width: 110, align: "right" },
      { field: "decOriginalSalaryAmount", headerName: dicLabels.strOriginalSalary, width: 150, align: "right", sortAccessor: (dicRow) => dicRow.decOriginalSalaryAmountSortValue },
      { field: "decLwpReductionAmount", headerName: dicLabels.strLwpReduction, width: 150, align: "right", sortAccessor: (dicRow) => dicRow.decLwpReductionAmountSortValue },
      { field: "decGrossEarningsAmount", headerName: dicLabels.strGrossEarnings, width: 150, align: "right", sortAccessor: (dicRow) => dicRow.decGrossEarningsAmountSortValue },
      { field: "decEmployeeDeductionTotal", headerName: dicLabels.strEmployeeDeductions, width: 170, align: "right", sortAccessor: (dicRow) => dicRow.decEmployeeDeductionTotalSortValue },
      { field: "decTaxTotal", headerName: dicLabels.strTax, width: 140, align: "right", sortAccessor: (dicRow) => dicRow.decTaxTotalSortValue },
      { field: "decTaxableIncome", headerName: dicLabels.strTaxableIncome, width: 150, align: "right", sortAccessor: (dicRow) => dicRow.decTaxableIncomeSortValue },
      { field: "decAnnualTaxAmount", headerName: dicLabels.strAnnualTax, width: 140, align: "right", sortAccessor: (dicRow) => dicRow.decAnnualTaxAmountSortValue },
      { field: "decMonthlyTds", headerName: dicLabels.strMonthlyTds, width: 140, align: "right", sortAccessor: (dicRow) => dicRow.decMonthlyTdsSortValue },
      { field: "decEmployerContributionTotal", headerName: dicLabels.strEmployerContributions, width: 180, align: "right", sortAccessor: (dicRow) => dicRow.decEmployerContributionTotalSortValue },
      { field: "decNetPayAmount", headerName: dicLabels.strNetPay, width: 140, align: "right", sortAccessor: (dicRow) => dicRow.decNetPayAmountSortValue },
      { field: "strStatus", headerName: dicLabels.strStatus, width: 120 },
    ],
    [blnAllFilteredSelected, blnSomeFilteredSelected, dicLabels, lstFilteredRows.length]
  );

  return (
    <Box className={styles.page}>
      <Breadcrumbs className="app-breadcrumbs" aria-label="breadcrumb" separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />} sx={{ ml: "3px" }}>
        <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>Reports</Typography>
        <Typography component="h1" className="app-breadcrumb-heading" aria-current="page">Payroll Register</Typography>
      </Breadcrumbs>
      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Box className={styles.reportSearchPanelRow} sx={{ py: "0 !important" }}>
          <Box className={styles.reportSearchField} sx={{ flex: "2 1 340px", minWidth: { xs: "100%", md: 320 } }}>
            <SingleSelectFilter strLabel="Employee" strValue={dicSearchDraft.strSearchEmployee} fnOnChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchEmployee: strValue }))} lstOptions={dicFilterOptions.lstEmployees} strPlaceholder="Search by employee code or name" strControlId="reports.payroll-register.employee-search.input" blnDisabled={blnPageLoading} />
          </Box>
          <Box className={styles.reportSearchField}>
            <SingleSelectFilter strLabel="Payroll Period / Run" strValue={dicSearchDraft.strSearchRun} fnOnChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchRun: strValue }))} lstOptions={dicFilterOptions.lstRuns} strPlaceholder="Payroll period or run" strControlId="reports.payroll-register.run-search.input" blnDisabled={blnPageLoading} />
          </Box>
          <Box className={styles.reportSearchField}>
            <SingleSelectFilter strLabel="Payroll Month" strValue={dicSearchDraft.strPayrollMonth} fnOnChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strPayrollMonth: strValue }))} lstOptions={dicFilterOptions.lstMonths} strPlaceholder="Payroll Month" strControlId="reports.payroll-register.payroll-month.input" blnDisabled={blnPageLoading} />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flexBasis: 160, minWidth: 160 }}>
            <SingleSelectFilter strLabel="Status" strValue={dicSearchDraft.strStatus === "All" ? "" : dicSearchDraft.strStatus} fnOnChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: strValue || "All" }))} lstOptions={dicFilterOptions.lstStatuses.length ? dicFilterOptions.lstStatuses : ["Calculated", "Approved", "Published", "Paid"]} strPlaceholder="All Statuses" strControlId="reports.payroll-register.status.select" blnDisabled={blnPageLoading} />
          </Box>
          <Box className={styles.searchActions}>
            <ReportMoreFilters
              strControlPrefix="reports.payroll-register"
              intActiveCount={(dicSearchDraft.strDepartment ? 1 : 0) + (dicSearchDraft.strLocation ? 1 : 0)}
              blnDisabled={blnPageLoading}
              onOpen={() => setDicMoreFiltersDraft({ strDepartment: dicSearchDraft.strDepartment, strLocation: dicSearchDraft.strLocation })}
              onApply={applyMoreFilters}
              onClearAll={() => setDicMoreFiltersDraft(dicEmptyMoreFilters)}
            >
              <SingleSelectFilter strLabel="Department" strValue={dicMoreFiltersDraft.strDepartment} fnOnChange={(strValue) => setDicMoreFiltersDraft((dicPrevious) => ({ ...dicPrevious, strDepartment: strValue }))} lstOptions={dicFilterOptions.lstDepartments} strPlaceholder="All" strControlId="reports.payroll-register.department.input" blnDisabled={blnPageLoading} />
              <SingleSelectFilter strLabel="Location" strValue={dicMoreFiltersDraft.strLocation} fnOnChange={(strValue) => setDicMoreFiltersDraft((dicPrevious) => ({ ...dicPrevious, strLocation: strValue }))} lstOptions={dicFilterOptions.lstLocations} strPlaceholder="All" strControlId="reports.payroll-register.location.input" blnDisabled={blnPageLoading} />
            </ReportMoreFilters>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => applyFilters(dicSearchDraft)} disabled={blnPageLoading} data-controlid="reports.payroll-register.search.button">Search</Button>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearFilters} disabled={blnPageLoading} data-controlid="reports.payroll-register.clear.button">Clear</Button>
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

      <Box className={styles.tableCard} sx={{ p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {!blnRightsLoading && !blnCanView && !strError ? <Alert severity="warning" sx={{ mb: 1.5 }}>Payroll register view access is not available for your user group.</Alert> : null}
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
          loading={blnPageLoading}
          loadingHeaderSkeleton
          skeletonRowCount={10}
          hideRowClickHint
          onRowClick={() => undefined}
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
    </Box>
  );
}
