export type PayrollProcessLogOption = {
  intID: number;
  strLabel: string;
  strCode?: string;
};

export type PayrollProcessLogListRecord = {
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

export type PayrollProcessLogFormOptions = {
  lstEmployees: PayrollProcessLogOption[];
  lstProcessStages: string[];
  lstProcessStatuses: string[];
};

export type PayrollProcessLogFilters = {
  intPayrollRunID: string;
  intEmployeeID: number | "";
  strProcessStage: string;
  strProcessStatus: string;
  strSearchText: string;
};
