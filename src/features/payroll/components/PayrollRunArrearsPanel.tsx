"use client";

import DownloadIcon from "@mui/icons-material/Download";
import PauseCircleOutlineRoundedIcon from "@mui/icons-material/PauseCircleOutlineRounded";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { DottedLoader } from "@/components/shared/BlockingLoader";
import PayrollRunArrearImportDialog from "@/features/payroll/components/PayrollRunArrearImportDialog";
import { payrollRunService } from "@/features/payroll/services/payrollRunService";
import type { ArrearLineRecord, RunArrearEmployeeRecord, RunArrearsRecord } from "@/features/payroll/types";
import { useActionRights } from "@/features/security/hooks/useActionRights";

const ARREAR_HOLD_RIGHT = "payroll_arrear_hold";
const ARREAR_IMPORT_RIGHT = "payroll_arrear_import";
const ARREAR_REGISTER_RIGHT = "report_arrear_register";

type Props = {
  strRunID: string;
  strRunStatus: string;
  strRunLabel: string;
  /** Reprocess one employee after Hold / Release (the run screen's own reprocess). */
  onReprocessEmployee: (intEmployeeID: number, strReason: string) => Promise<void>;
  onMessage: (strMessage: string, strSeverity: "success" | "error") => void;
};

function money(decValue: number | null | undefined): string {
  return Number(decValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function monthLabel(strIsoDate: string): string {
  const dtValue = new Date(`${strIsoDate}T00:00:00`);
  return dtValue.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

/**
 * Arrears of this run (arrear automation): summary, employees with arrears, month x component
 * detail and Hold / Release. Shows nothing when the run has no arrears or arrears are off.
 */
export default function PayrollRunArrearsPanel({ strRunID, strRunStatus, strRunLabel, onReprocessEmployee, onMessage }: Props) {
  const { canDo } = useActionRights();
  const blnCanHold = canDo("payroll_runs", ARREAR_HOLD_RIGHT);
  const blnCanImport = canDo("payroll_runs", ARREAR_IMPORT_RIGHT);
  const blnCanRegister = canDo("salary_register", ARREAR_REGISTER_RIGHT);
  const [blnImportOpen, setBlnImportOpen] = useState(false);

  async function downloadRegister() {
    try {
      await payrollRunService.downloadArrearRegister(strRunID);
    } catch (objError) {
      onMessage((await createApiRequestError(objError)).message, "error");
    }
  }
  const [objData, setObjData] = useState<RunArrearsRecord | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [objDetailEmployee, setObjDetailEmployee] = useState<RunArrearEmployeeRecord | null>(null);
  const [lstDetailLines, setLstDetailLines] = useState<ArrearLineRecord[]>([]);
  const [blnBusy, setBlnBusy] = useState(false);
  const blnFinalized = ["FINALIZED", "CANCELLED"].includes(strRunStatus);

  const load = useCallback(async () => {
    try {
      setObjData(await payrollRunService.getRunArrears(strRunID));
    } catch (objError) {
      onMessage((await createApiRequestError(objError)).message, "error");
    } finally {
      setBlnLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strRunID]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDetail(objEmployee: RunArrearEmployeeRecord) {
    setObjDetailEmployee(objEmployee);
    setLstDetailLines([]);
    try {
      setLstDetailLines(await payrollRunService.getEmployeeArrearLines(strRunID, objEmployee.intEmployeeID));
    } catch (objError) {
      onMessage((await createApiRequestError(objError)).message, "error");
    }
  }

  async function toggleHold(objEmployee: RunArrearEmployeeRecord) {
    setBlnBusy(true);
    try {
      const blnHold = !objEmployee.blnHeld;
      await payrollRunService.setEmployeeArrearHold(strRunID, objEmployee.intEmployeeID, blnHold);
      await onReprocessEmployee(
        objEmployee.intEmployeeID,
        blnHold ? "Arrear held to a later run." : "Held arrear released.",
      );
      onMessage(blnHold ? `Arrear of ${objEmployee.strEmployeeCode} held; it will be checked again next run.` : `Arrear of ${objEmployee.strEmployeeCode} released.`, "success");
      await load();
    } catch (objError) {
      onMessage((await createApiRequestError(objError)).message, "error");
    } finally {
      setBlnBusy(false);
    }
  }

  async function acknowledge() {
    setBlnBusy(true);
    try {
      await payrollRunService.acknowledgeRunArrears(strRunID);
      onMessage("Arrears marked as reviewed. The run can now be finalized.", "success");
      await load();
    } catch (objError) {
      onMessage((await createApiRequestError(objError)).message, "error");
    } finally {
      setBlnBusy(false);
    }
  }

  if (blnLoading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}><DottedLoader /></Box>;
  }
  const objImportDialog = (
    <PayrollRunArrearImportDialog
      blnOpen={blnImportOpen}
      strRunID={strRunID}
      strRunLabel={strRunLabel}
      onClose={() => setBlnImportOpen(false)}
      onImported={async (lstEmployeeIDs, strReason) => {
        for (const intEmployeeID of lstEmployeeIDs) {
          await onReprocessEmployee(intEmployeeID, strReason);
        }
        await load();
      }}
    />
  );
  const objImportButton = blnCanImport && !blnFinalized ? (
    <Button size="small" className="app-btn app-btn-outline" startIcon={<UploadFileIcon />} onClick={() => setBlnImportOpen(true)} controlId="payroll.run-detail.arrears.import.button">
      Import Arrears
    </Button>
  ) : null;
  if (!objData?.blnAvailable || (!objData.lstEmployees.length && !(objData.dicSummary?.lstFailures?.length))) {
    return objImportButton ? (
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
        {objImportButton}
        {objImportDialog}
      </Box>
    ) : null;
  }
  // Imported arrears are paid even while automatic arrears are in preview.
  const blnPreview = !objData.lstEmployees.some((objItem) => ["PAYABLE", "PAID"].includes(objItem.strStatus));
  const objSummary = objData.dicSummary;
  const decTotal = objData.lstEmployees.reduce((decSum, objItem) => decSum + (objItem.blnHeld ? 0 : objItem.decArrearAmount), 0);
  const decRecovery = objData.lstEmployees.reduce((decSum, objItem) => decSum + (objItem.blnHeld ? 0 : objItem.decRecoveryAmount), 0);

  return (
    <Box
      sx={{ border: "1px solid #dfe9f5", borderRadius: "10px", p: 1.5, mb: 1.5, backgroundColor: "#fff" }}
      data-testid="payroll.run-detail.arrears"
    >
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }} justifyContent="space-between">
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography sx={{ fontWeight: 800, color: "#172033" }}>Arrears</Typography>
          <Chip size="small" color={blnPreview ? "default" : "primary"} label={blnPreview ? "Preview - not paid" : "Paid in this run"} />
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography sx={{ color: "#48638d", fontSize: "0.85rem" }}>
            {objData.lstEmployees.length} employee(s) - arrears {money(decTotal)}
            {decRecovery ? ` - recoveries ${money(decRecovery)}` : ""}
          </Typography>
          {blnCanRegister ? (
            <Button size="small" className="app-btn app-btn-outline" startIcon={<DownloadIcon />} onClick={() => void downloadRegister()} controlId="payroll.run-detail.arrears.register.button">
              Arrear Register
            </Button>
          ) : null}
          {objImportButton}
        </Stack>
      </Stack>
      {objImportDialog}
      {blnPreview ? (
        <Typography sx={{ color: "#60749b", fontSize: "0.75rem", mt: 0.5 }}>
          Calculated for checking only. Net pay, TDS, PF, ESI, payslips and registers do not include these amounts.
        </Typography>
      ) : null}
      {objSummary?.lstFailures?.length ? (
        <Alert severity="warning" sx={{ mt: 1 }}>
          Arrears could not be calculated for {objSummary.lstFailures.map((objItem) => objItem.strEmployeeCode).join(", ")}. Their regular salary is not affected; see the validation results.
        </Alert>
      ) : null}
      {objData.blnRequiresReviewAck && !blnPreview && !blnFinalized ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
          {objData.blnReviewAcknowledged ? (
            <Chip size="small" color="success" icon={<TaskAltRoundedIcon />} label="Arrears reviewed" />
          ) : (
            <Button size="small" className="app-btn app-btn-primary" startIcon={<TaskAltRoundedIcon />} onClick={() => void acknowledge()} disabled={blnBusy} controlId="payroll.run-detail.arrears.review-ack.button">
              Mark arrears reviewed
            </Button>
          )}
        </Stack>
      ) : null}
      <Table size="small" sx={{ mt: 1 }}>
        <TableHead>
          <TableRow>
            <TableCell>Employee</TableCell>
            <TableCell>Months</TableCell>
            <TableCell align="right">Arrear</TableCell>
            <TableCell align="right">Recovery</TableCell>
            <TableCell align="right">PF on arrears</TableCell>
            <TableCell align="right">ESI on arrears</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right" />
          </TableRow>
        </TableHead>
        <TableBody>
          {objData.lstEmployees.map((objEmployee) => (
            <TableRow key={objEmployee.intEmployeeID} hover sx={{ cursor: "pointer" }} onClick={() => void openDetail(objEmployee)}>
              <TableCell>{objEmployee.strEmployeeCode} - {objEmployee.strEmployeeName}</TableCell>
              <TableCell>{objEmployee.strPeriodLabel}</TableCell>
              <TableCell align="right">{money(objEmployee.decArrearAmount)}</TableCell>
              <TableCell align="right">{objEmployee.decRecoveryAmount ? money(objEmployee.decRecoveryAmount) : ""}</TableCell>
              <TableCell align="right">{objEmployee.decPfEmployee ? money(objEmployee.decPfEmployee) : ""}</TableCell>
              <TableCell align="right">{objEmployee.decEsiEmployee ? money(objEmployee.decEsiEmployee) : ""}</TableCell>
              <TableCell>
                {objEmployee.blnHeld ? <Chip size="small" color="warning" label="Held" /> : <Chip size="small" label={objEmployee.strStatus === "PAID" ? "Paid" : objEmployee.strStatus === "PAYABLE" ? "To pay" : "Preview"} />}
              </TableCell>
              <TableCell align="right" onClick={(objEvent) => objEvent.stopPropagation()}>
                {blnCanHold && !blnFinalized ? (
                  <Button
                    size="small"
                    className="app-btn app-btn-outline"
                    startIcon={objEmployee.blnHeld ? <PlayCircleOutlineRoundedIcon /> : <PauseCircleOutlineRoundedIcon />}
                    onClick={() => void toggleHold(objEmployee)}
                    disabled={blnBusy}
                    controlId={`payroll.run-detail.arrears.${objEmployee.intEmployeeID}.hold.button`}
                  >
                    {objEmployee.blnHeld ? "Release" : "Hold"}
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={Boolean(objDetailEmployee)} onClose={() => setObjDetailEmployee(null)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Arrears - {objDetailEmployee?.strEmployeeCode} {objDetailEmployee?.strEmployeeName}
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ color: "#60749b", fontSize: "0.78rem", mb: 1 }}>
            Arrear = correct amount - amount paid - arrear already paid, each month with that month&apos;s own paid days. PF / ESI use that month&apos;s rules.
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Month</TableCell>
                <TableCell>Item</TableCell>
                <TableCell align="right">Paid days</TableCell>
                <TableCell align="right">Old rate</TableCell>
                <TableCell align="right">New rate</TableCell>
                <TableCell align="right">Paid</TableCell>
                <TableCell align="right">Correct</TableCell>
                <TableCell align="right">Already paid</TableCell>
                <TableCell align="right">Arrear</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lstDetailLines.map((objLine) => (
                <TableRow key={objLine.intID}>
                  <TableCell>{monthLabel(objLine.dtOriginalPayrollMonth)}</TableCell>
                  <TableCell>{objLine.strLineKind === "earning" ? objLine.strComponentName || objLine.strComponentCode : objLine.strLineKindLabel}</TableCell>
                  <TableCell align="right">{objLine.decPaidDays} / {objLine.decCalendarDays}</TableCell>
                  <TableCell align="right">{objLine.decPaidRate === null ? "" : money(objLine.decPaidRate)}</TableCell>
                  <TableCell align="right">{objLine.decCorrectRate === null ? "" : money(objLine.decCorrectRate)}</TableCell>
                  <TableCell align="right">{money(objLine.decPaidAmount)}</TableCell>
                  <TableCell align="right">{money(objLine.decCorrectAmount)}</TableCell>
                  <TableCell align="right">{objLine.decAlreadyArrearedAmount ? money(objLine.decAlreadyArrearedAmount) : ""}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{money(objLine.decArrearAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setObjDetailEmployee(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
