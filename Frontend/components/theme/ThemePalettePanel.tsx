"use client";

import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { useThemeMode } from "@/components/ThemeModeProvider";
import { ThemePreset } from "@/lib/theme";
import dicConstant from "@/constants/Constant.json";

const presetOptions: { value: ThemePreset; label: string; color: string }[] = [
  { value: "ocean", label: dicConstant.theme.presets.ocean, color: "#0d47a1" },
  { value: "emerald", label: dicConstant.theme.presets.emerald, color: "#166534" },
  { value: "sunset", label: dicConstant.theme.presets.sunset, color: "#c2410c" },
  { value: "violet", label: dicConstant.theme.presets.violet, color: "#5b21b6" },
  { value: "rose", label: dicConstant.theme.presets.rose, color: "#be123c" },
  { value: "cyan", label: dicConstant.theme.presets.cyan, color: "#0e7490" },
  { value: "amber", label: dicConstant.theme.presets.amber, color: "#b45309" },
  { value: "slate", label: dicConstant.theme.presets.slate, color: "#334155" },
  { value: "indigo", label: dicConstant.theme.presets.indigo, color: "#3730a3" },
  { value: "lime", label: dicConstant.theme.presets.lime, color: "#4d7c0f" },
  { value: "vibgyorLight", label: dicConstant.theme.presets.vibgyorLight, color: "#7c83fd" },
  { value: "softLight", label: dicConstant.theme.presets.softLight, color: "#3b82f6" }
];

// Renders clickable theme preset cards and applies selected preset globally.
export default function ThemePalettePanel() {
  // Functional responsibility:
  // - Render selectable palette cards and apply selected theme preset globally.
  // Inputs:
  // - Reads current preset and setPreset handler from theme context.
  // Output:
  // - Theme-card grid with applied/active state feedback.
  // Failure behavior:
  // - If provider is missing, useThemeMode throws explicit context error.
  const { preset, setPreset } = useThemeMode();

  return (
    <Stack spacing={2}>
      <Typography variant="body1" color="text.secondary">
        {dicConstant.theme.description}
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap">
        {presetOptions.map((option) => {
          const selected = preset === option.value;
          return (
            <Paper
              key={option.value}
              sx={{
                p: 2,
                minWidth: 190,
                border: selected ? "2px solid" : "1px solid",
                borderColor: selected ? "primary.main" : "divider"
              }}
            >
              <Stack spacing={1.5}>
                <Box sx={{ height: 48, borderRadius: 1.5, backgroundColor: option.color }} />
                <Typography fontWeight={700}>{option.label}</Typography>
                <Button
                  variant={selected ? "contained" : "outlined"}
                  startIcon={selected ? <CheckCircleOutlineIcon /> : undefined}
                  onClick={() => setPreset(option.value)}
                >
                  {selected ? dicConstant.theme.appliedButton : dicConstant.theme.applyButton}
                </Button>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Stack>
  );
}
