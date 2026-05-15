"use client";

import { Alert, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";

import ITDeclarationStatusBadge from "@/features/it-declaration/components/ITDeclarationStatusBadge";
import type { HrItDeclarationItemRecord } from "@/features/it-declaration/services/itDeclarationService";

type Props = {
  objItem: HrItDeclarationItemRecord;
  blnLocked: boolean;
  blnCanApprove: boolean;
  blnCanReject: boolean;
  blnCanProofVerify: boolean;
  fnAction: (strAction: "approve" | "reject" | "partial_approve" | "proof_pending" | "proof_verify" | "proof_reject", objPayload?: { strRemarks?: string; decApprovedAmount?: number }) => Promise<void>;
};

export default function ITDeclarationItemReviewPanel({ objItem, blnLocked, blnCanApprove, blnCanReject, blnCanProofVerify, fnAction }: Props) {
  const [strRemarks, setStrRemarks] = useState("");
  const [strApprovedAmount, setStrApprovedAmount] = useState(String(objItem.decApprovedAmount ?? objItem.decDeclaredAmount ?? 0));
  const [strError, setStrError] = useState("");

  async function runWithValidation(strAction: "approve" | "reject" | "partial_approve" | "proof_pending" | "proof_verify" | "proof_reject") {
    if (strAction === "reject" || strAction === "partial_approve" || strAction === "proof_reject") {
      if (!strRemarks.trim()) {
        setStrError("Remarks are required for this action.");
        return;
      }
    }
    setStrError("");
    await fnAction(strAction, {
      strRemarks: strRemarks.trim() || undefined,
      decApprovedAmount: Number(strApprovedAmount || 0),
    });
  }

  return (
    <Paper sx={{ p: 1.5, border: "1px solid #dbe3ef" }}>
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between">
          <Typography sx={{ fontWeight: 800 }}>{objItem.strSection} - {objItem.strDescription}</Typography>
          <ITDeclarationStatusBadge strStatus={objItem.strItemStatus} />
        </Stack>
        <Typography sx={{ color: "#64748b", fontSize: "0.84rem" }}>Declared: {objItem.decDeclaredAmount} | Approved: {objItem.decApprovedAmount} | Proof: {objItem.strProofStatus || "N/A"}</Typography>
        <TextField size="small" label="Approved Amount" value={strApprovedAmount} onChange={(e) => setStrApprovedAmount(e.target.value)} disabled={blnLocked} />
        <TextField size="small" label="Remarks" value={strRemarks} onChange={(e) => setStrRemarks(e.target.value)} multiline minRows={2} disabled={blnLocked} />
        {strError ? <Alert severity="error">{strError}</Alert> : null}
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button size="small" variant="contained" disabled={blnLocked || !blnCanApprove} onClick={() => void runWithValidation("approve")}>Approve</Button>
          <Button size="small" variant="outlined" disabled={blnLocked || !blnCanApprove} onClick={() => void runWithValidation("partial_approve")}>Partial Approve</Button>
          <Button size="small" variant="outlined" disabled={blnLocked || !blnCanApprove} onClick={() => void runWithValidation("proof_pending")}>Proof Pending</Button>
          <Button size="small" variant="outlined" color="error" disabled={blnLocked || !blnCanReject} onClick={() => void runWithValidation("reject")}>Reject</Button>
          <Button size="small" variant="outlined" disabled={blnLocked || !blnCanProofVerify} onClick={() => void runWithValidation("proof_verify")}>Proof Verify</Button>
          <Button size="small" variant="outlined" color="error" disabled={blnLocked || !blnCanProofVerify} onClick={() => void runWithValidation("proof_reject")}>Proof Reject</Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
