"use client";

import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Box, CircularProgress, IconButton, Stack, Tooltip, Typography } from "@mui/material";

import FileUploadButton from "@/components/shared/files/FileUploadButton";
import type { FileMetadataDto } from "@/lib/fileUploadService";

/*
Functional responsibility:
- Presentational list of uploaded document metadata (Bank/Loan/Profile files today). Renders one row
  per file with Preview / Replace / Delete actions; all network calls stay with the caller (matches
  the read-only "objProof" row patterns already used in ReimbursementClaimItemForm.tsx).
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
}: FileListProps) {
  if (lstFiles.length === 0) {
    return <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{emptyMessage}</Typography>;
  }

  return (
    <Stack spacing={0.75}>
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
            sx={{ border: "1px solid #dbe3ef", borderRadius: "8px", px: 1, py: 0.75 }}
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
            <Stack direction="row" spacing={0.6} alignItems="center" justifyContent={{ xs: "flex-start", sm: "flex-end" }}>
              <Tooltip title="Preview">
                <span>
                  <IconButton
                    controlId={`${controlIdPrefix}.preview.icon-button`}
                    size="small"
                    disabled={blnBusy}
                    onClick={() => onPreview(objFile)}
                    aria-label={`Preview ${objFile.strOriginalFileName}`}
                  >
                    {blnBusy ? <CircularProgress size={16} /> : <VisibilityRoundedIcon fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>
              {!disabled && onReplace ? (
                <FileUploadButton
                  controlId={`${controlIdPrefix}.replace.button`}
                  label="Replace"
                  hasExistingFile
                  isUploading={blnReplacing}
                  progress={blnReplacing ? intReplaceProgress : undefined}
                  onFilesSelected={(lstSelected) => lstSelected[0] && onReplace(objFile, lstSelected[0])}
                  onValidationError={onReplaceValidationError}
                  sx={{ minHeight: 30, px: 1, py: 0.2, fontSize: "0.72rem" }}
                />
              ) : null}
              {!disabled && onDelete ? (
                <Tooltip title="Delete">
                  <span>
                    <IconButton
                      controlId={`${controlIdPrefix}.delete.icon-button`}
                      size="small"
                      disabled={blnBusy}
                      onClick={() => onDelete(objFile)}
                      aria-label={`Delete ${objFile.strOriginalFileName}`}
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              ) : null}
            </Stack>
          </Stack>
        );
      })}
    </Stack>
  );
}

export function FileListEmptyHint({ strMessage }: { strMessage: string }) {
  return (
    <Box sx={{ p: 1.2, borderRadius: "8px", bgcolor: "#f8fafc", border: "1px dashed #cbd5e1" }}>
      <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>{strMessage}</Typography>
    </Box>
  );
}
