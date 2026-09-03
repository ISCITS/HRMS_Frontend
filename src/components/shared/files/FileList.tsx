"use client";

import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import { Box, Stack, Typography } from "@mui/material";

import FileRowActions from "@/components/shared/files/FileRowActions";
import type { FileMetadataDto } from "@/lib/fileUploadService";

/*
Functional responsibility:
- Presentational list of uploaded document metadata (Bank/Loan/Profile files today). Renders one row
  per file with Preview / Replace / Delete actions (delegated to the shared FileRowActions so every
  attachment surface in the app shares one visual source of truth); all network calls stay with the
  caller (matches the read-only "objProof" row patterns already used in ReimbursementClaimItemForm.tsx).
*/

type FileListProps = {
  lstFiles: FileMetadataDto[];
  controlIdPrefix: string;
  disabled?: boolean;
  emptyMessage?: string;
  intBusyFileID?: number | null;
  intReplacingFileID?: number | null;
  intReplaceProgress?: number;
  onPreview: (objFile: FileMetadataDto) => void;
  onDelete?: (objFile: FileMetadataDto) => void;
  onReplace?: (objFile: FileMetadataDto, objNewFile: File) => void;
  onReplaceValidationError?: (strMessage: string) => void;
  // "stack" (default) renders one full-width row per file. "grid" packs two files per row on
  // wider screens — used on Bank Details, where a single cancelled-cheque row was reported as
  // "too large for a single document, we can add 2 documents in a single row".
  layout?: "stack" | "grid";
};

function formatFileSize(intBytes?: number | null) {
  if (!intBytes) return "";
  if (intBytes < 1024) return `${intBytes} B`;
  if (intBytes < 1024 * 1024) return `${Math.ceil(intBytes / 1024)} KB`;
  return `${(intBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadedOn(strDate?: string | null) {
  if (!strDate) return "";
  const objDate = new Date(strDate);
  if (Number.isNaN(objDate.getTime())) return "";
  return objDate.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function FileList({
  lstFiles,
  controlIdPrefix,
  disabled = false,
  emptyMessage = "No documents uploaded yet.",
  intBusyFileID = null,
  intReplacingFileID = null,
  intReplaceProgress,
  onPreview,
  onDelete,
  onReplace,
  onReplaceValidationError,
  layout = "stack",
}: FileListProps) {
  if (lstFiles.length === 0) {
    return <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{emptyMessage}</Typography>;
  }

  return (
    <Box
      sx={
        layout === "grid"
          ? { display: "grid", gap: 0.75, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }
          : { display: "flex", flexDirection: "column", gap: 0.75 }
      }
    >
      {lstFiles.map((objFile) => {
        const blnBusy = intBusyFileID === objFile.intFileID;
        const blnReplacing = intReplacingFileID === objFile.intFileID;
        return (
          <Stack
            key={objFile.intFileID}
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
            spacing={0.8}
            sx={{ border: "1px solid #dbe3ef", borderRadius: "8px", px: 1, py: 0.75, minWidth: 0 }}
          >
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0 }}>
              <InsertDriveFileOutlinedIcon sx={{ color: "#2563eb", fontSize: 20, flexShrink: 0 }} />
              <Stack sx={{ minWidth: 0 }}>
                <Typography
                  title={objFile.strOriginalFileName}
                  sx={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {objFile.strOriginalFileName}
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>
                  {[formatFileSize(objFile.intFileSizeBytes), formatUploadedOn(objFile.dtUploadedOn)].filter(Boolean).join(" | ")}
                </Typography>
              </Stack>
            </Stack>
            <FileRowActions
              strFileName={objFile.strOriginalFileName}
              controlIdPrefix={controlIdPrefix}
              disabled={disabled}
              busy={blnBusy}
              onPreview={() => onPreview(objFile)}
              onReplace={onReplace ? (objNewFile) => onReplace(objFile, objNewFile) : undefined}
              onDelete={onDelete ? () => onDelete(objFile) : undefined}
              isReplacing={blnReplacing}
              replaceProgress={intReplaceProgress}
              onReplaceValidationError={onReplaceValidationError}
            />
          </Stack>
        );
      })}
    </Box>
  );
}

export function FileListEmptyHint({ strMessage }: { strMessage: string }) {
  return (
    <Box sx={{ p: 1.2, borderRadius: "8px", bgcolor: "#f8fafc", border: "1px dashed #cbd5e1" }}>
      <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>{strMessage}</Typography>
    </Box>
  );
}
