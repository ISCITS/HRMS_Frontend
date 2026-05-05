"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import PayslipPreviewContent from "@/features/payroll/components/PayslipPreviewContent";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { payrollRunService } from "@/features/payroll/services/payrollRunService";
import { payslipService } from "@/features/payroll/services/payslipService";
import type {
  PayslipPreviewRecord,
  PayslipRunListRecord,
  PayrollRunDetailRecord,
  PayrollProcessSummary,
  PayrollValidationSummary,
  PayrollRunStatus,
} from "@/features/payroll/types";
import {
  buildPayslipFileName,
  downloadPayslipHtml,
  printPayslipHtml,
} from "@/features/payroll/utils/payslipDocument";

type PayrollRunDetailPageProps = {
  intRunID: number;
};

function formatDateTime(strDate: string | null) {
  if (!strDate) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(strDate));
}

function formatMonth(strDate: string) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(strDate));
}

function formatCurrency(decValue: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(decValue || 0);
}

function getStatusPillSx(strStatus: string) {
  const dicToneByStatus: Record<string, { background: string; color: string }> = {
    Open: { background: "#2563eb", color: "#fff" },
    Submitted: { background: "#ea580c", color: "#fff" },
    Approved: { background: "#16a34a", color: "#fff" },
    Processed: { background: "#0f766e", color: "#fff" },
    Closed: { background: "#475569", color: "#fff" },
  };
  return dicToneByStatus[strStatus] ?? { background: "#2563eb", color: "#fff" };
}

function SummaryCard({
  strLabel,
  strValue,
}: {
  strLabel: string;
  strValue: string;
}) {
  return (
    <Box
      sx={{
        border: "1px solid #d9e6ef",
        borderRadius: 3,
        background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
        p: 2,
      }}
    >
      <Typography sx={{ color: "#64748b", fontSize: "0.84rem", mb: 0.6 }}>
        {strLabel}
      </Typography>
      <Typography sx={{ color: "#0f172a", fontSize: "1.45rem", fontWeight: 800 }}>
        {strValue}
      </Typography>
    </Box>
  );
}

export default function PayrollRunDetailPage({
  intRunID,
}: PayrollRunDetailPageProps) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("payroll-runs");
  const { t: tCommon } = useModuleLabels("common");
  const [objRun, setObjRun] = useState<PayrollRunDetailRecord | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const [strRunStatus, setStrRunStatus] = useState<PayrollRunStatus>("Open");
  const [blnIsLocked, setBlnIsLocked] = useState(false);
  const [objValidationSummary, setObjValidationSummary] =
    useState<PayrollValidationSummary | null>(null);
  const [objProcessSummary, setObjProcessSummary] =
    useState<PayrollProcessSummary | null>(null);
  const [lstPayslips, setLstPayslips] = useState<PayslipRunListRecord[]>([]);
  const [objPayslipPreview, setObjPayslipPreview] =
    useState<PayslipPreviewRecord | null>(null);
  const [blnPayslipLoading, setBlnPayslipLoading] = useState(false);
  const [blnPayslipDialogOpen, setBlnPayslipDialogOpen] = useState(false);

  async function loadRun(blnShowLoader = true) {
    if (blnShowLoader) {
      setBlnLoading(true);
    }
    setStrError("");
    try {
      const dicRun = await payrollRunService.getPayrollRunById(intRunID);
      setObjRun(dicRun);
      setStrRunStatus(dicRun.strRunStatus);
      setBlnIsLocked(dicRun.blnIsLocked);
      if (["Processed", "Closed"].includes(dicRun.strRunStatus)) {
        setLstPayslips(await payslipService.getRunPayslips(intRunID));
      } else {
        setLstPayslips([]);
      }
    } catch (objError) {
      setStrError(
        objError instanceof Error ? objError.message : "Unable to load payroll run."
      );
    } finally {
      if (blnShowLoader) {
        setBlnLoading(false);
      }
    }
  }

  useEffect(() => {
    loadRun().catch(() => undefined);
  }, [intRunID]);

  async function saveStatus() {
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicRun = await payrollRunService.updatePayrollRunStatus(
        intRunID,
        strRunStatus,
        blnIsLocked
      );
      setObjRun(dicRun);
      setStrSuccess(t("status_update_success", "Payroll run status updated successfully."));
    } catch (objError) {
      setStrError(
        objError instanceof Error
          ? objError.message
          : "Unable to update payroll run status."
      );
    } finally {
      setBlnSaving(false);
    }
  }

  async function validateRun() {
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    setObjProcessSummary(null);
    try {
      const dicSummary = await payrollRunService.validatePayrollRun(intRunID);
      setObjValidationSummary(dicSummary);
      setStrSuccess(t("validation_complete", "Payroll validation completed."));
      await loadRun(false);
    } catch (objError) {
      setStrError(
        objError instanceof Error ? objError.message : "Unable to validate payroll run."
      );
    } finally {
      setBlnSaving(false);
    }
  }

  async function processRun() {
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicSummary = await payrollRunService.processPayrollRun(intRunID);
      setObjProcessSummary(dicSummary);
      setObjValidationSummary(dicSummary.dicValidationSummary ?? null);
      setStrSuccess(t("process_complete", "Payroll processing completed."));
      await loadRun(false);
    } catch (objError) {
      setStrError(
        objError instanceof Error ? objError.message : "Unable to process payroll run."
      );
    } finally {
      setBlnSaving(false);
    }
  }

  async function reprocessRun() {
    const strReason = window.prompt(t("reprocess_reason", "Reason for reprocess"));
    if (!strReason?.trim()) {
      return;
    }
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicSummary = await payrollRunService.reprocessPayrollRun(
        intRunID,
        strReason.trim()
      );
      setObjProcessSummary(dicSummary);
      setObjValidationSummary(dicSummary.dicValidationSummary ?? null);
      setStrSuccess(t("reprocess_complete", "Payroll reprocessing completed."));
      await loadRun(false);
    } catch (objError) {
      setStrError(
        objError instanceof Error
          ? objError.message
          : "Unable to reprocess payroll run."
      );
    } finally {
      setBlnSaving(false);
    }
  }

  async function closeRun() {
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicRun = await payrollRunService.closePayrollRun(intRunID);
      setObjRun(dicRun);
      setStrRunStatus(dicRun.strRunStatus);
      setBlnIsLocked(dicRun.blnIsLocked);
      setStrSuccess(t("close_complete", "Payroll run closed successfully."));
    } catch (objError) {
      setStrError(
        objError instanceof Error ? objError.message : "Unable to close payroll run."
      );
    } finally {
      setBlnSaving(false);
    }
  }

  async function reloadPayslips() {
    if (!objRun || !["Processed", "Closed"].includes(objRun.strRunStatus)) {
      setLstPayslips([]);
      return;
    }
    setLstPayslips(await payslipService.getRunPayslips(intRunID));
  }

  async function generateAllPayslips() {
    setBlnPayslipLoading(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicSummary = await payslipService.generateAll(intRunID);
      setStrSuccess(
        t(
          "payslip_generate_all_success",
          `${dicSummary.intGeneratedCount} payslips generated successfully.`
        )
      );
      await reloadPayslips();
    } catch (objError) {
      setStrError(
        objError instanceof Error ? objError.message : "Unable to generate payslips."
      );
    } finally {
      setBlnPayslipLoading(false);
    }
  }

  async function generatePayslip(dicRow: PayslipRunListRecord) {
    setBlnPayslipLoading(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicPayslip = await payslipService.generatePayslip(
        intRunID,
        dicRow.intEmployeeID
      );
      setStrSuccess(t("payslip_generated", "Payslip generated successfully."));
      await reloadPayslips();
      return dicPayslip;
    } catch (objError) {
      setStrError(
        objError instanceof Error ? objError.message : "Unable to generate payslip."
      );
      return null;
    } finally {
      setBlnPayslipLoading(false);
    }
  }

  async function viewPayslip(dicRow: PayslipRunListRecord) {
    setBlnPayslipLoading(true);
    setStrError("");
    try {
      const dicPayslip = await payslipService.getPayslipPreview(
        intRunID,
        dicRow.intEmployeeID
      );
      setObjPayslipPreview(dicPayslip);
      setBlnPayslipDialogOpen(true);
    } catch (objError) {
      setStrError(
        objError instanceof Error ? objError.message : "Unable to load payslip preview."
      );
    } finally {
      setBlnPayslipLoading(false);
    }
  }

  async function openPayslipDocument(dicRow: PayslipRunListRecord, blnPrint: boolean) {
    setBlnPayslipLoading(true);
    setStrError("");
    try {
      let intPayslipID = dicRow.intPayslipID;
      if (!intPayslipID) {
        const dicPayslip = await generatePayslip(dicRow);
        intPayslipID = dicPayslip?.intPayslipID ?? null;
      }
      if (!intPayslipID) {
        return;
      }
      const strHtml = await payslipService.getDownloadHtml(intPayslipID);
      if (blnPrint) {
        printPayslipHtml(strHtml);
      } else {
        downloadPayslipHtml(
          strHtml,
          buildPayslipFileName("payslip", dicRow.strPayslipNumber, dicRow.strEmployeeCode)
        );
      }
    } catch (objError) {
      setStrError(
        objError instanceof Error ? objError.message : "Unable to download payslip document."
      );
    } finally {
      setBlnPayslipLoading(false);
    }
  }

  if (blnLoading) {
    return <BlockingLoader blnOpen strLabel={t("loading_run", "Loading payroll run...")} />;
  }

  if (!objRun) {
    return (
      <Box className={styles.page}>
        <Alert severity="error">{strError || t("not_found", "Payroll run not found.")}</Alert>
      </Box>
    );
  }

  return (
    <Box
      className={styles.page}
      sx={{
        minHeight: "100%",
        height: "auto",
        overflowX: "hidden",
        overflowY: "visible",
        pb: 3,
      }}
    >
      <Typography className={styles.breadcrumbs}>
        {t("breadcrumbs_detail", "Payroll / Payroll Runs / Detail")}
      </Typography>
      <Box className={styles.topBar}>
        <Button
          className={styles.secondaryButton}
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => objRouter.push("/payroll/runs")}
        >
          {t("back_to_list", "Back to List")}
        </Button>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button
            className={styles.secondaryButton}
            startIcon={<FactCheckRoundedIcon />}
            onClick={validateRun}
            disabled={blnSaving || objRun.strRunStatus === "Closed"}
          >
            {t("validate", "Validate")}
          </Button>
          <Button
            className={styles.primaryButton}
            startIcon={<PlayArrowRoundedIcon />}
            onClick={processRun}
            disabled={blnSaving || objRun.strRunStatus !== "Approved"}
          >
            {t("process", "Process")}
          </Button>
          <Button
            className={styles.secondaryButton}
            startIcon={<RestartAltRoundedIcon />}
            onClick={reprocessRun}
            disabled={blnSaving || objRun.strRunStatus !== "Processed"}
          >
            {t("reprocess", "Reprocess")}
          </Button>
          <Button
            className={styles.secondaryButton}
            startIcon={<ReceiptLongRoundedIcon />}
            onClick={generateAllPayslips}
            disabled={
              blnSaving ||
              blnPayslipLoading ||
              !["Processed", "Closed"].includes(objRun.strRunStatus)
            }
          >
            {t("generate_payslips", "Generate Payslips")}
          </Button>
          <Button
            className={styles.secondaryButton}
            startIcon={<ReceiptLongRoundedIcon />}
            onClick={() => objRouter.push("/payroll/results")}
          >
            {t("view_results", "Results")}
          </Button>
          <Button
            className={styles.secondaryButton}
            startIcon={<LockRoundedIcon />}
            onClick={closeRun}
            disabled={
              blnSaving ||
              objRun.strRunStatus !== "Processed" ||
              objRun.dicSummary.intValidationErrorCount > 0
            }
          >
            {t("close", "Close")}
          </Button>
        </Stack>
      </Box>

      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader}>
          <Typography className={styles.title}>{objRun.strRunName}</Typography>
          <span className={styles.statusPill} style={getStatusPillSx(objRun.strRunStatus)}>
            {objRun.strRunStatus}
          </span>
        </Box>
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" },
            mt: 1.5,
          }}
        >
          <SummaryCard strLabel={t("run_code", "Run Code")} strValue={objRun.strRunCode} />
          <SummaryCard strLabel={t("payroll_month", "Payroll Month")} strValue={formatMonth(objRun.dtPayrollMonth)} />
          <SummaryCard strLabel={t("employees", "Employees")} strValue={String(objRun.intEmployeeCount || objRun.dicSummary.intInputCount)} />
          <SummaryCard strLabel={t("processed", "Processed")} strValue={String(objRun.intProcessedEmployeeCount || objRun.dicSummary.intProcessedCount)} />
          <SummaryCard strLabel={t("gross_total", "Gross Total")} strValue={formatCurrency(objRun.decGrossPayTotal)} />
          <SummaryCard strLabel={t("deduction_total", "Deductions")} strValue={formatCurrency(objRun.decDeductionTotal)} />
          <SummaryCard strLabel={t("tax_total", "Tax")} strValue={formatCurrency(objRun.decTaxTotal)} />
          <SummaryCard strLabel={t("net_total", "Net Pay")} strValue={formatCurrency(objRun.decNetPayTotal)} />
        </Box>
      </Box>

        <Box
          className={styles.tableCard}
          sx={{
            flex: "0 0 auto",
            gap: 2,
            overflow: "visible",
            p: 2,
          }}
        >
        {strError ? <Alert severity="error">{strError}</Alert> : null}
        {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}
        {blnPayslipLoading ? (
          <Alert severity="info">{t("payslip_preparing", "Preparing payslips...")}</Alert>
        ) : null}

        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          }}
        >
          <Box
            sx={{
              border: "1px solid #d9e6ef",
              borderRadius: 3,
              background: "#fff",
              p: 2,
            }}
          >
            <Typography sx={{ color: "#173b63", fontWeight: 800, mb: 1.5 }}>
              {t("summary_title", "Run Summary")}
            </Typography>
            <Stack spacing={1}>
              <Typography>{t("draft_count", "Draft Inputs")}: {objRun.dicSummary.intDraftCount}</Typography>
              <Typography>{t("submitted_count", "Submitted Inputs")}: {objRun.dicSummary.intSubmittedCount}</Typography>
              <Typography>{t("total_lwp", "Total LWP Days")}: {objRun.dicSummary.decTotalLwpDays}</Typography>
              <Typography>{t("total_lop", "Total LOP Days")}: {objRun.dicSummary.decTotalLopDays}</Typography>
              <Typography>{t("validation_errors", "Validation Errors")}: {objRun.dicSummary.intValidationErrorCount}</Typography>
              <Typography>{t("validation_warnings", "Validation Warnings")}: {objRun.dicSummary.intValidationWarningCount}</Typography>
            </Stack>
          </Box>

          <Box
            sx={{
              border: "1px solid #d9e6ef",
              borderRadius: 3,
              background: "#fff",
              p: 2,
            }}
          >
            <Typography sx={{ color: "#173b63", fontWeight: 800, mb: 1.5 }}>
              {t("status_title", "Status Update")}
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                select
                label={t("status", "Status")}
                value={strRunStatus}
                onChange={(objEvent) =>
                  setStrRunStatus(objEvent.target.value as PayrollRunStatus)
                }
                fullWidth
              >
                <MenuItem value="Open">{t("status_open", "Open")}</MenuItem>
                <MenuItem value="Submitted">{t("status_submitted", "Submitted")}</MenuItem>
                <MenuItem value="Approved">{t("status_approved", "Approved")}</MenuItem>
                <MenuItem value="Processed" disabled>{t("status_processed", "Processed")}</MenuItem>
                <MenuItem value="Closed" disabled>{t("status_closed", "Closed")}</MenuItem>
              </TextField>
              <Box className={styles.switchRow}>
                <Typography>{t("locked", "Locked")}</Typography>
                <Switch
                  checked={blnIsLocked}
                  onChange={(_, blnChecked) => setBlnIsLocked(blnChecked)}
                />
              </Box>
              <Button
                className={styles.primaryButton}
                onClick={saveStatus}
                disabled={blnSaving}
              >
                {blnSaving ? tCommon("processing", "Processing...") : tCommon("save", "Save")}
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box
          sx={{
            border: "1px solid #d9e6ef",
            borderRadius: 3,
            background: "#fff",
            p: 2,
          }}
        >
          <Typography sx={{ color: "#173b63", fontWeight: 800, mb: 1.5 }}>
            {t("meta_title", "Run Timeline")}
          </Typography>
          <Stack spacing={1}>
            <Typography>{t("created_on", "Created On")}: {formatDateTime(objRun.dtAddedOn)}</Typography>
            <Typography>{t("modified_on", "Last Modified On")}: {formatDateTime(objRun.dtLastModifiedOn)}</Typography>
            <Typography>{t("last_executed_on", "Last Executed On")}: {formatDateTime(objRun.dtLastExecutedOn)}</Typography>
            <Typography>{t("closed_on", "Closed On")}: {formatDateTime(objRun.dtClosedOn)}</Typography>
          </Stack>
        </Box>

        {(objValidationSummary || objRun.lstValidationResults.length > 0) ? (
          <Box
            sx={{
              border: "1px solid #d9e6ef",
              borderRadius: 3,
              background: "#fff",
              p: 2,
            }}
          >
            <Typography sx={{ color: "#173b63", fontWeight: 800, mb: 1.5 }}>
              {t("validation_panel", "Validation")}
            </Typography>
            <Box className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("level", "Level")}</th>
                    <th>{t("code", "Code")}</th>
                    <th>{t("employee", "Employee")}</th>
                    <th>{t("message", "Message")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(objValidationSummary?.lstIssues ?? objRun.lstValidationResults).map((dicIssue, intIndex) => (
                    <tr key={`${dicIssue.strValidationCode}-${dicIssue.intEmployeeID ?? "run"}-${intIndex}`}>
                      <td>{dicIssue.blnIsBlocking ? t("blocking", "Blocking") : t("warning", "Warning")}</td>
                      <td>{dicIssue.strValidationCode}</td>
                      <td>{dicIssue.intEmployeeID ?? "-"}</td>
                      <td>{dicIssue.strValidationMessage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Box>
        ) : null}

        {objProcessSummary ? (
          <Box
            sx={{
              border: "1px solid #d9e6ef",
              borderRadius: 3,
              background: "#fff",
              p: 2,
            }}
          >
            <Typography sx={{ color: "#173b63", fontWeight: 800, mb: 1.5 }}>
              {t("process_summary", "Processing Summary")}
            </Typography>
            <Stack spacing={1}>
              <Typography>{t("status", "Status")}: {objProcessSummary.strStatus}</Typography>
              <Typography>{t("processed", "Processed")}: {objProcessSummary.intProcessedEmployeeCount}</Typography>
              <Typography>{t("failed", "Failed")}: {objProcessSummary.intFailedEmployeeCount}</Typography>
              <Typography>{t("net_total", "Net Pay")}: {formatCurrency(objProcessSummary.decNetPayTotal || 0)}</Typography>
            </Stack>
            {objProcessSummary.lstExceptions.length ? (
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                {objProcessSummary.lstExceptions.map((dicException) => dicException.strMessage).join(" | ")}
              </Alert>
            ) : null}
          </Box>
        ) : null}

        {["Processed", "Closed"].includes(objRun.strRunStatus) ? (
          <Box
            sx={{
              border: "1px solid #d9e6ef",
              borderRadius: 3,
              background: "#fff",
              p: 2,
            }}
          >
            <Box className={styles.controlsHeader} sx={{ mb: 1.5 }}>
              <Typography sx={{ color: "#173b63", fontWeight: 800 }}>
                {t("payslip_panel", "Payslips")}
              </Typography>
              <Button
                className={styles.secondaryButton}
                startIcon={<ReceiptLongRoundedIcon />}
                onClick={generateAllPayslips}
                disabled={blnPayslipLoading}
              >
                {t("generate_all", "Generate All")}
              </Button>
            </Box>
            <Box className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("employee", "Employee")}</th>
                    <th>{t("payslip_no", "Payslip No.")}</th>
                    <th>{t("net_pay", "Net Pay")}</th>
                    <th>{t("status", "Status")}</th>
                    <th>{t("generated_on", "Generated On")}</th>
                    <th className={styles.actionsColumn}>{t("actions", "Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {lstPayslips.length ? (
                    lstPayslips.map((dicRow) => (
                      <tr key={`${dicRow.intPayrollRunID}-${dicRow.intEmployeeID}`}>
                        <td>
                          {dicRow.strEmployeeName}
                          <Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>
                            {dicRow.strEmployeeCode}
                          </Typography>
                        </td>
                        <td>{dicRow.strPayslipNumber || "-"}</td>
                        <td>{formatCurrency(dicRow.decNetPay)}</td>
                        <td>{dicRow.strPayslipStatus}</td>
                        <td>{formatDateTime(dicRow.dtGeneratedOn)}</td>
                        <td>
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Button
                              className={styles.secondaryButton}
                              onClick={() => viewPayslip(dicRow)}
                              disabled={blnPayslipLoading}
                            >
                              {t("view", "View")}
                            </Button>
                            <Button
                              className={styles.secondaryButton}
                              onClick={() => generatePayslip(dicRow)}
                              disabled={blnPayslipLoading}
                            >
                              {t("generate", "Generate")}
                            </Button>
                            <Button
                              className={styles.secondaryButton}
                              startIcon={<DownloadRoundedIcon />}
                              onClick={() => openPayslipDocument(dicRow, false)}
                              disabled={blnPayslipLoading}
                            >
                              {t("download", "Download")}
                            </Button>
                            <Button
                              className={styles.secondaryButton}
                              startIcon={<PrintRoundedIcon />}
                              onClick={() => openPayslipDocument(dicRow, true)}
                              disabled={blnPayslipLoading}
                            >
                              {t("print", "Print")}
                            </Button>
                          </Stack>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className={styles.emptyState}>
                        {t("payslip_empty", "No processed payroll results are available for payslip generation.")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Box>
          </Box>
        ) : null}
      </Box>
      <Dialog
        open={blnPayslipDialogOpen}
        onClose={() => setBlnPayslipDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
          {t("payslip_preview", "Payslip Preview")}
          <IconButton onClick={() => setBlnPayslipDialogOpen(false)}>
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {objPayslipPreview ? (
            <PayslipPreviewContent objPayslip={objPayslipPreview} />
          ) : null}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
