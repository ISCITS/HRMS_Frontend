import { appConfig } from "@/config";

/*
Functional responsibility:
- Share lightweight auth helpers across middleware, routes, and services.

Inputs:
- Cookie values or auth state from the current request context.

Output:
- Canonical auth cookie metadata and simple auth checks.

Failure behavior:
- Unknown cookie values are treated as unauthenticated.
*/
export const authHelpers = {
  cookieName: appConfig.authCookieName,
  isAuthenticated(cookieValue?: string) {
    return cookieValue === "1";
  }
};
