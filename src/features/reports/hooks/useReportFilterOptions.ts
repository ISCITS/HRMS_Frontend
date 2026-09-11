"use client";

import { useEffect, useState } from "react";

import { attendanceRegularizationService } from "@/features/attendance-regularization/services/attendanceRegularizationService";
import { employeeService } from "@/features/employee/services/employeeService";
import { leaveService } from "@/features/leave/services/leaveService";
import { masterApiService } from "@/services/master/MasterApiService";

import type { ReportFilterOption } from "../components/ReportGridPage";

type ReportFilterOptions = {
  lstEmployees: ReportFilterOption[];
  lstDepartments: ReportFilterOption[];
  lstLocations: ReportFilterOption[];
  lstLeaveTypes: ReportFilterOption[];
  lstExceptionTypes: ReportFilterOption[];
};

const objEmptyOptions: ReportFilterOptions = {
  lstEmployees: [],
  lstDepartments: [],
  lstLocations: [],
  lstLeaveTypes: [],
  lstExceptionTypes: [],
};

export function useReportFilterOptions(): ReportFilterOptions {
  const [objOptions, setObjOptions] = useState<ReportFilterOptions>(objEmptyOptions);

  useEffect(() => {
    let blnActive = true;

    Promise.allSettled([
      employeeService.getEmployees(),
      masterApiService.getDepartments(),
      masterApiService.getLocations(),
      leaveService.listLeaveTypes(),
      attendanceRegularizationService.getHrLookups(),
    ]).then(([objEmployees, objDepartments, objLocations, objLeaveTypes, objLookups]) => {
      if (!blnActive) return;

      setObjOptions({
        lstEmployees: objEmployees.status === "fulfilled"
          ? objEmployees.value
            .filter((objEmployee) => !objEmployee.blnIsPartialSave)
            .map((objEmployee) => ({
              strValue: String(objEmployee.intID),
              strLabel: `${objEmployee.strEmployeeCode} - ${objEmployee.strFullName}`,
            }))
          : [],
        lstDepartments: objDepartments.status === "fulfilled"
          ? objDepartments.value.Data
            .filter((objDepartment) => objDepartment.blnIsActive)
            .map((objDepartment) => ({
              strValue: String(objDepartment.intID),
              strLabel: `${objDepartment.strDepartmentCode} - ${objDepartment.strDepartmentName}`,
            }))
          : [],
        lstLocations: objLocations.status === "fulfilled"
          ? objLocations.value.Data
            .filter((objLocation) => objLocation.blnIsActive)
            .map((objLocation) => ({
              strValue: String(objLocation.intID),
              strLabel: `${objLocation.strLocationCode} - ${objLocation.strLocationName}`,
            }))
          : [],
        lstLeaveTypes: objLeaveTypes.status === "fulfilled"
          ? objLeaveTypes.value
            .filter((objLeaveType) => objLeaveType.blnIsActive)
            .map((objLeaveType) => ({
              strValue: String(objLeaveType.intID),
              strLabel: `${objLeaveType.strTypeCode} - ${objLeaveType.strTypeName}`,
            }))
          : [],
        lstExceptionTypes: objLookups.status === "fulfilled"
          ? (objLookups.value.ATTENDANCE_EXCEPTION_TYPE ?? []).map((objOption) => ({
              strValue: objOption.strValueCode,
              strLabel: objOption.strDisplayName,
            }))
          : [],
      });
    });

    return () => { blnActive = false; };
  }, []);

  return objOptions;
}
