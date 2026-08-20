"use client";

import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import { Box, Button, CircularProgress, LinearProgress, Typography, type ButtonProps } from "@mui/material";
import { useRef, type ChangeEvent, type DragEvent, type ReactNode } from "react";

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
  presentation?: "button" | "dropzone";
  helperText?: string;
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
  presentation = "button",
  helperText,
  startIcon,
  sx,
  onFilesSelected,
  onValidationError,
}: FileUploadButtonProps) {
  const objInputRef = useRef<HTMLInputElement | null>(null);

  function processSelectedFiles(lstSelectedFiles: File[]) {
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

  function handleFileInputChange(objEvent: ChangeEvent<HTMLInputElement>) {
    const lstSelectedFiles = Array.from(objEvent.target.files ?? []);
    objEvent.target.value = "";
    processSelectedFiles(lstSelectedFiles);
  }

  function handleDrop(objEvent: DragEvent<HTMLElement>) {
    objEvent.preventDefault();
    if (disabled || isUploading) {
      return;
    }
    processSelectedFiles(Array.from(objEvent.dataTransfer.files ?? []));
  }

  const blnShowDeterminateProgress = isUploading && typeof progress === "number" && progress > 0 && progress < 100;

  return (
    <Box sx={{ display: presentation === "dropzone" ? "flex" : "inline-flex", flexDirection: "column", gap: 0.5, width: presentation === "dropzone" ? "100%" : undefined, minWidth: blnShowDeterminateProgress ? 160 : undefined }}>
      <Button
        controlId={controlId}
        component="label"
        size={size}
        variant={variant}
        color={color}
        disabled={disabled || isUploading}
        startIcon={isUploading ? <CircularProgress size={14} color="inherit" /> : startIcon ?? (presentation === "dropzone" ? <CloudUploadOutlinedIcon /> : <UploadFileRoundedIcon />)}
        onDragOver={presentation === "dropzone" ? (objEvent) => objEvent.preventDefault() : undefined}
        onDrop={presentation === "dropzone" ? handleDrop : undefined}
        sx={{
          textTransform: "none",
          fontWeight: 700,
          borderRadius: "8px",
          ...(presentation === "dropzone" ? {
            width: "100%",
            minHeight: 70,
            justifyContent: "flex-start",
            px: 2,
            py: 1.25,
            borderStyle: "dashed",
            borderWidth: "1.5px",
            color: "text.primary",
            textAlign: "left",
            "& .MuiButton-startIcon": { color: "text.secondary", mr: 1.25 },
            "&:hover": { borderStyle: "dashed", borderWidth: "1.5px" }
          } : {}),
          ...sx
        }}
      >
        {presentation === "dropzone" ? (
          <Box>
            <Typography component="span" sx={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "text.primary" }}>
              {isUploading ? "Uploading..." : hasExistingFile ? replaceLabel : label}
            </Typography>
            {helperText ? <Typography component="span" sx={{ display: "block", mt: 0.2, fontSize: "0.72rem", fontWeight: 400, color: "text.secondary" }}>{helperText}</Typography> : null}
          </Box>
        ) : isUploading ? "Uploading..." : hasExistingFile ? replaceLabel : label}
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
