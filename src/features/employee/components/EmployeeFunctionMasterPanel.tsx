"use client";

import EmployeeAttributeMasterPanel, { type EmployeeAttributeMasterConfig } from "./EmployeeAttributeMasterPanel";
import { authHelpers } from "@/lib/auth";
import { masterApiService } from "@/services/master/MasterApiService";

const config: EmployeeAttributeMasterConfig = {
  singular: "Employee Function", plural: "Employee Functions", moduleName: "employee_function",
  moduleCodes: ["EMPLOYEE_FUNCTION"], testId: "employee-function-master", exportFileName: "employee-functions",
  codeKey: "strEmployeeFunctionCode", nameKey: "strEmployeeFunctionName",
  list: () => masterApiService.getEmployeeFunctions(),
  get: (id) => masterApiService.getEmployeeFunction(id),
  create: (form) => masterApiService.createEmployeeFunction({ strEmployeeFunctionCode: form.code, strEmployeeFunctionName: form.name, blnIsActive: form.status === "Active", intLanguageID: authHelpers.getLanguageID() ?? 1, lstTexts: [] }),
  update: (id, form) => masterApiService.updateEmployeeFunction(id, { strEmployeeFunctionCode: form.code, strEmployeeFunctionName: form.name, blnIsActive: form.status === "Active", intLanguageID: authHelpers.getLanguageID() ?? 1, lstTexts: [] }),
  setStatus: (ids, active) => masterApiService.bulkEmployeeFunctionStatus(ids, active),
  remove: (ids) => masterApiService.bulkEmployeeFunctionDelete(ids),
};

export default function EmployeeFunctionMasterPanel() { return <EmployeeAttributeMasterPanel config={config} />; }
