"use client";

import PayslipListPage from "@/features/payroll/components/PayslipListPage";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { Paper, Typography } from "@mui/material";

export default function EssMyPayslipsPage() {
  const { t } = useModuleLabels("payslips");

  return (
    <>
      <Paper
        sx={{
          p: { xs: 1.3, md: 1.6 },
          mb: 1.1,
          borderRadius: "18px",
          border: "1px solid rgba(37, 99, 235, 0.2)",
          boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
          background: "linear-gradient(100deg, #15508d 0%, #196da2 58%, #1a829f 100%)",
          color: "#f8fcff",
        }}
      >
        <Typography sx={{ color: "#f8fcff", fontWeight: 800, fontSize: { xs: "1rem", md: "1.2rem" } }}>
          {t("ess_title", "My Payslips")}
        </Typography>
        <Typography sx={{ color: "rgba(239,252,255,0.9)", mt: 0.2, fontSize: "0.9rem" }}>
          {t("ess_subtitle", "ESS Payroll Documents")}
        </Typography>
      </Paper>
      <PayslipListPage blnSelfOnly blnEssMode />
    </>
  );
}
