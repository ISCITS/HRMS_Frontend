"use client";

import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid, InputLabel, MenuItem, Paper, Select, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import { useMemo, useState } from "react";

import { useEmployeeCalendar } from "@/features/employee-calendar/hooks/useEmployeeCalendar";
import type { EmployeeCalendarDay } from "@/features/employee-calendar/types/EmployeeCalendarTypes";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useActionRights } from "@/features/security/hooks/useActionRights";

const lstModuleCodes = [
  "ESS_CALENDAR",
  "CALENDAR",
  "EMPLOYEE_CALENDAR",
  "HOLIDAY_CALENDAR",
  "ESS_EMPLOYEE_CALENDAR",
  "ESS_HOLIDAY_CALENDAR",
  "HOLIDAY_LEAVE_CALENDAR",
];
const lstWeekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const lstLegendStatuses = ["holiday", "optional_holiday", "approved", "pending", "present", "absent", "half_day", "on_leave", "lwp_lop", "on_duty", "weekly_off"];
const objBannerSelectSx = {
  minWidth: 145,
  bgcolor: "#fff",
  borderRadius: 1,
  "& .MuiInputLabel-root": {
    color: "#334155",
    bgcolor: "#fff",
    px: 0.5,
    fontWeight: 600,
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "var(--app-primary-color)",
  },
  "& .MuiSelect-select": {
    color: "#0f172a",
    fontWeight: 600,
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "#94a3b8",
  },
  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--app-primary-color)",
  },
};

function getStatusColor(strStatus: string, objTheme: Theme) {
  const dicColors: Record<string, string> = {
    holiday: objTheme.palette.info.main, optional_holiday: objTheme.palette.secondary.main,
    approved: objTheme.palette.success.main, pending: objTheme.palette.warning.main,
    present: objTheme.palette.success.dark, absent: objTheme.palette.error.main,
    half_day: objTheme.palette.warning.dark, on_leave: objTheme.palette.warning.dark, lwp_lop: objTheme.palette.error.dark,
    on_duty: objTheme.palette.primary.main, weekly_off: objTheme.palette.grey[600],
  };
  return dicColors[strStatus] ?? objTheme.palette.text.secondary;
}

export default function EmployeeCalendarPage() {
  const objTheme = useTheme();
  const { t, strLanguageCode, intLanguageID } = useModuleLabels("calendar", "Unable to load calendar labels.");
  const { blnLoading: blnRightsLoading, canDo } = useActionRights();
  // Older tenant seeds expose the exact ESS calendar menu with a generic view
  // action; newer tenants use the calendar-specific view action.
  const blnCanView = lstModuleCodes.some((strModule) =>
    canDo(strModule, "ESS_EMPLOYEE_CALENDAR_VIEW") || canDo(strModule, "view"),
  );
  const [objMonth, setObjMonth] = useState(() => { const objNow = new Date(); return new Date(objNow.getFullYear(), objNow.getMonth(), 1); });
  const [objSelectedDay, setObjSelectedDay] = useState<EmployeeCalendarDay | null>(null);
  const { objCalendar, blnLoading, strError, reload } = useEmployeeCalendar(objMonth, blnCanView && !blnRightsLoading, intLanguageID);
  const dicDays = useMemo(() => new Map((objCalendar?.lstDays ?? []).map((objDay) => [objDay.dtDate, objDay])), [objCalendar]);
  const intFirstWeekday = new Date(objMonth.getFullYear(), objMonth.getMonth(), 1).getDay();
  const intDaysInMonth = new Date(objMonth.getFullYear(), objMonth.getMonth() + 1, 0).getDate();
  const lstYears = Array.from({ length: 9 }, (_, intIndex) => new Date().getFullYear() - 4 + intIndex);
  const strLocale = strLanguageCode === "hi" ? "hi-IN" : "en-IN";

  function changeMonth(intOffset: number) { setObjMonth(new Date(objMonth.getFullYear(), objMonth.getMonth() + intOffset, 1)); }
  function selectMonth(intMonth: number) { setObjMonth(new Date(objMonth.getFullYear(), intMonth, 1)); }
  function selectYear(intYear: number) { setObjMonth(new Date(intYear, objMonth.getMonth(), 1)); }

  if (!blnRightsLoading && !blnCanView) return <Alert data-control-id="employee-calendar.unauthorized.alert" severity="warning">{t("unauthorized", "Employee Calendar access is not available for your user group.")}</Alert>;

  return (
    <Stack spacing={1.5}>
      <Box className="pageBanner" data-control-id="employee-calendar.header.banner" sx={{ flexWrap: { xs: "wrap", lg: "nowrap" } }}>
        <Box className="bannerDots" />
        <Box className="bannerIcon">
          <CalendarMonthRoundedIcon sx={{ fontSize: 30 }} />
        </Box>
        <Box className="bannerDivider" />
        <Box sx={{ position: "relative", zIndex: 1, flex: 1, minWidth: 0 }}>
          <Typography component="h1" className="bannerTitle">{t("holiday_calendar_title", "Holiday Calendar")}</Typography>
          <Typography component="p" className="bannerSubTitle">{t("holiday_calendar_subtitle", "View your holidays and calendar day details.")}</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ position: "relative", zIndex: 1, ml: { lg: "auto" } }}>
          <Button data-control-id="employee-calendar.previous-month.button" variant="outlined" aria-label={t("previous_month", "Previous month")} onClick={() => changeMonth(-1)} sx={{ minWidth: 40, bgcolor: "#fff", borderColor: "var(--app-primary-color)", color: "var(--app-primary-color)", "&:hover": { bgcolor: "rgba(255,255,255,.92)", borderColor: "var(--app-primary-color)" } }}><ChevronLeftRoundedIcon /></Button>
          <FormControl size="small" sx={objBannerSelectSx}><InputLabel>{t("month", "Month")}</InputLabel><Select data-control-id="employee-calendar.month.select" label={t("month", "Month")} value={objMonth.getMonth()} onChange={(objEvent) => selectMonth(Number(objEvent.target.value))}>{Array.from({ length: 12 }, (_, intMonth) => <MenuItem data-control-id={`employee-calendar.month.option.${intMonth + 1}`} key={intMonth} value={intMonth}>{new Intl.DateTimeFormat(strLocale, { month: "long" }).format(new Date(2026, intMonth, 1))}</MenuItem>)}</Select></FormControl>
          <FormControl size="small" sx={{ ...objBannerSelectSx, minWidth: 105 }}><InputLabel>{t("year", "Year")}</InputLabel><Select data-control-id="employee-calendar.year.select" label={t("year", "Year")} value={objMonth.getFullYear()} onChange={(objEvent) => selectYear(Number(objEvent.target.value))}>{lstYears.map((intYear) => <MenuItem data-control-id={`employee-calendar.year.option.${intYear}`} key={intYear} value={intYear}>{intYear}</MenuItem>)}</Select></FormControl>
          <Button data-control-id="employee-calendar.today.button" variant="outlined" onClick={() => { const objNow = new Date(); setObjMonth(new Date(objNow.getFullYear(), objNow.getMonth(), 1)); }} sx={{ bgcolor: "#fff", borderColor: "var(--app-primary-color)", color: "var(--app-primary-color)", "&:hover": { bgcolor: "rgba(255,255,255,.92)", borderColor: "var(--app-primary-color)" } }}>{t("today", "Today")}</Button>
          <Button data-control-id="employee-calendar.next-month.button" variant="outlined" aria-label={t("next_month", "Next month")} onClick={() => changeMonth(1)} sx={{ minWidth: 40, bgcolor: "#fff", borderColor: "var(--app-primary-color)", color: "var(--app-primary-color)", "&:hover": { bgcolor: "rgba(255,255,255,.92)", borderColor: "var(--app-primary-color)" } }}><ChevronRightRoundedIcon /></Button>
        </Stack>
      </Box>

      {strError ? <Alert data-control-id="employee-calendar.error.alert" severity="error" action={<Button data-control-id="employee-calendar.retry.button" onClick={reload}>{t("retry", "Retry")}</Button>}>{strError}</Alert> : null}
      <Paper sx={{ p: 1.5, borderRadius: 3, position: "relative", minHeight: 420 }}>
        <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center" sx={{ px: 1, pt: 0.5, mb: 1.5 }}>{lstLegendStatuses.map((strStatus) => <Chip key={strStatus} size="small" label={t(`status_${strStatus}`, strStatus.replaceAll("_", " "))} sx={{ color: getStatusColor(strStatus, objTheme), bgcolor: alpha(getStatusColor(strStatus, objTheme), 0.12), fontWeight: 700 }} />)}</Stack>
        {blnLoading || blnRightsLoading ? <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", bgcolor: alpha(objTheme.palette.background.paper, 0.75), zIndex: 2 }}><CircularProgress aria-label={t("loading", "Loading calendar")} /></Box> : null}
        <Grid container columns={7} sx={{ px: 1 }}>{lstWeekdays.map((strDay) => <Grid item xs={1} key={strDay}><Typography align="center" fontWeight={700} color="text.secondary">{t(`weekday_${strDay}`, strDay)}</Typography></Grid>)}</Grid>
        <Box sx={{ mx: 1, mt: 1, display: "grid", gridTemplateColumns: "repeat(7, minmax(90px, 1fr))", gap: 0.75, overflowX: "auto" }}>
          {Array.from({ length: intFirstWeekday }, (_, intIndex) => <Box key={`blank-${intIndex}`} />)}
          {Array.from({ length: intDaysInMonth }, (_, intIndex) => {
            const intDay = intIndex + 1;
            const strDate = `${objMonth.getFullYear()}-${String(objMonth.getMonth() + 1).padStart(2, "0")}-${String(intDay).padStart(2, "0")}`;
            const objDay = dicDays.get(strDate);
            const strStatus = objDay?.strPrimaryStatus ?? "";
            const strColor = getStatusColor(strStatus, objTheme);
            return <Paper component="button" type="button" data-control-id={`employee-calendar.day.${strDate}`} key={strDate} onClick={() => objDay && setObjSelectedDay(objDay)} disabled={!objDay} elevation={0} sx={{ minHeight: 92, p: 1, textAlign: "left", border: 1, borderColor: strStatus ? alpha(strColor, 0.45) : "divider", bgcolor: objDay?.blnOutsideServicePeriod ? "action.disabledBackground" : strStatus ? alpha(strColor, 0.08) : "background.paper", cursor: objDay ? "pointer" : "default", opacity: objDay?.blnOutsideServicePeriod ? 0.55 : 1 }}><Typography fontWeight={800}>{intDay}</Typography>{objDay?.lstEvents.slice(0, 2).map((objEvent, intEventIndex) => <Typography key={`${objEvent.strEventType}-${objEvent.intSourceID ?? intEventIndex}`} noWrap sx={{ mt: 0.4, fontSize: "0.72rem", color: getStatusColor(objEvent.strStatus, objTheme), fontWeight: 700 }}>{objEvent.strEventType === "holiday" || objEvent.strEventType === "leave" ? objEvent.strLabel : t(`status_${objEvent.strStatus}`, objEvent.strStatus.replaceAll("_", " "))}</Typography>)}</Paper>;
          })}
        </Box>
        {!blnLoading && objCalendar && objCalendar.lstDays.every((objDay) => objDay.lstEvents.length === 0) ? <Typography align="center" color="text.secondary" sx={{ mt: 2 }}>{t("empty", "No calendar events are available for this month.")}</Typography> : null}
      </Paper>

      <Dialog data-control-id="employee-calendar.day-detail.dialog" open={Boolean(objSelectedDay)} onClose={() => setObjSelectedDay(null)} fullWidth maxWidth="sm"><DialogTitle>{objSelectedDay ? new Intl.DateTimeFormat(strLocale, { dateStyle: "full" }).format(new Date(`${objSelectedDay.dtDate}T00:00:00`)) : ""}</DialogTitle><DialogContent dividers><Stack spacing={1}>{objSelectedDay?.blnOutsideServicePeriod ? <Alert data-control-id="employee-calendar.outside-service.alert" severity="info">{t("outside_service_period", "Outside employee service period")}</Alert> : null}{objSelectedDay?.lstEvents.length ? objSelectedDay.lstEvents.map((objEvent, intIndex) => <Paper key={`${objEvent.strEventType}-${objEvent.intSourceID ?? intIndex}`} variant="outlined" sx={{ p: 1.25 }}><Typography fontWeight={750}>{objEvent.strEventType === "holiday" || objEvent.strEventType === "leave" ? objEvent.strLabel : t(`status_${objEvent.strStatus}`, objEvent.strStatus.replaceAll("_", " "))}</Typography><Typography variant="body2" color="text.secondary">{t(`event_${objEvent.strEventType}`, objEvent.strEventType)} · {t(`status_${objEvent.strStatus}`, objEvent.strStatus.replaceAll("_", " "))}{objEvent.blnIsHalfDay ? ` · ${t(objEvent.strHalfDayPart ?? "half_day", "Half Day")}` : ""}</Typography></Paper>) : <Typography>{t("no_events_for_day", "No events for this date.")}</Typography>}</Stack></DialogContent><DialogActions><Button data-control-id="employee-calendar.day-detail.close.button" onClick={() => setObjSelectedDay(null)}>{t("close", "Close")}</Button></DialogActions></Dialog>
    </Stack>
  );
}
