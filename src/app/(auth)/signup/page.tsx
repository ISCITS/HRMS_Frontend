"use client";

import Link from "next/link";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";

export default function SignupPage() {
  return (
    <Stack component="form" spacing={2}>
      <TextField controlId="auth.signup.full-name.input" inputProps={{ "controlId": "auth.signup.full-name.input" }} label="Full Name" fullWidth required />
      <TextField controlId="auth.signup.email.input" inputProps={{ "controlId": "auth.signup.email.input" }} label="Email" type="email" fullWidth required />
      <TextField controlId="auth.signup.password.input" inputProps={{ "controlId": "auth.signup.password.input" }} label="Password" type="password" fullWidth required />
      <TextField controlId="auth.signup.confirm-password.input" inputProps={{ "controlId": "auth.signup.confirm-password.input" }} label="Confirm Password" type="password" fullWidth required />
      <Button controlId="auth.signup.submit.button" variant="contained" size="large" href="/dashboard">
        Signup
      </Button>
      <Box sx={{ textAlign: "center" }}>
        <Typography controlId="auth.signup.login.link" variant="body2" component={Link} href="/login">
          Already have an account? Login
        </Typography>
      </Box>
    </Stack>
  );
}
