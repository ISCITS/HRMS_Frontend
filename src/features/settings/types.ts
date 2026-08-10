export type SettingValueType = "TEXT" | "NUMBER" | "BOOLEAN" | "JSON";

export type ApplicationSettingDto = {
  intID: number;
  intCompanyID: number | null;
  strModuleCode: string;
  strSettingCode: string;
  strValueType: SettingValueType;
  strSettingValueText: string | null;
  decSettingValueNumber: number | null;
  blnSettingValueBoolean: boolean | null;
  objSettingValueJson: unknown | null;
  strDescription: string | null;
  dtEffectiveFrom: string | null;
  dtEffectiveTo: string | null;
  blnIsActive: boolean;
};

export type ApplicationSettingSaveRequest = {
  intID?: number | null;
  strSettingCode: string;
  strValueType: SettingValueType;
  strSettingValueText?: string | null;
  decSettingValueNumber?: number | null;
  blnSettingValueBoolean?: boolean | null;
  objSettingValueJson?: unknown | null;
  strDescription?: string | null;
  dtEffectiveFrom?: string | null;
  dtEffectiveTo?: string | null;
  blnIsActive: boolean;
};
