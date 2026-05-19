"use client";

import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import RuleOutlinedIcon from "@mui/icons-material/RuleOutlined";
import { Grid, Paper, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

import { formatCurrency } from "@/features/reimbursements/formatters";
import type { ReimbursementClaimDto } from "@/features/reimbursements/types";

function SummaryMetric({ strLabel, strValue, objIcon }: { strLabel: string; strValue: string; objIcon: ReactNode }) {
  return (
    <Paper sx={{ p: 1.2, borderRadius: "8px", border: "1px solid #dbe3ef", boxShadow: "0 3px 10px rgba(15,23,42,0.04)" }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Stack sx={{ width: 34, height: 34, borderRadius: "8px", backgroundColor: "#eff6ff", color: "#1d4ed8" }} alignItems="center" justifyContent="center">
          {objIcon}
        </Stack>
        <Stack>
          <Typography sx={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 700 }}>{strLabel}</Typography>
          <Typography sx={{ fontSize: "0.98rem", color: "#0f172a", fontWeight: 800 }}>{strValue}</Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}

export default function ReimbursementClaimSummaryCard({ objClaim }: { objClaim: ReimbursementClaimDto }) {
  const intItemCount = objClaim.lstItems?.length ?? 0;
  return (
    <Grid container spacing={1.1}>
      <Grid item xs={6} md={3}>
        <SummaryMetric strLabel="Claimed" strValue={formatCurrency(objClaim.decClaimedAmount)} objIcon={<ReceiptLongOutlinedIcon fontSize="small" />} />
      </Grid>
      <Grid item xs={6} md={3}>
        <SummaryMetric strLabel="Approved" strValue={formatCurrency(objClaim.decApprovedAmount)} objIcon={<PaymentsOutlinedIcon fontSize="small" />} />
      </Grid>
      <Grid item xs={6} md={3}>
        <SummaryMetric strLabel="Taxable" strValue={formatCurrency(objClaim.decTaxableAmount)} objIcon={<RuleOutlinedIcon fontSize="small" />} />
      </Grid>
      <Grid item xs={6} md={3}>
        <SummaryMetric strLabel="Items" strValue={`${intItemCount}`} objIcon={<AccountBalanceWalletOutlinedIcon fontSize="small" />} />
      </Grid>
    </Grid>
  );
}
