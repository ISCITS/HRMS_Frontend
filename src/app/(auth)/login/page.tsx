import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { appConfig, appRoutes } from "@/config";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const objSearchParams = (await searchParams) ?? {};
  const objTenantParam = objSearchParams.tenant;
  const strTenantHint = (Array.isArray(objTenantParam) ? objTenantParam[0] : objTenantParam)?.trim() ?? "";
  const objCookieStore = await cookies();
  const strTenantUUID = strTenantHint || objCookieStore.get(appConfig.tenantCookieName)?.value?.trim() || "";

  redirect(strTenantUUID ? `${appRoutes.login}/${encodeURIComponent(strTenantUUID)}` : "/session-expired");
}
