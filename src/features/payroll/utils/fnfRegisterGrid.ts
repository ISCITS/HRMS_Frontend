import type { FNFRegisterComponentColumn, FNFRegisterResponse, FNFRegisterRow } from "@/features/payroll/types";

export type FNFRegisterGridColumn = { field: string; headerName: string; width: number; blnAmount?: boolean };
export type FNFRegisterGridRow = Record<string, string | number | null>;

/** Row field holding a component column's amount. */
export function componentField(strKey: string) {
  return `cmp:${strKey}`;
}

const lstLeadingColumns: FNFRegisterGridColumn[] = [
  { field: "strSettlementNumber", headerName: "Settlement #", width: 120 },
  { field: "strEmployeeCode", headerName: "Employee Code", width: 120 },
  { field: "strEmployeeName", headerName: "Employee", width: 170 },
  { field: "strDepartmentName", headerName: "Department", width: 150 },
  { field: "strDesignationName", headerName: "Designation", width: 170 },
  { field: "dtDateOfJoining", headerName: "Date of Joining", width: 120 },
  { field: "strExitType", headerName: "Exit Type", width: 120 },
  { field: "dtLastWorkingDate", headerName: "LWD", width: 110 },
  { field: "strServicePeriod", headerName: "Service Period", width: 150 },
  { field: "decNoticePeriodDays", headerName: "Notice Period (Days)", width: 120, blnAmount: true },
  { field: "decNoticeServedDays", headerName: "Notice Served (Days)", width: 120, blnAmount: true },
  { field: "decNoticeShortfallDays", headerName: "Notice Shortfall (Days)", width: 130, blnAmount: true },
  { field: "decLeaveEncashedDays", headerName: "Leave Days Encashed", width: 120, blnAmount: true },
  { field: "strSettlementStatus", headerName: "Status", width: 110 },
];

const lstSectionTotals: { strSection: FNFRegisterComponentColumn["strSection"]; field: keyof FNFRegisterRow; headerName: string }[] = [
  { strSection: "earning", field: "decTotalEarnings", headerName: "Earnings" },
  { strSection: "recovery", field: "decTotalRecoveries", headerName: "Recoveries" },
  { strSection: "deduction", field: "decTotalDeductions", headerName: "Deductions" },
];

const lstTrailingAmountColumns: { field: keyof FNFRegisterRow; headerName: string }[] = [
  { field: "decPfEmployee", headerName: "PF (Employee)" },
  { field: "decPfEmployer", headerName: "PF (Employer)" },
  { field: "decEsiEmployee", headerName: "ESI (Employee)" },
  { field: "decEsiEmployer", headerName: "ESI (Employer)" },
  { field: "decPt", headerName: "PT" },
  { field: "decLwf", headerName: "LWF" },
  { field: "decTds", headerName: "TDS" },
  { field: "decNetPayable", headerName: "Net Payable" },
  { field: "decNetRecoverable", headerName: "Net Recoverable" },
];

/**
 * F&F register grid (also what Export writes): each section's component columns (Basic, HRA, ... /
 * Notice recovery, ... / deductions) followed by that section's total, then PF / ESI / PT / LWF /
 * TDS and the net amounts.
 */
export function buildFNFRegisterColumns(lstComponentColumns: FNFRegisterComponentColumn[] = []): FNFRegisterGridColumn[] {
  const lstColumns: FNFRegisterGridColumn[] = [...lstLeadingColumns];
  for (const objTotal of lstSectionTotals) {
    for (const objComponent of lstComponentColumns.filter((objColumn) => objColumn.strSection === objTotal.strSection)) {
      lstColumns.push({ field: componentField(objComponent.strKey), headerName: objComponent.strLabel, width: 130, blnAmount: true });
    }
    lstColumns.push({ field: objTotal.field, headerName: objTotal.headerName, width: 120, blnAmount: true });
  }
  for (const objColumn of lstTrailingAmountColumns) {
    lstColumns.push({ field: objColumn.field, headerName: objColumn.headerName, width: 120, blnAmount: true });
  }
  lstColumns.push({ field: "dtPaidOn", headerName: "Paid On", width: 110 }, { field: "strPaymentReferenceNo", headerName: "Reference", width: 130 });
  return lstColumns;
}

/** Rows with every component amount on its own field (blank when the settlement has none). */
export function buildFNFRegisterRows(objRegister: FNFRegisterResponse | null): FNFRegisterGridRow[] {
  const lstComponentColumns = objRegister?.lstComponentColumns ?? [];
  return (objRegister?.lstRows ?? []).map((objRow, intIndex) => {
    const { dicComponents, ...dicRest } = objRow;
    const dicGridRow: FNFRegisterGridRow = {
      ...(dicRest as unknown as FNFRegisterGridRow),
      id: `${objRow.strSettlementNumber}-${intIndex}`,
      dtPaidOn: objRow.dtPaidOn ? objRow.dtPaidOn.slice(0, 10) : "",
      // Older backends do not send these; keep every exported column present.
      strDepartmentName: objRow.strDepartmentName ?? "",
      strDesignationName: objRow.strDesignationName ?? "",
      dtDateOfJoining: objRow.dtDateOfJoining ? objRow.dtDateOfJoining.slice(0, 10) : "",
      strServicePeriod: objRow.strServicePeriod ?? "",
      decNoticePeriodDays: objRow.decNoticePeriodDays ?? "",
      decNoticeServedDays: objRow.decNoticeServedDays ?? "",
      decNoticeShortfallDays: objRow.decNoticeShortfallDays ?? "",
      decLeaveEncashedDays: objRow.decLeaveEncashedDays ?? "",
    };
    for (const objColumn of lstComponentColumns) {
      const decAmount = dicComponents?.[objColumn.strKey];
      dicGridRow[componentField(objColumn.strKey)] = decAmount === undefined || decAmount === 0 ? "" : decAmount;
    }
    return dicGridRow;
  });
}
