import AuthLoginExperience from "@/components/auth/AuthLoginExperience";

export default async function TenantLoginFromDefaultRoutePage({
  params
}: {
  params: Promise<{ tenantUuid: string }>;
}) {
  const { tenantUuid } = await params;
  return <AuthLoginExperience strMode="tenant" strTenantUUID={tenantUuid} />;
}
