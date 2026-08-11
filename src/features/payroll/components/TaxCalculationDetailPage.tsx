"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PercentRoundedIcon from "@mui/icons-material/PercentRounded";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { payrollResultService } from "@/features/payroll/services/payrollResultService";
import type {
  TaxCalculationDetailRecord,
  TaxDeclarationItemRecord,
} from "@/features/payroll/types";

type Props = {
  intResultID: number;
  blnPayslipScreen?: boolean;
  strBackRoute?: string;
};

const DECLARATION_LABELS: Record<string, string> = {
  HRA: "House Rent Allowance (HRA)",
  LTA: "Leave Travel Allowance (LTA)",
  LEAVE_TRAVEL_ALLOWANCE: "Leave Travel Allowance (LTA)",
  "80C": "Section 80C - Investments",
  "80CCD": "Section 80CCD - NPS Contribution",
  "80CCD(1B)": "Section 80CCD(1B) - Additional NPS",
  "80D": "Section 80D - Medical Insurance Premium",
  "80E": "Section 80E - Education Loan Interest",
  "80G": "Section 80G - Donations",
  "80TTA": "Section 80TTA - Savings Account Interest",
  NPS: "National Pension System (NPS)",
  PF: "Provident Fund (PF)",
  PPF: "Public Provident Fund (PPF)",
  ELSS: "Equity Linked Savings Scheme (ELSS)",
  NSC: "National Savings Certificate (NSC)",
};

function formatCurrency(decValue: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(decValue || 0);
}

function formatPercent(decValue: number | null | undefined) {
  if (decValue === null || decValue === undefined) return "-";
  return `${Number(decValue).toFixed(2)}%`;
}

function getDeclarationLabel(objItem: TaxDeclarationItemRecord) {
  const strKey = (objItem.strSectionCode || objItem.strCategoryCode || "").trim().toUpperCase();
  return DECLARATION_LABELS[strKey] || strKey || "Declared Item";
}

function formatSlabRange(decFrom: number, decTo: number | null) {
  if (decTo === null || decTo === undefined) {
    return `Above ${formatCurrency(decFrom)}`;
  }
  return `${formatCurrency(decFrom)} - ${formatCurrency(decTo)}`;
}

function formatRuleLabel(strKey: string) {
  return strKey
    .replace(/^str|^int|^dec|^bln|^dt|^flt/, "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/\b\w/g, (strChar) => strChar.toUpperCase());
}

function formatRuleValue(strKey: string, objValue: unknown) {
  if (objValue === null || objValue === undefined || objValue === "") return "-";
  if (typeof objValue === "boolean") return objValue ? "Yes" : "No";
  if (typeof objValue === "number") {
    const strLowerKey = strKey.toLowerCase();
    if (strLowerKey.includes("percent")) return formatPercent(objValue);
    if (strLowerKey.includes("amount") || strLowerKey.includes("income")) return formatCurrency(objValue);
    return String(objValue);
  }
  return String(objValue);
}

function FormulaLine({ strFormula }: { strFormula: string }) {
  return (
    <Typography
      sx={{
        mt: 1.2,
        px: 1.2,
        py: 0.9,
        borderRadius: "8px",
        backgroundColor: "#f8fafc",
        border: "1px dashed #cbd5e1",
        color: "#334155",
        fontSize: "0.8rem",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        overflowWrap: "anywhere",
      }}
    >
      {strFormula}
    </Typography>
  );
}

function RuleDetailsBox({ strTitle, dicRule }: { strTitle: string; dicRule: Record<string, unknown> | null | undefined }) {
  if (!dicRule) return null;
  const lstEntries = Object.entries(dicRule).filter(
    ([strKey, objValue]) => objValue !== null && objValue !== undefined && objValue !== "" && !strKey.toLowerCase().includes("id")
  );
  if (!lstEntries.length) return null;
  return (
    <Box sx={{ mt: 1.2, p: 1.2, borderRadius: "8px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
      <Typography sx={{ fontWeight: 800, color: "#334155", fontSize: "0.76rem", mb: 0.8 }}>{strTitle}</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 0.7 }}>
        {lstEntries.map(([strKey, objValue]) => (
          <Box key={strKey} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
            <Typography sx={{ color: "#64748b", fontSize: "0.72rem" }}>{formatRuleLabel(strKey)}</Typography>
            <Typography sx={{ color: "#0f172a", fontSize: "0.72rem", fontWeight: 700, textAlign: "right" }}>{formatRuleValue(strKey, objValue)}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function SummaryMetric({ strLabel, strValue, objIcon }: { strLabel: string; strValue: string; objIcon: ReactNode }) {
  return (
    <Paper sx={{ p: 1.2, borderRadius: "8px", border: "1px solid #dbe3ef", boxShadow: "0 3px 10px rgba(15,23,42,0.04)", backgroundColor: "#ffffff" }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Stack sx={{ width: 34, height: 34, borderRadius: "8px", backgroundColor: "#f3e8ff", color: "#6d28d9" }} alignItems="center" justifyContent="center">
          {objIcon}
        </Stack>
        <Stack>
          <Typography sx={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 700 }}>{strLabel}</Typography>
          <Typography sx={{ fontSize: "0.98rem", color: "#0f172a", fontWeight: 800 }}>{strValue}</Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}

function SectionCard({ strTitle, objIcon, children, strSubtitle }: { strTitle: string; objIcon: ReactNode; children: ReactNode; strSubtitle?: string }) {
  return (
    <Paper sx={{ borderRadius: "12px", border: "1px solid #dbe7f3", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)", background: "#fff", p: { xs: 1.5, md: 1.8 } }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ pb: 1.2, borderBottom: "1px solid #e6eef7", mb: 1.2 }}>
        {objIcon}
        <Box>
          <Typography component="h2" sx={{ color: "#0f172a", fontSize: "1.02rem", fontWeight: 900 }}>{strTitle}</Typography>
          {strSubtitle ? <Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>{strSubtitle}</Typography> : null}
        </Box>
      </Stack>
      {children}
    </Paper>
  );
}

function DeclarationItemsTable({ lstItems, decTotal, strTotalLabel }: { lstItems: TaxDeclarationItemRecord[]; decTotal: number; strTotalLabel: string }) {
  if (!lstItems.length) {
    return (
      <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>
        No approved declaration items in this category. Total shown below reflects the policy-computed amount.
      </Typography>
    );
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 800, color: "#475569" }}>Item</TableCell>
          <TableCell align="right" sx={{ fontWeight: 800, color: "#475569" }}>Declared</TableCell>
          <TableCell align="right" sx={{ fontWeight: 800, color: "#475569" }}>Approved</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {lstItems.map((objItem, intIndex) => (
          <TableRow key={`${objItem.strSectionCode || objItem.strCategoryCode}-${intIndex}`}>
            <TableCell>{getDeclarationLabel(objItem)}</TableCell>
            <TableCell align="right">{formatCurrency(objItem.decDeclaredAmount)}</TableCell>
            <TableCell align="right">{formatCurrency(objItem.decApprovedAmount)}</TableCell>
          </TableRow>
        ))}
        <TableRow>
          <TableCell sx={{ fontWeight: 900 }}>{strTotalLabel}</TableCell>
          <TableCell />
          <TableCell align="right" sx={{ fontWeight: 900 }}>{formatCurrency(decTotal)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

export default function TaxCalculationDetailPage({ intResultID, blnPayslipScreen = false, strBackRoute }: Props) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("payslips");
  const [objDetail, setObjDetail] = useState<TaxCalculationDetailRecord | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");

  useEffect(() => {
    let blnCancelled = false;
    async function loadData() {
      setBlnLoading(true);
      setStrError("");
      try {
        const objResult = await payrollResultService.getTaxCalculationDetails(intResultID);
        if (!blnCancelled) setObjDetail(objResult);
      } catch (objErr) {
        if (!blnCancelled) {
          setStrError(objErr instanceof Error ? objErr.message : "Unable to load tax calculation details.");
        }
      } finally {
        if (!blnCancelled) setBlnLoading(false);
      }
    }
    void loadData();
    return () => {
      blnCancelled = true;
    };
  }, [intResultID]);

  const strResolvedBackRoute =
    strBackRoute || (blnPayslipScreen ? `/reports/payslips/${intResultID}` : `/payroll/results/${intResultID}`);

  if (blnLoading) return <BlockingLoader blnOpen strLabel="Loading tax calculation details..." />;

  if (strError || !objDetail) {
    return (
      <Stack spacing={1.4}>
        <Alert severity="error">{strError || "Tax calculation details not found."}</Alert>
        <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push(strResolvedBackRoute)} sx={{ alignSelf: "flex-start" }}>
          {t("back", "Back")}
        </Button>
      </Stack>
    );
  }

  const blnHasSurcharge = (objDetail.dicSurcharge.decAmount || 0) > 0 || Boolean(objDetail.dicSurcharge.dicRule);

  return (
    <Stack spacing={1.4}>
      <Paper sx={{ p: 1.35, borderRadius: "8px", border: "1px solid #ddd6fe", backgroundColor: "#f5f3ff", boxShadow: "0 3px 10px rgba(15,23,42,0.04)" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} alignItems={{ xs: "flex-start", md: "center" }}>
          <Stack spacing={0.35}>
            <Typography sx={{ fontWeight: 900, color: "#0f172a", fontSize: "1.08rem" }}>
              Tax Information - {objDetail.strEmployeeName} ({objDetail.strEmployeeCode})
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                Financial Year: {objDetail.strFinancialYearCode || "-"}
              </Typography>
              <Chip
                size="small"
                label={`${objDetail.strRegimeUsed || "-"} Regime`}
                sx={{ backgroundColor: "#ede9fe", color: "#6d28d9", fontWeight: 800 }}
              />
            </Stack>
          </Stack>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => objRouter.push(strResolvedBackRoute)}
            data-controlid="payroll.tax-information.back.button"
          >
            {t("back", "Back")}
          </Button>
        </Stack>
      </Paper>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }, gap: 1.1 }}>
        <SummaryMetric strLabel="Gross Taxable Income (YTD)" strValue={formatCurrency(objDetail.decGrossTaxableIncomeYtd)} objIcon={<ReceiptLongOutlinedIcon fontSize="small" />} />
        <SummaryMetric strLabel="Projected Taxable Income" strValue={formatCurrency(objDetail.decProjectedTaxableIncome)} objIcon={<AccountBalanceWalletOutlinedIcon fontSize="small" />} />
        <SummaryMetric strLabel="Net Taxable Income" strValue={formatCurrency(objDetail.decNetTaxableIncome)} objIcon={<PercentRoundedIcon fontSize="small" />} />
        <SummaryMetric strLabel="Total Tax Liability" strValue={formatCurrency(objDetail.decTotalTaxLiability)} objIcon={<PaymentsOutlinedIcon fontSize="small" />} />
      </Box>

      <SectionCard strTitle="Exemptions" objIcon={<ReceiptLongOutlinedIcon sx={{ color: "#2563eb" }} />} strSubtitle="Income excluded from tax based on your approved declarations (e.g. HRA, LTA).">
        <DeclarationItemsTable lstItems={objDetail.dicExemptions.lstItems} decTotal={objDetail.dicExemptions.decTotalAmount} strTotalLabel="Total Exemptions" />
      </SectionCard>

      <SectionCard strTitle="Deductions" objIcon={<AccountBalanceWalletOutlinedIcon sx={{ color: "#0f766e" }} />} strSubtitle="Amounts reduced from taxable income under Chapter VI-A and the standard deduction.">
        <DeclarationItemsTable lstItems={objDetail.dicDeductions.lstItems} decTotal={objDetail.dicDeductions.decDeclaredTotalAmount} strTotalLabel="Total Declared Deductions" />
        <Box sx={{ mt: 1.5, pt: 1.2, borderTop: "1px dashed #e2e8f0", display: "flex", justifyContent: "space-between" }}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>Standard Deduction</Typography>
          <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{formatCurrency(objDetail.dicDeductions.decStandardDeductionAmount)}</Typography>
        </Box>
        <RuleDetailsBox strTitle="Standard Deduction Rule Applied" dicRule={objDetail.dicDeductions.dicStandardDeductionRule} />
        <FormulaLine
          strFormula={`Net Taxable Income = Projected Taxable Income (${formatCurrency(objDetail.decProjectedTaxableIncome)}) - Exemptions (${formatCurrency(objDetail.dicExemptions.decTotalAmount)}) - Declared Deductions (${formatCurrency(objDetail.dicDeductions.decDeclaredTotalAmount)}) - Standard Deduction (${formatCurrency(objDetail.dicDeductions.decStandardDeductionAmount)}) = ${formatCurrency(objDetail.decNetTaxableIncome)}`}
        />
      </SectionCard>

      <SectionCard strTitle="Slab-wise Tax Calculation" objIcon={<PercentRoundedIcon sx={{ color: "#6d28d9" }} />} strSubtitle={`Applicable regime: ${objDetail.strRegimeUsed || "-"} (${objDetail.strRegimeTypeCode || "-"}) | Applied on Net Taxable Income`}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, color: "#475569" }}>Income Slab</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: "#475569" }}>Rate</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: "#475569" }}>Taxable Amount</TableCell>
              <TableCell sx={{ fontWeight: 800, color: "#475569" }}>Calculation</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: "#475569" }}>Tax</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {objDetail.lstSlabTrace.map((objSlab, intIndex) => (
              <TableRow key={`slab-${intIndex}`}>
                <TableCell>{formatSlabRange(objSlab.from_amount, objSlab.to_amount)}</TableCell>
                <TableCell align="right">{formatPercent(objSlab.rate_percent)}</TableCell>
                <TableCell align="right">{formatCurrency(objSlab.taxable_amount)}</TableCell>
                <TableCell sx={{ color: "#64748b", fontSize: "0.76rem", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                  {formatCurrency(objSlab.taxable_amount)} x {formatPercent(objSlab.rate_percent)}
                </TableCell>
                <TableCell align="right">{formatCurrency(objSlab.tax_amount)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={4} sx={{ fontWeight: 900 }}>Tax Before Rebate</TableCell>
              <TableCell align="right" sx={{ fontWeight: 900 }}>{formatCurrency(objDetail.decTaxBeforeRebate)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <FormulaLine
          strFormula={`Tax Before Rebate = ${objDetail.lstSlabTrace.map((objSlab) => formatCurrency(objSlab.tax_amount)).join(" + ")} = ${formatCurrency(objDetail.decTaxBeforeRebate)}`}
        />
      </SectionCard>

      <SectionCard strTitle="Rebate & Marginal Relief" objIcon={<PaymentsOutlinedIcon sx={{ color: "#16a34a" }} />} strSubtitle="Relief applied under the applicable rebate rule (e.g. Section 87A).">
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
          <Typography sx={{ color: "#0f172a" }}>Rebate Amount</Typography>
          <Typography sx={{ fontWeight: 800 }}>{formatCurrency(objDetail.dicRebate.decAmount)}</Typography>
        </Stack>
        {objDetail.dicRebate.decMarginalReliefAmount ? (
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} sx={{ mt: 0.6 }}>
            <Typography sx={{ color: "#0f172a" }}>Marginal Relief</Typography>
            <Typography sx={{ fontWeight: 800 }}>{formatCurrency(objDetail.dicRebate.decMarginalReliefAmount)}</Typography>
          </Stack>
        ) : null}
        <Box sx={{ mt: 1.2, pt: 1.2, borderTop: "1px dashed #e2e8f0", display: "flex", justifyContent: "space-between" }}>
          <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>Tax After Rebate</Typography>
          <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>{formatCurrency(objDetail.decTaxAfterRebate)}</Typography>
        </Box>
        <RuleDetailsBox strTitle="Rebate Rule Applied" dicRule={objDetail.dicRebate.dicRule} />
        <FormulaLine
          strFormula={`Tax After Rebate = Tax Before Rebate (${formatCurrency(objDetail.decTaxBeforeRebate)}) - Rebate (${formatCurrency(objDetail.dicRebate.decAmount)}) - Marginal Relief (${formatCurrency(objDetail.dicRebate.decMarginalReliefAmount)}) = ${formatCurrency(objDetail.decTaxAfterRebate)}`}
        />
      </SectionCard>

      {blnHasSurcharge ? (
        <SectionCard strTitle="Surcharge" objIcon={<PercentRoundedIcon sx={{ color: "#dc2626" }} />} strSubtitle="Additional charge on tax for income above the applicable threshold.">
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
            <Typography sx={{ color: "#0f172a" }}>Surcharge Amount</Typography>
            <Typography sx={{ fontWeight: 800 }}>{formatCurrency(objDetail.dicSurcharge.decAmount)}</Typography>
          </Stack>
          {objDetail.dicSurcharge.decMarginalReliefAmount ? (
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} sx={{ mt: 0.6 }}>
              <Typography sx={{ color: "#0f172a" }}>Marginal Relief</Typography>
              <Typography sx={{ fontWeight: 800 }}>{formatCurrency(objDetail.dicSurcharge.decMarginalReliefAmount)}</Typography>
            </Stack>
          ) : null}
          <Box sx={{ mt: 1.2, pt: 1.2, borderTop: "1px dashed #e2e8f0", display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>Tax After Surcharge</Typography>
            <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>{formatCurrency(objDetail.decTaxAfterSurcharge)}</Typography>
          </Box>
          <RuleDetailsBox strTitle="Surcharge Rule Applied" dicRule={objDetail.dicSurcharge.dicRule} />
          <FormulaLine
            strFormula={`Tax After Surcharge = Tax After Rebate (${formatCurrency(objDetail.decTaxAfterRebate)}) + Surcharge (${formatCurrency(objDetail.dicSurcharge.decAmount)}) - Marginal Relief (${formatCurrency(objDetail.dicSurcharge.decMarginalReliefAmount)}) = ${formatCurrency(objDetail.decTaxAfterSurcharge)}`}
          />
        </SectionCard>
      ) : null}

      <SectionCard strTitle="Health & Education Cess" objIcon={<PercentRoundedIcon sx={{ color: "#0891b2" }} />}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, color: "#475569" }}>Basis</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: "#475569" }}>Base Amount</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: "#475569" }}>Rate</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: "#475569" }}>Cess</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {objDetail.dicCess.lstRules.map((objRule, intIndex) => (
              <TableRow key={`cess-${intIndex}`}>
                <TableCell>{objRule.strCalculationBaseCode || "Cess"}</TableCell>
                <TableCell align="right">{formatCurrency(objRule.decBaseAmount)}</TableCell>
                <TableCell align="right">{formatPercent(objRule.fltCessRatePercent)}</TableCell>
                <TableCell align="right">{formatCurrency(objRule.decCessAmount)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={3} sx={{ fontWeight: 900 }}>Total Cess</TableCell>
              <TableCell align="right" sx={{ fontWeight: 900 }}>{formatCurrency(objDetail.dicCess.decTotalAmount)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {objDetail.dicCess.lstRules.map((objRule, intIndex) => (
          <FormulaLine
            key={`cess-formula-${intIndex}`}
            strFormula={`Cess (${objRule.strCalculationBaseCode || "Cess"}) = ${formatCurrency(objRule.decBaseAmount)} x ${formatPercent(objRule.fltCessRatePercent)} = ${formatCurrency(objRule.decCessAmount)}`}
          />
        ))}
      </SectionCard>

      <Paper sx={{ borderRadius: "12px", border: "1px solid #bbf7d0", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)", background: "#f0fdf4", p: { xs: 1.5, md: 1.8 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1}>
          <Typography sx={{ fontWeight: 900, color: "#166534", fontSize: "1.1rem" }}>Total Annual Tax Liability</Typography>
          <Typography sx={{ fontWeight: 900, color: "#166534", fontSize: "1.3rem" }}>{formatCurrency(objDetail.decTotalTaxLiability)}</Typography>
        </Stack>
        <FormulaLine
          strFormula={`Total Tax Liability = Tax After ${blnHasSurcharge ? "Surcharge" : "Rebate"} (${formatCurrency(blnHasSurcharge ? objDetail.decTaxAfterSurcharge : objDetail.decTaxAfterRebate)}) + Total Cess (${formatCurrency(objDetail.dicCess.decTotalAmount)}) = ${formatCurrency(objDetail.decTotalTaxLiability)}`}
        />
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1} sx={{ mt: 1.5, pt: 1.5, borderTop: "1px dashed #bbf7d0" }}>
          <Typography sx={{ color: "#166534" }}>Monthly TDS{objDetail.intRemainingMonths ? ` (over ${objDetail.intRemainingMonths} remaining months)` : ""}</Typography>
          <Typography sx={{ fontWeight: 800, color: "#166534" }}>{formatCurrency(objDetail.decMonthlyTds)}</Typography>
        </Stack>
        <FormulaLine
          strFormula={`Monthly TDS = (Total Tax Liability (${formatCurrency(objDetail.decTotalTaxLiability)}) - Tax Already Deducted YTD (${formatCurrency(objDetail.decTaxDeductedYtd)})) / Remaining Months (${objDetail.intRemainingMonths ?? "-"}) = ${formatCurrency(objDetail.decMonthlyTds)}`}
        />
        <Typography sx={{ mt: 1.5, color: "#4d7c0f", fontSize: "0.72rem" }}>
          Slab Profile: {objDetail.strSlabProfileCode || "-"} | Tax Rule Version: {objDetail.strTaxRuleVersion || "-"}
        </Typography>
      </Paper>
    </Stack>
  );
}
