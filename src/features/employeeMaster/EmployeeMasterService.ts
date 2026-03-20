import { axiosInstance } from "@/lib/axiosInstance";
import type {
  EmployeeAddress,
  EmployeeAddressFormValues,
  EmployeeBankAccount,
  EmployeeBankAccountFormValues,
  EmployeeBasicInfoFormValues,
  EmployeeDetail,
  EmployeeListItem,
  EmployeeLookups,
  EmployeeStatutory,
  StandardApiResponse
} from "@/features/employeeMaster/Types";

const strBasePath = "/api/v1/masters/employee";

async function unwrapResponse<TData>(objPromise: Promise<{ data: StandardApiResponse<TData> }>): Promise<TData> {
  const objResponse = await objPromise;
  if (objResponse.data.ResultCode !== 1) {
    throw new Error(objResponse.data.Msg || "Request failed.");
  }
  return objResponse.data.Data;
}

export const employeeMasterService = {
  listEmployees(strSearch = "", strStatus = "") {
    return unwrapResponse<EmployeeListItem[]>(
      axiosInstance.get(strBasePath, {
        params: {
          strSearch: strSearch || undefined,
          strStatus: strStatus || undefined
        }
      })
    );
  },

  getLookups() {
    return unwrapResponse<EmployeeLookups>(axiosInstance.get(`${strBasePath}/lookups`));
  },

  getEmployee(intEmployeeID: number) {
    return unwrapResponse<EmployeeDetail>(axiosInstance.get(`${strBasePath}/${intEmployeeID}`));
  },

  createEmployee(dicPayload: EmployeeBasicInfoFormValues) {
    return unwrapResponse<EmployeeDetail>(axiosInstance.post(strBasePath, dicPayload));
  },

  updateEmployee(intEmployeeID: number, dicPayload: EmployeeBasicInfoFormValues) {
    return unwrapResponse<EmployeeDetail>(axiosInstance.put(`${strBasePath}/${intEmployeeID}`, dicPayload));
  },

  deactivateEmployee(intEmployeeID: number) {
    return unwrapResponse<null>(axiosInstance.delete(`${strBasePath}/${intEmployeeID}`));
  },

  listAddresses(intEmployeeID: number) {
    return unwrapResponse<EmployeeAddress[]>(axiosInstance.get(`${strBasePath}/${intEmployeeID}/addresses`));
  },

  createAddress(intEmployeeID: number, dicPayload: EmployeeAddressFormValues) {
    return unwrapResponse<EmployeeAddress>(axiosInstance.post(`${strBasePath}/${intEmployeeID}/addresses`, dicPayload));
  },

  updateAddress(intEmployeeID: number, intAddressID: number, dicPayload: EmployeeAddressFormValues) {
    return unwrapResponse<EmployeeAddress>(axiosInstance.put(`${strBasePath}/${intEmployeeID}/addresses/${intAddressID}`, dicPayload));
  },

  deleteAddress(intEmployeeID: number, intAddressID: number) {
    return unwrapResponse<null>(axiosInstance.delete(`${strBasePath}/${intEmployeeID}/addresses/${intAddressID}`));
  },

  listBankAccounts(intEmployeeID: number) {
    return unwrapResponse<EmployeeBankAccount[]>(axiosInstance.get(`${strBasePath}/${intEmployeeID}/bank-accounts`));
  },

  createBankAccount(intEmployeeID: number, dicPayload: EmployeeBankAccountFormValues) {
    return unwrapResponse<EmployeeBankAccount>(axiosInstance.post(`${strBasePath}/${intEmployeeID}/bank-accounts`, dicPayload));
  },

  updateBankAccount(intEmployeeID: number, intBankAccountID: number, dicPayload: EmployeeBankAccountFormValues) {
    return unwrapResponse<EmployeeBankAccount>(
      axiosInstance.put(`${strBasePath}/${intEmployeeID}/bank-accounts/${intBankAccountID}`, dicPayload)
    );
  },

  deleteBankAccount(intEmployeeID: number, intBankAccountID: number) {
    return unwrapResponse<null>(axiosInstance.delete(`${strBasePath}/${intEmployeeID}/bank-accounts/${intBankAccountID}`));
  },

  getStatutory(intEmployeeID: number) {
    return unwrapResponse<EmployeeStatutory | null>(axiosInstance.get(`${strBasePath}/${intEmployeeID}/statutory`));
  },

  saveStatutory(intEmployeeID: number, dicPayload: EmployeeStatutory) {
    return unwrapResponse<EmployeeStatutory>(axiosInstance.put(`${strBasePath}/${intEmployeeID}/statutory`, dicPayload));
  }
};
