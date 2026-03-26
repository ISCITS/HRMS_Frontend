"use client";

import { useEffect, useState } from "react";

import { labelService } from "@/features/labels/services/labelService";
import { authHelpers } from "@/lib/auth";

const intDefaultLanguageID = 1;

export function useModuleLabels(strModuleName: string, strFallbackError = "") {
  const [intLanguageID] = useState(() => {
    if (typeof window === "undefined") {
      return intDefaultLanguageID;
    }
    return authHelpers.getLanguageID() ?? intDefaultLanguageID;
  });
  const [dicLabels, setDicLabels] = useState<Record<string, string>>({});
  const [strLanguageCode, setStrLanguageCode] = useState("en");
  const [blnLoadingLabels, setBlnLoadingLabels] = useState(true);
  const [strLabelError, setStrLabelError] = useState("");

  useEffect(() => {
    let blnMounted = true;

    async function loadLabels() {
      setBlnLoadingLabels(true);
      setStrLabelError("");
      try {
        const objResponse = await labelService.getModuleLabels(intLanguageID, strModuleName);
        if (!blnMounted) {
          return;
        }
        setDicLabels(objResponse.labels ?? {});
        setStrLanguageCode(objResponse.language ?? "en");
      } catch (objError) {
        if (!blnMounted) {
          return;
        }
        setDicLabels({});
        setStrLabelError(
          objError instanceof Error ? objError.message : strFallbackError || `Unable to load ${strModuleName} labels.`
        );
      } finally {
        if (blnMounted) {
          setBlnLoadingLabels(false);
        }
      }
    }

    loadLabels().catch(() => undefined);
    return () => {
      blnMounted = false;
    };
  }, [intLanguageID, strFallbackError, strModuleName]);

  function t(strKey: string, strFallback: string) {
    return dicLabels[strKey] ?? strFallback;
  }

  return {
    intLanguageID,
    dicLabels,
    strLanguageCode,
    blnLoadingLabels,
    strLabelError,
    t,
    strFallbackErrorMessage: strLabelError || strFallbackError,
  };
}
