"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Autocomplete, Box, Button, InputAdornment, Link, MenuItem, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { MenuItem as AuthMenuItem } from "@/models/AuthModels";

import CommonSearchableSelect from "@/Common/components/CommonSearchableSelect";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { MasterBreadcrumbs, MasterGridSkeleton, MasterMoreFilters, dicMasterRowSx, onSearchEnter } from "@/components/master/MasterListUi";
import masterStyles from "@/components/master/MasterScreen.module.css";
import LoanAdvanceStatusBadge from "@/features/payroll/components/LoanAdvanceStatusBadge";
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
  });
  // Last filters sent to the server; "More filters" > Cancel restores its fields from here.
  const [dicAppliedFilters, setDicAppliedFilters] = useState(dicFilters);
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
    setDicAppliedFilters(dicNextFilters);
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
        employeeNameSort: getEmployeeName(objRow),
        employeeName: (
          <Link
            className="app-master-first-column-link"
            component="button"
            type="button"
            underline="none"
            data-controlid="loan-advance.list.row.employee-name.link"
            data-row-key={String(objRow.intID)}
            onClick={(objEvent) => { objEvent.stopPropagation(); openLoan(objRow.strRecordUUID); }}
          >
            {getEmployeeName(objRow)}
          </Link>
        ),
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
      })),
    [blnIsEssMode, lstRows, objRouter, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "employeeName", headerName: t("table_employee_name", "Employee Name"), width: 170, sortAccessor: (dicRow) => dicRow.employeeNameSort },
      { field: "employeeCode", headerName: t("table_employee_code", "Employee Code"), width: 130, sortable: false },
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

  const blnBusy = blnLoading || blnRightsLoading || blnLoadingLabels;
  const intActiveMoreFilters = (dicFilters.category_id ? 1 : 0) + (dicFilters.date_from ? 1 : 0) + (dicFilters.date_to ? 1 : 0);

  function clearFilters() {
    const dicReset = { employee_code: "", department: "", request_type: "All", category_id: "", status: "All", date_from: "", date_to: "" };
    setDicFilters(dicReset);
    void loadRows(dicReset);
  }

  function applySearch() {
    if (blnBusy) return;
    void loadRows();
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

  const dicSearchAdornment = <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment>;

  return (
    <Box className={masterStyles.page}>
      <MasterBreadcrumbs
        strSection={blnIsEssMode ? t("breadcrumb_section_ess", "Employee Services") : t("breadcrumb_section", "Payroll")}
        strTitle={blnIsEssMode ? t("breadcrumb_title_ess", "My Loans & Advances") : t("breadcrumb_title", "Loans & Advances")}
      />

      <Box className={masterStyles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Box
          className={masterStyles.searchRow}
          aria-busy={blnBusy}
          onKeyDown={onSearchEnter(applySearch)}
          sx={{
            alignItems: "center",
            "&&": { gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "minmax(200px, 1.3fr) minmax(160px, 1fr) minmax(140px, 0.8fr) minmax(150px, 0.9fr) max-content max-content max-content" } },
            "& .MuiButton-root": { alignSelf: "center", whiteSpace: "nowrap" },
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
            disabled={blnBusy}
            slotProps={{ popper: { sx: { zIndex: 1802 } } }}
            renderInput={(params) => <TextField {...params} className="app-mui-text-field" size="small" label={t("filter_employee", "Employee")} placeholder={t("search_employee", "Search employee...")}
              InputProps={{ ...params.InputProps, startAdornment: (<>{dicSearchAdornment}{params.InputProps.startAdornment}</>) }} />}
          />
          <Autocomplete
            fullWidth
            size="small"
            options={lstDepartmentOptions}
            value={dicFilters.department || null}
            onChange={(_, strValue) => setDicFilters((d) => ({ ...d, department: strValue || "" }))}
            disabled={blnBusy}
            slotProps={{ popper: { sx: { zIndex: 1802 } } }}
            renderInput={(params) => <TextField {...params} className="app-mui-text-field" size="small" label={t("filter_department", "Department")} placeholder="Search department..."
              InputProps={{ ...params.InputProps, startAdornment: (<>{dicSearchAdornment}{params.InputProps.startAdornment}</>) }} />}
          />
          <TextField className="app-mui-text-field" fullWidth select size="small" label={t("filter_request_type", "Request Type")} value={dicFilters.request_type} onChange={(e) => setDicFilters((d) => ({ ...d, request_type: e.target.value }))} disabled={blnBusy} SelectProps={{ MenuProps: objSelectMenuProps }}>
            {["All", "loan", "advance"].map((strValue) => <MenuItem key={strValue} value={strValue}>{strValue === "All" ? t("all", "All") : t(`type_${strValue}`, strValue)}</MenuItem>)}
          </TextField>
          <CommonSearchableSelect
            className="app-mui-text-field"
            fullWidth
            size="small"
            disabled={blnBusy}
            label={t("filter_status", "Status")}
            value={dicFilters.status}
            options={lstStatuses.map((strStatus) => ({ intID: strStatus, strLabel: strStatus === "All" ? t("all", "All") : t(`status_${strStatus}`, strStatus.replaceAll("_", " ")) }))}
            onChange={(strValue) => setDicFilters((d) => ({ ...d, status: strValue || "All" }))}
          />
          <MasterMoreFilters
            strControlPrefix="loan-advance.list"
            intActiveCount={intActiveMoreFilters}
            blnDisabled={blnBusy}
            onApply={applySearch}
            onClearAll={() => setDicFilters((d) => ({ ...d, category_id: "", date_from: "", date_to: "" }))}
            onCancel={() => setDicFilters((d) => ({ ...d, category_id: dicAppliedFilters.category_id, date_from: dicAppliedFilters.date_from, date_to: dicAppliedFilters.date_to }))}
          >
            <CommonSearchableSelect
              className="app-mui-text-field"
              fullWidth
              size="small"
              label={t("filter_category", "Category")}
              value={dicFilters.category_id ? Number(dicFilters.category_id) : ""}
              options={lstCategories.map((objCategory) => ({ intID: objCategory.intID, strLabel: t(toLabelKey(objCategory.strCategoryName), objCategory.strCategoryName) }))}
              onChange={(intValue) => setDicFilters((d) => ({ ...d, category_id: intValue === "" ? "" : String(intValue) }))}
              placeholder={t("all_categories", "All categories")}
            />
            <TextField className="app-mui-text-field" fullWidth size="small" type="date" label={t("filter_date_from", "Date From")} InputLabelProps={{ shrink: true }} value={dicFilters.date_from} onChange={(e) => setDicFilters((d) => ({ ...d, date_from: e.target.value }))} />
            <TextField className="app-mui-text-field" fullWidth size="small" type="date" label={t("filter_date_to", "Date To")} InputLabelProps={{ shrink: true }} value={dicFilters.date_to} onChange={(e) => setDicFilters((d) => ({ ...d, date_to: e.target.value }))} />
          </MasterMoreFilters>
          <Box className={masterStyles.searchActions}>
            <Button className={masterStyles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={applySearch} disabled={blnBusy}>{t("search", "Search")}</Button>
          </Box>
          <Box className={masterStyles.searchActions}>
            <Button className={masterStyles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearFilters} disabled={blnBusy}>{t("clear", "Clear")}</Button>
          </Box>
        </Box>
      </Box>
      {strRightsError || strLabelError ? <Alert severity="warning">{strRightsError || strLabelError}</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {!blnCanView && !blnRightsLoading ? <Alert severity="warning">{blnIsEssMode ? t("ess_no_access", "ESS loans and advances access is not available for your user group.") : t("no_access", "Loans and advances access is not available for your user group.")}</Alert> : null}
      {blnBusy ? (
        <Box className={masterStyles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
          <MasterGridSkeleton strControlId="loan-advance.list.skeleton" intColumns={9} />
        </Box>
      ) : blnCanView ? (
        <Box className={masterStyles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
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
                className={masterStyles.primaryButton}
                startIcon={<AddRoundedIcon />}
                onClick={() => objRouter.push(blnIsEssMode ? "/ess/loans-advances/new" : "/payroll/loans-advances/new")}
              >
                {t("add_button", "New Request")}
              </Button>
            ) : undefined}
            onRowClick={(dicRow) => openLoan(dicRow.strRecordUUID)}
            minTableWidth={1700}
            hideRowClickHint
            getRowSx={() => dicMasterRowSx}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        </Box>
      ) : null}
    </Box>
  );
}
