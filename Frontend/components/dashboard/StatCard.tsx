import { Card, CardContent, Typography } from "@mui/material";

type StatCardProps = {
  label: string;
  value: string;
};

// Renders a compact label/value metric card.
export default function StatCard({ label, value }: StatCardProps) {
  // Functional responsibility:
  // - Render a compact statistic card used in dashboard summaries.
  // Inputs:
  // - label and value text.
  // Output:
  // - Card showing metric label and emphasized value.
  // Failure behavior:
  // - No exceptional path; invalid/empty text renders as-is.
  return (
    <Card>
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" fontWeight={700}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}
