"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DoNotDisturbOnRoundedIcon from "@mui/icons-material/DoNotDisturbOnRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import styles from "@/components/master/MasterScreen.module.css";
import {
  flexiPayDeclarationService,
  type FlexiDeclarationContextRecord,
  type FlexiDeclarationLineRecord,
} from "@/features/flexi-pay-declaration/services/flexiPayDeclarationService";

type DraftInputMap = Record<number, string>;

function getCurrentFinancialYearCode() {
  const objNow = new Date();
  const intYear = objNow.getFullYear();
  const intMonth = objNow.getMonth();
  const intFyStartYear = intMonth >= 3 ? intYear : intYear - 1;
  return `${intFyStartYear}-${String(intFyStartYear + 1).slice(-2)}`;
}

function formatCurrency(decValue: number | null | undefined, strCurrencyCode = "INR") {
  if (decValue == null) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: strCurrencyCode,
    maximumFractionDigits: 0,
  }).format(decValue);
}

function formatDate(strDate?: string | null) {
  if (!strDate) return "-";
  const objDate = new Date(strDate);
  if (Number.isNaN(objDate.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(objDate);
}

function normalizeAmount(strValue: string) {
  const decValue = Number(strValue);
  if (!Number.isFinite(decValue) || decValue < 0) return 0;
  return decValue;
}

function getStatusTone(strStatus?: string | null): "default" | "success" | "warning" | "error" {
  const strValue = String(strStatus || "").trim().toLowerCase();
  if (["approved", "locked"].includes(strValue)) return "success";
  if (["submitted"].includes(strValue)) return "warning";
  if (["rejected", "returned", "cancelled"].includes(strValue)) return "error";
  return "default";
}

function formatStatus(strStatus?: string | null) {
  return String(strStatus || "draft")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (strChar) => strChar.toUpperCase());
}

function buildInitialDraftInputs(objContext: FlexiDeclarationContextRecord) {
  return (objContext.lstDeclarationLines || []).reduce<DraftInputMap>((dicAcc, objLine) => {
    dicAcc[objLine.intSalaryComponentID] = String(objLine.decDraftDeclaredAnnual ?? objLine.decAllocationAnnual ?? 0);
    return dicAcc;
  }, {});
}

function getLineDeclaredAmount(objLine: FlexiDeclarationLineRecord, dicDraftInputs: DraftInputMap) {
  return normalizeAmount(dicDraftInputs[objLine.intSalaryComponentID] ?? String(objLine.decDraftDeclaredAnnual ?? objLine.decAllocationAnnual ?? 0));
}

export default function FlexiPayDeclarationPage() {
  const objRouter = useRouter();
  const strFinancialYearCode = getCurrentFinancialYearCode();
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strToast, setStrToast] = useState("");
  const [strRemarks, setStrRemarks] = useState("");
  const [objContext, setObjContext] = useState<FlexiDeclarationContextRecord | null>(null);
  const [dicDraftInputs, setDicDraftInputs] = useState<DraftInputMap>({});
  const [dicEligibilityAnswers, setDicEligibilityAnswers] = useState<Record<string, string | number | boolean | null>>({});

  const loadContext = useCallback(async function loadContext() {
    setBlnLoading(true);
    setStrError("");
    try {
      const objData = await flexiPayDeclarationService.getCurrentDeclaration(strFinancialYearCode);
      setObjContext(objData);
      setDicDraftInputs(buildInitialDraftInputs(objData));
      setStrRemarks(objData.objDeclaration?.strRemarks || "");
      setDicEligibilityAnswers(objData.objEligibilityAnswers || {});
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load flexi declaration.");
    } finally {
      setBlnLoading(false);
    }
  }, [strFinancialYearCode]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const strCurrencyCode = objContext?.objAssignedStructure?.strCurrencyCode || "INR";
  const decBasketAnnual = Number(objContext?.objFlexiAllocation?.decFlexiBasketAvailableAnnual || 0);
  const strWorkflowStatus = objContext?.objDeclaration?.strWorkflowStatus || "draft";
  const blnEditable = Boolean(objContext?.blnCanDeclare && ["draft", "returned", "rejected"].includes(strWorkflowStatus));
  const blnCanWithdraw = strWorkflowStatus === "submitted";
  const blnCanCancel = ["draft", "returned", "rejected"].includes(strWorkflowStatus);

  const lstRows = useMemo(
    () =>
      (objContext?.lstDeclarationLines || []).map((objLine) => {
        const decDeclaredAnnual = getLineDeclaredAmount(objLine, dicDraftInputs);
        const decAnnualLimit = objLine.decAnnualLimit ?? Number.POSITIVE_INFINITY;
        const decSanitizedAnnual = objLine.blnEligible === false ? 0 : Math.min(decDeclaredAnnual, decAnnualLimit);
        return {
          ...objLine,
          decDeclaredAnnual: decSanitizedAnnual,
          decDeclaredMonthly: decSanitizedAnnual / 12,
        };
      }),
    [dicDraftInputs, objContext?.lstDeclarationLines],
  );

  const decDeclaredAnnual = useMemo(
    () => lstRows.reduce((decTotal, objRow) => decTotal + objRow.decDeclaredAnnual, 0),
    [lstRows],
  );
  const decResidualAnnual = Math.max(decBasketAnnual - decDeclaredAnnual, 0);
  const blnAllocationExceeded = decDeclaredAnnual > decBasketAnnual;

  function buildPayloadRows() {
    return lstRows
      .filter((objRow) => objRow.decDeclaredAnnual > 0)
      .map((objRow) => ({
        intSalaryComponentID: objRow.intSalaryComponentID,
        decDeclaredAmountAnnual: objRow.decDeclaredAnnual,
        strRemarks: objRow.strDeclarationItemRemarks || null,
      }));
  }

  async function refreshFromContext(objData: FlexiDeclarationContextRecord, strMessage: string) {
    setObjContext(objData);
    setDicDraftInputs(buildInitialDraftInputs(objData));
    setDicEligibilityAnswers(objData.objEligibilityAnswers || {});
    setStrRemarks(objData.objDeclaration?.strRemarks || "");
    setStrToast(strMessage);
  }

  async function handleSaveDraft() {
    setBlnSaving(true);
    setStrError("");
    try {
      const objData = await flexiPayDeclarationService.saveDraft(strFinancialYearCode, buildPayloadRows(), strRemarks, dicEligibilityAnswers);
      await refreshFromContext(objData, "Draft saved successfully.");
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to save draft.");
    } finally {
      setBlnSaving(false);
    }
  }

  async function handleSubmit() {
    setBlnSaving(true);
    setStrError("");
    try {
      const objData = await flexiPayDeclarationService.submit(strFinancialYearCode, buildPayloadRows(), strRemarks, dicEligibilityAnswers);
      await refreshFromContext(objData, "Declaration submitted successfully.");
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to submit declaration.");
    } finally {
      setBlnSaving(false);
    }
  }

  async function handleCopyPreviousYear() {
    setBlnSaving(true);
    setStrError("");
    try {
      const objData = await flexiPayDeclarationService.copyPreviousYear(strFinancialYearCode);
      await refreshFromContext(objData, "Previous year declaration copied into draft.");
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to copy previous year declaration.");
    } finally {
      setBlnSaving(false);
    }
  }

  async function handleWithdraw() {
    setBlnSaving(true);
    setStrError("");
    try {
      const objData = await flexiPayDeclarationService.withdraw(strFinancialYearCode, strRemarks);
      await refreshFromContext(objData, "Submitted declaration moved back to draft.");
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to withdraw declaration.");
    } finally {
      setBlnSaving(false);
    }
  }

  async function handleCancel() {
    setBlnSaving(true);
    setStrError("");
    try {
      const objData = await flexiPayDeclarationService.cancel(strFinancialYearCode, strRemarks);
      await refreshFromContext(objData, "Declaration cancelled successfully.");
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to cancel declaration.");
    } finally {
      setBlnSaving(false);
    }
  }

  if (blnLoading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "48vh" }}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  return (
    <Box className={styles.page} sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {!objContext?.blnCanDeclare ? (
        <Alert severity="info">{objContext?.strIneligibilityReason || "Flexi declaration is not available for this employee."}</Alert>
      ) : null}
      {blnAllocationExceeded ? <Alert severity="error">Declared flexi amount exceeds the available basket.</Alert> : null}

      <Paper sx={{ p: 1.35, borderRadius: "12px", border: "1px solid #bfdbfe" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography sx={{ fontWeight: 900, color: "#0f172a", fontSize: "1.05rem" }}>
              {objContext?.objEmployeeSummary?.strEmployeeName || "Employee"}
              {objContext?.objEmployeeSummary?.strEmployeeCode ? ` (${objContext.objEmployeeSummary.strEmployeeCode})` : ""}
            </Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
              FY {strFinancialYearCode} | Submitted {formatDate(objContext?.objDeclaration?.dtSubmittedOn)}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip label={formatStatus(strWorkflowStatus)} color={getStatusTone(strWorkflowStatus)} />
            <Button size="small" variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/salary/flexi-pay-declarations")}>
              Back
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ display: "grid", gap: 1.2, gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" } }}>
        <Paper variant="outlined" sx={{ p: 1.2, borderRadius: "12px" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>Flexi Basket</Typography>
          <Typography sx={{ fontWeight: 800 }}>{formatCurrency(decBasketAnnual, strCurrencyCode)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.2, borderRadius: "12px" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>Declared Total</Typography>
          <Typography sx={{ fontWeight: 800 }}>{formatCurrency(decDeclaredAnnual, strCurrencyCode)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.2, borderRadius: "12px" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>Residual Balance</Typography>
          <Typography sx={{ fontWeight: 800 }}>{formatCurrency(decResidualAnnual, strCurrencyCode)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.2, borderRadius: "12px" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>Structure</Typography>
          <Typography sx={{ fontWeight: 800 }}>{objContext?.objAssignedStructure?.strSalaryStructureName || "-"}</Typography>
        </Paper>
      </Box>

      <Paper sx={{ borderRadius: "12px", overflow: "hidden" }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Component</TableCell>
                <TableCell align="right">Annual Cap</TableCell>
                <TableCell align="right">Declared Annual</TableCell>
                <TableCell align="right">Monthly</TableCell>
                <TableCell>Proof</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lstRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 2, textAlign: "center", color: "#64748b" }}>
                    No flexi components are available.
                  </TableCell>
                </TableRow>
              ) : (
                lstRows.map((objRow) => (
                  <TableRow key={objRow.intSalaryComponentID}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.84rem" }}>{objRow.strComponentName || objRow.strComponentCode || "Component"}</Typography>
                      {objRow.strEligibilityReason ? <Typography sx={{ color: "#64748b", fontSize: "0.72rem" }}>{objRow.strEligibilityReason}</Typography> : null}
                    </TableCell>
                    <TableCell align="right">{formatCurrency(objRow.decAnnualLimit, strCurrencyCode)}</TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={dicDraftInputs[objRow.intSalaryComponentID] ?? ""}
                        disabled={!blnEditable || objRow.blnEligible === false || blnSaving}
                        onChange={(e) =>
                          setDicDraftInputs((dicPrev) => ({
                            ...dicPrev,
                            [objRow.intSalaryComponentID]: e.target.value,
                          }))
                        }
                        inputProps={{ min: 0, max: objRow.decAnnualLimit ?? undefined }}
                        sx={{ width: 140 }}
                      />
                    </TableCell>
                    <TableCell align="right">{formatCurrency(objRow.decDeclaredMonthly, strCurrencyCode)}</TableCell>
                    <TableCell>{objRow.blnProofRequired ? "Required" : "Not Required"}</TableCell>
                    <TableCell>
                      <Chip size="small" label={objRow.strDeclarationItemStatus || (objRow.blnEligible === false ? "Not Eligible" : "Draft")} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 1.2, borderRadius: "12px" }}>
        <Stack spacing={1}>
          <Typography sx={{ fontWeight: 800 }}>Remarks</Typography>
          <TextField multiline minRows={3} value={strRemarks} onChange={(e) => setStrRemarks(e.target.value)} disabled={(!blnEditable && !blnCanWithdraw && !blnCanCancel) || blnSaving} />
          <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
            <Button variant="outlined" startIcon={<ContentCopyRoundedIcon />} disabled={!blnEditable || blnSaving} onClick={() => void handleCopyPreviousYear()}>
              Copy Previous Year
            </Button>
            {blnCanWithdraw ? (
              <Button variant="outlined" startIcon={<UndoRoundedIcon />} disabled={blnSaving} onClick={() => void handleWithdraw()}>
                Withdraw
              </Button>
            ) : null}
            {blnCanCancel ? (
              <Button variant="outlined" color="error" startIcon={<DoNotDisturbOnRoundedIcon />} disabled={blnSaving} onClick={() => void handleCancel()}>
                Cancel
              </Button>
            ) : null}
            <Button variant="contained" startIcon={<SaveRoundedIcon />} disabled={!blnEditable || blnAllocationExceeded || blnSaving} onClick={() => void handleSaveDraft()}>
              Save Draft
            </Button>
            <Button variant="contained" color="warning" startIcon={<SendRoundedIcon />} disabled={!blnEditable || blnAllocationExceeded || blnSaving} onClick={() => void handleSubmit()}>
              Submit
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Snackbar open={Boolean(strToast)} autoHideDuration={2500} onClose={() => setStrToast("")} message={strToast} />
    </Box>
  );
}
