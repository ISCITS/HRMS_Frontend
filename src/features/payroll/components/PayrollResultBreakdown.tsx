"use client";

import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import RemoveCircleOutlineRoundedIcon from "@mui/icons-material/RemoveCircleOutlineRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import WalletRoundedIcon from "@mui/icons-material/WalletRounded";
import { Box, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import type { PayrollResultDetailRecord, PayrollResultLineRecord } from "@/features/payroll/types";
import { buildPayrollResultBreakdown, sumPayrollAmounts } from "@/features/payroll/utils/payrollResultBreakdown";

const currency = (amount: number) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(amount);

// Compact cells so a card is only as tall as its rows; colours come from the shared app grid tokens.
const objCellSx = {
  py: 0.5,
  px: 1.25,
  borderBottom: "1px solid var(--app-grid-border-color)",
  color: "var(--app-grid-row-color)",
  fontSize: "0.8rem",
  lineHeight: 1.35,
} as const;
const objHeadCellSx = {
  ...objCellSx,
  background: "var(--app-grid-header-background)",
  color: "var(--app-grid-header-color)",
  fontWeight: 700,
  fontSize: "0.74rem",
  py: 0.6,
} as const;

type Section = { key: string; title: string; lines: PayrollResultLineRecord[]; icon: ReactNode };

export default function PayrollResultBreakdown({ objResult }: { objResult: PayrollResultDetailRecord }) {
  const { t } = useModuleLabels("payslips");
  const breakdown = buildPayrollResultBreakdown(objResult.lstLines);
  const earnings: Section = { key: "earnings", title: t("earnings", "Earnings"), lines: breakdown.earnings, icon: <WalletRoundedIcon sx={{ color: "#15803d", fontSize: 18 }} /> };
  const deductions: Section = { key: "deductions", title: t("employee_deductions", "Employee Deductions"), lines: breakdown.deductions, icon: <RemoveCircleOutlineRoundedIcon sx={{ color: "#ea580c", fontSize: 18 }} /> };
  const employee: Section = { key: "employee", title: t("employee_contributions", "Employee Contributions"), lines: breakdown.employeeContributions, icon: <SavingsRoundedIcon sx={{ color: "#2563eb", fontSize: 18 }} /> };
  const employer: Section = { key: "employer", title: t("total_employer_contribution", "Total Employer Contribution"), lines: breakdown.employerContributions, icon: <AccountBalanceRoundedIcon sx={{ color: "#4338ca", fontSize: 18 }} /> };

  const renderSection = (section: Section) => (
    <Box
      key={section.key}
      data-controlid={`payroll.result-detail.breakdown.${section.key}`}
      sx={{ background: "#fff", border: "1px solid #DCE4EF", borderRadius: "10px", overflow: "hidden" }}
    >
      <Typography component="h2" sx={{ alignItems: "center", color: "#0f172a", display: "flex", fontSize: "0.9rem", fontWeight: 800, gap: 0.75, px: 1.25, py: 0.9 }}>
        {section.icon}
        {section.title}
      </Typography>
      <Table size="small" aria-label={section.title}>
        <TableHead><TableRow>
          <TableCell sx={objHeadCellSx}>{t("component", "Component")}</TableCell>
          <TableCell align="right" sx={objHeadCellSx}>{t("amount", "Amount")}</TableCell>
        </TableRow></TableHead>
        <TableBody>
          {section.lines.map(line => <TableRow key={line.intID} hover>
            <TableCell sx={objCellSx}>{line.strComponentName || line.strComponentCode}</TableCell>
            <TableCell align="right" sx={{ ...objCellSx, whiteSpace: "nowrap" }}>{currency(line.decAmount)}</TableCell>
          </TableRow>)}
          {section.lines.length === 0 ? <TableRow><TableCell colSpan={2} sx={{ ...objCellSx, color: "#94a3b8" }}>
            {t("no_components", "No components for this period.")}
          </TableCell></TableRow> : null}
          <TableRow>
            <TableCell sx={{ ...objCellSx, background: "#f8fafc", borderBottom: "none", fontWeight: 800 }}>{t("total", "Total")}</TableCell>
            <TableCell align="right" sx={{ ...objCellSx, background: "#f8fafc", borderBottom: "none", fontWeight: 800, whiteSpace: "nowrap" }}>{currency(sumPayrollAmounts(section.lines))}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Box>
  );

  const netPay = (
    <Box
      key="net-pay"
      data-controlid="payroll.result-detail.breakdown.net-pay"
      sx={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", px: 1.25, py: 1 }}
    >
      <Typography component="h2" sx={{ alignItems: "center", color: "#0f172a", display: "flex", fontSize: "0.9rem", fontWeight: 800, gap: 0.75 }}>
        <PaymentsRoundedIcon sx={{ color: "#15803d", fontSize: 18 }} />
        {t("net_pay", "Net Pay")}
      </Typography>
      <Typography sx={{ mt: 0.25, fontSize: "1.4rem", fontWeight: 900, color: "#15803d", lineHeight: 1.2 }}>
        {currency(objResult.decNetPayAmount)}
      </Typography>
      <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>
        {t("net_pay_breakdown_note", "Net pay after employee deductions and employee contributions.")}
      </Typography>
    </Box>
  );

  // Three columns on wide screens (earnings | deductions + employee contributions | employer + net pay),
  // two on medium, one on phones - each column stacks its cards with a small gap.
  return (
    <Box
      sx={{
        display: "grid",
        gap: 1.25,
        alignItems: "start",
        gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" },
      }}
    >
      <Stack spacing={1.25}>{renderSection(earnings)}</Stack>
      <Stack spacing={1.25}>{renderSection(deductions)}{renderSection(employee)}</Stack>
      <Stack spacing={1.25} sx={{ gridColumn: { md: "1 / -1", xl: "auto" } }}>{renderSection(employer)}{netPay}</Stack>
    </Box>
  );
}
