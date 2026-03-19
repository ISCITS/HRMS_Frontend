export function getPostLoginRoute(strPreferredRoute?: string | null) {
  if (!strPreferredRoute) {
    return "/dashboard";
  }

  return strPreferredRoute.startsWith("/") ? strPreferredRoute : `/${strPreferredRoute}`;
}
