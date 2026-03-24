"use client";

import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
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
import { enMessages } from "@/i18n/messages/en";
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

  const objDrawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", p: 2.25, backgroundColor: "#fcfffe", overflow: "hidden" }}>
      <Paper
        sx={{
          p: 2.25,
          borderRadius: "24px",
          background: "linear-gradient(160deg, rgba(15,118,110,0.9), rgba(14,116,144,0.88))",
          color: "#ecfeff"
        }}
      >
        <Typography variant="overline" sx={{ opacity: 0.78 }}>
          {enMessages.shell.workspace}
        </Typography>
        <Typography variant="h5" sx={{ mt: 0.5 }}>
          {objUserContext?.objTenant.strTenantName ?? "Resolving workspace"}
        </Typography>
        <Typography sx={{ mt: 1, opacity: 0.82 }}>
          {objUserContext?.objTenant.strTenantCode ?? "TENANT"}
        </Typography>
      </Paper>

      <Paper sx={{ mt: 2, p: 1.5, borderRadius: "24px", flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
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
            px: 1,
            backgroundColor: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(18px)"
          }}
        >
          <Toolbar sx={{ gap: 1.5 }}>
            <IconButton onClick={() => setBlnDrawerOpen(true)}>
              <MenuRoundedIcon />
            </IconButton>

            <Paper
              sx={{
                px: 2,
                py: 1.2,
                borderRadius: "18px",
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                minWidth: 0,
                flex: 1
              }}
            >
              <SearchRoundedIcon sx={{ color: "#64748b" }} />
              <Typography sx={{ color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {enMessages.shell.searchPlaceholder}
              </Typography>
            </Paper>

            <IconButton>
              <NotificationsNoneRoundedIcon />
            </IconButton>

            <Paper
              sx={{
                px: 1.25,
                py: 0.8,
                borderRadius: "18px",
                display: "flex",
                alignItems: "center",
                gap: 1.25
              }}
            >
              <Avatar sx={{ bgcolor: "rgba(14,116,144,0.12)", color: "#0e7490", fontWeight: 700 }}>{strAvatarText}</Avatar>
              <Box sx={{ display: { xs: "none", sm: "block" } }}>
                <Typography sx={{ fontWeight: 700 }}>{strUserName}</Typography>
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  {objUserContext?.objTenant.strTenantName}
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
