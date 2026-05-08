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
import { usePathname, useRouter } from "next/navigation";

import DynamicMenu from "@/components/navigation/DynamicMenu";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { resolveRouteModuleName } from "@/features/labels/utils/resolveRouteModuleName";
import { stripMasterTitle } from "@/features/labels/utils/stripMasterTitle";
import { authHelpers } from "@/lib/auth";
import { normalizeMenuResponse } from "@/lib/menu";
import type { CurrentUserContext, MenuResponse, TenantAuthDetails } from "@/models/AuthModels";
import { authApiService, clsApiRequestError } from "@/services";

const intDrawerWidth = 308;
const intTopBarHeight = 60;
const strLanguageSwitchTokenKey = "hrms_language_switch_token";
const strLanguageSwitchLanguageKey = "hrms_language_switch_language_id";
const strModuleLabelsLoadStartEventName = "hrms:module-label-load-start";
const strModuleLabelsLoadEndEventName = "hrms:module-label-load-end";
const intLanguageSwitchSettledDelayMs = 900;

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
  tCommon: (strKey: string, strFallback?: string) => string
) {
  const strLowerPath = (strPathname || "").toLowerCase();

  if (!strHeaderModuleName) {
    return getCommonPageTitle(strPathname, tCommon);
  }

  if (strHeaderModuleName === "employee-payroll-input") {
    if (strLowerPath.endsWith("/new")) {
      return tHeader("add_title", "Create Employee Payroll Input");
    }
    if (strLowerPath.includes("/edit")) {
      return tHeader("edit_title", "Edit Employee Payroll Input");
    }
    return stripMasterTitle(
      tHeader(
        "page_title",
        getLastBreadcrumbSegment(
          tHeader("breadcrumbs", "Payroll / Employee Payroll Input")
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

  if (strHeaderModuleName === "payslips") {
    return stripMasterTitle(
      tHeader("page_title", getLastBreadcrumbSegment(tHeader("breadcrumbs", "Payroll / Payslips")))
    );
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
    return "IT Declaration";
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

export default function AppShell({ children }: { children: ReactNode }) {
  const objRouter = useRouter();
  const strPathname = usePathname();
  const [blnDrawerOpen, setBlnDrawerOpen] = useState(false);
  const [blnDesktopSidebarOpen, setBlnDesktopSidebarOpen] = useState(false);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnLoggingOut, setBlnLoggingOut] = useState(false);
  const [blnLogoutDialogOpen, setBlnLogoutDialogOpen] = useState(false);
  const [objProfileAnchorEl, setObjProfileAnchorEl] = useState<HTMLElement | null>(null);
  const [objUserContext, setObjUserContext] = useState<CurrentUserContext | null>(null);
  const [objMenu, setObjMenu] = useState<MenuResponse>({ lstMenuItems: [], strHomeRoute: "/dashboard" });
  const [strBootstrapError, setStrBootstrapError] = useState("");
  const [blnLanguageSwitching, setBlnLanguageSwitching] = useState(false);
  const [objTenantLanguageDetails, setObjTenantLanguageDetails] = useState<TenantAuthDetails | null>(null);
  const [dicLanguageLabelByID, setDicLanguageLabelByID] = useState<Record<number, string>>({});
  const [strActiveLanguageSwitchToken, setStrActiveLanguageSwitchToken] = useState("");
  const [intPendingLabelLoads, setIntPendingLabelLoads] = useState(0);
  const [blnLanguageShellReady, setBlnLanguageShellReady] = useState(false);
  const [intLastLabelActivityAt, setIntLastLabelActivityAt] = useState(0);
  const [intLastContentMutationAt, setIntLastContentMutationAt] = useState(0);
  const objShellContentRef = useRef<HTMLDivElement | null>(null);
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
      ReturnType<typeof authApiService.getMenu>,
      Promise<{ Data?: TenantAuthDetails }>
    ] = [
      authApiService.getCurrentUser(intResolvedLanguageID),
      authApiService.getMenu(intResolvedLanguageID),
      strTenantUUID
        ? authApiService
            .getTenantAuthDetails(strTenantUUID, intResolvedLanguageID)
            .then((objResponse) => objResponse as { Data: TenantAuthDetails })
            .catch(() => ({}))
        : Promise.resolve({})
    ];

    const [objUserResult, objMenuResult, objTenantDetailsResult] = await Promise.all(lstRequests);
    const objTenantDetails = objTenantDetailsResult.Data;

    authHelpers.setTenantContext(
      objUserResult.Data.objTenant.intTenantID,
      undefined,
      intResolvedLanguageID ?? objUserResult.Data.objTenant.intLanguageID ?? undefined,
      objTenantDetails?.secondary_language_id ?? authHelpers.getSecondaryLanguageID() ?? undefined
    );
    setObjUserContext(objUserResult.Data);
    setObjMenu(normalizeMenuResponse(objMenuResult.Data));
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
      .then(() => {
        if (!blnMounted) {
          return;
        }
        setStrBootstrapError("");
      })
      .catch((objError: unknown) => {
        if (blnMounted) {
          if (isSessionExpiredError(objError)) {
            redirectToSessionExpired();
          } else {
            setStrBootstrapError(
              objError instanceof Error ? objError.message : "Unable to prepare your workspace."
            );
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

  async function confirmLogout() {
    setBlnLogoutDialogOpen(false);
    setBlnLoggingOut(true);
    await authApiService.logout().catch(() => undefined);
    window.location.replace(authHelpers.getLoginUrl());
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
    try {
      await loadWorkspaceContext(intRequestedLanguageID);
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
  const strAvatarText = strUserName.trim().charAt(0).toUpperCase() || "U";
  const strPageTitle = getLocalizedHeaderTitle(
    strPathname,
    strHeaderModuleName,
    tHeader,
    tCommon
  );
  const strTenantName = objUserContext?.objTenant.strTenantName || "Workspace";
  const blnProfileMenuOpen = Boolean(objProfileAnchorEl);

  function handleMenuToggle() {
    if (typeof window !== "undefined" && window.innerWidth >= 1200) {
      setBlnDesktopSidebarOpen((blnPrevious) => !blnPrevious);
      return;
    }

    setBlnDrawerOpen(true);
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
          px: 2.25,
          height: `${intTopBarHeight}px`,
          borderRadius: "24px",
          background: "linear-gradient(145deg, #0f766e 0%, #0f5d8d 52%, #1d4ed8 100%)",
          color: "#effcff",
          boxShadow: "0 24px 50px rgba(15, 23, 42, 0.18)",
          display: "flex",
          alignItems: "center",
          boxSizing: "border-box",
          overflow: "hidden"
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ height: "100%" }}>
          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: "16px",
              display: "grid",
              placeItems: "center",
              backgroundColor: "rgba(255,255,255,0.16)",
              border: "1px solid rgba(255,255,255,0.18)"
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
      </Paper>

      <Paper
        sx={{
          p: 1.25,
          borderRadius: "24px",
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          backgroundColor: "rgba(255,255,255,0.86)",
          backdropFilter: "blur(22px)",
          border: "1px solid rgba(148, 163, 184, 0.16)",
          boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
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
          onNavigate={() => {
            setBlnDrawerOpen(false);
            setBlnDesktopSidebarOpen(false);
          }}
        />
      </Paper>
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
          <Button variant="contained" onClick={() => window.location.reload()}>
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
      <BlockingLoader blnOpen={blnLoggingOut} strLabel="Logging out..." intZIndex={1600} />
      <BlockingLoader
        blnOpen={blnLanguageSwitching}
        strLabel={tCommon("switching_language", "Switching language...")}
        intZIndex={1590}
      />
      <Box
        sx={{
          width: blnDesktopSidebarOpen ? intDrawerWidth + 28 : 0,
          flexShrink: 0,
          height: "100vh",
          minHeight: 0,
          display: { xs: "none", lg: "block" },
          p: blnDesktopSidebarOpen ? { xs: 1, md: 1.5 } : 0,
          pr: blnDesktopSidebarOpen ? 0 : 0,
          overflow: "hidden",
          transition: "width 220ms ease, opacity 220ms ease, padding 220ms ease",
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
      >
        {objSidebarContent}
      </Drawer>

      <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, overflow: "hidden", p: { xs: 1, md: 1.5 } }}>
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
          <Toolbar sx={{ gap: 1.5, minHeight: "82px", alignItems: "center" }}>
            <IconButton
              onClick={handleMenuToggle}
              sx={{
                display: "inline-flex",
                border: "1px solid rgba(148, 163, 184, 0.18)",
                backgroundColor: "rgba(248,250,252,0.88)"
              }}
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
            </Box>

            <IconButton
              onClick={openProfileMenu}
              disabled={blnLoggingOut}
              sx={{
                p: 0.4,
                border: "1px solid rgba(148, 163, 184, 0.18)",
                backgroundColor: "rgba(248,250,252,0.92)"
              }}
            >
              <Avatar sx={{ bgcolor: "rgba(14,116,144,0.12)", color: "#0e7490", fontWeight: 700, width: 42, height: 42 }}>
                {strAvatarText}
              </Avatar>
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ minHeight: 0, height: "calc(100% - 98px)", overflowY: "auto", overflowX: "hidden", pr: 0.5 }}>{children}</Box>
      </Box>

      <Menu
        anchorEl={objProfileAnchorEl}
        open={blnProfileMenuOpen}
        onClose={closeProfileMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 240,
            borderRadius: "18px",
            boxShadow: "0 20px 45px rgba(15, 23, 42, 0.14)"
          }
        }}
      >
        <Box sx={{ px: 2, py: 1.5, textAlign: "left" }}>
          <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>{strUserName}</Typography>
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            closeProfileMenu();
            setBlnLogoutDialogOpen(true);
          }}
          disabled={blnLoggingOut}
          sx={{ gap: 1.25, py: 1.25, justifyContent: "flex-start", textAlign: "left" }}
        >
          <LogoutRoundedIcon fontSize="small" />
          <Typography sx={{ fontWeight: 600 }}>{tCommon("logout", "Logout")}</Typography>
        </MenuItem>
      </Menu>

      <Dialog open={blnLogoutDialogOpen} onClose={() => setBlnLogoutDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{tCommon("logout", "Logout")}</DialogTitle>
        <DialogContent>
          <Typography>{tCommon("confirm_logout", "Are you sure you want to logout?")}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlnLogoutDialogOpen(false)} disabled={blnLoggingOut}>{tCommon("cancel", "Cancel")}</Button>
          <Button onClick={confirmLogout} variant="contained" color="error" disabled={blnLoggingOut}>
            {tCommon("logout", "Logout")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function isSessionExpiredError(objError: unknown): boolean {
  if (objError instanceof clsApiRequestError) {
    if (objError.intStatusCode === 401) {
      return true;
    }

    return /unauthorized|session|token|expired/i.test(objError.message);
  }

  return objError instanceof Error && /unauthorized|session|token|expired/i.test(objError.message);
}
