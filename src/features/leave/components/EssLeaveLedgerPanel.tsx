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
import styles from "@/components/master/MasterScreen.module.css";
import { employeeService } from "@/features/employee/services/employeeService";
import { leaveService } from "@/features/leave/services/leaveService";
import type { LeaveLedgerDto, LedgerEmployeeDto } from "@/features/leave/types";

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };
type ChipColor = "success" | "error" | "warning" | "info" | "default";
type LedgerActivity = { strLabel: string; strColor: ChipColor; blnHidden: boolean };
type LeaveTypeGroup = { intLeaveTypeID: number; strLabel: string; lstRows: LeaveLedgerDto[] };

const intCurrentYear = new Date().getFullYear();
const lstYearOptions = Array.from({ length: 6 }, (_, intIndex) => intCurrentYear - intIndex);
const intLedgerColumnCount = 7;
// The header dropdowns share one white-on-gradient look.
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
const lstMonthAbbr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-08-21" -> "21-Aug-2026" (falls back to the raw string when it is not an ISO date).
function formatLedgerDate(strIso: string | null): string {
  if (!strIso) return "-";
  const arrParts = strIso.slice(0, 10).split("-");
  if (arrParts.length !== 3) return strIso;
  const [strYear, strMonth, strDay] = arrParts;
  const intMonth = Number(strMonth);
  if (!intMonth || intMonth < 1 || intMonth > 12) return strIso;
  return `${strDay}-${lstMonthAbbr[intMonth - 1]}-${strYear}`;
}

// The applied leave date (or range) shown after the transaction label.
function formatLeaveRange(strFrom: string | null, strTo: string | null): string | null {
  if (!strFrom) return null;
  if (!strTo || strTo === strFrom) return formatLedgerDate(strFrom);
  return `${formatLedgerDate(strFrom)} to ${formatLedgerDate(strTo)}`;
}

function mapLedgerActivity(objRow: LeaveLedgerDto): LedgerActivity {
  const strType = (objRow.strTransactionType ?? "").toUpperCase();
  const strRemarks = (objRow.strTransactionRemarks ?? "").toLowerCase();
  switch (strType) {
    case "HOLD":
      return { strLabel: "Leave Applied", strColor: "default", blnHidden: false };
    case "UTILIZATION":
      return { strLabel: "Leave Approved", strColor: "default", blnHidden: false };
    case "RELEASE_HOLD":
      if (strRemarks.includes("approved leave utilization")) return { strLabel: "", strColor: "default", blnHidden: true };
      if (strRemarks.includes("withdraw")) return { strLabel: "Leave Withdraw", strColor: "default", blnHidden: false };
      if (strRemarks.includes("cancel")) return { strLabel: "Leave Canceled After Approval", strColor: "default", blnHidden: false };
      return { strLabel: "Leave Rejected", strColor: "default", blnHidden: false };
    case "ADJUSTMENT_CREDIT":
      if (strRemarks.includes("cancel")) return { strLabel: "Leave Canceled After Approval", strColor: "default", blnHidden: false };
      if (strRemarks.includes("reversed") || strRemarks.includes("withdraw"))
        return { strLabel: "Leave Withdraw", strColor: "default", blnHidden: false };
      return { strLabel: "Adjustment Credit", strColor: "default", blnHidden: false };
    case "ADJUSTMENT_DEBIT":
      return { strLabel: "Adjustment Debit", strColor: "default", blnHidden: false };
    case "ENTITLEMENT":
      return { strLabel: "Entitlement", strColor: "default", blnHidden: false };
    case "OPENING_BALANCE":
      return { strLabel: "Opening Balance", strColor: "default", blnHidden: false };
    case "COMPOFF_CREDIT":
      return { strLabel: "Comp-Off Credit", strColor: "default", blnHidden: false };
    default:
      return { strLabel: prettify(strType), strColor: "default", blnHidden: false };
  }
}

// Full transaction text: "Leave Applied : 21-Aug-2026" (range appended for leave movements).
function buildTransactionText(objRow: LeaveLedgerDto): string {
  const strLabel = mapLedgerActivity(objRow).strLabel;
  const strRange = formatLeaveRange(objRow.dtLeaveFromDate, objRow.dtLeaveToDate);
  return strRange ? `${strLabel} : ${strRange}` : strLabel;
}

// The date the movement actually happened. The stored transaction_date is a business date that can be
// backdated (a leave's start date, or a plan's effective date for opening balance / entitlement rows),
// so every row shows the real action timestamp (transaction_on) and falls back only if it is missing.
function ledgerDisplayDate(objRow: LeaveLedgerDto): string {
  return formatLedgerDate(objRow.dtTransactionOn ?? objRow.dtTransactionDate);
}

// Remarks cell: the movement's own remark with the request's backup resource appended when one was
// assigned, e.g. "Approved by anil · Backup Resource : Ms Priya Nair".
function ledgerRemarks(objRow: LeaveLedgerDto): string {
  const strRemark = objRow.strUserRemarks ?? objRow.strTransactionRemarks ?? "";
  const strBackup = (objRow.strBackupResourceName ?? "").trim();
  if (!strBackup) return strRemark || "-";
  const strBackupLabel = `Backup Resource : ${strBackup}`;
  return strRemark ? `${strRemark} · ${strBackupLabel}` : strBackupLabel;
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

// Shared Leave Ledger panel. ESS mode (default): the caller sees their own ledger + direct reports.
// HR mode: all employees are selectable and the table stays empty until one is chosen.
export default function EssLeaveLedgerPanel({ blnHrMode = false }: { blnHrMode?: boolean } = {}) {
  const [lstLedger, setLstLedger] = useState<LeaveLedgerDto[]>([]);
  const [intLeaveYear, setIntLeaveYear] = useState<number>(intCurrentYear);
  const [strLeaveTypeFilter, setStrLeaveTypeFilter] = useState<string>("all");
  const [setCollapsed, setSetCollapsed] = useState<Set<number>>(new Set());
  const [lstEmployees, setLstEmployees] = useState<LedgerEmployeeDto[]>([]);
  const [objSelectedEmployee, setObjSelectedEmployee] = useState<LedgerEmployeeDto | null>(null);
  const [blnEmployeesResolved, setBlnEmployeesResolved] = useState(false);
  const [blnLoading, setBlnLoading] = useState(true);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  // Load the selectable employees once. ESS: self + direct reports, defaulting to self. HR: every
  // employee, with no default selection (the table stays empty until one is picked).
  useEffect(() => {
    let blnActive = true;
    const objPromise: Promise<LedgerEmployeeDto[]> = blnHrMode
      ? employeeService.getEmployees().then((lstResult) =>
          lstResult
            .filter((objEmployee) => !objEmployee.blnIsPartialSave)
            .map((objEmployee) => ({
              intEmployeeID: objEmployee.intID,
              strFullName: objEmployee.strFullName,
              strEmployeeCode: objEmployee.strEmployeeCode,
              blnIsSelf: false,
            })),
        )
      : leaveService.getLedgerEmployees();
    objPromise
      .then((lstResult) => {
        if (!blnActive) return;
        setLstEmployees(lstResult);
        if (!blnHrMode) {
          setObjSelectedEmployee(lstResult.find((objEmployee) => objEmployee.blnIsSelf) ?? lstResult[0] ?? null);
        }
      })
      .catch(() => {
        /* ESS: fall back to self-only (endpoint defaults to caller). HR: leave the list empty. */
      })
      .finally(() => {
        if (blnActive) setBlnEmployeesResolved(true);
      });
    return () => {
      blnActive = false;
    };
  }, [blnHrMode]);

  const intSelectedEmployeeID = objSelectedEmployee?.intEmployeeID ?? null;

  useEffect(() => {
    if (!blnEmployeesResolved) return; // wait until the initial selection is known
    // HR mode shows nothing until an employee is chosen.
    if (blnHrMode && !intSelectedEmployeeID) {
      setLstLedger([]);
      setBlnLoading(false);
      return;
    }
    let blnActive = true;
    (async () => {
      setBlnLoading(true);
      try {
        const lstResult = blnHrMode
          ? await leaveService.getHrLedger(intLeaveYear, intSelectedEmployeeID as number)
          : await leaveService.getMyLedger(intLeaveYear, intSelectedEmployeeID);
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
  }, [intLeaveYear, intSelectedEmployeeID, blnEmployeesResolved, blnHrMode]);

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

  // The filter row is identical in both modes; only the surrounding header differs (ESS uses the
  // common page banner, HR keeps the standard white filter card used by the other HR list screens).
  // ESS paints the fields white-on-gradient; HR leaves them with the default outlined look.
  const objFilterSx = blnHrMode ? {} : objHeaderSelectSx;
  const objHeaderFilters = (
    <>
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
          ...objFilterSx,
          minWidth: { xs: "100%", sm: 360 },
          "& .MuiAutocomplete-clearIndicator": { display: "none" },
          ...(blnHrMode ? {} : { "& .MuiAutocomplete-popupIndicator": { color: "white" } }),
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
        sx={{ ...objFilterSx, minWidth: 160 }}
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
        sx={{ ...objFilterSx, minWidth: 130 }}
      >
        {lstYearOptions.map((intYear) => (
          <MenuItem key={intYear} value={String(intYear)}>
            {intYear}
          </MenuItem>
        ))}
      </TextField>
    </>
  );

  return (
    <Stack spacing={1.5}>
      {blnHrMode ? (
        <Box className={styles.controlsCard} data-control-id="leave-ledger.filters.card">
          <Box
            sx={{
              display: "grid",
              gap: 1.25,
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "minmax(260px, 1.4fr) minmax(160px, 0.8fr) minmax(130px, 0.6fr)" },
              alignItems: "center",
              mt: 1,
            }}
          >
            {objHeaderFilters}
          </Box>
        </Box>
      ) : (
        <Box className="pageBanner" data-control-id="ess.leave-ledger.header.banner" sx={{ flexWrap: { xs: "wrap", md: "nowrap" } }}>
          <Box className="bannerDots" />
          <Box className="bannerIcon"><ReceiptLongRoundedIcon sx={{ fontSize: 30 }} /></Box>
          <Box className="bannerDivider" />
          <Box sx={{ position: "relative", zIndex: 1, flex: 1, minWidth: 0 }}>
            <Typography component="h1" className="bannerTitle">My Leave Ledger</Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} sx={{ width: { xs: "100%", sm: "auto" }, position: "relative", zIndex: 1 }}>
            {objHeaderFilters}
          </Stack>
        </Box>
      )}

      {objSelectedEmployee && !objSelectedEmployee.blnIsSelf ? (
        <Alert severity="info" variant="outlined" sx={{ borderRadius: "12px", py: 0.25 }}>
          Viewing leave ledger for <strong>{objSelectedEmployee.strFullName}</strong>
          {objSelectedEmployee.strEmployeeCode ? ` (${objSelectedEmployee.strEmployeeCode})` : ""}
        </Alert>
      ) : null}

      {blnHrMode && !objSelectedEmployee ? (
        <Paper variant="outlined" sx={{ borderRadius: "16px", p: 6, textAlign: "center" }}>
          <ReceiptLongRoundedIcon sx={{ fontSize: 40, color: "#94a3b8", mb: 1 }} />
          <Typography sx={{ color: "text.secondary", fontWeight: 600 }}>
            Select an employee to view their leave ledger.
          </Typography>
        </Paper>
      ) : (
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
                    <TableCell>Transaction Date</TableCell>
                    <TableCell>Description</TableCell>
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
                              </Stack>
                            </TableCell>
                          </TableRow>
                          {!blnCollapsed
                            ? objGroup.lstRows.map((objRow) => {
                                return (
                                  <TableRow key={objRow.intID} hover>
                                    <TableCell sx={{ whiteSpace: "nowrap" }}>{ledgerDisplayDate(objRow)}</TableCell>
                                    <TableCell sx={{ whiteSpace: "normal", wordBreak: "break-word", color: "text.secondary" }}>
                                      {buildTransactionText(objRow)}
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
                                      {ledgerRemarks(objRow)}
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
      )}

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
