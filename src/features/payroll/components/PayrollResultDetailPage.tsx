"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import PercentRoundedIcon from "@mui/icons-material/PercentRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import RequestQuoteRoundedIcon from "@mui/icons-material/RequestQuoteRounded";
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
import { DetailPageHeader } from "@/components/master/MasterListUi";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import PayslipHtmlPreview from "@/features/payroll/components/PayslipHtmlPreview";
import PayrollResultBreakdown from "@/features/payroll/components/PayrollResultBreakdown";
import masterStyles from "@/components/master/MasterScreen.module.css";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { payrollResultService } from "@/features/payroll/services/payrollResultService";
import { payslipService } from "@/features/payroll/services/payslipService";
import type {
  PayrollResultDetailRecord,
  PayslipPreviewRecord,
  WageRulePreviewRecord,
} from "@/features/payroll/types";
import {
  buildPayslipFileName,
  downloadPayslipHtml,
  printPayslipHtml,
} from "@/features/payroll/utils/payslipDocument";

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
  /** record_uuid from the URL; the internal id is never routed on. */
  strResultID: string;
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
  const dicToneByStatus: Record<string, { background: string; border: string; color: string }> = {
    Calculated: { background: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
    Approved: { background: "#ecfdf5", border: "#bbf7d0", color: "#15803d" },
    Published: { background: "#f5f3ff", border: "#ddd6fe", color: "#6d28d9" },
    Paid: { background: "#f0fdfa", border: "#99f6e4", color: "#0f766e" },
  };
  return dicToneByStatus[strStatus] ?? { background: "#f1f5f9", border: "#cbd5e1", color: "#334155" };
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
          color: "#0B5ED7",
          backgroundColor: "#fff",
          border: "1px solid #8FB8F9",
          borderRadius: "8px",
          width: intSize,
          height: intSize,
          padding: 0,
          "&:hover": { backgroundColor: "var(--app-grid-row-hover-background)" },
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
  strBorder = "#DCE4EF",
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
    <Box
      sx={{
        position: "relative",
        borderRadius: "10px",
        border: `1px solid ${strBorder}`,
        background: "#fff",
        minHeight: 68,
        px: 1.5,
        py: 1.2,
      }}
    >
      {objHeaderAction ? <Box sx={{ position: "absolute", top: 8, right: 8 }}>{objHeaderAction}</Box> : null}
      <Stack direction="row" spacing={1.2} alignItems="center" sx={{ height: "100%", pr: objHeaderAction ? 3.5 : 0 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "10px",
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
          <Typography sx={{ color: "#475569", fontSize: "0.75rem", fontWeight: 700, lineHeight: 1.15 }}>
            {strLabel}
          </Typography>
          <Typography sx={{ color: blnEmphasis ? strIconColor : "#0f172a", fontSize: "0.98rem", fontWeight: 900, mt: 0.35, lineHeight: 1.2 }}>
            {strValue}
          </Typography>
        </Box>
      </Stack>
    </Box>
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
    <Box
      sx={{
        borderRadius: "10px",
        border: "1px solid #DCE4EF",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        overflow: "hidden",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, px: 1.5, py: 1, borderBottom: "1px solid var(--app-grid-border-color)", flex: "0 0 auto" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
          {objIcon}
          <Typography component="h3" sx={{ color: "#0f172a", fontSize: "0.9rem", fontWeight: 800, lineHeight: 1.2 }}>
            {strTitle}
          </Typography>
        </Box>
        {objHeaderAction}
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          columnGap: 4,
          px: 1.5,
          py: 0.25,
          mb: "-1px",
        }}
      >
        {lstItems.map((dicItem) => (
          <Box
            key={dicItem.key}
            sx={{
              minHeight: 40,
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(84px, auto)",
              alignItems: "center",
              gap: 1,
              borderBottom: "1px solid var(--app-grid-border-color)",
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
                  <Typography sx={{ color: "#475569", fontSize: "0.84rem", fontWeight: 600, lineHeight: 1.25, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {dicItem.label}
                  </Typography>
                </Tooltip>
                <Tooltip title={dicItem.tooltip ?? ""} arrow disableHoverListener={!dicItem.tooltip}>
                  <Box sx={{ color: "#0f172a", fontSize: "0.86rem", fontWeight: 800, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", textAlign: "right", whiteSpace: "normal" }}>
                    {dicItem.value}
                  </Box>
                </Tooltip>
              </>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function PayrollResultDetailPage({
  strResultID,
  blnPayslipScreen = false,
  strBackRoute,
}: PayrollResultDetailPageProps) {
  const objRouter = useRouter();
  const strPathname = usePathname();
  const { t } = useModuleLabels("payslips");
  const { blnLoading: blnRightsLoading, canDoAny } = useModuleActionAccess(
    blnPayslipScreen
      ? ["REPORT_PAYROLL_RESULTS", "PAYSLIPS", "PAYSLIP", "PAYROLL_PAYSLIPS", "PAYROLL_PAYSLIP"]
      : lstPayrollResultAccessModuleHints
  );
  const [objResult, setObjResult] = useState<PayrollResultDetailRecord | null>(null);
  const [objPayslip, setObjPayslip] = useState<PayslipPreviewRecord | null>(null);
  const [strPayslipPreviewHtml, setStrPayslipPreviewHtml] = useState("");
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnPayslipLoading, setBlnPayslipLoading] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const [objActionsAnchor, setObjActionsAnchor] = useState<null | HTMLElement>(null);

  const [strActiveTab, setStrActiveTab] = useState<"earnings-deductions" | "tax-summary">("earnings-deductions");

  useEffect(() => {
    let blnMounted = true;

    async function loadResult() {
      setBlnLoading(true);
      setStrError("");
      try {
        const dicResult = await payrollResultService.getPayrollResultById(strResultID);
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
  }, [strResultID]);

  const strResolvedBackRoute = strBackRoute || (blnPayslipScreen ? "/reports/payslips" : "/payroll/results");
  const blnEssRoute = strResolvedBackRoute.startsWith("/ess/");
  const strTaxInformationHref = (() => {
    const strBasePath = blnPayslipScreen
      ? `/reports/payslips/${strResultID}/tax-information`
      : `/payroll/results/${strResultID}/tax-information`;
    const strCurrentPath = strPathname || strResolvedBackRoute;
    return `${strBasePath}?backRoute=${encodeURIComponent(strCurrentPath)}`;
  })();
  const handleOpenTaxInformation = () => {
    window.open(strTaxInformationHref, "_blank", "noopener,noreferrer");
  };
  const blnCanDownloadPayslips = canDoAny("download") || canDoAny("export");
  const blnCanPrintPayslips = canDoAny("print");
  const blnCanUsePayslipDocumentActions = blnCanDownloadPayslips || blnCanPrintPayslips;

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
      setStrPayslipPreviewHtml(await payslipService.getDownloadHtml(dicPayslip.strPayslipRecordUUID ?? String(dicPayslip.intPayslipID)));
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
        objResult!.strPayrollRunRecordUUID ?? String(objResult!.intPayrollRunID),
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
      const strHtml = await payslipService.getDownloadHtml(dicPayslip.strPayslipRecordUUID ?? String(dicPayslip.intPayslipID));
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
    { key: "earnings-deductions", label: t("earnings_deductions", "Earnings & Deductions"), icon: <RequestQuoteRoundedIcon sx={{ fontSize: 18 }} /> },
    { key: "tax-summary", label: t("tax_summary", "Tax Summary"), icon: <PercentRoundedIcon sx={{ fontSize: 18 }} /> },
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
      <DetailPageHeader
        strSection={blnEssRoute ? t("ess_breadcrumb_section", "Employee Services") : t("breadcrumb_section", "Payroll")}
        strListTitle={blnPayslipScreen ? (blnEssRoute ? t("ess_breadcrumbs", "My Payslips") : t("payslip_breadcrumbs", "Payslips")) : t("payroll_results_breadcrumbs", "Payroll Results")}
        strListHref={strResolvedBackRoute}
        strCurrent={`${objResult.strEmployeeName} (${objResult.strEmployeeCode})`}
        objCurrentAdornment={
          <Chip
            label={translateDynamicLabel(t, objResult.strStatus, "status")}
            size="small"
            sx={{
              background: dicStatusTone.background,
              border: `1px solid ${dicStatusTone.border}`,
              color: dicStatusTone.color,
              fontWeight: 800,
              height: 24,
              minWidth: 78,
            }}
          />
        }
      >
              <Button
                className={masterStyles.secondaryButton}
                onClick={() => objRouter.push(strResolvedBackRoute)}
                startIcon={<ArrowBackRoundedIcon />}
                sx={{ flex: "0 0 auto", height: 38, minHeight: 38 }}
                data-controlid="payroll.result-detail.back.button"
              >
                {t("back_to_list", "Back to List")}
              </Button>
                {blnPayslipScreen && blnCanUsePayslipDocumentActions ? (
                  <>
                  <Button
                    onClick={handleOpenActions}
                    endIcon={<KeyboardArrowDownRoundedIcon />}
                    startIcon={<DownloadRoundedIcon />}
                    disabled={blnPayslipLoading}
                    className={masterStyles.secondaryButton}
                    sx={{ flex: "0 0 auto", height: 38, minHeight: 38 }}
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
      </DetailPageHeader>
      <Box sx={{ maxWidth: "100%", mt: 0.5 }}>
        <Stack spacing={1.25}>
          <Box
            sx={{
              borderRadius: "12px",
              border: "1px solid #DCE4EF",
              background: "#fff",
              px: { xs: 1.25, md: 1.5 },
              py: 1.1,
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
                    width: 44,
                    height: 44,
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    fontSize: "1rem",
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  {getInitials(objResult.strEmployeeName)}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ color: "#0f172a", fontSize: "1.05rem", fontWeight: 900, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {objResult.strEmployeeName}
                  </Typography>
                  <Typography sx={{ color: "#64748b", fontSize: "0.82rem", mt: 0.3, fontWeight: 600 }}>
                    {objResult.strEmployeeCode} {" | "} {objResult.strRunName} {" | "} {formatMonth(objResult.dtPayrollMonth)}
                  </Typography>
                </Box>
              </Stack>

          </Box>

          {strError ? <Alert severity="error">{strError}</Alert> : null}
          {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}
          {blnPayslipLoading ? <Alert severity="info">{t("payslip_loading", "Preparing payslip...")}</Alert> : null}

          <Box
            sx={{
              display: "grid",
              gap: 1.25,
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
              strLabel={t("total_payable_days", "Total Payable Days")}
              strValue={String(objResult.decPayableDays ?? objResult.decPaidDays ?? 0)}
              objIcon={<CalendarMonthRoundedIcon sx={{ fontSize: 25 }} />}
              strIconBg="#fee2d5"
              strIconColor="#c2410c"
            />
          </Box>

          <Box
            sx={{
              borderRadius: "12px",
              border: "1px solid #DCE4EF",
              background: "#fff",
              overflow: "hidden",
            }}
          >
            <Tabs
              value={strActiveTab}
              onChange={(objEvent, strValue) => setStrActiveTab(strValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: "1px solid #DCE4EF", px: { xs: 1, md: 1.5 }, minHeight: 46 }}
              data-controlid="payroll.result-detail.tabs"
            >
              {lstSummaryGuide.map((dicItem) => (
                <Tab
                  key={dicItem.key}
                  value={dicItem.key}
                  label={dicItem.label}
                  icon={dicItem.icon}
                  iconPosition="start"
                  sx={{ minHeight: 46, textTransform: "none", fontWeight: 800, fontSize: "0.82rem" }}
                  data-controlid={`payroll.result-detail.tab.${dicItem.key}.button`}
                />
              ))}
            </Tabs>

            <Box sx={{ p: { xs: 1.1, md: 1.35 } }}>
              {strActiveTab === "earnings-deductions" ? (
                <PayrollResultBreakdown objResult={objResult} />
              ) : null}

              {strActiveTab === "tax-summary" ? (
                <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr)" } }}>
                  <PaginatedSummaryCard
                    strTitle={t("tax_summary", "Tax Summary")}
                    objIcon={<PercentRoundedIcon sx={{ color: "#2563eb", fontSize: 18 }} />}
                    lstItems={lstTaxSummaryItems}
                    strAriaLabel={t("tax_summary", "Tax Summary")}
                    objHeaderAction={
                      <TaxInfoIconButton
                        onOpen={handleOpenTaxInformation}
                        strControlID="payroll.result-detail.tax-summary.tax-information.button"
                        intSize={30}
                        intIconSize={18}
                      />
                    }
                  />
                </Box>
              ) : null}
            </Box>
          </Box>

          {strPayslipPreviewHtml ? (
            <Paper
              sx={{
                borderRadius: "12px",
                border: "1px solid #DCE4EF",
                boxShadow: "none",
                background: "#fff",
                p: { xs: 1.25, md: 1.5 },
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
      </Box>
    </Box>
  );
}
