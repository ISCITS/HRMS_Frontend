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
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import { Box, Chip, Grid, MenuItem, Paper, Select, Stack, Typography } from "@mui/material";

import type { CurrentUserContext, DashboardQuickAction, DashboardResponse, DashboardWidget } from "@/models/AuthModels";

type RoleBasedDashboardProps = {
  objDashboard: DashboardResponse;
  objUserContext: CurrentUserContext;
  t: (strKey: string, strFallback?: string) => string;
  onPayrollMonthChange?: (strPayrollMonth: string | null) => void;
};

type KpiPayload = {
  intValue?: number;
  decValue?: number;
  strSubtitle?: string;
  decTrendValue?: number | null;
  intTaxPendingCount?: number;
  intReimbursementPendingCount?: number;
  intBlockingCount?: number;
  intWarningCount?: number;
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

export default function RoleBasedDashboard({ objDashboard, objUserContext, t }: RoleBasedDashboardProps) {
  if (objDashboard.strDashboardType === "PAYROLL") {
    return <PayrollDashboard objDashboard={objDashboard} objUserContext={objUserContext} t={t} />;
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

function PayrollDashboard({ objDashboard, t, onPayrollMonthChange }: RoleBasedDashboardProps) {
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
      { strCode: "disbursement", strLabel: "Disbursement", strStatus: "pending" },
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
  const lstSummaryWidgets = [
    ensureWidget(dicWidgetMap.get("it_declaration_summary"), "it_declaration_summary", "IT Declaration Summary", "summary", {
      lstStats: [
        { strLabel: "Filed", intValue: 0 },
        { strLabel: "Pending", intValue: 0 },
      ],
    }),
    ensureWidget(dicWidgetMap.get("reimbursement_summary"), "reimbursement_summary", "Reimbursement Summary", "summary", {
      lstStats: [
        { strLabel: "Total Claims", intValue: 0 },
        { strLabel: "Pending", intValue: 0 },
      ],
    }),
    ensureWidget(dicWidgetMap.get("statutory_summary"), "statutory_summary", "Statutory Summary", "summary", {
      lstStats: [
        { strLabel: "PF Employees", intValue: 0 },
        { strLabel: "ESI Employees", intValue: 0 },
      ],
    }),
    ensureWidget(dicWidgetMap.get("tax_summary_tds"), "tax_summary_tds", "Tax Summary (TDS)", "summary", {
      lstStats: [
        { strLabel: "TDS Deducted", decValue: 0 },
      ],
    }),
  ];
  const objRecentRunsWidget = ensureWidget(dicWidgetMap.get("recent_payroll_runs"), "recent_payroll_runs", "Recent Payroll Runs", "table", { lstRows: [] });
  const objQuickActionsWidget = ensureWidget(dicWidgetMap.get("quick_actions"), "quick_actions", "Quick Actions", "actions", {
    lstActions: objDashboard.lstQuickActions || [],
  });
  const lstRecentRunRows = (((objRecentRunsWidget.objPayload as { lstRows?: RecentRunRow[] } | undefined)?.lstRows) || []) as RecentRunRow[];
  const lstAvailablePayrollMonths = ((((objRecentRunsWidget.objPayload as { lstAvailablePayrollMonths?: string[] } | undefined)?.lstAvailablePayrollMonths) || [])) as string[];
  const lstStages = (((objTrackerWidget.objPayload as { lstStages?: TrackerStage[] } | undefined)?.lstStages) || []) as TrackerStage[];
  const lstAlerts = (((objAlertsWidget.objPayload as { lstAlerts?: AlertRow[] } | undefined)?.lstAlerts) || []) as AlertRow[];
  const lstPayrollMonthsFromRuns = Array.from(
    new Set(
      lstRecentRunRows
        .map((objRow) => String(objRow.payroll_month || "").trim())
        .filter(Boolean),
    ),
  );
  const lstMonthOptions = lstAvailablePayrollMonths.length ? lstAvailablePayrollMonths : lstPayrollMonthsFromRuns;
  const objNormalizedMonthOptions = Array.from(new Set(lstMonthOptions.map((strMonth) => String(strMonth || "").trim()).filter(Boolean)));
  const [strSelectedMonth, setStrSelectedMonth] = useState(objNormalizedMonthOptions[0] || new Date().toISOString().slice(0, 7));

  useEffect(() => {
    if (!objNormalizedMonthOptions.length) {
      return;
    }
    if (!objNormalizedMonthOptions.includes(strSelectedMonth)) {
      setStrSelectedMonth(objNormalizedMonthOptions[0]);
    }
  }, [objNormalizedMonthOptions, strSelectedMonth]);

  useEffect(() => {
    if (!objNormalizedMonthOptions.length) {
      return;
    }
    onPayrollMonthChange?.(strSelectedMonth);
  }, [strSelectedMonth, onPayrollMonthChange, objNormalizedMonthOptions]);
  const objCurrentStage = lstStages.find((objStage) => objStage.strStatus === "in_progress")
    || lstStages.find((objStage) => objStage.strStatus === "pending")
    || lstStages[lstStages.length - 1];
  const intActionRequiredCount = lstAlerts.reduce((intTotal, objAlert) => intTotal + Number(objAlert.intCount || 0), 0);
  const objDashboardGridSpacing = { xs: 1.5, md: 2, xl: 2.25 };

  return (
    <Stack
      spacing={2.5}
      sx={{
        width: "100%",
        p: 0,
        background: "linear-gradient(180deg, #F8FBFF 0%, #F7FBFE 100%)",
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
              background: "linear-gradient(120deg,#E6FAFB 0%,#EFF8FF 45%,#DCEEFF 100%)",
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
                  right: -30,
                  top: -10,
                  width: 280,
                  height: 180,
                  backgroundImage: "repeating-radial-gradient(circle at 100% 0%, rgba(255,255,255,0.5) 0 2px, rgba(255,255,255,0) 2px 14px)",
                  opacity: 0.4,
                },
              }}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.8} sx={{ position: "relative", zIndex: 1 }}>
              <Box
                sx={{
                  width: 58,
                  height: 58,
                  borderRadius: "18px",
                  background: "linear-gradient(180deg, #4E8FFF 0%, #2563EB 100%)",
                  color: "#ffffff",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 14px 26px rgba(37,99,235,0.24)",
                  flexShrink: 0,
                }}
              >
                <DescriptionRoundedIcon sx={{ fontSize: 30 }} />
              </Box>
              <Stack spacing={1.35} sx={{ width: "100%" }}>
                <Box>
                  <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 800, letterSpacing: "-0.02em", fontSize: { xs: "1.2rem", md: "1.55rem" } }}>
                    {t("payroll_dashboard", "Payroll Dashboard")}
                  </Typography>
                  <Typography sx={{ mt: 0.4, color: DASHBOARD_COLORS.muted, fontSize: "0.9rem" }}>
                    {t("payroll_dashboard_subtitle", "Track payroll status, workflow progress, and items that need action.")}
                  </Typography>
                </Box>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} flexWrap="wrap" useFlexGap>
                <StatusBadge
                  strLabel={t("payroll_status", "Payroll Status")}
                  strValue={objCurrentStage?.strLabel || t("processing", "Processing")}
                  strAccent="#0E9FA8"
                  strBackground="rgba(255,255,255,0.62)"
                />
                <StatusBadge
                  strLabel={t("workflow", "Workflow")}
                  strValue={formatStageStatus(objCurrentStage?.strStatus || "pending", t)}
                  strAccent={getStageColor(objCurrentStage?.strStatus || "pending")}
                  strBackground={softColor(getStageColor(objCurrentStage?.strStatus || "pending"))}
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
              <Box sx={{ width: 50, height: 50, borderRadius: "16px", backgroundColor: DASHBOARD_COLORS.blueSoft, border: `1px solid ${DASHBOARD_COLORS.border}`, display: "grid", placeItems: "center", color: DASHBOARD_COLORS.blue, flexShrink: 0 }}>
                <AssignmentRoundedIcon sx={{ fontSize: 26 }} />
              </Box>
              <Box sx={{ width: "100%" }}>
                <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.76rem", fontWeight: 700, mb: 1 }}>
                  {t("payroll_month", "Payroll Month")}
                </Typography>
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
                  renderValue={(strValue) => `${formatMonth(String(strValue))} Payroll`}
                >
                  {objNormalizedMonthOptions.map((strMonth) => (
                    <MenuItem key={strMonth} value={strMonth}>
                      {formatMonth(strMonth)} Payroll
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Grid container columnSpacing={{ xs: 1.5, md: 2, lg: 0 }} rowSpacing={objDashboardGridSpacing} alignItems="stretch">
        {lstKpiWidgets.map((objWidget, intIndex) => (
          <Grid key={objWidget.strWidgetCode} item xs={12} sm={6} xl={3} sx={{ display: "flex" }}>
            <PayrollKpiPanel
              objWidget={objWidget}
              objTone={lstPayrollCardPalette[intIndex % lstPayrollCardPalette.length]}
              strSelectedMonth={strSelectedMonth}
              t={t}
            />
          </Grid>
        ))}
      </Grid>

      <Grid container columnSpacing={{ xs: 1.5, md: 2, lg: 0 }} rowSpacing={objDashboardGridSpacing} alignItems="stretch">
        <Grid item xs={12} lg={8} sx={{ display: "flex" }}>
          <WorkflowPanel objWidget={objTrackerWidget} t={t} />
        </Grid>
        <Grid item xs={12} lg={4} sx={{ display: "flex" }}>
          <AlertsPanel objWidget={objAlertsWidget} t={t} />
        </Grid>
      </Grid>

      <Grid container columnSpacing={{ xs: 1.5, md: 2, lg: 0 }} rowSpacing={objDashboardGridSpacing} alignItems="stretch">
        {lstSummaryWidgets.map((objWidget) => (
          <Grid key={objWidget.strWidgetCode} item xs={12} sm={6} lg={3} sx={{ display: "flex" }}>
            <SummaryPanel objWidget={objWidget} t={t} />
          </Grid>
        ))}
      </Grid>

      <Grid container columnSpacing={{ xs: 1.5, md: 2, lg: 0 }} rowSpacing={objDashboardGridSpacing} alignItems="stretch">
        <Grid item xs={12} lg={7} sx={{ display: "flex" }}>
          <RecentRunsPanel objWidget={objRecentRunsWidget} t={t} />
        </Grid>
        <Grid item xs={12} lg={5} sx={{ display: "flex" }}>
          <QuickActionsPanel objWidget={objQuickActionsWidget} t={t} />
        </Grid>
      </Grid>
    </Stack>
  );
}

function PayrollKpiPanel({
  objWidget,
  objTone,
  strSelectedMonth,
  t,
}: {
  objWidget: DashboardWidget;
  objTone: { accent: string; surface: string };
  strSelectedMonth: string;
  t: RoleBasedDashboardProps["t"];
}) {
  const objPayload = (objWidget.objPayload || {}) as KpiPayload;
  const strValue = objPayload.decValue != null ? formatCurrency(objPayload.decValue) : formatInteger(objPayload.intValue || 0);
  const decTrendValue = objPayload.decTrendValue;
  const strMonthLabel = formatMonth(strSelectedMonth);
  const strComparisonMonth = formatComparisonMonth(strSelectedMonth);
  const blnNegativeMetric = objWidget.strWidgetCode === "pending_approvals" || objWidget.strWidgetCode === "payroll_validation_errors";
  const strTrendIcon = decTrendValue == null ? (blnNegativeMetric ? "▼" : "▲") : decTrendValue >= 0 ? "▲" : "▼";
  const strTrendText = decTrendValue == null
    ? `${strTrendIcon} 0 ${t("vs_previous", "vs")} ${strComparisonMonth}`
    : `${strTrendIcon} ${Math.abs(decTrendValue)}% ${t("vs_previous", "vs")} ${strComparisonMonth}`;
  const objIcon = getKpiIcon(objWidget.strWidgetCode);
  const strSubtitle = objWidget.strWidgetCode === "net_payroll_amount"
    ? `This Month (${strMonthLabel})`
    : objPayload.strSubtitle || t("current_snapshot", "Current Snapshot");

  return (
    <Paper
      sx={{
        p: 2.25,
        width: "100%",
        minHeight: 184,
        height: "100%",
        borderRadius: "18px",
        border: `1px solid ${DASHBOARD_COLORS.border}`,
        boxShadow: "0 10px 28px rgba(15,31,61,0.06)",
        backgroundColor: DASHBOARD_COLORS.surface,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box sx={{ position: "absolute", inset: 0, borderTop: `4px solid ${objTone.accent}`, pointerEvents: "none" }} />
      <Stack justifyContent="space-between" sx={{ height: "100%" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
          <Stack direction="row" spacing={1.2} sx={{ minWidth: 0, flex: 1 }}>
            <Box
              sx={{
                width: 50,
                height: 50,
                flexShrink: 0,
                borderRadius: "16px",
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
                {objWidget.strWidgetName}
              </Typography>
              <Typography sx={{ mt: 1.05, fontSize: "1.9rem", lineHeight: 1.1, fontWeight: 800, color: DASHBOARD_COLORS.text }}>
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

function WorkflowPanel({ objWidget, t }: { objWidget?: DashboardWidget; t: RoleBasedDashboardProps["t"] }) {
  const lstStages = (((objWidget?.objPayload as { lstStages?: TrackerStage[] } | undefined)?.lstStages) || []) as TrackerStage[];
  const objCurrentStage = lstStages.find((objStage) => objStage.strStatus === "in_progress") || lstStages.find((objStage) => objStage.strStatus === "pending");

  return (
    <PanelShell
      strTitle={t("payroll_workflow", "Payroll Workflow")}
      strSubtitle={objCurrentStage ? `${t("current_stage", "Current Stage")}: ${objCurrentStage.strLabel}` : undefined}
      strAccent={DASHBOARD_COLORS.blue}
    >
      <Box sx={{ pt: 0.25 }}>
        <Box sx={{ display: { xs: "none", md: "block" }, position: "relative", height: 30, mb: 1.65 }}>
          <Box sx={{ position: "absolute", left: 0, right: 0, top: 14, height: 2, backgroundColor: "#DDE7F0" }} />
          <Box sx={{ position: "absolute", left: 0, width: "79%", top: 14, height: 2, backgroundColor: DASHBOARD_COLORS.green }} />
          <Box sx={{ position: "absolute", left: "79%", right: 0, top: 14, height: 2, background: "repeating-linear-gradient(90deg, #FDBA74 0 4px, transparent 4px 8px)" }} />
          {lstStages.map((objStage, intIndex) => {
            const decLeft = lstStages.length > 1 ? (intIndex / (lstStages.length - 1)) * 100 : 0;
            const strAccent = objStage.strStatus === "completed"
              ? DASHBOARD_COLORS.green
              : objStage.strStatus === "in_progress"
                ? DASHBOARD_COLORS.blue
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
              ? DASHBOARD_COLORS.blue
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
                    flex: 1,
                    p: 1.2,
                    minHeight: 74,
                    borderRadius: "12px",
                    border: `1px solid ${objStage.strStatus === "pending" ? "#F7C99D" : objStage.strStatus === "completed" ? "#BFE7CC" : "#C7D7FF"}`,
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

  return (
    <PanelShell strTitle={resolveWidgetTitle(t, objWidget.strWidgetCode, objWidget.strWidgetName)} strAccent={objTone.accent}>
      <Grid container spacing={1.25}>
        {lstStats.map((objStat) => (
          <Grid key={objStat.strLabel} item xs={lstStats.length > 1 ? 6 : 12}>
            <Box sx={{ p: 1.05, minHeight: 72, borderRadius: "10px", backgroundColor: objTone.surface, border: `1px solid ${objTone.border}` }}>
              <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.72rem" }}>{objStat.strLabel}</Typography>
              <Typography sx={{ mt: 0.25, fontSize: "1.35rem", fontWeight: 800, color: DASHBOARD_COLORS.text }}>
                {objStat.decValue != null ? formatCurrency(objStat.decValue) : formatInteger(objStat.intValue || 0)}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
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
            gridTemplateColumns: "1.7fr 1fr 0.8fr 1fr 0.9fr",
            gap: 1,
            px: 1,
            color: DASHBOARD_COLORS.muted,
            fontSize: "0.72rem",
            fontWeight: 700,
          }}
        >
          <Typography sx={{ fontSize: "0.72rem" }}>Run Name</Typography>
          <Typography sx={{ fontSize: "0.72rem" }}>Payroll Month</Typography>
          <Typography sx={{ fontSize: "0.72rem" }}>Employees</Typography>
          <Typography sx={{ fontSize: "0.72rem" }}>Net Pay</Typography>
          <Typography sx={{ fontSize: "0.72rem" }}>Status</Typography>
        </Box>
        {lstRows.length ? (
          lstRows.map((objRow) => (
            <Box
              key={objRow.id}
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1.7fr 1fr 0.8fr 1fr 0.9fr" },
                gap: { xs: 0.65, md: 1 },
                borderRadius: "12px",
                px: 1.1,
                py: 0.9,
                border: `1px solid ${DASHBOARD_COLORS.border}`,
                backgroundColor: "#FFFFFF",
              }}
            >
              <Box>
                <Typography sx={{ display: { xs: "block", md: "none" }, color: DASHBOARD_COLORS.muted, fontSize: "0.72rem", mb: 0.2 }}>Run Name</Typography>
                <Typography sx={{ fontWeight: 700, color: DASHBOARD_COLORS.text, fontSize: "0.88rem" }}>{objRow.run_name}</Typography>
              </Box>
              <Box>
                <Typography sx={{ display: { xs: "block", md: "none" }, color: DASHBOARD_COLORS.muted, fontSize: "0.72rem", mb: 0.2 }}>Payroll Month</Typography>
                <Typography sx={{ color: "#475569", fontSize: "0.82rem", fontWeight: 600 }}>{formatMonth(objRow.payroll_month)}</Typography>
              </Box>
              <Box>
                <Typography sx={{ display: { xs: "block", md: "none" }, color: DASHBOARD_COLORS.muted, fontSize: "0.72rem", mb: 0.2 }}>Employees</Typography>
                <Typography sx={{ color: DASHBOARD_COLORS.text, fontSize: "0.82rem", fontWeight: 700 }}>{formatInteger(objRow.employee_count || 0)}</Typography>
              </Box>
              <Box>
                <Typography sx={{ display: { xs: "block", md: "none" }, color: DASHBOARD_COLORS.muted, fontSize: "0.72rem", mb: 0.2 }}>Net Pay</Typography>
                <Typography sx={{ color: DASHBOARD_COLORS.text, fontSize: "0.82rem", fontWeight: 700 }}>{formatCurrency(objRow.net_pay_total || 0)}</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
                <Chip label={formatStatusText(objRow.run_status)} size="small" sx={{ fontWeight: 700, borderRadius: "999px", backgroundColor: chipBackground(objRow.run_status), color: statusAccentColor(objRow.run_status), fontSize: "0.7rem" }} />
              </Box>
            </Box>
          ))
        ) : (
          <Typography sx={{ color: DASHBOARD_COLORS.muted }}>{t("no_payroll_runs", "No payroll runs available yet.")}</Typography>
        )}
        <Link href="/payroll/runs" style={{ display: "inline-block", marginTop: 8, color: DASHBOARD_COLORS.blue, textDecoration: "none", fontWeight: 700, fontSize: "0.82rem" }}>
          {t("view_all_runs", "View All Runs")}
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
                <Box sx={{ position: "relative", width: 120, height: 72 }}>
                  <Box sx={{ position: "absolute", left: 22, right: 22, bottom: 0, height: 10, borderRadius: "999px", background: "radial-gradient(circle, rgba(37,99,235,0.18) 0%, rgba(37,99,235,0.04) 58%, rgba(37,99,235,0) 100%)" }} />
                  <Box sx={{ position: "absolute", left: 36, top: 18, width: 48, height: 34, borderRadius: "12px", border: `1px solid ${DASHBOARD_COLORS.border}`, background: "linear-gradient(180deg,#F7FBFF 0%, #EEF4FF 100%)", boxShadow: "0 12px 20px rgba(37,99,235,0.08)" }}>
                    <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: DASHBOARD_COLORS.blue }}>
                      <DescriptionRoundedIcon sx={{ fontSize: 24 }} />
                    </Box>
                  </Box>
                  <Box sx={{ position: "absolute", left: 46, top: 0, width: 10, height: 10, borderRadius: "50%", backgroundColor: "#BED6FF" }} />
                  <Box sx={{ position: "absolute", right: 22, top: 10, width: 8, height: 8, borderRadius: "50%", backgroundColor: "#D5E5FF" }} />
                  <Box sx={{ position: "absolute", left: 18, top: 24, width: 6, height: 6, borderRadius: "50%", backgroundColor: "#C7DCFF" }} />
                </Box>
                <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 800, fontSize: "1rem" }}>
                  {t("no_actions_available", "No actions available.")}
                </Typography>
                <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.82rem", textAlign: "center", maxWidth: 320 }}>
                  {t("quick_actions_empty_hint", "You're all caught up. There are no pending actions at the moment.")}
                </Typography>
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

function EssDashboard({ objDashboard, t }: RoleBasedDashboardProps) {
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
              <Box sx={{ width: 86, height: 86, borderRadius: "50%", background: "#ffffff", color: ESS_COLORS.teal, border: "1px solid rgba(255,255,255,0.9)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: "1.42rem", boxShadow: "0 8px 20px rgba(37,99,235,0.08)", flexShrink: 0 }}>
                {getInitials(strEmployeeName)}
              </Box>
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
  children,
}: {
  strTitle: string;
  strSubtitle?: string;
  strAccent?: string;
  children: ReactNode;
}) {
  return (
    <Paper
      sx={{
        p: 2.25,
        width: "100%",
        height: "100%",
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

function getStageColor(strStatus: TrackerStage["strStatus"]) {
  if (strStatus === "completed") return "#16A34A";
  if (strStatus === "in_progress") return "#2563EB";
  return "#94a3b8";
}

function formatStageStatus(strStatus: TrackerStage["strStatus"], t: RoleBasedDashboardProps["t"]) {
  if (strStatus === "completed") return t("completed", "Completed");
  if (strStatus === "in_progress") return t("in_progress", "In Progress");
  return t("pending", "Pending");
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

function formatComparisonMonth(strValue: string) {
  const objDate = new Date(strValue);
  if (Number.isNaN(objDate.getTime())) return "previous month";
  objDate.setMonth(objDate.getMonth() - 1);
  return objDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function formatDateLabel(strValue: string) {
  const objDate = new Date(strValue);
  return Number.isNaN(objDate.getTime()) ? strValue : objDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
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
