export type ChangePasswordFormValues = {
  strCurrentPassword: string;
  strNewPassword: string;
  strConfirmPassword: string;
};

export type PasswordResetEmployeeOption = {
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  blnIsCurrentUser?: boolean;
};
