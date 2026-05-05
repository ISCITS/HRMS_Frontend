"use client";

import { Box, Stack, Typography } from "@mui/material";

import styles from "@/features/payroll/components/PayrollScreen.module.css";
import type { PayslipLineRecord, PayslipPreviewRecord } from "@/features/payroll/types";

type PayslipPreviewContentProps = {
  objPayslip: PayslipPreviewRecord;
};

function formatCurrency(decValue: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(decValue || 0);
}

function formatDate(strDate: string | null) {
  if (!strDate) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(strDate));
}

function DetailRow({
  strLabel,
  strValue,
}: {
  strLabel: string;
  strValue: string | null | undefined;
}) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 1 }}>
      <Typography sx={{ color: "#64748b", fontSize: "0.84rem" }}>{strLabel}</Typography>
      <Typography sx={{ color: "#172033", fontSize: "0.84rem", fontWeight: 600 }}>
        {strValue || "-"}
      </Typography>
    </Box>
  );
}

function LineTable({
  strTitle,
  lstLines,
}: {
  strTitle: string;
  lstLines: PayslipLineRecord[];
}) {
  return (
    <Box sx={{ border: "1px solid #d9e6ef", background: "#fff", p: 2 }}>
      <Typography sx={{ color: "#173b63", fontWeight: 800, mb: 1.5 }}>
        {strTitle}
      </Typography>
      <Box className={styles.tableWrap}>
        <table className={styles.table} style={{ minWidth: 420 }}>
          <thead>
            <tr>
              <th>Component</th>
              <th style={{ textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lstLines.length ? (
              lstLines.map((dicLine, intIndex) => (
                <tr key={`${dicLine.strGroupCode}-${dicLine.strLineCode ?? dicLine.strLineLabel}-${intIndex}`}>
                  <td>{dicLine.strLineLabel}</td>
                  <td style={{ textAlign: "right" }}>{formatCurrency(dicLine.decAmount)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className={styles.emptyState}>
                  No lines
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Box>
    </Box>
  );
}

export default function PayslipPreviewContent({
  objPayslip,
}: PayslipPreviewContentProps) {
  const dicEmployee = objPayslip.dicEmployee;
  const dicRun = objPayslip.dicRun;
  const dicCompany = objPayslip.dicCompany;
  const dicTax = objPayslip.dicTax;
  const dicTotals = objPayslip.dicTotals;

  return (
    <Box sx={{ background: "#f8fbff", border: "1px solid #d9e6ef", p: 2 }}>
      <Box
        sx={{
          alignItems: "flex-start",
          borderBottom: "2px solid #173b63",
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          justifyContent: "space-between",
          pb: 2,
        }}
      >
        <Box>
          <Typography sx={{ color: "#173b63", fontSize: "1.35rem", fontWeight: 900 }}>
            {dicCompany.strCompanyName}
          </Typography>
          <Typography sx={{ color: "#64748b", fontSize: "0.88rem" }}>
            {dicCompany.strCompanyAddress || ""}
          </Typography>
        </Box>
        <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
          <Typography sx={{ color: "#172033", fontSize: "1.1rem", fontWeight: 900 }}>
            Payslip
          </Typography>
          <Typography sx={{ color: "#64748b", fontSize: "0.88rem" }}>
            {dicRun.strPayrollMonthLabel}
          </Typography>
          <Typography sx={{ color: "#64748b", fontSize: "0.88rem" }}>
            {objPayslip.strPayslipNumber || "Preview"}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          mt: 2,
        }}
      >
        <Box sx={{ border: "1px solid #d9e6ef", background: "#fff", p: 2 }}>
          <Typography sx={{ color: "#173b63", fontWeight: 800, mb: 1.5 }}>
            Employee
          </Typography>
          <Stack spacing={0.8}>
            <DetailRow strLabel="Code" strValue={dicEmployee.strEmployeeCode} />
            <DetailRow strLabel="Name" strValue={dicEmployee.strEmployeeName} />
            <DetailRow strLabel="Department" strValue={dicEmployee.strDepartmentName} />
            <DetailRow strLabel="Designation" strValue={dicEmployee.strDesignationName} />
            <DetailRow strLabel="Location" strValue={dicEmployee.strLocationName} />
            <DetailRow strLabel="DOJ" strValue={formatDate(dicEmployee.dtDateOfJoining)} />
          </Stack>
        </Box>

        <Box sx={{ border: "1px solid #d9e6ef", background: "#fff", p: 2 }}>
          <Typography sx={{ color: "#173b63", fontWeight: 800, mb: 1.5 }}>
            Payroll
          </Typography>
          <Stack spacing={0.8}>
            <DetailRow strLabel="Run" strValue={dicRun.strRunName} />
            <DetailRow strLabel="PAN" strValue={dicEmployee.strPanNumber} />
            <DetailRow strLabel="Tax Regime" strValue={dicTax?.strRegimeUsed} />
            <DetailRow strLabel="UAN" strValue={dicEmployee.strUanNumber} />
            <DetailRow strLabel="ESI" strValue={dicEmployee.strEsiNumber} />
            <DetailRow strLabel="Bank" strValue={dicEmployee.strBankName} />
            <DetailRow strLabel="Account" strValue={dicEmployee.strBankAccountMasked} />
          </Stack>
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          mt: 2,
        }}
      >
        <LineTable strTitle="Earnings" lstLines={objPayslip.lstEarnings} />
        <LineTable strTitle="Deductions" lstLines={objPayslip.lstDeductions} />
      </Box>

      <Box sx={{ mt: 2 }}>
        <LineTable strTitle="Information" lstLines={objPayslip.lstInformation} />
      </Box>

      {objPayslip.lstEmployerContributions.length ? (
        <Box sx={{ mt: 2 }}>
          <LineTable
            strTitle="Employer Contributions"
            lstLines={objPayslip.lstEmployerContributions}
          />
        </Box>
      ) : null}

      <Box sx={{ background: "#fff", border: "1px solid #d9e6ef", mt: 2, p: 2 }}>
        <Box
          sx={{
            display: "grid",
            gap: 1,
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
          }}
        >
          <DetailRow strLabel="Gross" strValue={formatCurrency(dicTotals.decGrossEarnings)} />
          <DetailRow strLabel="Deductions" strValue={formatCurrency(dicTotals.decTotalDeductions)} />
          <DetailRow strLabel="Net Pay" strValue={formatCurrency(dicTotals.decNetPay)} />
        </Box>
        <Typography sx={{ color: "#475569", fontSize: "0.88rem", mt: 1.5 }}>
          {dicTotals.strNetPayInWords}
        </Typography>
      </Box>
    </Box>
  );
}
