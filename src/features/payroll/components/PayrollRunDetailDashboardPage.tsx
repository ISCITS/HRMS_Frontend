"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import SummarizeRoundedIcon from "@mui/icons-material/SummarizeRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import WalletRoundedIcon from "@mui/icons-material/WalletRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { type InputHTMLAttributes, type MouseEvent, type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import PayslipHtmlPreview from "@/features/payroll/components/PayslipHtmlPreview";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { payslipService } from "@/features/payroll/services/payslipService";
import { payrollRunService } from "@/features/payroll/services/payrollRunService";
import type {
  PayslipRunListRecord,
  PayrollProcessSummary,
  PayrollRunDetailRecord,
  PayrollRunStatus,
  PayrollValidationSummary,
} from "@/features/payroll/types";
import {
  buildPayslipFileName,
  downloadPayslipHtml,
  printPayslipHtml,
} from "@/features/payroll/utils/payslipDocument";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type PayrollRunDetailDashboardPageProps = {
  intRunID: number;
};

type Tone = "blue" | "green" | "amber" | "red" | "slate";

const lstPayrollRunModuleCodes = ["PAYROLL_RUN", "PAYROLL_RUNS", "PAYROLL_PROCESS", "PAYROLL_PROCESSES"];
const strRecoveryRunStatus: PayrollRunStatus = "Open";

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

function getPayrollRunStatusLabel(strStatus: string) {
  const dicLabels: Record<string, string> = {
    Open: "Draft",
    Approved: "Approved",
    Failed: "Failed",
    Processed: "Processed",
    Closed: "Closed",
  };
  return dicLabels[strStatus] ?? strStatus;
}

function getWorkflowSteps(strRunStatus: string) {
  const strCurrentStep =
    strRunStatus === "Closed"
      ? "Generate Payslips"
      : strRunStatus === "Processed"
        ? "Generate Payslips"
        : strRunStatus === "Failed"
          ? "Process"
        : strRunStatus === "Approved"
          ? "Validate"
          : strRunStatus === "Submitted"
            ? "Validate"
            : "Draft";
  return ["Draft", "Submit", "Validate", "Process", "Generate Payslips", "Reprocess"].map((strStep) => ({
    strStep,
    blnActive: strStep === strCurrentStep,
  }));
}

function canProcessPayrollRun(objRun: PayrollRunDetailRecord, blnCanProcess: boolean) {
  if (!blnCanProcess) {
    return false;
  }
  if (["Approved", "Failed"].includes(objRun.strRunStatus)) {
    return true;
  }
  return (
    objRun.strRunStatus === "Processed" &&
    (objRun.intProcessedEmployeeCount || objRun.dicSummary.intProcessedCount || 0) <= 0 &&
    (objRun.intFailedEmployeeCount || 0) > 0
  );
}

function isWorkflowStepEnabled(
  strStep: string,
  objRun: PayrollRunDetailRecord,
  blnSaving: boolean,
  blnPayslipLoading: boolean,
  blnCanValidate: boolean,
  blnCanProcess: boolean,
  blnCanGeneratePayslip: boolean,
) {
  if (blnSaving) {
    return false;
  }
  switch (strStep) {
    case "Draft":
    case "Submit":
      return false;
    case "Validate":
      return blnCanValidate && objRun.strRunStatus !== "Closed";
    case "Process":
      return canProcessPayrollRun(objRun, blnCanProcess);
    case "Generate Payslips":
      return blnCanGeneratePayslip && !blnPayslipLoading && ["Processed", "Closed"].includes(objRun.strRunStatus);
    case "Reprocess":
      return false;
    default:
      return false;
  }
}

function getToneStyles(strTone: Tone) {
  const dicTone = {
    blue: { soft: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
    green: { soft: "#ecfdf5", text: "#15803d", border: "#bbf7d0" },
    amber: { soft: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
    red: { soft: "#fef2f2", text: "#dc2626", border: "#fecaca" },
    slate: { soft: "#f8fafc", text: "#475569", border: "#e2e8f0" },
  } as const;
  return dicTone[strTone];
}

function StatusPill({ strStatus }: { strStatus: string }) {
  const objTone = ["Approved", "Processed"].includes(strStatus)
    ? getToneStyles("green")
    : strStatus === "Failed"
      ? getToneStyles("red")
    : strStatus === "Submitted"
      ? getToneStyles("amber")
      : strStatus === "Closed"
        ? getToneStyles("slate")
        : getToneStyles("blue");

  return (
    <Chip
      label={getPayrollRunStatusLabel(strStatus)}
      size="small"
      sx={{
        background: objTone.soft,
        border: `1px solid ${objTone.border}`,
        color: objTone.text,
        fontWeight: 800,
        height: 24,
        minWidth: 78,
      }}
    />
  );
}

function KpiTile({ objIcon, strLabel, strValue, strTone }: { objIcon: ReactNode; strLabel: string; strValue: string; strTone: Tone }) {
  const objTone = getToneStyles(strTone);
  return (
    <Box sx={{ alignItems: "center", display: "flex", gap: 1.2, minHeight: 58, minWidth: 0 }}>
      <Box
        sx={{
          alignItems: "center",
          background: objTone.soft,
          borderRadius: "10px",
          color: objTone.text,
          display: "flex",
          flex: "0 0 auto",
          height: 40,
          justifyContent: "center",
          width: 40,
        }}
      >
        {objIcon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: "#475569", fontSize: "0.76rem", fontWeight: 700, lineHeight: 1.1 }}>{strLabel}</Typography>
        <Typography sx={{ color: "#0f172a", fontSize: "0.98rem", fontWeight: 900, lineHeight: 1.2, mt: 0.35 }}>
          {strValue}
        </Typography>
      </Box>
    </Box>
  );
}

function MetricTile({ objIcon, strLabel, strValue, strTone }: { objIcon: ReactNode; strLabel: string; strValue: string | number; strTone: Tone }) {
  const objTone = getToneStyles(strTone);
  return (
    <Box sx={{ alignItems: "center", border: "1px solid #e5e7eb", borderRadius: "8px", display: "flex", gap: 1, minHeight: 62, p: 1 }}>
      <Box
        sx={{
          alignItems: "center",
          background: objTone.soft,
          borderRadius: "8px",
          color: objTone.text,
          display: "flex",
          flex: "0 0 auto",
          height: 34,
          justifyContent: "center",
          width: 34,
        }}
      >
        {objIcon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: "#64748b", fontSize: "0.74rem", fontWeight: 700, lineHeight: 1.1 }}>{strLabel}</Typography>
        <Typography sx={{ color: "#0f172a", fontSize: "0.94rem", fontWeight: 900, lineHeight: 1.2, mt: 0.35 }}>{strValue}</Typography>
      </Box>
    </Box>
  );
}

function getWorkflowStepIcon(strStep: string) {
  if (strStep === "Draft") {
    return <TaskAltRoundedIcon sx={{ fontSize: 18 }} />;
  }
  if (strStep === "Submit" || strStep === "Validate") {
    return <ShieldOutlinedIcon sx={{ fontSize: 18 }} />;
  }
  if (strStep === "Process") {
    return <PlayArrowRoundedIcon sx={{ fontSize: 18 }} />;
  }
  if (strStep === "Generate Payslips") {
    return <ReceiptLongRoundedIcon sx={{ fontSize: 18 }} />;
  }
  return <RestartAltRoundedIcon sx={{ fontSize: 18 }} />;
}

function getWorkflowButtonSx(strVariant: "complete" | "current" | "available" | "disabled") {
  const objBase = {
    borderRadius: "8px",
    boxShadow: "none",
    fontSize: "0.84rem",
    fontWeight: 800,
    height: 38,
    minWidth: 0,
    px: 1.35,
    whiteSpace: "nowrap",
  } as const;

  if (strVariant === "current") {
    return {
      ...objBase,
      background: "#0B5ED7",
      border: "1px solid #0B5ED7",
      color: "#fff",
      "&:hover": { background: "#084298", borderColor: "#084298" },
      "&.Mui-disabled": { background: "#F1F3F6", borderColor: "#DCE4EF", color: "#9AA5B5" },
    };
  }
  if (strVariant === "complete") {
    return {
      ...objBase,
      background: "#F2FBF6",
      border: "1px solid #9BE1B8",
      color: "#159455",
      "&:hover": { background: "#E8F8EF" },
      "&.Mui-disabled": { background: "#F2FBF6", borderColor: "#9BE1B8", color: "#159455" },
    };
  }
  if (strVariant === "available") {
    return {
      ...objBase,
      background: "#fff",
      border: "1px solid #8FB8F9",
      color: "#0B5ED7",
      "&:hover": { background: "#EEF5FF", borderColor: "#0B5ED7" },
      "&.Mui-disabled": { background: "#F1F3F6", borderColor: "#DCE4EF", color: "#9AA5B5" },
    };
  }
  return {
    ...objBase,
    background: "#F1F3F6",
    border: "1px solid #DCE4EF",
    color: "#9AA5B5",
  };
}

function getWorkflowButtonVariant(strStep: string, objRun: PayrollRunDetailRecord, blnActive: boolean, blnEnabled: boolean) {
  if (strStep === "Draft") {
    return ["Open", "Submitted", "Approved", "Processed", "Closed"].includes(objRun.strRunStatus) ? "complete" : "current";
  }
  if (strStep === "Submit") {
    return ["Submitted", "Approved", "Processed", "Closed"].includes(objRun.strRunStatus) ? "complete" : "disabled";
  }
  if (strStep === "Validate") {
    if (["Approved", "Processed", "Closed"].includes(objRun.strRunStatus)) {
      return "complete";
    }
    return blnEnabled || blnActive ? "current" : "disabled";
  }
  if (strStep === "Process") {
    if (["Processed", "Closed"].includes(objRun.strRunStatus)) {
      return "complete";
    }
    return blnEnabled || blnActive ? "current" : "disabled";
  }
  if (strStep === "Generate Payslips") {
    return blnEnabled || blnActive ? "current" : "disabled";
  }
  return blnEnabled ? "available" : "disabled";
}

export default function PayrollRunDetailDashboardPage({ intRunID }: PayrollRunDetailDashboardPageProps) {
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
  const [strSavedRunStatus, setStrSavedRunStatus] = useState<PayrollRunStatus>("Open");
  const [objValidationSummary, setObjValidationSummary] = useState<PayrollValidationSummary | null>(null);
  const [objProcessSummary, setObjProcessSummary] = useState<PayrollProcessSummary | null>(null);
  const [lstPayslips, setLstPayslips] = useState<PayslipRunListRecord[]>([]);
  const [strPayslipPreviewHtml, setStrPayslipPreviewHtml] = useState("");
  const [blnPayslipLoading, setBlnPayslipLoading] = useState(false);
  const [strActionLoaderLabel, setStrActionLoaderLabel] = useState("");
  const [blnPayslipDialogOpen, setBlnPayslipDialogOpen] = useState(false);
  const [blnReprocessDialogOpen, setBlnReprocessDialogOpen] = useState(false);
  const [strReprocessReason, setStrReprocessReason] = useState("");
  const [objActionsAnchor, setObjActionsAnchor] = useState<null | HTMLElement>(null);
  const [intValidationPage, setIntValidationPage] = useState(1);
  const [intValidationRowsPerPage, setIntValidationRowsPerPage] = useState(5);
  const blnCanView = canViewAny() || canDoAny("list");
  const blnCanEdit = canDoAny("edit");
  const blnCanValidate = canDoAny("validate") || canDoAny("submit");
  const blnCanProcess = canDoAny("process") || canDoAny("approve");
  const blnCanReprocess = canDoAny("reprocess") || canDoAny("edit");
  const blnCanGeneratePayslip = canDoAny("add") || canDoAny("edit") || canDoAny("process");
  const blnCanExport = canDoAny("export");

  async function loadRun(blnShowLoader = true) {
    if (!blnCanView) {
      setBlnLoading(false);
      return;
    }

    if (blnShowLoader) {
      setBlnLoading(true);
    }
    setStrError("");
    try {
      const dicRun = await payrollRunService.getPayrollRunById(intRunID);
      setObjRun(dicRun);
      setBlnIsLocked(dicRun.blnIsLocked);
      setStrSavedRunStatus(dicRun.strRunStatus);
      if (["Processed", "Closed"].includes(dicRun.strRunStatus)) {
        setLstPayslips(await payslipService.getRunPayslips(intRunID));
      } else {
        setLstPayslips([]);
      }
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load payroll run.");
    } finally {
      if (blnShowLoader) {
        setBlnLoading(false);
      }
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }
    loadRun().catch(() => undefined);
  }, [intRunID, blnRightsLoading, blnCanView]);

  useEffect(() => {
    setIntValidationPage(1);
  }, [intRunID, objValidationSummary]);

  async function saveLockState() {
    if (!blnCanEdit || !objRun) {
      return;
    }
    setBlnSaving(true);
    setStrActionLoaderLabel(tCommon("saving", "Saving..."));
    setStrError("");
    setStrSuccess("");
    try {
      const dicRun = await payrollRunService.updatePayrollRunStatus(
        intRunID,
        objRun.strRunStatus,
        blnIsLocked,
        objRun.strScopeType,
        objRun.intScopedEmployeeID ?? "",
      );
      setObjRun(dicRun);
      setBlnIsLocked(dicRun.blnIsLocked);
      setStrSavedRunStatus(dicRun.strRunStatus);
      setStrSuccess(t("status_update_success", "Payroll run updated successfully."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to update payroll run status.");
    } finally {
      setBlnSaving(false);
      setStrActionLoaderLabel("");
    }
  }

  async function validateRun() {
    if (!blnCanValidate) {
      return;
    }
    setBlnSaving(true);
    setStrActionLoaderLabel(t("validating_run", "Validating payroll run..."));
    setStrError("");
    setStrSuccess("");
    setObjProcessSummary(null);
    try {
      const dicSummary = await payrollRunService.validatePayrollRun(intRunID);
      setObjValidationSummary(dicSummary);
      await loadRun(false);
      setStrSuccess(
        dicSummary.strStatus === "Passed"
          ? t("validation_complete_approved", "Payroll validation completed. Run status updated to Approved.")
          : t("validation_complete", "Payroll validation completed."),
      );
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to validate payroll run.");
    } finally {
      setBlnSaving(false);
      setStrActionLoaderLabel("");
    }
  }

  async function processRun() {
    if (!blnCanProcess) {
      return;
    }
    setBlnSaving(true);
    setStrActionLoaderLabel(t("processing_run", "Processing payroll run..."));
    setStrError("");
    setStrSuccess("");
    try {
      const dicSummary = await payrollRunService.processPayrollRun(intRunID);
      setObjProcessSummary(dicSummary);
      setObjValidationSummary(dicSummary.dicValidationSummary ?? null);
      if (dicSummary.strStatus === "ValidationFailed") {
        const intBlockingCount = dicSummary.dicValidationSummary?.intBlockingErrorCount ?? 0;
        setStrError(t("process_validation_failed", `Payroll processing blocked by ${intBlockingCount} validation error(s). Resolve the validation messages below and process again.`));
      } else if (dicSummary.strStatus === "Failed") {
        setStrError(t("process_failed", "Payroll processing failed. Review the processing summary below and process again after fixing the issue."));
      } else {
        setStrSuccess(t("process_complete", "Payroll processing completed."));
      }
      await loadRun(false);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to process payroll run.");
    } finally {
      setBlnSaving(false);
      setStrActionLoaderLabel("");
    }
  }

  function openReprocessDialog() {
    if (!blnCanReprocess) {
      return;
    }
    setStrReprocessReason("");
    setStrError("");
    setBlnReprocessDialogOpen(true);
  }

  async function reprocessRun() {
    const strReason = strReprocessReason.trim();
    if (!blnCanReprocess || !strReason) {
      return;
    }
    setBlnReprocessDialogOpen(false);
    setBlnSaving(true);
    setStrActionLoaderLabel(t("reprocessing_run", "Reprocessing payroll run..."));
    setStrError("");
    setStrSuccess("");
    try {
      const dicSummary = await payrollRunService.reprocessPayrollRun(intRunID, strReason);
      setObjProcessSummary(dicSummary);
      setObjValidationSummary(dicSummary.dicValidationSummary ?? null);
      setStrSuccess(t("reprocess_complete", "Payroll reprocessing completed."));
      await loadRun(false);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to reprocess payroll run.");
    } finally {
      setBlnSaving(false);
      setStrActionLoaderLabel("");
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
    if (!blnCanGeneratePayslip) {
      return;
    }
    setBlnPayslipLoading(true);
    setStrActionLoaderLabel(t("generating_payslips", "Generating payslips..."));
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
      setStrActionLoaderLabel("");
    }
  }

  async function generatePayslip(dicRow: PayslipRunListRecord) {
    if (!blnCanGeneratePayslip) {
      return null;
    }
    setBlnPayslipLoading(true);
    setStrActionLoaderLabel(t("generating_payslip", "Generating payslip..."));
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
      setStrActionLoaderLabel("");
    }
  }

  async function viewPayslip(dicRow: PayslipRunListRecord) {
    setBlnPayslipLoading(true);
    setStrActionLoaderLabel(t("opening_payslip", "Opening payslip preview..."));
    setStrError("");
    try {
      let intPayslipID = dicRow.intPayslipID;
      if (!intPayslipID) {
        const dicPayslip = await generatePayslip(dicRow);
        intPayslipID = dicPayslip?.intPayslipID ?? null;
      }
      if (!intPayslipID) {
        setStrError(t("payslip_not_generated", "Payslip could not be generated for this employee."));
        return;
      }
      setStrPayslipPreviewHtml(await payslipService.getDownloadHtml(intPayslipID));
      setBlnPayslipDialogOpen(true);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load payslip preview.");
    } finally {
      setBlnPayslipLoading(false);
      setStrActionLoaderLabel("");
    }
  }

  async function openPayslipDocument(dicRow: PayslipRunListRecord, blnPrint: boolean) {
    if (!blnCanExport) {
      return;
    }
    setBlnPayslipLoading(true);
    setStrActionLoaderLabel(blnPrint ? t("preparing_print", "Preparing print view...") : t("preparing_download", "Preparing download..."));
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
        downloadPayslipHtml(strHtml, buildPayslipFileName("payslip", dicRow.strPayslipNumber, dicRow.strEmployeeCode));
      }
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to download payslip document.");
    } finally {
      setBlnPayslipLoading(false);
      setStrActionLoaderLabel("");
    }
  }

  function handleOpenActions(objEvent: MouseEvent<HTMLButtonElement>) {
    setObjActionsAnchor(objEvent.currentTarget);
  }

  function handleCloseActions() {
    setObjActionsAnchor(null);
  }

  if (blnLoading || blnRightsLoading) {
    return <BlockingLoader blnOpen strLabel={t("loading_run", "Loading payroll run...")} />;
  }

  if (!blnCanView) {
    return (
      <Box className={styles.page}>
        <Alert severity="warning">{t("access_denied", "Payroll run access is not available for your user group.")}</Alert>
      </Box>
    );
  }

  if (!objRun) {
    return (
      <Box className={styles.page}>
        <Alert severity="error">{strError || t("not_found", "Payroll run not found.")}</Alert>
      </Box>
    );
  }

  const lstValidationRows = objValidationSummary?.lstIssues ?? objRun.lstValidationResults;
  const intBlockingCount = lstValidationRows.filter((dicIssue) => dicIssue.blnIsBlocking).length;
  const intWarningCount = lstValidationRows.filter((dicIssue) => !dicIssue.blnIsBlocking).length;
  const intValidationPageCount = Math.max(1, Math.ceil(lstValidationRows.length / intValidationRowsPerPage));
  const intSafeValidationPage = Math.min(intValidationPage, intValidationPageCount);
  const intValidationStartIndex = lstValidationRows.length ? (intSafeValidationPage - 1) * intValidationRowsPerPage : 0;
  const intValidationEndIndex = Math.min(intValidationStartIndex + intValidationRowsPerPage, lstValidationRows.length);
  const lstPagedValidationRows = lstValidationRows.slice(intValidationStartIndex, intValidationEndIndex);
  const intProcessedEmployeeCount = objRun.intProcessedEmployeeCount || objRun.dicSummary.intProcessedCount || 0;
  const blnReprocessEnabled = blnCanReprocess && !blnSaving && objRun.strRunStatus !== "Closed" && intProcessedEmployeeCount > 0;
  const blnStatusEditable = blnCanEdit && !objRun.blnIsLocked;
  const blnLockEditable = blnCanEdit;
  const blnCanSaveRunControls = blnCanEdit && (objRun.strRunStatus !== strSavedRunStatus || blnIsLocked !== objRun.blnIsLocked);
  const lstStatusOptions = objRun.strRunStatus === strRecoveryRunStatus
    ? [strRecoveryRunStatus]
    : [objRun.strRunStatus, strRecoveryRunStatus];
  const strScopeLabel = objRun.strScopeType === "SelectedEmployee"
    ? `${t("scope_selected_employee", "Selected Employees")} #${objRun.intScopedEmployeeID ?? "-"}`
    : t("scope_payroll_group", "Payroll Group");
  const lstWorkflowSteps = getWorkflowSteps(objRun.strRunStatus);

  const lstKpis = [
    { strLabel: t("run_code", "Run Code"), strValue: objRun.strRunCode, objIcon: <ReceiptLongRoundedIcon sx={{ fontSize: 21 }} />, strTone: "blue" as Tone },
    { strLabel: t("payroll_month", "Payroll Month"), strValue: formatMonth(objRun.dtPayrollMonth), objIcon: <CalendarMonthRoundedIcon sx={{ fontSize: 21 }} />, strTone: "blue" as Tone },
    { strLabel: t("run_scope", "Process For"), strValue: strScopeLabel, objIcon: <GroupRoundedIcon sx={{ fontSize: 21 }} />, strTone: "blue" as Tone },
    { strLabel: t("employees_processed", "Employees Processed"), strValue: String(objRun.intProcessedEmployeeCount || objRun.dicSummary.intProcessedCount), objIcon: <TaskAltRoundedIcon sx={{ fontSize: 21 }} />, strTone: "blue" as Tone },
    { strLabel: t("validation_errors", "Validation Errors"), strValue: String(objRun.dicSummary.intValidationErrorCount), objIcon: <ShieldOutlinedIcon sx={{ fontSize: 21 }} />, strTone: "red" as Tone },
    { strLabel: t("warnings", "Warnings"), strValue: String(objRun.dicSummary.intValidationWarningCount), objIcon: <ReportProblemRoundedIcon sx={{ fontSize: 21 }} />, strTone: "amber" as Tone },
    { strLabel: t("gross_total", "Gross Total"), strValue: formatCurrency(objRun.decGrossPayTotal), objIcon: <PaidRoundedIcon sx={{ fontSize: 21 }} />, strTone: "blue" as Tone },
    { strLabel: t("deduction_total", "Deductions"), strValue: formatCurrency(objRun.decDeductionTotal), objIcon: <WalletRoundedIcon sx={{ fontSize: 21 }} />, strTone: "red" as Tone },
    { strLabel: t("tax_total", "Tax"), strValue: formatCurrency(objRun.decTaxTotal), objIcon: <SummarizeRoundedIcon sx={{ fontSize: 21 }} />, strTone: "green" as Tone },
    { strLabel: t("net_total", "Net Pay"), strValue: formatCurrency(objRun.decNetPayTotal), objIcon: <PaidRoundedIcon sx={{ fontSize: 21 }} />, strTone: "green" as Tone },
  ];

  const objCardSx = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
  };

  return (
    <Box sx={{ background: "#F6F8FC", color: "#0F2747", display: "flex", flexDirection: "column", gap: 1.25, height: "100%", minHeight: 0, overflow: "auto", p: { xs: 1.25, md: 1.5 } }}>
      <Box sx={{ ...objCardSx, borderColor: "#DCE4EF", p: { xs: 1.25, md: 1.5 } }}>
        <Box sx={{ alignItems: "center", display: "flex", gap: 1, justifyContent: "space-between", mb: 1.1 }}>
          <Typography sx={{ color: "#0B5ED7", display: "flex", flexWrap: "wrap", fontSize: "0.82rem", fontWeight: 800, gap: 0.85 }}>
            <span>{t("breadcrumb_payroll", "Payroll")}</span>
            <span style={{ color: "#9AA5B5" }}>/</span>
            <span>{t("breadcrumbs", "Payroll Runs")}</span>
            <span style={{ color: "#9AA5B5" }}>/</span>
            <span style={{ color: "#0F2747" }}>{objRun.strRunName}</span>
          </Typography>
          <Button
            className={styles.secondaryButton}
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => objRouter.push("/payroll/runs")}
            sx={{ flex: "0 0 auto", height: 36 }}
            controlId="payroll.run-detail.back-to-list.button"
          >
            {t("back_to_list", "Back to List")}
          </Button>
        </Box>

        <Box sx={{ alignItems: { xs: "flex-start", lg: "center" }, display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: 1.25, justifyContent: "space-between", mb: 1.35 }}>
          <Box sx={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 1.1, minWidth: 0 }}>
            <Typography sx={{ color: "#0F2747", fontSize: { xs: "1.55rem", md: "1.9rem" }, fontWeight: 900, lineHeight: 1.05 }}>
              {objRun.strRunName}
            </Typography>
            <StatusPill strStatus={objRun.strRunStatus} />
          </Box>
          <Box sx={{ alignItems: "center", display: "flex", gap: 0.75, justifyContent: { xs: "flex-start", lg: "flex-end" }, maxWidth: "100%", overflowX: "auto", pb: 0.25 }}>
            {lstWorkflowSteps.map((dicStep, intIndex) => {
              const blnEnabled = dicStep.strStep === "Reprocess"
                ? blnReprocessEnabled
                : isWorkflowStepEnabled(dicStep.strStep, objRun, blnSaving, blnPayslipLoading, blnCanValidate, blnCanProcess, blnCanGeneratePayslip);
              const fnOnClick =
                dicStep.strStep === "Validate"
                  ? validateRun
                  : dicStep.strStep === "Process"
                    ? processRun
                    : dicStep.strStep === "Generate Payslips"
                      ? generateAllPayslips
                      : dicStep.strStep === "Reprocess"
                        ? openReprocessDialog
                        : undefined;
              const strVariant = getWorkflowButtonVariant(dicStep.strStep, objRun, dicStep.blnActive, blnEnabled);
              return (
                <Box key={dicStep.strStep} sx={{ alignItems: "center", display: "flex", gap: 0.75 }}>
                  {intIndex > 0 ? <ChevronRightRoundedIcon sx={{ color: "#0B5ED7", fontSize: 18, flex: "0 0 auto" }} /> : null}
                  <Button
                    startIcon={getWorkflowStepIcon(dicStep.strStep)}
                    onClick={fnOnClick}
                    disabled={!fnOnClick || !blnEnabled || (dicStep.strStep === "Generate Payslips" && blnPayslipLoading)}
                    sx={getWorkflowButtonSx(strVariant)}
                    controlId={`payroll.run-detail.workflow.${dicStep.strStep.toLowerCase().replaceAll(" ", "-")}.button`}
                  >
                    {dicStep.strStep === "Draft" ? t("draft_open", "Draft / Open") : t(`workflow_${dicStep.strStep.toLowerCase().replaceAll(" ", "_")}`, dicStep.strStep)}
                  </Button>
                </Box>
              );
            })}
            <IconButton
              onClick={handleOpenActions}
              sx={{ border: "1px solid #8FB8F9", borderRadius: "8px", color: "#0B5ED7", flex: "0 0 auto", height: 38, width: 38 }}
              controlId="payroll.run-detail.actions.menu.button"
              aria-label={t("more_actions", "More actions")}
            >
              <MoreVertRoundedIcon />
            </IconButton>
          </Box>
        </Box>
        <Menu anchorEl={objActionsAnchor} open={Boolean(objActionsAnchor)} onClose={handleCloseActions}>
          <MenuItem onClick={() => { handleCloseActions(); objRouter.push("/payroll/results"); }}>{t("view_results", "Results")}</MenuItem>
        </Menu>

        <Box sx={{ border: "1px solid #DCE4EF", borderRadius: "10px", display: "grid", gap: { xs: 0.75, md: 1 }, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(5, minmax(0, 1fr))", xl: "repeat(10, minmax(0, 1fr))" }, px: 1.25, py: 1 }}>
          {lstKpis.map((dicKpi) => (
            <KpiTile key={dicKpi.strLabel} objIcon={dicKpi.objIcon} strLabel={dicKpi.strLabel} strValue={dicKpi.strValue} strTone={dicKpi.strTone} />
          ))}
        </Box>
      </Box>

      {strRightsError ? <Alert severity="warning">{strRightsError}</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}
      {blnPayslipLoading ? <Alert severity="info">{t("payslip_preparing", "Preparing payslips...")}</Alert> : null}

      <Box
        sx={{
          alignItems: "start",
          display: "grid",
          gap: 1.25,
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
            xl: "minmax(250px, 0.92fr) minmax(0, 1.42fr) minmax(280px, 1fr)",
          },
        }}
      >
        <Box sx={{ ...objCardSx, minWidth: 0, p: 1.25 }}>
          <Typography sx={{ alignItems: "center", display: "flex", fontSize: "1rem", fontWeight: 900, gap: 0.75, mb: 1.25 }}>
            <TaskAltRoundedIcon sx={{ color: "#2563eb", fontSize: 20 }} />
            {t("summary_title", "Run Summary")}
          </Typography>
          <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <MetricTile objIcon={<TaskAltRoundedIcon sx={{ fontSize: 18 }} />} strLabel={t("employees_processed", "Employees Processed")} strValue={objRun.intProcessedEmployeeCount || objRun.dicSummary.intProcessedCount} strTone="blue" />
            <MetricTile objIcon={<ShieldOutlinedIcon sx={{ fontSize: 18 }} />} strLabel={t("validation_errors", "Validation Errors")} strValue={objRun.dicSummary.intValidationErrorCount} strTone="red" />
            <MetricTile objIcon={<ReportProblemRoundedIcon sx={{ fontSize: 18 }} />} strLabel={t("warnings", "Warnings")} strValue={objRun.dicSummary.intValidationWarningCount} strTone="amber" />
            <MetricTile objIcon={<GroupRoundedIcon sx={{ fontSize: 18 }} />} strLabel={t("employees", "Employees")} strValue={objRun.intEmployeeCount || objRun.dicSummary.intInputCount} strTone="blue" />
            <MetricTile objIcon={<CalendarMonthRoundedIcon sx={{ fontSize: 18 }} />} strLabel={t("total_lwp", "Total LWP Days")} strValue={objRun.dicSummary.decTotalLwpDays} strTone="green" />
            <MetricTile objIcon={<CalendarMonthRoundedIcon sx={{ fontSize: 18 }} />} strLabel={t("total_lop", "Total LOP Days")} strValue={objRun.dicSummary.decTotalLopDays} strTone="green" />
          </Box>
        </Box>

        <Box sx={{ ...objCardSx, display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0, p: 1.25 }}>
          <Box sx={{ alignItems: "flex-start", display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "space-between", mb: 1 }}>
            <Typography sx={{ alignItems: "center", display: "flex", fontSize: "1rem", fontWeight: 900, gap: 0.75 }}>
              <SummarizeRoundedIcon sx={{ color: "#2563eb", fontSize: 20 }} />
              {t("validation_summary", "Validation Summary")}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, justifyContent: "flex-end" }}>
              <Chip label={`${intBlockingCount} ${t("blocking", "Blocking")}`} size="small" sx={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontWeight: 800 }} />
              <Chip label={`${intWarningCount} ${t("warning", "Warning")}`} size="small" sx={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#ea580c", fontWeight: 800 }} />
            </Box>
          </Box>
          <Box className={styles.tableWrap} sx={{ border: "1px solid #DCE4EF", borderRadius: "10px", maxHeight: 248, minHeight: 248 }}>
            <table className={styles.table} style={{ minWidth: "100%" }}>
              <thead>
                <tr>
                  <th>{t("level", "Level")}</th>
                  <th>{t("code", "Code")}</th>
                  <th>{t("employee", "Employee")}</th>
                  <th>{t("message", "Message")}</th>
                </tr>
              </thead>
              <tbody>
                {lstPagedValidationRows.length ? lstPagedValidationRows.map((dicIssue, intIndex) => (
                  <tr key={`${dicIssue.strValidationCode}-${dicIssue.intEmployeeID ?? "run"}-${intIndex}`}>
                    <td>
                      <Chip
                        label={dicIssue.blnIsBlocking ? t("blocking", "Blocking") : t("warning", "Warning")}
                        size="small"
                        sx={{
                          background: dicIssue.blnIsBlocking ? "#fef2f2" : "#fff7ed",
                          border: `1px solid ${dicIssue.blnIsBlocking ? "#fecaca" : "#fed7aa"}`,
                          color: dicIssue.blnIsBlocking ? "#dc2626" : "#ea580c",
                          fontWeight: 800,
                          height: 22,
                        }}
                      />
                    </td>
                    <td>{dicIssue.strValidationCode}</td>
                    <td>{dicIssue.intEmployeeID ?? "-"}</td>
                    <td style={{ maxWidth: 320 }}>
                      <Tooltip title={dicIssue.strValidationMessage} arrow>
                        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {dicIssue.strValidationMessage}
                        </span>
                      </Tooltip>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className={styles.emptyState}>{t("validation_empty", "No recent validations to show.")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Box>
          <Box sx={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "space-between", mt: 1 }}>
            <Stack direction="row" spacing={0.75}>
              <Button
                className={styles.secondaryButton}
                disabled={intSafeValidationPage <= 1}
                onClick={() => setIntValidationPage((intPrevious) => Math.max(1, intPrevious - 1))}
                sx={{ minHeight: 34 }}
                controlId="payroll.run-detail.validation.previous.button"
              >
                {t("previous", "Previous")}
              </Button>
              <Button className={styles.secondaryButton} disabled sx={{ minHeight: 34 }}>
                {intSafeValidationPage}
              </Button>
              <Button
                className={styles.secondaryButton}
                disabled={intSafeValidationPage >= intValidationPageCount}
                onClick={() => setIntValidationPage((intPrevious) => Math.min(intValidationPageCount, intPrevious + 1))}
                sx={{ minHeight: 34 }}
                controlId="payroll.run-detail.validation.next.button"
              >
                {t("next", "Next")}
              </Button>
            </Stack>
            <Stack alignItems="center" direction="row" spacing={1}>
              <Typography sx={{ color: "#5B6B82", fontSize: "0.82rem", fontWeight: 700 }}>
                {lstValidationRows.length
                  ? `${intValidationStartIndex + 1}-${intValidationEndIndex} ${t("of", "of")} ${lstValidationRows.length}`
                  : `0 ${t("of", "of")} 0`}
              </Typography>
              <TextField
                select
                size="small"
                value={intValidationRowsPerPage}
                onChange={(objEvent) => {
                  setIntValidationRowsPerPage(Number(objEvent.target.value));
                  setIntValidationPage(1);
                }}
                sx={{ width: 108 }}
                controlId="payroll.run-detail.validation.rows-per-page.select"
              >
                {[5, 10, 20].map((intSize) => (
                  <MenuItem key={intSize} value={intSize}>{`${intSize} / page`}</MenuItem>
                ))}
              </TextField>
            </Stack>
          </Box>
        </Box>

        <Box
          sx={{
            ...objCardSx,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            p: 1.25,
          }}
        >
          <Typography sx={{ alignItems: "center", display: "flex", fontSize: "1rem", fontWeight: 900, gap: 0.75, mb: 1.25 }}>
            <LockRoundedIcon sx={{ color: "#2563eb", fontSize: 20 }} />
            {t("status_title", "Payroll Controls")}
          </Typography>
          <Stack spacing={1.2} sx={{ flex: 1, minWidth: 0 }}>
            <Box>
              <Typography sx={{ color: "#64748b", fontSize: "0.76rem", fontWeight: 700, mb: 0.5 }}>{t("current_status", "Current Status")}</Typography>
              <TextField
                select
                size="small"
                value={objRun.strRunStatus}
                onChange={(objEvent) =>
                  setObjRun((dicPrevious) =>
                    dicPrevious
                      ? { ...dicPrevious, strRunStatus: objEvent.target.value as PayrollRunStatus }
                      : dicPrevious,
                  )
                }
                disabled={!blnStatusEditable || blnSaving}
                fullWidth
                sx={{ maxWidth: 260 }}
                controlId="payroll.run-detail.status.select"
              >
                {lstStatusOptions.map((strStatus) => (
                  <MenuItem key={strStatus} value={strStatus}>
                    {getPayrollRunStatusLabel(strStatus)}
                  </MenuItem>
                ))}
              </TextField>
              <Typography sx={{ color: "#5B6B82", fontSize: "0.78rem", fontWeight: 600, lineHeight: 1.35, mt: 0.75 }}>
                {objRun.blnIsLocked
                  ? t("status_locked_helper", "Status is locked. Unlock it and save before changing the status.")
                  : t("status_manual_helper", "Use this only to reset the run back to Draft/Open. Submit, Validate, Process and Payslips must be handled from the workflow actions above.")}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ color: "#64748b", fontSize: "0.76rem", fontWeight: 700 }}>{t("run_scope", "Process For")}</Typography>
              <Typography sx={{ color: "#0f172a", fontSize: "1rem", fontWeight: 900, mt: 0.35 }}>{strScopeLabel}</Typography>
            </Box>
            <Box sx={{ alignItems: "center", display: "flex", justifyContent: "space-between", minHeight: 42 }}>
              <Typography sx={{ color: "#0f172a", fontSize: "0.9rem", fontWeight: 700 }}>{t("locked", "Locked")}</Typography>
              <Switch
                checked={blnIsLocked}
                onChange={(_, blnChecked) => setBlnIsLocked(blnChecked)}
                disabled={!blnLockEditable || blnSaving}
                inputProps={{ "controlId": "payroll.run-detail.locked.switch" } as InputHTMLAttributes<HTMLInputElement>}
              />
            </Box>
            {blnCanEdit ? (
              <Button
                className={styles.primaryButton}
                startIcon={<SaveRoundedIcon />}
                onClick={saveLockState}
                disabled={blnSaving || !blnCanSaveRunControls}
                sx={{ alignSelf: "flex-end", mt: "auto" }}
                controlId="payroll.run-detail.save-status.button"
              >
                {blnSaving ? tCommon("processing", "Processing...") : tCommon("save", "Save")}
              </Button>
            ) : null}
          </Stack>
        </Box>

        <Box sx={{ ...objCardSx, gridColumn: "1 / -1", minWidth: 0, p: 1.25 }}>
          <Box sx={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "space-between", mb: 1 }}>
            <Typography sx={{ alignItems: "center", display: "flex", fontSize: "1rem", fontWeight: 900, gap: 0.75 }}>
              <ReceiptLongRoundedIcon sx={{ color: "#2563eb", fontSize: 20 }} />
              {t("payslip_panel", "Payslips")}
            </Typography>
            {blnCanGeneratePayslip ? (
              <Button
                className={styles.secondaryButton}
                startIcon={<ReceiptLongRoundedIcon />}
                onClick={generateAllPayslips}
                disabled={blnPayslipLoading}
                controlId="payroll.run-detail.payslips.generate-all.button"
              >
                {t("generate_all", "Generate All Payslips")}
              </Button>
            ) : null}
          </Box>
          <Box className={styles.tableWrap} sx={{ border: "1px solid #e5e7eb", borderRadius: "10px", maxHeight: 420, minHeight: 300 }}>
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
                {lstPayslips.length ? lstPayslips.map((dicRow) => (
                  <tr key={`${dicRow.intPayrollRunID}-${dicRow.intEmployeeID}`}>
                    <td>
                      {dicRow.strEmployeeName}
                      <Typography sx={{ color: "#64748b", fontSize: "0.75rem", fontWeight: 700 }}>{dicRow.strEmployeeCode}</Typography>
                    </td>
                    <td>{dicRow.strPayslipNumber || "-"}</td>
                    <td>{formatCurrency(dicRow.decNetPay)}</td>
                    <td>
                      <Chip label={dicRow.strPayslipStatus} size="small" sx={{ background: "#ecfdf5", border: "1px solid #bbf7d0", color: "#15803d", fontWeight: 800, height: 22 }} />
                    </td>
                    <td>{formatDateTime(dicRow.dtGeneratedOn)}</td>
                    <td>
                      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                        <Button className={styles.secondaryButton} onClick={() => viewPayslip(dicRow)} disabled={blnPayslipLoading} controlId="payroll.run-detail.payslip.view.button" data-row-key={dicRow.intEmployeeID}>{t("view", "View")}</Button>
                        {blnCanGeneratePayslip ? <Button className={styles.secondaryButton} onClick={() => generatePayslip(dicRow)} disabled={blnPayslipLoading} controlId="payroll.run-detail.payslip.generate.button" data-row-key={dicRow.intEmployeeID}>{t("generate", "Generate")}</Button> : null}
                        {blnCanExport ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => openPayslipDocument(dicRow, false)} disabled={blnPayslipLoading} controlId="payroll.run-detail.payslip.download.button" data-row-key={dicRow.intEmployeeID}>{t("download", "Download")}</Button> : null}
                        {blnCanExport ? <Button className={styles.secondaryButton} startIcon={<PrintRoundedIcon />} onClick={() => openPayslipDocument(dicRow, true)} disabled={blnPayslipLoading} controlId="payroll.run-detail.payslip.print.button" data-row-key={dicRow.intEmployeeID}>{t("print", "Print")}</Button> : null}
                      </Stack>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className={styles.emptyState}>{t("payslip_empty", "No processed payroll results are available for payslip generation.")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Box>
        </Box>
      </Box>

      {objProcessSummary ? (
        <Box sx={{ ...objCardSx, p: 1.25 }}>
          <Typography sx={{ fontSize: "1rem", fontWeight: 900, mb: 1 }}>{t("process_summary", "Processing Summary")}</Typography>
          <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" } }}>
            <MetricTile objIcon={<TaskAltRoundedIcon sx={{ fontSize: 18 }} />} strLabel={t("status", "Status")} strValue={objProcessSummary.strStatus} strTone={objProcessSummary.strStatus === "Failed" ? "red" : "green"} />
            <MetricTile objIcon={<GroupRoundedIcon sx={{ fontSize: 18 }} />} strLabel={t("processed", "Processed")} strValue={objProcessSummary.intProcessedEmployeeCount} strTone="blue" />
            <MetricTile objIcon={<ErrorOutlineRoundedIcon sx={{ fontSize: 18 }} />} strLabel={t("failed", "Failed")} strValue={objProcessSummary.intFailedEmployeeCount} strTone="red" />
            <MetricTile objIcon={<PaidRoundedIcon sx={{ fontSize: 18 }} />} strLabel={t("net_total", "Net Pay")} strValue={formatCurrency(objProcessSummary.decNetPayTotal || 0)} strTone="green" />
          </Box>
          {objProcessSummary.lstExceptions.length ? <Alert severity="warning" sx={{ mt: 1 }}>{objProcessSummary.lstExceptions.map((dicException) => dicException.strMessage).join(" | ")}</Alert> : null}
        </Box>
      ) : null}

      <Dialog open={blnPayslipDialogOpen} onClose={() => setBlnPayslipDialogOpen(false)} maxWidth="lg" fullWidth controlId="payroll.run-detail.payslip-preview.dialog">
        <DialogTitle sx={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
          {t("payslip_preview", "Payslip Preview")}
          <IconButton onClick={() => setBlnPayslipDialogOpen(false)} controlId="payroll.run-detail.payslip-preview.close.icon-button">
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {strPayslipPreviewHtml ? <PayslipHtmlPreview strHtml={strPayslipPreviewHtml} /> : null}
        </DialogContent>
      </Dialog>
      <Dialog
        open={blnReprocessDialogOpen}
        onClose={() => !blnSaving && setBlnReprocessDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        controlId="payroll.run-detail.reprocess.dialog"
      >
        <DialogTitle>{t("reprocess_reason", "Reason for reprocess")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            value={strReprocessReason}
            onChange={(objEvent) => setStrReprocessReason(objEvent.target.value)}
            placeholder={t("reprocess_reason_placeholder", "Enter the business reason for reprocessing this payroll run")}
            sx={{ mt: 1 }}
            controlId="payroll.run-detail.reprocess.reason.textarea"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            className={styles.secondaryButton}
            onClick={() => setBlnReprocessDialogOpen(false)}
            disabled={blnSaving}
            controlId="payroll.run-detail.reprocess.cancel.button"
          >
            {tCommon("cancel", "Cancel")}
          </Button>
          <Button
            className={styles.primaryButton}
            startIcon={<RestartAltRoundedIcon />}
            onClick={reprocessRun}
            disabled={blnSaving || !strReprocessReason.trim()}
            controlId="payroll.run-detail.reprocess.submit.button"
          >
            {t("reprocess", "Reprocess")}
          </Button>
        </DialogActions>
      </Dialog>
      <BlockingLoader
        blnOpen={blnSaving || blnPayslipLoading}
        strLabel={strActionLoaderLabel || tCommon("processing", "Processing...")}
      />
    </Box>
  );
}
