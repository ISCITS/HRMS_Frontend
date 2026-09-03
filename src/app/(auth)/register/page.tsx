"use client";

import Link from "next/link";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";

export default function RegisterPage() {
  return (
    <Stack component="form" spacing={2}>
      <TextField controlId="auth.register.full-name.input" inputProps={{ "controlId": "auth.register.full-name.input" }} label="Full Name" fullWidth required />
      <TextField controlId="auth.register.email.input" inputProps={{ "controlId": "auth.register.email.input" }} label="Email" type="email" fullWidth required />
      <TextField controlId="auth.register.password.input" inputProps={{ "controlId": "auth.register.password.input" }} label="Password" type="password" fullWidth required />
      <TextField controlId="auth.register.confirm-password.input" inputProps={{ "controlId": "auth.register.confirm-password.input" }} label="Confirm Password" type="password" fullWidth required />
      <Button controlId="auth.register.submit.button" variant="contained" size="large" href="/dashboard">
        Register
      </Button>
      <Box sx={{ textAlign: "center" }}>
        <Typography controlId="auth.register.login.link" variant="body2" component={Link} href="/login">
          Already have an account? Login
        </Typography>
      </Box>
    </Stack>
  );
}
