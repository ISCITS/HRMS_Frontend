"use client";

import { Box, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import type { PayrollResultDetailRecord, PayrollResultLineRecord } from "@/features/payroll/types";
import { buildPayrollResultBreakdown, sumPayrollAmounts } from "@/features/payroll/utils/payrollResultBreakdown";

const currency = (amount: number) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2,
}).format(amount);

// Compact cells so a card is only as tall as its rows.
const objCellSx = { py: 0.5, px: 1.25, fontSize: "0.8rem", lineHeight: 1.35 } as const;
const objHeadCellSx = { ...objCellSx, color: "#64748b", fontWeight: 700, fontSize: "0.74rem", py: 0.6 } as const;

type Section = { key: string; title: string; lines: PayrollResultLineRecord[] };

export default function PayrollResultBreakdown({ objResult }: { objResult: PayrollResultDetailRecord }) {
  const { t } = useModuleLabels("payslips");
  const breakdown = buildPayrollResultBreakdown(objResult.lstLines);
  const earnings: Section = { key: "earnings", title: t("earnings", "Earnings"), lines: breakdown.earnings };
  const deductions: Section = { key: "deductions", title: t("employee_deductions", "Employee Deductions"), lines: breakdown.deductions };
  const employee: Section = { key: "employee", title: t("employee_contributions", "Employee Contributions"), lines: breakdown.employeeContributions };
  const employer: Section = { key: "employer", title: t("total_employer_contribution", "Total Employer Contribution"), lines: breakdown.employerContributions };

  const renderSection = (section: Section) => (
    <Paper key={section.key} variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
      <Typography component="h2" sx={{ px: 1.25, pt: 1, pb: 0.5, fontSize: "0.9rem", fontWeight: 800 }}>{section.title}</Typography>
      <Table size="small" aria-label={section.title}>
        <TableHead><TableRow>
          <TableCell sx={objHeadCellSx}>{t("component", "Component")}</TableCell>
          <TableCell align="right" sx={objHeadCellSx}>{t("amount", "Amount")}</TableCell>
        </TableRow></TableHead>
        <TableBody>
          {section.lines.map(line => <TableRow key={line.intID}>
            <TableCell sx={objCellSx}>{line.strComponentName || line.strComponentCode}</TableCell>
            <TableCell align="right" sx={{ ...objCellSx, whiteSpace: "nowrap" }}>{currency(line.decAmount)}</TableCell>
          </TableRow>)}
          {section.lines.length === 0 ? <TableRow><TableCell colSpan={2} sx={{ ...objCellSx, color: "#94a3b8" }}>
            {t("no_components", "No components for this period.")}
          </TableCell></TableRow> : null}
          <TableRow sx={{ backgroundColor: "#f8fafc" }}>
            <TableCell sx={{ ...objCellSx, fontWeight: 800 }}>{t("total", "Total")}</TableCell>
            <TableCell align="right" sx={{ ...objCellSx, fontWeight: 800 }}>{currency(sumPayrollAmounts(section.lines))}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Paper>
  );

  const netPay = (
    <Paper key="net-pay" variant="outlined" sx={{ px: 1.25, py: 1, borderRadius: 2 }}>
      <Typography component="h2" sx={{ fontSize: "0.9rem", fontWeight: 800 }}>{t("net_pay", "Net Pay")}</Typography>
      <Typography sx={{ mt: 0.25, fontSize: "1.5rem", fontWeight: 800, color: "#15803d", lineHeight: 1.2 }}>
        {currency(objResult.decNetPayAmount)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {t("net_pay_breakdown_note", "Net pay after employee deductions and employee contributions.")}
      </Typography>
    </Paper>
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
