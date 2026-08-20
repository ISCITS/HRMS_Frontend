"use client";

import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography
} from "@mui/material";
import { useRouter } from "next/navigation";
import { ChangeEvent, type ReactElement, useEffect, useState } from "react";

import { employeeService } from "@/features/employee/services/employeeService";
import type { EmployeeAddressRecord, EmployeeDetailRecord, EmployeeFamilyDetailRecord, EmployeeFormOptions, EmployeeStatutoryRecord } from "@/features/employee/types";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useAuthenticatedAvatar } from "@/hooks/useAuthenticatedAvatar";
import { fileUploadService, type FileMetadataDto } from "@/lib/fileUploadService";
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
        <Typography sx={{ color: "#667085", fontSize: "0.7rem", fontWeight: 600 }}>{strLabel}</Typography>
      </Grid>
      <Grid item xs={7} sm={7.5}>
        <Typography sx={{ color: "#172033", fontSize: "0.74rem", fontWeight: 600, overflowWrap: "anywhere" }}>{strValue}</Typography>
      </Grid>
    </Grid>
  );
}

function SidebarLine({ objIcon, strValue }: { objIcon: ReactElement; strValue: string }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Box sx={{ color: "#667085", display: "flex", "& svg": { fontSize: 15 } }}>{objIcon}</Box>
      <Typography sx={{ color: "#344054", fontSize: "0.7rem", overflowWrap: "anywhere", minWidth: 0 }}>{strValue}</Typography>
    </Stack>
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
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(["MY_PROFILE"]);
  const [intEmployeeID, setIntEmployeeID] = useState<number | null>(null);
  const [objUserContext, setObjUserContext] = useState<CurrentUserContext | null>(null);
  const [objEmployee, setObjEmployee] = useState<EmployeeDetailRecord | null>(null);
  const [objFormOptions, setObjFormOptions] = useState<EmployeeFormOptions | null>(null);
  const [objAddress, setObjAddress] = useState<EmployeeAddressRecord | null>(null);
  const [objStatutory, setObjStatutory] = useState<EmployeeStatutoryRecord | null>(null);
  const [lstFamily, setLstFamily] = useState<EmployeeFamilyDetailRecord[]>([]);
  const [lstDocuments, setLstDocuments] = useState<FileMetadataDto[]>([]);
  const [strActiveTab, setStrActiveTab] = useState("personal");
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
            employeeService.getEmployeeStatutory(intCurrentEmployeeID),
            employeeService.getEmployeeFamilyDetails(intCurrentEmployeeID),
            fileUploadService.listFiles({ strModule: "PROFILE" })
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
        if (lstProfileDetails[2].status === "fulfilled") {
          setLstFamily(lstProfileDetails[2].value);
        }
        if (lstProfileDetails[3].status === "fulfilled") {
          setLstDocuments(lstProfileDetails[3].value);
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
  const objEmergencyContact = lstFamily.find((objMember) => Boolean(objMember.strContactNumber)) ?? null;
  const lstCompletionValues = [
    objEmployee?.strFirstName,
    objEmployee?.strLastName,
    objEmployee?.dtDateOfBirth,
    objEmployee?.strGender,
    objEmployee?.strMobileNumber,
    objEmployee?.strPersonalEmail,
    objEmployee?.strWorkEmail,
    objEmployee?.dtDateOfJoining,
    objEmployee?.intEmploymentTypeID,
    objEmployee?.intDepartmentID,
    objEmployee?.intDesignationID,
    objEmployee?.intLocationID,
    objAddress?.strAddressLine1,
    objAddress?.strCityName,
    objAddress?.intCountryID,
    objStatutory?.strPanNumber,
    objStatutory?.strUanNumber
  ];
  const intProfileCompletion = Math.round((lstCompletionValues.filter(Boolean).length / lstCompletionValues.length) * 100);

  const dicTabSx = {
    minHeight: 48,
    minWidth: { xs: 105, sm: 115 },
    px: 1.2,
    textTransform: "none",
    color: "#475467",
    fontSize: "0.7rem",
    fontWeight: 600,
    "&.Mui-selected": { color: "#1769e0" },
    "& .MuiTab-iconWrapper": { mr: 0.7, mb: "0 !important" },
    "& svg": { fontSize: 17 }
  } as const;

  return (
    <Box>
      {strRightsError ? <Typography sx={{ mb: 1, color: "#b45309", fontSize: "0.78rem" }}>{strRightsError}</Typography> : null}
      {strError ? <Alert severity="error" sx={{ mb: 1.5, borderRadius: "8px" }} onClose={() => setStrError("")}>{strError}</Alert> : null}

      <Grid container spacing={1.5} alignItems="stretch">
        <Grid item xs={12} md={3} lg={2.6}>
          <Paper elevation={0} sx={{ height: "100%", p: 1.6, border: "1px solid #e1e7ef", borderRadius: "9px", boxShadow: "0 4px 15px rgba(15,23,42,0.05)" }}>
            <Stack alignItems="center" sx={{ pt: 0.6 }}>
              <Avatar src={strAuthenticatedAvatarUrl || undefined} sx={{ width: 92, height: 92, bgcolor: "#e8eef8", color: "#334155", fontWeight: 800, fontSize: "1.5rem" }}>{strInitial}</Avatar>
              <Typography sx={{ mt: 1, color: "#172033", fontWeight: 800, fontSize: "1rem", textAlign: "center" }}>{strTitleName}</Typography>
              <Typography sx={{ color: "#667085", fontSize: "0.68rem", fontWeight: 600 }}>{valueOrNotAvailable(objEmployee?.strEmployeeCode)}</Typography>
              <Chip size="small" label={translateKnownValue(objEmployee?.strEmploymentStatus)} sx={{ mt: 0.8, height: 21, bgcolor: "#ecfdf3", color: "#15803d", "& .MuiChip-label": { px: 0.9, fontSize: "0.65rem", fontWeight: 700 } }} />
            </Stack>

            <Divider sx={{ my: 1.35 }} />
            <Stack spacing={1.15}>
              <SidebarLine objIcon={<WorkOutlineRoundedIcon />} strValue={strManager} />
              <SidebarLine objIcon={<ApartmentOutlinedIcon />} strValue={strDepartment} />
              <SidebarLine objIcon={<LocationOnOutlinedIcon />} strValue={strLocation} />
              <SidebarLine objIcon={<EmailOutlinedIcon />} strValue={valueOrNotAvailable(objEmployee?.strWorkEmail)} />
              <SidebarLine objIcon={<PhoneOutlinedIcon />} strValue={valueOrNotAvailable(objEmployee?.strMobileNumber)} />
            </Stack>

            <Divider sx={{ my: 1.35 }} />
            <Stack spacing={0.8}>
              <Button component="label" variant="outlined" fullWidth startIcon={blnAvatarUpdating ? <CircularProgress size={13} /> : <PhotoCameraRoundedIcon />} disabled={blnAvatarUpdating || !blnCanEditProfile} sx={{ minHeight: 31, borderRadius: "4px", textTransform: "none", fontWeight: 700, fontSize: "0.68rem" }}>
                {t("change_photo", "Change Photo")}
                <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} />
              </Button>
              {blnCanEditProfile ? (
                <Button controlId="ess.my-profile.edit.button" variant="contained" fullWidth startIcon={<EditRoundedIcon />} onClick={() => objRouter.push(`/ess/my-profile/edit/${intEmployeeID}`)} sx={{ minHeight: 31, borderRadius: "4px", textTransform: "none", fontWeight: 700, fontSize: "0.68rem", boxShadow: "none" }}>
                  {t("edit_profile", "Edit Profile")}
                </Button>
              ) : null}
              {strAvatarUrl && blnCanEditProfile ? (
                <Button size="small" color="inherit" startIcon={<DeleteOutlineRoundedIcon />} onClick={handleAvatarDelete} disabled={blnAvatarUpdating} sx={{ textTransform: "none", color: "#667085", fontSize: "0.63rem" }}>{t("remove_photo", "Remove photo")}</Button>
              ) : null}
            </Stack>

            {/* <Divider sx={{ my: 1.35 }} />
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.65 }}>
              <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "#344054" }}>{t("profile_completion", "Profile Completion")}</Typography>
              <Typography sx={{ fontSize: "0.68rem", fontWeight: 800, color: "#344054" }}>{intProfileCompletion}%</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={intProfileCompletion} sx={{ height: 6, borderRadius: 4, bgcolor: "#e7ebf1", "& .MuiLinearProgress-bar": { borderRadius: 4, bgcolor: "#1769e0" } }} />
           */}
          
          </Paper>
        </Grid>

        <Grid item xs={12} md={9} lg={9.4}>
          <Paper elevation={0} sx={{ minHeight: { md: 560 }, border: "1px solid #e1e7ef", borderRadius: "9px", boxShadow: "0 4px 15px rgba(15,23,42,0.05)", overflow: "hidden" }}>
            <Box sx={{ px: { xs: 0.5, sm: 1.5 }, overflowX: "auto" }}>
              <Tabs value={strActiveTab} onChange={(_objEvent, strValue: string) => setStrActiveTab(strValue)} variant="scrollable" scrollButtons={false} sx={{ minHeight: 49, borderBottom: "1px solid #e7ebf1", "& .MuiTabs-indicator": { height: 2, bgcolor: "#1769e0" } }}>
                <Tab value="personal" icon={<PersonRoundedIcon />} iconPosition="start" label={t("tab_personal", "Personal Information")} sx={dicTabSx} />
                <Tab value="employment" icon={<BadgeRoundedIcon />} iconPosition="start" label={t("tab_employment", "Employment Information")} sx={dicTabSx} />
                <Tab value="address" icon={<LocationOnOutlinedIcon />} iconPosition="start" label={t("tab_address", "Address")} sx={dicTabSx} />
                <Tab value="statutory" icon={<ShieldOutlinedIcon />} iconPosition="start" label={t("tab_statutory", "Statutory")} sx={dicTabSx} />
                {/* <Tab value="documents" icon={<DescriptionOutlinedIcon />} iconPosition="start" label={t("tab_documents", "Documents")} sx={dicTabSx} /> */}
              </Tabs>
            </Box>

            <Box sx={{ p: { xs: 1.5, sm: 2.2 } }}>
              {strActiveTab === "personal" ? (
                <Stack spacing={2.1}>
                  <Box>
                    <Typography sx={{ color: "#172033", fontSize: "0.85rem", fontWeight: 800, mb: 0.75 }}>{t("section_personal_information", "Personal Information")}</Typography>
                    <DetailRow strLabel={t("field_full_name", "Full Name")} strValue={strFullName} />
                    <DetailRow strLabel={t("field_date_of_birth", "Date of Birth")} strValue={formatDate(objEmployee?.dtDateOfBirth ?? null, strNotAvailable)} />
                    <DetailRow strLabel={t("field_gender", "Gender")} strValue={translateKnownValue(objEmployee?.strGender)} />
                    <DetailRow strLabel={t("field_mobile_number", "Mobile Number")} strValue={valueOrNotAvailable(objEmployee?.strMobileNumber)} />
                    <DetailRow strLabel={t("field_personal_email", "Personal Email")} strValue={valueOrNotAvailable(objEmployee?.strPersonalEmail)} />
                    <DetailRow strLabel={t("field_work_email", "Work Email")} strValue={valueOrNotAvailable(objEmployee?.strWorkEmail)} />
                  </Box>
                </Stack>
              ) : null}

              {strActiveTab === "employment" ? <Box><Typography sx={{ color: "#172033", fontSize: "0.85rem", fontWeight: 800, mb: 0.75 }}>{t("section_employment_information", "Employment Information")}</Typography><DetailRow strLabel={t("field_employee_code", "Employee Code")} strValue={valueOrNotAvailable(objEmployee?.strEmployeeCode)} /><DetailRow strLabel={t("field_date_of_joining", "Date of Joining")} strValue={formatDate(objEmployee?.dtDateOfJoining ?? null, strNotAvailable)} /><DetailRow strLabel={t("field_employment_type", "Employment Type")} strValue={translateKnownValue(resolveLookupLabel(objFormOptions?.lstEmploymentTypes, objEmployee?.intEmploymentTypeID ?? null, strNotAvailable))} /><DetailRow strLabel={t("field_department", "Department")} strValue={strDepartment} /><DetailRow strLabel={t("field_designation", "Designation")} strValue={strDesignation} /><DetailRow strLabel={t("field_grade", "Grade")} strValue={resolveLookupLabel(objFormOptions?.lstGrades, objEmployee?.intGradeID ?? null, strNotAvailable)} /><DetailRow strLabel={t("field_location", "Location")} strValue={strLocation} /><DetailRow strLabel={t("field_cost_center", "Cost Center")} strValue={resolveLookupLabel(objFormOptions?.lstCostCenters, objEmployee?.intCostCenterID ?? null, strNotAvailable)} /><DetailRow strLabel={t("field_manager", "Manager")} strValue={strManager} /><DetailRow strLabel={t("field_date_of_exit", "Date of Exit")} strValue={formatDate(objEmployee?.dtDateOfExit ?? null, strNotAvailable)} /></Box> : null}

              {strActiveTab === "address" ? <Box><Typography sx={{ color: "#172033", fontSize: "0.85rem", fontWeight: 800, mb: 0.75 }}>{t("section_address", "Address")}</Typography><DetailRow strLabel={t("field_address_type", "Address Type")} strValue={translateKnownValue(objAddress?.strAddressType)} /><DetailRow strLabel={t("field_address_line_1", "Address Line 1")} strValue={valueOrNotAvailable(objAddress?.strAddressLine1)} /><DetailRow strLabel={t("field_address_line_2", "Address Line 2")} strValue={valueOrNotAvailable(objAddress?.strAddressLine2)} /><DetailRow strLabel={t("field_city", "City")} strValue={valueOrNotAvailable(objAddress?.strCityName)} /><DetailRow strLabel={t("field_state", "State")} strValue={resolveLookupLabel(objFormOptions?.lstStates, objAddress?.intStateID ?? null, strNotAvailable)} /><DetailRow strLabel={t("field_country", "Country")} strValue={resolveLookupLabel(objFormOptions?.lstCountries, objAddress?.intCountryID ?? null, strNotAvailable)} /><DetailRow strLabel={t("field_postal_code", "Postal Code")} strValue={valueOrNotAvailable(objAddress?.strPostalCode)} /></Box> : null}

              {strActiveTab === "statutory" ? <Box><Typography sx={{ color: "#172033", fontSize: "0.85rem", fontWeight: 800, mb: 0.75 }}>{t("section_statutory", "Statutory Information")}</Typography><DetailRow strLabel={t("field_pan", "PAN")} strValue={valueOrNotAvailable(objStatutory?.strPanNumber)} /><DetailRow strLabel={t("field_uan", "UAN")} strValue={valueOrNotAvailable(objStatutory?.strUanNumber)} /><DetailRow strLabel={t("field_esi_number", "ESI Number")} strValue={valueOrNotAvailable(objStatutory?.strEsiNumber)} /><DetailRow strLabel={t("field_pf_number", "PF Number")} strValue={valueOrNotAvailable(objStatutory?.strPfNumber)} /><DetailRow strLabel={t("field_tax_regime", "Tax Regime")} strValue={translateKnownValue(objStatutory?.strTaxRegimeCode)} /><DetailRow strLabel={t("field_pf_applicable", "PF Applicable")} strValue={objStatutory?.blnPfApplicable ? t("yes", "Yes") : t("no", "No")} /><DetailRow strLabel={t("field_esi_applicable", "ESI Applicable")} strValue={objStatutory?.blnEsiApplicable ? t("yes", "Yes") : t("no", "No")} /></Box> : null}

              {/* {strActiveTab === "documents" ? (
                <Box>
                  <Typography sx={{ color: "#172033", fontSize: "0.85rem", fontWeight: 800, mb: 1 }}>{t("section_documents", "Documents")}</Typography>
                  {lstDocuments.length ? <Stack>{lstDocuments.map((objDocument) => <Stack key={objDocument.intFileID} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 1, borderBottom: "1px solid #e9edf3" }}><Box sx={{ minWidth: 0 }}><Typography sx={{ fontSize: "0.74rem", fontWeight: 700, color: "#344054", overflowWrap: "anywhere" }}>{objDocument.strDocumentType || objDocument.strOriginalFileName}</Typography><Typography sx={{ mt: 0.2, fontSize: "0.64rem", color: "#667085" }}>{objDocument.strOriginalFileName}</Typography></Box><IconButton size="small" aria-label={t("view_document", "View document")} onClick={() => fileUploadService.previewFile(objDocument.intFileID).catch(() => setStrError(t("error_preview_document", "Unable to open the document.")))}><VisibilityOutlinedIcon sx={{ fontSize: 18, color: "#1769e0" }} /></IconButton></Stack>)}</Stack> : <Typography sx={{ py: 3, textAlign: "center", color: "#667085", fontSize: "0.74rem" }}>{t("no_documents", "No documents available.")}</Typography>}
                </Box>
              ) : null} */}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
