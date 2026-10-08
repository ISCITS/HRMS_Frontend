"use client";

import { Box, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import type { PayrollResultDetailRecord } from "@/features/payroll/types";
import { buildPayrollResultBreakdown, sumPayrollAmounts } from "@/features/payroll/utils/payrollResultBreakdown";

const currency = (amount: number) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2,
}).format(amount);

export default function PayrollResultBreakdown({ objResult }: { objResult: PayrollResultDetailRecord }) {
  const { t } = useModuleLabels("payslips");
  const breakdown = buildPayrollResultBreakdown(objResult.lstLines);
  const sections = [
    { key: "deductions", title: t("employee_deductions", "Employee Deductions"), lines: breakdown.deductions },
    { key: "employee", title: t("employee_contributions", "Employee Contributions"), lines: breakdown.employeeContributions },
    { key: "employer", title: t("total_employer_contribution", "Total Employer Contribution"), lines: breakdown.employerContributions },
  ];

  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
      {sections.map(section => (
        <Paper key={section.key} variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          <Typography component="h2" sx={{ p: 2, fontWeight: 800 }}>{section.title}</Typography>
          <Table size="small" aria-label={section.title}>
            <TableHead><TableRow>
              <TableCell>{t("component", "Component")}</TableCell>
              <TableCell align="right">{t("amount", "Amount")}</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {section.lines.map(line => <TableRow key={line.intID}>
                <TableCell>{line.strComponentName || line.strComponentCode}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{currency(line.decAmount)}</TableCell>
              </TableRow>)}
              {section.lines.length === 0 ? <TableRow><TableCell colSpan={2}>
                {t("no_components", "No components for this period.")}
              </TableCell></TableRow> : null}
              <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                <TableCell sx={{ fontWeight: 800 }}>{t("total", "Total")}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>{currency(sumPayrollAmounts(section.lines))}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Paper>
      ))}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography component="h2" sx={{ fontWeight: 800 }}>{t("net_pay", "Net Pay")}</Typography>
        <Typography sx={{ my: 2, fontSize: "1.75rem", fontWeight: 800, color: "#15803d" }}>
          {currency(objResult.decNetPayAmount)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("net_pay_breakdown_note", "Net pay after employee deductions and employee contributions.")}
        </Typography>
      </Paper>
    </Box>
  );
}
