"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import type { ReactNode } from "react";
import type { DialogProps } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

import masterStyles from "@/components/master/MasterScreen.module.css";
import { handleSingleDialogActionEnter } from "@/Common/utils/dialogKeyboard";

type CommonMasterDialogProps = {
  blnOpen: boolean;
  strTitle: string;
  nodeContent: ReactNode;
  nodeTitleAction?: ReactNode;
  nodeFooterStart?: ReactNode;
  titleSx?: SxProps<Theme>;
  strSecondaryLabel: string;
  onClose: () => void;
  strPrimaryLabel?: string;
  onPrimaryAction?: () => void;
  blnPrimaryDisabled?: boolean;
  blnHidePrimary?: boolean;
  maxWidth?: DialogProps["maxWidth"];
  fullWidth?: boolean;
  paperClassName?: string;
  paperSx?: object;
  contentSx?: SxProps<Theme>;
  onDialogClose?: DialogProps["onClose"];
  strSecondaryButtonClassName?: string;
  strPrimaryButtonClassName?: string;
  rootControlId?: string;
  cancelButtonControlId?: string;
  primaryButtonControlId?: string;
  rootTestId?: string;
  cancelButtonTestId?: string;
  primaryButtonTestId?: string;
};

export type { CommonMasterDialogProps };

export default function CommonMasterDialog({
  blnOpen,
  strTitle,
  nodeContent,
  nodeTitleAction,
  nodeFooterStart,
  titleSx,
  strSecondaryLabel,
  onClose,
  strPrimaryLabel,
  onPrimaryAction,
  blnPrimaryDisabled = false,
  blnHidePrimary = false,
  maxWidth = "sm",
  fullWidth = true,
  paperClassName = masterStyles.compactDialogPaper,
  paperSx,
  contentSx,
  onDialogClose,
  strSecondaryButtonClassName = masterStyles.secondaryButton,
  strPrimaryButtonClassName = masterStyles.primaryButton,
  rootControlId = "common-master-dialog",
  cancelButtonControlId = "common-master-dialog.cancel.button",
  primaryButtonControlId = "common-master-dialog.primary.button",
  rootTestId,
  cancelButtonTestId,
  primaryButtonTestId,
}: CommonMasterDialogProps) {
  const strRootControlId = rootTestId ?? rootControlId;
  const strCancelButtonControlId = cancelButtonTestId ?? cancelButtonControlId;
  const strPrimaryButtonControlId = primaryButtonTestId ?? primaryButtonControlId;
  const blnDepartmentReferenceLayout = paperClassName === masterStyles.referenceMasterDialogPaper;
  function handlePrimaryAction() {
    onPrimaryAction?.();
    if (blnDepartmentReferenceLayout) {
      window.setTimeout(() => {
        const objDialog = document.querySelector(`[data-control-id="${strRootControlId}"]`);
        objDialog?.querySelector<HTMLElement>(".Mui-error input, .Mui-error textarea, input[aria-invalid='true'], textarea[aria-invalid='true']")?.focus();
      }, 0);
    }
  }
  return (
    <Dialog
      data-control-id={strRootControlId}
      open={blnOpen}
      onClose={onDialogClose ?? ((_, strReason) => {
        if (!blnDepartmentReferenceLayout || strReason !== "backdropClick") {
          onClose();
        }
      })}
      onKeyDown={handleSingleDialogActionEnter}
      fullWidth={blnDepartmentReferenceLayout ? false : fullWidth}
      maxWidth={blnDepartmentReferenceLayout ? false : maxWidth}
      PaperProps={{ className: paperClassName, sx: paperSx }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: { xs: 1, sm: 2 },
          fontSize: "1.25rem",
          ...titleSx,
        }}
      >
        <Box component="span" sx={{ minWidth: 0, overflowWrap: "anywhere" }}>{strTitle}</Box>
        {/* Callers pass a compact control here (usually a status toggle) via the `.switchRow`
            CSS-module class, which forces min-height:68px. Emotion runs with prepend:true, so a
            caller's `sx={{ minHeight: "auto" }}` loses the cascade and the row overflows the
            short DialogTitle - DialogContent then paints over the lower half of the control and
            eats its clicks. Force the row back to its natural height here, where !important wins. */}
        {nodeTitleAction ? (
          <Box sx={{ display: "flex", alignItems: "center", ml: "auto", flexShrink: 0, "& > *": { minHeight: "unset !important" } }}>
            {nodeTitleAction}
          </Box>
        ) : null}
        {blnDepartmentReferenceLayout ? (
          <IconButton aria-label="Close" onClick={onClose} size="small" sx={{ ml: nodeTitleAction ? 0.5 : "auto", color: "#94a3b8" }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        ) : null}
      </DialogTitle>
      <DialogContent dividers sx={contentSx}>{nodeContent}</DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {nodeFooterStart ? <Box sx={{ mr: "auto" }}>{nodeFooterStart}</Box> : blnDepartmentReferenceLayout ? (
          <Typography sx={{ mr: "auto", color: "#64748b", fontSize: "11px" }}>
            Required fields are marked <Box component="span" sx={{ color: "#dc2626" }}>*</Box>
          </Typography>
        ) : null}
        <Button data-control-id={strCancelButtonControlId} className={strSecondaryButtonClassName} onClick={onClose}>
          {strSecondaryLabel}
        </Button>
        {!blnHidePrimary && strPrimaryLabel && onPrimaryAction ? (
          <Button data-control-id={strPrimaryButtonControlId} className={strPrimaryButtonClassName} onClick={handlePrimaryAction} disabled={blnPrimaryDisabled}>
            {strPrimaryLabel}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
