"use client";

import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Alert, Box, Button, Chip, LinearProgress, Paper, Skeleton, Stack, ToggleButton,
  ToggleButtonGroup, Tooltip, Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useLeaveWorkflowPermissions } from "@/features/leave/hooks/useLeaveWorkflowPermissions";
import { useTeamCalendar, type CalendarDateMeta } from "@/features/leave/hooks/useTeamCalendar";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import type { TeamCalendarEventDto } from "@/features/leave/types";

type ViewMode = "month" | "week";
type LabelFn = (strKey: string, strFallback?: string) => string;

function fnLocalISO(objDate: Date): string {
  return `${objDate.getFullYear()}-${String(objDate.getMonth() + 1).padStart(2, "0")}-${String(objDate.getDate()).padStart(2, "0")}`;
}
function fnParseISO(strISO: string): Date {
  const [intYear, intMonth, intDay] = strISO.split("-").map(Number);
  return new Date(intYear, (intMonth || 1) - 1, intDay || 1);
}
function fnAddDays(objDate: Date, intDays: number): Date {
  const objResult = new Date(objDate);
  objResult.setDate(objResult.getDate() + intDays);
  return objResult;
}
function fnStartOfWeek(objDate: Date): Date {
  const objResult = new Date(objDate);
  const intOffset = (objResult.getDay() + 6) % 7; // Monday-first
  objResult.setDate(objResult.getDate() - intOffset);
  return objResult;
}

const lstWeekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fnWindow(strView: ViewMode, objAnchor: Date): { dtFrom: Date; dtTo: Date } {
  if (strView === "week") {
    const dtFrom = fnStartOfWeek(objAnchor);
    return { dtFrom, dtTo: fnAddDays(dtFrom, 6) };
  }
  return {
    dtFrom: new Date(objAnchor.getFullYear(), objAnchor.getMonth(), 1),
    dtTo: new Date(objAnchor.getFullYear(), objAnchor.getMonth() + 1, 0),
  };
}

function fnEventStyle(objEvent: TeamCalendarEventDto, blnCanViewConfidential: boolean): { strBg: string; strFg: string; strChar: string } {
  if (objEvent.blnIsMasked && !blnCanViewConfidential) {
    return { strBg: "#e2e8f0", strFg: "#475569", strChar: "U" };
  }
  if (objEvent.strStatus === "approved") {
    return { strBg: "#16a34a", strFg: "#ffffff", strChar: (objEvent.strLabel ?? "L").slice(0, 1).toUpperCase() };
  }
  if (objEvent.strStatus === "pending") {
    return { strBg: "#f59e0b", strFg: "#ffffff", strChar: "P" };
  }
  return { strBg: "#cbd5e1", strFg: "#334155", strChar: (objEvent.strLabel ?? "L").slice(0, 1).toUpperCase() };
}

export default function EssTeamCalendarPage({
  blnEmbedded = false,
  intHighlightEmployeeID = null,
  strInitialAnchorISO,
  objBackAction,
}: {
  blnEmbedded?: boolean;
  intHighlightEmployeeID?: number | null;
  strInitialAnchorISO?: string;
  objBackAction?: ReactNode;
} = {}) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("ess-team-calendar", "Unable to load Team Calendar labels.");
  const { blnLoading: blnRightsLoading, blnCanViewTeamCalendar, blnCanViewConfidential, blnCanApprove } = useLeaveWorkflowPermissions();

  const [strView, setStrView] = useState<ViewMode>("month");
  const [dtAnchor, setDtAnchor] = useState<Date>(strInitialAnchorISO ? fnParseISO(strInitialAnchorISO) : new Date());

  // A "Team Calendar" deep-link from the approvals screen (?from=&to=) opens the week around it. When
  // embedded as a tab the context arrives via props instead, so the URL is not consulted.
  useEffect(() => {
    if (blnEmbedded) return;
    const strFrom = new URLSearchParams(window.location.search).get("from");
    if (strFrom) {
      setStrView("week");
      setDtAnchor(fnParseISO(strFrom));
    }
  }, [blnEmbedded]);

  const { dtFrom, dtTo } = useMemo(() => fnWindow(strView, dtAnchor), [strView, dtAnchor]);
  const strFromISO = fnLocalISO(dtFrom);
  const strToISO = fnLocalISO(dtTo);

  const { objTeamCalendar, dicDateMeta, blnLoading, strError, fnLoad } = useTeamCalendar(
    strFromISO, strToISO, blnCanViewTeamCalendar && !blnRightsLoading,
  );

  const lstDays = useMemo(() => {
    const lstResult: { strISO: string; objDate: Date; strMeta: CalendarDateMeta }[] = [];
    for (let objDate = new Date(dtFrom); objDate <= dtTo; objDate = fnAddDays(objDate, 1)) {
      const strISO = fnLocalISO(objDate);
      lstResult.push({ strISO, objDate: new Date(objDate), strMeta: dicDateMeta[strISO] ?? { blnHoliday: false, strHolidayName: null, blnWeeklyOff: false } });
    }
    return lstResult;
  }, [dtFrom, dtTo, dicDateMeta]);

  // { "employeeId|iso" -> covering leave event } for O(1) cell lookup.
  const dicCellEvents = useMemo(() => {
    const dicResult = new Map<string, TeamCalendarEventDto>();
    (objTeamCalendar?.lstEmployees ?? []).forEach((objMember) => {
      objMember.lstLeaveEvents.forEach((objEvent) => {
        lstDays.forEach(({ strISO }) => {
          if (strISO >= objEvent.dtFromDate && strISO <= objEvent.dtToDate) {
            dicResult.set(`${objMember.intEmployeeID}|${strISO}`, objEvent);
          }
        });
      });
    });
    return dicResult;
  }, [objTeamCalendar, lstDays]);

  const lstMembers = objTeamCalendar?.lstEmployees ?? [];
  const dicHeadcount = useMemo(() => {
    const dicResult: Record<string, { intOnLeave: number; intAvailable: number }> = {};
    lstDays.forEach(({ strISO }) => {
      let intOnLeave = 0;
      lstMembers.forEach((objMember) => {
        const objEvent = dicCellEvents.get(`${objMember.intEmployeeID}|${strISO}`);
        if (objEvent && (objEvent.strStatus === "approved" || objEvent.strStatus === "pending")) {
          intOnLeave += 1;
        }
      });
      dicResult[strISO] = { intOnLeave, intAvailable: Math.max(0, lstMembers.length - intOnLeave) };
    });
    return dicResult;
  }, [lstDays, lstMembers, dicCellEvents]);

  const strTodayISO = fnLocalISO(new Date());
  const strRangeLabel = strView === "month"
    ? dtAnchor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : `${dtFrom.toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${dtTo.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;

  function fnShift(intDirection: number) {
    setDtAnchor((objPrev) => (strView === "week" ? fnAddDays(objPrev, intDirection * 7) : new Date(objPrev.getFullYear(), objPrev.getMonth() + intDirection, 1)));
  }

  function fnColumnBg(strMeta: CalendarDateMeta): string | undefined {
    if (strMeta.blnHoliday) return "#fff7ed";
    if (strMeta.blnWeeklyOff) return "#f1f5f9";
    return undefined;
  }

  if (blnRightsLoading) {
    return <Box sx={{ p: 2 }}><LinearProgress /></Box>;
  }
  if (!blnCanViewTeamCalendar) {
    return <Box sx={{ p: 3 }}><Alert severity="warning">{t("access_denied", "Team Calendar access is not available for your user group.")}</Alert></Box>;
  }

  const intCellWidth = 40;
  const intNameWidth = 168;

  return <Stack spacing={2}>
    <Paper sx={{ borderRadius: "18px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }} justifyContent="space-between" sx={{ p: 1.5, borderBottom: "1px solid #e2e8f0" }}>
        <Stack direction="row" spacing={.5} alignItems="center" sx={{ flexWrap: "wrap" }}>
          {blnEmbedded && objBackAction ? objBackAction : null}
          <Button data-controlid="ess.team.calendar.prev" size="small" onClick={() => fnShift(-1)} startIcon={<ChevronLeftRoundedIcon />}>{t("prev", "Prev")}</Button>
          <Typography sx={{ fontWeight: 800, minWidth: 160, textAlign: "center" }}>{strRangeLabel}</Typography>
          <Button data-controlid="ess.team.calendar.next" size="small" onClick={() => fnShift(1)} endIcon={<ChevronRightRoundedIcon />}>{t("next", "Next")}</Button>
          <Button data-controlid="ess.team.calendar.today" size="small" variant="outlined" onClick={() => setDtAnchor(new Date())}>{t("today", "Today")}</Button>
          <ToggleButtonGroup exclusive size="small" value={strView} onChange={(_objEvent, strValue) => strValue && setStrView(strValue)}>
            <ToggleButton data-controlid="ess.team.calendar.view.month" value="month" sx={{ textTransform: "none", fontWeight: 700 }}>{t("month", "Month")}</ToggleButton>
            <ToggleButton data-controlid="ess.team.calendar.view.week" value="week" sx={{ textTransform: "none", fontWeight: 700 }}>{t("week", "Week")}</ToggleButton>
          </ToggleButtonGroup>
          <Button data-controlid="ess.team.calendar.refresh.embedded" size="small" startIcon={<RefreshRoundedIcon />} onClick={() => void fnLoad()}>{t("refresh", "Refresh")}</Button>
        </Stack>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
          {[[t("approved", "Approved"), "#16a34a"], [t("pending", "Pending"), "#f59e0b"], [t("holiday", "Holiday"), "#fdba74"], [t("weekly_off", "Weekly Off"), "#cbd5e1"]].map(([strLabel, strColor]) => <Stack key={strLabel} direction="row" spacing={.5} alignItems="center"><Box sx={{ width: 12, height: 12, borderRadius: "3px", bgcolor: strColor }} /><Typography sx={{ fontSize: ".72rem", color: "#64748b" }}>{strLabel}</Typography></Stack>)}
        </Stack>
      </Stack>

      {strError ? <Box sx={{ p: 2 }}><Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void fnLoad()}>{t("retry", "Retry")}</Button>}>{strError}</Alert></Box> : null}

      {blnLoading ? <Box sx={{ p: 2 }}><Skeleton variant="rounded" height={320} /></Box>
        : lstMembers.length === 0 ? <Box sx={{ p: 5, textAlign: "center" }}><CalendarMonthRoundedIcon sx={{ color: "#94a3b8", fontSize: 40, mb: .5 }} /><Typography sx={{ color: "#64748b", fontWeight: 600 }}>{t("no_team", "No reporting team members were found for your account.")}</Typography></Box>
        : <Box sx={{ overflowX: "auto" }}><Box sx={{ minWidth: intNameWidth + lstDays.length * intCellWidth }}>
          {/* Header: day numbers */}
          <Stack direction="row" sx={{ position: "sticky", top: 0, zIndex: 2, bgcolor: "white", borderBottom: "1px solid #e2e8f0" }}>
            <Box sx={{ width: intNameWidth, flexShrink: 0, p: 1, fontWeight: 800, fontSize: ".78rem", position: "sticky", left: 0, bgcolor: "white", zIndex: 3, borderRight: "1px solid #e2e8f0" }}>{t("team_member", "Team Member")}</Box>
            {lstDays.map(({ strISO, objDate, strMeta }) => <Box key={strISO} sx={{ width: intCellWidth, flexShrink: 0, textAlign: "center", py: .75, bgcolor: strISO === strTodayISO ? "#dbeafe" : fnColumnBg(strMeta), borderRight: "1px solid #f1f5f9" }}>
              <Tooltip title={strMeta.blnHoliday ? (strMeta.strHolidayName ?? t("holiday", "Holiday")) : strMeta.blnWeeklyOff ? t("weekly_off", "Weekly Off") : objDate.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}>
                <Box><Typography sx={{ fontSize: ".62rem", color: "#94a3b8" }}>{lstWeekdayNames[(objDate.getDay() + 6) % 7]}</Typography><Typography sx={{ fontSize: ".8rem", fontWeight: 700 }}>{objDate.getDate()}</Typography></Box>
              </Tooltip>
            </Box>)}
          </Stack>

          {/* Member rows */}
          {lstMembers.map((objMember) => { const blnHighlight = intHighlightEmployeeID != null && objMember.intEmployeeID === intHighlightEmployeeID; return <Stack key={objMember.intEmployeeID} direction="row" sx={{ borderBottom: "1px solid #f1f5f9", bgcolor: blnHighlight ? "#eff6ff" : undefined, "&:hover": { bgcolor: blnHighlight ? "#dbeafe" : "#f8fafc" } }}>
            <Box sx={{ width: intNameWidth, flexShrink: 0, p: 1, position: "sticky", left: 0, bgcolor: "inherit", zIndex: 1, borderRight: "1px solid #e2e8f0", borderLeft: blnHighlight ? "3px solid #0a66a3" : undefined }}><Typography noWrap sx={{ fontWeight: blnHighlight ? 800 : 700, fontSize: ".8rem" }}>{objMember.strEmployeeName}{blnHighlight ? ` · ${t("applicant", "Applicant")}` : ""}</Typography><Typography sx={{ fontSize: ".68rem", color: "#94a3b8" }}>{objMember.strEmployeeCode}</Typography></Box>
            {lstDays.map(({ strISO, strMeta }) => {
              const objEvent = dicCellEvents.get(`${objMember.intEmployeeID}|${strISO}`);
              if (!objEvent) {
                return <Box key={strISO} sx={{ width: intCellWidth, flexShrink: 0, height: 34, bgcolor: strISO === strTodayISO ? "#eff6ff" : fnColumnBg(strMeta), borderRight: "1px solid #f8fafc" }} />;
              }
              const objStyle = fnEventStyle(objEvent, blnCanViewConfidential);
              const blnMaskedCell = objEvent.blnIsMasked && !blnCanViewConfidential;
              const blnClickable = objEvent.strStatus === "pending" && blnCanApprove && !blnMaskedCell;
              return <Box key={strISO} sx={{ width: intCellWidth, flexShrink: 0, height: 34, p: "3px", borderRight: "1px solid #f8fafc" }}>
                <Tooltip title={blnMaskedCell ? t("unavailable", "Unavailable") : `${objEvent.strLabel ?? t("leave", "Leave")} · ${objEvent.strStatus}`}>
                  <Box onClick={blnClickable ? () => objRouter.push("/ess/leave/approvals") : undefined} sx={{ width: "100%", height: "100%", borderRadius: "5px", bgcolor: objStyle.strBg, color: objStyle.strFg, display: "grid", placeItems: "center", fontSize: ".64rem", fontWeight: 800, cursor: blnClickable ? "pointer" : "default" }}>{blnMaskedCell ? <LockRoundedIcon sx={{ fontSize: 13 }} /> : objStyle.strChar}</Box>
                </Tooltip>
              </Box>;
            })}
          </Stack>; })}

          {/* Availability summary */}
          <Stack direction="row" sx={{ borderTop: "2px solid #e2e8f0", bgcolor: "#f8fafc" }}>
            <Box sx={{ width: intNameWidth, flexShrink: 0, p: 1, position: "sticky", left: 0, bgcolor: "#f8fafc", zIndex: 1, borderRight: "1px solid #e2e8f0", fontWeight: 800, fontSize: ".72rem" }}>{t("available", "Available")}</Box>
            {lstDays.map(({ strISO, strMeta }) => {
              const objCount = dicHeadcount[strISO] ?? { intOnLeave: 0, intAvailable: lstMembers.length };
              const blnOverlap = objCount.intOnLeave >= 2;
              return <Tooltip key={strISO} title={`${objCount.intOnLeave} ${t("on_leave", "on leave")} · ${objCount.intAvailable} ${t("available", "available")}${blnOverlap ? ` · ${t("overlap", "overlapping leave")}` : ""}`}>
                <Box sx={{ width: intCellWidth, flexShrink: 0, textAlign: "center", py: .5, bgcolor: fnColumnBg(strMeta), borderRight: "1px solid #f1f5f9" }}><Typography sx={{ fontSize: ".74rem", fontWeight: 800, color: blnOverlap ? "#b91c1c" : "#0f172a" }}>{objCount.intAvailable}</Typography>{objCount.intOnLeave > 0 ? <Typography sx={{ fontSize: ".58rem", color: blnOverlap ? "#b91c1c" : "#94a3b8" }}>-{objCount.intOnLeave}</Typography> : null}</Box>
              </Tooltip>;
            })}
          </Stack>
        </Box></Box>}
    </Paper>

    {lstMembers.length > 0 && !blnLoading ? <Stack direction="row" spacing={1} sx={{ px: .5 }}><Chip size="small" label={`${lstMembers.length} ${t("team_members", "team member(s)")}`} /><Chip size="small" color="warning" variant="outlined" label={t("confidential_note", "Confidential leave shows as Unavailable")} /></Stack> : null}
  </Stack>;
}
