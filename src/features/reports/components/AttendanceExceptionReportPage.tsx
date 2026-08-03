"use client";

import { useMemo } from "react";

import type { CommonTableColumn } from "@/Common/components/CommonTable";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useReportFilterOptions } from "../hooks/useReportFilterOptions";

import { leaveAttendanceReportService, type AttendanceExceptionRow } from "../services/leaveAttendanceReportService";
import ReportGridPage, { type ReportDisplayRow, type ReportFilterField } from "./ReportGridPage";

export default function AttendanceExceptionReportPage() {
  const { t } = useModuleLabels("reports");
  const { lstEmployees, lstDepartments, lstExceptionTypes } = useReportFilterOptions();

  const lstColumns = useMemo<CommonTableColumn<ReportDisplayRow>[]>(() => [
    { field: "dtWorkDate", headerName: t("date", "Date"), width: 120 },
    { field: "strEmployeeCode", headerName: t("employee_code", "Employee Code"), width: 140 },
    { field: "strEmployeeName", headerName: t("employee_name", "Employee"), width: 190 },
    { field: "strExceptionType", headerName: t("exception_type", "Type"), width: 190 },
    { field: "strSeverity", headerName: t("severity", "Severity"), width: 110 },
    { field: "strStatus", headerName: t("status", "Status"), width: 130 },
    { field: "strMessage", headerName: t("message", "Message"), width: 280 },
    { field: "dtDetectedOn", headerName: t("detected_on", "Detected"), width: 120 },
    { field: "strAssignedTo", headerName: t("assigned_to", "Assigned To"), width: 160 },
    { field: "intAgeingDays", headerName: t("ageing_days", "Ageing (d)"), width: 100, align: "right" },
    { field: "intRegularizationRequestID", headerName: t("regularization_ref", "Reg. Ref"), width: 100, align: "right" },
    { field: "strResolutionCode", headerName: t("resolution", "Resolution"), width: 150 },
  ], [t]);

  const lstFilters: ReportFilterField[] = [
    { strKey: "from_date", strLabel: t("from_date", "From Date"), strType: "date" },
    { strKey: "to_date", strLabel: t("to_date", "To Date"), strType: "date" },
    {
      strKey: "status", strLabel: t("status", "Status"), strType: "select",
      lstOptions: [
        { strValue: "OPEN,UNDER_REVIEW", strLabel: t("status_open_review", "Open + Under Review") },
        { strValue: "OPEN", strLabel: t("status_open", "Open") },
        { strValue: "UNDER_REVIEW", strLabel: t("status_under_review", "Under Review") },
        { strValue: "RESOLVED", strLabel: t("status_resolved", "Resolved") },
        { strValue: "IGNORED", strLabel: t("status_ignored", "Ignored") },
      ],
    },
    {
      strKey: "severity", strLabel: t("severity", "Severity"), strType: "select",
      lstOptions: [
        { strValue: "BLOCKING", strLabel: t("severity_blocking", "Blocking") },
        { strValue: "ERROR", strLabel: t("severity_error", "Error") },
        { strValue: "WARNING", strLabel: t("severity_warning", "Warning") },
      ],
    },
    { strKey: "exception_type", strLabel: t("exception_type", "Exception Type"), strType: "select", lstOptions: lstExceptionTypes },
    { strKey: "employee_id", strLabel: t("employee", "Employee"), strType: "select", lstOptions: lstEmployees },
    { strKey: "department_id", strLabel: t("department", "Department"), strType: "select", lstOptions: lstDepartments },
  ];

  function mapRow(dicRow: AttendanceExceptionRow): ReportDisplayRow {
    return {
      intID: dicRow.intID,
      dtWorkDate: dicRow.dtWorkDate ?? "-",
      strEmployeeCode: dicRow.strEmployeeCode,
      strEmployeeName: dicRow.strEmployeeName,
      strExceptionType: dicRow.strExceptionType,
      strSeverity: dicRow.strSeverity,
      strStatus: dicRow.strStatus,
      strMessage: dicRow.strMessage,
      dtDetectedOn: dicRow.dtDetectedOn ? dicRow.dtDetectedOn.slice(0, 10) : "-",
      strAssignedTo: dicRow.strAssignedTo ?? "-",
      intAgeingDays: dicRow.intAgeingDays ?? "-",
      intRegularizationRequestID: dicRow.intRegularizationRequestID ?? "-",
      strResolutionCode: dicRow.strResolutionCode ?? "-",
    };
  }

  return (
    <ReportGridPage
      strTitle={t("attendance_exceptions", "Attendance Exception Report")}
      strInfo={t("attendance_exceptions_info", "Attendance exceptions with severity, status, ageing, regularization link and resolution. Defaults to open and under-review.")}
      lstColumns={lstColumns}
      lstFilters={lstFilters}
      dicDefaultFilters={{ status: "OPEN,UNDER_REVIEW" }}
      strRowIdField="intID"
      strCsvFileName="attendance-exceptions"
      lstRightsHints={["REPORTS_ATTENDANCE_EXCEPTION", "REPORTS"]}
      strEmptyMessage={t("attendance_exceptions_empty", "No attendance exceptions found for the current filters.")}
      fnLoad={async (dicFilters) => {
        const objEnvelope = await leaveAttendanceReportService.getAttendanceExceptions(dicFilters);
        return objEnvelope.lstItems.map(mapRow);
      }}
    />
  );
}
