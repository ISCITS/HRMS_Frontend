"use client";

import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import HighlightOffRoundedIcon from "@mui/icons-material/HighlightOffRounded";
import { Button, Stack, Typography } from "@mui/material";

import ReimbursementStatusBadge from "@/features/reimbursements/components/ReimbursementStatusBadge";
import type { ReimbursementProofDto } from "@/features/reimbursements/types";

type ProofViewerProps = {
  lstProofs: ReimbursementProofDto[];
  blnActionsDisabled: boolean;
  onVerify: (intProofID: number) => void;
  onReject: (intProofID: number) => void;
};

export default function ReimbursementProofViewer({ lstProofs, blnActionsDisabled, onVerify, onReject }: ProofViewerProps) {
  if (lstProofs.length === 0) {
    return <Typography sx={{ color: "#b45309", fontSize: "0.8rem", fontWeight: 700 }}>No proof uploaded.</Typography>;
  }

  return (
    <Stack spacing={0.75}>
      {lstProofs.map((objProof) => (
        <Stack key={objProof.intID} spacing={0.65} sx={{ border: "1px solid #dbe3ef", borderRadius: "8px", p: 0.8 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={0.8}>
            <Stack sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, fontSize: "0.82rem", color: "#0f172a", wordBreak: "break-word" }}>{objProof.strFileName || "Proof document"}</Typography>
              <Typography sx={{ fontSize: "0.74rem", color: "#64748b" }}>{objProof.strFileMimeType || "-"} {objProof.intFileSizeBytes ? `| ${Math.ceil(objProof.intFileSizeBytes / 1024)} KB` : ""}</Typography>
            </Stack>
            <ReimbursementStatusBadge strStatus={objProof.strVerificationStatus} />
          </Stack>
          {objProof.strVerificationRemarks ? <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>{objProof.strVerificationRemarks}</Typography> : null}
          <Stack direction="row" spacing={0.6}>
            <Button size="small" variant="outlined" startIcon={<CheckCircleOutlineRoundedIcon />} disabled={blnActionsDisabled || objProof.strVerificationStatus === "verified"} onClick={() => onVerify(objProof.intID)} sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}>Verify</Button>
            <Button size="small" variant="outlined" color="error" startIcon={<HighlightOffRoundedIcon />} disabled={blnActionsDisabled} onClick={() => onReject(objProof.intID)} sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}>Reject</Button>
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
