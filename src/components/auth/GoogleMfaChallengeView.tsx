"use client";

import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import VpnKeyRoundedIcon from "@mui/icons-material/VpnKeyRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useMemo } from "react";

import type { GoogleMfaChallengeData } from "@/models/AuthModels";

type GoogleMfaChallengeViewProps = {
  objChallenge: GoogleMfaChallengeData;
  strError: string;
  blnSubmitting: boolean;
  blnUseBackupCode: boolean;
  strCode: string;
  strBackupCode: string;
  lstBackupCodes: string[];
  onToggleBackupCode: () => void;
  onCodeChange: (strValue: string) => void;
  onBackupCodeChange: (strValue: string) => void;
  onVerify: () => void;
  strTitle?: string;
  strCodeLabel?: string;
  strCodePlaceholder?: string;
  strVerifyButtonLabel?: string;
  blnAllowBackupCode?: boolean;
  codeInputTestId?: string;
  backupCodeInputTestId?: string;
  verifyButtonTestId?: string;
  toggleBackupCodeButtonTestId?: string;
};

export default function GoogleMfaChallengeView({
  objChallenge,
  strError,
  blnSubmitting,
  blnUseBackupCode,
  strCode,
  strBackupCode,
  lstBackupCodes,
  onToggleBackupCode,
  onCodeChange,
  onBackupCodeChange,
  onVerify,
  strTitle,
  strCodeLabel,
  strCodePlaceholder,
  strVerifyButtonLabel,
  blnAllowBackupCode = true,
  codeInputTestId = "auth.mfa.code.input",
  backupCodeInputTestId = "auth.mfa.backup-code.input",
  verifyButtonTestId = "auth.mfa.verify.button",
  toggleBackupCodeButtonTestId = "auth.mfa.toggle-backup-code.button",
}: GoogleMfaChallengeViewProps) {
  const strQrCodeSrc = useMemo(() => {
    if (!objChallenge.strQrCodeBase64) {
      return "";
    }

    return `data:image/png;base64,${objChallenge.strQrCodeBase64}`;
  }, [objChallenge.strQrCodeBase64]);

  const strResolvedTitle = strTitle || (objChallenge.blnMfaSetupRequired ? "Set up Google Authenticator" : "Verify Google Authenticator");
  const strResolvedCodeLabel = strCodeLabel || "Authenticator code";
  const strResolvedCodePlaceholder = strCodePlaceholder || "Enter the 6-digit code";
  const strResolvedVerifyButtonLabel = strVerifyButtonLabel || (objChallenge.blnMfaSetupRequired && !blnUseBackupCode ? "Complete setup" : "Verify and continue");
  const blnCanVerify = blnUseBackupCode ? Boolean(strBackupCode.trim()) : strCode.trim().length === 6;

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 3, background: "#f8fafc" }}>
      <Paper sx={{ maxWidth: 620, width: "100%", p: 4, borderRadius: "28px" }}>
        <Stack spacing={3}>
          <Stack spacing={1} alignItems="center" textAlign="center">
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
              {objChallenge.blnMfaSetupRequired ? <QrCode2RoundedIcon color="primary" sx={{ fontSize: 34 }} /> : <SecurityRoundedIcon color="primary" sx={{ fontSize: 34 }} />}
            </Box>
            <Typography variant="h4">{strResolvedTitle}</Typography>
            <Typography sx={{ color: "#64748b" }}>
              {objChallenge.strMessage}
            </Typography>
          </Stack>

          {strError ? <Alert severity="error">{strError}</Alert> : null}

          {lstBackupCodes.length > 0 ? (
            <Alert severity="success">
              <Typography sx={{ fontWeight: 700, mb: 1 }}>Backup codes</Typography>
              <Stack spacing={0.5}>
                {lstBackupCodes.map((strItem) => (
                  <Typography key={strItem} sx={{ fontFamily: "monospace" }}>{strItem}</Typography>
                ))}
              </Stack>
            </Alert>
          ) : null}

          {objChallenge.blnMfaSetupRequired ? (
            <Stack spacing={2}>
              {strQrCodeSrc ? (
                <Box sx={{ display: "grid", placeItems: "center", p: 2, background: "#fff", borderRadius: 3, border: "1px solid #e2e8f0" }}>
                  <Box component="img" src={strQrCodeSrc} alt="Google Authenticator QR code" sx={{ width: 240, height: 240 }} />
                </Box>
              ) : null}

              <Box sx={{ p: 2, borderRadius: 3, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Manual setup key</Typography>
                <Typography sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                  {objChallenge.strManualSecret || "Not available"}
                </Typography>
              </Box>
            </Stack>
          ) : null}

          <Divider />

          <Stack spacing={2}>
            {blnAllowBackupCode ? (
              <Button data-testid={toggleBackupCodeButtonTestId} variant="text" onClick={onToggleBackupCode} startIcon={<VpnKeyRoundedIcon />}>
                {blnUseBackupCode ? "Use authenticator code instead" : "Use backup code instead"}
              </Button>
            ) : null}

            {blnUseBackupCode ? (
              <TextField
                label="Backup code"
                inputProps={{ "data-testid": backupCodeInputTestId }}
                value={strBackupCode}
                onChange={(objEvent) => onBackupCodeChange(objEvent.target.value.toUpperCase())}
                placeholder="Enter one backup code"
                fullWidth
              />
            ) : (
              <TextField
                label={strResolvedCodeLabel}
                inputProps={{ "data-testid": codeInputTestId }}
                value={strCode}
                onChange={(objEvent) => onCodeChange(objEvent.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={strResolvedCodePlaceholder}
                fullWidth
              />
            )}

            <Button
              data-testid={verifyButtonTestId}
              variant="contained"
              disabled={blnSubmitting || !blnCanVerify}
              onClick={onVerify}
              startIcon={blnSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
              sx={{ minHeight: 52, borderRadius: "10px" }}
            >
              {strResolvedVerifyButtonLabel}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
