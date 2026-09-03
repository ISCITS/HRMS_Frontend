export type AttendanceLeaveInputRow = {
  intInputID: number | null;
  /** Public identifier of the payroll input row; null when no input exists yet. */
  strInputRecordUUID: string | null;
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  strIssueMessage?: string;
  decWorkingDays: number | null;
  decLwpDays: number | null;
  decLopDays: number | null;
  decPayableDays: number | null;
  strAttendanceSource: "Attendance & Leave Inputs" | "Manual" | "Not Set";
  intExceptionCount: number;
  strReviewStatus: "Ready" | "Blocked" | "Warning" | "Not Imported";
  blnIsLocked: boolean;
};

export type AttendanceLeaveInputsSummary = {
  intEmployees: number;
  decFinalizedSourceDays: number;
  decTotalLwp: number;
  decTotalLop: number;
  intOpenExceptions: number;
  intWarnings: number;
};

export type AttendanceIntegrationStatus = "NOT_STARTED" | "IMPORTED" | "FINALIZED" | "REOPENED";
