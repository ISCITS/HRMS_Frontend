import { Paper } from "@mui/material";

import TenantOnboardingPage from "@/features/tenants/components/TenantOnboardingPage";

export default function TenantOnboardingRoutePage() {
  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }}>
      <TenantOnboardingPage />
    </Paper>
  );
}
