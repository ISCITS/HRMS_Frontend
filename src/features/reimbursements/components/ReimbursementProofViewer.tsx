"use client";

import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import HighlightOffRoundedIcon from "@mui/icons-material/HighlightOffRounded";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useState } from "react";

import FileRowActions from "@/components/shared/files/FileRowActions";
import FileUploadButton from "@/components/shared/files/FileUploadButton";
import ReimbursementStatusBadge from "@/features/reimbursements/components/ReimbursementStatusBadge";
import { payrollReimbursementService } from "@/features/reimbursements/services/payrollReimbursementService";
import type { ReimbursementProofDto } from "@/features/reimbursements/types";
import { openBlobUrlInNewTab } from "@/lib/openBlobUrlInNewTab";

type ProofViewerProps = {
  intClaimID: number;
  intItemID: number;
  lstProofs: ReimbursementProofDto[];
  blnActionsDisabled: boolean;
  onVerify: (intProofID: number) => void;
  onReject: (intProofID: number) => void;
  onUpload: (intItemID: number, objFile: File) => void;
  onDelete: (intItemID: number, intProofID: number) => void;
};

function openBlobInNewTab(objBlob: Blob) {
  const strUrl = URL.createObjectURL(objBlob);
  openBlobUrlInNewTab(strUrl);
  window.setTimeout(() => URL.revokeObjectURL(strUrl), 30000);
}

export default function ReimbursementProofViewer({ intClaimID, intItemID, lstProofs, blnActionsDisabled, onVerify, onReject, onUpload, onDelete }: ProofViewerProps) {
  const [intPreviewingProofID, setIntPreviewingProofID] = useState<number | null>(null);

  async function previewProof(intProofID: number) {
    setIntPreviewingProofID(intProofID);
    try {
      const objBlob = await payrollReimbursementService.previewProof(intClaimID, intProofID);
      openBlobInNewTab(objBlob);
    } finally {
      setIntPreviewingProofID(null);
    }
  }

  return (
    <Stack spacing={0.75}>
      {lstProofs.length === 0 ? (
        <Typography sx={{ color: "#b45309", fontSize: "0.8rem", fontWeight: 700 }}>No proof uploaded.</Typography>
      ) : (
        lstProofs.map((objProof) => (
          <Stack key={objProof.intID} spacing={0.65} sx={{ border: "1px solid #dbe3ef", borderRadius: "8px", p: 0.8 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={0.8}>
              <Typography sx={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: "0.82rem", color: "#0f172a", wordBreak: "break-word", pr: 1 }}>
                {objProof.strFileName || "Proof document"}
              </Typography>
              <Box sx={{ flexShrink: 0 }}>
                <ReimbursementStatusBadge strStatus={objProof.strVerificationStatus} />
              </Box>
            </Stack>
            <Typography sx={{ fontSize: "0.74rem", color: "#64748b" }}>
              {objProof.strFileMimeType || "-"} {objProof.intFileSizeBytes ? `| ${Math.ceil(objProof.intFileSizeBytes / 1024)} KB` : ""}
            </Typography>
            {objProof.strVerificationRemarks ? <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>{objProof.strVerificationRemarks}</Typography> : null}
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap spacing={0.6}>
              <Stack direction="row" spacing={0.6}>
                <Button controlId="reimbursements.proof-viewer.verify.button" data-proof-id={objProof.intID} size="small" variant="outlined" startIcon={<CheckCircleOutlineRoundedIcon />} disabled={blnActionsDisabled || objProof.strVerificationStatus === "verified"} onClick={() => onVerify(objProof.intID)} sx={{ minHeight: 30, px: 1.15, py: 0.25, textTransform: "none", fontWeight: 700, borderRadius: "8px", fontSize: "0.75rem" }}>Verify</Button>
                <Button controlId="reimbursements.proof-viewer.reject.button" data-proof-id={objProof.intID} size="small" variant="outlined" color="error" startIcon={<HighlightOffRoundedIcon />} disabled={blnActionsDisabled} onClick={() => onReject(objProof.intID)} sx={{ minHeight: 30, px: 1.15, py: 0.25, textTransform: "none", fontWeight: 700, borderRadius: "8px", fontSize: "0.75rem" }}>Reject</Button>
              </Stack>
              <FileRowActions
                strFileName={objProof.strFileName || "proof"}
                controlIdPrefix="reimbursements.proof-viewer.proof"
                disabled={blnActionsDisabled}
                busy={intPreviewingProofID === objProof.intID}
                onPreview={() => void previewProof(objProof.intID)}
                onReplace={(objNewFile) => onUpload(intItemID, objNewFile)}
                onDelete={() => onDelete(intItemID, objProof.intID)}
              />
            </Stack>
          </Stack>
        ))
      )}
      {!blnActionsDisabled ? (
        <Box>
          <FileUploadButton
            controlId="reimbursements.proof-viewer.upload.button"
            label="Upload Proof"
            onFilesSelected={(lstSelected) => lstSelected[0] && onUpload(intItemID, lstSelected[0])}
          />
        </Box>
      ) : null}
    </Stack>
  );
}
