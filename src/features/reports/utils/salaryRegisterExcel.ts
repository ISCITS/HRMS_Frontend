import type { SalaryRegisterRow } from "@/features/reports/services/salaryRegisterReportService";
import type { SalaryRegisterArrearLayout } from "@/features/reports/utils/salaryRegisterArrearLayout";

function collapseValues(lstRows: SalaryRegisterRow[], fnGetValue: (dicRow: SalaryRegisterRow) => string | null | undefined, strFallback: string) {
  const setValues = new Set(lstRows.map((dicRow) => (fnGetValue(dicRow) || "").trim()).filter(Boolean));
  if (setValues.size === 1) return Array.from(setValues)[0];
  return strFallback;
}

function formatExportTimestamp(objDate: Date) {
  const fnPad = (intValue: number) => String(intValue).padStart(2, "0");
  let intHours = objDate.getHours();
  const strMeridiem = intHours >= 12 ? "PM" : "AM";
  intHours = intHours % 12 || 12;
  return `${fnPad(objDate.getMonth() + 1)}/${fnPad(objDate.getDate())}/${objDate.getFullYear()} ${fnPad(intHours)}:${fnPad(objDate.getMinutes())}:${fnPad(objDate.getSeconds())} ${strMeridiem}`;
}

// Numeric export cell: null = explicitly unknown ("-"), missing/zero = blank, otherwise a real number
// so Excel can sum/format it.
function toExportNumber(decValue: number | null | undefined): number | string | null {
  if (decValue === null) return "-";
  const decNumber = Number(decValue ?? 0);
  if (!decNumber) return null;
  return Math.round(decNumber * 100) / 100;
}

// Builds the Salary Register Excel workbook (column layout follows the arrear toggle).
export async function buildSalaryRegisterWorkbook(
  lstRows: SalaryRegisterRow[],
  objLayout: SalaryRegisterArrearLayout,
  strCompanyName: string,
  strMonthLabel: string
) {
  const { Workbook } = await import("exceljs");
  const { lstPaymentColumns, lstArrearPaymentColumns, lstRecoveryColumns, lstArrearRecoveryColumns, fnGrossEarning, fnGrossDeduction } = objLayout;
  const strState = collapseValues(lstRows, (dicRow) => dicRow.strState, "All");
  const strAllocationEntity = collapseValues(lstRows, (dicRow) => dicRow.strAllocationEntity, "All");
  const strPayCycle = collapseValues(lstRows, (dicRow) => dicRow.strPayCycle, "Monthly");
  const strEmployeeCategory = collapseValues(lstRows, (dicRow) => dicRow.strEmployeeCategory, "All");

  // Excel layout mirrors the client's salary register sheet (Employee No before Employee Name).
  // Component columns keep our configured names. The on-screen grid is unchanged.
  const lstLeadingLabels = [
    "Sl No", "Employee No", "Employee Name", "Status", "Site", "Cost Center", "Grade", "Department",
    "Designation", "Location", "Category", "Payment Mode", "Bank Name", "Branch Name", "Bank Account No",
    "IFSC Code", "PAN No",
  ];
  const lstTrailingLabels = ["Salary Released For", "Employee UAN", "WorkGroup Name"];
  const lstColumnLabels = [
    ...lstLeadingLabels, "Payable Days", "Negative Salary Dtl",
    ...lstPaymentColumns, "Gross Earning", ...lstArrearPaymentColumns,
    ...lstRecoveryColumns, "Gross Deduction", ...lstArrearRecoveryColumns, "Net Earning",
    ...lstTrailingLabels,
  ];
  const intColumnCount = lstColumnLabels.length;
  const intFirstNumericColumn = lstLeadingLabels.length + 1; // 1-based: Payable Days
  const intLastNumericColumn = intColumnCount - lstTrailingLabels.length;

  const objWorkbook = new Workbook();
  const objSheet = objWorkbook.addWorksheet("Salary Register");
  objSheet.columns = lstColumnLabels.map((_, intIndex) => ({
    width: intIndex === 0 ? 8 : intIndex === 2 ? 30 : intIndex < intFirstNumericColumn - 1 ? 22 : intIndex >= intLastNumericColumn ? 22 : 18,
  }));
  const objThinBorder = { top: { style: "thin" as const }, left: { style: "thin" as const }, bottom: { style: "thin" as const }, right: { style: "thin" as const } };

  const fnTitleRow = (strText: string, intSize: number) => {
    const objRow = objSheet.addRow([strText]);
    objSheet.mergeCells(objRow.number, 1, objRow.number, intColumnCount);
    objRow.getCell(1).font = { bold: true, size: intSize };
    objRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  };
  fnTitleRow(strCompanyName, 14);
  fnTitleRow(`Salary register for the month ${strMonthLabel}`, 12);

  const fnMetaRow = (strLabel: string, strValue: string) => {
    const objRow = objSheet.addRow([strLabel, "", "", strValue]);
    objSheet.mergeCells(objRow.number, 1, objRow.number, 3);
    objSheet.mergeCells(objRow.number, 4, objRow.number, Math.max(4, intColumnCount));
    objRow.getCell(1).font = { bold: true };
    objRow.getCell(1).alignment = { horizontal: "left" };
    objRow.getCell(4).alignment = { horizontal: "left" };
  };
  fnMetaRow("Date And Time:", formatExportTimestamp(new Date()));
  fnMetaRow("State Name:", strState);
  fnMetaRow("Payroll Month:", strMonthLabel);
  fnMetaRow("Allocation Entity:", strAllocationEntity);
  fnMetaRow("Pay Cycle:", strPayCycle);
  fnMetaRow("Employee Category:", strEmployeeCategory);
  objSheet.addRow([]);

  const objHeaderRow = objSheet.addRow(lstColumnLabels);
  objHeaderRow.eachCell((objCell) => {
    objCell.font = { bold: true };
    objCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    objCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
    objCell.border = objThinBorder;
  });

  const fnStyleDataRow = (objRow: ReturnType<typeof objSheet.addRow>, blnBold: boolean) => {
    for (let intColumn = 1; intColumn <= intColumnCount; intColumn += 1) {
      const objCell = objRow.getCell(intColumn);
      objCell.border = objThinBorder;
      objCell.font = { bold: blnBold };
      if (intColumn === 1) objCell.alignment = { horizontal: "center" };
      else if (intColumn < intFirstNumericColumn || intColumn > intLastNumericColumn) objCell.alignment = { horizontal: "left" };
      else {
        objCell.alignment = { horizontal: "right" };
        objCell.numFmt = "#,##0.00";
      }
    }
  };

  // Excel rows are listed alphabetically by Employee Name (Employee No breaks ties).
  const lstSortedRows = [...lstRows].sort((dicLeft, dicRight) =>
    dicLeft.strEmployeeName.trim().localeCompare(dicRight.strEmployeeName.trim(), undefined, { sensitivity: "base" })
    || dicLeft.strEmployeeCode.localeCompare(dicRight.strEmployeeCode, undefined, { numeric: true }));

  lstSortedRows.forEach((dicRow, intIndex) => {
    const objRow = objSheet.addRow([
      intIndex + 1,
      dicRow.strEmployeeCode,
      dicRow.strEmployeeName,
      dicRow.strEmploymentStatus ?? "",
      dicRow.strAllocationEntity ?? "",
      dicRow.strCostCenter ?? "",
      dicRow.strGrade ?? "",
      dicRow.strDepartment ?? "-",
      dicRow.strDesignation ?? "-",
      dicRow.strLocation ?? "-",
      dicRow.strEmployeeCategory ?? "",
      dicRow.strPaymentMode ?? "",
      dicRow.strBankName ?? "",
      dicRow.strBranchName ?? "",
      dicRow.strAccountNumber ?? "",
      dicRow.strIfscCode ?? "",
      dicRow.strPanNumber ?? "",
      toExportNumber(dicRow.decTotalPresentDays),
      // Only a processed, fully-computed negative net shows here; projected rows have no final net.
      !dicRow.blnStatutoryPending && dicRow.decNetEarning < 0 ? Math.round(dicRow.decNetEarning * 100) / 100 : null,
      ...lstPaymentColumns.map((strColumn) => toExportNumber(dicRow.dicPayments[strColumn])),
      toExportNumber(fnGrossEarning(dicRow)),
      ...lstArrearPaymentColumns.map((strColumn) => toExportNumber(dicRow.dicPayments[strColumn])),
      ...lstRecoveryColumns.map((strColumn) => toExportNumber(dicRow.dicRecoveries[strColumn])),
      dicRow.blnStatutoryPending ? "Not yet computed" : toExportNumber(fnGrossDeduction(dicRow)),
      ...lstArrearRecoveryColumns.map((strColumn) => toExportNumber(dicRow.dicRecoveries[strColumn])),
      dicRow.blnStatutoryPending ? "Not yet computed" : toExportNumber(dicRow.decNetEarning),
      "", // Salary Released For: no source data yet
      dicRow.strUanNumber ?? "",
      dicRow.strWorkgroup ?? "",
    ]);
    fnStyleDataRow(objRow, false);
  });

  const fnSum = (fnValue: (dicRow: SalaryRegisterRow) => number | null) => lstRows.reduce((decTotal, dicRow) => decTotal + (fnValue(dicRow) || 0), 0);
  const objTotalRow = objSheet.addRow([
    "Grand Total", ...lstLeadingLabels.slice(1).map(() => ""),
    fnSum((dicRow) => dicRow.decTotalPresentDays),
    fnSum((dicRow) => (!dicRow.blnStatutoryPending && dicRow.decNetEarning < 0 ? dicRow.decNetEarning : 0)),
    ...lstPaymentColumns.map((strColumn) => fnSum((dicRow) => dicRow.dicPayments[strColumn] || 0)),
    fnSum(fnGrossEarning),
    ...lstArrearPaymentColumns.map((strColumn) => fnSum((dicRow) => dicRow.dicPayments[strColumn] || 0)),
    ...lstRecoveryColumns.map((strColumn) => fnSum((dicRow) => dicRow.dicRecoveries[strColumn] || 0)),
    fnSum(fnGrossDeduction),
    ...lstArrearRecoveryColumns.map((strColumn) => fnSum((dicRow) => dicRow.dicRecoveries[strColumn] || 0)),
    fnSum((dicRow) => dicRow.decNetEarning),
    ...lstTrailingLabels.map(() => ""),
  ]);
  objSheet.mergeCells(objTotalRow.number, 1, objTotalRow.number, lstLeadingLabels.length);
  fnStyleDataRow(objTotalRow, true);
  objTotalRow.getCell(1).alignment = { horizontal: "center" };
  return objWorkbook;
}
