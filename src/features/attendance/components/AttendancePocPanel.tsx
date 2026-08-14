"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import GroupAddRoundedIcon from "@mui/icons-material/GroupAddRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, FormControlLabel, Grid, IconButton,
  MenuItem, Paper, Snackbar, Stack, Switch, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import * as yup from "yup";

import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import styles from "@/components/master/MasterScreen.module.css";
import { useAttendancePoc } from "@/features/attendance/hooks/useAttendancePoc";
import type { AttendancePolicyAssignmentEmployee, AttendancePolicyAssignmentHistory, AttendancePolicyFormValues, DailyAttendanceFinalizeResult, DailyAttendanceRow, DailyAttendanceSaveRow } from "@/features/attendance/types";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { authHelpers } from "@/lib/auth";
import { masterApiService } from "@/services/master/MasterApiService";

const lstWeekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// Recommended visible order per the stabilization guide. "Exception" is intentionally not a
// selectable status here - clsAttendanceStatus (backend) has no EXCEPTION value; exceptions are
// a separate tblattendance_exception record, not a tblattendance_day status - see completion report.
const lstStatuses = ["present", "half_day", "on_leave", "on_duty", "weekly_off", "holiday", "absent", "lwp"];
const setPunchlessStatuses = new Set(["on_leave", "lwp", "holiday", "weekly_off"]);
const strToday = new Date().toISOString().slice(0, 10);

const objPolicySchema: yup.ObjectSchema<AttendancePolicyFormValues> = yup.object({
  intCompanyID: yup.number().nullable().defined(), strPolicyCode: yup.string().trim().required().max(50),
  strPolicyName: yup.string().trim().required().max(150), strDescription: yup.string().nullable().defined().max(500),
  intLocationID: yup.number().nullable().defined(), intGradeID: yup.number().nullable().defined(), intEmploymentTypeID: yup.number().nullable().defined(),
  intLateGraceMinutes: yup.number().min(0).required(), intEarlyDepartureGraceMinutes: yup.number().min(0).required(),
  strInTime: yup.string().nullable().defined(), strOutTime: yup.string().nullable().defined(),
  decFullDayThresholdHours: yup.number().moreThan(0).max(24).required(), decHalfDayThresholdHours: yup.number().min(0).max(24).required(),
  decAbsentThresholdHours: yup.number().min(0).max(24).required(), blnInPunchRequired: yup.boolean().required(), blnOutPunchRequired: yup.boolean().required(),
  strMissingPunchTreatmentCode: yup.mixed<AttendancePolicyFormValues["strMissingPunchTreatmentCode"]>().oneOf(["EXCEPTION", "ABSENT", "HALF_DAY", "IGNORE"]).required(),
  intWorkHoursRoundingMinutes: yup.number().min(0).max(60).required(), blnOtEnabled: yup.boolean().required(), decOtMinHours: yup.number().min(0).max(24).required(),
  strLateDeductionRule: yup.string().nullable().defined().max(30), strWeeklyOffPattern: yup.string().matches(/^[01]{7}$/).required(),
  blnIsDefault: yup.boolean().required(), dtEffectiveFrom: yup.string().required(), dtEffectiveTo: yup.string().nullable().defined(),
  blnIsActive: yup.boolean().required(), strRemarks: yup.string().nullable().defined().max(500),
  lstTexts: yup.array().of(yup.object({ intLanguageID: yup.number().required(), strPolicyName: yup.string().required(), strDescription: yup.string().nullable().defined() })).defined(),
}).test("thresholds", "Threshold order must be Full Day ≥ Half Day ≥ Absent.", (objValue) => !objValue || (objValue.decFullDayThresholdHours >= objValue.decHalfDayThresholdHours && objValue.decHalfDayThresholdHours >= objValue.decAbsentThresholdHours))
  .test("dates", "Effective To cannot be before Effective From.", (objValue) => !objValue?.dtEffectiveTo || objValue.dtEffectiveTo >= objValue.dtEffectiveFrom)
  .test("in-out-time", "Out Time must be later than In Time.", (objValue) => !objValue?.strInTime || !objValue?.strOutTime || objValue.strOutTime > objValue.strInTime);

function getEmptyPolicy(): AttendancePolicyFormValues {
  return { intCompanyID: authHelpers.getCompanyID(), strPolicyCode: "", strPolicyName: "", strDescription: null, intLocationID: null, intGradeID: null, intEmploymentTypeID: null,
    intLateGraceMinutes: 0, intEarlyDepartureGraceMinutes: 0, strInTime: null, strOutTime: null, decFullDayThresholdHours: 8, decHalfDayThresholdHours: 4, decAbsentThresholdHours: 0,
    blnInPunchRequired: true, blnOutPunchRequired: true, strMissingPunchTreatmentCode: "EXCEPTION", intWorkHoursRoundingMinutes: 0,
    blnOtEnabled: false, decOtMinHours: 0, strLateDeductionRule: null, strWeeklyOffPattern: "0000011", blnIsDefault: false,
    dtEffectiveFrom: strToday, dtEffectiveTo: null, blnIsActive: true, strRemarks: null, lstTexts: [] };
}

function formatWorkedDuration(decHours?: number | null) {
  const intTotalMinutes = Math.max(0, Math.round(Number(decHours ?? 0) * 60));
  const intHours = Math.floor(intTotalMinutes / 60);
  const intMinutes = intTotalMinutes % 60;
  return `${intHours}h ${String(intMinutes).padStart(2, "0")}m`;
}

function formatTimeWithoutSeconds(strTime?: string | null) {
  return strTime ? strTime.slice(0, 5) : "";
}

function toSaveRow(objRow: DailyAttendanceRow): DailyAttendanceSaveRow {
  return { intEmployeeID: objRow.intEmployeeID, strStatus: objRow.strStatus ?? "absent", tmFirstIn: formatTimeWithoutSeconds(objRow.strFirstIn) || null, tmLastOut: formatTimeWithoutSeconds(objRow.strLastOut) || null,
    decWorkedHours: objRow.decWorkedHours, intLateMinutes: objRow.intLateMinutes, intEarlyMinutes: objRow.intEarlyMinutes, decOtHours: objRow.decOtHours, blnIsPaid: objRow.blnIsPaid, strRemark: objRow.strRemark };
}

const lstStatusLabels: Record<string, string> = { present: "Present", half_day: "Half Day", on_leave: "On Leave", on_duty: "On Duty", weekly_off: "Weekly Off", holiday: "Holiday", absent: "Absent", lwp: "LWP" };

type AttendancePocPanelProps = {
  strView: "policy" | "daily";
};

export default function AttendancePocPanel({ strView }: AttendancePocPanelProps) {
  const { t } = useModuleLabels("attendance", "Unable to load attendance labels.");
  const { blnLoading: blnRightsLoading, objRights } = useModuleActionAccess(["ATTENDANCE_POLICY", "DAILY_ATTENDANCE", "ATTENDANCE", "ATTENDANCE_MANAGEMENT"]);
  const { objPolicyList, lstDailyRows, blnLoading, blnSaving, strError, loadPolicies, getPolicy, savePolicy, loadDaily, bulkFillRange, saveOverride, finalizeAttendance, listPolicyAssignmentEmployees, listPolicyAssignmentHistory, assignAttendancePolicy } = useAttendancePoc(strView === "policy");
  const [strPolicyWorkspace, setStrPolicyWorkspace] = useState<"list" | "editor" | "assignment">("list");
  const [intPolicyID, setIntPolicyID] = useState<number | null>(null);
  const [blnPolicyViewMode, setBlnPolicyViewMode] = useState(false);
  const [strPolicySearch, setStrPolicySearch] = useState(""); const [strPolicyStatus, setStrPolicyStatus] = useState("");
  const [lstAssignmentEmployees, setLstAssignmentEmployees] = useState<AttendancePolicyAssignmentEmployee[]>([]);
  const [lstAssignmentHistory, setLstAssignmentHistory] = useState<AttendancePolicyAssignmentHistory[]>([]);
  const [lstPolicyUsageEmployees, setLstPolicyUsageEmployees] = useState<AttendancePolicyAssignmentEmployee[]>([]);
  const [lstSelectedEmployeeIDs, setLstSelectedEmployeeIDs] = useState<number[]>([]);
  const [strAssignmentSearch, setStrAssignmentSearch] = useState("");
  const [strAssignmentDepartment, setStrAssignmentDepartment] = useState("");
  const [strAssignmentStatus, setStrAssignmentStatus] = useState("Active");
  const [strAssignmentPolicyID, setStrAssignmentPolicyID] = useState("");
  const [strAssignmentEffectiveFrom, setStrAssignmentEffectiveFrom] = useState(strToday);
  const [strAssignmentEffectiveTo, setStrAssignmentEffectiveTo] = useState("");
  const [strAssignmentReason, setStrAssignmentReason] = useState("");
  const [blnAssignmentHistoryOpen, setBlnAssignmentHistoryOpen] = useState(false);
  const [lstDepartmentOptions, setLstDepartmentOptions] = useState<Array<[number, string]>>([]);
  const [lstLanguageOptions, setLstLanguageOptions] = useState<Array<{ intID: number; strLabel: string; strCode?: string | null }>>([]);
  const [blnPolicyTranslating, setBlnPolicyTranslating] = useState(false);
  const [strDate, setStrDate] = useState(strToday); const [strEmployeeSearch, setStrEmployeeSearch] = useState("");
  const [strDepartment, setStrDepartment] = useState(""); const [strLocation, setStrLocation] = useState("");
  const [lstEditableRows, setLstEditableRows] = useState<DailyAttendanceRow[]>([]);
  const [objToast, setObjToast] = useState({ blnOpen: false, strMessage: "", strSeverity: "success" as "success" | "error" });
  const [blnFillDialogOpen, setBlnFillDialogOpen] = useState(false); const [intFillEmployeeID, setIntFillEmployeeID] = useState<number | "">("");
  const [strFillFromDate, setStrFillFromDate] = useState(""); const [strFillToDate, setStrFillToDate] = useState("");
  const [strFillStatus, setStrFillStatus] = useState(""); const [blnFillSkipResolved, setBlnFillSkipResolved] = useState(true);
  const [blnFillOverwrite, setBlnFillOverwrite] = useState(false); const [blnFillSubmitting, setBlnFillSubmitting] = useState(false);
  const [objOverrideRow, setObjOverrideRow] = useState<DailyAttendanceRow | null>(null);
  const [strOverrideStatus, setStrOverrideStatus] = useState("present"); const [strOverrideFirstIn, setStrOverrideFirstIn] = useState("");
  const [strOverrideLastOut, setStrOverrideLastOut] = useState(""); const [strOverrideRemark, setStrOverrideRemark] = useState("");
  const [blnOverrideSubmitting, setBlnOverrideSubmitting] = useState(false);
  const [blnFinalizeConfirmOpen, setBlnFinalizeConfirmOpen] = useState(false); const [blnFinalizeSubmitting, setBlnFinalizeSubmitting] = useState(false);
  const [objFinalizeResult, setObjFinalizeResult] = useState<DailyAttendanceFinalizeResult | null>(null);
  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<AttendancePolicyFormValues>({ resolver: yupResolver(objPolicySchema) as Resolver<AttendancePolicyFormValues>, defaultValues: getEmptyPolicy() });
  const strPattern = watch("strWeeklyOffPattern"); const blnOtEnabled = watch("blnOtEnabled");

  const lstDepartmentsFromDailyRows = useMemo(() => Array.from(new Map(lstDailyRows.filter((objRow) => objRow.intDepartmentID).map((objRow) => [objRow.intDepartmentID, objRow.strDepartmentName])).entries()), [lstDailyRows]);
  const lstDepartments = lstDepartmentOptions.length > 0 ? lstDepartmentOptions : lstDepartmentsFromDailyRows;
  const lstLocations = useMemo(() => Array.from(new Map(lstDailyRows.filter((objRow) => objRow.intLocationID).map((objRow) => [objRow.intLocationID, objRow.strLocationName])).entries()), [lstDailyRows]);
  const lstFillEmployeeOptions = useMemo(() => Array.from(new Map(lstDailyRows.map((objRow) => [objRow.intEmployeeID, `${objRow.strEmployeeCode} - ${objRow.strEmployeeName}`])).entries()), [lstDailyRows]);

  useEffect(() => {
    if (strView !== "policy") return;
    let blnMounted = true;
    void Promise.allSettled([masterApiService.getDepartments(), masterApiService.getDepartmentFormOptions()])
      .then(([objDepartmentResult, objOptionResult]) => {
        if (!blnMounted) return;
        setLstDepartmentOptions(objDepartmentResult.status === "fulfilled" ? objDepartmentResult.value.Data.filter((objDepartment) => objDepartment.blnIsActive).map((objDepartment) => [objDepartment.intID, objDepartment.strDepartmentName]) : []);
        setLstLanguageOptions(objOptionResult.status === "fulfilled" ? objOptionResult.value.Data.lstLanguages : []);
      });
    return () => { blnMounted = false; };
  }, [strView]);

  useEffect(() => { setLstEditableRows(lstDailyRows); }, [lstDailyRows]);
  useEffect(() => { if (strView === "daily") void loadDaily({ strDate }); }, [loadDaily, strDate, strView]);

  function showToast(strMessage: string, strSeverity: "success" | "error") { setObjToast({ blnOpen: true, strMessage, strSeverity }); }
  async function loadPolicyUsage(intID: number | null) {
    if (!intID) {
      setLstAssignmentHistory([]);
      setLstPolicyUsageEmployees([]);
      return;
    }
    const [objHistoryResult, objEmployeeResult] = await Promise.allSettled([
      listPolicyAssignmentHistory({ intPolicyID: intID }),
      listPolicyAssignmentEmployees({ intCurrentPolicyID: intID, strEmployeeStatus: "All" }),
    ]);
    setLstAssignmentHistory(objHistoryResult.status === "fulfilled" ? objHistoryResult.value : []);
    setLstPolicyUsageEmployees(objEmployeeResult.status === "fulfilled" ? objEmployeeResult.value.filter((objEmployee) => objEmployee.intCurrentPolicyID === intID) : []);
  }
  async function openPolicy(intID: number | null, blnViewMode = false) {
    try {
      setIntPolicyID(intID);
      setBlnPolicyViewMode(blnViewMode);
      const objPolicy = intID ? await getPolicy(intID) : getEmptyPolicy();
      reset(objPolicy);
      await loadPolicyUsage(intID);
      setStrPolicyWorkspace("editor");
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : t("load_policy_failed", "Unable to load attendance policy."), "error");
    }
  }
  async function submitPolicy(objValues: AttendancePolicyFormValues) { try { await savePolicy(intPolicyID, { ...objValues, decOtMinHours: objValues.blnOtEnabled ? objValues.decOtMinHours : 0 }); setStrPolicyWorkspace("list"); await loadPolicies({ strSearch: strPolicySearch, blnIsActive: strPolicyStatus === "" ? undefined : strPolicyStatus === "active", intPage: 1, intPageSize: 10 }); showToast(t("policy_saved", "Attendance policy saved."), "success"); } catch (objError) { showToast(objError instanceof Error ? objError.message : t("save_failed", "Save failed."), "error"); } }
  async function openAssignment(intSelectedPolicyID: number | null) {
    setIntPolicyID(intSelectedPolicyID);
    setStrAssignmentPolicyID(intSelectedPolicyID ? String(intSelectedPolicyID) : "");
    setLstSelectedEmployeeIDs([]);
    setStrPolicyWorkspace("assignment");
    await loadAssignments(intSelectedPolicyID ? String(intSelectedPolicyID) : strAssignmentPolicyID);
  }
  async function loadAssignments(strPolicyFilter = strAssignmentPolicyID) {
    try {
      const lstEmployees = await listPolicyAssignmentEmployees({ strSearch: strAssignmentSearch, intDepartmentID: strAssignmentDepartment ? Number(strAssignmentDepartment) : undefined, intCurrentPolicyID: strPolicyFilter ? Number(strPolicyFilter) : undefined, strEmployeeStatus: strAssignmentStatus });
      setLstAssignmentEmployees(lstEmployees);
      try {
        setLstAssignmentHistory(await listPolicyAssignmentHistory({ intPolicyID: strPolicyFilter ? Number(strPolicyFilter) : undefined }));
      } catch {
        setLstAssignmentHistory([]);
      }
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : t("assignment_load_failed", "Unable to load assignments."), "error");
    }
  }
  async function submitAssignment() {
    if (!strAssignmentPolicyID || lstSelectedEmployeeIDs.length === 0) { showToast(t("assignment_required", "Select employees and an attendance policy."), "error"); return; }
    try {
      const objResult = await assignAttendancePolicy({ lstEmployeeIDs: lstSelectedEmployeeIDs, intAttendancePolicyID: Number(strAssignmentPolicyID), dtEffectiveFrom: strAssignmentEffectiveFrom, dtEffectiveTo: strAssignmentEffectiveTo || null, strAssignmentReason: strAssignmentReason || null, blnReplaceExisting: true });
      showToast(t("assignment_saved", `${objResult.intAssignedCount} employee assignments saved.`), "success");
      setLstAssignmentHistory(objResult.lstAssignments ?? []);
      await loadAssignments(strAssignmentPolicyID);
      await loadPolicies({ strSearch: strPolicySearch, blnIsActive: strPolicyStatus === "" ? undefined : strPolicyStatus === "active", intPage: 1, intPageSize: 10 });
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : t("assignment_failed", "Assignment failed."), "error");
    }
  }
  async function searchPolicies() { await loadPolicies({ strSearch: strPolicySearch, blnIsActive: strPolicyStatus === "" ? undefined : strPolicyStatus === "active", intPage: 1, intPageSize: 10 }); }
  async function searchDaily() { await loadDaily({ strDate, intDepartmentID: strDepartment ? Number(strDepartment) : undefined, intLocationID: strLocation ? Number(strLocation) : undefined, strSearch: strEmployeeSearch }); }
  async function clearPolicySearch() {
    setStrPolicySearch("");
    setStrPolicyStatus("");
    await loadPolicies({ intPage: 1, intPageSize: 10 });
  }
  async function clearDailySearch() {
    setStrDepartment("");
    setStrLocation("");
    setStrEmployeeSearch("");
    await loadDaily({ strDate });
  }
  function openOverrideDialog(objRow: DailyAttendanceRow) {
    setObjOverrideRow(objRow);
    setStrOverrideStatus(objRow.strStatus ?? "absent");
    setStrOverrideFirstIn(formatTimeWithoutSeconds(objRow.strFirstIn));
    setStrOverrideLastOut(formatTimeWithoutSeconds(objRow.strLastOut));
    setStrOverrideRemark("");
  }

  async function submitOverride() {
    if (!objOverrideRow) return;
    if (!strOverrideRemark.trim()) { showToast(t("override_reason_required", "An override reason is required."), "error"); return; }
    setBlnOverrideSubmitting(true);
    try {
      const objPayload = { ...toSaveRow(objOverrideRow), strStatus: strOverrideStatus, tmFirstIn: strOverrideFirstIn || null, tmLastOut: strOverrideLastOut || null, strRemark: strOverrideRemark.trim(), dtWorkDate: strDate };
      await saveOverride(objPayload);
      setObjOverrideRow(null);
      showToast(t("override_saved", "Attendance override saved."), "success");
      await searchDaily();
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : t("save_failed", "Save failed."), "error");
    } finally {
      setBlnOverrideSubmitting(false);
    }
  }

  async function submitFinalize() {
    setBlnFinalizeSubmitting(true);
    try {
      const objResult = await finalizeAttendance({ dtWorkDate: strDate, intDepartmentID: strDepartment ? Number(strDepartment) : undefined, intLocationID: strLocation ? Number(strLocation) : undefined });
      setBlnFinalizeConfirmOpen(false);
      setObjFinalizeResult(objResult);
      await searchDaily();
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : t("finalize_failed", "Unable to finalize attendance for the selected date."), "error");
    } finally {
      setBlnFinalizeSubmitting(false);
    }
  }

  function openFillDialog() {
    const objSelectedDate = new Date(`${strDate}T00:00:00`);
    const intYear = objSelectedDate.getFullYear(); const intMonth = objSelectedDate.getMonth();
    const toIso = (objDate: Date) => objDate.toISOString().slice(0, 10);
    setStrFillFromDate(toIso(new Date(intYear, intMonth, 1)));
    setStrFillToDate(toIso(new Date(intYear, intMonth + 1, 0)));
    setIntFillEmployeeID("");
    setStrFillStatus(""); setBlnFillSkipResolved(true); setBlnFillOverwrite(false);
    setBlnFillDialogOpen(true);
  }

  async function submitFillRange() {
    if (!intFillEmployeeID || !strFillFromDate || !strFillToDate || !strFillStatus) return;
    setBlnFillSubmitting(true);
    try {
      const objResult = await bulkFillRange({
        intEmployeeID: Number(intFillEmployeeID),
        dtFromDate: strFillFromDate,
        dtToDate: strFillToDate,
        strDefaultStatus: strFillStatus,
        blnSkipResolvedDays: blnFillSkipResolved,
        blnOverwriteExisting: blnFillOverwrite,
      });
      setBlnFillDialogOpen(false);
      const dicSkipReasonCounts: Record<string, number> = {};
      (objResult.lstSkipped ?? []).forEach((objSkip) => {
        dicSkipReasonCounts[objSkip.strReason] = (dicSkipReasonCounts[objSkip.strReason] ?? 0) + 1;
      });
      const strSkipBreakdown = Object.entries(dicSkipReasonCounts)
        .map(([strReason, intCount]) => `${intCount} ${t(`fill_skip_reason_${strReason}`, strReason.replaceAll("_", " "))}`)
        .join(", ");
      showToast(
        t(
          "generate_attendance_result",
          `${objResult.intCreatedCount} day(s) created${strSkipBreakdown ? `, ${objResult.intSkippedCount} skipped (${strSkipBreakdown})` : ""}.`,
        ),
        "success",
      );
      await searchDaily();
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : t("generate_attendance_failed", "Unable to generate attendance for the selected range."), "error");
    } finally {
      setBlnFillSubmitting(false);
    }
  }

  const nodeFillDialogContent = <Grid container spacing={1.5} sx={{ minWidth: { sm: 420 }, pt: 0.5 }}>
    <Grid item xs={12}>
      <TextField data-control-id="attendance.daily.fill-month.employee.select" select fullWidth label={t("employee", "Employee")} value={intFillEmployeeID} onChange={(objEvent) => setIntFillEmployeeID(Number(objEvent.target.value))}>
        {lstFillEmployeeOptions.map(([intID, strLabel]) => <MenuItem key={intID} value={intID ?? ""}>{strLabel}</MenuItem>)}
        {lstFillEmployeeOptions.length === 0 ? <MenuItem value="" disabled>{t("generate_attendance_no_employees", "Search and load employees for a date first.")}</MenuItem> : null}
      </TextField>
    </Grid>
    <Grid item xs={6}>
      <TextField data-control-id="attendance.daily.fill-month.from.input" type="date" fullWidth label={t("from_date", "From Date")} InputLabelProps={{ shrink: true }} value={strFillFromDate} onChange={(objEvent) => setStrFillFromDate(objEvent.target.value)} />
    </Grid>
    <Grid item xs={6}>
      <TextField data-control-id="attendance.daily.fill-month.to.input" type="date" fullWidth label={t("to_date", "To Date")} InputLabelProps={{ shrink: true }} value={strFillToDate} onChange={(objEvent) => setStrFillToDate(objEvent.target.value)} />
    </Grid>
    <Grid item xs={12}>
      <TextField data-control-id="attendance.daily.fill-month.status.select" select fullWidth label={t("default_status", "Default Status")} value={strFillStatus} onChange={(objEvent) => setStrFillStatus(objEvent.target.value)}>
        <MenuItem value="" disabled>{t("select_status", "Select status")}</MenuItem>
        {lstStatuses.map((strStatus) => <MenuItem key={strStatus} value={strStatus}>{t(`status_${strStatus}`, strStatus.replaceAll("_", " "))}</MenuItem>)}
      </TextField>
    </Grid>
    <Grid item xs={12}>
      <FormControlLabel control={<Checkbox data-control-id="attendance.daily.fill-month.skip-resolved.checkbox" checked={blnFillSkipResolved} onChange={(objEvent) => setBlnFillSkipResolved(objEvent.target.checked)} />} label={t("generate_attendance_skip_resolved", "Skip days already covered by approved leave, holiday, or weekly-off")} />
    </Grid>
    <Grid item xs={12}>
      <FormControlLabel control={<Checkbox data-control-id="attendance.daily.fill-month.overwrite.checkbox" checked={blnFillOverwrite} onChange={(objEvent) => setBlnFillOverwrite(objEvent.target.checked)} />} label={t("generate_attendance_overwrite", "Overwrite days that already have an attendance record")} />
    </Grid>
    <Grid item xs={12}>
      <Alert severity="info">{t("generate_attendance_notice", "Every remaining day in the range is marked with the default status above. Nothing here changes an approved leave, holiday, or weekly-off record.")}</Alert>
    </Grid>
  </Grid>;

  const lstManagementActions = Array.from(new Set([
    ...(objRights.dicAllowedActions.ATTENDANCE_MANAGEMENT ?? []),
    ...(objRights.dicAllowedActions.ATTENDANCE_POLICY ?? []),
    ...(objRights.dicAllowedActions.DAILY_ATTENDANCE ?? []),
    ...(objRights.dicAllowedActions.ATTENDANCE ?? []),
  ]));
  const setManagementActions = new Set(lstManagementActions.map((strAction) => strAction.trim().toLowerCase()));
  const blnCanView = ["view", "read", "list", "attendance_view"].some((strAction) => setManagementActions.has(strAction));
  const blnCanManage = ["manage", "add", "create", "edit", "update", "delete", "save", "attendance_manage"].some((strAction) => setManagementActions.has(strAction));
  const blnCanOverride = ["override", "attendance_correction"].some((strAction) => setManagementActions.has(strAction));
  if (blnRightsLoading) return <Box sx={{ display: "grid", placeItems: "center", py: 8 }}><CircularProgress /></Box>;
  if (!blnCanView) return <Alert severity="warning">{t("permission_denied", "Attendance Management access is not available for your user group. Sign in with an HR or Administrator account.")}</Alert>;
  const blnReadOnly = !blnCanManage;

  const lstPolicyTexts = watch("lstTexts") ?? [];
  const objCurrentPolicy = objPolicyList.lstItems.find((objPolicy) => objPolicy.intID === intPolicyID);
  const intPolicyHistoryCount = intPolicyID ? lstAssignmentHistory.filter((objHistory) => objHistory.intAttendancePolicyID === intPolicyID).length : 0;
  const intPolicyAssignedEmployeeCount = intPolicyID ? lstPolicyUsageEmployees.length : 0;
  const mapPolicyLanguages = new Map((lstLanguageOptions.length > 0 ? lstLanguageOptions : [{ intID: 1, strLabel: "English", strCode: "en" }, { intID: 2, strLabel: "Hindi", strCode: "hi" }]).map((objLanguage) => [objLanguage.intID, objLanguage]));
  lstPolicyTexts.forEach((objText) => {
    if (!mapPolicyLanguages.has(objText.intLanguageID)) mapPolicyLanguages.set(objText.intLanguageID, { intID: objText.intLanguageID, strLabel: `${t("language", "Language")} ${objText.intLanguageID}` });
  });
  const lstPolicyLanguageOptions = Array.from(mapPolicyLanguages.values());
  const intDefaultLanguageID = authHelpers.getLanguageID() ?? lstPolicyLanguageOptions.find((objLanguage) => objLanguage.strCode?.toLowerCase() === "en")?.intID ?? lstPolicyLanguageOptions[0]?.intID ?? 1;
  const objDefaultLanguage = lstPolicyLanguageOptions.find((objLanguage) => objLanguage.intID === intDefaultLanguageID) ?? lstPolicyLanguageOptions[0];
  const objLatestAssignment = lstAssignmentHistory.find((objHistory) => objHistory.intAttendancePolicyID === intPolicyID);
  const strAssignedEmployeePreview = lstPolicyUsageEmployees.slice(0, 3).map((objEmployee) => `${objEmployee.strEmployeeCode} - ${objEmployee.strEmployeeName}`).join(", ");
  const strHistoryEmployeePreview = lstAssignmentHistory.filter((objHistory) => objHistory.intAttendancePolicyID === intPolicyID).slice(0, 3).map((objHistory) => `${objHistory.strEmployeeCode ?? "-"} - ${objHistory.strEmployeeName ?? "-"}`).join(", ");
  const strUsageSummary = intPolicyAssignedEmployeeCount > 0
    ? t("assigned_employees_count", `${intPolicyAssignedEmployeeCount} assigned employee(s)`)
    : intPolicyHistoryCount > 0
      ? t("assignment_records_count", `${intPolicyHistoryCount} assignment history record(s)`)
      : objCurrentPolicy?.blnHasAssignmentsOrUsage
        ? t("assigned_or_used", "Assigned or Used")
        : t("not_assigned_or_used", "Not Assigned or Used");

  function addPolicyTranslation() {
    const setUsedLanguageIDs = new Set([intDefaultLanguageID, ...lstPolicyTexts.map((objText) => objText.intLanguageID)]);
    const objNextLanguage = lstPolicyLanguageOptions.find((objLanguage) => !setUsedLanguageIDs.has(objLanguage.intID));
    if (!objNextLanguage) return;
    setValue("lstTexts", [...lstPolicyTexts, { intLanguageID: objNextLanguage.intID, strPolicyName: "", strDescription: null }], { shouldDirty: true });
  }

  function updatePolicyTranslation(intIndex: number, strField: "intLanguageID" | "strPolicyName" | "strDescription", objValue: number | string | null) {
    setValue("lstTexts", lstPolicyTexts.map((objText, intRowIndex) => intRowIndex === intIndex ? { ...objText, [strField]: objValue } : objText), { shouldDirty: true });
  }

  async function translatePolicyText() {
    const intTargetLanguageID = lstPolicyTexts[0]?.intLanguageID ?? lstPolicyLanguageOptions.find((objLanguage) => objLanguage.intID !== intDefaultLanguageID)?.intID;
    if (!intTargetLanguageID) return;
    setBlnPolicyTranslating(true);
    try {
      const [objNameResult, objDescriptionResult] = await Promise.all([
        masterApiService.translateMasterText({ strText: watch("strPolicyName") || "", intSourceLanguageID: intDefaultLanguageID, intTargetLanguageID }),
        watch("strDescription") ? masterApiService.translateMasterText({ strText: watch("strDescription") || "", intSourceLanguageID: intDefaultLanguageID, intTargetLanguageID }) : Promise.resolve(null),
      ]);
      const intExistingIndex = lstPolicyTexts.findIndex((objText) => objText.intLanguageID === intTargetLanguageID);
      const objTranslatedRow = { intLanguageID: intTargetLanguageID, strPolicyName: objNameResult.Data.strTranslatedText, strDescription: objDescriptionResult?.Data.strTranslatedText ?? null };
      setValue("lstTexts", intExistingIndex >= 0 ? lstPolicyTexts.map((objText, intRowIndex) => intRowIndex === intExistingIndex ? objTranslatedRow : objText) : [...lstPolicyTexts, objTranslatedRow], { shouldDirty: true });
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : t("translation_failed", "Unable to translate policy text."), "error");
    } finally {
      setBlnPolicyTranslating(false);
    }
  }

  const nodeAssignmentHistoryContent = <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
    <Box sx={{ px: 2.5, pt: 2, pb: 0.5 }}>
      <Typography variant="body2" color="text.secondary">
        {t("assignment_history_help", "Review employee attendance policy changes with effective dates, source and reason.")}
      </Typography>
    </Box>
    <Box sx={{ mx: 2.5, mb: 2, border: "1px solid #d9e6ef", borderRadius: "10px", overflow: "hidden", backgroundColor: "#fff" }}>
      <Box sx={{ height: "min(68vh, 680px)", minHeight: { xs: 360, md: 460 }, overflow: "auto" }}>
        <Table stickyHeader size="small" className={styles.table} sx={{ minWidth: 860, "& th": { backgroundColor: "#f5f9fc", fontWeight: 800 }, "& td, & th": { whiteSpace: "nowrap" } }}>
          <TableHead><TableRow>{["Employee","Policy","Effective From","Effective To","Source","Reason"].map((strLabel) => <TableCell key={strLabel}>{t(`table_${strLabel.toLowerCase().replaceAll(" ","_")}`, strLabel)}</TableCell>)}</TableRow></TableHead>
          <TableBody>{lstAssignmentHistory.map((objHistory) => <TableRow key={objHistory.intID} hover><TableCell>{objHistory.strEmployeeName}</TableCell><TableCell>{objHistory.strPolicyName}</TableCell><TableCell>{objHistory.dtEffectiveFrom}</TableCell><TableCell>{objHistory.dtEffectiveTo ?? t("open_ended", "Open ended")}</TableCell><TableCell>{objHistory.strSourceType}</TableCell><TableCell sx={{ whiteSpace: "normal", minWidth: 220 }}>{objHistory.strAssignmentReason ?? ""}</TableCell></TableRow>)}{lstAssignmentHistory.length === 0 ? <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, color: "text.secondary", whiteSpace: "normal" }}>{t("no_assignment_history", "No assignment history found.")}</TableCell></TableRow> : null}</TableBody>
        </Table>
      </Box>
    </Box>
  </Box>;

  const nodePolicyForm = <Grid component="fieldset" disabled={blnPolicyViewMode} container spacing={1.5} sx={{
    m: 0,
    p: 0,
    border: 0,
    "& .MuiOutlinedInput-root": { borderRadius: "8px" },
    "& > .MuiGrid-item > .MuiPaper-root": {
      border: "1px solid #d9e6ef",
      borderRadius: "10px",
      boxShadow: "none",
      background: "rgba(247, 250, 253, 0.72)",
      p: 1.25,
    },
    "& > .MuiGrid-item > .MuiPaper-root > .MuiTypography-root:first-of-type": {
      color: "#173b63",
      borderBottom: "1px solid #d9e6ef",
      pb: 0.75,
      mb: 1,
    },
    "& .MuiFormControlLabel-root": { minHeight: 40, alignItems: "center" },
    "& .MuiTextField-root": { alignSelf: "start" },
  }}>
    <Grid item xs={12} lg={6}><Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}><Typography fontWeight={800} sx={{ mb: 1 }}>{t("general_information", "General Information")}</Typography><Grid container spacing={1}>
      <Grid item xs={12} md={4}><Controller name="strPolicyCode" control={control} render={({ field }) => <TextField {...field} data-control-id="attendance.policy.code.input" label={t("policy_code", "Policy Code")} required fullWidth disabled={intPolicyID !== null || blnPolicyViewMode} error={!!errors.strPolicyCode} helperText={errors.strPolicyCode?.message} />} /></Grid>
      <Grid item xs={12} md={8}><Controller name="strPolicyName" control={control} render={({ field }) => <TextField {...field} value={field.value ?? ""} data-control-id="attendance.policy.name.input" label={t("policy_name", "Policy Name")} required fullWidth error={!!errors.strPolicyName} helperText={errors.strPolicyName?.message} />} /></Grid>
      <Grid item xs={12}><Controller name="strDescription" control={control} render={({ field }) => <TextField {...field} value={field.value ?? ""} data-control-id="attendance.policy.description.input" label={t("description", "Description")} fullWidth />} /></Grid>
    </Grid></Paper></Grid>
    <Grid item xs={12} lg={6}><Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}><Typography fontWeight={800} sx={{ mb: 1 }}>{t("working_hour_rules", "Working Hour Rules")}</Typography><Grid container spacing={1}>
      <Grid item xs={12} md={6}><Controller name="strInTime" control={control} render={({ field }) => <TextField {...field} value={field.value ?? ""} data-control-id="attendance.policy.in-time.input" label={t("in_time", "Standard IN Time")} type="time" InputLabelProps={{ shrink: true }} fullWidth helperText={t("in_time_help", "Shift start — measures late punch-ins")} />} /></Grid>
      <Grid item xs={12} md={6}><Controller name="strOutTime" control={control} render={({ field }) => <TextField {...field} value={field.value ?? ""} data-control-id="attendance.policy.out-time.input" label={t("out_time", "Standard OUT Time")} type="time" InputLabelProps={{ shrink: true }} fullWidth helperText={t("out_time_help", "Shift end — measures early punch-outs and same-day finalization eligibility")} />} /></Grid>
      {([["decFullDayThresholdHours","full_day_threshold","Full-Day Threshold"],["decHalfDayThresholdHours","half_day_threshold","Half-Day Threshold"],["decAbsentThresholdHours","absent_threshold","Absent Threshold"]] as const).map(([strName,strKey,strLabel]) => <Grid item xs={12} sm={4} key={strName}><Controller name={strName} control={control} render={({ field }) => <TextField {...field} data-control-id={`attendance.policy.${strName}.input`} label={t(strKey,strLabel)} type="number" fullWidth error={!!errors[strName]} inputProps={{ min: 0, step: .25 }} />} /></Grid>)}
    </Grid>{errors.root?.message ? <Alert severity="error" sx={{ mt: 1 }}>{errors.root.message}</Alert> : null}</Paper></Grid>
    <Grid item xs={12} lg={6}><Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}><Typography fontWeight={800} sx={{ mb: 1 }}>{t("punch_exception_rules", "Punch and Exception Rules")}</Typography><Grid container spacing={1}>
      <Grid item xs={12}><Alert severity="info" data-control-id="attendance.policy.punch-rule.note" sx={{ py: 0.75 }}>{t("punch_rule_note", "Both IN and OUT punches are required on a normal working day. If both punches are missing after attendance finalization, the day is marked Absent. If exactly one punch is missing, an Attendance Exception is created for regularization.")}</Alert></Grid>
      <Grid item xs={12}><Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
        <Controller name="intLateGraceMinutes" control={control} render={({ field }) => <TextField {...field} data-control-id="attendance.policy.late-grace.input" label={t("late_grace", "Late Grace (min)")} type="number" sx={{ width: 100 }} />} />
        <Controller name="intEarlyDepartureGraceMinutes" control={control} render={({ field }) => <TextField {...field} data-control-id="attendance.policy.early-grace.input" label={t("early_grace", "Early Grace (min)")} type="number" sx={{ width: 100 }} />} />
        <Controller name="intWorkHoursRoundingMinutes" control={control} render={({ field }) => <TextField {...field} data-control-id="attendance.policy.rounding.input" label={t("rounding", "Rounding (min)")} type="number" sx={{ width: 100 }} />} />
        <Controller name="strMissingPunchTreatmentCode" control={control} render={({ field }) => <TextField {...field} data-control-id="attendance.policy.missing-punch.select" select label={t("missing_punch", "Missing-punch Treatment")} sx={{ minWidth: 160, flex: "1 1 160px" }}>{([["EXCEPTION","Creates attendance exception"],["ABSENT","Mark as Absent"],["HALF_DAY","Mark as Half Day"],["IGNORE","Ignore"]] as const).map(([strValue, strFallback]) => <MenuItem key={strValue} value={strValue}>{t(`missing_${strValue.toLowerCase()}`, strFallback)}</MenuItem>)}</TextField>} />
        <Controller name="blnInPunchRequired" control={control} render={({ field }) => <Box sx={{ border: "1px solid #d9e6ef", borderRadius: "9px", px: 0.75, height: 48, display: "flex", alignItems: "center", flex: "0 0 auto" }}><FormControlLabel control={<Switch size="small" data-control-id="attendance.policy.in-required.switch" checked={field.value} onChange={field.onChange} />} label={t("in_required", "IN Req.")} sx={{ m: 0, whiteSpace: "nowrap", "& .MuiFormControlLabel-label": { fontSize: 13 } }} /></Box>} />
        <Controller name="blnOutPunchRequired" control={control} render={({ field }) => <Box sx={{ border: "1px solid #d9e6ef", borderRadius: "9px", px: 0.75, height: 48, display: "flex", alignItems: "center", flex: "0 0 auto" }}><FormControlLabel control={<Switch size="small" data-control-id="attendance.policy.out-required.switch" checked={field.value} onChange={field.onChange} />} label={t("out_required", "OUT Req.")} sx={{ m: 0, whiteSpace: "nowrap", "& .MuiFormControlLabel-label": { fontSize: 13 } }} /></Box>} />
      </Box></Grid>
    </Grid></Paper></Grid>
    <Grid item xs={12} lg={6}><Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}><Typography fontWeight={800} sx={{ mb: 1 }}>{t("weekly_off_overtime", "Weekly Off and Overtime")}</Typography><Grid container spacing={1}>
      <Grid item xs={12} md={4}><Controller name="blnOtEnabled" control={control} render={({ field }) => <Box sx={{ border: "1px solid #d9e6ef", borderRadius: "9px", px: 1.25, height: 48, display: "flex", alignItems: "center" }}><FormControlLabel control={<Switch data-control-id="attendance.policy.ot.switch" checked={field.value} onChange={field.onChange} />} label={t("overtime_enabled", "Overtime")} sx={{ m: 0 }} /></Box>} /></Grid>
      <Grid item xs={12} md={4}><Controller name="decOtMinHours" control={control} render={({ field }) => <TextField {...field} data-control-id="attendance.policy.ot-min.input" disabled={!blnOtEnabled} label={t("minimum_overtime", "Minimum OT Hours")} type="number" fullWidth />} /></Grid>
      <Grid item xs={12} md={4}><Box sx={{ border: "1px solid #d9e6ef", borderRadius: "9px", px: 1.25, height: 48, display: "flex", alignItems: "center", overflow: "hidden" }}><Typography variant="caption" color="text.secondary" noWrap>{t("weekly_off_preview", "Weekly off")}: {lstWeekdays.filter((_,intIndex) => strPattern[intIndex] === "1").join(", ") || t("none", "None")}</Typography></Box></Grid>
      <Grid item xs={12}><Box sx={{ border: "1px solid #d9e6ef", borderRadius: "9px", px: 1.25, py: 0.75, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.5 }}>{lstWeekdays.map((strDay,intIndex) => <FormControlLabel sx={{ mr: 1 }} key={strDay} control={<Checkbox size="small" data-control-id={`attendance.policy.weekly-off.${intIndex}.checkbox`} checked={strPattern[intIndex] === "1"} onChange={(objEvent) => { const lstPattern = strPattern.split(""); lstPattern[intIndex] = objEvent.target.checked ? "1" : "0"; setValue("strWeeklyOffPattern", lstPattern.join(""), { shouldDirty: true }); }} />} label={t(`weekday_${strDay.toLowerCase()}`,strDay)} />)}</Box></Grid>
    </Grid></Paper></Grid>
    <Grid item xs={12} lg={6}><Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}><Typography fontWeight={800} sx={{ mb: 1 }}>{t("effective_dates_status", "Effective Dates and Status")}</Typography><Grid container spacing={1} alignItems="center"><Grid item xs={12} md={6}><Controller name="dtEffectiveFrom" control={control} render={({ field }) => <TextField {...field} data-control-id="attendance.policy.effective-from.input" type="date" label={t("effective_from", "Effective From")} InputLabelProps={{ shrink: true }} fullWidth />} /></Grid><Grid item xs={12} md={6}><Controller name="dtEffectiveTo" control={control} render={({ field }) => <TextField {...field} value={field.value ?? ""} data-control-id="attendance.policy.effective-to.input" type="date" label={t("effective_to", "Effective To")} InputLabelProps={{ shrink: true }} fullWidth />} /></Grid><Grid item xs={12}><Stack direction="row" flexWrap="wrap"><Controller name="blnIsDefault" control={control} render={({ field }) => <FormControlLabel control={<Switch data-control-id="attendance.policy.default.switch" checked={field.value} onChange={field.onChange} />} label={t("default_policy", "Default")} />} /><Controller name="blnIsActive" control={control} render={({ field }) => <FormControlLabel control={<Switch data-control-id="attendance.policy.active.switch" checked={field.value} onChange={field.onChange} />} label={t("active", "Active")} />} /></Stack></Grid><Grid item xs={12}><Controller name="strRemarks" control={control} render={({ field }) => <TextField {...field} value={field.value ?? ""} data-control-id="attendance.policy.remarks.input" label={t("remarks", "Remarks")} fullWidth />} /></Grid></Grid></Paper></Grid>
    <Grid item xs={12} lg={6}><Paper variant="outlined" sx={{ p: 1.5, minHeight: 245 }}><Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5, mb: 1 }}><Box><Typography fontWeight={800}>{t("multilingual_text", "Multilingual Text")}</Typography><Typography variant="body2" color="text.secondary">{t("policy_translation_help", "Add translated attendance policy names and descriptions for supported languages.")}</Typography></Box><Stack direction="row" spacing={1}><Button data-control-id="attendance.policy.translation.add.button" className={styles.secondaryButton} startIcon={<AddRoundedIcon />} disabled={blnPolicyViewMode || lstPolicyTexts.length + 1 >= lstPolicyLanguageOptions.length} onClick={addPolicyTranslation}>{t("add_language", "Add Language")}</Button><Button data-control-id="attendance.policy.translation.ai.button" className={styles.primaryButton} disabled={blnPolicyViewMode || blnPolicyTranslating || !watch("strPolicyName")} onClick={() => void translatePolicyText()}>{blnPolicyTranslating ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : t("ai_translate", "AI Translate")}</Button></Stack></Box><Box sx={{ display: "grid", gap: 1.2 }}><Box sx={{ display: "grid", gap: 1.2, gridTemplateColumns: { xs: "1fr", md: "minmax(0,.8fr) minmax(0,1.1fr) minmax(0,1.2fr)" }, border: "1px solid #d9e6ef", borderRadius: "12px", p: 1.2, backgroundColor: "#f8fafc" }}><TextField data-control-id="attendance.policy.translation.base.language.input" label={t("language", "Language")} value={objDefaultLanguage?.strLabel ?? t("english", "English")} disabled fullWidth /><Controller name="strPolicyName" control={control} render={({ field }) => <TextField {...field} value={field.value ?? ""} data-control-id="attendance.policy.translation.base.name.input" label={t("policy_name", "Policy Name")} disabled={blnPolicyViewMode} fullWidth />} /><Controller name="strDescription" control={control} render={({ field }) => <TextField {...field} value={field.value ?? ""} data-control-id="attendance.policy.translation.base.description.input" label={t("description", "Description")} disabled={blnPolicyViewMode} fullWidth />} /></Box>{lstPolicyTexts.map((objText, intIndex) => <Box key={`${objText.intLanguageID}-${intIndex}`} sx={{ display: "grid", gap: 1.2, gridTemplateColumns: { xs: "1fr", md: "minmax(0,.8fr) minmax(0,1.1fr) minmax(0,1.2fr)" }, border: "1px solid #d9e6ef", borderRadius: "12px", p: 1.2, backgroundColor: "#f8fafc" }}><TextField data-control-id={`attendance.policy.translation.${intIndex}.language.select`} select label={t("language", "Language")} value={objText.intLanguageID} onChange={(objEvent) => updatePolicyTranslation(intIndex, "intLanguageID", Number(objEvent.target.value))} disabled={blnPolicyViewMode} fullWidth>{lstPolicyLanguageOptions.filter((objLanguage) => objLanguage.intID === objText.intLanguageID || (objLanguage.intID !== intDefaultLanguageID && !lstPolicyTexts.some((objExisting, intExistingIndex) => intExistingIndex !== intIndex && objExisting.intLanguageID === objLanguage.intID))).map((objLanguage) => <MenuItem key={objLanguage.intID} value={objLanguage.intID}>{objLanguage.strLabel}</MenuItem>)}</TextField><TextField data-control-id={`attendance.policy.translation.${intIndex}.name.input`} label={t("policy_name", "Policy Name")} value={objText.strPolicyName ?? ""} onChange={(objEvent) => updatePolicyTranslation(intIndex, "strPolicyName", objEvent.target.value)} disabled={blnPolicyViewMode} fullWidth /><TextField data-control-id={`attendance.policy.translation.${intIndex}.description.input`} label={t("description", "Description")} value={objText.strDescription ?? ""} onChange={(objEvent) => updatePolicyTranslation(intIndex, "strDescription", objEvent.target.value || null)} disabled={blnPolicyViewMode} fullWidth /></Box>)}</Box></Paper></Grid>
    <Grid item xs={12} lg={6}><Paper variant="outlined" sx={{ p: 1.5, minHeight: 245 }}><Typography fontWeight={800} sx={{ mb: 1 }}>{t("usage_information", "Usage Information")}</Typography><Box sx={{ border: "1px solid #d9e6ef", borderRadius: "12px", p: 1.5, backgroundColor: "#fff", minHeight: 156 }}><Typography variant="caption" color="text.secondary">{t("assignment_usage", "Assignment / Usage")}</Typography><Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mt: 0.75, mb: 1 }}><Chip size="small" label={watch("blnIsActive") ? t("active", "Active") : t("inactive", "Inactive")} color={watch("blnIsActive") ? "success" : "default"} /><Chip size="small" label={watch("blnIsDefault") ? t("company_default_policy", "Company Default") : t("employee_specific_policy", "Employee Specific")} color={watch("blnIsDefault") ? "primary" : "default"} /></Stack><Typography sx={{ fontWeight: 900, fontSize: 20 }}>{strUsageSummary}</Typography>{intPolicyAssignedEmployeeCount > 0 ? <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{t("current_employees", "Current employees")}: {strAssignedEmployeePreview}{intPolicyAssignedEmployeeCount > 3 ? ` +${intPolicyAssignedEmployeeCount - 3}` : ""}</Typography> : intPolicyHistoryCount > 0 ? <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{t("assigned_employees", "Assigned employees")}: {strHistoryEmployeePreview}{intPolicyHistoryCount > 3 ? ` +${intPolicyHistoryCount - 3}` : ""}</Typography> : objLatestAssignment ? <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{t("latest_assignment", "Latest assignment")}: {objLatestAssignment.strEmployeeName ?? objLatestAssignment.strEmployeeCode ?? "-"} | {objLatestAssignment.dtEffectiveFrom} - {objLatestAssignment.dtEffectiveTo ?? t("open_ended", "Open ended")}</Typography> : null}</Box></Paper></Grid>
  </Grid>;

  if (strView === "policy") {
    const blnAllSelected = lstAssignmentEmployees.length > 0 && lstAssignmentEmployees.every((objEmployee) => lstSelectedEmployeeIDs.includes(objEmployee.intEmployeeID));
    const nodeToast = <Snackbar data-control-id="attendance.notification" open={objToast.blnOpen} autoHideDuration={5000} onClose={() => setObjToast((objCurrent) => ({ ...objCurrent, blnOpen: false }))}><Alert severity={objToast.strSeverity}>{objToast.strMessage}</Alert></Snackbar>;
    if (strPolicyWorkspace === "editor") return <Box className={styles.page} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "9px !important" }, "& .MuiInputBase-root": { minHeight: 48 }, "& .MuiAlert-root": { borderRadius: "9px !important" } }}>
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      <Box className={styles.tableCard} sx={{ minHeight: 0 }}><Box className={styles.tableHeaderActions} style={{ justifyContent: "flex-end" }}><Button data-control-id="attendance.policy.editor.back.button" className={styles.secondaryButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => setStrPolicyWorkspace("list")}>{t("back", "Back")}</Button>{!blnPolicyViewMode ? <Button data-control-id="attendance.policy.editor.save.button" className={styles.primaryButton} startIcon={<SaveRoundedIcon />} disabled={blnSaving || blnReadOnly} onClick={() => void handleSubmit(submitPolicy)()}>{t("save", "Save")}</Button> : null}</Box><Box sx={{ flex: "1 1 auto", minHeight: 0, overflowX: "hidden", overflowY: "auto", pr: 0.5, scrollbarGutter: "stable" }}>{nodePolicyForm}</Box></Box>{nodeToast}</Box>;
    if (strPolicyWorkspace === "assignment") return <Box className={styles.page} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "9px !important" }, "& .MuiInputBase-root": { minHeight: 48 }, "& .MuiAlert-root": { borderRadius: "9px !important" } }}>
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      <Box className={styles.controlsCard}><Box className={styles.searchRow} sx={{ gridTemplateColumns: "minmax(220px,1fr) minmax(170px,.55fr) minmax(190px,.65fr) minmax(150px,.45fr) auto auto !important" }}><TextField data-control-id="attendance.assignment.search.input" value={strAssignmentSearch} onChange={(objEvent) => setStrAssignmentSearch(objEvent.target.value)} placeholder={t("search_employee", "Search Employee")} size="small" /><TextField data-control-id="attendance.assignment.department.select" select label={t("department", "Department")} value={strAssignmentDepartment} onChange={(objEvent) => setStrAssignmentDepartment(objEvent.target.value)} size="small"><MenuItem value="">{t("all", "All")}</MenuItem>{lstDepartments.map(([intID, strName]) => <MenuItem key={intID} value={intID ?? ""}>{strName}</MenuItem>)}</TextField><TextField data-control-id="attendance.assignment.current-policy.select" select label={t("current_policy", "Current Policy")} value={strAssignmentPolicyID} onChange={(objEvent) => setStrAssignmentPolicyID(objEvent.target.value)} size="small"><MenuItem value="">{t("all", "All")}</MenuItem>{objPolicyList.lstItems.map((objPolicy) => <MenuItem key={objPolicy.intID} value={objPolicy.intID}>{objPolicy.strPolicyName}</MenuItem>)}</TextField><TextField data-control-id="attendance.assignment.status.select" select label={t("employee_status", "Employee Status")} value={strAssignmentStatus} onChange={(objEvent) => setStrAssignmentStatus(objEvent.target.value)} size="small">{["Active", "Inactive", "All"].map((strStatus) => <MenuItem key={strStatus} value={strStatus}>{t(`employee_status_${strStatus.toLowerCase()}`, strStatus)}</MenuItem>)}</TextField><Button data-control-id="attendance.assignment.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => void loadAssignments()}>{t("search", "Search")}</Button><Button data-control-id="attendance.assignment.back.button" className={styles.secondaryButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => setStrPolicyWorkspace("list")}>{t("back", "Back")}</Button></Box></Box>
      <Box className={styles.tableCard}><Box className={styles.tableHeaderActions}><TextField data-control-id="attendance.assignment.policy.select" select label={t("attendance_policy", "Attendance Policy")} value={strAssignmentPolicyID} onChange={(objEvent) => setStrAssignmentPolicyID(objEvent.target.value)} size="small" sx={{ minWidth: 240 }}>{objPolicyList.lstItems.filter((objPolicy) => objPolicy.blnIsActive).map((objPolicy) => <MenuItem key={objPolicy.intID} value={objPolicy.intID}>{objPolicy.strPolicyName}</MenuItem>)}</TextField><TextField data-control-id="attendance.assignment.effective-from.input" type="date" label={t("effective_from", "Effective From")} InputLabelProps={{ shrink: true }} value={strAssignmentEffectiveFrom} onChange={(objEvent) => setStrAssignmentEffectiveFrom(objEvent.target.value)} size="small" /><TextField data-control-id="attendance.assignment.effective-to.input" type="date" label={t("effective_to_optional", "Effective To")} InputLabelProps={{ shrink: true }} value={strAssignmentEffectiveTo} onChange={(objEvent) => setStrAssignmentEffectiveTo(objEvent.target.value)} size="small" /><TextField data-control-id="attendance.assignment.reason.input" label={t("assignment_reason", "Assignment Reason")} value={strAssignmentReason} onChange={(objEvent) => setStrAssignmentReason(objEvent.target.value)} size="small" sx={{ minWidth: 240 }} /><Button data-control-id="attendance.assignment.save.button" className={styles.primaryButton} startIcon={<GroupAddRoundedIcon />} disabled={blnReadOnly || blnSaving || lstSelectedEmployeeIDs.length === 0 || !strAssignmentPolicyID} onClick={() => void submitAssignment()}>{t("assign_employees", "Assign Employees")}</Button><Button data-control-id="attendance.assignment.history.button" className={styles.secondaryButton} startIcon={<HistoryRoundedIcon />} onClick={() => setBlnAssignmentHistoryOpen(true)}>{t("assignment_history", "Assignment History")}</Button></Box><Box className={styles.tableWrap}><Table size="small" className={styles.table} sx={{ minWidth: 1100 }}><TableHead><TableRow>{["Select","Employee Code","Employee Name","Department","Status","Current Policy","Current From","Current To"].map((strLabel, intIndex) => <TableCell key={strLabel}>{intIndex === 0 ? <Checkbox data-control-id="attendance.assignment.select-all.checkbox" checked={blnAllSelected} indeterminate={lstSelectedEmployeeIDs.length > 0 && !blnAllSelected} onChange={(objEvent) => setLstSelectedEmployeeIDs(objEvent.target.checked ? lstAssignmentEmployees.map((objEmployee) => objEmployee.intEmployeeID) : [])} /> : t(`table_${strLabel.toLowerCase().replaceAll(" ","_")}`, strLabel)}</TableCell>)}</TableRow></TableHead><TableBody>{lstAssignmentEmployees.map((objEmployee) => <TableRow key={objEmployee.intEmployeeID} hover><TableCell><Checkbox data-control-id={`attendance.assignment.employee.${objEmployee.intEmployeeID}.checkbox`} checked={lstSelectedEmployeeIDs.includes(objEmployee.intEmployeeID)} onChange={(objEvent) => setLstSelectedEmployeeIDs((lstCurrent) => objEvent.target.checked ? [...lstCurrent, objEmployee.intEmployeeID] : lstCurrent.filter((intID) => intID !== objEmployee.intEmployeeID))} /></TableCell><TableCell>{objEmployee.strEmployeeCode}</TableCell><TableCell>{objEmployee.strEmployeeName}</TableCell><TableCell>{objEmployee.strDepartmentName ?? ""}</TableCell><TableCell>{objEmployee.strEmployeeStatus}</TableCell><TableCell>{objEmployee.strCurrentPolicyName ?? t("company_default", "Company Default")}</TableCell><TableCell>{objEmployee.dtCurrentEffectiveFrom ?? ""}</TableCell><TableCell>{objEmployee.dtCurrentEffectiveTo ?? ""}</TableCell></TableRow>)}{!blnLoading && lstAssignmentEmployees.length === 0 ? <TableRow><TableCell colSpan={8} align="center">{t("no_assignment_employees", "No employees found.")}</TableCell></TableRow> : null}</TableBody></Table></Box>{blnLoading ? <Box sx={{ p: 3, textAlign: "center" }}><CircularProgress /></Box> : null}</Box><CommonMasterDialog blnOpen={blnAssignmentHistoryOpen} strTitle={t("assignment_history", "Assignment History")} nodeContent={nodeAssignmentHistoryContent} strSecondaryLabel={t("close", "Close")} onClose={() => setBlnAssignmentHistoryOpen(false)} blnHidePrimary maxWidth={false} paperSx={{ width: "calc(100vw - 120px)", maxWidth: "1440px", minWidth: { md: "1120px" }, height: "min(86vh, 860px)", borderRadius: "20px", overflow: "hidden" }} rootControlId="attendance.assignment.history.dialog" cancelButtonControlId="attendance.assignment.history.dialog.close.button" titleSx={{ px: 3, py: 2, fontWeight: 900, borderBottom: "1px solid #d9e6ef", backgroundColor: "#f8fbfe" }} contentSx={{ p: 0, overflow: "hidden", backgroundColor: "#fbfdff" }} />{nodeToast}</Box>;
    return <Box className={styles.page} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "9px !important" }, "& .MuiInputBase-root": { minHeight: 48 }, "& .MuiAlert-root": { borderRadius: "9px !important" } }}>
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      <Box className={styles.controlsCard}><Box className={styles.searchRow} sx={{ gridTemplateColumns: "minmax(280px, 1fr) minmax(190px, .35fr) auto auto !important" }}><TextField data-control-id="attendance.policy.search.input" value={strPolicySearch} onChange={(objEvent) => setStrPolicySearch(objEvent.target.value)} placeholder={t("search_policy", "Search Code or Name")} size="small" /><TextField data-control-id="attendance.policy.status.select" select value={strPolicyStatus} onChange={(objEvent) => setStrPolicyStatus(objEvent.target.value)} label={t("status", "Status")} size="small"><MenuItem value="">{t("all", "All")}</MenuItem><MenuItem value="active">{t("active", "Active")}</MenuItem><MenuItem value="inactive">{t("inactive", "Inactive")}</MenuItem></TextField><Box className={styles.searchActions}><Button data-control-id="attendance.policy.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => void searchPolicies()}>{t("search", "Search")}</Button></Box><Box className={styles.searchActions}><Button data-control-id="attendance.policy.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => void clearPolicySearch()}>{t("clear", "Clear")}</Button></Box></Box></Box>
      <Box className={styles.tableCard}><Box className={styles.tableHeaderActions}><Button data-control-id="attendance.policy.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} disabled={blnReadOnly} onClick={() => void openPolicy(null)}>{t("add_policy", "Add Policy")}</Button><Button data-control-id="attendance.policy.assign.button" className={styles.secondaryButton} startIcon={<GroupAddRoundedIcon />} disabled={blnReadOnly} onClick={() => void openAssignment(null)}>{t("assign_employees", "Assign Employees")}</Button></Box><Box className={styles.tableWrap}><Table className={styles.table}><TableHead><TableRow>{["Actions","Code","Policy Name","Full Day","Half Day","Effective From","Default","Status"].map((strLabel) => <TableCell key={strLabel}>{t(`table_${strLabel.toLowerCase().replaceAll(" ","_")}`,strLabel)}</TableCell>)}</TableRow></TableHead><TableBody>{objPolicyList.lstItems.map((objPolicy) => <TableRow key={objPolicy.intID} hover><TableCell><Stack direction="row" spacing={0.5} alignItems="center"><IconButton data-control-id={`attendance.policy.${objPolicy.intID}.view.button`} aria-label={t("view_policy", "View attendance policy")} onClick={() => void openPolicy(objPolicy.intID, true)} sx={{ p: 0.5, color: "#2563eb", "& .MuiSvgIcon-root": { fontSize: 20 } }}><VisibilityRoundedIcon /></IconButton><IconButton data-control-id={`attendance.policy.${objPolicy.intID}.edit.button`} aria-label={t("edit_policy", "Edit attendance policy")} disabled={blnReadOnly} onClick={() => void openPolicy(objPolicy.intID)} sx={{ p: 0.5, color: "#17639b", "& .MuiSvgIcon-root": { fontSize: 20 } }}><EditRoundedIcon /></IconButton><IconButton data-control-id={`attendance.policy.${objPolicy.intID}.assign.button`} aria-label={t("assign_employees", "Assign employees")} disabled={blnReadOnly} onClick={() => void openAssignment(objPolicy.intID)} sx={{ p: 0.5, color: "#0f766e", "& .MuiSvgIcon-root": { fontSize: 20 } }}><GroupAddRoundedIcon /></IconButton></Stack></TableCell><TableCell>{objPolicy.strPolicyCode}</TableCell><TableCell>{objPolicy.strPolicyName}</TableCell><TableCell>{objPolicy.decFullDayThresholdHours}</TableCell><TableCell>{objPolicy.decHalfDayThresholdHours}</TableCell><TableCell>{objPolicy.dtEffectiveFrom}</TableCell><TableCell>{objPolicy.blnIsDefault ? t("yes","Yes") : t("no","No")}</TableCell><TableCell><Chip size="small" color={objPolicy.blnIsActive ? "success" : "default"} label={objPolicy.blnIsActive ? t("active", "Active") : t("inactive", "Inactive")} /></TableCell></TableRow>)}{!blnLoading && objPolicyList.lstItems.length === 0 ? <TableRow><TableCell colSpan={8} align="center">{t("no_policies","No attendance policies found.")}</TableCell></TableRow> : null}</TableBody></Table></Box>{blnLoading ? <Box sx={{ p: 3, textAlign: "center" }}><CircularProgress /></Box> : null}</Box>{nodeToast}</Box>;
  }

  return <Box className={styles.page} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "9px !important" }, "& .MuiInputBase-root": { minHeight: 48 }, "& .MuiAlert-root": { borderRadius: "9px !important" } }}>
    {strError ? <Alert severity="error">{strError}</Alert> : null}
    <>
      <Box className={styles.controlsCard}><Box className={styles.searchRow} sx={{ gridTemplateColumns: "165px minmax(190px,.65fr) minmax(190px,.65fr) minmax(260px,1.3fr) auto auto !important" }}><TextField data-control-id="attendance.daily.date.input" type="date" InputLabelProps={{ shrink: true }} label={t("date","Date")} value={strDate} onChange={(objEvent) => setStrDate(objEvent.target.value)} size="small" /><TextField data-control-id="attendance.daily.department.select" select label={t("department","Department")} value={strDepartment} onChange={(objEvent) => setStrDepartment(objEvent.target.value)} size="small"><MenuItem value="">{t("all","All")}</MenuItem>{lstDepartments.map(([intID,strName]) => <MenuItem key={intID} value={intID ?? ""}>{strName}</MenuItem>)}</TextField><TextField data-control-id="attendance.daily.location.select" select label={t("location","Location")} value={strLocation} onChange={(objEvent) => setStrLocation(objEvent.target.value)} size="small"><MenuItem value="">{t("all","All")}</MenuItem>{lstLocations.map(([intID,strName]) => <MenuItem key={intID} value={intID}>{strName}</MenuItem>)}</TextField><TextField data-control-id="attendance.daily.employee-search.input" placeholder={t("employee_search","Employee Code or Name")} value={strEmployeeSearch} onChange={(objEvent) => setStrEmployeeSearch(objEvent.target.value)} size="small" /><Box className={styles.searchActions}><Button data-control-id="attendance.daily.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => void searchDaily()}>{t("search","Search")}</Button></Box><Box className={styles.searchActions}><Button data-control-id="attendance.daily.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => void clearDailySearch()}>{t("clear","Clear")}</Button></Box></Box><Alert severity="info" sx={{ mt: 1 }}>{t("cross_midnight_notice","Cross-midnight attendance is outside the current POC and will be rejected.")}</Alert>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mt: 1, px: 0.5 }}>
          {([
            ["total_employees", "Total Employees", lstEditableRows.length],
            ["present", "Present", lstEditableRows.filter((objRow) => objRow.strStatus === "present").length],
            ["half_day", "Half Day", lstEditableRows.filter((objRow) => objRow.strStatus === "half_day").length],
            ["leave", "Leave", lstEditableRows.filter((objRow) => objRow.strStatus === "on_leave" || objRow.strStatus === "lwp").length],
            ["absent", "Absent", lstEditableRows.filter((objRow) => objRow.strStatus === "absent").length],
            ["weekly_off_holiday", "Weekly Off / Holiday", lstEditableRows.filter((objRow) => objRow.strStatus === "weekly_off" || objRow.strStatus === "holiday").length],
          ] as const).map(([strKey, strLabel, intCount]) => (
            <Box key={strKey} sx={{ textAlign: "center", minWidth: 84 }}>
              <Typography variant="body1" fontWeight={900} lineHeight={1.2}>{intCount}</Typography>
              <Typography variant="caption" color="text.secondary">{t(`daily_summary_${strKey}`, strLabel)}</Typography>
            </Box>
          ))}
        </Stack>
      </Box>
      <Box className={styles.tableCard}><Box className={styles.tableHeaderActions}><Button data-control-id="attendance.daily.fill-month.button" className={styles.secondaryButton} startIcon={<AddRoundedIcon />} disabled={blnReadOnly || blnSaving} onClick={openFillDialog}>{t("generate_attendance","Generate Attendance")}</Button><Button data-control-id="attendance.daily.finalize.button" className={styles.primaryButton} startIcon={<SaveRoundedIcon />} disabled={blnReadOnly || blnSaving} onClick={() => setBlnFinalizeConfirmOpen(true)}>{t("finalize_attendance","Finalize Attendance")}</Button></Box><Box className={styles.tableWrap}><Table size="small" className={styles.table} sx={{ minWidth: 1650 }}><TableHead><TableRow>{[["Actions","table_actions"],["Employee Code","table_employee_code"],["Employee Name","table_employee_name"],["Department","table_department"],["Location","table_location"],["Status","table_status"],["First In","table_first_in"],["Last Out","table_last_out"],["Worked Hours","table_worked_hours"],["Late Minutes","table_late_minutes"],["Early Minutes","table_early_minutes"],["OT Hours","table_ot_hours"],["Paid Day","table_paid_day"],["Remarks","table_remarks"]].map(([strLabel, strKey]) => <TableCell key={strKey}>{t(strKey,strLabel)}</TableCell>)}</TableRow></TableHead><TableBody>{lstEditableRows.map((objRow) => <TableRow key={objRow.intEmployeeID}><TableCell>{blnCanOverride ? <IconButton data-control-id={`attendance.daily.${objRow.intEmployeeID}.override.button`} aria-label={t("override_row", "Edit / Override attendance")} size="small" onClick={() => openOverrideDialog(objRow)} sx={{ p: 0.5, color: "#17639b" }}><EditRoundedIcon fontSize="small" /></IconButton> : null}</TableCell><TableCell>{objRow.strEmployeeCode}</TableCell><TableCell>{objRow.strEmployeeName}</TableCell><TableCell>{objRow.strDepartmentName}</TableCell><TableCell>{objRow.strLocationName}</TableCell><TableCell><Chip size="small" data-control-id={`attendance.daily.${objRow.intEmployeeID}.status.value`} label={t(`status_${objRow.strStatus ?? "absent"}`, lstStatusLabels[objRow.strStatus ?? "absent"] ?? "Absent")} /></TableCell><TableCell><Typography variant="body2" data-control-id={`attendance.daily.${objRow.intEmployeeID}.first-in.value`}>{formatTimeWithoutSeconds(objRow.strFirstIn) || "—"}</Typography></TableCell><TableCell><Typography variant="body2" data-control-id={`attendance.daily.${objRow.intEmployeeID}.last-out.value`}>{formatTimeWithoutSeconds(objRow.strLastOut) || "—"}</Typography></TableCell><TableCell><Typography variant="body2" color="text.secondary" data-control-id={`attendance.daily.${objRow.intEmployeeID}.decWorkedHours.value`}>{formatWorkedDuration(objRow.decWorkedHours)}</Typography></TableCell><TableCell><Typography variant="body2" color="text.secondary" data-control-id={`attendance.daily.${objRow.intEmployeeID}.intLateMinutes.value`}>{objRow.intLateMinutes} {t("minutes_short","min")}</Typography></TableCell><TableCell><Typography variant="body2" color="text.secondary" data-control-id={`attendance.daily.${objRow.intEmployeeID}.intEarlyMinutes.value`}>{objRow.intEarlyMinutes} {t("minutes_short","min")}</Typography></TableCell><TableCell><Typography variant="body2" color="text.secondary" data-control-id={`attendance.daily.${objRow.intEmployeeID}.decOtHours.value`}>{formatWorkedDuration(objRow.decOtHours)}</Typography></TableCell><TableCell><Chip size="small" data-control-id={`attendance.daily.${objRow.intEmployeeID}.paid.value`} label={objRow.blnIsPaid ? t("yes","Yes") : t("no","No")} title={t("paid_day_auto_hint","Derived automatically from status")} /></TableCell><TableCell><Typography variant="body2" color="text.secondary" data-control-id={`attendance.daily.${objRow.intEmployeeID}.remarks.value`}>{objRow.strRemark ?? ""}</Typography></TableCell></TableRow>)}{!blnLoading && lstEditableRows.length === 0 ? <TableRow><TableCell colSpan={14} align="center">{t("load_daily_prompt","Select filters and load employees for the date.")}</TableCell></TableRow> : null}</TableBody></Table></Box>{blnLoading ? <Box sx={{ p: 3, textAlign: "center" }}><CircularProgress /></Box> : null}</Box>
    </>
    <CommonMasterDialog blnOpen={blnFillDialogOpen} strTitle={t("generate_attendance_title","Generate Attendance for a Date Range")} nodeContent={nodeFillDialogContent} strSecondaryLabel={t("cancel","Cancel")} onClose={() => setBlnFillDialogOpen(false)} strPrimaryLabel={t("generate_attendance_submit","Generate")} onPrimaryAction={() => void submitFillRange()} blnPrimaryDisabled={blnFillSubmitting || !intFillEmployeeID || !strFillStatus} maxWidth="sm" rootControlId="attendance.daily.fill-month.dialog" cancelButtonControlId="attendance.daily.fill-month.dialog.cancel.button" primaryButtonControlId="attendance.daily.fill-month.dialog.submit.button" titleSx={{ px: 2.5, py: 1.5 }} contentSx={{ px: 2.5, py: 1.25 }} />
    <CommonMasterDialog blnOpen={objOverrideRow !== null} strTitle={t("override_dialog_title", `Edit / Override Attendance${objOverrideRow ? ` — ${objOverrideRow.strEmployeeName}` : ""}`)} nodeContent={
      <Grid container spacing={1.5} sx={{ minWidth: { sm: 420 }, pt: 0.5 }}>
        <Grid item xs={12}><Alert severity="warning">{t("override_help", "This is an exceptional administrative correction, fully audited with old/new values, your identity and timestamp. Normal employee corrections should use Attendance Regularization instead.")}</Alert></Grid>
        <Grid item xs={12} sm={4}><TextField data-control-id="attendance.daily.override.status.select" select fullWidth label={t("status","Status")} value={strOverrideStatus} onChange={(objEvent) => setStrOverrideStatus(objEvent.target.value)}>{lstStatuses.map((strStatus) => <MenuItem key={strStatus} value={strStatus}>{t(`status_${strStatus}`, lstStatusLabels[strStatus] ?? strStatus)}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} sm={4}><TextField data-control-id="attendance.daily.override.first-in.input" type="time" fullWidth label={t("first_in","First In")} InputLabelProps={{ shrink: true }} disabled={setPunchlessStatuses.has(strOverrideStatus)} value={strOverrideFirstIn} onChange={(objEvent) => setStrOverrideFirstIn(objEvent.target.value)} /></Grid>
        <Grid item xs={12} sm={4}><TextField data-control-id="attendance.daily.override.last-out.input" type="time" fullWidth label={t("last_out","Last Out")} InputLabelProps={{ shrink: true }} disabled={setPunchlessStatuses.has(strOverrideStatus)} value={strOverrideLastOut} onChange={(objEvent) => setStrOverrideLastOut(objEvent.target.value)} /></Grid>
        <Grid item xs={12}><TextField data-control-id="attendance.daily.override.remark.input" required fullWidth multiline minRows={2} label={t("override_reason","Override Reason")} placeholder={t("override_reason_placeholder","Mandatory - explain why this record is being manually corrected")} value={strOverrideRemark} onChange={(objEvent) => setStrOverrideRemark(objEvent.target.value)} /></Grid>
      </Grid>
    } strSecondaryLabel={t("cancel","Cancel")} onClose={() => setObjOverrideRow(null)} strPrimaryLabel={t("save","Save")} onPrimaryAction={() => void submitOverride()} blnPrimaryDisabled={blnOverrideSubmitting || !strOverrideRemark.trim()} maxWidth="sm" rootControlId="attendance.daily.override.dialog" cancelButtonControlId="attendance.daily.override.dialog.cancel.button" primaryButtonControlId="attendance.daily.override.dialog.submit.button" titleSx={{ px: 2.5, py: 1.5 }} contentSx={{ px: 2.5, py: 1.25 }} />
    <CommonMasterDialog blnOpen={blnFinalizeConfirmOpen} strTitle={t("finalize_confirm_title", "Finalize Attendance")} nodeContent={
      <Alert severity="info">{t("finalize_confirm_body", `This finalizes attendance for ${strDate}. Days with both punches present resolve to Present/Half Day/Absent; days missing exactly one punch get an Attendance Exception instead of a guessed status; days with neither punch are marked Absent. Already-overridden or locked days are left untouched.`)}</Alert>
    } strSecondaryLabel={t("cancel","Cancel")} onClose={() => setBlnFinalizeConfirmOpen(false)} strPrimaryLabel={t("finalize_confirm_submit","Finalize")} onPrimaryAction={() => void submitFinalize()} blnPrimaryDisabled={blnFinalizeSubmitting} maxWidth="sm" rootControlId="attendance.daily.finalize.confirm.dialog" cancelButtonControlId="attendance.daily.finalize.confirm.dialog.cancel.button" primaryButtonControlId="attendance.daily.finalize.confirm.dialog.submit.button" titleSx={{ px: 2.5, py: 1.5 }} contentSx={{ px: 2.5, py: 1.25 }} />
    <CommonMasterDialog blnOpen={objFinalizeResult !== null} strTitle={t("finalize_result_title","Finalize Attendance — Result")} nodeContent={
      <Grid container spacing={1.5} sx={{ minWidth: { sm: 420 }, pt: 0.5 }}>
        {objFinalizeResult ? ([
          ["intProcessed","Processed"],["intFinalized","Finalized"],["intExceptionsCreated","Exceptions Created"],
        ] as const).map(([strKey,strLabel]) => <Grid item xs={4} key={strKey}><Box sx={{ textAlign: "center" }}><Typography variant="h6" fontWeight={900}>{objFinalizeResult[strKey]}</Typography><Typography variant="caption" color="text.secondary">{t(`finalize_result_${strKey}`, strLabel)}</Typography></Box></Grid>) : null}
        <Grid item xs={12}><Typography variant="body2" color="text.secondary">{t("finalize_result_skipped", `Skipped/not-yet-eligible: ${objFinalizeResult?.lstSkipped.length ?? 0}. Configuration errors: ${objFinalizeResult?.lstConfigurationErrors.length ?? 0}.`)}</Typography></Grid>
      </Grid>
    } strSecondaryLabel={t("close","Close")} onClose={() => setObjFinalizeResult(null)} blnHidePrimary maxWidth="sm" rootControlId="attendance.daily.finalize.result.dialog" cancelButtonControlId="attendance.daily.finalize.result.dialog.close.button" titleSx={{ px: 2.5, py: 1.5 }} contentSx={{ px: 2.5, py: 1.25 }} />
    <Snackbar data-control-id="attendance.notification" open={objToast.blnOpen} autoHideDuration={5000} onClose={() => setObjToast((objCurrent) => ({ ...objCurrent, blnOpen: false }))}><Alert severity={objToast.strSeverity}>{objToast.strMessage}</Alert></Snackbar>
  </Box>;
}
