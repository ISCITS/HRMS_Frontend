"use client";

import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { FormEvent, useState } from "react";
import ProfileSection from "@/components/shared/profile/ProfileSection";
import dicConstant from "@/constants/Constant.json";

const dicInputSx = {
  "& .MuiInputLabel-root": {
    fontSize: 14,
    fontWeight: 500,
    color: "#64748b"
  },
  "& .MuiOutlinedInput-root": {
    minHeight: 52,
    borderRadius: "14px",
    transition: "all 0.2s ease",
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "#e2e8f0"
    },
    "&.Mui-focused": {
      backgroundColor: "#f8fafc",
      boxShadow: "0 0 0 3px rgba(37,99,235,0.2)"
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "#2563eb"
    }
  }
};

// Renders user profile edit fields and update action.
export default function ProfileForm() {
  /*
  Functional responsibility:
  - Render premium profile UI sections and simulate save interaction.
  
  Inputs:
  - Uses local default profile values for template/demo behavior.
  
  Output:
  - Sectioned profile form UI with avatar block and security settings card.
  
  Failure behavior:
  - No backend persistence; submit shows loading state only.
  */
  const [intIsSaving, setIntIsSaving] = useState(0);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIntIsSaving(1);

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1200);
    });

    setIntIsSaving(0);
  };

  return (
    <Stack component="form" spacing={4} onSubmit={handleSubmit}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={3}
        alignItems={{ xs: "center", sm: "flex-start" }}
      >
        <Stack spacing={1.25} alignItems="center">
          <Box
            sx={{
              position: "relative",
              borderRadius: "50%",
              p: "3px",
              boxShadow: "0 8px 20px rgba(15,23,42,0.12)",
              border: "2px solid rgba(37,99,235,0.2)",
              transition: "all 0.2s ease",
              "&:hover .profile-overlay": {
                opacity: 1
              }
            }}
          >
            <Avatar
              sx={{
                width: 88,
                height: 88,
                bgcolor: "rgba(37, 99, 235, 0.14)",
                color: "primary.main",
                fontWeight: 700,
                fontSize: 30
              }}
            >
              AJ
            </Avatar>
            <Box
              className="profile-overlay"
              sx={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                bgcolor: "rgba(15,23,42,0.38)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0,
                transition: "all 0.2s ease"
              }}
            >
              <CameraAltOutlinedIcon sx={{ color: "#ffffff", fontSize: 22 }} />
            </Box>
          </Box>
          <Typography sx={{ fontSize: 12, color: "#64748b" }}>{dicConstant.profile.changePhoto}</Typography>
        </Stack>

        <Stack spacing={0.5} alignItems={{ xs: "center", sm: "flex-start" }} sx={{ pt: { sm: 1 } }}>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Ava Johnson</Typography>
          <Typography sx={{ fontSize: 14, color: "#64748b" }}>Frontend Developer</Typography>
        </Stack>
      </Stack>

      <ProfileSection strTitle={dicConstant.profile.sectionPersonal}>
        <Grid container rowSpacing={3} columnSpacing={{ xs: 0, md: 3 }} sx={{ mx: 0, width: "100%" }}>
          <Grid item xs={12} md={6}>
            <TextField label={dicConstant.profile.fullName} defaultValue="Ava Johnson" fullWidth sx={dicInputSx} data-testid="profile.form.full-name.input" inputProps={{ "data-testid": "profile.form.full-name.input" }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label={dicConstant.profile.email} defaultValue="ava.johnson@company.com" fullWidth sx={dicInputSx} data-testid="profile.form.email.input" inputProps={{ "data-testid": "profile.form.email.input" }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label={dicConstant.profile.phone} defaultValue="+1 555 102 4567" fullWidth sx={dicInputSx} data-testid="profile.form.phone.input" inputProps={{ "data-testid": "profile.form.phone.input" }} />
          </Grid>
        </Grid>
      </ProfileSection>

      <ProfileSection strTitle={dicConstant.profile.sectionWork}>
        <Grid container rowSpacing={3} columnSpacing={{ xs: 0, md: 3 }} sx={{ mx: 0, width: "100%" }}>
          <Grid item xs={12} md={6}>
            <TextField label={dicConstant.profile.designation} defaultValue="Frontend Developer" fullWidth sx={dicInputSx} data-testid="profile.form.designation.input" inputProps={{ "data-testid": "profile.form.designation.input" }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Department" defaultValue="Engineering" fullWidth sx={dicInputSx} data-testid="profile.form.department.input" inputProps={{ "data-testid": "profile.form.department.input" }} />
          </Grid>
        </Grid>
      </ProfileSection>

      <ProfileSection strTitle={dicConstant.profile.sectionSecurity}>
        <Stack
          spacing={2}
          sx={{
            p: 3,
            borderRadius: "20px",
            backgroundColor: "#f1f5f9",
            transition: "all 0.2s ease"
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <SecurityOutlinedIcon sx={{ color: "#2563eb", fontSize: 18 }} />
            <Typography sx={{ fontWeight: 600, color: "#0f172a" }}>{dicConstant.profile.twoFactor}</Typography>
          </Stack>
          <Typography sx={{ fontSize: 14, color: "#64748b" }}>{dicConstant.profile.twoFactorStatus}</Typography>
          <Typography sx={{ fontSize: 13, color: "#64748b" }}>{dicConstant.profile.lastLogin}</Typography>
          <Button variant="outlined" sx={{ alignSelf: "flex-start", borderRadius: "14px", height: 44 }} data-testid="profile.form.change-password.button">
            Change Password
          </Button>
        </Stack>
      </ProfileSection>

      <Button
        type="submit"
        variant="contained"
        data-testid="profile.form.update.button"
        sx={{
          alignSelf: "flex-end",
          minHeight: 52,
          px: 3,
          borderRadius: "14px",
          fontWeight: 600,
          backgroundColor: "#2563eb",
          boxShadow: "0 6px 16px rgba(37,99,235,0.35)",
          transition: "all 0.15s ease",
          "&:hover": {
            transform: "translateY(-1px)",
            backgroundColor: "#1d4ed8"
          },
          "&:active": {
            transform: "translateY(0)"
          }
        }}
      >
        {intIsSaving === 1 ? <CircularProgress size={20} color="inherit" /> : dicConstant.profile.updateButton}
      </Button>
    </Stack>
  );
}

