"use client";

import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { authHelpers } from "@/lib/auth";

export default function SessionExpiredClient() {
  const objRouter = useRouter();
  const objSearchParams = useSearchParams();
  const strTenantUUID = objSearchParams.get("tenantUuid")?.trim() ?? "";

  useEffect(() => {
    authHelpers.resetSessionExpiryRedirect();
  }, []);

  function handleLoginAgain() {
    objRouter.push(strTenantUUID ? `/login/${encodeURIComponent(strTenantUUID)}` : "/session-expired");
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 3, background: "#f8fafc" }}>
      <Paper sx={{ maxWidth: 520, width: "100%", p: 4, borderRadius: "28px", textAlign: "center" }}>
        <Stack spacing={2} alignItems="center">
          <Box
            sx={{
              width: 72,
              height: 72,
              display: "grid",
              placeItems: "center",
              borderRadius: "22px",
              backgroundColor: "rgba(14,116,144,0.1)"
            }}
          >
            <HistoryRoundedIcon color="primary" sx={{ fontSize: 34 }} />
          </Box>
          <Typography variant="h4">Session expired</Typography>
          <Typography sx={{ color: "#64748b" }}>
            Your session has ended due to inactivity. Login again to continue securely.
          </Typography>
          {strTenantUUID ? (
            <Typography variant="body2" sx={{ color: "#94a3b8" }}>
              {strTenantUUID}
            </Typography>
          ) : null}
          <Button variant="contained" size="large" onClick={handleLoginAgain} sx={{ mt: 1, minWidth: 180 }}>
            Login again
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
