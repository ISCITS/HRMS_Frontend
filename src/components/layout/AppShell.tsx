"use client";

import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
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

const intDrawerWidth = 318;

export default function AppShell({ children }: { children: ReactNode }) {
  const objRouter = useRouter();
  const strPathname = usePathname();
  const [blnDrawerOpen, setBlnDrawerOpen] = useState(false);
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
  const strTenantName = objUserContext?.objTenant.strTenantName || "Acme HRMS";

  const objDrawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", p: 2.25, backgroundColor: "#f4f8fb", overflow: "hidden" }}>
      <Paper
        sx={{
          px: 2.25,
          py: 1.6,
          borderRadius: "28px",
          background: "linear-gradient(145deg, #0f766e 0%, #0e7490 52%, #155e75 100%)",
          color: "#ecfeff",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 18px 40px rgba(14,116,144,0.22)",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at top right, rgba(255,255,255,0.22), transparent 34%)",
            pointerEvents: "none",
          },
        }}
      >
        <Typography
          sx={{
            fontSize: "1.65rem",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          {strTenantName}
        </Typography>
      </Paper>

      <Paper sx={{ mt: 2, p: 1.5, borderRadius: "24px", flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", boxShadow: "0 14px 34px rgba(15,23,42,0.06)" }}>
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
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#f5f8fa" }}>
      <BlockingLoader blnOpen={blnLoggingOut || blnNavigating} strLabel={blnLoggingOut ? "Logging out..." : "Loading..."} intZIndex={1600} />
      <Drawer
        variant="temporary"
        open={blnDrawerOpen}
        onClose={() => setBlnDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: "block",
          "& .MuiDrawer-paper": { width: intDrawerWidth, border: "none", backgroundColor: "transparent", boxShadow: "none", overflow: "hidden" }
        }}
      >
        {objDrawer}
      </Drawer>

      <Box sx={{ flex: 1, minWidth: 0, p: { xs: 1.5, md: 2.5 } }}>
        <AppBar
          position="sticky"
          color="inherit"
          sx={{
            borderRadius: "28px",
            mb: 2.5,
            px: { xs: 1, md: 1.2 },
            backgroundColor: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(18px)",
            boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
            border: "1px solid rgba(148,163,184,0.2)",
          }}
        >
          <Toolbar sx={{ gap: 1.2, position: "relative", minHeight: { xs: 66, md: 70 } }}>
            <IconButton onClick={() => setBlnDrawerOpen(true)} sx={{ position: "relative", zIndex: 2 }}>
              <MenuRoundedIcon />
            </IconButton>

            <Box
              sx={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                width: { xs: "calc(100% - 190px)", md: "calc(100% - 430px)" },
                display: "flex",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <Box sx={{ minWidth: 0, textAlign: "center" }}>
                <Typography
                  sx={{
                    color: "#0f172a",
                    fontWeight: 900,
                    letterSpacing: "-0.03em",
                    fontSize: { xs: "0.98rem", sm: "1.1rem", md: "1.2rem" },
                    lineHeight: 1.1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "center",
                    gap: { xs: 0.5, md: 0.8 },
                  }}
                >
                  <Box component="span">Human Resource Management System</Box>
                  <Box
                    component="span"
                    sx={{
                      color: "#475569",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                    }}
                  >
                    -
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      color: "#0e7490",
                      fontWeight: 900,
                      letterSpacing: "0.08em",
                      fontSize: { xs: "0.84rem", md: "0.9rem" },
                      textTransform: "uppercase",
                    }}
                  >
                    HRMS
                  </Box>
                </Typography>
              </Box>
            </Box>

            <Box sx={{ flex: 1 }} />

            <IconButton sx={{ position: "relative", zIndex: 2 }}>
              <NotificationsNoneRoundedIcon />
            </IconButton>

            <Paper
              sx={{
                px: 1.25,
                py: 0.8,
                borderRadius: "18px",
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                position: "relative",
                zIndex: 2,
                boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
              }}
            >
              <Avatar sx={{ bgcolor: "rgba(14,116,144,0.12)", color: "#0e7490", fontWeight: 700 }}>{strAvatarText}</Avatar>
              <Box sx={{ display: { xs: "none", sm: "block" } }}>
                <Typography sx={{ fontWeight: 700 }}>{strUserName}</Typography>
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  {strTenantName}
                </Typography>
              </Box>
              <IconButton onClick={() => setBlnLogoutDialogOpen(true)} disabled={blnLoggingOut}>
                <LogoutRoundedIcon />
              </IconButton>
            </Paper>
          </Toolbar>
        </AppBar>

        <Box component="main">{children}</Box>
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
