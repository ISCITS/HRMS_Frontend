 "use client";

import BeachAccessRoundedIcon from "@mui/icons-material/BeachAccessRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CelebrationRoundedIcon from "@mui/icons-material/CelebrationRounded";
import CurrencyRupeeRoundedIcon from "@mui/icons-material/CurrencyRupeeRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import {
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";

import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";

type CalendarMarker = {
  strType: "holiday" | "approved_leave" | "pending_leave" | "important";
  strLabelKey: string;
  strFallbackLabel: string;
};

type CalendarCell = {
  intDay: number;
  blnCurrentMonth: boolean;
  lstMarkers: CalendarMarker[];
};

const dicMarkerByDay: Record<number, CalendarMarker[]> = {
  2: [{ strType: "holiday", strLabelKey: "event_maharashtra_day", strFallbackLabel: "Maharashtra Day" }],
  6: [{ strType: "approved_leave", strLabelKey: "event_casual_leave", strFallbackLabel: "Casual Leave" }],
  12: [{ strType: "pending_leave", strLabelKey: "event_wfh_leave_pending", strFallbackLabel: "WFH + Leave Pending" }],
  18: [{ strType: "important", strLabelKey: "event_payroll_lock_date", strFallbackLabel: "Payroll Lock Date" }],
  22: [{ strType: "holiday", strLabelKey: "event_company_holiday", strFallbackLabel: "Company Holiday" }],
  26: [{ strType: "important", strLabelKey: "event_rd_townhall", strFallbackLabel: "R&D Townhall" }],
};

const lstWeekdayLabelKeys = [
  { strKey: "weekday_sun", strFallback: "Sun" },
  { strKey: "weekday_mon", strFallback: "Mon" },
  { strKey: "weekday_tue", strFallback: "Tue" },
  { strKey: "weekday_wed", strFallback: "Wed" },
  { strKey: "weekday_thu", strFallback: "Thu" },
  { strKey: "weekday_fri", strFallback: "Fri" },
  { strKey: "weekday_sat", strFallback: "Sat" },
];

function buildMonthCells(objDisplayMonth: Date) {
  const intYear = objDisplayMonth.getFullYear();
  const intMonth = objDisplayMonth.getMonth();
  const intFirstWeekday = new Date(intYear, intMonth, 1).getDay();
  const intDaysInMonth = new Date(intYear, intMonth + 1, 0).getDate();
  const intDaysInPrevMonth = new Date(intYear, intMonth, 0).getDate();
  const lstCells: CalendarCell[] = [];

  for (let intIndex = 0; intIndex < 42; intIndex += 1) {
    const intDatePointer = intIndex - intFirstWeekday + 1;
    if (intDatePointer < 1) {
      lstCells.push({
        intDay: intDaysInPrevMonth + intDatePointer,
        blnCurrentMonth: false,
        lstMarkers: [],
      });
      continue;
    }

    if (intDatePointer > intDaysInMonth) {
      lstCells.push({
        intDay: intDatePointer - intDaysInMonth,
        blnCurrentMonth: false,
        lstMarkers: [],
      });
      continue;
    }

    lstCells.push({
      intDay: intDatePointer,
      blnCurrentMonth: true,
      lstMarkers: dicMarkerByDay[intDatePointer] ?? [],
    });
  }

  return lstCells;
}

function getMarkerColor(strType: CalendarMarker["strType"]) {
  if (strType === "holiday") {
    return "#0f766e";
  }
  if (strType === "approved_leave") {
    return "#166534";
  }
  if (strType === "pending_leave") {
    return "#b45309";
  }
  return "#6d28d9";
}

function getCellBackground(lstMarkers: CalendarMarker[], blnCurrentMonth: boolean) {
  if (!blnCurrentMonth) {
    return "linear-gradient(180deg, rgba(248,250,252,0.75), rgba(241,245,249,0.62))";
  }
  if (lstMarkers.some((objMarker) => objMarker.strType === "holiday")) {
    return "linear-gradient(180deg, rgba(204,251,241,0.85), rgba(153,246,228,0.35))";
  }
  if (lstMarkers.some((objMarker) => objMarker.strType === "approved_leave")) {
    return "linear-gradient(180deg, rgba(220,252,231,0.88), rgba(187,247,208,0.32))";
  }
  if (lstMarkers.some((objMarker) => objMarker.strType === "pending_leave")) {
    return "linear-gradient(180deg, rgba(254,243,199,0.9), rgba(253,230,138,0.34))";
  }
  if (lstMarkers.some((objMarker) => objMarker.strType === "important")) {
    return "linear-gradient(180deg, rgba(237,233,254,0.9), rgba(221,214,254,0.4))";
  }
  return "linear-gradient(180deg, rgba(248,250,252,0.9), rgba(241,245,249,0.78))";
}

export default function EssCalendarPage() {
  const { t, strLanguageCode } = useModuleLabels("calendar", "Unable to load calendar labels.");
  const [objDisplayMonth, setObjDisplayMonth] = useState(() => {
    const objNow = new Date();
    return new Date(objNow.getFullYear(), objNow.getMonth(), 1);
  });
  const strMonthLabel = new Intl.DateTimeFormat(strLanguageCode === "hi" ? "hi-IN" : "en-IN", { month: "long", year: "numeric" }).format(objDisplayMonth);
  const lstCells = useMemo(() => buildMonthCells(objDisplayMonth), [objDisplayMonth]);

  function formatLabel(strTemplate: string, dicValues: Record<string, string | number>) {
    return Object.entries(dicValues).reduce(
      (strText, [strKey, objValue]) => strText.replaceAll(`{${strKey}}`, String(objValue)),
      strTemplate
    );
  }

  function showPreviousMonth() {
    setObjDisplayMonth((objPreviousMonth) =>
      new Date(objPreviousMonth.getFullYear(), objPreviousMonth.getMonth() - 1, 1)
    );
  }

  function showNextMonth() {
    setObjDisplayMonth((objPreviousMonth) =>
      new Date(objPreviousMonth.getFullYear(), objPreviousMonth.getMonth() + 1, 1)
    );
  }

  function jumpToCurrentMonth() {
    const objNow = new Date();
    setObjDisplayMonth(new Date(objNow.getFullYear(), objNow.getMonth(), 1));
  }

  return (
    <Stack spacing={1.5}>
      <Paper
        sx={{
          p: { xs: 1.5, md: 2 },
          borderRadius: "20px",
          border: "1px solid rgba(148,163,184,0.22)",
          background: "linear-gradient(135deg, #0b3f70 0%, #0a66a3 52%, #0e7490 100%)",
          color: "white",
          boxShadow: "0 14px 28px rgba(2, 6, 23, 0.18)",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                backgroundColor: "rgba(255,255,255,0.2)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <CalendarMonthRoundedIcon />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: "1rem" }}>{t("page_title", "Calendar")}</Typography>
              <Typography sx={{ fontSize: "0.82rem", color: "rgba(241,245,249,0.92)" }}>
                {t("subtitle", "Leaves, holidays, and important payroll dates in one place.")}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={0.7} alignItems="center">
            <Button
              controlId="ess.calendar.previous-month.button"
              aria-label={t("previous_month", "Previous month")}
              size="small"
              onClick={showPreviousMonth}
              sx={{ minWidth: 34, color: "white", borderColor: "rgba(255,255,255,0.48)" }}
              variant="outlined"
            >
              <ChevronLeftRoundedIcon fontSize="small" />
            </Button>
            <Chip
              label={strMonthLabel}
              sx={{
                fontWeight: 700,
                color: "white",
                borderColor: "rgba(255,255,255,0.5)",
                backgroundColor: "rgba(255,255,255,0.12)",
              }}
              variant="outlined"
            />
            <Button
              controlId="ess.calendar.next-month.button"
              aria-label={t("next_month", "Next month")}
              size="small"
              onClick={showNextMonth}
              sx={{ minWidth: 34, color: "white", borderColor: "rgba(255,255,255,0.48)" }}
              variant="outlined"
            >
              <ChevronRightRoundedIcon fontSize="small" />
            </Button>
            <Button
              controlId="ess.calendar.today.button"
              size="small"
              onClick={jumpToCurrentMonth}
              sx={{ color: "white", borderColor: "rgba(255,255,255,0.48)", textTransform: "none", fontWeight: 700 }}
              variant="outlined"
            >
              {t("today", "Today")}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={1.25}>
        <Grid item xs={12} lg={8.5}>
          <Paper sx={{ p: 1.25, borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 10px 20px rgba(15,23,42,0.05)" }}>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mb: 1 }}>
              <Chip size="small" label={t("legend_holiday", "Holiday")} sx={{ bgcolor: "#ccfbf1", color: "#115e59", fontWeight: 700 }} />
              <Chip size="small" label={t("legend_approved_leave", "Approved Leave")} sx={{ bgcolor: "#dcfce7", color: "#166534", fontWeight: 700 }} />
              <Chip size="small" label={t("legend_pending_leave", "Pending Leave")} sx={{ bgcolor: "#fef3c7", color: "#92400e", fontWeight: 700 }} />
              <Chip size="small" label={t("legend_important_date", "Important Date")} sx={{ bgcolor: "#ede9fe", color: "#6d28d9", fontWeight: 700 }} />
            </Stack>

            <Grid container spacing={0.8}>
              {lstWeekdayLabelKeys.map((objWeekday) => (
                <Grid item xs key={objWeekday.strKey}>
                  <Typography
                    sx={{
                      textAlign: "center",
                      fontSize: "0.76rem",
                      color: "#475569",
                      fontWeight: 700,
                      py: 0.35,
                    }}
                  >
                    {t(objWeekday.strKey, objWeekday.strFallback)}
                  </Typography>
                </Grid>
              ))}
            </Grid>

            <Box
              sx={{
                mt: 0.8,
                display: "grid",
                gap: 0.8,
                gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                gridTemplateRows: "repeat(6, minmax(80px, auto))",
              }}
            >
              {lstCells.map((objCell, intIndex) => (
                <Paper
                  key={`${objCell.intDay}-${intIndex}`}
                  elevation={0}
                  sx={{
                    p: 0.65,
                    borderRadius: "10px",
                    minHeight: 80,
                    border: "1px solid rgba(148,163,184,0.24)",
                    background: getCellBackground(objCell.lstMarkers, objCell.blnCurrentMonth),
                    cursor: objCell.blnCurrentMonth ? "pointer" : "default",
                    transition: "transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease",
                    "&:hover": objCell.blnCurrentMonth
                      ? {
                          transform: "translateY(-2px)",
                          borderColor: "rgba(37,99,235,0.38)",
                          boxShadow: "0 10px 18px rgba(37,99,235,0.14)",
                        }
                      : undefined,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      color: objCell.blnCurrentMonth ? "#0f172a" : "#94a3b8",
                    }}
                  >
                    {objCell.intDay}
                  </Typography>
                  <Stack spacing={0.35} sx={{ mt: 0.35 }}>
                    {objCell.lstMarkers.slice(0, 2).map((objMarker) => (
                      <Typography
                        key={`${objCell.intDay}-${objMarker.strType}-${objMarker.strLabelKey}`}
                        sx={{
                          px: 0.5,
                          py: 0.1,
                          borderRadius: "6px",
                          fontSize: "0.64rem",
                          fontWeight: 700,
                          color: getMarkerColor(objMarker.strType),
                          backgroundColor: "rgba(255,255,255,0.7)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {t(objMarker.strLabelKey, objMarker.strFallbackLabel)}
                      </Typography>
                    ))}
                  </Stack>
                </Paper>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={3.5}>
          <Stack spacing={1.25}>
            <Paper sx={{ p: 1.25, borderRadius: "18px", border: "1px solid #e2e8f0", boxShadow: "0 10px 20px rgba(15,23,42,0.05)" }}>
              <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.9rem", mb: 0.8 }}>
                {t("important_details", "Important Details")}
              </Typography>
              <Stack spacing={0.6}>
                <Stack direction="row" spacing={0.7} alignItems="center">
                  <EventAvailableRoundedIcon sx={{ color: "#0f766e", fontSize: 18 }} />
                  <Typography sx={{ fontSize: "0.8rem", color: "#1e293b", fontWeight: 600 }}>
                    {t("event_maharashtra_day_holiday", "02 May: Maharashtra Day Holiday")}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.7} alignItems="center">
                  <CurrencyRupeeRoundedIcon sx={{ color: "#1d4ed8", fontSize: 18 }} />
                  <Typography sx={{ fontSize: "0.8rem", color: "#1e293b", fontWeight: 600 }}>
                    {t("event_payroll_lock_date_detail", "18 May: Payroll Lock Date")}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.7} alignItems="center">
                  <CelebrationRoundedIcon sx={{ color: "#7c3aed", fontSize: 18 }} />
                  <Typography sx={{ fontSize: "0.8rem", color: "#1e293b", fontWeight: 600 }}>
                    {t("event_rd_townhall_detail", "26 May: R&D Townhall")}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>

            <Paper sx={{ p: 1.25, borderRadius: "18px", border: "1px solid #e2e8f0", boxShadow: "0 10px 20px rgba(15,23,42,0.05)" }}>
              <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.9rem", mb: 0.8 }}>
                {t("leave_summary", "Leave Summary")}
              </Typography>
              <Stack spacing={0.6}>
                <Stack direction="row" spacing={0.7} alignItems="center">
                  <BeachAccessRoundedIcon sx={{ color: "#166534", fontSize: 18 }} />
                  <Typography sx={{ fontSize: "0.8rem", color: "#1e293b", fontWeight: 600 }}>
                    {formatLabel(t("approved_leaves_count", "Approved Leaves: {count}"), { count: 2 })}
                  </Typography>
                </Stack>
                <Typography sx={{ fontSize: "0.8rem", color: "#334155" }}>
                  {formatLabel(t("pending_leave_requests_count", "Pending Leave Requests: {count}"), { count: 1 })}
                </Typography>
                <Typography sx={{ fontSize: "0.8rem", color: "#334155" }}>
                  {formatLabel(t("leave_balance_cl_days", "Leave Balance (CL): {count} days"), { count: 8 })}
                </Typography>
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}
