"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, InputAdornment, Link, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { MasterAddColumnsControl, MasterBreadcrumbs, MasterGridSkeleton, MasterMoreFilters, dicMasterRowSx, onSearchEnter, type MasterOptionalColumn } from "@/components/master/MasterListUi";
import styles from "@/components/master/MasterScreen.module.css";
import { employeeService } from "@/features/employee/services/employeeService";
import type { EmployeeFormOptions, EmployeeListRecord, EmployeeLookupOption } from "@/features/employee/types";
import ReimbursementStatusBadge from "@/features/reimbursements/components/ReimbursementStatusBadge";
import { formatCurrency, formatDateLabel, formatStatusLabel } from "@/features/reimbursements/formatters";
import { claimHasProofPending } from "@/features/reimbursements/hrRules";
import { canEditReimbursementClaim } from "@/features/reimbursements/rules";
import { createInitialPayrollReimbursementFilters, payrollReimbursementService, type PayrollReimbursementFilters } from "@/features/reimbursements/services/payrollReimbursementService";
import type { ReimbursementClaimDto } from "@/features/reimbursements/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

const lstClaimStatuses = ["submitted", "resubmitted", "under_review", "approved", "partially_approved", "rejected", "released", "locked", "pushed_to_payroll", "paid"];
const lstReimbursementReviewModuleCodes = ["REIMBURSEMENT_REVIEW", "REIMBURSEMENTS_REVIEW", "PAYROLL_REIMBURSEMENT", "PAYROLL_REIMBURSEMENTS"];
const lstEssReimbursementModuleCodes = ["ESS_REIMBURSEMENT", "ESS_REIMBURSEMENTS", "REIMBURSEMENT", "REIMBURSEMENTS"];
const lstCreateEssReimbursementModuleCodes = [...lstEssReimbursementModuleCodes, ...lstReimbursementReviewModuleCodes];
type OptionalColumnKey = "department" | "location" | "paymentStatus";
const lstOptionalColumns: MasterOptionalColumn<OptionalColumnKey>[] = [
  { strKey: "department", strLabel: "Department" },
  { strKey: "location", strLabel: "Location" },
  { strKey: "paymentStatus", strLabel: "Payment Status" },
];
type FilterOption = {
  strValue: string;
  strLabel: string;
};

const objEmptyEmployeeOptions: EmployeeFormOptions = {
  lstEmploymentTypes: [],
  lstDepartments: [],
  lstDesignations: [],
  lstGrades: [],
  lstCostCenters: [],
  lstLocations: [],
  lstPayrollGroups: [],
  lstLanguages: [],
  lstCountries: [],
  lstStates: [],
  lstBanks: [],
  lstManagers: [],
  lstTitles: [],
  lstGenders: [],
  lstEmploymentStatuses: [],
  lstAddressTypes: [],
  lstTaxRegimeCodes: [],
  lstMotherTongues: [],
  lstNationalities: [],
  lstBloodGroups: [],
  lstReligions: [],
  lstMaritalStatuses: [],
  lstEntryModes: [],
  lstJobTypes: [],
  lstConfirmationTypes: [],
  lstRestDays: [],
  lstEmployeeFunctions: [],
  lstEmployeeCategories: [],
  lstPaymentTypes: [],
  lstBankAccountTypes: [],
};

function getErrorMessage(objError: unknown) {
  return objError instanceof Error ? objError.message : "Unable to load reimbursement review queue.";
}

function normalizeFilterValue(strValue?: string | number | null) {
  return String(strValue ?? "").trim();
}

function getClaimReferenceNumber(objClaim: ReimbursementClaimDto) {
  return normalizeFilterValue(objClaim.strClaimNumber || objClaim.strClaimCode);
}

function createUniqueOptions(lstOptions: FilterOption[]) {
  const mapOptions = new Map<string, FilterOption>();
  lstOptions.forEach((objOption) => {
    const strValue = normalizeFilterValue(objOption.strValue);
    const strLabel = normalizeFilterValue(objOption.strLabel);
    if (strValue && !mapOptions.has(strValue)) {
      mapOptions.set(strValue, { strValue, strLabel: strLabel || strValue });
    }
  });
  return Array.from(mapOptions.values()).sort((objLeft, objRight) => objLeft.strLabel.localeCompare(objRight.strLabel));
}

function toLookupOptions(lstOptions: EmployeeLookupOption[]) {
  return createUniqueOptions(lstOptions.map((objOption) => ({
    strValue: objOption.strLabel,
    strLabel: objOption.strCode ? `${objOption.strLabel} (${objOption.strCode})` : objOption.strLabel,
  })));
}

function getEmployeeLabel(objClaim: ReimbursementClaimDto, mapEmployees: Map<number, EmployeeListRecord>) {
  const objEmployee = objClaim.intEmployeeID ? mapEmployees.get(objClaim.intEmployeeID) : undefined;
  const strEmployeeName = normalizeFilterValue(objClaim.strEmployeeName || objEmployee?.strFullName);
  const strEmployeeCode = normalizeFilterValue(objClaim.strEmployeeCode || objEmployee?.strEmployeeCode);
  if (strEmployeeName && strEmployeeCode) {
    return `${strEmployeeName} (${strEmployeeCode})`;
  }
  return strEmployeeName || strEmployeeCode || (objClaim.intEmployeeID ? `Employee #${objClaim.intEmployeeID}` : "");
}

function getClaimDepartmentName(objClaim: ReimbursementClaimDto, mapEmployees: Map<number, EmployeeListRecord>) {
  return normalizeFilterValue(objClaim.strDepartmentName || (objClaim.intEmployeeID ? mapEmployees.get(objClaim.intEmployeeID)?.strDepartmentName : ""));
}

function getClaimLocationName(objClaim: ReimbursementClaimDto, mapEmployees: Map<number, EmployeeListRecord>) {
  return normalizeFilterValue(objClaim.strLocationName || (objClaim.intEmployeeID ? mapEmployees.get(objClaim.intEmployeeID)?.strLocationName : ""));
}

// Filters that live in the "More filters" popover; Cancel/Clear all only touch these.
const lstMoreFilterKeys = ["strClaimMonth", "strProofPending", "strPayrollStatus", "strDepartment", "strLocation"] as const;

function restoreMoreFilters(dicCurrent: PayrollReimbursementFilters, dicSource: PayrollReimbursementFilters): PayrollReimbursementFilters {
  const dicNext = { ...dicCurrent };
  lstMoreFilterKeys.forEach((strKey) => {
    dicNext[strKey] = dicSource[strKey];
  });
  return dicNext;
}

const nodeSearchAdornment = <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment>;

function getPaymentStatusLabel(objClaim: ReimbursementClaimDto) {
  if (objClaim.strSettlementMode === "finance") {
    return ["paid", "settled"].includes(objClaim.strFinanceStatus || "") ? "Finance Settled" : "Finance Pending";
  }
  return ["locked", "pushed_to_payroll", "paid"].includes(objClaim.strClaimStatus) ? "In payroll" : "-";
}

export default function ReimbursementReviewListPage() {
  const objRouter = useRouter();
  const strPathname = usePathname();
  const objSearchParams = useSearchParams();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstReimbursementReviewModuleCodes);
  const { blnLoading: blnCreateRightsLoading, canDoAny: canCreateEssAny } = useModuleActionAccess(lstCreateEssReimbursementModuleCodes);
  const { blnLoading: blnEssRightsLoading, objRights: objEssRights, canDoAny: canDoEssAny, canViewAny: canViewEssAny } = useModuleActionAccess(lstEssReimbursementModuleCodes);
  const [dicFilters, setDicFilters] = useState<PayrollReimbursementFilters>(createInitialPayrollReimbursementFilters());
  const [lstClaims, setLstClaims] = useState<ReimbursementClaimDto[]>([]);
  const [lstEmployees, setLstEmployees] = useState<EmployeeListRecord[]>([]);
  const [objEmployeeOptions, setObjEmployeeOptions] = useState<EmployeeFormOptions>(objEmptyEmployeeOptions);
  const [blnCreateDialogOpen, setBlnCreateDialogOpen] = useState(false);
  const [strCreateEmployeeID, setStrCreateEmployeeID] = useState("");
  const [strCreateError, setStrCreateError] = useState("");
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [lstVisibleOptionalColumns, setLstVisibleOptionalColumns] = useState<OptionalColumnKey[]>([]);
  const [dicMoreFiltersSnapshot, setDicMoreFiltersSnapshot] = useState<PayrollReimbursementFilters | null>(null);
  const blnEmployeeReimbursementContext =
    strPathname?.toLowerCase() === "/payroll/employee-reimbursement" ||
    objSearchParams.get("source") === "employee-reimbursement";
  const blnCanView = canViewAny() || canDoAny("list") || canDoAny("review");
  const blnBusy = blnLoading || blnRightsLoading || blnCreateRightsLoading || blnEssRightsLoading;
  const blnCanCreateEssReimbursement = canCreateEssAny("create") || canCreateEssAny("add") || canCreateEssAny("ess_reimbursement_create");
  function hasEssPermissionCode(strPermissionCode: string) {
    const strNormalizedPermissionCode = strPermissionCode.trim().toLowerCase();
    return Object.entries(objEssRights.dicAllowedActions || {}).some(([strModuleCode, lstActions]) =>
      strModuleCode.trim().toLowerCase() === strNormalizedPermissionCode ||
      lstActions.some((strActionCode) => strActionCode.trim().toLowerCase() === strNormalizedPermissionCode),
    );
  }

  const blnCanViewEssReimbursement = canViewEssAny() || canDoEssAny("list") || canDoEssAny("view") || canDoEssAny("ess_reimbursement_view") || hasEssPermissionCode("ESS_REIMBURSEMENT_VIEW");
  const blnCanEditEssReimbursement = canDoEssAny("edit") || canDoEssAny("ess_reimbursement_edit") || hasEssPermissionCode("ESS_REIMBURSEMENT_EDIT");

  async function loadClaims(dicNextFilters = dicFilters) {
    if (!blnCanView) {
      setLstClaims([]);
      setBlnLoading(false);
      return;
    }

    // Purpose: Loads the HR reimbursement queue using API-backed filters, then applies UI-only filters locally.
    setBlnLoading(true);
    setStrError("");
    try {
      setLstClaims(await payrollReimbursementService.listClaims(dicNextFilters));
    } catch (objError) {
      setStrError(getErrorMessage(objError));
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }

    void loadClaims();
  }, [blnRightsLoading, blnCanView]);

  useEffect(() => {
    if (blnRightsLoading || !blnCanView) {
      return;
    }

    Promise.all([
      employeeService.getEmployees().catch(() => []),
      employeeService.getFormOptions().catch(() => objEmptyEmployeeOptions),
    ]).then(([lstEmployeeRecords, objFormOptions]) => {
      setLstEmployees(lstEmployeeRecords);
      setObjEmployeeOptions(objFormOptions);
    });
  }, [blnRightsLoading, blnCanView]);

  const mapEmployees = useMemo(() => new Map(lstEmployees.map((objEmployee) => [objEmployee.intID, objEmployee])), [lstEmployees]);

  const lstEmployeeOptions = useMemo(
    () => createUniqueOptions(lstEmployees.filter((objEmployee) => !objEmployee.blnIsPartialSave).map((objEmployee) => ({
      strValue: String(objEmployee.intID),
      strLabel: objEmployee.strEmployeeCode ? `${objEmployee.strFullName} (${objEmployee.strEmployeeCode})` : objEmployee.strFullName,
    }))),
    [lstEmployees]
  );

  const lstClaimOptions = useMemo(
    () => createUniqueOptions(lstClaims.map((objClaim) => {
      const strClaimCode = getClaimReferenceNumber(objClaim);
      const strClaimTitle = normalizeFilterValue(objClaim.strClaimTitle);
      return {
        strValue: strClaimCode,
        strLabel: strClaimTitle ? `${strClaimCode} - ${strClaimTitle}` : strClaimCode,
      };
    })),
    [lstClaims]
  );

  const lstDepartmentOptions = useMemo(
    () => toLookupOptions(objEmployeeOptions.lstDepartments),
    [objEmployeeOptions.lstDepartments]
  );

  const lstLocationOptions = useMemo(
    () => toLookupOptions(objEmployeeOptions.lstLocations),
    [objEmployeeOptions.lstLocations]
  );

  const lstFilteredClaims = useMemo(() => {
    const strSearch = dicFilters.strSearchText.trim().toLowerCase();
    return lstClaims.filter((objClaim) => {
      const blnNotDraft = objClaim.strClaimStatus !== "draft";
      const blnSearchMatch = !strSearch || [objClaim.strClaimNumber, objClaim.strClaimCode, objClaim.strClaimTitle, objClaim.strEmployeeCode, objClaim.strEmployeeName, objClaim.strEmployeeRemarks, objClaim.strReviewerRemarks].some((strValue) => (strValue || "").toLowerCase().includes(strSearch));
      const blnMonthMatch = !dicFilters.strClaimMonth || (objClaim.dtClaimDate || "").startsWith(dicFilters.strClaimMonth);
      const blnProofMatch = !dicFilters.strProofPending || (dicFilters.strProofPending === "yes" ? claimHasProofPending(objClaim) : !claimHasProofPending(objClaim));
      const blnPayrollMatch = !dicFilters.strPayrollStatus || (dicFilters.strPayrollStatus === "in_payroll" ? ["locked", "pushed_to_payroll", "paid"].includes(objClaim.strClaimStatus) : !["locked", "pushed_to_payroll", "paid"].includes(objClaim.strClaimStatus));
      const blnDepartmentMatch = !dicFilters.strDepartment || getClaimDepartmentName(objClaim, mapEmployees) === dicFilters.strDepartment;
      const blnLocationMatch = !dicFilters.strLocation || getClaimLocationName(objClaim, mapEmployees) === dicFilters.strLocation;
      return blnNotDraft && blnSearchMatch && blnMonthMatch && blnProofMatch && blnPayrollMatch && blnDepartmentMatch && blnLocationMatch;
    });
  }, [dicFilters, lstClaims, mapEmployees]);

  const lstTableRows = useMemo(
    () =>
      lstFilteredClaims.map((objClaim) => ({
        id: objClaim.intID,
        strClaimRoute: getClaimOpenRoute(objClaim),
        strClaimReference: (
          <Link
            className="app-master-first-column-link"
            component="button"
            type="button"
            underline="none"
            controlId="reimbursements.review-list.row.claim.link"
            data-row-key={objClaim.intID}
            onClick={(objEvent) => {
              objEvent.stopPropagation();
              openClaim(objClaim);
            }}
          >
            {getClaimReferenceNumber(objClaim) || "-"}
          </Link>
        ),
        strClaimReferenceSort: getClaimReferenceNumber(objClaim) || "",
        strClaimTitle: objClaim.strClaimTitle || "",
        strEmployee: getEmployeeLabel(objClaim, mapEmployees) || "-",
        dtClaimDate: formatDateLabel(objClaim.dtClaimDate),
        dtClaimDateSort: objClaim.dtClaimDate || "",
        strStatus: <ReimbursementStatusBadge strStatus={objClaim.strClaimStatus} />,
        strStatusSort: formatStatusLabel(objClaim.strClaimStatus),
        decClaimedAmount: formatCurrency(objClaim.decClaimedAmount),
        decClaimedAmountSort: Number(objClaim.decClaimedAmount ?? 0),
        decApprovedAmount: formatCurrency(objClaim.decApprovedAmount),
        decApprovedAmountSort: Number(objClaim.decApprovedAmount ?? 0),
        strDepartment: getClaimDepartmentName(objClaim, mapEmployees) || "-",
        strLocation: getClaimLocationName(objClaim, mapEmployees) || "-",
        strPaymentStatus: getPaymentStatusLabel(objClaim),
      })),
    [blnCanEditEssReimbursement, blnCanViewEssReimbursement, blnEmployeeReimbursementContext, lstFilteredClaims, mapEmployees, objRouter]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "strClaimReference", headerName: "Claim Ref #", filterable: false, width: 150, sortAccessor: (objRow) => String(objRow.strClaimReferenceSort) },
      { field: "strClaimTitle", headerName: "Claim Purpose", width: 220 },
      { field: "strEmployee", headerName: "Employee", width: 230 },
      { field: "dtClaimDate", headerName: "Claim Date", width: 140, sortAccessor: (objRow) => String(objRow.dtClaimDateSort) },
      { field: "strStatus", headerName: "Status", align: "left", filterable: false, width: 160, sortAccessor: (objRow) => String(objRow.strStatusSort) },
      {
        field: "decClaimedAmount",
        headerName: (
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "inherit" }}>Claimed Amount</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "12px" }}>(All amount in ₹)</Typography>
          </Box>
        ),
        align: "right",
        width: 170,
        sortAccessor: (objRow) => objRow.decClaimedAmountSort,
      },
      {
        field: "decApprovedAmount",
        headerName: (
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "inherit" }}>Approved Amount</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "12px" }}>(All amount in ₹)</Typography>
          </Box>
        ),
        align: "right",
        width: 180,
        sortAccessor: (objRow) => objRow.decApprovedAmountSort,
      },
      ...(lstVisibleOptionalColumns.includes("department") ? [{ field: "strDepartment", headerName: "Department", width: 170 } as CommonTableColumn<(typeof lstTableRows)[number]>] : []),
      ...(lstVisibleOptionalColumns.includes("location") ? [{ field: "strLocation", headerName: "Location", width: 170 } as CommonTableColumn<(typeof lstTableRows)[number]>] : []),
      ...(lstVisibleOptionalColumns.includes("paymentStatus") ? [{ field: "strPaymentStatus", headerName: "Payment Status", width: 160 } as CommonTableColumn<(typeof lstTableRows)[number]>] : []),
    ],
    [lstVisibleOptionalColumns]
  );

  function clearFilters() {
    const dicReset = createInitialPayrollReimbursementFilters();
    setDicFilters(dicReset);
    void loadClaims(dicReset);
  }

  function proceedToCreateForEmployee() {
    const intEmployeeID = Number(strCreateEmployeeID);
    const objEmployee = lstEmployees.find((objRecord) => objRecord.intID === intEmployeeID);
    if (!intEmployeeID || !objEmployee) {
      setStrCreateError("Select an employee before creating reimbursement.");
      return;
    }
    if (objEmployee.blnIsPartialSave) {
      setStrCreateError("Select a valid employee.");
      return;
    }
    const objParams = new URLSearchParams({ employee_id: objEmployee.strRecordUUID });
    if (blnEmployeeReimbursementContext) {
      objParams.set("source", "employee-reimbursement");
    }
    objRouter.push(`/ess/reimbursements/new?${objParams.toString()}`);
  }

  function getEssReimbursementRoute(objClaim: ReimbursementClaimDto, strMode: "view" | "edit") {
    const objParams = new URLSearchParams();
    // The claim carries only the internal employee id, so the loaded employee list supplies the
    // public one; a claim whose employee is not in that list simply omits the parameter.
    const strClaimEmployeeUUID = objClaim.intEmployeeID ? mapEmployees.get(objClaim.intEmployeeID)?.strRecordUUID : undefined;
    if (strClaimEmployeeUUID) {
      objParams.set("employee_id", strClaimEmployeeUUID);
    }
    if (blnEmployeeReimbursementContext) {
      objParams.set("source", "employee-reimbursement");
    }
    const strEmployeeQuery = objParams.toString() ? `?${objParams.toString()}` : "";
    return strMode === "edit"
      ? `/ess/reimbursements/${objClaim.intID}/edit${strEmployeeQuery}`
      : `/ess/reimbursements/${objClaim.intID}${strEmployeeQuery}`;
  }

  // Same rule as the Salary Component list: the link/row opens edit when the user may edit the
  // claim, otherwise view. In the HR review queue there is only the review detail page.
  function getClaimOpenRoute(objClaim: ReimbursementClaimDto) {
    if (!blnEmployeeReimbursementContext) {
      return `/payroll/reimbursements/${objClaim.strRecordUUID}`;
    }
    if (blnCanEditEssReimbursement && canEditReimbursementClaim(objClaim.strClaimStatus)) {
      return getEssReimbursementRoute(objClaim, "edit");
    }
    return blnCanViewEssReimbursement ? getEssReimbursementRoute(objClaim, "view") : "";
  }

  function openClaim(objClaim: ReimbursementClaimDto) {
    const strRoute = getClaimOpenRoute(objClaim);
    if (strRoute) {
      objRouter.push(strRoute);
    }
  }

  return (
    <Box className={styles.page} data-controlid="reimbursements.review-list.page">
      <MasterBreadcrumbs strSection="Employee Services" strTitle={blnEmployeeReimbursementContext ? "Employee Reimbursements" : "Review Reimbursements"} />
      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Box className={styles.compactSearchRow} aria-busy={blnBusy} onKeyDown={onSearchEnter(() => { if (!blnBusy) void loadClaims(); })}>
          <Autocomplete
            size="small"
            options={lstClaimOptions}
            value={lstClaimOptions.find((objOption) => objOption.strValue === dicFilters.strSearchText) ?? null}
            getOptionLabel={(objOption) => objOption.strLabel}
            isOptionEqualToValue={(objA, objB) => objA.strValue === objB.strValue}
            onChange={(_e, objOption) => setDicFilters({ ...dicFilters, strSearchText: objOption?.strValue ?? "" })}
            disabled={blnBusy}
            renderInput={(params) => <TextField {...params} className="app-mui-text-field" label="Claim search" placeholder="Search claims..." InputProps={{ ...params.InputProps, startAdornment: (<>{nodeSearchAdornment}{params.InputProps.startAdornment}</>) }} />}
          />
          <Autocomplete
            size="small"
            options={lstEmployeeOptions}
            value={lstEmployeeOptions.find((objOption) => objOption.strValue === dicFilters.intEmployeeID) ?? null}
            getOptionLabel={(objOption) => objOption.strLabel}
            isOptionEqualToValue={(objA, objB) => objA.strValue === objB.strValue}
            onChange={(_e, objOption) => setDicFilters({ ...dicFilters, intEmployeeID: objOption?.strValue ?? "" })}
            disabled={blnBusy}
            renderInput={(params) => <TextField {...params} className="app-mui-text-field" label="Employee" placeholder="Search employee..." InputProps={{ ...params.InputProps, startAdornment: (<>{nodeSearchAdornment}{params.InputProps.startAdornment}</>) }} />}
          />
          <TextField className="app-mui-text-field" select size="small" label="Status" value={dicFilters.strStatus} onChange={(objEvent) => setDicFilters({ ...dicFilters, strStatus: objEvent.target.value })} disabled={blnBusy} controlId="reimbursements.review-list.status.select">
            <MenuItem value="">All statuses</MenuItem>
            {lstClaimStatuses.map((strStatus) => <MenuItem key={strStatus} value={strStatus}>{strStatus.replaceAll("_", " ")}</MenuItem>)}
          </TextField>
          <MasterMoreFilters
            strControlPrefix="reimbursements.review-list"
            blnHasActiveFilters={lstMoreFilterKeys.some((strKey) => Boolean(dicFilters[strKey]))}
            blnDisabled={blnBusy}
            onOpen={() => setDicMoreFiltersSnapshot(dicFilters)}
            onCancel={() => {
              if (dicMoreFiltersSnapshot) setDicFilters(restoreMoreFilters(dicFilters, dicMoreFiltersSnapshot));
            }}
            onClearAll={() => setDicFilters(restoreMoreFilters(dicFilters, createInitialPayrollReimbursementFilters()))}
            onApply={() => void loadClaims()}
          >
            <TextField className="app-mui-text-field" fullWidth size="small" type="month" label="Claim month" InputLabelProps={{ shrink: true }} value={dicFilters.strClaimMonth} onChange={(objEvent) => setDicFilters({ ...dicFilters, strClaimMonth: objEvent.target.value })} disabled={blnBusy} />
            <TextField className="app-mui-text-field" fullWidth select size="small" label="Proof pending" value={dicFilters.strProofPending} onChange={(objEvent) => setDicFilters({ ...dicFilters, strProofPending: objEvent.target.value })} disabled={blnBusy}>
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </TextField>
            <TextField className="app-mui-text-field" fullWidth select size="small" label="Payroll status" value={dicFilters.strPayrollStatus} onChange={(objEvent) => setDicFilters({ ...dicFilters, strPayrollStatus: objEvent.target.value })} disabled={blnBusy} controlId="reimbursements.review-list.payroll-status.select">
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="in_payroll">In payroll</MenuItem>
              <MenuItem value="not_in_payroll">Not in payroll</MenuItem>
            </TextField>
            <Autocomplete
              fullWidth
              size="small"
              options={lstDepartmentOptions}
              value={lstDepartmentOptions.find((objOption) => objOption.strValue === dicFilters.strDepartment) ?? null}
              getOptionLabel={(objOption) => objOption.strLabel}
              isOptionEqualToValue={(objA, objB) => objA.strValue === objB.strValue}
              onChange={(_e, objOption) => setDicFilters({ ...dicFilters, strDepartment: objOption?.strValue ?? "" })}
              disabled={blnBusy}
              renderInput={(params) => <TextField {...params} className="app-mui-text-field" fullWidth label="Department" placeholder="Search department..." InputProps={{ ...params.InputProps, startAdornment: (<>{nodeSearchAdornment}{params.InputProps.startAdornment}</>) }} />}
            />
            <Autocomplete
              fullWidth
              size="small"
              options={lstLocationOptions}
              value={lstLocationOptions.find((objOption) => objOption.strValue === dicFilters.strLocation) ?? null}
              getOptionLabel={(objOption) => objOption.strLabel}
              isOptionEqualToValue={(objA, objB) => objA.strValue === objB.strValue}
              onChange={(_e, objOption) => setDicFilters({ ...dicFilters, strLocation: objOption?.strValue ?? "" })}
              disabled={blnBusy}
              renderInput={(params) => <TextField {...params} className="app-mui-text-field" fullWidth label="Location" placeholder="Search location..." InputProps={{ ...params.InputProps, startAdornment: (<>{nodeSearchAdornment}{params.InputProps.startAdornment}</>) }} />}
            />
          </MasterMoreFilters>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => void loadClaims()} disabled={blnBusy} controlId="reimbursements.review-list.search.button">Search</Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearFilters} disabled={blnBusy} controlId="reimbursements.review-list.clear.button">Clear</Button>
          </Box>
        </Box>
      </Box>

      {strRightsError ? <Alert severity="warning" sx={{ borderRadius: "8px" }}>{strRightsError}</Alert> : null}
      {strError ? <Alert severity="error" sx={{ borderRadius: "8px" }}>{strError}</Alert> : null}

      <Box className={styles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {blnBusy ? (
          <MasterGridSkeleton strControlId="reimbursements.review-list.skeleton" intColumns={7} />
        ) : !blnCanView ? (
          <Box className={styles.emptyState} data-controlid="reimbursements.review-list.access-denied.state">
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>Reimbursement review access is not available for your user group.</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>Contact your administrator if you need reimbursement review visibility.</Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            showPaginationSummary
            toolbarLeft={(
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} alignItems={{ xs: "flex-start", sm: "center" }}>
                {blnCanCreateEssReimbursement ? (
                  <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => { setStrCreateEmployeeID(""); setStrCreateError(""); setBlnCreateDialogOpen(true); }} controlId="reimbursements.review-list.add.button">Add Reimbursement</Button>
                ) : null}
              </Stack>
            )}
            toolbarAfterExport={(
              <MasterAddColumnsControl strControlPrefix="reimbursements.review-list" lstColumns={lstOptionalColumns} lstVisibleKeys={lstVisibleOptionalColumns} onChange={setLstVisibleOptionalColumns} />
            )}
            onRowClick={(objRow) => {
              if (objRow.strClaimRoute) objRouter.push(String(objRow.strClaimRoute));
            }}
            hideRowClickHint
            getRowSx={() => dicMasterRowSx}
            minTableWidth={1100}
            emptyMessage="No reimbursement claims found."
            testIdPrefix="reimbursements.review-list"
            withPaper={false}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        )}
      </Box>
      <Dialog open={blnCreateDialogOpen} onClose={() => setBlnCreateDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Reimbursement</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1.4 }}>Select an employee to create the reimbursement for.</DialogContentText>
          <Autocomplete
            fullWidth
            size="small"
            options={lstEmployeeOptions}
            value={lstEmployeeOptions.find((objOption) => objOption.strValue === strCreateEmployeeID) ?? null}
            getOptionLabel={(objOption) => objOption.strLabel}
            isOptionEqualToValue={(objA, objB) => objA.strValue === objB.strValue}
            onChange={(_e, objOption) => { setStrCreateEmployeeID(objOption?.strValue ?? ""); setStrCreateError(""); }}
            renderInput={(params) => <TextField {...params} InputLabelProps={{ shrink: true }} label="Employee" placeholder="Search employee..." error={Boolean(strCreateError)} helperText={strCreateError || " "} controlId="reimbursements.review-list.create.employee.select"
              InputProps={{ ...params.InputProps, startAdornment: (<><SearchRoundedIcon fontSize="small" sx={{ color: "action.active", ml: 0.5, mr: -0.5 }} />{params.InputProps.startAdornment}</>) }} />}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button size="small" className={styles.secondaryButton} onClick={() => setBlnCreateDialogOpen(false)} controlId="reimbursements.review-list.create.cancel.button">Cancel</Button>
          <Button size="small" className={styles.primaryButton} onClick={proceedToCreateForEmployee} controlId="reimbursements.review-list.create.proceed.button">Proceed</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
