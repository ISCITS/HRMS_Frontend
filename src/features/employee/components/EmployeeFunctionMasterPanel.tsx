"use client";

import EmployeeAttributeMasterPanel, { type EmployeeAttributeMasterConfig } from "./EmployeeAttributeMasterPanel";
import { authHelpers } from "@/lib/auth";
import { masterApiService } from "@/services/master/MasterApiService";

const config: EmployeeAttributeMasterConfig = {
  singular: "Employee Function", plural: "Employee Functions", moduleName: "employee_function",
  moduleCodes: ["EMPLOYEE_FUNCTION"], testId: "employee-function-master", exportFileName: "employee-functions",
  codeKey: "strEmployeeFunctionCode", nameKey: "strEmployeeFunctionName",
  enableTranslations: true,
  hideGridLoadingOverlay: true,
  list: () => masterApiService.getEmployeeFunctions(),
  get: (id) => masterApiService.getEmployeeFunction(id),
  create: (form) => masterApiService.createEmployeeFunction({
    strEmployeeFunctionCode: form.code,
    strEmployeeFunctionName: form.name,
    blnIsActive: form.status === "Active",
    intLanguageID: Number(form.lstTexts[0]?.intLanguageID || authHelpers.getLanguageID() || 1),
    lstTexts: form.lstTexts
      .filter((text) => Number(text.intLanguageID) > 0 && text.name.trim())
      .map((text) => ({ intLanguageID: Number(text.intLanguageID), strEmployeeFunctionName: text.name.trim() })),
  }),
  update: (id, form) => masterApiService.updateEmployeeFunction(id, {
    strEmployeeFunctionCode: form.code,
    strEmployeeFunctionName: form.name,
    blnIsActive: form.status === "Active",
    intLanguageID: Number(form.lstTexts[0]?.intLanguageID || authHelpers.getLanguageID() || 1),
    lstTexts: form.lstTexts
      .filter((text) => Number(text.intLanguageID) > 0 && text.name.trim())
      .map((text) => ({ intLanguageID: Number(text.intLanguageID), strEmployeeFunctionName: text.name.trim() })),
  }),
  setStatus: (ids, active) => masterApiService.bulkEmployeeFunctionStatus(ids, active),
  remove: (ids) => masterApiService.bulkEmployeeFunctionDelete(ids),
};

export default function EmployeeFunctionMasterPanel() { return <EmployeeAttributeMasterPanel config={config} />; }
