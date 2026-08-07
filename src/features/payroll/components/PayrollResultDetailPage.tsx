"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import NoteAltOutlinedIcon from "@mui/icons-material/NoteAltOutlined";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import PercentRoundedIcon from "@mui/icons-material/PercentRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import RequestQuoteRoundedIcon from "@mui/icons-material/RequestQuoteRounded";
import SummarizeOutlinedIcon from "@mui/icons-material/SummarizeOutlined";
import WalletRoundedIcon from "@mui/icons-material/WalletRounded";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Tooltip,
  Switch,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState, type InputHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import PayslipHtmlPreview from "@/features/payroll/components/PayslipHtmlPreview";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { payrollResultService } from "@/features/payroll/services/payrollResultService";
import { payslipService } from "@/features/payroll/services/payslipService";
import { attendancePayrollService } from "@/features/payroll/services/attendancePayrollService";
import type {
  ArrearAdjustmentLine,
  EmployeeAttendancePreview,
  PayrollResultDetailRecord,
  PayslipPreviewRecord,
  WageRulePreviewRecord,
} from "@/features/payroll/types";
import {
  buildPayslipFileName,
  downloadPayslipHtml,
  printPayslipHtml,
} from "@/features/payroll/utils/payslipDocument";

// Mirrors tplPayrollAttendanceIntegrationModuleCodes in HRMS_Backend/app/api/v1/PayrollRoutes.py
const lstAttendanceIntegrationModuleCodes = [
  "PAYROLL_ATTENDANCE_INTEGRATION",
  "PAYROLL_ATTENDANCE",
  "ATTENDANCE_PAYROLL_INTEGRATION",
  "PAYROLL_RUN",
  "PAYROLL_RUNS",
  "PAYROLL_PAYROLL_RUN",
];

// Keep these aliases aligned with tplPayrollResultFallbackModuleCodes in
// HRMS_Backend/app/api/v1/PayrollRoutes.py so detail-page access follows list/API access.
const lstPayrollResultAccessModuleHints = [
  "EMPLOYEE_PAYROLL_RESULT",
  "EMPLOYEE_PAYROLL_RESULTS",
  "PAYROLL_RESULT",
  "PAYROLL_RESULTS",
  "PAYROLL_PAYROLL_RESULT",
  "PAYROLL_PAYSLIP",
  "PAYROLL_PAYSLIPS",
  "REPORT_PAYROLL_RESULT",
  "REPORT_PAYROLL_RESULTS",
  "PAYSLIP",
  "PAYSLIPS",
  "MY_PAYSLIP",
  "MY_PAYSLIPS",
  "PAYROLL_RUN",
  "PAYROLL_RUNS",
  "PAYROLL_PAYROLL_RUN",
  "REPORTS",
  "PAYROLL_REGISTER",
  "REPORT_PAYROLL_REGISTER",
  "BANK_FILE",
  "REPORT_BANK_FILE",
  "STATUTORY_REPORT",
  "REPORT_STATUTORY",
  "PAYROLL",
  "PAYROLLS",
];

type PayrollResultDetailPageProps = {
  intResultID: number;
  blnPayslipScreen?: boolean;
  strBackRoute?: string;
};

type SummaryDisplayItem = {
  key: string;
  label: string;
  value: ReactNode;
  tooltip?: string;
  tone?: "default" | "note" | "info";
};

function formatMonth(strDate: string | null) {
  if (!strDate) {
    return "-";
  }
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

function formatPercent(decValue: number | null | undefined) {
  if (decValue === null || decValue === undefined) {
    return "-";
  }
  return `${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(decValue)}%`;
}

function getStatusTone(strStatus: string) {
  const dicToneByStatus: Record<string, { background: string; color: string }> = {
    Calculated: { background: "#4f46e5", color: "#fff" },
    Approved: { background: "#16a34a", color: "#fff" },
    Published: { background: "#7c3aed", color: "#fff" },
    Paid: { background: "#0f766e", color: "#fff" },
  };
  return dicToneByStatus[strStatus] ?? { background: "#475569", color: "#fff" };
}

function getInitials(strName: string) {
  const lstParts = strName.trim().split(/\s+/).filter(Boolean);
  if (lstParts.length === 0) {
    return "PR";
  }
  return lstParts.slice(0, 2).map((strPart) => strPart[0]?.toUpperCase() ?? "").join("");
}

function getCategoryChipSx(strCategory: string | null | undefined) {
  const strNormalized = String(strCategory ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (strNormalized === "earning") {
    return { background: "#dcfce7", color: "#15803d" };
  }
  if (strNormalized === "reimbursement") {
    return { background: "#dbeafe", color: "#1d4ed8" };
  }
  if (strNormalized === "deduction") {
    return { background: "#ffedd5", color: "#c2410c" };
  }
  return { background: "#e2e8f0", color: "#334155" };
}

function hasDisplayAmount(decAmount: number | null | undefined) {
  return Number(decAmount ?? 0) > 0;
}

function formatOptionalCurrency(decValue: number | null | undefined) {
  return decValue === null || decValue === undefined ? "-" : formatCurrency(decValue);
}

function getCalculationTraceValue(
  objTrace: Record<string, unknown> | null | undefined,
  ...lstKeys: string[]
) {
  if (!objTrace) {
    return null;
  }
  for (const strKey of lstKeys) {
    const objValue = objTrace[strKey];
    if (objValue !== null && objValue !== undefined && objValue !== "") {
      return objValue;
    }
  }
  return null;
}

function asRecord(objValue: unknown): Record<string, unknown> | null {
  if (!objValue || typeof objValue !== "object" || Array.isArray(objValue)) {
    return null;
  }
  return objValue as Record<string, unknown>;
}

function getNumberValue(objRecord: Record<string, unknown>, strKey: string) {
  const objValue = objRecord[strKey];
  if (typeof objValue === "number") {
    return objValue;
  }
  if (typeof objValue === "string" && objValue.trim() !== "") {
    const fltValue = Number(objValue);
    return Number.isFinite(fltValue) ? fltValue : null;
  }
  return null;
}

function getStringValue(objRecord: Record<string, unknown>, strKey: string) {
  const objValue = objRecord[strKey];
  return typeof objValue === "string" && objValue.trim() !== "" ? objValue : null;
}

function getWageRulePreview(dicResult: PayrollResultDetailRecord): WageRulePreviewRecord {
  const objDirectPreview = asRecord(dicResult.dicWageRulePreview);
  const objTracePreview = asRecord(asRecord(dicResult.objCalculationTrace)?.wage_rule);
  const objSnapshotPreview = asRecord(asRecord(dicResult.objCalculationSnapshot)?.wage_rule);
  const objPreview: Record<string, unknown> = objDirectPreview ?? objTracePreview ?? objSnapshotPreview ?? {};
  return {
    wage_total: getNumberValue(objPreview, "wage_total") ?? dicResult.decActualWagesAmount,
    non_wage_total: getNumberValue(objPreview, "non_wage_total") ?? dicResult.decActualNonWagesAmount,
    wage_percent_of_ctc: getNumberValue(objPreview, "wage_percent_of_ctc"),
    minimum_required_wage: getNumberValue(objPreview, "minimum_required_wage"),
    deemed_wage_shortfall: getNumberValue(objPreview, "deemed_wage_shortfall") ?? dicResult.decDeemedWagesAmount,
    deemed_wage_base: getNumberValue(objPreview, "deemed_wage_base") ?? dicResult.decComplianceWageBaseAmount,
    calculation_basis: getStringValue(objPreview, "calculation_basis"),
    threshold_percent: getNumberValue(objPreview, "threshold_percent"),
    total_remuneration_base: getNumberValue(objPreview, "total_remuneration_base") ?? dicResult.decRemunerationAmount,
    total_remuneration_base_annual: getNumberValue(objPreview, "total_remuneration_base_annual"),
    ctc_annual: getNumberValue(objPreview, "ctc_annual"),
    gross_annual: getNumberValue(objPreview, "gross_annual"),
  };
}

function formatBasisLabel(strValue: string | null | undefined) {
  if (!strValue) {
    return "-";
  }
  return strValue
    .split("_")
    .filter(Boolean)
    .map((strPart) => strPart.charAt(0).toUpperCase() + strPart.slice(1))
    .join(" ");
}

function toLabelKey(strValue: string | null | undefined) {
  return String(strValue ?? "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function translateDynamicLabel(
  t: (strKey: string, strFallback?: string) => string,
  strValue: string | null | undefined,
  strPrefix = "",
  strFallback?: string
) {
  const strKey = toLabelKey(strValue);
  if (!strKey) {
    return "-";
  }
  return t(strPrefix ? `${strPrefix}_${strKey}` : strKey, strFallback ?? formatBasisLabel(strValue));
}

function formatLabelTemplate(strTemplate: string, dicValues: Record<string, string | number>) {
  return Object.entries(dicValues).reduce(
    (strOutput, [strKey, objValue]) => strOutput.replaceAll(`{${strKey}}`, String(objValue)),
    strTemplate
  );
}

function getLineMonthlyAmount(dicLine: PayrollResultDetailRecord["lstLines"][number]) {
  const objTrace = dicLine.objCalculationTrace;
  const objMonthlyValue = getCalculationTraceValue(
    objTrace,
    "approved_monthly_amount",
    "monthly_amount"
  );
  if (typeof objMonthlyValue === "number") {
    return objMonthlyValue;
  }
  return dicLine.decProratedAmount ?? dicLine.decCalculatedAmount ?? dicLine.decAmount;
}

function getPayrollImpactLabel(dicLine: PayrollResultDetailRecord["lstLines"][number]) {
  if (dicLine.blnIsEmployerContribution) {
    return "Employer Only";
  }
  if (dicLine.blnIsTaxLine) {
    return "Tax";
  }
  if (dicLine.blnIsEmployeeDeduction) {
    return "Net Pay Reduction";
  }
  if (String(dicLine.strPayslipSection || "").trim().toUpperCase() === "REIMBURSEMENTS") {
    return "Reimbursement";
  }
  if (dicLine.blnIncludeInGross) {
    return "Gross Earning";
  }
  return "Informational";
}

function getLineLwpSummary(dicLine: PayrollResultDetailRecord["lstLines"][number]) {
  const objTrace = asRecord(asRecord(dicLine.objCalculationTrace)?.lwp);
  if (!objTrace) {
    return null;
  }
  const strTreatment = getStringValue(objTrace, "lwp_treatment_code");
  if (!strTreatment || strTreatment === "NONE") {
    return null;
  }
  return {
    strTreatment,
    decReducedAmount: getNumberValue(objTrace, "reduced_amount") ?? 0,
    strOutcome: getCalculationTraceValue(objTrace, "reduced_handling_code", "handling", "reduced_handling_outcome") as string | null,
  };
}

function getTaxableLabel(dicLine: PayrollResultDetailRecord["lstLines"][number]) {
  const objTrace = dicLine.objCalculationTrace;
  const objTaxable = getCalculationTraceValue(objTrace, "taxable", "is_taxable");
  if (typeof objTaxable === "boolean") {
    return objTaxable ? "Yes" : "No";
  }
  if (dicLine.blnIsTaxLine || dicLine.blnIsResidualTaxable) {
    return "Yes";
  }
  return "-";
}

function getCtcIncludedLabel(dicLine: PayrollResultDetailRecord["lstLines"][number]) {
  if (dicLine.blnIsEmployerContribution) {
    return "Yes";
  }
  if (dicLine.blnIsEmployeeDeduction) {
    return "No";
  }
  return dicLine.blnIncludeInGross ? "Yes" : "-";
}

function getLineLwpTrace(dicLine: PayrollResultDetailRecord["lstLines"][number]) {
  const objDirectTrace = asRecord(dicLine.dicLwpTrace);
  if (objDirectTrace) {
    return objDirectTrace;
  }
  return asRecord(asRecord(dicLine.objCalculationTrace)?.lwp);
}

function formatTraceNumber(objValue: unknown) {
  if (typeof objValue === "number") {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 }).format(objValue);
  }
  if (typeof objValue === "string" && objValue.trim() !== "") {
    const fltValue = Number(objValue);
    return Number.isFinite(fltValue)
      ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 }).format(fltValue)
      : objValue;
  }
  return "-";
}

function getLwpExplanation(
  t: (strKey: string, strFallback?: string) => string,
  dicLine: PayrollResultDetailRecord["lstLines"][number]
) {
  const objTrace = getLineLwpTrace(dicLine);
  if (!objTrace) {
    return "-";
  }
  const strTreatment = String(objTrace.lwp_treatment_code ?? objTrace.treatment ?? "NONE");
  const strHandling = String(objTrace.reduced_handling_code ?? objTrace.handling ?? "NOT_APPLICABLE");
  if (strTreatment === "NONE") {
    return t("lwp_trace_none", "No LWP reduction");
  }
  return formatLabelTemplate(
    t(
      "lwp_trace_summary",
      "{treatment}: {paid}/{denominator}, factor {factor}, reduced {reduced}, handling {handling}, residual {residual}"
    ),
    {
      treatment: translateDynamicLabel(t, strTreatment),
      paid: formatTraceNumber(objTrace.paid_units),
      denominator: formatTraceNumber(objTrace.denominator_units ?? objTrace.denominator),
      factor: formatTraceNumber(objTrace.proration_factor ?? objTrace.factor),
      reduced: formatCurrency(Number(objTrace.reduced_amount ?? 0)),
      handling: translateDynamicLabel(t, strHandling),
      residual: formatCurrency(Number(objTrace.residual_transfer_amount ?? 0)),
    }
  );
}

function KpiCard({
  strLabel,
  strValue,
  objIcon,
  strIconBg,
  strIconColor,
  strBorder = "#dbe7f3",
  blnEmphasis = false,
}: {
  strLabel: string;
  strValue: string;
  objIcon: ReactNode;
  strIconBg: string;
  strIconColor: string;
  strBorder?: string;
  blnEmphasis?: boolean;
}) {
  return (
    <Paper
      sx={{
        borderRadius: "12px",
        border: `1px solid ${strBorder}`,
        background: "#fff",
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
        minHeight: 82,
        px: 2,
        py: 1.6,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ height: "100%" }}>
        <Box
          sx={{
            width: 46,
            height: 46,
            borderRadius: "12px",
            display: "grid",
            placeItems: "center",
            background: strIconBg,
            color: strIconColor,
            flexShrink: 0,
          }}
        >
          {objIcon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: "#344767", fontSize: "0.72rem", fontWeight: 900, textTransform: "uppercase", lineHeight: 1.25 }}>
            {strLabel}
          </Typography>
          <Typography sx={{ color: blnEmphasis ? strIconColor : "#0f172a", fontSize: "1.08rem", fontWeight: 900, mt: 0.55, lineHeight: 1.15 }}>
            {strValue}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function PaginatedSummaryCard({
  strTitle,
  objIcon,
  lstItems,
}: {
  strTitle: string;
  objIcon: ReactNode;
  lstItems: SummaryDisplayItem[];
  strAriaLabel: string;
}) {
  return (
    <Paper
      sx={{
        borderRadius: "10px",
        border: "1px solid #dbe7f3",
        boxShadow: "none",
        height: 270,
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: "45px 1fr",
        background: "#fff",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.8, borderBottom: "1px solid #e6eef7" }}>
        {objIcon}
        <Typography component="h3" sx={{ color: "#0f172a", fontSize: "0.84rem", fontWeight: 900, lineHeight: 1.2 }}>
          {strTitle}
        </Typography>
      </Box>
      <Box
        sx={{
          px: 1.8,
          overflowY: "auto",
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-thumb": { background: "#cbd8e8", borderRadius: "8px" },
        }}
      >
        {lstItems.map((dicItem, intIndex) => (
          <Box
            key={dicItem.key}
            sx={{
              minHeight: 44,
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(84px, auto)",
              alignItems: "center",
              gap: 1,
              borderBottom: intIndex === lstItems.length - 1 ? "none" : "1px solid #edf3f9",
            }}
          >
            {dicItem.tone === "note" || dicItem.tone === "info" ? (
              <Box
                sx={{
                  gridColumn: "1 / -1",
                  border: dicItem.tone === "info" ? "1px solid #bfdbfe" : "1px solid #fed7aa",
                  background: dicItem.tone === "info" ? "#eff6ff" : "#fff7ed",
                  color: dicItem.tone === "info" ? "#1e3a8a" : "#9a3412",
                  borderRadius: "8px",
                  px: 1.4,
                  py: 0.9,
                  my: 0.6,
                  fontSize: "0.78rem",
                  lineHeight: 1.35,
                }}
              >
                {dicItem.value}
              </Box>
            ) : (
              <>
                <Tooltip title={dicItem.tooltip ?? dicItem.label} arrow>
                  <Typography sx={{ color: "#3d5273", fontSize: "0.78rem", lineHeight: 1.25, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {dicItem.label}
                  </Typography>
                </Tooltip>
                <Tooltip title={dicItem.tooltip ?? ""} arrow disableHoverListener={!dicItem.tooltip}>
                  <Box sx={{ color: "#0f172a", fontSize: "0.78rem", fontWeight: 900, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", textAlign: "right", whiteSpace: "normal" }}>
                    {dicItem.value}
                  </Box>
                </Tooltip>
              </>
            )}
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

export default function PayrollResultDetailPage({
  intResultID,
  blnPayslipScreen = false,
  strBackRoute,
}: PayrollResultDetailPageProps) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("payslips");
  const { t: tAttendance } = useModuleLabels("payroll-attendance-integration");
  const { blnLoading: blnRightsLoading, canDoAny } = useModuleActionAccess(
    blnPayslipScreen
      ? ["REPORT_PAYROLL_RESULTS", "PAYSLIPS", "PAYSLIP", "PAYROLL_PAYSLIPS", "PAYROLL_PAYSLIP"]
      : lstPayrollResultAccessModuleHints
  );
  const { canDoAny: canDoAnyAttendance } = useModuleActionAccess(lstAttendanceIntegrationModuleCodes);
  const [objResult, setObjResult] = useState<PayrollResultDetailRecord | null>(null);
  const [objPayslip, setObjPayslip] = useState<PayslipPreviewRecord | null>(null);
  const [strPayslipPreviewHtml, setStrPayslipPreviewHtml] = useState("");
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnPayslipLoading, setBlnPayslipLoading] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const [objActionsAnchor, setObjActionsAnchor] = useState<null | HTMLElement>(null);

  // Attendance-to-payroll integration (Stage 2/3): Attendance + Arrears tabs. These are
  // additive tabs alongside the existing 5 static summary cards above - the existing cards
  // are intentionally left untouched (see task scope notes).
  const [strIntegrationTab, setStrIntegrationTab] = useState<"attendance" | "arrears">("attendance");
  const [objAttendancePreview, setObjAttendancePreview] = useState<EmployeeAttendancePreview | null>(null);
  const [blnAttendanceLoading, setBlnAttendanceLoading] = useState(false);
  const [strAttendanceError, setStrAttendanceError] = useState("");
  const [blnAttendanceLoaded, setBlnAttendanceLoaded] = useState(false);
  const [lstArrears, setLstArrears] = useState<ArrearAdjustmentLine[]>([]);
  const [blnArrearsLoading, setBlnArrearsLoading] = useState(false);
  const [strArrearsError, setStrArrearsError] = useState("");
  const [blnArrearsLoaded, setBlnArrearsLoaded] = useState(false);
  const [blnTraceDialogOpen, setBlnTraceDialogOpen] = useState(false);
  const [objTraceJson, setObjTraceJson] = useState<Record<string, unknown> | null>(null);
  const [blnTraceLoading, setBlnTraceLoading] = useState(false);
  const [strTraceError, setStrTraceError] = useState("");

  useEffect(() => {
    let blnMounted = true;

    async function loadResult() {
      setBlnLoading(true);
      setStrError("");
      try {
        const dicResult = await payrollResultService.getPayrollResultById(intResultID);
        if (!blnMounted) {
          return;
        }
        setObjResult(dicResult);
      } catch (objError) {
        if (!blnMounted) {
          return;
        }
        setStrError(
          objError instanceof Error
            ? objError.message
            : "Unable to load payroll result."
        );
      } finally {
        if (blnMounted) {
          setBlnLoading(false);
        }
      }
    }

    loadResult().catch(() => undefined);
    return () => {
      blnMounted = false;
    };
  }, [intResultID]);

  const strResolvedBackRoute = strBackRoute || (blnPayslipScreen ? "/reports/payslips" : "/payroll/results");
  const blnCanDownloadPayslips = canDoAny("download") || canDoAny("export");
  const blnCanPrintPayslips = canDoAny("print");
  const blnCanUsePayslipDocumentActions = blnCanDownloadPayslips || blnCanPrintPayslips;
  const blnCanViewAttendanceIntegration = !blnPayslipScreen && (canDoAnyAttendance("view") || canDoAnyAttendance("list"));
  const blnCanTraceAttendance = !blnPayslipScreen && canDoAnyAttendance("trace");

  useEffect(() => {
    if (!objResult || !blnCanViewAttendanceIntegration) {
      return;
    }
    let blnMounted = true;

    async function loadAttendancePreview() {
      setBlnAttendanceLoading(true);
      setStrAttendanceError("");
      try {
        const dicPreview = await attendancePayrollService.previewEmployeeAttendance(
          objResult!.intPayrollRunID,
          objResult!.intEmployeeID
        );
        if (!blnMounted) {
          return;
        }
        setObjAttendancePreview(dicPreview);
      } catch (objError) {
        if (!blnMounted) {
          return;
        }
        setStrAttendanceError(objError instanceof Error ? objError.message : "Unable to load attendance preview.");
      } finally {
        if (blnMounted) {
          setBlnAttendanceLoading(false);
          setBlnAttendanceLoaded(true);
        }
      }
    }

    async function loadArrears() {
      setBlnArrearsLoading(true);
      setStrArrearsError("");
      try {
        const lstResult = await attendancePayrollService.getEmployeeArrears(
          objResult!.intPayrollRunID,
          objResult!.intEmployeeID
        );
        if (!blnMounted) {
          return;
        }
        setLstArrears(lstResult);
      } catch (objError) {
        if (!blnMounted) {
          return;
        }
        setStrArrearsError(objError instanceof Error ? objError.message : "Unable to load arrears/adjustments.");
      } finally {
        if (blnMounted) {
          setBlnArrearsLoading(false);
          setBlnArrearsLoaded(true);
        }
      }
    }

    if (strIntegrationTab === "attendance" && !blnAttendanceLoaded) {
      loadAttendancePreview().catch(() => undefined);
    }
    if (strIntegrationTab === "arrears" && !blnArrearsLoaded) {
      loadArrears().catch(() => undefined);
    }

    return () => {
      blnMounted = false;
    };
  }, [objResult, blnCanViewAttendanceIntegration, strIntegrationTab, blnAttendanceLoaded, blnArrearsLoaded]);

  async function openAttendanceTraceDialog() {
    setBlnTraceDialogOpen(true);
    setStrTraceError("");
    setObjTraceJson(null);
    setBlnTraceLoading(false);
    // Gap (documented in the delivery report): there is no existing backend surface that
    // resolves an EmployeePayrollInput ID from a run + employee pair (the employee-payroll-
    // inputs list route only accepts free-text search filters, not IDs), so
    // getPayrollInputAttendanceTrace(intInputID) cannot be called from this screen without
    // adding new backend surface, which is out of scope. The dialog explains this instead
    // of fabricating an ID.
    setStrTraceError(
      tAttendance(
        "ATTENDANCE_TRACE_UNAVAILABLE",
        "Calculation trace is not available from this screen yet - no payroll input lookup by run and employee exists."
      )
    );
  }

  const lstResultLines = useMemo(
    () => (objResult?.lstLines ?? []).filter((dicLine) => hasDisplayAmount(dicLine.decAmount)),
    [objResult]
  );

  if (blnLoading || blnRightsLoading) {
    return <BlockingLoader blnOpen strLabel={t("loading_result", "Loading payroll result...")} />;
  }

  if (!objResult) {
    return (
      <Box className={styles.page}>
        <Alert severity="error">{strError || t("not_found", "Payroll result not found.")}</Alert>
      </Box>
    );
  }

  async function loadPayslipPreview() {
    setBlnPayslipLoading(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicPayslip = await ensureGeneratedPayslip();
      if (!dicPayslip?.intPayslipID) {
        setStrError(t("payslip_not_generated", "Payslip could not be generated for this employee."));
        return;
      }
      setObjPayslip(dicPayslip);
      setStrPayslipPreviewHtml(await payslipService.getDownloadHtml(dicPayslip.intPayslipID));
    } catch (objError) {
      setStrError(
        objError instanceof Error ? objError.message : "Unable to load payslip preview."
      );
    } finally {
      setBlnPayslipLoading(false);
    }
  }

  async function generatePayslip() {
    setBlnPayslipLoading(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicPayslip = await payslipService.generatePayslip(
        objResult!.intPayrollRunID,
        objResult!.intEmployeeID
      );
      setObjPayslip(dicPayslip);
      setStrSuccess(t("payslip_generated", "Payslip generated successfully."));
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

  async function ensureGeneratedPayslip() {
    if (objPayslip?.intPayslipID) {
      return objPayslip;
    }
    return generatePayslip();
  }

  async function openGeneratedPayslip(blnPrint: boolean) {
    setBlnPayslipLoading(true);
    setStrError("");
    try {
      const dicPayslip = await ensureGeneratedPayslip();
      if (!dicPayslip?.intPayslipID) {
        return;
      }
      const strHtml = await payslipService.getDownloadHtml(dicPayslip.intPayslipID);
      if (blnPrint) {
        printPayslipHtml(strHtml);
      } else {
        downloadPayslipHtml(
          strHtml,
          buildPayslipFileName("payslip", dicPayslip.strPayslipNumber, objResult!.strEmployeeCode)
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

  function handleOpenActions(objEvent: MouseEvent<HTMLButtonElement>) {
    setObjActionsAnchor(objEvent.currentTarget);
  }

  function handleCloseActions() {
    setObjActionsAnchor(null);
  }

  const dicStatusTone = getStatusTone(objResult.strStatus);
  const dicWageRulePreview = getWageRulePreview(objResult);
  const dicTaxSummary = objResult.dicTaxSummary;
  const lstEmployeeSummaryItems: SummaryDisplayItem[] = [
    { key: "employee-code", label: t("employee_code", "Employee Code"), value: objResult.strEmployeeCode },
    { key: "employee-name", label: t("employee_name", "Employee Name"), value: objResult.strEmployeeName, tooltip: objResult.strEmployeeName },
    { key: "flexi-bucket", label: t("flexi_bucket", "Flexi Bucket"), value: formatCurrency(objResult.decFlexiBucketAmount ?? 0) },
    { key: "declared-flexi", label: t("declared_flexi", "Declared Flexi"), value: formatCurrency(objResult.decDeclaredFlexiAmount ?? 0) },
    { key: "residual-flexi", label: t("residual_flexi", "Residual Flexi"), value: formatCurrency(objResult.decResidualFlexiAmount ?? 0) },
    {
      key: "status",
      label: t("status", "Status"),
      value: <Chip label={translateDynamicLabel(t, objResult.strStatus, "status")} size="small" sx={{ ...dicStatusTone, height: 22, fontSize: "0.7rem", fontWeight: 800 }} />,
    },
  ];
  const lstJobPayrollItems: SummaryDisplayItem[] = [
    { key: "payroll-run", label: t("payroll_run", "Payroll Run"), value: objResult.strRunName, tooltip: objResult.strRunName },
    { key: "run-code", label: t("run_code", "Run Code"), value: objResult.strRunCode },
    { key: "payroll-month", label: t("payroll_month", "Payroll Month"), value: formatMonth(objResult.dtPayrollMonth) },
    { key: "payroll-period", label: t("payroll_period", "Payroll Period"), value: `${objResult.dtPeriodStartDate || "-"} to ${objResult.dtPeriodEndDate || "-"}` },
    { key: "working-days", label: t("working_days", "Working Days"), value: String(objResult.decCalendarDays ?? "-") },
    { key: "paid-days", label: t("paid_days", "Paid Days"), value: String(objResult.decPaidDays ?? "-") },
    { key: "lop-days", label: t("lop_days", "LOP Days"), value: String(objResult.decLopDays ?? "-") },
    { key: "employer-contributions", label: t("employer_contribution", "Employer Contributions"), value: formatCurrency(objResult.decEmployerContributionTotal ?? 0) },
  ];
  const lstTaxSummaryItems: SummaryDisplayItem[] = [
    { key: "tax-regime", label: t("tax_regime", "Tax Regime"), value: objResult.strRegimeUsed || "-" },
    { key: "taxable-income", label: t("taxable_income", "Taxable Income"), value: formatCurrency(objResult.decTaxableIncome) },
    { key: "projected-taxable-income", label: t("projected_taxable_income", "Projected Taxable Income"), value: formatCurrency(dicTaxSummary?.decProjectedTaxableIncome ?? objResult.decTaxableIncome) },
    { key: "exemptions", label: t("exemptions", "Exemptions"), value: formatCurrency(dicTaxSummary?.decExemptionAmount ?? 0) },
    { key: "declared-deductions", label: t("declared_deductions", "Declared Deductions"), value: formatCurrency(dicTaxSummary?.decDeclaredDeductionAmount ?? 0) },
    { key: "standard-deduction", label: t("standard_deduction", "Standard Deduction"), value: formatCurrency(dicTaxSummary?.decStandardDeductionAmount ?? 0) },
    { key: "tax-before-rebate", label: t("tax_before_rebate", "Tax Before Rebate"), value: formatCurrency(dicTaxSummary?.decTaxBeforeRebate ?? objResult.decAnnualTaxAmount) },
    { key: "rebate-relief", label: t("rebate_relief", "Rebate + Relief"), value: formatCurrency((dicTaxSummary?.decRebateAmount ?? 0) + (dicTaxSummary?.decMarginalRebateReliefAmount ?? 0)) },
    { key: "surcharge-net", label: t("surcharge_net", "Surcharge (Net)"), value: formatCurrency((dicTaxSummary?.decSurchargeAmount ?? 0) - (dicTaxSummary?.decMarginalSurchargeReliefAmount ?? 0)) },
    { key: "cess", label: t("cess", "Cess"), value: formatCurrency(dicTaxSummary?.decCessAmount ?? 0) },
    { key: "annual-tax", label: t("annual_tax", "Annual Tax"), value: formatCurrency(dicTaxSummary?.decTotalTaxLiability ?? objResult.decAnnualTaxAmount) },
    { key: "monthly-tds", label: t("monthly_tds", "Monthly TDS"), value: formatCurrency(dicTaxSummary?.decMonthlyTds ?? objResult.decMonthlyTds) },
    { key: "slab-profile", label: t("slab_profile", "Slab Profile"), value: dicTaxSummary?.strSlabProfileCode || "-" },
  ];
  const lstWageRuleItems: SummaryDisplayItem[] = [
    { key: "wage-total", label: t("wage_total", "Wage Total"), value: formatCurrency(dicWageRulePreview.wage_total ?? 0) },
    { key: "non-wage-total", label: t("non_wage_total", "Non-Wage Total"), value: formatCurrency(dicWageRulePreview.non_wage_total ?? 0) },
    { key: "wage-percent-of-ctc", label: t("wage_percent_of_ctc", "Wage % of CTC"), value: formatPercent(dicWageRulePreview.wage_percent_of_ctc) },
    { key: "minimum-required-wage", label: t("minimum_required_wage", "Minimum Required Wage"), value: formatOptionalCurrency(dicWageRulePreview.minimum_required_wage) },
    { key: "deemed-wage-shortfall", label: t("deemed_wage_shortfall", "Deemed Wage Shortfall"), value: formatCurrency(dicWageRulePreview.deemed_wage_shortfall ?? 0) },
    { key: "deemed-wage-base", label: t("deemed_wage_base", "Deemed Wage Base"), value: formatCurrency(dicWageRulePreview.deemed_wage_base ?? 0) },
    { key: "calculation-basis", label: t("calculation_basis", "Calculation Basis"), value: translateDynamicLabel(t, dicWageRulePreview.calculation_basis, "", formatBasisLabel(dicWageRulePreview.calculation_basis)) },
    { key: "threshold", label: t("threshold", "Threshold"), value: formatPercent(dicWageRulePreview.threshold_percent) },
    {
      key: "wage-rule-note",
      label: t("note", "Note"),
      value: t("wage_rule_preview_note", "Wage rule preview is for statutory calculation. Final applicability depends on statutory configuration and payroll processing."),
      tone: "info",
    },
  ];
  const lstNotesItems: SummaryDisplayItem[] = [
    {
      key: "remarks",
      label: t("remarks", "Remarks"),
      value: objResult.strRemarks || t("no_remarks", "No remarks available."),
      tone: "note",
    },
    {
      key: "calculation-engine-note",
      label: t("calculation_engine", "Calculation Engine"),
      value: t("generated_by_payroll_calculation_engine", "Generated by payroll calculation engine."),
      tone: "note",
    },
    {
      key: "wage-rule-help",
      label: t("wage_rule_preview", "Wage Rule Preview"),
      value: t("wage_rule_preview_note", "Wage rule preview is for statutory calculation. Final applicability depends on statutory configuration and payroll processing."),
      tone: "info",
    },
  ];
  const lstSummaryGuide = [
    { key: "employee", label: t("employee_summary", "Employee Summary"), icon: <PersonOutlineRoundedIcon sx={{ fontSize: 18 }} /> },
    { key: "job", label: t("job_payroll", "Job & Payroll"), icon: <CalendarMonthRoundedIcon sx={{ fontSize: 18 }} /> },
    { key: "tax", label: t("tax_summary", "Tax Summary"), icon: <PercentRoundedIcon sx={{ fontSize: 18 }} /> },
    { key: "wage", label: t("wage_rule_preview", "Wage Rule Preview"), icon: <RequestQuoteRoundedIcon sx={{ fontSize: 18 }} /> },
    { key: "notes", label: t("notes", "Notes"), icon: <NoteAltOutlinedIcon sx={{ fontSize: 18 }} /> },
  ];

  return (
    <Box
      sx={{
        minHeight: "100%",
        overflowX: "hidden",
        overflowY: "auto",
        pb: 2,
      }}
    >
      <Paper
        sx={{
          borderRadius: "12px",
          p: { xs: 1.5, md: 2 },
          border: "1px solid #cfe0f5",
          background: "#f6f9fd",
          boxShadow: "0 16px 38px rgba(15, 23, 42, 0.05)",
          maxWidth: "100%",
          overflow: "hidden",
        }}
      >
        <Stack spacing={1.7}>
          <Paper
            sx={{
              borderRadius: "12px",
              border: "1px solid #dbe7f3",
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
              background: "#fff",
              px: { xs: 1.5, md: 2.4 },
              py: 1.7,
              minHeight: 88,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
              <Stack direction="row" spacing={1.8} alignItems="center" sx={{ minWidth: 0 }}>
                <Avatar
                  sx={{
                    width: 58,
                    height: 58,
                    background: "linear-gradient(135deg, #6157f2 0%, #5138d8 100%)",
                    color: "#fff",
                    fontSize: "1.25rem",
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  {getInitials(objResult.strEmployeeName)}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography component="h1" sx={{ color: "#0f172a", fontSize: { xs: "1.35rem", md: "1.55rem" }, fontWeight: 900, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {blnPayslipScreen ? t("payslip_title", "Payslip") : t("payroll_results_title", "Payroll Results")}
                  </Typography>
                  <Typography sx={{ color: "#334d79", fontSize: "0.9rem", mt: 0.5, fontWeight: 600 }}>
                    {objResult.strEmployeeName} {" | "} {objResult.strEmployeeCode} {" | "} {objResult.strRunName}
                  </Typography>
                </Box>
              </Stack>

            <Stack spacing={0.8} alignItems={{ xs: "flex-start", sm: "flex-end" }} sx={{ ml: { sm: "auto" } }}>
              <Button
                onClick={() => objRouter.push(strResolvedBackRoute)}
                startIcon={<ArrowBackRoundedIcon />}
                sx={{
                  color: "#2563eb",
                  px: 0,
                  minWidth: 0,
                  textTransform: "none",
                  fontWeight: 900,
                  fontSize: "0.86rem",
                  lineHeight: 1,
                  "& .MuiButton-startIcon": { mr: 0.6 },
                  "&:hover": { background: "transparent", color: "#1d4ed8" },
                }}
                data-controlid="payroll.result-detail.back.button"
              >
                {t("back_to_list", "Back to List")}
              </Button>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="flex-start">
                <Chip
                  label={translateDynamicLabel(t, objResult.strStatus, "status")}
                  sx={{
                    alignSelf: { xs: "flex-start", sm: "center" },
                    background: dicStatusTone.background,
                    color: dicStatusTone.color,
                    fontWeight: 800,
                    borderRadius: "999px",
                    height: 30,
                    px: 1,
                  }}
                />
                {blnPayslipScreen && blnCanUsePayslipDocumentActions ? (
                  <>
                  <Button
                    onClick={handleOpenActions}
                    endIcon={<KeyboardArrowDownRoundedIcon />}
                    startIcon={<DownloadRoundedIcon />}
                    disabled={blnPayslipLoading}
                    sx={{
                      borderRadius: "10px",
                      border: "1px solid #d7e4f3",
                      color: "#0f172a",
                      background: "#fff",
                      boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
                      px: 2,
                      height: 38,
                      textTransform: "none",
                      fontWeight: 800,
                    }}
                    data-controlid="payroll.result-detail.actions.button"
                  >
                    {blnCanDownloadPayslips ? t("download_payslip", "Download") : t("actions", "Actions")}
                  </Button>
                  <Menu anchorEl={objActionsAnchor} open={Boolean(objActionsAnchor)} onClose={handleCloseActions}>
                    {blnCanDownloadPayslips ? (
                      <MenuItem onClick={() => { handleCloseActions(); void openGeneratedPayslip(false); }} data-controlid="payroll.result-detail.download-payslip.button">
                        {t("download_payslip", "Download")}
                      </MenuItem>
                    ) : null}
                    {blnCanPrintPayslips ? (
                      <MenuItem onClick={() => { handleCloseActions(); void openGeneratedPayslip(true); }} data-controlid="payroll.result-detail.print-payslip.button">
                        {t("print_payslip", "Print")}
                      </MenuItem>
                    ) : null}
                  </Menu>
                  </>
                ) : null}
              </Stack>
            </Stack>
          </Paper>

          {strError ? <Alert severity="error">{strError}</Alert> : null}
          {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}
          {blnPayslipLoading ? <Alert severity="info">{t("payslip_loading", "Preparing payslip...")}</Alert> : null}

          <Box
            sx={{
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))", lg: "repeat(7, minmax(0, 1fr))" },
            }}
          >
            <KpiCard
              strLabel={t("gross_pay", "Gross Pay")}
              strValue={formatCurrency(objResult.decGrossEarningsAmount ?? objResult.decGrossAmount)}
              objIcon={<WalletRoundedIcon sx={{ fontSize: 25 }} />}
              strIconBg="#dff8ef"
              strIconColor="#0f766e"
            />
            <KpiCard
              strLabel={t("total_earnings", "Total Earnings")}
              strValue={formatCurrency(objResult.decEarningsSectionTotal ?? 0)}
              objIcon={<RequestQuoteRoundedIcon sx={{ fontSize: 30 }} />}
              strBorder="rgba(134, 239, 172, 0.65)"
              strIconBg="linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)"
              strIconColor="#15803d"
            />
            <KpiCard
              strLabel={t("reimbursements", "Reimbursements")}
              strValue={formatCurrency(objResult.decReimbursementSectionTotal ?? 0)}
              objIcon={<DescriptionOutlinedIcon sx={{ fontSize: 30 }} />}
              strBorder="rgba(251, 191, 36, 0.55)"
              strIconBg="linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)"
              strIconColor="#b45309"
            />
            <KpiCard
              strLabel={t("employee_deductions", "Employee Deductions")}
              strValue={formatCurrency(objResult.decEmployeeDeductionTotal ?? objResult.decDeductionAmount)}
              objIcon={<DescriptionOutlinedIcon sx={{ fontSize: 25 }} />}
              strIconBg="#ffedd5"
              strIconColor="#f97316"
            />
            <KpiCard
              strLabel={t("tax", "Tax")}
              strValue={formatCurrency(objResult.decTaxTotal ?? objResult.decTaxAmount)}
              objIcon={<PercentRoundedIcon sx={{ fontSize: 25 }} />}
              strIconBg="#ede9fe"
              strIconColor="#7c3aed"
            />
            <KpiCard
              strLabel={t("net_pay", "Net Pay")}
              strValue={formatCurrency(objResult.decNetPayAmount)}
              objIcon={<PaymentsRoundedIcon sx={{ fontSize: 25 }} />}
              strIconBg="#dcfce7"
              strIconColor="#16a34a"
              blnEmphasis
            />
            <KpiCard
              strLabel={t("total_employer_cost", "Total Employer Cost")}
              strValue={formatCurrency(objResult.decTotalEmployerCost ?? 0)}
              objIcon={<SummarizeOutlinedIcon sx={{ fontSize: 25 }} />}
              strIconBg="#fee2d5"
              strIconColor="#c2410c"
            />
          </Box>

          <Paper
            sx={{
              borderRadius: "12px",
              border: "1px solid #dbe7f3",
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
              background: "#fff",
              p: { xs: 1.5, md: 1.8 },
            }}
          >
            <Typography component="h2" sx={{ display: "flex", alignItems: "center", gap: 1, color: "#0f172a", fontSize: "1.05rem", fontWeight: 900, pb: 1.3, borderBottom: "1px solid #dbe7f3" }}>
              <SummarizeOutlinedIcon sx={{ color: "#2563eb", fontSize: 22 }} />
              {t("summary_section", "Summary")}
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(5, minmax(0, 1fr))" },
                borderBottom: "1px solid #e6eef7",
                mb: 1.5,
              }}
            >
              {lstSummaryGuide.map((dicItem, intIndex) => (
                <Box
                  key={dicItem.key}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.8,
                    minHeight: 48,
                    color: intIndex === 0 ? "#2563eb" : "#0f2444",
                    fontSize: "0.78rem",
                    fontWeight: 900,
                    borderRight: { xs: "none", md: intIndex === lstSummaryGuide.length - 1 ? "none" : "1px solid #e6eef7" },
                    borderBottom: intIndex === 0 ? "2px solid #2563eb" : "2px solid transparent",
                  }}
                >
                  {dicItem.icon}
                  <span>{dicItem.label}</span>
                </Box>
              ))}
            </Box>
            <Box
              sx={{
                display: "grid",
                gap: 1.5,
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(2, minmax(0, 1fr))",
                  xl: "1fr 1.04fr 1.08fr 1.04fr 0.95fr",
                },
                alignItems: "stretch",
              }}
            >
              <PaginatedSummaryCard strTitle={t("employee_details", "Employee Details")} objIcon={<PersonOutlineRoundedIcon sx={{ color: "#2563eb", fontSize: 20 }} />} lstItems={lstEmployeeSummaryItems} strAriaLabel={t("employee_details", "Employee Details")} />
              <PaginatedSummaryCard strTitle={t("job_payroll", "Job & Payroll")} objIcon={<CalendarMonthRoundedIcon sx={{ color: "#4f46e5", fontSize: 20 }} />} lstItems={lstJobPayrollItems} strAriaLabel={t("job_payroll", "Job & Payroll")} />
              <PaginatedSummaryCard strTitle={t("tax_summary", "Tax Summary")} objIcon={<PercentRoundedIcon sx={{ color: "#6d28d9", fontSize: 20 }} />} lstItems={lstTaxSummaryItems} strAriaLabel={t("tax_summary", "Tax Summary")} />
              <PaginatedSummaryCard strTitle={t("wage_rule_preview", "Wage Rule Preview")} objIcon={<RequestQuoteRoundedIcon sx={{ color: "#0f766e", fontSize: 20 }} />} lstItems={lstWageRuleItems} strAriaLabel={t("wage_rule_preview", "Wage Rule Preview")} />
              <PaginatedSummaryCard strTitle={t("notes", "Notes")} objIcon={<NoteAltOutlinedIcon sx={{ color: "#f97316", fontSize: 20 }} />} lstItems={lstNotesItems} strAriaLabel={t("notes", "Notes")} />
            </Box>
          </Paper>

          <Paper
            sx={{
              borderRadius: "12px",
              border: "1px solid #dbe7f3",
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
              background: "#fff",
              p: { xs: 1.5, md: 1.8 },
              maxWidth: "100%",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", lg: "row" },
                alignItems: { xs: "stretch", lg: "center" },
                justifyContent: "space-between",
                gap: 1.5,
                pb: 1.3,
                mb: 1.2,
                borderBottom: "1px solid #dbe7f3"
              }}
            >
              <Typography sx={{ display: "flex", alignItems: "center", gap: 1, color: "#0f172a", fontSize: "1.05rem", fontWeight: 900 }}>
                <RequestQuoteRoundedIcon sx={{ color: "#2563eb", fontSize: 22 }} />
                {t("line_items", "Result Lines")}
              </Typography>
              <Stack direction="row" spacing={1.5} alignItems="center" justifyContent={{ xs: "flex-start", lg: "flex-end" }} flexWrap="wrap">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography sx={{ color: "#334155", fontSize: "0.82rem", fontWeight: 700 }}>
                    {t("group_by_category", "Group by Category")}
                  </Typography>
                  <Switch
                    checked={false}
                    disabled
                    inputProps={{ "data-controlid": "payroll.result-detail.group-by-category.switch" } as InputHTMLAttributes<HTMLInputElement>}
                  />
                </Stack>
                <Button
                  className={styles.secondaryButton}
                  startIcon={<FilterAltOutlinedIcon />}
                  disabled
                  data-controlid="payroll.result-detail.filter.button"
                >
                  {t("filter", "Filter")}
                </Button>
              </Stack>
            </Box>

            <Box
              sx={{
                overflowX: "auto",
                border: "1px solid #dbe7f3",
                borderRadius: "10px",
                maxWidth: "100%",
              }}
            >
              <table className={`${styles.table} ${styles.resultLinesTable}`}>
                <thead>
                  <tr>
                    <th>{t("component_code", "Component Code")}</th>
                    <th>{t("component_name", "Component Name")}</th>
                    <th>{t("category", "Category")}</th>
                    <th>{t("line_type", "Line Type")}</th>
                    <th>{t("amount", "Amount")}</th>
                    <th>{t("monthly_amount", "Monthly Amount")}</th>
                    <th>{t("payroll_impact", "Payroll Impact")}</th>
                    <th>{t("calculation_source", "Calculation Source")}</th>
                    <th>{t("taxable", "Taxable")}</th>
                    <th>{t("ctc_included", "CTC Included")}</th>
                    <th>{t("payslip_section", "Payslip Section")}</th>
                    <th>{t("lwp_audit", "LWP Audit")}</th>
                    <th>{t("remarks", "Remarks")}</th>
                  </tr>
                </thead>
                <tbody>
                  {lstResultLines.length === 0 ? (
                    <tr>
                      <td colSpan={13} className={styles.emptyState}>
                        {t("line_empty", "No payroll result lines found.")}
                      </td>
                    </tr>
                  ) : (
                    lstResultLines.map((dicLine) => {
                      const objLwpSummary = getLineLwpSummary(dicLine);
                      return (
                      <tr key={dicLine.intID}>
                        <td>{dicLine.strComponentCode}</td>
                        <td>{translateDynamicLabel(t, dicLine.strComponentName)}</td>
                        <td>
                          <Chip
                            label={translateDynamicLabel(t, dicLine.strComponentCategory)}
                            size="small"
                            sx={{
                              ...getCategoryChipSx(dicLine.strComponentCategory),
                              fontWeight: 700,
                              borderRadius: "8px",
                            }}
                          />
                        </td>
                        <td>{translateDynamicLabel(t, dicLine.strLineType)}</td>
                        <td>{formatCurrency(dicLine.decAmount)}</td>
                        <td>{formatCurrency(getLineMonthlyAmount(dicLine) ?? 0)}</td>
                        <td>{translateDynamicLabel(t, getPayrollImpactLabel(dicLine))}</td>
                        <td>{translateDynamicLabel(t, dicLine.strCalculationSource || dicLine.strSourceType)}</td>
                        <td>{translateDynamicLabel(t, getTaxableLabel(dicLine))}</td>
                        <td>{translateDynamicLabel(t, getCtcIncludedLabel(dicLine))}</td>
                        <td>{translateDynamicLabel(t, dicLine.strPayslipSection)}</td>
                        <td>
                          {objLwpSummary ? (
                            <span data-controlid="payroll.result-detail.line.lwp-summary" title={objLwpSummary.strOutcome ?? ""}>
                              {translateDynamicLabel(t, objLwpSummary.strTreatment, "lwp_treatment")}
                              {objLwpSummary.decReducedAmount > 0 ? ` (-${formatCurrency(objLwpSummary.decReducedAmount)})` : ""}
                            </span>
                          ) : getLwpExplanation(t, dicLine)}
                        </td>
                        <td>{dicLine.strRemarks || "-"}</td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between",
                gap: 1.25,
                pt: 1.8,
              }}
            >
              <Typography sx={{ color: "#475569", fontSize: "0.92rem" }}>
                {formatLabelTemplate(
                  t("showing_results", "Showing {from} to {to} of {total} results"),
                  {
                    from: lstResultLines.length ? 1 : 0,
                    to: lstResultLines.length,
                    total: lstResultLines.length,
                  }
                )}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  disabled
                  sx={{
                    minWidth: 36,
                    width: 36,
                    height: 36,
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    color: "#94a3b8",
                  }}
                >
                  {"<"}
                </Button>
                <Button
                  sx={{
                    minWidth: 36,
                    width: 36,
                    height: 36,
                    borderRadius: "10px",
                    background: "#2563eb",
                    color: "#fff",
                    fontWeight: 800,
                    "&:hover": { background: "#2563eb" },
                  }}
                >
                  1
                </Button>
                <Button
                  disabled
                  sx={{
                    minWidth: 36,
                    width: 36,
                    height: 36,
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    color: "#94a3b8",
                  }}
                >
                  {">"}
                </Button>
              </Stack>
            </Box>
          </Paper>

          {blnCanViewAttendanceIntegration ? (
            <Paper
              sx={{
                borderRadius: "12px",
                border: "1px solid #dbe7f3",
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
                background: "#fff",
                p: { xs: 1.5, md: 1.8 },
                maxWidth: "100%",
                overflow: "hidden",
              }}
            >
              <Box sx={{ alignItems: "center", display: "flex", gap: 1, mb: 1.5 }}>
                <Button
                  onClick={() => setStrIntegrationTab("attendance")}
                  sx={{
                    borderRadius: "8px",
                    fontWeight: 800,
                    textTransform: "none",
                    px: 1.5,
                    background: strIntegrationTab === "attendance" ? "#0B5ED7" : "#fff",
                    color: strIntegrationTab === "attendance" ? "#fff" : "#0B5ED7",
                    border: "1px solid #8FB8F9",
                    "&:hover": { background: strIntegrationTab === "attendance" ? "#084298" : "#EEF5FF" },
                  }}
                  data-controlid="payroll.result-detail.tab.attendance.button"
                >
                  {tAttendance("ATTENDANCE_TAB_TITLE", "Attendance")}
                </Button>
                <Button
                  onClick={() => setStrIntegrationTab("arrears")}
                  sx={{
                    borderRadius: "8px",
                    fontWeight: 800,
                    textTransform: "none",
                    px: 1.5,
                    background: strIntegrationTab === "arrears" ? "#0B5ED7" : "#fff",
                    color: strIntegrationTab === "arrears" ? "#fff" : "#0B5ED7",
                    border: "1px solid #8FB8F9",
                    "&:hover": { background: strIntegrationTab === "arrears" ? "#084298" : "#EEF5FF" },
                  }}
                  data-controlid="payroll.result-detail.tab.arrears.button"
                >
                  {tAttendance("ARREARS_TAB_TITLE", "Arrears / Adjustments")}
                </Button>
              </Box>

              {strIntegrationTab === "attendance" ? (
                <Box>
                  {blnAttendanceLoading ? (
                    <Typography sx={{ color: "#64748b", fontSize: "0.86rem" }}>{t("loading", "Loading...")}</Typography>
                  ) : strAttendanceError ? (
                    <Alert severity="error">{strAttendanceError}</Alert>
                  ) : objAttendancePreview ? (
                    <>
                      <Box
                        sx={{
                          display: "grid",
                          gap: 1.25,
                          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" },
                        }}
                      >
                        {[
                          { strLabel: tAttendance("ATTENDANCE_FIELD_EFFECTIVE_START", "Effective Employment Start"), strValue: objAttendancePreview.dtEffectiveStart },
                          { strLabel: tAttendance("ATTENDANCE_FIELD_EFFECTIVE_END", "Effective Employment End"), strValue: objAttendancePreview.dtEffectiveEnd },
                          { strLabel: tAttendance("ATTENDANCE_FIELD_CALENDAR_DAYS", "Calendar Days"), strValue: String(objAttendancePreview.decCalendarDays) },
                          { strLabel: tAttendance("ATTENDANCE_FIELD_WORKING_DAYS", "Working Days"), strValue: String(objAttendancePreview.decWorkingDays) },
                          { strLabel: tAttendance("ATTENDANCE_FIELD_ATTENDANCE_DAYS", "Attendance Days"), strValue: String(objAttendancePreview.decAttendanceDays) },
                          { strLabel: tAttendance("ATTENDANCE_FIELD_PAID_DAYS", "Paid Days"), strValue: String(objAttendancePreview.decPaidDays) },
                          { strLabel: tAttendance("ATTENDANCE_FIELD_LWP_LOP_DAYS", "LWP / LOP Days"), strValue: String(objAttendancePreview.decLwpLopDays) },
                          {
                            strLabel: tAttendance("ATTENDANCE_FIELD_DENOMINATOR", "Denominator"),
                            strValue: objAttendancePreview.decDenominator != null ? String(objAttendancePreview.decDenominator) : "-",
                          },
                          {
                            strLabel: tAttendance("ATTENDANCE_FIELD_DENOMINATOR_SOURCE", "Denominator Source"),
                            strValue: objAttendancePreview.strDenominatorSource ?? "-",
                          },
                          {
                            strLabel: tAttendance("ATTENDANCE_FIELD_RECONCILIATION_STATUS", "Reconciliation Status"),
                            strValue: objAttendancePreview.strReconciliationStatus ?? "-",
                          },
                          {
                            strLabel: tAttendance("ATTENDANCE_FIELD_OVERRIDE_STATUS", "Override Status"),
                            // The preview/trace responses do not expose a dedicated override
                            // field - blnBlocked/lstBlockingReasons are the only signals
                            // returned, so "System-derived" is shown whenever the run isn't
                            // blocked. See delivery report for this documented gap.
                            strValue: objAttendancePreview.blnBlocked
                              ? t("attendance_status_blocked", "Blocked")
                              : t("attendance_status_system_derived", "System-derived"),
                          },
                        ].map((dicField) => (
                          <Box key={dicField.strLabel} sx={{ border: "1px solid #e6eef7", borderRadius: "8px", p: 1.2 }}>
                            <Typography sx={{ color: "#64748b", fontSize: "0.74rem", fontWeight: 700 }}>{dicField.strLabel}</Typography>
                            <Typography sx={{ color: "#0f172a", fontSize: "0.92rem", fontWeight: 900, mt: 0.35 }}>{dicField.strValue}</Typography>
                          </Box>
                        ))}
                      </Box>

                      {objAttendancePreview.lstBlockingReasons.length ? (
                        <Alert severity="error" sx={{ mt: 1.5 }}>
                          {objAttendancePreview.lstBlockingReasons.map((dicReason) => dicReason.strMessage).filter(Boolean).join(" | ")}
                        </Alert>
                      ) : null}
                      {objAttendancePreview.lstWarnings.length ? (
                        <Alert severity="warning" sx={{ mt: 1.5 }}>
                          {objAttendancePreview.lstWarnings.map((dicReason) => dicReason.strMessage).filter(Boolean).join(" | ")}
                        </Alert>
                      ) : null}

                      <Box sx={{ mt: 1.5 }}>
                        <Tooltip
                          title={
                            blnCanTraceAttendance
                              ? tAttendance(
                                  "ATTENDANCE_TRACE_UNAVAILABLE",
                                  "Calculation trace is not available from this screen yet - no payroll input lookup by run and employee exists."
                                )
                              : t("access_denied", "Not available for your user group.")
                          }
                          arrow
                        >
                          <span>
                            <Button
                              className={styles.secondaryButton}
                              onClick={openAttendanceTraceDialog}
                              disabled={!blnCanTraceAttendance}
                              data-controlid="payroll.result-detail.attendance.trace.button"
                            >
                              {tAttendance("ATTENDANCE_TRACE_BUTTON", "View Calculation Trace")}
                            </Button>
                          </span>
                        </Tooltip>
                      </Box>
                    </>
                  ) : null}
                </Box>
              ) : (
                <Box
                  sx={{
                    overflowX: "auto",
                    border: "1px solid #dbe7f3",
                    borderRadius: "10px",
                    maxWidth: "100%",
                  }}
                >
                  {blnArrearsLoading ? (
                    <Typography sx={{ color: "#64748b", fontSize: "0.86rem", p: 1.5 }}>{t("loading", "Loading...")}</Typography>
                  ) : strArrearsError ? (
                    <Alert severity="error" sx={{ m: 1.5 }}>{strArrearsError}</Alert>
                  ) : (
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>{tAttendance("ARREARS_FIELD_COMPONENT", "Component")}</th>
                          <th>{t("line_type", "Line Type")}</th>
                          <th>{t("amount", "Amount")}</th>
                          <th>{t("remarks", "Remarks")}</th>
                          <th>{t("source", "Source")}</th>
                          <th>{t("date", "Date")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lstArrears.length === 0 ? (
                          <tr>
                            <td colSpan={6} className={styles.emptyState}>
                              {tAttendance("ARREARS_EMPTY_STATE", "No arrears or adjustments for this employee.")}
                            </td>
                          </tr>
                        ) : (
                          lstArrears.map((dicLine) => (
                            <tr key={dicLine.intID}>
                              <td>{dicLine.strComponentName || dicLine.strComponentCode || "-"}</td>
                              <td>{dicLine.strLineType}</td>
                              <td>{formatCurrency(dicLine.decAmount)}</td>
                              <td>{dicLine.strRemarks || "-"}</td>
                              <td>{dicLine.strSourceType}</td>
                              <td>{dicLine.dtAddedOn ? formatMonth(dicLine.dtAddedOn) : "-"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </Box>
              )}
            </Paper>
          ) : null}

          {strPayslipPreviewHtml ? (
            <Paper
              sx={{
                borderRadius: "24px",
                border: "1px solid rgba(226, 232, 240, 0.95)",
                boxShadow: "0 20px 44px rgba(15, 23, 42, 0.05)",
                background: "#fff",
                p: 2.8,
              }}
            >
              <Typography sx={{ display: "flex", alignItems: "center", gap: 1, color: "#0f172a", fontSize: "1.05rem", fontWeight: 900, pb: 2, mb: 2.2, borderBottom: "1px solid #e2e8f0" }}>
                <ReceiptLongRoundedIcon sx={{ color: "#2563eb", fontSize: 22 }} />
                {t("payslip_preview", "Payslip Preview")}
              </Typography>
              <PayslipHtmlPreview strHtml={strPayslipPreviewHtml} />
            </Paper>
          ) : null}
        </Stack>
      </Paper>

      <Dialog
        open={blnTraceDialogOpen}
        onClose={() => setBlnTraceDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        data-controlid="payroll.result-detail.attendance-trace.dialog"
      >
        <DialogTitle sx={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
          {tAttendance("ATTENDANCE_TRACE_DRAWER_TITLE", "Attendance Calculation Trace")}
          <IconButton onClick={() => setBlnTraceDialogOpen(false)} data-controlid="payroll.result-detail.attendance-trace.close.button">
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {blnTraceLoading ? (
            <Typography sx={{ color: "#64748b", fontSize: "0.86rem" }}>{t("loading", "Loading...")}</Typography>
          ) : strTraceError ? (
            <Alert severity="info">{strTraceError}</Alert>
          ) : objTraceJson ? (
            <pre style={{ fontSize: "0.78rem", overflow: "auto", whiteSpace: "pre-wrap" }}>{JSON.stringify(objTraceJson, null, 2)}</pre>
          ) : null}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
