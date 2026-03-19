"use client";

import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import { Box, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { enMessages } from "@/i18n/messages/en";
import { getPostLoginRoute } from "@/lib/RouteGuard";
import { authApiService } from "@/services";

export default function SsoCallbackPage() {
  const objRouter = useRouter();
  const objSearchParams = useSearchParams();
  const [strStatus, setStrStatus] = useState(enMessages.auth.ssoCallbackSubtitle);

  useEffect(() => {
    async function completeSsoCallback() {
      try {
        const objPayload = await authApiService.completeSsoCallback(objSearchParams.toString());
        setStrStatus("Workspace ready. Redirecting now.");
        objRouter.replace(getPostLoginRoute(objPayload.Data.strHomeRoute));
      } catch (objError) {
        setStrStatus(objError instanceof Error ? objError.message : "Unable to complete secure sign-in.");
      }
    }

    void completeSsoCallback();
  }, [objRouter, objSearchParams]);

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
            <CheckCircleOutlineRoundedIcon color="primary" sx={{ fontSize: 34 }} />
          </Box>
          <Typography variant="h4">{enMessages.auth.ssoCallbackTitle}</Typography>
          <Typography sx={{ color: "#64748b" }}>{strStatus}</Typography>
          <CircularProgress />
        </Stack>
      </Paper>
    </Box>
  );
}
