import dicConstant from "@/constants/Constant.json";
import type {
  EmployeeAddressFormValues,
  EmployeeAddressRecord,
  EmployeeBankFormValues,
  EmployeeBankRecord,
  EmployeeDetailRecord,
  EmployeeFamilyDetailFormValues,
  EmployeeFamilyDetailRecord,
  EmployeeExperienceFormValues,
  EmployeeExperienceRecord,
  EmployeeFormValues,
  EmployeeQualificationFormValues,
  EmployeeQualificationRecord,
  EmployeeStatutoryFormValues,
  EmployeeStatutoryRecord
} from "@/features/employee/types";

export const dicEmptyEmployeeForm: EmployeeFormValues = {
  strEmployeeCode: "",
  strTitle: "",
  strFirstName: "",
  strMiddleName: "",
  blnIsWorker: false,
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
  intLineManagerEmployeeID: "",
  strWorkEmail: "",
  strPersonalEmail: "",
  strMobileNumber: "",
  strGender: "",
  intPreferredLanguageID: "",
  strEmploymentStatus: "Active",
  dtDateOfExit: "",
  blnIsEssEnabled: true,
  blnIsPartialSave: false,
  strFatherOrHusbandName: "", strMotherName: "", strSpouseName: "", strSpouseOccupation: "", strBloodGroup: "",
  intNationalityCountryID: "", intMotherTongueLanguageID: "", strReligion: "", strMaritalStatus: "",
  dtLocationJoiningDate: "", strPassportNumber: "", strPassportPlaceOfIssue: "",
  dtPassportIssueDate: "", dtPassportExpiryDate: "", dtRetirementDate: "",
  strAppointmentOrderNumber: "", dtAppointmentDate: "", strEntryMode: "", strJobType: "",
  strConfirmationType: "", strConfirmationComments: "", dtTentativeConfirmationDate: "", dtConfirmationDate: "",
  strRestDay: "", strEmployeeFunction: "", strFunctionalArea: "", strEmployeeCategory: "",
  blnHasDisability: false, strPlaceOfBirth: "", blnSuperannuationFlag: false, strIdentificationMarks: "",
  strDrivingLicenceNumber: "", dtDrivingLicenceValidUpto: "", blnIsRelatedEmployee: false,
  intRelatedEmployeeID: "", strPaymentType: "", blnFlatGiven: false, dtStatusEffectiveDate: "",
  dtContractStartDate: "", dtContractEndDate: "", dtLastIncrementDate: "", blnUgcAppraisalFlag: false,
  strAgency: "", strReferenceNumber: "", strMobileCountryCode: "", strWhatsappCountryCode: "",
  strWhatsappNumber: "", strReferredBy: "", strAccommodationType: "", decHousingAllowance: "",
  intNoticePeriodDays: "", strEmergencyContactPerson: "", strEmergencyCountryCode: "",
  strEmergencyMobileNumber: "", strEmergencyEmail: "", strEmployeeRemark: "",
  strInitialPostingLocation: "", dtProbationStartDate: "", dtProbationEndDate: "",
  strEmployeeWorkgroup: "", strEmployeeReservation: "", strSwon: "",
  dtFromDate: "", dtToDate: "", strPrefixLogic: ""
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
  strSwiftCode: "",
  strBranchName: "",
  strAccountType: "",
  strAccountHolderEmail: "",
  intSecondaryBankID: "",
  strSecondaryAccountHolderName: "",
  strSecondaryAccountNumber: "",
  strSecondaryIfscCode: "",
  blnSecondaryIsActive: false,
  blnIsPrimary: true,
  blnIsActive: true
};

export const dicEmptyEmployeeStatutoryForm: EmployeeStatutoryFormValues = {
  strPanNumber: "",
  strUanNumber: "",
  strEsiNumber: "",
  strPfNumber: "",
  strTaxRegimeCode: "",
  strGratuityNumber: "",
  strEsiCode: "",
  strSsnNumber: "",
  strPranNumber: "",
  blnPfApplicable: false,
  blnEsiApplicable: false,
  blnPtApplicable: false
};

export const dicEmptyEmployeeExperienceForm: EmployeeExperienceFormValues = {
  strCompanyName: "",
  strJobTitle: "",
  dtFromDate: "",
  dtToDate: "",
  decTotalYears: "",
  strResponsibilities: "",
  decLastDrawnSalary: "",
  strReasonForLeaving: "",
  blnIsActive: true
};

export const dicEmptyEmployeeQualificationForm: EmployeeQualificationFormValues = {
  strDegreeName: "",
  strSpecialization: "",
  strInstitutionName: "",
  strUniversityName: "",
  intYearOfPassing: "",
  strGradeOrPercentage: "",
  strCertificationNumber: "",
  blnIsHighestQualification: false,
  blnIsActive: true
};

export const dicEmptyEmployeeFamilyDetailForm: EmployeeFamilyDetailFormValues = {
  strName: "",
  strRelationship: "",
  dtDateOfBirth: "",
  strGender: "",
  strContactNumber: "",
  strOccupation: "",
  blnIsDependent: false,
  blnIsNominee: false,
  decNomineePercentage: "",
  strAddress: ""
};

export function toEmployeeFormValues(dicRecord: EmployeeDetailRecord): EmployeeFormValues {
  return {
    strEmployeeCode: dicRecord.strEmployeeCode ?? "",
    strTitle: dicRecord.strTitle ?? "",
    strFirstName: dicRecord.strFirstName ?? "",
    strMiddleName: dicRecord.strMiddleName ?? "",
    blnIsWorker: dicRecord.blnIsWorker ?? false,
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
    intLineManagerEmployeeID: dicRecord.intLineManagerEmployeeID ?? dicRecord.intManagerEmployeeID ?? "",
    strWorkEmail: dicRecord.strWorkEmail ?? "",
    strPersonalEmail: dicRecord.strPersonalEmail ?? "",
    strMobileNumber: dicRecord.strMobileNumber ?? "",
    strGender: dicRecord.strGender ?? "",
    intPreferredLanguageID: dicRecord.intPreferredLanguageID ?? "",
    strEmploymentStatus: dicRecord.strEmploymentStatus,
    dtDateOfExit: dicRecord.dtDateOfExit ?? "",
    blnIsEssEnabled: dicRecord.blnIsEssEnabled,
    blnIsPartialSave: dicRecord.blnIsPartialSave ?? false,
    strFatherOrHusbandName: dicRecord.strFatherOrHusbandName ?? "",
    strMotherName: dicRecord.strMotherName ?? "", strSpouseName: dicRecord.strSpouseName ?? "",
    strSpouseOccupation: dicRecord.strSpouseOccupation ?? "", strBloodGroup: dicRecord.strBloodGroup ?? "",
    intNationalityCountryID: dicRecord.intNationalityCountryID ?? "",
    intMotherTongueLanguageID: dicRecord.intMotherTongueLanguageID ?? "",
    strReligion: dicRecord.strReligion ?? "", strMaritalStatus: dicRecord.strMaritalStatus ?? "",
    dtLocationJoiningDate: dicRecord.dtLocationJoiningDate ?? "", strPassportNumber: dicRecord.strPassportNumber ?? "",
    strPassportPlaceOfIssue: dicRecord.strPassportPlaceOfIssue ?? "", dtPassportIssueDate: dicRecord.dtPassportIssueDate ?? "",
    dtPassportExpiryDate: dicRecord.dtPassportExpiryDate ?? "", dtRetirementDate: dicRecord.dtRetirementDate ?? "",
    strAppointmentOrderNumber: dicRecord.strAppointmentOrderNumber ?? "", dtAppointmentDate: dicRecord.dtAppointmentDate ?? "",
    strEntryMode: dicRecord.strEntryMode ?? "", strJobType: dicRecord.strJobType ?? "",
    strConfirmationType: dicRecord.strConfirmationType ?? "", strConfirmationComments: dicRecord.strConfirmationComments ?? "",
    dtTentativeConfirmationDate: dicRecord.dtTentativeConfirmationDate ?? "", dtConfirmationDate: dicRecord.dtConfirmationDate ?? "",
    strRestDay: dicRecord.strRestDay ?? "", strEmployeeFunction: dicRecord.strEmployeeFunction ?? "",
    strFunctionalArea: dicRecord.strFunctionalArea ?? "", strEmployeeCategory: dicRecord.strEmployeeCategory ?? "",
    blnHasDisability: dicRecord.blnHasDisability ?? false, strPlaceOfBirth: dicRecord.strPlaceOfBirth ?? "",
    blnSuperannuationFlag: dicRecord.blnSuperannuationFlag ?? false, strIdentificationMarks: dicRecord.strIdentificationMarks ?? "",
    strDrivingLicenceNumber: dicRecord.strDrivingLicenceNumber ?? "", dtDrivingLicenceValidUpto: dicRecord.dtDrivingLicenceValidUpto ?? "",
    blnIsRelatedEmployee: dicRecord.blnIsRelatedEmployee ?? false, intRelatedEmployeeID: dicRecord.intRelatedEmployeeID ?? "",
    strPaymentType: dicRecord.strPaymentType ?? "", blnFlatGiven: dicRecord.blnFlatGiven ?? false,
    dtStatusEffectiveDate: dicRecord.dtStatusEffectiveDate ?? "", dtContractStartDate: dicRecord.dtContractStartDate ?? "",
    dtContractEndDate: dicRecord.dtContractEndDate ?? "", dtLastIncrementDate: dicRecord.dtLastIncrementDate ?? "",
    blnUgcAppraisalFlag: dicRecord.blnUgcAppraisalFlag ?? false, strAgency: dicRecord.strAgency ?? "",
    strReferenceNumber: dicRecord.strReferenceNumber ?? "", strMobileCountryCode: dicRecord.strMobileCountryCode ?? "",
    strWhatsappCountryCode: dicRecord.strWhatsappCountryCode ?? "", strWhatsappNumber: dicRecord.strWhatsappNumber ?? "",
    strReferredBy: dicRecord.strReferredBy ?? "", strAccommodationType: dicRecord.strAccommodationType ?? "",
    decHousingAllowance: dicRecord.decHousingAllowance != null ? String(dicRecord.decHousingAllowance) : "",
    intNoticePeriodDays: dicRecord.intNoticePeriodDays != null ? String(dicRecord.intNoticePeriodDays) : "",
    strEmergencyContactPerson: dicRecord.strEmergencyContactPerson ?? "", strEmergencyCountryCode: dicRecord.strEmergencyCountryCode ?? "",
    strEmergencyMobileNumber: dicRecord.strEmergencyMobileNumber ?? "", strEmergencyEmail: dicRecord.strEmergencyEmail ?? "",
    strEmployeeRemark: dicRecord.strEmployeeRemark ?? "", strInitialPostingLocation: dicRecord.strInitialPostingLocation ?? "",
    dtProbationStartDate: dicRecord.dtProbationStartDate ?? "", dtProbationEndDate: dicRecord.dtProbationEndDate ?? "",
    strEmployeeWorkgroup: dicRecord.strEmployeeWorkgroup ?? "", strEmployeeReservation: dicRecord.strEmployeeReservation ?? "",
    strSwon: dicRecord.strSwon ?? "", dtFromDate: dicRecord.dtFromDate ?? "",
    dtToDate: dicRecord.dtToDate ?? "", strPrefixLogic: dicRecord.strPrefixLogic ?? ""
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
    strSwiftCode: dicRecord.strSwiftCode ?? "",
    strBranchName: dicRecord.strBranchName ?? "",
    strAccountType: dicRecord.strAccountType ?? "",
    strAccountHolderEmail: dicRecord.strAccountHolderEmail ?? "",
    intSecondaryBankID: dicRecord.intSecondaryBankID ?? "",
    strSecondaryAccountHolderName: dicRecord.strSecondaryAccountHolderName ?? "",
    strSecondaryAccountNumber: dicRecord.strSecondaryAccountNumber ?? "",
    strSecondaryIfscCode: dicRecord.strSecondaryIfscCode ?? "",
    blnSecondaryIsActive: dicRecord.blnSecondaryIsActive ?? false,
    blnIsPrimary: dicRecord.blnIsPrimary,
    blnIsActive: dicRecord.blnIsActive
  };
}

export function toEmployeeStatutoryFormValues(dicRecord: EmployeeStatutoryRecord): EmployeeStatutoryFormValues {
  return {
    strPanNumber: dicRecord.strPanNumber ?? "",
    strUanNumber: dicRecord.strUanNumber ?? "",
    strEsiNumber: dicRecord.strEsiNumber ?? "",
    strPfNumber: dicRecord.strPfNumber ?? "",
    strTaxRegimeCode: dicRecord.strTaxRegimeCode ?? "",
    strGratuityNumber: dicRecord.strGratuityNumber ?? "",
    strEsiCode: dicRecord.strEsiCode ?? "",
    strSsnNumber: dicRecord.strSsnNumber ?? "",
    strPranNumber: dicRecord.strPranNumber ?? "",
    blnPfApplicable: dicRecord.blnPfApplicable,
    blnEsiApplicable: dicRecord.blnEsiApplicable,
    blnPtApplicable: dicRecord.blnPtApplicable
  };
}

export function toEmployeeExperienceFormValues(dicRecord: EmployeeExperienceRecord): EmployeeExperienceFormValues {
  return {
    strCompanyName: dicRecord.strCompanyName ?? "",
    strJobTitle: dicRecord.strJobTitle ?? "",
    dtFromDate: dicRecord.dtFromDate ?? "",
    dtToDate: dicRecord.dtToDate ?? "",
    decTotalYears: dicRecord.decTotalYears != null ? String(dicRecord.decTotalYears) : "",
    strResponsibilities: dicRecord.strResponsibilities ?? "",
    decLastDrawnSalary: dicRecord.decLastDrawnSalary != null ? String(dicRecord.decLastDrawnSalary) : "",
    strReasonForLeaving: dicRecord.strReasonForLeaving ?? "",
    blnIsActive: dicRecord.blnIsActive
  };
}

export function toEmployeeQualificationFormValues(dicRecord: EmployeeQualificationRecord): EmployeeQualificationFormValues {
  return {
    strDegreeName: dicRecord.strDegreeName ?? "",
    strSpecialization: dicRecord.strSpecialization ?? "",
    strInstitutionName: dicRecord.strInstitutionName ?? "",
    strUniversityName: dicRecord.strUniversityName ?? "",
    intYearOfPassing: dicRecord.intYearOfPassing ? String(dicRecord.intYearOfPassing) : "",
    strGradeOrPercentage: dicRecord.strGradeOrPercentage ?? "",
    strCertificationNumber: dicRecord.strCertificationNumber ?? "",
    blnIsHighestQualification: dicRecord.blnIsHighestQualification,
    blnIsActive: dicRecord.blnIsActive
  };
}

export function toEmployeeFamilyDetailFormValues(dicRecord: EmployeeFamilyDetailRecord): EmployeeFamilyDetailFormValues {
  return {
    strName: dicRecord.strName ?? "",
    strRelationship: (dicRecord.strRelationship as EmployeeFamilyDetailFormValues["strRelationship"]) ?? "",
    dtDateOfBirth: dicRecord.dtDateOfBirth ?? "",
    strGender: (dicRecord.strGender as EmployeeFamilyDetailFormValues["strGender"]) ?? "",
    strContactNumber: dicRecord.strContactNumber ?? "",
    strOccupation: dicRecord.strOccupation ?? "",
    blnIsDependent: dicRecord.blnIsDependent,
    blnIsNominee: dicRecord.blnIsNominee,
    decNomineePercentage: dicRecord.decNomineePercentage != null ? String(dicRecord.decNomineePercentage) : "",
    strAddress: dicRecord.strAddress ?? ""
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
    reportingManagerRequired: dicConstant.employeeMaster.validation.reportingManagerRequired,
    lineManagerRequired: dicConstant.employeeMaster.validation.lineManagerRequired,
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
  const dtFromDate = dicForm.dtFromDate ? new Date(dicForm.dtFromDate) : null;
  const dtToDate = dicForm.dtToDate ? new Date(dicForm.dtToDate) : null;

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

  // Reporting Manager is required for a complete employee record.
  if (dicForm.intManagerEmployeeID === "") {
    dicNextErrors.intManagerEmployeeID = dicValidationLabels.reportingManagerRequired;
  }

  if (dicForm.intLineManagerEmployeeID === "") {
    dicNextErrors.intLineManagerEmployeeID = dicValidationLabels.lineManagerRequired;
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

  if (dtFromDate && dtToDate && dtToDate < dtFromDate) {
    dicNextErrors.dtToDate = "To date cannot be earlier than from date.";
  }

  return dicNextErrors;
}
