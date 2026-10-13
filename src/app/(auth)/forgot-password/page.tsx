"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { authApiService } from "@/services";
import { resolveErrorMessage } from "@/services/auth/AuthApiService";
import styles from "./forgot-password.module.css";

export default function ForgotPasswordPage() {
  const objSearchParams = useSearchParams();
  const strTenantUUID = useMemo(() => objSearchParams.get("tenantUuid")?.trim() || null, [objSearchParams]);
  const [strEmailAddress, setStrEmailAddress] = useState("");
  const [strEmailError, setStrEmailError] = useState("");
  const [strStatusMessage, setStrStatusMessage] = useState("");
  const [strErrorMessage, setStrErrorMessage] = useState("");
  const [blnSubmitting, setBlnSubmitting] = useState(false);

  async function submitForgotPassword(objEvent: FormEvent<HTMLFormElement>) {
    objEvent.preventDefault();
    const strEmail = strEmailAddress.trim();
    setStrStatusMessage("");
    setStrErrorMessage("");

    if (!strEmail) {
      setStrEmailError("Email address is required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strEmail)) {
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
    <Box className={styles.pageRoot}>
      <Card elevation={0} className={styles.recoveryCard}>
        <Box className={styles.infoPanel}>
          <Box className={styles.infoOverlay} />

          <Box className={styles.infoContent}>
            <Chip className={styles.badge} label="Account Recovery" />
            <Typography className={styles.infoTitle}>
              Reset access without interrupting your HR workflow.
            </Typography>
            <Typography className={styles.infoSubtitle}>
              We will send a secure reset link to your registered work email so you can return to
              payroll, leave, and employee operations quickly.
            </Typography>

            <Stack spacing={2.5} className={styles.infoPoints}>
              <Box className={styles.infoPoint}>
                <Box className={styles.infoIconWrap}>
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
                <Box className={styles.infoIconWrap}>
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

        <CardContent className={styles.formPanel}>
          <Box className={styles.formContainer}>
            <Typography className={styles.pageEyebrow}>HRMS Access</Typography>
            <Typography className={styles.pageTitle}>Forgot your password?</Typography>
            <Typography className={styles.pageSubtitle}>
              Enter your company email address and we will send password reset instructions.
            </Typography>

            <Stack component="form" spacing={3} noValidate onSubmit={submitForgotPassword}>
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
                className="app-mui-text-field"
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
                placeholder="name@company.com"
              />

              <Button
                controlId="auth.forgot-password.submit.button"
                className="app-mui-button-primary"
                variant="contained"
                size="large"
                type="submit"
                disabled={blnSubmitting}
                fullWidth
              >
                {blnSubmitting ? "Sending..." : "Send Reset Instructions"}
              </Button>

              <Box className={styles.footerRow}>
                <Typography className={styles.footerText}>Remembered your credentials?</Typography>
                <Typography
                className={`${styles.footerLink} app-mui-link-muted`}
                component={Link}
                href="/login"
                controlId="auth.forgot-password.back-to-login.link"
              >
                Back to login
              </Typography>
              </Box>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
