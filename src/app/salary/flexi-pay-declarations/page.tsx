"use client";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import styles from "@/components/master/MasterScreen.module.css";
import {
  flexiPayDeclarationService,
  type FlexiDeclarationSummaryRecord,
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

function formatStatus(strStatus?: string | null) {
  return String(strStatus || "draft")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (strChar) => strChar.toUpperCase());
}

function getStatusColor(strStatus?: string | null): "default" | "warning" | "success" | "error" {
  const strValue = String(strStatus || "").toLowerCase();
  if (["approved", "locked"].includes(strValue)) return "success";
  if (strValue === "submitted") return "warning";
  if (["returned", "rejected", "cancelled"].includes(strValue)) return "error";
  return "default";
}

export default function SalaryFlexiPayDeclarationsRoute() {
  const objRouter = useRouter();
  const strCurrentFinancialYearCode = getCurrentFinancialYearCode();
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [objSummary, setObjSummary] = useState<FlexiDeclarationSummaryRecord | null>(null);

  useEffect(() => {
    let blnMounted = true;
    async function loadData() {
      setBlnLoading(true);
      setStrError("");
      try {
        const objData = await flexiPayDeclarationService.getCurrentSummary(strCurrentFinancialYearCode);
        if (!blnMounted) return;
        setObjSummary(objData);
      } catch (objError) {
        if (!blnMounted) return;
        setStrError(objError instanceof Error ? objError.message : "Unable to load Flexi Pay Declaration.");
        setObjSummary(null);
      } finally {
        if (blnMounted) setBlnLoading(false);
      }
    }

    void loadData();
    return () => {
      blnMounted = false;
    };
  }, [strCurrentFinancialYearCode]);

  const objListRow = useMemo(() => {
    const strCurrencyCode = objSummary?.objAssignedStructure?.strCurrencyCode || "INR";
    const decBasket = Number(objSummary?.objFlexiAllocation?.decFlexiBasketAvailableAnnual || 0);
    const decDeclared = Number(objSummary?.decDeclaredFlexiAnnual || 0);
    const decResidual = Number(
      objSummary?.decResidualTaxableBalanceAnnual
      ?? objSummary?.objFlexiAllocation?.decResidualTaxableAllowanceAnnual
      ?? 0,
    );
    return {
      strCurrencyCode,
      strEmployeeCode: objSummary?.objEmployeeSummary?.strEmployeeCode || "-",
      strEmployeeName: objSummary?.objEmployeeSummary?.strEmployeeName || "Employee",
      strFinancialYearCode: objSummary?.strFinancialYearCode || strCurrentFinancialYearCode,
      strStatus: objSummary?.objDeclaration?.strWorkflowStatus || "draft",
      strStructureName: objSummary?.objAssignedStructure?.strSalaryStructureName || "-",
      decBasket,
      decDeclared,
      decResidual,
      intHistoryCount: Number(objSummary?.intHistoryCount || 0),
      blnCanDeclare: Boolean(objSummary?.blnCanDeclare),
    };
  }, [objSummary, strCurrentFinancialYearCode]);

  if (blnLoading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "48vh" }}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  return (
    <Stack spacing={1} className={styles.page}>
      {strError ? <Alert severity="error">{strError}</Alert> : null}

      <Paper
        sx={{
          p: 1.2,
          borderRadius: "12px",
          border: "1px solid #bfdbfe",
          background: "linear-gradient(100deg, #0f4b8b 0%, #0d6ca1 64%, #0d7f9c 100%)",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography sx={{ color: "#f8fcff", fontWeight: 800, fontSize: "1rem" }}>Flexi Pay Declaration</Typography>
            <Typography sx={{ color: "rgba(239,252,255,0.92)", fontSize: "0.76rem" }}>
              Employee declaration list
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`Financial Year ${objListRow.strFinancialYearCode}`} />
            <Chip size="small" label={`History ${objListRow.intHistoryCount}`} />
            <Chip size="small" color={getStatusColor(objListRow.strStatus)} label={formatStatus(objListRow.strStatus)} />
          </Stack>
        </Stack>
      </Paper>

      {objSummary && !objSummary.blnCanDeclare ? (
        <Alert severity="info" icon={<InfoOutlinedIcon fontSize="inherit" />}>
          {objSummary.strIneligibilityReason || "No flexi pay is configured for the current salary structure."}
        </Alert>
      ) : null}

      <Paper className={styles.tableCard}>
        <Box className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Action</th>
                <th>Employee Code</th>
                <th>Employee Name</th>
                <th>Financial Year</th>
                <th>Assigned Salary Structure</th>
                <th>Current Status</th>
                <th>Flexi Basket Available</th>
                <th>Declared Flexi</th>
                <th>Residual Taxable Balance</th>
                <th>History Count</th>
              </tr>
            </thead>
            <tbody>
              {objSummary ? (
                <tr>
                  <td>
                    <Button
                      size="small"
                      variant="contained"
                      endIcon={<ArrowForwardRoundedIcon />}
                      onClick={() => objRouter.push("/salary/flexi-pay-declaration")}
                    >
                      {objListRow.blnCanDeclare ? "Open" : "View"}
                    </Button>
                  </td>
                  <td>{objListRow.strEmployeeCode}</td>
                  <td>{objListRow.strEmployeeName}</td>
                  <td>{objListRow.strFinancialYearCode}</td>
                  <td>{objListRow.strStructureName}</td>
                  <td>
                    <Chip
                      size="small"
                      color={getStatusColor(objListRow.strStatus)}
                      label={formatStatus(objListRow.strStatus)}
                    />
                  </td>
                  <td>{formatCurrency(objListRow.decBasket, objListRow.strCurrencyCode)}</td>
                  <td>{formatCurrency(objListRow.decDeclared, objListRow.strCurrencyCode)}</td>
                  <td>{formatCurrency(objListRow.decResidual, objListRow.strCurrencyCode)}</td>
                  <td>{objListRow.intHistoryCount}</td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={10} className={styles.emptyState}>
                    Flexi declaration summary is not available right now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Box>
      </Paper>
    </Stack>
  );
}
