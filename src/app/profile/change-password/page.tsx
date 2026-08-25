"use client";

import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import { Paper, Stack, Typography } from "@mui/material";

import ChangePasswordForm from "@/features/change-password/components/ChangePasswordForm";

export default function ChangePasswordPage() {
  return (
    <Stack
      sx={{
        width: "100%",
        maxWidth: 680,
        minHeight: "100%",
        mx: "auto",
        py: { xs: 2, sm: 3 },
        boxSizing: "border-box",
        justifyContent: "center"
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
              Change Password
            </Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.95rem", fontWeight: 500 }}>
              Fill the form to change your password  
            </Typography>
          </Stack>
        </Stack>
        <ChangePasswordForm />
      </Paper>
    </Stack>
  );
}
