"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
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
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { type InputHTMLAttributes, type MouseEvent, type ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

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
  PayrollValidationResultRecord,
  PayrollValidationSummary,
  AttendanceValidateRunResult,
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
const lstWorkflowStepNames = ["Draft", "Validate", "Process", "Review Results", "Finalize Payroll", "Generate Payslips"] as const;

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
    DRAFT: "Draft",
    VALIDATED: "Validated",
    PROCESSED: "Processed",
    FINALIZED: "Finalized",
    CANCELLED: "Cancelled",
  };
  return dicLabels[strStatus] ?? strStatus;
}

function getWorkflowSteps(strRunStatus: string) {
  const strCurrentStep =
    strRunStatus === "FINALIZED"
      ? "Generate Payslips"
      : strRunStatus === "PROCESSED"
        ? "Finalize Payroll"
        : strRunStatus === "VALIDATED"
          ? "Process"
          : "Validate";
  return lstWorkflowStepNames.map((strStep) => ({
    strStep,
    blnActive: strStep === strCurrentStep,
  }));
}

function canProcessPayrollRun(objRun: PayrollRunDetailRecord, blnCanProcess: boolean) {
  if (!blnCanProcess) {
    return false;
  }
  if (objRun.strRunStatus === "VALIDATED") {
    return true;
  }
  return (
    objRun.strRunStatus === "PROCESSED" &&
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
  blnCanFinalize: boolean,
  blnCanGeneratePayslip: boolean,
) {
  if (blnSaving || objRun.strRunStatus === "CANCELLED") {
    return false;
  }
  switch (strStep) {
    case "Draft":
      return false;
    case "Validate":
      return blnCanValidate && objRun.strRunStatus === "DRAFT";
    case "Process":
      return canProcessPayrollRun(objRun, blnCanProcess);
    case "Review Results":
      return ["PROCESSED", "FINALIZED"].includes(objRun.strRunStatus);
    case "Finalize Payroll":
      return blnCanFinalize && objRun.strRunStatus === "PROCESSED" && objRun.dicSummary.intValidationErrorCount <= 0;
    case "Generate Payslips":
      return blnCanGeneratePayslip && !blnPayslipLoading && ["PROCESSED", "FINALIZED"].includes(objRun.strRunStatus);
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
  const objTone = ["VALIDATED", "PROCESSED"].includes(strStatus)
    ? getToneStyles("green")
    : strStatus === "CANCELLED"
      ? getToneStyles("red")
      : strStatus === "FINALIZED"
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
    <Box sx={{ alignItems: "center", display: "flex", gap: 1, minHeight: 58, minWidth: 0 }}>
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
        <Typography sx={{ color: "#475569", fontSize: "0.75rem", fontWeight: 700, lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis" }}>
          {strLabel}
        </Typography>
        <Typography
          title={strValue}
          sx={{
            color: "#0f172a",
            fontSize: "clamp(0.82rem, 0.78rem + 0.12vw, 0.94rem)",
            fontWeight: 900,
            lineHeight: 1.2,
            mt: 0.35,
            overflow: "hidden",
            overflowWrap: "anywhere",
            textOverflow: "ellipsis",
          }}
        >
          {strValue}
        </Typography>
      </Box>
    </Box>
  );
}

function MetricTile({ objIcon, strLabel, strValue, strTone, onClick, controlId }: { objIcon: ReactNode; strLabel: string; strValue: string | number; strTone: Tone; onClick?: () => void; controlId?: string }) {
  const objTone = getToneStyles(strTone);
  return (
    <Box
      onClick={onClick}
      data-controlid={onClick ? controlId : undefined}
      sx={{
        alignItems: "center",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        cursor: onClick ? "pointer" : "default",
        display: "flex",
        gap: 1,
        minHeight: 62,
        p: 1,
        transition: "border-color 120ms ease",
        ...(onClick ? { "&:hover": { borderColor: "#94a3b8" } } : {}),
      }}
    >
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

type DataTableColumn<T> = {
  strKey: string;
  objHeader: ReactNode;
  numWidth?: number;
  strClassName?: string;
  fnRender: (dicRow: T, intIndex: number) => ReactNode;
};

function DataTable<T>({
  lstColumns,
  lstRows,
  fnKey,
  strEmptyMessage,
  numMinWidth,
  objSx,
}: {
  lstColumns: DataTableColumn<T>[];
  lstRows: T[];
  fnKey: (dicRow: T, intIndex: number) => string;
  strEmptyMessage: string;
  numMinWidth?: number;
  objSx?: Record<string, unknown>;
}) {
  return (
    <Box className={styles.tableWrap} sx={{ border: "1px solid #DCE4EF", borderRadius: "10px", ...objSx }}>
      <table className={styles.table} style={numMinWidth ? { minWidth: numMinWidth } : undefined}>
        {lstColumns.some((dicColumn) => dicColumn.numWidth) ? (
          <colgroup>
            {lstColumns.map((dicColumn) => (
              <col key={dicColumn.strKey} style={dicColumn.numWidth ? { width: dicColumn.numWidth } : undefined} />
            ))}
          </colgroup>
        ) : null}
        <thead>
          <tr>
            {lstColumns.map((dicColumn) => (
              <th key={dicColumn.strKey} className={dicColumn.strClassName}>
                {dicColumn.objHeader}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lstRows.length ? (
            lstRows.map((dicRow, intIndex) => (
              <tr key={fnKey(dicRow, intIndex)}>
                {lstColumns.map((dicColumn) => (
                  <td key={dicColumn.strKey} className={dicColumn.strClassName}>
                    {dicColumn.fnRender(dicRow, intIndex)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={lstColumns.length} className={styles.emptyState}>
                {strEmptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Box>
  );
}

function getWorkflowStepIcon(strStep: string) {
  if (strStep === "Draft") {
    return <TaskAltRoundedIcon sx={{ fontSize: 18 }} />;
  }
  if (strStep === "Validate") {
    return <ShieldOutlinedIcon sx={{ fontSize: 18 }} />;
  }
  if (strStep === "Process") {
    return <PlayArrowRoundedIcon sx={{ fontSize: 18 }} />;
  }
  if (strStep === "Review Results") {
    return <SummarizeRoundedIcon sx={{ fontSize: 18 }} />;
  }
  if (strStep === "Finalize Payroll") {
    return <LockRoundedIcon sx={{ fontSize: 18 }} />;
  }
  if (strStep === "Generate Payslips") {
    return <ReceiptLongRoundedIcon sx={{ fontSize: 18 }} />;
  }
  return <TaskAltRoundedIcon sx={{ fontSize: 18 }} />;
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
  if (objRun.strRunStatus === "CANCELLED") {
    return "disabled";
  }
  if (strStep === "Draft") {
    return "complete";
  }
  if (strStep === "Validate") {
    if (["VALIDATED", "PROCESSED", "FINALIZED"].includes(objRun.strRunStatus)) {
      return "complete";
    }
    return blnEnabled || blnActive ? "current" : "disabled";
  }
  if (strStep === "Process") {
    if (["PROCESSED", "FINALIZED"].includes(objRun.strRunStatus)) {
      return "complete";
    }
    return blnEnabled || blnActive ? "current" : "disabled";
  }
  if (strStep === "Review Results") {
    return ["PROCESSED", "FINALIZED"].includes(objRun.strRunStatus) ? "available" : "disabled";
  }
  if (strStep === "Finalize Payroll") {
    if (objRun.strRunStatus === "FINALIZED") {
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
  const strPathname = usePathname();
  const { t } = useModuleLabels("payroll-runs");
  const { t: tCommon } = useModuleLabels("common");
  const { t: tAttendance } = useModuleLabels("payroll-attendance-integration");
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
  const [strPayslipPreviewHtml, setStrPayslipPreviewHtml] = useState("");
  const [intPreviewResultID, setIntPreviewResultID] = useState<number | null>(null);
  const [blnPayslipLoading, setBlnPayslipLoading] = useState(false);
  const [strActionLoaderLabel, setStrActionLoaderLabel] = useState("");
  const [blnPayslipDialogOpen, setBlnPayslipDialogOpen] = useState(false);
  const [blnReprocessDialogOpen, setBlnReprocessDialogOpen] = useState(false);
  const [strReprocessReason, setStrReprocessReason] = useState("");
  const [blnReopenDialogOpen, setBlnReopenDialogOpen] = useState(false);
  const [strReopenReason, setStrReopenReason] = useState("");
  const [blnCancelDialogOpen, setBlnCancelDialogOpen] = useState(false);
  const [objActionsAnchor, setObjActionsAnchor] = useState<null | HTMLElement>(null);
  const [intValidationPage, setIntValidationPage] = useState(1);
  const [intValidationRowsPerPage, setIntValidationRowsPerPage] = useState(5);
  const [objAttendanceValidationResult, setObjAttendanceValidationResult] = useState<AttendanceValidateRunResult | null>(null);
  const [blnAttendanceBlockedFilterActive, setBlnAttendanceBlockedFilterActive] = useState(false);
  const [strActiveTab, setStrActiveTab] = useState<"run" | "valid">("run");
  const blnCanView = canViewAny() || canDoAny("list");
  const blnCanEdit = canDoAny("edit");
  const blnCanValidate = canDoAny("validate") || canDoAny("submit");
  const blnCanProcess = canDoAny("process") || canDoAny("approve");
  const blnCanReprocess = canDoAny("reprocess") || canDoAny("edit");
  const blnCanFinalize = canDoAny("edit") || canDoAny("close") || canDoAny("finalize");
  const blnCanReopen = canDoAny("reopen");
  const blnCanCancel = canDoAny("edit") || canDoAny("cancel");
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
      if (["PROCESSED", "FINALIZED"].includes(dicRun.strRunStatus)) {
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
      setStrSuccess(t("status_update_success", "Payroll run updated successfully."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to update payroll run status.");
    } finally {
      setBlnSaving(false);
      setStrActionLoaderLabel("");
    }
  }

  async function finalizeRun() {
    if (!blnCanFinalize) {
      return;
    }
    setBlnSaving(true);
    setStrActionLoaderLabel(t("finalizing_run", "Finalizing payroll run..."));
    setStrError("");
    setStrSuccess("");
    try {
      const dicRun = await payrollRunService.closePayrollRun(intRunID);
      setObjRun(dicRun);
      setBlnIsLocked(dicRun.blnIsLocked);
      setStrSuccess(t("finalize_complete", "Payroll run finalized successfully."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to finalize payroll run.");
    } finally {
      setBlnSaving(false);
      setStrActionLoaderLabel("");
    }
  }

  function openReopenDialog() {
    if (!blnCanReopen) {
      return;
    }
    setStrReopenReason("");
    setStrError("");
    setBlnReopenDialogOpen(true);
  }

  async function reopenRun() {
    const strReason = strReopenReason.trim();
    if (!blnCanReopen || !strReason) {
      return;
    }
    setBlnReopenDialogOpen(false);
    setBlnSaving(true);
    setStrActionLoaderLabel(t("reopening_run", "Reopening payroll run..."));
    setStrError("");
    setStrSuccess("");
    try {
      const dicRun = await payrollRunService.reopenPayrollRun(intRunID, strReason);
      setObjRun(dicRun);
      setBlnIsLocked(dicRun.blnIsLocked);
      setStrSuccess(t("reopen_complete", "Payroll run reopened successfully."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to reopen payroll run.");
    } finally {
      setBlnSaving(false);
      setStrActionLoaderLabel("");
    }
  }

  function openCancelDialog() {
    if (!blnCanCancel) {
      return;
    }
    setStrError("");
    setBlnCancelDialogOpen(true);
  }

  async function cancelRun() {
    if (!blnCanCancel) {
      return;
    }
    setBlnCancelDialogOpen(false);
    setBlnSaving(true);
    setStrActionLoaderLabel(t("cancelling_run", "Cancelling payroll run..."));
    setStrError("");
    setStrSuccess("");
    try {
      const dicRun = await payrollRunService.cancelPayrollRun(intRunID);
      setObjRun(dicRun);
      setStrSuccess(t("cancel_complete", "Payroll run cancelled."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to cancel payroll run.");
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
      setObjAttendanceValidationResult(dicSummary.dicAttendanceSync ?? null);
      await loadRun(false);
      setStrSuccess(
        dicSummary.strStatus === "Passed"
          ? t("validation_complete_approved", "Payroll validation completed. Run status updated to Validated.")
          : t("validation_complete", "Payroll validation completed."),
      );
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to validate payroll run.");
    } finally {
      setBlnSaving(false);
      setStrActionLoaderLabel("");
    }
  }

  function viewBlockedAttendanceEmployees() {
    if (!objAttendanceValidationResult || objAttendanceValidationResult.intBlockedCount <= 0) {
      return;
    }
    setBlnAttendanceBlockedFilterActive(true);
    setStrActiveTab("valid");
    window.setTimeout(() => {
      document.getElementById("payroll-run-validation-summary")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
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
      setObjAttendanceValidationResult(dicSummary.dicAttendanceSync ?? null);
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
    if (!objRun || !["PROCESSED", "FINALIZED"].includes(objRun.strRunStatus)) {
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
      let dicPayslip = intPayslipID
        ? await payslipService.getPayslipPreview(intRunID, dicRow.intEmployeeID)
        : await generatePayslip(dicRow);
      intPayslipID = dicPayslip?.intPayslipID ?? intPayslipID;
      if (!intPayslipID) {
        setStrError(t("payslip_not_generated", "Payslip could not be generated for this employee."));
        return;
      }
      setIntPreviewResultID(dicPayslip?.dicFooter?.intPayrollResultID ?? null);
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

  function goToAttendanceLeaveInputs() {
    handleCloseActions();
    objRouter.push(`/payroll/attendance-leave-inputs?runId=${intRunID}`);
  }

  function goToPayrollInputs() {
    handleCloseActions();
    objRouter.push(`/payroll/inputs?runId=${intRunID}`);
  }

  function goToProcessingHistory() {
    handleCloseActions();
    objRouter.push(`/payroll/process-log/run/${intRunID}`);
  }

  function goToResults() {
    handleCloseActions();
    objRouter.push(`/payroll/results?runId=${intRunID}`);
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

  const lstAllValidationRows = objValidationSummary?.lstIssues ?? objRun.lstValidationResults;
  const setAttendanceBlockingCodes = new Set(["PAY_ATT_MISSING_DAY", "PAY_ATT_NO_POLICY", "PAY_ATT_BLOCKING_EXCEPTION"]);
  const lstValidationRows = blnAttendanceBlockedFilterActive
    ? lstAllValidationRows.filter(
        (dicIssue) => dicIssue.blnIsBlocking && setAttendanceBlockingCodes.has(dicIssue.strValidationCode),
      )
    : lstAllValidationRows;
  const intBlockingCount = lstValidationRows.filter((dicIssue) => dicIssue.blnIsBlocking).length;
  const intWarningCount = lstValidationRows.filter((dicIssue) => !dicIssue.blnIsBlocking).length;
  const intValidationPageCount = Math.max(1, Math.ceil(lstValidationRows.length / intValidationRowsPerPage));
  const intSafeValidationPage = Math.min(intValidationPage, intValidationPageCount);
  const intValidationStartIndex = lstValidationRows.length ? (intSafeValidationPage - 1) * intValidationRowsPerPage : 0;
  const intValidationEndIndex = Math.min(intValidationStartIndex + intValidationRowsPerPage, lstValidationRows.length);
  const lstPagedValidationRows = lstValidationRows.slice(intValidationStartIndex, intValidationEndIndex);
  const blnLockEditable = blnCanEdit;
  const blnCanSaveRunControls = blnCanEdit && blnIsLocked !== objRun.blnIsLocked;
  const blnShowPayrollControls = ["PROCESSED", "FINALIZED"].includes(objRun.strRunStatus);
  const strScopeLabel = objRun.strScopeType === "SelectedEmployee"
    ? `${t("scope_selected_employee", "Selected Employees")} #${objRun.intScopedEmployeeID ?? "-"}`
    : (objRun.strPayrollGroupName ?? t("scope_payroll_group", "Payroll Group"));
  const lstWorkflowSteps = getWorkflowSteps(objRun.strRunStatus);

  const lstKpis = [
    { strLabel: t("payroll_month", "Payroll Period"), strValue: formatMonth(objRun.dtPayrollMonth), objIcon: <CalendarMonthRoundedIcon sx={{ fontSize: 21 }} />, strTone: "blue" as Tone },
    { strLabel: t("run_scope", "Payroll Group / Scope"), strValue: strScopeLabel, objIcon: <GroupRoundedIcon sx={{ fontSize: 21 }} />, strTone: "blue" as Tone },
    { strLabel: t("employees_in_run", "Employees in Run"), strValue: String(objRun.intEmployeeCount || objRun.dicSummary.intInputCount), objIcon: <TaskAltRoundedIcon sx={{ fontSize: 21 }} />, strTone: "green" as Tone },
    { strLabel: t("gross_pay", "Gross Pay"), strValue: formatCurrency(objRun.decGrossPayTotal), objIcon: <PaidRoundedIcon sx={{ fontSize: 21 }} />, strTone: "blue" as Tone },
    { strLabel: t("deduction_total", "Employee Deductions"), strValue: formatCurrency(objRun.decDeductionTotal), objIcon: <WalletRoundedIcon sx={{ fontSize: 21 }} />, strTone: "red" as Tone },
    { strLabel: t("tax_total", "Tax"), strValue: formatCurrency(objRun.decTaxTotal), objIcon: <SummarizeRoundedIcon sx={{ fontSize: 21 }} />, strTone: "green" as Tone },
    { strLabel: t("employer_contribution_total", "Employer Contributions"), strValue: formatCurrency(objRun.decEmployerContributionTotal), objIcon: <WalletRoundedIcon sx={{ fontSize: 21 }} />, strTone: "blue" as Tone },
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
      <Box sx={{ ...objCardSx, borderColor: "#DCE4EF", p: { xs: 1.1, md: 1.35 } }}>
        <Box sx={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Box sx={{ alignItems: "center", display: "flex", flex: "0 0 auto", gap: 1.1, minWidth: 0 }}>
            <Typography sx={{ color: "#0F2747", fontSize: { xs: "1.15rem", md: "1.3rem" }, fontWeight: 900, lineHeight: 1.05, whiteSpace: "nowrap" }}>
              {objRun.strRunName}
            </Typography>
            <StatusPill strStatus={objRun.strRunStatus} />
          </Box>
          <Box sx={{ flex: "1 1 auto", minWidth: 0 }} />

          <Box sx={{ alignItems: "center", display: "flex", flex: "0 1 auto", gap: 0.75, minWidth: 0, overflowX: "auto", pb: 0.25 }}>
            {lstWorkflowSteps.map((dicStep, intIndex) => {
              const blnEnabled = isWorkflowStepEnabled(dicStep.strStep, objRun, blnSaving, blnPayslipLoading, blnCanValidate, blnCanProcess, blnCanFinalize, blnCanGeneratePayslip);
              const fnOnClick =
                dicStep.strStep === "Validate"
                  ? validateRun
                  : dicStep.strStep === "Process"
                    ? processRun
                    : dicStep.strStep === "Review Results"
                      ? goToResults
                      : dicStep.strStep === "Finalize Payroll"
                        ? finalizeRun
                        : dicStep.strStep === "Generate Payslips"
                          ? generateAllPayslips
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
                    {t(`workflow_${dicStep.strStep.toLowerCase().replaceAll(" ", "_")}`, dicStep.strStep)}
                  </Button>
                </Box>
              );
            })}
          </Box>

          <Box sx={{ alignItems: "center", display: "flex", flex: "0 0 auto", gap: 0.75 }}>
            <Button
              className={styles.secondaryButton}
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => objRouter.push("/payroll/runs")}
              sx={{ flex: "0 0 auto", height: 38, minHeight: 38 }}
              controlId="payroll.run-detail.back-to-list.button"
            >
              {t("back_to_list", "Back to List")}
            </Button>
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
          {blnCanReprocess ? (
            <MenuItem
              onClick={() => { handleCloseActions(); openReprocessDialog(); }}
              disabled={blnSaving || objRun.strRunStatus !== "PROCESSED"}
              data-controlid="payroll.run-detail.actions.reprocess.menu-item"
            >
              {t("reprocess", "Reprocess Payroll")}
            </MenuItem>
          ) : null}
          <MenuItem onClick={goToPayrollInputs} data-controlid="payroll.run-detail.actions.payroll-inputs.menu-item">
            {t("view_payroll_inputs", "View Payroll Inputs")}
          </MenuItem>
          <MenuItem onClick={goToProcessingHistory} data-controlid="payroll.run-detail.actions.processing-history.menu-item">
            {t("view_processing_history", "View Processing History")}
          </MenuItem>
          {objRun.strRunStatus === "FINALIZED" && blnCanReopen ? (
            <MenuItem onClick={() => { handleCloseActions(); openReopenDialog(); }} data-controlid="payroll.run-detail.actions.reopen.menu-item">
              {t("reopen_run", "Reopen Payroll")}
            </MenuItem>
          ) : null}
        </Menu>
      </Box>

      {strRightsError ? <Alert severity="warning">{strRightsError}</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}
      {blnPayslipLoading ? <Alert severity="info">{t("payslip_preparing", "Preparing payslips...")}</Alert> : null}

      <Box sx={{ ...objCardSx, borderColor: "#DCE4EF", overflow: "hidden", p: 0 }}>
        <Tabs
          value={strActiveTab}
          onChange={(_objEvent, strValue) => setStrActiveTab(strValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: "1px solid #DCE4EF", minHeight: 46, px: { xs: 1, md: 1.5 } }}
          data-controlid="payroll.run-detail.tabs"
        >
          <Tab
            value="run"
            label={t("summary_title", "Run Summary")}
            icon={<TaskAltRoundedIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            sx={{ fontSize: "0.82rem", fontWeight: 800, minHeight: 46, textTransform: "none" }}
            data-controlid="payroll.run-detail.tab.run.button"
          />
          <Tab
            value="valid"
            label={
              <Box sx={{ alignItems: "center", display: "flex", gap: 0.6 }}>
                <span>{t("validation_summary", "Validation Summary")}</span>
                {lstAllValidationRows.length ? (
                  <Box
                    component="span"
                    sx={{ background: "#fef2f2", borderRadius: "999px", color: "#dc2626", fontSize: "0.68rem", fontWeight: 800, px: 0.9, py: 0.15 }}
                  >
                    {lstAllValidationRows.length}
                  </Box>
                ) : null}
              </Box>
            }
            icon={<SummarizeRoundedIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            sx={{ fontSize: "0.82rem", fontWeight: 800, minHeight: 46, textTransform: "none" }}
            data-controlid="payroll.run-detail.tab.valid.button"
          />
        </Tabs>

        <Box sx={{ p: { xs: 1.1, md: 1.35 } }}>
        {strActiveTab === "run" ? (
        <>
        <Box
          sx={{
            alignItems: "start",
            display: "grid",
            gap: 1.25,
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(280px, 0.9fr) minmax(360px, 1.3fr)",
            },
          }}
        >
        <Box id="payroll-run-summary" sx={{ ...objCardSx, scrollMarginTop: 88, minWidth: 0, p: 1.25 }}>
          <Typography sx={{ alignItems: "center", display: "flex", fontSize: "1rem", fontWeight: 900, gap: 0.75, mb: 1.25 }}>
            <TaskAltRoundedIcon sx={{ color: "#2563eb", fontSize: 20 }} />
            {t("summary_title", "Run Summary")}
          </Typography>
          <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <MetricTile objIcon={<CalendarMonthRoundedIcon sx={{ fontSize: 18 }} />} strLabel={t("total_lwp", "Total LWP Days")} strValue={objRun.dicSummary.decTotalLwpDays} strTone="green" />
            <MetricTile objIcon={<CalendarMonthRoundedIcon sx={{ fontSize: 18 }} />} strLabel={t("total_lop", "Total LOP Days")} strValue={objRun.dicSummary.decTotalLopDays} strTone="green" />
          </Box>

          <Button
            className={styles.secondaryButton}
            onClick={goToAttendanceLeaveInputs}
            startIcon={<ShieldOutlinedIcon sx={{ fontSize: 16 }} />}
            sx={{ height: 34, minHeight: 34, mb: 1, mt: 1.5, width: "100%" }}
            controlId="payroll.run-detail.open-attendance-leave-inputs.button"
          >
            {tAttendance("ATTENDANCE_OPEN_SCREEN_BUTTON", "View Attendance & Leave Inputs")}
          </Button>
          {objAttendanceValidationResult && objAttendanceValidationResult.intBlockedCount > 0 ? (
            <Chip
              label={tAttendance(
                "ATTENDANCE_BLOCKED_SUMMARY_CHIP",
                `${objAttendanceValidationResult.intBlockedCount} attendance issue(s) blocking - view in Validation Summary`,
              )}
              size="small"
              onClick={viewBlockedAttendanceEmployees}
              icon={<ErrorOutlineRoundedIcon sx={{ fontSize: 16 }} />}
              sx={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", cursor: "pointer", fontWeight: 800, height: 26 }}
              controlId="payroll.run-detail.attendance-blocked-summary.chip"
            />
          ) : null}
        </Box>

        <Box sx={{ ...objCardSx, minWidth: 0, p: 1.25 }}>
          <Box
            sx={{
              border: "1px solid #DCE4EF",
              borderRadius: "10px",
              display: "grid",
              gap: { xs: 0.75, md: 1 },
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(3, minmax(0, 1fr))",
              },
              px: 1.25,
              py: 1,
            }}
          >
            {lstKpis.map((dicKpi) => (
              <KpiTile key={dicKpi.strLabel} objIcon={dicKpi.objIcon} strLabel={dicKpi.strLabel} strValue={dicKpi.strValue} strTone={dicKpi.strTone} />
            ))}
          </Box>
        </Box>
        </Box>

        <Box sx={{ ...objCardSx, minWidth: 0, mt: 1.25, p: 1.25 }}>
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
          <DataTable<PayslipRunListRecord>
            lstColumns={[
              {
                strKey: "employee",
                objHeader: t("employee", "Employee"),
                fnRender: (dicRow) => (
                  <>
                    {dicRow.strEmployeeName}
                    <Typography sx={{ color: "#64748b", fontSize: "0.75rem", fontWeight: 700 }}>{dicRow.strEmployeeCode}</Typography>
                  </>
                ),
              },
              { strKey: "payslipNo", objHeader: t("payslip_no", "Payslip No."), fnRender: (dicRow) => dicRow.strPayslipNumber || "-" },
              { strKey: "netPay", objHeader: t("net_pay", "Net Pay"), fnRender: (dicRow) => formatCurrency(dicRow.decNetPay) },
              {
                strKey: "status",
                objHeader: t("status", "Status"),
                fnRender: (dicRow) => (
                  <Chip label={dicRow.strPayslipStatus} size="small" sx={{ background: "#ecfdf5", border: "1px solid #bbf7d0", color: "#15803d", fontWeight: 800, height: 22 }} />
                ),
              },
              { strKey: "generatedOn", objHeader: t("generated_on", "Generated On"), fnRender: (dicRow) => formatDateTime(dicRow.dtGeneratedOn) },
              {
                strKey: "actions",
                objHeader: t("actions", "Actions"),
                strClassName: styles.actionsColumn,
                fnRender: (dicRow) => (
                  <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                    <Button className={styles.secondaryButton} onClick={() => viewPayslip(dicRow)} disabled={blnPayslipLoading} controlId="payroll.run-detail.payslip.view.button" data-row-key={dicRow.intEmployeeID}>{t("view", "View")}</Button>
                    {blnCanGeneratePayslip ? <Button className={styles.secondaryButton} onClick={() => generatePayslip(dicRow)} disabled={blnPayslipLoading} controlId="payroll.run-detail.payslip.generate.button" data-row-key={dicRow.intEmployeeID}>{t("generate", "Generate")}</Button> : null}
                    {blnCanExport ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => openPayslipDocument(dicRow, false)} disabled={blnPayslipLoading} controlId="payroll.run-detail.payslip.download.button" data-row-key={dicRow.intEmployeeID}>{t("download", "Download")}</Button> : null}
                    {blnCanExport ? <Button className={styles.secondaryButton} startIcon={<PrintRoundedIcon />} onClick={() => openPayslipDocument(dicRow, true)} disabled={blnPayslipLoading} controlId="payroll.run-detail.payslip.print.button" data-row-key={dicRow.intEmployeeID}>{t("print", "Print")}</Button> : null}
                  </Stack>
                ),
              },
            ]}
            lstRows={lstPayslips}
            fnKey={(dicRow) => `${dicRow.intPayrollRunID}-${dicRow.intEmployeeID}`}
            strEmptyMessage={t("payslip_empty", "No processed payroll results are available for payslip generation.")}
            objSx={{ maxHeight: 420, minHeight: 300 }}
          />
        </Box>
        </>
        ) : null}

        {strActiveTab === "valid" ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        {blnShowPayrollControls ? (
        <Box
          id="payroll-run-controls"
          sx={{
            ...objCardSx,
            display: "flex",
            flexDirection: "column",
            scrollMarginTop: 88,
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
              <Typography sx={{ color: "#64748b", fontSize: "0.76rem", fontWeight: 700 }}>{t("current_status", "Current Status")}</Typography>
              <Box sx={{ mt: 0.5 }}>
                <StatusPill strStatus={objRun.strRunStatus} />
              </Box>
              <Typography sx={{ color: "#5B6B82", fontSize: "0.78rem", fontWeight: 600, lineHeight: 1.35, mt: 0.75 }}>
                {t("status_manual_helper", "Status changes only through the workflow actions above (Validate, Process, Finalize) or Reopen/Cancel from the More menu.")}
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
        ) : null}

        <Box id="payroll-run-validation-summary" sx={{ ...objCardSx, display: "flex", flexDirection: "column", scrollMarginTop: 88, minHeight: 0, minWidth: 0, p: 1.25 }}>
          <Box sx={{ alignItems: "flex-start", display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "space-between", mb: 1 }}>
            <Typography sx={{ alignItems: "center", display: "flex", fontSize: "1rem", fontWeight: 900, gap: 0.75 }}>
              <SummarizeRoundedIcon sx={{ color: "#2563eb", fontSize: 20 }} />
              {t("validation_summary", "Validation Summary")}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, justifyContent: "flex-end" }}>
              {blnAttendanceBlockedFilterActive ? (
                <Chip
                  label={tAttendance("ATTENDANCE_BLOCKED_FILTER_CLEAR", "Showing blocked employees only ✕")}
                  size="small"
                  onClick={() => setBlnAttendanceBlockedFilterActive(false)}
                  sx={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", cursor: "pointer", fontWeight: 800 }}
                  controlId="payroll.run-detail.clear-blocked-filter.chip"
                />
              ) : null}
              <Chip label={`${intBlockingCount} ${t("blocking", "Blocking")}`} size="small" sx={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontWeight: 800 }} />
              <Chip label={`${intWarningCount} ${t("warning", "Warning")}`} size="small" sx={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#ea580c", fontWeight: 800 }} />
            </Box>
          </Box>
          <DataTable<PayrollValidationResultRecord>
            lstColumns={[
              {
                strKey: "level",
                objHeader: t("level", "Level"),
                numWidth: 100,
                fnRender: (dicIssue) => {
                  const strSeverity = dicIssue.strSeverity ?? (dicIssue.blnIsBlocking ? "BLOCKING" : "WARNING");
                  const dicSeverityTone =
                    strSeverity === "BLOCKING"
                      ? { background: "#fef2f2", border: "#fecaca", color: "#dc2626", label: t("blocking", "Blocking") }
                      : strSeverity === "INFO"
                        ? { background: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8", label: t("info", "Info") }
                        : { background: "#fff7ed", border: "#fed7aa", color: "#ea580c", label: t("warning", "Warning") };
                  return (
                    <Chip
                      label={dicSeverityTone.label}
                      size="small"
                      sx={{
                        background: dicSeverityTone.background,
                        border: `1px solid ${dicSeverityTone.border}`,
                        color: dicSeverityTone.color,
                        fontWeight: 800,
                        height: 22,
                      }}
                    />
                  );
                },
              },
              {
                strKey: "category",
                objHeader: t("category", "Category"),
                numWidth: 190,
                fnRender: (dicIssue) => (
                  <Tooltip title={dicIssue.strValidationCode} arrow>
                    <span>{dicIssue.strCategory ?? t("category_general", "General")}</span>
                  </Tooltip>
                ),
              },
              {
                strKey: "employee",
                objHeader: t("employee", "Employee"),
                numWidth: 176,
                fnRender: (dicIssue) =>
                  dicIssue.strEmployeeName || dicIssue.strEmployeeCode ? (
                    <>
                      {dicIssue.strEmployeeName || dicIssue.strEmployeeCode}
                      {dicIssue.strEmployeeCode ? (
                        <Typography component="span" sx={{ color: "#64748b", fontSize: "0.74rem", fontWeight: 700, ml: 0.5 }}>
                          ({dicIssue.strEmployeeCode})
                        </Typography>
                      ) : null}
                    </>
                  ) : (
                    dicIssue.intEmployeeID ?? "-"
                  ),
              },
              {
                strKey: "message",
                objHeader: t("message", "Message"),
                fnRender: (dicIssue) => (
                  <Tooltip title={dicIssue.strValidationMessage} arrow>
                    <span style={{ display: "block", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {dicIssue.strValidationMessage}
                    </span>
                  </Tooltip>
                ),
              },
              {
                strKey: "fix",
                objHeader: "",
                numWidth: 84,
                fnRender: (dicIssue, intIndex) =>
                  dicIssue.objNavigationTarget?.strEntityName === "tblemployee_payroll_input" ? (
                    <Button
                      size="small"
                      onClick={() => objRouter.push(`/payroll/inputs?runId=${intRunID}${dicIssue.intEmployeeID ? `&employeeId=${dicIssue.intEmployeeID}` : ""}`)}
                      controlId="payroll.run-detail.validation.fix-link.button"
                      data-row-key={`${dicIssue.strValidationCode}-${dicIssue.intEmployeeID ?? "run"}-${intIndex}`}
                      sx={{ minWidth: 0, fontSize: "0.76rem", fontWeight: 800 }}
                    >
                      {t("fix", "Fix")}
                    </Button>
                  ) : null,
              },
            ]}
            lstRows={lstPagedValidationRows}
            fnKey={(dicIssue, intIndex) => `${dicIssue.strValidationCode}-${dicIssue.intEmployeeID ?? "run"}-${intIndex}`}
            strEmptyMessage={t("validation_empty", "No recent validations to show.")}
            numMinWidth={720}
            objSx={{ maxHeight: 248, minHeight: 248 }}
          />
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
              <Box
                sx={{ minHeight: 34, minWidth: 34, display: "grid", placeItems: "center", px: 1, borderRadius: "10px", border: "1px solid rgba(198,210,236,0.82)", color: "#31456a", fontWeight: 800, fontSize: "0.86rem" }}
              >
                {intSafeValidationPage}
              </Box>
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
        </Box>
        ) : null}
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
        <DialogTitle sx={{ alignItems: "center", display: "flex", justifyContent: "space-between", gap: 1 }}>
          {t("payslip_preview", "Payslip Preview")}
          <Stack direction="row" spacing={1} alignItems="center">
            {intPreviewResultID ? (
              <Tooltip title="Tax Information" arrow>
                <IconButton
                  size="small"
                  onClick={() =>
                    window.open(
                      `/reports/payslips/${intPreviewResultID}/tax-information?backRoute=${encodeURIComponent(strPathname)}`,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                  sx={{
                    color: "#fff",
                    backgroundColor: "#1d4ed8",
                    border: "1px solid #1d4ed8",
                    width: 38,
                    height: 38,
                    padding: 0,
                    boxShadow: "0 2px 6px rgba(29, 78, 216, 0.35)",
                    "&:hover": { backgroundColor: "#1e40af" },
                  }}
                  controlId="payroll.run-detail.payslip-preview.tax-information.button"
                >
                  <InfoOutlinedIcon sx={{ fontSize: 22 }} />
                </IconButton>
              </Tooltip>
            ) : null}
            <IconButton onClick={() => setBlnPayslipDialogOpen(false)} controlId="payroll.run-detail.payslip-preview.close.icon-button">
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {strPayslipPreviewHtml ? (
            <PayslipHtmlPreview
              strHtml={strPayslipPreviewHtml}
              strTaxInformationUrl={
                intPreviewResultID
                  ? `/reports/payslips/${intPreviewResultID}/tax-information?backRoute=${encodeURIComponent(strPathname)}`
                  : undefined
              }
            />
          ) : null}
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
      <Dialog
        open={blnReopenDialogOpen}
        onClose={() => !blnSaving && setBlnReopenDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        controlId="payroll.run-detail.reopen.dialog"
      >
        <DialogTitle>{t("reopen_reason", "Reason for reopening this payroll run")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            value={strReopenReason}
            onChange={(objEvent) => setStrReopenReason(objEvent.target.value)}
            placeholder={t("reopen_reason_placeholder", "Enter the business reason for reopening this finalized payroll run")}
            sx={{ mt: 1 }}
            controlId="payroll.run-detail.reopen.reason.textarea"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            className={styles.secondaryButton}
            onClick={() => setBlnReopenDialogOpen(false)}
            disabled={blnSaving}
            controlId="payroll.run-detail.reopen.cancel.button"
          >
            {tCommon("cancel", "Cancel")}
          </Button>
          <Button
            className={styles.primaryButton}
            startIcon={<RestartAltRoundedIcon />}
            onClick={reopenRun}
            disabled={blnSaving || !strReopenReason.trim()}
            controlId="payroll.run-detail.reopen.submit.button"
          >
            {t("reopen_run", "Reopen Payroll")}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={blnCancelDialogOpen}
        onClose={() => !blnSaving && setBlnCancelDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        controlId="payroll.run-detail.cancel.dialog"
      >
        <DialogTitle>{t("cancel_run_confirm_title", "Cancel this payroll run?")}</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#5B6B82" }}>
            {t("cancel_run_confirm_message", "This payroll run has not been validated or processed yet. Cancelling it cannot be undone.")}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            className={styles.secondaryButton}
            onClick={() => setBlnCancelDialogOpen(false)}
            disabled={blnSaving}
            controlId="payroll.run-detail.cancel-confirm.dismiss.button"
          >
            {tCommon("no", "No")}
          </Button>
          <Button
            className={styles.primaryButton}
            startIcon={<CloseRoundedIcon />}
            onClick={cancelRun}
            disabled={blnSaving}
            sx={{ background: "#dc2626", "&:hover": { background: "#b91c1c" } }}
            controlId="payroll.run-detail.cancel-confirm.submit.button"
          >
            {t("cancel_run_confirm_submit", "Yes, Cancel Run")}
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
