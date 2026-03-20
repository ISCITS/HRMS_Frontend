import { appConfig } from "@/config";
import { callAPI } from "@/services/apiService";
import { encryptPassBase64 } from "@/lib/passwordEncryption";

export type LoginPayload = {
  userId: string;
  password: string;
};

export type LoginResult = {
  ResultCode: number;
  Msg: string;
  Data?: {
    intUserID: number;
    strSessionToken: string;
  };
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
        UserID: payload.userId,
        Password: strEncryptedPassword
      },
      "users/validateUser",
      "AUTH_LOGIN"
    );
    const dicResult = response.Response;
    if (dicResult.ResultCode !== 1 || !dicResult.Data?.strSessionToken) {
      throw new Error(dicResult.Msg || "Login failed.");
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem("hrms_session_token", dicResult.Data.strSessionToken);
      window.localStorage.setItem("hrms_user_id", String(dicResult.Data.intUserID));
      window.localStorage.setItem("hrms_tenant_id", "1");
      window.localStorage.setItem("hrms_company_id", "1");
      document.cookie = `${appConfig.authCookieName}=1; Path=/; Max-Age=${appConfig.authCookieMaxAgeSeconds}; SameSite=Lax`;
    }
    return dicResult;
  },

  clearSession() {
    if (typeof document === "undefined") {
      return;
    }
    window.localStorage.removeItem("hrms_session_token");
    window.localStorage.removeItem("hrms_user_id");
    window.localStorage.removeItem("hrms_tenant_id");
    window.localStorage.removeItem("hrms_company_id");
    document.cookie = `${appConfig.authCookieName}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
};
