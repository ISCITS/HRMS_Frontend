"use client";

import { Alert, Box, Button, Chip, CircularProgress, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import {
  hrFlexiDeclarationReviewService,
  type FlexiDeclarationHistoryRecord,
} from "@/features/flexi-pay-declaration/services/flexiPayDeclarationService";

function formatCurrency(decValue: number | null | undefined) {
  if (decValue == null) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(decValue);
}

function formatStatus(strStatus?: string | null) {
  return String(strStatus || "submitted")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (strChar) => strChar.toUpperCase());
}

function getStatusColor(strStatus?: string | null): "default" | "warning" | "success" | "error" {
  const strValue = String(strStatus || "").toLowerCase();
  if (["approved", "locked"].includes(strValue)) return "success";
  if (strValue === "submitted") return "warning";
  if (["returned", "rejected"].includes(strValue)) return "error";
  if (strValue === "released") return "default";
  return "default";
}

export default function FlexiDeclarationReviewListPage() {
  const objRouter = useRouter();
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [strWorkflowStatus, setStrWorkflowStatus] = useState("submitted");
  const [lstRows, setLstRows] = useState<FlexiDeclarationHistoryRecord[]>([]);

  const loadData = useCallback(async function loadData(strStatus = strWorkflowStatus) {
    setBlnLoading(true);
    setStrError("");
    try {
      const lstData = await hrFlexiDeclarationReviewService.getList(strStatus);
      setLstRows(lstData || []);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load flexi declaration review queue.");
    } finally {
      setBlnLoading(false);
    }
  }, [strWorkflowStatus]);

  useEffect(() => {
    void loadData("submitted");
  }, [loadData]);

  const objSummary = useMemo(
    () =>
      lstRows.reduce<Record<string, number>>((dicAcc, objRow) => {
        const strKey = String(objRow.strWorkflowStatus || "unknown").toLowerCase();
        dicAcc[strKey] = (dicAcc[strKey] || 0) + 1;
        return dicAcc;
      }, {}),
    [lstRows],
  );

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

      <Paper sx={{ p: 1.2, borderRadius: "12px", border: "1px solid #bfdbfe", background: "linear-gradient(100deg, #0f4b8b 0%, #0d6ca1 64%, #0d7f9c 100%)" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography sx={{ color: "#f8fcff", fontWeight: 800, fontSize: "1rem" }}>Flexi Declaration Review</Typography>
            <Typography sx={{ color: "rgba(239,252,255,0.92)", fontSize: "0.76rem" }}>Payroll and HR review queue</Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`Submitted ${objSummary.submitted || 0}`} />
            <Chip size="small" label={`Approved ${objSummary.approved || 0}`} />
            <Chip size="small" label={`Locked ${objSummary.locked || 0}`} />
            <Chip size="small" label={`Released ${objSummary.released || 0}`} />
            <Chip size="small" label={`Returned ${objSummary.returned || 0}`} />
            <Chip size="small" label={`Rejected ${objSummary.rejected || 0}`} />
          </Stack>
        </Stack>
      </Paper>

      <Paper className={styles.controlsCard}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <TextField
            select
            size="small"
            label="Status"
            value={strWorkflowStatus}
            onChange={(e) => setStrWorkflowStatus(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="submitted">Submitted</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="locked">Locked</MenuItem>
            <MenuItem value="released">Released</MenuItem>
            <MenuItem value="returned">Returned</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </TextField>
          <Button variant="contained" onClick={() => void loadData(strWorkflowStatus)}>Search</Button>
        </Stack>
      </Paper>

      <Paper className={styles.tableCard}>
        <Box className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Action</th>
                <th>Employee Code</th>
                <th>Employee Name</th>
                <th>Financial Year</th>
                <th>Declared Total</th>
                <th>Approved Total</th>
                <th>Items</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {lstRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyState}>No declarations found.</td>
                </tr>
              ) : (
                lstRows.map((objRow) => (
                  <tr key={objRow.intDeclarationID}>
                    <td>
                      <Button size="small" onClick={() => objRouter.push(`/payroll/flexi-declaration-review/${objRow.intDeclarationID}`)}>View</Button>
                    </td>
                    <td>{objRow.strEmployeeCode}</td>
                    <td>{objRow.strEmployeeName}</td>
                    <td>{objRow.strFinancialYearCode}</td>
                    <td>{formatCurrency(objRow.decDeclaredTotalAnnual)}</td>
                    <td>{formatCurrency(objRow.decApprovedTotalAnnual)}</td>
                    <td>{objRow.intItemCount}</td>
                    <td>
                      <Chip size="small" color={getStatusColor(objRow.strWorkflowStatus)} label={formatStatus(objRow.strWorkflowStatus)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Box>
      </Paper>
    </Stack>
  );
}
