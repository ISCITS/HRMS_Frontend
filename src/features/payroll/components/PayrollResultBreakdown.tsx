"use client";

import { Fragment } from "react";
import { Box, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import type { PayrollResultDetailRecord, PayrollResultLineRecord } from "@/features/payroll/types";
import { buildPayrollResultBreakdown, sumPayrollAmounts } from "@/features/payroll/utils/payrollResultBreakdown";

const currency = (amount: number) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2,
}).format(amount);

// Fixed small radius: the theme default is very round and clips amounts in the right-hand column.
const objCardSx = { borderRadius: "10px", overflow: "hidden", border: "1px solid #dbe7f3", boxShadow: "none" } as const;
const objCellSx = { py: 0.55, px: 1.5, fontSize: "0.82rem", lineHeight: 1.35, borderColor: "#eef2f7" } as const;

type Group = { key: string; title?: string; lines: PayrollResultLineRecord[] };

function CardTitle({ strTitle, strTotal }: { strTitle: string; strTotal?: string }) {
  return (
    <Box sx={{ alignItems: "center", background: "#f8fafc", borderBottom: "1px solid #e6eef7", display: "flex", justifyContent: "space-between", px: 1.5, py: 0.9 }}>
      <Typography component="h2" sx={{ fontSize: "0.88rem", fontWeight: 800 }}>{strTitle}</Typography>
      {strTotal ? <Typography sx={{ fontSize: "0.88rem", fontWeight: 800 }}>{strTotal}</Typography> : null}
    </Box>
  );
}

export default function PayrollResultBreakdown({ objResult }: { objResult: PayrollResultDetailRecord }) {
  const { t } = useModuleLabels("payslips");
  const breakdown = buildPayrollResultBreakdown(objResult.lstLines);

  // One table per card; a card may hold several labelled groups (deductions + employee contributions).
  const renderCard = (strKey: string, strTitle: string, lstGroups: Group[]) => {
    const decTotal = sumPayrollAmounts(lstGroups.flatMap((dicGroup) => dicGroup.lines));
    const blnEmpty = lstGroups.every((dicGroup) => dicGroup.lines.length === 0);
    return (
      <Paper key={strKey} variant="outlined" sx={objCardSx}>
        <CardTitle strTitle={strTitle} strTotal={currency(decTotal)} />
        <Table size="small" aria-label={strTitle}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...objCellSx, color: "#64748b", fontSize: "0.72rem", fontWeight: 700, py: 0.5 }}>{t("component", "Component")}</TableCell>
              <TableCell align="right" sx={{ ...objCellSx, color: "#64748b", fontSize: "0.72rem", fontWeight: 700, py: 0.5 }}>{t("amount", "Amount")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {blnEmpty ? (
              <TableRow><TableCell colSpan={2} sx={{ ...objCellSx, color: "#94a3b8" }}>{t("no_components", "No components for this period.")}</TableCell></TableRow>
            ) : null}
            {lstGroups.map((dicGroup) => dicGroup.lines.length === 0 ? null : (
              <Fragment key={dicGroup.key}>
                {dicGroup.title ? (
                  <TableRow>
                    <TableCell colSpan={2} sx={{ ...objCellSx, color: "#475569", fontSize: "0.72rem", fontWeight: 800, letterSpacing: 0.3, pt: 0.9, textTransform: "uppercase" }}>
                      {dicGroup.title}
                    </TableCell>
                  </TableRow>
                ) : null}
                {dicGroup.lines.map((line) => (
                  <TableRow key={line.intID}>
                    <TableCell sx={objCellSx}>{line.strComponentName || line.strComponentCode}</TableCell>
                    <TableCell align="right" sx={{ ...objCellSx, whiteSpace: "nowrap" }}>{currency(line.decAmount)}</TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </Paper>
    );
  };

  const netPay = (
    <Paper key="net-pay" variant="outlined" sx={{ ...objCardSx, background: "#f0fdf4", borderColor: "#bbf7d0" }}>
      <Box sx={{ alignItems: "center", display: "flex", gap: 2, justifyContent: "space-between", px: 1.5, py: 1.1 }}>
        <Box>
          <Typography component="h2" sx={{ fontSize: "0.88rem", fontWeight: 800 }}>{t("net_pay", "Net Pay")}</Typography>
          <Typography variant="caption" color="text.secondary">
            {t("net_pay_breakdown_note", "Net pay after employee deductions and employee contributions.")}
          </Typography>
        </Box>
        <Typography sx={{ color: "#15803d", fontSize: "1.45rem", fontWeight: 800, whiteSpace: "nowrap" }}>
          {currency(objResult.decNetPayAmount)}
        </Typography>
      </Box>
    </Paper>
  );

  // Two equal columns that each stack their cards: earnings + employer cost on the left,
  // deductions (incl. employee contributions) + net pay on the right. One column on phones.
  return (
    <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, alignItems: "start" }}>
      <Stack spacing={1.5}>
        {renderCard("earnings", t("earnings", "Earnings"), [{ key: "earnings", lines: breakdown.earnings }])}
        {renderCard("employer", t("total_employer_contribution", "Total Employer Contribution"), [{ key: "employer", lines: breakdown.employerContributions }])}
      </Stack>
      <Stack spacing={1.5}>
        {renderCard("deductions", t("deductions", "Deductions"), [
          { key: "deductions", title: t("employee_deductions", "Employee Deductions"), lines: breakdown.deductions },
          { key: "employee", title: t("employee_contributions", "Employee Contributions"), lines: breakdown.employeeContributions },
        ])}
        {netPay}
      </Stack>
    </Box>
  );
}
