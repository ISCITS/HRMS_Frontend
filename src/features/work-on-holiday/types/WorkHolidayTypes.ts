export type WorkHolidayAction = {
  intID: number;
  strActionCode: string;
  strFromStatus?: string | null;
  strToStatus?: string | null;
  strRemarks?: string | null;
  dtActionOn: string;
  intActionBy?: number | null;
  strActionByName?: string | null;
};

export type WorkHolidayAttendanceSnapshot = {
  intAttendanceDayID?: number | null;
  strStatus?: string | null;
  decWorkedHours?: number | null;
  tmFirstIn?: string | null;
  tmLastOut?: string | null;
  lstPunches?: Array<{ intID: number; dtPunchAt: string; strDirection: string }>;
};

export type WorkHolidayEligibilitySnapshot = {
  strDayTypeCode?: string;
  strEligibilitySource?: "HOLIDAY_MASTER" | "WEEKLY_OFF_CALENDAR";
  intHolidayID?: number | null;
  strHolidayName?: string | null;
  blnWeeklyOff?: boolean;
  blnUsingDefaultPolicy?: boolean;
  intPolicyID?: number | null;
  strExistingAttendanceStatus?: string | null;
  objTeamAvailability?: {
    intTeamSize: number;
    intApprovedLeaveCount: number;
    lstUnavailableEmployeeIDs: number[];
    strTeamCalendarPath: string;
  };
};

export type WorkHolidayAttachment = {
  intID: number;
  strFileName: string;
  intFileSizeBytes: number;
  strFileMimeType: string;
  strVerificationStatus: string;
  dtAddedOn?: string | null;
};

export type WorkHolidayRequest = {
  intID: number;
  strRequestNumber?: string | null;
  intEmployeeID: number;
  strEmployeeCode?: string | null;
  strEmployeeName?: string | null;
  intDepartmentID?: number | null;
  intLocationID?: number | null;
  dtWorkDate: string;
  strDayTypeCode: string;
  strRequestStatus: string;
  strRequestedOutcomeCode: string;
  decRequestedHours?: number | null;
  decVerifiedHours?: number | null;
  decRequestedCreditDays?: number | null;
  decApprovedCreditDays?: number | null;
  strWorkReason: string;
  strWorkDescription?: string | null;
  tmPlannedStartTime?: string | null;
  tmPlannedEndTime?: string | null;
  tmActualStartTime?: string | null;
  tmActualEndTime?: string | null;
  intBackupEmployeeID?: number | null;
  strAttendanceVerificationStatus: string;
  strPostingStatus: string;
  intRowVersion: number;
  intCurrentApproverUserID?: number | null;
  blnApprovalDecisionTaken?: boolean;
  strCurrentApproverName?: string | null;
  objEligibilitySnapshot: WorkHolidayEligibilitySnapshot;
  objAttendanceSnapshot: WorkHolidayAttendanceSnapshot;
  lstTimeline?: WorkHolidayAction[];
  lstAttachments?: WorkHolidayAttachment[];
  strTeamCalendarPath?: string;
};

export type WorkHolidayList = {
  lstItems: WorkHolidayRequest[];
  intTotal: number;
  intPage: number;
  intPageSize: number;
};

export type WorkHolidayEarnedCompOff = {
  intID: number;
  intWorkHolidayRequestID: number;
  strRequestNumber?: string | null;
  dtWorkDate?: string | null;
  decCreditedDays?: number | null;
  dtCreditDate?: string | null;
  dtExpiryDate?: string | null;
  blnIsReversed: boolean;
  strStatus: "AVAILABLE" | "REVERSED";
};

export type WorkHolidayEarnedCompOffList = {
  lstItems: WorkHolidayEarnedCompOff[];
  intTotal: number;
  intPage: number;
  intPageSize: number;
};

export type WorkHolidayEligibilityPreview = {
  strDayTypeCode: "HOLIDAY" | "WEEKLY_OFF" | "NONE";
  strHolidayName?: string | null;
  blnRetrospective: boolean;
  objAttendanceSnapshot: WorkHolidayAttendanceSnapshot | null;
};

export type WorkHolidayFormValues = {
  dtWorkDate: string;
  strRequestedOutcomeCode: string;
  tmPlannedStartTime: string;
  tmPlannedEndTime: string;
  tmActualStartTime: string;
  tmActualEndTime: string;
  decRequestedHours: number;
  decRequestedCreditDays: number;
  strWorkReason: string;
  strWorkDescription: string;
  intBackupEmployeeID: number | null;
  objAttachment: File | null;
};

export type WorkHolidayRequestPayload = {
  dtWorkDate: string;
  strRequestedOutcomeCode: string;
  tmPlannedStartTime?: string | null;
  tmPlannedEndTime?: string | null;
  tmActualStartTime?: string | null;
  tmActualEndTime?: string | null;
  decRequestedHours?: number | null;
  decRequestedCreditDays?: number | null;
  strWorkReason: string;
  strWorkDescription?: string | null;
  intBackupEmployeeID?: number | null;
  intRowVersion?: number;
};

export type WorkHolidayMutationPayload = {
  intRowVersion: number;
  strIdempotencyKey: string;
  strRemarks?: string | null;
  decApprovedCreditDays?: number | null;
};

/**
 * Maps technical workflow/posting codes to the business-friendly employee status
 * required by the Work on Holiday POC guide (Draft, Pending Approval, Approved –
 * Attendance Pending, Attendance Verified, Processing Benefit, Completed, ...).
 */
export function getWorkHolidayBusinessStatus(
  objRequest: Pick<WorkHolidayRequest, "strRequestStatus" | "strPostingStatus">,
  t: (strKey: string, strFallback: string) => string,
): string {
  const { strRequestStatus, strPostingStatus } = objRequest;
  switch (strRequestStatus) {
    case "DRAFT":
      return t("business_status_draft", "Draft");
    case "PENDING_APPROVAL":
      return t("business_status_pending_approval", "Pending Approval");
    case "SENT_BACK":
      return t("business_status_sent_back", "Sent Back");
    case "APPROVED":
    case "PENDING_ATTENDANCE_VERIFICATION":
      return t("business_status_attendance_pending", "Approved – Attendance Pending");
    case "VERIFIED":
      return strPostingStatus === "PROCESSING"
        ? t("business_status_processing_benefit", "Processing Benefit")
        : t("business_status_attendance_verified", "Attendance Verified");
    case "POSTED":
    case "REVERSED":
      return t("business_status_completed", "Completed");
    case "POSTING_FAILED":
      // Posting exceptions are an HR/Admin concern; the employee only ever sees "still processing".
      return t("business_status_processing_benefit", "Processing Benefit");
    case "REJECTED":
      return t("business_status_rejected", "Rejected");
    case "WITHDRAWN":
      return t("business_status_withdrawn", "Withdrawn");
    default:
      return t(`status_${strRequestStatus.toLowerCase()}`, strRequestStatus);
  }
}

export const WORK_HOLIDAY_MODULE_CODES = [
  "ess_work_on_holiday",
  "work_on_holiday_requests",
  "ESS_WORK_ON_HOLIDAY",
  "WORK_ON_HOLIDAY_REQUESTS",
  "WORK_ON_HOLIDAY",
  "LEAVE_WORK_ON_HOLIDAY",
];

export const WORK_HOLIDAY_ACTION_ALIASES: Record<string, string[]> = {
  WORK_ON_HOLIDAY_VIEW: ["WORK_ON_HOLIDAY_VIEW", "view", "list", "read"],
  WORK_ON_HOLIDAY_CREATE: ["WORK_ON_HOLIDAY_CREATE", "create", "add"],
  WORK_ON_HOLIDAY_EDIT: ["WORK_ON_HOLIDAY_EDIT", "edit", "update"],
  WORK_ON_HOLIDAY_SUBMIT: ["WORK_ON_HOLIDAY_SUBMIT", "submit"],
  WORK_ON_HOLIDAY_WITHDRAW: ["WORK_ON_HOLIDAY_WITHDRAW", "withdraw", "cancel"],
  WORK_ON_HOLIDAY_APPROVE: ["WORK_ON_HOLIDAY_APPROVE", "approve"],
  WORK_ON_HOLIDAY_REJECT: ["WORK_ON_HOLIDAY_REJECT", "reject"],
  WORK_ON_HOLIDAY_SEND_BACK: ["WORK_ON_HOLIDAY_SEND_BACK", "send_back", "send-back"],
  WORK_ON_HOLIDAY_VIEW_ALL: ["WORK_ON_HOLIDAY_VIEW_ALL", "view_all", "view-all", "list", "read"],
  WORK_ON_HOLIDAY_CREATE_ON_BEHALF: ["WORK_ON_HOLIDAY_CREATE_ON_BEHALF", "create_on_behalf", "create-on-behalf", "add"],
  WORK_ON_HOLIDAY_VERIFY: ["WORK_ON_HOLIDAY_VERIFY", "verify", "review"],
  WORK_ON_HOLIDAY_POST: ["WORK_ON_HOLIDAY_POST", "post", "process"],
  WORK_ON_HOLIDAY_REVERSE: ["WORK_ON_HOLIDAY_REVERSE", "reverse", "cancel"],
  WORK_ON_HOLIDAY_OVERRIDE: ["WORK_ON_HOLIDAY_OVERRIDE", "override", "manage"],
  WORK_ON_HOLIDAY_MANAGE: ["WORK_ON_HOLIDAY_MANAGE", "manage", "edit"],
};
