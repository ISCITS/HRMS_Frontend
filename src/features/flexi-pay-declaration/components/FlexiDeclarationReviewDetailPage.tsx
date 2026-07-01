"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
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
  Tooltip,
  Typography,
} from "@mui/material";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useFlexiPayDeclarationLabels } from "@/features/flexi-pay-declaration/hooks/useFlexiPayDeclarationLabels";
import {
  hrFlexiDeclarationReviewService,
  type FlexiDeclarationContextRecord,
} from "@/features/flexi-pay-declaration/services/flexiPayDeclarationService";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type Props = {
  intDeclarationID?: number;
};

const lstEmployeeSalaryModuleCodes = ["EMPLOYEE_SALARY", "EMPLOYEE-SALARY", "EMPLOYEE_SALARIES"];

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

function normalizeText(strValue?: string | null) {
  return String(strValue || "").trim().toLowerCase();
}

function getStatusTone(strStatus?: string | null): "default" | "success" | "warning" | "error" {
  const strValue = normalizeText(strStatus);
  if (["approved", "locked"].includes(strValue)) return "success";
  if (["submitted"].includes(strValue)) return "warning";
  if (["rejected", "returned", "cancelled", "released"].includes(strValue)) return "error";
  return "default";
}

function getRegimeChipColor(strApplicableRegime?: string | null): "default" | "info" | "success" | "warning" {
  const strValue = normalizeText(strApplicableRegime).replace(/[-_]+/g, " ");
  if (strValue.includes("new")) return "warning";
  if (strValue.includes("old")) return "info";
  if (strValue.includes("both") || strValue === "all" || strValue === "all regimes") return "success";
  return "default";
}

function getSelectedTaxRegimeLabel(objContext: FlexiDeclarationContextRecord | null) {
  const strLabel =
    objContext?.objSelectedTaxRegime?.strTaxRegimeLabel
    || objContext?.objSelectedTaxRegime?.strTaxRegimeName
    || objContext?.strSelectedTaxRegime
    || objContext?.strTaxRegime
    || "";
  const strNormalized = normalizeText(strLabel).replace(/[-_]+/g, " ");
  if (!strNormalized) return "Not selected";
  if (strNormalized.includes("new")) return "New Regime";
  if (strNormalized.includes("old")) return "Old Regime";
  if (strNormalized.includes("both") || strNormalized === "all" || strNormalized === "all regimes") return "Both Regimes";
  return strLabel.replace(/[-_]+/g, " ").trim();
}

function getLineReasonText(objRow: Record<string, unknown>) {
  return String(
    objRow.strEligibilityReason
    ?? objRow.strRegimeEligibilityReason
    ?? objRow.strDeclarationItemRemarks
    ?? "-",
  );
}

function buildReturnPath(strReturnTo: string, blnFocusFlexiSection: boolean) {
  const strBasePath = strReturnTo.startsWith("/") && !strReturnTo.startsWith("//")
    ? strReturnTo
    : "/payroll/flexi-declaration-review";
  if (!blnFocusFlexiSection || strBasePath.includes("#")) {
    return strBasePath;
  }
  return `${strBasePath}#flexi-component`;
}

export default function FlexiDeclarationReviewDetailPage({ intDeclarationID }: Props) {
  const objParams = useParams<{ intDeclarationID?: string | string[] }>();
  const objRouter = useRouter();
  const objSearchParams = useSearchParams();
  const { t } = useFlexiPayDeclarationLabels();
  const { canDoAny } = useModuleActionAccess(lstEmployeeSalaryModuleCodes);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strToast, setStrToast] = useState("");
  const [strRemarks, setStrRemarks] = useState("");
  const [strRejectMode, setStrRejectMode] = useState<"return" | "reject" | null>(null);
  const [objContext, setObjContext] = useState<FlexiDeclarationContextRecord | null>(null);
  const [dicApprovedInputs, setDicApprovedInputs] = useState<Record<number, string>>({});
  const strRouteDeclarationID = Array.isArray(objParams?.intDeclarationID)
    ? objParams.intDeclarationID[0]
    : objParams?.intDeclarationID;
  const intResolvedDeclarationID = Number.isFinite(intDeclarationID)
    ? Number(intDeclarationID)
    : Number(strRouteDeclarationID);
  const strSource = (objSearchParams.get("source") || "").trim().toLowerCase();
  const strReturnTo = (objSearchParams.get("returnTo") || "").trim();

  const loadData = useCallback(async function loadData() {
    if (!Number.isFinite(intResolvedDeclarationID) || intResolvedDeclarationID <= 0) {
      setObjContext(null);
      setStrError("Unable to resolve declaration ID from the route.");
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    setStrError("");
    try {
      const objData = await hrFlexiDeclarationReviewService.getDetail(intResolvedDeclarationID);
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
  }, [intResolvedDeclarationID]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const strCurrencyCode = objContext?.objAssignedStructure?.strCurrencyCode || "INR";
  const strWorkflowStatus = objContext?.objDeclaration?.strWorkflowStatus || "draft";
  const strSelectedTaxRegimeLabel = getSelectedTaxRegimeLabel(objContext);
  const blnEmployeeSalarySource = strSource === "employee_salary";
  const blnCanApproveAction = canDoAny("approve");
  const blnCanRejectAction = canDoAny("reject") || blnCanApproveAction;
  const blnCanLockAction = canDoAny("lock") || blnCanApproveAction;
  const blnCanReleaseAction = canDoAny("release") || canDoAny("unlock") || blnCanApproveAction;
  const blnCanReturnAction = blnCanApproveAction;
  const blnShowWorkflowActions = blnEmployeeSalarySource;
  const blnReviewOpen = strWorkflowStatus === "submitted";
  const blnCanApproveCurrent = blnShowWorkflowActions && blnReviewOpen && blnCanApproveAction;
  const blnCanRejectCurrent = blnShowWorkflowActions && blnReviewOpen && blnCanRejectAction;
  const blnCanReturnCurrent = blnShowWorkflowActions && blnReviewOpen && blnCanReturnAction;
  const blnCanLockCurrent = blnShowWorkflowActions && strWorkflowStatus === "approved" && blnCanLockAction;
  const blnCanReleaseCurrent = blnShowWorkflowActions && strWorkflowStatus === "locked" && blnCanReleaseAction;
  const blnCanEditRemarks = blnCanApproveCurrent || blnCanLockCurrent || blnCanReleaseCurrent || blnCanRejectCurrent || blnCanReturnCurrent;
  const strBackPath = buildReturnPath(strReturnTo, false);

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
  const decDeclaredAnnual = Number(
    objContext?.salary_impact_summary?.decDeclaredFlexiAnnual
    ?? objContext?.decDeclaredFlexiAnnual
    ?? lstRows.reduce((decTotal, objRow) => decTotal + Number(objRow.decDraftDeclaredAnnual || 0), 0),
  );
  const decResidualAnnual = Number(
    objContext?.salary_impact_summary?.decResidualTaxableBalanceAnnual
    ?? objContext?.decResidualTaxableBalanceAnnual
    ?? Math.max(decBasket - decDeclaredAnnual, 0),
  );
  const decAnnualCtc = Number(objContext?.salary_impact_summary?.decAnnualCtc ?? objContext?.objCurrentSalarySnapshot?.decCtcAnnual ?? 0);
  const decGrossMonthly = Number(objContext?.salary_impact_summary?.decGrossMonthly ?? objContext?.objCurrentSalarySnapshot?.decGrossMonthly ?? 0);
  const decEstimatedMonthlyPayrollImpact = Number(objContext?.salary_impact_summary?.decEstimatedMonthlyPayrollImpact ?? decDeclaredAnnual / 12);
  const strResidualComponentName = String(objContext?.salary_impact_summary?.objResidualComponent?.strComponentName ?? objContext?.objFlexiAllocation?.strResidualComponentName ?? "-");

  function navigateAfterAction(blnFocusFlexiSection: boolean) {
    if (blnEmployeeSalarySource) {
      objRouter.push(buildReturnPath(strReturnTo, blnFocusFlexiSection));
      return;
    }
    objRouter.push("/payroll/flexi-declaration-review");
  }

  async function handleApprove() {
    setBlnSaving(true);
    setStrError("");
    try {
      await hrFlexiDeclarationReviewService.approve(intResolvedDeclarationID, {
        lstItems: lstRows.map((objRow) => ({
          intSalaryComponentID: objRow.intSalaryComponentID,
          decApprovedAmountAnnual: objRow.decApprovedAnnual,
          strRemarks: objRow.strDeclarationItemRemarks || null,
        })),
        strRemarks,
      });
      setStrToast(t("flexi_pay_declaration_approve_success", "Declaration approved successfully."));
      navigateAfterAction(false);
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
        await hrFlexiDeclarationReviewService.returnForCorrection(intResolvedDeclarationID, strRemarks);
        setStrToast(t("flexi_pay_declaration_return_success", "Declaration returned for correction."));
      } else {
        await hrFlexiDeclarationReviewService.reject(intResolvedDeclarationID, strRemarks);
        setStrToast(t("flexi_pay_declaration_reject_success", "Declaration rejected."));
      }
      setStrRejectMode(null);
      navigateAfterAction(true);
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
      await hrFlexiDeclarationReviewService.lock(intResolvedDeclarationID, strRemarks);
      setStrToast(t("flexi_pay_declaration_lock_success", "Declaration locked successfully."));
      navigateAfterAction(false);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to lock declaration.");
    } finally {
      setBlnSaving(false);
    }
  }

  async function handleRelease() {
    setBlnSaving(true);
    setStrError("");
    try {
      await hrFlexiDeclarationReviewService.release(intResolvedDeclarationID, strRemarks);
      setStrToast(t("flexi_pay_declaration_release_success", "Declaration released successfully."));
      navigateAfterAction(true);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to release declaration.");
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
    <Box sx={{ display: "grid", gap: 1.2 }}>
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {blnOverBasket ? <Alert severity="error">Approved total exceeds the available flexi basket.</Alert> : null}

      <Paper
        sx={{
          p: 1.35,
          borderRadius: "12px",
          border: "1px solid #1e3a8a",
          background: "linear-gradient(90deg, #184f94 0%, #0f7ea7 100%)",
          boxShadow: "0 8px 20px rgba(11, 47, 99, 0.18)",
          position: "sticky",
          top: 0,
          zIndex: 8,
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography sx={{ fontWeight: 900, color: "#f8fcff", fontSize: "1.05rem" }}>
              {objContext.objEmployeeSummary?.strEmployeeName || "Employee"}
              {objContext.objEmployeeSummary?.strEmployeeCode ? ` (${objContext.objEmployeeSummary.strEmployeeCode})` : ""}
            </Typography>
            <Typography sx={{ color: "rgba(239,252,255,0.92)", fontSize: "0.82rem" }}>
              {objContext.objEmployeeSummary?.strEmployeeCode || "-"} | FY {objContext.strFinancialYearCode} | Current Status {formatStatus(strWorkflowStatus)} | IT Regime {strSelectedTaxRegimeLabel}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip label={formatStatus(strWorkflowStatus)} color={getStatusTone(strWorkflowStatus)} />
            <Button
              size="small"
              variant="outlined"
              startIcon={<ArrowBackRoundedIcon />}
              sx={{ color: "#ffffff", borderColor: "rgba(255,255,255,0.72)", "&:hover": { borderColor: "#ffffff", backgroundColor: "rgba(255,255,255,0.1)" } }}
              onClick={() => objRouter.push(strBackPath)}
            >
              {t("flexi_pay_declaration_back", "Back")}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ display: "grid", gap: 0.75, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))", lg: "repeat(6, minmax(0, 1fr))" } }}>
        <Paper variant="outlined" sx={{ p: 0.7, borderRadius: "10px", borderLeft: "3px solid #2563eb" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.68rem" }}>Current Status</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem" }}>{formatStatus(strWorkflowStatus)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 0.7, borderRadius: "10px", borderLeft: "3px solid #0d9488" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.68rem" }}>Flexi Basket Available</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem" }}>{formatCurrency(decBasket, strCurrencyCode)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 0.7, borderRadius: "10px", borderLeft: "3px solid #d97706" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.68rem" }}>Declared Flexi</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem" }}>{formatCurrency(decDeclaredAnnual, strCurrencyCode)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 0.7, borderRadius: "10px", borderLeft: "3px solid #db2777" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.68rem" }}>Residual Taxable Balance</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem" }}>{formatCurrency(decResidualAnnual, strCurrencyCode)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 0.7, borderRadius: "10px", borderLeft: "3px solid #7c3aed" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.68rem" }}>Assigned Salary Structure</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem" }}>{objContext.objAssignedStructure?.strStructureName || "-"}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 0.7, borderRadius: "10px", borderLeft: "3px solid #f59e0b" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.68rem" }}>Tax Regime</Typography>
          <Chip
            size="small"
            variant="outlined"
            label={strSelectedTaxRegimeLabel}
            color={getRegimeChipColor(strSelectedTaxRegimeLabel)}
            sx={{ mt: 0.25, height: 22, maxWidth: "100%", "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem", fontWeight: 800 } }}
          />
        </Paper>
      </Box>

      <Stack spacing={1.2}>
        <Box sx={{ display: "grid", gap: 1.2, alignItems: "start", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 340px" } }}>
          <Paper sx={{ borderRadius: "12px", overflow: "hidden" }}>
            <Box sx={{ p: 1.2, borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }}>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: "0.92rem" }}>Eligible Flexi Components</Typography>
                  <Typography sx={{ color: "#64748b", fontSize: "0.76rem", mt: 0.25 }}>
                    Review submitted declaration values in the same flexi declaration layout before workflow action.
                  </Typography>
                </Box>
                <Chip label={`${lstRows.filter((objRow) => objRow.blnEligible !== false).length} eligible / ${lstRows.length} total`} sx={{ alignSelf: { xs: "flex-start", md: "center" }, fontWeight: 700 }} />
              </Stack>
            </Box>

            <TableContainer sx={{ maxHeight: 320 }}>
              <Table
                size="small"
                sx={{
                  tableLayout: "fixed",
                  minWidth: 1180,
                  "& .MuiTableCell-root": { py: 0.55, px: 0.75, fontSize: "0.7rem", verticalAlign: "middle" },
                  "& .MuiTableHead-root .MuiTableCell-root": { py: 0.65, fontWeight: 700, whiteSpace: "nowrap", fontSize: "0.68rem" },
                }}
              >
                <colgroup>
                  <col style={{ width: 190 }} />
                  <col style={{ width: 126 }} />
                  <col style={{ width: 108 }} />
                  <col style={{ width: 96 }} />
                  <col style={{ width: 132 }} />
                  <col style={{ width: 94 }} />
                  <col style={{ width: 74 }} />
                  <col style={{ width: 82 }} />
                  <col style={{ width: 248 }} />
                </colgroup>
                <TableHead sx={{ position: "sticky", top: 0, zIndex: 2, backgroundColor: "#ffffff" }}>
                  <TableRow>
                    <TableCell>Component</TableCell>
                    <TableCell>Eligibility</TableCell>
                    <TableCell>Regime</TableCell>
                    <TableCell align="right">Annual Cap</TableCell>
                    <TableCell align="right">Approved Annual</TableCell>
                    <TableCell align="right">Submitted Annual</TableCell>
                    <TableCell>Proof</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Reason / Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lstRows.map((objRow) => (
                    <TableRow key={objRow.intSalaryComponentID}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, fontSize: "0.73rem", lineHeight: 1.15 }}>
                          {objRow.strComponentName || objRow.strComponentCode || "Component"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={objRow.blnEligible === false ? "warning" : "success"}
                          label={objRow.blnEligible === false ? "Needs Details" : "Eligible"}
                          sx={{ minWidth: 82, height: 22 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={String(objRow.strEligibilityApplicableRegimeLabel || objRow.strComponentApplicableRegimeLabel || strSelectedTaxRegimeLabel)}
                          color={getRegimeChipColor(String(objRow.strEligibilityApplicableRegime || objRow.strComponentApplicableRegime || strSelectedTaxRegimeLabel))}
                          sx={{ height: 22, maxWidth: "100%", "& .MuiChip-label": { px: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }}
                        />
                      </TableCell>
                      <TableCell align="right">{formatCurrency(objRow.decAnnualLimit, strCurrencyCode)}</TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={dicApprovedInputs[objRow.intSalaryComponentID] ?? ""}
                          disabled={!blnCanApproveCurrent || blnSaving}
                          onChange={(e) =>
                            setDicApprovedInputs((dicPrev) => ({
                              ...dicPrev,
                              [objRow.intSalaryComponentID]: e.target.value,
                            }))
                          }
                          sx={{ width: 110, "& .MuiInputBase-root": { fontSize: "0.7rem", height: 32 }, "& input": { textAlign: "right" } }}
                        />
                      </TableCell>
                      <TableCell align="right">{formatCurrency(objRow.decDraftDeclaredAnnual, strCurrencyCode)}</TableCell>
                      <TableCell>{objRow.blnProofRequired ? "Required" : "No"}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={objRow.strDeclarationItemStatus ? formatStatus(objRow.strDeclarationItemStatus) : formatStatus(strWorkflowStatus)}
                          color={getStatusTone(String(objRow.strDeclarationItemStatus || strWorkflowStatus))}
                          sx={{ height: 22, maxWidth: "100%", "& .MuiChip-label": { px: 0.8, overflow: "hidden", textOverflow: "ellipsis" } }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: "#64748b", fontSize: "0.6rem", lineHeight: 1.15 }}>
                          {getLineReasonText(objRow as unknown as Record<string, unknown>)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Paper sx={{ p: 1.25, borderRadius: "18px", border: "1px solid #cfe3ff", display: "flex" }}>
            <Stack spacing={1.15} sx={{ width: "100%" }}>
              <Stack direction="row" spacing={0.6} alignItems="center">
                <Typography sx={{ fontWeight: 900, color: "#172554", fontSize: "0.95rem" }}>Salary Impact Summary</Typography>
                <Tooltip title="This is an estimate. Final payroll impact will be based on approved declaration and payroll processing." enterTouchDelay={0}>
                  <InfoOutlinedIcon sx={{ color: "#0757b8", fontSize: 16, cursor: "pointer" }} />
                </Tooltip>
              </Stack>
              <Stack spacing={0.9}>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}><Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>Annual CTC</Typography><Typography sx={{ color: "#0f172a", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decAnnualCtc, strCurrencyCode)}</Typography></Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}><Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>Gross Monthly</Typography><Typography sx={{ color: "#0f172a", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decGrossMonthly, strCurrencyCode)}</Typography></Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}><Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>Flexi Basket Available</Typography><Typography sx={{ color: "#0f172a", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decBasket, strCurrencyCode)}</Typography></Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}><Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>Declared Flexi</Typography><Typography sx={{ color: "#0f172a", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decDeclaredAnnual, strCurrencyCode)}</Typography></Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}><Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>Residual Taxable Balance</Typography><Typography sx={{ color: "#059669", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decResidualAnnual, strCurrencyCode)}</Typography></Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}><Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>Residual Component</Typography><Typography sx={{ color: "#0f172a", fontWeight: 900, fontSize: "0.8rem", textAlign: "right" }}>{strResidualComponentName}</Typography></Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}><Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>Estimated Monthly Payroll Impact</Typography><Typography sx={{ color: "#059669", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decEstimatedMonthlyPayrollImpact, strCurrencyCode)}</Typography></Box>
              </Stack>
            </Stack>
          </Paper>
        </Box>

        <Box sx={{ display: "grid", gap: 1.2, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" } }}>
          <Paper sx={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #dbe3ef" }}>
            <Box sx={{ p: 1.12, borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
              <Typography sx={{ fontWeight: 800, fontSize: "0.9rem" }}>Fixed Salary Components</Typography>
            </Box>
            <TableContainer>
              <Table size="small" sx={{ tableLayout: "fixed", "& .MuiTableCell-root": { py: 0.45, px: 0.7, fontSize: "0.7rem" }, "& .MuiTableHead-root .MuiTableCell-root": { py: 0.65, fontWeight: 700, fontSize: "0.68rem" } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Component</TableCell>
                    <TableCell align="right">Annual</TableCell>
                    <TableCell align="right">Monthly</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[{ strLabel: "Annual CTC", decAnnual: decAnnualCtc }, { strLabel: "Gross Monthly", decAnnual: decGrossMonthly * 12 }].map((objRow) => (
                    <TableRow key={objRow.strLabel}>
                      <TableCell>{objRow.strLabel}</TableCell>
                      <TableCell align="right">{formatCurrency(objRow.decAnnual, strCurrencyCode)}</TableCell>
                      <TableCell align="right">{formatCurrency(objRow.decAnnual / 12, strCurrencyCode)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Paper sx={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #dbe3ef" }}>
            <Box sx={{ p: 1.12, borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
              <Typography sx={{ fontWeight: 800, fontSize: "0.9rem" }}>Estimated Salary Split After Declaration</Typography>
            </Box>
            <TableContainer>
              <Table size="small" sx={{ tableLayout: "fixed", "& .MuiTableCell-root": { py: 0.45, px: 0.7, fontSize: "0.7rem" }, "& .MuiTableHead-root .MuiTableCell-root": { py: 0.65, fontWeight: 700, fontSize: "0.68rem" } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Bucket</TableCell>
                    <TableCell align="right">Annual</TableCell>
                    <TableCell align="right">Monthly</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[{ strLabel: "Declared Flexi", decAnnual: decDeclaredAnnual }, { strLabel: "Residual Taxable Balance", decAnnual: decResidualAnnual }].map((objRow) => (
                    <TableRow key={objRow.strLabel}>
                      <TableCell>{objRow.strLabel}</TableCell>
                      <TableCell align="right">{formatCurrency(objRow.decAnnual, strCurrencyCode)}</TableCell>
                      <TableCell align="right">{formatCurrency(objRow.decAnnual / 12, strCurrencyCode)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ p: 1, borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.72rem" }}>
                This is an estimate. Final payroll impact will be based on approved declaration and payroll processing.
              </Typography>
            </Box>
          </Paper>
        </Box>

        <Paper sx={{ p: 1.2, borderRadius: "12px" }}>
          <Stack spacing={1}>
            <Typography sx={{ fontWeight: 800 }}>{t("flexi_pay_declaration_reviewer_remarks", "Reviewer Remarks")}</Typography>
            <TextField multiline minRows={3} value={strRemarks} onChange={(e) => setStrRemarks(e.target.value)} disabled={!blnCanEditRemarks || blnSaving} />
            {blnShowWorkflowActions ? (
              <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
                <Button variant="outlined" color="warning" disabled={!blnCanReturnCurrent || blnSaving} onClick={() => setStrRejectMode("return")}>
                  {t("flexi_pay_declaration_return", "Return")}
                </Button>
                <Button variant="outlined" color="error" disabled={!blnCanRejectCurrent || blnSaving} onClick={() => setStrRejectMode("reject")}>
                  {t("flexi_pay_declaration_reject", "Reject")}
                </Button>
                {blnCanReleaseCurrent ? <Button variant="outlined" color="info" disabled={blnSaving} onClick={() => void handleRelease()}>{t("flexi_pay_declaration_release", "Release")}</Button> : null}
                {blnCanLockCurrent ? <Button variant="outlined" color="success" disabled={blnSaving} onClick={() => void handleLock()}>{t("flexi_pay_declaration_lock", "Lock")}</Button> : null}
                <Button variant="contained" disabled={!blnCanApproveCurrent || blnSaving || blnOverBasket} onClick={() => void handleApprove()}>
                  {t("flexi_pay_declaration_approve", "Approve")}
                </Button>
              </Stack>
            ) : null}
          </Stack>
        </Paper>
      </Stack>

      <Dialog open={Boolean(strRejectMode)} onClose={() => setStrRejectMode(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{strRejectMode === "return" ? t("flexi_pay_declaration_return_dialog_title", "Return Declaration") : t("flexi_pay_declaration_reject_dialog_title", "Reject Declaration")}</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>{t("flexi_pay_declaration_reviewer_remarks_hint", "Reviewer remarks will be saved on the declaration.")}</Typography>
          <TextField fullWidth multiline minRows={3} value={strRemarks} onChange={(e) => setStrRemarks(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStrRejectMode(null)}>{t("flexi_pay_declaration_cancel", "Cancel")}</Button>
          <Button variant="contained" onClick={() => void handleDecision()} disabled={blnSaving || !strRemarks.trim()}>
            {t("flexi_pay_declaration_confirm", "Confirm")}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(strToast)} autoHideDuration={2400} onClose={() => setStrToast("")} message={strToast} />
    </Box>
  );
}
