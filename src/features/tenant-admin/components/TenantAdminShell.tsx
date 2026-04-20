"use client";

import { PropsWithChildren } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AppBar,
  Box,
  Button,
  Container,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";

import { authApiService } from "@/services";
import { authHelpers } from "@/lib/auth";

const lstLinks = [
  { strHref: "/HRMS/Administrator/dashboard", strLabel: "Dashboard" },
  { strHref: "/HRMS/Administrator/tenants", strLabel: "Manage Tenant" },
  { strHref: "/HRMS/Administrator/onboarding", strLabel: "Onboard New Tenant" },
];

export default function TenantAdminShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      await authApiService.logout();
    } catch {
      authHelpers.clearSession();
    } finally {
      router.replace("/HRMS/Administrator/login");
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f3f6fb" }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
        <Toolbar sx={{ gap: 2, justifyContent: "space-between" }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6" fontWeight={800} color="primary.main">
              HRMS Tenant Administration
            </Typography>
            <Stack direction="row" spacing={1}>
              {lstLinks.map((dicLink) => {
                const blnActive = pathname === dicLink.strHref || pathname?.startsWith(`${dicLink.strHref}/`);
                return (
                  <Button
                    key={dicLink.strHref}
                    component={Link}
                    href={dicLink.strHref}
                    color={blnActive ? "primary" : "inherit"}
                    variant={blnActive ? "contained" : "text"}
                    size="small"
                  >
                    {dicLink.strLabel}
                  </Button>
                );
              })}
            </Stack>
          </Stack>
          <Button variant="outlined" onClick={handleLogout}>Logout</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  );
}
