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
};

const objTenantOnboardingMenuItem: MenuItem = {
  strModuleCode: "TENANT_ONBOARDING",
  strModuleName: "Tenant Onboarding",
  strRoute: "/settings/tenants/onboarding",
  lstPermissionCodes: [],
  blnIsHome: false,
  lstChildren: [],
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

function injectTenantOnboardingMenu(lstMenuItems: MenuItem[]): MenuItem[] {
  if (hasRoute(lstMenuItems, objTenantOnboardingMenuItem.strRoute ?? "")) {
    return lstMenuItems;
  }

  const intSettingsIndex = lstMenuItems.findIndex(
    (objItem) => {
      const strCode = objItem.strModuleCode.trim().toLowerCase();
      const strName = objItem.strModuleName.trim().toLowerCase();
      return strCode === "settings" || strName === "settings";
    },
  );

  if (intSettingsIndex >= 0) {
    return lstMenuItems.map((objItem, intIndex) => {
      if (intIndex !== intSettingsIndex) {
        return objItem;
      }

      if (hasRoute(objItem.lstChildren, objTenantOnboardingMenuItem.strRoute ?? "")) {
        return objItem;
      }

      return {
        ...objItem,
        lstChildren: [...objItem.lstChildren, objTenantOnboardingMenuItem],
      };
    });
  }

  return [
    ...lstMenuItems,
    {
      strModuleCode: "SETTINGS",
      strModuleName: "Settings",
      strRoute: null,
      lstPermissionCodes: [],
      blnIsHome: false,
      lstChildren: [objTenantOnboardingMenuItem],
    },
  ];
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

export function getPostLoginRoute(strPreferredRoute?: string | null) {
  const strNormalizedRoute = normalizeRoute(strPreferredRoute);

  if (!strNormalizedRoute || strNormalizedRoute === "/user-management") {
    return "/dashboard";
  }

  return strNormalizedRoute;
}

export function normalizeMenuResponse(objMenu: MenuResponse): MenuResponse {
  const lstMenuItems = injectTenantOnboardingMenu(objMenu.lstMenuItems.map(normalizeMenuItem));
  const strHomeRoute =
    getPostLoginRoute(objMenu.strHomeRoute) ??
    getFirstNavigableRoute(lstMenuItems) ??
    "/dashboard";

  return {
    ...objMenu,
    strHomeRoute,
    lstMenuItems,
  };
}
