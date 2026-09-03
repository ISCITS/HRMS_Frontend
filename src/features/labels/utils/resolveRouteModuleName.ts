export function resolveRouteModuleName(strPathname: string) {
  const strLowerPath = (strPathname || "").toLowerCase();

  if (strLowerPath.startsWith("/departments")) {
    return "department";
  }
  if (strLowerPath.startsWith("/designations")) {
    return "designation";
  }
  if (strLowerPath.startsWith("/holidays") || strLowerPath.startsWith("/leave/holidays")) {
    return "holiday";
  }
  if (strLowerPath.startsWith("/banks")) {
    return "bank";
  }
  if (strLowerPath.startsWith("/cost-centers")) {
    return "cost_center";
  }
  if (strLowerPath.startsWith("/grades")) {
    return "grade";
  }
  if (strLowerPath.startsWith("/locations")) {
    return "location";
  }
  if (strLowerPath.startsWith("/countries")) {
    return "country";
  }
  if (strLowerPath.startsWith("/states")) {
    return "state";
  }
  if (strLowerPath.startsWith("/version-logs")) {
    return "version_log";
  }
  if (strLowerPath.startsWith("/security/user-groups")) {
    return "user_group";
  }
  if (strLowerPath.startsWith("/users")) {
    return "user";
  }
  if (strLowerPath.startsWith("/employees")) {
    return "employee";
  }
  if (strLowerPath.startsWith("/employee-salary")) {
    return "employee-salary";
  }
  if (strLowerPath.startsWith("/payroll/runs")) {
    return "payroll-runs";
  }
  if (
    strLowerPath.startsWith("/payroll/schedules") ||
    strLowerPath.startsWith("/payroll/cycles") ||
    strLowerPath.startsWith("/payroll-cycles")
  ) {
    return "payroll-cycles";
  }
  if (strLowerPath.startsWith("/masters/payroll-groups")) {
    return "payroll-groups";
  }
  if (strLowerPath.startsWith("/payroll/attendance-leave-inputs")) {
    return "attendance-leave-inputs";
  }
  if (strLowerPath.startsWith("/reports/salary-register")) {
    return "salary-register";
  }
  if (
    strLowerPath.startsWith("/payroll/employee-payroll-inputs") ||
    strLowerPath.startsWith("/payroll/employee-payroll-input") ||
    strLowerPath.startsWith("/payroll/inputs")
  ) {
    return "employee-payroll-input";
  }
  if (
    strLowerPath.startsWith("/ess/my-profile") ||
    strLowerPath.startsWith("/profile")
  ) {
    return "my-profile";
  }
  if (strLowerPath.startsWith("/ess/my-bank-details")) {
    return "my-bank-details";
  }
  if (strLowerPath.startsWith("/ess/my-compensation")) {
    return "my-compensation";
  }
  if (strLowerPath.startsWith("/payroll/results")) {
    return "payroll-results";
  }
  if (
    strLowerPath.startsWith("/reports/payslips") ||
    strLowerPath.startsWith("/payroll/payslips") ||
    strLowerPath.startsWith("/payroll/payslip") ||
    strLowerPath.startsWith("/ess/my-payslips") ||
    strLowerPath.startsWith("/ess/my-payslip")
  ) {
    return "payslips";
  }
  if (
    strLowerPath.startsWith("/payroll/process-log") ||
    strLowerPath.startsWith("/payroll-process-logs")
  ) {
    return "payroll-process-logs";
  }
  if (strLowerPath.startsWith("/payroll/statutory-rules")) {
    return "statutory-rules";
  }
  if (strLowerPath.startsWith("/reports/statutory")) {
    return "statutory-report";
  }
  if (strLowerPath.startsWith("/payroll/tax-regimes") || strLowerPath.startsWith("/tax-regimes")) {
    return "tax-regimes";
  }
  if (strLowerPath.startsWith("/salary-components")) {
    return "salary-components";
  }
  if (strLowerPath.startsWith("/salary-structures")) {
    return "salary-structures";
  }
  if (strLowerPath.startsWith("/payroll/it-declaration-review")) {
    return "it-declaration-review";
  }
  if (
    strLowerPath.startsWith("/hr/it-declaration") ||
    strLowerPath.startsWith("/salary/it-declaration") ||
    strLowerPath.startsWith("/salary/ess-declarations")
  ) {
    return "it-declaration";
  }
  if (
    strLowerPath.startsWith("/salary/flexi-pay-declaration") ||
    strLowerPath.startsWith("/salary/flexi-pay-declarations")
  ) {
    return "flexi-pay-declaration";
  }
  if (
    strLowerPath.startsWith("/ess/reimbursements") ||
    strLowerPath.startsWith("/payroll/reimbursements") ||
    strLowerPath.startsWith("/payroll/employee-reimbursement")
  ) {
    return "reimbursements";
  }
  if (
    strLowerPath.startsWith("/ess/loans-advances") ||
    strLowerPath.startsWith("/payroll/loans-advances")
  ) {
    return "loans-advances";
  }
  if (strLowerPath.startsWith("/payroll/fnf-settlements")) {
    return "fnf-settlements";
  }
  if (strLowerPath.startsWith("/ess/calendar")) {
    return "calendar";
  }

  return "";
}
