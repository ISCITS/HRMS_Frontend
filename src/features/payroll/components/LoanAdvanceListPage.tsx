"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ViewColumnRoundedIcon from "@mui/icons-material/ViewColumnRounded";
import { Alert, Autocomplete, Box, Breadcrumbs, Button, Checkbox, IconButton, Link, Menu, MenuItem, Popover, Skeleton, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { MenuItem as AuthMenuItem } from "@/models/AuthModels";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import LoanAdvanceStatusBadge from "@/features/payroll/components/LoanAdvanceStatusBadge";
import styles from "@/components/master/MasterScreen.module.css";
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
const intLoanAdvanceSkeletonRows = 8;
const strLoanAdvanceSkeletonColumns = "170px 130px 180px 150px 180px 160px 160px 150px";
const lstOptionalColumnKeys = ["outstandingAmount", "installmentAmount", "recoveryStartMonth", "perquisiteTax"] as const;
type OptionalColumnKey = (typeof lstOptionalColumnKeys)[number];

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

function formatLoanAdvanceStatusForSort(strStatus?: string | null) {
  return (strStatus || "").replaceAll("_", " ");
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

function LoanAdvanceGridSkeleton() {
  return (
    <Box
      data-controlid="loan-advance.list.skeleton"
      sx={{ border: "1px solid #e8eef5", borderRadius: "8px", overflow: "hidden", backgroundColor: "#fff" }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, px: 1.75, py: 1.25, flexWrap: "wrap" }}>
        <Skeleton variant="rounded" width={132} height={36} />
        <Box sx={{ display: "flex", gap: 1.25, alignItems: "center", flexWrap: "wrap" }}>
          <Skeleton variant="rounded" width={64} height={36} />
          <Skeleton variant="text" width={72} height={24} />
          <Skeleton variant="rounded" width={116} height={32} />
        </Box>
      </Box>
      <Box sx={{ minWidth: 1280 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: strLoanAdvanceSkeletonColumns, bgcolor: "#edf3f9", borderTop: "1px solid #e8eef5", borderBottom: "1px solid #d9e3ee" }}>
          {Array.from({ length: 8 }).map((_, intColumn) => (
            <Box key={intColumn} sx={{ px: 2, py: 1 }}>
              <Skeleton variant="text" width={intColumn === 7 ? 76 : 112} height={22} />
            </Box>
          ))}
        </Box>
        {Array.from({ length: intLoanAdvanceSkeletonRows }).map((_, intIndex) => (
          <Box key={intIndex} sx={{ display: "grid", gridTemplateColumns: strLoanAdvanceSkeletonColumns, borderBottom: "1px solid #edf1f6", minHeight: 40, alignItems: "center" }}>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="rounded" width={70} height={24} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${58 + (intIndex % 3) * 8}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="64%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${48 + (intIndex % 2) * 12}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="54%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="68%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="60%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="56%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="rounded" width={96} height={22} /></Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
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
  const [objMoreFiltersAnchor, setObjMoreFiltersAnchor] = useState<HTMLElement | null>(null);
  const [objColumnsAnchor, setObjColumnsAnchor] = useState<HTMLElement | null>(null);
  const [lstVisibleOptionalColumns, setLstVisibleOptionalColumns] = useState<OptionalColumnKey[]>([]);
  const [dicFilters, setDicFilters] = useState({
    employee_code: "",
    department: "",
    request_type: "All",
    category_id: "",
    status: "All",
    date_from: "",
    date_to: "",
  });
  const blnIsEssMode = strMode === "ess";
  const canLoanAction = (strAction: "view" | "create" | "edit") =>
    (blnIsEssMode ? dicEssActionAliases[strAction] : dicPayrollActionAliases[strAction]).some((strAlias) => canDoAny(strAlias));
  const blnCanView = blnHasMenuFallbackAccess || canViewAny() || canLoanAction("view");
  const blnCanCreate = canLoanAction("create");
  const blnCanEdit = canLoanAction("edit");
  const blnCanExport = canDoAny("export");
  const blnSearchPanelFrozen = blnLoading || blnRightsLoading || blnLoadingLabels;
  const intActiveMoreFilters = (dicFilters.date_from ? 1 : 0) + (dicFilters.date_to ? 1 : 0);

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
      setLstRows(await (blnIsEssMode ? loanAdvanceService.listEssLoans(dicNextFilters) : loanAdvanceService.listLoans(dicNextFilters)));
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

  function openLoan(strRecordUUID: string) {
    objRouter.push(blnIsEssMode ? `/ess/loans-advances/${strRecordUUID}` : `/payroll/loans-advances/${strRecordUUID}`);
  }

  const lstTableRows = useMemo(
    () =>
      lstRows.map((objRow) => ({
        id: objRow.intID,
        strRecordUUID: objRow.strRecordUUID,
        employeeName: (
          <Link
            className="app-master-first-column-link"
            component="button"
            type="button"
            underline="none"
            data-controlid="loan-advance.list.row.employee.link"
            data-row-key={String(objRow.intID)}
            onClick={(objEvent) => {
              objEvent.stopPropagation();
              if (blnSearchPanelFrozen || (!blnCanEdit && !blnCanView)) return;
              objRouter.push(blnIsEssMode ? `/ess/loans-advances/${objRow.strRecordUUID}` : `/payroll/loans-advances/${objRow.strRecordUUID}`);
            }}
          >
            {getEmployeeName(objRow)}
          </Link>
        ),
        employeeNameSortValue: getEmployeeName(objRow),
        employeeCode: <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{objRow.objEmployee?.strEmployeeCode || "-"}</Typography>,
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
        statusSortValue: formatLoanAdvanceStatusForSort(objRow.strWorkflowStatus),
      })),
    [blnCanEdit, blnCanView, blnIsEssMode, blnSearchPanelFrozen, lstRows, objRouter, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => {
      const lstBaseColumns: CommonTableColumn<(typeof lstTableRows)[number]>[] = [
      { field: "employeeName", headerName: t("table_employee_name", "Employee Name"), width: 170, sortAccessor: (dicRow) => dicRow.employeeNameSortValue },
      { field: "employeeCode", headerName: t("table_employee_code", "Employee Code"), width: 130, sortable: false },
      { field: "department", headerName: t("table_department", "Department"), width: 180 },
      { field: "requestType", headerName: t("table_request_type", "Request Type"), width: 150 },
      { field: "category", headerName: t("table_category", "Category"), width: 180 },
      { field: "requestedAmount", headerName: t("table_requested_amount", "Requested Amount"), align: "right", width: 160, sortAccessor: (dicRow) => dicRow.requestedAmountSortValue },
      { field: "approvedAmount", headerName: t("table_approved_amount", "Approved Amount"), align: "right", width: 160, sortAccessor: (dicRow) => dicRow.approvedAmountSortValue },
      { field: "status", headerName: t("table_status", "Status"), filterable: false, width: 150, sortAccessor: (dicRow) => dicRow.statusSortValue },
      ];
      const lstOptionalColumns: CommonTableColumn<(typeof lstTableRows)[number]>[] = [];
      if (lstVisibleOptionalColumns.includes("outstandingAmount")) {
        lstOptionalColumns.push({ field: "outstandingAmount", headerName: t("table_outstanding_amount", "Outstanding Amount"), align: "right", width: 170, sortAccessor: (dicRow) => dicRow.outstandingAmountSortValue });
      }
      if (lstVisibleOptionalColumns.includes("installmentAmount")) {
        lstOptionalColumns.push({ field: "installmentAmount", headerName: t("table_installment", "Installment"), align: "right", width: 140, sortAccessor: (dicRow) => dicRow.installmentAmountSortValue });
      }
      if (lstVisibleOptionalColumns.includes("recoveryStartMonth")) {
        lstOptionalColumns.push({ field: "recoveryStartMonth", headerName: t("table_recovery_start_month", "Recovery Start Month"), width: 170 });
      }
      if (lstVisibleOptionalColumns.includes("perquisiteTax")) {
        lstOptionalColumns.push({ field: "perquisiteTax", headerName: t("table_perquisite_tax", "Perquisite Tax"), width: 140 });
      }
      return [...lstBaseColumns, ...lstOptionalColumns];
    },
    [lstTableRows, lstVisibleOptionalColumns, t]
  );
  const dicOptionalColumnLabels: Record<OptionalColumnKey, string> = {
    outstandingAmount: t("table_outstanding_amount", "Outstanding Amount"),
    installmentAmount: t("table_installment", "Installment"),
    recoveryStartMonth: t("table_recovery_start_month", "Recovery Start Month"),
    perquisiteTax: t("table_perquisite_tax", "Perquisite Tax"),
  };

  function clearFilters() {
    const dicReset = { employee_code: "", department: "", request_type: "All", category_id: "", status: "All", date_from: "", date_to: "" };
    setDicFilters(dicReset);
    void loadRows(dicReset);
  }

  function applyFilters() {
    void loadRows();
  }

  function cancelMoreFilters() {
    setObjMoreFiltersAnchor(null);
  }

  function toggleOptionalColumn(strColumnKey: OptionalColumnKey) {
    setLstVisibleOptionalColumns((lstPrevious) => (
      lstPrevious.includes(strColumnKey)
        ? lstPrevious.filter((strKey) => strKey !== strColumnKey)
        : [...lstPrevious, strColumnKey]
    ));
  }

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
    <Box
      className={`${styles.searchRow} ${styles.loanAdvanceSearchRow}`}
      aria-busy={blnSearchPanelFrozen}
      sx={{
        alignItems: "center",
        "& .MuiButton-root": { alignSelf: "center", whiteSpace: "nowrap" },
        "& .MuiOutlinedInput-root": { borderRadius: "6px", backgroundColor: "#fff" },
      }}
    >
      <Autocomplete
        fullWidth
        size="small"
        options={lstEmployeeOptions}
        value={lstEmployeeOptions.find((objEmployee) => objEmployee.strEmployeeCode === dicFilters.employee_code) || null}
        getOptionLabel={(objOption) => getEmployeeLabel(objOption)}
        isOptionEqualToValue={(objOption, objValue) => objOption.strEmployeeCode === objValue.strEmployeeCode}
        onChange={(_, objValue) => setDicFilters((d) => ({ ...d, employee_code: objValue?.strEmployeeCode || "" }))}
        slotProps={{ popper: { sx: { zIndex: 1802 } } }}
        disabled={blnSearchPanelFrozen}
        renderInput={(params) => <TextField {...params} className="app-mui-text-field" label={t("filter_employee", "Employee")} placeholder={t("search_employee", "Search employee...")}
          InputProps={{ ...params.InputProps, startAdornment: (<><SearchRoundedIcon fontSize="small" sx={{ color: "#94a3b8", ml: 0.5, mr: -0.5 }} />{params.InputProps.startAdornment}</>) }} />}
      />
      <Autocomplete
        fullWidth
        size="small"
        options={lstDepartmentOptions}
        value={dicFilters.department || null}
        onChange={(_, strValue) => setDicFilters((d) => ({ ...d, department: strValue || "" }))}
        slotProps={{ popper: { sx: { zIndex: 1802 } } }}
        disabled={blnSearchPanelFrozen}
        renderInput={(params) => <TextField {...params} className="app-mui-text-field" label={t("filter_department", "Department")} placeholder="Search department..."
          InputProps={{ ...params.InputProps, startAdornment: (<><SearchRoundedIcon fontSize="small" sx={{ color: "#94a3b8", ml: 0.5, mr: -0.5 }} />{params.InputProps.startAdornment}</>) }} />}
      />
      <TextField className="app-mui-text-field" fullWidth select size="small" label={t("filter_request_type", "Request Type")} value={dicFilters.request_type} onChange={(e) => setDicFilters((d) => ({ ...d, request_type: e.target.value }))} disabled={blnSearchPanelFrozen} SelectProps={{ MenuProps: objSelectMenuProps }}>
        {["All", "loan", "advance"].map((strValue) => <MenuItem key={strValue} value={strValue}>{strValue === "All" ? t("all", "All") : t(`type_${strValue}`, strValue)}</MenuItem>)}
      </TextField>
      <Autocomplete
        fullWidth
        size="small"
        options={lstCategories}
        value={lstCategories.find((objCategory) => String(objCategory.intID) === dicFilters.category_id) || null}
        getOptionLabel={(objOption) => t(toLabelKey(objOption.strCategoryName), objOption.strCategoryName)}
        isOptionEqualToValue={(objOption, objValue) => objOption.intID === objValue.intID}
        onChange={(_, objValue) => setDicFilters((d) => ({ ...d, category_id: objValue ? String(objValue.intID) : "" }))}
        slotProps={{ popper: { sx: { zIndex: 1802 } } }}
        disabled={blnSearchPanelFrozen}
        renderInput={(params) => <TextField {...params} className="app-mui-text-field" label={t("filter_category", "Category")} placeholder={t("all", "All")}
          InputProps={{ ...params.InputProps, startAdornment: (<><SearchRoundedIcon fontSize="small" sx={{ color: "#94a3b8", ml: 0.5, mr: -0.5 }} />{params.InputProps.startAdornment}</>) }} />}
      />
      <Autocomplete
        fullWidth
        size="small"
        options={lstStatuses}
        value={dicFilters.status}
        getOptionLabel={(strStatus) => strStatus === "All" ? t("all", "All") : t(`status_${strStatus}`, strStatus.replaceAll("_", " "))}
        onChange={(_, strValue) => setDicFilters((d) => ({ ...d, status: strValue || "All" }))}
        slotProps={{ popper: { sx: { zIndex: 1802 } } }}
        disabled={blnSearchPanelFrozen}
        renderInput={(params) => <TextField {...params} className="app-mui-text-field" label={t("filter_status", "Status")} placeholder={t("all", "All")}
          InputProps={{ ...params.InputProps, startAdornment: (<><SearchRoundedIcon fontSize="small" sx={{ color: "#94a3b8", ml: 0.5, mr: -0.5 }} />{params.InputProps.startAdornment}</>) }} />}
      />
      <Button className={`${styles.secondaryButton} ${styles.loanAdvanceFilterButton}`} startIcon={<FilterAltOutlinedIcon />} onClick={(objEvent) => setObjMoreFiltersAnchor(objEvent.currentTarget)} disabled={blnSearchPanelFrozen}>
        {t("more_filters", "More filters")}{intActiveMoreFilters > 0 ? ` (${intActiveMoreFilters})` : ""}
      </Button>
      <Box className={styles.searchActions}>
        <Button className={`${styles.primaryButton} ${styles.loanAdvanceFilterButton}`} startIcon={<SearchRoundedIcon />} onClick={applyFilters} disabled={blnSearchPanelFrozen}>{t("search", "Search")}</Button>
      </Box>
      <Box className={styles.searchActions}>
        <Button className={`${styles.secondaryButton} ${styles.loanAdvanceFilterButton}`} startIcon={<ClearRoundedIcon />} onClick={clearFilters} disabled={blnSearchPanelFrozen}>{t("clear", "Clear")}</Button>
      </Box>
    </Box>
  );

  return (
    <Box className={styles.page}>
      <Breadcrumbs className="app-breadcrumbs" aria-label="breadcrumb" separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />}>
        <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>{blnIsEssMode ? t("breadcrumb_ess", "ESS") : t("breadcrumb_loan_management", "Loan Management")}</Typography>
        <Typography component="h1" className="app-breadcrumb-heading" aria-current="page">{blnIsEssMode ? t("ess_page_title", "My Loans & Advances") : t("page_title", "Loans & Advances")}</Typography>
      </Breadcrumbs>
      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none", overflowX: "auto" }}>
        {objFilters}
        <Popover
          open={Boolean(objMoreFiltersAnchor)}
          anchorEl={objMoreFiltersAnchor}
          onClose={cancelMoreFilters}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{ paper: { sx: { mt: 1, p: 2, width: 340, borderRadius: "10px" } } }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
            <Typography sx={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{t("more_filters", "More Filters")}</Typography>
            <IconButton aria-label={t("close", "Close")} onClick={cancelMoreFilters} size="small" sx={{ color: "#94a3b8" }}><CloseRoundedIcon fontSize="small" /></IconButton>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.5 }}>
            <TextField className="app-mui-text-field" fullWidth size="small" type="date" label={t("filter_date_from", "From Date")} InputLabelProps={{ shrink: true }} value={dicFilters.date_from} onChange={(e) => setDicFilters((d) => ({ ...d, date_from: e.target.value }))} />
            <TextField className="app-mui-text-field" fullWidth size="small" type="date" label={t("filter_date_to", "To Date")} InputLabelProps={{ shrink: true }} value={dicFilters.date_to} onChange={(e) => setDicFilters((d) => ({ ...d, date_to: e.target.value }))} />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 2 }}>
            <Link component="button" type="button" underline="hover" onClick={() => setDicFilters((d) => ({ ...d, date_from: "", date_to: "" }))} sx={{ fontSize: "12px", fontWeight: 600 }}>{t("clear_all", "Clear all")}</Link>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button className={styles.secondaryButton} onClick={cancelMoreFilters}>{t("cancel", "Cancel")}</Button>
              <Button className={styles.primaryButton} onClick={() => { setObjMoreFiltersAnchor(null); applyFilters(); }}>{t("apply", "Apply")}</Button>
            </Box>
          </Box>
        </Popover>
      </Box>
      {strRightsError || strLabelError ? <Alert severity="warning">{strRightsError || strLabelError}</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {!blnCanView && !blnRightsLoading ? <Alert severity="warning">{blnIsEssMode ? t("ess_no_access", "ESS loans and advances access is not available for your user group.") : t("no_access", "Loans and advances access is not available for your user group.")}</Alert> : null}
      <Box className={styles.tableCard} sx={{ p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {blnLoading || blnRightsLoading || blnLoadingLabels ? (
          <LoanAdvanceGridSkeleton />
        ) : !blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{blnIsEssMode ? t("ess_no_access", "ESS loans and advances access is not available for your user group.") : t("no_access", "Loans and advances access is not available for your user group.")}</Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName={blnIsEssMode ? "ess-loans-advances" : "payroll-loans-advances"}
            showExportOptions={blnCanExport}
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
            toolbarAfterExport={(
              <>
                <Button
                  id="loan-advance-add-columns-button"
                  className={styles.secondaryButton}
                  startIcon={<ViewColumnRoundedIcon />}
                  onClick={(objEvent) => setObjColumnsAnchor(objEvent.currentTarget)}
                >
                  {t("add_columns", "Add columns")}
                </Button>
                <Menu
                  id="loan-advance-add-columns-menu"
                  anchorEl={objColumnsAnchor}
                  open={Boolean(objColumnsAnchor)}
                  onClose={() => setObjColumnsAnchor(null)}
                  MenuListProps={{ "aria-labelledby": "loan-advance-add-columns-button" }}
                >
                  {lstOptionalColumnKeys.map((strColumnKey) => (
                    <MenuItem key={strColumnKey} onClick={() => toggleOptionalColumn(strColumnKey)}>
                      <Checkbox size="small" checked={lstVisibleOptionalColumns.includes(strColumnKey)} sx={{ p: 0.5, mr: 1 }} />
                      {dicOptionalColumnLabels[strColumnKey]}
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )}
            onRowClick={(dicRow) => {
              if (blnSearchPanelFrozen || (!blnCanEdit && !blnCanView)) return;
              objRouter.push(blnIsEssMode ? `/ess/loans-advances/${dicRow.strRecordUUID}` : `/payroll/loans-advances/${dicRow.strRecordUUID}`);
            }}
            hideRowClickHint
            getRowSx={() => ({
              backgroundColor: "#fff",
              "&.MuiTableRow-hover:hover": { backgroundColor: "#f8fbff", cursor: blnCanEdit || blnCanView ? "pointer" : "default" },
            })}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        )}
      </Box>
    </Box>
  );
}
