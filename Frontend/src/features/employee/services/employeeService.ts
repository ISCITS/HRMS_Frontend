import { callAPI } from "@/services/apiService";
import type { EmployeeFormValues, EmployeeRecord } from "@/features/employee/types";

/*
Functional responsibility:
- Provide employee module API operations through the shared SaaS API client.

Inputs:
- Employee form payloads and employee identifiers from feature consumers.

Output:
- Standardized HRMS API responses for employee operations.

Failure behavior:
- Propagates normalized API client errors to the caller.
*/
export const employeeService = {
  createEmployee(payload: EmployeeFormValues) {
    return callAPI<EmployeeRecord>(payload, "Employee/Create", "EMP_ADD");
  },

  getEmployeeById(employeeId: string) {
    return callAPI<EmployeeRecord>({ employeeId }, "Employee/GetById", "EMP_VIEW");
  }
};

