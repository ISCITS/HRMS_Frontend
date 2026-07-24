"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormHelperText, Grid, IconButton, InputAdornment, LinearProgress,
  MenuItem, Paper, Skeleton, Snackbar, Stack, Table, TableBody, TableCell,
  TableHead, TablePagination, TableRow, TextField, Tooltip, Typography,
  useMediaQuery, useTheme,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch, type Control, type FieldErrors, type Resolver } from "react-hook-form";
import * as yup from "yup";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useEssLeaveApplication } from "@/features/leave/hooks/useEssLeaveApplication";
import {
  formatLeaveDate, getLeaveTypeBadge, LEAVE_STATUS_COLORS,
  type LeaveApplicationAttachmentDto, type LeaveApplicationDto,
  type LeaveApplyRequest, type LeavePreviewDto,
  type LeaveTypeAggregate, type LeaveTypeDto, type LeaveValidationMessage,
} from "@/features/leave/types";
import { useActionRights } from "@/features/security/hooks/useActionRights";

type LeaveFormValues = {
  intLeaveTypeID: number;
  dtFromDate: string;
  dtToDate: string;
  strFirstSession: "full" | "half";
  strLastSession: "full" | "half";
  strReason: string;
  strContactDuringLeave: string;
  strBackupEmployee: string;
};

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };
type ConfirmState = { strKind: "submit" } | { strKind: "withdraw"; intApplicationID: number } | null;
type LabelFunction = (strKey: string, strFallback?: string) => string;

const objFormSchema: yup.ObjectSchema<LeaveFormValues> = yup.object({
  intLeaveTypeID: yup.number().integer().positive("Select a Leave Type.").required("Select a Leave Type."),
  dtFromDate: yup.string().required("From Date is required."),
  dtToDate: yup.string().required("To Date is required.").test(
    "date-order", "To Date cannot be earlier than From Date.",
    function fnValidateDateOrder(strValue) {
      return !strValue || !this.parent.dtFromDate || strValue >= this.parent.dtFromDate;
    },
  ),
  strFirstSession: yup.mixed<"full" | "half">().oneOf(["full", "half"]).required(),
  strLastSession: yup.mixed<"full" | "half">().oneOf(["full", "half"]).required(),
  strReason: yup.string().trim().max(1000, "Reason cannot exceed 1000 characters.").default(""),
  strContactDuringLeave: yup.string().trim().max(250, "Contact details cannot exceed 250 characters.").default(""),
  strBackupEmployee: yup.string().trim().max(250, "Backup employee cannot exceed 250 characters.").default(""),
});

const lstStatusOptions = ["all", "draft", "pending", "approved", "rejected", "withdrawn", "cancelled"];

function fnTodayISO() { return new Date().toISOString().slice(0, 10); }

function fnDefaultForm(intLeaveTypeID = 0): LeaveFormValues {
  return {
    intLeaveTypeID, dtFromDate: fnTodayISO(), dtToDate: fnTodayISO(),
    strFirstSession: "full", strLastSession: "full", strReason: "",
    strContactDuringLeave: "", strBackupEmployee: "",
  };
}

function fnBuildPayload(objValues: LeaveFormValues): LeaveApplyRequest {
  return {
    intLeaveTypeID: objValues.intLeaveTypeID,
    dtFromDate: objValues.dtFromDate,
    dtToDate: objValues.dtToDate,
    blnFromHalf: objValues.strFirstSession === "half",
    blnToHalf: objValues.strLastSession === "half",
    strReason: objValues.strReason.trim() || null,
    strContactDuringLeave: objValues.strContactDuringLeave.trim() || null,
    strBackupEmployee: objValues.strBackupEmployee.trim() || null,
  };
}

function fnIsPreviewData(objValue: unknown): objValue is LeavePreviewDto {
  return Boolean(objValue && typeof objValue === "object" && "lstErrors" in objValue && Array.isArray((objValue as LeavePreviewDto).lstErrors));
}

function LeaveTypeBadge({ strTypeCode, strTypeName, intSize = 34 }: { strTypeCode?: string | null; strTypeName?: string | null; intSize?: number }) {
  const objBadge = getLeaveTypeBadge(strTypeCode, strTypeName);
  return <Box aria-hidden="true" sx={{ width: intSize, height: intSize, borderRadius: "50%", bgcolor: objBadge.bg, color: objBadge.fg, display: "grid", placeItems: "center", fontWeight: 800, fontSize: intSize <= 34 ? ".72rem" : ".9rem", flexShrink: 0 }}>{objBadge.strLabel}</Box>;
}

export default function EssLeaveApplicationPanel() {
  const objTheme = useTheme();
  const blnMobile = useMediaQuery(objTheme.breakpoints.down("sm"));
  const { t, intLanguageID } = useModuleLabels("ess-leave", "Unable to load Leave Application labels.");
  const { blnLoading: blnRightsLoading, canDo } = useActionRights();
  const {
    lstTypes, lstApplications, blnLoading, strLoadError,
    fnLoadAll, fnPreview, fnGetPolicy, fnGetApplication,
    fnPersistDraft: fnPersistDraftRequest, fnSubmitDraft,
    fnWithdraw, fnDeleteAttachment: fnDeleteAttachmentRequest,
  } = useEssLeaveApplication();
  const [blnFormOpen, setBlnFormOpen] = useState(false);
  const [blnSaving, setBlnSaving] = useState(false);
  const [blnPreviewLoading, setBlnPreviewLoading] = useState(false);
  const [objPreview, setObjPreview] = useState<LeavePreviewDto | null>(null);
  const [objEditing, setObjEditing] = useState<LeaveApplicationDto | null>(null);
  const [objDetail, setObjDetail] = useState<LeaveApplicationDto | null>(null);
  const [blnDetailLoading, setBlnDetailLoading] = useState(false);
  const [lstQueuedFiles, setLstQueuedFiles] = useState<File[]>([]);
  const [lstExistingAttachments, setLstExistingAttachments] = useState<LeaveApplicationAttachmentDto[]>([]);
  const [objPolicy, setObjPolicy] = useState<LeaveTypeAggregate | null>(null);
  const [strSearch, setStrSearch] = useState("");
  const [strStatus, setStrStatus] = useState("all");
  const [intPage, setIntPage] = useState(0);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
  const [objConfirm, setObjConfirm] = useState<ConfirmState>(null);
  const [strWithdrawReason, setStrWithdrawReason] = useState("");
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  const objErrorSummaryRef = useRef<HTMLDivElement | null>(null);
  const blnInitialRouteHandledRef = useRef(false);

  const { control, handleSubmit, reset, setValue, setError, formState: { errors: objFormErrors } } = useForm<LeaveFormValues>({
    resolver: yupResolver(objFormSchema) as Resolver<LeaveFormValues>, defaultValues: fnDefaultForm(), mode: "onBlur",
  });
  const objWatchedForm = useWatch({ control });
  const blnCanManage = ["ESS_LEAVE", "ESS_MY_LEAVE_APPLICATIONS", "LEAVE", "LEAVE_MANAGEMENT"].some((strModuleCode) => canDo(strModuleCode, "LEAVE_MANAGE"));
  const objSelectedType = useMemo(() => lstTypes.find((objType) => objType.intID === Number(objWatchedForm.intLeaveTypeID)) ?? null, [lstTypes, objWatchedForm.intLeaveTypeID]);
  const lstFilteredApplications = useMemo(() => {
    const strNeedle = strSearch.trim().toLowerCase();
    return lstApplications.filter((objApplication) => {
      const blnStatusMatch = strStatus === "all" || objApplication.strStatus === strStatus;
      const blnSearchMatch = !strNeedle || [objApplication.strTypeCode, objApplication.strTypeName, objApplication.strReason, objApplication.dtFromDate, objApplication.dtToDate, objApplication.strStatus].some((objValue) => String(objValue ?? "").toLowerCase().includes(strNeedle));
      return blnStatusMatch && blnSearchMatch;
    });
  }, [lstApplications, strSearch, strStatus]);
  const lstPagedApplications = useMemo(() => lstFilteredApplications.slice(intPage * intRowsPerPage, intPage * intRowsPerPage + intRowsPerPage), [lstFilteredApplications, intPage, intRowsPerPage]);
  const lstClientErrors = Object.values(objFormErrors).map((objError) => objError?.message).filter(Boolean) as string[];
  const lstAllBlockers = [...lstClientErrors, ...(objPreview?.lstErrors.map((objError) => objError.strMessage) ?? [])];

  function fnShowToast(strMessage: string, strSeverity: "success" | "error") { setObjToast({ blnOpen: true, strMessage, strSeverity }); }

  useEffect(() => {
    if (blnLoading || blnInitialRouteHandledRef.current) return;
    blnInitialRouteHandledRef.current = true;
    if (new URLSearchParams(window.location.search).get("view") === "apply") {
      setObjEditing(null); setObjPreview(null); setLstQueuedFiles([]); setLstExistingAttachments([]);
      reset(fnDefaultForm(lstTypes[0]?.intID ?? 0)); setBlnFormOpen(true);
    }
  }, [blnLoading, lstTypes, reset]);
  useEffect(() => { setIntPage(0); }, [strSearch, strStatus]);
  useEffect(() => {
    if (!objSelectedType?.blnAllowHalfDay) { setValue("strFirstSession", "full"); setValue("strLastSession", "full"); }
  }, [objSelectedType, setValue]);

  useEffect(() => {
    let blnActive = true;
    if (!objSelectedType || !blnFormOpen) { setObjPolicy(null); return () => { blnActive = false; }; }
    fnGetPolicy(objSelectedType.intID).then((objResult) => { if (blnActive) setObjPolicy(objResult); }).catch(() => { if (blnActive) setObjPolicy(null); });
    return () => { blnActive = false; };
  }, [blnFormOpen, fnGetPolicy, objSelectedType]);

  useEffect(() => {
    let blnActive = true;
    if (!blnFormOpen || !objWatchedForm.intLeaveTypeID || !objWatchedForm.dtFromDate || !objWatchedForm.dtToDate || objWatchedForm.dtToDate < objWatchedForm.dtFromDate) {
      setObjPreview(null); return () => { blnActive = false; };
    }
    const intTimer = window.setTimeout(async () => {
      setBlnPreviewLoading(true);
      try {
        const objResult = await fnPreview(fnBuildPayload(objWatchedForm as LeaveFormValues), objEditing?.intID);
        if (blnActive) setObjPreview(objResult);
      } catch (objError) {
        const objHandledError = await createApiRequestError(objError);
        if (blnActive && fnIsPreviewData(objHandledError.objData)) setObjPreview(objHandledError.objData);
      } finally { if (blnActive) setBlnPreviewLoading(false); }
    }, 450);
    return () => { blnActive = false; window.clearTimeout(intTimer); };
  }, [blnFormOpen, fnPreview, objEditing?.intID, objWatchedForm]);

  function fnOpenNewForm(intLeaveTypeID?: number, lstAvailableTypes = lstTypes) {
    setObjEditing(null); setObjPreview(null); setLstQueuedFiles([]); setLstExistingAttachments([]);
    reset(fnDefaultForm(intLeaveTypeID ?? lstAvailableTypes[0]?.intID ?? 0)); setBlnFormOpen(true);
  }

  async function fnOpenEditForm(objApplication: LeaveApplicationDto) {
    setBlnDetailLoading(true);
    try {
      const objFullApplication = await fnGetApplication(objApplication.intID);
      setObjEditing(objFullApplication); setObjPreview(objFullApplication.objCalculation ?? null);
      setLstExistingAttachments(objFullApplication.lstAttachments ?? []); setLstQueuedFiles([]);
      reset({ intLeaveTypeID: objFullApplication.intLeaveTypeID, dtFromDate: objFullApplication.dtFromDate ?? fnTodayISO(), dtToDate: objFullApplication.dtToDate ?? fnTodayISO(), strFirstSession: objFullApplication.blnFromHalf ? "half" : "full", strLastSession: objFullApplication.blnToHalf ? "half" : "full", strReason: objFullApplication.strReason ?? "", strContactDuringLeave: "", strBackupEmployee: "" });
      setBlnFormOpen(true);
    } catch (objError) { fnShowToast((await createApiRequestError(objError)).message, "error"); }
    finally { setBlnDetailLoading(false); }
  }

  async function fnOpenDetail(intApplicationID: number) {
    setBlnDetailLoading(true);
    try { setObjDetail(await fnGetApplication(intApplicationID)); }
    catch (objError) { fnShowToast((await createApiRequestError(objError)).message, "error"); }
    finally { setBlnDetailLoading(false); }
  }

  function fnApplyServerErrors(lstErrors: LeaveValidationMessage[]) {
    const dicFieldMap: Record<string, keyof LeaveFormValues> = { intLeaveTypeID: "intLeaveTypeID", dtFromDate: "dtFromDate", dtToDate: "dtToDate", strReason: "strReason" };
    lstErrors.forEach((objError) => { const strField = objError.strField ? dicFieldMap[objError.strField] : undefined; if (strField) setError(strField, { type: "server", message: objError.strMessage }); });
    window.setTimeout(() => objErrorSummaryRef.current?.focus(), 0);
  }

  async function fnPersistDraft(objValues: LeaveFormValues) {
    const objPayload = { ...fnBuildPayload(objValues), intVersionNo: objEditing?.intVersionNo };
    const objDraft = await fnPersistDraftRequest(objEditing, objPayload, lstQueuedFiles);
    setObjEditing(objDraft); setLstExistingAttachments(objDraft.lstAttachments ?? []); setLstQueuedFiles([]);
    return objDraft;
  }

  async function fnSaveDraft(objValues: LeaveFormValues) {
    setBlnSaving(true);
    try { await fnPersistDraft(objValues); fnShowToast(t("draft_saved", "Leave draft saved."), "success"); await fnLoadAll(); }
    catch (objError) { fnShowToast((await createApiRequestError(objError)).message, "error"); }
    finally { setBlnSaving(false); }
  }

  async function fnSubmitConfirmed() {
    setObjConfirm(null);
    await handleSubmit(async (objValues) => {
      setBlnSaving(true);
      try {
        const objValidatedPreview = await fnPreview(fnBuildPayload(objValues), objEditing?.intID);
        setObjPreview(objValidatedPreview);
        if (!objValidatedPreview.blnValid) { fnApplyServerErrors(objValidatedPreview.lstErrors); return; }
        const objDraft = await fnPersistDraft(objValues);
        const objSubmitted = await fnSubmitDraft(objDraft.intID, objDraft.intVersionNo);
        setBlnFormOpen(false); setObjEditing(null); fnShowToast(t("submit_success", "Leave application submitted successfully."), "success");
        await fnLoadAll(); setObjDetail(objSubmitted);
      } catch (objError) {
        const objHandledError = await createApiRequestError(objError);
        if (fnIsPreviewData(objHandledError.objData)) { setObjPreview(objHandledError.objData); fnApplyServerErrors(objHandledError.objData.lstErrors); }
        else fnShowToast(objHandledError.message, "error");
      } finally { setBlnSaving(false); }
    })();
  }

  async function fnWithdrawConfirmed() {
    if (!objConfirm || objConfirm.strKind !== "withdraw" || !strWithdrawReason.trim()) return;
    setBlnSaving(true);
    try {
      await fnWithdraw(objConfirm.intApplicationID, strWithdrawReason.trim());
      setObjConfirm(null); setObjDetail(null); setStrWithdrawReason(""); fnShowToast(t("withdraw_success", "Leave application withdrawn."), "success"); await fnLoadAll();
    } catch (objError) { fnShowToast((await createApiRequestError(objError)).message, "error"); }
    finally { setBlnSaving(false); }
  }

  async function fnDeleteAttachment(intAttachmentID: number) {
    if (!objEditing) return;
    setBlnSaving(true);
    try { await fnDeleteAttachmentRequest(objEditing.intID, intAttachmentID); setLstExistingAttachments((lstPrevious) => lstPrevious.filter((objAttachment) => objAttachment.intID !== intAttachmentID)); fnShowToast(t("attachment_deleted", "Attachment removed."), "success"); }
    catch (objError) { fnShowToast((await createApiRequestError(objError)).message, "error"); }
    finally { setBlnSaving(false); }
  }

  const strPolicyHelp = useMemo(() => {
    const objLocalizedText = objPolicy?.lstText.find((objText) => objText.intLanguageID === intLanguageID) ?? objPolicy?.lstText[0];
    return objLocalizedText?.strEmployeeHelpText || objLocalizedText?.strDescription || objSelectedType?.strEmployeeHelpText || objSelectedType?.strDescription || "";
  }, [intLanguageID, objPolicy, objSelectedType]);
  const intPendingCount = lstApplications.filter((objApplication) => objApplication.strStatus === "pending").length;

  return <Stack spacing={2}>
    <Paper sx={{ p: { xs: 1.75, md: 2.25 }, borderRadius: "20px", background: "linear-gradient(135deg,#0b3f70 0%,#0a66a3 52%,#0e7490 100%)", color: "white", boxShadow: "0 14px 28px rgba(2,6,23,.18)" }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between">
        <Stack direction="row" spacing={1.4} alignItems="center"><Box sx={{ width: 48, height: 48, borderRadius: "14px", bgcolor: "rgba(255,255,255,.18)", display: "grid", placeItems: "center" }}><EventAvailableRoundedIcon /></Box><Box><Typography component="h1" sx={{ fontWeight: 800, fontSize: "1.08rem" }}>{t("page_title", "My Leave")}</Typography><Typography sx={{ fontSize: ".82rem", color: "rgba(241,245,249,.92)" }}>{t("page_subtitle", "View balances, apply for leave and track every request.")}</Typography></Box></Stack>
        {blnCanManage && !blnRightsLoading ? <Button data-controlid="ess.leave.apply.open" variant="contained" startIcon={<AddRoundedIcon />} onClick={() => fnOpenNewForm()} sx={{ bgcolor: "white", color: "#0b3f70", fontWeight: 800, "&:hover": { bgcolor: "#e2e8f0" } }}>{t("apply_leave", "Apply Leave")}</Button> : null}
      </Stack>
    </Paper>

    {blnLoading ? <LoadingSkeleton /> : strLoadError ? <Paper sx={{ p: 3, borderRadius: "18px", border: "1px solid #fecaca", textAlign: "center" }}><Alert severity="error" sx={{ mb: 2 }}>{strLoadError}</Alert><Button startIcon={<RefreshRoundedIcon />} variant="outlined" onClick={() => void fnLoadAll()}>{t("retry", "Retry")}</Button></Paper> : <>
      <Paper id="leave-applications" sx={{ borderRadius: "18px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} justifyContent="space-between" sx={{ p: 2 }}><Box><Typography component="h2" sx={{ fontWeight: 800 }}>{t("applications_title", "My Leave Applications")}</Typography><Typography sx={{ fontSize: ".78rem", color: "#64748b" }}>{intPendingCount} {t("pending", "pending")}</Typography></Box><Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", md: "auto" } }}><TextField data-controlid="ess.leave.search" size="small" value={strSearch} onChange={(objEvent) => setStrSearch(objEvent.target.value)} placeholder={t("search_placeholder", "Search applications")} inputProps={{ "aria-label": t("search_placeholder", "Search applications") }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }} /><TextField data-controlid="ess.leave.status.filter" select size="small" label={t("status", "Status")} value={strStatus} onChange={(objEvent) => setStrStatus(objEvent.target.value)} sx={{ minWidth: 150 }}>{lstStatusOptions.map((strOption) => <MenuItem key={strOption} value={strOption}>{strOption === "all" ? t("all_statuses", "All statuses") : strOption.replaceAll("_", " ")}</MenuItem>)}</TextField></Stack></Stack>
        <Divider />
        {lstPagedApplications.length === 0 ? <EmptyState strMessage={t("applications_empty", "No leave applications match the selected filters.")} /> : blnMobile ? <Stack spacing={1} sx={{ p: 1.5 }}>{lstPagedApplications.map((objApplication) => <ApplicationCard key={objApplication.intID} objApplication={objApplication} blnCanManage={blnCanManage} fnOnView={() => void fnOpenDetail(objApplication.intID)} fnOnEdit={() => void fnOpenEditForm(objApplication)} fnOnWithdraw={() => { setStrWithdrawReason(""); setObjConfirm({ strKind: "withdraw", intApplicationID: objApplication.intID }); }} />)}</Stack> : <ApplicationTable lstApplications={lstPagedApplications} blnCanManage={blnCanManage} fnOnView={(intApplicationID) => void fnOpenDetail(intApplicationID)} fnOnEdit={(objApplication) => void fnOpenEditForm(objApplication)} fnOnWithdraw={(intApplicationID) => { setStrWithdrawReason(""); setObjConfirm({ strKind: "withdraw", intApplicationID }); }} fnLabel={t} />}
        <TablePagination component="div" count={lstFilteredApplications.length} page={intPage} onPageChange={(_objEvent, intNextPage) => setIntPage(intNextPage)} rowsPerPage={intRowsPerPage} onRowsPerPageChange={(objEvent) => { setIntRowsPerPage(Number(objEvent.target.value)); setIntPage(0); }} rowsPerPageOptions={[5, 10, 25]} />
      </Paper>
    </>}

    <Dialog open={blnFormOpen} onClose={() => !blnSaving && setBlnFormOpen(false)} fullWidth maxWidth="lg" fullScreen={blnMobile} aria-labelledby="leave-form-title">
      <DialogTitle id="leave-form-title" sx={{ fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "space-between" }}>{objEditing ? t("edit_application", "Edit Leave Application") : t("apply_leave", "Apply Leave")}<IconButton aria-label={t("close", "Close")} onClick={() => setBlnFormOpen(false)} disabled={blnSaving}><CloseRoundedIcon /></IconButton></DialogTitle>
      {blnSaving ? <LinearProgress /> : null}
      <DialogContent dividers sx={{ bgcolor: "#f8fafc", p: { xs: 1.5, md: 2.5 } }}><Grid container spacing={2}><Grid item xs={12} md={7}><Stack spacing={2}>
        {lstAllBlockers.length ? <Alert ref={objErrorSummaryRef} tabIndex={-1} severity="error" icon={<WarningAmberRoundedIcon />}><Typography sx={{ fontWeight: 800, mb: .5 }}>{t("fix_errors", "Please correct the following")}</Typography>{Array.from(new Set(lstAllBlockers)).map((strMessage) => <Typography key={strMessage} component="div" sx={{ fontSize: ".82rem" }}>• {strMessage}</Typography>)}</Alert> : null}
        {objPreview?.lstWarnings.length ? <Alert severity="warning"><Typography sx={{ fontWeight: 800 }}>{t("warnings", "Warnings")}</Typography>{objPreview.lstWarnings.map((objWarning) => <Typography component="div" key={objWarning.strCode} sx={{ fontSize: ".82rem" }}>• {objWarning.strMessage}</Typography>)}</Alert> : null}
        <RequestFields control={control} objErrors={objFormErrors} lstTypes={lstTypes} objSelectedType={objSelectedType} strPolicyHelp={strPolicyHelp} fnLabel={t} />
        <Paper sx={{ p: 2, borderRadius: "16px", border: "1px solid #e2e8f0" }}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} alignItems={{ xs: "stretch", sm: "center" }}><Box><Typography component="h3" sx={{ fontWeight: 800 }}>{t("attachments", "Attachments")}</Typography><Typography sx={{ fontSize: ".76rem", color: "#64748b" }}>{objPreview?.blnProofRequired ? t("proof_required", "Proof is required for this request.") : t("proof_optional", "Documents are optional for this request.")}</Typography></Box><Button component="label" variant="outlined" startIcon={<AttachFileRoundedIcon />} disabled={blnSaving}>{t("add_files", "Add files")}<input hidden multiple type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(objEvent) => { setLstQueuedFiles((lstPrevious) => [...lstPrevious, ...Array.from(objEvent.target.files ?? [])]); objEvent.target.value = ""; }} /></Button></Stack><Stack spacing={.75} sx={{ mt: 1.25 }}>{lstExistingAttachments.map((objAttachment) => <AttachmentRow key={objAttachment.intID} strName={objAttachment.strFileName} intBytes={objAttachment.intFileSizeBytes} fnOnDelete={objEditing?.strStatus === "draft" ? () => void fnDeleteAttachment(objAttachment.intID) : undefined} />)}{lstQueuedFiles.map((objFile, intIndex) => <AttachmentRow key={`${objFile.name}-${intIndex}`} strName={objFile.name} intBytes={objFile.size} fnOnDelete={() => setLstQueuedFiles((lstPrevious) => lstPrevious.filter((_objFile, intFileIndex) => intFileIndex !== intIndex))} />)}{!lstExistingAttachments.length && !lstQueuedFiles.length ? <FormHelperText>{t("attachments_empty", "No attachments added.")}</FormHelperText> : null}</Stack></Paper>
      </Stack></Grid><Grid item xs={12} md={5}><PreviewPanel objPreview={objPreview} blnLoading={blnPreviewLoading} fnLabel={t} /></Grid></Grid></DialogContent>
      <DialogActions sx={{ p: 2, flexWrap: "wrap", gap: 1 }}><Button onClick={() => setBlnFormOpen(false)} disabled={blnSaving}>{t("cancel", "Cancel")}</Button><Button variant="outlined" startIcon={<SaveOutlinedIcon />} disabled={blnSaving || !blnCanManage} onClick={() => void handleSubmit(fnSaveDraft)()}>{t("save_draft", "Save Draft")}</Button><Button variant="contained" startIcon={<SendRoundedIcon />} disabled={blnSaving || blnPreviewLoading || !blnCanManage} onClick={() => void handleSubmit(() => setObjConfirm({ strKind: "submit" }))()}>{t("submit_application", "Submit Application")}</Button></DialogActions>
    </Dialog>

    <DetailDialog objApplication={objDetail} blnLoading={blnDetailLoading} blnCanManage={blnCanManage} fnOnClose={() => setObjDetail(null)} fnOnWithdraw={(intApplicationID) => { setStrWithdrawReason(""); setObjConfirm({ strKind: "withdraw", intApplicationID }); }} fnLabel={t} />
    <CommonConfirmDialog blnOpen={objConfirm?.strKind === "submit"} strTitle={t("confirm_submit_title", "Submit Leave Application?")} strMessage={t("confirm_submit_message", "The balance will be placed on hold and the request will be sent for approval.")} strCancelLabel={t("cancel", "Cancel")} strConfirmLabel={t("submit", "Submit")} blnConfirmDisabled={blnSaving} blnCancelDisabled={blnSaving} onClose={() => setObjConfirm(null)} onConfirm={() => void fnSubmitConfirmed()} />
    <CommonConfirmDialog blnOpen={objConfirm?.strKind === "withdraw"} strTitle={t("confirm_withdraw_title", "Withdraw Leave Application?")} nodeMessage={<TextField autoFocus fullWidth multiline minRows={2} label={t("withdraw_reason", "Withdrawal Reason")} value={strWithdrawReason} onChange={(objEvent) => setStrWithdrawReason(objEvent.target.value)} error={!strWithdrawReason.trim()} helperText={!strWithdrawReason.trim() ? t("withdraw_reason_required", "A reason is required.") : ""} />} strCancelLabel={t("cancel", "Cancel")} strConfirmLabel={t("withdraw", "Withdraw")} blnConfirmDisabled={blnSaving || !strWithdrawReason.trim()} blnCancelDisabled={blnSaving} onClose={() => setObjConfirm(null)} onConfirm={() => void fnWithdrawConfirmed()} />
    <Snackbar open={objToast.blnOpen} autoHideDuration={5000} onClose={() => setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}><Alert severity={objToast.strSeverity} variant="filled" onClose={() => setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }))}>{objToast.strMessage}</Alert></Snackbar>
  </Stack>;
}

function RequestFields({ control, objErrors, lstTypes, objSelectedType, strPolicyHelp, fnLabel }: { control: Control<LeaveFormValues>; objErrors: FieldErrors<LeaveFormValues>; lstTypes: LeaveTypeDto[]; objSelectedType: LeaveTypeDto | null; strPolicyHelp: string; fnLabel: LabelFunction }) {
  return <Paper sx={{ p: 2, borderRadius: "16px", border: "1px solid #e2e8f0" }}><Typography component="h3" sx={{ fontWeight: 800, mb: 1.5 }}>{fnLabel("request_details", "Request Details")}</Typography><Grid container spacing={1.5}>
    <Grid item xs={12}><Controller name="intLeaveTypeID" control={control} render={({ field }) => <TextField {...field} data-controlid="ess.leave.type" select fullWidth size="small" label={fnLabel("leave_type", "Leave Type")} error={Boolean(objErrors.intLeaveTypeID)} helperText={objErrors.intLeaveTypeID?.message}>{lstTypes.map((objType) => <MenuItem key={objType.intID} value={objType.intID}>{objType.strTypeName} ({objType.strTypeCode})</MenuItem>)}</TextField>} /></Grid>
    {strPolicyHelp ? <Grid item xs={12}><Alert severity="info">{strPolicyHelp}</Alert></Grid> : null}
    <Grid item xs={12} sm={6}><Controller name="dtFromDate" control={control} render={({ field }) => <TextField {...field} type="date" fullWidth size="small" label={fnLabel("from_date", "From Date")} InputLabelProps={{ shrink: true }} error={Boolean(objErrors.dtFromDate)} helperText={objErrors.dtFromDate?.message} />} /></Grid>
    <Grid item xs={12} sm={6}><Controller name="dtToDate" control={control} render={({ field }) => <TextField {...field} type="date" fullWidth size="small" label={fnLabel("to_date", "To Date")} InputLabelProps={{ shrink: true }} error={Boolean(objErrors.dtToDate)} helperText={objErrors.dtToDate?.message} />} /></Grid>
    {objSelectedType?.blnAllowHalfDay ? <><Grid item xs={12} sm={6}><Controller name="strFirstSession" control={control} render={({ field }) => <TextField {...field} select fullWidth size="small" label={fnLabel("first_day_session", "First-day Session")}><MenuItem value="full">{fnLabel("full_day", "Full day")}</MenuItem><MenuItem value="half">{fnLabel("half_day", "Half day")}</MenuItem></TextField>} /></Grid><Grid item xs={12} sm={6}><Controller name="strLastSession" control={control} render={({ field }) => <TextField {...field} select fullWidth size="small" label={fnLabel("last_day_session", "Last-day Session")}><MenuItem value="full">{fnLabel("full_day", "Full day")}</MenuItem><MenuItem value="half">{fnLabel("half_day", "Half day")}</MenuItem></TextField>} /></Grid></> : null}
    <Grid item xs={12}><Controller name="strReason" control={control} render={({ field }) => <TextField {...field} fullWidth size="small" multiline minRows={3} label={`${fnLabel("reason", "Reason")}${objSelectedType?.blnRequiresReason ? " *" : ""}`} error={Boolean(objErrors.strReason)} helperText={objErrors.strReason?.message} />} /></Grid>
    <Grid item xs={12} sm={6}><Controller name="strContactDuringLeave" control={control} render={({ field }) => <TextField {...field} fullWidth size="small" label={fnLabel("contact_during_leave", "Contact During Leave")} error={Boolean(objErrors.strContactDuringLeave)} helperText={objErrors.strContactDuringLeave?.message} />} /></Grid>
    <Grid item xs={12} sm={6}><Controller name="strBackupEmployee" control={control} render={({ field }) => <TextField {...field} fullWidth size="small" label={fnLabel("backup_employee", "Backup Employee")} error={Boolean(objErrors.strBackupEmployee)} helperText={objErrors.strBackupEmployee?.message} />} /></Grid>
  </Grid></Paper>;
}

function LoadingSkeleton() { return <Stack spacing={2} aria-label="Loading leave information"><Grid container spacing={1.25}>{[1, 2, 3, 4].map((intItem) => <Grid item xs={12} sm={6} md={3} key={intItem}><Skeleton variant="rounded" height={118} /></Grid>)}</Grid><Skeleton variant="rounded" height={320} /></Stack>; }
function EmptyState({ strMessage }: { strMessage: string }) { return <Box sx={{ p: 4, textAlign: "center" }}><EventAvailableRoundedIcon sx={{ color: "#94a3b8", fontSize: 36, mb: .5 }} /><Typography sx={{ color: "#64748b", fontWeight: 600 }}>{strMessage}</Typography></Box>; }

function StatusChip({ strStatus }: { strStatus: string }) { const objColor = LEAVE_STATUS_COLORS[strStatus] ?? { bg: "#f1f5f9", fg: "#475569" }; return <Chip size="small" label={strStatus.replaceAll("_", " ")} sx={{ fontWeight: 700, textTransform: "capitalize", bgcolor: objColor.bg, color: objColor.fg }} />; }

function ApplicationActions({ objApplication, blnCanManage, fnOnView, fnOnEdit, fnOnWithdraw }: { objApplication: LeaveApplicationDto; blnCanManage: boolean; fnOnView: () => void; fnOnEdit: () => void; fnOnWithdraw: () => void }) {
  return <Stack direction="row" spacing={.25}><Tooltip title="View details"><IconButton size="small" aria-label="View details" onClick={fnOnView}><VisibilityOutlinedIcon fontSize="small" /></IconButton></Tooltip>{objApplication.strStatus === "draft" && blnCanManage ? <Tooltip title="Edit draft"><IconButton size="small" aria-label="Edit draft" color="primary" onClick={fnOnEdit}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip> : null}{objApplication.strStatus === "pending" && blnCanManage ? <Tooltip title="Withdraw application"><IconButton size="small" aria-label="Withdraw application" color="error" onClick={fnOnWithdraw}><WarningAmberRoundedIcon fontSize="small" /></IconButton></Tooltip> : null}</Stack>;
}

function ApplicationCard({ objApplication, blnCanManage, fnOnView, fnOnEdit, fnOnWithdraw }: { objApplication: LeaveApplicationDto; blnCanManage: boolean; fnOnView: () => void; fnOnEdit: () => void; fnOnWithdraw: () => void }) {
  return <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "14px" }}><Stack direction="row" justifyContent="space-between" spacing={1}><Stack direction="row" spacing={1} alignItems="center"><LeaveTypeBadge strTypeCode={objApplication.strTypeCode} strTypeName={objApplication.strTypeName} /><Box><Typography sx={{ fontWeight: 800, fontSize: ".86rem" }}>{objApplication.strTypeName}</Typography><Typography sx={{ fontSize: ".75rem", color: "#64748b" }}>{formatLeaveDate(objApplication.dtFromDate)} – {formatLeaveDate(objApplication.dtToDate)} · {objApplication.decDays} day(s)</Typography></Box></Stack><StatusChip strStatus={objApplication.strStatus} /></Stack><Stack direction="row" justifyContent="flex-end" sx={{ mt: .75 }}><ApplicationActions objApplication={objApplication} blnCanManage={blnCanManage} fnOnView={fnOnView} fnOnEdit={fnOnEdit} fnOnWithdraw={fnOnWithdraw} /></Stack></Paper>;
}

function ApplicationTable({ lstApplications, blnCanManage, fnOnView, fnOnEdit, fnOnWithdraw, fnLabel }: { lstApplications: LeaveApplicationDto[]; blnCanManage: boolean; fnOnView: (intApplicationID: number) => void; fnOnEdit: (objApplication: LeaveApplicationDto) => void; fnOnWithdraw: (intApplicationID: number) => void; fnLabel: LabelFunction }) {
  return <Box sx={{ overflowX: "auto" }}><Table size="small"><TableHead><TableRow sx={{ "& th": { fontWeight: 700, bgcolor: "#f8fafc", whiteSpace: "nowrap" } }}><TableCell>{fnLabel("actions", "Actions")}</TableCell><TableCell>{fnLabel("applied_on", "Applied On")}</TableCell><TableCell>{fnLabel("leave_type", "Leave Type")}</TableCell><TableCell>{fnLabel("from_date", "From Date")}</TableCell><TableCell>{fnLabel("to_date", "To Date")}</TableCell><TableCell>{fnLabel("quantity", "Quantity")}</TableCell><TableCell>{fnLabel("status", "Status")}</TableCell></TableRow></TableHead><TableBody>{lstApplications.map((objApplication) => <TableRow key={objApplication.intID} hover><TableCell><ApplicationActions objApplication={objApplication} blnCanManage={blnCanManage} fnOnView={() => fnOnView(objApplication.intID)} fnOnEdit={() => fnOnEdit(objApplication)} fnOnWithdraw={() => fnOnWithdraw(objApplication.intID)} /></TableCell><TableCell>{formatLeaveDate(objApplication.dtAppliedOn)}</TableCell><TableCell><Stack direction="row" spacing={1} alignItems="center"><LeaveTypeBadge strTypeCode={objApplication.strTypeCode} strTypeName={objApplication.strTypeName} /><Typography sx={{ fontWeight: 700, fontSize: ".82rem" }}>{objApplication.strTypeName}</Typography></Stack></TableCell><TableCell>{formatLeaveDate(objApplication.dtFromDate)}{objApplication.blnFromHalf ? " (½)" : ""}</TableCell><TableCell>{formatLeaveDate(objApplication.dtToDate)}{objApplication.blnToHalf ? " (½)" : ""}</TableCell><TableCell>{objApplication.decDays}</TableCell><TableCell><StatusChip strStatus={objApplication.strStatus} /></TableCell></TableRow>)}</TableBody></Table></Box>;
}

function AttachmentRow({ strName, intBytes, fnOnDelete }: { strName: string; intBytes: number; fnOnDelete?: () => void }) { return <Stack direction="row" spacing={1} alignItems="center" sx={{ p: .75, borderRadius: "10px", bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}><AttachFileRoundedIcon fontSize="small" color="action" /><Box sx={{ minWidth: 0, flex: 1 }}><Typography noWrap sx={{ fontWeight: 700, fontSize: ".8rem" }}>{strName}</Typography><Typography sx={{ fontSize: ".68rem", color: "#64748b" }}>{Math.max(1, Math.round(intBytes / 1024))} KB</Typography></Box>{fnOnDelete ? <IconButton size="small" aria-label={`Remove ${strName}`} onClick={fnOnDelete}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton> : null}</Stack>; }

function PreviewPanel({ objPreview, blnLoading, fnLabel }: { objPreview: LeavePreviewDto | null; blnLoading: boolean; fnLabel: LabelFunction }) {
  return <Paper sx={{ p: 2, borderRadius: "16px", border: "1px solid #cbd5e1", position: { md: "sticky" }, top: { md: 16 } }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography component="h3" sx={{ fontWeight: 800 }}>{fnLabel("live_preview", "Live Preview")}</Typography>{blnLoading ? <Chip size="small" label={fnLabel("calculating", "Calculating…")} color="info" /> : objPreview ? <Chip size="small" label={objPreview.blnValid ? fnLabel("valid", "Valid") : fnLabel("needs_attention", "Needs attention")} color={objPreview.blnValid ? "success" : "error"} /> : null}</Stack>{blnLoading ? <LinearProgress sx={{ mt: 1 }} /> : null}{!objPreview ? <Typography sx={{ color: "#64748b", fontSize: ".82rem", mt: 2 }}>{fnLabel("preview_hint", "Select a Leave Type and dates to calculate the request.")}</Typography> : <><Grid container spacing={1} sx={{ mt: 1 }}>{[[fnLabel("requested_quantity", "Requested"), objPreview.lstDateBreakdown.length], [fnLabel("chargeable_quantity", "Chargeable"), objPreview.decCalculatedDays], [fnLabel("balance_before", "Balance Before"), objPreview.decAvailableBefore ?? "—"], [fnLabel("balance_after", "Balance After"), objPreview.decAvailableAfter ?? "—"]].map(([objLabel, objValue]) => <Grid item xs={6} key={String(objLabel)}><Box sx={{ p: 1.25, borderRadius: "12px", bgcolor: "#f8fafc" }}><Typography sx={{ fontSize: ".68rem", color: "#64748b", fontWeight: 700 }}>{objLabel}</Typography><Typography sx={{ fontSize: "1.25rem", fontWeight: 800 }}>{objValue}</Typography></Box></Grid>)}</Grid><Divider sx={{ my: 1.5 }} /><Typography sx={{ fontWeight: 800, fontSize: ".82rem", mb: .75 }}>{fnLabel("date_explanation", "Date-wise Explanation")}</Typography><Stack spacing={.5} sx={{ maxHeight: 300, overflowY: "auto" }}>{objPreview.lstDateBreakdown.map((objDay) => <Stack key={objDay.dtDate} direction="row" justifyContent="space-between" spacing={1} sx={{ p: .75, borderRadius: "8px", bgcolor: objDay.blnCounted ? "#f0fdf4" : "#f8fafc" }}><Box><Typography sx={{ fontSize: ".76rem", fontWeight: 700 }}>{formatLeaveDate(objDay.dtDate)}</Typography><Typography sx={{ fontSize: ".68rem", color: "#64748b", textTransform: "capitalize" }}>{objDay.strHolidayName || objDay.strCalculationReason.replaceAll("_", " ")}</Typography></Box><Chip size="small" label={objDay.decDays} color={objDay.blnCounted ? "success" : "default"} /></Stack>)}</Stack></>}</Paper>;
}

function DetailDialog({ objApplication, blnLoading, blnCanManage, fnOnClose, fnOnWithdraw, fnLabel }: { objApplication: LeaveApplicationDto | null; blnLoading: boolean; blnCanManage: boolean; fnOnClose: () => void; fnOnWithdraw: (intApplicationID: number) => void; fnLabel: LabelFunction }) {
  return <Dialog open={Boolean(objApplication) || blnLoading} onClose={fnOnClose} fullWidth maxWidth="md"><DialogTitle sx={{ fontWeight: 800, display: "flex", justifyContent: "space-between", alignItems: "center" }}>{fnLabel("application_details", "Leave Application Details")}<IconButton aria-label={fnLabel("close", "Close")} onClick={fnOnClose}><CloseRoundedIcon /></IconButton></DialogTitle><DialogContent dividers>{blnLoading ? <LoadingSkeleton /> : objApplication ? <Grid container spacing={2}><Grid item xs={12} sm={8}><Stack direction="row" spacing={1.25} alignItems="center"><LeaveTypeBadge strTypeCode={objApplication.strTypeCode} strTypeName={objApplication.strTypeName} intSize={42} /><Box><Typography sx={{ fontWeight: 800 }}>{objApplication.strTypeName}</Typography><Typography sx={{ color: "#64748b", fontSize: ".78rem" }}>{formatLeaveDate(objApplication.dtFromDate)} – {formatLeaveDate(objApplication.dtToDate)} · {objApplication.decDays} day(s)</Typography></Box></Stack></Grid><Grid item xs={12} sm={4}><StatusChip strStatus={objApplication.strStatus} /></Grid><Grid item xs={12}><Typography sx={{ fontSize: ".72rem", color: "#64748b" }}>{fnLabel("reason", "Reason")}</Typography><Typography sx={{ fontWeight: 600 }}>{objApplication.strReason || "—"}</Typography></Grid><Grid item xs={12} md={5}><Typography component="h3" sx={{ fontWeight: 800, mb: 1 }}>{fnLabel("attachments", "Attachments")}</Typography><Stack spacing={.75}>{objApplication.lstAttachments?.length ? objApplication.lstAttachments.map((objAttachment) => <AttachmentRow key={objAttachment.intID} strName={objAttachment.strFileName} intBytes={objAttachment.intFileSizeBytes} />) : <Typography sx={{ color: "#64748b", fontSize: ".8rem" }}>{fnLabel("attachments_empty", "No attachments added.")}</Typography>}</Stack></Grid><Grid item xs={12} md={7}><Typography component="h3" sx={{ fontWeight: 800, mb: 1 }}>{fnLabel("timeline", "Action Timeline")}</Typography><Stack spacing={1}>{objApplication.lstActions?.length ? objApplication.lstActions.map((objAction, intIndex) => <Stack key={objAction.intID} direction="row" spacing={1.25}><Box sx={{ width: 10, height: 10, mt: .75, borderRadius: "50%", bgcolor: intIndex === 0 ? "#0a66a3" : "#94a3b8", flexShrink: 0 }} /><Box><Typography sx={{ fontWeight: 800, fontSize: ".8rem", textTransform: "capitalize" }}>{objAction.strAction}</Typography><Typography sx={{ fontSize: ".72rem", color: "#64748b" }}>{formatLeaveDate(objAction.dtActionOn)}{objAction.strComment ? ` — ${objAction.strComment}` : ""}</Typography></Box></Stack>) : <Typography sx={{ color: "#64748b", fontSize: ".8rem" }}>{fnLabel("timeline_empty", "No actions recorded.")}</Typography>}</Stack></Grid></Grid> : null}</DialogContent><DialogActions>{objApplication?.strStatus === "pending" && blnCanManage ? <Button color="error" onClick={() => fnOnWithdraw(objApplication.intID)}>{fnLabel("withdraw", "Withdraw")}</Button> : null}<Button onClick={fnOnClose}>{fnLabel("close", "Close")}</Button></DialogActions></Dialog>;
}
