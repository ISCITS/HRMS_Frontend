"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { Alert, Box, Button, IconButton, Paper, Stack, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
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

  const lstTableRows = useMemo(
    () =>
      lstClaims.map((objClaim) => {
        const blnRowGoesToEdit = blnCanEdit && canEditReimbursementClaim(objClaim.strClaimStatus);
        return {
        id: objClaim.intID,
        action: (
          <IconButton
            size="small"
            onClick={() => objRouter.push(blnRowGoesToEdit ? `/ess/reimbursements/${objClaim.intID}/edit` : `/ess/reimbursements/${objClaim.intID}`)}
            aria-label={t("open_claim", "Open claim")}
            controlId={`reimbursements.my-claims.row.${blnRowGoesToEdit ? "edit" : "view"}.button`}
            data-row-key={objClaim.intID}
          >
            <OpenInNewRoundedIcon fontSize="small" />
          </IconButton>
        ),
        strClaimReference: <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{getClaimReferenceNumber(objClaim)}</Typography>,
        strClaimReferenceSort: getClaimReferenceNumber(objClaim),
        strClaimTitle: translateKnownReimbursementText(objClaim.strClaimTitle, t),
        dtClaimDate: formatDateLabel(objClaim.dtClaimDate),
        dtClaimDateSort: objClaim.dtClaimDate || "",
        strStatus: <ReimbursementClaimStatusBadge strStatus={objClaim.strClaimStatus} />,
        strStatusSort: objClaim.strClaimStatus || "",
        decClaimedAmount: formatCurrency(objClaim.decClaimedAmount),
        decApprovedAmount: formatCurrency(objClaim.decApprovedAmount),
        strPaymentStatus: isPayrollVisibleStatus(objClaim.strClaimStatus) ? t("in_payroll", "In payroll") : "-",
        };
      }),
    [blnCanEdit, lstClaims, objRouter, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "action", headerName: t("action", "Action"), align: "center", sortable: false, filterable: false, exportable: false, width: 90 },
      { field: "strClaimReference", headerName: t("claim_ref_number", "Claim Ref #"), filterable: false, width: 150, sortAccessor: (objRow) => String(objRow.strClaimReferenceSort) },
      { field: "strClaimTitle", headerName: t("claim_purpose", "Claim Purpose"), width: 220 },
      { field: "dtClaimDate", headerName: t("claim_date", "Claim Date"), width: 140, sortAccessor: (objRow) => String(objRow.dtClaimDateSort) },
      { field: "strStatus", headerName: t("status", "Status"), filterable: false, width: 150, sortAccessor: (objRow) => String(objRow.strStatusSort) },
      {
        field: "decClaimedAmount",
        headerName: (
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "inherit" }}>{t("claimed_amount", "Claimed Amount")}</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "12px" }}>{t("all_amount_in_rupees", "(All amount in INR)")}</Typography>
          </Box>
        ),
        align: "right",
        width: 170,
      },
      {
        field: "decApprovedAmount",
        headerName: (
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "inherit" }}>{t("approved_amount", "Approved Amount")}</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "12px" }}>{t("all_amount_in_rupees", "(All amount in INR)")}</Typography>
          </Box>
        ),
        align: "right",
        width: 180,
      },
      { field: "strPaymentStatus", headerName: t("payment_status", "Payment Status"), width: 160 },
    ],
    [t]
  );

  return (
    <Stack spacing={1.4}>
      <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap justifyContent="flex-end" alignItems="center" sx={{ mb: "10px" }}>
        <Button variant="contained" size="small" startIcon={<RefreshRoundedIcon />} onClick={() => void loadClaims()} controlId="reimbursements.my-claims.refresh.button" sx={{ maxHeight: 30, borderRadius: "8px", backgroundColor: "#0b3f73", color: "#ffffff", fontWeight: 700, fontSize: "0.76rem", textTransform: "none", boxShadow: "none", "&:hover": { backgroundColor: "#0a355f", boxShadow: "none" } }}>{t("refresh", "Refresh")}</Button>
        {blnCanAdd ? <Button variant="contained" size="small" startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/ess/reimbursements/new")} controlId="reimbursements.my-claims.new-claim.button" sx={{ maxHeight: 30, borderRadius: "8px", border: "1px solid #d0d5dd", backgroundColor: "#ffffff", color: "#111827", fontWeight: 800, fontSize: "0.76rem", textTransform: "none", boxShadow: "none", "&:hover": { backgroundColor: "#f8fafc", borderColor: "#98a2b3", boxShadow: "none" } }}>{t("new_claim", "New Claim")}</Button> : null}
      </Stack>

      {strRightsError ? <Alert severity="warning" sx={{ borderRadius: "8px" }}>{strRightsError}</Alert> : null}
      {strError ? <Alert severity="error" sx={{ borderRadius: "8px" }}>{strError}</Alert> : null}
      <BlockingLoader blnOpen={blnLoading || blnRightsLoading} strLabel={t("loading_claims", "Loading reimbursement claims...")} />

      {!blnCanView ? (
        <Paper sx={{ borderRadius: "8px", border: "1px solid #dbe3ef", p: 3 }}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("access_not_available", "Reimbursement access is not available for your user group.")}</Typography>
          <Typography sx={{ mt: 1, color: "#64748b" }}>{t("contact_admin_visibility", "Contact your administrator if you need reimbursement visibility.")}</Typography>
        </Paper>
      ) : null}

      {blnCanView ? (
        <Paper sx={{ mt: "0 !important", borderRadius: "8px", border: "1px solid #dbe3ef", overflow: "hidden" }}>
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            showPaginationSummary
            minTableWidth={780}
            emptyMessage={t("no_claims_yet", "No reimbursement claims yet.")}
            testIdPrefix="reimbursements.my-claims"
            withPaper={false}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        </Paper>
      ) : null}
    </Stack>
  );
}
