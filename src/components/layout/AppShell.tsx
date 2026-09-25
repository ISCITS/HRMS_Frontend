"use client";

import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  ButtonBase,
  Menu,
  MenuItem,
  Paper,
  Stack,
  SvgIcon,
  Toolbar,
  Tooltip,
  Typography
} from "@mui/material";
import { ReactNode, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DashboardHeaderModeContext } from "@/components/layout/DashboardHeaderModeContext";
import BannerSearch from "@/components/layout/BannerSearch";
import DynamicMenu from "@/components/navigation/DynamicMenu";
import BlockingLoader, { BlockingLoaderViewportProvider } from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { labelService } from "@/features/labels/services/labelService";
import { resolveRouteModuleName } from "@/features/labels/utils/resolveRouteModuleName";
import { stripMasterTitle } from "@/features/labels/utils/stripMasterTitle";
import { employeeService } from "@/features/employee/services/employeeService";
import { useAuthenticatedAvatar } from "@/hooks/useAuthenticatedAvatar";
import { authHelpers } from "@/lib/auth";
import { withBasePath } from "@/lib/basePath";
import { appConfig } from "@/config/app";
import { normalizeMenuResponse } from "@/lib/menu";
import { getPostLoginRoute } from "@/lib/RouteGuard";
import { getLogoutUrl } from "@/lib/urlHelpers";
import {
  isAuthenticatedAppRoute,
  readAuthenticatedRouteHistory,
  writeAuthenticatedRouteHistory
} from "@/lib/routeAccess";
import type { CurrentUserContext, MenuItem as AuthMenuItem, MenuResponse, PortalCode, TenantAuthDetails } from "@/models/AuthModels";
import { ApiRequestError } from "@/Common/utils/apiErrorHandler";
import { authApiService } from "@/services";

const intDrawerWidth = 308;
const intTopBarHeight = 55;
const intBannerHeight = 56;
const intMenuZIndex = 1700;
const intCollapsedMenuRailWidth = 60;
const intContentLoaderZIndex = 1200;
const strLanguageSwitchTokenKey = "hrms_language_switch_token";
const strLanguageSwitchLanguageKey = "hrms_language_switch_language_id";
const strModuleLabelsLoadStartEventName = "hrms:module-label-load-start";
const strModuleLabelsLoadEndEventName = "hrms:module-label-load-end";
const strAvatarRefreshEventName = "hrms:avatar-refresh";
const intLanguageSwitchSettledDelayMs = 900;
const strSidebarGradient = "var(--app-menu-background)";
// Product and current-page headings share one responsive scale across the app bar.
const objAppBarHeadingFontSize = { xs: "1.02rem", md: "1.28rem", lg: "1.42rem" } as const;

function AppMenuLogo() {
  return (
    <Box sx={{
      width: 40,
      height: 40,
      display: "grid",
      placeItems: "center",
      flexShrink: 0,
      "& .app-logo-image, & .app-logo-hover-icon": { gridArea: "1 / 1" },
      "& .app-logo-hover-icon": { opacity: 0 },
      "&:hover .app-logo-image, .MuiIconButton-root:hover & .app-logo-image": { opacity: 0 },
      "&:hover .app-logo-hover-icon, .MuiIconButton-root:hover & .app-logo-hover-icon": { opacity: 1 }
    }}>
      <Box className="app-logo-image" component="img" src={withBasePath("/app_logo/NavHR_Menu_Icon_96px.jpg")} alt="" sx={{ width: 40, height: 40, borderRadius: "16px", objectFit: "contain" }} />
      <SvgIcon className="app-logo-hover-icon" viewBox="0 0 24 24" sx={{ fontSize: 24, color: "var(--app-menu-icon-color, #2463a0)" }}>
        <rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M10 4v16" fill="none" stroke="currentColor" strokeWidth="1.7" />
      </SvgIcon>
    </Box>
  );
}

function getAutomationProps(strControlId?: string) {
  return strControlId ? ({ "data-controlid": strControlId } as const) : {};
}

function getRouteWithSearch(strPathname: string, objSearchParams: ReturnType<typeof useSearchParams>) {
  const strQuery = objSearchParams?.toString();
  return strQuery ? `${strPathname}?${strQuery}` : strPathname;
}

function getPageTitle(strPathname: string) {
  if (!strPathname || strPathname === "/") {
    return "Dashboard";
  }

  // The Leave Types list lives at /leave; show its proper name rather than the bare segment "Leave".
  if (strPathname === "/leave") {
    return "Leave Types";
  }
  if (strPathname === "/leave/leave-types/new") {
    return "New Leave Type";
  }
  if (/^\/leave\/leave-types\/\d+$/.test(strPathname)) {
    return "Edit Leave Type";
  }
  if (strPathname === "/leave/plans") {
    return "Leave Plans";
  }
  if (strPathname === "/leave/plans/new") {
    return "New Leave Plan";
  }
  if (/^\/leave\/plans\/\d+$/.test(strPathname)) {
    return "Edit Leave Plan";
  }
  if (strPathname === "/leave/plan-assignments") {
    return "Employee Leave Plan Assignment";
  }
  if (/^\/leave\/plan-assignments\/\d+$/.test(strPathname)) {
    return "Edit Employee Leave Assignment";
  }
  // ESS self-service leave lands on /ess/leave; show "Apply Leave" instead of the bare "Ess / Leave".
  if (strPathname === "/ess/leave") {
    return "Apply Leave";
  }
  if (strPathname === "/ess/leave/approvals") {
    return "Leave Approvals";
  }
  if (strPathname === "/ess/team-calendar") {
    return "Team Calendar";
  }
  if (strPathname === "/leave/approvals" || strPathname === "/hr/leave/requests-approvals") {
    return "Leave Requests & Approvals";
  }
  // Work on Holiday keeps its own identity in the breadcrumb even though its routes are
  // nested under legacy /leave and /ess paths (see DynamicMenu.tsx route resolution).
  if (strPathname === "/leave/work-on-holiday/requests" || strPathname === "/ess/work-on-holiday/approvals") {
    return "Work on Holiday Requests";
  }
  if (strPathname === "/ess/work-on-holiday" || strPathname === "/ess/work-on-holiday-request") {
    return "Work on Holiday";
  }

  // The shell header names the screen; it is not a breadcrumb of the address bar. Joining the path
  // segments exposed the route structure and, once records were addressed by record_uuid, the
  // identifier itself ("Leave / Leave Types / De4449e0 2f92..."). Only the most specific
  // human-meaningful segment is kept, and record identifiers never appear.
  const lstSegments = strPathname
    .split("/")
    .filter(Boolean)
    .filter((strSegment) => !isRecordIdentifierSegment(strSegment))
    .map((strSegment) =>
      strSegment
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (strCharacter) => strCharacter.toUpperCase())
    );

  return lstSegments.at(-1) || "Dashboard";
}

// A path segment that identifies one record or the action being taken on it, rather than naming a
// screen: a legacy numeric id, a record_uuid, or the add/edit/view verbs.
function isRecordIdentifierSegment(strSegment: string) {
  const strValue = strSegment.trim().toLowerCase();
  if (strValue === "add" || strValue === "edit" || strValue === "view" || strValue === "new") {
    return true;
  }
  if (/^\d+$/.test(strValue)) {
    return true;
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(strValue);
}

function getCommonPageTitle(strPathname: string, tCommon: (strKey: string, strFallback?: string) => string) {
  const strLowerPath = (strPathname || "").toLowerCase();
  if (strLowerPath === "/dashboard") {
    return tCommon("dashboard", "Dashboard");
  }
  return getPageTitle(strPathname);
}

function getLastBreadcrumbSegment(strValue: string) {
  const lstSegments = strValue
    .split("/")
    .map((strSegment) => strSegment.trim())
    .filter(Boolean);

  return lstSegments.at(-1) ?? strValue.trim();
}

function getLocalizedHeaderTitle(
  strPathname: string,
  strHeaderModuleName: string,
  tHeader: (strKey: string, strFallback?: string) => string,
  tCommon: (strKey: string, strFallback?: string) => string,
  strBackRoute = "",
  strViewMode = "",
  strSource = ""
) {
  const strLowerPath = (strPathname || "").toLowerCase();
  const strLowerBackRoute = (strBackRoute || "").toLowerCase();

  if (!strHeaderModuleName) {
    return getCommonPageTitle(strPathname, tCommon);
  }

  if (strHeaderModuleName === "employee-payroll-input") {
    if (strLowerPath.endsWith("/new")) {
      return tHeader("add_title", "Create Payroll Input");
    }
    if (strLowerPath.includes("/edit")) {
      return tHeader("edit_title", "Edit Payroll Input");
    }
     if (strLowerPath.includes("view")) {
      return tHeader("view_title", "View Payroll Input");
    }
    return stripMasterTitle(
      tHeader(
        "page_title",
        getLastBreadcrumbSegment(
          tHeader("breadcrumbs", "Payroll / Payroll Input")
        )
      )
    );
  }

  if (strHeaderModuleName === "payroll-runs") {
    if (strLowerPath.endsWith("/new")) {
      return tHeader("add_title", "Create Payroll Run");
    }
    if (strLowerPath.includes("/edit")) {
      return tHeader("edit_title", "Edit Payroll Run");
    }
    return stripMasterTitle(
      tHeader(
        "page_title",
        getLastBreadcrumbSegment(tHeader("breadcrumbs", "Payroll / Payroll Runs"))
      )
    );
  }

  if (strHeaderModuleName === "payroll-cycles") {
    if (strLowerPath.endsWith("/add")) {
      return tHeader("schedule_add_title", "Add Payroll Schedule");
    }
    if (strLowerPath.includes("/edit")) {
      return tHeader("schedule_edit_title", "Edit Payroll Schedule");
    }
    return stripMasterTitle(tHeader("schedule_page_title", "Payroll Schedules"));
  }

  if (strHeaderModuleName === "payroll-groups") {
    if (strLowerPath.endsWith("/add")) {
      return tHeader("group_add_title", "Add Payroll Group");
    }
    if (strLowerPath.includes("/edit")) {
      return tHeader("group_edit_title", "Edit Payroll Group");
    }
    if (strLowerPath.includes("/view")) {
      return tHeader("group_view_title", "View Payroll Group");
    }
    return stripMasterTitle(tHeader("group_page_title", "Payroll Groups"));
  }

  if (strHeaderModuleName === "attendance-leave-inputs") {
    return stripMasterTitle(tHeader("header_title", "Attendance & Leave Inputs"));
  }

  if (strHeaderModuleName === "salary-register") {
    const strTitle = tHeader("header_title", "Salary Register");
    return stripMasterTitle(strTitle.split("/").pop()?.trim() || "Salary Register");
  }
  if (strHeaderModuleName === "salary-statement") {
    const strTitle = tHeader("header_title", "Salary Statement");
    return stripMasterTitle(strTitle.split("/").pop()?.trim() || "Salary Statement");
  }
  if (strHeaderModuleName === "ctc-format") return "CTC Format";

  if (strHeaderModuleName === "payslips") {
    const blnEssPayslipContext =
      strLowerPath.startsWith("/ess/my-payslips") ||
      strLowerPath.startsWith("/ess/my-payslip") ||
      strLowerBackRoute.startsWith("/ess/my-payslips") ||
      strLowerBackRoute.startsWith("/ess/my-payslip");
    const blnDetailContext =
      Boolean(strLowerPath.match(/^\/(reports|payroll)\/payslips\/\d+/)) ||
      Boolean(strLowerPath.match(/^\/payroll\/payslip\/\d+/)) ||
      Boolean(strLowerPath.match(/^\/ess\/my-payslips\/\d+/)) ||
      Boolean(strLowerPath.match(/^\/ess\/my-payslip\/\d+/));
    if (blnDetailContext) {
      return blnEssPayslipContext
        ? tHeader("ess_page_title_view", "View My Payslips")
        : tHeader("page_title_view", "View Payslips");
    }
    return blnEssPayslipContext
      ? tHeader("ess_header_title", "My Payslips")
      : tHeader("header_title", "Payslips");
  }

  if (strHeaderModuleName === "my-compensation") {
    return tHeader("page_title", "My Compensation");
  }

  if (strHeaderModuleName === "payroll-results") {
    return stripMasterTitle(
      tHeader(
        "page_title",
        getLastBreadcrumbSegment(tHeader("breadcrumbs", "Payroll / Payroll Results"))
      )
    );
  }

  if (strHeaderModuleName === "payroll-process-logs") {
    return stripMasterTitle(tHeader("page_title", "Payroll Process Logs"));
  }

  if (strHeaderModuleName === "statutory-rules") {
    if (strLowerPath.endsWith("/new")) {
      return tHeader("add_title", "Create Statutory Rule");
    }
    if (strLowerPath.includes("/edit")) {
      return tHeader("edit_title", "Edit Statutory Rule");
    }
    return stripMasterTitle(
      tHeader(
        "page_title",
        getLastBreadcrumbSegment(tHeader("breadcrumbs", "Payroll / Statutory Rules"))
      )
    );
  }

  if (strHeaderModuleName === "tax-regimes") {
    return tHeader("tax_regimes_title", "Tax Regimes");
  }

  if (strHeaderModuleName === "salary-structures") {
    if (strLowerPath.endsWith("/add")) {
      return tHeader("add_salary_structure", "Add Salary Structure");
    }
    if (strLowerPath.includes("/edit/")) {
      return tHeader("edit_salary_structure", "Edit Salary Structure");
    }
    return tHeader("page_title", "Salary Structures")
      .split("/")
      .map((strSegment) => strSegment.trim())
      .filter(Boolean)[0] || "Salary Structures";
  }

  if (strHeaderModuleName === "salary-components") {
    if (strLowerPath.endsWith("/add")) {
      return tHeader("add_salary_component", "Add Salary Component");
    }
    if (strLowerPath.includes("/edit/")) {
      return tHeader("edit_salary_component", "Edit Salary Component");
    }
    if (strLowerPath.includes("/view/")) {
      return tHeader("view_salary_component", "View Salary Component");
    }
    return tHeader("page_title", "Salary Components")
      .split("/")
      .map((strSegment) => strSegment.trim())
      .filter(Boolean)[0] || "Salary Components";
  }

  if (strHeaderModuleName === "employee-salary") {
    const blnEmployeeSalaryViewMode = strViewMode === "view";
    if (strLowerPath.includes("/revise")) {
      return tHeader("employee_salary_detail_title", "Employee Salary Detail");
    }
    if (blnEmployeeSalaryViewMode) {
      return tHeader("employee_salary_view_title", "View Employee Salary Detail");
    }
    if (Boolean(strLowerPath.match(/^\/employee-salary\/\d+$/))) {
      return tHeader("employee_salary_detail_title", "Employee Salary Detail");
    }
    return tHeader("page_title", "Employee Salary");
  }

  if (strHeaderModuleName === "it-declaration") {
    return tHeader("page_title", "IT Declaration");
  }

  if (strHeaderModuleName === "flexi-pay-declaration") {
    return tHeader("page_title", "Flexi Pay Declaration");
  }

  if (strHeaderModuleName === "reimbursements") {
    const blnEmployeeReimbursementSource = strSource.trim().toLowerCase() === "employee-reimbursement";
    if (strLowerPath === "/ess/reimbursements/new") {
      return blnEmployeeReimbursementSource ? tHeader("page_title_new", "Reimbursements / New") : tHeader("review_reimbursements", "Review Reimbursements");
    }
    if (strLowerPath.match(/^\/ess\/reimbursements\/\d+\/edit$/)) {
      return blnEmployeeReimbursementSource ? tHeader("page_title_edit", "Reimbursements / Edit") : tHeader("review_reimbursements", "Review Reimbursements");
    }
    if (strLowerPath.match(/^\/ess\/reimbursements\/\d+$/)) {
      return blnEmployeeReimbursementSource ? tHeader("page_title_view", "Reimbursements / View") : tHeader("review_reimbursements", "Review Reimbursements");
    }
    return tHeader("page_title", "Reimbursements");
  }
  if (strHeaderModuleName === "loans-advances") {
    const blnViewMode = strViewMode === "view";
    const blnEditMode = strViewMode === "edit";
    const blnAddMode = strViewMode === "add";
    if (strLowerPath === "/ess/loans-advances/new") {
      return blnAddMode ? tHeader("add_loans_advances", "Add Loans Advances") : tHeader("new_title", "New Loan or Advance");
    }
    if (strLowerPath.match(/^\/ess\/loans-advances\/\d+$/)) {
      return blnEditMode
        ? tHeader("edit_loans_advances", "Edit Loans Advances")
        : blnViewMode
          ? tHeader("view_loans_advances", "View Loans Advances")
          : tHeader("ess_page_title_view", "ESS / Loans & Advances / View");
    }
    if (strLowerPath === "/payroll/loans-advances/new") {
      return blnAddMode ? tHeader("add_loans_advances", "Add Loans Advances") : tHeader("new_title", "New Loan or Advance");
    }
    if (strLowerPath.match(/^\/payroll\/loans-advances\/\d+$/)) {
      return blnEditMode
        ? tHeader("edit_loans_advances", "Edit Loans Advances")
        : blnViewMode
          ? tHeader("view_loans_advances", "View Loans Advances")
          : tHeader("page_title_view", "Payroll / Loans & Advances / View");
    }
    return strLowerPath.startsWith("/ess/")
      ? tHeader("ess_header_title", "ESS / Loans & Advances")
      : tHeader("header_title", "Payroll / Loans & Advances");
  }
  if (strHeaderModuleName === "fnf-settlements") {
    if (strLowerPath === "/payroll/fnf-settlements/new") {
      return tHeader("new_title", "New FNF Settlement");
    }
    if (Boolean(strLowerPath.match(/^\/payroll\/fnf-settlements\/\d+$/))) {
      return tHeader("detail_title", "Full & Final Settlement");
    }
    return tHeader("header_title", "Full & Final Settlements");
  }
  if (strHeaderModuleName === "calendar") {
    return tHeader("header_title", "Ess / Calendar");
  }

  if (strHeaderModuleName === "my-profile") {
    if (strLowerPath === "/profile/change-password") {
      return tHeader("change_password", "Change Password");
    }
    if (strLowerPath.includes("/edit")) {
      return tHeader("edit_header_title", "Ess / My Profile / Edit");
    }
    return tHeader("header_title", "Ess / My Profile");
  }

  // if (strHeaderModuleName === "my-bank-details") {
  //   return tHeader("header_title", "Ess / My Bank Details");
  // }

  return stripMasterTitle(tHeader("page_title", getPageTitle(strPathname)));
}

function buildLanguageOptions(...lstLanguageIDs: Array<number | null | undefined>) {
  return lstLanguageIDs.reduce<number[]>((lstResolvedLanguageIDs, intLanguageID) => {
    if (!intLanguageID || lstResolvedLanguageIDs.includes(intLanguageID)) {
      return lstResolvedLanguageIDs;
    }

    lstResolvedLanguageIDs.push(intLanguageID);
    return lstResolvedLanguageIDs;
  }, []);
}

function findMenuNameByRoute(lstMenuItems: AuthMenuItem[], strPathname: string): string {
  const strNormalizedPath = (strPathname || "").replace(/\/$/, "").toLowerCase();
  for (const objMenuItem of lstMenuItems) {
    const strMenuRoute = (objMenuItem.strRoute || "").replace(/\/$/, "").toLowerCase();
    if (strMenuRoute && strMenuRoute === strNormalizedPath) {
      return objMenuItem.strModuleName.trim();
    }
    const strChildMenuName = findMenuNameByRoute(objMenuItem.lstChildren, strPathname);
    if (strChildMenuName) {
      return strChildMenuName;
    }
  }
  return "";
}

function resolveLanguageDisplayLabel(
  strNativeName: string | null | undefined,
  intLanguageID: number,
  strFallbackLabel?: string
) {
  const strResolvedNativeName = strNativeName?.trim();
  if (strResolvedNativeName) {
    return strResolvedNativeName;
  }

  if (strFallbackLabel?.trim()) {
    return strFallbackLabel.trim();
  }

  if (intLanguageID === 1) {
    return "English";
  }

  if (intLanguageID === 2) {
    return "हिन्दी";
  }

  return `Language ${intLanguageID}`;
}

function extractLinkedEmployeeName(objUserContext: CurrentUserContext | null) {
  if (!objUserContext) return "";
  const objUserContextUnsafe = objUserContext as unknown as Record<string, unknown>;
  const objUserUnsafe = (objUserContextUnsafe.objUser ?? {}) as Record<string, unknown>;
  const objEmployeeUnsafe = (objUserContextUnsafe.objEmployee ?? {}) as Record<string, unknown>;
  const lstCandidates = [
    objEmployeeUnsafe.strEmployeeName,
    objEmployeeUnsafe.full_name,
    objEmployeeUnsafe.strFullName,
    objEmployeeUnsafe.first_name && objEmployeeUnsafe.last_name
      ? `${String(objEmployeeUnsafe.first_name)} ${String(objEmployeeUnsafe.last_name)}`
      : undefined,
    objEmployeeUnsafe.first_name,
    objUserUnsafe.strEmployeeName,
    objUserUnsafe.strFullName,
    objUserUnsafe.full_name,
  ];
  for (const strCandidate of lstCandidates) {
    if (typeof strCandidate === "string" && strCandidate.trim()) {
      return strCandidate.trim();
    }
  }
  return "";
}

function extractEmployeeMeta(objUserContext: CurrentUserContext | null) {
  if (!objUserContext) {
    return { strEmployeeCode: "", strDesignation: "" };
  }

  const objUserContextUnsafe = objUserContext as unknown as Record<string, unknown>;
  const objUserUnsafe = (objUserContextUnsafe.objUser ?? {}) as Record<string, unknown>;
  const objEmployeeUnsafe = (objUserContextUnsafe.objEmployee ?? {}) as Record<string, unknown>;

  const lstEmployeeCodeCandidates = [
    objEmployeeUnsafe.strEmployeeCode,
    objEmployeeUnsafe.employee_code,
    objUserUnsafe.strEmployeeCode,
    objUserUnsafe.employee_code,
  ];
  const lstDesignationCandidates = [
    objEmployeeUnsafe.strDesignationName,
    objEmployeeUnsafe.designation_name,
    objEmployeeUnsafe.strDesignation,
    objUserUnsafe.strDesignationName,
    objUserUnsafe.designation_name,
    objUserUnsafe.strDesignation,
  ];

  let strEmployeeCode = "";
  let strDesignation = "";

  for (const strCandidate of lstEmployeeCodeCandidates) {
    if (typeof strCandidate === "string" && strCandidate.trim()) {
      strEmployeeCode = strCandidate.trim();
      break;
    }
  }

  for (const strCandidate of lstDesignationCandidates) {
    if (typeof strCandidate === "string" && strCandidate.trim()) {
      strDesignation = strCandidate.trim();
      break;
    }
  }

  return { strEmployeeCode, strDesignation };
}

export default function AppShell({ children }: { children: ReactNode }) {
  const objRouter = useRouter();
  const strPathname = usePathname();
  const objSearchParams = useSearchParams();
  const [blnDrawerOpen, setBlnDrawerOpen] = useState(false);
  const [blnDesktopSidebarOpen, setBlnDesktopSidebarOpen] = useState(false);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnLoggingOut, setBlnLoggingOut] = useState(false);
  const [blnPortalSwitching, setBlnPortalSwitching] = useState(false);
  const [strPortalSwitchError, setStrPortalSwitchError] = useState("");
  const [blnLogoutDialogOpen, setBlnLogoutDialogOpen] = useState(false);
  const [blnLanguageMenuExpanded, setBlnLanguageMenuExpanded] = useState(true);
  const [objProfileAnchorEl, setObjProfileAnchorEl] = useState<HTMLElement | null>(null);
  const [objUserContext, setObjUserContext] = useState<CurrentUserContext | null>(null);
  const [strFailedCompanyLogoUrl, setStrFailedCompanyLogoUrl] = useState("");
  const [blnEssDashboardActive, setBlnEssDashboardActive] = useState(false);
  const [objMenu, setObjMenu] = useState<MenuResponse>({ lstMenuItems: [], strHomeRoute: "/dashboard" });
  const [blnMenuLoaded, setBlnMenuLoaded] = useState(false);
  const [blnMenuLoading, setBlnMenuLoading] = useState(false);
  const [strBootstrapError, setStrBootstrapError] = useState("");
  const [blnLanguageSwitching, setBlnLanguageSwitching] = useState(false);
  const [objTenantLanguageDetails, setObjTenantLanguageDetails] = useState<TenantAuthDetails | null>(null);
  const [dicLanguageLabelByID, setDicLanguageLabelByID] = useState<Record<number, string>>({});
  const [strActiveLanguageSwitchToken, setStrActiveLanguageSwitchToken] = useState("");
  const [strPendingExpandedMenuIdentity, setStrPendingExpandedMenuIdentity] = useState<string | null>(null);
  const [intPendingLabelLoads, setIntPendingLabelLoads] = useState(0);
  const [blnLanguageShellReady, setBlnLanguageShellReady] = useState(false);
  const [intLastLabelActivityAt, setIntLastLabelActivityAt] = useState(0);
  const [intLastContentMutationAt, setIntLastContentMutationAt] = useState(0);
  const [strResolvedEmployeeName, setStrResolvedEmployeeName] = useState("");
  const objShellContentRef = useRef<HTMLDivElement | null>(null);
  const objMainContentRef = useRef<HTMLElement | null>(null);
  const strHeaderModuleName = resolveRouteModuleName(strPathname);
  const { t: tCommon } = useModuleLabels("common");
  const { t: tHeader } = useModuleLabels(strHeaderModuleName || "common");
  const intCurrentLanguageID = authHelpers.getLanguageID();
  const lstLanguageOptions = buildLanguageOptions(
    objTenantLanguageDetails?.language_id ?? authHelpers.getLanguageID(),
    objTenantLanguageDetails?.secondary_language_id ?? authHelpers.getSecondaryLanguageID()
  ).map((intLanguageID) => ({
    intLanguageID,
    strLabel: resolveLanguageDisplayLabel(
      intLanguageID === objTenantLanguageDetails?.language_id
        ? objTenantLanguageDetails?.language_native_name
        : objTenantLanguageDetails?.secondary_language_native_name,
      intLanguageID,
      dicLanguageLabelByID[intLanguageID]
    )
  }));

  function redirectToSessionExpired() {
    authHelpers.redirectToSessionExpired();
  }

  useEffect(() => {
    if (!isAuthenticatedAppRoute(strPathname)) {
      return;
    }

    const strCurrentRoute = getRouteWithSearch(strPathname, objSearchParams);
    const lstStoredRoutes = readAuthenticatedRouteHistory();
    const intExistingIndex = lstStoredRoutes.lastIndexOf(strCurrentRoute);
    const lstNextRoutes =
      intExistingIndex >= 0
        ? lstStoredRoutes.slice(0, intExistingIndex + 1)
        : [...lstStoredRoutes, strCurrentRoute];

    writeAuthenticatedRouteHistory(lstNextRoutes);
  }, [objSearchParams, strPathname]);

  useEffect(() => {
    function handleModuleLabelLoadStart(objEvent: Event) {
      const strToken = (objEvent as CustomEvent<{ strToken?: string }>).detail?.strToken ?? "";
      if (!strToken || strToken !== strActiveLanguageSwitchToken) {
        return;
      }
      setIntLastLabelActivityAt(Date.now());
      setIntPendingLabelLoads((intCurrentCount) => intCurrentCount + 1);
    }

    function handleModuleLabelLoadEnd(objEvent: Event) {
      const strToken = (objEvent as CustomEvent<{ strToken?: string }>).detail?.strToken ?? "";
      if (!strToken || strToken !== strActiveLanguageSwitchToken) {
        return;
      }
      setIntLastLabelActivityAt(Date.now());
      setIntPendingLabelLoads((intCurrentCount) => Math.max(0, intCurrentCount - 1));
    }

    window.addEventListener(strModuleLabelsLoadStartEventName, handleModuleLabelLoadStart as EventListener);
    window.addEventListener(strModuleLabelsLoadEndEventName, handleModuleLabelLoadEnd as EventListener);
    return () => {
      window.removeEventListener(strModuleLabelsLoadStartEventName, handleModuleLabelLoadStart as EventListener);
      window.removeEventListener(strModuleLabelsLoadEndEventName, handleModuleLabelLoadEnd as EventListener);
    };
  }, [strActiveLanguageSwitchToken]);

  useEffect(() => {
    if (!blnLanguageSwitching || !blnLanguageShellReady || intPendingLabelLoads > 0) {
      return;
    }

    const intLastUiActivityAt = Math.max(intLastLabelActivityAt, intLastContentMutationAt);
    const intSettledWaitMs = Math.max(
      intLanguageSwitchSettledDelayMs - (Date.now() - intLastUiActivityAt),
      0
    );
    const intTimer = window.setTimeout(() => {
      window.sessionStorage.removeItem(strLanguageSwitchTokenKey);
      window.sessionStorage.removeItem(strLanguageSwitchLanguageKey);
      setStrActiveLanguageSwitchToken("");
      setBlnLanguageShellReady(false);
      setBlnLanguageSwitching(false);
    }, intLastUiActivityAt > 0 ? intSettledWaitMs : intLanguageSwitchSettledDelayMs);

    return () => window.clearTimeout(intTimer);
  }, [blnLanguageShellReady, blnLanguageSwitching, intLastContentMutationAt, intLastLabelActivityAt, intPendingLabelLoads]);

  useEffect(() => {
    if (!blnLanguageSwitching || !blnLanguageShellReady || !objShellContentRef.current) {
      return;
    }

    const objObserver = new MutationObserver(() => {
      setIntLastContentMutationAt(Date.now());
    });

    objObserver.observe(objShellContentRef.current, {
      subtree: true,
      childList: true,
      characterData: true
    });

    return () => {
      objObserver.disconnect();
    };
  }, [blnLanguageShellReady, blnLanguageSwitching]);

  async function loadWorkspaceContext(intLanguageID?: number | null) {
    const strTenantUUID = authHelpers.getTenantUUID();
    const intResolvedLanguageID = intLanguageID ?? authHelpers.getLanguageID();
    const lstRequests: [
      ReturnType<typeof authApiService.getCurrentUser>,
      Promise<{ Data?: TenantAuthDetails }>
    ] = [
      authApiService.getCurrentUser(intResolvedLanguageID),
      strTenantUUID
        ? authApiService
            .getTenantAuthDetails(strTenantUUID, intResolvedLanguageID)
            .then((objResponse) => objResponse as { Data: TenantAuthDetails })
            .catch(() => ({}))
        : Promise.resolve({})
    ];

    const [objUserResult, objTenantDetailsResult] = await Promise.all(lstRequests);
    const objTenantDetails = objTenantDetailsResult.Data;

    authHelpers.setTenantContext(
      objUserResult.Data.objTenant.intTenantID,
      undefined,
      intResolvedLanguageID ?? objUserResult.Data.objTenant.intLanguageID ?? undefined,
      objTenantDetails?.secondary_language_id ?? authHelpers.getSecondaryLanguageID() ?? undefined
    );
    setObjUserContext(objUserResult.Data);
    if (objTenantDetails) {
      setObjTenantLanguageDetails(objTenantDetails);
      setDicLanguageLabelByID((dicCurrentLabels) => ({
        ...dicCurrentLabels,
        ...(objTenantDetails.language_id
          ? {
              [objTenantDetails.language_id]: resolveLanguageDisplayLabel(
                objTenantDetails.language_native_name,
                objTenantDetails.language_id,
                dicCurrentLabels[objTenantDetails.language_id]
              )
            }
          : {}),
        ...(objTenantDetails.secondary_language_id
          ? {
              [objTenantDetails.secondary_language_id]: resolveLanguageDisplayLabel(
                objTenantDetails.secondary_language_native_name,
                objTenantDetails.secondary_language_id,
                dicCurrentLabels[objTenantDetails.secondary_language_id]
              )
            }
          : {})
      }));
    }
  }

  async function ensureMenuLoaded(intLanguageID?: number | null, blnForce = false) {
    if (!blnForce && (blnMenuLoaded || blnMenuLoading)) {
      return;
    }

    setBlnMenuLoading(true);
    try {
      const objMenuResult = await authApiService.getMenu(intLanguageID ?? authHelpers.getLanguageID());
      setObjMenu(normalizeMenuResponse(objMenuResult.Data));
      setBlnMenuLoaded(true);
    } finally {
      setBlnMenuLoading(false);
    }
  }

  useEffect(() => {
    let blnMounted = true;
    const strAccessToken = authHelpers.getAccessToken();

    if (!strAccessToken) {
      setBlnLoading(false);
      redirectToSessionExpired();
      return () => {
        blnMounted = false;
      };
    }

    loadWorkspaceContext(authHelpers.getLanguageID())
      .then(async () => {
        if (!blnMounted) {
          return;
        }
        setStrBootstrapError("");
        const intResolvedLanguageID = authHelpers.getLanguageID() ?? 1;
        const lstBootstrapResults = await Promise.allSettled([
          // Older backend images do not expose the optional bulk label endpoint.
          // Keep shell bootstrap resilient and let per-module label loading fall back.
          labelService.preloadAllLabels(intResolvedLanguageID).catch(() => undefined),
          ensureMenuLoaded(intResolvedLanguageID, true)
        ]);

        const objRejectedBootstrapStep = lstBootstrapResults.find(
          (objResult) => objResult.status === "rejected"
        );

        if (objRejectedBootstrapStep?.status === "rejected") {
          const objReason = objRejectedBootstrapStep.reason;
          if (isSessionExpiredError(objReason)) {
            throw objReason;
          }
          console.error("App shell bootstrap step failed.", objReason);
        }
      })
      .catch((objError: unknown) => {
        if (blnMounted) {
          if (isSessionExpiredError(objError)) {
            redirectToSessionExpired();
          } else {
            console.error("App shell bootstrap failed.", objError);
            setStrBootstrapError("");
          }
        }
      })
      .finally(() => {
        if (blnMounted) {
          setBlnLoading(false);
        }
      });

    return () => {
      blnMounted = false;
    };
  }, [objRouter]);

  useEffect(() => {
    function handleAvatarRefresh() {
      loadWorkspaceContext(authHelpers.getLanguageID()).catch(() => undefined);
    }

    window.addEventListener(strAvatarRefreshEventName, handleAvatarRefresh);
    return () => {
      window.removeEventListener(strAvatarRefreshEventName, handleAvatarRefresh);
    };
  }, []);

  useEffect(() => {
    let blnMounted = true;
    const intEmployeeID = objUserContext?.objUser?.intEmployeeID ?? null;
    const strHeaderName = extractLinkedEmployeeName(objUserContext);
    if (strHeaderName) {
      setStrResolvedEmployeeName(strHeaderName);
      return () => {
        blnMounted = false;
      };
    }
    if (!intEmployeeID) {
      setStrResolvedEmployeeName("");
      return () => {
        blnMounted = false;
      };
    }

    employeeService
      .getEmployeeById(intEmployeeID)
      .then((objEmployee) => {
        if (!blnMounted) return;
        const strName = objEmployee?.strFullName?.trim() || "";
        setStrResolvedEmployeeName(strName);
      })
      .catch(() => {
        if (!blnMounted) return;
        setStrResolvedEmployeeName("");
      });

    return () => {
      blnMounted = false;
    };
  }, [objUserContext]);

  async function confirmLogout() {
    setBlnLogoutDialogOpen(false);
    setBlnLoggingOut(true);
    const objLogoutResult = await authApiService.logout().catch(() => undefined);
    const strTenantUUID = objLogoutResult?.Data?.strTenantUUID || authHelpers.getTenantUUID();
    window.location.replace(getLogoutUrl(strTenantUUID));
  }

  async function switchPortal(strPortal: PortalCode) {
    if (blnPortalSwitching) {
      return;
    }

    closeProfileMenu();
    setStrPortalSwitchError("");
    setBlnPortalSwitching(true);
    try {
      const objResult = await authApiService.selectPortalContext(strPortal);
      // A full navigation guarantees menus, permissions, dashboard data and shell branding all
      // bootstrap from the newly issued portal-scoped token.
      window.location.assign(withBasePath(getPostLoginRoute(objResult.Data.strHomeRoute)));
    } catch (objError) {
      setBlnPortalSwitching(false);
      if (isSessionExpiredError(objError)) {
        redirectToSessionExpired();
        return;
      }
      setStrPortalSwitchError(objError instanceof Error ? objError.message : "Unable to switch portal.");
    }
  }

  async function switchWorkspaceLanguage(intRequestedLanguageID: number) {
    if (
      blnLanguageSwitching ||
      !intRequestedLanguageID ||
      intRequestedLanguageID === intCurrentLanguageID
    ) {
      return;
    }

    setBlnLanguageSwitching(true);
    setBlnLanguageShellReady(false);
    setIntPendingLabelLoads(0);
    setIntLastLabelActivityAt(Date.now());
    setIntLastContentMutationAt(Date.now());
    setStrBootstrapError("");
    const strSwitchToken = `${intRequestedLanguageID}-${Date.now()}`;
    setStrActiveLanguageSwitchToken(strSwitchToken);
    window.sessionStorage.setItem(strLanguageSwitchTokenKey, strSwitchToken);
    window.sessionStorage.setItem(strLanguageSwitchLanguageKey, String(intRequestedLanguageID));
    authHelpers.setLanguageID(intRequestedLanguageID);
    setBlnMenuLoaded(false);
    setObjMenu({ lstMenuItems: [], strHomeRoute: "/dashboard" });
    try {
      await loadWorkspaceContext(intRequestedLanguageID);
      await Promise.all([
        labelService.refreshAllLabels(intRequestedLanguageID),
        ensureMenuLoaded(intRequestedLanguageID, true)
      ]);
      setBlnLanguageShellReady(true);
    } catch (objError) {
      if (isSessionExpiredError(objError)) {
        window.sessionStorage.removeItem(strLanguageSwitchTokenKey);
        window.sessionStorage.removeItem(strLanguageSwitchLanguageKey);
        setStrActiveLanguageSwitchToken("");
        setBlnLanguageShellReady(false);
        setBlnLanguageSwitching(false);
        redirectToSessionExpired();
        return;
      }
      window.sessionStorage.removeItem(strLanguageSwitchTokenKey);
      window.sessionStorage.removeItem(strLanguageSwitchLanguageKey);
      setStrActiveLanguageSwitchToken("");
      setBlnLanguageShellReady(false);
      setBlnLanguageSwitching(false);
      // Keep the requested language selected even when tenant-specific label or
      // menu refresh fails, so the shell can still fall back to local/default
      // translations instead of appearing stuck on the previous language.
      authHelpers.setLanguageID(intRequestedLanguageID);
    } finally {
      // The loader is dismissed by the label-load completion effect so
      // menu and screen labels appear together after the switch finishes.
    }
  }

  const strUserName = objUserContext?.objUser.strLoginName || objUserContext?.objUser.strEmailAddress || "Workspace user";
  const intLinkedEmployeeID =
    objUserContext?.objUser?.intEmployeeID ??
    objUserContext?.objEmployee?.intEmployeeID ??
    null;
  const lstNormalizedRoles = (objUserContext?.objUser.lstRoles ?? []).map((strRole) => strRole.trim().toLowerCase());
  const blnHasPrivilegedRole = lstNormalizedRoles.some((strRole) =>
    ["admin", "human resource", "hr", "payroll", "manager", "approver", "supervisor", "finance"]
      .some((strKeyword) => strRole === strKeyword || strRole.includes(strKeyword)),
  );
  // When the session carries an active portal the server has already scoped menus and rights to
  // that portal's primary group, so the client must follow it rather than inferring a portal from
  // the employee link — an HR employee is legitimately employee-linked while working in HRMS.
  // The legacy heuristic (linked employee without an HR/manager role gets self-service navigation
  // even when stale group-menu rights exist) still applies to sessions with no portal context.
  const strActivePortalContext = String(objUserContext?.strActiveContext ?? "").trim().toUpperCase();
  const lstAvailablePortals = objUserContext?.lstAvailablePortals ?? [];
  const strSwitchTargetPortal: PortalCode | null = strActivePortalContext === "ESS" && lstAvailablePortals.includes("HRMS")
    ? "HRMS"
    : strActivePortalContext === "HRMS" && lstAvailablePortals.includes("ESS")
      ? "ESS"
      : null;
  const blnEssOnlyNavigation = strActivePortalContext
    ? strActivePortalContext === "ESS"
    : Boolean(intLinkedEmployeeID) && !blnHasPrivilegedRole;
  // Shell branding must follow the selected portal. Dashboard type is only a legacy fallback
  // because an employee-linked HRMS user can still receive employee-oriented dashboard content.
  const blnEssShellBrand = strActivePortalContext
    ? strActivePortalContext === "ESS"
    : blnEssOnlyNavigation || blnEssDashboardActive;
  const strLinkedEmployeeName = strResolvedEmployeeName || extractLinkedEmployeeName(objUserContext);
  const { strEmployeeCode, strDesignation } = extractEmployeeMeta(objUserContext);
  const strProfileDisplayName = strLinkedEmployeeName || strUserName;
  const strProfileEmail = objUserContext?.objUser.strEmailAddress?.trim() || "";
  const strAvatarText = strProfileDisplayName.trim().charAt(0).toUpperCase() || "U";
  const strAvatarUrl = objUserContext?.strAvatarUrl || objUserContext?.objEmployee?.strProfilePhotoUrl || "";
  const strAuthenticatedAvatarUrl = useAuthenticatedAvatar(strAvatarUrl);
  const blnEmployeeReimbursementContext =
    strPathname?.toLowerCase() === "/payroll/employee-reimbursement" ||
    objSearchParams.get("source") === "employee-reimbursement";
  const strLowerPathname = strPathname?.toLowerCase() || "";
  const blnEmployeeSalaryEditorRoute = /^\/employee-salary\/\d+(?:\/revise)?$/.test(strLowerPathname);
  // The id segment is a record_uuid now, not a number; a legacy numeric URL still matches.
  const blnSalaryComponentEditorRoute = /^\/salary-components\/(?:add|(?:edit|view)\/[\w-]+)$/.test(strLowerPathname);
  // The id segment is a record_uuid now, not a number; a legacy numeric URL still matches.
  const blnSalaryStructureEditorRoute = /^\/salary-structures\/(?:add|edit\/[\w-]+)$/.test(strLowerPathname);
  // The Leave Type / Leave Plan editors carry their own title in the Back/Save toolbar, like the
  // salary editors.
  const blnLeaveTypeEditorRoute = /^\/leave\/leave-types\/(?:new|\d+)$/.test(strLowerPathname);
  const blnLeavePlanEditorRoute = /^\/leave\/plans\/(?:new|\d+)$/.test(strLowerPathname);
  const blnLeaveAssignmentEditorRoute = /^\/leave\/plan-assignments\/\d+$/.test(strLowerPathname);
  const blnLeaveApprovalsRoute = strLowerPathname === "/leave/approvals" || strLowerPathname === "/hr/leave/requests-approvals";
  const blnEmployeeReimbursementFormContext =
    Boolean(strLowerPathname.match(/^\/ess\/reimbursements(\/new|\/\d+(\/edit)?)?$/)) &&
    Boolean(objSearchParams.get("employee_id"));
  const strEmployeeReimbursementFormTitle = strLowerPathname === "/ess/reimbursements/new"
    ? tHeader("add_claim_reimbursement", "Add Claim Reimbursement")
    : strLowerPathname.match(/^\/ess\/reimbursements\/\d+\/edit$/)
      ? tHeader("edit_claim_reimbursement", "Edit Claim Reimbursement")
      : tHeader("view_claim_reimbursement", "View Claim Reimbursement");
  // Exact menu routes use the tenant-configured database label in the shell header.
  const strDatabaseMenuName = findMenuNameByRoute(objMenu.lstMenuItems, strPathname);
  const strPageTitle = strDatabaseMenuName || (blnEmployeeReimbursementFormContext
    ? (blnEmployeeReimbursementContext ? strEmployeeReimbursementFormTitle : tHeader("review_reimbursements", "Review Reimbursements"))
    : blnEmployeeReimbursementContext
      ? tHeader("employee_reimbursements", "Employee Reimbursements")
    : getLocalizedHeaderTitle(
        strPathname,
        strHeaderModuleName,
        tHeader,
        tCommon,
        objSearchParams.get("backRoute") || "",
        objSearchParams.get("mode") || "",
        objSearchParams.get("source") || ""
      ));
  const blnDashboardRoute = (strPathname || "").toLowerCase() === "/dashboard";
  const strCompanyName = objUserContext?.objCompany?.strCompanyName?.trim() || "";
  const strCompanyLogoUrl = objUserContext?.objCompany?.strLogoUrl?.trim() || "";
  const blnProfileMenuOpen = Boolean(objProfileAnchorEl);

  useEffect(() => {
    if (!blnDashboardRoute) {
      setBlnEssDashboardActive(false);
    }
  }, [blnDashboardRoute]);

  function handleMenuToggle() {
    void ensureMenuLoaded();
    if (typeof window !== "undefined" && window.innerWidth >= 1200) {
      setBlnDesktopSidebarOpen((blnPrevious) => !blnPrevious);
      return;
    }

    setBlnDrawerOpen(true);
  }

  function handleMainContentClick() {
    if (blnDesktopSidebarOpen) {
      setBlnDesktopSidebarOpen(false);
    }
  }

  function handleDesktopCollapsedMenuItemClick(strMenuIdentity: string) {
    void ensureMenuLoaded();
    setStrPendingExpandedMenuIdentity(strMenuIdentity);
    setBlnDesktopSidebarOpen(true);
  }

  function openProfileMenu(objEvent: React.MouseEvent<HTMLElement>) {
    setObjProfileAnchorEl(objEvent.currentTarget);
  }

  function closeProfileMenu() {
    setObjProfileAnchorEl(null);
  }

  const objSidebarContent = (
    <Box
      sx={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        p: 0,
        background:
          "linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,0.96) 50%, rgba(248,250,252,0.98) 100%)",
        overflow: "hidden"
      }}
    >
      <Paper
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          borderRadius: 0,
          overflow: "hidden",
          backgroundColor: "var(--app-menu-surface)",
          backdropFilter: "blur(22px)",
          border: "1px solid rgba(148, 163, 184, 0.16)",
          boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)"
        }}
      >
        <Box
          sx={{
            px: 2.25,
            height: `${intTopBarHeight}px`,
            flexShrink: 0,
            backgroundColor: "#ffffff",
            color: "var(--app-banner-text-color)",
            display: "flex",
            alignItems: "center",
            boxSizing: "border-box"
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ height: "100%", flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "16px",
                display: "grid",
                placeItems: "center",
                backgroundColor: "rgba(37, 99, 235, 0.12)",
                border: "1px solid rgba(37, 99, 235, 0.18)",
                color: "var(--app-icon-active-color)"
              }}
            >
              <AppMenuLogo />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                {blnEssShellBrand
                  ? tCommon("brand_short_name", "ESS")
                  : appConfig.appName}
              </Typography>
            </Box>
          </Stack>
          <IconButton
            aria-label="Close navigation menu"
            onClick={() => {
              setBlnDrawerOpen(false);
              setBlnDesktopSidebarOpen(false);
            }}
            sx={{
              color: "var(--app-primary-color)",
              backgroundColor: "transparent",
              border: 0,
              borderRadius: "6px",
              "&:hover": {
                backgroundColor: "#f3f4f6"
              }
            }}
            {...getAutomationProps("app-shell.sidebar-close.button")}
          >
            <SvgIcon sx={{ fontSize: 22 }} viewBox="0 0 24 24">
              <rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
              <path d="M10 4v16" fill="none" stroke="currentColor" strokeWidth="1.7" />
            </SvgIcon>
          </IconButton>
        </Box>

        <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.18)" }} />

        <Box
          sx={{
            pt: 1.25,
            pr: 1.25,
            pb: 1.25,
            pl: "8px",
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(148, 163, 184, 0.9) transparent",
            "&::-webkit-scrollbar": {
              width: 8
            },
            "&::-webkit-scrollbar-track": {
              background: "transparent"
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "rgba(148, 163, 184, 0.85)",
              borderRadius: "999px",
              border: "2px solid transparent",
              backgroundClip: "padding-box"
            }
          }}
        >
          <DynamicMenu
            lstMenuItems={objMenu.lstMenuItems}
            blnEssOnly={blnEssOnlyNavigation}
            strForcedExpandedMenuIdentity={strPendingExpandedMenuIdentity}
            onForcedExpandedHandled={() => setStrPendingExpandedMenuIdentity(null)}
            onNavigate={() => {
              setBlnDrawerOpen(false);
              setBlnDesktopSidebarOpen(false);
            }}
          />
        </Box>
      </Paper>

      <ButtonBase
        onClick={() => {
          setBlnDrawerOpen(false);
          setBlnDesktopSidebarOpen(false);
          setBlnLogoutDialogOpen(true);
        }}
        disabled={blnLoggingOut}
        sx={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 1.25,
          px: 2,
          py: 1.4,
          borderRadius: "18px",
          backgroundColor: "rgba(255,255,255,0.86)",
          border: "1px solid rgba(148, 163, 184, 0.16)",
          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
          color: "#b91c1c",
          "&:hover": {
            backgroundColor: "rgba(254,242,242,0.92)"
          },
          "&.Mui-disabled": {
            opacity: 0.6
          }
        }}
        {...getAutomationProps("app-shell.sidebar-logout.button")}
      >
        <LogoutRoundedIcon fontSize="small" />
        <Typography sx={{ fontWeight: 700, color: "inherit" }}>
          {tCommon("logout", "Logout")}
        </Typography>
      </ButtonBase>
    </Box>
  );

  if (blnLoading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", backgroundColor: "#f8fafc" }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: "#64748b" }}>{tCommon("preparing_workspace", "Preparing your workspace...")}</Typography>
        </Stack>
      </Box>
    );
  }

  if (strBootstrapError) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", backgroundColor: "#f8fafc", p: 3 }}>
        <Stack spacing={1.5} alignItems="center">
          <Typography sx={{ color: "#b91c1c", fontWeight: 700 }}>
            {strBootstrapError}
          </Typography>
          <Button variant="contained" onClick={() => window.location.reload()} {...getAutomationProps("app-shell.retry.button")}>
            Retry
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      ref={objShellContentRef}
      sx={{
        display: "flex",
        height: "100dvh",
        minHeight: "100dvh",
        overflow: "hidden",
        background: strPathname === "/departments"
          ? "#edf4fc"
          : "radial-gradient(circle at top left, rgba(14,116,144,0.12), transparent 28%), linear-gradient(180deg, #f8fbff 0%, #eef4f8 100%)"
      }}
    >
      <Box
        sx={{
          position: "relative",
          zIndex: intMenuZIndex,
          width: intCollapsedMenuRailWidth,
          flex: `0 0 ${intCollapsedMenuRailWidth}px`,
          height: "100dvh",
          minHeight: 0,
          display: { xs: "none", lg: "flex" },
          flexDirection: "column",
          alignItems: "center",
          background: strSidebarGradient,
          borderRight: "1px solid var(--app-menu-border-color)",
          boxShadow: "8px 0 24px rgba(15, 23, 42, 0.08)",
          overflow: "hidden",
          cursor: "pointer",
          transition: "box-shadow 180ms ease",
          pointerEvents: "auto"
        }}
        onClick={() => {
          void ensureMenuLoaded();
          setBlnDesktopSidebarOpen(true);
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: intBannerHeight,
            mt: "7px",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
            <IconButton
              aria-label="Open navigation menu"
              sx={{
                width: 40,
                height: 40,
                p: 0,
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid rgba(37, 99, 235, 0.18)",
                backgroundColor: "rgba(37, 99, 235, 0.12)",
                color: "var(--app-menu-icon-color)",
                "&:hover": {
                  backgroundColor: "var(--app-menu-hover-background)",
                  color: "var(--app-menu-active-color)",
                }
              }}
              {...getAutomationProps("app-shell.desktop-menu-toggle.button")}
            >
              <AppMenuLogo />
          </IconButton>
        </Box>
        <Box
          sx={{
            flex: 1,
            width: "100%",
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            py: 1,
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": {
              display: "none",
            },
          }}
        >
          <DynamicMenu
            lstMenuItems={objMenu.lstMenuItems}
            blnEssOnly={blnEssOnlyNavigation}
            blnCollapsed
            onCollapsedClick={() => setBlnDesktopSidebarOpen(true)}
            onCollapsedMenuItemClick={handleDesktopCollapsedMenuItemClick}
            onNavigate={() => setBlnDesktopSidebarOpen(false)}
          />
        </Box>
        <Box
          sx={{
            width: "100%",
            height: 72,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            color: "var(--app-menu-active-color)",
          }}
        >
          <LogoutRoundedIcon sx={{ fontSize: { xs: 20, xl: 24 } }} />
        </Box>
      </Box>
      <Box
        sx={{
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: intMenuZIndex + 1,
          width: intDrawerWidth + 28,
          height: "100dvh",
          minHeight: 0,
          display: { xs: "none", lg: "block" },
          p: 0,
          pr: 0,
          overflow: "hidden",
          transform: blnDesktopSidebarOpen ? "translateX(0)" : `translateX(-${intDrawerWidth + 28}px)`,
          transition: "transform 240ms cubic-bezier(0.2, 0, 0, 1), opacity 180ms ease",
          opacity: blnDesktopSidebarOpen ? 1 : 0,
          pointerEvents: blnDesktopSidebarOpen ? "auto" : "none"
        }}
      >
        {objSidebarContent}
      </Box>
      <Drawer
        variant="temporary"
        open={blnDrawerOpen}
        onClose={() => setBlnDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", lg: "none" },
          zIndex: intMenuZIndex,
          "& .MuiDrawer-paper": {
            // Leave a visible edge on narrow phones so the temporary drawer never exceeds the viewport.
            width: `min(${intDrawerWidth}px, calc(100vw - 24px))`,
            height: "100dvh",
            border: "none",
            borderRadius: "0 32px 32px 0",
            backgroundColor: "transparent",
            boxShadow: "none",
            overflow: "hidden"
          }
        }}
        {...getAutomationProps("app-shell.mobile-drawer")}
      >
        {objSidebarContent}
      </Drawer>

      <BlockingLoaderViewportProvider getViewportElement={() => objMainContentRef.current}>
        <Box
          sx={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            overflow: "hidden",
              p: blnDashboardRoute ? { xs: 0.75, xl: 1 } : { xs: 1, xl: 1.5 }
          }}
        >
          <AppBar
            position="sticky"
            color="inherit"
            onClick={() => {
              setBlnDrawerOpen(false);
              setBlnDesktopSidebarOpen(false);
            }}
            sx={{
              position: "relative",
              flexShrink: 0,
              "--app-banner-text-color": "#172b4d",
              "--app-banner-border-color": "#e5edf5",
              borderRadius: 0,
              mt: blnDashboardRoute ? { xs: -0.75, xl: -1 } : { xs: -1, xl: -1.5 },
              mx: blnDashboardRoute ? { xs: -0.75, xl: -1 } : { xs: -1, xl: -1.5 },
              width: blnDashboardRoute
                ? { xs: "calc(100% + 12px)", xl: "calc(100% + 16px)" }
                : { xs: "calc(100% + 16px)", xl: "calc(100% + 24px)" },
              mb: { xs: 1, xl: 1.5 },
              background: "#ffffff",
              border: 0,
              borderBottom: "1px solid var(--app-banner-border-color)",
              boxShadow: "none"
            }}
          >
            <Toolbar sx={{ gap: { xs: 0.5, sm: 1, xl: 1.5 }, height: { xs: "auto", lg: intBannerHeight }, minHeight: `${intBannerHeight}px !important`, flexWrap: { xs: "wrap", lg: "nowrap" }, py: { xs: 1, lg: 0 }, boxSizing: "border-box", alignItems: "center", px: { xs: 1, sm: 2 } }}>
              <IconButton
                aria-label="Open navigation menu"
                onClick={handleMenuToggle}
                sx={{
                  position: "relative",
                  zIndex: intMenuZIndex,
                  display: { xs: "inline-flex", lg: "none" },
                  width: 40,
                  height: 40,
                  p: 0,
                  borderRadius: "16px",
                  overflow: "hidden",
                  border: "1px solid rgba(37, 99, 235, 0.18)",
                  backgroundColor: "rgba(37, 99, 235, 0.12)"
                }}
                {...getAutomationProps("app-shell.menu-toggle.button")}
              >
                <AppMenuLogo />
              </IconButton>

              <Stack direction="row" spacing={{ xs: 1, md: 1.5 }} alignItems="center" sx={{ minWidth: 0, flexShrink: 1, maxWidth: { xs: "65%", md: "38%", lg: "30%" } }}>
                <Typography sx={{ fontSize: objAppBarHeadingFontSize, color: "var(--app-banner-text-color)", fontWeight: 800, lineHeight: 1, whiteSpace: "nowrap", flexShrink: 0 }}>
                  {appConfig.appName}
                </Typography>
                {strCompanyName || strCompanyLogoUrl ? (
                  <Divider orientation="vertical" flexItem sx={{ borderColor: "var(--app-banner-border-color)", my: 0.5 }} />
                ) : null}
                {strCompanyLogoUrl && strFailedCompanyLogoUrl !== strCompanyLogoUrl ? (
                  <Box
                    component="img"
                    src={strCompanyLogoUrl}
                    alt=""
                    onError={() => setStrFailedCompanyLogoUrl(strCompanyLogoUrl)}
                    sx={{ height: { xs: 24, md: 30 }, maxWidth: { xs: 40, md: 64 }, objectFit: "contain", flexShrink: 0 }}
                  />
                ) : null}
                {strCompanyName ? (
                  <Typography title={strCompanyName} noWrap sx={{ minWidth: 0, fontSize: { xs: "0.8rem", md: "0.95rem", lg: "1rem" }, lineHeight: 1, fontWeight: 400, color: "#64748b" }}>
                    {strCompanyName}
                  </Typography>
                ) : null}
              </Stack>

              <Box sx={{ order: { xs: 10, lg: 0 }, flex: { xs: "1 0 100%", lg: "0 1 440px" }, minWidth: 0, width: { lg: "36%" }, maxWidth: { lg: 440 }, position: { lg: "absolute" }, left: { lg: "50%" }, transform: { lg: "translateX(-50%)" } }}>
                <BannerSearch key={strActivePortalContext + ":" + strPathname + ":" + intCurrentLanguageID} items={objMenu.lstMenuItems} disabled={blnPortalSwitching || blnLanguageSwitching || blnLoggingOut} />
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }} />

              {strPathname === "/departments" || blnDashboardRoute || blnEmployeeSalaryEditorRoute || blnSalaryComponentEditorRoute || blnSalaryStructureEditorRoute || blnLeaveTypeEditorRoute || blnLeavePlanEditorRoute || blnLeaveAssignmentEditorRoute || blnLeaveApprovalsRoute ? null : (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    minWidth: 0,
                    pr: { xs: 0.25, md: 0.75 }
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: objAppBarHeadingFontSize,
                      fontWeight: 700,
                      color: "#0f172a",
                      letterSpacing: "-0.03em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: { xs: "24vw", sm: "160px", lg: "180px" },
                      textAlign: "right"
                    }}
                  >
                    {strPageTitle}
                  </Typography>
                </Box>
              )}

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: { xs: 1.25, md: 1.5 },
                  minWidth: 0,
                  maxWidth: { xs: "250px", sm: "300px", md: "360px" }
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.9,
                    minWidth: 0,
                    flexShrink: 0
                  }}
                >
                  <Tooltip
                    title={blnProfileMenuOpen ? "" : (
                      <Box sx={{ py: 0.5, overflowWrap: "anywhere" }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{strProfileDisplayName}</Typography>
                        {strProfileEmail ? <Typography variant="caption">{strProfileEmail}</Typography> : null}
                      </Box>
                    )}
                    placement="bottom-end"
                    describeChild
                    arrow
                  >
                    <IconButton
                      id="app-shell-profile-button"
                      aria-label={tCommon("my_account", "My account")}
                      aria-controls={blnProfileMenuOpen ? "app-shell-profile-menu" : undefined}
                      aria-haspopup="menu"
                      aria-expanded={blnProfileMenuOpen ? "true" : undefined}
                      onClick={openProfileMenu}
                      disabled={blnLoggingOut}
                      sx={{
                        p: 0,
                        borderRadius: "50%",
                        border: 0,
                        backgroundColor: "transparent",
                        flexShrink: 0,
                        "&:hover": { backgroundColor: "transparent" },
                        "&.Mui-focusVisible": { outline: "2px solid #2563eb", outlineOffset: "3px" }
                      }}
                      {...getAutomationProps("app-shell.profile-menu.button")}
                    >
                      <Avatar src={strAuthenticatedAvatarUrl || undefined} alt={strProfileDisplayName} sx={{ bgcolor: "#3b82f6", color: "#fff", fontSize: "0.875rem", fontWeight: 600, width: 36, height: 36 }}>
                        {strAvatarText}
                      </Avatar>
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Toolbar>
          </AppBar>

          <Box
            component="main"
            ref={objMainContentRef}
            onClickCapture={handleMainContentClick}
            sx={{
              position: "relative",
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              pr: blnDashboardRoute ? 0 : 0.5
            }}
          >
            <DashboardHeaderModeContext.Provider value={setBlnEssDashboardActive}>
              {children}
            </DashboardHeaderModeContext.Provider>
            <BlockingLoader
              blnOpen={blnLoggingOut}
              strLabel="Logging out..."
              intZIndex={intContentLoaderZIndex}
              blnLocal
            />
            <BlockingLoader
              blnOpen={blnLanguageSwitching}
              strLabel={tCommon("switching_language", "Switching language...")}
              intZIndex={intContentLoaderZIndex}
              blnLocal
            />
            <BlockingLoader
              blnOpen={blnPortalSwitching}
              strLabel={tCommon("switching_portal", "Switching portal...")}
              intZIndex={intContentLoaderZIndex}
              blnLocal
            />
          </Box>
        </Box>
      </BlockingLoaderViewportProvider>

      <Menu
        id="app-shell-profile-menu"
        MenuListProps={{ "aria-labelledby": "app-shell-profile-button" }}
        anchorEl={objProfileAnchorEl}
        open={blnProfileMenuOpen}
        onClose={closeProfileMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          "data-controlid": "app-shell.profile-menu",
          sx: {
            mt: 1,
            width: 320,
            maxWidth: "calc(100vw - 32px)",
            borderRadius: "12px",
            boxShadow: "0 20px 45px rgba(15, 23, 42, 0.14)"
          }
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ m: 1, p: 1.5, bgcolor: "#f5f7fa", borderRadius: "8px", alignItems: "center" }}>
          <Avatar src={strAuthenticatedAvatarUrl || undefined} alt={strProfileDisplayName} sx={{ bgcolor: "#3b82f6", width: 44, height: 44, fontWeight: 700 }}>
            {strAvatarText}
          </Avatar>
          <Box sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
            <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "0.9rem" }}>{strProfileDisplayName}</Typography>
            {strDesignation ? <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>{strDesignation}</Typography> : null}
            {strProfileEmail ? <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>{strProfileEmail}</Typography> : null}
          </Box>
        </Stack>
        <Divider />
        {blnEssOnlyNavigation ? (
          <>
            <MenuItem
              onClick={() => {
                closeProfileMenu();
                objRouter.push("/ess/my-profile");
              }}
              disabled={blnLoggingOut || blnPortalSwitching}
              sx={{ gap: 1.25, py: 1.25 }}
              {...getAutomationProps("app-shell.my-profile.menu-item")}
            >
              <PersonOutlineRoundedIcon fontSize="small" />
              <Typography sx={{ fontWeight: 600 }}>{tCommon("my_profile", "My Profile")}</Typography>
            </MenuItem>
            <Divider />
          </>
        ) : null}
        {strSwitchTargetPortal ? (
          <>
            <MenuItem
              onClick={() => void switchPortal(strSwitchTargetPortal)}
              disabled={blnLoggingOut || blnPortalSwitching}
              sx={{ gap: 1.25, py: 1.25, justifyContent: "flex-start", textAlign: "left" }}
              {...getAutomationProps(`app-shell.switch-to-${strSwitchTargetPortal.toLowerCase()}.menu-item`)}
            >
              <SwapHorizRoundedIcon fontSize="small" />
              <Typography sx={{ fontWeight: 600 }}>
                {strSwitchTargetPortal === "HRMS"
                  ? tCommon("switch_to_hrms", "Switch to HRMS")
                  : tCommon("switch_to_ess", "Switch to Employee Self Service")}
              </Typography>
            </MenuItem>
            <Divider />
          </>
        ) : null}
        {lstLanguageOptions.length > 1 ? (
          <Box component="li" sx={{ listStyle: "none" }}>
            <ButtonBase
              onClick={() => setBlnLanguageMenuExpanded(value => !value)}
              aria-expanded={blnLanguageMenuExpanded}
              aria-controls="app-shell-language-options"
              disabled={blnLanguageSwitching || blnLoggingOut || blnPortalSwitching}
              sx={{ width: "100%", px: 2, py: 1.25, gap: 1.25, justifyContent: "flex-start", color: "#334155" }}
              {...getAutomationProps("app-shell.language.toggle")}
            >
              {blnLanguageSwitching ? <CircularProgress size={20} /> : <LanguageRoundedIcon fontSize="small" />}
              <Typography sx={{ flex: 1, textAlign: "left", fontWeight: 600 }}>{tCommon("language", "Language")}</Typography>
              <ExpandMoreRoundedIcon sx={{ fontSize: 20, transform: blnLanguageMenuExpanded ? "none" : "rotate(-90deg)" }} />
            </ButtonBase>
            {blnLanguageMenuExpanded ? (
              <Box
                id="app-shell-language-options"
                role="group"
                aria-label={tCommon("language", "Language")}
                sx={{ mx: 1, mb: 1, p: 0.5, border: "1px solid #e2e8f0", borderRadius: "8px", bgcolor: "#ffffff", boxShadow: "0 2px 6px rgba(15, 23, 42, 0.06)" }}
              >
                {lstLanguageOptions.map((dicLanguageOption) => {
                  const blnActive = dicLanguageOption.intLanguageID === intCurrentLanguageID;
                  return (
                    <ButtonBase
                      key={dicLanguageOption.intLanguageID}
                      aria-pressed={blnActive}
                      onClick={() => {
                        if (blnActive) return;
                        closeProfileMenu();
                        void switchWorkspaceLanguage(dicLanguageOption.intLanguageID);
                      }}
                      disabled={blnLanguageSwitching || blnLoggingOut || blnPortalSwitching}
                      sx={{ width: "100%", justifyContent: "flex-start", gap: 1.25, px: 1.25, py: 1, borderRadius: "6px", color: blnActive ? "#2563eb" : "#334155", bgcolor: blnActive ? "#eaf2ff" : "transparent", "&:hover": { bgcolor: blnActive ? "#eaf2ff" : "#f8fafc" } }}
                      {...getAutomationProps(`app-shell.language.${dicLanguageOption.intLanguageID}.button`)}
                    >
                      <CheckRoundedIcon sx={{ fontSize: 18, visibility: blnActive ? "visible" : "hidden" }} />
                      <Typography sx={{ fontWeight: blnActive ? 600 : 400 }}>
                        {dicLanguageOption.intLanguageID === 1 ? "English" : dicLanguageOption.strLabel}
                      </Typography>
                    </ButtonBase>
                  );
                })}
              </Box>
            ) : null}
          </Box>
        ) : null}

        <MenuItem
          onClick={() => {
            closeProfileMenu();
            setBlnLogoutDialogOpen(true);
          }}
          disabled={blnLoggingOut}
          sx={{ gap: 1.25, py: 1.25, justifyContent: "flex-start", textAlign: "left" }}
          {...getAutomationProps("app-shell.logout.menu-item")}
        >
          <LogoutRoundedIcon fontSize="small" />
          <Typography sx={{ fontWeight: 600 }}>{tCommon("logout", "Logout")}</Typography>
        </MenuItem>
      </Menu>

      <Dialog
        open={blnLogoutDialogOpen}
        onClose={() => setBlnLogoutDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { maxWidth: "400px" } }}
        {...getAutomationProps("app-shell.logout.dialog")}
      >
        <DialogTitle>{tCommon("logout", "Logout")}</DialogTitle>
        <DialogContent>
          <Typography>{tCommon("confirm_logout", "Are you sure you want to logout?")}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlnLogoutDialogOpen(false)} disabled={blnLoggingOut} {...getAutomationProps("app-shell.logout.cancel.button")}>{tCommon("cancel", "Cancel")}</Button>
          <Button onClick={confirmLogout} variant="contained" color="error" disabled={blnLoggingOut} {...getAutomationProps("app-shell.logout.confirm.button")}>
            {tCommon("logout", "Logout")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(strPortalSwitchError)} onClose={() => setStrPortalSwitchError("")} fullWidth maxWidth="xs" {...getAutomationProps("app-shell.portal-switch-error.dialog")}>
        <DialogTitle>{tCommon("portal_switch_failed", "Unable to switch portal")}</DialogTitle>
        <DialogContent>
          <Typography>{strPortalSwitchError}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStrPortalSwitchError("")} {...getAutomationProps("app-shell.portal-switch-error.close.button")}>
            {tCommon("close", "Close")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function isSessionExpiredError(objError: unknown): boolean {
  if (objError instanceof ApiRequestError) {
    if (objError.intStatusCode === 401) {
      return true;
    }

    return /unauthorized|session|token|expired/i.test(objError.message);
  }

  return objError instanceof Error && /unauthorized|session|token|expired/i.test(objError.message);
}





