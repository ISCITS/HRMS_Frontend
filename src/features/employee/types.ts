export type EmployeeStatus = "Active" | "Inactive";

export type EmployeeLookupOption = {
  intID: number;
  strLabel: string;
  strCode?: string;
};

export type EmployeeListRecord = {
  intID: number;
  strEmployeeCode: string;
  strFullName: string;
  strWorkEmail: string | null;
  strMobileNumber: string | null;
  strDepartmentName: string | null;
  strDesignationName: string | null;
  strEmploymentTypeName: string | null;
  dtDateOfJoining: string;
  strEmploymentStatus: EmployeeStatus;
  blnIsEssEnabled: boolean;
  strLocationName: string | null;
  strManagerName: string | null;
};

export type EmployeeDetailRecord = {
  intID: number;
  strEmployeeCode: string;
  strTitle: string | null;
  strFirstName: string;
  strMiddleName: string | null;
  strLastName: string | null;
  strFullName: string;
  dtDateOfBirth: string | null;
  dtDateOfJoining: string;
  intEmploymentTypeID: number;
  intDepartmentID: number | null;
  intDesignationID: number | null;
  intGradeID: number | null;
  intCostCenterID: number | null;
  intLocationID: number;
  intPayrollGroupID: number | null;
  intManagerEmployeeID: number | null;
  strWorkEmail: string | null;
  strPersonalEmail: string | null;
  strMobileNumber: string | null;
  strGender: string | null;
  intPreferredLanguageID: number | null;
  strEmploymentStatus: EmployeeStatus;
  dtDateOfExit: string | null;
  blnIsEssEnabled: boolean;
};

export type EmployeeFormValues = {
  strEmployeeCode: string;
  strTitle: string;
  strFirstName: string;
  strMiddleName: string;
  strLastName: string;
  dtDateOfBirth: string;
  dtDateOfJoining: string;
  intEmploymentTypeID: number | "";
  intDepartmentID: number | "";
  intDesignationID: number | "";
  intGradeID: number | "";
  intCostCenterID: number | "";
  intLocationID: number | "";
  intPayrollGroupID: number | "";
  intManagerEmployeeID: number | "";
  strWorkEmail: string;
  strPersonalEmail: string;
  strMobileNumber: string;
  strGender: string;
  intPreferredLanguageID: number | "";
  strEmploymentStatus: EmployeeStatus;
  dtDateOfExit: string;
  blnIsEssEnabled: boolean;
};

export type EmployeeFormOptions = {
  lstEmploymentTypes: EmployeeLookupOption[];
  lstDepartments: EmployeeLookupOption[];
  lstDesignations: EmployeeLookupOption[];
  lstGrades: EmployeeLookupOption[];
  lstCostCenters: EmployeeLookupOption[];
  lstLocations: EmployeeLookupOption[];
  lstPayrollGroups: EmployeeLookupOption[];
  lstLanguages: EmployeeLookupOption[];
  lstCountries: EmployeeLookupOption[];
  lstStates: EmployeeLookupOption[];
  lstBanks: EmployeeLookupOption[];
  lstManagers: EmployeeLookupOption[];
  lstTitles: string[];
  lstGenders: string[];
  lstEmploymentStatuses: EmployeeStatus[];
  lstAddressTypes: string[];
  lstTaxRegimeCodes: string[];
};

export type EmployeeAddressRecord = {
  intID: number | null;
  strAddressType: string;
  strAddressLine1: string;
  strAddressLine2: string | null;
  strCityName: string | null;
  intStateID: number | null;
  strPostalCode: string | null;
  intCountryID: number | null;
};

export type EmployeeAddressFormValues = {
  strAddressType: string;
  strAddressLine1: string;
  strAddressLine2: string;
  strCityName: string;
  intStateID: number | "";
  strPostalCode: string;
  intCountryID: number | "";
};

export type EmployeeBankRecord = {
  intID: number | null;
  intBankID: number | null;
  strAccountHolderName: string;
  strAccountNumber: string | null;
  strAccountNumberMasked?: string | null;
  strIfscCode: string | null;
  blnIsPrimary: boolean;
  blnIsActive: boolean;
};

export type EmployeeBankFormValues = {
  intBankID: number | "";
  strAccountHolderName: string;
  strAccountNumber: string;
  strIfscCode: string;
  blnIsPrimary: boolean;
  blnIsActive: boolean;
};

export type EmployeeStatutoryRecord = {
  intID: number | null;
  strPanNumber: string | null;
  strUanNumber: string | null;
  strEsiNumber: string | null;
  strTaxRegimeCode: string | null;
  blnPfApplicable: boolean;
  blnEsiApplicable: boolean;
  blnPtApplicable: boolean;
};

export type EmployeeStatutoryFormValues = {
  strPanNumber: string;
  strUanNumber: string;
  strEsiNumber: string;
  strTaxRegimeCode: string;
  blnPfApplicable: boolean;
  blnEsiApplicable: boolean;
  blnPtApplicable: boolean;
};

export type EmployeeExperienceRecord = {
  intID: number;
  strCompanyName: string;
  strJobTitle: string;
  dtFromDate: string;
  dtToDate: string | null;
  decTotalYears: number | null;
  strResponsibilities: string | null;
  decLastDrawnSalary: number | null;
  strReasonForLeaving: string | null;
  blnIsActive: boolean;
};

export type EmployeeExperienceFormValues = {
  strCompanyName: string;
  strJobTitle: string;
  dtFromDate: string;
  dtToDate: string;
  decTotalYears: string;
  strResponsibilities: string;
  decLastDrawnSalary: string;
  strReasonForLeaving: string;
  blnIsActive: boolean;
};

export type EmployeeQualificationRecord = {
  intID: number;
  strDegreeName: string;
  strSpecialization: string | null;
  strInstitutionName: string;
  strUniversityName: string | null;
  intYearOfPassing: number;
  strGradeOrPercentage: string | null;
  strCertificationNumber: string | null;
  blnIsHighestQualification: boolean;
  blnIsActive: boolean;
};

export type EmployeeQualificationFormValues = {
  strDegreeName: string;
  strSpecialization: string;
  strInstitutionName: string;
  strUniversityName: string;
  intYearOfPassing: string;
  strGradeOrPercentage: string;
  strCertificationNumber: string;
  blnIsHighestQualification: boolean;
  blnIsActive: boolean;
};

export type FamilyRelationship =
  | "Father"
  | "Mother"
  | "Spouse"
  | "Child"
  | "Other";

export type FamilyGender = "Male" | "Female" | "Other";

export type EmployeeFamilyDetailRecord = {
  intID: number;
  intEmployeeID: number;
  strName: string;
  strRelationship: string | null;
  dtDateOfBirth: string | null;
  strGender: string | null;
  strContactNumber: string | null;
  strOccupation: string | null;
  blnIsDependent: boolean;
  blnIsNominee: boolean;
  decNomineePercentage: number | null;
  strAddress: string | null;
};

export type EmployeeFamilyDetailFormValues = {
  strName: string;
  strRelationship: FamilyRelationship | "";
  dtDateOfBirth: string;
  strGender: FamilyGender | "";
  strContactNumber: string;
  strOccupation: string;
  blnIsDependent: boolean;
  blnIsNominee: boolean;
  decNomineePercentage: string;
  strAddress: string;
};
