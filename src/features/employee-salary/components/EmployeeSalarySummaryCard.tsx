"use client";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import MonetizationOnRoundedIcon from "@mui/icons-material/MonetizationOnRounded";
import { Box, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import { useEmployeeLabels } from "@/features/employee/hooks/useEmployeeLabels";
import { employeeSalaryService } from "@/features/employee-salary/services/employeeSalaryService";
import type { EmployeeSalarySummaryRecord } from "@/features/employee-salary/types";

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

type EmployeeSalarySummaryCardProps = {
  intEmployeeID?: number | null;
  blnHideOpenPageButton?: boolean;
};

export default function EmployeeSalarySummaryCard({ intEmployeeID, blnHideOpenPageButton = false }: EmployeeSalarySummaryCardProps) {
  const objRouter = useRouter();
  const { t } = useEmployeeLabels();
  const [objSummary, setObjSummary] = useState<EmployeeSalarySummaryRecord | null>(null);
  const [blnLoading, setBlnLoading] = useState(false);

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
      return;
    }
    setBlnLoading(true);
    employeeSalaryService.getEmployeeSalarySummary(intEmployeeID)
      .then((objResult) => {
        if (blnMounted) {
          setObjSummary(objResult);
        }
      })
      .catch(() => {
        if (blnMounted) {
          setObjSummary(null);
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
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Stack direction="row" spacing={1.25} alignItems="center">
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
              <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>
                {t("salary_summary_card_subtitle", "Snapshot only. Full maintenance stays on the dedicated salary page.")}
              </Typography>
            </Box>
          </Stack>
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
        ) : (
          <Box
            sx={{
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" }
            }}
          >
            <Box>
              <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("salary_summary_card_current_structure", "Current Structure")}</Typography>
              <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>
                {objSummary?.objAssignedStructure?.strStructureName ?? t("salary_summary_card_not_assigned", "Not assigned")}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("salary_summary_card_gross_monthly", "Gross Monthly")}</Typography>
              <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>
                {formatCurrency(objSummary?.objCurrentSalarySnapshot?.decGrossMonthly ?? null)}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("salary_summary_card_ctc_annual", "CTC Annual")}</Typography>
              <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>
                {formatCurrency(objSummary?.objCurrentSalarySnapshot?.decCtcAnnual ?? null)}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("salary_summary_card_revisions", "Revisions")}</Typography>
              <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>
                {objSummary?.intRevisionCount ?? 0}
              </Typography>
            </Box>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
