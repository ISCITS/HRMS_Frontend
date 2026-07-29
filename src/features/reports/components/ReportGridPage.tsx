"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, MenuItem, TextField, Typography } from "@mui/material";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import styles from "@/features/payroll/components/PayrollScreen.module.css";

export type ReportDisplayRow = Record<string, ReactNode>;

export type ReportFilterField = {
  strKey: string;
  strLabel: string;
  strType: "text" | "select" | "month" | "date";
  lstOptions?: { strValue: string; strLabel: string }[];
};

export type ReportGridPageProps = {
  strTitle: string;
  strInfo: string;
  lstColumns: CommonTableColumn<ReportDisplayRow>[];
  lstFilters: ReportFilterField[];
  dicDefaultFilters?: Record<string, string>;
  fnLoad: (dicFilters: Record<string, string>) => Promise<ReportDisplayRow[]>;
  strRowIdField: string;
  strCsvFileName: string;
  lstRightsHints: string[];
  strEmptyMessage?: string;
};

const lstRowsPerPageOptions = [10, 20, 50];

function toCsvValue(objValue: unknown) {
  return `"${String(objValue ?? "").replace(/"/g, '""')}"`;
}

function downloadCsv(strFileName: string, lstColumns: CommonTableColumn<ReportDisplayRow>[], lstRows: ReportDisplayRow[]) {
  const lstExportColumns = lstColumns.filter((objColumn) => objColumn.field && objColumn.exportable !== false);
  const lstLines = [
    lstExportColumns.map((objColumn) => toCsvValue(objColumn.headerName)).join(","),
    ...lstRows.map((dicRow) => lstExportColumns.map((objColumn) => toCsvValue(dicRow[objColumn.field as string])).join(",")),
  ];
  const objBlob = new Blob(["﻿" + lstLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const strUrl = URL.createObjectURL(objBlob);
  const objLink = document.createElement("a");
  objLink.href = strUrl;
  objLink.download = strFileName;
  objLink.click();
  URL.revokeObjectURL(strUrl);
}

export default function ReportGridPage(objProps: ReportGridPageProps) {
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny } = useModuleActionAccess(objProps.lstRightsHints);
  const blnCanView = canViewAny() || canDoAny("view") || canDoAny("list");

  const [dicFilters, setDicFilters] = useState<Record<string, string>>(objProps.dicDefaultFilters ?? {});
  const [lstRows, setLstRows] = useState<ReportDisplayRow[]>([]);
  const [blnLoading, setBlnLoading] = useState(false);
  const [blnHasLoaded, setBlnHasLoaded] = useState(false);
  const [strError, setStrError] = useState("");

  async function loadRows(dicAppliedFilters: Record<string, string>) {
    setBlnLoading(true);
    setStrError("");
    try {
      setLstRows(await objProps.fnLoad(dicAppliedFilters));
      setBlnHasLoaded(true);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load this report.");
      setLstRows([]);
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (!blnCanView) {
      return;
    }
    loadRows(objProps.dicDefaultFilters ?? {}).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blnCanView]);

  function setFilterValue(strKey: string, strValue: string) {
    setDicFilters((dicPrevious) => ({ ...dicPrevious, [strKey]: strValue }));
  }

  function clearFilters() {
    const dicReset = objProps.dicDefaultFilters ?? {};
    setDicFilters(dicReset);
    loadRows(dicReset).catch(() => undefined);
  }

  const lstMemoRows = useMemo(() => lstRows, [lstRows]);

  if (blnRightsLoading || (blnLoading && !blnHasLoaded)) {
    return <BlockingLoader blnOpen strLabel={`Loading ${objProps.strTitle.toLowerCase()}...`} />;
  }

  return (
    <Box className={styles.page}>
      <Typography className={`${styles.breadcrumbs} ${styles.hiddenHeader}`}>{objProps.strTitle}</Typography>

      <Box className={styles.controlsCard}>
        <Box className={styles.payrollRegisterSearchPanel}>
          <Box className={styles.payrollRegisterSearchLinePrimary}>
            {objProps.lstFilters.map((objFilter) => (
              objFilter.strType === "select" ? (
                <TextField
                  key={objFilter.strKey}
                  select
                  label={objFilter.strLabel}
                  value={dicFilters[objFilter.strKey] ?? ""}
                  onChange={(objEvent) => setFilterValue(objFilter.strKey, objEvent.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  data-controlid={`reports.${objProps.strCsvFileName}.${objFilter.strKey}.select`}
                >
                  <MenuItem value="">{objFilter.strLabel}</MenuItem>
                  {(objFilter.lstOptions ?? []).map((objOption) => (
                    <MenuItem key={objOption.strValue} value={objOption.strValue}>{objOption.strLabel}</MenuItem>
                  ))}
                </TextField>
              ) : (
                <TextField
                  key={objFilter.strKey}
                  type={objFilter.strType === "month" ? "month" : objFilter.strType === "date" ? "date" : "text"}
                  label={objFilter.strLabel}
                  value={dicFilters[objFilter.strKey] ?? ""}
                  onChange={(objEvent) => setFilterValue(objFilter.strKey, objEvent.target.value)}
                  placeholder={objFilter.strLabel}
                  fullWidth
                  InputLabelProps={objFilter.strType === "text" ? undefined : { shrink: true }}
                  data-controlid={`reports.${objProps.strCsvFileName}.${objFilter.strKey}.input`}
                />
              )
            ))}
          </Box>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => loadRows(dicFilters)} data-controlid={`reports.${objProps.strCsvFileName}.search.button`}>Search</Button>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearFilters} data-controlid={`reports.${objProps.strCsvFileName}.clear.button`}>Clear</Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ alignItems: "center", backgroundColor: "#f8fbff", border: "1px solid rgba(191,219,254,0.7)", borderRadius: "16px", color: "#1f2937", display: "flex", gap: 1, px: 1.5, py: 1.25 }}>
        <InfoOutlinedIcon sx={{ color: "#2b6cb0", fontSize: 20 }} />
        <Typography sx={{ color: "inherit", lineHeight: 1.5 }}>{objProps.strInfo}</Typography>
      </Box>

      <Box className={styles.tableCard}>
        {!blnCanView && !strError ? <Alert severity="warning" sx={{ mb: 1.5 }}>This report is not available for your user group.</Alert> : null}
        {strError ? <Alert severity="error" sx={{ mb: 1.5 }}>{strError}</Alert> : null}
        <CommonTable
          columns={objProps.lstColumns}
          rows={lstMemoRows}
          rowIdField={objProps.strRowIdField}
          defaultPageSize={lstRowsPerPageOptions[0]}
          pageSizeOptions={lstRowsPerPageOptions}
          emptyMessage={objProps.strEmptyMessage ?? "No records found for the current filters."}
          showPaginationSummary
          withPaper={false}
          testIdPrefix={`reports.${objProps.strCsvFileName}`}
          toolbarLeft={(
            <Box className={styles.listUtilityActions}>
              {canDoAny("export") ? (
                <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv(`${objProps.strCsvFileName}.csv`, objProps.lstColumns, lstMemoRows)} data-controlid={`reports.${objProps.strCsvFileName}.export.button`}>Export CSV</Button>
              ) : null}
            </Box>
          )}
          sx={{ p: 0, boxShadow: "none", background: "transparent" }}
        />
      </Box>
    </Box>
  );
}
