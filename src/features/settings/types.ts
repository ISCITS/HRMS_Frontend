export type SettingValueType = "TEXT" | "NUMBER" | "BOOLEAN" | "JSON" | "EMPLOYEE_ID";

export type DefaultApproverSource = "LINE_MANAGER" | "REPORTING_MANAGER" | "HR";

// ---- Business single-page Leave settings ----
export type ApproverEmployeeDto = {
  intEmployeeID: number;
  strFullName: string;
  strEmployeeCode: string;
  intUserID: number | null;
};

export type ApproverSnapshotDto = {
  intEmployeeID: number;
  strFullName: string | null;
  strEmployeeCode: string | null;
  blnIsActive: boolean;
  blnHasActiveUser: boolean;
};

export type LeaveSettingsConfigDto = {
  intLeaveYearStartDay: number | null;
  intLeaveYearStartMonth: number | null;
  strDefaultApproverSource: DefaultApproverSource;
  objPrimaryHrApprover: ApproverSnapshotDto | null;
  objAlternateHrApprover: ApproverSnapshotDto | null;
  // Attendance Approval Defaults (mirrors the leave approver block).
  strAttendanceDefaultApproverSource: DefaultApproverSource;
  objAttendancePrimaryHrApprover: ApproverSnapshotDto | null;
  objAttendanceAlternateHrApprover: ApproverSnapshotDto | null;
};

export type LeaveSettingsSaveRequest = {
  intLeaveYearStartDay: number;
  intLeaveYearStartMonth: number;
  strDefaultApproverSource: DefaultApproverSource;
  intPrimaryHrApproverEmployeeID: number | null;
  intAlternateHrApproverEmployeeID: number | null;
  // Optional: when omitted, the saved attendance approval defaults are left unchanged.
  strAttendanceDefaultApproverSource?: DefaultApproverSource;
  intAttendancePrimaryHrApproverEmployeeID?: number | null;
  intAttendanceAlternateHrApproverEmployeeID?: number | null;
};
