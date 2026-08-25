"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import type { CommonTableColumn } from "@/Common/components/CommonTable";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useReportFilterOptions } from "../hooks/useReportFilterOptions";

import { leaveAttendanceReportService, type LeaveRegisterRow } from "../services/leaveAttendanceReportService";
import ReportGridPage, { type ReportDisplayRow, type ReportFilterField } from "./ReportGridPage";

function normalizeQueryMonth(strValue: string | null) {
  const strTrimmed = String(strValue ?? "").trim();
  return /^\d{4}-\d{2}/.test(strTrimmed) ? strTrimmed.slice(0, 7) : "";
}

function buildLeaveDefaultFilters(objSearchParams: { get: (strKey: string) => string | null }) {
  const strPayrollMonth = normalizeQueryMonth(objSearchParams.get("month"));
  const strStatus = String(objSearchParams.get("status") ?? "").trim();
  const dicFilters: Record<string, string> = {};
  if (strStatus) {
    dicFilters.status = strStatus;
  }
  if (strPayrollMonth) {
    const [strYear, strMonth] = strPayrollMonth.split("-");
    const intYear = Number(strYear);
    const intMonth = Number(strMonth);
    const intLastDay = new Date(intYear, intMonth, 0).getDate();
    dicFilters.from_date = `${strPayrollMonth}-01`;
    dicFilters.to_date = `${strPayrollMonth}-${String(intLastDay).padStart(2, "0")}`;
  }
  return dicFilters;
}

export default function LeaveRegisterReportPage() {
  const objSearchParams = useSearchParams();
  const { t } = useModuleLabels("reports");
  const { lstEmployees, lstDepartments, lstLeaveTypes } = useReportFilterOptions();
  const dicDefaultFilters = useMemo(() => buildLeaveDefaultFilters(objSearchParams), [objSearchParams]);

  const lstColumns = useMemo<CommonTableColumn<ReportDisplayRow>[]>(() => [
    { field: "strReference", headerName: t("reference", "Reference"), width: 130 },
    { field: "strEmployeeCode", headerName: t("employee_code", "Employee Code"), width: 140 },
    { field: "strEmployeeName", headerName: t("employee_name", "Employee"), width: 200 },
    { field: "strLeaveType", headerName: t("leave_type", "Leave Type"), width: 150 },
    { field: "dtFromDate", headerName: t("from_date", "From"), width: 120 },
    { field: "dtToDate", headerName: t("to_date", "To"), width: 120 },
    { field: "decDays", headerName: t("days", "Days"), width: 80, align: "right" },
    { field: "strStatus", headerName: t("status", "Status"), width: 120 },
    { field: "dtAppliedOn", headerName: t("submitted_on", "Submitted"), width: 120 },
    { field: "strCurrentApprover", headerName: t("current_approver", "Current Approver"), width: 170 },
    { field: "intAgeingDays", headerName: t("ageing_days", "Ageing (d)"), width: 100, align: "right" },
    { field: "strReasonSummary", headerName: t("reason", "Reason"), width: 260 },
  ], [t]);

  const lstFilters: ReportFilterField[] = [
    { strKey: "from_date", strLabel: t("from_date", "From Date"), strType: "date" },
    { strKey: "to_date", strLabel: t("to_date", "To Date"), strType: "date" },
    {
      strKey: "status", strLabel: t("status", "Status"), strType: "select",
      lstOptions: [
        { strValue: "pending", strLabel: t("status_pending", "Pending") },
        { strValue: "approved", strLabel: t("status_approved", "Approved") },
        { strValue: "rejected", strLabel: t("status_rejected", "Rejected") },
        { strValue: "sent_back", strLabel: t("status_sent_back", "Sent Back") },
        { strValue: "cancelled", strLabel: t("status_cancelled", "Cancelled") },
        { strValue: "draft", strLabel: t("status_draft", "Draft") },
      ],
    },
    { strKey: "leave_type_id", strLabel: t("leave_type", "Leave Type"), strType: "select", lstOptions: lstLeaveTypes },
    { strKey: "employee_id", strLabel: t("employee", "Employee"), strType: "select", lstOptions: lstEmployees, intWidth: 170 },
    { strKey: "department_id", strLabel: t("department", "Department"), strType: "select", lstOptions: lstDepartments, intWidth: 170 },
  ];

  function mapRow(dicRow: LeaveRegisterRow): ReportDisplayRow {
    return {
      intID: dicRow.intID,
      strReference: dicRow.strReference,
      strEmployeeCode: dicRow.strEmployeeCode,
      strEmployeeName: dicRow.strEmployeeName,
      strLeaveType: dicRow.strLeaveType,
      dtFromDate: dicRow.dtFromDate ?? "-",
      dtToDate: dicRow.dtToDate ?? "-",
      decDays: dicRow.decDays,
      strStatus: dicRow.strStatus,
      dtAppliedOn: dicRow.dtAppliedOn ? dicRow.dtAppliedOn.slice(0, 10) : "-",
      strCurrentApprover: dicRow.strCurrentApprover ?? "-",
      intAgeingDays: dicRow.intAgeingDays ?? "-",
      strReasonSummary: dicRow.strReasonSummary,
    };
  }

  return (
    <ReportGridPage
      strTitle={t("leave_register", "Leave Application Register")}
      strInfo={t("leave_register_info", "Leave applications with reference, dates, days, status, current approver, ageing and reason.")}
      lstColumns={lstColumns}
      lstFilters={lstFilters}
      strRowIdField="intID"
      strCsvFileName="leave-register"
      lstRightsHints={["REPORTS_LEAVE_REGISTER", "REPORTS"]}
      dicDefaultFilters={dicDefaultFilters}
      strEmptyMessage={t("leave_register_empty", "No leave applications found for the current filters.")}
      fnLoad={async (dicFilters) => {
        const objEnvelope = await leaveAttendanceReportService.getLeaveRegister(dicFilters);
        return objEnvelope.lstItems.map(mapRow);
      }}
    />
  );
}
