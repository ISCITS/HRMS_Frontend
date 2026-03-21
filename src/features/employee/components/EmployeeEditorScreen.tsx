"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
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
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";

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
  const [strFeedback, setStrFeedback] = useState("");
  const [strError, setStrError] = useState("");
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

  useEffect(() => {
    let blnMounted = true;

    async function loadScreenData() {
      setBlnLoading(true);
      setStrError("");
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
          setStrError(objError instanceof Error ? objError.message : "Unable to load employee workspace.");
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
    setStrError("");
    try {
      const dicSavedEmployee = strMode === "add" && intResolvedEmployeeID === null
        ? await employeeService.createEmployee(dicBasicForm)
        : await employeeService.updateEmployee(intResolvedEmployeeID as number, dicBasicForm);
      setIntResolvedEmployeeID(dicSavedEmployee.intID);
      setStrFeedback(strMode === "add" && intEmployeeID === undefined ? dicConstant.employeeMaster.saveSuccess : dicConstant.employeeMaster.updateSuccess);
      if (strMode === "add") {
        objRouter.replace(`/masters/employee/edit/${dicSavedEmployee.intID}`);
      }
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to save employee.");
    } finally {
      setBlnBasicSaving(false);
    }
  }

  async function handleAddressSave() {
    if (blnViewOnly || !intResolvedEmployeeID) {
      return;
    }
    const dicValidationErrors = validateAddressForm();
    if (Object.keys(dicValidationErrors).length > 0) {
      focusFirstError(dicValidationErrors, dicFieldRefs, ["strAddressLine1", "intCountryID"]);
      return;
    }
    setBlnAddressSaving(true);
    setStrError("");
    try {
      const dicRecord = await employeeService.saveEmployeeAddress(intResolvedEmployeeID, dicAddressForm);
      setDicAddressForm(toEmployeeAddressFormValues(dicRecord));
      setStrFeedback(dicConstant.employeeMaster.addressSaveSuccess);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to save employee address.");
    } finally {
      setBlnAddressSaving(false);
    }
  }

  async function handleBankSave() {
    if (blnViewOnly || !intResolvedEmployeeID) {
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
    setStrError("");
    try {
      const dicRecord = await employeeService.saveEmployeeBankAccount(intResolvedEmployeeID, dicBankForm);
      setDicBankForm(toEmployeeBankFormValues(dicRecord));
      setStrFeedback(dicConstant.employeeMaster.bankSaveSuccess);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to save employee bank details.");
    } finally {
      setBlnBankSaving(false);
    }
  }

  async function handleStatutorySave() {
    if (blnViewOnly || !intResolvedEmployeeID) {
      return;
    }
    setBlnStatutorySaving(true);
    setStrError("");
    try {
      const dicRecord = await employeeService.saveEmployeeStatutory(intResolvedEmployeeID, dicStatutoryForm);
      setDicStatutoryForm(toEmployeeStatutoryFormValues(dicRecord));
      setStrFeedback(dicConstant.employeeMaster.statutorySaveSuccess);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to save employee statutory details.");
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

  function renderChildTabGuard() {
    if (blnChildTabsEnabled) {
      return null;
    }
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        {dicConstant.employeeMaster.createFirstHint}
      </Alert>
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
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} alignItems={{ sm: "center" }}>
        <Box>
          <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 800, color: "#0f172a" }}>
            {strMode === "add"
              ? dicConstant.employeeMaster.addPageTitle
              : strMode === "view"
                ? (dicConstant.employeeMaster.dialogViewTitle ?? "View Employee")
                : dicConstant.employeeMaster.editPageTitle}
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/masters/employee")} sx={{ borderRadius: "14px", px: 2.25 }}>
          {dicConstant.employeeMaster.backButton}
        </Button>
      </Stack>

      {strFeedback ? <Alert severity="success" onClose={() => setStrFeedback("")}>{strFeedback}</Alert> : null}
      {strError ? <Alert severity="error" onClose={() => setStrError("")}>{strError}</Alert> : null}

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
                disabled={strTabKey !== "basicInfo" && !blnChildTabsEnabled}
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
                  <TextField label={renderRequiredLabel(dicConstant.employeeMaster.fields.employeeCode)} inputRef={dicFieldRefs.strEmployeeCode} value={dicBasicForm.strEmployeeCode} onChange={(objEvent) => updateBasicField("strEmployeeCode", objEvent.target.value.toUpperCase())} error={Boolean(dicBasicErrors.strEmployeeCode)} helperText={dicBasicErrors.strEmployeeCode} disabled={blnViewOnly} fullWidth />
                  {renderSelectField(dicConstant.employeeMaster.fields.title, dicBasicForm.strTitle, (objValue) => updateBasicField("strTitle", String(objValue)), objFormOptions?.lstTitles ?? [], blnViewOnly)}
                  <TextField label={renderRequiredLabel(dicConstant.employeeMaster.fields.firstName)} inputRef={dicFieldRefs.strFirstName} value={dicBasicForm.strFirstName} onChange={(objEvent) => updateBasicField("strFirstName", objEvent.target.value)} error={Boolean(dicBasicErrors.strFirstName)} helperText={dicBasicErrors.strFirstName} disabled={blnViewOnly} fullWidth />
                  <TextField label={dicConstant.employeeMaster.fields.middleName} value={dicBasicForm.strMiddleName} onChange={(objEvent) => updateBasicField("strMiddleName", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                  <TextField label={dicConstant.employeeMaster.fields.lastName} value={dicBasicForm.strLastName} onChange={(objEvent) => updateBasicField("strLastName", objEvent.target.value)} disabled={blnViewOnly} fullWidth />
                  <TextField type="date" label={dicConstant.employeeMaster.fields.dateOfBirth} value={dicBasicForm.dtDateOfBirth} onChange={(objEvent) => updateBasicField("dtDateOfBirth", objEvent.target.value)} error={Boolean(dicBasicErrors.dtDateOfBirth)} helperText={dicBasicErrors.dtDateOfBirth} InputLabelProps={{ shrink: true }} disabled={blnViewOnly} fullWidth />
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

              {!blnViewOnly ? (
                <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 1 }}>
                  <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={handleBasicSave} disabled={blnBasicSaving} sx={{ borderRadius: "14px", px: 2.5 }}>
                    {blnBasicSaving ? "Saving..." : dicConstant.common.save}
                  </Button>
                </Box>
              ) : null}
            </Stack>
          ) : null}

          {strActiveTab === "address" ? (
            <Stack spacing={2.5}>
              {renderChildTabGuard()}
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, opacity: blnChildTabsEnabled ? 1 : 0.6 }}>
                {renderSelectField(dicConstant.employeeMaster.fields.addressType, dicAddressForm.strAddressType, (objValue) => updateAddressField("strAddressType", String(objValue)), objFormOptions?.lstAddressTypes ?? [], blnViewOnly || !blnChildTabsEnabled)}
                <TextField label={renderRequiredLabel(dicConstant.employeeMaster.fields.addressLine1)} inputRef={dicFieldRefs.strAddressLine1} value={dicAddressForm.strAddressLine1} onChange={(objEvent) => updateAddressField("strAddressLine1", objEvent.target.value)} error={Boolean(dicAddressErrors.strAddressLine1)} helperText={dicAddressErrors.strAddressLine1} disabled={blnViewOnly || !blnChildTabsEnabled} fullWidth />
                <TextField label={dicConstant.employeeMaster.fields.addressLine2} value={dicAddressForm.strAddressLine2} onChange={(objEvent) => updateAddressField("strAddressLine2", objEvent.target.value)} disabled={blnViewOnly || !blnChildTabsEnabled} fullWidth />
                <TextField label={dicConstant.employeeMaster.fields.cityName} value={dicAddressForm.strCityName} onChange={(objEvent) => updateAddressField("strCityName", objEvent.target.value)} disabled={blnViewOnly || !blnChildTabsEnabled} fullWidth />
                {renderSelectField(dicConstant.employeeMaster.fields.state, dicAddressForm.intStateID, (objValue) => updateAddressField("intStateID", objValue as number | ""), objFormOptions?.lstStates ?? [], blnViewOnly || !blnChildTabsEnabled)}
                <TextField label={dicConstant.employeeMaster.fields.postalCode} value={dicAddressForm.strPostalCode} onChange={(objEvent) => updateAddressField("strPostalCode", objEvent.target.value)} disabled={blnViewOnly || !blnChildTabsEnabled} fullWidth />
                {renderSelectField(renderRequiredLabel(dicConstant.employeeMaster.fields.country), dicAddressForm.intCountryID, (objValue) => updateAddressField("intCountryID", objValue as number | ""), objFormOptions?.lstCountries ?? [], blnViewOnly || !blnChildTabsEnabled, dicAddressErrors.intCountryID, Boolean(dicAddressErrors.intCountryID), dicFieldRefs.intCountryID)}
              </Box>
              {!blnViewOnly ? (
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={handleAddressSave} disabled={!blnChildTabsEnabled || blnAddressSaving} sx={{ borderRadius: "14px", px: 2.5 }}>
                    {blnAddressSaving ? "Saving..." : dicConstant.common.save}
                  </Button>
                </Box>
              ) : null}
            </Stack>
          ) : null}

          {strActiveTab === "bankDetails" ? (
            <Stack spacing={2.5}>
              {renderChildTabGuard()}
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, opacity: blnChildTabsEnabled ? 1 : 0.6 }}>
                {renderSelectField(renderRequiredLabel(dicConstant.employeeMaster.fields.bank), dicBankForm.intBankID, (objValue) => updateBankField("intBankID", objValue as number | ""), objFormOptions?.lstBanks ?? [], blnViewOnly || !blnChildTabsEnabled, dicBankErrors.intBankID, Boolean(dicBankErrors.intBankID), dicFieldRefs.intBankID)}
                <TextField label={renderRequiredLabel(dicConstant.employeeMaster.fields.accountHolderName)} inputRef={dicFieldRefs.strAccountHolderName} value={dicBankForm.strAccountHolderName} onChange={(objEvent) => updateBankField("strAccountHolderName", objEvent.target.value)} error={Boolean(dicBankErrors.strAccountHolderName)} helperText={dicBankErrors.strAccountHolderName} disabled={blnViewOnly || !blnChildTabsEnabled} fullWidth />
                <TextField label={renderRequiredLabel(dicConstant.employeeMaster.fields.accountNumber)} inputRef={dicFieldRefs.strAccountNumber} value={dicBankForm.strAccountNumber} onChange={(objEvent) => updateBankField("strAccountNumber", objEvent.target.value)} error={Boolean(dicBankErrors.strAccountNumber)} helperText={dicBankErrors.strAccountNumber} disabled={blnViewOnly || !blnChildTabsEnabled} fullWidth />
                <TextField label={dicConstant.employeeMaster.fields.ifscCode} value={dicBankForm.strIfscCode} onChange={(objEvent) => updateBankField("strIfscCode", objEvent.target.value.toUpperCase())} disabled={blnViewOnly || !blnChildTabsEnabled} fullWidth />
                <Box sx={{ display: "flex", alignItems: "center", minHeight: 56 }}>
                  <FormControlLabel control={<Switch checked={dicBankForm.blnIsPrimary} onChange={(_, blnChecked) => updateBankField("blnIsPrimary", blnChecked)} disabled={blnViewOnly || !blnChildTabsEnabled} />} label={dicConstant.employeeMaster.fields.isPrimary} />
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", minHeight: 56 }}>
                  <FormControlLabel control={<Switch checked={dicBankForm.blnIsActive} onChange={(_, blnChecked) => updateBankField("blnIsActive", blnChecked)} disabled={blnViewOnly || !blnChildTabsEnabled} />} label={dicConstant.employeeMaster.fields.bankActive} />
                </Box>
              </Box>
              {!blnViewOnly ? (
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={handleBankSave} disabled={!blnChildTabsEnabled || blnBankSaving} sx={{ borderRadius: "14px", px: 2.5 }}>
                    {blnBankSaving ? "Saving..." : dicConstant.common.save}
                  </Button>
                </Box>
              ) : null}
            </Stack>
          ) : null}

          {strActiveTab === "statutory" ? (
            <Stack spacing={2.5}>
              {renderChildTabGuard()}
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, opacity: blnChildTabsEnabled ? 1 : 0.6 }}>
                <TextField label={dicConstant.employeeMaster.fields.panNumber} value={dicStatutoryForm.strPanNumber} onChange={(objEvent) => updateStatutoryField("strPanNumber", objEvent.target.value.toUpperCase())} disabled={blnViewOnly || !blnChildTabsEnabled} fullWidth />
                <TextField label={dicConstant.employeeMaster.fields.uanNumber} value={dicStatutoryForm.strUanNumber} onChange={(objEvent) => updateStatutoryField("strUanNumber", objEvent.target.value)} disabled={blnViewOnly || !blnChildTabsEnabled} fullWidth />
                <TextField label={dicConstant.employeeMaster.fields.esiNumber} value={dicStatutoryForm.strEsiNumber} onChange={(objEvent) => updateStatutoryField("strEsiNumber", objEvent.target.value)} disabled={blnViewOnly || !blnChildTabsEnabled} fullWidth />
                {renderSelectField(dicConstant.employeeMaster.fields.taxRegimeCode, dicStatutoryForm.strTaxRegimeCode, (objValue) => updateStatutoryField("strTaxRegimeCode", String(objValue)), objFormOptions?.lstTaxRegimeCodes ?? [], blnViewOnly || !blnChildTabsEnabled)}
                <Box sx={{ display: "flex", alignItems: "center", minHeight: 56 }}>
                  <FormControlLabel control={<Switch checked={dicStatutoryForm.blnPfApplicable} onChange={(_, blnChecked) => updateStatutoryField("blnPfApplicable", blnChecked)} disabled={blnViewOnly || !blnChildTabsEnabled} />} label="PF Applicable" />
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", minHeight: 56 }}>
                  <FormControlLabel control={<Switch checked={dicStatutoryForm.blnEsiApplicable} onChange={(_, blnChecked) => updateStatutoryField("blnEsiApplicable", blnChecked)} disabled={blnViewOnly || !blnChildTabsEnabled} />} label="ESI Applicable" />
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", minHeight: 56 }}>
                  <FormControlLabel control={<Switch checked={dicStatutoryForm.blnPtApplicable} onChange={(_, blnChecked) => updateStatutoryField("blnPtApplicable", blnChecked)} disabled={blnViewOnly || !blnChildTabsEnabled} />} label="PT Applicable" />
                </Box>
              </Box>
              {!blnViewOnly ? (
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={handleStatutorySave} disabled={!blnChildTabsEnabled || blnStatutorySaving} sx={{ borderRadius: "14px", px: 2.5 }}>
                    {blnStatutorySaving ? "Saving..." : dicConstant.common.save}
                  </Button>
                </Box>
              ) : null}
            </Stack>
          ) : null}
        </Box>
      </Paper>
    </Stack>
  );
}
