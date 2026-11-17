import { describe, expect, it } from "vitest";

import type { Form14Register } from "@/features/reports/services/form14ReportService";

import {
  buildForm14Footer,
  buildForm14Grid,
  buildForm14HeaderBlocks,
  fmtDate,
  fmtMoney,
  fmtNum,
} from "./form14Grid";

function makeRegister(dicOverrides: Partial<Form14Register> = {}): Form14Register {
  const lstMonths = Array.from({ length: 12 }, (_, intIndex) => ({ intMonth: intIndex + 1, blnHasData: false }));
  return {
    intYear: 2026,
    intEmployeeID: 7,
    blnLocked: false,
    dicHeader: {
      intYear: 2026, strSerialNo: 4, strDepartment: "Weaving", strAdultChild: "Adult", dtDateOfEntry: "2019-06-03",
      strRegisterNo: "R-4", strEmployeeCode: "E004", strName: "Asha Patel", strFatherName: "Ramesh Patel",
      dtDateOfDischarge: null, dtEncashmentDate: null, decEncashmentAmount: null, strFactoryName: "Acme Mills",
      strState: "Gujarat", strRuleReference: "Rule 102", strRegime: "FACTORIES_ACT", blnShowAdditionalColumns: true,
      lstAdditionalLeaveTypes: ["CL", "SL"],
    },
    dicOpening: { decBalance: 12, decEarned: 6.5, decTotal: 18.5, decRefused798: 0, dicAdditional: { CL: 3 } },
    lstMonths: [
      {
        intMonth: 1, blnHasData: true, decWagesEarned: 12000, decWorked: 24, decLayoff: 0, decMaternity: 0, decEl: 3, decTotal: 27, decBalance: 15.5,
        lstElTxns: [
          { dtFrom: "2026-01-05", dtTo: "2026-01-06", decDays: 2, blnRefusedUnder798: false, decNormalRate: 480, decConcessionRate: 0, decLeaveWageRate: 480 },
          { dtFrom: "2026-01-20", dtTo: "2026-01-20", decDays: 0.5, blnRefusedUnder798: true, decNormalRate: 480, decConcessionRate: 20, decLeaveWageRate: 500 },
        ],
        dicAdditional: { decWeeklyOffHoliday: 4, CL: 1, SL: 0, intCalendarDays: 31 },
      },
      ...lstMonths.slice(1),
    ],
    dicTotals: { decWagesEarned: 12000, decWorked: 24, decLayoff: 0, decMaternity: 0, decEl: 3, decTotal: 27, decElDays: 2.5, decWeeklyOffHoliday: 4, decCalendarDays: 31 },
    dicAdditionalTotals: { CL: 1, SL: 0 },
    dicSummary: { decQualifyingDays: 24, intEligibilityDays: 240, decCarryForwardCap: 30, blnClosed: false },
    lstIssues: [],
    ...dicOverrides,
  };
}

describe("form14 number formatting", () => {
  it("prints whole and half days, blank for missing", () => {
    expect(fmtNum(24)).toBe("24");
    expect(fmtNum(20.5)).toBe("20.5");
    expect(fmtNum(null)).toBe("");
    expect(fmtNum(undefined)).toBe("");
    expect(fmtNum(0)).toBe("0");
  });

  it("blanks a real zero only when asked", () => {
    expect(fmtNum(0, true)).toBe("");
    expect(fmtNum(2, true)).toBe("2");
  });

  it("formats money with separators and blanks zero", () => {
    expect(fmtMoney(12000)).toBe("12,000.00");
    expect(fmtMoney(0)).toBe("");
    expect(fmtMoney(null)).toBe("");
  });

  it("formats ISO dates as dd/mm/yyyy", () => {
    expect(fmtDate("2026-01-05")).toBe("05/01/2026");
    expect(fmtDate("2026-01-05T10:00:00")).toBe("05/01/2026");
    expect(fmtDate(null)).toBe("");
    expect(fmtDate("not a date")).toBe("not a date");
  });
});

describe("buildForm14Grid", () => {
  it("builds opening, 12 months with expanded EL rows, and totals", () => {
    const dicGrid = buildForm14Grid(makeRegister());
    // opening + Jan (2 EL txns -> 2 rows) + 11 empty months
    expect(dicGrid.lstBody).toHaveLength(1 + 2 + 11);
    expect(dicGrid.intStatutoryCols).toBe(19);
    expect(dicGrid.intAdditionalCols).toBe(4);
    expect(dicGrid.lstBody.every((lstRow) => lstRow.length === 23)).toBe(true);
    expect(dicGrid.lstNumbers).toHaveLength(23);
    expect(dicGrid.lstNumbers[18]).toBe("19");
    expect(dicGrid.lstNumbers[19]).toBe("A1");
    expect(dicGrid.lstLabels[19]).toBe("Weekly off / holiday");
    expect(dicGrid.lstLabels[22]).toBe("Calendar days");
    expect(dicGrid.lstGroups).toEqual([
      ["No. of days worked during the calendar year", 3, 6],
      ["Leave to credit", 8, 9],
      ["Leave enjoyed", 12, 14],
    ]);
  });

  it("fills the opening row in cols 9, 10, 11 and 16", () => {
    const lstOpening = buildForm14Grid(makeRegister()).lstBody[0];
    expect(lstOpening[1]).toBe("Opening");
    expect([lstOpening[8], lstOpening[9], lstOpening[10], lstOpening[15]]).toEqual(["12", "6.5", "18.5", "18.5"]);
    expect(lstOpening[11]).toBe("");
    expect(lstOpening.slice(19)).toEqual(["", "3", "", ""]);
  });

  it("puts the first EL transaction on the month row and extras on continuation rows", () => {
    const lstBody = buildForm14Grid(makeRegister()).lstBody;
    const lstJan = lstBody[1];
    const lstExtra = lstBody[2];
    expect(lstJan.slice(0, 8)).toEqual(["2026", "Jan", "12,000.00", "24", "", "", "3", "27"]);
    expect(lstJan.slice(11, 19)).toEqual(["No", "05/01/2026", "06/01/2026", "2", "15.5", "480.00", "", "480.00"]);
    expect(lstJan.slice(19)).toEqual(["4", "1", "", "31"]);
    expect(lstExtra.slice(0, 11).every((strCell) => strCell === "")).toBe(true);
    expect(lstExtra.slice(11, 19)).toEqual(["Yes", "20/01/2026", "20/01/2026", "0.5", "", "480.00", "20.00", "500.00"]);
    expect(lstExtra.slice(19)).toEqual(["", "", "", ""]);
  });

  it("leaves months without data blank rather than 0", () => {
    const lstFeb = buildForm14Grid(makeRegister()).lstBody[3];
    expect(lstFeb.slice(0, 2)).toEqual(["2026", "Feb"]);
    expect(lstFeb.slice(2).every((strCell) => strCell === "")).toBe(true);
  });

  it("totals row blanks zero for lay-off, maternity and leave types", () => {
    const lstTotals = buildForm14Grid(makeRegister()).lstTotals;
    expect(lstTotals.slice(0, 8)).toEqual(["", "Total", "12,000.00", "24", "", "", "3", "27"]);
    expect(lstTotals[14]).toBe("2.5");
    expect(lstTotals.slice(19)).toEqual(["4", "1", "", "31"]);
  });

  it("prints a totals row of nothing when no month has data", () => {
    const dicEmpty = makeRegister({ lstMonths: Array.from({ length: 12 }, (_, intIndex) => ({ intMonth: intIndex + 1, blnHasData: false })) });
    const lstTotals = buildForm14Grid(dicEmpty).lstTotals;
    expect(lstTotals[1]).toBe("Total");
    expect(lstTotals.slice(2).every((strCell) => strCell === "")).toBe(true);
  });

  it("drops the additional block when hidden, whatever the register default says", () => {
    const dicGrid = buildForm14Grid(makeRegister(), false);
    expect(dicGrid.intAdditionalCols).toBe(0);
    expect(dicGrid.lstNumbers).toHaveLength(19);
    expect(dicGrid.lstBody.every((lstRow) => lstRow.length === 19)).toBe(true);
    expect(buildForm14Grid(makeRegister()).intAdditionalCols).toBe(4);
  });

  it("shows the additional block from the register default when no override is given", () => {
    const dicRegister = makeRegister();
    dicRegister.dicHeader.blnShowAdditionalColumns = false;
    expect(buildForm14Grid(dicRegister).intAdditionalCols).toBe(0);
    expect(buildForm14Grid(dicRegister, true).intAdditionalCols).toBe(4);
  });

  it("prints the refused s.79(8) balance on the opening row when present", () => {
    const dicRegister = makeRegister();
    dicRegister.dicOpening.decRefused798 = 2;
    expect(buildForm14Grid(dicRegister).lstBody[0][11]).toBe("2");
  });
});

describe("form14 footer and header blocks", () => {
  it("shows the year-end placeholder until the year is closed", () => {
    const dicFooter = buildForm14Footer(makeRegister());
    expect(dicFooter.strQualifying).toBe("Qualifying days 24 / 240");
    expect(dicFooter.strEarned).toBe("Leave earned for next year: At year-end close");
    expect(dicFooter.strCarry).toBe("Carry forward (cap 30): At year-end close");
    expect(dicFooter.strCentre1).toBe("Form No. 14");
    expect(dicFooter.strCentre2).toBe("(Rule No. 102 · Gujarat Factories Rules)");
    expect(dicFooter.strCentre3).toBe("LEAVE WITH WAGES REGISTER");
    expect(dicFooter.strCentre4).toBe("Name of Factory: Acme Mills");
    expect(dicFooter.strCentre5).toBe("Calendar year: 2026");
  });

  it("shows the closed values once the year is locked", () => {
    const dicRegister = makeRegister();
    dicRegister.dicSummary = { ...dicRegister.dicSummary, blnClosed: true, decEarnedForNextYear: 12, decCarryForward: 24.5 };
    const dicFooter = buildForm14Footer(dicRegister);
    expect(dicFooter.strEarned).toBe("Leave earned for next year: 12");
    expect(dicFooter.strCarry).toBe("Carry forward (cap 30): 24.5");
  });

  it("falls back to dashes for a missing state, factory and rule", () => {
    const dicRegister = makeRegister();
    dicRegister.dicHeader = { ...dicRegister.dicHeader, strState: "", strFactoryName: "", strRuleReference: "Rule" };
    const dicFooter = buildForm14Footer(dicRegister);
    expect(dicFooter.strCentre2).toBe("(Rule No. - · - Factories Rules)");
    expect(dicFooter.strCentre4).toBe("Name of Factory: -");
  });

  it("builds the header blocks", () => {
    const dicBlocks = buildForm14HeaderBlocks(makeRegister());
    expect(dicBlocks.lstLeft).toEqual([
      ["S.No", "4"], ["Department", "Weaving"], ["Adult / Child", "Adult"], ["Date of entry into service", "03/06/2019"],
    ]);
    expect(dicBlocks.lstRight[0]).toEqual(["Register No. / Emp code", "R-4  (E004)"]);
    expect(dicBlocks.lstRight[3]).toEqual(["Date of discharge", ""]);
    expect(dicBlocks.lstRight[4]).toEqual(["Date & amount of payment in lieu of leave", ""]);
  });

  it("shows date and amount of payment in lieu of leave when present", () => {
    const dicRegister = makeRegister();
    dicRegister.dicHeader = { ...dicRegister.dicHeader, dtEncashmentDate: "2026-03-31", decEncashmentAmount: 4500 };
    expect(buildForm14HeaderBlocks(dicRegister).lstRight[4][1]).toBe("31/03/2026  ₹ 4,500.00");
  });
});
