"use client";

import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import type { DialogProps, ReactNode } from "react";
import type { SxProps, Theme } from "@mui/material/styles";

import styles from "@/components/master/MasterScreen.module.css";
import { handleSingleDialogActionEnter } from "@/components/common/dialogKeyboard";

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
};

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
  paperClassName = styles.compactDialogPaper,
  paperSx,
  contentSx,
  onDialogClose,
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
        <Button className={styles.secondaryButton} onClick={onClose}>
          {strSecondaryLabel}
        </Button>
        {!blnHidePrimary && strPrimaryLabel && onPrimaryAction ? (
          <Button className={styles.primaryButton} onClick={onPrimaryAction} disabled={blnPrimaryDisabled}>
            {strPrimaryLabel}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
