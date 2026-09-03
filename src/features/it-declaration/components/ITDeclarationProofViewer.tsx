"use client";

import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";

import type { HrItDeclarationProofRecord } from "@/features/it-declaration/services/itDeclarationService";

function formatBytes(intBytes?: number | null) {
  const intValue = Number(intBytes || 0);
  if (!intValue) return "-";
  if (intValue < 1024) return `${intValue} B`;
  if (intValue < 1024 * 1024) return `${(intValue / 1024).toFixed(1)} KB`;
  return `${(intValue / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ITDeclarationProofViewer({
  lstProofs,
  fnPreview,
}: {
  lstProofs: HrItDeclarationProofRecord[];
  fnPreview: (intItemID: number) => Promise<void>;
}) {
  return (
    <Stack spacing={1}>
      {lstProofs.length === 0 ? (
        <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>No proofs uploaded.</Typography>
      ) : null}
      {lstProofs.map((objProof) => (
        <Paper key={objProof.intProofID} sx={{ p: 1.2, border: "1px solid #dbe3ef" }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
            <Box>
              <Typography sx={{ fontWeight: 700, color: "#0f172a", wordBreak: "break-word" }}>{objProof.strFileName}</Typography>
              <Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>{objProof.strMimeType} | {formatBytes(objProof.intFileSizeBytes)}</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button controlId="it-declaration.proof-viewer.view.button" data-proof-id={objProof.intProofID} variant="outlined" size="small" startIcon={<VisibilityRoundedIcon />} onClick={() => void fnPreview(objProof.intItemID)}>
                View
              </Button>
              <Button controlId="it-declaration.proof-viewer.download.button" data-proof-id={objProof.intProofID} variant="outlined" size="small" startIcon={<DownloadRoundedIcon />} onClick={() => void fnPreview(objProof.intItemID)}>
                Download
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

