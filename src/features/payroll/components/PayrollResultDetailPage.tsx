"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import NoteAltOutlinedIcon from "@mui/icons-material/NoteAltOutlined";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import PercentRoundedIcon from "@mui/icons-material/PercentRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import RequestQuoteRoundedIcon from "@mui/icons-material/RequestQuoteRounded";
import SummarizeOutlinedIcon from "@mui/icons-material/SummarizeOutlined";
import WalletRoundedIcon from "@mui/icons-material/WalletRounded";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
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

function getStatusTone(strStatus: string) {
  const dicToneByStatus: Record<string, { background: string; color: string }> = {
    Calculated: { background: "#4f46e5", color: "#fff" },
    Approved: { background: "#16a34a", color: "#fff" },
    Published: { background: "#7c3aed", color: "#fff" },
    Paid: { background: "#0f766e", color: "#fff" },
  };
  return dicToneByStatus[strStatus] ?? { background: "#475569", color: "#fff" };
}

function getInitials(strName: string) {
  const lstParts = strName.trim().split(/\s+/).filter(Boolean);
  if (lstParts.length === 0) {
    return "PR";
  }
  return lstParts.slice(0, 2).map((strPart) => strPart[0]?.toUpperCase() ?? "").join("");
}

function getCategoryChipSx(strCategory: string | null | undefined) {
  const strNormalized = String(strCategory ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (strNormalized === "earning") {
    return { background: "#dcfce7", color: "#15803d" };
  }
  if (strNormalized === "reimbursement") {
    return { background: "#dbeafe", color: "#1d4ed8" };
  }
  if (strNormalized === "deduction") {
    return { background: "#ffedd5", color: "#c2410c" };
  }
  return { background: "#e2e8f0", color: "#334155" };
}

function KpiCard({
  strLabel,
  strValue,
  objIcon,
  strBorder,
  strIconBg,
  strIconColor,
}: {
  strLabel: string;
  strValue: string;
  objIcon: ReactNode;
  strBorder: string;
  strIconBg: string;
  strIconColor: string;
}) {
  return (
    <Paper
      sx={{
        borderRadius: "22px",
        border: `1px solid ${strBorder}`,
        background: "#fff",
        boxShadow: "0 18px 40px rgba(15, 23, 42, 0.05)",
        px: 2.5,
        py: 2.25,
      }}
    >
      <Stack direction="row" spacing={1.8} alignItems="center">
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: "18px",
            display: "grid",
            placeItems: "center",
            background: strIconBg,
            color: strIconColor,
            flexShrink: 0,
          }}
        >
          {objIcon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: "#475569", fontSize: "0.82rem", fontWeight: 800, textTransform: "uppercase" }}>
            {strLabel}
          </Typography>
          <Typography sx={{ color: "#0f172a", fontSize: "1.05rem", fontWeight: 900, mt: 0.6 }}>
            {strValue}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function DetailValue({
  strLabel,
  strValue,
  objValue,
}: {
  strLabel: string;
  strValue?: string;
  objValue?: ReactNode;
}) {
  return (
    <Box>
      <Typography sx={{ color: "#64748b", fontSize: "0.82rem", mb: 0.55 }}>{strLabel}</Typography>
      {objValue ?? <Typography sx={{ color: "#0f172a", fontWeight: 800 }}>{strValue}</Typography>}
    </Box>
  );
}

function SummaryBlock({
  strTitle,
  objIcon,
  children,
  blnDivider = true,
}: {
  strTitle: string;
  objIcon: ReactNode;
  children: ReactNode;
  blnDivider?: boolean;
}) {
  return (
    <Box
      sx={{
        pr: { xs: 0, lg: blnDivider ? 3 : 0 },
        borderRight: { xs: "none", lg: blnDivider ? "1px solid #e2e8f0" : "none" },
      }}
    >
      <Typography sx={{ display: "flex", alignItems: "center", gap: 1, color: "#0f172a", fontWeight: 900, mb: 2 }}>
        {objIcon}
        {strTitle}
      </Typography>
      <Stack spacing={2.3}>{children}</Stack>
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
  const [objActionsAnchor, setObjActionsAnchor] = useState<null | HTMLElement>(null);

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

  const strResolvedBackRoute = strBackRoute || (blnPayslipScreen ? "/reports/payslips" : "/payroll/results");

  const lstResultLines = useMemo(
    () => objResult?.lstLines ?? [],
    [objResult]
  );

  if (blnLoading) {
    return <BlockingLoader blnOpen strLabel={t("loading_result", "Loading payroll result...")} />;
  }

  if (!objResult) {
    return (
      <Box className={styles.page}>
        <Alert severity="error">{strError || t("not_found", "Payroll result not found.")}</Alert>
      </Box>
    );
  }

  async function loadPayslipPreview() {
    setBlnPayslipLoading(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicPayslip = await payslipService.getPayslipPreview(
        objResult.intPayrollRunID,
        objResult.intEmployeeID
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
        objResult.intPayrollRunID,
        objResult.intEmployeeID
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
          buildPayslipFileName("payslip", dicPayslip.strPayslipNumber, objResult.strEmployeeCode)
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

  function handleOpenActions(objEvent: MouseEvent<HTMLButtonElement>) {
    setObjActionsAnchor(objEvent.currentTarget);
  }

  function handleCloseActions() {
    setObjActionsAnchor(null);
  }

  const dicStatusTone = getStatusTone(objResult.strStatus);

  return (
    <Box
      sx={{
        minHeight: "100%",
        overflow: "auto",
        pr: 0.5,
        pb: 3,
      }}
    >
      <Paper
        sx={{
          borderRadius: "30px",
          p: { xs: 2, md: 3 },
          border: "1px solid rgba(191, 219, 254, 0.55)",
          background: "radial-gradient(circle at top center, rgba(226,241,255,0.92) 0%, #ffffff 42%, #f8fbff 100%)",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.06)",
        }}
      >
        <Stack spacing={2.8}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <Stack spacing={1.7} sx={{ minWidth: 0 }}>
              <Button
                onClick={() => objRouter.push(strResolvedBackRoute)}
                startIcon={<ArrowBackRoundedIcon />}
                sx={{
                  alignSelf: "flex-start",
                  color: "#7c97c7",
                  px: 0,
                  minWidth: 0,
                  textTransform: "none",
                  fontWeight: 700,
                  "&:hover": { background: "transparent", color: "#5d7fb8" },
                }}
                data-testid="payroll.result-detail.back.button"
              >
                {t("back_to_list", "Back to List")}
              </Button>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  sx={{
                    width: 70,
                    height: 70,
                    background: "linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)",
                    color: "#5b21b6",
                    fontSize: "1.8rem",
                    fontWeight: 800,
                  }}
                >
                  {getInitials(objResult.strEmployeeName)}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ color: "#0f172a", fontSize: { xs: "2rem", md: "2.2rem" }, fontWeight: 900, lineHeight: 1.05 }}>
                    {objResult.strEmployeeName}
                  </Typography>
                  <Typography sx={{ color: "#47648f", fontSize: "1rem", mt: 1 }}>
                    {objResult.strEmployeeCode} {" | "} {objResult.strRunName}
                  </Typography>
                </Box>
              </Stack>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="flex-start">
              <Chip
                label={objResult.strStatus}
                sx={{
                  alignSelf: { xs: "flex-start", sm: "center" },
                  background: dicStatusTone.background,
                  color: dicStatusTone.color,
                  fontWeight: 800,
                  borderRadius: "10px",
                  height: 32,
                }}
              />
              {blnPayslipScreen ? (
                <>
                  <Button
                    onClick={handleOpenActions}
                    endIcon={<KeyboardArrowDownRoundedIcon />}
                    startIcon={<DownloadRoundedIcon />}
                    disabled={blnPayslipLoading}
                    sx={{
                      borderRadius: "12px",
                      border: "1px solid #d7e4f3",
                      color: "#0f172a",
                      background: "#fff",
                      boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
                      px: 2,
                      height: 46,
                      textTransform: "none",
                      fontWeight: 800,
                    }}
                    data-testid="payroll.result-detail.actions.button"
                  >
                    {t("download_payslip", "Download")}
                  </Button>
                  <Menu anchorEl={objActionsAnchor} open={Boolean(objActionsAnchor)} onClose={handleCloseActions}>
                    <MenuItem onClick={() => { handleCloseActions(); void loadPayslipPreview(); }} data-testid="payroll.result-detail.preview-payslip.button">
                      {t("preview_payslip", "Preview Payslip")}
                    </MenuItem>
                    <MenuItem onClick={() => { handleCloseActions(); void generatePayslip(); }} data-testid="payroll.result-detail.generate-payslip.button">
                      {t("generate_payslip", "Generate")}
                    </MenuItem>
                    <MenuItem onClick={() => { handleCloseActions(); void openGeneratedPayslip(false); }} data-testid="payroll.result-detail.download-payslip.button">
                      {t("download_payslip", "Download")}
                    </MenuItem>
                    <MenuItem onClick={() => { handleCloseActions(); void openGeneratedPayslip(true); }} data-testid="payroll.result-detail.print-payslip.button">
                      {t("print_payslip", "Print")}
                    </MenuItem>
                  </Menu>
                </>
              ) : null}
            </Stack>
          </Stack>

          {strError ? <Alert severity="error">{strError}</Alert> : null}
          {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}
          {blnPayslipLoading ? <Alert severity="info">{t("payslip_loading", "Preparing payslip...")}</Alert> : null}

          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" },
            }}
          >
            <KpiCard
              strLabel={t("gross", "Gross")}
              strValue={formatCurrency(objResult.decGrossAmount)}
              objIcon={<WalletRoundedIcon sx={{ fontSize: 30 }} />}
              strBorder="rgba(125, 211, 252, 0.55)"
              strIconBg="linear-gradient(135deg, #ecfeff 0%, #d1fae5 100%)"
              strIconColor="#0f766e"
            />
            <KpiCard
              strLabel={t("deductions", "Deductions")}
              strValue={formatCurrency(objResult.decDeductionAmount)}
              objIcon={<DescriptionOutlinedIcon sx={{ fontSize: 30 }} />}
              strBorder="rgba(253, 186, 116, 0.55)"
              strIconBg="linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)"
              strIconColor="#f97316"
            />
            <KpiCard
              strLabel={t("tax", "Tax")}
              strValue={formatCurrency(objResult.decTaxAmount)}
              objIcon={<PercentRoundedIcon sx={{ fontSize: 30 }} />}
              strBorder="rgba(196, 181, 253, 0.7)"
              strIconBg="linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)"
              strIconColor="#7c3aed"
            />
            <KpiCard
              strLabel={t("net_pay", "Net Pay")}
              strValue={formatCurrency(objResult.decNetPayAmount)}
              objIcon={<PaymentsRoundedIcon sx={{ fontSize: 30 }} />}
              strBorder="rgba(167, 243, 208, 0.75)"
              strIconBg="linear-gradient(135deg, #ecfdf5 0%, #dcfce7 100%)"
              strIconColor="#16a34a"
            />
          </Box>

          <Paper
            sx={{
              borderRadius: "24px",
              border: "1px solid rgba(226, 232, 240, 0.95)",
              boxShadow: "0 20px 44px rgba(15, 23, 42, 0.05)",
              background: "#fff",
              p: 2.8,
            }}
          >
            <Typography sx={{ display: "flex", alignItems: "center", gap: 1, color: "#0f172a", fontSize: "1.05rem", fontWeight: 900, pb: 2, mb: 2.2, borderBottom: "1px solid #e2e8f0" }}>
              <SummarizeOutlinedIcon sx={{ color: "#2563eb", fontSize: 22 }} />
              {t("summary_section", "Summary")}
            </Typography>
            <Box
              sx={{
                display: "grid",
                gap: 3,
                gridTemplateColumns: { xs: "1fr", lg: "repeat(4, minmax(0, 1fr))" },
              }}
            >
              <SummaryBlock strTitle={t("employee_summary", "Employee Summary")} objIcon={<PersonOutlineRoundedIcon sx={{ color: "#2563eb", fontSize: 22 }} />}>
                <DetailValue strLabel={t("employee_code", "Employee Code")} strValue={objResult.strEmployeeCode} />
                <DetailValue strLabel={t("employee_name", "Employee Name")} strValue={objResult.strEmployeeName} />
                <DetailValue
                  strLabel={t("status", "Status")}
                  objValue={<Chip label={objResult.strStatus} size="small" sx={{ ...dicStatusTone, fontWeight: 800, width: "fit-content" }} />}
                />
              </SummaryBlock>

              <SummaryBlock strTitle={t("tax_summary", "Tax Summary")} objIcon={<ReceiptLongRoundedIcon sx={{ color: "#4f46e5", fontSize: 22 }} />}>
                <DetailValue strLabel={t("tax_regime", "Tax Regime")} strValue={objResult.strRegimeUsed || "-"} />
                <DetailValue strLabel={t("taxable_income", "Taxable Income")} strValue={formatCurrency(objResult.decTaxableIncome)} />
                <DetailValue strLabel={t("annual_tax", "Annual Tax")} strValue={formatCurrency(objResult.decAnnualTaxAmount)} />
              </SummaryBlock>

              <SummaryBlock strTitle={t("run_summary", "Payroll Run Summary")} objIcon={<CalendarMonthRoundedIcon sx={{ color: "#2563eb", fontSize: 22 }} />}>
                <DetailValue strLabel={t("payroll_run", "Payroll Run")} strValue={objResult.strRunName} />
                <DetailValue strLabel={t("run_code", "Run Code")} strValue={objResult.strRunCode} />
                <DetailValue strLabel={t("payroll_month", "Payroll Month")} strValue={formatMonth(objResult.dtPayrollMonth)} />
              </SummaryBlock>

              <SummaryBlock strTitle={t("notes", "Notes")} objIcon={<NoteAltOutlinedIcon sx={{ color: "#f97316", fontSize: 22 }} />} blnDivider={false}>
                <Box
                  sx={{
                    borderRadius: "12px",
                    border: "1px solid #fcd34d",
                    background: "#fffbea",
                    px: 2,
                    py: 1.6,
                    color: "#854d0e",
                    fontWeight: 500,
                  }}
                >
                  {objResult.strRemarks || t("no_remarks", "No remarks available.")}
                </Box>
              </SummaryBlock>
            </Box>
          </Paper>

          <Paper
            sx={{
              borderRadius: "24px",
              border: "1px solid rgba(226, 232, 240, 0.95)",
              boxShadow: "0 20px 44px rgba(15, 23, 42, 0.05)",
              background: "#fff",
              p: 2.8,
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", lg: "row" },
                alignItems: { xs: "stretch", lg: "center" },
                justifyContent: "space-between",
                gap: 1.5,
                pb: 2,
                mb: 2.2,
                borderBottom: "1px solid #e2e8f0"
              }}
            >
              <Typography sx={{ display: "flex", alignItems: "center", gap: 1, color: "#0f172a", fontSize: "1.05rem", fontWeight: 900 }}>
                <RequestQuoteRoundedIcon sx={{ color: "#2563eb", fontSize: 22 }} />
                {t("line_items", "Result Lines")}
              </Typography>
              <Stack direction="row" spacing={1.5} alignItems="center" justifyContent={{ xs: "flex-start", lg: "flex-end" }} flexWrap="wrap">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography sx={{ color: "#334155", fontSize: "0.95rem" }}>
                    {t("group_by_category", "Group by Category")}
                  </Typography>
                  <Switch
                    checked={false}
                    disabled
                    inputProps={{ "data-testid": "payroll.result-detail.group-by-category.switch" }}
                  />
                </Stack>
                <Button
                  className={styles.secondaryButton}
                  startIcon={<FilterAltOutlinedIcon />}
                  disabled
                  data-testid="payroll.result-detail.filter.button"
                >
                  {t("filter", "Filter")}
                </Button>
              </Stack>
            </Box>

            <Box
              sx={{
                overflowX: "auto",
                border: "1px solid #e2e8f0",
                borderRadius: "16px",
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
                  {lstResultLines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={styles.emptyState}>
                        {t("line_empty", "No payroll result lines found.")}
                      </td>
                    </tr>
                  ) : (
                    lstResultLines.map((dicLine) => (
                      <tr key={dicLine.intID}>
                        <td>{dicLine.strComponentCode}</td>
                        <td>{dicLine.strComponentName}</td>
                        <td>
                          <Chip
                            label={dicLine.strComponentCategory || "-"}
                            size="small"
                            sx={{
                              ...getCategoryChipSx(dicLine.strComponentCategory),
                              fontWeight: 700,
                              borderRadius: "8px",
                            }}
                          />
                        </td>
                        <td>{dicLine.strLineType || "-"}</td>
                        <td>{formatCurrency(dicLine.decAmount)}</td>
                        <td>{dicLine.strRemarks || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between",
                gap: 1.25,
                pt: 1.8,
              }}
            >
              <Typography sx={{ color: "#475569", fontSize: "0.92rem" }}>
                {`Showing 1 to ${lstResultLines.length} of ${lstResultLines.length} results`}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  disabled
                  sx={{
                    minWidth: 36,
                    width: 36,
                    height: 36,
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    color: "#94a3b8",
                  }}
                >
                  {"<"}
                </Button>
                <Button
                  sx={{
                    minWidth: 36,
                    width: 36,
                    height: 36,
                    borderRadius: "10px",
                    background: "#2563eb",
                    color: "#fff",
                    fontWeight: 800,
                    "&:hover": { background: "#2563eb" },
                  }}
                >
                  1
                </Button>
                <Button
                  disabled
                  sx={{
                    minWidth: 36,
                    width: 36,
                    height: 36,
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    color: "#94a3b8",
                  }}
                >
                  {">"}
                </Button>
              </Stack>
            </Box>
          </Paper>

          {objPayslip ? (
            <Paper
              sx={{
                borderRadius: "24px",
                border: "1px solid rgba(226, 232, 240, 0.95)",
                boxShadow: "0 20px 44px rgba(15, 23, 42, 0.05)",
                background: "#fff",
                p: 2.8,
              }}
            >
              <Typography sx={{ display: "flex", alignItems: "center", gap: 1, color: "#0f172a", fontSize: "1.05rem", fontWeight: 900, pb: 2, mb: 2.2, borderBottom: "1px solid #e2e8f0" }}>
                <ReceiptLongRoundedIcon sx={{ color: "#2563eb", fontSize: 22 }} />
                {t("payslip_preview", "Payslip Preview")}
              </Typography>
              <PayslipPreviewContent objPayslip={objPayslip} />
            </Paper>
          ) : null}
        </Stack>
      </Paper>
    </Box>
  );
}
