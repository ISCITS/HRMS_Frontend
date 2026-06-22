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
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import styles from "@/components/master/MasterScreen.module.css";
import {
  flexiPayDeclarationService,
  type FlexiDeclarationContextRecord,
  type FlexiEligibilityQuestionRecord,
  type FlexiDeclarationLineRecord,
} from "@/features/flexi-pay-declaration/services/flexiPayDeclarationService";

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
  if (["approved"].includes(strValue)) return "success";
  if (["submitted"].includes(strValue)) return "warning";
  if (["rejected", "returned"].includes(strValue)) return "error";
  return "default";
}

function formatStatus(strStatus?: string | null) {
  return String(strStatus || "draft")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (strChar) => strChar.toUpperCase());
}

type DraftInputMap = Record<number, string>;

function buildInitialDraftInputs(objContext: FlexiDeclarationContextRecord) {
  return (objContext.lstDeclarationLines || []).reduce<DraftInputMap>((dicAcc, objLine) => {
    dicAcc[objLine.intSalaryComponentID] = String(objLine.decDraftDeclaredAnnual ?? objLine.decAllocationAnnual ?? 0);
    return dicAcc;
  }, {});
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
  const strResidualName = objContext?.objFlexiAllocation?.strResidualComponentName || "Residual Taxable Allowance";
  const strWorkflowStatus = objContext?.objDeclaration?.strWorkflowStatus || "draft";
  const blnEditable = objContext?.blnCanDeclare && ["draft", "returned", "rejected"].includes(strWorkflowStatus);
  const blnCanWithdraw = strWorkflowStatus === "submitted";
  const blnCanCancel = ["draft", "returned", "rejected"].includes(strWorkflowStatus);

  const lstRows = useMemo(
    () =>
      (objContext?.lstDeclarationLines || []).map((objLine) => {
        const decDeclaredAnnual = normalizeAmount(dicDraftInputs[objLine.intSalaryComponentID] ?? "0");
        return {
          ...objLine,
          decDeclaredAnnual,
          decDeclaredMonthly: decDeclaredAnnual / 12,
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

  async function handleSaveDraft() {
    setBlnSaving(true);
    setStrError("");
    try {
      const objData = await flexiPayDeclarationService.saveDraft(strFinancialYearCode, buildPayloadRows(), strRemarks, dicEligibilityAnswers);
      setObjContext(objData);
      setDicDraftInputs(buildInitialDraftInputs(objData));
      setDicEligibilityAnswers(objData.objEligibilityAnswers || {});
      setStrToast("Draft saved successfully.");
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
      setObjContext(objData);
      setDicDraftInputs(buildInitialDraftInputs(objData));
      setDicEligibilityAnswers(objData.objEligibilityAnswers || {});
      setStrToast("Declaration submitted successfully.");
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
      setObjContext(objData);
      setDicDraftInputs(buildInitialDraftInputs(objData));
      setStrRemarks(objData.objDeclaration?.strRemarks || "");
      setDicEligibilityAnswers(objData.objEligibilityAnswers || {});
      setStrToast("Previous year declaration copied into draft.");
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
      setObjContext(objData);
      setDicDraftInputs(buildInitialDraftInputs(objData));
      setDicEligibilityAnswers(objData.objEligibilityAnswers || {});
      setStrToast("Submitted declaration moved back to draft.");
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
      setObjContext(objData);
      setDicDraftInputs(buildInitialDraftInputs(objData));
      setDicEligibilityAnswers(objData.objEligibilityAnswers || {});
      setStrToast("Declaration cancelled successfully.");
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
    <Box className={styles.page}>
      <Paper
        className={styles.controlsCard}
        sx={{
          p: 1.5,
          borderRadius: "12px",
          border: "1px solid #1e3a8a !important",
          background: "linear-gradient(90deg, #184f94 0%, #0f7ea7 100%) !important",
          boxShadow: "0 8px 20px rgba(11, 47, 99, 0.22)",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1.08rem", color: "#f8fcff" }}>Flexi Pay Declaration</Typography>
            <Typography sx={{ color: "rgba(239,252,255,0.92)", fontSize: "0.82rem" }}>
              FY {strFinancialYearCode} declaration workflow with ESS draft, submit, withdraw, and HR review handoff
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip label={formatStatus(strWorkflowStatus)} color={getStatusTone(strWorkflowStatus)} size="small" />
            <Typography sx={{ color: "#f8fcff", fontSize: "0.78rem" }}>
              Submitted: {formatDate(objContext?.objDeclaration?.dtSubmittedOn)}
            </Typography>
          </Stack>
        </Stack>
      </Paper>

      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {!objContext?.blnCanDeclare ? <Alert severity="info">{objContext?.strIneligibilityReason || "Flexi declaration is not available."}</Alert> : null}
      {blnAllocationExceeded ? <Alert severity="error">Declared total exceeds the available flexi basket.</Alert> : null}

      <Box sx={{ display: "grid", gap: 1.2, gridTemplateColumns: { xs: "1fr", lg: "repeat(4, minmax(0, 1fr))" } }}>
        <Paper variant="outlined" sx={{ p: 1.3, borderRadius: "14px" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>Employee</Typography>
          <Typography sx={{ fontWeight: 800 }}>
            {objContext?.objEmployeeSummary?.strEmployeeName || "Employee"}
            {objContext?.objEmployeeSummary?.strEmployeeCode ? ` (${objContext.objEmployeeSummary.strEmployeeCode})` : ""}
          </Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.3, borderRadius: "14px" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>Salary Structure</Typography>
          <Typography sx={{ fontWeight: 800 }}>{objContext?.objAssignedStructure?.strSalaryStructureName || "-"}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.3, borderRadius: "14px" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>Flexi Basket</Typography>
          <Typography sx={{ fontWeight: 800 }}>{formatCurrency(decBasketAnnual, strCurrencyCode)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.3, borderRadius: "14px" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>{strResidualName}</Typography>
          <Typography sx={{ fontWeight: 800 }}>{formatCurrency(decResidualAnnual, strCurrencyCode)}</Typography>
        </Paper>
      </Box>

      <Paper className={styles.tableCard} sx={{ borderRadius: "14px", overflow: "hidden" }}>
        <Box sx={{ p: 1.2, borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
          <Typography sx={{ fontWeight: 800, fontSize: "0.92rem" }}>Declared Flexi Components</Typography>
          <Typography sx={{ color: "#64748b", fontSize: "0.76rem", mt: 0.25 }}>
            Components are backed by the current salary structure and validated against declaration caps on save and submit.
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Component</TableCell>
                <TableCell align="right">Annual Cap</TableCell>
                <TableCell align="right">Declared Annual</TableCell>
                <TableCell align="right">Monthly Equivalent</TableCell>
                <TableCell>Proof</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lstRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: "center", py: 2.5, color: "#64748b" }}>
                    No flexi declaration components are available for this employee.
                  </TableCell>
                </TableRow>
              ) : (
                lstRows.map((objRow: FlexiDeclarationLineRecord & { decDeclaredAnnual: number; decDeclaredMonthly: number }) => (
                  <TableRow key={objRow.intSalaryComponentID}>
                    <TableCell sx={{ minWidth: 220 }}>
                      <Typography sx={{ fontWeight: 700 }}>{objRow.strComponentName || objRow.strComponentCode || "Component"}</Typography>
                      <Typography sx={{ color: "#64748b", fontSize: "0.72rem" }}>{objRow.strTaxTreatment || "As per payroll rule"}</Typography>
                    </TableCell>
                    <TableCell align="right">{formatCurrency(objRow.decAnnualLimit, strCurrencyCode)}</TableCell>
                    <TableCell align="right" sx={{ minWidth: 160 }}>
                      <TextField
                        size="small"
                        type="number"
                        value={dicDraftInputs[objRow.intSalaryComponentID] ?? ""}
                        disabled={!blnEditable || blnSaving}
                        onChange={(e) =>
                          setDicDraftInputs((dicPrev) => ({
                            ...dicPrev,
                            [objRow.intSalaryComponentID]: e.target.value,
                          }))
                        }
                        inputProps={{ min: 0, max: objRow.decAnnualLimit ?? undefined }}
                        sx={{ width: 130 }}
                      />
                    </TableCell>
                    <TableCell align="right">{formatCurrency(objRow.decDeclaredMonthly, strCurrencyCode)}</TableCell>
                    <TableCell>{objRow.blnProofRequired ? "Required" : "Not Required"}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap justifyContent="flex-end">
                        <Chip
                          size="small"
                          label={formatStatus(objRow.strDeclarationItemStatus || strWorkflowStatus)}
                          color={getStatusTone(objRow.strDeclarationItemStatus || strWorkflowStatus)}
                        />
                        {objRow.blnEligible === false ? <Chip size="small" color="error" label="Ineligible" /> : null}
                      </Stack>
                      {objRow.strEligibilityReason ? (
                        <Typography sx={{ color: objRow.blnEligible === false ? "#b91c1c" : "#64748b", fontSize: "0.7rem", mt: 0.35 }}>
                          {objRow.strEligibilityReason}
                        </Typography>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {(objContext?.lstEligibilityQuestions || []).length > 0 ? (
        <Paper className={styles.controlsCard} sx={{ p: 1.2, borderRadius: "14px" }}>
          <Stack spacing={1}>
            <Typography sx={{ fontWeight: 800, fontSize: "0.9rem" }}>Eligibility Conditions</Typography>
            <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
              {(objContext?.lstEligibilityQuestions || []).map((objQuestion: FlexiEligibilityQuestionRecord) => (
                <Paper key={objQuestion.strQuestionCode} variant="outlined" sx={{ p: 1, borderRadius: "10px" }}>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.8rem" }}>{objQuestion.strQuestionLabel}</Typography>
                  {objQuestion.strHint ? <Typography sx={{ color: "#64748b", fontSize: "0.72rem", mb: 0.8 }}>{objQuestion.strHint}</Typography> : null}
                  {objQuestion.strAnswerType === "boolean" ? (
                    <TextField
                      select
                      size="small"
                      fullWidth
                      value={String(Boolean(dicEligibilityAnswers[objQuestion.strQuestionCode]))}
                      disabled={!blnEditable || blnSaving}
                      onChange={(e) => setDicEligibilityAnswers((dicPrev) => ({
                        ...dicPrev,
                        [objQuestion.strQuestionCode]: e.target.value === "true",
                      }))}
                    >
                      <MenuItem value="false">No</MenuItem>
                      <MenuItem value="true">Yes</MenuItem>
                    </TextField>
                  ) : (
                    <TextField
                      size="small"
                      fullWidth
                      type="number"
                      value={String(dicEligibilityAnswers[objQuestion.strQuestionCode] ?? 0)}
                      disabled={!blnEditable || blnSaving}
                      onChange={(e) => setDicEligibilityAnswers((dicPrev) => ({
                        ...dicPrev,
                        [objQuestion.strQuestionCode]: Number(e.target.value || 0),
                      }))}
                    />
                  )}
                </Paper>
              ))}
            </Box>
          </Stack>
        </Paper>
      ) : null}

      <Paper className={styles.controlsCard} sx={{ p: 1.2, borderRadius: "14px" }}>
        <Stack spacing={1}>
          <Typography sx={{ fontWeight: 800, fontSize: "0.9rem" }}>Declaration Remarks</Typography>
          <TextField
            multiline
            minRows={3}
            value={strRemarks}
            disabled={(!blnEditable && !blnCanWithdraw) || blnSaving}
            onChange={(e) => setStrRemarks(e.target.value)}
            placeholder="Optional employee remarks for draft, submission, or withdrawal."
          />
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between">
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={`Declared: ${formatCurrency(decDeclaredAnnual, strCurrencyCode)}`} />
              <Chip label={`Residual: ${formatCurrency(decResidualAnnual, strCurrencyCode)}`} />
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="flex-end">
              <Button size="small" variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/salary/flexi-pay-declarations")}>
                Back
              </Button>
              <Button size="small" variant="outlined" startIcon={<ContentCopyRoundedIcon />} disabled={!blnEditable || blnSaving} onClick={() => void handleCopyPreviousYear()}>
                Copy Previous Year
              </Button>
              {blnCanWithdraw ? (
                <Button size="small" variant="outlined" color="warning" startIcon={<UndoRoundedIcon />} disabled={blnSaving} onClick={() => void handleWithdraw()}>
                  Withdraw
                </Button>
              ) : null}
              {blnCanCancel ? (
                <Button size="small" variant="outlined" color="error" startIcon={<DoNotDisturbOnRoundedIcon />} disabled={!blnEditable || blnSaving} onClick={() => void handleCancel()}>
                  Cancel
                </Button>
              ) : null}
              <Button size="small" variant="contained" startIcon={<SaveRoundedIcon />} disabled={!blnEditable || blnSaving || blnAllocationExceeded} onClick={() => void handleSaveDraft()}>
                Save Draft
              </Button>
              <Button size="small" variant="contained" color="warning" startIcon={<SendRoundedIcon />} disabled={!blnEditable || blnSaving || blnAllocationExceeded} onClick={() => void handleSubmit()}>
                Submit
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      <Snackbar open={Boolean(strToast)} autoHideDuration={2500} onClose={() => setStrToast("")} message={strToast} />
    </Box>
  );
}
