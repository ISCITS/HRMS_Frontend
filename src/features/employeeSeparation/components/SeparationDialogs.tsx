"use client";

import { Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import { ApiRequestError } from "@/Common/utils/apiErrorHandler";
import { employeeSeparationService } from "@/features/employeeSeparation/services/employeeSeparationService";
import type { SeparationCancelCheck, SeparationHistoryEntry, SeparationIssue } from "@/features/employeeSeparation/types";
import { formatDisplayDate, formatDisplayDateTime } from "@/features/employeeSeparation/utils";

const dicEventLabels: Record<string, string> = {
  ACTIVATED: "Separation activated",
  FNF_LINKED: "F&F settlement linked",
  CANCELLED: "Separation cancelled",
  COMPLETED: "Separation completed (F&F paid / recovered)",
};

function IssueList({ lstIssues, strSeverity }: { lstIssues: SeparationIssue[]; strSeverity: "error" | "warning" }) {
  if (!lstIssues.length) return null;
  return (
    <Alert severity={strSeverity} sx={{ "& ul": { m: 0, pl: 2 } }}>
      <ul>{lstIssues.map((objIssue) => <li key={`${objIssue.strCode}-${objIssue.strMessage}`}>{objIssue.strMessage}</li>)}</ul>
    </Alert>
  );
}

/** Cancel with reason. Server checks (linked F&F, payroll impact) are shown first; warnings must be ticked. */
export function CancelSeparationDialog({ strSeparationID, strEmployeeLabel, onClose }: { strSeparationID: string | null; strEmployeeLabel: string; onClose: (blnChanged: boolean) => void }) {
  const [objCheck, setObjCheck] = useState<SeparationCancelCheck | null>(null);
  const [blnLoading, setBlnLoading] = useState(false);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strReason, setStrReason] = useState("");
  const [blnAcknowledged, setBlnAcknowledged] = useState(false);
  const [strError, setStrError] = useState("");

  useEffect(() => {
    setObjCheck(null);
    setStrReason("");
    setBlnAcknowledged(false);
    setStrError("");
    if (!strSeparationID) return;
    setBlnLoading(true);
    employeeSeparationService.getCancelCheck(strSeparationID)
      .then(setObjCheck)
      .catch((objError) => setStrError(objError instanceof Error ? objError.message : "Unable to check the separation."))
      .finally(() => setBlnLoading(false));
  }, [strSeparationID]);

  const blnHasWarnings = Boolean(objCheck?.lstWarnings.length);
  const blnCanSubmit = Boolean(objCheck?.blnCanCancel) && strReason.trim().length >= 3 && (!blnHasWarnings || blnAcknowledged) && !blnSaving;

  async function handleConfirm() {
    if (!strSeparationID || !blnCanSubmit) return;
    setBlnSaving(true);
    setStrError("");
    try {
      await employeeSeparationService.cancel(strSeparationID, strReason.trim(), blnAcknowledged);
      onClose(true);
    } catch (objError) {
      const objData = objError instanceof ApiRequestError ? (objError.objData as Partial<SeparationCancelCheck> | undefined) : undefined;
      if (objData?.lstErrors || objData?.lstWarnings) setObjCheck({ blnCanCancel: !(objData.lstErrors || []).length, lstErrors: objData.lstErrors || [], lstWarnings: objData.lstWarnings || [] });
      setStrError(objError instanceof Error ? objError.message : "Unable to cancel the separation.");
    } finally {
      setBlnSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(strSeparationID)} onClose={() => !blnSaving && onClose(false)} maxWidth="sm" fullWidth data-controlid="employee-separations.cancel.dialog">
      <DialogTitle>Cancel separation</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 0.5 }}>
          <Typography sx={{ color: "#334155" }}>{strEmployeeLabel}</Typography>
          {blnLoading ? <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}><CircularProgress size={24} /></Box> : null}
          {strError ? <Alert severity="error">{strError}</Alert> : null}
          {objCheck ? <IssueList lstIssues={objCheck.lstErrors} strSeverity="error" /> : null}
          {objCheck?.blnCanCancel ? (
            <>
              <Typography variant="body2" sx={{ color: "#475569" }}>
                The employee returns to regular payroll processing. The separation and its history are kept.
              </Typography>
              <IssueList lstIssues={objCheck.lstWarnings} strSeverity="warning" />
              <TextField label="Reason for cancellation" required multiline minRows={2} value={strReason} onChange={(e) => setStrReason(e.target.value)} inputProps={{ maxLength: 500 }} fullWidth controlId="employee-separations.cancel.reason.input" />
              {blnHasWarnings ? (
                <FormControlLabel control={<Checkbox checked={blnAcknowledged} onChange={(e) => setBlnAcknowledged(e.target.checked)} />} label="I have reviewed the payroll impact above." />
              ) : null}
            </>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)} disabled={blnSaving} controlId="employee-separations.cancel.close.button">Close</Button>
        {objCheck?.blnCanCancel ? (
          <Button color="error" variant="contained" onClick={() => void handleConfirm()} disabled={!blnCanSubmit} controlId="employee-separations.cancel.confirm.button">
            {blnSaving ? "Cancelling..." : "Cancel Separation"}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}

function describeValues(objValues: Record<string, unknown> | null): string {
  if (!objValues) return "";
  const lstParts: string[] = [];
  if (objValues.strActionStatusLabel) lstParts.push(`Status: ${String(objValues.strActionStatusLabel)}`);
  if (objValues.dtLastWorkingDate) lstParts.push(`LWD: ${formatDisplayDate(String(objValues.dtLastWorkingDate))}`);
  if (objValues.strExclusionFromMonthLabel) lstParts.push(`Excluded from: ${String(objValues.strExclusionFromMonthLabel)}`);
  if (objValues.strExclusionPolicyLabel) lstParts.push(`Policy: ${String(objValues.strExclusionPolicyLabel)}`);
  if (objValues.intSettlementID) lstParts.push(`Settlement #${String(objValues.intSettlementID)} (${String(objValues.strSettlementStatus || "")})`);
  if (objValues.strPayrollProcessingStatus) lstParts.push(`Payroll processing before: ${String(objValues.strPayrollProcessingStatus)}`);
  return lstParts.join(" · ");
}

export function SeparationHistoryList({ lstHistory }: { lstHistory: SeparationHistoryEntry[] }) {
  if (!lstHistory.length) return <Typography sx={{ color: "#64748b" }}>No history yet.</Typography>;
  return (
    <Stack spacing={1.25} data-controlid="employee-separations.history.list">
      {lstHistory.map((objEntry) => (
        <Box key={objEntry.intID} sx={{ borderLeft: "3px solid #cbd5e1", pl: 1.5 }}>
          <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "0.9rem" }}>{dicEventLabels[objEntry.strEventCode] ?? objEntry.strEventCode}</Typography>
          <Typography variant="body2" sx={{ color: "#64748b" }}>
            {formatDisplayDateTime(objEntry.dtOccurredOn)}{objEntry.intActorUserID ? ` · User #${objEntry.intActorUserID}` : ""}
          </Typography>
          {objEntry.strReason ? <Typography variant="body2" sx={{ color: "#334155" }}>Reason: {objEntry.strReason}</Typography> : null}
          {describeValues(objEntry.objNewValues) ? <Typography variant="body2" sx={{ color: "#475569" }}>{describeValues(objEntry.objNewValues)}</Typography> : null}
        </Box>
      ))}
    </Stack>
  );
}

export function SeparationHistoryDialog({ strSeparationID, strEmployeeLabel, onClose }: { strSeparationID: string | null; strEmployeeLabel: string; onClose: () => void }) {
  const [lstHistory, setLstHistory] = useState<SeparationHistoryEntry[] | null>(null);
  const [strError, setStrError] = useState("");

  useEffect(() => {
    setLstHistory(null);
    setStrError("");
    if (!strSeparationID) return;
    employeeSeparationService.getHistory(strSeparationID)
      .then(setLstHistory)
      .catch((objError) => setStrError(objError instanceof Error ? objError.message : "Unable to load history."));
  }, [strSeparationID]);

  return (
    <Dialog open={Boolean(strSeparationID)} onClose={onClose} maxWidth="sm" fullWidth data-controlid="employee-separations.history.dialog">
      <DialogTitle>Separation history</DialogTitle>
      <DialogContent>
        <Typography sx={{ color: "#334155", mb: 1.5 }}>{strEmployeeLabel}</Typography>
        {strError ? <Alert severity="error">{strError}</Alert> : null}
        {!lstHistory && !strError ? <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}><CircularProgress size={24} /></Box> : null}
        {lstHistory ? <SeparationHistoryList lstHistory={lstHistory} /> : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} controlId="employee-separations.history.close.button">Close</Button>
      </DialogActions>
    </Dialog>
  );
}
