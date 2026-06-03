"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

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

const lstPayrollCardPalette = [
  "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
  "linear-gradient(135deg, #0f9f6e 0%, #22c55e 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #fb923c 100%)",
  "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
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

function PayrollDashboard({ objDashboard, t }: RoleBasedDashboardProps) {
  const lstWidgets = objDashboard.lstWidgets;
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
  const lstPayrollMonths = Array.from(
    new Set(
      lstRecentRunRows
        .map((objRow) => String(objRow.payroll_month || "").trim())
        .filter(Boolean),
    ),
  );
  const lstMonthOptions = lstPayrollMonths.length ? lstPayrollMonths : [new Date().toISOString().slice(0, 7)];
  const [strSelectedMonth, setStrSelectedMonth] = useState(lstMonthOptions[0]);

  return (
    <Stack
      spacing={2.5}
      sx={{
        p: { xs: 1, md: 1.5 },
        borderRadius: "28px",
        background: "radial-gradient(circle at top right, rgba(59,130,246,0.12), transparent 22%), linear-gradient(180deg, #fbfdff 0%, #f8fbff 55%, #fffdf8 100%)",
      }}
    >
      <Stack direction="row" justifyContent="flex-end">
        <Paper
          sx={{
            minWidth: 226,
            borderRadius: "16px",
            border: "1px solid rgba(226,232,240,0.95)",
            boxShadow: "0 10px 24px rgba(148, 163, 184, 0.16)",
            background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
            overflow: "hidden",
          }}
        >
          <Select
            value={strSelectedMonth}
            onChange={(objEvent) => setStrSelectedMonth(String(objEvent.target.value || ""))}
            fullWidth
            variant="standard"
            disableUnderline
            IconComponent={KeyboardArrowDownRoundedIcon}
            sx={{
              px: 2,
              py: 0.7,
              fontWeight: 700,
              color: "#1e293b",
              "& .MuiSelect-select": { py: 1.3, pr: 4 },
              "& .MuiSvgIcon-root": { color: "#64748b", right: 14 },
            }}
            renderValue={(strValue) => `${formatMonth(String(strValue))} Payroll`}
          >
            {lstMonthOptions.map((strMonth) => (
              <MenuItem key={strMonth} value={strMonth}>
                {formatMonth(strMonth)} Payroll
              </MenuItem>
            ))}
          </Select>
        </Paper>
      </Stack>

      <Grid container spacing={2.5}>
        {lstKpiWidgets.map((objWidget, intIndex) => (
          <Grid key={objWidget.strWidgetCode} item xs={12} sm={6} xl={3}>
            <PayrollKpiPanel
              objWidget={objWidget}
              strBackground={lstPayrollCardPalette[intIndex % lstPayrollCardPalette.length]}
              strSelectedMonth={strSelectedMonth}
              t={t}
            />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={8}>
          <WorkflowPanel objWidget={objTrackerWidget} t={t} />
        </Grid>
        <Grid item xs={12} lg={4}>
          <AlertsPanel objWidget={objAlertsWidget} t={t} />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        {lstSummaryWidgets.map((objWidget) => (
          <Grid key={objWidget.strWidgetCode} item xs={12} sm={6} lg={3}>
            <SummaryPanel objWidget={objWidget} t={t} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={7}>
          <RecentRunsPanel objWidget={objRecentRunsWidget} t={t} />
        </Grid>
        <Grid item xs={12} lg={5}>
          <QuickActionsPanel objWidget={objQuickActionsWidget} t={t} />
        </Grid>
      </Grid>
    </Stack>
  );
}

function PayrollKpiPanel({
  objWidget,
  strBackground,
  strSelectedMonth,
  t,
}: {
  objWidget: DashboardWidget;
  strBackground: string;
  strSelectedMonth: string;
  t: RoleBasedDashboardProps["t"];
}) {
  const objPayload = (objWidget.objPayload || {}) as KpiPayload;
  const strValue = objPayload.decValue != null ? formatCurrency(objPayload.decValue) : formatInteger(objPayload.intValue || 0);
  const decTrendValue = objPayload.decTrendValue;
  const strMonthLabel = formatMonth(strSelectedMonth);
  const strComparisonMonth = formatComparisonMonth(strSelectedMonth);
  const strTrendText = decTrendValue == null
    ? `${objWidget.strWidgetCode === "payroll_validation_errors" ? "↓" : "↑"} 0 ${t("vs_previous", "vs")} ${strComparisonMonth}`
    : `${decTrendValue >= 0 ? "↑" : "↓"} ${Math.abs(decTrendValue)}% ${t("vs_previous", "vs")} ${strComparisonMonth}`;
  const objIcon = getKpiIcon(objWidget.strWidgetCode);
  const strSubtitle = objWidget.strWidgetCode === "net_payroll_amount"
    ? `This Month (${strMonthLabel})`
    : objPayload.strSubtitle || t("current_snapshot", "Current Snapshot");

  return (
    <Paper
      sx={{
        p: 2.6,
        borderRadius: "20px",
        color: "#fff",
        background: `${strBackground}`,
        minHeight: 190,
        position: "relative",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.22)",
        boxShadow: "0 16px 32px rgba(15,23,42,0.14), inset 0 1px 0 rgba(255,255,255,0.18)",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at top left, rgba(255,255,255,0.18), transparent 34%)",
          pointerEvents: "none",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          right: -34,
          bottom: -38,
          width: 154,
          height: 154,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 45%, transparent 72%)",
          pointerEvents: "none",
        },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Typography sx={{ fontSize: "0.84rem", fontWeight: 700, opacity: 0.96 }}>{objWidget.strWidgetName}</Typography>
          <Typography sx={{ mt: 2.1, fontSize: "2.08rem", lineHeight: 1.08, fontWeight: 800, letterSpacing: "-0.035em" }}>{strValue}</Typography>
          <Typography sx={{ mt: 1.1, fontSize: "0.84rem", fontWeight: 500, opacity: 0.9 }}>{strSubtitle}</Typography>
        </Box>
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.18), rgba(255,255,255,0.08) 58%, rgba(255,255,255,0.04) 100%)",
            position: "relative",
            zIndex: 1,
          }}
        >
          {objIcon}
        </Box>
      </Stack>
      <Typography sx={{ position: "relative", zIndex: 1, mt: 2.3, fontSize: "0.84rem", fontWeight: 700, opacity: 0.95 }}>
        {strTrendText}
      </Typography>
    </Paper>
  );
}

function WorkflowPanel({ objWidget, t }: { objWidget?: DashboardWidget; t: RoleBasedDashboardProps["t"] }) {
  const lstStages = (((objWidget?.objPayload as { lstStages?: TrackerStage[] } | undefined)?.lstStages) || []) as TrackerStage[];
  return (
    <PanelShell strTitle={resolveWidgetTitle(t, objWidget?.strWidgetCode, objWidget?.strWidgetName || "Payroll Workflow Tracker")}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 2.2, md: 0 }}
        justifyContent="space-between"
        sx={{ position: "relative", pt: 1.2 }}
      >
        {lstStages.map((objStage, intIndex) => (
          <Stack key={objStage.strCode} spacing={1} sx={{ flex: 1, position: "relative", minWidth: 0, alignItems: "center", textAlign: "center" }}>
            <Box sx={{ position: "relative", width: "100%", display: "flex", justifyContent: "center" }}>
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                  fontSize: "0.92rem",
                  color: objStage.strStatus === "completed" ? "#ffffff" : objStage.strStatus === "in_progress" ? "#2563eb" : "#94a3b8",
                  border: objStage.strStatus === "in_progress" ? "3px solid #2563eb" : objStage.strStatus === "pending" ? "2px solid #d5dbe7" : "none",
                  backgroundColor: objStage.strStatus === "completed" ? "#12b981" : objStage.strStatus === "in_progress" ? "#ffffff" : "#eef2f7",
                  boxShadow: objStage.strStatus === "in_progress" ? "0 0 0 4px rgba(37,99,235,0.08)" : "none",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {objStage.strStatus === "completed" ? "✓" : objStage.strStatus === "pending" ? "◌" : ""}
              </Box>
              {intIndex < lstStages.length - 1 ? (
                <Box
                  sx={{
                    position: "absolute",
                    top: 16,
                    left: "50%",
                    width: "100%",
                    height: 2,
                    backgroundColor: objStage.strStatus === "completed" ? "#34d399" : "#e2e8f0",
                    display: { xs: "none", md: "block" },
                  }}
                />
              ) : null}
            </Box>
            <Typography sx={{ fontWeight: 700, color: "#111827", fontSize: "0.74rem", lineHeight: 1.35, minHeight: 34 }}>
              {`${intIndex + 1}. ${objStage.strLabel}`}
            </Typography>
            <Typography sx={{ fontSize: "0.72rem", color: getStageColor(objStage.strStatus), fontWeight: 700 }}>
              {formatStageStatus(objStage.strStatus, t)}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </PanelShell>
  );
}

function AlertsPanel({ objWidget, t }: { objWidget?: DashboardWidget; t: RoleBasedDashboardProps["t"] }) {
  const lstAlerts = (((objWidget?.objPayload as { lstAlerts?: AlertRow[] } | undefined)?.lstAlerts) || []) as AlertRow[];
  return (
    <PanelShell strTitle={resolveWidgetTitle(t, objWidget?.strWidgetCode, objWidget?.strWidgetName || "Payroll Alerts")}>
      <Stack spacing={1.2}>
        {lstAlerts.map((objAlert) => (
          <Box key={objAlert.strCode} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "14px", px: 1.1, py: 0.95, backgroundColor: "#fffaf5" }}>
            <Stack direction="row" spacing={1.1} alignItems="center">
              <Box sx={{ width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", backgroundColor: "#fff1f2" }}>
                <WarningAmberRoundedIcon sx={{ color: "#f97316", fontSize: 15 }} />
              </Box>
              <Typography sx={{ color: "#1f2937", fontWeight: 600, fontSize: "0.84rem" }}>{objAlert.strLabel}</Typography>
            </Stack>
            <Typography sx={{ color: "#ea580c", fontWeight: 800, fontSize: "0.8rem" }}>{formatInteger(objAlert.intCount)} {t("employees", "Employees")}</Typography>
          </Box>
        ))}
        <Link href="/employees" style={{ display: "inline-block", marginTop: 8, color: "#2563eb", textDecoration: "none", fontWeight: 700, fontSize: "0.82rem" }}>
          {t("view_all_alerts", "View All Alerts")}
        </Link>
      </Stack>
    </PanelShell>
  );
}

function SummaryPanel({ objWidget, t }: { objWidget: DashboardWidget; t: RoleBasedDashboardProps["t"] }) {
  const lstStats = (((objWidget.objPayload as { lstStats?: SummaryStat[] } | undefined)?.lstStats) || []) as SummaryStat[];
  return (
    <PanelShell strTitle={resolveWidgetTitle(t, objWidget.strWidgetCode, objWidget.strWidgetName)}>
      <Grid container spacing={1.4}>
        {lstStats.map((objStat) => (
          <Grid key={objStat.strLabel} item xs={lstStats.length > 1 ? 6 : 12}>
            <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>{objStat.strLabel}</Typography>
            <Typography sx={{ mt: 0.45, fontSize: "1.72rem", fontWeight: 800, color: "#111827" }}>
              {objStat.decValue != null ? formatCurrency(objStat.decValue) : formatInteger(objStat.intValue || 0)}
            </Typography>
          </Grid>
        ))}
      </Grid>
    </PanelShell>
  );
}

function RecentRunsPanel({ objWidget, t }: { objWidget?: DashboardWidget; t: RoleBasedDashboardProps["t"] }) {
  const lstRows = (((objWidget?.objPayload as { lstRows?: RecentRunRow[] } | undefined)?.lstRows) || []) as RecentRunRow[];
  return (
    <PanelShell strTitle={resolveWidgetTitle(t, objWidget?.strWidgetCode, objWidget?.strWidgetName || "Recent Payroll Runs")}>
      <Stack spacing={1.2}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1.6fr 0.9fr 0.8fr 1fr 0.8fr", gap: 1, px: 0.6, color: "#94a3b8", fontSize: "0.72rem", fontWeight: 700 }}>
          <Typography sx={{ fontSize: "0.72rem" }}>Run Name</Typography>
          <Typography sx={{ fontSize: "0.72rem" }}>Payroll Month</Typography>
          <Typography sx={{ fontSize: "0.72rem" }}>Employees</Typography>
          <Typography sx={{ fontSize: "0.72rem" }}>Net Pay Amount</Typography>
          <Typography sx={{ fontSize: "0.72rem" }}>Status</Typography>
        </Box>
        {lstRows.length ? (
          lstRows.map((objRow) => (
            <Box key={objRow.id} sx={{ display: "grid", gridTemplateColumns: "1.6fr 0.9fr 0.8fr 1fr 0.8fr", gap: 1, borderRadius: "14px", px: 0.9, py: 1.05, backgroundColor: "#f8fafc" }}>
              <Box>
                <Typography sx={{ fontWeight: 700, color: "#111827", fontSize: "0.9rem" }}>{objRow.run_name}</Typography>
              </Box>
              <Typography sx={{ color: "#475569", fontSize: "0.82rem", fontWeight: 600 }}>{formatMonth(objRow.payroll_month)}</Typography>
              <Typography sx={{ color: "#0f172a", fontSize: "0.82rem", fontWeight: 700 }}>{formatInteger(objRow.employee_count || 0)}</Typography>
              <Typography sx={{ color: "#0f172a", fontSize: "0.82rem", fontWeight: 700 }}>{formatCurrency(objRow.net_pay_total || 0)}</Typography>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
                <Chip label={formatStatusText(objRow.run_status)} size="small" sx={{ fontWeight: 700, borderRadius: "999px", backgroundColor: chipBackground(objRow.run_status), fontSize: "0.7rem" }} />
              </Box>
            </Box>
          ))
        ) : (
          <Typography sx={{ color: "#64748b" }}>{t("no_payroll_runs", "No payroll runs available yet.")}</Typography>
        )}
        <Link href="/payroll/runs" style={{ display: "inline-block", alignSelf: "center", marginTop: 10, color: "#2563eb", textDecoration: "none", fontWeight: 700, fontSize: "0.82rem" }}>
          {t("view_all_runs", "View All Runs")}
        </Link>
      </Stack>
    </PanelShell>
  );
}

function QuickActionsPanel({ objWidget, t }: { objWidget?: DashboardWidget; t: RoleBasedDashboardProps["t"] }) {
  const lstActions = (((objWidget?.objPayload as { lstActions?: DashboardQuickAction[] } | undefined)?.lstActions) || []) as DashboardQuickAction[];
  return (
    <PanelShell strTitle={resolveWidgetTitle(t, objWidget?.strWidgetCode, objWidget?.strWidgetName || "Quick Actions")}>
      <Grid container spacing={1.5}>
        {lstActions.length ? lstActions.map((objAction) => (
          <Grid key={objAction.strActionCode} item xs={12} sm={6}>
            <Link href={objAction.strRoutePath || "/dashboard"} style={{ display: "block", textDecoration: "none" }}>
              <Paper sx={{ p: 1.6, borderRadius: "16px", border: "1px solid rgba(226,232,240,1)", boxShadow: "none" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1.1} alignItems="center">
                    <Box sx={{ width: 34, height: 34, borderRadius: "10px", backgroundColor: quickActionColor(objAction.strActionCode), display: "grid", placeItems: "center" }}>
                      {renderQuickActionIcon(objAction.strActionCode)}
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 700, color: "#111827", fontSize: "0.84rem" }}>{objAction.strActionName}</Typography>
                      <Typography sx={{ mt: 0.2, color: "#64748b", fontSize: "0.72rem" }}>{quickActionSubtitle(objAction.strActionCode, t)}</Typography>
                    </Box>
                  </Stack>
                  <Box sx={{ color: "#94a3b8" }}>
                    <ArrowForwardRoundedIcon sx={{ fontSize: 18 }} />
                  </Box>
                </Stack>
              </Paper>
            </Link>
          </Grid>
        )) : (
          <Grid item xs={12}>
            <Typography sx={{ color: "#64748b" }}>{t("no_actions_available", "No actions available.")}</Typography>
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
  const objWelcomeWidget = objDashboard.lstWidgets.find((objWidget) => objWidget.strWidgetCode === "welcome_profile");
  const objPayWidget = objDashboard.lstWidgets.find((objWidget) => objWidget.strWidgetCode === "current_month_pay");
  const objProfileWidget = objDashboard.lstWidgets.find((objWidget) => objWidget.strWidgetCode === "profile_completeness");
  const objItWidget = objDashboard.lstWidgets.find((objWidget) => objWidget.strWidgetCode === "it_declaration_card");
  const objReimbursementWidget = objDashboard.lstWidgets.find((objWidget) => objWidget.strWidgetCode === "reimbursement_card");
  const objPendingWidget = objDashboard.lstWidgets.find((objWidget) => objWidget.strWidgetCode === "pending_actions");
  const objPayslipWidget = objDashboard.lstWidgets.find((objWidget) => objWidget.strWidgetCode === "last_3_payslips");
  const objQuickActionsWidget = objDashboard.lstWidgets.find((objWidget) => objWidget.strWidgetCode === "quick_actions");
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

  return (
    <Stack
      spacing={2.5}
      sx={{
        p: { xs: 0.5, md: 1 },
        borderRadius: "30px",
        background: "radial-gradient(circle at top left, rgba(16,185,129,0.10), transparent 18%), radial-gradient(circle at top right, rgba(99,102,241,0.08), transparent 18%), linear-gradient(180deg, #f7fbff 0%, #f8fcfa 100%)",
      }}
    >
      <Box sx={{ px: { xs: 0.5, md: 1 } }}>
        <Typography sx={{ color: "#0f172a", fontWeight: 900, letterSpacing: "0.06em", fontSize: { xs: "1.12rem", md: "1.28rem" } }}>
          {t("ess_eyebrow", "EMPLOYEE SELF SERVICE DASHBOARD")}
        </Typography>
        <Typography sx={{ mt: 0.45, color: "#64748b", fontSize: "0.92rem" }}>
          {t("ess_title", "Welcome back, here's what's happening with you")}
        </Typography>
      </Box>

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, height: "100%", borderRadius: "28px", color: "#ffffff", background: "linear-gradient(135deg, #11b69a 0%, #0ea5a5 54%, #1570ef 100%)", minHeight: 250, boxShadow: "0 22px 42px rgba(15,118,110,0.20)", position: "relative", overflow: "hidden" }}>
            <Box sx={{ position: "absolute", inset: 0, background: "radial-gradient(circle at top right, rgba(255,255,255,0.20), transparent 28%)" }} />
            <Stack direction="row" spacing={2.1} alignItems="center" sx={{ position: "relative", zIndex: 1 }}>
              <Box sx={{ width: 92, height: 92, borderRadius: "50%", background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(226,232,240,0.94) 100%)", border: "3px solid rgba(255,255,255,0.2)", display: "grid", placeItems: "center", color: "#0f172a", fontWeight: 800, fontSize: "2rem", flexShrink: 0 }}>
                {getInitials(strEmployeeName)}
              </Box>
              <Box>
                <Typography sx={{ fontSize: "0.92rem", opacity: 0.95 }}>Welcome back,</Typography>
                <Typography sx={{ mt: 0.45, fontSize: "1.72rem", lineHeight: 1.1, fontWeight: 800 }}>{strEmployeeName}</Typography>
                <Typography sx={{ mt: 0.55, opacity: 0.92 }}>{strDesignation}</Typography>
                {strEmployeeCode ? (
                  <Chip
                    label={strEmployeeCode}
                    size="small"
                    sx={{ mt: 1.2, height: 28, color: "#ecfeff", backgroundColor: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.18)", fontWeight: 700 }}
                  />
                ) : null}
              </Box>
            </Stack>
            <Grid container spacing={1.3} sx={{ mt: 3.1, position: "relative", zIndex: 1 }}>
              {[
                { strLabel: "Department", strValue: strDepartment },
                { strLabel: "Location", strValue: strLocation },
                { strLabel: "Joined", strValue: strJoinedOn },
              ].map((objItem) => (
                <Grid key={objItem.strLabel} item xs={12} sm={4}>
                  <Box sx={{ borderRadius: "18px", px: 1.4, py: 1.2, backgroundColor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.16)" }}>
                    <Typography sx={{ fontSize: "0.72rem", opacity: 0.84 }}>{objItem.strLabel}</Typography>
                    <Typography sx={{ mt: 0.3, fontSize: "0.88rem", fontWeight: 700 }}>{objItem.strValue}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Stack direction="row" spacing={1.1} sx={{ mt: 2.2, position: "relative", zIndex: 1, flexWrap: "wrap" }}>
              <Chip label={`${intCompletedChecks}/${lstProfileChecks.length || 0} profile checks`} sx={{ color: "#ecfeff", backgroundColor: "rgba(255,255,255,0.12)", fontWeight: 700 }} />
              <Chip label={`${lstPendingActions.length} pending actions`} sx={{ color: "#ecfeff", backgroundColor: "rgba(255,255,255,0.12)", fontWeight: 700 }} />
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Paper sx={{ p: 3, height: "100%", borderRadius: "28px", minHeight: 250, background: "linear-gradient(135deg, #ecebff 0%, #d9ddff 100%)", boxShadow: "0 16px 28px rgba(99,102,241,0.12)", position: "relative", overflow: "hidden" }}>
            <Typography sx={{ color: "#4338ca", fontWeight: 700 }}>{resolveWidgetTitle(t, objPayWidget?.strWidgetCode, objPayWidget?.strWidgetName || "Current Month Pay")}</Typography>
            <Typography sx={{ mt: 2.2, fontSize: "2.08rem", fontWeight: 800, color: "#111827" }}>{formatCurrency(Number(objPay.decValue || 0))}</Typography>
            <Typography sx={{ mt: 0.6, color: "#64748b" }}>{String(objPay.strSubtitle || t("current_month", "Current Month"))}</Typography>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mt: 7 }}>
              <Link href="/ess/my-payslips" style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                {t("view_payslips", "View Payslip")}
                <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
              </Link>
              <Box sx={{ width: 58, height: 42, borderRadius: "14px", background: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)", display: "grid", placeItems: "center", color: "#fff", boxShadow: "0 14px 20px rgba(79,70,229,0.25)" }}>
                <AccountBalanceWalletRoundedIcon fontSize="small" />
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Paper sx={{ p: 3, height: "100%", borderRadius: "28px", minHeight: 250, background: "linear-gradient(135deg, #fff8ed 0%, #fff1d2 100%)", boxShadow: "0 16px 28px rgba(245,158,11,0.11)" }}>
            <Typography sx={{ color: "#b45309", fontWeight: 700 }}>{resolveWidgetTitle(t, objProfileWidget?.strWidgetCode, objProfileWidget?.strWidgetName || "Profile Completeness")}</Typography>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2.3 }}>
              <MiniDonutChart lstPoints={lstProfileChartPoints} t={t} blnCompact />
              <Box>
                <Typography sx={{ fontSize: "2rem", fontWeight: 800, color: "#111827" }}>{formatInteger(intProfileCompletionPercent)}%</Typography>
                <Typography sx={{ mt: 0.2, color: "#64748b" }}>{t("complete", "Complete")}</Typography>
              </Box>
            </Stack>
            <Link href="/ess/my-profile" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 18, color: "#0f766e", fontWeight: 700, textDecoration: "none" }}>
              {t("improve_profile", "Improve Profile")}
              <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
            </Link>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2.5, height: "100%", borderRadius: "24px", border: "1px solid rgba(16,185,129,0.14)", background: "linear-gradient(135deg, #f8fffc 0%, #f3faf7 100%)", boxShadow: "0 12px 25px rgba(15,23,42,0.04)" }}>
            <Typography variant="h6" sx={{ color: "#047857", fontWeight: 800, mb: 1.6 }}>
              {`${resolveWidgetTitle(t, objItWidget?.strWidgetCode, objItWidget?.strWidgetName || "IT Declaration")} (${String((objItWidget?.objPayload as Record<string, unknown> | undefined)?.strFinancialYearCode || "Current FY")})`}
            </Typography>
            <Stack spacing={1.5}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CheckCircleRoundedIcon sx={{ color: statusAccentColor(strItStatus), fontSize: 18 }} />
                <Typography sx={{ color: statusAccentColor(strItStatus), fontWeight: 700, textTransform: "capitalize" }}>
                  {resolveStatusLabel(strItStatus, t)}
                </Typography>
              </Box>
              {strItSubmittedOn ? (
                <Box>
                  <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("submitted_on", "Submitted on")}</Typography>
                  <Typography sx={{ color: "#111827", fontWeight: 700 }}>{formatDateLabel(String(strItSubmittedOn))}</Typography>
                </Box>
              ) : null}
              <Box>
                <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("declaration_type", "Declaration Type")}</Typography>
                <Typography sx={{ color: "#111827", fontWeight: 700 }}>
                  {strItDeclarationType || "New Regime"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("declared", "Declared")}</Typography>
                <Typography sx={{ color: "#111827", fontWeight: 800, fontSize: "1.28rem" }}>
                  {formatCurrency(Number((objItWidget?.objPayload as Record<string, unknown> | undefined)?.decDeclaredAmount || 0))}
                </Typography>
              </Box>
              {intProofPendingCount > 0 ? (
                <Typography sx={{ color: "#dc2626", fontWeight: 700, fontSize: "0.82rem" }}>
                  {`${formatInteger(intProofPendingCount)} proof${intProofPendingCount > 1 ? "s" : ""} pending`}
                </Typography>
              ) : null}
            </Stack>
            <Link href="/salary/it-declaration" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 18, color: "#047857", fontWeight: 700, textDecoration: "none" }}>
              {t("view_update", "View / Update")}
              <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
            </Link>
          </Paper>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2.5, height: "100%", borderRadius: "24px", border: "1px solid rgba(59,130,246,0.12)", background: "linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)", boxShadow: "0 12px 25px rgba(15,23,42,0.04)" }}>
            <Typography variant="h6" sx={{ color: "#1e3a8a", fontWeight: 800, mb: 1.8 }}>
              {resolveWidgetTitle(t, objReimbursementWidget?.strWidgetCode, objReimbursementWidget?.strWidgetName || "Reimbursement Summary")}
            </Typography>
            <Grid container spacing={1.4}>
              <Grid item xs={4}>
                <Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>Total Claims</Typography>
                <Typography sx={{ mt: 0.3, fontWeight: 800, color: "#0f172a", fontSize: "1.7rem" }}>{formatInteger(intTotalClaims)}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>Approved</Typography>
                <Typography sx={{ mt: 0.3, fontWeight: 800, color: "#0f172a", fontSize: "1.7rem" }}>{formatInteger(intApprovedClaims)}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>Total Amount</Typography>
                <Typography sx={{ mt: 0.3, fontWeight: 800, color: "#0f172a", fontSize: "1.4rem" }}>{formatCurrency(decTotalClaimAmount)}</Typography>
              </Grid>
            </Grid>
            <Link href="/ess/reimbursements" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 18, color: "#2563eb", fontWeight: 700, textDecoration: "none" }}>
              View My Claims
              <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
            </Link>
          </Paper>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2.5, height: "100%", borderRadius: "24px", border: "1px solid rgba(244,63,94,0.10)", background: "linear-gradient(135deg, #fff9fb 0%, #fff1f2 100%)", boxShadow: "0 12px 25px rgba(15,23,42,0.04)" }}>
            <Typography variant="h6" sx={{ color: "#dc2626", fontWeight: 800, mb: 1.8 }}>
              {resolveWidgetTitle(t, objPendingWidget?.strWidgetCode, objPendingWidget?.strWidgetName || "Pending Actions")}
            </Typography>
            <Stack spacing={1.2}>
              {lstPendingActions.length ? lstPendingActions.map((objAction) => (
                <Box key={objAction.strCode} sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, borderRadius: "16px", px: 1.4, py: 1.15, backgroundColor: "#fff" }}>
                  <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0 }}>
                    <Box sx={{ mt: 0.15, width: 26, height: 26, borderRadius: "8px", backgroundColor: "#fee2e2", display: "grid", placeItems: "center", color: "#ef4444" }}>
                      {pendingActionIcon(objAction.strCode)}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ color: "#111827", fontWeight: 600, fontSize: "0.88rem", lineHeight: 1.35 }}>{objAction.strLabel}</Typography>
                    </Box>
                  </Stack>
                  <Link href={objAction.strRoutePath || "/dashboard"} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 700, whiteSpace: "nowrap" }}>{t("action", "Action")}</Link>
                </Box>
              )) : <Typography sx={{ color: "#64748b" }}>{t("no_pending_actions", "No pending actions.")}</Typography>}
            </Stack>
            <Link href={objPrimaryPendingAction?.strRoutePath || "/dashboard"} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 16, color: "#6366f1", fontWeight: 700, textDecoration: "none" }}>
              View All
              <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
            </Link>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 2.5, height: "100%", borderRadius: "24px", border: "1px solid rgba(226,232,240,1)", backgroundColor: "#fff", boxShadow: "0 12px 25px rgba(15,23,42,0.04)" }}>
            <Typography variant="h6" sx={{ color: "#0f172a", fontWeight: 800, mb: 1.8 }}>
              {resolveWidgetTitle(t, objPayslipWidget?.strWidgetCode, objPayslipWidget?.strWidgetName || "Last 3 Payslips")}
            </Typography>
            <Stack spacing={1.2}>
              {lstPayslips.length ? lstPayslips.map((objRow) => (
                <Box key={String(objRow.result_id)} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "16px", px: 1.3, py: 1.05, backgroundColor: "#f8fbff" }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "0.9rem" }}>{formatMonth(String(objRow.payroll_month || ""))}</Typography>
                    <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>Net Pay</Typography>
                  </Box>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography sx={{ color: "#0f172a", fontWeight: 700, fontSize: "0.95rem" }}>{formatCurrency(Number(objRow.net_pay || 0))}</Typography>
                    <Link href="/ess/my-payslips" style={{ color: "#2563eb", textDecoration: "none", fontWeight: 700, fontSize: "0.82rem", whiteSpace: "nowrap" }}>{t("download", "Download")}</Link>
                  </Stack>
                </Box>
              )) : <Typography sx={{ color: "#64748b" }}>{t("no_payslips", "No payslips generated yet.")}</Typography>}
            </Stack>
            <Link href="/ess/my-payslips" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 18, color: "#2563eb", fontWeight: 700, textDecoration: "none" }}>
              View All Payslips
              <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
            </Link>
          </Paper>
        </Grid>
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 2.5, height: "100%", borderRadius: "24px", border: "1px solid rgba(16,185,129,0.10)", background: "linear-gradient(135deg, #fcfffd 0%, #f3fbf8 100%)", boxShadow: "0 12px 25px rgba(15,23,42,0.04)" }}>
            <Typography variant="h6" sx={{ color: "#047857", fontWeight: 800, mb: 1.8 }}>
              {t("profile_checklist", "Profile Completeness")}
            </Typography>
            <Grid container spacing={1.25}>
              {lstProfileChecks.map((objCheck) => (
                <Grid key={String(objCheck.strCode)} item xs={12} sm={6}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "16px", px: 1.4, py: 1.05, backgroundColor: "#fff" }}>
                    <Typography sx={{ color: "#111827", fontWeight: 600 }}>{String(objCheck.strLabel || "")}</Typography>
                    <Stack direction="row" spacing={0.7} alignItems="center">
                      <CheckCircleRoundedIcon sx={{ color: objCheck.blnComplete ? "#10b981" : "#ef4444", fontSize: 18 }} />
                      <Typography sx={{ color: objCheck.blnComplete ? "#10b981" : "#ef4444", fontWeight: 700, fontSize: "0.82rem" }}>
                        {objCheck.blnComplete ? t("verified", "Verified") : t("not_provided", "Not Provided")}
                      </Typography>
                    </Stack>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2.2, borderRadius: "24px", border: "1px solid rgba(226,232,240,1)", backgroundColor: "#fff", boxShadow: "0 12px 25px rgba(15,23,42,0.04)" }}>
        <Typography variant="h6" sx={{ color: "#0f172a", fontWeight: 800, mb: 2 }}>
          {resolveWidgetTitle(t, objQuickActionsWidget?.strWidgetCode, objQuickActionsWidget?.strWidgetName || "Quick Actions")}
        </Typography>
        <Grid container spacing={1.5}>
          {lstQuickActions.map((objAction) => (
            <Grid key={objAction.strActionCode} item xs={6} sm={4} md={3} lg={2}>
              <Link href={objAction.strRoutePath || "/dashboard"} style={{ display: "block", textDecoration: "none" }}>
                <Stack spacing={1} alignItems="center" sx={{ p: 1.2 }}>
                  <Box sx={{ width: 52, height: 52, borderRadius: "16px", backgroundColor: quickActionColor(objAction.strActionCode), display: "grid", placeItems: "center" }}>
                    {renderEssQuickActionIcon(objAction.strActionCode)}
                  </Box>
                  <Typography sx={{ fontWeight: 700, color: "#111827", textAlign: "center", fontSize: "0.78rem", lineHeight: 1.3 }}>{objAction.strActionName}</Typography>
                </Stack>
              </Link>
            </Grid>
          ))}
        </Grid>
      </Paper>
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
  if (strCode.includes("PAYSLIP")) return <DownloadRoundedIcon sx={{ color: "#ef4444", fontSize: 22 }} />;
  if (strCode.includes("DECLARATION")) return <DescriptionRoundedIcon sx={{ color: "#dc2626", fontSize: 22 }} />;
  if (strCode.includes("REIMBURSE")) return <ReceiptLongRoundedIcon sx={{ color: "#059669", fontSize: 22 }} />;
  if (strCode.includes("PROFILE")) return <PersonOutlineRoundedIcon sx={{ color: "#0891b2", fontSize: 22 }} />;
  if (strCode.includes("FORM")) return <AssignmentRoundedIcon sx={{ color: "#7c3aed", fontSize: 22 }} />;
  return <AssignmentRoundedIcon sx={{ color: "#2563eb", fontSize: 22 }} />;
}

function quickActionColor(strActionCode: string) {
  const strCode = String(strActionCode || "").toUpperCase();
  if (strCode.includes("PAYSLIP")) return "#fee2e2";
  if (strCode.includes("DECLARATION")) return "#ffe4e6";
  if (strCode.includes("REIMBURSE")) return "#dcfce7";
  if (strCode.includes("PROFILE")) return "#e0f2fe";
  if (strCode.includes("FORM")) return "#ede9fe";
  return "#eff6ff";
}

function renderQuickActionIcon(strActionCode: string) {
  const strCode = String(strActionCode || "").toUpperCase();
  if (strCode.includes("RUN")) return <PaymentsRoundedIcon sx={{ color: "#ef4444", fontSize: 18 }} />;
  if (strCode.includes("PAYSLIP")) return <ReceiptLongRoundedIcon sx={{ color: "#2563eb", fontSize: 18 }} />;
  if (strCode.includes("DECLARATION")) return <DescriptionRoundedIcon sx={{ color: "#7c3aed", fontSize: 18 }} />;
  if (strCode.includes("REIMBURSE")) return <AssignmentTurnedInRoundedIcon sx={{ color: "#f59e0b", fontSize: 18 }} />;
  if (strCode.includes("REPORT")) return <AssignmentRoundedIcon sx={{ color: "#2563eb", fontSize: 18 }} />;
  if (strCode.includes("EMPLOYEE")) return <PeopleAltRoundedIcon sx={{ color: "#0ea5e9", fontSize: 18 }} />;
  if (strCode.includes("SALARY")) return <AccountBalanceWalletRoundedIcon sx={{ color: "#ef4444", fontSize: 18 }} />;
  return <AssignmentRoundedIcon sx={{ color: "#2563eb", fontSize: 18 }} />;
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

function PanelShell({ strTitle, children }: { strTitle: string; children: ReactNode }) {
  return (
    <Paper sx={{ p: 3, borderRadius: "24px", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "0 14px 28px rgba(15,23,42,0.04)" }}>
      <Typography variant="h6" sx={{ color: "#111827", fontWeight: 800, mb: 2.2 }}>
        {strTitle}
      </Typography>
      {children}
    </Paper>
  );
}

function getKpiIcon(strWidgetCode: string) {
  if (strWidgetCode.includes("employee")) {
    return <PeopleAltRoundedIcon />;
  }
  if (strWidgetCode.includes("net")) {
    return <PaymentsRoundedIcon />;
  }
  if (strWidgetCode.includes("approval")) {
    return <AssignmentTurnedInRoundedIcon />;
  }
  if (strWidgetCode.includes("validation")) {
    return <ErrorOutlineRoundedIcon />;
  }
  return <AccessTimeRoundedIcon />;
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
  if (["submitted", "approved", "partially approved", "locked"].includes(strNormalized)) return "#059669";
  if (["released", "resubmitted", "under_review", "under review"].includes(strNormalized)) return "#d97706";
  return "#dc2626";
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
  if (strNormalized === "closed" || strNormalized === "processed" || strNormalized === "approved") return "#dcfce7";
  if (strNormalized === "submitted") return "#dbeafe";
  return "#fef3c7";
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
  return ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9"][intIndex % 6];
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
