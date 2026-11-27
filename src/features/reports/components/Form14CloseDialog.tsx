"use client";

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";

import {
  form14ReportService,
  type Form14CloseResult,
  type Form14Filters,
} from "@/features/reports/services/form14ReportService";
import { fmtNum } from "@/features/reports/utils/form14Grid";

type Form14CloseDialogProps = {
  objFilters: Form14Filters;
  onClose: () => void;
  onClosed: () => void;
};

const dicOutcomeLabels: Record<string, string> = { dry_run: "Will close", closed: "Closed", skipped: "Skipped" };

export default function Form14CloseDialog({ objFilters, onClose, onClosed }: Form14CloseDialogProps) {
  const [dicPlan, setDicPlan] = useState<Form14CloseResult | null>(null);
  const [dicDone, setDicDone] = useState<Form14CloseResult | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  // The filters are fixed for the life of the dialog: what was previewed is what gets closed.
  const objFiltersRef = useRef(objFilters);

  useEffect(() => {
    let blnActive = true;
    form14ReportService.closeYear(objFiltersRef.current, true)
      .then((dicResult) => {
        if (blnActive) {
          setDicPlan(dicResult);
        }
      })
      .catch((objError) => {
        if (blnActive) {
          setStrError(objError instanceof Error ? objError.message : "Unable to prepare the year-end close preview.");
        }
      })
      .finally(() => {
        if (blnActive) {
          setBlnLoading(false);
        }
      });
    return () => {
      blnActive = false;
    };
  }, []);

  async function confirmClose() {
    setBlnSaving(true);
    setStrError("");
    try {
      const dicResult = await form14ReportService.closeYear(objFiltersRef.current, false);
      setDicDone(dicResult);
      onClosed();
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to complete the year-end close.");
    } finally {
      setBlnSaving(false);
    }
  }

  const dicShown = dicDone ?? dicPlan;
  const intWillClose = dicPlan?.lstEmployees.filter((dicRow) => dicRow.strOutcome === "dry_run").length ?? 0;

  return (
    <Dialog open onClose={blnSaving ? undefined : onClose} fullWidth maxWidth="lg" controlId="reports.form14.close.dialog">
      <DialogTitle>Year-end close · {objFilters.intYear}</DialogTitle>
      <DialogContent dividers>
        {strError ? <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setStrError("")}>{strError}</Alert> : null}
        {blnLoading ? <Typography>Preparing preview…</Typography> : null}
        {dicShown ? (
          <>
            <Typography sx={{ mb: 1.5 }}>
              {dicDone
                ? `${dicDone.intClosed} worker(s) closed, ${dicDone.intSkipped} skipped.`
                : `Preview for the current filters: ${intWillClose} worker(s) will be closed, ${dicShown.intSkipped} skipped. Closing locks the year and carries the capped balance into ${objFilters.intYear + 1}.`}
            </Typography>
            <Box sx={{ maxHeight: 420, overflow: "auto" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Emp code</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Outcome</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell align="right">Earned for next year</TableCell>
                    <TableCell align="right">Carry forward</TableCell>
                    <TableCell align="right">Lapsed</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dicShown.lstEmployees.map((dicRow) => (
                    <TableRow key={dicRow.intEmployeeID}>
                      <TableCell>{dicRow.strEmployeeCode}</TableCell>
                      <TableCell>{dicRow.strName}</TableCell>
                      <TableCell>{dicOutcomeLabels[dicRow.strOutcome] ?? dicRow.strOutcome}</TableCell>
                      <TableCell>{dicRow.strReason ?? ""}</TableCell>
                      <TableCell align="right">{fmtNum(dicRow.dicResult?.decEarnedForNextYear) || (dicRow.dicResult ? "0" : "")}</TableCell>
                      <TableCell align="right">{fmtNum(dicRow.dicResult?.decCarryForwardToNext) || (dicRow.dicResult ? "0" : "")}</TableCell>
                      <TableCell align="right">{fmtNum(dicRow.dicResult?.decLapsed) || (dicRow.dicResult ? "0" : "")}</TableCell>
                    </TableRow>
                  ))}
                  {dicShown.lstEmployees.length === 0 ? (
                    <TableRow><TableCell colSpan={7}>No workers match the current filters.</TableCell></TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </Box>
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={blnSaving} controlId="reports.form14.close.cancel.button">{dicDone ? "Done" : "Cancel"}</Button>
        {!dicDone ? (
          <Button variant="contained" onClick={() => confirmClose().catch(() => undefined)} disabled={blnLoading || blnSaving || intWillClose === 0} controlId="reports.form14.close.confirm.button">
            {blnSaving ? "Closing…" : `Close year for ${intWillClose} worker(s)`}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
