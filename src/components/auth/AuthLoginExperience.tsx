"use client";

import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import AlternateEmailRoundedIcon from "@mui/icons-material/AlternateEmailRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import { Alert, Box, Button, CircularProgress, IconButton, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/auth/AuthLoginExperience.module.css";
import { apiConstants } from "@/config/constants";
import { enMessages } from "@/i18n/messages/en";
import { authHelpers } from "@/lib/auth";
import type { TenantAuthDetails, TenantLookupData } from "@/models/AuthModels";
import { getPostLoginRoute } from "@/lib/RouteGuard";
import { authApiService } from "@/services";
import { clsApiRequestError } from "@/services/auth/AuthApiService";

type AuthLoginExperienceProps = {
  strMode: "generic" | "tenant";
  strTenantUUID?: string;
  strTenantHint?: string;
};

export default function AuthLoginExperience({ strMode, strTenantUUID }: AuthLoginExperienceProps) {
  const objRouter = useRouter();
  const [strLoginID, setStrLoginID] = useState("");
  const [strPassword, setStrPassword] = useState("");
  const [strError, setStrError] = useState("");
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [blnPasswordVisible, setBlnPasswordVisible] = useState(false);
  const [objTenant, setObjTenant] = useState<TenantLookupData | null>(null);
  const [objTenantAuthDetails, setObjTenantAuthDetails] = useState<TenantAuthDetails | null>(null);
  const [blnTenantLoading, setBlnTenantLoading] = useState(strMode === "tenant");
  const [blnSsoRedirecting, setBlnSsoRedirecting] = useState(false);
  const [strSsoStatus, setStrSsoStatus] = useState("Verifying your workspace and preparing Microsoft sign-in.");
  const [intLockRemainingSeconds, setIntLockRemainingSeconds] = useState(0);

  useEffect(() => {
    if (strMode !== "tenant" || !strTenantUUID) {
      return;
    }

    let blnActive = true;
    setBlnTenantLoading(true);

    authApiService
      .getTenantAuthDetails(strTenantUUID)
      .then(async (objAuthDetailsResult) => {
        if (!blnActive) {
          return;
        }

        setObjTenantAuthDetails(objAuthDetailsResult.Data);
        if (objAuthDetailsResult.Data.auth_mode === "SSO") {
          setBlnSsoRedirecting(true);
          setStrSsoStatus("Workspace verified. Redirecting to Microsoft sign-in.");
          authHelpers.clearSession();
          window.setTimeout(() => {
            window.location.href = `${apiConstants.baseURL}/${apiConstants.apiPrefix}/auth/sso/login/${strTenantUUID}`;
          }, 250);
          return;
        }

        const objTenantResult = await authApiService.getTenant(strTenantUUID);
        if (!blnActive) {
          return;
        }
        setObjTenant(objTenantResult.Data);
      })
      .catch((objError: Error) => {
        if (!blnActive) {
          return;
        }
        const strMessage = objError.message || enMessages.auth.invalidTenant;
        if (strMessage.toLowerCase().includes("inactive")) {
          setStrError(enMessages.auth.inactiveTenant);
        } else {
          setStrError(strMessage);
        }
        setObjTenant(null);
        setObjTenantAuthDetails(null);
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

  useEffect(() => {
    if (intLockRemainingSeconds <= 0) {
      return;
    }

    const intTimer = window.setInterval(() => {
      setIntLockRemainingSeconds((intCurrentSeconds) => {
        if (intCurrentSeconds <= 1) {
          window.clearInterval(intTimer);
          return 0;
        }
        return intCurrentSeconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(intTimer);
  }, [intLockRemainingSeconds]);

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
      if (objError instanceof clsApiRequestError) {
        const intRemainingSeconds = extractRemainingSeconds(objError.objData);
        if (intRemainingSeconds > 0) {
          setIntLockRemainingSeconds(intRemainingSeconds);
          setStrError(`Account locked. Try again in ${formatLockDuration(intRemainingSeconds)}`);
        } else {
          setIntLockRemainingSeconds(0);
          setStrError(objError.message);
        }
      } else {
        setIntLockRemainingSeconds(0);
        setStrError(objError instanceof Error ? objError.message : "Unable to sign in.");
      }
    } finally {
      setBlnSubmitting(false);
    }
  }

  const strTitle = strMode === "tenant" ? enMessages.auth.tenantTitle : enMessages.auth.genericTitle;
  const strSubtitle = strMode === "tenant" ? enMessages.auth.tenantSubtitle : enMessages.auth.genericSubtitle;
  const blnShowTenantTransition =
    strMode === "tenant" &&
    (blnTenantLoading || blnSsoRedirecting || objTenantAuthDetails?.auth_mode === "SSO") &&
    !strError;
  const strLockCountdown = intLockRemainingSeconds > 0 ? formatLockDuration(intLockRemainingSeconds) : null;

  if (blnShowTenantTransition) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 3, background: "#f8fafc" }}>
        <Box sx={{ maxWidth: 520, width: "100%" }}>
          <Box
            sx={{
              p: 4,
              borderRadius: "28px",
              textAlign: "center",
              backgroundColor: "#ffffff",
              boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)"
            }}
          >
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
              <Typography sx={{ color: "#64748b" }}>
                {blnTenantLoading ? "Verifying your workspace and sign-in method." : strSsoStatus}
              </Typography>
              <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                {strTenantUUID}
              </Typography>
              <CircularProgress />
            </Stack>
          </Box>
        </Box>
      </Box>
    );
  }
  const strDisplayTitle = "Sign In";
  const strDisplaySubtitle = "";

  return (
    <Box className={styles.pageRoot}>
      <Box className={styles.shell}>
        <Box className={styles.heroPanel}>
          <Box className={styles.heroContent}>
            <Box className={styles.heroIllustrationFrame}>
              <Box component="img" src="/images/hrms-login.png" alt="HRMS login visual" className={styles.heroImage} />
            </Box>
          </Box>
        </Box>

        <Box className={styles.formPanel}>
          <Box className={styles.formCard}>
            <Box className={styles.formIntro}>
              <Typography className={styles.welcomeTitle}>Welcome to HRMS</Typography>
              <Typography className={styles.welcomeSubtitle}>Human Resource Management System</Typography>
            </Box>
            <Typography className={styles.title}>{strDisplayTitle}</Typography>
            {strDisplaySubtitle ? <Typography className={styles.subtitle}>{strDisplaySubtitle}</Typography> : null}

            <Stack spacing={2.25} sx={{ mt: 3 }}>
              {strError ? (
                <Alert severity="error">
                  {strLockCountdown ? `Account locked. Try again in ${strLockCountdown}` : strError}
                </Alert>
              ) : null}

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

              <Box>
                <Typography className={styles.fieldLabel}>Work Email</Typography>
                <TextField
                  placeholder="Enter your work email"
                  value={strLoginID}
                  onChange={(objEvent) => setStrLoginID(objEvent.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AlternateEmailRoundedIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
                      </InputAdornment>
                    )
                  }}
                />
              </Box>

              <Box>
                <Typography className={styles.fieldLabel}>Password</Typography>
                <TextField
                  placeholder="Enter your password"
                  type={blnPasswordVisible ? "text" : "password"}
                  value={strPassword}
                  onChange={(objEvent) => setStrPassword(objEvent.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockRoundedIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setBlnPasswordVisible((blnCurrent) => !blnCurrent)}>
                          {blnPasswordVisible ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Box>

              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: -0.5 }}>
                <Typography sx={{ color: "#0f172a", fontWeight: 600, fontSize: "0.92rem" }}>
                  Forgot Password?
                </Typography>
              </Box>

              <Button
                variant="contained"
                size="large"
                disabled={
                  !strLoginID.trim() ||
                  !strPassword.trim() ||
                  blnSubmitting ||
                  intLockRemainingSeconds > 0 ||
                  (strMode === "tenant" && blnTenantLoading)
                }
                onClick={submitForm}
                sx={{
                  minHeight: 52,
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #132a63 0%, #184a8b 100%)",
                  boxShadow: "0 10px 20px rgba(24, 74, 139, 0.24)"
                }}
                startIcon={blnSubmitting ? <CircularProgress size={18} color="inherit" /> : <LockRoundedIcon />}
              >
                Sign In
              </Button>

              <Box className={styles.helperLinks}>
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  {strMode === "tenant" ? strTitle : strSubtitle}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function extractRemainingSeconds(objData: unknown): number {
  if (!objData || typeof objData !== "object" || !("remainingSeconds" in objData)) {
    return 0;
  }

  const objRemainingSeconds = objData.remainingSeconds;
  return typeof objRemainingSeconds === "number" && objRemainingSeconds > 0 ? Math.floor(objRemainingSeconds) : 0;
}

function formatLockDuration(intSeconds: number): string {
  const intMinutes = Math.floor(intSeconds / 60);
  const intRemainingSeconds = intSeconds % 60;
  return `${String(intMinutes).padStart(2, "0")}:${String(intRemainingSeconds).padStart(2, "0")}`;
}
