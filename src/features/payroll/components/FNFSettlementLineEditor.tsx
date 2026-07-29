"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Switch, TextField, Typography } from "@mui/material";
import { useEffect, useState, type InputHTMLAttributes } from "react";
import type { FNFLineFormValues, FNFRecoveryType, FNFSettlementLineRecord } from "@/features/payroll/types";

const dicEmptyLine: FNFLineFormValues = { strLineType: "EARNING", strRecoveryType: "", strLineCode: "", strLineName: "", decActualAmount: "0", decAmount: "0", blnIsManualOverride: true, strOverrideReason: "", strRemarks: "" };

export default function FNFSettlementLineEditor({ blnOpen, objLine, onClose, onSave }: { blnOpen: boolean; objLine?: FNFSettlementLineRecord | null; onClose: () => void; onSave: (dicValues: FNFLineFormValues) => Promise<void> }) {
  const [dicForm, setDicForm] = useState<FNFLineFormValues>(dicEmptyLine);
  const [strError, setStrError] = useState("");
  const [blnSaving, setBlnSaving] = useState(false);

  useEffect(() => {
    setDicForm(objLine ? { intID: objLine.intID, strLineType: objLine.strLineType, strRecoveryType: objLine.strRecoveryType || "", strLineCode: objLine.strLineCode, strLineName: objLine.strLineName, decActualAmount: String(objLine.decActualAmount ?? objLine.decAmount ?? 0), decAmount: String(objLine.decAmount ?? 0), blnIsManualOverride: true, strOverrideReason: objLine.strOverrideReason || "", strRemarks: objLine.strRemarks || "" } : dicEmptyLine);
    setStrError("");
  }, [objLine, blnOpen]);

  async function handleSave() {
    if (!dicForm.strLineCode.trim() || !dicForm.strLineName.trim()) {
      setStrError("Line code and name are required.");
      return;
    }
    if (dicForm.strLineType === "RECOVERY" && !dicForm.strRecoveryType) {
      setStrError("Recovery type is required for recovery lines.");
      return;
    }
    if (Number.isNaN(Number(dicForm.decAmount)) || Number(dicForm.decAmount) < 0 || Number.isNaN(Number(dicForm.decActualAmount)) || Number(dicForm.decActualAmount) < 0) {
      setStrError("Actual and final amounts must be valid non-negative numbers.");
      return;
    }
    if (Number(dicForm.decActualAmount || 0) !== Number(dicForm.decAmount || 0) && !dicForm.strRemarks.trim() && !dicForm.strOverrideReason.trim()) {
      setStrError("Remarks are required when final amount differs from actual amount.");
      return;
    }
    if (dicForm.blnIsManualOverride && !dicForm.strOverrideReason.trim()) {
      setStrError("Manual override reason is required.");
      return;
    }
    setBlnSaving(true);
    try {
      await onSave(dicForm);
      onClose();
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to save line.");
    } finally {
      setBlnSaving(false);
    }
  }

  return (
    <Dialog open={blnOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{objLine ? "Edit Settlement Line" : "Add Settlement Line"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {strError ? <Typography color="error">{strError}</Typography> : null}
          <TextField controlId="payroll.fnf.line-editor.line-type.select" required select label="Line Type" value={dicForm.strLineType} onChange={(e) => setDicForm((d) => ({ ...d, strLineType: e.target.value as FNFLineFormValues["strLineType"] }))} fullWidth>
            {["EARNING", "DEDUCTION", "RECOVERY", "STATUTORY", "TAX"].map((strType) => <MenuItem key={strType} value={strType}>{strType}</MenuItem>)}
          </TextField>
          {dicForm.strLineType === "RECOVERY" ? (
            <TextField controlId="payroll.fnf.line-editor.recovery-type.select" required select label="Recovery Type" value={dicForm.strRecoveryType} onChange={(e) => setDicForm((d) => ({ ...d, strRecoveryType: e.target.value as FNFRecoveryType }))} fullWidth>
              {["NOTICE", "LOAN", "ADVANCE", "ASSET", "EXCESS_SALARY", "OTHER"].map((strType) => <MenuItem key={strType} value={strType}>{strType}</MenuItem>)}
            </TextField>
          ) : null}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField required label="Line Code" value={dicForm.strLineCode} onChange={(e) => setDicForm((d) => ({ ...d, strLineCode: e.target.value }))} fullWidth />
            <TextField required label="Actual Amount" type="number" value={dicForm.decActualAmount} onChange={(e) => setDicForm((d) => ({ ...d, decActualAmount: e.target.value }))} fullWidth />
            <TextField required label="Final Amount" type="number" value={dicForm.decAmount} onChange={(e) => setDicForm((d) => ({ ...d, decAmount: e.target.value }))} fullWidth />
          </Stack>
          <TextField required label="Line Name" value={dicForm.strLineName} onChange={(e) => setDicForm((d) => ({ ...d, strLineName: e.target.value }))} fullWidth />
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography sx={{ fontWeight: 700 }}>Manual Override</Typography>
            <Switch inputProps={{ "controlId": "payroll.fnf.line-editor.manual-override.switch" } as InputHTMLAttributes<HTMLInputElement>} checked={dicForm.blnIsManualOverride} onChange={(_, checked) => setDicForm((d) => ({ ...d, blnIsManualOverride: checked }))} />
          </Box>
          <TextField required={dicForm.blnIsManualOverride} label="Reason" value={dicForm.strOverrideReason} onChange={(e) => setDicForm((d) => ({ ...d, strOverrideReason: e.target.value }))} fullWidth />
          <TextField label="Remarks" value={dicForm.strRemarks} onChange={(e) => setDicForm((d) => ({ ...d, strRemarks: e.target.value }))} fullWidth multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "flex-end", px: 3, pb: 2 }}>
        <Button controlId="payroll.fnf.line-editor.cancel.button" size="small" variant="text" onClick={onClose}>Cancel</Button>
        <Button controlId="payroll.fnf.line-editor.save.button" size="small" variant="contained" startIcon={objLine ? <SaveRoundedIcon /> : <AddRoundedIcon />} disabled={blnSaving} onClick={handleSave}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
