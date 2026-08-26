"use client";

import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import FingerprintRoundedIcon from "@mui/icons-material/FingerprintRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  ButtonBase,
  Chip,
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

import BlockingLoader from "@/components/shared/BlockingLoader";
import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import styles from "@/components/master/MasterScreen.module.css";
import { ATTENDANCE_STATUS_COLORS, type AttendanceDayDto } from "@/features/attendance/dto";
import { useMyAttendance } from "@/features/attendance/hooks/useMyAttendance";
import { attendanceService } from "@/features/attendance/services/attendanceService";
import type { MyAttendanceOverview, MyAttendancePunch } from "@/features/attendance/types/MyAttendanceTypes";
import { employeeService } from "@/features/employee/services/employeeService";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

// Selectable employee for the Employee dropdown: HR mode's "Employee Attendance" (any employee)
// or ESS manager mode (self + direct reports).
type ReviewEmployeeDto = { intEmployeeID: number; strFullName: string; strEmployeeCode: string | null; blnIsSelf: boolean };

function reviewEmployeeLabel(objEmployee: ReviewEmployeeDto): string {
  return objEmployee.strEmployeeCode ? `${objEmployee.strFullName} (${objEmployee.strEmployeeCode})` : objEmployee.strFullName;
}

type ToastState = {
  blnOpen: boolean;
  strMessage: string;
  strSeverity: "success" | "error";
};

const lstWeekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function formatMinutesDuration(intMinutes?: number | null) {
  const intSafeMinutes = Math.max(0, Math.round(Number(intMinutes ?? 0)));
  const intHours = Math.floor(intSafeMinutes / 60);
  const intRemainingMinutes = intSafeMinutes % 60;
  return `${intHours}h ${String(intRemainingMinutes).padStart(2, "0")}m`;
}

function formatDuration(decHours?: number | null) {
  return formatMinutesDuration(Number(decHours ?? 0) * 60);
}

function formatDisplayDate(strValue?: string | null) {
  if (!strValue) return "";
  const objDate = new Date(`${strValue}T00:00:00`);
  if (Number.isNaN(objDate.getTime())) return strValue;
  return objDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function parseTimeToMinutes(strValue?: string | null) {
  if (!strValue) return null;
  const [strHours, strMinutes] = strValue.slice(0, 5).split(":");
  const intHours = Number(strHours);
  const intMinutes = Number(strMinutes);
  if (
    !Number.isInteger(intHours) ||
    !Number.isInteger(intMinutes) ||
    intHours < 0 ||
    intHours > 23 ||
    intMinutes < 0 ||
    intMinutes > 59
  ) {
    return null;
  }
  return intHours * 60 + intMinutes;
}

function punchTimeToMinutes(strValue?: string | null) {
  if (!strValue) return null;
  const objDate = new Date(strValue);
  if (!Number.isNaN(objDate.getTime())) {
    return objDate.getHours() * 60 + objDate.getMinutes();
  }
  return parseTimeToMinutes(strValue);
}

function buildPunchTimelineRows(lstPunches: MyAttendancePunch[]) {
  let intOpenInMinutes: number | null = null;
  let intTotalMinutes = 0;
  const lstRows = [...lstPunches]
    .sort((objLeft, objRight) => new Date(objLeft.dtPunchAt).getTime() - new Date(objRight.dtPunchAt).getTime())
    .map((objPunch) => {
      const blnIsInPunch = objPunch.strDirection.toLowerCase() === "in";
      const intPunchMinutes = punchTimeToMinutes(objPunch.dtPunchAt);
      let intPeriodMinutes: number | null = null;

      if (blnIsInPunch) {
        intOpenInMinutes = intPunchMinutes;
      } else if (intOpenInMinutes !== null && intPunchMinutes !== null && intPunchMinutes >= intOpenInMinutes) {
        intPeriodMinutes = intPunchMinutes - intOpenInMinutes;
        intTotalMinutes += intPeriodMinutes;
        intOpenInMinutes = null;
      }

      return { ...objPunch, intPeriodMinutes };
    });

  return { lstRows, intTotalMinutes, blnHasUnmatchedPunch: intOpenInMinutes !== null };
}

function punchSourceLabel(strSource: string) {
  const strNormalized = strSource.trim().toLowerCase();
  if (["mobile", "app", "phone"].includes(strNormalized)) return "Mobile App";
  if (strNormalized === "web") return "Web";
  if (strNormalized === "biometric") return "Biometric";
  return strSource;
}

function toTitleCase(strValue: string) {
  return strValue
    .replaceAll("_", " ")
    .replace(/\b\w/g, (strMatch) => strMatch.toUpperCase());
}

// A Restricted Holiday the employee applied for and got approved is still status "holiday"
// on the backend (payroll/finalize/regularization all switch on strStatus, so that never
// changes) - this key is purely a frontend display distinction, driven by the additive
// blnIsMyRestrictedHoliday flag, so the employee can tell it apart from a plain holiday.
function attendanceDisplayStatus(objDay?: Pick<AttendanceDayDto, "strStatus" | "blnIsMyRestrictedHoliday"> | null): string {
  if (!objDay) return "";
  return objDay.strStatus === "holiday" && objDay.blnIsMyRestrictedHoliday ? "restricted_holiday" : objDay.strStatus;
}

// Shared panel. ESS mode (default): the caller's own attendance, with Punch In/Out. HR mode
// ("Employee Attendance"): an employee is chosen from a dropdown (same pattern as the HR Leave
// Ledger), the table stays empty until one is picked, and punching is not offered since HR is
// viewing someone else's attendance, not recording their own.
export default function EssAttendancePanel({ blnHrMode = false }: { blnHrMode?: boolean } = {}) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("my_attendance", "Unable to load My Attendance labels.");
  const { blnLoading: blnRightsLoading, canViewAny } = useModuleActionAccess(
    blnHrMode
      ? ["ATTENDANCE_REVIEW"]
      : [
        // Tenants may use either the canonical ESS code or the legacy My Attendance aliases.
        "ESS_ATTENDANCE",
        "ESS_MY_ATTENDANCE",
        "MY_ATTENDANCE",
      ],
  );
  const { canViewAny: canViewRegularization } = useModuleActionAccess([
    "ESS_ATTENDANCE_REGULARIZATION",
    "ATTENDANCE_REGULARIZATION",
  ]);
  const {
    objOverview,
    objHistory,
    objShift,
    blnLoading,
    blnPunching,
    strError,
    loadAttendance,
    punch,
  } = useMyAttendance();
  const [lstEmployees, setLstEmployees] = useState<ReviewEmployeeDto[]>([]);
  const [objSelectedEmployee, setObjSelectedEmployee] = useState<ReviewEmployeeDto | null>(null);
  const [blnEmployeesResolved, setBlnEmployeesResolved] = useState(false);
  const intReviewEmployeeID = objSelectedEmployee?.intEmployeeID ?? undefined;
  // ESS mode only shows the Employee dropdown when the caller manages someone (more than just
  // themselves in the viewable list) - an individual contributor's screen is unchanged. HR mode
  // always shows it.
  const blnShowEmployeeSelector = blnHrMode || lstEmployees.length > 1;
  // Punching/regularizing are self-only actions: available when the caller is viewing their own
  // attendance (always true in ESS mode until proven otherwise by picking a report; never true
  // in HR mode, which never resolves to "self").
  const blnViewingSelf = blnHrMode ? false : (objSelectedEmployee?.blnIsSelf ?? true);

  // Load the selectable employees once. ESS: self + direct reports (line/reporting manager),
  // defaulting to self. HR: every employee in the tenant/company, with no default selection (the
  // table stays empty until one is picked) - mirrors the HR Leave Ledger employee source.
  useEffect(() => {
    let blnActive = true;
    const objPromise: Promise<ReviewEmployeeDto[]> = blnHrMode
      ? employeeService.getEmployees().then((lstResult) =>
        lstResult
          .filter((objEmployee) => !objEmployee.blnIsPartialSave)
          .map((objEmployee) => ({
            intEmployeeID: objEmployee.intID,
            strFullName: objEmployee.strFullName,
            strEmployeeCode: objEmployee.strEmployeeCode,
            blnIsSelf: false,
          })),
      )
      : attendanceService.getMyAttendanceEmployees();
    objPromise
      .then((lstResult) => {
        if (!blnActive) return;
        setLstEmployees(lstResult);
        if (!blnHrMode) {
          setObjSelectedEmployee(lstResult.find((objEmployee) => objEmployee.blnIsSelf) ?? lstResult[0] ?? null);
        }
      })
      .catch(() => {
        /* ESS: fall back to self-only (endpoint defaults to caller). HR: leave the list empty. */
      })
      .finally(() => {
        if (blnActive) setBlnEmployeesResolved(true);
      });
    return () => {
      blnActive = false;
    };
  }, [blnHrMode]);
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
  const [blnTimelineDialogOpen, setBlnTimelineDialogOpen] = useState(false);
  const [objSelectedOverview, setObjSelectedOverview] = useState<MyAttendanceOverview | null>(null);
  const [blnTimelineLoading, setBlnTimelineLoading] = useState(false);
  const [strTimelineError, setStrTimelineError] = useState("");
  const [objToast, setObjToast] = useState<ToastState>({
    blnOpen: false,
    strMessage: "",
    strSeverity: "success",
  });
  const blnCanViewMyAttendance = canViewAny();

  const objMonthBounds = useMemo(() => getMonthBounds(objMonth), [objMonth]);
  const lstDisplayDays = useMemo(() => {
    const dicRecorded = new Map(
      (objHistory?.lstDays ?? [])
        .filter((objDay): objDay is AttendanceDayDto & { dtWorkDate: string } => Boolean(objDay.dtWorkDate))
        .map((objDay) => [objDay.dtWorkDate, objDay]),
    );
    const lstDays: AttendanceDayDto[] = [];
    const objCursor = new Date(`${objMonthBounds.strFromDate}T00:00:00`);
    const objEnd = new Date(`${objMonthBounds.strToDate}T00:00:00`);
    while (objCursor <= objEnd) {
      const strDate = toLocalISO(objCursor);
      const objRecorded = dicRecorded.get(strDate);
      if (objRecorded) {
        // The backend already resolves Holiday > Weekly Off > Approved Leave for any
        // date without a persisted attendance-day row (see clsAttendanceService
        // ._unrecordedDay), using the employee's applicable Attendance Policy - not the
        // calendar's Saturday/Sunday guess. Trust it as the single source of truth
        // instead of re-deriving weekly-off/absent here.
        lstDays.push(objRecorded);
      } else if (strDate <= strToday) {
        // Should be rare (backend fills every past/current date); keep a minimal
        // Absent fallback so the calendar never renders a blank cell for a past date.
        lstDays.push({
          intID: 0,
          intEmployeeID: objShift?.intEmployeeID ?? 0,
          dtWorkDate: strDate,
          strStatus: "absent",
          strFirstIn: null,
          strLastOut: null,
          decWorkedHours: 0,
          intLateMinutes: 0,
          intEarlyMinutes: 0,
          decOtHours: 0,
          blnIsPaid: false,
          blnIsFinalized: false,
          strRemark: null,
        });
      }
      // Future dates without a record are intentionally omitted; the calendar/list
      // views render them as "Not Processed" via blnFutureDate, not as Absent.
      objCursor.setDate(objCursor.getDate() + 1);
    }
    return lstDays;
  }, [objHistory, objMonthBounds.strFromDate, objMonthBounds.strToDate, objShift, strToday]);
  const dicDaysByDate = useMemo(
    () => Object.fromEntries(lstDisplayDays.map((objDay) => [objDay.dtWorkDate, objDay])),
    [lstDisplayDays],
  );
  const dicDisplayStatusCounts = useMemo(() => {
    const dicCounts: Record<string, number> = {};
    lstDisplayDays.forEach((objDay) => {
      dicCounts[objDay.strStatus] = (dicCounts[objDay.strStatus] ?? 0) + 1;
    });
    return dicCounts;
  }, [lstDisplayDays]);
  const objSelectedDay = dicDaysByDate[strSelectedDate] ?? (
    objOverview?.dtDate === strSelectedDate ? objOverview.objDay : null
  );
  const lstSelectedPunches = objSelectedOverview?.dtDate === strSelectedDate ? objSelectedOverview.lstPunches : [];
  const objPunchTimeline = useMemo(
    () => buildPunchTimelineRows(lstSelectedPunches),
    [lstSelectedPunches],
  );
  const blnSelectedDayEligibleForRegularization = Boolean(
    objSelectedDay
      && strSelectedDate <= strToday
      && objSelectedDay.blnIsFinalized
      && (
        objSelectedDay.strStatus === "absent"
        || objSelectedDay.strStatus === "half_day"
        || (objSelectedDay.strStatus === "present" && (!objSelectedDay.strFirstIn || !objSelectedDay.strLastOut))
      ),
  );
  const blnSelectedDayHasUnmatchedPunch = strSelectedDate === strToday
    && objOverview?.dtDate === strSelectedDate
    && objPunchTimeline.blnHasUnmatchedPunch;
  const strSelectedWorkedHours = objPunchTimeline.lstRows.length > 0
    ? formatMinutesDuration(objPunchTimeline.intTotalMinutes)
    : formatDuration(objSelectedDay?.decWorkedHours);
  const blnShowOtHours = Boolean(objOverview?.objPolicy?.blnOtEnabled);
  const strMonthlyWorkedHours = useMemo(() => {
    const intTotalMinutes = (objHistory?.lstDays ?? []).reduce((intTotal, objDay) => {
      const blnUsePunchTimeline = objDay.dtWorkDate === strSelectedDate && objPunchTimeline.lstRows.length > 0;
      const intDayMinutes = blnUsePunchTimeline
        ? objPunchTimeline.intTotalMinutes
        : Math.round(Number(objDay.decWorkedHours ?? 0) * 60);
      return intTotal + intDayMinutes;
    }, 0);

    return formatMinutesDuration(intTotalMinutes);
  }, [objHistory?.lstDays, objPunchTimeline.intTotalMinutes, objPunchTimeline.lstRows.length, strSelectedDate]);

  const loadSelectedMonth = useCallback(() => loadAttendance(
    strToday,
    objMonthBounds.strFromDate,
    objMonthBounds.strToDate,
    intReviewEmployeeID,
    blnHrMode,
  ), [loadAttendance, objMonthBounds.strFromDate, objMonthBounds.strToDate, strToday, intReviewEmployeeID, blnHrMode]);

  useEffect(() => {
    if (blnRightsLoading || !blnCanViewMyAttendance) return;
    if (!blnEmployeesResolved) return; // wait until the initial/self selection (ESS) or list (HR) is known
    if (blnHrMode && !intReviewEmployeeID) return; // HR mode: wait until an employee is chosen
    void loadSelectedMonth();
  }, [blnCanViewMyAttendance, blnRightsLoading, loadSelectedMonth, blnHrMode, blnEmployeesResolved, intReviewEmployeeID]);

  useEffect(() => {
    if (blnRightsLoading || !blnCanViewMyAttendance) return;
    if (!blnEmployeesResolved) return;
    if (blnHrMode && !intReviewEmployeeID) {
      setObjSelectedOverview(null);
      return;
    }

    let blnCancelled = false;
    setBlnTimelineLoading(true);
    setStrTimelineError("");

    const objOverviewPromise = blnHrMode
      ? attendanceService.getAttendanceReviewOverview(strSelectedDate, intReviewEmployeeID as number)
      : attendanceService.getMyAttendanceOverview(strSelectedDate, intReviewEmployeeID);

    objOverviewPromise
      .then((objResult) => {
        if (!blnCancelled) {
          setObjSelectedOverview(objResult);
        }
      })
      .catch(async (objError) => {
        const objHandledError = await createApiRequestError(objError);
        if (!blnCancelled) {
          setObjSelectedOverview(null);
          setStrTimelineError(objHandledError.message);
        }
      })
      .finally(() => {
        if (!blnCancelled) {
          setBlnTimelineLoading(false);
        }
      });

    return () => {
      blnCancelled = true;
    };
  }, [blnCanViewMyAttendance, blnRightsLoading, strSelectedDate, blnHrMode, intReviewEmployeeID, blnEmployeesResolved]);

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
  // Includes a year ahead of the current one so navigating past December with the "next
  // month" control always lands on a year that's still present in this dropdown.
  const lstYears = useMemo(
    () => Array.from({ length: 5 }, (_, intIndex) => objToday.getFullYear() - 3 + intIndex),
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
    if (!objDay) return <Chip size="small" label={t("not_recorded", "No attendance record")} />;
    const strDisplayStatus = attendanceDisplayStatus(objDay);
    const objColor = ATTENDANCE_STATUS_COLORS[strDisplayStatus] ?? {
      bg: "#f1f5f9",
      fg: "#475569",
      short: "",
    };
    const strFallbackLabel = strDisplayStatus === "weekly_off"
      ? "Weekly Off"
      : strDisplayStatus === "restricted_holiday"
        ? "Restricted Holiday"
        : toTitleCase(strDisplayStatus);
    return (
      <Chip
        size="small"
        label={strDisplayStatus === "weekly_off"
          ? t("status_weekly_off", strFallbackLabel)
          : t(`status_${strDisplayStatus}`, strFallbackLabel)}
        sx={{ bgcolor: objColor.bg, color: objColor.fg, fontWeight: 800, textTransform: "capitalize" }}
      />
    );
  }

  if (blnRightsLoading) {
    return <BlockingLoader blnOpen strLabel={t("loading", "Loading...")} />;
  }
  if (!blnCanViewMyAttendance) {
    return (
      <Alert severity="warning">
        {blnHrMode
          ? t("attendance_review_permission_denied", "Employee Attendance access is not available for your user group.")
          : t("permission_denied", "My Attendance access is not available for your user group.")}
      </Alert>
    );
  }

  const objEmployeeSelector = blnShowEmployeeSelector ? (
    <Autocomplete
      size="small"
      options={lstEmployees}
      value={objSelectedEmployee}
      getOptionLabel={(objOption) => reviewEmployeeLabel(objOption)}
      isOptionEqualToValue={(objA, objB) => objA.intEmployeeID === objB.intEmployeeID}
      onChange={(_objEvent, objNext) => {
        if (objNext) setObjSelectedEmployee(objNext);
      }}
      sx={{ width: { xs: "100%", sm: 300 }, "& .MuiAutocomplete-clearIndicator": { display: "none" } }}
      renderInput={(objParams) => (
        <TextField
          {...objParams}
          label="Employee"
          placeholder="Search employee..."
          controlId="attendance-review.employee.select"
          InputLabelProps={{ ...objParams.InputLabelProps, shrink: true }}
        />
      )}
    />
  ) : null;

  return (
    <Stack spacing={1.5}>
      {blnHrMode && objEmployeeSelector ? (
        <Box className={styles.controlsCard} data-control-id="attendance-review.filters.card">
          <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", sm: "minmax(260px, 420px)" }, alignItems: "center", mt: 1 }}>
            {objEmployeeSelector}
          </Box>
        </Box>
      ) : null}

      {objSelectedEmployee && !objSelectedEmployee.blnIsSelf ? (
        <Alert severity="info" variant="outlined" sx={{ borderRadius: "12px", py: 0.25 }}>
          Viewing attendance for <strong>{objSelectedEmployee.strFullName}</strong>
          {objSelectedEmployee.strEmployeeCode ? ` (${objSelectedEmployee.strEmployeeCode})` : ""}
        </Alert>
      ) : null}

      {blnHrMode && !objSelectedEmployee ? (
        <Paper variant="outlined" sx={{ borderRadius: "16px", p: 6, textAlign: "center" }}>
          <AccessTimeRoundedIcon sx={{ fontSize: 40, color: "#94a3b8", mb: 1 }} />
          <Typography sx={{ color: "text.secondary", fontWeight: 600 }}>
            Select an employee to view their attendance.
          </Typography>
        </Paper>
      ) : (
      <>
      <Paper
        data-control-id="ess.my-attendance.controls.toolbar"
        sx={{
          px: { xs: 1, md: 1.25 },
          py: 1,
          borderRadius: "10px",
          display: "flex",
          flexWrap: "wrap",
          rowGap: 1,
          alignItems: "center",
          justifyContent: !blnHrMode && objEmployeeSelector ? "space-between" : "flex-end",
          boxShadow: "none",
          border: "1px solid rgba(31, 91, 142, 0.18)",
        }}
      >
        {!blnHrMode ? objEmployeeSelector : null}
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          justifyContent={{ xs: "flex-start", md: "flex-end" }}
          flexWrap="wrap"
          useFlexGap
          sx={{
            ml: { md: "auto" },
            maxWidth: "100%",
            rowGap: 0.75,
            "& .MuiButton-root": {
              height: 40,
              minHeight: 40,
              borderRadius: "8px",
              fontWeight: 800,
              textTransform: "none",
            },
            "& .MuiButton-root.MuiButton-outlined": {
              bgcolor: "#fff",
              borderColor: "var(--app-primary-color)",
              color: "var(--app-primary-color)",
              "&:hover": { bgcolor: "rgba(255,255,255,.92)", borderColor: "var(--app-primary-color)" },
            },
            "& .MuiInputBase-root": {
              bgcolor: "#fff",
              height: 40,
              borderRadius: "8px",
            },
            "& .MuiSelect-select": {
              display: "flex",
              alignItems: "center",
              py: 0,
            },
          }}
        >
          <Button
            data-control-id="ess.my-attendance.policy-info.button"
            variant="outlined"
            startIcon={<InfoOutlinedIcon />}
            onClick={() => setBlnPolicyDialogOpen(true)}
            sx={{ bgcolor: "#fff", borderColor: "var(--app-primary-color)", color: "var(--app-primary-color)", "&:hover": { bgcolor: "rgba(255,255,255,.92)", borderColor: "var(--app-primary-color)" } }}
          >
            {t("my_attendance_policy", "My Attendance Policy")}
          </Button>
          <Button data-control-id="ess.my-attendance.previous-month.button" variant="outlined" onClick={() => moveMonth(-1)} aria-label={t("previous_month", "Previous month")} sx={{ minWidth: 44, width: 44, px: 0 }}><ChevronLeftRoundedIcon /></Button>
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
            sx={{ width: 126 }}
          >
            {Array.from({ length: 12 }, (_, intMonth) => (
              <MenuItem key={intMonth} value={intMonth}>
                {new Date(2020, intMonth, 1).toLocaleString([], { month: "long" })}
              </MenuItem>
              ))}
            </TextField>
          <Button data-control-id="ess.my-attendance.next-month.button" variant="outlined" onClick={() => moveMonth(1)} aria-label={t("next_month", "Next month")} sx={{ minWidth: 44, width: 44, px: 0 }}><ChevronRightRoundedIcon /></Button>
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
            sx={{ width: 96 }}
          >
            {lstYears.map((intYear) => <MenuItem key={intYear} value={intYear}>{intYear}</MenuItem>)}
          </TextField>
          <Button data-control-id="ess.my-attendance.today.button" variant="outlined" onClick={goToToday} sx={{ minWidth: 72, px: 1.5 }}>{t("today", "Today")}</Button>
        </Stack>
      </Paper>

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

      <Grid container spacing={1} alignItems="stretch">
        <Grid item xs={12} sm={5} md={2}>
          <Paper sx={{ p: { xs: 1.25, md: 1.5 }, borderRadius: "10px", border: "1px solid", borderColor: "divider", height: { xs: "auto", md: 120 }, minHeight: 120, boxShadow: 0, overflow: "hidden", position: "relative" }}>
            <Box sx={{ position: "absolute", top: 8, right: 12, zIndex: 1 }}>
              {renderStatusChip(objSelectedDay)}
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ height: "100%" }}>
              <Box sx={{ minWidth: 0, flex: "1 1 auto", pr: 0 }}>
                <Typography fontWeight={900} noWrap>
                  {strSelectedDate === strToday
                    ? t("today", "Today")
                    : t("selected_date", "Selected Date")}
                </Typography>
                <Typography variant="h6" fontWeight={900} noWrap sx={{ mt: 0.25, fontSize: { md: "1.08rem", xl: "1.25rem" } }}>
                  {new Date(`${strSelectedDate}T00:00:00`).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })}
                </Typography>
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
                  {strSelectedDate === strToday ? (
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ textTransform: "capitalize" }}>
                      {t(`state_${objOverview?.strCurrentState ?? "not_punched"}`, toTitleCase(objOverview?.strCurrentState ?? "not_punched"))}
                    </Typography>
                  ) : null}
                </Stack>
              </Box>
              {blnViewingSelf ? (
                <Box sx={{ flex: "0 0 118px", display: "flex", justifyContent: "flex-end" }}>
                  {strSelectedDate === strToday ? (
                    <Button
                      data-control-id={`ess.my-attendance.punch-${objOverview?.strNextPunchDirection ?? "in"}.button`}
                      size="medium"
                      variant="contained"
                      startIcon={<FingerprintRoundedIcon />}
                      disabled={blnLoading || blnPunching || !objOverview?.blnCanPunch}
                      onClick={() => setBlnPunchDialogOpen(true)}
                      sx={{ minHeight: 44, px: 1.25, borderRadius: "8px", fontWeight: 900, whiteSpace: "nowrap" }}
                    >
                      {blnPunching
                        ? t("recording", "Recording...")
                        : objOverview?.strNextPunchDirection === "out"
                          ? t("punch_out", "Punch Out")
                          : t("punch_in", "Punch In")}
                    </Button>
                  ) : null}
                </Box>
              ) : null}
            </Stack>
            {blnViewingSelf && strSelectedDate === strToday && !objOverview?.blnCanPunch ? (
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

        <Grid item xs={12} sm={7} md={5}>
          <Paper sx={{ p: { xs: 1.25, md: 1.5 }, borderRadius: "10px", border: "1px solid", borderColor: "divider", height: { xs: "auto", md: 120 }, minHeight: 120, boxShadow: 0, overflow: "hidden" }}>
            <Typography fontWeight={900} sx={{ mb: 0.75 }}>{t("selected_day_summary", "Selected Day Summary")}</Typography>
            <Stack
              direction="row"
              useFlexGap
              spacing={0.75}
              alignItems="stretch"
              sx={{ flexWrap: { xs: "wrap", lg: "nowrap" }, overflowX: { lg: "hidden" } }}
            >
              {[
                [t("first_in", "First In"), objSelectedDay?.strFirstIn?.slice(0, 5) ?? "—"],
                [t("last_out", "Last Out"), objSelectedDay?.strLastOut?.slice(0, 5) ?? "—"],
                [
                  t("worked_hours", "Worked Hours"),
                  blnSelectedDayHasUnmatchedPunch
                    ? t("punch_unmatched", "Awaiting Punch Out")
                    : strSelectedWorkedHours,
                ],
                ...(blnShowOtHours ? [[t("overtime_hours", "OT Hours"), formatDuration(objSelectedDay?.decOtHours)]] : []),
                ...((objSelectedDay?.intLateMinutes ?? 0) > 0 ? [[t("late_by", "Late By"), `${objSelectedDay?.intLateMinutes} min`]] : []),
                ...((objSelectedDay?.intEarlyMinutes ?? 0) > 0 ? [[t("early_by", "Early By"), `${objSelectedDay?.intEarlyMinutes} min`]] : []),
                [t("paid_day", "Paid Day"), objSelectedDay ? (objSelectedDay.blnIsPaid ? t("yes", "Yes") : t("no", "No")) : "—"],
              ].map(([strLabel, strValue]) => (
                <Box key={strLabel} sx={{ px: 1, py: 0.6, minHeight: 52, minWidth: 86, bgcolor: "action.hover", borderRadius: "10px", flex: "1 1 86px", overflow: "hidden" }}>
                  <Typography variant="caption" lineHeight={1.1} color="text.secondary" noWrap>{strLabel}</Typography>
                  <Typography
                    variant="body2"
                    lineHeight={1.25}
                    fontWeight={900}
                    title={String(strValue)}
                    noWrap
                    sx={{ mt: 0.4, fontSize: { xs: "0.78rem", md: "0.76rem", xl: "0.875rem" }, overflow: "hidden", textOverflow: "ellipsis" }}
                  >
                    {strValue}
                  </Typography>
                </Box>
              ))}
              <Button
                data-control-id="ess.my-attendance.punch-timeline.button"
                variant="contained"
                size="small"
                startIcon={<AccessTimeRoundedIcon />}
                onClick={() => setBlnTimelineDialogOpen(true)}
                sx={{ minHeight: 52, px: 1.25, borderRadius: "10px", fontWeight: 700, boxShadow: "none", whiteSpace: "nowrap", flex: "0 0 auto" }}
              >
                {t("punch_timeline", "Punch Timeline")}
              </Button>
              <Box sx={{ flex: "0 0 94px", minHeight: 52 }}>
                {blnViewingSelf && blnSelectedDayEligibleForRegularization && canViewRegularization() ? (
                  <Button
                    data-control-id="ess.my-attendance.regularize.button"
                    variant="outlined"
                    size="small"
                    fullWidth
                    onClick={() => objRouter.push(`/ess/attendance/regularization?date=${encodeURIComponent(strSelectedDate)}`)}
                    sx={{ minHeight: 52, px: 1.25, borderRadius: "10px", fontWeight: 700, whiteSpace: "nowrap" }}
                  >
                    {t("regularize", "Regularize")}
                  </Button>
                ) : null}
              </Box>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper sx={{ p: { xs: 1.25, md: 1.5 }, borderRadius: "10px", border: "1px solid", borderColor: "divider", height: { xs: "auto", md: 120 }, minHeight: 120, boxShadow: 0, overflow: "hidden" }}>
            <Typography fontWeight={900} sx={{ mb: 0.25 }}>{t("monthly_summary", "Monthly Summary")}</Typography>
            <Typography variant="caption" color="text.secondary">
              {objMonth.toLocaleDateString([], { month: "long", year: "numeric" })}
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", columnGap: 0.5, mt: 1, alignItems: "start" }}>
              {[
                [t("present", "Present"), dicDisplayStatusCounts.present ?? 0],
                [t("absent", "Absent"), dicDisplayStatusCounts.absent ?? 0],
                [t("half_day", "Half Day"), dicDisplayStatusCounts.half_day ?? 0],
                [t("leave", "Leave"), (dicDisplayStatusCounts.on_leave ?? 0) + (dicDisplayStatusCounts.lwp ?? 0)],
                [t("worked_hours", "Worked Hours"), strMonthlyWorkedHours],
                [t("late_occurrences_short", "Late Occ."), objHistory?.objSummary.intLateOccurrences ?? 0],
                [t("early_occurrences_short", "Early Departure"), objHistory?.objSummary.intEarlyOccurrences ?? 0],
              ].map(([strLabel, objValue]) => (
                <Box key={strLabel} sx={{ minWidth: 0, textAlign: "center", px: 0.25 }}>
                  <Typography variant="body2" lineHeight={1.15} fontWeight={900} noWrap>{objValue}</Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    title={String(strLabel)}
                    noWrap
                    sx={{ display: "block", mt: 0.3, overflow: "hidden", textOverflow: "ellipsis", fontSize: "0.68rem" }}
                  >
                    {strLabel}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: { xs: 1.25, md: 2 }, borderRadius: "10px", border: "1px solid", borderColor: "divider", boxShadow: 0, overflow: "hidden" }}>
        <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>{t("monthly_history", "Monthly Attendance")}</Typography>

        {blnLoading ? (
          <Box sx={{ position: "relative", minHeight: 160 }}><BlockingLoader blnOpen blnLocal strLabel={t("loading", "Loading...")} /></Box>
        ) : blnMobile ? (
          <Stack spacing={0.75}>
            {lstMonthDays.map((strDate) => {
              const objDay = dicDaysByDate[strDate];
              const blnFutureDate = strDate > strToday;
              const blnUnresolvedFutureDate = blnFutureDate && !objDay;
              return (
                <ButtonBase
                  key={strDate}
                  data-control-id={`ess.my-attendance.day.${strDate}.button`}
                  disabled={blnUnresolvedFutureDate}
                  onClick={() => setStrSelectedDate(strDate)}
                  sx={{ width: "100%", justifyContent: "space-between", p: 1.25, border: "1px solid", borderColor: strSelectedDate === strDate ? "primary.main" : "divider", borderRadius: "6px", opacity: blnUnresolvedFutureDate ? 0.45 : 1, textAlign: "left" }}
                >
                  <Box>
                    <Typography fontWeight={800}>{new Date(`${strDate}T00:00:00`).toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short" })}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {blnUnresolvedFutureDate
                        ? t("not_processed", "Not Processed")
                        : objDay ? formatDuration(objDay.decWorkedHours) : t("not_recorded", "No attendance record")}
                    </Typography>
                  </Box>
                  {blnUnresolvedFutureDate
                    ? <Chip size="small" label={t("not_processed", "Not Processed")} />
                    : renderStatusChip(objDay)}
                </ButtonBase>
              );
            })}
          </Stack>
        ) : (
          <>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 0.5, mb: 0.5 }}>
              {lstWeekdays.map((strDay) => (
                <Typography key={strDay} align="center" fontWeight={800} color="text.secondary">
                  {t(`weekday_${strDay.toLowerCase()}`, strDay)}
                </Typography>
              ))}
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 0.5 }}>
              {lstCalendarCells.map((strDate, intIndex) => {
                if (!strDate) return <Box key={`blank-${intIndex}`} />;
                const objDay = dicDaysByDate[strDate];
                const strDayDisplayStatus = attendanceDisplayStatus(objDay);
                const objColor = objDay ? ATTENDANCE_STATUS_COLORS[strDayDisplayStatus] : null;
                const blnFutureDate = strDate > strToday;
                const blnUnresolvedFutureDate = blnFutureDate && !objDay;
                return (
                  <ButtonBase
                    key={strDate}
                    data-control-id={`ess.my-attendance.day.${strDate}.button`}
                    disabled={blnUnresolvedFutureDate}
                    onClick={() => setStrSelectedDate(strDate)}
                    sx={{ minHeight: 66, alignItems: "stretch", justifyContent: "flex-start", p: 0.85, border: "1px solid", borderColor: strSelectedDate === strDate ? "primary.main" : "divider", borderRadius: "6px", bgcolor: objColor?.bg ?? "background.paper", opacity: blnUnresolvedFutureDate ? 0.45 : 1, textAlign: "left" }}
                  >
                    <Stack width="100%" height="100%" spacing={0.25}>
                      <Typography variant="h6" fontWeight={900} lineHeight={1} sx={{ letterSpacing: 0 }}>{Number(strDate.slice(-2))}</Typography>
                      <Stack alignItems="center" justifyContent="center" spacing={0.25} sx={{ flex: 1, minHeight: 0, minWidth: 0, textAlign: "center" }}>
                        <Box
                          component="span"
                          sx={{
                            maxWidth: "100%",
                            px: 0.9,
                            py: 0.25,
                            borderRadius: "999px",
                            bgcolor: objColor ? alpha(objColor.fg, 0.1) : "transparent",
                          }}
                        >
                          <Typography variant="caption" fontWeight={800} color={objColor?.fg ?? "text.secondary"} noWrap sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {blnUnresolvedFutureDate
                              ? t("not_processed", "Not Processed")
                              : objDay ? (
                                strDayDisplayStatus === "weekly_off"
                                  ? t("status_weekly_off", "Weekly Off")
                                  : t(
                                    `status_${strDayDisplayStatus}`,
                                    strDayDisplayStatus === "restricted_holiday" ? "Restricted Holiday" : toTitleCase(strDayDisplayStatus),
                                  )
                              ) : ""}
                          </Typography>
                        </Box>
                        {!blnUnresolvedFutureDate && objDay && objDay.decWorkedHours > 0 ? (
                          <Typography variant="caption" color="text.secondary" lineHeight={1.1}>{formatDuration(objDay.decWorkedHours)}</Typography>
                        ) : null}
                      </Stack>
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
        <DialogTitle sx={{ pb: 1 }}>{t("my_attendance_policy", "My Attendance Policy")}</DialogTitle>
        <DialogContent sx={{ pt: "0 !important" }}>
          {objOverview?.objPolicy ? (
            <Stack spacing={1.75}>
              <Box sx={{ p: 1.5, borderRadius: "12px", bgcolor: (objThemeArg) => alpha(objThemeArg.palette.primary.main, 0.08), border: "1px solid", borderColor: (objThemeArg) => alpha(objThemeArg.palette.primary.main, 0.18) }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
                  <Typography fontWeight={900} fontSize="1.05rem">{objOverview.objPolicy.strPolicyName}</Typography>
                  <Chip
                    size="small"
                    color="primary"
                    label={objOverview.objPolicy.strPolicySource === "EMPLOYEE_ASSIGNMENT"
                      ? t("policy_source_employee_assignment", "Employee Assignment")
                      : t("policy_source_company_default", "Company Default")}
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {t("policy_effective_for_date", "Effective for")} {formatDisplayDate(strSelectedDate)} · {t("policy_effective_from", "Effective From")} {formatDisplayDate(objOverview.objPolicy.dtEffectiveFrom)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.5, fontWeight: 700 }}>{t("working_hour_rules", "Working Hour Rules")}</Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" }, gap: 1, mt: 0.5 }}>
                  {[
                    [t("full_day_threshold_short", "Full Day"), `${objOverview.objPolicy.decFullDayThresholdHours} h`],
                    [t("half_day_threshold_short", "Half Day"), `${objOverview.objPolicy.decHalfDayThresholdHours} h`],
                    ...(objOverview.objPolicy.strInTime || objOverview.objPolicy.strOutTime
                      ? [[t("shift_timing", "Shift Timing"), `${objOverview.objPolicy.strInTime?.slice(0, 5) ?? "—"} - ${objOverview.objPolicy.strOutTime?.slice(0, 5) ?? "—"}`]]
                      : []),
                    [t("late_grace", "Late Arrival Grace"), `${objOverview.objPolicy.intLateGraceMinutes} min`],
                    [t("early_grace", "Early Departure Grace"), `${objOverview.objPolicy.intEarlyDepartureGraceMinutes} min`],
                    [t("overtime_enabled", "Overtime"), objOverview.objPolicy.blnOtEnabled ? t("yes", "Yes") : t("no", "No")],
                  ].map(([strLabel, strValue]) => (
                    <Box key={strLabel} sx={{ px: 1.25, py: 0.85, borderRadius: "10px", bgcolor: "action.hover", border: "1px solid", borderColor: "divider" }}>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">{strLabel}</Typography>
                      <Typography variant="body2" fontWeight={800} sx={{ mt: 0.25 }}>{strValue}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.5, fontWeight: 700 }}>{t("standard_weekly_off_days", "Standard Weekly Off Days")}</Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                  {(() => {
                    const lstOffDays = lstWeekdays.filter((_strDay, intJsIndex) => {
                      const intPatternIndex = (intJsIndex + 6) % 7;
                      return objOverview.objPolicy?.strWeeklyOffPattern?.[intPatternIndex] === "1";
                    });
                    return lstOffDays.length > 0
                      ? lstOffDays.map((strDay) => (
                        <Chip key={strDay} size="small" color="primary" label={t(`weekday_${strDay}`, strDay)} sx={{ fontWeight: 700 }} />
                      ))
                      : <Typography variant="body2" color="text.secondary">{t("none", "None")}</Typography>;
                  })()}
                </Stack>
              </Box>

              <Alert severity="info" icon={<InfoOutlinedIcon fontSize="small" />} sx={{ borderRadius: "10px", "& .MuiAlert-message": { py: 0.25 } }}>
                {t("missing_punch_treatment", "Missing Punch")}: {
                  objOverview.objPolicy.strMissingPunchTreatmentCode === "EXCEPTION"
                    ? t("missing_punch_treatment_exception", "Missing punch creates an attendance exception")
                    : t(
                      `missing_punch_treatment_${objOverview.objPolicy.strMissingPunchTreatmentCode?.toLowerCase()}`,
                      objOverview.objPolicy.strMissingPunchTreatmentCode,
                    )
                }
              </Alert>
            </Stack>
          ) : <Alert severity="info">{t("no_policy", "No attendance policy applies to the selected date. Punching is disabled until a policy is configured.")}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button data-control-id="ess.my-attendance.policy-info.close.button" onClick={() => setBlnPolicyDialogOpen(false)}>{t("close", "Close")}</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        data-control-id="ess.my-attendance.punch-timeline.dialog"
        open={blnTimelineDialogOpen}
        onClose={() => setBlnTimelineDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {t("punch_timeline", "Punch Timeline")} - {formatDisplayDate(strSelectedDate)}
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            maxHeight: "55vh",
            overflowY: "auto",
            scrollbarWidth: "thin",
            "&::-webkit-scrollbar": { width: 8 },
            "&::-webkit-scrollbar-thumb": { backgroundColor: "#9aabb9", borderRadius: 8 },
          }}
        >
          {blnTimelineLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <BlockingLoader blnOpen blnLocal strLabel={t("loading", "Loading")} />
            </Box>
          ) : strTimelineError ? (
            <Alert severity="error">{strTimelineError}</Alert>
          ) : objPunchTimeline.lstRows.length > 0 ? (
            <Stack spacing={0.75}>
              {objPunchTimeline.lstRows.map((objPunch) => (
                <Box
                  key={objPunch.intID}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr auto", sm: "128px 1fr 92px 88px" },
                    alignItems: "center",
                    gap: 1,
                    px: 1.25,
                    py: 0.75,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: "6px",
                    bgcolor: "background.paper",
                  }}
                >
                  <Chip
                    size="small"
                    label={objPunch.strDirection === "in" ? t("punch_in", "Punch In") : t("punch_out", "Punch Out")}
                    color={objPunch.strDirection === "in" ? "success" : "warning"}
                    sx={{ justifySelf: "start", fontWeight: 800 }}
                  />
                  <Typography fontWeight={800}>{formatTime(objPunch.dtPunchAt)}</Typography>
                  <Typography color="text.secondary" sx={{ textAlign: { xs: "left", sm: "right" } }}>
                    {t(`source_${objPunch.strSource}`, punchSourceLabel(objPunch.strSource))}
                  </Typography>
                  <Typography
                    fontWeight={850}
                    color={objPunch.intPeriodMinutes !== null ? "primary.main" : "text.disabled"}
                    sx={{ textAlign: "right" }}
                  >
                    {objPunch.intPeriodMinutes !== null ? formatMinutesDuration(objPunch.intPeriodMinutes) : "—"}
                  </Typography>
                </Box>
              ))}
              <Divider sx={{ pt: 0.5 }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 1.25, pt: 0.5 }}>
                <Typography fontWeight={900}>{t("total_time", "Total Time")}</Typography>
                <Typography fontWeight={900} color="primary.main">
                  {objPunchTimeline.blnHasUnmatchedPunch
                    ? t("punch_out_pending", "Punch Out pending")
                    : formatMinutesDuration(objPunchTimeline.intTotalMinutes)}
                </Typography>
              </Stack>
            </Stack>
          ) : (
            <Typography color="text.secondary">{t("no_punches", "No punches recorded")}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button data-control-id="ess.my-attendance.punch-timeline.close.button" onClick={() => setBlnTimelineDialogOpen(false)}>{t("close", "Close")}</Button>
        </DialogActions>
      </Dialog>
      </>
      )}

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
