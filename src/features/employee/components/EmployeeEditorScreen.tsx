"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FocusEvent, type ReactNode, type RefObject } from "react";

import AlertDialog from "@/components/common/AlertDialog";
import dicConstant from "@/constants/Constant.json";
import {
  dicEmptyEmployeeAddressForm,
  dicEmptyEmployeeBankForm,
  dicEmptyEmployeeForm,
  dicEmptyEmployeeStatutoryForm,
  toEmployeeAddressFormValues,
  toEmployeeBankFormValues,
  toEmployeeFormValues,
  toEmployeeStatutoryFormValues,
  validateEmployeeForm
} from "@/features/employee/EmployeeFormUtils";
import { employeeService } from "@/features/employee/services/employeeService";
import type {
  EmployeeAddressFormValues,
  EmployeeBankFormValues,
  EmployeeFormOptions,
  EmployeeFormValues,
  EmployeeListRecord,
  EmployeeStatutoryFormValues,
  EmployeeStatus
} from "@/features/employee/types";

type EmployeeEditorScreenProps = {
  strMode: "add" | "edit" | "view";
  intEmployeeID?: number;
};

type TabKey = "basicInfo" | "address" | "bankDetails" | "statutory";

const lstTabOrder: TabKey[] = ["basicInfo", "address", "bankDetails", "statutory"];
const strRequiredAsteriskColor = "#dc2626";

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

export default function EmployeeEditorScreen({ strMode, intEmployeeID }: EmployeeEditorScreenProps) {
  const objRouter = useRouter();
  const [strActiveTab, setStrActiveTab] = useState<TabKey>("basicInfo");
  const [lstEmployees, setLstEmployees] = useState<EmployeeListRecord[]>([]);
  const [objFormOptions, setObjFormOptions] = useState<EmployeeFormOptions | null>(null);
  const [dicBasicForm, setDicBasicForm] = useState<EmployeeFormValues>(dicEmptyEmployeeForm);
  const [dicAddressForm, setDicAddressForm] = useState<EmployeeAddressFormValues>(dicEmptyEmployeeAddressForm);
  const [dicBankForm, setDicBankForm] = useState<EmployeeBankFormValues>(dicEmptyEmployeeBankForm);
  const [dicStatutoryForm, setDicStatutoryForm] = useState<EmployeeStatutoryFormValues>(dicEmptyEmployeeStatutoryForm);
  const [dicBasicErrors, setDicBasicErrors] = useState<Partial<Record<keyof EmployeeFormValues, string>>>({});
  const [dicAddressErrors, setDicAddressErrors] = useState<Partial<Record<keyof EmployeeAddressFormValues, string>>>({});
  const [dicBankErrors, setDicBankErrors] = useState<Partial<Record<keyof EmployeeBankFormValues, string>>>({});
  const [intResolvedEmployeeID, setIntResolvedEmployeeID] = useState<number | null>(intEmployeeID ?? null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnBasicSaving, setBlnBasicSaving] = useState(false);
  const [blnAddressSaving, setBlnAddressSaving] = useState(false);
  const [blnBankSaving, setBlnBankSaving] = useState(false);
  const [blnStatutorySaving, setBlnStatutorySaving] = useState(false);
  const [objAlertDialog, setObjAlertDialog] = useState({
    blnOpen: false,
    strMessage: "",
    strSeverity: "success" as "success" | "error",
    strTitle: "",
  });
  const objLastFocusedFieldRef = useRef<HTMLElement | null>(null);
  const dicFieldRefs: Partial<Record<keyof EmployeeFormValues | keyof EmployeeAddressFormValues | keyof EmployeeBankFormValues, RefObject<HTMLInputElement | null>>> = {
    strEmployeeCode: useRef<HTMLInputElement | null>(null),
    strFirstName: useRef<HTMLInputElement | null>(null),
    dtDateOfJoining: useRef<HTMLInputElement | null>(null),
    intEmploymentTypeID: useRef<HTMLInputElement | null>(null),
    intLocationID: useRef<HTMLInputElement | null>(null),
    strAddressLine1: useRef<HTMLInputElement | null>(null),
    intCountryID: useRef<HTMLInputElement | null>(null),
    intBankID: useRef<HTMLInputElement | null>(null),
    strAccountHolderName: useRef<HTMLInputElement | null>(null),
    strAccountNumber: useRef<HTMLInputElement | null>(null)
  };

  const blnViewOnly = strMode === "view";
  const blnChildTabsEnabled = intResolvedEmployeeID !== null;

  function getFooterActionConfig() {
    if (blnViewOnly) {
      return null;
    }

    if (strActiveTab === "basicInfo") {
      return {
        fnOnClick: handleBasicSave,
        blnDisabled: blnBasicSaving,
        strLabel: blnBasicSaving ? "Saving Basic Info..." : "Save Basic Info",
      };
    }

    if (strActiveTab === "address") {
      return {
        fnOnClick: handleAddressSave,
        blnDisabled: blnAddressSaving,
        strLabel: blnAddressSaving ? "Saving Address..." : "Save Address",
      };
    }

    if (strActiveTab === "bankDetails") {
      return {
        fnOnClick: handleBankSave,
        blnDisabled: blnBankSaving,
        strLabel: blnBankSaving ? "Saving Bank Details..." : "Save Bank Details",
      };
    }

    return {
      fnOnClick: handleStatutorySave,
      blnDisabled: blnStatutorySaving,
      strLabel: blnStatutorySaving ? "Saving Statutory..." : "Save Statutory",
    };
  }

  useEffect(() => {
    let blnMounted = true;

    async function loadScreenData() {
      setBlnLoading(true);
      try {
        const [lstEmployeeData, dicOptionData] = await Promise.all([
          employeeService.getEmployees(),
          employeeService.getFormOptions()
        ]);
        if (!blnMounted) {
          return;
        }

        setLstEmployees(lstEmployeeData);
        setObjFormOptions(dicOptionData);

        if ((strMode === "edit" || strMode === "view") && intEmployeeID) {
          const dicEmployee = await employeeService.getEmployeeById(intEmployeeID);
          if (!blnMounted) {
            return;
          }

          setDicBasicForm(toEmployeeFormValues(dicEmployee));
          setIntResolvedEmployeeID(intEmployeeID);

          const lstChildResults = await Promise.allSettled([
            employeeService.getEmployeeAddress(intEmployeeID),
            employeeService.getEmployeeBankAccount(intEmployeeID),
            employeeService.getEmployeeStatutory(intEmployeeID)
          ]);

          if (!blnMounted) {
            return;
          }

          if (lstChildResults[0].status === "fulfilled") {
            setDicAddressForm(toEmployeeAddressFormValues(lstChildResults[0].value));
          }

          if (lstChildResults[1].status === "fulfilled") {
            setDicBankForm(toEmployeeBankFormValues(lstChildResults[1].value));
          }

          if (lstChildResults[2].status === "fulfilled") {
            setDicStatutoryForm(toEmployeeStatutoryFormValues(lstChildResults[2].value));
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
  }, [intEmployeeID, strMode]);

  const lstManagerOptions = useMemo(
    () => (objFormOptions?.lstManagers ?? []).filter((dicOption) => dicOption.intID !== intResolvedEmployeeID),
    [intResolvedEmployeeID, objFormOptions]
  );

  function updateBasicField<TKey extends keyof EmployeeFormValues>(strField: TKey, objValue: EmployeeFormValues[TKey]) {
    setDicBasicErrors((dicPrevious) => ({ ...dicPrevious, [strField]: undefined }));
    setDicBasicForm((dicPrevious) => ({ ...dicPrevious, [strField]: objValue }));
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
    setDicStatutoryForm((dicPrevious) => ({ ...dicPrevious, [strField]: objValue }));
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

  function closeAlertDialog() {
    setObjAlertDialog((objPrevious) => ({ ...objPrevious, blnOpen: false }));
    window.requestAnimationFrame(() => {
      objLastFocusedFieldRef.current?.focus();
    });
  }

  function validateAddressForm() {
    const dicNextErrors: Partial<Record<keyof EmployeeAddressFormValues, string>> = {};
    if (!dicAddressForm.strAddressLine1.trim()) {
      dicNextErrors.strAddressLine1 = dicConstant.employeeMaster.validation.addressLine1Required;
    }
    if (dicAddressForm.intCountryID === "") {
      dicNextErrors.intCountryID = dicConstant.employeeMaster.validation.countryRequired;
    }
    setDicAddressErrors(dicNextErrors);
    return dicNextErrors;
  }

  function validateBankForm() {
    const dicNextErrors: Partial<Record<keyof EmployeeBankFormValues, string>> = {};
    if (dicBankForm.intBankID === "") {
      dicNextErrors.intBankID = dicConstant.employeeMaster.validation.bankRequired;
    }
    if (!dicBankForm.strAccountHolderName.trim()) {
      dicNextErrors.strAccountHolderName = dicConstant.employeeMaster.validation.accountHolderRequired;
    }
    if (!dicBankForm.strAccountNumber.trim()) {
      dicNextErrors.strAccountNumber = dicConstant.employeeMaster.validation.accountNumberRequired;
    }
    setDicBankErrors(dicNextErrors);
    return dicNextErrors;
  }

  async function handleBasicSave() {
    if (blnViewOnly) {
      return;
    }
    const dicValidationErrors = validateEmployeeForm(
      dicBasicForm,
      lstEmployees.map((dicEmployee) => ({ intID: dicEmployee.intID, strEmployeeCode: dicEmployee.strEmployeeCode })),
      intResolvedEmployeeID
    );
    setDicBasicErrors(dicValidationErrors);
    if (Object.keys(dicValidationErrors).length > 0) {
      setStrActiveTab("basicInfo");
      focusFirstError(dicValidationErrors, dicFieldRefs, [
        "strEmployeeCode",
        "strFirstName",
        "dtDateOfJoining",
        "intEmploymentTypeID",
        "intLocationID"
      ]);
      return;
    }

    setBlnBasicSaving(true);
    try {
      const dicSavedEmployee = strMode === "add" && intResolvedEmployeeID === null
        ? await employeeService.createEmployee(dicBasicForm)
        : await employeeService.updateEmployee(intResolvedEmployeeID as number, dicBasicForm);
      setIntResolvedEmployeeID(dicSavedEmployee.intID);
      openAlertDialog("success", strMode === "add" && intEmployeeID === undefined ? dicConstant.employeeMaster.saveSuccess : dicConstant.employeeMaster.updateSuccess);
      if (strMode === "add") {
        objRouter.replace(`/employees/edit/${dicSavedEmployee.intID}`);
      }
    } catch (objError) {
      openAlertDialog("error", objError instanceof Error ? objError.message : "Unable to save employee.");
    } finally {
      setBlnBasicSaving(false);
    }
  }

  async function handleAddressSave() {
    if (blnViewOnly) {
      return;
    }
    if (!intResolvedEmployeeID) {
      openAlertDialog("error", dicConstant.employeeMaster.createFirstHint);
      return;
    }
    const dicValidationErrors = validateAddressForm();
    if (Object.keys(dicValidationErrors).length > 0) {
      focusFirstError(dicValidationErrors, dicFieldRefs, ["strAddressLine1", "intCountryID"]);
      return;
    }
    setBlnAddressSaving(true);
    try {
      const dicRecord = await employeeService.saveEmployeeAddress(intResolvedEmployeeID, dicAddressForm);
      setDicAddressForm(toEmployeeAddressFormValues(dicRecord));
      openAlertDialog("success", dicConstant.employeeMaster.addressSaveSuccess);
    } catch (objError) {
      openAlertDialog("error", objError instanceof Error ? objError.message : "Unable to save employee address.");
    } finally {
      setBlnAddressSaving(false);
    }
  }

  async function handleBankSave() {
    if (blnViewOnly) {
      return;
    }
    if (!intResolvedEmployeeID) {
      openAlertDialog("error", dicConstant.employeeMaster.createFirstHint);
      return;
    }
    const dicValidationErrors = validateBankForm();
    if (Object.keys(dicValidationErrors).length > 0) {
      focusFirstError(dicValidationErrors, dicFieldRefs, [
        "intBankID",
        "strAccountHolderName",
        "strAccountNumber"
      ]);
      return;
    }
    setBlnBankSaving(true);
    try {
      const dicRecord = await employeeService.saveEmployeeBankAccount(intResolvedEmployeeID, dicBankForm);
      setDicBankForm((dicPrevious) => ({
        ...toEmployeeBankFormValues(dicRecord),
        strAccountNumber: dicRecord.strAccountNumber ?? dicPrevious.strAccountNumber
      }));
      openAlertDialog("success", dicConstant.employeeMaster.bankSaveSuccess);
    } catch (objError) {
      openAlertDialog("error", objError instanceof Error ? objError.message : "Unable to save employee bank details.");
    } finally {
      setBlnBankSaving(false);
    }
  }

  async function handleStatutorySave() {
    if (blnViewOnly) {
      return;
    }
    if (!intResolvedEmployeeID) {
      openAlertDialog("error", dicConstant.employeeMaster.createFirstHint);
      return;
    }
    setBlnStatutorySaving(true);
    try {
      const dicRecord = await employeeService.saveEmployeeStatutory(intResolvedEmployeeID, dicStatutoryForm);
      setDicStatutoryForm(toEmployeeStatutoryFormValues(dicRecord));
      openAlertDialog("success", dicConstant.employeeMaster.statutorySaveSuccess);
    } catch (objError) {
      openAlertDialog("error", objError instanceof Error ? objError.message : "Unable to save employee statutory details.");
    } finally {
      setBlnStatutorySaving(false);
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

  if (blnLoading) {
    return (
      <Box sx={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: "#64748b" }}>{dicConstant.employeeMaster.editorLoading}</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ pb: blnViewOnly ? 0 : { xs: 12, md: 13 } }} onFocusCapture={handleEditorFocusCapture}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} alignItems={{ sm: "center" }}>
        <Box>
          <Typography
            sx={{
              mt: 0.5,
              fontWeight: 800,
              color: "#1f2937",
              fontSize: "clamp(1.35rem, 1.9vw, 1.75rem)",
              lineHeight: 1.05,
            }}
          >
            {strMode === "add"
              ? dicConstant.employeeMaster.addPageTitle
              : strMode === "view"
                ? (dicConstant.employeeMaster.dialogViewTitle ?? "View Employee")
                : dicConstant.employeeMaster.editPageTitle}
          </Typography>
        </Box>
      </Stack>

      <Paper sx={{ borderRadius: "26px", border: "1px solid rgba(148,163,184,0.24)", p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" } }}>
          <TextField label={renderRequiredLabel(dicConstant.employeeMaster.fields.employeeCode)} inputRef={dicFieldRefs.strEmployeeCode} value={dicBasicForm.strEmployeeCode} onChange={(objEvent) => updateBasicField("strEmployeeCode", objEvent.target.value.toUpperCase())} error={Boolean(dicBasicErrors.strEmployeeCode)} helperText={dicBasicErrors.strEmployeeCode} disabled={blnViewOnly} fullWidth />
          {renderSelectField(dicConstant.employeeMaster.fields.title, dicBasicForm.strTitle, (objValue) => updateBasicField("strTitle", String(objValue)), objFormOptions?.lstTitles ?? [], blnViewOnly)}
          <TextField label={renderRequiredLabel(dicConstant.employeeMaster.fields.firstName)} inputRef={dicFieldRefs.strFirstName} value={dicBasicForm.strFirstName} onChange={(objEvent) => updateBasicField("strFirstName", objEvent.target.value)} error={Boolean(dicBasicErrors.strFirstName)} helperText={dicBasicErrors.strFirstName} disabled={blnViewOnly} fullWidth />
          <TextField label={dicConstant.employeeMaster.fields.middleName} value={dicBasicForm.strMiddleName} onChange={(objEvent) => updateBasicField("strMiddleName", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
          <TextField label={dicConstant.employeeMaster.fields.lastName} value={dicBasicForm.strLastName} onChange={(objEvent) => updateBasicField("strLastName", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
          <TextField type="date" label={dicConstant.employeeMaster.fields.dateOfBirth} value={dicBasicForm.dtDateOfBirth} onChange={(objEvent) => updateBasicField("dtDateOfBirth", objEvent.target.value)} error={Boolean(dicBasicErrors.dtDateOfBirth)} helperText={dicBasicErrors.dtDateOfBirth} InputLabelProps={{ shrink: true }} disabled={blnViewOnly} fullWidth />
        </Box>
      </Paper>

      <Paper sx={{ borderRadius: "26px", overflow: "hidden", border: "1px solid rgba(148,163,184,0.24)" }}>
        <Box sx={{ borderBottom: "1px solid #e2e8f0", px: { xs: 1, md: 2 }, bgcolor: "#f8fafc" }}>
          <Tabs
            value={strActiveTab}
            onChange={(_, strNextValue) => setStrActiveTab(strNextValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {lstTabOrder.map((strTabKey) => (
              <Tab
                key={strTabKey}
                value={strTabKey}
                label={dicConstant.employeeMaster.tabs[strTabKey]}
              />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {strActiveTab === "basicInfo" ? (
            <Stack spacing={3}>
              <Box>
                <Typography sx={{ fontWeight: 700, color: "#0f172a", mb: 1.5 }}>Identity & Employment</Typography>
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" } }}>
                  <TextField type="date" label={renderRequiredLabel(dicConstant.employeeMaster.fields.dateOfJoining)} inputRef={dicFieldRefs.dtDateOfJoining} value={dicBasicForm.dtDateOfJoining} onChange={(objEvent) => updateBasicField("dtDateOfJoining", objEvent.target.value)} error={Boolean(dicBasicErrors.dtDateOfJoining)} helperText={dicBasicErrors.dtDateOfJoining} InputLabelProps={{ shrink: true }} disabled={blnViewOnly} fullWidth />
                  {renderSelectField(renderRequiredLabel(dicConstant.employeeMaster.fields.employmentType), dicBasicForm.intEmploymentTypeID, (objValue) => updateBasicField("intEmploymentTypeID", objValue as number | ""), objFormOptions?.lstEmploymentTypes ?? [], blnViewOnly, dicBasicErrors.intEmploymentTypeID, Boolean(dicBasicErrors.intEmploymentTypeID), dicFieldRefs.intEmploymentTypeID)}
                  {renderSelectField(dicConstant.employeeMaster.fields.department, dicBasicForm.intDepartmentID, (objValue) => updateBasicField("intDepartmentID", objValue as number | ""), objFormOptions?.lstDepartments ?? [], blnViewOnly)}
                  {renderSelectField(dicConstant.employeeMaster.fields.designation, dicBasicForm.intDesignationID, (objValue) => updateBasicField("intDesignationID", objValue as number | ""), objFormOptions?.lstDesignations ?? [], blnViewOnly)}
                  {renderSelectField(dicConstant.employeeMaster.fields.grade, dicBasicForm.intGradeID, (objValue) => updateBasicField("intGradeID", objValue as number | ""), objFormOptions?.lstGrades ?? [], blnViewOnly)}
                  {renderSelectField(dicConstant.employeeMaster.fields.costCenter, dicBasicForm.intCostCenterID, (objValue) => updateBasicField("intCostCenterID", objValue as number | ""), objFormOptions?.lstCostCenters ?? [], blnViewOnly)}
                  {renderSelectField(renderRequiredLabel(dicConstant.employeeMaster.fields.location), dicBasicForm.intLocationID, (objValue) => updateBasicField("intLocationID", objValue as number | ""), objFormOptions?.lstLocations ?? [], blnViewOnly, dicBasicErrors.intLocationID, Boolean(dicBasicErrors.intLocationID), dicFieldRefs.intLocationID)}
                  {renderSelectField(dicConstant.employeeMaster.fields.payrollGroup, dicBasicForm.intPayrollGroupID, (objValue) => updateBasicField("intPayrollGroupID", objValue as number | ""), objFormOptions?.lstPayrollGroups ?? [], blnViewOnly)}
                  {renderSelectField(dicConstant.employeeMaster.fields.manager, dicBasicForm.intManagerEmployeeID, (objValue) => updateBasicField("intManagerEmployeeID", objValue as number | ""), lstManagerOptions, blnViewOnly)}
                </Box>
              </Box>

              <Box>
                <Typography sx={{ fontWeight: 700, color: "#0f172a", mb: 1.5 }}>Contact & Preferences</Typography>
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" } }}>
                  <TextField label={dicConstant.employeeMaster.fields.workEmail} value={dicBasicForm.strWorkEmail} onChange={(objEvent) => updateBasicField("strWorkEmail", objEvent.target.value)} error={Boolean(dicBasicErrors.strWorkEmail)} helperText={dicBasicErrors.strWorkEmail} disabled={blnViewOnly} fullWidth />
                  <TextField label={dicConstant.employeeMaster.fields.personalEmail} value={dicBasicForm.strPersonalEmail} onChange={(objEvent) => updateBasicField("strPersonalEmail", objEvent.target.value)} error={Boolean(dicBasicErrors.strPersonalEmail)} helperText={dicBasicErrors.strPersonalEmail} disabled={blnViewOnly} fullWidth />
                  <TextField label={dicConstant.employeeMaster.fields.mobileNumber} value={dicBasicForm.strMobileNumber} onChange={(objEvent) => updateBasicField("strMobileNumber", objEvent.target.value)} error={Boolean(dicBasicErrors.strMobileNumber)} helperText={dicBasicErrors.strMobileNumber} disabled={blnViewOnly} fullWidth />
                  {renderSelectField(dicConstant.employeeMaster.fields.gender, dicBasicForm.strGender, (objValue) => updateBasicField("strGender", String(objValue)), objFormOptions?.lstGenders ?? [], blnViewOnly)}
                  {renderSelectField(dicConstant.employeeMaster.fields.preferredLanguage, dicBasicForm.intPreferredLanguageID, (objValue) => updateBasicField("intPreferredLanguageID", objValue as number | ""), objFormOptions?.lstLanguages ?? [], blnViewOnly)}
                  {renderSelectField(dicConstant.employeeMaster.fields.employmentStatus, dicBasicForm.strEmploymentStatus, (objValue) => updateBasicField("strEmploymentStatus", objValue as EmployeeStatus), objFormOptions?.lstEmploymentStatuses ?? [], blnViewOnly)}
                  <TextField type="date" label={dicConstant.employeeMaster.fields.dateOfExit} value={dicBasicForm.dtDateOfExit} onChange={(objEvent) => updateBasicField("dtDateOfExit", objEvent.target.value)} error={Boolean(dicBasicErrors.dtDateOfExit)} helperText={dicBasicErrors.dtDateOfExit} InputLabelProps={{ shrink: true }} disabled={blnViewOnly || dicBasicForm.strEmploymentStatus === "Active"} fullWidth />
                  <Box sx={{ display: "flex", alignItems: "center", minHeight: 56 }}>
                    <FormControlLabel control={<Switch checked={dicBasicForm.blnIsEssEnabled} onChange={(_, blnChecked) => updateBasicField("blnIsEssEnabled", blnChecked)} disabled={blnViewOnly} />} label={dicConstant.employeeMaster.fields.essEnabled} />
                  </Box>
                </Box>
              </Box>
            </Stack>
          ) : null}

          {strActiveTab === "address" ? (
            <Stack spacing={2.5}>
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
                {renderSelectField(dicConstant.employeeMaster.fields.addressType, dicAddressForm.strAddressType, (objValue) => updateAddressField("strAddressType", String(objValue)), objFormOptions?.lstAddressTypes ?? [], blnViewOnly)}
                <TextField label={renderRequiredLabel(dicConstant.employeeMaster.fields.addressLine1)} inputRef={dicFieldRefs.strAddressLine1} value={dicAddressForm.strAddressLine1} onChange={(objEvent) => updateAddressField("strAddressLine1", objEvent.target.value)} error={Boolean(dicAddressErrors.strAddressLine1)} helperText={dicAddressErrors.strAddressLine1} disabled={blnViewOnly} fullWidth />
                <TextField label={dicConstant.employeeMaster.fields.addressLine2} value={dicAddressForm.strAddressLine2} onChange={(objEvent) => updateAddressField("strAddressLine2", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                <TextField label={dicConstant.employeeMaster.fields.cityName} value={dicAddressForm.strCityName} onChange={(objEvent) => updateAddressField("strCityName", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                {renderSelectField(dicConstant.employeeMaster.fields.state, dicAddressForm.intStateID, (objValue) => updateAddressField("intStateID", objValue as number | ""), objFormOptions?.lstStates ?? [], blnViewOnly)}
                <TextField label={dicConstant.employeeMaster.fields.postalCode} value={dicAddressForm.strPostalCode} onChange={(objEvent) => updateAddressField("strPostalCode", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                {renderSelectField(renderRequiredLabel(dicConstant.employeeMaster.fields.country), dicAddressForm.intCountryID, (objValue) => updateAddressField("intCountryID", objValue as number | ""), objFormOptions?.lstCountries ?? [], blnViewOnly, dicAddressErrors.intCountryID, Boolean(dicAddressErrors.intCountryID), dicFieldRefs.intCountryID)}
              </Box>
            </Stack>
          ) : null}

          {strActiveTab === "bankDetails" ? (
            <Stack spacing={2.5}>
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
                {renderSelectField(renderRequiredLabel(dicConstant.employeeMaster.fields.bank), dicBankForm.intBankID, (objValue) => updateBankField("intBankID", objValue as number | ""), objFormOptions?.lstBanks ?? [], blnViewOnly, dicBankErrors.intBankID, Boolean(dicBankErrors.intBankID), dicFieldRefs.intBankID)}
                <TextField label={renderRequiredLabel(dicConstant.employeeMaster.fields.accountHolderName)} inputRef={dicFieldRefs.strAccountHolderName} value={dicBankForm.strAccountHolderName} onChange={(objEvent) => updateBankField("strAccountHolderName", objEvent.target.value)} error={Boolean(dicBankErrors.strAccountHolderName)} helperText={dicBankErrors.strAccountHolderName} disabled={blnViewOnly} fullWidth />
                <TextField label={renderRequiredLabel(dicConstant.employeeMaster.fields.accountNumber)} inputRef={dicFieldRefs.strAccountNumber} value={dicBankForm.strAccountNumber} onChange={(objEvent) => updateBankField("strAccountNumber", objEvent.target.value)} error={Boolean(dicBankErrors.strAccountNumber)} helperText={dicBankErrors.strAccountNumber} disabled={blnViewOnly} fullWidth />
                <TextField label={dicConstant.employeeMaster.fields.ifscCode} value={dicBankForm.strIfscCode} onChange={(objEvent) => updateBankField("strIfscCode", objEvent.target.value.toUpperCase())} disabled={blnViewOnly} fullWidth />
                <Box sx={{ display: "flex", alignItems: "center", minHeight: 56 }}>
                  <FormControlLabel control={<Switch checked={dicBankForm.blnIsPrimary} onChange={(_, blnChecked) => updateBankField("blnIsPrimary", blnChecked)} disabled={blnViewOnly} />} label={dicConstant.employeeMaster.fields.isPrimary} />
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", minHeight: 56 }}>
                  <FormControlLabel control={<Switch checked={dicBankForm.blnIsActive} onChange={(_, blnChecked) => updateBankField("blnIsActive", blnChecked)} disabled={blnViewOnly} />} label={dicConstant.employeeMaster.fields.bankActive} />
                </Box>
              </Box>
            </Stack>
          ) : null}

          {strActiveTab === "statutory" ? (
            <Stack spacing={2.5}>
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
                <TextField label={dicConstant.employeeMaster.fields.panNumber} value={dicStatutoryForm.strPanNumber} onChange={(objEvent) => updateStatutoryField("strPanNumber", objEvent.target.value.toUpperCase())} disabled={blnViewOnly} fullWidth />
                <TextField label={dicConstant.employeeMaster.fields.uanNumber} value={dicStatutoryForm.strUanNumber} onChange={(objEvent) => updateStatutoryField("strUanNumber", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                <TextField label={dicConstant.employeeMaster.fields.esiNumber} value={dicStatutoryForm.strEsiNumber} onChange={(objEvent) => updateStatutoryField("strEsiNumber", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                {renderSelectField(dicConstant.employeeMaster.fields.taxRegimeCode, dicStatutoryForm.strTaxRegimeCode, (objValue) => updateStatutoryField("strTaxRegimeCode", String(objValue)), objFormOptions?.lstTaxRegimeCodes ?? [], blnViewOnly)}
                <Box sx={{ display: "flex", alignItems: "center", minHeight: 56 }}>
                  <FormControlLabel control={<Switch checked={dicStatutoryForm.blnPfApplicable} onChange={(_, blnChecked) => updateStatutoryField("blnPfApplicable", blnChecked)} disabled={blnViewOnly} />} label="PF Applicable" />
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", minHeight: 56 }}>
                  <FormControlLabel control={<Switch checked={dicStatutoryForm.blnEsiApplicable} onChange={(_, blnChecked) => updateStatutoryField("blnEsiApplicable", blnChecked)} disabled={blnViewOnly} />} label="ESI Applicable" />
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", minHeight: 56 }}>
                  <FormControlLabel control={<Switch checked={dicStatutoryForm.blnPtApplicable} onChange={(_, blnChecked) => updateStatutoryField("blnPtApplicable", blnChecked)} disabled={blnViewOnly} />} label="PT Applicable" />
                </Box>
              </Box>
            </Stack>
          ) : null}
        </Box>
      </Paper>

      <AlertDialog
        blnOpen={objAlertDialog.blnOpen}
        strMessage={objAlertDialog.strMessage}
        strSeverity={objAlertDialog.strSeverity}
        strTitle={objAlertDialog.strTitle}
        fnOnClose={closeAlertDialog}
      />

      {!blnViewOnly ? (
        <Box
          sx={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1200,
            px: { xs: 2, md: 3 },
            py: 1.5,
            borderTop: "1px solid rgba(148,163,184,0.24)",
            bgcolor: "rgba(255,255,255,0.96)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 -10px 30px rgba(15,23,42,0.08)",
          }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: "none",
              mx: "auto",
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 1.25,
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            <Button
              variant="outlined"
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => objRouter.push("/employees")}
              sx={{
                minWidth: { xs: "100%", sm: 140 },
                borderRadius: "14px",
                px: 2.25,
                order: { xs: 2, sm: 1 },
              }}
            >
              {dicConstant.common.cancel}
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveRoundedIcon />}
              onClick={getFooterActionConfig()?.fnOnClick}
              disabled={getFooterActionConfig()?.blnDisabled}
              sx={{
                minWidth: { xs: "100%", sm: 180 },
                borderRadius: "14px",
                px: 2.5,
                order: { xs: 1, sm: 2 },
              }}
            >
              {getFooterActionConfig()?.strLabel ?? dicConstant.common.save}
            </Button>
          </Box>
        </Box>
      ) : null}
    </Stack>
  );
}
