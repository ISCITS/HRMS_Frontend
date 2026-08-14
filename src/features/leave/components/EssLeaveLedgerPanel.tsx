"use client";

import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import {
  Alert,
  Autocomplete,
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
import type { LeaveLedgerDto, LedgerEmployeeDto } from "@/features/leave/types";

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };
type ChipColor = "success" | "error" | "warning" | "info" | "default";
type LedgerActivity = { strLabel: string; strColor: ChipColor; blnHidden: boolean };
type LeaveTypeGroup = { intLeaveTypeID: number; strLabel: string; lstRows: LeaveLedgerDto[] };

const intCurrentYear = new Date().getFullYear();
const lstYearOptions = Array.from({ length: 6 }, (_, intIndex) => intCurrentYear - intIndex);
const intLedgerColumnCount = 7;
// The two header dropdowns share one white-on-gradient look.
const objHeaderSelectSx = {
  minWidth: 160,
  "& .MuiInputBase-root": { backgroundColor: "rgba(255,255,255,0.16)", color: "white", borderRadius: "12px" },
  "& .MuiInputBase-input, & .MuiSelect-select": { color: "white" },
  "& .MuiInputLabel-root": { color: "rgba(241,245,249,0.9)" },
  "& .MuiSvgIcon-root": { color: "white" },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.4)" },
} as const;

function prettify(strValue: string): string {
  return (
    (strValue ?? "")
      .toLowerCase()
      .split("_")
      .filter(Boolean)
      .map((strWord) => strWord.charAt(0).toUpperCase() + strWord.slice(1))
      .join(" ") || "-"
  );
}

// Maps a raw balance movement to a request-centric activity. The mechanical "hold released for approved
// utilization" row is hidden because the paired Utilization row already represents the approval.
function mapLedgerActivity(objRow: LeaveLedgerDto): LedgerActivity {
  const strType = (objRow.strTransactionType ?? "").toUpperCase();
  const strRemarks = (objRow.strTransactionRemarks ?? "").toLowerCase();
  switch (strType) {
    case "HOLD":
      return { strLabel: "Request Pending", strColor: "warning", blnHidden: false };
    case "UTILIZATION":
      return { strLabel: "Request Approved", strColor: "success", blnHidden: false };
    case "RELEASE_HOLD":
      if (strRemarks.includes("approved leave utilization")) return { strLabel: "", strColor: "default", blnHidden: true };
      if (strRemarks.includes("withdraw")) return { strLabel: "Request Withdrawn", strColor: "info", blnHidden: false };
      return { strLabel: "Request Rejected", strColor: "error", blnHidden: false };
    case "ADJUSTMENT_CREDIT":
      if (strRemarks.includes("reversed") || strRemarks.includes("cancelled") || strRemarks.includes("withdraw"))
        return { strLabel: "Request Withdrawn", strColor: "info", blnHidden: false };
      return { strLabel: "Adjustment Credit", strColor: "success", blnHidden: false };
    case "ADJUSTMENT_DEBIT":
      return { strLabel: "Adjustment Debit", strColor: "error", blnHidden: false };
    case "ENTITLEMENT":
      return { strLabel: "Entitlement", strColor: "success", blnHidden: false };
    case "OPENING_BALANCE":
      return { strLabel: "Opening Balance", strColor: "default", blnHidden: false };
    case "COMPOFF_CREDIT":
      return { strLabel: "Comp-Off Credit", strColor: "success", blnHidden: false };
    default:
      return { strLabel: prettify(strType), strColor: "default", blnHidden: false };
  }
}

function formatNumber(intValue: number): string {
  return intValue ? Number(intValue).toString() : "-";
}

// Balance that ignores pending holds: a pending request does not deduct; only an approval (utilization)
// reduces it, and a rejection/withdrawal credits it back. balanceAfter is available; adding holdAfter
// back removes the effect of the still-pending hold.
function displayBalance(objRow: LeaveLedgerDto): number {
  return (Number(objRow.decBalanceAfter) || 0) + (Number(objRow.decHoldAfter) || 0);
}

// "Casual Leave (CL)" on one line.
function leaveTypeLabel(objRow: Pick<LeaveLedgerDto, "strLeaveTypeName" | "strLeaveTypeCode" | "intLeaveTypeID">): string {
  const strName = objRow.strLeaveTypeName ?? "";
  const strCode = objRow.strLeaveTypeCode ?? "";
  if (strName && strCode) return `${strName} (${strCode})`;
  return strName || strCode || `#${objRow.intLeaveTypeID}`;
}

function employeeLabel(objEmployee: LedgerEmployeeDto): string {
  return objEmployee.strEmployeeCode ? `${objEmployee.strFullName} (${objEmployee.strEmployeeCode})` : objEmployee.strFullName;
}

export default function EssLeaveLedgerPanel() {
  const [lstLedger, setLstLedger] = useState<LeaveLedgerDto[]>([]);
  const [intLeaveYear, setIntLeaveYear] = useState<number>(intCurrentYear);
  const [strLeaveTypeFilter, setStrLeaveTypeFilter] = useState<string>("all");
  const [setCollapsed, setSetCollapsed] = useState<Set<number>>(new Set());
  const [lstEmployees, setLstEmployees] = useState<LedgerEmployeeDto[]>([]);
  const [objSelectedEmployee, setObjSelectedEmployee] = useState<LedgerEmployeeDto | null>(null);
  const [blnEmployeesResolved, setBlnEmployeesResolved] = useState(false);
  const [blnLoading, setBlnLoading] = useState(true);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  // Load the viewable employees once (self + direct reports) and default the selection to the self entry.
  useEffect(() => {
    let blnActive = true;
    leaveService
      .getLedgerEmployees()
      .then((lstResult) => {
        if (!blnActive) return;
        setLstEmployees(lstResult);
        setObjSelectedEmployee(lstResult.find((objEmployee) => objEmployee.blnIsSelf) ?? lstResult[0] ?? null);
      })
      .catch(() => {
        /* fall back to self-only: leave selection null; the ledger endpoint defaults to the caller. */
      })
      .finally(() => {
        if (blnActive) setBlnEmployeesResolved(true);
      });
    return () => {
      blnActive = false;
    };
  }, []);

  const intSelectedEmployeeID = objSelectedEmployee?.intEmployeeID ?? null;

  useEffect(() => {
    if (!blnEmployeesResolved) return; // wait until the default (self) selection is known
    let blnActive = true;
    (async () => {
      setBlnLoading(true);
      try {
        const lstResult = await leaveService.getMyLedger(intLeaveYear, intSelectedEmployeeID);
        if (blnActive) {
          setLstLedger(lstResult);
          setStrLeaveTypeFilter("all"); // a new employee/year may not contain the previously selected type
          setSetCollapsed(new Set()); // groups start expanded
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
  }, [intLeaveYear, intSelectedEmployeeID, blnEmployeesResolved]);

  function toggleCollapse(intLeaveTypeID: number) {
    setSetCollapsed((setPrev) => {
      const setNext = new Set(setPrev);
      if (setNext.has(intLeaveTypeID)) setNext.delete(intLeaveTypeID);
      else setNext.add(intLeaveTypeID);
      return setNext;
    });
  }

  // Distinct leave types present in the ledger, for the filter dropdown (first-seen order).
  const lstLeaveTypeOptions = useMemo(() => {
    const dicSeen = new Map<number, string>();
    for (const objRow of lstLedger) {
      if (!dicSeen.has(objRow.intLeaveTypeID)) dicSeen.set(objRow.intLeaveTypeID, leaveTypeLabel(objRow));
    }
    return Array.from(dicSeen, ([intLeaveTypeID, strLabel]) => ({ intLeaveTypeID, strLabel }));
  }, [lstLedger]);

  // Group visible movements under their Leave Type parent (respecting the Leave Type filter, hiding
  // the redundant approval-release rows).
  const lstGroups = useMemo<LeaveTypeGroup[]>(() => {
    const dicGroups = new Map<number, LeaveTypeGroup>();
    for (const objRow of lstLedger) {
      if (strLeaveTypeFilter !== "all" && String(objRow.intLeaveTypeID) !== strLeaveTypeFilter) continue;
      if (mapLedgerActivity(objRow).blnHidden) continue;
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
            </Box>
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} sx={{ width: { xs: "100%", sm: "auto" } }}>
            <Autocomplete
              size="small"
              options={lstEmployees}
              value={objSelectedEmployee}
              getOptionLabel={(objOption) => employeeLabel(objOption)}
              isOptionEqualToValue={(objA, objB) => objA.intEmployeeID === objB.intEmployeeID}
              onChange={(_objEvent, objNext) => {
                if (objNext) setObjSelectedEmployee(objNext);
              }}
              sx={{
                ...objHeaderSelectSx,
                minWidth: { xs: "100%", sm: 250 },
                // Match the plain selects: single dropdown arrow (no clear button), white popup icon.
                "& .MuiAutocomplete-clearIndicator": { display: "none" },
                "& .MuiAutocomplete-popupIndicator": { color: "white" },
              }}
              renderInput={(objParams) => (
                <TextField
                  {...objParams}
                  label="Employee"
                  placeholder="Search employee..."
                  controlId="ess.leave-ledger.employee.select"
                  InputLabelProps={{ ...objParams.InputLabelProps, shrink: true }}
                />
              )}
            />
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

      {objSelectedEmployee && !objSelectedEmployee.blnIsSelf ? (
        <Alert severity="info" variant="outlined" sx={{ borderRadius: "12px", py: 0.25 }}>
          Viewing leave ledger for <strong>{objSelectedEmployee.strFullName}</strong>
          {objSelectedEmployee.strEmployeeCode ? ` (${objSelectedEmployee.strEmployeeCode})` : ""}
        </Alert>
      ) : null}

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
                  lstGroups.map((objGroup) => {
                    const blnCollapsed = setCollapsed.has(objGroup.intLeaveTypeID);
                    return (
                      <Fragment key={`group-${objGroup.intLeaveTypeID}`}>
                        <TableRow hover sx={{ cursor: "pointer" }} onClick={() => toggleCollapse(objGroup.intLeaveTypeID)}>
                          <TableCell
                            colSpan={intLedgerColumnCount}
                            sx={{ backgroundColor: "#eef2f7", borderTop: "2px solid #cbd5e1" }}
                          >
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              {blnCollapsed ? <ExpandMoreRoundedIcon fontSize="small" /> : <ExpandLessRoundedIcon fontSize="small" />}
                              <Typography variant="body2" sx={{ fontWeight: 800, color: "#0f172a" }}>
                                {objGroup.strLabel}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "#64748b", ml: 0.5 }}>
                                ({objGroup.lstRows.length})
                              </Typography>
                            </Stack>
                          </TableCell>
                        </TableRow>
                        {!blnCollapsed
                          ? objGroup.lstRows.map((objRow) => {
                              const objActivity = mapLedgerActivity(objRow);
                              return (
                                <TableRow key={objRow.intID} hover>
                                  <TableCell sx={{ whiteSpace: "nowrap" }}>{objRow.dtTransactionDate ?? "-"}</TableCell>
                                  <TableCell>
                                    <Chip size="small" label={objActivity.strLabel} color={objActivity.strColor} variant="outlined" />
                                  </TableCell>
                                  <TableCell align="right" sx={{ color: objRow.decCreditDays ? "success.main" : "text.disabled" }}>
                                    {formatNumber(objRow.decCreditDays)}
                                  </TableCell>
                                  <TableCell align="right" sx={{ color: objRow.decDebitDays ? "error.main" : "text.disabled" }}>
                                    {formatNumber(objRow.decDebitDays)}
                                  </TableCell>
                                  <TableCell align="right">{formatNumber(objRow.decHoldDays)}</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                                    {displayBalance(objRow)}
                                  </TableCell>
                                  <TableCell sx={{ maxWidth: 260, whiteSpace: "normal", wordBreak: "break-word", color: "text.secondary" }}>
                                    {objRow.strTransactionRemarks ?? "-"}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          : null}
                      </Fragment>
                    );
                  })
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
