"use client";

import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import type { DialogProps, ReactNode } from "react";
import type { SxProps, Theme } from "@mui/material/styles";

import masterStyles from "@/components/master/MasterScreen.module.css";
import { handleSingleDialogActionEnter } from "@/Common/utils/dialogKeyboard";

type CommonMasterDialogProps = {
  blnOpen: boolean;
  strTitle: string;
  nodeContent: ReactNode;
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
};

export type { CommonMasterDialogProps };

export default function CommonMasterDialog({
  blnOpen,
  strTitle,
  nodeContent,
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
}: CommonMasterDialogProps) {
  return (
    <Dialog
      open={blnOpen}
      onClose={onDialogClose ?? (() => onClose())}
      onKeyDown={handleSingleDialogActionEnter}
      fullWidth={fullWidth}
      maxWidth={maxWidth}
      PaperProps={{ className: paperClassName, sx: paperSx }}
    >
      <DialogTitle>{strTitle}</DialogTitle>
      <DialogContent dividers sx={contentSx}>{nodeContent}</DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button className={strSecondaryButtonClassName} onClick={onClose}>
          {strSecondaryLabel}
        </Button>
        {!blnHidePrimary && strPrimaryLabel && onPrimaryAction ? (
          <Button className={strPrimaryButtonClassName} onClick={onPrimaryAction} disabled={blnPrimaryDisabled}>
            {strPrimaryLabel}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
