"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
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
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography
} from "@mui/material";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import PayslipHtmlPreview from "@/features/payroll/components/PayslipHtmlPreview";
import ResultLinesTable from "@/features/payroll/components/ResultLinesTable";
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
  "ATTENDANCE_LEAVE_INPUTS",
  "ATTENDANCE_LEAVE_INPUT",
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

function formatOptionalCurrency(decValue: number | null | undefined) {
  return decValue === null || decValue === undefined ? "-" : formatCurrency(decValue);
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

function TaxInfoIconButton({
  onOpen,
  strControlID,
  intSize = 38,
  intIconSize = 22,
  sx,
}: {
  onOpen: () => void;
  strControlID: string;
  intSize?: number;
  intIconSize?: number;
  sx?: object;
}) {
  return (
    <Tooltip title="Tax Information" arrow>
      <IconButton
        size="small"
        onClick={onOpen}
        data-controlid={strControlID}
        sx={{
          color: "#fff",
          backgroundColor: "#1d4ed8",
          border: "1px solid #1d4ed8",
          width: intSize,
          height: intSize,
          padding: 0,
          boxShadow: "0 2px 6px rgba(29, 78, 216, 0.35)",
          "&:hover": { backgroundColor: "#1e40af" },
          ...sx,
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: intIconSize }} />
      </IconButton>
    </Tooltip>
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
  objHeaderAction,
}: {
  strLabel: string;
  strValue: string;
  objIcon: ReactNode;
  strIconBg: string;
  strIconColor: string;
  strBorder?: string;
  blnEmphasis?: boolean;
  objHeaderAction?: ReactNode;
}) {
  return (
    <Paper
      sx={{
        position: "relative",
        borderRadius: "12px",
        border: `1px solid ${strBorder}`,
        background: "#fff",
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
        minHeight: 82,
        px: 2,
        py: 1.6,
      }}
    >
      {objHeaderAction ? <Box sx={{ position: "absolute", top: 8, right: 8 }}>{objHeaderAction}</Box> : null}
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
  objHeaderAction,
}: {
  strTitle: string;
  objIcon: ReactNode;
  lstItems: SummaryDisplayItem[];
  strAriaLabel: string;
  objHeaderAction?: ReactNode;
}) {
  return (
    <Paper
      sx={{
        borderRadius: "10px",
        border: "1px solid #dbe7f3",
        boxShadow: "none",
        minHeight: 220,
        display: "flex",
        flexDirection: "column",
        background: "#fff",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, px: 1.8, py: 1.1, borderBottom: "1px solid #e6eef7", flex: "0 0 auto" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
          {objIcon}
          <Typography component="h3" sx={{ color: "#0f172a", fontSize: "0.84rem", fontWeight: 900, lineHeight: 1.2 }}>
            {strTitle}
          </Typography>
        </Box>
        {objHeaderAction}
      </Box>
      <Box
        sx={{
          px: 1.8,
          py: 0.4,
          flex: "1 1 auto",
          overflowY: "auto",
          maxHeight: { xs: "none", sm: 420 },
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
  const strPathname = usePathname();
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
  const [strActiveTab, setStrActiveTab] = useState<
    "pay-summary" | "earnings-deductions" | "tax-summary" | "statutory-summary" | "attendance-lop" | "calculation-trace"
  >("pay-summary");

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
  const strTaxInformationHref = (() => {
    const strBasePath = blnPayslipScreen
      ? `/reports/payslips/${intResultID}/tax-information`
      : `/payroll/results/${intResultID}/tax-information`;
    const strCurrentPath = strPathname || strResolvedBackRoute;
    return `${strBasePath}?backRoute=${encodeURIComponent(strCurrentPath)}`;
  })();
  const handleOpenTaxInformation = () => {
    window.open(strTaxInformationHref, "_blank", "noopener,noreferrer");
  };
  const blnCanDownloadPayslips = canDoAny("download") || canDoAny("export");
  const blnCanPrintPayslips = canDoAny("print");
  const blnCanUsePayslipDocumentActions = blnCanDownloadPayslips || blnCanPrintPayslips;
  const blnCanViewAttendanceIntegration = !blnPayslipScreen && (canDoAnyAttendance("view") || canDoAnyAttendance("list"));

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
  // Read-only synthesis of already-returned deemed-wage fields into a short business-facing
  // summary - no calculation logic here, purely presentation. Shown only when a deemed-wage
  // shortfall is actually in effect (i.e. relevant), not for every employee.
  const blnWageComplianceRelevant = Number(objResult.decDeemedWagesAmount ?? 0) > 0;
  const lstWageComplianceItems: SummaryDisplayItem[] = [
    {
      key: "compliance-summary",
      label: t("wage_compliance_summary_note", "Compliance Note"),
      value: formatLabelTemplate(
        t(
          "wage_compliance_summary_template",
          "Actual wages ({actual}) were below the statutory minimum, so {shortfall} was treated as deemed wages for compliance."
        ),
        {
          actual: formatCurrency(objResult.decActualWagesAmount ?? 0),
          shortfall: formatCurrency(objResult.decDeemedWagesAmount ?? 0),
        }
      ),
      tone: "info",
    },
    { key: "compliance-actual-wages", label: t("actual_wages", "Actual Wages"), value: formatCurrency(objResult.decActualWagesAmount ?? 0) },
    { key: "compliance-deemed-wages", label: t("deemed_wage_shortfall", "Deemed Wage Shortfall"), value: formatCurrency(objResult.decDeemedWagesAmount ?? 0) },
    { key: "compliance-wage-base", label: t("deemed_wage_base", "Compliance Wage Base"), value: formatCurrency(objResult.decComplianceWageBaseAmount ?? 0) },
    { key: "compliance-minimum-required", label: t("minimum_required_wage", "Minimum Required Wage"), value: formatOptionalCurrency(dicWageRulePreview.minimum_required_wage) },
  ];
  const lstSummaryGuide = [
    { key: "pay-summary", label: t("pay_summary", "Pay Summary"), icon: <PersonOutlineRoundedIcon sx={{ fontSize: 18 }} /> },
    { key: "earnings-deductions", label: t("earnings_deductions", "Earnings & Deductions"), icon: <RequestQuoteRoundedIcon sx={{ fontSize: 18 }} /> },
    { key: "tax-summary", label: t("tax_summary", "Tax Summary"), icon: <PercentRoundedIcon sx={{ fontSize: 18 }} /> },
    { key: "statutory-summary", label: t("statutory_summary", "Statutory Summary"), icon: <SummarizeOutlinedIcon sx={{ fontSize: 18 }} /> },
    { key: "attendance-lop", label: t("attendance_lop_impact", "Attendance-LOP Impact"), icon: <CalendarMonthRoundedIcon sx={{ fontSize: 18 }} /> },
    { key: "calculation-trace", label: t("calculation_trace", "Calculation Trace"), icon: <NoteAltOutlinedIcon sx={{ fontSize: 18 }} /> },
  ] as const;

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

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="flex-end" sx={{ ml: { sm: "auto" } }}>
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
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))", lg: "repeat(6, minmax(0, 1fr))" },
            }}
          >
            <KpiCard
              strLabel={t("gross_earnings", "Gross Earnings")}
              strValue={formatCurrency(objResult.decGrossEarningsAmount ?? objResult.decGrossAmount)}
              objIcon={<WalletRoundedIcon sx={{ fontSize: 25 }} />}
              strIconBg="#dff8ef"
              strIconColor="#0f766e"
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
              objHeaderAction={
                <TaxInfoIconButton
                  onOpen={handleOpenTaxInformation}
                  strControlID="payroll.result-detail.tax-kpi.tax-information.button"
                  intSize={30}
                  intIconSize={18}
                />
              }
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
              strLabel={t("employer_contribution", "Employer Contributions")}
              strValue={formatCurrency(objResult.decEmployerContributionTotal ?? 0)}
              objIcon={<RequestQuoteRoundedIcon sx={{ fontSize: 25 }} />}
              strIconBg="#e0e7ff"
              strIconColor="#4338ca"
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
              overflow: "hidden",
            }}
          >
            <Tabs
              value={strActiveTab}
              onChange={(objEvent, strValue) => setStrActiveTab(strValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: "1px solid #e6eef7", px: { xs: 1, md: 1.8 }, minHeight: 48 }}
              data-controlid="payroll.result-detail.tabs"
            >
              {lstSummaryGuide.map((dicItem) => (
                <Tab
                  key={dicItem.key}
                  value={dicItem.key}
                  label={dicItem.label}
                  icon={dicItem.icon}
                  iconPosition="start"
                  sx={{ minHeight: 48, textTransform: "none", fontWeight: 800, fontSize: "0.8rem" }}
                  data-controlid={`payroll.result-detail.tab.${dicItem.key}.button`}
                />
              ))}
            </Tabs>

            <Box sx={{ p: { xs: 1.5, md: 1.8 } }}>
              {strActiveTab === "pay-summary" ? (
                <Box
                  sx={{
                    display: "grid",
                    gap: 1.5,
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" },
                    alignItems: "stretch",
                  }}
                >
                  <PaginatedSummaryCard strTitle={t("employee_details", "Employee Details")} objIcon={<PersonOutlineRoundedIcon sx={{ color: "#2563eb", fontSize: 20 }} />} lstItems={lstEmployeeSummaryItems} strAriaLabel={t("employee_details", "Employee Details")} />
                  <PaginatedSummaryCard strTitle={t("job_payroll", "Job & Payroll")} objIcon={<CalendarMonthRoundedIcon sx={{ color: "#4f46e5", fontSize: 20 }} />} lstItems={lstJobPayrollItems} strAriaLabel={t("job_payroll", "Job & Payroll")} />
                  <PaginatedSummaryCard strTitle={t("notes", "Notes")} objIcon={<NoteAltOutlinedIcon sx={{ color: "#f97316", fontSize: 20 }} />} lstItems={lstNotesItems} strAriaLabel={t("notes", "Notes")} />
                </Box>
              ) : null}

              {strActiveTab === "tax-summary" ? (
                <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr)" } }}>
                  <PaginatedSummaryCard
                    strTitle={t("tax_summary", "Tax Summary")}
                    objIcon={<PercentRoundedIcon sx={{ color: "#6d28d9", fontSize: 20 }} />}
                    lstItems={lstTaxSummaryItems}
                    strAriaLabel={t("tax_summary", "Tax Summary")}
                    objHeaderAction={
                      <TaxInfoIconButton
                        onOpen={handleOpenTaxInformation}
                        strControlID="payroll.result-detail.tax-summary.tax-information.button"
                        intSize={32}
                        intIconSize={19}
                      />
                    }
                  />
                </Box>
              ) : null}

              {strActiveTab === "statutory-summary" ? (
                <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
                  <PaginatedSummaryCard strTitle={t("wage_rule_preview", "Wage Rule Preview")} objIcon={<RequestQuoteRoundedIcon sx={{ color: "#0f766e", fontSize: 20 }} />} lstItems={lstWageRuleItems} strAriaLabel={t("wage_rule_preview", "Wage Rule Preview")} />
                  {blnWageComplianceRelevant ? (
                    <PaginatedSummaryCard strTitle={t("wage_compliance_summary", "Wage Compliance Summary")} objIcon={<SummarizeOutlinedIcon sx={{ color: "#c2410c", fontSize: 20 }} />} lstItems={lstWageComplianceItems} strAriaLabel={t("wage_compliance_summary", "Wage Compliance Summary")} />
                  ) : null}
                </Box>
              ) : null}
            </Box>
          </Paper>

          {strActiveTab === "earnings-deductions" ? (
            <ResultLinesTable lstLines={objResult.lstLines} />
          ) : null}

          {strActiveTab === "attendance-lop" && blnCanViewAttendanceIntegration ? (
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

          {strActiveTab === "attendance-lop" && !blnCanViewAttendanceIntegration ? (
            <Alert severity="info">
              {t("access_denied", "Not available for your user group.")}
            </Alert>
          ) : null}

          {strActiveTab === "calculation-trace" ? (
            <Paper
              sx={{
                borderRadius: "12px",
                border: "1px solid #dbe7f3",
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
                background: "#fff",
                p: { xs: 1.5, md: 1.8 },
              }}
            >
              <Typography sx={{ display: "flex", alignItems: "center", gap: 1, color: "#0f172a", fontSize: "1.05rem", fontWeight: 900, mb: 1.2 }}>
                <NoteAltOutlinedIcon sx={{ color: "#2563eb", fontSize: 22 }} />
                {t("calculation_trace", "Calculation Trace")}
              </Typography>
              <Alert severity="info">
                {tAttendance(
                  "CALCULATION_TRACE_UNAVAILABLE",
                  "Calculation trace is not available from this screen yet - no payroll input lookup by run and employee exists."
                )}
              </Alert>
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
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1} sx={{ pb: 2, mb: 2.2, borderBottom: "1px solid #e2e8f0" }}>
                <Typography sx={{ display: "flex", alignItems: "center", gap: 1, color: "#0f172a", fontSize: "1.05rem", fontWeight: 900 }}>
                  <ReceiptLongRoundedIcon sx={{ color: "#2563eb", fontSize: 22 }} />
                  {t("payslip_preview", "Payslip Preview")}
                </Typography>
                <TaxInfoIconButton
                  onOpen={handleOpenTaxInformation}
                  strControlID="payroll.result-detail.payslip-preview.tax-information.button"
                />
              </Stack>
              <PayslipHtmlPreview strHtml={strPayslipPreviewHtml} strTaxInformationUrl={strTaxInformationHref} />
            </Paper>
          ) : null}
        </Stack>
      </Paper>
    </Box>
  );
}
