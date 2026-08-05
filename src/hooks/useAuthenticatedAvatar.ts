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
      if (!strAccessToken) {
        setStrResolvedAvatarUrl("");
        return;
      }

      try {
        const objResponse = await fetch(strNormalizedAvatarUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${strAccessToken}`
          },
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
