"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Pagination,
  Snackbar,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useEmployeeSalaryLabels } from "@/features/employee-salary/hooks/useEmployeeSalaryLabels";
import { employeeSalaryService } from "@/features/employee-salary/services/employeeSalaryService";
import type { EmployeeSalaryListRecord } from "@/features/employee-salary/types";

type SearchForm = {
  strName: string;
  strCode: string;
  strStatus: "All" | "Assigned" | "Unassigned";
};

type ToastState = {
  blnOpen: boolean;
  strMessage: string;
  strSeverity: "success" | "error";
};

function formatCurrency(decValue: number | null) {
  if (decValue === null) {
    return "-";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(decValue);
}

function formatDate(strDate: string | null) {
  if (!strDate) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(strDate));
}

const lstRowsPerPageOptions = [10, 20, 50];
const dicEmptySearch: SearchForm = { strName: "", strCode: "", strStatus: "All" };
const lstEmployeeSalaryModuleCodes = ["EMPLOYEE_SALARY", "EMPLOYEE-SALARY", "EMPLOYEE_SALARIES"];

function downloadCsv(strFileName: string, lstRows: EmployeeSalaryListRecord[]) {
  const lstHeaders = [
    "Employee Code",
    "Employee Name",
    "Salary Status",
    "Assigned Structure",
    "Effective From",
    "Gross Monthly",
    "CTC Annual"
  ];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) =>
      [
        dicRow.strEmployeeCode,
        dicRow.strEmployeeName,
        dicRow.strSalaryStatus,
        dicRow.strStructureName ?? "Not assigned",
        formatDate(dicRow.dtEffectiveFrom),
        formatCurrency(dicRow.decGrossMonthly),
        formatCurrency(dicRow.decCtcAnnual)
      ]
        .map((strValue) => `"${String(strValue).replace(/"/g, '""')}"`)
        .join(",")
    )
  ];
  const objBlob = new Blob([lstLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const strUrl = URL.createObjectURL(objBlob);
  const objLink = document.createElement("a");
  objLink.href = strUrl;
  objLink.download = strFileName;
  objLink.click();
  URL.revokeObjectURL(strUrl);
}

function exportPdf(strTitle: string, lstRows: EmployeeSalaryListRecord[]) {
  const objWindow = window.open("", "_blank", "width=1400,height=900");
  if (!objWindow) {
    return;
  }

  const strRows = lstRows.map((dicRow) => `
    <tr>
      <td>${dicRow.strEmployeeCode}</td>
      <td>${dicRow.strEmployeeName}</td>
      <td>${dicRow.strSalaryStatus}</td>
      <td>${dicRow.strStructureName ?? "Not assigned"}</td>
      <td>${formatDate(dicRow.dtEffectiveFrom)}</td>
      <td>${formatCurrency(dicRow.decGrossMonthly)}</td>
      <td>${formatCurrency(dicRow.decCtcAnnual)}</td>
    </tr>
  `).join("");

  objWindow.document.write(`
    <html>
      <head>
        <title>${strTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
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
              <th>Salary Status</th>
              <th>Assigned Structure</th>
              <th>Effective From</th>
              <th>Gross Monthly</th>
              <th>CTC Annual</th>
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

export default function EmployeeSalaryListPage() {
  const objRouter = useRouter();
  const { t } = useEmployeeSalaryLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstEmployeeSalaryModuleCodes);
  const [lstEmployeeSalaries, setLstEmployeeSalaries] = useState<EmployeeSalaryListRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [dicSearch, setDicSearch] = useState<SearchForm>(dicEmptySearch);
  const [dicAppliedSearch, setDicAppliedSearch] = useState(dicSearch);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  const blnCanView = canViewAny() || canDoAny("list");
  const blnCanExport = canDoAny("export");
  const blnCanEdit = canDoAny("edit");
  const blnCanAdd = canDoAny("add");
  const blnCanSave = canDoAny("save");
  const blnCanMutate = blnCanAdd || blnCanEdit || blnCanSave;
  const blnReadOnly = isReadOnly() || (blnCanView && !blnCanMutate);

  function showToast(strMessage: string, strSeverity: ToastState["strSeverity"] = "success") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  function closeToast() {
    setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }));
  }

  async function loadEmployeeSalaries() {
    if (!blnCanView) {
      setLstEmployeeSalaries([]);
      setIntPage(1);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      setLstEmployeeSalaries(await employeeSalaryService.getEmployeeSalaries());
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : "Unable to load employee salary records.", "error");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }
    loadEmployeeSalaries().catch(() => undefined);
  }, [blnRightsLoading, blnCanView]);

  const lstFilteredRows = useMemo(() => {
    return lstEmployeeSalaries.filter((dicRow) => {
      const blnNameMatch = !dicAppliedSearch.strName || dicRow.strEmployeeName.toLowerCase().includes(dicAppliedSearch.strName.toLowerCase());
      const blnCodeMatch = !dicAppliedSearch.strCode || dicRow.strEmployeeCode.toLowerCase().includes(dicAppliedSearch.strCode.toLowerCase());
      const blnStatusMatch = dicAppliedSearch.strStatus === "All" || dicRow.strSalaryStatus === dicAppliedSearch.strStatus;
      return blnNameMatch && blnCodeMatch && blnStatusMatch;
    });
  }, [dicAppliedSearch, lstEmployeeSalaries]);

  const intPageCount = Math.max(1, Math.ceil(lstFilteredRows.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleRows = lstFilteredRows.slice(intStartIndex, intStartIndex + intRowsPerPage);

  return (
    <Box className={styles.page}>
      <Box className={styles.controlsCard}>
        {strRightsError ? <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? (
          <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>
            {t("employee_salary_read_only_mode", "You have view-only access for Employee Salary.")}
          </Typography>
        ) : null}

        <Box className={styles.searchRow}>
            <TextField
            data-testid="employee-salary.list.search-code.input"
            inputProps={{ "data-testid": "employee-salary.list.search-code.input" }}
            value={dicSearch.strCode}
            onChange={(objEvent) => setDicSearch((dicPrev) => ({ ...dicPrev, strCode: objEvent.target.value.toUpperCase() }))}
            placeholder={t("employee_salary_search_employee_code", "Search employee code")}
            fullWidth
          />
          
          <TextField
            data-testid="employee-salary.list.search-name.input"
            inputProps={{ "data-testid": "employee-salary.list.search-name.input" }}
            value={dicSearch.strName}
            onChange={(objEvent) => setDicSearch((dicPrev) => ({ ...dicPrev, strName: objEvent.target.value }))}
            placeholder={t("employee_salary_search_employee_name", "Search employee name")}
            fullWidth
          />

          <TextField
            data-testid="employee-salary.list.search-status.select"
            inputProps={{ "data-testid": "employee-salary.list.search-status.select" }}
            select
            value={dicSearch.strStatus}
            onChange={(objEvent) => setDicSearch((dicPrev) => ({ ...dicPrev, strStatus: objEvent.target.value }))}
            fullWidth
          >
            <MenuItem data-testid="employee-salary.list.search-status.all.option" value="All">{t("employee_salary_status_filter", "Salary Status")}</MenuItem>
            <MenuItem data-testid="employee-salary.list.search-status.assigned.option" value="Assigned">{t("employee_salary_status_assigned", "Assigned")}</MenuItem>
            <MenuItem data-testid="employee-salary.list.search-status.unassigned.option" value="Unassigned">{t("employee_salary_status_unassigned", "Unassigned")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button
              data-testid="employee-salary.list.search.button"
              className={styles.primaryButton}
              startIcon={<SearchRoundedIcon />}
              onClick={() => {
                setDicAppliedSearch(dicSearch);
                setIntPage(1);
              }}
            >
              {t("employee_salary_search_button", "Search")}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button
              data-testid="employee-salary.list.clear.button"
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicSearch(dicEmptySearch);
                setDicAppliedSearch(dicEmptySearch);
                setIntPage(1);
              }}
            >
              {t("employee_salary_clear_button", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 1 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {blnCanMutate ? (
              <Button
                data-testid="employee-salary.list.open-employee.button"
                className={styles.primaryButton}
                startIcon={<AddRoundedIcon />}
                onClick={() => {
                  const dicFirstUnassigned = lstFilteredRows.find((dicRow) => dicRow.strSalaryStatus === "Unassigned") ?? lstFilteredRows[0];
                  if (dicFirstUnassigned) {
                    objRouter.push(`/employee-salary/${dicFirstUnassigned.intEmployeeID}`);
                  }
                }}
              >
                {t("employee_salary_open_employee", "Open Employee")}
              </Button>
            ) : null}
            {blnCanExport ? (
              <Button
                data-testid="employee-salary.list.export-excel.button"
                className={styles.secondaryButton}
                startIcon={<DownloadRoundedIcon />}
                onClick={() => downloadCsv("employee_salary.csv", lstFilteredRows)}
              >
                {t("export_excel", "Export Excel")}
              </Button>
            ) : null}
            {blnCanExport ? (
              <Button
                data-testid="employee-salary.list.export-pdf.button"
                className={styles.secondaryButton}
                startIcon={<DownloadRoundedIcon />}
                onClick={() => exportPdf(t("employee_salary_title", "Employee Salary"), lstFilteredRows)}
              >
                {t("export_pdf", "Export PDF")}
              </Button>
            ) : null}
          </Box>

          {!blnLoading && lstFilteredRows.length > 0 ? (
          <Box className={styles.paginationBar} sx={{ p: 0, justifyContent: { xs: "flex-start", md: "flex-end" } }}>
            <Box className={styles.paginationInfo}>
              <Typography className={styles.paginationLabel}>{t("employee_salary_rows_per_page", "Rows per page")}</Typography>
              <TextField
                data-testid="employee-salary.list.rows-per-page.select"
                inputProps={{ "data-testid": "employee-salary.list.rows-per-page.select" }}
                select
                size="small"
                value={String(intRowsPerPage)}
                onChange={(objEvent) => {
                  setIntRowsPerPage(Number(objEvent.target.value));
                  setIntPage(1);
                }}
                className={styles.rowsPerPageSelect}
              >
                {lstRowsPerPageOptions.map((intOption) => (
                  <MenuItem key={intOption} value={String(intOption)} data-testid={`employee-salary.list.rows-per-page.${intOption}.option`}>{intOption}</MenuItem>
                ))}
              </TextField>
              <Typography className={styles.paginationRange}>
                {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFilteredRows.length)} of {lstFilteredRows.length}
              </Typography>
            </Box>
            <Pagination
              data-testid="employee-salary.list.pagination"
              count={intPageCount}
              page={intCurrentPage}
              onChange={(_, intNextPage) => setIntPage(intNextPage)}
              size="small"
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        ) : null}
        </Box>

        {blnLoading || blnRightsLoading ? (
          <Box className={styles.emptyState}>
            <CircularProgress size={24} />
            <Typography sx={{ mt: 1 }}>{t("employee_salary_loading_records", "Loading employee salary records...")}</Typography>
          </Box>
        ) : !blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
              {t("employee_salary_access_denied", "Employee salary access is not available for your user group.")}
            </Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>
              {t("employee_salary_access_denied_help", "Contact your administrator if you need employee salary visibility.")}
            </Typography>
          </Box>
        ) : (
          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("employee_salary_action", "Action")}</th>
                  <th>{t("employee_salary_employee_code", "Employee Code")}</th>
                  <th>{t("employee_salary_employee_name", "Employee Name")}</th>
                  <th>{t("employee_salary_salary_status", "Salary Status")}</th>
                  <th>{t("employee_salary_assigned_structure", "Assigned Structure")}</th>
                  <th>{t("employee_salary_effective_from", "Effective From")}</th>
                  <th>{t("employee_salary_gross_monthly", "Gross Monthly")}</th>
                  <th>{t("employee_salary_ctc_annual", "CTC Annual")}</th>
                </tr>
              </thead>
              <tbody>
                {lstFilteredRows.length === 0 ? (
                  <tr>
                    <td className={styles.emptyState} colSpan={8}>{t("employee_salary_no_records_found", "No employee salary records found.")}</td>
                  </tr>
                ) : lstVisibleRows.map((dicRow) => (
                  <tr key={dicRow.intEmployeeID}>
                    <td>
                      <CommonRowActions
                        testIdPrefix="employee-salary.list.row"
                        rowKey={dicRow.intEmployeeID}
                        blnCanView={blnCanView}
                        blnCanEdit={blnCanMutate}
                        onView={() => objRouter.push(`/employee-salary/${dicRow.intEmployeeID}?mode=view`)}
                        onEdit={() => objRouter.push(`/employee-salary/${dicRow.intEmployeeID}`)}
                      />
                    </td>
                    <td>{dicRow.strEmployeeCode}</td>
                    <td>{dicRow.strEmployeeName}</td>
                    <td>
                      <span className={`${styles.statusPill} ${dicRow.strSalaryStatus === "Assigned" ? styles.statusActive : styles.statusInactive}`}>
                        {dicRow.strSalaryStatus === "Assigned"
                          ? t("employee_salary_status_assigned", "Assigned")
                          : t("employee_salary_status_unassigned", "Unassigned")}
                      </span>
                    </td>
                    <td>{dicRow.strStructureName ?? t("employee_salary_not_assigned", "Not assigned")}</td>
                    <td>{formatDate(dicRow.dtEffectiveFrom)}</td>
                    <td>{formatCurrency(dicRow.decGrossMonthly)}</td>
                    <td>{formatCurrency(dicRow.decCtcAnnual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}
      </Box>

      <BlockingLoader blnOpen={blnLoading || blnRightsLoading} strLabel={t("loading", "Loading...")} intZIndex={1400} />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
