"use client";

import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import { Box, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import GoogleMfaChallengeView from "@/components/auth/GoogleMfaChallengeView";
import type {
  AuthOtpChallengeData,
  SsoCallbackData,
  SsoMfaChallengeData,
  SsoMfaLoginSuccessData,
  SsoMfaSetupSuccessData,
} from "@/models/AuthModels";
import { enMessages } from "@/i18n/messages/en";
import { getPostLoginRoute } from "@/lib/RouteGuard";
import { authApiService, clsApiRequestError, isGoogleMfaChallengeData, isOtpChallengeData, isSsoMfaChallengeData } from "@/services";

export default function SsoCallbackClient() {
  const objRouter = useRouter();
  const objSearchParams = useSearchParams();
  const [strStatus, setStrStatus] = useState(enMessages.auth.ssoCallbackSubtitle);
  const [strError, setStrError] = useState("");
  const [blnLoading, setBlnLoading] = useState(true);
  const [objChallenge, setObjChallenge] = useState<SsoMfaChallengeData | null>(null);
  const [objOtpChallenge, setObjOtpChallenge] = useState<AuthOtpChallengeData | null>(null);
  const [strCode, setStrCode] = useState("");
  const [strBackupCode, setStrBackupCode] = useState("");
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [blnUseBackupCode, setBlnUseBackupCode] = useState(false);
  const [lstBackupCodes, setLstBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    async function completeSsoCallback() {
      setStrError("");
      setBlnLoading(true);
      try {
        const objPayload = await authApiService.completeSsoCallback(objSearchParams.toString());
        await handleSsoPayload(objPayload.Data);
      } catch (objError) {
        setStrStatus("Unable to complete secure sign-in.");
        setStrError(objError instanceof Error ? objError.message : "Unable to complete secure sign-in.");
        setBlnLoading(false);
      }
    }

    void completeSsoCallback();
  }, [objRouter, objSearchParams]);

  async function handleSsoPayload(objData: SsoCallbackData) {
    if (isSsoMfaChallengeData(objData)) {
      setObjOtpChallenge(null);
      setObjChallenge(objData);
      setStrStatus(objData.strMessage);
      setBlnLoading(false);
      return;
    }

    if (isOtpChallengeData(objData)) {
      setObjChallenge(null);
      setObjOtpChallenge(objData);
      setStrStatus("Enter the verification code sent to your registered email address.");
      setBlnLoading(false);
      return;
    }

    setStrStatus("Workspace ready. Redirecting now.");
    setObjChallenge(null);
    setObjOtpChallenge(null);
    setBlnLoading(false);
    objRouter.replace(getPostLoginRoute(objData.strHomeRoute));
  }

  async function handleVerify() {
    setBlnSubmitting(true);
    setStrError("");

    try {
      if (objOtpChallenge) {
        const objResult = await authApiService.verifyOtp({
          intUserID: objOtpChallenge.intUserID,
          intTenantID: objOtpChallenge.intTenantID,
          strPreAuthToken: objOtpChallenge.strPreAuthToken ?? undefined,
          strOtp: strCode
        });

        if (isGoogleMfaChallengeData(objResult.Data)) {
          setObjOtpChallenge(null);
          setObjChallenge(objResult.Data);
          setStrCode("");
          setBlnSubmitting(false);
          return;
        }

        setStrStatus("Verification successful. Redirecting now.");
        objRouter.replace(getPostLoginRoute(objResult.Data.strHomeRoute));
        return;
      }

      if (!objChallenge?.strPreAuthToken) {
        setBlnSubmitting(false);
        return;
      }

      if (blnUseBackupCode) {
        const objResult: { Data: SsoMfaLoginSuccessData } = await authApiService.verifySsoBackupCode({
          strPreAuthToken: objChallenge.strPreAuthToken,
          strBackupCode
        });
        objRouter.replace(getPostLoginRoute(objResult.Data.objAuth.strHomeRoute));
        return;
      }

      if (objChallenge.blnMfaSetupRequired) {
        const objResult: { Data: SsoMfaSetupSuccessData } = await authApiService.verifySsoMfaSetup({
          strPreAuthToken: objChallenge.strPreAuthToken,
          strCode
        });
        setLstBackupCodes(objResult.Data.lstBackupCodes);
        setStrStatus("Google Authenticator setup completed. Redirecting now.");
        window.setTimeout(() => {
          objRouter.replace(getPostLoginRoute(objResult.Data.objAuth.strHomeRoute));
        }, 1400);
        return;
      }

      const objResult: { Data: SsoMfaLoginSuccessData } = await authApiService.verifySsoMfa({
        strPreAuthToken: objChallenge.strPreAuthToken,
        strCode
      });
      setStrStatus("Verification successful. Redirecting now.");
      objRouter.replace(getPostLoginRoute(objResult.Data.objAuth.strHomeRoute));
    } catch (objError) {
      setStrError(
        objError instanceof clsApiRequestError
          ? objError.message
          : objError instanceof Error
            ? objError.message
            : "Unable to verify the authentication code."
      );
      setBlnSubmitting(false);
    }
  }

  if (blnLoading && !objChallenge && !objOtpChallenge) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 3, background: "#f8fafc" }}>
        <Paper sx={{ maxWidth: 520, width: "100%", p: 4, borderRadius: "28px", textAlign: "center" }}>
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
            <Typography sx={{ color: "#64748b" }}>{strStatus}</Typography>
            <CircularProgress />
          </Stack>
        </Paper>
      </Box>
    );
  }

  if (!objChallenge && !objOtpChallenge) {
    return null;
  }

  if (objOtpChallenge) {
    return (
      <GoogleMfaChallengeView
        objChallenge={{
          blnMfaRequired: true,
          blnMfaSetupRequired: false,
          strPreAuthToken: objOtpChallenge.strPreAuthToken || "",
          strMessage: "Enter the verification code sent to your registered email address."
        }}
        strError={strError}
        blnSubmitting={blnSubmitting}
        blnUseBackupCode={false}
        strCode={strCode}
        strBackupCode=""
        lstBackupCodes={[]}
        blnAllowBackupCode={false}
        strTitle="Verify Email OTP"
        strCodeLabel="Email OTP"
        strCodePlaceholder="Enter the 6-digit OTP"
        strVerifyButtonLabel="Verify and continue"
        onToggleBackupCode={() => undefined}
        onCodeChange={setStrCode}
        onBackupCodeChange={() => undefined}
        onVerify={() => {
          void handleVerify();
        }}
      />
    );
  }

  return (
    <GoogleMfaChallengeView
      objChallenge={objChallenge}
      strError={strError}
      blnSubmitting={blnSubmitting}
      blnUseBackupCode={blnUseBackupCode}
      strCode={strCode}
      strBackupCode={strBackupCode}
      lstBackupCodes={lstBackupCodes}
      onToggleBackupCode={() => setBlnUseBackupCode((blnCurrent) => !blnCurrent)}
      onCodeChange={setStrCode}
      onBackupCodeChange={setStrBackupCode}
      onVerify={() => {
        void handleVerify();
      }}
    />
  );
}
