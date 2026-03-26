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
  lstSalaryStructures: EmployeeSalaryStructureOption[];
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

export type EmployeeSalaryComponentRecord = {
  intID: number | null;
  intSalaryComponentID: number;
  strComponentName: string;
  strComponentCode: string | null;
  strComponentType: "Earning" | "Deduction";
  strCalculationType: "Fixed" | "Percentage";
  fltValue: number | null;
  fltPercentageValue: number | null;
  intCalculationOrder: number;
  blnIsRequired: boolean;
  blnValueReadOnly: boolean;
  lstDependencyComponentIDs: number[];
};

export type EmployeeSalaryRecord = {
  intID: number | null;
  intSalaryStructureID: number | null;
  strSalaryStructureName: string | null;
  lstSalaryComponents: EmployeeSalaryComponentRecord[];
  fltTotalEarnings: number;
  fltTotalDeductions: number;
  fltNetSalary: number;
};

export type EmployeeSalaryComponentFormValues = {
  intID: number | null;
  intSalaryComponentID: number;
  strComponentName: string;
  strComponentCode: string;
  strComponentType: "Earning" | "Deduction";
  strCalculationType: "Fixed" | "Percentage";
  strValue: string;
  fltPercentageValue: number | null;
  intCalculationOrder: number;
  blnIsRequired: boolean;
  blnValueReadOnly: boolean;
  lstDependencyComponentIDs: number[];
};

export type EmployeeSalaryFormValues = {
  intSalaryStructureID: number | "";
  lstSalaryComponents: EmployeeSalaryComponentFormValues[];
};

export type EmployeeSalaryStructureOption = {
  intID: number;
  strLabel: string;
  strCode?: string;
  lstSalaryComponents: EmployeeSalaryComponentRecord[];
};
