"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
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
import { useAttendancePoc } from "@/features/attendance/hooks/useAttendancePoc";
import type { AttendancePolicy, AttendancePolicyFormValues, DailyAttendanceRow, DailyAttendanceSaveRow } from "@/features/attendance/types";
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
}).test("thresholds", "Threshold order must be Full Day ≥ Half Day ≥ Absent.", (objValue) => !objValue || (objValue.decFullDayThresholdHours >= objValue.decHalfDayThresholdHours && objValue.decHalfDayThresholdHours >= objValue.decAbsentThresholdHours))
  .test("dates", "Effective To cannot be before Effective From.", (objValue) => !objValue?.dtEffectiveTo || objValue.dtEffectiveTo >= objValue.dtEffectiveFrom);

function getEmptyPolicy(): AttendancePolicyFormValues {
  return { intCompanyID: authHelpers.getCompanyID(), strPolicyCode: "", strPolicyName: "", strDescription: null, intLocationID: null, intGradeID: null, intEmploymentTypeID: null,
    intLateGraceMinutes: 0, intEarlyDepartureGraceMinutes: 0, decFullDayThresholdHours: 8, decHalfDayThresholdHours: 4, decAbsentThresholdHours: 0,
    blnInPunchRequired: true, blnOutPunchRequired: true, strMissingPunchTreatmentCode: "EXCEPTION", intWorkHoursRoundingMinutes: 0,
    blnOtEnabled: false, decOtMinHours: 0, strLateDeductionRule: null, strWeeklyOffPattern: "0000011", blnIsDefault: false,
    dtEffectiveFrom: strToday, dtEffectiveTo: null, blnIsActive: true, strRemarks: null };
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
  const { objPolicyList, lstDailyRows, blnLoading, blnSaving, strError, loadPolicies, getPolicy, savePolicy, setPolicyStatus, loadDaily, saveDaily } = useAttendancePoc(strView === "policy");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false); const [intPolicyID, setIntPolicyID] = useState<number | null>(null);
  const [strPolicySearch, setStrPolicySearch] = useState(""); const [strPolicyStatus, setStrPolicyStatus] = useState("");
  const [strDate, setStrDate] = useState(strToday); const [strEmployeeSearch, setStrEmployeeSearch] = useState("");
  const [strDepartment, setStrDepartment] = useState(""); const [strLocation, setStrLocation] = useState("");
  const [lstEditableRows, setLstEditableRows] = useState<DailyAttendanceRow[]>([]); const [blnDirty, setBlnDirty] = useState(false);
  const [dicRowErrors, setDicRowErrors] = useState<Record<number, string>>({}); const [objToast, setObjToast] = useState({ blnOpen: false, strMessage: "", strSeverity: "success" as "success" | "error" });
  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<AttendancePolicyFormValues>({ resolver: yupResolver(objPolicySchema) as Resolver<AttendancePolicyFormValues>, defaultValues: getEmptyPolicy() });
  const strPattern = watch("strWeeklyOffPattern"); const blnOtEnabled = watch("blnOtEnabled");

  const lstDepartments = useMemo(() => Array.from(new Map(lstDailyRows.filter((objRow) => objRow.intDepartmentID).map((objRow) => [objRow.intDepartmentID, objRow.strDepartmentName])).entries()), [lstDailyRows]);
  const lstLocations = useMemo(() => Array.from(new Map(lstDailyRows.filter((objRow) => objRow.intLocationID).map((objRow) => [objRow.intLocationID, objRow.strLocationName])).entries()), [lstDailyRows]);

  useEffect(() => { setLstEditableRows(lstDailyRows); setBlnDirty(false); }, [lstDailyRows]);
  useEffect(() => { if (strView === "daily") void loadDaily({ strDate }); }, [strView]);
  useEffect(() => { const fnWarn = (objEvent: BeforeUnloadEvent) => { if (blnDirty) objEvent.preventDefault(); }; window.addEventListener("beforeunload", fnWarn); return () => window.removeEventListener("beforeunload", fnWarn); }, [blnDirty]);

  function showToast(strMessage: string, strSeverity: "success" | "error") { setObjToast({ blnOpen: true, strMessage, strSeverity }); }
  async function openPolicy(intID: number | null) { setIntPolicyID(intID); reset(intID ? await getPolicy(intID) : getEmptyPolicy()); setBlnDialogOpen(true); }
  async function submitPolicy(objValues: AttendancePolicyFormValues) { try { await savePolicy(intPolicyID, { ...objValues, decOtMinHours: objValues.blnOtEnabled ? objValues.decOtMinHours : 0 }); setBlnDialogOpen(false); await loadPolicies({ strSearch: strPolicySearch, blnIsActive: strPolicyStatus === "" ? undefined : strPolicyStatus === "active", intPage: 1, intPageSize: 10 }); showToast(t("policy_saved", "Attendance policy saved."), "success"); } catch (objError) { showToast(objError instanceof Error ? objError.message : t("save_failed", "Save failed."), "error"); } }
  async function searchPolicies() { await loadPolicies({ strSearch: strPolicySearch, blnIsActive: strPolicyStatus === "" ? undefined : strPolicyStatus === "active", intPage: 1, intPageSize: 10 }); }
  async function searchDaily() { await loadDaily({ strDate, intDepartmentID: strDepartment ? Number(strDepartment) : undefined, intLocationID: strLocation ? Number(strLocation) : undefined, strSearch: strEmployeeSearch }); }
  function updateRow(intIndex: number, strField: keyof DailyAttendanceRow, objValue: string | number | boolean | null) { setLstEditableRows((lstCurrent) => lstCurrent.map((objRow, intRowIndex) => intRowIndex === intIndex ? { ...objRow, [strField]: objValue } : objRow)); setBlnDirty(true); setDicRowErrors((dicCurrent) => ({ ...dicCurrent, [intIndex]: "" })); }
  async function saveAll() { try { const objResult = await saveDaily(strDate, lstEditableRows.map(toSaveRow)); const dicErrors: Record<number, string> = {}; objResult.lstResults.filter((objResultRow) => !objResultRow.blnValid).forEach((objResultRow) => { dicErrors[objResultRow.intRowIndex] = objResultRow.strMessage ?? t("invalid_row", "Invalid row"); }); setDicRowErrors(dicErrors); if (objResult.blnSaved) { setBlnDirty(false); showToast(t("attendance_saved", `${objResult.intSavedCount} attendance rows saved.`), "success"); await searchDaily(); } else showToast(t("validation_failed", "Validation failed. No rows were saved."), "error"); } catch (objError) { showToast(objError instanceof Error ? objError.message : t("save_failed", "Save failed."), "error"); } }

  const lstManagementActions = Array.from(new Set([
    ...(objRights.dicAllowedActions.ATTENDANCE_MANAGEMENT ?? []),
    ...(objRights.dicAllowedActions.ATTENDANCE_POLICY ?? []),
    ...(objRights.dicAllowedActions.DAILY_ATTENDANCE ?? []),
    ...(objRights.dicAllowedActions.ATTENDANCE ?? []),
  ]));
  const blnCanView = lstManagementActions.includes("view") || lstManagementActions.includes("attendance_view");
  const blnCanManage = lstManagementActions.includes("manage") || lstManagementActions.includes("attendance_manage");
  if (blnRightsLoading) return <Box sx={{ display: "grid", placeItems: "center", py: 8 }}><CircularProgress /></Box>;
  if (!blnCanView) return <Alert severity="warning">{t("permission_denied", "Attendance Management access is not available for your user group. Sign in with an HR or Administrator account.")}</Alert>;
  const blnReadOnly = !blnCanManage;

  const nodePolicyForm = <Stack spacing={2} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "4px" }, "& .MuiButton-root": { borderRadius: "4px" } }}>
    <Typography variant="subtitle1" fontWeight={800}>{t("general", "General")}</Typography>
    <Grid container spacing={1.5}>
      <Grid item xs={12} md={3}><Controller name="strPolicyCode" control={control} render={({ field }) => <TextField {...field} controlId="attendance.policy.code.input" label={t("policy_code", "Policy Code")} required fullWidth error={!!errors.strPolicyCode} helperText={errors.strPolicyCode?.message} />} /></Grid>
      <Grid item xs={12} md={5}><Controller name="strPolicyName" control={control} render={({ field }) => <TextField {...field} value={field.value ?? ""} controlId="attendance.policy.name.input" label={t("policy_name", "Policy Name")} required fullWidth error={!!errors.strPolicyName} helperText={errors.strPolicyName?.message} />} /></Grid>
      <Grid item xs={12} md={4}><TextField controlId="attendance.policy.company.input" label={t("company", "Company")} value={authHelpers.getCompanyID() ?? ""} disabled fullWidth /></Grid>
      <Grid item xs={12}><Controller name="strDescription" control={control} render={({ field }) => <TextField {...field} value={field.value ?? ""} controlId="attendance.policy.description.input" label={t("description", "Description")} fullWidth multiline minRows={2} />} /></Grid>
    </Grid>
    <Typography variant="subtitle1" fontWeight={800}>{t("working_hours", "Working Hours")}</Typography>
    <Grid container spacing={1.5}>{([['decFullDayThresholdHours','full_day_threshold','Full-day Threshold'],['decHalfDayThresholdHours','half_day_threshold','Half-day Threshold'],['decAbsentThresholdHours','absent_threshold','Absent Threshold']] as const).map(([strName,strKey,strLabel]) => <Grid item xs={12} md={4} key={strName}><Controller name={strName} control={control} render={({ field }) => <TextField {...field} controlId={`attendance.policy.${strName}.input`} label={t(strKey,strLabel)} type="number" fullWidth error={!!errors[strName]} inputProps={{ min: 0, step: .25 }} />} /></Grid>)}</Grid>
    {errors.root?.message ? <Alert severity="error">{errors.root.message}</Alert> : null}
    <Typography variant="subtitle1" fontWeight={800}>{t("punch_rules", "Punch Rules")}</Typography>
    <Grid container spacing={1.5}>
      <Grid item xs={12} md={3}><Controller name="blnInPunchRequired" control={control} render={({ field }) => <FormControlLabel control={<Switch controlId="attendance.policy.in-required.switch" checked={field.value} onChange={field.onChange} />} label={t("in_required", "IN Required")} />} /></Grid>
      <Grid item xs={12} md={3}><Controller name="blnOutPunchRequired" control={control} render={({ field }) => <FormControlLabel control={<Switch controlId="attendance.policy.out-required.switch" checked={field.value} onChange={field.onChange} />} label={t("out_required", "OUT Required")} />} /></Grid>
      <Grid item xs={12} md={3}><Controller name="intLateGraceMinutes" control={control} render={({ field }) => <TextField {...field} controlId="attendance.policy.late-grace.input" label={t("late_grace", "Late Grace (min)")} type="number" fullWidth />} /></Grid>
      <Grid item xs={12} md={3}><Controller name="intEarlyDepartureGraceMinutes" control={control} render={({ field }) => <TextField {...field} controlId="attendance.policy.early-grace.input" label={t("early_grace", "Early Departure Grace")} type="number" fullWidth />} /></Grid>
      <Grid item xs={12} md={6}><Controller name="strMissingPunchTreatmentCode" control={control} render={({ field }) => <TextField {...field} controlId="attendance.policy.missing-punch.select" select label={t("missing_punch", "Missing-punch Treatment")} fullWidth>{["EXCEPTION","ABSENT","HALF_DAY","IGNORE"].map((strValue) => <MenuItem key={strValue} value={strValue}>{t(`missing_${strValue.toLowerCase()}`, strValue.replace("_", " "))}</MenuItem>)}</TextField>} /></Grid>
      <Grid item xs={12} md={6}><Controller name="intWorkHoursRoundingMinutes" control={control} render={({ field }) => <TextField {...field} controlId="attendance.policy.rounding.input" label={t("rounding", "Work-hour Rounding (min)")} type="number" fullWidth />} /></Grid>
    </Grid>
    <Typography variant="subtitle1" fontWeight={800}>{t("overtime", "Overtime")}</Typography>
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}><Controller name="blnOtEnabled" control={control} render={({ field }) => <FormControlLabel control={<Switch controlId="attendance.policy.ot.switch" checked={field.value} onChange={field.onChange} />} label={t("overtime_enabled", "Overtime Enabled")} />} /><Controller name="decOtMinHours" control={control} render={({ field }) => <TextField {...field} controlId="attendance.policy.ot-min.input" disabled={!blnOtEnabled} label={t("minimum_overtime", "Minimum OT Hours")} type="number" />} /></Stack>
    <Typography variant="subtitle1" fontWeight={800}>{t("weekly_off", "Weekly Off")}</Typography>
    <Stack direction="row" flexWrap="wrap">{lstWeekdays.map((strDay,intIndex) => <FormControlLabel key={strDay} control={<Checkbox controlId={`attendance.policy.weekly-off.${intIndex}.checkbox`} checked={strPattern[intIndex] === "1"} onChange={(objEvent) => { const lstPattern = strPattern.split(""); lstPattern[intIndex] = objEvent.target.checked ? "1" : "0"; setValue("strWeeklyOffPattern", lstPattern.join(""), { shouldDirty: true }); }} />} label={t(`weekday_${strDay.toLowerCase()}`,strDay)} />)}</Stack>
    <Typography color="text.secondary">{t("weekly_off_preview", "Weekly off")}: {lstWeekdays.filter((_,intIndex) => strPattern[intIndex] === "1").join(", ") || t("none", "None")}</Typography>
    <Typography variant="subtitle1" fontWeight={800}>{t("effective_dates_status", "Effective Dates and Status")}</Typography>
    <Grid container spacing={1.5}><Grid item xs={12} md={4}><Controller name="dtEffectiveFrom" control={control} render={({ field }) => <TextField {...field} controlId="attendance.policy.effective-from.input" type="date" label={t("effective_from", "Effective From")} InputLabelProps={{ shrink: true }} fullWidth />} /></Grid><Grid item xs={12} md={4}><Controller name="dtEffectiveTo" control={control} render={({ field }) => <TextField {...field} value={field.value ?? ""} controlId="attendance.policy.effective-to.input" type="date" label={t("effective_to", "Effective To")} InputLabelProps={{ shrink: true }} fullWidth />} /></Grid><Grid item xs={12} md={4}><Stack direction="row"><Controller name="blnIsDefault" control={control} render={({ field }) => <FormControlLabel control={<Switch controlId="attendance.policy.default.switch" checked={field.value} onChange={field.onChange} />} label={t("default_policy", "Default")} />} /><Controller name="blnIsActive" control={control} render={({ field }) => <FormControlLabel control={<Switch controlId="attendance.policy.active.switch" checked={field.value} onChange={field.onChange} />} label={t("active", "Active")} />} /></Stack></Grid><Grid item xs={12}><Controller name="strRemarks" control={control} render={({ field }) => <TextField {...field} value={field.value ?? ""} controlId="attendance.policy.remarks.input" label={t("remarks", "Remarks")} fullWidth multiline minRows={2} />} /></Grid></Grid>
  </Stack>;

  return <Stack spacing={1.5} sx={{ "& .MuiPaper-root": { borderRadius: "4px !important" }, "& .MuiOutlinedInput-root": { borderRadius: "4px !important" }, "& .MuiButton-root": { borderRadius: "4px !important" }, "& .MuiAlert-root": { borderRadius: "4px !important" } }}>
    {strError ? <Alert severity="error">{strError}</Alert> : null}
    {strView === "policy" ? <>
      <Paper sx={{ p: 1.5, borderRadius: 3 }}><Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} spacing={1}><TextField controlId="attendance.policy.search.input" value={strPolicySearch} onChange={(objEvent) => setStrPolicySearch(objEvent.target.value)} label={t("search_policy", "Search Code or Name")} fullWidth /><TextField controlId="attendance.policy.status.select" select value={strPolicyStatus} onChange={(objEvent) => setStrPolicyStatus(objEvent.target.value)} label={t("status", "Status")} sx={{ minWidth: 180 }}><MenuItem value="">{t("all", "All")}</MenuItem><MenuItem value="active">{t("active", "Active")}</MenuItem><MenuItem value="inactive">{t("inactive", "Inactive")}</MenuItem></TextField><Button controlId="attendance.policy.search.button" variant="contained" onClick={() => void searchPolicies()} sx={{ height: 50, minWidth: 96, whiteSpace: "nowrap" }}>{t("search", "Search")}</Button><Button controlId="attendance.policy.add.button" variant="contained" startIcon={<AddRoundedIcon />} disabled={blnReadOnly} onClick={() => void openPolicy(null)} sx={{ height: 50, minWidth: 132, whiteSpace: "nowrap" }}>{t("add_policy", "Add Policy")}</Button></Stack></Paper>
      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}><Box sx={{ overflowX: "auto" }}><Table><TableHead><TableRow>{["Actions","Code","Policy Name","Full Day","Half Day","Effective From","Default","Status"].map((strLabel) => <TableCell key={strLabel} sx={{ fontWeight: 800 }}>{t(`table_${strLabel.toLowerCase().replaceAll(" ","_")}`,strLabel)}</TableCell>)}</TableRow></TableHead><TableBody>{objPolicyList.lstItems.map((objPolicy) => <TableRow key={objPolicy.intID} hover><TableCell><IconButton controlId={`attendance.policy.${objPolicy.intID}.edit.button`} disabled={blnReadOnly} onClick={() => void openPolicy(objPolicy.intID)}><EditRoundedIcon /></IconButton></TableCell><TableCell>{objPolicy.strPolicyCode}</TableCell><TableCell>{objPolicy.strPolicyName}</TableCell><TableCell>{objPolicy.decFullDayThresholdHours}</TableCell><TableCell>{objPolicy.decHalfDayThresholdHours}</TableCell><TableCell>{objPolicy.dtEffectiveFrom}</TableCell><TableCell>{objPolicy.blnIsDefault ? t("yes","Yes") : t("no","No")}</TableCell><TableCell><Switch controlId={`attendance.policy.${objPolicy.intID}.status.switch`} disabled={blnReadOnly} checked={objPolicy.blnIsActive} onChange={async (_,blnChecked) => { try { await setPolicyStatus(objPolicy.intID,blnChecked); await searchPolicies(); } catch (objError) { showToast(objError instanceof Error ? objError.message : t("status_failed","Status update failed."),"error"); } }} /></TableCell></TableRow>)}{!blnLoading && objPolicyList.lstItems.length === 0 ? <TableRow><TableCell colSpan={8} align="center">{t("no_policies","No attendance policies found.")}</TableCell></TableRow> : null}</TableBody></Table></Box>{blnLoading ? <Box sx={{ p: 3, textAlign: "center" }}><CircularProgress /></Box> : null}</Paper>
    </> : <>
      <Paper sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 3 }}><Stack direction={{ xs: "column", xl: "row" }} alignItems={{ xl: "center" }} spacing={1.25}><TextField controlId="attendance.daily.date.input" type="date" InputLabelProps={{ shrink: true }} label={t("date","Date")} value={strDate} onChange={(objEvent) => setStrDate(objEvent.target.value)} sx={{ minWidth: 160 }} /><TextField controlId="attendance.daily.company.input" disabled label={t("company","Company")} value={authHelpers.getCompanyID() ?? ""} sx={{ minWidth: 145 }} /><TextField controlId="attendance.daily.department.select" select label={t("department","Department")} value={strDepartment} onChange={(objEvent) => setStrDepartment(objEvent.target.value)} sx={{ minWidth: 195 }}><MenuItem value="">{t("all","All")}</MenuItem>{lstDepartments.map(([intID,strName]) => <MenuItem key={intID} value={intID ?? ""}>{strName}</MenuItem>)}</TextField><TextField controlId="attendance.daily.location.select" select label={t("location","Location")} value={strLocation} onChange={(objEvent) => setStrLocation(objEvent.target.value)} sx={{ minWidth: 195 }}><MenuItem value="">{t("all","All")}</MenuItem>{lstLocations.map(([intID,strName]) => <MenuItem key={intID} value={intID}>{strName}</MenuItem>)}</TextField><TextField controlId="attendance.daily.employee-search.input" label={t("employee_search","Employee Code or Name")} value={strEmployeeSearch} onChange={(objEvent) => setStrEmployeeSearch(objEvent.target.value)} fullWidth sx={{ minWidth: 260 }} /><Button controlId="attendance.daily.load.button" variant="contained" onClick={() => void searchDaily()} sx={{ minWidth: 96, height: 50, whiteSpace: "nowrap" }}>{t("load","Load")}</Button><Button controlId="attendance.daily.save-all.button" variant="contained" startIcon={<SaveRoundedIcon />} disabled={blnReadOnly || !blnDirty || blnSaving} onClick={() => void saveAll()} sx={{ minWidth: 128, height: 50, whiteSpace: "nowrap" }}>{t("save_all","Save All")}</Button></Stack><Alert severity="info" sx={{ mt: 1.5 }}>{t("cross_midnight_notice","Cross-midnight attendance is outside the current POC and will be rejected.")}</Alert></Paper>
      <Paper sx={{ borderRadius: 3, overflow: "hidden", mx: { xs: 0.5, md: 0 } }}><Box sx={{ overflowX: "auto", px: 1.5 }}><Table size="small" sx={{ minWidth: 1650, "& th": { fontWeight: 800, whiteSpace: "nowrap", py: 1.75 }, "& td": { py: 1.1, verticalAlign: "middle" }, "& th:first-of-type, & td:first-of-type": { pl: 1.5, minWidth: 135 }, "& th:last-of-type, & td:last-of-type": { pr: 1.5 } }}><TableHead><TableRow>{["Employee Code","Employee Name","Department","Location","Status","First IN","Last OUT","Worked Hours","Late Minutes","OT Hours","Paid","Remarks"].map((strLabel) => <TableCell key={strLabel}>{t(`table_${strLabel.toLowerCase().replaceAll(" ","_")}`,strLabel)}</TableCell>)}</TableRow></TableHead><TableBody>{lstEditableRows.map((objRow,intIndex) => { const blnPunchDisabled = setPunchlessStatuses.has(objRow.strStatus ?? ""); return <TableRow key={objRow.intEmployeeID} sx={dicRowErrors[intIndex] ? { backgroundColor: "error.lighter" } : undefined}><TableCell>{objRow.strEmployeeCode}</TableCell><TableCell>{objRow.strEmployeeName}{dicRowErrors[intIndex] ? <Typography color="error" variant="caption" display="block">{dicRowErrors[intIndex]}</Typography> : null}</TableCell><TableCell>{objRow.strDepartmentName}</TableCell><TableCell>{objRow.strLocationName}</TableCell><TableCell><TextField controlId={`attendance.daily.${objRow.intEmployeeID}.status.select`} select size="small" value={objRow.strStatus ?? "absent"} onChange={(objEvent) => updateRow(intIndex,"strStatus",objEvent.target.value)} disabled={blnReadOnly} sx={{ minWidth: 120 }}>{lstStatuses.map((strStatus) => <MenuItem key={strStatus} value={strStatus}>{t(`status_${strStatus}`,strStatus.replaceAll("_"," "))}</MenuItem>)}</TextField></TableCell><TableCell><TextField controlId={`attendance.daily.${objRow.intEmployeeID}.first-in.input`} type="time" size="small" disabled={blnReadOnly || blnPunchDisabled} value={objRow.strFirstIn ?? ""} onChange={(objEvent) => updateRow(intIndex,"strFirstIn",objEvent.target.value || null)} sx={{ width: 125 }} /></TableCell><TableCell><TextField controlId={`attendance.daily.${objRow.intEmployeeID}.last-out.input`} type="time" size="small" disabled={blnReadOnly || blnPunchDisabled} value={objRow.strLastOut ?? ""} onChange={(objEvent) => updateRow(intIndex,"strLastOut",objEvent.target.value || null)} sx={{ width: 125 }} /></TableCell>{([['decWorkedHours',.25],['intLateMinutes',1],['decOtHours',.25]] as const).map(([strField,fltStep]) => <TableCell key={strField}><TextField controlId={`attendance.daily.${objRow.intEmployeeID}.${strField}.input`} type="number" size="small" disabled={blnReadOnly} value={objRow[strField]} inputProps={{ min: 0, step: fltStep }} onChange={(objEvent) => updateRow(intIndex,strField,Number(objEvent.target.value))} sx={{ width: 110 }} /></TableCell>)}<TableCell><Checkbox controlId={`attendance.daily.${objRow.intEmployeeID}.paid.checkbox`} disabled={blnReadOnly} checked={objRow.blnIsPaid} onChange={(objEvent) => updateRow(intIndex,"blnIsPaid",objEvent.target.checked)} /></TableCell><TableCell><TextField controlId={`attendance.daily.${objRow.intEmployeeID}.remarks.input`} size="small" disabled={blnReadOnly} value={objRow.strRemark ?? ""} onChange={(objEvent) => updateRow(intIndex,"strRemark",objEvent.target.value || null)} sx={{ minWidth: 190 }} /></TableCell></TableRow>; })}{!blnLoading && lstEditableRows.length === 0 ? <TableRow><TableCell colSpan={12} align="center">{t("load_daily_prompt","Select filters and load employees for the date.")}</TableCell></TableRow> : null}</TableBody></Table></Box>{blnLoading ? <Box sx={{ p: 3, textAlign: "center" }}><CircularProgress /></Box> : null}</Paper>
    </>}
    <CommonMasterDialog blnOpen={blnDialogOpen} strTitle={intPolicyID ? t("edit_policy","Edit Attendance Policy") : t("add_policy","Add Attendance Policy")} nodeContent={nodePolicyForm} strSecondaryLabel={t("cancel","Cancel")} onClose={() => setBlnDialogOpen(false)} strPrimaryLabel={t("save","Save")} onPrimaryAction={() => void handleSubmit(submitPolicy)()} blnPrimaryDisabled={blnSaving} maxWidth="lg" rootControlId="attendance.policy.dialog" cancelButtonControlId="attendance.policy.dialog.cancel.button" primaryButtonControlId="attendance.policy.dialog.save.button" paperSx={{ borderRadius: "4px" }} contentSx={{ maxHeight: "72vh" }} />
    <Snackbar controlId="attendance.notification" open={objToast.blnOpen} autoHideDuration={5000} onClose={() => setObjToast((objCurrent) => ({ ...objCurrent, blnOpen: false }))}><Alert severity={objToast.strSeverity}>{objToast.strMessage}</Alert></Snackbar>
  </Stack>;
}
