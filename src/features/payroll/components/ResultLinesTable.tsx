"use client";

import RequestQuoteRoundedIcon from "@mui/icons-material/RequestQuoteRounded";
import { Box, Chip, Paper, Typography } from "@mui/material";

import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import type { PayrollResultLineRecord } from "@/features/payroll/types";

// Shared "Result Lines" (Earnings & Deductions) table. Rendered identically on the
// Payroll Results detail screen and inside the Payroll Run "Review Results" dialog so
// both stay in lockstep - keep any column/logic change in this one place.

type ResultLinesTableProps = {
  lstLines: PayrollResultLineRecord[];
  /** When true, drops the outer Paper card + heading (for use inside a dialog). */
  blnFlush?: boolean;
};

function formatCurrency(decValue: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(decValue || 0);
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

function getLineMonthlyAmount(dicLine: PayrollResultLineRecord) {
  const objTrace = dicLine.objCalculationTrace;
  const objMonthlyValue = getCalculationTraceValue(objTrace, "approved_monthly_amount", "monthly_amount");
  if (typeof objMonthlyValue === "number") {
    return objMonthlyValue;
  }
  return dicLine.decProratedAmount ?? dicLine.decCalculatedAmount ?? dicLine.decAmount;
}

function getPayrollImpactLabel(dicLine: PayrollResultLineRecord) {
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

function getLineLwpSummary(dicLine: PayrollResultLineRecord) {
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

function getTaxableLabel(dicLine: PayrollResultLineRecord) {
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

function getCtcIncludedLabel(dicLine: PayrollResultLineRecord) {
  if (dicLine.blnIsEmployerContribution) {
    return "Yes";
  }
  if (dicLine.blnIsEmployeeDeduction) {
    return "No";
  }
  return dicLine.blnIncludeInGross ? "Yes" : "-";
}

function getLineLwpTrace(dicLine: PayrollResultLineRecord) {
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
  dicLine: PayrollResultLineRecord
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

export default function ResultLinesTable({ lstLines, blnFlush = false }: ResultLinesTableProps) {
  const { t } = useModuleLabels("payslips");
  const lstResultLines = (lstLines ?? []).filter((dicLine) => hasDisplayAmount(dicLine.decAmount));

  const objInner = (
    <>
      {blnFlush ? null : (
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", lg: "row" },
            alignItems: { xs: "stretch", lg: "center" },
            justifyContent: "space-between",
            gap: 1.5,
            pb: 1.3,
            mb: 1.2,
            borderBottom: "1px solid #dbe7f3",
          }}
        >
          <Typography sx={{ display: "flex", alignItems: "center", gap: 1, color: "#0f172a", fontSize: "1.05rem", fontWeight: 900 }}>
            <RequestQuoteRoundedIcon sx={{ color: "#2563eb", fontSize: 22 }} />
            {t("line_items", "Result Lines")}
          </Typography>
        </Box>
      )}

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
                      ) : (
                        getLwpExplanation(t, dicLine)
                      )}
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
          {formatLabelTemplate(t("showing_results", "Showing {from} to {to} of {total} results"), {
            from: lstResultLines.length ? 1 : 0,
            to: lstResultLines.length,
            total: lstResultLines.length,
          })}
        </Typography>
      </Box>
    </>
  );

  if (blnFlush) {
    return objInner;
  }

  return (
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
      {objInner}
    </Paper>
  );
}
