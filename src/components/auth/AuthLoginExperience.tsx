"use client";
 
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import AlternateEmailRoundedIcon from "@mui/icons-material/AlternateEmailRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VpnKeyRoundedIcon from "@mui/icons-material/VpnKeyRounded";
import { Alert, Box, Button, ButtonBase, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, InputAdornment, Paper, Stack, TextField, Typography } from "@mui/material";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DottedLoader } from "@/components/shared/BlockingLoader";
import { loginCompactSx, loginInputRootSx, loginTextFieldSx } from "@/components/auth/loginCompactSx";

import { LoginUiMessage } from "@/Common/enums/AppEnums";
import { handleSingleDialogActionEnter } from "@/Common/utils/dialogKeyboard";
import { appConfig } from "@/config/app";
import { apiConstants } from "@/config/constants";
import { enMessages } from "@/i18n/messages/en";
import { authHelpers } from "@/lib/auth";
import { withBasePath } from "@/lib/basePath";
import type {
  AuthOtpChallengeData,
  GoogleMfaChallengeData,
  NormalizedTenantAuthMode,
  NormalizedTenantLoginMethod,
  SsoMfaLoginSuccessData,
  SsoMfaSetupSuccessData,
  TenantAuthDetails,
  TenantLookupData
} from "@/models/AuthModels";
import { getPostLoginRoute } from "@/lib/RouteGuard";
import { authApiService } from "@/services";
import { clsApiRequestError, isGoogleMfaChallengeData, isOtpChallengeData, resolveErrorMessage } from "@/services/auth/AuthApiService";
import type { AuthSuccessData, PortalCode } from "@/models/AuthModels";
 
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
  const [blnErrorDialogOpen, setBlnErrorDialogOpen] = useState(false);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [blnResendingOtp, setBlnResendingOtp] = useState(false);
  const [blnPasswordVisible, setBlnPasswordVisible] = useState(false);
  const [objTenantAuthDetails, setObjTenantAuthDetails] = useState<TenantAuthDetails | null>(null);
  const [objOtpChallenge, setObjOtpChallenge] = useState<AuthOtpChallengeData | null>(null);
  const [objGoogleMfaChallenge, setObjGoogleMfaChallenge] = useState<GoogleMfaChallengeData | null>(null);
  // Dual-access identity: the server authenticates but activates no portal, so the user chooses.
  const [lstPortalChoices, setLstPortalChoices] = useState<PortalCode[]>([]);
  const [blnPortalSwitching, setBlnPortalSwitching] = useState(false);
  // HRMS leads the Continue To row; any portal the server adds later falls in after the known two.
  const lstPortalDisplayOrder = useMemo(
    () => [...lstPortalChoices].sort((strLeft, strRight) => getPortalDisplayRank(strLeft) - getPortalDisplayRank(strRight)),
    [lstPortalChoices],
  );

  function completeAuthentication(objAuthData: AuthSuccessData) {
    if (objAuthData.blnRequiresPortalSelection && (objAuthData.lstAvailablePortals?.length ?? 0) > 1) {
      setLstPortalChoices(objAuthData.lstAvailablePortals ?? []);
      return;
    }
    objRouter.replace(getPostLoginRoute(objAuthData.strHomeRoute));
  }

  async function selectPortal(strPortal: PortalCode) {
    setBlnPortalSwitching(true);
    try {
      const objResult = await authApiService.selectPortalContext(strPortal);
      // Full navigation, not a client-side replace: the app shell caches the menu it loaded for the
      // previous context, so only a fresh bootstrap re-reads menus AND action rights with the token
      // that now carries the chosen portal.
      const strHomeRoute = getPostLoginRoute(objResult.Data.strHomeRoute);
      if (typeof window !== "undefined") {
        window.location.assign(withBasePath(strHomeRoute));
        return;
      }
      objRouter.replace(strHomeRoute);
    } catch (objError) {
      setStrError(resolveErrorMessage(objError));
      setBlnPortalSwitching(false);
    }
  }
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
 
  function showErrorDialog(strMessage: string) {
    const strResolvedMessage = strMessage.trim();
    if (!strResolvedMessage) {
      return;
    }
 
    setStrError(strResolvedMessage);
    setBlnErrorDialogOpen(true);
  }
 
  function clearErrorState() {
    setStrError("");
    setBlnErrorDialogOpen(false);
  }
 
  async function loadTenantLoginLabels(intRequestedLanguageID: number) {
    if (!strTenantUUID) {
      return;
    }
 
    setBlnLanguageSwitching(true);
    clearErrorState();
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
 
    Promise.all([
      authApiService.getTenantAuthDetails(strTenantUUID),
      authApiService.getTenant(strTenantUUID).catch(() => null)
    ])
      .then(([objAuthDetailsResult, objTenantResult]) => {
        if (!blnActive) {
          return;
        }
 
        const objAuthDetails = mergeTenantLookupNameIntoAuthDetails(
          objAuthDetailsResult.Data,
          objTenantResult?.Data
        );
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
          showErrorDialog(enMessages.auth.inactiveTenant);
        } else {
          showErrorDialog(strMessage);
        }
        if (typeof document !== "undefined") {
          document.cookie = `${authHelpers.tenantCookieName}=; Path=/; Max-Age=0; SameSite=Lax`;
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
 
    clearErrorState();
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
          strPreAuthToken: objOtpChallenge.strPreAuthToken ?? undefined,
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
        completeAuthentication(objResult.Data);
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
        completeAuthentication(objResult.Data);
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
      completeAuthentication(objResult.Data);
    } catch (objError) {
      if (objError instanceof clsApiRequestError) {
        const intRemainingSeconds = extractRemainingSeconds(objError.objData);
        if (intRemainingSeconds > 0) {
          setIntLockRemainingSeconds(intRemainingSeconds);
          showErrorDialog(`Account locked. Try again in ${formatDuration(intRemainingSeconds)}`);
        } else {
          setIntLockRemainingSeconds(0);
          showErrorDialog(objError.message);
        }
      } else {
        setIntLockRemainingSeconds(0);
        showErrorDialog(resolveErrorMessage(objError, LoginUiMessage.UnableToSignIn));
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
      objRouter.replace(getPostLoginRoute(objResult.Data.objAuth.strHomeRoute));
      return;
    }
 
    if (objGoogleMfaChallenge.blnMfaSetupRequired) {
      const objResult: { Data: SsoMfaSetupSuccessData } = await authApiService.verifySsoMfaSetup({
        strPreAuthToken: objGoogleMfaChallenge.strPreAuthToken,
        strCode: strGoogleCode
      });
      setLstBackupCodes(objResult.Data.lstBackupCodes);
      setObjGoogleMfaChallenge(null);
      objRouter.replace(getPostLoginRoute(objResult.Data.objAuth.strHomeRoute));
      return;
    }
 
    const objResult: { Data: SsoMfaLoginSuccessData } = await authApiService.verifySsoMfa({
      strPreAuthToken: objGoogleMfaChallenge.strPreAuthToken,
      strCode: strGoogleCode
    });
    setObjGoogleMfaChallenge(null);
    objRouter.replace(getPostLoginRoute(objResult.Data.objAuth.strHomeRoute));
  }
 
  async function resendOtp() {
    if (!objOtpChallenge) {
      return;
    }
 
    clearErrorState();
    setBlnResendingOtp(true);
    try {
      await authApiService.resendOtp({
        intUserID: objOtpChallenge.intUserID,
        intTenantID: objOtpChallenge.intTenantID,
        strPreAuthToken: objOtpChallenge.strPreAuthToken ?? undefined
      });
      setIntResendRemainingSeconds(30);
    } catch (objError) {
      if (objError instanceof clsApiRequestError) {
        const intRemainingSeconds = extractRemainingSeconds(objError.objData);
        if (intRemainingSeconds > 0) {
          setIntResendRemainingSeconds(intRemainingSeconds);
        }
        showErrorDialog(objError.message);
      } else {
        showErrorDialog(resolveErrorMessage(objError, LoginUiMessage.UnableToResendOtp));
      }
    } finally {
      setBlnResendingOtp(false);
    }
  }
 
  const strTitle = strMode === "tenant" ? getLoginLabel("tenantTitle") : enMessages.auth.genericTitle;
  const strSubtitle = strMode === "tenant" ? getLoginLabel("tenantSubtitle") : enMessages.auth.genericSubtitle;
  const strTenantName = resolveTenantDisplayName(objTenantAuthDetails);
  const strWorkspaceName = strMode === "tenant"
    ? strTenantName || (strTitle !== enMessages.auth.tenantTitle ? strTitle : appConfig.appName)
    : appConfig.appName;
  const strLoginWelcomeTarget = strMode === "tenant"
    ? strTenantName || strWorkspaceName
    : appConfig.appName;
  const blnShowTenantTransition =
    strMode === "tenant" &&
    (blnTenantLoading || blnSsoRedirecting || strTenantAuthMode === "sso") &&
    !strError;
  const strLockCountdown = intLockRemainingSeconds > 0 ? formatDuration(intLockRemainingSeconds) : null;
  const blnOtpStep = Boolean(objOtpChallenge);
  const strIdentityValidationError = validateLoginIdentifier(strLoginID, strResolvedLoginIdentity);
 
  if (blnShowTenantTransition) {
    return (
      <Box className="login-transition-root">
        <Box className="login-transition-wrap">
          <Box className="login-transition-card">
            <Stack spacing={2} alignItems="center">
              <Box className="login-transition-icon">
                <CheckCircleOutlineRoundedIcon color="primary" fontSize="large" />
              </Box>
              <Typography variant="h4">{getLoginLabel("ssoCallbackTitle")}</Typography>
              <Typography className="login-muted-text">
                {blnTenantLoading ? getLoginLabel("verifyingWorkspaceStatus") : strSsoStatus}
              </Typography>
              <Typography variant="body2" className="login-soft-text">
                {strTenantUUID}
              </Typography>
              <DottedLoader />
            </Stack>
          </Box>
        </Box>
      </Box>
    );
  }
 
  if (objGoogleMfaChallenge) {
    const strResolvedMfaTitle = objGoogleMfaChallenge.blnMfaSetupRequired ? "Set up Google Authenticator" : "Verify Google Authenticator";
    const strResolvedVerifyButtonLabel = objGoogleMfaChallenge.blnMfaSetupRequired && !blnUseBackupCode ? "Complete setup" : "Verify and continue";
    const strQrCodeSrc = objGoogleMfaChallenge.strQrCodeBase64 ? `data:image/png;base64,${objGoogleMfaChallenge.strQrCodeBase64}` : "";
    const blnCanVerify = blnUseBackupCode ? Boolean(strBackupCode.trim()) : strGoogleCode.trim().length === 6;

    return (
      <Box className="login-transition-root">
        <Paper className="login-mfa-card">
          <Stack spacing={3}>
            <Stack spacing={1} alignItems="center" textAlign="center">
              <Box className="login-transition-icon">
                {objGoogleMfaChallenge.blnMfaSetupRequired ? <QrCode2RoundedIcon color="primary" fontSize="large" /> : <SecurityRoundedIcon color="primary" fontSize="large" />}
              </Box>
              <Typography variant="h4">{strResolvedMfaTitle}</Typography>
              <Typography className="login-muted-text">{objGoogleMfaChallenge.strMessage}</Typography>
            </Stack>

            {strError ? <Alert severity="error">{strError}</Alert> : null}

            {lstBackupCodes.length > 0 ? (
              <Alert severity="success">
                <Typography className="login-alert-title">Backup codes</Typography>
                <Stack spacing={0.5}>
                  {lstBackupCodes.map((strItem) => (
                    <Typography key={strItem} className="login-mono-text">{strItem}</Typography>
                  ))}
                </Stack>
              </Alert>
            ) : null}

            {objGoogleMfaChallenge.blnMfaSetupRequired ? (
              <Stack spacing={2}>
                {strQrCodeSrc ? (
                  <Box className="login-qr-wrap">
                    <Box component="img" src={strQrCodeSrc} alt="Google Authenticator QR code" className="login-qr-image" />
                  </Box>
                ) : null}

                <Box className="login-manual-key">
                  <Typography className="login-alert-title">Manual setup key</Typography>
                  <Typography className="login-mono-text login-break-text">
                    {objGoogleMfaChallenge.strManualSecret || "Not available"}
                  </Typography>
                </Box>
              </Stack>
            ) : null}

            <Divider />

            <Stack spacing={2}>
              <Button data-controlid="auth.mfa.toggle-backup-code.button" variant="text" onClick={() => setBlnUseBackupCode((blnCurrent) => !blnCurrent)} startIcon={<VpnKeyRoundedIcon />}>
                {blnUseBackupCode ? "Use authenticator code instead" : "Use backup code instead"}
              </Button>

              {blnUseBackupCode ? (
                <TextField
                  label="Backup code"
                  sx={loginTextFieldSx}
                  inputProps={{ "data-controlid": "auth.mfa.backup-code.input" }}
                  InputProps={{ sx: loginInputRootSx }}
                  value={strBackupCode}
                  onChange={(objEvent) => setStrBackupCode(objEvent.target.value.toUpperCase())}
                  placeholder="Enter one backup code"
                  fullWidth
                />
              ) : (
                <TextField
                  label="Authenticator code"
                  sx={loginTextFieldSx}
                  inputProps={{ "data-controlid": "auth.mfa.code.input" }}
                  InputProps={{ sx: loginInputRootSx }}
                  value={strGoogleCode}
                  onChange={(objEvent) => setStrGoogleCode(objEvent.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter the 6-digit code"
                  fullWidth
                />
              )}

              <Button
                data-controlid="auth.mfa.verify.button"
                variant="contained"
                disabled={blnSubmitting || !blnCanVerify}
                onClick={() => {
                  void handleGoogleMfaVerification();
                }}
                startIcon={blnSubmitting ? <DottedLoader intSize={18} color="inherit" /> : undefined}
                className="login-primary-button"
              >
                {strResolvedVerifyButtonLabel}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    );
  }
 
  const blnCanSubmitLoginStep =
    Boolean(strLoginID.trim()) &&
    Boolean(strPassword.trim()) &&
    !strIdentityValidationError &&
    !blnSubmitting &&
    intLockRemainingSeconds <= 0 &&
    !(strMode === "tenant" && (blnTenantLoading || !objTenantAuthDetails));
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
    <Box className="login-page-root login-auth-page" sx={loginCompactSx}>
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
            {blnLanguageSwitching ? (
              <Box className="login-language-loading-overlay">
                <DottedLoader intSize={22} />
              </Box>
            ) : null}
            {lstLanguageOptions.length > 1 ? (
              <Box className="login-language-switcher-row">
                <Box className="login-language-switcher" role="tablist" aria-label="Login language switcher">
                  <Box className="login-language-switcher-icon">
                    {blnLanguageSwitching ? <DottedLoader intSize={14} /> : <LanguageRoundedIcon fontSize="small" />}
                  </Box>
                  {lstLanguageOptions.map((dicLanguageOption) => (
                    <button
                      key={dicLanguageOption.intLanguageID}
                      type="button"
                      data-controlid="auth.login.language.button"
                      data-option-key={dicLanguageOption.intLanguageID}
                      className={`login-language-button ${intSelectedLanguageID === dicLanguageOption.intLanguageID ? "login-language-button-active" : ""}`}
                      onClick={() => {
                        if (dicLanguageOption.intLanguageID === intLoadedLanguageID) {
                          setIntSelectedLanguageID(dicLanguageOption.intLanguageID);
                          return;
                        }
 
                        loadTenantLoginLabels(dicLanguageOption.intLanguageID).catch(() => {
                          showErrorDialog("Unable to switch language.");
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
            <Box className="login-form-intro">
              <Typography className="login-welcome-title">
                Sign in to<br />
                <span>{strLoginWelcomeTarget}</span>
              </Typography>
              <Typography className="login-welcome-subtitle">Use your work account to access the HR platform.</Typography>
            </Box>
            {lstPortalChoices.length > 1 || blnOtpStep ? (
              <Typography className={lstPortalChoices.length > 1 ? "login-portal-choice-title" : "login-title login-title-visible"}>
                {lstPortalChoices.length > 1 ? getLoginLabel("continueToTitle") : getLoginLabel("verifyOtpTitle")}
              </Typography>
            ) : null}
 
            {lstPortalChoices.length > 1 ? (
              <Stack spacing={2} className="login-form-stack">
                <Typography className="login-portal-choice-intro">
                  {getLoginLabel("continueToSubtitle")}
                </Typography>
                {/* Each portal is a card rather than a bare button: the two names alone do not tell
                    a dual-access user which side of the product they are choosing, so each carries
                    a line describing what it lets them do. HRMS is shown first, independent of the
                    order the server returns. */}
                <Box className="login-portal-grid">
                  {lstPortalDisplayOrder.map((strPortal) => (
                    <ButtonBase
                      key={strPortal}
                      className="login-portal-card"
                      disabled={blnPortalSwitching}
                      onClick={() => void selectPortal(strPortal)}
                      data-controlid={`auth.login.portal.${strPortal.toLowerCase()}.button`}
                    >
                      <Typography component="span" className="login-portal-card-title">
                        {strPortal === "HRMS" ? getLoginLabel("portalHrms") : getLoginLabel("portalEss")}
                      </Typography>
                      <Box component="ul" className="login-portal-card-points">
                        {(strPortal === "HRMS"
                          ? (["portalHrmsPoint1", "portalHrmsPoint2", "portalHrmsPoint3"] as const)
                          : (["portalEssPoint1", "portalEssPoint2", "portalEssPoint3"] as const)
                        ).map((strPointKey) => (
                          <Typography key={strPointKey} component="li" className="login-portal-card-point">
                            {getLoginLabel(strPointKey)}
                          </Typography>
                        ))}
                      </Box>
                    </ButtonBase>
                  ))}
                </Box>
                {strError ? <Alert severity="error">{strError}</Alert> : null}
              </Stack>
            ) : (
            <Stack component="form" onSubmit={handleLoginSubmit} spacing={2.25} className="login-form-stack">
              <Box>
                <TextField
                  variant="outlined"
                  label={getLoginLabel("loginIdLabel")}
                  placeholder={getLoginLabel("loginIdPlaceholder")}
                  sx={[loginTextFieldSx, { "--login-label-start": "54px" }]}
                  inputProps={{
                    "data-controlid": "auth.login.login-id.input"
                  }}
                  value={strLoginID}
                  onChange={(objEvent) => {
                    setStrLoginID(objEvent.target.value);
                    if (strError) {
                      clearErrorState();
                    }
                  }}
                  fullWidth
                  disabled={blnOtpStep}
                  error={Boolean(strIdentityValidationError)}
                  helperText={strIdentityValidationError || undefined}
                  InputProps={{
                    sx: loginInputRootSx,
                    startAdornment: (
                      <InputAdornment position="start">
                        {strResolvedLoginIdentity === "login_id" ? <AlternateEmailRoundedIcon className="login-input-icon" /> : <MailOutlineRoundedIcon className="login-input-icon" />}
                      </InputAdornment>
                    )
                  }}
                />
              </Box>
 
              <Box>
                <TextField
                  variant="outlined"
                  label={getLoginLabel("passwordLabel")}
                  placeholder={getLoginLabel("passwordPlaceholder")}
                  sx={[loginTextFieldSx, { "--login-label-start": "52px" }]}
                  inputProps={{
                    "data-controlid": "auth.login.password.input"
                  }}
                  type={blnPasswordVisible ? "text" : "password"}
                  value={strPassword}
                  onChange={(objEvent) => setStrPassword(objEvent.target.value)}
                  fullWidth
                  disabled={blnOtpStep}
                  InputProps={{
                    sx: loginInputRootSx,
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockRoundedIcon className="login-input-icon" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton data-controlid="auth.login.password-visibility.toggle" onClick={() => setBlnPasswordVisible((blnCurrent) => !blnCurrent)}>
                          {blnPasswordVisible ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Box>
 
              {blnOtpStep ? (
                <Box>
                  <TextField
                    variant="outlined"
                    label={getLoginLabel("otpLabel")}
                    placeholder={getLoginLabel("otpPlaceholder")}
                    sx={loginTextFieldSx}
                    inputProps={{
                      "data-controlid": "auth.login.otp.input"
                    }}
                    InputProps={{ sx: loginInputRootSx }}
                    value={strOtp}
                    onChange={(objEvent) => setStrOtp(objEvent.target.value.replace(/\D/g, "").slice(0, 6))}
                    fullWidth
                  />
                  <Typography variant="body2" className="login-otp-help-text">
                    {getLoginLabel("otpSentMessage")}
                  </Typography>
                </Box>
              ) : null}
 
              {/* {!blnOtpStep ? (
                <Box className="login-options-row">
                  <Box className="login-remember-item">
                    <Box className="login-remember-check" aria-hidden="true">
                      <CheckRoundedIcon />
                    </Box>
                    <Typography className="login-remember-label">Remember me on this device</Typography>
                  </Box>
                  <Typography className="login-forgot-link">
                    {getLoginLabel("forgotPassword")}
                  </Typography>
                </Box>
              ) : null} */}
 
              <Button
                data-controlid="auth.login.submit.button"
                type="submit"
                variant="contained"
                size="large"
                disabled={!blnCanSubmitCurrentStep}
                className="login-primary-button"
                endIcon={blnSubmitting ? <DottedLoader intSize={18} color="inherit" /> : <span className="login-submit-arrow"><ArrowForwardRoundedIcon /></span>}
              >
                {blnOtpStep ? getLoginLabel("verifyOtpTitle") : getLoginLabel("signInButton")}
              </Button>
 
              {blnOtpStep ? (
                <Button
                  data-controlid="auth.login.resend-otp.button"
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
 
              <Box className="login-helper-links">
                <Typography variant="body2" className="login-helper-text">
                  {blnOtpStep ? getLoginLabel("otpContinueMessage") : strMode === "tenant" ? strTitle : strSubtitle}
                </Typography>
              </Box>
            </Stack>
            )}
          </Box>
        </Box>
      </Box>
      <Dialog data-controlid="auth.login.error.dialog" open={blnErrorDialogOpen} onClose={clearErrorState} onKeyDown={handleSingleDialogActionEnter} fullWidth maxWidth="xs">
        <DialogTitle>Error</DialogTitle>
        <DialogContent>
          <Alert severity="error">
            {strLockCountdown ? `Account locked. Try again in ${strLockCountdown}` : strError}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button data-controlid="auth.login.error.close.button" onClick={clearErrorState} variant="contained">
            OK
          </Button>
        </DialogActions>
      </Dialog>
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
 
// Presentation order for the Continue To row. Lower ranks are shown first; anything unrecognised
// sorts last so a future portal never displaces HRMS or ESS.
const dicPortalDisplayRank: Record<string, number> = { HRMS: 0, ESS: 1 };

function getPortalDisplayRank(strPortal: PortalCode) {
  return dicPortalDisplayRank[String(strPortal).trim().toUpperCase()] ?? Number.MAX_SAFE_INTEGER;
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

function resolveTenantDisplayName(objTenantAuthDetails: TenantAuthDetails | null): string {
  const strTenantName =
    objTenantAuthDetails?.tenant_name?.trim() ||
    objTenantAuthDetails?.tenantName?.trim() ||
    objTenantAuthDetails?.TenantName?.trim() ||
    objTenantAuthDetails?.strTenantName?.trim() ||
    objTenantAuthDetails?.StrTenantName?.trim();
  return strTenantName ?? "";
}

function mergeTenantLookupNameIntoAuthDetails(
  objAuthDetails: TenantAuthDetails,
  objTenant?: TenantLookupData | null
): TenantAuthDetails {
  const strExistingTenantName = resolveTenantDisplayName(objAuthDetails);
  const strLookupTenantName = resolveTenantLookupDisplayName(objTenant);

  if (strExistingTenantName || !strLookupTenantName) {
    return objAuthDetails;
  }

  return {
    ...objAuthDetails,
    tenant_name: strLookupTenantName,
    tenantName: strLookupTenantName,
    strTenantName: strLookupTenantName
  };
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
  | "continueToTitle"
  | "continueToSubtitle"
  | "portalHrms"
  | "portalHrmsPoint1"
  | "portalHrmsPoint2"
  | "portalHrmsPoint3"
  | "portalEss"
  | "portalEssPoint1"
  | "portalEssPoint2"
  | "portalEssPoint3"
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
  continueToTitle: "Continue To",
  continueToSubtitle: "This account can access both portals. Click on the card to continue.",
  portalHrms: "Go to HRMS",
  portalEss: "Go to Employee Self Service",
  portalHrmsPoint1: "Manage employees and organisation setup",
  portalHrmsPoint2: "Run payroll and publish payslips",
  portalHrmsPoint3: "Review leave, attendance and approvals",
  portalEssPoint1: "View your payslips and tax documents",
  portalEssPoint2: "Apply for leave and track approvals",
  portalEssPoint3: "Update your own profile details",
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
  continueToTitle: "continue_to_title",
  continueToSubtitle: "continue_to_subtitle",
  portalHrms: "portal_hrms",
  portalEss: "portal_ess",
  portalHrmsPoint1: "portal_hrms_point_1",
  portalHrmsPoint2: "portal_hrms_point_2",
  portalHrmsPoint3: "portal_hrms_point_3",
  portalEssPoint1: "portal_ess_point_1",
  portalEssPoint2: "portal_ess_point_2",
  portalEssPoint3: "portal_ess_point_3",
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
 
 
