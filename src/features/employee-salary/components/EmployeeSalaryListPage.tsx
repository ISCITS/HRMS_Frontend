"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Pagination,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import { useEmployeeSalaryLabels } from "@/features/employee-salary/hooks/useEmployeeSalaryLabels";
import { employeeSalaryService } from "@/features/employee-salary/services/employeeSalaryService";
import type { EmployeeSalaryListRecord } from "@/features/employee-salary/types";

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
  const [lstEmployeeSalaries, setLstEmployeeSalaries] = useState<EmployeeSalaryListRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [dicSearch, setDicSearch] = useState({
    strName: "",
    strCode: "",
    strStatus: "All"
  });
  const [dicAppliedSearch, setDicAppliedSearch] = useState(dicSearch);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);

  useEffect(() => {
    let blnMounted = true;
    setBlnLoading(true);
    employeeSalaryService.getEmployeeSalaries()
      .then((lstData) => {
        if (blnMounted) {
          setLstEmployeeSalaries(lstData);
        }
      })
      .finally(() => {
        if (blnMounted) {
          setBlnLoading(false);
        }
      });
    return () => {
      blnMounted = false;
    };
  }, []);

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

        <Box className={styles.searchRow}>
          <TextField
            value={dicSearch.strName}
            onChange={(objEvent) => setDicSearch((dicPrev) => ({ ...dicPrev, strName: objEvent.target.value }))}
            placeholder={t("employee_salary_search_employee_name", "Search employee name")}
            fullWidth
          />
          <TextField
            value={dicSearch.strCode}
            onChange={(objEvent) => setDicSearch((dicPrev) => ({ ...dicPrev, strCode: objEvent.target.value.toUpperCase() }))}
            placeholder={t("employee_salary_search_employee_code", "Search employee code")}
            fullWidth
          />
          <TextField
            select
            value={dicSearch.strStatus}
            onChange={(objEvent) => setDicSearch((dicPrev) => ({ ...dicPrev, strStatus: objEvent.target.value }))}
            fullWidth
          >
            <MenuItem value="All">{t("employee_salary_status_filter", "Salary Status")}</MenuItem>
            <MenuItem value="Assigned">{t("employee_salary_status_assigned", "Assigned")}</MenuItem>
            <MenuItem value="Unassigned">{t("employee_salary_status_unassigned", "Unassigned")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button
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
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                const dicEmptySearch = { strName: "", strCode: "", strStatus: "All" };
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
            <Button
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
            <Button
              className={styles.secondaryButton}
              startIcon={<DownloadRoundedIcon />}
              onClick={() => downloadCsv("employee_salary.csv", lstFilteredRows)}
            >
              {t("export_excel", "Export Excel")}
            </Button>
            <Button
              className={styles.secondaryButton}
              startIcon={<DownloadRoundedIcon />}
              onClick={() => exportPdf(t("employee_salary_title", "Employee Salary"), lstFilteredRows)}
            >
              {t("export_pdf", "Export PDF")}
            </Button>
          </Box>

          {!blnLoading && lstFilteredRows.length > 0 ? (
          <Box className={styles.paginationBar} sx={{ p: 0, justifyContent: { xs: "flex-start", md: "flex-end" } }}>
            <Box className={styles.paginationInfo}>
              <Typography className={styles.paginationLabel}>{t("employee_salary_rows_per_page", "Rows per page")}</Typography>
              <TextField
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
                  <MenuItem key={intOption} value={String(intOption)}>{intOption}</MenuItem>
                ))}
              </TextField>
              <Typography className={styles.paginationRange}>
                {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFilteredRows.length)} of {lstFilteredRows.length}
              </Typography>
            </Box>
            <Pagination
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

        {blnLoading ? (
          <Box className={styles.emptyState}>
            <CircularProgress size={24} />
            <Typography sx={{ mt: 1 }}>{t("employee_salary_loading_records", "Loading employee salary records...")}</Typography>
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
                      <Box className={styles.actionCell}>
                        <button
                          className={`${styles.iconButton} ${styles.viewIcon}`}
                          type="button"
                          onClick={() => objRouter.push(`/employee-salary/${dicRow.intEmployeeID}`)}
                          title={dicRow.strSalaryStatus === "Assigned"
                            ? t("employee_salary_open_button", "Open")
                            : t("employee_salary_assign_button", "Assign")}
                        >
                          <OpenInNewRoundedIcon fontSize="small" />
                        </button>
                      </Box>
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
    </Box>
  );
}
