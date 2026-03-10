import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Avatar, Box, Button, Divider, Grid, LinearProgress, Stack, Typography } from "@mui/material";
import PremiumCard from "@/components/dashboard/PremiumCard";
import SaasKpiCard from "@/components/dashboard/SaasKpiCard";

export default function DashboardPage() {
  const lstAttendanceByTeam = [
    { team: "Engineering", value: 92 },
    { team: "HR", value: 88 },
    { team: "Finance", value: 96 },
    { team: "Sales", value: 81 }
  ];

  const lstRecentActivities = [
    "Ava Johnson requested leave approval",
    "Noah Davis completed monthly attendance review",
    "2 new employees were onboarded this week"
  ];

  return (
    <Stack
      spacing={4}
      sx={{
        backgroundColor: "#f8fafc",
        px: { xs: 0, sm: 1.5 },
        animation: "dashboardFadeIn 200ms ease-out",
        "@keyframes dashboardFadeIn": {
          from: { opacity: 0, transform: "translateY(8px)" },
          to: { opacity: 1, transform: "translateY(0)" }
        }
      }}
    >
      <PremiumCard intEnableHover={1}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ md: "center" }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography sx={{ fontSize: { xs: 30, md: 34 }, lineHeight: 1.15, fontWeight: 700 }}>
              HRMS SaaS Dashboard
            </Typography>
            <Typography sx={{ color: "#475569", mt: 1 }}>
              Real-time people insights, approvals, and workforce health at a glance.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Button
              href="/employees/new"
              variant="contained"
              sx={{
                borderRadius: "14px",
                backgroundColor: "#2563eb",
                boxShadow: "0 6px 16px rgba(37,99,235,0.35)",
                transition: "all 0.2s ease",
                "&:hover": {
                  transform: "translateY(-1px)",
                  backgroundColor: "#1d4ed8"
                }
              }}
            >
              Add Employee
            </Button>
            <Button href="/leave" variant="outlined" sx={{ borderRadius: "14px", transition: "all 0.2s ease" }}>
              Review Leave
            </Button>
          </Stack>
        </Stack>
      </PremiumCard>

      <Grid
        container
        rowSpacing={3}
        columnSpacing={{ xs: 0, sm: 3 }}
        sx={{ mx: 0, "& > .MuiGrid-item:first-of-type": { pl: "0 !important" } }}
      >
        <Grid item xs={12} sm={6} md={3}>
          <SaasKpiCard title="Total Workforce" value="124" trend="+8% this month" trendUp />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SaasKpiCard title="Today's Presence" value="110" trend="+2% vs yesterday" trendUp />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SaasKpiCard title="Pending Leaves" value="05" trend="-1 from last week" trendUp={false} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SaasKpiCard title="Attrition Risk" value="3.2%" trend="-0.6% trend" trendUp={false} />
        </Grid>
      </Grid>

      <Grid
        container
        rowSpacing={3}
        columnSpacing={{ xs: 0, sm: 3 }}
        sx={{ mx: 0, "& > .MuiGrid-item:first-of-type": { pl: "0 !important" } }}
      >
        <Grid item xs={12} md={8}>
          <PremiumCard>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
              <GroupOutlinedIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Attendance By Team
              </Typography>
            </Stack>
            <Stack spacing={2.2}>
              {lstAttendanceByTeam.map((dicItem) => (
                <Box
                  key={dicItem.team}
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: "#f1f5f9"
                    }
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                    <Typography variant="body2" color="text.secondary">
                      {dicItem.team}
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {dicItem.value}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={dicItem.value}
                    sx={{
                      height: 8,
                      borderRadius: "999px",
                      bgcolor: "#e2e8f0",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: "999px",
                        transition: "transform 0.4s ease"
                      }
                    }}
                  />
                </Box>
              ))}
            </Stack>
          </PremiumCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <PremiumCard sx={{ height: "100%" }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
              <EventAvailableOutlinedIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Upcoming Events
              </Typography>
            </Stack>
            <Stack divider={<Divider sx={{ borderColor: "#e2e8f0" }} />}>
              <Box sx={{ p: 2, borderRadius: 2, transition: "all 0.2s ease", "&:hover": { backgroundColor: "#f1f5f9" } }}>
                <Typography fontWeight={700}>Payroll Processing</Typography>
                <Typography variant="body2" sx={{ color: "#475569", mt: 0.5 }}>
                  March 01, 2026
                </Typography>
              </Box>
              <Box sx={{ p: 2, borderRadius: 2, transition: "all 0.2s ease", "&:hover": { backgroundColor: "#f1f5f9" } }}>
                <Typography fontWeight={700}>Performance Review Cycle</Typography>
                <Typography variant="body2" sx={{ color: "#475569", mt: 0.5 }}>
                  March 05, 2026
                </Typography>
              </Box>
            </Stack>
          </PremiumCard>
        </Grid>
      </Grid>

      <Grid
        container
        rowSpacing={3}
        columnSpacing={{ xs: 0, sm: 3 }}
        sx={{ mx: 0, "& > .MuiGrid-item:first-of-type": { pl: "0 !important" } }}
      >
        <Grid item xs={12} md={6}>
          <PremiumCard sx={{ height: "100%" }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <BoltOutlinedIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Quick Actions
              </Typography>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} flexWrap="wrap" useFlexGap>
              <Button
                href="/employees/new"
                variant="contained"
                sx={{
                  borderRadius: "14px",
                  boxShadow: "0 6px 16px rgba(37,99,235,0.35)",
                  transition: "all 0.2s ease",
                  "&:hover": { transform: "translateY(-1px)", backgroundColor: "#1d4ed8" }
                }}
              >
                New Employee
              </Button>
              <Button href="/payroll" variant="outlined" sx={{ borderRadius: "14px", transition: "all 0.2s ease", "&:hover": { transform: "translateY(-1px)" } }}>
                Payroll Hub
              </Button>
              <Button href="/leave/apply" variant="outlined" sx={{ borderRadius: "14px", transition: "all 0.2s ease", "&:hover": { transform: "translateY(-1px)" } }}>
                Apply Leave
              </Button>
              <Button href="/attendance" variant="outlined" sx={{ borderRadius: "14px", transition: "all 0.2s ease", "&:hover": { transform: "translateY(-1px)" } }}>
                View Attendance
              </Button>
            </Stack>
          </PremiumCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <PremiumCard sx={{ height: "100%" }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <CampaignOutlinedIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Team Activity Feed
              </Typography>
            </Stack>
            <Stack divider={<Divider sx={{ borderColor: "#e2e8f0" }} />}>
              {lstRecentActivities.map((strActivity, intIndex) => (
                <Stack
                  key={strActivity}
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{
                    py: 1.4,
                    px: 1.2,
                    borderRadius: 2,
                    transition: "all 0.2s ease",
                    "&:hover": { backgroundColor: "#f1f5f9" }
                  }}
                >
                  <Avatar
                    sx={{
                      width: 30,
                      height: 30,
                      fontSize: 12,
                      bgcolor: "rgba(37, 99, 235, 0.1)",
                      color: "primary.main",
                      fontWeight: 600
                    }}
                  >
                    {intIndex + 1}
                  </Avatar>
                  <Typography variant="body2" sx={{ color: "#475569", lineHeight: 1.5 }}>
                    {strActivity}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </PremiumCard>
        </Grid>
      </Grid>

      <PremiumCard sx={{ p: 3.5, borderRadius: 2.5, background: "rgba(37,99,235,0.04)" }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
          <InfoOutlinedIcon color="primary" fontSize="small" />
          <Typography variant="h6" fontWeight={700}>
            HR Announcements
          </Typography>
        </Stack>
        <Typography sx={{ color: "#475569", lineHeight: 1.65 }}>
          Policy update: Flexible work arrangement forms are now available in the employee portal. Deadline for submission is March 10, 2026.
        </Typography>
      </PremiumCard>
    </Stack>
  );
}
