"use client";

import BeachAccessRoundedIcon from "@mui/icons-material/BeachAccessRounded";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { strEssHeaderGradient } from "@/features/leave/components/leaveHeaderStyles";
import { leaveService } from "@/features/leave/services/leaveService";
import type { LeaveBalanceDto } from "@/features/leave/types";

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };

function formatUnit(strUnit: string) {
  if (strUnit === "half_day") return "half-days";
  if (strUnit === "hour") return "hours";
  return "days";
}

export default function LeaveBalancePanel() {
  const [lstBalances, setLstBalances] = useState<LeaveBalanceDto[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  useEffect(() => {
    let blnActive = true;
    (async () => {
      setBlnLoading(true);
      try {
        const lstResult = await leaveService.getMyBalances();
        if (blnActive) setLstBalances(lstResult);
      } catch (objError) {
        const objHandled = await createApiRequestError(objError);
        if (blnActive) setObjToast({ blnOpen: true, strMessage: objHandled.message, strSeverity: "error" });
      } finally {
        if (blnActive) setBlnLoading(false);
      }
    })();
    return () => {
      blnActive = false;
    };
  }, []);

  return (
    <Stack spacing={1.5}>
      <Paper
        sx={{
          p: { xs: 1.5, md: 2 },
          borderRadius: "20px",
          background: strEssHeaderGradient,
          color: "white",
          boxShadow: "0 14px 28px rgba(2, 6, 23, 0.18)",
        }}
      >
        <Stack direction="row" spacing={1.2} alignItems="center">
          <Box sx={{ width: 46, height: 46, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.2)", display: "grid", placeItems: "center" }}>
            <BeachAccessRoundedIcon />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1rem" }}>My Leave Balance</Typography>
            <Typography sx={{ fontSize: "0.82rem", color: "rgba(241,245,249,0.92)" }}>
              Available balance is credited minus availed and held (pending) leave.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {blnLoading ? (
        <Box sx={{ display: "grid", placeItems: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : lstBalances.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: "18px", border: "1px solid #e2e8f0", textAlign: "center" }}>
          <Typography sx={{ color: "#475569", fontWeight: 600 }}>
            No leave types are configured yet. Please contact HR.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={1.25}>
          {lstBalances.map((objBalance) => (
            <Grid item xs={12} sm={6} md={4} key={objBalance.intLeaveTypeID}>
              <Paper sx={{ p: 1.5, borderRadius: "18px", border: "1px solid #e2e8f0", boxShadow: "0 10px 20px rgba(15,23,42,0.05)" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                  <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>
                    {objBalance.strTypeName}
                  </Typography>
                  <Chip
                    size="small"
                    label={objBalance.strTypeCode}
                    sx={{ fontWeight: 700, bgcolor: objBalance.blnIsPaid ? "#dcfce7" : "#fee2e2", color: objBalance.blnIsPaid ? "#166534" : "#991b1b" }}
                  />
                </Stack>
                <Typography sx={{ fontSize: "1.8rem", fontWeight: 800, color: "#0e7490", lineHeight: 1.1 }}>
                  {objBalance.decAvailable}
                  <Typography component="span" sx={{ fontSize: "0.8rem", color: "#64748b", ml: 0.5 }}>
                    {formatUnit(objBalance.strUnit)} available
                  </Typography>
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <MetricPill strLabel="Credited" decValue={objBalance.decCredited} strColor="#166534" />
                  <MetricPill strLabel="Availed" decValue={objBalance.decAvailed} strColor="#b45309" />
                  <MetricPill strLabel="Held" decValue={objBalance.decHeld} strColor="#6d28d9" />
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

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

function MetricPill({ strLabel, decValue, strColor }: { strLabel: string; decValue: number; strColor: string }) {
  return (
    <Box sx={{ flex: 1, px: 0.75, py: 0.5, borderRadius: "10px", backgroundColor: "rgba(148,163,184,0.12)", textAlign: "center" }}>
      <Typography sx={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700 }}>{strLabel}</Typography>
      <Typography sx={{ fontSize: "0.95rem", color: strColor, fontWeight: 800 }}>{decValue}</Typography>
    </Box>
  );
}
