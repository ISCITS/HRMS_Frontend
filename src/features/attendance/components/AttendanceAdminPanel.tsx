"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import CommonRowActions from "@/components/master/CommonRowActions";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { attendanceService } from "@/features/attendance/services/attendanceService";
import { ATTENDANCE_STATUS_COLORS, type AttendanceDayDto, type ShiftDto, type ShiftRequest } from "@/features/attendance/dto";

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function emptyShift(): ShiftRequest {
  return { strShiftCode: "", strShiftName: "", tmStartTime: "09:00", tmEndTime: "18:00", intGraceInMinutes: 10, intGraceOutMinutes: 0, intBreakMinutes: 60, decFullDayHours: 8, decHalfDayHours: 4, blnIsActive: true };
}

export default function AttendanceAdminPanel() {
  const [lstShifts, setLstShifts] = useState<ShiftDto[]>([]);
  const [lstMuster, setLstMuster] = useState<AttendanceDayDto[]>([]);
  const [strMusterDate, setStrMusterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  const [blnShiftDialog, setBlnShiftDialog] = useState(false);
  const [objShiftForm, setObjShiftForm] = useState<ShiftRequest>(emptyShift());
  const [objViewingShift, setObjViewingShift] = useState<ShiftDto | null>(null);

  const [blnRosterDialog, setBlnRosterDialog] = useState(false);
  const [objRosterForm, setObjRosterForm] = useState({ intEmployeeID: "", intShiftID: 0, dtEffectiveFrom: new Date().toISOString().slice(0, 10), lstOff: [false, false, false, false, false, true, true] as boolean[] });

  const [objReconcile, setObjReconcile] = useState({ intEmployeeID: "", strPeriod: new Date().toISOString().slice(0, 7) });
  const [blnReconciling, setBlnReconciling] = useState(false);

  function showToast(strMessage: string, strSeverity: "success" | "error") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  const loadMuster = useCallback(async (strDate: string) => {
    try {
      setLstMuster(await attendanceService.getMuster(strDate));
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    }
  }, []);

  const loadAll = useCallback(async () => {
    setBlnLoading(true);
    try {
      const lstShiftResult = await attendanceService.listShifts();
      setLstShifts(lstShiftResult);
      await loadMuster(strMusterDate);
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    } finally {
      setBlnLoading(false);
    }
  }, [loadMuster, strMusterDate]);

  async function doReconcile() {
    if (!objReconcile.intEmployeeID) {
      showToast("Employee ID is required to reconcile.", "error");
      return;
    }
    setBlnReconciling(true);
    try {
      const objResult = await attendanceService.reconcile(Number(objReconcile.intEmployeeID), objReconcile.strPeriod);
      showToast(`Reconciled ${objResult.intDaysReconciled} day(s) for ${objResult.strPeriod}.`, "success");
      await loadMuster(strMusterDate);
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    } finally {
      setBlnReconciling(false);
    }
  }

  useEffect(() => { void loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveShift() {
    if (!objShiftForm.strShiftCode.trim() || !objShiftForm.strShiftName.trim()) {
      showToast("Shift code and name are required.", "error");
      return;
    }
    setBlnSaving(true);
    try {
      await attendanceService.createShift({
        ...objShiftForm,
        tmStartTime: `${objShiftForm.tmStartTime}:00`.slice(0, 8),
        tmEndTime: `${objShiftForm.tmEndTime}:00`.slice(0, 8),
      });
      showToast("Shift created.", "success");
      setBlnShiftDialog(false);
      setObjShiftForm(emptyShift());
      await loadAll();
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    } finally {
      setBlnSaving(false);
    }
  }

  async function saveRoster() {
    if (!objRosterForm.intEmployeeID || !objRosterForm.intShiftID) {
      showToast("Employee ID and shift are required.", "error");
      return;
    }
    setBlnSaving(true);
    try {
      await attendanceService.assignRoster({
        intEmployeeID: Number(objRosterForm.intEmployeeID),
        intShiftID: objRosterForm.intShiftID,
        dtEffectiveFrom: objRosterForm.dtEffectiveFrom,
        strWeeklyOffPattern: objRosterForm.lstOff.map((bln) => (bln ? "1" : "0")).join(""),
      });
      showToast("Roster assigned.", "success");
      setBlnRosterDialog(false);
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    } finally {
      setBlnSaving(false);
    }
  }

  const lstShiftRows = lstShifts.map((objShift) => ({
    id: objShift.intID,
    action: (
      <CommonRowActions
        testIdPrefix={`attendance.shift.${objShift.intID}`}
        rowKey={objShift.intID}
        blnCanView
        onView={() => setObjViewingShift(objShift)}
      />
    ),
    code: objShift.strShiftCode,
    name: objShift.strShiftName,
    start: objShift.strStartTime,
    end: objShift.strEndTime,
    fullDayHours: objShift.decFullDayHours,
    grace: `${objShift.intGraceInMinutes} min`,
    status: (
      <Chip size="small" label={objShift.blnIsActive ? "Active" : "Inactive"} sx={{ fontWeight: 700, bgcolor: objShift.blnIsActive ? "#dcfce7" : "#f1f5f9", color: objShift.blnIsActive ? "#166534" : "#475569" }} />
    ),
  }));
  const lstShiftColumns: CommonTableColumn<(typeof lstShiftRows)[number]>[] = [
    { field: "action", headerName: "Actions", sortable: false, filterable: false, exportable: false, width: 80 },
    { field: "code", headerName: "Code", width: 110 },
    { field: "name", headerName: "Name", width: 160 },
    { field: "start", headerName: "Start", width: 100 },
    { field: "end", headerName: "End", width: 100 },
    { field: "fullDayHours", headerName: "Full-day h", width: 110 },
    { field: "grace", headerName: "Grace", width: 100 },
    { field: "status", headerName: "Status", sortable: false, width: 110 },
  ];

  const lstMusterRows = lstMuster.map((objDay) => {
    const objColor = ATTENDANCE_STATUS_COLORS[objDay.strStatus] ?? { bg: "#f1f5f9", fg: "#475569" };
    return {
      id: objDay.intID,
      employee: (
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>{objDay.strEmployeeName ?? `#${objDay.intEmployeeID}`}</Typography>
          <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>{objDay.strEmployeeCode ?? ""}</Typography>
        </Box>
      ),
      status: <Chip size="small" label={objDay.strStatus.replace("_", " ")} sx={{ textTransform: "capitalize", fontWeight: 700, bgcolor: objColor.bg, color: objColor.fg }} />,
      firstIn: objDay.strFirstIn ?? "-",
      lastOut: objDay.strLastOut ?? "-",
      worked: `${objDay.decWorkedHours} h`,
      late: objDay.intLateMinutes > 0 ? `${objDay.intLateMinutes} min` : "-",
      ot: objDay.decOtHours > 0 ? `${objDay.decOtHours} h` : "-",
    };
  });
  const lstMusterColumns: CommonTableColumn<(typeof lstMusterRows)[number]>[] = [
    { field: "employee", headerName: "Employee", width: 200 },
    { field: "status", headerName: "Status", sortable: false, width: 130 },
    { field: "firstIn", headerName: "In", width: 90 },
    { field: "lastOut", headerName: "Out", width: 90 },
    { field: "worked", headerName: "Worked", width: 100 },
    { field: "late", headerName: "Late", width: 90 },
    { field: "ot", headerName: "OT", width: 90 },
  ];

  return (
    <Stack spacing={1.5}>
      <BlockingLoader blnOpen={blnSaving || blnReconciling} strLabel="Please wait..." />
      <Paper sx={{ p: { xs: 1.5, md: 2 }, borderRadius: "20px", background: "linear-gradient(135deg, #0b3f70 0%, #0a66a3 52%, #0e7490 100%)", color: "white", boxShadow: "0 14px 28px rgba(2, 6, 23, 0.18)" }}>
        <Stack direction="row" spacing={1.2} alignItems="center">
          <Box sx={{ width: 46, height: 46, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.2)", display: "grid", placeItems: "center" }}><ManageAccountsRoundedIcon /></Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1rem" }}>Attendance Administration</Typography>
            <Typography sx={{ fontSize: "0.82rem", color: "rgba(241,245,249,0.92)" }}>Manage shifts, rosters, and the daily muster.</Typography>
          </Box>
        </Stack>
      </Paper>

      {blnLoading ? (
        <BlockingLoader blnOpen strLabel="Loading..." />
      ) : (
        <>
          <Paper sx={{ p: 1.5, borderRadius: "18px", border: "1px solid #e2e8f0" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>Shifts</Typography>
              <Stack direction="row" spacing={1}>
                <Button controlId="attendance.roster.assign.button" variant="outlined" size="small" startIcon={<GroupsRoundedIcon />} disabled={lstShifts.length === 0}
                  onClick={() => { setObjRosterForm((objPrev) => ({ ...objPrev, intShiftID: lstShifts[0]?.intID ?? 0 })); setBlnRosterDialog(true); }}>Assign Roster</Button>
                <Button controlId="attendance.shift.add.button" variant="contained" size="small" startIcon={<AddRoundedIcon />} onClick={() => setBlnShiftDialog(true)}>Add Shift</Button>
              </Stack>
            </Stack>
            <CommonTable
              columns={lstShiftColumns}
              rows={lstShiftRows}
              rowIdField="id"
              hideToolbar
              minTableWidth={860}
              emptyMessage="No shifts yet."
              testIdPrefix="attendance.shift.list"
              onRowDoubleClick={(objRow) => {
                const objShift = lstShifts.find((objItem) => objItem.intID === objRow.id);
                if (objShift) setObjViewingShift(objShift);
              }}
            />
          </Paper>

          <Paper sx={{ p: 1.5, borderRadius: "18px", border: "1px solid #e2e8f0" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" gap={1}>
              <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>Daily Muster</Typography>
              <TextField controlId="attendance.muster.date.input" label="Date" type="date" size="small" InputLabelProps={{ shrink: true }} value={strMusterDate}
                onChange={(objEvent) => { setStrMusterDate(objEvent.target.value); void loadMuster(objEvent.target.value); }} />
            </Stack>
            <CommonTable
              columns={lstMusterColumns}
              rows={lstMusterRows}
              rowIdField="id"
              hideToolbar
              minTableWidth={790}
              emptyMessage="No attendance recorded for this date."
              testIdPrefix="attendance.muster.list"
            />
          </Paper>

          <Paper sx={{ p: 1.5, borderRadius: "18px", border: "1px solid #e2e8f0" }}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 0.5 }}>Reconcile Calendar</Typography>
            <Typography sx={{ fontSize: "0.78rem", color: "#64748b", mb: 1 }}>
              Merge holidays, weekly-offs, approved leave and punches into one status per day.
            </Typography>
            <Stack spacing={1.25} sx={{ maxWidth: 440 }}>
              <TextField controlId="attendance.reconcile.employee.input" label="Employee ID" type="number" size="small" fullWidth value={objReconcile.intEmployeeID} onChange={(e) => setObjReconcile((p) => ({ ...p, intEmployeeID: e.target.value }))} />
              <TextField controlId="attendance.reconcile.period.input" label="Month" type="month" size="small" fullWidth InputLabelProps={{ shrink: true }} value={objReconcile.strPeriod} onChange={(e) => setObjReconcile((p) => ({ ...p, strPeriod: e.target.value }))} />
              <Button controlId="attendance.reconcile.run.button" variant="contained" color="secondary" onClick={doReconcile} disabled={blnReconciling}>{blnReconciling ? "Reconciling..." : "Run Reconcile"}</Button>
            </Stack>
          </Paper>
        </>
      )}

      {/* Shift view dialog */}
      <Dialog open={Boolean(objViewingShift)} onClose={() => setObjViewingShift(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Shift Details</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1.5} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={4}><TextField label="Code" fullWidth size="small" value={objViewingShift?.strShiftCode ?? ""} disabled /></Grid>
            <Grid item xs={12} sm={8}><TextField label="Name" fullWidth size="small" value={objViewingShift?.strShiftName ?? ""} disabled /></Grid>
            <Grid item xs={6} sm={3}><TextField label="Start" fullWidth size="small" value={objViewingShift?.strStartTime ?? ""} disabled /></Grid>
            <Grid item xs={6} sm={3}><TextField label="End" fullWidth size="small" value={objViewingShift?.strEndTime ?? ""} disabled /></Grid>
            <Grid item xs={6} sm={3}><TextField label="Grace (min)" fullWidth size="small" value={objViewingShift?.intGraceInMinutes ?? ""} disabled /></Grid>
            <Grid item xs={6} sm={3}><TextField label="Full-day h" fullWidth size="small" value={objViewingShift?.decFullDayHours ?? ""} disabled /></Grid>
            <Grid item xs={12}><FormControlLabel control={<Switch checked={objViewingShift?.blnIsActive ?? false} disabled />} label="Active" /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button controlId="attendance.shift.view.close.button" onClick={() => setObjViewingShift(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Shift dialog */}
      <Dialog open={blnShiftDialog} onClose={() => setBlnShiftDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>New Shift</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1.5} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={4}><TextField controlId="attendance.shift.code.input" label="Code" fullWidth size="small" value={objShiftForm.strShiftCode} onChange={(e) => setObjShiftForm((p) => ({ ...p, strShiftCode: e.target.value.toUpperCase() }))} /></Grid>
            <Grid item xs={12} sm={8}><TextField controlId="attendance.shift.name.input" label="Name" fullWidth size="small" value={objShiftForm.strShiftName} onChange={(e) => setObjShiftForm((p) => ({ ...p, strShiftName: e.target.value }))} /></Grid>
            <Grid item xs={6} sm={3}><TextField controlId="attendance.shift.start.input" label="Start" type="time" fullWidth size="small" InputLabelProps={{ shrink: true }} value={objShiftForm.tmStartTime} onChange={(e) => setObjShiftForm((p) => ({ ...p, tmStartTime: e.target.value }))} /></Grid>
            <Grid item xs={6} sm={3}><TextField controlId="attendance.shift.end.input" label="End" type="time" fullWidth size="small" InputLabelProps={{ shrink: true }} value={objShiftForm.tmEndTime} onChange={(e) => setObjShiftForm((p) => ({ ...p, tmEndTime: e.target.value }))} /></Grid>
            <Grid item xs={6} sm={3}><TextField controlId="attendance.shift.grace.input" label="Grace (min)" type="number" fullWidth size="small" value={objShiftForm.intGraceInMinutes} onChange={(e) => setObjShiftForm((p) => ({ ...p, intGraceInMinutes: Number(e.target.value) || 0 }))} /></Grid>
            <Grid item xs={6} sm={3}><TextField controlId="attendance.shift.break.input" label="Break (min)" type="number" fullWidth size="small" value={objShiftForm.intBreakMinutes} onChange={(e) => setObjShiftForm((p) => ({ ...p, intBreakMinutes: Number(e.target.value) || 0 }))} /></Grid>
            <Grid item xs={6} sm={3}><TextField controlId="attendance.shift.full.input" label="Full-day h" type="number" fullWidth size="small" value={objShiftForm.decFullDayHours} onChange={(e) => setObjShiftForm((p) => ({ ...p, decFullDayHours: Number(e.target.value) || 0 }))} /></Grid>
            <Grid item xs={6} sm={3}><TextField controlId="attendance.shift.half.input" label="Half-day h" type="number" fullWidth size="small" value={objShiftForm.decHalfDayHours} onChange={(e) => setObjShiftForm((p) => ({ ...p, decHalfDayHours: Number(e.target.value) || 0 }))} /></Grid>
            <Grid item xs={12}><FormControlLabel control={<Switch checked={objShiftForm.blnIsActive} onChange={(e) => setObjShiftForm((p) => ({ ...p, blnIsActive: e.target.checked }))} />} label="Active" /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button controlId="attendance.shift.cancel.button" onClick={() => setBlnShiftDialog(false)} disabled={blnSaving}>Cancel</Button>
          <Button controlId="attendance.shift.save.button" variant="contained" onClick={saveShift} disabled={blnSaving}>{blnSaving ? "Saving..." : "Save"}</Button>
        </DialogActions>
      </Dialog>

      {/* Roster dialog */}
      <Dialog open={blnRosterDialog} onClose={() => setBlnRosterDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Assign Roster</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1.5} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={6}><TextField controlId="attendance.roster.employee.input" label="Employee ID" type="number" fullWidth size="small" value={objRosterForm.intEmployeeID} onChange={(e) => setObjRosterForm((p) => ({ ...p, intEmployeeID: e.target.value }))} /></Grid>
            <Grid item xs={12} sm={6}>
              <TextField controlId="attendance.roster.shift.select" label="Shift" select fullWidth size="small" value={objRosterForm.intShiftID || ""} onChange={(e) => setObjRosterForm((p) => ({ ...p, intShiftID: Number(e.target.value) }))}>
                {lstShifts.map((objShift) => (<MenuItem key={objShift.intID} value={objShift.intID}>{objShift.strShiftName}</MenuItem>))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}><TextField controlId="attendance.roster.effective.input" label="Effective From" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} value={objRosterForm.dtEffectiveFrom} onChange={(e) => setObjRosterForm((p) => ({ ...p, dtEffectiveFrom: e.target.value }))} /></Grid>
            <Grid item xs={12}>
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", mb: 0.5 }}>Weekly Off</Typography>
              <Stack direction="row" flexWrap="wrap">
                {WEEKDAYS.map((strDay, intIndex) => (
                  <FormControlLabel key={strDay} control={<Checkbox size="small" checked={objRosterForm.lstOff[intIndex]} onChange={(e) => setObjRosterForm((p) => { const lst = [...p.lstOff]; lst[intIndex] = e.target.checked; return { ...p, lstOff: lst }; })} />} label={strDay} />
                ))}
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button controlId="attendance.roster.cancel.button" onClick={() => setBlnRosterDialog(false)} disabled={blnSaving}>Cancel</Button>
          <Button controlId="attendance.roster.save.button" variant="contained" onClick={saveRoster} disabled={blnSaving}>{blnSaving ? "Saving..." : "Assign"}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={objToast.blnOpen} autoHideDuration={5000} onClose={() => setObjToast((objPrev) => ({ ...objPrev, blnOpen: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={objToast.strSeverity} variant="filled" onClose={() => setObjToast((objPrev) => ({ ...objPrev, blnOpen: false }))}>{objToast.strMessage}</Alert>
      </Snackbar>
    </Stack>
  );
}
