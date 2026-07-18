"use client";

import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PayslipListPage from "@/features/payroll/components/PayslipListPage";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { Box, Typography } from "@mui/material";

export default function EssMyPayslipsPage() {
  const { t } = useModuleLabels("payslips");

  return (
    <>
      <Box className="pageBanner" sx={{ mb: 1.1 }}>
        <Box className="bannerDots" />
        <Box className="bannerIcon">
          <DescriptionOutlinedIcon sx={{ fontSize: 30 }} />
        </Box>
        <Box className="bannerDivider" />
        <Box sx={{ position: "relative", zIndex: 1, flex: 1, minWidth: 0 }}>
          <Typography component="h1" className="bannerTitle">
            {t("ess_title", "My Payslips")}
          </Typography>
          <Typography component="p" className="bannerSubTitle">
            {t("ess_subtitle", "ESS Payroll Documents")}
          </Typography>
        </Box>
      </Box>
      <PayslipListPage blnSelfOnly blnEssMode />
    </>
  );
}
