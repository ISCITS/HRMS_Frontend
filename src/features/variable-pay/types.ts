export type VariablePayRunContext = {
  intPayrollRunID: number;
  strRunName: string;
  intPayrollCycleID: number | null;
  strScheduleName: string | null;
  strPayrollGroupName: string | null;
  dtPayrollMonth: string | null;
  dtPaymentDate: string | null;
  intVariablePayTypeID: number;
  strVariablePayTypeName: string;
  strScopeType: string;
};

export type VariablePayEmployeeRow = {
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  strDepartment: string | null;
  strLocation: string | null;
  intTransactionID: number | null;
  decAmount: number | null;
  strSourceType: string | null;
  strStatus: string;
  strRemarks: string | null;
};

export type VariablePayEligibleRunOption = {
  intID: number;
  strLabel: string;
  strCode: string;
  dtPayrollMonth: string;
};

export type VariablePaySaveResult = {
  intSaved: number;
  lstFailures: Array<{ intEmployeeID: number | null; strError: string }>;
};

export type VariablePayImportPreviewRow = {
  intExcelRowNumber: number;
  strEmployeeCode: string;
  intEmployeeID: number | null;
  strEmployeeName: string | null;
  decAmount: string;
  strRemarks: string | null;
  strExternalReference: string | null;
  blnValid: boolean;
  strErrorMessage: string | null;
};

export type VariablePayImportPreviewResult = {
  lstRows: VariablePayImportPreviewRow[];
  intTotalRows: number;
  intValidRows: number;
  intErrorRows: number;
};

export type VariablePayImportCommitResult = {
  intImportBatchID: number;
  intCreated: number;
  intUpdated: number;
  intSkipped: number;
  lstFailures: Array<{ strEmployeeCode: string; strError: string }>;
};

export type VariablePayTransitionResult = {
  intUpdatedCount: number;
};

export type VariablePayFetchResult = {
  intFetchedCount: number;
  intAlreadyPostedCount: number;
};
