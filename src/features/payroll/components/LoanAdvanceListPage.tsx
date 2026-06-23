"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, IconButton, MenuItem, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import LoanAdvanceStatusBadge from "@/features/payroll/components/LoanAdvanceStatusBadge";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { loanAdvanceService } from "@/features/payroll/services/loanAdvanceService";
import type { LoanAdvanceCategoryRecord, LoanAdvanceRecord } from "@/features/payroll/types";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

const lstModuleCodes = ["PAYROLL_LOANS_ADVANCES", "LOANS_ADVANCES", "LOANS_AND_ADVANCES"];
const lstEssModuleCodes = ["ESS_LOANS_ADVANCES", "ESS_LOANS_AND_ADVANCES", "LOANS_ADVANCES", "LOANS_AND_ADVANCES"];
const lstStatuses = ["All", "draft", "sent_back", "pending_approval", "approved", "disbursed", "active", "closed", "rejected", "cancelled"];

function formatCurrency(decValue?: number | null) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(decValue || 0));
}

function formatMonth(strValue?: string | null) {
  return strValue ? strValue.slice(0, 7) : "-";
}

function getEmployeeName(objRow: LoanAdvanceRecord) {
  return objRow.objEmployee?.strEmployeeName || objRow.objEmployee?.strEmployeeCode || "-";
}

export default function LoanAdvanceListPage({ strMode = "payroll" }: { strMode?: "payroll" | "ess" }) {
  const objRouter = useRouter();
  const { t, blnLoadingLabels, strLabelError } = useModuleLabels("loans-advances");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(strMode === "ess" ? lstEssModuleCodes : lstModuleCodes);
  const [lstRows, setLstRows] = useState<LoanAdvanceRecord[]>([]);
  const [lstCategories, setLstCategories] = useState<LoanAdvanceCategoryRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [dicFilters, setDicFilters] = useState({
    employee_code: "",
    department: "",
    request_type: "All",
    category_id: "",
    status: "All",
    date_from: "",
    date_to: "",
    payroll_month: "",
  });
  const blnIsEssMode = strMode === "ess";
  const blnCanView = canViewAny() || canDoAny("view") || canDoAny("list") || (blnIsEssMode && canDoAny("ess_loan_adv_view"));
  const blnCanCreate = canDoAny("add") || canDoAny("create") || (blnIsEssMode && canDoAny("ess_loan_adv_create"));

  async function loadRows(dicNextFilters = dicFilters) {
    if (!blnCanView) {
      setLstRows([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    setStrError("");
    try {
      const dicApiFilters = { ...dicNextFilters, payroll_month: dicNextFilters.payroll_month ? `${dicNextFilters.payroll_month}-01` : "" };
      setLstRows(await (blnIsEssMode ? loanAdvanceService.listEssLoans(dicApiFilters) : loanAdvanceService.listLoans(dicApiFilters)));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("error_load_list", "Unable to load loans and advances."));
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) return;
    void loadRows();
  }, [blnRightsLoading, blnCanView]);

  useEffect(() => {
    if (blnRightsLoading || !blnCanView) return;
    (blnIsEssMode ? loanAdvanceService.listEssCategories() : loanAdvanceService.listCategories()).then(setLstCategories).catch(() => setLstCategories([]));
  }, [blnRightsLoading, blnCanView, blnIsEssMode]);

  const lstVisibleRows = useMemo(() => lstRows, [lstRows]);

  function clearFilters() {
    const dicReset = { employee_code: "", department: "", request_type: "All", category_id: "", status: "All", date_from: "", date_to: "", payroll_month: "" };
    setDicFilters(dicReset);
    void loadRows(dicReset);
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader}>
          <Box>
            <Typography className={styles.breadcrumbs}>{blnIsEssMode ? t("ess_breadcrumbs", "ESS / My Loans & Advances") : t("breadcrumbs", "Payroll / Loans & Advances")}</Typography>
            <Typography className={styles.title}>{blnIsEssMode ? t("ess_page_title", "My Loans & Advances") : t("page_title", "Loans & Advances")}</Typography>
          </Box>
          {blnCanCreate ? <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push(blnIsEssMode ? "/ess/loans-advances/new" : "/payroll/loans-advances/new")}>{t("add_button", "New Request")}</Button> : null}
        </Box>
        <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", mt: 1 }}>
          <TextField size="small" label={t("filter_employee", "Employee")} value={dicFilters.employee_code} onChange={(e) => setDicFilters((d) => ({ ...d, employee_code: e.target.value }))} />
          <TextField size="small" label={t("filter_department", "Department")} value={dicFilters.department} onChange={(e) => setDicFilters((d) => ({ ...d, department: e.target.value }))} />
          <TextField select size="small" label={t("filter_request_type", "Request Type")} value={dicFilters.request_type} onChange={(e) => setDicFilters((d) => ({ ...d, request_type: e.target.value }))}>
            {["All", "loan", "advance"].map((strValue) => <MenuItem key={strValue} value={strValue}>{strValue === "All" ? t("all", "All") : t(`type_${strValue}`, strValue)}</MenuItem>)}
          </TextField>
          <TextField select size="small" label={t("filter_category", "Category")} value={dicFilters.category_id} onChange={(e) => setDicFilters((d) => ({ ...d, category_id: e.target.value }))}>
            <MenuItem value="">{t("all_categories", "All categories")}</MenuItem>
            {lstCategories.map((objCategory) => <MenuItem key={objCategory.intID} value={String(objCategory.intID)}>{objCategory.strCategoryName}</MenuItem>)}
          </TextField>
          <TextField select size="small" label={t("filter_status", "Status")} value={dicFilters.status} onChange={(e) => setDicFilters((d) => ({ ...d, status: e.target.value }))}>
            {lstStatuses.map((strStatus) => <MenuItem key={strStatus} value={strStatus}>{strStatus === "All" ? t("all", "All") : t(`status_${strStatus}`, strStatus.replaceAll("_", " "))}</MenuItem>)}
          </TextField>
          <TextField size="small" type="date" label={t("filter_date_from", "Date From")} InputLabelProps={{ shrink: true }} value={dicFilters.date_from} onChange={(e) => setDicFilters((d) => ({ ...d, date_from: e.target.value }))} />
          <TextField size="small" type="date" label={t("filter_date_to", "Date To")} InputLabelProps={{ shrink: true }} value={dicFilters.date_to} onChange={(e) => setDicFilters((d) => ({ ...d, date_to: e.target.value }))} />
          <TextField size="small" type="month" label={t("filter_payroll_month", "Payroll Month")} InputLabelProps={{ shrink: true }} value={dicFilters.payroll_month} onChange={(e) => setDicFilters((d) => ({ ...d, payroll_month: e.target.value }))} />
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Button className={styles.primaryButton} size="small" startIcon={<SearchRoundedIcon />} onClick={() => void loadRows()}>{t("search", "Search")}</Button>
            <Button className={styles.secondaryButton} size="small" startIcon={<ClearRoundedIcon />} onClick={clearFilters}>{t("clear", "Clear")}</Button>
          </Box>
        </Box>
      </Box>
      {strRightsError || strLabelError ? <Alert severity="warning">{strRightsError || strLabelError}</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {!blnCanView && !blnRightsLoading ? <Alert severity="warning">{blnIsEssMode ? t("ess_no_access", "ESS loans and advances access is not available for your user group.") : t("no_access", "Loans and advances access is not available for your user group.")}</Alert> : null}
      {blnCanView ? (
        <Box className={styles.tableCard}>
          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr>
                <th className={styles.actionsColumn}>{t("table_actions", "Actions")}</th>
                <th>{t("table_employee", "Employee")}</th>
                <th>{t("table_department", "Department")}</th>
                <th>{t("table_request_type", "Request Type")}</th>
                <th>{t("table_category", "Category")}</th>
                <th>{t("table_requested_amount", "Requested Amount")}</th>
                <th>{t("table_approved_amount", "Approved Amount")}</th>
                <th>{t("table_outstanding_amount", "Outstanding Amount")}</th>
                <th>{t("table_installment", "Installment")}</th>
                <th>{t("table_recovery_start_month", "Recovery Start Month")}</th>
                <th>{t("table_perquisite_tax", "Perquisite Tax")}</th>
                <th>{t("table_status", "Status")}</th>
              </tr></thead>
              <tbody>
                {lstVisibleRows.length ? lstVisibleRows.map((objRow) => (
                  <tr key={objRow.intID}>
                    <td className={styles.actionsColumn}><IconButton size="small" onClick={() => objRouter.push(blnIsEssMode ? `/ess/loans-advances/${objRow.intID}` : `/payroll/loans-advances/${objRow.intID}`)} aria-label={t("open", "Open")}><OpenInNewRoundedIcon fontSize="small" /></IconButton></td>
                    <td><Typography sx={{ fontWeight: 900, fontSize: "0.86rem" }}>{getEmployeeName(objRow)}</Typography><Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>{objRow.objEmployee?.strEmployeeCode || "-"}</Typography></td>
                    <td>{objRow.objEmployee?.strDepartmentName || "-"}</td>
                    <td>{t(`type_${objRow.strRequestType}`, objRow.strRequestType)}</td>
                    <td>{objRow.objCategory?.strCategoryName || "-"}</td>
                    <td>{formatCurrency(objRow.decRequestedAmount)}</td>
                    <td>{formatCurrency(objRow.decApprovedAmount)}</td>
                    <td>{formatCurrency(objRow.decTotalOutstandingAmount)}</td>
                    <td>{formatCurrency(objRow.decInstallmentAmount)}</td>
                    <td>{formatMonth(objRow.dtRecoveryStartMonth)}</td>
                    <td>{objRow.blnPerquisiteTaxApplicable ? t("yes", "Yes") : t("no", "No")}</td>
                    <td><LoanAdvanceStatusBadge strStatus={objRow.strWorkflowStatus} /></td>
                  </tr>
                )) : <tr><td colSpan={12} className={styles.emptyState}>{t("empty_message", "No loans or advances found.")}</td></tr>}
              </tbody>
            </table>
          </Box>
        </Box>
      ) : null}
      <BlockingLoader blnOpen={blnLoading || blnRightsLoading || blnLoadingLabels} strLabel={t("loading", "Loading loans and advances...")} />
    </Box>
  );
}
