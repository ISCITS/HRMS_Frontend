"use client";

import LockRoundedIcon from "@mui/icons-material/LockRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import { Box, Breadcrumbs, Paper, Stack, Typography } from "@mui/material";
import { useCallback, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import ChangePasswordForm from "@/features/change-password/components/ChangePasswordForm";
import { useActionRights } from "@/features/security/hooks/useActionRights";

export default function ChangePasswordPage() {
  const { blnLoading: blnRightsLoading, hasRight } = useActionRights();
  const [blnEmployeeOptionsReady, setBlnEmployeeOptionsReady] = useState(false);
  const handleEmployeeOptionsLoaded = useCallback(() => {
    setBlnEmployeeOptionsReady(true);
  }, []);

  if (blnRightsLoading) {
    return <BlockingLoader blnOpen strLabel="Loading..." />;
  }

  const blnAdminResetMode = hasRight("ADMIN_CHANGE_PASSWORD", "RESET_EMPLOYEE_PASSWORD");
  const blnLoadingEmployeeOptions = blnAdminResetMode && !blnEmployeeOptionsReady;

  return (
    <Box sx={{ width: "100%", minHeight: "100%" }}>
      <BlockingLoader blnOpen={blnLoadingEmployeeOptions} strLabel="Loading employees..." />
      <Stack
        sx={{
          width: "100%",
          minHeight: "100%",
          py: 0,
          boxSizing: "border-box",
          justifyContent: "flex-start",
          visibility: blnLoadingEmployeeOptions ? "hidden" : "visible"
        }}
      >
      <Breadcrumbs aria-label="breadcrumb" separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />} sx={{ fontSize: 13, py: 0.5, ml: "3px", color: "#64748b" }}>
        <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>
          Administration
        </Typography>
        <Typography component="h1" aria-current="page" sx={{ fontSize: "inherit", fontWeight: 700, color: "#243b53" }}>
          Change Password
        </Typography>
      </Breadcrumbs>
      <Paper
        elevation={0}
        sx={{
          width: "min(750px, 100%)",
          mx: "auto",
          mt: 1.5,
          p: { xs: 2, sm: 2.5 },
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          backgroundColor: "#ffffff",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.10)"
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3.5 }}>
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{
              width: 52,
              height: 52,
              flexShrink: 0,
              borderRadius: "50%",
              color: "var(--app-primary-color)",
              backgroundColor: "var(--app-primary-soft)"
            }}
          >
            <LockRoundedIcon sx={{ fontSize: 28 }} />
          </Stack>
          <Stack spacing={0.5}>
            <Typography sx={{ color: "#0f172a", fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.2 }}>
              Change Password
            </Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.95rem", fontWeight: 500 }}>
              Update your account password to keep your account secure.
            </Typography>
          </Stack>
        </Stack>
        <ChangePasswordForm
          blnAdminResetMode={blnAdminResetMode}
          fnOnEmployeeOptionsLoaded={handleEmployeeOptionsLoaded}
        />
      </Paper>
      </Stack>
    </Box>
  );
}
