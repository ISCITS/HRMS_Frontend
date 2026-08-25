"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import styles from "@/features/payroll/components/PayrollScreen.module.css";

export type ReportDisplayRow = Record<string, ReactNode>;

export type ReportSelectOption = { strValue: string; strLabel: string };
export type ReportFilterOption = ReportSelectOption;

export type ReportFilterField = {
  strKey: string;
  strLabel: string;
  strType: "text" | "select" | "month" | "date" | "multiselect";
  lstOptions?: ReportSelectOption[];
  intWidth?: number;
  // Async lookup source for a multiselect filter (loaded once on mount).
  fnLoadOptions?: () => Promise<ReportSelectOption[]>;
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
  // Opt-in: adds a checkbox column + selection-aware CSV export. Other reports are unaffected.
  blnSelectable?: boolean;
  /** Keep column labels on one line and allow horizontal scrolling when needed. */
  blnWrapColumnHeaders?: boolean;
  blnAlignSearchActionsBottomRight?: boolean;
};

const lstRowsPerPageOptions = [10, 20, 50];
const SELECT_FIELD = "__select";

function toCsvValue(objValue: unknown) {
  return `"${String(objValue ?? "").replace(/"/g, '""')}"`;
}

function csvTimestamp() {
  const objNow = new Date();
  const fnPad = (intValue: number) => String(intValue).padStart(2, "0");
  return `${objNow.getFullYear()}${fnPad(objNow.getMonth() + 1)}${fnPad(objNow.getDate())}_${fnPad(objNow.getHours())}${fnPad(objNow.getMinutes())}${fnPad(objNow.getSeconds())}`;
}

function downloadCsv(strFileName: string, lstColumns: CommonTableColumn<ReportDisplayRow>[], lstRows: ReportDisplayRow[]) {
  const lstExportColumns = lstColumns.filter((objColumn) => objColumn.field && objColumn.field !== SELECT_FIELD && objColumn.exportable !== false);
  const lstLines = [
    lstExportColumns.map((objColumn) => toCsvValue(objColumn.headerName)).join(","),
    ...lstRows.map((dicRow) => lstExportColumns.map((objColumn) => toCsvValue(csvCellText(dicRow[objColumn.field as string]))).join(",")),
  ];
  const objBlob = new Blob(["﻿" + lstLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const strUrl = URL.createObjectURL(objBlob);
  const objLink = document.createElement("a");
  objLink.href = strUrl;
  objLink.download = strFileName;
  objLink.click();
  URL.revokeObjectURL(strUrl);
}

// Report cells may hold a React element (e.g. a coloured span for negative balances); unwrap the
// primitive text so the CSV holds the value, not "[object Object]".
function csvCellText(objValue: ReactNode): string {
  if (objValue === null || objValue === undefined || typeof objValue === "boolean") return "";
  if (typeof objValue === "object" && "props" in objValue) {
    return csvCellText((objValue as { props?: { children?: ReactNode } }).props?.children);
  }
  return String(objValue);
}

function ReportMultiSelect(objProps: {
  strLabel: string;
  strValue: string;
  lstStaticOptions?: ReportSelectOption[];
  fnLoadOptions?: () => Promise<ReportSelectOption[]>;
  fnOnChange: (strCsv: string) => void;
  strControlId: string;
}) {
  const [lstOptions, setLstOptions] = useState<ReportSelectOption[]>(objProps.lstStaticOptions ?? []);
  const [blnLoading, setBlnLoading] = useState(false);
  const [strError, setStrError] = useState("");

  useEffect(() => {
    if (!objProps.fnLoadOptions) return;
    let blnActive = true;
    setBlnLoading(true);
    setStrError("");
    objProps.fnLoadOptions()
      .then((lstResult) => { if (blnActive) setLstOptions(lstResult); })
      .catch(() => { if (blnActive) setStrError("Unable to load options."); })
      .finally(() => { if (blnActive) setBlnLoading(false); });
    return () => { blnActive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSelectedValues = useMemo(() => new Set(objProps.strValue ? objProps.strValue.split(",").filter(Boolean) : []), [objProps.strValue]);
  const lstSelected = useMemo(() => lstOptions.filter((objOption) => setSelectedValues.has(objOption.strValue)), [lstOptions, setSelectedValues]);

  return (
    <Autocomplete
      multiple
      size="small"
      options={lstOptions}
      value={lstSelected}
      loading={blnLoading}
      disableCloseOnSelect
      limitTags={2}
      getOptionLabel={(objOption) => objOption.strLabel}
      isOptionEqualToValue={(objA, objB) => objA.strValue === objB.strValue}
      onChange={(_objEvent, lstNext) => objProps.fnOnChange(lstNext.map((objOption) => objOption.strValue).join(","))}
      renderTags={(lstValue, fnGetTagProps) =>
        lstValue.map((objOption, intIndex) => {
          const { key, ...objTagProps } = fnGetTagProps({ index: intIndex });
          return <Chip key={key} size="small" label={objOption.strLabel} {...objTagProps} />;
        })
      }
      renderInput={(objParams) => (
        <TextField
          {...objParams}
          label={objProps.strLabel}
          placeholder={objProps.strLabel}
          error={Boolean(strError)}
          helperText={strError || undefined}
          InputLabelProps={{ shrink: true }}
          inputProps={{ ...objParams.inputProps, "aria-label": objProps.strLabel, "data-controlid": objProps.strControlId }}
          InputProps={{
            ...objParams.InputProps,
            endAdornment: (
              <>
                {blnLoading ? <CircularProgress color="inherit" size={16} /> : null}
                {objParams.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      sx={{ minWidth: 200, flex: "1 1 200px" }}
    />
  );
}

export default function ReportGridPage(objProps: ReportGridPageProps) {
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny } = useModuleActionAccess(objProps.lstRightsHints);
  const blnCanView = canViewAny() || canDoAny("view") || canDoAny("list");

  const [dicFilters, setDicFilters] = useState<Record<string, string>>(objProps.dicDefaultFilters ?? {});
  const [lstRows, setLstRows] = useState<ReportDisplayRow[]>([]);
  const [blnLoading, setBlnLoading] = useState(false);
  const [blnHasLoaded, setBlnHasLoaded] = useState(false);
  const [strError, setStrError] = useState("");
  const [lstSelectedIds, setLstSelectedIds] = useState<string[]>([]);
  const [blnExporting, setBlnExporting] = useState(false);
  const intRequestSeqRef = useRef(0);

  const loadRows = useCallback(async (dicAppliedFilters: Record<string, string>) => {
    const intSeq = ++intRequestSeqRef.current;
    setBlnLoading(true);
    setStrError("");
    try {
      const lstResult = await objProps.fnLoad(dicAppliedFilters);
      if (intSeq !== intRequestSeqRef.current) return; // a newer request superseded this one
      setLstRows(lstResult);
      setLstSelectedIds([]); // a fresh result set invalidates prior selections
      setBlnHasLoaded(true);
    } catch (objError) {
      if (intSeq !== intRequestSeqRef.current) return;
      setStrError(objError instanceof Error ? objError.message : "Unable to load this report.");
      setLstRows([]);
      setLstSelectedIds([]);
    } finally {
      if (intSeq === intRequestSeqRef.current) setBlnLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objProps.fnLoad]);

  useEffect(() => {
    if (!blnCanView) return;
    loadRows(objProps.dicDefaultFilters ?? {}).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blnCanView]);

  function setFilterValue(strKey: string, strValue: string) {
    setDicFilters((dicPrevious) => ({ ...dicPrevious, [strKey]: strValue }));
  }

  function clearFilters() {
    const dicReset = objProps.dicDefaultFilters ?? {};
    setDicFilters(dicReset);
    setLstSelectedIds([]);
    loadRows(dicReset).catch(() => undefined);
  }

  // ---- Row selection (over the full loaded result set; persists across client-side pages) ----
  const setSelectedIds = useMemo(() => new Set(lstSelectedIds), [lstSelectedIds]);
  const lstAllIds = useMemo(() => lstRows.map((dicRow) => String(dicRow[objProps.strRowIdField])), [lstRows, objProps.strRowIdField]);
  const blnAllSelected = lstAllIds.length > 0 && lstAllIds.every((strId) => setSelectedIds.has(strId));
  const blnSomeSelected = !blnAllSelected && lstSelectedIds.length > 0;

  const toggleOne = useCallback((strId: string) => {
    setLstSelectedIds((lstPrev) => (lstPrev.includes(strId) ? lstPrev.filter((strValue) => strValue !== strId) : [...lstPrev, strId]));
  }, []);

  function toggleAll() {
    setLstSelectedIds(blnAllSelected ? [] : lstAllIds);
  }

  const lstColumns = useMemo<CommonTableColumn<ReportDisplayRow>[]>(() => {
    if (!objProps.blnSelectable) return objProps.lstColumns;
    const objSelectColumn: CommonTableColumn<ReportDisplayRow> = {
      field: SELECT_FIELD,
      headerName: (
        <Checkbox
          size="small"
          checked={blnAllSelected}
          indeterminate={blnSomeSelected}
          onChange={toggleAll}
          inputProps={{ "aria-label": "Select all rows" } as Record<string, string>}
        />
      ),
      width: 52,
      sortable: false,
      exportable: false,
    };
    return [objSelectColumn, ...objProps.lstColumns];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objProps.blnSelectable, objProps.lstColumns, blnAllSelected, blnSomeSelected, lstAllIds]);

  const lstDisplayRows = useMemo(() => {
    if (!objProps.blnSelectable) return lstRows;
    return lstRows.map((dicRow) => {
      const strId = String(dicRow[objProps.strRowIdField]);
      return {
        ...dicRow,
        [SELECT_FIELD]: (
          <Checkbox
            size="small"
            checked={setSelectedIds.has(strId)}
            onChange={() => toggleOne(strId)}
            inputProps={{ "aria-label": `Select row ${strId}` } as Record<string, string>}
          />
        ),
      };
    });
  }, [lstRows, objProps.blnSelectable, objProps.strRowIdField, setSelectedIds, toggleOne]);

  function exportCsv() {
    if (blnExporting) return; // guard against duplicate export while running
    setBlnExporting(true);
    try {
      const lstToExport = lstSelectedIds.length > 0
        ? lstRows.filter((dicRow) => setSelectedIds.has(String(dicRow[objProps.strRowIdField])))
        : lstRows;
      downloadCsv(`${objProps.strCsvFileName}_${csvTimestamp()}.csv`, objProps.lstColumns, lstToExport);
    } finally {
      setBlnExporting(false);
    }
  }

  if (blnRightsLoading || (blnLoading && !blnHasLoaded)) {
    return <BlockingLoader blnOpen strLabel={`Loading ${objProps.strTitle.toLowerCase()}...`} />;
  }

  return (
    <Box className={styles.page}>
      <Typography className={`${styles.breadcrumbs} ${styles.hiddenHeader}`}>{objProps.strTitle}</Typography>

      <Box className={styles.controlsCard}>
        <Box className={styles.reportSearchPanelRow}>
          {objProps.lstFilters.map((objFilter) => (
            <Box
              className={styles.reportSearchField}
              key={objFilter.strKey}
              sx={objFilter.intWidth ? { flexBasis: objFilter.intWidth, minWidth: objFilter.intWidth } : undefined}
            >
              {objFilter.strType === "multiselect" ? (
                <ReportMultiSelect
                  strLabel={objFilter.strLabel}
                  strValue={dicFilters[objFilter.strKey] ?? ""}
                  lstStaticOptions={objFilter.lstOptions}
                  fnLoadOptions={objFilter.fnLoadOptions}
                  fnOnChange={(strCsv) => setFilterValue(objFilter.strKey, strCsv)}
                  strControlId={`reports.${objProps.strCsvFileName}.${objFilter.strKey}.multiselect`}
                />
              ) : objFilter.strType === "select" ? (
                <TextField
                  select
                  label={objFilter.strLabel}
                  value={dicFilters[objFilter.strKey] ?? ""}
                  onChange={(objEvent) => setFilterValue(objFilter.strKey, objEvent.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  data-controlid={`reports.${objProps.strCsvFileName}.${objFilter.strKey}.select`}
                >
                  <MenuItem value="">All {objFilter.strLabel}</MenuItem>
                  {(objFilter.lstOptions ?? []).map((objOption) => (
                    <MenuItem key={objOption.strValue} value={objOption.strValue}>{objOption.strLabel}</MenuItem>
                  ))}
                </TextField>
              ) : (
                <TextField
                  type={objFilter.strType === "month" ? "month" : objFilter.strType === "date" ? "date" : "text"}
                  label={objFilter.strLabel}
                  value={dicFilters[objFilter.strKey] ?? ""}
                  onChange={(objEvent) => setFilterValue(objFilter.strKey, objEvent.target.value)}
                  placeholder={objFilter.strLabel}
                  fullWidth
                  InputLabelProps={objFilter.strType === "text" ? undefined : { shrink: true }}
                  data-controlid={`reports.${objProps.strCsvFileName}.${objFilter.strKey}.input`}
                />
              )}
            </Box>
          ))}
          <Box className={`${styles.searchActions} ${objProps.blnAlignSearchActionsBottomRight ? styles.reportBottomRightActions : ""}`}>
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
          columns={lstColumns}
          rows={lstDisplayRows}
          rowIdField={objProps.strRowIdField}
          defaultPageSize={lstRowsPerPageOptions[0]}
          pageSizeOptions={lstRowsPerPageOptions}
          emptyMessage={objProps.strEmptyMessage ?? "No records found for the current filters."}
          showPaginationSummary
          withPaper={false}
          testIdPrefix={`reports.${objProps.strCsvFileName}`}
          wrapColumnHeaders={objProps.blnWrapColumnHeaders ?? true}
          getRowSx={objProps.blnSelectable ? (dicRow) => (setSelectedIds.has(String(dicRow[objProps.strRowIdField])) ? { backgroundColor: "rgba(37, 99, 235, 0.08)" } : {}) : undefined}
          toolbarLeft={(
            <Box className={styles.listUtilityActions} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {canDoAny("export") ? (
                <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} disabled={blnExporting} onClick={exportCsv} data-controlid={`reports.${objProps.strCsvFileName}.export.button`}>Export CSV</Button>
              ) : null}
              {objProps.blnSelectable && lstSelectedIds.length > 0 ? (
                <>
                  <Typography sx={{ fontSize: ".82rem", color: "#475569", fontWeight: 700 }}>{lstSelectedIds.length} selected</Typography>
                  <Button size="small" onClick={() => setLstSelectedIds([])} data-controlid={`reports.${objProps.strCsvFileName}.clear-selection.button`}>Clear Selection</Button>
                </>
              ) : null}
            </Box>
          )}
          sx={{ p: 0, boxShadow: "none", background: "transparent" }}
        />
      </Box>
    </Box>
  );
}
