"use client";

import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import FingerprintRoundedIcon from "@mui/icons-material/FingerprintRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { attendanceService } from "@/features/attendance/services/attendanceService";
import { ATTENDANCE_STATUS_COLORS, type AttendanceDayDto, type MyShiftDto } from "@/features/attendance/dto";

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function periodOf(objDate: Date) {
  return `${objDate.getFullYear()}-${String(objDate.getMonth() + 1).padStart(2, "0")}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function EssAttendancePanel() {
  const [objMonth, setObjMonth] = useState(() => { const objNow = new Date(); return new Date(objNow.getFullYear(), objNow.getMonth(), 1); });
  const [dicDayByDate, setDicDayByDate] = useState<Record<string, AttendanceDayDto>>({});
  const [objShift, setObjShift] = useState<MyShiftDto | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnPunching, setBlnPunching] = useState(false);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  const objToday = useMemo(() => dicDayByDate[todayISO()] ?? null, [dicDayByDate]);

  function showToast(strMessage: string, strSeverity: "success" | "error") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  const loadMonth = useCallback(async (objTargetMonth: Date) => {
    setBlnLoading(true);
    try {
      const [lstDays, objShiftResult] = await Promise.all([
        attendanceService.getMyCalendar(periodOf(objTargetMonth)),
        attendanceService.getMyShift(),
      ]);
      const dic: Record<string, AttendanceDayDto> = {};
      for (const objDay of lstDays) if (objDay.dtWorkDate) dic[objDay.dtWorkDate] = objDay;
      setDicDayByDate(dic);
      setObjShift(objShiftResult);
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    } finally {
      setBlnLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMonth(objMonth);
  }, [objMonth, loadMonth]);

  async function punch() {
    setBlnPunching(true);
    try {
      await attendanceService.punch({ strSource: "web" });
      showToast("Punch recorded.", "success");
      const objNow = new Date();
      setObjMonth(new Date(objNow.getFullYear(), objNow.getMonth(), 1));
      await loadMonth(new Date(objNow.getFullYear(), objNow.getMonth(), 1));
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    } finally {
      setBlnPunching(false);
    }
  }

  const lstCells = useMemo(() => {
    const intYear = objMonth.getFullYear();
    const intMonth = objMonth.getMonth();
    // Monday-based leading blanks: JS getDay() Sun=0..Sat=6 -> convert to Mon=0..Sun=6.
    const intFirstWeekday = (new Date(intYear, intMonth, 1).getDay() + 6) % 7;
    const intDaysInMonth = new Date(intYear, intMonth + 1, 0).getDate();
    const lstResult: (number | null)[] = [];
    for (let i = 0; i < intFirstWeekday; i += 1) lstResult.push(null);
    for (let d = 1; d <= intDaysInMonth; d += 1) lstResult.push(d);
    return lstResult;
  }, [objMonth]);

  function isoFor(intDay: number) {
    return `${objMonth.getFullYear()}-${String(objMonth.getMonth() + 1).padStart(2, "0")}-${String(intDay).padStart(2, "0")}`;
  }

  return (
    <Stack spacing={1.5}>
      <Paper sx={{ p: { xs: 1.5, md: 2 }, borderRadius: "20px", background: "linear-gradient(135deg, #0b3f70 0%, #0a66a3 52%, #0e7490 100%)", color: "white", boxShadow: "0 14px 28px rgba(2, 6, 23, 0.18)" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.2} alignItems={{ md: "center" }}>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Box sx={{ width: 46, height: 46, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.2)", display: "grid", placeItems: "center" }}>
              <ScheduleRoundedIcon />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: "1rem" }}>My Attendance</Typography>
              <Typography sx={{ fontSize: "0.82rem", color: "rgba(241,245,249,0.92)" }}>
                {objShift ? `Shift: ${objShift.strShiftName ?? "-"}` : "No shift assigned yet"}
              </Typography>
            </Box>
          </Stack>
          <Button controlId="ess.attendance.punch.button" variant="contained" color="warning" startIcon={<FingerprintRoundedIcon />} onClick={punch} disabled={blnPunching}
            sx={{ fontWeight: 800, bgcolor: "#f59e0b", "&:hover": { bgcolor: "#d97706" } }}>
            {blnPunching ? "Recording..." : (objToday && objToday.strFirstIn ? "Punch Out / In" : "Punch In")}
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={1.25}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 1.5, borderRadius: "18px", border: "1px solid #e2e8f0", height: "100%" }}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1 }}>Today</Typography>
            {objToday ? (
              <Stack spacing={0.75}>
                <Chip label={objToday.strStatus.replace("_", " ")} sx={{ alignSelf: "flex-start", textTransform: "capitalize", fontWeight: 800, bgcolor: (ATTENDANCE_STATUS_COLORS[objToday.strStatus] ?? { bg: "#f1f5f9" }).bg, color: (ATTENDANCE_STATUS_COLORS[objToday.strStatus] ?? { fg: "#475569" }).fg }} />
                <Typography sx={{ fontSize: "0.85rem", color: "#334155" }}>First In: <b>{objToday.strFirstIn ?? "-"}</b></Typography>
                <Typography sx={{ fontSize: "0.85rem", color: "#334155" }}>Last Out: <b>{objToday.strLastOut ?? "-"}</b></Typography>
                <Typography sx={{ fontSize: "0.85rem", color: "#334155" }}>Worked: <b>{objToday.decWorkedHours} h</b></Typography>
                {objToday.intLateMinutes > 0 ? <Typography sx={{ fontSize: "0.85rem", color: "#b45309" }}>Late: <b>{objToday.intLateMinutes} min</b></Typography> : null}
                {objToday.decOtHours > 0 ? <Typography sx={{ fontSize: "0.85rem", color: "#166534" }}>OT: <b>{objToday.decOtHours} h</b></Typography> : null}
              </Stack>
            ) : (
              <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>No punch yet today.</Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 1.25, borderRadius: "18px", border: "1px solid #e2e8f0" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Button controlId="ess.attendance.prev.button" size="small" variant="outlined" onClick={() => setObjMonth((objPrev) => new Date(objPrev.getFullYear(), objPrev.getMonth() - 1, 1))}><ChevronLeftRoundedIcon fontSize="small" /></Button>
              <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{objMonth.toLocaleString("en-IN", { month: "long", year: "numeric" })}</Typography>
              <Button controlId="ess.attendance.next.button" size="small" variant="outlined" onClick={() => setObjMonth((objPrev) => new Date(objPrev.getFullYear(), objPrev.getMonth() + 1, 1))}><ChevronRightRoundedIcon fontSize="small" /></Button>
            </Stack>
            {blnLoading ? (
              <Box sx={{ display: "grid", placeItems: "center", py: 5 }}><CircularProgress /></Box>
            ) : (
              <>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5, mb: 0.5 }}>
                  {WEEKDAYS.map((strDay) => (<Typography key={strDay} sx={{ textAlign: "center", fontSize: "0.72rem", fontWeight: 700, color: "#475569" }}>{strDay}</Typography>))}
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5 }}>
                  {lstCells.map((intDay, intIndex) => {
                    if (intDay === null) return <Box key={`b-${intIndex}`} />;
                    const objDay = dicDayByDate[isoFor(intDay)];
                    const objColor = objDay ? (ATTENDANCE_STATUS_COLORS[objDay.strStatus] ?? { bg: "#f8fafc", fg: "#475569", short: "" }) : { bg: "#f8fafc", fg: "#94a3b8", short: "" };
                    return (
                      <Box key={intDay} sx={{ minHeight: 52, borderRadius: "8px", border: "1px solid rgba(148,163,184,0.24)", background: objColor.bg, p: 0.4 }}>
                        <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#0f172a" }}>{intDay}</Typography>
                        {objDay ? <Typography sx={{ fontSize: "0.62rem", fontWeight: 800, color: objColor.fg }}>{objColor.short}</Typography> : null}
                      </Box>
                    );
                  })}
                </Box>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Snackbar open={objToast.blnOpen} autoHideDuration={5000} onClose={() => setObjToast((objPrev) => ({ ...objPrev, blnOpen: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={objToast.strSeverity} variant="filled" onClose={() => setObjToast((objPrev) => ({ ...objPrev, blnOpen: false }))}>{objToast.strMessage}</Alert>
      </Snackbar>
    </Stack>
  );
}
