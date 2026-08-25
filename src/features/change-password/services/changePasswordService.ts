import type { ChangePasswordFormValues } from "@/features/change-password/types/ChangePasswordTypes";
import { authApiService } from "@/services";

export const changePasswordService = {
  changePassword(objPayload: ChangePasswordFormValues) {
    return authApiService.changePassword(objPayload);
  }
};
