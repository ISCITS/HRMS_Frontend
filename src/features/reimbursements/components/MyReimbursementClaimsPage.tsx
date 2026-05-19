"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { Alert, Box, Button, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import ReimbursementClaimStatusBadge from "@/features/reimbursements/components/ReimbursementClaimStatusBadge";
import { formatCurrency, formatDateLabel } from "@/features/reimbursements/formatters";
import { canEditReimbursementClaim, isPayrollVisibleStatus } from "@/features/reimbursements/rules";
import { reimbursementService } from "@/features/reimbursements/services/reimbursementService";
import type { ReimbursementClaimDto } from "@/features/reimbursements/types";

function getErrorMessage(objError: unknown) {
  return objError instanceof Error ? objError.message : "Unable to process reimbursement request.";
}

export default function MyReimbursementClaimsPage() {
  const objRouter = useRouter();
  const [lstClaims, setLstClaims] = useState<ReimbursementClaimDto[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");

  async function loadClaims() {
    // Purpose: Loads employee-owned reimbursement claims for tracking and action routing.
    setBlnLoading(true);
    setStrError("");
    try {
      setLstClaims(await reimbursementService.listClaims());
    } catch (objError) {
      setStrError(getErrorMessage(objError));
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    void loadClaims();
  }, []);

  const objSummary = useMemo(() => {
    const decPending = lstClaims
      .filter((objClaim) => ["submitted", "resubmitted", "under_review", "released"].includes(objClaim.strClaimStatus))
      .reduce((decTotal, objClaim) => decTotal + (objClaim.decClaimedAmount || 0), 0);
    const decApproved = lstClaims.reduce((decTotal, objClaim) => decTotal + (objClaim.decApprovedAmount || 0), 0);
    return { intClaims: lstClaims.length, decPending, decApproved };
  }, [lstClaims]);

  return (
    <Stack spacing={1.4}>
      <Paper sx={{ p: 0.9, borderRadius: "12px", border: "1px solid rgba(37, 99, 235, 0.2)", background: "linear-gradient(100deg, #0f4b8b 0%, #0d6ca1 64%, #0d7f9c 100%)", color: "#f8fcff" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} gap={1}>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <ReceiptLongOutlinedIcon sx={{ fontSize: 20 }} />
            <Box>
              <Typography sx={{ color: "#f8fcff", fontWeight: 800, fontSize: "1rem" }}>My Reimbursements</Typography>
              <Typography sx={{ color: "rgba(239,252,255,0.92)", fontSize: "0.74rem" }}>
                {objSummary.intClaims} claims, {formatCurrency(objSummary.decPending)} awaiting review, {formatCurrency(objSummary.decApproved)} approved.
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={0.8} flexWrap="wrap" justifyContent={{ xs: "flex-start", md: "flex-end" }} alignItems="center">
            <Button variant="contained" size="small" startIcon={<RefreshRoundedIcon />} onClick={() => void loadClaims()} sx={{ minHeight: 30, borderRadius: "8px", backgroundColor: "#0b3f73", color: "#ffffff", fontWeight: 700, fontSize: "0.76rem", textTransform: "none", boxShadow: "none", "&:hover": { backgroundColor: "#0a355f", boxShadow: "none" } }}>Refresh</Button>
            <Button variant="contained" size="small" startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/ess/reimbursements/new")} sx={{ minHeight: 30, borderRadius: "8px", backgroundColor: "#f59e0b", color: "#111827", fontWeight: 800, fontSize: "0.76rem", textTransform: "none", boxShadow: "none", "&:hover": { backgroundColor: "#d97706", boxShadow: "none" } }}>New Claim</Button>
          </Stack>
        </Stack>
      </Paper>

      {strError ? <Alert severity="error" sx={{ borderRadius: "8px" }}>{strError}</Alert> : null}
      <BlockingLoader blnOpen={blnLoading} strLabel="Loading reimbursement claims..." />

      <Paper sx={{ borderRadius: "8px", border: "1px solid #dbe3ef", overflow: "hidden" }}>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 780 }}>
            <TableHead sx={{ backgroundColor: "#f8fafc" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Claim</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Claimed</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Approved</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Payroll</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Open</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lstClaims.length === 0 && !blnLoading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography sx={{ py: 3, textAlign: "center", color: "#64748b" }}>No reimbursement claims yet.</Typography>
                  </TableCell>
                </TableRow>
              ) : null}
              {lstClaims.map((objClaim) => (
                <TableRow key={objClaim.intID} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{objClaim.strClaimCode || `Claim #${objClaim.intID}`}</Typography>
                    <Typography sx={{ fontSize: "0.76rem", color: "#64748b" }}>{objClaim.strClaimTitle || "Untitled claim"}</Typography>
                  </TableCell>
                  <TableCell>{formatDateLabel(objClaim.dtClaimDate)}</TableCell>
                  <TableCell><ReimbursementClaimStatusBadge strStatus={objClaim.strClaimStatus} /></TableCell>
                  <TableCell align="right">{formatCurrency(objClaim.decClaimedAmount)}</TableCell>
                  <TableCell align="right">{formatCurrency(objClaim.decApprovedAmount)}</TableCell>
                  <TableCell>{isPayrollVisibleStatus(objClaim.strClaimStatus) ? "In payroll" : "-"}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => objRouter.push(canEditReimbursementClaim(objClaim.strClaimStatus) ? `/ess/reimbursements/${objClaim.intID}/edit` : `/ess/reimbursements/${objClaim.intID}`)}
                      aria-label="Open claim"
                    >
                      <OpenInNewRoundedIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  );
}
