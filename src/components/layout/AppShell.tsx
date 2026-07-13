"use client";

import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import SpaceDashboardRoundedIcon from "@mui/icons-material/SpaceDashboardRounded";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  ButtonBase,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Toolbar,
  Typography
} from "@mui/material";
import { ReactNode, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import DynamicMenu from "@/components/navigation/DynamicMenu";
import BlockingLoader, { BlockingLoaderViewportProvider } from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { labelService } from "@/features/labels/services/labelService";
import { resolveRouteModuleName } from "@/features/labels/utils/resolveRouteModuleName";
import { stripMasterTitle } from "@/features/labels/utils/stripMasterTitle";
import { employeeService } from "@/features/employee/services/employeeService";
import { authHelpers } from "@/lib/auth";
import { normalizeMenuResponse } from "@/lib/menu";
import type { CurrentUserContext, MenuResponse, TenantAuthDetails } from "@/models/AuthModels";
import { ApiRequestError } from "@/Common/utils/apiErrorHandler";
import { authApiService } from "@/services";

const intDrawerWidth = 308;
const intTopBarHeight = 64;
const intMenuZIndex = 1700;
const intCollapsedMenuRailWidth = 60;
const intContentLoaderZIndex = 1200;
const strLanguageSwitchTokenKey = "hrms_language_switch_token";
const strLanguageSwitchLanguageKey = "hrms_language_switch_language_id";
const strModuleLabelsLoadStartEventName = "hrms:module-label-load-start";
const strModuleLabelsLoadEndEventName = "hrms:module-label-load-end";
const strAvatarRefreshEventName = "hrms:avatar-refresh";
const intLanguageSwitchSettledDelayMs = 900;

function getAutomationProps(strControlId?: string) {
  return strControlId ? ({ "data-controlid": strControlId } as const) : {};
}

function getPageTitle(strPathname: string) {
  if (!strPathname || strPathname === "/") {
    return "Dashboard";
  }

  const lstSegments = strPathname
    .split("/")
    .filter(Boolean)
    .map((strSegment) => {
      if (strSegment === "add") {
        return "Add";
      }

      if (strSegment === "edit") {
        return "Edit";
      }

      if (/^\d+$/.test(strSegment)) {
        return "";
      }

      return strSegment
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (strCharacter) => strCharacter.toUpperCase());
    })
    .filter(Boolean);

  return lstSegments.join(" / ") || "Dashboard";
}

function getCommonPageTitle(strPathname: string, tCommon: (strKey: string, strFallback?: string) => string) {
  const strLowerPath = (strPathname || "").toLowerCase();
  if (strLowerPath === "/dashboard") {
    return tCommon("dashboard", "Dashboard");
  }
  return getPageTitle(strPathname);
}

function getLastBreadcrumbSegment(strValue: string) {
  const lstSegments = strValue
    .split("/")
    .map((strSegment) => strSegment.trim())
    .filter(Boolean);

  return lstSegments.at(-1) ?? strValue.trim();
}

function getLocalizedHeaderTitle(
  strPathname: string,
  strHeaderModuleName: string,
  tHeader: (strKey: string, strFallback?: string) => string,
  tCommon: (strKey: string, strFallback?: string) => string,
  strBackRoute = ""
) {
  const strLowerPath = (strPathname || "").toLowerCase();
  const strLowerBackRoute = (strBackRoute || "").toLowerCase();

  if (!strHeaderModuleName) {
    return getCommonPageTitle(strPathname, tCommon);
  }

  if (strHeaderModuleName === "employee-payroll-input") {
    if (strLowerPath.endsWith("/new")) {
      return tHeader("add_title", "Create Payroll Input");
    }
    if (strLowerPath.includes("/edit")) {
      return tHeader("edit_title", "Edit Payroll Input");
    }
    return stripMasterTitle(
      tHeader(
        "page_title",
        getLastBreadcrumbSegment(
          tHeader("breadcrumbs", "Payroll / Payroll Input")
        )
      )
    );
  }

  if (strHeaderModuleName === "payroll-runs") {
    if (strLowerPath.endsWith("/new")) {
      return tHeader("add_title", "Create Payroll Run");
    }
    if (strLowerPath.includes("/edit")) {
      return tHeader("edit_title", "Edit Payroll Run");
    }
    return stripMasterTitle(
      tHeader(
        "page_title",
        getLastBreadcrumbSegment(tHeader("breadcrumbs", "Payroll / Payroll Runs"))
      )
    );
  }

  if (strHeaderModuleName === "payroll-cycles") {
    if (strLowerPath.endsWith("/add")) {
      return tHeader("schedule_add_title", "Add Payroll Schedule");
    }
    if (strLowerPath.includes("/edit")) {
      return tHeader("schedule_edit_title", "Edit Payroll Schedule");
    }
    return stripMasterTitle(tHeader("schedule_page_title", "Payroll Schedules"));
  }

  if (strHeaderModuleName === "payslips") {
    const blnEssPayslipContext =
      strLowerPath.startsWith("/ess/my-payslips") ||
      strLowerPath.startsWith("/ess/my-payslip") ||
      strLowerBackRoute.startsWith("/ess/my-payslips") ||
      strLowerBackRoute.startsWith("/ess/my-payslip");
    const blnDetailContext =
      Boolean(strLowerPath.match(/^\/(reports|payroll)\/payslips\/\d+/)) ||
      Boolean(strLowerPath.match(/^\/payroll\/payslip\/\d+/)) ||
      Boolean(strLowerPath.match(/^\/ess\/my-payslips\/\d+/)) ||
      Boolean(strLowerPath.match(/^\/ess\/my-payslip\/\d+/));
    if (blnDetailContext) {
      return blnEssPayslipContext
        ? tHeader("ess_page_title_view", "Ess / My Payslips / View")
        : tHeader("page_title_view", "Payroll / Payslips / View");
    }
    return blnEssPayslipContext
      ? tHeader("ess_header_title", "Ess / My Payslips")
      : tHeader("header_title", "Payroll / Payslips");
  }

  if (strHeaderModuleName === "payroll-results") {
    return stripMasterTitle(
      tHeader(
        "page_title",
        getLastBreadcrumbSegment(tHeader("breadcrumbs", "Payroll / Payroll Results"))
      )
    );
  }

  if (strHeaderModuleName === "payroll-process-logs") {
    return stripMasterTitle(tHeader("page_title", "Payroll Process Logs"));
  }

  if (strHeaderModuleName === "statutory-rules") {
    if (strLowerPath.endsWith("/new")) {
      return tHeader("add_title", "Create Statutory Rule");
    }
    if (strLowerPath.includes("/edit")) {
      return tHeader("edit_title", "Edit Statutory Rule");
    }
    return stripMasterTitle(
      tHeader(
        "page_title",
        getLastBreadcrumbSegment(tHeader("breadcrumbs", "Payroll / Statutory Rules"))
      )
    );
  }

  if (strHeaderModuleName === "tax-regimes") {
    return tHeader("tax_regimes_title", "Tax Regimes");
  }

  if (strHeaderModuleName === "it-declaration") {
    return tHeader("page_title", "IT Declaration");
  }

  if (strHeaderModuleName === "flexi-pay-declaration") {
    return tHeader("page_title", "Flexi Pay Declaration");
  }

  if (strHeaderModuleName === "reimbursements") {
    if (strLowerPath === "/ess/reimbursements/new") {
      return tHeader("page_title_new", "Ess / Reimbursements / New");
    }
    if (strLowerPath.match(/^\/ess\/reimbursements\/\d+\/edit$/)) {
      return tHeader("page_title_edit", "Ess / Reimbursements / Edit");
    }
    if (strLowerPath.match(/^\/ess\/reimbursements\/\d+$/)) {
      return tHeader("page_title_view", "Ess / Reimbursements / View");
    }
    return tHeader("page_title", "Ess / Reimbursements");
  }
  if (strHeaderModuleName === "loans-advances") {
    if (strLowerPath === "/ess/loans-advances/new") {
      return tHeader("ess_page_title_new", "Ess / Loans Advances / New");
    }
    if (strLowerPath.match(/^\/ess\/loans-advances\/\d+$/)) {
      return tHeader("ess_page_title_view", "Ess / Loans Advances / View");
    }
    if (strLowerPath === "/payroll/loans-advances/new") {
      return tHeader("page_title_new", "Payroll / Loans Advances / New");
    }
    if (strLowerPath.match(/^\/payroll\/loans-advances\/\d+$/)) {
      return tHeader("page_title_view", "Payroll / Loans Advances / View");
    }
    return strLowerPath.startsWith("/ess/")
      ? tHeader("ess_header_title", "Ess / Loans Advances")
      : tHeader("header_title", "Payroll / Loans Advances");
  }
  if (strHeaderModuleName === "calendar") {
    return tHeader("header_title", "Ess / Calendar");
  }

  if (strHeaderModuleName === "my-profile") {
    if (strLowerPath.includes("/edit")) {
      return tHeader("edit_header_title", "Ess / My Profile / Edit");
    }
    return tHeader("header_title", "Ess / My Profile");
  }

  if (strHeaderModuleName === "my-bank-details") {
    return tHeader("header_title", "Ess / My Bank Details");
  }

  return stripMasterTitle(tHeader("page_title", getPageTitle(strPathname)));
}

function buildLanguageOptions(...lstLanguageIDs: Array<number | null | undefined>) {
  return lstLanguageIDs.reduce<number[]>((lstResolvedLanguageIDs, intLanguageID) => {
    if (!intLanguageID || lstResolvedLanguageIDs.includes(intLanguageID)) {
      return lstResolvedLanguageIDs;
    }

    lstResolvedLanguageIDs.push(intLanguageID);
    return lstResolvedLanguageIDs;
  }, []);
}

function resolveLanguageDisplayLabel(
  strNativeName: string | null | undefined,
  intLanguageID: number,
  strFallbackLabel?: string
) {
  const strResolvedNativeName = strNativeName?.trim();
  if (strResolvedNativeName) {
    return strResolvedNativeName;
  }

  if (strFallbackLabel?.trim()) {
    return strFallbackLabel.trim();
  }

  if (intLanguageID === 1) {
    return "English";
  }

  if (intLanguageID === 2) {
    return "हिन्दी";
  }

  return `Language ${intLanguageID}`;
}

function extractLinkedEmployeeName(objUserContext: CurrentUserContext | null) {
  if (!objUserContext) return "";
  const objUserContextUnsafe = objUserContext as unknown as Record<string, unknown>;
  const objUserUnsafe = (objUserContextUnsafe.objUser ?? {}) as Record<string, unknown>;
  const objEmployeeUnsafe = (objUserContextUnsafe.objEmployee ?? {}) as Record<string, unknown>;
  const lstCandidates = [
    objEmployeeUnsafe.strEmployeeName,
    objEmployeeUnsafe.full_name,
    objEmployeeUnsafe.strFullName,
    objEmployeeUnsafe.first_name && objEmployeeUnsafe.last_name
      ? `${String(objEmployeeUnsafe.first_name)} ${String(objEmployeeUnsafe.last_name)}`
      : undefined,
    objEmployeeUnsafe.first_name,
    objUserUnsafe.strEmployeeName,
    objUserUnsafe.strFullName,
    objUserUnsafe.full_name,
  ];
  for (const strCandidate of lstCandidates) {
    if (typeof strCandidate === "string" && strCandidate.trim()) {
      return strCandidate.trim();
    }
  }
  return "";
}

export default function AppShell({ children }: { children: ReactNode }) {
  const objRouter = useRouter();
  const strPathname = usePathname();
  const objSearchParams = useSearchParams();
  const [blnDrawerOpen, setBlnDrawerOpen] = useState(false);
  const [blnDesktopSidebarOpen, setBlnDesktopSidebarOpen] = useState(false);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnLoggingOut, setBlnLoggingOut] = useState(false);
  const [blnLogoutDialogOpen, setBlnLogoutDialogOpen] = useState(false);
  const [objProfileAnchorEl, setObjProfileAnchorEl] = useState<HTMLElement | null>(null);
  const [objUserContext, setObjUserContext] = useState<CurrentUserContext | null>(null);
  const [objMenu, setObjMenu] = useState<MenuResponse>({ lstMenuItems: [], strHomeRoute: "/dashboard" });
  const [blnMenuLoaded, setBlnMenuLoaded] = useState(false);
  const [blnMenuLoading, setBlnMenuLoading] = useState(false);
  const [strBootstrapError, setStrBootstrapError] = useState("");
  const [blnLanguageSwitching, setBlnLanguageSwitching] = useState(false);
  const [objTenantLanguageDetails, setObjTenantLanguageDetails] = useState<TenantAuthDetails | null>(null);
  const [dicLanguageLabelByID, setDicLanguageLabelByID] = useState<Record<number, string>>({});
  const [strActiveLanguageSwitchToken, setStrActiveLanguageSwitchToken] = useState("");
  const [strPendingExpandedMenuIdentity, setStrPendingExpandedMenuIdentity] = useState<string | null>(null);
  const [intPendingLabelLoads, setIntPendingLabelLoads] = useState(0);
  const [blnLanguageShellReady, setBlnLanguageShellReady] = useState(false);
  const [intLastLabelActivityAt, setIntLastLabelActivityAt] = useState(0);
  const [intLastContentMutationAt, setIntLastContentMutationAt] = useState(0);
  const [strResolvedEmployeeName, setStrResolvedEmployeeName] = useState("");
  const objShellContentRef = useRef<HTMLDivElement | null>(null);
  const objMainContentRef = useRef<HTMLElement | null>(null);
  const strHeaderModuleName = resolveRouteModuleName(strPathname);
  const { t: tCommon } = useModuleLabels("common");
  const { t: tHeader } = useModuleLabels(strHeaderModuleName || "common");
  const intCurrentLanguageID = authHelpers.getLanguageID();
  const lstLanguageOptions = buildLanguageOptions(
    objTenantLanguageDetails?.language_id ?? authHelpers.getLanguageID(),
    objTenantLanguageDetails?.secondary_language_id ?? authHelpers.getSecondaryLanguageID()
  ).map((intLanguageID) => ({
    intLanguageID,
    strLabel: resolveLanguageDisplayLabel(
      intLanguageID === objTenantLanguageDetails?.language_id
        ? objTenantLanguageDetails?.language_native_name
        : objTenantLanguageDetails?.secondary_language_native_name,
      intLanguageID,
      dicLanguageLabelByID[intLanguageID]
    )
  }));

  function redirectToSessionExpired() {
    authHelpers.redirectToSessionExpired();
  }

  useEffect(() => {
    function handleModuleLabelLoadStart(objEvent: Event) {
      const strToken = (objEvent as CustomEvent<{ strToken?: string }>).detail?.strToken ?? "";
      if (!strToken || strToken !== strActiveLanguageSwitchToken) {
        return;
      }
      setIntLastLabelActivityAt(Date.now());
      setIntPendingLabelLoads((intCurrentCount) => intCurrentCount + 1);
    }

    function handleModuleLabelLoadEnd(objEvent: Event) {
      const strToken = (objEvent as CustomEvent<{ strToken?: string }>).detail?.strToken ?? "";
      if (!strToken || strToken !== strActiveLanguageSwitchToken) {
        return;
      }
      setIntLastLabelActivityAt(Date.now());
      setIntPendingLabelLoads((intCurrentCount) => Math.max(0, intCurrentCount - 1));
    }

    window.addEventListener(strModuleLabelsLoadStartEventName, handleModuleLabelLoadStart as EventListener);
    window.addEventListener(strModuleLabelsLoadEndEventName, handleModuleLabelLoadEnd as EventListener);
    return () => {
      window.removeEventListener(strModuleLabelsLoadStartEventName, handleModuleLabelLoadStart as EventListener);
      window.removeEventListener(strModuleLabelsLoadEndEventName, handleModuleLabelLoadEnd as EventListener);
    };
  }, [strActiveLanguageSwitchToken]);

  useEffect(() => {
    if (!blnLanguageSwitching || !blnLanguageShellReady || intPendingLabelLoads > 0) {
      return;
    }

    const intLastUiActivityAt = Math.max(intLastLabelActivityAt, intLastContentMutationAt);
    const intSettledWaitMs = Math.max(
      intLanguageSwitchSettledDelayMs - (Date.now() - intLastUiActivityAt),
      0
    );
    const intTimer = window.setTimeout(() => {
      window.sessionStorage.removeItem(strLanguageSwitchTokenKey);
      window.sessionStorage.removeItem(strLanguageSwitchLanguageKey);
      setStrActiveLanguageSwitchToken("");
      setBlnLanguageShellReady(false);
      setBlnLanguageSwitching(false);
    }, intLastUiActivityAt > 0 ? intSettledWaitMs : intLanguageSwitchSettledDelayMs);

    return () => window.clearTimeout(intTimer);
  }, [blnLanguageShellReady, blnLanguageSwitching, intLastContentMutationAt, intLastLabelActivityAt, intPendingLabelLoads]);

  useEffect(() => {
    if (!blnLanguageSwitching || !blnLanguageShellReady || !objShellContentRef.current) {
      return;
    }

    const objObserver = new MutationObserver(() => {
      setIntLastContentMutationAt(Date.now());
    });

    objObserver.observe(objShellContentRef.current, {
      subtree: true,
      childList: true,
      characterData: true
    });

    return () => {
      objObserver.disconnect();
    };
  }, [blnLanguageShellReady, blnLanguageSwitching]);

  async function loadWorkspaceContext(intLanguageID?: number | null) {
    const strTenantUUID = authHelpers.getTenantUUID();
    const intResolvedLanguageID = intLanguageID ?? authHelpers.getLanguageID();
    const lstRequests: [
      ReturnType<typeof authApiService.getCurrentUser>,
      Promise<{ Data?: TenantAuthDetails }>
    ] = [
      authApiService.getCurrentUser(intResolvedLanguageID),
      strTenantUUID
        ? authApiService
            .getTenantAuthDetails(strTenantUUID, intResolvedLanguageID)
            .then((objResponse) => objResponse as { Data: TenantAuthDetails })
            .catch(() => ({}))
        : Promise.resolve({})
    ];

    const [objUserResult, objTenantDetailsResult] = await Promise.all(lstRequests);
    const objTenantDetails = objTenantDetailsResult.Data;

    authHelpers.setTenantContext(
      objUserResult.Data.objTenant.intTenantID,
      undefined,
      intResolvedLanguageID ?? objUserResult.Data.objTenant.intLanguageID ?? undefined,
      objTenantDetails?.secondary_language_id ?? authHelpers.getSecondaryLanguageID() ?? undefined
    );
    setObjUserContext(objUserResult.Data);
    if (objTenantDetails) {
      setObjTenantLanguageDetails(objTenantDetails);
      setDicLanguageLabelByID((dicCurrentLabels) => ({
        ...dicCurrentLabels,
        ...(objTenantDetails.language_id
          ? {
              [objTenantDetails.language_id]: resolveLanguageDisplayLabel(
                objTenantDetails.language_native_name,
                objTenantDetails.language_id,
                dicCurrentLabels[objTenantDetails.language_id]
              )
            }
          : {}),
        ...(objTenantDetails.secondary_language_id
          ? {
              [objTenantDetails.secondary_language_id]: resolveLanguageDisplayLabel(
                objTenantDetails.secondary_language_native_name,
                objTenantDetails.secondary_language_id,
                dicCurrentLabels[objTenantDetails.secondary_language_id]
              )
            }
          : {})
      }));
    }
  }

  async function ensureMenuLoaded(intLanguageID?: number | null, blnForce = false) {
    if (!blnForce && (blnMenuLoaded || blnMenuLoading)) {
      return;
    }

    setBlnMenuLoading(true);
    try {
      const objMenuResult = await authApiService.getMenu(intLanguageID ?? authHelpers.getLanguageID());
      setObjMenu(normalizeMenuResponse(objMenuResult.Data));
      setBlnMenuLoaded(true);
    } finally {
      setBlnMenuLoading(false);
    }
  }

  useEffect(() => {
    let blnMounted = true;
    const strAccessToken = authHelpers.getAccessToken();

    if (!strAccessToken) {
      setBlnLoading(false);
      redirectToSessionExpired();
      return () => {
        blnMounted = false;
      };
    }

    loadWorkspaceContext(authHelpers.getLanguageID())
      .then(async () => {
        if (!blnMounted) {
          return;
        }
        setStrBootstrapError("");
        const intResolvedLanguageID = authHelpers.getLanguageID();
        const lstBootstrapResults = await Promise.allSettled([
          // Older backend images do not expose the optional bulk label endpoint.
          // Keep shell bootstrap resilient and let per-module label loading fall back.
          labelService.preloadAllLabels(intResolvedLanguageID).catch(() => undefined),
          ensureMenuLoaded(intResolvedLanguageID, true)
        ]);

        const objRejectedBootstrapStep = lstBootstrapResults.find(
          (objResult) => objResult.status === "rejected"
        );

        if (objRejectedBootstrapStep?.status === "rejected") {
          const objReason = objRejectedBootstrapStep.reason;
          if (isSessionExpiredError(objReason)) {
            throw objReason;
          }
          console.error("App shell bootstrap step failed.", objReason);
        }
      })
      .catch((objError: unknown) => {
        if (blnMounted) {
          if (isSessionExpiredError(objError)) {
            redirectToSessionExpired();
          } else {
            console.error("App shell bootstrap failed.", objError);
            setStrBootstrapError("");
          }
        }
      })
      .finally(() => {
        if (blnMounted) {
          setBlnLoading(false);
        }
      });

    return () => {
      blnMounted = false;
    };
  }, [objRouter]);

  useEffect(() => {
    function handleAvatarRefresh() {
      loadWorkspaceContext(authHelpers.getLanguageID()).catch(() => undefined);
    }

    window.addEventListener(strAvatarRefreshEventName, handleAvatarRefresh);
    return () => {
      window.removeEventListener(strAvatarRefreshEventName, handleAvatarRefresh);
    };
  }, []);

  useEffect(() => {
    let blnMounted = true;
    const intEmployeeID = objUserContext?.objUser?.intEmployeeID ?? null;
    const strHeaderName = extractLinkedEmployeeName(objUserContext);
    if (strHeaderName) {
      setStrResolvedEmployeeName(strHeaderName);
      return () => {
        blnMounted = false;
      };
    }
    if (!intEmployeeID) {
      setStrResolvedEmployeeName("");
      return () => {
        blnMounted = false;
      };
    }

    employeeService
      .getEmployeeById(intEmployeeID)
      .then((objEmployee) => {
        if (!blnMounted) return;
        const strName = objEmployee?.strFullName?.trim() || "";
        setStrResolvedEmployeeName(strName);
      })
      .catch(() => {
        if (!blnMounted) return;
        setStrResolvedEmployeeName("");
      });

    return () => {
      blnMounted = false;
    };
  }, [objUserContext]);

  async function confirmLogout() {
    setBlnLogoutDialogOpen(false);
    setBlnLoggingOut(true);
    const objLogoutResult = await authApiService.logout().catch(() => undefined);
    const strTenantUUID = objLogoutResult?.Data?.strTenantUUID || authHelpers.getTenantUUID();
    const strLogoutUrl = strTenantUUID
      ? `/logout?tenantUuid=${encodeURIComponent(strTenantUUID)}`
      : "/logout";
    window.location.replace(strLogoutUrl);
  }

  async function switchWorkspaceLanguage(intRequestedLanguageID: number) {
    if (
      blnLanguageSwitching ||
      !intRequestedLanguageID ||
      intRequestedLanguageID === intCurrentLanguageID
    ) {
      return;
    }

    setBlnLanguageSwitching(true);
    setBlnLanguageShellReady(false);
    setIntPendingLabelLoads(0);
    setIntLastLabelActivityAt(Date.now());
    setIntLastContentMutationAt(Date.now());
    setStrBootstrapError("");
    const strSwitchToken = `${intRequestedLanguageID}-${Date.now()}`;
    setStrActiveLanguageSwitchToken(strSwitchToken);
    window.sessionStorage.setItem(strLanguageSwitchTokenKey, strSwitchToken);
    window.sessionStorage.setItem(strLanguageSwitchLanguageKey, String(intRequestedLanguageID));
    authHelpers.setLanguageID(intRequestedLanguageID);
    setBlnMenuLoaded(false);
    setObjMenu({ lstMenuItems: [], strHomeRoute: "/dashboard" });
    try {
      await loadWorkspaceContext(intRequestedLanguageID);
      await Promise.all([
        labelService.refreshAllLabels(intRequestedLanguageID),
        ensureMenuLoaded(intRequestedLanguageID, true)
      ]);
      setBlnLanguageShellReady(true);
    } catch (objError) {
      if (isSessionExpiredError(objError)) {
        window.sessionStorage.removeItem(strLanguageSwitchTokenKey);
        window.sessionStorage.removeItem(strLanguageSwitchLanguageKey);
        setStrActiveLanguageSwitchToken("");
        setBlnLanguageShellReady(false);
        setBlnLanguageSwitching(false);
        redirectToSessionExpired();
        return;
      }
      window.sessionStorage.removeItem(strLanguageSwitchTokenKey);
      window.sessionStorage.removeItem(strLanguageSwitchLanguageKey);
      setStrActiveLanguageSwitchToken("");
      setBlnLanguageShellReady(false);
      setBlnLanguageSwitching(false);
      // Keep the requested language selected even when tenant-specific label or
      // menu refresh fails, so the shell can still fall back to local/default
      // translations instead of appearing stuck on the previous language.
      authHelpers.setLanguageID(intRequestedLanguageID);
    } finally {
      // The loader is dismissed by the label-load completion effect so
      // menu and screen labels appear together after the switch finishes.
    }
  }

  const strUserName = objUserContext?.objUser.strLoginName || objUserContext?.objUser.strEmailAddress || "Workspace user";
  const intLinkedEmployeeID = objUserContext?.objUser?.intEmployeeID ?? null;
  const strLinkedEmployeeName = strResolvedEmployeeName || extractLinkedEmployeeName(objUserContext);
  const strProfileDisplayName = strLinkedEmployeeName || strUserName;
  const strAvatarText = strProfileDisplayName.trim().charAt(0).toUpperCase() || "U";
  const strAvatarUrl = objUserContext?.strAvatarUrl || objUserContext?.objEmployee?.strProfilePhotoUrl || "";
  const blnEmployeeReimbursementContext =
    strPathname?.toLowerCase() === "/payroll/employee-reimbursement" ||
    objSearchParams.get("source") === "employee-reimbursement";
  const strLowerPathname = strPathname?.toLowerCase() || "";
  const blnEmployeeReimbursementFormContext =
    Boolean(strLowerPathname.match(/^\/ess\/reimbursements(\/new|\/\d+(\/edit)?)?$/)) &&
    Boolean(objSearchParams.get("employee_id"));
  const strEmployeeReimbursementFormTitle = strLowerPathname === "/ess/reimbursements/new"
    ? tHeader("add_claim_reimbursement", "Add Claim Reimbursement")
    : strLowerPathname.match(/^\/ess\/reimbursements\/\d+\/edit$/)
      ? tHeader("edit_claim_reimbursement", "Edit Claim Reimbursement")
      : tHeader("view_claim_reimbursement", "View Claim Reimbursement");
  const strPageTitle = blnEmployeeReimbursementFormContext
    ? strEmployeeReimbursementFormTitle
    : blnEmployeeReimbursementContext
      ? tHeader("employee_reimbursements", "Employee Reimbursements")
    : getLocalizedHeaderTitle(
        strPathname,
        strHeaderModuleName,
        tHeader,
        tCommon,
        objSearchParams.get("backRoute") || ""
      );
  const blnDashboardRoute = (strPathname || "").toLowerCase() === "/dashboard";
  const strTenantName = objUserContext?.objTenant.strTenantName || "Workspace";
  const blnProfileMenuOpen = Boolean(objProfileAnchorEl);

  function handleMenuToggle() {
    void ensureMenuLoaded();
    if (typeof window !== "undefined" && window.innerWidth >= 1200) {
      setBlnDesktopSidebarOpen((blnPrevious) => !blnPrevious);
      return;
    }

    setBlnDrawerOpen(true);
  }

  function handleMainContentClick() {
    if (blnDesktopSidebarOpen) {
      setBlnDesktopSidebarOpen(false);
    }
  }

  function handleDesktopCollapsedMenuItemClick(strMenuIdentity: string) {
    void ensureMenuLoaded();
    setStrPendingExpandedMenuIdentity(strMenuIdentity);
    setBlnDesktopSidebarOpen(true);
  }

  function openProfileMenu(objEvent: React.MouseEvent<HTMLElement>) {
    setObjProfileAnchorEl(objEvent.currentTarget);
  }

  function closeProfileMenu() {
    setObjProfileAnchorEl(null);
  }

  const objSidebarContent = (
    <Box
      sx={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        p: { xs: 1, md: 1.5 },
        background:
          "linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,0.96) 50%, rgba(248,250,252,0.98) 100%)",
        overflow: "hidden"
      }}
    >
      <Paper
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          borderRadius: "24px",
          overflow: "hidden",
          backgroundColor: "rgba(255,255,255,0.86)",
          backdropFilter: "blur(22px)",
          border: "1px solid rgba(148, 163, 184, 0.16)",
          boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)"
        }}
      >
        <Box
          sx={{
            px: 2.25,
            height: `${intTopBarHeight}px`,
            flexShrink: 0,
            background: "linear-gradient(90deg, #e0f2fe 0%, #e9e7ff 55%, #f3e8ff 100%)",
            color: "#0f172a",
            display: "flex",
            alignItems: "center",
            boxSizing: "border-box"
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ height: "100%", flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: "16px",
                display: "grid",
                placeItems: "center",
                backgroundColor: "rgba(37, 99, 235, 0.12)",
                border: "1px solid rgba(37, 99, 235, 0.18)",
                color: "#2563eb"
              }}
            >
              <SpaceDashboardRoundedIcon />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                HRMS
              </Typography>
            </Box>
          </Stack>
          <IconButton
            aria-label="Close navigation menu"
            onClick={() => {
              setBlnDrawerOpen(false);
              setBlnDesktopSidebarOpen(false);
            }}
            sx={{
              color: "#2563eb",
              backgroundColor: "rgba(37, 99, 235, 0.12)",
              border: "1px solid rgba(37, 99, 235, 0.18)",
              "&:hover": {
                backgroundColor: "rgba(37, 99, 235, 0.2)"
              }
            }}
            {...getAutomationProps("app-shell.sidebar-close.button")}
          >
            <MenuRoundedIcon />
          </IconButton>
        </Box>

        <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.18)" }} />

        <Box
          sx={{
            p: 1.25,
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(148, 163, 184, 0.9) transparent",
            "&::-webkit-scrollbar": {
              width: 8
            },
            "&::-webkit-scrollbar-track": {
              background: "transparent"
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "rgba(148, 163, 184, 0.85)",
              borderRadius: "999px",
              border: "2px solid transparent",
              backgroundClip: "padding-box"
            }
          }}
        >
          <DynamicMenu
            lstMenuItems={objMenu.lstMenuItems}
            strForcedExpandedMenuIdentity={strPendingExpandedMenuIdentity}
            onForcedExpandedHandled={() => setStrPendingExpandedMenuIdentity(null)}
            onNavigate={() => {
              setBlnDrawerOpen(false);
              setBlnDesktopSidebarOpen(false);
            }}
          />
        </Box>
      </Paper>

      <ButtonBase
        onClick={() => {
          setBlnDrawerOpen(false);
          setBlnDesktopSidebarOpen(false);
          setBlnLogoutDialogOpen(true);
        }}
        disabled={blnLoggingOut}
        sx={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 1.25,
          px: 2,
          py: 1.4,
          borderRadius: "18px",
          backgroundColor: "rgba(255,255,255,0.86)",
          border: "1px solid rgba(148, 163, 184, 0.16)",
          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
          color: "#b91c1c",
          "&:hover": {
            backgroundColor: "rgba(254,242,242,0.92)"
          },
          "&.Mui-disabled": {
            opacity: 0.6
          }
        }}
        {...getAutomationProps("app-shell.sidebar-logout.button")}
      >
        <LogoutRoundedIcon fontSize="small" />
        <Typography sx={{ fontWeight: 700, color: "inherit" }}>
          {tCommon("logout", "Logout")}
        </Typography>
      </ButtonBase>
    </Box>
  );

  if (blnLoading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", backgroundColor: "#f8fafc" }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: "#64748b" }}>{tCommon("preparing_workspace", "Preparing your workspace...")}</Typography>
        </Stack>
      </Box>
    );
  }

  if (strBootstrapError) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", backgroundColor: "#f8fafc", p: 3 }}>
        <Stack spacing={1.5} alignItems="center">
          <Typography sx={{ color: "#b91c1c", fontWeight: 700 }}>
            {strBootstrapError}
          </Typography>
          <Button variant="contained" onClick={() => window.location.reload()} {...getAutomationProps("app-shell.retry.button")}>
            Retry
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      ref={objShellContentRef}
      sx={{
        display: "flex",
        height: "100vh",
        minHeight: "100vh",
        overflow: "hidden",
        background:
          "radial-gradient(circle at top left, rgba(14,116,144,0.12), transparent 28%), linear-gradient(180deg, #f8fbff 0%, #eef4f8 100%)"
      }}
    >
      <Box
        sx={{
          position: "relative",
          zIndex: intMenuZIndex,
          width: intCollapsedMenuRailWidth,
          flex: `0 0 ${intCollapsedMenuRailWidth}px`,
          height: "100vh",
          minHeight: 0,
          display: { xs: "none", lg: "flex" },
          flexDirection: "column",
          alignItems: "center",
          background: "linear-gradient(180deg, #e0f2fe 0%, #e9e7ff 55%, #f3e8ff 100%)",
          borderRight: "1px solid #e2e8f0",
          boxShadow: "8px 0 24px rgba(15, 23, 42, 0.08)",
          overflow: "hidden",
          cursor: "pointer",
          transition: "box-shadow 180ms ease",
          pointerEvents: "auto"
        }}
        onClick={() => {
          void ensureMenuLoaded();
          setBlnDesktopSidebarOpen(true);
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: 96,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
            <IconButton
              aria-label="Open navigation menu"
              sx={{
                width: 40,
                height: 40,
                border: "1px solid rgba(59, 130, 246, 0.18)",
                backgroundColor: "#ffffff",
                color: "#2563eb",
                boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
                "&:hover": {
                  backgroundColor: "#eff6ff",
                  color: "#1d4ed8",
                }
              }}
              {...getAutomationProps("app-shell.desktop-menu-toggle.button")}
            >
              <MenuRoundedIcon />
          </IconButton>
        </Box>
        <Box
          sx={{
            flex: 1,
            width: "100%",
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            py: 1,
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": {
              display: "none",
            },
          }}
        >
          <DynamicMenu
            lstMenuItems={objMenu.lstMenuItems}
            blnCollapsed
            onCollapsedClick={() => setBlnDesktopSidebarOpen(true)}
            onCollapsedMenuItemClick={handleDesktopCollapsedMenuItemClick}
            onNavigate={() => setBlnDesktopSidebarOpen(false)}
          />
        </Box>
        <Box
          sx={{
            width: "100%",
            height: 72,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            color: "#2563eb",
          }}
        >
          <LogoutRoundedIcon />
        </Box>
      </Box>
      <Box
        sx={{
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: intMenuZIndex + 1,
          width: intDrawerWidth + 28,
          height: "100vh",
          minHeight: 0,
          display: { xs: "none", lg: "block" },
          p: { xs: 1, md: 1.5 },
          pr: 0,
          overflow: "hidden",
          transform: blnDesktopSidebarOpen ? "translateX(0)" : `translateX(-${intDrawerWidth + 28}px)`,
          transition: "transform 240ms cubic-bezier(0.2, 0, 0, 1), opacity 180ms ease",
          opacity: blnDesktopSidebarOpen ? 1 : 0,
          pointerEvents: blnDesktopSidebarOpen ? "auto" : "none"
        }}
      >
        {objSidebarContent}
      </Box>
      <Drawer
        variant="temporary"
        open={blnDrawerOpen}
        onClose={() => setBlnDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", lg: "none" },
          zIndex: intMenuZIndex,
          "& .MuiDrawer-paper": {
            width: intDrawerWidth,
            height: "100vh",
            border: "none",
            borderRadius: "0 32px 32px 0",
            backgroundColor: "transparent",
            boxShadow: "none",
            overflow: "hidden"
          }
        }}
        {...getAutomationProps("app-shell.mobile-drawer")}
      >
        {objSidebarContent}
      </Drawer>

      <BlockingLoaderViewportProvider getViewportElement={() => objMainContentRef.current}>
        <Box
          sx={{
            position: "relative",
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            overflow: "hidden",
            p: blnDashboardRoute ? { xs: 0.75, md: 1 } : { xs: 1, md: 1.5 }
          }}
        >
          <AppBar
            position="sticky"
            color="inherit"
            sx={{
              position: "relative",
              borderRadius: "24px",
              mb: 1.5,
              px: { xs: 0.25, sm: 0.75 },
              background: "linear-gradient(90deg, #e0f2fe 0%, #e9e7ff 55%, #f3e8ff 100%)",
              border: "1px solid rgba(255, 255, 255, 0.6)",
              boxShadow:
                "0 10px 30px rgba(59, 130, 246, 0.08), 0 6px 18px rgba(168, 85, 247, 0.08)"
            }}
          >
            <Toolbar sx={{ gap: 1.5, height: `${intTopBarHeight}px`, minHeight: `${intTopBarHeight}px !important`, boxSizing: "border-box", alignItems: "center" }}>
              <IconButton
                onClick={handleMenuToggle}
                sx={{
                  position: "relative",
                  zIndex: intMenuZIndex,
                  display: { xs: "inline-flex", lg: "none" },
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  backgroundColor: "rgba(248,250,252,0.88)"
                }}
                {...getAutomationProps("app-shell.menu-toggle.button")}
              >
                <MenuRoundedIcon />
              </IconButton>

              <Box sx={{ minWidth: 0, flexShrink: 0 }}>
                <Typography
                  sx={{
                    fontSize: { xs: "1.02rem", md: "1.28rem", lg: "1.42rem" },
                    color: "#0f172a",
                    textTransform: "none",
                    letterSpacing: "normal",
                    fontWeight: 700,
                    lineHeight: 1.43,
                    whiteSpace: "nowrap"
                  }}
                >
                  {tCommon("app_title", "Human Resource Management System")}
                </Typography>
              </Box>

              {lstLanguageOptions.length > 1 ? (
                <Box
                  sx={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 1,
                    display: { xs: "none", md: "block" }
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.25,
                      px: 0.75,
                      py: 0.55,
                      borderRadius: "16px",
                      backgroundColor: "rgba(255,255,255,0.96)",
                      border: "1px solid #dbe3ee",
                      boxShadow: "0 10px 20px rgba(15, 23, 42, 0.08)"
                    }}
                  >
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: "999px",
                        color: "#47658a"
                      }}
                    >
                      {blnLanguageSwitching ? <CircularProgress size={14} /> : <LanguageRoundedIcon sx={{ fontSize: 16 }} />}
                    </Box>
                    {lstLanguageOptions.map((dicLanguageOption) => {
                      const blnActive = dicLanguageOption.intLanguageID === intCurrentLanguageID;
                      return (
                        <ButtonBase
                          key={dicLanguageOption.intLanguageID}
                          onClick={() => {
                            void switchWorkspaceLanguage(dicLanguageOption.intLanguageID);
                          }}
                          disabled={blnLanguageSwitching || blnActive}
                          sx={{
                            px: 1.15,
                            py: 0.75,
                            minWidth: 44,
                            borderRadius: "12px",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            lineHeight: 1,
                            color: blnActive ? "#ffffff" : "#52637a",
                            backgroundColor: blnActive ? "#3f5f99" : "transparent",
                            boxShadow: blnActive ? "0 8px 16px rgba(63, 95, 153, 0.22)" : "none",
                            opacity: blnLanguageSwitching && !blnActive ? 0.72 : 1,
                            transition: "background-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease",
                            "&:hover": blnActive
                              ? {
                                  backgroundColor: "#3f5f99",
                                }
                              : {
                                  backgroundColor: "rgba(19, 42, 99, 0.08)",
                                  color: "#132a63",
                                }
                          }}
                          {...getAutomationProps(`app-shell.language.${dicLanguageOption.intLanguageID}.button`)}
                        >
                          {dicLanguageOption.strLabel}
                        </ButtonBase>
                      );
                    })}
                  </Paper>
                </Box>
              ) : null}

              <Box sx={{ flex: 1, minWidth: 0 }} />

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  minWidth: 0,
                  pr: { xs: 0.25, md: 0.75 }
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: "1.02rem", md: "1.28rem", lg: "1.42rem" },
                    fontWeight: 700,
                    color: "#0f172a",
                    letterSpacing: "-0.03em",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: { xs: "120px", sm: "220px", md: "320px" },
                    textAlign: "right"
                  }}
                >
                  {strPageTitle}
                </Typography>
                {strLinkedEmployeeName || intLinkedEmployeeID ? (
                  <Typography
                    sx={{
                      ml: 1,
                      px: 1,
                      py: 0.35,
                      borderRadius: "999px",
                      backgroundColor: "rgba(255,255,255,0.72)",
                      border: "1px solid rgba(148, 163, 184, 0.25)",
                      color: "#334155",
                      fontSize: { xs: "0.72rem", md: "0.76rem" },
                      fontWeight: 700,
                      maxWidth: { xs: "110px", sm: "180px", md: "240px" },
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={strLinkedEmployeeName || `Employee ID: ${intLinkedEmployeeID}`}
                  >
                    {strLinkedEmployeeName || `Employee #${intLinkedEmployeeID}`}
                  </Typography>
                ) : null}
              </Box>

              <IconButton
                onClick={openProfileMenu}
                disabled={blnLoggingOut}
                sx={{
                  p: 0.4,
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  backgroundColor: "rgba(248,250,252,0.92)"
                }}
                {...getAutomationProps("app-shell.profile-menu.button")}
              >
                <Avatar src={strAvatarUrl || undefined} sx={{ bgcolor: "rgba(14,116,144,0.12)", color: "#0e7490", fontWeight: 700, width: 42, height: 42 }}>
                  {strAvatarText}
                </Avatar>
              </IconButton>
            </Toolbar>
          </AppBar>

          <Box
            component="main"
            ref={objMainContentRef}
            onClickCapture={handleMainContentClick}
            sx={{
              position: "relative",
              minHeight: 0,
              height: `calc(100% - ${intTopBarHeight + 16}px)`,
              overflowY: "auto",
              overflowX: "hidden",
              pr: blnDashboardRoute ? 0 : 0.5
            }}
          >
            {children}
            <BlockingLoader
              blnOpen={blnLoggingOut}
              strLabel="Logging out..."
              intZIndex={intContentLoaderZIndex}
              blnLocal
            />
            <BlockingLoader
              blnOpen={blnLanguageSwitching}
              strLabel={tCommon("switching_language", "Switching language...")}
              intZIndex={intContentLoaderZIndex}
              blnLocal
            />
          </Box>
        </Box>
      </BlockingLoaderViewportProvider>

      <Menu
        anchorEl={objProfileAnchorEl}
        open={blnProfileMenuOpen}
        onClose={closeProfileMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          "data-controlid": "app-shell.profile-menu",
          sx: {
            mt: 1,
            minWidth: 240,
            borderRadius: "18px",
            boxShadow: "0 20px 45px rgba(15, 23, 42, 0.14)"
          }
        }}
      >
        <Box sx={{ px: 2, py: 1.5, textAlign: "left" }}>
          <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>{strProfileDisplayName}</Typography>
          {strLinkedEmployeeName && strLinkedEmployeeName !== strUserName ? (
            <Typography sx={{ mt: 0.35, color: "#64748b", fontSize: "0.8rem" }}>{strUserName}</Typography>
          ) : null}
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            closeProfileMenu();
            setBlnLogoutDialogOpen(true);
          }}
          disabled={blnLoggingOut}
          sx={{ gap: 1.25, py: 1.25, justifyContent: "flex-start", textAlign: "left" }}
          {...getAutomationProps("app-shell.logout.menu-item")}
        >
          <LogoutRoundedIcon fontSize="small" />
          <Typography sx={{ fontWeight: 600 }}>{tCommon("logout", "Logout")}</Typography>
        </MenuItem>
      </Menu>

      <Dialog open={blnLogoutDialogOpen} onClose={() => setBlnLogoutDialogOpen(false)} fullWidth maxWidth="xs" {...getAutomationProps("app-shell.logout.dialog")}>
        <DialogTitle>{tCommon("logout", "Logout")}</DialogTitle>
        <DialogContent>
          <Typography>{tCommon("confirm_logout", "Are you sure you want to logout?")}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlnLogoutDialogOpen(false)} disabled={blnLoggingOut} {...getAutomationProps("app-shell.logout.cancel.button")}>{tCommon("cancel", "Cancel")}</Button>
          <Button onClick={confirmLogout} variant="contained" color="error" disabled={blnLoggingOut} {...getAutomationProps("app-shell.logout.confirm.button")}>
            {tCommon("logout", "Logout")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function isSessionExpiredError(objError: unknown): boolean {
  if (objError instanceof ApiRequestError) {
    if (objError.intStatusCode === 401) {
      return true;
    }

    return /unauthorized|session|token|expired/i.test(objError.message);
  }

  return objError instanceof Error && /unauthorized|session|token|expired/i.test(objError.message);
}





