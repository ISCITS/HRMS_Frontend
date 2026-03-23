import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { appConfig, appRoutes } from "@/config";

export default async function RootPage() {
  const objCookieStore = await cookies();
  const strAccessToken = objCookieStore.get(appConfig.authCookieName)?.value;
  redirect(strAccessToken ? appRoutes.dashboard : appRoutes.login);
}