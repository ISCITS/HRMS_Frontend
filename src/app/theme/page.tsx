import { Paper, Typography } from "@mui/material";
import ThemePalettePanel from "@/components/shared/theme/ThemePalettePanel";

export default function ThemePage() {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Theme
      </Typography>
      <ThemePalettePanel />
    </Paper>
  );
}

