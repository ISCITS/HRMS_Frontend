"use client";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Pagination,
  Stack,
  TextField,
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

const lstRowsPerPageOptions = [10, 20, 50];

type FlexiDeclarationListRow = {
  strEmployeeLabel: string;
  strFinancialYearCode: string;
  decBasket: number;
  decAllocated: number;
  decBalance: number;
  strStatus: string;
  strActionLabel: string;
};

export default function SalaryFlexiPayDeclarationsRoute() {
  const objRouter = useRouter();
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [objSummary, setObjSummary] = useState<EmployeeSalarySummaryRecord | null>(null);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);

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
  const strFinancialYearCode = getCurrentFinancialYearCode();
  const objDeclaration = objSummary?.objFlexiDeclaration;

  const strEmployeeLabel = useMemo(() => {
    if (!objSummary) return "Employee";
    const objEmployee = objSummary.objEmployeeSummary;
    return `${objEmployee.strEmployeeName || "Employee"}${objEmployee.strEmployeeCode ? ` (${objEmployee.strEmployeeCode})` : ""}`;
  }, [objSummary]);

  const lstRows = useMemo<FlexiDeclarationListRow[]>(() => {
    if (!objSummary) return [];
    return [{
      strEmployeeLabel,
      strFinancialYearCode,
      decBasket,
      decAllocated,
      decBalance,
      strStatus: objDeclaration?.strStatus || (blnHasFlexi ? "Not Started" : "View Only"),
      strActionLabel: !blnHasFlexi || objDeclaration?.blnCanEdit === false ? "View Declaration" : "Open Declaration",
    }];
  }, [blnHasFlexi, decAllocated, decBalance, decBasket, objDeclaration?.blnCanEdit, objDeclaration?.strStatus, objSummary, strEmployeeLabel, strFinancialYearCode]);

  const intPageCount = Math.max(1, Math.ceil(lstRows.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleRows = useMemo(
    () => lstRows.slice(intStartIndex, intStartIndex + intRowsPerPage),
    [intRowsPerPage, intStartIndex, lstRows],
  );

  if (blnLoading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "48vh" }}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  return (
    <Stack spacing={0.8} className={styles.page}>
      <Box sx={{ borderRadius: "12px", border: "1px solid rgba(37, 99, 235, 0.2)", overflow: "hidden" }}>
        <Box sx={{ p: 1.1, background: "linear-gradient(100deg, #0f4b8b 0%, #0d6ca1 64%, #0d7f9c 100%)" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, gap: 1, flexWrap: "wrap" }}>
            <Box>
              <Typography sx={{ color: "#f8fcff", fontWeight: 800, fontSize: "1rem", lineHeight: 1.2 }}>Flexi Pay Declaration</Typography>
              <Typography sx={{ color: "rgba(239,252,255,0.92)", fontSize: "0.76rem" }}>Current employee declaration list</Typography>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, justifyContent: { xs: "flex-start", md: "flex-end" } }}>
              <Box sx={{ border: "1px solid rgba(255,255,255,0.45)", borderRadius: "8px", px: 1, py: 0.55, minWidth: 104, backgroundColor: "rgba(8,47,73,0.28)" }}>
                <Typography sx={{ color: "rgba(226,232,240,0.95)", fontSize: "0.72rem", lineHeight: 1 }}>Records</Typography>
                <Typography sx={{ color: "#ffffff", fontWeight: 800, fontSize: "0.9rem", lineHeight: 1.2, mt: 0.2 }}>{lstRows.length}</Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {strError ? <Alert severity="error">{strError}</Alert> : null}
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

      <Box className={styles.controlsCard} sx={{ mt: 0, mb: 0 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
          <TextField size="small" label="Employee" value={strEmployeeLabel} InputProps={{ readOnly: true }} sx={{ minWidth: { xs: "100%", sm: 260 } }} />
          <TextField select size="small" label="Financial Year" value={strFinancialYearCode} sx={{ minWidth: { xs: "100%", sm: 150 } }}>
            <MenuItem value={strFinancialYearCode}>{strFinancialYearCode}</MenuItem>
          </TextField>
        </Box>
      </Box>

      <Box className={styles.tableCard} sx={{ mt: 0 }}>
        {lstRows.length > 0 ? (
          <Box className={styles.paginationBar} sx={{ p: 0, pb: 1, justifyContent: "flex-end" }}>
            <Box className={styles.paginationInfo}>
              <Typography className={styles.paginationLabel}>Rows per page</Typography>
              <TextField
                select
                size="small"
                value={String(intRowsPerPage)}
                onChange={(objEvent) => {
                  setIntRowsPerPage(Number(objEvent.target.value));
                  setIntPage(1);
                }}
                className={styles.rowsPerPageSelect}
              >
                {lstRowsPerPageOptions.map((intOption) => (
                  <MenuItem key={intOption} value={String(intOption)}>{intOption}</MenuItem>
                ))}
              </TextField>
              <Typography className={styles.paginationRange}>
                {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstRows.length)} of {lstRows.length}
              </Typography>
            </Box>
            <Pagination count={intPageCount} page={intCurrentPage} onChange={(_objEvent, intValue) => setIntPage(intValue)} size="small" color="primary" showFirstButton showLastButton />
          </Box>
        ) : null}

        <Box className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Financial Year</th>
                <th>Flexi Basket</th>
                <th>Allocated Flexi</th>
                <th>Balance Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {lstRows.length === 0 ? (
                <tr>
                  <td className={styles.emptyState} colSpan={7}>No records found.</td>
                </tr>
              ) : (
                lstVisibleRows.map((objRow) => (
                  <tr key={`${objRow.strEmployeeLabel}-${objRow.strFinancialYearCode}`}>
                    <td>{objRow.strEmployeeLabel}</td>
                    <td>{objRow.strFinancialYearCode}</td>
                    <td>{formatCurrency(objRow.decBasket, strCurrencyCode)}</td>
                    <td>{formatCurrency(objRow.decAllocated, strCurrencyCode)}</td>
                    <td>{formatCurrency(objRow.decBalance, strCurrencyCode)}</td>
                    <td>{objRow.strStatus}</td>
                    <td>
                      <Button
                        size="small"
                        endIcon={<ArrowForwardRoundedIcon />}
                        onClick={() => objRouter.push("/salary/flexi-pay-declaration")}
                        sx={{ textTransform: "none", fontWeight: 800 }}
                      >
                        {objRow.strActionLabel}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Box>
      </Box>
    </Stack>
  );
}
