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
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useAuthenticatedAvatar } from "@/hooks/useAuthenticatedAvatar";
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
  const { t } = useModuleLabels("my-profile");
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

    setStrAvatarError("");

    // Pre-flight checks mirroring the backend's EmployeeAvatarService limits (200 KB,
    // JPG/PNG/WEBP only) so an oversized/invalid photo always shows a clear message
    // immediately instead of depending on the network round trip to surface one.
    const AVATAR_MAX_BYTES = 200 * 1024;
    if (objFile.size <= 0) {
      setStrAvatarError(t("error_photo_empty", "The selected photo is empty."));
      return;
    }
    if (objFile.size > AVATAR_MAX_BYTES) {
      setStrAvatarError(t("error_photo_too_large", "Photo is too large. Maximum allowed size is 200 KB."));
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(objFile.type)) {
      setStrAvatarError(t("error_photo_unsupported_type", "Unsupported file type. Allowed types: JPG, PNG, WEBP."));
      return;
    }

    setBlnAvatarUpdating(true);
    try {
      await authApiService.uploadCurrentAvatar(objFile);
      await refreshCurrentUser();
    } catch (objError: unknown) {
      setStrAvatarError(objError instanceof Error ? objError.message : t("error_upload_photo", "Unable to upload profile photo."));
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
      setStrAvatarError(objError instanceof Error ? objError.message : t("error_remove_photo", "Unable to remove profile photo."));
    } finally {
      setBlnAvatarUpdating(false);
    }
  }

  const strProfileDisplayName = objUserContext?.objEmployee?.strFullName || objUserContext?.objUser?.strLoginName || t("workspace_user", "Workspace User");
  const strAvatarText = strProfileDisplayName.trim().charAt(0).toUpperCase() || "U";
  const strAvatarUrl = objUserContext?.strAvatarUrl || objUserContext?.objEmployee?.strProfilePhotoUrl || "";
  const strAuthenticatedAvatarUrl = useAuthenticatedAvatar(strAvatarUrl);
  const strEmailAddress = objUserContext?.objUser?.strEmailAddress || t("not_available", "Not available");

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
                src={strAuthenticatedAvatarUrl || undefined}
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
          <Typography sx={{ fontSize: 12, color: "#64748b" }}>{t("profile_photo", "Profile photo")}</Typography>
          <Button component="label" size="small" variant="outlined" disabled={blnAvatarUpdating} startIcon={blnAvatarUpdating ? <CircularProgress size={14} color="inherit" /> : <CameraAltOutlinedIcon />}>
            {t("upload", "Upload")}
            <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} />
          </Button>
          <Button size="small" variant="text" disabled={blnAvatarUpdating || !strAvatarUrl} startIcon={<DeleteOutlineRoundedIcon />} onClick={handleAvatarDelete}>{t("remove", "Remove")}</Button>
          {strAvatarError ? <Typography sx={{ fontSize: 12, color: "#b91c1c", maxWidth: 180, textAlign: "center" }}>{strAvatarError}</Typography> : null}
        </Stack>

        <Stack spacing={0.5} alignItems={{ xs: "center", sm: "flex-start" }} sx={{ pt: { sm: 1 } }}>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>{strProfileDisplayName}</Typography>
          <Typography sx={{ fontSize: 14, color: "#64748b" }}>{strEmailAddress}</Typography>
        </Stack>
      </Stack>

      <ProfileSection strTitle={t("section_personal_information", dicConstant.profile.sectionPersonal)}>
        <Grid container rowSpacing={3} columnSpacing={{ xs: 0, md: 3 }} sx={{ mx: 0, width: "100%" }}>
          <Grid item xs={12} md={6}>
            <TextField label={t("field_full_name", dicConstant.profile.fullName)} defaultValue={strProfileDisplayName} fullWidth sx={dicInputSx} controlId="profile.form.full-name.input" inputProps={{ "controlId": "profile.form.full-name.input" }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label={t("field_email", dicConstant.profile.email)} defaultValue={strEmailAddress} fullWidth sx={dicInputSx} controlId="profile.form.email.input" inputProps={{ "controlId": "profile.form.email.input" }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label={t("field_phone", dicConstant.profile.phone)} defaultValue="" fullWidth sx={dicInputSx} controlId="profile.form.phone.input" inputProps={{ "controlId": "profile.form.phone.input" }} />
          </Grid>
        </Grid>
      </ProfileSection>

      <ProfileSection strTitle={t("section_employment_information", dicConstant.profile.sectionWork)}>
        <Grid container rowSpacing={3} columnSpacing={{ xs: 0, md: 3 }} sx={{ mx: 0, width: "100%" }}>
          <Grid item xs={12} md={6}>
            <TextField label={t("field_designation", dicConstant.profile.designation)} defaultValue="" fullWidth sx={dicInputSx} controlId="profile.form.designation.input" inputProps={{ "controlId": "profile.form.designation.input" }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label={t("field_department", "Department")} defaultValue="" fullWidth sx={dicInputSx} controlId="profile.form.department.input" inputProps={{ "controlId": "profile.form.department.input" }} />
          </Grid>
        </Grid>
      </ProfileSection>

      <ProfileSection strTitle={t("section_security", dicConstant.profile.sectionSecurity)}>
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
            <Typography sx={{ fontWeight: 600, color: "#0f172a" }}>{t("two_factor_authentication", dicConstant.profile.twoFactor)}</Typography>
          </Stack>
          <Typography sx={{ fontSize: 14, color: "#64748b" }}>{t("two_factor_status", dicConstant.profile.twoFactorStatus)}</Typography>
          <Typography sx={{ fontSize: 13, color: "#64748b" }}>{t("last_login", dicConstant.profile.lastLogin)}</Typography>
          <Button variant="outlined" sx={{ alignSelf: "flex-start", borderRadius: "14px", height: 44 }} controlId="profile.form.change-password.button">
            {t("change_password", "Change Password")}
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
        {intIsSaving === 1 ? <CircularProgress size={20} color="inherit" /> : t("update_button", dicConstant.profile.updateButton)}
      </Button>
    </Stack>
  );
}
