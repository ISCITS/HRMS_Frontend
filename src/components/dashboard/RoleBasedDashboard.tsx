"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import GppGoodRoundedIcon from "@mui/icons-material/GppGoodRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import PercentRoundedIcon from "@mui/icons-material/PercentRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import { Avatar, Box, Button, Chip, Grid, MenuItem, Paper, Select, Stack, TextField, Tooltip, Typography } from "@mui/material";

import type { CurrentUserContext, DashboardQuickAction, DashboardResponse, DashboardWidget } from "@/models/AuthModels";

type RoleBasedDashboardProps = {
  objDashboard: DashboardResponse;
  objUserContext: CurrentUserContext;
  t: (strKey: string, strFallback?: string) => string;
  onPayrollMonthChange?: (strPayrollMonth: string | null) => void;
  onRefresh?: () => void;
  blnRefreshing?: boolean;
  strError?: string;
};

type KpiPayload = {
  intValue?: number;
  intRunEmployeeCount?: number;
  decValue?: number;
  strSubtitle?: string;
  decTrendValue?: number | null;
  intTaxPendingCount?: number;
  intReimbursementPendingCount?: number;
  intBlockingCount?: number;
  intWarningCount?: number;
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

type ReadinessPayload = {
  decScore?: number;
  strStatus?: string;
  intBlockingCount?: number;
  intWarningCount?: number;
  intInfoCount?: number;
  lstBreakdown?: Array<{ strLabel: string; intValue?: number; decValue?: number }>;
};

type ExceptionGroup = {
  strSeverity: "Blocking" | "Warning" | "Info";
  lstItems: Array<{ strCode: string; strLabel: string; intCount: number; strRoutePath?: string; strReason?: string; strCategory?: string }>;
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
};

type EssHeroDetail = {
  strLabel: string;
  strValue: string;
  objIcon: ReactNode;
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

const DASHBOARD_COLORS = {
  blue: "#2563EB",
  green: "#16A34A",
  amber: "#F97316",
  red: "#EF4444",
  text: "#0F1F3D",
  muted: "#64748b",
  border: "#DDE7F0",
  surface: "#FFFFFF",
  page: "#F8FBFF",
  blueSoft: "#EEF4FF",
  greenSoft: "#ECFDF5",
  amberSoft: "#FFF7ED",
  redSoft: "#FEF2F2",
};

const lstPayrollCardPalette = [
  { accent: DASHBOARD_COLORS.blue, surface: DASHBOARD_COLORS.blueSoft },
  { accent: DASHBOARD_COLORS.green, surface: DASHBOARD_COLORS.greenSoft },
  { accent: DASHBOARD_COLORS.amber, surface: DASHBOARD_COLORS.amberSoft },
  { accent: DASHBOARD_COLORS.red, surface: DASHBOARD_COLORS.redSoft },
];

export default function RoleBasedDashboard({ objDashboard, objUserContext, t, onPayrollMonthChange, onRefresh, blnRefreshing, strError }: RoleBasedDashboardProps) {
  if (objDashboard.strDashboardType === "PAYROLL") {
    return <PayrollDashboard objDashboard={objDashboard} objUserContext={objUserContext} t={t} onPayrollMonthChange={onPayrollMonthChange} onRefresh={onRefresh} blnRefreshing={blnRefreshing} strError={strError} />;
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

function PayrollDashboard({ objDashboard, t, onPayrollMonthChange, onRefresh, blnRefreshing, strError }: RoleBasedDashboardProps) {
  const lstWidgets = objDashboard.lstWidgets.map(normalizeDashboardWidget);
  const dicWidgetMap = new Map(lstWidgets.map((objWidget) => [objWidget.strWidgetCode, objWidget]));
  const lstKpiWidgets = [
    ensureWidget(dicWidgetMap.get("employees_in_payroll"), "employees_in_payroll", "Employees in Payroll", "kpi", { intValue: 0, strSubtitle: "Active Employees" }),
    ensureWidget(dicWidgetMap.get("net_payroll_amount"), "net_payroll_amount", "Net Payroll Amount", "kpi", { decValue: 0, strSubtitle: "Current Cycle" }),
    ensureWidget(dicWidgetMap.get("pending_approvals"), "pending_approvals", "Pending Approvals", "kpi", { intValue: 0, strSubtitle: "Requires Action" }),
    ensureWidget(dicWidgetMap.get("payroll_validation_errors"), "payroll_validation_errors", "Validation Errors", "kpi", { intValue: 0, strSubtitle: "Needs Attention" }),
  ];
  const objTrackerWidget = ensureWidget(dicWidgetMap.get("payroll_workflow_tracker"), "payroll_workflow_tracker", "Payroll Workflow Tracker", "tracker", {
    lstStages: [
      { strCode: "data_collection", strLabel: "Data Collection", strStatus: "completed" },
      { strCode: "validation", strLabel: "Validation", strStatus: "completed" },
      { strCode: "processing", strLabel: "Processing", strStatus: "in_progress" },
      { strCode: "approval", strLabel: "Approval", strStatus: "pending" },
      { strCode: "paid", strLabel: "Paid", strStatus: "pending" },
    ],
  });
  const objAlertsWidget = ensureWidget(dicWidgetMap.get("payroll_alerts"), "payroll_alerts", "Payroll Alerts", "alerts", {
    lstAlerts: [
      { strCode: "missing_pan", strLabel: "Missing PAN", intCount: 0, strRoutePath: "/employees" },
      { strCode: "missing_bank", strLabel: "Missing Bank Details", intCount: 0, strRoutePath: "/employees" },
      { strCode: "missing_pf_uan", strLabel: "Missing PF / UAN", intCount: 0, strRoutePath: "/employees" },
      { strCode: "missing_tax_regime", strLabel: "IT Declaration Pending", intCount: 0, strRoutePath: "/payroll/it-declaration-review" },
      { strCode: "missing_salary_structure", strLabel: "Missing Salary Structure", intCount: 0, strRoutePath: "/employee-salary" },
    ],
  });
  const objRecentRunsWidget = ensureWidget(dicWidgetMap.get("recent_payroll_runs"), "recent_payroll_runs", "Recent Payroll Runs", "table", { lstRows: [] });
  const objQuickActionsWidget = ensureWidget(dicWidgetMap.get("quick_actions"), "quick_actions", "Quick Actions", "actions", {
    lstActions: objDashboard.lstQuickActions || [],
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
  const [strSelectedMonth, setStrSelectedMonth] = useState(objNormalizedMonthOptions[0] || strAllMonthsValue);

  useEffect(() => {
    const lstSelectableMonths = [strAllMonthsValue, ...objNormalizedMonthOptions];
    if (!lstSelectableMonths.includes(strSelectedMonth)) {
      setStrSelectedMonth(objNormalizedMonthOptions[0] || strAllMonthsValue);
    }
  }, [objNormalizedMonthOptions, strSelectedMonth]);

  useEffect(() => {
    onPayrollMonthChange?.(strSelectedMonth === strAllMonthsValue ? null : strSelectedMonth);
  }, [strSelectedMonth, onPayrollMonthChange]);
  const objCurrentStage = lstStages.find((objStage) => objStage.strStatus === "in_progress")
    || lstStages.find((objStage) => objStage.strStatus === "pending")
    || lstStages[lstStages.length - 1];
  const intPendingApprovalCount = Number((((lstKpiWidgets.find((objWidget) => objWidget.strWidgetCode === "pending_approvals")?.objPayload as KpiPayload | undefined)?.intValue) || 0));
  const intValidationErrorCount = Number((((lstKpiWidgets.find((objWidget) => objWidget.strWidgetCode === "payroll_validation_errors")?.objPayload as KpiPayload | undefined)?.intValue) || 0));
  const intActionRequiredCount = intPendingApprovalCount + intValidationErrorCount;
  const strPayrollStatus = formatStatusText(String(objTrackerPayload.strRunStatus || ""));
  const objSelectedRun = resolveSelectedRun(lstRecentRunRows, strSelectedMonth, strAllMonthsValue);
  const strRunStatusRaw = String(objSelectedRun?.run_status || objTrackerPayload.strRunStatus || "");
  const lstLifecycleStages = buildLifecycleStages(strRunStatusRaw);
  const objRunDetailItems = buildPayrollRunDetailItems(objSelectedRun, t);
  const lstActionPanelItems = buildPayrollActionItems(strRunStatusRaw, objDashboard.lstQuickActions || [], t);
  const lstValidationCards = buildValidationCards(lstKpiWidgets, objSelectedRun, t);
  const lstExceptionItems = buildExceptionItems(lstAlerts, intPendingApprovalCount, intValidationErrorCount, objSelectedRun, t);
  const objReadiness = (objDashboard.payrollReadiness || {}) as ReadinessPayload;
  const lstApprovalAging = resolveApprovalAgingRows(objDashboard.approvalAging);
  const lstVarianceMetrics = resolveVarianceMetrics(objDashboard.variance);
  const lstHighRiskEmployees = resolveHighRiskEmployees(objDashboard.highRiskEmployees);
  const lstDetailedSummarySections = buildDetailedSummarySections(objDashboard);
  const objOutputReadiness = (objDashboard.outputReadiness || {}) as OutputReadinessPayload;
  const objAudit = (objDashboard.audit || {}) as AuditPayload;
  const lstExceptionGroups = resolveExceptionGroups(objDashboard.exceptions, lstExceptionItems);
  const objDashboardGridSpacing = { xs: 1.5, md: 2, xl: 2.25 };
  const strLastUpdated = formatDateTimeLabel(objDashboard.dtGeneratedOn);

  return (
    <Stack
      spacing={2.5}
      sx={{
        width: "100%",
        p: { xs: 0.25, md: 0.5 },
        background: "linear-gradient(180deg, #F6FAFF 0%, #F8FBFF 100%)",
        boxSizing: "border-box",
      }}
    >
      <Grid container columnSpacing={{ xs: 1.5, md: 2, lg: 0 }} rowSpacing={objDashboardGridSpacing} alignItems="stretch">
        <Grid item xs={12} lg={8}>
          <Paper
            sx={{
              p: { xs: 2, md: 2.5 },
              height: "100%",
              borderRadius: "18px",
              border: `1px solid ${DASHBOARD_COLORS.border}`,
              boxShadow: "0 10px 28px rgba(15,31,61,0.06)",
              background: "linear-gradient(110deg, #EBF4FF 0%, #F5F9FF 46%, #EEF5FF 100%)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  inset: 0,
                  background: "radial-gradient(circle at 18% -10%, rgba(255,255,255,0.88), rgba(255,255,255,0) 42%)",
                },
                "&::after": {
                  content: '""',
                  position: "absolute",
                  right: -42,
                  top: -20,
                  width: 560,
                  height: 240,
                  backgroundImage: "repeating-radial-gradient(circle at 100% 0%, rgba(255,255,255,0.65) 0 2px, rgba(255,255,255,0) 2px 16px)",
                  opacity: 0.75,
                },
              }}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.8} sx={{ position: "relative", zIndex: 1 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "linear-gradient(180deg, #4E8FFF 0%, #2563EB 100%)",
                  color: "#ffffff",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 14px 26px rgba(37,99,235,0.24)",
                  flexShrink: 0,
                }}
              >
                <CalendarMonthRoundedIcon sx={{ fontSize: 28 }} />
              </Box>
              <Stack spacing={1.35} sx={{ width: "100%" }}>
                <Box>
                  <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 800, letterSpacing: "-0.02em", fontSize: { xs: "1.2rem", md: "1.55rem" } }}>
                    {t("payroll_dashboard", "Payroll Dashboard")}
                  </Typography>
                  <Typography sx={{ mt: 0.35, color: "#5B6B87", fontSize: "0.92rem" }}>
                    {t("payroll_dashboard_subtitle", "Track payroll status, workflow progress, and items that need action.")}
                  </Typography>
                  <Typography sx={{ mt: 0.55, color: DASHBOARD_COLORS.muted, fontSize: "0.74rem", fontWeight: 600 }}>
                    {t("last_updated", "Last Updated")}: {strLastUpdated}
                  </Typography>
                </Box>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} flexWrap="wrap" useFlexGap>
                <StatusBadge
                  strLabel={t("payroll_status", "Payroll Status")}
                  strValue={strPayrollStatus || t("pending", "Pending")}
                  strAccent="#0E9FA8"
                  strBackground="rgba(255,255,255,0.62)"
                />
                <StatusBadge
                  strLabel={t("workflow", "Workflow")}
                  strValue={formatLifecycleLabel(strRunStatusRaw) || formatStageStatus(objCurrentStage?.strStatus || "pending", t)}
                  strAccent={DASHBOARD_COLORS.blue}
                  strBackground="rgba(255,255,255,0.72)"
                />
                <StatusBadge
                  strLabel={t("action_required", "Action Required")}
                  strValue={`${formatInteger(intActionRequiredCount)} ${t("items", "Items")}`}
                  strAccent={intActionRequiredCount > 0 ? DASHBOARD_COLORS.red : DASHBOARD_COLORS.green}
                  strBackground="rgba(255,255,255,0.62)"
                />
                </Stack>
              </Stack>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <Paper
            sx={{
              p: 2,
              height: "100%",
              borderRadius: "18px",
              border: `1px solid ${DASHBOARD_COLORS.border}`,
              boxShadow: "0 10px 28px rgba(15,31,61,0.06)",
              backgroundColor: DASHBOARD_COLORS.surface,
            }}
          >
            <Stack direction="row" spacing={1.4} alignItems="flex-start">
              <Box sx={{ width: 48, height: 48, borderRadius: "14px", backgroundColor: "#F1F6FF", border: `1px solid ${DASHBOARD_COLORS.border}`, display: "grid", placeItems: "center", color: DASHBOARD_COLORS.blue, flexShrink: 0 }}>
                <CalendarMonthRoundedIcon sx={{ fontSize: 24 }} />
              </Box>
              <Box sx={{ width: "100%" }}>
                <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.76rem", fontWeight: 700 }}>
                  {t("payroll_month", "Payroll Month")}
                  </Typography>
                  <Tooltip title={strError ? strError : t("refresh_dashboard", "Refresh dashboard")}>
                    <span>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<RefreshRoundedIcon sx={{ fontSize: 16 }} />}
                        onClick={onRefresh}
                        disabled={blnRefreshing}
                        sx={{ minWidth: "auto", px: 1.1, py: 0.35, borderRadius: "10px", textTransform: "none" }}
                      >
                        {blnRefreshing ? t("refreshing", "Refreshing") : t("refresh", "Refresh")}
                      </Button>
                    </span>
                  </Tooltip>
                </Stack>
                <Select
                  value={strSelectedMonth}
                  onChange={(objEvent) => setStrSelectedMonth(String(objEvent.target.value || ""))}
                  fullWidth
                  variant="standard"
                  disableUnderline
                  IconComponent={KeyboardArrowDownRoundedIcon}
                  sx={{
                    px: 1.5,
                    py: 0.35,
                    borderRadius: "14px",
                    border: `1px solid ${DASHBOARD_COLORS.border}`,
                    backgroundColor: "#FFFFFF",
                    fontWeight: 700,
                    color: DASHBOARD_COLORS.text,
                    "& .MuiSelect-select": { py: 1.15, pr: 4 },
                    "& .MuiSvgIcon-root": { color: DASHBOARD_COLORS.muted, right: 12 },
                  }}
                  renderValue={(strValue) => formatPayrollMonthSelectionLabel(String(strValue), t)}
                >
                  <MenuItem value={strAllMonthsValue}>
                    {t("all_months", "All Months")}
                  </MenuItem>
                  {objNormalizedMonthOptions.map((strMonth) => (
                    <MenuItem key={strMonth} value={strMonth}>
                      {formatLongMonth(strMonth)} Payroll
                    </MenuItem>
                  ))}
                </Select>
                <Typography sx={{ mt: 1.1, color: DASHBOARD_COLORS.muted, fontSize: "0.74rem", lineHeight: 1.45 }}>
                  {objSelectedRun
                    ? `${t("run_selected", "Selected Run")}: ${objSelectedRun.run_name || "-"}`
                    : t("no_run_selected_hint", "No payroll run found for the selected month in the current dashboard feed.")}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Grid container columnSpacing={{ xs: 1.5, md: 2, lg: 0 }} rowSpacing={objDashboardGridSpacing} alignItems="start">
        <Grid item xs={12} xl={4}>
          <ReadinessPanel objReadiness={objReadiness} t={t} />
        </Grid>
        <Grid item xs={12} xl={8}>
          <VariancePanel lstMetrics={lstVarianceMetrics} t={t} />
        </Grid>
      </Grid>

      <Grid container columnSpacing={{ xs: 1.5, md: 2, lg: 0 }} rowSpacing={objDashboardGridSpacing} alignItems="stretch">
        <Grid item xs={12} xl={7} sx={{ display: "flex" }}>
          <RunOverviewPanel
            objRun={objSelectedRun}
            lstDetails={objRunDetailItems}
            strRunStatus={strRunStatusRaw}
            t={t}
          />
        </Grid>
        <Grid item xs={12} md={6} xl={5} sx={{ display: "flex" }}>
          <RunActionPanel
            lstActions={lstActionPanelItems}
            strRunStatus={strRunStatusRaw}
            t={t}
          />
        </Grid>
      </Grid>

      <Grid container columnSpacing={{ xs: 1.5, md: 2, lg: 0 }} rowSpacing={objDashboardGridSpacing} alignItems="stretch">
        {lstKpiWidgets.map((objWidget, intIndex) => (
          <Grid key={objWidget.strWidgetCode} item xs={12} sm={6} xl={3} sx={{ display: "flex" }}>
            <PayrollKpiPanel
              objWidget={objWidget}
              objTone={lstPayrollCardPalette[intIndex % lstPayrollCardPalette.length]}
              strSelectedMonth={strSelectedMonth}
              strAllMonthsValue={strAllMonthsValue}
              t={t}
            />
          </Grid>
        ))}
      </Grid>

      <Grid container columnSpacing={{ xs: 1.5, md: 2, lg: 0 }} rowSpacing={objDashboardGridSpacing} alignItems="stretch">
        <Grid item xs={12} lg={8} sx={{ display: "flex" }}>
          <WorkflowPanel objWidget={objTrackerWidget} lstLifecycleStages={lstLifecycleStages} strRunStatus={strRunStatusRaw} t={t} />
        </Grid>
        <Grid item xs={12} lg={4} sx={{ display: "flex" }}>
          <ValidationSummaryPanel lstCards={lstValidationCards} t={t} />
        </Grid>
      </Grid>

      <Grid container columnSpacing={{ xs: 1.5, md: 2, lg: 0 }} rowSpacing={objDashboardGridSpacing} alignItems="stretch">
        <Grid item xs={12} lg={4} sx={{ display: "flex" }}>
          <AlertsPanel objWidget={objAlertsWidget} t={t} />
        </Grid>
        <Grid item xs={12} lg={8} sx={{ display: "flex" }}>
          <ExceptionPanel lstItems={lstExceptionItems} lstGroups={lstExceptionGroups} t={t} />
        </Grid>
      </Grid>

      <Grid container columnSpacing={{ xs: 1.5, md: 2, lg: 0 }} rowSpacing={objDashboardGridSpacing} alignItems="stretch">
        <Grid item xs={12} lg={7} sx={{ display: "flex" }}>
          <HighRiskEmployeesPanel lstEmployees={lstHighRiskEmployees} t={t} />
        </Grid>
        <Grid item xs={12} lg={5} sx={{ display: "flex" }}>
          <ApprovalAgingPanel lstRows={lstApprovalAging} t={t} />
        </Grid>
      </Grid>

      <Grid container columnSpacing={{ xs: 1.5, md: 2, lg: 0 }} rowSpacing={objDashboardGridSpacing} alignItems="stretch">
        {lstDetailedSummarySections.map((objSection) => (
          <Grid key={objSection.strCode} item xs={12} md={6} xl={3} sx={{ display: "flex" }}>
            <DetailedSummaryPanel strTitle={objSection.strTitle} strSubtitle={objSection.strSubtitle} lstStats={objSection.lstStats} strAccent={objSection.strAccent} />
          </Grid>
        ))}
      </Grid>

      <Grid container columnSpacing={{ xs: 1.5, md: 2, lg: 0 }} rowSpacing={objDashboardGridSpacing} alignItems="stretch">
        <Grid item xs={12} lg={6} sx={{ display: "flex" }}>
          <OutputReadinessPanel objOutputReadiness={objOutputReadiness} t={t} />
        </Grid>
        <Grid item xs={12} lg={6} sx={{ display: "flex" }}>
          <AuditPanel objAudit={objAudit} t={t} />
        </Grid>
      </Grid>

      <Grid container columnSpacing={{ xs: 1.5, md: 2, lg: 0 }} rowSpacing={objDashboardGridSpacing} alignItems="stretch">
        <Grid item xs={12} lg={7} sx={{ display: "flex" }}>
          <RecentRunsPanel objWidget={objRecentRunsWidget} t={t} />
        </Grid>
        <Grid item xs={12} lg={5} sx={{ display: "flex" }}>
          <QuickActionsPanel objWidget={objQuickActionsWidget} t={t} />
        </Grid>
      </Grid>

      <Grid container columnSpacing={{ xs: 1.5, md: 2, lg: 0 }} rowSpacing={objDashboardGridSpacing} alignItems="stretch">
        <Grid item xs={12} lg={6} sx={{ display: "flex" }}>
          <TrendChartPanel objWidget={dicWidgetMap.get("payroll_cost_trend")} t={t} />
        </Grid>
        <Grid item xs={12} lg={6} sx={{ display: "flex" }}>
          <BarChartPanel objWidget={dicWidgetMap.get("department_payroll_cost")} t={t} />
        </Grid>
      </Grid>
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
  const strValue = objPayload.decValue != null ? formatCurrency(objPayload.decValue) : formatInteger(objPayload.intValue || 0);
  const decTrendValue = objPayload.decTrendValue;
  const strComparisonMonth = formatComparisonMonth(strSelectedMonth === strAllMonthsValue ? "" : strSelectedMonth, t);
  const blnNegativeMetric = objWidget.strWidgetCode === "pending_approvals" || objWidget.strWidgetCode === "payroll_validation_errors";
  const strTrendIcon = decTrendValue == null ? "" : decTrendValue >= 0 ? "^" : "v";
  const strTrendText = decTrendValue == null
    ? objWidget.strWidgetCode === "employees_in_payroll"
      ? `${t("employees_in_selected_run", "Employees in selected run")}: ${formatInteger(Number(objPayload.intRunEmployeeCount || 0))}`
      : t("current_snapshot", "Current Snapshot")
    : `${strTrendIcon} ${Math.abs(decTrendValue)}% ${t("vs_previous", "vs")} ${strComparisonMonth}`;
  const objIcon = getKpiIcon(objWidget.strWidgetCode);
  const strSubtitle = objWidget.strWidgetCode === "net_payroll_amount"
    ? strSelectedMonth === strAllMonthsValue
      ? t("all_months_generated_payslips", "All Months (Generated Payslips)")
      : `This Month (${formatLongMonth(strSelectedMonth)})`
    : objPayload.strSubtitle || t("current_snapshot", "Current Snapshot");
  const strTitle = objWidget.strWidgetCode === "employees_in_payroll"
    ? t("total_employees", "Total Employees")
    : objWidget.strWidgetName;

  return (
    <Paper
      sx={{
        p: 2.25,
        width: "100%",
        minHeight: 144,
        height: "100%",
        borderRadius: "18px",
        border: `1px solid ${DASHBOARD_COLORS.border}`,
        boxShadow: "0 10px 28px rgba(15,31,61,0.06)",
        background: "linear-gradient(180deg, #FFFFFF 0%, #FBFDFF 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box sx={{ position: "absolute", inset: 0, borderTop: `3px solid ${objTone.accent}`, pointerEvents: "none" }} />
      <Stack justifyContent="space-between" sx={{ height: "100%" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
          <Stack direction="row" spacing={1.2} sx={{ minWidth: 0, flex: 1 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                flexShrink: 0,
                borderRadius: "12px",
                display: "grid",
                placeItems: "center",
                backgroundColor: objTone.surface,
                color: objTone.accent,
                border: `1px solid ${DASHBOARD_COLORS.border}`,
                boxShadow: "0 8px 18px rgba(15,31,61,0.05)",
              }}
            >
              {objIcon}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: DASHBOARD_COLORS.muted }}>
                {strTitle}
              </Typography>
              <Typography sx={{ mt: 1.05, fontSize: "1.95rem", lineHeight: 1.08, fontWeight: 800, color: DASHBOARD_COLORS.text }}>
                {strValue}
              </Typography>
              <Typography sx={{ mt: 0.55, fontSize: "0.82rem", color: DASHBOARD_COLORS.muted }}>
                {strSubtitle}
              </Typography>
            </Box>
          </Stack>
        </Stack>
        <Box sx={{ mt: 2 }}>
          <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: objTone.accent }}>
            {strTrendText}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function RunOverviewPanel({
  objRun,
  lstDetails,
  strRunStatus,
  t,
}: {
  objRun?: RecentRunRow;
  lstDetails: Array<{ strLabel: string; strValue: string }>;
  strRunStatus: string;
  t: RoleBasedDashboardProps["t"];
}) {
  return (
    <PanelShell
      strTitle={t("payroll_run_overview", "Payroll Run Overview")}
      strSubtitle={objRun ? `${objRun.run_name || "-"} • ${formatLongMonth(objRun.payroll_month || "")}` : t("no_payroll_run_available", "No payroll run available for the selected month")}
      strAccent={DASHBOARD_COLORS.blue}
    >
      {objRun ? (
        <Stack spacing={1.4}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between">
            <Box>
              <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 800, fontSize: "1.08rem" }}>
                {objRun.run_name || "-"}
              </Typography>
              <Typography sx={{ mt: 0.35, color: DASHBOARD_COLORS.muted, fontSize: "0.82rem" }}>
                {t("selected_month_cycle", "Selected month, company, cycle and last processing context")}
              </Typography>
            </Box>
            <Chip
              label={formatLifecycleLabel(strRunStatus)}
              size="small"
              sx={{
                fontWeight: 700,
                borderRadius: "999px",
                backgroundColor: chipBackground(strRunStatus),
                color: statusAccentColor(strRunStatus),
                fontSize: "0.72rem",
              }}
            />
          </Stack>
          <Grid container spacing={1.2}>
            {lstDetails.map((objDetail, intIndex) => (
              <Grid key={`${objDetail.strLabel}-${objDetail.strValue}-${intIndex}`} item xs={12} sm={6} lg={4}>
                <Box sx={{ p: 1.2, borderRadius: "14px", border: `1px solid ${DASHBOARD_COLORS.border}`, backgroundColor: "#FBFDFF", minHeight: 74 }}>
                  <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.72rem", fontWeight: 700 }}>
                    {objDetail.strLabel}
                  </Typography>
                  <Typography sx={{ mt: 0.45, color: DASHBOARD_COLORS.text, fontSize: "0.88rem", fontWeight: 700, lineHeight: 1.35 }}>
                    {objDetail.strValue}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Stack>
      ) : (
        <Stack spacing={1.1} sx={{ minHeight: 180, justifyContent: "center" }}>
          <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 800, fontSize: "0.98rem" }}>
            {t("no_run_for_selected_month", "No payroll run found for the selected month")}
          </Typography>
          <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.84rem", maxWidth: 560 }}>
            {t("no_run_for_selected_month_hint", "The current dashboard feed does not include a payroll run for this selection. Use the existing payroll run screen to create or review the cycle.")}
          </Typography>
          <Link href="/payroll/runs" style={{ color: DASHBOARD_COLORS.blue, fontWeight: 700, textDecoration: "none", fontSize: "0.84rem" }}>
            {t("open_payroll_runs", "Open Payroll Runs")}
          </Link>
        </Stack>
      )}
    </PanelShell>
  );
}

function RunActionPanel({ lstActions, strRunStatus, t }: { lstActions: PayrollActionItem[]; strRunStatus: string; t: RoleBasedDashboardProps["t"] }) {
  return (
    <PanelShell
      strTitle={t("run_actions", "Run Actions")}
      strSubtitle={`${t("status", "Status")}: ${formatLifecycleLabel(strRunStatus)}`}
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

function WorkflowPanel({
  objWidget,
  lstLifecycleStages,
  strRunStatus,
  t,
}: {
  objWidget?: DashboardWidget;
  lstLifecycleStages: Array<{ strLabel: string; strState: "completed" | "active" | "upcoming" | "locked" }>;
  strRunStatus: string;
  t: RoleBasedDashboardProps["t"];
}) {
  const objPayload = ((objWidget?.objPayload as { lstStages?: TrackerStage[] } | undefined) || {});
  const lstStages = (objPayload.lstStages || []) as TrackerStage[];
  const objCurrentStage = lstStages.find((objStage) => objStage.strStatus === "in_progress")
    || lstStages.find((objStage) => objStage.strStatus === "pending")
    || lstStages[lstStages.length - 1];
  const decCompletedStageUnits = lstStages.reduce((decSum, objStage) => (
    decSum + (objStage.strStatus === "completed" ? 1 : objStage.strStatus === "in_progress" ? 0.5 : 0)
  ), 0);
  const decProgressPercent = lstStages.length ? Math.max(0, Math.min(100, (decCompletedStageUnits / lstStages.length) * 100)) : 0;

  return (
    <PanelShell
      strTitle={t("payroll_workflow", "Payroll Workflow")}
      strSubtitle={objCurrentStage ? `${t("current_stage", "Current Stage")}: ${objCurrentStage.strLabel} • ${t("run_status", "Run Status")}: ${formatLifecycleLabel(strRunStatus)}` : undefined}
      strAccent={DASHBOARD_COLORS.blue}
    >
      <Stack spacing={2}>
        <Grid container spacing={1.1}>
          {lstLifecycleStages.map((objStage, intIndex) => {
            const objTone = lifecycleTone(objStage.strState);
            return (
              <Grid key={`${objStage.strLabel}-${intIndex}`} item xs={12} sm={6} lg={4}>
                <Box sx={{ p: 1.1, borderRadius: "14px", border: `1px solid ${objTone.border}`, backgroundColor: objTone.surface, minHeight: 92 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#fff", border: `2px solid ${objTone.accent}`, color: objTone.accent, display: "grid", placeItems: "center", fontWeight: 800, fontSize: "0.75rem", flexShrink: 0 }}>
                      {intIndex + 1}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 700, fontSize: "0.78rem" }}>
                        {objStage.strLabel}
                      </Typography>
                      <Typography sx={{ mt: 0.28, color: objTone.accent, fontWeight: 700, fontSize: "0.72rem" }}>
                        {formatLifecycleState(objStage.strState, t)}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Grid>
            );
          })}
        </Grid>
        <Box sx={{ pt: 0.25 }}>
        <Box sx={{ display: { xs: "none", md: "block" }, position: "relative", height: 30, mb: 1.65 }}>
          <Box sx={{ position: "absolute", left: 0, right: 0, top: 14, height: 2, backgroundColor: "#DDE7F0" }} />
          <Box sx={{ position: "absolute", left: 0, width: `${decProgressPercent}%`, top: 14, height: 2, backgroundColor: DASHBOARD_COLORS.green }} />
          <Box sx={{ position: "absolute", left: `${decProgressPercent}%`, right: 0, top: 14, height: 2, background: "repeating-linear-gradient(90deg, #FB923C 0 5px, transparent 5px 9px)" }} />
          {lstStages.map((objStage, intIndex) => {
            const decLeft = lstStages.length > 1 ? (intIndex / (lstStages.length - 1)) * 100 : 0;
            const strAccent = objStage.strStatus === "completed"
              ? DASHBOARD_COLORS.green
              : objStage.strStatus === "in_progress"
                ? DASHBOARD_COLORS.green
                : DASHBOARD_COLORS.amber;
            return (
              <Box key={`${objStage.strCode}-marker`} sx={{ position: "absolute", left: `calc(${decLeft}% - 14px)`, top: 0, width: 28, height: 28, borderRadius: "50%", border: `2px solid ${strAccent}`, backgroundColor: "#fff", color: strAccent, display: "grid", placeItems: "center", fontWeight: 800, fontSize: "0.78rem", boxShadow: "0 4px 10px rgba(15,31,61,0.05)" }}>
                {intIndex + 1}
              </Box>
            );
          })}
        </Box>
        <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 1.35, md: 1.25 }} sx={{ pt: 0.2 }}>
        {lstStages.map((objStage, intIndex) => {
          const strAccent = objStage.strStatus === "completed"
            ? DASHBOARD_COLORS.green
            : objStage.strStatus === "in_progress"
              ? DASHBOARD_COLORS.green
              : DASHBOARD_COLORS.amber;
          const objStageIcon = objStage.strCode === "data_collection"
            ? <PaymentsRoundedIcon sx={{ fontSize: 18 }} />
            : objStage.strCode === "validation"
              ? <AssignmentTurnedInRoundedIcon sx={{ fontSize: 18 }} />
              : objStage.strCode === "processing"
                ? <SettingsRoundedIcon sx={{ fontSize: 18 }} />
                : objStage.strCode === "approval"
                  ? <PeopleAltRoundedIcon sx={{ fontSize: 18 }} />
                  : <AccountBalanceWalletRoundedIcon sx={{ fontSize: 18 }} />;

          return (
            <Stack key={objStage.strCode} direction={{ xs: "row", md: "column" }} spacing={1.1} sx={{ flex: 1, minWidth: 0, alignItems: { xs: "center", md: "stretch" } }}>
              <Stack direction={{ xs: "row", md: "column" }} spacing={1.1} sx={{ flex: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    minWidth: { xs: 40, md: "auto" },
                    width: { xs: 40, md: "auto" },
                    height: { xs: 40, md: 0 },
                    px: { xs: 0, md: 1.1 },
                    py: { xs: 0, md: 0.8 },
                    borderRadius: { xs: "50%", md: "14px" },
                    border: `2px solid ${strAccent}`,
                    backgroundColor: { xs: "#fff", md: "#fff" },
                    color: strAccent,
                    fontWeight: 800,
                    fontSize: "0.78rem",
                    textAlign: "center",
                    display: { xs: "grid", md: "none" },
                    placeItems: "center",
                  }}
                >
                  {intIndex + 1}
                </Box>
                <Box
                  sx={{
                    p: 1.25,
                    minHeight: { xs: 82, md: 92 },
                    borderRadius: "12px",
                    border: `1px solid ${objStage.strStatus === "pending" ? "#F7C99D" : objStage.strStatus === "completed" ? "#BFE7CC" : "#F3D0AE"}`,
                    backgroundColor: objStage.strStatus === "pending" ? "#FFFDFC" : "#FBFFFC",
                    boxShadow: "0 6px 14px rgba(15,31,61,0.04)",
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Stack direction="row" spacing={0.85} alignItems="center" sx={{ minWidth: 0 }}>
                      <Box sx={{ width: 24, height: 24, borderRadius: "8px", display: "grid", placeItems: "center", color: strAccent }}>
                        {objStageIcon}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 700, fontSize: "0.8rem", lineHeight: 1.25 }}>
                          {objStage.strLabel}
                        </Typography>
                        <Typography sx={{ mt: 0.35, fontSize: "0.76rem", color: strAccent, fontWeight: 700 }}>
                          {formatStageStatus(objStage.strStatus, t)}
                        </Typography>
                      </Box>
                    </Stack>
                    <CheckCircleRoundedIcon sx={{ color: objStage.strStatus === "pending" ? DASHBOARD_COLORS.amber : strAccent, fontSize: 16, flexShrink: 0 }} />
                  </Stack>
                </Box>
              </Stack>
            </Stack>
          );
        })}
        </Stack>
        </Box>
      </Stack>
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

function ReadinessPanel({ objReadiness, t }: { objReadiness: ReadinessPayload; t: RoleBasedDashboardProps["t"] }) {
  const decScore = Math.max(0, Math.min(100, Number(objReadiness.decScore || 0)));
  const strStatus = String(objReadiness.strStatus || "Not Ready");
  const lstBreakdown = objReadiness.lstBreakdown || [];
  return (
    <PanelShell strTitle={t("payroll_readiness", "Payroll Readiness")} strSubtitle={t("payroll_readiness_subtitle", "Operational readiness based on current blockers, warnings and pending setup")} strAccent={readinessAccent(strStatus)}>
      <Stack spacing={1.4}>
        <Stack direction="row" spacing={1.2} alignItems="center" justifyContent="space-between">
          <Stack spacing={0.45}>
            <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 800, fontSize: "1.8rem" }}>{decScore.toFixed(decScore % 1 ? 1 : 0)}%</Typography>
            <Chip label={strStatus} size="small" sx={{ width: "fit-content", fontWeight: 700, borderRadius: "999px", backgroundColor: softColor(readinessAccent(strStatus)), color: readinessAccent(strStatus) }} />
          </Stack>
          <ProgressRing decPercent={decScore} strColor={readinessAccent(strStatus)} strLabel={t("ready", "Ready")} />
        </Stack>
        <MiniProgressBar decValue={decScore} strColor={readinessAccent(strStatus)} />
        <Grid container spacing={1}>
          <Grid item xs={4}>
            <MetricPill strLabel={t("blocking", "Blocking")} strValue={formatInteger(Number(objReadiness.intBlockingCount || 0))} strTone={DASHBOARD_COLORS.red} />
          </Grid>
          <Grid item xs={4}>
            <MetricPill strLabel={t("warning", "Warning")} strValue={formatInteger(Number(objReadiness.intWarningCount || 0))} strTone={DASHBOARD_COLORS.amber} />
          </Grid>
          <Grid item xs={4}>
            <MetricPill strLabel={t("info", "Info")} strValue={formatInteger(Number(objReadiness.intInfoCount || 0))} strTone={DASHBOARD_COLORS.blue} />
          </Grid>
        </Grid>
        {lstBreakdown.length ? (
          <Stack spacing={0.8}>
            {lstBreakdown.slice(0, 4).map((objItem, intIndex) => (
              <CompactStatRow key={`${objItem.strLabel}-${intIndex}`} strLabel={objItem.strLabel} strValue={objItem.decValue != null ? formatCurrency(Number(objItem.decValue || 0)) : formatInteger(Number(objItem.intValue || 0))} />
            ))}
          </Stack>
        ) : (
          <CompactEmptyState strTitle={t("no_readiness_breakdown", "No readiness breakdown yet")} strSubtitle={t("no_readiness_breakdown_hint", "Readiness details will appear after the dashboard validations run.")} />
        )}
      </Stack>
    </PanelShell>
  );
}

function VariancePanel({ lstMetrics, t }: { lstMetrics: VarianceMetric[]; t: RoleBasedDashboardProps["t"] }) {
  return (
    <PanelShell
      strTitle={t("month_on_month_variance", "Month-on-Month Variance")}
      strSubtitle={t("month_on_month_variance_subtitle", "Compare current month output against the previous payroll month")}
      strAccent={DASHBOARD_COLORS.blue}
      blnAutoHeight
    >
      {lstMetrics.length ? (
        <Grid container spacing={1.1}>
          {lstMetrics.map((objMetric, intIndex) => (
            <Grid key={`${objMetric.strLabel}-${intIndex}`} item xs={12} sm={6} lg={3}>
              <Box sx={{ p: 1.1, borderRadius: "14px", border: `1px solid ${DASHBOARD_COLORS.border}`, backgroundColor: "#FBFDFF", minHeight: 92 }}>
                <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.74rem", fontWeight: 700 }}>{objMetric.strLabel}</Typography>
                <Typography sx={{ mt: 0.45, color: DASHBOARD_COLORS.text, fontSize: "0.98rem", fontWeight: 800 }}>
                  {formatMetricValue(objMetric.decCurrent, objMetric.blnCurrency)}
                </Typography>
                <Typography sx={{ mt: 0.2, color: DASHBOARD_COLORS.muted, fontSize: "0.73rem" }}>
                  {t("previous", "Previous")}: {formatMetricValue(objMetric.decPrevious, objMetric.blnCurrency)}
                </Typography>
                <Typography sx={{ mt: 0.4, color: varianceColor(objMetric.decVariancePercent), fontSize: "0.75rem", fontWeight: 700 }}>
                  {formatTrendText(objMetric.decVariancePercent)}
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

function ExceptionPanel({ lstItems, lstGroups, t }: { lstItems: Array<{ strCode: string; strLabel: string; intCount: number; strSeverity: "Blocking" | "Warning" | "Info"; strRoutePath: string; strReason: string }>; lstGroups: ExceptionGroup[]; t: RoleBasedDashboardProps["t"] }) {
  const [strFilter, setStrFilter] = useState<"All" | "Blocking" | "Warning" | "Info">("All");
  const [blnExpanded, setBlnExpanded] = useState(false);
  const lstVisibleGroups = lstGroups.filter((objGroup) => strFilter === "All" || objGroup.strSeverity === strFilter);
  const lstVisibleItems = lstVisibleGroups.flatMap((objGroup) => objGroup.lstItems.map((objItem) => ({ ...objItem, strSeverity: objGroup.strSeverity })));
  const lstRenderedItems = blnExpanded ? lstVisibleItems : lstVisibleItems.slice(0, 5);
  return (
    <PanelShell strTitle={t("exception_first", "Exception-First View")} strSubtitle={t("exception_first_subtitle", "The highest-priority issues are surfaced before tables and charts")} strAccent={DASHBOARD_COLORS.red}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
          {(["All", "Blocking", "Warning", "Info"] as const).map((strItem) => (
            <Chip key={strItem} label={strItem} size="small" clickable onClick={() => setStrFilter(strItem)} sx={{ borderRadius: "999px", fontWeight: 700, backgroundColor: strFilter === strItem ? softColor(exceptionTone(strItem === "All" ? "Info" : strItem).accent) : "#F8FAFC", color: strFilter === strItem ? exceptionTone(strItem === "All" ? "Info" : strItem).accent : DASHBOARD_COLORS.muted }} />
          ))}
        </Stack>
        {lstRenderedItems.map((objItem) => {
          const objTone = exceptionTone(objItem.strSeverity);
          return (
            <Link key={objItem.strCode} href={objItem.strRoutePath || "/payroll/runs"} style={{ textDecoration: "none" }}>
              <Box sx={{ p: 1.15, borderRadius: "14px", border: `1px solid ${objTone.border}`, backgroundColor: objTone.surface }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={0.8} alignItems="center" sx={{ flexWrap: "wrap" }} useFlexGap>
                      <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 700, fontSize: "0.82rem" }}>
                        {objItem.strLabel}
                      </Typography>
                      <Chip label={objItem.strSeverity} size="small" sx={{ height: 22, borderRadius: "999px", backgroundColor: objTone.surface, color: objTone.accent, fontWeight: 700, fontSize: "0.67rem", border: `1px solid ${objTone.border}` }} />
                    </Stack>
                    <Typography sx={{ mt: 0.35, color: DASHBOARD_COLORS.muted, fontSize: "0.75rem" }}>
                      {objItem.strReason}
                    </Typography>
                  </Box>
                  <Typography sx={{ color: objTone.accent, fontWeight: 800, fontSize: "0.84rem", whiteSpace: "nowrap" }}>
                    {formatInteger(objItem.intCount)} {t("items", "Items")}
                  </Typography>
                </Stack>
              </Box>
            </Link>
          );
        })}
        {!lstRenderedItems.length ? <CompactEmptyState strTitle={t("no_exceptions", "No exceptions")} strSubtitle={t("no_exceptions_hint", "There are no issues for the current filter.")} /> : null}
        <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
          <Link href="/payroll/runs" style={{ color: DASHBOARD_COLORS.blue, textDecoration: "none", fontWeight: 700, fontSize: "0.82rem" }}>
            {t("view_all_issues", "View All Issues")}
          </Link>
          {lstVisibleItems.length > 5 ? (
            <Button size="small" onClick={() => setBlnExpanded((blnValue) => !blnValue)} sx={{ textTransform: "none" }}>
              {blnExpanded ? t("show_less", "Show Less") : t("show_more", "Show More")}
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </PanelShell>
  );
}

function AlertsPanel({ objWidget, t }: { objWidget?: DashboardWidget; t: RoleBasedDashboardProps["t"] }) {
  const lstAlerts = (((objWidget?.objPayload as { lstAlerts?: AlertRow[] } | undefined)?.lstAlerts) || []) as AlertRow[];
  const intTotal = lstAlerts.reduce((intSum, objAlert) => intSum + Number(objAlert.intCount || 0), 0);

  return (
    <PanelShell
      strTitle={t("action_required", "Action Required")}
      strSubtitle={intTotal > 0 ? `${formatInteger(intTotal)} ${t("open_items", "open items")}` : t("all_clear", "No blockers")}
      strAccent={intTotal > 0 ? DASHBOARD_COLORS.red : DASHBOARD_COLORS.green}
    >
      <Stack spacing={1}>
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Chip label={`${formatInteger(intTotal)} ${t("open_items", "open items")}`} size="small" sx={{ height: 24, borderRadius: "999px", backgroundColor: "#F8FAFC", color: DASHBOARD_COLORS.muted, fontWeight: 700, fontSize: "0.68rem" }} />
        </Box>
        {lstAlerts.map((objAlert) => {
          const blnHasCount = Number(objAlert.intCount || 0) > 0;
          return (
            <Box
              key={objAlert.strCode}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                borderRadius: "12px",
                px: 1.25,
                py: 0.72,
                border: `1px solid ${blnHasCount ? "#F9D2D2" : DASHBOARD_COLORS.border}`,
                backgroundColor: "#FFF8F8",
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                <Box sx={{ width: 22, height: 22, borderRadius: "8px", display: "grid", placeItems: "center", backgroundColor: "#FEEAEA" }}>
                  <WarningAmberRoundedIcon sx={{ color: blnHasCount ? DASHBOARD_COLORS.red : DASHBOARD_COLORS.amber, fontSize: 16 }} />
                </Box>
                <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 600, fontSize: "0.82rem", lineHeight: 1.35 }}>
                  {objAlert.strLabel}
                </Typography>
              </Stack>
              <Typography sx={{ color: blnHasCount ? DASHBOARD_COLORS.red : DASHBOARD_COLORS.muted, fontWeight: 800, fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                {formatInteger(objAlert.intCount)} {t("employees", "Employees")}
              </Typography>
            </Box>
          );
        })}
        <Link href="/employees" style={{ display: "inline-block", marginTop: 8, color: DASHBOARD_COLORS.blue, textDecoration: "none", fontWeight: 700, fontSize: "0.82rem" }}>
          {t("view_all_alerts", "View All Alerts")}
        </Link>
      </Stack>
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
          {blnShowItRing ? <ProgressRing decPercent={(intPrimary / Math.max(intPrimary + intSecondary, 1)) * 100} strColor={objTone.accent} strLabel="Filed" /> : null}
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
          {blnShowReimbursementRing ? <ProgressRing decPercent={decPercent} strColor={objTone.accent} strLabel="Approved" /> : null}
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
                    {t("average_age", "Average Age")}: {formatDays(objRow.decAverageDays)}
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
    { strLabel: t("last_validated", "Last Validated"), strValue: joinActorDate(objAudit.strLastValidatedBy, objAudit.dtLastValidatedOn) },
    { strLabel: t("last_processed", "Last Processed"), strValue: joinActorDate(objAudit.strLastProcessedBy, objAudit.dtLastProcessedOn) },
    { strLabel: t("reprocess_count", "Reprocess Count"), strValue: formatInteger(Number(objAudit.intReprocessCount || 0)) },
    { strLabel: t("reprocess_reason", "Last Reprocess Reason"), strValue: String(objAudit.strLastReprocessReason || "-") },
    { strLabel: t("closed_on", "Closed By / On"), strValue: joinActorDate(objAudit.strClosedBy, objAudit.dtClosedOn) },
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

function RecentRunsPanel({ objWidget, t }: { objWidget?: DashboardWidget; t: RoleBasedDashboardProps["t"] }) {
  const lstRows = (((objWidget?.objPayload as { lstRows?: RecentRunRow[] } | undefined)?.lstRows) || []) as RecentRunRow[];
  return (
    <PanelShell strTitle={resolveWidgetTitle(t, objWidget?.strWidgetCode, objWidget?.strWidgetName || "Recent Payroll Runs")} strAccent={DASHBOARD_COLORS.blue}>
      <Stack spacing={1}>
        <Box
          sx={{
            display: { xs: "none", md: "grid" },
            gridTemplateColumns: "1.1fr 1fr 0.95fr 1fr 0.72fr 1.25fr 0.95fr 32px",
            gap: 1,
            px: 1,
            color: DASHBOARD_COLORS.muted,
            fontSize: "0.72rem",
            fontWeight: 700,
          }}
        >
          <Typography sx={{ fontSize: "0.72rem" }}>Payroll Month</Typography>
          <Typography sx={{ fontSize: "0.72rem" }}>Status</Typography>
          <Typography sx={{ fontSize: "0.72rem" }}>Stage</Typography>
          <Typography sx={{ fontSize: "0.72rem" }}>Net Payroll Amount</Typography>
          <Typography sx={{ fontSize: "0.72rem" }}>Employees</Typography>
          <Typography sx={{ fontSize: "0.72rem" }}>Processed On</Typography>
          <Typography sx={{ fontSize: "0.72rem" }}>Run</Typography>
          <Typography sx={{ fontSize: "0.72rem" }} />
        </Box>
        {lstRows.length ? (
          lstRows.map((objRow) => (
            <Box
              key={objRow.id}
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1.1fr 1fr 0.95fr 1fr 0.72fr 1.25fr 0.95fr 32px" },
                gap: { xs: 0.65, md: 1 },
                borderRadius: "12px",
                px: 1.1,
                py: 0.9,
                border: `1px solid ${DASHBOARD_COLORS.border}`,
                backgroundColor: "#FFFFFF",
              }}
            >
              <Box>
                <Typography sx={{ display: { xs: "block", md: "none" }, color: DASHBOARD_COLORS.muted, fontSize: "0.72rem", mb: 0.2 }}>Payroll Month</Typography>
                <Typography sx={{ fontWeight: 700, color: DASHBOARD_COLORS.text, fontSize: "0.88rem" }}>{formatLongMonth(objRow.payroll_month)}</Typography>
              </Box>
              <Box>
                <Typography sx={{ display: { xs: "block", md: "none" }, color: DASHBOARD_COLORS.muted, fontSize: "0.72rem", mb: 0.2 }}>Status</Typography>
                <Chip label={formatStatusText(objRow.run_status)} size="small" sx={{ fontWeight: 700, borderRadius: "999px", backgroundColor: chipBackground(objRow.run_status), color: statusAccentColor(objRow.run_status), fontSize: "0.7rem" }} />
              </Box>
              <Box>
                <Typography sx={{ display: { xs: "block", md: "none" }, color: DASHBOARD_COLORS.muted, fontSize: "0.72rem", mb: 0.2 }}>Stage</Typography>
                <Chip label={objRow.validation_status ? formatStatusText(objRow.validation_status) : "Completed"} size="small" sx={{ fontWeight: 700, borderRadius: "999px", backgroundColor: chipBackground(objRow.validation_status || "completed"), color: statusAccentColor(objRow.validation_status || "completed"), fontSize: "0.7rem" }} />
              </Box>
              <Box>
                <Typography sx={{ display: { xs: "block", md: "none" }, color: DASHBOARD_COLORS.muted, fontSize: "0.72rem", mb: 0.2 }}>Net Payroll Amount</Typography>
                <Typography sx={{ color: DASHBOARD_COLORS.text, fontSize: "0.82rem", fontWeight: 700 }}>{formatCurrency(objRow.net_pay_total || 0)}</Typography>
              </Box>
              <Box>
                <Typography sx={{ display: { xs: "block", md: "none" }, color: DASHBOARD_COLORS.muted, fontSize: "0.72rem", mb: 0.2 }}>Employees</Typography>
                <Typography sx={{ color: DASHBOARD_COLORS.text, fontSize: "0.82rem", fontWeight: 700 }}>{formatInteger(objRow.employee_count || 0)}</Typography>
              </Box>
              <Box>
                <Typography sx={{ display: { xs: "block", md: "none" }, color: DASHBOARD_COLORS.muted, fontSize: "0.72rem", mb: 0.2 }}>Processed On</Typography>
                <Typography sx={{ color: "#475569", fontSize: "0.82rem", fontWeight: 600 }}>{formatDateTimeLabel(objRow.processed_on)}</Typography>
              </Box>
              <Box>
                <Typography sx={{ display: { xs: "block", md: "none" }, color: DASHBOARD_COLORS.muted, fontSize: "0.72rem", mb: 0.2 }}>Run</Typography>
                <Typography sx={{ color: DASHBOARD_COLORS.text, fontSize: "0.82rem", fontWeight: 600 }}>
                  {String(objRow.run_name || `Run #${objRow.id}`)}
                </Typography>
              </Box>
              <Box sx={{ display: "grid", placeItems: "center", color: DASHBOARD_COLORS.muted }}>
                <MoreVertRoundedIcon sx={{ fontSize: 18 }} />
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
  const lstActions = (((objWidget?.objPayload as { lstActions?: DashboardQuickAction[] } | undefined)?.lstActions) || []) as DashboardQuickAction[];
  return (
    <PanelShell strTitle={resolveWidgetTitle(t, objWidget?.strWidgetCode, objWidget?.strWidgetName || "Quick Actions")} strAccent={DASHBOARD_COLORS.blue}>
      <Grid container spacing={1.25}>
        {lstActions.length ? lstActions.map((objAction) => (
          <Grid key={objAction.strActionCode} item xs={12} sm={6} sx={{ display: "flex" }}>
            <Link href={objAction.strRoutePath || "/dashboard"} style={{ display: "block", width: "100%", textDecoration: "none" }}>
              <Paper sx={{ p: 1.4, height: "100%", borderRadius: "16px", border: `1px solid ${DASHBOARD_COLORS.border}`, boxShadow: "none", backgroundColor: "#f8fafc" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: "12px", backgroundColor: quickActionColor(objAction.strActionCode), display: "grid", placeItems: "center", flexShrink: 0 }}>
                      {renderQuickActionIcon(objAction.strActionCode)}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, color: DASHBOARD_COLORS.text, fontSize: "0.82rem", lineHeight: 1.3 }}>{objAction.strActionName}</Typography>
                      <Typography sx={{ mt: 0.2, color: DASHBOARD_COLORS.muted, fontSize: "0.72rem", lineHeight: 1.35 }}>{quickActionSubtitle(objAction.strActionCode, t)}</Typography>
                    </Box>
                  </Stack>
                  <ArrowForwardRoundedIcon sx={{ fontSize: 18, color: DASHBOARD_COLORS.blue, flexShrink: 0 }} />
                </Stack>
              </Paper>
            </Link>
          </Grid>
        )) : (
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
                  {t("no_actions_available", "No quick actions yet")}
                </Typography>
                <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.82rem", textAlign: "center", maxWidth: 320 }}>
                  {t("quick_actions_empty_hint", "Add shortcuts to the actions you use most.")}
                </Typography>
                <Stack direction="row" spacing={1.2} sx={{ pt: 0.8 }}>
                  <Link
                    href="/payroll/runs"
                    style={{
                      padding: "0.9rem 2.2rem",
                      borderRadius: "10px",
                      border: `1px solid ${DASHBOARD_COLORS.border}`,
                      backgroundColor: "#FFFFFF",
                      color: DASHBOARD_COLORS.blue,
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      textDecoration: "none",
                    }}
                  >
                    + Add Action
                  </Link>
                  <Link
                    href="/reports"
                    style={{
                      padding: "0.9rem 2.2rem",
                      borderRadius: "10px",
                      border: `1px solid ${DASHBOARD_COLORS.border}`,
                      backgroundColor: "#FFFFFF",
                      color: DASHBOARD_COLORS.blue,
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      textDecoration: "none",
                    }}
                  >
                    Browse Actions
                  </Link>
                </Stack>
              </Stack>
            </Box>
          </Grid>
        )}
      </Grid>
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
  const ESS_COLORS = {
    navy: "#0F1F3D",
    teal: "#0E9FA8",
    blue: "#2563EB",
    green: "#16A34A",
    orange: "#F97316",
    bg: "#F8FBFF",
    card: "#FFFFFF",
    border: "#DDE7F0",
    body: "#475569",
    muted: "#64748B",
    error: "#EF4444",
    hero: "linear-gradient(120deg,#E6FAFB 0%,#EFF8FF 45%,#DCEEFF 100%)",
  };
  const objCardSx = {
    width: "100%",
    height: "100%",
    borderRadius: "18px",
    border: `1px solid ${ESS_COLORS.border}`,
    backgroundColor: ESS_COLORS.card,
    boxShadow: "0 10px 28px rgba(15, 31, 61, 0.06)",
  } as const;
  const lstWidgets = objDashboard.lstWidgets.map(normalizeDashboardWidget);
  const objWelcomeWidget = lstWidgets.find((objWidget) => objWidget.strWidgetCode === "welcome_profile");
  const objPayWidget = lstWidgets.find((objWidget) => objWidget.strWidgetCode === "current_month_pay");
  const objProfileWidget = lstWidgets.find((objWidget) => objWidget.strWidgetCode === "profile_completeness");
  const objItWidget = lstWidgets.find((objWidget) => objWidget.strWidgetCode === "it_declaration_card");
  const objReimbursementWidget = lstWidgets.find((objWidget) => objWidget.strWidgetCode === "reimbursement_card");
  const objPendingWidget = lstWidgets.find((objWidget) => objWidget.strWidgetCode === "pending_actions");
  const objPayslipWidget = lstWidgets.find((objWidget) => objWidget.strWidgetCode === "last_3_payslips");
  const objQuickActionsWidget = lstWidgets.find((objWidget) => objWidget.strWidgetCode === "quick_actions");
  const objWelcome = (objWelcomeWidget?.objPayload || {}) as Record<string, unknown>;
  const objPay = (objPayWidget?.objPayload || {}) as Record<string, unknown>;
  const objProfile = (objProfileWidget?.objPayload || {}) as Record<string, unknown>;
  const lstProfileChecks = ((objProfile.lstChecks as EssProfileCheck[]) || []);
  const lstPendingActions = (((objPendingWidget?.objPayload as { lstAlerts?: AlertRow[] } | undefined)?.lstAlerts) || []) as AlertRow[];
  const lstPayslips = (((objPayslipWidget?.objPayload as { lstRows?: EssPayslipRow[] } | undefined)?.lstRows) || []) as EssPayslipRow[];
  const lstQuickActions = (((objQuickActionsWidget?.objPayload as { lstActions?: DashboardQuickAction[] } | undefined)?.lstActions) || []) as DashboardQuickAction[];
  const strEmployeeName = String(objWelcome.strEmployeeName || "Employee");
  const strAvatarUrl = objUserContext.strAvatarUrl || objUserContext.objEmployee?.strProfilePhotoUrl || "";
  const strJoinedOn = objWelcome.strJoinedOn ? formatDateLabel(String(objWelcome.strJoinedOn)) : "Not available";
  const strDesignation = String(objWelcome.strDesignationName || "Employee");
  const strDepartment = String(objWelcome.strDepartmentName || "Department");
  const strLocation = String(objWelcome.strLocationName || "Location");
  const intProfileCompletionPercent = Number(objProfile.intCompletionPercent || 0);
  const lstProfileChartPoints = ((objProfile.lstPoints as ChartPoint[]) || []);
  const lstReimbursementStats = ((((objReimbursementWidget?.objPayload as { lstStats?: SummaryStat[] } | undefined)?.lstStats) || []) as SummaryStat[]);
  const intTotalClaims = Number(lstReimbursementStats.find((objStat) => objStat.strLabel.toLowerCase().includes("total claims"))?.intValue || 0);
  const intApprovedClaims = Number(lstReimbursementStats.find((objStat) => objStat.strLabel.toLowerCase().includes("approved"))?.intValue || 0);
  const decTotalClaimAmount = Number(lstReimbursementStats.find((objStat) => objStat.strLabel.toLowerCase().includes("total amount"))?.decValue || 0);
  const strItStatus = String((objItWidget?.objPayload as Record<string, unknown> | undefined)?.strStatus || "not started");
  const intProofPendingCount = Number((objItWidget?.objPayload as Record<string, unknown> | undefined)?.intProofPendingCount || 0);
  const strItSubmittedOn = (objItWidget?.objPayload as Record<string, unknown> | undefined)?.dtSubmittedOn
    || (objItWidget?.objPayload as Record<string, unknown> | undefined)?.strSubmittedOn;
  const strItDeclarationType = String((objItWidget?.objPayload as Record<string, unknown> | undefined)?.strDeclarationType || "");
  const objPrimaryPendingAction = lstPendingActions[0];
  const intCompletedChecks = lstProfileChecks.filter((objCheck) => objCheck.blnComplete).length;
  const strDashboardTitle = t("ess_title_heading", "Employee Self Service Dashboard");
  const strDashboardSubtitle = t("ess_title", "Welcome back, here's what's happening with you");
  const lstAnnouncements: InfoCardRow[] = [];
  const lstPolicies: InfoCardRow[] = [];
  const lstHeroDetails: EssHeroDetail[] = [
    { strLabel: "Department", strValue: strDepartment, objIcon: <ApartmentRoundedIcon sx={{ fontSize: 22 }} /> },
    { strLabel: "Location", strValue: strLocation, objIcon: <LocationOnRoundedIcon sx={{ fontSize: 22 }} /> },
    { strLabel: "Joined on", strValue: strJoinedOn, objIcon: <CalendarTodayRoundedIcon sx={{ fontSize: 20 }} /> },
  ];

  return (
    <Stack spacing={2.25} sx={{ p: { xs: 1, md: 1.5 }, backgroundColor: ESS_COLORS.bg }}>
      <Box sx={{ px: { xs: 0.25, md: 0.5 } }}>
        <Typography sx={{ color: ESS_COLORS.navy, fontWeight: 800, letterSpacing: "-0.02em", fontSize: { xs: "1.12rem", md: "1.45rem" } }}>
          {strDashboardTitle}
        </Typography>
        <Typography sx={{ mt: 0.35, color: ESS_COLORS.muted, fontSize: "0.86rem" }}>
          {strDashboardSubtitle}
        </Typography>
      </Box>

      <Grid container spacing={2.25} alignItems="stretch">
        <Grid item xs={12} lg={6} sx={{ display: "flex" }}>
          <Paper sx={{ ...objCardSx, p: { xs: 2, md: 2.4 }, background: ESS_COLORS.hero, position: "relative", overflow: "hidden" }}>
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  right: -40,
                  top: -24,
                  width: 280,
                  height: 180,
                  background: "radial-gradient(circle at left bottom, rgba(255,255,255,0.7), rgba(255,255,255,0) 68%)",
                },
                "&::after": {
                  content: '""',
                  position: "absolute",
                  right: -10,
                  top: -10,
                  width: 300,
                  height: 220,
                  backgroundImage: "repeating-radial-gradient(circle at 100% 0%, rgba(255,255,255,0.45) 0 2px, rgba(255,255,255,0) 2px 15px)",
                  opacity: 0.45,
                },
              }}
            />
            <Stack direction="row" spacing={1.8} alignItems="center" sx={{ position: "relative", zIndex: 1 }}>
              <Avatar
                src={strAvatarUrl || undefined}
                sx={{ width: 86, height: 86, background: "#ffffff", color: ESS_COLORS.teal, border: "1px solid rgba(255,255,255,0.9)", fontWeight: 800, fontSize: "1.42rem", boxShadow: "0 8px 20px rgba(37,99,235,0.08)", flexShrink: 0 }}
              >
                {getInitials(strEmployeeName)}
              </Avatar>
              <Box>
                <Typography sx={{ fontSize: "0.84rem", color: ESS_COLORS.body }}>Welcome back,</Typography>
                <Typography sx={{ mt: 0.35, fontSize: { xs: "1.7rem", md: "1.95rem" }, lineHeight: 1.1, fontWeight: 800, color: ESS_COLORS.navy }}>
                  {strEmployeeName}
                </Typography>
                <Typography sx={{ mt: 0.45, color: ESS_COLORS.body, fontSize: "0.9rem", fontWeight: 500 }}>{strDesignation}</Typography>
              </Box>
            </Stack>
            <Grid container spacing={1.2} sx={{ mt: 2.2, position: "relative", zIndex: 1 }}>
              {lstHeroDetails.map((objItem) => (
                <Grid key={objItem.strLabel} item xs={12} sm={4}>
                  <Box sx={{ px: 1.25, py: 1.15, borderRadius: "14px", border: `1px solid ${ESS_COLORS.border}`, backgroundColor: "rgba(255,255,255,0.58)", backdropFilter: "blur(8px)" }}>
                    <Stack direction="row" spacing={1.15} alignItems="center">
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: "10px",
                          border: `1px solid rgba(37,99,235,0.12)`,
                          backgroundColor: "rgba(255,255,255,0.72)",
                          color: ESS_COLORS.blue,
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        {objItem.objIcon}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: "0.72rem", color: ESS_COLORS.muted }}>{objItem.strLabel}</Typography>
                        <Typography sx={{ mt: 0.25, fontSize: "0.88rem", fontWeight: 700, color: ESS_COLORS.navy, lineHeight: 1.3 }}>{objItem.strValue}</Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Box sx={{ mt: 1.65, position: "relative", zIndex: 1 }}>
              <Stack direction="row" spacing={1.2} alignItems="center" sx={{ flexWrap: "wrap" }} useFlexGap>
                <Typography sx={{ color: ESS_COLORS.teal, fontWeight: 700, fontSize: "0.84rem" }}>
                  {`${intCompletedChecks}/${lstProfileChecks.length || 0} profile checks`}
                </Typography>
                <Box sx={{ flex: 1, minWidth: { xs: "100%", sm: 180 }, height: 6, borderRadius: 999, backgroundColor: "rgba(14,159,168,0.16)", overflow: "hidden" }}>
                  <Box sx={{ width: `${lstProfileChecks.length ? (intCompletedChecks / lstProfileChecks.length) * 100 : 0}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #0E9FA8 0%, #22C1C8 100%)" }} />
                </Box>
              </Stack>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} lg={3} sx={{ display: "flex" }}>
          <Paper sx={{ ...objCardSx, p: 0, overflow: "hidden", position: "relative" }}>
            <Box sx={{ p: 2.2, minHeight: 158, position: "relative", background: "linear-gradient(180deg, #FFFFFF 0%, #FBFDFF 100%)" }}>
              <Box sx={{ position: "absolute", right: -12, bottom: -10, width: 156, height: 96, background: "radial-gradient(circle at left top, rgba(37,99,235,0.12), rgba(37,99,235,0) 66%)" }} />
              <Typography sx={{ color: ESS_COLORS.navy, fontWeight: 700, fontSize: "0.82rem" }}>
              {resolveWidgetTitle(t, objPayWidget?.strWidgetCode, objPayWidget?.strWidgetName || "Current Month Pay")}
              </Typography>
              <Typography sx={{ mt: 1.8, fontSize: "2rem", fontWeight: 800, color: ESS_COLORS.navy }}>{formatCurrency(Number(objPay.decValue || 0))}</Typography>
              <Typography sx={{ mt: 0.45, color: ESS_COLORS.body, fontSize: "0.88rem" }}>{String(objPay.strSubtitle || t("current_month", "Current Month"))}</Typography>
            </Box>
            <Box sx={{ px: 2.2, py: 1.55, borderTop: `1px solid ${ESS_COLORS.border}` }}>
              <Link href="/ess/my-payslips" style={{ color: ESS_COLORS.blue, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                {t("view_payslips", "View Payslip")}
                <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
              </Link>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} lg={3} sx={{ display: "flex" }}>
          <Paper sx={{ ...objCardSx, p: 0, overflow: "hidden", background: "linear-gradient(180deg, #FDFFFC 0%, #F9FFFC 100%)" }}>
            <Box sx={{ p: 2.2 }}>
              <Typography sx={{ color: ESS_COLORS.navy, fontWeight: 700, fontSize: "0.82rem" }}>
              {resolveWidgetTitle(t, objProfileWidget?.strWidgetCode, objProfileWidget?.strWidgetName || "Profile Completeness")}
              </Typography>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2 }}>
                <MiniDonutChart lstPoints={lstProfileChartPoints} t={t} blnCompact />
                <Box>
                  <Typography sx={{ fontSize: "1.9rem", fontWeight: 800, color: ESS_COLORS.navy }}>{formatInteger(intProfileCompletionPercent)}%</Typography>
                  <Typography sx={{ mt: 0.1, color: ESS_COLORS.body, fontSize: "0.8rem" }}>{t("complete", "Complete")}</Typography>
                </Box>
              </Stack>
            </Box>
            <Box sx={{ px: 2.2, py: 1.55, borderTop: `1px solid ${ESS_COLORS.border}` }}>
              <Link href="/ess/my-profile" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: ESS_COLORS.teal, fontWeight: 700, textDecoration: "none" }}>
              {t("improve_profile", "Improve Profile")}
              <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
              </Link>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2.25} alignItems="stretch">
        <Grid item xs={12} lg={4} sx={{ display: "flex" }}>
          <Paper sx={{ ...objCardSx, p: 0, overflow: "hidden" }}>
            <Box sx={{ px: 2, py: 1.55, display: "flex", alignItems: "center", gap: 1.1 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: "10px", backgroundColor: "#EEF4FF", color: ESS_COLORS.blue, display: "grid", placeItems: "center" }}>
                <ArticleRoundedIcon sx={{ fontSize: 18 }} />
              </Box>
              <Typography sx={{ color: ESS_COLORS.navy, fontSize: "1rem", fontWeight: 700 }}>
                {`${resolveWidgetTitle(t, objItWidget?.strWidgetCode, objItWidget?.strWidgetName || "IT Declaration")} (${String((objItWidget?.objPayload as Record<string, unknown> | undefined)?.strFinancialYearCode || "Current FY")})`}
              </Typography>
            </Box>
            <Box sx={{ px: 2, pb: 1.7 }}>
            <Stack spacing={1.2}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CheckCircleRoundedIcon sx={{ color: statusAccentColor(strItStatus), fontSize: 18 }} />
                <Typography sx={{ color: statusAccentColor(strItStatus), fontWeight: 700, textTransform: "capitalize" }}>
                  {resolveStatusLabel(strItStatus, t)}
                </Typography>
              </Box>
              {strItSubmittedOn ? (
                <Box>
                  <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.78rem" }}>{t("submitted_on", "Submitted on")}</Typography>
                  <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 700, fontSize: "0.88rem" }}>{formatDateLabel(String(strItSubmittedOn))}</Typography>
                </Box>
              ) : null}
              <Box>
                <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.78rem" }}>{t("declaration_type", "Declaration Type")}</Typography>
                <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 700, fontSize: "0.88rem" }}>{strItDeclarationType || "New Regime"}</Typography>
              </Box>
              <Box>
                <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.78rem" }}>{t("declared", "Declared")}</Typography>
                <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 800, fontSize: "1.2rem" }}>
                  {formatCurrency(Number((objItWidget?.objPayload as Record<string, unknown> | undefined)?.decDeclaredAmount || 0))}
                </Typography>
              </Box>
              {intProofPendingCount > 0 ? <Typography sx={{ color: DASHBOARD_COLORS.red, fontWeight: 700, fontSize: "0.8rem" }}>{`${formatInteger(intProofPendingCount)} proof${intProofPendingCount > 1 ? "s" : ""} pending`}</Typography> : null}
            </Stack>
            </Box>
            <Box sx={{ px: 2, py: 1.3, borderTop: `1px solid ${ESS_COLORS.border}` }}>
            <Link href="/salary/it-declaration" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: ESS_COLORS.blue, fontWeight: 700, textDecoration: "none" }}>
              {t("view_update", "View / Update")}
              <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
            </Link>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4} sx={{ display: "flex" }}>
          <Paper sx={{ ...objCardSx, p: 0, overflow: "hidden" }}>
            <Box sx={{ px: 2, py: 1.55, display: "flex", alignItems: "center", gap: 1.1 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: "10px", backgroundColor: "#EBFBF6", color: ESS_COLORS.green, display: "grid", placeItems: "center" }}>
                <AccountBalanceWalletRoundedIcon sx={{ fontSize: 18 }} />
              </Box>
              <Typography sx={{ color: ESS_COLORS.navy, fontSize: "1rem", fontWeight: 700 }}>
                {resolveWidgetTitle(t, objReimbursementWidget?.strWidgetCode, objReimbursementWidget?.strWidgetName || "Reimbursement Summary")}
              </Typography>
            </Box>
            <Grid container spacing={0} sx={{ px: 2, pb: 1.2 }}>
              <Grid item xs={6}>
                <Box sx={{ py: 1.1, pr: 1.25, borderRight: { xs: "none", sm: `1px solid ${ESS_COLORS.border}` } }}>
                  <Typography sx={{ color: ESS_COLORS.muted, fontSize: "0.76rem" }}>Total Claims</Typography>
                  <Typography sx={{ mt: 0.2, fontWeight: 800, color: ESS_COLORS.navy, fontSize: "1.5rem" }}>{formatInteger(intTotalClaims)}</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ py: 1.1, pl: { xs: 0, sm: 1.35 }, pr: 1.25 }}>
                  <Typography sx={{ color: ESS_COLORS.muted, fontSize: "0.76rem" }}>Approved</Typography>
                  <Typography sx={{ mt: 0.2, fontWeight: 800, color: ESS_COLORS.navy, fontSize: "1.5rem" }}>{formatInteger(intApprovedClaims)}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ py: 1.1, borderTop: `1px solid ${ESS_COLORS.border}` }}>
                  <Typography sx={{ color: ESS_COLORS.muted, fontSize: "0.76rem" }}>Total Amount</Typography>
                  <Typography sx={{ mt: 0.2, fontWeight: 800, color: ESS_COLORS.navy, fontSize: "1.35rem" }}>{formatCurrency(decTotalClaimAmount)}</Typography>
                </Box>
              </Grid>
            </Grid>
            <Box sx={{ px: 2, py: 1.3, borderTop: `1px solid ${ESS_COLORS.border}` }}>
            <Link href="/ess/reimbursements" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: ESS_COLORS.teal, fontWeight: 700, textDecoration: "none" }}>
              {t("view_my_claims", "View My Claims")}
              <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
            </Link>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4} sx={{ display: "flex" }}>
          <Paper sx={{ ...objCardSx, p: 0, overflow: "hidden" }}>
            <Box sx={{ px: 2, py: 1.55, display: "flex", alignItems: "center", gap: 1.1 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: "10px", backgroundColor: "#FFF5EE", color: ESS_COLORS.orange, display: "grid", placeItems: "center" }}>
                <NotificationsActiveRoundedIcon sx={{ fontSize: 18 }} />
              </Box>
              <Typography sx={{ color: ESS_COLORS.navy, fontSize: "1rem", fontWeight: 700 }}>
                {resolveWidgetTitle(t, objPendingWidget?.strWidgetCode, objPendingWidget?.strWidgetName || "Pending Actions")}
              </Typography>
            </Box>
            <Box sx={{ px: 2, pb: 1.15 }}>
            <Stack spacing={1}>
              {lstPendingActions.length ? lstPendingActions.slice(0, 4).map((objAction) => (
                <Box key={objAction.strCode} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, borderRadius: "12px", px: 1.15, py: 0.95, border: `1px solid ${ESS_COLORS.border}`, backgroundColor: "#FFFFFF" }}>
                  <Stack direction="row" spacing={0.9} alignItems="flex-start" sx={{ minWidth: 0 }}>
                    <Box sx={{ mt: 0.1, width: 24, height: 24, borderRadius: "8px", backgroundColor: "#FFF1EB", display: "grid", placeItems: "center", color: ESS_COLORS.orange }}>
                      {pendingActionIcon(objAction.strCode)}
                    </Box>
                    <Typography sx={{ color: ESS_COLORS.navy, fontWeight: 600, fontSize: "0.82rem", lineHeight: 1.35 }}>{objAction.strLabel}</Typography>
                  </Stack>
                  <Link href={objAction.strRoutePath || "/dashboard"} style={{ color: ESS_COLORS.orange, textDecoration: "none", fontWeight: 700, whiteSpace: "nowrap", fontSize: "0.8rem", border: "1px solid #FED7C3", borderRadius: 10, padding: "6px 12px", backgroundColor: "#FFF9F5" }}>{t("action", "Update")}</Link>
                </Box>
              )) : <Typography sx={{ color: ESS_COLORS.muted }}>{t("no_pending_actions", "No pending actions.")}</Typography>}
            </Stack>
            </Box>
            <Box sx={{ px: 2, py: 1.3, borderTop: `1px solid ${ESS_COLORS.border}` }}>
            <Link href={objPrimaryPendingAction?.strRoutePath || "/dashboard"} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: ESS_COLORS.orange, fontWeight: 700, textDecoration: "none" }}>
              {t("view_all", "View All")}
              <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
            </Link>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2.25} alignItems="stretch">
        <Grid item xs={12} lg={6} sx={{ display: "flex" }}>
          <Paper sx={{ ...objCardSx, p: 0, overflow: "hidden" }}>
            <Box sx={{ px: 2, py: 1.55, display: "flex", alignItems: "center", gap: 1.1 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: "10px", backgroundColor: "#EEF4FF", color: ESS_COLORS.blue, display: "grid", placeItems: "center" }}>
                <ReceiptLongRoundedIcon sx={{ fontSize: 18 }} />
              </Box>
              <Typography sx={{ color: ESS_COLORS.navy, fontSize: "1rem", fontWeight: 700 }}>
                {resolveWidgetTitle(t, objPayslipWidget?.strWidgetCode, objPayslipWidget?.strWidgetName || "Last 3 Payslips")}
              </Typography>
            </Box>
            <Box sx={{ px: 2, pb: 1.15 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1.2fr 1fr", sm: "1.2fr 0.8fr 0.7fr" }, gap: 1, px: 1.1, py: 0.85, borderRadius: "12px", backgroundColor: "#F7FBFF", border: `1px solid ${ESS_COLORS.border}`, mb: 1 }}>
                <Typography sx={{ fontSize: "0.76rem", fontWeight: 700, color: ESS_COLORS.muted }}>Payslip Month</Typography>
                <Typography sx={{ fontSize: "0.76rem", fontWeight: 700, color: ESS_COLORS.muted, textAlign: { xs: "right", sm: "left" } }}>Net Pay</Typography>
                <Typography sx={{ display: { xs: "none", sm: "block" }, fontSize: "0.76rem", fontWeight: 700, color: ESS_COLORS.muted }}>Action</Typography>
              </Box>
              <Stack spacing={0.85}>
                {lstPayslips.length ? lstPayslips.map((objRow) => (
                  <Box key={String(objRow.result_id)} sx={{ display: "grid", gridTemplateColumns: { xs: "1.2fr 1fr", sm: "1.2fr 0.8fr 0.7fr" }, gap: 1, alignItems: "center", borderRadius: "12px", px: 1.1, py: 0.95, border: `1px solid ${ESS_COLORS.border}`, backgroundColor: "#FFFFFF" }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, color: ESS_COLORS.navy, fontSize: "0.86rem" }}>{formatMonth(String(objRow.payroll_month || ""))}</Typography>
                      <Typography sx={{ color: ESS_COLORS.muted, fontSize: "0.73rem" }}>Net Pay</Typography>
                    </Box>
                    <Typography sx={{ color: ESS_COLORS.navy, fontWeight: 700, fontSize: "0.88rem", textAlign: { xs: "right", sm: "left" } }}>{formatCurrency(Number(objRow.net_pay || 0))}</Typography>
                    <Box sx={{ display: { xs: "none", sm: "block" } }}>
                      <Link href="/ess/my-payslips" style={{ color: ESS_COLORS.blue, textDecoration: "none", fontWeight: 700, fontSize: "0.8rem", whiteSpace: "nowrap" }}>{t("download", "Download")}</Link>
                    </Box>
                  </Box>
                )) : <Typography sx={{ color: ESS_COLORS.muted }}>{t("no_payslips", "No payslips generated yet.")}</Typography>}
              </Stack>
            </Box>
            <Box sx={{ px: 2, py: 1.3, borderTop: `1px solid ${ESS_COLORS.border}` }}>
              <Link href="/ess/my-payslips" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: ESS_COLORS.blue, fontWeight: 700, textDecoration: "none" }}>
                {t("view_all_payslips", "View All Payslips")}
                <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
              </Link>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={6} sx={{ display: "flex" }}>
          <Paper sx={{ ...objCardSx, p: 0, overflow: "hidden" }}>
            <Box sx={{ px: 2, py: 1.55, display: "flex", alignItems: "center", gap: 1.1 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: "10px", backgroundColor: "#ECFDF5", color: ESS_COLORS.teal, display: "grid", placeItems: "center" }}>
                <ManageAccountsRoundedIcon sx={{ fontSize: 18 }} />
              </Box>
              <Typography sx={{ color: ESS_COLORS.navy, fontSize: "1rem", fontWeight: 700 }}>
                {t("profile_checklist", "Profile Completeness")}
              </Typography>
            </Box>
            <Box sx={{ px: 2, pb: 1.25 }}>
            <Grid container spacing={0}>
              {lstProfileChecks.map((objCheck, intIndex) => (
                <Grid key={String(objCheck.strCode)} item xs={12} sm={6}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      px: 1.2,
                      py: 0.95,
                      borderTop: intIndex > 1 ? `1px solid ${ESS_COLORS.border}` : "none",
                      borderLeft: { xs: "none", sm: intIndex % 2 === 1 ? `1px solid ${ESS_COLORS.border}` : "none" },
                    }}
                  >
                    <Typography sx={{ color: ESS_COLORS.navy, fontWeight: 600, fontSize: "0.84rem" }}>{String(objCheck.strLabel || "")}</Typography>
                    <Stack direction="row" spacing={0.6} alignItems="center">
                      <CheckCircleRoundedIcon sx={{ color: objCheck.blnComplete ? ESS_COLORS.green : ESS_COLORS.error, fontSize: 16 }} />
                      <Typography sx={{ color: objCheck.blnComplete ? ESS_COLORS.green : ESS_COLORS.error, fontWeight: 700, fontSize: "0.78rem" }}>
                        {objCheck.blnComplete ? t("verified", "Verified") : t("not_provided", "Not Provided")}
                      </Typography>
                    </Stack>
                  </Box>
                </Grid>
              ))}
            </Grid>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2.25} alignItems="stretch">
        <Grid item xs={12} sx={{ display: "flex" }}>
          <Paper sx={{ ...objCardSx, p: 2 }}>
            <Typography sx={{ color: ESS_COLORS.navy, fontWeight: 700, fontSize: "1rem", mb: 1.6 }}>
              {resolveWidgetTitle(t, objQuickActionsWidget?.strWidgetCode, objQuickActionsWidget?.strWidgetName || "Quick Actions")}
            </Typography>
            <Grid container spacing={1.25}>
              {lstQuickActions.map((objAction) => (
                <Grid key={objAction.strActionCode} item xs={6} sm={4} md={3} lg={2} sx={{ display: "flex" }}>
                  <Link href={objAction.strRoutePath || "/dashboard"} style={{ display: "block", width: "100%", textDecoration: "none" }}>
                    <Stack
                      spacing={0.95}
                      alignItems="center"
                      sx={{
                        py: 1.35,
                        px: 1.2,
                        minHeight: "100%",
                        borderRadius: "16px",
                        border: `1px solid ${ESS_COLORS.border}`,
                        backgroundColor: "#FFFFFF",
                        transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
                        "&:hover": {
                          transform: "translateY(-1px)",
                          borderColor: "#C9D9E9",
                          boxShadow: "0 10px 20px rgba(15, 31, 61, 0.08)",
                        },
                      }}
                    >
                      <Box sx={{ width: 44, height: 44, borderRadius: "13px", backgroundColor: quickActionColor(objAction.strActionCode), display: "grid", placeItems: "center" }}>
                        {renderEssQuickActionIcon(objAction.strActionCode)}
                      </Box>
                      <Typography sx={{ fontWeight: 700, color: ESS_COLORS.navy, fontSize: "0.78rem", lineHeight: 1.3, textAlign: "center" }}>{objAction.strActionName}</Typography>
                    </Stack>
                  </Link>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2.25} alignItems="stretch">
        <Grid item xs={12} lg={6} sx={{ display: "flex" }}>
          <Paper sx={{ ...objCardSx, p: 0, overflow: "hidden" }}>
            <Box sx={{ px: 2, py: 1.55, display: "flex", alignItems: "center", gap: 1.1 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: "10px", backgroundColor: "#FFF7ED", color: ESS_COLORS.orange, display: "grid", placeItems: "center" }}>
                <CampaignRoundedIcon sx={{ fontSize: 18 }} />
              </Box>
              <Typography sx={{ color: ESS_COLORS.navy, fontSize: "1rem", fontWeight: 700 }}>Company Announcements</Typography>
            </Box>
            <Box sx={{ px: 2, pb: 1.1 }}>
            <Stack spacing={1.15}>
              {lstAnnouncements.length ? lstAnnouncements.map((objItem, intIndex) => (
                <Box key={`${objItem.strTitle}-${intIndex}`} sx={{ display: "flex", justifyContent: "space-between", gap: 1.2, borderRadius: "14px", border: `1px solid ${ESS_COLORS.border}`, p: 1.2, backgroundColor: "#FFFFFF" }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ color: ESS_COLORS.navy, fontWeight: 700, fontSize: "0.88rem" }}>{objItem.strTitle}</Typography>
                    <Typography sx={{ mt: 0.2, color: ESS_COLORS.body, fontSize: "0.78rem", lineHeight: 1.45 }}>{objItem.strSubtitle}</Typography>
                  </Box>
                  <Typography sx={{ color: ESS_COLORS.muted, fontSize: "0.74rem", whiteSpace: "nowrap" }}>{objItem.strMeta}</Typography>
                </Box>
              )) : (
                <Typography sx={{ color: ESS_COLORS.muted, fontSize: "0.82rem" }}>
                  No announcements available.
                </Typography>
              )}
            </Stack>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} lg={6} sx={{ display: "flex" }}>
          <Paper sx={{ ...objCardSx, p: 0, overflow: "hidden" }}>
            <Box sx={{ px: 2, py: 1.55, display: "flex", alignItems: "center", gap: 1.1 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: "10px", backgroundColor: "#EEF4FF", color: ESS_COLORS.blue, display: "grid", placeItems: "center" }}>
                <GppGoodRoundedIcon sx={{ fontSize: 18 }} />
              </Box>
              <Typography sx={{ color: ESS_COLORS.navy, fontSize: "1rem", fontWeight: 700 }}>HR Policies</Typography>
            </Box>
            <Box sx={{ px: 2, pb: 1.1 }}>
            <Stack spacing={1.15}>
              {lstPolicies.length ? lstPolicies.map((objItem, intIndex) => (
                <Box key={`${objItem.strTitle}-${intIndex}`} sx={{ display: "flex", justifyContent: "space-between", gap: 1.2, borderRadius: "14px", border: `1px solid ${ESS_COLORS.border}`, p: 1.2, backgroundColor: "#FFFFFF" }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ color: ESS_COLORS.navy, fontWeight: 700, fontSize: "0.88rem" }}>{objItem.strTitle}</Typography>
                    <Typography sx={{ mt: 0.2, color: ESS_COLORS.body, fontSize: "0.78rem", lineHeight: 1.45 }}>{objItem.strSubtitle}</Typography>
                  </Box>
                  <Typography sx={{ color: ESS_COLORS.muted, fontSize: "0.74rem", whiteSpace: "nowrap" }}>{objItem.strMeta}</Typography>
                </Box>
              )) : (
                <Typography sx={{ color: ESS_COLORS.muted, fontSize: "0.82rem" }}>
                  No HR policies available.
                </Typography>
              )}
            </Stack>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}

function FallbackDashboard({ objDashboard, objUserContext, t }: RoleBasedDashboardProps) {
  return (
    <Stack spacing={3}>
      <PanelShell strTitle={`${objDashboard.strDashboardType} Dashboard`}>
        <Typography sx={{ color: "#64748b" }}>
          {objUserContext.objTenant.strTenantName} | {objUserContext.objUser.strLoginName || objUserContext.objUser.strEmailAddress || "Workspace User"}
        </Typography>
        <Typography sx={{ mt: 2, color: "#475569" }}>
          {t("fallback_message", "This dashboard type is still using the foundation shell.")}
        </Typography>
      </PanelShell>
    </Stack>
  );
}

function TrendChartPanel({ objWidget, t }: { objWidget?: DashboardWidget; t: RoleBasedDashboardProps["t"] }) {
  const lstSeries = (((objWidget?.objPayload as { lstSeries?: ChartSeries[] } | undefined)?.lstSeries) || []) as ChartSeries[];
  const lstPoints = lstSeries[0]?.lstPoints || [];
  const decMax = Math.max(...lstPoints.map((objPoint) => Number(objPoint.decValue || objPoint.intValue || 0)), 0);
  return (
    <PanelShell strTitle={resolveWidgetTitle(t, objWidget?.strWidgetCode, objWidget?.strWidgetName || "Payroll Cost Trend")}>
      <Stack direction="row" alignItems="end" spacing={1.2} sx={{ minHeight: 220 }}>
        {lstPoints.map((objPoint, intIndex) => {
          const decValue = Number(objPoint.decValue || objPoint.intValue || 0);
          const decHeight = decMax > 0 ? Math.max((decValue / decMax) * 160, 16) : 16;
          return (
            <Stack key={`${objPoint.strCode || "point"}-${objPoint.strLabel}-${intIndex}`} spacing={1} sx={{ flex: 1, alignItems: "center" }}>
              <Typography sx={{ fontSize: "0.72rem", color: "#0f766e", fontWeight: 700 }}>{formatCurrency(decValue)}</Typography>
              <Box sx={{ width: "100%", borderRadius: "16px 16px 6px 6px", height: decHeight, background: "linear-gradient(180deg, #0ea5e9 0%, #2563eb 100%)" }} />
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
      <Stack spacing={1.4}>
        {lstPoints.map((objPoint, intIndex) => {
          const decValue = Number(objPoint.decValue || objPoint.intValue || 0);
          const decWidth = decMax > 0 ? `${Math.max((decValue / decMax) * 100, 6)}%` : "6%";
          return (
            <Box key={`${objPoint.strCode || "point"}-${objPoint.strLabel}-${intIndex}`}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography sx={{ color: "#111827", fontWeight: 600, fontSize: "0.85rem" }}>{objPoint.strLabel}</Typography>
                <Typography sx={{ color: "#2563eb", fontWeight: 700, fontSize: "0.82rem" }}>{formatCurrency(decValue)}</Typography>
              </Stack>
              <Box sx={{ width: "100%", backgroundColor: "#e2e8f0", borderRadius: "999px", height: 10 }}>
                <Box sx={{ width: decWidth, background: "linear-gradient(90deg, #38bdf8 0%, #2563eb 100%)", borderRadius: "999px", height: 10 }} />
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

function renderEssQuickActionIcon(strActionCode: string) {
  const strCode = String(strActionCode || "").toUpperCase();
  if (strCode.includes("PAYSLIP")) return <DownloadRoundedIcon sx={{ color: DASHBOARD_COLORS.blue, fontSize: 22 }} />;
  if (strCode.includes("DECLARATION")) return <DescriptionRoundedIcon sx={{ color: DASHBOARD_COLORS.amber, fontSize: 22 }} />;
  if (strCode.includes("REIMBURSE")) return <ReceiptLongRoundedIcon sx={{ color: DASHBOARD_COLORS.green, fontSize: 22 }} />;
  if (strCode.includes("PROFILE")) return <PersonOutlineRoundedIcon sx={{ color: DASHBOARD_COLORS.blue, fontSize: 22 }} />;
  if (strCode.includes("FORM")) return <AssignmentRoundedIcon sx={{ color: DASHBOARD_COLORS.red, fontSize: 22 }} />;
  return <AssignmentRoundedIcon sx={{ color: DASHBOARD_COLORS.blue, fontSize: 22 }} />;
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
  children,
}: {
  strTitle: string;
  strSubtitle?: string;
  strAccent?: string;
  blnAutoHeight?: boolean;
  children: ReactNode;
}) {
  return (
    <Paper
      sx={{
        p: 2.25,
        width: "100%",
        height: blnAutoHeight ? "auto" : "100%",
        borderRadius: "18px",
        border: `1px solid ${DASHBOARD_COLORS.border}`,
        backgroundColor: DASHBOARD_COLORS.surface,
        boxShadow: "0 10px 28px rgba(15,31,61,0.06)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box sx={{ position: "absolute", inset: 0, borderTop: `4px solid ${strAccent}`, pointerEvents: "none" }} />
      <Box sx={{ mb: 1.75 }}>
        <Typography variant="h6" sx={{ color: DASHBOARD_COLORS.text, fontWeight: 800, fontSize: "1rem" }}>
          {strTitle}
        </Typography>
        {strSubtitle ? (
          <Typography sx={{ mt: 0.35, color: DASHBOARD_COLORS.muted, fontSize: "0.8rem" }}>
            {strSubtitle}
          </Typography>
        ) : null}
      </Box>
      {children}
    </Paper>
  );
}

function getKpiIcon(strWidgetCode: string) {
  if (strWidgetCode.includes("employee")) {
    return <PeopleAltRoundedIcon sx={{ fontSize: 22 }} />;
  }
  if (strWidgetCode.includes("net")) {
    return <PaymentsRoundedIcon sx={{ fontSize: 22 }} />;
  }
  if (strWidgetCode.includes("approval")) {
    return <AssignmentTurnedInRoundedIcon sx={{ fontSize: 22 }} />;
  }
  if (strWidgetCode.includes("validation")) {
    return <ErrorOutlineRoundedIcon sx={{ fontSize: 22 }} />;
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

function buildLifecycleStages(strRunStatus: string) {
  const strNormalizedStatus = normalizeRunStatus(strRunStatus);
  const lstStatuses = ["open", "submitted", "approved", "processed", "closed"];
  const intActiveIndex = Math.max(lstStatuses.indexOf(strNormalizedStatus), 0);
  return lstStatuses.map((strStatus, intIndex) => ({
    strLabel: formatLifecycleLabel(strStatus),
    strState: intIndex < intActiveIndex
      ? "completed"
      : intIndex === intActiveIndex
        ? (strNormalizedStatus === "closed" ? "completed" : "active")
        : strNormalizedStatus === "closed"
          ? "locked"
          : "upcoming",
  })) as Array<{ strLabel: string; strState: "completed" | "active" | "upcoming" | "locked" }>;
}

function buildPayrollRunDetailItems(objRun: RecentRunRow | undefined, t: RoleBasedDashboardProps["t"]) {
  return [
    { strLabel: t("run_name", "Run Name"), strValue: objRun?.run_name || "-" },
    { strLabel: t("payroll_month", "Payroll Month"), strValue: objRun?.payroll_month ? formatLongMonth(objRun.payroll_month) : "-" },
    { strLabel: t("company", "Company"), strValue: objRun?.company_name || "-" },
    { strLabel: t("payroll_cycle", "Payroll Cycle"), strValue: objRun?.cycle_name || "-" },
    { strLabel: t("last_processed_time", "Last Processed Time"), strValue: formatDateTimeLabel(objRun?.processed_on) },
    { strLabel: t("last_processed_by", "Last Processed By"), strValue: objRun?.processed_by || "-" },
  ];
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

function buildValidationCards(lstKpiWidgets: DashboardWidget[], objSelectedRun: RecentRunRow | undefined, t: RoleBasedDashboardProps["t"]) {
  const objValidationPayload = (lstKpiWidgets.find((objWidget) => objWidget.strWidgetCode === "payroll_validation_errors")?.objPayload || {}) as KpiPayload;
  const objApprovalsPayload = (lstKpiWidgets.find((objWidget) => objWidget.strWidgetCode === "pending_approvals")?.objPayload || {}) as KpiPayload;
  return [
    { strLabel: t("blocking_issues", "Blocking Issues"), strValue: formatInteger(Number(objValidationPayload.intBlockingCount || 0)), strRoutePath: "/payroll/runs", strTone: "red" as const, strHint: t("blocking_issues_hint", "Open validation blockers that can stop payroll processing.") },
    { strLabel: t("warnings", "Warnings"), strValue: formatInteger(Number(objValidationPayload.intWarningCount || 0)), strRoutePath: "/payroll/runs", strTone: "amber" as const, strHint: t("warnings_hint", "Warnings should be reviewed before final payroll approval.") },
    { strLabel: t("pending_approvals", "Pending Approvals"), strValue: formatInteger(Number(objApprovalsPayload.intValue || 0)), strRoutePath: "/payroll/runs", strTone: "blue" as const, strHint: t("pending_approvals_hint", "Approval workload across payroll, tax and reimbursements.") },
    { strLabel: t("last_validation", "Last Validation"), strValue: formatDateTimeLabel(objSelectedRun?.processed_on), strRoutePath: "/payroll/runs", strTone: "green" as const, strHint: t("last_validation_hint", "Current dashboard feed does not expose a separate validation timestamp, so the latest run timestamp is shown.") },
  ];
}

function buildExceptionItems(lstAlerts: AlertRow[], intPendingApprovalCount: number, intValidationErrorCount: number, objSelectedRun: RecentRunRow | undefined, t: RoleBasedDashboardProps["t"]) {
  const lstAlertItems = lstAlerts
    .filter((objAlert) => Number(objAlert.intCount || 0) > 0)
    .map((objAlert) => ({
      strCode: objAlert.strCode,
      strLabel: objAlert.strLabel,
      intCount: Number(objAlert.intCount || 0),
      strSeverity: objAlert.strCode.includes("missing") ? "Warning" : "Info" as "Blocking" | "Warning" | "Info",
      strRoutePath: objAlert.strRoutePath || "/employees",
      strReason: t("exception_route_hint", "Open the related page to resolve this dashboard exception."),
    }));
  const lstPriorityItems = [
    { strCode: "validation_blockers", strLabel: t("validation_blockers", "Validation Blockers"), intCount: intValidationErrorCount, strSeverity: "Blocking" as const, strRoutePath: "/payroll/runs", strReason: t("validation_blockers_reason", "Unresolved issues can block payroll processing or closure.") },
    { strCode: "approval_queue", strLabel: t("approval_queue", "Approval Queue"), intCount: intPendingApprovalCount, strSeverity: "Warning" as const, strRoutePath: "/payroll/runs", strReason: t("approval_queue_reason", "Pending approvals still require payroll review or sign-off.") },
    { strCode: "payslip_pending", strLabel: t("payslip_pending", "Payslip Generation Pending"), intCount: ["processed", "closed"].includes(normalizeRunStatus(objSelectedRun?.run_status || "")) ? Math.max(Number(objSelectedRun?.employee_count || 0), 0) : 0, strSeverity: "Info" as const, strRoutePath: "/payroll/payslips", strReason: t("payslip_pending_reason", "Payslips become actionable only after payroll results are available.") },
  ];
  return [...lstPriorityItems, ...lstAlertItems].filter((objItem) => objItem.intCount > 0);
}

function resolveExceptionGroups(objExceptions: DashboardResponse["exceptions"], lstFallbackItems: Array<{ strCode: string; strLabel: string; intCount: number; strSeverity: "Blocking" | "Warning" | "Info"; strRoutePath: string; strReason: string }>) {
  const objValue = (objExceptions || {}) as { lstGroups?: ExceptionGroup[] };
  if (objValue.lstGroups?.length) {
    return objValue.lstGroups;
  }
  const dicGroups = new Map<ExceptionGroup["strSeverity"], ExceptionGroup>();
  lstFallbackItems.forEach((objItem) => {
    const objGroup = dicGroups.get(objItem.strSeverity) || { strSeverity: objItem.strSeverity, lstItems: [] };
    objGroup.lstItems.push(objItem);
    dicGroups.set(objItem.strSeverity, objGroup);
  });
  return Array.from(dicGroups.values());
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

function buildDetailedSummarySections(objDashboard: DashboardResponse) {
  const objIt = (objDashboard.itDeclarationDetails || {}) as { lstStats?: DrilldownStat[] };
  const objReimbursement = (objDashboard.reimbursementDetails || {}) as { lstStats?: DrilldownStat[] };
  const objStatutory = (objDashboard.statutoryDetails || {}) as { lstStats?: DrilldownStat[] };
  const objTax = (objDashboard.taxDetails || {}) as { lstStats?: DrilldownStat[] };
  return [
    { strCode: "it", strTitle: "IT Declaration Summary", strSubtitle: "Status, amount, proofs and approval posture", lstStats: objIt.lstStats || [], strAccent: DASHBOARD_COLORS.amber },
    { strCode: "reimbursement", strTitle: "Reimbursement Summary", strSubtitle: "Claims, proof checks, approval and payroll push status", lstStats: objReimbursement.lstStats || [], strAccent: DASHBOARD_COLORS.green },
    { strCode: "statutory", strTitle: "Statutory Summary", strSubtitle: "PF, ESI, PT, LWF and contribution overview", lstStats: objStatutory.lstStats || [], strAccent: DASHBOARD_COLORS.blue },
    { strCode: "tax", strTitle: "Tax Summary", strSubtitle: "Taxable payroll, TDS posture and regime coverage", lstStats: objTax.lstStats || [], strAccent: DASHBOARD_COLORS.red },
  ];
}

function getStageColor(strStatus: TrackerStage["strStatus"]) {
  if (strStatus === "completed") return "#16A34A";
  if (strStatus === "in_progress") return "#2563EB";
  return "#94a3b8";
}

function lifecycleTone(strState: "completed" | "active" | "upcoming" | "locked") {
  if (strState === "completed") return { accent: DASHBOARD_COLORS.green, surface: DASHBOARD_COLORS.greenSoft, border: "#BFE7CC" };
  if (strState === "active") return { accent: DASHBOARD_COLORS.blue, surface: DASHBOARD_COLORS.blueSoft, border: "#D6E4FF" };
  if (strState === "locked") return { accent: "#94A3B8", surface: "#F8FAFC", border: "#E2E8F0" };
  return { accent: DASHBOARD_COLORS.amber, surface: DASHBOARD_COLORS.amberSoft, border: "#F7C99D" };
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

function formatStageStatus(strStatus: TrackerStage["strStatus"], t: RoleBasedDashboardProps["t"]) {
  if (strStatus === "completed") return t("completed", "Completed");
  if (strStatus === "in_progress") return t("in_progress", "In Progress");
  return t("pending", "Pending");
}

function formatLifecycleLabel(strStatus: string) {
  const strNormalized = normalizeRunStatus(strStatus);
  if (strNormalized === "open") return "Open";
  if (strNormalized === "submitted") return "Submitted";
  if (strNormalized === "approved") return "Approved";
  if (strNormalized === "processed") return "Processed";
  if (strNormalized === "closed") return "Closed";
  return formatStatusText(strStatus || "pending");
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

function readinessAccent(strStatus: string) {
  const strNormalized = String(strStatus || "").trim().toLowerCase();
  if (strNormalized.includes("ready with warnings")) return DASHBOARD_COLORS.amber;
  if (strNormalized.includes("ready")) return DASHBOARD_COLORS.green;
  return DASHBOARD_COLORS.red;
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

function formatTrendText(decVariancePercent: number | null | undefined) {
  if (decVariancePercent == null) return "No previous month data";
  const strSymbol = decVariancePercent > 0 ? "^" : decVariancePercent < 0 ? "v" : "-";
  return `${strSymbol} ${Math.abs(decVariancePercent).toFixed(1)}%`;
}

function formatDays(decValue?: number) {
  if (decValue == null) return "-";
  return `${Number(decValue).toFixed(1)} days`;
}

function joinActorDate(strActor?: string, dtValue?: string) {
  const strDate = formatDateTimeLabel(dtValue);
  if (strActor && strDate !== "-") return `${strActor} • ${strDate}`;
  return strActor || strDate;
}

function formatInteger(intValue: number) {
  return new Intl.NumberFormat("en-IN").format(intValue || 0);
}

function formatCurrency(decValue: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(decValue || 0);
}

function formatMonth(strValue: string) {
  const objDate = new Date(strValue);
  return Number.isNaN(objDate.getTime()) ? strValue : objDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function formatComparisonMonth(strValue: string, t: RoleBasedDashboardProps["t"]) {
  if (!strValue) return t("overall", "overall");
  const objDate = new Date(strValue);
  if (Number.isNaN(objDate.getTime())) return t("previous_month", "previous month");
  objDate.setMonth(objDate.getMonth() - 1);
  return objDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function formatDateLabel(strValue: string) {
  const objDate = new Date(strValue);
  return Number.isNaN(objDate.getTime()) ? strValue : objDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
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

function formatLongMonth(strValue: string) {
  const objDate = new Date(strValue);
  return Number.isNaN(objDate.getTime()) ? strValue : objDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function formatPayrollMonthSelectionLabel(strValue: string, t: RoleBasedDashboardProps["t"]) {
  if (strValue === "__all__") {
    return t("all_months", "All Months");
  }
  return `${formatLongMonth(strValue)} Payroll`;
}

function shortChartLabel(strValue: string) {
  const strTrimmed = String(strValue || "").trim();
  if (!strTrimmed) return "-";
  if (/^\d{4}-\d{2}/.test(strTrimmed)) {
    return formatMonth(strTrimmed);
  }
  const lstParts = strTrimmed.split(/\s+/).filter(Boolean);
  return lstParts.length > 1 ? `${lstParts[0].slice(0, 3)} ${lstParts.at(-1)?.slice(0, 2) || ""}`.trim() : strTrimmed.slice(0, 6);
}

function formatDateTimeLabel(strValue?: string | null) {
  if (!strValue) return "-";
  const objDate = new Date(strValue);
  if (Number.isNaN(objDate.getTime())) return "-";
  return objDate.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
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
  if (["submitted", "approved", "partially approved", "locked", "processed", "completed"].includes(strNormalized)) return DASHBOARD_COLORS.green;
  if (["released", "resubmitted", "under_review", "under review", "in progress", "in_progress"].includes(strNormalized)) return DASHBOARD_COLORS.amber;
  return DASHBOARD_COLORS.red;
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
  if (["closed", "processed", "approved", "completed"].includes(strNormalized)) return DASHBOARD_COLORS.greenSoft;
  if (["submitted", "released", "in_progress", "in progress", "under review"].includes(strNormalized)) return DASHBOARD_COLORS.amberSoft;
  return DASHBOARD_COLORS.redSoft;
}

function formatStatusText(strStatus: string) {
  const strNormalized = String(strStatus || "").trim().toLowerCase();
  if (!strNormalized) return "Pending";
  return strNormalized
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((strPart) => strPart.charAt(0).toUpperCase() + strPart.slice(1))
    .join(" ");
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
  const strNormalized = String(strStatus || "").trim().toLowerCase();
  if (strNormalized === "approved") return t("approved", "Approved");
  if (strNormalized === "pending") return t("pending", "Pending");
  if (strNormalized === "draft") return t("draft", "Draft");
  return strStatus;
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
