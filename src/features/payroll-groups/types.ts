export type PayrollGroupTextRecord = {
  intLanguageID: number;
  strLanguageName: string;
  strPayrollGroupName: string;
};

export type PayrollGroupListRecord = {
  intID: number;
  /** Public identifier used in URLs; the internal id stays server-side. */
  strRecordUUID: string;
  intTenantID: number;
  intCompanyID: number;
  strPayrollGroupName: string;
  strDescription: string | null;
  intDisplayOrder: number;
  blnIsActive: boolean;
};

export type PayrollGroupUsage = {
  intPayrollCycleCount: number;
  intEmployeeCount: number;
  blnInUse: boolean;
};

export type PayrollGroupDetailRecord = PayrollGroupListRecord & {
  lstTexts: PayrollGroupTextRecord[];
  dicUsage: PayrollGroupUsage | null;
};

export type PayrollGroupTextFormValue = {
  intLanguageID: number | "";
  strLanguageName?: string;
  strPayrollGroupName: string;
};

export type PayrollGroupFormValues = {
  strPayrollGroupName: string;
  strDescription: string;
  blnIsActive: boolean;
  intLanguageID: number;
  lstTexts: PayrollGroupTextFormValue[];
};

export type PayrollGroupLanguageOption = {
  intID: number;
  strLabel: string;
  strCode?: string;
};

export type PayrollGroupFormOptions = {
  lstLanguages: PayrollGroupLanguageOption[];
};
