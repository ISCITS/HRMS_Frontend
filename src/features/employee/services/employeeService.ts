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
  EmployeeFormOptions,
  EmployeeFormValues,
  EmployeeListRecord,
  EmployeeQualificationFormValues,
  EmployeeQualificationRecord,
  EmployeeStatutoryFormValues,
  EmployeeStatutoryRecord
} from "@/features/employee/types";
import { masterApiService, type EmployeeDetailApiRecord } from "@/services/master/MasterApiService";
import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { createApiRequestError, requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import { authHelpers } from "@/lib/auth";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";
import type { FileMetadataDto, ListFilesFilter, UploadFileRequest } from "@/lib/fileUploadService";
import { openBlobUrlInNewTab } from "@/lib/openBlobUrlInNewTab";

type EmployeeServiceRequestOptions = {
  strMenuAction?: string;
};

function normalizeOptionalNumber(intValue: number | ""): number | null {
  return intValue === "" ? null : intValue;
}

function mapEmployeePayload(dicValues: EmployeeFormValues): Record<string, unknown> {
  return {
    strEmployeeCode: dicValues.strEmployeeCode.trim().toUpperCase(),
    strTitle: dicValues.strTitle || null,
    strFirstName: dicValues.strFirstName.trim(),
    strMiddleName: dicValues.strMiddleName.trim() || null,
    blnIsWorker: dicValues.blnIsWorker,
    strLastName: dicValues.strLastName.trim() || null,
    dtDateOfBirth: dicValues.dtDateOfBirth || null,
    dtDateOfJoining: dicValues.dtDateOfJoining,
    intEmploymentTypeID: dicValues.intEmploymentTypeID,
    intDepartmentID: normalizeOptionalNumber(dicValues.intDepartmentID),
    intDesignationID: normalizeOptionalNumber(dicValues.intDesignationID),
    intGradeID: normalizeOptionalNumber(dicValues.intGradeID),
    intCostCenterID: normalizeOptionalNumber(dicValues.intCostCenterID),
    intLocationID: dicValues.intLocationID,
    intPayrollGroupID: normalizeOptionalNumber(dicValues.intPayrollGroupID),
    intManagerEmployeeID: normalizeOptionalNumber(dicValues.intManagerEmployeeID),
    intLineManagerEmployeeID: normalizeOptionalNumber(dicValues.intLineManagerEmployeeID || dicValues.intManagerEmployeeID),
    strWorkEmail: dicValues.strWorkEmail.trim() || null,
    strPersonalEmail: dicValues.strPersonalEmail.trim() || null,
    strMobileNumber: dicValues.strMobileNumber.trim() || null,
    strGender: dicValues.strGender || null,
    intPreferredLanguageID: normalizeOptionalNumber(dicValues.intPreferredLanguageID),
    strEmploymentStatus: dicValues.strEmploymentStatus,
    dtDateOfExit: dicValues.dtDateOfExit || null,
    blnIsEssEnabled: dicValues.blnIsEssEnabled,
    blnIsPartialSave: dicValues.blnIsPartialSave
  };
}

function mapEmployeeDetailRecord(dicRecord: EmployeeDetailApiRecord): EmployeeDetailRecord {
  return {
    intID: dicRecord.intID,
    strEmployeeCode: dicRecord.strEmployeeCode,
    strTitle: dicRecord.strTitle,
    strFirstName: dicRecord.strFirstName,
    strMiddleName: dicRecord.strMiddleName,
    blnIsWorker: dicRecord.blnIsWorker,
    strLastName: dicRecord.strLastName,
    strFullName: dicRecord.strFullName,
    dtDateOfBirth: dicRecord.dtDateOfBirth,
    dtDateOfJoining: dicRecord.dtDateOfJoining,
    intEmploymentTypeID: dicRecord.intEmploymentTypeID,
    intDepartmentID: dicRecord.intDepartmentID,
    intDesignationID: dicRecord.intDesignationID,
    intGradeID: dicRecord.intGradeID,
    intCostCenterID: dicRecord.intCostCenterID,
    intLocationID: dicRecord.intLocationID,
    intPayrollGroupID: dicRecord.intPayrollGroupID,
    intManagerEmployeeID: dicRecord.intManagerEmployeeID,
    intLineManagerEmployeeID: dicRecord.intLineManagerEmployeeID ?? null,
    strWorkEmail: dicRecord.strWorkEmail,
    strPersonalEmail: dicRecord.strPersonalEmail,
    strMobileNumber: dicRecord.strMobileNumber,
    strGender: dicRecord.strGender,
    intPreferredLanguageID: dicRecord.intPreferredLanguageID,
    strEmploymentStatus: dicRecord.strEmploymentStatus,
    dtDateOfExit: dicRecord.dtDateOfExit,
    blnIsEssEnabled: dicRecord.blnIsEssEnabled,
    blnIsPartialSave: dicRecord.blnIsPartialSave,
    strProfilePhotoUrl: dicRecord.strProfilePhotoUrl ?? null
  };
}

export const employeeService = {
  // Employee Master -> Create User Account. Server derives the identity from the employee record and
  // links the two in one transaction.
  async createUserAccount(intEmployeeID: number, intEssUserGroupID?: number | null) {
    const objResult = await masterApiService.createEmployeeUserAccount(intEmployeeID, { intEssUserGroupID });
    return objResult.Data;
  },

  async getEmployees(): Promise<EmployeeListRecord[]> {
    const objResult = await masterApiService.getEmployees();
    return objResult.Data;
  },

  async uploadEmployeeAvatar(intEmployeeID: number, objFile: File): Promise<{
    intEmployeeID: number;
    strEmployeeCode?: string | null;
    strFullName?: string | null;
    strProfilePhotoUrl?: string | null;
  }> {
    const strAccessToken = authHelpers.getAccessToken().trim();
    const intTenantID = authHelpers.getTenantID();
    const intCompanyID = authHelpers.getCompanyID();
    const objFormData = new FormData();
    objFormData.append("objFile", objFile);
    const objHeaders: Record<string, string> = {};

    if (strAccessToken) {
      objHeaders.Authorization = `Bearer ${strAccessToken}`;
      objHeaders["X-Access-Token"] = strAccessToken;
    }
    if (intTenantID) {
      objHeaders["X-Tenant-Id"] = String(intTenantID);
    }
    if (intCompanyID) {
      objHeaders["X-Company-Id"] = String(intCompanyID);
    }

    const objResponse = await fetch(`/api/employees/avatar/${intEmployeeID}`, {
      method: "PUT",
      headers: Object.keys(objHeaders).length ? objHeaders : undefined,
      body: objFormData,
      credentials: "include",
    });
    const objResult = await objResponse.json();
    if (!objResponse.ok || objResult?.ResultCode === 0) {
      throw new Error(objResult?.Msg || "Unable to upload profile photo.");
    }
    return objResult.Data;
  },

  async getEmployeeById(intEmployeeID: number, objOptions?: EmployeeServiceRequestOptions): Promise<EmployeeDetailRecord> {
    const objResult = await masterApiService.getEmployeeById(intEmployeeID, objOptions?.strMenuAction);
    return mapEmployeeDetailRecord(objResult.Data);
  },

  async getFormOptions(objOptions?: EmployeeServiceRequestOptions): Promise<EmployeeFormOptions> {
    const objResult = await masterApiService.getEmployeeFormOptions(undefined, objOptions?.strMenuAction);
    return objResult.Data;
  },

  async createEmployee(dicValues: EmployeeFormValues): Promise<EmployeeDetailRecord> {
    const objResult = await masterApiService.createEmployee(mapEmployeePayload(dicValues));
    return mapEmployeeDetailRecord(objResult.Data);
  },

  async updateEmployee(intEmployeeID: number, dicValues: EmployeeFormValues, objOptions?: EmployeeServiceRequestOptions): Promise<EmployeeDetailRecord> {
    const objResult = await masterApiService.updateEmployee(intEmployeeID, mapEmployeePayload(dicValues), objOptions?.strMenuAction);
    return mapEmployeeDetailRecord(objResult.Data);
  },

  bulkUpdateStatus(lstIDs: number[], blnIsActive: boolean) {
    return masterApiService.bulkEmployeeStatus(lstIDs, blnIsActive);
  },

  bulkDelete(lstIDs: number[]) {
    return masterApiService.bulkEmployeeDelete(lstIDs);
  },

  async getEmployeeAddress(intEmployeeID: number, objOptions?: EmployeeServiceRequestOptions): Promise<EmployeeAddressRecord> {
    const objResult = await masterApiService.getEmployeeAddress(intEmployeeID, objOptions?.strMenuAction);
    return objResult.Data;
  },

  async saveEmployeeAddress(intEmployeeID: number, dicValues: EmployeeAddressFormValues, objOptions?: EmployeeServiceRequestOptions): Promise<EmployeeAddressRecord> {
    const objResult = await masterApiService.saveEmployeeAddress(intEmployeeID, {
      strAddressType: dicValues.strAddressType,
      strAddressLine1: dicValues.strAddressLine1.trim(),
      strAddressLine2: dicValues.strAddressLine2.trim() || null,
      strCityName: dicValues.strCityName.trim() || null,
      intStateID: normalizeOptionalNumber(dicValues.intStateID),
      strPostalCode: dicValues.strPostalCode.trim() || null,
      intCountryID: dicValues.intCountryID
    }, objOptions?.strMenuAction);
    return objResult.Data;
  },

  async getEmployeeBankAccount(intEmployeeID: number, objOptions?: EmployeeServiceRequestOptions): Promise<EmployeeBankRecord> {
    const objResult = await masterApiService.getEmployeeBankAccount(intEmployeeID, objOptions?.strMenuAction);
    return objResult.Data;
  },

  async saveEmployeeBankAccount(intEmployeeID: number, dicValues: EmployeeBankFormValues, objOptions?: EmployeeServiceRequestOptions): Promise<EmployeeBankRecord> {
    const objResult = await masterApiService.saveEmployeeBankAccount(intEmployeeID, {
      intBankID: dicValues.intBankID,
      strAccountHolderName: dicValues.strAccountHolderName.trim(),
      strAccountNumber: dicValues.strAccountNumber.trim(),
      strIfscCode: dicValues.strIfscCode.trim() || null,
      intSecondaryBankID: dicValues.blnSecondaryIsActive ? dicValues.intSecondaryBankID || null : null,
      strSecondaryAccountHolderName: dicValues.blnSecondaryIsActive ? dicValues.strSecondaryAccountHolderName.trim() || null : null,
      strSecondaryAccountNumber: dicValues.blnSecondaryIsActive ? dicValues.strSecondaryAccountNumber.trim() || null : null,
      strSecondaryIfscCode: dicValues.blnSecondaryIsActive ? dicValues.strSecondaryIfscCode.trim() || null : null,
      blnSecondaryIsActive: dicValues.blnSecondaryIsActive,
      blnIsPrimary: dicValues.blnIsPrimary,
      blnIsActive: dicValues.blnIsActive
    }, objOptions?.strMenuAction);
    return objResult.Data;
  },

  async getEmployeeStatutory(intEmployeeID: number, objOptions?: EmployeeServiceRequestOptions): Promise<EmployeeStatutoryRecord> {
    const objResult = await masterApiService.getEmployeeStatutory(intEmployeeID, objOptions?.strMenuAction);
    return objResult.Data;
  },

  async saveEmployeeStatutory(intEmployeeID: number, dicValues: EmployeeStatutoryFormValues, objOptions?: EmployeeServiceRequestOptions): Promise<EmployeeStatutoryRecord> {
    const objResult = await masterApiService.saveEmployeeStatutory(intEmployeeID, {
      strPanNumber: dicValues.strPanNumber.trim() || null,
      strUanNumber: dicValues.strUanNumber.trim() || null,
      strEsiNumber: dicValues.blnEsiApplicable ? dicValues.strEsiNumber.trim() || null : null,
      strPfNumber: dicValues.blnPfApplicable ? dicValues.strPfNumber.trim() || null : null,
      strTaxRegimeCode: dicValues.strTaxRegimeCode.trim() || null,
      blnPfApplicable: dicValues.blnPfApplicable,
      blnEsiApplicable: dicValues.blnEsiApplicable,
      blnPtApplicable: dicValues.blnPtApplicable
    }, objOptions?.strMenuAction);
    return objResult.Data;
  },

  async getEmployeeExperiences(intEmployeeID: number, objOptions?: EmployeeServiceRequestOptions): Promise<EmployeeExperienceRecord[]> {
    const objResult = await masterApiService.getEmployeeExperiences(intEmployeeID, objOptions?.strMenuAction);
    return objResult.Data;
  },

  async createEmployeeExperience(intEmployeeID: number, dicValues: EmployeeExperienceFormValues, objOptions?: EmployeeServiceRequestOptions): Promise<EmployeeExperienceRecord> {
    const objResult = await masterApiService.createEmployeeExperience(intEmployeeID, {
      strCompanyName: dicValues.strCompanyName.trim(),
      strJobTitle: dicValues.strJobTitle.trim(),
      dtFromDate: dicValues.dtFromDate,
      dtToDate: dicValues.dtToDate || null,
      decTotalYears: dicValues.decTotalYears.trim() ? Number(dicValues.decTotalYears) : null,
      strResponsibilities: dicValues.strResponsibilities.trim() || null,
      decLastDrawnSalary: dicValues.decLastDrawnSalary.trim() ? Number(dicValues.decLastDrawnSalary) : null,
      strReasonForLeaving: dicValues.strReasonForLeaving.trim() || null,
      blnIsActive: dicValues.blnIsActive
    }, objOptions?.strMenuAction);
    return objResult.Data;
  },

  async updateEmployeeExperience(intEmployeeID: number, intExperienceID: number, dicValues: EmployeeExperienceFormValues, objOptions?: EmployeeServiceRequestOptions): Promise<EmployeeExperienceRecord> {
    const objResult = await masterApiService.updateEmployeeExperience(intEmployeeID, intExperienceID, {
      strCompanyName: dicValues.strCompanyName.trim(),
      strJobTitle: dicValues.strJobTitle.trim(),
      dtFromDate: dicValues.dtFromDate,
      dtToDate: dicValues.dtToDate || null,
      decTotalYears: dicValues.decTotalYears.trim() ? Number(dicValues.decTotalYears) : null,
      strResponsibilities: dicValues.strResponsibilities.trim() || null,
      decLastDrawnSalary: dicValues.decLastDrawnSalary.trim() ? Number(dicValues.decLastDrawnSalary) : null,
      strReasonForLeaving: dicValues.strReasonForLeaving.trim() || null,
      blnIsActive: dicValues.blnIsActive
    }, objOptions?.strMenuAction);
    return objResult.Data;
  },

  async deleteEmployeeExperience(intEmployeeID: number, intExperienceID: number): Promise<EmployeeExperienceRecord> {
    const objResult = await masterApiService.deleteEmployeeExperience(intEmployeeID, intExperienceID);
    return objResult.Data;
  },

  async getEmployeeQualifications(intEmployeeID: number, objOptions?: EmployeeServiceRequestOptions): Promise<EmployeeQualificationRecord[]> {
    const objResult = await masterApiService.getEmployeeQualifications(intEmployeeID, objOptions?.strMenuAction);
    return objResult.Data;
  },

  async createEmployeeQualification(intEmployeeID: number, dicValues: EmployeeQualificationFormValues, objOptions?: EmployeeServiceRequestOptions): Promise<EmployeeQualificationRecord> {
    const objResult = await masterApiService.createEmployeeQualification(intEmployeeID, {
      strDegreeName: dicValues.strDegreeName.trim(),
      strSpecialization: dicValues.strSpecialization.trim() || null,
      strInstitutionName: dicValues.strInstitutionName.trim(),
      strUniversityName: dicValues.strUniversityName.trim() || null,
      intYearOfPassing: Number(dicValues.intYearOfPassing),
      strGradeOrPercentage: dicValues.strGradeOrPercentage.trim() || null,
      strCertificationNumber: dicValues.strCertificationNumber.trim() || null,
      blnIsHighestQualification: dicValues.blnIsHighestQualification,
      blnIsActive: dicValues.blnIsActive
    }, objOptions?.strMenuAction);
    return objResult.Data;
  },

  async updateEmployeeQualification(intEmployeeID: number, intQualificationID: number, dicValues: EmployeeQualificationFormValues, objOptions?: EmployeeServiceRequestOptions): Promise<EmployeeQualificationRecord> {
    const objResult = await masterApiService.updateEmployeeQualification(intEmployeeID, intQualificationID, {
      strDegreeName: dicValues.strDegreeName.trim(),
      strSpecialization: dicValues.strSpecialization.trim() || null,
      strInstitutionName: dicValues.strInstitutionName.trim(),
      strUniversityName: dicValues.strUniversityName.trim() || null,
      intYearOfPassing: Number(dicValues.intYearOfPassing),
      strGradeOrPercentage: dicValues.strGradeOrPercentage.trim() || null,
      strCertificationNumber: dicValues.strCertificationNumber.trim() || null,
      blnIsHighestQualification: dicValues.blnIsHighestQualification,
      blnIsActive: dicValues.blnIsActive
    }, objOptions?.strMenuAction);
    return objResult.Data;
  },

  async deleteEmployeeQualification(intEmployeeID: number, intQualificationID: number): Promise<EmployeeQualificationRecord> {
    const objResult = await masterApiService.deleteEmployeeQualification(intEmployeeID, intQualificationID);
    return objResult.Data;
  },

  async getEmployeeFamilyDetails(intEmployeeID: number, objOptions?: EmployeeServiceRequestOptions): Promise<EmployeeFamilyDetailRecord[]> {
    const objResult = await masterApiService.getEmployeeFamilyDetails(intEmployeeID, objOptions?.strMenuAction);
    return objResult.Data;
  },

  async createEmployeeFamilyDetail(intEmployeeID: number, dicValues: EmployeeFamilyDetailFormValues, objOptions?: EmployeeServiceRequestOptions): Promise<EmployeeFamilyDetailRecord> {
    const objResult = await masterApiService.createEmployeeFamilyDetail(intEmployeeID, {
      strName: dicValues.strName.trim(),
      strRelationship: dicValues.strRelationship || null,
      dtDateOfBirth: dicValues.dtDateOfBirth || null,
      strGender: dicValues.strGender || null,
      strContactNumber: dicValues.strContactNumber.trim() || null,
      strOccupation: dicValues.strOccupation.trim() || null,
      blnIsDependent: dicValues.blnIsDependent,
      blnIsNominee: dicValues.blnIsNominee,
      decNomineePercentage: dicValues.blnIsNominee && dicValues.decNomineePercentage.trim() ? Number(dicValues.decNomineePercentage) : null,
      strAddress: dicValues.strAddress.trim() || null
    }, objOptions?.strMenuAction);
    return objResult.Data;
  },

  async updateEmployeeFamilyDetail(intFamilyID: number, dicValues: EmployeeFamilyDetailFormValues, objOptions?: EmployeeServiceRequestOptions): Promise<EmployeeFamilyDetailRecord> {
    const objResult = await masterApiService.updateEmployeeFamilyDetail(intFamilyID, {
      strName: dicValues.strName.trim(),
      strRelationship: dicValues.strRelationship || null,
      dtDateOfBirth: dicValues.dtDateOfBirth || null,
      strGender: dicValues.strGender || null,
      strContactNumber: dicValues.strContactNumber.trim() || null,
      strOccupation: dicValues.strOccupation.trim() || null,
      blnIsDependent: dicValues.blnIsDependent,
      blnIsNominee: dicValues.blnIsNominee,
      decNomineePercentage: dicValues.blnIsNominee && dicValues.decNomineePercentage.trim() ? Number(dicValues.decNomineePercentage) : null,
      strAddress: dicValues.strAddress.trim() || null
    }, objOptions?.strMenuAction);
    return objResult.Data;
  },

  deleteEmployeeFamilyDetail(intFamilyID: number) {
    return masterApiService.deleteEmployeeFamilyDetail(intFamilyID);
  }
};

// HR-authorized equivalent of fileUploadService.ts's generic /api/v1/files/* self-service API —
// used by FileUploadPanel (via its objFileService override) when HR manages bank proof documents
// on an employee's record, since the self-service endpoints derive the employee strictly from the
// caller's own session and would silently target the wrong person.
// NOTE: return type inferred — the former FileUploadPanelService type was removed when FileUploadPanel
// dropped its service-override prop; this helper is currently unused but kept for a future re-wire.
export function createHrBankFileService(intEmployeeID: number) {
  const strBase = `${ApiRoutePrefix.ApiV1}/master/employee/${intEmployeeID}/bank/files`;

  return {
    async listFiles(_objFilter?: ListFilesFilter): Promise<FileMetadataDto[]> {
      const objResult = await requestEncryptedApi<FileMetadataDto[]>({
        strPath: strBase,
        strMethod: ApiRequestMethod.Get,
        strMenuAction: "EmployeeBankView",
        blnUseAuthHeader: true,
      });
      return objResult.Data ?? [];
    },

    async uploadFile(objRequest: UploadFileRequest): Promise<FileMetadataDto> {
      const objFormData = new FormData();
      objFormData.append("objFile", objRequest.objFile);
      try {
        const objResponse = await axiosInstance.request<{ Data: FileMetadataDto }>({
          method: ApiRequestMethod.Post,
          url: strBase,
          data: objFormData,
          csrfMenuAction: "EmployeeBankSave",
          onUploadProgress: objRequest.fnOnProgress
            ? (objProgressEvent) => {
                if (objProgressEvent.total) {
                  objRequest.fnOnProgress?.(Math.min(100, Math.round((objProgressEvent.loaded * 100) / objProgressEvent.total)));
                }
              }
            : undefined,
        } as ApiRequestConfig);
        return objResponse.data.Data;
      } catch (objError) {
        throw await createApiRequestError(objError);
      }
    },

    async replaceFile(intFileID: number, objFile: File, fnOnProgress?: (intPercentComplete: number) => void): Promise<FileMetadataDto> {
      const objFormData = new FormData();
      objFormData.append("objFile", objFile);
      try {
        const objResponse = await axiosInstance.request<{ Data: FileMetadataDto }>({
          method: ApiRequestMethod.Put,
          url: `${strBase}/${intFileID}`,
          data: objFormData,
          csrfMenuAction: "EmployeeBankSave",
          onUploadProgress: fnOnProgress
            ? (objProgressEvent) => {
                if (objProgressEvent.total) {
                  fnOnProgress(Math.min(100, Math.round((objProgressEvent.loaded * 100) / objProgressEvent.total)));
                }
              }
            : undefined,
        } as ApiRequestConfig);
        return objResponse.data.Data;
      } catch (objError) {
        throw await createApiRequestError(objError);
      }
    },

    async deleteFile(intFileID: number): Promise<void> {
      await requestEncryptedApi<null>({
        strPath: `${strBase}/${intFileID}`,
        strMethod: ApiRequestMethod.Delete,
        strMenuAction: "EmployeeBankSave",
        blnUseAuthHeader: true,
      });
    },

    async previewFile(intFileID: number): Promise<void> {
      try {
        const objResponse = await axiosInstance.request<Blob>({
          method: ApiRequestMethod.Get,
          url: `${strBase}/${intFileID}/content`,
          responseType: "blob",
          csrfMenuAction: "EmployeeBankView",
        } as ApiRequestConfig);
        const strUrl = URL.createObjectURL(objResponse.data);
        openBlobUrlInNewTab(strUrl);
        window.setTimeout(() => URL.revokeObjectURL(strUrl), 30000);
      } catch (objError) {
        throw await createApiRequestError(objError);
      }
    },
  };
}

