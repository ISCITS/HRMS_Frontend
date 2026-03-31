"use client";

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from "@mui/material";
import { handleSingleDialogActionEnter } from "@/components/common/dialogKeyboard";

type AlertDialogProps = {
  blnOpen: boolean;
  strMessage: string;
  strSeverity: "success" | "error";
  strTitle?: string;
  fnOnClose: () => void;
};

export default function AlertDialog({
  blnOpen,
  strMessage,
  strSeverity,
  strTitle,
  fnOnClose
}: AlertDialogProps) {
  return (
    <Dialog open={blnOpen} onClose={fnOnClose} onKeyDown={handleSingleDialogActionEnter} fullWidth maxWidth="xs">
      <DialogTitle>{strTitle ?? (strSeverity === "success" ? "Success" : "Error")}</DialogTitle>
      <DialogContent>
        <Alert severity={strSeverity}>
          {strMessage}
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={fnOnClose} variant="contained">
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
}
