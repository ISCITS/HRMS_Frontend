const dicModuleAliases: Record<string, string> = {
  "common-data-grid": "common",
  "common_data_grid": "common",
  "employee-payroll-input": "employee-payroll-input",
  "employee-payroll-inputs": "employee-payroll-input",
  employee_payroll_input: "employee-payroll-input",
  employee_payroll_inputs: "employee-payroll-input",
  payslip: "payslips",
  payslips: "payslips",
  "payroll-result": "payroll-results",
  "payroll-results": "payroll-results",
  payroll_result: "payroll-results",
  payroll_results: "payroll-results",
  "payroll-run": "payroll-cycles",
  "payroll-runs": "payroll-cycles",
  payroll_run: "payroll-cycles",
  payroll_runs: "payroll-cycles",
  "payroll-process-log": "payroll-process-logs",
  "payroll-process-logs": "payroll-process-logs",
  payroll_process_log: "payroll-process-logs",
  payroll_process_logs: "payroll-process-logs",
};

export function normalizeLabelModuleName(strModuleName: string) {
  const strNormalized = strModuleName.trim().toLowerCase();
  return dicModuleAliases[strNormalized] ?? strNormalized;
}
