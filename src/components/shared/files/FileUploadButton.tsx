"use client";

import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import { Box, Button, CircularProgress, LinearProgress, Typography, type ButtonProps } from "@mui/material";
import { useRef, type ChangeEvent, type ReactNode } from "react";

import { validateFileForUpload } from "@/hooks/useFileUpload";
import { ALLOWED_DOCUMENT_ACCEPT } from "@/lib/fileUploadConstants";

/*
Functional responsibility:
- Presentational file-picker button used by every upload surface in the app (Bank, Loan, and the
  refactored Reimbursement/IT-Declaration/Leave proof pickers). Runs the shared extension/size
  pre-flight check the moment a file is chosen and only ever calls back with files that passed it —
  callers never have to re-run validation themselves.

Inputs:
- onFilesSelected: already-validated File(s).
- onValidationError: raised for a rejected file (friendly message; caller decides how to render it).
- isUploading/progress: optional controlled state to render a determinate/indeterminate progress bar
  under the button (a real progress bar, driven by axios onUploadProgress via useFileUpload).

Failure behavior:
- Invalid files never reach onFilesSelected; the input is always cleared after each pick so the same
  file can be re-selected after fixing an issue.
*/

type FileUploadButtonProps = {
  controlId: string;
  label?: string;
  replaceLabel?: string;
  hasExistingFile?: boolean;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  isUploading?: boolean;
  progress?: number;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  color?: ButtonProps["color"];
  startIcon?: ReactNode;
  sx?: ButtonProps["sx"];
  onFilesSelected: (lstFiles: File[]) => void;
  onValidationError?: (strMessage: string) => void;
};

export default function FileUploadButton({
  controlId,
  label = "Upload",
  replaceLabel = "Replace",
  hasExistingFile = false,
  accept = ALLOWED_DOCUMENT_ACCEPT,
  multiple = false,
  disabled = false,
  isUploading = false,
  progress,
  size = "small",
  variant = "outlined",
  color = "primary",
  startIcon,
  sx,
  onFilesSelected,
  onValidationError,
}: FileUploadButtonProps) {
  const objInputRef = useRef<HTMLInputElement | null>(null);

  function handleFileInputChange(objEvent: ChangeEvent<HTMLInputElement>) {
    const lstSelectedFiles = Array.from(objEvent.target.files ?? []);
    objEvent.target.value = "";
    if (lstSelectedFiles.length === 0) {
      return;
    }

    const lstValidFiles: File[] = [];
    for (const objFile of lstSelectedFiles) {
      const strValidationError = validateFileForUpload(objFile);
      if (strValidationError) {
        onValidationError?.(strValidationError);
        continue;
      }
      lstValidFiles.push(objFile);
    }

    if (lstValidFiles.length > 0) {
      onFilesSelected(lstValidFiles);
    }
  }

  const blnShowDeterminateProgress = isUploading && typeof progress === "number" && progress > 0 && progress < 100;

  return (
    <Box sx={{ display: "inline-flex", flexDirection: "column", gap: 0.5, minWidth: blnShowDeterminateProgress ? 160 : undefined }}>
      <Button
        controlId={controlId}
        component="label"
        size={size}
        variant={variant}
        color={color}
        disabled={disabled || isUploading}
        startIcon={isUploading ? <CircularProgress size={14} color="inherit" /> : startIcon ?? <UploadFileRoundedIcon />}
        sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px", ...sx }}
      >
        {isUploading ? "Uploading..." : hasExistingFile ? replaceLabel : label}
        <input
          ref={objInputRef}
          hidden
          controlId={`${controlId}.input`}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled || isUploading}
          onChange={handleFileInputChange}
        />
      </Button>
      {blnShowDeterminateProgress ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <LinearProgress variant="determinate" value={progress} sx={{ flex: 1, borderRadius: 4, height: 6 }} />
          <Typography sx={{ fontSize: "0.68rem", color: "#64748b", minWidth: 30 }}>{progress}%</Typography>
        </Box>
      ) : null}
    </Box>
  );
}
