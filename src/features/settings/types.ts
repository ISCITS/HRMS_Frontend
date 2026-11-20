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

/** Settings > Payroll > Arrears (keys match the backend ArrearConstants.ARREAR_SETTING_DEFINITIONS). */
export type ArrearSettings = {
  arrear_mode: "off" | "shadow" | "on";
  arrear_start_month: string | null;
  arrear_max_lookback_months: number;
  arrear_triggers: string[];
  allow_negative_arrear: boolean;
  arrear_recovery_max_percent_of_net: number;
  arrear_min_amount: number;
  arrear_max_amount_alert: number;
  arrear_pf_mode: "ORIGINAL_MONTH" | "NONE";
  arrear_esi_mode: "ORIGINAL_MONTH" | "NONE";
  arrear_wage_test_mode: "ORIGINAL_MONTH" | "NONE";
  arrear_pt_mode: "REGULAR_ONLY" | "ORIGINAL_MONTH";
  arrear_tds_mode: "ONE_TIME_SAME_MONTH" | "SPREAD";
  arrear_requires_review_ack: boolean;
  arrear_payslip_style: "SECTION" | "COLUMN" | "SINGLE_LINE";
  arrear_payslip_annexure: boolean;
  arrear_import_enabled: boolean;
  arrear_import_statutory: "CALCULATE" | "FROM_FILE" | "CURRENT_MONTH";
  arrear_import_conflict: "IMPORT_WINS" | "BLOCK" | "ADD";
  arrear_import_mode: "REPLACE_BATCH" | "APPEND";
  arrear_component_overrides: Record<string, "YES" | "NO">;
  /** Arrears for months already paid by payroll are added to the F&F (mode On only). */
  arrear_include_in_fnf: boolean;
};

/** Settings > Payroll > Arrears > Excluded employees: one active exclusion. */
export type ArrearExclusionDto = {
  intID: number;
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  /** YYYY-MM */
  strFromMonth: string;
  /** YYYY-MM; null = open-ended */
  strToMonth: string | null;
  strPeriodLabel: string;
  strReason: string;
  dtAddedOn: string | null;
  intAddedBy: number | null;
};

export type ArrearExclusionListDto = {
  /** False when the arrear tables are not created yet. */
  blnAvailable: boolean;
  strMessage: string | null;
  lstExclusions: ArrearExclusionDto[];
};

export type ArrearExclusionEmployeeDto = {
  intEmployeeID: number;
  strEmployeeCode: string;
  strFullName: string;
  strEmploymentStatus: string | null;
};

export type ArrearExclusionSaveRequest = {
  intEmployeeID: number;
  strFromMonth: string;
  strToMonth: string | null;
  strReason: string;
};

export type ArrearSettingsConfigDto = {
  dicSettings: ArrearSettings;
  dicDefaults: ArrearSettings;
  dicAllowedValues: Record<string, string[] | null>;
  lstTriggers: { strCode: string; blnBlocked: boolean; strBlockedReason: string | null }[];
  strEarliestFinalizedMonth: string | null;
  /** Arrear tables not created yet (the SQL script not applied): arrears cannot be switched on. */
  lstMissingTables: string[];
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
