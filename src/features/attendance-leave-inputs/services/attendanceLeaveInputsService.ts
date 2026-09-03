import { attendancePayrollService } from "@/features/payroll/services/attendancePayrollService";
import { employeePayrollInputService } from "@/features/payroll/services/employeePayrollInputService";
import { payrollRunService } from "@/features/payroll/services/payrollRunService";
import type { AttendanceIntegrationStatusRecord, PayrollRunDetailRecord } from "@/features/payroll/types";
import type { AttendanceLeaveInputRow, AttendanceLeaveInputsSummary } from "@/features/attendance-leave-inputs/types";

const setAttendanceValidationCodePrefix = "PAY_";

export async function loadAttendanceLeaveInputsForRun(
  strRunID: string
): Promise<{
  objRun: PayrollRunDetailRecord;
  lstRows: AttendanceLeaveInputRow[];
  objSummary: AttendanceLeaveInputsSummary;
  objIntegrationStatus: AttendanceIntegrationStatusRecord | null;
}> {
  const [objRun, objIntegrationStatus] = await Promise.all([
    payrollRunService.getPayrollRunById(strRunID),
    attendancePayrollService.getIntegrationStatus(strRunID).catch(() => null),
  ]);
  const lstInputs = await employeePayrollInputService.getEmployeePayrollInputs({
    intPayrollRunID: objRun.intID,
  });
  const lstAttendanceIssues = (objRun.lstValidationResults ?? []).filter((dicIssue) =>
    dicIssue.strValidationCode.startsWith(setAttendanceValidationCodePrefix)
  );
  const dicIssuesByEmployeeID = new Map<number, typeof lstAttendanceIssues>();
  for (const dicIssue of lstAttendanceIssues) {
    if (dicIssue.intEmployeeID == null) {
      continue;
    }
    const lstExisting = dicIssuesByEmployeeID.get(dicIssue.intEmployeeID) ?? [];
    lstExisting.push(dicIssue);
    dicIssuesByEmployeeID.set(dicIssue.intEmployeeID, lstExisting);
  }

  const lstRows: AttendanceLeaveInputRow[] = lstInputs
    .filter((dicInput) => dicInput.intPayrollRunID === objRun.intID)
    .map((dicInput) => {
      const lstEmployeeIssues = dicIssuesByEmployeeID.get(dicInput.intEmployeeID) ?? [];
      const blnHasBlocking = lstEmployeeIssues.some((dicIssue) => dicIssue.blnIsBlocking);
      const blnHasWarning = lstEmployeeIssues.some((dicIssue) => !dicIssue.blnIsBlocking);
      const strAttendanceSource: AttendanceLeaveInputRow["strAttendanceSource"] =
        dicInput.strManualLwpSource === "SYSTEM_ATTENDANCE"
          ? "Attendance & Leave Inputs"
          : dicInput.strManualLwpSource
            ? "Manual"
            : "Not Set";
      const strReviewStatus: AttendanceLeaveInputRow["strReviewStatus"] = blnHasBlocking
        ? "Blocked"
        : blnHasWarning
          ? "Warning"
          : strAttendanceSource === "Not Set"
            ? "Not Imported"
            : "Ready";
      return {
        intInputID: dicInput.intID,
        strInputRecordUUID: dicInput.strRecordUUID,
        intEmployeeID: dicInput.intEmployeeID,
        strEmployeeCode: dicInput.strEmployeeCode,
        strEmployeeName: dicInput.strEmployeeName,
        strIssueMessage: lstEmployeeIssues[0]?.strValidationMessage ?? undefined,
        decWorkingDays: dicInput.decWorkingDays,
        decLwpDays: dicInput.decLwpDays,
        decLopDays: dicInput.decLopDays,
        decPayableDays: dicInput.decPayableDays,
        strAttendanceSource,
        intExceptionCount: lstEmployeeIssues.length,
        strReviewStatus,
        blnIsLocked: dicInput.blnIsLocked,
      };
    });
  const setInputEmployeeIDs = new Set(lstRows.map((dicRow) => dicRow.intEmployeeID));
  for (const [intEmployeeID, lstEmployeeIssues] of dicIssuesByEmployeeID.entries()) {
    if (setInputEmployeeIDs.has(intEmployeeID)) {
      continue;
    }
    const blnHasBlocking = lstEmployeeIssues.some((dicIssue) => dicIssue.blnIsBlocking);
    const objFirstIssue = lstEmployeeIssues[0];
    lstRows.push({
      intInputID: null,
      strInputRecordUUID: null,
      intEmployeeID,
      strEmployeeCode: objFirstIssue.strEmployeeCode ?? "-",
      strEmployeeName: objFirstIssue.strEmployeeName ?? "-",
      strIssueMessage: objFirstIssue.strValidationMessage ?? undefined,
      decWorkingDays: null,
      decLwpDays: null,
      decLopDays: null,
      decPayableDays: null,
      strAttendanceSource: "Not Set",
      intExceptionCount: lstEmployeeIssues.length,
      strReviewStatus: blnHasBlocking ? "Blocked" : "Warning",
      blnIsLocked: false,
    });
  }

  const objSummary: AttendanceLeaveInputsSummary = {
    intEmployees: lstRows.length,
    decFinalizedSourceDays: lstRows
      .filter((dicRow) => dicRow.strAttendanceSource === "Attendance & Leave Inputs")
      .reduce((decTotal, dicRow) => decTotal + (dicRow.decPayableDays ?? 0), 0),
    decTotalLwp: lstRows.reduce((decTotal, dicRow) => decTotal + (dicRow.decLwpDays ?? 0), 0),
    decTotalLop: lstRows.reduce((decTotal, dicRow) => decTotal + (dicRow.decLopDays ?? 0), 0),
    intOpenExceptions: lstRows.filter((dicRow) => dicRow.strReviewStatus === "Blocked").length,
    intWarnings: lstRows.filter((dicRow) => dicRow.strReviewStatus === "Warning").length,
  };

  return { objRun, lstRows, objSummary, objIntegrationStatus };
}

export const attendanceLeaveInputsService = {
  importOrRefresh: (strRunID: string) => attendancePayrollService.validateRunAttendance(strRunID),
  finalize: (strRunID: string) => attendancePayrollService.finalizeAttendanceIntegration(strRunID),
  reopenAndRefresh: (strRunID: string, strReason: string) =>
    attendancePayrollService.validateRunAttendance(strRunID, undefined, true, strReason),
};
