"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
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
  const blnEmployeeReimbursementContext =
    strPathname?.toLowerCase() === "/payroll/employee-reimbursement" ||
    objSearchParams.get("source") === "employee-reimbursement";
  const blnCanView = canViewAny() || canDoAny("list") || canDoAny("review");
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
        action: blnEmployeeReimbursementContext ? (
          <Stack direction="row" spacing={0.6} justifyContent="center" flexWrap="wrap" useFlexGap>
            {blnCanViewEssReimbursement ? (
              <IconButton
                size="small"
                onClick={() => objRouter.push(getEssReimbursementRoute(objClaim, "view"))}
                aria-label="Open reimbursement claim"
                controlId="reimbursements.review-list.row.ess.view.button"
                data-row-key={objClaim.intID}
              >
                <OpenInNewRoundedIcon fontSize="small" />
              </IconButton>
            ) : null}
            {blnCanEditEssReimbursement && canEditReimbursementClaim(objClaim.strClaimStatus) ? (
              <IconButton size="small" onClick={() => objRouter.push(getEssReimbursementRoute(objClaim, "edit"))} aria-label="Edit reimbursement claim" controlId="reimbursements.review-list.row.ess.edit.button" data-row-key={objClaim.intID}><EditRoundedIcon fontSize="small" /></IconButton>
            ) : null}
          </Stack>
        ) : (
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <IconButton
              size="small"
              onClick={() => objRouter.push(`/payroll/reimbursements/${objClaim.intID}`)}
              aria-label="Open reimbursement claim"
              controlId="reimbursements.review-list.row.view.button"
              data-row-key={objClaim.intID}
            >
              <OpenInNewRoundedIcon fontSize="small" />
            </IconButton>
          </Box>
        ),
        strClaimReference: (
          <Typography sx={{ fontWeight: 900, color: "#0f172a", fontSize: "0.88rem" }}>
            {getClaimReferenceNumber(objClaim) || "-"}
          </Typography>
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
        strPaymentStatus: getPaymentStatusLabel(objClaim),
      })),
    [blnCanEditEssReimbursement, blnCanViewEssReimbursement, blnEmployeeReimbursementContext, lstFilteredClaims, mapEmployees, objRouter]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "action", headerName: "Action", align: "center", sortable: false, filterable: false, exportable: false, width: 110 },
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
      { field: "strPaymentStatus", headerName: "Payment Status", width: 160 },
    ],
    []
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
    const objParams = new URLSearchParams({ employee_id: String(intEmployeeID) });
    if (blnEmployeeReimbursementContext) {
      objParams.set("source", "employee-reimbursement");
    }
    objRouter.push(`/ess/reimbursements/new?${objParams.toString()}`);
  }

  function getEssReimbursementRoute(objClaim: ReimbursementClaimDto, strMode: "view" | "edit") {
    const objParams = new URLSearchParams();
    if (objClaim.intEmployeeID) {
      objParams.set("employee_id", String(objClaim.intEmployeeID));
    }
    if (blnEmployeeReimbursementContext) {
      objParams.set("source", "employee-reimbursement");
    }
    const strEmployeeQuery = objParams.toString() ? `?${objParams.toString()}` : "";
    return strMode === "edit"
      ? `/ess/reimbursements/${objClaim.intID}/edit${strEmployeeQuery}`
      : `/ess/reimbursements/${objClaim.intID}${strEmployeeQuery}`;
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.controlsCard}>
        <Stack spacing={1.1}>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" useFlexGap>
            <TextField select size="small" label="Status" value={dicFilters.strStatus} onChange={(objEvent) => setDicFilters({ ...dicFilters, strStatus: objEvent.target.value })} sx={{ minWidth: 160 }} controlId="reimbursements.review-list.status.select">
              <MenuItem value="">All statuses</MenuItem>
              {lstClaimStatuses.map((strStatus) => <MenuItem key={strStatus} value={strStatus}>{strStatus.replaceAll("_", " ")}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Employee" value={dicFilters.intEmployeeID} onChange={(objEvent) => setDicFilters({ ...dicFilters, intEmployeeID: objEvent.target.value })} sx={{ minWidth: 210 }}>
              <MenuItem value="">All employees</MenuItem>
              {lstEmployeeOptions.map((objOption) => <MenuItem key={objOption.strValue} value={objOption.strValue}>{objOption.strLabel}</MenuItem>)}
            </TextField>
            <TextField size="small" type="month" label="Claim month" InputLabelProps={{ shrink: true }} value={dicFilters.strClaimMonth} onChange={(objEvent) => setDicFilters({ ...dicFilters, strClaimMonth: objEvent.target.value })} sx={{ minWidth: 150 }} />
            <TextField select size="small" label="Claim search" value={dicFilters.strSearchText} onChange={(objEvent) => setDicFilters({ ...dicFilters, strSearchText: objEvent.target.value })} sx={{ minWidth: 240 }}>
              <MenuItem value="">All claims</MenuItem>
              {lstClaimOptions.map((objOption) => <MenuItem key={objOption.strValue} value={objOption.strValue}>{objOption.strLabel}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Proof pending" value={dicFilters.strProofPending} onChange={(objEvent) => setDicFilters({ ...dicFilters, strProofPending: objEvent.target.value })} sx={{ minWidth: 150 }}>
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </TextField>
            <TextField select size="small" label="Payroll status" value={dicFilters.strPayrollStatus} onChange={(objEvent) => setDicFilters({ ...dicFilters, strPayrollStatus: objEvent.target.value })} sx={{ minWidth: 160 }} controlId="reimbursements.review-list.payroll-status.select">
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="in_payroll">In payroll</MenuItem>
              <MenuItem value="not_in_payroll">Not in payroll</MenuItem>
            </TextField>
            <TextField select size="small" label="Department" value={dicFilters.strDepartment} onChange={(objEvent) => setDicFilters({ ...dicFilters, strDepartment: objEvent.target.value })} sx={{ minWidth: 170 }}>
              <MenuItem value="">All departments</MenuItem>
              {lstDepartmentOptions.map((objOption) => <MenuItem key={objOption.strValue} value={objOption.strValue}>{objOption.strLabel}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Location" value={dicFilters.strLocation} onChange={(objEvent) => setDicFilters({ ...dicFilters, strLocation: objEvent.target.value })} sx={{ minWidth: 170 }}>
              <MenuItem value="">All locations</MenuItem>
              {lstLocationOptions.map((objOption) => <MenuItem key={objOption.strValue} value={objOption.strValue}>{objOption.strLabel}</MenuItem>)}
            </TextField>
            <Box className={styles.searchActions} sx={{ justifyContent: "flex-end", width: "100%" }}>
              <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => void loadClaims()} controlId="reimbursements.review-list.search.button">Search</Button>
              <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearFilters} controlId="reimbursements.review-list.clear.button">Clear</Button>
            </Box>
          </Stack>
        </Stack>
      </Box>

      {strRightsError ? <Alert severity="warning" sx={{ borderRadius: "8px" }}>{strRightsError}</Alert> : null}
      {strError ? <Alert severity="error" sx={{ borderRadius: "8px" }}>{strError}</Alert> : null}
      <BlockingLoader blnOpen={blnLoading || blnRightsLoading || blnCreateRightsLoading || blnEssRightsLoading} strLabel="Loading reimbursement review queue..." />

      {!blnCanView ? (
        <Paper sx={{ borderRadius: "8px", border: "1px solid #dbe3ef", p: 3 }}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>Reimbursement review access is not available for your user group.</Typography>
          <Typography sx={{ mt: 1, color: "#64748b" }}>Contact your administrator if you need reimbursement review visibility.</Typography>
        </Paper>
      ) : null}

      {blnCanView ? (
        <Box className={styles.tableCard}>
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
            minTableWidth={blnEmployeeReimbursementContext ? 1180 : 980}
            emptyMessage="No reimbursement claims found."
            testIdPrefix="reimbursements.review-list"
            withPaper={false}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        </Box>
      ) : null}
      <Dialog open={blnCreateDialogOpen} onClose={() => setBlnCreateDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Reimbursement</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1.4 }}>Select an employee to create the reimbursement for.</DialogContentText>
          <TextField select fullWidth size="small" label="Employee" value={strCreateEmployeeID} onChange={(objEvent) => { setStrCreateEmployeeID(objEvent.target.value); setStrCreateError(""); }} error={Boolean(strCreateError)} helperText={strCreateError || " "} controlId="reimbursements.review-list.create.employee.select">
            <MenuItem value="">Select employee</MenuItem>
            {lstEmployeeOptions.map((objOption) => <MenuItem key={objOption.strValue} value={objOption.strValue}>{objOption.strLabel}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button size="small" className={styles.secondaryButton} onClick={() => setBlnCreateDialogOpen(false)} controlId="reimbursements.review-list.create.cancel.button">Cancel</Button>
          <Button size="small" className={styles.primaryButton} onClick={proceedToCreateForEmployee} controlId="reimbursements.review-list.create.proceed.button">Proceed</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
