"use client";

import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useState } from "react";

import { employeeService } from "@/features/employee/services/employeeService";
import type { EmployeeAddressRecord, EmployeeDetailRecord, EmployeeFormOptions, EmployeeStatutoryRecord } from "@/features/employee/types";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import type { CurrentUserContext } from "@/models/AuthModels";
import { authApiService } from "@/services";

function formatDate(strDate: string | null, strNotAvailable: string) {
  if (!strDate) {
    return strNotAvailable;
  }

  const objDate = new Date(strDate);
  if (Number.isNaN(objDate.getTime())) {
    return strNotAvailable;
  }

  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(objDate);
}

function ProfileField({ strLabel, strValue }: { strLabel: string; strValue: string }) {
  return (
    <Box
      sx={{
        p: 1.05,
        borderRadius: "12px",
        border: "1px solid rgba(148,163,184,0.2)",
        background: "linear-gradient(180deg, rgba(248,250,252,0.8) 0%, rgba(241,245,249,0.65) 100%)",
        minHeight: 66
      }}
    >
      <Typography sx={{ fontSize: "0.76rem", color: "#64748b", fontWeight: 700, mb: 0.2 }}>{strLabel}</Typography>
      <Typography sx={{ fontSize: "0.9rem", color: "#0f172a", fontWeight: 600 }}>{strValue}</Typography>
    </Box>
  );
}

function resolveLookupLabel(
  lstOptions: Array<{ intID: number; strLabel: string }> | undefined,
  intValue: number | null,
  strNotAvailable: string
) {
  if (!intValue) {
    return strNotAvailable;
  }
  return lstOptions?.find((dicOption) => dicOption.intID === intValue)?.strLabel ?? strNotAvailable;
}

export default function EssMyProfilePage() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("my-profile");
  const { canDoAny } = useModuleActionAccess(["MY_PROFILE"]);
  const [intEmployeeID, setIntEmployeeID] = useState<number | null>(null);
  const [objUserContext, setObjUserContext] = useState<CurrentUserContext | null>(null);
  const [objEmployee, setObjEmployee] = useState<EmployeeDetailRecord | null>(null);
  const [objFormOptions, setObjFormOptions] = useState<EmployeeFormOptions | null>(null);
  const [objAddress, setObjAddress] = useState<EmployeeAddressRecord | null>(null);
  const [objStatutory, setObjStatutory] = useState<EmployeeStatutoryRecord | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnAvatarUpdating, setBlnAvatarUpdating] = useState(false);
  const [strError, setStrError] = useState("");
  const strNotAvailable = t("not_available", "Not available");

  function valueOrNotAvailable(strValue: string | null | undefined) {
    return strValue?.trim() || strNotAvailable;
  }

  function translateKnownValue(strValue: string | null | undefined) {
    const strResolvedValue = valueOrNotAvailable(strValue);
    const strNormalizedValue = strResolvedValue.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
    const dicValueLabelKeys: Record<string, [string, string]> = {
      active: ["status_active", "Active"],
      inactive: ["status_inactive", "Inactive"],
      male: ["gender_male", "Male"],
      female: ["gender_female", "Female"],
      other: ["gender_other", "Other"],
      "full time": ["employment_type_full_time", "Full Time"],
      "part time": ["employment_type_part_time", "Part Time"],
      contract: ["employment_type_contract", "Contract"],
      current: ["address_type_current", "Current"],
      permanent: ["address_type_permanent", "Permanent"],
      "new regime": ["tax_regime_new", "New Regime"],
      "old regime": ["tax_regime_old", "Old Regime"],
    };
    const lstValueLabel = dicValueLabelKeys[strNormalizedValue];
    return lstValueLabel ? t(lstValueLabel[0], lstValueLabel[1]) : strResolvedValue;
  }

  useEffect(() => {
    let blnMounted = true;

    async function loadProfile() {
      try {
        const objResult = await authApiService.getCurrentUser();
        if (!blnMounted) {
          return;
        }

        setObjUserContext(objResult.Data);
        const intCurrentEmployeeID = objResult.Data.objUser.intEmployeeID ?? null;
        if (!intCurrentEmployeeID) {
          setStrError(t("error_employee_not_linked", "No employee is linked to the current user."));
          return;
        }

        setIntEmployeeID(intCurrentEmployeeID);
        const [dicEmployee, dicOptions, lstProfileDetails] = await Promise.all([
          employeeService.getEmployeeById(intCurrentEmployeeID),
          employeeService.getFormOptions(),
          Promise.allSettled([
            employeeService.getEmployeeAddress(intCurrentEmployeeID),
            employeeService.getEmployeeStatutory(intCurrentEmployeeID)
          ])
        ]);

        if (!blnMounted) {
          return;
        }

        setObjEmployee(dicEmployee);
        setObjFormOptions(dicOptions);

        if (lstProfileDetails[0].status === "fulfilled") {
          setObjAddress(lstProfileDetails[0].value);
        }

        if (lstProfileDetails[1].status === "fulfilled") {
          setObjStatutory(lstProfileDetails[1].value);
        }
      } catch (objError: unknown) {
        if (blnMounted) {
          setStrError(objError instanceof Error ? objError.message : t("error_load_profile", "Unable to load your profile."));
        }
      } finally {
        if (blnMounted) {
          setBlnLoading(false);
        }
      }
    }

    loadProfile().catch(() => undefined);

    return () => {
      blnMounted = false;
    };
  }, []);

  if (blnLoading) {
    return (
      <Box sx={{ minHeight: "50vh", display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress />
          <Typography color="text.secondary">{t("loading_profile", "Loading your employee profile...")}</Typography>
        </Stack>
      </Box>
    );
  }

  if (!intEmployeeID) {
    return (
      <Paper sx={{ p: 3, borderRadius: "24px" }}>
        <Typography sx={{ fontWeight: 700, color: "#0f172a", mb: 1 }}>{t("page_title", "My Profile")}</Typography>
        <Typography color="error">{strError || t("error_resolve_profile", "Unable to resolve employee profile.")}</Typography>
      </Paper>
    );
  }

  const strFullName = objEmployee?.strFullName?.trim() || t("employee_fallback", "Employee");
  const strInitial = strFullName[0]?.toUpperCase() || "E";
  const strTitleName = [objEmployee?.strTitle ?? "", strFullName].filter(Boolean).join(" ");
  const strAvatarUrl = objUserContext?.strAvatarUrl || objUserContext?.objEmployee?.strProfilePhotoUrl || "";
  const blnCanOpenEmployeeEditor = canDoAny("edit");

  async function refreshUserContext() {
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
    setStrError("");
    try {
      await authApiService.uploadCurrentAvatar(objFile);
      await refreshUserContext();
    } catch (objError: unknown) {
      setStrError(objError instanceof Error ? objError.message : t("error_upload_photo", "Unable to upload profile photo."));
    } finally {
      setBlnAvatarUpdating(false);
    }
  }

  async function handleAvatarDelete() {
    setBlnAvatarUpdating(true);
    setStrError("");
    try {
      await authApiService.deleteCurrentAvatar();
      await refreshUserContext();
    } catch (objError: unknown) {
      setStrError(objError instanceof Error ? objError.message : t("error_remove_photo", "Unable to remove profile photo."));
    } finally {
      setBlnAvatarUpdating(false);
    }
  }

  return (
    <Stack spacing={0} sx={{ position: "relative" }}>
      <Box className="pageBanner">
        <Box className="bannerDots" />
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={1.2}
          sx={{ position: "relative", zIndex: 1, width: "100%" }}
        >
          <Stack direction="row" spacing={1.1} alignItems="center" sx={{ flex: "1 1 auto", minWidth: 0 }}>
            <Box sx={{ position: "relative", width: 56, height: 56 }}>
              <Avatar
                src={strAvatarUrl || undefined}
                sx={{
                  width: 56,
                  height: 56,
                  background: "rgba(255,255,255,0.2)",
                  color: "#f8fafc",
                  fontWeight: 800,
                  fontSize: "1.05rem",
                  border: "2px solid rgba(255,255,255,0.2)"
                }}
              >
                {strInitial}
              </Avatar>
              <IconButton
                component="label"
                size="small"
                disabled={blnAvatarUpdating}
                sx={{
                  position: "absolute",
                  right: -4,
                  bottom: -4,
                  width: 24,
                  height: 24,
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                  boxShadow: "0 8px 18px rgba(15,23,42,0.24)",
                  "&:hover": { backgroundColor: "#e2e8f0" },
                  "&.Mui-disabled": { backgroundColor: "#cbd5e1", color: "#475569" }
                }}
              >
                {blnAvatarUpdating ? <CircularProgress size={14} color="inherit" /> : <EditRoundedIcon sx={{ fontSize: 14 }} />}
                <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} />
              </IconButton>
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, color: "white", fontSize: "1rem", lineHeight: 1.2 }}>{strTitleName}</Typography>
              <Typography sx={{ color: "rgba(241,245,249,0.9)", fontSize: "0.82rem" }}>{valueOrNotAvailable(objEmployee?.strEmployeeCode)}</Typography>
              <Stack direction="row" spacing={0.75} sx={{ mt: 0.55 }}>
                <Chip
                  size="small"
                  label={translateKnownValue(objEmployee?.strEmploymentStatus || t("unknown", "Unknown"))}
                  color={objEmployee?.strEmploymentStatus === "Active" ? "success" : "default"}
                  sx={{ height: 22, "& .MuiChip-label": { fontWeight: 700, px: 0.9, fontSize: "0.72rem" } }}
                />
                <Chip
                  size="small"
                  label={objEmployee?.blnIsEssEnabled ? t("ess_enabled", "ESS Enabled") : t("ess_disabled", "ESS Disabled")}
                  variant="outlined"
                  sx={{ borderColor: "rgba(255,255,255,0.45)", color: "white", height: 22, "& .MuiChip-label": { fontWeight: 700, px: 0.9, fontSize: "0.72rem" } }}
                />
              </Stack>
            </Box>
          </Stack>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="flex-end"
            sx={{
              width: { xs: "100%", md: "auto" },
              alignSelf: { xs: "stretch", md: "center" },
              flex: { md: "0 0 auto" },
              ml: { md: "auto" }
            }}
          >
            <Button
              component="label"
              variant="outlined"
              startIcon={blnAvatarUpdating ? <CircularProgress size={16} color="inherit" /> : <PhotoCameraRoundedIcon />}
              disabled={blnAvatarUpdating}
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 700,
                px: 1.4,
                py: 0.65,
                fontSize: "0.82rem",
                borderColor: "rgba(255,255,255,0.55)",
                color: "white"
              }}
            >
              {t("upload", "Upload")}
              <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} />
            </Button>
            <Button
              variant="outlined"
              startIcon={<DeleteOutlineRoundedIcon />}
              onClick={handleAvatarDelete}
              disabled={blnAvatarUpdating || !strAvatarUrl}
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 700,
                px: 1.4,
                py: 0.65,
                fontSize: "0.82rem",
                borderColor: "rgba(255,255,255,0.4)",
                color: "white"
              }}
            >
              {t("remove", "Remove")}
            </Button>
            {blnCanOpenEmployeeEditor ? (
              <Button
                controlId="ess.my-profile.edit.button"
                variant="contained"
                startIcon={<EditRoundedIcon />}
                onClick={() => objRouter.push(`/ess/my-profile/edit/${intEmployeeID}`)}
                sx={{
                  borderRadius: "12px",
                  textTransform: "none",
                  fontWeight: 700,
                  px: 1.4,
                  py: 0.65,
                  fontSize: "0.82rem",
                  backgroundColor: "white",
                  color: "#0f172a",
                  "&:hover": { backgroundColor: "#e2e8f0" }
                }}
              >
                {t("edit", "Edit")}
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Box>

      <Paper sx={{ p: { xs: 1.5, md: 2 }, borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 10px 20px rgba(15,23,42,0.05)" }}>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
          <PersonRoundedIcon sx={{ color: "#0284c7" }} />
          <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.96rem" }}>{t("section_personal_information", "Personal Information")}</Typography>
        </Stack>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_first_name", "First Name")} strValue={valueOrNotAvailable(objEmployee?.strFirstName)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_middle_name", "Middle Name")} strValue={valueOrNotAvailable(objEmployee?.strMiddleName)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_last_name", "Last Name")} strValue={valueOrNotAvailable(objEmployee?.strLastName)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_date_of_birth", "Date of Birth")} strValue={formatDate(objEmployee?.dtDateOfBirth ?? null, strNotAvailable)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_gender", "Gender")} strValue={translateKnownValue(objEmployee?.strGender)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_mobile_number", "Mobile Number")} strValue={valueOrNotAvailable(objEmployee?.strMobileNumber)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_personal_email", "Personal Email")} strValue={valueOrNotAvailable(objEmployee?.strPersonalEmail)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_work_email", "Work Email")} strValue={valueOrNotAvailable(objEmployee?.strWorkEmail)} /></Grid>
        </Grid>

        <Divider sx={{ my: 1.5 }} />

        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
          <BadgeRoundedIcon sx={{ color: "#0284c7" }} />
          <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.96rem" }}>{t("section_employment_information", "Employment Information")}</Typography>
        </Stack>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_date_of_joining", "Date of Joining")} strValue={formatDate(objEmployee?.dtDateOfJoining ?? null, strNotAvailable)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_employment_type", "Employment Type")} strValue={translateKnownValue(resolveLookupLabel(objFormOptions?.lstEmploymentTypes, objEmployee?.intEmploymentTypeID ?? null, strNotAvailable))} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_department", "Department")} strValue={resolveLookupLabel(objFormOptions?.lstDepartments, objEmployee?.intDepartmentID ?? null, strNotAvailable)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_designation", "Designation")} strValue={resolveLookupLabel(objFormOptions?.lstDesignations, objEmployee?.intDesignationID ?? null, strNotAvailable)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_grade", "Grade")} strValue={resolveLookupLabel(objFormOptions?.lstGrades, objEmployee?.intGradeID ?? null, strNotAvailable)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_location", "Location")} strValue={resolveLookupLabel(objFormOptions?.lstLocations, objEmployee?.intLocationID ?? null, strNotAvailable)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_cost_center", "Cost Center")} strValue={resolveLookupLabel(objFormOptions?.lstCostCenters, objEmployee?.intCostCenterID ?? null, strNotAvailable)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_manager", "Manager")} strValue={resolveLookupLabel(objFormOptions?.lstManagers, objEmployee?.intManagerEmployeeID ?? null, strNotAvailable)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_date_of_exit", "Date of Exit")} strValue={formatDate(objEmployee?.dtDateOfExit ?? null, strNotAvailable)} /></Grid>
        </Grid>

        <Divider sx={{ my: 1.5 }} />

        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
          <HomeWorkRoundedIcon sx={{ color: "#0284c7" }} />
          <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.96rem" }}>{t("section_address", "Address")}</Typography>
        </Stack>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_address_type", "Address Type")} strValue={translateKnownValue(objAddress?.strAddressType)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_address_line_1", "Address Line 1")} strValue={valueOrNotAvailable(objAddress?.strAddressLine1)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_address_line_2", "Address Line 2")} strValue={valueOrNotAvailable(objAddress?.strAddressLine2)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_city", "City")} strValue={valueOrNotAvailable(objAddress?.strCityName)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_state", "State")} strValue={resolveLookupLabel(objFormOptions?.lstStates, objAddress?.intStateID ?? null, strNotAvailable)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_country", "Country")} strValue={resolveLookupLabel(objFormOptions?.lstCountries, objAddress?.intCountryID ?? null, strNotAvailable)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_postal_code", "Postal Code")} strValue={valueOrNotAvailable(objAddress?.strPostalCode)} /></Grid>
        </Grid>

        <Divider sx={{ my: 1.5 }} />

        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
          <AccountBalanceRoundedIcon sx={{ color: "#0284c7" }} />
          <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.96rem" }}>{t("section_statutory", "Statutory")}</Typography>
        </Stack>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_pan", "PAN")} strValue={valueOrNotAvailable(objStatutory?.strPanNumber)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_uan", "UAN")} strValue={valueOrNotAvailable(objStatutory?.strUanNumber)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_esi_number", "ESI Number")} strValue={valueOrNotAvailable(objStatutory?.strEsiNumber)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel={t("field_tax_regime", "Tax Regime")} strValue={translateKnownValue(objStatutory?.strTaxRegimeCode)} /></Grid>
        </Grid>
      </Paper>
    </Stack>
  );
}
