"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { leaveService } from "@/features/leave/services/leaveService";
import {
  formatLeaveDate,
  getLeaveTypeBadge,
  LEAVE_STATUS_COLORS,
  type LeaveApplicationDto,
  type LeaveApplyRequest,
  type LeaveBalanceDto,
  type LeaveTypeDto,
} from "@/features/leave/types";

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };

const lstStatusTabs = ["all", "pending", "approved", "rejected", "cancelled"] as const;
type StatusTab = (typeof lstStatusTabs)[number];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): LeaveApplyRequest {
  return { intLeaveTypeID: 0, dtFromDate: todayISO(), dtToDate: todayISO(), blnFromHalf: false, blnToHalf: false, strReason: "" };
}

function computeDays(objForm: LeaveApplyRequest) {
  const objFrom = new Date(objForm.dtFromDate);
  const objTo = new Date(objForm.dtToDate);
  if (Number.isNaN(objFrom.getTime()) || Number.isNaN(objTo.getTime()) || objTo < objFrom) return 0;
  const intSpan = Math.round((objTo.getTime() - objFrom.getTime()) / 86400000) + 1;
  let decDays = intSpan;
  if (objForm.blnFromHalf) decDays -= 0.5;
  if (objForm.blnToHalf) decDays -= 0.5;
  return Math.max(decDays, 0);
}

function LeaveTypeBadge({ strTypeCode, strTypeName, intSize = 34 }: { strTypeCode?: string | null; strTypeName?: string | null; intSize?: number }) {
  const objBadge = getLeaveTypeBadge(strTypeCode, strTypeName);
  return (
    <Box
      sx={{
        width: intSize,
        height: intSize,
        borderRadius: "50%",
        backgroundColor: objBadge.bg,
        color: objBadge.fg,
        display: "grid",
        placeItems: "center",
        fontWeight: 800,
        fontSize: intSize <= 34 ? "0.72rem" : "0.85rem",
        flexShrink: 0,
      }}
    >
      {objBadge.strLabel}
    </Box>
  );
}

export default function EssLeaveApplyPanel() {
  const [lstTypes, setLstTypes] = useState<LeaveTypeDto[]>([]);
  const [lstBalances, setLstBalances] = useState<LeaveBalanceDto[]>([]);
  const [lstApplications, setLstApplications] = useState<LeaveApplicationDto[]>([]);
  const [objForm, setObjForm] = useState<LeaveApplyRequest>(emptyForm());
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [blnApplyOpen, setBlnApplyOpen] = useState(false);
  const [objDetail, setObjDetail] = useState<LeaveApplicationDto | null>(null);
  const [strStatusTab, setStrStatusTab] = useState<StatusTab>("all");
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  const decDays = useMemo(() => computeDays(objForm), [objForm]);
  const objSelectedBalance = useMemo(
    () => lstBalances.find((objBalance) => objBalance.intLeaveTypeID === objForm.intLeaveTypeID),
    [lstBalances, objForm.intLeaveTypeID],
  );
  const lstVisibleApplications = useMemo(
    () => (strStatusTab === "all" ? lstApplications : lstApplications.filter((objApp) => objApp.strStatus === strStatusTab)),
    [lstApplications, strStatusTab],
  );

  function showToast(strMessage: string, strSeverity: "success" | "error") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  async function loadAll() {
    setBlnLoading(true);
    try {
      const [lstTypeResult, lstBalanceResult, lstAppResult] = await Promise.all([
        leaveService.getEssLeaveTypes(),
        leaveService.getMyBalances(),
        leaveService.listMyApplications(),
      ]);
      setLstTypes(lstTypeResult);
      setLstBalances(lstBalanceResult);
      setLstApplications(lstAppResult);
      setObjForm((objPrev) => ({ ...objPrev, intLeaveTypeID: objPrev.intLeaveTypeID || lstTypeResult[0]?.intID || 0 }));
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  function openApply(intLeaveTypeID?: number) {
    setObjForm({ ...emptyForm(), intLeaveTypeID: intLeaveTypeID || lstTypes[0]?.intID || 0 });
    setBlnApplyOpen(true);
  }

  async function submitApplication() {
    if (!objForm.intLeaveTypeID) {
      showToast("Please select a leave type.", "error");
      return;
    }
    setBlnSaving(true);
    try {
      await leaveService.applyLeave({ ...objForm, strReason: objForm.strReason?.trim() || null });
      showToast("Leave application submitted.", "success");
      setBlnApplyOpen(false);
      await loadAll();
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    } finally {
      setBlnSaving(false);
    }
  }

  async function cancelApplication(intApplicationID: number) {
    try {
      await leaveService.cancelMyApplication(intApplicationID);
      showToast("Leave application cancelled.", "success");
      setObjDetail(null);
      await loadAll();
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    }
  }

  const intPending = lstApplications.filter((objApp) => objApp.strStatus === "pending").length;

  return (
    <Stack spacing={2}>
      {/* Header banner */}
      <Paper
        sx={{
          p: { xs: 1.75, md: 2.25 },
          borderRadius: "20px",
          background: "linear-gradient(135deg, #0b3f70 0%, #0a66a3 52%, #0e7490 100%)",
          color: "white",
          boxShadow: "0 14px 28px rgba(2, 6, 23, 0.18)",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
          <Stack direction="row" spacing={1.4} alignItems="center">
            <Box sx={{ width: 48, height: 48, borderRadius: "14px", backgroundColor: "rgba(255,255,255,0.18)", display: "grid", placeItems: "center" }}>
              <EventAvailableRoundedIcon />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: "1.05rem" }}>Leave Management</Typography>
              <Typography sx={{ fontSize: "0.82rem", color: "rgba(241,245,249,0.92)" }}>
                Your balances, applications and requests in one place.
              </Typography>
            </Box>
          </Stack>
          <Button
            controlId="ess.leave.apply.open"
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => openApply()}
            sx={{ bgcolor: "white", color: "#0b3f70", fontWeight: 800, "&:hover": { bgcolor: "#e2e8f0" } }}
          >
            Apply for Leave
          </Button>
        </Stack>
      </Paper>

      {blnLoading ? (
        <Box sx={{ display: "grid", placeItems: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Balance summary cards */}
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1, fontSize: "0.95rem" }}>My Leave Balance</Typography>
            {lstBalances.length === 0 ? (
              <Paper sx={{ p: 2, borderRadius: "16px", border: "1px solid #e2e8f0", color: "#64748b" }}>
                No leave balance available yet.
              </Paper>
            ) : (
              <Grid container spacing={1.5}>
                {lstBalances.map((objBalance) => {
                  const objBadge = getLeaveTypeBadge(objBalance.strTypeCode, objBalance.strTypeName);
                  return (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={objBalance.intLeaveTypeID}>
                      <Paper sx={{ p: 1.5, borderRadius: "16px", border: "1px solid #e2e8f0", height: "100%", boxShadow: "0 6px 16px rgba(15,23,42,0.05)" }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Box
                            sx={{
                              width: 54,
                              height: 54,
                              borderRadius: "14px",
                              backgroundColor: objBadge.bg,
                              color: objBadge.fg,
                              display: "grid",
                              placeItems: "center",
                              fontWeight: 800,
                              fontSize: "1.4rem",
                              flexShrink: 0,
                            }}
                          >
                            {objBalance.decAvailable}
                          </Box>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: 0.2, lineHeight: 1.2 }} noWrap>
                              {objBalance.strTypeName}
                            </Typography>
                            <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>
                              {objBalance.decAvailed} used · {objBalance.decHeld} held
                            </Typography>
                            <Button
                              controlId={`ess.leave.apply.${objBalance.intLeaveTypeID}`}
                              size="small"
                              startIcon={<AddRoundedIcon sx={{ fontSize: 16 }} />}
                              onClick={() => openApply(objBalance.intLeaveTypeID)}
                              sx={{ textTransform: "none", px: 0.5, minWidth: 0, fontWeight: 700, mt: 0.25 }}
                            >
                              Apply
                            </Button>
                          </Box>
                        </Stack>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>

          {/* Leave Management table */}
          <Paper sx={{ borderRadius: "18px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <Box sx={{ px: 2, pt: 1.5, pb: 0.5, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
              <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>My Leaves</Typography>
              <Chip
                size="small"
                label={`${intPending} pending`}
                sx={{ fontWeight: 700, bgcolor: intPending ? "#fef3c7" : "#f1f5f9", color: intPending ? "#92400e" : "#475569" }}
              />
            </Box>
            <Tabs
              value={strStatusTab}
              onChange={(_objEvent, strValue) => setStrStatusTab(strValue as StatusTab)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ px: 1, minHeight: 40, "& .MuiTab-root": { minHeight: 40, textTransform: "capitalize", fontWeight: 700 } }}
            >
              {lstStatusTabs.map((strTab) => (
                <Tab key={strTab} value={strTab} label={strTab} />
              ))}
            </Tabs>
            <Divider />
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: 700, color: "#334155", backgroundColor: "#f8fafc" } }}>
                    <TableCell>Actions</TableCell>
                    <TableCell>Applied On</TableCell>
                    <TableCell>Leave Type</TableCell>
                    <TableCell>From Date</TableCell>
                    <TableCell>To Date</TableCell>
                    <TableCell align="center">Days</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lstVisibleApplications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: "center", color: "#64748b", py: 4 }}>
                        No {strStatusTab === "all" ? "" : strStatusTab} applications yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lstVisibleApplications.map((objApp) => {
                      const objColor = LEAVE_STATUS_COLORS[objApp.strStatus] ?? { bg: "#f1f5f9", fg: "#475569" };
                      return (
                        <TableRow key={objApp.intID} hover>
                          <TableCell>
                            <Stack direction="row" spacing={0.25}>
                              <Tooltip title="View details" arrow>
                                <IconButton size="small" color="primary" onClick={() => setObjDetail(objApp)} data-control-id={`ess.leave.detail.${objApp.intID}`}>
                                  <InfoOutlinedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {objApp.strStatus === "pending" ? (
                                <Tooltip title="Cancel application" arrow>
                                  <IconButton size="small" color="error" onClick={() => cancelApplication(objApp.intID)} data-control-id={`ess.leave.cancel.${objApp.intID}`}>
                                    <CancelRoundedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              ) : null}
                            </Stack>
                          </TableCell>
                          <TableCell>{formatLeaveDate(objApp.dtAppliedOn)}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <LeaveTypeBadge strTypeCode={objApp.strTypeCode} strTypeName={objApp.strTypeName} />
                              <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "0.82rem" }}>
                                {objApp.strTypeName ?? `#${objApp.intLeaveTypeID}`}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>{formatLeaveDate(objApp.dtFromDate)}{objApp.blnFromHalf ? " ½" : ""}</TableCell>
                          <TableCell>{formatLeaveDate(objApp.dtToDate)}{objApp.blnToHalf ? " ½" : ""}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>{objApp.decDays}</TableCell>
                          <TableCell>
                            <Chip size="small" label={objApp.strStatus} sx={{ fontWeight: 700, textTransform: "capitalize", bgcolor: objColor.bg, color: objColor.fg }} />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </>
      )}

      {/* Apply dialog */}
      <Dialog open={blnApplyOpen} onClose={() => setBlnApplyOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Apply for Leave
          <IconButton size="small" onClick={() => setBlnApplyOpen(false)}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1.5} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField
                controlId="ess.leave.type.select"
                label="Leave Type"
                select
                fullWidth
                size="small"
                value={objForm.intLeaveTypeID || ""}
                onChange={(objEvent) => setObjForm((objPrev) => ({ ...objPrev, intLeaveTypeID: Number(objEvent.target.value) }))}
              >
                {lstTypes.map((objType) => (
                  <MenuItem key={objType.intID} value={objType.intID}>
                    {objType.strTypeName} ({objType.strTypeCode})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                controlId="ess.leave.from.input"
                label="From"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={objForm.dtFromDate}
                onChange={(objEvent) => setObjForm((objPrev) => ({ ...objPrev, dtFromDate: objEvent.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                controlId="ess.leave.to.input"
                label="To"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={objForm.dtToDate}
                onChange={(objEvent) => setObjForm((objPrev) => ({ ...objPrev, dtToDate: objEvent.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <Stack direction="row" spacing={1} alignItems="center">
                <FormControlLabel
                  control={<Switch size="small" checked={objForm.blnFromHalf} onChange={(objEvent) => setObjForm((objPrev) => ({ ...objPrev, blnFromHalf: objEvent.target.checked }))} />}
                  label="First-day half"
                />
                <FormControlLabel
                  control={<Switch size="small" checked={objForm.blnToHalf} onChange={(objEvent) => setObjForm((objPrev) => ({ ...objPrev, blnToHalf: objEvent.target.checked }))} />}
                  label="Last-day half"
                />
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <TextField
                controlId="ess.leave.reason.input"
                label="Reason"
                fullWidth
                size="small"
                multiline
                minRows={2}
                value={objForm.strReason ?? ""}
                onChange={(objEvent) => setObjForm((objPrev) => ({ ...objPrev, strReason: objEvent.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                <Chip label={`Duration: ${decDays} day(s)`} sx={{ fontWeight: 700, bgcolor: "#e0f2fe", color: "#075985" }} />
                {objSelectedBalance ? (
                  <Chip
                    label={`Available: ${objSelectedBalance.decAvailable}`}
                    sx={{
                      fontWeight: 700,
                      bgcolor: decDays > objSelectedBalance.decAvailable ? "#fee2e2" : "#dcfce7",
                      color: decDays > objSelectedBalance.decAvailable ? "#991b1b" : "#166534",
                    }}
                  />
                ) : null}
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setBlnApplyOpen(false)} sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            controlId="ess.leave.submit.button"
            variant="contained"
            startIcon={<SendRoundedIcon />}
            onClick={submitApplication}
            disabled={blnSaving || decDays <= 0}
          >
            {blnSaving ? "Submitting..." : "Submit Application"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={Boolean(objDetail)} onClose={() => setObjDetail(null)} fullWidth maxWidth="sm">
        {objDetail ? (
          <>
            <DialogTitle sx={{ fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <LeaveTypeBadge strTypeCode={objDetail.strTypeCode} strTypeName={objDetail.strTypeName} intSize={40} />
                <Box>
                  <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }}>{objDetail.strTypeName ?? `Leave #${objDetail.intLeaveTypeID}`}</Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>Applied {formatLeaveDate(objDetail.dtAppliedOn)}</Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={() => setObjDetail(null)}>
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>From</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{formatLeaveDate(objDetail.dtFromDate)}{objDetail.blnFromHalf ? " (½)" : ""}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>To</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{formatLeaveDate(objDetail.dtToDate)}{objDetail.blnToHalf ? " (½)" : ""}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>Days</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{objDetail.decDays}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>Status</Typography>
                  <Chip
                    size="small"
                    label={objDetail.strStatus}
                    sx={{
                      fontWeight: 700,
                      textTransform: "capitalize",
                      bgcolor: (LEAVE_STATUS_COLORS[objDetail.strStatus] ?? { bg: "#f1f5f9" }).bg,
                      color: (LEAVE_STATUS_COLORS[objDetail.strStatus] ?? { fg: "#475569" }).fg,
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>Reason</Typography>
                  <Typography sx={{ fontWeight: 600, color: "#0f172a" }}>{objDetail.strReason?.trim() || "—"}</Typography>
                </Grid>
                {objDetail.lstActions && objDetail.lstActions.length > 0 ? (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 0.5 }} />
                    <Typography sx={{ fontSize: "0.72rem", color: "#64748b", mb: 0.5 }}>Timeline</Typography>
                    <Stack spacing={0.75}>
                      {objDetail.lstActions.map((objAction) => (
                        <Stack key={objAction.intID} direction="row" spacing={1} alignItems="center">
                          <Chip size="small" label={objAction.strAction} sx={{ fontWeight: 700, textTransform: "capitalize" }} />
                          <Typography sx={{ fontSize: "0.78rem", color: "#475569" }}>
                            {formatLeaveDate(objAction.dtActionOn)}
                            {objAction.strComment ? ` — ${objAction.strComment}` : ""}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Grid>
                ) : null}
              </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 1.5 }}>
              {objDetail.strStatus === "pending" ? (
                <Button color="error" startIcon={<CancelRoundedIcon />} onClick={() => cancelApplication(objDetail.intID)} sx={{ fontWeight: 700 }}>
                  Cancel Application
                </Button>
              ) : null}
              <Button onClick={() => setObjDetail(null)} sx={{ fontWeight: 700 }}>
                Close
              </Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>

      <Snackbar
        open={objToast.blnOpen}
        autoHideDuration={5000}
        onClose={() => setObjToast((objPrev) => ({ ...objPrev, blnOpen: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={objToast.strSeverity} variant="filled" onClose={() => setObjToast((objPrev) => ({ ...objPrev, blnOpen: false }))}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
