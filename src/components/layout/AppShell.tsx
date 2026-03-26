"use client";

import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import SpaceDashboardRoundedIcon from "@mui/icons-material/SpaceDashboardRounded";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Paper,
  Stack,
  Toolbar,
  Typography
} from "@mui/material";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import DynamicMenu from "@/components/navigation/DynamicMenu";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { authHelpers } from "@/lib/auth";
import { normalizeMenuResponse } from "@/lib/menu";
import type { CurrentUserContext, MenuResponse } from "@/models/AuthModels";
import { authApiService } from "@/services";

const intDrawerWidth = 308;
const intTopBarHeight = 60;

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

export default function AppShell({ children }: { children: ReactNode }) {
  const objRouter = useRouter();
  const strPathname = usePathname();
  const [blnDrawerOpen, setBlnDrawerOpen] = useState(false);
  const [blnDesktopSidebarOpen, setBlnDesktopSidebarOpen] = useState(true);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnLoggingOut, setBlnLoggingOut] = useState(false);
  const [blnLogoutDialogOpen, setBlnLogoutDialogOpen] = useState(false);
  const [blnNavigating, setBlnNavigating] = useState(false);
  const [objUserContext, setObjUserContext] = useState<CurrentUserContext | null>(null);
  const [objMenu, setObjMenu] = useState<MenuResponse>({ lstMenuItems: [], strHomeRoute: "/dashboard" });

  useEffect(() => {
    let blnMounted = true;
    const strAccessToken = authHelpers.getAccessToken();

    if (!strAccessToken) {
      setBlnLoading(false);
      objRouter.replace("/login");
      return () => {
        blnMounted = false;
      };
    }

    Promise.all([authApiService.getCurrentUser(), authApiService.getMenu()])
      .then(([objUserResult, objMenuResult]) => {
        if (!blnMounted) {
          return;
        }
        authHelpers.setTenantContext(
          objUserResult.Data.objTenant.intTenantID,
          undefined,
          objUserResult.Data.objTenant.intLanguageID ?? undefined
        );
        setObjUserContext(objUserResult.Data);
        setObjMenu(normalizeMenuResponse(objMenuResult.Data));
      })
      .catch(() => {
        if (blnMounted) {
          objRouter.replace("/login");
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
    setBlnNavigating(false);
  }, [strPathname]);

  async function confirmLogout() {
    setBlnLogoutDialogOpen(false);
    setBlnLoggingOut(true);
    await authApiService.logout().catch(() => undefined);
    objRouter.replace("/login");
  }

  const strUserName = objUserContext?.objUser.strLoginName || objUserContext?.objUser.strEmailAddress || "Workspace user";
  const strAvatarText = strUserName.slice(0, 2).toUpperCase();
  const strPageTitle = getPageTitle(strPathname);
  const strTenantName = objUserContext?.objTenant.strTenantName || "Workspace";

  function handleMenuToggle() {
    if (typeof window !== "undefined" && window.innerWidth >= 1200) {
      setBlnDesktopSidebarOpen((blnPrevious) => !blnPrevious);
      return;
    }

    setBlnDrawerOpen(true);
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
            {/* <Typography sx={{ mt: 0.5, fontSize: "0.82rem", color: "rgba(236, 254, 255, 0.84)" }}>
              Human Resource Management System
            </Typography> */}
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
            setBlnNavigating(true);
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
          <Typography sx={{ color: "#64748b" }}>Preparing your workspace...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        minHeight: "100vh",
        overflow: "hidden",
        background:
          "radial-gradient(circle at top left, rgba(14,116,144,0.12), transparent 28%), linear-gradient(180deg, #f8fbff 0%, #eef4f8 100%)"
      }}
    >
      <BlockingLoader blnOpen={blnLoggingOut || blnNavigating} strLabel={blnLoggingOut ? "Logging out..." : "Loading..."} intZIndex={1600} />
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
                  fontWeight: 400,
                  lineHeight: 1.43,
                  whiteSpace: "nowrap"
                }}
              >
                Human Resource Management System
              </Typography>
            </Box>

            <Box
              sx={{
                flex: 1,
                display: "flex",
                justifyContent: "center",
                minWidth: 0,
                px: { xs: 0.5, md: 1.5 },
                transform: { xs: "translateX(-10px)", lg: "translateX(-24px)" }
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: "1.02rem", md: "1.28rem", lg: "1.42rem" },
                  fontWeight: 700,
                  color: "#0f172a",
                  letterSpacing: "-0.03em",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%"
                }}
              >
                {strPageTitle}
              </Typography>
            </Box>

            <Paper
              sx={{
                px: 1.1,
                py: 0.9,
                borderRadius: "22px",
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                backgroundColor: "transparent",
                border: "none",
                boxShadow: "none"
              }}
            >
              <Avatar sx={{ bgcolor: "rgba(14,116,144,0.12)", color: "#0e7490", fontWeight: 700, width: 42, height: 42 }}>
                {strAvatarText}
              </Avatar>
              <Box sx={{ display: { xs: "none", sm: "block" } }}>
                <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>{strUserName}</Typography>
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  {strTenantName}
                </Typography>
              </Box>
              <IconButton
                onClick={() => setBlnLogoutDialogOpen(true)}
                disabled={blnLoggingOut}
                sx={{
                  backgroundColor: "rgba(248,250,252,0.92)"
                }}
              >
                <LogoutRoundedIcon />
              </IconButton>
            </Paper>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ minHeight: 0, height: "calc(100% - 98px)", overflow: "hidden" }}>{children}</Box>
      </Box>

      <Dialog open={blnLogoutDialogOpen} onClose={() => setBlnLogoutDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Logout</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to logout?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlnLogoutDialogOpen(false)} disabled={blnLoggingOut}>Cancel</Button>
          <Button onClick={confirmLogout} variant="contained" color="error" disabled={blnLoggingOut}>
            Logout
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
