"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Breadcrumbs, Button, Checkbox, Typography } from "@mui/material";
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { ReportMoreFilters, SingleSelectFilter } from "@/features/reports/components/ReportFilterUi";
import { getUniqueOptions } from "@/features/reports/components/ReportMultiSelectField";
import { payrollReportService } from "@/features/reports/services/payrollReportService";
import type { VariablePayRegisterRow } from "@/features/payroll/types";

type SearchForm = {
  strSearchEmployee: string;
  strSearchRun: string;
  strStatus: string;
  strPayrollMonth: string;
  strVariablePayType: string;
};

const dicEmptySearch: SearchForm = {
  strSearchEmployee: "",
  strSearchRun: "",
  strStatus: "All",
  strPayrollMonth: "",
  strVariablePayType: "",
};
const lstRowsPerPageOptions = [10, 20, 50];
type MoreFiltersForm = Pick<SearchForm, "strVariablePayType">;
const dicEmptyMoreFilters: MoreFiltersForm = { strVariablePayType: "" };

type VariablePayRegisterLabels = {
  strEmployeeCode: string;
  strEmployeeName: string;
  strVariablePayType: string;
  strComponent: string;
  strPayrollPeriod: string;
  strInputAmount: string;
  strApprovedAmount: string;
  strFinalAmount: string;
  strTransactionStatus: string;
  strTaxRegime: string;
  strGrossEarnings: string;
  strTaxDeducted: string;
  strNetPay: string;
  strRunStatus: string;
  strTotal: string;
  strReportTitle: string;
};

type LabelFn = (strKey: string, strFallback?: string) => string;

function buildVariablePayRegisterLabels(t: LabelFn): VariablePayRegisterLabels {
  return {
    strEmployeeCode: t("employee_code", "Employee Code"),
    strEmployeeName: t("employee_name", "Employee Name"),
    strVariablePayType: t("variable_pay_type", "Variable Pay Type"),
    strComponent: t("component", "Component"),
    strPayrollPeriod: t("payroll_period", "Payroll Period"),
    strInputAmount: t("input_amount", "Input Amount"),
    strApprovedAmount: t("approved_amount", "Approved Amount"),
    strFinalAmount: t("final_amount", "Final Amount"),
    strTransactionStatus: t("transaction_status", "Transaction Status"),
    strTaxRegime: t("tax_regime", "Tax Regime"),
    strGrossEarnings: t("gross_earnings", "Gross Earnings"),
    strTaxDeducted: t("tax_deducted", "Tax Deducted"),
    strNetPay: t("net_pay", "Net Pay"),
    strRunStatus: t("run_status", "Run Status"),
    strTotal: t("total", "Total"),
    strReportTitle: t("variable_pay_register", "Variable Pay Register"),
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

function downloadCsv(strFileName: string, lstRows: VariablePayRegisterRow[], dicLabels: VariablePayRegisterLabels) {
  const lstHeaders = [
    dicLabels.strEmployeeCode,
    dicLabels.strEmployeeName,
    dicLabels.strVariablePayType,
    dicLabels.strComponent,
    dicLabels.strPayrollPeriod,
    dicLabels.strInputAmount,
    dicLabels.strApprovedAmount,
    dicLabels.strFinalAmount,
    dicLabels.strTransactionStatus,
    dicLabels.strTaxRegime,
    dicLabels.strGrossEarnings,
    dicLabels.strTaxDeducted,
    dicLabels.strNetPay,
    dicLabels.strRunStatus,
  ];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) =>
      [
        dicRow.strEmployeeCode,
        dicRow.strEmployeeName,
        dicRow.strVariablePayTypeName,
        dicRow.strComponentName,
        dicRow.dtPayrollMonth ?? "",
        dicRow.decInputAmount ?? 0,
        dicRow.decApprovedAmount ?? 0,
        dicRow.decFinalAmount ?? 0,
        dicRow.strTransactionStatus,
        dicRow.strRegimeUsed ?? "",
        dicRow.decGrossEarningsAmount ?? 0,
        dicRow.decTaxTotal ?? 0,
        dicRow.decNetPayAmount ?? 0,
        dicRow.strPayrollRunStatus,
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

function exportPdf(strTitle: string, lstRows: VariablePayRegisterRow[], dicLabels: VariablePayRegisterLabels) {
  const objWindow = window.open("", "_blank", "width=1280,height=800");
  if (!objWindow) {
    return;
  }
  const strRows = lstRows.map((dicRow) => `
    <tr>
      <td>${dicRow.strEmployeeCode}</td>
      <td>${dicRow.strEmployeeName}</td>
      <td>${dicRow.strVariablePayTypeName}</td>
      <td>${dicRow.strComponentName}</td>
      <td>${formatMonth(dicRow.dtPayrollMonth)}</td>
      <td>${formatCurrency(dicRow.decInputAmount)}</td>
      <td>${formatCurrency(dicRow.decApprovedAmount)}</td>
      <td>${formatCurrency(dicRow.decFinalAmount)}</td>
      <td>${dicRow.strTransactionStatus}</td>
      <td>${dicRow.strRegimeUsed ?? "-"}</td>
      <td>${formatCurrency(dicRow.decGrossEarningsAmount)}</td>
      <td>${formatCurrency(dicRow.decTaxTotal)}</td>
      <td>${formatCurrency(dicRow.decNetPayAmount)}</td>
      <td>${dicRow.strPayrollRunStatus}</td>
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
              <th>${dicLabels.strVariablePayType}</th>
              <th>${dicLabels.strComponent}</th>
              <th>${dicLabels.strPayrollPeriod}</th>
              <th>${dicLabels.strInputAmount}</th>
              <th>${dicLabels.strApprovedAmount}</th>
              <th>${dicLabels.strFinalAmount}</th>
              <th>${dicLabels.strTransactionStatus}</th>
              <th>${dicLabels.strTaxRegime}</th>
              <th>${dicLabels.strGrossEarnings}</th>
              <th>${dicLabels.strTaxDeducted}</th>
              <th>${dicLabels.strNetPay}</th>
              <th>${dicLabels.strRunStatus}</th>
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

export default function VariablePayRegisterReportPage() {
  const { t } = useModuleLabels("reports");
  const dicLabels = useMemo(() => buildVariablePayRegisterLabels(t), [t]);
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny } = useModuleActionAccess([
    "REPORTS",
    "VARIABLE_PAY_REGISTER",
    "REPORT_VARIABLE_PAY_REGISTER",
    "PAYROLL_RESULTS",
    "PAYROLL_RESULT",
  ]);
  const [lstRows, setLstRows] = useState<VariablePayRegisterRow[]>([]);
  const [blnLoading, setBlnLoading] = useState(false);
  const [dicMoreFiltersDraft, setDicMoreFiltersDraft] = useState<MoreFiltersForm>(dicEmptyMoreFilters);
  const [strError, setStrError] = useState("");
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [setSelectedRowIDs, setSetSelectedRowIDs] = useState<Set<number>>(new Set());
  const blnCanView = canViewAny() || canDoAny("view") || canDoAny("list");
  const blnPageLoading = blnRightsLoading || blnLoading;

  async function loadRows(objFilters: SearchForm) {
    setBlnLoading(true);
    setStrError("");
    try {
      setLstRows(await payrollReportService.getVariablePayRegisterRows(objFilters));
      setSetSelectedRowIDs(new Set());
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load Variable Pay register.");
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
    lstVariablePayTypes: getUniqueOptions(lstRows.map((dicRow) => dicRow.strVariablePayTypeName)),
    lstStatuses: getUniqueOptions(lstRows.map((dicRow) => dicRow.strPayrollRunStatus)),
  }), [lstRows]);

  const dicTotals = useMemo(() => lstFilteredRows.reduce(
    (dicAccumulator, dicRow) => ({
      decInput: dicAccumulator.decInput + (dicRow.decInputAmount || 0),
      decApproved: dicAccumulator.decApproved + (dicRow.decApprovedAmount || 0),
      decFinal: dicAccumulator.decFinal + (dicRow.decFinalAmount || 0),
      decGross: dicAccumulator.decGross + (dicRow.decGrossEarningsAmount || 0),
      decTax: dicAccumulator.decTax + (dicRow.decTaxTotal || 0),
      decNet: dicAccumulator.decNet + (dicRow.decNetPayAmount || 0),
    }),
    { decInput: 0, decApproved: 0, decFinal: 0, decGross: 0, decTax: 0, decNet: 0 },
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
    loadRows(dicEmptySearch).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blnCanView]);

  const lstTableRows = useMemo(
    () =>
      lstFilteredRows.map((dicRow) => ({
        intID: dicRow.intID,
        select: (
          <Checkbox
            inputProps={{ "controlId": "reports.variable-pay-register.row.select.checkbox", "data-row-key": String(dicRow.intID) } as InputHTMLAttributes<HTMLInputElement>}
            size="small"
            checked={setSelectedRowIDs.has(dicRow.intID)}
            onChange={(objEvent) => toggleRow(dicRow.intID, objEvent.target.checked)}
          />
        ),
        strEmployeeCode: dicRow.strEmployeeCode,
        strEmployeeName: dicRow.strEmployeeName,
        strVariablePayTypeName: dicRow.strVariablePayTypeName || "-",
        strComponentName: dicRow.strComponentName || "-",
        strPayrollPeriod: formatMonth(dicRow.dtPayrollMonth),
        strPayrollPeriodSortValue: dicRow.dtPayrollMonth ? new Date(dicRow.dtPayrollMonth).getTime() : 0,
        decInputAmount: formatCurrency(dicRow.decInputAmount ?? 0),
        decInputAmountSortValue: Number(dicRow.decInputAmount ?? 0),
        decApprovedAmount: formatCurrency(dicRow.decApprovedAmount ?? 0),
        decApprovedAmountSortValue: Number(dicRow.decApprovedAmount ?? 0),
        decFinalAmount: formatCurrency(dicRow.decFinalAmount ?? 0),
        decFinalAmountSortValue: Number(dicRow.decFinalAmount ?? 0),
        strTransactionStatus: dicRow.strTransactionStatus,
        strRegimeUsed: dicRow.strRegimeUsed || "-",
        decGrossEarningsAmount: formatCurrency(dicRow.decGrossEarningsAmount ?? 0),
        decGrossEarningsAmountSortValue: Number(dicRow.decGrossEarningsAmount ?? 0),
        decTaxTotal: formatCurrency(dicRow.decTaxTotal ?? 0),
        decTaxTotalSortValue: Number(dicRow.decTaxTotal ?? 0),
        decNetPayAmount: formatCurrency(dicRow.decNetPayAmount ?? 0),
        decNetPayAmountSortValue: Number(dicRow.decNetPayAmount ?? 0),
        strPayrollRunStatus: dicRow.strPayrollRunStatus,
      })),
    [lstFilteredRows, setSelectedRowIDs]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      {
        field: "select",
        headerName: (
          <Checkbox
            inputProps={{ "controlId": "reports.variable-pay-register.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>}
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
      { field: "strEmployeeName", headerName: dicLabels.strEmployeeName, width: 200 },
      { field: "strVariablePayTypeName", headerName: dicLabels.strVariablePayType, width: 160 },
      { field: "strComponentName", headerName: dicLabels.strComponent, width: 160 },
      { field: "strPayrollPeriod", headerName: dicLabels.strPayrollPeriod, width: 140, sortAccessor: (dicRow) => dicRow.strPayrollPeriodSortValue },
      { field: "decInputAmount", headerName: dicLabels.strInputAmount, width: 150, align: "right", sortAccessor: (dicRow) => dicRow.decInputAmountSortValue },
      { field: "decApprovedAmount", headerName: dicLabels.strApprovedAmount, width: 160, align: "right", sortAccessor: (dicRow) => dicRow.decApprovedAmountSortValue },
      { field: "decFinalAmount", headerName: dicLabels.strFinalAmount, width: 150, align: "right", sortAccessor: (dicRow) => dicRow.decFinalAmountSortValue },
      { field: "strTransactionStatus", headerName: dicLabels.strTransactionStatus, width: 150 },
      { field: "strRegimeUsed", headerName: dicLabels.strTaxRegime, width: 130 },
      { field: "decGrossEarningsAmount", headerName: dicLabels.strGrossEarnings, width: 150, align: "right", sortAccessor: (dicRow) => dicRow.decGrossEarningsAmountSortValue },
      { field: "decTaxTotal", headerName: dicLabels.strTaxDeducted, width: 140, align: "right", sortAccessor: (dicRow) => dicRow.decTaxTotalSortValue },
      { field: "decNetPayAmount", headerName: dicLabels.strNetPay, width: 140, align: "right", sortAccessor: (dicRow) => dicRow.decNetPayAmountSortValue },
      { field: "strPayrollRunStatus", headerName: dicLabels.strRunStatus, width: 130 },
    ],
    [blnAllFilteredSelected, blnSomeFilteredSelected, dicLabels, lstFilteredRows.length]
  );

  return (
    <Box className={styles.page}>
      <Breadcrumbs className="app-breadcrumbs" aria-label="breadcrumb" separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />} sx={{ ml: "3px" }}>
        <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>Reports</Typography>
        <Typography component="h1" className="app-breadcrumb-heading" aria-current="page">Variable Pay Register</Typography>
      </Breadcrumbs>
      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Box className={styles.reportSearchPanelRow} sx={{ py: "0 !important" }}>
          <Box className={styles.reportSearchField} sx={{ flex: "2 1 340px", minWidth: { xs: "100%", md: 320 } }}>
            <SingleSelectFilter strLabel="Employee" strValue={dicSearchDraft.strSearchEmployee} fnOnChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchEmployee: strValue }))} lstOptions={dicFilterOptions.lstEmployees} strPlaceholder="Search by employee code or name" strControlId="reports.variable-pay-register.employee-search.input" blnDisabled={blnPageLoading} />
          </Box>
          <Box className={styles.reportSearchField}>
            <SingleSelectFilter strLabel="Payroll Run" strValue={dicSearchDraft.strSearchRun} fnOnChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchRun: strValue }))} lstOptions={dicFilterOptions.lstRuns} strPlaceholder="Payroll run" strControlId="reports.variable-pay-register.run-search.input" blnDisabled={blnPageLoading} />
          </Box>
          <Box className={styles.reportSearchField}>
            <SingleSelectFilter strLabel="Payroll Month" strValue={dicSearchDraft.strPayrollMonth} fnOnChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strPayrollMonth: strValue }))} lstOptions={dicFilterOptions.lstMonths} strPlaceholder="Payroll Month" strControlId="reports.variable-pay-register.payroll-month.input" blnDisabled={blnPageLoading} />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flexBasis: 160, minWidth: 160 }}>
            <SingleSelectFilter strLabel="Run Status" strValue={dicSearchDraft.strStatus === "All" ? "" : dicSearchDraft.strStatus} fnOnChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: strValue || "All" }))} lstOptions={dicFilterOptions.lstStatuses.length ? dicFilterOptions.lstStatuses : ["Processed", "Finalized"]} strPlaceholder="All Statuses" strControlId="reports.variable-pay-register.status.select" blnDisabled={blnPageLoading} />
          </Box>
          <Box className={styles.searchActions}>
            <ReportMoreFilters
              strControlPrefix="reports.variable-pay-register"
              intActiveCount={dicSearchDraft.strVariablePayType ? 1 : 0}
              blnDisabled={blnPageLoading}
              onOpen={() => setDicMoreFiltersDraft({ strVariablePayType: dicSearchDraft.strVariablePayType })}
              onApply={applyMoreFilters}
              onClearAll={() => setDicMoreFiltersDraft(dicEmptyMoreFilters)}
            >
              <SingleSelectFilter strLabel="Variable Pay Type" strValue={dicMoreFiltersDraft.strVariablePayType} fnOnChange={(strValue) => setDicMoreFiltersDraft({ strVariablePayType: strValue })} lstOptions={dicFilterOptions.lstVariablePayTypes} strPlaceholder="All" strControlId="reports.variable-pay-register.variable-pay-type.input" blnDisabled={blnPageLoading} />
            </ReportMoreFilters>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => applyFilters(dicSearchDraft)} disabled={blnPageLoading} data-controlid="reports.variable-pay-register.search.button">Search</Button>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearFilters} disabled={blnPageLoading} data-controlid="reports.variable-pay-register.clear.button">Clear</Button>
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
          Employee-wise Variable Pay transactions and their processed payroll result - variable pay type, component, input/approved/final amount, tax, and net pay, for every Separate Payroll (Variable Pay) run.
        </Typography>
      </Box>

      <Box className={styles.tableCard} sx={{ p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {!blnRightsLoading && !blnCanView && !strError ? <Alert severity="warning" sx={{ mb: 1.5 }}>Variable Pay register view access is not available for your user group.</Alert> : null}
        {strError ? <Alert severity="error" sx={{ mb: 1.5 }}>{strError}</Alert> : null}
        <CommonTable
          columns={lstTableColumns}
          rows={lstTableRows}
          rowIdField="intID"
          defaultPageSize={lstRowsPerPageOptions[0]}
          pageSizeOptions={lstRowsPerPageOptions}
          emptyMessage="No Variable Pay register rows found for the current filters."
          showPaginationSummary
          withPaper={false}
          testIdPrefix="reports.variable-pay-register"
          loading={blnPageLoading}
          loadingHeaderSkeleton
          skeletonRowCount={10}
          hideRowClickHint
          onRowClick={() => undefined}
          toolbarLeft={(
            <Box className={styles.listUtilityActions}>
              {canDoAny("export") ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv("variable-pay-register.csv", lstExportRows, dicLabels)} data-controlid="reports.variable-pay-register.export-excel.button">Export Excel</Button> : null}
              {canDoAny("export") ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf(dicLabels.strReportTitle, lstExportRows, dicLabels)} data-controlid="reports.variable-pay-register.download-pdf.button">Download PDF</Button> : null}
              {setSelectedRowIDs.size > 0 ? <Typography sx={{ color: "#64748b", alignSelf: "center" }}>{setSelectedRowIDs.size} selected</Typography> : null}
            </Box>
          )}
          footerContent={lstFilteredRows.length > 0 ? (
            <Box sx={{ px: 1.5, py: 1.25, borderTop: "1px solid #e2e8f0" }}>
              <Box sx={{ minWidth: 1976, display: "grid", gridTemplateColumns: "56px 150px 200px 160px 160px 140px 150px 160px 150px 150px 130px 150px 140px 140px 130px", alignItems: "center" }}>
                <Typography sx={{ fontWeight: 700, gridColumn: "1 / span 5" }}>{dicLabels.strTotal}</Typography>
                <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicTotals.decInput)}</Typography>
                <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicTotals.decApproved)}</Typography>
                <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicTotals.decFinal)}</Typography>
                <Box />
                <Box />
                <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicTotals.decGross)}</Typography>
                <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicTotals.decTax)}</Typography>
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
