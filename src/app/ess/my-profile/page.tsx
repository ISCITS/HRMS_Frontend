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
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import type { CurrentUserContext } from "@/models/AuthModels";
import { authApiService } from "@/services";

function formatDate(strDate: string | null) {
  if (!strDate) {
    return "Not available";
  }

  const objDate = new Date(strDate);
  if (Number.isNaN(objDate.getTime())) {
    return "Not available";
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
  intValue: number | null
) {
  if (!intValue) {
    return "Not available";
  }
  return lstOptions?.find((dicOption) => dicOption.intID === intValue)?.strLabel ?? "Not available";
}

export default function EssMyProfilePage() {
  const objRouter = useRouter();
  const { canDoAny } = useModuleActionAccess(["EMPLOYEE", "EMPLOYEES", "MASTER_EMPLOYEE"]);
  const [intEmployeeID, setIntEmployeeID] = useState<number | null>(null);
  const [objUserContext, setObjUserContext] = useState<CurrentUserContext | null>(null);
  const [objEmployee, setObjEmployee] = useState<EmployeeDetailRecord | null>(null);
  const [objFormOptions, setObjFormOptions] = useState<EmployeeFormOptions | null>(null);
  const [objAddress, setObjAddress] = useState<EmployeeAddressRecord | null>(null);
  const [objStatutory, setObjStatutory] = useState<EmployeeStatutoryRecord | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnAvatarUpdating, setBlnAvatarUpdating] = useState(false);
  const [strError, setStrError] = useState("");

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
          setStrError("No employee is linked to the current user.");
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
          setStrError(objError instanceof Error ? objError.message : "Unable to load your profile.");
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
          <Typography color="text.secondary">Loading your employee profile...</Typography>
        </Stack>
      </Box>
    );
  }

  if (!intEmployeeID) {
    return (
      <Paper sx={{ p: 3, borderRadius: "24px" }}>
        <Typography sx={{ fontWeight: 700, color: "#0f172a", mb: 1 }}>My Profile</Typography>
        <Typography color="error">{strError || "Unable to resolve employee profile."}</Typography>
      </Paper>
    );
  }

  const strFullName = objEmployee?.strFullName?.trim() || "Employee";
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
      setStrError(objError instanceof Error ? objError.message : "Unable to upload profile photo.");
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
      setStrError(objError instanceof Error ? objError.message : "Unable to remove profile photo.");
    } finally {
      setBlnAvatarUpdating(false);
    }
  }

  return (
    <Stack spacing={1.5} sx={{ position: "relative" }}>
      <Box
        sx={{
          position: "absolute",
          inset: "-18px 0 auto 0",
          height: 150,
          borderRadius: "24px",
          background: "radial-gradient(90% 130% at 20% 10%, rgba(56,189,248,0.22) 0%, rgba(59,130,246,0.14) 45%, rgba(255,255,255,0) 100%)",
          pointerEvents: "none"
        }}
      />

      <Paper
        sx={{
          p: { xs: 1.5, md: 2.1 },
          borderRadius: "20px",
          border: "1px solid rgba(148,163,184,0.22)",
          background: "linear-gradient(135deg, #0b3f70 0%, #0a66a3 52%, #0e7490 100%)",
          color: "white",
          boxShadow: "0 14px 28px rgba(2, 6, 23, 0.18)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <Box
          sx={{
            position: "absolute",
            width: 160,
            height: 160,
            borderRadius: "50%",
            right: -30,
            top: -55,
            background: "rgba(255,255,255,0.12)"
          }}
        />
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={1.2}
        >
          <Stack direction="row" spacing={1.1} alignItems="center">
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
              <Typography sx={{ color: "rgba(241,245,249,0.9)", fontSize: "0.82rem" }}>{objEmployee?.strEmployeeCode || "Not available"}</Typography>
              <Stack direction="row" spacing={0.75} sx={{ mt: 0.55 }}>
                <Chip
                  size="small"
                  label={objEmployee?.strEmploymentStatus || "Unknown"}
                  color={objEmployee?.strEmploymentStatus === "Active" ? "success" : "default"}
                  sx={{ height: 22, "& .MuiChip-label": { fontWeight: 700, px: 0.9, fontSize: "0.72rem" } }}
                />
                <Chip
                  size="small"
                  label={objEmployee?.blnIsEssEnabled ? "ESS Enabled" : "ESS Disabled"}
                  variant="outlined"
                  sx={{ borderColor: "rgba(255,255,255,0.45)", color: "white", height: 22, "& .MuiChip-label": { fontWeight: 700, px: 0.9, fontSize: "0.72rem" } }}
                />
              </Stack>
            </Box>
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
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
              Upload
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
              Remove
            </Button>
            {blnCanOpenEmployeeEditor ? (
              <Button
                controlId="ess.my-profile.edit.button"
                variant="contained"
                startIcon={<EditRoundedIcon />}
                onClick={() => objRouter.push(`/employees/edit/${intEmployeeID}?backRoute=${encodeURIComponent("/ess/my-profile")}`)}
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
                Edit
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: { xs: 1.5, md: 2 }, borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 10px 20px rgba(15,23,42,0.05)" }}>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
          <PersonRoundedIcon sx={{ color: "#0284c7" }} />
          <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.96rem" }}>Personal Information</Typography>
        </Stack>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="First Name" strValue={objEmployee?.strFirstName || "Not available"} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="Middle Name" strValue={objEmployee?.strMiddleName || "Not available"} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="Last Name" strValue={objEmployee?.strLastName || "Not available"} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="Date of Birth" strValue={formatDate(objEmployee?.dtDateOfBirth ?? null)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="Gender" strValue={objEmployee?.strGender || "Not available"} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="Mobile Number" strValue={objEmployee?.strMobileNumber || "Not available"} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="Personal Email" strValue={objEmployee?.strPersonalEmail || "Not available"} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="Work Email" strValue={objEmployee?.strWorkEmail || "Not available"} /></Grid>
        </Grid>

        <Divider sx={{ my: 1.5 }} />

        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
          <BadgeRoundedIcon sx={{ color: "#0284c7" }} />
          <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.96rem" }}>Employment Information</Typography>
        </Stack>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="Date of Joining" strValue={formatDate(objEmployee?.dtDateOfJoining ?? null)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="Employment Type" strValue={resolveLookupLabel(objFormOptions?.lstEmploymentTypes, objEmployee?.intEmploymentTypeID ?? null)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="Department" strValue={resolveLookupLabel(objFormOptions?.lstDepartments, objEmployee?.intDepartmentID ?? null)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="Designation" strValue={resolveLookupLabel(objFormOptions?.lstDesignations, objEmployee?.intDesignationID ?? null)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="Grade" strValue={resolveLookupLabel(objFormOptions?.lstGrades, objEmployee?.intGradeID ?? null)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="Location" strValue={resolveLookupLabel(objFormOptions?.lstLocations, objEmployee?.intLocationID ?? null)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="Cost Center" strValue={resolveLookupLabel(objFormOptions?.lstCostCenters, objEmployee?.intCostCenterID ?? null)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="Manager" strValue={resolveLookupLabel(objFormOptions?.lstManagers, objEmployee?.intManagerEmployeeID ?? null)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="Date of Exit" strValue={formatDate(objEmployee?.dtDateOfExit ?? null)} /></Grid>
        </Grid>

        <Divider sx={{ my: 1.5 }} />

        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
          <HomeWorkRoundedIcon sx={{ color: "#0284c7" }} />
          <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.96rem" }}>Address</Typography>
        </Stack>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="Address Type" strValue={objAddress?.strAddressType || "Not available"} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="Address Line 1" strValue={objAddress?.strAddressLine1 || "Not available"} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="Address Line 2" strValue={objAddress?.strAddressLine2 || "Not available"} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="City" strValue={objAddress?.strCityName || "Not available"} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="State" strValue={resolveLookupLabel(objFormOptions?.lstStates, objAddress?.intStateID ?? null)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="Country" strValue={resolveLookupLabel(objFormOptions?.lstCountries, objAddress?.intCountryID ?? null)} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="Postal Code" strValue={objAddress?.strPostalCode || "Not available"} /></Grid>
        </Grid>

        <Divider sx={{ my: 1.5 }} />

        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
          <AccountBalanceRoundedIcon sx={{ color: "#0284c7" }} />
          <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.96rem" }}>Statutory</Typography>
        </Stack>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="PAN" strValue={objStatutory?.strPanNumber || "Not available"} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="UAN" strValue={objStatutory?.strUanNumber || "Not available"} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="ESI Number" strValue={objStatutory?.strEsiNumber || "Not available"} /></Grid>
          <Grid item xs={12} sm={6} md={4}><ProfileField strLabel="Tax Regime" strValue={objStatutory?.strTaxRegimeCode || "Not available"} /></Grid>
        </Grid>
      </Paper>
    </Stack>
  );
}
