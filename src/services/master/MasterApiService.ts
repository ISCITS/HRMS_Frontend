"use client";

import axios from "axios";

import { authHelpers } from "@/lib/auth";
import { axiosInstance } from "@/lib/axiosInstance";
import { decryptPayload } from "@/lib/security/decryptPayload";

type ApiEnvelope<TData> = {
  ResultCode: number;
  Msg: string;
  Data: TData;
};

export type DepartmentApiRecord = {
  intID: number;
  strDepartmentCode: string;
  strDepartmentName: string;
  strManagerName?: string | null;
  blnIsActive: boolean;
  intCompanyID: number;
  intTenantID: number;
};

export type DesignationApiRecord = {
  intID: number;
  strDesignationCode: string;
  strDesignationName: string;
  blnIsActive: boolean;
  intTenantID: number;
};

export type UserApiRecord = {
  intID: number;
  intTenantID: number;
  intCompanyID: number | null;
  strLoginName: string | null;
  strEmailAddress: string | null;
  strMobileNumber: string | null;
  strAuthSource: "local" | "sso";
  blnIsSsoEnabled: boolean;
  strSsoLoginMapping: string | null;
  blnIsActive: boolean;
  blnIsLocked: boolean;
};

export type CountryApiRecord = {
  intID: number;
  strCountryCode: string;
  strCountryName: string;
  strCurrencyCode: string;
  strPhoneCode: string | null;
  blnIsActive: boolean;
};

export type StateApiRecord = {
  intID: number;
  intCountryID: number;
  strStateCode: string;
  strStateName: string;
  blnIsActive: boolean;
};

export type BankApiRecord = {
  intID: number;
  intTenantID: number;
  strBankCode: string;
  strBankName: string;
  blnIsActive: boolean;
};

export type CostCenterApiRecord = {
  intID: number;
  intTenantID: number;
  intCompanyID: number;
  strCostCenterCode: string;
  strCostCenterName: string;
  blnIsActive: boolean;
};

export type GradeApiRecord = {
  intID: number;
  intTenantID: number;
  strGradeCode: string;
  strGradeName: string;
  blnIsActive: boolean;
};

export type LocationApiRecord = {
  intID: number;
  intTenantID: number;
  intCompanyID: number;
  strLocationCode: string;
  strLocationName: string;
  intStateID: number | null;
  strStateName: string | null;
  strCityName: string | null;
  blnIsActive: boolean;
};

export type LocationFormOptionsApiRecord = {
  lstStates: EmployeeLookupOptionApiRecord[];
};

export type EmployeeApiRecord = {
  intID: number;
  strEmployeeCode: string;
  strFullName: string;
  strWorkEmail: string | null;
  strMobileNumber: string | null;
  strDepartmentName: string | null;
  strDesignationName: string | null;
  strEmploymentTypeName: string | null;
  dtDateOfJoining: string;
  strEmploymentStatus: "Active" | "Inactive";
  blnIsEssEnabled: boolean;
  strLocationName: string | null;
  strManagerName: string | null;
};

export type EmployeeDetailApiRecord = {
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
  strEmploymentStatus: "Active" | "Inactive";
  dtDateOfExit: string | null;
  blnIsEssEnabled: boolean;
};

export type EmployeeLookupOptionApiRecord = {
  intID: number;
  strLabel: string;
  strCode?: string;
};

export type EmployeeFormOptionsApiRecord = {
  lstEmploymentTypes: EmployeeLookupOptionApiRecord[];
  lstDepartments: EmployeeLookupOptionApiRecord[];
  lstDesignations: EmployeeLookupOptionApiRecord[];
  lstGrades: EmployeeLookupOptionApiRecord[];
  lstCostCenters: EmployeeLookupOptionApiRecord[];
  lstLocations: EmployeeLookupOptionApiRecord[];
  lstPayrollGroups: EmployeeLookupOptionApiRecord[];
  lstLanguages: EmployeeLookupOptionApiRecord[];
  lstCountries: EmployeeLookupOptionApiRecord[];
  lstStates: EmployeeLookupOptionApiRecord[];
  lstBanks: EmployeeLookupOptionApiRecord[];
  lstManagers: EmployeeLookupOptionApiRecord[];
  lstTitles: string[];
  lstGenders: Array<"Male" | "Female" | "Other">;
  lstEmploymentStatuses: Array<"Active" | "Inactive">;
  lstAddressTypes: string[];
  lstTaxRegimeCodes: string[];
};

export type EmployeeAddressApiRecord = {
  intID: number | null;
  strAddressType: string;
  strAddressLine1: string;
  strAddressLine2: string | null;
  strCityName: string | null;
  intStateID: number | null;
  strPostalCode: string | null;
  intCountryID: number | null;
};

export type EmployeeBankApiRecord = {
  intID: number | null;
  intBankID: number | null;
  strAccountHolderName: string;
  strAccountNumber: string | null;
  strAccountNumberMasked?: string | null;
  strIfscCode: string | null;
  blnIsPrimary: boolean;
  blnIsActive: boolean;
};

export type EmployeeStatutoryApiRecord = {
  intID: number | null;
  strPanNumber: string | null;
  strUanNumber: string | null;
  strEsiNumber: string | null;
  strTaxRegimeCode: string | null;
  blnPfApplicable: boolean;
  blnEsiApplicable: boolean;
  blnPtApplicable: boolean;
};

export type SalaryComponentApiRecord = {
  intID: number;
  strComponentCode: string;
  strComponentName: string;
  strComponentCategory: string;
  strComponentGroup: string | null;
  strCalcMethod: string;
  strFormulaExpression: string | null;
  strRoundingRule: string | null;
  strDefaultPeriodicity: string;
  strTaxTreatment: string | null;
  blnDeclarationRequired: boolean;
  blnProofRequired: boolean;
  blnAllowManualOverride: boolean;
  blnIsActive: boolean;
  lstDependencyComponentIDs: number[];
};

export type SalaryStructureComponentApiRecord = {
  intID: number;
  intSalaryComponentID: number;
  strComponentName: string;
  intLineOrder: number;
  strValueSource: string;
  fltFixedAmount: number | null;
  fltPercentageValue: number | null;
  intBasisComponentID: number | null;
  strFormulaExpression: string | null;
  fltMinAmount: number | null;
  fltMaxAmount: number | null;
  blnIsMandatory: boolean;
  blnIsActive: boolean;
};

export type SalaryStructureApiRecord = {
  intID: number;
  strStructureCode: string;
  strStructureName: string;
  strCurrencyCode: string;
  dtEffectiveFrom: string;
  dtEffectiveTo: string | null;
  blnIsDefault: boolean;
  blnIsActive: boolean;
  lstComponents: SalaryStructureComponentApiRecord[];
};

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: "GET" | "POST" | "PUT" | "DELETE";
  objBody?: unknown;
  strMenuAction: string;
}): Promise<ApiEnvelope<TData>> {
  // Master screens share the same encrypted API contract as the rest of the app,
  // so this helper centralizes auth headers, CSRF menu action wiring, and response decryption.
  const strAccessToken = authHelpers.getAccessToken();
  const objHeaders: Record<string, string> = {};

  if (strAccessToken) {
    objHeaders.Authorization = `Bearer ${strAccessToken}`;
  }

  try {
    const objResponse = await axiosInstance.request({
      method: objOptions.strMethod,
      url: `api/v1${objOptions.strPath}`,
      data: objOptions.objBody,
      csrfMenuAction: objOptions.strMenuAction,
      headers: objHeaders
    });

    const objRawPayload = objResponse.data as ApiEnvelope<TData> | { payload: string };
    const objPayload = "payload" in objRawPayload
      ? await decryptPayload<ApiEnvelope<TData>>(objRawPayload.payload)
      : objRawPayload;

    if (objPayload.ResultCode !== 1) {
      throw new Error(objPayload.Msg ?? "Request failed.");
    }

    return objPayload;
  } catch (objError) {
    if (axios.isAxiosError(objError)) {
      const objResponseData = objError.response?.data as ApiEnvelope<TData> | { payload?: string; Msg?: string } | undefined;
      if (objResponseData?.payload) {
        const objDecryptedPayload = await decryptPayload<ApiEnvelope<TData>>(objResponseData.payload);
        throw new Error(objDecryptedPayload.Msg ?? "Request failed.");
      }
      throw new Error(objResponseData?.Msg ?? objError.message ?? "Request failed.");
    }

    throw objError;
  }
}

export const masterApiService = {
  // Department CRUD and bulk actions.
  getDepartments() {
    return requestApi<DepartmentApiRecord[]>({
      strPath: "/masters/departments",
      strMethod: "GET",
      strMenuAction: "MASTER_DEPARTMENT_LIST"
    });
  },

  createDepartment(objBody: { strDepartmentCode: string; strDepartmentName: string; strManagerName: string; blnIsActive: boolean }) {
    // Creates a new department record inside the current tenant/company scope on the backend.
    return requestApi<DepartmentApiRecord>({
      strPath: "/masters/departments",
      strMethod: "POST",
      objBody,
      strMenuAction: "MASTER_DEPARTMENT_CREATE"
    });
  },

  updateDepartment(intID: number, objBody: { strDepartmentCode: string; strDepartmentName: string; strManagerName: string; blnIsActive: boolean }) {
    // Updates an existing department by primary key.
    return requestApi<DepartmentApiRecord>({
      strPath: `/masters/departments/${intID}`,
      strMethod: "PUT",
      objBody,
      strMenuAction: "MASTER_DEPARTMENT_UPDATE"
    });
  },

  bulkDepartmentStatus(lstIDs: number[], blnIsActive: boolean) {
    // Applies the same active/inactive flag to multiple selected departments.
    return requestApi<{ blnSuccess: boolean }>({
      strPath: "/masters/departments/bulk-status",
      strMethod: "POST",
      objBody: { lstIDs, blnIsActive },
      strMenuAction: "MASTER_DEPARTMENT_BULK_STATUS"
    });
  },

  bulkDepartmentDelete(lstIDs: number[]) {
    // Deletes multiple department records in one backend call.
    return requestApi<{ blnSuccess: boolean }>({
      strPath: "/masters/departments/bulk-delete",
      strMethod: "POST",
      objBody: { lstIDs },
      strMenuAction: "MASTER_DEPARTMENT_BULK_DELETE"
    });
  },

  // Designation CRUD and bulk actions.
  getDesignations() {
    // Fetches the designation list scoped by the logged-in tenant.
    return requestApi<DesignationApiRecord[]>({
      strPath: "/masters/designations",
      strMethod: "GET",
      strMenuAction: "MASTER_DESIGNATION_LIST"
    });
  },

  createDesignation(objBody: { strDesignationCode: string; strDesignationName: string; blnIsActive: boolean }) {
    // Creates a new designation record.
    return requestApi<DesignationApiRecord>({
      strPath: "/masters/designations",
      strMethod: "POST",
      objBody,
      strMenuAction: "MASTER_DESIGNATION_CREATE"
    });
  },

  updateDesignation(intID: number, objBody: { strDesignationCode: string; strDesignationName: string; blnIsActive: boolean }) {
    // Updates an existing designation by primary key.
    return requestApi<DesignationApiRecord>({
      strPath: `/masters/designations/${intID}`,
      strMethod: "PUT",
      objBody,
      strMenuAction: "MASTER_DESIGNATION_UPDATE"
    });
  },

  bulkDesignationStatus(lstIDs: number[], blnIsActive: boolean) {
    // Applies one status change to all selected designations.
    return requestApi<{ blnSuccess: boolean }>({
      strPath: "/masters/designations/bulk-status",
      strMethod: "POST",
      objBody: { lstIDs, blnIsActive },
      strMenuAction: "MASTER_DESIGNATION_BULK_STATUS"
    });
  },

  bulkDesignationDelete(lstIDs: number[]) {
    // Deletes multiple designation records in one backend request.
    return requestApi<{ blnSuccess: boolean }>({
      strPath: "/masters/designations/bulk-delete",
      strMethod: "POST",
      objBody: { lstIDs },
      strMenuAction: "MASTER_DESIGNATION_BULK_DELETE"
    });
  },

  // Bank CRUD and bulk actions.
  getBanks() {
    // Fetches the bank list scoped by the logged-in tenant.
    return requestApi<BankApiRecord[]>({
      strPath: "/masters/banks",
      strMethod: "GET",
      strMenuAction: "MASTER_BANK_LIST"
    });
  },

  createBank(objBody: { strBankCode: string; strBankName: string; blnIsActive: boolean }) {
    // Creates a new bank record.
    return requestApi<BankApiRecord>({
      strPath: "/masters/banks",
      strMethod: "POST",
      objBody,
      strMenuAction: "MASTER_BANK_CREATE"
    });
  },

  updateBank(intID: number, objBody: { strBankCode: string; strBankName: string; blnIsActive: boolean }) {
    // Updates an existing bank by primary key.
    return requestApi<BankApiRecord>({
      strPath: `/masters/banks/${intID}`,
      strMethod: "PUT",
      objBody,
      strMenuAction: "MASTER_BANK_UPDATE"
    });
  },

  bulkBankStatus(lstIDs: number[], blnIsActive: boolean) {
    // Applies one status change to all selected banks.
    return requestApi<{ blnSuccess: boolean }>({
      strPath: "/masters/banks/bulk-status",
      strMethod: "POST",
      objBody: { lstIDs, blnIsActive },
      strMenuAction: "MASTER_BANK_BULK_STATUS"
    });
  },

  bulkBankDelete(lstIDs: number[]) {
    // Deletes multiple bank records in one backend request.
    return requestApi<{ blnSuccess: boolean }>({
      strPath: "/masters/banks/bulk-delete",
      strMethod: "POST",
      objBody: { lstIDs },
      strMenuAction: "MASTER_BANK_BULK_DELETE"
    });
  },

  // Cost Center CRUD and bulk actions.
  getCostCenters() {
    return requestApi<CostCenterApiRecord[]>({
      strPath: "/masters/cost-centers",
      strMethod: "GET",
      strMenuAction: "MASTER_COST_CENTER_LIST"
    });
  },

  createCostCenter(objBody: { strCostCenterCode: string; strCostCenterName: string; blnIsActive: boolean }) {
    return requestApi<CostCenterApiRecord>({
      strPath: "/masters/cost-centers",
      strMethod: "POST",
      objBody,
      strMenuAction: "MASTER_COST_CENTER_CREATE"
    });
  },

  updateCostCenter(intID: number, objBody: { strCostCenterCode: string; strCostCenterName: string; blnIsActive: boolean }) {
    return requestApi<CostCenterApiRecord>({
      strPath: `/masters/cost-centers/${intID}`,
      strMethod: "PUT",
      objBody,
      strMenuAction: "MASTER_COST_CENTER_UPDATE"
    });
  },

  bulkCostCenterStatus(lstIDs: number[], blnIsActive: boolean) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: "/masters/cost-centers/bulk-status",
      strMethod: "POST",
      objBody: { lstIDs, blnIsActive },
      strMenuAction: "MASTER_COST_CENTER_BULK_STATUS"
    });
  },

  bulkCostCenterDelete(lstIDs: number[]) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: "/masters/cost-centers/bulk-delete",
      strMethod: "POST",
      objBody: { lstIDs },
      strMenuAction: "MASTER_COST_CENTER_BULK_DELETE"
    });
  },

  // Grade CRUD and bulk actions.
  getGrades() {
    return requestApi<GradeApiRecord[]>({
      strPath: "/masters/grades",
      strMethod: "GET",
      strMenuAction: "MASTER_GRADE_LIST"
    });
  },

  createGrade(objBody: { strGradeCode: string; strGradeName: string; blnIsActive: boolean }) {
    return requestApi<GradeApiRecord>({
      strPath: "/masters/grades",
      strMethod: "POST",
      objBody,
      strMenuAction: "MASTER_GRADE_CREATE"
    });
  },

  updateGrade(intID: number, objBody: { strGradeCode: string; strGradeName: string; blnIsActive: boolean }) {
    return requestApi<GradeApiRecord>({
      strPath: `/masters/grades/${intID}`,
      strMethod: "PUT",
      objBody,
      strMenuAction: "MASTER_GRADE_UPDATE"
    });
  },

  bulkGradeStatus(lstIDs: number[], blnIsActive: boolean) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: "/masters/grades/bulk-status",
      strMethod: "POST",
      objBody: { lstIDs, blnIsActive },
      strMenuAction: "MASTER_GRADE_BULK_STATUS"
    });
  },

  bulkGradeDelete(lstIDs: number[]) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: "/masters/grades/bulk-delete",
      strMethod: "POST",
      objBody: { lstIDs },
      strMenuAction: "MASTER_GRADE_BULK_DELETE"
    });
  },

  // Location CRUD, lookup, and bulk actions.
  getLocations() {
    return requestApi<LocationApiRecord[]>({
      strPath: "/masters/locations",
      strMethod: "GET",
      strMenuAction: "MASTER_LOCATION_LIST"
    });
  },

  getLocationFormOptions() {
    return requestApi<LocationFormOptionsApiRecord>({
      strPath: "/masters/locations/form-options",
      strMethod: "GET",
      strMenuAction: "MASTER_LOCATION_FORM_OPTIONS"
    });
  },

  createLocation(objBody: { strLocationCode: string; strLocationName: string; intStateID: number | null; strCityName: string | null; blnIsActive: boolean }) {
    return requestApi<LocationApiRecord>({
      strPath: "/masters/locations",
      strMethod: "POST",
      objBody,
      strMenuAction: "MASTER_LOCATION_CREATE"
    });
  },

  updateLocation(intID: number, objBody: { strLocationCode: string; strLocationName: string; intStateID: number | null; strCityName: string | null; blnIsActive: boolean }) {
    return requestApi<LocationApiRecord>({
      strPath: `/masters/locations/${intID}`,
      strMethod: "PUT",
      objBody,
      strMenuAction: "MASTER_LOCATION_UPDATE"
    });
  },

  bulkLocationStatus(lstIDs: number[], blnIsActive: boolean) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: "/masters/locations/bulk-status",
      strMethod: "POST",
      objBody: { lstIDs, blnIsActive },
      strMenuAction: "MASTER_LOCATION_BULK_STATUS"
    });
  },

  bulkLocationDelete(lstIDs: number[]) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: "/masters/locations/bulk-delete",
      strMethod: "POST",
      objBody: { lstIDs },
      strMenuAction: "MASTER_LOCATION_BULK_DELETE"
    });
  },

  // User CRUD and bulk actions.
  getUsers() {
    return requestApi<UserApiRecord[]>({
      strPath: "/masters/users",
      strMethod: "GET",
      strMenuAction: "MASTER_USER_LIST"
    });
  },

  createUser(objBody: {
    strLoginName: string;
    strEmailAddress: string;
    strMobileNumber: string | null;
    strPassword: string | null;
    strAuthSource: "local" | "sso";
    blnIsSsoEnabled: boolean;
    strSsoLoginMapping: string | null;
    blnIsActive: boolean;
  }) {
    return requestApi<UserApiRecord>({
      strPath: "/masters/users",
      strMethod: "POST",
      objBody,
      strMenuAction: "MASTER_USER_CREATE"
    });
  },

  updateUser(intID: number, objBody: {
    strLoginName: string;
    strEmailAddress: string;
    strMobileNumber: string | null;
    strPassword: string | null;
    strAuthSource: "local" | "sso";
    blnIsSsoEnabled: boolean;
    strSsoLoginMapping: string | null;
    blnIsActive: boolean;
  }) {
    return requestApi<UserApiRecord>({
      strPath: `/masters/users/${intID}`,
      strMethod: "PUT",
      objBody,
      strMenuAction: "MASTER_USER_UPDATE"
    });
  },

  bulkUserStatus(lstIDs: number[], blnIsActive: boolean) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: "/masters/users/bulk-status",
      strMethod: "POST",
      objBody: { lstIDs, blnIsActive },
      strMenuAction: "MASTER_USER_BULK_STATUS"
    });
  },

  bulkUserDelete(lstIDs: number[]) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: "/masters/users/bulk-delete",
      strMethod: "POST",
      objBody: { lstIDs },
      strMenuAction: "MASTER_USER_BULK_DELETE"
    });
  },

  getCountries() {
    return requestApi<CountryApiRecord[]>({
      strPath: "/masters/countries",
      strMethod: "GET",
      strMenuAction: "MASTER_COUNTRY_LIST"
    });
  },

  createCountry(objBody: {
    strCountryCode: string;
    strCountryName: string;
    strCurrencyCode: string;
    strPhoneCode: string | null;
    blnIsActive: boolean;
  }) {
    return requestApi<CountryApiRecord>({
      strPath: "/masters/countries",
      strMethod: "POST",
      objBody,
      strMenuAction: "MASTER_COUNTRY_CREATE"
    });
  },

  updateCountry(intID: number, objBody: {
    strCountryCode: string;
    strCountryName: string;
    strCurrencyCode: string;
    strPhoneCode: string | null;
    blnIsActive: boolean;
  }) {
    return requestApi<CountryApiRecord>({
      strPath: `/masters/countries/${intID}`,
      strMethod: "PUT",
      objBody,
      strMenuAction: "MASTER_COUNTRY_UPDATE"
    });
  },

  bulkCountryStatus(lstIDs: number[], blnIsActive: boolean) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: "/masters/countries/bulk-status",
      strMethod: "POST",
      objBody: { lstIDs, blnIsActive },
      strMenuAction: "MASTER_COUNTRY_BULK_STATUS"
    });
  },

  bulkCountryDelete(lstIDs: number[]) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: "/masters/countries/bulk-delete",
      strMethod: "POST",
      objBody: { lstIDs },
      strMenuAction: "MASTER_COUNTRY_BULK_DELETE"
    });
  },

  getStates() {
    return requestApi<StateApiRecord[]>({
      strPath: "/masters/states",
      strMethod: "GET",
      strMenuAction: "MASTER_STATE_LIST"
    });
  },

  createState(objBody: {
    intCountryID: number;
    strStateCode: string;
    strStateName: string;
    blnIsActive: boolean;
  }) {
    return requestApi<StateApiRecord>({
      strPath: "/masters/states",
      strMethod: "POST",
      objBody,
      strMenuAction: "MASTER_STATE_CREATE"
    });
  },

  updateState(intID: number, objBody: {
    intCountryID: number;
    strStateCode: string;
    strStateName: string;
    blnIsActive: boolean;
  }) {
    return requestApi<StateApiRecord>({
      strPath: `/masters/states/${intID}`,
      strMethod: "PUT",
      objBody,
      strMenuAction: "MASTER_STATE_UPDATE"
    });
  },

  bulkStateStatus(lstIDs: number[], blnIsActive: boolean) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: "/masters/states/bulk-status",
      strMethod: "POST",
      objBody: { lstIDs, blnIsActive },
      strMenuAction: "MASTER_STATE_BULK_STATUS"
    });
  },

  bulkStateDelete(lstIDs: number[]) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: "/masters/states/bulk-delete",
      strMethod: "POST",
      objBody: { lstIDs },
      strMenuAction: "MASTER_STATE_BULK_DELETE"
    });
  },

  getEmployees() {
    return requestApi<EmployeeApiRecord[]>({
      strPath: "/masters/employee",
      strMethod: "GET",
      strMenuAction: "MASTER_EMPLOYEE_LIST"
    });
  },

  getEmployeeFormOptions() {
    return requestApi<EmployeeFormOptionsApiRecord>({
      strPath: "/masters/employee/form-options",
      strMethod: "GET",
      strMenuAction: "MASTER_EMPLOYEE_FORM_OPTIONS"
    });
  },

  getEmployeeById(intID: number) {
    return requestApi<EmployeeDetailApiRecord>({
      strPath: `/masters/employee/${intID}`,
      strMethod: "GET",
      strMenuAction: "MASTER_EMPLOYEE_VIEW"
    });
  },

  createEmployee(objBody: EmployeeDetailApiRecord | Record<string, unknown>) {
    return requestApi<EmployeeDetailApiRecord>({
      strPath: "/masters/employee",
      strMethod: "POST",
      objBody,
      strMenuAction: "MASTER_EMPLOYEE_CREATE"
    });
  },

  updateEmployee(intID: number, objBody: EmployeeDetailApiRecord | Record<string, unknown>) {
    return requestApi<EmployeeDetailApiRecord>({
      strPath: `/masters/employee/${intID}`,
      strMethod: "PUT",
      objBody,
      strMenuAction: "MASTER_EMPLOYEE_UPDATE"
    });
  },

  bulkEmployeeStatus(lstIDs: number[], blnIsActive: boolean) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: "/masters/employee/bulk-status",
      strMethod: "POST",
      objBody: { lstIDs, blnIsActive },
      strMenuAction: "MASTER_EMPLOYEE_BULK_STATUS"
    });
  },

  bulkEmployeeDelete(lstIDs: number[]) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: "/masters/employee/bulk-delete",
      strMethod: "POST",
      objBody: { lstIDs },
      strMenuAction: "MASTER_EMPLOYEE_BULK_DELETE"
    });
  },

  getEmployeeAddress(intID: number) {
    return requestApi<EmployeeAddressApiRecord>({
      strPath: `/masters/employee/${intID}/address`,
      strMethod: "GET",
      strMenuAction: "MASTER_EMPLOYEE_ADDRESS_VIEW"
    });
  },

  saveEmployeeAddress(intID: number, objBody: Record<string, unknown>) {
    return requestApi<EmployeeAddressApiRecord>({
      strPath: `/masters/employee/${intID}/address`,
      strMethod: "PUT",
      objBody,
      strMenuAction: "MASTER_EMPLOYEE_ADDRESS_SAVE"
    });
  },

  getEmployeeBankAccount(intID: number) {
    return requestApi<EmployeeBankApiRecord>({
      strPath: `/masters/employee/${intID}/bank`,
      strMethod: "GET",
      strMenuAction: "MASTER_EMPLOYEE_BANK_VIEW"
    });
  },

  saveEmployeeBankAccount(intID: number, objBody: Record<string, unknown>) {
    return requestApi<EmployeeBankApiRecord>({
      strPath: `/masters/employee/${intID}/bank`,
      strMethod: "PUT",
      objBody,
      strMenuAction: "MASTER_EMPLOYEE_BANK_SAVE"
    });
  },

  getEmployeeStatutory(intID: number) {
    return requestApi<EmployeeStatutoryApiRecord>({
      strPath: `/masters/employee/${intID}/statutory`,
      strMethod: "GET",
      strMenuAction: "MASTER_EMPLOYEE_STATUTORY_VIEW"
    });
  },

  saveEmployeeStatutory(intID: number, objBody: Record<string, unknown>) {
    return requestApi<EmployeeStatutoryApiRecord>({
      strPath: `/masters/employee/${intID}/statutory`,
      strMethod: "PUT",
      objBody,
      strMenuAction: "MASTER_EMPLOYEE_STATUTORY_SAVE"
    });
  },
  getSalaryComponents() {
    return requestApi<SalaryComponentApiRecord[]>({
      strPath: "/masters/salary-components",
      strMethod: "GET",
      strMenuAction: "MASTER_SALARY_COMPONENT_LIST"
    });
  },

  createSalaryComponent(objBody: Record<string, unknown>) {
    return requestApi<SalaryComponentApiRecord>({
      strPath: "/masters/salary-components",
      strMethod: "POST",
      objBody,
      strMenuAction: "MASTER_SALARY_COMPONENT_CREATE"
    });
  },

  updateSalaryComponent(intID: number, objBody: Record<string, unknown>) {
    return requestApi<SalaryComponentApiRecord>({
      strPath: `/masters/salary-components/${intID}`,
      strMethod: "PUT",
      objBody,
      strMenuAction: "MASTER_SALARY_COMPONENT_UPDATE"
    });
  },

  deleteSalaryComponent(intID: number) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: `/masters/salary-components/${intID}`,
      strMethod: "DELETE",
      strMenuAction: "MASTER_SALARY_COMPONENT_DELETE"
    });
  },

  getSalaryStructures() {
    return requestApi<SalaryStructureApiRecord[]>({
      strPath: "/masters/salary-structures",
      strMethod: "GET",
      strMenuAction: "MASTER_SALARY_STRUCTURE_LIST"
    });
  },

  createSalaryStructure(objBody: Record<string, unknown>) {
    return requestApi<SalaryStructureApiRecord>({
      strPath: "/masters/salary-structures",
      strMethod: "POST",
      objBody,
      strMenuAction: "MASTER_SALARY_STRUCTURE_CREATE"
    });
  },

  updateSalaryStructure(intID: number, objBody: Record<string, unknown>) {
    return requestApi<SalaryStructureApiRecord>({
      strPath: `/masters/salary-structures/${intID}`,
      strMethod: "PUT",
      objBody,
      strMenuAction: "MASTER_SALARY_STRUCTURE_UPDATE"
    });
  },

  deleteSalaryStructure(intID: number) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: `/masters/salary-structures/${intID}`,
      strMethod: "DELETE",
      strMenuAction: "MASTER_SALARY_STRUCTURE_DELETE"
    });
  }
};
