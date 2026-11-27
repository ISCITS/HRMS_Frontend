import { describe, expect, it } from "vitest";

import type { SalaryRegisterRow } from "@/features/reports/services/salaryRegisterReportService";

import { buildSalaryRegisterArrearLayout } from "./salaryRegisterArrearLayout";
import { buildSalaryRegisterWorkbook, formatDateOfJoining } from "./salaryRegisterExcel";

function makeRow(dicOverrides: Partial<SalaryRegisterRow>): SalaryRegisterRow {
  return {
    intEmployeeID: 1, strEmployeeCode: "E001", strEmployeeName: "Asha", strDepartment: null,
    strDesignation: null, strLocation: null, strAllocationEntity: null, strEmployeeCategory: null,
    strState: null, strPayCycle: null, strEmploymentStatus: null, strCostCenter: null, strGrade: null,
    strPaymentMode: null, strWorkgroup: null, strBankName: null, strBranchName: null, strAccountNumber: null,
    strIfscCode: null, strPanNumber: null, strUanNumber: null, strDataSource: "Processed", decTotalPresentDays: 30,
    dicPayments: {}, dicRecoveries: {}, decGrossEarning: 0, decGrossDeduction: 0, decNetEarning: 0,
    blnStatutoryPending: false,
    ...dicOverrides,
  };
}

// Asha: Basic 10000 + HRA 4000 + Basic Arrear 2000; PF 500 + PF on Arrears 240; net 15260.
// Ben (no arrears): Basic 8000 + HRA 3000; PF 400; net 10600.
const lstRows = [
  makeRow({
    intEmployeeID: 1, strEmployeeCode: "E001", strEmployeeName: "Asha", dtDateOfJoining: "2007-09-01",
    dicPayments: { Basic: 10000, HRA: 4000, "Basic Arrear": 2000 }, dicRecoveries: { PF: 500, "PF on Arrears": 240 },
    decGrossEarning: 16000, decGrossDeduction: 740, decNetEarning: 15260,
  }),
  makeRow({
    intEmployeeID: 2, strEmployeeCode: "E002", strEmployeeName: "Ben",
    dicPayments: { Basic: 8000, HRA: 3000 }, dicRecoveries: { PF: 400 },
    decGrossEarning: 11000, decGrossDeduction: 400, decNetEarning: 10600,
  }),
];
const lstPayments = ["Basic", "HRA", "Basic Arrear"];
const lstRecoveries = ["PF", "PF on Arrears"];
const lstArrears = ["Basic Arrear", "PF on Arrears"];

// Reads the sheet back as { header labels -> value } per data row, plus the Grand Total row.
async function readSheet(blnShowArrearColumns: boolean) {
  const objLayout = buildSalaryRegisterArrearLayout(lstPayments, lstRecoveries, lstArrears, blnShowArrearColumns);
  const objWorkbook = await buildSalaryRegisterWorkbook(lstRows, objLayout, "Acme", "October 2026");
  const objSheet = objWorkbook.getWorksheet("Salary Register")!;
  let intHeaderRow = 0;
  objSheet.eachRow((objRow, intRowNumber) => { if (objRow.getCell(1).value === "Sl No") intHeaderRow = intRowNumber; });
  const lstHeaders = (objSheet.getRow(intHeaderRow).values as unknown[]).slice(1).map(String);
  const fnRead = (intRowNumber: number) => {
    const lstValues = (objSheet.getRow(intRowNumber).values as unknown[]).slice(1);
    return Object.fromEntries(lstHeaders.map((strHeader, intIndex) => [strHeader, lstValues[intIndex] ?? null]));
  };
  return {
    lstHeaders,
    dicAsha: fnRead(intHeaderRow + 1), // rows are sorted by name: Asha, Ben
    dicBen: fnRead(intHeaderRow + 2),
    dicTotal: fnRead(intHeaderRow + 3),
  };
}

function amountColumns(lstHeaders: string[]) {
  return lstHeaders.slice(lstHeaders.indexOf("Negative Salary Dtl") + 1, lstHeaders.indexOf("Salary Released For"));
}

describe("salary register Excel follows the arrear toggle", () => {
  it("ON: arrear columns after their gross, gross = regular salary only", async () => {
    const { lstHeaders, dicAsha, dicBen, dicTotal } = await readSheet(true);
    expect(amountColumns(lstHeaders)).toEqual([
      "Basic", "HRA", "Gross Earning", "Basic Arrear",
      "PF", "Gross Deduction", "PF on Arrears", "Net Earning",
    ]);
    expect(dicAsha["Employee Name"]).toBe("Asha");
    expect(dicAsha["Gross Earning"]).toBe(14000);
    expect(dicAsha["Basic Arrear"]).toBe(2000);
    expect(dicAsha["Gross Deduction"]).toBe(500);
    expect(dicAsha["PF on Arrears"]).toBe(240);
    expect(dicAsha["Net Earning"]).toBe(15260);
    expect(dicBen["Gross Earning"]).toBe(11000);
    expect(dicBen["Basic Arrear"]).toBeNull();
    expect(dicTotal["Gross Earning"]).toBe(25000);
    expect(dicTotal["Basic Arrear"]).toBe(2000);
    expect(dicTotal["Gross Deduction"]).toBe(900);
    expect(dicTotal["PF on Arrears"]).toBe(240);
    expect(dicTotal["Net Earning"]).toBe(25860);
  });

  it("OFF: no arrear columns, arrear amounts added into gross", async () => {
    const { lstHeaders, dicAsha, dicBen, dicTotal } = await readSheet(false);
    expect(amountColumns(lstHeaders)).toEqual([
      "Basic", "HRA", "Gross Earning", "PF", "Gross Deduction", "Net Earning",
    ]);
    expect(lstHeaders).not.toContain("Basic Arrear");
    expect(lstHeaders).not.toContain("PF on Arrears");
    expect(dicAsha["Gross Earning"]).toBe(16000);
    expect(dicAsha["Gross Deduction"]).toBe(740);
    expect(dicAsha["Net Earning"]).toBe(15260);
    expect(dicBen["Gross Earning"]).toBe(11000);
    expect(dicTotal["Gross Earning"]).toBe(27000);
    expect(dicTotal["Gross Deduction"]).toBe(1140);
    expect(dicTotal["Net Earning"]).toBe(25860);
  });

  it("lists Date of Joining after Employee Name as a real date, blank when missing", async () => {
    const objLayout = buildSalaryRegisterArrearLayout(lstPayments, lstRecoveries, lstArrears, true);
    const objWorkbook = await buildSalaryRegisterWorkbook(lstRows, objLayout, "Acme", "October 2026");
    const objSheet = objWorkbook.getWorksheet("Salary Register")!;
    const { lstHeaders, dicAsha, dicBen, dicTotal } = await readSheet(true);
    expect(lstHeaders.slice(0, 5)).toEqual(["Sl No", "Employee No", "Employee Name", "Date of Joining", "Status"]);
    const objJoined = dicAsha["Date of Joining"] as Date;
    expect(objJoined).toBeInstanceOf(Date);
    expect(objJoined.toISOString().slice(0, 10)).toBe("2007-09-01");
    expect(dicBen["Date of Joining"]).toBeNull();
    expect(dicTotal["Employee Name"]).toBe("Grand Total"); // merged leading cells still span the new column
    let intAshaRow = 0;
    objSheet.eachRow((objRow, intRowNumber) => { if (objRow.getCell(3).value === "Asha") intAshaRow = intRowNumber; });
    expect(objSheet.getRow(intAshaRow).getCell(4).numFmt).toBe("dd-mmm-yyyy");
  });

  it("formats the joining date for the screen", () => {
    expect(formatDateOfJoining("2007-09-01")).toBe("01-Sep-2007");
    expect(formatDateOfJoining("2026-12-31T00:00:00")).toBe("31-Dec-2026");
    expect(formatDateOfJoining(null)).toBe("");
    expect(formatDateOfJoining("not a date")).toBe("");
  });

  it("each data row foots in both modes: earnings - deductions = Net Earning", async () => {
    for (const blnShow of [true, false]) {
      const { lstHeaders, dicAsha, dicBen, dicTotal } = await readSheet(blnShow);
      for (const dicRow of [dicAsha, dicBen, dicTotal]) {
        const decArrearEarning = lstHeaders.includes("Basic Arrear") ? Number(dicRow["Basic Arrear"] || 0) : 0;
        const decArrearDeduction = lstHeaders.includes("PF on Arrears") ? Number(dicRow["PF on Arrears"] || 0) : 0;
        const decNet = Number(dicRow["Gross Earning"]) + decArrearEarning - Number(dicRow["Gross Deduction"]) - decArrearDeduction;
        expect(decNet).toBe(Number(dicRow["Net Earning"]));
      }
    }
  });
});
