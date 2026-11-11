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
  // Attendance Regularization Approval Defaults (mirrors the leave approver block).
  strAttendanceDefaultApproverSource: DefaultApproverSource;
  objAttendancePrimaryHrApprover: ApproverSnapshotDto | null;
  objAttendanceAlternateHrApprover: ApproverSnapshotDto | null;
  // Work on Holiday Approval Defaults (mirrors the same block).
  strWorkHolidayDefaultApproverSource: DefaultApproverSource;
  objWorkHolidayPrimaryHrApprover: ApproverSnapshotDto | null;
  objWorkHolidayAlternateHrApprover: ApproverSnapshotDto | null;
};

// ---- Payroll: payslip & F&F report formats ----
export type PayrollDocumentTemplateDto = {
  strFormat: "default" | "client";
  strName: string;
  strDescription: string;
  blnIsDefault: boolean;
  /** Our payslip opens Monthly or Detailed. */
  blnHasViews: boolean;
};

export type PayrollDocumentFormatConfigDto = {
  strPayslipFormat: "default" | "client";
  strPayslipView: "monthly" | "detailed";
  strFNFReportFormat: "default" | "client";
  /** CTC Statement: our format ("default"), Format 1 ("client") or both (the screen switches between
   * them); strCtcPeriod is the period it opens in (the screen can switch that too). */
  strCtcFormat: "default" | "client" | "both";
  strCtcPeriod: "monthly" | "annual";
  lstPayslipTemplates: PayrollDocumentTemplateDto[];
  lstFNFTemplates: PayrollDocumentTemplateDto[];
  lstCtcTemplates: PayrollDocumentTemplateDto[];
};

export type PayrollDocumentFormatSaveRequest = Pick<
  PayrollDocumentFormatConfigDto,
  "strPayslipFormat" | "strPayslipView" | "strFNFReportFormat" | "strCtcFormat" | "strCtcPeriod"
>;

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
  // Optional: when omitted, the saved work-on-holiday approval defaults are left unchanged.
  strWorkHolidayDefaultApproverSource?: DefaultApproverSource;
  intWorkHolidayPrimaryHrApproverEmployeeID?: number | null;
  intWorkHolidayAlternateHrApproverEmployeeID?: number | null;
};
