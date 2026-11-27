"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { Alert, Box, Button, Link, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { MasterAddColumnsControl, MasterBreadcrumbs, MasterGridSkeleton, dicMasterRowSx, type MasterOptionalColumn } from "@/components/master/MasterListUi";
import styles from "@/components/master/MasterScreen.module.css";
import ReimbursementClaimStatusBadge from "@/features/reimbursements/components/ReimbursementClaimStatusBadge";
import { formatCurrency, formatDateLabel, translateKnownReimbursementText } from "@/features/reimbursements/formatters";
import { useReimbursementLabels } from "@/features/reimbursements/hooks/useReimbursementLabels";
import { canEditReimbursementClaim, isPayrollVisibleStatus } from "@/features/reimbursements/rules";
import { reimbursementService } from "@/features/reimbursements/services/reimbursementService";
import type { ReimbursementClaimDto } from "@/features/reimbursements/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

const lstReimbursementModuleCodes = ["ESS_REIMBURSEMENT_CLAIMS"];

type OptionalColumnKey = "paymentStatus";

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
  const [lstVisibleOptionalColumns, setLstVisibleOptionalColumns] = useState<OptionalColumnKey[]>([]);
  const blnCanView = canViewAny() || canDoAny("list") || canDoAny("view");
  const blnCanAdd = canDoAny("add") || canDoAny("create");
  const blnCanEdit = canDoAny("edit");
  const blnBusy = blnLoading || blnRightsLoading;
  const lstOptionalColumns: MasterOptionalColumn<OptionalColumnKey>[] = [
    { strKey: "paymentStatus", strLabel: t("payment_status", "Payment Status") },
  ];

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
        const strClaimRoute = blnRowGoesToEdit ? `/ess/reimbursements/${objClaim.intID}/edit` : `/ess/reimbursements/${objClaim.intID}`;
        return {
        id: objClaim.intID,
        strClaimRoute,
        strClaimReference: (
          <Link
            className="app-master-first-column-link"
            component="button"
            type="button"
            underline="none"
            aria-label={blnRowGoesToEdit ? t("edit_claim", "Edit claim") : t("view_claim", "View claim")}
            controlId={`reimbursements.my-claims.row.${blnRowGoesToEdit ? "edit" : "view"}.link`}
            data-row-key={objClaim.intID}
            onClick={(objEvent) => {
              objEvent.stopPropagation();
              objRouter.push(strClaimRoute);
            }}
          >
            {getClaimReferenceNumber(objClaim)}
          </Link>
        ),
        strClaimReferenceSort: getClaimReferenceNumber(objClaim),
        strClaimTitle: translateKnownReimbursementText(objClaim.strClaimTitle, t),
        dtClaimDate: formatDateLabel(objClaim.dtClaimDate),
        dtClaimDateSort: objClaim.dtClaimDate || "",
        strStatus: <ReimbursementClaimStatusBadge strStatus={objClaim.strClaimStatus} />,
        strStatusSort: objClaim.strClaimStatus || "",
        decClaimedAmount: formatCurrency(objClaim.decClaimedAmount),
        decClaimedAmountSort: Number(objClaim.decClaimedAmount ?? 0),
        decApprovedAmount: formatCurrency(objClaim.decApprovedAmount),
        decApprovedAmountSort: Number(objClaim.decApprovedAmount ?? 0),
        strPaymentStatus: isPayrollVisibleStatus(objClaim.strClaimStatus) ? t("in_payroll", "In payroll") : "-",
        };
      }),
    [blnCanEdit, lstClaims, objRouter, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => {
      const lstColumns: CommonTableColumn<(typeof lstTableRows)[number]>[] = [
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
          sortAccessor: (objRow) => objRow.decClaimedAmountSort,
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
          sortAccessor: (objRow) => objRow.decApprovedAmountSort,
        },
      ];
      if (lstVisibleOptionalColumns.includes("paymentStatus")) {
        lstColumns.push({ field: "strPaymentStatus", headerName: t("payment_status", "Payment Status"), width: 160 });
      }
      return lstColumns;
    },
    [lstVisibleOptionalColumns, t]
  );

  return (
    <Box className={styles.page} data-controlid="reimbursements.my-claims.page">
      <MasterBreadcrumbs strSection={t("breadcrumb_payroll_benefits", "Payroll & Benefits")} strTitle={t("breadcrumb_my_reimbursements", "My Reimbursements")} />
      {strRightsError ? <Alert severity="warning" sx={{ borderRadius: "8px" }}>{strRightsError}</Alert> : null}
      {strError ? <Alert severity="error" sx={{ borderRadius: "8px" }}>{strError}</Alert> : null}

      <Box className={styles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {blnBusy ? (
          <MasterGridSkeleton strControlId="reimbursements.my-claims.skeleton" intColumns={6} />
        ) : !blnCanView ? (
          <Box className={styles.emptyState} data-controlid="reimbursements.my-claims.access-denied.state">
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("access_not_available", "Reimbursement access is not available for your user group.")}</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>{t("contact_admin_visibility", "Contact your administrator if you need reimbursement visibility.")}</Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            showPaginationSummary
            minTableWidth={900}
            toolbarLeft={blnCanAdd ? (
              <Button
                className={styles.primaryButton}
                startIcon={<AddRoundedIcon />}
                onClick={() => objRouter.push("/ess/reimbursements/new")}
                controlId="reimbursements.my-claims.new-claim.button"
              >
                {t("new_claim", "New Claim")}
              </Button>
            ) : undefined}
            toolbarAfterExport={(
              <MasterAddColumnsControl
                strControlPrefix="reimbursements.my-claims"
                strButtonLabel={t("add_columns", "Add columns")}
                lstColumns={lstOptionalColumns}
                lstVisibleKeys={lstVisibleOptionalColumns}
                onChange={setLstVisibleOptionalColumns}
              />
            )}
            onRowClick={(objRow) => objRouter.push(String(objRow.strClaimRoute))}
            hideRowClickHint
            getRowSx={() => dicMasterRowSx}
            emptyMessage={t("no_claims_yet", "No reimbursement claims yet.")}
            testIdPrefix="reimbursements.my-claims"
            withPaper={false}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        )}
      </Box>
    </Box>
  );
}
