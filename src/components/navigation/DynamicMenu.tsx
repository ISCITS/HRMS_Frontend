"use client";

import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { Box, Collapse, List, ListItemButton, ListItemIcon, ListItemText, Tooltip } from "@mui/material";
import Icon from "@mui/material/Icon";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, type ReactNode, useEffect, useMemo, useState } from "react";

import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { authHelpers } from "@/lib/auth";
import type { MenuItem } from "@/models/AuthModels";

type DynamicMenuProps = {
  lstMenuItems: MenuItem[];
  onNavigate?: () => void;
  blnCollapsed?: boolean;
  onCollapsedClick?: () => void;
  onCollapsedMenuItemClick?: (strMenuIdentity: string) => void;
  strForcedExpandedMenuIdentity?: string | null;
  onForcedExpandedHandled?: () => void;
};

const objMenuIconSx = { color: "inherit" };
const objSidebarPalette = {
  menuIcon: "#5E7FA5",
  menuText: "#2F4E6F",
  hoverBackground: "#EAF3FC",
  activeBackground: "#DCEBFA",
  activeAccent: "#1D5D96",
};

function getAutomationProps(strControlId?: string) {
  return strControlId ? ({ "data-controlid": strControlId } as const) : {};
}

function toMenuTestSegment(strValue: string) {
  return strValue.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

function toMaterialIconName(strValue: string) {
  return strValue
    .trim()
    .replace(/Rounded$/i, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .toLowerCase();
}

function resolveMenuIconName(objItem: MenuItem, strFallbackIconName = "workspaces"): string {
  if (objItem.blnIsHome) {
    return "dashboard";
  }

  const strResolvedIconName = toMaterialIconName(objItem.strIconName ?? "");
  return strResolvedIconName || strFallbackIconName;
}

function getMenuIcon(objItem: MenuItem, strFallbackIconName = "workspaces") {
  const strIconName = resolveMenuIconName(objItem, strFallbackIconName);
  return <Icon sx={objMenuIconSx}>{strIconName || "workspaces"}</Icon>;
}

function getLastBreadcrumbSegment(strValue: string) {
  const lstSegments = strValue
    .split("/")
    .map((strSegment) => strSegment.trim())
    .filter(Boolean);

  return lstSegments.at(-1) ?? strValue.trim();
}

function matchesRoute(strCandidateRoute: string | null, strPathname: string) {
  if (!strCandidateRoute) {
    return false;
  }
  const strCandidatePath = strCandidateRoute.split("?")[0];
  return strPathname === strCandidatePath || strPathname.startsWith(`${strCandidatePath}/`);
}

function resolveMenuRoute(objItem: MenuItem): string | null {
  const strRoute = objItem.strRoute?.trim() ?? "";
  if (!strRoute) {
    return null;
  }

  const strNormalizedRoute = strRoute.startsWith("/") ? strRoute : `/${strRoute}`;
  const strLowerRoute = strNormalizedRoute.toLowerCase();
  const strModuleCode = objItem.strModuleCode.trim().toLowerCase();
  const strModuleName = objItem.strModuleName.trim().toLowerCase();
  const blnIsMyPayslipMenu =
    strModuleCode.includes("my_payslip") ||
    strModuleCode.includes("my-payslip") ||
    strModuleName.includes("my payslip");

  if (
    strLowerRoute === "/payroll/cycles" ||
    strLowerRoute === "/payroll-cycles" ||
    strLowerRoute.startsWith("/payroll/cycles/") ||
    strLowerRoute.startsWith("/payroll-cycles/")
  ) {
    return strLowerRoute.includes("/add") ? "/payroll/schedules/add" : "/payroll/schedules";
  }

  if (
    strLowerRoute.startsWith("/ess/my-payslip") ||
    strLowerRoute.startsWith("/ess/my-payslips") ||
    blnIsMyPayslipMenu
  ) {
    const lstSegments = strNormalizedRoute.split("/").filter(Boolean);
    const strLastSegment = lstSegments.at(-1) ?? "";
    const blnDetailRoute = /^\d+$/.test(strLastSegment);
    return blnDetailRoute ? `/ess/my-payslips/${strLastSegment}` : "/ess/my-payslips";
  }

  if (
    strLowerRoute === "/payroll/results" ||
    strLowerRoute.startsWith("/payroll/results/")
  ) {
    return "/payroll/results";
  }

  if (
    strLowerRoute === "/payroll/payslips" &&
    (strModuleCode.includes("payroll_result") || strModuleName.includes("payroll result"))
  ) {
    return "/payroll/results";
  }

  if (
    strModuleCode.includes("payslip") ||
    strModuleName.includes("payslip") ||
    strLowerRoute.includes("payslip")
  ) {
    const lstSegments = strNormalizedRoute.split("/").filter(Boolean);
    const strLastSegment = lstSegments.at(-1) ?? "";
    const blnDetailRoute = /^\d+$/.test(strLastSegment);
    return blnDetailRoute ? `/reports/payslips/${strLastSegment}` : "/reports/payslips";
  }

  if (
    strLowerRoute === "/payslips" ||
    strLowerRoute === "/payroll/payslip" ||
    strLowerRoute.startsWith("/payslips/") ||
    strLowerRoute.startsWith("/payroll/payslip/")
  ) {
    const lstSegments = strNormalizedRoute.split("/").filter(Boolean);
    const strLastSegment = lstSegments.at(-1) ?? "";
    const blnDetailRoute = /^\d+$/.test(strLastSegment);
    return blnDetailRoute ? `/reports/payslips/${strLastSegment}` : "/reports/payslips";
  }

  return strNormalizedRoute;
}

function hasRoute(lstItems: MenuItem[], strRoute: string): boolean {
  return lstItems.some((objItem) => {
    const strResolvedRoute = resolveMenuRoute(objItem);
    return strResolvedRoute === strRoute || hasRoute(objItem.lstChildren, strRoute);
  });
}

function isDashboardMenuItem(objItem: MenuItem): boolean {
  const strRoute = resolveMenuRoute(objItem)?.trim().toLowerCase() ?? "";
  const strModuleCode = objItem.strModuleCode.trim().toLowerCase();
  const strModuleName = objItem.strModuleName.trim().toLowerCase();
  return objItem.blnIsHome || strRoute === "/dashboard" || strModuleCode === "dashboard" || strModuleName === "dashboard";
}

function promoteDashboardMenu(lstItems: MenuItem[]): MenuItem[] {
  let objDashboardItem: MenuItem | null = null;

  function stripNestedDashboard(lstCurrentItems: MenuItem[]): MenuItem[] {
    return lstCurrentItems.reduce<MenuItem[]>((lstUpdatedItems, objItem) => {
      if (isDashboardMenuItem(objItem)) {
        if (!objDashboardItem) {
          objDashboardItem = {
            ...objItem,
            strModuleCode: "DASHBOARD",
            strModuleName: "Dashboard",
            strRoute: "/dashboard",
            strIconName: objItem.strIconName ?? "Dashboard",
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

  const lstWithoutNestedDashboard = stripNestedDashboard(lstItems);
  const objResolvedDashboard = objDashboardItem ?? {
    strModuleCode: "DASHBOARD",
    strModuleName: "Dashboard",
    strRoute: "/dashboard",
    strIconName: "Dashboard",
    lstPermissionCodes: [],
    blnIsHome: true,
    lstChildren: [],
  };

  return [objResolvedDashboard, ...lstWithoutNestedDashboard];
}

function hasRouteInReportsBranch(lstItems: MenuItem[], strRoute: string, blnInsideReports = false): boolean {
  return lstItems.some((objItem) => {
    const blnCurrentItemIsReportsBranch = isDirectReportsMenu(objItem);
    const blnCurrentInsideReports = blnInsideReports || blnCurrentItemIsReportsBranch;
    const strResolvedRoute = resolveMenuRoute(objItem);
    return (
      (blnCurrentInsideReports && strResolvedRoute === strRoute) ||
      hasRouteInReportsBranch(objItem.lstChildren, strRoute, blnCurrentInsideReports)
    );
  });
}

function isPayrollMenuBranch(objItem: MenuItem): boolean {
  const strRoute = resolveMenuRoute(objItem)?.toLowerCase() ?? "";
  const strModuleCode = objItem.strModuleCode.toLowerCase();
  const strModuleName = objItem.strModuleName.toLowerCase();
  return (
    strRoute.startsWith("/payroll/") ||
    strModuleCode.includes("payroll") ||
    strModuleName.includes("payroll") ||
    objItem.lstChildren.some(isPayrollMenuBranch)
  );
}

function isPayrollContainerMenu(objItem: MenuItem): boolean {
  const strRoute = resolveMenuRoute(objItem)?.toLowerCase() ?? "";
  const strModuleCode = objItem.strModuleCode.trim().toLowerCase();
  const strModuleName = objItem.strModuleName.trim().toLowerCase();
  return (
    strRoute === "/payroll" ||
    strModuleCode === "payroll" ||
    strModuleName === "payroll"
  );
}

function isEmployeeServicesContainerMenu(objItem: MenuItem): boolean {
  const strRoute = resolveMenuRoute(objItem)?.toLowerCase() ?? "";
  const strModuleCode = objItem.strModuleCode.trim().toLowerCase();
  const strModuleName = objItem.strModuleName.trim().toLowerCase();
  return (
    strRoute === "/employee-services" ||
    strModuleCode === "employee_services" ||
    strModuleName === "employee services"
  );
}

function appendGeneratedPayslipMenu(lstItems: MenuItem[]): MenuItem[] {
  if (hasRouteInReportsBranch(lstItems, "/reports/payslips")) {
    return lstItems;
  }

  let blnInserted = false;
  const lstUpdatedItems = lstItems.map((objItem) => {
    const lstChildren = appendGeneratedPayslipMenu(objItem.lstChildren);
    const blnShouldAppendHere =
      !blnInserted &&
      objItem.lstChildren.length > 0 &&
      isReportsMenuBranch(objItem) &&
      (hasRoute(lstChildren, "/reports/payroll-register") || hasRoute(lstChildren, "/reports/bank-file")) &&
      !hasRoute(lstChildren, "/reports/payslips");

    if (!blnShouldAppendHere) {
      return lstChildren === objItem.lstChildren ? objItem : { ...objItem, lstChildren };
    }

    blnInserted = true;
    return {
      ...objItem,
      lstChildren: [
        ...lstChildren,
        {
          strModuleCode: "PAYROLL_RESULTS",
          strModuleName: "Payslip",
          strRoute: "/reports/payslips",
          strIconName: "ReceiptLong",
          lstPermissionCodes: ["PAYSLIP_LIST"],
          blnIsHome: false,
          lstChildren: [],
        },
      ],
    };
  });

  return lstUpdatedItems;
}

function isDirectReportsMenu(objItem: MenuItem): boolean {
  const strRoute = resolveMenuRoute(objItem)?.toLowerCase() ?? "";
  const strModuleCode = objItem.strModuleCode.trim().toLowerCase();
  const strModuleName = objItem.strModuleName.trim().toLowerCase();
  return (
    strRoute === "/reports" ||
    strModuleCode === "reports" ||
    strModuleCode === "report" ||
    strModuleName === "reports" ||
    strModuleName === "report"
  );
}

function isReportMenuItem(objItem: MenuItem): boolean {
  const strRoute = resolveMenuRoute(objItem)?.toLowerCase() ?? "";
  const strModuleCode = objItem.strModuleCode.trim().toLowerCase();
  const strModuleName = objItem.strModuleName.trim().toLowerCase();
  return (
    isDirectReportsMenu(objItem) ||
    strRoute.startsWith("/reports/") ||
    strModuleCode.includes("report") ||
    strModuleName.includes("report")
  );
}

function removeReportsFromPayrollBranches(lstItems: MenuItem[], blnInsidePayroll = false): MenuItem[] {
  return lstItems.reduce<MenuItem[]>((lstUpdatedItems, objItem) => {
    if (blnInsidePayroll && isReportMenuItem(objItem)) {
      return lstUpdatedItems;
    }

    const blnCurrentItemIsPayrollBranch = isPayrollContainerMenu(objItem);
    lstUpdatedItems.push({
      ...objItem,
      lstChildren: removeReportsFromPayrollBranches(
        objItem.lstChildren,
        blnInsidePayroll || blnCurrentItemIsPayrollBranch,
      ),
    });
    return lstUpdatedItems;
  }, []);
}

function appendGeneratedReimbursementsMenu(lstItems: MenuItem[]): MenuItem[] {
  if (hasRoute(lstItems, "/payroll/reimbursements")) {
    return lstItems;
  }

  let blnInserted = false;
  return lstItems.map((objItem) => {
    const lstChildren = appendGeneratedReimbursementsMenu(objItem.lstChildren);
    const blnShouldAppendHere =
      !blnInserted &&
      objItem.lstChildren.length > 0 &&
      isEmployeeServicesContainerMenu(objItem) &&
      !hasRoute(lstChildren, "/payroll/reimbursements");

    if (!blnShouldAppendHere) {
      return lstChildren === objItem.lstChildren ? objItem : { ...objItem, lstChildren };
    }

    blnInserted = true;
    return {
      ...objItem,
      lstChildren: [
        ...lstChildren,
        {
          strModuleCode: "PAYROLL_REIMBURSEMENTS",
          strModuleName: "Employee Reimbursements",
          strRoute: "/payroll/reimbursements",
          strIconName: "ReceiptLong",
          lstPermissionCodes: ["PAYROLL_REIMBURSEMENTS_VIEW"],
          blnIsHome: false,
          lstChildren: [],
        },
      ],
    };
  });
}

function appendGeneratedFNFMenu(lstItems: MenuItem[]): MenuItem[] {
  if (hasRoute(lstItems, "/payroll/fnf-settlements")) {
    return lstItems;
  }

  let blnInserted = false;
  return lstItems.map((objItem) => {
    const lstChildren = appendGeneratedFNFMenu(objItem.lstChildren);
    const blnShouldAppendHere =
      !blnInserted &&
      objItem.lstChildren.length > 0 &&
      isEmployeeServicesContainerMenu(objItem) &&
      !hasRoute(lstChildren, "/payroll/fnf-settlements");

    if (!blnShouldAppendHere) {
      return lstChildren === objItem.lstChildren ? objItem : { ...objItem, lstChildren };
    }

    blnInserted = true;
    return {
      ...objItem,
      lstChildren: [
        ...lstChildren,
        {
          strModuleCode: "PAYROLL_FNF_SETTLEMENTS",
          strModuleName: "Full and Final Settlement",
          strRoute: "/payroll/fnf-settlements",
          strIconName: "Payments",
          lstPermissionCodes: ["PAYROLL_FNF_VIEW"],
          blnIsHome: false,
          lstChildren: [],
        },
      ],
    };
  });
}

function isEssContainerMenu(objItem: MenuItem): boolean {
  const strRoute = resolveMenuRoute(objItem)?.toLowerCase() ?? "";
  const strModuleCode = objItem.strModuleCode.trim().toLowerCase();
  const strModuleName = objItem.strModuleName.trim().toLowerCase();
  return (
    strRoute === "/ess" ||
    strModuleCode === "ess" ||
    strModuleCode.includes("employee_self_service") ||
    strModuleName === "ess" ||
    strModuleName.includes("employee self service")
  );
}

function appendGeneratedLoansAdvancesMenu(lstItems: MenuItem[]): MenuItem[] {
  if (hasRoute(lstItems, "/payroll/loans-advances")) {
    return lstItems;
  }

  let blnInserted = false;
  return lstItems.map((objItem) => {
    const lstChildren = appendGeneratedLoansAdvancesMenu(objItem.lstChildren);
    const blnShouldAppendHere =
      !blnInserted &&
      objItem.lstChildren.length > 0 &&
      isEmployeeServicesContainerMenu(objItem) &&
      !hasRoute(lstChildren, "/payroll/loans-advances");

    if (!blnShouldAppendHere) {
      return lstChildren === objItem.lstChildren ? objItem : { ...objItem, lstChildren };
    }

    blnInserted = true;
    return {
      ...objItem,
      lstChildren: [
        ...lstChildren,
        {
          strModuleCode: "PAYROLL_LOANS_ADVANCES",
          strModuleName: "Loans & Advances",
          strRoute: "/payroll/loans-advances",
          strIconName: "Payments",
          lstPermissionCodes: ["PAYROLL_LOANS_ADVANCES_VIEW"],
          blnIsHome: false,
          lstChildren: [],
        },
      ],
    };
  });
}

function appendGeneratedEssLoansAdvancesMenu(lstItems: MenuItem[]): MenuItem[] {
  if (hasRoute(lstItems, "/ess/loans-advances")) {
    return lstItems;
  }

  let blnInserted = false;
  const lstUpdatedItems = lstItems.map((objItem) => {
    const lstChildren = appendGeneratedEssLoansAdvancesMenu(objItem.lstChildren);
    const blnShouldAppendHere =
      !blnInserted &&
      objItem.lstChildren.length > 0 &&
      isEssContainerMenu(objItem) &&
      !hasRoute(lstChildren, "/ess/loans-advances");

    if (!blnShouldAppendHere) {
      return lstChildren === objItem.lstChildren ? objItem : { ...objItem, lstChildren };
    }

    blnInserted = true;
    return {
      ...objItem,
      lstChildren: [
        ...lstChildren,
        {
          strModuleCode: "ESS_LOANS_ADVANCES",
          strModuleName: "My Loans & Advances",
          strRoute: "/ess/loans-advances",
          lstPermissionCodes: ["ESS_LOAN_ADV_VIEW"],
          blnIsHome: false,
          lstChildren: [],
        },
      ],
    };
  });

  return lstUpdatedItems;
}

function getMenuIdentityKey(objItem: MenuItem): string {
  const strRoute = resolveMenuRoute(objItem)?.trim().toLowerCase() ?? "";
  const strModuleCode = objItem.strModuleCode.trim().toLowerCase();
  const strModuleName = objItem.strModuleName.trim().toLowerCase();

  if (objItem.lstChildren.length > 0) {
    if (isEmployeeServicesContainerMenu(objItem)) {
      return "group:employee-services";
    }

    if (isDirectReportsMenu(objItem) || strRoute.startsWith("/reports/")) {
      return "group:reports";
    }

    if (isPayrollContainerMenu(objItem) || strRoute.startsWith("/payroll/")) {
      return "group:payroll";
    }

    if (strRoute === "/salary" || strRoute.startsWith("/salary/") || strModuleCode.includes("salary") || strModuleName === "salary") {
      return "group:salary";
    }

    if (
      strRoute === "/masters" ||
      strRoute === "/master" ||
      strModuleCode.includes("masters") ||
      strModuleCode === "master" ||
      strModuleName === "masters" ||
      strModuleName === "master"
    ) {
      return "group:masters";
    }

    if (
      strRoute === "/user-management" ||
      strModuleCode.includes("user_management") ||
      strModuleCode.includes("usermanagement") ||
      strModuleName === "user management"
    ) {
      return "group:user-management";
    }
  }

  return strRoute || strModuleCode || strModuleName;
}

function mergeUniqueMenuChildren(lstExisting: MenuItem[], lstIncoming: MenuItem[]): MenuItem[] {
  const lstMerged = [...lstExisting];
  const dicIndexByKey = new Map<string, number>();

  lstMerged.forEach((objChild, intIndex) => {
    dicIndexByKey.set(getMenuIdentityKey(objChild), intIndex);
  });

  lstIncoming.forEach((objChild) => {
    const strKey = getMenuIdentityKey(objChild);
    const intExistingIndex = dicIndexByKey.get(strKey);
    if (intExistingIndex === undefined) {
      dicIndexByKey.set(strKey, lstMerged.length);
      lstMerged.push(objChild);
      return;
    }

    const objExisting = lstMerged[intExistingIndex];
    lstMerged[intExistingIndex] = {
      ...objExisting,
      strIconName: objChild.strIconName ?? objExisting.strIconName,
      lstChildren: mergeUniqueMenuChildren(objExisting.lstChildren, objChild.lstChildren),
    };
  });

  return lstMerged;
}

function collapseDuplicateMenuBranches(lstItems: MenuItem[]): MenuItem[] {
  const lstCollapsedItems: MenuItem[] = [];
  const dicIndexByKey = new Map<string, number>();

  lstItems.forEach((objItem) => {
    const objItemWithCollapsedChildren = {
      ...objItem,
      lstChildren: collapseDuplicateMenuBranches(objItem.lstChildren),
    };
    const strKey = getMenuIdentityKey(objItemWithCollapsedChildren);
    const intExistingIndex = dicIndexByKey.get(strKey);

    if (intExistingIndex === undefined) {
      dicIndexByKey.set(strKey, lstCollapsedItems.length);
      lstCollapsedItems.push(objItemWithCollapsedChildren);
      return;
    }

    const objExisting = lstCollapsedItems[intExistingIndex];
    lstCollapsedItems[intExistingIndex] = {
      ...objExisting,
      strIconName: objItemWithCollapsedChildren.strIconName ?? objExisting.strIconName,
      lstChildren: mergeUniqueMenuChildren(
        objExisting.lstChildren,
        objItemWithCollapsedChildren.lstChildren,
      ),
    };
    lstCollapsedItems[intExistingIndex].lstPermissionCodes = Array.from(new Set([
      ...objExisting.lstPermissionCodes,
      ...objItemWithCollapsedChildren.lstPermissionCodes,
    ]));
  });

  return lstCollapsedItems;
}

function prepareMenuItems(lstItems: MenuItem[]): MenuItem[] {
  return collapseDuplicateMenuBranches(
    appendGeneratedReportsMenu(
      appendGeneratedPayslipMenu(
        appendGeneratedEssLoansAdvancesMenu(
          appendGeneratedFNFMenu(
            appendGeneratedLoansAdvancesMenu(
              appendGeneratedReimbursementsMenu(
                removeReportsFromPayrollBranches(
                  promoteDashboardMenu(lstItems),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

function getMenuNodeKey(objItem: MenuItem, intDepth: number) {
  return [
    intDepth,
    resolveMenuRoute(objItem)?.trim().toLowerCase() ?? "",
    objItem.strModuleCode.trim().toLowerCase(),
    objItem.strModuleName.trim().toLowerCase(),
    getMenuIdentityKey(objItem),
  ].filter(Boolean).join("|");
}

function findMenuIconSourceItem(objItem: MenuItem): MenuItem {
  const strResolvedIconName = toMaterialIconName(objItem.strIconName ?? "");
  if (objItem.blnIsHome || strResolvedIconName) {
    return objItem;
  }

  for (const objChild of objItem.lstChildren) {
    const objResolvedChild = findMenuIconSourceItem(objChild);
    if (objResolvedChild.blnIsHome || toMaterialIconName(objResolvedChild.strIconName ?? "")) {
      return objResolvedChild;
    }
  }

  return objItem;
}

function hasPayrollResultAccess(lstItems: MenuItem[]): boolean {
  return (
    hasRoute(lstItems, "/payroll/results") ||
    hasRoute(lstItems, "/reports/payslips") ||
    lstItems.some((objItem) => {
      const strModuleCode = objItem.strModuleCode.toLowerCase();
      const strModuleName = objItem.strModuleName.toLowerCase();
      return (
        strModuleCode.includes("payroll_result") ||
        strModuleCode.includes("employee_payroll_result") ||
        strModuleName.includes("payroll result") ||
        hasPayrollResultAccess(objItem.lstChildren)
      );
    })
  );
}

const objGeneratedStatutoryReportMenu: MenuItem = {
  strModuleCode: "STATUTORY_REPORT",
  strModuleName: "Statutory Reports",
  strRoute: "/reports/statutory",
  strIconName: "Source",
  lstPermissionCodes: ["STATUTORY_REPORT_VIEW", "STATUTORY_REPORT_EXPORT"],
  blnIsHome: false,
  lstChildren: [],
};

function isReportsMenuBranch(objItem: MenuItem): boolean {
  const strRoute = resolveMenuRoute(objItem)?.toLowerCase() ?? "";
  const strModuleCode = objItem.strModuleCode.toLowerCase();
  const strModuleName = objItem.strModuleName.toLowerCase();
  return (
    strRoute === "/reports" ||
    strRoute.startsWith("/reports/") ||
    strModuleCode.includes("reports") ||
    strModuleName.includes("reports") ||
    objItem.lstChildren.some(isReportsMenuBranch)
  );
}

function appendGeneratedReportsMenu(lstItems: MenuItem[]): MenuItem[] {
  if (hasRoute(lstItems, "/reports/statutory")) {
    return lstItems;
  }

  if (!hasPayrollResultAccess(lstItems)) {
    return lstItems;
  }

  let blnInserted = false;
  const lstUpdatedItems = lstItems.map((objItem) => {
    const lstChildren = appendGeneratedReportsMenu(objItem.lstChildren);
    const blnShouldAppendHere =
      !blnInserted &&
      objItem.lstChildren.length > 0 &&
      isReportsMenuBranch(objItem) &&
      (hasRoute(lstChildren, "/reports/payroll-register") || hasRoute(lstChildren, "/reports/bank-file")) &&
      !hasRoute(lstChildren, "/reports/statutory");

    if (!blnShouldAppendHere) {
      return lstChildren === objItem.lstChildren ? objItem : { ...objItem, lstChildren };
    }

    blnInserted = true;
    return {
      ...objItem,
      lstChildren: [...lstChildren, objGeneratedStatutoryReportMenu],
    };
  });

  if (blnInserted || hasRoute(lstUpdatedItems, "/reports/statutory")) {
    return lstUpdatedItems;
  }

  return lstUpdatedItems;
}

export default function DynamicMenu({
  lstMenuItems,
  onNavigate,
  blnCollapsed = false,
  onCollapsedClick,
  onCollapsedMenuItemClick,
  strForcedExpandedMenuIdentity,
  onForcedExpandedHandled,
}: DynamicMenuProps) {
  const strPathname = usePathname();
  const objRouter = useRouter();
  const intLanguageID = authHelpers.getLanguageID();
  const { t: tCommon } = useModuleLabels("common");
  const { t: tDepartment } = useModuleLabels("department");
  const { t: tDesignation } = useModuleLabels("designation");
  const { t: tEmployee } = useModuleLabels("employee");
  const { t: tState } = useModuleLabels("state");
  const { t: tCountry } = useModuleLabels("country");
  const { t: tBank } = useModuleLabels("bank");
  const { t: tLocation } = useModuleLabels("location");
  const { t: tGrade } = useModuleLabels("grade");
  const { t: tCostCenter } = useModuleLabels("cost_center");
  const { t: tUser } = useModuleLabels("user");
  const { t: tUserGroup } = useModuleLabels("user_group");
  const { t: tSalaryComponents } = useModuleLabels("salary-components");
  const { t: tSalaryStructures } = useModuleLabels("salary-structures");
  const { t: tEmployeeSalary } = useModuleLabels("employee-salary");
  const { t: tPayrollCycles } = useModuleLabels("payroll-cycles");
  const { t: tPayrollProcessLogs } = useModuleLabels("payroll-process-logs");
  const { t: tPayslips } = useModuleLabels("payslips");
  const { t: tPayrollResults } = useModuleLabels("payroll-results");
  const { t: tEmployeePayrollInput } = useModuleLabels("employee-payroll-input");
  const { t: tTaxRegimes } = useModuleLabels("tax-regimes");
  const { t: tTaxDeclarationComponents } = useModuleLabels("tax-declaration-components");
  const { t: tStatutoryRules } = useModuleLabels("statutory-rules");

  function preferResolvedLabel(strResolvedLabel: string, strMenuName: string, strFallback: string) {
    return strResolvedLabel.trim() || strMenuName.trim() || strFallback;
  }

  function resolveGroupFallbackLabel(strGroupKey: "masters" | "user_management" | "salary" | "payroll" | "reports", strDefaultLabel: string) {
    const strResolvedLabel = tCommon(strGroupKey, "");
    if (strResolvedLabel.trim()) {
      return strResolvedLabel;
    }

    if (intLanguageID === 2) {
      const dicHindiFallbacks: Record<typeof strGroupKey, string> = {
        masters: "मास्टर्स",
        user_management: "यूज़र प्रबंधन",
        salary: "वेतन",
        payroll: "पेरोल",
        reports: "रिपोर्ट्स",
      };
      return dicHindiFallbacks[strGroupKey];
    }

    return strDefaultLabel;
  }

  function resolveKnownMenuLabel(strMenuName: string, strDefaultLabel: string, strHindiLabel: string) {
    const strTrimmedMenuName = strMenuName.trim();
    const normalizeLabel = (strLabel: string) =>
      strLabel.toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ").trim();

    if (
      intLanguageID === 2 &&
      (!strTrimmedMenuName || normalizeLabel(strTrimmedMenuName) === normalizeLabel(strDefaultLabel))
    ) {
      return strHindiLabel;
    }

    return strTrimmedMenuName || strDefaultLabel;
  }

 
  function resolveMenuLabel(objItem: MenuItem) {
    const strRoute = (resolveMenuRoute(objItem) ?? objItem.strRoute ?? "").toLowerCase();
    const strModuleCode = objItem.strModuleCode.trim().toLowerCase();
    const strModuleName = objItem.strModuleName.trim();

    if (objItem.blnIsHome || strRoute === "/dashboard" || strModuleCode === "dashboard") {
      return tCommon("dashboard", strModuleName || "Dashboard");
    }

    if (strModuleCode.includes("department") || strRoute.includes("/departments")) {
      return tDepartment("page_title", strModuleName || "Department");
    }

    if (strModuleCode.includes("designation") || strRoute.includes("/designations")) {
      return tDesignation("page_title", strModuleName || "Designation");
    }

    if (strModuleCode === "state" || strRoute.includes("/states")) {
      return tState("page_title", strModuleName || "State");
    }

    if (strModuleCode === "country" || strRoute.includes("/countries")) {
      return tCountry("page_title", strModuleName || "Country");
    }

    if (strModuleCode === "bank" || strRoute.includes("/banks")) {
      return tBank("page_title", strModuleName || "Bank");
    }

    if (strModuleCode === "location" || strRoute.includes("/locations")) {
      return tLocation("page_title", strModuleName || "Location");
    }

    if (strModuleCode === "grade" || strRoute.includes("/grades")) {
      return tGrade("page_title", strModuleName || "Grade");
    }

    if (
      strModuleCode.includes("cost_center") ||
      strModuleCode.includes("costcenter") ||
      strRoute.includes("/cost-centers")
    ) {
      return tCostCenter("page_title", strModuleName || "Cost Center");
    }

    if (strModuleCode.includes("user_group") || strRoute.includes("/security/user-groups")) {
      return tUserGroup("page_title", strModuleName || "User Group");
    }

    if (strModuleCode === "user" || strRoute.includes("/users")) {
      return tUser("page_title", strModuleName || "User");
    }

    if (strRoute.includes("/salary-components")) {
      return tSalaryComponents("page_title", strModuleName || "Salary Components");
    }

    if (strRoute.includes("/salary-structures")) {
      return tSalaryStructures("page_title", strModuleName || "Salary Structures");
    }

    if (strRoute.includes("/employee-salary") || strModuleCode.includes("employee_salary")) {
      return preferResolvedLabel(
        tEmployeeSalary("employee_salary_title", "Employee Salary"),
        strModuleName,
        "Employee Salary"
      );
    }

    if (strRoute.includes("/hr/it-declaration")) {
      return resolveKnownMenuLabel(strModuleName, "Employee IT Declaration", "कर्मचारी आईटी घोषणा");
    }

    if (
      strRoute.includes("/ess/it-declaration") ||
      strRoute.includes("/salary/ess-declarations") ||
      strRoute.includes("/salary/it-declaration")
    ) {
      return strModuleName || "IT Declaration";
    }

    if (strRoute.includes("/salary/flexi-pay-declarations") || strRoute.includes("/salary/flexi-pay-declaration")) {
      return strModuleName || "Flexi Pay Declaration";
    }

    if (strRoute.includes("/payroll-cycles") || strRoute.includes("/payroll/cycles")) {
      return preferResolvedLabel(
        tPayrollCycles(
          "schedule_page_title",
          strModuleName || "Payroll Schedules"
        ),
        strModuleName,
        "Payroll Schedules"
      );
    }

    if (strRoute.includes("/payroll/runs")) {
      return preferResolvedLabel(
        strModuleName,
        strModuleName,
        "Payroll Runs"
      );
    }

    if (
      strRoute.includes("/payroll/employee-payroll-inputs") ||
      strRoute.includes("/payroll/employee-payroll-input") ||
      strRoute.includes("/payroll/inputs") ||
      strModuleCode.includes("employee_payroll_input")
    ) {
      return preferResolvedLabel(
        tEmployeePayrollInput(
          "page_title",
          getLastBreadcrumbSegment(
            tEmployeePayrollInput("breadcrumbs", "Payroll / Payroll Input")
          )
        ),
        strModuleName,
        "Payroll Input"
      );
    }


    if (strRoute.includes("/payroll/payslips") || strModuleCode.includes("payslip")) {
      return preferResolvedLabel(
        tPayslips("payslips_title", "Payslips"),
        strModuleName,
        "Payslips"
      );
    }

    if (strRoute.includes("/payroll/statutory-rules")) {
      return preferResolvedLabel(
        tStatutoryRules(
          "page_title",
          getLastBreadcrumbSegment(
            tStatutoryRules("breadcrumbs", "Payroll / Statutory Rules")
          )
        ),
        strModuleName,
        "Statutory Rules"
      );
    }

    if (
      strRoute.includes("/payroll-process-logs") ||
      strRoute.includes("/payroll/process-log")
    ) {
      return tPayrollProcessLogs("page_title", strModuleName || "Payroll Process Logs");
    }

    if (strRoute.includes("/tax-regimes")) {
      return preferResolvedLabel(
        tTaxRegimes("tax_regimes_title", "Tax Regimes"),
        strModuleName,
        "Tax Regimes"
      );
    }

    if (
      strRoute.includes("/masters/tax-declaration-component") ||
      strModuleCode.includes("tax_declaration_component") ||
      strModuleCode.includes("ess_declaration_category")
    ) {
      return preferResolvedLabel(
        tTaxDeclarationComponents("page_title", "Tax Declaration Component"),
        strModuleName,
        "Tax Declaration Component"
      );
    }

    if (strRoute.includes("/payroll/reimbursements") || strModuleCode.includes("reimbursement")) {
      return resolveKnownMenuLabel(strModuleName, "Employee Reimbursements", "कर्मचारी प्रतिपूर्ति");
    }

    if (strRoute.includes("/payroll/fnf-settlements") || strModuleCode.includes("fnf")) {
      return resolveKnownMenuLabel(strModuleName, "Full and Final Settlement", "पूर्ण और अंतिम निपटान");
    }

    if (strRoute.includes("/payroll/loans-advances") || (strModuleCode.includes("loan") && strModuleCode.includes("advance"))) {
      return resolveKnownMenuLabel(strModuleName, "Loans & Advances", "ऋण और अग्रिम");
    }

    if (strRoute.includes("/calendar")) {
      return strModuleName || "Calendar";
    }

    if (strRoute.includes("/reports/payroll-register") || strModuleCode.includes("payroll_register")) {
      return resolveKnownMenuLabel(strModuleName, "Payroll Register", "पेरोल रजिस्टर");
    }

    if (strRoute.includes("/reports/bank-file") || strModuleCode.includes("bank_file")) {
      return resolveKnownMenuLabel(strModuleName, "Bank File", "बैंक फ़ाइल");
    }

    if (strRoute.includes("/reports/statutory") || strModuleCode.includes("statutory_report")) {
      return resolveKnownMenuLabel(strModuleName, "Statutory Reports", "वैधानिक रिपोर्ट");
    }

    if (strModuleCode === "employee_services" || strModuleName.trim().toLowerCase() === "employee services") {
      return resolveKnownMenuLabel(strModuleName, "Employee Services", "कर्मचारी सेवाएं");
    }

    // Leave Plan assignment menu (module code contains "employee") must not be
    // caught by the generic employee-master branch below; use its localized menu name.
    if (strRoute.includes("/leave/plan-assignments") || strModuleCode === "employee_leave_assignment") {
      return strModuleName || "Employee Leave Assignment";
    }

    if (strModuleCode.includes("employee") || strRoute.includes("/employees")) {
      return tEmployee("page_title", strModuleName || "Employee");
    }

    if (strModuleCode.includes("masters")) {
      return resolveGroupFallbackLabel("masters", strModuleName || "Masters");
    }

    if (strModuleCode.includes("payroll")) {
      return resolveGroupFallbackLabel("payroll", strModuleName || "Payroll");
    }

    if (strModuleCode.includes("reports") || strModuleCode === "report") {
      return resolveGroupFallbackLabel("reports", strModuleName || "Reports");
    }

    if (strModuleCode.includes("salary")) {
      return resolveGroupFallbackLabel("salary", strModuleName || "Salary");
    }

    if (strModuleCode.includes("user_management") || strModuleCode.includes("usermanagement")) {
      return resolveGroupFallbackLabel("user_management", strModuleName || "User Management");
    }

    return strModuleName;
  }

  function hasActiveDescendant(objItem: MenuItem): boolean {
    return objItem.lstChildren.some(
      (objChild) => matchesRoute(resolveMenuRoute(objChild), strPathname) || hasActiveDescendant(objChild),
    );
  }

  function collectExpandableDefaults(lstItems: MenuItem[], intDepth = 0): Record<string, boolean> {
    return Object.fromEntries(
      lstItems.flatMap((objItem) => {
        if (objItem.lstChildren.length === 0) {
          return [];
        }

        return [
          [getMenuNodeKey(objItem, intDepth), hasActiveDescendant(objItem)],
          ...Object.entries(collectExpandableDefaults(objItem.lstChildren, intDepth + 1)),
        ];
      }),
    );
  }

  const lstRenderedMenuItems = useMemo(
    () => prepareMenuItems(lstMenuItems),
    [lstMenuItems],
  );
  const dicDefaultExpanded = useMemo(
    () => collectExpandableDefaults(lstRenderedMenuItems),
    [lstRenderedMenuItems, strPathname],
  );
  const [dicExpandedMenus, setDicExpandedMenus] = useState<Record<string, boolean>>(dicDefaultExpanded);

  useEffect(() => {
    const dicActiveDefaults = collectExpandableDefaults(lstRenderedMenuItems);
    const lstTopLevelKeys = lstRenderedMenuItems
      .filter((objItem) => objItem.lstChildren.length > 0)
      .map((objItem) => getMenuNodeKey(objItem, 0));
    const strActiveTopLevelKey = lstTopLevelKeys.find((strKey) => dicActiveDefaults[strKey]);

    setDicExpandedMenus((dicPrevious) => {
      const dicNext = {
        ...dicPrevious,
        ...dicActiveDefaults,
      };

      if (strActiveTopLevelKey) {
        lstTopLevelKeys.forEach((strKey) => {
          dicNext[strKey] = strKey === strActiveTopLevelKey;
        });
      }

      return dicNext;
    });
  }, [lstRenderedMenuItems, strPathname]);

  function toggleMenu(strMenuKey: string) {
    setDicExpandedMenus((dicPrevious) => ({
      ...dicPrevious,
      [strMenuKey]: !dicPrevious[strMenuKey],
    }));
  }

  function getButtonStyles(blnIsActive: boolean, intDepth = 0) {
    return {
      borderRadius: "14px",
      mb: 0.5,
      minHeight: intDepth === 0 ? 50 : 44,
      alignItems: "center",
      pl: `${8 + intDepth * 16}px !important`,
      pr: 1.25,
      backgroundColor: blnIsActive ? objSidebarPalette.activeBackground : "transparent",
      transition: "background-color 160ms ease, color 160ms ease",
      "&:hover": {
        backgroundColor: blnIsActive ? objSidebarPalette.activeBackground : objSidebarPalette.hoverBackground,
      },
    };
  }

  function expandSingleTopLevelMenu(strMenuKey: string) {
    setDicExpandedMenus((dicPrevious) => {
      const dicNext = { ...dicPrevious };
      lstRenderedMenuItems.forEach((objTopLevelItem) => {
        dicNext[getMenuNodeKey(objTopLevelItem, 0)] = false;
      });
      dicNext[strMenuKey] = true;
      return dicNext;
    });
  }

  function toggleSingleTopLevelMenu(strMenuKey: string) {
    setDicExpandedMenus((dicPrevious) => {
      const blnWasExpanded = dicPrevious[strMenuKey] ?? false;
      const dicNext = { ...dicPrevious };

      lstRenderedMenuItems.forEach((objTopLevelItem) => {
        dicNext[getMenuNodeKey(objTopLevelItem, 0)] = false;
      });

      dicNext[strMenuKey] = !blnWasExpanded;
      return dicNext;
    });
  }

  useEffect(() => {
    if (!strForcedExpandedMenuIdentity) {
      return;
    }

    const objTargetTopLevelMenu = lstRenderedMenuItems.find(
      (objItem) => getMenuIdentityKey(objItem) === strForcedExpandedMenuIdentity && objItem.lstChildren.length > 0,
    );

    if (objTargetTopLevelMenu) {
      expandSingleTopLevelMenu(getMenuNodeKey(objTargetTopLevelMenu, 0));
    }

    onForcedExpandedHandled?.();
  }, [lstRenderedMenuItems, onForcedExpandedHandled, strForcedExpandedMenuIdentity]);

  function getCollapsedButtonStyles(blnIsActive: boolean) {
    return {
      width: 44,
      height: 44,
      minWidth: 44,
      borderRadius: "12px",
      mb: 0.75,
      display: "grid",
      placeItems: "center",
      color: blnIsActive ? objSidebarPalette.activeAccent : objSidebarPalette.menuIcon,
      backgroundColor: blnIsActive ? objSidebarPalette.activeBackground : "transparent",
      transition: "background-color 160ms ease, color 160ms ease, transform 160ms ease",
      "&:hover": {
        backgroundColor: objSidebarPalette.hoverBackground,
        color: objSidebarPalette.activeAccent,
        transform: "translateX(1px)",
      },
      "& .MuiListItemIcon-root": {
        minWidth: 0,
      },
      "& .material-icons": {
        fontSize: 24,
      },
    };
  }

  function renderCollapsedMenuItem(objItem: MenuItem, intDepth = 0): ReactNode {
    const strMenuKey = getMenuNodeKey(objItem, intDepth);
    const strRoute = resolveMenuRoute(objItem);
    const blnIsActive = matchesRoute(strRoute, strPathname) || hasActiveDescendant(objItem);
    const objIconSourceItem = findMenuIconSourceItem(objItem);

    const blnHasChildren = objItem.lstChildren.length > 0;

    return (
      <Tooltip key={strMenuKey} title={resolveMenuLabel(objItem)} placement="right" arrow>
        <ListItemButton
          {...getAutomationProps(`nav.collapsed-menu.${toMenuTestSegment(objItem.strModuleCode || objItem.strModuleName)}.button`)}
          aria-label={resolveMenuLabel(objItem)}
          onClick={() => {
            if (blnHasChildren) {
              onCollapsedClick?.();
              onCollapsedMenuItemClick?.(getMenuIdentityKey(objItem));
              return;
            }

            if (strRoute) {
              onNavigate?.();
              objRouter.push(strRoute);
            }
          }}
          sx={getCollapsedButtonStyles(blnIsActive)}
        >
          <ListItemIcon sx={{ color: "inherit", justifyContent: "center" }}>
            {getMenuIcon(objIconSourceItem)}
          </ListItemIcon>
        </ListItemButton>
      </Tooltip>
    );
  }

  function renderMenuItem(objItem: MenuItem, intDepth = 0): ReactNode {
    const strRoute = resolveMenuRoute(objItem);
    const strMenuKey = getMenuNodeKey(objItem, intDepth);
    const blnIsActive = matchesRoute(strRoute, strPathname);
    const blnHasChildren = objItem.lstChildren.length > 0;
    const blnHasActiveChild = hasActiveDescendant(objItem);
    const blnExpanded = dicExpandedMenus[strMenuKey] ?? blnHasActiveChild;
    const objIconSourceItem = findMenuIconSourceItem(objItem);

    if (blnHasChildren) {
      return (
        <Fragment key={strMenuKey}>
          <ListItemButton
            {...getAutomationProps(`nav.menu.${toMenuTestSegment(objItem.strModuleCode || objItem.strModuleName)}.toggle`)}
            data-menu-code={objItem.strModuleCode}
            data-menu-label={resolveMenuLabel(objItem)}
            data-menu-route={strRoute ?? ""}
            onClick={() => {
              if (intDepth === 0) {
                toggleSingleTopLevelMenu(strMenuKey);
                return;
              }

              toggleMenu(strMenuKey);
            }}
            sx={getButtonStyles(blnHasActiveChild || blnExpanded, intDepth)}
          >
            <ListItemIcon sx={{ minWidth: 38, color: blnHasActiveChild || blnExpanded ? objSidebarPalette.activeAccent : objSidebarPalette.menuIcon }}>
              {getMenuIcon(objIconSourceItem)}
            </ListItemIcon>
            <ListItemText
              primary={resolveMenuLabel(objItem)}
              primaryTypographyProps={{
                fontWeight: 700,
                color: blnHasActiveChild || blnExpanded ? objSidebarPalette.activeAccent : objSidebarPalette.menuText,
                fontSize: intDepth === 0 ? "0.96rem" : "0.9rem",
              }}
            />
            {blnExpanded ? <ExpandLessRoundedIcon sx={{ color: objSidebarPalette.activeAccent }} /> : <ExpandMoreRoundedIcon sx={{ color: objSidebarPalette.activeAccent }} />}
          </ListItemButton>

          <Collapse in={blnExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ position: "relative", ml: intDepth === 0 ? 1.25 : 0.5, mt: 0.25, mb: 0.5 }}>
              <List disablePadding>
                {objItem.lstChildren.map((objChild) => renderMenuItem(objChild, intDepth + 1))}
              </List>
            </Box>
          </Collapse>
        </Fragment>
      );
    }

    return (
      <ListItemButton
        key={strMenuKey}
        {...getAutomationProps(`nav.menu.${toMenuTestSegment(objItem.strModuleCode || objItem.strModuleName)}.link`)}
        data-menu-code={objItem.strModuleCode}
        data-menu-label={resolveMenuLabel(objItem)}
        data-menu-route={strRoute ?? ""}
        component={Link}
        href={strRoute ?? "#"}
        onClick={onNavigate}
        sx={getButtonStyles(blnIsActive, intDepth)}
      >
        <ListItemIcon sx={{ minWidth: 38, color: blnIsActive ? objSidebarPalette.activeAccent : objSidebarPalette.menuIcon }}>
          {getMenuIcon(objIconSourceItem)}
        </ListItemIcon>
        <ListItemText
          primary={resolveMenuLabel(objItem)}
          primaryTypographyProps={{
            fontWeight: blnIsActive ? 700 : 600,
            color: blnIsActive ? objSidebarPalette.activeAccent : objSidebarPalette.menuText,
            fontSize: intDepth === 0 ? "0.96rem" : "0.9rem",
          }}
        />
      </ListItemButton>
    );
  }

  if (blnCollapsed) {
    return (
      <List
        {...getAutomationProps("nav.collapsed-menu.list")}
        sx={{
          width: "100%",
          mt: 0,
          py: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {lstRenderedMenuItems.map((objItem) => renderCollapsedMenuItem(objItem))}
      </List>
    );
  }

  return (
    <List
      {...getAutomationProps("nav.menu.list")}
      sx={{
        mt: 0,
        ml: -0.5,
        width: "calc(100% + 4px)",
      }}
    >
      {lstRenderedMenuItems.map((objItem) => renderMenuItem(objItem))}
    </List>
  );
}
