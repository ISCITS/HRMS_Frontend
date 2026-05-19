"use client";

import { Box, Stack, Typography } from "@mui/material";

import { formatDateLabel, formatStatusLabel } from "@/features/reimbursements/formatters";
import type { ReimbursementAuditRecord } from "@/features/reimbursements/services/payrollReimbursementService";

function formatDateTime(strDate?: string | null) {
  if (!strDate) return "-";
  const objDate = new Date(strDate);
  if (Number.isNaN(objDate.getTime())) return formatDateLabel(strDate);
  return objDate.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ReimbursementAuditTimeline({ lstAudit }: { lstAudit: ReimbursementAuditRecord[] }) {
  if (lstAudit.length === 0) {
    return <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>No audit events available.</Typography>;
  }

  return (
    <Stack spacing={1}>
      {lstAudit.map((objAudit) => (
        <Stack key={objAudit.intID} direction="row" spacing={1} alignItems="flex-start">
          <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#2563eb", mt: 0.6 }} />
          <Box sx={{ flex: 1, borderBottom: "1px solid #e2e8f0", pb: 0.8 }}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.85rem" }}>{formatStatusLabel(objAudit.strActionCode)}</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>
              {formatStatusLabel(objAudit.strFromStatus)} to {formatStatusLabel(objAudit.strToStatus)} on {formatDateTime(objAudit.dtActionOn)}
            </Typography>
            {objAudit.strRemarks ? <Typography sx={{ mt: 0.3, color: "#334155", fontSize: "0.8rem" }}>{objAudit.strRemarks}</Typography> : null}
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}
