import type { MenuItem, MenuResponse } from "@/models/AuthModels";

type MasterKey = "department" | "designation" | "employee" | "user" | "state" | "country" | "bank" | "location" | "grade" | "costCenter";

const dicMasterDefinitions: Record<MasterKey, { strModuleCode: string; strModuleName: string; strRoute: string }> = {
  department: { strModuleCode: "DEPARTMENT", strModuleName: "Department", strRoute: "/departments" },
  designation: { strModuleCode: "DESIGNATION", strModuleName: "Designation", strRoute: "/designations" },
  employee: { strModuleCode: "EMPLOYEE", strModuleName: "Employee", strRoute: "/employees" },
  user: { strModuleCode: "USER", strModuleName: "User", strRoute: "/users" },
  state: { strModuleCode: "STATE", strModuleName: "State", strRoute: "/states" },
  country: { strModuleCode: "COUNTRY", strModuleName: "Country", strRoute: "/countries" },
  bank: { strModuleCode: "BANK", strModuleName: "Bank", strRoute: "/banks" },
  location: { strModuleCode: "LOCATION", strModuleName: "Location", strRoute: "/locations" },
  grade: { strModuleCode: "GRADE", strModuleName: "Grade", strRoute: "/grades" },
  costCenter: { strModuleCode: "COST_CENTER", strModuleName: "Cost Center", strRoute: "/cost-centers" },
};

const lstMasterKeys = Object.keys(dicMasterDefinitions) as MasterKey[];
const setMasterRoutes = new Set(lstMasterKeys.map((strKey) => dicMasterDefinitions[strKey].strRoute));

function normalizeRoute(strRoute?: string | null) {
  if (!strRoute) {
    return null;
  }

  const strNormalized = strRoute.startsWith("/") ? strRoute : `/${strRoute}`;
  const strLowerRoute = strNormalized.toLowerCase();

  if (strLowerRoute === "/user-management") {
    return "/dashboard";
  }

  if (strLowerRoute.includes("department")) {
    return dicMasterDefinitions.department.strRoute;
  }

  if (strLowerRoute.includes("designation")) {
    return dicMasterDefinitions.designation.strRoute;
  }

  if (strLowerRoute.includes("country")) {
    return dicMasterDefinitions.country.strRoute;
  }

  if (strLowerRoute.includes("bank")) {
    return dicMasterDefinitions.bank.strRoute;
  }

  if (strLowerRoute.includes("location")) {
    return dicMasterDefinitions.location.strRoute;
  }

  if (strLowerRoute.includes("grade")) {
    return dicMasterDefinitions.grade.strRoute;
  }

  if (strLowerRoute.includes("cost-center") || strLowerRoute.includes("costcenter") || strLowerRoute.includes("cost_center")) {
    return dicMasterDefinitions.costCenter.strRoute;
  }

  if (strLowerRoute.includes("state")) {
    return dicMasterDefinitions.state.strRoute;
  }

  if (strLowerRoute.includes("user")) {
    return dicMasterDefinitions.user.strRoute;
  }

  if (strLowerRoute.includes("employee")) {
    return dicMasterDefinitions.employee.strRoute;
  }

  return strNormalized;
}

function getMasterKey(objItem: MenuItem): MasterKey | null {
  const strValue = `${objItem.strModuleCode} ${objItem.strModuleName} ${objItem.strRoute ?? ""}`.toLowerCase();

  if (strValue.includes("department")) {
    return "department";
  }

  if (strValue.includes("designation")) {
    return "designation";
  }

  if (strValue.includes("employee")) {
    return "employee";
  }

  if (strValue.includes("bank")) {
    return "bank";
  }

  if (strValue.includes("location")) {
    return "location";
  }

  if (strValue.includes("grade")) {
    return "grade";
  }

  if (strValue.includes("cost center") || strValue.includes("cost-center") || strValue.includes("cost_center") || strValue.includes("costcenter")) {
    return "costCenter";
  }

  if (strValue.includes("country")) {
    return "country";
  }

  if (strValue.includes("state")) {
    return "state";
  }

  if (strValue.includes("user")) {
    return "user";
  }

  return null;
}

function isDashboardItem(objItem: MenuItem) {
  const strValue = `${objItem.strModuleCode} ${objItem.strModuleName} ${objItem.strRoute ?? ""}`.toLowerCase();
  return objItem.blnIsHome || strValue.includes("dashboard") || strValue.includes("user_management") || strValue.includes("user management") || strValue.includes("user-management");
}

function isMasterContainer(objItem: MenuItem) {
  const strValue = `${objItem.strModuleCode} ${objItem.strModuleName}`.toLowerCase();
  return strValue.includes("master");
}

function isKnownMasterRoute(strRoute?: string | null) {
  return Boolean(strRoute && setMasterRoutes.has(strRoute));
}

function cloneMenuItem(objItem: MenuItem): MenuItem {
  return {
    ...objItem,
    strRoute: normalizeRoute(objItem.strRoute),
    lstChildren: objItem.lstChildren.map(cloneMenuItem),
  };
}

export function getPostLoginRoute(strPreferredRoute?: string | null) {
  return normalizeRoute(strPreferredRoute) ?? "/dashboard";
}

export function normalizeMenuResponse(objMenu: MenuResponse): MenuResponse {
  const lstOriginalItems = objMenu.lstMenuItems.map(cloneMenuItem);
  const lstFlattenedItems = lstOriginalItems.flatMap((objItem) => [objItem, ...objItem.lstChildren]);
  const dicMasterItems = new Map<MasterKey, MenuItem>();

  for (const objItem of lstFlattenedItems) {
    const strMasterKey = getMasterKey(objItem);
    if (!strMasterKey || dicMasterItems.has(strMasterKey)) {
      continue;
    }

    const objDefinition = dicMasterDefinitions[strMasterKey];
    dicMasterItems.set(strMasterKey, {
      strModuleCode: objDefinition.strModuleCode,
      strModuleName: objDefinition.strModuleName,
      strRoute: objDefinition.strRoute,
      lstPermissionCodes: objItem.lstPermissionCodes,
      blnIsHome: false,
      lstChildren: [],
    });
  }

  const lstMastersChildren = lstMasterKeys.map((strKey) => {
    const objExistingItem = dicMasterItems.get(strKey);
    if (objExistingItem) {
      return objExistingItem;
    }

    const objDefinition = dicMasterDefinitions[strKey];
    return {
      strModuleCode: objDefinition.strModuleCode,
      strModuleName: objDefinition.strModuleName,
      strRoute: objDefinition.strRoute,
      lstPermissionCodes: [],
      blnIsHome: false,
      lstChildren: [],
    } satisfies MenuItem;
  });

  const objDashboardSource = lstFlattenedItems.find(isDashboardItem);
  const objDashboardItem: MenuItem = {
    strModuleCode: "DASHBOARD",
    strModuleName: "Dashboard",
    strRoute: "/dashboard",
    lstPermissionCodes: objDashboardSource?.lstPermissionCodes ?? [],
    blnIsHome: true,
    lstChildren: [],
  };

  const lstOtherItems = lstOriginalItems
    .filter((objItem) => !isDashboardItem(objItem))
    .filter((objItem) => !isMasterContainer(objItem))
    .filter((objItem) => !getMasterKey(objItem))
    .filter((objItem) => !isKnownMasterRoute(objItem.strRoute))
    .map((objItem) => ({
      ...objItem,
      lstChildren: objItem.lstChildren.filter((objChild) => !getMasterKey(objChild) && !isKnownMasterRoute(objChild.strRoute)),
    }));

  const lstMenuItems: MenuItem[] = [objDashboardItem];

  if (lstMastersChildren.length > 0) {
    lstMenuItems.push({
      strModuleCode: "MASTERS",
      strModuleName: "Masters",
      strRoute: null,
      lstPermissionCodes: [],
      blnIsHome: false,
      lstChildren: lstMastersChildren,
    });
  }

  lstMenuItems.push(...lstOtherItems);

  return {
    ...objMenu,
    strHomeRoute: "/dashboard",
    lstMenuItems,
  };
}
