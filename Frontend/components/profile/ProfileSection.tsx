import { Divider, Stack, Typography } from "@mui/material";
import { ReactNode } from "react";

type ProfileSectionProps = {
  strTitle: string;
  children: ReactNode;
};

// Renders a reusable titled section with divider for Profile screen blocks.
export default function ProfileSection({ strTitle, children }: ProfileSectionProps) {
  // Functional responsibility:
  // - Provide consistent section framing for profile forms/cards.
  // Inputs:
  // - strTitle for section heading and children content block.
  // Output:
  // - Section title + divider + content wrapper with standard spacing.
  // Failure behavior:
  // - No failure branch; renders children as-is.
  return (
    <Stack spacing={2.5}>
      <Stack spacing={1.25}>
        <Typography sx={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>{strTitle}</Typography>
        <Divider sx={{ borderColor: "#e2e8f0" }} />
      </Stack>
      {children}
    </Stack>
  );
}
