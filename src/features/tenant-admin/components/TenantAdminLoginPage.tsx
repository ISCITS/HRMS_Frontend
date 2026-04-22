"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { tenantAdministrationService } from "@/services";

export default function TenantAdminLoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TenantAdminLoginPageContent />
    </Suspense>
  );
}

function TenantAdminLoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [strLoginID, setStrLoginID] = useState("");
  const [strPassword, setStrPassword] = useState("");
  const [strError, setStrError] = useState("");
  const [blnSubmitting, setBlnSubmitting] = useState(false);

  async function handleSubmit(objEvent: FormEvent<HTMLFormElement>) {
    objEvent.preventDefault();
    setStrError("");
    setBlnSubmitting(true);
    try {
      const objResult = await tenantAdministrationService.login({
        strLoginID,
        strPassword,
      });
      const strRedirect = searchParams.get("redirect");
      router.replace(strRedirect || objResult.Data.objAuth.strHomeRoute || "/HRMS/Administrator/dashboard");
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to sign in.");
    } finally {
      setBlnSubmitting(false);
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "#eef3f9", p: 3 }}>
      <Paper elevation={0} sx={{ width: "100%", maxWidth: 460, p: { xs: 3, md: 4 }, borderRadius: 4, border: "1px solid", borderColor: "divider" }}>
        <Stack spacing={3} component="form" onSubmit={handleSubmit}>
          <Box>
            <Typography variant="overline" color="primary.main" fontWeight={700}>Administrator Portal</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>Tenant Administration Login</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Sign in with your tenant administrator credentials to manage onboarding and tenant configuration.
            </Typography>
          </Box>

          {strError ? <Alert severity="error">{strError}</Alert> : null}

          <TextField
            label="Login ID or Email"
            value={strLoginID}
            onChange={(e) => setStrLoginID(e.target.value)}
            required
            fullWidth
            autoFocus
          />
          <TextField
            label="Password"
            type="password"
            value={strPassword}
            onChange={(e) => setStrPassword(e.target.value)}
            required
            fullWidth
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={blnSubmitting}
            startIcon={blnSubmitting ? <CircularProgress color="inherit" size={18} /> : undefined}
          >
            Sign In
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
