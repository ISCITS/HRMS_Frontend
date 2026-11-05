// Payslips screen filters. Every payslip is loaded once and filtered here, so the Payroll Run and
// Payroll Month dropdowns always offer every run and month instead of only those of the last search.
// Run names repeat across months ("Sept 2026 Payroll" is used by several runs), so a run option
// carries its code and a selected option matches only that run.

export type PayslipFilterRow = {
  strEmployeeCode: string;
  strEmployeeName: string;
  strRunCode: string;
  strRunName: string;
  dtPayrollMonth: string | null;
  strDepartmentName?: string | null;
  strLocationName?: string | null;
  strPayslipStatus?: string | null;
};

export type PayslipFilterValues = {
  strSearchEmployee: string;
  strSearchRun: string;
  strPayrollMonth: string;
  strStatus: string;
  strDepartment: string;
  strLocation: string;
};

const lstMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function splitPayslipFilterValue(strValue: string) {
  return strValue
    .split(",")
    .map((strItem) => strItem.trim().toLowerCase())
    .filter(Boolean);
}

/** "2026-09" for any payroll month date ("2026-09-11", "2026-09-01T00:00:00"). */
export function getPayslipMonthKey(strDate: string | null | undefined) {
  const objMatch = /^(\d{4})-(\d{2})/.exec(String(strDate ?? "").trim());
  return objMatch ? `${objMatch[1]}-${objMatch[2]}` : "";
}

/** "Sep 2026" for "2026-09". */
export function formatPayslipMonthOption(strMonthKey: string) {
  const objMatch = /^(\d{4})-(\d{2})$/.exec(strMonthKey);
  const strMonthName = objMatch ? lstMonthNames[Number(objMatch[2]) - 1] : undefined;
  return objMatch && strMonthName ? `${strMonthName} ${objMatch[1]}` : strMonthKey;
}

export function formatPayslipRunOption(dicRow: Pick<PayslipFilterRow, "strRunCode" | "strRunName">) {
  const strName = String(dicRow.strRunName ?? "").trim();
  const strCode = String(dicRow.strRunCode ?? "").trim();
  if (!strName) return strCode;
  return strCode ? `${strName} (${strCode})` : strName;
}

/** Selected month options ("Sep 2026") or typed months ("2026-09") as month keys. */
export function getPayslipMonthKeys(strValue: string) {
  return splitPayslipFilterValue(strValue)
    .map((strNeedle) => {
      const strKey = getPayslipMonthKey(strNeedle);
      if (strKey) return strKey;
      const objMatch = /^([a-z]{3})[a-z]*\s+(\d{4})$/.exec(strNeedle);
      const intMonth = objMatch ? lstMonthNames.findIndex((strName) => strName.toLowerCase() === objMatch[1]) : -1;
      return objMatch && intMonth >= 0 ? `${objMatch[2]}-${String(intMonth + 1).padStart(2, "0")}` : "";
    })
    .filter(Boolean);
}

function matchesText(lstNeedles: string[], ...lstHaystacks: Array<string | null | undefined>) {
  if (lstNeedles.length === 0) return true;
  const strHaystack = lstHaystacks.map((strValue) => String(strValue ?? "").toLowerCase()).join(" ");
  return lstNeedles.some((strNeedle) => strHaystack.includes(strNeedle));
}

function matchesRun(lstNeedles: string[], dicRow: PayslipFilterRow) {
  if (lstNeedles.length === 0) return true;
  const strOption = formatPayslipRunOption(dicRow).toLowerCase();
  const strCode = String(dicRow.strRunCode ?? "").trim().toLowerCase();
  return lstNeedles.some((strNeedle) =>
    strNeedle === strOption || strNeedle === strCode
      // Typed text: part of the run name or code.
      || (!/\(.+\)$/.test(strNeedle) && strOption.includes(strNeedle))
  );
}

function matchesMonth(strValue: string, dicRow: PayslipFilterRow) {
  if (splitPayslipFilterValue(strValue).length === 0) return true;
  return getPayslipMonthKeys(strValue).includes(getPayslipMonthKey(dicRow.dtPayrollMonth));
}

export function filterPayslipRows<TRow extends PayslipFilterRow>(lstRows: TRow[], dicFilters: PayslipFilterValues) {
  const lstEmployees = splitPayslipFilterValue(dicFilters.strSearchEmployee);
  const lstRuns = splitPayslipFilterValue(dicFilters.strSearchRun);
  const lstStatuses = dicFilters.strStatus === "All" ? [] : splitPayslipFilterValue(dicFilters.strStatus);
  const lstDepartments = splitPayslipFilterValue(dicFilters.strDepartment);
  const lstLocations = splitPayslipFilterValue(dicFilters.strLocation);
  return lstRows.filter((dicRow) =>
    matchesText(lstEmployees, dicRow.strEmployeeCode, dicRow.strEmployeeName, `${dicRow.strEmployeeCode} - ${dicRow.strEmployeeName}`)
    && matchesRun(lstRuns, dicRow)
    && matchesMonth(dicFilters.strPayrollMonth, dicRow)
    && matchesText(lstStatuses, dicRow.strPayslipStatus || "Processed")
    && matchesText(lstDepartments, dicRow.strDepartmentName)
    && matchesText(lstLocations, dicRow.strLocationName)
  );
}

function getUniqueSorted(lstValues: Array<string | null | undefined>) {
  return Array.from(new Set(lstValues.map((strValue) => String(strValue ?? "").trim()).filter(Boolean)))
    .sort((strLeft, strRight) => strLeft.localeCompare(strRight));
}

/**
 * Dropdown options from every loaded payslip. Runs follow the chosen month(s) and months follow the
 * chosen run(s), so picking September lists only September's runs. Newest month and run first.
 */
export function buildPayslipFilterOptions(lstRows: PayslipFilterRow[], dicDraft: Pick<PayslipFilterValues, "strSearchRun" | "strPayrollMonth">) {
  const lstNewestFirst = [...lstRows].sort((dicLeft, dicRight) =>
    getPayslipMonthKey(dicRight.dtPayrollMonth).localeCompare(getPayslipMonthKey(dicLeft.dtPayrollMonth))
    || String(dicRight.strRunCode ?? "").localeCompare(String(dicLeft.strRunCode ?? ""))
  );
  const lstRunRows = lstNewestFirst.filter((dicRow) => matchesMonth(dicDraft.strPayrollMonth, dicRow));
  const lstMonthRows = lstNewestFirst.filter((dicRow) => matchesRun(splitPayslipFilterValue(dicDraft.strSearchRun), dicRow));
  return {
    lstEmployees: getUniqueSorted(lstRows.flatMap((dicRow) => [
      dicRow.strEmployeeCode,
      dicRow.strEmployeeName,
      `${dicRow.strEmployeeCode} - ${dicRow.strEmployeeName}`,
    ])),
    lstRuns: Array.from(new Set(lstRunRows.map(formatPayslipRunOption).filter(Boolean))),
    lstMonths: Array.from(new Set(
      lstMonthRows.map((dicRow) => getPayslipMonthKey(dicRow.dtPayrollMonth)).filter(Boolean).map(formatPayslipMonthOption)
    )),
    lstDepartments: getUniqueSorted(lstRows.map((dicRow) => dicRow.strDepartmentName)),
    lstLocations: getUniqueSorted(lstRows.map((dicRow) => dicRow.strLocationName)),
    lstStatuses: getUniqueSorted(lstRows.map((dicRow) => dicRow.strPayslipStatus || "Processed")),
  };
}
