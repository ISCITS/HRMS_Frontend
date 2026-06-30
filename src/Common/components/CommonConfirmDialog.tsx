"use client";

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import type { ReactNode } from "react";

import masterStyles from "@/components/master/MasterScreen.module.css";
import { handleSingleDialogActionEnter } from "@/Common/utils/dialogKeyboard";

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
  strDialogPaperClassName?: string;
  strDialogTitleClassName?: string;
  strDialogContentClassName?: string;
  strDialogMessageClassName?: string;
  strDialogActionsClassName?: string;
  strCancelButtonClassName?: string;
  strConfirmButtonClassName?: string;
  rootControlId?: string;
  cancelButtonControlId?: string;
  confirmButtonControlId?: string;
  messageControlId?: string;
};

export type { CommonConfirmDialogProps };

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
  strDialogPaperClassName = masterStyles.confirmDialogPaper,
  strDialogTitleClassName = masterStyles.confirmDialogTitle,
  strDialogContentClassName = masterStyles.confirmDialogContent,
  strDialogMessageClassName = masterStyles.confirmDialogMessage,
  strDialogActionsClassName = masterStyles.confirmDialogActions,
  strCancelButtonClassName = masterStyles.textAction,
  strConfirmButtonClassName = masterStyles.primaryButton,
}: CommonConfirmDialogProps) {
  return (
    <Dialog
      controlId="common-confirm-dialog"
      open={blnOpen}
      onClose={onClose}
      onKeyDown={handleSingleDialogActionEnter}
      PaperProps={{ className: strDialogPaperClassName }}
    >
      <DialogTitle className={strDialogTitleClassName}>{strTitle}</DialogTitle>
      <DialogContent className={strDialogContentClassName}>
        {nodeMessage ?? <Typography controlId="common-confirm-dialog.message" className={strDialogMessageClassName}>{strMessage}</Typography>}
      </DialogContent>
      <DialogActions className={strDialogActionsClassName}>
        <Button controlId="common-confirm-dialog.cancel.button" className={strCancelButtonClassName} onClick={onClose} disabled={blnCancelDisabled}>
          {strCancelLabel}
        </Button>
        <Button controlId="common-confirm-dialog.confirm.button" className={strConfirmButtonClassName} onClick={onConfirm} disabled={blnConfirmDisabled}>
          {strConfirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
