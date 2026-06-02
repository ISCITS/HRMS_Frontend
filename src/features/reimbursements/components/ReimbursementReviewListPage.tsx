"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import ReimbursementStatusBadge from "@/features/reimbursements/components/ReimbursementStatusBadge";
import { formatCurrency, formatDateLabel } from "@/features/reimbursements/formatters";
import { claimHasProofPending } from "@/features/reimbursements/hrRules";
import { createInitialPayrollReimbursementFilters, payrollReimbursementService, type PayrollReimbursementFilters } from "@/features/reimbursements/services/payrollReimbursementService";
import type { ReimbursementClaimDto } from "@/features/reimbursements/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

const lstClaimStatuses = ["submitted", "resubmitted", "under_review", "approved", "partially_approved", "rejected", "released", "locked", "pushed_to_payroll", "paid"];
const lstReimbursementReviewModuleCodes = ["REIMBURSEMENT_REVIEW", "REIMBURSEMENTS_REVIEW", "PAYROLL_REIMBURSEMENT", "PAYROLL_REIMBURSEMENTS"];

function getErrorMessage(objError: unknown) {
  return objError instanceof Error ? objError.message : "Unable to load reimbursement review queue.";
}

export default function ReimbursementReviewListPage() {
  const objRouter = useRouter();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstReimbursementReviewModuleCodes);
  const [dicFilters, setDicFilters] = useState<PayrollReimbursementFilters>(createInitialPayrollReimbursementFilters());
  const [lstClaims, setLstClaims] = useState<ReimbursementClaimDto[]>([]);
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

  const lstFilteredClaims = useMemo(() => {
    const strSearch = dicFilters.strSearchText.trim().toLowerCase();
    return lstClaims.filter((objClaim) => {
      const blnSearchMatch = !strSearch || [objClaim.strClaimCode, objClaim.strClaimTitle, objClaim.strEmployeeRemarks, objClaim.strReviewerRemarks].some((strValue) => (strValue || "").toLowerCase().includes(strSearch));
      const blnMonthMatch = !dicFilters.strClaimMonth || (objClaim.dtClaimDate || "").startsWith(dicFilters.strClaimMonth);
      const blnProofMatch = !dicFilters.strProofPending || (dicFilters.strProofPending === "yes" ? claimHasProofPending(objClaim) : !claimHasProofPending(objClaim));
      const blnPayrollMatch = !dicFilters.strPayrollStatus || (dicFilters.strPayrollStatus === "in_payroll" ? ["locked", "pushed_to_payroll", "paid"].includes(objClaim.strClaimStatus) : !["locked", "pushed_to_payroll", "paid"].includes(objClaim.strClaimStatus));
      return blnSearchMatch && blnMonthMatch && blnProofMatch && blnPayrollMatch;
    });
  }, [dicFilters, lstClaims]);

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
            <Button variant="contained" startIcon={<SearchRoundedIcon />} onClick={() => void loadClaims()} data-testid="reimbursements.review-list.search.button" sx={{ textTransform: "none", fontWeight: 800, borderRadius: "8px" }}>Search</Button>
            <Button variant="outlined" startIcon={<ClearRoundedIcon />} onClick={clearFilters} data-testid="reimbursements.review-list.clear.button" sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}>Clear</Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 1.1, borderRadius: "8px", border: "1px solid #dbe3ef" }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <TextField select size="small" label="Status" value={dicFilters.strStatus} onChange={(objEvent) => setDicFilters({ ...dicFilters, strStatus: objEvent.target.value })} sx={{ minWidth: 160 }} data-testid="reimbursements.review-list.status.select">
            <MenuItem value="">All statuses</MenuItem>
            {lstClaimStatuses.map((strStatus) => <MenuItem key={strStatus} value={strStatus}>{strStatus.replaceAll("_", " ")}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Employee ID" value={dicFilters.intEmployeeID} onChange={(objEvent) => setDicFilters({ ...dicFilters, intEmployeeID: objEvent.target.value.replace(/[^\d]/g, "") })} sx={{ minWidth: 130 }} data-testid="reimbursements.review-list.employee-id.input" />
          <TextField size="small" type="month" label="Claim month" InputLabelProps={{ shrink: true }} value={dicFilters.strClaimMonth} onChange={(objEvent) => setDicFilters({ ...dicFilters, strClaimMonth: objEvent.target.value })} sx={{ minWidth: 150 }} data-testid="reimbursements.review-list.claim-month.input" />
          <TextField size="small" label="Employee / claim search" value={dicFilters.strSearchText} onChange={(objEvent) => setDicFilters({ ...dicFilters, strSearchText: objEvent.target.value })} sx={{ minWidth: 220 }} data-testid="reimbursements.review-list.search-text.input" />
          <TextField size="small" label="Category" value={dicFilters.strCategory} onChange={(objEvent) => setDicFilters({ ...dicFilters, strCategory: objEvent.target.value })} sx={{ minWidth: 150 }} data-testid="reimbursements.review-list.category.input" />
          <TextField select size="small" label="Proof pending" value={dicFilters.strProofPending} onChange={(objEvent) => setDicFilters({ ...dicFilters, strProofPending: objEvent.target.value })} sx={{ minWidth: 150 }} data-testid="reimbursements.review-list.proof-pending.select">
            <MenuItem value="">Any</MenuItem>
            <MenuItem value="yes">Yes</MenuItem>
            <MenuItem value="no">No</MenuItem>
          </TextField>
          <TextField select size="small" label="Payroll status" value={dicFilters.strPayrollStatus} onChange={(objEvent) => setDicFilters({ ...dicFilters, strPayrollStatus: objEvent.target.value })} sx={{ minWidth: 160 }} data-testid="reimbursements.review-list.payroll-status.select">
            <MenuItem value="">Any</MenuItem>
            <MenuItem value="in_payroll">In payroll</MenuItem>
            <MenuItem value="not_in_payroll">Not in payroll</MenuItem>
          </TextField>
          <TextField size="small" label="Company" value={dicFilters.strCompany} onChange={(objEvent) => setDicFilters({ ...dicFilters, strCompany: objEvent.target.value })} sx={{ minWidth: 140 }} data-testid="reimbursements.review-list.company.input" />
          <TextField size="small" label="Department" value={dicFilters.strDepartment} onChange={(objEvent) => setDicFilters({ ...dicFilters, strDepartment: objEvent.target.value })} sx={{ minWidth: 140 }} data-testid="reimbursements.review-list.department.input" />
          <TextField size="small" label="Location" value={dicFilters.strLocation} onChange={(objEvent) => setDicFilters({ ...dicFilters, strLocation: objEvent.target.value })} sx={{ minWidth: 140 }} data-testid="reimbursements.review-list.location.input" />
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
          <Table size="small" sx={{ minWidth: 860 }}>
            <TableHead sx={{ backgroundColor: "#f8fafc" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Claim</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Claim Date</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Proof</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Claimed</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Approved</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Payroll</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Open</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lstFilteredClaims.length === 0 && !blnLoading ? (
                <TableRow><TableCell colSpan={8}><Typography sx={{ py: 3, textAlign: "center", color: "#64748b" }}>No reimbursement claims found.</Typography></TableCell></TableRow>
              ) : null}
              {lstFilteredClaims.map((objClaim) => (
                <TableRow key={objClaim.intID} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>{objClaim.strClaimCode || `Claim #${objClaim.intID}`}</Typography>
                    <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>{objClaim.strClaimTitle || "-"}</Typography>
                  </TableCell>
                  <TableCell>{formatDateLabel(objClaim.dtClaimDate)}</TableCell>
                  <TableCell><ReimbursementStatusBadge strStatus={objClaim.strClaimStatus} /></TableCell>
                  <TableCell>{claimHasProofPending(objClaim) ? "Pending" : "Clear"}</TableCell>
                  <TableCell align="right">{formatCurrency(objClaim.decClaimedAmount)}</TableCell>
                  <TableCell align="right">{formatCurrency(objClaim.decApprovedAmount)}</TableCell>
                  <TableCell>{["locked", "pushed_to_payroll", "paid"].includes(objClaim.strClaimStatus) ? "In payroll" : "-"}</TableCell>
                  <TableCell align="right"><IconButton size="small" onClick={() => objRouter.push(`/payroll/reimbursements/${objClaim.intID}`)} aria-label="Open reimbursement claim" data-testid="reimbursements.review-list.row.open.icon-button" data-row-key={objClaim.intID}><OpenInNewRoundedIcon fontSize="small" /></IconButton></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper> : null}
    </Stack>
  );
}
