"use client";

import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { CircularProgress, IconButton, Stack, Tooltip } from "@mui/material";

import FileUploadButton from "@/components/shared/files/FileUploadButton";

/*
Functional responsibility:
- Presentational Preview/Replace/Delete action row shared by every "attached document" surface in
  the app. FileList.tsx (the generic /api/v1/files rows used on Bank Details and Loan/Advance) and
  every domain-specific proof row (Reimbursements, IT Declaration, Leave, Attendance
  Regularization, Work on Holiday, Flexi-Pay) render this same component so the eye/replace/delete
  affordance looks and behaves identically everywhere, even though each caller keeps its own
  data-fetching and its own existing service calls wired into the callbacks below.

Inputs:
- onPreview/onReplace/onDelete are all optional so a caller can render a subset (e.g. a read-only
  screen passes onPreview only). Icon choice is fixed (VisibilityRoundedIcon / DeleteOutlineRoundedIcon)
  to match the original FileList.tsx row exactly; Replace reuses FileUploadButton's
  hasExistingFile="Replace" affordance the same way FileList.tsx already did.
*/

type FileRowActionsProps = {
  // Used only for the aria-label/tooltip text (e.g. "Preview payslip.pdf").
  strFileName: string;
  controlIdPrefix: string;
  disabled?: boolean;
  busy?: boolean;
  onPreview?: () => void;
  onReplace?: (objNewFile: File) => void;
  onDelete?: () => void;
  isReplacing?: boolean;
  replaceProgress?: number;
  onReplaceValidationError?: (strMessage: string) => void;
  previewLabel?: string;
  replaceLabel?: string;
  deleteLabel?: string;
};

export default function FileRowActions({
  strFileName,
  controlIdPrefix,
  disabled = false,
  busy = false,
  onPreview,
  onReplace,
  onDelete,
  isReplacing = false,
  replaceProgress,
  onReplaceValidationError,
  previewLabel = "Preview",
  replaceLabel = "Replace",
  deleteLabel = "Delete",
}: FileRowActionsProps) {
  return (
    <Stack direction="row" spacing={0.6} alignItems="center" justifyContent={{ xs: "flex-start", sm: "flex-end" }}>
      {onPreview ? (
        <Tooltip title={previewLabel}>
          <span>
            <IconButton
              controlId={`${controlIdPrefix}.preview.icon-button`}
              size="small"
              color="primary"
              disabled={busy}
              onClick={onPreview}
              aria-label={`${previewLabel} ${strFileName}`}
            >
              {busy ? <CircularProgress size={16} /> : <VisibilityRoundedIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
      ) : null}
      {!disabled && onReplace ? (
        <FileUploadButton
          controlId={`${controlIdPrefix}.replace.button`}
          label={replaceLabel}
          replaceLabel={replaceLabel}
          hasExistingFile
          color="warning"
          isUploading={isReplacing}
          progress={isReplacing ? replaceProgress : undefined}
          onFilesSelected={(lstSelected) => lstSelected[0] && onReplace(lstSelected[0])}
          onValidationError={onReplaceValidationError}
          sx={{ minHeight: 30, px: 1, py: 0.2, fontSize: "0.72rem" }}
        />
      ) : null}
      {!disabled && onDelete ? (
        <Tooltip title={deleteLabel}>
          <span>
            <IconButton
              controlId={`${controlIdPrefix}.delete.icon-button`}
              size="small"
              color="error"
              disabled={busy}
              onClick={onDelete}
              aria-label={`${deleteLabel} ${strFileName}`}
            >
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      ) : null}
    </Stack>
  );
}
