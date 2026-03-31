"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
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
        <Box className={styles.controlsHeader}>
          <Box>
            <Typography className={styles.title}>
              {t("employee_salary_title", "Employee Salary")}
            </Typography>
            <Typography sx={{ color: "#64748b", mt: 0.75, maxWidth: 760, fontSize: "0.92rem" }}>
              {t(
                "employee_salary_list_description",
                "Manage employee salary assignments, revisions, current salary snapshots, and effective-dated salary history from one dedicated module."
              )}
            </Typography>
          </Box>
          <Box className={styles.headerActions}>
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
          </Box>
        </Box>

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
        {!blnLoading && lstFilteredRows.length > 0 ? (
          <Box className={styles.paginationBar}>
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
                        <Button
                          className={dicRow.strSalaryStatus === "Assigned" ? styles.secondaryButton : styles.primaryButton}
                          endIcon={<ArrowForwardRoundedIcon />}
                          onClick={() => objRouter.push(`/employee-salary/${dicRow.intEmployeeID}`)}
                        >
                          {dicRow.strSalaryStatus === "Assigned"
                            ? t("employee_salary_open_button", "Open")
                            : t("employee_salary_assign_button", "Assign")}
                        </Button>
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
