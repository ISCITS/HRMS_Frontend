import { ApiResultCode, AuthStorageKey, DefaultContextValue } from "@/Common/enums/AppEnums";
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
    if (dicResult.ResultCode !== ApiResultCode.Success || !dicResult.Data?.strSessionToken) {
      throw new Error(dicResult.Msg || "Login failed.");
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AuthStorageKey.SessionToken, dicResult.Data.strSessionToken);
      window.localStorage.setItem(AuthStorageKey.UserId, String(dicResult.Data.intUserID));
      window.localStorage.setItem(AuthStorageKey.TenantId, DefaultContextValue.PrimaryId);
      window.localStorage.setItem(AuthStorageKey.CompanyId, DefaultContextValue.PrimaryId);
      document.cookie = `${appConfig.authCookieName}=${DefaultContextValue.PrimaryId}; Path=/; Max-Age=${appConfig.authCookieMaxAgeSeconds}; SameSite=Lax`;
    }
    return dicResult;
  },

  clearSession() {
    if (typeof document === "undefined") {
      return;
    }
    void (async () => {
      if ("caches" in window) {
        const lstCacheKeys = await window.caches.keys();
        await Promise.all(lstCacheKeys.map((strCacheKey) => window.caches.delete(strCacheKey)));
      }
    })();
    window.localStorage.removeItem(AuthStorageKey.SessionToken);
    window.localStorage.removeItem(AuthStorageKey.UserId);
    window.localStorage.removeItem(AuthStorageKey.TenantId);
    window.localStorage.removeItem(AuthStorageKey.CompanyId);
    document.cookie = `${appConfig.authCookieName}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
};
