"use client";

import { useMemo } from "react";

import type { CommonTableColumn } from "@/Common/components/CommonTable";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";

import { leaveAttendanceReportService, type LeaveBalanceRow } from "../services/leaveAttendanceReportService";
import ReportGridPage, { type ReportDisplayRow, type ReportFilterField } from "./ReportGridPage";

function num(objValue: number | null | undefined) {
  return objValue === null || objValue === undefined ? "" : Number(objValue).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function LeaveBalanceReportPage() {
  const { t } = useModuleLabels("reports");

  const lstColumns = useMemo<CommonTableColumn<ReportDisplayRow>[]>(() => [
    { field: "strEmployeeCode", headerName: t("employee_code", "Employee Code"), width: 140 },
    { field: "strEmployeeName", headerName: t("employee_name", "Employee"), width: 200 },
    { field: "strDepartment", headerName: t("department", "Department"), width: 160 },
    { field: "strLeaveType", headerName: t("leave_type", "Leave Type"), width: 160 },
    { field: "intLeaveYear", headerName: t("leave_year", "Year"), width: 90, align: "right" },
    { field: "decOpening", headerName: t("opening", "Opening"), width: 100, align: "right" },
    { field: "decEntitled", headerName: t("entitlement", "Entitlement"), width: 120, align: "right" },
    { field: "decAccrued", headerName: t("accrued", "Accrued"), width: 100, align: "right" },
    { field: "decCarryForward", headerName: t("carry_forward", "Carry Fwd"), width: 110, align: "right" },
    { field: "decAdjustments", headerName: t("adjustments", "Adjustments"), width: 120, align: "right" },
    { field: "decUtilised", headerName: t("utilised", "Utilised"), width: 100, align: "right" },
    { field: "decHold", headerName: t("hold", "Hold"), width: 90, align: "right" },
    { field: "decLapsed", headerName: t("lapsed", "Lapsed"), width: 100, align: "right" },
    { field: "decEncashed", headerName: t("encashed", "Encashed"), width: 100, align: "right" },
    { field: "decAvailable", headerName: t("available", "Available"), width: 110, align: "right" },
    { field: "dtLastTransactionOn", headerName: t("last_transaction", "Last Txn"), width: 120 },
  ], [t]);

  const lstFilters: ReportFilterField[] = [
    { strKey: "leave_year", strLabel: t("leave_year", "Leave Year"), strType: "text" },
    { strKey: "employee_id", strLabel: t("employee_id", "Employee ID"), strType: "text" },
    { strKey: "department_id", strLabel: t("department_id", "Department ID"), strType: "text" },
    { strKey: "location_id", strLabel: t("location_id", "Location ID"), strType: "text" },
    { strKey: "leave_type_id", strLabel: t("leave_type_id", "Leave Type ID"), strType: "text" },
  ];

  function mapRow(dicRow: LeaveBalanceRow): ReportDisplayRow {
    return {
      __rowid: `${dicRow.intEmployeeID}-${dicRow.strLeaveType}-${dicRow.intLeaveYear}`,
      strEmployeeCode: dicRow.strEmployeeCode,
      strEmployeeName: dicRow.strEmployeeName,
      strDepartment: dicRow.strDepartment ?? "-",
      strLeaveType: dicRow.strLeaveType,
      intLeaveYear: dicRow.intLeaveYear,
      decOpening: num(dicRow.decOpening),
      decEntitled: num(dicRow.decEntitled),
      decAccrued: num(dicRow.decAccrued),
      decCarryForward: num(dicRow.decCarryForward),
      decAdjustments: num(dicRow.decAdjustments),
      decUtilised: num(dicRow.decUtilised),
      decHold: num(dicRow.decHold),
      decLapsed: num(dicRow.decLapsed),
      decEncashed: num(dicRow.decEncashed),
      decAvailable: dicRow.blnNegative
        ? <span style={{ color: "#dc2626", fontWeight: 700 }}>{num(dicRow.decAvailable)}</span>
        : num(dicRow.decAvailable),
      dtLastTransactionOn: dicRow.dtLastTransactionOn ? dicRow.dtLastTransactionOn.slice(0, 10) : "-",
    };
  }

  return (
    <ReportGridPage
      strTitle={t("leave_balance", "Leave Balance")}
      strInfo={t("leave_balance_info", "Current leave balances by type — opening, entitlement, accrued, carry forward, adjustments, utilised, hold, lapsed, encashed and available.")}
      lstColumns={lstColumns}
      lstFilters={lstFilters}
      strRowIdField="__rowid"
      strCsvFileName="leave-balance"
      lstRightsHints={["REPORTS_LEAVE_BALANCE", "REPORTS"]}
      strEmptyMessage={t("leave_balance_empty", "No leave balances found for the current filters.")}
      fnLoad={async (dicFilters) => {
        const objEnvelope = await leaveAttendanceReportService.getLeaveBalance(dicFilters);
        return objEnvelope.lstItems.map(mapRow);
      }}
    />
  );
}
