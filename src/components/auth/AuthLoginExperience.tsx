"use client";

import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import AlternateEmailRoundedIcon from "@mui/icons-material/AlternateEmailRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import { Alert, Box, Button, CircularProgress, IconButton, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import GoogleMfaChallengeView from "@/components/auth/GoogleMfaChallengeView";
import styles from "@/components/auth/AuthLoginExperience.module.css";
import { LoginUiMessage } from "@/Common/enums/AppEnums";
import { apiConstants } from "@/config/constants";
import { enMessages } from "@/i18n/messages/en";
import { authHelpers } from "@/lib/auth";
import type {
  AuthOtpChallengeData,
  GoogleMfaChallengeData,
  NormalizedTenantAuthMode,
  NormalizedTenantLoginMethod,
  SsoMfaLoginSuccessData,
  SsoMfaSetupSuccessData,
  TenantAuthDetails
} from "@/models/AuthModels";
import { getPostLoginRoute } from "@/lib/RouteGuard";
import { authApiService } from "@/services";
import { clsApiRequestError, isGoogleMfaChallengeData, isOtpChallengeData, resolveErrorMessage } from "@/services/auth/AuthApiService";

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
  const [strGoogleCode, setStrGoogleCode] = useState("");
  const [strBackupCode, setStrBackupCode] = useState("");
  const [strError, setStrError] = useState("");
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [blnResendingOtp, setBlnResendingOtp] = useState(false);
  const [blnPasswordVisible, setBlnPasswordVisible] = useState(false);
  const [objTenantAuthDetails, setObjTenantAuthDetails] = useState<TenantAuthDetails | null>(null);
  const [objOtpChallenge, setObjOtpChallenge] = useState<AuthOtpChallengeData | null>(null);
  const [objGoogleMfaChallenge, setObjGoogleMfaChallenge] = useState<GoogleMfaChallengeData | null>(null);
  const [blnUseBackupCode, setBlnUseBackupCode] = useState(false);
  const [lstBackupCodes, setLstBackupCodes] = useState<string[]>([]);
  const [blnTenantLoading, setBlnTenantLoading] = useState(strMode === "tenant");
  const [blnSsoRedirecting, setBlnSsoRedirecting] = useState(false);
  const [strSsoStatus, setStrSsoStatus] = useState("Verifying your workspace and preparing Microsoft sign-in.");
  const [intLockRemainingSeconds, setIntLockRemainingSeconds] = useState(0);
  const [intResendRemainingSeconds, setIntResendRemainingSeconds] = useState(0);
  const [dicLoginLabels, setDicLoginLabels] = useState<Record<string, string>>({});
  const [intSelectedLanguageID, setIntSelectedLanguageID] = useState<number | null>(null);
  const [intLoadedLanguageID, setIntLoadedLanguageID] = useState<number | null>(null);
  const [dicLanguageLabelByID, setDicLanguageLabelByID] = useState<Record<number, string>>({});
  const [dicLoginLabelsByLanguageID, setDicLoginLabelsByLanguageID] = useState<Record<number, Record<string, string>>>({});
  const [blnLanguageSwitching, setBlnLanguageSwitching] = useState(false);
  const strTenantAuthMode = normalizeTenantAuthMode(objTenantAuthDetails?.auth_mode);
  const strResolvedLoginIdentity = resolveLoginIdentity(strMode, objTenantAuthDetails);
  const lstLanguageOptions = buildLanguageOptions(
    objTenantAuthDetails?.language_id,
    objTenantAuthDetails?.secondary_language_id
  ).map((intLanguageID) => ({
    intLanguageID,
    strLabel: resolveLanguageToggleLabel(intLanguageID, dicLanguageLabelByID[intLanguageID])
  }));

  async function loadTenantLoginLabels(intRequestedLanguageID: number) {
    if (!strTenantUUID) {
      return;
    }

    setBlnLanguageSwitching(true);
    setStrError("");
    try {
      const objLabelsResult = await authApiService.getLoginLabels(
        strTenantUUID,
        intRequestedLanguageID
      );
      const dicResolvedLabels = objLabelsResult.Data.labels ?? {};
      setDicLoginLabels(dicResolvedLabels);
      setDicLoginLabelsByLanguageID((dicCurrentLabels) => ({
        ...dicCurrentLabels,
        [intRequestedLanguageID]: dicResolvedLabels
      }));
      setIntSelectedLanguageID(intRequestedLanguageID);
      setIntLoadedLanguageID(intRequestedLanguageID);
      authHelpers.setLanguageID(intRequestedLanguageID);
    } catch (objError) {
      const dicCachedLabels = dicLoginLabelsByLanguageID[intRequestedLanguageID];
      if (dicCachedLabels && Object.keys(dicCachedLabels).length > 0) {
        setDicLoginLabels(dicCachedLabels);
        setIntSelectedLanguageID(intRequestedLanguageID);
        setIntLoadedLanguageID(intRequestedLanguageID);
        authHelpers.setLanguageID(intRequestedLanguageID);
        return;
      }

      // Match the existing tenant 1/2 experience by falling back to built-in
      // English copy when the server-side label endpoint fails.
      if (intRequestedLanguageID === 1) {
        setDicLoginLabels({});
        setIntSelectedLanguageID(1);
        setIntLoadedLanguageID(1);
        authHelpers.setLanguageID(1);
        return;
      }

      throw objError;
    } finally {
      setBlnLanguageSwitching(false);
    }
  }

  useEffect(() => {
    if (strMode !== "tenant" || !strTenantUUID) {
      return;
    }

    let blnActive = true;
    authHelpers.clearStoredSessionState();
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
        const intResolvedLanguageID = objAuthDetails.language_id ?? null;
        setIntSelectedLanguageID(intResolvedLanguageID);
        setIntLoadedLanguageID(objAuthDetails.language_id ?? null);
        authHelpers.setTenantContext(
          objAuthDetails.tenant_id,
          undefined,
          intResolvedLanguageID ?? undefined,
          objAuthDetails.secondary_language_id ?? undefined
        );
        setDicLoginLabels(objAuthDetails.labels ?? {});
        setDicLoginLabelsByLanguageID(
          intResolvedLanguageID
            ? { [intResolvedLanguageID]: objAuthDetails.labels ?? {} }
            : {}
        );
        setDicLanguageLabelByID((dicCurrentLabels) => ({
          ...dicCurrentLabels,
          ...(objAuthDetails.language_id
            ? {
                [objAuthDetails.language_id]: resolveLanguageDisplayLabel(
                  objAuthDetails.language_native_name,
                  objAuthDetails.language_id,
                  dicCurrentLabels[objAuthDetails.language_id]
                )
              }
            : {}),
          ...(objAuthDetails.secondary_language_id
            ? {
                [objAuthDetails.secondary_language_id]: resolveLanguageDisplayLabel(
                  objAuthDetails.secondary_language_native_name,
                  objAuthDetails.secondary_language_id,
                  dicCurrentLabels[objAuthDetails.secondary_language_id]
                )
              }
            : {})
        }));
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
        authHelpers.clearStoredSessionState();
        setObjTenantAuthDetails(null);
        setIntSelectedLanguageID(null);
        setIntLoadedLanguageID(null);
        setDicLoginLabels({});
        setDicLoginLabelsByLanguageID({});
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
    if (!blnCanSubmitCurrentStep) {
      return;
    }

    if (!objGoogleMfaChallenge && !objOtpChallenge) {
      const strIdentityValidationError = validateLoginIdentifier(strLoginID, strResolvedLoginIdentity);
      if (strIdentityValidationError) {
        setStrError(strIdentityValidationError);
        return;
      }
    }

    setStrError("");
    setBlnSubmitting(true);

    try {
      if (objGoogleMfaChallenge) {
        await handleGoogleMfaVerification();
        return;
      }

      if (objOtpChallenge) {
        const objResult = await authApiService.verifyOtp({
          intUserID: objOtpChallenge.intUserID,
          intTenantID: objOtpChallenge.intTenantID,
          strOtp
        });
        setObjOtpChallenge(null);
        setStrOtp("");
        if (isGoogleMfaChallengeData(objResult.Data)) {
          setObjGoogleMfaChallenge(objResult.Data);
          setStrGoogleCode("");
          setStrBackupCode("");
          setBlnUseBackupCode(false);
          return;
        }
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
        if (isGoogleMfaChallengeData(objResult.Data)) {
          setObjGoogleMfaChallenge(objResult.Data);
          setStrGoogleCode("");
          setStrBackupCode("");
          setBlnUseBackupCode(false);
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
      if (isGoogleMfaChallengeData(objResult.Data)) {
        setObjGoogleMfaChallenge(objResult.Data);
        setStrGoogleCode("");
        setStrBackupCode("");
        setBlnUseBackupCode(false);
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
        setStrError(resolveErrorMessage(objError, LoginUiMessage.UnableToSignIn));
      }
    } finally {
      setBlnSubmitting(false);
    }
  }

  async function handleGoogleMfaVerification() {
    if (!objGoogleMfaChallenge?.strPreAuthToken) {
      return;
    }

    if (blnUseBackupCode) {
      const objResult: { Data: SsoMfaLoginSuccessData } = await authApiService.verifySsoBackupCode({
        strPreAuthToken: objGoogleMfaChallenge.strPreAuthToken,
        strBackupCode: strBackupCode
      });
      objRouter.push(getPostLoginRoute(objResult.Data.objAuth.strHomeRoute));
      return;
    }

    if (objGoogleMfaChallenge.blnMfaSetupRequired) {
      const objResult: { Data: SsoMfaSetupSuccessData } = await authApiService.verifySsoMfaSetup({
        strPreAuthToken: objGoogleMfaChallenge.strPreAuthToken,
        strCode: strGoogleCode
      });
      setLstBackupCodes(objResult.Data.lstBackupCodes);
      setObjGoogleMfaChallenge(null);
      objRouter.push(getPostLoginRoute(objResult.Data.objAuth.strHomeRoute));
      return;
    }

    const objResult: { Data: SsoMfaLoginSuccessData } = await authApiService.verifySsoMfa({
      strPreAuthToken: objGoogleMfaChallenge.strPreAuthToken,
      strCode: strGoogleCode
    });
    setObjGoogleMfaChallenge(null);
    objRouter.push(getPostLoginRoute(objResult.Data.objAuth.strHomeRoute));
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
        setStrError(resolveErrorMessage(objError, LoginUiMessage.UnableToResendOtp));
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
  const strIdentityValidationError = validateLoginIdentifier(strLoginID, strResolvedLoginIdentity);

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

  if (objGoogleMfaChallenge) {
    return (
      <GoogleMfaChallengeView
        objChallenge={objGoogleMfaChallenge}
        strError={strError}
        blnSubmitting={blnSubmitting}
        blnUseBackupCode={blnUseBackupCode}
        strCode={strGoogleCode}
        strBackupCode={strBackupCode}
        lstBackupCodes={lstBackupCodes}
        onToggleBackupCode={() => setBlnUseBackupCode((blnCurrent) => !blnCurrent)}
        onCodeChange={setStrGoogleCode}
        onBackupCodeChange={setStrBackupCode}
        onVerify={() => {
          void handleGoogleMfaVerification();
        }}
      />
    );
  }

  const blnCanSubmitLoginStep =
    Boolean(strLoginID.trim()) &&
    Boolean(strPassword.trim()) &&
    !strIdentityValidationError &&
    !blnSubmitting &&
    intLockRemainingSeconds <= 0 &&
    !(strMode === "tenant" && blnTenantLoading);
  const blnCanSubmitOtpStep = Boolean(strOtp.trim()) && !blnSubmitting;
  const blnCanSubmitCurrentStep = blnOtpStep ? blnCanSubmitOtpStep : blnCanSubmitLoginStep;

  function handleLoginSubmit(objEvent: FormEvent<HTMLFormElement>) {
    objEvent.preventDefault();
    if (!blnCanSubmitCurrentStep) {
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
            {blnLanguageSwitching ? (
              <Box className={styles.languageLoadingOverlay}>
                <CircularProgress size={22} />
              </Box>
            ) : null}
            {lstLanguageOptions.length > 1 ? (
              <Box className={styles.languageSwitcherRow}>
                <Box className={styles.languageSwitcher} role="tablist" aria-label="Login language switcher">
                  <Box className={styles.languageSwitcherIcon}>
                    {blnLanguageSwitching ? <CircularProgress size={14} /> : <LanguageRoundedIcon sx={{ fontSize: 16 }} />}
                  </Box>
                  {lstLanguageOptions.map((dicLanguageOption) => (
                    <button
                      key={dicLanguageOption.intLanguageID}
                      type="button"
                      className={`${styles.languageButton} ${intSelectedLanguageID === dicLanguageOption.intLanguageID ? styles.languageButtonActive : ""}`}
                      onClick={() => {
                        if (dicLanguageOption.intLanguageID === intLoadedLanguageID) {
                          setIntSelectedLanguageID(dicLanguageOption.intLanguageID);
                          return;
                        }

                        loadTenantLoginLabels(dicLanguageOption.intLanguageID).catch(() => {
                          setStrError("Unable to switch language.");
                          setIntSelectedLanguageID(intLoadedLanguageID);
                        });
                      }}
                      disabled={blnLanguageSwitching || intSelectedLanguageID === dicLanguageOption.intLanguageID}
                      aria-pressed={intSelectedLanguageID === dicLanguageOption.intLanguageID}
                    >
                      {dicLanguageOption.strLabel}
                    </button>
                  ))}
                </Box>
              </Box>
            ) : null}
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
                <Typography className={styles.fieldLabel}>
                  {getLoginLabel("loginIdLabel")}
                </Typography>
                <TextField
                  placeholder={getLoginLabel("loginIdPlaceholder")}
                  value={strLoginID}
                  onChange={(objEvent) => {
                    setStrLoginID(objEvent.target.value);
                    if (strError) {
                      setStrError("");
                    }
                  }}
                  fullWidth
                  disabled={blnOtpStep}
                  error={Boolean(strIdentityValidationError)}
                  helperText={strIdentityValidationError ?? " "}
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
                type="submit"
                variant="contained"
                size="large"
                disabled={!blnCanSubmitCurrentStep}
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
    if (strKey === "loginIdLabel") {
      return strResolvedLoginIdentity === "login_id" ? "Login ID" : "Work Email";
    }

    if (strKey === "loginIdPlaceholder") {
      return strResolvedLoginIdentity === "login_id" ? "Enter your login ID" : "Enter your work email";
    }

    const strServerKey = dicLoginServerKeyMap[strKey];
    return dicLoginLabels[strKey] ?? (strServerKey ? dicLoginLabels[strServerKey] : undefined) ?? dicLoginFallbacks[strKey];
  }
}

function buildLanguageOptions(...lstLanguageIDs: Array<number | null | undefined>) {
  return lstLanguageIDs.reduce<number[]>((lstResolvedLanguageIDs, intLanguageID) => {
    if (!intLanguageID || lstResolvedLanguageIDs.includes(intLanguageID)) {
      return lstResolvedLanguageIDs;
    }

    lstResolvedLanguageIDs.push(intLanguageID);
    return lstResolvedLanguageIDs;
  }, []);
}

function resolveLanguageDisplayLabel(
  strNativeName: string | null | undefined,
  intLanguageID: number,
  strFallbackLabel?: string
) {
  const strResolvedNativeName = strNativeName?.trim();
  if (strResolvedNativeName) {
    return strResolvedNativeName;
  }

  if (strFallbackLabel?.trim()) {
    return strFallbackLabel.trim();
  }

  if (intLanguageID === 1) {
    return "English";
  }

  if (intLanguageID === 2) {
    return "हिन्दी";
  }

  return `Language ${intLanguageID}`;
}

function resolveLanguageToggleLabel(intLanguageID: number, strLanguageLabel?: string) {
  return resolveLanguageDisplayLabel(strLanguageLabel, intLanguageID);
}

function extractRemainingSeconds(objData: unknown): number {
  if (!objData || typeof objData !== "object" || !("remainingSeconds" in objData)) {
    return 0;
  }

  const objRemainingSeconds = (objData as { remainingSeconds?: unknown }).remainingSeconds;
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

function normalizeTenantLoginMethod(strLoginMethod: string | null | undefined): NormalizedTenantLoginMethod | null {
  const strNormalizedMethod = strLoginMethod?.trim().toLowerCase();
  if (strNormalizedMethod === "email_address" || strNormalizedMethod === "email") {
    return "email_address";
  }

  if (strNormalizedMethod === "login_id" || strNormalizedMethod === "loginid" || strNormalizedMethod === "login-id") {
    return "login_id";
  }

  return null;
}

function resolveLoginIdentity(
  strMode: "generic" | "tenant",
  objTenantAuthDetails: TenantAuthDetails | null
): NormalizedTenantLoginMethod {
  if (strMode !== "tenant") {
    return "email_address";
  }

  const strByMethod = normalizeTenantLoginMethod(objTenantAuthDetails?.login_method);
  if (strByMethod) {
    return strByMethod;
  }

  const strAuthMode = objTenantAuthDetails?.auth_mode?.trim().toLowerCase() ?? "";
  if (strAuthMode.includes("login_id") || strAuthMode.includes("loginid") || strAuthMode.includes("login-id")) {
    return "login_id";
  }

  if (strAuthMode.includes("email")) {
    return "email_address";
  }

  return "email_address";
}

function validateLoginIdentifier(strLoginID: string, strLoginMethod: NormalizedTenantLoginMethod): string | null {
  const strCandidate = strLoginID.trim();
  if (!strCandidate) {
    return null;
  }

  if (strLoginMethod === "login_id") {
    return strCandidate.includes("@")
      ? "Use Login ID only. Email is not allowed for this tenant."
      : null;
  }

  const strEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return strEmailPattern.test(strCandidate)
    ? null
    : "Use Work Email only. Login ID is not allowed for this tenant.";
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
