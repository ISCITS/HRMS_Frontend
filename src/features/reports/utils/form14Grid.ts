import type { Form14Register } from "@/features/reports/services/form14ReportService";

// Pure mapping of one Form 14 register onto the printed page. Mirrors Form14Export.buildGrid /
// footerFacts / headerBlocks in the backend so the on-screen preview matches the PDF and Excel.

export const form14Months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const form14StatutoryLabels = [
  "Calendar year", "Wages period (month)", "Wages earned", "Days worked", "Lay-off days", "Maternity leave",
  "EL enjoyed", "Total of cols 4-7", "Balance from previous year", "Earned during year", "Total of cols 9-10",
  "Leave refused u/s 79(8)?", "From", "To", "Days", "Balance of leave", "Normal rate of wages / day",
  "Cash equivalent of concessions", "Leave wage rate / day",
];

export const form14AdditionalTitle = "Additional – company use (not part of statutory form)";
export const form14SeparatePageNote = "Separate page is allotted to each worker";
export const form14StatutoryColumnCount = 19;

type NumLike = number | string | null | undefined;

// Days: 24 -> "24", 20.5 -> "20.5". Blank (not 0) for missing; blnBlankZero also blanks a real 0.
export function fmtNum(objValue: NumLike, blnBlankZero = false): string {
  if (objValue === null || objValue === undefined || objValue === "") {
    return "";
  }
  const decValue = Number(objValue);
  if (Number.isNaN(decValue) || (blnBlankZero && decValue === 0)) {
    return "";
  }
  return Number.isInteger(decValue) ? String(decValue) : String(Number(decValue.toPrecision(6)));
}

// Money prints blank for missing or zero, otherwise 2 decimals with thousands separators.
export function fmtMoney(objValue: NumLike): string {
  if (objValue === null || objValue === undefined || objValue === "" || Number(objValue) === 0) {
    return "";
  }
  return Number(objValue).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ISO date -> dd/mm/yyyy; anything that is not an ISO date is returned as it came.
export function fmtDate(strIso: string | null | undefined): string {
  if (!strIso) {
    return "";
  }
  const objMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(strIso);
  return objMatch ? `${objMatch[3]}/${objMatch[2]}/${objMatch[1]}` : strIso;
}

export type Form14Grid = {
  lstLabels: string[];
  lstNumbers: string[];
  // [label, first column index, last column index] - zero-based, same as the backend.
  lstGroups: Array<[string, number, number]>;
  intStatutoryCols: number;
  intAdditionalCols: number;
  strAdditionalTitle: string;
  lstBody: string[][];
  lstTotals: string[];
};

export function buildForm14Grid(dicRegister: Form14Register, blnAdditional?: boolean): Form14Grid {
  const dicHeader = dicRegister.dicHeader;
  const blnShowAdditional = blnAdditional ?? dicHeader.blnShowAdditionalColumns;
  const lstTypes = [...dicHeader.lstAdditionalLeaveTypes];
  const intYear = dicRegister.intYear;
  const dicOpening = dicRegister.dicOpening;
  const dicTotals = dicRegister.dicTotals;
  const lstBlank = (intCount: number) => new Array<string>(intCount).fill("");

  function additionalCells(
    dicValues: Record<string, NumLike> | null,
    dicOpeningExtra?: Record<string, NumLike>,
    dicTotal?: { decWeeklyOffHoliday: NumLike; decCalendarDays: NumLike; types: Record<string, NumLike> },
  ): string[] {
    if (!blnShowAdditional) {
      return [];
    }
    if (dicTotal) {
      return [fmtNum(dicTotal.decWeeklyOffHoliday, true), ...lstTypes.map((strType) => fmtNum(dicTotal.types[strType], true)), fmtNum(dicTotal.decCalendarDays, true)];
    }
    if (dicOpeningExtra) {
      return ["", ...lstTypes.map((strType) => fmtNum(dicOpeningExtra[strType])), ""];
    }
    const dicSafe = dicValues ?? {};
    return [fmtNum(dicSafe.decWeeklyOffHoliday, true), ...lstTypes.map((strType) => fmtNum(dicSafe[strType], true)), fmtNum(dicSafe.intCalendarDays)];
  }

  const lstBody: string[][] = [];
  const strRefused = dicOpening.decRefused798 ? fmtNum(dicOpening.decRefused798) : "";
  lstBody.push([
    "", "Opening", "", "", "", "", "", "", fmtNum(dicOpening.decBalance), fmtNum(dicOpening.decEarned), fmtNum(dicOpening.decTotal),
    strRefused, "", "", "", fmtNum(dicOpening.decTotal), "", "", "",
    ...additionalCells(null, dicOpening.dicAdditional ?? {}),
  ]);

  for (const dicMonth of dicRegister.lstMonths) {
    const lstTxns = dicMonth.lstElTxns ?? [];
    const blnData = dicMonth.blnHasData;
    const dicAdd = dicMonth.dicAdditional ?? {};
    const lstFirst = [
      String(intYear), form14Months[dicMonth.intMonth - 1] ?? "",
      blnData ? fmtMoney(dicMonth.decWagesEarned) : "",
      fmtNum(dicMonth.decWorked), fmtNum(dicMonth.decLayoff, true), fmtNum(dicMonth.decMaternity, true), fmtNum(dicMonth.decEl, true),
      fmtNum(dicMonth.decTotal), "", "", "", "", "", "", "", fmtNum(dicMonth.decBalance), "", "", "",
    ];
    const lstAdd = blnData ? additionalCells(dicAdd) : (blnShowAdditional ? lstBlank(lstTypes.length + 2) : []);
    if (lstTxns.length > 0) {
      lstTxns.forEach((dicTxn, intIndex) => {
        const lstRow = intIndex === 0 ? [...lstFirst] : lstBlank(form14StatutoryColumnCount);
        lstRow[11] = dicTxn.blnRefusedUnder798 ? "Yes" : "No";
        lstRow[12] = fmtDate(dicTxn.dtFrom);
        lstRow[13] = fmtDate(dicTxn.dtTo);
        lstRow[14] = fmtNum(dicTxn.decDays);
        lstRow[15] = intIndex === 0 ? fmtNum(dicMonth.decBalance) : "";
        lstRow[16] = fmtMoney(dicTxn.decNormalRate);
        lstRow[17] = fmtMoney(dicTxn.decConcessionRate);
        lstRow[18] = fmtMoney(dicTxn.decLeaveWageRate);
        lstBody.push([...lstRow, ...(intIndex === 0 ? lstAdd : lstBlank(lstAdd.length))]);
      });
    } else {
      lstBody.push([...lstFirst, ...lstAdd]);
    }
  }

  let lstTotals = [
    "", "Total", fmtMoney(dicTotals.decWagesEarned), fmtNum(dicTotals.decWorked), fmtNum(dicTotals.decLayoff, true),
    fmtNum(dicTotals.decMaternity, true), fmtNum(dicTotals.decEl, true), fmtNum(dicTotals.decTotal), "", "", "", "", "", "",
    fmtNum(dicTotals.decElDays, true), "", "", "", "",
    ...additionalCells(null, undefined, {
      decWeeklyOffHoliday: dicTotals.decWeeklyOffHoliday,
      decCalendarDays: dicTotals.decCalendarDays,
      types: dicRegister.dicAdditionalTotals ?? {},
    }),
  ];
  // Months with no data print a total of nothing rather than 0.
  if (!dicRegister.lstMonths.some((dicMonth) => dicMonth.blnHasData)) {
    lstTotals = ["", "Total", ...lstBlank(lstTotals.length - 2)];
  }

  const lstAddLabels = blnShowAdditional ? ["Weekly off / holiday", ...lstTypes, "Calendar days"] : [];
  const lstNumbers = [
    ...Array.from({ length: form14StatutoryColumnCount }, (_, intIndex) => String(intIndex + 1)),
    ...lstAddLabels.map((_, intIndex) => `A${intIndex + 1}`),
  ];
  return {
    lstLabels: [...form14StatutoryLabels, ...lstAddLabels],
    lstNumbers,
    lstGroups: [["No. of days worked during the calendar year", 3, 6], ["Leave to credit", 8, 9], ["Leave enjoyed", 12, 14]],
    intStatutoryCols: form14StatutoryColumnCount,
    intAdditionalCols: lstAddLabels.length,
    strAdditionalTitle: form14AdditionalTitle,
    lstBody,
    lstTotals,
  };
}

export type Form14Footer = {
  strQualifying: string;
  strEarned: string;
  strCarry: string;
  strCentre1: string;
  strCentre2: string;
  strCentre3: string;
  strCentre4: string;
  strCentre5: string;
};

const strAtClose = "At year-end close";

export function buildForm14Footer(dicRegister: Form14Register): Form14Footer {
  const dicSummary = dicRegister.dicSummary;
  const dicHeader = dicRegister.dicHeader;
  const blnClosed = Boolean(dicSummary.blnClosed);
  const strRule = (dicHeader.strRuleReference ?? "").replace("Rule", "").trim() || "-";
  return {
    strQualifying: `Qualifying days ${fmtNum(dicSummary.decQualifyingDays)} / ${dicSummary.intEligibilityDays}`,
    strEarned: `Leave earned for next year: ${blnClosed ? fmtNum(dicSummary.decEarnedForNextYear) : strAtClose}`,
    strCarry: `Carry forward (cap ${fmtNum(dicSummary.decCarryForwardCap)}): ${blnClosed ? fmtNum(dicSummary.decCarryForward) : strAtClose}`,
    strCentre1: "Form No. 14",
    strCentre2: `(Rule No. ${strRule} · ${dicHeader.strState || "-"} Factories Rules)`,
    strCentre3: "LEAVE WITH WAGES REGISTER",
    strCentre4: `Name of Factory: ${dicHeader.strFactoryName || "-"}`,
    strCentre5: `Calendar year: ${dicRegister.intYear}`,
  };
}

export type Form14HeaderBlocks = {
  lstLeft: Array<[string, string]>;
  lstRight: Array<[string, string]>;
};

// Label / value pairs of the left and right header blocks.
export function buildForm14HeaderBlocks(dicRegister: Form14Register): Form14HeaderBlocks {
  const dicHeader = dicRegister.dicHeader;
  const strPaid = dicHeader.decEncashmentAmount !== null && dicHeader.decEncashmentAmount !== undefined
    ? `${fmtDate(dicHeader.dtEncashmentDate)}  ₹ ${fmtMoney(dicHeader.decEncashmentAmount)}`
    : "";
  return {
    lstLeft: [
      ["S.No", dicHeader.strSerialNo !== null && dicHeader.strSerialNo !== undefined ? String(dicHeader.strSerialNo) : ""],
      ["Department", dicHeader.strDepartment ?? ""],
      ["Adult / Child", dicHeader.strAdultChild ?? ""],
      ["Date of entry into service", fmtDate(dicHeader.dtDateOfEntry)],
    ],
    lstRight: [
      ["Register No. / Emp code", `${dicHeader.strRegisterNo}  (${dicHeader.strEmployeeCode})`],
      ["Name", dicHeader.strName],
      ["Father's name", dicHeader.strFatherName ?? ""],
      ["Date of discharge", fmtDate(dicHeader.dtDateOfDischarge)],
      ["Date & amount of payment in lieu of leave", strPaid],
    ],
  };
}
