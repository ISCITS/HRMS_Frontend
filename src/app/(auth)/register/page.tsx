"use client";

import Link from "next/link";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";

export default function RegisterPage() {
  return (
    <Stack component="form" spacing={2}>
      <TextField data-testid="auth.register.full-name.input" inputProps={{ "data-testid": "auth.register.full-name.input" }} label="Full Name" fullWidth required />
      <TextField data-testid="auth.register.email.input" inputProps={{ "data-testid": "auth.register.email.input" }} label="Email" type="email" fullWidth required />
      <TextField data-testid="auth.register.password.input" inputProps={{ "data-testid": "auth.register.password.input" }} label="Password" type="password" fullWidth required />
      <TextField data-testid="auth.register.confirm-password.input" inputProps={{ "data-testid": "auth.register.confirm-password.input" }} label="Confirm Password" type="password" fullWidth required />
      <Button data-testid="auth.register.submit.button" variant="contained" size="large" href="/dashboard">
        Register
      </Button>
      <Box sx={{ textAlign: "center" }}>
        <Typography data-testid="auth.register.login.link" variant="body2" component={Link} href="/login">
          Already have an account? Login
        </Typography>
      </Box>
    </Stack>
  );
}
