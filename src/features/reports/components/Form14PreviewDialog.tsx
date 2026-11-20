"use client";

import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Checkbox,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";

import Form14IssueSummary from "@/features/reports/components/Form14IssueSummary";
import Form14RegisterSheet from "@/features/reports/components/Form14RegisterSheet";
import { form14ReportService, type Form14Register } from "@/features/reports/services/form14ReportService";

type Form14PreviewDialogProps = {
  intEmployeeID: number;
  intYear: number;
  blnShowAdditional: boolean;
  blnCanExport: boolean;
  blnCanClose: boolean;
  onClose: () => void;
  // Called after a reverse / opening / profile change so the list behind the dialog can refresh.
  onChanged: () => void;
};

function messageOf(objError: unknown, strFallback: string) {
  return objError instanceof Error ? objError.message : strFallback;
}

export default function Form14PreviewDialog({
  intEmployeeID,
  intYear,
  blnShowAdditional,
  blnCanExport,
  blnCanClose,
  onClose,
  onChanged,
}: Form14PreviewDialogProps) {
  const [dicRegister, setDicRegister] = useState<Form14Register | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnBusy, setBlnBusy] = useState(false);
  const [strError, setStrError] = useState("");
  const [strInfo, setStrInfo] = useState("");
  const [strPanel, setStrPanel] = useState<"" | "details" | "opening" | "reverse">("");

  const [strSerialNo, setStrSerialNo] = useState("");
  const [strRegisterNo, setStrRegisterNo] = useState("");
  const [blnChildOverride, setBlnChildOverride] = useState(false);
  const [strOpeningBalance, setStrOpeningBalance] = useState("0");
  const [strOpeningEarned, setStrOpeningEarned] = useState("0");
  const [strRefused, setStrRefused] = useState("0");
  const [strReason, setStrReason] = useState("");
  const intRequestSequence = useRef(0);

  const load = useCallback(async () => {
    const intSequence = intRequestSequence.current + 1;
    intRequestSequence.current = intSequence;
    setBlnLoading(true);
    setStrError("");
    try {
      const dicResult = await form14ReportService.getEmployeeRegister(intEmployeeID, intYear);
      if (intRequestSequence.current !== intSequence) {
        return;
      }
      setDicRegister(dicResult);
      setStrSerialNo(dicResult.dicHeader.strSerialNo === null || dicResult.dicHeader.strSerialNo === undefined ? "" : String(dicResult.dicHeader.strSerialNo));
      setStrRegisterNo(dicResult.dicHeader.strRegisterNo === dicResult.dicHeader.strEmployeeCode ? "" : dicResult.dicHeader.strRegisterNo);
      setBlnChildOverride(dicResult.dicHeader.strAdultChild === "Child");
      setStrOpeningBalance(String(dicResult.dicOpening.decBalance ?? 0));
      setStrOpeningEarned(String(dicResult.dicOpening.decEarned ?? 0));
      setStrRefused(String(dicResult.dicOpening.decRefused798 ?? 0));
    } catch (objError) {
      if (intRequestSequence.current === intSequence) {
        setStrError(messageOf(objError, "Unable to load the Form 14 register."));
      }
    } finally {
      if (intRequestSequence.current === intSequence) {
        setBlnLoading(false);
      }
    }
  }, [intEmployeeID, intYear]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function runAction(fnAction: () => Promise<unknown>, strSuccess: string, blnReload: boolean) {
    setBlnBusy(true);
    setStrError("");
    setStrInfo("");
    try {
      await fnAction();
      setStrInfo(strSuccess);
      setStrPanel("");
      setStrReason("");
      if (blnReload) {
        onChanged();
        await load();
      }
    } catch (objError) {
      setStrError(messageOf(objError, "The action could not be completed."));
    } finally {
      setBlnBusy(false);
    }
  }

  const dicFilters = { intYear, intEmployeeID, strStatus: "both" as const };
  const strFallbackName = `Form14_${intYear}_${dicRegister?.dicHeader.strEmployeeCode ?? intEmployeeID}`;

  function saveOpening() {
    const decBalance = Number(strOpeningBalance);
    const decEarned = Number(strOpeningEarned);
    const decRefused = Number(strRefused);
    if ([decBalance, decEarned, decRefused].some((decValue) => Number.isNaN(decValue) || decValue < 0)) {
      setStrError("Opening figures must be numbers of zero or more.");
      return;
    }
    runAction(
      () => form14ReportService.setOpening({
        intYear,
        intEmployeeID,
        decOpeningBalance: decBalance,
        decOpeningEarned: decEarned,
        decRefused798Balance: decRefused,
        strReason: strReason.trim() || undefined,
      }),
      "Opening balance saved.",
      true,
    ).catch(() => undefined);
  }

  function saveDetails() {
    const strSerial = strSerialNo.trim();
    if (strSerial && (!/^\d+$/.test(strSerial))) {
      setStrError("Serial number must be a whole number.");
      return;
    }
    runAction(
      () => form14ReportService.saveProfile(intEmployeeID, {
        intRegisterSerialNo: strSerial ? Number(strSerial) : null,
        strRegisterNo: strRegisterNo.trim() || null,
        blnIsChildWorkerOverride: blnChildOverride,
      }),
      "Register details saved.",
      true,
    ).catch(() => undefined);
  }

  function reverseClose() {
    if (strReason.trim().length < 3) {
      setStrError("Enter a reason of at least 3 characters to reverse the close.");
      return;
    }
    runAction(() => form14ReportService.reverseYear(intYear, intEmployeeID, strReason.trim()), "Year-end close reversed.", true).catch(() => undefined);
  }

  const lstIssues = dicRegister?.lstIssues ?? [];

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xl" scroll="paper" controlId="reports.form14.preview.dialog">
      <DialogTitle>
        Form 14{dicRegister ? ` – ${dicRegister.dicHeader.strName} (${dicRegister.dicHeader.strEmployeeCode})` : ""} · {intYear}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {strError ? <Alert severity="error" onClose={() => setStrError("")}>{strError}</Alert> : null}
          {strInfo ? <Alert severity="success" onClose={() => setStrInfo("")}>{strInfo}</Alert> : null}
          {blnLoading ? <Typography>Loading register…</Typography> : null}

          {dicRegister ? (
            <>
              <Form14IssueSummary lstGroups={[{ strKey: "register", lstItems: lstIssues }]} strControlId="reports.form14.preview.validations" />
              <Form14RegisterSheet dicRegister={dicRegister} blnShowAdditional={blnShowAdditional} />

              {blnCanClose ? (
                <Box sx={{ borderTop: "1px solid #e2e8f0", pt: 1.5 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button variant="outlined" size="small" onClick={() => setStrPanel(strPanel === "details" ? "" : "details")} disabled={blnBusy} controlId="reports.form14.preview.details-toggle.button">
                      Register details
                    </Button>
                    {dicRegister.blnLocked ? (
                      <Button variant="outlined" color="warning" size="small" onClick={() => setStrPanel(strPanel === "reverse" ? "" : "reverse")} disabled={blnBusy} controlId="reports.form14.preview.reverse-toggle.button">
                        Reverse close
                      </Button>
                    ) : (
                      <Button variant="outlined" size="small" onClick={() => setStrPanel(strPanel === "opening" ? "" : "opening")} disabled={blnBusy} controlId="reports.form14.preview.opening-toggle.button">
                        Set opening balance
                      </Button>
                    )}
                  </Stack>

                  {strPanel === "details" ? (
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mt: 1.5 }} alignItems={{ md: "center" }}>
                      <TextField className="app-mui-text-field" size="small" label="Serial number (S.No)" value={strSerialNo} onChange={(objEvent) => setStrSerialNo(objEvent.target.value)} InputLabelProps={{ shrink: true }} controlId="reports.form14.details.serial-no.input" />
                      <TextField className="app-mui-text-field" size="small" label="Register number" value={strRegisterNo} onChange={(objEvent) => setStrRegisterNo(objEvent.target.value)} inputProps={{ maxLength: 30 }} helperText="Blank uses the employee code" InputLabelProps={{ shrink: true }} controlId="reports.form14.details.register-no.input" />
                      <FormControlLabel
                        control={<Checkbox checked={blnChildOverride} onChange={(objEvent) => setBlnChildOverride(objEvent.target.checked)} controlId="reports.form14.details.child-worker.checkbox" />}
                        label="Treat as child worker"
                      />
                      <Button variant="contained" size="small" onClick={saveDetails} disabled={blnBusy} controlId="reports.form14.details.save.button">Save details</Button>
                    </Stack>
                  ) : null}

                  {strPanel === "opening" ? (
                    <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                        <TextField className="app-mui-text-field" size="small" type="number" label="Balance from previous year (col 9)" value={strOpeningBalance} onChange={(objEvent) => setStrOpeningBalance(objEvent.target.value)} inputProps={{ min: 0, step: 0.5 }} InputLabelProps={{ shrink: true }} controlId="reports.form14.opening.balance.input" />
                        <TextField className="app-mui-text-field" size="small" type="number" label="Earned during year (col 10)" value={strOpeningEarned} onChange={(objEvent) => setStrOpeningEarned(objEvent.target.value)} inputProps={{ min: 0, step: 0.5 }} InputLabelProps={{ shrink: true }} controlId="reports.form14.opening.earned.input" />
                        <TextField className="app-mui-text-field" size="small" type="number" label="Refused u/s 79(8) part of balance" value={strRefused} onChange={(objEvent) => setStrRefused(objEvent.target.value)} inputProps={{ min: 0, step: 0.5 }} InputLabelProps={{ shrink: true }} controlId="reports.form14.opening.refused.input" />
                      </Stack>
                      <TextField className="app-mui-text-field" size="small" label="Reason (optional)" value={strReason} onChange={(objEvent) => setStrReason(objEvent.target.value)} inputProps={{ maxLength: 500 }} InputLabelProps={{ shrink: true }} controlId="reports.form14.opening.reason.input" />
                      <Box><Button variant="contained" size="small" onClick={saveOpening} disabled={blnBusy} controlId="reports.form14.opening.save.button">Save opening balance</Button></Box>
                    </Stack>
                  ) : null}

                  {strPanel === "reverse" ? (
                    <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                      <Typography variant="body2">
                        Reversing re-opens {intYear} for this worker and withdraws the opening balance it carried into {intYear + 1}.
                      </Typography>
                      <TextField className="app-mui-text-field" size="small" required label="Reason for reversal" value={strReason} onChange={(objEvent) => setStrReason(objEvent.target.value)} inputProps={{ maxLength: 500 }} InputLabelProps={{ shrink: true }} controlId="reports.form14.reverse.reason.input" />
                      <Box><Button variant="contained" color="warning" size="small" onClick={reverseClose} disabled={blnBusy} controlId="reports.form14.reverse.confirm.button">Reverse close</Button></Box>
                    </Stack>
                  ) : null}
                </Box>
              ) : null}
            </>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        {blnCanExport ? (
          <>
            <Button startIcon={<PrintRoundedIcon />} disabled={blnBusy || !dicRegister} controlId="reports.form14.preview.print.button"
              onClick={() => {
                setBlnBusy(true);
                setStrError("");
                form14ReportService.printPdf(dicFilters, { strPageSize: "A4", blnShowAdditional }, `${strFallbackName}.pdf`)
                  .catch((objError) => setStrError(messageOf(objError, "Unable to open the PDF.")))
                  .finally(() => setBlnBusy(false));
              }}>
              Print
            </Button>
            {(["pdf", "xlsx"] as const).map((strFormat) => (
              <Button key={strFormat} startIcon={<DownloadRoundedIcon />} disabled={blnBusy || !dicRegister} controlId={`reports.form14.preview.download-${strFormat}.button`}
                onClick={() => {
                  setBlnBusy(true);
                  setStrError("");
                  form14ReportService.downloadExport(dicFilters, { strFormat, strPageSize: "A4", blnShowAdditional }, `${strFallbackName}.${strFormat}`)
                    .catch((objError) => setStrError(messageOf(objError, "Unable to download the file.")))
                    .finally(() => setBlnBusy(false));
                }}>
                {strFormat === "pdf" ? "Download PDF" : "Download Excel"}
              </Button>
            ))}
          </>
        ) : null}
        <Button onClick={onClose} controlId="reports.form14.preview.close.button">Close</Button>
      </DialogActions>
    </Dialog>
  );
}
