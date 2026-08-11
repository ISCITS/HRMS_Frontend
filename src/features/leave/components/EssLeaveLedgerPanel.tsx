"use client";

import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { leaveService } from "@/features/leave/services/leaveService";
import type { LeaveLedgerDto } from "@/features/leave/types";

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };

const intCurrentYear = new Date().getFullYear();
const lstYearOptions = Array.from({ length: 6 }, (_, intIndex) => intCurrentYear - intIndex);

function prettifyTransactionType(strType: string): string {
  return (
    (strType ?? "")
      .toLowerCase()
      .split("_")
      .filter(Boolean)
      .map((strWord) => strWord.charAt(0).toUpperCase() + strWord.slice(1))
      .join(" ") || "-"
  );
}

function transactionColor(strType: string): "success" | "error" | "warning" | "info" | "default" {
  const strUpper = (strType ?? "").toUpperCase();
  if (strUpper.includes("CREDIT")) return "success";
  if (strUpper.includes("DEBIT")) return "error";
  if (strUpper.includes("RELEASE")) return "info";
  if (strUpper.includes("HOLD")) return "warning";
  return "default";
}

function formatNumber(intValue: number): string {
  return intValue ? Number(intValue).toString() : "-";
}

export default function EssLeaveLedgerPanel() {
  const [lstLedger, setLstLedger] = useState<LeaveLedgerDto[]>([]);
  const [intLeaveYear, setIntLeaveYear] = useState<number>(intCurrentYear);
  const [blnLoading, setBlnLoading] = useState(true);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  useEffect(() => {
    let blnActive = true;
    (async () => {
      setBlnLoading(true);
      try {
        const lstResult = await leaveService.getMyLedger(intLeaveYear);
        if (blnActive) setLstLedger(lstResult);
      } catch (objError) {
        const objHandled = await createApiRequestError(objError);
        if (blnActive) {
          setLstLedger([]);
          setObjToast({ blnOpen: true, strMessage: objHandled.message, strSeverity: "error" });
        }
      } finally {
        if (blnActive) setBlnLoading(false);
      }
    })();
    return () => {
      blnActive = false;
    };
  }, [intLeaveYear]);

  const dicTotals = useMemo(() => {
    return lstLedger.reduce(
      (dicAcc, objRow) => {
        dicAcc.decCredit += Number(objRow.decCreditDays) || 0;
        dicAcc.decDebit += Number(objRow.decDebitDays) || 0;
        return dicAcc;
      },
      { decCredit: 0, decDebit: 0 },
    );
  }, [lstLedger]);

  return (
    <Stack spacing={1.5}>
      <Paper
        sx={{
          p: { xs: 1.5, md: 2 },
          borderRadius: "20px",
          background: "linear-gradient(135deg, #0b3f70 0%, #0a66a3 52%, #0e7490 100%)",
          color: "white",
          boxShadow: "0 14px 28px rgba(2, 6, 23, 0.18)",
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between">
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Box sx={{ width: 46, height: 46, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.2)", display: "grid", placeItems: "center" }}>
              <ReceiptLongRoundedIcon />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: "1rem" }}>My Leave Ledger</Typography>
              <Typography sx={{ fontSize: "0.82rem", color: "rgba(241,245,249,0.92)" }}>
                Every credit, debit, hold and release on your leave balances.
              </Typography>
            </Box>
          </Stack>
          <TextField
            select
            size="small"
            label="Leave Year"
            value={String(intLeaveYear)}
            onChange={(objEvent) => setIntLeaveYear(Number(objEvent.target.value))}
            controlId="ess.leave-ledger.year.select"
            sx={{
              minWidth: 130,
              "& .MuiInputBase-root": { backgroundColor: "rgba(255,255,255,0.16)", color: "white", borderRadius: "12px" },
              "& .MuiInputLabel-root": { color: "rgba(241,245,249,0.9)" },
              "& .MuiSvgIcon-root": { color: "white" },
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.4)" },
            }}
          >
            {lstYearOptions.map((intYear) => (
              <MenuItem key={intYear} value={String(intYear)}>
                {intYear}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: "16px", overflow: "hidden" }}>
        {blnLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Leave Type</TableCell>
                  <TableCell>Transaction</TableCell>
                  <TableCell align="right">Credit</TableCell>
                  <TableCell align="right">Debit</TableCell>
                  <TableCell align="right">Hold</TableCell>
                  <TableCell align="right">Released</TableCell>
                  <TableCell align="right">Balance</TableCell>
                  <TableCell>Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lstLedger.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 5, color: "text.secondary" }}>
                      No leave ledger movements for {intLeaveYear}.
                    </TableCell>
                  </TableRow>
                ) : (
                  lstLedger.map((objRow) => (
                    <TableRow key={objRow.intID} hover>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{objRow.dtTransactionDate ?? "-"}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {objRow.strLeaveTypeName ?? objRow.strLeaveTypeCode ?? `#${objRow.intLeaveTypeID}`}
                        </Typography>
                        {objRow.strLeaveTypeCode ? (
                          <Typography variant="caption" color="text.secondary">
                            {objRow.strLeaveTypeCode}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={prettifyTransactionType(objRow.strTransactionType)}
                          color={transactionColor(objRow.strTransactionType)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ color: objRow.decCreditDays ? "success.main" : "text.disabled" }}>
                        {formatNumber(objRow.decCreditDays)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: objRow.decDebitDays ? "error.main" : "text.disabled" }}>
                        {formatNumber(objRow.decDebitDays)}
                      </TableCell>
                      <TableCell align="right">{formatNumber(objRow.decHoldDays)}</TableCell>
                      <TableCell align="right">{formatNumber(objRow.decReleaseHoldDays)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {Number(objRow.decBalanceAfter)}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 260, whiteSpace: "normal", wordBreak: "break-word", color: "text.secondary" }}>
                        {objRow.strTransactionRemarks ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {!blnLoading && lstLedger.length > 0 ? (
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Chip color="success" variant="outlined" label={`Total Credited: ${dicTotals.decCredit}`} />
          <Chip color="error" variant="outlined" label={`Total Availed: ${dicTotals.decDebit}`} />
        </Stack>
      ) : null}

      <Snackbar
        open={objToast.blnOpen}
        autoHideDuration={4000}
        onClose={() => setObjToast((dicPrev) => ({ ...dicPrev, blnOpen: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={objToast.strSeverity} variant="filled" onClose={() => setObjToast((dicPrev) => ({ ...dicPrev, blnOpen: false }))}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
