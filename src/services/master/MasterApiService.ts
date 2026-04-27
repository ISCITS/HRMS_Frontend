"use client";

import {
  ApiFieldKey,
  ApiRequestMethod,
  ApiRoutePrefix,
  MasterApiResource,
  MasterApiRouteSegment,
  MasterMenuAction,
} from "@/Common/enums/AppEnums";
import { requestEncryptedApi, type ApiEnvelope } from "@/Common/utils/apiErrorHandler";
import { authHelpers } from "@/lib/auth";
import { encryptPassBase64 } from "@/lib/passwordEncryption";

export type DepartmentApiRecord = {
  intID: number;
  strDepartmentCode: string;
  strDepartmentName: string;
  strDepartmentDescription?: string | null;
  strManagerName?: string | null;
  blnIsActive: boolean;
  intCompanyID: number;
  intTenantID: number;
  lstTexts?: Array<{
    intLanguageID: number;
    strLanguageName: string;
    strDepartmentName: string;
    strDepartmentDescription: string | null;
  }>;
};

export type DepartmentFormOptionsApiRecord = {
  lstLanguages: EmployeeLookupOptionApiRecord[];
};

export type DesignationApiRecord = {
  intID: number;
  strDesignationCode: string;
  strDesignationName: string;
  blnIsActive: boolean;
  intTenantID: number;
  lstTexts?: Array<{
    intLanguageID: number;
    strLanguageName: string;
    strDesignationName: string;
  }>;
};

export type SimpleMasterFormOptionsApiRecord = {
  lstLanguages: EmployeeLookupOptionApiRecord[];
};

export type UserApiRecord = {
  intID: number;
  intTenantID: number;
  intCompanyID: number | null;
  intEmployeeID?: number | null;
  strLoginName: string | null;
  strLoginID?: string | null;
  strLoginId?: string | null;
  [ApiFieldKey.LoginId]?: string | null;
  strEmailAddress: string | null;
  strMobileNumber: string | null;
  strPassword?: string | null;
  password?: string | null;
  strAuthSource: "local" | "sso";
  blnIsSsoEnabled: boolean;
  blnMfaEnabled?: boolean;
  strSsoLoginMapping: string | null;
  intPreferredLanguageID: number | null;
  intUserGroupID: number | null;
  strUserGroupCode: string | null;
  strUserGroupName: string | null;
  strEmployeeName?: string | null;
  blnIsActive: boolean;
  blnIsLocked: boolean;
};

export type UserFormOptionApiRecord = {
  intID: number;
  strLabel: string;
  strCode?: string;
};

export type UserFormOptionsApiRecord = {
  lstLanguages: UserFormOptionApiRecord[];
  lstUserGroups: UserFormOptionApiRecord[];
  objMfaPolicy?: {
    strTenantMfaFlag?: string | null;
    strTenantMfaType?: string | null;
    blnUserMfaToggleVisible?: boolean;
    blnUserMfaToggleDisabled?: boolean;
    blnUserMfaDefaultEnabled?: boolean;
  };
  objSsoPolicy?: {
    strTenantAuthMode?: string | null;
    blnUserSsoToggleVisible?: boolean;
    blnUserSsoToggleDisabled?: boolean;
    blnUserSsoDefaultEnabled?: boolean;
  };
};

export type CountryApiRecord = {
  intID: number;
  strCountryCode: string;
  strCountryName: string;
  strCurrencyCode: string;
  strPhoneCode: string | null;
  blnIsActive: boolean;
  lstTexts?: Array<{
    intLanguageID: number;
    strLanguageName: string;
    strCountryName: string;
  }>;
};

export type StateApiRecord = {
  intID: number;
  intCountryID: number;
  strStateCode: string;
  strStateName: string;
  blnIsActive: boolean;
  lstTexts?: Array<{
    intLanguageID: number;
    strLanguageName: string;
    strStateName: string;
  }>;
};

export type StateFormOptionsApiRecord = {
  lstLanguages: EmployeeLookupOptionApiRecord[];
  lstCountries: EmployeeLookupOptionApiRecord[];
};

export type BankApiRecord = {
  intID: number;
  intTenantID: number;
  strBankCode: string;
  strBankName: string;
  blnIsActive: boolean;
  lstTexts?: Array<{
    intLanguageID: number;
    strLanguageName: string;
    strBankName: string;
  }>;
};

export type EssDeclarationCategoryTextApiRecord = {
  intLanguageID: number;
  strLanguageName?: string | null;
  strCategoryName: string;
  strCategoryDescription: string | null;
};

export type EssDeclarationCategoryApiRecord = {
  intID: number;
  intTenantID: number;
  intCompanyID: number | null;
  strCategoryCode: string;
  strCategoryName: string;
  strCategoryDescription?: string | null;
  strDeclarationKind: string;
  intLinkedSalaryComponentID: number | null;
  strLinkedSalaryComponentName?: string | null;
  decMaxLimitAmount: number | null;
  blnProofRequired: boolean;
  blnIsActive: boolean;
  lstTexts?: EssDeclarationCategoryTextApiRecord[];
};

export type CostCenterApiRecord = {
  intID: number;
  intTenantID: number;
  intCompanyID: number;
  strCostCenterCode: string;
  strCostCenterName: string;
  blnIsActive: boolean;
  lstTexts?: Array<{
    intLanguageID: number;
    strLanguageName: string;
    strCostCenterName: string;
  }>;
};

export type GradeApiRecord = {
  intID: number;
  intTenantID: number;
  strGradeCode: string;
  strGradeName: string;
  blnIsActive: boolean;
  lstTexts?: Array<{
    intLanguageID: number;
    strLanguageName: string;
    strGradeName: string;
  }>;
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
  lstTexts?: Array<{
    intLanguageID: number;
    strLanguageName: string;
    strLocationName: string;
  }>;
};

export type LocationFormOptionsApiRecord = {
  lstLanguages: EmployeeLookupOptionApiRecord[];
  lstStates: EmployeeLookupOptionApiRecord[];
};

export type PayrollCycleApiRecord = {
  intID: number;
  intCompanyID: number;
  intPayrollGroupID: number;
  strPayrollGroupCode: string | null;
  strPayrollGroupName: string | null;
  strCycleCode: string;
  strCycleName: string;
  strPeriodType: string;
  intCutoffDay: number | null;
  blnIsActive: boolean;
};

export type PayrollCycleFormOptionsApiRecord = {
  lstPayrollGroups: EmployeeLookupOptionApiRecord[];
  lstPeriodTypes: string[];
};

export type TaxRegimeApiRecord = {
  intID: number;
  strRegimeCode: string;
  strRegimeName: string;
  strCountryCode: string;
  blnIsActive: boolean;
  intSlabCount: number;
};

export type TaxSlabApiRecord = {
  intID: number;
  strFinancialYearCode: string;
  fltSlabFromAmount: number;
  fltSlabToAmount: number | null;
  fltTaxRatePercent: number;
  blnRebateEligible: boolean;
  blnIsActive: boolean;
};

export type TaxRegimeFormOptionsApiRecord = {
  lstCountries: EmployeeLookupOptionApiRecord[];
  lstFinancialYears: string[];
};

export type TaxSlabSetApiRecord = {
  objRegime: TaxRegimeApiRecord;
  lstSlabs: TaxSlabApiRecord[];
  lstFinancialYears: string[];
};

export type PayrollProcessLogApiRecord = {
  intID: number;
  intPayrollRunID: number;
  intEmployeeID: number | null;
  strEmployeeCode: string | null;
  strEmployeeName: string | null;
  strProcessStage: string;
  strProcessStatus: string;
  strMessageText: string;
  strEntityName: string | null;
  intEntityID: number | null;
  dtAddedOn: string;
};

export type PayrollProcessLogFormOptionsApiRecord = {
  lstEmployees: EmployeeLookupOptionApiRecord[];
  lstProcessStages: string[];
  lstProcessStatuses: string[];
};

export type VersionLogApiRecord = {
  intID: number;
  strVersionCode: string;
  strVersionName: string;
  dtReleaseDate: string | null;
  strReleaseNotes: string | null;
  blnIsActive: boolean;
  dtAddedOn: string;
  dtUpdatedOn: string;
};

export type EmployeeApiRecord = {
  intID: number;
  strEmployeeCode: string;
  strFullName: string;
  blnIsWorker: boolean;
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
  blnIsWorker: boolean;
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

export type EmployeeExperienceApiRecord = {
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

export type EmployeeQualificationApiRecord = {
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

export type EmployeeFamilyDetailApiRecord = {
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

export type SalaryComponentApiRecord = {
  intID: number;
  strComponentCode: string;
  strComponentName: string;
  strComponentDescription?: string | null;
  blnIsWages: boolean;
  strComponentCategory: string;
  strComponentGroup: string | null;
  strCalcMethod: string;
  strFormulaExpression: string | null;
  strRoundingRule: string | null;
  strDefaultPeriodicity: string;
  strTaxTreatment: string | null;
  blnIncludeInPF: boolean;
  blnIncludeInESIC: boolean;
  blnIncludeInGratuity: boolean;
  blnDeclarationRequired: boolean;
  blnProofRequired: boolean;
  blnAllowManualOverride: boolean;
  blnIsActive: boolean;
  lstDependencyComponentIDs: number[];
  lstTexts?: Array<{
    intLanguageID: number;
    strLanguageName: string;
    strComponentName: string;
    strComponentDescription: string | null;
  }>;
  lstDependencyComponents?: Array<{
    intSalaryComponentID: number;
    strComponentCode: string | null;
    strComponentName: string;
  }>;
};

export type SalaryComponentFormOptionsApiRecord = {
  lstLanguages: EmployeeLookupOptionApiRecord[];
  lstDependencyComponents: EmployeeLookupOptionApiRecord[];
  lstComponentCategories: string[];
  lstComponentGroups: string[];
  lstCalcMethods: string[];
  lstRoundingRules: string[];
  lstDefaultPeriodicities: string[];
  lstTaxTreatments: string[];
};

export type SalaryStructureComponentApiRecord = {
  intID: number;
  intSalaryComponentID: number;
  strComponentCode?: string | null;
  strComponentName: string;
  intLineOrder: number;
  strValueSource: string;
  fltFixedAmount: number | null;
  fltPercentageValue: number | null;
  intBasisComponentID: number | null;
  strBasisComponentName?: string | null;
  strFormulaExpression: string | null;
  fltMinAmount: number | null;
  fltMaxAmount: number | null;
  blnIsMandatory: boolean;
  blnIsActive: boolean;
};

export type SalaryStructureTextApiRecord = {
  intLanguageID: number;
  strLanguageName?: string;
  strStructureName: string;
  strStructureDescription: string | null;
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
  strScopeLabel?: string;
  intComponentCount?: number;
  lstComponents: SalaryStructureComponentApiRecord[];
  lstTexts: SalaryStructureTextApiRecord[];
};

export type SalaryStructureFormOptionsApiRecord = {
  lstSalaryComponents: EmployeeLookupOptionApiRecord[];
  lstLanguages: EmployeeLookupOptionApiRecord[];
  lstValueSources: string[];
  lstCurrencies: string[];
};

export type EmployeeSalaryListApiRecord = {
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  strWorkEmail: string | null;
  strEmploymentStatus: "Active" | "Inactive";
  strSalaryStatus: "Assigned" | "Unassigned";
  strStructureName: string | null;
  strStructureCode: string | null;
  dtEffectiveFrom: string | null;
  decGrossMonthly: number | null;
  decCtcAnnual: number | null;
  strRevisionReason: string | null;
};

export type EmployeeSalaryFormOptionApiRecord = {
  intID: number;
  strLabel: string;
  strCode?: string;
  strCurrencyCode?: string;
  dtEffectiveFrom?: string;
};

export type EmployeeSalaryFormOptionsApiRecord = {
  lstEmployees: EmployeeSalaryFormOptionApiRecord[];
  lstSalaryStructures: EmployeeSalaryFormOptionApiRecord[];
};

export type EmployeeSalaryComponentLineApiRecord = {
  intEmployeeSalaryComponentID: number;
  intSalaryComponentID: number;
  strComponentCode: string | null;
  strComponentName: string | null;
  strComponentCategory: string | null;
  blnAllowManualOverride: boolean;
  strComponentValueType: string;
  decAmountMonthly: number | null;
  decAmountAnnual: number | null;
  decPercentageValue: number | null;
  intBasisComponentID: number | null;
  strFormulaExpression: string | null;
  blnIsOverride: boolean;
  strRemarks: string | null;
};

export type EmployeeSalaryHistoryApiRecord = {
  intEmployeeSalaryStructureID: number;
  strStructureName: string | null;
  strStructureCode: string | null;
  dtEffectiveFrom: string;
  dtEffectiveTo: string | null;
  decCtcAnnual: number | null;
  decGrossMonthly: number | null;
  strRevisionReason: string | null;
  blnIsCurrent: boolean;
};

export type EmployeeSalaryDetailApiRecord = {
  objEmployeeSummary: {
    intEmployeeID: number;
    strEmployeeCode: string;
    strEmployeeName: string;
    strWorkEmail: string | null;
    strEmploymentStatus: "Active" | "Inactive";
  };
  objCurrentSalarySnapshot: {
    decCtcAnnual: number | null;
    decGrossMonthly: number | null;
    strRevisionReason: string | null;
    dtEffectiveFrom: string;
  } | null;
  objAssignedStructure: {
    intSalaryStructureID: number;
    strStructureName: string | null;
    strStructureCode: string | null;
    strCurrencyCode: string;
    dtEffectiveFrom: string;
  } | null;
  lstComponentLines: EmployeeSalaryComponentLineApiRecord[];
  lstRevisionHistory: EmployeeSalaryHistoryApiRecord[];
};

export type EmployeeSalarySummaryApiRecord = {
  objEmployeeSummary: EmployeeSalaryDetailApiRecord["objEmployeeSummary"];
  objCurrentSalarySnapshot: EmployeeSalaryDetailApiRecord["objCurrentSalarySnapshot"];
  objAssignedStructure: EmployeeSalaryDetailApiRecord["objAssignedStructure"];
  intRevisionCount: number;
};

function buildApiPath(objResource: MasterApiResource, ...lstSegments: Array<string | number>) {
  return [objResource, ...lstSegments.map(String)].join("/");
}

function buildApiQueryPath(strPath: string, objParams: URLSearchParams) {
  const strQuery = objParams.toString();
  return strQuery ? `${strPath}?${strQuery}` : strPath;
}

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: ApiRequestMethod;
  objBody?: unknown;
  objQueryParams?: Record<string, string | number | boolean | null | undefined>;
  strMenuAction: MasterMenuAction;
}): Promise<ApiEnvelope<TData>> {
  // Master screens share one encrypted request path with common auth and error translation.
  return requestEncryptedApi<TData>({
    strPath: `${ApiRoutePrefix.ApiV1}${objOptions.strPath}`,
    strMethod: objOptions.strMethod,
    objBody: objOptions.objBody,
    objQueryParams: objOptions.objQueryParams,
    strMenuAction: objOptions.strMenuAction,
    blnUseAuthHeader: true
  });
}

export const masterApiService = {
  // Department CRUD and bulk actions.
  getDepartments() {
    return requestApi<DepartmentApiRecord[]>({
      strPath: MasterApiResource.Departments,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.DepartmentList
    });
  },

  getDepartment(intID: number, intLanguageID?: number | null) {
    return requestApi<DepartmentApiRecord>({
      strPath: buildApiPath(MasterApiResource.Departments, MasterApiRouteSegment.Detail),
      strMethod: ApiRequestMethod.Post,
      objBody: {
        intID,
        ...(intLanguageID ? { intLanguageID } : {})
      },
      strMenuAction: MasterMenuAction.DepartmentList
    });
  },

  getDepartmentFormOptions() {
    return requestApi<DepartmentFormOptionsApiRecord>({
      strPath: buildApiPath(MasterApiResource.Departments, MasterApiRouteSegment.FormOptions),
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.DepartmentList
    });
  },

  translateDepartmentText(objBody: {
    strText: string;
    intSourceLanguageID?: number | null;
    intTargetLanguageID: number;
  }) {
    return requestApi<{
      strTranslatedText: string;
      intSourceLanguageID: number;
      intTargetLanguageID: number;
    }>({
      strPath: buildApiPath(MasterApiResource.Departments, MasterApiRouteSegment.Translate),
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.DepartmentList
    });
  },

  translateMasterText(objBody: {
    strText: string;
    intSourceLanguageID?: number | null;
    intTargetLanguageID: number;
  }) {
    return requestApi<{
      strTranslatedText: string;
      intSourceLanguageID: number;
      intTargetLanguageID: number;
    }>({
      strPath: MasterApiResource.Translate,
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.DepartmentList
    });
  },

  createDepartment(objBody: {
    strDepartmentCode: string;
    strDepartmentName: string;
    strManagerName: string;
    blnIsActive: boolean;
    intLanguageID: number;
    lstTexts: Array<{
      intLanguageID: number;
      strDepartmentName: string;
      strDepartmentDescription: string | null;
    }>;
  }) {
    // Creates a new department record inside the current tenant/company scope on the backend.
    return requestApi<DepartmentApiRecord>({
      strPath: MasterApiResource.Departments,
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.DepartmentCreate
    });
  },

  updateDepartment(intID: number, objBody: {
    strDepartmentCode: string;
    strDepartmentName: string;
    strManagerName: string;
    blnIsActive: boolean;
    intLanguageID: number;
    lstTexts: Array<{
      intLanguageID: number;
      strDepartmentName: string;
      strDepartmentDescription: string | null;
    }>;
  }) {
    // Updates an existing department by primary key.
    return requestApi<DepartmentApiRecord>({
      strPath: buildApiPath(MasterApiResource.Departments, intID),
      strMethod: ApiRequestMethod.Put,
      objBody,
      strMenuAction: MasterMenuAction.DepartmentUpdate
    });
  },

  bulkDepartmentStatus(lstIDs: number[], blnIsActive: boolean) {
    // Applies the same active/inactive flag to multiple selected departments.
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.Departments, MasterApiRouteSegment.BulkStatus),
      strMethod: ApiRequestMethod.Post,
      objBody: { lstIDs, blnIsActive },
      strMenuAction: MasterMenuAction.DepartmentBulkStatus
    });
  },

  bulkDepartmentDelete(lstIDs: number[]) {
    // Deletes multiple department records in one backend call.
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.Departments, MasterApiRouteSegment.BulkDelete),
      strMethod: ApiRequestMethod.Post,
      objBody: { lstIDs },
      strMenuAction: MasterMenuAction.DepartmentBulkDelete
    });
  },

  // Designation CRUD and bulk actions.
  getDesignations() {
    // Fetches the designation list scoped by the logged-in tenant.
    return requestApi<DesignationApiRecord[]>({
      strPath: MasterApiResource.Designations,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.DesignationList
    });
  },

  getDesignation(intID: number, intLanguageID?: number | null) {
    return requestApi<DesignationApiRecord>({
      strPath: buildApiPath(MasterApiResource.Designations, intID),
      strMethod: ApiRequestMethod.Get,
      objQueryParams: intLanguageID ? { language_id: intLanguageID } : undefined,
      strMenuAction: MasterMenuAction.DesignationList
    });
  },

  getDesignationFormOptions() {
    return requestApi<SimpleMasterFormOptionsApiRecord>({
      strPath: buildApiPath(MasterApiResource.Designations, MasterApiRouteSegment.FormOptions),
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.DesignationList
    });
  },

  translateDesignationText(objBody: {
    strText: string;
    intSourceLanguageID?: number | null;
    intTargetLanguageID: number;
  }) {
    return requestApi<{
      strTranslatedText: string;
      intSourceLanguageID: number;
      intTargetLanguageID: number;
    }>({
      strPath: buildApiPath(MasterApiResource.Designations, MasterApiRouteSegment.Translate),
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.DesignationList
    });
  },

  createDesignation(objBody: {
    strDesignationCode: string;
    strDesignationName: string;
    blnIsActive: boolean;
    intLanguageID: number;
    lstTexts: Array<{ intLanguageID: number; strDesignationName: string }>;
  }) {
    // Creates a new designation record.
    return requestApi<DesignationApiRecord>({
      strPath: MasterApiResource.Designations,
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.DesignationCreate
    });
  },

  updateDesignation(intID: number, objBody: {
    strDesignationCode: string;
    strDesignationName: string;
    blnIsActive: boolean;
    intLanguageID: number;
    lstTexts: Array<{ intLanguageID: number; strDesignationName: string }>;
  }) {
    // Updates an existing designation by primary key.
    return requestApi<DesignationApiRecord>({
      strPath: buildApiPath(MasterApiResource.Designations, intID),
      strMethod: ApiRequestMethod.Put,
      objBody,
      strMenuAction: MasterMenuAction.DesignationUpdate
    });
  },

  bulkDesignationStatus(lstIDs: number[], blnIsActive: boolean) {
    // Applies one status change to all selected designations.
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.Designations, MasterApiRouteSegment.BulkStatus),
      strMethod: ApiRequestMethod.Post,
      objBody: { lstIDs, blnIsActive },
      strMenuAction: MasterMenuAction.DesignationBulkStatus
    });
  },

  bulkDesignationDelete(lstIDs: number[]) {
    // Deletes multiple designation records in one backend request.
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.Designations, MasterApiRouteSegment.BulkDelete),
      strMethod: ApiRequestMethod.Post,
      objBody: { lstIDs },
      strMenuAction: MasterMenuAction.DesignationBulkDelete
    });
  },

  // Bank CRUD and bulk actions.
  getBanks() {
    // Fetches the bank list scoped by the logged-in tenant.
    return requestApi<BankApiRecord[]>({
      strPath: MasterApiResource.Banks,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.BankList
    });
  },

  getBank(intID: number, intLanguageID?: number | null) {
    return requestApi<BankApiRecord>({
      strPath: buildApiPath(MasterApiResource.Banks, intID),
      strMethod: ApiRequestMethod.Get,
      objQueryParams: intLanguageID ? { language_id: intLanguageID } : undefined,
      strMenuAction: MasterMenuAction.BankList
    });
  },

  getBankFormOptions() {
    return requestApi<SimpleMasterFormOptionsApiRecord>({
      strPath: buildApiPath(MasterApiResource.Banks, MasterApiRouteSegment.FormOptions),
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.BankList
    });
  },

  translateBankText(objBody: {
    strText: string;
    intSourceLanguageID?: number | null;
    intTargetLanguageID: number;
  }) {
    return requestApi<{
      strTranslatedText: string;
      intSourceLanguageID: number;
      intTargetLanguageID: number;
    }>({
      strPath: buildApiPath(MasterApiResource.Banks, MasterApiRouteSegment.Translate),
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.BankList
    });
  },

  createBank(objBody: {
    strBankCode: string;
    strBankName: string;
    blnIsActive: boolean;
    intLanguageID: number;
    lstTexts: Array<{ intLanguageID: number; strBankName: string }>;
  }) {
    // Creates a new bank record.
    return requestApi<BankApiRecord>({
      strPath: MasterApiResource.Banks,
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.BankCreate
    });
  },

  updateBank(intID: number, objBody: {
    strBankCode: string;
    strBankName: string;
    blnIsActive: boolean;
    intLanguageID: number;
    lstTexts: Array<{ intLanguageID: number; strBankName: string }>;
  }) {
    // Updates an existing bank by primary key.
    return requestApi<BankApiRecord>({
      strPath: buildApiPath(MasterApiResource.Banks, intID),
      strMethod: ApiRequestMethod.Put,
      objBody,
      strMenuAction: MasterMenuAction.BankUpdate
    });
  },

  bulkBankStatus(lstIDs: number[], blnIsActive: boolean) {
    // Applies one status change to all selected banks.
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.Banks, MasterApiRouteSegment.BulkStatus),
      strMethod: ApiRequestMethod.Post,
      objBody: { lstIDs, blnIsActive },
      strMenuAction: MasterMenuAction.BankBulkStatus
    });
  },

  bulkBankDelete(lstIDs: number[]) {
    // Deletes multiple bank records in one backend request.
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.Banks, MasterApiRouteSegment.BulkDelete),
      strMethod: ApiRequestMethod.Post,
      objBody: { lstIDs },
      strMenuAction: MasterMenuAction.BankBulkDelete
    });
  },

  getEssDeclarationCategories() {
    return requestApi<EssDeclarationCategoryApiRecord[]>({
      strPath: MasterApiResource.EssDeclarationCategories,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.EssDeclarationCategoryList
    });
  },

  createEssDeclarationCategory(objBody: {
    strCategoryCode: string;
    strCategoryName: string;
    strCategoryDescription: string | null;
    strDeclarationKind: string;
    intLinkedSalaryComponentID: number | null;
    decMaxLimitAmount: number | null;
    blnProofRequired: boolean;
    blnIsActive: boolean;
  }) {
    return requestApi<EssDeclarationCategoryApiRecord>({
      strPath: MasterApiResource.EssDeclarationCategories,
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.EssDeclarationCategoryCreate
    });
  },

  updateEssDeclarationCategory(intID: number, objBody: {
    strCategoryCode: string;
    strCategoryName: string;
    strCategoryDescription: string | null;
    strDeclarationKind: string;
    intLinkedSalaryComponentID: number | null;
    decMaxLimitAmount: number | null;
    blnProofRequired: boolean;
    blnIsActive: boolean;
  }) {
    return requestApi<EssDeclarationCategoryApiRecord>({
      strPath: buildApiPath(MasterApiResource.EssDeclarationCategories, intID),
      strMethod: ApiRequestMethod.Put,
      objBody,
      strMenuAction: MasterMenuAction.EssDeclarationCategoryUpdate
    });
  },

  bulkEssDeclarationCategoryStatus(lstIDs: number[], blnIsActive: boolean) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.EssDeclarationCategories, MasterApiRouteSegment.BulkStatus),
      strMethod: ApiRequestMethod.Post,
      objBody: { lstIDs, blnIsActive },
      strMenuAction: MasterMenuAction.EssDeclarationCategoryBulkStatus
    });
  },

  bulkEssDeclarationCategoryDelete(lstIDs: number[]) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.EssDeclarationCategories, MasterApiRouteSegment.BulkDelete),
      strMethod: ApiRequestMethod.Post,
      objBody: { lstIDs },
      strMenuAction: MasterMenuAction.EssDeclarationCategoryBulkDelete
    });
  },

  // Cost Center CRUD and bulk actions.
  getCostCenters() {
    return requestApi<CostCenterApiRecord[]>({
      strPath: MasterApiResource.CostCenters,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.CostCenterList
    });
  },

  getCostCenter(intID: number, intLanguageID?: number | null) {
    return requestApi<CostCenterApiRecord>({
      strPath: buildApiPath(MasterApiResource.CostCenters, intID),
      strMethod: ApiRequestMethod.Get,
      objQueryParams: intLanguageID ? { language_id: intLanguageID } : undefined,
      strMenuAction: MasterMenuAction.CostCenterList
    });
  },

  getCostCenterFormOptions() {
    return requestApi<SimpleMasterFormOptionsApiRecord>({
      strPath: buildApiPath(MasterApiResource.CostCenters, MasterApiRouteSegment.FormOptions),
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.CostCenterList
    });
  },

  translateCostCenterText(objBody: {
    strText: string;
    intSourceLanguageID?: number | null;
    intTargetLanguageID: number;
  }) {
    return requestApi<{
      strTranslatedText: string;
      intSourceLanguageID: number;
      intTargetLanguageID: number;
    }>({
      strPath: buildApiPath(MasterApiResource.CostCenters, MasterApiRouteSegment.Translate),
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.CostCenterList
    });
  },

  createCostCenter(objBody: {
    strCostCenterCode: string;
    strCostCenterName: string;
    blnIsActive: boolean;
    intLanguageID: number;
    lstTexts: Array<{ intLanguageID: number; strCostCenterName: string }>;
  }) {
    return requestApi<CostCenterApiRecord>({
      strPath: MasterApiResource.CostCenters,
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.CostCenterCreate
    });
  },

  updateCostCenter(intID: number, objBody: {
    strCostCenterCode: string;
    strCostCenterName: string;
    blnIsActive: boolean;
    intLanguageID: number;
    lstTexts: Array<{ intLanguageID: number; strCostCenterName: string }>;
  }) {
    return requestApi<CostCenterApiRecord>({
      strPath: buildApiPath(MasterApiResource.CostCenters, intID),
      strMethod: ApiRequestMethod.Put,
      objBody,
      strMenuAction: MasterMenuAction.CostCenterUpdate
    });
  },

  bulkCostCenterStatus(lstIDs: number[], blnIsActive: boolean) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.CostCenters, MasterApiRouteSegment.BulkStatus),
      strMethod: ApiRequestMethod.Post,
      objBody: { lstIDs, blnIsActive },
      strMenuAction: MasterMenuAction.CostCenterBulkStatus
    });
  },

  bulkCostCenterDelete(lstIDs: number[]) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.CostCenters, MasterApiRouteSegment.BulkDelete),
      strMethod: ApiRequestMethod.Post,
      objBody: { lstIDs },
      strMenuAction: MasterMenuAction.CostCenterBulkDelete
    });
  },

  // Grade CRUD and bulk actions.
  getGrades() {
    return requestApi<GradeApiRecord[]>({
      strPath: MasterApiResource.Grades,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.GradeList
    });
  },

  getGrade(intID: number, intLanguageID?: number | null) {
    return requestApi<GradeApiRecord>({
      strPath: buildApiPath(MasterApiResource.Grades, intID),
      strMethod: ApiRequestMethod.Get,
      objQueryParams: intLanguageID ? { language_id: intLanguageID } : undefined,
      strMenuAction: MasterMenuAction.GradeList
    });
  },

  getGradeFormOptions() {
    return requestApi<SimpleMasterFormOptionsApiRecord>({
      strPath: buildApiPath(MasterApiResource.Grades, MasterApiRouteSegment.FormOptions),
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.GradeList
    });
  },

  translateGradeText(objBody: {
    strText: string;
    intSourceLanguageID?: number | null;
    intTargetLanguageID: number;
  }) {
    return requestApi<{
      strTranslatedText: string;
      intSourceLanguageID: number;
      intTargetLanguageID: number;
    }>({
      strPath: buildApiPath(MasterApiResource.Grades, MasterApiRouteSegment.Translate),
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.GradeList
    });
  },

  createGrade(objBody: {
    strGradeCode: string;
    strGradeName: string;
    blnIsActive: boolean;
    intLanguageID: number;
    lstTexts: Array<{ intLanguageID: number; strGradeName: string }>;
  }) {
    return requestApi<GradeApiRecord>({
      strPath: MasterApiResource.Grades,
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.GradeCreate
    });
  },

  updateGrade(intID: number, objBody: {
    strGradeCode: string;
    strGradeName: string;
    blnIsActive: boolean;
    intLanguageID: number;
    lstTexts: Array<{ intLanguageID: number; strGradeName: string }>;
  }) {
    return requestApi<GradeApiRecord>({
      strPath: buildApiPath(MasterApiResource.Grades, intID),
      strMethod: ApiRequestMethod.Put,
      objBody,
      strMenuAction: MasterMenuAction.GradeUpdate
    });
  },

  bulkGradeStatus(lstIDs: number[], blnIsActive: boolean) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.Grades, MasterApiRouteSegment.BulkStatus),
      strMethod: ApiRequestMethod.Post,
      objBody: { lstIDs, blnIsActive },
      strMenuAction: MasterMenuAction.GradeBulkStatus
    });
  },

  bulkGradeDelete(lstIDs: number[]) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.Grades, MasterApiRouteSegment.BulkDelete),
      strMethod: ApiRequestMethod.Post,
      objBody: { lstIDs },
      strMenuAction: MasterMenuAction.GradeBulkDelete
    });
  },

  // Location CRUD, lookup, and bulk actions.
  getLocations() {
    return requestApi<LocationApiRecord[]>({
      strPath: MasterApiResource.Locations,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.LocationList
    });
  },

  getLocation(intID: number, intLanguageID?: number | null) {
    return requestApi<LocationApiRecord>({
      strPath: buildApiPath(MasterApiResource.Locations, intID),
      strMethod: ApiRequestMethod.Get,
      objQueryParams: intLanguageID ? { language_id: intLanguageID } : undefined,
      strMenuAction: MasterMenuAction.LocationList
    });
  },

  getLocationFormOptions() {
    return requestApi<LocationFormOptionsApiRecord>({
      strPath: buildApiPath(MasterApiResource.Locations, MasterApiRouteSegment.FormOptions),
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.LocationFormOptions
    });
  },

  translateLocationText(objBody: {
    strText: string;
    intSourceLanguageID?: number | null;
    intTargetLanguageID: number;
  }) {
    return requestApi<{
      strTranslatedText: string;
      intSourceLanguageID: number;
      intTargetLanguageID: number;
    }>({
      strPath: buildApiPath(MasterApiResource.Locations, MasterApiRouteSegment.Translate),
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.LocationList
    });
  },

  createLocation(objBody: {
    strLocationCode: string;
    strLocationName: string;
    intStateID: number | null;
    strCityName: string | null;
    blnIsActive: boolean;
    intLanguageID: number;
    lstTexts: Array<{ intLanguageID: number; strLocationName: string }>;
  }) {
    return requestApi<LocationApiRecord>({
      strPath: MasterApiResource.Locations,
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.LocationCreate
    });
  },

  updateLocation(intID: number, objBody: {
    strLocationCode: string;
    strLocationName: string;
    intStateID: number | null;
    strCityName: string | null;
    blnIsActive: boolean;
    intLanguageID: number;
    lstTexts: Array<{ intLanguageID: number; strLocationName: string }>;
  }) {
    return requestApi<LocationApiRecord>({
      strPath: buildApiPath(MasterApiResource.Locations, intID),
      strMethod: ApiRequestMethod.Put,
      objBody,
      strMenuAction: MasterMenuAction.LocationUpdate
    });
  },

  bulkLocationStatus(lstIDs: number[], blnIsActive: boolean) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.Locations, MasterApiRouteSegment.BulkStatus),
      strMethod: ApiRequestMethod.Post,
      objBody: { lstIDs, blnIsActive },
      strMenuAction: MasterMenuAction.LocationBulkStatus
    });
  },

  bulkLocationDelete(lstIDs: number[]) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.Locations, MasterApiRouteSegment.BulkDelete),
      strMethod: ApiRequestMethod.Post,
      objBody: { lstIDs },
      strMenuAction: MasterMenuAction.LocationBulkDelete
    });
  },

  // User CRUD and bulk actions.
  getUsers() {
    return requestApi<UserApiRecord[]>({
      strPath: MasterApiResource.Users,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.UserList
    });
  },

  getUserFormOptions(intUserID?: number) {
    return requestApi<UserFormOptionsApiRecord>({
      strPath: buildApiPath(MasterApiResource.Users, MasterApiRouteSegment.FormOptions),
      strMethod: ApiRequestMethod.Get,
      objQueryParams: intUserID ? { user_id: intUserID } : undefined,
      strMenuAction: MasterMenuAction.UserFormOptions
    });
  },

  createUser(objBody: {
    strLoginName: string;
    strLoginID: string;
    strEmailAddress: string;
    strMobileNumber: string | null;
    strPassword: string | null;
    strAuthSource: "local" | "sso";
    blnIsSsoEnabled: boolean;
    blnMfaEnabled?: boolean;
    strSsoLoginMapping: string | null;
    intPreferredLanguageID: number | null;
    intEmployeeID?: number | null;
    intUserGroupID: number;
    blnIsActive: boolean;
  }) {
    const objEncryptedBody = {
      ...objBody,
      login_id: objBody.strLoginID,
      strPassword: objBody.strPassword ? encryptPassBase64(objBody.strPassword) : null,
    };
    return requestApi<UserApiRecord>({
      strPath: MasterApiResource.Users,
      strMethod: ApiRequestMethod.Post,
      objBody: objEncryptedBody,
      strMenuAction: MasterMenuAction.UserCreate
    });
  },

  updateUser(intID: number, objBody: {
    strLoginName: string;
    strLoginID: string;
    strEmailAddress: string;
    strMobileNumber: string | null;
    strPassword: string | null;
    strAuthSource: "local" | "sso";
    blnIsSsoEnabled: boolean;
    blnMfaEnabled?: boolean;
    strSsoLoginMapping: string | null;
    intPreferredLanguageID: number | null;
    intEmployeeID?: number | null;
    intUserGroupID: number;
    blnIsActive: boolean;
  }) {
    const objEncryptedBody = {
      ...objBody,
      login_id: objBody.strLoginID,
      strPassword: objBody.strPassword ? encryptPassBase64(objBody.strPassword) : null,
    };
    return requestApi<UserApiRecord>({
      strPath: buildApiPath(MasterApiResource.Users, intID),
      strMethod: ApiRequestMethod.Put,
      objBody: objEncryptedBody,
      strMenuAction: MasterMenuAction.UserUpdate
    });
  },

  bulkUserStatus(lstIDs: number[], blnIsActive: boolean) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.Users, MasterApiRouteSegment.BulkStatus),
      strMethod: ApiRequestMethod.Post,
      objBody: { lstIDs, blnIsActive },
      strMenuAction: MasterMenuAction.UserBulkStatus
    });
  },

  bulkUserDelete(lstIDs: number[]) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.Users, MasterApiRouteSegment.BulkDelete),
      strMethod: ApiRequestMethod.Post,
      objBody: { lstIDs },
      strMenuAction: MasterMenuAction.UserBulkDelete
    });
  },

  getCountries() {
    return requestApi<CountryApiRecord[]>({
      strPath: MasterApiResource.Countries,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.CountryList
    });
  },

  getCountry(intID: number, intLanguageID?: number | null) {
    return requestApi<CountryApiRecord>({
      strPath: buildApiPath(MasterApiResource.Countries, intID),
      strMethod: ApiRequestMethod.Get,
      objQueryParams: intLanguageID ? { language_id: intLanguageID } : undefined,
      strMenuAction: MasterMenuAction.CountryList
    });
  },

  getCountryFormOptions() {
    return requestApi<SimpleMasterFormOptionsApiRecord>({
      strPath: buildApiPath(MasterApiResource.Countries, MasterApiRouteSegment.FormOptions),
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.CountryList
    });
  },

  translateCountryText(objBody: {
    strText: string;
    intSourceLanguageID?: number | null;
    intTargetLanguageID: number;
  }) {
    return requestApi<{
      strTranslatedText: string;
      intSourceLanguageID: number;
      intTargetLanguageID: number;
    }>({
      strPath: buildApiPath(MasterApiResource.Countries, MasterApiRouteSegment.Translate),
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.CountryList
    });
  },

  createCountry(objBody: {
    strCountryCode: string;
    strCountryName: string;
    strCurrencyCode: string;
    strPhoneCode: string | null;
    blnIsActive: boolean;
    intLanguageID: number;
    lstTexts: Array<{ intLanguageID: number; strCountryName: string }>;
  }) {
    return requestApi<CountryApiRecord>({
      strPath: MasterApiResource.Countries,
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.CountryCreate
    });
  },

  updateCountry(intID: number, objBody: {
    strCountryCode: string;
    strCountryName: string;
    strCurrencyCode: string;
    strPhoneCode: string | null;
    blnIsActive: boolean;
    intLanguageID: number;
    lstTexts: Array<{ intLanguageID: number; strCountryName: string }>;
  }) {
    return requestApi<CountryApiRecord>({
      strPath: buildApiPath(MasterApiResource.Countries, intID),
      strMethod: ApiRequestMethod.Put,
      objBody,
      strMenuAction: MasterMenuAction.CountryUpdate
    });
  },

  bulkCountryStatus(lstIDs: number[], blnIsActive: boolean) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.Countries, MasterApiRouteSegment.BulkStatus),
      strMethod: ApiRequestMethod.Post,
      objBody: { lstIDs, blnIsActive },
      strMenuAction: MasterMenuAction.CountryBulkStatus
    });
  },

  bulkCountryDelete(lstIDs: number[]) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.Countries, MasterApiRouteSegment.BulkDelete),
      strMethod: ApiRequestMethod.Post,
      objBody: { lstIDs },
      strMenuAction: MasterMenuAction.CountryBulkDelete
    });
  },

  getStates() {
    return requestApi<StateApiRecord[]>({
      strPath: MasterApiResource.States,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.StateList
    });
  },

  getState(intID: number, intLanguageID?: number | null) {
    return requestApi<StateApiRecord>({
      strPath: buildApiPath(MasterApiResource.States, intID),
      strMethod: ApiRequestMethod.Get,
      objQueryParams: intLanguageID ? { language_id: intLanguageID } : undefined,
      strMenuAction: MasterMenuAction.StateList
    });
  },

  getStateFormOptions(intLanguageID?: number | null) {
    return requestApi<StateFormOptionsApiRecord>({
      strPath: buildApiPath(MasterApiResource.States, MasterApiRouteSegment.FormOptions),
      strMethod: ApiRequestMethod.Get,
      objQueryParams: intLanguageID ? { language_id: intLanguageID } : undefined,
      strMenuAction: MasterMenuAction.StateList
    });
  },

  translateStateText(objBody: {
    strText: string;
    intSourceLanguageID?: number | null;
    intTargetLanguageID: number;
  }) {
    return requestApi<{
      strTranslatedText: string;
      intSourceLanguageID: number;
      intTargetLanguageID: number;
    }>({
      strPath: buildApiPath(MasterApiResource.States, MasterApiRouteSegment.Translate),
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.StateList
    });
  },

  createState(objBody: {
    intCountryID: number;
    strStateCode: string;
    strStateName: string;
    blnIsActive: boolean;
    intLanguageID: number;
    lstTexts: Array<{ intLanguageID: number; strStateName: string }>;
  }) {
    return requestApi<StateApiRecord>({
      strPath: MasterApiResource.States,
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.StateCreate
    });
  },

  updateState(intID: number, objBody: {
    intCountryID: number;
    strStateCode: string;
    strStateName: string;
    blnIsActive: boolean;
    intLanguageID: number;
    lstTexts: Array<{ intLanguageID: number; strStateName: string }>;
  }) {
    return requestApi<StateApiRecord>({
      strPath: buildApiPath(MasterApiResource.States, intID),
      strMethod: ApiRequestMethod.Put,
      objBody,
      strMenuAction: MasterMenuAction.StateUpdate
    });
  },

  bulkStateStatus(lstIDs: number[], blnIsActive: boolean) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.States, MasterApiRouteSegment.BulkStatus),
      strMethod: ApiRequestMethod.Post,
      objBody: { lstIDs, blnIsActive },
      strMenuAction: MasterMenuAction.StateBulkStatus
    });
  },

  bulkStateDelete(lstIDs: number[]) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.States, MasterApiRouteSegment.BulkDelete),
      strMethod: ApiRequestMethod.Post,
      objBody: { lstIDs },
      strMenuAction: MasterMenuAction.StateBulkDelete
    });
  },

  getEmployees() {
    return requestApi<EmployeeApiRecord[]>({
      strPath: MasterApiResource.Employee,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.EmployeeList
    });
  },

  getEmployeeFormOptions(intLanguageID?: number | null) {
    const intResolvedLanguageID = intLanguageID ?? authHelpers.getLanguageID();
    return requestApi<EmployeeFormOptionsApiRecord>({
      strPath: buildApiPath(MasterApiResource.Employee, MasterApiRouteSegment.FormOptions),
      strMethod: ApiRequestMethod.Get,
      objQueryParams: intResolvedLanguageID ? { language_id: intResolvedLanguageID } : undefined,
      strMenuAction: MasterMenuAction.EmployeeFormOptions
    });
  },

  getEmployeeById(intID: number) {
    return requestApi<EmployeeDetailApiRecord>({
      strPath: buildApiPath(MasterApiResource.Employee, MasterApiRouteSegment.Detail),
      strMethod: ApiRequestMethod.Post,
      objBody: { intID },
      strMenuAction: MasterMenuAction.EmployeeView
    });
  },

  createEmployee(objBody: EmployeeDetailApiRecord | Record<string, unknown>) {
    return requestApi<EmployeeDetailApiRecord>({
      strPath: MasterApiResource.Employee,
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.EmployeeCreate
    });
  },

  updateEmployee(intID: number, objBody: EmployeeDetailApiRecord | Record<string, unknown>) {
    return requestApi<EmployeeDetailApiRecord>({
      strPath: buildApiPath(MasterApiResource.Employee, intID),
      strMethod: ApiRequestMethod.Put,
      objBody,
      strMenuAction: MasterMenuAction.EmployeeUpdate
    });
  },

  bulkEmployeeStatus(lstIDs: number[], blnIsActive: boolean) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.Employee, MasterApiRouteSegment.BulkStatus),
      strMethod: ApiRequestMethod.Post,
      objBody: { lstIDs, blnIsActive },
      strMenuAction: MasterMenuAction.EmployeeBulkStatus
    });
  },

  bulkEmployeeDelete(lstIDs: number[]) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.Employee, MasterApiRouteSegment.BulkDelete),
      strMethod: ApiRequestMethod.Post,
      objBody: { lstIDs },
      strMenuAction: MasterMenuAction.EmployeeBulkDelete
    });
  },

  getEmployeeAddress(intID: number) {
    return requestApi<EmployeeAddressApiRecord>({
      strPath: buildApiPath(
        MasterApiResource.Employee,
        MasterApiRouteSegment.Address,
        MasterApiRouteSegment.Detail
      ),
      strMethod: ApiRequestMethod.Post,
      objBody: { intID },
      strMenuAction: MasterMenuAction.EmployeeAddressView
    });
  },

  saveEmployeeAddress(intID: number, objBody: Record<string, unknown>) {
    return requestApi<EmployeeAddressApiRecord>({
      strPath: buildApiPath(MasterApiResource.Employee, intID, MasterApiRouteSegment.Address),
      strMethod: ApiRequestMethod.Put,
      objBody,
      strMenuAction: MasterMenuAction.EmployeeAddressSave
    });
  },

  getEmployeeBankAccount(intID: number) {
    return requestApi<EmployeeBankApiRecord>({
      strPath: buildApiPath(
        MasterApiResource.Employee,
        MasterApiRouteSegment.Bank,
        MasterApiRouteSegment.Detail
      ),
      strMethod: ApiRequestMethod.Post,
      objBody: { intID },
      strMenuAction: MasterMenuAction.EmployeeBankView
    });
  },

  saveEmployeeBankAccount(intID: number, objBody: Record<string, unknown>) {
    return requestApi<EmployeeBankApiRecord>({
      strPath: buildApiPath(MasterApiResource.Employee, intID, MasterApiRouteSegment.Bank),
      strMethod: ApiRequestMethod.Put,
      objBody,
      strMenuAction: MasterMenuAction.EmployeeBankSave
    });
  },

  getEmployeeStatutory(intID: number) {
    return requestApi<EmployeeStatutoryApiRecord>({
      strPath: buildApiPath(
        MasterApiResource.Employee,
        MasterApiRouteSegment.Statutory,
        MasterApiRouteSegment.Detail
      ),
      strMethod: ApiRequestMethod.Post,
      objBody: { intID },
      strMenuAction: MasterMenuAction.EmployeeStatutoryView
    });
  },

  saveEmployeeStatutory(intID: number, objBody: Record<string, unknown>) {
    return requestApi<EmployeeStatutoryApiRecord>({
      strPath: buildApiPath(MasterApiResource.Employee, intID, MasterApiRouteSegment.Statutory),
      strMethod: ApiRequestMethod.Put,
      objBody,
      strMenuAction: MasterMenuAction.EmployeeStatutorySave
    });
  },

  getEmployeeExperiences(intID: number) {
    return requestApi<EmployeeExperienceApiRecord[]>({
      strPath: buildApiPath(MasterApiResource.Employee, intID, MasterApiRouteSegment.Experiences),
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.EmployeeExperienceList
    });
  },

  createEmployeeExperience(intID: number, objBody: Record<string, unknown>) {
    return requestApi<EmployeeExperienceApiRecord>({
      strPath: buildApiPath(MasterApiResource.Employee, intID, MasterApiRouteSegment.Experiences),
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.EmployeeExperienceSave
    });
  },

  updateEmployeeExperience(intEmployeeID: number, intExperienceID: number, objBody: Record<string, unknown>) {
    return requestApi<EmployeeExperienceApiRecord>({
      strPath: buildApiPath(
        MasterApiResource.Employee,
        intEmployeeID,
        MasterApiRouteSegment.Experiences,
        intExperienceID
      ),
      strMethod: ApiRequestMethod.Put,
      objBody,
      strMenuAction: MasterMenuAction.EmployeeExperienceSave
    });
  },

  deleteEmployeeExperience(intEmployeeID: number, intExperienceID: number) {
    return requestApi<EmployeeExperienceApiRecord>({
      strPath: buildApiPath(
        MasterApiResource.Employee,
        intEmployeeID,
        MasterApiRouteSegment.Experiences,
        intExperienceID
      ),
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: MasterMenuAction.EmployeeExperienceDelete
    });
  },

  getEmployeeQualifications(intID: number) {
    return requestApi<EmployeeQualificationApiRecord[]>({
      strPath: buildApiPath(MasterApiResource.Employee, intID, MasterApiRouteSegment.Qualifications),
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.EmployeeQualificationList
    });
  },

  createEmployeeQualification(intID: number, objBody: Record<string, unknown>) {
    return requestApi<EmployeeQualificationApiRecord>({
      strPath: buildApiPath(MasterApiResource.Employee, intID, MasterApiRouteSegment.Qualifications),
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.EmployeeQualificationSave
    });
  },

  updateEmployeeQualification(intEmployeeID: number, intQualificationID: number, objBody: Record<string, unknown>) {
    return requestApi<EmployeeQualificationApiRecord>({
      strPath: buildApiPath(
        MasterApiResource.Employee,
        intEmployeeID,
        MasterApiRouteSegment.Qualifications,
        intQualificationID
      ),
      strMethod: ApiRequestMethod.Put,
      objBody,
      strMenuAction: MasterMenuAction.EmployeeQualificationSave
    });
  },

  deleteEmployeeQualification(intEmployeeID: number, intQualificationID: number) {
    return requestApi<EmployeeQualificationApiRecord>({
      strPath: buildApiPath(
        MasterApiResource.Employee,
        intEmployeeID,
        MasterApiRouteSegment.Qualifications,
        intQualificationID
      ),
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: MasterMenuAction.EmployeeQualificationDelete
    });
  },

  getEmployeeFamilyDetails(intID: number) {
    return requestApi<EmployeeFamilyDetailApiRecord[]>({
      strPath: buildApiPath(MasterApiResource.Employee, intID, MasterApiRouteSegment.Family),
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.EmployeeFamilyList
    });
  },

  createEmployeeFamilyDetail(intID: number, objBody: Record<string, unknown>) {
    return requestApi<EmployeeFamilyDetailApiRecord>({
      strPath: buildApiPath(MasterApiResource.Employee, intID, MasterApiRouteSegment.Family),
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.EmployeeFamilySave
    });
  },

  updateEmployeeFamilyDetail(intFamilyID: number, objBody: Record<string, unknown>) {
    return requestApi<EmployeeFamilyDetailApiRecord>({
      strPath: buildApiPath(MasterApiResource.Family, intFamilyID),
      strMethod: ApiRequestMethod.Put,
      objBody,
      strMenuAction: MasterMenuAction.EmployeeFamilySave
    });
  },

  deleteEmployeeFamilyDetail(intFamilyID: number) {
    return requestApi<null>({
      strPath: buildApiPath(MasterApiResource.Family, intFamilyID),
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: MasterMenuAction.EmployeeFamilyDelete
    });
  },
  getSalaryComponents() {
    return requestApi<SalaryComponentApiRecord[]>({
      strPath: MasterApiResource.SalaryComponents,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.SalaryComponentList
    });
  },

  getSalaryComponent(intID: number) {
    return requestApi<SalaryComponentApiRecord>({
      strPath: buildApiPath(MasterApiResource.SalaryComponents, MasterApiRouteSegment.Detail),
      strMethod: ApiRequestMethod.Post,
      objBody: { intID },
      strMenuAction: MasterMenuAction.SalaryComponentGet
    });
  },

  getSalaryComponentFormOptions() {
    return requestApi<SalaryComponentFormOptionsApiRecord>({
      strPath: MasterApiResource.SalaryComponentFormOptions,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.SalaryComponentFormOptions
    });
  },

  createSalaryComponent(objBody: Record<string, unknown>) {
    return requestApi<SalaryComponentApiRecord>({
      strPath: MasterApiResource.SalaryComponents,
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.SalaryComponentCreate
    });
  },

  updateSalaryComponent(intID: number, objBody: Record<string, unknown>) {
    return requestApi<SalaryComponentApiRecord>({
      strPath: buildApiPath(MasterApiResource.SalaryComponents, intID),
      strMethod: ApiRequestMethod.Put,
      objBody,
      strMenuAction: MasterMenuAction.SalaryComponentUpdate
    });
  },

  setSalaryComponentStatus(intID: number, blnIsActive: boolean) {
    return requestApi<SalaryComponentApiRecord>({
      strPath: buildApiPath(MasterApiResource.SalaryComponents, intID, MasterApiRouteSegment.Status),
      strMethod: ApiRequestMethod.Post,
      objBody: { blnIsActive },
      strMenuAction: MasterMenuAction.SalaryComponentStatus
    });
  },

  bulkSalaryComponentStatus(lstIDs: number[], blnIsActive: boolean) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.SalaryComponents, MasterApiRouteSegment.BulkStatus),
      strMethod: ApiRequestMethod.Post,
      objBody: { lstIDs, blnIsActive },
      strMenuAction: MasterMenuAction.SalaryComponentStatus
    });
  },

  deleteSalaryComponent(intID: number) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.SalaryComponents, intID),
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: MasterMenuAction.SalaryComponentDelete
    });
  },

  bulkSalaryComponentDelete(lstIDs: number[]) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.SalaryComponents, MasterApiRouteSegment.BulkDelete),
      strMethod: ApiRequestMethod.Post,
      objBody: { lstIDs },
      strMenuAction: MasterMenuAction.SalaryComponentDelete
    });
  },

  getPayrollCycles() {
    return requestApi<PayrollCycleApiRecord[]>({
      strPath: MasterApiResource.PayrollCycles,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.PayrollCycleList
    });
  },

  getPayrollCycle(intID: number) {
    return requestApi<PayrollCycleApiRecord>({
      strPath: buildApiPath(MasterApiResource.PayrollCycles, MasterApiRouteSegment.Detail),
      strMethod: ApiRequestMethod.Post,
      objBody: { intID },
      strMenuAction: MasterMenuAction.PayrollCycleGet
    });
  },

  getPayrollCycleFormOptions() {
    return requestApi<PayrollCycleFormOptionsApiRecord>({
      strPath: buildApiPath(MasterApiResource.PayrollCycles, MasterApiRouteSegment.FormOptions),
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.PayrollCycleFormOptions
    });
  },

  createPayrollCycle(objBody: Record<string, unknown>) {
    return requestApi<PayrollCycleApiRecord>({
      strPath: MasterApiResource.PayrollCycles,
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.PayrollCycleCreate
    });
  },

  updatePayrollCycle(intID: number, objBody: Record<string, unknown>) {
    return requestApi<PayrollCycleApiRecord>({
      strPath: buildApiPath(MasterApiResource.PayrollCycles, intID),
      strMethod: ApiRequestMethod.Put,
      objBody,
      strMenuAction: MasterMenuAction.PayrollCycleUpdate
    });
  },

  setPayrollCycleStatus(intID: number, blnIsActive: boolean) {
    return requestApi<PayrollCycleApiRecord>({
      strPath: buildApiPath(MasterApiResource.PayrollCycles, intID, MasterApiRouteSegment.Status),
      strMethod: ApiRequestMethod.Post,
      objBody: { blnIsActive },
      strMenuAction: MasterMenuAction.PayrollCycleStatus
    });
  },

  getPayrollProcessLogs(objFilters?: {
    intPayrollRunID?: number | null;
    intEmployeeID?: number | null;
    strProcessStage?: string | null;
    strProcessStatus?: string | null;
    strSearchText?: string | null;
  }) {
    const objParams = new URLSearchParams();
    if (objFilters?.intPayrollRunID) {
      objParams.set("intPayrollRunID", String(objFilters.intPayrollRunID));
    }
    if (objFilters?.intEmployeeID) {
      objParams.set("intEmployeeID", String(objFilters.intEmployeeID));
    }
    if (objFilters?.strProcessStage) {
      objParams.set("strProcessStage", objFilters.strProcessStage);
    }
    if (objFilters?.strProcessStatus) {
      objParams.set("strProcessStatus", objFilters.strProcessStatus);
    }
    if (objFilters?.strSearchText) {
      objParams.set("strSearchText", objFilters.strSearchText);
    }
    return requestApi<PayrollProcessLogApiRecord[]>({
      strPath: buildApiQueryPath(MasterApiResource.PayrollProcessLogs, objParams),
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.PayrollProcessLogList
    });
  },

  getPayrollProcessLogFormOptions() {
    return requestApi<PayrollProcessLogFormOptionsApiRecord>({
      strPath: buildApiPath(MasterApiResource.PayrollProcessLogs, MasterApiRouteSegment.FormOptions),
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.PayrollProcessLogFormOptions
    });
  },

  getVersionLogs(objFilters?: {
    strSearchName?: string | null;
    strSearchCode?: string | null;
    strStatus?: string | null;
  }) {
    const objParams = new URLSearchParams();
    if (objFilters?.strSearchName) {
      objParams.set("strSearchName", objFilters.strSearchName);
    }
    if (objFilters?.strSearchCode) {
      objParams.set("strSearchCode", objFilters.strSearchCode);
    }
    if (objFilters?.strStatus) {
      objParams.set("strStatus", objFilters.strStatus);
    }
    return requestApi<VersionLogApiRecord[]>({
      strPath: buildApiQueryPath(MasterApiResource.VersionLogs, objParams),
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.VersionLogList
    });
  },

  getVersionLog(intID: number) {
    return requestApi<VersionLogApiRecord>({
      strPath: buildApiPath(MasterApiResource.VersionLogs, MasterApiRouteSegment.Detail),
      strMethod: ApiRequestMethod.Post,
      objBody: { intID },
      strMenuAction: MasterMenuAction.VersionLogGet
    });
  },

  createVersionLog(objBody: {
    strVersionCode: string;
    strVersionName: string;
    dtReleaseDate: string | null;
    strReleaseNotes: string | null;
    blnIsActive: boolean;
  }) {
    return requestApi<VersionLogApiRecord>({
      strPath: MasterApiResource.VersionLogs,
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.VersionLogCreate
    });
  },

  updateVersionLog(intID: number, objBody: {
    strVersionCode: string;
    strVersionName: string;
    dtReleaseDate: string | null;
    strReleaseNotes: string | null;
    blnIsActive: boolean;
  }) {
    return requestApi<VersionLogApiRecord>({
      strPath: buildApiPath(MasterApiResource.VersionLogs, intID),
      strMethod: ApiRequestMethod.Put,
      objBody,
      strMenuAction: MasterMenuAction.VersionLogUpdate
    });
  },

  setVersionLogStatus(intID: number, blnIsActive: boolean) {
    return requestApi<VersionLogApiRecord>({
      strPath: buildApiPath(MasterApiResource.VersionLogs, intID, MasterApiRouteSegment.Status),
      strMethod: ApiRequestMethod.Post,
      objBody: { blnIsActive },
      strMenuAction: MasterMenuAction.VersionLogStatus
    });
  },

  getTaxRegimes() {
    return requestApi<TaxRegimeApiRecord[]>({
      strPath: MasterApiResource.TaxRegimes,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.TaxRegimeList
    });
  },

  getTaxRegime(intID: number) {
    return requestApi<TaxRegimeApiRecord>({
      strPath: buildApiPath(MasterApiResource.TaxRegimes, MasterApiRouteSegment.Detail),
      strMethod: ApiRequestMethod.Post,
      objBody: { intID },
      strMenuAction: MasterMenuAction.TaxRegimeGet
    });
  },

  getTaxRegimeFormOptions() {
    return requestApi<TaxRegimeFormOptionsApiRecord>({
      strPath: buildApiPath(MasterApiResource.TaxRegimes, MasterApiRouteSegment.FormOptions),
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.TaxRegimeFormOptions
    });
  },

  createTaxRegime(objBody: Record<string, unknown>) {
    return requestApi<TaxRegimeApiRecord>({
      strPath: MasterApiResource.TaxRegimes,
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.TaxRegimeCreate
    });
  },

  updateTaxRegime(intID: number, objBody: Record<string, unknown>) {
    return requestApi<TaxRegimeApiRecord>({
      strPath: buildApiPath(MasterApiResource.TaxRegimes, intID),
      strMethod: ApiRequestMethod.Put,
      objBody,
      strMenuAction: MasterMenuAction.TaxRegimeUpdate
    });
  },

  setTaxRegimeStatus(intID: number, blnIsActive: boolean) {
    return requestApi<TaxRegimeApiRecord>({
      strPath: buildApiPath(MasterApiResource.TaxRegimes, intID, MasterApiRouteSegment.Status),
      strMethod: ApiRequestMethod.Post,
      objBody: { blnIsActive },
      strMenuAction: MasterMenuAction.TaxRegimeStatus
    });
  },

  getTaxSlabs(intTaxRegimeID: number) {
    return requestApi<TaxSlabSetApiRecord>({
      strPath: buildApiPath(
        MasterApiResource.TaxRegimes,
        MasterApiRouteSegment.Slabs,
        MasterApiRouteSegment.Detail
      ),
      strMethod: ApiRequestMethod.Post,
      objBody: { intID: intTaxRegimeID },
      strMenuAction: MasterMenuAction.TaxSlabList
    });
  },

  saveTaxSlabs(intTaxRegimeID: number, objBody: Record<string, unknown>) {
    return requestApi<TaxSlabSetApiRecord>({
      strPath: buildApiPath(MasterApiResource.TaxRegimes, intTaxRegimeID, MasterApiRouteSegment.Slabs),
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.TaxSlabSave
    });
  },

  getSalaryStructures() {
    return requestApi<SalaryStructureApiRecord[]>({
      strPath: MasterApiResource.SalaryStructures,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.SalaryStructureList
    });
  },

  getSalaryStructure(intID: number) {
    return requestApi<SalaryStructureApiRecord>({
      strPath: buildApiPath(MasterApiResource.SalaryStructures, MasterApiRouteSegment.Detail),
      strMethod: ApiRequestMethod.Post,
      objBody: { intID },
      strMenuAction: MasterMenuAction.SalaryStructureGet
    });
  },

  getSalaryStructureFormOptions(intLanguageID?: number | null) {
    return requestApi<SalaryStructureFormOptionsApiRecord>({
      strPath: buildApiPath(MasterApiResource.SalaryStructures, MasterApiRouteSegment.FormOptions),
      strMethod: ApiRequestMethod.Get,
      objQueryParams: intLanguageID ? { language_id: intLanguageID } : undefined,
      strMenuAction: MasterMenuAction.SalaryStructureFormOptions
    });
  },

  createSalaryStructure(objBody: Record<string, unknown>) {
    return requestApi<SalaryStructureApiRecord>({
      strPath: MasterApiResource.SalaryStructures,
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.SalaryStructureCreate
    });
  },

  updateSalaryStructure(intID: number, objBody: Record<string, unknown>) {
    return requestApi<SalaryStructureApiRecord>({
      strPath: buildApiPath(MasterApiResource.SalaryStructures, intID),
      strMethod: ApiRequestMethod.Put,
      objBody,
      strMenuAction: MasterMenuAction.SalaryStructureUpdate
    });
  },

  cloneSalaryStructure(intID: number, objBody: Record<string, unknown>) {
    return requestApi<SalaryStructureApiRecord>({
      strPath: buildApiPath(MasterApiResource.SalaryStructures, intID, MasterApiRouteSegment.Clone),
      strMethod: ApiRequestMethod.Post,
      objBody,
      strMenuAction: MasterMenuAction.SalaryStructureClone
    });
  },

  setSalaryStructureStatus(intID: number, blnIsActive: boolean) {
    return requestApi<SalaryStructureApiRecord>({
      strPath: buildApiPath(MasterApiResource.SalaryStructures, intID, MasterApiRouteSegment.Status),
      strMethod: ApiRequestMethod.Post,
      objBody: { blnIsActive },
      strMenuAction: MasterMenuAction.SalaryStructureStatus
    });
  },

  deleteSalaryStructure(intID: number) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: buildApiPath(MasterApiResource.SalaryStructures, intID),
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: MasterMenuAction.SalaryStructureDelete
    });
  },

  getEmployeeSalaries() {
    return requestApi<EmployeeSalaryListApiRecord[]>({
      strPath: MasterApiResource.EmployeeSalary,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.EmployeeSalaryList
    });
  },

  getEmployeeSalaryFormOptions() {
    return requestApi<EmployeeSalaryFormOptionsApiRecord>({
      strPath: buildApiPath(MasterApiResource.EmployeeSalary, MasterApiRouteSegment.FormOptions),
      strMethod: ApiRequestMethod.Get,
      strMenuAction: MasterMenuAction.EmployeeSalaryFormOptions
    });
  },

  getEmployeeSalaryDetail(intEmployeeID: number) {
    return requestApi<EmployeeSalaryDetailApiRecord>({
      strPath: buildApiPath(MasterApiResource.EmployeeSalary, MasterApiRouteSegment.Detail),
      strMethod: ApiRequestMethod.Post,
      objBody: { intID: intEmployeeID },
      strMenuAction: MasterMenuAction.EmployeeSalaryView
    });
  },

  getEmployeeSalarySummary(intEmployeeID: number) {
    return requestApi<EmployeeSalarySummaryApiRecord>({
      strPath: buildApiPath(
        MasterApiResource.EmployeeSalary,
        MasterApiRouteSegment.Summary,
        MasterApiRouteSegment.Detail
      ),
      strMethod: ApiRequestMethod.Post,
      objBody: { intID: intEmployeeID },
      strMenuAction: MasterMenuAction.EmployeeSalarySummary
    });
  },

    createEmployeeSalaryRevision(intEmployeeID: number, objBody: Record<string, unknown>) {
      return requestApi<EmployeeSalaryDetailApiRecord>({
        strPath: buildApiPath(MasterApiResource.EmployeeSalary, intEmployeeID, MasterApiRouteSegment.Revisions),
        strMethod: ApiRequestMethod.Post,
        objBody,
        strMenuAction: MasterMenuAction.EmployeeSalarySave
      });
    },

    unassignEmployeeSalary(intEmployeeID: number) {
      return requestApi<EmployeeSalaryDetailApiRecord>({
        strPath: buildApiPath(MasterApiResource.EmployeeSalary, intEmployeeID, MasterApiRouteSegment.Unassign),
        strMethod: ApiRequestMethod.Post,
        strMenuAction: MasterMenuAction.EmployeeSalarySave
      });
    }
  };
