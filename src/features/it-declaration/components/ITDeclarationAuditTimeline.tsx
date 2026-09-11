"use client";

import { Paper, Stack, Typography } from "@mui/material";

import type { HrItDeclarationAuditRecord } from "@/features/it-declaration/services/itDeclarationService";

export default function ITDeclarationAuditTimeline({ lstAudit }: { lstAudit: HrItDeclarationAuditRecord[] }) {
  return (
    <Stack spacing={1}>
      {lstAudit.length === 0 ? <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>No audit events found.</Typography> : null}
      {lstAudit.map((objAudit) => (
        <Paper key={`${objAudit.strAction}-${objAudit.strActionOn}`} sx={{ p: 1.2, border: "1px solid #e2e8f0" }}>
          <Typography sx={{ fontWeight: 700 }}>{objAudit.strAction}</Typography>
          <Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>{objAudit.strActionBy} | {objAudit.strActionOn}</Typography>
          {objAudit.strRemarks ? <Typography sx={{ mt: 0.5 }}>{objAudit.strRemarks}</Typography> : null}
        </Paper>
      ))}
    </Stack>
  );
}

