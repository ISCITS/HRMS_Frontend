"use client";

import { useMemo } from "react";

import type { CommonTableColumn } from "@/Common/components/CommonTable";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useReportFilterOptions } from "../hooks/useReportFilterOptions";

import { leaveAttendanceReportService, type MonthlyAttendanceRow } from "../services/leaveAttendanceReportService";
import ReportGridPage, { type ReportDisplayRow, type ReportFilterField } from "./ReportGridPage";

function currentMonth(): string {
  const objNow = new Date();
  return `${objNow.getFullYear()}-${String(objNow.getMonth() + 1).padStart(2, "0")}`;
}

export default function MonthlyAttendanceReportPage() {
  const { t } = useModuleLabels("reports");
  const { lstEmployees, lstDepartments, lstLocations } = useReportFilterOptions();

  const lstColumns = useMemo<CommonTableColumn<ReportDisplayRow>[]>(() => [
    { field: "strEmployeeCode", headerName: t("employee_code", "Employee Code"), width: 160 },
    { field: "strEmployeeName", headerName: t("employee_name", "Employee"), width: 200 },
    { field: "strDepartment", headerName: t("department", "Department"), width: 160 },
    { field: "intDaysRecorded", headerName: t("days_recorded", "Days"), width: 90, align: "right" },
    { field: "intPresent", headerName: t("present", "Present"), width: 105, align: "right" },
    { field: "intHalfDay", headerName: t("half_day", "Half Day"), width: 110, align: "right" },
    { field: "intPaidLeave", headerName: t("paid_leave", "Paid Leave"), width: 120, align: "right" },
    { field: "intLwp", headerName: t("lwp", "LWP"), width: 80, align: "right" },
    { field: "intAbsent", headerName: t("absent", "Absent"), width: 90, align: "right" },
    { field: "intHoliday", headerName: t("holiday", "Holiday"), width: 90, align: "right" },
    { field: "intWeeklyOff", headerName: t("weekly_off", "Weekly Off"), width: 130, align: "right" },
    { field: "intOnDuty", headerName: t("on_duty", "On Duty"), width: 100, align: "right" },
    { field: "intPaidDays", headerName: t("paid_days", "Paid Days"), width: 120, align: "right" },
    { field: "intLateMinutes", headerName: t("late_minutes", "Late (min)"), width: 120, align: "right" },
    { field: "decOtHours", headerName: t("ot_hours", "OT (hrs)"), width: 100, align: "right" },
  ], [t]);

  const lstFilters: ReportFilterField[] = [
    { strKey: "month", strLabel: t("month", "Month"), strType: "month" },
    { strKey: "employee_id", strLabel: t("employee", "Employee"), strType: "select", lstOptions: lstEmployees },
    { strKey: "department_id", strLabel: t("department", "Department"), strType: "select", lstOptions: lstDepartments },
    { strKey: "location_id", strLabel: t("location", "Location"), strType: "select", lstOptions: lstLocations },
  ];

  function mapRow(dicRow: MonthlyAttendanceRow): ReportDisplayRow {
    return {
      intEmployeeID: dicRow.intEmployeeID,
      strEmployeeCode: dicRow.strEmployeeCode,
      strEmployeeName: dicRow.strEmployeeName,
      strDepartment: dicRow.strDepartment ?? "-",
      intDaysRecorded: dicRow.intDaysRecorded,
      intPresent: dicRow.intPresent,
      intHalfDay: dicRow.intHalfDay,
      intPaidLeave: dicRow.intPaidLeave,
      intLwp: dicRow.intLwp,
      intAbsent: dicRow.intAbsent,
      intHoliday: dicRow.intHoliday,
      intWeeklyOff: dicRow.intWeeklyOff,
      intOnDuty: dicRow.intOnDuty,
      intPaidDays: dicRow.intPaidDays,
      intLateMinutes: dicRow.intLateMinutes,
      decOtHours: dicRow.decOtHours,
    };
  }

  return (
    <ReportGridPage
      strTitle={t("monthly_attendance", "Monthly Attendance Summary")}
      strInfo={t("monthly_attendance_info", "Per-employee attendance totals for the selected month by final day status, paid days, late minutes and OT.")}
      lstColumns={lstColumns}
      lstFilters={lstFilters}
      dicDefaultFilters={{ month: currentMonth() }}
      strRowIdField="intEmployeeID"
      strCsvFileName="monthly-attendance"
      blnWrapColumnHeaders={false}
      lstRightsHints={["REPORTS_ATTENDANCE_SUMMARY", "REPORTS"]}
      strEmptyMessage={t("monthly_attendance_empty", "No attendance recorded for the selected month/filters.")}
      fnLoad={async (dicFilters) => {
        const strMonth = dicFilters.month || currentMonth();
        const [strYear, strMonthNo] = strMonth.split("-");
        const objEnvelope = await leaveAttendanceReportService.getMonthlyAttendance({
          year: strYear,
          month: strMonthNo,
          employee_id: dicFilters.employee_id,
          department_id: dicFilters.department_id,
          location_id: dicFilters.location_id,
        });
        return objEnvelope.lstItems.map(mapRow);
      }}
    />
  );
}
