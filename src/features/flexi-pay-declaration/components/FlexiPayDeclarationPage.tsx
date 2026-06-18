"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DirectionsCarFilledRoundedIcon from "@mui/icons-material/DirectionsCarFilledRounded";
import EditOffRoundedIcon from "@mui/icons-material/EditOffRounded";
import FamilyRestroomRoundedIcon from "@mui/icons-material/FamilyRestroomRounded";
import LunchDiningRoundedIcon from "@mui/icons-material/LunchDiningRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
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
import { useEffect, useMemo, useState } from "react";

import styles from "@/components/master/MasterScreen.module.css";
import type {
  EmployeeSalaryComponentLine,
  EmployeeSalaryDetailRecord,
  EmployeeSalaryFlexiAllocationLine,
} from "@/features/employee-salary/types";
import { flexiPayDeclarationService } from "@/features/flexi-pay-declaration/services/flexiPayDeclarationService";
import { authApiService } from "@/services/auth/AuthApiService";

type EmployeeContext = {
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  strDepartmentName: string;
  strDesignationName: string;
  strBandName: string;
};

type EligibilityAnswers = {
  blnHasCar: boolean;
  blnMealVoucherRequired: boolean;
  intChildrenCount: number;
  blnHostelApplicable: boolean;
};

type SalaryBreakdownRow = {
  strLabel: string;
  decBeforeAnnual: number;
  decAfterAnnual: number;
};

type FlexiDraftRow = {
  intSalaryComponentID: number;
  strComponentCode: string;
  strComponentName: string;
  decAnnualLimit: number | null;
  decMonthlyLimit: number | null;
  decCurrentAnnual: number;
  decCurrentMonthly: number;
  decDeclaredAnnual: number;
  decDeclaredMonthly: number;
  blnProofRequired: boolean;
  strTaxTreatment: string;
  blnEligible: boolean;
  strEligibilityReason: string;
};

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

function getComponentLabel(strComponentName?: string | null, strComponentCode?: string | null) {
  return strComponentName?.trim() || strComponentCode?.trim() || "Flexi Component";
}

function normalizeText(strValue?: string | null) {
  return String(strValue || "").trim().toLowerCase();
}

function deriveEmployeeContext(objDetail: EmployeeSalaryDetailRecord): EmployeeContext {
  const objSummary = objDetail.objEmployeeSummary;
  return {
    intEmployeeID: objSummary.intEmployeeID,
    strEmployeeCode: objSummary.strEmployeeCode || "-",
    strEmployeeName: objSummary.strEmployeeName || "Employee",
    strDepartmentName: "-",
    strDesignationName: "-",
    strBandName: "-",
  };
}

function deriveEligibility(
  objLine: EmployeeSalaryFlexiAllocationLine,
  objAnswers: EligibilityAnswers,
) {
  const strName = normalizeText(objLine.strComponentName);
  const strCode = normalizeText(objLine.strComponentCode);
  const strLookup = `${strName} ${strCode}`;

  if (strLookup.includes("car fuel") || strLookup.includes("fuel reimbursement") || strLookup.includes("driver") || strLookup.includes("car lease")) {
    return objAnswers.blnHasCar
      ? { blnEligible: true, strEligibilityReason: "Eligible from car ownership." }
      : { blnEligible: false, strEligibilityReason: "Enable only when employee has car." };
  }

  if (strLookup.includes("meal")) {
    return objAnswers.blnMealVoucherRequired
      ? { blnEligible: true, strEligibilityReason: "Meal voucher selected." }
      : { blnEligible: false, strEligibilityReason: "Enable only when meal voucher is opted." };
  }

  if (strLookup.includes("children education")) {
    return objAnswers.intChildrenCount > 0
      ? { blnEligible: true, strEligibilityReason: `Eligible for ${objAnswers.intChildrenCount} child${objAnswers.intChildrenCount > 1 ? "ren" : ""}.` }
      : { blnEligible: false, strEligibilityReason: "Enable only when employee has children." };
  }

  if (strLookup.includes("hostel")) {
    return objAnswers.intChildrenCount > 0 && objAnswers.blnHostelApplicable
      ? { blnEligible: true, strEligibilityReason: "Hostel benefit enabled from dependent declaration." }
      : { blnEligible: false, strEligibilityReason: "Enable only for children with hostel applicability." };
  }

  return { blnEligible: true, strEligibilityReason: "Available from salary structure." };
}

function buildDraftRows(
  objDetail: EmployeeSalaryDetailRecord,
  objAnswers: EligibilityAnswers,
): FlexiDraftRow[] {
  return (objDetail.objFlexiAllocation?.lstAllocationLines || []).map((objLine) => {
    const objEligibility = deriveEligibility(objLine, objAnswers);
    const decCurrentAnnual = Number(objLine.decAllocationAnnual || 0);
    const decCurrentMonthly = Number(objLine.decAllocationMonthly || (decCurrentAnnual / 12) || 0);
    const decAnnualLimit = objLine.decAnnualLimit ?? null;
    const decMonthlyLimit = objLine.decMonthlyLimit ?? null;
    const decDeclaredAnnual = objEligibility.blnEligible ? decCurrentAnnual : 0;
    const decDeclaredMonthly = objEligibility.blnEligible ? decCurrentMonthly : 0;

    return {
      intSalaryComponentID: objLine.intSalaryComponentID,
      strComponentCode: String(objLine.strComponentCode || ""),
      strComponentName: getComponentLabel(objLine.strComponentName, objLine.strComponentCode),
      decAnnualLimit,
      decMonthlyLimit,
      decCurrentAnnual,
      decCurrentMonthly,
      decDeclaredAnnual,
      decDeclaredMonthly,
      blnProofRequired: Boolean(objLine.blnProofRequired),
      strTaxTreatment: objLine.strTaxTreatment || "as per payroll rule",
      blnEligible: objEligibility.blnEligible,
      strEligibilityReason: objEligibility.strEligibilityReason,
    };
  });
}

function mapCurrentComponentAmounts(lstComponents: EmployeeSalaryComponentLine[]) {
  const dicBase = {
    basic: 0,
    hra: 0,
    special: 0,
    fixed: 0,
    flexi: 0,
  };

  for (const objLine of lstComponents) {
    const decAnnualAmount = Number(objLine.decAmountAnnual || 0);
    const strName = normalizeText(objLine.strComponentName);
    const strCode = normalizeText(objLine.strComponentCode);
    const blnFlexiLine = Boolean(objLine.blnIsFlexiBenefit);

    if (blnFlexiLine) {
      dicBase.flexi += decAnnualAmount;
      continue;
    }
    if (strName.includes("basic") || strCode === "basic") {
      dicBase.basic += decAnnualAmount;
      continue;
    }
    if (strName.includes("house rent") || strName === "hra" || strCode === "hra") {
      dicBase.hra += decAnnualAmount;
      continue;
    }
    if (strName.includes("special") || strName.includes("compensatory") || strCode.includes("special")) {
      dicBase.special += decAnnualAmount;
      continue;
    }
    dicBase.fixed += decAnnualAmount;
  }

  return dicBase;
}

function toAnnualInputValue(strValue: string) {
  const decValue = Number(strValue);
  return Number.isFinite(decValue) && decValue >= 0 ? decValue : 0;
}

export default function FlexiPayDeclarationPage() {
  const objRouter = useRouter();
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [objDetail, setObjDetail] = useState<EmployeeSalaryDetailRecord | null>(null);
  const [objEmployeeContext, setObjEmployeeContext] = useState<EmployeeContext | null>(null);
  const [objAnswers, setObjAnswers] = useState<EligibilityAnswers>({
    blnHasCar: false,
    blnMealVoucherRequired: true,
    intChildrenCount: 1,
    blnHostelApplicable: false,
  });
  const [dicDraftInputs, setDicDraftInputs] = useState<Record<number, string>>({});
  const [strToast, setStrToast] = useState("");

  useEffect(() => {
    let blnMounted = true;

    async function loadScreen() {
      setBlnLoading(true);
      setStrError("");
      try {
        const objCurrentUserResult = await authApiService.getCurrentUser();
        const intEmployeeID = objCurrentUserResult.Data.objUser.intEmployeeID ?? null;
        if (!intEmployeeID) {
          throw new Error("Current login is not linked to an employee record.");
        }

        const objSalaryDetail = await flexiPayDeclarationService.getDetail(intEmployeeID);
        if (!blnMounted) return;

        setObjDetail(objSalaryDetail);
        setObjEmployeeContext(deriveEmployeeContext(objSalaryDetail));
        const dicInitialInputs = buildDraftRows(objSalaryDetail, objAnswers).reduce<Record<number, string>>((dicAcc, objRow) => {
          dicAcc[objRow.intSalaryComponentID] = objRow.decDeclaredAnnual > 0 ? String(objRow.decDeclaredAnnual) : "";
          return dicAcc;
        }, {});
        setDicDraftInputs(dicInitialInputs);
      } catch (objError) {
        if (!blnMounted) return;
        setStrError(objError instanceof Error ? objError.message : "Unable to load Flexi Pay Declaration.");
      } finally {
        if (blnMounted) {
          setBlnLoading(false);
        }
      }
    }

    void loadScreen();
    return () => {
      blnMounted = false;
    };
  }, []);

  const blnHasAssignedStructure = Boolean(objDetail?.objAssignedStructure);
  const blnHasFlexiBasket = Boolean(objDetail?.objFlexiAllocation?.blnHasFlexiBasket);
  const strCurrencyCode = objDetail?.objAssignedStructure?.strCurrencyCode || "INR";

  const lstDraftRows = useMemo(() => {
    if (!objDetail) return [];
    return buildDraftRows(objDetail, objAnswers).map((objRow) => {
      const strDraftValue = dicDraftInputs[objRow.intSalaryComponentID] ?? "";
      const decDeclaredAnnual = objRow.blnEligible ? toAnnualInputValue(strDraftValue) : 0;
      const decAnnualCap = objRow.decAnnualLimit ?? Number.POSITIVE_INFINITY;
      const decSanitizedAnnual = Math.min(decDeclaredAnnual, decAnnualCap);
      return {
        ...objRow,
        decDeclaredAnnual: decSanitizedAnnual,
        decDeclaredMonthly: decSanitizedAnnual / 12,
      };
    });
  }, [objDetail, objAnswers, dicDraftInputs]);

  const decFlexiBasketAnnual = Number(objDetail?.objFlexiAllocation?.decFlexiBasketAvailableAnnual || 0);
  const decDeclaredFlexiAnnual = useMemo(
    () => lstDraftRows.reduce((decTotal, objRow) => decTotal + objRow.decDeclaredAnnual, 0),
    [lstDraftRows]
  );
  const decRemainingAnnual = Math.max(decFlexiBasketAnnual - decDeclaredFlexiAnnual, 0);
  const decResidualAnnual = decRemainingAnnual;

  const dicComponentSummary = useMemo(
    () => mapCurrentComponentAmounts(objDetail?.lstComponentLines || []),
    [objDetail?.lstComponentLines]
  );

  const lstSalaryBreakdown = useMemo<SalaryBreakdownRow[]>(() => ([
    { strLabel: "Basic", decBeforeAnnual: dicComponentSummary.basic, decAfterAnnual: dicComponentSummary.basic },
    { strLabel: "HRA", decBeforeAnnual: dicComponentSummary.hra, decAfterAnnual: dicComponentSummary.hra },
    { strLabel: "Special / Other Fixed", decBeforeAnnual: dicComponentSummary.special + dicComponentSummary.fixed, decAfterAnnual: dicComponentSummary.special + dicComponentSummary.fixed - decDeclaredFlexiAnnual },
    { strLabel: "Declared Flexi", decBeforeAnnual: dicComponentSummary.flexi, decAfterAnnual: decDeclaredFlexiAnnual },
    { strLabel: "Residual Taxable Allowance", decBeforeAnnual: Number(objDetail?.objFlexiAllocation?.decResidualTaxableAllowanceAnnual || 0), decAfterAnnual: decResidualAnnual },
  ]), [dicComponentSummary, decDeclaredFlexiAnnual, decResidualAnnual, objDetail?.objFlexiAllocation?.decResidualTaxableAllowanceAnnual]);

  const blnAllocationExceeded = decDeclaredFlexiAnnual > decFlexiBasketAnnual;

  if (blnLoading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "48vh" }}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  if (strError) {
    return <Alert severity="error">{strError}</Alert>;
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
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1.08rem", color: "#f8fcff" }}>Flexi Pay Declaration</Typography>
            <Typography sx={{ color: "rgba(239,252,255,0.92)", fontSize: "0.82rem" }}>
              Eligibility-based declaration with live salary impact
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`FY ${getCurrentFinancialYearCode()}`} sx={{ bgcolor: "rgba(255,255,255,0.16)", color: "#fff", fontWeight: 700 }} />
            <Chip label={blnHasFlexiBasket ? "Draft" : "View Only"} sx={{ bgcolor: blnHasFlexiBasket ? "#fef3c7" : "#e2e8f0", color: "#0f172a", fontWeight: 800 }} />
          </Stack>
        </Stack>
      </Paper>

      {!blnHasAssignedStructure ? (
        <Alert severity="info">
          No active salary structure is assigned to this employee. Flexi pay declaration cannot be created or edited until salary assignment is available.
        </Alert>
      ) : null}

      {!blnHasFlexiBasket ? (
        <Alert severity="info" icon={<EditOffRoundedIcon fontSize="inherit" />}>
          No flexi pay is configured in your salary structure. You can view your salary breakdown, but add or edit is not available.
        </Alert>
      ) : null}

      {blnAllocationExceeded ? (
        <Alert severity="error">
          Declared flexi amount exceeds the available flexi basket. Reduce component declarations before submit.
        </Alert>
      ) : null}

      <Paper className={styles.controlsCard} sx={{ p: 2, borderRadius: "16px", border: "1px solid #dbe3ef" }}>
        <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" } }}>
          <Box><Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>Employee</Typography><Typography sx={{ fontWeight: 800 }}>{objEmployeeContext?.strEmployeeName || "Employee"}</Typography><Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>{objEmployeeContext?.strEmployeeCode || "-"}</Typography></Box>
          <Box><Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>Salary Structure</Typography><Typography sx={{ fontWeight: 800 }}>{objDetail?.objAssignedStructure?.strStructureName || "Not assigned"}</Typography><Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>{objDetail?.objAssignedStructure?.strStructureCode || "-"}</Typography></Box>
          <Box><Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>Effective From</Typography><Typography sx={{ fontWeight: 800 }}>{formatDate(objDetail?.objCurrentSalarySnapshot?.dtEffectiveFrom || null)}</Typography></Box>
          <Box><Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>Residual Component</Typography><Typography sx={{ fontWeight: 800 }}>{objDetail?.objFlexiAllocation?.strResidualComponentName || "Auto calculated"}</Typography></Box>
        </Box>
      </Paper>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", xl: "1.8fr 0.95fr" } }}>
        <Stack spacing={2}>
          <Paper className={styles.controlsCard} sx={{ p: 2, borderRadius: "16px", border: "1px solid #dbe3ef" }}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.4 }}>Eligibility Conditions</Typography>
            <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
              <Paper variant="outlined" sx={{ p: 1.35, borderRadius: "14px", borderColor: "#dbe3ef" }}>
                <Stack direction="row" spacing={1.2} alignItems="center" justifyContent="space-between">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <DirectionsCarFilledRoundedIcon sx={{ color: "#0f4c81" }} />
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>Employee has car</Typography>
                      <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>Enables car fuel, driver salary, lease-linked flexi</Typography>
                    </Box>
                  </Stack>
                  <Switch checked={objAnswers.blnHasCar} disabled={!blnHasAssignedStructure || !blnHasFlexiBasket} onChange={(e) => setObjAnswers((d) => ({ ...d, blnHasCar: e.target.checked }))} />
                </Stack>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.35, borderRadius: "14px", borderColor: "#dbe3ef" }}>
                <Stack direction="row" spacing={1.2} alignItems="center" justifyContent="space-between">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <LunchDiningRoundedIcon sx={{ color: "#0f4c81" }} />
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>Meal voucher required</Typography>
                      <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>Controls meal voucher component availability</Typography>
                    </Box>
                  </Stack>
                  <Switch checked={objAnswers.blnMealVoucherRequired} disabled={!blnHasAssignedStructure || !blnHasFlexiBasket} onChange={(e) => setObjAnswers((d) => ({ ...d, blnMealVoucherRequired: e.target.checked }))} />
                </Stack>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.35, borderRadius: "14px", borderColor: "#dbe3ef" }}>
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <FamilyRestroomRoundedIcon sx={{ color: "#0f4c81" }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, mb: 0.75 }}>Dependent children count</Typography>
                    <TextField
                      select
                      size="small"
                      fullWidth
                      value={String(objAnswers.intChildrenCount)}
                      disabled={!blnHasAssignedStructure || !blnHasFlexiBasket}
                      onChange={(e) => setObjAnswers((d) => ({ ...d, intChildrenCount: Number(e.target.value) }))}
                    >
                      {[0, 1, 2, 3, 4].map((intCount) => <MenuItem key={intCount} value={String(intCount)}>{intCount}</MenuItem>)}
                    </TextField>
                  </Box>
                </Stack>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.35, borderRadius: "14px", borderColor: "#dbe3ef" }}>
                <FormControlLabel
                  control={<Switch checked={objAnswers.blnHostelApplicable} disabled={!blnHasAssignedStructure || !blnHasFlexiBasket || objAnswers.intChildrenCount === 0} onChange={(e) => setObjAnswers((d) => ({ ...d, blnHostelApplicable: e.target.checked }))} />}
                  label={(
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>Hostel applicable</Typography>
                      <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>Enables hostel allowance only for eligible dependent cases</Typography>
                    </Box>
                  )}
                />
              </Paper>
            </Box>
          </Paper>

          <Paper className={styles.tableCard} sx={{ borderRadius: "16px", overflow: "hidden" }}>
            <Box sx={{ p: 1.5, borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
              <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>Eligible Flexi Components</Typography>
              <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>
                Component eligibility changes from employee answers and salary structure configuration.
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Component</TableCell>
                    <TableCell>Eligibility</TableCell>
                    <TableCell align="right">Annual Limit</TableCell>
                    <TableCell align="right">Declared Annual</TableCell>
                    <TableCell align="right">Monthly Impact</TableCell>
                    <TableCell>Proof</TableCell>
                    <TableCell>Payroll Treatment</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lstDraftRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 4, textAlign: "center", color: "#64748b" }}>
                        No flexi components are available for this employee.
                      </TableCell>
                    </TableRow>
                  ) : lstDraftRows.map((objRow) => {
                    const blnDisabled = !blnHasAssignedStructure || !blnHasFlexiBasket || !objRow.blnEligible;
                    return (
                      <TableRow key={objRow.intSalaryComponentID} sx={{ opacity: blnDisabled ? 0.62 : 1 }}>
                        <TableCell>
                          <Typography sx={{ fontWeight: 700 }}>{objRow.strComponentName}</Typography>
                          <Typography sx={{ color: "#64748b", fontSize: "0.75rem" }}>{objRow.strEligibilityReason}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={objRow.blnEligible ? "Eligible" : "Locked"} color={objRow.blnEligible ? "success" : "default"} />
                        </TableCell>
                        <TableCell align="right">{formatCurrency(objRow.decAnnualLimit, strCurrencyCode)}</TableCell>
                        <TableCell align="right" sx={{ minWidth: 170 }}>
                          <TextField
                            size="small"
                            type="number"
                            value={dicDraftInputs[objRow.intSalaryComponentID] ?? ""}
                            disabled={blnDisabled}
                            onChange={(e) => setDicDraftInputs((dicPrev) => ({ ...dicPrev, [objRow.intSalaryComponentID]: e.target.value }))}
                            inputProps={{ min: 0, max: objRow.decAnnualLimit ?? undefined }}
                            sx={{ width: 130 }}
                          />
                        </TableCell>
                        <TableCell align="right">{formatCurrency(objRow.decDeclaredMonthly, strCurrencyCode)}</TableCell>
                        <TableCell>{objRow.blnProofRequired ? "Required" : "No"}</TableCell>
                        <TableCell sx={{ textTransform: "capitalize" }}>{objRow.strTaxTreatment}</TableCell>
                        <TableCell>
                          {objRow.decDeclaredAnnual > 0 ? (
                            <Chip size="small" icon={<CheckCircleRoundedIcon />} label="Ready" color="success" />
                          ) : (
                            <Chip size="small" label={objRow.blnEligible ? "Pending" : "Blocked"} />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" } }}>
            <Paper className={styles.tableCard} sx={{ borderRadius: "16px", overflow: "hidden" }}>
              <Box sx={{ p: 1.5, borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <Typography sx={{ fontWeight: 800 }}>Fixed Salary Components</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Component</TableCell>
                      <TableCell align="right">Annual</TableCell>
                      <TableCell align="right">Monthly</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lstSalaryBreakdown.slice(0, 3).map((objRow) => (
                      <TableRow key={objRow.strLabel}>
                        <TableCell>{objRow.strLabel}</TableCell>
                        <TableCell align="right">{formatCurrency(objRow.decBeforeAnnual, strCurrencyCode)}</TableCell>
                        <TableCell align="right">{formatCurrency(objRow.decBeforeAnnual / 12, strCurrencyCode)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            <Paper className={styles.tableCard} sx={{ borderRadius: "16px", overflow: "hidden" }}>
              <Box sx={{ p: 1.5, borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <Typography sx={{ fontWeight: 800 }}>Post Declaration Salary Split</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Bucket</TableCell>
                      <TableCell align="right">Annual</TableCell>
                      <TableCell align="right">Monthly</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lstSalaryBreakdown.map((objRow) => (
                      <TableRow key={objRow.strLabel}>
                        <TableCell>{objRow.strLabel}</TableCell>
                        <TableCell align="right">{formatCurrency(objRow.decAfterAnnual, strCurrencyCode)}</TableCell>
                        <TableCell align="right">{formatCurrency(objRow.decAfterAnnual / 12, strCurrencyCode)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>

          <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
            <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/salary/flexi-pay-declarations")}>Back</Button>
            <Button variant="outlined" startIcon={<ContentCopyRoundedIcon />} disabled={!blnHasAssignedStructure || !blnHasFlexiBasket} onClick={() => setStrToast("Previous year copy flow is not available yet for flexi declarations.")}>Copy Previous Year</Button>
            <Button variant="contained" startIcon={<SaveRoundedIcon />} disabled={!blnHasAssignedStructure || !blnHasFlexiBasket || blnAllocationExceeded} onClick={() => setStrToast("Declaration save is temporarily disabled until final persistence rules are confirmed.")}>Save Draft</Button>
            <Button variant="contained" color="warning" startIcon={<SendRoundedIcon />} disabled={!blnHasAssignedStructure || !blnHasFlexiBasket || blnAllocationExceeded} onClick={() => setStrToast("Declaration submit is temporarily disabled until final persistence rules are confirmed.")}>Submit</Button>
          </Stack>
        </Stack>

        <Stack spacing={2}>
          <Paper className={styles.controlsCard} sx={{ p: 2, borderRadius: "16px", border: "1px solid #dbe3ef", position: { xl: "sticky" }, top: { xl: 78 } }}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.25 }}>Salary Breakdown Impact</Typography>
            <Stack spacing={1.1}>
              <Box><Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>CTC Annual</Typography><Typography sx={{ fontWeight: 800 }}>{formatCurrency(objDetail?.objCurrentSalarySnapshot?.decCtcAnnual || 0, strCurrencyCode)}</Typography></Box>
              <Box><Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>Gross Monthly</Typography><Typography sx={{ fontWeight: 800 }}>{formatCurrency(objDetail?.objCurrentSalarySnapshot?.decGrossMonthly || 0, strCurrencyCode)}</Typography></Box>
              <Divider />
              <Box><Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>Flexi Basket Available</Typography><Typography sx={{ fontWeight: 800 }}>{formatCurrency(decFlexiBasketAnnual, strCurrencyCode)}</Typography></Box>
              <Box><Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>Declared Flexi</Typography><Typography sx={{ fontWeight: 800, color: "#0f766e" }}>{formatCurrency(decDeclaredFlexiAnnual, strCurrencyCode)}</Typography></Box>
              <Box><Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>Remaining Balance</Typography><Typography sx={{ fontWeight: 800, color: decRemainingAnnual === 0 ? "#b45309" : "#0f172a" }}>{formatCurrency(decRemainingAnnual, strCurrencyCode)}</Typography></Box>
              <Box><Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>Residual Taxable Allowance</Typography><Typography sx={{ fontWeight: 800 }}>{formatCurrency(decResidualAnnual, strCurrencyCode)}</Typography></Box>
              <Box><Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>Net Payroll Impact / Month</Typography><Typography sx={{ fontWeight: 800 }}>{formatCurrency(decDeclaredFlexiAnnual / 12, strCurrencyCode)}</Typography></Box>
            </Stack>
            <Alert severity="info" sx={{ mt: 1.5 }}>
              Salary breakdown remains visible for all employees. Edit actions are available only when flexi basket is configured in the salary structure.
            </Alert>
          </Paper>
        </Stack>
      </Box>

      <Snackbar open={Boolean(strToast)} autoHideDuration={3200} onClose={() => setStrToast("")} message={strToast} />
    </Box>
  );
}
