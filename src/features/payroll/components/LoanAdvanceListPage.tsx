"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, MenuItem, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { MenuItem as AuthMenuItem } from "@/models/AuthModels";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import CommonRowActions from "@/components/master/CommonRowActions";
import BlockingLoader from "@/components/shared/BlockingLoader";
import LoanAdvanceStatusBadge from "@/features/payroll/components/LoanAdvanceStatusBadge";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { employeeService } from "@/features/employee/services/employeeService";
import type { EmployeeListRecord } from "@/features/employee/types";
import { loanAdvanceService } from "@/features/payroll/services/loanAdvanceService";
import type { LoanAdvanceCategoryRecord, LoanAdvanceRecord } from "@/features/payroll/types";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { authApiService } from "@/services/auth/AuthApiService";

const lstModuleCodes = ["PAYROLL_LOANS_ADVANCES", "LOANS_ADVANCES", "LOANS_AND_ADVANCES"];
const lstEssModuleCodes = ["ESS_LOANS_ADVANCES", "ESS_LOANS_AND_ADVANCES", "LOANS_ADVANCES", "LOANS_AND_ADVANCES"];
const lstStatuses = ["All", "draft", "sent_back", "pending_approval", "approved", "disbursed", "active", "closed", "rejected", "cancelled"];

const dicPayrollActionAliases: Record<string, string[]> = {
  view: ["loan_adv_view"],
  create: ["loan_adv_create"],
  edit: ["loan_adv_edit"],
};

const dicEssActionAliases: Record<string, string[]> = {
  view: ["view", "list", "ess_loan_adv_view"],
  create: ["create", "add", "ess_loan_adv_create"],
  edit: ["edit", "ess_loan_adv_edit"],
};

function formatCurrency(decValue?: number | null) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(decValue || 0));
}

function formatMonth(strValue?: string | null) {
  return strValue ? strValue.slice(0, 7) : "-";
}

function getEmployeeName(objRow: LoanAdvanceRecord) {
  return objRow.objEmployee?.strEmployeeName || objRow.objEmployee?.strEmployeeCode || "-";
}

function getEmployeeLabel(objEmployee: EmployeeListRecord) {
  return objEmployee.strEmployeeCode ? `${objEmployee.strFullName} (${objEmployee.strEmployeeCode})` : objEmployee.strFullName;
}

function toLabelKey(strValue?: string | null) {
  return (strValue || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function hasMenuRoute(lstItems: AuthMenuItem[], strRoute: string): boolean {
  return lstItems.some((objItem) => objItem.strRoute === strRoute || hasMenuRoute(objItem.lstChildren, strRoute));
}

export default function LoanAdvanceListPage({ strMode = "payroll" }: { strMode?: "payroll" | "ess" }) {
  const objRouter = useRouter();
  const { t, blnLoadingLabels, strLabelError } = useModuleLabels("loans-advances");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(strMode === "ess" ? lstEssModuleCodes : lstModuleCodes);
  const [lstRows, setLstRows] = useState<LoanAdvanceRecord[]>([]);
  const [lstEmployees, setLstEmployees] = useState<EmployeeListRecord[]>([]);
  const [lstCategories, setLstCategories] = useState<LoanAdvanceCategoryRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnHasMenuFallbackAccess, setBlnHasMenuFallbackAccess] = useState(false);
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
  const canLoanAction = (strAction: "view" | "create" | "edit") =>
    (blnIsEssMode ? dicEssActionAliases[strAction] : dicPayrollActionAliases[strAction]).some((strAlias) => canDoAny(strAlias));
  const blnCanView = blnHasMenuFallbackAccess || canViewAny() || canLoanAction("view");
  const blnCanCreate = canLoanAction("create");
  const blnCanEdit = canLoanAction("edit");

  useEffect(() => {
    let blnMounted = true;

    async function loadMenuFallback() {
      try {
        const objMenu = await authApiService.getMenu();
        if (!blnMounted) {
          return;
        }
        setBlnHasMenuFallbackAccess(
          hasMenuRoute(
            objMenu.Data.lstMenuItems ?? [],
            blnIsEssMode ? "/ess/loans-advances" : "/payroll/loans-advances",
          ),
        );
      } catch {
        if (blnMounted) {
          setBlnHasMenuFallbackAccess(false);
        }
      }
    }

    void loadMenuFallback();
    return () => {
      blnMounted = false;
    };
  }, [blnIsEssMode]);

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

  useEffect(() => {
    if (blnRightsLoading || !blnCanView) return;
    employeeService.getEmployees().then(setLstEmployees).catch(() => setLstEmployees([]));
  }, [blnRightsLoading, blnCanView]);

  const lstEmployeeOptions = useMemo(
    () => {
      if (lstEmployees.length > 0) {
        return lstEmployees.filter((objEmployee) => !objEmployee.blnIsPartialSave);
      }

      const dicEmployeesByCode = new Map<string, EmployeeListRecord>();
      lstRows.forEach((objRow) => {
        const strEmployeeCode = objRow.objEmployee?.strEmployeeCode?.trim() || "";
        if (!strEmployeeCode || dicEmployeesByCode.has(strEmployeeCode)) {
          return;
        }
        dicEmployeesByCode.set(strEmployeeCode, {
          intID: objRow.intEmployeeID || Number(objRow.intID),
          strEmployeeCode,
          strFullName: objRow.objEmployee?.strEmployeeName || strEmployeeCode,
          strDepartmentName: objRow.objEmployee?.strDepartmentName || "",
          blnIsPartialSave: false
        } as EmployeeListRecord);
      });
      return Array.from(dicEmployeesByCode.values());
    },
    [lstEmployees, lstRows]
  );

  const lstDepartmentOptions = useMemo(
    () =>
      Array.from(
        new Set(
          lstEmployeeOptions
            .map((objEmployee) => objEmployee.strDepartmentName?.trim())
            .filter((strDepartment): strDepartment is string => Boolean(strDepartment))
        )
      ).sort((strLeft, strRight) => strLeft.localeCompare(strRight)),
    [lstEmployeeOptions]
  );

  const lstTableRows = useMemo(
    () =>
      lstRows.map((objRow) => ({
        id: objRow.intID,
        action: (
          <CommonRowActions
            testIdPrefix="loan-advance.list.row"
            rowKey={objRow.intID}
            blnCanView
            blnCanEdit={blnCanEdit}
            onView={() => objRouter.push(blnIsEssMode ? `/ess/loans-advances/${objRow.intID}` : `/payroll/loans-advances/${objRow.intID}`)}
            onEdit={() => objRouter.push(blnIsEssMode ? `/ess/loans-advances/${objRow.intID}` : `/payroll/loans-advances/${objRow.intID}`)}
          />
        ),
        employee: (
          <>
            <Typography sx={{ fontWeight: 900, fontSize: "0.86rem" }}>{getEmployeeName(objRow)}</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>{objRow.objEmployee?.strEmployeeCode || "-"}</Typography>
          </>
        ),
        department: objRow.objEmployee?.strDepartmentName || "-",
        requestType: t(`type_${objRow.strRequestType}`, objRow.strRequestType),
        category: objRow.objCategory?.strCategoryName ? t(toLabelKey(objRow.objCategory.strCategoryName), objRow.objCategory.strCategoryName) : "-",
        requestedAmount: formatCurrency(objRow.decRequestedAmount),
        requestedAmountSortValue: Number(objRow.decRequestedAmount ?? 0),
        approvedAmount: formatCurrency(objRow.decApprovedAmount),
        approvedAmountSortValue: Number(objRow.decApprovedAmount ?? 0),
        outstandingAmount: formatCurrency(objRow.decTotalOutstandingAmount),
        outstandingAmountSortValue: Number(objRow.decTotalOutstandingAmount ?? 0),
        installmentAmount: formatCurrency(objRow.decInstallmentAmount),
        installmentAmountSortValue: Number(objRow.decInstallmentAmount ?? 0),
        recoveryStartMonth: formatMonth(objRow.dtRecoveryStartMonth),
        perquisiteTax: objRow.blnPerquisiteTaxApplicable ? t("yes", "Yes") : t("no", "No"),
        status: <LoanAdvanceStatusBadge strStatus={objRow.strWorkflowStatus} t={t} />,
      })),
    [blnCanEdit, blnIsEssMode, lstRows, objRouter, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "action", headerName: t("table_actions", "Actions"), sortable: false, filterable: false, exportable: false, width: 110 },
      { field: "employee", headerName: t("table_employee", "Employee"), width: 220, sortable: false },
      { field: "department", headerName: t("table_department", "Department"), width: 180 },
      { field: "requestType", headerName: t("table_request_type", "Request Type"), width: 150 },
      { field: "category", headerName: t("table_category", "Category"), width: 180 },
      { field: "requestedAmount", headerName: t("table_requested_amount", "Requested Amount"), align: "right", width: 160, sortAccessor: (dicRow) => dicRow.requestedAmountSortValue },
      { field: "approvedAmount", headerName: t("table_approved_amount", "Approved Amount"), align: "right", width: 160, sortAccessor: (dicRow) => dicRow.approvedAmountSortValue },
      { field: "outstandingAmount", headerName: t("table_outstanding_amount", "Outstanding Amount"), align: "right", width: 170, sortAccessor: (dicRow) => dicRow.outstandingAmountSortValue },
      { field: "installmentAmount", headerName: t("table_installment", "Installment"), align: "right", width: 140, sortAccessor: (dicRow) => dicRow.installmentAmountSortValue },
      { field: "recoveryStartMonth", headerName: t("table_recovery_start_month", "Recovery Start Month"), width: 170 },
      { field: "perquisiteTax", headerName: t("table_perquisite_tax", "Perquisite Tax"), width: 140 },
      { field: "status", headerName: t("table_status", "Status"), sortable: false, filterable: false, width: 150 },
    ],
    [lstTableRows, t]
  );

  function clearFilters() {
    const dicReset = { employee_code: "", department: "", request_type: "All", category_id: "", status: "All", date_from: "", date_to: "", payroll_month: "" };
    setDicFilters(dicReset);
    void loadRows(dicReset);
  }

  const objFilterGridSx = {
    display: "flex",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: 1,
    mt: 1,
    overflowX: "auto",
    pb: 0.5,
    "& > .MuiTextField-root": { flex: "1 1 150px", minWidth: 150 }
  } as const;

  const objFilterActions = (
    <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexShrink: 0, ml: "auto" }}>
      <Button className={styles.primaryButton} size="small" startIcon={<SearchRoundedIcon />} onClick={() => void loadRows()}>{t("search", "Search")}</Button>
      <Button className={styles.secondaryButton} size="small" startIcon={<ClearRoundedIcon />} onClick={clearFilters}>{t("clear", "Clear")}</Button>
    </Box>
  );

  const objSelectMenuProps = {
    disablePortal: false,
    container: typeof window !== "undefined" ? document.body : undefined,
    sx: {
      zIndex: 1802
    },
    PaperProps: {
      sx: {
        zIndex: 1802
      }
    }
  } as const;

  const objFilters = (
    <Box sx={objFilterGridSx}>
      <TextField fullWidth select size="small" label={t("filter_employee", "Employee")} value={dicFilters.employee_code} onChange={(e) => setDicFilters((d) => ({ ...d, employee_code: e.target.value }))} SelectProps={{ MenuProps: objSelectMenuProps }}>
        <MenuItem value="">{t("all", "All")}</MenuItem>
        {lstEmployeeOptions.map((objEmployee) => (
          <MenuItem key={objEmployee.intID} value={objEmployee.strEmployeeCode}>
            {getEmployeeLabel(objEmployee)}
          </MenuItem>
        ))}
      </TextField>
      <TextField fullWidth select size="small" label={t("filter_department", "Department")} value={dicFilters.department} onChange={(e) => setDicFilters((d) => ({ ...d, department: e.target.value }))} SelectProps={{ MenuProps: objSelectMenuProps }}>
        <MenuItem value="">{t("all", "All")}</MenuItem>
        {lstDepartmentOptions.map((strDepartment) => (
          <MenuItem key={strDepartment} value={strDepartment}>
            {strDepartment}
          </MenuItem>
        ))}
      </TextField>
      <TextField fullWidth select size="small" label={t("filter_request_type", "Request Type")} value={dicFilters.request_type} onChange={(e) => setDicFilters((d) => ({ ...d, request_type: e.target.value }))} SelectProps={{ MenuProps: objSelectMenuProps }}>
        {["All", "loan", "advance"].map((strValue) => <MenuItem key={strValue} value={strValue}>{strValue === "All" ? t("all", "All") : t(`type_${strValue}`, strValue)}</MenuItem>)}
      </TextField>
      <TextField fullWidth select size="small" label={t("filter_category", "Category")} value={dicFilters.category_id} onChange={(e) => setDicFilters((d) => ({ ...d, category_id: e.target.value }))} SelectProps={{ MenuProps: objSelectMenuProps }}>
        <MenuItem value="">{t("all_categories", "All categories")}</MenuItem>
        {lstCategories.map((objCategory) => <MenuItem key={objCategory.intID} value={String(objCategory.intID)}>{t(toLabelKey(objCategory.strCategoryName), objCategory.strCategoryName)}</MenuItem>)}
      </TextField>
      <TextField fullWidth select size="small" label={t("filter_status", "Status")} value={dicFilters.status} onChange={(e) => setDicFilters((d) => ({ ...d, status: e.target.value }))} SelectProps={{ MenuProps: objSelectMenuProps }}>
        {lstStatuses.map((strStatus) => <MenuItem key={strStatus} value={strStatus}>{strStatus === "All" ? t("all", "All") : t(`status_${strStatus}`, strStatus.replaceAll("_", " "))}</MenuItem>)}
      </TextField>
      <TextField fullWidth size="small" type="date" label={t("filter_date_from", "Date From")} InputLabelProps={{ shrink: true }} value={dicFilters.date_from} onChange={(e) => setDicFilters((d) => ({ ...d, date_from: e.target.value }))} />
      <TextField fullWidth size="small" type="date" label={t("filter_date_to", "Date To")} InputLabelProps={{ shrink: true }} value={dicFilters.date_to} onChange={(e) => setDicFilters((d) => ({ ...d, date_to: e.target.value }))} />
      <TextField fullWidth size="small" type="month" label={t("filter_payroll_month", "Payroll Month")} InputLabelProps={{ shrink: true }} value={dicFilters.payroll_month} onChange={(e) => setDicFilters((d) => ({ ...d, payroll_month: e.target.value }))} />
      {objFilterActions}
    </Box>
  );

  return (
    <Box className={styles.page}>
      <Box className={styles.controlsCard}>
        {objFilters}
      </Box>
      {strRightsError || strLabelError ? <Alert severity="warning">{strRightsError || strLabelError}</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {!blnCanView && !blnRightsLoading ? <Alert severity="warning">{blnIsEssMode ? t("ess_no_access", "ESS loans and advances access is not available for your user group.") : t("no_access", "Loans and advances access is not available for your user group.")}</Alert> : null}
      {blnCanView ? (
        <Box className={styles.tableCard}>
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName={blnIsEssMode ? "ess-loans-advances" : "payroll-loans-advances"}
            showPaginationSummary
            emptyMessage={t("empty_message", "No loans or advances found.")}
            testIdPrefix="loan-advance.list"
            toolbarLeft={blnCanCreate ? (
              <Button
                className={styles.primaryButton}
                startIcon={<AddRoundedIcon />}
                onClick={() => objRouter.push(blnIsEssMode ? "/ess/loans-advances/new" : "/payroll/loans-advances/new")}
              >
                {t("add_button", "New Request")}
              </Button>
            ) : undefined}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        </Box>
      ) : null}
      <BlockingLoader blnOpen={blnLoading || blnRightsLoading || blnLoadingLabels} strLabel={t("loading", "Loading loans and advances...")} />
    </Box>
  );
}
