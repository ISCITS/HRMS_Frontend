"use client";

import { useCallback, useEffect, useState } from "react";

import dicConstant from "@/constants/Constant.json";
import { labelService } from "@/features/labels/services/labelService";
import { normalizeLabelModuleName } from "@/features/labels/utils/normalizeLabelModuleName";
import { authHelpers } from "@/lib/auth";

const strLanguageSwitchTokenKey = "hrms_language_switch_token";
const strLanguageSwitchLanguageKey = "hrms_language_switch_language_id";
const strModuleLabelsLoadStartEventName = "hrms:module-label-load-start";
const strModuleLabelsLoadEndEventName = "hrms:module-label-load-end";
const strLabelsRefreshedEventName = "hrms:labels-refreshed";

const dicModuleConstantMap: Record<string, unknown> = {
  common: dicConstant.common,
  common_data_grid: dicConstant.commonDataGrid,
  user: dicConstant.users,
  department: dicConstant.departments,
  designation: dicConstant.designations,
  bank: dicConstant.banks,
  cost_center: dicConstant.costCenters,
  country: dicConstant.countries,
  grade: dicConstant.grades,
  state: dicConstant.states,
  location: dicConstant.locations,
  employee: dicConstant.employeeMaster,
  holiday_master: dicConstant.holidayMaster,
  dashboard: dicConstant.dashboard,
};

function toCamelCase(strValue: string) {
  return strValue.replace(/[-_]+([a-z0-9])/gi, (_, strCharacter: string) => strCharacter.toUpperCase());
}

function toTitleCase(strValue: string) {
  return strValue
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (strCharacter) => strCharacter.toUpperCase());
}

function getValueAtPath(objValue: unknown, lstPath: string[]) {
  let objCurrent: unknown = objValue;

  for (const strSegment of lstPath) {
    if (!objCurrent || typeof objCurrent !== "object" || !(strSegment in objCurrent)) {
      return undefined;
    }

    objCurrent = (objCurrent as Record<string, unknown>)[strSegment];
  }

  return typeof objCurrent === "string" ? objCurrent : undefined;
}

function resolveConstantFallback(strModuleName: string, strKey: string) {
  const objCommon = dicModuleConstantMap.common;
  const objModule = dicModuleConstantMap[strModuleName];

  const dicCommonKeyMap: Record<string, string[]> = {
    cancel: ["cancel"],
    clear: ["clear"],
    close: ["close"],
    delete: ["delete"],
    export_excel: ["exportExcel"],
    export_pdf: ["exportPdf"],
    multilingual_text: ["multilingualText"],
    add_language: ["addLanguage"],
    translate: ["translate"],
    language: ["language"],
    field_is_active: ["fieldIsActive"],
    save: ["save"],
    search: ["search"],
    status_active: ["statusActive"],
    status_inactive: ["statusInactive"],
    rows_per_page: ["rowsPerPage"],
    pagination_separator: ["paginationSeparator"],
  };

  const lstCommonPath = dicCommonKeyMap[strKey];
  if (lstCommonPath) {
    const strCommonValue = getValueAtPath(objCommon, lstCommonPath);
    if (strCommonValue) {
      return strCommonValue;
    }
  }

  if (objModule) {
    const dicModuleKeyMap: Record<string, string[]> = {
      page_title: ["pageTitle"],
      add_button: ["addButton"],
      back_button: ["backButton"],
      dialog_add_title: ["dialogAddTitle"],
      dialog_edit_title: ["dialogEditTitle"],
      dialog_view_title: ["dialogViewTitle"],
      empty_message: ["emptyMessage"],
      loading: ["loading"],
    };

    const lstModulePath = dicModuleKeyMap[strKey];
    if (lstModulePath) {
      const strModuleValue = getValueAtPath(objModule, lstModulePath);
      if (strModuleValue) {
        return strModuleValue;
      }
    }

    if (strKey.startsWith("field_")) {
      const strFieldKey = toCamelCase(strKey.slice("field_".length));
      const strFieldValue = getValueAtPath(objModule, ["fields", strFieldKey]);
      if (strFieldValue) {
        return strFieldValue;
      }
    }

    if (strKey.startsWith("table_")) {
      const strGridKey = strKey === "table_actions"
        ? "action"
        : toCamelCase(strKey.slice("table_".length));
      const strGridValue = getValueAtPath(objModule, ["grid", strGridKey]);
      if (strGridValue) {
        return strGridValue;
      }
    }

    if (strKey.startsWith("validation_")) {
      const strValidationKey = toCamelCase(strKey.slice("validation_".length));
      const strValidationValue = getValueAtPath(objModule, ["validation", strValidationKey]);
      if (strValidationValue) {
        return strValidationValue;
      }
    }
  }

  if (strKey.endsWith("_placeholder")) {
    return toTitleCase(strKey.replace(/_placeholder$/, ""));
  }

  return toTitleCase(strKey);
}

function buildLabelLookupKeys(strModuleName: string, strKey: string) {
  const strTrimmedKey = strKey.trim();
  const strLowerKey = strTrimmedKey.toLowerCase();
  const strUnderscoreLowerKey = strLowerKey.replace(/-/g, "_");
  const strModulePrefix = `${normalizeLabelModuleName(strModuleName).replace(/[-\s]+/g, "_").toUpperCase()}_`;
  const lstLookupKeys = [
    strKey,
    strTrimmedKey,
    strLowerKey,
    strUnderscoreLowerKey,
  ];

  if (strTrimmedKey.toUpperCase().startsWith(strModulePrefix)) {
    const strPrefixStrippedKey = strTrimmedKey.slice(strModulePrefix.length);
    const strPrefixStrippedLowerKey = strPrefixStrippedKey.toLowerCase();
    lstLookupKeys.push(
      strPrefixStrippedKey,
      strPrefixStrippedLowerKey,
      strPrefixStrippedLowerKey.replace(/-/g, "_")
    );
  }

  return Array.from(new Set(lstLookupKeys.filter(Boolean)));
}

export function useModuleLabels(strModuleName: string, strFallbackError = "") {
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
  const [intRefreshToken, setIntRefreshToken] = useState(0);

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
    function refreshLabels(objEvent: Event) {
      const intRefreshedLanguageID = Number((objEvent as CustomEvent<{ intLanguageID?: number }>).detail?.intLanguageID ?? "");
      if (!Number.isFinite(intRefreshedLanguageID) || intRefreshedLanguageID === intLanguageID) {
        setIntRefreshToken((intCurrentValue) => intCurrentValue + 1);
      }
    }

    window.addEventListener(strLabelsRefreshedEventName, refreshLabels);
    return () => {
      window.removeEventListener(strLabelsRefreshedEventName, refreshLabels);
    };
  }, [intLanguageID]);

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
      const strSwitchToken = typeof window !== "undefined"
        ? window.sessionStorage.getItem(strLanguageSwitchTokenKey)
        : null;
      const intSwitchLanguageID = typeof window !== "undefined"
        ? Number(window.sessionStorage.getItem(strLanguageSwitchLanguageKey) ?? "")
        : NaN;
      const blnTrackLanguageSwitchLoad = Boolean(
        strSwitchToken &&
        Number.isFinite(intSwitchLanguageID) &&
        intSwitchLanguageID === intLanguageID
      );

      if (blnTrackLanguageSwitchLoad && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(strModuleLabelsLoadStartEventName, {
            detail: { strToken: strSwitchToken, strModuleName }
          })
        );
      }
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
        if (blnTrackLanguageSwitchLoad && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(strModuleLabelsLoadEndEventName, {
              detail: { strToken: strSwitchToken, strModuleName }
            })
          );
        }
        if (blnMounted) {
          setBlnLoadingLabels(false);
        }
      }
    }

    loadLabels().catch(() => undefined);
    return () => {
      blnMounted = false;
    };
  }, [intLanguageID, intRefreshToken, strFallbackError, strModuleName]);

  const t = useCallback((strKey: string, strFallback?: string) => {
    for (const strLookupKey of buildLabelLookupKeys(strModuleName, strKey)) {
      if (dicLabels[strLookupKey]) {
        return dicLabels[strLookupKey];
      }
    }
    if (typeof strFallback === "string") {
      return strFallback;
    }
    return resolveConstantFallback(strModuleName, strKey);
  }, [dicLabels, strModuleName]);

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
