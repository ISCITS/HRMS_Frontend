import { describe, expect, it } from "vitest";

import type { SalaryRegisterRow } from "@/features/reports/services/salaryRegisterReportService";

import { buildSalaryRegisterArrearLayout } from "./salaryRegisterArrearLayout";

// Backend row: Basic 10000 + HRA 4000 + Basic Arrear 2000 = gross 16000;
// PF 500 + PF on Arrears 240 = deduction 740; net 15260.
function makeRow(dicOverrides: Partial<SalaryRegisterRow> = {}): SalaryRegisterRow {
  return {
    intEmployeeID: 1, strEmployeeCode: "E001", strEmployeeName: "Employee One",
    strDepartment: null, strDesignation: null, strLocation: null, strAllocationEntity: null,
    strEmployeeCategory: null, strState: null, strPayCycle: null, strEmploymentStatus: null,
    strCostCenter: null, strGrade: null, strPaymentMode: null, strWorkgroup: null, strBankName: null,
    strBranchName: null, strAccountNumber: null, strIfscCode: null, strPanNumber: null, strUanNumber: null,
    strDataSource: "Processed", decTotalPresentDays: 31,
    dicPayments: { Basic: 10000, HRA: 4000, "Basic Arrear": 2000 },
    dicRecoveries: { PF: 500, "PF on Arrears": 240 },
    decGrossEarning: 16000, decGrossDeduction: 740, decNetEarning: 15260,
    blnStatutoryPending: false,
    ...dicOverrides,
  };
}

const lstPayments = ["Basic", "HRA", "Basic Arrear"];
const lstRecoveries = ["PF", "PF on Arrears"];
const lstArrears = ["Basic Arrear", "PF on Arrears"];

describe("salary register arrear toggle", () => {
  it("ON: arrears in their own columns, gross covers regular salary only", () => {
    const objLayout = buildSalaryRegisterArrearLayout(lstPayments, lstRecoveries, lstArrears, true);
    expect(objLayout.lstPaymentColumns).toEqual(["Basic", "HRA"]);
    expect(objLayout.lstArrearPaymentColumns).toEqual(["Basic Arrear"]);
    expect(objLayout.lstRecoveryColumns).toEqual(["PF"]);
    expect(objLayout.lstArrearRecoveryColumns).toEqual(["PF on Arrears"]);
    expect(objLayout.fnGrossEarning(makeRow())).toBe(14000);
    expect(objLayout.fnGrossDeduction(makeRow())).toBe(500);
  });

  it("OFF: arrear columns hidden, arrear amounts added into gross", () => {
    const objLayout = buildSalaryRegisterArrearLayout(lstPayments, lstRecoveries, lstArrears, false);
    expect(objLayout.lstPaymentColumns).toEqual(["Basic", "HRA"]);
    expect(objLayout.lstArrearPaymentColumns).toEqual([]);
    expect(objLayout.lstRecoveryColumns).toEqual(["PF"]);
    expect(objLayout.lstArrearRecoveryColumns).toEqual([]);
    expect(objLayout.fnGrossEarning(makeRow())).toBe(16000);
    expect(objLayout.fnGrossDeduction(makeRow())).toBe(740);
  });

  it("net pay is the same in both modes and foots in each", () => {
    const dicRow = makeRow();
    const objOn = buildSalaryRegisterArrearLayout(lstPayments, lstRecoveries, lstArrears, true);
    const objOff = buildSalaryRegisterArrearLayout(lstPayments, lstRecoveries, lstArrears, false);
    const decNetOn = objOn.fnGrossEarning(dicRow) + 2000 - (objOn.fnGrossDeduction(dicRow) + 240);
    const decNetOff = objOff.fnGrossEarning(dicRow) - objOff.fnGrossDeduction(dicRow);
    expect(decNetOn).toBe(dicRow.decNetEarning);
    expect(decNetOff).toBe(dicRow.decNetEarning);
  });

  it("employee without arrears shows the same gross in both modes", () => {
    const dicRow = makeRow({ dicPayments: { Basic: 10000, HRA: 4000 }, dicRecoveries: { PF: 500 }, decGrossEarning: 14000, decGrossDeduction: 500, decNetEarning: 13500 });
    const objOn = buildSalaryRegisterArrearLayout(lstPayments, lstRecoveries, lstArrears, true);
    const objOff = buildSalaryRegisterArrearLayout(lstPayments, lstRecoveries, lstArrears, false);
    expect(objOn.fnGrossEarning(dicRow)).toBe(14000);
    expect(objOff.fnGrossEarning(dicRow)).toBe(14000);
  });

  it("month with no arrear columns at all: toggle changes nothing", () => {
    const objOn = buildSalaryRegisterArrearLayout(["Basic"], ["PF"], [], true);
    const objOff = buildSalaryRegisterArrearLayout(["Basic"], ["PF"], [], false);
    const dicRow = makeRow({ dicPayments: { Basic: 10000 }, dicRecoveries: { PF: 500 }, decGrossEarning: 10000, decGrossDeduction: 500 });
    expect(objOn.lstPaymentColumns).toEqual(objOff.lstPaymentColumns);
    expect(objOn.fnGrossEarning(dicRow)).toBe(objOff.fnGrossEarning(dicRow));
  });

  it("keeps paise precise when removing arrears", () => {
    const dicRow = makeRow({ dicPayments: { Basic: 10000.1, "Basic Arrear": 1234.57 }, decGrossEarning: 11234.67 });
    const objOn = buildSalaryRegisterArrearLayout(["Basic", "Basic Arrear"], [], ["Basic Arrear"], true);
    expect(objOn.fnGrossEarning(dicRow)).toBe(10000.1);
  });
});
