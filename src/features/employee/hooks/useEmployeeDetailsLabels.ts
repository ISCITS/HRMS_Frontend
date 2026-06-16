"use client";

import { useEffect, useState } from "react";

import dicConstant from "@/constants/Constant.json";
import { labelService } from "@/features/labels/services/labelService";
import { authHelpers } from "@/lib/auth";

export function useEmployeeDetailsLabels() {
  const [intLanguageID, setIntLanguageID] = useState<number | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return authHelpers.getLanguageID();
  });
  const [dicLabels, setDicLabels] = useState<Record<string, string>>({});
  const [strLanguageCode, setStrLanguageCode] = useState("en");
  const [blnLoadingLabels, setBlnLoadingLabels] = useState(true);
  const [strLabelError, setStrLabelError] = useState("");

  useEffect(() => {
    function syncLanguage() {
      setIntLanguageID(authHelpers.getLanguageID());
    }

    syncLanguage();
    window.addEventListener("storage", syncLanguage);
    window.addEventListener("hrms:language-changed", syncLanguage as EventListener);
    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("hrms:language-changed", syncLanguage as EventListener);
    };
  }, []);

  useEffect(() => {
    let blnMounted = true;

    async function loadLabels() {
      if (!intLanguageID) {
        if (blnMounted) {
          setDicLabels({});
          setBlnLoadingLabels(true);
        }
        return;
      }

      setBlnLoadingLabels(true);
      setStrLabelError("");

      try {
        const objResponse = await labelService.getEmployeeDetailsLabels(intLanguageID);
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
          objError instanceof Error ? objError.message : dicConstant.employeeMaster.editorLoading
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
  }, [intLanguageID]);

  function t(strKey: string, strFallback?: string) {
    if (dicLabels[strKey]) {
      return dicLabels[strKey];
    }
    if (blnLoadingLabels) {
      return "";
    }
    if (typeof strFallback === "string") {
      return strFallback;
    }
    return `[[employee.${strKey}]]`;
  }

  return {
    intLanguageID,
    dicLabels,
    strLanguageCode,
    blnLoadingLabels,
    strLabelError,
    t,
  };
}
