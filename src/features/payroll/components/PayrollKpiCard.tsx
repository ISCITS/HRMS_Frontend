import { Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import styles from "./PayrollKpiCard.module.css";

type TrendTone = "positive" | "neutral" | "negative";

type PayrollKpiCardProps = {
  strTitle: string;
  strValue: string;
  strTrend: string;
  strTrendTone?: TrendTone;
};

const dicToneClassName = {
  positive: styles.chipPositive,
  neutral: styles.chipNeutral,
  negative: styles.chipNegative
} as const;

// Renders a premium payroll KPI card with trend badge and optional sparkline.
export default function PayrollKpiCard({
  strTitle,
  strValue,
  strTrend,
  strTrendTone = "positive"
}: PayrollKpiCardProps) {
  /*
  Functional responsibility:
  - Display KPI summary with clear hierarchy and trend context.
  
  Inputs:
  - title, value, trend label, tone.
  
  Output:
  - Premium SaaS KPI card for payroll dashboard.
  
  Failure behavior:
  - Missing optional props fall back to default tone.
  */
  const strChipClassName = `${styles.chip} ${dicToneClassName[strTrendTone]}`;

  return (
    <Card className={styles.card}>
      <CardContent className={styles.cardContent}>
        <Stack spacing={1.5} alignItems="center" className={styles.stack}>
          <Typography className={styles.title}>{strTitle}</Typography>
          <Typography className={styles.value}>{strValue}</Typography>
          <Chip
            label={strTrend}
            size="small"
            variant="outlined"
            className={strChipClassName}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
