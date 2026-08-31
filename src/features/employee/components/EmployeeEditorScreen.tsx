"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PostAddRoundedIcon from "@mui/icons-material/PostAddRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
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
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FocusEvent, type InputHTMLAttributes, type ReactNode, type RefObject, type SyntheticEvent } from "react";

import { handleSingleDialogActionEnter } from "@/components/common/dialogKeyboard";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import styles from "@/components/master/MasterScreen.module.css";
import dicConstant from "@/constants/Constant.json";
import FamilyDetailsTab from "@/features/employee/components/FamilyDetailsTab";
import EmployeeSalarySummaryCard from "@/features/employee-salary/components/EmployeeSalarySummaryCard";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useAuthenticatedAvatar } from "@/hooks/useAuthenticatedAvatar";
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
  intEmployeeID?: number;
  blnHideSalarySummaryCard?: boolean;
  blnHideSalaryOpenPageButton?: boolean;
  blnHidePageHeading?: boolean;
  strBackRoute?: string;
  lstAccessModuleCodes?: string[];
  strMenuActionOverride?: string;
  strPageTitleOverride?: string;
};

function sanitizeMobileNumberInput(strValue: string): string {
  return strValue.replace(/[^0-9+\- ]/g, "");
}

const lstEmployeeModuleCodes = ["EMPLOYEE", "EMPLOYEES", "MASTER_EMPLOYEE"];

type TabKey = "basicInfo" | "personalIdentification" | "serviceContract" | "additionalEmployment" | "address" | "bankDetails" | "statutory" | "experience" | "qualification" | "family";

const lstTabOrder: TabKey[] = ["basicInfo", "personalIdentification", "serviceContract", "additionalEmployment", "address", "bankDetails", "statutory", "experience", "qualification", "family"];
const strRequiredAsteriskColor = "#dc2626";

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
  { strField: "strEmployeeCategory", strLabel: "Employee Category" },
  { strField: "strJobType", strLabel: "Job Type" },
  { strField: "strRestDay", strLabel: "Rest Day" },
  { strField: "strPaymentType", strLabel: "Payment Type" },
];

const lstAppointmentJoiningFields: Array<{ strField: keyof EmployeeFormValues; strLabel: string; strType?: string }> = [
  { strField: "dtAppointmentDate", strLabel: "Appointment Date", strType: "date" },
  { strField: "strAppointmentOrderNumber", strLabel: "Appointment Order Number" },
  { strField: "dtLocationJoiningDate", strLabel: "Location Joining Date", strType: "date" },
  { strField: "strInitialPostingLocation", strLabel: "Initial Posting Location" },
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
  { strField: "dtFromDate", strLabel: "From Date", strType: "date" },
  { strField: "dtToDate", strLabel: "To Date", strType: "date" },
  { strField: "intNoticePeriodDays", strLabel: "Notice Period (Days)", strType: "number" },
  { strField: "dtRetirementDate", strLabel: "Retirement Date", strType: "date" },
];

const lstAdditionalEmploymentFields: Array<{ strField: keyof EmployeeFormValues; strLabel: string; strType?: string }> = [
  { strField: "strEmployeeWorkgroup", strLabel: "Employee Workgroup" },
  { strField: "strEmployeeReservation", strLabel: "Employee Reservation" },
  { strField: "strSwon", strLabel: "SWON" },
  { strField: "strAccommodationType", strLabel: "Accommodation Type" },
  { strField: "decHousingAllowance", strLabel: "Housing Allowance", strType: "number" },
  { strField: "strPrefixLogic", strLabel: "Prefix Logic" },
];

const lstContactOptionalFields: Array<{ strField: keyof EmployeeFormValues; strLabel: string }> = [
  { strField: "strMobileCountryCode", strLabel: "Mobile Country Code" },
  { strField: "strWhatsappCountryCode", strLabel: "WhatsApp Country Code" },
  { strField: "strWhatsappNumber", strLabel: "WhatsApp Number" },
  { strField: "strEmergencyContactPerson", strLabel: "Emergency Contact Person" },
  { strField: "strEmergencyCountryCode", strLabel: "Emergency Country Code" },
  { strField: "strEmergencyMobileNumber", strLabel: "Emergency Mobile Number" },
  { strField: "strEmergencyEmail", strLabel: "Emergency Email" },
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
  dicRefs[strFirstErrorField]?.current?.focus();
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
    return `/api/auth/avatar/current?employee_id=${intEmployeeID}&v=${Date.now()}`;
  }

  const strVersionedAvatarUrl = new URL(strResolvedAvatarUrl, window.location.origin);
  strVersionedAvatarUrl.searchParams.set("v", Date.now().toString());
  return `${strVersionedAvatarUrl.pathname}${strVersionedAvatarUrl.search}`;
}

export default function EmployeeEditorScreen({
  strMode,
  intEmployeeID,
  blnHideSalarySummaryCard = false,
  blnHideSalaryOpenPageButton = false,
  blnHidePageHeading = false,
  strBackRoute = "/employees",
  lstAccessModuleCodes = lstEmployeeModuleCodes,
  strMenuActionOverride,
  strPageTitleOverride
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
  const [intResolvedEmployeeID, setIntResolvedEmployeeID] = useState<number | null>(intEmployeeID ?? null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnBasicSaving, setBlnBasicSaving] = useState(false);
  const [blnAddressSaving, setBlnAddressSaving] = useState(false);
  const [blnBankSaving, setBlnBankSaving] = useState(false);
  const [blnStatutorySaving, setBlnStatutorySaving] = useState(false);
  const [blnExperienceSaving, setBlnExperienceSaving] = useState(false);
  const [blnQualificationSaving, setBlnQualificationSaving] = useState(false);
  const [objAlertDialog, setObjAlertDialog] = useState({
    blnOpen: false,
    strMessage: "",
    strSeverity: "success" as "success" | "error",
    strTitle: "",
  });
  const [strEmployeeAvatarUrl, setStrEmployeeAvatarUrl] = useState("");
  const [blnAvatarUpdating, setBlnAvatarUpdating] = useState(false);
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
  const strAvatarText = (strDisplayEmployeeName || dicBasicForm.strEmployeeCode || "E").trim().charAt(0).toUpperCase() || "E";
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

        if ((strMode === "edit" || strMode === "view") && intEmployeeID) {
          const dicEmployee = await employeeService.getEmployeeById(intEmployeeID, objEmployeeRequestOptions);
          if (!blnMounted) {
            return;
          }

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
  }, [intEmployeeID, strMode, blnRightsLoading, blnCanView, blnCanEdit, blnCanViewBankDetails, blnCanViewStatutoryDetails, objEmployeeRequestOptions]);

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
          {renderSelectField(
            strLabel,
            String(dicBasicForm[strField] ?? ""),
            (objValue) => updateBasicField(strField, String(objValue) as never),
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
    if (!dicBankForm.strAccountNumber.trim()) {
      dicNextErrors.strAccountNumber = t("validation_account_number_required", dicConstant.employeeMaster.validation.accountNumberRequired);
    }
    if (dicBankForm.blnSecondaryIsActive) {
      if (dicBankForm.intSecondaryBankID === "") {
        dicNextErrors.intSecondaryBankID = t("validation_secondary_bank_required", dicConstant.employeeMaster.validation.secondaryBankRequired);
      }
      if (!dicBankForm.strSecondaryAccountHolderName.trim()) {
        dicNextErrors.strSecondaryAccountHolderName = t("validation_secondary_account_holder_required", dicConstant.employeeMaster.validation.secondaryAccountHolderRequired);
      }
      if (!dicBankForm.strSecondaryAccountNumber.trim()) {
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
      objRouter.replace(`/employees/edit/${dicSavedEmployee.intID}`);
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
      openAlertDialog("success", strMode === "add" && intEmployeeID === undefined ? t("save_success", dicConstant.employeeMaster.saveSuccess) : t("update_success", dicConstant.employeeMaster.updateSuccess));
      if (strMode === "add") {
        objRouter.replace(`/employees/edit/${dicSavedEmployee.intID}`);
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
        focusFirstError(dicValidationErrors, dicFieldRefs, ["strAddressLine1", "intCountryID"]);
        return;
      }
    } else {
      setDicAddressErrors({});
    }

    if (blnCanViewBankDetails && hasBankData()) {
      const dicValidationErrors = validateBankForm();
      if (Object.keys(dicValidationErrors).length > 0) {
        setStrActiveTab("bankDetails");
        focusFirstError(dicValidationErrors, dicFieldRefs, ["intBankID", "strAccountHolderName", "strAccountNumber", "intSecondaryBankID", "strSecondaryAccountHolderName", "strSecondaryAccountNumber"]);
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
        objRouter.replace(`/employees/edit/${dicSavedEmployee.intID}`);
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
        objRouter.replace(`/employees/edit/${dicSavedEmployee.intID}`);
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
      focusFirstError(dicValidationErrors, dicFieldRefs, [
        "intBankID",
        "strAccountHolderName",
        "strAccountNumber",
        "intSecondaryBankID",
        "strSecondaryAccountHolderName",
        "strSecondaryAccountNumber"
      ]);
      return;
    }
    setBlnBankSaving(true);
    try {
      const intEmployeeIDToSave = await ensureEmployeeRecordForTabSave();
      const dicRecord = await employeeService.saveEmployeeBankAccount(intEmployeeIDToSave, dicBankForm, objEmployeeRequestOptions);
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
    objInputRef?: RefObject<HTMLInputElement | null>
  ) {
    return (
      <TextField
        select
        label={objLabel}
        inputRef={objInputRef}
        value={objValue}
        onChange={(objEvent) => fnOnChange((objEvent.target.value ? Number.isNaN(Number(objEvent.target.value)) ? objEvent.target.value : Number(objEvent.target.value) : "") as TValue)}
        disabled={blnDisabled}
        error={blnError}
        helperText={strHelperText}
        fullWidth
      >
        <MenuItem value="">Select</MenuItem>
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

  if (blnLoading || blnRightsLoading) {
    return (
      <Box sx={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: "#64748b" }}>{t("editor_loading", dicConstant.employeeMaster.editorLoading)}</Typography>
        </Stack>
      </Box>
    );
  }

  const objPageActionConfig = getFooterActionConfig();
  const fnHandleBack = () => {
    objRouter.push(strBackRoute);
  };

  return (
    <Stack spacing={2.5} onFocusCapture={handleEditorFocusCapture}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} alignItems={{ sm: "center" }}>
        <Box>
          {!blnHidePageHeading ? (
            <Typography
              sx={{
                mt: 0.5,
                fontWeight: 800,
                color: "#1f2937",
                fontSize: "clamp(1.35rem, 1.9vw, 1.75rem)",
                lineHeight: 1.05,
              }}
            >
              {strPageTitleOverride
                ? strPageTitleOverride
                : strMode === "add"
                  ? t("add_page_title", dicConstant.employeeMaster.addPageTitle)
                  : strMode === "view"
                    ? t("view_page_title", dicConstant.employeeMaster.dialogViewTitle ?? "View Employee")
                    : t("edit_page_title", dicConstant.employeeMaster.editPageTitle)}
            </Typography>
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
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ width: { xs: "100%", sm: "auto" } }}>
            <Button
              data-controlid="employee.editor.back.button"
              className={styles.secondaryButton}
              variant="outlined"
              startIcon={<ArrowBackRoundedIcon />}
              onClick={fnHandleBack}
              sx={{
                borderRadius: "14px",
                height: 38,
                minHeight: 38,
                py: 0,
                px: 2.25,
                minWidth: 108,
                fontSize: "0.9rem",
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
                startIcon={<SaveRoundedIcon />}
                onClick={handlePartialSave}
                disabled={objPageActionConfig.blnDisabled}
                sx={{
                  borderRadius: "14px",
                  height: 38,
                  minHeight: 38,
                  py: 0,
                  px: 2.25,
                  minWidth: 128,
                  fontSize: "0.9rem",
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
                startIcon={<SaveRoundedIcon />}
                onClick={objPageActionConfig.fnOnClick}
                disabled={objPageActionConfig.blnDisabled}
                sx={{
                  borderRadius: "14px",
                  height: 38,
                  minHeight: 38,
                  py: 0,
                  px: 2.25,
                  minWidth: 108,
                  fontSize: "0.9rem",
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

      <Paper sx={{ borderRadius: "26px", border: "1px solid rgba(148,163,184,0.24)", p: { xs: 2, md: 3 } }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} alignItems={{ xs: "stretch", md: "flex-start" }}>
          <Box sx={{ display: "grid", gap: 2, flex: 1, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" } }}>
            <TextField data-controlid="employee.editor.employee-code.input" inputProps={{ "data-controlid": "employee.editor.employee-code.input" }} label={renderRequiredLabel(t("field_employee_code", dicConstant.employeeMaster.fields.employeeCode))} inputRef={dicFieldRefs.strEmployeeCode} value={dicBasicForm.strEmployeeCode} onChange={(objEvent) => updateBasicField("strEmployeeCode", objEvent.target.value.toUpperCase())} error={Boolean(dicBasicErrors.strEmployeeCode)} helperText={dicBasicErrors.strEmployeeCode} disabled={blnViewOnly} fullWidth />
            <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", minWidth: 0 }}>
              {renderSelectField(t("field_gender", dicConstant.employeeMaster.fields.gender), dicBasicForm.strGender, (objValue) => updateBasicField("strGender", String(objValue)), objFormOptions?.lstGenders ?? [], blnViewOnly)}
              {renderSelectField(t("field_title", dicConstant.employeeMaster.fields.title), dicBasicForm.strTitle, (objValue) => updateBasicField("strTitle", String(objValue)), objFormOptions?.lstTitles ?? [], blnViewOnly)}
            </Box>
            <TextField data-controlid="employee.editor.first-name.input" inputProps={{ "data-controlid": "employee.editor.first-name.input" }} label={renderRequiredLabel(t("field_first_name", dicConstant.employeeMaster.fields.firstName))} inputRef={dicFieldRefs.strFirstName} value={dicBasicForm.strFirstName} onChange={(objEvent) => updateBasicField("strFirstName", objEvent.target.value)} error={Boolean(dicBasicErrors.strFirstName)} helperText={dicBasicErrors.strFirstName} disabled={blnViewOnly} fullWidth />
            <TextField data-controlid="employee.editor.middle-name.input" inputProps={{ "data-controlid": "employee.editor.middle-name.input" }} label={t("field_middle_name", dicConstant.employeeMaster.fields.middleName)} value={dicBasicForm.strMiddleName} onChange={(objEvent) => updateBasicField("strMiddleName", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
            <TextField data-controlid="employee.editor.last-name.input" inputProps={{ "data-controlid": "employee.editor.last-name.input" }} label={t("field_last_name", dicConstant.employeeMaster.fields.lastName)} value={dicBasicForm.strLastName} onChange={(objEvent) => updateBasicField("strLastName", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
            <TextField data-controlid="employee.editor.date-of-birth.input" inputProps={{ "data-controlid": "employee.editor.date-of-birth.input" }} type="date" label={t("field_date_of_birth", dicConstant.employeeMaster.fields.dateOfBirth)} value={dicBasicForm.dtDateOfBirth} onChange={(objEvent) => updateBasicField("dtDateOfBirth", objEvent.target.value)} error={Boolean(dicBasicErrors.dtDateOfBirth)} helperText={dicBasicErrors.dtDateOfBirth} InputLabelProps={{ shrink: true }} disabled={blnViewOnly} fullWidth />
            <RadioGroup
              row
              value={dicBasicForm.blnIsWorker ? "worker" : "nonWorker"}
              onChange={(objEvent) => {
                const strValue = objEvent.target.value;
                updateBasicField("blnIsWorker", strValue === "worker");
              }}
            >
              <FormControlLabel
                value="worker"
                control={<Radio disabled={blnViewOnly} />}
                label={t("field_worker", "Worker")}
                sx={{ m: 0 }}
                disabled={blnViewOnly}
              />
              <FormControlLabel
                value="nonWorker"
                control={<Radio disabled={blnViewOnly} />}
                label={t("field_non_worker", "Non-Worker")}
                sx={{ m: 0 }}
                disabled={blnViewOnly}
              />
            </RadioGroup>
            <FormControlLabel
              control={<ActiveStatusSwitch testId="employee.editor.employment-status.switch" blnIsActive={dicBasicForm.strEmploymentStatus === "Active"} onChange={(blnChecked) => updateBasicField("strEmploymentStatus", blnChecked ? "Active" : "Inactive")} disabled={blnViewOnly} />}
              label={t("field_employment_status", dicConstant.employeeMaster.fields.employmentStatus)}
              sx={{ m: 0, alignSelf: "center", justifySelf: "start", gap: 0.75 }}
              disabled={blnViewOnly}
            />
          </Box>

          <Stack spacing={1.1} alignItems="center" sx={{ width: { xs: "100%", md: 118 }, flexShrink: 0, pt: { md: 0.5 }, order: { xs: -1, md: 0 }, ml: { md: "auto" } }}>
            <Box
              sx={{
                position: "relative",
                borderRadius: "50%",
                p: "3px",
                boxShadow: "0 8px 20px rgba(15,23,42,0.12)",
                border: "2px solid rgba(37,99,235,0.2)",
                transition: "all 0.2s ease",
                "&:hover .employee-avatar-overlay": {
                  opacity: intResolvedEmployeeID && !blnViewOnly ? 1 : 0
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
                className="employee-avatar-overlay"
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
              {blnViewOnly ? null : (
                <IconButton
                  component="label"
                  data-control-id="employee-master-profile-photo-upload"
                  size="small"
                  sx={{
                    position: "absolute",
                    right: -2,
                    bottom: -2,
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    p: 0,
                    bgcolor: "#2563eb",
                    color: "#ffffff",
                    boxShadow: "0 10px 22px rgba(37,99,235,0.35)",
                    "&:hover": { bgcolor: "#1d4ed8" },
                    "&.Mui-disabled": { bgcolor: "#94a3b8", color: "#e2e8f0" }
                  }}
                  disabled={blnAvatarUpdating || !intResolvedEmployeeID}
                >
                  {blnAvatarUpdating ? <CircularProgress size={14} color="inherit" /> : <EditRoundedIcon sx={{ fontSize: 16 }} />}
                  <input
                    hidden
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    data-control-id="employee-master-profile-photo-file"
                    onChange={handleAvatarUpload}
                  />
                </IconButton>
              )}
            </Box>
            {strAvatarError ? <Typography sx={{ fontSize: 12, color: "#b91c1c", maxWidth: 220, textAlign: "center" }}>{strAvatarError}</Typography> : null}
          </Stack>
        </Stack>
      </Paper>

      {/* Existing employees expose the same salary snapshot in edit and view modes. */}
      {strMode !== "add" && !blnHideSalarySummaryCard ? (
        <EmployeeSalarySummaryCard
          intEmployeeID={intResolvedEmployeeID}
          blnHideOpenPageButton={blnHideSalaryOpenPageButton}
        />
      ) : null}

      <Paper sx={{ borderRadius: "26px", overflow: "hidden", border: "1px solid rgba(148,163,184,0.24)" }}>
        <Box sx={{ borderBottom: "1px solid #e2e8f0", px: { xs: 1, md: 2 }, bgcolor: "#f8fafc" }}>
          <Tabs
            data-controlid="employee.editor.tabs"
            value={strVisibleActiveTab}
            onChange={(_, strNextValue) => setStrActiveTab(strNextValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {lstVisibleTabOrder.map((strTabKey) => (
              <Tab
                key={strTabKey}
                value={strTabKey}
                data-controlid={`employee.editor.${strTabKey}.tab`}
                sx={{ textTransform: "none" }}
                label={strTabKey === "basicInfo"
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
              />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {(["basicInfo", "personalIdentification", "serviceContract", "additionalEmployment"] as TabKey[]).includes(strVisibleActiveTab) ? (
            <Stack spacing={3}>
              {strVisibleActiveTab === "basicInfo" ? <Box>
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" } }}>
                  <TextField data-controlid="employee.editor.date-of-joining.input" inputProps={{ "data-controlid": "employee.editor.date-of-joining.input" }} type="date" label={renderRequiredLabel(t("field_date_of_joining", dicConstant.employeeMaster.fields.dateOfJoining))} inputRef={dicFieldRefs.dtDateOfJoining} value={dicBasicForm.dtDateOfJoining} onChange={(objEvent) => updateBasicField("dtDateOfJoining", objEvent.target.value)} error={Boolean(dicBasicErrors.dtDateOfJoining)} helperText={dicBasicErrors.dtDateOfJoining} InputLabelProps={{ shrink: true }} disabled={blnViewOnly} fullWidth />
                  {renderSelectField(renderRequiredLabel(t("field_employment_type", dicConstant.employeeMaster.fields.employmentType)), dicBasicForm.intEmploymentTypeID, (objValue) => updateBasicField("intEmploymentTypeID", objValue as number | ""), objFormOptions?.lstEmploymentTypes ?? [], blnViewOnly, dicBasicErrors.intEmploymentTypeID, Boolean(dicBasicErrors.intEmploymentTypeID), dicFieldRefs.intEmploymentTypeID)}
                  <Box sx={{ display: "flex", alignItems: "center", height: 56, alignSelf: "start" }}>
                    <FormControlLabel
                      control={<Switch checked={dicBasicForm.blnIsEssEnabled} onChange={(_, blnChecked) => updateBasicField("blnIsEssEnabled", blnChecked)} disabled={blnViewOnly} inputProps={{ "data-controlid": "employee.editor.ess-enabled.switch" } as InputHTMLAttributes<HTMLInputElement>} />}
                      label={t("field_ess_enabled", dicConstant.employeeMaster.fields.essEnabled)}
                      sx={{ m: 0 }}
                    />
                  </Box>
                  {renderSelectField(t("field_department", dicConstant.employeeMaster.fields.department), dicBasicForm.intDepartmentID, (objValue) => updateBasicField("intDepartmentID", objValue as number | ""), objFormOptions?.lstDepartments ?? [], blnViewOnly)}
                  {renderSelectField(t("field_designation", dicConstant.employeeMaster.fields.designation), dicBasicForm.intDesignationID, (objValue) => updateBasicField("intDesignationID", objValue as number | ""), objFormOptions?.lstDesignations ?? [], blnViewOnly)}
                  {renderSelectField(t("field_grade", dicConstant.employeeMaster.fields.grade), dicBasicForm.intGradeID, (objValue) => updateBasicField("intGradeID", objValue as number | ""), objFormOptions?.lstGrades ?? [], blnViewOnly)}
                  {renderSelectField(renderRequiredLabel(t("field_location", dicConstant.employeeMaster.fields.location)), dicBasicForm.intLocationID, (objValue) => updateBasicField("intLocationID", objValue as number | ""), objFormOptions?.lstLocations ?? [], blnViewOnly, dicBasicErrors.intLocationID, Boolean(dicBasicErrors.intLocationID), dicFieldRefs.intLocationID)}
                  {renderSelectField(t("field_cost_center", dicConstant.employeeMaster.fields.costCenter), dicBasicForm.intCostCenterID, (objValue) => updateBasicField("intCostCenterID", objValue as number | ""), objFormOptions?.lstCostCenters ?? [], blnViewOnly)}
                  {renderSelectField(t("field_payroll_group", dicConstant.employeeMaster.fields.payrollGroup), dicBasicForm.intPayrollGroupID, (objValue) => updateBasicField("intPayrollGroupID", objValue as number | ""), objFormOptions?.lstPayrollGroups ?? [], blnViewOnly)}
                  {renderSelectField(renderRequiredLabel(t("field_manager", dicConstant.employeeMaster.fields.manager)), dicBasicForm.intManagerEmployeeID, (objValue) => updateReportingManagerField(objValue as number | ""), lstManagerOptions, blnViewOnly, dicBasicErrors.intManagerEmployeeID, Boolean(dicBasicErrors.intManagerEmployeeID), dicFieldRefs.intManagerEmployeeID)}
                  {renderSelectField(renderRequiredLabel(t("field_line_manager", "Line Manager")), dicBasicForm.intLineManagerEmployeeID, (objValue) => updateBasicField("intLineManagerEmployeeID", (objValue || dicBasicForm.intManagerEmployeeID) as number | ""), lstManagerOptions, blnViewOnly, dicBasicErrors.intLineManagerEmployeeID, Boolean(dicBasicErrors.intLineManagerEmployeeID), dicFieldRefs.intLineManagerEmployeeID)}
                  {renderSelectField(t("field_preferred_language", dicConstant.employeeMaster.fields.preferredLanguage), dicBasicForm.intPreferredLanguageID, (objValue) => updateBasicField("intPreferredLanguageID", objValue as number | ""), objFormOptions?.lstLanguages ?? [], blnViewOnly)}
                  {lstEmploymentAssignmentFields.map((dicField) => renderOptionalEmployeeField(dicField.strField, dicField.strLabel, dicField.strType))}
                </Box>
              </Box> : null}

              {strVisibleActiveTab === "personalIdentification" ? <Box>
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" } }}>
                  {renderSelectField("Nationality", dicBasicForm.intNationalityCountryID, (objValue) => updateBasicField("intNationalityCountryID", objValue as number | ""), objFormOptions?.lstNationalities ?? [], blnViewOnly)}
                  {renderSelectField("Mother Tongue", dicBasicForm.intMotherTongueLanguageID, (objValue) => updateBasicField("intMotherTongueLanguageID", objValue as number | ""), objFormOptions?.lstMotherTongues ?? [], blnViewOnly)}
                  {lstPersonalOptionalFields.slice(0, 5).map((dicField) => renderOptionalEmployeeField(dicField.strField, dicField.strLabel, dicField.strType))}
                  <Box aria-hidden sx={{ display: { xs: "none", md: "block" } }} />
                  {lstPersonalOptionalFields.slice(5).map((dicField) => renderOptionalEmployeeField(dicField.strField, dicField.strLabel, dicField.strType))}
                </Box>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 1 }}>
                  <FormControlLabel control={<Switch checked={dicBasicForm.blnHasDisability} onChange={(_, value) => updateBasicField("blnHasDisability", value)} disabled={blnViewOnly} />} label="Has Disability" />
                  <FormControlLabel control={<Switch checked={dicBasicForm.blnSuperannuationFlag} onChange={(_, value) => updateBasicField("blnSuperannuationFlag", value)} disabled={blnViewOnly} />} label="Superannuation" />
                  <FormControlLabel control={<Switch checked={dicBasicForm.blnIsRelatedEmployee} onChange={(_, value) => { updateBasicField("blnIsRelatedEmployee", value); if (!value) updateBasicField("intRelatedEmployeeID", ""); }} disabled={blnViewOnly} />} label="Related Employee" />
                </Stack>
                {dicBasicForm.blnIsRelatedEmployee ? (
                  <Box sx={{ mt: 1.5, maxWidth: 420 }}>
                    {renderSelectField("Related Employee", dicBasicForm.intRelatedEmployeeID, (objValue) => updateBasicField("intRelatedEmployeeID", objValue as number | ""), lstManagerOptions, blnViewOnly)}
                  </Box>
                ) : null}
              </Box> : null}

              {strVisibleActiveTab === "serviceContract" ? (
                <Stack spacing={3}>
                  <Box>
                    <Typography sx={{ mb: 1.5, fontWeight: 700, color: "#334155" }}>Appointment & Joining</Typography>
                    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" } }}>
                      {lstAppointmentJoiningFields.map((dicField) => renderOptionalEmployeeField(dicField.strField, dicField.strLabel, dicField.strType))}
                    </Box>
                  </Box>
                  <Box>
                    <Typography sx={{ mb: 1.5, fontWeight: 700, color: "#334155" }}>Probation & Confirmation</Typography>
                    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" } }}>
                      {lstProbationConfirmationFields.map((dicField) => renderOptionalEmployeeField(dicField.strField, dicField.strLabel, dicField.strType))}
                    </Box>
                  </Box>
                  <Box>
                    <Typography sx={{ mb: 1.5, fontWeight: 700, color: "#334155" }}>Contract / Service Period</Typography>
                    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" } }}>
                      {lstContractServiceFields.map((dicField) => renderOptionalEmployeeField(dicField.strField, dicField.strLabel, dicField.strType))}
                      <TextField data-controlid="employee.editor.date-of-exit.input" inputProps={{ "data-controlid": "employee.editor.date-of-exit.input" }} type="date" label={t("field_date_of_exit", dicConstant.employeeMaster.fields.dateOfExit)} value={dicBasicForm.dtDateOfExit} onChange={(objEvent) => updateBasicField("dtDateOfExit", objEvent.target.value)} error={Boolean(dicBasicErrors.dtDateOfExit)} helperText={dicBasicErrors.dtDateOfExit} InputLabelProps={{ shrink: true }} disabled={blnViewOnly || dicBasicForm.strEmploymentStatus === "Active"} fullWidth />
                    </Box>
                  </Box>
                </Stack>
              ) : null}

              {strVisibleActiveTab === "additionalEmployment" ? <Box>
                <Box sx={{ display: "grid", gap: 2, alignItems: "center", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" } }}>
                  {lstAdditionalEmploymentFields.slice(0, 5).map((dicField) => renderOptionalEmployeeField(dicField.strField, dicField.strLabel, dicField.strType))}
                  <FormControlLabel control={<Switch checked={dicBasicForm.blnFlatGiven} onChange={(_, value) => updateBasicField("blnFlatGiven", value)} disabled={blnViewOnly} />} label="Flat Given" sx={{ m: 0 }} />
                  {renderOptionalEmployeeField("strPrefixLogic", "Prefix Logic")}
                  <FormControlLabel control={<Switch checked={dicBasicForm.blnUgcAppraisalFlag} onChange={(_, value) => updateBasicField("blnUgcAppraisalFlag", value)} disabled={blnViewOnly} />} label="UGC Appraisal" sx={{ m: 0 }} />
                </Box>
                <TextField key="strEmployeeRemark" data-controlid="employee.editor.strEmployeeRemark.input" data-control-id="employee.editor.strEmployeeRemark.input" label="Employee Remark" value={dicBasicForm.strEmployeeRemark} onChange={(objEvent) => updateBasicField("strEmployeeRemark", objEvent.target.value)} disabled={blnViewOnly} multiline minRows={3} fullWidth sx={{ mt: 2 }} />
              </Box> : null}
            </Stack>
          ) : null}

          {strVisibleActiveTab === "address" ? (
            <Stack spacing={3}>
              <Box>
                <Typography sx={{ mb: 1.5, fontWeight: 700, color: "#334155" }}>Employee Contact</Typography>
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" } }}>
                <TextField data-controlid="employee.editor.work-email.input" inputProps={{ "data-controlid": "employee.editor.work-email.input" }} label={t("field_work_email", dicConstant.employeeMaster.fields.workEmail)} inputRef={dicFieldRefs.strWorkEmail} value={dicBasicForm.strWorkEmail} onChange={(objEvent) => updateBasicField("strWorkEmail", objEvent.target.value)} error={Boolean(dicBasicErrors.strWorkEmail)} helperText={dicBasicErrors.strWorkEmail} disabled={blnViewOnly} fullWidth />
                <TextField data-controlid="employee.editor.personal-email.input" inputProps={{ "data-controlid": "employee.editor.personal-email.input" }} label={t("field_personal_email", dicConstant.employeeMaster.fields.personalEmail)} inputRef={dicFieldRefs.strPersonalEmail} value={dicBasicForm.strPersonalEmail} onChange={(objEvent) => updateBasicField("strPersonalEmail", objEvent.target.value)} error={Boolean(dicBasicErrors.strPersonalEmail)} helperText={dicBasicErrors.strPersonalEmail} disabled={blnViewOnly} fullWidth />
                {renderOptionalEmployeeField("strMobileCountryCode", "Mobile Country Code")}
                <TextField
                  data-controlid="employee.editor.mobile-number.input"
                  inputProps={{
                    "data-controlid": "employee.editor.mobile-number.input",
                    inputMode: "tel",
                    pattern: "[0-9+\\- ]*"
                  }}
                  label={t("field_mobile_number", dicConstant.employeeMaster.fields.mobileNumber)}
                  inputRef={dicFieldRefs.strMobileNumber}
                  value={dicBasicForm.strMobileNumber}
                  onChange={(objEvent) => updateBasicField("strMobileNumber", sanitizeMobileNumberInput(objEvent.target.value))}
                  error={Boolean(dicBasicErrors.strMobileNumber)}
                  helperText={dicBasicErrors.strMobileNumber}
                  disabled={blnViewOnly}
                  fullWidth
                />
                {renderOptionalEmployeeField("strWhatsappCountryCode", "WhatsApp Country Code")}
                {renderOptionalEmployeeField("strWhatsappNumber", "WhatsApp Number")}
              </Box>
              </Box>
              <Box>
                <Typography sx={{ mb: 1.5, fontWeight: 700, color: "#334155" }}>Emergency Contact</Typography>
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" } }}>
                  {lstContactOptionalFields.slice(3).map((dicField) => renderOptionalEmployeeField(dicField.strField, dicField.strLabel))}
                </Box>
              </Box>
              <Box>
                <Typography sx={{ mb: 1.5, fontWeight: 700, color: "#334155" }}>Address</Typography>
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" } }}>
                {renderSelectField(t("field_address_type", dicConstant.employeeMaster.fields.addressType), dicAddressForm.strAddressType, (objValue) => updateAddressField("strAddressType", String(objValue)), objFormOptions?.lstAddressTypes ?? [], blnViewOnly)}
                <TextField data-controlid="employee.editor.address-line1.input" inputProps={{ "data-controlid": "employee.editor.address-line1.input" }} label={renderRequiredLabel(t("field_address_line1", dicConstant.employeeMaster.fields.addressLine1))} inputRef={dicFieldRefs.strAddressLine1} value={dicAddressForm.strAddressLine1} onChange={(objEvent) => updateAddressField("strAddressLine1", objEvent.target.value)} error={Boolean(dicAddressErrors.strAddressLine1)} helperText={dicAddressErrors.strAddressLine1} disabled={blnViewOnly} fullWidth />
                <TextField data-controlid="employee.editor.address-line2.input" inputProps={{ "data-controlid": "employee.editor.address-line2.input" }} label={t("field_address_line2", dicConstant.employeeMaster.fields.addressLine2)} value={dicAddressForm.strAddressLine2} onChange={(objEvent) => updateAddressField("strAddressLine2", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                <TextField data-controlid="employee.editor.city.input" inputProps={{ "data-controlid": "employee.editor.city.input" }} label={t("field_city", dicConstant.employeeMaster.fields.cityName)} value={dicAddressForm.strCityName} onChange={(objEvent) => updateAddressField("strCityName", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                {renderSelectField(t("field_state", dicConstant.employeeMaster.fields.state), dicAddressForm.intStateID, (objValue) => updateAddressField("intStateID", objValue as number | ""), objFormOptions?.lstStates ?? [], blnViewOnly)}
                {renderSelectField(renderRequiredLabel(t("field_country", dicConstant.employeeMaster.fields.country)), dicAddressForm.intCountryID, (objValue) => updateAddressField("intCountryID", objValue as number | ""), objFormOptions?.lstCountries ?? [], blnViewOnly, dicAddressErrors.intCountryID, Boolean(dicAddressErrors.intCountryID), dicFieldRefs.intCountryID)}
                <TextField data-controlid="employee.editor.postal-code.input" inputProps={{ "data-controlid": "employee.editor.postal-code.input" }} label={t("field_postal_code", dicConstant.employeeMaster.fields.postalCode)} value={dicAddressForm.strPostalCode} onChange={(objEvent) => updateAddressField("strPostalCode", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                </Box>
              </Box>
            </Stack>
          ) : null}

          {blnCanViewBankDetails && strVisibleActiveTab === "bankDetails" ? (
            <Box sx={{ display: "grid", gap: 3, alignItems: "stretch", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" } }}>
              <Box sx={{ border: "1px solid rgba(148,163,184,0.24)", borderRadius: "18px", p: 2.5, height: "100%" }}>
                <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={1} sx={{ mb: 1.5 }}>
                  <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>{t("primary_bank_details", "Primary Bank Details")}</Typography>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <FormControlLabel
                      control={<ActiveStatusSwitch blnIsActive={dicBankForm.blnIsActive} onChange={(blnChecked) => updateBankField("blnIsActive", blnChecked)} disabled={blnViewOnly} />}
                      label={t("field_bank_active", dicConstant.employeeMaster.fields.bankActive)}
                      sx={{ m: 0 }}
                    />
                    <FormControlLabel
                      control={<Switch checked={dicBankForm.blnIsPrimary} onChange={(_, blnChecked) => updateBankField("blnIsPrimary", blnChecked)} disabled={blnViewOnly} />}
                      label={t("field_is_primary", dicConstant.employeeMaster.fields.isPrimary)}
                      sx={{ m: 0 }}
                    />
                  </Stack>
                </Stack>
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" } }}>
                  {renderSelectField(renderRequiredLabel(t("field_bank", dicConstant.employeeMaster.fields.bank)), dicBankForm.intBankID, (objValue) => updateBankField("intBankID", objValue as number | ""), objFormOptions?.lstBanks ?? [], blnViewOnly, dicBankErrors.intBankID, Boolean(dicBankErrors.intBankID), dicFieldRefs.intBankID)}
                  <TextField label="Branch Name" value={dicBankForm.strBranchName} onChange={(objEvent) => updateBankField("strBranchName", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                  <TextField data-controlid="employee.editor.account-holder-name.input" inputProps={{ "data-controlid": "employee.editor.account-holder-name.input" }} label={renderRequiredLabel(t("field_account_holder_name", dicConstant.employeeMaster.fields.accountHolderName))} inputRef={dicFieldRefs.strAccountHolderName} value={dicBankForm.strAccountHolderName} onChange={(objEvent) => updateBankField("strAccountHolderName", objEvent.target.value)} error={Boolean(dicBankErrors.strAccountHolderName)} helperText={dicBankErrors.strAccountHolderName} disabled={blnViewOnly} fullWidth />
                  {renderSelectField("Account Type", dicBankForm.strAccountType, (objValue) => updateBankField("strAccountType", String(objValue)), objFormOptions?.lstBankAccountTypes ?? [], blnViewOnly)}
                  <TextField data-controlid="employee.editor.account-number.input" inputProps={{ "data-controlid": "employee.editor.account-number.input" }} label={renderRequiredLabel(t("field_account_number", dicConstant.employeeMaster.fields.accountNumber))} inputRef={dicFieldRefs.strAccountNumber} value={dicBankForm.strAccountNumber} onChange={(objEvent) => updateBankField("strAccountNumber", objEvent.target.value)} error={Boolean(dicBankErrors.strAccountNumber)} helperText={dicBankErrors.strAccountNumber} disabled={blnViewOnly} fullWidth />
                  <TextField data-controlid="employee.editor.ifsc-code.input" inputProps={{ "data-controlid": "employee.editor.ifsc-code.input" }} label={t("field_ifsc_code", dicConstant.employeeMaster.fields.ifscCode)} value={dicBankForm.strIfscCode} onChange={(objEvent) => updateBankField("strIfscCode", objEvent.target.value.toUpperCase())} disabled={blnViewOnly} fullWidth />
                  <TextField data-controlid="employee.editor.swift-code.input" inputProps={{ "data-controlid": "employee.editor.swift-code.input", maxLength: 20 }} label="SWIFT Code" value={dicBankForm.strSwiftCode} onChange={(objEvent) => updateBankField("strSwiftCode", objEvent.target.value.toUpperCase())} disabled={blnViewOnly} fullWidth />
                  <TextField type="email" label="Account Holder Email" value={dicBankForm.strAccountHolderEmail} onChange={(objEvent) => updateBankField("strAccountHolderEmail", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                </Box>
              </Box>

              <Box sx={{ border: "1px solid rgba(148,163,184,0.24)", borderRadius: "18px", p: 2.5, height: "100%" }}>
                <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={1} sx={{ mb: dicBankForm.blnSecondaryIsActive ? 1.5 : 0 }}>
                  <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>{t("field_secondary_bank_details", dicConstant.employeeMaster.fields.secondaryBankDetails)}</Typography>
                  <FormControlLabel
                    control={
                      <ActiveStatusSwitch
                        blnIsActive={dicBankForm.blnSecondaryIsActive}
                        onChange={(blnChecked) => {
                          updateBankField("blnSecondaryIsActive", blnChecked);
                          if (!blnChecked) {
                            updateBankField("intSecondaryBankID", "");
                            updateBankField("strSecondaryAccountHolderName", "");
                            updateBankField("strSecondaryAccountNumber", "");
                            updateBankField("strSecondaryIfscCode", "");
                          }
                        }}
                        disabled={blnViewOnly}
                      />
                    }
                    label={t("field_secondary_bank_active", dicConstant.employeeMaster.fields.secondaryBankActive)}
                    sx={{ m: 0 }}
                  />
                </Stack>
                {dicBankForm.blnSecondaryIsActive ? (
                  <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" } }}>
                    {renderSelectField(renderRequiredLabel(t("field_secondary_bank", dicConstant.employeeMaster.fields.secondaryBank)), dicBankForm.intSecondaryBankID, (objValue) => updateBankField("intSecondaryBankID", objValue as number | ""), objFormOptions?.lstBanks ?? [], blnViewOnly, dicBankErrors.intSecondaryBankID, Boolean(dicBankErrors.intSecondaryBankID), dicFieldRefs.intSecondaryBankID)}
                    <TextField data-controlid="employee.editor.secondary-account-holder-name.input" inputProps={{ "data-controlid": "employee.editor.secondary-account-holder-name.input" }} label={renderRequiredLabel(t("field_secondary_account_holder_name", dicConstant.employeeMaster.fields.secondaryAccountHolderName))} inputRef={dicFieldRefs.strSecondaryAccountHolderName} value={dicBankForm.strSecondaryAccountHolderName} onChange={(objEvent) => updateBankField("strSecondaryAccountHolderName", objEvent.target.value)} error={Boolean(dicBankErrors.strSecondaryAccountHolderName)} helperText={dicBankErrors.strSecondaryAccountHolderName} disabled={blnViewOnly} fullWidth />
                    <TextField data-controlid="employee.editor.secondary-account-number.input" inputProps={{ "data-controlid": "employee.editor.secondary-account-number.input" }} label={renderRequiredLabel(t("field_secondary_account_number", dicConstant.employeeMaster.fields.secondaryAccountNumber))} inputRef={dicFieldRefs.strSecondaryAccountNumber} value={dicBankForm.strSecondaryAccountNumber} onChange={(objEvent) => updateBankField("strSecondaryAccountNumber", objEvent.target.value)} error={Boolean(dicBankErrors.strSecondaryAccountNumber)} helperText={dicBankErrors.strSecondaryAccountNumber} disabled={blnViewOnly} fullWidth />
                    <TextField data-controlid="employee.editor.secondary-ifsc-code.input" inputProps={{ "data-controlid": "employee.editor.secondary-ifsc-code.input" }} label={t("field_secondary_ifsc_code", dicConstant.employeeMaster.fields.secondaryIfscCode)} value={dicBankForm.strSecondaryIfscCode} onChange={(objEvent) => updateBankField("strSecondaryIfscCode", objEvent.target.value.toUpperCase())} disabled={blnViewOnly} fullWidth />
                  </Box>
                ) : null}
              </Box>
            </Box>
          ) : null}

          {blnCanViewStatutoryDetails && strVisibleActiveTab === "statutory" ? (
            <Stack spacing={3} sx={{ width: "100%" }}>
              <Box>
                <Typography sx={{ mb: 1.5, fontWeight: 700, color: "#334155" }}>Tax & National Identification</Typography>
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" } }}>
                  <TextField data-controlid="employee.editor.pan-number.input" inputProps={{ "data-controlid": "employee.editor.pan-number.input" }} label={t("field_pan_number", dicConstant.employeeMaster.fields.panNumber)} value={dicStatutoryForm.strPanNumber} onChange={(objEvent) => updateStatutoryField("strPanNumber", objEvent.target.value.toUpperCase())} disabled={blnViewOnly} fullWidth />
                  {renderSelectField(t("field_tax_regime", dicConstant.employeeMaster.fields.taxRegimeCode), dicStatutoryForm.strTaxRegimeCode, (objValue) => updateStatutoryField("strTaxRegimeCode", String(objValue)), objFormOptions?.lstTaxRegimeCodes ?? [], blnViewOnly)}
                  <TextField label="SSN Number" value={dicStatutoryForm.strSsnNumber} onChange={(objEvent) => updateStatutoryField("strSsnNumber", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                  <TextField label="PRAN Number" value={dicStatutoryForm.strPranNumber} onChange={(objEvent) => updateStatutoryField("strPranNumber", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                  <TextField label="Gratuity Number" value={dicStatutoryForm.strGratuityNumber} onChange={(objEvent) => updateStatutoryField("strGratuityNumber", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                  <TextField data-controlid="employee.editor.uan-number.input" inputProps={{ "data-controlid": "employee.editor.uan-number.input" }} label={t("field_uan_number", dicConstant.employeeMaster.fields.uanNumber)} value={dicStatutoryForm.strUanNumber} onChange={(objEvent) => updateStatutoryField("strUanNumber", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                </Box>
              </Box>
              <Box sx={{ display: "grid", gap: 2, alignItems: "stretch", gridTemplateColumns: { xs: "1fr", lg: "repeat(3, minmax(0, 1fr))" } }}>
                <Stack spacing={1.5} alignItems="stretch" sx={{ border: "1px solid rgba(148,163,184,0.24)", borderRadius: "18px", p: 2 }}>
                  <Typography sx={{ fontWeight: 700, color: "#334155" }}>Provident Fund</Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={dicStatutoryForm.blnPfApplicable}
                          onChange={(_, blnChecked) => {
                            updateStatutoryField("blnPfApplicable", blnChecked);
                            if (!blnChecked) {
                              updateStatutoryField("strPfNumber", "");
                            }
                          }}
                          disabled={blnViewOnly}
                        />
                      }
                      label={t("field_pf_applicable", "PF Applicable")}
                      sx={{ m: 0 }}
                    />
                  {dicStatutoryForm.blnPfApplicable ? (
                    <TextField
                      data-controlid="employee.editor.pf-number.input"
                      inputProps={{ "data-controlid": "employee.editor.pf-number.input" }}
                      label={renderRequiredLabel(t("field_pf_number", dicConstant.employeeMaster.fields.pfNumber))}
                      value={dicStatutoryForm.strPfNumber}
                      onChange={(objEvent) => updateStatutoryField("strPfNumber", objEvent.target.value.toUpperCase())}
                      error={Boolean(dicStatutoryErrors.strPfNumber)}
                      helperText={dicStatutoryErrors.strPfNumber}
                      disabled={blnViewOnly}
                      fullWidth
                    />
                  ) : null}
                </Stack>
                <Stack spacing={1.5} alignItems="stretch" sx={{ border: "1px solid rgba(148,163,184,0.24)", borderRadius: "18px", p: 2 }}>
                  <Typography sx={{ fontWeight: 700, color: "#334155" }}>ESI</Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={dicStatutoryForm.blnEsiApplicable}
                          onChange={(_, blnChecked) => {
                            updateStatutoryField("blnEsiApplicable", blnChecked);
                            if (!blnChecked) {
                              updateStatutoryField("strEsiNumber", "");
                            }
                          }}
                          disabled={blnViewOnly}
                        />
                      }
                      label={t("field_esi_applicable", "ESI Applicable")}
                      sx={{ m: 0 }}
                    />
                  <TextField label="ESI Code" value={dicStatutoryForm.strEsiCode} onChange={(objEvent) => updateStatutoryField("strEsiCode", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                  {dicStatutoryForm.blnEsiApplicable ? (
                    <TextField
                      data-controlid="employee.editor.esi-number.input"
                      inputProps={{ "data-controlid": "employee.editor.esi-number.input" }}
                      label={renderRequiredLabel(t("field_esi_number", dicConstant.employeeMaster.fields.esiNumber))}
                      value={dicStatutoryForm.strEsiNumber}
                      onChange={(objEvent) => updateStatutoryField("strEsiNumber", objEvent.target.value)}
                      error={Boolean(dicStatutoryErrors.strEsiNumber)}
                      helperText={dicStatutoryErrors.strEsiNumber}
                      disabled={blnViewOnly}
                      fullWidth
                    />
                  ) : null}
                </Stack>
                <Stack spacing={1.5} alignItems="stretch" sx={{ border: "1px solid rgba(148,163,184,0.24)", borderRadius: "18px", p: 2 }}>
                  <Typography sx={{ fontWeight: 700, color: "#334155" }}>Professional Tax</Typography>
                  <FormControlLabel
                    control={<Switch checked={dicStatutoryForm.blnPtApplicable} onChange={(_, blnChecked) => updateStatutoryField("blnPtApplicable", blnChecked)} disabled={blnViewOnly} />}
                    label={t("field_pt_applicable", "PT Applicable")}
                    sx={{ m: 0 }}
                  />
                </Stack>
              </Box>
            </Stack>
          ) : null}

          {strVisibleActiveTab === "experience" ? (
            <Stack spacing={2.5}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5}>
                <Box>
                  <Typography sx={{ mt: 0.5, color: "#64748b" }}>
                    {t("section_experience_help", "Capture prior roles, durations, and compensation details for this employee.")}
                  </Typography>
                </Box>
                {!blnViewOnly ? (
                  <Button
                    className={styles.primaryButton}
                    size="small"
                    variant="contained"
                    startIcon={<PostAddRoundedIcon />}
                    onClick={handleAddExperienceClick}
                    sx={{ borderRadius: "14px", px: 2, minHeight: 32, height: 32, py: 0 }}
                  >
                    {t("add_experience", "Add Experience")}
                  </Button>
                ) : null}
              </Stack>
              <TableContainer component={Paper} sx={{ borderRadius: "18px", border: "1px solid rgba(148,163,184,0.18)" }}>
                <Table size="small" sx={{ minWidth: 1250 }}>
                  <TableHead sx={{ bgcolor: "#f8fafc" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>{t("field_company_name", "Company Name")}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{t("field_job_title", "Job Title")}</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 130 }}>{t("field_from_date", "From Date")}</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 130 }}>{t("field_to_date", "To Date")}</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 110 }}>{t("field_total_years", "Total Years")}</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>{t("field_last_drawn_salary", "Last Drawn Salary")}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{t("field_reason_for_leaving", "Reason For Leaving")}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{t("field_responsibilities", "Responsibilities")}</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>{t("field_experience_active", "Active")}</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>{t("actions", "Actions")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {!blnViewOnly && blnAddingExperience ? (
                      <TableRow sx={{ bgcolor: intEditingExperienceID ? "rgba(255,249,235,0.75)" : "#fcfcfd" }}>
                        <TableCell>
                          <TextField size="small" data-controlid="employee.editor.experience.company-name.input" inputProps={{ "data-controlid": "employee.editor.experience.company-name.input" }} value={dicExperienceForm.strCompanyName} onChange={(objEvent) => updateExperienceField("strCompanyName", objEvent.target.value)} error={Boolean(dicExperienceErrors.strCompanyName)} placeholder={t("field_company_name", "Company Name")} fullWidth />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" data-controlid="employee.editor.experience.job-title.input" inputProps={{ "data-controlid": "employee.editor.experience.job-title.input" }} value={dicExperienceForm.strJobTitle} onChange={(objEvent) => updateExperienceField("strJobTitle", objEvent.target.value)} error={Boolean(dicExperienceErrors.strJobTitle)} placeholder={t("field_job_title", "Job Title")} fullWidth />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" type="date" data-controlid="employee.editor.experience.from-date.input" inputProps={{ "data-controlid": "employee.editor.experience.from-date.input" }} value={dicExperienceForm.dtFromDate} onChange={(objEvent) => updateExperienceField("dtFromDate", objEvent.target.value)} error={Boolean(dicExperienceErrors.dtFromDate)} InputLabelProps={{ shrink: true }} fullWidth />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" type="date" data-controlid="employee.editor.experience.to-date.input" inputProps={{ "data-controlid": "employee.editor.experience.to-date.input" }} value={dicExperienceForm.dtToDate} onChange={(objEvent) => updateExperienceField("dtToDate", objEvent.target.value)} error={Boolean(dicExperienceErrors.dtToDate)} InputLabelProps={{ shrink: true }} fullWidth />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" data-controlid="employee.editor.experience.total-years.input" inputProps={{ "data-controlid": "employee.editor.experience.total-years.input" }} value={dicExperienceForm.decTotalYears} onChange={(objEvent) => updateExperienceField("decTotalYears", objEvent.target.value)} placeholder={t("field_total_years", "Total Years")} fullWidth />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" data-controlid="employee.editor.experience.last-drawn-salary.input" inputProps={{ "data-controlid": "employee.editor.experience.last-drawn-salary.input" }} value={dicExperienceForm.decLastDrawnSalary} onChange={(objEvent) => updateExperienceField("decLastDrawnSalary", objEvent.target.value)} error={Boolean(dicExperienceErrors.decLastDrawnSalary)} placeholder={t("field_last_drawn_salary", "Last Drawn Salary")} fullWidth />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" data-controlid="employee.editor.experience.reason-for-leaving.input" inputProps={{ "data-controlid": "employee.editor.experience.reason-for-leaving.input" }} value={dicExperienceForm.strReasonForLeaving} onChange={(objEvent) => updateExperienceField("strReasonForLeaving", objEvent.target.value)} placeholder={t("field_reason_for_leaving", "Reason For Leaving")} fullWidth />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" data-controlid="employee.editor.experience.responsibilities.input" inputProps={{ "data-controlid": "employee.editor.experience.responsibilities.input" }} value={dicExperienceForm.strResponsibilities} onChange={(objEvent) => updateExperienceField("strResponsibilities", objEvent.target.value)} placeholder={t("field_responsibilities", "Responsibilities")} fullWidth />
                        </TableCell>
                        <TableCell align="center">
                          <ActiveStatusSwitch blnIsActive={dicExperienceForm.blnIsActive} onChange={(blnChecked) => updateExperienceField("blnIsActive", blnChecked)} inputProps={{ "data-controlid": "employee.editor.experience.active.switch" } as InputHTMLAttributes<HTMLInputElement>} />
                        </TableCell>
                        <TableCell>
                          <Box className={styles.actionCell}>
                            <button data-controlid="employee.editor.experience.reset.button" className={`${styles.iconButton} ${styles.deleteIcon}`} type="button" onClick={resetExperienceEditor} aria-label={t("clear", "Clear")}>
                              <CloseRoundedIcon fontSize="small" />
                            </button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : null}

                    {lstExperienceRecords.length === 0 && !blnAddingExperience ? (
                      <TableRow>
                        <TableCell colSpan={10} sx={{ py: 3 }}>
                          <Typography sx={{ color: "#64748b", textAlign: "center" }}>{t("experience_empty", "No experience records added yet.")}</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      lstExperienceRecords.map((objRecord) => (
                        <TableRow key={objRecord.intID} hover sx={{ bgcolor: objRecord.blnIsActive ? "#fff" : "#f8fafc" }}>
                          {intEditingExperienceID === objRecord.intID ? (
                            <>
                              <TableCell>
                                <TextField size="small" data-controlid="employee.editor.experience.company-name.input" inputProps={{ "data-controlid": "employee.editor.experience.company-name.input" }} value={dicExperienceForm.strCompanyName} onChange={(objEvent) => updateExperienceField("strCompanyName", objEvent.target.value)} error={Boolean(dicExperienceErrors.strCompanyName)} placeholder={t("field_company_name", "Company Name")} fullWidth />
                              </TableCell>
                              <TableCell>
                                <TextField size="small" data-controlid="employee.editor.experience.job-title.input" inputProps={{ "data-controlid": "employee.editor.experience.job-title.input" }} value={dicExperienceForm.strJobTitle} onChange={(objEvent) => updateExperienceField("strJobTitle", objEvent.target.value)} error={Boolean(dicExperienceErrors.strJobTitle)} placeholder={t("field_job_title", "Job Title")} fullWidth />
                              </TableCell>
                              <TableCell>
                                <TextField size="small" type="date" data-controlid="employee.editor.experience.from-date.input" inputProps={{ "data-controlid": "employee.editor.experience.from-date.input" }} value={dicExperienceForm.dtFromDate} onChange={(objEvent) => updateExperienceField("dtFromDate", objEvent.target.value)} error={Boolean(dicExperienceErrors.dtFromDate)} InputLabelProps={{ shrink: true }} fullWidth />
                              </TableCell>
                              <TableCell>
                                <TextField size="small" type="date" data-controlid="employee.editor.experience.to-date.input" inputProps={{ "data-controlid": "employee.editor.experience.to-date.input" }} value={dicExperienceForm.dtToDate} onChange={(objEvent) => updateExperienceField("dtToDate", objEvent.target.value)} error={Boolean(dicExperienceErrors.dtToDate)} InputLabelProps={{ shrink: true }} fullWidth />
                              </TableCell>
                              <TableCell>
                                <TextField size="small" data-controlid="employee.editor.experience.total-years.input" inputProps={{ "data-controlid": "employee.editor.experience.total-years.input" }} value={dicExperienceForm.decTotalYears} onChange={(objEvent) => updateExperienceField("decTotalYears", objEvent.target.value)} placeholder={t("field_total_years", "Total Years")} fullWidth />
                              </TableCell>
                              <TableCell>
                                <TextField size="small" data-controlid="employee.editor.experience.last-drawn-salary.input" inputProps={{ "data-controlid": "employee.editor.experience.last-drawn-salary.input" }} value={dicExperienceForm.decLastDrawnSalary} onChange={(objEvent) => updateExperienceField("decLastDrawnSalary", objEvent.target.value)} error={Boolean(dicExperienceErrors.decLastDrawnSalary)} placeholder={t("field_last_drawn_salary", "Last Drawn Salary")} fullWidth />
                              </TableCell>
                              <TableCell>
                                <TextField size="small" data-controlid="employee.editor.experience.reason-for-leaving.input" inputProps={{ "data-controlid": "employee.editor.experience.reason-for-leaving.input" }} value={dicExperienceForm.strReasonForLeaving} onChange={(objEvent) => updateExperienceField("strReasonForLeaving", objEvent.target.value)} placeholder={t("field_reason_for_leaving", "Reason For Leaving")} fullWidth />
                              </TableCell>
                              <TableCell>
                                <TextField size="small" data-controlid="employee.editor.experience.responsibilities.input" inputProps={{ "data-controlid": "employee.editor.experience.responsibilities.input" }} value={dicExperienceForm.strResponsibilities} onChange={(objEvent) => updateExperienceField("strResponsibilities", objEvent.target.value)} placeholder={t("field_responsibilities", "Responsibilities")} fullWidth />
                              </TableCell>
                              <TableCell align="center">
                                <ActiveStatusSwitch blnIsActive={dicExperienceForm.blnIsActive} onChange={(blnChecked) => updateExperienceField("blnIsActive", blnChecked)} inputProps={{ "data-controlid": "employee.editor.experience.active.switch" } as InputHTMLAttributes<HTMLInputElement>} />
                              </TableCell>
                              <TableCell>
                                <Box className={styles.actionCell}>
                                  <button data-controlid="employee.editor.experience.reset.button" className={`${styles.iconButton} ${styles.deleteIcon}`} type="button" onClick={resetExperienceEditor} aria-label={t("clear", "Clear")}>
                                    <CloseRoundedIcon fontSize="small" />
                                  </button>
                                </Box>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell>
                                <Stack spacing={0.5}>
                                  <Typography sx={{ fontWeight: 600, color: "#0f172a" }}>{objRecord.strCompanyName}</Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>{objRecord.strJobTitle}</TableCell>
                              <TableCell>{objRecord.dtFromDate}</TableCell>
                              <TableCell>{objRecord.dtToDate || t("present", "Present")}</TableCell>
                              <TableCell>{objRecord.decTotalYears ?? "-"}</TableCell>
                              <TableCell>{objRecord.decLastDrawnSalary ?? "-"}</TableCell>
                              <TableCell>{objRecord.strReasonForLeaving || "-"}</TableCell>
                              <TableCell>{objRecord.strResponsibilities || "-"}</TableCell>
                              <TableCell align="center">{objRecord.blnIsActive ? t("yes", "Yes") : t("no", "No")}</TableCell>
                              <TableCell>
                                {!blnViewOnly ? (
                                  <Box className={styles.actionCell}>
                                    <button data-controlid="employee.editor.experience.row.edit.button" data-row-key={objRecord.intID} className={`${styles.iconButton} ${styles.editIcon}`} type="button" onClick={() => handleExperienceEdit(objRecord)} aria-label={t("edit", "Edit")}>
                                      <EditRoundedIcon fontSize="small" />
                                    </button>
                                    {blnCanDelete && objRecord.blnIsActive ? (
                                      <button data-controlid="employee.editor.experience.row.delete.button" data-row-key={objRecord.intID} className={`${styles.iconButton} ${styles.deleteIcon}`} type="button" onClick={() => handleExperienceDeleteRequest(objRecord.intID)} aria-label={t("delete", "Delete")}>
                                        <DeleteRoundedIcon fontSize="small" />
                                      </button>
                                    ) : null}
                                  </Box>
                                ) : (
                                  <Typography sx={{ color: "#64748b" }}>-</Typography>
                                )}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {(dicExperienceErrors.strCompanyName || dicExperienceErrors.strJobTitle || dicExperienceErrors.dtFromDate || dicExperienceErrors.dtToDate || dicExperienceErrors.decLastDrawnSalary) && !blnViewOnly ? (
                <Stack spacing={0.5}>
                  {dicExperienceErrors.strCompanyName ? <Typography sx={{ color: "#b91c1c", fontSize: "0.85rem" }}>{dicExperienceErrors.strCompanyName}</Typography> : null}
                  {dicExperienceErrors.strJobTitle ? <Typography sx={{ color: "#b91c1c", fontSize: "0.85rem" }}>{dicExperienceErrors.strJobTitle}</Typography> : null}
                  {dicExperienceErrors.dtFromDate ? <Typography sx={{ color: "#b91c1c", fontSize: "0.85rem" }}>{dicExperienceErrors.dtFromDate}</Typography> : null}
                  {dicExperienceErrors.dtToDate ? <Typography sx={{ color: "#b91c1c", fontSize: "0.85rem" }}>{dicExperienceErrors.dtToDate}</Typography> : null}
                  {dicExperienceErrors.decLastDrawnSalary ? <Typography sx={{ color: "#b91c1c", fontSize: "0.85rem" }}>{dicExperienceErrors.decLastDrawnSalary}</Typography> : null}
                </Stack>
              ) : null}
            </Stack>
          ) : null}

          {strVisibleActiveTab === "qualification" ? (
            <Stack spacing={2.5}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5}>
                <Box>
                  <Typography sx={{ mt: 0.5, color: "#64748b" }}>
                    {t("section_qualification_help", "Maintain academic background, certifications, and identify the highest qualification.")}
                  </Typography>
                </Box>
                {!blnViewOnly ? (
                  <Button
                    className={styles.primaryButton}
                    size="small"
                    variant="contained"
                    startIcon={<PostAddRoundedIcon />}
                    onClick={handleAddQualificationClick}
                    sx={{ borderRadius: "14px", px: 2, minHeight: 32, height: 32, py: 0 }}
                  >
                    {t("add_qualification", "Add Qualification")}
                  </Button>
                ) : null}
              </Stack>
              <TableContainer component={Paper} sx={{ borderRadius: "18px", border: "1px solid rgba(148,163,184,0.18)" }}>
                <Table size="small" sx={{ minWidth: 1100 }}>
                  <TableHead sx={{ bgcolor: "#f8fafc" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>{t("field_degree_name", "Degree Name")}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{t("field_specialization", "Specialization")}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{t("field_institution_name", "Institution Name")}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{t("field_university_name", "University Name")}</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 130 }}>{t("field_year_of_passing", "Year Of Passing")}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{t("field_grade_or_percentage", "Grade / Percentage")}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{t("field_certification_number", "Certification Number")}</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>{t("field_highest_qualification", "Highest Qualification")}</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>{t("field_qualification_active", "Active")}</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>{t("actions", "Actions")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {!blnViewOnly && blnAddingQualification ? (
                      <TableRow sx={{ bgcolor: intEditingQualificationID ? "rgba(255,249,235,0.75)" : "#fcfcfd" }}>
                        <TableCell>
                            <TextField
                              data-controlid="employee.editor.qualification.degree-name.input"
                              inputProps={{ "data-controlid": "employee.editor.qualification.degree-name.input" }}
                              size="small"
                            value={dicQualificationForm.strDegreeName}
                            onChange={(objEvent) => updateQualificationField("strDegreeName", objEvent.target.value)}
                            error={Boolean(dicQualificationErrors.strDegreeName)}
                            placeholder={t("field_degree_name", "Degree Name")}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" data-controlid="employee.editor.qualification.specialization.input" inputProps={{ "data-controlid": "employee.editor.qualification.specialization.input" }} value={dicQualificationForm.strSpecialization} onChange={(objEvent) => updateQualificationField("strSpecialization", objEvent.target.value)} placeholder={t("field_specialization", "Specialization")} fullWidth />
                        </TableCell>
                        <TableCell>
                          <TextField
                            data-controlid="employee.editor.qualification.institution-name.input"
                            inputProps={{ "data-controlid": "employee.editor.qualification.institution-name.input" }}
                            size="small"
                            value={dicQualificationForm.strInstitutionName}
                            onChange={(objEvent) => updateQualificationField("strInstitutionName", objEvent.target.value)}
                            error={Boolean(dicQualificationErrors.strInstitutionName)}
                            placeholder={t("field_institution_name", "Institution Name")}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" data-controlid="employee.editor.qualification.university-name.input" inputProps={{ "data-controlid": "employee.editor.qualification.university-name.input" }} value={dicQualificationForm.strUniversityName} onChange={(objEvent) => updateQualificationField("strUniversityName", objEvent.target.value)} placeholder={t("field_university_name", "University Name")} fullWidth />
                        </TableCell>
                        <TableCell>
                          <TextField
                            data-controlid="employee.editor.qualification.year-of-passing.input"
                            inputProps={{ "data-controlid": "employee.editor.qualification.year-of-passing.input" }}
                            size="small"
                            value={dicQualificationForm.intYearOfPassing}
                            onChange={(objEvent) => updateQualificationField("intYearOfPassing", objEvent.target.value.replace(/[^0-9]/g, ""))}
                            error={Boolean(dicQualificationErrors.intYearOfPassing)}
                            placeholder={t("field_year_of_passing", "Year Of Passing")}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" data-controlid="employee.editor.qualification.grade-or-percentage.input" inputProps={{ "data-controlid": "employee.editor.qualification.grade-or-percentage.input" }} value={dicQualificationForm.strGradeOrPercentage} onChange={(objEvent) => updateQualificationField("strGradeOrPercentage", objEvent.target.value)} placeholder={t("field_grade_or_percentage", "Grade / Percentage")} fullWidth />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" data-controlid="employee.editor.qualification.certification-number.input" inputProps={{ "data-controlid": "employee.editor.qualification.certification-number.input" }} value={dicQualificationForm.strCertificationNumber} onChange={(objEvent) => updateQualificationField("strCertificationNumber", objEvent.target.value)} placeholder={t("field_certification_number", "Certification Number")} fullWidth />
                        </TableCell>
                        <TableCell align="center">
                          <Switch checked={dicQualificationForm.blnIsHighestQualification} onChange={(_, blnChecked) => updateQualificationField("blnIsHighestQualification", blnChecked)} inputProps={{ "data-controlid": "employee.editor.qualification.highest-qualification.switch" } as InputHTMLAttributes<HTMLInputElement>} />
                        </TableCell>
                        <TableCell align="center">
                          <ActiveStatusSwitch blnIsActive={dicQualificationForm.blnIsActive} onChange={(blnChecked) => updateQualificationField("blnIsActive", blnChecked)} inputProps={{ "data-controlid": "employee.editor.qualification.active.switch" } as InputHTMLAttributes<HTMLInputElement>} />
                        </TableCell>
                        <TableCell>
                          <Box className={styles.actionCell}>
                            <button data-controlid="employee.editor.qualification.reset.button" className={`${styles.iconButton} ${styles.deleteIcon}`} type="button" onClick={resetQualificationEditor} aria-label={t("clear", "Clear")}>
                              <CloseRoundedIcon fontSize="small" />
                            </button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : null}

                    {lstQualificationRecords.length === 0 && !blnAddingQualification ? (
                      <TableRow>
                        <TableCell colSpan={10} sx={{ py: 3 }}>
                          <Typography sx={{ color: "#64748b", textAlign: "center" }}>{t("qualification_empty", "No qualification records added yet.")}</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      lstQualificationRecords.map((objRecord) => (
                        <TableRow key={objRecord.intID} hover sx={{ bgcolor: objRecord.blnIsActive ? "#fff" : "#f8fafc" }}>
                          {intEditingQualificationID === objRecord.intID ? (
                            <>
                              <TableCell>
                                <TextField size="small" data-controlid="employee.editor.qualification.degree-name.input" inputProps={{ "data-controlid": "employee.editor.qualification.degree-name.input" }} value={dicQualificationForm.strDegreeName} onChange={(objEvent) => updateQualificationField("strDegreeName", objEvent.target.value)} error={Boolean(dicQualificationErrors.strDegreeName)} placeholder={t("field_degree_name", "Degree Name")} fullWidth />
                              </TableCell>
                              <TableCell>
                                <TextField size="small" data-controlid="employee.editor.qualification.specialization.input" inputProps={{ "data-controlid": "employee.editor.qualification.specialization.input" }} value={dicQualificationForm.strSpecialization} onChange={(objEvent) => updateQualificationField("strSpecialization", objEvent.target.value)} placeholder={t("field_specialization", "Specialization")} fullWidth />
                              </TableCell>
                              <TableCell>
                                <TextField size="small" data-controlid="employee.editor.qualification.institution-name.input" inputProps={{ "data-controlid": "employee.editor.qualification.institution-name.input" }} value={dicQualificationForm.strInstitutionName} onChange={(objEvent) => updateQualificationField("strInstitutionName", objEvent.target.value)} error={Boolean(dicQualificationErrors.strInstitutionName)} placeholder={t("field_institution_name", "Institution Name")} fullWidth />
                              </TableCell>
                              <TableCell>
                                <TextField size="small" data-controlid="employee.editor.qualification.university-name.input" inputProps={{ "data-controlid": "employee.editor.qualification.university-name.input" }} value={dicQualificationForm.strUniversityName} onChange={(objEvent) => updateQualificationField("strUniversityName", objEvent.target.value)} placeholder={t("field_university_name", "University Name")} fullWidth />
                              </TableCell>
                              <TableCell>
                                <TextField size="small" data-controlid="employee.editor.qualification.year-of-passing.input" inputProps={{ "data-controlid": "employee.editor.qualification.year-of-passing.input" }} value={dicQualificationForm.intYearOfPassing} onChange={(objEvent) => updateQualificationField("intYearOfPassing", objEvent.target.value.replace(/[^0-9]/g, ""))} error={Boolean(dicQualificationErrors.intYearOfPassing)} placeholder={t("field_year_of_passing", "Year Of Passing")} fullWidth />
                              </TableCell>
                              <TableCell>
                                <TextField size="small" data-controlid="employee.editor.qualification.grade-or-percentage.input" inputProps={{ "data-controlid": "employee.editor.qualification.grade-or-percentage.input" }} value={dicQualificationForm.strGradeOrPercentage} onChange={(objEvent) => updateQualificationField("strGradeOrPercentage", objEvent.target.value)} placeholder={t("field_grade_or_percentage", "Grade / Percentage")} fullWidth />
                              </TableCell>
                              <TableCell>
                                <TextField size="small" data-controlid="employee.editor.qualification.certification-number.input" inputProps={{ "data-controlid": "employee.editor.qualification.certification-number.input" }} value={dicQualificationForm.strCertificationNumber} onChange={(objEvent) => updateQualificationField("strCertificationNumber", objEvent.target.value)} placeholder={t("field_certification_number", "Certification Number")} fullWidth />
                              </TableCell>
                              <TableCell align="center">
                                <Switch checked={dicQualificationForm.blnIsHighestQualification} onChange={(_, blnChecked) => updateQualificationField("blnIsHighestQualification", blnChecked)} inputProps={{ "data-controlid": "employee.editor.qualification.highest-qualification.switch" } as InputHTMLAttributes<HTMLInputElement>} />
                              </TableCell>
                              <TableCell align="center">
                                <ActiveStatusSwitch blnIsActive={dicQualificationForm.blnIsActive} onChange={(blnChecked) => updateQualificationField("blnIsActive", blnChecked)} inputProps={{ "data-controlid": "employee.editor.qualification.active.switch" } as InputHTMLAttributes<HTMLInputElement>} />
                              </TableCell>
                              <TableCell>
                                <Box className={styles.actionCell}>
                                  <button data-controlid="employee.editor.qualification.reset.button" className={`${styles.iconButton} ${styles.deleteIcon}`} type="button" onClick={resetQualificationEditor} aria-label={t("clear", "Clear")}>
                                    <CloseRoundedIcon fontSize="small" />
                                  </button>
                                </Box>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell>
                                <Stack spacing={0.5}>
                                  <Typography sx={{ fontWeight: 600, color: "#0f172a" }}>{objRecord.strDegreeName}</Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>{objRecord.strSpecialization || "-"}</TableCell>
                              <TableCell>{objRecord.strInstitutionName}</TableCell>
                              <TableCell>{objRecord.strUniversityName || "-"}</TableCell>
                              <TableCell>{objRecord.intYearOfPassing}</TableCell>
                              <TableCell>{objRecord.strGradeOrPercentage || "-"}</TableCell>
                              <TableCell>{objRecord.strCertificationNumber || "-"}</TableCell>
                              <TableCell align="center">{objRecord.blnIsHighestQualification ? t("yes", "Yes") : t("no", "No")}</TableCell>
                              <TableCell align="center">{objRecord.blnIsActive ? t("yes", "Yes") : t("no", "No")}</TableCell>
                              <TableCell>
                                {!blnViewOnly ? (
                                  <Box className={styles.actionCell}>
                                    <button data-controlid="employee.editor.qualification.row.edit.button" data-row-key={objRecord.intID} className={`${styles.iconButton} ${styles.editIcon}`} type="button" onClick={() => handleQualificationEdit(objRecord)} aria-label={t("edit", "Edit")}>
                                      <EditRoundedIcon fontSize="small" />
                                    </button>
                                    {blnCanDelete && objRecord.blnIsActive ? (
                                      <button data-controlid="employee.editor.qualification.row.delete.button" data-row-key={objRecord.intID} className={`${styles.iconButton} ${styles.deleteIcon}`} type="button" onClick={() => handleQualificationDeleteRequest(objRecord.intID)} aria-label={t("delete", "Delete")}>
                                        <DeleteRoundedIcon fontSize="small" />
                                      </button>
                                    ) : null}
                                  </Box>
                                ) : (
                                  <Typography sx={{ color: "#64748b" }}>-</Typography>
                                )}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {(dicQualificationErrors.strDegreeName || dicQualificationErrors.strInstitutionName || dicQualificationErrors.intYearOfPassing) && !blnViewOnly ? (
                <Stack spacing={0.5}>
                  {dicQualificationErrors.strDegreeName ? <Typography sx={{ color: "#b91c1c", fontSize: "0.85rem" }}>{dicQualificationErrors.strDegreeName}</Typography> : null}
                  {dicQualificationErrors.strInstitutionName ? <Typography sx={{ color: "#b91c1c", fontSize: "0.85rem" }}>{dicQualificationErrors.strInstitutionName}</Typography> : null}
                  {dicQualificationErrors.intYearOfPassing ? <Typography sx={{ color: "#b91c1c", fontSize: "0.85rem" }}>{dicQualificationErrors.intYearOfPassing}</Typography> : null}
                </Stack>
              ) : null}
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
