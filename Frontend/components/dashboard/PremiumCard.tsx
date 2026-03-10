import { Paper, SxProps, Theme } from "@mui/material";
import { ReactNode } from "react";

type PremiumCardProps = {
  children: ReactNode;
  sx?: SxProps<Theme>;
  intEnableHover?: 0 | 1;
};

// Provides consistent premium card surface styling for dashboard modules.
export default function PremiumCard({ children, sx, intEnableHover = 0 }: PremiumCardProps) {
  // Functional responsibility:
  // - Wrap content with unified SaaS card depth, radius, and transition styles.
  // Inputs:
  // - children content, optional sx overrides, optional hover enable flag.
  // Output:
  // - Styled Paper container for dashboard blocks.
  // Failure behavior:
  // - No failure path; wrapper renders children as-is.
  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 2.5,
        boxShadow: "0 12px 30px rgba(0,0,0,0.06)",
        transition: "all 0.2s ease",
        ...(intEnableHover === 1
          ? {
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 16px 34px rgba(0,0,0,0.08)"
              }
            }
          : {}),
        ...sx
      }}
    >
      {children}
    </Paper>
  );
}
