"use client";

import LockRoundedIcon from "@mui/icons-material/LockRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import styles from "@/components/auth/AuthLoginExperience.module.css";
import { enMessages } from "@/i18n/messages/en";
import type { TenantLookupData } from "@/models/AuthModels";
import { getPostLoginRoute } from "@/lib/RouteGuard";
import { authApiService } from "@/services";

type AuthLoginExperienceProps = {
  strMode: "generic" | "tenant";
  strTenantUUID?: string;
};

export default function AuthLoginExperience({ strMode, strTenantUUID }: AuthLoginExperienceProps) {
  const objRouter = useRouter();
  const objSearchParams = useSearchParams();
  const [strLoginID, setStrLoginID] = useState("");
  const [strPassword, setStrPassword] = useState("");
  const [strError, setStrError] = useState("");
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [blnPasswordVisible, setBlnPasswordVisible] = useState(false);
  const [objTenant, setObjTenant] = useState<TenantLookupData | null>(null);
  const [blnTenantLoading, setBlnTenantLoading] = useState(strMode === "tenant");

  useEffect(() => {
    if (strMode !== "tenant" || !strTenantUUID) {
      return;
    }

    let blnActive = true;
    setBlnTenantLoading(true);

    authApiService
      .getTenant(strTenantUUID)
      .then((objResult) => {
        if (!blnActive) {
          return;
        }
        setObjTenant(objResult.Data);
      })
      .catch((objError: Error) => {
        if (!blnActive) {
          return;
        }
        setStrError(objError.message || enMessages.auth.invalidTenant);
        setObjTenant(null);
      })
      .finally(() => {
        if (blnActive) {
          setBlnTenantLoading(false);
        }
      });

    return () => {
      blnActive = false;
    };
  }, [strMode, strTenantUUID]);

  async function submitForm() {
    setStrError("");
    setBlnSubmitting(true);

    try {
      if (strMode === "tenant" && strTenantUUID) {
        const objResult = await authApiService.login({
          strTenantUUID,
          strLoginID,
          strPassword
        });
        objRouter.push(getPostLoginRoute(objResult.Data.strHomeRoute));
        return;
      }

      const objResult = await authApiService.genericLogin({
        strEmailAddress: strLoginID,
        strPassword
      });
      objRouter.push(getPostLoginRoute(objResult.Data.strHomeRoute));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to sign in.");
    } finally {
      setBlnSubmitting(false);
    }
  }

  async function startSso() {
    if (!strTenantUUID) {
      return;
    }

    try {
      const objRedirect = await authApiService.getSsoRedirect(strTenantUUID);
      window.location.href = objRedirect.Data.strRedirectUrl;
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to start SSO.");
    }
  }

  const strTitle = strMode === "tenant" ? enMessages.auth.tenantTitle : enMessages.auth.genericTitle;
  const strSubtitle = strMode === "tenant" ? enMessages.auth.tenantSubtitle : enMessages.auth.genericSubtitle;
  const strCta = strMode === "tenant" ? enMessages.auth.localButton : enMessages.auth.genericButton;
  const strTenantHint = objSearchParams.get("tenant");
  const strSwitchHref = strMode === "tenant" ? "/login" : strTenantHint ? `/t/${strTenantHint}/login` : "";
  const strSwitchLabel = strMode === "tenant" ? enMessages.auth.backToGeneric : enMessages.auth.backToTenant;

  return (
    <Box className={styles.pageRoot}>
      <Box className={styles.shell}>
        <Box className={styles.heroPanel}>
          <Box className={styles.heroContent}>
            <Box className={styles.badgeRow}>
              <span className={styles.heroBadge}>SaaS HRMS</span>
              <span className={styles.heroBadge}>Tenant-aware access</span>
            </Box>

            <h1 className={styles.heroTitle}>Secure people operations without login friction.</h1>
            <p className={styles.heroSubtitle}>
              Resolve tenant context early, blend local and SSO-ready experiences, and land every user on the right dashboard with a cleaner enterprise flow.
            </p>

            <Box className={styles.heroStats}>
              <Box className={styles.heroStat}>
                <Typography variant="body2" sx={{ opacity: 0.76 }}>
                  Tenant routing
                </Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>
                  UUID-first
                </Typography>
              </Box>
              <Box className={styles.heroStat}>
                <Typography variant="body2" sx={{ opacity: 0.76 }}>
                  Access modes
                </Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>
                  Local + SSO
                </Typography>
              </Box>
              <Box className={styles.heroStat}>
                <Typography variant="body2" sx={{ opacity: 0.76 }}>
                  Landing logic
                </Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>
                  Role-aware
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box className={styles.formPanel}>
          <Box className={styles.formCard}>
            <Typography className={styles.eyebrow}>
              {strMode === "tenant" ? "Tenant access" : "Generic access"}
            </Typography>
            <Typography className={styles.title}>{strTitle}</Typography>
            <Typography className={styles.subtitle}>{strSubtitle}</Typography>

            <Stack spacing={2.25} sx={{ mt: 3 }}>
              {strError ? <Alert severity="error">{strError}</Alert> : null}

              {strMode === "tenant" ? (
                <Box className={styles.tenantSummary}>
                  <Typography className={styles.tenantSummaryLabel}>Resolved workspace</Typography>
                  <Typography className={styles.tenantSummaryValue}>
                    {blnTenantLoading ? "Resolving tenant..." : objTenant?.strTenantName ?? "Tenant unavailable"}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.75, color: "#475569" }}>
                    {strTenantUUID}
                  </Typography>
                </Box>
              ) : null}

              <TextField
                label={strMode === "tenant" ? enMessages.auth.loginIdLabel : enMessages.auth.emailLabel}
                value={strLoginID}
                onChange={(objEvent) => setStrLoginID(objEvent.target.value)}
                fullWidth
              />

              <TextField
                label={enMessages.auth.passwordLabel}
                type={blnPasswordVisible ? "text" : "password"}
                value={strPassword}
                onChange={(objEvent) => setStrPassword(objEvent.target.value)}
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setBlnPasswordVisible((blnCurrent) => !blnCurrent)}>
                        {blnPasswordVisible ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              <Button
                variant="contained"
                size="large"
                disabled={!strLoginID.trim() || !strPassword.trim() || blnSubmitting || (strMode === "tenant" && blnTenantLoading)}
                onClick={submitForm}
                sx={{
                  minHeight: 52,
                  borderRadius: "18px",
                  background: "linear-gradient(135deg, #0f766e 0%, #0e7490 100%)",
                  boxShadow: "0 16px 30px rgba(14, 116, 144, 0.22)"
                }}
                startIcon={blnSubmitting ? <CircularProgress size={18} color="inherit" /> : <LockRoundedIcon />}
              >
                {strCta}
              </Button>

              {strMode === "tenant" && objTenant?.blnSsoEnabled ? (
                <>
                  <Divider>or</Divider>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={startSso}
                    endIcon={<OpenInNewRoundedIcon />}
                    sx={{ minHeight: 52, borderRadius: "18px" }}
                  >
                    {enMessages.auth.ssoButton}
                  </Button>
                </>
              ) : null}

              <Box className={styles.helperLinks}>
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  Secure routing, runtime session checks, and backend-driven home redirect.
                </Typography>
                {strMode === "tenant" || strSwitchHref ? (
                  <Button href={strSwitchHref} variant="text">
                    {strSwitchLabel}
                  </Button>
                ) : null}
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
