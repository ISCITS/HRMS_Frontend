import { describe, expect, it } from "vitest";

import type { FNFRegisterResponse, FNFRegisterRow } from "@/features/payroll/types";

import { buildFNFRegisterColumns, buildFNFRegisterRows, componentField } from "./fnfRegisterGrid";

function makeRow(dicOverrides: Partial<FNFRegisterRow>): FNFRegisterRow {
  return {
    strRecordUUID: "u1", strSettlementNumber: "FNF-1", strEmployeeCode: "E001", strEmployeeName: "Asha", strExitType: "resignation",
    dtLastWorkingDate: "2026-10-31", strSettlementStatus: "calculated", dtPaidOn: null, strPaymentReferenceNo: null,
    decTotalEarnings: 0, decTotalDeductions: 0, decTotalRecoveries: 0, decPfEmployee: 0, decPfEmployer: 0, decEsiEmployee: 0,
    decEsiEmployer: 0, decPt: 0, decLwf: 0, decTds: 0, decNetPayable: 0, decNetRecoverable: 0,
    ...dicOverrides,
  };
}

const objRegister: FNFRegisterResponse = {
  lstComponentColumns: [
    { strKey: "earning:Basic", strLabel: "Basic", strSection: "earning" },
    { strKey: "earning:HRA", strLabel: "HRA", strSection: "earning" },
    { strKey: "earning:Leave Encashment - Earned Leave", strLabel: "Leave Encashment - Earned Leave", strSection: "earning" },
    { strKey: "recovery:Notice recovery", strLabel: "Notice recovery", strSection: "recovery" },
    { strKey: "deduction:Canteen", strLabel: "Canteen", strSection: "deduction" },
  ],
  dicTotals: {},
  lstRows: [
    makeRow({ strSettlementNumber: "FNF-1", decTotalEarnings: 23000, dicComponents: { "earning:Basic": 15000, "earning:HRA": 6000, "earning:Leave Encashment - Earned Leave": 2000 } }),
    makeRow({ strSettlementNumber: "FNF-2", strEmployeeName: "Ben", dicComponents: { "earning:Basic": 9000, "recovery:Notice recovery": 4000, "deduction:Canteen": 300 } }),
  ],
};

describe("F&F register grid", () => {
  it("puts each section's component columns before that section's total", () => {
    const lstHeaders = buildFNFRegisterColumns(objRegister.lstComponentColumns).map((objColumn) => objColumn.headerName);
    expect(lstHeaders).toEqual([
      "Settlement #", "Employee Code", "Employee", "Department", "Designation", "Date of Joining", "Exit Type", "LWD",
      "Service Period", "Notice Period (Days)", "Notice Served (Days)", "Notice Shortfall (Days)", "Leave Days Encashed", "Status",
      "Basic", "HRA", "Leave Encashment - Earned Leave", "Earnings",
      "Notice recovery", "Recoveries",
      "Canteen", "Deductions",
      "PF (Employee)", "PF (Employer)", "ESI (Employee)", "ESI (Employer)", "PT", "LWF", "TDS", "Net Payable", "Net Recoverable",
      "Paid On", "Reference",
    ]);
  });

  it("gives every row each component amount on its own field (blank when absent)", () => {
    const [objFirst, objSecond] = buildFNFRegisterRows(objRegister);
    expect(objFirst[componentField("earning:Basic")]).toBe(15000);
    expect(objFirst[componentField("earning:HRA")]).toBe(6000);
    expect(objFirst[componentField("recovery:Notice recovery")]).toBe("");
    expect(objSecond[componentField("earning:HRA")]).toBe("");
    expect(objSecond[componentField("deduction:Canteen")]).toBe(300);
    expect(objFirst).not.toHaveProperty("dicComponents");
  });

  it("export rows carry a value for every column (as the grid's CSV export reads row[field])", () => {
    const lstColumns = buildFNFRegisterColumns(objRegister.lstComponentColumns);
    for (const objRow of buildFNFRegisterRows(objRegister)) {
      for (const objColumn of lstColumns) expect(objRow).toHaveProperty(objColumn.field);
    }
  });

  it("works with an older backend that sends no component columns", () => {
    const lstHeaders = buildFNFRegisterColumns(undefined).map((objColumn) => objColumn.headerName);
    expect(lstHeaders.slice(14, 17)).toEqual(["Earnings", "Recoveries", "Deductions"]);
    const [objRow] = buildFNFRegisterRows({ lstRows: [makeRow({})], dicTotals: {} });
    expect(objRow.strDepartmentName).toBe("");
    expect(objRow.decLeaveEncashedDays).toBe("");
  });

  it("shows employee details and day counts", () => {
    const [objRow] = buildFNFRegisterRows({
      dicTotals: {},
      lstRows: [makeRow({
        strDepartmentName: "Accounts", strDesignationName: "Executive", dtDateOfJoining: "2020-01-01", strServicePeriod: "6 years 9 months",
        decNoticePeriodDays: 60, decNoticeServedDays: 45, decNoticeShortfallDays: 15, decLeaveEncashedDays: 12.5,
      })],
    });
    expect(objRow).toMatchObject({
      strDepartmentName: "Accounts", strDesignationName: "Executive", dtDateOfJoining: "2020-01-01", strServicePeriod: "6 years 9 months",
      decNoticePeriodDays: 60, decNoticeServedDays: 45, decNoticeShortfallDays: 15, decLeaveEncashedDays: 12.5,
    });
  });
});
