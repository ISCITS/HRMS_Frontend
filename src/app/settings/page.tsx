import { Paper, Typography } from "@mui/material";
import SettingsPanel from "@/components/shared/settings/SettingsPanel";

export default function SettingsPage() {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Settings
      </Typography>
      <SettingsPanel />
    </Paper>
  );
}

