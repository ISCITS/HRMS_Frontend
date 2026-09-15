import AuthLoginExperience from "@/components/auth/AuthLoginExperience";

export default async function TenantLoginPage({
  params
}: {
  params: Promise<{ tenantUuid: string }>;
}) {
  const { tenantUuid } = await params;
  return <AuthLoginExperience strMode="tenant" strTenantUUID={tenantUuid} />;
}
