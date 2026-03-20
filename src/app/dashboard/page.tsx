"use client";

import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardLanding from "@/components/dashboard/DashboardLanding";
import type { CurrentUserContext, MenuResponse } from "@/models/AuthModels";
import { authApiService } from "@/services";

export default function DashboardPage() {
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
        setObjMenu(objMenuResult.Data);
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
          <Typography sx={{ color: "#64748b" }}>Loading dashboard...</Typography>
        </Stack>
      </Box>
    );
  }

  return <DashboardLanding objUserContext={objUserContext} objMenu={objMenu} />;
}
