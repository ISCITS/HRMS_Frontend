"use client";

import Link from "next/link";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";

export default function SignupPage() {
  return (
    <Stack component="form" spacing={2}>
      <TextField label="Full Name" fullWidth required />
      <TextField label="Email" type="email" fullWidth required />
      <TextField label="Password" type="password" fullWidth required />
      <TextField label="Confirm Password" type="password" fullWidth required />
      <Button variant="contained" size="large" href="/dashboard">
        Signup
      </Button>
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="body2" component={Link} href="/login">
          Already have an account? Login
        </Typography>
      </Box>
    </Stack>
  );
}