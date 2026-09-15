import { buildEmployeeSalaryCalculationRows, calculateEmployeeSalaryBaseSummaryMetrics } from "./employeeSalarySummary";

const component = (strComponentName: string, strComponentCategory: string, decAmountMonthly: number) => ({
  strComponentName, strComponentCategory, decAmountMonthly,
  decAmountAnnual: decAmountMonthly * 12, blnIncludedInCtc: true,
});

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
