import type { ApproverSnapshotDto } from "@/features/settings/types";

export type ApprovalFlowModuleCode = "LEAVE" | "ATTENDANCE_REGULARIZATION" | "WORK_ON_HOLIDAY";

export const lstApprovalFlowModules: { strValue: ApprovalFlowModuleCode; strLabel: string }[] = [
  { strValue: "LEAVE", strLabel: "Leave" },
  { strValue: "ATTENDANCE_REGULARIZATION", strLabel: "Attendance Regularisation" },
  { strValue: "WORK_ON_HOLIDAY", strLabel: "Work on Holiday" },
];

export type ApprovalFlowRecord = {
  intID: number;
  strModuleCode: ApprovalFlowModuleCode;
  strWorkflowName: string;
  strDescription: string | null;
  dtEffectiveFrom: string;
  blnIsActive: boolean;
  strApproverRole: string;
  objPrimaryApprover: ApproverSnapshotDto | null;
  objAlternateApprover: ApproverSnapshotDto | null;
  intEscalationDays: number | null;
  blnAllowAutoFallback: boolean;
  blnRequireRemarksOnRejection: boolean;
  blnNotifyByEmail: boolean;
  strApprovalNotes: string | null;
  intRowVersion: number;
};

export type ApprovalFlowSaveRequest = {
  strModuleCode: ApprovalFlowModuleCode;
  strWorkflowName: string;
  strDescription: string | null;
  dtEffectiveFrom: string;
  blnIsActive: boolean;
  strApproverRole: string;
  intPrimaryApproverEmployeeID: number;
  intAlternateApproverEmployeeID: number | null;
  intEscalationDays: number | null;
  blnAllowAutoFallback: boolean;
  blnRequireRemarksOnRejection: boolean;
  blnNotifyByEmail: boolean;
  strApprovalNotes: string | null;
  intRowVersion?: number | null;
};