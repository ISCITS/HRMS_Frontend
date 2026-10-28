"use client";

import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import HourglassEmptyRoundedIcon from "@mui/icons-material/HourglassEmptyRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import ContactEmergencyRoundedIcon from "@mui/icons-material/ContactEmergencyRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import AssignmentIndRoundedIcon from "@mui/icons-material/AssignmentIndRounded";
import BusinessCenterRoundedIcon from "@mui/icons-material/BusinessCenterRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import {
  Alert,
  Avatar,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
  useMediaQuery
} from "@mui/material";
import { ChangeEvent, type ReactElement, useEffect, useState } from "react";
import { DottedLoader } from "@/components/shared/BlockingLoader";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import { employeeService } from "@/features/employee/services/employeeService";
import type { EmployeeAddressRecord, EmployeeBankRecord, EmployeeDetailRecord, EmployeeExperienceRecord, EmployeeFamilyDetailRecord, EmployeeFormOptions, EmployeeQualificationRecord, EmployeeStatutoryRecord } from "@/features/employee/types";
import EmployeeSalarySummaryCard from "@/features/employee-salary/components/EmployeeSalarySummaryCard";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useAuthenticatedAvatar } from "@/hooks/useAuthenticatedAvatar";
import type { CurrentUserContext } from "@/models/AuthModels";
import { authApiService } from "@/services";
import "./my-profile.css";

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

type ProfileRow = { strLabel: string; strValue: string };

function DetailRow({ strLabel, strValue }: ProfileRow) {
  return <div className="my-profile-detail-row"><dt>{strLabel}</dt><dd>{strValue}</dd></div>;
}

function IdentityItem({ objIcon, strLabel, strValue }: { objIcon: ReactElement; strLabel: string; strValue: string }) {
  return <div className="my-profile-identity-item"><span>{objIcon}</span><div><strong>{strValue}</strong><span>{strLabel}</span></div></div>;
}

function ProfileBreadcrumbs({ strSection, strTitle }: { strSection: string; strTitle: string }) {
  return <Breadcrumbs className="app-breadcrumbs app-breadcrumbs-master my-profile-breadcrumbs" aria-label="breadcrumb" separator={<NavigateNextRoundedIcon />}>
    <Typography className="app-breadcrumb-label">{strSection}</Typography>
    <Typography component="h1" className="app-breadcrumb-heading" aria-current="page">{strTitle}</Typography>
  </Breadcrumbs>;
}

// Cards stay expanded on desktop and can be collapsed independently on mobile.
type ProfileIconTone = "blue" | "purple" | "green" | "orange" | "red";

function ReadOnlyCard({ strTitle, objIcon, strIconTone = "blue", lstRows }: {
  strTitle: string;
  objIcon: ReactElement;
  strIconTone?: ProfileIconTone;
  lstRows: ProfileRow[];
}) {
  const blnMobile = useMediaQuery("(max-width: 767px)");
  const [blnExpanded, setBlnExpanded] = useState(true);
  return <details className="my-profile-card" open={!blnMobile || blnExpanded}>
    <summary tabIndex={blnMobile ? 0 : -1} onClick={(event) => { event.preventDefault(); if (blnMobile) setBlnExpanded(!blnExpanded); }}>
      <span className="my-profile-card-title">
        <span className={`my-profile-card-icon my-profile-card-icon--${strIconTone}`} aria-hidden="true">{objIcon}</span>
        <span>{strTitle}</span>
      </span>
    </summary>
    <dl>{lstRows.map((objRow) => <DetailRow key={objRow.strLabel} {...objRow} />)}</dl>
  </details>;
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
      <Stack spacing={1.5} className="my-profile-state">
        <ProfileBreadcrumbs strSection={t("breadcrumb_ess", "ESS")} strTitle={t("page_title", "My Profile")} />
        <Box className="my-profile-loading">
          <Stack spacing={1.5} alignItems="center">
            <DottedLoader />
            <Typography color="text.secondary">{t("loading_profile", "Loading your employee profile...")}</Typography>
          </Stack>
        </Box>
      </Stack>
    );
  }

  if (!canViewAny()) {
    return (
      <Stack spacing={1.5} className="my-profile-state">
        <ProfileBreadcrumbs strSection={t("breadcrumb_ess", "ESS")} strTitle={t("page_title", "My Profile")} />
        <Paper className="my-profile-state-card">
          <Typography color="warning.main">
            {strRightsError || t("access_not_available", "My Profile access is not available for your user group.")}
          </Typography>
        </Paper>
      </Stack>
    );
  }

  if (!intEmployeeID) {
    return (
      <Stack spacing={1.5} className="my-profile-state">
        <ProfileBreadcrumbs strSection={t("breadcrumb_ess", "ESS")} strTitle={t("page_title", "My Profile")} />
        <Paper className="my-profile-state-card">
          <Typography color="error">{strError || t("error_resolve_profile", "Unable to resolve employee profile.")}</Typography>
        </Paper>
      </Stack>
    );
  }

  const dicSections: Record<string, { title: string; description: string; icon: ReactElement }> = {
    basicInfo: { title: t("tab_basic_info", "Employment Info"), description: t("description_basicInfo", "Key information about your current employment with the company."), icon: <WorkOutlineRoundedIcon /> },
    personalIdentification: { title: t("tab_personal_identification", "Personal & Identification"), description: t("description_personalIdentification", "Your personal information and identification details."), icon: <PersonRoundedIcon /> },
    serviceContract: { title: t("tab_service_contract", "Service & Contract"), description: t("description_serviceContract", "Your service and contract related information as per company records."), icon: <DescriptionRoundedIcon /> },
    additionalEmployment: { title: t("tab_additional_employment", "Additional Employment Details"), description: t("description_additionalEmployment", "Additional employment information and other details as per company records."), icon: <ApartmentOutlinedIcon /> },
    address: { title: t("tab_address", "Contact Details"), description: t("description_address", "Your contact information and address as per company records."), icon: <PhoneOutlinedIcon /> },
    bankDetails: { title: t("tab_bank_details", "Bank Details"), description: t("description_bankDetails", "Your banking information as per company records."), icon: <AccountBalanceWalletOutlinedIcon /> },
    statutory: { title: t("tab_statutory", "Statutory"), description: t("description_statutory", "Your statutory information as per company records."), icon: <ShieldRoundedIcon /> },
    experience: { title: t("tab_experience", "Experience"), description: t("description_experience", "Your previous employment experience."), icon: <WorkOutlineRoundedIcon /> },
    qualification: { title: t("tab_qualification", "Qualification"), description: t("description_qualification", "Your education and qualification details."), icon: <SchoolOutlinedIcon /> },
    familyDetails: { title: t("tab_family_details", "Family Details"), description: t("description_familyDetails", "Your family, dependent and nominee details."), icon: <GroupsOutlinedIcon /> },
  };
  const objActiveSection = dicSections[strActiveTab];

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
  return (
    <Box className="my-profile-page">
      <ProfileBreadcrumbs strSection={t("breadcrumb_ess", "ESS")} strTitle={t("page_title", "My Profile")} />
      {strRightsError ? <Typography className="my-profile-rights-error">{strRightsError}</Typography> : null}
      {strError ? <Alert severity="error" className="my-profile-error" onClose={() => setStrError("")}>{strError}</Alert> : null}
      <Paper elevation={0} className="my-profile-header">
        <div className="my-profile-banner-employee">
          <Avatar src={strAuthenticatedAvatarUrl || undefined} className="my-profile-avatar">{strInitial}</Avatar>
          <div className="my-profile-identity-text"><Typography component="h2" className="my-profile-name">{strFullName}</Typography>
            <div className="my-profile-identity-meta"><Typography>{valueOrNotAvailable(objEmployee?.strEmployeeCode)}</Typography>
              <Chip size="small" label={translateKnownValue(objEmployee?.strEmploymentStatus)} className="my-profile-status" />
            </div>
          </div>
        <div className="my-profile-identity-details">
          <IdentityItem objIcon={<ApartmentOutlinedIcon />} strLabel={t("field_department", "Department")} strValue={strDepartment} />
          <IdentityItem objIcon={<BadgeRoundedIcon />} strLabel={t("field_designation", "Designation")} strValue={strDesignation} />
          <IdentityItem objIcon={<LocationOnOutlinedIcon />} strLabel={t("field_location", "Location")} strValue={strLocation} />
        </div>
        <div className="my-profile-photo-actions">
          <Button component="label" variant="outlined" startIcon={blnAvatarUpdating ? <DottedLoader intSize={13} /> : <PhotoCameraRoundedIcon />} disabled={blnAvatarUpdating || !blnCanEditProfile}>
            {t("change_photo", "Change Photo")}
            <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} />
          </Button>
          {strAvatarUrl && blnCanEditProfile ? <Button variant="outlined" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => setBlnAvatarDeleteConfirmOpen(true)} disabled={blnAvatarUpdating}>{t("remove_photo", "Remove photo")}</Button> : null}
        </div>
        </div>
        <div className="my-profile-salary"><EmployeeSalarySummaryCard intEmployeeID={intEmployeeID} blnHideOpenPageButton blnProfileBanner /></div>
      </Paper>
      <div className="my-profile-workspace">
        <nav className="my-profile-navigation" aria-label={t("profile_sections", "Profile sections")}>
          <Tabs orientation="vertical" value={strActiveTab} onChange={(_event, strValue: string) => setStrActiveTab(strValue)} className="my-profile-tabs" aria-label={t("profile_sections", "Profile sections")}>
                <Tab id="my-profile-tab-basicInfo" aria-controls="my-profile-panel-basicInfo" value="basicInfo" icon={<WorkOutlineRoundedIcon />} iconPosition="start" label={<Box component="span" className="app-employee-tab-label">{t("tab_basic_info", "Employment Info")}</Box>} />
                <Tab id="my-profile-tab-personalIdentification" aria-controls="my-profile-panel-personalIdentification" value="personalIdentification" icon={<PersonRoundedIcon />} iconPosition="start" label={<Box component="span" className="app-employee-tab-label">{t("tab_personal_identification", "Personal & Identification")}</Box>} />
                <Tab id="my-profile-tab-serviceContract" aria-controls="my-profile-panel-serviceContract" value="serviceContract" icon={<DescriptionRoundedIcon />} iconPosition="start" label={<Box component="span" className="app-employee-tab-label">{t("tab_service_contract", "Service & Contract")}</Box>} />
                <Tab id="my-profile-tab-additionalEmployment" aria-controls="my-profile-panel-additionalEmployment" value="additionalEmployment" icon={<ApartmentOutlinedIcon />} iconPosition="start" label={<Box component="span" className="app-employee-tab-label">{t("tab_additional_employment", "Additional Employment Details")}</Box>} />
                <Tab id="my-profile-tab-address" aria-controls="my-profile-panel-address" value="address" icon={<PhoneOutlinedIcon />} iconPosition="start" label={<Box component="span" className="app-employee-tab-label">{t("tab_address", "Contact Details")}</Box>} />
                <Tab id="my-profile-tab-bankDetails" aria-controls="my-profile-panel-bankDetails" value="bankDetails" icon={<AccountBalanceWalletOutlinedIcon />} iconPosition="start" label={<Box component="span" className="app-employee-tab-label">{t("tab_bank_details", "Bank Details")}</Box>} />
                <Tab id="my-profile-tab-statutory" aria-controls="my-profile-panel-statutory" value="statutory" icon={<ShieldRoundedIcon />} iconPosition="start" label={<Box component="span" className="app-employee-tab-label">{t("tab_statutory", "Statutory")}</Box>} />
                <Tab id="my-profile-tab-experience" aria-controls="my-profile-panel-experience" value="experience" icon={<WorkOutlineRoundedIcon />} iconPosition="start" label={<Box component="span" className="app-employee-tab-label">{t("tab_experience", "Experience")}</Box>} />
                <Tab id="my-profile-tab-qualification" aria-controls="my-profile-panel-qualification" value="qualification" icon={<SchoolOutlinedIcon />} iconPosition="start" label={<Box component="span" className="app-employee-tab-label">{t("tab_qualification", "Qualification")}</Box>} />
                <Tab id="my-profile-tab-familyDetails" aria-controls="my-profile-panel-familyDetails" value="familyDetails" icon={<GroupsOutlinedIcon />} iconPosition="start" label={<Box component="span" className="app-employee-tab-label">{t("tab_family_details", "Family Details")}</Box>} />
          </Tabs>
        </nav>
        <Paper elevation={0} className="my-profile-content">
          <div className="my-profile-section-heading"><span className="my-profile-section-icon">{objActiveSection.icon}</span><div>
            <Typography component="h2">{objActiveSection.title}</Typography>
            <Typography>{objActiveSection.description}</Typography>
          </div></div>
          <div role="tabpanel" id={`my-profile-panel-${strActiveTab}`} aria-labelledby={`my-profile-tab-${strActiveTab}`} key={strActiveTab} className="my-profile-panel">
              {strActiveTab === "basicInfo" ? (
                <div className="my-profile-card-grid">
                  <ReadOnlyCard objIcon={<ApartmentOutlinedIcon />} strIconTone="blue" strTitle={t("section_organization", "Organization Details")} lstRows={[
                    { strLabel: t("field_department", "Department"), strValue: strDepartment },
                    { strLabel: t("field_location", "Location"), strValue: strLocation },
                    { strLabel: t("field_cost_center", "Cost Center"), strValue: resolveLookupLabel(objFormOptions?.lstCostCenters, objEmployee?.intCostCenterID ?? null, strNotAvailable) },
                    { strLabel: t("field_manager", "Manager"), strValue: strManager },
                    { strLabel: t("field_line_manager", "Line Manager"), strValue: strLineManager },
                    { strLabel: t("field_payroll_group", "Payroll Group"), strValue: strPayrollGroup },
                  ]} />
                  <ReadOnlyCard objIcon={<BadgeRoundedIcon />} strIconTone="purple" strTitle={t("section_position", "Position Details")} lstRows={[
                    { strLabel: t("field_date_of_joining", "Date of Joining"), strValue: formatDate(objEmployee?.dtDateOfJoining ?? null, strNotAvailable) },
                    { strLabel: t("field_employment_type", "Employment Type"), strValue: translateKnownValue(resolveLookupLabel(objFormOptions?.lstEmploymentTypes, objEmployee?.intEmploymentTypeID ?? null, strNotAvailable)) },
                    { strLabel: t("field_designation", "Designation"), strValue: strDesignation },
                    { strLabel: t("field_grade", "Grade"), strValue: resolveLookupLabel(objFormOptions?.lstGrades, objEmployee?.intGradeID ?? null, strNotAvailable) },
                  ]} />
                  <ReadOnlyCard objIcon={<CalendarMonthRoundedIcon />} strIconTone="green" strTitle={t("section_work_arrangement", "Work Arrangement")} lstRows={[
                    { strLabel: t("field_job_type", "Job Type"), strValue: valueOrNotAvailable(objEmployee?.strJobType) },
                    { strLabel: t("field_rest_day", "Rest Day"), strValue: valueOrNotAvailable(objEmployee?.strRestDay) },
                    { strLabel: t("field_payment_type", "Payment Type"), strValue: valueOrNotAvailable(objEmployee?.strPaymentType) },
                  ]} />
                  <ReadOnlyCard objIcon={<InfoOutlinedIcon />} strIconTone="orange" strTitle={t("section_additional_information", "Additional Information")} lstRows={[
                    { strLabel: t("field_ess_enabled", "ESS Enabled"), strValue: yesNoOrNotAvailable(objEmployee?.blnIsEssEnabled) },
                    { strLabel: t("field_preferred_language", "Preferred Language"), strValue: strPreferredLanguage },
                    { strLabel: t("field_employee_function", "Employee Function"), strValue: valueOrNotAvailable(objEmployee?.strEmployeeFunction) },
                    { strLabel: t("field_functional_area", "Functional Area"), strValue: valueOrNotAvailable(objEmployee?.strFunctionalArea) },
                    { strLabel: t("field_employee_category", "Employee Category"), strValue: valueOrNotAvailable(objEmployee?.strEmployeeCategory) },
                  ]} />
                </div>
              ) : null}

              {strActiveTab === "personalIdentification" ? (
                <div className="my-profile-card-grid">
                  <ReadOnlyCard objIcon={<PersonRoundedIcon />} strIconTone="purple" strTitle={t("section_personal_information", "Personal Information")} lstRows={[
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
                  ]} />
                  <ReadOnlyCard objIcon={<GroupsOutlinedIcon />} strIconTone="green" strTitle={t("section_family_attributes", "Family & Personal Attributes")} lstRows={[
                    { strLabel: t("field_father_husband_name", "Father / Husband Name"), strValue: valueOrNotAvailable(objEmployee?.strFatherOrHusbandName) },
                    { strLabel: t("field_mother_name", "Mother Name"), strValue: valueOrNotAvailable(objEmployee?.strMotherName) },
                    { strLabel: t("field_spouse_name", "Spouse Name"), strValue: valueOrNotAvailable(objEmployee?.strSpouseName) },
                    { strLabel: t("field_spouse_occupation", "Spouse Occupation"), strValue: valueOrNotAvailable(objEmployee?.strSpouseOccupation) },
                  ]} />
                  <ReadOnlyCard objIcon={<DescriptionRoundedIcon />} strIconTone="orange" strTitle={t("section_passport", "Passport Details")} lstRows={[
                    { strLabel: t("field_passport_number", "Passport Number"), strValue: valueOrNotAvailable(objEmployee?.strPassportNumber) },
                    { strLabel: t("field_passport_place_of_issue", "Passport Place of Issue"), strValue: valueOrNotAvailable(objEmployee?.strPassportPlaceOfIssue) },
                    { strLabel: t("field_passport_issue_date", "Passport Issue Date"), strValue: formatDate(objEmployee?.dtPassportIssueDate ?? null, strNotAvailable) },
                    { strLabel: t("field_passport_expiry_date", "Passport Expiry Date"), strValue: formatDate(objEmployee?.dtPassportExpiryDate ?? null, strNotAvailable) },
                  ]} />
                  <ReadOnlyCard objIcon={<DirectionsCarRoundedIcon />} strIconTone="red" strTitle={t("section_driving_licence", "Driving Licence Details")} lstRows={[
                    { strLabel: t("field_driving_licence_number", "Driving Licence Number"), strValue: valueOrNotAvailable(objEmployee?.strDrivingLicenceNumber) },
                    { strLabel: t("field_driving_licence_valid_upto", "Driving Licence Valid Upto"), strValue: formatDate(objEmployee?.dtDrivingLicenceValidUpto ?? null, strNotAvailable) },
                  ]} />
                  <ReadOnlyCard objIcon={<AssignmentIndRoundedIcon />} strIconTone="blue" strTitle={t("section_other_personal", "Other Personal Information")} lstRows={[
                    { strLabel: t("field_has_disability", "Has Disability"), strValue: yesNoOrNotAvailable(objEmployee?.blnHasDisability) },
                    { strLabel: t("field_superannuation", "Superannuation"), strValue: yesNoOrNotAvailable(objEmployee?.blnSuperannuationFlag) },
                    { strLabel: t("field_related_employee", "Related Employee"), strValue: objEmployee?.blnIsRelatedEmployee ? strRelatedEmployee : yesNoOrNotAvailable(objEmployee?.blnIsRelatedEmployee) },
                  ]} />
                </div>
              ) : null}

              {strActiveTab === "serviceContract" ? (
                <div className="my-profile-card-grid">
                  <ReadOnlyCard objIcon={<CalendarMonthRoundedIcon />} strIconTone="blue" strTitle={t("section_appointment_joining", "Appointment & Joining")} lstRows={[
                    { strLabel: t("field_appointment_date", "Appointment Date"), strValue: formatDate(objEmployee?.dtAppointmentDate ?? null, strNotAvailable) },
                    { strLabel: t("field_appointment_order_number", "Appointment Order Number"), strValue: valueOrNotAvailable(objEmployee?.strAppointmentOrderNumber) },
                    { strLabel: t("field_location_joining_date", "Location Joining Date"), strValue: formatDate(objEmployee?.dtLocationJoiningDate ?? null, strNotAvailable) },
                    { strLabel: t("field_initial_posting_location", "Initial Posting Location"), strValue: valueOrNotAvailable(objEmployee?.strInitialPostingLocation) },
                    { strLabel: t("field_entry_mode", "Entry Mode"), strValue: valueOrNotAvailable(objEmployee?.strEntryMode) },
                    { strLabel: t("field_reference_number", "Reference Number"), strValue: valueOrNotAvailable(objEmployee?.strReferenceNumber) },
                    { strLabel: t("field_referred_by", "Referred By"), strValue: valueOrNotAvailable(objEmployee?.strReferredBy) },
                    { strLabel: t("field_agency", "Agency"), strValue: valueOrNotAvailable(objEmployee?.strAgency) }
                  ]} />
                  <ReadOnlyCard objIcon={<HourglassEmptyRoundedIcon />} strIconTone="purple" strTitle={t("section_probation_confirmation", "Probation & Confirmation")} lstRows={[
                    { strLabel: t("field_probation_start_date", "Probation Start Date"), strValue: formatDate(objEmployee?.dtProbationStartDate ?? null, strNotAvailable) },
                    { strLabel: t("field_probation_end_date", "Probation End Date"), strValue: formatDate(objEmployee?.dtProbationEndDate ?? null, strNotAvailable) },
                    { strLabel: t("field_tentative_confirmation_date", "Tentative Confirmation Date"), strValue: formatDate(objEmployee?.dtTentativeConfirmationDate ?? null, strNotAvailable) },
                    { strLabel: t("field_confirmation_date", "Confirmation Date"), strValue: formatDate(objEmployee?.dtConfirmationDate ?? null, strNotAvailable) },
                    { strLabel: t("field_confirmation_type", "Confirmation Type"), strValue: valueOrNotAvailable(objEmployee?.strConfirmationType) },
                    { strLabel: t("field_confirmation_comments", "Confirmation Comments"), strValue: valueOrNotAvailable(objEmployee?.strConfirmationComments) },
                    { strLabel: t("field_last_increment_date", "Last Increment Date"), strValue: formatDate(objEmployee?.dtLastIncrementDate ?? null, strNotAvailable) },
                    { strLabel: t("field_status_effective_date", "Status Effective Date"), strValue: formatDate(objEmployee?.dtStatusEffectiveDate ?? null, strNotAvailable) }
                  ]} />
                  <ReadOnlyCard objIcon={<DescriptionRoundedIcon />} strIconTone="green" strTitle={t("section_contract_service_period", "Contract / Service Period")} lstRows={[
                    { strLabel: t("field_contract_start_date", "Contract Start Date"), strValue: formatDate(objEmployee?.dtContractStartDate ?? null, strNotAvailable) },
                    { strLabel: t("field_contract_end_date", "Contract End Date"), strValue: formatDate(objEmployee?.dtContractEndDate ?? null, strNotAvailable) },
                    { strLabel: t("field_from_date", "From Date"), strValue: formatDate(objEmployee?.dtFromDate ?? null, strNotAvailable) },
                    { strLabel: t("field_to_date", "To Date"), strValue: formatDate(objEmployee?.dtToDate ?? null, strNotAvailable) },
                    { strLabel: t("field_notice_period_days", "Notice Period (Days)"), strValue: numberOrNotAvailable(objEmployee?.intNoticePeriodDays) },
                    { strLabel: t("field_retirement_date", "Retirement Date"), strValue: formatDate(objEmployee?.dtRetirementDate ?? null, strNotAvailable) },
                    { strLabel: t("field_date_of_exit", "Date of Exit"), strValue: formatDate(objEmployee?.dtDateOfExit ?? null, strNotAvailable) }
                  ]} />
                </div>
              ) : null}

              {strActiveTab === "additionalEmployment" ? (
                <div className="my-profile-card-grid">
                  <ReadOnlyCard objIcon={<BusinessCenterRoundedIcon />} strIconTone="purple" strTitle={t("section_employment_related", "Employment Related Information")} lstRows={[
                    { strLabel: t("field_employee_workgroup", "Employee Workgroup"), strValue: valueOrNotAvailable(objEmployee?.strEmployeeWorkgroup) },
                    { strLabel: t("field_employee_reservation", "Employee Reservation"), strValue: valueOrNotAvailable(objEmployee?.strEmployeeReservation) },
                    { strLabel: t("field_swon", "SWON"), strValue: valueOrNotAvailable(objEmployee?.strSwon) },
                    { strLabel: t("field_accommodation_type", "Accommodation Type"), strValue: valueOrNotAvailable(objEmployee?.strAccommodationType) },
                    { strLabel: t("field_housing_allowance", "Housing Allowance"), strValue: numberOrNotAvailable(objEmployee?.decHousingAllowance) },
                  ]} />
                  <ReadOnlyCard objIcon={<ArticleRoundedIcon />} strIconTone="green" strTitle={t("section_other_information", "Other Information")} lstRows={[
                    { strLabel: t("field_flat_given", "Flat Given"), strValue: yesNoOrNotAvailable(objEmployee?.blnFlatGiven) },
                    { strLabel: t("field_prefix_logic", "Prefix Logic"), strValue: valueOrNotAvailable(objEmployee?.strPrefixLogic) },
                    { strLabel: t("field_ugc_appraisal", "UGC Appraisal"), strValue: yesNoOrNotAvailable(objEmployee?.blnUgcAppraisalFlag) },
                    { strLabel: t("field_employee_remark", "Employee Remark"), strValue: valueOrNotAvailable(objEmployee?.strEmployeeRemark) },
                  ]} />
                </div>
              ) : null}

              {strActiveTab === "address" ? (
                <div className="my-profile-card-grid">
                  <ReadOnlyCard objIcon={<PhoneOutlinedIcon />} strIconTone="blue" strTitle={t("section_employee_contact", "Employee Contact")} lstRows={[
                    { strLabel: t("field_work_email", "Work Email"), strValue: valueOrNotAvailable(objEmployee?.strWorkEmail) },
                    { strLabel: t("field_personal_email", "Personal Email"), strValue: valueOrNotAvailable(objEmployee?.strPersonalEmail) },
                    { strLabel: t("field_mobile_country_code", "Mobile Country Code"), strValue: valueOrNotAvailable(objEmployee?.strMobileCountryCode) },
                    { strLabel: t("field_mobile_number", "Mobile Number"), strValue: valueOrNotAvailable(objEmployee?.strMobileNumber) },
                    { strLabel: t("field_whatsapp_country_code", "WhatsApp Country Code"), strValue: valueOrNotAvailable(objEmployee?.strWhatsappCountryCode) },
                    { strLabel: t("field_whatsapp_number", "WhatsApp Number"), strValue: valueOrNotAvailable(objEmployee?.strWhatsappNumber) }
                  ]} />
                  <ReadOnlyCard objIcon={<ContactEmergencyRoundedIcon />} strIconTone="purple" strTitle={t("section_emergency_contact", "Emergency Contact")} lstRows={[
                    { strLabel: t("field_emergency_contact_person", "Emergency Contact Person"), strValue: valueOrNotAvailable(objEmployee?.strEmergencyContactPerson) },
                    { strLabel: t("field_emergency_country_code", "Emergency Country Code"), strValue: valueOrNotAvailable(objEmployee?.strEmergencyCountryCode) },
                    { strLabel: t("field_emergency_mobile_number", "Emergency Mobile Number"), strValue: valueOrNotAvailable(objEmployee?.strEmergencyMobileNumber) },
                    { strLabel: t("field_emergency_email", "Emergency Email"), strValue: valueOrNotAvailable(objEmployee?.strEmergencyEmail) }
                  ]} />
                  <ReadOnlyCard objIcon={<HomeRoundedIcon />} strIconTone="green" strTitle={t("section_address", "Address")} lstRows={[
                    { strLabel: t("field_address_type", "Address Type"), strValue: translateKnownValue(objAddress?.strAddressType) },
                    { strLabel: t("field_address_line_1", "Address Line 1"), strValue: valueOrNotAvailable(objAddress?.strAddressLine1) },
                    { strLabel: t("field_address_line_2", "Address Line 2"), strValue: valueOrNotAvailable(objAddress?.strAddressLine2) },
                    { strLabel: t("field_city", "City"), strValue: valueOrNotAvailable(objAddress?.strCityName) },
                    { strLabel: t("field_state", "State"), strValue: resolveLookupLabel(objFormOptions?.lstStates, objAddress?.intStateID ?? null, strNotAvailable) },
                    { strLabel: t("field_country", "Country"), strValue: resolveLookupLabel(objFormOptions?.lstCountries, objAddress?.intCountryID ?? null, strNotAvailable) },
                    { strLabel: t("field_postal_code", "Postal Code"), strValue: valueOrNotAvailable(objAddress?.strPostalCode) }
                  ]} />
                </div>
              ) : null}

              {strActiveTab === "bankDetails" ? (
                <div className="my-profile-card-grid">
                  <ReadOnlyCard objIcon={<AccountBalanceOutlinedIcon />} strIconTone="purple" strTitle={t("primary_bank_details", "Primary Bank Details")}
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
                  <ReadOnlyCard objIcon={<AccountBalanceOutlinedIcon />} strIconTone="green" strTitle={t("field_secondary_bank_details", "Secondary Bank Details")}
                    lstRows={[
                      { strLabel: t("field_secondary_bank_active", "Secondary Bank Active"), strValue: objBank ? (objBank.blnSecondaryIsActive ? t("yes", "Yes") : t("no", "No")) : strNotAvailable },
                      { strLabel: t("field_secondary_bank", "Secondary Bank"), strValue: resolveLookupLabel(objFormOptions?.lstBanks, objBank?.intSecondaryBankID ?? null, strNotAvailable) },
                      { strLabel: t("field_secondary_account_holder_name", "Secondary Account Holder Name"), strValue: valueOrNotAvailable(objBank?.strSecondaryAccountHolderName) },
                      { strLabel: t("field_secondary_account_number", "Secondary Account Number"), strValue: valueOrNotAvailable(objBank?.strSecondaryAccountNumberMasked || objBank?.strSecondaryAccountNumber) },
                      { strLabel: t("field_secondary_ifsc_code", "Secondary IFSC Code"), strValue: valueOrNotAvailable(objBank?.strSecondaryIfscCode) }
                    ]}
                  />
                </div>
              ) : null}

              {strActiveTab === "statutory" ? (
                <div className="my-profile-card-grid">
                  <ReadOnlyCard objIcon={<DescriptionRoundedIcon />} strIconTone="purple" strTitle={t("section_tax", "Tax & National Identification")} lstRows={[
                    { strLabel: t("field_pan_number", "PAN Number"), strValue: valueOrNotAvailable(objStatutory?.strPanNumber) },
                    { strLabel: t("field_tax_regime", "Tax Regime"), strValue: translateKnownValue(objStatutory?.strTaxRegimeCode) },
                    { strLabel: t("field_ssn_number", "SSN Number"), strValue: valueOrNotAvailable(objStatutory?.strSsnNumber) },
                    { strLabel: t("field_pran_number", "PRAN Number"), strValue: valueOrNotAvailable(objStatutory?.strPranNumber) },
                    { strLabel: t("field_gratuity_number", "Gratuity Number"), strValue: valueOrNotAvailable(objStatutory?.strGratuityNumber) }
                  ]} />
                  <ReadOnlyCard objIcon={<GroupsOutlinedIcon />} strIconTone="green" strTitle={t("section_pf", "Provident Fund (PF)")} lstRows={[
                    { strLabel: t("field_uan_number", "UAN Number"), strValue: valueOrNotAvailable(objStatutory?.strUanNumber) },
                    { strLabel: t("field_pf_applicable", "PF Applicable"), strValue: objStatutory ? (objStatutory.blnPfApplicable ? t("yes", "Yes") : t("no", "No")) : strNotAvailable },
                    { strLabel: t("field_pf_number", "PF Number"), strValue: valueOrNotAvailable(objStatutory?.strPfNumber) }
                  ]} />
                  <ReadOnlyCard objIcon={<ShieldRoundedIcon />} strIconTone="red" strTitle={t("section_esi", "Employee State Insurance (ESI)")} lstRows={[
                    { strLabel: t("field_esi_applicable", "ESI Applicable"), strValue: objStatutory ? (objStatutory.blnEsiApplicable ? t("yes", "Yes") : t("no", "No")) : strNotAvailable },
                    { strLabel: t("field_esi_code", "ESI Code"), strValue: valueOrNotAvailable(objStatutory?.strEsiCode) },
                    { strLabel: t("field_esi_number", "ESI Number"), strValue: valueOrNotAvailable(objStatutory?.strEsiNumber) }
                  ]} />
                  <ReadOnlyCard objIcon={<ArticleRoundedIcon />} strIconTone="blue" strTitle={t("section_pt", "Professional Tax")} lstRows={[
                    { strLabel: t("field_pt_applicable", "PT Applicable"), strValue: objStatutory ? (objStatutory.blnPtApplicable ? t("yes", "Yes") : t("no", "No")) : strNotAvailable }
                  ]} />
                </div>
              ) : null}

              {strActiveTab === "experience" ? (
                <Stack spacing={1.5}>
                  {lstExperiences.length ? lstExperiences.map((objExperience) => (
                    <div key={objExperience.intID} className="my-profile-record">
                      <ReadOnlyCard objIcon={<BusinessCenterRoundedIcon />} strTitle={`${t("field_company", "Company")} - ${valueOrNotAvailable(objExperience.strCompanyName)}`}
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
                    </div>
                  )) : <Typography className="my-profile-empty">{t("no_experience", "No experience details available.")}</Typography>}
                </Stack>
              ) : null}

              {strActiveTab === "qualification" ? (
                <Stack spacing={1.5}>
                  {lstQualifications.length ? lstQualifications.map((objQualification) => (
                    <div key={objQualification.intID} className="my-profile-record">
                      <ReadOnlyCard objIcon={<SchoolOutlinedIcon />} strTitle={`${t("field_degree", "Degree")} - ${valueOrNotAvailable(objQualification.strDegreeName)}`}
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
                    </div>
                  )) : <Typography className="my-profile-empty">{t("no_qualification", "No qualification details available.")}</Typography>}
                </Stack>
              ) : null}

              {strActiveTab === "familyDetails" ? (
                <Stack spacing={1.5}>
                  {lstFamily.length ? lstFamily.map((objMember) => (
                    <div key={objMember.intID} className="my-profile-record">
                      <ReadOnlyCard objIcon={<GroupsOutlinedIcon />} strTitle={`${valueOrNotAvailable(objMember.strRelationship)} - ${valueOrNotAvailable(objMember.strName)}`}
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
                    </div>
                  )) : <Typography className="my-profile-empty">{t("no_family_details", "No family details available.")}</Typography>}
                </Stack>
              ) : null}
          </div>
          <div className="my-profile-notice"><InfoOutlinedIcon /><Typography>{t("profile_read_only_notice", "The information on this page is maintained by your organization and is for viewing only. If you notice any incorrect information, please contact your HR team.")}</Typography></div>
        </Paper>
      </div>

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
