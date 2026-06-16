"use client";

import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import { Box, Grid, Paper, Stack, Typography } from "@mui/material";

import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import type { CurrentUserContext, MenuResponse } from "@/models/AuthModels";

type DashboardLandingProps = {
  objUserContext: CurrentUserContext;
  objMenu: MenuResponse;
};

function toRoleLabelKey(strRoleName: string) {
  return `role_${strRoleName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`;
}

export default function DashboardLanding({ objUserContext, objMenu }: DashboardLandingProps) {
  const { t } = useModuleLabels("common");
  const strRoleSummary = objUserContext.objUser.lstRoles.length
    ? objUserContext.objUser.lstRoles.map((strRoleName) => t(toRoleLabelKey(strRoleName), strRoleName)).join(", ")
    : t("workspace_user", "Workspace user");
  const strDisplayWorkspaceName = t("workspace_name", "HRMS");
  const lstOverviewCards = [
    {
      strKey: "workforce",
      strTitle: t("dashboard_card_workforce_title", "Workforce Administration"),
      strDescription: t(
        "dashboard_card_workforce_desc",
        "Centralized employee records, master data governance, and organization-wide visibility."
      ),
      objIcon: <BadgeRoundedIcon sx={{ color: "#f97316", fontSize: 30 }} />
    },
    {
      strKey: "attendance",
      strTitle: t("dashboard_card_attendance_title", "Attendance and Leave"),
      strDescription: t(
        "dashboard_card_attendance_desc",
        "Track shifts, review attendance posture, and manage time-off operations from one place."
      ),
      objIcon: <CalendarMonthRoundedIcon sx={{ color: "#f97316", fontSize: 30 }} />
    },
    {
      strKey: "payroll",
      strTitle: t("dashboard_card_payroll_title", "Payroll Operations"),
      strDescription: t(
        "dashboard_card_payroll_desc",
        "Prepare salary workflows, align payout cycles, and keep finance-ready HR operations."
      ),
      objIcon: <PaymentsRoundedIcon sx={{ color: "#f97316", fontSize: 30 }} />
    }
  ];

  return (
    <Stack spacing={3}>
      <Paper
        sx={{
          overflow: "hidden",
          borderRadius: "32px",
          background: "linear-gradient(135deg, #fff8f1 0%, #fff1df 38%, #fde7cf 100%)",
          border: "1px solid rgba(249,115,22,0.12)",
          boxShadow: "0 18px 45px rgba(15, 23, 42, 0.06)"
        }}
      >
        <Box
          sx={{
            p: { xs: 3, md: 4.5 },
            background: "radial-gradient(circle at top right, rgba(249,115,22,0.18), transparent 34%)"
          }}
        >
          <Typography sx={{ color: "#c2410c", fontWeight: 700, letterSpacing: "0.16em", fontSize: "0.78rem" }}>
            {t("dashboard_hero_eyebrow", "HRMS PROJECT")}
          </Typography>
          <Typography
            variant="h2"
            sx={{
              mt: 1.5,
              fontSize: { xs: "2.2rem", md: "3.25rem" },
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              color: "#111827",
              fontWeight: 800
            }}
          >
            {t("dashboard_hero_title", "Human Resource Management System.")}
          </Typography>
          <Typography sx={{ mt: 2, maxWidth: 860, color: "#4b5563", lineHeight: 1.75, fontSize: "1rem" }}>
          
          </Typography>
          <Typography sx={{ mt: 2.5, color: "#1f2937", fontWeight: 700 }}>
            {strDisplayWorkspaceName} | {strRoleSummary}
          </Typography>
        </Box>
      </Paper>

      <Grid container spacing={2.5}>
        {lstOverviewCards.map((objCard) => (
          <Grid key={objCard.strKey} item xs={12} md={4}>
            <Paper
              sx={{
                p: 3,
                height: "100%",
                borderRadius: "24px",
                border: "1px solid rgba(148, 163, 184, 0.18)",
                boxShadow: "0 14px 28px rgba(15, 23, 42, 0.04)"
              }}
            >
              <Box
                sx={{
                  width: 54,
                  height: 54,
                  borderRadius: "18px",
                  display: "grid",
                  placeItems: "center",
                  backgroundColor: "rgba(249,115,22,0.10)"
                }}
              >
                {objCard.objIcon}
              </Box>
              <Typography variant="h6" sx={{ mt: 2.25, color: "#111827", fontWeight: 700 }}>
                {objCard.strTitle}
              </Typography>
              <Typography sx={{ mt: 1, color: "#6b7280", lineHeight: 1.7 }}>
                {objCard.strDescription}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
