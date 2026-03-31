"use client";

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import type { ReactNode } from "react";

import styles from "@/components/master/MasterScreen.module.css";
import { handleSingleDialogActionEnter } from "@/components/common/dialogKeyboard";

type CommonConfirmDialogProps = {
  blnOpen: boolean;
  strTitle?: string;
  strMessage?: string;
  nodeMessage?: ReactNode;
  strCancelLabel: string;
  strConfirmLabel: string;
  blnConfirmDisabled?: boolean;
  blnCancelDisabled?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function CommonConfirmDialog({
  blnOpen,
  strTitle,
  strMessage,
  nodeMessage,
  strCancelLabel,
  strConfirmLabel,
  blnConfirmDisabled = false,
  blnCancelDisabled = false,
  onClose,
  onConfirm,
}: CommonConfirmDialogProps) {
  return (
    <Dialog open={blnOpen} onClose={onClose} onKeyDown={handleSingleDialogActionEnter} PaperProps={{ className: styles.confirmDialogPaper }}>
      <DialogTitle className={styles.confirmDialogTitle}>{strTitle}</DialogTitle>
      <DialogContent className={styles.confirmDialogContent}>
        {nodeMessage ?? <Typography className={styles.confirmDialogMessage}>{strMessage}</Typography>}
      </DialogContent>
      <DialogActions className={styles.confirmDialogActions}>
        <Button className={styles.textAction} onClick={onClose} disabled={blnCancelDisabled}>
          {strCancelLabel}
        </Button>
        <Button className={styles.primaryButton} onClick={onConfirm} disabled={blnConfirmDisabled}>
          {strConfirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
