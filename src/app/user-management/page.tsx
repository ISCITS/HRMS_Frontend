"use client";

import Groups2RoundedIcon from "@mui/icons-material/Groups2Rounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { normalizeMenuResponse } from "@/lib/menu";
import type { CurrentUserContext, MenuResponse } from "@/models/AuthModels";
import { authApiService } from "@/services";

/*
Functional responsibility:
- Provide a real protected page for the backend-driven `/user-management` route.

Flow:
- Load authenticated user context and menu metadata from the backend.
- Render a role-aware landing panel instead of a 404 so post-login redirects remain valid.
*/
export default function UserManagementPage() {
  const objRouter = useRouter();
  const [blnLoading, setBlnLoading] = useState(true);
  const [objUserContext, setObjUserContext] = useState<CurrentUserContext | null>(null);
  const [objMenu, setObjMenu] = useState<MenuResponse | null>(null);

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

  if (blnLoading || !objUserContext || !objMenu) {
    return (
      <Box sx={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: "#64748b" }}>Loading user management workspace...</Typography>
        </Stack>
      </Box>
    );
  }

  const lstMasterMenuItems = objMenu.lstMenuItems.find((objItem) => objItem.strModuleCode === "MASTERS")?.lstChildren ?? [];
  const intModuleCount = objMenu.lstMenuItems.length;
  const strPrimaryRole = objUserContext.objUser.lstRoles[0] ?? "Workspace User";

  return (
    <Stack spacing={3}>
      <Paper
        sx={{
          p: { xs: 2.5, md: 3.5 },
          borderRadius: "28px",
          background: "linear-gradient(145deg, rgba(15,23,42,0.98), rgba(14,116,144,0.9))",
          color: "#f8fafc",
          overflow: "hidden",
          position: "relative"
        }}
      >
        <Stack spacing={2.5}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between">
            <Box>
              <Typography variant="overline" sx={{ opacity: 0.76 }}>
                Access Control
              </Typography>
              <Typography variant="h3" sx={{ mt: 0.5, fontSize: { xs: "2rem", md: "2.6rem" } }}>
                User management is ready for {objUserContext.objTenant.strTenantName}
              </Typography>
              <Typography sx={{ mt: 1.5, maxWidth: 760, color: "rgba(248,250,252,0.82)" }}>
                This route is now live, so backend-driven home redirects and dynamic menu navigation land on a valid protected page.
              </Typography>
            </Box>

            <Chip
              icon={<ShieldRoundedIcon />}
              label={strPrimaryRole}
              sx={{
                alignSelf: { xs: "flex-start", md: "flex-start" },
                backgroundColor: "rgba(255,255,255,0.12)",
                color: "#f8fafc",
                borderRadius: "999px"
              }}
            />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} flexWrap="wrap" useFlexGap>
            <Button component={Link} href="/dashboard" variant="contained" sx={{ borderRadius: "16px", px: 2.5 }}>
              Open dashboard
            </Button>
            {lstMasterMenuItems.map((objItem) => (
              <Button
                key={objItem.strModuleCode}
                component={Link}
                href={objItem.strRoute ?? "#"}
                variant="outlined"
                sx={{ borderRadius: "16px", px: 2.5, borderColor: "rgba(255,255,255,0.32)", color: "#f8fafc" }}
              >
                {objItem.strModuleName}
              </Button>
            ))}
          </Stack>
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5}>
        <Paper sx={{ flex: 1, p: 3, borderRadius: "24px" }}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Groups2RoundedIcon color="primary" />
            <Typography variant="h6">Signed-in admin context</Typography>
          </Stack>
          <Stack spacing={1.25} sx={{ mt: 2 }}>
            <Typography><strong>User:</strong> {objUserContext.objUser.strLoginName}</Typography>
            <Typography><strong>Email:</strong> {objUserContext.objUser.strEmailAddress}</Typography>
            <Typography><strong>Tenant:</strong> {objUserContext.objTenant.strTenantName}</Typography>
            <Typography><strong>Home route:</strong> {objMenu.strHomeRoute}</Typography>
            <Typography><strong>Masters children:</strong> {lstMasterMenuItems.map((objItem) => objItem.strModuleName).join(", ") || "None"}</Typography>
          </Stack>
        </Paper>

        <Paper sx={{ flex: 1, p: 3, borderRadius: "24px" }}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <InsightsRoundedIcon color="primary" />
            <Typography variant="h6">Dynamic access snapshot</Typography>
          </Stack>
          <Stack spacing={1.25} sx={{ mt: 2 }}>
            <Typography><strong>Modules available:</strong> {intModuleCount}</Typography>
            <Typography><strong>Primary role:</strong> {strPrimaryRole}</Typography>
            <Typography>
              <strong>Permissions:</strong> {objMenu.lstMenuItems.flatMap((objItem) => [objItem, ...objItem.lstChildren]).flatMap((objItem) => objItem.lstPermissionCodes).join(", ") || "None"}
            </Typography>
          </Stack>
        </Paper>
      </Stack>
    </Stack>
  );
}
