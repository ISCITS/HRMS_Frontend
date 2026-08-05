"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import GroupAddRoundedIcon from "@mui/icons-material/GroupAddRounded";
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
import type { AttendancePolicyAssignmentEmployee, AttendancePolicyAssignmentHistory, AttendancePolicyFormValues, DailyAttendanceRow, DailyAttendanceSaveRow } from "@/features/attendance/types";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { authHelpers } from "@/lib/auth";

const lstWeekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const lstStatuses = ["present", "absent", "half_day", "on_leave", "lwp", "holiday", "weekly_off", "on_duty"];
const setPunchlessStatuses = new Set(["on_leave", "lwp", "holiday", "weekly_off"]);
const strToday = new Date().toISOString().slice(0, 10);

const objPolicySchema: yup.ObjectSchema<AttendancePolicyFormValues> = yup.object({
  intCompanyID: yup.number().nullable().defined(), strPolicyCode: yup.string().trim().required().max(50),
  strPolicyName: yup.string().trim().required().max(150), strDescription: yup.string().nullable().defined().max(500),
  intLocationID: yup.number().nullable().defined(), intGradeID: yup.number().nullable().defined(), intEmploymentTypeID: yup.number().nullable().defined(),
  intLateGraceMinutes: yup.number().min(0).required(), intEarlyDepartureGraceMinutes: yup.number().min(0).required(),
  decFullDayThresholdHours: yup.number().moreThan(0).max(24).required(), decHalfDayThresholdHours: yup.number().min(0).max(24).required(),
  decAbsentThresholdHours: yup.number().min(0).max(24).required(), blnInPunchRequired: yup.boolean().required(), blnOutPunchRequired: yup.boolean().required(),
  strMissingPunchTreatmentCode: yup.mixed<AttendancePolicyFormValues["strMissingPunchTreatmentCode"]>().oneOf(["EXCEPTION", "ABSENT", "HALF_DAY", "IGNORE"]).required(),
  intWorkHoursRoundingMinutes: yup.number().min(0).max(60).required(), blnOtEnabled: yup.boolean().required(), decOtMinHours: yup.number().min(0).max(24).required(),
  strLateDeductionRule: yup.string().nullable().defined().max(30), strWeeklyOffPattern: yup.string().matches(/^[01]{7}$/).required(),
  blnIsDefault: yup.boolean().required(), dtEffectiveFrom: yup.string().required(), dtEffectiveTo: yup.string().nullable().defined(),
  blnIsActive: yup.boolean().required(), strRemarks: yup.string().nullable().defined().max(500),
  lstTexts: yup.array().of(yup.object({ intLanguageID: yup.number().required(), strPolicyName: yup.string().required(), strDescription: yup.string().nullable().defined() })).defined(),
}).test("thresholds", "Threshold order must be Full Day ≥ Half Day ≥ Absent.", (objValue) => !objValue || (objValue.decFullDayThresholdHours >= objValue.decHalfDayThresholdHours && objValue.decHalfDayThresholdHours >= objValue.decAbsentThresholdHours))
  .test("dates", "Effective To cannot be before Effective From.", (objValue) => !objValue?.dtEffectiveTo || objValue.dtEffectiveTo >= objValue.dtEffectiveFrom);

function getEmptyPolicy(): AttendancePolicyFormValues {
  return { intCompanyID: authHelpers.getCompanyID(), strPolicyCode: "", strPolicyName: "", strDescription: null, intLocationID: null, intGradeID: null, intEmploymentTypeID: null,
    intLateGraceMinutes: 0, intEarlyDepartureGraceMinutes: 0, decFullDayThresholdHours: 8, decHalfDayThresholdHours: 4, decAbsentThresholdHours: 0,
    blnInPunchRequired: true, blnOutPunchRequired: true, strMissingPunchTreatmentCode: "EXCEPTION", intWorkHoursRoundingMinutes: 0,
    blnOtEnabled: false, decOtMinHours: 0, strLateDeductionRule: null, strWeeklyOffPattern: "0000011", blnIsDefault: false,
    dtEffectiveFrom: strToday, dtEffectiveTo: null, blnIsActive: true, strRemarks: null, lstTexts: [] };
}

function toSaveRow(objRow: DailyAttendanceRow): DailyAttendanceSaveRow {
  return { intEmployeeID: objRow.intEmployeeID, strStatus: objRow.strStatus ?? "absent", tmFirstIn: objRow.strFirstIn, tmLastOut: objRow.strLastOut,
    decWorkedHours: objRow.decWorkedHours, intLateMinutes: objRow.intLateMinutes, decOtHours: objRow.decOtHours, blnIsPaid: objRow.blnIsPaid, strRemark: objRow.strRemark };
}

type AttendancePocPanelProps = {
  strView: "policy" | "daily";
};

export default function AttendancePocPanel({ strView }: AttendancePocPanelProps) {
  const { t } = useModuleLabels("attendance", "Unable to load attendance labels.");
  const { blnLoading: blnRightsLoading, objRights } = useModuleActionAccess(["ATTENDANCE_POLICY", "DAILY_ATTENDANCE", "ATTENDANCE", "ATTENDANCE_MANAGEMENT"]);
  const { objPolicyList, lstDailyRows, blnLoading, blnSaving, strError, loadPolicies, getPolicy, savePolicy, loadDaily, saveDaily, bulkFillRange, listPolicyAssignmentEmployees, listPolicyAssignmentHistory, assignAttendancePolicy } = useAttendancePoc(strView === "policy");
  const [strPolicyWorkspace, setStrPolicyWorkspace] = useState<"list" | "editor" | "assignment">("list");
  const [intPolicyID, setIntPolicyID] = useState<number | null>(null);
  const [blnPolicyViewMode, setBlnPolicyViewMode] = useState(false);
  const [strPolicySearch, setStrPolicySearch] = useState(""); const [strPolicyStatus, setStrPolicyStatus] = useState("");
  const [lstAssignmentEmployees, setLstAssignmentEmployees] = useState<AttendancePolicyAssignmentEmployee[]>([]);
  const [lstAssignmentHistory, setLstAssignmentHistory] = useState<AttendancePolicyAssignmentHistory[]>([]);
  const [lstSelectedEmployeeIDs, setLstSelectedEmployeeIDs] = useState<number[]>([]);
  const [strAssignmentSearch, setStrAssignmentSearch] = useState("");
  const [strAssignmentDepartment, setStrAssignmentDepartment] = useState("");
  const [strAssignmentStatus, setStrAssignmentStatus] = useState("Active");
  const [strAssignmentPolicyID, setStrAssignmentPolicyID] = useState("");
  const [strAssignmentEffectiveFrom, setStrAssignmentEffectiveFrom] = useState(strToday);
  const [strAssignmentEffectiveTo, setStrAssignmentEffectiveTo] = useState("");
  const [strAssignmentReason, setStrAssignmentReason] = useState("");
  const [strDate, setStrDate] = useState(strToday); const [strEmployeeSearch, setStrEmployeeSearch] = useState("");
  const [strDepartment, setStrDepartment] = useState(""); const [strLocation, setStrLocation] = useState("");
  const [lstEditableRows, setLstEditableRows] = useState<DailyAttendanceRow[]>([]); const [blnDirty, setBlnDirty] = useState(false);
  const [dicRowErrors, setDicRowErrors] = useState<Record<number, string>>({}); const [objToast, setObjToast] = useState({ blnOpen: false, strMessage: "", strSeverity: "success" as "success" | "error" });
  const [blnFillDialogOpen, setBlnFillDialogOpen] = useState(false); const [intFillEmployeeID, setIntFillEmployeeID] = useState<number | "">("");
  const [strFillFromDate, setStrFillFromDate] = useState(""); const [strFillToDate, setStrFillToDate] = useState("");
  const [strFillStatus, setStrFillStatus] = useState("present"); const [blnFillSkipResolved, setBlnFillSkipResolved] = useState(true);
  const [blnFillOverwrite, setBlnFillOverwrite] = useState(false); const [blnFillSubmitting, setBlnFillSubmitting] = useState(false);
  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<AttendancePolicyFormValues>({ resolver: yupResolver(objPolicySchema) as Resolver<AttendancePolicyFormValues>, defaultValues: getEmptyPolicy() });
  const strPattern = watch("strWeeklyOffPattern"); const blnOtEnabled = watch("blnOtEnabled");

  const lstDepartments = useMemo(() => Array.from(new Map(lstDailyRows.filter((objRow) => objRow.intDepartmentID).map((objRow) => [objRow.intDepartmentID, objRow.strDepartmentName])).entries()), [lstDailyRows]);
  const lstLocations = useMemo(() => Array.from(new Map(lstDailyRows.filter((objRow) => objRow.intLocationID).map((objRow) => [objRow.intLocationID, objRow.strLocationName])).entries()), [lstDailyRows]);
  const lstFillEmployeeOptions = useMemo(() => Array.from(new Map(lstDailyRows.map((objRow) => [objRow.intEmployeeID, `${objRow.strEmployeeCode} - ${objRow.strEmployeeName}`])).entries()), [lstDailyRows]);

  useEffect(() => { setLstEditableRows(lstDailyRows); setBlnDirty(false); }, [lstDailyRows]);
  useEffect(() => { if (strView === "daily") void loadDaily({ strDate }); }, [loadDaily, strDate, strView]);
  useEffect(() => { const fnWarn = (objEvent: BeforeUnloadEvent) => { if (blnDirty) objEvent.preventDefault(); }; window.addEventListener("beforeunload", fnWarn); return () => window.removeEventListener("beforeunload", fnWarn); }, [blnDirty]);

  function showToast(strMessage: string, strSeverity: "success" | "error") { setObjToast({ blnOpen: true, strMessage, strSeverity }); }
  async function openPolicy(intID: number | null, blnViewMode = false) {
    try {
      setIntPolicyID(intID);
      setBlnPolicyViewMode(blnViewMode);
      reset(intID ? await getPolicy(intID) : getEmptyPolicy());
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
      setLstAssignmentHistory(await listPolicyAssignmentHistory({ intPolicyID: strPolicyFilter ? Number(strPolicyFilter) : undefined }));
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : t("assignment_load_failed", "Unable to load assignments."), "error");
    }
  }
  async function submitAssignment() {
    if (!strAssignmentPolicyID || lstSelectedEmployeeIDs.length === 0) { showToast(t("assignment_required", "Select employees and an attendance policy."), "error"); return; }
    try {
      const objResult = await assignAttendancePolicy({ lstEmployeeIDs: lstSelectedEmployeeIDs, intAttendancePolicyID: Number(strAssignmentPolicyID), dtEffectiveFrom: strAssignmentEffectiveFrom, dtEffectiveTo: strAssignmentEffectiveTo || null, strAssignmentReason: strAssignmentReason || null, blnReplaceExisting: true });
      showToast(t("assignment_saved", `${objResult.intAssignedCount} employee assignments saved.`), "success");
      await loadAssignments(strAssignmentPolicyID);
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
  function updateRow(intIndex: number, strField: keyof DailyAttendanceRow, objValue: string | number | boolean | null) { setLstEditableRows((lstCurrent) => lstCurrent.map((objRow, intRowIndex) => intRowIndex === intIndex ? { ...objRow, [strField]: objValue } : objRow)); setBlnDirty(true); setDicRowErrors((dicCurrent) => ({ ...dicCurrent, [intIndex]: "" })); }
  async function saveAll() { try { const objResult = await saveDaily(strDate, lstEditableRows.map(toSaveRow)); const dicErrors: Record<number, string> = {}; objResult.lstResults.filter((objResultRow) => !objResultRow.blnValid).forEach((objResultRow) => { dicErrors[objResultRow.intRowIndex] = objResultRow.strMessage ?? t("invalid_row", "Invalid row"); }); setDicRowErrors(dicErrors); if (objResult.blnSaved) { setBlnDirty(false); showToast(t("attendance_saved", `${objResult.intSavedCount} attendance rows saved.`), "success"); await searchDaily(); } else showToast(t("validation_failed", "Validation failed. No rows were saved."), "error"); } catch (objError) { showToast(objError instanceof Error ? objError.message : t("save_failed", "Save failed."), "error"); } }

  function openFillDialog() {
    const objSelectedDate = new Date(`${strDate}T00:00:00`);
    const intYear = objSelectedDate.getFullYear(); const intMonth = objSelectedDate.getMonth();
    const toIso = (objDate: Date) => objDate.toISOString().slice(0, 10);
    setStrFillFromDate(toIso(new Date(intYear, intMonth, 1)));
    setStrFillToDate(toIso(new Date(intYear, intMonth + 1, 0)));
    setIntFillEmployeeID(lstFillEmployeeOptions[0]?.[0] ?? "");
    setStrFillStatus("present"); setBlnFillSkipResolved(true); setBlnFillOverwrite(false);
    setBlnFillDialogOpen(true);
  }

  async function submitFillRange() {
    if (!intFillEmployeeID || !strFillFromDate || !strFillToDate) return;
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
      showToast(
        t("fill_month_result", `${objResult.intCreatedCount} day(s) marked, ${objResult.intSkippedCount} day(s) skipped.`),
        "success",
      );
      await searchDaily();
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : t("fill_month_failed", "Unable to fill attendance for the selected range."), "error");
    } finally {
      setBlnFillSubmitting(false);
    }
  }

  const nodeFillDialogContent = <Grid container spacing={1.5} sx={{ minWidth: { sm: 420 }, pt: 0.5 }}>
    <Grid item xs={12}>
      <TextField controlId="attendance.daily.fill-month.employee.select" select fullWidth label={t("employee", "Employee")} value={intFillEmployeeID} onChange={(objEvent) => setIntFillEmployeeID(Number(objEvent.target.value))}>
        {lstFillEmployeeOptions.map(([intID, strLabel]) => <MenuItem key={intID} value={intID ?? ""}>{strLabel}</MenuItem>)}
        {lstFillEmployeeOptions.length === 0 ? <MenuItem value="" disabled>{t("fill_month_no_employees", "Search and load employees for a date first.")}</MenuItem> : null}
      </TextField>
    </Grid>
    <Grid item xs={6}>
      <TextField controlId="attendance.daily.fill-month.from.input" type="date" fullWidth label={t("from_date", "From Date")} InputLabelProps={{ shrink: true }} value={strFillFromDate} onChange={(objEvent) => setStrFillFromDate(objEvent.target.value)} />
    </Grid>
    <Grid item xs={6}>
      <TextField controlId="attendance.daily.fill-month.to.input" type="date" fullWidth label={t("to_date", "To Date")} InputLabelProps={{ shrink: true }} value={strFillToDate} onChange={(objEvent) => setStrFillToDate(objEvent.target.value)} />
    </Grid>
    <Grid item xs={12}>
      <TextField controlId="attendance.daily.fill-month.status.select" select fullWidth label={t("default_status", "Default Status")} value={strFillStatus} onChange={(objEvent) => setStrFillStatus(objEvent.target.value)}>
        {lstStatuses.map((strStatus) => <MenuItem key={strStatus} value={strStatus}>{t(`status_${strStatus}`, strStatus.replaceAll("_", " "))}</MenuItem>)}
      </TextField>
    </Grid>
    <Grid item xs={12}>
      <FormControlLabel control={<Checkbox controlId="attendance.daily.fill-month.skip-resolved.checkbox" checked={blnFillSkipResolved} onChange={(objEvent) => setBlnFillSkipResolved(objEvent.target.checked)} />} label={t("fill_month_skip_resolved", "Skip days already covered by approved leave, holiday, or weekly-off")} />
    </Grid>
    <Grid item xs={12}>
      <FormControlLabel control={<Checkbox controlId="attendance.daily.fill-month.overwrite.checkbox" checked={blnFillOverwrite} onChange={(objEvent) => setBlnFillOverwrite(objEvent.target.checked)} />} label={t("fill_month_overwrite", "Overwrite days that already have an attendance record")} />
    </Grid>
    <Grid item xs={12}>
      <Alert severity="info">{t("fill_month_notice", "Every remaining day in the range is marked with the default status above. Nothing here changes an approved leave, holiday, or weekly-off record.")}</Alert>
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
  if (blnRightsLoading) return <Box sx={{ display: "grid", placeItems: "center", py: 8 }}><CircularProgress /></Box>;
  if (!blnCanView) return <Alert severity="warning">{t("permission_denied", "Attendance Management access is not available for your user group. Sign in with an HR or Administrator account.")}</Alert>;
  const blnReadOnly = !blnCanManage;

  const lstPolicyTexts = watch("lstTexts") ?? [];
  const objCurrentPolicy = objPolicyList.lstItems.find((objPolicy) => objPolicy.intID === intPolicyID);

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
      <Grid item xs={12} md={4}><Controller name="strPolicyCode" control={control} render={({ field }) => <TextField {...field} controlId="attendance.policy.code.input" label={t("policy_code", "Policy Code")} required fullWidth disabled={intPolicyID !== null || blnPolicyViewMode} error={!!errors.strPolicyCode} helperText={errors.strPolicyCode?.message} />} /></Grid>
      <Grid item xs={12} md={8}><Controller name="strPolicyName" control={control} render={({ field }) => <TextField {...field} value={field.value ?? ""} controlId="attendance.policy.name.input" label={t("policy_name", "Policy Name")} required fullWidth error={!!errors.strPolicyName} helperText={errors.strPolicyName?.message} />} /></Grid>
      <Grid item xs={12}><Controller name="strDescription" control={control} render={({ field }) => <TextField {...field} value={field.value ?? ""} controlId="attendance.policy.description.input" label={t("description", "Description")} fullWidth />} /></Grid>
    </Grid></Paper></Grid>
    <Grid item xs={12} lg={6}><Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}><Typography fontWeight={800} sx={{ mb: 1 }}>{t("working_hour_rules", "Working Hour Rules")}</Typography><Grid container spacing={1}>{([["decFullDayThresholdHours","full_day_threshold","Full-day Threshold"],["decHalfDayThresholdHours","half_day_threshold","Half-day Threshold"],["decAbsentThresholdHours","absent_threshold","Absent Threshold"]] as const).map(([strName,strKey,strLabel]) => <Grid item xs={12} md={4} key={strName}><Controller name={strName} control={control} render={({ field }) => <TextField {...field} controlId={`attendance.policy.${strName}.input`} label={t(strKey,strLabel)} type="number" fullWidth error={!!errors[strName]} inputProps={{ min: 0, step: .25 }} />} /></Grid>)}</Grid>{errors.root?.message ? <Alert severity="error" sx={{ mt: 1 }}>{errors.root.message}</Alert> : null}</Paper></Grid>
    <Grid item xs={12} lg={7}><Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}><Typography fontWeight={800} sx={{ mb: 1 }}>{t("punch_exception_rules", "Punch and Exception Rules")}</Typography><Grid container spacing={1}>
      <Grid item xs={6} md={3}><Controller name="blnInPunchRequired" control={control} render={({ field }) => <FormControlLabel control={<Switch controlId="attendance.policy.in-required.switch" checked={field.value} onChange={field.onChange} />} label={t("in_required", "IN Required")} />} /></Grid>
      <Grid item xs={6} md={3}><Controller name="blnOutPunchRequired" control={control} render={({ field }) => <FormControlLabel control={<Switch controlId="attendance.policy.out-required.switch" checked={field.value} onChange={field.onChange} />} label={t("out_required", "OUT Required")} />} /></Grid>
      <Grid item xs={12} md={3}><Controller name="intLateGraceMinutes" control={control} render={({ field }) => <TextField {...field} controlId="attendance.policy.late-grace.input" label={t("late_grace", "Late Grace (min)")} type="number" fullWidth />} /></Grid>
      <Grid item xs={12} md={3}><Controller name="intEarlyDepartureGraceMinutes" control={control} render={({ field }) => <TextField {...field} controlId="attendance.policy.early-grace.input" label={t("early_grace", "Early Departure Grace")} type="number" fullWidth />} /></Grid>
      <Grid item xs={12} md={7}><Controller name="strMissingPunchTreatmentCode" control={control} render={({ field }) => <TextField {...field} controlId="attendance.policy.missing-punch.select" select label={t("missing_punch", "Missing-punch Treatment")} fullWidth>{["EXCEPTION","ABSENT","HALF_DAY","IGNORE"].map((strValue) => <MenuItem key={strValue} value={strValue}>{t(`missing_${strValue.toLowerCase()}`, strValue.replace("_", " "))}</MenuItem>)}</TextField>} /></Grid>
      <Grid item xs={12} md={5}><Controller name="intWorkHoursRoundingMinutes" control={control} render={({ field }) => <TextField {...field} controlId="attendance.policy.rounding.input" label={t("rounding", "Work-hour Rounding (min)")} type="number" fullWidth />} /></Grid>
    </Grid></Paper></Grid>
    <Grid item xs={12} lg={5}><Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}><Typography fontWeight={800} sx={{ mb: 0.5 }}>{t("weekly_off_overtime", "Weekly Off and Overtime")}</Typography><Stack direction="row" spacing={1} alignItems="center"><Controller name="blnOtEnabled" control={control} render={({ field }) => <FormControlLabel control={<Switch controlId="attendance.policy.ot.switch" checked={field.value} onChange={field.onChange} />} label={t("overtime_enabled", "Overtime")} />} /><Controller name="decOtMinHours" control={control} render={({ field }) => <TextField {...field} controlId="attendance.policy.ot-min.input" disabled={!blnOtEnabled} label={t("minimum_overtime", "Minimum OT Hours")} type="number" size="small" sx={{ maxWidth: 170 }} />} /></Stack><Stack direction="row" flexWrap="wrap" sx={{ mt: 0.5 }}>{lstWeekdays.map((strDay,intIndex) => <FormControlLabel sx={{ mr: 1 }} key={strDay} control={<Checkbox size="small" controlId={`attendance.policy.weekly-off.${intIndex}.checkbox`} checked={strPattern[intIndex] === "1"} onChange={(objEvent) => { const lstPattern = strPattern.split(""); lstPattern[intIndex] = objEvent.target.checked ? "1" : "0"; setValue("strWeeklyOffPattern", lstPattern.join(""), { shouldDirty: true }); }} />} label={t(`weekday_${strDay.toLowerCase()}`,strDay)} />)}</Stack><Typography variant="caption" color="text.secondary">{t("weekly_off_preview", "Weekly off")}: {lstWeekdays.filter((_,intIndex) => strPattern[intIndex] === "1").join(", ") || t("none", "None")}</Typography></Paper></Grid>
    <Grid item xs={12}><Paper variant="outlined" sx={{ p: 1.5 }}><Typography fontWeight={800} sx={{ mb: 1 }}>{t("effective_dates_status", "Effective Dates and Status")}</Typography><Grid container spacing={1} alignItems="center"><Grid item xs={12} md={2}><Controller name="dtEffectiveFrom" control={control} render={({ field }) => <TextField {...field} controlId="attendance.policy.effective-from.input" type="date" label={t("effective_from", "Effective From")} InputLabelProps={{ shrink: true }} fullWidth />} /></Grid><Grid item xs={12} md={2}><Controller name="dtEffectiveTo" control={control} render={({ field }) => <TextField {...field} value={field.value ?? ""} controlId="attendance.policy.effective-to.input" type="date" label={t("effective_to", "Effective To")} InputLabelProps={{ shrink: true }} fullWidth />} /></Grid><Grid item xs={12} md={3}><Stack direction="row"><Controller name="blnIsDefault" control={control} render={({ field }) => <FormControlLabel control={<Switch controlId="attendance.policy.default.switch" checked={field.value} onChange={field.onChange} />} label={t("default_policy", "Default")} />} /><Controller name="blnIsActive" control={control} render={({ field }) => <FormControlLabel control={<Switch controlId="attendance.policy.active.switch" checked={field.value} onChange={field.onChange} />} label={t("active", "Active")} />} /></Stack></Grid><Grid item xs={12} md={5}><Controller name="strRemarks" control={control} render={({ field }) => <TextField {...field} value={field.value ?? ""} controlId="attendance.policy.remarks.input" label={t("remarks", "Remarks")} fullWidth />} /></Grid></Grid></Paper></Grid>
    <Grid item xs={12} lg={6}><Paper variant="outlined" sx={{ p: 1.5 }}><Typography fontWeight={800} sx={{ mb: 1 }}>{t("translations", "Translations")}</Typography><Table size="small"><TableHead><TableRow><TableCell>{t("language", "Language")}</TableCell><TableCell>{t("policy_name", "Policy Name")}</TableCell><TableCell>{t("description", "Description")}</TableCell></TableRow></TableHead><TableBody>{lstPolicyTexts.map((objText) => <TableRow key={objText.intLanguageID}><TableCell>{objText.intLanguageID}</TableCell><TableCell>{objText.strPolicyName}</TableCell><TableCell>{objText.strDescription ?? ""}</TableCell></TableRow>)}{lstPolicyTexts.length === 0 ? <TableRow><TableCell colSpan={3}>{t("no_translations", "No translations configured.")}</TableCell></TableRow> : null}</TableBody></Table></Paper></Grid>
    <Grid item xs={12} lg={6}><Paper variant="outlined" sx={{ p: 1.5 }}><Typography fontWeight={800} sx={{ mb: 1 }}>{t("usage_information", "Usage Information")}</Typography><Stack direction="row" spacing={1} flexWrap="wrap"><Chip label={objCurrentPolicy?.blnHasAssignmentsOrUsage ? t("assigned_or_used", "Assigned or Used") : t("not_assigned_or_used", "Not Assigned or Used")} color={objCurrentPolicy?.blnHasAssignmentsOrUsage ? "warning" : "default"} /><Chip label={watch("blnIsDefault") ? t("company_default_policy", "Company Default Policy") : t("employee_specific_policy", "Employee-specific Policy")} color={watch("blnIsDefault") ? "success" : "default"} /></Stack></Paper></Grid>
  </Grid>;

  if (strView === "policy") {
    const blnAllSelected = lstAssignmentEmployees.length > 0 && lstAssignmentEmployees.every((objEmployee) => lstSelectedEmployeeIDs.includes(objEmployee.intEmployeeID));
    const nodeToast = <Snackbar controlId="attendance.notification" open={objToast.blnOpen} autoHideDuration={5000} onClose={() => setObjToast((objCurrent) => ({ ...objCurrent, blnOpen: false }))}><Alert severity={objToast.strSeverity}>{objToast.strMessage}</Alert></Snackbar>;
    if (strPolicyWorkspace === "editor") return <Box className={styles.page} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "9px !important" }, "& .MuiInputBase-root": { minHeight: 48 }, "& .MuiAlert-root": { borderRadius: "9px !important" } }}>
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      <Box className={styles.tableCard}><Box className={styles.tableHeaderActions}><Button data-control-id="attendance.policy.editor.back.button" className={styles.secondaryButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => setStrPolicyWorkspace("list")}>{t("back", "Back")}</Button>{!blnPolicyViewMode ? <Button data-control-id="attendance.policy.editor.save.button" className={styles.primaryButton} startIcon={<SaveRoundedIcon />} disabled={blnSaving || blnReadOnly} onClick={() => void handleSubmit(submitPolicy)()}>{t("save", "Save")}</Button> : null}</Box>{nodePolicyForm}</Box>{nodeToast}</Box>;
    if (strPolicyWorkspace === "assignment") return <Box className={styles.page} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "9px !important" }, "& .MuiInputBase-root": { minHeight: 48 }, "& .MuiAlert-root": { borderRadius: "9px !important" } }}>
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      <Box className={styles.controlsCard}><Box className={styles.searchRow} sx={{ gridTemplateColumns: "minmax(220px,1fr) minmax(170px,.55fr) minmax(190px,.65fr) minmax(150px,.45fr) auto auto !important" }}><TextField data-control-id="attendance.assignment.search.input" value={strAssignmentSearch} onChange={(objEvent) => setStrAssignmentSearch(objEvent.target.value)} placeholder={t("search_employee", "Search Employee")} size="small" /><TextField data-control-id="attendance.assignment.department.select" select label={t("department", "Department")} value={strAssignmentDepartment} onChange={(objEvent) => setStrAssignmentDepartment(objEvent.target.value)} size="small"><MenuItem value="">{t("all", "All")}</MenuItem>{lstDepartments.map(([intID, strName]) => <MenuItem key={intID} value={intID ?? ""}>{strName}</MenuItem>)}</TextField><TextField data-control-id="attendance.assignment.current-policy.select" select label={t("current_policy", "Current Policy")} value={strAssignmentPolicyID} onChange={(objEvent) => setStrAssignmentPolicyID(objEvent.target.value)} size="small"><MenuItem value="">{t("all", "All")}</MenuItem>{objPolicyList.lstItems.map((objPolicy) => <MenuItem key={objPolicy.intID} value={objPolicy.intID}>{objPolicy.strPolicyName}</MenuItem>)}</TextField><TextField data-control-id="attendance.assignment.status.select" select label={t("employee_status", "Employee Status")} value={strAssignmentStatus} onChange={(objEvent) => setStrAssignmentStatus(objEvent.target.value)} size="small">{["Active", "Inactive", "All"].map((strStatus) => <MenuItem key={strStatus} value={strStatus}>{t(`employee_status_${strStatus.toLowerCase()}`, strStatus)}</MenuItem>)}</TextField><Button data-control-id="attendance.assignment.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => void loadAssignments()}>{t("search", "Search")}</Button><Button data-control-id="attendance.assignment.back.button" className={styles.secondaryButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => setStrPolicyWorkspace("list")}>{t("back", "Back")}</Button></Box></Box>
      <Box className={styles.tableCard}><Box className={styles.tableHeaderActions}><TextField data-control-id="attendance.assignment.policy.select" select label={t("attendance_policy", "Attendance Policy")} value={strAssignmentPolicyID} onChange={(objEvent) => setStrAssignmentPolicyID(objEvent.target.value)} size="small" sx={{ minWidth: 240 }}>{objPolicyList.lstItems.filter((objPolicy) => objPolicy.blnIsActive).map((objPolicy) => <MenuItem key={objPolicy.intID} value={objPolicy.intID}>{objPolicy.strPolicyName}</MenuItem>)}</TextField><TextField data-control-id="attendance.assignment.effective-from.input" type="date" label={t("effective_from", "Effective From")} InputLabelProps={{ shrink: true }} value={strAssignmentEffectiveFrom} onChange={(objEvent) => setStrAssignmentEffectiveFrom(objEvent.target.value)} size="small" /><TextField data-control-id="attendance.assignment.effective-to.input" type="date" label={t("effective_to_optional", "Effective To")} InputLabelProps={{ shrink: true }} value={strAssignmentEffectiveTo} onChange={(objEvent) => setStrAssignmentEffectiveTo(objEvent.target.value)} size="small" /><TextField data-control-id="attendance.assignment.reason.input" label={t("assignment_reason", "Assignment Reason")} value={strAssignmentReason} onChange={(objEvent) => setStrAssignmentReason(objEvent.target.value)} size="small" sx={{ minWidth: 240 }} /><Button data-control-id="attendance.assignment.save.button" className={styles.primaryButton} startIcon={<GroupAddRoundedIcon />} disabled={blnReadOnly || blnSaving || lstSelectedEmployeeIDs.length === 0 || !strAssignmentPolicyID} onClick={() => void submitAssignment()}>{t("assign_employees", "Assign Employees")}</Button></Box><Box className={styles.tableWrap}><Table size="small" className={styles.table} sx={{ minWidth: 1100 }}><TableHead><TableRow>{["Select","Employee Code","Employee Name","Department","Status","Current Policy","Current From","Current To"].map((strLabel, intIndex) => <TableCell key={strLabel}>{intIndex === 0 ? <Checkbox controlId="attendance.assignment.select-all.checkbox" checked={blnAllSelected} indeterminate={lstSelectedEmployeeIDs.length > 0 && !blnAllSelected} onChange={(objEvent) => setLstSelectedEmployeeIDs(objEvent.target.checked ? lstAssignmentEmployees.map((objEmployee) => objEmployee.intEmployeeID) : [])} /> : t(`table_${strLabel.toLowerCase().replaceAll(" ","_")}`, strLabel)}</TableCell>)}</TableRow></TableHead><TableBody>{lstAssignmentEmployees.map((objEmployee) => <TableRow key={objEmployee.intEmployeeID} hover><TableCell><Checkbox controlId={`attendance.assignment.employee.${objEmployee.intEmployeeID}.checkbox`} checked={lstSelectedEmployeeIDs.includes(objEmployee.intEmployeeID)} onChange={(objEvent) => setLstSelectedEmployeeIDs((lstCurrent) => objEvent.target.checked ? [...lstCurrent, objEmployee.intEmployeeID] : lstCurrent.filter((intID) => intID !== objEmployee.intEmployeeID))} /></TableCell><TableCell>{objEmployee.strEmployeeCode}</TableCell><TableCell>{objEmployee.strEmployeeName}</TableCell><TableCell>{objEmployee.strDepartmentName ?? ""}</TableCell><TableCell>{objEmployee.strEmployeeStatus}</TableCell><TableCell>{objEmployee.strCurrentPolicyName ?? t("company_default", "Company Default")}</TableCell><TableCell>{objEmployee.dtCurrentEffectiveFrom ?? ""}</TableCell><TableCell>{objEmployee.dtCurrentEffectiveTo ?? ""}</TableCell></TableRow>)}{!blnLoading && lstAssignmentEmployees.length === 0 ? <TableRow><TableCell colSpan={8} align="center">{t("no_assignment_employees", "No employees found.")}</TableCell></TableRow> : null}</TableBody></Table></Box>{blnLoading ? <Box sx={{ p: 3, textAlign: "center" }}><CircularProgress /></Box> : null}</Box>
      <Box className={styles.tableCard}><Typography fontWeight={800} sx={{ mb: 1 }}>{t("assignment_history", "Assignment History")}</Typography><Box className={styles.tableWrap}><Table size="small" className={styles.table} sx={{ minWidth: 900 }}><TableHead><TableRow>{["Employee","Policy","Effective From","Effective To","Source","Reason"].map((strLabel) => <TableCell key={strLabel}>{t(`table_${strLabel.toLowerCase().replaceAll(" ","_")}`, strLabel)}</TableCell>)}</TableRow></TableHead><TableBody>{lstAssignmentHistory.map((objHistory) => <TableRow key={objHistory.intID}><TableCell>{objHistory.strEmployeeName}</TableCell><TableCell>{objHistory.strPolicyName}</TableCell><TableCell>{objHistory.dtEffectiveFrom}</TableCell><TableCell>{objHistory.dtEffectiveTo ?? ""}</TableCell><TableCell>{objHistory.strSourceType}</TableCell><TableCell>{objHistory.strAssignmentReason ?? ""}</TableCell></TableRow>)}{lstAssignmentHistory.length === 0 ? <TableRow><TableCell colSpan={6} align="center">{t("no_assignment_history", "No assignment history found.")}</TableCell></TableRow> : null}</TableBody></Table></Box></Box>{nodeToast}</Box>;
    return <Box className={styles.page} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "9px !important" }, "& .MuiInputBase-root": { minHeight: 48 }, "& .MuiAlert-root": { borderRadius: "9px !important" } }}>
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      <Box className={styles.controlsCard}><Box className={styles.searchRow} sx={{ gridTemplateColumns: "minmax(280px, 1fr) minmax(190px, .35fr) auto auto !important" }}><TextField data-control-id="attendance.policy.search.input" value={strPolicySearch} onChange={(objEvent) => setStrPolicySearch(objEvent.target.value)} placeholder={t("search_policy", "Search Code or Name")} size="small" /><TextField data-control-id="attendance.policy.status.select" select value={strPolicyStatus} onChange={(objEvent) => setStrPolicyStatus(objEvent.target.value)} label={t("status", "Status")} size="small"><MenuItem value="">{t("all", "All")}</MenuItem><MenuItem value="active">{t("active", "Active")}</MenuItem><MenuItem value="inactive">{t("inactive", "Inactive")}</MenuItem></TextField><Box className={styles.searchActions}><Button data-control-id="attendance.policy.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => void searchPolicies()}>{t("search", "Search")}</Button></Box><Box className={styles.searchActions}><Button data-control-id="attendance.policy.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => void clearPolicySearch()}>{t("clear", "Clear")}</Button></Box></Box></Box>
      <Box className={styles.tableCard}><Box className={styles.tableHeaderActions}><Button data-control-id="attendance.policy.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} disabled={blnReadOnly} onClick={() => void openPolicy(null)}>{t("add_policy", "Add Policy")}</Button><Button data-control-id="attendance.policy.assign.button" className={styles.secondaryButton} startIcon={<GroupAddRoundedIcon />} disabled={blnReadOnly} onClick={() => void openAssignment(null)}>{t("assign_employees", "Assign Employees")}</Button></Box><Box className={styles.tableWrap}><Table className={styles.table}><TableHead><TableRow>{["Actions","Code","Policy Name","Full Day","Half Day","Effective From","Default","Status"].map((strLabel) => <TableCell key={strLabel}>{t(`table_${strLabel.toLowerCase().replaceAll(" ","_")}`,strLabel)}</TableCell>)}</TableRow></TableHead><TableBody>{objPolicyList.lstItems.map((objPolicy) => <TableRow key={objPolicy.intID} hover><TableCell><Stack direction="row" spacing={0.5} alignItems="center"><IconButton controlId={`attendance.policy.${objPolicy.intID}.view.button`} aria-label={t("view_policy", "View attendance policy")} onClick={() => void openPolicy(objPolicy.intID, true)} sx={{ p: 0.5, color: "#2563eb", "& .MuiSvgIcon-root": { fontSize: 20 } }}><VisibilityRoundedIcon /></IconButton><IconButton controlId={`attendance.policy.${objPolicy.intID}.edit.button`} aria-label={t("edit_policy", "Edit attendance policy")} disabled={blnReadOnly} onClick={() => void openPolicy(objPolicy.intID)} sx={{ p: 0.5, color: "#17639b", "& .MuiSvgIcon-root": { fontSize: 20 } }}><EditRoundedIcon /></IconButton><IconButton controlId={`attendance.policy.${objPolicy.intID}.assign.button`} aria-label={t("assign_employees", "Assign employees")} disabled={blnReadOnly} onClick={() => void openAssignment(objPolicy.intID)} sx={{ p: 0.5, color: "#0f766e", "& .MuiSvgIcon-root": { fontSize: 20 } }}><GroupAddRoundedIcon /></IconButton></Stack></TableCell><TableCell>{objPolicy.strPolicyCode}</TableCell><TableCell>{objPolicy.strPolicyName}</TableCell><TableCell>{objPolicy.decFullDayThresholdHours}</TableCell><TableCell>{objPolicy.decHalfDayThresholdHours}</TableCell><TableCell>{objPolicy.dtEffectiveFrom}</TableCell><TableCell>{objPolicy.blnIsDefault ? t("yes","Yes") : t("no","No")}</TableCell><TableCell><Chip size="small" color={objPolicy.blnIsActive ? "success" : "default"} label={objPolicy.blnIsActive ? t("active", "Active") : t("inactive", "Inactive")} /></TableCell></TableRow>)}{!blnLoading && objPolicyList.lstItems.length === 0 ? <TableRow><TableCell colSpan={8} align="center">{t("no_policies","No attendance policies found.")}</TableCell></TableRow> : null}</TableBody></Table></Box>{blnLoading ? <Box sx={{ p: 3, textAlign: "center" }}><CircularProgress /></Box> : null}</Box>{nodeToast}</Box>;
  }

  return <Box className={styles.page} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "9px !important" }, "& .MuiInputBase-root": { minHeight: 48 }, "& .MuiAlert-root": { borderRadius: "9px !important" } }}>
    {strError ? <Alert severity="error">{strError}</Alert> : null}
    <>
      <Box className={styles.controlsCard}><Box className={styles.searchRow} sx={{ gridTemplateColumns: "165px minmax(190px,.65fr) minmax(190px,.65fr) minmax(260px,1.3fr) auto auto !important" }}><TextField data-control-id="attendance.daily.date.input" type="date" InputLabelProps={{ shrink: true }} label={t("date","Date")} value={strDate} onChange={(objEvent) => setStrDate(objEvent.target.value)} size="small" /><TextField data-control-id="attendance.daily.department.select" select label={t("department","Department")} value={strDepartment} onChange={(objEvent) => setStrDepartment(objEvent.target.value)} size="small"><MenuItem value="">{t("all","All")}</MenuItem>{lstDepartments.map(([intID,strName]) => <MenuItem key={intID} value={intID ?? ""}>{strName}</MenuItem>)}</TextField><TextField data-control-id="attendance.daily.location.select" select label={t("location","Location")} value={strLocation} onChange={(objEvent) => setStrLocation(objEvent.target.value)} size="small"><MenuItem value="">{t("all","All")}</MenuItem>{lstLocations.map(([intID,strName]) => <MenuItem key={intID} value={intID}>{strName}</MenuItem>)}</TextField><TextField data-control-id="attendance.daily.employee-search.input" placeholder={t("employee_search","Employee Code or Name")} value={strEmployeeSearch} onChange={(objEvent) => setStrEmployeeSearch(objEvent.target.value)} size="small" /><Box className={styles.searchActions}><Button data-control-id="attendance.daily.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => void searchDaily()}>{t("search","Search")}</Button></Box><Box className={styles.searchActions}><Button data-control-id="attendance.daily.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => void clearDailySearch()}>{t("clear","Clear")}</Button></Box></Box><Alert severity="info" sx={{ mt: 1 }}>{t("cross_midnight_notice","Cross-midnight attendance is outside the current POC and will be rejected.")}</Alert></Box>
      <Box className={styles.tableCard}><Box className={styles.tableHeaderActions}><Button data-control-id="attendance.daily.save-all.button" className={styles.primaryButton} startIcon={<SaveRoundedIcon />} disabled={blnReadOnly || !blnDirty || blnSaving} onClick={() => void saveAll()}>{t("save_all","Save All")}</Button><Button data-control-id="attendance.daily.fill-month.button" className={styles.secondaryButton} startIcon={<AddRoundedIcon />} disabled={blnReadOnly || blnSaving} onClick={openFillDialog}>{t("fill_month","Fill Month")}</Button></Box><Box className={styles.tableWrap}><Table size="small" className={styles.table} sx={{ minWidth: 1650 }}><TableHead><TableRow>{["Employee Code","Employee Name","Department","Location","Status","First IN","Last OUT","Worked Hours","Late Minutes","OT Hours","Paid","Remarks"].map((strLabel) => <TableCell key={strLabel}>{t(`table_${strLabel.toLowerCase().replaceAll(" ","_")}`,strLabel)}</TableCell>)}</TableRow></TableHead><TableBody>{lstEditableRows.map((objRow,intIndex) => { const blnPunchDisabled = setPunchlessStatuses.has(objRow.strStatus ?? ""); return <TableRow key={objRow.intEmployeeID} sx={dicRowErrors[intIndex] ? { backgroundColor: "error.lighter" } : undefined}><TableCell>{objRow.strEmployeeCode}</TableCell><TableCell>{objRow.strEmployeeName}{dicRowErrors[intIndex] ? <Typography color="error" variant="caption" display="block">{dicRowErrors[intIndex]}</Typography> : null}</TableCell><TableCell>{objRow.strDepartmentName}</TableCell><TableCell>{objRow.strLocationName}</TableCell><TableCell><TextField controlId={`attendance.daily.${objRow.intEmployeeID}.status.select`} select size="small" value={objRow.strStatus ?? "absent"} onChange={(objEvent) => updateRow(intIndex,"strStatus",objEvent.target.value)} disabled={blnReadOnly} sx={{ minWidth: 120 }}>{lstStatuses.map((strStatus) => <MenuItem key={strStatus} value={strStatus}>{t(`status_${strStatus}`,strStatus.replaceAll("_"," "))}</MenuItem>)}</TextField></TableCell><TableCell><TextField controlId={`attendance.daily.${objRow.intEmployeeID}.first-in.input`} type="time" size="small" disabled={blnReadOnly || blnPunchDisabled} value={objRow.strFirstIn ?? ""} onChange={(objEvent) => updateRow(intIndex,"strFirstIn",objEvent.target.value || null)} sx={{ width: 125 }} /></TableCell><TableCell><TextField controlId={`attendance.daily.${objRow.intEmployeeID}.last-out.input`} type="time" size="small" disabled={blnReadOnly || blnPunchDisabled} value={objRow.strLastOut ?? ""} onChange={(objEvent) => updateRow(intIndex,"strLastOut",objEvent.target.value || null)} sx={{ width: 125 }} /></TableCell>{([['decWorkedHours',.25],['intLateMinutes',1],['decOtHours',.25]] as const).map(([strField,fltStep]) => <TableCell key={strField}><TextField controlId={`attendance.daily.${objRow.intEmployeeID}.${strField}.input`} type="number" size="small" disabled={blnReadOnly} value={objRow[strField]} inputProps={{ min: 0, step: fltStep }} onChange={(objEvent) => updateRow(intIndex,strField,Number(objEvent.target.value))} sx={{ width: 110 }} /></TableCell>)}<TableCell><Checkbox controlId={`attendance.daily.${objRow.intEmployeeID}.paid.checkbox`} disabled={blnReadOnly} checked={objRow.blnIsPaid} onChange={(objEvent) => updateRow(intIndex,"blnIsPaid",objEvent.target.checked)} /></TableCell><TableCell><TextField controlId={`attendance.daily.${objRow.intEmployeeID}.remarks.input`} size="small" disabled={blnReadOnly} value={objRow.strRemark ?? ""} onChange={(objEvent) => updateRow(intIndex,"strRemark",objEvent.target.value || null)} sx={{ minWidth: 190 }} /></TableCell></TableRow>; })}{!blnLoading && lstEditableRows.length === 0 ? <TableRow><TableCell colSpan={12} align="center">{t("load_daily_prompt","Select filters and load employees for the date.")}</TableCell></TableRow> : null}</TableBody></Table></Box>{blnLoading ? <Box sx={{ p: 3, textAlign: "center" }}><CircularProgress /></Box> : null}</Box>
    </>
    <CommonMasterDialog blnOpen={blnFillDialogOpen} strTitle={t("fill_month_title","Fill Attendance for a Date Range")} nodeContent={nodeFillDialogContent} strSecondaryLabel={t("cancel","Cancel")} onClose={() => setBlnFillDialogOpen(false)} strPrimaryLabel={t("fill_month_submit","Fill Days")} onPrimaryAction={() => void submitFillRange()} blnPrimaryDisabled={blnFillSubmitting || !intFillEmployeeID} maxWidth="sm" rootControlId="attendance.daily.fill-month.dialog" cancelButtonControlId="attendance.daily.fill-month.dialog.cancel.button" primaryButtonControlId="attendance.daily.fill-month.dialog.submit.button" titleSx={{ px: 2.5, py: 1.5 }} contentSx={{ px: 2.5, py: 1.25 }} />
    <Snackbar controlId="attendance.notification" open={objToast.blnOpen} autoHideDuration={5000} onClose={() => setObjToast((objCurrent) => ({ ...objCurrent, blnOpen: false }))}><Alert severity={objToast.strSeverity}>{objToast.strMessage}</Alert></Snackbar>
  </Box>;
}
