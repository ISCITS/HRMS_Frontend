"use client";

import EmployeeAttributeMasterPanel, { type EmployeeAttributeMasterConfig } from "./EmployeeAttributeMasterPanel";
import { masterApiService } from "@/services/master/MasterApiService";

const config: EmployeeAttributeMasterConfig = {
  singular: "Employment Type", plural: "Employment Types", moduleName: "employee_type",
  moduleCodes: ["EMPLOYMENT_TYPE"], testId: "employment-type-master", exportFileName: "employment-types",
  codeKey: "strEmploymentTypeCode", nameKey: "strEmploymentTypeName",
  list: () => masterApiService.getEmploymentTypes(),
  get: (id) => masterApiService.getEmploymentType(id),
  create: (form) => masterApiService.createEmploymentType({ strEmploymentTypeCode: form.code, strEmploymentTypeName: form.name, blnIsActive: form.status === "Active" }),
  update: (id, form) => masterApiService.updateEmploymentType(id, { strEmploymentTypeCode: form.code, strEmploymentTypeName: form.name, blnIsActive: form.status === "Active" }),
  setStatus: (ids, active) => masterApiService.bulkEmploymentTypeStatus(ids, active),
  remove: (ids) => masterApiService.bulkEmploymentTypeDelete(ids),
};

export default function EmploymentTypeMasterPanel() { return <EmployeeAttributeMasterPanel config={config} />; }
