"use client";

import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import ProfileSection from "@/components/shared/profile/ProfileSection";
import dicConstant from "@/constants/Constant.json";
import type { CurrentUserContext } from "@/models/AuthModels";
import { authApiService } from "@/services";

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

export default function ProfileForm() {
  const [intIsSaving, setIntIsSaving] = useState(0);
  const [objUserContext, setObjUserContext] = useState<CurrentUserContext | null>(null);
  const [blnAvatarUpdating, setBlnAvatarUpdating] = useState(false);
  const [strAvatarError, setStrAvatarError] = useState("");

  useEffect(() => {
    authApiService.getCurrentUser()
      .then((objResult) => setObjUserContext(objResult.Data))
      .catch(() => undefined);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIntIsSaving(1);

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 1200);
    });

    setIntIsSaving(0);
  };

  async function refreshCurrentUser() {
    const objCurrentUserResult = await authApiService.getCurrentUser();
    setObjUserContext(objCurrentUserResult.Data);
    window.dispatchEvent(new CustomEvent("hrms:avatar-refresh"));
  }

  async function handleAvatarUpload(objEvent: ChangeEvent<HTMLInputElement>) {
    const objFile = objEvent.target.files?.[0];
    objEvent.target.value = "";
    if (!objFile) {
      return;
    }

    setBlnAvatarUpdating(true);
    setStrAvatarError("");
    try {
      await authApiService.uploadCurrentAvatar(objFile);
      await refreshCurrentUser();
    } catch (objError: unknown) {
      setStrAvatarError(objError instanceof Error ? objError.message : "Unable to upload profile photo.");
    } finally {
      setBlnAvatarUpdating(false);
    }
  }

  async function handleAvatarDelete() {
    setBlnAvatarUpdating(true);
    setStrAvatarError("");
    try {
      await authApiService.deleteCurrentAvatar();
      await refreshCurrentUser();
    } catch (objError: unknown) {
      setStrAvatarError(objError instanceof Error ? objError.message : "Unable to remove profile photo.");
    } finally {
      setBlnAvatarUpdating(false);
    }
  }

  const strProfileDisplayName = objUserContext?.objEmployee?.strFullName || objUserContext?.objUser?.strLoginName || "Workspace User";
  const strAvatarText = strProfileDisplayName.trim().charAt(0).toUpperCase() || "U";
  const strAvatarUrl = objUserContext?.strAvatarUrl || objUserContext?.objEmployee?.strProfilePhotoUrl || "";
  const strEmailAddress = objUserContext?.objUser?.strEmailAddress || "Not available";

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
                src={strAvatarUrl || undefined}
                sx={{
                  width: 88,
                  height: 88,
                bgcolor: "rgba(37, 99, 235, 0.14)",
                color: "primary.main",
                fontWeight: 700,
                fontSize: 30
              }}
            >
              {strAvatarText}
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
              <IconButton
                component="label"
                size="small"
                disabled={blnAvatarUpdating}
                sx={{
                  position: "absolute",
                  right: -2,
                  bottom: -2,
                  width: 28,
                  height: 28,
                  bgcolor: "#2563eb",
                  color: "#ffffff",
                  boxShadow: "0 10px 22px rgba(37,99,235,0.35)",
                  "&:hover": { bgcolor: "#1d4ed8" },
                  "&.Mui-disabled": { bgcolor: "#94a3b8", color: "#e2e8f0" }
                }}
              >
                {blnAvatarUpdating ? <CircularProgress size={14} color="inherit" /> : <CameraAltOutlinedIcon sx={{ fontSize: 16 }} />}
                <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} />
              </IconButton>
          </Box>
          <Typography sx={{ fontSize: 12, color: "#64748b" }}>Profile photo</Typography>
          <Button component="label" size="small" variant="outlined" disabled={blnAvatarUpdating} startIcon={blnAvatarUpdating ? <CircularProgress size={14} color="inherit" /> : <CameraAltOutlinedIcon />}>
            Upload
            <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} />
          </Button>
          <Button size="small" variant="text" disabled={blnAvatarUpdating || !strAvatarUrl} startIcon={<DeleteOutlineRoundedIcon />} onClick={handleAvatarDelete}>Remove</Button>
          {strAvatarError ? <Typography sx={{ fontSize: 12, color: "#b91c1c", maxWidth: 180, textAlign: "center" }}>{strAvatarError}</Typography> : null}
        </Stack>

        <Stack spacing={0.5} alignItems={{ xs: "center", sm: "flex-start" }} sx={{ pt: { sm: 1 } }}>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>{strProfileDisplayName}</Typography>
          <Typography sx={{ fontSize: 14, color: "#64748b" }}>{strEmailAddress}</Typography>
        </Stack>
      </Stack>

      <ProfileSection strTitle={dicConstant.profile.sectionPersonal}>
        <Grid container rowSpacing={3} columnSpacing={{ xs: 0, md: 3 }} sx={{ mx: 0, width: "100%" }}>
          <Grid item xs={12} md={6}>
            <TextField label={dicConstant.profile.fullName} defaultValue={strProfileDisplayName} fullWidth sx={dicInputSx} controlId="profile.form.full-name.input" inputProps={{ "controlId": "profile.form.full-name.input" }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label={dicConstant.profile.email} defaultValue={strEmailAddress} fullWidth sx={dicInputSx} controlId="profile.form.email.input" inputProps={{ "controlId": "profile.form.email.input" }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label={dicConstant.profile.phone} defaultValue="" fullWidth sx={dicInputSx} controlId="profile.form.phone.input" inputProps={{ "controlId": "profile.form.phone.input" }} />
          </Grid>
        </Grid>
      </ProfileSection>

      <ProfileSection strTitle={dicConstant.profile.sectionWork}>
        <Grid container rowSpacing={3} columnSpacing={{ xs: 0, md: 3 }} sx={{ mx: 0, width: "100%" }}>
          <Grid item xs={12} md={6}>
            <TextField label={dicConstant.profile.designation} defaultValue="" fullWidth sx={dicInputSx} controlId="profile.form.designation.input" inputProps={{ "controlId": "profile.form.designation.input" }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Department" defaultValue="" fullWidth sx={dicInputSx} controlId="profile.form.department.input" inputProps={{ "controlId": "profile.form.department.input" }} />
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
          <Button variant="outlined" sx={{ alignSelf: "flex-start", borderRadius: "14px", height: 44 }} controlId="profile.form.change-password.button">
            Change Password
          </Button>
        </Stack>
      </ProfileSection>

      <Button
        type="submit"
        variant="contained"
        controlId="profile.form.update.button"
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
