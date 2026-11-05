import { redirect } from "next/navigation";

export default async function TenantLoginPage({
  params
}: {
  params: Promise<{ tenantUuid: string }>;
}) {
  const { tenantUuid } = await params;
  redirect(`/login/${encodeURIComponent(tenantUuid)}`);
}
