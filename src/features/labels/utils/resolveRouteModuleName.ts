export function resolveRouteModuleName(strPathname: string) {
  const strLowerPath = (strPathname || "").toLowerCase();

  if (strLowerPath.startsWith("/departments")) {
    return "department";
  }
  if (strLowerPath.startsWith("/designations")) {
    return "designation";
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
  if (
    strLowerPath.startsWith("/payroll/employee-payroll-inputs") ||
    strLowerPath.startsWith("/payroll/employee-payroll-input") ||
    strLowerPath.startsWith("/payroll/inputs")
  ) {
    return "employee-payroll-input";
  }
  if (strLowerPath.startsWith("/reports/payslips") || strLowerPath.startsWith("/payroll/payslips")) {
    return "payslips";
  }
  if (strLowerPath.startsWith("/payroll/results")) {
    return "payroll-results";
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
  if (
    strLowerPath.startsWith("/salary/it-declaration") ||
    strLowerPath.startsWith("/salary/ess-declarations")
  ) {
    return "it-declaration";
  }

  return "";
}
