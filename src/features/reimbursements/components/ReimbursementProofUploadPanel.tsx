"use client";

import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Alert, IconButton, Stack, Typography } from "@mui/material";
import { useState } from "react";

import FileUploadButton from "@/components/shared/files/FileUploadButton";
import ReimbursementClaimStatusBadge from "@/features/reimbursements/components/ReimbursementClaimStatusBadge";
import type { ReimbursementClaimItemDto } from "@/features/reimbursements/types";

type ProofUploadPanelProps = {
  objItem: ReimbursementClaimItemDto;
  blnEditable: boolean;
  onUpload: (objFile: File) => Promise<void>;
  onDelete: (intProofID: number) => Promise<void>;
};

export default function ReimbursementProofUploadPanel({ objItem, blnEditable, onUpload, onDelete }: ProofUploadPanelProps) {
  const [blnBusy, setBlnBusy] = useState(false);
  const [strUploadError, setStrUploadError] = useState("");
  const blnMissingProof = objItem.blnProofRequired && objItem.lstProofs.length === 0;

  async function uploadSelectedFile(objFile: File | null) {
    // Purpose: Uploads one proof at a time and clears the file control through React re-render.
    if (!objFile) return;
    setStrUploadError("");
    setBlnBusy(true);
    try {
      await onUpload(objFile);
    } catch (objError) {
      setStrUploadError(objError instanceof Error ? objError.message : "Unable to upload proof.");
    } finally {
      setBlnBusy(false);
    }
  }

  async function deleteProof(intProofID: number) {
    // Purpose: Removes employee-uploaded proof metadata while the parent claim is editable.
    setBlnBusy(true);
    try {
      await onDelete(intProofID);
    } finally {
      setBlnBusy(false);
    }
  }

  return (
    <Stack spacing={0.8}>
      {blnMissingProof ? <Alert severity="warning" sx={{ borderRadius: "8px" }}>Proof is required before this claim can be submitted.</Alert> : null}
      {strUploadError ? <Alert severity="error" sx={{ borderRadius: "8px" }} onClose={() => setStrUploadError("")}>{strUploadError}</Alert> : null}
      {objItem.lstProofs.map((objProof) => (
        <Stack key={objProof.intID} direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ border: "1px solid #dbe3ef", borderRadius: "8px", px: 1, py: 0.7 }}>
          <Stack sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a", wordBreak: "break-word" }}>{objProof.strFileName || "Proof document"}</Typography>
            <Stack direction="row" spacing={0.8} alignItems="center">
              <ReimbursementClaimStatusBadge strStatus={objProof.strVerificationStatus} />
              {objProof.strVerificationRemarks ? <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>{objProof.strVerificationRemarks}</Typography> : null}
            </Stack>
          </Stack>
          {blnEditable ? (
            <IconButton controlId="reimbursements.proof-upload.delete.icon-button" size="small" onClick={() => void deleteProof(objProof.intID)} disabled={blnBusy} aria-label="Delete proof">
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Stack>
      ))}
      {blnEditable ? (
        <FileUploadButton
          controlId="reimbursements.proof-upload.upload.button"
          label="Upload Proof"
          hasExistingFile={false}
          isUploading={blnBusy}
          onFilesSelected={(lstSelected) => void uploadSelectedFile(lstSelected[0] ?? null)}
          onValidationError={(strMessage) => setStrUploadError(strMessage)}
          sx={{ alignSelf: "flex-start" }}
        />
      ) : null}
    </Stack>
  );
}
