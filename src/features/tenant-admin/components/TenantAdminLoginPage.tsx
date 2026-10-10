"use client";

import {
  FormEvent,
  Suspense,
  useState } from "react";
import { useRouter,
  useSearchParams } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  InputAdornment,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import AlternateEmailRoundedIcon from "@mui/icons-material/AlternateEmailRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";

import { appConfig } from "@/config/app";
import { tenantAdministrationService } from "@/services";
import { DottedLoader } from "@/components/shared/BlockingLoader";
import { loginCompactSx, loginInputRootSx, loginTextFieldSx } from "@/components/auth/loginCompactSx";

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
    <Box className="login-page-root" sx={loginCompactSx}>
      <Box className="login-shell">
        <Box className="login-hero-panel">
          <Box className="login-brand-row">
            <Box className="login-brand-mark" aria-hidden="true">
              <span />
              <span />
            </Box>
            <Typography component="span" className="login-brand-name">{appConfig.appName}</Typography>
            {/* <span className="login-brand-divider" />
            <Typography component="span" className="login-powered-label">Powered by</Typography>
            <Box className="login-powered-mark" aria-hidden="true">
              <span />
            </Box>
            <Typography component="span" className="login-powered-name">NavCode.ai</Typography> */}
          </Box>
          <Box className="login-hero-content">
            <Typography component="h1" className="login-hero-title">
              Your people.<br />
              <span>A stronger tomorrow.</span>
            </Typography>
            <Typography className="login-hero-copy">
              A unified HR platform to manage your people, payroll and workplace simply and securely.
            </Typography>
            <Box className="login-benefit-list">
              <Box className="login-benefit-item">
                <Box className="login-benefit-icon"><GroupsRoundedIcon /></Box>
                <Typography>Empower<br />your workforce</Typography>
              </Box>
              <Box className="login-benefit-item">
                <Box className="login-benefit-icon"><SettingsRoundedIcon /></Box>
                <Typography>Simplify<br />HR operations</Typography>
              </Box>
              <Box className="login-benefit-item">
                <Box className="login-benefit-icon"><BarChartRoundedIcon /></Box>
                <Typography>Drive<br />growth together</Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box className="login-form-panel">
          <Box className="login-form-card">
            <Box className="login-form-intro">
              <Typography className="login-welcome-title">
                Sign in to<br />
                <span>{appConfig.appName}</span>
              </Typography>
              <Typography className="login-welcome-subtitle">
                Use your administrator account to manage tenants and platform setup.
              </Typography>
            </Box>

            <Stack spacing={2.25} component="form" onSubmit={handleSubmit} className="login-form-stack">
              {strError ? <Alert severity="error">{strError}</Alert> : null}

              <Box>
                <TextField
                  label="Login ID or Email"
                  placeholder="Enter your login ID or email"
                  sx={loginTextFieldSx}
                  inputProps={{ "data-controlid": "tenant-admin.login.login-id.input" }}
                  value={strLoginID}
                  onChange={(e) => setStrLoginID(e.target.value)}
                  required
                  fullWidth
                  autoFocus
                  InputProps={{
                    sx: loginInputRootSx,
                    startAdornment: (
                      <InputAdornment position="start">
                        <AlternateEmailRoundedIcon className="login-input-icon" />
                      </InputAdornment>
                    )
                  }}
                />
              </Box>
              <Box>
                <TextField
                  label="Password"
                  placeholder="Enter your password"
                  sx={loginTextFieldSx}
                  type="password"
                  inputProps={{ "data-controlid": "tenant-admin.login.password.input" }}
                  value={strPassword}
                  onChange={(e) => setStrPassword(e.target.value)}
                  required
                  fullWidth
                  InputProps={{
                    sx: loginInputRootSx,
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockRoundedIcon className="login-input-icon" />
                      </InputAdornment>
                    )
                  }}
                />
              </Box>
              <Button
                data-controlid="tenant-admin.login.submit.button"
                type="submit"
                variant="contained"
                size="large"
                disabled={blnSubmitting}
                className="login-primary-button"
                endIcon={blnSubmitting ? <DottedLoader color="inherit" intSize={18} /> : <span className="login-submit-arrow"><ArrowForwardRoundedIcon /></span>}
              >
                Sign In
              </Button>
              <Box className="login-helper-links">
                <Typography variant="body2" className="login-helper-text">
                  Your access is managed by {appConfig.appName}.
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
