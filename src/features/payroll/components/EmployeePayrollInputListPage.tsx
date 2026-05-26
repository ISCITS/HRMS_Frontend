"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Pagination,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { employeePayrollInputService } from "@/features/payroll/services/employeePayrollInputService";
import type {
  EmployeePayrollInputListRecord,
} from "@/features/payroll/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type SearchForm = {
  strSearchEmployee: string;
  strSearchRun: string;
  strStatus: "All" | "Draft" | "Submitted" | "Locked";
};

type ToastState = {
  blnOpen: boolean;
  strMessage: string;
  strSeverity: "success" | "error";
};

const dicEmptySearch: SearchForm = {
  strSearchEmployee: "",
  strSearchRun: "",
  strStatus: "All",
};
const lstEmployeePayrollInputModuleCodes = ["EMPLOYEE_PAYROLL_INPUT", "EMPLOYEE_PAYROLL_INPUTS", "PAYROLL_INPUT", "PAYROLL_INPUTS"];
const lstRowsPerPageOptions = [10, 20, 50];

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

function downloadCsv(strFileName: string, lstRows: EmployeePayrollInputListRecord[]) {
  const lstHeaders = [
    "Employee Code",
    "Employee Name",
    "Payroll Run",
    "Payroll Month",
    "LWP",
    "LOP",
    "Status",
    "Locked",
  ];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) =>
      [
        dicRow.strEmployeeCode,
        dicRow.strEmployeeName,
        dicRow.strRunName,
        dicRow.dtPayrollMonth ?? "",
        dicRow.decLwpDays ?? "",
        dicRow.decLopDays ?? "",
        dicRow.strStatus,
        dicRow.blnIsLocked ? "Yes" : "No",
      ]
        .map((strValue) => `"${String(strValue).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];
  const objBlob = new Blob([lstLines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const strUrl = URL.createObjectURL(objBlob);
  const objLink = document.createElement("a");
  objLink.href = strUrl;
  objLink.download = strFileName;
  objLink.click();
  URL.revokeObjectURL(strUrl);
}

function exportPdf(strTitle: string, lstRows: EmployeePayrollInputListRecord[]) {
  const objWindow = window.open("", "_blank", "width=1200,height=800");
  if (!objWindow) {
    return;
  }
  const strRows = lstRows
    .map(
      (dicRow) => `
    <tr>
      <td>${dicRow.strEmployeeCode}</td>
      <td>${dicRow.strEmployeeName}</td>
      <td>${dicRow.strRunName}</td>
      <td>${dicRow.dtPayrollMonth ?? "-"}</td>
      <td>${dicRow.decLwpDays ?? "-"}</td>
      <td>${dicRow.decLopDays ?? "-"}</td>
      <td>${dicRow.strStatus}</td>
    </tr>
  `
    )
    .join("");
  objWindow.document.write(`
    <html>
      <head>
        <title>${strTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
          th { background: #e2e8f0; }
        </style>
      </head>
      <body>
        <h1>${strTitle}</h1>
        <table>
          <thead>
            <tr>
              <th>Employee Code</th>
              <th>Employee Name</th>
              <th>Payroll Run</th>
              <th>Payroll Month</th>
              <th>LWP</th>
              <th>LOP</th>
              <th>Status</th>
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

export default function EmployeePayrollInputListPage() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("employee-payroll-input");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstEmployeePayrollInputModuleCodes);
  const [lstInputs, setLstInputs] = useState<EmployeePayrollInputListRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [dicSearchDraft, setDicSearchDraft] =
    useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] =
    useState<SearchForm>(dicEmptySearch);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
  const [objToast, setObjToast] = useState<ToastState>({
    blnOpen: false,
    strMessage: "",
    strSeverity: "success",
  });
  const blnCanView = canViewAny() || canDoAny("list");
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanExport = canDoAny("export");

  async function loadInputs(objFilters: SearchForm = dicSearchApplied) {
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
      setIntPage(1);
    } catch (objError) {
      setStrError(
        objError instanceof Error
          ? objError.message
          : "Unable to load employee payroll inputs."
      );
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }

    loadInputs().catch(() => undefined);
  }, [blnRightsLoading, blnCanView]);

  const lstFilteredRows = useMemo(() => {
    return lstInputs.filter((dicRow) => {
      const strEmployeeSearch = dicSearchApplied.strSearchEmployee.toLowerCase();
      const strRunSearch = dicSearchApplied.strSearchRun.toLowerCase();
      const blnEmployeeMatch =
        !strEmployeeSearch ||
        dicRow.strEmployeeCode.toLowerCase().includes(strEmployeeSearch) ||
        dicRow.strEmployeeName.toLowerCase().includes(strEmployeeSearch);
      const blnRunMatch =
        !strRunSearch ||
        dicRow.strRunCode.toLowerCase().includes(strRunSearch) ||
        dicRow.strRunName.toLowerCase().includes(strRunSearch);
      const blnStatusMatch =
        dicSearchApplied.strStatus === "All" ||
        dicRow.strStatus === dicSearchApplied.strStatus;
      return blnEmployeeMatch && blnRunMatch && blnStatusMatch;
    });
  }, [dicSearchApplied, lstInputs]);

  const intPageCount = Math.max(1, Math.ceil(lstFilteredRows.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleRows = lstFilteredRows.slice(
    intStartIndex,
    intStartIndex + intRowsPerPage
  );
  const strRangeLabel =
    lstFilteredRows.length === 0
      ? `0 ${t("pagination_separator", "of")} 0`
      : `${intStartIndex + 1}-${Math.min(intStartIndex + intRowsPerPage, lstFilteredRows.length)} ${t("pagination_separator", "of")} ${lstFilteredRows.length}`;

  function showToast(
    strMessage: string,
    strSeverity: ToastState["strSeverity"] = "success"
  ) {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  function navigateToFullScreen(strPath: string) {
    window.location.assign(strPath);
  }

  if (blnLoading || blnRightsLoading) {
    return (
      <BlockingLoader
        blnOpen
        strLabel={t(
          "loading_employee_payroll_inputs",
          "Loading employee payroll inputs..."
        )}
      />
    );
  }

  return (
    <Box className={styles.page}>
      <Typography className={`${styles.breadcrumbs} ${styles.hiddenHeader}`}>
        {t("breadcrumbs", "Payroll / Employee Payroll Input")}
      </Typography>

      <Box className={`${styles.topBar} ${styles.hiddenHeader}`}>
        <Button
          className={styles.secondaryButton}
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => objRouter.push("/payroll")}
        >
          {t("back_button", "Back to Payroll")}
        </Button>
      </Box>

      <Box className={styles.controlsCard}>
        <Box className={styles.searchRow}>
          <TextField
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
            fullWidth
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
          />
          <TextField
            select
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
            <MenuItem value="Draft">{t("status_draft", "Draft")}</MenuItem>
            <MenuItem value="Submitted">{t("status_submitted", "Submitted")}</MenuItem>
            <MenuItem value="Locked">{t("status_locked", "Locked")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button
              className={styles.primaryButton}
              startIcon={<SearchRoundedIcon />}
              onClick={() => {
                setDicSearchApplied(dicSearchDraft);
                loadInputs(dicSearchDraft).catch(() => undefined);
              }}
            >
              {t("search", "Search")}
            </Button>
            <Button
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicSearchDraft(dicEmptySearch);
                setDicSearchApplied(dicEmptySearch);
                loadInputs(dicEmptySearch).catch(() => undefined);
              }}
            >
              {t("clear", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard}>
        <Box className={styles.listUtilityBar}>
          <Box className={styles.listUtilityActions}>
            {blnCanAdd ? <Button
              className={styles.primaryButton}
              startIcon={<AddRoundedIcon />}
              onClick={() => navigateToFullScreen("/payroll/employee-payroll-inputs/new")}
            >
              {t("employee_payroll_input_add_button", "Add Payroll Input")}
            </Button> : null}
            {blnCanExport ? <Button
              className={styles.secondaryButton}
              startIcon={<DownloadRoundedIcon />}
              onClick={() =>
                downloadCsv("employee-payroll-inputs.csv", lstFilteredRows)
              }
            >
              {t("export_excel", "Export Excel")}
            </Button> : null}
            {blnCanExport ? <Button
              className={styles.secondaryButton}
              startIcon={<DownloadRoundedIcon />}
              onClick={() =>
                exportPdf("Employee Payroll Input", lstFilteredRows)
              }
            >
              {t("export_pdf", "Export PDF")}
            </Button> : null}
          </Box>

          <Box className={styles.paginationBar} sx={{ p: 0 }}>
            <Box className={styles.paginationInfo}>
              <Typography>{t("rows_per_page", "Rows per page")}</Typography>
              <TextField
                select
                size="small"
                value={intRowsPerPage}
                onChange={(objEvent) => {
                  setIntRowsPerPage(Number(objEvent.target.value));
                  setIntPage(1);
                }}
                className={styles.rowsPerPageSelect}
                sx={{ width: 92 }}
              >
                {lstRowsPerPageOptions.map((intOption) => (
                  <MenuItem key={intOption} value={intOption}>
                    {intOption}
                  </MenuItem>
                ))}
              </TextField>
              <Typography className={styles.paginationRange}>{strRangeLabel}</Typography>
            </Box>
            <Pagination
              count={intPageCount}
              page={intCurrentPage}
              onChange={(_, intValue) => setIntPage(intValue)}
              color="primary"
              size="small"
              showFirstButton
              showLastButton
            />
          </Box>
        </Box>

        {strRightsError ? <Alert severity="warning" sx={{ mb: 1.5 }}>{strRightsError}</Alert> : null}
        {strError ? <Alert severity="error" sx={{ mb: 1.5 }}>{strError}</Alert> : null}
        {!blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("access_denied", "Employee payroll input access is not available for your user group.")}</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>{t("access_denied_help", "Contact your administrator if you need payroll input visibility.")}</Typography>
          </Box>
        ) : null}
        {blnCanView ? <Box className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.actionsColumn}>{t("actions", "Actions")}</th>
                <th>{t("employee_code", "Employee Code")}</th>
                <th>{t("employee_name", "Employee Name")}</th>
                <th>{t("payroll_run", "Payroll Run")}</th>
                <th>{t("payroll_month", "Payroll Month")}</th>
                <th>{t("lwp_days", "LWP")}</th>
                <th>{t("lop_days", "LOP")}</th>
                <th>{t("status", "Status")}</th>
              </tr>
            </thead>
            <tbody>
              {lstVisibleRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyState}>
                    {t(
                      "empty_message",
                      "No employee payroll inputs found for the current filters."
                    )}
                  </td>
                </tr>
              ) : null}
              {lstVisibleRows.map((dicRow) => (
                <tr key={dicRow.intID}>
                  <td className={styles.actionsColumn}>
                    <Box className={styles.actionCell}>
                      <CommonRowActions
                        blnCanView={blnCanView}
                        blnCanEdit={blnCanEdit && !dicRow.blnIsLocked}
                        onView={() =>
                          navigateToFullScreen(
                            `/payroll/employee-payroll-inputs/${dicRow.intID}/edit?mode=view`
                          )
                        }
                        onEdit={() =>
                          blnCanEdit ? navigateToFullScreen(
                            `/payroll/employee-payroll-inputs/${dicRow.intID}/edit`
                          ) : undefined
                        }
                      />
                    </Box>
                  </td>
                  <td>{dicRow.strEmployeeCode}</td>
                  <td>{dicRow.strEmployeeName}</td>
                  <td>{dicRow.strRunName}</td>
                  <td>{formatDate(dicRow.dtPayrollMonth)}</td>
                  <td>{formatNumber(dicRow.decLwpDays)}</td>
                  <td>{formatNumber(dicRow.decLopDays)}</td>
                  <td>
                    <span
                      className={`${styles.statusPill} ${
                        dicRow.strStatus === "Locked"
                          ? styles.statusInactive
                          : styles.statusActive
                      }`}
                    >
                      {dicRow.strStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box> : null}

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
