"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
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
  blue: "#2563eb",
  green: "#16a34a",
  amber: "#d97706",
  red: "#dc2626",
  text: "#0f172a",
  muted: "#64748b",
  border: "#dbe3ef",
  surface: "#ffffff",
  page: "#f4f7fb",
  blueSoft: "#eff6ff",
  greenSoft: "#f0fdf4",
  amberSoft: "#fffbeb",
  redSoft: "#fef2f2",
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

  return (
    <Stack
      spacing={2.5}
      sx={{
        p: { xs: 1, md: 1.5 },
        backgroundColor: DASHBOARD_COLORS.page,
      }}
    >
      <Grid container spacing={2.5} alignItems="stretch">
        <Grid item xs={12} lg={8}>
          <Paper
            sx={{
              p: { xs: 2, md: 2.5 },
              height: "100%",
              borderRadius: "20px",
              border: `1px solid ${DASHBOARD_COLORS.border}`,
              boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
              backgroundColor: DASHBOARD_COLORS.surface,
            }}
          >
            <Stack spacing={1.5}>
              <Box>
                <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 800, fontSize: { xs: "1.1rem", md: "1.35rem" } }}>
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
                  strAccent={DASHBOARD_COLORS.blue}
                  strBackground={DASHBOARD_COLORS.blueSoft}
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
                  strBackground={intActionRequiredCount > 0 ? DASHBOARD_COLORS.redSoft : DASHBOARD_COLORS.greenSoft}
                />
              </Stack>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <Paper
            sx={{
              p: 2,
              height: "100%",
              borderRadius: "20px",
              border: `1px solid ${DASHBOARD_COLORS.border}`,
              boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
              backgroundColor: DASHBOARD_COLORS.surface,
            }}
          >
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
                backgroundColor: "#f8fafc",
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
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2.5} alignItems="stretch">
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

      <Grid container spacing={2.5} alignItems="stretch">
        <Grid item xs={12} lg={8} sx={{ display: "flex" }}>
          <WorkflowPanel objWidget={objTrackerWidget} t={t} />
        </Grid>
        <Grid item xs={12} lg={4} sx={{ display: "flex" }}>
          <AlertsPanel objWidget={objAlertsWidget} t={t} />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} alignItems="stretch">
        {lstSummaryWidgets.map((objWidget) => (
          <Grid key={objWidget.strWidgetCode} item xs={12} sm={6} lg={3} sx={{ display: "flex" }}>
            <SummaryPanel objWidget={objWidget} t={t} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5} alignItems="stretch">
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
        borderRadius: "20px",
        border: `1px solid ${DASHBOARD_COLORS.border}`,
        borderTop: `4px solid ${objTone.accent}`,
        backgroundColor: DASHBOARD_COLORS.surface,
        boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
      }}
    >
      <Stack justifyContent="space-between" sx={{ height: "100%" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: DASHBOARD_COLORS.muted }}>
              {objWidget.strWidgetName}
            </Typography>
            <Typography sx={{ mt: 1.6, fontSize: "1.9rem", lineHeight: 1.1, fontWeight: 800, color: DASHBOARD_COLORS.text }}>
              {strValue}
            </Typography>
            <Typography sx={{ mt: 0.7, fontSize: "0.82rem", color: DASHBOARD_COLORS.muted }}>
              {strSubtitle}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              flexShrink: 0,
              borderRadius: "14px",
              display: "grid",
              placeItems: "center",
              backgroundColor: objTone.surface,
              color: objTone.accent,
            }}
          >
            {objIcon}
          </Box>
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
      <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 1.5, md: 1.25 }} sx={{ pt: 0.5 }}>
        {lstStages.map((objStage, intIndex) => {
          const strAccent = objStage.strStatus === "completed"
            ? DASHBOARD_COLORS.green
            : objStage.strStatus === "in_progress"
              ? DASHBOARD_COLORS.blue
              : DASHBOARD_COLORS.amber;
          const strBackground = objStage.strStatus === "completed"
            ? DASHBOARD_COLORS.greenSoft
            : objStage.strStatus === "in_progress"
              ? DASHBOARD_COLORS.blueSoft
              : DASHBOARD_COLORS.amberSoft;

          return (
            <Stack key={objStage.strCode} direction={{ xs: "row", md: "column" }} spacing={1.1} sx={{ flex: 1, minWidth: 0, alignItems: { xs: "center", md: "stretch" } }}>
              <Stack direction={{ xs: "row", md: "column" }} spacing={1.1} sx={{ flex: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    minWidth: { xs: 44, md: "auto" },
                    px: 1.1,
                    py: 0.8,
                    borderRadius: "14px",
                    border: `1px solid ${strAccent}`,
                    backgroundColor: strBackground,
                    color: strAccent,
                    fontWeight: 800,
                    fontSize: "0.78rem",
                    textAlign: "center",
                  }}
                >
                  {intIndex + 1}
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    p: 1.25,
                    borderRadius: "16px",
                    border: `1px solid ${objStage.strStatus === "pending" ? DASHBOARD_COLORS.border : strAccent}`,
                    backgroundColor: DASHBOARD_COLORS.surface,
                  }}
                >
                  <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 700, fontSize: "0.82rem", lineHeight: 1.35 }}>
                    {objStage.strLabel}
                  </Typography>
                  <Typography sx={{ mt: 0.55, fontSize: "0.76rem", color: strAccent, fontWeight: 700 }}>
                    {formatStageStatus(objStage.strStatus, t)}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          );
        })}
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
                borderRadius: "14px",
                px: 1.25,
                py: 1,
                border: `1px solid ${blnHasCount ? "#fecaca" : DASHBOARD_COLORS.border}`,
                backgroundColor: blnHasCount ? DASHBOARD_COLORS.redSoft : DASHBOARD_COLORS.surface,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: "8px", display: "grid", placeItems: "center", backgroundColor: blnHasCount ? "#fee2e2" : DASHBOARD_COLORS.amberSoft }}>
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
            <Box sx={{ p: 1.35, borderRadius: "14px", backgroundColor: objTone.surface, border: `1px solid ${objTone.border}` }}>
              <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.74rem" }}>{objStat.strLabel}</Typography>
              <Typography sx={{ mt: 0.45, fontSize: "1.55rem", fontWeight: 800, color: DASHBOARD_COLORS.text }}>
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
                borderRadius: "16px",
                px: 1.25,
                py: 1.2,
                border: `1px solid ${DASHBOARD_COLORS.border}`,
                backgroundColor: "#f8fafc",
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
            <Typography sx={{ color: DASHBOARD_COLORS.muted }}>{t("no_actions_available", "No actions available.")}</Typography>
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
  const strEmployeeCode = String(objWelcome.strEmployeeCode || "").trim();
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
  const strDashboardSubtitle = t("ess_title", "Focus on pay, pending items, and quick actions.");

  return (
    <Stack spacing={2.5} sx={{ p: { xs: 1, md: 1.5 }, backgroundColor: DASHBOARD_COLORS.page }}>
      <Box sx={{ px: { xs: 0.25, md: 0.5 } }}>
        <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 800, letterSpacing: "-0.02em", fontSize: { xs: "1.1rem", md: "1.35rem" } }}>
          {strDashboardTitle}
        </Typography>
        <Typography sx={{ mt: 0.35, color: DASHBOARD_COLORS.muted, fontSize: "0.9rem" }}>
          {strDashboardSubtitle}
        </Typography>
      </Box>

      <Grid container spacing={2.5} alignItems="stretch">
        <Grid item xs={12} lg={4} sx={{ display: "flex" }}>
          <Paper sx={{ p: 2.25, height: "100%", width: "100%", borderRadius: "20px", border: `1px solid ${DASHBOARD_COLORS.border}`, backgroundColor: DASHBOARD_COLORS.surface, boxShadow: "0 8px 24px rgba(15,23,42,0.04)" }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ width: 58, height: 58, borderRadius: "16px", backgroundColor: DASHBOARD_COLORS.blueSoft, color: DASHBOARD_COLORS.blue, display: "grid", placeItems: "center", fontWeight: 800, fontSize: "1.2rem", flexShrink: 0 }}>
                {getInitials(strEmployeeName)}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: "0.78rem", color: DASHBOARD_COLORS.muted }}>Welcome back</Typography>
                <Typography sx={{ mt: 0.3, fontSize: "1.15rem", lineHeight: 1.2, fontWeight: 800, color: DASHBOARD_COLORS.text }}>
                  {strEmployeeName}
                </Typography>
                <Typography sx={{ mt: 0.35, color: DASHBOARD_COLORS.muted, fontSize: "0.84rem" }}>{strDesignation}</Typography>
              </Box>
            </Stack>
            <Grid container spacing={1} sx={{ mt: 1.75 }}>
              {[
                { strLabel: "Department", strValue: strDepartment },
                { strLabel: "Location", strValue: strLocation },
                { strLabel: "Joined", strValue: strJoinedOn },
              ].map((objItem) => (
                <Grid key={objItem.strLabel} item xs={12} sm={4} lg={12}>
                  <Box sx={{ px: 1.15, py: 0.95, borderRadius: "14px", border: `1px solid ${DASHBOARD_COLORS.border}`, backgroundColor: "#f8fafc" }}>
                    <Typography sx={{ fontSize: "0.72rem", color: DASHBOARD_COLORS.muted }}>{objItem.strLabel}</Typography>
                    <Typography sx={{ mt: 0.25, fontSize: "0.82rem", fontWeight: 700, color: DASHBOARD_COLORS.text }}>{objItem.strValue}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap" }} useFlexGap>
              {strEmployeeCode ? <Chip label={strEmployeeCode} size="small" sx={{ fontWeight: 700, backgroundColor: DASHBOARD_COLORS.blueSoft, color: DASHBOARD_COLORS.blue }} /> : null}
              <Chip label={`${intCompletedChecks}/${lstProfileChecks.length || 0} profile checks`} size="small" sx={{ fontWeight: 700, backgroundColor: DASHBOARD_COLORS.greenSoft, color: DASHBOARD_COLORS.green }} />
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} lg={4} sx={{ display: "flex" }}>
          <Paper sx={{ p: 2.25, height: "100%", width: "100%", borderRadius: "20px", border: `1px solid #bbf7d0`, borderTop: `4px solid ${DASHBOARD_COLORS.green}`, backgroundColor: DASHBOARD_COLORS.surface, boxShadow: "0 8px 24px rgba(15,23,42,0.04)" }}>
            <Typography sx={{ color: DASHBOARD_COLORS.green, fontWeight: 700, fontSize: "0.8rem" }}>
              {resolveWidgetTitle(t, objPayWidget?.strWidgetCode, objPayWidget?.strWidgetName || "Current Month Pay")}
            </Typography>
            <Typography sx={{ mt: 1.75, fontSize: "2rem", fontWeight: 800, color: DASHBOARD_COLORS.text }}>{formatCurrency(Number(objPay.decValue || 0))}</Typography>
            <Typography sx={{ mt: 0.45, color: DASHBOARD_COLORS.muted, fontSize: "0.84rem" }}>{String(objPay.strSubtitle || t("current_month", "Current Month"))}</Typography>
            <Box sx={{ mt: "auto", pt: 3 }}>
              <Link href="/ess/my-payslips" style={{ color: DASHBOARD_COLORS.blue, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                {t("view_payslips", "View Payslip")}
                <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
              </Link>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} lg={4} sx={{ display: "flex" }}>
          <PanelShell
            strTitle={resolveWidgetTitle(t, objPendingWidget?.strWidgetCode, objPendingWidget?.strWidgetName || "Pending Actions")}
            strSubtitle={lstPendingActions.length ? `${formatInteger(lstPendingActions.length)} ${t("items_need_attention", "items need attention")}` : t("all_clear", "No pending items")}
            strAccent={lstPendingActions.length ? DASHBOARD_COLORS.red : DASHBOARD_COLORS.green}
          >
            <Stack spacing={1}>
              {lstPendingActions.length ? lstPendingActions.slice(0, 4).map((objAction) => (
                <Box key={objAction.strCode} sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, borderRadius: "14px", px: 1.15, py: 1, border: `1px solid ${DASHBOARD_COLORS.border}`, backgroundColor: "#f8fafc" }}>
                  <Stack direction="row" spacing={0.9} alignItems="flex-start" sx={{ minWidth: 0 }}>
                    <Box sx={{ mt: 0.1, width: 24, height: 24, borderRadius: "8px", backgroundColor: DASHBOARD_COLORS.redSoft, display: "grid", placeItems: "center", color: DASHBOARD_COLORS.red }}>
                      {pendingActionIcon(objAction.strCode)}
                    </Box>
                    <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 600, fontSize: "0.82rem", lineHeight: 1.35 }}>{objAction.strLabel}</Typography>
                  </Stack>
                  <Link href={objAction.strRoutePath || "/dashboard"} style={{ color: DASHBOARD_COLORS.blue, textDecoration: "none", fontWeight: 700, whiteSpace: "nowrap", fontSize: "0.8rem" }}>{t("action", "Action")}</Link>
                </Box>
              )) : <Typography sx={{ color: DASHBOARD_COLORS.muted }}>{t("no_pending_actions", "No pending actions.")}</Typography>}
              <Link href={objPrimaryPendingAction?.strRoutePath || "/dashboard"} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 4, color: DASHBOARD_COLORS.blue, fontWeight: 700, textDecoration: "none" }}>
                {t("view_all", "View All")}
                <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
              </Link>
            </Stack>
          </PanelShell>
        </Grid>
      </Grid>

      <Grid container spacing={2.5} alignItems="stretch">
        <Grid item xs={12} lg={8} sx={{ display: "flex" }}>
          <PanelShell strTitle={resolveWidgetTitle(t, objQuickActionsWidget?.strWidgetCode, objQuickActionsWidget?.strWidgetName || "Quick Actions")} strSubtitle={t("quick_actions_subtitle", "Common employee tasks")} strAccent={DASHBOARD_COLORS.blue}>
            <Grid container spacing={1.25}>
              {lstQuickActions.map((objAction) => (
                <Grid key={objAction.strActionCode} item xs={6} sm={4} md={3} sx={{ display: "flex" }}>
                  <Link href={objAction.strRoutePath || "/dashboard"} style={{ display: "block", width: "100%", textDecoration: "none" }}>
                    <Paper sx={{ p: 1.25, height: "100%", borderRadius: "16px", border: `1px solid ${DASHBOARD_COLORS.border}`, boxShadow: "none", backgroundColor: "#f8fafc" }}>
                      <Stack spacing={0.9} alignItems="flex-start">
                        <Box sx={{ width: 40, height: 40, borderRadius: "12px", backgroundColor: quickActionColor(objAction.strActionCode), display: "grid", placeItems: "center" }}>
                          {renderEssQuickActionIcon(objAction.strActionCode)}
                        </Box>
                        <Typography sx={{ fontWeight: 700, color: DASHBOARD_COLORS.text, fontSize: "0.8rem", lineHeight: 1.3 }}>{objAction.strActionName}</Typography>
                      </Stack>
                    </Paper>
                  </Link>
                </Grid>
              ))}
            </Grid>
          </PanelShell>
        </Grid>
        <Grid item xs={12} lg={4} sx={{ display: "flex" }}>
          <Paper sx={{ p: 2.25, height: "100%", width: "100%", borderRadius: "20px", border: `1px solid #bbf7d0`, borderTop: `4px solid ${DASHBOARD_COLORS.green}`, backgroundColor: DASHBOARD_COLORS.surface, boxShadow: "0 8px 24px rgba(15,23,42,0.04)" }}>
            <Typography sx={{ color: DASHBOARD_COLORS.green, fontWeight: 700, fontSize: "0.8rem" }}>
              {resolveWidgetTitle(t, objProfileWidget?.strWidgetCode, objProfileWidget?.strWidgetName || "Profile Completeness")}
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1.75 }}>
              <MiniDonutChart lstPoints={lstProfileChartPoints} t={t} blnCompact />
              <Box>
                <Typography sx={{ fontSize: "1.85rem", fontWeight: 800, color: DASHBOARD_COLORS.text }}>{formatInteger(intProfileCompletionPercent)}%</Typography>
                <Typography sx={{ mt: 0.15, color: DASHBOARD_COLORS.muted, fontSize: "0.82rem" }}>{t("complete", "Complete")}</Typography>
              </Box>
            </Stack>
            <Link href="/ess/my-profile" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 18, color: DASHBOARD_COLORS.blue, fontWeight: 700, textDecoration: "none" }}>
              {t("improve_profile", "Improve Profile")}
              <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
            </Link>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2.5} alignItems="stretch">
        <Grid item xs={12} lg={4} sx={{ display: "flex" }}>
          <PanelShell
            strTitle={`${resolveWidgetTitle(t, objItWidget?.strWidgetCode, objItWidget?.strWidgetName || "IT Declaration")} (${String((objItWidget?.objPayload as Record<string, unknown> | undefined)?.strFinancialYearCode || "Current FY")})`}
            strAccent={statusAccentColor(strItStatus)}
          >
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
              {intProofPendingCount > 0 ? (
                <Typography sx={{ color: DASHBOARD_COLORS.red, fontWeight: 700, fontSize: "0.8rem" }}>
                  {`${formatInteger(intProofPendingCount)} proof${intProofPendingCount > 1 ? "s" : ""} pending`}
                </Typography>
              ) : null}
            </Stack>
            <Link href="/salary/it-declaration" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 16, color: DASHBOARD_COLORS.blue, fontWeight: 700, textDecoration: "none" }}>
              {t("view_update", "View / Update")}
              <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
            </Link>
          </PanelShell>
        </Grid>

        <Grid item xs={12} lg={4} sx={{ display: "flex" }}>
          <PanelShell strTitle={resolveWidgetTitle(t, objReimbursementWidget?.strWidgetCode, objReimbursementWidget?.strWidgetName || "Reimbursement Summary")} strAccent={DASHBOARD_COLORS.amber}>
            <Grid container spacing={1.15}>
              <Grid item xs={6}>
                <Box sx={{ p: 1.15, borderRadius: "14px", backgroundColor: DASHBOARD_COLORS.amberSoft, border: "1px solid #fde68a" }}>
                  <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.74rem" }}>Total Claims</Typography>
                  <Typography sx={{ mt: 0.3, fontWeight: 800, color: DASHBOARD_COLORS.text, fontSize: "1.5rem" }}>{formatInteger(intTotalClaims)}</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ p: 1.15, borderRadius: "14px", backgroundColor: DASHBOARD_COLORS.greenSoft, border: "1px solid #bbf7d0" }}>
                  <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.74rem" }}>Approved</Typography>
                  <Typography sx={{ mt: 0.3, fontWeight: 800, color: DASHBOARD_COLORS.text, fontSize: "1.5rem" }}>{formatInteger(intApprovedClaims)}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ p: 1.15, borderRadius: "14px", backgroundColor: "#f8fafc", border: `1px solid ${DASHBOARD_COLORS.border}` }}>
                  <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.74rem" }}>Total Amount</Typography>
                  <Typography sx={{ mt: 0.3, fontWeight: 800, color: DASHBOARD_COLORS.text, fontSize: "1.25rem" }}>{formatCurrency(decTotalClaimAmount)}</Typography>
                </Box>
              </Grid>
            </Grid>
            <Link href="/ess/reimbursements" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 16, color: DASHBOARD_COLORS.blue, fontWeight: 700, textDecoration: "none" }}>
              {t("view_my_claims", "View My Claims")}
              <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
            </Link>
          </PanelShell>
        </Grid>

        <Grid item xs={12} lg={4} sx={{ display: "flex" }}>
          <PanelShell strTitle={resolveWidgetTitle(t, objPayslipWidget?.strWidgetCode, objPayslipWidget?.strWidgetName || "Last 3 Payslips")} strAccent={DASHBOARD_COLORS.blue}>
            <Stack spacing={1}>
              {lstPayslips.length ? lstPayslips.map((objRow) => (
                <Box key={String(objRow.result_id)} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, borderRadius: "14px", px: 1.15, py: 1, border: `1px solid ${DASHBOARD_COLORS.border}`, backgroundColor: "#f8fafc" }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, color: DASHBOARD_COLORS.text, fontSize: "0.86rem" }}>{formatMonth(String(objRow.payroll_month || ""))}</Typography>
                    <Typography sx={{ color: DASHBOARD_COLORS.muted, fontSize: "0.74rem" }}>Net Pay</Typography>
                  </Box>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 700, fontSize: "0.88rem" }}>{formatCurrency(Number(objRow.net_pay || 0))}</Typography>
                    <Link href="/ess/my-payslips" style={{ color: DASHBOARD_COLORS.blue, textDecoration: "none", fontWeight: 700, fontSize: "0.8rem", whiteSpace: "nowrap" }}>{t("download", "Download")}</Link>
                  </Stack>
                </Box>
              )) : <Typography sx={{ color: DASHBOARD_COLORS.muted }}>{t("no_payslips", "No payslips generated yet.")}</Typography>}
            </Stack>
            <Link href="/ess/my-payslips" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 16, color: DASHBOARD_COLORS.blue, fontWeight: 700, textDecoration: "none" }}>
              {t("view_all_payslips", "View All Payslips")}
              <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
            </Link>
          </PanelShell>
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} sx={{ display: "flex" }}>
          <PanelShell strTitle={t("profile_checklist", "Profile Completeness")} strAccent={DASHBOARD_COLORS.green}>
            <Grid container spacing={1.25}>
              {lstProfileChecks.map((objCheck) => (
                <Grid key={String(objCheck.strCode)} item xs={12} sm={6} lg={4}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, borderRadius: "14px", px: 1.25, py: 1.05, border: `1px solid ${objCheck.blnComplete ? "#bbf7d0" : "#fecaca"}`, backgroundColor: objCheck.blnComplete ? DASHBOARD_COLORS.greenSoft : DASHBOARD_COLORS.redSoft }}>
                    <Typography sx={{ color: DASHBOARD_COLORS.text, fontWeight: 600, fontSize: "0.84rem" }}>{String(objCheck.strLabel || "")}</Typography>
                    <Stack direction="row" spacing={0.6} alignItems="center">
                      <CheckCircleRoundedIcon sx={{ color: objCheck.blnComplete ? DASHBOARD_COLORS.green : DASHBOARD_COLORS.red, fontSize: 18 }} />
                      <Typography sx={{ color: objCheck.blnComplete ? DASHBOARD_COLORS.green : DASHBOARD_COLORS.red, fontWeight: 700, fontSize: "0.78rem" }}>
                        {objCheck.blnComplete ? t("verified", "Verified") : t("not_provided", "Not Provided")}
                      </Typography>
                    </Stack>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </PanelShell>
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
        borderRadius: "20px",
        border: `1px solid ${DASHBOARD_COLORS.border}`,
        borderTop: `4px solid ${strAccent}`,
        backgroundColor: DASHBOARD_COLORS.surface,
        boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
      }}
    >
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
  if (strStatus === "completed") return "#059669";
  if (strStatus === "in_progress") return "#2563eb";
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
    <Box sx={{ px: 1.15, py: 0.9, borderRadius: "14px", border: `1px solid ${strAccent}`, backgroundColor: strBackground }}>
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
  if (strCode.includes("reimbursement")) return { accent: DASHBOARD_COLORS.green, surface: DASHBOARD_COLORS.greenSoft, border: "#bbf7d0" };
  if (strCode.includes("statutory")) return { accent: DASHBOARD_COLORS.blue, surface: DASHBOARD_COLORS.blueSoft, border: "#bfdbfe" };
  if (strCode.includes("tax")) return { accent: DASHBOARD_COLORS.red, surface: DASHBOARD_COLORS.redSoft, border: "#fecaca" };
  return { accent: DASHBOARD_COLORS.amber, surface: DASHBOARD_COLORS.amberSoft, border: "#fde68a" };
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
