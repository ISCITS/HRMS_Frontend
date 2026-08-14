"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import FingerprintRoundedIcon from "@mui/icons-material/FingerprintRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import GppGoodRoundedIcon from "@mui/icons-material/GppGoodRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import PercentRoundedIcon from "@mui/icons-material/PercentRounded";
import RuleFolderRoundedIcon from "@mui/icons-material/RuleFolderRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SummarizeRoundedIcon from "@mui/icons-material/SummarizeRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Avatar, Box, Button, Chip, Grid, IconButton, Menu, MenuItem, Paper, Select, Stack, TextField, Tooltip, Typography, useMediaQuery } from "@mui/material";

import { useMyAttendance } from "@/features/attendance/hooks/useMyAttendance";
import { useSetEssDashboardHeaderMode } from "@/components/layout/DashboardHeaderModeContext";
import {
  ESS_SHORTCUT_ROUTES,
  getTodayIsoDate,
  resolveComplianceCheckHref,
  resolveCurrentMonthPayslipHref,
  resolvePunchButtonState,
} from "@/features/dashboard/utils/essDashboardHelpers";
import { employeeService } from "@/features/employee/services/employeeService";
import type { EmployeeAddressRecord, EmployeeBankRecord, EmployeeDetailRecord, EmployeeFormOptions, EmployeeStatutoryRecord } from "@/features/employee/types";
import { employeeSalaryService } from "@/features/employee-salary/services/employeeSalaryService";
import type { EmployeeSalarySummaryRecord } from "@/features/employee-salary/types";
import { leaveService } from "@/features/leave/services/leaveService";
import { useEssPendingApprovals } from "@/features/dashboard/hooks/useEssPendingApprovals";
import type { LeaveApplicationDto, LeaveBalanceDto } from "@/features/leave/types";
import { useAuthenticatedAvatar } from "@/hooks/useAuthenticatedAvatar";
import type { CurrentUserContext, DashboardQuickAction, DashboardResponse, DashboardWidget } from "@/models/AuthModels";

type RoleBasedDashboardProps = {
  objDashboard: DashboardResponse;
  objUserContext: CurrentUserContext;
  strSelectedPayrollMonth?: string | null;
  t: (strKey: string, strFallback?: string) => string;
  onPayrollMonthChange?: (strPayrollMonth: string | null) => void;
  onRefresh?: () => void;
  blnRefreshing?: boolean;
  strError?: string;
};

type KpiPayload = {
  intValue?: number;
  intRunEmployeeCount?: number;
  intTotalEmployeeCount?: number;
  intActiveEmployeeCount?: number;
  intPayrollEmployeeCount?: number;
  decValue?: number;
  strSubtitle?: string;
  strCurrentMonth?: string;
  strPreviousMonth?: string;
  decTrendValue?: number | null;
  intRunPendingCount?: number;
  intTaxPendingCount?: number;
  intReimbursementPendingCount?: number;
  intBlockingCount?: number;
  intWarningCount?: number;
  intAttendanceBlockingCount?: number;
  intMasterDataGapCount?: number;
  decPfAmount?: number;
  decEsiAmount?: number;
  decTdsAmount?: number;
  lstPoints?: ChartPoint[];
  lstSeries?: ChartSeries[];
  strRunStatus?: string;
  strValidationStatus?: string;
};

type TrackerStage = {
  strCode: string;
  strLabel: string;
  strStatus: "completed" | "in_progress" | "pending";
};

type AlertRow = {
  strCode: string;
  strLabel: string;
  intCount: number;
  strRoutePath?: string;
};

type SummaryStat = {
  strLabel: string;
  intValue?: number;
  decValue?: number;
};

type DrilldownStat = SummaryStat & {
  strRoutePath?: string;
};

type ApprovalAgingRow = {
  strLabel: string;
  intPendingCount: number;
  intOverdueCount?: number;
  decAverageDays?: number;
  strRoutePath?: string;
};

type VarianceMetric = {
  strLabel: string;
  decCurrent?: number;
  decPrevious?: number;
  decVariancePercent?: number | null;
  blnCurrency?: boolean;
};

type HighRiskEmployeeRow = {
  intEmployeeID?: number;
  strEmployeeCode?: string;
  strEmployeeName: string;
  strRiskType: string;
  strSeverity?: "Blocking" | "Warning" | "Info";
  strDetail: string;
  strRoutePath?: string;
};

type ExceptionItem = {
  strCode: string;
  strLabel: string;
  intCount: number;
  strRoutePath?: string;
  strReason?: string;
  strCategory?: string;
  strSeverity?: "Blocking" | "Warning" | "Info";
};

type OutputReadinessPayload = {
  intProcessedResults?: number;
  intPayslipsGenerated?: number;
  intPayslipsPending?: number;
  intPayslipsFailed?: number;
  intBankReady?: number;
  intMissingBank?: number;
  strBankFileStatus?: string;
  strPayrollRegisterStatus?: string;
};

type AuditPayload = {
  strLastValidatedBy?: string;
  dtLastValidatedOn?: string;
  strLastProcessedBy?: string;
  dtLastProcessedOn?: string;
  intReprocessCount?: number;
  strLastReprocessReason?: string;
  strClosedBy?: string;
  dtClosedOn?: string;
  intFailedEmployeeCount?: number;
};

type EssProfileCheck = {
  strCode: string;
  strLabel: string;
  blnComplete: boolean;
};

type EssProfileCompletenessInput = {
  objEmployeeProfile: EmployeeDetailRecord | null;
  objAddress: EmployeeAddressRecord | null;
  objBank: EmployeeBankRecord | null;
  objStatutory: EmployeeStatutoryRecord | null;
  objWelcomePayload: Record<string, unknown>;
  objUserContext: CurrentUserContext;
  strAvatarUrl: string;
  objProfilePayload: Record<string, unknown>;
  lstComplianceChecks: EssProfileCheck[];
};

type EssProfileCompletenessResult = {
  intPercent: number;
  intCompletedCount: number;
  intTotalCount: number;
};

type EssPayslipRow = {
  result_id: number;
  payroll_month: string;
  net_pay: number;
  payslip_id?: number | null;
  payslip_number?: string | null;
};

type InfoCardRow = {
  strTitle: string;
  strSubtitle: string;
  strMeta: string;
  strRoutePath?: string;
};

type EssHeroDetail = {
  strLabel: string;
  strValue: string;
  objIcon: ReactNode;
};

type EssRequestRow = {
  strRequestType: string;
  strRequestName: string;
  strStatus: string;
  strSubmittedOn?: string | null;
  strApprovalStatus?: string | null;
  strRoutePath?: string;
};

type EssDocumentRow = {
  strDocumentCode: string;
  strDocumentName: string;
  strRoutePath?: string;
  blnAvailable?: boolean;
};

type RecentRunRow = {
  id: number;
  run_name: string;
  payroll_month: string;
  employee_count: number;
  net_pay_total: number;
  run_status: string;
  validation_status?: string | null;
  processed_on?: string | null;
  company_name?: string | null;
  cycle_name?: string | null;
  processed_by?: string | null;
};

type PayrollActionItem = {
  strCode: string;
  strLabel: string;
  strRoutePath: string;
  strVariant: "primary" | "secondary";
  blnEnabled: boolean;
  strReason: string;
};

type ChartPoint = {
  strCode?: string;
  strLabel: string;
  intValue?: number;
  decValue?: number;
};

type ChartSeries = {
  strCode?: string;
  strLabel: string;
  lstPoints: ChartPoint[];
};

type WidgetType = DashboardWidget["strWidgetType"];
type PayrollShortcutItem = {
  strCode: string;
  strLabel: string;
  strRoutePath: string;
  objIcon: ReactNode;
};

const DASHBOARD_COLORS = {
  purple: "#9333EA",
  violet: "#6366F1",
  blue: "#2563EB",
  cyan: "#0891B2",
  green: "#10B981",
  emerald: "#22C55E",
  amber: "#F97316",
  red: "#F43F5E",
  pink: "#FB7185",
  text: "#0F172A",
  muted: "#475569",
  border: "#E2E8F0",
  surface: "#FFFFFF",
  page: "#F6F8FC",
  blueSoft: "#EFF6FF",
  greenSoft: "#ECFDF5",
  amberSoft: "#FFF7ED",
  redSoft: "#FFF5F5",
  gradient: "linear-gradient(90deg, #9333EA 0%, #6366F1 28%, #2563EB 56%, #0891B2 78%, #10B981 100%)",
  navGradient: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 45%, #3B82F6 75%, #60A5FA 100%)",
};

const lstPayrollCardPalette = [
  { accent: DASHBOARD_COLORS.purple, surface: "#F1E7FE" },
  { accent: DASHBOARD_COLORS.blue, surface: "#DDEBFF" },
  { accent: DASHBOARD_COLORS.amber, surface: "#FFE9D6" },
  { accent: DASHBOARD_COLORS.red, surface: "#FFE0E6" },
  { accent: DASHBOARD_COLORS.green, surface: "#DDF6E8" },
];

export default function RoleBasedDashboard({ objDashboard, objUserContext, strSelectedPayrollMonth, t, onPayrollMonthChange, onRefresh, blnRefreshing, strError }: RoleBasedDashboardProps) {
  if (objDashboard.strDashboardType === "PAYROLL") {
    return <PayrollDashboard objDashboard={objDashboard} objUserContext={objUserContext} strSelectedPayrollMonth={strSelectedPayrollMonth} t={t} onPayrollMonthChange={onPayrollMonthChange} onRefresh={onRefresh} blnRefreshing={blnRefreshing} strError={strError} />;
  }
  if (objDashboard.strDashboardType === "ESS") {
    return <EssDashboard objDashboard={objDashboard} objUserContext={objUserContext} t={t} />;
  }
  return <FallbackDashboard objDashboard={objDashboard} objUserContext={objUserContext} t={t} />;
}

function normalizeWidgetCode(strWidgetCode?: string | null) {
  return String(strWidgetCode || "").trim().toLowerCase();
}

function normalizeWidgetType(strWidgetType?: string | null): WidgetType {
  return (String(strWidgetType || "").trim().toLowerCase() || "summary") as WidgetType;
}

function normalizeDashboardWidget(objWidget: DashboardWidget): DashboardWidget {
  return {
    ...objWidget,
    strWidgetCode: normalizeWidgetCode(objWidget.strWidgetCode),
    strWidgetType: normalizeWidgetType(objWidget.strWidgetType),
  };
}

function resolveEmployeeLookupLabel(
  lstOptions: Array<{ intID: number; strLabel: string }> | undefined,
  intValue: number | null | undefined,
  strFallback = "-"
) {
  if (!intValue) {
    return strFallback;
  }
  return lstOptions?.find((dicOption) => dicOption.intID === intValue)?.strLabel || strFallback;
}

function isProfileValueComplete(value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    const strValue = value.trim().toLowerCase();
    return Boolean(strValue) && strValue !== "-" && strValue !== "not available" && strValue !== "not assigned";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === "boolean") {
    return value;
  }
  return true;
}

function normalizePercentValue(value: unknown) {
  const intValue = Number(value);
  if (!Number.isFinite(intValue)) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(intValue)));
}

function calculateEssProfileCompleteness({
  objEmployeeProfile,
  objAddress,
  objBank,
  objStatutory,
  objWelcomePayload,
  objUserContext,
  strAvatarUrl,
  objProfilePayload,
  lstComplianceChecks,
}: EssProfileCompletenessInput): EssProfileCompletenessResult {
  if (!objEmployeeProfile) {
    const lstHeroFallbackChecks = [
      isProfileValueComplete(objWelcomePayload.strEmployeeName || objUserContext.objEmployee?.strFullName || objUserContext.objUser.strLoginName),
      isProfileValueComplete(objWelcomePayload.strEmployeeCode || objUserContext.objEmployee?.strEmployeeCode),
      isProfileValueComplete(objWelcomePayload.strDepartmentName),
      isProfileValueComplete(objWelcomePayload.strDesignationName),
      isProfileValueComplete(objWelcomePayload.strLocationName),
      isProfileValueComplete(objWelcomePayload.strReportingManager),
      isProfileValueComplete(objWelcomePayload.strWorkEmail || objUserContext.objUser.strEmailAddress),
      isProfileValueComplete(objWelcomePayload.strEmploymentType),
      isProfileValueComplete(objWelcomePayload.strJoinedOn),
      isProfileValueComplete(strAvatarUrl),
    ];
    const intHeroCompletedCount = lstHeroFallbackChecks.filter(Boolean).length;
    if (intHeroCompletedCount > 0) {
      return {
        intPercent: Math.round((intHeroCompletedCount / lstHeroFallbackChecks.length) * 100),
        intCompletedCount: intHeroCompletedCount,
        intTotalCount: lstHeroFallbackChecks.length,
      };
    }

    const intWidgetPercent = normalizePercentValue(objProfilePayload.intCompletionPercent);
    if (intWidgetPercent !== null && intWidgetPercent > 0) {
      return { intPercent: intWidgetPercent, intCompletedCount: intWidgetPercent, intTotalCount: 100 };
    }

    const lstPayloadChecks = lstComplianceChecks.filter((objCheck) => objCheck && typeof objCheck.blnComplete === "boolean");
    if (lstPayloadChecks.length) {
      const intCompletedCount = lstPayloadChecks.filter((objCheck) => objCheck.blnComplete).length;
      return {
        intPercent: Math.round((intCompletedCount / lstPayloadChecks.length) * 100),
        intCompletedCount,
        intTotalCount: lstPayloadChecks.length,
      };
    }

    return { intPercent: 0, intCompletedCount: 0, intTotalCount: 0 };
  }

  const lstRequiredChecks = [
    isProfileValueComplete(objEmployeeProfile.strEmployeeCode),
    isProfileValueComplete(objEmployeeProfile.strFirstName),
    isProfileValueComplete(objEmployeeProfile.strLastName),
    isProfileValueComplete(objEmployeeProfile.dtDateOfBirth),
    isProfileValueComplete(objEmployeeProfile.strGender),
    isProfileValueComplete(objEmployeeProfile.strMobileNumber),
    isProfileValueComplete(objEmployeeProfile.strPersonalEmail),
    isProfileValueComplete(objEmployeeProfile.strWorkEmail),
    isProfileValueComplete(objEmployeeProfile.dtDateOfJoining),
    isProfileValueComplete(objEmployeeProfile.intEmploymentTypeID),
    isProfileValueComplete(objEmployeeProfile.intDepartmentID),
    isProfileValueComplete(objEmployeeProfile.intDesignationID),
    isProfileValueComplete(objEmployeeProfile.intGradeID),
    isProfileValueComplete(objEmployeeProfile.intCostCenterID),
    isProfileValueComplete(objEmployeeProfile.intLocationID),
    isProfileValueComplete(objEmployeeProfile.intManagerEmployeeID),
    isProfileValueComplete(strAvatarUrl),
    isProfileValueComplete(objAddress?.strAddressType),
    isProfileValueComplete(objAddress?.strAddressLine1),
    isProfileValueComplete(objAddress?.strCityName),
    isProfileValueComplete(objAddress?.intStateID),
    isProfileValueComplete(objAddress?.strPostalCode),
    isProfileValueComplete(objAddress?.intCountryID),
    isProfileValueComplete(objBank?.intBankID),
    isProfileValueComplete(objBank?.strAccountHolderName),
    isProfileValueComplete(objBank?.strAccountNumber || objBank?.strAccountNumberMasked),
    isProfileValueComplete(objBank?.strIfscCode),
    isProfileValueComplete(objStatutory?.strPanNumber),
    isProfileValueComplete(objStatutory?.strTaxRegimeCode),
    objStatutory?.blnPfApplicable ? isProfileValueComplete(objStatutory?.strPfNumber || objStatutory?.strUanNumber) : true,
    objStatutory?.blnEsiApplicable ? isProfileValueComplete(objStatutory?.strEsiNumber) : true,
  ];
  const intCompletedCount = lstRequiredChecks.filter(Boolean).length;

  return {
    intPercent: Math.round((intCompletedCount / lstRequiredChecks.length) * 100),
    intCompletedCount,
    intTotalCount: lstRequiredChecks.length,
  };
}

function PayrollDashboard({ objDashboard, strSelectedPayrollMonth, t, onPayrollMonthChange, onRefresh, blnRefreshing, strError }: RoleBasedDashboardProps) {
  const setHiddenPayrollWidgetCodes = new Set<string>([]);
  const lstWidgets = objDashboard.lstWidgets
    .map(normalizeDashboardWidget)
    .filter((objWidget) => !setHiddenPayrollWidgetCodes.has(String(objWidget.strWidgetCode || "").toLowerCase()));
  const dicWidgetMap = new Map(lstWidgets.map((objWidget) => [objWidget.strWidgetCode, objWidget]));
  const lstKpiWidgets = [
    ensureWidget(dicWidgetMap.get("employees_in_payroll"), "employees_in_payroll", t("employees_in_payroll", "Employees in Payroll"), "kpi", { intValue: 0, strSubtitle: t("active_employees", "Active Employees") }),
    ensureWidget(dicWidgetMap.get("net_payroll_amount"), "net_payroll_amount", t("net_payroll_amount", "Net Payroll Amount"), "kpi", { decValue: 0, strSubtitle: t("current_cycle", "Current Cycle") }),
    ensureWidget(dicWidgetMap.get("pending_approvals"), "pending_approvals", t("pending_approvals", "Pending Approvals"), "kpi", { intValue: 0, strSubtitle: t("requires_action", "Requires Action") }),
    ensureWidget(dicWidgetMap.get("payroll_validation_errors"), "payroll_validation_errors", t("validation_blockers", "Validation Blockers"), "kpi", { intBlockingCount: 0, strSubtitle: t("employees_blocked_from_processing", "Employees blocked from processing") }),
    ensureWidget(dicWidgetMap.get("statutory_liability"), "statutory_liability", t("statutory_liability", "Statutory Liability"), "kpi", { decValue: 0, strSubtitle: t("pf_esi_tds", "PF + ESI + TDS") }),
    ensureWidget(dicWidgetMap.get("net_pay_movement"), "net_pay_movement", t("net_pay_movement", "Net Pay Movement"), "kpi", { decTrendValue: null, strSubtitle: t("vs_previous_month", "Vs previous month") }),
  ];
  const objTrackerWidget = ensureWidget(dicWidgetMap.get("payroll_workflow_tracker"), "payroll_workflow_tracker", "Payroll Workflow Tracker", "tracker", {
    lstStages: [
      { strCode: "data_collection", strLabel: t("data_collection", "Data Collection"), strStatus: "completed" },
      { strCode: "validation", strLabel: t("validation", "Validation"), strStatus: "completed" },
      { strCode: "processing", strLabel: t("processing", "Processing"), strStatus: "in_progress" },
      { strCode: "approval", strLabel: t("approval", "Approval"), strStatus: "pending" },
      { strCode: "paid", strLabel: t("paid", "Paid"), strStatus: "pending" },
    ],
  });
  const objAlertsWidget = ensureWidget(dicWidgetMap.get("payroll_alerts"), "payroll_alerts", "Payroll Alerts", "alerts", {
    lstAlerts: [
      { strCode: "missing_pan", strLabel: t("missing_pan", "Missing PAN"), intCount: 0, strRoutePath: "/employees" },
      { strCode: "missing_bank", strLabel: t("missing_bank_details", "Missing Bank Details"), intCount: 0, strRoutePath: "/employees" },
      { strCode: "missing_pf_uan", strLabel: t("missing_pf_uan", "Missing PF / UAN"), intCount: 0, strRoutePath: "/employees" },
      { strCode: "missing_tax_regime", strLabel: t("it_declaration_pending", "IT Declaration Pending"), intCount: 0, strRoutePath: "/payroll/it-declaration-review" },
      { strCode: "missing_salary_structure", strLabel: t("missing_salary_structure", "Missing Salary Structure"), intCount: 0, strRoutePath: "/employee-salary" },
    ],
  });
  const objRecentRunsWidget = ensureWidget(dicWidgetMap.get("recent_payroll_runs"), "recent_payroll_runs", "Recent Payroll Runs", "table", { lstRows: [] });
  const objLeaveOverviewWidget = dicWidgetMap.get("leave_overview");
  const objQuickActionsWidget = ensureWidget(dicWidgetMap.get("quick_actions"), "quick_actions", "Quick Actions", "actions", {
    lstActions: filterPayrollQuickActions(objDashboard.lstQuickActions || []),
  });
  const lstRecentRunRows = (((objRecentRunsWidget.objPayload as { lstRows?: RecentRunRow[] } | undefined)?.lstRows) || []) as RecentRunRow[];
  const lstAvailablePayrollMonths = ((((objRecentRunsWidget.objPayload as { lstAvailablePayrollMonths?: string[] } | undefined)?.lstAvailablePayrollMonths) || [])) as string[];
  const lstStages = (((objTrackerWidget.objPayload as { lstStages?: TrackerStage[] } | undefined)?.lstStages) || []) as TrackerStage[];
  const lstAlerts = (((objAlertsWidget.objPayload as { lstAlerts?: AlertRow[] } | undefined)?.lstAlerts) || []) as AlertRow[];
  const objTrackerPayload = ((objTrackerWidget.objPayload as KpiPayload | undefined) || {}) as KpiPayload;
  const lstPayrollMonthsFromRuns = Array.from(
    new Set(
      lstRecentRunRows
        .map((objRow) => String(objRow.payroll_month || "").trim())
        .filter(Boolean),
    ),
  );
  const lstMonthOptions = lstAvailablePayrollMonths.length ? lstAvailablePayrollMonths : lstPayrollMonthsFromRuns;
  const objNormalizedMonthOptions = Array.from(new Set(lstMonthOptions.map((strMonth) => String(strMonth || "").trim()).filter(Boolean)));
  const strAllMonthsValue = "__all__";
  const [strSelectedMonth, setStrSelectedMonth] = useState(strSelectedPayrollMonth || objNormalizedMonthOptions[0] || strAllMonthsValue);

  useEffect(() => {
    const strControlledMonth = strSelectedPayrollMonth || strAllMonthsValue;
    if (strSelectedPayrollMonth !== undefined && strControlledMonth !== strSelectedMonth) {
      setStrSelectedMonth(strControlledMonth);
    }
  }, [strSelectedPayrollMonth, strSelectedMonth]);

  useEffect(() => {
    const lstSelectableMonths = [strAllMonthsValue, ...objNormalizedMonthOptions];
    if (strSelectedPayrollMonth !== undefined) {
      return;
    }
    if (!lstSelectableMonths.includes(strSelectedMonth)) {
      setStrSelectedMonth(objNormalizedMonthOptions[0] || strAllMonthsValue);
    }
  }, [objNormalizedMonthOptions, strAllMonthsValue, strSelectedMonth, strSelectedPayrollMonth]);

  const handleSelectedMonthChange = useCallback((strMonth: string) => {
    setStrSelectedMonth(strMonth);
    onPayrollMonthChange?.(strMonth === strAllMonthsValue ? null : strMonth);
  }, [onPayrollMonthChange, strAllMonthsValue]);

  const intPendingApprovalCount = Number((((lstKpiWidgets.find((objWidget) => objWidget.strWidgetCode === "pending_approvals")?.objPayload as KpiPayload | undefined)?.intValue) || 0));
  const objSelectedRun = resolveSelectedRun(lstRecentRunRows, strSelectedMonth, strAllMonthsValue);
  const strRunStatusRaw = String(objSelectedRun?.run_status || objTrackerPayload.strRunStatus || "");
  const lstActionPanelItems = buildPayrollActionItems(strRunStatusRaw, objDashboard.lstQuickActions || [], t);
  const lstApprovalAging = resolveApprovalAgingRows(objDashboard.approvalAging);
  const lstDetailedSummarySections = buildDetailedSummarySections(objDashboard, t);
  const objOutputReadiness = (objDashboard.outputReadiness || {}) as OutputReadinessPayload;
  const objAudit = (objDashboard.audit || {}) as AuditPayload;
  const lstHighRiskEmployeeRows = resolveHighRiskEmployees(objDashboard.highRiskEmployees);
  const lstAllExceptionItems = resolveExceptionGroups(objDashboard.exceptions);
  const objPendingApprovalsPayload = ((lstKpiWidgets.find((objWidget) => objWidget.strWidgetCode === "pending_approvals")?.objPayload as KpiPayload | undefined) || {});
  const objAttendanceBlockersItem = lstAllExceptionItems.find((objItem) => objItem.strCode === "attendance_blockers");
  const objMissingMasterDataItem = lstAllExceptionItems.find((objItem) => objItem.strCode === "missing_master_data");
  const lstExceptionItems: ExceptionItem[] = [
    {
      strCode: "attendance_blockers",
      strLabel: t("attendance_blockers", "Attendance Blockers"),
      intCount: Number(objAttendanceBlockersItem?.intCount || 0),
      strRoutePath: "/attendance/exceptions",
      strSeverity: "Blocking" as const,
    },
    {
      strCode: "missing_master_data",
      strLabel: t("missing_master_data", "Missing Master Data"),
      intCount: Number(objMissingMasterDataItem?.intCount || 0),
      strRoutePath: "/employees",
      strSeverity: "Info" as const,
    },
    {
      strCode: "pending_reimbursements",
      strLabel: t("pending_reimbursements", "Pending Reimbursements"),
      intCount: Number(objPendingApprovalsPayload.intReimbursementPendingCount || 0),
      strRoutePath: "/payroll/reimbursements",
      strSeverity: "Warning" as const,
    },
    {
      strCode: "high_risk_employees",
      strLabel: t("high_risk_employees", "High-Risk Employees"),
      intCount: lstHighRiskEmployeeRows.length,
      strRoutePath: "/payroll/results",
      strSeverity: "Blocking" as const,
    },
  ].filter((objItem) => objItem.intCount > 0);
  const objValidationWidgetPayload = ((lstKpiWidgets.find((objWidget) => objWidget.strWidgetCode === "payroll_validation_errors")?.objPayload as KpiPayload | undefined) || {});
  const objMissingTaxRegimeAlert = lstAlerts.find((objAlert) => objAlert.strCode === "missing_tax_regime");
  const lstValidationSummaryCards = [
    {
      strLabel: t("blocking_issues", "Blocking Issues"),
      strValue: formatInteger(Number(objValidationWidgetPayload.intBlockingCount || 0)),
      strRoutePath: "/payroll/runs",
      strTone: "red" as const,
      strHint: t("blocking_issues_hint", "Must be resolved before this run can proceed."),
    },
    {
      strLabel: t("warnings", "Warnings"),
      strValue: formatInteger(Number(objValidationWidgetPayload.intWarningCount || 0)),
      strRoutePath: "/payroll/runs",
      strTone: "amber" as const,
      strHint: t("warnings_hint", "Review recommended but not blocking."),
    },
    {
      strLabel: t("attendance_blockers", "Attendance Blockers"),
      strValue: formatInteger(Number(objValidationWidgetPayload.intAttendanceBlockingCount || 0)),
      strRoutePath: "/attendance/exceptions",
      strTone: "red" as const,
      strHint: t("attendance_blockers_hint", "Missing or unresolved attendance is blocking payroll."),
    },
    {
      strLabel: t("missing_tax_regime", "Missing Tax Regime"),
      strValue: formatInteger(Number(objMissingTaxRegimeAlert?.intCount || 0)),
      strRoutePath: "/payroll/it-declaration-review",
      strTone: "blue" as const,
      strHint: t("missing_tax_regime_hint", "Employees without a selected tax regime."),
    },
  ];
  const objDashboardGridSpacing = { xs: 1.25, md: 1.5, xl: 1.75 };
  const strLastUpdated = formatDateTimeLabel(objDashboard.dtGeneratedOn, t);
  const strActiveTab: string = "overview";
  const [objPayrollShortcutMenuAnchor, setObjPayrollShortcutMenuAnchor] = useState<HTMLElement | null>(null);
  const blnShowFiveHeaderShortcuts = useMediaQuery("(min-width: 1780px)", { noSsr: true });
  const blnShowFourHeaderShortcuts = useMediaQuery("(min-width: 1600px)", { noSsr: true });
  const blnShowThreeHeaderShortcuts = useMediaQuery("(min-width: 1380px)", { noSsr: true });
  const blnShowTwoHeaderShortcuts = useMediaQuery("(min-width: 1180px)", { noSsr: true });
  const lstPrimaryShortcuts: PayrollShortcutItem[] = [
    { strCode: "employee_master", strLabel: t("employee", "Employee"), strRoutePath: "/masters/employee", objIcon: <BadgeRoundedIcon sx={{ fontSize: 16 }} /> },
    { strCode: "daily_attendance", strLabel: t("daily_attendance", "Daily Attendance"), strRoutePath: "/attendance/daily", objIcon: <FingerprintRoundedIcon sx={{ fontSize: 16 }} /> },
    { strCode: "payroll_result", strLabel: t("payroll_result", "Payroll Result"), strRoutePath: "/payroll/results", objIcon: <PaymentsRoundedIcon sx={{ fontSize: 16 }} /> },
    { strCode: "settings", strLabel: t("settings", "Settings"), strRoutePath: "/settings", objIcon: <ManageAccountsRoundedIcon sx={{ fontSize: 16 }} /> },
    { strCode: "it_declaration_review", strLabel: t("it_declaration_review", "IT Declaration Review"), strRoutePath: "/payroll/it-declaration-review", objIcon: <DescriptionRoundedIcon sx={{ fontSize: 16 }} /> },
  ];
  const lstOverflowShortcuts: PayrollShortcutItem[] = [
    { strCode: "employee_salary", strLabel: t("employee_salary", "Employee Salary"), strRoutePath: "/employee-salary", objIcon: <AccountBalanceWalletRoundedIcon sx={{ fontSize: 18 }} /> },
    { strCode: "leave_application_register", strLabel: t("leave_application_register", "Leave Application Register"), strRoutePath: "/reports/leave/applications", objIcon: <AssignmentRoundedIcon sx={{ fontSize: 18 }} /> },
  ];
  const intVisibleHeaderShortcutCount = blnShowFiveHeaderShortcuts
    ? 5
    : blnShowFourHeaderShortcuts
      ? 4
      : blnShowThreeHeaderShortcuts
        ? 3
        : blnShowTwoHeaderShortcuts
          ? 2
          : 1;
  const lstVisibleHeaderShortcuts = lstPrimaryShortcuts.slice(0, intVisibleHeaderShortcutCount);
  const lstMenuShortcuts = [...lstPrimaryShortcuts.slice(intVisibleHeaderShortcutCount), ...lstOverflowShortcuts];
  const blnAllMonthsSelected = strSelectedMonth === strAllMonthsValue;
  const strSelectedMonthLongLabel = blnAllMonthsSelected ? "" : formatLongMonth(strSelectedMonth, t);
  const objLeaveOverviewPayload = ((objLeaveOverviewWidget?.objPayload as Record<string, unknown> | undefined) || {});
  const objLeaveKpiWidget: DashboardWidget = {
    strWidgetCode: "leave_overview",
    strWidgetName: t("leave_impact", "Leave Impact"),
    strWidgetType: "kpi",
    strDashboardType: "PAYROLL",
    intDisplayOrder: 46,
    blnIsVisible: true,
    objPayload: {
      intValue: Number(objLeaveOverviewPayload.intPendingApprovals || 0),
      strSubtitle: blnAllMonthsSelected
        ? t("requests_affecting_payroll", "Requests affecting payroll")
        : `${t("requests_affecting_payroll", "Requests affecting payroll")} (${strSelectedMonthLongLabel})`,
    },
  };
  const objAlertsPayload = ((objAlertsWidget.objPayload as Record<string, unknown> | undefined) || {});
  const objMasterDataGapsKpiWidget: DashboardWidget = {
    strWidgetCode: "master_data_gaps",
    strWidgetName: t("master_data_gaps", "Master Data Gaps"),
    strWidgetType: "kpi",
    strDashboardType: "PAYROLL",
    intDisplayOrder: 42,
    blnIsVisible: true,
    objPayload: {
      intValue: Number(objAlertsPayload.intMasterDataGapCount || 0),
      strSubtitle: t("missing_bank_pan_pf_uan", "Missing bank / PAN / PF / UAN"),
    },
  };
  const lstOverviewKpis = [
    lstKpiWidgets.find((objWidget) => objWidget.strWidgetCode === "net_payroll_amount"),
    lstKpiWidgets.find((objWidget) => objWidget.strWidgetCode === "employees_in_payroll"),
    lstKpiWidgets.find((objWidget) => objWidget.strWidgetCode === "pending_approvals"),
    objLeaveKpiWidget,
    lstKpiWidgets.find((objWidget) => objWidget.strWidgetCode === "payroll_validation_errors"),
    objMasterDataGapsKpiWidget,
    lstKpiWidgets.find((objWidget) => objWidget.strWidgetCode === "statutory_liability"),
    lstKpiWidgets.find((objWidget) => objWidget.strWidgetCode === "net_pay_movement"),
  ].filter(Boolean) as DashboardWidget[];

  return (
    <Stack
      spacing={objDashboardGridSpacing}
      sx={{
        width: "100%",
        p: { xs: 0.4, md: 0.55 },
        boxSizing: "border-box",
      }}
    >
      <Paper
        sx={{
          px: { xs: 1.1, lg: 1.4 },
          py: 1.7,
          borderRadius: "20px",
          border: "none",
          boxShadow: "0 10px 30px rgba(37,99,235,0.28)",
          background: DASHBOARD_COLORS.navGradient,
          overflow: "hidden",
        }}
      >
        <Stack spacing={0.9}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                lg: "minmax(360px, 35vw) minmax(0, 1fr)",
                xl: "minmax(420px, 36vw) minmax(0, 1fr)",
              },
              alignItems: "center",
              gap: 1.25,
              minWidth: 0,
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
              <Box sx={{ width: 62, height: 62, borderRadius: "17px", background: "rgba(255,255,255,0.18)", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <CalendarMonthRoundedIcon sx={{ fontSize: 30 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: "#FFFFFF", fontWeight: 800, fontSize: { xs: "1.5rem", md: "1.8rem" }, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {t("payroll_dashboard", "HR Dashboard")}
                </Typography>
                <Typography sx={{ mt: 0.3, color: "rgba(255,255,255,0.85)", fontSize: "1rem", whiteSpace: { xs: "normal", md: "nowrap" }, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {t("payroll_dashboard_subtitle", "Real-time overview of payroll health and HR operations")}
                </Typography>
              </Box>
            </Stack>
            <Stack
              direction="row"
              spacing={0.6}
              alignItems="center"
              justifyContent={{ xs: "flex-start", lg: "flex-end" }}
              sx={{
                width: "100%",
                minWidth: 0,
                flexWrap: "nowrap",
                overflow: "hidden",
                overflowY: "hidden",
                pb: 0.15,
                "& > *": { flexShrink: 0 },
              }}
            >
              {lstVisibleHeaderShortcuts.map((objShortcut) => (
                <Button
                  key={objShortcut.strCode}
                  component={Link}
                  href={objShortcut.strRoutePath}
                  startIcon={objShortcut.objIcon}
                  sx={{
                    px: 0.95,
                    py: 0.65,
                    minWidth: 0,
                    maxWidth: objShortcut.strCode === "it_declaration_review" ? 205 : objShortcut.strCode === "daily_attendance" ? 162 : 136,
                    height: 34,
                    flexShrink: 0,
                    borderRadius: "11px",
                    border: "1px solid rgba(255,255,255,0.6)",
                    color: "#1E3A5F",
                    fontWeight: 800,
                    textTransform: "none",
                    fontSize: "0.74rem",
                    whiteSpace: "nowrap",
                    backgroundColor: "rgba(255,255,255,0.92)",
                    boxShadow: "none",
                    transition: "transform 200ms ease, box-shadow 200ms ease, background-color 200ms ease",
                    "& .MuiButton-startIcon": {
                      marginRight: 0.55,
                      marginLeft: 0,
                      flexShrink: 0,
                    },
                    "& .MuiButton-startIcon + *": {
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    },
                    "&:hover": {
                      transform: "scale(1.03)",
                      backgroundColor: "#FFFFFF",
                      boxShadow: "0 0 0 2px rgba(255,255,255,0.35), 0 8px 18px rgba(0,0,0,0.14)",
                    },
                    "& .MuiButton-startIcon, & .MuiSvgIcon-root": {
                      color: "#1E3A5F",
                    },
                  }}
                >
                  {objShortcut.strLabel}
                </Button>
              ))}
              <IconButton
                aria-label={t("more_shortcuts", "More shortcuts")}
                onClick={(objEvent) => setObjPayrollShortcutMenuAnchor(objEvent.currentTarget)}
                sx={{
                  width: 34,
                  height: 34,
                  flexShrink: 0,
                  color: "#1E3A5F",
                  border: "1px solid rgba(255,255,255,0.6)",
                  backgroundColor: "rgba(255,255,255,0.55)",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.75)" },
                }}
              >
                <MoreHorizRoundedIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <Menu
                anchorEl={objPayrollShortcutMenuAnchor}
                open={Boolean(objPayrollShortcutMenuAnchor)}
                onClose={() => setObjPayrollShortcutMenuAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                PaperProps={{ sx: { mt: 0.75, minWidth: 240, borderRadius: "10px", boxShadow: "0 16px 36px rgba(15,23,42,0.18)" } }}
              >
                {lstMenuShortcuts.map((objShortcut) => (
                  <MenuItem
                    key={objShortcut.strCode}
                    component={Link}
                    href={objShortcut.strRoutePath}
                    onClick={() => setObjPayrollShortcutMenuAnchor(null)}
                    sx={{ gap: 1, py: 1, fontSize: "0.86rem", fontWeight: 700, color: "#1E3A5F" }}
                  >
                    {objShortcut.objIcon}
                    {objShortcut.strLabel}
                  </MenuItem>
                ))}
              </Menu>
              <Box
                sx={{
                  width: "1px",
                  height: 24,
                  flexShrink: 0,
                  mx: 0.2,
                  backgroundColor: "rgba(255,255,255,0.55)",
                }}
              />
              <Select
                value={strSelectedMonth}
                onChange={(objEvent) => handleSelectedMonthChange(String(objEvent.target.value || ""))}
                variant="standard"
                disableUnderline
                IconComponent={KeyboardArrowDownRoundedIcon}
                sx={{
                  width: { xs: 212, sm: 230 },
                  flexShrink: 0,
                  px: 0.95,
                  py: 0,
                  borderRadius: "12px",
                  border: "none",
                  backgroundColor: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: "0.76rem",
                  color: DASHBOARD_COLORS.text,
                  height: 34,
                  "& .MuiSelect-select": { py: 0.5, pr: 3 },
                  "& .MuiSvgIcon-root": { color: DASHBOARD_COLORS.muted, right: 8, fontSize: "1.05rem" },
                }}
                renderValue={(strValue) => `${t("payroll_period", "Payroll Period")}: ${formatPayrollMonthSelectionLabel(String(strValue), t)}`}
              >
                <MenuItem value={strAllMonthsValue}>
                  {t("all_months", "All Months")}
                </MenuItem>
                {objNormalizedMonthOptions.map((strMonth) => (
                  <MenuItem key={strMonth} value={strMonth}>
                    {`${formatLongMonth(strMonth, t)} ${t("payroll", "Payroll")}`}
                  </MenuItem>
                ))}
              </Select>
              <Tooltip title={strError ? strError : t("refresh_dashboard", "Refresh dashboard")}>
                <span>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshRoundedIcon sx={{ fontSize: 13 }} />}
                    onClick={onRefresh}
                    disabled={blnRefreshing}
                    sx={{ minWidth: 88, height: 34, px: 1.1, borderRadius: "12px", textTransform: "none", fontSize: "0.76rem", border: "none", color: DASHBOARD_COLORS.text, fontWeight: 700, backgroundColor: "#fff", whiteSpace: "nowrap" }}
                  >
                    {blnRefreshing ? t("refreshing", "Refreshing") : t("refresh", "Refresh")}
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          </Box>
        </Stack>
      </Paper>

      {strActiveTab === "overview" ? (
        <>
          <Box
            sx={{
              display: "grid",
              gap: objDashboardGridSpacing,
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                md: "repeat(3, minmax(0, 1fr))",
                lg: "repeat(4, minmax(0, 1fr))",
              },
              alignItems: "stretch",
            }}
          >
            {lstOverviewKpis.map((objWidget, intIndex) => (
              <Box key={objWidget.strWidgetCode} sx={{ display: "flex", minWidth: 0 }}>
                <PayrollKpiPanel
                  objWidget={objWidget}
                  objTone={lstPayrollCardPalette[intIndex % lstPayrollCardPalette.length]}
                  strSelectedMonth={strSelectedMonth}
                  strAllMonthsValue={strAllMonthsValue}
                  t={t}
                />
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: objDashboardGridSpacing,
              gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 5fr) minmax(0, 3fr) minmax(0, 4fr)" },
              alignItems: "stretch",
            }}
          >
            <Box sx={{ display: "flex", minWidth: 0 }}>
              <RecentRunsPanel objWidget={objRecentRunsWidget} strSelectedMonth={strSelectedMonth} strAllMonthsValue={strAllMonthsValue} t={t} />
            </Box>
            <Box sx={{ display: "flex", minWidth: 0 }}>
              <QuickActionsPanel objWidget={objQuickActionsWidget} t={t} />
            </Box>
            <Box sx={{ display: "flex", minWidth: 0 }}>
              <ExceptionWorkQueuePanel lstItems={lstExceptionItems} t={t} />
            </Box>
          </Box>
        </>
      ) : null}

      {strActiveTab === "approvals" ? (
        <Box
          sx={{
            display: "grid",
            gap: objDashboardGridSpacing,
            gridTemplateColumns: { xs: "1fr", lg: "repeat(12, minmax(0, 1fr))" },
            alignItems: "stretch",
          }}
        >
          <Box sx={{ display: "flex", minWidth: 0, gridColumn: { xs: "auto", lg: "span 5" } }}>
            <ApprovalAgingPanel lstRows={lstApprovalAging} t={t} />
          </Box>
          <Box sx={{ display: "flex", minWidth: 0, gridColumn: { xs: "auto", lg: "span 7" } }}>
            <ValidationSummaryPanel lstCards={lstValidationSummaryCards} t={t} />
          </Box>
          <Box sx={{ display: "flex", minWidth: 0, gridColumn: "1 / -1" }}>
            <HighRiskEmployeesPanel lstEmployees={lstHighRiskEmployeeRows} t={t} />
          </Box>
        </Box>
      ) : null}

      {strActiveTab === "outputs" ? (
        <Box
          sx={{
            display: "grid",
            gap: objDashboardGridSpacing,
            gridTemplateColumns: { xs: "1fr", lg: "repeat(12, minmax(0, 1fr))" },
            alignItems: "stretch",
          }}
        >
          <Box sx={{ display: "flex", minWidth: 0, gridColumn: "1 / -1" }}>
            <OutputReadinessPanel objOutputReadiness={objOutputReadiness} t={t} />
          </Box>
          {lstDetailedSummarySections.filter((objSection) => objSection.strCode === "reimbursement").map((objSection) => (
            <Box key={objSection.strCode} sx={{ display: "flex", minWidth: 0, gridColumn: { xs: "auto", lg: "span 6" } }}>
              <DetailedSummaryPanel strTitle={objSection.strTitle} strSubtitle={objSection.strSubtitle} lstStats={objSection.lstStats} strAccent={objSection.strAccent} />
            </Box>
          ))}
        </Box>
      ) : null}

      {strActiveTab === "reports" ? (
        <Box sx={{ display: "flex", minWidth: 0 }}>
          <RecentRunsPanel objWidget={objRecentRunsWidget} strSelectedMonth={strSelectedMonth} strAllMonthsValue={strAllMonthsValue} t={t} />
        </Box>
      ) : null}

      {strActiveTab === "audit_trail" ? (
        <Box
          sx={{
            display: "grid",
            gap: objDashboardGridSpacing,
            gridTemplateColumns: { xs: "1fr", lg: "repeat(12, minmax(0, 1fr))" },
            alignItems: "stretch",
          }}
        >
          <Box sx={{ display: "flex", minWidth: 0, gridColumn: { xs: "auto", lg: "span 5" } }}>
            <RunActionPanel lstActions={lstActionPanelItems} strRunStatus={strRunStatusRaw} t={t} />
          </Box>
          <Box sx={{ display: "flex", minWidth: 0, gridColumn: { xs: "auto", lg: "span 7" } }}>
            <AuditPanel objAudit={objAudit} t={t} />
          </Box>
        </Box>
      ) : null}

    </Stack>
  );
}

function PayrollKpiPanel({
  objWidget,
  objTone,
  strSelectedMonth,
  strAllMonthsValue,
  t,
}: {
  objWidget: DashboardWidget;
  objTone: { accent: string; surface: string };
  strSelectedMonth: string;
  strAllMonthsValue: string;
  t: RoleBasedDashboardProps["t"];
}) {
  const objPayload = (objWidget.objPayload || {}) as KpiPayload;
  const decTrendValue = objPayload.decTrendValue;
  const strComparisonMonth = formatComparisonMonth(strSelectedMonth === strAllMonthsValue ? "" : strSelectedMonth, t);
  const blnAllMonths = strSelectedMonth === strAllMonthsValue;
  const blnShowNetPayTrendRow = objWidget.strWidgetCode === "net_payroll_amount" && decTrendValue != null;
  const strTrendIcon = decTrendValue == null ? "" : decTrendValue >= 0 ? "^" : "v";
  const strTrendText = `${strTrendIcon} ${Math.abs(decTrendValue || 0)}% ${t("vs_previous", "vs")} ${strComparisonMonth}`;
  const objIcon = getKpiIcon(objWidget.strWidgetCode);
  const blnEmployeeKpi = objWidget.strWidgetCode === "employees_in_payroll";
  const intEmployeeTotalCount = Number(objPayload.intTotalEmployeeCount ?? objPayload.intRunEmployeeCount ?? objPayload.intValue ?? 0);
  const intEmployeeActiveCount = Number(objPayload.intActiveEmployeeCount ?? 0);
  const intPayrollEmployeeCount = Number(objPayload.intPayrollEmployeeCount ?? objPayload.intRunEmployeeCount ?? objPayload.intValue ?? 0);
  const strRoutePath = getKpiRoutePath(objWidget.strWidgetCode, strSelectedMonth, strAllMonthsValue);
  const strActionLabel = getKpiActionLabel(objWidget.strWidgetCode, strSelectedMonth, strAllMonthsValue, t);

  const strValue = objWidget.strWidgetCode === "net_pay_movement"
    ? (decTrendValue == null ? "—" : `${decTrendValue >= 0 ? "+" : ""}${decTrendValue}%`)
    : objWidget.strWidgetCode === "payroll_validation_errors"
      ? formatInteger(Number(objPayload.intBlockingCount || 0))
      : objPayload.decValue != null
        ? formatCurrency(objPayload.decValue)
        : formatInteger(objPayload.intValue || 0);

  const strSubtitle = objWidget.strWidgetCode === "net_payroll_amount"
    ? blnAllMonths
      ? t("generated_payslip_net_pay", "Generated payslip net pay")
      : `${t("selected_month_payable", "Selected month payable")}: ${formatLongMonth(strSelectedMonth, t)}`
    : blnEmployeeKpi
      ? blnAllMonths
        ? `${t("total_employees", "Total Employees")}: ${formatInteger(intEmployeeTotalCount)} | ${t("active_employees", "Active Employees")}: ${formatInteger(intEmployeeActiveCount)}`
        : `${t("included_in_payroll", "Included in payroll")}: ${formatInteger(intPayrollEmployeeCount)}`
      : objWidget.strWidgetCode === "pending_approvals"
        ? buildPendingApprovalsBreakdown(objPayload, t)
        : objWidget.strWidgetCode === "payroll_validation_errors"
          ? buildValidationBreakdown(objPayload, t)
        : objWidget.strWidgetCode === "statutory_liability"
          ? t("pf_esi_tds_payable", "PF + ESI + TDS payable")
        : objWidget.strWidgetCode === "net_pay_movement"
          ? blnAllMonths && objPayload.strCurrentMonth && objPayload.strPreviousMonth
            ? `${objPayload.strCurrentMonth} ${t("vs", "vs")} ${objPayload.strPreviousMonth}`
            : blnAllMonths
              ? t("latest_month_vs_previous_month", "Latest month vs previous month")
              : t("vs_previous_payroll_month", "Vs previous payroll month")
        : objWidget.strWidgetCode === "leave_overview"
          ? translateDashboardText(objPayload.strSubtitle, t, t("pending_leave_approvals", "Pending leave approvals"))
        : objWidget.strWidgetCode === "master_data_gaps"
          ? t("bank_pan_pf_uan_gaps", "Bank / PAN / PF-UAN gaps")
        : translateDashboardText(objPayload.strSubtitle, t, t("current_snapshot", "Current Snapshot"));

  const strTitle = getKpiDisplayTitle(objWidget.strWidgetCode, strSelectedMonth, strAllMonthsValue, t, objWidget.strWidgetName);
  const strScopeText = getKpiScopeText(objWidget.strWidgetCode, strSelectedMonth, strAllMonthsValue, t);

  const objCard = (
    <Paper
      sx={{
        p: 1.2,
        width: "100%",
        minWidth: 0,
        minHeight: 154,
        height: "100%",
        display: "flex",
        alignItems: "flex-start",
        borderRadius: "18px",
        border: `1px solid ${DASHBOARD_COLORS.border}`,
        boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
        background: "#FFFFFF",
        position: "relative",
        overflow: "hidden",
        transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
        "&:hover": strRoutePath ? {
          transform: "translateY(-1px)",
          borderColor: `${objTone.accent}44`,
          boxShadow: "0 12px 28px rgba(15,23,42,0.12)",
        } : undefined,
      }}
    >
      <Stack spacing={0.7} sx={{ minWidth: 0, width: "100%", height: "100%" }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            flexShrink: 0,
            borderRadius: "10px",
            display: "grid",
            placeItems: "center",
            backgroundColor: objTone.surface,
            color: objTone.accent,
          }}
        >
          {objIcon}
        </Box>
        <Box sx={{ minWidth: 0, width: "100%" }}>
          <Typography sx={{ fontSize: "0.74rem", fontWeight: 700, color: DASHBOARD_COLORS.muted, lineHeight: 1.25 }}>
            {strTitle}
          </Typography>
          <Typography sx={{ mt: 0.3, fontSize: "1.4rem", lineHeight: 1.08, fontWeight: 800, color: DASHBOARD_COLORS.text }}>
            {strValue}
          </Typography>
          <Typography sx={{ mt: 0.2, fontSize: "0.74rem", color: DASHBOARD_COLORS.muted, lineHeight: 1.35 }}>
            {strSubtitle}
          </Typography>
          <Typography sx={{ mt: 0.35, fontSize: "0.68rem", color: "#64748B", lineHeight: 1.35 }}>
            {strScopeText}
          </Typography>
          {blnShowNetPayTrendRow ? (
            <Typography sx={{ mt: 0.3, fontSize: "0.72rem", fontWeight: 700, color: (decTrendValue || 0) >= 0 ? DASHBOARD_COLORS.green : DASHBOARD_COLORS.red }}>
              {strTrendText}
            </Typography>
          ) : null}
        </Box>
        {strRoutePath ? (
          <Stack direction="row" spacing={0.3} alignItems="center" sx={{ mt: "auto", pt: 0.25, color: objTone.accent }}>
            <Typography sx={{ fontSize: "0.7rem", lineHeight: 1.2, fontWeight: 800 }}>
              {strActionLabel}
            </Typography>
            <ChevronRightRoundedIcon sx={{ fontSize: 16 }} />
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
  return strRoutePath ? (
    <Link href={strRoutePath} style={{ display: "block", width: "100%", height: "100%", textDecoration: "none" }}>
      {objCard}
    </Link>
  ) : objCard;
}

function buildPendingApprovalsBreakdown(objPayload: KpiPayload, t: RoleBasedDashboardProps["t"]) {
  const lstParts = [
    { intCount: Number(objPayload.intReimbursementPendingCount || 0), strLabel: t("reimbursement", "reimbursement") },
    { intCount: Number(objPayload.intTaxPendingCount || 0), strLabel: t("tax", "tax") },
    { intCount: Number(objPayload.intRunPendingCount || 0), strLabel: t("run", "run") },
  ].filter((objPart) => objPart.intCount > 0);
  if (!lstParts.length) {
    return t("no_pending_approvals_short", "No pending approvals");
  }
  return lstParts.map((objPart) => `${formatInteger(objPart.intCount)} ${objPart.strLabel}`).join(", ");
}

function buildValidationBreakdown(objPayload: KpiPayload, t: RoleBasedDashboardProps["t"]) {
  const intWarnings = Number(objPayload.intWarningCount || 0);
  const intAttendanceBlockers = Number(objPayload.intAttendanceBlockingCount || 0);
  if (!Number(objPayload.intBlockingCount || 0) && !intWarnings && !intAttendanceBlockers) {
    return t("no_validation_blockers_short", "No validation blockers");
  }
  return `${t("warnings", "Warnings")}: ${formatInteger(intWarnings)} | ${t("attendance", "Attendance")}: ${formatInteger(intAttendanceBlockers)}`;
}

function getKpiDisplayTitle(strWidgetCode: string, strSelectedMonth: string, strAllMonthsValue: string, t: RoleBasedDashboardProps["t"], strFallback: string) {
  const blnAllMonths = strSelectedMonth === strAllMonthsValue;
  if (strWidgetCode === "net_payroll_amount") return t("net_pay", "Net Pay");
  if (strWidgetCode === "employees_in_payroll") return blnAllMonths ? t("employee_master", "Employee Master") : t("employees_in_payroll", "Employees in Payroll");
  if (strWidgetCode === "pending_approvals") return t("pending_approvals", "Pending Approvals");
  if (strWidgetCode === "leave_overview") return t("leave_impact", "Leave Impact");
  if (strWidgetCode === "payroll_validation_errors") return t("validation_blockers", "Validation Blockers");
  if (strWidgetCode === "master_data_gaps") return t("master_data_gaps", "Master Data Gaps");
  if (strWidgetCode === "statutory_liability") return t("statutory_liability", "Statutory Liability");
  if (strWidgetCode === "net_pay_movement") return t("net_pay_movement", "Net Pay Movement");
  return translateDashboardText(strFallback, t, strFallback);
}

function getKpiScopeText(strWidgetCode: string, strSelectedMonth: string, strAllMonthsValue: string, t: RoleBasedDashboardProps["t"]) {
  const blnAllMonths = strSelectedMonth === strAllMonthsValue;
  if (strWidgetCode === "employees_in_payroll") {
    return blnAllMonths
      ? t("employee_kpi_scope_master", "Master data snapshot: total and active employees.")
      : t("employee_kpi_scope_payroll_month", "Payroll month scope: employees included in payroll runs.");
  }
  if (strWidgetCode === "net_payroll_amount") {
    return blnAllMonths
      ? t("net_pay_scope_all", "Generated payslip net pay across available payroll data.")
      : t("net_pay_scope_month", "Full selected payroll month net payable.");
  }
  if (strWidgetCode === "pending_approvals") {
    return blnAllMonths
      ? t("approvals_scope_all", "Open payroll, tax, and reimbursement approvals.")
      : t("approvals_scope_month", "Open approvals linked to the selected payroll month.");
  }
  if (strWidgetCode === "leave_overview") {
    return blnAllMonths
      ? t("leave_scope_all", "Pending leave requests that can affect payroll.")
      : t("leave_scope_month", "Leave requests overlapping the selected payroll month.");
  }
  if (strWidgetCode === "payroll_validation_errors") {
    return blnAllMonths
      ? t("validation_scope_latest", "Validation blockers from the latest payroll run set.")
      : t("validation_scope_month", "Validation blockers in the selected payroll month.");
  }
  if (strWidgetCode === "master_data_gaps") {
    return t("master_data_scope", "Current employee master-data readiness.");
  }
  if (strWidgetCode === "statutory_liability") {
    return blnAllMonths
      ? t("statutory_scope_latest", "PF, ESI, and TDS from available payroll results.")
      : t("statutory_scope_month", "PF, ESI, and TDS for the selected payroll month.");
  }
  if (strWidgetCode === "net_pay_movement") {
    return blnAllMonths
      ? t("movement_scope_all", "Compares the latest available payroll month with the previous payroll month.")
      : t("movement_scope", "Compares selected month net pay with the previous payroll month.");
  }
  return t("current_snapshot", "Current Snapshot");
}

function getKpiRoutePath(strWidgetCode: string, strSelectedMonth: string, strAllMonthsValue: string) {
  const blnAllMonths = strSelectedMonth === strAllMonthsValue;
  if (strWidgetCode === "employees_in_payroll") return blnAllMonths ? "/masters/employee" : "/payroll/results";
  if (strWidgetCode === "net_payroll_amount") return "/payroll/results";
  if (strWidgetCode === "pending_approvals") return "/payroll/runs";
  if (strWidgetCode === "leave_overview") return "/reports/leave/applications";
  if (strWidgetCode === "payroll_validation_errors") return "/payroll/runs";
  if (strWidgetCode === "master_data_gaps") return "/masters/employee";
  if (strWidgetCode === "statutory_liability") return "/reports/payroll-register";
  if (strWidgetCode === "net_pay_movement") return "/reports/payroll-register";
  return "";
}

function getKpiActionLabel(strWidgetCode: string, strSelectedMonth: string, strAllMonthsValue: string, t: RoleBasedDashboardProps["t"]) {
  const blnAllMonths = strSelectedMonth === strAllMonthsValue;
  if (strWidgetCode === "employees_in_payroll") return blnAllMonths ? t("open_employee_master", "Open employee master") : t("open_payroll_results", "Open payroll results");
  if (strWidgetCode === "net_payroll_amount") return t("open_payroll_results", "Open payroll results");
  if (strWidgetCode === "pending_approvals") return t("review_approvals", "Review approvals");
  if (strWidgetCode === "leave_overview") return t("open_leave_register", "Open leave register");
  if (strWidgetCode === "payroll_validation_errors") return t("review_run_issues", "Review run issues");
  if (strWidgetCode === "master_data_gaps") return t("fix_employee_master", "Fix employee master");
  if (strWidgetCode === "statutory_liability") return t("open_payroll_register", "Open payroll register");
  if (strWidgetCode === "net_pay_movement") return t("open_payroll_register", "Open payroll register");
  return t("open_details", "Open details");
}


function RunActionPanel({ lstActions, strRunStatus, t }: { lstActions: PayrollActionItem[]; strRunStatus: string; t: RoleBasedDashboardProps["t"] }) {
  return (
    <PanelShell
      strTitle={t("run_actions", "Run Actions")}
      strSubtitle={`${t("status", "Status")}: ${formatLifecycleLabel(strRunStatus, t)}`}
      strAccent={DASHBOARD_COLORS.blue}
    >
      <Grid container spacing={1.15}>
        {lstActions.map((objAction) => (
          <Grid key={objAction.strCode} item xs={12} sm={6}>
            {objAction.blnEnabled ? (
              <Link href={objAction.strRoutePath} style={{ textDecoration: "none", display: "block" }}>
                <Box sx={{ p: 1.2, borderRadius: "14px", border: `1px solid ${DASHBOARD_COLORS.border}`, backgroundColor: objAction.strVariant === "primary" ? DASHBOARD_COLORS.blueSoft : "#FBFDFF", minHeight: 84 }}>
                  <Typography sx={{ color: objAction.strVariant === "primary" ? DASHBOARD_COLORS.blue : DASHBOARD_COLORS.text, fontWeight: 800, fontSize: "0.84rem" }}>
                    {objAction.strLabel}
                  </Typography>
                  <Typography sx={{ mt: 0.55, color: DASHBOARD_COLORS.muted, fontSize: "0.76rem", lineHeight: 1.4 }}>
                    {objAction.strReason}
                  </Typography>
                </Box>
              </Link>
            ) : (
              <Box sx={{ p: 1.2, borderRadius: "14px", border: `1px dashed ${DASHBOARD_COLORS.border}`, backgroundColor: "#F8FAFC", minHeight: 84, opacity: 0.86 }}>
                <Typography sx={{ color: "#94A3B8", fontWeight: 800, fontSize: "0.84rem" }}>
                  {objAction.strLabel}
                </Typography>
                <Typography sx={{ mt: 0.55, color: DASHBOARD_COLORS.muted, fontSize: "0.76rem", lineHeight: 1.4 }}>
                  {objAction.strReason}
                </Typography>
              </Box>
            )}
          </Grid>
        ))}
      </Grid>
    </PanelShell>
  );
}

function ValidationSummaryPanel({ lstCards, t }: { lstCards: Array<{ strLabel: string; strValue: string; strRoutePath: string; strTone: "red" | "amber" | "blue" | "green"; strHint: string }>; t: RoleBasedDashboardProps["t"] }) {
  return (
    <PanelShell strTitle={t("validation_summary", "Validation Summary")} strSubtitle={t("validation_summary_subtitle", "Current run validation, blockers and review shortcuts")} strAccent={DASHBOARD_COLORS.red}>
      <Grid container spacing={1.1}>
        {lstCards.map((objCard, intIndex) => {
          const objTone = validationTone(objCard.strTone);
          return (
            <Grid key={`${objCard.strLabel}-${objCard.strValue}-${intIndex}`} item xs={12} sm={6}>
              <Link href={objCard.strRoutePath} style={{ textDecoration: "none", display: "block" }}>
                <Box sx={{ p: 1.2, borderRadius: "14px", border: `1px solid ${objTone.border}`, backgroundColor: objTone.surface, minHeight: 92 }}>
                  <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.72rem", fontWeight: 700 }}>
                    {objCard.strLabel}
                  </Typography>
                  <Typography sx={{ mt: 0.55, color: objTone.accent, fontSize: "1.15rem", fontWeight: 800 }}>
                    {objCard.strValue}
                  </Typography>
                  <Typography sx={{ mt: 0.4, color: DASHBOARD_COLORS.muted, fontSize: "0.74rem", lineHeight: 1.4 }}>
                    {objCard.strHint}
                  </Typography>
                </Box>
              </Link>
            </Grid>
          );
        })}
      </Grid>
    </PanelShell>
  );
}

function VariancePanel({ lstMetrics, t }: { lstMetrics: VarianceMetric[]; t: RoleBasedDashboardProps["t"] }) {
  return (
    <PanelShell strTitle={t("month_on_month_variance", "Month-on-Month Variance")} strAccent={DASHBOARD_COLORS.blue} blnAutoHeight>
      {lstMetrics.length ? (
        <Grid container spacing={1}>
          {lstMetrics.map((objMetric, intIndex) => (
            <Grid key={`${objMetric.strLabel}-${intIndex}`} item xs={12} sm={6} lg={3}>
              <Box sx={{ p: 1.05, borderRadius: "12px", border: `1px solid ${DASHBOARD_COLORS.border}`, backgroundColor: "#FBFDFF", minHeight: 84 }}>
                <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.71rem", fontWeight: 700 }}>{objMetric.strLabel}</Typography>
                <Typography sx={{ mt: 0.35, color: DASHBOARD_COLORS.text, fontSize: "1rem", fontWeight: 800 }}>
                  {formatMetricValue(objMetric.decCurrent, objMetric.blnCurrency)}
                </Typography>
                <Typography sx={{ mt: 0.24, color: DASHBOARD_COLORS.muted, fontSize: "0.72rem" }}>
                  {t("previous", "Previous")}: {formatMetricValue(objMetric.decPrevious, objMetric.blnCurrency)}
                </Typography>
                <Typography sx={{ mt: 0.34, color: varianceColor(objMetric.decVariancePercent), fontSize: "0.74rem", fontWeight: 700 }}>
                  {formatTrendText(objMetric.decVariancePercent, t)}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      ) : (
        <CompactEmptyState strTitle={t("no_previous_month_data", "No previous month data")} strSubtitle={t("no_previous_month_data_hint", "Variance will appear after at least two payroll months are available.")} />
      )}
    </PanelShell>
  );
}

function SummaryPanel({ objWidget, t }: { objWidget: DashboardWidget; t: RoleBasedDashboardProps["t"] }) {
  const lstStats = (((objWidget.objPayload as { lstStats?: SummaryStat[] } | undefined)?.lstStats) || []) as SummaryStat[];
  const objTone = summaryTone(objWidget.strWidgetCode);
  const strCode = String(objWidget.strWidgetCode || "").toLowerCase();
  const blnItSummary = strCode.includes("it_declaration");
  const blnReimbursement = strCode.includes("reimbursement");
  const blnStatutory = strCode.includes("statutory");
  const blnTax = strCode.includes("tax");
  const intTotal = lstStats.reduce((intSum, objStat) => intSum + Number(objStat.intValue || 0), 0);
  const intPrimary = Number(lstStats[0]?.intValue || 0);
  const intSecondary = Number(lstStats[1]?.intValue || 0);
  const decPrimary = Number(lstStats[0]?.decValue || 0);
  const decPercent = intTotal > 0 ? Math.round((intSecondary / intTotal) * 1000) / 10 : 0;
  const lstSparklinePoints = resolveSummarySparklinePoints(objWidget);
  const blnShowItRing = intPrimary > 0 || intSecondary > 0 || Number(lstStats[2]?.intValue || 0) > 0;
  const blnShowReimbursementRing = intTotal > 0;
  const blnShowStatutoryBars = lstStats.some((objStat) => Number(objStat.intValue || 0) > 0);
  const blnShowTaxSparkline = lstSparklinePoints.length >= 2;

  return (
    <PanelShell strTitle={resolveWidgetTitle(t, objWidget.strWidgetCode, objWidget.strWidgetName)} strAccent={objTone.accent}>
      {blnItSummary ? (
        <Stack direction="row" spacing={1.4} alignItems={blnShowItRing ? "center" : "stretch"}>
          <Stack spacing={0.9} sx={{ flex: 1 }}>
            {lstStats.map((objStat, intIndex) => (
              <Box key={`${objStat.strLabel}-${intIndex}`} sx={{ p: 1.05, minHeight: intIndex === 2 ? 42 : 54, borderRadius: "10px", backgroundColor: intIndex === 2 ? "#FFFFFF" : objTone.surface, border: `1px solid ${objTone.border}` }}>
                <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.72rem" }}>{objStat.strLabel}</Typography>
                <Typography sx={{ mt: 0.15, fontSize: "1.2rem", fontWeight: 800, color: DASHBOARD_COLORS.text }}>
                  {formatInteger(objStat.intValue || 0)}
                </Typography>
              </Box>
            ))}
          </Stack>
          {blnShowItRing ? <ProgressRing decPercent={(intPrimary / Math.max(intPrimary + intSecondary, 1)) * 100} strColor={objTone.accent} strLabel={dashboardTextFallback("filed", t, "Filed")} /> : null}
        </Stack>
      ) : null}
      {blnReimbursement ? (
        <Stack direction="row" spacing={1.4} alignItems={blnShowReimbursementRing ? "center" : "stretch"}>
          <Grid container spacing={1.05} sx={{ flex: 1 }}>
            {lstStats.map((objStat, intIndex) => (
              <Grid key={`${objStat.strLabel}-${intIndex}`} item xs={objStat.strLabel.toLowerCase().includes("pending") ? 12 : 6}>
                <Box sx={{ p: 1.05, minHeight: 54, borderRadius: "10px", backgroundColor: objTone.surface, border: `1px solid ${objTone.border}` }}>
                  <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.72rem" }}>{objStat.strLabel}</Typography>
                  <Typography sx={{ mt: 0.15, fontSize: "1.2rem", fontWeight: 800, color: DASHBOARD_COLORS.text }}>
                    {formatInteger(objStat.intValue || 0)}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
          {blnShowReimbursementRing ? <ProgressRing decPercent={decPercent} strColor={objTone.accent} strLabel={dashboardTextFallback("approved", t, "Approved")} /> : null}
        </Stack>
      ) : null}
      {blnStatutory ? (
        <Stack spacing={1.2}>
          <Grid container spacing={1.05}>
            {lstStats.map((objStat, intIndex) => (
              <Grid key={`${objStat.strLabel}-${intIndex}`} item xs={6}>
                <Box sx={{ p: 1.05, minHeight: 54, borderRadius: "10px", backgroundColor: objTone.surface, border: `1px solid ${objTone.border}` }}>
                  <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.72rem" }}>{objStat.strLabel}</Typography>
                  <Typography sx={{ mt: 0.15, fontSize: "1.2rem", fontWeight: 800, color: DASHBOARD_COLORS.text }}>
                    {formatInteger(objStat.intValue || 0)}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
          {blnShowStatutoryBars ? <MiniBarChart lstBars={lstStats.map((objStat) => Number(objStat.intValue || 0))} /> : null}
        </Stack>
      ) : null}
      {blnTax ? (
        <Stack spacing={1.05}>
          <Box sx={{ p: 1.15, borderRadius: "12px", backgroundColor: objTone.surface, border: `1px solid ${objTone.border}` }}>
            <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.72rem" }}>{lstStats[0]?.strLabel || "TDS Deducted"}</Typography>
            <Typography sx={{ mt: 0.2, fontSize: "1.95rem", fontWeight: 800, color: DASHBOARD_COLORS.text }}>
              {formatCurrency(decPrimary)}
            </Typography>
          </Box>
          {blnShowTaxSparkline ? <Sparkline lstPoints={lstSparklinePoints} strColor={objTone.accent} blnCompact /> : null}
        </Stack>
      ) : null}
    </PanelShell>
  );
}

function HighRiskEmployeesPanel({ lstEmployees, t }: { lstEmployees: HighRiskEmployeeRow[]; t: RoleBasedDashboardProps["t"] }) {
  const [strFilter, setStrFilter] = useState("All");
  const [strSearch, setStrSearch] = useState("");
  const lstCategories = ["All", "Salary", "Bank", "Tax", "Payroll", "Reimbursement"];
  const lstFilteredRows = lstEmployees.filter((objEmployee) => {
    const blnCategoryMatch = strFilter === "All" || objEmployee.strRiskType.toLowerCase().includes(strFilter.toLowerCase());
    const strQuery = strSearch.trim().toLowerCase();
    const blnSearchMatch = !strQuery || `${objEmployee.strEmployeeName} ${objEmployee.strEmployeeCode || ""} ${objEmployee.strDetail}`.toLowerCase().includes(strQuery);
    return blnCategoryMatch && blnSearchMatch;
  });
  return (
    <PanelShell strTitle={t("high_risk_employees", "High-Risk Employees")} strSubtitle={t("high_risk_employees_subtitle", "Employees needing payroll intervention before processing or release")} strAccent={DASHBOARD_COLORS.red}>
      <Stack spacing={1}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between">
          <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
            {lstCategories.map((strCategory) => (
              <Chip key={strCategory} label={strCategory} size="small" clickable onClick={() => setStrFilter(strCategory)} sx={{ borderRadius: "999px", fontWeight: 700, backgroundColor: strFilter === strCategory ? DASHBOARD_COLORS.redSoft : "#F8FAFC", color: strFilter === strCategory ? DASHBOARD_COLORS.red : DASHBOARD_COLORS.muted }} />
            ))}
          </Stack>
          <TextField size="small" value={strSearch} onChange={(objEvent) => setStrSearch(objEvent.target.value)} placeholder={t("search_employees", "Search employees")} InputProps={{ startAdornment: <SearchRoundedIcon sx={{ fontSize: 16, color: DASHBOARD_COLORS.muted, mr: 0.8 }} /> }} sx={{ minWidth: { xs: "100%", md: 220 }, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }} />
        </Stack>
        {lstFilteredRows.length ? lstFilteredRows.slice(0, 8).map((objEmployee, intIndex) => (
          <Link key={`${objEmployee.strEmployeeName}-${intIndex}`} href={objEmployee.strRoutePath || "/employees"} style={{ textDecoration: "none" }}>
            <Box sx={{ p: 1.1, borderRadius: "12px", border: `1px solid ${exceptionTone(objEmployee.strSeverity || "Warning").border}`, backgroundColor: exceptionTone(objEmployee.strSeverity || "Warning").surface }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
                <Box>
                  <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 700, fontSize: "0.84rem" }}>{objEmployee.strEmployeeName}</Typography>
                    {objEmployee.strEmployeeCode ? <Chip label={objEmployee.strEmployeeCode} size="small" sx={{ height: 22, borderRadius: "999px", fontSize: "0.66rem" }} /> : null}
                    <Chip label={objEmployee.strRiskType} size="small" sx={{ height: 22, borderRadius: "999px", backgroundColor: "#fff", fontSize: "0.66rem", fontWeight: 700 }} />
                  </Stack>
                  <Typography sx={{ mt: 0.35, color: DASHBOARD_COLORS.muted, fontSize: "0.76rem" }}>{objEmployee.strDetail}</Typography>
                </Box>
                <Chip label={objEmployee.strSeverity || "Warning"} size="small" sx={{ borderRadius: "999px", backgroundColor: "#fff", color: exceptionTone(objEmployee.strSeverity || "Warning").accent, fontWeight: 700 }} />
              </Stack>
            </Box>
          </Link>
        )) : <CompactEmptyState strTitle={t("no_high_risk_employees", "No high-risk employees")} strSubtitle={t("no_high_risk_employees_hint", "No employee-level blockers matched the current filter.")} />}
      </Stack>
    </PanelShell>
  );
}

function ExceptionWorkQueuePanel({ lstItems, t }: { lstItems: ExceptionItem[]; t: RoleBasedDashboardProps["t"] }) {
  return (
    <PanelShell strTitle={t("exception_work_queue", "Exception Work Queue")} strSubtitle={t("exception_work_queue_subtitle", "Payroll blockers and approval queues that need HR action")} strAccent={DASHBOARD_COLORS.red}>
      <Stack spacing={1}>
        {lstItems.length ? lstItems.map((objItem, intIndex) => (
          <Link key={`${objItem.strCode}-${intIndex}`} href={objItem.strRoutePath || "/payroll/runs"} style={{ textDecoration: "none" }}>
            <Box sx={{ p: 1.1, borderRadius: "12px", border: `1px solid ${DASHBOARD_COLORS.border}`, backgroundColor: "#FBFDFF" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Stack direction="row" spacing={0.9} alignItems="center" sx={{ minWidth: 0 }}>
                  <Box sx={{ width: 30, height: 30, borderRadius: "9px", flexShrink: 0, display: "grid", placeItems: "center", backgroundColor: exceptionTone(objItem.strSeverity || "Warning").surface, color: exceptionTone(objItem.strSeverity || "Warning").accent }}>
                    {getKpiIcon(objItem.strCode)}
                  </Box>
                  <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 700, fontSize: "0.82rem" }}>{objItem.strLabel}</Typography>
                </Stack>
                <Stack direction="row" spacing={0.6} alignItems="center" flexShrink={0}>
                  <Chip label={formatInteger(objItem.intCount)} size="small" sx={{ height: 24, borderRadius: "999px", fontWeight: 800, backgroundColor: exceptionTone(objItem.strSeverity || "Warning").surface, color: exceptionTone(objItem.strSeverity || "Warning").accent }} />
                  <ChevronRightRoundedIcon sx={{ fontSize: 18, color: DASHBOARD_COLORS.muted }} />
                </Stack>
              </Stack>
            </Box>
          </Link>
        )) : <CompactEmptyState strTitle={t("no_exceptions", "No open exceptions")} strSubtitle={t("no_exceptions_hint", "Exceptions will appear here as payroll data is reviewed.")} />}
        <Link href="/payroll/runs" style={{ color: DASHBOARD_COLORS.blue, fontWeight: 700, textDecoration: "none", fontSize: "0.8rem" }}>
          {t("view_all_exceptions", "View All Exceptions")} →
        </Link>
      </Stack>
    </PanelShell>
  );
}

function ApprovalAgingPanel({ lstRows, t }: { lstRows: ApprovalAgingRow[]; t: RoleBasedDashboardProps["t"] }) {
  return (
    <PanelShell strTitle={t("approval_aging", "Approval Aging")} strSubtitle={t("approval_aging_subtitle", "Pending queues across payroll, IT declarations, reimbursements and proof checks")} strAccent={DASHBOARD_COLORS.amber}>
      <Stack spacing={1}>
        {lstRows.length ? lstRows.map((objRow, intIndex) => (
          <Link key={`${objRow.strLabel}-${intIndex}`} href={objRow.strRoutePath || "/payroll/runs"} style={{ textDecoration: "none" }}>
            <Box sx={{ p: 1.1, borderRadius: "12px", border: `1px solid ${DASHBOARD_COLORS.border}`, backgroundColor: "#FBFDFF" }}>
              <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Box>
                  <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 700, fontSize: "0.82rem" }}>{objRow.strLabel}</Typography>
                  <Typography sx={{ mt: 0.25, color: DASHBOARD_COLORS.muted, fontSize: "0.74rem" }}>
                    {t("average_age", "Average Age")}: {formatDays(objRow.decAverageDays, t)}
                  </Typography>
                </Box>
                <Stack alignItems="flex-end">
                  <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 800, fontSize: "0.9rem" }}>{formatInteger(objRow.intPendingCount)}</Typography>
                  <Typography sx={{ color: DASHBOARD_COLORS.red, fontSize: "0.72rem", fontWeight: 700 }}>{formatInteger(Number(objRow.intOverdueCount || 0))} {t("overdue", "overdue")}</Typography>
                </Stack>
              </Stack>
            </Box>
          </Link>
        )) : <CompactEmptyState strTitle={t("no_pending_approvals", "No pending approvals")} strSubtitle={t("no_pending_approvals_hint", "Approval aging will appear when there are pending records.")} />}
      </Stack>
    </PanelShell>
  );
}

function DetailedSummaryPanel({ strTitle, strSubtitle, lstStats, strAccent }: { strTitle: string; strSubtitle?: string; lstStats: DrilldownStat[]; strAccent: string }) {
  return (
    <PanelShell strTitle={strTitle} strSubtitle={strSubtitle} strAccent={strAccent}>
      <Stack spacing={0.8}>
        {lstStats.length ? lstStats.map((objStat, intIndex) => {
          const objContent = (
            <Box sx={{ p: 1, borderRadius: "12px", border: `1px solid ${DASHBOARD_COLORS.border}`, backgroundColor: "#FBFDFF" }}>
              <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.74rem", fontWeight: 700 }}>{objStat.strLabel}</Typography>
                <Typography sx={{ color: DASHBOARD_COLORS.text, fontSize: "0.82rem", fontWeight: 800 }}>{objStat.decValue != null ? formatCurrency(Number(objStat.decValue || 0)) : formatInteger(Number(objStat.intValue || 0))}</Typography>
              </Stack>
            </Box>
          );
          return objStat.strRoutePath ? <Link key={`${objStat.strLabel}-${intIndex}`} href={objStat.strRoutePath} style={{ textDecoration: "none" }}>{objContent}</Link> : <Box key={`${objStat.strLabel}-${intIndex}`}>{objContent}</Box>;
        }) : <CompactEmptyState strTitle="No data" strSubtitle="This section will populate when source transactions are available." />}
      </Stack>
    </PanelShell>
  );
}

function OutputReadinessPanel({ objOutputReadiness, t }: { objOutputReadiness: OutputReadinessPayload; t: RoleBasedDashboardProps["t"] }) {
  const intPayslipTotal = Number(objOutputReadiness.intPayslipsGenerated || 0) + Number(objOutputReadiness.intPayslipsPending || 0) + Number(objOutputReadiness.intPayslipsFailed || 0);
  const decPayslipPercent = intPayslipTotal > 0 ? (Number(objOutputReadiness.intPayslipsGenerated || 0) / intPayslipTotal) * 100 : 0;
  const intBankTotal = Number(objOutputReadiness.intBankReady || 0) + Number(objOutputReadiness.intMissingBank || 0);
  const decBankPercent = intBankTotal > 0 ? (Number(objOutputReadiness.intBankReady || 0) / intBankTotal) * 100 : 0;
  return (
    <PanelShell strTitle={t("payslip_payout_readiness", "Payslip and Payout Readiness")} strSubtitle={t("payslip_payout_readiness_subtitle", "Post-processing output status for results, payslips and bank file preparation")} strAccent={DASHBOARD_COLORS.green}>
      <Stack spacing={1.2}>
        <Grid container spacing={1}>
          <Grid item xs={6}><MetricPill strLabel={t("processed_results", "Processed Results")} strValue={formatInteger(Number(objOutputReadiness.intProcessedResults || 0))} strTone={DASHBOARD_COLORS.blue} /></Grid>
          <Grid item xs={6}><MetricPill strLabel={t("payslips_generated", "Payslips Generated")} strValue={formatInteger(Number(objOutputReadiness.intPayslipsGenerated || 0))} strTone={DASHBOARD_COLORS.green} /></Grid>
          <Grid item xs={6}><MetricPill strLabel={t("payslips_pending", "Payslips Pending")} strValue={formatInteger(Number(objOutputReadiness.intPayslipsPending || 0))} strTone={DASHBOARD_COLORS.amber} /></Grid>
          <Grid item xs={6}><MetricPill strLabel={t("missing_bank", "Missing Bank")} strValue={formatInteger(Number(objOutputReadiness.intMissingBank || 0))} strTone={DASHBOARD_COLORS.red} /></Grid>
        </Grid>
        <Box>
          <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.74rem", fontWeight: 700 }}>{t("payslip_generation", "Payslip Generation")}</Typography>
          <MiniProgressBar decValue={decPayslipPercent} strColor={DASHBOARD_COLORS.green} />
        </Box>
        <Box>
          <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.74rem", fontWeight: 700 }}>{t("bank_readiness", "Bank Readiness")}</Typography>
          <MiniProgressBar decValue={decBankPercent} strColor={DASHBOARD_COLORS.blue} />
        </Box>
        <CompactStatRow strLabel={t("bank_file_status", "Bank File Status")} strValue={String(objOutputReadiness.strBankFileStatus || "-")} />
        <CompactStatRow strLabel={t("payroll_register_status", "Payroll Register Status")} strValue={String(objOutputReadiness.strPayrollRegisterStatus || "-")} />
      </Stack>
    </PanelShell>
  );
}

function AuditPanel({ objAudit, t }: { objAudit: AuditPayload; t: RoleBasedDashboardProps["t"] }) {
  const lstRows = [
    { strLabel: t("last_validated", "Last Validated"), strValue: joinActorDate(objAudit.strLastValidatedBy, objAudit.dtLastValidatedOn, t) },
    { strLabel: t("last_processed", "Last Processed"), strValue: joinActorDate(objAudit.strLastProcessedBy, objAudit.dtLastProcessedOn, t) },
    { strLabel: t("reprocess_count", "Reprocess Count"), strValue: formatInteger(Number(objAudit.intReprocessCount || 0)) },
    { strLabel: t("reprocess_reason", "Last Reprocess Reason"), strValue: String(objAudit.strLastReprocessReason || "-") },
    { strLabel: t("closed_on", "Closed By / On"), strValue: joinActorDate(objAudit.strClosedBy, objAudit.dtClosedOn, t) },
    { strLabel: t("failed_employees", "Failed Employee Count"), strValue: formatInteger(Number(objAudit.intFailedEmployeeCount || 0)) },
  ];
  return (
    <PanelShell strTitle={t("payroll_audit", "Payroll Audit Panel")} strSubtitle={t("payroll_audit_subtitle", "Validation, processing and reprocess history for the current dashboard context")} strAccent={DASHBOARD_COLORS.blue}>
      <Stack spacing={0.8}>
        {lstRows.map((objRow, intIndex) => (
          <CompactStatRow key={`${objRow.strLabel}-${intIndex}`} strLabel={objRow.strLabel} strValue={objRow.strValue} />
        ))}
      </Stack>
    </PanelShell>
  );
}

function RecentRunsPanel({ objWidget, strSelectedMonth, strAllMonthsValue, t }: { objWidget?: DashboardWidget; strSelectedMonth: string; strAllMonthsValue: string; t: RoleBasedDashboardProps["t"] }) {
  const lstRows = (((objWidget?.objPayload as { lstRows?: RecentRunRow[] } | undefined)?.lstRows) || []) as RecentRunRow[];
  const blnAllMonths = strSelectedMonth === strAllMonthsValue;
  const strPanelTitle = blnAllMonths ? resolveWidgetTitle(t, objWidget?.strWidgetCode, objWidget?.strWidgetName || "Recent Payroll Runs") : t("payroll_runs_for_month", "Payroll Runs for Selected Month");
  const strPanelSubtitle = blnAllMonths
    ? t("recent_runs_scope_all", "Latest primary payroll runs with status, net pay and employee count")
    : `${t("recent_runs_scope_month", "Primary payroll runs included in the selected month")}: ${formatLongMonth(strSelectedMonth, t)}`;
  return (
    <PanelShell strTitle={strPanelTitle} strSubtitle={strPanelSubtitle} strAccent={DASHBOARD_COLORS.blue}>
      <Stack spacing={0.8}>
        <Box
          sx={{
            display: { xs: "none", md: "grid" },
            gridTemplateColumns: "1.15fr 1fr 0.95fr 1fr 0.72fr 1.15fr 1fr",
            gap: 1,
            px: 0.8,
            color: DASHBOARD_COLORS.muted,
            fontSize: "0.68rem",
            fontWeight: 700,
          }}
        >
          <Typography sx={{ fontSize: "0.72rem" }}>{t("payroll_period", "Payroll Period")}</Typography>
          <Typography sx={{ fontSize: "0.72rem" }}>{t("run_name", "Run Name")}</Typography>
          <Typography sx={{ fontSize: "0.72rem" }}>{t("status", "Status")}</Typography>
          <Typography sx={{ fontSize: "0.72rem" }}>{t("net_pay", "Net Pay")}</Typography>
          <Typography sx={{ fontSize: "0.72rem" }}>{t("employees", "Employees")}</Typography>
          <Typography sx={{ fontSize: "0.72rem" }}>{t("processed_on", "Processed On")}</Typography>
          <Typography sx={{ fontSize: "0.72rem" }}>{t("action", "Action")}</Typography>
        </Box>
        {lstRows.length ? (
          lstRows.map((objRow) => (
            <Box
              key={objRow.id}
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1.15fr 1fr 0.95fr 1fr 0.72fr 1.15fr 1fr" },
                gap: { xs: 0.55, md: 0.8 },
                alignItems: "center",
                minHeight: { md: 52 },
                borderRadius: "10px",
                px: 0.95,
                py: 0.72,
                border: `1px solid ${DASHBOARD_COLORS.border}`,
                backgroundColor: "#FFFFFF",
                transition: "transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease",
                "&:hover": {
                  transform: "translateY(-1px)",
                  backgroundColor: "#FCFCFF",
                  boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
                },
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ display: { xs: "block", md: "none" }, color: DASHBOARD_COLORS.muted, fontSize: "0.72rem", mb: 0.2 }}>{t("payroll_period", "Payroll Period")}</Typography>
                <Typography noWrap sx={{ fontWeight: 700, color: DASHBOARD_COLORS.text, fontSize: "0.88rem" }}>{formatLongMonth(objRow.payroll_month, t)}</Typography>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ display: { xs: "block", md: "none" }, color: DASHBOARD_COLORS.muted, fontSize: "0.72rem", mb: 0.2 }}>{t("run_name", "Run Name")}</Typography>
                <Typography noWrap sx={{ color: DASHBOARD_COLORS.text, fontSize: "0.82rem", fontWeight: 600 }}>
                  {String(objRow.run_name || `Run #${objRow.id}`)}
                </Typography>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ display: { xs: "block", md: "none" }, color: DASHBOARD_COLORS.muted, fontSize: "0.72rem", mb: 0.2 }}>{t("status", "Status")}</Typography>
                <Chip label={formatStatusText(objRow.run_status, t)} size="small" sx={{ fontWeight: 700, borderRadius: "999px", backgroundColor: chipBackground(objRow.run_status), color: statusAccentColor(objRow.run_status), fontSize: "0.7rem" }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ display: { xs: "block", md: "none" }, color: DASHBOARD_COLORS.muted, fontSize: "0.72rem", mb: 0.2 }}>{t("net_pay", "Net Pay")}</Typography>
                <Typography noWrap sx={{ color: DASHBOARD_COLORS.text, fontSize: "0.82rem", fontWeight: 700 }}>{formatCurrency(objRow.net_pay_total || 0)}</Typography>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ display: { xs: "block", md: "none" }, color: DASHBOARD_COLORS.muted, fontSize: "0.72rem", mb: 0.2 }}>{t("employees", "Employees")}</Typography>
                <Typography noWrap sx={{ color: DASHBOARD_COLORS.text, fontSize: "0.82rem", fontWeight: 700 }}>{formatInteger(objRow.employee_count || 0)}</Typography>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ display: { xs: "block", md: "none" }, color: DASHBOARD_COLORS.muted, fontSize: "0.72rem", mb: 0.2 }}>{t("processed_on", "Processed On")}</Typography>
                <Typography noWrap sx={{ color: "#475569", fontSize: "0.82rem", fontWeight: 600 }}>{formatDateTimeLabel(objRow.processed_on, t)}</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Tooltip title={t("view_run", "View Run")}>
                  <Link href={`/payroll/runs/${objRow.id}`} style={{ display: "inline-flex" }}>
                    <IconButton size="small" sx={{ color: DASHBOARD_COLORS.blue, backgroundColor: "#EFF6FF", "&:hover": { backgroundColor: "#DCEAFE" } }}>
                      <VisibilityRoundedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Link>
                </Tooltip>
              </Box>
            </Box>
          ))
        ) : (
          <Typography sx={{ color: DASHBOARD_COLORS.muted }}>{t("no_payroll_runs", "No payroll runs available yet.")}</Typography>
        )}
        <Link href="/payroll/runs" style={{ display: "inline-block", marginTop: 8, color: DASHBOARD_COLORS.blue, textDecoration: "none", fontWeight: 700, fontSize: "0.82rem" }}>
          {t("view_all_runs", "View All Payroll Runs")}
        </Link>
      </Stack>
    </PanelShell>
  );
}

function QuickActionsPanel({ objWidget, t }: { objWidget?: DashboardWidget; t: RoleBasedDashboardProps["t"] }) {
  const lstActions = buildDemoQuickActions(((((objWidget?.objPayload as { lstActions?: DashboardQuickAction[] } | undefined)?.lstActions) || []) as DashboardQuickAction[]), t);
  return (
    <PanelShell strTitle={resolveWidgetTitle(t, objWidget?.strWidgetCode, objWidget?.strWidgetName || "Quick Actions")} strSubtitle={t("quick_actions_subtitle", "Route-backed shortcuts for common HR and payroll work")} strAccent={DASHBOARD_COLORS.blue}>
      {lstActions.length ? (
        <Box
          sx={{
            height: "100%",
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
            gridAutoRows: "1fr",
            gap: 1.25,
          }}
        >
          {lstActions.map((objAction) => (
            <Link key={objAction.strActionCode} href={objAction.strRoutePath || "/dashboard"} style={{ display: "block", width: "100%", height: "100%", textDecoration: "none" }}>
              <Paper sx={{ p: 1.4, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", borderRadius: "16px", border: `1px solid ${DASHBOARD_COLORS.border}`, boxShadow: "none", backgroundColor: "#f8fafc" }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: "12px", backgroundColor: quickActionColor(objAction.strActionCode), display: "grid", placeItems: "center", flexShrink: 0 }}>
                    {renderQuickActionIcon(objAction.strActionCode)}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, color: DASHBOARD_COLORS.text, fontSize: "0.82rem", lineHeight: 1.3 }}>{objAction.strActionName}</Typography>
                    <Typography sx={{ mt: 0.2, color: DASHBOARD_COLORS.muted, fontSize: "0.72rem", lineHeight: 1.35 }}>{quickActionSubtitle(objAction.strActionCode, t)}</Typography>
                  </Box>
                </Stack>
              </Paper>
            </Link>
          ))}
        </Box>
      ) : (
        <Grid container>
          <Grid item xs={12}>
            <Box sx={{ minHeight: 180, display: "grid", placeItems: "center", px: 2, py: 2 }}>
              <Stack spacing={1.15} alignItems="center">
                <Box sx={{ position: "relative", width: 176, height: 96 }}>
                  <Box sx={{ position: "absolute", left: 26, right: 26, bottom: 0, height: 14, borderRadius: "999px", background: "radial-gradient(circle, rgba(37,99,235,0.16) 0%, rgba(37,99,235,0.03) 62%, rgba(37,99,235,0) 100%)" }} />
                  <Box sx={{ position: "absolute", left: 50, bottom: 18, width: 72, height: 28, borderRadius: "10px 10px 18px 18px", background: "linear-gradient(180deg,#E8F0FF 0%, #D7E6FF 100%)" }} />
                  <Box sx={{ position: "absolute", left: 74, top: 36, width: 28, height: 34, borderRadius: "8px", border: "1px solid #CFE0FF", background: "#FFFFFF", boxShadow: "0 8px 16px rgba(37,99,235,0.08)", transform: "rotate(-18deg)" }} />
                  <Box sx={{ position: "absolute", left: 102, top: 26, width: 30, height: 36, borderRadius: "8px", border: "1px solid #CFE0FF", background: "#FFFFFF", boxShadow: "0 8px 16px rgba(37,99,235,0.08)", transform: "rotate(12deg)" }} />
                  <Box sx={{ position: "absolute", left: 86, top: 44, width: 30, height: 36, borderRadius: "8px", border: "1px solid #CFE0FF", background: "#F3F7FF", boxShadow: "0 8px 16px rgba(37,99,235,0.08)" }} />
                  <Box sx={{ position: "absolute", left: 136, top: 18, width: 8, height: 8, borderRadius: "50%", backgroundColor: "#FFB84D" }} />
                  <Box sx={{ position: "absolute", left: 144, top: 30, width: 6, height: 6, borderRadius: "2px", backgroundColor: "#2563EB", transform: "rotate(18deg)" }} />
                  <Box sx={{ position: "absolute", left: 40, top: 28, width: 5, height: 5, borderRadius: "50%", backgroundColor: "#2563EB" }} />
                  <Box sx={{ position: "absolute", left: 34, top: 18, width: 7, height: 7, borderRadius: "2px", backgroundColor: "#FFB84D", transform: "rotate(12deg)" }} />
                </Box>
                <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 800, fontSize: "1rem" }}>
                  {t("standard_actions_ready", "Standard actions ready")}
                </Typography>
                <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.82rem", textAlign: "center", maxWidth: 320 }}>
                  {t("standard_actions_ready_hint", "Use route-backed shortcuts for payroll runs, results, payslips, exceptions and reports.")}
                </Typography>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      )}
    </PanelShell>
  );
}

function ensureWidget(
  objWidget: DashboardWidget | undefined,
  strWidgetCode: string,
  strWidgetName: string,
  strWidgetType: WidgetType,
  objFallbackPayload: Record<string, unknown>,
): DashboardWidget {
  return {
    strWidgetCode,
    strWidgetName,
    strWidgetType,
    strDashboardType: "PAYROLL",
    intDisplayOrder: 0,
    blnIsVisible: true,
    ...(objWidget || {}),
    objPayload: {
      ...objFallbackPayload,
      ...(((objWidget?.objPayload as Record<string, unknown> | undefined) || {})),
    },
  };
}

function EssDashboard({ objDashboard, objUserContext, t }: RoleBasedDashboardProps) {
  const [objEmployeeProfile, setObjEmployeeProfile] = useState<EmployeeDetailRecord | null>(null);
  const [objEmployeeOptions, setObjEmployeeOptions] = useState<EmployeeFormOptions | null>(null);
  const [objEmployeeAddress, setObjEmployeeAddress] = useState<EmployeeAddressRecord | null>(null);
  const [objEmployeeBank, setObjEmployeeBank] = useState<EmployeeBankRecord | null>(null);
  const [objEmployeeStatutory, setObjEmployeeStatutory] = useState<EmployeeStatutoryRecord | null>(null);
  const [objEmployeeSalarySummary, setObjEmployeeSalarySummary] = useState<EmployeeSalarySummaryRecord | null>(null);
  const [lstEssLeaveBalances, setLstEssLeaveBalances] = useState<LeaveBalanceDto[]>([]);
  const [lstEssLeaveApplications, setLstEssLeaveApplications] = useState<LeaveApplicationDto[]>([]);
  const [objMoreShortcutsAnchor, setObjMoreShortcutsAnchor] = useState<HTMLElement | null>(null);
  const setEssDashboardHeaderMode = useSetEssDashboardHeaderMode();

  useEffect(() => {
    setEssDashboardHeaderMode?.(true);
    const strPreviousDocumentTitle = typeof document !== "undefined" ? document.title : "";
    if (typeof document !== "undefined") {
      document.title = "Employee Self Service";
    }
    return () => {
      setEssDashboardHeaderMode?.(false);
      if (typeof document !== "undefined" && strPreviousDocumentTitle) {
        document.title = strPreviousDocumentTitle;
      }
    };
  }, [setEssDashboardHeaderMode]);
  const ESS_COLORS = {
    bg: "#F8FAFF",
    shell: "linear-gradient(90deg, #EDF4FF 0%, #E7F0FF 42%, #E8F8F1 100%)",
    shellBorder: "rgba(190, 210, 244, 0.72)",
    shellText: "#33446F",
    shellMuted: "#66779F",
    hero: "linear-gradient(90deg, #F7FAFF 0%, #EDF4FC 48%, #DCEAF8 100%)",
    heroGlow: "radial-gradient(circle at top right, rgba(153, 191, 255, 0.22), rgba(153, 191, 255, 0) 62%)",
    navy: "#22345F",
    blue: "#285CFF",
    green: "#16A34A",
    orange: "#F97316",
    violet: "#6D28D9",
    teal: "#0EA5A4",
    red: "#EF4444",
    card: "linear-gradient(135deg, #FCFEFF 0%, #F6FBFF 56%, #F2FBF6 100%)",
    border: "#DCE7F7",
    muted: "#667085",
    body: "#4E6288",
    softBlue: "#EEF4FF",
    softGreen: "#ECFDF5",
    softOrange: "#FFF7ED",
    softViolet: "#F3E8FF",
    softRed: "#FEF2F2",
  };
  const objWhiteCardSx = {
    width: "100%",
    height: "100%",
    borderRadius: "18px",
    border: `1px solid ${ESS_COLORS.border}`,
    background: ESS_COLORS.card,
    boxShadow: "0 14px 36px rgba(69, 94, 146, 0.08)",
  } as const;
  const lstWidgets = objDashboard.lstWidgets.map(normalizeDashboardWidget);
  const objWelcomeWidget = lstWidgets.find((objWidget) => objWidget.strWidgetCode === "welcome_profile");
  const objPayWidget = lstWidgets.find((objWidget) => objWidget.strWidgetCode === "current_month_pay");
  const objProfileWidget = lstWidgets.find((objWidget) => objWidget.strWidgetCode === "profile_completeness");
  const objItWidget = lstWidgets.find((objWidget) => objWidget.strWidgetCode === "it_declaration_card");
  const objReimbursementWidget = lstWidgets.find((objWidget) => objWidget.strWidgetCode === "reimbursement_card");
  const objPayslipWidget = lstWidgets.find((objWidget) => objWidget.strWidgetCode === "last_3_payslips");
  const objComplianceWidget = lstWidgets.find((objWidget) => objWidget.strWidgetCode === "compliance_health");
  const objAttendanceWidget = lstWidgets.find((objWidget) => objWidget.strWidgetCode === "attendance_snapshot");
  const objLeaveWidget = lstWidgets.find((objWidget) => objWidget.strWidgetCode === "leave_summary");
  const objWelcome = (objWelcomeWidget?.objPayload || {}) as Record<string, unknown>;
  const objPay = (objPayWidget?.objPayload || {}) as Record<string, unknown>;
  const objProfile = (objProfileWidget?.objPayload || {}) as Record<string, unknown>;
  const lstPayslips = (((objPayslipWidget?.objPayload as { lstRows?: EssPayslipRow[] } | undefined)?.lstRows) || []) as EssPayslipRow[];
  const lstComplianceChecksPayload = (((objComplianceWidget?.objPayload as { lstChecks?: EssProfileCheck[] } | undefined)?.lstChecks) || []) as EssProfileCheck[];
  const intCurrentEmployeeID = objUserContext.objUser.intEmployeeID ?? null;

  const {
    objOverview: objAttendanceOverview,
    blnLoading: blnAttendanceOverviewLoading,
    blnPunching,
    strError: strPunchError,
    loadAttendance,
    punch,
  } = useMyAttendance();

  useEffect(() => {
    const strToday = getTodayIsoDate();
    loadAttendance(strToday, strToday, strToday).catch(() => undefined);
  }, [loadAttendance]);

  const {
    blnIsLeaveApprover,
    blnIsRegularizationApprover,
    intPendingLeaveApprovals,
    intPendingRegularizationApprovals,
  } = useEssPendingApprovals();

  const objPunchButtonState = resolvePunchButtonState(objAttendanceOverview, blnPunching);
  const [strPunchSuccessMessage, setStrPunchSuccessMessage] = useState("");

  const handlePunch = useCallback(() => {
    if (!objAttendanceOverview) {
      return;
    }
    const strDirection = objPunchButtonState.strDirection;
    setStrPunchSuccessMessage("");
    punch(strDirection)
      .then(() => {
        setStrPunchSuccessMessage(
          strDirection === "out" ? t("punch_out_success", "Punched out successfully.") : t("punch_in_success", "Punched in successfully.")
        );
        const strToday = getTodayIsoDate();
        return loadAttendance(strToday, strToday, strToday);
      })
      .catch(() => undefined);
  }, [objAttendanceOverview, objPunchButtonState.strDirection, punch, loadAttendance, t]);

  useEffect(() => {
    if (!strPunchSuccessMessage) {
      return;
    }
    const intTimerID = window.setTimeout(() => setStrPunchSuccessMessage(""), 5000);
    return () => window.clearTimeout(intTimerID);
  }, [strPunchSuccessMessage]);

  useEffect(() => {
    let blnMounted = true;
    if (!intCurrentEmployeeID) {
      return () => {
        blnMounted = false;
      };
    }
    const intEmployeeID = intCurrentEmployeeID;

    async function loadEssProfileReferenceData() {
      try {
        const [dicEmployee, dicOptions, lstProfileDetails] = await Promise.all([
          employeeService.getEmployeeById(intEmployeeID),
          employeeService.getFormOptions(),
          Promise.allSettled([
            employeeService.getEmployeeAddress(intEmployeeID),
            employeeService.getEmployeeBankAccount(intEmployeeID),
            employeeService.getEmployeeStatutory(intEmployeeID),
            employeeSalaryService.getEmployeeSalarySummary(intEmployeeID),
            leaveService.getMyBalances(),
            leaveService.listMyApplications(),
          ]),
        ]);

        if (!blnMounted) {
          return;
        }

        setObjEmployeeProfile(dicEmployee);
        setObjEmployeeOptions(dicOptions);

        if (lstProfileDetails[0].status === "fulfilled") {
          setObjEmployeeAddress(lstProfileDetails[0].value);
        }

        if (lstProfileDetails[1].status === "fulfilled") {
          setObjEmployeeBank(lstProfileDetails[1].value);
        }

        if (lstProfileDetails[2].status === "fulfilled") {
          setObjEmployeeStatutory(lstProfileDetails[2].value);
        }

        if (lstProfileDetails[3].status === "fulfilled") {
          setObjEmployeeSalarySummary(lstProfileDetails[3].value);
        }

        if (lstProfileDetails[4].status === "fulfilled") {
          setLstEssLeaveBalances(lstProfileDetails[4].value);
        }

        if (lstProfileDetails[5].status === "fulfilled") {
          setLstEssLeaveApplications(lstProfileDetails[5].value);
        }
      } catch {
        if (!blnMounted) {
          return;
        }
      }
    }

    loadEssProfileReferenceData().catch(() => undefined);
    return () => {
      blnMounted = false;
    };
  }, [intCurrentEmployeeID]);

  const strContextEmployeeName = String(
    objEmployeeProfile?.strFullName
    || objUserContext.objEmployee?.strFullName
    || objUserContext.objUser.strLoginName
    || objUserContext.objUser.strEmailAddress
    || ""
  ).trim();
  const strContextEmployeeNameForGreeting = String(objWelcome.strEmployeeName || strContextEmployeeName || "").trim();
  const strEmployeeName = strContextEmployeeNameForGreeting || "Employee";
  const strAvatarUrl = objUserContext.strAvatarUrl || objUserContext.objEmployee?.strProfilePhotoUrl || "";
  const strAuthenticatedAvatarUrl = useAuthenticatedAvatar(strAvatarUrl);
  const strJoinedOn = objEmployeeProfile?.dtDateOfJoining
    ? formatDateLabel(String(objEmployeeProfile.dtDateOfJoining), t)
    : objWelcome.strJoinedOn
      ? formatDateLabel(String(objWelcome.strJoinedOn), t)
      : t("not_available", "Not available");
  const strDesignation = String(objWelcome.strDesignationName || "Employee");
  const strDepartment = objEmployeeProfile
    ? resolveEmployeeLookupLabel(objEmployeeOptions?.lstDepartments, objEmployeeProfile.intDepartmentID, "-")
    : String(objWelcome.strDepartmentName || "-");
  const strLocation = objEmployeeProfile
    ? resolveEmployeeLookupLabel(objEmployeeOptions?.lstLocations, objEmployeeProfile.intLocationID, "-")
    : String(objWelcome.strLocationName || "-");
  const strEmployeeCode = String(objEmployeeProfile?.strEmployeeCode || objWelcome.strEmployeeCode || objUserContext.objEmployee?.strEmployeeCode || "-");
  const strReportingManager = objEmployeeProfile
    ? resolveEmployeeLookupLabel(objEmployeeOptions?.lstManagers, objEmployeeProfile.intManagerEmployeeID, t("not_assigned", "Not assigned"))
    : String(objWelcome.strReportingManager || t("not_assigned", "Not assigned"));
  const strWorkEmail = String(objEmployeeProfile?.strWorkEmail || objWelcome.strWorkEmail || objUserContext.objUser.strEmailAddress || "-");
  const strEmploymentType = objEmployeeProfile
    ? resolveEmployeeLookupLabel(objEmployeeOptions?.lstEmploymentTypes, objEmployeeProfile.intEmploymentTypeID, "-")
    : String(objWelcome.strEmploymentType || "-");
  const lstComplianceChecks = lstComplianceChecksPayload;
  const objProfileCompleteness = calculateEssProfileCompleteness({
    objEmployeeProfile,
    objAddress: objEmployeeAddress,
    objBank: objEmployeeBank,
    objStatutory: objEmployeeStatutory,
    objWelcomePayload: objWelcome,
    objUserContext,
    strAvatarUrl,
    objProfilePayload: objProfile,
    lstComplianceChecks,
  });
  const intProfileCompletionPercent = objProfileCompleteness.intPercent;
  const lstProfileChartPoints = ((objProfile.lstPoints as ChartPoint[]) || []);
  const lstReimbursementStats = ((((objReimbursementWidget?.objPayload as { lstStats?: SummaryStat[] } | undefined)?.lstStats) || []) as SummaryStat[]);
  const intTotalClaims = Number(lstReimbursementStats.find((objStat) => objStat.strLabel.toLowerCase().includes("total claims"))?.intValue || 0);
  const intApprovedClaims = Number(lstReimbursementStats.find((objStat) => objStat.strLabel.toLowerCase().includes("approved"))?.intValue || 0);
  const decTotalClaimAmount = Number(lstReimbursementStats.find((objStat) => objStat.strLabel.toLowerCase().includes("total amount"))?.decValue || 0);
  const decApprovedClaimAmount = Number(lstReimbursementStats.find((objStat) => objStat.strLabel.toLowerCase().includes("approved amount"))?.decValue || 0);
  const decPaidClaimAmount = Number(lstReimbursementStats.find((objStat) => objStat.strLabel.toLowerCase().includes("paid amount"))?.decValue || 0);
  const strItStatus = String((objItWidget?.objPayload as Record<string, unknown> | undefined)?.strStatus || "not started");
  const intProofPendingCount = Number((objItWidget?.objPayload as Record<string, unknown> | undefined)?.intProofPendingCount || 0);
  const strItSubmittedOn = (objItWidget?.objPayload as Record<string, unknown> | undefined)?.dtSubmittedOn
    || (objItWidget?.objPayload as Record<string, unknown> | undefined)?.strSubmittedOn;
  const strItDeclarationType = String((objItWidget?.objPayload as Record<string, unknown> | undefined)?.strDeclarationType || "");
  const decItApprovedAmount = Number((objItWidget?.objPayload as Record<string, unknown> | undefined)?.decApprovedAmount || 0);
  const decItProofPendingAmount = Number((objItWidget?.objPayload as Record<string, unknown> | undefined)?.decProofPendingAmount || 0);
  const strItDueDate = String((objItWidget?.objPayload as Record<string, unknown> | undefined)?.strSubmissionDueDate || "");
  const strLatestClaimStatus = String((objReimbursementWidget?.objPayload as Record<string, unknown> | undefined)?.strLatestClaimStatus || "").trim();
  const strPayslipNumber = String(objPay.strPayslipNumber || "").trim();
  const decSalaryGrossMonthly = Number(objEmployeeSalarySummary?.objCurrentSalarySnapshot?.decGrossMonthly || 0);
  const blnHasPayrollResult = Number(objPay.decValue || 0) > 0 || Boolean(strPayslipNumber) || lstPayslips.length > 0;
  const decGrossEarnings = blnHasPayrollResult && Number(objPay.decGrossEarnings || 0) > 0 ? Number(objPay.decGrossEarnings || 0) : decSalaryGrossMonthly;
  const decNetPay = blnHasPayrollResult && Number(objPay.decValue || 0) > 0 ? Number(objPay.decValue || 0) : decSalaryGrossMonthly;
  const decTotalDeductions = Number(objPay.decTotalDeductions || 0) > 0
    ? Number(objPay.decTotalDeductions || 0)
    : Math.max(decGrossEarnings - decNetPay, 0);
  const strCurrentMonthPaySubtitle = translateDashboardText(String(
    objPay.strSubtitle
    || objEmployeeSalarySummary?.objCurrentSalarySnapshot?.dtEffectiveFrom
    || "Current Month"
  ), t);
  const strCurrentMonthPayslipHref = resolveCurrentMonthPayslipHref(lstPayslips, blnHasPayrollResult);
  const strCurrentMonthPayTitle = blnHasPayrollResult ? t("current_month_pay", "Current Month Pay") : t("salary_estimate", "Salary Estimate");
  const strDashboardTitle = t("ess_dashboard_heading", "Dashboard");
  const strDashboardSubtitle = t("welcome_back", "Welcome back");
  const lstTopNav = [
    { strLabel: t("my_profile", "My Profile"), strRoutePath: ESS_SHORTCUT_ROUTES.myProfile, objIcon: <ManageAccountsRoundedIcon sx={{ fontSize: 18 }} /> },
    { strLabel: t("my_attendance", "My Attendance"), strRoutePath: ESS_SHORTCUT_ROUTES.myAttendance, objIcon: <AccessTimeRoundedIcon sx={{ fontSize: 18 }} /> },
    { strLabel: t("apply_leave", "Apply Leave"), strRoutePath: ESS_SHORTCUT_ROUTES.applyLeave, objIcon: <EventAvailableRoundedIcon sx={{ fontSize: 18 }} /> },
    { strLabel: t("my_compensation", "My Compensation"), strRoutePath: ESS_SHORTCUT_ROUTES.myCompensation, objIcon: <PaymentsRoundedIcon sx={{ fontSize: 18 }} /> },
    { strLabel: t("my_payslips", "My Pay Slips"), strRoutePath: ESS_SHORTCUT_ROUTES.myPayslips, objIcon: <ReceiptLongRoundedIcon sx={{ fontSize: 18 }} /> },
    { strLabel: t("it_declaration", "IT Declaration"), strRoutePath: ESS_SHORTCUT_ROUTES.itDeclaration, objIcon: <DescriptionRoundedIcon sx={{ fontSize: 18 }} /> },
    { strLabel: t("flexi_pay_declaration", "Flexi Pay"), strRoutePath: ESS_SHORTCUT_ROUTES.flexiPay, objIcon: <AssignmentTurnedInRoundedIcon sx={{ fontSize: 18 }} /> },
    { strLabel: t("reimbursements", "Reimbursements"), strRoutePath: ESS_SHORTCUT_ROUTES.reimbursements, objIcon: <AccountBalanceWalletRoundedIcon sx={{ fontSize: 18 }} /> },
  ];
  const lstVisibleTopNav = lstTopNav.slice(0, 6);
  const lstOverflowTopNav = lstTopNav.slice(6);
  const lstHeroDetails = [
    { strLabel: t("reporting_manager", "Reporting Manager"), strValue: strReportingManager, objIcon: <PeopleAltRoundedIcon sx={{ fontSize: 18 }} /> },
    { strLabel: t("work_email", "Work Email"), strValue: strWorkEmail, objIcon: <ArticleRoundedIcon sx={{ fontSize: 18 }} /> },
    { strLabel: t("employment_type", "Employment Type"), strValue: strEmploymentType, objIcon: <AssignmentTurnedInRoundedIcon sx={{ fontSize: 18 }} /> },
    { strLabel: t("joined_on", "Joined On"), strValue: strJoinedOn, objIcon: <CalendarTodayRoundedIcon sx={{ fontSize: 18 }} /> },
  ];
  const objAttendance = (objAttendanceWidget?.objPayload || {}) as Record<string, unknown>;
  const objLeave = (objLeaveWidget?.objPayload || {}) as Record<string, unknown>;
  const objLiveAttendanceDay = objAttendanceOverview?.dtDate === getTodayIsoDate() ? objAttendanceOverview.objDay : null;
  const strAttendanceTodayStatus = String(objLiveAttendanceDay?.strStatus || objAttendance.strTodayStatus || "Not Marked");
  const strAttendancePunchIn = objLiveAttendanceDay?.strFirstIn
    ? String(objLiveAttendanceDay.strFirstIn).slice(0, 5)
    : objAttendance.strPunchIn ? String(objAttendance.strPunchIn).slice(0, 5) : "-";
  const strAttendancePunchOut = objLiveAttendanceDay?.strLastOut
    ? String(objLiveAttendanceDay.strLastOut).slice(0, 5)
    : objAttendance.strPunchOut ? String(objAttendance.strPunchOut).slice(0, 5) : "-";
  const strAttendanceWorkingHours = objLiveAttendanceDay && Number.isFinite(objLiveAttendanceDay.decWorkedHours)
    ? `${objLiveAttendanceDay.decWorkedHours} hrs`
    : objAttendance.strWorkingHours ? `${objAttendance.strWorkingHours} hrs` : "-";
  const decLiveLeaveBalance = lstEssLeaveBalances.reduce((decTotal, objBalance) => decTotal + Number(objBalance.decAvailable || 0), 0);
  const decLiveUsedLeave = lstEssLeaveBalances.reduce((decTotal, objBalance) => decTotal + Number(objBalance.decAvailed || 0), 0);
  const blnHasLiveLeaveBalances = lstEssLeaveBalances.length > 0;
  const decLeaveBalance = blnHasLiveLeaveBalances ? decLiveLeaveBalance : Number(objLeave.decLeaveBalance || 0);
  const decUsedLeave = blnHasLiveLeaveBalances ? decLiveUsedLeave : Number(objLeave.decUsedLeave || objLeave.decAvailedLeave || 0);
  const intPendingLeaveRequests = lstEssLeaveApplications.length
    ? lstEssLeaveApplications.filter((objApplication) => String(objApplication.strStatus || "").toLowerCase() === "pending").length
    : Number(objLeave.intPendingLeaveRequests || 0);
  const objUpcomingLeaveApplication = getUpcomingEssLeaveApplication(lstEssLeaveApplications);
  const strUpcomingLeave = objUpcomingLeaveApplication
    ? formatEssLeaveApplicationLabel(objUpcomingLeaveApplication, t)
    : String(objLeave.strUpcomingLeave || "");
  const strNextHoliday = String(objLeave.strNextHoliday || "");

  return (
    <Stack spacing={2} sx={{ p: { xs: 1, md: 1.5 } }}>
      <Box className="pageBanner" sx={{ display: "block", p: { xs: 1.5, md: 2 }, borderRadius: "28px", boxShadow: "0 14px 32px rgba(120, 144, 186, 0.16)" }}>
        <Box className="bannerDots" />
        <Stack direction="row" justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={1.5} sx={{ mb: 1.8, position: "relative", zIndex: 1 }}>
          <Box>
            <Typography sx={{ color: "#ffffff", fontWeight: 800, fontSize: { xs: "1.65rem", md: "2rem" }, letterSpacing: "-0.03em" }}>
              {strDashboardTitle}
            </Typography>
            <Typography sx={{ mt: 0.35, color: "rgba(241,245,249,0.92)", fontSize: "1rem", fontWeight: 600 }}>
              {strDashboardSubtitle}
            </Typography>
          </Box>
        </Stack>

        <Stack
          direction="row"
          spacing={{ xs: 0.6, sm: 1 }}
          alignItems="center"
          justifyContent="flex-end"
          sx={{
            flexWrap: "nowrap",
            overflow: "hidden",
            p: 0.7,
            borderRadius: "22px",
            backgroundColor: "rgba(255,255,255,0.35)",
            border: "1px solid rgba(255,255,255,0.35)",
            position: "relative",
            zIndex: 1,
            width: "fit-content",
            maxWidth: "100%",
            ml: "auto",
          }}
        >
          {lstVisibleTopNav.map((objItem) => (
            <Link key={objItem.strLabel} href={objItem.strRoutePath} style={{ textDecoration: "none", flexShrink: 0 }}>
              <Stack
                direction="row"
                spacing={0.6}
                alignItems="center"
                sx={{
                  px: { xs: 1, sm: 1.45 },
                  py: { xs: 0.7, sm: 1.05 },
                  borderRadius: "14px",
                  backgroundColor: "#FFFFFF",
                  color: ESS_COLORS.shellText,
                  minHeight: { xs: 40, sm: 48 },
                  whiteSpace: "nowrap",
                  boxShadow: "0 6px 14px rgba(20, 40, 90, 0.08)",
                  "&:hover": { backgroundColor: "#F3F6FF" },
                }}
              >
                {objItem.objIcon}
                <Typography sx={{ fontWeight: 700, fontSize: { xs: "0.72rem", sm: "0.88rem" }, whiteSpace: "nowrap" }}>{objItem.strLabel}</Typography>
              </Stack>
            </Link>
          ))}
          {lstOverflowTopNav.length ? (
            <>
              <IconButton
                aria-label={t("more_shortcuts", "More shortcuts")}
                onClick={(objEvent) => setObjMoreShortcutsAnchor(objEvent.currentTarget)}
                sx={{
                  flexShrink: 0,
                  color: ESS_COLORS.shellText,
                  backgroundColor: "rgba(255,255,255,0.6)",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.85)" },
                }}
              >
                <MoreHorizRoundedIcon />
              </IconButton>
              <Menu
                anchorEl={objMoreShortcutsAnchor}
                open={Boolean(objMoreShortcutsAnchor)}
                onClose={() => setObjMoreShortcutsAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                {lstOverflowTopNav.map((objItem) => (
                  <MenuItem
                    key={objItem.strLabel}
                    component={Link}
                    href={objItem.strRoutePath}
                    onClick={() => setObjMoreShortcutsAnchor(null)}
                  >
                    <Stack direction="row" spacing={1.2} alignItems="center">
                      {objItem.objIcon}
                      <Typography sx={{ fontWeight: 600, fontSize: "0.88rem" }}>{objItem.strLabel}</Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Menu>
            </>
          ) : null}
        </Stack>
      </Box>

      {/* Row 1: Profile Completeness, Profile & Compliance Health, Attendance Today */}
      <Grid container spacing={1.5} alignItems="stretch" sx={{ mx: 0, width: "100%" }}>
        <Grid item xs={12} lg={6} sx={{ display: "flex" }}>
          <Paper
            sx={{
              ...objWhiteCardSx,
              p: 0,
              overflow: "hidden",
              background: ESS_COLORS.hero,
              position: "relative",
              border: "1px solid #D7E4F2",
              borderRadius: "28px",
              boxShadow: "0 4px 14px rgba(29, 93, 150, 0.08)",
            }}
          >
            <Box sx={{ position: "absolute", inset: 0, background: ESS_COLORS.heroGlow, pointerEvents: "none" }} />
            <Box sx={{ p: { xs: 1.6, md: 2.1 }, position: "relative", zIndex: 1 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.6} alignItems={{ xs: "flex-start", sm: "center" }}>
                <Box sx={{ position: "relative" }}>
                  <Avatar src={strAuthenticatedAvatarUrl || undefined} sx={{ width: 88, height: 88, border: "3px solid rgba(255,255,255,0.92)", boxShadow: "0 14px 30px rgba(146, 163, 196, 0.2)" }}>{getInitials(strEmployeeName)}</Avatar>
                  <Box sx={{ position: "absolute", right: 2, bottom: 2, width: 16, height: 16, borderRadius: "50%", backgroundColor: "#22C55E", border: "2px solid white" }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }} useFlexGap>
                    <Typography sx={{ color: ESS_COLORS.navy, fontWeight: 800, fontSize: { xs: "1.7rem", md: "2rem" }, letterSpacing: "-0.02em" }}>{strEmployeeName}</Typography>
                    <Chip label={strDesignation} size="small" sx={{ backgroundColor: "#DDE8FF", color: ESS_COLORS.blue, fontWeight: 700 }} />
                  </Stack>
                  <Grid container spacing={1.3} sx={{ mt: 1.05, mx: 0, width: "100%" }}>
                    <Grid item xs={12} sm={4}>
                      <HeroStat strLabel={t("emp_code", "Emp Code")} strValue={strEmployeeCode} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <HeroStat strLabel={t("department", "Department")} strValue={strDepartment} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <HeroStat strLabel={t("location", "Location")} strValue={strLocation} />
                    </Grid>
                  </Grid>
                </Box>
              </Stack>

              <Grid container spacing={1.15} sx={{ mt: 1.6 }}>
                {lstHeroDetails.map((objItem) => (
                  <Grid key={objItem.strLabel} item xs={12} sm={6} md={3} sx={{ minWidth: 0 }}>
                    <Box sx={{ p: 1.15, minHeight: 84, borderRadius: "14px", backgroundColor: "rgba(255,255,255,0.5)", border: "1px solid rgba(208, 222, 245, 0.9)" }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: "10px", backgroundColor: "#E5EEFF", color: ESS_COLORS.blue, display: "grid", placeItems: "center", flexShrink: 0 }}>
                          {objItem.objIcon}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ color: "#6C7EA5", fontSize: "0.7rem" }}>{objItem.strLabel}</Typography>
                          <Typography
                            sx={{
                              color: ESS_COLORS.navy,
                              fontWeight: 700,
                              fontSize: "0.84rem",
                              lineHeight: 1.35,
                              minWidth: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={objItem.strValue}
                          >
                            {objItem.strValue}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.1} alignItems={{ xs: "stretch", sm: "center" }} sx={{ mt: 1.6 }}>
                <Typography sx={{ color: ESS_COLORS.navy, fontWeight: 700, minWidth: 150 }}>{t("profile_completeness", "Profile Completeness")}</Typography>
                <Box
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={intProfileCompletionPercent}
                  title={`${objProfileCompleteness.intCompletedCount}/${objProfileCompleteness.intTotalCount} ${t("profile_checks_complete", "profile checks complete")}`}
                  sx={{ flex: 1, height: 10, borderRadius: "999px", backgroundColor: "rgba(214, 226, 248, 0.9)", overflow: "hidden" }}
                >
                  <Box sx={{ width: `${intProfileCompletionPercent}%`, height: "100%", background: "linear-gradient(90deg, #285CFF 0%, #16A34A 100%)", transition: "width 360ms ease" }} />
                </Box>
                <Typography sx={{ color: ESS_COLORS.navy, fontWeight: 700 }}>{`${intProfileCompletionPercent}% ${t("complete", "Complete")}`}</Typography>
                <Link href="/ess/my-profile" style={{ textDecoration: "none" }}>
                  <Button variant="outlined" endIcon={<ArrowForwardRoundedIcon />} sx={{ color: ESS_COLORS.blue, borderColor: "#C7D9F8", backgroundColor: "rgba(255,255,255,0.72)", borderRadius: "14px", px: 2.1, textTransform: "none", fontWeight: 700 }}>
                    {t("improve_profile", "Improve Profile")}
                  </Button>
                </Link>
              </Stack>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6} lg={3} sx={{ display: "flex" }}>
          <Paper sx={{ ...objWhiteCardSx, p: 1.6 }}>
            <SectionHeader strTitle={t("profile_compliance_health", "Profile & Compliance Health")} strTone="green" objIcon={<ManageAccountsRoundedIcon sx={{ fontSize: 16 }} />} blnCompact />
            <Stack spacing={0.6} sx={{ mt: 1 }}>
              {lstComplianceChecks.length ? lstComplianceChecks.map((objCheck) => {
                const strComplianceLabel = translateDashboardText(objCheck.strLabel, t, objCheck.strLabel);
                const strComplianceHref = resolveComplianceCheckHref(objCheck.strCode, intCurrentEmployeeID) || ESS_SHORTCUT_ROUTES.myProfile;
                return (
                  <Link
                    key={objCheck.strCode}
                    href={strComplianceHref}
                    aria-label={`${strComplianceLabel} - ${objCheck.blnComplete ? t("verified", "Verified") : t("pending", "Pending")}. ${t("tap_to_update", "Tap to update")}`}
                    style={{ textDecoration: "none" }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      spacing={1}
                      sx={{
                        px: 1,
                        py: 0.55,
                        borderRadius: "10px",
                        border: `1px solid ${ESS_COLORS.border}`,
                        backgroundColor: "#FFFFFF",
                        cursor: "pointer",
                        transition: "background-color 120ms ease, border-color 120ms ease",
                        "&:hover": { backgroundColor: ESS_COLORS.softBlue, borderColor: ESS_COLORS.blue },
                        "&:focus-visible": { outline: `2px solid ${ESS_COLORS.blue}`, outlineOffset: "2px" },
                      }}
                    >
                      <Typography noWrap sx={{ color: ESS_COLORS.navy, fontWeight: 700, fontSize: "0.74rem" }}>{strComplianceLabel}</Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip size="small" label={objCheck.blnComplete ? t("verified", "Verified") : t("pending", "Pending")} sx={{ height: 20, fontSize: "0.62rem", backgroundColor: objCheck.blnComplete ? ESS_COLORS.softGreen : ESS_COLORS.softOrange, color: objCheck.blnComplete ? ESS_COLORS.green : ESS_COLORS.orange, fontWeight: 700 }} />
                        <ArrowForwardRoundedIcon sx={{ fontSize: 14, color: ESS_COLORS.muted }} />
                      </Stack>
                    </Stack>
                  </Link>
                );
              }) : <Typography sx={{ color: ESS_COLORS.muted, fontSize: "0.8rem" }}>{t("no_compliance_data_available", "No compliance data available.")}</Typography>}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6} lg={3} sx={{ display: "flex" }}>
          <Paper sx={{ ...objWhiteCardSx, p: 1.6 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <SectionHeader strTitle={t("attendance_today", "Attendance Today")} strTone="blue" objIcon={<AccessTimeRoundedIcon sx={{ fontSize: 16 }} />} blnCompact />
            </Stack>
            <Chip size="small" label={resolveStatusLabel(strAttendanceTodayStatus, t)} sx={{ mt: 0.5, mb: 1, backgroundColor: ESS_COLORS.softBlue, color: ESS_COLORS.blue, fontWeight: 700 }} />
            <Grid container spacing={0} sx={{ borderTop: "1px solid #E6ECF8", borderLeft: "1px solid #E6ECF8" }}>
              {[
                { strLabel: t("punch_in", "Punch In"), strValue: strAttendancePunchIn },
                { strLabel: t("punch_out", "Punch Out"), strValue: strAttendancePunchOut },
              ].map((objItem, intIndex) => (
                <Grid item xs={blnIsRegularizationApprover ? 4 : 6} key={`${objItem.strLabel}-${intIndex}`}>
                  <Box sx={{ minHeight: 74, p: 1.05, borderRight: "1px solid #E6ECF8", borderBottom: "1px solid #E6ECF8" }}>
                    <Typography sx={{ color: "#6B7280", fontSize: "0.74rem", fontWeight: 700 }}>{objItem.strLabel}</Typography>
                    <Typography sx={{ mt: 0.32, color: "#172554", fontSize: "1rem", fontWeight: 800, lineHeight: 1.3 }}>{objItem.strValue}</Typography>
                  </Box>
                </Grid>
              ))}
              {blnIsRegularizationApprover ? (
                <Grid item xs={4}>
                  <PendingApprovalMetricCell
                    strLabel={t("pending_approvals", "Pending Approvals")}
                    intCount={intPendingRegularizationApprovals}
                    strHref="/ess/attendance/regularization/approvals"
                    strTooltip={t(
                      "pending_regularization_approvals_tooltip",
                      `${intPendingRegularizationApprovals} attendance regularization request(s) awaiting your approval`
                    )}
                    strAccentColor={ESS_COLORS.orange}
                    strAccentBg={ESS_COLORS.softOrange}
                  />
                </Grid>
              ) : null}
              <Grid item xs={6}>
                <Box sx={{ minHeight: 74, p: 1.05, borderRight: "1px solid #E6ECF8", borderBottom: "1px solid #E6ECF8" }}>
                  <Typography sx={{ color: "#6B7280", fontSize: "0.74rem", fontWeight: 700 }}>{t("working_hours", "Working Hours")}</Typography>
                  <Typography sx={{ mt: 0.32, color: "#172554", fontSize: "1rem", fontWeight: 800, lineHeight: 1.3 }}>{strAttendanceWorkingHours}</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Stack sx={{ minHeight: 74, p: 1.05, borderRight: "1px solid #E6ECF8", borderBottom: "1px solid #E6ECF8" }} justifyContent="center" alignItems="flex-start">
                  <Button
                    data-control-id="ess.dashboard.punch.button"
                    variant="contained"
                    size="small"
                    onClick={handlePunch}
                    disabled={objPunchButtonState.blnDisabled}
                    startIcon={<FingerprintRoundedIcon sx={{ fontSize: 18 }} />}
                    sx={{
                      borderRadius: "12px",
                      px: 1.6,
                      textTransform: "none",
                      fontWeight: 700,
                      fontSize: "0.76rem",
                      backgroundColor: objPunchButtonState.strDirection === "out" ? ESS_COLORS.orange : ESS_COLORS.blue,
                    }}
                  >
                    {blnPunching
                      ? t("punching", "Punching...")
                      : blnAttendanceOverviewLoading && !objAttendanceOverview
                        ? t("loading", "Loading...")
                        : objPunchButtonState.strDirection === "out"
                          ? t("punch_out", "Punch Out")
                          : t("punch_in", "Punch In")}
                  </Button>
                </Stack>
              </Grid>
            </Grid>
            {strPunchError ? (
              <Typography sx={{ mt: 0.5, color: ESS_COLORS.red, fontSize: "0.68rem" }}>{strPunchError}</Typography>
            ) : strPunchSuccessMessage ? (
              <Typography sx={{ mt: 0.5, color: ESS_COLORS.green, fontSize: "0.68rem", fontWeight: 700 }}>{strPunchSuccessMessage}</Typography>
            ) : objAttendanceOverview && !objAttendanceOverview.blnCanPunch ? (
              <Typography sx={{ mt: 0.5, color: ESS_COLORS.muted, fontSize: "0.68rem" }}>
                {t(
                  `unavailable_${objAttendanceOverview.strUnavailableReasonCode ?? "unknown"}`,
                  objAttendanceOverview.strUnavailableReasonCode === "ATTENDANCE_POLICY_NOT_FOUND"
                    ? "No attendance policy applies today."
                    : "Attendance punching is unavailable today."
                )}
              </Typography>
            ) : null}
            <FooterLink strHref="/ess/attendance" strLabel={t("view_attendance", "View Attendance")} strColor={ESS_COLORS.blue} />
          </Paper>
        </Grid>
      </Grid>

      {/* Row 2: IT Declaration, Reimbursement Summary, Current Month Pay, Leave Balance */}
      <Grid container spacing={1.5} alignItems="stretch" sx={{ mx: 0, width: "100%" }}>
        <Grid item xs={12} sm={6} lg={3} sx={{ display: "flex" }}>
          <Paper sx={{ ...objWhiteCardSx, p: 1.6 }}>
            <SectionHeader strTitle={`${t("it_declaration", "IT Declaration")}${String((objItWidget?.objPayload as Record<string, unknown> | undefined)?.strFinancialYearCode || "").trim() ? ` (${String((objItWidget?.objPayload as Record<string, unknown> | undefined)?.strFinancialYearCode || "").trim()})` : ""}`} strTone="blue" objIcon={<DescriptionRoundedIcon sx={{ fontSize: 16 }} />} blnCompact />
            <Chip size="small" label={resolveStatusLabel(strItStatus, t)} sx={{ mt: 0.5, mb: 1, backgroundColor: ESS_COLORS.softOrange, color: ESS_COLORS.orange, fontWeight: 700 }} />
            <TwoColMetricGrid lstItems={[
              { strLabel: t("tax_regime", "Tax Regime"), strValue: strItDeclarationType || "-" },
              { strLabel: t("declared_amount", "Declared Amount"), strValue: formatCurrency(Number((objItWidget?.objPayload as Record<string, unknown> | undefined)?.decDeclaredAmount || 0)) },
              { strLabel: t("approved_amount", "Approved Amount"), strValue: formatCurrency(decItApprovedAmount) },
              { strLabel: t("proof_pending", "Proof Pending"), strValue: formatCurrency(decItProofPendingAmount) },
            ]} />
            <Typography sx={{ mt: 1, color: ESS_COLORS.red, fontWeight: 800, fontSize: "0.8rem" }}>{strItDueDate ? formatDateLabel(strItDueDate, t) : "-"}</Typography>
            <FooterLink strHref="/salary/it-declaration" strLabel={t("view_details", "View Details")} strColor={ESS_COLORS.blue} />
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} lg={3} sx={{ display: "flex" }}>
          <Paper sx={{ ...objWhiteCardSx, p: 1.6 }}>
            <SectionHeader strTitle={t("reimbursement_summary", "Reimbursement Summary")} strTone="green" objIcon={<AccountBalanceWalletRoundedIcon sx={{ fontSize: 16 }} />} blnCompact />
            <TwoColMetricGrid lstItems={[
              { strLabel: t("total_claims", "Total Claims"), strValue: formatInteger(intTotalClaims) },
              { strLabel: t("approved_claims", "Approved Claims"), strValue: formatInteger(intApprovedClaims) },
              { strLabel: t("submitted_amount", "Submitted Amount"), strValue: formatCurrency(decTotalClaimAmount) },
              { strLabel: t("approved_amount", "Approved Amount"), strValue: formatCurrency(decApprovedClaimAmount) },
              { strLabel: t("paid_amount", "Paid Amount"), strValue: formatCurrency(decPaidClaimAmount) },
              { strLabel: t("latest_status", "Latest Status"), strValue: strLatestClaimStatus ? resolveStatusLabel(strLatestClaimStatus, t) : "-" },
            ]} />
            <FooterLink strHref="/ess/reimbursements" strLabel={t("view_my_claims", "View My Claims")} strColor={ESS_COLORS.green} />
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} lg={3} sx={{ display: "flex" }}>
          <Paper sx={{ ...objWhiteCardSx, p: 1.6 }}>
            <Stack direction="row" justifyContent="space-between" spacing={1}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: ESS_COLORS.navy, fontWeight: 800, fontSize: "1.05rem" }}>{strCurrentMonthPayTitle}</Typography>
                <Typography sx={{ mt: 0.6, fontSize: "1.7rem", fontWeight: 900, color: ESS_COLORS.navy, lineHeight: 1.1 }}>{formatCurrency(decNetPay)}</Typography>
                <Typography sx={{ mt: 0.2, color: ESS_COLORS.body, fontWeight: 600, fontSize: "0.76rem" }}>{strCurrentMonthPaySubtitle}</Typography>
              </Box>
              <Box sx={{ width: 40, height: 40, borderRadius: "12px", backgroundColor: ESS_COLORS.softBlue, display: "grid", placeItems: "center", color: ESS_COLORS.blue, flexShrink: 0 }}>
                <AccountBalanceWalletRoundedIcon sx={{ fontSize: 20 }} />
              </Box>
            </Stack>
            <Grid container spacing={0} sx={{ mt: 1.3, borderTop: `1px solid ${ESS_COLORS.border}`, borderBottom: `1px solid ${ESS_COLORS.border}` }}>
              <Grid item xs={4}><MiniMetricBox strLabel={t("gross_earnings", "Gross Earnings")} strValue={formatCurrency(decGrossEarnings)} /></Grid>
              <Grid item xs={4}><MiniMetricBox strLabel={t("total_deductions", "Total Deductions")} strValue={formatCurrency(decTotalDeductions)} blnBorder /></Grid>
              <Grid item xs={4}><MiniMetricBox strLabel={t("net_pay", "Net Pay")} strValue={formatCurrency(decNetPay)} /></Grid>
            </Grid>
            <Stack spacing={1} sx={{ mt: 1.1 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: ESS_COLORS.muted, fontSize: "0.7rem", fontWeight: 700 }}>{t("latest_payslip", "Latest Payslip")}</Typography>
                <Typography noWrap sx={{ color: ESS_COLORS.navy, fontWeight: 700, fontSize: "0.78rem" }}>
                  {blnHasPayrollResult ? `${strCurrentMonthPaySubtitle}${strPayslipNumber ? ` | ${strPayslipNumber}` : ""}` : t("payslip_available_after_release", "Payslip will be available after payroll release.")}
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                {blnHasPayrollResult ? (
                  <Link href="/ess/my-payslips" style={{ textDecoration: "none" }}>
                    <Button startIcon={<DownloadRoundedIcon sx={{ fontSize: 16 }} />} variant="contained" size="small" sx={{ borderRadius: "12px", px: 1.6, backgroundColor: ESS_COLORS.blue, textTransform: "none", fontWeight: 700, fontSize: "0.76rem" }}>
                      {t("download_payslip", "Download Payslip")}
                    </Button>
                  </Link>
                ) : null}
                {strCurrentMonthPayslipHref ? (
                  <Link href={strCurrentMonthPayslipHref} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                    <Button
                      data-control-id="ess.dashboard.view-payslip.button"
                      startIcon={<VisibilityRoundedIcon sx={{ fontSize: 16 }} />}
                      variant="outlined"
                      size="small"
                      sx={{ borderRadius: "12px", px: 1.6, color: ESS_COLORS.blue, borderColor: "#C7D9F8", textTransform: "none", fontWeight: 700, fontSize: "0.76rem" }}
                    >
                      {t("view_payslip_action", "View Payslip")}
                    </Button>
                  </Link>
                ) : (
                  <Tooltip title={t("payslip_not_available", "Payslip not available yet for this month.")}>
                    <span>
                      <Button
                        disabled
                        startIcon={<VisibilityRoundedIcon sx={{ fontSize: 16 }} />}
                        variant="outlined"
                        size="small"
                        sx={{ borderRadius: "12px", px: 1.6, textTransform: "none", fontWeight: 700, fontSize: "0.76rem" }}
                      >
                        {t("view_payslip_action", "View Payslip")}
                      </Button>
                    </span>
                  </Tooltip>
                )}
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} lg={3} sx={{ display: "flex" }}>
          <Paper sx={{ ...objWhiteCardSx, p: 1.6 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <SectionHeader strTitle={t("leave_balance", "Leave Balance")} strTone="green" objIcon={<EventAvailableRoundedIcon sx={{ fontSize: 16 }} />} blnCompact />
              {intPendingLeaveRequests > 0 ? (
                <Chip size="small" label={`${intPendingLeaveRequests} ${t("pending", "Pending")}`} sx={{ height: 20, fontSize: "0.62rem", backgroundColor: ESS_COLORS.softOrange, color: ESS_COLORS.orange, fontWeight: 700 }} />
              ) : null}
            </Stack>
            <Grid container spacing={0} sx={{ mt: 0.5, borderTop: "1px solid #E6ECF8", borderLeft: "1px solid #E6ECF8" }}>
              {[
                { strLabel: t("available_balance", "Available Balance"), strValue: formatLeaveBalanceMetric(decLeaveBalance) },
                { strLabel: t("used_leave", "Used Leave"), strValue: formatLeaveBalanceMetric(decUsedLeave) },
              ].map((objItem, intIndex) => (
                <Grid item xs={blnIsLeaveApprover ? 4 : 6} key={`${objItem.strLabel}-${intIndex}`}>
                  <Box sx={{ minHeight: 74, p: 1.05, borderRight: "1px solid #E6ECF8", borderBottom: "1px solid #E6ECF8" }}>
                    <Typography sx={{ color: "#6B7280", fontSize: "0.74rem", fontWeight: 700 }}>{objItem.strLabel}</Typography>
                    <Typography sx={{ mt: 0.32, color: "#172554", fontSize: "1rem", fontWeight: 800, lineHeight: 1.3 }}>{objItem.strValue}</Typography>
                  </Box>
                </Grid>
              ))}
              {blnIsLeaveApprover ? (
                <Grid item xs={4}>
                  <PendingApprovalMetricCell
                    strLabel={t("pending_approvals", "Pending Approvals")}
                    intCount={intPendingLeaveApprovals}
                    strHref="/ess/leave/approvals"
                    strTooltip={t(
                      "pending_leave_approvals_tooltip",
                      `${intPendingLeaveApprovals} leave request(s) awaiting your approval`
                    )}
                    strAccentColor={ESS_COLORS.green}
                    strAccentBg={ESS_COLORS.softGreen}
                  />
                </Grid>
              ) : null}
              {[
                { strLabel: t("upcoming_leave", "Upcoming Leave"), strValue: strUpcomingLeave || "-" },
                { strLabel: t("next_holiday", "Next Holiday"), strValue: strNextHoliday || "-" },
              ].map((objItem, intIndex) => (
                <Grid item xs={6} key={`${objItem.strLabel}-${intIndex}`}>
                  <Box sx={{ minHeight: 74, p: 1.05, borderRight: "1px solid #E6ECF8", borderBottom: "1px solid #E6ECF8" }}>
                    <Typography sx={{ color: "#6B7280", fontSize: "0.74rem", fontWeight: 700 }}>{objItem.strLabel}</Typography>
                    <Typography sx={{ mt: 0.32, color: "#172554", fontSize: "1rem", fontWeight: 800, lineHeight: 1.3 }}>{objItem.strValue}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
            <FooterLink strHref="/ess/leave-balance" strLabel={t("view_leave_balance", "View Leave Balance")} strColor={ESS_COLORS.green} />
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}

function FallbackDashboard({ objDashboard, objUserContext, t }: RoleBasedDashboardProps) {
  return (
    <Stack spacing={3}>
      <PanelShell strTitle={`${objDashboard.strDashboardType} ${t("dashboard", "Dashboard")}`}>
        <Typography sx={{ color: "#64748b" }}>
          {objUserContext.objTenant.strTenantName} | {objUserContext.objUser.strLoginName || objUserContext.objUser.strEmailAddress || t("workspace_user", "Workspace User")}
        </Typography>
        <Typography sx={{ mt: 2, color: "#475569" }}>
          {t("fallback_message", "This dashboard type is still using the foundation shell.")}
        </Typography>
      </PanelShell>
    </Stack>
  );
}

function HeroStat({ strLabel, strValue }: { strLabel: string; strValue: string }) {
  return (
    <Box>
      <Typography sx={{ color: "#6C7EA5", fontSize: "0.75rem" }}>{strLabel}</Typography>
      <Typography sx={{ mt: 0.2, color: "#22345F", fontWeight: 800, fontSize: "1rem" }}>{strValue}</Typography>
    </Box>
  );
}

function SectionHeader({
  strTitle,
  strTone,
  objIcon,
  blnCompact = false,
  sx,
}: {
  strTitle: string;
  strTone: "blue" | "green" | "orange" | "violet";
  objIcon: ReactNode;
  blnCompact?: boolean;
  sx?: Record<string, unknown>;
}) {
  const dicTone = {
    blue: { bg: "#EEF4FF", color: "#285CFF" },
    green: { bg: "#ECFDF5", color: "#16A34A" },
    orange: { bg: "#FFF7ED", color: "#F97316" },
    violet: { bg: "#F3E8FF", color: "#6D28D9" },
  }[strTone];
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={sx}>
      <Box sx={{ width: blnCompact ? 28 : 32, height: blnCompact ? 28 : 32, borderRadius: "10px", backgroundColor: dicTone.bg, color: dicTone.color, display: "grid", placeItems: "center", flexShrink: 0 }}>
        {objIcon}
      </Box>
      <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: blnCompact ? "0.98rem" : "1.05rem" }}>{strTitle}</Typography>
    </Stack>
  );
}

// Pending-approvals metric cell for line managers: sits inline with the other stat boxes
// (Punch In / Punch Out, Available Balance / Used Leave) at the same size and alignment, so
// a manager sees the count and can jump straight into the approval queue without leaving
// the dashboard. Only rendered for employees who actually hold approver rights.
function PendingApprovalMetricCell({
  strLabel,
  intCount,
  strHref,
  strTooltip,
  strAccentColor,
  strAccentBg,
}: {
  strLabel: string;
  intCount: number;
  strHref: string;
  strTooltip: string;
  strAccentColor: string;
  strAccentBg: string;
}) {
  return (
    <Box sx={{ minHeight: 74, p: 1.05, borderRight: "1px solid #E6ECF8", borderBottom: "1px solid #E6ECF8" }}>
      <Typography sx={{ color: "#6B7280", fontSize: "0.74rem", fontWeight: 700 }}>{strLabel}</Typography>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.32 }}>
        <Typography sx={{ color: intCount > 0 ? strAccentColor : "#172554", fontSize: "1rem", fontWeight: 800, lineHeight: 1.3 }}>
          {intCount > 99 ? "99+" : intCount}
        </Typography>
        <Tooltip title={strTooltip} arrow>
          <Link href={strHref} style={{ textDecoration: "none" }} aria-label={strTooltip}>
            <IconButton
              data-control-id="ess.dashboard.pending-approvals.button"
              size="small"
              sx={{
                width: 26,
                height: 26,
                backgroundColor: strAccentBg,
                color: strAccentColor,
                "&:hover": { backgroundColor: strAccentBg, opacity: 0.82 },
              }}
            >
              <ArrowForwardRoundedIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Link>
        </Tooltip>
      </Stack>
    </Box>
  );
}

function MiniMetricBox({ strLabel, strValue, blnBorder = false }: { strLabel: string; strValue: string; blnBorder?: boolean }) {
  return (
    <Box sx={{ py: 1.05, px: 1.05, borderLeft: blnBorder ? "1px solid #E6ECF8" : "none", borderRight: blnBorder ? "1px solid #E6ECF8" : "none" }}>
      <Typography sx={{ color: "#6B7280", fontSize: "0.74rem", fontWeight: 700 }}>{strLabel}</Typography>
      <Typography sx={{ mt: 0.28, color: "#172554", fontSize: "1.02rem", fontWeight: 800 }}>{strValue}</Typography>
    </Box>
  );
}

function TwoColMetricGrid({ lstItems }: { lstItems: Array<{ strLabel: string; strValue: string }> }) {
  return (
    <Grid container spacing={0} sx={{ borderTop: "1px solid #E6ECF8", borderLeft: "1px solid #E6ECF8" }}>
      {lstItems.map((objItem, intIndex) => (
        <Grid item xs={6} key={`${objItem.strLabel}-${intIndex}`}>
          <Box sx={{ minHeight: 74, p: 1.05, borderRight: "1px solid #E6ECF8", borderBottom: "1px solid #E6ECF8" }}>
            <Typography sx={{ color: "#6B7280", fontSize: "0.74rem", fontWeight: 700 }}>{objItem.strLabel}</Typography>
            <Typography sx={{ mt: 0.32, color: "#172554", fontSize: "1rem", fontWeight: 800, lineHeight: 1.3 }}>{objItem.strValue}</Typography>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}

function FooterLink({ strHref, strLabel, strColor }: { strHref: string; strLabel: string; strColor: string }) {
  return (
    <Box sx={{ mt: 1.25 }}>
      <Link href={strHref} style={{ color: strColor, textDecoration: "none", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}>
        {strLabel}
        <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
      </Link>
    </Box>
  );
}

function TrendChartPanel({ objWidget, t }: { objWidget?: DashboardWidget; t: RoleBasedDashboardProps["t"] }) {
  const lstSeries = (((objWidget?.objPayload as { lstSeries?: ChartSeries[] } | undefined)?.lstSeries) || []) as ChartSeries[];
  const lstPoints = lstSeries[0]?.lstPoints || [];
  const decMax = Math.max(...lstPoints.map((objPoint) => Number(objPoint.decValue || objPoint.intValue || 0)), 0);
  return (
    <PanelShell strTitle={resolveWidgetTitle(t, objWidget?.strWidgetCode, objWidget?.strWidgetName || "Payroll Cost Trend")}>
      <Stack direction="row" alignItems="end" spacing={1.1} sx={{ minHeight: 180 }}>
        {lstPoints.map((objPoint, intIndex) => {
          const decValue = Number(objPoint.decValue || objPoint.intValue || 0);
          const decHeight = decMax > 0 ? Math.max((decValue / decMax) * 128, 14) : 14;
          return (
            <Stack key={`${objPoint.strCode || "point"}-${objPoint.strLabel}-${intIndex}`} spacing={1} sx={{ flex: 1, alignItems: "center" }}>
              <Typography sx={{ fontSize: "0.68rem", color: "#475569", fontWeight: 700 }}>{formatCurrency(decValue)}</Typography>
              <Box sx={{ width: "72%", borderRadius: "10px 10px 4px 4px", height: decHeight, background: "linear-gradient(180deg, #A855F7 0%, #3B82F6 100%)", boxShadow: "0 10px 18px rgba(99,102,241,0.18)" }} />
              <Typography sx={{ fontSize: "0.74rem", color: "#64748b" }}>{objPoint.strLabel}</Typography>
            </Stack>
          );
        })}
      </Stack>
    </PanelShell>
  );
}

function BarChartPanel({ objWidget, t }: { objWidget?: DashboardWidget; t: RoleBasedDashboardProps["t"] }) {
  const lstPoints = (((objWidget?.objPayload as { lstPoints?: ChartPoint[] } | undefined)?.lstPoints) || []) as ChartPoint[];
  const decMax = Math.max(...lstPoints.map((objPoint) => Number(objPoint.decValue || objPoint.intValue || 0)), 0);
  return (
    <PanelShell strTitle={resolveWidgetTitle(t, objWidget?.strWidgetCode, objWidget?.strWidgetName || "Department-wise Payroll Cost")}>
      <Stack spacing={1.1}>
        {lstPoints.map((objPoint, intIndex) => {
          const decValue = Number(objPoint.decValue || objPoint.intValue || 0);
          const decWidth = decMax > 0 ? `${Math.max((decValue / decMax) * 100, 6)}%` : "6%";
          return (
            <Box key={`${objPoint.strCode || "point"}-${objPoint.strLabel}-${intIndex}`}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography sx={{ color: "#111827", fontWeight: 600, fontSize: "0.85rem" }}>{objPoint.strLabel}</Typography>
                <Typography sx={{ color: "#2563eb", fontWeight: 700, fontSize: "0.82rem" }}>{formatCurrency(decValue)}</Typography>
              </Stack>
              <Box sx={{ width: "100%", backgroundColor: "#e2e8f0", borderRadius: "999px", height: 9 }}>
                <Box sx={{ width: decWidth, background: "linear-gradient(90deg, #9333EA 0%, #2563EB 56%, #0891B2 100%)", borderRadius: "999px", height: 9, boxShadow: "0 8px 18px rgba(37,99,235,0.16)" }} />
              </Box>
            </Box>
          );
        })}
      </Stack>
    </PanelShell>
  );
}

function DonutChartPanel({ objWidget, t }: { objWidget?: DashboardWidget; t: RoleBasedDashboardProps["t"] }) {
  const lstPoints = (((objWidget?.objPayload as { lstPoints?: ChartPoint[] } | undefined)?.lstPoints) || []) as ChartPoint[];
  return (
    <PanelShell strTitle={resolveWidgetTitle(t, objWidget?.strWidgetCode, objWidget?.strWidgetName || "Status Chart")}>
      <MiniDonutChart lstPoints={lstPoints} t={t} />
    </PanelShell>
  );
}

function CompactEmptyState({ strTitle, strSubtitle }: { strTitle: string; strSubtitle: string }) {
  return (
    <Stack spacing={0.45} sx={{ py: 1.2 }}>
      <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 700, fontSize: "0.84rem" }}>{strTitle}</Typography>
      <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.76rem" }}>{strSubtitle}</Typography>
    </Stack>
  );
}

function CompactStatRow({ strLabel, strValue }: { strLabel: string; strValue: string }) {
  return (
    <Box sx={{ p: 1, borderRadius: "12px", border: `1px solid ${DASHBOARD_COLORS.border}`, backgroundColor: "#FBFDFF" }}>
      <Stack direction="row" justifyContent="space-between" spacing={1}>
        <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.74rem", fontWeight: 700 }}>{strLabel}</Typography>
        <Typography sx={{ color: DASHBOARD_COLORS.text, fontSize: "0.8rem", fontWeight: 800, textAlign: "right" }}>{strValue}</Typography>
      </Stack>
    </Box>
  );
}

function MetricPill({ strLabel, strValue, strTone }: { strLabel: string; strValue: string; strTone: string }) {
  return (
    <Box sx={{ p: 1, borderRadius: "12px", border: `1px solid ${DASHBOARD_COLORS.border}`, backgroundColor: softColor(strTone), height: "100%" }}>
      <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.72rem", fontWeight: 700 }}>{strLabel}</Typography>
      <Typography sx={{ mt: 0.25, color: strTone, fontSize: "0.92rem", fontWeight: 800 }}>{strValue}</Typography>
    </Box>
  );
}

function MiniProgressBar({ decValue, strColor }: { decValue: number; strColor: string }) {
  const decSafeValue = Math.max(0, Math.min(100, decValue));
  return (
    <Box sx={{ mt: 0.55, width: "100%", backgroundColor: "#E2E8F0", borderRadius: "999px", height: 8 }}>
      <Box sx={{ width: `${decSafeValue}%`, backgroundColor: strColor, borderRadius: "999px", height: 8 }} />
    </Box>
  );
}

function MiniDonutChart({ lstPoints, t, blnCompact = false }: { lstPoints: ChartPoint[]; t: RoleBasedDashboardProps["t"]; blnCompact?: boolean }) {
  const intTotal = lstPoints.reduce((intSum, objPoint) => intSum + Number(objPoint.intValue || objPoint.decValue || 0), 0);
  const lstSegments = lstPoints.map((objPoint) => ({
    ...objPoint,
    intValue: Number(objPoint.intValue || objPoint.decValue || 0),
  }));
  const strGradient = buildConicGradient(lstSegments);
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={blnCompact ? 1.5 : 2.25} alignItems="center" sx={{ mt: blnCompact ? 0 : 2 }}>
      <Box sx={{ width: blnCompact ? 92 : 118, height: blnCompact ? 92 : 118, borderRadius: "50%", background: strGradient, display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Box sx={{ width: blnCompact ? 58 : 74, height: blnCompact ? 58 : 74, borderRadius: "50%", backgroundColor: "#fff", display: "grid", placeItems: "center" }}>
          <Typography sx={{ fontWeight: 800, color: "#111827" }}>{formatInteger(intTotal)}</Typography>
        </Box>
      </Box>
      {blnCompact ? null : (
        <Stack spacing={1} sx={{ flex: 1, width: "100%" }}>
          {lstSegments.map((objPoint, intIndex) => (
            <Stack key={`${objPoint.strCode || objPoint.strLabel}-${intIndex}`} direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: chartColor(intIndex) }} />
                <Typography sx={{ color: "#111827", fontWeight: 600, fontSize: "0.88rem" }}>{resolveStatusLabel(objPoint.strLabel, t)}</Typography>
              </Stack>
              <Typography sx={{ color: "#64748b", fontWeight: 700 }}>{formatInteger(objPoint.intValue || 0)}</Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function quickActionColor(strActionCode: string) {
  const strCode = String(strActionCode || "").toUpperCase();
  if (strCode.includes("PAYSLIP")) return DASHBOARD_COLORS.blueSoft;
  if (strCode.includes("DECLARATION")) return DASHBOARD_COLORS.amberSoft;
  if (strCode.includes("REIMBURSE")) return DASHBOARD_COLORS.greenSoft;
  if (strCode.includes("PROFILE")) return DASHBOARD_COLORS.blueSoft;
  if (strCode.includes("FORM")) return DASHBOARD_COLORS.redSoft;
  return "#f8fafc";
}


function renderQuickActionIcon(strActionCode: string) {
  const strCode = String(strActionCode || "").toUpperCase();
  if (strCode.includes("RUN")) return <PaymentsRoundedIcon sx={{ color: DASHBOARD_COLORS.red, fontSize: 18 }} />;
  if (strCode.includes("PAYSLIP")) return <ReceiptLongRoundedIcon sx={{ color: DASHBOARD_COLORS.blue, fontSize: 18 }} />;
  if (strCode.includes("DECLARATION")) return <DescriptionRoundedIcon sx={{ color: DASHBOARD_COLORS.amber, fontSize: 18 }} />;
  if (strCode.includes("REIMBURSE")) return <AssignmentTurnedInRoundedIcon sx={{ color: DASHBOARD_COLORS.green, fontSize: 18 }} />;
  if (strCode.includes("REPORT")) return <AssignmentRoundedIcon sx={{ color: DASHBOARD_COLORS.blue, fontSize: 18 }} />;
  if (strCode.includes("EMPLOYEE")) return <PeopleAltRoundedIcon sx={{ color: DASHBOARD_COLORS.blue, fontSize: 18 }} />;
  if (strCode.includes("SALARY")) return <AccountBalanceWalletRoundedIcon sx={{ color: DASHBOARD_COLORS.red, fontSize: 18 }} />;
  return <AssignmentRoundedIcon sx={{ color: DASHBOARD_COLORS.blue, fontSize: 18 }} />;
}

function quickActionSubtitle(strActionCode: string, t: RoleBasedDashboardProps["t"]) {
  const strCode = String(strActionCode || "").toUpperCase();
  if (strCode.includes("RUN")) return t("process_monthly_payroll", "Process Monthly Payroll");
  if (strCode.includes("PAYSLIP")) return t("bulk_payslip_generation", "Bulk Payslip Generation");
  if (strCode.includes("DECLARATION")) return t("pending_declarations", "Pending Declarations");
  if (strCode.includes("REIMBURSE")) return t("pending_claims", "Pending Claims");
  if (strCode.includes("REPORT")) return t("view_payroll_reports", "View Payroll Reports");
  if (strCode.includes("EMPLOYEE")) return t("manage_employees", "Manage Employees");
  if (strCode.includes("SALARY")) return t("manage_structures", "Manage Structures");
  return t("open_module", "Open Module");
}

function PanelShell({
  strTitle,
  strSubtitle,
  strAccent = DASHBOARD_COLORS.blue,
  blnAutoHeight = false,
  blnCenterHeader = false,
  blnCompactPanel = false,
  children,
}: {
  strTitle: string;
  strSubtitle?: string;
  strAccent?: string;
  blnAutoHeight?: boolean;
  blnCenterHeader?: boolean;
  blnCompactPanel?: boolean;
  children: ReactNode;
}) {
  return (
    <Paper
      sx={{
        p: blnCompactPanel ? 1.05 : 1.7,
        width: "100%",
        height: blnAutoHeight ? "auto" : "100%",
        borderRadius: "18px",
        border: `1px solid ${DASHBOARD_COLORS.border}`,
        backgroundColor: DASHBOARD_COLORS.surface,
        boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box sx={{ position: "absolute", inset: 0, borderTop: `3px solid ${strAccent}`, pointerEvents: "none", opacity: 0.9 }} />
      <Box sx={{ mb: blnCompactPanel ? 0.55 : 1.2, textAlign: blnCenterHeader ? "center" : "left" }}>
        <Typography variant="h6" sx={{ color: DASHBOARD_COLORS.text, fontWeight: 800, fontSize: blnCompactPanel ? "0.86rem" : "0.96rem", lineHeight: 1.15 }}>
          {strTitle}
        </Typography>
        {strSubtitle ? (
          <Typography sx={{ mt: 0.25, color: DASHBOARD_COLORS.muted, fontSize: "0.76rem" }}>
            {strSubtitle}
          </Typography>
        ) : null}
      </Box>
      {children}
    </Paper>
  );
}

function getKpiIcon(strWidgetCode: string) {
  if (strWidgetCode.includes("reimbursement")) {
    return <ReceiptLongRoundedIcon sx={{ fontSize: 22 }} />;
  }
  if (strWidgetCode.includes("net_pay_movement")) {
    return <TimelineRoundedIcon sx={{ fontSize: 22 }} />;
  }
  if (strWidgetCode.includes("statutory")) {
    return <AccountBalanceWalletRoundedIcon sx={{ fontSize: 22 }} />;
  }
  if (strWidgetCode.includes("master_data")) {
    return <ManageAccountsRoundedIcon sx={{ fontSize: 22 }} />;
  }
  if (strWidgetCode.includes("employee")) {
    return <PeopleAltRoundedIcon sx={{ fontSize: 22 }} />;
  }
  if (strWidgetCode.includes("net")) {
    return <PaymentsRoundedIcon sx={{ fontSize: 22 }} />;
  }
  if (strWidgetCode.includes("approval")) {
    return <AssignmentTurnedInRoundedIcon sx={{ fontSize: 22 }} />;
  }
  if (strWidgetCode.includes("validation") || strWidgetCode.includes("blocker")) {
    return <ErrorOutlineRoundedIcon sx={{ fontSize: 22 }} />;
  }
  if (strWidgetCode.includes("leave")) {
    return <EventAvailableRoundedIcon sx={{ fontSize: 22 }} />;
  }
  return <AccessTimeRoundedIcon sx={{ fontSize: 22 }} />;
}

function resolveSelectedRun(lstRecentRunRows: RecentRunRow[], strSelectedMonth: string, strAllMonthsValue: string) {
  if (!lstRecentRunRows.length) return undefined;
  if (strSelectedMonth === strAllMonthsValue) {
    return lstRecentRunRows[0];
  }
  return lstRecentRunRows.find((objRow) => String(objRow.payroll_month || "").trim() === strSelectedMonth) || lstRecentRunRows[0];
}

function normalizeRunStatus(strStatus: string) {
  return String(strStatus || "").trim().toLowerCase();
}

function buildPayrollActionItems(strRunStatus: string, lstQuickActions: DashboardQuickAction[], t: RoleBasedDashboardProps["t"]): PayrollActionItem[] {
  const setAvailableRoutes = new Set(lstQuickActions.map((objAction) => objAction.strRoutePath).filter(Boolean));
  const strNormalizedStatus = normalizeRunStatus(strRunStatus) || "open";
  const lstCandidates: PayrollActionItem[] = [
    { strCode: "validate", strLabel: t("validate_run", "Validate Run"), strRoutePath: "/payroll/runs", strVariant: "primary", blnEnabled: ["open", "submitted", "approved"].includes(strNormalizedStatus), strReason: t("validate_run_hint", "Review blockers, warnings and run readiness.") },
    { strCode: "edit_inputs", strLabel: t("edit_inputs", "Edit Inputs"), strRoutePath: "/payroll/runs", strVariant: "secondary", blnEnabled: ["open", "submitted"].includes(strNormalizedStatus), strReason: t("edit_inputs_hint", "Inputs remain editable only before processing and lock.") },
    { strCode: "process", strLabel: t("process_payroll", "Process Payroll"), strRoutePath: "/payroll/runs", strVariant: "primary", blnEnabled: strNormalizedStatus === "approved", strReason: t("process_payroll_hint", "Processing is enabled only after run approval.") },
    { strCode: "payslips", strLabel: t("generate_payslips", "Generate Payslips"), strRoutePath: "/payroll/payslips", strVariant: "secondary", blnEnabled: ["processed", "closed"].includes(strNormalizedStatus), strReason: t("generate_payslips_hint", "Use payroll results to publish payslips once processing is complete.") },
    { strCode: "reports", strLabel: t("download_reports", "Download Reports"), strRoutePath: "/reports", strVariant: "secondary", blnEnabled: ["processed", "closed"].includes(strNormalizedStatus), strReason: t("download_reports_hint", "Use standard payroll reporting and reconciliation outputs.") },
    { strCode: "results", strLabel: t("view_results", "View Results"), strRoutePath: "/payroll/results", strVariant: "secondary", blnEnabled: ["processed", "closed"].includes(strNormalizedStatus), strReason: t("view_results_hint", "Inspect processed employees, net pay and payslip readiness.") },
  ];

  return lstCandidates.map((objAction) => {
    const blnRouteVisible = setAvailableRoutes.has(objAction.strRoutePath) || objAction.strRoutePath === "/payroll/runs" || objAction.strRoutePath === "/payroll/results";
    const strReason = objAction.blnEnabled
      ? objAction.strReason
      : disabledActionReason(objAction.strCode, strNormalizedStatus, t);
    return {
      ...objAction,
      blnEnabled: blnRouteVisible && objAction.blnEnabled,
      strReason,
    };
  }).filter((objAction) => objAction.blnEnabled || setAvailableRoutes.has(objAction.strRoutePath) || objAction.strRoutePath === "/payroll/runs");
}

function buildDemoQuickActions(lstActions: DashboardQuickAction[], t: RoleBasedDashboardProps["t"]) {
  const dicByRoute = new Map(filterPayrollQuickActions(lstActions).filter((objAction) => objAction.strRoutePath).map((objAction) => [objAction.strRoutePath as string, objAction]));
  const lstDefaults: DashboardQuickAction[] = [
    { strActionCode: "create_payroll_run", strActionName: t("create_payroll_run", "Create Payroll Run"), strRoutePath: "/payroll/runs" },
    { strActionCode: "view_payroll_results", strActionName: t("view_payroll_results", "View Payroll Results"), strRoutePath: "/payroll/results" },
    { strActionCode: "generate_payslips", strActionName: t("generate_payslips", "Generate Payslips"), strRoutePath: "/payroll/payslips" },
    { strActionCode: "payroll_reports", strActionName: t("payroll_reports", "Payroll Reports"), strRoutePath: "/reports" },
  ] as DashboardQuickAction[];
  return lstDefaults.map((objDefault) => dicByRoute.get(objDefault.strRoutePath || "") || objDefault);
}

function filterPayrollQuickActions(lstActions: DashboardQuickAction[]) {
  return lstActions.filter((objAction) => {
    const strSearchText = `${objAction.strActionCode || ""} ${objAction.strActionName || ""} ${objAction.strRoutePath || ""}`.toLowerCase();
    return !strSearchText.includes("exception");
  });
}

function resolveApprovalAgingRows(objApprovalAging: DashboardResponse["approvalAging"]) {
  const objValue = (objApprovalAging || {}) as { lstRows?: ApprovalAgingRow[] };
  return objValue.lstRows || [];
}

function resolveVarianceMetrics(objVariance: DashboardResponse["variance"]) {
  const objValue = (objVariance || {}) as { lstMetrics?: VarianceMetric[] };
  return objValue.lstMetrics || [];
}

function resolveHighRiskEmployees(objHighRiskEmployees: DashboardResponse["highRiskEmployees"]) {
  const objValue = (objHighRiskEmployees || {}) as { lstEmployees?: HighRiskEmployeeRow[] };
  return objValue.lstEmployees || [];
}

function resolveExceptionGroups(objExceptions: DashboardResponse["exceptions"]) {
  const objValue = (objExceptions || {}) as { lstGroups?: Array<{ strSeverity: "Blocking" | "Warning" | "Info"; lstItems: ExceptionItem[] }> };
  const lstGroups = objValue.lstGroups || [];
  return lstGroups.flatMap((objGroup) => (objGroup.lstItems || []).map((objItem) => ({ ...objItem, strSeverity: objGroup.strSeverity })));
}

function buildDetailedSummarySections(objDashboard: DashboardResponse, t: RoleBasedDashboardProps["t"]) {
  const objIt = (objDashboard.itDeclarationDetails || {}) as { lstStats?: DrilldownStat[] };
  const objReimbursement = (objDashboard.reimbursementDetails || {}) as { lstStats?: DrilldownStat[] };
  const objStatutory = (objDashboard.statutoryDetails || {}) as { lstStats?: DrilldownStat[] };
  const objTax = (objDashboard.taxDetails || {}) as { lstStats?: DrilldownStat[] };
  return [
    { strCode: "it", strTitle: t("it_declaration_summary", "IT Declaration Summary"), strSubtitle: t("it_declaration_summary_subtitle", "Status, amount, proofs and approval posture"), lstStats: objIt.lstStats || [], strAccent: DASHBOARD_COLORS.amber },
    { strCode: "reimbursement", strTitle: t("reimbursement_summary", "Reimbursement Summary"), strSubtitle: t("reimbursement_summary_subtitle", "Claims, proof checks, approval and payroll push status"), lstStats: objReimbursement.lstStats || [], strAccent: DASHBOARD_COLORS.green },
    { strCode: "statutory", strTitle: t("statutory_summary", "Statutory Summary"), strSubtitle: t("statutory_summary_subtitle", "PF, ESI, PT, LWF and contribution overview"), lstStats: objStatutory.lstStats || [], strAccent: DASHBOARD_COLORS.blue },
    { strCode: "tax", strTitle: t("tax_summary", "Tax Summary"), strSubtitle: t("tax_summary_subtitle", "Taxable payroll, TDS posture and regime coverage"), lstStats: objTax.lstStats || [], strAccent: DASHBOARD_COLORS.red },
  ];
}

function normalizeDashboardWidgetKey(strValue: string) {
  return String(strValue || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const DASHBOARD_HINDI_TEXT_FALLBACKS: Record<string, string> = {
  approved: "अनुमोदित",
  filed: "दाखिल",
  missing_tax_regime: "कर व्यवस्था अनुपलब्ध",
  open_issues_in_run: "रन में खुले मुद्दे",
  payroll_tax_and_reimbursement: "पेरोल, कर और प्रतिपूर्ति",
  pending_approval_workloads_still_require_review: "लंबित अनुमोदन कार्यभार की अभी समीक्षा आवश्यक है।",
  ready: "तैयार",
  ready_with_warnings: "चेतावनियों के साथ तैयार",
  tax_regime_missing: "कर व्यवस्था अनुपलब्ध",
  employees_missing_tax_regime_can_affect_tds_accuracy: "जिन कर्मचारियों की कर व्यवस्था अनुपलब्ध है, वे TDS सटीकता को प्रभावित कर सकते हैं।",
  keep_statutory_identifiers_complete_before_payout: "भुगतान से पहले वैधानिक पहचान विवरण पूर्ण रखें।",
  update_pf_uan_details_for_statutory_readiness: "वैधानिक तैयारी के लिए PF/UAN विवरण अपडेट करें।",
};

const DASHBOARD_HINDI_TEXT_FALLBACK_OVERRIDES: Record<string, string> = {
  approved: "स्वीकृत",
  approved_amount: "स्वीकृत राशि",
  approved_claims: "स्वीकृत दावे",
  complete: "पूर्ण",
  current_month: "वर्तमान माह",
  current_month_pay: "वर्तमान माह का वेतन",
  declared_amount: "घोषित राशि",
  department: "विभाग",
  download_payslip: "पेस्लिप डाउनलोड करें",
  emp_code: "कर्मचारी कोड",
  employee_code: "कर्मचारी कोड",
  employment_type: "रोजगार प्रकार",
  welcome_back: "वापसी पर स्वागत है",
  ess_dashboard_heading: "डैशबोर्ड",
  flexi_pay_declaration: "फ्लेक्सी पे घोषणा",
  gross_earnings: "सकल आय",
  high: "उच्च",
  improve_profile: "प्रोफ़ाइल सुधारें",
  it_declaration: "आईटी घोषणा",
  joined_on: "ज्वाइनिंग तिथि",
  latest_payslip: "नवीनतम पेस्लिप",
  latest_status: "नवीनतम स्थिति",
  location: "स्थान",
  low: "कम",
  medium: "मध्यम",
  my_payslips: "मेरी पेस्लिप",
  my_profile: "मेरी प्रोफ़ाइल",
  net_pay: "शुद्ध वेतन",
  no_compliance_data_available: "कोई अनुपालन डेटा उपलब्ध नहीं है।",
  no_payslips: "अभी कोई पेस्लिप जनरेट नहीं हुई है।",
  no_pending_actions: "कोई लंबित कार्य नहीं।",
  not_assigned: "असाइन नहीं किया गया",
  not_available: "उपलब्ध नहीं",
  overview: "अवलोकन",
  paid: "भुगतान किया गया",
  paid_amount: "भुगतान राशि",
  pan: "पैन",
  payslip_available_after_release: "पेरोल रिलीज़ के बाद पेस्लिप उपलब्ध होगी।",
  pending: "लंबित",
  pending_actions: "लंबित कार्य",
  pf_uan: "पीएफ / यूएएन",
  profile_completeness: "प्रोफ़ाइल पूर्णता",
  profile_compliance_health: "प्रोफ़ाइल और अनुपालन स्थिति",
  proof_pending: "प्रमाण लंबित",
  quick_actions: "त्वरित कार्य",
  recent_payslips: "हाल की पेस्लिप",
  reimbursement_summary: "प्रतिपूर्ति सारांश",
  reimbursements: "प्रतिपूर्ति",
  reporting_manager: "रिपोर्टिंग मैनेजर",
  salary_estimate: "वेतन अनुमान",
  submitted: "जमा किया गया",
  submitted_amount: "जमा राशि",
  tax_regime: "कर व्यवस्था",
  total_amount: "कुल राशि",
  total_claims: "कुल दावे",
  total_deductions: "कुल कटौतियां",
  update: "अपडेट करें",
  update_profile: "प्रोफ़ाइल अपडेट करें",
  verified: "सत्यापित",
  view_all: "सभी देखें",
  view_all_actions: "सभी कार्य देखें",
  view_details: "विवरण देखें",
  view_my_claims: "मेरे दावे देखें",
  view_update: "देखें / अपडेट करें",
  work_email: "कार्य ईमेल",
};
function hasDevanagariText(strValue: string) {
  return /[\u0900-\u097F]/.test(strValue || "");
}

function shouldUseHindiDashboardFallback(t: RoleBasedDashboardProps["t"]) {
  return ["payroll_dashboard", "current_status", "exception_first", "approval_queue", "payroll_readiness", "ess_dashboard_heading", "my_payslips", "profile_completeness", "current_month_pay"]
    .some((strKey) => hasDevanagariText(t(strKey, "")));
}

function dashboardTextFallback(strKey: string, t: RoleBasedDashboardProps["t"], strFallback: string) {
  const strTranslated = t(strKey, "");
  if (strTranslated) return strTranslated;
  if (shouldUseHindiDashboardFallback(t) && DASHBOARD_HINDI_TEXT_FALLBACK_OVERRIDES[strKey]) {
    return DASHBOARD_HINDI_TEXT_FALLBACK_OVERRIDES[strKey];
  }
  if (shouldUseHindiDashboardFallback(t) && DASHBOARD_HINDI_TEXT_FALLBACKS[strKey]) {
    return DASHBOARD_HINDI_TEXT_FALLBACKS[strKey];
  }
  return strFallback;
}

function translateDashboardText(strValue: string | undefined, t: RoleBasedDashboardProps["t"], strFallback = "") {
  const strResolved = String(strValue || strFallback || "").trim();
  if (!strResolved) return "";
  return dashboardTextFallback(normalizeDashboardWidgetKey(strResolved), t, strResolved);
}

function getStageColor(strStatus: TrackerStage["strStatus"]) {
  if (strStatus === "completed") return "#16A34A";
  if (strStatus === "in_progress") return "#2563EB";
  return "#94a3b8";
}

function validationTone(strTone: "red" | "amber" | "blue" | "green") {
  if (strTone === "red") return { accent: DASHBOARD_COLORS.red, surface: DASHBOARD_COLORS.redSoft, border: "#F9D2D2" };
  if (strTone === "amber") return { accent: DASHBOARD_COLORS.amber, surface: DASHBOARD_COLORS.amberSoft, border: "#F7C99D" };
  if (strTone === "green") return { accent: DASHBOARD_COLORS.green, surface: DASHBOARD_COLORS.greenSoft, border: "#BFE7CC" };
  return { accent: DASHBOARD_COLORS.blue, surface: DASHBOARD_COLORS.blueSoft, border: "#D6E4FF" };
}

function exceptionTone(strSeverity: "Blocking" | "Warning" | "Info") {
  if (strSeverity === "Blocking") return { accent: DASHBOARD_COLORS.red, surface: DASHBOARD_COLORS.redSoft, border: "#F9D2D2" };
  if (strSeverity === "Warning") return { accent: DASHBOARD_COLORS.amber, surface: DASHBOARD_COLORS.amberSoft, border: "#F7C99D" };
  return { accent: DASHBOARD_COLORS.blue, surface: DASHBOARD_COLORS.blueSoft, border: "#D6E4FF" };
}

function formatLifecycleLabel(strStatus: string, t: RoleBasedDashboardProps["t"]) {
  return formatStatusText(strStatus || "pending", t);
}

function formatLifecycleState(strState: "completed" | "active" | "upcoming" | "locked", t: RoleBasedDashboardProps["t"]) {
  if (strState === "completed") return t("completed", "Completed");
  if (strState === "active") return t("active", "Active");
  if (strState === "locked") return t("locked", "Locked");
  return t("upcoming", "Upcoming");
}

function disabledActionReason(strActionCode: string, strRunStatus: string, t: RoleBasedDashboardProps["t"]) {
  const strNormalizedStatus = normalizeRunStatus(strRunStatus);
  if (strActionCode === "process") return t("process_requires_approved", "Process Payroll stays disabled until the run reaches Approved.");
  if (strActionCode === "payslips") return t("payslips_require_processed", "Payslips become available only after payroll is processed.");
  if (strActionCode === "reports") return t("reports_require_processed", "Reports are intended for processed or closed payroll runs.");
  if (strActionCode === "results") return t("results_require_processed", "Results are available only after payroll processing completes.");
  if (strActionCode === "edit_inputs" && ["processed", "closed"].includes(strNormalizedStatus)) return t("edit_locked_after_processing", "Input editing is disabled after processing unless a controlled reprocess flow is used.");
  return t("action_not_available_for_status", "This action is not available for the current run status.");
}

function formatMetricValue(decValue: number | undefined, blnCurrency?: boolean) {
  if (blnCurrency) {
    return formatCurrency(Number(decValue || 0));
  }
  return formatInteger(Math.round(Number(decValue || 0)));
}

function varianceColor(decVariancePercent: number | null | undefined) {
  if (decVariancePercent == null) return DASHBOARD_COLORS.muted;
  if (decVariancePercent > 0) return DASHBOARD_COLORS.green;
  if (decVariancePercent < 0) return DASHBOARD_COLORS.red;
  return DASHBOARD_COLORS.muted;
}

function formatTrendText(decVariancePercent: number | null | undefined, t: RoleBasedDashboardProps["t"]) {
  if (decVariancePercent == null) return t("no_previous_month_data", "No previous month data");
  const strSymbol = decVariancePercent > 0 ? "^" : decVariancePercent < 0 ? "v" : "-";
  return `${strSymbol} ${Math.abs(decVariancePercent).toFixed(1)}%`;
}

function formatDays(decValue: number | undefined, t: RoleBasedDashboardProps["t"]) {
  if (decValue == null) return "-";
  return `${Number(decValue).toFixed(1)} ${t("days", "days")}`;
}

function joinActorDate(strActor: string | undefined, dtValue: string | undefined, t: RoleBasedDashboardProps["t"]) {
  const strDate = formatDateTimeLabel(dtValue, t);
  if (strActor && strDate !== "-") return `${strActor} • ${strDate}`;
  return strActor || strDate;
}

function formatInteger(intValue: number) {
  return new Intl.NumberFormat("en-IN").format(intValue || 0);
}

function formatCurrency(decValue: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(decValue || 0);
}

const DASHBOARD_MONTH_KEYS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

const DASHBOARD_MONTH_SHORT_FALLBACKS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const DASHBOARD_MONTH_LONG_FALLBACKS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
const DASHBOARD_MONTH_LOOKUP: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function monthLabel(objDate: Date, t: RoleBasedDashboardProps["t"], blnLong = false) {
  const intMonth = objDate.getMonth();
  const strMonthKey = DASHBOARD_MONTH_KEYS[intMonth];
  if (!strMonthKey) return "";
  const strPrefix = blnLong ? "month_long" : "month_short";
  const strFallback = blnLong ? DASHBOARD_MONTH_LONG_FALLBACKS[intMonth] : DASHBOARD_MONTH_SHORT_FALLBACKS[intMonth];
  return t(`${strPrefix}_${strMonthKey}`, strFallback);
}

function formatMonth(strValue: string, t: RoleBasedDashboardProps["t"]) {
  const objDate = parseDashboardDate(strValue);
  return Number.isNaN(objDate.getTime()) ? strValue : `${monthLabel(objDate, t)} ${objDate.getFullYear()}`;
}

function formatComparisonMonth(strValue: string, t: RoleBasedDashboardProps["t"]) {
  if (!strValue) return t("overall", "overall");
  const objDate = parseDashboardDate(strValue);
  if (Number.isNaN(objDate.getTime())) return t("previous_month", "previous month");
  objDate.setMonth(objDate.getMonth() - 1);
  return `${monthLabel(objDate, t)} ${objDate.getFullYear()}`;
}

function formatDateLabel(strValue: string, t: RoleBasedDashboardProps["t"]) {
  const objDate = parseDashboardDate(strValue);
  return Number.isNaN(objDate.getTime()) ? strValue : `${String(objDate.getDate()).padStart(2, "0")} ${monthLabel(objDate, t)} ${objDate.getFullYear()}`;
}

function formatLeaveBalanceMetric(decValue: number) {
  if (!Number.isFinite(decValue)) {
    return "0";
  }
  return Number.isInteger(decValue) ? String(decValue) : decValue.toFixed(2).replace(/\.?0+$/, "");
}

function getUpcomingEssLeaveApplication(lstApplications: LeaveApplicationDto[]) {
  const objToday = new Date();
  objToday.setHours(0, 0, 0, 0);
  const lstAllowedStatuses = new Set(["approved", "pending"]);

  return lstApplications
    .filter((objApplication) => {
      const strStatus = String(objApplication.strStatus || "").toLowerCase();
      const objFromDate = parseDashboardDate(String(objApplication.dtFromDate || ""));
      return lstAllowedStatuses.has(strStatus) && !Number.isNaN(objFromDate.getTime()) && objFromDate >= objToday;
    })
    .sort((objLeft, objRight) => {
      const intLeftTime = parseDashboardDate(String(objLeft.dtFromDate || "")).getTime();
      const intRightTime = parseDashboardDate(String(objRight.dtFromDate || "")).getTime();
      return intLeftTime - intRightTime;
    })[0] || null;
}

function formatEssLeaveApplicationLabel(objApplication: LeaveApplicationDto, t: RoleBasedDashboardProps["t"]) {
  const strTypeName = String(objApplication.strTypeName || objApplication.strTypeCode || t("leave", "Leave"));
  const strFromDate = objApplication.dtFromDate ? formatDateLabel(objApplication.dtFromDate, t) : "";
  const strToDate = objApplication.dtToDate ? formatDateLabel(objApplication.dtToDate, t) : "";
  const strDateRange = strFromDate && strToDate && strFromDate !== strToDate ? `${strFromDate} - ${strToDate}` : strFromDate || strToDate;
  return strDateRange ? `${strTypeName} - ${strDateRange}` : strTypeName;
}

function chartPointValue(objPoint: ChartPoint | undefined) {
  return Number(objPoint?.decValue ?? objPoint?.intValue ?? 0);
}

function resolveChartPointsFromPayload(objPayload: unknown) {
  const objNormalizedPayload = (objPayload || {}) as {
    lstPoints?: ChartPoint[];
    lstSeries?: ChartSeries[];
  };
  const lstPoints = (objNormalizedPayload.lstPoints || []) as ChartPoint[];
  if (lstPoints.length >= 2) {
    return lstPoints;
  }
  const lstSeries = (objNormalizedPayload.lstSeries || []) as ChartSeries[];
  const lstSeriesPoints = lstSeries[0]?.lstPoints || [];
  if (lstSeriesPoints.length >= 2) {
    return lstSeriesPoints;
  }
  return [];
}

function resolveSummarySparklinePoints(objWidget: DashboardWidget) {
  const lstResolvedPoints = resolveChartPointsFromPayload(objWidget.objPayload).map(chartPointValue);
  if (lstResolvedPoints.length < 2) {
    return [];
  }
  const decMin = Math.min(...lstResolvedPoints);
  const decMax = Math.max(...lstResolvedPoints);
  if (decMin === decMax) {
    return lstResolvedPoints.map(() => 50);
  }
  return lstResolvedPoints.map((decValue) => Math.round(((decValue - decMin) / (decMax - decMin)) * 70 + 15));
}

function formatLongMonth(strValue: string, t: RoleBasedDashboardProps["t"]) {
  const objDate = parseDashboardDate(strValue);
  return Number.isNaN(objDate.getTime()) ? strValue : `${monthLabel(objDate, t, true)} ${objDate.getFullYear()}`;
}

function formatPayrollMonthSelectionLabel(strValue: string, t: RoleBasedDashboardProps["t"]) {
  if (strValue === "__all__") {
    return t("all_months", "All Months");
  }
  return formatLongMonth(strValue, t);
}

function shortChartLabel(strValue: string, t: RoleBasedDashboardProps["t"]) {
  const strTrimmed = String(strValue || "").trim();
  if (!strTrimmed) return "-";
  if (/^\d{4}-\d{2}/.test(strTrimmed)) {
    return formatMonth(strTrimmed, t);
  }
  const lstParts = strTrimmed.split(/\s+/).filter(Boolean);
  return lstParts.length > 1 ? `${lstParts[0].slice(0, 3)} ${lstParts.at(-1)?.slice(0, 2) || ""}`.trim() : strTrimmed.slice(0, 6);
}

function formatDateTimeLabel(strValue: string | null | undefined, t: RoleBasedDashboardProps["t"]) {
  if (!strValue) return "-";
  const objDate = parseDashboardDate(strValue);
  if (Number.isNaN(objDate.getTime())) return "-";
  const strTime = objDate.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${formatDateLabel(strValue, t)}, ${strTime}`;
}

function parseDashboardDate(strValue: string | null | undefined) {
  const strTrimmed = String(strValue || "").trim();
  if (!strTrimmed) return new Date(Number.NaN);
  const objIsoMatch = strTrimmed.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/);
  if (objIsoMatch) {
    return new Date(Number(objIsoMatch[1]), Number(objIsoMatch[2]) - 1, Number(objIsoMatch[3] || 1));
  }
  const objMonthTextMatch = strTrimmed.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (objMonthTextMatch) {
    const intMonth = DASHBOARD_MONTH_LOOKUP[objMonthTextMatch[1].toLowerCase()];
    if (intMonth !== undefined) {
      return new Date(Number(objMonthTextMatch[2]), intMonth, 1);
    }
  }
  return new Date(strTrimmed);
}

function Sparkline({ lstPoints, strColor, blnCompact = false }: { lstPoints: number[]; strColor: string; blnCompact?: boolean }) {
  return (
    <Box sx={{ width: blnCompact ? 132 : 144, height: blnCompact ? 46 : 54, alignSelf: blnCompact ? "stretch" : "center" }}>
      <svg viewBox="0 0 144 54" width="100%" height="100%" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={strColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={lstPoints.map((intValue, intIndex) => `${intIndex * (144 / Math.max(lstPoints.length - 1, 1))},${54 - (intValue / 100) * 42 - 6}`).join(" ")}
        />
      </svg>
    </Box>
  );
}

function ProgressRing({ decPercent, strColor, strLabel }: { decPercent: number; strColor: string; strLabel: string }) {
  const decSafePercent = Math.max(0, Math.min(100, decPercent));
  return (
    <Stack spacing={0.45} alignItems="center" sx={{ minWidth: 92 }}>
      <Box sx={{ position: "relative", width: 92, height: 92 }}>
        <Box sx={{ position: "absolute", inset: 0, borderRadius: "50%", background: `conic-gradient(${strColor} 0deg ${decSafePercent * 3.6}deg, #EEF2F7 ${decSafePercent * 3.6}deg 360deg)` }} />
        <Box sx={{ position: "absolute", inset: 12, borderRadius: "50%", backgroundColor: "#FFFFFF", display: "grid", placeItems: "center" }}>
          <Box sx={{ textAlign: "center" }}>
            <Typography sx={{ fontWeight: 800, color: DASHBOARD_COLORS.text, fontSize: "0.9rem" }}>{decSafePercent.toFixed(decSafePercent % 1 ? 1 : 0)}%</Typography>
            <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.7rem" }}>{strLabel}</Typography>
          </Box>
        </Box>
      </Box>
      <PercentRoundedIcon sx={{ color: strColor, fontSize: 18 }} />
    </Stack>
  );
}

function MiniBarChart({ lstBars }: { lstBars: number[] }) {
  const intMax = Math.max(...lstBars, 1);
  return (
    <Stack direction="row" spacing={1.3} alignItems="end" sx={{ height: 82, px: 1.1, pb: 0.2 }}>
      <Box sx={{ width: 1, alignSelf: "stretch", backgroundColor: "#D7E4F8" }} />
      {lstBars.map((intValue, intIndex) => (
        <Stack key={`${intValue}-${intIndex}`} spacing={0.6} alignItems="center" sx={{ flex: 1 }}>
          <Box sx={{ width: "100%", maxWidth: 34, height: `${Math.max((intValue / intMax) * 54, 18)}px`, borderRadius: "4px 4px 0 0", background: "linear-gradient(180deg, #8AB6FF 0%, #3B82F6 100%)" }} />
          <Typography sx={{ color: DASHBOARD_COLORS.text, fontSize: "0.72rem", fontWeight: 700 }}>{intIndex === 0 ? "PF" : "ESI"}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

function getInitials(strValue: string) {
  const lstParts = String(strValue || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!lstParts.length) return "E";
  return lstParts.map((strPart) => strPart.charAt(0).toUpperCase()).join("");
}

function statusAccentColor(strStatus: string) {
  const strNormalized = String(strStatus || "").trim().toLowerCase();
  if (["closed", "processed", "approved", "completed", "passed"].includes(strNormalized)) return "#15803D";
  if (["submitted", "released", "resubmitted", "under_review", "under review", "in progress", "in_progress"].includes(strNormalized)) return "#EA580C";
  if (["open", "active", "info"].includes(strNormalized)) return "#2563EB";
  return "#DC2626";
}

function pendingActionIcon(strCode: string) {
  const strNormalized = String(strCode || "").toLowerCase();
  if (strNormalized.includes("nominee") || strNormalized.includes("profile")) {
    return <PersonOutlineRoundedIcon sx={{ fontSize: 15 }} />;
  }
  if (strNormalized.includes("reimbursement")) {
    return <ReceiptLongRoundedIcon sx={{ fontSize: 15 }} />;
  }
  return <DescriptionRoundedIcon sx={{ fontSize: 15 }} />;
}

function chipBackground(strStatus: string) {
  const strNormalized = String(strStatus || "").toLowerCase();
  if (["closed", "processed", "approved", "completed", "passed"].includes(strNormalized)) return "#DCFCE7";
  if (["submitted", "released", "in_progress", "in progress", "under review"].includes(strNormalized)) return "#FFEDD5";
  if (["open", "active", "info"].includes(strNormalized)) return "#DBEAFE";
  return "#FEE2E2";
}

function formatStatusText(strStatus: string, t: RoleBasedDashboardProps["t"]) {
  const strNormalized = String(strStatus || "").trim().toLowerCase();
  if (!strNormalized) return dashboardTextFallback("pending", t, "Pending");
  const strKey = normalizeDashboardWidgetKey(strNormalized);
  const strFallback = strNormalized
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((strPart) => strPart.charAt(0).toUpperCase() + strPart.slice(1))
    .join(" ");
  return dashboardTextFallback(strKey, t, strFallback);
}


function StatusBadge({
  strLabel,
  strValue,
  strAccent,
  strBackground,
}: {
  strLabel: string;
  strValue: string;
  strAccent: string;
  strBackground: string;
}) {
  return (
    <Box sx={{ px: 1.15, py: 0.9, borderRadius: "14px", border: `1px solid ${DASHBOARD_COLORS.border}`, backgroundColor: strBackground, backdropFilter: "blur(6px)" }}>
      <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.7rem", fontWeight: 700 }}>{strLabel}</Typography>
      <Typography sx={{ mt: 0.2, color: strAccent, fontSize: "0.84rem", fontWeight: 800 }}>{strValue}</Typography>
    </Box>
  );
}

function softColor(strColor: string) {
  if (strColor === DASHBOARD_COLORS.green) return DASHBOARD_COLORS.greenSoft;
  if (strColor === DASHBOARD_COLORS.amber) return DASHBOARD_COLORS.amberSoft;
  if (strColor === DASHBOARD_COLORS.red) return DASHBOARD_COLORS.redSoft;
  return DASHBOARD_COLORS.blueSoft;
}

function summaryTone(strWidgetCode: string) {
  const strCode = String(strWidgetCode || "").toLowerCase();
  if (strCode.includes("reimbursement")) return { accent: DASHBOARD_COLORS.green, surface: DASHBOARD_COLORS.greenSoft, border: "#CDEFD9" };
  if (strCode.includes("statutory")) return { accent: DASHBOARD_COLORS.blue, surface: DASHBOARD_COLORS.blueSoft, border: "#D6E4FF" };
  if (strCode.includes("tax")) return { accent: DASHBOARD_COLORS.red, surface: DASHBOARD_COLORS.redSoft, border: "#F9D2D2" };
  return { accent: DASHBOARD_COLORS.amber, surface: DASHBOARD_COLORS.amberSoft, border: "#FDE3C8" };
}

function resolveWidgetTitle(t: RoleBasedDashboardProps["t"], strWidgetCode: string | undefined, strFallback: string) {
  const dicWidgetKeyMap: Record<string, string> = {
    payroll_workflow_tracker: "payroll_workflow_tracker",
    payroll_alerts: "payroll_alerts",
    recent_payroll_runs: "recent_payroll_runs",
    quick_actions: "quick_actions",
    payroll_cost_trend: "cost_trend",
    department_payroll_cost: "department_cost",
    profile_completeness: "profile_progress",
    pending_actions: "pending_actions",
    last_3_payslips: "last_3_payslips",
  };
  const strKey = strWidgetCode ? dicWidgetKeyMap[strWidgetCode] : undefined;
  return strKey ? t(strKey, strFallback) : strFallback;
}

function resolveStatusLabel(strStatus: string, t: RoleBasedDashboardProps["t"]) {
  return formatStatusText(strStatus, t);
}

function chartColor(intIndex: number) {
  return [DASHBOARD_COLORS.blue, DASHBOARD_COLORS.green, DASHBOARD_COLORS.amber, DASHBOARD_COLORS.red][intIndex % 4];
}

function buildConicGradient(lstPoints: Array<ChartPoint & { intValue: number }>) {
  const intTotal = lstPoints.reduce((intSum, objPoint) => intSum + objPoint.intValue, 0);
  if (!intTotal) {
    return "conic-gradient(#e2e8f0 0deg 360deg)";
  }
  let decStart = 0;
  const lstStops = lstPoints.map((objPoint, intIndex) => {
    const decSweep = (objPoint.intValue / intTotal) * 360;
    const strStop = `${chartColor(intIndex)} ${decStart}deg ${decStart + decSweep}deg`;
    decStart += decSweep;
    return strStop;
  });
  return `conic-gradient(${lstStops.join(", ")})`;
}

