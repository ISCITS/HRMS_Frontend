export type AttendanceLeaveInputRow = {
  intInputID: number;
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
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
