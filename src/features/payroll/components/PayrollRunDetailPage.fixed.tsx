"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import SummarizeRoundedIcon from "@mui/icons-material/SummarizeRounded";
import TableChartRoundedIcon from "@mui/icons-material/TableChartRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import WalletRoundedIcon from "@mui/icons-material/WalletRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
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
import { type InputHTMLAttributes, type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import PayslipPreviewContent from "@/features/payroll/components/PayslipPreviewContent";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { payslipService } from "@/features/payroll/services/payslipService";
import { payrollRunService } from "@/features/payroll/services/payrollRunService";
import type {
  PayslipPreviewRecord,
  PayslipRunListRecord,
  PayrollProcessSummary,
  PayrollRunDetailRecord,
  PayrollRunStatus,
  PayrollValidationSummary,
} from "@/features/payroll/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import {
  buildPayslipFileName,
  downloadPayslipHtml,
  printPayslipHtml,
} from "@/features/payroll/utils/payslipDocument";

type PayrollRunDetailPageProps = {
  intRunID: number;
};

const lstPayrollRunModuleCodes = ["PAYROLL_RUN", "PAYROLL_RUNS", "PAYROLL_PROCESS", "PAYROLL_PROCESSES"];
const lstEditableRunStatuses: PayrollRunStatus[] = ["Open", "Submitted", "Approved"];

function formatDateTime(strDate: string | null) {
  if (!strDate) return "-";
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

function getStatusTone(strStatus: string) {
  const dicToneByStatus: Record<string, { background: string; color: string; border: string }> = {
    Open: { background: "#dbeafe", color: "#1d4ed8", border: "#bfdbfe" },
    Submitted: { background: "#ffedd5", color: "#c2410c", border: "#fed7aa" },
    Approved: { background: "#dcfce7", color: "#15803d", border: "#bbf7d0" },
    Processed: { background: "#dcfce7", color: "#15803d", border: "#bbf7d0" },
    Closed: { background: "#e2e8f0", color: "#475569", border: "#cbd5e1" },
  };
  return dicToneByStatus[strStatus] ?? { background: "#dbeafe", color: "#1d4ed8", border: "#bfdbfe" };
}

function getStatusPillSx(strStatus: string) {
  const objTone = getStatusTone(strStatus);
  return { background: objTone.background, color: objTone.color, border: `1px solid ${objTone.border}` };
}

function getPayrollRunStatusLabel(strStatus: string) {
  const dicLabels: Record<string, string> = {
    Open: "Draft",
    Approved: "Approved",
    Processed: "Processed",
    Closed: "Closed",
  };
  return dicLabels[strStatus] ?? strStatus;
}

function getWorkflowSteps(strRunStatus: string, blnHasPayslips: boolean) {
  const strCurrentStep =
    strRunStatus === "Closed"
      ? "Close"
      : strRunStatus === "Processed"
        ? blnHasPayslips ? "Generate Payslips" : "Process"
        : strRunStatus === "Approved"
          ? "Validate"
          : "Draft";
  return ["Draft", "Validate", "Process", "Generate Payslips", "Close"].map((strStep) => ({
    strStep,
    blnActive: strStep === strCurrentStep,
  }));
}

function isWorkflowStepEnabled(
  strStep: string,
  objRun: PayrollRunDetailRecord,
  blnSaving: boolean,
  blnPayslipLoading: boolean,
  blnCanValidate: boolean,
  blnCanProcess: boolean,
  blnCanGeneratePayslip: boolean,
  blnCanClose: boolean,
) {
  if (blnSaving) return false;
  switch (strStep) {
    case "Draft":
      return false;
    case "Validate":
      return blnCanValidate && objRun.strRunStatus !== "Closed";
    case "Process":
      return blnCanProcess && objRun.strRunStatus === "Approved";
    case "Generate Payslips":
      return blnCanGeneratePayslip && !blnPayslipLoading && ["Processed", "Closed"].includes(objRun.strRunStatus);
    case "Close":
      return blnCanClose && objRun.strRunStatus === "Processed" && objRun.dicSummary.intValidationErrorCount <= 0;
    default:
      return false;
  }
}

function SummaryCard({ objIcon, strLabel, strValue, strTone = "blue" }: { objIcon: ReactNode; strLabel: string; strValue: string; strTone?: "blue" | "green" | "amber" | "red" }) {
  const dicTone = {
    blue: { background: "#eff6ff", color: "#2563eb" },
    green: { background: "#ecfdf5", color: "#16a34a" },
    amber: { background: "#fff7ed", color: "#ea580c" },
    red: { background: "#fef2f2", color: "#dc2626" },
  }[strTone];
  return (
    <Box sx={{ alignItems: "center", border: "1px solid #e5e7eb", borderRadius: "16px", display: "flex", gap: 1.25, minHeight: 82, p: 1.5 }}>
      <Box sx={{ alignItems: "center", background: dicTone.background, borderRadius: "14px", color: dicTone.color, display: "flex", flex: "0 0 auto", height: 42, justifyContent: "center", width: 42 }}>
        {objIcon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: "#64748b", fontSize: "0.76rem", lineHeight: 1.2, mb: 0.4 }}>{strLabel}</Typography>
        <Typography sx={{ color: "#0f172a", fontSize: "1rem", fontWeight: 800, lineHeight: 1.25 }}>{strValue}</Typography>
      </Box>
    </Box>
  );
}

function DetailValue({ objIcon, strLabel, strValue, strTone = "blue" }: { objIcon?: ReactNode; strLabel: string; strValue: string | number; strTone?: "blue" | "green" | "amber" | "red" | "slate" }) {
  const dicTone = {
    blue: { background: "#eff6ff", color: "#2563eb" },
    green: { background: "#ecfdf5", color: "#16a34a" },
    amber: { background: "#fff7ed", color: "#ea580c" },
    red: { background: "#fef2f2", color: "#dc2626" },
    slate: { background: "#f8fafc", color: "#475569" },
  }[strTone];
  return (
    <Box sx={{ border: "1px solid #e5e7eb", borderRadius: "14px", display: "flex", gap: 1, minHeight: 72, p: 1.25 }}>
      {objIcon ? <Box sx={{ alignItems: "center", background: dicTone.background, borderRadius: "12px", color: dicTone.color, display: "flex", flex: "0 0 auto", height: 36, justifyContent: "center", width: 36 }}>{objIcon}</Box> : null}
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: "#64748b", fontSize: "0.76rem", lineHeight: 1.2 }}>{strLabel}</Typography>
        <Typography sx={{ color: "#0f172a", fontSize: "0.96rem", fontWeight: 800, lineHeight: 1.3, mt: 0.35 }}>{strValue}</Typography>
      </Box>
    </Box>
  );
}

export default function PayrollRunDetailPage({ intRunID }: PayrollRunDetailPageProps) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("payroll-runs");
  const { t: tCommon } = useModuleLabels("common");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstPayrollRunModuleCodes);
  const [objRun, setObjRun] = useState<PayrollRunDetailRecord | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const [blnIsLocked, setBlnIsLocked] = useState(false);
  const [objValidationSummary, setObjValidationSummary] = useState<PayrollValidationSummary | null>(null);
  const [objProcessSummary, setObjProcessSummary] = useState<PayrollProcessSummary | null>(null);
  const [lstPayslips, setLstPayslips] = useState<PayslipRunListRecord[]>([]);
  const [objPayslipPreview, setObjPayslipPreview] = useState<PayslipPreviewRecord | null>(null);
  const [blnPayslipLoading, setBlnPayslipLoading] = useState(false);
  const [blnPayslipDialogOpen, setBlnPayslipDialogOpen] = useState(false);
  const blnCanView = canViewAny() || canDoAny("list");
  const blnCanEdit = canDoAny("edit");
  const blnCanValidate = canDoAny("validate") || canDoAny("submit");
  const blnCanProcess = canDoAny("process") || canDoAny("approve");
  const blnCanReprocess = canDoAny("reprocess") || canDoAny("edit");
  const blnCanClose = canDoAny("close") || canDoAny("lock");
  const blnCanGeneratePayslip = canDoAny("add") || canDoAny("edit") || canDoAny("process");
  const blnCanExport = canDoAny("export");

  async function loadRun(blnShowLoader = true) {
    if (!blnCanView) {
      setBlnLoading(false);
      return;
    }
    if (blnShowLoader) setBlnLoading(true);
    setStrError("");
    try {
      const dicRun = await payrollRunService.getPayrollRunById(intRunID);
      setObjRun(dicRun);
      setBlnIsLocked(dicRun.blnIsLocked);
      if (["Processed", "Closed"].includes(dicRun.strRunStatus)) {
        setLstPayslips(await payslipService.getRunPayslips(intRunID));
      } else {
        setLstPayslips([]);
      }
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load payroll run.");
    } finally {
      if (blnShowLoader) setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) return;
    loadRun().catch(() => undefined);
  }, [intRunID, blnRightsLoading, blnCanView]);

  async function saveLockState() {
    if (!blnCanEdit || !objRun) return;
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicRun = await payrollRunService.updatePayrollRunStatus(intRunID, objRun.strRunStatus, blnIsLocked, objRun.strScopeType, objRun.intScopedEmployeeID ?? "");
      setObjRun(dicRun);
      setStrSuccess(t("status_update_success", "Payroll run updated successfully."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to update payroll run status.");
    } finally {
      setBlnSaving(false);
    }
  }

  async function validateRun() {
    if (!blnCanValidate) return;
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    setObjProcessSummary(null);
    try {
      const dicSummary = await payrollRunService.validatePayrollRun(intRunID);
      setObjValidationSummary(dicSummary);
      await loadRun(false);
      setStrSuccess(dicSummary.strStatus === "Passed" ? t("validation_complete_approved", "Payroll validation completed. Run status updated to Approved.") : t("validation_complete", "Payroll validation completed."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to validate payroll run.");
    } finally {
      setBlnSaving(false);
    }
  }

  async function processRun() {
    if (!blnCanProcess) return;
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicSummary = await payrollRunService.processPayrollRun(intRunID);
      setObjProcessSummary(dicSummary);
      setObjValidationSummary(dicSummary.dicValidationSummary ?? null);
      if (dicSummary.strStatus === "ValidationFailed") {
        const intBlockingCount = dicSummary.dicValidationSummary?.intBlockingErrorCount ?? 0;
        setStrError(t("process_validation_failed", `Payroll processing blocked by ${intBlockingCount} validation error(s). Resolve the validation messages below and process again.`));
      } else {
        setStrSuccess(t("process_complete", "Payroll processing completed."));
      }
      await loadRun(false);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to process payroll run.");
    } finally {
      setBlnSaving(false);
    }
  }

  async function reprocessRun() {
    if (!blnCanReprocess) return;
    const strReason = window.prompt(t("reprocess_reason", "Reason for reprocess"));
    if (!strReason?.trim()) return;
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicSummary = await payrollRunService.reprocessPayrollRun(intRunID, strReason.trim());
      setObjProcessSummary(dicSummary);
      setObjValidationSummary(dicSummary.dicValidationSummary ?? null);
      setStrSuccess(t("reprocess_complete", "Payroll reprocessing completed."));
      await loadRun(false);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to reprocess payroll run.");
    } finally {
      setBlnSaving(false);
    }
  }

  async function closeRun() {
    if (!blnCanClose) return;
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicRun = await payrollRunService.closePayrollRun(intRunID);
      setObjRun(dicRun);
      setBlnIsLocked(dicRun.blnIsLocked);
      setStrSuccess(t("close_complete", "Payroll run closed successfully."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to close payroll run.");
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
    if (!blnCanGeneratePayslip) return;
    setBlnPayslipLoading(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicSummary = await payslipService.generateAll(intRunID);
      setStrSuccess(t("payslip_generate_all_success", `${dicSummary.intGeneratedCount} payslips generated successfully.`));
      await reloadPayslips();
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to generate payslips.");
    } finally {
      setBlnPayslipLoading(false);
    }
  }

  async function generatePayslip(dicRow: PayslipRunListRecord) {
    if (!blnCanGeneratePayslip) return null;
    setBlnPayslipLoading(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicPayslip = await payslipService.generatePayslip(intRunID, dicRow.intEmployeeID);
      setStrSuccess(t("payslip_generated", "Payslip generated successfully."));
      await reloadPayslips();
      return dicPayslip;
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to generate payslip.");
      return null;
    } finally {
      setBlnPayslipLoading(false);
    }
  }

  async function viewPayslip(dicRow: PayslipRunListRecord) {
    setBlnPayslipLoading(true);
    setStrError("");
    try {
      const dicPayslip = await payslipService.getPayslipPreview(intRunID, dicRow.intEmployeeID);
      setObjPayslipPreview(dicPayslip);
      setBlnPayslipDialogOpen(true);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load payslip preview.");
    } finally {
      setBlnPayslipLoading(false);
    }
  }

  async function openPayslipDocument(dicRow: PayslipRunListRecord, blnPrint: boolean) {
    if (!blnCanExport) return;
    setBlnPayslipLoading(true);
    setStrError("");
    try {
      let intPayslipID = dicRow.intPayslipID;
      if (!intPayslipID) {
        const dicPayslip = await generatePayslip(dicRow);
        intPayslipID = dicPayslip?.intPayslipID ?? null;
      }
      if (!intPayslipID) return;
      const strHtml = await payslipService.getDownloadHtml(intPayslipID);
      if (blnPrint) printPayslipHtml(strHtml);
      else downloadPayslipHtml(strHtml, buildPayslipFileName("payslip", dicRow.strPayslipNumber, dicRow.strEmployeeCode));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to download payslip document.");
    } finally {
      setBlnPayslipLoading(false);
    }
  }

  if (blnLoading || blnRightsLoading) return <BlockingLoader blnOpen strLabel={t("loading_run", "Loading payroll run...")} />;
  if (!blnCanView) return <Box className={styles.page}><Alert severity="warning">{t("access_denied", "Payroll run access is not available for your user group.")}</Alert></Box>;
  if (!objRun) return <Box className={styles.page}><Alert severity="error">{strError || t("not_found", "Payroll run not found.")}</Alert></Box>;

  const lstValidationRows = objValidationSummary?.lstIssues ?? objRun.lstValidationResults;
  const lstRecentValidationRows = lstValidationRows.slice(0, 6);
  const intBlockingCount = lstValidationRows.filter((dicIssue) => dicIssue.blnIsBlocking).length;
  const intWarningCount = lstValidationRows.filter((dicIssue) => !dicIssue.blnIsBlocking).length;
  const objSectionCardSx = { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "16px", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)", p: { xs: 1.5, md: 2 } };
  const objSectionTitleSx = { color: "#0f172a", fontWeight: 800, fontSize: "1.05rem", mb: 1.25 };
  const lstKpis = [
    { strLabel: t("run_code", "Run Code"), strValue: objRun.strRunCode, objIcon: <ReceiptLongRoundedIcon sx={{ fontSize: 22 }} />, strTone: "blue" as const },
    { strLabel: t("payroll_month", "Payroll Month"), strValue: formatMonth(objRun.dtPayrollMonth), objIcon: <CalendarMonthRoundedIcon sx={{ fontSize: 22 }} />, strTone: "blue" as const },
    { strLabel: t("run_scope", "Process For"), strValue: objRun.strScopeType === "SelectedEmployee" ? `${t("scope_selected_employee", "Selected Employees")} #${objRun.intScopedEmployeeID ?? "-"}` : t("scope_payroll_group", "Payroll Group"), objIcon: <GroupRoundedIcon sx={{ fontSize: 22 }} />, strTone: "blue" as const },
    { strLabel: t("employees", "Employees"), strValue: String(objRun.intEmployeeCount || objRun.dicSummary.intInputCount), objIcon: <PersonRoundedIcon sx={{ fontSize: 22 }} />, strTone: "blue" as const },
    { strLabel: t("employees_processed", "Employees Processed"), strValue: String(objRun.intProcessedEmployeeCount || objRun.dicSummary.intProcessedCount), objIcon: <TaskAltRoundedIcon sx={{ fontSize: 22 }} />, strTone: "green" as const },
    { strLabel: t("validation_errors", "Validation Errors"), strValue: String(objRun.dicSummary.intValidationErrorCount), objIcon: <ShieldRoundedIcon sx={{ fontSize: 22 }} />, strTone: "red" as const },
    { strLabel: t("warnings", "Warnings"), strValue: String(objRun.dicSummary.intValidationWarningCount), objIcon: <ReportProblemRoundedIcon sx={{ fontSize: 22 }} />, strTone: "amber" as const },
    { strLabel: t("gross_total", "Gross Total"), strValue: formatCurrency(objRun.decGrossPayTotal), objIcon: <PaidRoundedIcon sx={{ fontSize: 22 }} />, strTone: "blue" as const },
    { strLabel: t("deduction_total", "Deductions"), strValue: formatCurrency(objRun.decDeductionTotal), objIcon: <WalletRoundedIcon sx={{ fontSize: 22 }} />, strTone: "red" as const },
    { strLabel: t("tax_total", "Tax"), strValue: formatCurrency(objRun.decTaxTotal), objIcon: <SummarizeRoundedIcon sx={{ fontSize: 22 }} />, strTone: "green" as const },
    { strLabel: t("net_total", "Net Pay"), strValue: formatCurrency(objRun.decNetPayTotal), objIcon: <PaidRoundedIcon sx={{ fontSize: 22 }} />, strTone: "green" as const },
  ];

  return <Box />;
}
