import type { MenuItem, MenuResponse } from "@/models/AuthModels";

const dicRouteAliases: Record<string, string> = {
  "/master/departments": "/departments",
  "/master/designations": "/designations",
  "/master/employees": "/employees",
  "/master/users": "/users",
  "/master/states": "/states",
  "/master/countries": "/countries",
  "/master/banks": "/banks",
  "/master/locations": "/locations",
  "/master/grades": "/grades",
  "/master/cost-centers": "/cost-centers",
  "/master/costcenter": "/cost-centers",
  "/master/cost_center": "/cost-centers",
  "/master/usergroups": "/security/user-groups",
  "/master/user-groups": "/security/user-groups",
  "/security/user-groups": "/security/user-groups",
  "/master/version-logs": "/version-logs",
  "/masters/version-logs": "/version-logs",
  "/master/version-log-master": "/version-logs",
  "/masters/version-log-master": "/version-logs",
  "/master/versionlogmaster": "/version-logs",
  "/masters/versionlogmaster": "/version-logs",
  "/master/version_log_master": "/version-logs",
  "/masters/version_log_master": "/version-logs",
  "/master/versionlog": "/version-logs",
  "/masters/versionlog": "/version-logs",
  "/master/version_log": "/version-logs",
  "/masters/version_log": "/version-logs",
  "/version-log": "/version-logs",
  "/version-logs": "/version-logs",
  "/report/payroll-register": "/reports/payroll-register",
  "/reports/payroll-register": "/reports/payroll-register",
  "/report/payroll_register": "/reports/payroll-register",
  "/reports/payroll_register": "/reports/payroll-register",
  "/report/bank-file": "/reports/bank-file",
  "/reports/bank-file": "/reports/bank-file",
  "/report/bank_file": "/reports/bank-file",
  "/reports/bank_file": "/reports/bank-file",
  "/ess/my-reimbursements": "/ess/reimbursements",
  "/ess/reimbursement-claims": "/ess/reimbursements",
  "/ess/reimbursements": "/ess/reimbursements",
  "/ess/my-loans-advances": "/ess/loans-advances",
  "/ess/my-loans-and-advances": "/ess/loans-advances",
  "/ess/loan-advance": "/ess/loans-advances",
  "/ess/loans-advances": "/ess/loans-advances",
  "/ess/loans-and-advances": "/ess/loans-advances",
  "/payroll/reimbursement-review": "/payroll/reimbursements",
  "/payroll/reimbursement-claims": "/payroll/reimbursements",
  "/payroll/employee-reimbursement": "/payroll/reimbursements?source=employee-reimbursement",
  "/payroll/employee-reimbursements": "/payroll/reimbursements?source=employee-reimbursement",
  "/payroll/reimbursements": "/payroll/reimbursements",
  "/payroll/reimbursement": "/payroll/reimbursements",
  "/payroll/fnf": "/payroll/fnf-settlements",
  "/payroll/fnf-settlement": "/payroll/fnf-settlements",
  "/payroll/fnf-settlements": "/payroll/fnf-settlements",
  "/payroll/full-final-settlement": "/payroll/fnf-settlements",
  "/payroll/full-and-final-settlement": "/payroll/fnf-settlements"
};

function normalizeRoute(strRoute?: string | null) {
  if (!strRoute) {
    return null;
  }

  const strNormalized = strRoute.startsWith("/") ? strRoute : `/${strRoute}`;
  const strLowerRoute = strNormalized.toLowerCase();

  if (dicRouteAliases[strLowerRoute]) {
    return dicRouteAliases[strLowerRoute];
  }

  return strNormalized;
}

function normalizeMenuItem(objItem: MenuItem): MenuItem {
  const strNormalizedRoute = normalizeRoute(objItem.strRoute);
  const blnIsContainerOnly =
    objItem.lstChildren.length > 0 && strNormalizedRoute === "/user-management";

  return {
    ...objItem,
    strRoute: blnIsContainerOnly ? null : strNormalizedRoute,
    lstChildren: objItem.lstChildren.map(normalizeMenuItem),
  };
}

function hasRoute(lstMenuItems: MenuItem[], strRoute: string): boolean {
  return lstMenuItems.some(
    (objItem) =>
      objItem.strRoute === strRoute ||
      hasRoute(objItem.lstChildren, strRoute),
  );
}

function shouldHideMenuItem(objItem: MenuItem): boolean {
  const strModuleCode = objItem.strModuleCode.trim().toLowerCase();
  const strModuleName = objItem.strModuleName.trim().toLowerCase();
  const strRoute = (normalizeRoute(objItem.strRoute) ?? "").trim().toLowerCase();
  const blnIsEssLoansAdvancesItem =
    (
      strModuleName.includes("my loans") ||
      strModuleName.includes("my loan") ||
      strModuleCode.includes("my_loans") ||
      strModuleCode.includes("my-loans") ||
      strModuleCode.includes("my_loan") ||
      strModuleCode.includes("my-loan")
    ) &&
    (
      strModuleName.includes("advance") ||
      strModuleCode.includes("advance")
    );

  if (strModuleCode === "settings" || strModuleName === "settings") {
    return true;
  }

  if (strModuleCode.includes("tenant_onboarding") || strModuleName.includes("tenant onboarding")) {
    return true;
  }

  return (
    blnIsEssLoansAdvancesItem ||
    strRoute === "/ess/loans-advances" ||
    strRoute.startsWith("/ess/loans-advances/") ||
    strRoute === "/settings" ||
    strRoute.startsWith("/settings/") ||
    strRoute.includes("/tenants/onboarding")
  );
}

function filterHiddenMenuItems(lstMenuItems: MenuItem[]): MenuItem[] {
  return lstMenuItems.reduce<MenuItem[]>((lstFilteredItems, objItem) => {
    if (shouldHideMenuItem(objItem)) {
      return lstFilteredItems;
    }

    lstFilteredItems.push({
      ...objItem,
      lstChildren: filterHiddenMenuItems(objItem.lstChildren),
    });
    return lstFilteredItems;
  }, []);
}

function getFirstNavigableRoute(lstMenuItems: MenuItem[]): string | null {
  for (const objItem of lstMenuItems) {
    const strChildRoute = getFirstNavigableRoute(objItem.lstChildren);
    if (strChildRoute) {
      return strChildRoute;
    }

    if (objItem.strRoute) {
      return objItem.strRoute;
    }
  }

  return null;
}

function isDashboardMenuItem(objItem: MenuItem): boolean {
  const strModuleCode = objItem.strModuleCode.trim().toLowerCase();
  const strModuleName = objItem.strModuleName.trim().toLowerCase();
  const strRoute = (normalizeRoute(objItem.strRoute) ?? "").trim().toLowerCase();

  return strRoute === "/dashboard" || strModuleCode === "dashboard" || strModuleName === "dashboard";
}

function ensureTopLevelDashboard(lstMenuItems: MenuItem[]): MenuItem[] {
  let objDashboardItem: MenuItem | null = null;

  function stripNestedDashboard(lstItems: MenuItem[]): MenuItem[] {
    return lstItems.reduce<MenuItem[]>((lstUpdatedItems, objItem) => {
      if (isDashboardMenuItem(objItem)) {
        if (!objDashboardItem) {
          objDashboardItem = {
            ...objItem,
            strModuleCode: "DASHBOARD",
            strModuleName: "Dashboard",
            strRoute: "/dashboard",
            blnIsHome: true,
            lstChildren: [],
          };
        }
        return lstUpdatedItems;
      }

      lstUpdatedItems.push({
        ...objItem,
        blnIsHome: false,
        lstChildren: stripNestedDashboard(objItem.lstChildren),
      });
      return lstUpdatedItems;
    }, []);
  }

  const lstWithoutNestedDashboard = stripNestedDashboard(lstMenuItems);
  const objResolvedDashboard = objDashboardItem ?? {
    strModuleCode: "DASHBOARD",
    strModuleName: "Dashboard",
    strRoute: "/dashboard",
    lstPermissionCodes: [],
    blnIsHome: true,
    lstChildren: [],
  };

  return [objResolvedDashboard, ...lstWithoutNestedDashboard];
}

export function getPostLoginRoute(strPreferredRoute?: string | null) {
  const strNormalizedRoute = normalizeRoute(strPreferredRoute);

  if (!strNormalizedRoute) {
    return "/dashboard";
  }

  if (strNormalizedRoute.toLowerCase().startsWith("/hrms/administrator/")) {
    return strNormalizedRoute;
  }

  return "/dashboard";
}

export function normalizeMenuResponse(objMenu: MenuResponse): MenuResponse {
  const lstMenuItems = ensureTopLevelDashboard(
    filterHiddenMenuItems(objMenu.lstMenuItems.map(normalizeMenuItem)),
  );
  const strPreferredHomeRoute = getPostLoginRoute(objMenu.strHomeRoute);
  const strHomeRoute =
    (strPreferredHomeRoute && strPreferredHomeRoute === "/dashboard" ? strPreferredHomeRoute : null) ??
    "/dashboard";

  return {
    ...objMenu,
    strHomeRoute,
    lstMenuItems,
  };
}
