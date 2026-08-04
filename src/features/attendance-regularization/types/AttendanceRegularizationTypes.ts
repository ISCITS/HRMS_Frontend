export type LookupOption = {
  intID: number;
  strValueCode: string;
  strDisplayName: string;
};

export type RegularizationLookups = Record<string, LookupOption[]>;

export type AttendanceSnapshot = {
  intAttendanceDayID?: number;
  strStatus?: string;
  strFirstIn?: string | null;
  strLastOut?: string | null;
  tmFirstIn?: string | null;
  tmLastOut?: string | null;
  decWorkedHours?: number;
  blnIsPaid?: boolean;
  dtLastModifiedOn?: string | null;
};

export type PunchRecord = {
  intID: number;
  dtPunchAt: string;
  strDirection: string;
  strSource: string;
};

export type DateContext = {
  objAttendanceDay: AttendanceSnapshot;
  lstPunches: PunchRecord[];
  objHoliday: { intID: number; strHolidayCode: string; dtHolidayDate: string } | null;
  objApprovedLeave: { intID: number; dtFromDate: string; dtToDate: string } | null;
  objActiveRequest: RegularizationRequest | null;
};

export type RegularizationRequest = {
  intID: number;
  strRequestNumber?: string | null;
  intEmployeeID: number;
  strEmployeeCode?: string;
  strEmployeeName?: string;
  dtWorkDate: string;
  strRequestTypeCode: string;
  strRequestSource: string;
  strRequestStatus: string;
  objOriginalSnapshot: AttendanceSnapshot;
  objProposalSnapshot: {
    strProposedStatus: string;
    tmProposedFirstIn?: string | null;
    tmProposedLastOut?: string | null;
    decProposedWorkedHours?: number | null;
    blnProposedIsPaid?: boolean | null;
    strProposedRemark?: string | null;
  };
  strEmployeeReason: string;
  strOnBehalfReason?: string | null;
  strPayrollImpactStatus: string;
  intCurrentApproverUserID?: number | null;
  intRowVersion: number;
};

export type RequestAction = {
  intID: number;
  strActionCode: string;
  strFromStatus?: string | null;
  strToStatus?: string | null;
  strRemarks?: string | null;
  dtActionOn: string;
  intActionBy?: number | null;
};

export type RequestAttachment = {
  intID: number;
  strDocumentTypeCode: string;
  strFileName: string;
  strMimeType: string;
  intFileSizeBytes: number;
  strFileHash?: string | null;
};

export type RegularizationDetail = RegularizationRequest & {
  objContext: DateContext;
  lstActions: RequestAction[];
  lstAttachments: RequestAttachment[];
};

export type RequestList = {
  lstItems: RegularizationRequest[];
  intTotal: number;
  intPage: number;
  intPageSize: number;
};

export type RegularizationFormValues = {
  dtWorkDate: string;
  strRequestTypeCode: string;
  strProposedStatus: string;
  tmProposedFirstIn: string;
  tmProposedLastOut: string;
  decProposedWorkedHours: number | null;
  blnProposedIsPaid: boolean | null;
  strProposedRemark: string;
  strEmployeeReason: string;
};

export type PreviewResult = {
  blnValid: boolean;
  lstErrors: Array<{ strCode: string; strField: string }>;
  objPayrollConflict: Record<string, unknown> | null;
  objContext: DateContext;
};

export type ExceptionRecord = {
  intID: number;
  intEmployeeID: number;
  strEmployeeCode?: string;
  strEmployeeName?: string;
  dtWorkDate: string;
  strExceptionTypeCode: string;
  strSeverityCode: string;
  strExceptionStatus: string;
  strExceptionMessage: string;
  objDetectedValues?: AttendanceSnapshot;
  intRequestID?: number | null;
  intAssignedToUserID?: number | null;
  dtDetectedOn: string;
  intAgeingDays: number;
};

export type ExceptionList = {
  lstItems: ExceptionRecord[];
  objSummary: {
    intTotal: number;
    dicBySeverity: Record<string, number>;
    dicByStatus: Record<string, number>;
  };
  intTotal: number;
  intPage: number;
  intPageSize: number;
};

export type ExceptionFilters = {
  strFromDate: string;
  strToDate: string;
  intEmployeeID?: number;
  intDepartmentID?: number;
  strExceptionTypeCode?: string;
  strSeverityCode?: string;
  strExceptionStatus?: string;
  intAssignedToUserID?: number;
  blnHasRequest?: boolean;
  intMinAgeingDays?: number;
  strSortBy?: "severity" | "status" | "detected_on" | "work_date" | "employee" | "assignee";
  strSortDirection?: "asc" | "desc";
};

export type AssignableUser = {
  intUserID: number;
  strLoginName?: string | null;
  strEmailAddress?: string | null;
};

export type BulkActionResult = {
  intRequestedCount: number;
  intSuccessCount: number;
  intFailureCount: number;
  lstResults: Array<{
    intExceptionID: number;
    blnSuccess: boolean;
    strResultCode: string;
    strMessage?: string;
  }>;
};
