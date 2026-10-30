"use client";

import GroupAddRoundedIcon from "@mui/icons-material/GroupAddRounded";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Link, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import { formatCurrency } from "@/features/payroll/components/FNFSettlementPanels";
import { fnfSettlementService } from "@/features/payroll/services/fnfSettlementService";
import type { FNFBulkCreateResponse, FNFEmployeeOption } from "@/features/payroll/types";

type RowDraft = { blnSelected: boolean; strExitType: string; strResignationDate: string; strNoticeDays: string };

/** Creates settlements for several exited employees at once. Each employee is processed on its own;
 * failures are listed with the reason and do not stop the rest. */
export default function FNFBulkCreateDialog({ blnOpen, blnCanCalculate, onClose }: { blnOpen: boolean; blnCanCalculate: boolean; onClose: (blnChanged: boolean) => void }) {
  const objRouter = useRouter();
  const [lstEmployees, setLstEmployees] = useState<FNFEmployeeOption[]>([]);
  const [dicDrafts, setDicDrafts] = useState<Record<number, RowDraft>>({});
  const [blnCalculate, setBlnCalculate] = useState(true);
  const [blnLoading, setBlnLoading] = useState(false);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [objResult, setObjResult] = useState<FNFBulkCreateResponse | null>(null);

  useEffect(() => {
    if (!blnOpen) return;
    setObjResult(null);
    setStrError("");
    setBlnLoading(true);
    fnfSettlementService.listEmployeeOptions(true)
      .then((lstOptions) => {
        setLstEmployees(lstOptions);
        setDicDrafts(Object.fromEntries(lstOptions.map((objEmployee) => [objEmployee.intID, { blnSelected: false, strExitType: "", strResignationDate: "", strNoticeDays: objEmployee.intNoticePeriodDays != null ? String(objEmployee.intNoticePeriodDays) : "" }])));
      })
      .catch((objError) => setStrError(objError instanceof Error ? objError.message : "Unable to load employees."))
      .finally(() => setBlnLoading(false));
  }, [blnOpen]);

  const lstSelectedIDs = useMemo(() => Object.entries(dicDrafts).filter(([, objDraft]) => objDraft.blnSelected).map(([strID]) => Number(strID)), [dicDrafts]);
  const blnAllSelected = lstEmployees.length > 0 && lstSelectedIDs.length === lstEmployees.length;

  function updateDraft(intEmployeeID: number, dicChange: Partial<RowDraft>) {
    setDicDrafts((dicCurrent) => ({ ...dicCurrent, [intEmployeeID]: { ...dicCurrent[intEmployeeID], ...dicChange } }));
  }

  async function handleCreate() {
    if (!lstSelectedIDs.length) {
      setStrError("Select at least one employee.");
      return;
    }
    setBlnSaving(true);
    setStrError("");
    try {
      setObjResult(await fnfSettlementService.bulkCreate(lstSelectedIDs.map((intID) => ({
        intEmployeeID: intID,
        // Blank fields are filled by the server from the employee's existing records.
        strExitType: dicDrafts[intID].strExitType.trim() || undefined,
        dtResignationDate: dicDrafts[intID].strResignationDate || undefined,
        decNoticePeriodDays: dicDrafts[intID].strNoticeDays === "" ? undefined : Number(dicDrafts[intID].strNoticeDays),
      })), blnCanCalculate && blnCalculate));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Bulk creation failed.");
    } finally {
      setBlnSaving(false);
    }
  }

  const cellSx = { borderBottom: "1px solid #e2e8f0", p: 0.75, fontSize: "0.85rem" } as const;

  return (
    <Dialog open={blnOpen} onClose={() => onClose(Boolean(objResult))} fullWidth maxWidth="lg">
      <DialogTitle>{objResult ? "Bulk F&F creation - result" : "Bulk create F&F settlements"}</DialogTitle>
      <DialogContent>
        {strError ? <Alert severity="error" sx={{ mb: 2 }}>{strError}</Alert> : null}
        {objResult ? (
          <>
            <Alert severity={objResult.intFailed ? "warning" : "success"} sx={{ mb: 2 }}>
              {objResult.intCreated} created{objResult.intCalculated ? `, ${objResult.intCalculated} calculated` : ""}{objResult.intFailed ? `, ${objResult.intFailed} failed (see reason below)` : ""}.
            </Alert>
            <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Employee", "Result", "Net Payable", "Net Recoverable", "Blocking Issues", "Message"].map((strHead) => <Box component="th" key={strHead} sx={{ ...cellSx, textAlign: "left", fontWeight: 700 }}>{strHead}</Box>)}</tr></thead>
              <tbody>
                {objResult.lstResults.map((objRow) => (
                  <tr key={objRow.intEmployeeID}>
                    <Box component="td" sx={cellSx}>
                      {objRow.strSettlementRecordUUID ? (
                        <Link component="button" type="button" underline="none" className="app-master-first-column-link" onClick={() => objRouter.push(`/payroll/fnf-settlements/${objRow.strSettlementRecordUUID}`)}>
                          {objRow.strEmployeeCode} - {objRow.strEmployeeName}
                        </Link>
                      ) : `${objRow.strEmployeeCode || objRow.intEmployeeID} - ${objRow.strEmployeeName || ""}`}
                    </Box>
                    <Box component="td" sx={cellSx}><span className={`app-master-status-pill ${objRow.strStatus === "failed" ? "app-master-status-inactive" : "app-master-status-active"}`}>{objRow.strStatus === "calculated" ? "Created & calculated" : objRow.strStatus === "created" ? "Created" : "Failed"}</span></Box>
                    <Box component="td" sx={cellSx}>{objRow.decNetPayable != null ? formatCurrency(objRow.decNetPayable) : "-"}</Box>
                    <Box component="td" sx={cellSx}>{objRow.decNetRecoverable != null ? formatCurrency(objRow.decNetRecoverable) : "-"}</Box>
                    <Box component="td" sx={cellSx}>{objRow.intBlockingIssues || "-"}</Box>
                    <Box component="td" sx={cellSx}>{objRow.strMessage || "-"}</Box>
                  </tr>
                ))}
              </tbody>
            </Box>
          </>
        ) : (
          <>
            <Typography sx={{ color: "#64748b", mb: 1.5 }}>
              Employees with a date of exit in the employee master and no settlement yet. Leave any field blank to use what the system already holds:
              last working date = date of exit, notice period from the employee master, exit type and resignation date from an earlier cancelled settlement
              (or retirement / contract end from the master dates; otherwise resignation). Leave balances are read from leave records when calculating.
            </Typography>
            {!blnLoading && !lstEmployees.length ? <Alert severity="info">No employees are ready for a settlement. Set the date of exit in the employee master first.</Alert> : (
              <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <Box component="th" sx={{ ...cellSx, width: 48 }}><Checkbox inputProps={{ "controlId": "payroll.fnf-bulk.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>} checked={blnAllSelected} indeterminate={lstSelectedIDs.length > 0 && !blnAllSelected} onChange={() => setDicDrafts((dicCurrent) => Object.fromEntries(Object.entries(dicCurrent).map(([strID, objDraft]) => [strID, { ...objDraft, blnSelected: !blnAllSelected }])))} /></Box>
                    {["Employee", "Last Working Date", "Exit Type", "Resignation Date", "Notice Period Days"].map((strHead) => <Box component="th" key={strHead} sx={{ ...cellSx, textAlign: "left", fontWeight: 700 }}>{strHead}</Box>)}
                  </tr>
                </thead>
                <tbody>
                  {lstEmployees.map((objEmployee) => {
                    const objDraft = dicDrafts[objEmployee.intID];
                    if (!objDraft) return null;
                    return (
                      <tr key={objEmployee.intID}>
                        <Box component="td" sx={cellSx}><Checkbox inputProps={{ "controlId": "payroll.fnf-bulk.row.select.checkbox", "data-row-key": String(objEmployee.intID) } as InputHTMLAttributes<HTMLInputElement>} checked={objDraft.blnSelected} onChange={() => updateDraft(objEmployee.intID, { blnSelected: !objDraft.blnSelected })} /></Box>
                        <Box component="td" sx={cellSx}>{objEmployee.strLabel}</Box>
                        <Box component="td" sx={cellSx}>{objEmployee.dtDateOfExit?.slice(0, 10) || "-"}</Box>
                        <Box component="td" sx={cellSx}><TextField size="small" placeholder="Auto" value={objDraft.strExitType} onChange={(objEvent) => updateDraft(objEmployee.intID, { strExitType: objEvent.target.value })} controlId="payroll.fnf-bulk.row.exit-type.input" /></Box>
                        <Box component="td" sx={cellSx}><TextField size="small" type="date" value={objDraft.strResignationDate} onChange={(objEvent) => updateDraft(objEmployee.intID, { strResignationDate: objEvent.target.value })} controlId="payroll.fnf-bulk.row.resignation-date.input" /></Box>
                        <Box component="td" sx={cellSx}><TextField size="small" type="number" placeholder="Auto" value={objDraft.strNoticeDays} onChange={(objEvent) => updateDraft(objEmployee.intID, { strNoticeDays: objEvent.target.value })} sx={{ width: 110 }} controlId="payroll.fnf-bulk.row.notice-days.input" /></Box>
                      </tr>
                    );
                  })}
                </tbody>
              </Box>
            )}
            {blnCanCalculate ? (
              <FormControlLabel sx={{ mt: 1.5 }} control={<Checkbox checked={blnCalculate} onChange={(_, blnChecked) => setBlnCalculate(blnChecked)} />} label="Calculate each settlement after creating it" />
            ) : null}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => onClose(Boolean(objResult))} disabled={blnSaving} controlId="payroll.fnf-bulk.close.button">{objResult ? "Close" : "Cancel"}</Button>
        {!objResult ? (
          <Button variant="contained" className="app-btn app-btn-primary" startIcon={<GroupAddRoundedIcon />} onClick={() => handleCreate().catch(() => undefined)} disabled={blnSaving || !lstSelectedIDs.length} controlId="payroll.fnf-bulk.create.button">
            Create {lstSelectedIDs.length || ""} Settlement{lstSelectedIDs.length === 1 ? "" : "s"}
          </Button>
        ) : null}
      </DialogActions>
      <BlockingLoader blnOpen={blnSaving || blnLoading} strLabel={blnSaving ? "Creating settlements..." : "Loading employees..."} />
    </Dialog>
  );
}
