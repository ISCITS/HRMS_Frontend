"use client";

import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import { Box, Paper, Stack, Typography } from "@mui/material";
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
          maxWidth: 580,
          minHeight: "100%",
          mx: "auto",
          py: { xs: 2, sm: 3 },
          boxSizing: "border-box",
          justifyContent: "center",
          visibility: blnLoadingEmployeeOptions ? "hidden" : "visible"
        }}
      >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 4 },
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          backgroundColor: "#ffffff",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.10)"
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3.5 }}>
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{
              width: 48,
              height: 48,
              flexShrink: 0,
              borderRadius: "10px",
              color: "#2563eb",
              backgroundColor: "#eff6ff"
            }}
          >
            <SecurityRoundedIcon sx={{ fontSize: 30 }} />
          </Stack>
          <Stack spacing={0.5}>
            <Typography sx={{ color: "#0f172a", fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.2 }}>
              {blnAdminResetMode ? "Reset Employee Password" : "Change Password"}
            </Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.95rem", fontWeight: 500 }}>
              {blnAdminResetMode
                ? "Select an employee and set a new password for their account"
                : "Fill the form to change your password"}
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
