"use client";

import type { InputHTMLAttributes } from "react";
import { Box, Button, FormControlLabel, Stack, Switch, Typography } from "@mui/material";
import dicConstant from "@/constants/Constant.json";

// Renders settings toggles.
export default function SettingsPanel() {
  /*
  Functional responsibility:
  - Render settings toggles.
  
  Inputs:
  - None.
  
  Output:
  - Settings controls and save button UI.
  
  Failure behavior:
  - None.
  */

  return (
    <Stack spacing={3}>
      <Typography variant="body1" color="text.secondary">
        {dicConstant.settings.description}
      </Typography>
      <Stack spacing={1.25}>
        <Box sx={{ px: 1.5, py: 1, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
          <FormControlLabel control={<Switch defaultChecked inputProps={{ "data-testid": "settings.email-notifications.switch" } as InputHTMLAttributes<HTMLInputElement>} />} label={dicConstant.settings.emailNotifications} />
        </Box>
        <Box sx={{ px: 1.5, py: 1, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
          <FormControlLabel control={<Switch inputProps={{ "data-testid": "settings.attendance-summary.switch" } as InputHTMLAttributes<HTMLInputElement>} />} label={dicConstant.settings.attendanceSummary} />
        </Box>
      </Stack>
      <Button variant="contained" sx={{ alignSelf: "flex-start" }} data-testid="settings.save.button">
        {dicConstant.settings.saveButton}
      </Button>
    </Stack>
  );
}
