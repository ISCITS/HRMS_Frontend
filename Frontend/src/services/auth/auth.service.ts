import { appConfig } from "@/config";
import { callAPI } from "@/services/apiService";

export type LoginPayload = {
  userId: string;
  password: string;
};

export type LoginResult = {
  isAuthenticated: true;
  userId: string;
};

/*
Functional responsibility:
- Centralize client-side auth session helpers used by the login experience.

Inputs:
- User credentials for login requests.

Output:
- Auth result payload and persisted session state for the current browser.

Failure behavior:
- Throws when the login API request fails.
*/
export const authService = {
  async login(payload: LoginPayload): Promise<LoginResult> {
    const response = await callAPI<LoginResult>(payload, "auth/login", "AUTH_LOGIN");
    return response.Response;
  },

  clearSession() {
    if (typeof document === "undefined") {
      return;
    }

    document.cookie = `${appConfig.authCookieName}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
};
