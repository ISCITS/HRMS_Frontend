import { buildEmployeeSalaryCalculationRows, calculateEmployeeSalaryBaseSummaryMetrics, getEmployeeSalaryApplicableLines } from "./employeeSalarySummary";

const component = (strComponentName: string, strComponentCategory: string, decAmountMonthly: number) => ({
  strComponentName, strComponentCategory, decAmountMonthly,
  decAmountAnnual: decAmountMonthly * 12, blnIncludedInCtc: true,
});

for (const gross of [20000, 20999.99, 21000, 21000.01, 22000]) {
  const source = { lstComponentLines: [
    component("Basic", "Earning", gross),
    component("Employee ESIC", "Deduction", 150),
    component("Employer ESIC", "Employer Contribution", 650),
    component("Employee PF", "Deduction", 1200),
    component("Employer PF", "Employer Contribution", 1200),
  ] };
  const lines = getEmployeeSalaryApplicableLines(source);
  const summary = calculateEmployeeSalaryBaseSummaryMetrics(source);
  const rows = buildEmployeeSalaryCalculationRows(source);
  const esiApplies = gross <= 21000;
  const net = summary.decGrossMonthly - lines.filter(line => line.strComponentCategory === "Deduction")
    .reduce((total, line) => total + line.decAmountMonthly, 0);
  if (lines.length !== (esiApplies ? 5 : 3) || net !== gross - 1200 - (esiApplies ? 150 : 0)) {
    throw new Error(`Incorrect ESIC visibility/net for gross ${gross}`);
  }
  if (summary.decAnnualCtc !== (gross + 1200 + (esiApplies ? 650 : 0)) * 12 ||
      rows.ctcAnnual.some(row => row.strName === "Employer ESIC") !== esiApplies) {
    throw new Error(`Incorrect ESIC CTC for gross ${gross}`);
  }
}

for (const category of ["CTC_PROVISION", "CTC Provision", "ctc-provision"]) {
  const source = {
    lstComponentLines: [
      component("Basic", "Earning", 50000),
      component("Bonus/Ex-Gratia Provision", category, 3000),
      component("Gratuity Provision", category, 2000),
      component("Leave Encashment Provision", category, 1000),
      component("Paid Bonus", "Earning", 4000),
      component("Employer PF", "Employer Contribution", 5000),
    ],
  };
  const summary = calculateEmployeeSalaryBaseSummaryMetrics(source);
  const rows = buildEmployeeSalaryCalculationRows(source);
  if (summary.decGrossMonthly !== 54000 || summary.decAnnualCtc !== 780000) {
    throw new Error(`Incorrect gross/CTC totals for ${category}`);
  }
  if (rows.grossMonthly.some(row => row.strName.includes("Provision"))) {
    throw new Error(`Provision leaked into gross/net formula rows for ${category}`);
  }
  if (rows.ctcAnnual.reduce((total, row) => total + row.decAmount, 0) !== summary.decAnnualCtc) {
    throw new Error(`CTC breakdown does not match total for ${category}`);
  }
}
