"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {
  Alert,
  Box,
  Button,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import CommonRowActions from "@/components/master/CommonRowActions";
import CommonPayrollDialog from "@/features/payroll/components/CommonPayrollDialog";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import ReportMultiSelectField, { getUniqueOptions } from "@/features/reports/components/ReportMultiSelectField";
import { payrollResultService } from "@/features/payroll/services/payrollResultService";
import { payslipService } from "@/features/payroll/services/payslipService";
import { authApiService } from "@/services";
import type {
  PayrollResultDetailRecord,
  PayrollResultListRecord,
} from "@/features/payroll/types";
import {
  buildPayslipFileName,
  downloadPayslipHtml,
  printPayslipHtml,
} from "@/features/payroll/utils/payslipDocument";

type PayrollResultListPageProps = {
  blnPayslipScreen?: boolean;
  blnSelfOnly?: boolean;
  blnEssMode?: boolean;
};

type SearchForm = {
  strSearchEmployee: string;
  strSearchRun: string;
  strStatus: string;
  strDepartment: string;
  strLocation: string;
  strPayrollMonth: string;
  strMonthScope: "Latest" | "Custom" | "All";
};

const dicEmptySearch: SearchForm = {
  strSearchEmployee: "",
  strSearchRun: "",
  strStatus: "All",
  strDepartment: "",
  strLocation: "",
  strPayrollMonth: "",
  strMonthScope: "Latest",
};

function normalizeQueryMonth(strValue: string | null) {
  const strTrimmed = String(strValue ?? "").trim();
  return /^\d{4}-\d{2}/.test(strTrimmed) ? strTrimmed.slice(0, 7) : "";
}

function buildInitialSearchFromQuery(objSearchParams: { get: (strKey: string) => string | null }): SearchForm {
  const strPayrollMonth = normalizeQueryMonth(objSearchParams.get("month"));
  return strPayrollMonth
    ? { ...dicEmptySearch, strPayrollMonth, strMonthScope: "Custom" }
    : dicEmptySearch;
}

// Keep these aliases aligned with tplPayrollResultFallbackModuleCodes in
// HRMS_Backend/app/api/v1/PayrollRoutes.py so the UI warning matches API access.
const lstPayrollResultAccessModuleHints = [
  "EMPLOYEE_PAYROLL_RESULT",
  "EMPLOYEE_PAYROLL_RESULTS",
  "PAYROLL_RESULT",
  "PAYROLL_RESULTS",
  "PAYROLL_PAYROLL_RESULT",
  "PAYROLL_PAYSLIP",
  "PAYROLL_PAYSLIPS",
  "REPORT_PAYROLL_RESULT",
  "REPORT_PAYROLL_RESULTS",
  "PAYSLIP",
  "PAYSLIPS",
  "MY_PAYSLIP",
  "MY_PAYSLIPS",
  "PAYROLL_RUN",
  "PAYROLL_RUNS",
  "PAYROLL_PAYROLL_RUN",
  "REPORTS",
  "PAYROLL_REGISTER",
  "REPORT_PAYROLL_REGISTER",
  "BANK_FILE",
  "REPORT_BANK_FILE",
  "STATUTORY_REPORT",
  "REPORT_STATUTORY",
  "PAYROLL",
  "PAYROLLS",
];

function formatMonth(strDate: string | null) {
  if (!strDate) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
  }).format(new Date(strDate));
}

function formatDateTime(strDate: string | null) {
  if (!strDate) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(strDate));
}

function formatCurrency(decValue: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(decValue || 0);
}

function normalizeMonthValue(strDate: string | null) {
  if (!strDate) {
    return "";
  }

  const objDate = new Date(strDate);
  if (Number.isNaN(objDate.getTime())) {
    return "";
  }

  const intMonth = objDate.getMonth() + 1;
  return `${objDate.getFullYear()}-${String(intMonth).padStart(2, "0")}`;
}

function splitFilterValue(strValue: string) {
  return strValue
    .split(",")
    .map((strItem) => strItem.trim().toLowerCase())
    .filter(Boolean);
}

function matchesAnyFilter(lstNeedles: string[], ...lstHaystacks: Array<string | null | undefined>) {
  if (lstNeedles.length === 0) {
    return true;
  }

  const strHaystack = lstHaystacks
    .map((strValue) => String(strValue ?? "").toLowerCase())
    .join(" ");

  return lstNeedles.some((strNeedle) => strHaystack.includes(strNeedle));
}

function getLatestPayrollMonth(lstRows: PayrollResultListRecord[]) {
  const lstMonthValues = lstRows
    .map((dicRow) => normalizeMonthValue(dicRow.dtPayrollMonth))
    .filter(Boolean);

  if (lstMonthValues.length === 0) {
    return "";
  }

  return lstMonthValues.reduce((strLatestMonth, strCurrentMonth) =>
    strCurrentMonth > strLatestMonth ? strCurrentMonth : strLatestMonth
  );
}

function getStatusPillSx(strStatus: string) {
  const dicToneByStatus: Record<string, { background: string; color: string }> = {
    Calculated: { background: "#2563eb", color: "#fff" },
    Approved: { background: "#16a34a", color: "#fff" },
    Published: { background: "#7c3aed", color: "#fff" },
    Paid: { background: "#0f766e", color: "#fff" },
    Generated: { background: "#0f766e", color: "#fff" },
  };
  return dicToneByStatus[strStatus] ?? { background: "#475569", color: "#fff" };
}

function hasDisplayAmount(decAmount: number | null | undefined) {
  return Number(decAmount ?? 0) > 0;
}

function toLabelKey(strValue: string | null | undefined) {
  return String(strValue ?? "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function formatDynamicFallback(strValue: string | null | undefined) {
  const strTrimmed = String(strValue ?? "").trim();
  if (!strTrimmed) {
    return "-";
  }
  return strTrimmed
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (strChar) => strChar.toUpperCase());
}

function translateDynamicLabel(
  t: (strKey: string, strFallback?: string) => string,
  strValue: string | null | undefined,
  strPrefix = ""
) {
  const strKey = toLabelKey(strValue);
  if (!strKey) {
    return "-";
  }
  return t(strPrefix ? `${strPrefix}_${strKey}` : strKey, formatDynamicFallback(strValue));
}

export default function PayrollResultListPage({
  blnPayslipScreen = false,
  blnSelfOnly = false,
  blnEssMode = false,
}: PayrollResultListPageProps) {
  const objRouter = useRouter();
  const objSearchParams = useSearchParams();
  const dicInitialSearch = useMemo(() => buildInitialSearchFromQuery(objSearchParams), [objSearchParams]);
  const { t } = useModuleLabels("payslips");
  const lstAccessModuleHints = blnPayslipScreen
    ? (blnEssMode
        ? ["PAYSLIP", "PAYSLIPS", "MY_PAYSLIPS"]
        : ["REPORT_PAYROLL_RESULTS", "PAYSLIPS", "PAYSLIP", "PAYROLL_PAYSLIPS", "PAYROLL_PAYSLIP"])
    : lstPayrollResultAccessModuleHints;
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny } =
    useModuleActionAccess(lstAccessModuleHints);
  const [lstResults, setLstResults] = useState<PayrollResultListRecord[]>([]);
  const blnUseOpeningFilterDialog = false;
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnPageInitializing, setBlnPageInitializing] = useState(true);
  const [blnHasLoadedRows, setBlnHasLoadedRows] = useState(false);
  const [strError, setStrError] = useState("");
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicInitialSearch);
  const [dicSearchApplied, setDicSearchApplied] =
    useState<SearchForm>(dicInitialSearch);
  const [objPreviewRecord, setObjPreviewRecord] =
    useState<PayrollResultDetailRecord | null>(null);
  const [intPayslipActionID, setIntPayslipActionID] = useState<number | null>(null);
  const [intSelfEmployeeID, setIntSelfEmployeeID] = useState<number | null>(null);
  const blnCanAccessResults =
    canViewAny() ||
    canDoAny("view") ||
    canDoAny("list") ||
    canDoAny("get") ||
    canDoAny("PAYROLL_RESULT_VIEW") ||
    canDoAny("PAYROLL_RESULT_LIST");
  const blnCanExportPayslips = canDoAny("export");
  const blnCanDownloadPayslips = canDoAny("download") || blnCanExportPayslips;
  const blnCanPrintPayslips = canDoAny("print");
  const blnCanUsePayslipRowActions = blnCanAccessResults || blnCanDownloadPayslips || blnCanPrintPayslips;
  const strEssBackRoute = encodeURIComponent("/ess/my-payslips");
  const strLatestPayrollMonth = useMemo(() => getLatestPayrollMonth(lstResults), [lstResults]);
  const dicPayslipFilterOptions = useMemo(() => ({
    lstEmployees: getUniqueOptions(lstResults.flatMap((dicRow) => [
      dicRow.strEmployeeCode,
      dicRow.strEmployeeName,
      `${dicRow.strEmployeeCode} - ${dicRow.strEmployeeName}`,
    ])),
    lstRuns: getUniqueOptions(lstResults.flatMap((dicRow) => [dicRow.strRunCode, dicRow.strRunName])),
    lstMonths: getUniqueOptions(lstResults.map((dicRow) => dicRow.dtPayrollMonth?.slice(0, 7))),
    lstDepartments: getUniqueOptions(lstResults.map((dicRow) => dicRow.strDepartmentName)),
    lstLocations: getUniqueOptions(lstResults.map((dicRow) => dicRow.strLocationName)),
    lstStatuses: getUniqueOptions(lstResults.map((dicRow) => dicRow.strPayslipStatus || "Generated")),
  }), [lstResults]);

  async function loadResults(objFilters: SearchForm = dicSearchApplied) {
    setBlnLoading(true);
    setStrError("");
    try {
      setLstResults(
        await payrollResultService.getPayrollResults({
          ...objFilters,
          strStatus: blnPayslipScreen ? "All" : objFilters.strStatus,
          blnGeneratedPayslipsOnly: blnPayslipScreen,
        })
      );
      setBlnHasLoadedRows(true);
    } catch (objError) {
      setStrError(
        objError instanceof Error
          ? objError.message
          : "Unable to load payroll results."
      );
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }

    let blnCancelled = false;

    async function initializePage() {
      setBlnPageInitializing(true);
      try {
        if (blnSelfOnly) {
          try {
            const objUserResult = await authApiService.getCurrentUser();
            if (!blnCancelled) {
              setIntSelfEmployeeID(objUserResult.Data.objUser.intEmployeeID ?? null);
            }
          } catch {
            if (!blnCancelled) {
              setIntSelfEmployeeID(null);
            }
          }
        }

        await loadResults();
      } finally {
        if (!blnCancelled) {
          setBlnPageInitializing(false);
        }
      }
    }

    initializePage().catch(() => {
      if (!blnCancelled) {
        setBlnPageInitializing(false);
      }
    });

    return () => {
      blnCancelled = true;
    };
  }, [blnRightsLoading, blnSelfOnly, blnUseOpeningFilterDialog]);

  const lstFilteredRows = useMemo(() => {
    const lstEmployeeSearches = splitFilterValue(dicSearchApplied.strSearchEmployee);
    const lstRunSearches = splitFilterValue(dicSearchApplied.strSearchRun);
    const lstStatusFilters =
      dicSearchApplied.strStatus === "All" ? [] : splitFilterValue(dicSearchApplied.strStatus);
    const strEffectivePayrollMonth =
      blnPayslipScreen
        ? dicSearchApplied.strPayrollMonth
        : dicSearchApplied.strMonthScope === "All"
          ? ""
          : dicSearchApplied.strMonthScope === "Custom" && dicSearchApplied.strPayrollMonth
            ? dicSearchApplied.strPayrollMonth
            : strLatestPayrollMonth;
    const lstPayrollMonthFilters = splitFilterValue(strEffectivePayrollMonth);
    return lstResults.filter((dicRow) => {
      const strRowPayrollMonth = normalizeMonthValue(dicRow.dtPayrollMonth);
      const blnSelfMatch = !blnSelfOnly || (intSelfEmployeeID !== null && dicRow.intEmployeeID === intSelfEmployeeID);
      const blnEmployeeMatch = matchesAnyFilter(
        lstEmployeeSearches,
        dicRow.strEmployeeCode,
        dicRow.strEmployeeName,
        `${dicRow.strEmployeeCode} - ${dicRow.strEmployeeName}`
      );
      const blnRunMatch = matchesAnyFilter(lstRunSearches, dicRow.strRunCode, dicRow.strRunName);
      const blnStatusMatch = matchesAnyFilter(
        lstStatusFilters,
        blnPayslipScreen ? dicRow.strPayslipStatus || "Generated" : dicRow.strStatus
      );
      const blnMonthMatch =
        lstPayrollMonthFilters.length === 0 ||
        lstPayrollMonthFilters.some((strMonth) => strRowPayrollMonth === strMonth);
      return blnSelfMatch && blnEmployeeMatch && blnRunMatch && blnStatusMatch && blnMonthMatch;
    });
  }, [blnPayslipScreen, blnSelfOnly, dicSearchApplied, intSelfEmployeeID, lstResults, strLatestPayrollMonth]);
  const lstPreviewLines = useMemo(
    () => (objPreviewRecord?.lstLines ?? []).filter((dicLine) => hasDisplayAmount(dicLine.decAmount)),
    [objPreviewRecord]
  );

  async function openPayslipDocument(dicRow: PayrollResultListRecord, blnPrint: boolean) {
    setIntPayslipActionID(dicRow.intID);
    setStrError("");
    try {
      const dicPayslip = await payslipService.getPayslipPreview(
        dicRow.intPayrollRunID,
        dicRow.intEmployeeID
      );
      const intPayslipID =
        dicRow.intPayslipID ??
        dicPayslip.intPayslipID ??
        (blnPayslipScreen
          ? null
          : (
              await payslipService.generatePayslip(
                dicRow.intPayrollRunID,
                dicRow.intEmployeeID
              )
            ).intPayslipID);
      if (!intPayslipID) {
        setStrError(t("payslip_not_generated", "Payslip could not be generated for this employee."));
        return;
      }
      const strHtml = await payslipService.getDownloadHtml(intPayslipID);
      if (blnPrint) {
        printPayslipHtml(strHtml);
      } else {
        downloadPayslipHtml(
          strHtml,
          buildPayslipFileName("payslip", dicRow.strPayslipNumber, dicRow.strEmployeeCode)
        );
      }
    } catch (objError) {
      setStrError(
        objError instanceof Error ? objError.message : "Unable to download payslip document."
      );
    } finally {
      setIntPayslipActionID(null);
    }
  }

  function applyFilters(dicFilters: SearchForm) {
    setDicSearchDraft(dicFilters);
    setDicSearchApplied(dicFilters);
    loadResults(dicFilters).catch(() => undefined);
  }

  function clearFilters() {
    setDicSearchDraft(dicEmptySearch);
    setDicSearchApplied(dicEmptySearch);
    loadResults(dicEmptySearch).catch(() => undefined);
  }

  const lstTableRows = useMemo(
    () =>
      lstFilteredRows.map((dicRow) => ({
        id: dicRow.intID,
        action: (
          <Box className={styles.actionCell} sx={{ gap: 0.75 }}>
            {blnPayslipScreen ? null : (
              <CommonRowActions
                testIdPrefix="payroll-results.list.row"
                rowKey={dicRow.intID}
                blnCanView={blnCanAccessResults}
                blnCanEdit={false}
                onView={() => objRouter.push(`/payroll/results/${dicRow.intID}`)}
              />
            )}
            {blnPayslipScreen ? (
              <>
                {blnCanAccessResults ? (
                  <Button
                    data-controlid="payroll-results.list.row.view.button"
                    data-row-key={dicRow.intID}
                    className={`${styles.secondaryButton} ${styles.compactButton}`}
                    startIcon={<VisibilityRoundedIcon />}
                    onClick={() => {
                      if (!dicRow.intPayslipID) {
                        setStrError(t("payslip_not_generated", "Payslip could not be generated for this employee."));
                        return;
                      }
                      objRouter.push(blnEssMode ? `/ess/my-payslips/document/${dicRow.intPayslipID}` : `/reports/payslips/document/${dicRow.intPayslipID}`);
                    }}
                  >
                    {t("view_payslip", "View")}
                  </Button>
                ) : null}
                {blnCanDownloadPayslips ? (
                  <Button
                    className={`${styles.secondaryButton} ${styles.compactButton}`}
                    startIcon={<ReceiptLongRoundedIcon />}
                    onClick={() => openPayslipDocument(dicRow, false)}
                    disabled={intPayslipActionID === dicRow.intID}
                  >
                    {t("download_payslip", "Download")}
                  </Button>
                ) : null}
                {blnCanPrintPayslips ? (
                  <Button
                    className={`${styles.secondaryButton} ${styles.compactButton}`}
                    startIcon={<PrintRoundedIcon />}
                    onClick={() => openPayslipDocument(dicRow, true)}
                    disabled={intPayslipActionID === dicRow.intID}
                  >
                    {t("print_payslip", "Print")}
                  </Button>
                ) : null}
              </>
            ) : null}
          </Box>
        ),
        strEmployeeCode: dicRow.strEmployeeCode,
        strEmployeeName: dicRow.strEmployeeName,
        strPayslipNumber: dicRow.strPayslipNumber || "-",
        strRunName: dicRow.strRunName,
        dtPayrollMonth: formatMonth(dicRow.dtPayrollMonth),
        decGrossEarningsAmount: formatCurrency(dicRow.decGrossEarningsAmount),
        decEmployeeDeductionTotal: formatCurrency(dicRow.decEmployeeDeductionTotal),
        decTaxTotal: formatCurrency(dicRow.decTaxTotal),
        decNetPayAmount: formatCurrency(dicRow.decNetPayAmount),
        decEmployerContributionTotal: formatCurrency(dicRow.decEmployerContributionTotal),
        decTotalEmployerCost: formatCurrency(dicRow.decTotalEmployerCost),
        strStatus: (
          <span
            className={styles.statusPill}
            style={getStatusPillSx(
              blnPayslipScreen
                ? dicRow.strPayslipStatus || "Generated"
                : dicRow.strStatus
            )}
          >
            {blnPayslipScreen
              ? translateDynamicLabel(t, dicRow.strPayslipStatus || "Generated", "status")
              : translateDynamicLabel(t, dicRow.strStatus, "status")}
          </span>
        ),
        dtPayslipGeneratedOn: formatDateTime(dicRow.dtPayslipGeneratedOn),
      })),
    [blnCanAccessResults, blnCanDownloadPayslips, blnCanPrintPayslips, blnEssMode, blnPayslipScreen, intPayslipActionID, lstFilteredRows, objRouter, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(() => {
    const lstColumns: CommonTableColumn<(typeof lstTableRows)[number]>[] = [
      { field: "strEmployeeCode", headerName: t("employee_code", "Employee Code") },
      { field: "strEmployeeName", headerName: t("employee_name", "Employee Name"), width: 220 },
      { field: "strRunName", headerName: t("payroll_run", "Payroll Run"), width: 220 },
      { field: "dtPayrollMonth", headerName: t("payroll_month", "Payroll Month"), width: 140 },
      { field: "decGrossEarningsAmount", headerName: t("gross_earnings", "Gross Earnings"), align: "right", width: 160 },
      { field: "decEmployeeDeductionTotal", headerName: t("employee_deductions", "Employee Deductions"), align: "right", width: 180 },
      { field: "decTaxTotal", headerName: t("tax", "Tax"), align: "right", width: 140 },
      { field: "decNetPayAmount", headerName: t("net_pay", "Net Pay"), align: "right", width: 150 },
      { field: "decEmployerContributionTotal", headerName: t("employer_contribution", "Employer Contributions"), align: "right", width: 190 },
      { field: "decTotalEmployerCost", headerName: t("total_employer_cost", "Total Employer Cost"), align: "right", width: 190 },
      { field: "strStatus", headerName: t("status", "Status"), sortable: false, filterable: false, width: 140 },
    ];

    if (!blnPayslipScreen || blnCanUsePayslipRowActions) {
      lstColumns.unshift({
        field: "action",
        headerName: t("actions", "Actions"),
        sortable: false,
        filterable: false,
        exportable: false,
        width: blnPayslipScreen ? 340 : 110,
      });
    }

    if (blnPayslipScreen) {
      lstColumns.splice(3, 0, {
        field: "strPayslipNumber",
        headerName: t("payslip_no", "Payslip No."),
        width: 150,
      });
      lstColumns.push({
        field: "dtPayslipGeneratedOn",
        headerName: t("generated_on", "Generated On"),
        width: 180,
      });
    }

    return lstColumns;
  }, [blnCanUsePayslipRowActions, blnPayslipScreen, t]);

  if (
    blnRightsLoading ||
    blnPageInitializing ||
    (blnLoading && (!blnUseOpeningFilterDialog || !blnHasLoadedRows))
  ) {
    return (
      <BlockingLoader blnOpen strLabel={t("loading_results", "Loading payroll results...")} />
    );
  }

  return (
    <Box className={styles.page}>
      <Typography className={`${styles.breadcrumbs} ${styles.hiddenHeader}`}>
        {blnPayslipScreen
          ? (blnEssMode
              ? t("ess_breadcrumbs", "My Payslips")
              : t("payslip_breadcrumbs", "Payslips"))
          : t("breadcrumbs", "Payroll Results")}
      </Typography>

      <Box className={`${styles.topBar} ${styles.hiddenHeader}`}>
        <Button
          controlId="payroll-results.list.back.button"
          className={styles.secondaryButton}
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => objRouter.push("/payroll")}
        >
          {t("back_button", "Back to Payroll")}
        </Button>
      </Box>

      <Box className={styles.controlsCard}>
        {!blnEssMode ? (
          <Box className={styles.controlsHeader} sx={{ mb: 1.25 }}>
            <Box />
          </Box>
        ) : null}

        {blnPayslipScreen ? (
          <Box className={`${styles.payslipSearchPanel} ${styles.payslipSearchLinePrimary}`}>
              <ReportMultiSelectField value={dicSearchDraft.strSearchEmployee} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchEmployee: strValue }))} options={dicPayslipFilterOptions.lstEmployees} placeholder={t("employee_search_placeholder", "Search by employee code or name")} controlId="payroll-results.list.employee-search.input" />
              <ReportMultiSelectField value={dicSearchDraft.strSearchRun} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchRun: strValue }))} options={dicPayslipFilterOptions.lstRuns} placeholder={t("run_search_placeholder", "Search by payroll run")} />
              <ReportMultiSelectField value={dicSearchDraft.strPayrollMonth} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strPayrollMonth: strValue }))} options={dicPayslipFilterOptions.lstMonths} label={t("payroll_month", "Payroll Month")} placeholder={t("payroll_month", "Payroll Month")} />
              <ReportMultiSelectField value={dicSearchDraft.strDepartment} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strDepartment: strValue }))} options={dicPayslipFilterOptions.lstDepartments} placeholder={t("department", "Department")} />
              <ReportMultiSelectField value={dicSearchDraft.strLocation} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strLocation: strValue }))} options={dicPayslipFilterOptions.lstLocations} placeholder={t("location", "Location")} />
              <ReportMultiSelectField label={t("status", "Status")} value={dicSearchDraft.strStatus === "All" ? "" : dicSearchDraft.strStatus} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: strValue || "All" }))} options={dicPayslipFilterOptions.lstStatuses.length ? dicPayslipFilterOptions.lstStatuses : ["Generated"]} placeholder={t("status_all", "All")} />
              <Box className={styles.searchActions}>
                <Button
                  controlId="payroll-results.list.search.button"
                  className={styles.primaryButton}
                  startIcon={<SearchRoundedIcon />}
                  onClick={() => applyFilters(dicSearchDraft)}
                >
                  {t("search", "Search")}
                </Button>
                <Button
                  controlId="payroll-results.list.clear.button"
                  className={styles.secondaryButton}
                  startIcon={<ClearRoundedIcon />}
                  onClick={clearFilters}
                >
                  {t("clear", "Clear")}
                </Button>
              </Box>
          </Box>
        ) : null}

        {!blnPayslipScreen && (
          <Box
            sx={{
              width: "100%",
              border: "1px solid rgba(191,219,254,0.7)",
              borderRadius: "28px",
              px: { xs: 1.5, md: 2.5 },
              py: { xs: 1.5, md: 1.8 },
              background: "radial-gradient(circle at top center, rgba(226,241,255,0.72) 0%, #ffffff 45%, #f8fbff 100%)",
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.05)",
            }}
          >
            <Box
              sx={{
                display: "grid",
                gap: 1.2,
                gridTemplateColumns: { xs: "1fr", xl: "1.35fr 1.05fr 0.8fr 0.68fr 0.68fr auto auto" },
                alignItems: "end",
              }}
            >
              <TextField
                controlId="payroll-results.list.employee-search.input"
                value={dicSearchDraft.strSearchEmployee}
                onChange={(objEvent) =>
                  setDicSearchDraft((dicPrevious) => ({
                    ...dicPrevious,
                    strSearchEmployee: objEvent.target.value,
                  }))
                }
                placeholder={t("employee_search_placeholder", "Search by employee code or name")}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineRoundedIcon sx={{ color: "#94a3b8", fontSize: 22 }} />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                value={dicSearchDraft.strSearchRun}
                onChange={(objEvent) =>
                  setDicSearchDraft((dicPrevious) => ({
                    ...dicPrevious,
                    strSearchRun: objEvent.target.value,
                  }))
                }
                placeholder={t("run_search_placeholder", "Search by payroll run")}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarMonthOutlinedIcon sx={{ color: "#94a3b8", fontSize: 22 }} />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                select
                value={dicSearchDraft.strMonthScope}
                onChange={(objEvent) =>
                  setDicSearchDraft((dicPrevious) => ({
                    ...dicPrevious,
                    strMonthScope: objEvent.target.value as SearchForm["strMonthScope"],
                    strPayrollMonth: objEvent.target.value === "Custom" ? dicPrevious.strPayrollMonth : "",
                  }))
                }
                label={t("data_scope", "Data Scope")}
                fullWidth
              >
                <MenuItem value="Latest">{t("latest_month", "Latest month")}</MenuItem>
                <MenuItem value="Custom">{t("custom_month", "Custom month")}</MenuItem>
                <MenuItem value="All">{t("all_data", "All data")}</MenuItem>
              </TextField>
              <TextField
                type="month"
                value={dicSearchDraft.strPayrollMonth}
                onChange={(objEvent) =>
                  setDicSearchDraft((dicPrevious) => ({
                    ...dicPrevious,
                    strPayrollMonth: objEvent.target.value,
                  }))
                }
                label={t("payroll_month", "Payroll Month")}
                fullWidth
                InputLabelProps={{ shrink: true }}
                disabled={dicSearchDraft.strMonthScope !== "Custom"}
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
                <MenuItem value="All">{t("status_all", "All statuses")}</MenuItem>
                <MenuItem value="Calculated">{t("status_calculated", "Calculated")}</MenuItem>
                <MenuItem value="Approved">{t("status_approved", "Approved")}</MenuItem>
                <MenuItem value="Published">{t("status_published", "Published")}</MenuItem>
                <MenuItem value="Paid">{t("status_paid", "Paid")}</MenuItem>
              </TextField>
              <Button
                controlId="payroll-results.list.search.button"
                className={styles.primaryButton}
                startIcon={<SearchRoundedIcon />}
                onClick={() => applyFilters(dicSearchDraft)}
                sx={{ minWidth: 104, minHeight: 34, height: 34, borderRadius: "10px" }}
              >
                {t("search", "Search")}
              </Button>
              <Button
                controlId="payroll-results.list.clear.button"
                className={styles.secondaryButton}
                startIcon={<ClearRoundedIcon />}
                onClick={clearFilters}
                sx={{ minWidth: 96, minHeight: 34, height: 34, borderRadius: "10px" }}
              >
                {t("clear", "Clear")}
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      {!blnPayslipScreen ? (
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
            {t(
              "payroll_results_help",
              "Review processed payroll calculations before generating payslips."
            )}
          </Typography>
        </Box>
      ) : null}

      {blnPayslipScreen ? (
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
            {t(
              "payslips_help_generated",
              "View, download, print, or revise generated employee payslips."
            )}
          </Typography>
        </Box>
      ) : null}

      <Box className={styles.tableCard}>
        {!blnCanAccessResults && !strError ? (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            {t(
              "access_denied",
              "Payroll result view access is not available for your user group."
            )}
          </Alert>
        ) : null}

        {strError ? <Alert severity="error" sx={{ mb: 1.5 }}>{strError}</Alert> : null}
        <CommonTable
          columns={lstTableColumns}
          rows={lstTableRows}
          rowIdField="id"
          exportFileName={blnPayslipScreen ? "payslips" : "payroll-results"}
          showExportOptions={canDoAny("export")}
          showPaginationSummary
          emptyMessage={blnPayslipScreen
            ? t(
                "empty_generated_payslip_message",
                "No generated payslips found. Generate payslips from a processed payroll run first."
              )
            : t(
                "empty_message",
                "No payroll results found for the current filters."
              )}
          testIdPrefix="payroll-results.list"
          sx={{ p: 0, boxShadow: "none", background: "transparent" }}
        />
      </Box>

      <CommonPayrollDialog
        blnOpen={Boolean(objPreviewRecord)}
        onClose={() => setObjPreviewRecord(null)}
        strTitle={objPreviewRecord?.strEmployeeName ?? t("preview_title", "Payroll Result")}
        strSecondaryLabel={t("close", "Close")}
        blnHidePrimary
        maxWidth="lg"
        paperClassName={styles.dialogPaper}
        nodeContent={
          objPreviewRecord ? (
            <Stack spacing={2}>
              <Box
                sx={{
                  display: "grid",
                  gap: 1.25,
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                }}
              >
                <Box>
                  <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                    {t("employee", "Employee")}
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {objPreviewRecord.strEmployeeName} ({objPreviewRecord.strEmployeeCode})
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                    {t("payroll_run", "Payroll Run")}
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {objPreviewRecord.strRunName} ({objPreviewRecord.strRunCode})
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  display: "grid",
                  gap: 1.25,
                  gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
                }}
              >
                <Box>
                  <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                    {t("gross", "Gross")}
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {formatCurrency(objPreviewRecord.decGrossEarningsAmount)}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                    {t("employee_deductions", "Employee Deductions")}
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {formatCurrency(objPreviewRecord.decEmployeeDeductionTotal)}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                    {t("tax", "Tax")}
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {formatCurrency(objPreviewRecord.decTaxTotal)}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                    {t("net_pay", "Net Pay")}
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {formatCurrency(objPreviewRecord.decNetPayAmount)}
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                  {t("status", "Status")}
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {translateDynamicLabel(t, objPreviewRecord.strStatus, "status")}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                  {t("remarks", "Remarks")}
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {objPreviewRecord.strRemarks || "-"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ color: "#64748b", fontSize: "0.82rem", mb: 0.75 }}>
                  {t("result_lines", "Result Lines")}
                </Typography>
                <Box sx={{ border: "1px solid #d9e6ef", borderRadius: 2, overflow: "hidden" }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>{t("component", "Component")}</th>
                        <th>{t("category", "Category")}</th>
                        <th>{t("line_type", "Line Type")}</th>
                        <th>{t("amount", "Amount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lstPreviewLines.length === 0 ? (
                        <tr>
                          <td colSpan={4} className={styles.emptyState}>
                            {t("no_lines", "No payroll result lines recorded.")}
                          </td>
                        </tr>
                      ) : null}
                      {lstPreviewLines.map((dicLine) => (
                        <tr key={dicLine.intID}>
                          <td>{translateDynamicLabel(t, dicLine.strComponentName || dicLine.strComponentCode)}</td>
                          <td>{translateDynamicLabel(t, dicLine.strComponentCategory)}</td>
                          <td>{translateDynamicLabel(t, dicLine.strLineType)}</td>
                          <td>{formatCurrency(dicLine.decAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              </Box>
            </Stack>
          ) : null
        }
      />
    </Box>
  );
}
