"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
// import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  InputAdornment,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { appConfig } from "@/config/app";
import { DottedLoader } from "@/components/shared/BlockingLoader";
import { loginCompactSx, loginInputRootSx, loginTextFieldSx } from "@/components/auth/loginCompactSx";
import type { TenantAuthDetails, TenantLookupData } from "@/models/AuthModels";
import { authApiService } from "@/services";
import { resolveErrorMessage } from "@/services/auth/AuthApiService";
import styles from "./forgot-password.module.css";

const emailAddressPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const objSearchParams = useSearchParams();
  const strTenantUUID = useMemo(() => objSearchParams.get("tenantUuid")?.trim() || null, [objSearchParams]);
  const [strEmailAddress, setStrEmailAddress] = useState("");
  const [strEmailError, setStrEmailError] = useState("");
  const [strStatusMessage, setStrStatusMessage] = useState("");
  const [strErrorMessage, setStrErrorMessage] = useState("");
  const [strTenantDisplayName, setStrTenantDisplayName] = useState("");
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const strBackToLoginHref = strTenantUUID ? `/t/${encodeURIComponent(strTenantUUID)}/login` : "/login";
  const strCompanyDisplayName = strTenantDisplayName || "Company Name";
  const blnEmailAddressValid = emailAddressPattern.test(strEmailAddress.trim());

  useEffect(() => {
    if (!strTenantUUID) {
      setStrTenantDisplayName("");
      return;
    }

    let blnActive = true;
    Promise.all([
      authApiService.getTenantAuthDetails(strTenantUUID).catch(() => null),
      authApiService.getTenant(strTenantUUID).catch(() => null)
    ]).then(([objAuthDetailsResult, objTenantResult]) => {
      if (!blnActive) {
        return;
      }

      const strResolvedTenantName =
        resolveTenantDisplayName(objAuthDetailsResult?.Data ?? null) ||
        resolveTenantLookupDisplayName(objTenantResult?.Data ?? null);
      setStrTenantDisplayName(strResolvedTenantName);
    }).catch(() => {
      if (blnActive) {
        setStrTenantDisplayName("");
      }
    });

    return () => {
      blnActive = false;
    };
  }, [strTenantUUID]);

  async function submitForgotPassword(objEvent: FormEvent<HTMLFormElement>) {
    objEvent.preventDefault();
    const strEmail = strEmailAddress.trim();
    setStrStatusMessage("");
    setStrErrorMessage("");

    if (!strEmail) {
      setStrEmailError("Email address is required.");
      return;
    }

    if (!emailAddressPattern.test(strEmail)) {
      setStrEmailError("Enter a valid email address.");
      return;
    }

    setStrEmailError("");
    setBlnSubmitting(true);
    try {
      await authApiService.forgotPassword({
        strEmailAddress: strEmail,
        strTenantUUID: strTenantUUID ?? undefined
      });
      setStrStatusMessage("If the email is linked to an active HRMS account, password reset instructions will be sent shortly.");
    } catch (objError) {
      setStrErrorMessage(resolveErrorMessage(objError, "Unable to request password reset."));
    } finally {
      setBlnSubmitting(false);
    }
  }

  return (
    <Box className={`login-page-root login-auth-page ${styles.forgotRoot}`} sx={loginCompactSx}>
      <Box className="login-shell">
        <Box className="login-hero-panel">
          <Box className="login-brand-row">
            <Box component="img" src="/images/NavHRLogo.svg" alt="NavHR" className="login-brand-mark" />
            <Typography component="span" className="login-brand-name">{appConfig.appName}</Typography>
            <span className="login-brand-divider" />
            <Typography component="span" className="login-powered-label">Powered by</Typography>
            <Box component="img" src="/images/PoweredByLogo.svg" alt="" className="login-powered-mark" aria-hidden="true" />
            <Typography component="span" className="login-powered-name">NavCode.ai</Typography>
          </Box>

          <Box className={`login-hero-content ${styles.forgotHeroContent}`}>
            <Typography component="h1" className="login-hero-title">
              Reset access<br />
              <span>without interrupting<br />your HR workflow.</span>
            </Typography>
            <Typography className="login-hero-copy">
              We will send a secure reset link to your registered work email so you can return to
              payroll, leave, and employee operations quickly.
            </Typography>

            <Stack className={styles.infoPoints}>
              <Box className={styles.infoPoint}>
                <Box className="login-benefit-icon">
                  <MailOutlineRoundedIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography className={styles.infoPointTitle}>Verified delivery</Typography>
                  <Typography className={styles.infoPointText}>
                    Password instructions are sent only to the email mapped to your HRMS account.
                  </Typography>
                </Box>
              </Box>

              <Box className={styles.infoPoint}>
                <Box className="login-benefit-icon">
                  <ShieldRoundedIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography className={styles.infoPointTitle}>Time-bound security</Typography>
                  <Typography className={styles.infoPointText}>
                    Recovery links expire automatically to protect employee and payroll data.
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Box>
        </Box>

        <Box className="login-form-panel">
          <Box className={`login-form-card ${styles.forgotCard}`}>
            {/* Language switcher kept for future use.
            <Box className="login-language-switcher-row">
              <Box className="login-language-switcher" role="tablist" aria-label="Forgot password language switcher">
                <Box className="login-language-switcher-icon">
                  <LanguageRoundedIcon fontSize="small" />
                </Box>
                <button type="button" className="login-language-button login-language-button-active" aria-pressed="true">
                  Eng
                </button>
                <button type="button" className="login-language-button" aria-pressed="false">
                  {"\u0939\u093f\u0928\u094d\u0926\u0940"}
                </button>
              </Box>
            </Box>
            */}

            <Box className="login-form-intro">
              <Typography className={styles.pageEyebrow}>{strCompanyDisplayName}</Typography>
              <Typography className="login-welcome-title">
                Forgot <span>your password?</span>
              </Typography>
              <Typography className="login-welcome-subtitle">
                Enter your registered work email address and we will send you password reset instructions.
              </Typography>
            </Box>

            <Stack component="form" spacing={3} className="login-form-stack" noValidate onSubmit={submitForgotPassword}>
              {strStatusMessage ? (
                <Alert severity="success" data-controlid="auth.forgot-password.success.alert">
                  {strStatusMessage}
                </Alert>
              ) : null}

              {strErrorMessage ? (
                <Alert severity="error" data-controlid="auth.forgot-password.error.alert">
                  {strErrorMessage}
                </Alert>
              ) : null}

              <TextField
                controlId="auth.forgot-password.email.input"
                inputProps={{ "controlId": "auth.forgot-password.email.input" }}
                sx={{ ...(loginTextFieldSx as object), "--login-label-start": "62px" }}
                label="Email Address"
                type="email"
                value={strEmailAddress}
                onChange={(objEvent) => {
                  setStrEmailAddress(objEvent.target.value);
                  if (strEmailError) {
                    setStrEmailError("");
                  }
                }}
                error={Boolean(strEmailError)}
                helperText={strEmailError}
                fullWidth
                required
                autoFocus
                InputProps={{
                  sx: loginInputRootSx,
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailOutlineRoundedIcon className="login-input-icon" />
                    </InputAdornment>
                  )
                }}
              />

              <Button
                controlId="auth.forgot-password.submit.button"
                className="login-primary-button"
                variant="contained"
                size="large"
                type="submit"
                disabled={blnSubmitting || !blnEmailAddressValid}
                fullWidth
                endIcon={
                  <span className="login-submit-arrow">
                    {blnSubmitting ? <DottedLoader intSize={34} sx={{ color: "#ffffff" }} /> : <ArrowForwardRoundedIcon />}
                  </span>
                }
              >
                {blnSubmitting ? "Sending..." : "Send Reset Instructions"}
              </Button>

              <Box className={`login-helper-links ${styles.backLinkRow}`}>
                <Typography
                  className={styles.backLink}
                  component={Link}
                  href={strBackToLoginHref}
                  controlId="auth.forgot-password.back-to-login.link"
                >
                  <ArrowBackRoundedIcon fontSize="small" />
                  <span>Back to Login</span>
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function resolveTenantDisplayName(objTenantAuthDetails: TenantAuthDetails | null): string {
  const strTenantName =
    objTenantAuthDetails?.tenant_name?.trim() ||
    objTenantAuthDetails?.tenantName?.trim() ||
    objTenantAuthDetails?.TenantName?.trim() ||
    objTenantAuthDetails?.strTenantName?.trim() ||
    objTenantAuthDetails?.StrTenantName?.trim();
  return strTenantName ?? "";
}

function resolveTenantLookupDisplayName(objTenant?: TenantLookupData | null): string {
  if (!objTenant) {
    return "";
  }

  const dicTenant = objTenant as TenantLookupData & {
    tenant_name?: string | null;
    tenantName?: string | null;
    TenantName?: string | null;
    StrTenantName?: string | null;
  };

  return (
    dicTenant.strTenantName?.trim() ||
    dicTenant.tenant_name?.trim() ||
    dicTenant.tenantName?.trim() ||
    dicTenant.TenantName?.trim() ||
    dicTenant.StrTenantName?.trim() ||
    ""
  );
}
