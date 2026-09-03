"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
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
import { type InputHTMLAttributes, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import PayrollRunDetailDashboardPage from "@/features/payroll/components/PayrollRunDetailDashboardPage";
import PayslipHtmlPreview from "@/features/payroll/components/PayslipHtmlPreview";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { payrollRunService } from "@/features/payroll/services/payrollRunService";
import { payslipService } from "@/features/payroll/services/payslipService";
import type {
  PayslipRunListRecord,
  PayrollRunDetailRecord,
  PayrollProcessSummary,
  PayrollRunStatus,
  PayrollValidationSummary,
} from "@/features/payroll/types";
import {
  buildPayslipFileName,
  downloadPayslipHtml,
  printPayslipHtml,
} from "@/features/payroll/utils/payslipDocument";

type PayrollRunDetailPageProps = {
  /** record_uuid of the run; every payroll service addresses a run by it. */
  strRunID: string;
};

const lstPayrollRunModuleCodes = ["PAYROLL_RUN", "PAYROLL_RUNS", "PAYROLL_PROCESS", "PAYROLL_PROCESSES"];
const lstEditableRunStatuses: PayrollRunStatus[] = ["DRAFT", "VALIDATED"];

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
    DRAFT: { background: "#2563eb", color: "#fff" },
    VALIDATED: { background: "#16a34a", color: "#fff" },
    PROCESSED: { background: "#0f766e", color: "#fff" },
    FINALIZED: { background: "#475569", color: "#fff" },
    CANCELLED: { background: "#dc2626", color: "#fff" },
  };
  return dicToneByStatus[strStatus] ?? { background: "#2563eb", color: "#fff" };
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

function getWorkflowSteps(strRunStatus: string, blnHasPayslips: boolean) {
  const strCurrentStep =
    strRunStatus === "FINALIZED"
      ? "Close"
      : strRunStatus === "PROCESSED"
        ? blnHasPayslips ? "Generate Payslips" : "Process"
        : strRunStatus === "VALIDATED"
          ? "Validate"
          : "Draft";
  return ["Draft", "Validate", "Process", "Generate Payslips", "Close"].map((strStep) => ({
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
  blnCanGeneratePayslip: boolean,
  blnCanClose: boolean,
) {
  if (blnSaving) {
    return false;
  }
  switch (strStep) {
    case "Draft":
      return false;
    case "Validate":
      return blnCanValidate && objRun.strRunStatus === "DRAFT";
    case "Process":
      return canProcessPayrollRun(objRun, blnCanProcess);
    case "Generate Payslips":
      return (
        blnCanGeneratePayslip &&
        !blnPayslipLoading &&
        ["PROCESSED", "FINALIZED"].includes(objRun.strRunStatus)
      );
    case "Close":
      return (
        blnCanClose &&
        objRun.strRunStatus === "PROCESSED" &&
        objRun.dicSummary.intValidationErrorCount <= 0
      );
    default:
      return false;
  }
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
        p: 1.5,
      }}
    >
      <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
        {strLabel}
      </Typography>
      <Typography sx={{ color: "#0f172a", fontWeight: 700 }}>
        {strValue}
      </Typography>
    </Box>
  );
}

function DetailValue({
  strLabel,
  strValue,
}: {
  strLabel: string;
  strValue: string | number;
}) {
  return (
    <Box>
      <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{strLabel}</Typography>
      <Typography sx={{ color: "#0f172a", fontWeight: 700 }}>{strValue}</Typography>
    </Box>
  );
}

function PayrollRunDetailPageLegacy({
  strRunID,
}: PayrollRunDetailPageProps) {
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
  const [strSavedRunStatus, setStrSavedRunStatus] = useState<PayrollRunStatus>("DRAFT");
  const [objValidationSummary, setObjValidationSummary] =
    useState<PayrollValidationSummary | null>(null);
  const [objProcessSummary, setObjProcessSummary] =
    useState<PayrollProcessSummary | null>(null);
  const [lstPayslips, setLstPayslips] = useState<PayslipRunListRecord[]>([]);
  const [strPayslipPreviewHtml, setStrPayslipPreviewHtml] = useState("");
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

    if (blnShowLoader) {
      setBlnLoading(true);
    }
    setStrError("");
    try {
      const dicRun = await payrollRunService.getPayrollRunById(strRunID);
      setObjRun(dicRun);
      setBlnIsLocked(dicRun.blnIsLocked);
      setStrSavedRunStatus(dicRun.strRunStatus);
      if (["PROCESSED", "FINALIZED"].includes(dicRun.strRunStatus)) {
        setLstPayslips(await payslipService.getRunPayslips(strRunID));
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
    if (blnRightsLoading) {
      return;
    }

    loadRun().catch(() => undefined);
  }, [strRunID, blnRightsLoading, blnCanView]);

  async function saveLockState() {
    if (!blnCanEdit || !objRun) {
      return;
    }
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const strRunStatusForSave: PayrollRunStatus =
        objRun.strRunStatus === strSavedRunStatus &&
        !blnIsLocked &&
        objRun.strRunStatus === "PROCESSED"
          ? "DRAFT"
          : objRun.strRunStatus;
      const dicRun = await payrollRunService.updatePayrollRunStatus(
        strRunID,
        strRunStatusForSave,
        blnIsLocked,
        objRun.strScopeType,
        objRun.intScopedEmployeeID ?? ""
      );
      setObjRun(dicRun);
      setBlnIsLocked(dicRun.blnIsLocked);
      setStrSavedRunStatus(dicRun.strRunStatus);
      setStrSuccess(t("status_update_success", "Payroll run updated successfully."));
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
    if (!blnCanValidate) {
      return;
    }

    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    setObjProcessSummary(null);
    try {
      const dicSummary = await payrollRunService.validatePayrollRun(strRunID);
      setObjValidationSummary(dicSummary);
      await loadRun(false);
      setStrSuccess(
        dicSummary.strStatus === "Passed"
          ? t(
              "validation_complete_approved",
              "Payroll validation completed. Run status updated to Approved."
            )
          : t("validation_complete", "Payroll validation completed.")
      );
    } catch (objError) {
      setStrError(
        objError instanceof Error ? objError.message : "Unable to validate payroll run."
      );
    } finally {
      setBlnSaving(false);
    }
  }

  async function processRun() {
    if (!blnCanProcess) {
      return;
    }

    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicSummary = await payrollRunService.processPayrollRun(strRunID);
      setObjProcessSummary(dicSummary);
      setObjValidationSummary(dicSummary.dicValidationSummary ?? null);
      if (dicSummary.strStatus === "ValidationFailed") {
        const intBlockingCount = dicSummary.dicValidationSummary?.intBlockingErrorCount ?? 0;
        setStrError(
          t(
            "process_validation_failed",
            `Payroll processing blocked by ${intBlockingCount} validation error(s). Resolve the validation messages below and process again.`
          )
        );
      } else if (dicSummary.strStatus === "Failed") {
        setStrError(
          t(
            "process_failed",
            "Payroll processing failed. Review the processing summary below and process again after fixing the issue."
          )
        );
      } else {
        setStrSuccess(t("process_complete", "Payroll processing completed."));
      }
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
    if (!blnCanReprocess) {
      return;
    }

    const strReason = window.prompt(t("reprocess_reason", "Reason for reprocess"));
    if (!strReason?.trim()) {
      return;
    }
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicSummary = await payrollRunService.reprocessPayrollRun(
        strRunID,
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
    if (!blnCanClose) {
      return;
    }

    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicRun = await payrollRunService.closePayrollRun(strRunID);
      setObjRun(dicRun);
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
    if (!objRun || !["PROCESSED", "FINALIZED"].includes(objRun.strRunStatus)) {
      setLstPayslips([]);
      return;
    }
    setLstPayslips(await payslipService.getRunPayslips(strRunID));
  }

  async function generateAllPayslips() {
    if (!blnCanGeneratePayslip) {
      return;
    }

    setBlnPayslipLoading(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicSummary = await payslipService.generateAll(strRunID);
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
    if (!blnCanGeneratePayslip) {
      return null;
    }

    setBlnPayslipLoading(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicPayslip = await payslipService.generatePayslip(
        strRunID,
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
      let intPayslipID = dicRow.intPayslipID;
      if (!intPayslipID) {
        const dicPayslip = await generatePayslip(dicRow);
        intPayslipID = dicPayslip?.intPayslipID ?? null;
      }
      if (!intPayslipID) {
        setStrError(t("payslip_not_generated", "Payslip could not be generated for this employee."));
        return;
      }
      setStrPayslipPreviewHtml(await payslipService.getDownloadHtml(String(intPayslipID)));
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
    if (!blnCanExport) {
      return;
    }

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
      const strHtml = await payslipService.getDownloadHtml(String(intPayslipID));
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

  const objSectionCardSx = {
    background: "#ffffff",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: "var(--app-card-radius)",
    boxShadow: "none",
    p: "10px",
  };

  const objSectionTitleSx = {
    color: "#0f172a",
    fontWeight: 800,
    mb: 1.5,
  };
  const lstDisplayedRunStatuses = lstEditableRunStatuses.includes(objRun.strRunStatus)
    ? lstEditableRunStatuses
    : [objRun.strRunStatus, ...lstEditableRunStatuses];
  const blnRunControlsEditable = blnCanEdit && lstEditableRunStatuses.includes(objRun.strRunStatus);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        height: "100%",
        minHeight: 0,
        overflowX: "hidden",
        overflowY: "auto",
        pb: 2,
        pr: 0.5,
      }}
    >
      <Box className={styles.topBar}>
        <Button
          className={styles.secondaryButton}
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => objRouter.push("/payroll/runs")}
          controlId="payroll.run-detail.back.button"
        >
          {t("back_to_list", "Back to List")}
        </Button>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { xs: "stretch", sm: "center" }, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
            {getWorkflowSteps(objRun.strRunStatus, lstPayslips.length > 0).map((dicStep, intIndex) => {
              const blnEnabled = isWorkflowStepEnabled(
                dicStep.strStep,
                objRun,
                blnSaving,
                blnPayslipLoading,
                blnCanValidate,
                blnCanProcess,
                blnCanGeneratePayslip,
                blnCanClose
              );
              const fnOnClick =
                dicStep.strStep === "Validate"
                  ? validateRun
                  : dicStep.strStep === "Process"
                    ? processRun
                    : dicStep.strStep === "Generate Payslips"
                      ? generateAllPayslips
                      : dicStep.strStep === "Close"
                        ? closeRun
                        : undefined;
              return (
                <Box key={dicStep.strStep} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Button
                    className={!dicStep.blnActive ? styles.secondaryButton : undefined}
                    onClick={fnOnClick}
                    disabled={dicStep.strStep !== "Draft" && !blnEnabled}
                    controlId={`payroll.run-detail.workflow.${dicStep.strStep.toLowerCase().replace(/\s+/g, "-")}.button`}
                    sx={{
                      minWidth: { xs: 96, sm: 104 },
                      height: 34,
                      minHeight: 34,
                      px: "10px",
                      borderRadius: "9px",
                      textTransform: "none",
                      fontWeight: 700,
                      fontSize: "0.84rem",
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                      boxShadow: dicStep.blnActive ? "0 12px 24px rgba(15, 118, 110, 0.18)" : "none",
                      background: dicStep.blnActive ? "#0f8b84" : dicStep.strStep === "Draft" ? "#dbe3f0" : undefined,
                      color: dicStep.blnActive ? "#fff" : dicStep.strStep === "Draft" ? "#255ea8" : undefined,
                      border: dicStep.blnActive ? "1px solid #0f8b84" : dicStep.strStep === "Draft" ? "1px solid #9ec0ea" : undefined,
                      "&:hover": {
                        background: dicStep.blnActive ? "#0f8b84" : dicStep.strStep === "Draft" ? "#dbe3f0" : undefined,
                        boxShadow: dicStep.blnActive ? "0 12px 24px rgba(15, 118, 110, 0.18)" : "none",
                      },
                      "&.Mui-disabled": {
                        background: dicStep.blnActive ? "#0f8b84" : dicStep.strStep === "Draft" ? "#dbe3f0" : "#ffffff",
                        color: dicStep.blnActive ? "#fff" : "#255ea8",
                        border: dicStep.blnActive ? "1px solid #0f8b84" : "1px solid var(--app-secondary-border)",
                        opacity: 1,
                      },
                    }}
                  >
                    {dicStep.strStep}
                  </Button>
                  {intIndex < 4 ? (
                    <Typography sx={{ color: "#8aa3c2", fontWeight: 700, fontSize: "0.95rem", lineHeight: 1 }}>{"\u2192"}</Typography>
                  ) : null}
                </Box>
              );
            })}
          </Box>
          {blnCanReprocess ? <Button
            className={styles.secondaryButton}
            startIcon={<RestartAltRoundedIcon />}
            onClick={reprocessRun}
            disabled={blnSaving || objRun.strRunStatus !== "PROCESSED"}
            controlId="payroll.run-detail.reprocess.button"
          >
            {t("reprocess", "Reprocess")}
          </Button> : null}
          <Button
            className={styles.secondaryButton}
            startIcon={<ReceiptLongRoundedIcon />}
            onClick={() => objRouter.push("/payroll/results")}
            controlId="payroll.run-detail.results.button"
          >
            {t("view_results", "Results")}
          </Button>
        </Stack>
      </Box>

      <Box
        className={styles.controlsCard}
        sx={{
          border: "1px solid rgba(148,163,184,0.18)",
          borderRadius: "var(--app-card-radius)",
          boxShadow: "none",
          p: "10px",
        }}
      >
        <Box className={styles.controlsHeader}>
          <Typography sx={{ fontSize: "1.7rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
            {objRun.strRunName}
          </Typography>
          <span className={styles.statusPill} style={getStatusPillSx(objRun.strRunStatus)}>
            {getPayrollRunStatusLabel(objRun.strRunStatus)}
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
          <SummaryCard
            strLabel={t("run_scope", "Process For")}
            strValue={
              objRun.strScopeType === "SelectedEmployee"
                ? `${t("scope_selected_employee", "Selected Employees")} #${objRun.intScopedEmployeeID ?? "-"}`
                : t("scope_payroll_group", "Payroll Group")
            }
          />
          <SummaryCard strLabel={t("employees", "Employees")} strValue={String(objRun.intEmployeeCount || objRun.dicSummary.intInputCount)} />
          <SummaryCard strLabel={t("employees_processed", "Employees Processed")} strValue={String(objRun.intProcessedEmployeeCount || objRun.dicSummary.intProcessedCount)} />
          <SummaryCard strLabel={t("validation_errors", "Validation Errors")} strValue={String(objRun.dicSummary.intValidationErrorCount)} />
          <SummaryCard strLabel={t("warnings", "Warnings")} strValue={String(objRun.dicSummary.intValidationWarningCount)} />
          <SummaryCard strLabel={t("gross_pay", "Gross Pay")} strValue={formatCurrency(objRun.decGrossPayTotal)} />
          <SummaryCard strLabel={t("deduction_total", "Deductions")} strValue={formatCurrency(objRun.decDeductionTotal)} />
          <SummaryCard strLabel={t("tax_total", "Tax")} strValue={formatCurrency(objRun.decTaxTotal)} />
          <SummaryCard strLabel={t("net_total", "Net Pay")} strValue={formatCurrency(objRun.decNetPayTotal)} />
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: "0 0 auto",
          gap: 1.5,
          minHeight: 0,
          overflow: "visible",
        }}
      >
        {strRightsError ? <Alert severity="warning">{strRightsError}</Alert> : null}
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
          <Box sx={objSectionCardSx}>
            <Typography sx={objSectionTitleSx}>
              {t("summary_title", "Run Summary")}
            </Typography>
            <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
              <DetailValue strLabel={t("employees_processed", "Employees Processed")} strValue={objRun.intProcessedEmployeeCount || objRun.dicSummary.intProcessedCount} />
              <DetailValue strLabel={t("validation_errors", "Validation Errors")} strValue={objRun.dicSummary.intValidationErrorCount} />
              <DetailValue strLabel={t("warnings", "Warnings")} strValue={objRun.dicSummary.intValidationWarningCount} />
              <DetailValue strLabel={t("employees", "Employees")} strValue={objRun.intEmployeeCount || objRun.dicSummary.intInputCount} />
              <DetailValue strLabel={t("total_lwp", "Total LWP Days")} strValue={objRun.dicSummary.decTotalLwpDays} />
              <DetailValue strLabel={t("total_lop", "Total LOP Days")} strValue={objRun.dicSummary.decTotalLopDays} />
            </Box>
          </Box>

          <Box sx={objSectionCardSx}>
            <Typography sx={objSectionTitleSx}>
              {t("status_title", "Payroll Controls")}
            </Typography>
            <Stack spacing={1.5}>
              <DetailValue strLabel={t("status", "Status")} strValue={getPayrollRunStatusLabel(objRun.strRunStatus)} />
              <TextField
                select
                label={t("status", "Status")}
                value={objRun.strRunStatus}
                onChange={(objEvent) =>
                  setObjRun((dicPrevious) =>
                    dicPrevious
                      ? {
                          ...dicPrevious,
                          strRunStatus: objEvent.target.value as PayrollRunStatus,
                        }
                      : dicPrevious
                  )
                }
                disabled={!blnRunControlsEditable || blnSaving}
                controlId="payroll.run-detail.status.select"
                fullWidth
              >
                {lstDisplayedRunStatuses.map((strStatus) => (
                  <MenuItem key={strStatus} value={strStatus} disabled={!lstEditableRunStatuses.includes(strStatus)}>
                    {getPayrollRunStatusLabel(strStatus)}
                  </MenuItem>
                ))}
              </TextField>
              <DetailValue
                strLabel={t("run_scope", "Process For")}
                strValue={
                  objRun.strScopeType === "SelectedEmployee"
                    ? `${t("scope_selected_employee", "Selected Employees")} #${objRun.intScopedEmployeeID ?? "-"}`
                    : t("scope_payroll_group", "Payroll Group")
                }
              />
              <Box className={styles.switchRow}>
                <Typography>{t("locked", "Lock Payroll Run")}</Typography>
                <Switch
                  checked={blnIsLocked}
                  onChange={(_, blnChecked) => setBlnIsLocked(blnChecked)}
                  disabled={!blnRunControlsEditable}
                  inputProps={{ "controlId": "payroll.run-detail.locked.switch" } as InputHTMLAttributes<HTMLInputElement>}
                />
              </Box>
              {blnCanEdit ? <Button
                className={styles.primaryButton}
                onClick={saveLockState}
                disabled={blnSaving || !blnRunControlsEditable}
                sx={{ alignSelf: "flex-end" }}
                controlId="payroll.run-detail.save-status.button"
              >
                {blnSaving ? tCommon("processing", "Processing...") : tCommon("save", "Save")}
              </Button> : null}
            </Stack>
          </Box>
        </Box>

        <Box sx={objSectionCardSx}>
          <Typography sx={objSectionTitleSx}>
            {t("meta_title", "Run Timeline")}
          </Typography>
          <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" } }}>
            <DetailValue strLabel={t("created_on", "Created On")} strValue={formatDateTime(objRun.dtAddedOn)} />
            <DetailValue strLabel={t("modified_on", "Last Modified On")} strValue={formatDateTime(objRun.dtLastModifiedOn)} />
            <DetailValue strLabel={t("last_executed_on", "Last Executed On")} strValue={formatDateTime(objRun.dtLastExecutedOn)} />
            <DetailValue strLabel={t("closed_on", "Closed On")} strValue={formatDateTime(objRun.dtClosedOn)} />
          </Box>
        </Box>

        {(objValidationSummary || objRun.lstValidationResults.length > 0) ? (
          <Box sx={objSectionCardSx}>
            <Typography sx={objSectionTitleSx}>
              {t("validation_panel", "Validation")}
            </Typography>
            <Box className={styles.tableWrap} sx={{ maxHeight: "none", overflowY: "visible" }}>
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
          <Box sx={objSectionCardSx}>
            <Typography sx={objSectionTitleSx}>
              {t("process_summary", "Processing Summary")}
            </Typography>
            <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" } }}>
              <DetailValue strLabel={t("status", "Status")} strValue={objProcessSummary.strStatus} />
              <DetailValue strLabel={t("processed", "Processed")} strValue={objProcessSummary.intProcessedEmployeeCount} />
              <DetailValue strLabel={t("failed", "Failed")} strValue={objProcessSummary.intFailedEmployeeCount} />
              <DetailValue strLabel={t("net_total", "Net Pay")} strValue={formatCurrency(objProcessSummary.decNetPayTotal || 0)} />
            </Box>
            {objProcessSummary.lstExceptions.length ? (
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                {objProcessSummary.lstExceptions.map((dicException) => dicException.strMessage).join(" | ")}
              </Alert>
            ) : null}
          </Box>
        ) : null}

        {["PROCESSED", "FINALIZED"].includes(objRun.strRunStatus) ? (
          <Box sx={objSectionCardSx}>
            <Box className={styles.controlsHeader} sx={{ mb: 1.5 }}>
              <Typography sx={{ color: "#0f172a", fontWeight: 800 }}>
                {t("payslip_panel", "Payslips")}
              </Typography>
              {blnCanGeneratePayslip ? <Button
                className={styles.secondaryButton}
                startIcon={<ReceiptLongRoundedIcon />}
                onClick={generateAllPayslips}
                disabled={blnPayslipLoading}
                controlId="payroll.run-detail.payslips.generate-all.button"
              >
                {t("generate_all", "Generate All Payslips")}
              </Button> : null}
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
                              controlId="payroll.run-detail.payslip.view.button"
                              data-row-key={dicRow.intEmployeeID}
                            >
                              {t("view", "View")}
                            </Button>
                            {blnCanGeneratePayslip ? <Button
                              className={styles.secondaryButton}
                              onClick={() => generatePayslip(dicRow)}
                              disabled={blnPayslipLoading}
                              controlId="payroll.run-detail.payslip.generate.button"
                              data-row-key={dicRow.intEmployeeID}
                            >
                              {t("generate", "Generate")}
                            </Button> : null}
                            {blnCanExport ? <Button
                              className={styles.secondaryButton}
                              startIcon={<DownloadRoundedIcon />}
                              onClick={() => openPayslipDocument(dicRow, false)}
                              disabled={blnPayslipLoading}
                              controlId="payroll.run-detail.payslip.download.button"
                              data-row-key={dicRow.intEmployeeID}
                            >
                              {t("download", "Download")}
                            </Button> : null}
                            {blnCanExport ? <Button
                              className={styles.secondaryButton}
                              startIcon={<PrintRoundedIcon />}
                              onClick={() => openPayslipDocument(dicRow, true)}
                              disabled={blnPayslipLoading}
                              controlId="payroll.run-detail.payslip.print.button"
                              data-row-key={dicRow.intEmployeeID}
                            >
                              {t("print", "Print")}
                            </Button> : null}
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
        controlId="payroll.run-detail.payslip-preview.dialog"
      >
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
    </Box>
  );
}

export default PayrollRunDetailDashboardPage;
