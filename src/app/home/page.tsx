import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { appConfig, appRoutes } from "@/config";

export default async function HomePage() {
  const objCookieStore = await cookies();
  const strAccessToken = objCookieStore.get(appConfig.authCookieName)?.value;
  const strTenantUUID = objCookieStore.get(appConfig.tenantCookieName)?.value?.trim() ?? "";
  redirect(
    strAccessToken
      ? appRoutes.dashboard
      : strTenantUUID
        ? `${appRoutes.login}/${encodeURIComponent(strTenantUUID)}`
        : appRoutes.login
  );
}
