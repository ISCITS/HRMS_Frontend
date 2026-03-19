import { appConfig } from "@/config";
import { callAPI } from "@/services/apiService";
import { encryptPassBase64 } from "@/lib/passwordEncryption";

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
    const strEncryptedPassword = encryptPassBase64(payload.password);
    const response = await callAPI<LoginResult>(
      {
        ...payload,
        password: strEncryptedPassword
      },
      "users/validateUser",
      "AUTH_LOGIN"
    );

    return response.Response;
  },

  clearSession() {
    if (typeof document === "undefined") {
      return;
    }

    document.cookie = `${appConfig.authCookieName}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
};
