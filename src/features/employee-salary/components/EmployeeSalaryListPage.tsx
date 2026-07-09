"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Snackbar,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useEmployeeSalaryLabels } from "@/features/employee-salary/hooks/useEmployeeSalaryLabels";
import { employeeSalaryService } from "@/features/employee-salary/services/employeeSalaryService";
import { calculateEmployeeSalaryBaseSummaryMetrics } from "@/features/employee-salary/utils/employeeSalarySummary";
import type {
  EmployeeSalaryDetailRecord,
  EmployeeSalaryListRecord
} from "@/features/employee-salary/types";

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

function getCalculatedDisplayAmounts(objDetail: EmployeeSalaryDetailRecord) {
  const dicBaseSummaryMetrics = calculateEmployeeSalaryBaseSummaryMetrics(objDetail);

  return {
    decCtcAnnual: dicBaseSummaryMetrics.decAnnualCtc,
    decGrossMonthly: dicBaseSummaryMetrics.decGrossMonthly
  };
}

async function enrichEmployeeSalaryRow(dicRow: EmployeeSalaryListRecord) {
  if (dicRow.strSalaryStatus !== "Assigned") {
    return dicRow;
  }

  try {
    const objDetail = await employeeSalaryService.getEmployeeSalaryDetail(dicRow.intEmployeeID);
    const dicDisplayAmounts = getCalculatedDisplayAmounts(objDetail);
    return {
      ...dicRow,
      decCtcAnnual: dicDisplayAmounts.decCtcAnnual,
      decGrossMonthly: dicDisplayAmounts.decGrossMonthly
    };
  } catch {
    return dicRow;
  }
}

const dicEmptySearch: SearchForm = { strName: "", strCode: "", strStatus: "All" };
const lstEmployeeSalaryModuleCodes = ["EMPLOYEE_SALARY", "EMPLOYEE-SALARY", "EMPLOYEE_SALARIES"];

export default function EmployeeSalaryListPage() {
  const objRouter = useRouter();
  const { t } = useEmployeeSalaryLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstEmployeeSalaryModuleCodes);
  const [lstEmployeeSalaries, setLstEmployeeSalaries] = useState<EmployeeSalaryListRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [dicSearch, setDicSearch] = useState<SearchForm>(dicEmptySearch);
  const [dicAppliedSearch, setDicAppliedSearch] = useState(dicSearch);
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
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      const lstEmployeeSalaryRows = await employeeSalaryService.getEmployeeSalaries();
      setLstEmployeeSalaries(await Promise.all(lstEmployeeSalaryRows.map(enrichEmployeeSalaryRow)));
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

  const lstTableRows = useMemo(
    () =>
      lstFilteredRows.map((dicRow) => ({
        id: dicRow.intEmployeeID,
        action: (
          <CommonRowActions
            testIdPrefix="employee-salary.list.row"
            rowKey={dicRow.intEmployeeID}
            blnCanView={blnCanView}
            blnCanEdit={blnCanMutate}
            onView={() => objRouter.push(`/employee-salary/${dicRow.intEmployeeID}?mode=view`)}
            onEdit={() => objRouter.push(`/employee-salary/${dicRow.intEmployeeID}`)}
          />
        ),
        strEmployeeCode: dicRow.strEmployeeCode,
        strEmployeeName: dicRow.strEmployeeName,
        strSalaryStatus: (
          <span className={`${styles.statusPill} ${dicRow.strSalaryStatus === "Assigned" ? styles.statusActive : styles.statusInactive}`}>
            {dicRow.strSalaryStatus === "Assigned"
              ? t("employee_salary_status_assigned", "Assigned")
              : t("employee_salary_status_unassigned", "Unassigned")}
          </span>
        ),
        strAssignedStructure: dicRow.strStructureName ?? t("employee_salary_not_assigned", "Not assigned"),
        dtEffectiveFrom: formatDate(dicRow.dtEffectiveFrom),
        decCtcAnnual: formatCurrency(dicRow.decCtcAnnual),
        decGrossMonthly: formatCurrency(dicRow.decGrossMonthly)
      })),
    [blnCanMutate, blnCanView, lstFilteredRows, objRouter, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "action", headerName: t("employee_salary_action", "Action"), sortable: false, filterable: false, exportable: false, width: 110 },
      { field: "strEmployeeCode", headerName: t("employee_salary_employee_code", "Employee Code") },
      { field: "strEmployeeName", headerName: t("employee_salary_employee_name", "Employee Name") },
      { field: "strSalaryStatus", headerName: t("employee_salary_salary_status", "Salary Status"), sortable: false, filterable: false, width: 150 },
      { field: "strAssignedStructure", headerName: t("employee_salary_assigned_structure", "Assigned Structure") },
      { field: "dtEffectiveFrom", headerName: t("employee_salary_effective_from", "Effective From") },
      { field: "decCtcAnnual", headerName: t("employee_salary_ctc_annual", "CTC Annual"), align: "right" },
      { field: "decGrossMonthly", headerName: t("employee_salary_gross_monthly", "Gross Monthly"), align: "right" }
    ],
    [t]
  );

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
            data-controlid="employee-salary.list.search-name.input"
            inputProps={{ "data-controlid": "employee-salary.list.search-name.input" }}
            value={dicSearch.strName}
            onChange={(objEvent) => setDicSearch((dicPrev) => ({ ...dicPrev, strName: objEvent.target.value }))}
            placeholder={t("employee_salary_search_employee_name", "Search employee name")}
            fullWidth
          />

          <TextField
            data-controlid="employee-salary.list.search-status.select"
            inputProps={{ "data-controlid": "employee-salary.list.search-status.select" }}
            select
            value={dicSearch.strStatus}
            onChange={(objEvent) => setDicSearch((dicPrev) => ({ ...dicPrev, strStatus: objEvent.target.value as SearchForm["strStatus"] }))}
            fullWidth
          >
            <MenuItem data-controlid="employee-salary.list.search-status.all.option" value="All">{t("employee_salary_status_filter", "Salary Status")}</MenuItem>
            <MenuItem data-controlid="employee-salary.list.search-status.assigned.option" value="Assigned">{t("employee_salary_status_assigned", "Assigned")}</MenuItem>
            <MenuItem data-controlid="employee-salary.list.search-status.unassigned.option" value="Unassigned">{t("employee_salary_status_unassigned", "Unassigned")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button
              data-controlid="employee-salary.list.search.button"
              className={styles.primaryButton}
              startIcon={<SearchRoundedIcon />}
              onClick={() => {
                setDicAppliedSearch(dicSearch);
              }}
            >
              {t("employee_salary_search_button", "Search")}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button
              data-controlid="employee-salary.list.clear.button"
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicSearch(dicEmptySearch);
                setDicAppliedSearch(dicEmptySearch);
              }}
            >
              {t("employee_salary_clear_button", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard}>
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
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            defaultPageSize={10}
            pageSizeOptions={[10, 20, 50]}
            exportFileName="employee_salary"
            showExportOptions={blnCanExport}
            showPaginationSummary
            emptyMessage={t("employee_salary_no_records_found", "No employee salary records found.")}
            toolbarLeft={(
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                {blnCanMutate ? (
                  <Button
                    data-controlid="employee-salary.list.open-employee.button"
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
              </Box>
            )}
            testIdPrefix="employee-salary.list"
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
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
