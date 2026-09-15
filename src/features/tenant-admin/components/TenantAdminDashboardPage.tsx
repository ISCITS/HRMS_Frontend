"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";

import TenantAdminShell from "@/features/tenant-admin/components/TenantAdminShell";
import type { TenantAdminDashboardCounts } from "@/models/TenantAdministrationModels";
import { authHelpers } from "@/lib/auth";
import { tenantAdministrationService } from "@/services";

const lstQuickLinks = [
  {
    strTitle: "Manage Tenant",
    strDescription: "Review tenant configuration, open edit mode, and update provisioning settings.",
    strHref: "/HRMS/Administrator/tenants",
  },
  {
    strTitle: "Onboard New Tenant",
    strDescription: "Launch the existing multi-step tenant onboarding flow without changing its behavior.",
    strHref: "/HRMS/Administrator/onboarding",
  },
];

export default function TenantAdminDashboardPage() {
  const router = useRouter();
  const [objCounts, setObjCounts] = useState<TenantAdminDashboardCounts | null>(null);
  const [strError, setStrError] = useState("");

  useEffect(() => {
    let blnActive = true;
    tenantAdministrationService.getDashboardCounts()
      .then((objResult) => {
        if (blnActive) {
          setObjCounts(objResult.Data);
        }
      })
      .catch((objError) => {
        if (!blnActive) {
          return;
        }
        const strMessage = objError instanceof Error ? objError.message : "Unable to load dashboard.";
        if (/access|required|unauthorized/i.test(strMessage)) {
          authHelpers.clearSession();
          router.replace("/HRMS/Administrator/login");
          return;
        }
        setStrError(strMessage);
      });

    return () => {
      blnActive = false;
    };
  }, [router]);

  return (
    <TenantAdminShell>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Tenant Administration Dashboard</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Monitor tenant footprint, jump into tenant management, and launch onboarding from one place.
          </Typography>
        </Box>

        {strError ? <Alert severity="error">{strError}</Alert> : null}

        {!objCounts ? (
          <Box sx={{ minHeight: 240, display: "grid", placeItems: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }, gap: 3 }}>
            <Card sx={{ height: "100%" }}>
              <CardActionArea sx={{ height: "100%" }} onClick={() => router.push("/HRMS/Administrator/tenants")}>
                <CardContent>
                  <Typography variant="overline" color="primary.main">Overview</Typography>
                  <Typography variant="h3" fontWeight={800}>{objCounts.intAllTenants}</Typography>
                  <Typography variant="h6" fontWeight={700}>All Tenants</Typography>
                  <Typography color="text.secondary">Total tenant records managed in the common HRMS_Tenant database.</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
            <Card sx={{ height: "100%" }}>
              <CardActionArea sx={{ height: "100%" }} onClick={() => router.push("/HRMS/Administrator/tenants?status=active")}>
                <CardContent>
                  <Typography variant="overline" color="success.main">Health</Typography>
                  <Typography variant="h3" fontWeight={800}>{objCounts.intActiveTenants}</Typography>
                  <Typography variant="h6" fontWeight={700}>Active Tenants</Typography>
                  <Typography color="text.secondary">Tenants currently marked active and available for login and configuration.</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
            {lstQuickLinks.map((dicItem) => (
              <Card key={dicItem.strHref} sx={{ height: "100%" }}>
                <CardActionArea sx={{ height: "100%" }} onClick={() => router.push(dicItem.strHref)}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700}>{dicItem.strTitle}</Typography>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>{dicItem.strDescription}</Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        )}
      </Stack>
    </TenantAdminShell>
  );
}
