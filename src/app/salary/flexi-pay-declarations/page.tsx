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
import { useEffect, useState } from "react";

import styles from "@/components/master/MasterScreen.module.css";
import {
  flexiPayDeclarationService,
  type FlexiDeclarationContextRecord,
  type FlexiDeclarationHistoryRecord,
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

export default function SalaryFlexiPayDeclarationsRoute() {
  const objRouter = useRouter();
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [objContext, setObjContext] = useState<FlexiDeclarationContextRecord | null>(null);
  const [lstHistory, setLstHistory] = useState<FlexiDeclarationHistoryRecord[]>([]);

  useEffect(() => {
    let blnMounted = true;
    async function loadData() {
      setBlnLoading(true);
      setStrError("");
      try {
        const strFinancialYearCode = getCurrentFinancialYearCode();
        const [objDeclarationContext, lstHistoryRows] = await Promise.all([
          flexiPayDeclarationService.getCurrentDeclaration(strFinancialYearCode),
          flexiPayDeclarationService.getHistory(),
        ]);
        if (!blnMounted) return;
        setObjContext(objDeclarationContext);
        setLstHistory(lstHistoryRows || []);
      } catch (objError) {
        if (!blnMounted) return;
        setStrError(objError instanceof Error ? objError.message : "Unable to load Flexi Pay Declaration.");
      } finally {
        if (blnMounted) setBlnLoading(false);
      }
    }

    void loadData();
    return () => {
      blnMounted = false;
    };
  }, []);

  if (blnLoading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "48vh" }}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  const strCurrencyCode = objContext?.objAssignedStructure?.strCurrencyCode || "INR";
  const decBasket = Number(objContext?.objFlexiAllocation?.decFlexiBasketAvailableAnnual || 0);
  const decDeclared = (objContext?.lstDeclarationLines || []).reduce(
    (decTotal, objRow) => decTotal + Number(objRow.decDraftDeclaredAnnual ?? objRow.decAllocationAnnual ?? 0),
    0,
  );
  const decBalance = Math.max(decBasket - decDeclared, 0);
  const blnHasFlexi = Boolean(objContext?.blnCanDeclare);
  const objCurrentDeclaration = objContext?.objDeclaration;

  return (
    <Stack spacing={0.8} className={styles.page}>
      <Box sx={{ borderRadius: "12px", border: "1px solid rgba(37, 99, 235, 0.2)", overflow: "hidden" }}>
        <Box sx={{ p: 1.1, background: "linear-gradient(100deg, #0f4b8b 0%, #0d6ca1 64%, #0d7f9c 100%)" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, gap: 1, flexWrap: "wrap" }}>
            <Box>
              <Typography sx={{ color: "#f8fcff", fontWeight: 800, fontSize: "1rem", lineHeight: 1.2 }}>Flexi Pay Declaration</Typography>
              <Typography sx={{ color: "rgba(239,252,255,0.92)", fontSize: "0.76rem" }}>Current employee declaration workflow</Typography>
            </Box>
            <Box sx={{ border: "1px solid rgba(255,255,255,0.45)", borderRadius: "8px", px: 1, py: 0.55, minWidth: 104, backgroundColor: "rgba(8,47,73,0.28)" }}>
              <Typography sx={{ color: "rgba(226,232,240,0.95)", fontSize: "0.72rem", lineHeight: 1 }}>History</Typography>
              <Typography sx={{ color: "#ffffff", fontWeight: 800, fontSize: "0.9rem", lineHeight: 1.2, mt: 0.2 }}>{lstHistory.length}</Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {!blnHasFlexi ? (
        <Alert severity="info" icon={<InfoOutlinedIcon fontSize="inherit" />}>
          {objContext?.strIneligibilityReason || "No flexi pay is configured for the current salary structure."}
        </Alert>
      ) : null}

      <Paper className={styles.controlsCard} sx={{ p: 2.25, borderRadius: "16px", border: "1px solid #dbe3ef" }}>
        <Stack spacing={1.5}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1.02rem" }}>
              {objContext?.objEmployeeSummary?.strEmployeeName || "Employee"}
              {objContext?.objEmployeeSummary?.strEmployeeCode ? ` (${objContext.objEmployeeSummary.strEmployeeCode})` : ""}
            </Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.84rem" }}>
              Financial year {getCurrentFinancialYearCode()} flexi declaration workflow
            </Typography>
          </Box>
          <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" } }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "14px" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>Current Status</Typography>
              <Typography sx={{ fontWeight: 800 }}>{formatStatus(objCurrentDeclaration?.strWorkflowStatus)}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "14px" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>Flexi Basket</Typography>
              <Typography sx={{ fontWeight: 800 }}>{formatCurrency(decBasket, strCurrencyCode)}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "14px" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>Declared / Draft Total</Typography>
              <Typography sx={{ fontWeight: 800 }}>{formatCurrency(decDeclared, strCurrencyCode)}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "14px" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>Residual Balance</Typography>
              <Typography sx={{ fontWeight: 800 }}>{formatCurrency(decBalance, strCurrencyCode)}</Typography>
            </Paper>
          </Box>
          <Stack direction="row" justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} flexWrap="wrap" useFlexGap>
            <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>
              History records: {lstHistory.length}
            </Typography>
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
    </Stack>
  );
}
