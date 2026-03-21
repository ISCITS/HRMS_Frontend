import type {
  EmployeeAddressFormValues,
  EmployeeAddressRecord,
  EmployeeBankFormValues,
  EmployeeBankRecord,
  EmployeeDetailRecord,
  EmployeeFormOptions,
  EmployeeFormValues,
  EmployeeListRecord,
  EmployeeStatutoryFormValues,
  EmployeeStatutoryRecord
} from "@/features/employee/types";
import { masterApiService } from "@/services/master/MasterApiService";

function normalizeOptionalNumber(intValue: number | ""): number | null {
  return intValue === "" ? null : intValue;
}

function mapEmployeePayload(dicValues: EmployeeFormValues): Record<string, unknown> {
  return {
    strEmployeeCode: dicValues.strEmployeeCode.trim().toUpperCase(),
    strTitle: dicValues.strTitle || null,
    strFirstName: dicValues.strFirstName.trim(),
    strMiddleName: dicValues.strMiddleName.trim() || null,
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
    strWorkEmail: dicValues.strWorkEmail.trim() || null,
    strPersonalEmail: dicValues.strPersonalEmail.trim() || null,
    strMobileNumber: dicValues.strMobileNumber.trim() || null,
    strGender: dicValues.strGender || null,
    intPreferredLanguageID: normalizeOptionalNumber(dicValues.intPreferredLanguageID),
    strEmploymentStatus: dicValues.strEmploymentStatus,
    dtDateOfExit: dicValues.dtDateOfExit || null,
    blnIsEssEnabled: dicValues.blnIsEssEnabled
  };
}

export const employeeService = {
  async getEmployees(): Promise<EmployeeListRecord[]> {
    const objResult = await masterApiService.getEmployees();
    return objResult.Data;
  },

  async getEmployeeById(intEmployeeID: number): Promise<EmployeeDetailRecord> {
    const objResult = await masterApiService.getEmployeeById(intEmployeeID);
    return objResult.Data;
  },

  async getFormOptions(): Promise<EmployeeFormOptions> {
    const objResult = await masterApiService.getEmployeeFormOptions();
    return objResult.Data;
  },

  async createEmployee(dicValues: EmployeeFormValues): Promise<EmployeeDetailRecord> {
    const objResult = await masterApiService.createEmployee(mapEmployeePayload(dicValues));
    return objResult.Data;
  },

  async updateEmployee(intEmployeeID: number, dicValues: EmployeeFormValues): Promise<EmployeeDetailRecord> {
    const objResult = await masterApiService.updateEmployee(intEmployeeID, mapEmployeePayload(dicValues));
    return objResult.Data;
  },

  bulkUpdateStatus(lstIDs: number[], blnIsActive: boolean) {
    return masterApiService.bulkEmployeeStatus(lstIDs, blnIsActive);
  },

  bulkDelete(lstIDs: number[]) {
    return masterApiService.bulkEmployeeDelete(lstIDs);
  },

  async getEmployeeAddress(intEmployeeID: number): Promise<EmployeeAddressRecord> {
    const objResult = await masterApiService.getEmployeeAddress(intEmployeeID);
    return objResult.Data;
  },

  async saveEmployeeAddress(intEmployeeID: number, dicValues: EmployeeAddressFormValues): Promise<EmployeeAddressRecord> {
    const objResult = await masterApiService.saveEmployeeAddress(intEmployeeID, {
      strAddressType: dicValues.strAddressType,
      strAddressLine1: dicValues.strAddressLine1.trim(),
      strAddressLine2: dicValues.strAddressLine2.trim() || null,
      strCityName: dicValues.strCityName.trim() || null,
      intStateID: normalizeOptionalNumber(dicValues.intStateID),
      strPostalCode: dicValues.strPostalCode.trim() || null,
      intCountryID: dicValues.intCountryID
    });
    return objResult.Data;
  },

  async getEmployeeBankAccount(intEmployeeID: number): Promise<EmployeeBankRecord> {
    const objResult = await masterApiService.getEmployeeBankAccount(intEmployeeID);
    return objResult.Data;
  },

  async saveEmployeeBankAccount(intEmployeeID: number, dicValues: EmployeeBankFormValues): Promise<EmployeeBankRecord> {
    const objResult = await masterApiService.saveEmployeeBankAccount(intEmployeeID, {
      intBankID: dicValues.intBankID,
      strAccountHolderName: dicValues.strAccountHolderName.trim(),
      strAccountNumber: dicValues.strAccountNumber.trim(),
      strIfscCode: dicValues.strIfscCode.trim() || null,
      blnIsPrimary: dicValues.blnIsPrimary,
      blnIsActive: dicValues.blnIsActive
    });
    return objResult.Data;
  },

  async getEmployeeStatutory(intEmployeeID: number): Promise<EmployeeStatutoryRecord> {
    const objResult = await masterApiService.getEmployeeStatutory(intEmployeeID);
    return objResult.Data;
  },

  async saveEmployeeStatutory(intEmployeeID: number, dicValues: EmployeeStatutoryFormValues): Promise<EmployeeStatutoryRecord> {
    const objResult = await masterApiService.saveEmployeeStatutory(intEmployeeID, {
      strPanNumber: dicValues.strPanNumber.trim() || null,
      strUanNumber: dicValues.strUanNumber.trim() || null,
      strEsiNumber: dicValues.strEsiNumber.trim() || null,
      strTaxRegimeCode: dicValues.strTaxRegimeCode.trim() || null,
      blnPfApplicable: dicValues.blnPfApplicable,
      blnEsiApplicable: dicValues.blnEsiApplicable,
      blnPtApplicable: dicValues.blnPtApplicable
    });
    return objResult.Data;
  }
};

