"use client";

import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
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
};

export type { CommonMasterDialogProps };

export default function CommonMasterDialog({
  blnOpen,
  strTitle,
  nodeContent,
  nodeTitleAction,
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
}: CommonMasterDialogProps) {
  return (
    <Dialog
      controlId={rootControlId}
      open={blnOpen}
      onClose={onDialogClose ?? (() => onClose())}
      onKeyDown={handleSingleDialogActionEnter}
      fullWidth={fullWidth}
      maxWidth={maxWidth}
      PaperProps={{ className: paperClassName, sx: paperSx }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, ...titleSx }}>
        <Box component="span">{strTitle}</Box>
        {nodeTitleAction ? <Box sx={{ display: "flex", alignItems: "center", ml: "auto" }}>{nodeTitleAction}</Box> : null}
      </DialogTitle>
      <DialogContent dividers sx={contentSx}>{nodeContent}</DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button controlId={cancelButtonControlId} className={strSecondaryButtonClassName} onClick={onClose}>
          {strSecondaryLabel}
        </Button>
        {!blnHidePrimary && strPrimaryLabel && onPrimaryAction ? (
          <Button controlId={primaryButtonControlId} className={strPrimaryButtonClassName} onClick={onPrimaryAction} disabled={blnPrimaryDisabled}>
            {strPrimaryLabel}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
