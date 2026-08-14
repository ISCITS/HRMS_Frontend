"use client";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import MonetizationOnRoundedIcon from "@mui/icons-material/MonetizationOnRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import { Box, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import { useEmployeeLabels } from "@/features/employee/hooks/useEmployeeLabels";
import { employeeSalaryService } from "@/features/employee-salary/services/employeeSalaryService";
import type { EmployeeSalaryDetailRecord, EmployeeSalarySummaryRecord } from "@/features/employee-salary/types";
import { calculateEmployeeSalaryBaseSummaryMetrics } from "@/features/employee-salary/utils/employeeSalarySummary";

function formatCurrency(decValue: number | null) {
  if (decValue === null) {
    return "-";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(decValue);
}

function formatSummaryDate(strValue: string | null | undefined) {
  if (!strValue) {
    return "-";
  }
  const dtValue = new Date(`${strValue.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(dtValue.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(dtValue);
}

type EmployeeSalarySummaryCardProps = {
  intEmployeeID?: number | null;
  blnHideOpenPageButton?: boolean;
};

export default function EmployeeSalarySummaryCard({ intEmployeeID, blnHideOpenPageButton = false }: EmployeeSalarySummaryCardProps) {
  const objRouter = useRouter();
  const { t } = useEmployeeLabels();
  const [objSummary, setObjSummary] = useState<EmployeeSalarySummaryRecord | null>(null);
  const [objSalaryDetail, setObjSalaryDetail] = useState<EmployeeSalaryDetailRecord | null>(null);
  const [blnLoading, setBlnLoading] = useState(false);
  const dicBaseSummaryMetrics = calculateEmployeeSalaryBaseSummaryMetrics(objSalaryDetail);
  const decGrossAnnual = intEmployeeID ? dicBaseSummaryMetrics.decGrossMonthly * 12 : null;
  const decNetAnnual = intEmployeeID
    ? (objSalaryDetail?.objSalarySummary?.decNetFixedMonthly ?? dicBaseSummaryMetrics.decGrossMonthly) * 12
    : null;

  function openSalaryPage() {
    if (!intEmployeeID) {
      return;
    }
    const strReturnTo = `${window.location.pathname}${window.location.search}`;
    objRouter.push(`/employee-salary/${intEmployeeID}?returnTo=${encodeURIComponent(strReturnTo)}`);
  }

  useEffect(() => {
    let blnMounted = true;
    if (!intEmployeeID) {
      setObjSummary(null);
      setObjSalaryDetail(null);
      return;
    }
    setBlnLoading(true);
    Promise.all([
      employeeSalaryService.getEmployeeSalarySummary(intEmployeeID),
      employeeSalaryService.getEmployeeSalaryDetail(intEmployeeID)
    ])
      .then(([objSummaryResult, objDetailResult]) => {
        if (blnMounted) {
          setObjSummary(objSummaryResult);
          setObjSalaryDetail(objDetailResult);
        }
      })
      .catch(() => {
        if (blnMounted) {
          setObjSummary(null);
          setObjSalaryDetail(null);
        }
      })
      .finally(() => {
        if (blnMounted) {
          setBlnLoading(false);
        }
      });
    return () => {
      blnMounted = false;
    };
  }, [intEmployeeID]);

  return (
    <Paper
      sx={{
        borderRadius: "26px",
        p: { xs: 2, md: 2.5 },
        border: "1px solid rgba(148,163,184,0.24)",
        background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(240,249,255,0.96) 100%)"
      }}
    >
      <Box
        sx={{
          display: "grid",
          alignItems: "center",
          gap: { xs: 2, md: 2.5 },
          gridTemplateColumns: { xs: "1fr", md: "minmax(190px, .8fr) repeat(3, minmax(150px, 1fr)) minmax(145px, .75fr) auto" }
        }}
      >
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: "16px",
                display: "grid",
                placeItems: "center",
                bgcolor: "rgba(14,165,233,0.12)",
                color: "#0369a1"
              }}
            >
              <MonetizationOnRoundedIcon />
            </Box>
            <Typography sx={{ fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>{t("salary_summary_card_title", "Salary Summary")}</Typography>
          </Stack>

        {!intEmployeeID ? (
          <Typography sx={{ color: "#64748b", gridColumn: { md: "2 / 6" } }}>
            {t("salary_summary_card_save_employee_first", "Save the employee first to view salary information.")}
          </Typography>
        ) : blnLoading ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, color: "#64748b", gridColumn: { md: "2 / 6" } }}>
            <CircularProgress size={18} />
            <Typography>{t("salary_summary_card_loading", "Loading salary summary...")}</Typography>
          </Box>
        ) : (
          <>
            <Stack direction="row" spacing={1.1} alignItems="center">
              <Box sx={{ width: 36, height: 36, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: "#e8f8ee", color: "#16a34a", flexShrink: 0 }}><CalendarMonthRoundedIcon sx={{ fontSize: 20 }} /></Box>
              <Box><Typography sx={{ color: "#526581", fontSize: "0.78rem", fontWeight: 700 }}>{t("salary_summary_card_ctc_annual", "CTC Annual")}</Typography><Typography sx={{ color: "#075fe4", fontSize: "1.08rem", fontWeight: 800 }}>{formatCurrency(dicBaseSummaryMetrics.decAnnualCtc)}</Typography></Box>
            </Stack>
            <Stack direction="row" spacing={1.1} alignItems="center">
              <Box sx={{ width: 36, height: 36, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: "#eaf1ff", color: "#2563eb", flexShrink: 0 }}><AccountBalanceWalletRoundedIcon sx={{ fontSize: 20 }} /></Box>
              <Box><Typography sx={{ color: "#526581", fontSize: "0.78rem", fontWeight: 700 }}>{t("salary_summary_card_gross_annual", "Gross Annual")}</Typography><Typography sx={{ color: "#075fe4", fontSize: "1.08rem", fontWeight: 800 }}>{formatCurrency(decGrossAnnual)}</Typography></Box>
            </Stack>
            <Stack direction="row" spacing={1.1} alignItems="center">
              <Box sx={{ width: 36, height: 36, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: "#f3eaff", color: "#7c3aed", flexShrink: 0 }}><SavingsRoundedIcon sx={{ fontSize: 20 }} /></Box>
              <Box><Typography sx={{ color: "#526581", fontSize: "0.78rem", fontWeight: 700 }}>{t("salary_summary_card_net_annual", "Net Annual")}</Typography><Typography sx={{ color: "#075fe4", fontSize: "1.08rem", fontWeight: 800 }}>{formatCurrency(decNetAnnual)}</Typography></Box>
            </Stack>
            <Box>
              <Typography sx={{ color: "#526581", fontSize: "0.78rem", fontWeight: 700 }}>{t("salary_summary_card_revised_on", "Salary Revised On")}</Typography>
              <Typography sx={{ color: "#0f172a", fontWeight: 800 }}>{formatSummaryDate(objSummary?.objCurrentSalarySnapshot?.dtEffectiveFrom)}</Typography>
            </Box>
          </>
        )}
        {!blnHideOpenPageButton ? (
          <Button
            controlId="employee-salary.summary.open-page.button"
            className={styles.primaryButton}
            variant="contained"
            endIcon={<ArrowForwardRoundedIcon />}
            onClick={openSalaryPage}
            disabled={!intEmployeeID}
            sx={{ borderRadius: "12px", px: 2, minHeight: 40, whiteSpace: "nowrap", justifySelf: { md: "end" } }}
          >
            {t("salary_summary_card_open_page", "Open Salary Page")}
          </Button>
        ) : null}
      </Box>
    </Paper>
  );
}
