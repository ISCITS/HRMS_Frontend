"use client";

import RequestQuoteRoundedIcon from "@mui/icons-material/RequestQuoteRounded";
import { Box, Chip, Typography } from "@mui/material";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import type { PayrollResultDetailRecord, PayrollResultLineRecord } from "@/features/payroll/types";

// Payslip-style "Result Lines" table used inside the Payroll Run "Review Results" dialog:
// one row per payslip component (plus TDS), followed by the employee's final totals.

type ResultLinesTableProps = {
  objResult: PayrollResultDetailRecord;
  /** When true, drops the "Result Lines" heading (for use inside a dialog). */
  blnFlush?: boolean;
};

type LineKind = "earning" | "deduction" | "employer" | "tax";

function formatCurrency(decValue: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(decValue || 0);
}

function formatDays(objValue: unknown) {
  const fltValue = typeof objValue === "number" ? objValue : Number(objValue);
  if (objValue === null || objValue === undefined || objValue === "" || !Number.isFinite(fltValue)) {
    return null;
  }
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(fltValue);
}

function toLabelKey(strValue: string | null | undefined) {
  return String(strValue ?? "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function asRecord(objValue: unknown): Record<string, unknown> | null {
  if (!objValue || typeof objValue !== "object" || Array.isArray(objValue)) {
    return null;
  }
  return objValue as Record<string, unknown>;
}

function getLineKind(dicLine: PayrollResultLineRecord): LineKind {
  if (dicLine.blnIsTaxLine) return "tax";
  if (dicLine.blnIsEmployerContribution) return "employer";
  if (dicLine.blnIsEmployeeDeduction) return "deduction";
  return "earning";
}

const dicKindChipSx: Record<LineKind, { background: string; border: string; color: string }> = {
  earning: { background: "#ecfdf5", border: "#bbf7d0", color: "#15803d" },
  deduction: { background: "#fff7ed", border: "#fed7aa", color: "#c2410c" },
  employer: { background: "#f1f5f9", border: "#cbd5e1", color: "#334155" },
  tax: { background: "#f5f3ff", border: "#ddd6fe", color: "#6d28d9" },
};

// Paid days the component was prorated on (LWP trace), else the employee's payable days.
// Only earnings are prorated by days; deductions / contributions / tax show "-".
function getLinePayableDays(dicLine: PayrollResultLineRecord, objResult: PayrollResultDetailRecord) {
  if (getLineKind(dicLine) !== "earning") return "-";
  const objLwpTrace = asRecord(dicLine.dicLwpTrace) ?? asRecord(asRecord(dicLine.objCalculationTrace)?.lwp);
  return formatDays(objLwpTrace?.paid_units) ?? formatDays(objResult.decPayableDays ?? objResult.decPaidDays) ?? "-";
}

export default function ResultLinesTable({ objResult, blnFlush = false }: ResultLinesTableProps) {
  const { t } = useModuleLabels("payslips");
  const translate = (strValue: string | null | undefined) => {
    const strKey = toLabelKey(strValue);
    return strKey ? t(strKey, String(strValue)) : "-";
  };
  const dicKindLabel: Record<LineKind, string> = {
    earning: t("type_earning", "Earning"),
    deduction: t("type_deduction", "Deduction"),
    employer: t("type_employer_contribution", "Employer Contribution"),
    tax: t("type_tds", "TDS"),
  };

  // Same rule as the payslip document (PayslipRepository): hide lines flagged out of the payslip, e.g. CTC provisions.
  const lstResultLines = (objResult.lstLines ?? []).filter(
    (dicLine) => Number(dicLine.decAmount ?? 0) > 0 && dicLine.blnIncludeInPayslip !== false
  );
  const decTaxTotal = Number(objResult.decTaxTotal ?? objResult.decTaxAmount ?? 0);
  const blnHasTaxLine = lstResultLines.some((dicLine) => dicLine.blnIsTaxLine);

  const renderKind = (strKind: LineKind) => (
    <Chip
      label={dicKindLabel[strKind]}
      size="small"
      sx={{ background: dicKindChipSx[strKind].background, border: `1px solid ${dicKindChipSx[strKind].border}`, color: dicKindChipSx[strKind].color, fontWeight: 800, height: 22 }}
    />
  );

  const lstRows = lstResultLines.map((dicLine) => {
    const strKind = getLineKind(dicLine);
    const decMonthlySalary = Number(dicLine.decOriginalAmount ?? dicLine.decCalculatedAmount ?? dicLine.decAmount ?? 0);
    return {
      id: String(dicLine.intID),
      strComponentName: translate(dicLine.strComponentName),
      objType: renderKind(strKind),
      strTypeSortValue: dicKindLabel[strKind],
      decMonthlySalary: strKind === "tax" ? "-" : formatCurrency(decMonthlySalary),
      decMonthlySalarySortValue: decMonthlySalary,
      strPayableDays: getLinePayableDays(dicLine, objResult),
      decPayrollAmount: formatCurrency(dicLine.decAmount),
      decPayrollAmountSortValue: Number(dicLine.decAmount ?? 0),
    };
  });
  // TDS is a result-level figure; show it as its own row when no tax line was posted to the payslip lines.
  if (!blnHasTaxLine && decTaxTotal > 0) {
    lstRows.push({
      id: "tds",
      strComponentName: t("tds_income_tax", "TDS (Income Tax)"),
      objType: renderKind("tax"),
      strTypeSortValue: dicKindLabel.tax,
      decMonthlySalary: "-",
      decMonthlySalarySortValue: 0,
      strPayableDays: "-",
      decPayrollAmount: formatCurrency(decTaxTotal),
      decPayrollAmountSortValue: decTaxTotal,
    });
  }

  const lstColumns: CommonTableColumn<(typeof lstRows)[number]>[] = [
    { field: "strComponentName", headerName: t("component_name", "Component Name"), width: 220 },
    { field: "objType", headerName: t("type", "Type"), width: 170, sortAccessor: (dicRow) => dicRow.strTypeSortValue, exportable: false },
    { field: "decMonthlySalary", headerName: t("monthly_salary", "Monthly Salary"), align: "right", width: 150, sortAccessor: (dicRow) => dicRow.decMonthlySalarySortValue },
    { field: "strPayableDays", headerName: t("payable_days", "Payable Days"), align: "right", width: 120 },
    { field: "decPayrollAmount", headerName: t("payroll_amount", "Payroll Amount"), align: "right", width: 150, sortAccessor: (dicRow) => dicRow.decPayrollAmountSortValue },
  ];

  const lstSummaryItems = [
    { strKey: "gross", strLabel: t("gross_earnings", "Gross Earnings"), decValue: objResult.decGrossEarningsAmount ?? objResult.decGrossAmount },
    { strKey: "deductions", strLabel: t("employee_deductions", "Employee Deductions"), decValue: objResult.decEmployeeDeductionTotal ?? objResult.decDeductionAmount },
    { strKey: "tax", strLabel: t("tax", "Tax"), decValue: decTaxTotal },
    { strKey: "net", strLabel: t("net_pay", "Net Pay"), decValue: objResult.decNetPayAmount },
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
        minTableWidth={760}
        defaultPageSize={50}
        emptyMessage={t("line_empty", "No payroll result lines found.")}
        testIdPrefix="payroll.result-lines"
      />
      <Box
        data-controlid="payroll.result-lines.summary"
        sx={{
          border: "1px solid #DCE4EF",
          borderRadius: "10px",
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
          mt: 1.25,
          overflow: "hidden",
        }}
      >
        {lstSummaryItems.map((dicItem) => {
          const blnNet = dicItem.strKey === "net";
          return (
            <Box
              key={dicItem.strKey}
              sx={{
                background: blnNet ? "#f0fdf4" : "#f8fafc",
                borderLeft: { md: "1px solid #DCE4EF" },
                "&:first-of-type": { borderLeft: "none" },
                px: 1.5,
                py: 1,
              }}
            >
              <Typography sx={{ color: "#64748b", fontSize: "0.74rem", fontWeight: 800 }}>{dicItem.strLabel}</Typography>
              <Typography sx={{ color: blnNet ? "#15803d" : "#0f172a", fontSize: blnNet ? "1.05rem" : "0.95rem", fontWeight: 900, mt: 0.25, whiteSpace: "nowrap" }}>
                {formatCurrency(Number(dicItem.decValue ?? 0))}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </>
  );
}
