export type PayrollCycleOption = {
  intID: number;
  strLabel: string;
  strCode?: string;
};

export type PayrollCycleListRecord = {
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

export type PayrollCycleDetailRecord = PayrollCycleListRecord;

export type PayrollCycleFormValues = {
  intPayrollGroupID: number | "";
  strCycleCode: string;
  strCycleName: string;
  strPeriodType: string;
  intCutoffDay: string;
  blnIsActive: boolean;
};

export type PayrollCycleFormOptions = {
  lstPayrollGroups: PayrollCycleOption[];
  lstPeriodTypes: string[];
};
