"use client";

// import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
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

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import { employeeService } from "@/features/employee/services/employeeService";
import type { EmployeeAddressRecord, EmployeeBankRecord, EmployeeDetailRecord, EmployeeExperienceRecord, EmployeeFamilyDetailRecord, EmployeeFormOptions, EmployeeQualificationRecord, EmployeeStatutoryRecord } from "@/features/employee/types";
import EmployeeSalarySummaryCard from "@/features/employee-salary/components/EmployeeSalarySummaryCard";
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

function CardHeading({ objIcon, strText }: { objIcon: ReactElement; strText: string }) {
  return (
    <Stack direction="row" spacing={0.8} alignItems="center">
      <Box sx={{ color: "var(--app-primary-color)", display: "flex", "& svg": { fontSize: 20 } }}>{objIcon}</Box>
      <Typography sx={{ color: "#172033", fontWeight: 700 }}>{strText}</Typography>
    </Stack>
  );
}

function SectionHeading({ strText }: { strText: string }) {
  return <Typography sx={{ color: "#344054", fontWeight: 700, mb: 0.75 }}>{strText}</Typography>;
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
  const [objBank, setObjBank] = useState<EmployeeBankRecord | null>(null);
  const [objStatutory, setObjStatutory] = useState<EmployeeStatutoryRecord | null>(null);
  const [lstExperiences, setLstExperiences] = useState<EmployeeExperienceRecord[]>([]);
  const [lstQualifications, setLstQualifications] = useState<EmployeeQualificationRecord[]>([]);
  const [lstFamily, setLstFamily] = useState<EmployeeFamilyDetailRecord[]>([]);
  const [strActiveTab, setStrActiveTab] = useState("basicInfo");
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnAvatarUpdating, setBlnAvatarUpdating] = useState(false);
  const [blnAvatarDeleteConfirmOpen, setBlnAvatarDeleteConfirmOpen] = useState(false);
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
            employeeService.getEmployeeFamilyDetails(intCurrentEmployeeID),
            employeeService.getEmployeeBankAccount(intCurrentEmployeeID),
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
          setLstExperiences(lstProfileDetails[1].value);
        }
        if (lstProfileDetails[2].status === "fulfilled") {
          setLstQualifications(lstProfileDetails[2].value);
        }
        if (lstProfileDetails[3].status === "fulfilled") {
          setLstFamily(lstProfileDetails[3].value);
        }
        if (lstProfileDetails[4].status === "fulfilled") {
          setObjBank(lstProfileDetails[4].value);
        }
        if (lstProfileDetails[5].status === "fulfilled") {
          setObjStatutory(lstProfileDetails[5].value);
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
      setBlnAvatarDeleteConfirmOpen(false);
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
      setBlnAvatarDeleteConfirmOpen(false);
    }
  }

  const strManager = resolveLookupLabel(objFormOptions?.lstManagers, objEmployee?.intManagerEmployeeID ?? null, strNotAvailable);
  const strLocation = resolveLookupLabel(objFormOptions?.lstLocations, objEmployee?.intLocationID ?? null, strNotAvailable);
  const strDepartment = resolveLookupLabel(objFormOptions?.lstDepartments, objEmployee?.intDepartmentID ?? null, strNotAvailable);
  const strDesignation = resolveLookupLabel(objFormOptions?.lstDesignations, objEmployee?.intDesignationID ?? null, strNotAvailable);
  const strLineManager = resolveLookupLabel(objFormOptions?.lstManagers, objEmployee?.intLineManagerEmployeeID ?? null, strNotAvailable);
  const strPayrollGroup = resolveLookupLabel(objFormOptions?.lstPayrollGroups, objEmployee?.intPayrollGroupID ?? null, strNotAvailable);
  const strPreferredLanguage = resolveLookupLabel(objFormOptions?.lstLanguages, objEmployee?.intPreferredLanguageID ?? null, strNotAvailable);
  const strNationality = resolveLookupLabel(objFormOptions?.lstNationalities, objEmployee?.intNationalityCountryID ?? null, strNotAvailable);
  const strMotherTongue = resolveLookupLabel(objFormOptions?.lstMotherTongues, objEmployee?.intMotherTongueLanguageID ?? null, strNotAvailable);
  const strRelatedEmployee = resolveLookupLabel(objFormOptions?.lstManagers, objEmployee?.intRelatedEmployeeID ?? null, strNotAvailable);
  const yesNoOrNotAvailable = (blnValue: boolean | null | undefined) => blnValue == null ? strNotAvailable : (blnValue ? t("yes", "Yes") : t("no", "No"));
  const numberOrNotAvailable = (objValue: number | null | undefined) => objValue == null ? strNotAvailable : String(objValue);
  const dicTabSx = {
    minHeight: 48,
    minWidth: { xs: 105, sm: 115 },
    px: 1.2,
    color: "#475467",
    typography: "button",
    textTransform: "none",
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
          <Paper elevation={0} sx={{ width: "100%", height: "100%", p: 1.6, border: "1px solid #e1e7ef", borderRadius: "9px", boxShadow: "0 4px 15px rgba(15,23,42,0.05)", overflowY: "auto", scrollbarGutter: "stable" }}>
            <Stack alignItems="center" sx={{ pt: 0.6 }}>
              <Avatar src={strAuthenticatedAvatarUrl || undefined} sx={{ width: 92, height: 92, bgcolor: "#e8eef8", color: "#334155", fontWeight: 800, fontSize: "1.5rem" }}>{strInitial}</Avatar>
              <Typography sx={{ mt: 1, color: "#172033", typography: "h6", fontWeight: 800, textAlign: "center" }}>{strFullName}</Typography>
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
                <Button size="small" color="inherit" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => setBlnAvatarDeleteConfirmOpen(true)} disabled={blnAvatarUpdating} sx={{ textTransform: "none", color: "#667085" }}>{t("remove_photo", "Remove photo")}</Button>
              ) : null}
            </Stack>

            <Divider sx={{ my: 1.35 }} />
            <EmployeeSalarySummaryCard intEmployeeID={intEmployeeID} blnHideOpenPageButton blnCompact />

          </Paper>
        </Box>

        <Box sx={{ display: "flex", minHeight: 0, overflow: "hidden" }}>
          <Paper elevation={0} sx={{ width: "100%", height: { md: "100%" }, minHeight: 0, display: "flex", flexDirection: "column", border: "1px solid #e1e7ef", borderRadius: "9px", boxShadow: "0 4px 15px rgba(15,23,42,0.05)", overflow: "hidden" }}>
            <Box sx={{ px: { xs: 0.5, sm: 1.5 }, overflowX: "auto", flexShrink: 0 }}>
              <Tabs
                value={strActiveTab}
                onChange={(_objEvent, strValue: string) => setStrActiveTab(strValue)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  minHeight: 49,
                  borderBottom: "1px solid #e7ebf1",
                  "& .MuiTabs-indicator": { height: 2, bgcolor: "var(--app-primary-color)" },
                  "& .MuiTabs-scrollButtons": {
                    alignSelf: "center",
                    width: 36,
                    minWidth: 36,
                    height: 36,
                    mx: 0.5,
                    borderRadius: "10px",
                    bgcolor: "var(--app-primary-color)",
                    color: "#fff",
                    boxShadow: "0 5px 12px color-mix(in srgb, var(--app-primary-color) 28%, transparent)",
                    transition: "background-color 160ms ease, color 160ms ease, box-shadow 160ms ease",
                    "&:hover": { bgcolor: "var(--app-primary-color)", filter: "brightness(0.92)" },
                    "&.Mui-disabled": {
                      opacity: 1,
                      bgcolor: "#f8fafc",
                      color: "#cbd5e1",
                      border: "1px solid #e2e8f0",
                      boxShadow: "none"
                    },
                    "& svg": { fontSize: 27 }
                  }
                }}
              >
                <Tab value="basicInfo" icon={<WorkOutlineRoundedIcon />} iconPosition="start" label={t("tab_basic_info", "Employment Info")} sx={dicTabSx} />
                <Tab value="personalIdentification" icon={<PersonRoundedIcon />} iconPosition="start" label={t("tab_personal_identification", "Personal & Identification")} sx={dicTabSx} />
                <Tab value="serviceContract" icon={<WorkOutlineRoundedIcon />} iconPosition="start" label={t("tab_service_contract", "Service & Contract")} sx={dicTabSx} />
                <Tab value="additionalEmployment" icon={<ApartmentOutlinedIcon />} iconPosition="start" label={t("tab_additional_employment", "Additional Employment Details")} sx={dicTabSx} />
                <Tab value="address" icon={<PhoneOutlinedIcon />} iconPosition="start" label={t("tab_address", "Contact Details")} sx={dicTabSx} />
                <Tab value="bankDetails" icon={<AccountBalanceWalletOutlinedIcon />} iconPosition="start" label={t("tab_bank_details", "Bank Details")} sx={dicTabSx} />
                <Tab value="statutory" icon={<AccountBalanceOutlinedIcon />} iconPosition="start" label={t("tab_statutory", "Statutory")} sx={dicTabSx} />
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
                <ReadOnlyCard lstRows={[
                  { strLabel: t("field_date_of_joining", "Date of Joining"), strValue: formatDate(objEmployee?.dtDateOfJoining ?? null, strNotAvailable) },
                  { strLabel: t("field_employment_type", "Employment Type"), strValue: translateKnownValue(resolveLookupLabel(objFormOptions?.lstEmploymentTypes, objEmployee?.intEmploymentTypeID ?? null, strNotAvailable)) },
                  { strLabel: t("field_ess_enabled", "ESS Enabled"), strValue: yesNoOrNotAvailable(objEmployee?.blnIsEssEnabled) },
                  { strLabel: t("field_department", "Department"), strValue: strDepartment },
                  { strLabel: t("field_designation", "Designation"), strValue: strDesignation },
                  { strLabel: t("field_grade", "Grade"), strValue: resolveLookupLabel(objFormOptions?.lstGrades, objEmployee?.intGradeID ?? null, strNotAvailable) },
                  { strLabel: t("field_location", "Location"), strValue: strLocation },
                  { strLabel: t("field_cost_center", "Cost Center"), strValue: resolveLookupLabel(objFormOptions?.lstCostCenters, objEmployee?.intCostCenterID ?? null, strNotAvailable) },
                  { strLabel: t("field_payroll_group", "Payroll Group"), strValue: strPayrollGroup },
                  { strLabel: t("field_manager", "Manager"), strValue: strManager },
                  { strLabel: t("field_line_manager", "Line Manager"), strValue: strLineManager },
                  { strLabel: t("field_preferred_language", "Preferred Language"), strValue: strPreferredLanguage },
                  { strLabel: t("field_employee_function", "Employee Function"), strValue: valueOrNotAvailable(objEmployee?.strEmployeeFunction) },
                  { strLabel: t("field_functional_area", "Functional Area"), strValue: valueOrNotAvailable(objEmployee?.strFunctionalArea) },
                  { strLabel: t("field_employee_category", "Employee Category"), strValue: valueOrNotAvailable(objEmployee?.strEmployeeCategory) },
                  { strLabel: t("field_job_type", "Job Type"), strValue: valueOrNotAvailable(objEmployee?.strJobType) },
                  { strLabel: t("field_rest_day", "Rest Day"), strValue: valueOrNotAvailable(objEmployee?.strRestDay) },
                  { strLabel: t("field_payment_type", "Payment Type"), strValue: valueOrNotAvailable(objEmployee?.strPaymentType) }
                ]} />
              ) : null}

              {strActiveTab === "personalIdentification" ? (
                <ReadOnlyCard lstRows={[
                  { strLabel: t("field_employee_code", "Employee Code"), strValue: valueOrNotAvailable(objEmployee?.strEmployeeCode) },
                  { strLabel: t("field_title", "Title"), strValue: valueOrNotAvailable(objEmployee?.strTitle) },
                  { strLabel: t("field_name", "Name"), strValue: strFullName },
                  { strLabel: t("field_date_of_birth", "Date of Birth"), strValue: formatDate(objEmployee?.dtDateOfBirth ?? null, strNotAvailable) },
                  { strLabel: t("field_gender", "Gender"), strValue: translateKnownValue(objEmployee?.strGender) },
                  { strLabel: t("field_worker_category", "Worker Category"), strValue: objEmployee?.blnIsWorker ? t("worker", "Worker") : t("non_worker", "Non-Worker") },
                  { strLabel: t("field_nationality", "Nationality"), strValue: strNationality },
                  { strLabel: t("field_mother_tongue", "Mother Tongue"), strValue: strMotherTongue },
                  { strLabel: t("field_marital_status", "Marital Status"), strValue: valueOrNotAvailable(objEmployee?.strMaritalStatus) },
                  { strLabel: t("field_blood_group", "Blood Group"), strValue: valueOrNotAvailable(objEmployee?.strBloodGroup) },
                  { strLabel: t("field_religion", "Religion"), strValue: valueOrNotAvailable(objEmployee?.strReligion) },
                  { strLabel: t("field_place_of_birth", "Place of Birth"), strValue: valueOrNotAvailable(objEmployee?.strPlaceOfBirth) },
                  { strLabel: t("field_identification_marks", "Identification Marks"), strValue: valueOrNotAvailable(objEmployee?.strIdentificationMarks) },
                  { strLabel: t("field_father_husband_name", "Father / Husband Name"), strValue: valueOrNotAvailable(objEmployee?.strFatherOrHusbandName) },
                  { strLabel: t("field_mother_name", "Mother Name"), strValue: valueOrNotAvailable(objEmployee?.strMotherName) },
                  { strLabel: t("field_spouse_name", "Spouse Name"), strValue: valueOrNotAvailable(objEmployee?.strSpouseName) },
                  { strLabel: t("field_spouse_occupation", "Spouse Occupation"), strValue: valueOrNotAvailable(objEmployee?.strSpouseOccupation) },
                  { strLabel: t("field_passport_number", "Passport Number"), strValue: valueOrNotAvailable(objEmployee?.strPassportNumber) },
                  { strLabel: t("field_passport_place_of_issue", "Passport Place of Issue"), strValue: valueOrNotAvailable(objEmployee?.strPassportPlaceOfIssue) },
                  { strLabel: t("field_passport_issue_date", "Passport Issue Date"), strValue: formatDate(objEmployee?.dtPassportIssueDate ?? null, strNotAvailable) },
                  { strLabel: t("field_passport_expiry_date", "Passport Expiry Date"), strValue: formatDate(objEmployee?.dtPassportExpiryDate ?? null, strNotAvailable) },
                  { strLabel: t("field_driving_licence_number", "Driving Licence Number"), strValue: valueOrNotAvailable(objEmployee?.strDrivingLicenceNumber) },
                  { strLabel: t("field_driving_licence_valid_upto", "Driving Licence Valid Upto"), strValue: formatDate(objEmployee?.dtDrivingLicenceValidUpto ?? null, strNotAvailable) },
                  { strLabel: t("field_has_disability", "Has Disability"), strValue: yesNoOrNotAvailable(objEmployee?.blnHasDisability) },
                  { strLabel: t("field_superannuation", "Superannuation"), strValue: yesNoOrNotAvailable(objEmployee?.blnSuperannuationFlag) },
                  { strLabel: t("field_related_employee", "Related Employee"), strValue: objEmployee?.blnIsRelatedEmployee ? strRelatedEmployee : yesNoOrNotAvailable(objEmployee?.blnIsRelatedEmployee) }
                ]} />
              ) : null}

              {strActiveTab === "serviceContract" ? (
                <Stack spacing={1.5}>
                  <SectionHeading strText={t("section_appointment_joining", "Appointment & Joining")} />
                  <ReadOnlyCard lstRows={[
                    { strLabel: t("field_appointment_date", "Appointment Date"), strValue: formatDate(objEmployee?.dtAppointmentDate ?? null, strNotAvailable) },
                    { strLabel: t("field_appointment_order_number", "Appointment Order Number"), strValue: valueOrNotAvailable(objEmployee?.strAppointmentOrderNumber) },
                    { strLabel: t("field_location_joining_date", "Location Joining Date"), strValue: formatDate(objEmployee?.dtLocationJoiningDate ?? null, strNotAvailable) },
                    { strLabel: t("field_initial_posting_location", "Initial Posting Location"), strValue: valueOrNotAvailable(objEmployee?.strInitialPostingLocation) },
                    { strLabel: t("field_entry_mode", "Entry Mode"), strValue: valueOrNotAvailable(objEmployee?.strEntryMode) },
                    { strLabel: t("field_reference_number", "Reference Number"), strValue: valueOrNotAvailable(objEmployee?.strReferenceNumber) },
                    { strLabel: t("field_referred_by", "Referred By"), strValue: valueOrNotAvailable(objEmployee?.strReferredBy) },
                    { strLabel: t("field_agency", "Agency"), strValue: valueOrNotAvailable(objEmployee?.strAgency) }
                  ]} />
                  <SectionHeading strText={t("section_probation_confirmation", "Probation & Confirmation")} />
                  <ReadOnlyCard lstRows={[
                    { strLabel: t("field_probation_start_date", "Probation Start Date"), strValue: formatDate(objEmployee?.dtProbationStartDate ?? null, strNotAvailable) },
                    { strLabel: t("field_probation_end_date", "Probation End Date"), strValue: formatDate(objEmployee?.dtProbationEndDate ?? null, strNotAvailable) },
                    { strLabel: t("field_tentative_confirmation_date", "Tentative Confirmation Date"), strValue: formatDate(objEmployee?.dtTentativeConfirmationDate ?? null, strNotAvailable) },
                    { strLabel: t("field_confirmation_date", "Confirmation Date"), strValue: formatDate(objEmployee?.dtConfirmationDate ?? null, strNotAvailable) },
                    { strLabel: t("field_confirmation_type", "Confirmation Type"), strValue: valueOrNotAvailable(objEmployee?.strConfirmationType) },
                    { strLabel: t("field_confirmation_comments", "Confirmation Comments"), strValue: valueOrNotAvailable(objEmployee?.strConfirmationComments) },
                    { strLabel: t("field_last_increment_date", "Last Increment Date"), strValue: formatDate(objEmployee?.dtLastIncrementDate ?? null, strNotAvailable) },
                    { strLabel: t("field_status_effective_date", "Status Effective Date"), strValue: formatDate(objEmployee?.dtStatusEffectiveDate ?? null, strNotAvailable) }
                  ]} />
                  <SectionHeading strText={t("section_contract_service_period", "Contract / Service Period")} />
                  <ReadOnlyCard lstRows={[
                    { strLabel: t("field_contract_start_date", "Contract Start Date"), strValue: formatDate(objEmployee?.dtContractStartDate ?? null, strNotAvailable) },
                    { strLabel: t("field_contract_end_date", "Contract End Date"), strValue: formatDate(objEmployee?.dtContractEndDate ?? null, strNotAvailable) },
                    { strLabel: t("field_from_date", "From Date"), strValue: formatDate(objEmployee?.dtFromDate ?? null, strNotAvailable) },
                    { strLabel: t("field_to_date", "To Date"), strValue: formatDate(objEmployee?.dtToDate ?? null, strNotAvailable) },
                    { strLabel: t("field_notice_period_days", "Notice Period (Days)"), strValue: numberOrNotAvailable(objEmployee?.intNoticePeriodDays) },
                    { strLabel: t("field_retirement_date", "Retirement Date"), strValue: formatDate(objEmployee?.dtRetirementDate ?? null, strNotAvailable) },
                    { strLabel: t("field_date_of_exit", "Date of Exit"), strValue: formatDate(objEmployee?.dtDateOfExit ?? null, strNotAvailable) }
                  ]} />
                </Stack>
              ) : null}

              {strActiveTab === "additionalEmployment" ? (
                <ReadOnlyCard lstRows={[
                  { strLabel: t("field_employee_workgroup", "Employee Workgroup"), strValue: valueOrNotAvailable(objEmployee?.strEmployeeWorkgroup) },
                  { strLabel: t("field_employee_reservation", "Employee Reservation"), strValue: valueOrNotAvailable(objEmployee?.strEmployeeReservation) },
                  { strLabel: t("field_swon", "SWON"), strValue: valueOrNotAvailable(objEmployee?.strSwon) },
                  { strLabel: t("field_accommodation_type", "Accommodation Type"), strValue: valueOrNotAvailable(objEmployee?.strAccommodationType) },
                  { strLabel: t("field_housing_allowance", "Housing Allowance"), strValue: numberOrNotAvailable(objEmployee?.decHousingAllowance) },
                  { strLabel: t("field_flat_given", "Flat Given"), strValue: yesNoOrNotAvailable(objEmployee?.blnFlatGiven) },
                  { strLabel: t("field_prefix_logic", "Prefix Logic"), strValue: valueOrNotAvailable(objEmployee?.strPrefixLogic) },
                  { strLabel: t("field_ugc_appraisal", "UGC Appraisal"), strValue: yesNoOrNotAvailable(objEmployee?.blnUgcAppraisalFlag) },
                  { strLabel: t("field_employee_remark", "Employee Remark"), strValue: valueOrNotAvailable(objEmployee?.strEmployeeRemark) }
                ]} />
              ) : null}

              {strActiveTab === "address" ? (
                <Stack spacing={1.5}>
                  <SectionHeading strText={t("section_employee_contact", "Employee Contact")} />
                  <ReadOnlyCard lstRows={[
                    { strLabel: t("field_work_email", "Work Email"), strValue: valueOrNotAvailable(objEmployee?.strWorkEmail) },
                    { strLabel: t("field_personal_email", "Personal Email"), strValue: valueOrNotAvailable(objEmployee?.strPersonalEmail) },
                    { strLabel: t("field_mobile_country_code", "Mobile Country Code"), strValue: valueOrNotAvailable(objEmployee?.strMobileCountryCode) },
                    { strLabel: t("field_mobile_number", "Mobile Number"), strValue: valueOrNotAvailable(objEmployee?.strMobileNumber) },
                    { strLabel: t("field_whatsapp_country_code", "WhatsApp Country Code"), strValue: valueOrNotAvailable(objEmployee?.strWhatsappCountryCode) },
                    { strLabel: t("field_whatsapp_number", "WhatsApp Number"), strValue: valueOrNotAvailable(objEmployee?.strWhatsappNumber) }
                  ]} />
                  <SectionHeading strText={t("section_emergency_contact", "Emergency Contact")} />
                  <ReadOnlyCard lstRows={[
                    { strLabel: t("field_emergency_contact_person", "Emergency Contact Person"), strValue: valueOrNotAvailable(objEmployee?.strEmergencyContactPerson) },
                    { strLabel: t("field_emergency_country_code", "Emergency Country Code"), strValue: valueOrNotAvailable(objEmployee?.strEmergencyCountryCode) },
                    { strLabel: t("field_emergency_mobile_number", "Emergency Mobile Number"), strValue: valueOrNotAvailable(objEmployee?.strEmergencyMobileNumber) },
                    { strLabel: t("field_emergency_email", "Emergency Email"), strValue: valueOrNotAvailable(objEmployee?.strEmergencyEmail) }
                  ]} />
                  <SectionHeading strText={t("section_address", "Address")} />
                  <ReadOnlyCard lstRows={[
                    { strLabel: t("field_address_type", "Address Type"), strValue: translateKnownValue(objAddress?.strAddressType) },
                    { strLabel: t("field_address_line_1", "Address Line 1"), strValue: valueOrNotAvailable(objAddress?.strAddressLine1) },
                    { strLabel: t("field_address_line_2", "Address Line 2"), strValue: valueOrNotAvailable(objAddress?.strAddressLine2) },
                    { strLabel: t("field_city", "City"), strValue: valueOrNotAvailable(objAddress?.strCityName) },
                    { strLabel: t("field_state", "State"), strValue: resolveLookupLabel(objFormOptions?.lstStates, objAddress?.intStateID ?? null, strNotAvailable) },
                    { strLabel: t("field_country", "Country"), strValue: resolveLookupLabel(objFormOptions?.lstCountries, objAddress?.intCountryID ?? null, strNotAvailable) },
                    { strLabel: t("field_postal_code", "Postal Code"), strValue: valueOrNotAvailable(objAddress?.strPostalCode) }
                  ]} />
                </Stack>
              ) : null}

              {strActiveTab === "bankDetails" ? (
                <Stack spacing={1.5}>
                  <CardHeading objIcon={<AccountBalanceOutlinedIcon />} strText={t("primary_bank_details", "Primary Bank Details")} />
                  <ReadOnlyCard
                    lstRows={[
                      { strLabel: t("field_bank", "Bank"), strValue: resolveLookupLabel(objFormOptions?.lstBanks, objBank?.intBankID ?? null, strNotAvailable) },
                      { strLabel: t("field_branch_name", "Branch Name"), strValue: valueOrNotAvailable(objBank?.strBranchName) },
                      { strLabel: t("field_account_holder_name", "Account Holder Name"), strValue: valueOrNotAvailable(objBank?.strAccountHolderName) },
                      { strLabel: t("field_account_type", "Account Type"), strValue: valueOrNotAvailable(objBank?.strAccountType) },
                      { strLabel: t("field_account_number", "Account Number"), strValue: valueOrNotAvailable(objBank?.strAccountNumberMasked || objBank?.strAccountNumber) },
                      { strLabel: t("field_ifsc_code", "IFSC Code"), strValue: valueOrNotAvailable(objBank?.strIfscCode) },
                      { strLabel: t("field_swift_code", "SWIFT Code"), strValue: valueOrNotAvailable(objBank?.strSwiftCode) },
                      { strLabel: t("field_account_holder_email", "Account Holder Email"), strValue: valueOrNotAvailable(objBank?.strAccountHolderEmail) },
                      { strLabel: t("field_is_primary", "Primary Account"), strValue: objBank ? (objBank.blnIsPrimary ? t("yes", "Yes") : t("no", "No")) : strNotAvailable },
                      { strLabel: t("field_bank_active", "Active"), strValue: objBank ? (objBank.blnIsActive ? t("yes", "Yes") : t("no", "No")) : strNotAvailable }
                    ]}
                  />
                  <Box sx={{ pt: 0.5 }}>
                    <CardHeading objIcon={<AccountBalanceOutlinedIcon />} strText={t("field_secondary_bank_details", "Secondary Bank Details")} />
                  </Box>
                  <ReadOnlyCard
                    lstRows={[
                      { strLabel: t("field_secondary_bank_active", "Secondary Bank Active"), strValue: objBank ? (objBank.blnSecondaryIsActive ? t("yes", "Yes") : t("no", "No")) : strNotAvailable },
                      { strLabel: t("field_secondary_bank", "Secondary Bank"), strValue: resolveLookupLabel(objFormOptions?.lstBanks, objBank?.intSecondaryBankID ?? null, strNotAvailable) },
                      { strLabel: t("field_secondary_account_holder_name", "Secondary Account Holder Name"), strValue: valueOrNotAvailable(objBank?.strSecondaryAccountHolderName) },
                      { strLabel: t("field_secondary_account_number", "Secondary Account Number"), strValue: valueOrNotAvailable(objBank?.strSecondaryAccountNumberMasked || objBank?.strSecondaryAccountNumber) },
                      { strLabel: t("field_secondary_ifsc_code", "Secondary IFSC Code"), strValue: valueOrNotAvailable(objBank?.strSecondaryIfscCode) }
                    ]}
                  />
                </Stack>
              ) : null}

              {strActiveTab === "statutory" ? (
                <Paper variant="outlined" sx={dicReadOnlyCardSx}>
                  <Box sx={{ px: 1.5 }}>
                    <DetailRow strLabel={t("field_pan_number", "PAN Number")} strValue={valueOrNotAvailable(objStatutory?.strPanNumber)} />
                    <DetailRow strLabel={t("field_tax_regime", "Tax Regime")} strValue={translateKnownValue(objStatutory?.strTaxRegimeCode)} />
                    <DetailRow strLabel={t("field_ssn_number", "SSN Number")} strValue={valueOrNotAvailable(objStatutory?.strSsnNumber)} />
                    <DetailRow strLabel={t("field_pran_number", "PRAN Number")} strValue={valueOrNotAvailable(objStatutory?.strPranNumber)} />
                    <DetailRow strLabel={t("field_gratuity_number", "Gratuity Number")} strValue={valueOrNotAvailable(objStatutory?.strGratuityNumber)} />
                    <DetailRow strLabel={t("field_uan_number", "UAN Number")} strValue={valueOrNotAvailable(objStatutory?.strUanNumber)} />
                    <DetailRow strLabel={t("field_pf_applicable", "PF Applicable")} strValue={objStatutory ? (objStatutory.blnPfApplicable ? t("yes", "Yes") : t("no", "No")) : strNotAvailable} />
                    <DetailRow strLabel={t("field_pf_number", "PF Number")} strValue={valueOrNotAvailable(objStatutory?.strPfNumber)} />
                    <DetailRow strLabel={t("field_esi_applicable", "ESI Applicable")} strValue={objStatutory ? (objStatutory.blnEsiApplicable ? t("yes", "Yes") : t("no", "No")) : strNotAvailable} />
                    <DetailRow strLabel={t("field_esi_code", "ESI Code")} strValue={valueOrNotAvailable(objStatutory?.strEsiCode)} />
                    <DetailRow strLabel={t("field_esi_number", "ESI Number")} strValue={valueOrNotAvailable(objStatutory?.strEsiNumber)} />
                    <DetailRow strLabel={t("field_pt_applicable", "PT Applicable")} strValue={objStatutory ? (objStatutory.blnPtApplicable ? t("yes", "Yes") : t("no", "No")) : strNotAvailable} />
                  </Box>
                </Paper>
              ) : null}

              {strActiveTab === "experience" ? (
                <Stack spacing={1.5}>
                  {lstExperiences.length ? lstExperiences.map((objExperience) => (
                    <Stack key={objExperience.intID} spacing={1.5}>
                      <CardHeading objIcon={<WorkOutlineRoundedIcon />} strText={`${t("field_company", "Company")} - ${valueOrNotAvailable(objExperience.strCompanyName)}`} />
                      <ReadOnlyCard
                        lstRows={[
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
                    </Stack>
                  )) : <Typography sx={{ py: 3, textAlign: "center", color: "#667085", typography: "body2" }}>{t("no_experience", "No experience details available.")}</Typography>}
                </Stack>
              ) : null}

              {strActiveTab === "qualification" ? (
                <Stack spacing={1.5}>
                  {lstQualifications.length ? lstQualifications.map((objQualification) => (
                    <Stack key={objQualification.intID} spacing={1.5}>
                      <CardHeading objIcon={<SchoolOutlinedIcon />} strText={`${t("field_degree", "Degree")} - ${valueOrNotAvailable(objQualification.strDegreeName)}`} />
                      <ReadOnlyCard
                        lstRows={[
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
                    </Stack>
                  )) : <Typography sx={{ py: 3, textAlign: "center", color: "#667085", typography: "body2" }}>{t("no_qualification", "No qualification details available.")}</Typography>}
                </Stack>
              ) : null}

              {strActiveTab === "familyDetails" ? (
                <Stack spacing={1.5}>
                  {lstFamily.length ? lstFamily.map((objMember) => (
                    <Stack key={objMember.intID} spacing={1.5}>
                      <CardHeading objIcon={<GroupsOutlinedIcon />} strText={`${valueOrNotAvailable(objMember.strRelationship)} - ${valueOrNotAvailable(objMember.strName)}`} />
                      <ReadOnlyCard
                        lstRows={[
                          { strLabel: t("field_name", "Name"), strValue: valueOrNotAvailable(objMember.strName) },
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
                    </Stack>
                  )) : <Typography sx={{ py: 3, textAlign: "center", color: "#667085", typography: "body2" }}>{t("no_family_details", "No family details available.")}</Typography>}
                </Stack>
              ) : null}
            </Box>
          </Paper>
        </Box>
      </Box>

      <CommonConfirmDialog
        blnOpen={blnAvatarDeleteConfirmOpen}
        strTitle={t("confirm_remove_photo_title", "Remove profile photo?")}
        strMessage={t("confirm_remove_photo_message", "Are you sure you want to remove your profile photo?")}
        strCancelLabel={t("cancel", "Cancel")}
        strConfirmLabel={t("remove", "Remove")}
        blnCancelDisabled={blnAvatarUpdating}
        blnConfirmDisabled={blnAvatarUpdating}
        onClose={() => {
          if (!blnAvatarUpdating) {
            setBlnAvatarDeleteConfirmOpen(false);
          }
        }}
        onConfirm={() => void handleAvatarDelete()}
        rootControlId="ess.my-profile.remove-photo.confirm-dialog"
        cancelButtonControlId="ess.my-profile.remove-photo.cancel.button"
        confirmButtonControlId="ess.my-profile.remove-photo.confirm.button"
      />
    </Box>
  );
}
