export type LookupOption = {
  intID: number;
  strLabel: string;
};

export type EmployeeListItem = {
  intID: number;
  strEmployeeCode: string;
  strFullName: string;
  strDepartmentName?: string | null;
  strDesignationName?: string | null;
  strWorkEmail?: string | null;
  strMobileNumber?: string | null;
  strEmploymentStatus: string;
  dtDateOfJoining: string;
};

export type EmployeeBasicInfoFormValues = {
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
  strEmploymentStatus: string;
  dtDateOfExit: string;
  blnIsEssEnabled: boolean;
};

export type EmployeeAddress = {
  intID: number;
  strAddressType: "Current" | "Permanent" | "Other";
  strAddressLine1: string;
  strAddressLine2?: string | null;
  strCityName?: string | null;
  intStateID?: number | null;
  strPostalCode?: string | null;
  intCountryID: number;
};

export type EmployeeAddressFormValues = Omit<EmployeeAddress, "intID">;

export type EmployeeBankAccount = {
  intID: number;
  intBankID: number;
  strBankName?: string | null;
  strAccountHolderName: string;
  strAccountNumberMasked?: string | null;
  strIfscCode?: string | null;
  blnIsPrimary: boolean;
  blnIsActive: boolean;
};

export type EmployeeBankAccountFormValues = {
  intBankID: number | "";
  strAccountHolderName: string;
  strAccountNumber: string;
  strIfscCode: string;
  blnIsPrimary: boolean;
  blnIsActive: boolean;
};

export type EmployeeStatutory = {
  intID?: number | null;
  strPanNumber?: string | null;
  strUanNumber?: string | null;
  strEsiNumber?: string | null;
  strTaxRegimeCode?: string | null;
  blnPfApplicable: boolean;
  blnEsiApplicable: boolean;
  blnPtApplicable: boolean;
};

export type EmployeeDetail = EmployeeBasicInfoFormValues & {
  intID: number;
  strFullName: string;
  lstAddresses: EmployeeAddress[];
  lstBankAccounts: EmployeeBankAccount[];
  objStatutory?: EmployeeStatutory | null;
};

export type EmployeeLookups = {
  lstEmploymentTypes: LookupOption[];
  lstDepartments: LookupOption[];
  lstDesignations: LookupOption[];
  lstGrades: LookupOption[];
  lstCostCenters: LookupOption[];
  lstLocations: LookupOption[];
  lstPayrollGroups: LookupOption[];
  lstLanguages: LookupOption[];
  lstManagers: LookupOption[];
  lstCountries: LookupOption[];
  lstStates: LookupOption[];
  lstBanks: LookupOption[];
};

export type StandardApiResponse<TData> = {
  ResultCode: number;
  Msg: string;
  Data: TData;
};

export const defaultEmployeeBasicInfoValues: EmployeeBasicInfoFormValues = {
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

export const defaultEmployeeAddressValues: EmployeeAddressFormValues = {
  strAddressType: "Current",
  strAddressLine1: "",
  strAddressLine2: "",
  strCityName: "",
  intStateID: null,
  strPostalCode: "",
  intCountryID: 0
};

export const defaultEmployeeBankValues: EmployeeBankAccountFormValues = {
  intBankID: "",
  strAccountHolderName: "",
  strAccountNumber: "",
  strIfscCode: "",
  blnIsPrimary: true,
  blnIsActive: true
};

export const defaultEmployeeStatutoryValues: EmployeeStatutory = {
  strPanNumber: "",
  strUanNumber: "",
  strEsiNumber: "",
  strTaxRegimeCode: "",
  blnPfApplicable: false,
  blnEsiApplicable: false,
  blnPtApplicable: false
};
