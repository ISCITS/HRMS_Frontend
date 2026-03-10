import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import TrendLine from "@/components/payroll/TrendLine";

type TrendTone = "positive" | "neutral" | "negative";

type PayrollKpiCardProps = {
  strTitle: string;
  strValue: string;
  strTrend: string;
  strTrendTone?: TrendTone;
  lstTrendPoints?: number[];
};

const dicToneStyle = {
  positive: {
    strBorder: "#16a34a",
    strText: "#16a34a",
    strBg: "rgba(22,163,74,0.08)"
  },
  neutral: {
    strBorder: "#f59e0b",
    strText: "#b45309",
    strBg: "rgba(245,158,11,0.12)"
  },
  negative: {
    strBorder: "#ef4444",
    strText: "#b91c1c",
    strBg: "rgba(239,68,68,0.1)"
  }
} as const;

// Renders a premium payroll KPI card with trend badge and optional sparkline.
export default function PayrollKpiCard({
  strTitle,
  strValue,
  strTrend,
  strTrendTone = "positive",
  lstTrendPoints
}: PayrollKpiCardProps) {
  // Functional responsibility:
  // - Display KPI summary with clear hierarchy and trend context.
  // Inputs:
  // - title, value, trend label, tone, optional sparkline points.
  // Output:
  // - Premium SaaS KPI card for payroll dashboard.
  // Failure behavior:
  // - Missing sparkline points hides chart area while card remains valid.
  const dicTone = dicToneStyle[strTrendTone];

  return (
    <Card
      sx={{
        height: "100%",
        borderRadius: 3,
        border: "none",
        boxShadow: "0 12px 30px rgba(0,0,0,0.06)",
        transition: "all 0.15s ease",
        "&:hover": {
          transform: "translateY(-3px)",
          boxShadow: "0 16px 35px rgba(0,0,0,0.08)"
        }
      }}
    >
      <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
        <Stack spacing={1.5} alignItems="center" sx={{ textAlign: "center" }}>
          <Typography sx={{ color: "#64748b", fontSize: 14, fontWeight: 500 }}>{strTitle}</Typography>
          <Typography sx={{ fontSize: 32, lineHeight: 1.1, fontWeight: 700, color: "#0f172a" }}>{strValue}</Typography>
          <Chip
            label={strTrend}
            size="small"
            variant="outlined"
            sx={{
              width: "fit-content",
              height: 22,
              fontSize: 12,
              fontWeight: 600,
              borderColor: dicTone.strBorder,
              color: dicTone.strText,
              backgroundColor: dicTone.strBg,
              animation: "trendFadeIn 180ms ease-out",
              "@keyframes trendFadeIn": {
                from: { opacity: 0, transform: "translateY(2px)" },
                to: { opacity: 1, transform: "translateY(0)" }
              }
            }}
          />
          {lstTrendPoints && lstTrendPoints.length > 1 ? (
            <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>
              <TrendLine lstPoints={lstTrendPoints} strColor={dicTone.strBorder} />
            </Box>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
