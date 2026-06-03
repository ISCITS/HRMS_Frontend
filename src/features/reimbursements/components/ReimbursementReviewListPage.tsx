"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import styles from "@/components/master/MasterScreen.module.css";
import { employeeService } from "@/features/employee/services/employeeService";
import type { EmployeeFormOptions, EmployeeListRecord, EmployeeLookupOption } from "@/features/employee/types";
import ReimbursementStatusBadge from "@/features/reimbursements/components/ReimbursementStatusBadge";
import { formatCurrency, formatDateLabel } from "@/features/reimbursements/formatters";
import { claimHasProofPending } from "@/features/reimbursements/hrRules";
import { createInitialPayrollReimbursementFilters, payrollReimbursementService, type PayrollReimbursementFilters } from "@/features/reimbursements/services/payrollReimbursementService";
import type { ReimbursementClaimDto } from "@/features/reimbursements/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

const lstClaimStatuses = ["submitted", "resubmitted", "under_review", "approved", "partially_approved", "rejected", "released", "locked", "pushed_to_payroll", "paid"];
const lstReimbursementReviewModuleCodes = ["REIMBURSEMENT_REVIEW", "REIMBURSEMENTS_REVIEW", "PAYROLL_REIMBURSEMENT", "PAYROLL_REIMBURSEMENTS"];

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

export default function ReimbursementReviewListPage() {
  const objRouter = useRouter();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstReimbursementReviewModuleCodes);
  const [dicFilters, setDicFilters] = useState<PayrollReimbursementFilters>(createInitialPayrollReimbursementFilters());
  const [lstClaims, setLstClaims] = useState<ReimbursementClaimDto[]>([]);
  const [lstEmployees, setLstEmployees] = useState<EmployeeListRecord[]>([]);
  const [objEmployeeOptions, setObjEmployeeOptions] = useState<EmployeeFormOptions>(objEmptyEmployeeOptions);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const blnCanView = canViewAny() || canDoAny("list") || canDoAny("review");

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
    () => createUniqueOptions(lstEmployees.map((objEmployee) => ({
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

  function clearFilters() {
    const dicReset = createInitialPayrollReimbursementFilters();
    setDicFilters(dicReset);
    void loadClaims(dicReset);
  }

  return (
    <Stack spacing={1.4}>
      <Paper sx={{ p: 1.35, borderRadius: "8px", border: "1px solid #dbe3ef" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography sx={{ fontWeight: 900, color: "#0f172a", fontSize: "1.08rem" }}>Reimbursement Review</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{lstFilteredClaims.length} claims in the current review view.</Typography>
          </Box>
          <Stack direction="row" spacing={0.7}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => void loadClaims()}>Search</Button>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearFilters}>Clear</Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 1.1, borderRadius: "8px", border: "1px solid #dbe3ef" }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <TextField select size="small" label="Status" value={dicFilters.strStatus} onChange={(objEvent) => setDicFilters({ ...dicFilters, strStatus: objEvent.target.value })} sx={{ minWidth: 160 }} data-testid="reimbursements.review-list.status.select">
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
          <TextField select size="small" label="Payroll status" value={dicFilters.strPayrollStatus} onChange={(objEvent) => setDicFilters({ ...dicFilters, strPayrollStatus: objEvent.target.value })} sx={{ minWidth: 160 }} data-testid="reimbursements.review-list.payroll-status.select">
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
        </Stack>
      </Paper>

      {strRightsError ? <Alert severity="warning" sx={{ borderRadius: "8px" }}>{strRightsError}</Alert> : null}
      {strError ? <Alert severity="error" sx={{ borderRadius: "8px" }}>{strError}</Alert> : null}
      <BlockingLoader blnOpen={blnLoading || blnRightsLoading} strLabel="Loading reimbursement review queue..." />

      {!blnCanView ? (
        <Paper sx={{ borderRadius: "8px", border: "1px solid #dbe3ef", p: 3 }}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>Reimbursement review access is not available for your user group.</Typography>
          <Typography sx={{ mt: 1, color: "#64748b" }}>Contact your administrator if you need reimbursement review visibility.</Typography>
        </Paper>
      ) : null}

      {blnCanView ? <Paper sx={{ borderRadius: "8px", border: "1px solid #dbe3ef", overflow: "hidden" }}>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 980 }}>
            <TableHead sx={{ backgroundColor: "#f8fafc" }}>
              <TableRow>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Action</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Claim Reference Number</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Claim Purpose</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Employee</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Claim Date</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Proof</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Claimed Amount 
                  <Typography sx={{ color: "#64748b", fontSize: "12px" }}>(All amount in ₹)</Typography>
                  </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Approved Amount
                   <Typography sx={{ color: "#64748b", fontSize: "12px" }}>(All amount in ₹)</Typography>
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Payment Status</TableCell>

              </TableRow>
            </TableHead>
            <TableBody>
              {lstFilteredClaims.length === 0 && !blnLoading ? (
                <TableRow><TableCell colSpan={9}><Typography sx={{ py: 3, textAlign: "center", color: "#64748b" }}>No reimbursement claims found.</Typography></TableCell></TableRow>
              ) : null}
              {lstFilteredClaims.map((objClaim) => (
                <TableRow key={objClaim.intID} hover>
                  <TableCell align="right"><IconButton size="small" onClick={() => objRouter.push(`/payroll/reimbursements/${objClaim.intID}`)} aria-label="Open reimbursement claim" data-testid="reimbursements.review-list.row.open.icon-button" data-row-key={objClaim.intID}><OpenInNewRoundedIcon fontSize="small" /></IconButton></TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>{getClaimReferenceNumber(objClaim) || "-"}</Typography>
                    {/* <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>{objClaim.strClaimTitle || "-"}</Typography> */}
                  </TableCell>
                  <TableCell>{objClaim.strClaimTitle || ""}</TableCell>
                  <TableCell>{getEmployeeLabel(objClaim, mapEmployees) || "-"}</TableCell>
                  <TableCell>{formatDateLabel(objClaim.dtClaimDate)}</TableCell>
                  <TableCell><ReimbursementStatusBadge strStatus={objClaim.strClaimStatus} /></TableCell>
                  <TableCell>{claimHasProofPending(objClaim) ? "Pending" : "Clear"}</TableCell>
                  <TableCell align="right">{formatCurrency(objClaim.decClaimedAmount)}</TableCell>
                  <TableCell align="right">{formatCurrency(objClaim.decApprovedAmount)}</TableCell>
                  <TableCell>{["locked", "pushed_to_payroll", "paid"].includes(objClaim.strClaimStatus) ? "In payroll" : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper> : null}
    </Stack>
  );
}
