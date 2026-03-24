import dicConstant from "@/constants/Constant.json";
import type {
  EmployeeAddressFormValues,
  EmployeeAddressRecord,
  EmployeeBankFormValues,
  EmployeeBankRecord,
  EmployeeDetailRecord,
  EmployeeFormValues,
  EmployeeStatutoryFormValues,
  EmployeeStatutoryRecord
} from "@/features/employee/types";

export const dicEmptyEmployeeForm: EmployeeFormValues = {
  strEmployeeCode: "",
  strTitle: "",
  strFirstName: "",
  strMiddleName: "",
  strLastName: "",
  dtDateOfBirth: "",
  dtDateOfJoining: "",
  intEmploymentTypeID: "",
  intDepartmentID: "",
  intDesignationID: "",
  intGradeID: "",
  intCostCenterID: "",
  intLocationID: "",
  intPayrollGroupID: "",
  intManagerEmployeeID: "",
  strWorkEmail: "",
  strPersonalEmail: "",
  strMobileNumber: "",
  strGender: "",
  intPreferredLanguageID: "",
  strEmploymentStatus: "Active",
  dtDateOfExit: "",
  blnIsEssEnabled: true
};

export const dicEmptyEmployeeAddressForm: EmployeeAddressFormValues = {
  strAddressType: "Current",
  strAddressLine1: "",
  strAddressLine2: "",
  strCityName: "",
  intStateID: "",
  strPostalCode: "",
  intCountryID: ""
};

export const dicEmptyEmployeeBankForm: EmployeeBankFormValues = {
  intBankID: "",
  strAccountHolderName: "",
  strAccountNumber: "",
  strIfscCode: "",
  blnIsPrimary: true,
  blnIsActive: true
};

export const dicEmptyEmployeeStatutoryForm: EmployeeStatutoryFormValues = {
  strPanNumber: "",
  strUanNumber: "",
  strEsiNumber: "",
  strTaxRegimeCode: "",
  blnPfApplicable: false,
  blnEsiApplicable: false,
  blnPtApplicable: false
};

export function toEmployeeFormValues(dicRecord: EmployeeDetailRecord): EmployeeFormValues {
  return {
    strEmployeeCode: dicRecord.strEmployeeCode ?? "",
    strTitle: dicRecord.strTitle ?? "",
    strFirstName: dicRecord.strFirstName ?? "",
    strMiddleName: dicRecord.strMiddleName ?? "",
    strLastName: dicRecord.strLastName ?? "",
    dtDateOfBirth: dicRecord.dtDateOfBirth ?? "",
    dtDateOfJoining: dicRecord.dtDateOfJoining ?? "",
    intEmploymentTypeID: dicRecord.intEmploymentTypeID ?? "",
    intDepartmentID: dicRecord.intDepartmentID ?? "",
    intDesignationID: dicRecord.intDesignationID ?? "",
    intGradeID: dicRecord.intGradeID ?? "",
    intCostCenterID: dicRecord.intCostCenterID ?? "",
    intLocationID: dicRecord.intLocationID ?? "",
    intPayrollGroupID: dicRecord.intPayrollGroupID ?? "",
    intManagerEmployeeID: dicRecord.intManagerEmployeeID ?? "",
    strWorkEmail: dicRecord.strWorkEmail ?? "",
    strPersonalEmail: dicRecord.strPersonalEmail ?? "",
    strMobileNumber: dicRecord.strMobileNumber ?? "",
    strGender: dicRecord.strGender ?? "",
    intPreferredLanguageID: dicRecord.intPreferredLanguageID ?? "",
    strEmploymentStatus: dicRecord.strEmploymentStatus,
    dtDateOfExit: dicRecord.dtDateOfExit ?? "",
    blnIsEssEnabled: dicRecord.blnIsEssEnabled
  };
}

export function toEmployeeAddressFormValues(dicRecord: EmployeeAddressRecord): EmployeeAddressFormValues {
  return {
    strAddressType: dicRecord.strAddressType ?? "Current",
    strAddressLine1: dicRecord.strAddressLine1 ?? "",
    strAddressLine2: dicRecord.strAddressLine2 ?? "",
    strCityName: dicRecord.strCityName ?? "",
    intStateID: dicRecord.intStateID ?? "",
    strPostalCode: dicRecord.strPostalCode ?? "",
    intCountryID: dicRecord.intCountryID ?? ""
  };
}

export function toEmployeeBankFormValues(dicRecord: EmployeeBankRecord): EmployeeBankFormValues {
  return {
    intBankID: dicRecord.intBankID ?? "",
    strAccountHolderName: dicRecord.strAccountHolderName ?? "",
    strAccountNumber: dicRecord.strAccountNumber ?? "",
    strIfscCode: dicRecord.strIfscCode ?? "",
    blnIsPrimary: dicRecord.blnIsPrimary,
    blnIsActive: dicRecord.blnIsActive
  };
}

export function toEmployeeStatutoryFormValues(dicRecord: EmployeeStatutoryRecord): EmployeeStatutoryFormValues {
  return {
    strPanNumber: dicRecord.strPanNumber ?? "",
    strUanNumber: dicRecord.strUanNumber ?? "",
    strEsiNumber: dicRecord.strEsiNumber ?? "",
    strTaxRegimeCode: dicRecord.strTaxRegimeCode ?? "",
    blnPfApplicable: dicRecord.blnPfApplicable,
    blnEsiApplicable: dicRecord.blnEsiApplicable,
    blnPtApplicable: dicRecord.blnPtApplicable
  };
}

export function isEmailValid(strValue: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue);
}

export function validateEmployeeForm(
  dicForm: EmployeeFormValues,
  lstEmployeeCodes: Array<{ intID: number; strEmployeeCode: string }>,
  intEditingEmployeeID: number | null,
  dicValidationLabels = {
    employeeCodeRequired: dicConstant.employeeMaster.validation.employeeCodeRequired,
    employeeCodeFormat: dicConstant.employeeMaster.validation.employeeCodeFormat,
    employeeCodeDuplicate: dicConstant.employeeMaster.validation.employeeCodeDuplicate,
    firstNameRequired: dicConstant.employeeMaster.validation.firstNameRequired,
    joiningDateRequired: dicConstant.employeeMaster.validation.joiningDateRequired,
    employmentTypeRequired: dicConstant.employeeMaster.validation.employmentTypeRequired,
    locationRequired: dicConstant.employeeMaster.validation.locationRequired,
    workEmailInvalid: dicConstant.employeeMaster.validation.workEmailInvalid,
    personalEmailInvalid: dicConstant.employeeMaster.validation.personalEmailInvalid,
    mobileNumberInvalid: dicConstant.employeeMaster.validation.mobileNumberInvalid,
    birthDateInvalid: dicConstant.employeeMaster.validation.birthDateInvalid,
    exitDateInvalid: dicConstant.employeeMaster.validation.exitDateInvalid,
  }
): Partial<Record<keyof EmployeeFormValues, string>> {
  const dicNextErrors: Partial<Record<keyof EmployeeFormValues, string>> = {};
  const strEmployeeCode = dicForm.strEmployeeCode.trim().toUpperCase();
  const strWorkEmail = dicForm.strWorkEmail.trim();
  const strPersonalEmail = dicForm.strPersonalEmail.trim();
  const dtBirthDate = dicForm.dtDateOfBirth ? new Date(dicForm.dtDateOfBirth) : null;
  const dtJoiningDate = dicForm.dtDateOfJoining ? new Date(dicForm.dtDateOfJoining) : null;
  const dtExitDate = dicForm.dtDateOfExit ? new Date(dicForm.dtDateOfExit) : null;

  if (!strEmployeeCode) {
    dicNextErrors.strEmployeeCode = dicValidationLabels.employeeCodeRequired;
  } else if (!/^[A-Z0-9/_-]{2,50}$/.test(strEmployeeCode)) {
    dicNextErrors.strEmployeeCode = dicValidationLabels.employeeCodeFormat;
  } else if (lstEmployeeCodes.some((dicEmployee) => dicEmployee.strEmployeeCode.toUpperCase() === strEmployeeCode && dicEmployee.intID !== intEditingEmployeeID)) {
    dicNextErrors.strEmployeeCode = dicValidationLabels.employeeCodeDuplicate;
  }

  if (!dicForm.strFirstName.trim()) {
    dicNextErrors.strFirstName = dicValidationLabels.firstNameRequired;
  }

  if (!dicForm.dtDateOfJoining) {
    dicNextErrors.dtDateOfJoining = dicValidationLabels.joiningDateRequired;
  }

  if (dicForm.intEmploymentTypeID === "") {
    dicNextErrors.intEmploymentTypeID = dicValidationLabels.employmentTypeRequired;
  }

  if (dicForm.intLocationID === "") {
    dicNextErrors.intLocationID = dicValidationLabels.locationRequired;
  }

  if (strWorkEmail && !isEmailValid(strWorkEmail)) {
    dicNextErrors.strWorkEmail = dicValidationLabels.workEmailInvalid;
  }

  if (strPersonalEmail && !isEmailValid(strPersonalEmail)) {
    dicNextErrors.strPersonalEmail = dicValidationLabels.personalEmailInvalid;
  }

  if (dicForm.strMobileNumber && !/^[0-9+\- ]+$/.test(dicForm.strMobileNumber)) {
    dicNextErrors.strMobileNumber = dicValidationLabels.mobileNumberInvalid;
  }

  if (dtBirthDate && dtJoiningDate && dtBirthDate >= dtJoiningDate) {
    dicNextErrors.dtDateOfBirth = dicValidationLabels.birthDateInvalid;
  }

  if (dtExitDate && dtJoiningDate && dtExitDate < dtJoiningDate) {
    dicNextErrors.dtDateOfExit = dicValidationLabels.exitDateInvalid;
  }

  return dicNextErrors;
}
