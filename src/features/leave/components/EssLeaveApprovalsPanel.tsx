"use client";

import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
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
  Alert, Box, Button, Chip, Divider, Drawer, Grid, IconButton, InputAdornment,
  LinearProgress, Paper, Skeleton, Snackbar, Stack, Tab, Table, TableBody, TableCell,
  TableHead, TablePagination, TableRow, Tabs, TextField, Tooltip, Typography,
  useMediaQuery, useTheme,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { useLeaveApprovals } from "@/features/leave/hooks/useLeaveApprovals";
import { useLeaveWorkflowPermissions } from "@/features/leave/hooks/useLeaveWorkflowPermissions";
import { leaveService } from "@/features/leave/services/leaveService";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import {
  formatLeaveDate, getLeaveTypeBadge, LEAVE_STATUS_COLORS,
  type LeaveQueueItemDto, type LeaveRouteStepDto, type LeaveTimelineEntryDto,
  type TeamCalendarDto,
} from "@/features/leave/types";

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };
type DecisionKind = "approve" | "reject" | "send_back";
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
  const objRouter = useRouter();
  const { t } = useModuleLabels("ess-leave-approvals", "Unable to load Leave Approvals labels.");
  const objPermissions = useLeaveWorkflowPermissions();
  const {
    blnCanView, blnCanApprove, blnCanReject, blnCanSendBack,
    blnCanViewConfidential, blnCanViewTeamCalendar, blnLoading: blnRightsLoading,
  } = objPermissions;

  const { lstQueue, lstActioned, objTeamCalendar, blnLoading, strError, fnLoadAll } =
    useLeaveApprovals(blnCanView && !blnRightsLoading);

  const [intTab, setIntTab] = useState(0);
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

  function fnShowToast(strMessage: string, strSeverity: "success" | "error") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
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
    if ((strKind === "send_back") && !strRemark.trim()) return;
    setIntProcessingID(objItem.intID);
    try {
      const objPayload = { strComment: strRemark.trim() || null, intVersionNo: objItem.objWorkflow?.intVersionNo ?? null };
      if (strKind === "approve") {
        await leaveService.approveApplication(objItem.intID, objPayload);
        fnShowToast(t("approved", "Leave application approved."), "success");
      } else if (strKind === "reject") {
        await leaveService.rejectApplication(objItem.intID, objPayload);
        fnShowToast(t("rejected", "Leave application rejected."), "success");
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
  ];

  return <Stack spacing={2}>
    <Paper sx={{ p: { xs: 1.75, md: 2.25 }, borderRadius: "20px", background: "linear-gradient(135deg,#0b3f70 0%,#0a66a3 52%,#0e7490 100%)", color: "white", boxShadow: "0 14px 28px rgba(2,6,23,.18)" }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between">
        <Stack direction="row" spacing={1.4} alignItems="center"><Box sx={{ width: 48, height: 48, borderRadius: "14px", bgcolor: "rgba(255,255,255,.18)", display: "grid", placeItems: "center" }}><FactCheckRoundedIcon /></Box><Box><Typography component="h1" sx={{ fontWeight: 800, fontSize: "1.08rem" }}>{t("page_title", "Leave Approvals")}</Typography><Typography sx={{ fontSize: ".82rem", color: "rgba(241,245,249,.92)" }}>{t("page_subtitle", "Review and act on your team's leave requests.")}</Typography></Box></Stack>
        <Stack direction="row" spacing={1}>
          {blnCanViewTeamCalendar ? <Button data-controlid="ess.leave.approvals.calendar" variant="text" startIcon={<CalendarMonthRoundedIcon />} onClick={() => objRouter.push("/ess/team-calendar")} sx={{ color: "white" }}>{t("team_calendar", "Team Calendar")}</Button> : null}
          <Button data-controlid="ess.leave.approvals.refresh" variant="contained" startIcon={<RefreshRoundedIcon />} onClick={() => void fnLoadAll()} sx={{ bgcolor: "white", color: "#0b3f70", fontWeight: 800, "&:hover": { bgcolor: "#e2e8f0" } }}>{t("refresh", "Refresh")}</Button>
        </Stack>
      </Stack>
    </Paper>

    <Grid container spacing={1.25}>
      {lstCards.map((objCard) => <Grid item xs={6} md={3} key={objCard.strKey}><Paper sx={{ p: 1.75, borderRadius: "16px", border: "1px solid #e2e8f0", height: "100%" }}><Stack direction="row" spacing={1.25} alignItems="center"><Box sx={{ width: 44, height: 44, borderRadius: "12px", bgcolor: `${objCard.strColor}18`, color: objCard.strColor, display: "grid", placeItems: "center" }}>{objCard.objIcon}</Box><Box>{blnLoading ? <Skeleton width={40} height={30} /> : <Typography sx={{ fontWeight: 800, fontSize: "1.5rem", lineHeight: 1 }}>{objCard.intValue}</Typography>}<Typography sx={{ fontSize: ".72rem", color: "#64748b", fontWeight: 600 }}>{objCard.strLabel}</Typography></Box></Stack></Paper></Grid>)}
    </Grid>

    <Paper sx={{ borderRadius: "18px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
      <Tabs value={intTab} onChange={(_objEvent, intValue) => setIntTab(intValue)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: "1px solid #e2e8f0", px: 1 }}>
        {lstTabLabels.map((strLabel) => <Tab key={strLabel} label={strLabel} sx={{ fontWeight: 700, textTransform: "none" }} />)}
      </Tabs>

      {strError ? <Box sx={{ p: 2 }}><Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void fnLoadAll()}>{t("retry", "Retry")}</Button>}>{strError}</Alert></Box> : null}

      {intTab === 3 ? (
        <TeamLeaveList objTeamCalendar={objTeamCalendar} lstUpcoming={lstUpcoming} blnLoading={blnLoading} fnLabel={t} fnOnOpenCalendar={() => objRouter.push("/ess/team-calendar")} blnCanViewCalendar={blnCanViewTeamCalendar} />
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
      fnOnOpenCalendar={(strFrom, strTo) => objRouter.push(`/ess/team-calendar?from=${strFrom}&to=${strTo}`)}
      blnCanViewCalendar={blnCanViewTeamCalendar} fnLabel={t}
    />

    <Drawer anchor="bottom" open={Boolean(objDecision)} onClose={() => intProcessingID === null && setObjDecision(null)} PaperProps={{ sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxWidth: 560, mx: "auto", p: 2.5 } }}>
      {objDecision ? <Stack spacing={1.5}>
        <Typography sx={{ fontWeight: 800 }}>{objDecision.strKind === "approve" ? t("confirm_approve", "Approve this application?") : objDecision.strKind === "reject" ? t("confirm_reject", "Reject this application?") : t("confirm_send_back", "Send this application back?")}</Typography>
        <TextField data-controlid="ess.leave.approvals.remark" autoFocus fullWidth multiline minRows={2} label={objDecision.strKind === "send_back" ? t("remark_required", "Remark (required)") : t("remark_optional", "Remark (optional)")} value={strRemark} onChange={(objEvent) => setStrRemark(objEvent.target.value)} error={objDecision.strKind === "send_back" && !strRemark.trim()} helperText={objDecision.strKind === "send_back" && !strRemark.trim() ? t("remark_required_hint", "A remark is required to send back.") : ""} />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={() => setObjDecision(null)} disabled={intProcessingID !== null}>{t("cancel", "Cancel")}</Button>
          <Button variant="contained" color={objDecision.strKind === "approve" ? "success" : objDecision.strKind === "reject" ? "error" : "warning"} disabled={intProcessingID !== null || (objDecision.strKind === "send_back" && !strRemark.trim())} onClick={() => void fnRunDecision()}>{t("submit", "Submit")}</Button>
        </Stack>
      </Stack> : null}
    </Drawer>

    <Snackbar open={objToast.blnOpen} autoHideDuration={5000} onClose={() => setObjToast((objPrev) => ({ ...objPrev, blnOpen: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}><Alert severity={objToast.strSeverity} variant="filled" onClose={() => setObjToast((objPrev) => ({ ...objPrev, blnOpen: false }))}>{objToast.strMessage}</Alert></Snackbar>
  </Stack>;
}

function EmptyState({ strMessage }: { strMessage: string }) {
  return <Box sx={{ p: 5, textAlign: "center" }}><FactCheckRoundedIcon sx={{ color: "#94a3b8", fontSize: 40, mb: .5 }} /><Typography sx={{ color: "#64748b", fontWeight: 600 }}>{strMessage}</Typography></Box>;
}

function StatusChip({ strStatus }: { strStatus: string }) {
  const objColor = LEAVE_STATUS_COLORS[strStatus] ?? { bg: "#f1f5f9", fg: "#475569" };
  return <Chip size="small" label={strStatus.replaceAll("_", " ")} sx={{ fontWeight: 700, textTransform: "capitalize", bgcolor: objColor.bg, color: objColor.fg }} />;
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
    <TableCell>{fnSortLabel("decDays", fnLabel("days", "Days"))}</TableCell>
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
      <TableCell><StatusChip strStatus={objItem.strStatus} /></TableCell>
      <TableCell align="right"><Button data-controlid={`ess.leave.approvals.view.${objItem.intID}`} size="small" variant="outlined" startIcon={<VisibilityOutlinedIcon />} onClick={() => fnOnOpen(objItem)}>{fnLabel("review", "Review")}</Button></TableCell>
    </TableRow>)}
  </TableBody></Table></Box>;
}

function ApprovalCard({ objItem, blnCanViewConfidential, fnOnOpen, fnLabel }: { objItem: LeaveQueueItemDto; blnCanViewConfidential: boolean; fnOnOpen: () => void; fnLabel: LabelFn }) {
  return <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "14px" }} onClick={fnOnOpen}><Stack direction="row" justifyContent="space-between" alignItems="flex-start"><Box><Typography sx={{ fontWeight: 800, fontSize: ".86rem" }}>{fnEmployeeName(objItem)}</Typography><Box sx={{ mt: .5 }}><TypeCell objItem={objItem} blnCanViewConfidential={blnCanViewConfidential} fnLabel={fnLabel} /></Box><Typography sx={{ fontSize: ".74rem", color: "#64748b", mt: .5 }}>{formatLeaveDate(objItem.dtFromDate)} – {formatLeaveDate(objItem.dtToDate)} · {objItem.decDays} {fnLabel("days_short", "day(s)")}</Typography></Box><Stack spacing={.5} alignItems="flex-end"><StatusChip strStatus={objItem.strStatus} /><RowTags objItem={objItem} fnLabel={fnLabel} /></Stack></Stack></Paper>;
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
      {lstUpcoming.map((objEvent, intIndex) => <Paper key={`${objEvent.strEmployeeName}-${objEvent.dtFromDate}-${intIndex}`} variant="outlined" sx={{ p: 1.25, borderRadius: "12px" }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography sx={{ fontWeight: 700, fontSize: ".84rem" }}>{objEvent.strEmployeeName}</Typography><Typography sx={{ fontSize: ".74rem", color: "#64748b" }}>{objEvent.blnMasked ? fnLabel("unavailable", "Unavailable") : objEvent.strLabel ?? fnLabel("leave", "Leave")} · {formatLeaveDate(objEvent.dtFromDate)} – {formatLeaveDate(objEvent.dtToDate)}</Typography></Box><StatusChip strStatus={objEvent.strStatus} /></Stack></Paper>)}
    </Stack>}
  </Box>;
}

function KeyValue({ strLabel, objValue }: { strLabel: string; objValue: ReactNode }) {
  return <Box><Typography sx={{ fontSize: ".68rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>{strLabel}</Typography><Typography sx={{ fontWeight: 600, fontSize: ".86rem" }}>{objValue}</Typography></Box>;
}

function DetailDrawer({ objItem, lstTimeline, lstRoute, blnLoading, blnCanViewConfidential, blnCanApprove, blnCanReject, blnCanSendBack, blnProcessing, fnOnClose, fnOnDecision, fnOnOpenCalendar, blnCanViewCalendar, fnLabel }: {
  objItem: LeaveQueueItemDto | null; lstTimeline: LeaveTimelineEntryDto[]; lstRoute: LeaveRouteStepDto[]; blnLoading: boolean;
  blnCanViewConfidential: boolean; blnCanApprove: boolean; blnCanReject: boolean; blnCanSendBack: boolean; blnProcessing: boolean;
  fnOnClose: () => void; fnOnDecision: (strKind: DecisionKind) => void; fnOnOpenCalendar: (strFrom: string, strTo: string) => void; blnCanViewCalendar: boolean; fnLabel: LabelFn;
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
        <Box><Typography sx={{ fontWeight: 800, fontSize: "1rem" }}>{fnEmployeeName(objItem)}</Typography><Typography sx={{ fontSize: ".76rem", color: "#64748b" }}>{objItem.strEmployeeCode ?? ""}</Typography><Stack direction="row" spacing={.5} sx={{ mt: .75 }}><StatusChip strStatus={objItem.strStatus} /><RowTags objItem={objItem} fnLabel={fnLabel} /></Stack></Box>
        <Grid container spacing={1.5}>
          <Grid item xs={6}><KeyValue strLabel={fnLabel("leave_type", "Leave Type")} objValue={blnMasked ? fnLabel("confidential", "Confidential") : (objItem.strTypeName ?? `#${objItem.intLeaveTypeID}`)} /></Grid>
          <Grid item xs={6}><KeyValue strLabel={fnLabel("days", "Days")} objValue={objItem.decDays} /></Grid>
          <Grid item xs={6}><KeyValue strLabel={fnLabel("from_date", "From")} objValue={formatLeaveDate(objItem.dtFromDate)} /></Grid>
          <Grid item xs={6}><KeyValue strLabel={fnLabel("to_date", "To")} objValue={formatLeaveDate(objItem.dtToDate)} /></Grid>
          <Grid item xs={12}><KeyValue strLabel={fnLabel("reason", "Reason")} objValue={blnMasked ? fnLabel("confidential", "Confidential") : (objItem.strReason || "—")} /></Grid>
          <Grid item xs={12}><KeyValue strLabel={fnLabel("backup_resource", "Backup Resource")} objValue={objItem.intBackupEmployeeID ? `Employee #${objItem.intBackupEmployeeID}` : "—"} /></Grid>
        </Grid>

        {objCalc && !blnMasked ? <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px" }}><Typography sx={{ fontWeight: 800, fontSize: ".82rem", mb: 1 }}>{fnLabel("balance_and_policy", "Balance & Policy")}</Typography><Grid container spacing={1}>
          <Grid item xs={6}><KeyValue strLabel={fnLabel("balance_before", "Balance Before")} objValue={objCalc.decAvailableBefore ?? "—"} /></Grid>
          <Grid item xs={6}><KeyValue strLabel={fnLabel("balance_after", "Balance After")} objValue={objCalc.decAvailableAfter ?? "—"} /></Grid>
          <Grid item xs={6}><KeyValue strLabel={fnLabel("chargeable", "Chargeable")} objValue={objCalc.decCalculatedDays} /></Grid>
          <Grid item xs={6}><KeyValue strLabel={fnLabel("proof_required", "Proof Required")} objValue={objCalc.blnProofRequired ? fnLabel("yes", "Yes") : fnLabel("no", "No")} /></Grid>
        </Grid>
        {objCalc.lstWarnings?.length ? <Alert severity="warning" icon={<WarningAmberRoundedIcon />} sx={{ mt: 1 }}><Typography sx={{ fontWeight: 700, fontSize: ".78rem" }}>{fnLabel("conflicts", "Conflicts")}</Typography>{objCalc.lstWarnings.map((objWarning) => <Typography key={objWarning.strCode} sx={{ fontSize: ".76rem" }}>• {objWarning.strMessage}</Typography>)}</Alert> : null}
        </Paper> : null}

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
    </Stack> : null}
  </Drawer>;
}
