"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import PayslipPreviewContent from "@/features/payroll/components/PayslipPreviewContent";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { payrollResultService } from "@/features/payroll/services/payrollResultService";
import { payslipService } from "@/features/payroll/services/payslipService";
import type { PayrollResultDetailRecord, PayslipPreviewRecord } from "@/features/payroll/types";
import {
  buildPayslipFileName,
  downloadPayslipHtml,
  printPayslipHtml,
} from "@/features/payroll/utils/payslipDocument";

type PayrollResultDetailPageProps = {
  intResultID: number;
  blnPayslipScreen?: boolean;
  strBackRoute?: string;
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
    <Paper
      sx={{
        p: 2,
        borderRadius: "22px",
        flex: 1,
        background: "rgba(255,255,255,0.72)",
        border: "1px solid rgba(148,163,184,0.14)",
      }}
    >
      <Typography sx={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {strLabel}
      </Typography>
      <Typography sx={{ mt: 0.75, fontWeight: 800, color: "#0f172a" }}>
        {strValue}
      </Typography>
    </Paper>
  );
}

function DetailValue({
  strLabel,
  strValue,
}: {
  strLabel: string;
  strValue: string;
}) {
  return (
    <Box>
      <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{strLabel}</Typography>
      <Typography sx={{ color: "#0f172a", fontWeight: 700 }}>{strValue}</Typography>
    </Box>
  );
}

export default function PayrollResultDetailPage({
  intResultID,
  blnPayslipScreen = false,
  strBackRoute,
}: PayrollResultDetailPageProps) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("payslips");
  const [objResult, setObjResult] = useState<PayrollResultDetailRecord | null>(null);
  const [objPayslip, setObjPayslip] = useState<PayslipPreviewRecord | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnPayslipLoading, setBlnPayslipLoading] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");

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
      <BlockingLoader blnOpen strLabel={t("loading_result", "Loading payroll result...")} />
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
  const objCurrentResult = objResult;
  const objSectionCardSx = {
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: "24px",
    p: 2.5,
  };
  const objSectionTitleSx = {
    color: "#0f172a",
    fontWeight: 800,
    mb: 1.5,
  };
  const objSubsectionTitleSx = {
    color: "#0f172a",
    fontWeight: 800,
    mb: 0.25,
  };
  const objDetailGridSx = {
    display: "grid",
    gap: 1.25,
  };
  const objActionButtonSx = {
    borderRadius: "14px",
    height: 40,
    minHeight: 40,
    py: 0,
    px: 1.75,
    fontSize: "0.92rem",
    lineHeight: 1.1,
    "& .MuiButton-startIcon": {
      mr: 0.75,
      "& svg": {
        fontSize: "1.05rem",
      },
    },
  };

  async function loadPayslipPreview() {
    setBlnPayslipLoading(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicPayslip = await payslipService.getPayslipPreview(
        objCurrentResult.intPayrollRunID,
        objCurrentResult.intEmployeeID
      );
      setObjPayslip(dicPayslip);
    } catch (objError) {
      setStrError(
        objError instanceof Error ? objError.message : "Unable to load payslip preview."
      );
    } finally {
      setBlnPayslipLoading(false);
    }
  }

  async function generatePayslip() {
    setBlnPayslipLoading(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicPayslip = await payslipService.generatePayslip(
        objCurrentResult.intPayrollRunID,
        objCurrentResult.intEmployeeID
      );
      setObjPayslip(dicPayslip);
      setStrSuccess(t("payslip_generated", "Payslip generated successfully."));
      return dicPayslip;
    } catch (objError) {
      setStrError(
        objError instanceof Error ? objError.message : "Unable to generate payslip."
      );
      return null;
    } finally {
      setBlnPayslipLoading(false);
    }
  }

  async function ensureGeneratedPayslip() {
    if (objPayslip?.intPayslipID) {
      return objPayslip;
    }
    return generatePayslip();
  }

  async function openGeneratedPayslip(blnPrint: boolean) {
    setBlnPayslipLoading(true);
    setStrError("");
    try {
      const dicPayslip = await ensureGeneratedPayslip();
      if (!dicPayslip?.intPayslipID) {
        return;
      }
      const strHtml = await payslipService.getDownloadHtml(dicPayslip.intPayslipID);
      if (blnPrint) {
        printPayslipHtml(strHtml);
      } else {
        downloadPayslipHtml(
          strHtml,
          buildPayslipFileName(
            "payslip",
            dicPayslip.strPayslipNumber,
            objCurrentResult.strEmployeeCode
          )
        );
      }
    } catch (objError) {
      setStrError(
        objError instanceof Error ? objError.message : "Unable to download payslip document."
      );
    } finally {
      setBlnPayslipLoading(false);
    }
  }

  return (
    <Stack spacing={2.5} sx={{ height: "100%", overflow: "auto", pb: 3, pr: 0.5 }}>
      <Paper
        sx={{
          borderRadius: "28px",
          p: { xs: 2, md: 3 },
          border: "1px solid rgba(148,163,184,0.18)",
          background: "linear-gradient(135deg, #f8fbff 0%, #eef6ff 46%, #f8fafc 100%)",
        }}
      >
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: "1.7rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
                {objResult.strEmployeeName}
              </Typography>
              <Typography sx={{ color: "#64748b", mt: 0.75 }}>
                {objResult.strEmployeeCode} | {objResult.strRunName}
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
              <span className={styles.statusPill} style={getStatusPillSx(objResult.strStatus)}>
                {objResult.strStatus}
              </span>
              {blnPayslipScreen ? (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<ReceiptLongRoundedIcon />}
                    onClick={loadPayslipPreview}
                    disabled={blnPayslipLoading}
                    data-testid="payroll.result-detail.preview-payslip.button"
                    sx={objActionButtonSx}
                  >
                    {t("preview_payslip", "Preview Payslip")}
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<ReceiptLongRoundedIcon />}
                    onClick={generatePayslip}
                    disabled={blnPayslipLoading}
                    data-testid="payroll.result-detail.generate-payslip.button"
                    sx={objActionButtonSx}
                  >
                    {t("generate_payslip", "Generate")}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadRoundedIcon />}
                    onClick={() => openGeneratedPayslip(false)}
                    disabled={blnPayslipLoading}
                    data-testid="payroll.result-detail.download-payslip.button"
                    sx={objActionButtonSx}
                  >
                    {t("download_payslip", "Download")}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<PrintRoundedIcon />}
                    onClick={() => openGeneratedPayslip(true)}
                    disabled={blnPayslipLoading}
                    data-testid="payroll.result-detail.print-payslip.button"
                    sx={objActionButtonSx}
                  >
                    {t("print_payslip", "Print")}
                  </Button>
                </>
              ) : null}
              <Button
                className={styles.secondaryButton}
                variant="outlined"
                  startIcon={<ArrowBackRoundedIcon />}
                onClick={() =>
                  objRouter.push(
                    strBackRoute ||
                      (blnPayslipScreen ? "/reports/payslips" : "/payroll/results")
                  )
                }
                data-testid="payroll.result-detail.back.button"
                sx={objActionButtonSx}
              >
                {t("back_to_list", "Back to List")}
              </Button>
            </Stack>
          </Stack>
          <Box
            sx={{
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" },
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
        </Stack>
      </Paper>

      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}
      {blnPayslipLoading ? (
        <Alert severity="info">{t("payslip_loading", "Preparing payslip...")}</Alert>
      ) : null}

      <Paper sx={objSectionCardSx}>
        <Typography sx={objSectionTitleSx}>
          {t("summary_section", "Summary")}
        </Typography>
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" },
          }}
        >
          <Box sx={objDetailGridSx}>
            <Typography sx={objSubsectionTitleSx}>
              {t("employee_summary", "Employee Summary")}
            </Typography>
            <DetailValue strLabel={t("employee_code", "Employee Code")} strValue={objResult.strEmployeeCode} />
            <DetailValue strLabel={t("employee_name", "Employee Name")} strValue={objResult.strEmployeeName} />
            <DetailValue strLabel={t("status", "Status")} strValue={objResult.strStatus} />
          </Box>

          <Box sx={objDetailGridSx}>
            <Typography sx={objSubsectionTitleSx}>
              {t("tax_summary", "Tax Summary")}
            </Typography>
            <DetailValue strLabel={t("tax_regime", "Tax Regime")} strValue={objResult.strRegimeUsed || "-"} />
            <DetailValue strLabel={t("taxable_income", "Taxable Income")} strValue={formatCurrency(objResult.decTaxableIncome)} />
            <DetailValue strLabel={t("annual_tax", "Annual Tax")} strValue={formatCurrency(objResult.decAnnualTaxAmount)} />
          </Box>

          <Box sx={objDetailGridSx}>
            <Typography sx={objSubsectionTitleSx}>
              {t("run_summary", "Payroll Run Summary")}
            </Typography>
            <DetailValue strLabel={t("payroll_run", "Payroll Run")} strValue={objResult.strRunName} />
            <DetailValue strLabel={t("run_code", "Run Code")} strValue={objResult.strRunCode} />
            <DetailValue strLabel={t("payroll_month", "Payroll Month")} strValue={formatMonth(objResult.dtPayrollMonth)} />
          </Box>

          <Box sx={objDetailGridSx}>
            <Typography sx={objSubsectionTitleSx}>
              {t("notes", "Notes")}
            </Typography>
            <Typography sx={{ color: "#0f172a", fontWeight: 700 }}>
              {objResult.strRemarks || t("no_remarks", "No remarks available.")}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Paper sx={objSectionCardSx}>
        <Typography sx={objSectionTitleSx}>
          {t("line_items", "Result Lines")}
        </Typography>

        <Box
          sx={{
            overflowX: "auto",
            overflowY: "visible",
            scrollbarGutter: "stable",
          }}
        >
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
      </Paper>

      {objPayslip ? (
        <Paper sx={objSectionCardSx}>
          <Typography sx={objSectionTitleSx}>
            {t("payslip_preview", "Payslip Preview")}
          </Typography>
          <PayslipPreviewContent objPayslip={objPayslip} />
        </Paper>
      ) : null}
    </Stack>
  );
}
