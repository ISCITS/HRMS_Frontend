"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import EssTeamCalendarPage from "@/features/leave/components/EssTeamCalendarPage";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EventBusyRoundedIcon from "@mui/icons-material/EventBusyRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, Grid, IconButton, InputAdornment,
  LinearProgress, MenuItem, Paper, Skeleton, Snackbar, Stack, Tab, Table, TableBody, TableCell,
  TableHead, TablePagination, TableRow, Tabs, TextField, Tooltip, Typography,
  useMediaQuery, useTheme,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { useLeaveApprovals } from "@/features/leave/hooks/useLeaveApprovals";
import { useLeaveWorkflowPermissions } from "@/features/leave/hooks/useLeaveWorkflowPermissions";
import { leaveService } from "@/features/leave/services/leaveService";
import { employeeService } from "@/features/employee/services/employeeService";
import type { EmployeeListRecord } from "@/features/employee/types";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import {
  formatLeaveDate, getLeaveStatusLabel, getLeaveTypeBadge, LEAVE_STATUS_COLORS,
  type LeaveQueueItemDto, type LeaveRouteStepDto, type LeaveTimelineEntryDto,
  type TeamCalendarDto,
} from "@/features/leave/types";

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };
type DecisionKind = "approve" | "reject" | "send_back" | "cancel";
type DecisionState = { strKind: DecisionKind; objItem: LeaveQueueItemDto } | null;
type SortKey = "dtAppliedOn" | "strEmployeeName" | "decDays";
type LabelFn = (strKey: string, strFallback?: string) => string;

function fnTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function fnEmployeeName(objItem: LeaveQueueItemDto): string {
  return objItem.strEmployeeName ?? `Employee #${objItem.intEmployeeID}`;
}

export default function EssLeaveApprovalsPanel() {
  const objTheme = useTheme();
  const blnMobile = useMediaQuery(objTheme.breakpoints.down("sm"));
  const { t } = useModuleLabels("ess-leave-approvals", "Unable to load Leave Approvals labels.");
  const objPermissions = useLeaveWorkflowPermissions();
  const {
    blnCanView, blnCanApprove, blnCanReject, blnCanSendBack,
    blnCanViewConfidential, blnCanViewTeamCalendar, blnLoading: blnRightsLoading,
  } = objPermissions;

  const { lstQueue, lstActioned, objTeamCalendar, blnLoading, strError, fnLoadAll } =
    useLeaveApprovals(blnCanView && !blnRightsLoading);

  const [intTab, setIntTab] = useState(0);
  // Team Calendar is an in-page tab (index 4). When it is opened from a specific request we keep the
  // originating item + previous tab so "Back to Request" restores the same drawer (guide 7).
  const [objCalendarContext, setObjCalendarContext] = useState<{ objItem: LeaveQueueItemDto; intPrevTab: number } | null>(null);
  const [strSearch, setStrSearch] = useState("");
  const [objSort, setObjSort] = useState<{ strKey: SortKey; blnAsc: boolean }>({ strKey: "dtAppliedOn", blnAsc: false });
  const [intPage, setIntPage] = useState(0);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
  const [objDetail, setObjDetail] = useState<LeaveQueueItemDto | null>(null);
  const [lstTimeline, setLstTimeline] = useState<LeaveTimelineEntryDto[]>([]);
  const [lstRoute, setLstRoute] = useState<LeaveRouteStepDto[]>([]);
  const [blnDetailLoading, setBlnDetailLoading] = useState(false);
  const [objDecision, setObjDecision] = useState<DecisionState>(null);
  const [strRemark, setStrRemark] = useState("");
  const [intProcessingID, setIntProcessingID] = useState<number | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  // Colleague list for the approver's backup-resource picker (loaded once when the user can approve).
  const [lstEmployees, setLstEmployees] = useState<EmployeeListRecord[]>([]);

  useEffect(() => {
    if (!blnCanApprove) return;
    let blnActive = true;
    employeeService.getEmployees().then((lstResult) => { if (blnActive) setLstEmployees(lstResult); }).catch(() => { /* picker stays empty on failure */ });
    return () => { blnActive = false; };
  }, [blnCanApprove]);

  function fnShowToast(strMessage: string, strSeverity: "success" | "error") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  async function fnAssignBackup(intApplicationID: number, intBackupEmployeeID: number) {
    setIntProcessingID(intApplicationID);
    try {
      await leaveService.assignBackupResource(intApplicationID, { intBackupEmployeeID });
      setObjDetail((objPrev) => (objPrev && objPrev.intID === intApplicationID ? { ...objPrev, intBackupEmployeeID } : objPrev));
      fnShowToast(t("backup_assigned", "Backup resource assigned."), "success");
      await fnLoadAll();
    } catch (objError) {
      fnShowToast((await createApiRequestError(objError)).message, "error");
    } finally {
      setIntProcessingID(null);
    }
  }

  const lstDelegated = useMemo(() => lstQueue.filter((objItem) => objItem.blnIsDelegated), [lstQueue]);
  const intOverdueCount = useMemo(() => lstQueue.filter((objItem) => objItem.blnIsOverdue).length, [lstQueue]);
  const lstUpcoming = useMemo(() => {
    const strToday = fnTodayISO();
    const lstEvents: { strEmployeeName: string; strLabel: string | null; dtFromDate: string; dtToDate: string; strStatus: string; blnMasked: boolean }[] = [];
    (objTeamCalendar?.lstEmployees ?? []).forEach((objMember) => {
      objMember.lstLeaveEvents.forEach((objEvent) => {
        if (objEvent.dtToDate >= strToday) {
          lstEvents.push({
            strEmployeeName: objMember.strEmployeeName,
            strLabel: objEvent.strLabel,
            dtFromDate: objEvent.dtFromDate,
            dtToDate: objEvent.dtToDate,
            strStatus: objEvent.strStatus,
            blnMasked: objEvent.blnIsMasked,
          });
        }
      });
    });
    return lstEvents.sort((objA, objB) => objA.dtFromDate.localeCompare(objB.dtFromDate));
  }, [objTeamCalendar]);

  const lstActiveRows = intTab === 0 ? lstQueue : intTab === 1 ? lstDelegated : lstActioned;
  const lstFiltered = useMemo(() => {
    const strNeedle = strSearch.trim().toLowerCase();
    const lstSearched = !strNeedle
      ? lstActiveRows
      : lstActiveRows.filter((objItem) =>
          [fnEmployeeName(objItem), objItem.strEmployeeCode, objItem.strTypeName, objItem.strTypeCode, objItem.strStatus]
            .some((objValue) => String(objValue ?? "").toLowerCase().includes(strNeedle)));
    const intDirection = objSort.blnAsc ? 1 : -1;
    return [...lstSearched].sort((objA, objB) => {
      if (objSort.strKey === "decDays") {
        return ((objA.decDays ?? 0) - (objB.decDays ?? 0)) * intDirection;
      }
      const strA = String((objSort.strKey === "strEmployeeName" ? fnEmployeeName(objA) : objA.dtAppliedOn) ?? "");
      const strB = String((objSort.strKey === "strEmployeeName" ? fnEmployeeName(objB) : objB.dtAppliedOn) ?? "");
      return strA.localeCompare(strB) * intDirection;
    });
  }, [lstActiveRows, strSearch, objSort]);
  const lstPaged = useMemo(
    () => lstFiltered.slice(intPage * intRowsPerPage, intPage * intRowsPerPage + intRowsPerPage),
    [lstFiltered, intPage, intRowsPerPage],
  );

  useEffect(() => { setIntPage(0); }, [intTab, strSearch]);

  const fnToggleSort = useCallback((strKey: SortKey) => {
    setObjSort((objPrev) => ({ strKey, blnAsc: objPrev.strKey === strKey ? !objPrev.blnAsc : true }));
  }, []);

  const fnOpenDetail = useCallback(async (objItem: LeaveQueueItemDto) => {
    setObjDetail(objItem);
    setLstTimeline([]);
    setLstRoute([]);
    setBlnDetailLoading(true);
    try {
      const [objTimeline, lstRouteResult] = await Promise.all([
        leaveService.getApplicationTimeline(objItem.intID).catch(() => ({ intApplicationID: objItem.intID, lstTimeline: [] })),
        leaveService.getApplicationRouteSnapshot(objItem.intID).catch(() => [] as LeaveRouteStepDto[]),
      ]);
      setLstTimeline(objTimeline.lstTimeline ?? []);
      setLstRoute(lstRouteResult);
    } finally {
      setBlnDetailLoading(false);
    }
  }, []);

  async function fnRunDecision() {
    if (!objDecision) return;
    const { strKind, objItem } = objDecision;
    if ((strKind === "send_back" || strKind === "reject" || strKind === "cancel") && !strRemark.trim()) return;
    setIntProcessingID(objItem.intID);
    try {
      const objPayload = { strComment: strRemark.trim() || null, intVersionNo: objItem.objWorkflow?.intVersionNo ?? null };
      if (strKind === "approve") {
        await leaveService.approveApplication(objItem.intID, objPayload);
        fnShowToast(t("approved", "Leave application approved."), "success");
      } else if (strKind === "reject") {
        await leaveService.rejectApplication(objItem.intID, objPayload);
        fnShowToast(t("rejected", "Leave application rejected."), "success");
      } else if (strKind === "cancel") {
        await leaveService.cancelApprovedLeave(objItem.intID, { strComment: strRemark.trim() });
        fnShowToast(t("cancelled", "Approved leave cancelled."), "success");
      } else {
        await leaveService.sendBackApplication(objItem.intID, { strComment: strRemark.trim(), intVersionNo: objItem.objWorkflow?.intVersionNo ?? null });
        fnShowToast(t("sent_back", "Leave application sent back."), "success");
      }
      setObjDecision(null);
      setStrRemark("");
      setObjDetail(null);
      await fnLoadAll();
    } catch (objError) {
      fnShowToast((await createApiRequestError(objError)).message, "error");
    } finally {
      setIntProcessingID(null);
    }
  }

  if (blnRightsLoading) {
    return <Box sx={{ p: 2 }}><LinearProgress /></Box>;
  }
  if (!blnCanView) {
    return <Box sx={{ p: 3 }}><Alert severity="warning">{t("access_denied", "Leave approval access is not available for your user group.")}</Alert></Box>;
  }

  const lstCards = [
    { strKey: "pending", strLabel: t("card_pending", "Pending"), intValue: lstQueue.length, strColor: "#0a66a3", objIcon: <ScheduleRoundedIcon /> },
    { strKey: "overdue", strLabel: t("card_overdue", "Overdue"), intValue: intOverdueCount, strColor: "#b91c1c", objIcon: <EventBusyRoundedIcon /> },
    { strKey: "delegated", strLabel: t("card_delegated", "Delegated"), intValue: lstDelegated.length, strColor: "#7c3aed", objIcon: <GroupsRoundedIcon /> },
    { strKey: "upcoming", strLabel: t("card_upcoming", "Upcoming Team Leave"), intValue: lstUpcoming.length, strColor: "#0e7490", objIcon: <CalendarMonthRoundedIcon /> },
  ];
  const lstTabLabels = [
    t("tab_pending", "Pending My Approval"),
    t("tab_delegated", "Delegated to Me"),
    t("tab_actioned", "Actioned by Me"),
    t("tab_upcoming", "Upcoming Team Leave"),
    ...(blnCanViewTeamCalendar ? [t("tab_team_calendar", "Team Calendar")] : []),
  ];

  return <Stack spacing={2}>
    <Box className="pageBanner" data-control-id="ess.leave.approvals.header.banner">
      <Box className="bannerDots" />
      <Box className="bannerIcon"><FactCheckRoundedIcon sx={{ fontSize: 30 }} /></Box>
      <Box className="bannerDivider" />
      <Box sx={{ position: "relative", zIndex: 1, flex: 1, minWidth: 0 }}>
        <Typography component="h1" className="bannerTitle">{t("page_title", "Leave Approvals")}</Typography>
        <Typography component="p" className="bannerSubTitle">{t("page_subtitle", "Review and act on your team's leave requests.")}</Typography>
      </Box>
      <Stack direction="row" spacing={1} sx={{ position: "relative", zIndex: 1 }}>
        <Button data-controlid="ess.leave.approvals.refresh" variant="contained" startIcon={<RefreshRoundedIcon />} onClick={() => void fnLoadAll()} sx={{ bgcolor: "white", color: "#0b3f70", fontWeight: 800, "&:hover": { bgcolor: "#e2e8f0" } }}>{t("refresh", "Refresh")}</Button>
      </Stack>
    </Box>

    <Grid container spacing={1.25}>
      {lstCards.map((objCard) => <Grid item xs={6} md={3} key={objCard.strKey}><Paper sx={{ p: 1.75, borderRadius: "16px", border: "1px solid #e2e8f0", height: "100%" }}><Stack direction="row" spacing={1.25} alignItems="center"><Box sx={{ width: 44, height: 44, borderRadius: "12px", bgcolor: `${objCard.strColor}18`, color: objCard.strColor, display: "grid", placeItems: "center" }}>{objCard.objIcon}</Box><Box>{blnLoading ? <Skeleton width={40} height={30} /> : <Typography sx={{ fontWeight: 800, fontSize: "1.5rem", lineHeight: 1 }}>{objCard.intValue}</Typography>}<Typography sx={{ fontSize: ".72rem", color: "#64748b", fontWeight: 600 }}>{objCard.strLabel}</Typography></Box></Stack></Paper></Grid>)}
    </Grid>

    <Paper sx={{ borderRadius: "18px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
      <Tabs value={intTab} onChange={(_objEvent, intValue) => setIntTab(intValue)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: "1px solid #e2e8f0", px: 1 }}>
        {lstTabLabels.map((strLabel) => <Tab key={strLabel} label={strLabel} sx={{ fontWeight: 700, textTransform: "none" }} />)}
      </Tabs>

      {strError ? <Box sx={{ p: 2 }}><Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void fnLoadAll()}>{t("retry", "Retry")}</Button>}>{strError}</Alert></Box> : null}

      {intTab === 3 ? (
        <TeamLeaveList objTeamCalendar={objTeamCalendar} lstUpcoming={lstUpcoming} blnLoading={blnLoading} fnLabel={t} fnOnOpenCalendar={() => { setObjCalendarContext(null); setIntTab(4); }} blnCanViewCalendar={blnCanViewTeamCalendar} />
      ) : intTab === 4 ? (
        <Box sx={{ p: 2 }}>
          <EssTeamCalendarPage
            blnEmbedded
            intHighlightEmployeeID={objCalendarContext?.objItem.intEmployeeID ?? null}
            strInitialAnchorISO={objCalendarContext?.objItem.dtFromDate ?? undefined}
            objBackAction={objCalendarContext ? <Button size="small" variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => { const objItem = objCalendarContext.objItem; const intPrev = objCalendarContext.intPrevTab; setObjCalendarContext(null); setIntTab(intPrev); void fnOpenDetail(objItem); }} data-controlid="ess.leave.approvals.calendar.back">{t("back_to_request", "Back to Request")}</Button> : undefined}
          />
        </Box>
      ) : <>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ p: 2 }} justifyContent="space-between" alignItems={{ sm: "center" }}>
          <Typography sx={{ fontSize: ".8rem", color: "#64748b" }}>{lstFiltered.length} {t("requests", "request(s)")}</Typography>
          <TextField data-controlid="ess.leave.approvals.search" size="small" value={strSearch} onChange={(objEvent) => setStrSearch(objEvent.target.value)} placeholder={t("search_placeholder", "Search by employee or type")} InputProps={{ startAdornment: <InputAdornment position="start"><VisibilityOutlinedIcon fontSize="small" /></InputAdornment> }} sx={{ minWidth: { sm: 280 } }} />
        </Stack>
        <Divider />
        {blnLoading ? <Box sx={{ p: 2 }}><Skeleton variant="rounded" height={280} /></Box>
          : lstPaged.length === 0 ? <EmptyState strMessage={t("empty", "No requests to show here.")} />
          : blnMobile
            ? <Stack spacing={1} sx={{ p: 1.5 }}>{lstPaged.map((objItem) => <ApprovalCard key={objItem.intID} objItem={objItem} blnCanViewConfidential={blnCanViewConfidential} fnOnOpen={() => void fnOpenDetail(objItem)} fnLabel={t} />)}</Stack>
            : <ApprovalTable lstItems={lstPaged} intTab={intTab} objSort={objSort} fnToggleSort={fnToggleSort} blnCanViewConfidential={blnCanViewConfidential} fnOnOpen={(objItem) => void fnOpenDetail(objItem)} fnLabel={t} />}
        <TablePagination component="div" count={lstFiltered.length} page={intPage} onPageChange={(_objEvent, intNext) => setIntPage(intNext)} rowsPerPage={intRowsPerPage} onRowsPerPageChange={(objEvent) => { setIntRowsPerPage(Number(objEvent.target.value)); setIntPage(0); }} rowsPerPageOptions={[5, 10, 25]} />
      </>}
    </Paper>

    <DetailDrawer
      objItem={objDetail} lstTimeline={lstTimeline} lstRoute={lstRoute} blnLoading={blnDetailLoading}
      blnCanViewConfidential={blnCanViewConfidential} blnCanApprove={blnCanApprove} blnCanReject={blnCanReject} blnCanSendBack={blnCanSendBack}
      blnProcessing={intProcessingID === objDetail?.intID} fnOnClose={() => setObjDetail(null)}
      fnOnDecision={(strKind) => { setStrRemark(""); setObjDecision({ strKind, objItem: objDetail as LeaveQueueItemDto }); }}
      fnOnOpenCalendar={() => { if (objDetail) { setObjCalendarContext({ objItem: objDetail, intPrevTab: intTab }); setObjDetail(null); setIntTab(4); } }}
      blnCanViewCalendar={blnCanViewTeamCalendar} lstEmployees={lstEmployees} fnOnAssignBackup={fnAssignBackup} fnLabel={t}
    />

    <Dialog open={Boolean(objDecision)} onClose={() => intProcessingID === null && setObjDecision(null)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: "16px" } }}>
      {objDecision ? (() => {
        const blnRemarkRequired = objDecision.strKind === "reject" || objDecision.strKind === "send_back" || objDecision.strKind === "cancel";
        const blnRemarkMissing = blnRemarkRequired && !strRemark.trim();
        return <>
          <DialogTitle sx={{ fontWeight: 800 }}>{objDecision.strKind === "approve" ? t("confirm_approve", "Approve this application?") : objDecision.strKind === "reject" ? t("confirm_reject", "Reject this application?") : objDecision.strKind === "cancel" ? t("confirm_cancel_approved", "Cancel this approved leave?") : t("confirm_send_back", "Send this application back?")}</DialogTitle>
          <DialogContent>
            <TextField data-controlid="ess.leave.approvals.remark" autoFocus fullWidth multiline minRows={2} sx={{ mt: 1 }}
              label={objDecision.strKind === "reject" ? t("reject_reason_required", "Rejection reason (required)") : objDecision.strKind === "send_back" ? t("send_back_reason_required", "Correction reason (required)") : objDecision.strKind === "cancel" ? t("cancel_reason_required", "Cancellation reason (required)") : t("remark_optional", "Remark (optional)")}
              value={strRemark} onChange={(objEvent) => setStrRemark(objEvent.target.value)}
              error={blnRemarkMissing}
              helperText={blnRemarkMissing ? (objDecision.strKind === "reject" ? t("reject_reason_hint", "A reason is required to reject this request.") : objDecision.strKind === "cancel" ? t("cancel_reason_hint", "A reason is required to cancel approved leave.") : t("send_back_reason_hint", "State what the employee must correct before resubmitting.")) : ""} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setObjDecision(null)} disabled={intProcessingID !== null}>{t("cancel", "Cancel")}</Button>
            <Button variant="contained" color={objDecision.strKind === "approve" ? "success" : (objDecision.strKind === "reject" || objDecision.strKind === "cancel") ? "error" : "warning"} disabled={intProcessingID !== null || blnRemarkMissing} onClick={() => void fnRunDecision()}>{t("submit", "Submit")}</Button>
          </DialogActions>
        </>;
      })() : null}
    </Dialog>

    <Snackbar open={objToast.blnOpen} autoHideDuration={5000} onClose={() => setObjToast((objPrev) => ({ ...objPrev, blnOpen: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}><Alert severity={objToast.strSeverity} variant="filled" onClose={() => setObjToast((objPrev) => ({ ...objPrev, blnOpen: false }))}>{objToast.strMessage}</Alert></Snackbar>
  </Stack>;
}

function EmptyState({ strMessage }: { strMessage: string }) {
  return <Box sx={{ p: 5, textAlign: "center" }}><FactCheckRoundedIcon sx={{ color: "#94a3b8", fontSize: 40, mb: .5 }} /><Typography sx={{ color: "#64748b", fontWeight: 600 }}>{strMessage}</Typography></Box>;
}

function StatusChip({ strStatus, fnLabel }: { strStatus: string; fnLabel?: LabelFn }) {
  const objColor = LEAVE_STATUS_COLORS[strStatus] ?? { bg: "#f1f5f9", fg: "#475569" };
  const strText = getLeaveStatusLabel(strStatus, fnLabel ?? ((_strKey, strFallback) => strFallback ?? ""));
  return <Chip size="small" label={strText} sx={{ fontWeight: 700, bgcolor: objColor.bg, color: objColor.fg }} />;
}

function TypeCell({ objItem, blnCanViewConfidential, fnLabel }: { objItem: LeaveQueueItemDto; blnCanViewConfidential: boolean; fnLabel: LabelFn }) {
  if (objItem.blnIsMasked && !blnCanViewConfidential) {
    return <Stack direction="row" spacing={.75} alignItems="center"><LockRoundedIcon fontSize="small" sx={{ color: "#94a3b8" }} /><Typography sx={{ fontSize: ".82rem", color: "#64748b", fontStyle: "italic" }}>{fnLabel("confidential", "Confidential")}</Typography></Stack>;
  }
  const objBadge = getLeaveTypeBadge(objItem.strTypeCode, objItem.strTypeName);
  return <Stack direction="row" spacing={1} alignItems="center"><Box aria-hidden sx={{ width: 30, height: 30, borderRadius: "50%", bgcolor: objBadge.bg, color: objBadge.fg, display: "grid", placeItems: "center", fontWeight: 800, fontSize: ".68rem" }}>{objBadge.strLabel}</Box><Typography sx={{ fontWeight: 700, fontSize: ".82rem" }}>{objItem.strTypeName ?? `#${objItem.intLeaveTypeID}`}</Typography></Stack>;
}

function RowTags({ objItem, fnLabel }: { objItem: LeaveQueueItemDto; fnLabel: LabelFn }) {
  return <Stack direction="row" spacing={.5}>{objItem.blnIsOverdue ? <Chip size="small" icon={<EventBusyRoundedIcon />} label={fnLabel("overdue", "Overdue")} sx={{ bgcolor: "#fee2e2", color: "#991b1b", fontWeight: 700, height: 22 }} /> : null}{objItem.blnIsDelegated ? <Chip size="small" icon={<GroupsRoundedIcon />} label={fnLabel("delegated", "Delegated")} sx={{ bgcolor: "#ede9fe", color: "#6d28d9", fontWeight: 700, height: 22 }} /> : null}</Stack>;
}

function ApprovalTable({ lstItems, intTab, objSort, fnToggleSort, blnCanViewConfidential, fnOnOpen, fnLabel }: {
  lstItems: LeaveQueueItemDto[]; intTab: number; objSort: { strKey: SortKey; blnAsc: boolean }; fnToggleSort: (strKey: SortKey) => void;
  blnCanViewConfidential: boolean; fnOnOpen: (objItem: LeaveQueueItemDto) => void; fnLabel: LabelFn;
}) {
  const fnSortLabel = (strKey: SortKey, strText: string) => <Box component="span" role="button" tabIndex={0} onClick={() => fnToggleSort(strKey)} onKeyDown={(objEvent) => { if (objEvent.key === "Enter") fnToggleSort(strKey); }} sx={{ cursor: "pointer", userSelect: "none", display: "inline-flex", alignItems: "center", gap: .25 }}>{strText}{objSort.strKey === strKey ? (objSort.blnAsc ? " ▲" : " ▼") : ""}</Box>;
  return <Box sx={{ overflowX: "auto" }}><Table size="small"><TableHead><TableRow sx={{ "& th": { fontWeight: 700, bgcolor: "#f8fafc", whiteSpace: "nowrap" } }}>
    <TableCell>{fnSortLabel("strEmployeeName", fnLabel("employee", "Employee"))}</TableCell>
    <TableCell>{fnLabel("leave_type", "Leave Type")}</TableCell>
    <TableCell>{fnLabel("from_date", "From")}</TableCell>
    <TableCell>{fnLabel("to_date", "To")}</TableCell>
    <TableCell>{fnSortLabel("decDays", fnLabel("chargeable_days", "Chargeable Days"))}</TableCell>
    <TableCell>{intTab === 2 ? fnLabel("actioned_on", "Actioned On") : fnSortLabel("dtAppliedOn", fnLabel("applied_on", "Applied On"))}</TableCell>
    <TableCell>{fnLabel("status", "Status")}</TableCell>
    <TableCell align="right">{fnLabel("actions", "Actions")}</TableCell>
  </TableRow></TableHead><TableBody>
    {lstItems.map((objItem) => <TableRow key={objItem.intID} hover>
      <TableCell><Typography sx={{ fontWeight: 700, fontSize: ".82rem" }}>{fnEmployeeName(objItem)}</Typography><Typography sx={{ fontSize: ".7rem", color: "#64748b" }}>{objItem.strEmployeeCode ?? ""}</Typography></TableCell>
      <TableCell><Stack spacing={.5}><TypeCell objItem={objItem} blnCanViewConfidential={blnCanViewConfidential} fnLabel={fnLabel} /><RowTags objItem={objItem} fnLabel={fnLabel} /></Stack></TableCell>
      <TableCell>{formatLeaveDate(objItem.dtFromDate)}{objItem.blnFromHalf ? " (½)" : ""}</TableCell>
      <TableCell>{formatLeaveDate(objItem.dtToDate)}{objItem.blnToHalf ? " (½)" : ""}</TableCell>
      <TableCell>{objItem.decDays}</TableCell>
      <TableCell>{formatLeaveDate(intTab === 2 ? objItem.dtLastActionOn : objItem.dtAppliedOn)}</TableCell>
      <TableCell><StatusChip strStatus={objItem.strStatus} fnLabel={fnLabel} /></TableCell>
      <TableCell align="right"><Button data-controlid={`ess.leave.approvals.view.${objItem.intID}`} size="small" variant="outlined" startIcon={<VisibilityOutlinedIcon />} onClick={() => fnOnOpen(objItem)}>{fnLabel("review", "Review")}</Button></TableCell>
    </TableRow>)}
  </TableBody></Table></Box>;
}

function ApprovalCard({ objItem, blnCanViewConfidential, fnOnOpen, fnLabel }: { objItem: LeaveQueueItemDto; blnCanViewConfidential: boolean; fnOnOpen: () => void; fnLabel: LabelFn }) {
  return <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "14px" }} onClick={fnOnOpen}><Stack direction="row" justifyContent="space-between" alignItems="flex-start"><Box><Typography sx={{ fontWeight: 800, fontSize: ".86rem" }}>{fnEmployeeName(objItem)}</Typography><Box sx={{ mt: .5 }}><TypeCell objItem={objItem} blnCanViewConfidential={blnCanViewConfidential} fnLabel={fnLabel} /></Box><Typography sx={{ fontSize: ".74rem", color: "#64748b", mt: .5 }}>{formatLeaveDate(objItem.dtFromDate)} – {formatLeaveDate(objItem.dtToDate)} · {objItem.decDays} {fnLabel("days_short", "day(s)")}</Typography></Box><Stack spacing={.5} alignItems="flex-end"><StatusChip strStatus={objItem.strStatus} fnLabel={fnLabel} /><RowTags objItem={objItem} fnLabel={fnLabel} /></Stack></Stack></Paper>;
}

function TeamLeaveList({ objTeamCalendar, lstUpcoming, blnLoading, fnLabel, fnOnOpenCalendar, blnCanViewCalendar }: {
  objTeamCalendar: TeamCalendarDto | null; lstUpcoming: { strEmployeeName: string; strLabel: string | null; dtFromDate: string; dtToDate: string; strStatus: string; blnMasked: boolean }[];
  blnLoading: boolean; fnLabel: LabelFn; fnOnOpenCalendar: () => void; blnCanViewCalendar: boolean;
}) {
  if (blnLoading) return <Box sx={{ p: 2 }}><Skeleton variant="rounded" height={200} /></Box>;
  if (!objTeamCalendar) return <EmptyState strMessage={fnLabel("team_calendar_unavailable", "Team calendar is not available for your account.")} />;
  return <Box sx={{ p: 2 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
      <Typography sx={{ fontSize: ".82rem", color: "#64748b" }}>{objTeamCalendar.lstEmployees.length} {fnLabel("team_members", "team member(s)")} · {lstUpcoming.length} {fnLabel("upcoming_leaves", "upcoming leave(s)")}</Typography>
      {blnCanViewCalendar ? <Button data-controlid="ess.leave.approvals.open.calendar" size="small" variant="outlined" startIcon={<CalendarMonthRoundedIcon />} onClick={fnOnOpenCalendar}>{fnLabel("open_team_calendar", "Open Team Calendar")}</Button> : null}
    </Stack>
    {lstUpcoming.length === 0 ? <EmptyState strMessage={fnLabel("no_upcoming", "No upcoming team leave in the next 45 days.")} /> : <Stack spacing={.75}>
      {lstUpcoming.map((objEvent, intIndex) => <Paper key={`${objEvent.strEmployeeName}-${objEvent.dtFromDate}-${intIndex}`} variant="outlined" sx={{ p: 1.25, borderRadius: "12px" }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography sx={{ fontWeight: 700, fontSize: ".84rem" }}>{objEvent.strEmployeeName}</Typography><Typography sx={{ fontSize: ".74rem", color: "#64748b" }}>{objEvent.blnMasked ? fnLabel("unavailable", "Unavailable") : objEvent.strLabel ?? fnLabel("leave", "Leave")} · {formatLeaveDate(objEvent.dtFromDate)} – {formatLeaveDate(objEvent.dtToDate)}</Typography></Box><StatusChip strStatus={objEvent.strStatus} fnLabel={fnLabel} /></Stack></Paper>)}
    </Stack>}
  </Box>;
}

function KeyValue({ strLabel, objValue }: { strLabel: string; objValue: ReactNode }) {
  return <Box><Typography sx={{ fontSize: ".68rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>{strLabel}</Typography><Typography sx={{ fontWeight: 600, fontSize: ".86rem" }}>{objValue}</Typography></Box>;
}

function BackupResourceEditor({ objItem, lstEmployees, blnProcessing, strRule, fnOnAssignBackup, fnLabel }: {
  objItem: LeaveQueueItemDto; lstEmployees: EmployeeListRecord[]; blnProcessing: boolean; strRule: string;
  fnOnAssignBackup: (intApplicationID: number, intBackupEmployeeID: number) => void; fnLabel: LabelFn;
}) {
  const [intSelection, setIntSelection] = useState<number | "">(objItem.intBackupEmployeeID ?? "");
  useEffect(() => { setIntSelection(objItem.intBackupEmployeeID ?? ""); }, [objItem.intID, objItem.intBackupEmployeeID]);
  // Covering someone else's leave on these sessions makes a replacement backup mandatory, whatever
  // the Leave Type rule says — the server blocks approval until one is assigned.
  const lstCommitments = objItem.lstBackupCommitments ?? [];
  const strRequirement = lstCommitments.length
    ? fnLabel("backup_required", "Required")
    : strRule === "MANDATORY" ? fnLabel("backup_required", "Required") : strRule === "NOT_REQUIRED" ? fnLabel("backup_not_required_req", "Not required") : fnLabel("backup_optional", "Optional");
  return <Box>
    <Typography sx={{ fontSize: ".72rem", color: "#64748b", mb: .5 }}>{fnLabel("backup_resource", "Backup Resource")} · {strRequirement}</Typography>
    {lstCommitments.length ? (
      <Alert severity="warning" sx={{ mb: 1, py: 0.25 }} data-controlid="ess.leave.approvals.backup.commitment.alert">
        <Typography sx={{ fontSize: ".78rem", fontWeight: 700 }}>
          {fnLabel("backup_commitment_title", "This employee is an assigned backup resource")}
        </Typography>
        {lstCommitments.map((objCommitment) => (
          <Typography key={objCommitment.intApplicationID} sx={{ fontSize: ".76rem" }}>
            • {objCommitment.strEmployeeName ?? `#${objCommitment.intEmployeeID}`} — {objCommitment.strSessions}
          </Typography>
        ))}
        <Typography sx={{ fontSize: ".76rem", mt: .25 }}>
          {fnLabel("backup_commitment_hint", "Assign a replacement backup before approving this request.")}
        </Typography>
      </Alert>
    ) : null}
    <Stack direction="row" spacing={1} alignItems="center">
      <TextField select size="small" fullWidth value={intSelection === "" ? "" : String(intSelection)} onChange={(objEvent) => setIntSelection(objEvent.target.value ? Number(objEvent.target.value) : "")} data-controlid="ess.leave.approvals.backup.select">
        <MenuItem value="">{fnLabel("backup_none_option", "— Select colleague —")}</MenuItem>
        {lstEmployees.filter((objEmp) => objEmp.intID !== objItem.intEmployeeID).map((objEmp) => <MenuItem key={objEmp.intID} value={String(objEmp.intID)}>{objEmp.strFullName} ({objEmp.strEmployeeCode})</MenuItem>)}
      </TextField>
      <Button variant="outlined" size="small" disabled={blnProcessing || intSelection === "" || intSelection === objItem.intBackupEmployeeID} onClick={() => { if (intSelection !== "") fnOnAssignBackup(objItem.intID, Number(intSelection)); }} data-controlid="ess.leave.approvals.backup.save">{fnLabel("save", "Save")}</Button>
    </Stack>
  </Box>;
}

function DetailDrawer({ objItem, lstTimeline, lstRoute, blnLoading, blnCanViewConfidential, blnCanApprove, blnCanReject, blnCanSendBack, blnProcessing, fnOnClose, fnOnDecision, fnOnOpenCalendar, blnCanViewCalendar, lstEmployees, fnOnAssignBackup, fnLabel }: {
  objItem: LeaveQueueItemDto | null; lstTimeline: LeaveTimelineEntryDto[]; lstRoute: LeaveRouteStepDto[]; blnLoading: boolean;
  blnCanViewConfidential: boolean; blnCanApprove: boolean; blnCanReject: boolean; blnCanSendBack: boolean; blnProcessing: boolean;
  fnOnClose: () => void; fnOnDecision: (strKind: DecisionKind) => void; fnOnOpenCalendar: (strFrom: string, strTo: string) => void; blnCanViewCalendar: boolean;
  lstEmployees: EmployeeListRecord[]; fnOnAssignBackup: (intApplicationID: number, intBackupEmployeeID: number) => void; fnLabel: LabelFn;
}) {
  const blnMasked = Boolean(objItem?.blnIsMasked && !blnCanViewConfidential);
  const objCalc = objItem?.objCalculation ?? null;
  const blnActionable = objItem?.strStatus === "pending";
  return <Drawer anchor="right" open={Boolean(objItem)} onClose={fnOnClose} PaperProps={{ sx: { width: { xs: "100%", sm: 480 }, maxWidth: "100%" } }}>
    {objItem ? <Stack sx={{ height: "100%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2, borderBottom: "1px solid #e2e8f0" }}>
        <Typography sx={{ fontWeight: 800 }}>{fnLabel("request_details", "Request Details")}</Typography>
        <IconButton aria-label={fnLabel("close", "Close")} onClick={fnOnClose}><CloseRoundedIcon /></IconButton>
      </Stack>
      {blnProcessing ? <LinearProgress /> : null}
      <Box sx={{ p: 2, overflowY: "auto", flex: 1 }}><Stack spacing={2}>
        <Box><Typography sx={{ fontWeight: 800, fontSize: "1rem" }}>{fnEmployeeName(objItem)}</Typography><Typography sx={{ fontSize: ".76rem", color: "#64748b" }}>{objItem.strEmployeeCode ?? ""}</Typography><Stack direction="row" spacing={.5} sx={{ mt: .75 }}><StatusChip strStatus={objItem.strStatus} fnLabel={fnLabel} /><RowTags objItem={objItem} fnLabel={fnLabel} /></Stack></Box>
        <Grid container spacing={1.5}>
          <Grid item xs={6}><KeyValue strLabel={fnLabel("leave_type", "Leave Type")} objValue={blnMasked ? fnLabel("confidential", "Confidential") : (objItem.strTypeName ?? `#${objItem.intLeaveTypeID}`)} /></Grid>
          <Grid item xs={6}><KeyValue strLabel={fnLabel("requested_days", "Requested Days")} objValue={objCalc?.lstDateBreakdown?.length ?? "—"} /></Grid>
          <Grid item xs={6}><KeyValue strLabel={fnLabel("chargeable_days", "Chargeable Days")} objValue={objItem.decDays} /></Grid>
          <Grid item xs={6}><KeyValue strLabel={fnLabel("from_date", "From")} objValue={formatLeaveDate(objItem.dtFromDate)} /></Grid>
          <Grid item xs={6}><KeyValue strLabel={fnLabel("to_date", "To")} objValue={formatLeaveDate(objItem.dtToDate)} /></Grid>
          <Grid item xs={12}><KeyValue strLabel={fnLabel("reason", "Reason")} objValue={blnMasked ? fnLabel("confidential", "Confidential") : (objItem.strReason || "—")} /></Grid>
          <Grid item xs={12}>{blnActionable && blnCanApprove && !blnMasked
            ? <BackupResourceEditor objItem={objItem} lstEmployees={lstEmployees} blnProcessing={blnProcessing} strRule={String(objCalc?.strBackupResourceRuleCode || "").toUpperCase()} fnOnAssignBackup={fnOnAssignBackup} fnLabel={fnLabel} />
            : <KeyValue strLabel={fnLabel("backup_resource", "Backup Resource")} objValue={(() => {
              const strRule = String(objCalc?.strBackupResourceRuleCode || "").toUpperCase();
              const strRequirement = strRule === "MANDATORY" ? fnLabel("backup_required", "Required") : strRule === "NOT_REQUIRED" ? fnLabel("backup_not_required_req", "Not required") : strRule ? fnLabel("backup_optional", "Optional") : "";
              const strSelection = objItem.intBackupEmployeeID
                ? (lstEmployees.find((objEmp) => objEmp.intID === objItem.intBackupEmployeeID)?.strFullName ?? `Employee #${objItem.intBackupEmployeeID}`)
                : strRule === "NOT_REQUIRED" ? fnLabel("backup_not_required", "Not required") : fnLabel("backup_not_provided", "Not provided");
              return strRequirement ? `${strSelection} (${strRequirement})` : strSelection;
            })()} />}</Grid>
        </Grid>

        {objCalc && !blnMasked ? <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px" }}><Typography sx={{ fontWeight: 800, fontSize: ".82rem", mb: 1 }}>{fnLabel("balance_and_policy", "Balance & Policy")}</Typography><Grid container spacing={1}>
          <Grid item xs={6}><KeyValue strLabel={fnLabel("balance_before", "Balance Before")} objValue={objCalc.decAvailableBefore ?? "—"} /></Grid>
          <Grid item xs={6}><KeyValue strLabel={fnLabel("on_hold", "On Hold")} objValue={objCalc.decCalculatedDays} /></Grid>
          <Grid item xs={6}><KeyValue strLabel={fnLabel("projected_balance_after", "Projected Balance After Approval")} objValue={objCalc.decAvailableAfter ?? "—"} /></Grid>
          <Grid item xs={6}><KeyValue strLabel={fnLabel("proof_required", "Proof Required")} objValue={objCalc.blnProofRequired ? fnLabel("yes", "Yes") : fnLabel("no", "No")} /></Grid>
        </Grid>
        {objCalc.lstWarnings?.length ? <Alert severity="warning" icon={<WarningAmberRoundedIcon />} sx={{ mt: 1 }}><Typography sx={{ fontWeight: 700, fontSize: ".78rem" }}>{fnLabel("conflicts", "Conflicts")}</Typography>{objCalc.lstWarnings.map((objWarning) => <Typography key={objWarning.strCode} sx={{ fontSize: ".76rem" }}>• {objWarning.strMessage}</Typography>)}</Alert> : null}
        </Paper> : null}

        {objCalc?.lstDateBreakdown?.length && !blnMasked ? <Box>
          <Typography sx={{ fontWeight: 800, fontSize: ".82rem", mb: .75 }}>{fnLabel("date_explanation", "Date-wise Charge")}</Typography>
          <Stack spacing={.5} sx={{ maxHeight: 220, overflowY: "auto" }}>{objCalc.lstDateBreakdown.map((objDay) => <Stack key={objDay.dtDate} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: .6, borderRadius: "8px", bgcolor: objDay.blnCounted ? "#f0fdf4" : "#f8fafc" }}>
            <Box><Typography sx={{ fontSize: ".76rem", fontWeight: 700 }}>{formatLeaveDate(objDay.dtDate)}</Typography><Typography sx={{ fontSize: ".68rem", color: "#64748b", textTransform: "capitalize" }}>{objDay.strHolidayName || objDay.strCalculationReason?.replaceAll("_", " ")}</Typography></Box>
            <Chip size="small" label={objDay.decDays} sx={{ height: 20, fontWeight: 700, bgcolor: objDay.blnCounted ? "#dcfce7" : "#f1f5f9", color: "#334155" }} />
          </Stack>)}</Stack>
        </Box> : null}

        {objItem.lstAttachments?.length ? <Box><Typography sx={{ fontWeight: 800, fontSize: ".82rem", mb: .75 }}>{fnLabel("attachments", "Attachments")}</Typography><Stack spacing={.5}>{objItem.lstAttachments.map((objAttachment) => <Typography key={objAttachment.intID} sx={{ fontSize: ".8rem" }}>• {objAttachment.strFileName}</Typography>)}</Stack></Box> : null}

        <Box><Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: .75 }}><Typography sx={{ fontWeight: 800, fontSize: ".82rem" }}>{fnLabel("approval_route", "Approval Route")}</Typography>{blnCanViewCalendar && objItem.dtFromDate && objItem.dtToDate ? <Button data-controlid="ess.leave.approvals.detail.calendar" size="small" startIcon={<CalendarMonthRoundedIcon />} onClick={() => fnOnOpenCalendar(objItem.dtFromDate as string, objItem.dtToDate as string)}>{fnLabel("team_calendar", "Team Calendar")}</Button> : null}</Stack>
          {blnLoading ? <Skeleton variant="rounded" height={60} /> : lstRoute.length === 0 ? <Typography sx={{ fontSize: ".78rem", color: "#94a3b8" }}>{fnLabel("route_unavailable", "Route not available.")}</Typography> : <Stack spacing={.5}>{lstRoute.map((objStep) => <Stack key={objStep.intStepNo} direction="row" spacing={1} alignItems="center"><Box sx={{ width: 22, height: 22, borderRadius: "50%", bgcolor: objStep.strStepStatus === "approved" ? "#dcfce7" : objStep.strStepStatus === "pending" ? "#fef3c7" : "#f1f5f9", color: "#334155", display: "grid", placeItems: "center", fontSize: ".68rem", fontWeight: 800 }}>{objStep.intStepNo}</Box><Typography sx={{ fontSize: ".8rem" }}>{objStep.strApproverName || objStep.strApproverSourceCode?.replaceAll("_", " ")}</Typography>{objStep.strStepStatus ? <Chip size="small" label={objStep.strStepStatus} sx={{ height: 20, textTransform: "capitalize" }} /> : null}</Stack>)}</Stack>}
        </Box>

        <Box><Typography sx={{ fontWeight: 800, fontSize: ".82rem", mb: .75 }}>{fnLabel("timeline", "Timeline")}</Typography>
          {blnLoading ? <Skeleton variant="rounded" height={60} /> : lstTimeline.length === 0 ? <Typography sx={{ fontSize: ".78rem", color: "#94a3b8" }}>{fnLabel("timeline_empty", "No actions recorded yet.")}</Typography> : <Stack spacing={1}>{lstTimeline.map((objEntry, intIndex) => <Stack key={objEntry.intID ?? intIndex} direction="row" spacing={1.25}><Box sx={{ width: 9, height: 9, mt: .6, borderRadius: "50%", bgcolor: intIndex === 0 ? "#0a66a3" : "#94a3b8", flexShrink: 0 }} /><Box><Typography sx={{ fontWeight: 800, fontSize: ".78rem", textTransform: "capitalize" }}>{(objEntry.strActionCode ?? objEntry.strStepStatus ?? "").replaceAll("_", " ")}</Typography><Typography sx={{ fontSize: ".72rem", color: "#64748b" }}>{formatLeaveDate(objEntry.dtActionOn)}{objEntry.strComment ? ` — ${objEntry.strComment}` : ""}</Typography></Box></Stack>)}</Stack>}
        </Box>
      </Stack></Box>

      {blnActionable && (blnCanApprove || blnCanReject || blnCanSendBack) ? <Stack direction="row" spacing={1} sx={{ p: 2, borderTop: "1px solid #e2e8f0" }}>
        {blnCanSendBack ? <Button data-controlid="ess.leave.approvals.sendback" fullWidth variant="outlined" color="warning" startIcon={<ReplayRoundedIcon />} disabled={blnProcessing} onClick={() => fnOnDecision("send_back")}>{fnLabel("send_back", "Send Back")}</Button> : null}
        {blnCanReject ? <Button data-controlid="ess.leave.approvals.reject" fullWidth variant="outlined" color="error" startIcon={<CancelRoundedIcon />} disabled={blnProcessing} onClick={() => fnOnDecision("reject")}>{fnLabel("reject", "Reject")}</Button> : null}
        {blnCanApprove ? <Button data-controlid="ess.leave.approvals.approve" fullWidth variant="contained" color="success" startIcon={<CheckCircleRoundedIcon />} disabled={blnProcessing} onClick={() => fnOnDecision("approve")}>{fnLabel("approve", "Approve")}</Button> : null}
      </Stack> : null}

      {objItem.strStatus === "approved" && blnCanApprove && objCalc?.blnManagerCancelApprovedAllowed !== false ? <Stack direction="row" spacing={1} sx={{ p: 2, borderTop: "1px solid #e2e8f0" }}>
        <Button data-controlid="ess.leave.approvals.cancel-approved" fullWidth variant="outlined" color="error" startIcon={<CancelRoundedIcon />} disabled={blnProcessing} onClick={() => fnOnDecision("cancel")}>{fnLabel("cancel_approved_leave", "Cancel Approved Leave")}</Button>
      </Stack> : null}
    </Stack> : null}
  </Drawer>;
}
