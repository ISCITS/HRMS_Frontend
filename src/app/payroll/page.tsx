import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import ScheduleSendOutlinedIcon from "@mui/icons-material/ScheduleSendOutlined";
import { Box, Button, Grid, Stack, Typography } from "@mui/material";
import PremiumCard from "@/components/ui/PremiumCard";
import PayrollKpiCard from "@/features/payroll/components/PayrollKpiCard";

export default function PayrollPage() {
  return (
    <Stack
      spacing={4}
      sx={{
        backgroundColor: "#f8fafc",
        animation: "payrollFadeIn 200ms ease-out",
        "@keyframes payrollFadeIn": {
          from: { opacity: 0, transform: "translateY(8px)" },
          to: { opacity: 1, transform: "translateY(0)" }
        }
      }}
    >
      <PremiumCard sx={{ borderRadius: 3.5 }} intEnableHover={1}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: "#0f172a" }}>
              Payroll Module
            </Typography>
            <Typography sx={{ color: "#64748b", mt: 0.75 }}>
              Manage salary cycles, approvals, and payslip distribution from one workspace.
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button
              href="/payroll/runs"
              variant="contained"
              sx={{
                minHeight: 52,
                px: 2.75,
                borderRadius: "14px",
                fontWeight: 600,
                backgroundColor: "#2563eb",
                boxShadow: "0 6px 16px rgba(37,99,235,0.35)",
                transition: "all 0.15s ease",
                "&:hover": {
                  transform: "translateY(-1px)",
                  backgroundColor: "#1d4ed8"
                },
                "&:active": {
                  transform: "translateY(0)"
                }
              }}
            >
              Payroll Runs
            </Button>
            <Button
              href="/payroll/statutory-rules"
              variant="outlined"
              sx={{
                minHeight: 52,
                px: 2.5,
                borderRadius: "14px",
                fontWeight: 600,
                borderColor: "#0f766e",
                color: "#0f766e",
                transition: "all 0.2s ease",
                "&:hover": {
                  backgroundColor: "rgba(15,118,110,0.06)",
                  borderColor: "#115e59"
                }
              }}
            >
              Statutory Rules
            </Button>
            <Button
              href="/payroll/employee-payroll-inputs"
              variant="outlined"
              sx={{
                minHeight: 52,
                px: 2.5,
                borderRadius: "14px",
                fontWeight: 600,
                borderColor: "#9333ea",
                color: "#7e22ce",
                transition: "all 0.2s ease",
                "&:hover": {
                  backgroundColor: "rgba(147,51,234,0.06)",
                  borderColor: "#7e22ce"
                }
              }}
            >
              Employee Inputs
            </Button>
          </Stack>
        </Stack>
      </PremiumCard>

      <Grid
        container
        rowSpacing={3}
        columnSpacing={{ xs: 0, sm: 3 }}
        sx={{
          mx: 0,
          "& > .MuiGrid-item:first-of-type": { pl: "0 !important" },
          "& > .MuiGrid-item:last-of-type": { pr: "0 !important" }
        }}
      >
        <Grid item xs={12} sm={6} md={3}>
          <PayrollKpiCard
            strTitle="Monthly Gross Payout"
            strValue="$482,000"
            strTrend="+4.2% MoM"
            strTrendTone="positive"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <PayrollKpiCard
            strTitle="Net Pay Disbursed"
            strValue="$437,640"
            strTrend="+3.8% MoM"
            strTrendTone="positive"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <PayrollKpiCard
            strTitle="Pending Approvals"
            strValue="7"
            strTrend="-2 since yesterday"
            strTrendTone="negative"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <PayrollKpiCard
            strTitle="Payslips Sent"
            strValue="117 / 124"
            strTrend="94.3% completion"
            strTrendTone="neutral"
          />
        </Grid>
      </Grid>

      <Grid
        container
        rowSpacing={3}
        columnSpacing={{ xs: 0, sm: 3 }}
        sx={{
          mx: 0,
          "& > .MuiGrid-item:first-of-type": { pl: "0 !important" },
          "& > .MuiGrid-item:last-of-type": { pr: "0 !important" }
        }}
      >
        <Grid item xs={12} md={4}>
          <PremiumCard
            sx={{
              p: 3,
              height: "100%",
              borderRadius: 2.5,
              border: "none",
              backgroundColor: "#f1f5f9",
              boxShadow: "0 8px 24px rgba(0,0,0,0.05)"
            }}
            intEnableHover={1}
          >
            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1.5 }}>
              <AccountBalanceWalletOutlinedIcon sx={{ color: "#2563eb" }} />
              <Typography sx={{ fontWeight: 600, color: "#0f172a" }}>Current Cycle</Typography>
            </Stack>
            <Typography sx={{ color: "#475569", fontSize: 15, fontWeight: 500, lineHeight: 1.6 }}>
              March 2026 payroll is in final review stage.
            </Typography>
          </PremiumCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <PremiumCard
            sx={{
              p: 3,
              height: "100%",
              borderRadius: 2.5,
              border: "none",
              backgroundColor: "#f1f5f9",
              boxShadow: "0 8px 24px rgba(0,0,0,0.05)"
            }}
            intEnableHover={1}
          >
            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1.5 }}>
              <ScheduleSendOutlinedIcon sx={{ color: "#2563eb" }} />
              <Typography sx={{ fontWeight: 600, color: "#0f172a" }}>Next Disbursement</Typography>
            </Stack>
            <Typography sx={{ color: "#475569", fontSize: 15, fontWeight: 500, lineHeight: 1.6 }}>
              Scheduled for March 31, 2026 at 10:00 AM.
            </Typography>
          </PremiumCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <PremiumCard
            sx={{
              p: 3,
              height: "100%",
              borderRadius: 2.5,
              border: "none",
              backgroundColor: "#f1f5f9",
              boxShadow: "0 8px 24px rgba(0,0,0,0.05)"
            }}
            intEnableHover={1}
          >
            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1.5 }}>
              <ReceiptLongOutlinedIcon sx={{ color: "#2563eb" }} />
              <Typography sx={{ fontWeight: 600, color: "#0f172a" }}>Compliance Status</Typography>
            </Stack>
            <Typography sx={{ color: "#475569", fontSize: 15, fontWeight: 500, lineHeight: 1.6 }}>
              Tax and PF filings are up to date for this period.
            </Typography>
          </PremiumCard>
        </Grid>
      </Grid>
    </Stack>
  );
}

