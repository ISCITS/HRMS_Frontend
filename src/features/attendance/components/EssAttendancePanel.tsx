"use client";

import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import FingerprintRoundedIcon from "@mui/icons-material/FingerprintRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ATTENDANCE_STATUS_COLORS, type AttendanceDayDto } from "@/features/attendance/dto";
import { useMyAttendance } from "@/features/attendance/hooks/useMyAttendance";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type ToastState = {
  blnOpen: boolean;
  strMessage: string;
  strSeverity: "success" | "error";
};

const lstWeekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function toLocalISO(objDate: Date) {
  return `${objDate.getFullYear()}-${String(objDate.getMonth() + 1).padStart(2, "0")}-${String(objDate.getDate()).padStart(2, "0")}`;
}

function getMonthBounds(objDate: Date) {
  return {
    strFromDate: toLocalISO(new Date(objDate.getFullYear(), objDate.getMonth(), 1)),
    strToDate: toLocalISO(new Date(objDate.getFullYear(), objDate.getMonth() + 1, 0)),
  };
}

function formatTime(strValue?: string | null) {
  if (!strValue) return "-";
  const objDate = new Date(strValue);
  if (!Number.isNaN(objDate.getTime())) {
    return objDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return strValue.slice(0, 5);
}

export default function EssAttendancePanel() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("my_attendance", "Unable to load My Attendance labels.");
  const { blnLoading: blnRightsLoading, canViewAny } = useModuleActionAccess([
    // Tenants may use either the canonical ESS code or the legacy My Attendance aliases.
    "ESS_ATTENDANCE",
    "ESS_MY_ATTENDANCE",
    "MY_ATTENDANCE",
    "ATTENDANCE",
  ]);
  const { canViewAny: canViewRegularization } = useModuleActionAccess([
    "ESS_ATTENDANCE_REGULARIZATION",
    "ATTENDANCE_REGULARIZATION",
  ]);
  const {
    objOverview,
    objHistory,
    blnLoading,
    blnPunching,
    strError,
    loadAttendance,
    punch,
  } = useMyAttendance();
  const objTheme = useTheme();
  const blnMobile = useMediaQuery(objTheme.breakpoints.down("sm"));
  const objToday = useMemo(() => new Date(), []);
  const strToday = useMemo(() => toLocalISO(objToday), [objToday]);
  const [objMonth, setObjMonth] = useState(
    () => new Date(objToday.getFullYear(), objToday.getMonth(), 1),
  );
  const [strSelectedDate, setStrSelectedDate] = useState(strToday);
  const [blnPunchDialogOpen, setBlnPunchDialogOpen] = useState(false);
  const [blnPolicyDialogOpen, setBlnPolicyDialogOpen] = useState(false);
  const [objToast, setObjToast] = useState<ToastState>({
    blnOpen: false,
    strMessage: "",
    strSeverity: "success",
  });

  const objMonthBounds = useMemo(() => getMonthBounds(objMonth), [objMonth]);
  const dicDaysByDate = useMemo(
    () => Object.fromEntries((objHistory?.lstDays ?? []).map((objDay) => [objDay.dtWorkDate, objDay])),
    [objHistory],
  );
  const objSelectedDay = dicDaysByDate[strSelectedDate] ?? (
    objOverview?.dtDate === strSelectedDate ? objOverview.objDay : null
  );

  const loadSelectedMonth = useCallback(() => loadAttendance(
    strSelectedDate,
    objMonthBounds.strFromDate,
    objMonthBounds.strToDate,
  ), [loadAttendance, objMonthBounds.strFromDate, objMonthBounds.strToDate, strSelectedDate]);

  useEffect(() => {
    void loadSelectedMonth();
  }, [loadSelectedMonth]);

  const lstCalendarCells = useMemo(() => {
    const intYear = objMonth.getFullYear();
    const intMonth = objMonth.getMonth();
    const intLeadingDays = new Date(intYear, intMonth, 1).getDay();
    const intDaysInMonth = new Date(intYear, intMonth + 1, 0).getDate();
    const lstCells: Array<string | null> = Array.from({ length: intLeadingDays }, () => null);
    for (let intDay = 1; intDay <= intDaysInMonth; intDay += 1) {
      lstCells.push(toLocalISO(new Date(intYear, intMonth, intDay)));
    }
    return lstCells;
  }, [objMonth]);

  const lstMonthDays = useMemo(
    () => lstCalendarCells.filter((strDate): strDate is string => Boolean(strDate)),
    [lstCalendarCells],
  );
  const lstYears = useMemo(
    () => Array.from({ length: 7 }, (_, intIndex) => objToday.getFullYear() - 3 + intIndex),
    [objToday],
  );

  function moveMonth(intDelta: number) {
    const objNextMonth = new Date(objMonth.getFullYear(), objMonth.getMonth() + intDelta, 1);
    setObjMonth(objNextMonth);
    setStrSelectedDate(toLocalISO(objNextMonth));
  }

  function goToToday() {
    setObjMonth(new Date(objToday.getFullYear(), objToday.getMonth(), 1));
    setStrSelectedDate(strToday);
  }

  async function confirmPunch() {
    if (!objOverview) return;
    try {
      await punch(objOverview.strNextPunchDirection);
      setBlnPunchDialogOpen(false);
      setObjToast({
        blnOpen: true,
        strMessage: t("punch_recorded", "Punch recorded successfully."),
        strSeverity: "success",
      });
      await loadSelectedMonth();
    } catch {
      setObjToast({
        blnOpen: true,
        strMessage: t("punch_failed", "Unable to record the punch."),
        strSeverity: "error",
      });
    }
  }

  function renderStatusChip(objDay?: AttendanceDayDto | null) {
    if (!objDay) return <Chip size="small" label={t("not_recorded", "Not recorded")} />;
    const objColor = ATTENDANCE_STATUS_COLORS[objDay.strStatus] ?? {
      bg: "#f1f5f9",
      fg: "#475569",
      short: "",
    };
    return (
      <Chip
        size="small"
        label={t(`status_${objDay.strStatus}`, objDay.strStatus.replaceAll("_", " "))}
        sx={{ bgcolor: objColor.bg, color: objColor.fg, fontWeight: 800, textTransform: "capitalize" }}
      />
    );
  }

  if (blnRightsLoading) {
    return <Box sx={{ display: "grid", placeItems: "center", py: 8 }}><CircularProgress /></Box>;
  }
  if (!canViewAny()) {
    return <Alert severity="warning">{t("permission_denied", "My Attendance access is not available for your user group.")}</Alert>;
  }

  return (
    <Stack spacing={1.5}>
      <Box className="pageBanner" data-control-id="ess.my-attendance.header.banner" sx={{ flexWrap: { xs: "wrap", md: "nowrap" } }}>
        <Box className="bannerDots" />
        <Box className="bannerIcon">
          <AccessTimeRoundedIcon sx={{ fontSize: 30 }} />
        </Box>
        <Box className="bannerDivider" />
        <Box sx={{ position: "relative", zIndex: 1, flex: 1, minWidth: 0 }}>
          <Typography component="h1" className="bannerTitle">{t("page_title", "My Attendance")}</Typography>
          <Typography component="p" className="bannerSubTitle">{t("page_subtitle", "Punch in or out and review your personal attendance record.")}</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ position: "relative", zIndex: 1, ml: { md: "auto" } }}>
          <Button
            data-control-id="ess.my-attendance.policy-info.button"
            variant="outlined"
            startIcon={<InfoOutlinedIcon />}
            onClick={() => setBlnPolicyDialogOpen(true)}
            sx={{ bgcolor: "#fff", borderColor: "var(--app-primary-color)", color: "var(--app-primary-color)", "&:hover": { bgcolor: "rgba(255,255,255,.92)", borderColor: "var(--app-primary-color)" } }}
          >
            {t("attendance_rules", "Attendance Rules")}
          </Button>
          <Button
            data-control-id="ess.my-attendance.refresh.button"
            variant="outlined"
            startIcon={<RefreshRoundedIcon />}
            onClick={() => void loadSelectedMonth()}
            disabled={blnLoading}
            sx={{ bgcolor: "#fff", borderColor: "var(--app-primary-color)", color: "var(--app-primary-color)", "&:hover": { bgcolor: "rgba(255,255,255,.92)", borderColor: "var(--app-primary-color)" } }}
          >
            {t("refresh", "Refresh")}
          </Button>
        </Stack>
      </Box>

      {strError ? (
        <Alert
          severity="error"
          action={(
            <Button
              data-control-id="ess.my-attendance.retry.button"
              color="inherit"
              size="small"
              onClick={() => void loadSelectedMonth()}
            >
              {t("retry", "Retry")}
            </Button>
          )}
        >
          {strError}
        </Alert>
      ) : null}

      <Grid container spacing={1}>
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: { xs: 1.5, md: 2 }, borderRadius: "10px", border: "1px solid", borderColor: "divider", height: "100%", boxShadow: 0, overflow: "hidden" }}>
            <Typography fontWeight={900}>{t("today", "Today")}</Typography>
            <Typography variant="h5" fontWeight={900} sx={{ mt: 0.25 }}>
              {new Date(`${strToday}T00:00:00`).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ my: 0.75 }}>
              {renderStatusChip(objOverview?.objDay)}
              <Typography color="text.secondary">
                {t(`state_${objOverview?.strCurrentState ?? "not_punched"}`, (objOverview?.strCurrentState ?? "not_punched").replaceAll("_", " "))}
              </Typography>
            </Stack>
            <Button
              data-control-id={`ess.my-attendance.punch-${objOverview?.strNextPunchDirection ?? "in"}.button`}
              fullWidth
              size="large"
              variant="contained"
              startIcon={<FingerprintRoundedIcon />}
              disabled={blnLoading || blnPunching || !objOverview?.blnCanPunch || strSelectedDate !== strToday}
              onClick={() => setBlnPunchDialogOpen(true)}
              sx={{ minHeight: 42, fontWeight: 900 }}
            >
              {blnPunching
                ? t("recording", "Recording...")
                : objOverview?.strNextPunchDirection === "out"
                  ? t("punch_out", "Punch Out")
                  : t("punch_in", "Punch In")}
            </Button>
            {!objOverview?.blnCanPunch ? (
              <Alert severity="info" sx={{ mt: 1, py: 0, "& .MuiAlert-message": { py: 0.75 } }}>
                {t(
                  `unavailable_${objOverview?.strUnavailableReasonCode ?? "unknown"}`,
                  objOverview?.strUnavailableReasonCode === "ATTENDANCE_POLICY_NOT_FOUND"
                    ? "No attendance policy applies today."
                    : "Attendance punching is unavailable today.",
                )}
              </Alert>
            ) : null}
          </Paper>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: { xs: 1.5, md: 2 }, borderRadius: "10px", border: "1px solid", borderColor: "divider", height: "100%", boxShadow: 0, overflow: "hidden" }}>
            <Typography fontWeight={900} sx={{ mb: 0.75 }}>{t("selected_day_summary", "Selected Day Summary")}</Typography>
            <Grid container spacing={0.75}>
              {[
                [t("first_in", "First IN"), objSelectedDay?.strFirstIn?.slice(0, 5) ?? "-"],
                [t("last_out", "Last OUT"), objSelectedDay?.strLastOut?.slice(0, 5) ?? "-"],
                [t("worked_hours", "Worked Hours"), `${objSelectedDay?.decWorkedHours ?? 0} h`],
                [t("late_minutes", "Late Minutes"), `${objSelectedDay?.intLateMinutes ?? 0} min`],
                [t("overtime_hours", "OT Hours"), `${objSelectedDay?.decOtHours ?? 0} h`],
                [t("paid", "Paid"), objSelectedDay ? (objSelectedDay.blnIsPaid ? t("yes", "Yes") : t("no", "No")) : "-"],
              ].map(([strLabel, strValue]) => (
                <Grid item xs={6} sm={4} md={2} key={strLabel}>
                  <Box sx={{ px: 1, py: 0.6, minHeight: 48, bgcolor: "action.hover", borderRadius: "4px" }}>
                    <Typography variant="caption" lineHeight={1.1} color="text.secondary">{strLabel}</Typography>
                    <Typography variant="body2" lineHeight={1.25} fontWeight={800}>{strValue}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Divider sx={{ my: 0.75 }} />
            {objSelectedDay && strSelectedDate <= strToday && canViewRegularization() ? (
              <Button
                data-control-id="ess.my-attendance.regularize.button"
                variant="outlined"
                size="small"
                onClick={() => objRouter.push(`/ess/attendance/regularization?date=${encodeURIComponent(strSelectedDate)}`)}
                sx={{ mb: 0.75 }}
              >
                {t("regularize", "Regularize")}
              </Button>
            ) : null}
            <Typography fontWeight={800}>{t("punch_timeline", "Punch Timeline")}</Typography>
            {objOverview?.dtDate === strSelectedDate && objOverview.lstPunches.length > 0 ? (
              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                {objOverview.lstPunches.map((objPunch) => (
                  <Stack key={objPunch.intID} direction="row" justifyContent="space-between" sx={{ px: 1, py: 0.5, border: "1px solid", borderColor: "divider", borderRadius: "4px" }}>
                    <Chip size="small" label={objPunch.strDirection.toUpperCase()} color={objPunch.strDirection === "in" ? "success" : "warning"} />
                    <Typography fontWeight={800}>{formatTime(objPunch.dtPunchAt)}</Typography>
                    <Typography color="text.secondary">{t(`source_${objPunch.strSource}`, objPunch.strSource)}</Typography>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{t("no_punches", "No punch log is available for this date.")}</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ px: { xs: 1.25, md: 2 }, py: 0.75, borderRadius: "10px", border: "1px solid", borderColor: "divider", boxShadow: 0, overflow: "hidden" }}>
        <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} spacing={{ xs: 0.5, md: 1.5 }}>
          <Box sx={{ minWidth: 180 }}>
            <Typography variant="body2" fontWeight={900}>{t("monthly_summary", "Monthly Summary")}</Typography>
            <Typography variant="caption" color="text.secondary">
              {objMonth.toLocaleDateString([], { month: "long", year: "numeric" })}
            </Typography>
          </Box>
          <Grid container spacing={0.5} justifyContent="space-around" sx={{ flex: 1 }}>
            {[
              [t("present", "Present"), objHistory?.objSummary.dicStatusCounts.present ?? 0],
              [t("absent", "Absent"), objHistory?.objSummary.dicStatusCounts.absent ?? 0],
              [t("half_day", "Half Day"), objHistory?.objSummary.dicStatusCounts.half_day ?? 0],
              [t("worked_hours", "Worked Hours"), objHistory?.objSummary.decWorkedHours ?? 0],
              [t("late_occurrences", "Late Occurrences"), objHistory?.objSummary.intLateOccurrences ?? 0],
            ].map(([strLabel, objValue]) => (
              <Grid item xs={6} sm={4} md={2} key={strLabel}>
                <Box sx={{ textAlign: "center", py: 0.35 }}>
                  <Typography variant="body1" lineHeight={1.2} fontWeight={900}>{objValue}</Typography>
                  <Typography variant="caption" color="text.secondary">{strLabel}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Paper>

      <Paper sx={{ p: { xs: 1.25, md: 2 }, borderRadius: "10px", border: "1px solid", borderColor: "divider", boxShadow: 0, overflow: "hidden" }}>
        <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
          <Typography variant="h6" fontWeight={900}>{t("monthly_history", "Monthly Attendance")}</Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" justifyContent={{ xs: "flex-start", md: "flex-end" }} sx={{ maxWidth: "100%" }}>
            <Button data-control-id="ess.my-attendance.previous-month.button" variant="outlined" onClick={() => moveMonth(-1)} aria-label={t("previous_month", "Previous month")}><ChevronLeftRoundedIcon /></Button>
            <TextField
              data-control-id="ess.my-attendance.month.select"
              select
              size="small"
              value={objMonth.getMonth()}
              onChange={(objEvent) => {
                const objNext = new Date(objMonth.getFullYear(), Number(objEvent.target.value), 1);
                setObjMonth(objNext);
                setStrSelectedDate(toLocalISO(objNext));
              }}
              sx={{ minWidth: 130 }}
            >
              {Array.from({ length: 12 }, (_, intMonth) => (
                <MenuItem key={intMonth} value={intMonth}>
                  {new Date(2020, intMonth, 1).toLocaleString([], { month: "long" })}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              data-control-id="ess.my-attendance.year.select"
              select
              size="small"
              value={objMonth.getFullYear()}
              onChange={(objEvent) => {
                const objNext = new Date(Number(objEvent.target.value), objMonth.getMonth(), 1);
                setObjMonth(objNext);
                setStrSelectedDate(toLocalISO(objNext));
              }}
              sx={{ minWidth: 100 }}
            >
              {lstYears.map((intYear) => <MenuItem key={intYear} value={intYear}>{intYear}</MenuItem>)}
            </TextField>
            <Button data-control-id="ess.my-attendance.today.button" variant="outlined" onClick={goToToday}>{t("today", "Today")}</Button>
            <Button data-control-id="ess.my-attendance.next-month.button" variant="outlined" onClick={() => moveMonth(1)} aria-label={t("next_month", "Next month")}><ChevronRightRoundedIcon /></Button>
          </Stack>
        </Stack>

        {blnLoading ? (
          <Box sx={{ display: "grid", placeItems: "center", py: 8 }}><CircularProgress /></Box>
        ) : blnMobile ? (
          <Stack spacing={0.75}>
            {lstMonthDays.map((strDate) => {
              const objDay = dicDaysByDate[strDate];
              return (
                <ButtonBase
                  key={strDate}
                  data-control-id={`ess.my-attendance.day.${strDate}.button`}
                  onClick={() => setStrSelectedDate(strDate)}
                  sx={{ width: "100%", justifyContent: "space-between", p: 1.25, border: "1px solid", borderColor: strSelectedDate === strDate ? "primary.main" : "divider", borderRadius: "6px", textAlign: "left" }}
                >
                  <Box>
                    <Typography fontWeight={800}>{new Date(`${strDate}T00:00:00`).toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short" })}</Typography>
                    <Typography variant="caption" color="text.secondary">{objDay ? `${objDay.decWorkedHours} h` : t("not_recorded", "Not recorded")}</Typography>
                  </Box>
                  {renderStatusChip(objDay)}
                </ButtonBase>
              );
            })}
          </Stack>
        ) : (
          <>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 0.5, mb: 0.5 }}>
              {lstWeekdays.map((strDay) => <Typography key={strDay} align="center" fontWeight={800} color="text.secondary">{t(`weekday_${strDay}`, strDay)}</Typography>)}
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 0.5 }}>
              {lstCalendarCells.map((strDate, intIndex) => {
                if (!strDate) return <Box key={`blank-${intIndex}`} />;
                const objDay = dicDaysByDate[strDate];
                const objColor = objDay ? ATTENDANCE_STATUS_COLORS[objDay.strStatus] : null;
                return (
                  <ButtonBase
                    key={strDate}
                    data-control-id={`ess.my-attendance.day.${strDate}.button`}
                    onClick={() => setStrSelectedDate(strDate)}
                    sx={{ minHeight: 68, alignItems: "stretch", justifyContent: "flex-start", p: 0.75, border: "1px solid", borderColor: strSelectedDate === strDate ? "primary.main" : "divider", borderRadius: "4px", bgcolor: objColor?.bg ?? "background.paper", textAlign: "left" }}
                  >
                    <Stack justifyContent="space-between" width="100%">
                      <Typography fontWeight={900}>{Number(strDate.slice(-2))}</Typography>
                      <Typography variant="caption" fontWeight={800} color={objColor?.fg ?? "text.secondary"}>
                        {objDay ? t(`status_${objDay.strStatus}`, objDay.strStatus.replaceAll("_", " ")) : ""}
                      </Typography>
                    </Stack>
                  </ButtonBase>
                );
              })}
            </Box>
          </>
        )}
      </Paper>

      <Dialog
        data-control-id="ess.my-attendance.punch-confirm.dialog"
        open={blnPunchDialogOpen}
        onClose={() => setBlnPunchDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{objOverview?.strNextPunchDirection === "out" ? t("confirm_punch_out", "Confirm Punch Out") : t("confirm_punch_in", "Confirm Punch In")}</DialogTitle>
        <DialogContent>
          <Typography>{t("punch_confirmation_message", "Your attendance punch will be recorded using the server time.")}</Typography>
        </DialogContent>
        <DialogActions>
          <Button data-control-id="ess.my-attendance.punch-confirm.cancel.button" onClick={() => setBlnPunchDialogOpen(false)}>{t("cancel", "Cancel")}</Button>
          <Button data-control-id="ess.my-attendance.punch-confirm.submit.button" variant="contained" disabled={blnPunching} onClick={() => void confirmPunch()}>{t("confirm", "Confirm")}</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        data-control-id="ess.my-attendance.policy-info.dialog"
        open={blnPolicyDialogOpen}
        onClose={() => setBlnPolicyDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t("your_attendance_rules", "Your Attendance Rules")}</DialogTitle>
        <DialogContent>
          {objOverview?.objPolicy ? (
            <Stack spacing={1}>
              <Typography fontWeight={900}>{objOverview.objPolicy.strPolicyName}</Typography>
              <Typography>{t("full_day_threshold", "Full-day threshold")}: {objOverview.objPolicy.decFullDayThresholdHours} h</Typography>
              <Typography>{t("half_day_threshold", "Half-day threshold")}: {objOverview.objPolicy.decHalfDayThresholdHours} h</Typography>
              <Typography>{t("late_grace", "Late grace")}: {objOverview.objPolicy.intLateGraceMinutes} min</Typography>
              <Typography>{t("missing_punch_treatment", "Missing-punch treatment")}: {objOverview.objPolicy.strMissingPunchTreatmentCode}</Typography>
              <Typography>{t("overtime_enabled", "Overtime enabled")}: {objOverview.objPolicy.blnOtEnabled ? t("yes", "Yes") : t("no", "No")}</Typography>
            </Stack>
          ) : <Alert severity="info">{t("no_policy", "No attendance policy applies to the selected date.")}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button data-control-id="ess.my-attendance.policy-info.close.button" onClick={() => setBlnPolicyDialogOpen(false)}>{t("close", "Close")}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        data-control-id="ess.my-attendance.notification"
        open={objToast.blnOpen}
        autoHideDuration={5000}
        onClose={() => setObjToast((objCurrent) => ({ ...objCurrent, blnOpen: false }))}
      >
        <Alert
          severity={objToast.strSeverity}
          action={<Button data-control-id="ess.my-attendance.notification.close.button" color="inherit" size="small" onClick={() => setObjToast((objCurrent) => ({ ...objCurrent, blnOpen: false }))}>{t("close", "Close")}</Button>}
        >
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
