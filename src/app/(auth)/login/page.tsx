import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthLoginExperience from "@/components/auth/AuthLoginExperience";
import { appConfig, appRoutes } from "@/config";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const objSearchParams = (await searchParams) ?? {};
  const objTenantParam = objSearchParams.tenant ?? objSearchParams.tenantUuid ?? objSearchParams.tenantUUID;
  const strTenantHint = (Array.isArray(objTenantParam) ? objTenantParam[0] : objTenantParam)?.trim() ?? "";
  // Fall back to the remembered tenant cookie (same behaviour as the root page) so a
  // session-expiry "Login again" or a bookmark to "/login" returns the user to their
  // tenant login page instead of the generic email-only experience.
  const objCookieStore = await cookies();
  const strTenantCookie = objCookieStore.get(appConfig.tenantCookieName)?.value?.trim() ?? "";
  const strTenantUUID =
    strTenantHint ||
    strTenantCookie ||
    appConfig.defaultTenantUuid.trim();

  if (strTenantUUID) {
    redirect(`${appRoutes.login}/${encodeURIComponent(strTenantUUID)}`);
  }

  return <AuthLoginExperience strMode="generic" />;
}
