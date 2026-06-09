"use client";

import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import GradeRoundedIcon from "@mui/icons-material/GradeRounded";
import Groups2RoundedIcon from "@mui/icons-material/Groups2Rounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import SourceRoundedIcon from "@mui/icons-material/SourceRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import WorkspacesRoundedIcon from "@mui/icons-material/WorkspacesRounded";
import { Box, Collapse, List, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, type ReactNode, useEffect, useMemo, useState } from "react";

import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { authHelpers } from "@/lib/auth";
import type { MenuItem } from "@/models/AuthModels";

type DynamicMenuProps = {
  lstMenuItems: MenuItem[];
  onNavigate?: () => void;
};

const objMenuIconSx = { color: "inherit" };

function toMenuTestSegment(strValue: string) {
  return strValue.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

function getMenuIcon(objItem: MenuItem) {
  const strIconName = (objItem as MenuItem & { strIconName?: string | null }).strIconName?.toLowerCase() ?? "";
  if (objItem.blnIsHome) {
    return <DashboardRoundedIcon sx={objMenuIconSx} />;
  }

  const strRoute = (objItem.strRoute ?? "").toLowerCase();
  const strModuleName = objItem.strModuleName.toLowerCase();
  const strModuleCode = objItem.strModuleCode.toLowerCase();
  const strLookupKey = `${strIconName} ${strModuleCode} ${strModuleName} ${strRoute}`;

  if (strLookupKey.includes("bank")) {
    return <AccountBalanceRoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("location")) {
    return <LocationOnRoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("country") || strLookupKey.includes("state")) {
    return <PublicRoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("grade")) {
    return <GradeRoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("cost center") || strLookupKey.includes("cost-center") || strLookupKey.includes("costcenter")) {
    return <AccountTreeRoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("department")) {
    return <ApartmentRoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("designation")) {
    return <BadgeRoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("payroll")) {
    return <PaymentsRoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("reimbursement") || strLookupKey.includes("claim")) {
    return <ReceiptLongRoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("calendar")) {
    return <CalendarMonthRoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("employee") || strLookupKey.includes("user")) {
    return <Groups2RoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("profile")) {
    return <PersonRoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("report")) {
    return <SourceRoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("setting")) {
    return <SettingsRoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("theme")) {
    return <TuneRoundedIcon sx={objMenuIconSx} />;
  }

  return <WorkspacesRoundedIcon sx={objMenuIconSx} />;
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
  return strPathname === strCandidateRoute || strPathname.startsWith(`${strCandidateRoute}/`);
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
    strLowerRoute === "/payroll/results" &&
    (strModuleCode.includes("payslip") || strModuleName.includes("payslip"))
  ) {
    return "/reports/payslips";
  }

  if (
    strLowerRoute === "/payroll/payslips" &&
    (strModuleCode.includes("payroll_result") || strModuleName.includes("payroll result"))
  ) {
    return "/payroll/results";
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
          strModuleCode: "PAYSLIPS",
          strModuleName: "Payslips",
          strRoute: "/reports/payslips",
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
      isPayrollContainerMenu(objItem) &&
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
          strModuleName: "Reimbursements",
          strRoute: "/payroll/reimbursements",
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
      isPayrollContainerMenu(objItem) &&
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
          lstPermissionCodes: ["PAYROLL_FNF_VIEW"],
          blnIsHome: false,
          lstChildren: [],
        },
      ],
    };
  });
}

function getMenuIdentityKey(objItem: MenuItem): string {
  const strRoute = resolveMenuRoute(objItem)?.trim().toLowerCase() ?? "";
  const strModuleCode = objItem.strModuleCode.trim().toLowerCase();
  const strModuleName = objItem.strModuleName.trim().toLowerCase();

  if (objItem.lstChildren.length > 0) {
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
    removeReportsFromPayrollBranches(
      appendGeneratedReportsMenu(
        appendGeneratedFNFMenu(
          appendGeneratedReimbursementsMenu(
            appendGeneratedPayslipMenu(
              promoteDashboardMenu(lstItems),
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

export default function DynamicMenu({ lstMenuItems, onNavigate }: DynamicMenuProps) {
  const strPathname = usePathname();
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

  function resolveMenuLabel(objItem: MenuItem) {
    const strRoute = (objItem.strRoute ?? "").toLowerCase();
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

    if (strRoute.includes("/salary/ess-declarations") || strRoute.includes("/salary/it-declaration")) {
      return "IT Declaration";
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
            tEmployeePayrollInput("breadcrumbs", "Payroll / Employee Payroll Input")
          )
        ),
        strModuleName,
        "Employee Payroll Input"
      );
    }

    if (strRoute.includes("/payroll/results") || strModuleCode.includes("payroll_result")) {
      return preferResolvedLabel(
        tPayrollResults("page_title", "Payroll Results"),
        strModuleName,
        "Payroll Results"
      );
    }

    if (strRoute.includes("/reports/payslips") || strRoute.includes("/payroll/payslips") || strModuleCode.includes("payslip")) {
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

    if (strRoute.includes("/payroll/reimbursements") || strModuleCode.includes("reimbursement")) {
      return strModuleName || "Reimbursements";
    }

    if (strRoute.includes("/payroll/fnf-settlements") || strModuleCode.includes("fnf")) {
      return strModuleName || "Full and Final Settlement";
    }

    if (strRoute.includes("/reports/payroll-register") || strModuleCode.includes("payroll_register")) {
      return strModuleName || "Payroll Register";
    }

    if (strRoute.includes("/reports/bank-file") || strModuleCode.includes("bank_file")) {
      return strModuleName || "Bank File";
    }

    if (strRoute.includes("/reports/statutory") || strModuleCode.includes("statutory_report")) {
      return strModuleName || "Statutory Reports";
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
    setDicExpandedMenus((dicPrevious) => ({
      ...dicPrevious,
      ...collectExpandableDefaults(lstRenderedMenuItems),
    }));
  }, [lstRenderedMenuItems, strPathname]);

  function toggleMenu(strMenuKey: string) {
    setDicExpandedMenus((dicPrevious) => ({
      ...dicPrevious,
      [strMenuKey]: !dicPrevious[strMenuKey],
    }));
  }

  function getButtonStyles(blnIsActive: boolean, intDepth = 0) {
    return {
      borderRadius: "18px",
      mb: 0.5,
      minHeight: intDepth === 0 ? 50 : 44,
      alignItems: "center",
      pl: 1.5 + intDepth * 2,
      pr: 1.25,
      background: blnIsActive
        ? "linear-gradient(135deg, rgba(219,234,254,0.92), rgba(224,242,254,0.88))"
        : "transparent",
      border: blnIsActive ? "1px solid rgba(96, 165, 250, 0.28)" : "1px solid transparent",
      boxShadow: blnIsActive ? "0 10px 24px rgba(59, 130, 246, 0.12)" : "none",
      transition: "all 160ms ease",
      "&:hover": {
        background: blnIsActive
          ? "linear-gradient(135deg, rgba(219,234,254,0.96), rgba(224,242,254,0.92))"
          : "rgba(241,245,249,0.9)"
      }
    };
  }

  function renderMenuItem(objItem: MenuItem, intDepth = 0): ReactNode {
    const strRoute = resolveMenuRoute(objItem);
    const strMenuKey = getMenuNodeKey(objItem, intDepth);
    const blnIsActive = matchesRoute(strRoute, strPathname);
    const blnHasChildren = objItem.lstChildren.length > 0;
    const blnHasActiveChild = hasActiveDescendant(objItem);
    const blnExpanded = dicExpandedMenus[strMenuKey] ?? blnHasActiveChild;

    if (blnHasChildren) {
      return (
        <Fragment key={strMenuKey}>
          <ListItemButton
            data-testid={`nav.menu.${toMenuTestSegment(objItem.strModuleCode || objItem.strModuleName)}.toggle`}
            data-menu-code={objItem.strModuleCode}
            data-menu-label={resolveMenuLabel(objItem)}
            data-menu-route={strRoute ?? ""}
            onClick={() => toggleMenu(strMenuKey)}
            sx={getButtonStyles(blnHasActiveChild, intDepth)}
          >
            <ListItemIcon sx={{ minWidth: 38, color: blnHasActiveChild ? "#2563eb" : "#64748b" }}>
              {getMenuIcon(objItem)}
            </ListItemIcon>
            <ListItemText
              primary={resolveMenuLabel(objItem)}
              primaryTypographyProps={{
                fontWeight: 700,
                color: "#0f172a",
                fontSize: intDepth === 0 ? "0.96rem" : "0.9rem",
              }}
            />
            {blnExpanded ? <ExpandLessRoundedIcon sx={{ color: "#2563eb" }} /> : <ExpandMoreRoundedIcon sx={{ color: "#2563eb" }} />}
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
        data-testid={`nav.menu.${toMenuTestSegment(objItem.strModuleCode || objItem.strModuleName)}.link`}
        data-menu-code={objItem.strModuleCode}
        data-menu-label={resolveMenuLabel(objItem)}
        data-menu-route={strRoute ?? ""}
        component={Link}
        href={strRoute ?? "#"}
        onClick={onNavigate}
        sx={getButtonStyles(blnIsActive, intDepth)}
      >
        <ListItemIcon sx={{ minWidth: 38, color: blnIsActive ? "#2563eb" : "#64748b" }}>
          {getMenuIcon(objItem)}
        </ListItemIcon>
        <ListItemText
          primary={resolveMenuLabel(objItem)}
          primaryTypographyProps={{
            fontWeight: blnIsActive ? 700 : 600,
            color: intDepth === 0 ? "#0f172a" : "#334155",
            fontSize: intDepth === 0 ? "0.96rem" : "0.9rem",
          }}
        />
      </ListItemButton>
    );
  }

  return (
    <List data-testid="nav.menu.list" sx={{ mt: 0 }}>
      {lstRenderedMenuItems.map((objItem) => renderMenuItem(objItem))}
    </List>
  );
}
