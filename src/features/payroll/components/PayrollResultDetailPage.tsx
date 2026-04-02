"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { payrollResultService } from "@/features/payroll/services/payrollResultService";
import type { PayrollResultDetailRecord } from "@/features/payroll/types";

type PayrollResultDetailPageProps = {
  intResultID: number;
};

function formatMonth(strDate: string | null) {
  if (!strDate) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(strDate));
}

function formatCurrency(decValue: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(decValue || 0);
}

function getStatusPillSx(strStatus: string) {
  const dicToneByStatus: Record<string, { background: string; color: string }> = {
    Calculated: { background: "#2563eb", color: "#fff" },
    Approved: { background: "#16a34a", color: "#fff" },
    Published: { background: "#7c3aed", color: "#fff" },
    Paid: { background: "#0f766e", color: "#fff" },
  };
  return dicToneByStatus[strStatus] ?? { background: "#475569", color: "#fff" };
}

function SummaryCard({
  strLabel,
  strValue,
}: {
  strLabel: string;
  strValue: string;
}) {
  return (
    <Box
      sx={{
        border: "1px solid #d9e6ef",
        borderRadius: 3,
        background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
        p: 2,
      }}
    >
      <Typography sx={{ color: "#64748b", fontSize: "0.84rem", mb: 0.6 }}>
        {strLabel}
      </Typography>
      <Typography sx={{ color: "#0f172a", fontSize: "1.45rem", fontWeight: 800 }}>
        {strValue}
      </Typography>
    </Box>
  );
}

export default function PayrollResultDetailPage({
  intResultID,
}: PayrollResultDetailPageProps) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("payslips");
  const [objResult, setObjResult] = useState<PayrollResultDetailRecord | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");

  useEffect(() => {
    let blnMounted = true;

    async function loadResult() {
      setBlnLoading(true);
      setStrError("");
      try {
        const dicResult = await payrollResultService.getPayrollResultById(intResultID);
        if (!blnMounted) {
          return;
        }
        setObjResult(dicResult);
      } catch (objError) {
        if (!blnMounted) {
          return;
        }
        setStrError(
          objError instanceof Error
            ? objError.message
            : "Unable to load payroll result."
        );
      } finally {
        if (blnMounted) {
          setBlnLoading(false);
        }
      }
    }

    loadResult().catch(() => undefined);
    return () => {
      blnMounted = false;
    };
  }, [intResultID]);

  if (blnLoading) {
    return (
      <BlockingLoader strLabel={t("loading_result", "Loading payroll result...")} />
    );
  }

  if (!objResult) {
    return (
      <Box className={styles.page}>
        <Alert severity="error">
          {strError || t("not_found", "Payroll result not found.")}
        </Alert>
      </Box>
    );
  }

  return (
    <Box className={styles.page} sx={{ overflowY: "auto", height: "auto" }}>
      <Typography className={styles.breadcrumbs}>
        {t("breadcrumbs_detail", "Payroll / Payroll Results / Detail")}
      </Typography>

      <Box className={styles.topBar}>
        <Button
          className={styles.secondaryButton}
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => objRouter.push("/payroll/payslips")}
        >
          {t("back_to_list", "Back to List")}
        </Button>
      </Box>

      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader}>
          <Box>
            <Typography className={styles.title}>{objResult.strEmployeeName}</Typography>
            <Typography sx={{ color: "#64748b", mt: 0.5 }}>
              {objResult.strEmployeeCode} | {objResult.strRunName}
            </Typography>
          </Box>
          <span className={styles.statusPill} style={getStatusPillSx(objResult.strStatus)}>
            {objResult.strStatus}
          </span>
        </Box>
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" },
            mt: 1.5,
          }}
        >
          <SummaryCard
            strLabel={t("gross", "Gross")}
            strValue={formatCurrency(objResult.decGrossAmount)}
          />
          <SummaryCard
            strLabel={t("deductions", "Deductions")}
            strValue={formatCurrency(objResult.decDeductionAmount)}
          />
          <SummaryCard
            strLabel={t("tax", "Tax")}
            strValue={formatCurrency(objResult.decTaxAmount)}
          />
          <SummaryCard
            strLabel={t("net_pay", "Net Pay")}
            strValue={formatCurrency(objResult.decNetPayAmount)}
          />
        </Box>
      </Box>

      <Box className={styles.tableCard} sx={{ p: 2, gap: 2 }}>
        {strError ? <Alert severity="error">{strError}</Alert> : null}

        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
          }}
        >
          <Box
            sx={{
              border: "1px solid #d9e6ef",
              borderRadius: 3,
              background: "#fff",
              p: 2,
            }}
          >
            <Typography sx={{ color: "#173b63", fontWeight: 800, mb: 1.5 }}>
              {t("employee_summary", "Employee Summary")}
            </Typography>
            <Stack spacing={1}>
              <Typography>{t("employee_code", "Employee Code")}: {objResult.strEmployeeCode}</Typography>
              <Typography>{t("employee_name", "Employee Name")}: {objResult.strEmployeeName}</Typography>
              <Typography>{t("status", "Status")}: {objResult.strStatus}</Typography>
            </Stack>
          </Box>

          <Box
            sx={{
              border: "1px solid #d9e6ef",
              borderRadius: 3,
              background: "#fff",
              p: 2,
            }}
          >
            <Typography sx={{ color: "#173b63", fontWeight: 800, mb: 1.5 }}>
              {t("run_summary", "Payroll Run Summary")}
            </Typography>
            <Stack spacing={1}>
              <Typography>{t("payroll_run", "Payroll Run")}: {objResult.strRunName}</Typography>
              <Typography>{t("run_code", "Run Code")}: {objResult.strRunCode}</Typography>
              <Typography>{t("payroll_month", "Payroll Month")}: {formatMonth(objResult.dtPayrollMonth)}</Typography>
            </Stack>
          </Box>

          <Box
            sx={{
              border: "1px solid #d9e6ef",
              borderRadius: 3,
              background: "#fff",
              p: 2,
            }}
          >
            <Typography sx={{ color: "#173b63", fontWeight: 800, mb: 1.5 }}>
              {t("notes", "Notes")}
            </Typography>
            <Typography sx={{ color: "#475569" }}>
              {objResult.strRemarks || t("no_remarks", "No remarks available.")}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            border: "1px solid #d9e6ef",
            borderRadius: 3,
            background: "#fff",
            p: 2,
          }}
        >
          <Typography sx={{ color: "#173b63", fontWeight: 800, mb: 1.5 }}>
            {t("line_items", "Result Lines")}
          </Typography>

          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("component_code", "Component Code")}</th>
                  <th>{t("component_name", "Component Name")}</th>
                  <th>{t("category", "Category")}</th>
                  <th>{t("line_type", "Line Type")}</th>
                  <th>{t("amount", "Amount")}</th>
                  <th>{t("remarks", "Remarks")}</th>
                </tr>
              </thead>
              <tbody>
                {objResult.lstLines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.emptyState}>
                      {t("line_empty", "No payroll result lines found.")}
                    </td>
                  </tr>
                ) : (
                  objResult.lstLines.map((dicLine) => (
                    <tr key={dicLine.intID}>
                      <td>{dicLine.strComponentCode}</td>
                      <td>{dicLine.strComponentName}</td>
                      <td>{dicLine.strComponentCategory || "-"}</td>
                      <td>{dicLine.strLineType || "-"}</td>
                      <td>{formatCurrency(dicLine.decAmount)}</td>
                      <td>{dicLine.strRemarks || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
