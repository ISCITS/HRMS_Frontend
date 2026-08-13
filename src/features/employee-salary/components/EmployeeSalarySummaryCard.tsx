"use client";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import MonetizationOnRoundedIcon from "@mui/icons-material/MonetizationOnRounded";
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import { Box, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import { useEmployeeLabels } from "@/features/employee/hooks/useEmployeeLabels";
import { employeeSalaryService } from "@/features/employee-salary/services/employeeSalaryService";
import type { EmployeeSalaryDetailRecord } from "@/features/employee-salary/types";
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

function formatDate(strValue: string | null | undefined) {
  if (!strValue) {
    return "-";
  }
  const objDate = new Date(`${strValue.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(objDate.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(objDate);
}

type EmployeeSalarySummaryCardProps = {
  intEmployeeID?: number | null;
  blnHideOpenPageButton?: boolean;
};

export default function EmployeeSalarySummaryCard({ intEmployeeID, blnHideOpenPageButton = false }: EmployeeSalarySummaryCardProps) {
  const objRouter = useRouter();
  const { t } = useEmployeeLabels();
  const [objSalaryDetail, setObjSalaryDetail] = useState<EmployeeSalaryDetailRecord | null>(null);
  const [blnLoading, setBlnLoading] = useState(false);
  const dicBaseSummaryMetrics = calculateEmployeeSalaryBaseSummaryMetrics(objSalaryDetail);
  const decGrossAnnual = dicBaseSummaryMetrics.decGrossMonthly * 12;
  const decEmployeeDeductionsMonthly = Number(objSalaryDetail?.objSalarySummary?.decEmployeeDeductionsMonthly ?? 0);
  const decNetAnnual = Math.max(dicBaseSummaryMetrics.decGrossMonthly - decEmployeeDeductionsMonthly, 0) * 12;

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
      setObjSalaryDetail(null);
      return;
    }
    setBlnLoading(true);
    employeeSalaryService.getEmployeeSalaryDetail(intEmployeeID)
      .then((objDetailResult) => {
        if (blnMounted) {
          setObjSalaryDetail(objDetailResult);
        }
      })
      .catch(() => {
        if (blnMounted) {
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
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", lg: "center" }}
          spacing={1.5}
        >
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flexShrink: 0 }}>
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
            <Box>
              <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>{t("salary_summary_card_title", "Salary Summary")}</Typography>
            </Box>
          </Stack>

          {intEmployeeID && !blnLoading ? (
            <Box
              sx={{
                display: "grid",
                flex: 1,
                gap: { xs: 1.5, md: 1 },
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
                ml: { lg: 2 }
              }}
            >
              {[
                {
                  strLabel: t("salary_summary_card_ctc_annual", "CTC Annual"),
                  strValue: formatCurrency(dicBaseSummaryMetrics.decAnnualCtc),
                  objIcon: <CalendarMonthOutlinedIcon sx={{ fontSize: 17 }} />,
                  strIconBackground: "#e7f5ec",
                  strIconColor: "#15803d"
                },
                {
                  strLabel: t("salary_summary_card_gross_annual", "Gross Annual"),
                  strValue: formatCurrency(decGrossAnnual),
                  objIcon: <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 17 }} />,
                  strIconBackground: "#eaf0ff",
                  strIconColor: "#155eef"
                },
                {
                  strLabel: t("salary_summary_card_net_annual", "Net Annual"),
                  strValue: formatCurrency(decNetAnnual),
                  objIcon: <SavingsOutlinedIcon sx={{ fontSize: 17 }} />,
                  strIconBackground: "#f1eafe",
                  strIconColor: "#7c3aed"
                },
                {
                  strLabel: t("salary_summary_card_salary_revised_on", "Salary Revised On"),
                  strValue: formatDate(objSalaryDetail?.objCurrentSalarySnapshot?.dtEffectiveFrom ?? objSalaryDetail?.objAssignedStructure?.dtEffectiveFrom),
                  objIcon: null,
                  strIconBackground: "transparent",
                  strIconColor: "transparent"
                }
              ].map((dicMetric) => (
                <Stack key={dicMetric.strLabel} direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                  {dicMetric.objIcon ? (
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        bgcolor: dicMetric.strIconBackground,
                        color: dicMetric.strIconColor,
                        display: "grid",
                        flexShrink: 0,
                        placeItems: "center"
                      }}
                    >
                      {dicMetric.objIcon}
                    </Box>
                  ) : null}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ color: "#52667f", fontSize: "0.78rem", fontWeight: 700 }}>
                      {dicMetric.strLabel}
                    </Typography>
                    <Typography
                      sx={{
                        color: dicMetric.objIcon ? "#155eef" : "#0f172a",
                        fontSize: dicMetric.objIcon ? "1.05rem" : "0.94rem",
                        fontWeight: dicMetric.objIcon ? 900 : 700,
                        whiteSpace: "nowrap"
                      }}
                    >
                      {dicMetric.strValue}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Box>
          ) : null}

          {!blnHideOpenPageButton ? (
            <Button
              controlId="employee-salary.summary.open-page.button"
              className={styles.primaryButton}
              variant="contained"
              endIcon={<ArrowForwardRoundedIcon />}
              onClick={openSalaryPage}
              disabled={!intEmployeeID}
              sx={{ borderRadius: "14px", px: 2 }}
            >
              {t("salary_summary_card_open_page", "Open Salary Page")}
            </Button>
          ) : null}
        </Stack>

        {!intEmployeeID ? (
          <Typography sx={{ color: "#64748b" }}>
            {t("salary_summary_card_save_employee_first", "Save the employee first to view salary information.")}
          </Typography>
        ) : blnLoading ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, color: "#64748b" }}>
            <CircularProgress size={18} />
            <Typography>{t("salary_summary_card_loading", "Loading salary summary...")}</Typography>
          </Box>
        ) : null}
      </Stack>
    </Paper>
  );
}
