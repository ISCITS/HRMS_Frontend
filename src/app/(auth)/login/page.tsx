import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthLoginExperience from "@/components/auth/AuthLoginExperience";
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

  if (strTenantUUID) {
    redirect(`${appRoutes.login}/${encodeURIComponent(strTenantUUID)}`);
  }

  return <AuthLoginExperience strMode="generic" />;
}
