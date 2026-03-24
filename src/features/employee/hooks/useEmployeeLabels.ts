"use client";

import { useEffect, useState } from "react";

import dicConstant from "@/constants/Constant.json";
import { labelService } from "@/features/labels/services/labelService";
import { authHelpers } from "@/lib/auth";

const intDefaultLanguageID = 1;



export function useEmployeeLabels() {
  const [intLanguageID, setIntLanguageIDState] = useState(intDefaultLanguageID);
  const [dicLabels, setDicLabels] = useState<Record<string, string>>({});
  const [strLanguageCode, setStrLanguageCode] = useState("en");
  const [blnLoadingLabels, setBlnLoadingLabels] = useState(true);
  const [strLabelError, setStrLabelError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const intLanguageID = authHelpers.getLanguageID();
    if (intLanguageID) {
      setIntLanguageIDState(intLanguageID);
    }
  }, []);

  useEffect(() => {
    let blnMounted = true;

    async function loadLabels() {
      setBlnLoadingLabels(true);
      setStrLabelError("");
      try {
        const objResponse = await labelService.getModuleLabels(intLanguageID, "employee");
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
          objError instanceof Error
            ? objError.message
            : "Unable to load employee labels."
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
    strFallbackErrorMessage:
      strLabelError || dicConstant.employeeMaster.errorLoadWorkspace,
  };
}
