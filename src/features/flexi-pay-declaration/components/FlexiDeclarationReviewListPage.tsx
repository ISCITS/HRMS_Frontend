"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, Chip, Link, MenuItem, Stack, TextField } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { MasterBreadcrumbs, MasterGridSkeleton, dicMasterRowSx, onSearchEnter } from "@/components/master/MasterListUi";
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

  function openDeclaration(intDeclarationID: number) {
    objRouter.push(`/payroll/flexi-declaration-review/${intDeclarationID}`);
  }

  const lstTableRows = useMemo(
    () =>
      lstRows.map((objRow) => ({
        id: objRow.intDeclarationID,
        strEmployeeCodeSort: objRow.strEmployeeCode,
        strEmployeeCode: (
          <Link
            className="app-master-first-column-link"
            component="button"
            type="button"
            underline="none"
            data-controlid="flexi-declaration-review.row.view.link"
            data-row-key={objRow.intDeclarationID}
            onClick={(objEvent) => { objEvent.stopPropagation(); openDeclaration(objRow.intDeclarationID); }}
          >
            {objRow.strEmployeeCode}
          </Link>
        ),
        strEmployeeName: objRow.strEmployeeName,
        strFinancialYearCode: objRow.strFinancialYearCode,
        decDeclaredTotalAnnual: formatCurrency(objRow.decDeclaredTotalAnnual),
        decApprovedTotalAnnual: formatCurrency(objRow.decApprovedTotalAnnual),
        intItemCount: objRow.intItemCount,
        strStatus: <Chip size="small" color={getStatusColor(objRow.strWorkflowStatus)} label={formatStatus(objRow.strWorkflowStatus)} />,
        strStatusSort: objRow.strWorkflowStatus || "",
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lstRows, objRouter]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "strEmployeeCode", headerName: "Employee Code", width: 150, sortAccessor: (objRow) => String(objRow.strEmployeeCodeSort) },
      { field: "strEmployeeName", headerName: "Employee Name", width: 200 },
      { field: "strFinancialYearCode", headerName: "Financial Year", width: 140 },
      { field: "decDeclaredTotalAnnual", headerName: "Declared Total", align: "right", width: 160 },
      { field: "decApprovedTotalAnnual", headerName: "Approved Total", align: "right", width: 160 },
      { field: "intItemCount", headerName: "Items", align: "right", width: 100 },
      { field: "strStatus", headerName: "Status", filterable: false, width: 150, sortAccessor: (objRow) => String(objRow.strStatusSort) },
    ],
    []
  );

  return (
    <Box className={styles.page}>
      <MasterBreadcrumbs strSection="Payroll" strTitle="Flexi Declaration Review" />

      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Box
          className={styles.searchRow}
          aria-busy={blnLoading}
          onKeyDown={onSearchEnter(() => { if (!blnLoading) void loadData(strWorkflowStatus); })}
          sx={{
            alignItems: "center",
            "&&": { gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "minmax(180px, 280px) max-content max-content 1fr" } },
            "& .MuiButton-root": { alignSelf: "center", whiteSpace: "nowrap" },
          }}
        >
          <TextField
            className="app-mui-text-field"
            select
            size="small"
            label="Status"
            value={strWorkflowStatus}
            onChange={(e) => setStrWorkflowStatus(e.target.value)}
            disabled={blnLoading}
            fullWidth
          >
            <MenuItem value="submitted">Submitted</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="locked">Locked</MenuItem>
            <MenuItem value="released">Released</MenuItem>
            <MenuItem value="returned">Returned</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => void loadData(strWorkflowStatus)} disabled={blnLoading}>Search</Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => { setStrWorkflowStatus("submitted"); void loadData("submitted"); }}
              disabled={blnLoading}
            >
              Clear
            </Button>
          </Box>
        </Box>
      </Box>

      {strError ? <Alert severity="error">{strError}</Alert> : null}

      {!blnLoading ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip size="small" label={`Submitted ${objSummary.submitted || 0}`} />
          <Chip size="small" label={`Approved ${objSummary.approved || 0}`} />
          <Chip size="small" label={`Locked ${objSummary.locked || 0}`} />
          <Chip size="small" label={`Released ${objSummary.released || 0}`} />
          <Chip size="small" label={`Returned ${objSummary.returned || 0}`} />
          <Chip size="small" label={`Rejected ${objSummary.rejected || 0}`} />
        </Stack>
      ) : null}

      <Box className={styles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {blnLoading ? (
          <MasterGridSkeleton strControlId="flexi-declaration-review.list.skeleton" intColumns={7} />
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName="flexi_declaration_review"
            showPaginationSummary
            minTableWidth={1140}
            hideRowClickHint
            emptyMessage="No declarations found."
            testIdPrefix="flexi-declaration-review.list"
            onRowClick={(objRow) => openDeclaration(objRow.id)}
            getRowSx={() => dicMasterRowSx}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        )}
      </Box>
    </Box>
  );
}
