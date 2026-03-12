"use client";

import Link from "next/link";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";

export default function ForgotPasswordPage() {
  return (
    <Stack component="form" spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Enter your email address and we will send password reset instructions.
      </Typography>
      <TextField label="Email" type="email" fullWidth required />
      <Button variant="contained" size="large">
        Send Reset Link
      </Button>
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="body2" component={Link} href="/login">
          Back to login
        </Typography>
      </Box>
    </Stack>
  );
}