"use client";

import { Alert, Box, Button, Chip, CircularProgress, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
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

  const lstTableRows = useMemo(
    () =>
      lstRows.map((objRow) => ({
        id: objRow.intDeclarationID,
        action: (
          <Button
            size="small"
            onClick={() => objRouter.push(`/payroll/flexi-declaration-review/${objRow.intDeclarationID}`)}
            controlId="flexi-declaration-review.row.view.button"
            data-row-key={objRow.intDeclarationID}
          >
            View
          </Button>
        ),
        strEmployeeCode: objRow.strEmployeeCode,
        strEmployeeName: objRow.strEmployeeName,
        strFinancialYearCode: objRow.strFinancialYearCode,
        decDeclaredTotalAnnual: formatCurrency(objRow.decDeclaredTotalAnnual),
        decApprovedTotalAnnual: formatCurrency(objRow.decApprovedTotalAnnual),
        intItemCount: objRow.intItemCount,
        strStatus: <Chip size="small" color={getStatusColor(objRow.strWorkflowStatus)} label={formatStatus(objRow.strWorkflowStatus)} />,
        strStatusSort: objRow.strWorkflowStatus || "",
      })),
    [lstRows, objRouter]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "action", headerName: "Action", align: "center", sortable: false, filterable: false, exportable: false, width: 100 },
      { field: "strEmployeeCode", headerName: "Employee Code", width: 150 },
      { field: "strEmployeeName", headerName: "Employee Name", width: 200 },
      { field: "strFinancialYearCode", headerName: "Financial Year", width: 140 },
      { field: "decDeclaredTotalAnnual", headerName: "Declared Total", align: "right", width: 160 },
      { field: "decApprovedTotalAnnual", headerName: "Approved Total", align: "right", width: 160 },
      { field: "intItemCount", headerName: "Items", align: "right", width: 100 },
      { field: "strStatus", headerName: "Status", filterable: false, width: 150, sortAccessor: (objRow) => String(objRow.strStatusSort) },
    ],
    []
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

      <Paper sx={{ p: 1.2, borderRadius: "12px", border: "1px solid #bfdbfe", background: "linear-gradient(90deg, #1D5D96 0%, #2E73B8 50%, #5A9FD8 100%)" }}>
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

      <Paper className={styles.tableCard} sx={{ mt: "0 !important" }}>
        <CommonTable
          columns={lstTableColumns}
          rows={lstTableRows}
          rowIdField="id"
          showPaginationSummary
          minTableWidth={1140}
          emptyMessage="No declarations found."
          testIdPrefix="flexi-declaration-review.list"
          withPaper={false}
        />
      </Paper>
    </Stack>
  );
}
