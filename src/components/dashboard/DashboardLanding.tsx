"use client";

import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import Groups2RoundedIcon from "@mui/icons-material/Groups2Rounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import TipsAndUpdatesRoundedIcon from "@mui/icons-material/TipsAndUpdatesRounded";
import { Box, Button, Grid, Paper, Stack, Typography } from "@mui/material";

import { enMessages } from "@/i18n/messages/en";
import type { CurrentUserContext, MenuResponse } from "@/models/AuthModels";

type DashboardLandingProps = {
  objUserContext: CurrentUserContext;
  objMenu: MenuResponse;
};

const lstKpis = [
  { strLabel: "Team visibility", strValue: "Live", objIcon: <Groups2RoundedIcon color="primary" /> },
  { strLabel: "Task posture", strValue: "Stable", objIcon: <TaskAltRoundedIcon color="primary" /> },
  { strLabel: "Insights cadence", strValue: "Daily", objIcon: <AutoGraphRoundedIcon color="primary" /> }
];

export default function DashboardLanding({ objUserContext, objMenu }: DashboardLandingProps) {
  return (
    <Stack spacing={3}>
      <Paper
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: "30px",
          background: "linear-gradient(135deg, rgba(15,118,110,0.08), rgba(14,116,144,0.14))"
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={3} justifyContent="space-between">
          <Box>
            <Typography variant="overline" sx={{ color: "#0f766e", fontWeight: 700 }}>
              {enMessages.shell.welcome}
            </Typography>
            <Typography variant="h3" sx={{ mt: 1, fontSize: { xs: 34, md: 46 }, lineHeight: 1.05 }}>
              {enMessages.dashboard.title}
            </Typography>
            <Typography sx={{ mt: 1.5, maxWidth: 720, color: "#475569", lineHeight: 1.7 }}>
              {enMessages.dashboard.subtitle}
            </Typography>
            <Typography sx={{ mt: 2, color: "#0f172a", fontWeight: 700 }}>
              {objUserContext.objTenant.strTenantName} | {objUserContext.objUser.lstRoles.join(", ") || "Workspace user"}
            </Typography>
          </Box>

          <Paper sx={{ minWidth: 260, p: 2.5, borderRadius: "24px" }}>
            <Typography variant="overline" sx={{ color: "#64748b" }}>
              {enMessages.dashboard.homeCardTitle}
            </Typography>
            <Typography variant="h5" sx={{ mt: 1 }}>
              {objMenu.strHomeRoute}
            </Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>
              {enMessages.dashboard.homeCardSubtitle}
            </Typography>
            <Button href={objMenu.strHomeRoute} variant="contained" sx={{ mt: 2 }}>
              Open landing module
            </Button>
          </Paper>
        </Stack>
      </Paper>

      <Grid container spacing={2.5}>
        {lstKpis.map((objKpi) => (
          <Grid key={objKpi.strLabel} item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: "24px", height: "100%" }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: "16px",
                    display: "grid",
                    placeItems: "center",
                    backgroundColor: "rgba(14,116,144,0.1)"
                  }}
                >
                  {objKpi.objIcon}
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "#64748b" }}>
                    {objKpi.strLabel}
                  </Typography>
                  <Typography variant="h5">{objKpi.strValue}</Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 3, borderRadius: "24px" }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <TipsAndUpdatesRoundedIcon color="primary" />
          <Typography variant="h6">Dynamic modules</Typography>
        </Stack>

        {objMenu.lstMenuItems.length === 0 ? (
          <Typography sx={{ color: "#64748b" }}>{enMessages.dashboard.menuEmpty}</Typography>
        ) : (
          <Grid container spacing={2}>
            {objMenu.lstMenuItems.map((objItem) => (
              <Grid key={objItem.strRoute} item xs={12} md={6}>
                <Paper
                  sx={{
                    p: 2.5,
                    borderRadius: "20px",
                    backgroundColor: objItem.blnIsHome ? "rgba(14,116,144,0.08)" : "#fff"
                  }}
                >
                  <Typography variant="overline" sx={{ color: "#64748b" }}>
                    {objItem.strModuleCode}
                  </Typography>
                  <Typography variant="h6">{objItem.strModuleName}</Typography>
                  <Typography sx={{ mt: 0.75, color: "#64748b" }}>{objItem.lstPermissionCodes.join(" | ")}</Typography>
                  <Button href={objItem.strRoute} sx={{ mt: 2 }} variant={objItem.blnIsHome ? "contained" : "outlined"}>
                    Open module
                  </Button>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>
    </Stack>
  );
}
