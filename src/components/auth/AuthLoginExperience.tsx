"use client";

import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import AlternateEmailRoundedIcon from "@mui/icons-material/AlternateEmailRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import { Alert, Box, Button, CircularProgress, IconButton, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/auth/AuthLoginExperience.module.css";
import { apiConstants } from "@/config/constants";
import { enMessages } from "@/i18n/messages/en";
import { authHelpers } from "@/lib/auth";
import type { AuthOtpChallengeData, NormalizedTenantAuthMode, TenantAuthDetails } from "@/models/AuthModels";
import { getPostLoginRoute } from "@/lib/RouteGuard";
import { authApiService } from "@/services";
import { clsApiRequestError, isOtpChallengeData } from "@/services/auth/AuthApiService";

type AuthLoginExperienceProps = {
  strMode: "generic" | "tenant";
  strTenantUUID?: string;
  strTenantHint?: string;
};

export default function AuthLoginExperience({ strMode, strTenantUUID }: AuthLoginExperienceProps) {
  const objRouter = useRouter();
  const [strLoginID, setStrLoginID] = useState("");
  const [strPassword, setStrPassword] = useState("");
  const [strOtp, setStrOtp] = useState("");
  const [strError, setStrError] = useState("");
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [blnResendingOtp, setBlnResendingOtp] = useState(false);
  const [blnPasswordVisible, setBlnPasswordVisible] = useState(false);
  const [objTenantAuthDetails, setObjTenantAuthDetails] = useState<TenantAuthDetails | null>(null);
  const [objOtpChallenge, setObjOtpChallenge] = useState<AuthOtpChallengeData | null>(null);
  const [blnTenantLoading, setBlnTenantLoading] = useState(strMode === "tenant");
  const [blnSsoRedirecting, setBlnSsoRedirecting] = useState(false);
  const [strSsoStatus, setStrSsoStatus] = useState("Verifying your workspace and preparing Microsoft sign-in.");
  const [intLockRemainingSeconds, setIntLockRemainingSeconds] = useState(0);
  const [intResendRemainingSeconds, setIntResendRemainingSeconds] = useState(0);
  const [dicLoginLabels, setDicLoginLabels] = useState<Record<string, string>>({});
  const strTenantAuthMode = normalizeTenantAuthMode(objTenantAuthDetails?.auth_mode);

  useEffect(() => {
    if (strMode !== "tenant" || !strTenantUUID) {
      return;
    }

    let blnActive = true;
    setBlnTenantLoading(true);

    authApiService
      .getTenantAuthDetails(strTenantUUID)
      .then((objAuthDetailsResult) => {
        if (!blnActive) {
          return;
        }

        const objAuthDetails = objAuthDetailsResult.Data;
        if (!isTenantAuthDetails(objAuthDetails)) {
          throw new Error(getLoginLabel("tenantUnavailable"));
        }

        setObjTenantAuthDetails(objAuthDetails);
        authHelpers.setTenantContext(
          objAuthDetails.tenant_id,
          undefined,
          objAuthDetails.language_id ?? undefined
        );
        setDicLoginLabels(objAuthDetails.labels ?? {});
        if (strTenantModeRequiresSsoRedirect(objAuthDetails.auth_mode)) {
          setBlnSsoRedirecting(true);
          setStrSsoStatus(getLoginLabel("ssoRedirectStatus"));
          authHelpers.clearSession();
          window.setTimeout(() => {
            window.location.href = `${apiConstants.baseURL}/${apiConstants.apiPrefix}/auth/sso/login/${strTenantUUID}`;
          }, 250);
        }
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
        setObjTenantAuthDetails(null);
        setDicLoginLabels({});
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

  useEffect(() => {
    if (intResendRemainingSeconds <= 0) {
      return;
    }

    const intTimer = window.setInterval(() => {
      setIntResendRemainingSeconds((intCurrentSeconds) => {
        if (intCurrentSeconds <= 1) {
          window.clearInterval(intTimer);
          return 0;
        }
        return intCurrentSeconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(intTimer);
  }, [intResendRemainingSeconds]);

  async function submitForm() {
    setStrError("");
    setBlnSubmitting(true);

    try {
      if (objOtpChallenge) {
        const objResult = await authApiService.verifyOtp({
          intUserID: objOtpChallenge.intUserID,
          intTenantID: objOtpChallenge.intTenantID,
          strOtp
        });
        setObjOtpChallenge(null);
        setStrOtp("");
        objRouter.push(getPostLoginRoute(objResult.Data.strHomeRoute));
        return;
      }

      if (strMode === "tenant" && strTenantUUID) {
        const objResult = await authApiService.login({
          strTenantUUID,
          strLoginID,
          strPassword
        });
        if (isOtpChallengeData(objResult.Data)) {
          setObjOtpChallenge(objResult.Data);
          setStrOtp("");
          setIntResendRemainingSeconds(30);
          return;
        }
        objRouter.push(getPostLoginRoute(objResult.Data.strHomeRoute));
        return;
      }

      const objResult = await authApiService.genericLogin({
        strEmailAddress: strLoginID,
        strPassword
      });
      if (isOtpChallengeData(objResult.Data)) {
        setObjOtpChallenge(objResult.Data);
        setStrOtp("");
        setIntResendRemainingSeconds(30);
        return;
      }
      objRouter.push(getPostLoginRoute(objResult.Data.strHomeRoute));
    } catch (objError) {
      if (objError instanceof clsApiRequestError) {
        const intRemainingSeconds = extractRemainingSeconds(objError.objData);
        if (intRemainingSeconds > 0) {
          setIntLockRemainingSeconds(intRemainingSeconds);
          setStrError(`Account locked. Try again in ${formatDuration(intRemainingSeconds)}`);
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

  async function resendOtp() {
    if (!objOtpChallenge) {
      return;
    }

    setStrError("");
    setBlnResendingOtp(true);
    try {
      await authApiService.resendOtp({
        intUserID: objOtpChallenge.intUserID,
        intTenantID: objOtpChallenge.intTenantID
      });
      setIntResendRemainingSeconds(30);
    } catch (objError) {
      if (objError instanceof clsApiRequestError) {
        const intRemainingSeconds = extractRemainingSeconds(objError.objData);
        if (intRemainingSeconds > 0) {
          setIntResendRemainingSeconds(intRemainingSeconds);
        }
        setStrError(objError.message);
      } else {
        setStrError(objError instanceof Error ? objError.message : "Unable to resend OTP.");
      }
    } finally {
      setBlnResendingOtp(false);
    }
  }

  const strTitle = strMode === "tenant" ? getLoginLabel("tenantTitle") : enMessages.auth.genericTitle;
  const strSubtitle = strMode === "tenant" ? getLoginLabel("tenantSubtitle") : enMessages.auth.genericSubtitle;
  const blnShowTenantTransition =
    strMode === "tenant" &&
    (blnTenantLoading || blnSsoRedirecting || strTenantAuthMode === "sso") &&
    !strError;
  const strLockCountdown = intLockRemainingSeconds > 0 ? formatDuration(intLockRemainingSeconds) : null;
  const blnOtpStep = Boolean(objOtpChallenge);

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
              <Typography variant="h4">{getLoginLabel("ssoCallbackTitle")}</Typography>
              <Typography sx={{ color: "#64748b" }}>
                {blnTenantLoading ? getLoginLabel("verifyingWorkspaceStatus") : strSsoStatus}
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
  const blnCanSubmit =
    Boolean(strLoginID.trim()) &&
    Boolean(strPassword.trim()) &&
    !blnSubmitting &&
    intLockRemainingSeconds <= 0 &&
    !(strMode === "tenant" && blnTenantLoading);

  function handleLoginSubmit(objEvent: FormEvent<HTMLFormElement>) {
    objEvent.preventDefault();
    if (!blnCanSubmit) {
      return;
    }
    submitForm().catch(() => undefined);
  }

  return (
    <Box className={styles.pageRoot}>
      <Box className={styles.shell}>
        <Box className={styles.heroPanel}>
          <Box className={styles.heroContent}>
            <Box className={styles.heroIllustrationFrame}>
              <Box component="img" src="/images/hrms-login.png" alt={getLoginLabel("heroImageAlt")} className={styles.heroImage} />
            </Box>
          </Box>
        </Box>

        <Box className={styles.formPanel}>
          <Box className={styles.formCard}>
            <Box className={styles.formIntro}>
              <Typography className={styles.welcomeTitle}>{getLoginLabel("welcomeTitle")}</Typography>
              <Typography className={styles.welcomeSubtitle}>{getLoginLabel("welcomeSubtitle")}</Typography>
            </Box>
            <Typography className={styles.title}>{blnOtpStep ? getLoginLabel("verifyOtpTitle") : getLoginLabel("signInButton")}</Typography>

            <Stack component="form" onSubmit={handleLoginSubmit} spacing={2.25} sx={{ mt: 3 }}>
              {strError ? (
                <Alert severity="error">
                  {strLockCountdown ? `Account locked. Try again in ${strLockCountdown}` : strError}
                </Alert>
              ) : null}

              <Box>
                <Typography className={styles.fieldLabel}>{getLoginLabel("loginIdLabel")}</Typography>
                <TextField
                  placeholder={getLoginLabel("loginIdPlaceholder")}
                  value={strLoginID}
                  onChange={(objEvent) => setStrLoginID(objEvent.target.value)}
                  fullWidth
                  disabled={blnOtpStep}
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
                <Typography className={styles.fieldLabel}>{getLoginLabel("passwordLabel")}</Typography>
                <TextField
                  placeholder={getLoginLabel("passwordPlaceholder")}
                  type={blnPasswordVisible ? "text" : "password"}
                  value={strPassword}
                  onChange={(objEvent) => setStrPassword(objEvent.target.value)}
                  fullWidth
                  disabled={blnOtpStep}
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

              {blnOtpStep ? (
                <Box>
                  <Typography className={styles.fieldLabel}>{getLoginLabel("otpLabel")}</Typography>
                  <TextField
                    placeholder={getLoginLabel("otpPlaceholder")}
                    value={strOtp}
                    onChange={(objEvent) => setStrOtp(objEvent.target.value.replace(/\D/g, "").slice(0, 6))}
                    fullWidth
                  />
                  <Typography variant="body2" sx={{ mt: 1, color: "#64748b" }}>
                    {getLoginLabel("otpSentMessage")}
                  </Typography>
                </Box>
              ) : null}

              {!blnOtpStep ? (
                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: -0.5 }}>
                  <Typography sx={{ color: "#0f172a", fontWeight: 600, fontSize: "0.92rem" }}>
                    {/* {getLoginLabel("forgotPassword")} */}
                  </Typography>
                </Box>
              ) : null}

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
                {blnOtpStep ? getLoginLabel("verifyOtpTitle") : getLoginLabel("signInButton")}
              </Button>

              {blnOtpStep ? (
                <Button
                  variant="text"
                  onClick={resendOtp}
                  disabled={blnResendingOtp || intResendRemainingSeconds > 0}
                >
                  {blnResendingOtp
                    ? getLoginLabel("resendingOtpButton")
                    : intResendRemainingSeconds > 0
                      ? getLoginLabel("resendOtpCountdown").replace("{time}", formatDuration(intResendRemainingSeconds))
                      : getLoginLabel("resendOtpButton")}
                </Button>
              ) : null}

              <Box className={styles.helperLinks}>
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  {blnOtpStep ? getLoginLabel("otpContinueMessage") : strMode === "tenant" ? strTitle : strSubtitle}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  function getLoginLabel(strKey: LoginLabelKey): string {
    const strServerKey = dicLoginServerKeyMap[strKey];
    return dicLoginLabels[strKey] ?? (strServerKey ? dicLoginLabels[strServerKey] : undefined) ?? dicLoginFallbacks[strKey];
  }
}

function extractRemainingSeconds(objData: unknown): number {
  if (!objData || typeof objData !== "object" || !("remainingSeconds" in objData)) {
    return 0;
  }

  const objRemainingSeconds = objData.remainingSeconds;
  return typeof objRemainingSeconds === "number" && objRemainingSeconds > 0 ? Math.floor(objRemainingSeconds) : 0;
}

function isTenantAuthDetails(objData: unknown): objData is TenantAuthDetails {
  if (!objData || typeof objData !== "object") {
    return false;
  }

  const objTenantAuthDetails = objData as Partial<TenantAuthDetails>;
  return typeof objTenantAuthDetails.tenant_id === "number" &&
    typeof objTenantAuthDetails.tenant_uuid === "string" &&
    typeof objTenantAuthDetails.auth_mode === "string" &&
    objTenantAuthDetails.auth_mode.trim().length > 0;
}

function normalizeTenantAuthMode(strAuthMode: string | null | undefined): NormalizedTenantAuthMode {
  const strNormalizedMode = strAuthMode?.trim().toLowerCase();
  switch (strNormalizedMode) {
    case "local":
      return "local";
    case "sso":
      return "sso";
    case "otp":
      return "otp";
    case "otp_mandatory":
    case "otp-mandatory":
      return "otp_mandatory";
    default:
      return "unknown";
  }
}

function strTenantModeRequiresSsoRedirect(strAuthMode: string | null | undefined): boolean {
  return normalizeTenantAuthMode(strAuthMode) === "sso";
}

function formatDuration(intSeconds: number): string {
  const intMinutes = Math.floor(intSeconds / 60);
  const intRemainingSeconds = intSeconds % 60;
  return `${String(intMinutes).padStart(2, "0")}:${String(intRemainingSeconds).padStart(2, "0")}`;
}

type LoginLabelKey =
  | "forgotPassword"
  | "heroImageAlt"
  | "loginIdLabel"
  | "loginIdPlaceholder"
  | "otpContinueMessage"
  | "otpLabel"
  | "otpPlaceholder"
  | "otpSentMessage"
  | "passwordLabel"
  | "passwordPlaceholder"
  | "resendOtpButton"
  | "resendOtpCountdown"
  | "resendingOtpButton"
  | "resolvedWorkspaceLabel"
  | "resolvingTenantStatus"
  | "signInButton"
  | "ssoCallbackTitle"
  | "ssoRedirectStatus"
  | "tenantSubtitle"
  | "tenantTitle"
  | "tenantUnavailable"
  | "verifyOtpTitle"
  | "verifyingWorkspaceStatus"
  | "welcomeSubtitle"
  | "welcomeTitle";

const dicLoginFallbacks: Record<LoginLabelKey, string> = {
  forgotPassword: "Forgot Password?",
  heroImageAlt: "HRMS login visual",
  loginIdLabel: enMessages.auth.loginIdLabel,
  loginIdPlaceholder: "Enter your work email",
  otpContinueMessage: "Complete OTP verification to continue.",
  otpLabel: "OTP",
  otpPlaceholder: "Enter the 6-digit OTP",
  otpSentMessage: "We have sent a login OTP to your registered email address.",
  passwordLabel: enMessages.auth.passwordLabel,
  passwordPlaceholder: "Enter your password",
  resendOtpButton: "Resend OTP",
  resendOtpCountdown: "Resend OTP in {time}",
  resendingOtpButton: "Resending OTP...",
  resolvedWorkspaceLabel: "Resolved workspace",
  resolvingTenantStatus: "Resolving tenant...",
  signInButton: "Sign In",
  ssoCallbackTitle: enMessages.auth.ssoCallbackTitle,
  ssoRedirectStatus: "Workspace verified. Redirecting to Microsoft sign-in.",
  tenantSubtitle: enMessages.auth.tenantSubtitle,
  tenantTitle: enMessages.auth.tenantTitle,
  tenantUnavailable: "Tenant unavailable",
  verifyOtpTitle: "Verify OTP",
  verifyingWorkspaceStatus: "Verifying your workspace and sign-in method.",
  welcomeSubtitle: "Human Resource Management System",
  welcomeTitle: "Welcome to HRMS",
};

const dicLoginServerKeyMap: Record<LoginLabelKey, string> = {
  forgotPassword: "forgot_password",
  heroImageAlt: "hero_image_alt",
  loginIdLabel: "login_id_label",
  loginIdPlaceholder: "login_id_placeholder",
  otpContinueMessage: "otp_continue_message",
  otpLabel: "otp_label",
  otpPlaceholder: "otp_placeholder",
  otpSentMessage: "otp_sent_message",
  passwordLabel: "password_label",
  passwordPlaceholder: "password_placeholder",
  resendOtpButton: "resend_otp_button",
  resendOtpCountdown: "resend_otp_countdown",
  resendingOtpButton: "resending_otp_button",
  resolvedWorkspaceLabel: "resolved_workspace_label",
  resolvingTenantStatus: "resolving_tenant_status",
  signInButton: "sign_in_button",
  ssoCallbackTitle: "sso_callback_title",
  ssoRedirectStatus: "sso_redirect_status",
  tenantSubtitle: "tenant_subtitle",
  tenantTitle: "tenant_title",
  tenantUnavailable: "tenant_unavailable",
  verifyOtpTitle: "verify_otp_title",
  verifyingWorkspaceStatus: "verifying_workspace_status",
  welcomeSubtitle: "welcome_subtitle",
  welcomeTitle: "welcome_title",
};
