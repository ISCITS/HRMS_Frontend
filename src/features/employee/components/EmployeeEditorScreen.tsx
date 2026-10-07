"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import GppGoodOutlinedIcon from "@mui/icons-material/GppGoodOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import PostAddRoundedIcon from "@mui/icons-material/PostAddRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import AlternateEmailRoundedIcon from "@mui/icons-material/AlternateEmailRounded";
import ContactEmergencyOutlinedIcon from "@mui/icons-material/ContactEmergencyOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import {
  Alert,
  Avatar,
  Box,
  Breadcrumbs,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Radio,
  RadioGroup,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState, type ChangeEvent, type FocusEvent, type InputHTMLAttributes, type ReactNode, type RefObject, type SyntheticEvent } from "react";

import { handleSingleDialogActionEnter } from "@/components/common/dialogKeyboard";
import CommonSearchableSelect from "@/Common/components/CommonSearchableSelect";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import { DottedLoader } from "@/components/shared/BlockingLoader";
import styles from "@/components/master/MasterScreen.module.css";
import dicConstant from "@/constants/Constant.json";
import FamilyDetailsTab from "@/features/employee/components/FamilyDetailsTab";
import ExperienceTimeline from "@/features/employee/components/ExperienceTimeline";
import EmployeeSalarySummaryCard from "@/features/employee-salary/components/EmployeeSalarySummaryCard";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useAuthenticatedAvatar } from "@/hooks/useAuthenticatedAvatar";
import { withBasePath } from "@/lib/basePath";
import { authApiService } from "@/services/auth/AuthApiService";
import {
  dicEmptyEmployeeAddressForm,
  dicEmptyEmployeeBankForm,
  dicEmptyEmployeeExperienceForm,
  dicEmptyEmployeeForm,
  dicEmptyEmployeeQualificationForm,
  dicEmptyEmployeeStatutoryForm,
  toEmployeeAddressFormValues,
  toEmployeeBankFormValues,
  toEmployeeExperienceFormValues,
  toEmployeeFormValues,
  toEmployeeQualificationFormValues,
  toEmployeeStatutoryFormValues,
  validateEmployeeForm
} from "@/features/employee/EmployeeFormUtils";
import { useEmployeeDetailsLabels } from "@/features/employee/hooks/useEmployeeDetailsLabels";
import { employeeService } from "@/features/employee/services/employeeService";
import type {
  EmployeeAddressFormValues,
  EmployeeBankFormValues,
  EmployeeFamilyDetailRecord,
  EmployeeFormOptions,
  EmployeeFormValues,
  EmployeeExperienceFormValues,
  EmployeeExperienceRecord,
  EmployeeListRecord,
  EmployeeQualificationFormValues,
  EmployeeQualificationRecord,
  EmployeeStatutoryFormValues,
} from "@/features/employee/types";

type EmployeeEditorScreenProps = {
  strMode: "add" | "edit" | "view";
  /** Public identifier (record_uuid) from the URL; the internal id stays server-side. */
  strEmployeeID?: string;
  blnHideSalarySummaryCard?: boolean;
  blnHideSalaryOpenPageButton?: boolean;
  blnHidePageHeading?: boolean;
  strBackRoute?: string;
  lstAccessModuleCodes?: string[];
  strMenuActionOverride?: string;
  strPageTitleOverride?: string;
  /** Breadcrumb section / list names used when a page title override replaces the Masters > Employees trail. */
  strBreadcrumbSection?: string;
  strBreadcrumbList?: string;
};

function sanitizeMobileNumberInput(strValue: string): string {
  return strValue.replace(/[^0-9+\- ]/g, "");
}

const lstEmployeeModuleCodes = ["EMPLOYEE", "EMPLOYEES", "MASTER_EMPLOYEE"];

type TabKey = "basicInfo" | "personalIdentification" | "serviceContract" | "additionalEmployment" | "address" | "bankDetails" | "statutory" | "experience" | "qualification" | "family";

const lstTabOrder: TabKey[] = ["basicInfo", "personalIdentification", "serviceContract", "additionalEmployment", "address", "bankDetails", "statutory", "experience", "qualification", "family"];
const strRequiredAsteriskColor = "#dc2626";

function maskBankAccountNumber(strAccountNumber: string, strSavedMask?: string | null): string {
  if (strAccountNumber.trim()) {
    return `•••• ${strAccountNumber.trim().slice(-4)}`;
  }
  return strSavedMask || "••••";
}

// Match the standard salary-component outlined fields, with squarer corners.
const dicEmployeeFieldGridSx = {
  "& .MuiOutlinedInput-root": { borderRadius: "4px", backgroundColor: "#fff" },
  "& .MuiInputBase-input::placeholder": { fontSize: "13px", opacity: 1, color: "#94a3b8" },
  "& .MuiFormLabel-asterisk": { color: strRequiredAsteriskColor },
} as const;

const dicEmployeeInlineFieldSx = {
  ...dicEmployeeFieldGridSx,
  "& .MuiOutlinedInput-root": { borderRadius: "4px", backgroundColor: "#fff", fontSize: 13 },
  "& .MuiInputBase-input": { fontSize: "13px" },
  "& .MuiFormHelperText-root": { mx: 0 },
} as const;

const dicEmployeeInlineInputLabelProps = { shrink: true } as const;

const intEmployeeTabCardSpacing = 1.5;
const dicEmployeeInputGridGapSx = { columnGap: 1.5, rowGap: 2.25 } as const;
const dicEmployeeTabCardTitleSx = { fontSize: 14, fontWeight: 700, lineHeight: 1.35, color: "#172554" } as const;
const dicEmployeeTabCardSubtitleSx = { fontSize: 11, lineHeight: 1.45, color: "#64748b" } as const;
const lstContactCountryCodes = ["+91", "+971", "+1", "+44", "+61"];

const dicEmployeeTabsSx = {
  minHeight: 52,
  "& .MuiTabs-scroller": {
    overflowY: "visible",
  },
  "& .MuiTabs-flexContainer": {
    gap: 0.25,
  },
  "& .MuiTabs-indicator": {
    height: 3,
    borderRadius: "999px 999px 0 0",
    bgcolor: "transparent",
    transition: "left 260ms cubic-bezier(0.4, 0, 0.2, 1), width 260ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
  "& .MuiTab-root": {
    position: "relative",
    minHeight: 52,
    px: 1.75,
    py: 0,
    mx: 0.25,
    borderRadius: "8px 8px 0 0",
    overflow: "hidden",
    color: "#475569",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0,
    textTransform: "none",
    transition: "color 180ms ease, background-color 180ms ease, box-shadow 180ms ease",
    "& .employee-tab-label": {
      position: "relative",
      display: "flex",
      alignItems: "center",
      height: "100%",
    },
    "& .employee-tab-label::after": {
      content: '""',
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 3,
      borderRadius: "999px 999px 0 0",
      bgcolor: "#5b8fba",
      opacity: 0,
      transition: "left 260ms cubic-bezier(0.4, 0, 0.2, 1), right 260ms cubic-bezier(0.4, 0, 0.2, 1), opacity 190ms ease, background-color 180ms ease",
    },
    "&:hover": {
      color: "#215f91",
      bgcolor: "#f3f4f6",
      boxShadow: "inset 0 -1px 0 #d1d5db",
    },
    "&.Mui-selected": {
      color: "#123f63",
      bgcolor: "transparent",
      fontWeight: 800,
      "& .employee-tab-label::after": {
        opacity: 1,
      },
    },
    "&.Mui-selected:hover": {
      color: "#0f3554",
      bgcolor: "#f3f4f6",
      boxShadow: "inset 0 -1px 0 #d1d5db",
      "& .employee-tab-label::after": {
        opacity: 1,
        left: -14,
        right: -14,
      },
    },
    "&.Mui-focusVisible": {
      bgcolor: "#f3f4f6",
      outline: "2px solid #d1d5db",
      outlineOffset: -2,
    },
    "&.Mui-selected.Mui-focusVisible": {
      bgcolor: "transparent",
      outlineColor: "#8fb9d8",
    },
  },
} as const;

const createEmployeeSwitchSx = (strCheckedColor: string) => ({
  width: 44,
  height: 24,
  p: 0,
  overflow: "visible",
  "& .MuiSwitch-switchBase": {
    p: "3px",
    color: "#fff",
    transitionDuration: "180ms",
    "&.Mui-checked": {
      transform: "translateX(20px)",
      color: "#fff",
      "& + .MuiSwitch-track": { backgroundColor: strCheckedColor, opacity: 1 },
    },
    "&.Mui-disabled": { color: "#fff", opacity: 0.7 },
  },
  "& .MuiSwitch-thumb": {
    width: 18,
    height: 18,
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.2)",
  },
  "& .MuiSwitch-track": {
    borderRadius: "12px",
    backgroundColor: "#98a2b3",
    opacity: 1,
    transition: "background-color 180ms",
  },
} as const);

const dicEmployeeActiveSwitchSx = createEmployeeSwitchSx("#00b86b");
const dicEmployeeDetailSwitchSx = createEmployeeSwitchSx("#2563eb");
const dicEmployeeDetailSwitchLabelSx = {
  m: 0,
  gap: 1,
  "& .MuiFormControlLabel-label": { fontSize: 12, fontWeight: 600, color: "#334155" },
} as const;

const lstPersonalOptionalFields: Array<{ strField: keyof EmployeeFormValues; strLabel: string; strType?: string }> = [
  { strField: "strMaritalStatus", strLabel: "Marital Status" },
  { strField: "strBloodGroup", strLabel: "Blood Group" },
  { strField: "strReligion", strLabel: "Religion" },
  { strField: "strPlaceOfBirth", strLabel: "Place of Birth" },
  { strField: "strIdentificationMarks", strLabel: "Identification Marks" },
  { strField: "strFatherOrHusbandName", strLabel: "Father / Husband Name" },
  { strField: "strMotherName", strLabel: "Mother Name" },
  { strField: "strSpouseName", strLabel: "Spouse Name" },
  { strField: "strSpouseOccupation", strLabel: "Spouse Occupation" },
  { strField: "strPassportNumber", strLabel: "Passport Number" },
  { strField: "strPassportPlaceOfIssue", strLabel: "Passport Place of Issue" },
  { strField: "dtPassportIssueDate", strLabel: "Passport Issue Date", strType: "date" },
  { strField: "dtPassportExpiryDate", strLabel: "Passport Expiry Date", strType: "date" },
  { strField: "strDrivingLicenceNumber", strLabel: "Driving Licence Number" },
  { strField: "dtDrivingLicenceValidUpto", strLabel: "Driving Licence Valid Upto", strType: "date" },
];

const lstEmploymentAssignmentFields: Array<{ strField: keyof EmployeeFormValues; strLabel: string; strType?: string }> = [
  { strField: "strEmployeeFunction", strLabel: "Employee Function" },
  { strField: "strFunctionalArea", strLabel: "Functional Area" },
  { strField: "strJobType", strLabel: "Job Type" },
  { strField: "strPaymentType", strLabel: "Payment Type" },
];

const lstAppointmentJoiningFields: Array<{ strField: keyof EmployeeFormValues; strLabel: string; strType?: string }> = [
  { strField: "dtAppointmentDate", strLabel: "Appointment Date", strType: "date" },
  { strField: "dtLocationJoiningDate", strLabel: "Location Joining Date", strType: "date" },
  { strField: "strAppointmentOrderNumber", strLabel: "Appointment Order Number" },
  { strField: "strInitialPostingLocation", strLabel: "Initial Posting Location" },
];

const lstAdditionalAppointmentFields: Array<{ strField: keyof EmployeeFormValues; strLabel: string }> = [
  { strField: "strEntryMode", strLabel: "Entry Mode" },
  { strField: "strReferenceNumber", strLabel: "Reference Number" },
  { strField: "strReferredBy", strLabel: "Referred By" },
  { strField: "strAgency", strLabel: "Agency" },
];

const lstProbationConfirmationFields: Array<{ strField: keyof EmployeeFormValues; strLabel: string; strType?: string }> = [
  { strField: "dtProbationStartDate", strLabel: "Probation Start Date", strType: "date" },
  { strField: "dtProbationEndDate", strLabel: "Probation End Date", strType: "date" },
  { strField: "dtTentativeConfirmationDate", strLabel: "Tentative Confirmation Date", strType: "date" },
  { strField: "dtConfirmationDate", strLabel: "Confirmation Date", strType: "date" },
  { strField: "strConfirmationType", strLabel: "Confirmation Type" },
  { strField: "strConfirmationComments", strLabel: "Confirmation Comments" },
  { strField: "dtLastIncrementDate", strLabel: "Last Increment Date", strType: "date" },
  { strField: "dtStatusEffectiveDate", strLabel: "Status Effective Date", strType: "date" },
];

const lstContractServiceFields: Array<{ strField: keyof EmployeeFormValues; strLabel: string; strType?: string }> = [
  { strField: "dtContractStartDate", strLabel: "Contract Start Date", strType: "date" },
  { strField: "dtContractEndDate", strLabel: "Contract End Date", strType: "date" },
  { strField: "dtFromDate", strLabel: "Service From Date", strType: "date" },
  { strField: "dtToDate", strLabel: "Service To Date", strType: "date" },
  { strField: "intNoticePeriodDays", strLabel: "Notice Period (Days)", strType: "number" },
  { strField: "dtRetirementDate", strLabel: "Retirement Date", strType: "date" },
];

const lstAdditionalEmploymentFields: Array<{ strField: keyof EmployeeFormValues; strLabel: string; strTranslationKey: string; strType?: string }> = [
  { strField: "strEmployeeWorkgroup", strLabel: "Employee Workgroup", strTranslationKey: "field_employee_workgroup" },
  { strField: "strEmployeeReservation", strLabel: "Employee Reservation", strTranslationKey: "field_employee_reservation" },
  { strField: "strSwon", strLabel: "SWON", strTranslationKey: "field_swon" },
  { strField: "strAccommodationType", strLabel: "Accommodation Type", strTranslationKey: "field_accommodation_type" },
  { strField: "decHousingAllowance", strLabel: "Housing Allowance", strTranslationKey: "field_housing_allowance", strType: "number" },
  { strField: "strPrefixLogic", strLabel: "Prefix Logic", strTranslationKey: "field_prefix_logic" },
];

function renderRequiredLabel(strLabel: string) {
  return (
    <>
      {strLabel} <Box component="span" sx={{ color: strRequiredAsteriskColor }}>*</Box>
    </>
  );
}

function focusFirstError<TKey extends string>(
  dicErrors: Partial<Record<TKey, string>>,
  dicRefs: Partial<Record<TKey, RefObject<HTMLInputElement | null>>>,
  lstPriorityFields: TKey[]
) {
  const strFirstErrorField = lstPriorityFields.find((strField) => Boolean(dicErrors[strField]));
  if (!strFirstErrorField) {
    return;
  }
  const objField = dicRefs[strFirstErrorField]?.current;
  if (!objField) {
    return;
  }
  objField.scrollIntoView({ behavior: "smooth", block: "center" });
  objField.focus({ preventScroll: true });
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function buildPartialEmployeeCode() {
  return `PARTIAL-${Date.now()}`;
}

function buildEmployeeAvatarUrl(intEmployeeID: number, strProfilePhotoUrl?: string | null) {
  const strResolvedAvatarUrl = strProfilePhotoUrl?.trim();
  if (!strResolvedAvatarUrl) {
    return withBasePath(`/api/auth/avatar/current?employee_id=${intEmployeeID}&v=${Date.now()}`);
  }

  const strVersionedAvatarUrl = new URL(strResolvedAvatarUrl, window.location.origin);
  strVersionedAvatarUrl.searchParams.set("v", Date.now().toString());
  return withBasePath(`${strVersionedAvatarUrl.pathname}${strVersionedAvatarUrl.search}`);
}

export default function EmployeeEditorScreen({
  strMode,
  strEmployeeID,
  blnHideSalarySummaryCard = false,
  blnHideSalaryOpenPageButton = false,
  blnHidePageHeading = false,
  strBackRoute = "/employees",
  lstAccessModuleCodes = lstEmployeeModuleCodes,
  strMenuActionOverride,
  strPageTitleOverride,
  strBreadcrumbSection,
  strBreadcrumbList
}: EmployeeEditorScreenProps) {
  const objRouter = useRouter();
  const objSearchParams = useSearchParams();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstAccessModuleCodes);
  const { strLabelError, t } = useEmployeeDetailsLabels();
  const [strActiveTab, setStrActiveTab] = useState<TabKey>(() => {
    const strRequestedTab = objSearchParams.get("tab");
    return (lstTabOrder as string[]).includes(strRequestedTab || "") ? (strRequestedTab as TabKey) : "basicInfo";
  });
  const [lstEmployees, setLstEmployees] = useState<EmployeeListRecord[]>([]);
  const [objFormOptions, setObjFormOptions] = useState<EmployeeFormOptions | null>(null);
  const [dicBasicForm, setDicBasicForm] = useState<EmployeeFormValues>(dicEmptyEmployeeForm);
  const [dicAddressForm, setDicAddressForm] = useState<EmployeeAddressFormValues>(dicEmptyEmployeeAddressForm);
  const [dicBankForm, setDicBankForm] = useState<EmployeeBankFormValues>(dicEmptyEmployeeBankForm);
  const [strSelectedBankAccount, setStrSelectedBankAccount] = useState<"primary" | "secondary">("primary");
  const [blnBankAccountNumberVisible, setBlnBankAccountNumberVisible] = useState(false);
  const [dicBankAccountMasks, setDicBankAccountMasks] = useState({ primary: "", secondary: "" });
  const [dicStatutoryForm, setDicStatutoryForm] = useState<EmployeeStatutoryFormValues>(dicEmptyEmployeeStatutoryForm);
  const [lstExperienceRecords, setLstExperienceRecords] = useState<EmployeeExperienceRecord[]>([]);
  const [lstQualificationRecords, setLstQualificationRecords] = useState<EmployeeQualificationRecord[]>([]);
  const [lstFamilyRecords, setLstFamilyRecords] = useState<EmployeeFamilyDetailRecord[]>([]);
  const [dicExperienceForm, setDicExperienceForm] = useState<EmployeeExperienceFormValues>(dicEmptyEmployeeExperienceForm);
  const [dicQualificationForm, setDicQualificationForm] = useState<EmployeeQualificationFormValues>(dicEmptyEmployeeQualificationForm);
  const [dicBasicErrors, setDicBasicErrors] = useState<Partial<Record<keyof EmployeeFormValues, string>>>({});
  const [dicAddressErrors, setDicAddressErrors] = useState<Partial<Record<keyof EmployeeAddressFormValues, string>>>({});
  const [dicBankErrors, setDicBankErrors] = useState<Partial<Record<keyof EmployeeBankFormValues, string>>>({});
  const [dicStatutoryErrors, setDicStatutoryErrors] = useState<Partial<Record<keyof EmployeeStatutoryFormValues, string>>>({});
  const dicExperienceFieldRefs = {
    strCompanyName: useRef<HTMLInputElement>(null),
    strJobTitle: useRef<HTMLInputElement>(null),
    dtFromDate: useRef<HTMLInputElement>(null),
    dtToDate: useRef<HTMLInputElement>(null),
    decLastDrawnSalary: useRef<HTMLInputElement>(null),
  };
  const [dicExperienceErrors, setDicExperienceErrors] = useState<Partial<Record<keyof EmployeeExperienceFormValues, string>>>({});
  const [dicQualificationErrors, setDicQualificationErrors] = useState<Partial<Record<keyof EmployeeQualificationFormValues, string>>>({});
  const [blnAddingExperience, setBlnAddingExperience] = useState(false);
  const [blnAddingQualification, setBlnAddingQualification] = useState(false);
  const [intEditingExperienceID, setIntEditingExperienceID] = useState<number | null>(null);
  const [intEditingQualificationID, setIntEditingQualificationID] = useState<number | null>(null);
  const [objExperienceDeleteDialog, setObjExperienceDeleteDialog] = useState<{ blnOpen: boolean; intExperienceID: number | null; strCompanyName: string }>({
    blnOpen: false,
    intExperienceID: null,
    strCompanyName: ""
  });
  const [objQualificationDeleteDialog, setObjQualificationDeleteDialog] = useState<{ blnOpen: boolean; intQualificationID: number | null; strDegreeName: string }>({
    blnOpen: false,
    intQualificationID: null,
    strDegreeName: ""
  });
  // Resolved from the loaded record; the URL carries only the public identifier.
  const [intResolvedEmployeeID, setIntResolvedEmployeeID] = useState<number | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnBasicSaving, setBlnBasicSaving] = useState(false);
  const [blnAddressSaving, setBlnAddressSaving] = useState(false);
  const [blnBankSaving, setBlnBankSaving] = useState(false);
  const [blnStatutorySaving, setBlnStatutorySaving] = useState(false);
  const [blnExperienceSaving, setBlnExperienceSaving] = useState(false);
  const [blnQualificationSaving, setBlnQualificationSaving] = useState(false);
  const [dicServiceSectionsOpen, setDicServiceSectionsOpen] = useState({ appointment: true, additionalAppointment: false, probation: true, contract: true });
  const [objAlertDialog, setObjAlertDialog] = useState({
    blnOpen: false,
    strMessage: "",
    strSeverity: "success" as "success" | "error",
    strTitle: "",
  });
  const [strEmployeeAvatarUrl, setStrEmployeeAvatarUrl] = useState("");
  const [blnAvatarUpdating, setBlnAvatarUpdating] = useState(false);
  const [blnAvatarRemoveDialogOpen, setBlnAvatarRemoveDialogOpen] = useState(false);
  const [strAvatarError, setStrAvatarError] = useState("");
  const objLastFocusedFieldRef = useRef<HTMLElement | null>(null);
  const dicFieldRefs: Partial<Record<keyof EmployeeFormValues | keyof EmployeeAddressFormValues | keyof EmployeeBankFormValues, RefObject<HTMLInputElement | null>>> = {
    strEmployeeCode: useRef<HTMLInputElement | null>(null),
    strFirstName: useRef<HTMLInputElement | null>(null),
    dtDateOfJoining: useRef<HTMLInputElement | null>(null),
    intEmploymentTypeID: useRef<HTMLInputElement | null>(null),
    intLocationID: useRef<HTMLInputElement | null>(null),
    intManagerEmployeeID: useRef<HTMLInputElement | null>(null),
    intLineManagerEmployeeID: useRef<HTMLInputElement | null>(null),
    strWorkEmail: useRef<HTMLInputElement | null>(null),
    strPersonalEmail: useRef<HTMLInputElement | null>(null),
    strMobileNumber: useRef<HTMLInputElement | null>(null),
    strAddressLine1: useRef<HTMLInputElement | null>(null),
    intCountryID: useRef<HTMLInputElement | null>(null),
    intBankID: useRef<HTMLInputElement | null>(null),
    strAccountHolderName: useRef<HTMLInputElement | null>(null),
    strAccountNumber: useRef<HTMLInputElement | null>(null),
    intSecondaryBankID: useRef<HTMLInputElement | null>(null),
    strSecondaryAccountHolderName: useRef<HTMLInputElement | null>(null),
    strSecondaryAccountNumber: useRef<HTMLInputElement | null>(null)
  };

  const blnCanView = canViewAny() || canDoAny("list");
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanDelete = canDoAny("delete");
  // Preserve the existing editor by default while action rights are loading or
  // unavailable. Once rights load successfully, each tab follows its action.
  const blnCanViewBankDetails = blnRightsLoading || Boolean(strRightsError) || canDoAny("view_bank_details");
  const blnCanViewStatutoryDetails = blnRightsLoading || Boolean(strRightsError) || canDoAny("view_statutory_details");
  const lstVisibleTabOrder = useMemo(
    () => lstTabOrder.filter((strTabKey) => (
      (strTabKey !== "bankDetails" || blnCanViewBankDetails)
      && (strTabKey !== "statutory" || blnCanViewStatutoryDetails)
    )),
    [blnCanViewBankDetails, blnCanViewStatutoryDetails]
  );
  const strVisibleActiveTab = lstVisibleTabOrder.includes(strActiveTab)
    ? strActiveTab
    : (lstVisibleTabOrder[0] ?? "basicInfo");
  const blnCanSaveEmployee = strMode === "add" ? blnCanAdd : blnCanEdit;
  const blnViewOnly = strMode === "view" || !blnCanSaveEmployee;
  const blnAnySaving = blnBasicSaving || blnAddressSaving || blnBankSaving || blnStatutorySaving || blnExperienceSaving || blnQualificationSaving;
  const objEmployeeRequestOptions = useMemo(
    () => (strMenuActionOverride ? { strMenuAction: strMenuActionOverride } : undefined),
    [strMenuActionOverride]
  );
  const strDisplayEmployeeName = [dicBasicForm.strFirstName, dicBasicForm.strMiddleName, dicBasicForm.strLastName].filter(Boolean).join(" ").trim();
  const strBreadcrumbCurrent = strMode === "add"
    ? t("breadcrumb_add", "Add")
    : strDisplayEmployeeName || t("breadcrumb_employee", "Employee");
  const strAuthenticatedAvatarUrl = useAuthenticatedAvatar(strEmployeeAvatarUrl);

  function getFooterActionConfig() {
    if (blnViewOnly) {
      return null;
    }

    return {
      fnOnClick: handleSaveAll,
      blnDisabled: blnAnySaving,
      strLabel: blnAnySaving ? t("saving", "Saving...") : t("save", "Save"),
    };
  }

  function buildBasicFormForSave(blnIsPartialSave: boolean): EmployeeFormValues {
    return {
      ...dicBasicForm,
      blnIsPartialSave,
    };
  }

  function buildBasicFormForPartialSave(): EmployeeFormValues {
    const intDefaultEmploymentTypeID = dicBasicForm.intEmploymentTypeID || objFormOptions?.lstEmploymentTypes?.[0]?.intID || "";
    const intDefaultLocationID = dicBasicForm.intLocationID || objFormOptions?.lstLocations?.[0]?.intID || "";

    if (intDefaultEmploymentTypeID === "" || intDefaultLocationID === "") {
      throw new Error(t("basic_defaults_missing", "Employment Type and Location master options are required before saving employee details."));
    }

    return {
      ...dicBasicForm,
      strEmployeeCode: dicBasicForm.strEmployeeCode.trim() || buildPartialEmployeeCode(),
      strFirstName: dicBasicForm.strFirstName.trim() || t("partial_employee_name", "Partial Employee"),
      dtDateOfJoining: dicBasicForm.dtDateOfJoining || getTodayDateString(),
      intEmploymentTypeID: intDefaultEmploymentTypeID,
      intLocationID: intDefaultLocationID,
      blnIsPartialSave: true,
    };
  }

  useEffect(() => {
    if (blnRightsLoading || (strMode !== "add" && !blnCanView && !blnCanEdit)) {
      setBlnLoading(false);
      return;
    }

    let blnMounted = true;

    async function loadScreenData() {
      setBlnLoading(true);
      try {
        const [lstEmployeeData, dicOptionData] = await Promise.all([
          strMode === "add" ? employeeService.getEmployees() : Promise.resolve([]),
          employeeService.getFormOptions(objEmployeeRequestOptions)
        ]);
        if (!blnMounted) {
          return;
        }

        setLstEmployees(lstEmployeeData);
        setObjFormOptions(dicOptionData);

        if ((strMode === "edit" || strMode === "view") && strEmployeeID) {
          const dicEmployee = await employeeService.getEmployeeById(strEmployeeID, objEmployeeRequestOptions);
          if (!blnMounted) {
            return;
          }

          // The record carries the internal id; every child request below uses that rather than
          // the public identifier from the URL.
          const intEmployeeID = dicEmployee.intID;
          setDicBasicForm(toEmployeeFormValues(dicEmployee));
          setStrEmployeeAvatarUrl(buildEmployeeAvatarUrl(intEmployeeID, dicEmployee.strProfilePhotoUrl));
          setIntResolvedEmployeeID(intEmployeeID);

          const lstChildResults = await Promise.allSettled([
            employeeService.getEmployeeAddress(intEmployeeID, objEmployeeRequestOptions),
            blnCanViewBankDetails
              ? employeeService.getEmployeeBankAccount(intEmployeeID, objEmployeeRequestOptions)
              : Promise.resolve(null),
            blnCanViewStatutoryDetails
              ? employeeService.getEmployeeStatutory(intEmployeeID, objEmployeeRequestOptions)
              : Promise.resolve(null),
            employeeService.getEmployeeExperiences(intEmployeeID, objEmployeeRequestOptions),
            employeeService.getEmployeeQualifications(intEmployeeID, objEmployeeRequestOptions),
            employeeService.getEmployeeFamilyDetails(intEmployeeID, objEmployeeRequestOptions)
          ]);

          if (!blnMounted) {
            return;
          }

          if (lstChildResults[0].status === "fulfilled") {
            setDicAddressForm(toEmployeeAddressFormValues(lstChildResults[0].value));
          }

          if (lstChildResults[1].status === "fulfilled" && lstChildResults[1].value) {
            setDicBankForm(toEmployeeBankFormValues(lstChildResults[1].value));
            setDicBankAccountMasks({
              primary: lstChildResults[1].value.strAccountNumberMasked ?? "",
              secondary: lstChildResults[1].value.strSecondaryAccountNumberMasked ?? ""
            });
          }

          if (lstChildResults[2].status === "fulfilled" && lstChildResults[2].value) {
            setDicStatutoryForm(toEmployeeStatutoryFormValues(lstChildResults[2].value));
          }

          if (lstChildResults[3].status === "fulfilled") {
            setLstExperienceRecords(lstChildResults[3].value);
          }

          if (lstChildResults[4].status === "fulfilled") {
            setLstQualificationRecords(lstChildResults[4].value);
          }

          if (lstChildResults[5].status === "fulfilled") {
            setLstFamilyRecords(lstChildResults[5].value);
          }
        }
      } catch (objError) {
        if (blnMounted) {
          openAlertDialog("error", objError instanceof Error ? objError.message : "Unable to load employee workspace.");
        }
      } finally {
        if (blnMounted) {
          setBlnLoading(false);
        }
      }
    }

    loadScreenData().catch(() => undefined);
    return () => {
      blnMounted = false;
    };
  }, [strEmployeeID, strMode, blnRightsLoading, blnCanView, blnCanEdit, blnCanViewBankDetails, blnCanViewStatutoryDetails, objEmployeeRequestOptions]);

  const lstManagerOptions = useMemo(
    () => (objFormOptions?.lstManagers ?? []).filter((dicOption) => dicOption.intID !== intResolvedEmployeeID),
    [intResolvedEmployeeID, objFormOptions]
  );

  function updateBasicField<TKey extends keyof EmployeeFormValues>(strField: TKey, objValue: EmployeeFormValues[TKey]) {
    setDicBasicErrors((dicPrevious) => ({ ...dicPrevious, [strField]: undefined }));
    setDicBasicForm((dicPrevious) => ({ ...dicPrevious, [strField]: objValue }));
  }

  function renderOptionalEmployeeField(strField: keyof EmployeeFormValues, strLabel: string, strType = "text") {
    const dicLookupOptions: Partial<Record<keyof EmployeeFormValues, Array<{ intID: number; strLabel: string; strCode?: string }>>> = {
      strBloodGroup: objFormOptions?.lstBloodGroups ?? [],
      strReligion: objFormOptions?.lstReligions ?? [],
      strMaritalStatus: objFormOptions?.lstMaritalStatuses ?? [],
      strEntryMode: objFormOptions?.lstEntryModes ?? [],
      strJobType: objFormOptions?.lstJobTypes ?? [],
      strConfirmationType: objFormOptions?.lstConfirmationTypes ?? [],
      strRestDay: objFormOptions?.lstRestDays ?? [],
      strEmployeeFunction: objFormOptions?.lstEmployeeFunctions ?? [],
      strEmployeeCategory: objFormOptions?.lstEmployeeCategories ?? [],
      strPaymentType: objFormOptions?.lstPaymentTypes ?? [],
    };
    const lstLookupOptions = dicLookupOptions[strField];
    if (lstLookupOptions) {
      return (
        <Box key={strField}>
          {renderLookupCodeSearchableField(
            strLabel,
            String(dicBasicForm[strField] ?? ""),
            (strValue) => updateBasicField(strField, strValue as never),
            lstLookupOptions,
            blnViewOnly,
          )}
        </Box>
      );
    }

    return (
      <TextField
        key={strField}
        data-controlid={`employee.editor.${String(strField)}.input`}
        data-control-id={`employee.editor.${String(strField)}.input`}
        type={strType}
        label={strLabel}
        placeholder={strType === "date" ? undefined : t(`placeholder_${String(strField)}`, `Enter ${strLabel.toLowerCase()}`)}
        size="small"
        value={String(dicBasicForm[strField] ?? "")}
        onChange={(objEvent) => updateBasicField(strField, objEvent.target.value as never)}
        InputLabelProps={strType === "date" ? { shrink: true } : undefined}
        inputProps={strType === "number"
          ? { min: 0 }
          : (strField === "strSwon" || strField === "strPrefixLogic")
            ? { maxLength: 100 }
            : undefined}
        error={Boolean(dicBasicErrors[strField])}
        helperText={dicBasicErrors[strField]}
        disabled={blnViewOnly}
        fullWidth
      />
    );
  }

  function updateReportingManagerField(intManagerEmployeeID: number | "") {
    setDicBasicErrors((dicPrevious) => ({
      ...dicPrevious,
      intManagerEmployeeID: undefined,
      intLineManagerEmployeeID: undefined,
    }));
    setDicBasicForm((dicPrevious) => ({
      ...dicPrevious,
      intManagerEmployeeID,
      intLineManagerEmployeeID: dicPrevious.intLineManagerEmployeeID || intManagerEmployeeID,
    }));
  }

  function updateAddressField<TKey extends keyof EmployeeAddressFormValues>(strField: TKey, objValue: EmployeeAddressFormValues[TKey]) {
    setDicAddressErrors((dicPrevious) => ({ ...dicPrevious, [strField]: undefined }));
    setDicAddressForm((dicPrevious) => ({ ...dicPrevious, [strField]: objValue }));
  }

  function updateBankField<TKey extends keyof EmployeeBankFormValues>(strField: TKey, objValue: EmployeeBankFormValues[TKey]) {
    setDicBankErrors((dicPrevious) => ({ ...dicPrevious, [strField]: undefined }));
    setDicBankForm((dicPrevious) => ({ ...dicPrevious, [strField]: objValue }));
  }

  function renderBankAccountListItem(strAccount: "primary" | "secondary") {
    const blnPrimary = strAccount === "primary";
    const intBankID = blnPrimary ? dicBankForm.intBankID : dicBankForm.intSecondaryBankID;
    const strBankName = objFormOptions?.lstBanks.find((objBank) => objBank.intID === intBankID)?.strLabel
      || (blnPrimary ? t("primary_bank_details", "Primary bank account") : t("field_secondary_bank_details", "Secondary bank account"));
    const strAccountNumber = blnPrimary ? dicBankForm.strAccountNumber : dicBankForm.strSecondaryAccountNumber;
    const strSavedMask = blnPrimary ? dicBankAccountMasks.primary : dicBankAccountMasks.secondary;
    const blnActive = blnPrimary ? dicBankForm.blnIsActive : dicBankForm.blnSecondaryIsActive;
    const blnSelected = strSelectedBankAccount === strAccount;

    return (
      <Box
        key={strAccount}
        component="button"
        type="button"
        data-control-id={`employee.editor.bank-${strAccount}.button`}
        aria-pressed={blnSelected}
        onClick={() => {
          setStrSelectedBankAccount(strAccount);
          setBlnBankAccountNumberVisible(false);
        }}
        sx={{
          display: "flex", alignItems: "center", gap: 1.25, width: "100%", p: 1.2, textAlign: "left", cursor: "pointer",
          border: "1px solid", borderColor: blnSelected ? "#9bc1ff" : "#e2e8f0", borderRadius: "8px",
          bgcolor: blnSelected ? "#f2f7ff" : "#fff", color: "#334155", font: "inherit",
          "&:hover": { bgcolor: "#f2f7ff" }, "&:focus-visible": { outline: "2px solid #3678ed", outlineOffset: 2 }
        }}
      >
        <AccountBalanceOutlinedIcon sx={{ fontSize: 22, color: "#72819a", flexShrink: 0 }} />
        <Box component="span" sx={{ display: "block", minWidth: 0, flex: 1 }}>
          <Typography component="span" sx={{ display: "block", fontSize: 13, fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{strBankName}</Typography>
          <Typography component="span" sx={{ display: "block", fontSize: 11, color: "#64748b" }}>{maskBankAccountNumber(strAccountNumber, strSavedMask)}</Typography>
        </Box>
        <Box component="span" sx={{ px: 0.9, py: 0.35, borderRadius: "12px", bgcolor: blnPrimary && dicBankForm.blnIsPrimary ? "#e6f0ff" : blnActive ? "#e8f7ed" : "#f1f3f6", color: blnPrimary && dicBankForm.blnIsPrimary ? "#3270d3" : blnActive ? "#258148" : "#697586", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
          {blnPrimary && dicBankForm.blnIsPrimary ? t("primary", "Primary") : blnActive ? t("active", "Active") : t("inactive", "Inactive")}
        </Box>
      </Box>
    );
  }

  function updateStatutoryField<TKey extends keyof EmployeeStatutoryFormValues>(strField: TKey, objValue: EmployeeStatutoryFormValues[TKey]) {
    setDicStatutoryErrors((dicPrevious) => ({ ...dicPrevious, [strField]: undefined }));
    setDicStatutoryForm((dicPrevious) => ({ ...dicPrevious, [strField]: objValue }));
  }

  function updateExperienceField<TKey extends keyof EmployeeExperienceFormValues>(strField: TKey, objValue: EmployeeExperienceFormValues[TKey]) {
    setDicExperienceErrors((dicPrevious) => ({ ...dicPrevious, [strField]: undefined }));
    setDicExperienceForm((dicPrevious) => ({ ...dicPrevious, [strField]: objValue }));
  }

  function updateQualificationField<TKey extends keyof EmployeeQualificationFormValues>(strField: TKey, objValue: EmployeeQualificationFormValues[TKey]) {
    setDicQualificationErrors((dicPrevious) => ({ ...dicPrevious, [strField]: undefined }));
    setDicQualificationForm((dicPrevious) => ({ ...dicPrevious, [strField]: objValue }));
  }

  function handleEditorFocusCapture(objEvent: FocusEvent<HTMLElement>) {
    const objTarget = objEvent.target as HTMLElement;
    if (!objTarget) {
      return;
    }
    const strTagName = objTarget.tagName;
    if (strTagName === "INPUT" || strTagName === "TEXTAREA" || objTarget.getAttribute("role") === "combobox") {
      objLastFocusedFieldRef.current = objTarget;
    }
  }

  function openAlertDialog(strSeverity: "success" | "error", strMessage: string, strTitle = "") {
    setObjAlertDialog({
      blnOpen: true,
      strMessage,
      strSeverity,
      strTitle,
    });
  }

  async function handleAvatarUpload(objEvent: ChangeEvent<HTMLInputElement>) {
    const objFile = objEvent.target.files?.[0];
    objEvent.target.value = "";
    if (!objFile || !intResolvedEmployeeID) {
      return;
    }

    setStrAvatarError("");

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
      const objAvatarResult = await authApiService.uploadCurrentAvatar(objFile, intResolvedEmployeeID);
      setStrEmployeeAvatarUrl(buildEmployeeAvatarUrl(intResolvedEmployeeID, objAvatarResult.Data?.strProfilePhotoUrl));
      window.dispatchEvent(new CustomEvent("hrms:avatar-refresh"));
    } catch (objError: unknown) {
      setStrAvatarError(objError instanceof Error ? objError.message : t("error_upload_photo", "Unable to upload profile photo."));
    } finally {
      setBlnAvatarUpdating(false);
    }
  }

  async function handleAvatarRemove() {
    if (!intResolvedEmployeeID || blnAvatarUpdating) return;
    setBlnAvatarUpdating(true);
    setStrAvatarError("");
    try {
      await authApiService.deleteCurrentAvatar(intResolvedEmployeeID);
      setStrEmployeeAvatarUrl("");
      setBlnAvatarRemoveDialogOpen(false);
      window.dispatchEvent(new CustomEvent("hrms:avatar-refresh"));
    } catch (objError: unknown) {
      setStrAvatarError(objError instanceof Error ? objError.message : t("error_remove_photo", "Unable to remove profile photo."));
    } finally {
      setBlnAvatarUpdating(false);
    }
  }

  function closeAlertDialog(_: Event | SyntheticEvent, strReason?: string) {
    if (strReason === "clickaway") {
      return;
    }
    setObjAlertDialog((objPrevious) => ({ ...objPrevious, blnOpen: false }));
    window.requestAnimationFrame(() => {
      objLastFocusedFieldRef.current?.focus();
    });
  }

  function validateAddressForm() {
    const dicNextErrors: Partial<Record<keyof EmployeeAddressFormValues, string>> = {};
    if (!dicAddressForm.strAddressLine1.trim()) {
      dicNextErrors.strAddressLine1 = t("validation_address_line1_required", dicConstant.employeeMaster.validation.addressLine1Required);
    }
    if (dicAddressForm.intCountryID === "") {
      dicNextErrors.intCountryID = t("validation_country_required", dicConstant.employeeMaster.validation.countryRequired);
    }
    setDicAddressErrors(dicNextErrors);
    return dicNextErrors;
  }

  function validateBankForm() {
    const dicNextErrors: Partial<Record<keyof EmployeeBankFormValues, string>> = {};
    if (dicBankForm.intBankID === "") {
      dicNextErrors.intBankID = t("validation_bank_required", dicConstant.employeeMaster.validation.bankRequired);
    }
    if (!dicBankForm.strAccountHolderName.trim()) {
      dicNextErrors.strAccountHolderName = t("validation_account_holder_required", dicConstant.employeeMaster.validation.accountHolderRequired);
    }
    if (!dicBankForm.strAccountNumber.trim() && !dicBankAccountMasks.primary) {
      dicNextErrors.strAccountNumber = t("validation_account_number_required", dicConstant.employeeMaster.validation.accountNumberRequired);
    }
    if (dicBankForm.blnSecondaryIsActive) {
      if (dicBankForm.intSecondaryBankID === "") {
        dicNextErrors.intSecondaryBankID = t("validation_secondary_bank_required", dicConstant.employeeMaster.validation.secondaryBankRequired);
      }
      if (!dicBankForm.strSecondaryAccountHolderName.trim()) {
        dicNextErrors.strSecondaryAccountHolderName = t("validation_secondary_account_holder_required", dicConstant.employeeMaster.validation.secondaryAccountHolderRequired);
      }
      if (!dicBankForm.strSecondaryAccountNumber.trim() && !dicBankAccountMasks.secondary) {
        dicNextErrors.strSecondaryAccountNumber = t("validation_secondary_account_number_required", dicConstant.employeeMaster.validation.secondaryAccountNumberRequired);
      }
    }
    setDicBankErrors(dicNextErrors);
    return dicNextErrors;
  }

  function validateStatutoryForm() {
    const dicNextErrors: Partial<Record<keyof EmployeeStatutoryFormValues, string>> = {};
    if (dicStatutoryForm.blnPfApplicable && !dicStatutoryForm.strPfNumber.trim()) {
      dicNextErrors.strPfNumber = t("validation_pf_number_required", dicConstant.employeeMaster.validation.pfNumberRequired);
    }
    if (dicStatutoryForm.blnEsiApplicable && !dicStatutoryForm.strEsiNumber.trim()) {
      dicNextErrors.strEsiNumber = t("validation_esi_number_required", dicConstant.employeeMaster.validation.esiNumberRequired);
    }
    setDicStatutoryErrors(dicNextErrors);
    return dicNextErrors;
  }

  function validateBasicFormForSave() {
    const dicValidationErrors = validateEmployeeForm(
      dicBasicForm,
      lstEmployees.map((dicEmployee) => ({ intID: dicEmployee.intID, strEmployeeCode: dicEmployee.strEmployeeCode })),
      intResolvedEmployeeID,
      {
        employeeCodeRequired: t("validation_employee_code_required", dicConstant.employeeMaster.validation.employeeCodeRequired),
        employeeCodeFormat: t("validation_employee_code_format", dicConstant.employeeMaster.validation.employeeCodeFormat),
        employeeCodeDuplicate: t("validation_employee_code_duplicate", dicConstant.employeeMaster.validation.employeeCodeDuplicate),
        firstNameRequired: t("validation_first_name_required", dicConstant.employeeMaster.validation.firstNameRequired),
        joiningDateRequired: t("validation_joining_date_required", dicConstant.employeeMaster.validation.joiningDateRequired),
        employmentTypeRequired: t("validation_employment_type_required", dicConstant.employeeMaster.validation.employmentTypeRequired),
        locationRequired: t("validation_location_required", dicConstant.employeeMaster.validation.locationRequired),
        reportingManagerRequired: t("validation_reporting_manager_required", dicConstant.employeeMaster.validation.reportingManagerRequired),
        lineManagerRequired: t("validation_line_manager_required", dicConstant.employeeMaster.validation.lineManagerRequired),
        workEmailRequired: t("validation_work_email_required", dicConstant.employeeMaster.validation.workEmailRequired),
        workEmailInvalid: t("validation_work_email_invalid", dicConstant.employeeMaster.validation.workEmailInvalid),
        personalEmailInvalid: t("validation_personal_email_invalid", dicConstant.employeeMaster.validation.personalEmailInvalid),
        mobileNumberInvalid: t("validation_mobile_number_invalid", dicConstant.employeeMaster.validation.mobileNumberInvalid),
        birthDateInvalid: t("validation_birth_date_invalid", dicConstant.employeeMaster.validation.birthDateInvalid),
        exitDateInvalid: t("validation_exit_date_invalid", dicConstant.employeeMaster.validation.exitDateInvalid),
      }
    );
    setDicBasicErrors(dicValidationErrors);
    return dicValidationErrors;
  }

  function hasAddressData() {
    return Boolean(
      dicAddressForm.strAddressLine1.trim() ||
      dicAddressForm.strAddressLine2.trim() ||
      dicAddressForm.strCityName.trim() ||
      dicAddressForm.intStateID !== "" ||
      dicAddressForm.strPostalCode.trim() ||
      dicAddressForm.intCountryID !== ""
    );
  }

  function hasBankData() {
    return Boolean(
      dicBankForm.intBankID !== "" ||
      dicBankForm.strAccountHolderName.trim() ||
      dicBankForm.strAccountNumber.trim() ||
      dicBankForm.strIfscCode.trim() ||
      dicBankForm.strSwiftCode.trim() ||
      dicBankForm.blnSecondaryIsActive ||
      dicBankForm.intSecondaryBankID !== "" ||
      dicBankForm.strSecondaryAccountHolderName.trim() ||
      dicBankForm.strSecondaryAccountNumber.trim() ||
      dicBankForm.strSecondaryIfscCode.trim()
    );
  }

  function hasStatutoryData() {
    return Boolean(
      dicStatutoryForm.strPanNumber.trim() ||
      dicStatutoryForm.strUanNumber.trim() ||
      dicStatutoryForm.strEsiNumber.trim() ||
      dicStatutoryForm.strPfNumber.trim() ||
      dicStatutoryForm.strTaxRegimeCode.trim() ||
      dicStatutoryForm.strGratuityNumber.trim() ||
      dicStatutoryForm.strEsiCode.trim() ||
      dicStatutoryForm.strSsnNumber.trim() ||
      dicStatutoryForm.strPranNumber.trim() ||
      dicStatutoryForm.strPtRegistrationNumber.trim() ||
      dicStatutoryForm.blnPfApplicable ||
      dicStatutoryForm.blnEsiApplicable ||
      dicStatutoryForm.blnPtApplicable
    );
  }

  function validateExperienceForm() {
    const dicNextErrors: Partial<Record<keyof EmployeeExperienceFormValues, string>> = {};
    if (!dicExperienceForm.strCompanyName.trim()) {
      dicNextErrors.strCompanyName = t("validation_company_name_required", "Company name is required.");
    }
    if (!dicExperienceForm.strJobTitle.trim()) {
      dicNextErrors.strJobTitle = t("validation_job_title_required", "Job title is required.");
    }
    if (!dicExperienceForm.dtFromDate) {
      dicNextErrors.dtFromDate = t("validation_from_date_required", "From date is required.");
    }
    if (dicExperienceForm.dtToDate && dicExperienceForm.dtFromDate && dicExperienceForm.dtFromDate > dicExperienceForm.dtToDate) {
      dicNextErrors.dtToDate = t("validation_experience_dates", "From date must be less than or equal to To date.");
    }
    if (dicExperienceForm.decLastDrawnSalary.trim() && Number.isNaN(Number(dicExperienceForm.decLastDrawnSalary))) {
      dicNextErrors.decLastDrawnSalary = t("validation_last_salary_invalid", "Last drawn salary must be a valid number.");
    }
    setDicExperienceErrors(dicNextErrors);
    window.requestAnimationFrame(() => {
      focusFirstError(dicNextErrors, dicExperienceFieldRefs, [
        "strCompanyName", "strJobTitle", "dtFromDate", "dtToDate", "decLastDrawnSalary",
      ]);
    });
    return dicNextErrors;
  }

  function validateQualificationForm() {
    const dicNextErrors: Partial<Record<keyof EmployeeQualificationFormValues, string>> = {};
    const intCurrentYear = new Date().getFullYear();
    const intYearOfPassing = dicQualificationForm.intYearOfPassing.trim() ? Number(dicQualificationForm.intYearOfPassing) : NaN;

    if (!dicQualificationForm.strDegreeName.trim()) {
      dicNextErrors.strDegreeName = t("validation_degree_required", "Degree name is required.");
    }
    if (!dicQualificationForm.strInstitutionName.trim()) {
      dicNextErrors.strInstitutionName = t("validation_institution_required", "Institution name is required.");
    }
    if (!dicQualificationForm.intYearOfPassing.trim()) {
      dicNextErrors.intYearOfPassing = t("validation_year_of_passing_required", "Year of passing is required.");
    } else if (!Number.isInteger(intYearOfPassing) || intYearOfPassing < 1900 || intYearOfPassing > intCurrentYear) {
      dicNextErrors.intYearOfPassing = t("validation_year_of_passing_invalid", "Year of passing must not be in the future.");
    }
    setDicQualificationErrors(dicNextErrors);
    window.requestAnimationFrame(() => {
      const strFirstErrorField = (["strDegreeName", "strInstitutionName", "intYearOfPassing"] as const)
        .find((strField) => Boolean(dicNextErrors[strField]));
      const objField = strFirstErrorField ? document.getElementById(`qualification-${strFirstErrorField}`) : null;
      objField?.scrollIntoView({ behavior: "smooth", block: "center" });
      objField?.focus({ preventScroll: true });
    });
    return dicNextErrors;
  }

  function validateCommonEmployeeFields() {
    const dicNextErrors: Partial<Record<keyof EmployeeFormValues, string>> = {};
    const strEmployeeCode = dicBasicForm.strEmployeeCode.trim().toUpperCase();

    if (!strEmployeeCode) {
      dicNextErrors.strEmployeeCode = t("validation_employee_code_required", dicConstant.employeeMaster.validation.employeeCodeRequired);
    } else if (!/^[A-Z0-9/_-]{2,50}$/.test(strEmployeeCode)) {
      dicNextErrors.strEmployeeCode = t("validation_employee_code_format", dicConstant.employeeMaster.validation.employeeCodeFormat);
    } else if (lstEmployees.some((dicEmployee) => dicEmployee.strEmployeeCode.toUpperCase() === strEmployeeCode && dicEmployee.intID !== intResolvedEmployeeID)) {
      dicNextErrors.strEmployeeCode = t("validation_employee_code_duplicate", dicConstant.employeeMaster.validation.employeeCodeDuplicate);
    }

    if (!dicBasicForm.strFirstName.trim()) {
      dicNextErrors.strFirstName = t("validation_first_name_required", dicConstant.employeeMaster.validation.firstNameRequired);
    }

    setDicBasicErrors((dicPrevious) => ({
      ...dicPrevious,
      strEmployeeCode: dicNextErrors.strEmployeeCode,
      strFirstName: dicNextErrors.strFirstName,
    }));

    return dicNextErrors;
  }

  async function ensureEmployeeRecordForTabSave() {
    const dicValidationErrors = validateCommonEmployeeFields();
    if (Object.keys(dicValidationErrors).length > 0) {
      setStrActiveTab("basicInfo");
      focusFirstError(dicValidationErrors, dicFieldRefs, ["strEmployeeCode", "strFirstName"]);
      throw new Error(t("common_panel_required", "Enter Employee Code and First Name in the common panel before saving other tabs."));
    }

    const intDefaultEmploymentTypeID = dicBasicForm.intEmploymentTypeID || objFormOptions?.lstEmploymentTypes?.[0]?.intID || "";
    const intDefaultLocationID = dicBasicForm.intLocationID || objFormOptions?.lstLocations?.[0]?.intID || "";

    if (intDefaultEmploymentTypeID === "" || intDefaultLocationID === "") {
      setStrActiveTab("basicInfo");
      throw new Error(t("basic_defaults_missing", "Employment Type and Location master options are required before saving employee details."));
    }

    const dicDraftBasicForm: EmployeeFormValues = {
      ...dicBasicForm,
      strEmployeeCode: dicBasicForm.strEmployeeCode.trim().toUpperCase(),
      strFirstName: dicBasicForm.strFirstName.trim(),
      strMiddleName: dicBasicForm.strMiddleName.trim(),
      strLastName: dicBasicForm.strLastName.trim(),
      dtDateOfJoining: dicBasicForm.dtDateOfJoining || getTodayDateString(),
      intEmploymentTypeID: intDefaultEmploymentTypeID,
      intLocationID: intDefaultLocationID,
    };

    const dicSavedEmployee = intResolvedEmployeeID
      ? await employeeService.updateEmployee(intResolvedEmployeeID, dicDraftBasicForm, objEmployeeRequestOptions)
      : await employeeService.createEmployee(dicDraftBasicForm);
    setIntResolvedEmployeeID(dicSavedEmployee.intID);
    setDicBasicForm(toEmployeeFormValues(dicSavedEmployee));
    if (!intResolvedEmployeeID && strMode === "add") {
      objRouter.replace(`/employees/edit/${dicSavedEmployee.strRecordUUID}`);
    }
    return dicSavedEmployee.intID;
  }

  async function handleBasicSave() {
    if (blnViewOnly) {
      return;
    }
    const dicValidationErrors = validateBasicFormForSave();
    if (Object.keys(dicValidationErrors).length > 0) {
      setStrActiveTab("basicInfo");
      focusFirstError(dicValidationErrors, dicFieldRefs, [
        "strEmployeeCode",
        "strFirstName",
        "dtDateOfJoining",
        "intEmploymentTypeID",
        "intLocationID",
        "intManagerEmployeeID",
        "intLineManagerEmployeeID"
      ]);
      return;
    }

    setBlnBasicSaving(true);
    try {
      const dicFormToSave = buildBasicFormForSave(false);
      const dicSavedEmployee = strMode === "add" && intResolvedEmployeeID === null
        ? await employeeService.createEmployee(dicFormToSave)
        : await employeeService.updateEmployee(intResolvedEmployeeID as number, dicFormToSave, objEmployeeRequestOptions);
      setIntResolvedEmployeeID(dicSavedEmployee.intID);
      setDicBasicForm(toEmployeeFormValues(dicSavedEmployee));
      openAlertDialog("success", strMode === "add" && strEmployeeID === undefined ? t("save_success", dicConstant.employeeMaster.saveSuccess) : t("update_success", dicConstant.employeeMaster.updateSuccess));
      if (strMode === "add") {
        objRouter.replace(`/employees/edit/${dicSavedEmployee.strRecordUUID}`);
      }
    } catch (objError) {
      openAlertDialog("error", objError instanceof Error ? objError.message : t("error_save_employee", "Unable to save employee."));
    } finally {
      setBlnBasicSaving(false);
    }
  }

  async function handleSaveAll() {
    if (blnViewOnly || blnAnySaving) {
      return;
    }

    const dicBasicValidationErrors = validateBasicFormForSave();
    if (Object.keys(dicBasicValidationErrors).length > 0) {
      const lstAddressContactFields: Array<keyof EmployeeFormValues> = ["strWorkEmail", "strPersonalEmail", "strMobileNumber"];
      const blnHasBasicTabError = Object.keys(dicBasicValidationErrors).some(
        (strField) => !lstAddressContactFields.includes(strField as keyof EmployeeFormValues)
      );
      setStrActiveTab(blnHasBasicTabError ? "basicInfo" : "address");
      window.requestAnimationFrame(() => {
        focusFirstError(
          dicBasicValidationErrors,
          dicFieldRefs,
          blnHasBasicTabError
            ? ["strEmployeeCode", "strFirstName", "dtDateOfJoining", "intEmploymentTypeID", "intLocationID", "intManagerEmployeeID", "intLineManagerEmployeeID"]
            : lstAddressContactFields
        );
      });
      return;
    }

    if (hasAddressData()) {
      const dicValidationErrors = validateAddressForm();
      if (Object.keys(dicValidationErrors).length > 0) {
        setStrActiveTab("address");
        window.requestAnimationFrame(() => {
          focusFirstError(dicValidationErrors, dicFieldRefs, ["strAddressLine1", "intCountryID"]);
        });
        return;
      }
    } else {
      setDicAddressErrors({});
    }

    if (blnCanViewBankDetails && hasBankData()) {
      const dicValidationErrors = validateBankForm();
      if (Object.keys(dicValidationErrors).length > 0) {
        setStrActiveTab("bankDetails");
        window.requestAnimationFrame(() => {
          focusFirstError(dicValidationErrors, dicFieldRefs, ["intBankID", "strAccountHolderName", "strAccountNumber", "intSecondaryBankID", "strSecondaryAccountHolderName", "strSecondaryAccountNumber"]);
        });
        return;
      }
    } else {
      setDicBankErrors({});
    }

    if (blnCanViewStatutoryDetails && hasStatutoryData()) {
      const dicValidationErrors = validateStatutoryForm();
      if (Object.keys(dicValidationErrors).length > 0) {
        setStrActiveTab("statutory");
        return;
      }
    } else {
      setDicStatutoryErrors({});
    }

    if (blnAddingExperience || intEditingExperienceID) {
      const dicValidationErrors = validateExperienceForm();
      if (Object.keys(dicValidationErrors).length > 0) {
        setStrActiveTab("experience");
        return;
      }
    }

    if (blnAddingQualification || intEditingQualificationID) {
      const dicValidationErrors = validateQualificationForm();
      if (Object.keys(dicValidationErrors).length > 0) {
        setStrActiveTab("qualification");
        return;
      }
    }

    setBlnBasicSaving(true);
    setBlnAddressSaving(hasAddressData());
    setBlnBankSaving(blnCanViewBankDetails && hasBankData());
    setBlnStatutorySaving(blnCanViewStatutoryDetails && hasStatutoryData());
    setBlnExperienceSaving(blnAddingExperience || Boolean(intEditingExperienceID));
    setBlnQualificationSaving(blnAddingQualification || Boolean(intEditingQualificationID));

    try {
      const dicFormToSave = buildBasicFormForSave(false);
      const dicSavedEmployee = strMode === "add" && intResolvedEmployeeID === null
        ? await employeeService.createEmployee(dicFormToSave)
        : await employeeService.updateEmployee(intResolvedEmployeeID as number, dicFormToSave, objEmployeeRequestOptions);
      setIntResolvedEmployeeID(dicSavedEmployee.intID);
      setDicBasicForm(toEmployeeFormValues(dicSavedEmployee));

      if (hasAddressData()) {
        const dicRecord = await employeeService.saveEmployeeAddress(dicSavedEmployee.intID, dicAddressForm, objEmployeeRequestOptions);
        setDicAddressForm(toEmployeeAddressFormValues(dicRecord));
      }

      if (blnCanViewBankDetails && hasBankData()) {
        const dicRecord = await employeeService.saveEmployeeBankAccount(dicSavedEmployee.intID, dicBankForm, objEmployeeRequestOptions);
        setDicBankAccountMasks({ primary: dicRecord.strAccountNumberMasked ?? "", secondary: dicRecord.strSecondaryAccountNumberMasked ?? "" });
        setDicBankForm((dicPrevious) => ({
          ...toEmployeeBankFormValues(dicRecord),
          strAccountNumber: dicRecord.strAccountNumber ?? dicPrevious.strAccountNumber,
          strSecondaryAccountNumber: dicRecord.strSecondaryAccountNumber ?? dicPrevious.strSecondaryAccountNumber
        }));
      }

      if (blnCanViewStatutoryDetails && hasStatutoryData()) {
        const dicRecord = await employeeService.saveEmployeeStatutory(dicSavedEmployee.intID, dicStatutoryForm, objEmployeeRequestOptions);
        setDicStatutoryForm(toEmployeeStatutoryFormValues(dicRecord));
      }

      if (blnAddingExperience || intEditingExperienceID) {
        const dicRecord = intEditingExperienceID
          ? await employeeService.updateEmployeeExperience(dicSavedEmployee.intID, intEditingExperienceID, dicExperienceForm, objEmployeeRequestOptions)
          : await employeeService.createEmployeeExperience(dicSavedEmployee.intID, dicExperienceForm, objEmployeeRequestOptions);
        setLstExperienceRecords((lstPrevious) => {
          const lstWithoutCurrent = lstPrevious.filter((objItem) => objItem.intID !== dicRecord.intID);
          return [dicRecord, ...lstWithoutCurrent].sort((objA, objB) => {
            if (objA.blnIsActive !== objB.blnIsActive) {
              return Number(objB.blnIsActive) - Number(objA.blnIsActive);
            }
            return objA.dtFromDate < objB.dtFromDate ? 1 : -1;
          });
        });
        resetExperienceEditor();
      }

      if (blnAddingQualification || intEditingQualificationID) {
        const dicRecord = intEditingQualificationID
          ? await employeeService.updateEmployeeQualification(dicSavedEmployee.intID, intEditingQualificationID, dicQualificationForm, objEmployeeRequestOptions)
          : await employeeService.createEmployeeQualification(dicSavedEmployee.intID, dicQualificationForm, objEmployeeRequestOptions);
        setLstQualificationRecords((lstPrevious) => {
          const lstWithoutCurrent = lstPrevious.filter((objItem) => objItem.intID !== dicRecord.intID);
          return [dicRecord, ...lstWithoutCurrent].sort((objA, objB) => {
            if (objA.blnIsActive !== objB.blnIsActive) {
              return Number(objB.blnIsActive) - Number(objA.blnIsActive);
            }
            if (objA.blnIsHighestQualification !== objB.blnIsHighestQualification) {
              return Number(objB.blnIsHighestQualification) - Number(objA.blnIsHighestQualification);
            }
            return objB.intYearOfPassing - objA.intYearOfPassing;
          });
        });
        resetQualificationEditor();
      }

      openAlertDialog("success", strMode === "add" ? t("save_success", dicConstant.employeeMaster.saveSuccess) : t("update_success", dicConstant.employeeMaster.updateSuccess));
      if (strMode === "add") {
        objRouter.replace(`/employees/edit/${dicSavedEmployee.strRecordUUID}`);
      }
    } catch (objError) {
      openAlertDialog("error", objError instanceof Error ? objError.message : t("error_save_employee", "Unable to save employee."));
    } finally {
      setBlnBasicSaving(false);
      setBlnAddressSaving(false);
      setBlnBankSaving(false);
      setBlnStatutorySaving(false);
      setBlnExperienceSaving(false);
      setBlnQualificationSaving(false);
    }
  }

  async function handlePartialSave() {
    if (blnViewOnly || blnAnySaving) {
      return;
    }

    setDicBasicErrors({});
    setDicAddressErrors({});
    setDicBankErrors({});
    setDicStatutoryErrors({});
    setDicExperienceErrors({});
    setDicQualificationErrors({});
    setBlnBasicSaving(true);

    try {
      const dicFormToSave = buildBasicFormForPartialSave();
      const dicSavedEmployee = strMode === "add" && intResolvedEmployeeID === null
        ? await employeeService.createEmployee(dicFormToSave)
        : await employeeService.updateEmployee(intResolvedEmployeeID as number, dicFormToSave, objEmployeeRequestOptions);
      setIntResolvedEmployeeID(dicSavedEmployee.intID);
      setDicBasicForm(toEmployeeFormValues(dicSavedEmployee));
      openAlertDialog("success", t("partial_save_success", "Employee saved as partial."));
      if (strMode === "add") {
        objRouter.replace(`/employees/edit/${dicSavedEmployee.strRecordUUID}`);
      }
    } catch (objError) {
      openAlertDialog("error", objError instanceof Error ? objError.message : t("error_save_employee", "Unable to save employee."));
    } finally {
      setBlnBasicSaving(false);
    }
  }

  async function handleAddressSave() {
    if (blnViewOnly) {
      return;
    }
    const dicValidationErrors = validateAddressForm();
    if (Object.keys(dicValidationErrors).length > 0) {
      focusFirstError(dicValidationErrors, dicFieldRefs, ["strAddressLine1", "intCountryID"]);
      return;
    }
    setBlnAddressSaving(true);
    try {
      const intEmployeeIDToSave = await ensureEmployeeRecordForTabSave();
      const dicRecord = await employeeService.saveEmployeeAddress(intEmployeeIDToSave, dicAddressForm, objEmployeeRequestOptions);
      setDicAddressForm(toEmployeeAddressFormValues(dicRecord));
      openAlertDialog("success", t("address_save_success", dicConstant.employeeMaster.addressSaveSuccess));
    } catch (objError) {
      openAlertDialog("error", objError instanceof Error ? objError.message : t("error_save_address", "Unable to save employee address."));
    } finally {
      setBlnAddressSaving(false);
    }
  }

  async function handleBankSave() {
    if (blnViewOnly || !blnCanViewBankDetails) {
      return;
    }
    const dicValidationErrors = validateBankForm();
    if (Object.keys(dicValidationErrors).length > 0) {
      setStrSelectedBankAccount(dicValidationErrors.intBankID || dicValidationErrors.strAccountHolderName || dicValidationErrors.strAccountNumber ? "primary" : "secondary");
      window.requestAnimationFrame(() => focusFirstError(dicValidationErrors, dicFieldRefs, [
        "intBankID",
        "strAccountHolderName",
        "strAccountNumber",
        "intSecondaryBankID",
        "strSecondaryAccountHolderName",
        "strSecondaryAccountNumber"
      ]));
      return;
    }
    setBlnBankSaving(true);
    try {
      const intEmployeeIDToSave = await ensureEmployeeRecordForTabSave();
      const dicRecord = await employeeService.saveEmployeeBankAccount(intEmployeeIDToSave, dicBankForm, objEmployeeRequestOptions);
      setDicBankAccountMasks({ primary: dicRecord.strAccountNumberMasked ?? "", secondary: dicRecord.strSecondaryAccountNumberMasked ?? "" });
      setDicBankForm((dicPrevious) => ({
        ...toEmployeeBankFormValues(dicRecord),
        strAccountNumber: dicRecord.strAccountNumber ?? dicPrevious.strAccountNumber,
        strSecondaryAccountNumber: dicRecord.strSecondaryAccountNumber ?? dicPrevious.strSecondaryAccountNumber
      }));
      openAlertDialog("success", t("bank_save_success", dicConstant.employeeMaster.bankSaveSuccess));
    } catch (objError) {
      openAlertDialog("error", objError instanceof Error ? objError.message : t("error_save_bank", "Unable to save employee bank details."));
    } finally {
      setBlnBankSaving(false);
    }
  }

  async function handleStatutorySave() {
    if (blnViewOnly || !blnCanViewStatutoryDetails) {
      return;
    }
    const dicValidationErrors = validateStatutoryForm();
    if (Object.keys(dicValidationErrors).length > 0) {
      return;
    }
    setBlnStatutorySaving(true);
    try {
      const intEmployeeIDToSave = await ensureEmployeeRecordForTabSave();
      const dicRecord = await employeeService.saveEmployeeStatutory(intEmployeeIDToSave, dicStatutoryForm, objEmployeeRequestOptions);
      setDicStatutoryForm(toEmployeeStatutoryFormValues(dicRecord));
      setDicStatutoryErrors({});
      openAlertDialog("success", t("statutory_save_success", dicConstant.employeeMaster.statutorySaveSuccess));
    } catch (objError) {
      openAlertDialog("error", objError instanceof Error ? objError.message : t("error_save_statutory", "Unable to save employee statutory details."));
    } finally {
      setBlnStatutorySaving(false);
    }
  }

  function resetExperienceEditor() {
    setBlnAddingExperience(false);
    setIntEditingExperienceID(null);
    setDicExperienceForm(dicEmptyEmployeeExperienceForm);
    setDicExperienceErrors({});
  }

  function resetQualificationEditor() {
    setBlnAddingQualification(false);
    setIntEditingQualificationID(null);
    setDicQualificationForm(dicEmptyEmployeeQualificationForm);
    setDicQualificationErrors({});
  }

  function handleAddExperienceClick() {
    setBlnAddingExperience(true);
    setIntEditingExperienceID(null);
    setDicExperienceForm(dicEmptyEmployeeExperienceForm);
    setDicExperienceErrors({});
  }

  function handleAddQualificationClick() {
    setBlnAddingQualification(true);
    setIntEditingQualificationID(null);
    setDicQualificationForm(dicEmptyEmployeeQualificationForm);
    setDicQualificationErrors({});
  }

  function handleExperienceEdit(objRecord: EmployeeExperienceRecord) {
    setBlnAddingExperience(false);
    setIntEditingExperienceID(objRecord.intID);
    setDicExperienceForm(toEmployeeExperienceFormValues(objRecord));
    setDicExperienceErrors({});
  }

  function handleQualificationEdit(objRecord: EmployeeQualificationRecord) {
    setBlnAddingQualification(false);
    setIntEditingQualificationID(objRecord.intID);
    setDicQualificationForm(toEmployeeQualificationFormValues(objRecord));
    setDicQualificationErrors({});
  }

  async function handleExperienceSave() {
    if (blnViewOnly) {
      return;
    }
    const dicValidationErrors = validateExperienceForm();
    if (Object.keys(dicValidationErrors).length > 0) {
      return;
    }
    setBlnExperienceSaving(true);
    try {
      const intEmployeeIDToSave = await ensureEmployeeRecordForTabSave();
      const dicRecord = intEditingExperienceID
        ? await employeeService.updateEmployeeExperience(intEmployeeIDToSave, intEditingExperienceID, dicExperienceForm, objEmployeeRequestOptions)
        : await employeeService.createEmployeeExperience(intEmployeeIDToSave, dicExperienceForm, objEmployeeRequestOptions);
      setLstExperienceRecords((lstPrevious) => {
        const lstWithoutCurrent = lstPrevious.filter((objItem) => objItem.intID !== dicRecord.intID);
        return [dicRecord, ...lstWithoutCurrent].sort((objA, objB) => {
          if (objA.blnIsActive !== objB.blnIsActive) {
            return Number(objB.blnIsActive) - Number(objA.blnIsActive);
          }
          return objA.dtFromDate < objB.dtFromDate ? 1 : -1;
        });
      });
      resetExperienceEditor();
      openAlertDialog("success", t("experience_save_success", dicConstant.employeeMaster.experienceSaveSuccess ?? "Employee experience saved successfully."));
    } catch (objError) {
      openAlertDialog("error", objError instanceof Error ? objError.message : t("error_save_experience", "Unable to save employee experience."));
    } finally {
      setBlnExperienceSaving(false);
    }
  }

  async function handleQualificationSave() {
    if (blnViewOnly) {
      return;
    }
    const dicValidationErrors = validateQualificationForm();
    if (Object.keys(dicValidationErrors).length > 0) {
      return;
    }
    setBlnQualificationSaving(true);
    try {
      const intEmployeeIDToSave = await ensureEmployeeRecordForTabSave();
      const dicRecord = intEditingQualificationID
        ? await employeeService.updateEmployeeQualification(intEmployeeIDToSave, intEditingQualificationID, dicQualificationForm, objEmployeeRequestOptions)
        : await employeeService.createEmployeeQualification(intEmployeeIDToSave, dicQualificationForm, objEmployeeRequestOptions);
      setLstQualificationRecords((lstPrevious) => {
        const lstWithoutCurrent = lstPrevious.filter((objItem) => objItem.intID !== dicRecord.intID);
        return [dicRecord, ...lstWithoutCurrent].sort((objA, objB) => {
          if (objA.blnIsActive !== objB.blnIsActive) {
            return Number(objB.blnIsActive) - Number(objA.blnIsActive);
          }
          if (objA.blnIsHighestQualification !== objB.blnIsHighestQualification) {
            return Number(objB.blnIsHighestQualification) - Number(objA.blnIsHighestQualification);
          }
          return objB.intYearOfPassing - objA.intYearOfPassing;
        });
      });
      resetQualificationEditor();
      openAlertDialog("success", t("qualification_save_success", dicConstant.employeeMaster.qualificationSaveSuccess ?? "Employee qualification saved successfully."));
    } catch (objError) {
      openAlertDialog("error", objError instanceof Error ? objError.message : t("error_save_qualification", "Unable to save employee qualification."));
    } finally {
      setBlnQualificationSaving(false);
    }
  }

  function handleExperienceDeleteRequest(intExperienceID: number) {
    const objRecord = lstExperienceRecords.find((objItem) => objItem.intID === intExperienceID);
    setObjExperienceDeleteDialog({
      blnOpen: true,
      intExperienceID,
      strCompanyName: objRecord?.strCompanyName ?? ""
    });
  }

  function closeExperienceDeleteDialog() {
    setObjExperienceDeleteDialog({
      blnOpen: false,
      intExperienceID: null,
      strCompanyName: ""
    });
  }

  async function handleExperienceDelete() {
    if (blnViewOnly || !intResolvedEmployeeID) {
      return;
    }
    if (!objExperienceDeleteDialog.intExperienceID) {
      return;
    }
    try {
      const dicRecord = await employeeService.deleteEmployeeExperience(intResolvedEmployeeID, objExperienceDeleteDialog.intExperienceID);
      setLstExperienceRecords((lstPrevious) => lstPrevious.map((objItem) => (objItem.intID === dicRecord.intID ? dicRecord : objItem)));
      if (intEditingExperienceID === objExperienceDeleteDialog.intExperienceID) {
        resetExperienceEditor();
      }
      closeExperienceDeleteDialog();
      openAlertDialog("success", t("experience_delete_success", "Employee experience deleted successfully."));
    } catch (objError) {
      openAlertDialog("error", objError instanceof Error ? objError.message : t("error_delete_experience", "Unable to delete employee experience."));
    }
  }

  function handleQualificationDeleteRequest(intQualificationID: number) {
    const objRecord = lstQualificationRecords.find((objItem) => objItem.intID === intQualificationID);
    setObjQualificationDeleteDialog({
      blnOpen: true,
      intQualificationID,
      strDegreeName: objRecord?.strDegreeName ?? ""
    });
  }

  function closeQualificationDeleteDialog() {
    setObjQualificationDeleteDialog({
      blnOpen: false,
      intQualificationID: null,
      strDegreeName: ""
    });
  }

  async function handleQualificationDelete() {
    if (blnViewOnly || !intResolvedEmployeeID) {
      return;
    }
    if (!objQualificationDeleteDialog.intQualificationID) {
      return;
    }
    try {
      const dicRecord = await employeeService.deleteEmployeeQualification(intResolvedEmployeeID, objQualificationDeleteDialog.intQualificationID);
      setLstQualificationRecords((lstPrevious) => lstPrevious.map((objItem) => (objItem.intID === dicRecord.intID ? dicRecord : objItem)));
      if (intEditingQualificationID === objQualificationDeleteDialog.intQualificationID) {
        resetQualificationEditor();
      }
      closeQualificationDeleteDialog();
      openAlertDialog("success", t("qualification_delete_success", "Employee qualification deleted successfully."));
    } catch (objError) {
      openAlertDialog("error", objError instanceof Error ? objError.message : t("error_delete_qualification", "Unable to delete employee qualification."));
    }
  }

  function renderSelectField<TValue extends string | number | "">(
    objLabel: ReactNode,
    objValue: TValue,
    fnOnChange: (objValue: TValue) => void,
    lstOptions: Array<{ intID?: number; strLabel?: string; strCode?: string } | string>,
    blnDisabled = false,
    strHelperText?: string,
    blnError = false,
    objInputRef?: RefObject<HTMLInputElement | null>,
    strControlId?: string,
    strPlaceholder = "Select"
  ) {
    return (
      <TextField
        select
        className="app-mui-text-field"
        data-control-id={strControlId}
        inputProps={strControlId ? { "data-control-id": strControlId } : undefined}
        label={objLabel}
        size="small"
        inputRef={objInputRef}
        value={objValue}
        onChange={(objEvent) => fnOnChange((objEvent.target.value ? Number.isNaN(Number(objEvent.target.value)) ? objEvent.target.value : Number(objEvent.target.value) : "") as TValue)}
        disabled={blnDisabled}
        error={blnError}
        helperText={strHelperText}
        fullWidth
      >
        <MenuItem value="">{strPlaceholder}</MenuItem>
        {lstOptions.map((objOption) => {
          if (typeof objOption === "string") {
            return <MenuItem key={objOption} value={objOption}>{objOption}</MenuItem>;
          }
          return (
            <MenuItem key={objOption.intID ?? objOption.strLabel} value={objOption.intID ?? objOption.strLabel ?? ""}>
              {objOption.strCode ? `${objOption.strCode} - ${objOption.strLabel}` : objOption.strLabel}
            </MenuItem>
          );
        })}
      </TextField>
    );
  }

  function renderSearchableSelectField(
    strLabel: string,
    objValue: number | "",
    fnOnChange: (objValue: number | "") => void,
    lstOptions: Array<{ intID?: number; strLabel?: string; strCode?: string }>,
    blnDisabled = false,
    strHelperText?: string,
    blnError = false,
    blnRequired = false,
    strControlId?: string
  ) {
    const lstValidOptions = lstOptions.filter(
      (objOption): objOption is { intID: number; strLabel: string; strCode?: string } =>
        typeof objOption.intID === "number" && typeof objOption.strLabel === "string"
    );
    return (
      <CommonSearchableSelect
        controlId={strControlId ?? `employee.editor.${strLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.select`}
        label={strLabel}
        placeholder={t(`placeholder_${strLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`, `${strLabel.toLowerCase().includes("manager") ? "Search and select" : "Select"} ${strLabel.toLowerCase()}`)}
        size="small"
        showSearchIcon={strLabel.toLowerCase().includes("manager")}
        value={objValue}
        options={lstValidOptions}
        onChange={(objSelected) => fnOnChange(objSelected === "" ? "" : Number(objSelected))}
        disabled={blnDisabled}
        error={blnError}
        helperText={strHelperText}
        required={blnRequired}
        getOptionLabel={(objOption) => objOption.strLabel}
        fullWidth
      />
    );
  }

  function renderContactPhoneField({
    strLabel,
    strCountryCodeField,
    strNumberField,
    objIcon,
    strIconColor,
    strControlId,
    refInput,
  }: {
    strLabel: string;
    strCountryCodeField: keyof EmployeeFormValues;
    strNumberField: keyof EmployeeFormValues;
    objIcon: ReactNode;
    strIconColor: string;
    strControlId: string;
    refInput?: RefObject<HTMLInputElement | null>;
  }) {
    const strCountryCodeValue = String(dicBasicForm[strCountryCodeField] || "+91");
    const strNumberValue = String(dicBasicForm[strNumberField] ?? "");
    const strNumberError = dicBasicErrors[strNumberField];

    return (
      <Box
        data-has-value={Boolean(strNumberValue)}
        sx={{
          position: "relative",
          "&:focus-within > .contact-phone-label, &[data-has-value='true'] > .contact-phone-label": {
            top: 0,
            transform: "translate(14px, -50%) scale(0.75)",
            bgcolor: "#fff",
          },
        }}
      >
        <Typography
          className="contact-phone-label"
          component="label"
          htmlFor={`${strControlId}.number`}
          sx={{
            position: "absolute",
            top: "50%",
            left: 0,
            zIndex: 1,
            px: "5px",
            color: "rgba(15, 23, 42, 0.6)",
            fontSize: 14,
            lineHeight: 1,
            transform: "translate(104px, -50%) scale(1)",
            transformOrigin: "top left",
            transition: "color 200ms cubic-bezier(0, 0, 0.2, 1), transform 200ms cubic-bezier(0, 0, 0.2, 1), top 200ms cubic-bezier(0, 0, 0.2, 1)",
            pointerEvents: "none",
          }}
        >
          {strLabel}
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "32px 72px 1px minmax(0, 1fr)",
            alignItems: "center",
            minHeight: 38,
            border: "1px solid",
            borderColor: strNumberError ? "#d32f2f" : "#cbd5e1",
            borderRadius: "4px",
            bgcolor: blnViewOnly ? "#f8fafc" : "#fff",
            transition: "border-color 160ms ease, box-shadow 160ms ease",
            "&:focus-within": {
              borderColor: strNumberError ? "#d32f2f" : "#1d5d96",
              boxShadow: strNumberError ? "0 0 0 1px rgba(211, 47, 47, 0.16)" : "0 0 0 1px rgba(29, 93, 150, 0.16)",
            },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", color: strIconColor }}>
            {objIcon}
          </Box>
          <TextField
            select
            variant="standard"
            value={strCountryCodeValue}
            disabled={blnViewOnly}
            onChange={(objEvent) => updateBasicField(strCountryCodeField, objEvent.target.value as never)}
            inputProps={{ "data-control-id": `${strControlId}.country-code.select`, "aria-label": `${strLabel} country code` }}
            SelectProps={{ disableUnderline: true }}
            sx={{
              "& .MuiInputBase-root": { fontSize: 13, fontWeight: 700, color: "#1f2937" },
              "& .MuiSelect-select": { py: 0, pr: "22px !important" },
              "& .MuiSelect-icon": { right: 0, color: "#64748b", fontSize: 20 },
            }}
          >
            {Array.from(new Set([strCountryCodeValue, ...lstContactCountryCodes].filter(Boolean))).map((strCountryCode) => (
              <MenuItem key={strCountryCode} value={strCountryCode}>{strCountryCode}</MenuItem>
            ))}
          </TextField>
          <Box sx={{ width: "1px", height: 22, bgcolor: "#e2e8f0" }} />
          <TextField
            id={`${strControlId}.number`}
            variant="standard"
            value={strNumberValue}
            disabled={blnViewOnly}
            inputRef={refInput}
            onChange={(objEvent) => {
              if (!dicBasicForm[strCountryCodeField]) {
                updateBasicField(strCountryCodeField, strCountryCodeValue as never);
              }
              updateBasicField(strNumberField, sanitizeMobileNumberInput(objEvent.target.value) as never);
            }}
            InputProps={{ disableUnderline: true }}
            inputProps={{ "data-control-id": `${strControlId}.number.input`, inputMode: "tel", pattern: "[0-9+\\- ]*" }}
            sx={{
              minWidth: 0,
              "& .MuiInputBase-input": { py: 0, px: 1.25, color: "#1f2937", fontSize: 14, fontWeight: 500 },
              "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: "#64748b" },
            }}
          />
        </Box>
        {strNumberError ? <Typography sx={{ mt: 0.5, color: "#d32f2f", fontSize: "0.75rem" }}>{strNumberError}</Typography> : null}
      </Box>
    );
  }

  function renderLookupCodeSearchableField(
    strLabel: string,
    strValue: string,
    fnOnChange: (strValue: string) => void,
    lstOptions: Array<{ intID: number; strLabel: string; strCode?: string }>,
    blnDisabled = false
  ) {
    const intParsedValue = strValue === "" ? NaN : Number(strValue);
    const objValue = Number.isNaN(intParsedValue) ? "" : intParsedValue;
    return (
      <CommonSearchableSelect
        label={strLabel}
        controlId={`employee.editor.${strLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.lookup`}
        placeholder={t(`placeholder_${strLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`, `Select ${strLabel.toLowerCase()}`)}
        size="small"
        showSearchIcon={false}
        value={objValue}
        options={lstOptions}
        onChange={(objSelected) => fnOnChange(objSelected === "" ? "" : String(objSelected))}
        disabled={blnDisabled}
        getOptionLabel={(objOption) => objOption.strLabel}
        fullWidth
      />
    );
  }

  function renderStringListSearchableField(
    strLabel: string,
    strValue: string,
    fnOnChange: (strValue: string) => void,
    lstOptions: string[],
    blnDisabled = false
  ) {
    return (
      <CommonSearchableSelect
        label={strLabel}
        value={strValue}
        options={lstOptions.map((strOption) => ({ intID: strOption, strLabel: strOption }))}
        onChange={(objSelected) => fnOnChange(objSelected === "" ? "" : String(objSelected))}
        disabled={blnDisabled}
        fullWidth
      />
    );
  }

  function renderQualificationForm() {
    const objLabelSx = { mb: 0.5, color: "#14213d", fontSize: 12, fontWeight: 700 };
    const renderField = (strLabel: string, strField: keyof EmployeeQualificationFormValues, strPlaceholder: string, blnRequired = false) => (
      <Box key={strField} sx={{ minWidth: 0 }}>
        <TextField
          id={`qualification-${strField}`}
          size="small"
          fullWidth
          select={strField === "intYearOfPassing"}
          label={strLabel}
          required={blnRequired}
          value={dicQualificationForm[strField]}
          onChange={(objEvent) => updateQualificationField(strField, strField === "intYearOfPassing" ? objEvent.target.value.replace(/[^0-9]/g, "").slice(0, 4) : objEvent.target.value)}
          placeholder={strPlaceholder}
          error={Boolean(dicQualificationErrors[strField])} helperText={dicQualificationErrors[strField]}
          inputProps={{ "data-controlid": `employee.editor.qualification.${({ strDegreeName: "degree-name", strSpecialization: "specialization", strInstitutionName: "institution-name", strUniversityName: "university-name", intYearOfPassing: "year-of-passing", strGradeOrPercentage: "grade-or-percentage", strCertificationNumber: "certification-number" } as Record<string, string>)[strField]}.input`, list: strField === "strDegreeName" ? "qualification-degree-options" : undefined }}
          InputLabelProps={dicEmployeeInlineInputLabelProps}
          sx={dicEmployeeInlineFieldSx}
        >
          {strField === "intYearOfPassing" ? [<MenuItem key="empty" value="" disabled>{strPlaceholder}</MenuItem>, ...Array.from({ length: new Date().getFullYear() - 1899 }, (_, intIndex) => new Date().getFullYear() - intIndex).map((intYear) => <MenuItem key={intYear} value={intYear}>{intYear}</MenuItem>)] : null}
        </TextField>
        {strField === "strDegreeName" ? <datalist id="qualification-degree-options">{["High school", "Diploma", "Bachelor's degree", "Master's degree", "Doctorate", "Certification"].map((strDegree) => <option key={strDegree} value={strDegree} />)}</datalist> : null}
        {strField === "intYearOfPassing" ? <Typography sx={{ mt: 0.4, color: "#64748b", fontSize: 11 }}>{t("qualification_year_help", "Select the year the qualification was completed.")}</Typography> : null}
      </Box>
    );
    return (
      <Box sx={{ bgcolor: "#f2f7ff", border: "1px solid #7399ff", borderTop: 0, borderRadius: "0 0 6px 6px" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" }, gap: 1.5, p: 1.5 }}>
          {renderField(t("field_degree_name", "Degree name"), "strDegreeName", t("qualification_select_degree", "Select degree"), true)}
          {renderField(t("field_specialization", "Specialization"), "strSpecialization", t("qualification_enter_specialization", "Enter specialization"))}
          {renderField(t("field_institution_name", "Institution name"), "strInstitutionName", t("qualification_enter_institution", "Enter institution"), true)}
          {renderField(t("field_university_name", "University name"), "strUniversityName", t("qualification_enter_university", "Enter university"))}
          {renderField(t("field_year_of_passing", "Year of passing"), "intYearOfPassing", t("qualification_select_year", "Select year"), true)}
          {renderField(t("field_grade_or_percentage", "Grade / Percentage"), "strGradeOrPercentage", t("qualification_enter_grade", "Enter grade or percentage"))}
          {renderField(t("field_certification_number", "Certification number"), "strCertificationNumber", t("qualification_enter_certificate", "Enter certificate number"))}
          <Box sx={{ display: "flex", gap: 3, alignItems: "center", alignSelf: "start", minHeight: 40, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><Typography sx={{ ...objLabelSx, mb: 0 }}>{t("field_highest_qualification", "Highest qualification")}</Typography><Switch size="small" checked={dicQualificationForm.blnIsHighestQualification} onChange={(_, blnChecked) => updateQualificationField("blnIsHighestQualification", blnChecked)} inputProps={{ "data-controlid": "employee.editor.qualification.highest-qualification.switch" } as InputHTMLAttributes<HTMLInputElement>} sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#319045" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: "#319045" } }} /></Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><Typography sx={{ ...objLabelSx, mb: 0 }}>{t("field_qualification_active", "Active")}</Typography><ActiveStatusSwitch blnIsActive={dicQualificationForm.blnIsActive} onChange={(blnChecked) => updateQualificationField("blnIsActive", blnChecked)} inputProps={{ "data-controlid": "employee.editor.qualification.active.switch" } as InputHTMLAttributes<HTMLInputElement>} /></Box>
          </Box>
        </Box>
        <Box sx={{ px: 1.5, py: 0.7, borderTop: "1px solid #c7d7fc", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
          <Typography sx={{ color: "#64748b", fontSize: 11 }}>{t("qualification_required_fields", "Required fields are marked")} <Box component="span" sx={{ color: "#e44747" }}>*</Box></Typography>
          <Stack direction="row" spacing={0.75}>
            <Button
              size="small"
              className={styles.secondaryButton}
              variant="outlined"
              onClick={resetQualificationEditor}
              data-controlid="employee.editor.qualification.reset.button"
              sx={{ height: 32, minHeight: 32, py: 0, px: "12px !important", minWidth: 0, fontSize: "0.8125rem !important", whiteSpace: "nowrap", flexShrink: 0 }}
            >
              {t("cancel", "Cancel")}
            </Button>
            <Button
              size="small"
              className={styles.primaryButton}
              variant="contained"
              startIcon={<SaveRoundedIcon className="employeeSaveIcon" />}
              onClick={handleQualificationSave}
              disabled={blnQualificationSaving}
              data-controlid="employee.editor.qualification.save.button"
              sx={{
                height: 32,
                minHeight: 32,
                py: 0,
                px: "12px !important",
                minWidth: 0,
                fontSize: "0.8125rem !important",
                whiteSpace: "nowrap",
                flexShrink: 0,
                "& .MuiButton-startIcon": { mr: 0.75, "& svg": { fontSize: "1rem" } }
              }}
            >
              {blnQualificationSaving ? t("saving", "Saving...") : t("qualification_save_line", "Save line")}
            </Button>
          </Stack>
        </Box>
      </Box>
    );
  }

  if (blnLoading || blnRightsLoading) {
    return (
      <Box sx={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
        <DottedLoader />
      </Box>
    );
  }

  const objPageActionConfig = getFooterActionConfig();
  const fnHandleBack = () => {
    objRouter.push(strBackRoute);
  };

  return (
    <Stack spacing={1} onFocusCapture={handleEditorFocusCapture} sx={{
      "& .MuiSvgIcon-root": { color: "#215f91" },
      '& .MuiSvgIcon-root.employeeSaveIcon': { color: "#fff" },
      "& .MuiSvgIcon-root.employeePartialSaveIcon": { color: "var(--app-primary-color)" },
      '& .MuiSvgIcon-root.employeeProfileIcon': { color: "#98a2b3" },
      "& .MuiFormHelperText-root": { marginLeft: 0, marginRight: 0 },
      "& .MuiFormControlLabel-root:has(.MuiSwitch-root)": {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 1,
        marginLeft: 0,
        marginRight: 0,
        "& > .MuiFormControlLabel-label": { order: 1 },
        "& > .MuiSwitch-root": { order: 2 },
      },
    }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} alignItems={{ sm: "center" }} sx={{ position: "sticky", top: 0, zIndex: 10, bgcolor: "var(--app-bg-color)", py: 0.5 }}>
        <Box>
          {!blnHidePageHeading ? strPageTitleOverride ? (
            <Breadcrumbs aria-label={t("employee_breadcrumb", "Employee breadcrumb")} separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />} sx={{ fontSize: 13, py: 0.5, ml: "3px" }}>
              <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>{strBreadcrumbSection || "Employee Services"}</Typography>
              <Link component={NextLink} href={strBackRoute} underline="hover" sx={{ color: "text.secondary", fontSize: "inherit" }}>{strBreadcrumbList || strPageTitleOverride}</Link>
              <Typography component="h1" aria-current="page" sx={{ fontSize: "inherit", fontWeight: 700, color: "#172554" }}>{strMode === "view" ? t("breadcrumb_view", "View") : t("breadcrumb_edit", "Edit")}</Typography>
            </Breadcrumbs>
          ) : (
            <Breadcrumbs aria-label={t("employee_breadcrumb", "Employee breadcrumb")} separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />} sx={{ fontSize: 13, py: 0.5, ml: "3px" }}>
              <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>{t("breadcrumb_masters", "Masters")}</Typography>
              <Link component={NextLink} href="/employees" data-control-id="employee.editor.breadcrumb.employees.link" underline="hover" sx={{ color: "text.secondary", fontSize: "inherit" }}>{t("breadcrumb_employees", "Employees")}</Link>
              <Typography component="h1" aria-current="page" sx={{ fontSize: "inherit", fontWeight: 700, color: "#172554" }}>{strBreadcrumbCurrent}</Typography>
            </Breadcrumbs>
          ) : null}
          {strLabelError ? (
            <Typography sx={{ mt: blnHidePageHeading ? 0 : 0.75, color: "#b45309", fontSize: "0.85rem" }}>{strLabelError}</Typography>
          ) : null}
          {strRightsError ? (
            <Typography sx={{ mt: 0.75, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography>
          ) : null}
          {!blnCanView && !blnCanSaveEmployee ? (
            <Typography sx={{ mt: 0.75, color: "#b45309", fontSize: "0.85rem", fontWeight: 700 }}>
              {t("access_denied", "Employee access is not available for your user group.")}
            </Typography>
          ) : null}
        </Box>
        {/* Keep navigation available in view mode while retaining save actions only for editable modes. */}
         <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
            <Button
              data-controlid="employee.editor.back.button"
              className={styles.secondaryButton}
              variant="outlined"
              size="small"
              startIcon={<ArrowBackRoundedIcon />}
              onClick={fnHandleBack}
              sx={{
                height: 32,
                minHeight: 32,
                py: 0,
                px: "12px !important",
                minWidth: 0,
                fontSize: "0.8125rem !important",
                whiteSpace: "nowrap",
                flexShrink: 0,
                "& .MuiButton-startIcon": {
                  mr: 0.75,
                  "& svg": {
                    fontSize: "1rem"
                  }
                }
              }}
            >
              {t("back_button", "Back")}
            </Button>
            {objPageActionConfig ? (
              <Button
                data-controlid="employee.editor.partial-save.button"
                className={styles.secondaryButton}
                variant="outlined"
                size="small"
                startIcon={<SaveRoundedIcon className="employeePartialSaveIcon" />}
                onClick={handlePartialSave}
                disabled={objPageActionConfig.blnDisabled}
                sx={{
                  height: 32,
                  minHeight: 32,
                  py: 0,
                  px: "12px !important",
                  minWidth: 0,
                  fontSize: "0.8125rem !important",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  "& .MuiButton-startIcon": {
                    mr: 0.75,
                    "& svg": {
                      fontSize: "1rem"
                    }
                  }
                }}
              >
                {blnAnySaving ? t("saving", "Saving...") : t("partial_save", "Partial Save")}
              </Button>
            ) : null}
            {objPageActionConfig ? (
              <Button
                data-controlid="employee.editor.save.button"
                className={styles.primaryButton}
                variant="contained"
                size="small"
                startIcon={<SaveRoundedIcon className="employeeSaveIcon" />}
                onClick={objPageActionConfig.fnOnClick}
                disabled={objPageActionConfig.blnDisabled}
                sx={{
                  height: 32,
                  minHeight: 32,
                  py: 0,
                  px: "12px !important",
                  minWidth: 0,
                  fontSize: "0.8125rem !important",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  "& .MuiButton-startIcon": {
                    mr: 0.75,
                    "& svg": {
                      fontSize: "1rem"
                    }
                  }
                }}
              >
                {objPageActionConfig.strLabel}
              </Button>
            ) : null}
        </Stack>
      </Stack>

       <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", lg: strMode === "edit" && blnHideSalarySummaryCard ? "1fr" : "minmax(0, 7fr) minmax(280px, 3fr)" }, alignItems: "stretch" }}>
        <Paper sx={{ borderRadius: "12px", border: "1px solid #dce7f5", px: { xs: 2, md: 2.25 }, py: 1.25, boxShadow: "0 4px 18px rgba(31,61,110,0.04)" }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "flex-start" }} spacing={1} sx={{ mb: 1.75 }}>
            <Box>
              <Typography sx={{ fontSize: "1rem", fontWeight: 800, color: "#172554", lineHeight: 1.2 }}>{t("basic_employee_details", "Basic Employee Details")}</Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "#64748b", mb: 1 }}>{t("basic_employee_details_subtitle", "Identity, category, and account status")}</Typography>
            </Box>
            <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ alignSelf: { xs: "flex-end", sm: "auto" } }}>
              <Typography sx={{ fontSize: "0.7rem", color: "#64748b", whiteSpace: "nowrap" }}>{t("required_fields_legend", "Required fields are marked")} <Box component="span" sx={{ color: strRequiredAsteriskColor }}>*</Box></Typography>
              {strMode === "edit" ? (
                <Box sx={{ position: "relative", flexShrink: 0, mt: "-4px !important" }}>
                  <Avatar src={strAuthenticatedAvatarUrl || undefined} sx={{ width: 62, height: 62, bgcolor: "#edf3ff", border: "3px solid #f1f5fb", color: "#2563eb" }}><AccountCircleRoundedIcon className="employeeProfileIcon" sx={{ width: "100%", height: "100%", color: "#215f91" }} /></Avatar>
                  {!blnViewOnly ? (
                    <IconButton component="label" data-control-id="employee-master-profile-photo-upload" aria-label={t("upload_photo", "Upload photo")} disabled={blnAvatarUpdating || !intResolvedEmployeeID} size="small" sx={{ position: "absolute", right: -3, bottom: -3, width: 23, height: 23, bgcolor: "#fff", border: "1px solid #dce7f5", boxShadow: "0 1px 4px rgba(31,61,110,0.16)", "&:hover": { bgcolor: "#f1f5fb" } }}>
                      {blnAvatarUpdating ? <DottedLoader intSize={13} /> : <EditRoundedIcon sx={{ fontSize: 13 }} />}
                      <input hidden type="file" accept="image/png,image/jpeg,image/webp" data-control-id="employee-master-profile-photo-file" onChange={handleAvatarUpload} />
                    </IconButton>
                  ) : null}
                  {!blnViewOnly && strAuthenticatedAvatarUrl ? (
                    <IconButton data-control-id="employee-master-profile-photo-remove" aria-label={t("remove_photo", "Remove photo")} onClick={() => setBlnAvatarRemoveDialogOpen(true)} disabled={blnAvatarUpdating} size="small" sx={{ position: "absolute", left: -3, bottom: -3, width: 23, height: 23, bgcolor: "#fff", border: "1px solid #dce7f5", boxShadow: "0 1px 4px rgba(31,61,110,0.16)", "&:hover": { bgcolor: "#f1f5fb" } }}>
                      <DeleteRoundedIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  ) : null}
                </Box>
              ) : null}
            </Stack>
          </Stack>
          {strMode === "edit" && strAvatarError ? <Typography sx={{ mb: 1, color: "#b91c1c", fontSize: 12 }}>{strAvatarError}</Typography> : null}
          <Box sx={{ display: "grid", columnGap: 1.5, rowGap: 2.25, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" } }}>
            <TextField className="app-mui-text-field" data-control-id="employee.editor.employee-code.input" inputProps={{ "data-control-id": "employee.editor.employee-code.input" }} label={renderRequiredLabel(t("field_employee_code", dicConstant.employeeMaster.fields.employeeCode))} placeholder={t("placeholder_employee_code", "Enter employee code")} size="small" inputRef={dicFieldRefs.strEmployeeCode} value={dicBasicForm.strEmployeeCode} onChange={(objEvent) => updateBasicField("strEmployeeCode", objEvent.target.value.toUpperCase())} error={Boolean(dicBasicErrors.strEmployeeCode)} helperText={dicBasicErrors.strEmployeeCode} disabled={blnViewOnly} fullWidth />
            {renderSelectField(t("field_title", dicConstant.employeeMaster.fields.title), dicBasicForm.strTitle, (objValue) => updateBasicField("strTitle", String(objValue)), objFormOptions?.lstTitles ?? [], blnViewOnly, undefined, false, undefined, "employee.editor.title.select", t("placeholder_title", "Select title"))}
            {renderSelectField(t("field_gender", dicConstant.employeeMaster.fields.gender), dicBasicForm.strGender, (objValue) => updateBasicField("strGender", String(objValue)), objFormOptions?.lstGenders ?? [], blnViewOnly, undefined, false, undefined, "employee.editor.gender.select", t("placeholder_gender", "Select gender"))}
            <TextField className="app-mui-text-field" data-control-id="employee.editor.first-name.input" inputProps={{ "data-control-id": "employee.editor.first-name.input" }} label={renderRequiredLabel(t("field_first_name", dicConstant.employeeMaster.fields.firstName))} placeholder={t("placeholder_first_name", "Enter first name")} size="small" inputRef={dicFieldRefs.strFirstName} value={dicBasicForm.strFirstName} onChange={(objEvent) => updateBasicField("strFirstName", objEvent.target.value)} error={Boolean(dicBasicErrors.strFirstName)} helperText={dicBasicErrors.strFirstName} disabled={blnViewOnly} fullWidth />
            <TextField className="app-mui-text-field" data-control-id="employee.editor.middle-name.input" inputProps={{ "data-control-id": "employee.editor.middle-name.input" }} label={t("field_middle_name", dicConstant.employeeMaster.fields.middleName)} placeholder={t("placeholder_middle_name", "Enter middle name")} size="small" value={dicBasicForm.strMiddleName} onChange={(objEvent) => updateBasicField("strMiddleName", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
            <TextField className="app-mui-text-field" data-control-id="employee.editor.last-name.input" inputProps={{ "data-control-id": "employee.editor.last-name.input" }} label={t("field_last_name", dicConstant.employeeMaster.fields.lastName)} placeholder={t("placeholder_last_name", "Enter last name")} size="small" value={dicBasicForm.strLastName} onChange={(objEvent) => updateBasicField("strLastName", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
            <TextField className="app-mui-text-field" data-control-id="employee.editor.date-of-birth.input" inputProps={{ "data-control-id": "employee.editor.date-of-birth.input" }} type="date" label={t("field_date_of_birth", dicConstant.employeeMaster.fields.dateOfBirth)} size="small" value={dicBasicForm.dtDateOfBirth} onChange={(objEvent) => updateBasicField("dtDateOfBirth", objEvent.target.value)} error={Boolean(dicBasicErrors.dtDateOfBirth)} helperText={dicBasicErrors.dtDateOfBirth} InputLabelProps={{ shrink: true }} disabled={blnViewOnly} fullWidth />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minHeight: 40, flexWrap: "nowrap", gridColumn: { sm: "1 / -1", md: "span 2" } }}>
              <Typography sx={{ fontSize: "12px", fontWeight: 600, lineHeight: 1.5, color: "#334155", whiteSpace: "nowrap" }}>{t("field_worker_status", "Worker Status")}</Typography>
              <RadioGroup row value={dicBasicForm.blnIsWorker ? "worker" : "nonWorker"} onChange={(objEvent) => updateBasicField("blnIsWorker", objEvent.target.value === "worker")} sx={{ alignItems: "center", flexWrap: "nowrap", "& .MuiFormControlLabel-label": { whiteSpace: "nowrap" } }}>
                <FormControlLabel value="worker" control={<Radio size="small" disabled={blnViewOnly} inputProps={{ "data-control-id": "employee.editor.worker.radio" } as InputHTMLAttributes<HTMLInputElement>} />} label={t("field_worker", "Worker")} sx={{ m: 0, mr: 1 }} disabled={blnViewOnly} />
                <FormControlLabel value="nonWorker" control={<Radio size="small" disabled={blnViewOnly} inputProps={{ "data-control-id": "employee.editor.non-worker.radio" } as InputHTMLAttributes<HTMLInputElement>} />} label={t("field_non_worker", "Non-Worker")} sx={{ m: 0 }} disabled={blnViewOnly} />
              </RadioGroup>
              <Box sx={{ ml: "auto", display: "flex", alignItems: "center", justifyContent: "flex-end", flexShrink: 0 }}>
                <FormControlLabel labelPlacement="start" control={<ActiveStatusSwitch testId="employee.editor.employment-status.switch" blnIsActive={dicBasicForm.strEmploymentStatus === "Active"} onChange={(blnChecked) => updateBasicField("strEmploymentStatus", blnChecked ? "Active" : "Inactive")} disabled={blnViewOnly} sx={dicEmployeeActiveSwitchSx} />} label={t("field_employee_active", "Employee Active")} sx={{ m: 0, gap: 1, pr: 1, "& .MuiFormControlLabel-label": { whiteSpace: "nowrap" } }} disabled={blnViewOnly} />
              </Box>
            </Box>
          </Box>
        </Paper>
        {strMode !== "edit" ? <Paper sx={{ borderRadius: "12px", border: "1px solid #dce7f5", px: { xs: 2, md: 2.25 }, py: 1.25, boxShadow: "0 4px 18px rgba(31,61,110,0.04)" }}>
          <Typography sx={{ fontSize: "1rem", fontWeight: 800, color: "#172554", mb: 1 }}>{t("profile_image", "Profile Image")}</Typography>
          <Stack alignItems="center" spacing={1.5}>
            <Avatar src={strAuthenticatedAvatarUrl || undefined} sx={{ width: 168, height: 168, bgcolor: "#edf3ff", border: "4px solid #f1f5fb", boxShadow: "0 0 0 2px #f8fbff" }}>
              <AccountCircleRoundedIcon className="employeeProfileIcon" sx={{ width: "100%", height: "100%", color: "#215f91" }} />
            </Avatar>
            {!blnViewOnly ? (
              <Stack direction="row" spacing={0.75}>
                <Button component="label" data-control-id="employee-master-profile-photo-upload" size="small" variant="outlined" startIcon={blnAvatarUpdating ? <DottedLoader intSize={14} /> : <UploadRoundedIcon />} disabled={blnAvatarUpdating || !intResolvedEmployeeID} sx={{ textTransform: "none", fontSize: "0.72rem" }}>
                  {t("upload_photo", "Upload photo")}
                  <input hidden type="file" accept="image/png,image/jpeg,image/webp" data-control-id="employee-master-profile-photo-file" onChange={handleAvatarUpload} />
                </Button>
                <Button data-control-id="employee-master-profile-photo-remove" size="small" variant="outlined" startIcon={<DeleteRoundedIcon />} onClick={() => setBlnAvatarRemoveDialogOpen(true)} disabled={blnAvatarUpdating || !intResolvedEmployeeID || !strAuthenticatedAvatarUrl} sx={{ textTransform: "none", fontSize: "0.72rem", color: "#64748b", borderColor: "#cbd5e1" }}>{t("remove_photo", "Remove")}</Button>
              </Stack>
            ) : null}
            <Typography sx={{ fontSize: "0.7rem", color: "#94a3b8" }}>{t("photo_formats", "JPG, PNG or WEBP, max 200 KB")}</Typography>
            {strAvatarError ? <Typography sx={{ fontSize: 12, color: "#b91c1c", textAlign: "center" }}>{strAvatarError}</Typography> : null}
          </Stack>
        </Paper> : null}
        {strMode === "edit" && !blnHideSalarySummaryCard ? (
          <EmployeeSalarySummaryCard intEmployeeID={intResolvedEmployeeID} blnHideOpenPageButton={blnHideSalaryOpenPageButton} blnSidebar />
        ) : null}
      </Box>

      {strMode === "view" && !blnHideSalarySummaryCard ? (
        <EmployeeSalarySummaryCard
          intEmployeeID={intResolvedEmployeeID}
          blnHideOpenPageButton={blnHideSalaryOpenPageButton}
        />
      ) : null}

      <Paper sx={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #dce7f5", boxShadow: "0 4px 18px rgba(31,61,110,0.04)" }}>
        <Box sx={{ borderBottom: "1px solid #e2e8f0", px: { xs: 1, md: 1.5 }, bgcolor: "#ffffff" }}>
          <Tabs
            data-control-id="employee.editor.tabs"
            value={strVisibleActiveTab}
            onChange={(_, strNextValue) => setStrActiveTab(strNextValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={dicEmployeeTabsSx}
          >
            {lstVisibleTabOrder.map((strTabKey) => (
              <Tab
                key={strTabKey}
                value={strTabKey}
                data-control-id={`employee.editor.${strTabKey}.tab`}
                label={<Box component="span" className="employee-tab-label">
                  {strTabKey === "basicInfo"
                    ? t("tab_employment_info", "Employment Info")
                    : strTabKey === "personalIdentification"
                      ? t("tab_personal_identification", "Personal & Identification")
                      : strTabKey === "serviceContract"
                        ? t("tab_service_contract", "Service & Contract")
                        : strTabKey === "additionalEmployment"
                          ? t("tab_additional_employment", "Additional Employment Details")
                          : strTabKey === "address"
                            ? t("tab_contact_details", "Contact Details")
                          : strTabKey === "bankDetails"
                            ? t("tab_bank_details", dicConstant.employeeMaster.tabs.bankDetails)
                            : strTabKey === "statutory"
                              ? t("tab_statutory", dicConstant.employeeMaster.tabs.statutory)
                              : strTabKey === "experience"
                                ? t("tab_experience", dicConstant.employeeMaster.tabs.experience ?? "Experience")
                                : strTabKey === "qualification"
                                  ? t("tab_qualification", dicConstant.employeeMaster.tabs.qualification ?? "Qualification")
                                  : t("tab_family_details", dicConstant.employeeMaster.tabs.familyDetails ?? "Family Details")}
                </Box>}
              />
            ))}
          </Tabs>
        </Box>

        <Box className="app-mui-text-field" sx={{
          p: 2,
          "& .MuiSwitch-root": {
            ...createEmployeeSwitchSx("#215f91"),
            flexShrink: 0,
            verticalAlign: "middle",
            "& .MuiSwitch-switchBase.Mui-disabled + .MuiSwitch-track": {
              backgroundColor: "#98a2b3 !important",
              opacity: 0.5,
            },
          },
        }}>
          {(["basicInfo", "personalIdentification", "serviceContract", "additionalEmployment"] as TabKey[]).includes(strVisibleActiveTab) ? (
            <Stack spacing={intEmployeeTabCardSpacing}>
              {strVisibleActiveTab === "basicInfo" ? <Box>
                <Box sx={{ display: "grid", ...dicEmployeeInputGridGapSx, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }, ...dicEmployeeFieldGridSx }}>
                  <TextField data-control-id="employee.editor.date-of-joining.input" inputProps={{ "data-control-id": "employee.editor.date-of-joining.input" }} type="date" label={renderRequiredLabel(t("field_date_of_joining", dicConstant.employeeMaster.fields.dateOfJoining))} size="small" inputRef={dicFieldRefs.dtDateOfJoining} value={dicBasicForm.dtDateOfJoining} onChange={(objEvent) => updateBasicField("dtDateOfJoining", objEvent.target.value)} error={Boolean(dicBasicErrors.dtDateOfJoining)} helperText={dicBasicErrors.dtDateOfJoining} InputLabelProps={{ shrink: true }} disabled={blnViewOnly} fullWidth />
                  {renderSearchableSelectField(t("field_employment_type", dicConstant.employeeMaster.fields.employmentType), dicBasicForm.intEmploymentTypeID, (objValue) => updateBasicField("intEmploymentTypeID", objValue), objFormOptions?.lstEmploymentTypes ?? [], blnViewOnly, dicBasicErrors.intEmploymentTypeID, Boolean(dicBasicErrors.intEmploymentTypeID), true)}
                  {renderOptionalEmployeeField("strEmployeeCategory", t("field_employee_category", "Employee Category"))}
                  {renderSearchableSelectField(t("field_department", dicConstant.employeeMaster.fields.department), dicBasicForm.intDepartmentID, (objValue) => updateBasicField("intDepartmentID", objValue), objFormOptions?.lstDepartments ?? [], blnViewOnly)}
                  {renderSearchableSelectField(t("field_designation", dicConstant.employeeMaster.fields.designation), dicBasicForm.intDesignationID, (objValue) => updateBasicField("intDesignationID", objValue), objFormOptions?.lstDesignations ?? [], blnViewOnly)}
                  {renderSearchableSelectField(t("field_grade", dicConstant.employeeMaster.fields.grade), dicBasicForm.intGradeID, (objValue) => updateBasicField("intGradeID", objValue), objFormOptions?.lstGrades ?? [], blnViewOnly)}
                  {renderSearchableSelectField(t("field_location", dicConstant.employeeMaster.fields.location), dicBasicForm.intLocationID, (objValue) => updateBasicField("intLocationID", objValue), objFormOptions?.lstLocations ?? [], blnViewOnly, dicBasicErrors.intLocationID, Boolean(dicBasicErrors.intLocationID), true)}
                  {renderSearchableSelectField(t("field_cost_center", dicConstant.employeeMaster.fields.costCenter), dicBasicForm.intCostCenterID, (objValue) => updateBasicField("intCostCenterID", objValue), objFormOptions?.lstCostCenters ?? [], blnViewOnly)}
                  {renderSearchableSelectField(t("field_payroll_group", dicConstant.employeeMaster.fields.payrollGroup), dicBasicForm.intPayrollGroupID, (objValue) => updateBasicField("intPayrollGroupID", objValue), objFormOptions?.lstPayrollGroups ?? [], blnViewOnly)}
                  {renderSearchableSelectField(t("field_manager", dicConstant.employeeMaster.fields.manager), dicBasicForm.intManagerEmployeeID, (objValue) => updateReportingManagerField(objValue), lstManagerOptions, blnViewOnly, dicBasicErrors.intManagerEmployeeID, Boolean(dicBasicErrors.intManagerEmployeeID), true)}
                  {renderSearchableSelectField(t("field_line_manager", "Line Manager"), dicBasicForm.intLineManagerEmployeeID, (objValue) => updateBasicField("intLineManagerEmployeeID", objValue || dicBasicForm.intManagerEmployeeID), lstManagerOptions, blnViewOnly, dicBasicErrors.intLineManagerEmployeeID, Boolean(dicBasicErrors.intLineManagerEmployeeID), true)}
                  {lstEmploymentAssignmentFields.map((dicField) => renderOptionalEmployeeField(dicField.strField, dicField.strLabel, dicField.strType))}
                </Box>
              </Box> : null}

              {strVisibleActiveTab === "personalIdentification" ? (
                <Box sx={{ display: "grid", gap: intEmployeeTabCardSpacing, alignItems: "stretch", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", lg: "1.05fr 0.95fr 1.4fr" } }}>
                  <Box sx={{ minWidth: 0, p: 2, border: "1px solid #e2e8f0", borderRadius: "12px", bgcolor: "#fff", boxShadow: "0 2px 10px rgba(15,23,42,0.04)", ...dicEmployeeFieldGridSx }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <Box sx={{ width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: "#eff6ff", color: "#31598f" }}><PersonOutlineRoundedIcon fontSize="small" /></Box>
                      <Box><Typography sx={dicEmployeeTabCardTitleSx}>{t("personal_profile", "Personal profile")}</Typography><Typography sx={dicEmployeeTabCardSubtitleSx}>{t("personal_profile_subtitle", "Core personal information")}</Typography></Box>
                    </Stack>
                    <Box sx={{ display: "grid", ...dicEmployeeInputGridGapSx, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                      {renderSearchableSelectField(t("field_nationality", "Nationality"), dicBasicForm.intNationalityCountryID, (objValue) => updateBasicField("intNationalityCountryID", objValue), objFormOptions?.lstNationalities ?? [], blnViewOnly)}
                      {renderSearchableSelectField(t("field_mother_tongue", "Mother Tongue"), dicBasicForm.intMotherTongueLanguageID, (objValue) => updateBasicField("intMotherTongueLanguageID", objValue), objFormOptions?.lstMotherTongues ?? [], blnViewOnly)}
                      {lstPersonalOptionalFields.slice(0, 2).map((dicField) => renderOptionalEmployeeField(dicField.strField, dicField.strLabel, dicField.strType))}
                      {lstPersonalOptionalFields.slice(2, 5).map((dicField) => <Box key={dicField.strField} sx={{ gridColumn: "1 / -1" }}>{renderOptionalEmployeeField(dicField.strField, dicField.strLabel, dicField.strType)}</Box>)}
                    </Box>
                  </Box>
                  <Box sx={{ minWidth: 0, p: 2, border: "1px solid #e2e8f0", borderRadius: "12px", bgcolor: "#fff", boxShadow: "0 2px 10px rgba(15,23,42,0.04)", ...dicEmployeeFieldGridSx }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <Box sx={{ width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: "#eff6ff", color: "#31598f" }}><GroupsOutlinedIcon fontSize="small" /></Box>
                      <Box><Typography sx={dicEmployeeTabCardTitleSx}>{t("family_information", "Family information")}</Typography><Typography sx={dicEmployeeTabCardSubtitleSx}>{t("family_information_subtitle", "Family and relationship details")}</Typography></Box>
                    </Stack>
                    <Stack spacing={1.5}>
                      {lstPersonalOptionalFields.slice(5, 9).map((dicField) => renderOptionalEmployeeField(dicField.strField, dicField.strLabel, dicField.strType))}
                    </Stack>
                  </Box>
                  <Box sx={{ minWidth: 0, p: 2, border: "1px solid #e2e8f0", borderRadius: "12px", bgcolor: "#fff", boxShadow: "0 2px 10px rgba(15,23,42,0.04)", gridColumn: { md: "span 2", lg: "auto" }, ...dicEmployeeFieldGridSx }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <Box sx={{ width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: "#eff6ff", color: "#31598f" }}><DescriptionOutlinedIcon fontSize="small" /></Box>
                      <Box><Typography sx={dicEmployeeTabCardTitleSx}>{t("identity_documents", "Identity documents")}</Typography><Typography sx={dicEmployeeTabCardSubtitleSx}>{t("identity_documents_subtitle", "Passport and driving licence")}</Typography></Box>
                    </Stack>
                    <Box sx={{ display: "grid", ...dicEmployeeInputGridGapSx, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" } }}>
                      {lstPersonalOptionalFields.slice(9).map((dicField) => renderOptionalEmployeeField(dicField.strField, dicField.strLabel, dicField.strType))}
                    </Box>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 2, pt: 1.5, borderTop: "1px solid #e2e8f0" }}>
                      <FormControlLabel labelPlacement="start" control={<Switch checked={dicBasicForm.blnHasDisability} onChange={(_, value) => updateBasicField("blnHasDisability", value)} disabled={blnViewOnly} sx={dicEmployeeDetailSwitchSx} inputProps={{ "data-control-id": "employee.editor.has-disability.switch" } as InputHTMLAttributes<HTMLInputElement>} />} label={t("field_has_disability", "Has disability")} sx={dicEmployeeDetailSwitchLabelSx} />
                      <FormControlLabel labelPlacement="start" control={<Switch checked={dicBasicForm.blnSuperannuationFlag} onChange={(_, value) => updateBasicField("blnSuperannuationFlag", value)} disabled={blnViewOnly} sx={dicEmployeeDetailSwitchSx} inputProps={{ "data-control-id": "employee.editor.superannuation.switch" } as InputHTMLAttributes<HTMLInputElement>} />} label={t("field_superannuation", "Superannuation")} sx={dicEmployeeDetailSwitchLabelSx} />
                      <FormControlLabel labelPlacement="start" control={<Switch checked={dicBasicForm.blnIsRelatedEmployee} onChange={(_, value) => { updateBasicField("blnIsRelatedEmployee", value); if (!value) updateBasicField("intRelatedEmployeeID", ""); }} disabled={blnViewOnly} sx={dicEmployeeDetailSwitchSx} inputProps={{ "data-control-id": "employee.editor.related-employee.switch" } as InputHTMLAttributes<HTMLInputElement>} />} label={t("field_related_employee", "Related employee")} sx={dicEmployeeDetailSwitchLabelSx} />
                    </Box>
                    {dicBasicForm.blnIsRelatedEmployee ? (
                      <Box sx={{ mt: 1.5, maxWidth: 420 }}>
                        {renderSearchableSelectField(t("field_related_employee", "Related Employee"), dicBasicForm.intRelatedEmployeeID, (objValue) => updateBasicField("intRelatedEmployeeID", objValue), lstManagerOptions, blnViewOnly)}
                      </Box>
                    ) : null}
                  </Box>
                </Box>
              ) : null}

              {strVisibleActiveTab === "serviceContract" ? (
                <Box sx={{ display: "grid", gap: intEmployeeTabCardSpacing, alignItems: "start", bgcolor: "#fff", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" } }}>
                  {/* Each card keeps its existing form fields and can be opened independently. */}
                  <Box sx={{ bgcolor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 2px 8px rgba(15,23,42,0.04)", overflow: "hidden" }}>
                    <Button data-control-id="employee.editor.service.appointment.toggle" fullWidth aria-expanded={dicServiceSectionsOpen.appointment} aria-controls="employee-service-appointment" onClick={() => setDicServiceSectionsOpen((dicPrevious) => ({ ...dicPrevious, appointment: !dicPrevious.appointment }))} startIcon={<AssignmentTurnedInOutlinedIcon sx={{ color: "#405b94" }} />} endIcon={<ExpandMoreRoundedIcon sx={{ transform: dicServiceSectionsOpen.appointment ? "rotate(180deg)" : "none" }} />} sx={{ justifyContent: "flex-start", textTransform: "none", color: "#1e293b", fontWeight: 700, px: 2, py: 1.25, "& .MuiButton-endIcon": { ml: "auto" } }}>{t("section_appointment_joining", "Appointment & joining")}</Button>
                    <Collapse in={dicServiceSectionsOpen.appointment} id="employee-service-appointment">
                      <Box sx={{ borderTop: "1px solid #e2e8f0", px: 2, pt: 1.5, pb: 2, ...dicEmployeeFieldGridSx }}>
                        <Box sx={{ display: "grid", ...dicEmployeeInputGridGapSx, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" } }}>
                          {lstAppointmentJoiningFields.map((dicField) => renderOptionalEmployeeField(dicField.strField, t(`field_${dicField.strField}`, dicField.strLabel), dicField.strType))}
                        </Box>
                        <Box sx={{ mt: 1.5, pt: 1, borderTop: "1px solid #e2e8f0" }}>
                          <Button data-control-id="employee.editor.service.additional-appointment.toggle" fullWidth aria-expanded={dicServiceSectionsOpen.additionalAppointment} aria-controls="employee-service-additional-appointment" onClick={() => setDicServiceSectionsOpen((dicPrevious) => ({ ...dicPrevious, additionalAppointment: !dicPrevious.additionalAppointment }))} startIcon={<ExpandMoreRoundedIcon sx={{ color: "#405b94", transform: dicServiceSectionsOpen.additionalAppointment ? "rotate(180deg)" : "none" }} />} sx={{ justifyContent: "flex-start", textTransform: "none", color: "#334155", fontSize: 13, px: 0.25, py: 0.25 }}>{t("section_additional_appointment_details", "Additional appointment details")}</Button>
                          <Collapse in={dicServiceSectionsOpen.additionalAppointment} id="employee-service-additional-appointment">
                            <Box sx={{ display: "grid", ...dicEmployeeInputGridGapSx, mt: 1, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" } }}>
                              {lstAdditionalAppointmentFields.map((dicField) => renderOptionalEmployeeField(dicField.strField, t(`field_${dicField.strField}`, dicField.strLabel)))}
                            </Box>
                          </Collapse>
                          {!dicServiceSectionsOpen.additionalAppointment ? <Typography sx={{ pl: 3.5, color: "#64748b", fontSize: 11 }}>{t("additional_appointment_details_hint", "Entry mode, reference number, referred by and agency details are available here.")}</Typography> : null}
                        </Box>
                      </Box>
                    </Collapse>
                  </Box>
                  <Box sx={{ bgcolor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 2px 8px rgba(15,23,42,0.04)", overflow: "hidden" }}>
                    <Button data-control-id="employee.editor.service.probation.toggle" fullWidth aria-expanded={dicServiceSectionsOpen.probation} aria-controls="employee-service-probation" onClick={() => setDicServiceSectionsOpen((dicPrevious) => ({ ...dicPrevious, probation: !dicPrevious.probation }))} startIcon={<GppGoodOutlinedIcon sx={{ color: "#405b94" }} />} endIcon={<ExpandMoreRoundedIcon sx={{ transform: dicServiceSectionsOpen.probation ? "rotate(180deg)" : "none" }} />} sx={{ justifyContent: "flex-start", textTransform: "none", color: "#1e293b", fontWeight: 700, px: 2, py: 1.25, "& .MuiButton-endIcon": { ml: "auto" } }}>{t("section_probation_confirmation", "Probation & confirmation")}</Button>
                    <Collapse in={dicServiceSectionsOpen.probation} id="employee-service-probation">
                      <Box sx={{ display: "grid", ...dicEmployeeInputGridGapSx, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, borderTop: "1px solid #e2e8f0", px: 2, pt: 1.5, pb: 2, ...dicEmployeeFieldGridSx }}>
                        {lstProbationConfirmationFields.map((dicField) => renderOptionalEmployeeField(dicField.strField, t(`field_${dicField.strField}`, dicField.strLabel), dicField.strType))}
                      </Box>
                    </Collapse>
                  </Box>
                  <Box sx={{ bgcolor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 2px 8px rgba(15,23,42,0.04)", overflow: "hidden" }}>
                    <Button data-control-id="employee.editor.service.contract.toggle" fullWidth aria-expanded={dicServiceSectionsOpen.contract} aria-controls="employee-service-contract" onClick={() => setDicServiceSectionsOpen((dicPrevious) => ({ ...dicPrevious, contract: !dicPrevious.contract }))} startIcon={<DescriptionOutlinedIcon sx={{ color: "#405b94" }} />} endIcon={<ExpandMoreRoundedIcon sx={{ transform: dicServiceSectionsOpen.contract ? "rotate(180deg)" : "none" }} />} sx={{ justifyContent: "flex-start", textTransform: "none", color: "#1e293b", fontWeight: 700, px: 2, py: 1.25, "& .MuiButton-endIcon": { ml: "auto" } }}>{t("section_contract_service_period", "Contract / service period")}</Button>
                    <Collapse in={dicServiceSectionsOpen.contract} id="employee-service-contract">
                      <Box sx={{ display: "grid", ...dicEmployeeInputGridGapSx, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, borderTop: "1px solid #e2e8f0", px: 2, pt: 1.5, pb: 2, ...dicEmployeeFieldGridSx }}>
                        {lstContractServiceFields.map((dicField) => renderOptionalEmployeeField(dicField.strField, t(`field_${dicField.strField}`, dicField.strLabel), dicField.strType))}
                        <TextField data-control-id="employee.editor.date-of-exit.input" inputProps={{ "data-control-id": "employee.editor.date-of-exit.input" }} type="date" label={t("field_date_of_exit", dicConstant.employeeMaster.fields.dateOfExit)} size="small" value={dicBasicForm.dtDateOfExit} onChange={(objEvent) => updateBasicField("dtDateOfExit", objEvent.target.value)} error={Boolean(dicBasicErrors.dtDateOfExit)} helperText={dicBasicErrors.dtDateOfExit} InputLabelProps={{ shrink: true }} disabled={blnViewOnly || dicBasicForm.strEmploymentStatus === "Active"} fullWidth />
                      </Box>
                    </Collapse>
                  </Box>
                </Box>
              ) : null}

              {strVisibleActiveTab === "additionalEmployment" ? (
                <Box sx={{ display: "grid", gap: intEmployeeTabCardSpacing, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, alignItems: "stretch" }}>
                  {/* Keep the existing employee fields while grouping them like the reference layout. */}
                  <Box sx={{ minWidth: 0, p: 2, border: "1px solid #e2e8f0", borderRadius: "10px", bgcolor: "#fff", boxShadow: "0 2px 10px rgba(15,23,42,0.04)", ...dicEmployeeFieldGridSx }}>
                    <Typography sx={dicEmployeeTabCardTitleSx}>{t("section_employment_classification", "Employment classification")}</Typography>
                    <Typography sx={{ ...dicEmployeeTabCardSubtitleSx, mb: 2 }}>{t("employment_classification_subtitle", "Assignment and policy classification.")}</Typography>
                    <Box sx={{ display: "grid", ...dicEmployeeInputGridGapSx, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" } }}>
                      {lstAdditionalEmploymentFields.map((dicField) => renderOptionalEmployeeField(dicField.strField, t(dicField.strTranslationKey, dicField.strLabel), dicField.strType))}
                    </Box>
                  </Box>
                  <Box sx={{ minWidth: 0, p: 2, border: "1px solid #e2e8f0", borderRadius: "10px", bgcolor: "#fff", boxShadow: "0 2px 10px rgba(15,23,42,0.04)", ...dicEmployeeFieldGridSx }}>
                    <Typography sx={dicEmployeeTabCardTitleSx}>{t("section_benefits_exceptions", "Benefits & exceptions")}</Typography>
                    <Typography sx={{ ...dicEmployeeTabCardSubtitleSx, mb: 2 }}>{t("benefits_exceptions_subtitle", "Employee-specific benefits and approvals.")}</Typography>
                    <Stack spacing={2}>
                      <FormControlLabel labelPlacement="start" control={<Switch checked={dicBasicForm.blnFlatGiven} onChange={(_, value) => updateBasicField("blnFlatGiven", value)} disabled={blnViewOnly} sx={dicEmployeeDetailSwitchSx} inputProps={{ "data-control-id": "employee.editor.flat-given.switch" } as InputHTMLAttributes<HTMLInputElement>} />} label={t("field_flat_given", "Flat given")} sx={{ ...dicEmployeeDetailSwitchLabelSx, justifyContent: "flex-start", alignSelf: "flex-start" }} />
                      <Box>
                        <FormControlLabel labelPlacement="start" control={<Switch checked={dicBasicForm.blnUgcAppraisalFlag} onChange={(_, value) => updateBasicField("blnUgcAppraisalFlag", value)} disabled={blnViewOnly} sx={dicEmployeeDetailSwitchSx} inputProps={{ "data-control-id": "employee.editor.ugc-appraisal.switch" } as InputHTMLAttributes<HTMLInputElement>} />} label={t("field_ugc_appraisal", "UGC appraisal")} sx={{ ...dicEmployeeDetailSwitchLabelSx, justifyContent: "flex-start" }} />
                        {!dicBasicForm.blnUgcAppraisalFlag ? <Typography sx={{ fontSize: 11, color: "#94a3b8" }}>{t("ugc_appraisal_not_enrolled", "Not enrolled")}</Typography> : null}
                      </Box>
                    </Stack>
                  </Box>
                  <Box sx={{ gridColumn: { md: "1 / -1" }, minWidth: 0, p: 2, border: "1px solid #e2e8f0", borderRadius: "10px", bgcolor: "#fff", boxShadow: "0 2px 10px rgba(15,23,42,0.04)", ...dicEmployeeFieldGridSx }}>
                    <Typography sx={{ ...dicEmployeeTabCardTitleSx, mb: 1 }}>{t("field_employee_remark", "Employee remark")}</Typography>
                    <TextField data-control-id="employee.editor.strEmployeeRemark.input" inputProps={{ "data-control-id": "employee.editor.strEmployeeRemark.input", maxLength: 500 }} label={t("field_employee_remark", "Employee remark")} placeholder={t("placeholder_employee_remark", "Enter remark (if any)")} value={dicBasicForm.strEmployeeRemark} onChange={(objEvent) => updateBasicField("strEmployeeRemark", objEvent.target.value)} disabled={blnViewOnly} multiline minRows={2} fullWidth />
                    <Typography sx={{ fontSize: 11, color: "#94a3b8", mt: 0.5 }}>{dicBasicForm.strEmployeeRemark.length} / 500</Typography>
                  </Box>
                </Box>
              ) : null}
            </Stack>
          ) : null}

          {strVisibleActiveTab === "address" ? (
            <Box sx={{ display: "grid", gap: intEmployeeTabCardSpacing, alignItems: "stretch", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, ...dicEmployeeFieldGridSx }}>
              {/* Each card follows the reference layout while keeping the existing employee fields. */}
              <Box sx={{ p: 2, minWidth: 0, border: "1px solid #e6ebf3", borderRadius: "12px", bgcolor: "#fff", boxShadow: "0 4px 18px rgba(15,23,42,0.04)" }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <Avatar sx={{ width: 36, height: 36, bgcolor: "#edf3ff", color: "#3458df" }}><AlternateEmailRoundedIcon sx={{ fontSize: 19 }} /></Avatar>
                  <Box><Typography sx={dicEmployeeTabCardTitleSx}>{t("contact_work_personal_title", "Work & personal contact")}</Typography><Typography sx={dicEmployeeTabCardSubtitleSx}>{t("contact_work_personal_description", "Your official and personal contact information.")}</Typography></Box>
                </Stack>
                <Stack spacing={2}>
                  <TextField size="small" data-control-id="employee.editor.work-email.input" inputProps={{ "data-control-id": "employee.editor.work-email.input" }} label={renderRequiredLabel(t("field_work_email", dicConstant.employeeMaster.fields.workEmail))} inputRef={dicFieldRefs.strWorkEmail} value={dicBasicForm.strWorkEmail} onChange={(objEvent) => updateBasicField("strWorkEmail", objEvent.target.value)} error={Boolean(dicBasicErrors.strWorkEmail)} helperText={dicBasicErrors.strWorkEmail} disabled={blnViewOnly} fullWidth />
                  <TextField size="small" data-control-id="employee.editor.personal-email.input" inputProps={{ "data-control-id": "employee.editor.personal-email.input" }} label={t("field_personal_email", dicConstant.employeeMaster.fields.personalEmail)} inputRef={dicFieldRefs.strPersonalEmail} value={dicBasicForm.strPersonalEmail} onChange={(objEvent) => updateBasicField("strPersonalEmail", objEvent.target.value)} error={Boolean(dicBasicErrors.strPersonalEmail)} helperText={dicBasicErrors.strPersonalEmail} disabled={blnViewOnly} fullWidth />
                  {renderContactPhoneField({
                    strLabel: t("field_mobile_number", dicConstant.employeeMaster.fields.mobileNumber),
                    strCountryCodeField: "strMobileCountryCode",
                    strNumberField: "strMobileNumber",
                    objIcon: <PhoneOutlinedIcon sx={{ fontSize: 18 }} />,
                    strIconColor: "#405b94",
                    strControlId: "employee.editor.mobile",
                    refInput: dicFieldRefs.strMobileNumber,
                  })}
                  {renderContactPhoneField({
                    strLabel: t("field_whatsapp_number", "WhatsApp number"),
                    strCountryCodeField: "strWhatsappCountryCode",
                    strNumberField: "strWhatsappNumber",
                    objIcon: <WhatsAppIcon sx={{ fontSize: 18 }} />,
                    strIconColor: "#16a34a",
                    strControlId: "employee.editor.whatsapp",
                  })}
                </Stack>
              </Box>
              <Box sx={{ p: 2, minWidth: 0, border: "1px solid #e6ebf3", borderRadius: "12px", bgcolor: "#fff", boxShadow: "0 4px 18px rgba(15,23,42,0.04)" }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <Avatar sx={{ width: 36, height: 36, bgcolor: "#edf3ff", color: "#3458df" }}><ContactEmergencyOutlinedIcon sx={{ fontSize: 19 }} /></Avatar>
                  <Box><Typography sx={dicEmployeeTabCardTitleSx}>{t("contact_emergency_title", "Emergency contact")}</Typography><Typography sx={dicEmployeeTabCardSubtitleSx}>{t("contact_emergency_description", "Details of a person to be contacted in case of emergency.")}</Typography></Box>
                </Stack>
                <Stack spacing={2}>
                  {renderOptionalEmployeeField("strEmergencyContactPerson", t("field_emergency_contact_person", "Emergency contact person"))}
                  {renderContactPhoneField({
                    strLabel: t("field_emergency_mobile_number", "Mobile number"),
                    strCountryCodeField: "strEmergencyCountryCode",
                    strNumberField: "strEmergencyMobileNumber",
                    objIcon: <PhoneOutlinedIcon sx={{ fontSize: 18 }} />,
                    strIconColor: "#405b94",
                    strControlId: "employee.editor.emergency-mobile",
                  })}
                  {renderOptionalEmployeeField("strEmergencyEmail", t("field_emergency_email", "Email"))}
                </Stack>
              </Box>
              <Box sx={{ p: 2, minWidth: 0, border: "1px solid #e6ebf3", borderRadius: "12px", bgcolor: "#fff", boxShadow: "0 4px 18px rgba(15,23,42,0.04)" }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <Avatar sx={{ width: 36, height: 36, bgcolor: "#edf3ff", color: "#3458df" }}><LocationOnOutlinedIcon sx={{ fontSize: 19 }} /></Avatar>
                  <Box><Typography sx={dicEmployeeTabCardTitleSx}>{t("contact_address_title", "Address")}</Typography><Typography sx={dicEmployeeTabCardSubtitleSx}>{t("contact_address_description", "Manage your address details.")}</Typography></Box>
                </Stack>
                {/* The API stores one address with a type; these buttons select that type. */}
                <Box role="group" aria-label={t("field_address_type", dicConstant.employeeMaster.fields.addressType)} sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", mb: 2, p: 0.3, border: "1px solid #dce4f1", borderRadius: "7px", bgcolor: "#f7f9fd" }}>
                  {(objFormOptions?.lstAddressTypes ?? ["Current", "Permanent"]).filter((strType) => strType === "Current" || strType === "Permanent").map((strType) => (
                    <Button key={strType} data-control-id={`employee.editor.address-type.${strType.toLowerCase()}.button`} size="small" disabled={blnViewOnly} aria-pressed={dicAddressForm.strAddressType === strType} onClick={() => updateAddressField("strAddressType", strType)} sx={{ textTransform: "none", fontSize: 12, bgcolor: dicAddressForm.strAddressType === strType ? "#eaf1ff" : "transparent", color: dicAddressForm.strAddressType === strType ? "#2c55c7" : "#5f6d83", border: dicAddressForm.strAddressType === strType ? "1px solid #bcd0fc" : "1px solid transparent", "&:hover": { bgcolor: "#eaf1ff" } }}>{t(`address_type_${strType.toLowerCase()}`, `${strType} address`)}</Button>
                  ))}
                </Box>
                <Box sx={{ display: "grid", ...dicEmployeeInputGridGapSx, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                  <TextField size="small" data-control-id="employee.editor.address-line1.input" inputProps={{ "data-control-id": "employee.editor.address-line1.input" }} label={renderRequiredLabel(t("field_address_line1", dicConstant.employeeMaster.fields.addressLine1))} inputRef={dicFieldRefs.strAddressLine1} value={dicAddressForm.strAddressLine1} onChange={(objEvent) => updateAddressField("strAddressLine1", objEvent.target.value)} error={Boolean(dicAddressErrors.strAddressLine1)} helperText={dicAddressErrors.strAddressLine1} disabled={blnViewOnly} fullWidth />
                  <TextField size="small" data-control-id="employee.editor.address-line2.input" inputProps={{ "data-control-id": "employee.editor.address-line2.input" }} label={t("field_address_line2", dicConstant.employeeMaster.fields.addressLine2)} value={dicAddressForm.strAddressLine2} onChange={(objEvent) => updateAddressField("strAddressLine2", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                  <TextField size="small" data-control-id="employee.editor.city.input" inputProps={{ "data-control-id": "employee.editor.city.input" }} label={t("field_city", dicConstant.employeeMaster.fields.cityName)} value={dicAddressForm.strCityName} onChange={(objEvent) => updateAddressField("strCityName", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                  {renderSearchableSelectField(t("field_state", dicConstant.employeeMaster.fields.state), dicAddressForm.intStateID, (objValue) => updateAddressField("intStateID", objValue), objFormOptions?.lstStates ?? [], blnViewOnly)}
                  {renderSearchableSelectField(t("field_country", dicConstant.employeeMaster.fields.country), dicAddressForm.intCountryID, (objValue) => updateAddressField("intCountryID", objValue), objFormOptions?.lstCountries ?? [], blnViewOnly, dicAddressErrors.intCountryID, Boolean(dicAddressErrors.intCountryID), true)}
                  <TextField size="small" data-control-id="employee.editor.postal-code.input" inputProps={{ "data-control-id": "employee.editor.postal-code.input" }} label={t("field_postal_code", dicConstant.employeeMaster.fields.postalCode)} value={dicAddressForm.strPostalCode} onChange={(objEvent) => updateAddressField("strPostalCode", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                </Box>
              </Box>
            </Box>
          ) : null}

          {blnCanViewBankDetails && strVisibleActiveTab === "bankDetails" ? (
            <Box sx={{ display: "grid", gap: intEmployeeTabCardSpacing, alignItems: "stretch", gridTemplateColumns: { xs: "1fr", md: "minmax(220px, 27%) minmax(0, 1fr)" } }}>
              <Box sx={{ border: "1px solid #e0e7f0", borderRadius: "8px", bgcolor: "#fff", p: 2, minHeight: 330 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1.5 }}>
                  <Typography sx={dicEmployeeTabCardTitleSx}>{t("bank_accounts", "Bank accounts")}</Typography>
                  {!blnViewOnly ? (
                    <Button
                      size="small"
                      className={styles.primaryButton}
                      startIcon={<AddRoundedIcon sx={{ color: "#fff !important" }} />}
                      data-control-id="employee.editor.add-bank-account.button"
                      disabled={dicBankForm.blnSecondaryIsActive}
                      title={dicBankForm.blnSecondaryIsActive ? t("bank_account_limit", "A primary and a secondary bank account are already available.") : undefined}
                      onClick={() => {
                        updateBankField("blnSecondaryIsActive", true);
                        setStrSelectedBankAccount("secondary");
                        setBlnBankAccountNumberVisible(false);
                      }}
                      sx={{ whiteSpace: "nowrap", minWidth: 0, px: 1.1, fontSize: 11, "& .MuiButton-startIcon, & .MuiButton-startIcon .MuiSvgIcon-root": { color: "#fff" } }}
                    >
                      {t("add_bank_account", "Add bank account")}
                    </Button>
                  ) : null}
                </Stack>
                <Stack spacing={0.8}>
                  {renderBankAccountListItem("primary")}
                  {dicBankForm.blnSecondaryIsActive ? renderBankAccountListItem("secondary") : null}
                </Stack>
              </Box>

              <Box sx={{ border: "1px solid #e0e7f0", borderRadius: "8px", bgcolor: "#fff", p: 2, minWidth: 0, minHeight: 330, ...dicEmployeeFieldGridSx }}>
                <Typography sx={{ ...dicEmployeeTabCardTitleSx, mb: 1.2 }}>
                  {strSelectedBankAccount === "primary" ? t("primary_bank_account", "Primary bank account") : t("secondary_bank_account", "Secondary bank account")}
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} spacing={{ xs: 0.5, sm: 3 }} sx={{ pb: 1.5, mb: 1.75, borderBottom: "1px solid #e5eaf1" }}>
                  <Stack direction="row" alignItems="center" spacing={0.8}>
                    <Typography sx={{ fontSize: 12, color: "#52627a" }}>{t("bank_record_active", "Bank record active")}</Typography>
                    <Typography sx={{ fontSize: 12, color: "#52627a" }}>{(strSelectedBankAccount === "primary" ? dicBankForm.blnIsActive : dicBankForm.blnSecondaryIsActive) ? t("on", "On") : t("off", "Off")}</Typography>
                    <Switch size="small" checked={strSelectedBankAccount === "primary" ? dicBankForm.blnIsActive : dicBankForm.blnSecondaryIsActive} onChange={(_, blnChecked) => {
                      if (strSelectedBankAccount === "primary") {
                        updateBankField("blnIsActive", blnChecked);
                      } else {
                        updateBankField("blnSecondaryIsActive", blnChecked);
                        if (!blnChecked) setStrSelectedBankAccount("primary");
                      }
                    }} disabled={blnViewOnly} sx={dicEmployeeDetailSwitchSx} inputProps={{ "data-control-id": "employee.editor.bank-active.switch" } as InputHTMLAttributes<HTMLInputElement>} />
                  </Stack>
                  {strSelectedBankAccount === "primary" ? (
                    <Stack direction="row" alignItems="center" spacing={0.8} sx={{ pl: { sm: 2.5 }, borderLeft: { sm: "1px solid #e5eaf1" } }}>
                      <Typography sx={{ fontSize: 12, color: "#52627a" }}>{t("field_is_primary", "Primary account")}</Typography>
                      <Typography sx={{ fontSize: 12, color: "#52627a" }}>{dicBankForm.blnIsPrimary ? t("on", "On") : t("off", "Off")}</Typography><Switch size="small" checked={dicBankForm.blnIsPrimary} onChange={(_, blnChecked) => updateBankField("blnIsPrimary", blnChecked)} disabled={blnViewOnly} sx={dicEmployeeDetailSwitchSx} inputProps={{ "data-control-id": "employee.editor.bank-primary.switch" } as InputHTMLAttributes<HTMLInputElement>} />
                    </Stack>
                  ) : null}
                </Stack>

                {strSelectedBankAccount === "primary" ? (
                  <Box sx={{ display: "grid", alignItems: "start", ...dicEmployeeInputGridGapSx, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 165px), 1fr))" }}>
                    {renderSearchableSelectField(t("field_bank", dicConstant.employeeMaster.fields.bank), dicBankForm.intBankID, (objValue) => updateBankField("intBankID", objValue), objFormOptions?.lstBanks ?? [], blnViewOnly, dicBankErrors.intBankID, Boolean(dicBankErrors.intBankID), true)}
                    <TextField size="small" label={t("field_branch_name", "Branch name")} value={dicBankForm.strBranchName} onChange={(objEvent) => updateBankField("strBranchName", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                    {renderLookupCodeSearchableField(t("field_account_type", "Account type"), dicBankForm.strAccountType, (strValue) => updateBankField("strAccountType", strValue), objFormOptions?.lstBankAccountTypes ?? [], blnViewOnly)}
                    <TextField size="small" data-control-id="employee.editor.account-holder-name.input" inputProps={{ "data-control-id": "employee.editor.account-holder-name.input" }} label={renderRequiredLabel(t("field_account_holder_name", dicConstant.employeeMaster.fields.accountHolderName))} inputRef={dicFieldRefs.strAccountHolderName} value={dicBankForm.strAccountHolderName} onChange={(objEvent) => updateBankField("strAccountHolderName", objEvent.target.value)} error={Boolean(dicBankErrors.strAccountHolderName)} helperText={dicBankErrors.strAccountHolderName} disabled={blnViewOnly} fullWidth />
                    <TextField size="small" type={blnBankAccountNumberVisible ? "text" : "password"} data-control-id="employee.editor.account-number.input" inputProps={{ "data-control-id": "employee.editor.account-number.input" }} label={renderRequiredLabel(t("field_account_number", dicConstant.employeeMaster.fields.accountNumber))} inputRef={dicFieldRefs.strAccountNumber} value={dicBankForm.strAccountNumber} placeholder={dicBankAccountMasks.primary || undefined} onChange={(objEvent) => updateBankField("strAccountNumber", objEvent.target.value)} error={Boolean(dicBankErrors.strAccountNumber)} helperText={dicBankErrors.strAccountNumber} disabled={blnViewOnly} InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" aria-label={blnBankAccountNumberVisible ? t("hide_account_number", "Hide account number") : t("show_account_number", "Show account number")} onClick={() => setBlnBankAccountNumberVisible((blnPrevious) => !blnPrevious)} disabled={!dicBankForm.strAccountNumber}>{blnBankAccountNumberVisible ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}</IconButton></InputAdornment> }} fullWidth />
                    <TextField className="app-mui-text-field" size="small" data-control-id="employee.editor.ifsc-code.input" inputProps={{ "data-control-id": "employee.editor.ifsc-code.input" }} label={t("field_ifsc_code", dicConstant.employeeMaster.fields.ifscCode)} value={dicBankForm.strIfscCode} onChange={(objEvent) => updateBankField("strIfscCode", objEvent.target.value.toUpperCase())} disabled={blnViewOnly} fullWidth />
                    <TextField className="app-mui-text-field" size="small" data-control-id="employee.editor.swift-code.input" inputProps={{ "data-control-id": "employee.editor.swift-code.input", maxLength: 20 }} label={t("field_swift_code", "SWIFT code")} value={dicBankForm.strSwiftCode} onChange={(objEvent) => updateBankField("strSwiftCode", objEvent.target.value.toUpperCase())} disabled={blnViewOnly} fullWidth />
                    <TextField className="app-mui-text-field" size="small" type="email" label={t("field_account_holder_email", "Account holder email")} value={dicBankForm.strAccountHolderEmail} onChange={(objEvent) => updateBankField("strAccountHolderEmail", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1.2, borderRadius: "5px", bgcolor: "#eef5ff", color: "#47618e", minHeight: 40 }}>
                      <InfoOutlinedIcon sx={{ fontSize: 18, color: "#4785ee", flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 11, lineHeight: 1.4 }}>{t("primary_payroll_credit_note", "Payroll credits are sent to the primary account.")}</Typography>
                    </Stack>
                  </Box>
                ) : (
                  <Box sx={{ display: "grid", ...dicEmployeeInputGridGapSx, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" } }}>
                    {renderSearchableSelectField(t("field_secondary_bank", dicConstant.employeeMaster.fields.secondaryBank), dicBankForm.intSecondaryBankID, (objValue) => updateBankField("intSecondaryBankID", objValue), objFormOptions?.lstBanks ?? [], blnViewOnly, dicBankErrors.intSecondaryBankID, Boolean(dicBankErrors.intSecondaryBankID), true)}
                    <TextField size="small" data-control-id="employee.editor.secondary-account-holder-name.input" inputProps={{ "data-control-id": "employee.editor.secondary-account-holder-name.input" }} label={renderRequiredLabel(t("field_secondary_account_holder_name", dicConstant.employeeMaster.fields.secondaryAccountHolderName))} inputRef={dicFieldRefs.strSecondaryAccountHolderName} value={dicBankForm.strSecondaryAccountHolderName} onChange={(objEvent) => updateBankField("strSecondaryAccountHolderName", objEvent.target.value)} error={Boolean(dicBankErrors.strSecondaryAccountHolderName)} helperText={dicBankErrors.strSecondaryAccountHolderName} disabled={blnViewOnly} fullWidth />
                    <TextField size="small" type={blnBankAccountNumberVisible ? "text" : "password"} data-control-id="employee.editor.secondary-account-number.input" inputProps={{ "data-control-id": "employee.editor.secondary-account-number.input" }} label={renderRequiredLabel(t("field_secondary_account_number", dicConstant.employeeMaster.fields.secondaryAccountNumber))} inputRef={dicFieldRefs.strSecondaryAccountNumber} value={dicBankForm.strSecondaryAccountNumber} placeholder={dicBankAccountMasks.secondary || undefined} onChange={(objEvent) => updateBankField("strSecondaryAccountNumber", objEvent.target.value)} error={Boolean(dicBankErrors.strSecondaryAccountNumber)} helperText={dicBankErrors.strSecondaryAccountNumber} disabled={blnViewOnly} InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" aria-label={blnBankAccountNumberVisible ? t("hide_account_number", "Hide account number") : t("show_account_number", "Show account number")} onClick={() => setBlnBankAccountNumberVisible((blnPrevious) => !blnPrevious)} disabled={!dicBankForm.strSecondaryAccountNumber}>{blnBankAccountNumberVisible ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}</IconButton></InputAdornment> }} fullWidth />
                    <TextField size="small" data-control-id="employee.editor.secondary-ifsc-code.input" inputProps={{ "data-control-id": "employee.editor.secondary-ifsc-code.input" }} label={t("field_secondary_ifsc_code", dicConstant.employeeMaster.fields.secondaryIfscCode)} value={dicBankForm.strSecondaryIfscCode} onChange={(objEvent) => updateBankField("strSecondaryIfscCode", objEvent.target.value.toUpperCase())} disabled={blnViewOnly} fullWidth />
                  </Box>
                )}
              </Box>
            </Box>
          ) : null}

          {blnCanViewStatutoryDetails && strVisibleActiveTab === "statutory" ? (
            <Stack spacing={intEmployeeTabCardSpacing} sx={{ width: "100%", bgcolor: "#fff" }}>
              <Box sx={{ p: 2, border: "1px solid #dce4ef", borderRadius: "6px", bgcolor: "#fff", boxShadow: "0 3px 14px rgba(30, 58, 90, 0.04)", ...dicEmployeeFieldGridSx }}>
                <Typography sx={{ ...dicEmployeeTabCardTitleSx, mb: 1 }}>{t("statutory_tax_identification", "Tax & national identification")}</Typography>
                <Box sx={{ display: "grid", columnGap: 3, rowGap: 1.75, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" } }}>
                  <TextField size="small" data-control-id="employee.editor.pan-number.input" inputProps={{ "data-control-id": "employee.editor.pan-number.input" }} label={t("field_pan_number", dicConstant.employeeMaster.fields.panNumber)} value={dicStatutoryForm.strPanNumber} onChange={(objEvent) => updateStatutoryField("strPanNumber", objEvent.target.value.toUpperCase())} disabled={blnViewOnly} fullWidth />
                  <CommonSearchableSelect
                    label={t("field_tax_regime", dicConstant.employeeMaster.fields.taxRegimeCode)}
                    controlId="employee.editor.tax-regime.select"
                    value={dicStatutoryForm.strTaxRegimeCode}
                    options={(objFormOptions?.lstTaxRegimeCodes ?? []).map((strOption) => ({ intID: strOption, strLabel: strOption }))}
                    onChange={(objSelected) => updateStatutoryField("strTaxRegimeCode", String(objSelected))}
                    disabled={blnViewOnly}
                    size="small"
                    showSearchIcon={false}
                    sx={{ "& .MuiAutocomplete-inputRoot": { height: 38, minHeight: 38, p: "0 8px !important" }, "& .MuiAutocomplete-inputRoot .MuiAutocomplete-input": { height: 36, boxSizing: "border-box", p: "0 4px !important" } }}
                  />
                  <TextField size="small" data-control-id="employee.editor.uan-number.input" inputProps={{ "data-control-id": "employee.editor.uan-number.input" }} label={t("field_uan_number", dicConstant.employeeMaster.fields.uanNumber)} value={dicStatutoryForm.strUanNumber} onChange={(objEvent) => updateStatutoryField("strUanNumber", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                  <TextField size="small" label={t("field_pran_number", "PRAN number")} value={dicStatutoryForm.strPranNumber} onChange={(objEvent) => updateStatutoryField("strPranNumber", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                  <TextField size="small" label={t("field_gratuity_number", "Gratuity number")} value={dicStatutoryForm.strGratuityNumber} onChange={(objEvent) => updateStatutoryField("strGratuityNumber", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                  <TextField size="small" label={t("field_ssn_number", "SSN number")} value={dicStatutoryForm.strSsnNumber} onChange={(objEvent) => updateStatutoryField("strSsnNumber", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                </Box>
              </Box>
              <Box sx={{ display: "grid", gap: intEmployeeTabCardSpacing, alignItems: "stretch", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" } }}>
                <Stack spacing={1.25} sx={{ minWidth: 0, minHeight: 154, p: 2, border: "1px solid #dce4ef", borderRadius: "6px", bgcolor: "#fff", boxShadow: "0 3px 14px rgba(30, 58, 90, 0.04)", ...dicEmployeeFieldGridSx }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Typography sx={dicEmployeeTabCardTitleSx}>{t("statutory_provident_fund", "Provident Fund (PF)")}</Typography>
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <Typography sx={{ fontSize: 12, color: "#334155" }}>{dicStatutoryForm.blnPfApplicable ? t("on", "On") : t("off", "Off")}</Typography><Switch size="small" sx={dicEmployeeDetailSwitchSx} checked={dicStatutoryForm.blnPfApplicable} onChange={(_, blnChecked) => { updateStatutoryField("blnPfApplicable", blnChecked); if (!blnChecked) updateStatutoryField("strPfNumber", ""); }} disabled={blnViewOnly} inputProps={{ "aria-label": t("field_pf_applicable", "PF applicable") } as InputHTMLAttributes<HTMLInputElement>} />
                    </Stack>
                  </Stack>
                  <Typography sx={{ pb: 1.5, fontSize: 11, color: "#64748b" }}>{t("statutory_pf_description", "Employee is covered under EPF.")}</Typography>
                  {dicStatutoryForm.blnPfApplicable ? <TextField size="small" data-control-id="employee.editor.pf-number.input" inputProps={{ "data-control-id": "employee.editor.pf-number.input" }} label={renderRequiredLabel(t("field_pf_account_number", "PF account number"))} value={dicStatutoryForm.strPfNumber} onChange={(objEvent) => updateStatutoryField("strPfNumber", objEvent.target.value.toUpperCase())} error={Boolean(dicStatutoryErrors.strPfNumber)} helperText={dicStatutoryErrors.strPfNumber} disabled={blnViewOnly} fullWidth /> : null}
                </Stack>
                <Stack spacing={1.25} sx={{ minWidth: 0, minHeight: 154, p: 2, border: "1px solid #dce4ef", borderRadius: "6px", bgcolor: "#fff", boxShadow: "0 3px 14px rgba(30, 58, 90, 0.04)", ...dicEmployeeFieldGridSx }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Typography sx={dicEmployeeTabCardTitleSx}>ESI</Typography>
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <Typography sx={{ fontSize: 12, color: "#334155" }}>{dicStatutoryForm.blnEsiApplicable ? t("on", "On") : t("off", "Off")}</Typography><Switch size="small" sx={dicEmployeeDetailSwitchSx} checked={dicStatutoryForm.blnEsiApplicable} onChange={(_, blnChecked) => { updateStatutoryField("blnEsiApplicable", blnChecked); if (!blnChecked) updateStatutoryField("strEsiNumber", ""); }} disabled={blnViewOnly} inputProps={{ "aria-label": t("field_esi_applicable", "ESI applicable") } as InputHTMLAttributes<HTMLInputElement>} />
                    </Stack>
                  </Stack>
                  <Typography sx={{ pb: 1.5, fontSize: 11, color: "#64748b" }}>{dicStatutoryForm.blnEsiApplicable ? t("statutory_esi_enabled_description", "Employee is covered under ESI.") : t("statutory_esi_description", "Not applicable for this employee.")}</Typography>
                  {dicStatutoryForm.blnEsiApplicable ? <Stack spacing={1.25}><TextField size="small" data-control-id="employee.editor.esi-number.input" inputProps={{ "data-control-id": "employee.editor.esi-number.input" }} label={renderRequiredLabel(t("field_esi_number", dicConstant.employeeMaster.fields.esiNumber))} value={dicStatutoryForm.strEsiNumber} onChange={(objEvent) => updateStatutoryField("strEsiNumber", objEvent.target.value)} error={Boolean(dicStatutoryErrors.strEsiNumber)} helperText={dicStatutoryErrors.strEsiNumber} disabled={blnViewOnly} fullWidth /><TextField size="small" label={t("field_esi_code", "ESI code")} value={dicStatutoryForm.strEsiCode} onChange={(objEvent) => updateStatutoryField("strEsiCode", objEvent.target.value)} disabled={blnViewOnly} fullWidth /></Stack> : null}
                </Stack>
                <Stack spacing={1.25} sx={{ minWidth: 0, minHeight: 154, p: 2, border: "1px solid #dce4ef", borderRadius: "6px", bgcolor: "#fff", boxShadow: "0 3px 14px rgba(30, 58, 90, 0.04)", ...dicEmployeeFieldGridSx }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Typography sx={dicEmployeeTabCardTitleSx}>{t("statutory_professional_tax", "Professional Tax")}</Typography>
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <Typography sx={{ fontSize: 12, color: "#334155" }}>{dicStatutoryForm.blnPtApplicable ? t("on", "On") : t("off", "Off")}</Typography><Switch size="small" sx={dicEmployeeDetailSwitchSx} checked={dicStatutoryForm.blnPtApplicable} onChange={(_, blnChecked) => updateStatutoryField("blnPtApplicable", blnChecked)} disabled={blnViewOnly} inputProps={{ "aria-label": t("field_pt_applicable", "Professional Tax applicable") } as InputHTMLAttributes<HTMLInputElement>} />
                    </Stack>
                  </Stack>
                  <Typography sx={{ pb: 1.5, fontSize: 11, color: "#64748b" }}>{dicStatutoryForm.blnPtApplicable ? t("statutory_pt_description", "Employee is liable for Professional Tax.") : t("statutory_pt_disabled_description", "Not applicable for this employee.")}</Typography>
                  {dicStatutoryForm.blnPtApplicable ? <TextField size="small" label={t("field_pt_registration", "Professional Tax registration")} value={dicStatutoryForm.strPtRegistrationNumber} onChange={(objEvent) => updateStatutoryField("strPtRegistrationNumber", objEvent.target.value.toUpperCase())} disabled={blnViewOnly} fullWidth /> : null}
                </Stack>
              </Box>
            </Stack>
          ) : null}

          {strVisibleActiveTab === "experience" ? (
            <Stack spacing={intEmployeeTabCardSpacing}>
              <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "flex-start" }} justifyContent="space-between" spacing={1.5}>
                <Box>
                  <Typography sx={dicEmployeeTabCardTitleSx}>{t("tab_experience", "Experience")}</Typography>
                  <Typography sx={{ ...dicEmployeeTabCardSubtitleSx, mt: 0.25 }}>
                    {t("experience_career_history", "Career history and prior employment.")}
                  </Typography>
                </Box>
                {!blnViewOnly ? (
                  <Button
                    size="small"
                    startIcon={<PostAddRoundedIcon />}
                    onClick={handleAddExperienceClick}
                    sx={{ bgcolor: "#eaf1ff", color: "#5572aa", textTransform: "none", alignSelf: "flex-start" }}
                  >
                    {t("add_experience", "Add experience")}
                  </Button>
                ) : null}
              </Stack>
              {!blnAddingExperience && !intEditingExperienceID ? (
                <ExperienceTimeline records={lstExperienceRecords} viewOnly={blnViewOnly} canDelete={blnCanDelete} onEdit={handleExperienceEdit} onDelete={handleExperienceDeleteRequest} t={t} />
              ) : null}
              {!blnViewOnly && (blnAddingExperience || intEditingExperienceID) ? (
                <Box sx={{ bgcolor: "#f2f7ff", border: "1px solid #7399ff", borderRadius: "6px", overflow: "hidden" }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.5, py: 1, bgcolor: "#eef5ff", borderBottom: "1px solid #c7d7fc" }}>
                    <ExpandMoreRoundedIcon sx={{ fontSize: 17, color: "#215f91" }} />
                    <Typography sx={{ color: "#172554", fontSize: 12, fontWeight: 700 }}>{intEditingExperienceID ? t("edit_experience", "Edit experience") : t("new_experience", "New experience")}</Typography>
                  </Stack>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" }, ...dicEmployeeInputGridGapSx, p: 1.5 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField id="experience-company_name" size="small" data-controlid="employee.editor.experience.company-name.input" inputProps={{ "data-controlid": "employee.editor.experience.company-name.input" }} label={t("field_company_name", "Company Name")} required value={dicExperienceForm.strCompanyName} onChange={(objEvent) => updateExperienceField("strCompanyName", objEvent.target.value)} error={Boolean(dicExperienceErrors.strCompanyName)} helperText={dicExperienceErrors.strCompanyName} inputRef={dicExperienceFieldRefs.strCompanyName} placeholder={t("field_company_name", "Company Name")} InputLabelProps={dicEmployeeInlineInputLabelProps} sx={dicEmployeeInlineFieldSx} fullWidth />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField id="experience-job_title" size="small" data-controlid="employee.editor.experience.job-title.input" inputProps={{ "data-controlid": "employee.editor.experience.job-title.input" }} label={t("field_job_title", "Job Title")} required value={dicExperienceForm.strJobTitle} onChange={(objEvent) => updateExperienceField("strJobTitle", objEvent.target.value)} error={Boolean(dicExperienceErrors.strJobTitle)} helperText={dicExperienceErrors.strJobTitle} inputRef={dicExperienceFieldRefs.strJobTitle} placeholder={t("field_job_title", "Job Title")} InputLabelProps={dicEmployeeInlineInputLabelProps} sx={dicEmployeeInlineFieldSx} fullWidth />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField id="experience-from_date" size="small" type="date" data-controlid="employee.editor.experience.from-date.input" inputProps={{ "data-controlid": "employee.editor.experience.from-date.input" }} label={t("field_from_date", "From Date")} required value={dicExperienceForm.dtFromDate} onChange={(objEvent) => updateExperienceField("dtFromDate", objEvent.target.value)} error={Boolean(dicExperienceErrors.dtFromDate)} helperText={dicExperienceErrors.dtFromDate} inputRef={dicExperienceFieldRefs.dtFromDate} InputLabelProps={dicEmployeeInlineInputLabelProps} sx={dicEmployeeInlineFieldSx} fullWidth />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField id="experience-to_date" size="small" type="date" data-controlid="employee.editor.experience.to-date.input" inputProps={{ "data-controlid": "employee.editor.experience.to-date.input" }} label={t("field_to_date", "To Date")} value={dicExperienceForm.dtToDate} onChange={(objEvent) => updateExperienceField("dtToDate", objEvent.target.value)} error={Boolean(dicExperienceErrors.dtToDate)} helperText={dicExperienceErrors.dtToDate} inputRef={dicExperienceFieldRefs.dtToDate} InputLabelProps={dicEmployeeInlineInputLabelProps} sx={dicEmployeeInlineFieldSx} fullWidth />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField id="experience-total_years" size="small" data-controlid="employee.editor.experience.total-years.input" inputProps={{ "data-controlid": "employee.editor.experience.total-years.input" }} label={t("field_total_years", "Total Years")} value={dicExperienceForm.decTotalYears} onChange={(objEvent) => updateExperienceField("decTotalYears", objEvent.target.value)} placeholder={t("field_total_years", "Total Years")} InputLabelProps={dicEmployeeInlineInputLabelProps} sx={dicEmployeeInlineFieldSx} fullWidth />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField id="experience-last_drawn_salary" size="small" data-controlid="employee.editor.experience.last-drawn-salary.input" inputProps={{ "data-controlid": "employee.editor.experience.last-drawn-salary.input" }} label={t("field_last_drawn_salary", "Last Drawn Salary")} value={dicExperienceForm.decLastDrawnSalary} onChange={(objEvent) => updateExperienceField("decLastDrawnSalary", objEvent.target.value)} error={Boolean(dicExperienceErrors.decLastDrawnSalary)} helperText={dicExperienceErrors.decLastDrawnSalary} inputRef={dicExperienceFieldRefs.decLastDrawnSalary} placeholder={t("field_last_drawn_salary", "Last Drawn Salary")} InputLabelProps={dicEmployeeInlineInputLabelProps} sx={dicEmployeeInlineFieldSx} fullWidth />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField id="experience-reason_for_leaving" size="small" data-controlid="employee.editor.experience.reason-for-leaving.input" inputProps={{ "data-controlid": "employee.editor.experience.reason-for-leaving.input" }} label={t("field_reason_for_leaving", "Reason For Leaving")} value={dicExperienceForm.strReasonForLeaving} onChange={(objEvent) => updateExperienceField("strReasonForLeaving", objEvent.target.value)} placeholder={t("field_reason_for_leaving", "Reason For Leaving")} InputLabelProps={dicEmployeeInlineInputLabelProps} sx={dicEmployeeInlineFieldSx} fullWidth />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <TextField id="experience-responsibilities" size="small" data-controlid="employee.editor.experience.responsibilities.input" inputProps={{ "data-controlid": "employee.editor.experience.responsibilities.input" }} label={t("field_responsibilities", "Responsibilities")} value={dicExperienceForm.strResponsibilities} onChange={(objEvent) => updateExperienceField("strResponsibilities", objEvent.target.value)} placeholder={t("field_responsibilities", "Responsibilities")} InputLabelProps={dicEmployeeInlineInputLabelProps} sx={dicEmployeeInlineFieldSx} fullWidth />
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography sx={{ color: "#14213d", fontSize: 12, fontWeight: 700 }}>{t("field_experience_active", "Active")}</Typography>
                      <ActiveStatusSwitch blnIsActive={dicExperienceForm.blnIsActive} onChange={(blnChecked) => updateExperienceField("blnIsActive", blnChecked)} inputProps={{ "data-controlid": "employee.editor.experience.active.switch" } as InputHTMLAttributes<HTMLInputElement>} />
                    </Box>
                  </Box>
                  <Box sx={{ px: 1.5, py: 0.7, borderTop: "1px solid #c7d7fc", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                    <Typography sx={{ color: "#64748b", fontSize: 11 }}>{t("qualification_required_fields", "Required fields are marked")} <Box component="span" sx={{ color: "#e44747" }}>*</Box></Typography>
                    <Stack direction="row" spacing={0.75}>
                      <Button
                        size="small"
                        className={styles.secondaryButton}
                        variant="outlined"
                        onClick={resetExperienceEditor}
                        data-controlid="employee.editor.experience.reset.button"
                        sx={{ height: 32, minHeight: 32, py: 0, px: "12px !important", minWidth: 0, fontSize: "0.8125rem !important", whiteSpace: "nowrap", flexShrink: 0 }}
                      >
                        {t("cancel", "Cancel")}
                      </Button>
                      <Button
                        size="small"
                        className={styles.primaryButton}
                        variant="contained"
                        startIcon={<SaveRoundedIcon className="employeeSaveIcon" />}
                        onClick={handleExperienceSave}
                        disabled={blnExperienceSaving}
                        data-controlid="employee.editor.experience.save.button"
                        sx={{
                          height: 32,
                          minHeight: 32,
                          py: 0,
                          px: "12px !important",
                          minWidth: 0,
                          fontSize: "0.8125rem !important",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          "& .MuiButton-startIcon": { mr: 0.75, "& svg": { fontSize: "1rem" } }
                        }}
                      >
                        {blnExperienceSaving ? t("saving", "Saving...") : t("qualification_save_line", "Save line")}
                      </Button>
                    </Stack>
                  </Box>
                </Box>
              ) : null}

            </Stack>
          ) : null}

          {strVisibleActiveTab === "qualification" ? (
            <Stack spacing={intEmployeeTabCardSpacing}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                <Box>
                  <Typography component="h2" sx={dicEmployeeTabCardTitleSx}>{t("qualifications_heading", "Qualifications")}</Typography>
                  <Typography sx={dicEmployeeTabCardSubtitleSx}>{t("section_qualification_help", "Maintain academic qualifications, certifications, and the employee's highest qualification.")}</Typography>
                </Box>
                {!blnViewOnly ? <Button size="small" startIcon={<PostAddRoundedIcon />} onClick={handleAddQualificationClick} sx={{ bgcolor: "#eaf1ff", color: "#5572aa", textTransform: "none", alignSelf: "flex-start" }}>{t("add_qualification", "Add qualification")}</Button> : null}
              </Stack>
              <Box sx={{ border: "1px solid #e1e9f7", borderRadius: "8px", overflow: "hidden", bgcolor: "#fff" }}>
                <TableContainer>
                  <Table size="small" sx={{ minWidth: 740, tableLayout: "fixed", "& .MuiTableCell-root": { borderColor: "#e3eaf5", fontSize: 12 } }}>
                    <TableHead><TableRow sx={{ bgcolor: "#f4f7fd" }}>
                      <TableCell sx={{ width: "23%", fontWeight: 700 }}>{t("qualification_column", "Qualification")}</TableCell>
                      <TableCell sx={{ width: "21%", fontWeight: 700 }}>{t("qualification_institution_column", "Institution / University")}</TableCell>
                      <TableCell sx={{ width: "13%", fontWeight: 700 }}>{t("field_year_of_passing", "Year of passing")}</TableCell>
                      <TableCell sx={{ width: "15%", fontWeight: 700 }}>{t("field_grade_or_percentage", "Grade / Percentage")}</TableCell>
                      <TableCell sx={{ width: "14%", fontWeight: 700 }}>{t("field_certification_number", "Certificate number")}</TableCell>
                      <TableCell sx={{ width: "14%", fontWeight: 700, textAlign: "center" }}>{t("field_highest_qualification", "Highest qualification")}</TableCell>
                      <TableCell sx={{ width: 130, fontWeight: 700, textAlign: "center" }}>{t("status", "Status")}</TableCell>
                    </TableRow></TableHead>
                    <TableBody>
                      {!blnViewOnly && blnAddingQualification ? <Fragment>
                        <TableRow sx={{ bgcolor: "#eef5ff" }}>
                          <TableCell sx={{ color: "#172554", fontWeight: 700 }}><Stack direction="row" spacing={1} alignItems="center"><ExpandMoreRoundedIcon sx={{ fontSize: 17, color: "#215f91" }} />{t("new_qualification", "New qualification")}</Stack></TableCell>
                          <TableCell>–</TableCell><TableCell>–</TableCell><TableCell>–</TableCell><TableCell>–</TableCell>
                          <TableCell align="center">{dicQualificationForm.blnIsHighestQualification ? t("yes", "Yes") : t("no", "No")}</TableCell>
                          <TableCell align="center"><Stack direction="row" spacing={1} alignItems="center" justifyContent="center"><Typography sx={{ fontSize: 12 }}>{dicQualificationForm.blnIsActive ? t("active", "Active") : t("inactive", "Inactive")}</Typography><Switch size="small" checked={dicQualificationForm.blnIsActive} disabled sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#42a047" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: "#42a047", opacity: 1 } }} /></Stack></TableCell>
                        </TableRow>
                        <TableRow><TableCell colSpan={7} sx={{ p: "0 !important" }}>{renderQualificationForm()}</TableCell></TableRow>
                      </Fragment> : null}
                      {lstQualificationRecords.map((objRecord) => <Fragment key={objRecord.intID}>
                        <TableRow hover sx={{ bgcolor: intEditingQualificationID === objRecord.intID ? "#eef5ff" : objRecord.blnIsActive ? "#fff" : "#f8fafc" }}>
                          <TableCell sx={{ color: "#172554", fontWeight: 600 }}>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              {!blnViewOnly ? <IconButton size="small" onClick={() => handleQualificationEdit(objRecord)} aria-label={t("edit", "Edit")} data-controlid="employee.editor.qualification.row.edit.button" data-row-key={objRecord.intID} sx={{ p: 0, color: "#215f91" }}><ExpandMoreRoundedIcon sx={{ fontSize: 18, transform: intEditingQualificationID === objRecord.intID ? "none" : "rotate(-90deg)" }} /></IconButton> : null}
                              <Box sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>{objRecord.strDegreeName}</Box>
                              {!blnViewOnly && blnCanDelete && objRecord.blnIsActive ? <IconButton size="small" onClick={() => handleQualificationDeleteRequest(objRecord.intID)} aria-label={t("delete", "Delete")} data-controlid="employee.editor.qualification.row.delete.button" data-row-key={objRecord.intID} sx={{ p: 0, color: "#d25656" }}><DeleteRoundedIcon sx={{ fontSize: 16 }} /></IconButton> : null}
                            </Stack>
                          </TableCell>
                          <TableCell>{[objRecord.strInstitutionName, objRecord.strUniversityName].filter(Boolean).join(" / ") || "–"}</TableCell>
                          <TableCell>{objRecord.intYearOfPassing}</TableCell>
                          <TableCell>{objRecord.strGradeOrPercentage || "–"}</TableCell>
                          <TableCell>{objRecord.strCertificationNumber || "–"}</TableCell>
                          <TableCell align="center">{objRecord.blnIsHighestQualification ? t("yes", "Yes") : t("no", "No")}</TableCell>
                          <TableCell align="center"><Stack direction="row" spacing={1} alignItems="center" justifyContent="center"><Typography sx={{ fontSize: 12 }}>{objRecord.blnIsActive ? t("active", "Active") : t("inactive", "Inactive")}</Typography><Switch size="small" checked={objRecord.blnIsActive} disabled sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#42a047" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: "#42a047", opacity: 1 } }} /></Stack></TableCell>
                        </TableRow>
                        {!blnViewOnly && intEditingQualificationID === objRecord.intID ? <TableRow><TableCell colSpan={7} sx={{ p: "0 !important" }}>{renderQualificationForm()}</TableCell></TableRow> : null}
                      </Fragment>)}
                    </TableBody>
                  </Table>
                </TableContainer>
                {lstQualificationRecords.length === 0 ? <Stack alignItems="center" spacing={0.5} sx={{ py: 2.25 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: "#edf3ff", color: "#93aedd" }}><SchoolOutlinedIcon sx={{ fontSize: 21 }} /></Box>
                  <Typography sx={{ color: "#6b83b3", fontSize: 12 }}>{t("qualification_empty", "No saved qualifications yet.")}</Typography>
                </Stack> : null}
              </Box>

            </Stack>
          ) : null}
          {strVisibleActiveTab === "family" ? (
            <FamilyDetailsTab
              lstInitialRows={lstFamilyRecords}
              blnViewOnly={blnViewOnly}
              blnCanDelete={blnCanDelete}
              strMenuActionOverride={strMenuActionOverride}
              fnEnsureEmployeeRecordForTabSave={ensureEmployeeRecordForTabSave}
              fnShowAlert={(strSeverity, strMessage) => openAlertDialog(strSeverity, strMessage)}
              fnOnRowsChange={setLstFamilyRecords}
              fnTranslate={t}
            />
          ) : null}
        </Box>
      </Paper>

      <Snackbar
        open={objAlertDialog.blnOpen}
        autoHideDuration={3500}
        onClose={closeAlertDialog}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={closeAlertDialog}
          severity={objAlertDialog.strSeverity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {objAlertDialog.strMessage}
        </Alert>
      </Snackbar>

      <Dialog
        open={blnAvatarRemoveDialogOpen}
        onClose={() => { if (!blnAvatarUpdating) setBlnAvatarRemoveDialogOpen(false); }}
        onKeyDown={handleSingleDialogActionEnter}
        fullWidth
        maxWidth="xs"
        data-control-id="employee.editor.profile-photo.remove.dialog"
      >
        <DialogTitle>{t("confirm_remove_photo_title", "Remove profile photo?")}</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#475569" }}>{t("confirm_remove_photo", "This profile photo will be removed. Continue?")}</Typography>
        </DialogContent>
        <DialogActions>
          <Button data-control-id="employee.editor.profile-photo.remove.cancel.button" onClick={() => setBlnAvatarRemoveDialogOpen(false)} disabled={blnAvatarUpdating}>{t("cancel", dicConstant.common.cancel)}</Button>
          <Button data-control-id="employee.editor.profile-photo.remove.confirm.button" onClick={handleAvatarRemove} disabled={blnAvatarUpdating} variant="contained" color="error">{t("remove_photo", "Remove")}</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={objExperienceDeleteDialog.blnOpen}
        onClose={closeExperienceDeleteDialog}
        onKeyDown={handleSingleDialogActionEnter}
        fullWidth
        maxWidth="xs"
        data-controlid="employee.editor.experience.delete.dialog"
      >
        <DialogTitle>{t("delete_experience_title", "Delete Experience")}</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#475569" }}>
            {objExperienceDeleteDialog.strCompanyName
              ? `${objExperienceDeleteDialog.strCompanyName} will be marked inactive.`
              : t("confirm_delete_experience", "This experience entry will be marked inactive.")}{" "}
            {t("confirm_continue", "Continue?")}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeExperienceDeleteDialog} data-controlid="employee.editor.experience.delete.cancel.button">{t("cancel", dicConstant.common.cancel)}</Button>
          <Button onClick={handleExperienceDelete} variant="contained" color="error" data-controlid="employee.editor.experience.delete.confirm.button">
            {t("delete", "Delete")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={objQualificationDeleteDialog.blnOpen}
        onClose={closeQualificationDeleteDialog}
        onKeyDown={handleSingleDialogActionEnter}
        fullWidth
        maxWidth="xs"
        data-controlid="employee.editor.qualification.delete.dialog"
      >
        <DialogTitle>{t("delete_qualification_title", "Delete Qualification")}</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#475569" }}>
            {objQualificationDeleteDialog.strDegreeName
              ? `${objQualificationDeleteDialog.strDegreeName} will be marked inactive.`
              : t("confirm_delete_qualification", "This qualification entry will be marked inactive.")}{" "}
            {t("confirm_continue", "Continue?")}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeQualificationDeleteDialog} data-controlid="employee.editor.qualification.delete.cancel.button">{t("cancel", dicConstant.common.cancel)}</Button>
          <Button onClick={handleQualificationDelete} variant="contained" color="error" data-controlid="employee.editor.qualification.delete.confirm.button">
            {t("delete", "Delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
