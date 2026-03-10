import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { Card, CardContent, Chip, Stack, Typography } from "@mui/material";

type SaasKpiCardProps = {
  title: string;
  value: string;
  trend: string;
  trendUp?: boolean;
};

// Shows a SaaS KPI card with trend direction chip.
export default function SaasKpiCard({ title, value, trend, trendUp = true }: SaasKpiCardProps) {
  // Functional responsibility:
  // - Render a KPI metric card with trend direction indicator.
  // Inputs:
  // - title, value, trend text, and optional trend direction flag.
  // Output:
  // - Card with metric value and success/warning trend chip.
  // Failure behavior:
  // - No runtime failure path; missing trendUp defaults to positive state.
  return (
    <Card
      sx={{
        height: "100%",
        borderRadius: 2.5,
        boxShadow: "0 12px 30px rgba(0,0,0,0.06)",
        transition: "all 0.2s ease",
        "&:hover": {
          transform: "translateY(-3px)",
          boxShadow: "0 16px 35px rgba(0,0,0,0.08)"
        }
      }}
    >
      <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
        <Stack spacing={1.5} alignItems="center" sx={{ textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 500 }}>
            {title}
          </Typography>
          <Typography sx={{ fontSize: 36, lineHeight: 1.1, fontWeight: 700, color: "text.primary" }}>
            {value}
          </Typography>
          <Chip
            size="small"
            icon={trendUp ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingDownIcon sx={{ fontSize: 14 }} />}
            label={trend}
            color={trendUp ? "success" : "warning"}
            variant="outlined"
            sx={{ fontWeight: 600, height: 22, fontSize: 12 }}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
