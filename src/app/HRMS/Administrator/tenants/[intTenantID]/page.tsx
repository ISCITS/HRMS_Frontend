import { Paper } from "@mui/material";
import TenantAdminShell from "@/features/tenant-admin/components/TenantAdminShell";
import TenantAdminTenantEditorPage from "@/features/tenant-admin/components/TenantAdminTenantEditorPage";

export default async function TenantAdministratorEditRoutePage({ params }: { params: Promise<{ intTenantID: string }> }) {
  const { intTenantID } = await params;
  return (
    <TenantAdminShell>
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <TenantAdminTenantEditorPage intTenantID={Number(intTenantID)} />
      </Paper>
    </TenantAdminShell>
  );
}
