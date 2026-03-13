"use client";

import Link from "next/link";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import styles from "./forgot-password.module.css";

export default function ForgotPasswordPage() {
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

            <Stack component="form" spacing={3} noValidate>
              <TextField
                className="app-mui-text-field"
                label="Email Address"
                type="email"
                fullWidth
                required
                autoFocus
                placeholder="name@company.com"
              />

              <Button className="app-mui-button-primary" variant="contained" size="large" fullWidth>
                Send Reset Link
              </Button>

              <Box className={styles.footerRow}>
                <Typography className={styles.footerText}>Remembered your credentials?</Typography>
                <Typography
                  className={`${styles.footerLink} app-mui-link-muted`}
                  component={Link}
                  href="/login"
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
