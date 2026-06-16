"use client";

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";

import { AlertDialogText } from "@/Common/enums/AppEnums";
import { handleSingleDialogActionEnter } from "@/Common/utils/dialogKeyboard";

type AlertDialogProps = {
  blnOpen: boolean;
  strMessage: string;
  strSeverity: "success" | "error";
  strTitle?: string;
  fnOnClose: () => void;
  rootTestId?: string;
  closeButtonTestId?: string;
};

export default function AlertDialog({
  blnOpen,
  strMessage,
  strSeverity,
  strTitle,
  fnOnClose,
  rootTestId,
  closeButtonTestId,
}: AlertDialogProps) {
  return (
    <Dialog data-testid={rootTestId} open={blnOpen} onClose={fnOnClose} onKeyDown={handleSingleDialogActionEnter} fullWidth maxWidth="xs">
      <DialogTitle>{strTitle ?? (strSeverity === "success" ? AlertDialogText.SuccessTitle : AlertDialogText.ErrorTitle)}</DialogTitle>
      <DialogContent>
        <Alert severity={strSeverity}>
          {strMessage}
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button data-testid={closeButtonTestId} onClick={fnOnClose} variant="contained">
          {AlertDialogText.OkButton}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
