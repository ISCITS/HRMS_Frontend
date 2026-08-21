"use client";

// import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography
} from "@mui/material";
// import { useRouter } from "next/navigation";
import { ChangeEvent, type ReactElement, useEffect, useState } from "react";

import { employeeService } from "@/features/employee/services/employeeService";
import type { EmployeeAddressRecord, EmployeeDetailRecord, EmployeeExperienceRecord, EmployeeFamilyDetailRecord, EmployeeFormOptions, EmployeeQualificationRecord } from "@/features/employee/types";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useAuthenticatedAvatar } from "@/hooks/useAuthenticatedAvatar";
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

function DetailRow({ strLabel, strValue }: { strLabel: string; strValue: string }) {
  return (
    <Grid container sx={{ minHeight: 43, alignItems: "center", borderBottom: "1px solid #e9edf3", py: 0.55 }}>
      <Grid item xs={5} sm={4.5}>
        <Typography sx={{ color: "#667085", typography: "body2", fontWeight: 600 }}>{strLabel}</Typography>
      </Grid>
      <Grid item xs={7} sm={7.5}>
        <Typography sx={{ color: "#172033", typography: "body2", fontWeight: 600, overflowWrap: "anywhere" }}>{strValue}</Typography>
      </Grid>
    </Grid>
  );
}

function SidebarLine({ objIcon, strValue, strIconColor }: { objIcon: ReactElement; strValue: string; strIconColor: string }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Box sx={{ color: strIconColor, display: "flex", "& svg": { fontSize: 15 } }}>{objIcon}</Box>
      <Typography sx={{ color: "#344054", typography: "body2", overflowWrap: "anywhere", minWidth: 0 }}>{strValue}</Typography>
    </Stack>
  );
}

const dicReadOnlyCardSx = {
  borderRadius: "9px",
  overflow: "hidden",
  background: "linear-gradient(180deg, rgba(248, 250, 252, 0.98) 0%, #ffffff 88px)"
} as const;

function ReadOnlyCard({ lstRows }: { lstRows: Array<{ strLabel: string; strValue: string }> }) {
  return (
    <Paper variant="outlined" sx={dicReadOnlyCardSx}>
      <Box sx={{ px: 1.5 }}>
        {lstRows.map((objRow) => <DetailRow key={objRow.strLabel} strLabel={objRow.strLabel} strValue={objRow.strValue} />)}
      </Box>
    </Paper>
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
  // const objRouter = useRouter();
  const { t } = useModuleLabels("my-profile");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(["MY_PROFILE"]);
  const [intEmployeeID, setIntEmployeeID] = useState<number | null>(null);
  const [objUserContext, setObjUserContext] = useState<CurrentUserContext | null>(null);
  const [objEmployee, setObjEmployee] = useState<EmployeeDetailRecord | null>(null);
  const [objFormOptions, setObjFormOptions] = useState<EmployeeFormOptions | null>(null);
  const [objAddress, setObjAddress] = useState<EmployeeAddressRecord | null>(null);
  const [lstExperiences, setLstExperiences] = useState<EmployeeExperienceRecord[]>([]);
  const [lstQualifications, setLstQualifications] = useState<EmployeeQualificationRecord[]>([]);
  const [lstFamily, setLstFamily] = useState<EmployeeFamilyDetailRecord[]>([]);
  const [strActiveTab, setStrActiveTab] = useState("basicInfo");
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
            employeeService.getEmployeeExperiences(intCurrentEmployeeID),
            employeeService.getEmployeeQualifications(intCurrentEmployeeID),
            employeeService.getEmployeeFamilyDetails(intCurrentEmployeeID)
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
          setLstExperiences(lstProfileDetails[1].value);
        }
        if (lstProfileDetails[2].status === "fulfilled") {
          setLstQualifications(lstProfileDetails[2].value);
        }
        if (lstProfileDetails[3].status === "fulfilled") {
          setLstFamily(lstProfileDetails[3].value);
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

  const strAvatarUrl = objUserContext?.strAvatarUrl || objUserContext?.objEmployee?.strProfilePhotoUrl || "";
  const strAuthenticatedAvatarUrl = useAuthenticatedAvatar(strAvatarUrl);

  if (blnLoading || blnRightsLoading) {
    return (
      <Box sx={{ minHeight: "50vh", display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress />
          <Typography color="text.secondary">{t("loading_profile", "Loading your employee profile...")}</Typography>
        </Stack>
      </Box>
    );
  }

  if (!canViewAny()) {
    return (
      <Paper sx={{ p: 3, borderRadius: "24px" }}>
        <Typography sx={{ fontWeight: 700, color: "#0f172a", mb: 1 }}>{t("page_title", "My Profile")}</Typography>
        <Typography color="warning.main">
          {strRightsError || t("access_not_available", "My Profile access is not available for your user group.")}
        </Typography>
      </Paper>
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
  const blnCanEditProfile = canDoAny("edit");

  async function refreshUserContext() {
    const objCurrentUserResult = await authApiService.getCurrentUser();
    setObjUserContext(objCurrentUserResult.Data);
    window.dispatchEvent(new CustomEvent("hrms:avatar-refresh"));
  }

  async function handleAvatarUpload(objEvent: ChangeEvent<HTMLInputElement>) {
    const objFile = objEvent.target.files?.[0];
    objEvent.target.value = "";
    if (!objFile || !blnCanEditProfile) {
      return;
    }

    setStrError("");

    // Pre-flight checks mirroring the backend's EmployeeAvatarService limits (200 KB,
    // JPG/PNG/WEBP only) so an oversized/invalid photo always shows a clear message
    // immediately instead of depending on the network round trip to surface one.
    const AVATAR_MAX_BYTES = 200 * 1024;
    if (objFile.size <= 0) {
      setStrError(t("error_photo_empty", "The selected photo is empty."));
      return;
    }
    if (objFile.size > AVATAR_MAX_BYTES) {
      setStrError(t("error_photo_too_large", "Photo is too large. Maximum allowed size is 200 KB."));
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(objFile.type)) {
      setStrError(t("error_photo_unsupported_type", "Unsupported file type. Allowed types: JPG, PNG, WEBP."));
      return;
    }

    setBlnAvatarUpdating(true);
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
    if (!blnCanEditProfile) {
      return;
    }
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

  const strManager = resolveLookupLabel(objFormOptions?.lstManagers, objEmployee?.intManagerEmployeeID ?? null, strNotAvailable);
  const strLocation = resolveLookupLabel(objFormOptions?.lstLocations, objEmployee?.intLocationID ?? null, strNotAvailable);
  const strDepartment = resolveLookupLabel(objFormOptions?.lstDepartments, objEmployee?.intDepartmentID ?? null, strNotAvailable);
  const strDesignation = resolveLookupLabel(objFormOptions?.lstDesignations, objEmployee?.intDesignationID ?? null, strNotAvailable);
  const strLineManager = resolveLookupLabel(objFormOptions?.lstManagers, objEmployee?.intLineManagerEmployeeID ?? null, strNotAvailable);
  const strPayrollGroup = resolveLookupLabel(objFormOptions?.lstPayrollGroups, objEmployee?.intPayrollGroupID ?? null, strNotAvailable);
  const strPreferredLanguage = resolveLookupLabel(objFormOptions?.lstLanguages, objEmployee?.intPreferredLanguageID ?? null, strNotAvailable);
  const dicTabSx = {
    minHeight: 48,
    minWidth: { xs: 105, sm: 115 },
    px: 1.2,
    textTransform: "none",
    color: "#475467",
    typography: "button",
    fontWeight: 600,
    "&.Mui-selected": {
      color: "var(--app-primary-color)",
      "& svg": { color: "var(--app-primary-color)" }
    },
    "& .MuiTab-iconWrapper": { mr: 0.7, mb: "0 !important" },
    "& svg": { fontSize: 17 }
  } as const;

  return (
    <Box sx={{ height: { xs: "auto", md: "100%" }, minHeight: 0, overflow: { xs: "visible", md: "hidden" }, display: "flex", flexDirection: "column", px: "12px" }}>
      {strRightsError ? <Typography sx={{ mb: 1, color: "#b45309", typography: "body2" }}>{strRightsError}</Typography> : null}
      {strError ? <Alert severity="error" sx={{ mb: 1.5, borderRadius: "8px" }} onClose={() => setStrError("")}>{strError}</Alert> : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(240px, 3fr) minmax(0, 9fr)", lg: "minmax(260px, 2.6fr) minmax(0, 9.4fr)" },
          gap: "12px",
          flex: { md: 1 },
          height: { xs: "auto", md: 0 },
          minHeight: 0,
          overflow: { xs: "visible", md: "hidden" }
        }}
      >
        <Box sx={{ display: "flex", minHeight: 0, overflow: "hidden" }}>
          <Paper elevation={0} sx={{ width: "100%", height: "100%", p: 1.6, border: "1px solid #e1e7ef", borderRadius: "9px", boxShadow: "0 4px 15px rgba(15,23,42,0.05)" }}>
            <Stack alignItems="center" sx={{ pt: 0.6 }}>
              <Avatar src={strAuthenticatedAvatarUrl || undefined} sx={{ width: 92, height: 92, bgcolor: "#e8eef8", color: "#334155", fontWeight: 800, fontSize: "1.5rem" }}>{strInitial}</Avatar>
              <Typography sx={{ mt: 1, color: "#172033", typography: "h6", fontWeight: 800, textAlign: "center" }}>{strTitleName}</Typography>
              <Typography sx={{ color: "#667085", typography: "body2", fontWeight: 600 }}>{valueOrNotAvailable(objEmployee?.strEmployeeCode)}</Typography>
              <Chip size="small" label={translateKnownValue(objEmployee?.strEmploymentStatus)} sx={{ mt: 0.8, height: 24, bgcolor: "#ecfdf3", color: "#15803d", "& .MuiChip-label": { px: 0.9, typography: "caption", fontWeight: 700 } }} />
            </Stack>

            <Divider sx={{ my: 1.35 }} />
            <Stack spacing={1.15}>
              <SidebarLine objIcon={<WorkOutlineRoundedIcon />} strValue={strManager} strIconColor="#2563eb" />
              <SidebarLine objIcon={<ApartmentOutlinedIcon />} strValue={strDepartment} strIconColor="#7c3aed" />
              <SidebarLine objIcon={<LocationOnOutlinedIcon />} strValue={strLocation} strIconColor="#e11d48" />
              <SidebarLine objIcon={<EmailOutlinedIcon />} strValue={valueOrNotAvailable(objEmployee?.strWorkEmail)} strIconColor="#0891b2" />
              <SidebarLine objIcon={<PhoneOutlinedIcon />} strValue={valueOrNotAvailable(objEmployee?.strMobileNumber)} strIconColor="#16a34a" />
            </Stack>

            <Divider sx={{ my: 1.35 }} />
            <Stack spacing={0.8}>
              <Button component="label" variant="outlined" fullWidth startIcon={blnAvatarUpdating ? <CircularProgress size={13} /> : <PhotoCameraRoundedIcon />} disabled={blnAvatarUpdating || !blnCanEditProfile} sx={{ minHeight: 34, borderRadius: "4px", textTransform: "none", fontWeight: 700 }}>
                {t("change_photo", "Change Photo")}
                <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} />
              </Button>
              {/* {blnCanEditProfile ? (
                <Button controlId="ess.my-profile.edit.button" variant="contained" fullWidth startIcon={<EditRoundedIcon />} onClick={() => objRouter.push(`/ess/my-profile/edit/${intEmployeeID}`)} sx={{ minHeight: 34, borderRadius: "4px", textTransform: "none", fontWeight: 700, boxShadow: "none" }}>
                  {t("edit_profile", "Edit Profile")}
                </Button>
              ) : null} */}
              {strAvatarUrl && blnCanEditProfile ? (
                <Button size="small" color="inherit" startIcon={<DeleteOutlineRoundedIcon />} onClick={handleAvatarDelete} disabled={blnAvatarUpdating} sx={{ textTransform: "none", color: "#667085" }}>{t("remove_photo", "Remove photo")}</Button>
              ) : null}
            </Stack>

          </Paper>
        </Box>

        <Box sx={{ display: "flex", minHeight: 0, overflow: "hidden" }}>
          <Paper elevation={0} sx={{ width: "100%", height: { md: "100%" }, minHeight: 0, display: "flex", flexDirection: "column", border: "1px solid #e1e7ef", borderRadius: "9px", boxShadow: "0 4px 15px rgba(15,23,42,0.05)", overflow: "hidden" }}>
            <Box sx={{ px: { xs: 0.5, sm: 1.5 }, overflowX: "auto", flexShrink: 0 }}>
              <Tabs value={strActiveTab} onChange={(_objEvent, strValue: string) => setStrActiveTab(strValue)} variant="scrollable" scrollButtons={false} sx={{ minHeight: 49, borderBottom: "1px solid #e7ebf1", "& .MuiTabs-indicator": { height: 2, bgcolor: "var(--app-primary-color)" } }}>
                <Tab value="basicInfo" icon={<PersonRoundedIcon />} iconPosition="start" label={t("tab_personal", "Personal Information")} sx={dicTabSx} />
                <Tab value="contactDetails" icon={<PhoneOutlinedIcon />} iconPosition="start" label={t("tab_employment", "Employment Information")} sx={dicTabSx} />
                <Tab value="experience" icon={<WorkOutlineRoundedIcon />} iconPosition="start" label={t("tab_experience", "Experience")} sx={dicTabSx} />
                <Tab value="qualification" icon={<SchoolOutlinedIcon />} iconPosition="start" label={t("tab_qualification", "Qualification")} sx={dicTabSx} />
                <Tab value="familyDetails" icon={<GroupsOutlinedIcon />} iconPosition="start" label={t("tab_family_details", "Family Details")} sx={dicTabSx} />
              </Tabs>
            </Box>

            <Box
              sx={{
                p: "12px",
                flex: { md: "1 1 0" },
                height: { xs: "auto", md: 0 },
                minHeight: 0,
                overflowY: { xs: "visible", md: "auto" },
                scrollbarGutter: "stable"
              }}
            >
              {strActiveTab === "basicInfo" ? (
                <Stack spacing={2.1}>
                  <Paper variant="outlined" sx={dicReadOnlyCardSx}>
                    <Box sx={{ px: 1.5 }}>
                    <DetailRow strLabel={t("field_employee_code", "Employee Code")} strValue={valueOrNotAvailable(objEmployee?.strEmployeeCode)} />
                    <DetailRow strLabel={t("field_title", "Title")} strValue={valueOrNotAvailable(objEmployee?.strTitle)} />
                    <DetailRow strLabel={t("field_first_name", "First Name")} strValue={valueOrNotAvailable(objEmployee?.strFirstName)} />
                    <DetailRow strLabel={t("field_middle_name", "Middle Name")} strValue={valueOrNotAvailable(objEmployee?.strMiddleName)} />
                    <DetailRow strLabel={t("field_last_name", "Last Name")} strValue={valueOrNotAvailable(objEmployee?.strLastName)} />
                    <DetailRow strLabel={t("field_full_name", "Full Name")} strValue={strFullName} />
                    <DetailRow strLabel={t("field_date_of_birth", "Date of Birth")} strValue={formatDate(objEmployee?.dtDateOfBirth ?? null, strNotAvailable)} />
                    <DetailRow strLabel={t("field_gender", "Gender")} strValue={translateKnownValue(objEmployee?.strGender)} />
                    <DetailRow strLabel={t("field_worker_category", "Worker Category")} strValue={objEmployee?.blnIsWorker ? t("worker", "Worker") : t("non_worker", "Non-Worker")} />
                    <DetailRow strLabel={t("field_date_of_joining", "Date of Joining")} strValue={formatDate(objEmployee?.dtDateOfJoining ?? null, strNotAvailable)} />
                    <DetailRow strLabel={t("field_employment_type", "Employment Type")} strValue={translateKnownValue(resolveLookupLabel(objFormOptions?.lstEmploymentTypes, objEmployee?.intEmploymentTypeID ?? null, strNotAvailable))} />
                    <DetailRow strLabel={t("field_department", "Department")} strValue={strDepartment} />
                    <DetailRow strLabel={t("field_designation", "Designation")} strValue={strDesignation} />
                    <DetailRow strLabel={t("field_grade", "Grade")} strValue={resolveLookupLabel(objFormOptions?.lstGrades, objEmployee?.intGradeID ?? null, strNotAvailable)} />
                    <DetailRow strLabel={t("field_cost_center", "Cost Center")} strValue={resolveLookupLabel(objFormOptions?.lstCostCenters, objEmployee?.intCostCenterID ?? null, strNotAvailable)} />
                    <DetailRow strLabel={t("field_location", "Location")} strValue={strLocation} />
                    <DetailRow strLabel={t("field_payroll_group", "Payroll Group")} strValue={strPayrollGroup} />
                    <DetailRow strLabel={t("field_manager", "Manager")} strValue={strManager} />
                    <DetailRow strLabel={t("field_line_manager", "Line Manager")} strValue={strLineManager} />
                    <DetailRow strLabel={t("field_preferred_language", "Preferred Language")} strValue={strPreferredLanguage} />
                    <DetailRow strLabel={t("field_employment_status", "Employment Status")} strValue={translateKnownValue(objEmployee?.strEmploymentStatus)} />
                    <DetailRow strLabel={t("field_date_of_exit", "Date of Exit")} strValue={formatDate(objEmployee?.dtDateOfExit ?? null, strNotAvailable)} />
                    <DetailRow strLabel={t("field_ess_enabled", "ESS Enabled")} strValue={objEmployee?.blnIsEssEnabled ? t("yes", "Yes") : t("no", "No")} />
                    </Box>
                  </Paper>
                </Stack>
              ) : null}

              {strActiveTab === "contactDetails" ? (
                <Paper variant="outlined" sx={dicReadOnlyCardSx}>
                  <Box sx={{ px: 1.5 }}>
                  <DetailRow strLabel={t("field_work_email", "Work Email")} strValue={valueOrNotAvailable(objEmployee?.strWorkEmail)} />
                  <DetailRow strLabel={t("field_personal_email", "Personal Email")} strValue={valueOrNotAvailable(objEmployee?.strPersonalEmail)} />
                  <DetailRow strLabel={t("field_mobile_number", "Mobile Number")} strValue={valueOrNotAvailable(objEmployee?.strMobileNumber)} />
                  <DetailRow strLabel={t("field_address_type", "Address Type")} strValue={translateKnownValue(objAddress?.strAddressType)} />
                  <DetailRow strLabel={t("field_address_line_1", "Address Line 1")} strValue={valueOrNotAvailable(objAddress?.strAddressLine1)} />
                  <DetailRow strLabel={t("field_address_line_2", "Address Line 2")} strValue={valueOrNotAvailable(objAddress?.strAddressLine2)} />
                  <DetailRow strLabel={t("field_city", "City")} strValue={valueOrNotAvailable(objAddress?.strCityName)} />
                  <DetailRow strLabel={t("field_state", "State")} strValue={resolveLookupLabel(objFormOptions?.lstStates, objAddress?.intStateID ?? null, strNotAvailable)} />
                  <DetailRow strLabel={t("field_postal_code", "Postal Code")} strValue={valueOrNotAvailable(objAddress?.strPostalCode)} />
                  <DetailRow strLabel={t("field_country", "Country")} strValue={resolveLookupLabel(objFormOptions?.lstCountries, objAddress?.intCountryID ?? null, strNotAvailable)} />
                  </Box>
                </Paper>
              ) : null}

              {strActiveTab === "experience" ? (
                <Stack spacing={1.5}>
                  {lstExperiences.length ? lstExperiences.map((objExperience) => (
                    <ReadOnlyCard
                      key={objExperience.intID}
                      lstRows={[
                        { strLabel: t("field_company_name", "Company Name"), strValue: valueOrNotAvailable(objExperience.strCompanyName) },
                        { strLabel: t("field_job_title", "Job Title"), strValue: valueOrNotAvailable(objExperience.strJobTitle) },
                        { strLabel: t("field_from_date", "From Date"), strValue: formatDate(objExperience.dtFromDate, strNotAvailable) },
                        { strLabel: t("field_to_date", "To Date"), strValue: formatDate(objExperience.dtToDate, strNotAvailable) },
                        { strLabel: t("field_total_years", "Total Years"), strValue: objExperience.decTotalYears?.toString() ?? strNotAvailable },
                        { strLabel: t("field_last_drawn_salary", "Last Drawn Salary"), strValue: objExperience.decLastDrawnSalary?.toString() ?? strNotAvailable },
                        { strLabel: t("field_reason_for_leaving", "Reason for Leaving"), strValue: valueOrNotAvailable(objExperience.strReasonForLeaving) },
                        { strLabel: t("field_responsibilities", "Responsibilities"), strValue: valueOrNotAvailable(objExperience.strResponsibilities) },
                        { strLabel: t("field_active", "Active"), strValue: objExperience.blnIsActive ? t("yes", "Yes") : t("no", "No") }
                      ]}
                    />
                  )) : <Typography sx={{ py: 3, textAlign: "center", color: "#667085", typography: "body2" }}>{t("no_experience", "No experience details available.")}</Typography>}
                </Stack>
              ) : null}

              {strActiveTab === "qualification" ? (
                <Stack spacing={1.5}>
                  {lstQualifications.length ? lstQualifications.map((objQualification) => (
                    <ReadOnlyCard
                      key={objQualification.intID}
                      lstRows={[
                        { strLabel: t("field_degree_name", "Degree Name"), strValue: valueOrNotAvailable(objQualification.strDegreeName) },
                        { strLabel: t("field_specialization", "Specialization"), strValue: valueOrNotAvailable(objQualification.strSpecialization) },
                        { strLabel: t("field_institution_name", "Institution Name"), strValue: valueOrNotAvailable(objQualification.strInstitutionName) },
                        { strLabel: t("field_university_name", "University Name"), strValue: valueOrNotAvailable(objQualification.strUniversityName) },
                        { strLabel: t("field_year_of_passing", "Year of Passing"), strValue: objQualification.intYearOfPassing.toString() },
                        { strLabel: t("field_grade_or_percentage", "Grade / Percentage"), strValue: valueOrNotAvailable(objQualification.strGradeOrPercentage) },
                        { strLabel: t("field_certification_number", "Certification Number"), strValue: valueOrNotAvailable(objQualification.strCertificationNumber) },
                        { strLabel: t("field_highest_qualification", "Highest Qualification"), strValue: objQualification.blnIsHighestQualification ? t("yes", "Yes") : t("no", "No") },
                        { strLabel: t("field_active", "Active"), strValue: objQualification.blnIsActive ? t("yes", "Yes") : t("no", "No") }
                      ]}
                    />
                  )) : <Typography sx={{ py: 3, textAlign: "center", color: "#667085", typography: "body2" }}>{t("no_qualification", "No qualification details available.")}</Typography>}
                </Stack>
              ) : null}

              {strActiveTab === "familyDetails" ? (
                <Stack spacing={1.5}>
                  {lstFamily.length ? lstFamily.map((objMember) => (
                    <ReadOnlyCard
                      key={objMember.intID}
                      lstRows={[
                        { strLabel: t("field_name", "Name"), strValue: valueOrNotAvailable(objMember.strName) },
                        { strLabel: t("field_relationship", "Relationship"), strValue: valueOrNotAvailable(objMember.strRelationship) },
                        { strLabel: t("field_date_of_birth", "Date of Birth"), strValue: formatDate(objMember.dtDateOfBirth, strNotAvailable) },
                        { strLabel: t("field_gender", "Gender"), strValue: translateKnownValue(objMember.strGender) },
                        { strLabel: t("field_contact_number", "Contact Number"), strValue: valueOrNotAvailable(objMember.strContactNumber) },
                        { strLabel: t("field_occupation", "Occupation"), strValue: valueOrNotAvailable(objMember.strOccupation) },
                        { strLabel: t("field_dependent", "Dependent"), strValue: objMember.blnIsDependent ? t("yes", "Yes") : t("no", "No") },
                        { strLabel: t("field_nominee", "Nominee"), strValue: objMember.blnIsNominee ? t("yes", "Yes") : t("no", "No") },
                        { strLabel: t("field_nominee_percentage", "Nominee Percentage"), strValue: objMember.decNomineePercentage?.toString() ?? strNotAvailable },
                        { strLabel: t("field_address", "Address"), strValue: valueOrNotAvailable(objMember.strAddress) }
                      ]}
                    />
                  )) : <Typography sx={{ py: 3, textAlign: "center", color: "#667085", typography: "body2" }}>{t("no_family_details", "No family details available.")}</Typography>}
                </Stack>
              ) : null}
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
