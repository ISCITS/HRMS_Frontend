"use client";

import RequestQuoteRoundedIcon from "@mui/icons-material/RequestQuoteRounded";
import { Typography } from "@mui/material";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import type { PayrollResultLineRecord } from "@/features/payroll/types";

// Shared "Result Lines" (Earnings & Deductions) table. Rendered identically on the
// Payroll Results detail screen and inside the Payroll Run "Review Results" dialog so
// both stay in lockstep - keep any column/logic change in this one place.

type ResultLinesTableProps = {
  lstLines: PayrollResultLineRecord[];
  /** When true, drops the "Result Lines" heading (for use inside a dialog). */
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
  // Same rule as the payslip document (PayslipRepository): hide lines flagged out of the payslip, e.g. CTC provisions.
  const lstResultLines = (lstLines ?? []).filter(
    (dicLine) => hasDisplayAmount(dicLine.decAmount) && dicLine.blnIncludeInPayslip !== false
  );

  const lstRows = lstResultLines.map((dicLine) => {
    const objLwpSummary = getLineLwpSummary(dicLine);
    const decMonthlyAmount = getLineMonthlyAmount(dicLine) ?? 0;
    return {
      id: dicLine.intID,
      strComponentName: translateDynamicLabel(t, dicLine.strComponentName),
      decAmount: formatCurrency(dicLine.decAmount),
      decAmountSortValue: Number(dicLine.decAmount ?? 0),
      decMonthlyAmount: formatCurrency(decMonthlyAmount),
      decMonthlyAmountSortValue: Number(decMonthlyAmount),
      strPayrollImpact: translateDynamicLabel(t, getPayrollImpactLabel(dicLine)),
      strCalculationSource: translateDynamicLabel(t, dicLine.strCalculationSource || dicLine.strSourceType),
      strTaxable: translateDynamicLabel(t, getTaxableLabel(dicLine)),
      strCtcIncluded: translateDynamicLabel(t, getCtcIncludedLabel(dicLine)),
      strPayslipSection: translateDynamicLabel(t, dicLine.strPayslipSection),
      objLwpAudit: objLwpSummary ? (
        <span data-controlid="payroll.result-detail.line.lwp-summary" title={objLwpSummary.strOutcome ?? ""}>
          {translateDynamicLabel(t, objLwpSummary.strTreatment, "lwp_treatment")}
          {objLwpSummary.decReducedAmount > 0 ? ` (-${formatCurrency(objLwpSummary.decReducedAmount)})` : ""}
        </span>
      ) : (
        getLwpExplanation(t, dicLine)
      ),
      strRemarks: dicLine.strRemarks || "-",
    };
  });

  const lstColumns: CommonTableColumn<(typeof lstRows)[number]>[] = [
    { field: "strComponentName", headerName: t("component_name", "Component Name"), width: 200 },
    { field: "decAmount", headerName: t("amount", "Amount"), align: "right", width: 120, sortAccessor: (dicRow) => dicRow.decAmountSortValue },
    { field: "decMonthlyAmount", headerName: t("monthly_amount", "Monthly Amount"), align: "right", width: 140, sortAccessor: (dicRow) => dicRow.decMonthlyAmountSortValue },
    { field: "strPayrollImpact", headerName: t("payroll_impact", "Payroll Impact"), width: 150 },
    { field: "strCalculationSource", headerName: t("calculation_source", "Calculation Source"), width: 150 },
    { field: "strTaxable", headerName: t("taxable", "Taxable"), width: 90 },
    { field: "strCtcIncluded", headerName: t("ctc_included", "CTC Included"), width: 110 },
    { field: "strPayslipSection", headerName: t("payslip_section", "Payslip Section"), width: 170 },
    { field: "objLwpAudit", headerName: t("lwp_audit", "LWP Audit"), width: 150, exportable: false },
    { field: "strRemarks", headerName: t("remarks", "Remarks"), width: 240 },
  ];

  return (
    <>
      {blnFlush ? null : (
        <Typography sx={{ display: "flex", alignItems: "center", gap: 1, color: "#0f172a", fontSize: "1.05rem", fontWeight: 900, mb: 1.2 }}>
          <RequestQuoteRoundedIcon sx={{ color: "#2563eb", fontSize: 22 }} />
          {t("line_items", "Result Lines")}
        </Typography>
      )}
      <CommonTable
        columns={lstColumns}
        rows={lstRows}
        rowIdField="id"
        withPaper={false}
        hideToolbar
        hideRowClickHint
        minTableWidth={1180}
        defaultPageSize={20}
        showPaginationSummary
        emptyMessage={t("line_empty", "No payroll result lines found.")}
        testIdPrefix="payroll.result-lines"
      />
    </>
  );
}
