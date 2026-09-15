import type { ChangePasswordFormValues } from "@/features/change-password/types/ChangePasswordTypes";
import { authApiService } from "@/services";

export const changePasswordService = {
  changePassword(objPayload: ChangePasswordFormValues, intEmployeeID?: number) {
    return authApiService.changePassword({
      ...objPayload,
      ...(intEmployeeID ? { intEmployeeID, strCurrentPassword: undefined } : {})
    });
  },

  async getPasswordResetEmployees() {
    const objResult = await authApiService.getPasswordResetEmployees();
    return objResult.Data ?? [];
  },

  async getCurrentEmployeeIdentity() {
    const objResult = await authApiService.getCurrentUser();
    const lstEmployeeIDs = [
      objResult.Data.objUser.intEmployeeID,
      objResult.Data.objEmployee?.intEmployeeID
    ].filter((intEmployeeID): intEmployeeID is number => (
      typeof intEmployeeID === "number" && Number.isFinite(intEmployeeID)
    ));

    return {
      lstEmployeeIDs: Array.from(new Set(lstEmployeeIDs)),
      strEmployeeCode: (objResult.Data.objEmployee?.strEmployeeCode ?? "").trim()
    };
  }
};
