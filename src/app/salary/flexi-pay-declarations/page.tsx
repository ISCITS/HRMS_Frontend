"use client";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import styles from "@/components/master/MasterScreen.module.css";
import { flexiPayDeclarationService } from "@/features/flexi-pay-declaration/services/flexiPayDeclarationService";
import type { EmployeeSalarySummaryRecord } from "@/features/employee-salary/types";
import { authApiService } from "@/services/auth/AuthApiService";

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

export default function SalaryFlexiPayDeclarationsRoute() {
  const objRouter = useRouter();
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [objSummary, setObjSummary] = useState<EmployeeSalarySummaryRecord | null>(null);

  useEffect(() => {
    let blnMounted = true;
    async function loadSummary() {
      setBlnLoading(true);
      setStrError("");
      try {
        const objCurrentUserResult = await authApiService.getCurrentUser();
        const intEmployeeID = objCurrentUserResult.Data.objUser.intEmployeeID ?? null;
        if (!intEmployeeID) {
          throw new Error("Current login is not linked to an employee record.");
        }
        const objSalaryDetail = await flexiPayDeclarationService.getSummary(intEmployeeID);
        if (!blnMounted) return;
        setObjSummary(objSalaryDetail);
      } catch (objError) {
        if (!blnMounted) return;
        setStrError(objError instanceof Error ? objError.message : "Unable to load Flexi Pay Declaration.");
      } finally {
        if (blnMounted) setBlnLoading(false);
      }
    }

    void loadSummary();
    return () => { blnMounted = false; };
  }, []);

  const strCurrencyCode = objSummary?.objAssignedStructure?.strCurrencyCode || "INR";
  const decBasket = objSummary?.objCurrentSalarySnapshot?.decFlexiBasketAnnualAmount || 0;
  const decAllocated = objSummary?.objCurrentSalarySnapshot?.decFlexiAllocatedAnnualAmount || 0;
  const decBalance = objSummary?.objCurrentSalarySnapshot?.decFlexiBalanceAnnualAmount || 0;
  const blnHasFlexi = decBasket > 0;

  const strEmployeeLabel = useMemo(() => {
    if (!objSummary) return "Employee";
    const objEmployee = objSummary.objEmployeeSummary;
    return `${objEmployee.strEmployeeName || "Employee"}${objEmployee.strEmployeeCode ? ` (${objEmployee.strEmployeeCode})` : ""}`;
  }, [objSummary]);

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
        <Typography sx={{ fontWeight: 800, fontSize: "1.08rem", color: "#f8fcff" }}>Flexi Pay Declaration</Typography>
        <Typography sx={{ color: "rgba(239,252,255,0.92)", fontSize: "0.82rem" }}>Current employee declaration entry point</Typography>
      </Paper>

      {strError ? <Alert severity="error">{strError}</Alert> : null}

      <Paper className={styles.controlsCard} sx={{ p: 2.25, borderRadius: "16px", border: "1px solid #dbe3ef" }}>
        <Stack spacing={1.5}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1.02rem" }}>{strEmployeeLabel}</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.84rem" }}>
              Financial year {getCurrentFinancialYearCode()} flexi declaration with live salary impact preview
            </Typography>
          </Box>
          {!objSummary?.objAssignedStructure ? (
            <Alert severity="info">
              No active salary structure is assigned to this employee, so flexi declaration cannot be opened.
            </Alert>
          ) : null}
          {!blnHasFlexi ? (
            <Alert severity="info" icon={<InfoOutlinedIcon fontSize="inherit" />}>
              No flexi pay is configured in your salary structure. The declaration screen will open in view mode with add and edit disabled.
            </Alert>
          ) : null}
          <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" } }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "14px" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>Flexi Basket Available</Typography>
              <Typography sx={{ fontWeight: 800 }}>{formatCurrency(decBasket, strCurrencyCode)}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "14px" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>Allocated Flexi</Typography>
              <Typography sx={{ fontWeight: 800 }}>{formatCurrency(decAllocated, strCurrencyCode)}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "14px" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>Balance Amount</Typography>
              <Typography sx={{ fontWeight: 800 }}>{formatCurrency(decBalance, strCurrencyCode)}</Typography>
            </Paper>
          </Box>
          <Stack direction="row" justifyContent="flex-end">
            <Button
              variant="contained"
              endIcon={<ArrowForwardRoundedIcon />}
              onClick={() => objRouter.push("/salary/flexi-pay-declaration")}
            >
              {blnHasFlexi ? "Open Declaration" : "View Declaration"}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
