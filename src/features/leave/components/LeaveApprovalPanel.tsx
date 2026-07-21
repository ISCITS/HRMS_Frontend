"use client";

import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
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
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { leaveService } from "@/features/leave/services/leaveService";
import { LEAVE_STATUS_COLORS, type LeaveApplicationDto } from "@/features/leave/types";

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };

const STATUS_FILTERS = ["pending", "approved", "rejected", "cancelled"] as const;

export default function LeaveApprovalPanel() {
  const [lstQueue, setLstQueue] = useState<LeaveApplicationDto[]>([]);
  const [strStatusFilter, setStrStatusFilter] = useState<string>("pending");
  const [blnLoading, setBlnLoading] = useState(true);
  const [intProcessingID, setIntProcessingID] = useState<number | null>(null);
  const [objRejectDialog, setObjRejectDialog] = useState<{ blnOpen: boolean; intID: number | null; strComment: string }>({ blnOpen: false, intID: null, strComment: "" });
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  function showToast(strMessage: string, strSeverity: "success" | "error") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  const loadQueue = useCallback(async () => {
    setBlnLoading(true);
    try {
      const lstResult = await leaveService.listApplicationQueue(strStatusFilter);
      setLstQueue(lstResult);
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    } finally {
      setBlnLoading(false);
    }
  }, [strStatusFilter]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  async function approve(intApplicationID: number) {
    setIntProcessingID(intApplicationID);
    try {
      await leaveService.approveApplication(intApplicationID);
      showToast("Leave approved.", "success");
      await loadQueue();
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    } finally {
      setIntProcessingID(null);
    }
  }

  async function confirmReject() {
    if (!objRejectDialog.intID) return;
    setIntProcessingID(objRejectDialog.intID);
    try {
      await leaveService.rejectApplication(objRejectDialog.intID, { strComment: objRejectDialog.strComment.trim() || null });
      showToast("Leave rejected.", "success");
      setObjRejectDialog({ blnOpen: false, intID: null, strComment: "" });
      await loadQueue();
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    } finally {
      setIntProcessingID(null);
    }
  }

  return (
    <Stack spacing={1.5}>
      <Paper sx={{ p: { xs: 1.5, md: 2 }, borderRadius: "20px", background: "linear-gradient(135deg, #0b3f70 0%, #0a66a3 52%, #0e7490 100%)", color: "white", boxShadow: "0 14px 28px rgba(2, 6, 23, 0.18)" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.2}>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Box sx={{ width: 46, height: 46, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.2)", display: "grid", placeItems: "center" }}>
              <FactCheckRoundedIcon />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: "1rem" }}>Leave Approvals</Typography>
              <Typography sx={{ fontSize: "0.82rem", color: "rgba(241,245,249,0.92)" }}>Review and act on employee leave applications.</Typography>
            </Box>
          </Stack>
          <TextField controlId="leave.approval.status.select" label="Status" select size="small" value={strStatusFilter}
            onChange={(objEvent) => setStrStatusFilter(objEvent.target.value)}
            sx={{ minWidth: 160, bgcolor: "white", borderRadius: 1 }}>
            {STATUS_FILTERS.map((strStatus) => (
              <MenuItem key={strStatus} value={strStatus} sx={{ textTransform: "capitalize" }}>{strStatus}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      <Paper sx={{ p: 1.5, borderRadius: "18px", border: "1px solid #e2e8f0" }}>
        {blnLoading ? (
          <Box sx={{ display: "grid", placeItems: "center", py: 6 }}><CircularProgress /></Box>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>From</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>To</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Days</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lstQueue.length === 0 ? (
                  <TableRow><TableCell colSpan={7} sx={{ textAlign: "center", color: "#64748b", py: 3 }}>No applications in this status.</TableCell></TableRow>
                ) : (
                  lstQueue.map((objApp) => {
                    const objColor = LEAVE_STATUS_COLORS[objApp.strStatus] ?? { bg: "#f1f5f9", fg: "#475569" };
                    const blnBusy = intProcessingID === objApp.intID;
                    return (
                      <TableRow key={objApp.intID} hover>
                        <TableCell>
                          <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>{objApp.strEmployeeName ?? `Emp #${objApp.intEmployeeID}`}</Typography>
                          <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>{objApp.strEmployeeCode ?? ""}</Typography>
                        </TableCell>
                        <TableCell>{objApp.strTypeName ?? `#${objApp.intLeaveTypeID}`}</TableCell>
                        <TableCell>{objApp.dtFromDate}</TableCell>
                        <TableCell>{objApp.dtToDate}</TableCell>
                        <TableCell>{objApp.decDays}</TableCell>
                        <TableCell><Chip size="small" label={objApp.strStatus} sx={{ fontWeight: 700, textTransform: "capitalize", bgcolor: objColor.bg, color: objColor.fg }} /></TableCell>
                        <TableCell align="right">
                          {objApp.strStatus === "pending" ? (
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Button controlId={`leave.approve.${objApp.intID}`} size="small" variant="contained" color="success" startIcon={<CheckCircleRoundedIcon />} disabled={blnBusy} onClick={() => approve(objApp.intID)}>Approve</Button>
                              <Button controlId={`leave.reject.${objApp.intID}`} size="small" variant="outlined" color="error" disabled={blnBusy} onClick={() => setObjRejectDialog({ blnOpen: true, intID: objApp.intID, strComment: "" })}>Reject</Button>
                            </Stack>
                          ) : (
                            <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>—</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      <Dialog open={objRejectDialog.blnOpen} onClose={() => setObjRejectDialog({ blnOpen: false, intID: null, strComment: "" })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Reject Leave Application</DialogTitle>
        <DialogContent dividers>
          <TextField controlId="leave.reject.comment.input" label="Reason (optional)" fullWidth size="small" multiline minRows={2} value={objRejectDialog.strComment}
            onChange={(objEvent) => setObjRejectDialog((objPrev) => ({ ...objPrev, strComment: objEvent.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button controlId="leave.reject.cancel.button" onClick={() => setObjRejectDialog({ blnOpen: false, intID: null, strComment: "" })}>Cancel</Button>
          <Button controlId="leave.reject.confirm.button" variant="contained" color="error" onClick={confirmReject}>Reject</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={objToast.blnOpen} autoHideDuration={5000} onClose={() => setObjToast((objPrev) => ({ ...objPrev, blnOpen: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={objToast.strSeverity} variant="filled" onClose={() => setObjToast((objPrev) => ({ ...objPrev, blnOpen: false }))}>{objToast.strMessage}</Alert>
      </Snackbar>
    </Stack>
  );
}
