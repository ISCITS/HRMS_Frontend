"use client";

import { Box, Stack, Typography } from "@mui/material";

import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
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
  strComponentLabel,
  strAmountLabel,
  strNoLinesLabel,
}: {
  strTitle: string;
  lstLines: PayslipLineRecord[];
  strComponentLabel: string;
  strAmountLabel: string;
  strNoLinesLabel: string;
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
              <th>{strComponentLabel}</th>
              <th style={{ textAlign: "right" }}>{strAmountLabel}</th>
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
                  {strNoLinesLabel}
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
  const { t } = useModuleLabels("payslips");
  const dicEmployee = objPayslip.dicEmployee;
  const dicRun = objPayslip.dicRun;
  const dicCompany = objPayslip.dicCompany;
  const dicTax = objPayslip.dicTax;
  const dicTotals = objPayslip.dicTotals;
  const dicLineTableLabels = {
    strComponentLabel: t("component", "Component"),
    strAmountLabel: t("amount", "Amount"),
    strNoLinesLabel: t("no_lines", "No lines"),
  };

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
            {t("payslip", "Payslip")}
          </Typography>
          <Typography sx={{ color: "#64748b", fontSize: "0.88rem" }}>
            {dicRun.strPayrollMonthLabel}
          </Typography>
          <Typography sx={{ color: "#64748b", fontSize: "0.88rem" }}>
            {objPayslip.strPayslipNumber || t("preview", "Preview")}
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
            {t("employee", "Employee")}
          </Typography>
          <Stack spacing={0.8}>
            <DetailRow strLabel={t("code", "Code")} strValue={dicEmployee.strEmployeeCode} />
            <DetailRow strLabel={t("name", "Name")} strValue={dicEmployee.strEmployeeName} />
            <DetailRow strLabel={t("department", "Department")} strValue={dicEmployee.strDepartmentName} />
            <DetailRow strLabel={t("designation", "Designation")} strValue={dicEmployee.strDesignationName} />
            <DetailRow strLabel={t("location", "Location")} strValue={dicEmployee.strLocationName} />
            <DetailRow strLabel={t("doj", "DOJ")} strValue={formatDate(dicEmployee.dtDateOfJoining)} />
          </Stack>
        </Box>

        <Box sx={{ border: "1px solid #d9e6ef", background: "#fff", p: 2 }}>
          <Typography sx={{ color: "#173b63", fontWeight: 800, mb: 1.5 }}>
            {t("payroll", "Payroll")}
          </Typography>
          <Stack spacing={0.8}>
            <DetailRow strLabel={t("run", "Run")} strValue={dicRun.strRunName} />
            <DetailRow strLabel={t("pan", "PAN")} strValue={dicEmployee.strPanNumber} />
            <DetailRow strLabel={t("tax_regime", "Tax Regime")} strValue={dicTax?.strRegimeUsed} />
            <DetailRow strLabel={t("uan", "UAN")} strValue={dicEmployee.strUanNumber} />
            <DetailRow strLabel={t("esi", "ESI")} strValue={dicEmployee.strEsiNumber} />
            <DetailRow strLabel={t("bank", "Bank")} strValue={dicEmployee.strBankName} />
            <DetailRow strLabel={t("account", "Account")} strValue={dicEmployee.strBankAccountMasked} />
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
        <LineTable strTitle={t("earnings", "Earnings")} lstLines={objPayslip.lstEarnings} {...dicLineTableLabels} />
        <LineTable strTitle={t("deductions", "Deductions")} lstLines={objPayslip.lstDeductions} {...dicLineTableLabels} />
      </Box>

      <Box sx={{ mt: 2 }}>
        <LineTable strTitle={t("information", "Information")} lstLines={objPayslip.lstInformation} {...dicLineTableLabels} />
      </Box>

      {objPayslip.lstEmployerContributions.length ? (
        <Box sx={{ mt: 2 }}>
          <LineTable
            strTitle={t("employer_contributions", "Employer Contributions")}
            lstLines={objPayslip.lstEmployerContributions}
            {...dicLineTableLabels}
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
          <DetailRow strLabel={t("gross", "Gross")} strValue={formatCurrency(dicTotals.decGrossEarnings)} />
          <DetailRow strLabel={t("deductions", "Deductions")} strValue={formatCurrency(dicTotals.decTotalDeductions)} />
          <DetailRow strLabel={t("net_pay", "Net Pay")} strValue={formatCurrency(dicTotals.decNetPay)} />
        </Box>
        <Typography sx={{ color: "#475569", fontSize: "0.88rem", mt: 1.5 }}>
          {dicTotals.strNetPayInWords}
        </Typography>
      </Box>
    </Box>
  );
}
