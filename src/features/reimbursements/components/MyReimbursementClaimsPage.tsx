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
import { formatCurrency, formatDateLabel, translateKnownReimbursementText } from "@/features/reimbursements/formatters";
import { useReimbursementLabels } from "@/features/reimbursements/hooks/useReimbursementLabels";
import { canEditReimbursementClaim, isPayrollVisibleStatus } from "@/features/reimbursements/rules";
import { reimbursementService } from "@/features/reimbursements/services/reimbursementService";
import type { ReimbursementClaimDto } from "@/features/reimbursements/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

const lstReimbursementModuleCodes = ["ESS_REIMBURSEMENT_CLAIMS"];

function getErrorMessage(objError: unknown) {
  return objError instanceof Error ? objError.message : "Unable to process reimbursement request.";
}

function getClaimReferenceNumber(objClaim: ReimbursementClaimDto) {
  return objClaim.strClaimNumber || objClaim.strClaimCode || "-";
}

export default function MyReimbursementClaimsPage() {
  const objRouter = useRouter();
  const { t } = useReimbursementLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstReimbursementModuleCodes);
  const [lstClaims, setLstClaims] = useState<ReimbursementClaimDto[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const blnCanView = canViewAny() || canDoAny("list") || canDoAny("view");
  const blnCanAdd = canDoAny("add") || canDoAny("create");
  const blnCanEdit = canDoAny("edit");

  async function loadClaims() {
    if (!blnCanView) {
      setLstClaims([]);
      setBlnLoading(false);
      return;
    }

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
    if (blnRightsLoading) {
      return;
    }

    void loadClaims();
  }, [blnRightsLoading, blnCanView]);

  const objSummary = useMemo(() => {
    const decPending = lstClaims
      .filter((objClaim) => ["submitted", "resubmitted", "under_review", "released"].includes(objClaim.strClaimStatus))
      .reduce((decTotal, objClaim) => decTotal + (objClaim.decClaimedAmount || 0), 0);
    const decApproved = lstClaims.reduce((decTotal, objClaim) => decTotal + (objClaim.decApprovedAmount || 0), 0);
    return { intClaims: lstClaims.length, decPending, decApproved };
  }, [lstClaims]);

  return (
    <Stack spacing={1.4}>
      <Box className="pageBanner">
        <Box className="bannerDots" />
        <Box className="bannerIcon">
          <ReceiptLongOutlinedIcon sx={{ fontSize: 30 }} />
        </Box>
        <Box className="bannerDivider" />
        <Box sx={{ position: "relative", zIndex: 1, flex: 1, minWidth: 0 }}>
          <Typography component="h1" className="bannerTitle">
            {t("my_reimbursements", "My Reimbursements")}
          </Typography>
          <Typography component="p" className="bannerSubTitle">
            {objSummary.intClaims} {t("claims", "claims")}, {formatCurrency(objSummary.decPending)} {t("awaiting_review", "awaiting review")}, {formatCurrency(objSummary.decApproved)} {t("approved", "approved")}.
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap justifyContent={{ xs: "flex-start", md: "flex-end" }} alignItems="center" sx={{ position: "relative", zIndex: 1 }}>
          <Button variant="contained" size="small" startIcon={<RefreshRoundedIcon />} onClick={() => void loadClaims()} controlId="reimbursements.my-claims.refresh.button" sx={{ maxHeight: 30, borderRadius: "8px", backgroundColor: "#0b3f73", color: "#ffffff", fontWeight: 700, fontSize: "0.76rem", textTransform: "none", boxShadow: "none", "&:hover": { backgroundColor: "#0a355f", boxShadow: "none" } }}>{t("refresh", "Refresh")}</Button>
          {blnCanAdd ? <Button variant="contained" size="small" startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/ess/reimbursements/new")} controlId="reimbursements.my-claims.new-claim.button" sx={{ maxHeight: 30, borderRadius: "8px", backgroundColor: "#ffffff", color: "#111827", fontWeight: 800, fontSize: "0.76rem", textTransform: "none", boxShadow: "none", "&:hover": { backgroundColor: "#ffffff", boxShadow: "none" } }}>{t("new_claim", "New Claim")}</Button> : null}
        </Stack>
      </Box>

      {strRightsError ? <Alert severity="warning" sx={{ borderRadius: "8px" }}>{strRightsError}</Alert> : null}
      {strError ? <Alert severity="error" sx={{ borderRadius: "8px" }}>{strError}</Alert> : null}
      <BlockingLoader blnOpen={blnLoading || blnRightsLoading} strLabel={t("loading_claims", "Loading reimbursement claims...")} />

      {!blnCanView ? (
        <Paper sx={{ borderRadius: "8px", border: "1px solid #dbe3ef", p: 3 }}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("access_not_available", "Reimbursement access is not available for your user group.")}</Typography>
          <Typography sx={{ mt: 1, color: "#64748b" }}>{t("contact_admin_visibility", "Contact your administrator if you need reimbursement visibility.")}</Typography>
        </Paper>
      ) : null}

      {blnCanView ? <Paper sx={{ mt: "0 !important", borderRadius: "8px", border: "1px solid #dbe3ef", overflow: "hidden" }}>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 780 }}>
            <TableHead sx={{ backgroundColor: "#f8fafc" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>{t("action", "Action")}</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>{t("claim_ref_number", "Claim Ref #")}</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>{t("claim_purpose", "Claim Purpose")}</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>{t("claim_date", "Claim Date")}</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>{t("status", "Status")}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>{t("claimed_amount", "Claimed Amount")}
                  <Typography sx={{ color: "#64748b", fontSize: "12px" }}>{t("all_amount_in_rupees", "(All amount in INR)")}</Typography>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>{t("approved_amount", "Approved Amount")}
                  <Typography sx={{ color: "#64748b", fontSize: "12px" }}>{t("all_amount_in_rupees", "(All amount in INR)")}</Typography>
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}>{t("payment_status", "Payment Status")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lstClaims.length === 0 && !blnLoading ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Typography sx={{ py: 3, textAlign: "center", color: "#64748b" }}>{t("no_claims_yet", "No reimbursement claims yet.")}</Typography>
                  </TableCell>
                </TableRow>
              ) : null}
              {lstClaims.map((objClaim) => (
                <TableRow key={objClaim.intID} hover>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => objRouter.push(blnCanEdit && canEditReimbursementClaim(objClaim.strClaimStatus) ? `/ess/reimbursements/${objClaim.intID}/edit` : `/ess/reimbursements/${objClaim.intID}`)}
                      aria-label={t("open_claim", "Open claim")}
                      controlId="reimbursements.my-claims.row.open.icon-button"
                      data-row-key={objClaim.intID}
                    >
                      <OpenInNewRoundedIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{getClaimReferenceNumber(objClaim)}</Typography>
                  </TableCell>
                  <TableCell> {translateKnownReimbursementText(objClaim.strClaimTitle, t)} </TableCell>
                  <TableCell>{formatDateLabel(objClaim.dtClaimDate)}</TableCell>
                  <TableCell><ReimbursementClaimStatusBadge strStatus={objClaim.strClaimStatus} /></TableCell>
                  <TableCell align="right">{formatCurrency(objClaim.decClaimedAmount)}</TableCell>
                  <TableCell align="right">{formatCurrency(objClaim.decApprovedAmount)}</TableCell>
                  <TableCell>{isPayrollVisibleStatus(objClaim.strClaimStatus) ? t("in_payroll", "In payroll") : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper> : null}
    </Stack>
  );
}
