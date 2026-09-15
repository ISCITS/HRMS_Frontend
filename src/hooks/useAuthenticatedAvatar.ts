"use client";

import { useEffect, useState } from "react";

import { authHelpers } from "@/lib/auth";

export function useAuthenticatedAvatar(strAvatarUrl: string) {
  const [strResolvedAvatarUrl, setStrResolvedAvatarUrl] = useState("");

  useEffect(() => {
    let blnCancelled = false;
    let strObjectUrl = "";

    async function loadAvatar() {
      const strNormalizedAvatarUrl = strAvatarUrl.trim();
      if (!strNormalizedAvatarUrl) {
        setStrResolvedAvatarUrl("");
        return;
      }

      const strAccessToken = authHelpers.getAccessToken().trim();
      const intTenantID = authHelpers.getTenantID();
      const intCompanyID = authHelpers.getCompanyID();
      if (!strAccessToken) {
        setStrResolvedAvatarUrl("");
        return;
      }

      try {
        const objHeaders: Record<string, string> = {
          Authorization: `Bearer ${strAccessToken}`,
          "X-Access-Token": strAccessToken,
        };
        if (intTenantID) {
          objHeaders["X-Tenant-Id"] = String(intTenantID);
        }
        if (intCompanyID) {
          objHeaders["X-Company-Id"] = String(intCompanyID);
        }

        const objResponse = await fetch(strNormalizedAvatarUrl, {
          method: "GET",
          headers: objHeaders,
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!objResponse.ok) {
          if (!blnCancelled) {
            setStrResolvedAvatarUrl("");
          }
          return;
        }

        const objAvatarBlob = await objResponse.blob();
        if (blnCancelled) {
          return;
        }

        strObjectUrl = URL.createObjectURL(objAvatarBlob);
        setStrResolvedAvatarUrl(strObjectUrl);
      } catch {
        if (!blnCancelled) {
          setStrResolvedAvatarUrl("");
        }
      }
    }

    void loadAvatar();

    return () => {
      blnCancelled = true;
      if (strObjectUrl) {
        URL.revokeObjectURL(strObjectUrl);
      }
    };
  }, [strAvatarUrl]);

  return strResolvedAvatarUrl;
}
