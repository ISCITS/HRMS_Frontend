import { Paper } from "@mui/material";
import TenantAdminShell from "@/features/tenant-admin/components/TenantAdminShell";
import TenantOnboardingPage from "@/features/tenants/components/TenantOnboardingPage";

export default function TenantAdministratorOnboardingRoutePage() {
  return (
    <TenantAdminShell>
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <TenantOnboardingPage />
      </Paper>
    </TenantAdminShell>
  );
}
