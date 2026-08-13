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
import { Fragment, useEffect, useMemo, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { leaveService } from "@/features/leave/services/leaveService";
import type { LeaveLedgerDto } from "@/features/leave/types";

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };
type LeaveTypeGroup = { intLeaveTypeID: number; strLabel: string; lstRows: LeaveLedgerDto[] };

const intCurrentYear = new Date().getFullYear();
const lstYearOptions = Array.from({ length: 6 }, (_, intIndex) => intCurrentYear - intIndex);
// The two header dropdowns share one white-on-gradient look.
const objHeaderSelectSx = {
  minWidth: 160,
  "& .MuiInputBase-root": { backgroundColor: "rgba(255,255,255,0.16)", color: "white", borderRadius: "12px" },
  // Force the selected value text white (the Leave Type value otherwise inherits the theme's dark colour).
  "& .MuiInputBase-input, & .MuiSelect-select": { color: "white" },
  "& .MuiInputLabel-root": { color: "rgba(241,245,249,0.9)" },
  "& .MuiSvgIcon-root": { color: "white" },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.4)" },
} as const;

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

// "Casual Leave (CL)" on one line.
function leaveTypeLabel(objRow: Pick<LeaveLedgerDto, "strLeaveTypeName" | "strLeaveTypeCode" | "intLeaveTypeID">): string {
  const strName = objRow.strLeaveTypeName ?? "";
  const strCode = objRow.strLeaveTypeCode ?? "";
  if (strName && strCode) return `${strName} (${strCode})`;
  return strName || strCode || `#${objRow.intLeaveTypeID}`;
}

const intLedgerColumnCount = 8;

export default function EssLeaveLedgerPanel() {
  const [lstLedger, setLstLedger] = useState<LeaveLedgerDto[]>([]);
  const [intLeaveYear, setIntLeaveYear] = useState<number>(intCurrentYear);
  const [strLeaveTypeFilter, setStrLeaveTypeFilter] = useState<string>("all");
  const [blnLoading, setBlnLoading] = useState(true);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  useEffect(() => {
    let blnActive = true;
    (async () => {
      setBlnLoading(true);
      try {
        const lstResult = await leaveService.getMyLedger(intLeaveYear);
        if (blnActive) {
          setLstLedger(lstResult);
          setStrLeaveTypeFilter("all"); // a new year may not contain the previously selected type
        }
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

  // Distinct leave types present in the ledger, for the filter dropdown (first-seen order).
  const lstLeaveTypeOptions = useMemo(() => {
    const dicSeen = new Map<number, string>();
    for (const objRow of lstLedger) {
      if (!dicSeen.has(objRow.intLeaveTypeID)) dicSeen.set(objRow.intLeaveTypeID, leaveTypeLabel(objRow));
    }
    return Array.from(dicSeen, ([intLeaveTypeID, strLabel]) => ({ intLeaveTypeID, strLabel }));
  }, [lstLedger]);

  // Group every movement under its Leave Type parent (respecting the Leave Type filter).
  const lstGroups = useMemo<LeaveTypeGroup[]>(() => {
    const dicGroups = new Map<number, LeaveTypeGroup>();
    for (const objRow of lstLedger) {
      if (strLeaveTypeFilter !== "all" && String(objRow.intLeaveTypeID) !== strLeaveTypeFilter) continue;
      let objGroup = dicGroups.get(objRow.intLeaveTypeID);
      if (!objGroup) {
        objGroup = { intLeaveTypeID: objRow.intLeaveTypeID, strLabel: leaveTypeLabel(objRow), lstRows: [] };
        dicGroups.set(objRow.intLeaveTypeID, objGroup);
      }
      objGroup.lstRows.push(objRow);
    }
    return Array.from(dicGroups.values());
  }, [lstLedger, strLeaveTypeFilter]);

  const dicTotals = useMemo(() => {
    return lstGroups
      .flatMap((objGroup) => objGroup.lstRows)
      .reduce(
        (dicAcc, objRow) => {
          dicAcc.decCredit += Number(objRow.decCreditDays) || 0;
          dicAcc.decDebit += Number(objRow.decDebitDays) || 0;
          return dicAcc;
        },
        { decCredit: 0, decDebit: 0 },
      );
  }, [lstGroups]);

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
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} sx={{ width: { xs: "100%", sm: "auto" } }}>
            <TextField
              select
              size="small"
              label="Leave Type"
              value={strLeaveTypeFilter}
              onChange={(objEvent) => setStrLeaveTypeFilter(objEvent.target.value)}
              controlId="ess.leave-ledger.type.select"
              sx={objHeaderSelectSx}
            >
              <MenuItem value="all">All Leave Types</MenuItem>
              {lstLeaveTypeOptions.map((objOption) => (
                <MenuItem key={objOption.intLeaveTypeID} value={String(objOption.intLeaveTypeID)}>
                  {objOption.strLabel}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Leave Year"
              value={String(intLeaveYear)}
              onChange={(objEvent) => setIntLeaveYear(Number(objEvent.target.value))}
              controlId="ess.leave-ledger.year.select"
              sx={{ ...objHeaderSelectSx, minWidth: 130 }}
            >
              {lstYearOptions.map((intYear) => (
                <MenuItem key={intYear} value={String(intYear)}>
                  {intYear}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
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
                {lstGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={intLedgerColumnCount} align="center" sx={{ py: 5, color: "text.secondary" }}>
                      No leave ledger movements for {intLeaveYear}.
                    </TableCell>
                  </TableRow>
                ) : (
                  lstGroups.map((objGroup) => (
                    <Fragment key={`group-${objGroup.intLeaveTypeID}`}>
                      <TableRow>
                        <TableCell
                          colSpan={intLedgerColumnCount}
                          sx={{ backgroundColor: "#eef2f7", borderTop: "2px solid #cbd5e1" }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 800, color: "#0f172a" }}>
                            {objGroup.strLabel}
                          </Typography>
                        </TableCell>
                      </TableRow>
                      {objGroup.lstRows.map((objRow) => (
                        <TableRow key={objRow.intID} hover>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>{objRow.dtTransactionDate ?? "-"}</TableCell>
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
                      ))}
                    </Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {!blnLoading && lstGroups.length > 0 ? (
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
