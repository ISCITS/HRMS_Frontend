"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
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

import {
  hrFlexiDeclarationReviewService,
  type FlexiDeclarationContextRecord,
} from "@/features/flexi-pay-declaration/services/flexiPayDeclarationService";

type Props = {
  intDeclarationID: number;
};

function formatCurrency(decValue: number | null | undefined, strCurrencyCode = "INR") {
  if (decValue == null) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: strCurrencyCode,
    maximumFractionDigits: 0,
  }).format(decValue);
}

function formatStatus(strStatus?: string | null) {
  return String(strStatus || "submitted")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (strChar) => strChar.toUpperCase());
}

export default function FlexiDeclarationReviewDetailPage({ intDeclarationID }: Props) {
  const objRouter = useRouter();
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strToast, setStrToast] = useState("");
  const [strRemarks, setStrRemarks] = useState("");
  const [strRejectMode, setStrRejectMode] = useState<"return" | "reject" | null>(null);
  const [objContext, setObjContext] = useState<FlexiDeclarationContextRecord | null>(null);
  const [dicApprovedInputs, setDicApprovedInputs] = useState<Record<number, string>>({});

  const loadData = useCallback(async function loadData() {
    setBlnLoading(true);
    setStrError("");
    try {
      const objData = await hrFlexiDeclarationReviewService.getDetail(intDeclarationID);
      setObjContext(objData);
      setStrRemarks(objData.objDeclaration?.strRemarks || "");
      setDicApprovedInputs(
        (objData.lstDeclarationLines || []).reduce<Record<number, string>>((dicAcc, objLine) => {
          dicAcc[objLine.intSalaryComponentID] = String(
            objLine.decDraftApprovedAnnual ?? objLine.decDraftDeclaredAnnual ?? objLine.decAllocationAnnual ?? 0,
          );
          return dicAcc;
        }, {}),
      );
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load flexi declaration detail.");
    } finally {
      setBlnLoading(false);
    }
  }, [intDeclarationID]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const strCurrencyCode = objContext?.objAssignedStructure?.strCurrencyCode || "INR";
  const strWorkflowStatus = objContext?.objDeclaration?.strWorkflowStatus || "draft";
  const blnReviewOpen = strWorkflowStatus === "submitted";
  const blnCanLock = strWorkflowStatus === "approved";

  const lstRows = useMemo(
    () =>
      (objContext?.lstDeclarationLines || []).map((objLine) => ({
        ...objLine,
        decApprovedAnnual: Number(dicApprovedInputs[objLine.intSalaryComponentID] || 0),
      })),
    [dicApprovedInputs, objContext?.lstDeclarationLines],
  );

  const decApprovedTotal = useMemo(
    () => lstRows.reduce((decTotal, objRow) => decTotal + objRow.decApprovedAnnual, 0),
    [lstRows],
  );
  const decBasket = Number(objContext?.objFlexiAllocation?.decFlexiBasketAvailableAnnual || 0);
  const blnOverBasket = decApprovedTotal > decBasket;

  async function handleApprove() {
    setBlnSaving(true);
    setStrError("");
    try {
      await hrFlexiDeclarationReviewService.approve(intDeclarationID, {
        lstItems: lstRows.map((objRow) => ({
          intSalaryComponentID: objRow.intSalaryComponentID,
          decApprovedAmountAnnual: objRow.decApprovedAnnual,
          strRemarks: objRow.strDeclarationItemRemarks || null,
        })),
        strRemarks,
      });
      setStrToast("Declaration approved successfully.");
      await loadData();
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to approve declaration.");
    } finally {
      setBlnSaving(false);
    }
  }

  async function handleDecision() {
    if (!strRejectMode) return;
    setBlnSaving(true);
    setStrError("");
    try {
      if (strRejectMode === "return") {
        await hrFlexiDeclarationReviewService.returnForCorrection(intDeclarationID, strRemarks);
        setStrToast("Declaration returned for correction.");
      } else {
        await hrFlexiDeclarationReviewService.reject(intDeclarationID, strRemarks);
        setStrToast("Declaration rejected.");
      }
      setStrRejectMode(null);
      await loadData();
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to update declaration.");
    } finally {
      setBlnSaving(false);
    }
  }

  async function handleLock() {
    setBlnSaving(true);
    setStrError("");
    try {
      await hrFlexiDeclarationReviewService.lock(intDeclarationID, strRemarks);
      setStrToast("Declaration locked successfully.");
      await loadData();
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to lock declaration.");
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

  if (!objContext) {
    return <Alert severity="error">{strError || "Declaration not found."}</Alert>;
  }

  return (
    <Stack spacing={1.2}>
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {blnOverBasket ? <Alert severity="error">Approved total exceeds the available flexi basket.</Alert> : null}

      <Paper sx={{ p: 1.35, borderRadius: "10px", border: "1px solid #bfdbfe" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography sx={{ fontWeight: 900, color: "#0f172a", fontSize: "1.05rem" }}>
              {objContext.objEmployeeSummary?.strEmployeeName || "Employee"}
              {objContext.objEmployeeSummary?.strEmployeeCode ? ` (${objContext.objEmployeeSummary.strEmployeeCode})` : ""}
            </Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
              FY {objContext.strFinancialYearCode} | Declaration #{objContext.objDeclaration?.intDeclarationID || "-"}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip label={formatStatus(strWorkflowStatus)} color={["approved", "locked"].includes(strWorkflowStatus) ? "success" : strWorkflowStatus === "submitted" ? "warning" : "default"} />
            <Button size="small" variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/payroll/flexi-declaration-review")}>
              Back
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ display: "grid", gap: 1.2, gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" } }}>
        <Paper variant="outlined" sx={{ p: 1.2, borderRadius: "12px" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>Flexi Basket</Typography>
          <Typography sx={{ fontWeight: 800 }}>{formatCurrency(decBasket, strCurrencyCode)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.2, borderRadius: "12px" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>Approved Total</Typography>
          <Typography sx={{ fontWeight: 800 }}>{formatCurrency(decApprovedTotal, strCurrencyCode)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.2, borderRadius: "12px" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>Structure</Typography>
          <Typography sx={{ fontWeight: 800 }}>{objContext.objAssignedStructure?.strSalaryStructureName || "-"}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.2, borderRadius: "12px" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>Employee</Typography>
          <Typography sx={{ fontWeight: 800 }}>{objContext.objEmployeeSummary?.strEmployeeCode || "-"}</Typography>
        </Paper>
      </Box>

      <Paper sx={{ borderRadius: "12px", overflow: "hidden" }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Component</TableCell>
                <TableCell align="right">Submitted Annual</TableCell>
                <TableCell align="right">Annual Cap</TableCell>
                <TableCell align="right">Approved Annual</TableCell>
                <TableCell>Proof</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lstRows.map((objRow) => (
                <TableRow key={objRow.intSalaryComponentID}>
                  <TableCell>{objRow.strComponentName || objRow.strComponentCode || "Component"}</TableCell>
                  <TableCell align="right">{formatCurrency(objRow.decDraftDeclaredAnnual, strCurrencyCode)}</TableCell>
                  <TableCell align="right">{formatCurrency(objRow.decAnnualLimit, strCurrencyCode)}</TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      type="number"
                      value={dicApprovedInputs[objRow.intSalaryComponentID] ?? ""}
                      disabled={!blnReviewOpen || blnSaving}
                      onChange={(e) =>
                        setDicApprovedInputs((dicPrev) => ({
                          ...dicPrev,
                          [objRow.intSalaryComponentID]: e.target.value,
                        }))
                      }
                      sx={{ width: 130 }}
                    />
                  </TableCell>
                  <TableCell>{objRow.blnProofRequired ? "Required" : "Not Required"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 1.2, borderRadius: "12px" }}>
        <Stack spacing={1}>
          <Typography sx={{ fontWeight: 800 }}>Reviewer Remarks</Typography>
          <TextField multiline minRows={3} value={strRemarks} onChange={(e) => setStrRemarks(e.target.value)} disabled={(!blnReviewOpen && !blnCanLock) || blnSaving} />
          <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
            <Button variant="outlined" color="warning" disabled={!blnReviewOpen || blnSaving} onClick={() => setStrRejectMode("return")}>
              Return
            </Button>
            <Button variant="outlined" color="error" disabled={!blnReviewOpen || blnSaving} onClick={() => setStrRejectMode("reject")}>
              Reject
            </Button>
            {blnCanLock ? (
              <Button variant="outlined" color="success" disabled={blnSaving} onClick={() => void handleLock()}>
                Lock
              </Button>
            ) : null}
            <Button variant="contained" disabled={!blnReviewOpen || blnSaving || blnOverBasket} onClick={() => void handleApprove()}>
              Approve
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Dialog open={Boolean(strRejectMode)} onClose={() => setStrRejectMode(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{strRejectMode === "return" ? "Return Declaration" : "Reject Declaration"}</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>Reviewer remarks will be saved on the declaration.</Typography>
          <TextField fullWidth multiline minRows={3} value={strRemarks} onChange={(e) => setStrRemarks(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStrRejectMode(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleDecision()} disabled={blnSaving || !strRemarks.trim()}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(strToast)} autoHideDuration={2400} onClose={() => setStrToast("")} message={strToast} />
    </Stack>
  );
}
