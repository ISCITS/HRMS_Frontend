"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Autocomplete, Box, Breadcrumbs, Button, Checkbox, Chip, MenuItem, TextField, Typography } from "@mui/material";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { DottedLoader } from "@/components/shared/BlockingLoader";
import { dicMasterRowSx } from "@/components/master/MasterListUi";
import { ReportMoreFilters } from "@/features/reports/components/ReportFilterUi";
import masterStyles from "@/components/master/MasterScreen.module.css";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import payrollStyles from "@/features/payroll/components/PayrollScreen.module.css";

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
  blnEqualSearchFilterWidths?: boolean;
  blnUseMasterStyle?: boolean;
  /** Opt-in TDS-style layout: show only the first N filters inline and put the rest behind a "More filters" popover. */
  intInlineFilterCount?: number;
  strBreadcrumbRoot?: string;
  strBreadcrumbSection?: string;
  strBreadcrumbTitle?: string;
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
          className="app-mui-text-field"
          label={objProps.strLabel}
          placeholder={`Search ${objProps.strLabel}...`}
          error={Boolean(strError)}
          helperText={strError || undefined}
          InputLabelProps={{ shrink: true }}
          inputProps={{ ...objParams.inputProps, "aria-label": objProps.strLabel, "data-controlid": objProps.strControlId }}
          InputProps={{
            ...objParams.InputProps,
            startAdornment: (
              <>
                <SearchRoundedIcon fontSize="small" sx={{ color: "action.active", ml: 0.5, mr: -0.5 }} />
                {objParams.InputProps.startAdornment}
              </>
            ),
            endAdornment: (
              <>
                {blnLoading ? <DottedLoader intSize={16} /> : null}
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
  const styles = objProps.blnUseMasterStyle ? masterStyles : payrollStyles;

  const [dicFilters, setDicFilters] = useState<Record<string, string>>(objProps.dicDefaultFilters ?? {});
  const [lstRows, setLstRows] = useState<ReportDisplayRow[]>([]);
  const [blnLoading, setBlnLoading] = useState(false);
  const [blnHasLoaded, setBlnHasLoaded] = useState(false);
  const [strError, setStrError] = useState("");
  const [lstSelectedIds, setLstSelectedIds] = useState<string[]>([]);
  const [blnExporting, setBlnExporting] = useState(false);
  const [dicMoreDraft, setDicMoreDraft] = useState<Record<string, string>>({});
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
    setDicMoreDraft({});
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

  const blnPageLoading = blnRightsLoading || blnLoading;

  const intInlineCount = objProps.intInlineFilterCount ?? objProps.lstFilters.length;
  const lstInlineFilters = objProps.lstFilters.slice(0, intInlineCount);
  const lstMoreFilters = objProps.lstFilters.slice(intInlineCount);
  const blnCompactLayout = objProps.intInlineFilterCount !== undefined;

  function applyMoreFilters() {
    const dicNext = { ...dicFilters, ...dicMoreDraft };
    setDicFilters(dicNext);
    loadRows(dicNext).catch(() => undefined);
  }

  function renderFilterControl(objFilter: ReportFilterField, dicValues: Record<string, string>, fnSetValue: (strKey: string, strValue: string) => void) {
    return objFilter.strType === "multiselect" ? (
        <ReportMultiSelect
          strLabel={objFilter.strLabel}
          strValue={dicValues[objFilter.strKey] ?? ""}
          lstStaticOptions={objFilter.lstOptions}
          fnLoadOptions={objFilter.fnLoadOptions}
          fnOnChange={(strCsv) => fnSetValue(objFilter.strKey, strCsv)}
          strControlId={`reports.${objProps.strCsvFileName}.${objFilter.strKey}.multiselect`}
        />
      ) : objFilter.strType === "select" ? (
        <Autocomplete
          size="small"
          options={objFilter.lstOptions ?? []}
          value={(objFilter.lstOptions ?? []).find((objOption) => objOption.strValue === (dicValues[objFilter.strKey] ?? "")) ?? null}
          getOptionLabel={(objOption) => objOption.strLabel}
          isOptionEqualToValue={(objA, objB) => objA.strValue === objB.strValue}
          onChange={(_objEvent, objSelected) => fnSetValue(objFilter.strKey, objSelected?.strValue ?? "")}
          fullWidth
          renderInput={(objParams) => (
            <TextField
              {...objParams}
              className="app-mui-text-field"
              label={objFilter.strLabel}
              placeholder={`Search ${objFilter.strLabel}...`}
              InputLabelProps={{ shrink: true }}
              inputProps={{ ...objParams.inputProps, "data-controlid": `reports.${objProps.strCsvFileName}.${objFilter.strKey}.select` }}
              InputProps={{
                ...objParams.InputProps,
                startAdornment: (
                  <>
                    <SearchRoundedIcon fontSize="small" sx={{ color: "action.active", ml: 0.5, mr: -0.5 }} />
                    {objParams.InputProps.startAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      ) : (
        <TextField
          className="app-mui-text-field"
          size="small"
          type={objFilter.strType === "month" ? "month" : objFilter.strType === "date" ? "date" : "text"}
          label={objFilter.strLabel}
          value={dicValues[objFilter.strKey] ?? ""}
          onChange={(objEvent) => fnSetValue(objFilter.strKey, objEvent.target.value)}
          placeholder={objFilter.strLabel}
          fullWidth
          InputLabelProps={objFilter.strType === "text" ? undefined : { shrink: true }}
          data-controlid={`reports.${objProps.strCsvFileName}.${objFilter.strKey}.input`}
          sx={{
            "& .MuiOutlinedInput-root": { boxSizing: "border-box", height: "36px !important", minHeight: "36px !important" },
            "& .MuiOutlinedInput-input": { boxSizing: "border-box", height: "19px", paddingBottom: "7.5px !important", paddingTop: "7.5px !important" },
          }}
        />
    );
  }

  return (
    <Box className={styles.page}>
      {objProps.strBreadcrumbSection || objProps.strBreadcrumbTitle ? (
        <Breadcrumbs className="app-breadcrumbs" aria-label="breadcrumb" separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />} sx={{ ml: "3px" }}>
          {objProps.strBreadcrumbRoot ? (
            <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>{objProps.strBreadcrumbRoot}</Typography>
          ) : null}
          <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>{objProps.strBreadcrumbSection ?? objProps.strTitle}</Typography>
          <Typography component="h1" className="app-breadcrumb-heading" aria-current="page">{objProps.strBreadcrumbTitle ?? objProps.strTitle}</Typography>
        </Breadcrumbs>
      ) : (
        <Typography className={`${styles.breadcrumbs} ${payrollStyles.hiddenHeader}`}>{objProps.strTitle}</Typography>
      )}

      <Box className={styles.controlsCard} sx={objProps.blnUseMasterStyle || blnCompactLayout ? { p: "12px !important", borderRadius: "10px !important", boxShadow: "none" } : undefined}>
        <Box
          className={objProps.blnUseMasterStyle ? styles.searchRow : styles.reportSearchPanelRow}
          sx={objProps.blnUseMasterStyle ? {
            alignItems: "center",
            gridTemplateColumns: {
              xs: "1fr",
              md: objProps.blnEqualSearchFilterWidths
                ? `repeat(${objProps.lstFilters.length}, minmax(0, 1fr)) auto auto !important`
                : "minmax(150px, 0.7fr) minmax(220px, 1fr) minmax(180px, 0.85fr) minmax(180px, 0.85fr) auto auto",
            },
            "& .MuiButton-root": { alignSelf: "center" },
          } : blnCompactLayout ? { py: "0 !important" } : undefined}
        >
          {lstInlineFilters.map((objFilter) => (
            <Box
              className={objProps.blnUseMasterStyle ? undefined : styles.reportSearchField}
              key={objFilter.strKey}
              sx={objFilter.intWidth ? { flexBasis: objFilter.intWidth, minWidth: objFilter.intWidth } : undefined}
            >
              {renderFilterControl(objFilter, dicFilters, setFilterValue)}
            </Box>
          ))}
          <Box className={`${styles.searchActions} ${objProps.blnAlignSearchActionsBottomRight ? styles.reportBottomRightActions : ""}`}>
            {lstMoreFilters.length > 0 ? (
              <ReportMoreFilters
                strControlPrefix={`reports.${objProps.strCsvFileName}`}
                intActiveCount={lstMoreFilters.filter((objFilter) => Boolean(dicFilters[objFilter.strKey])).length}
                blnDisabled={blnPageLoading}
                onOpen={() => setDicMoreDraft(Object.fromEntries(lstMoreFilters.map((objFilter) => [objFilter.strKey, dicFilters[objFilter.strKey] ?? ""])))}
                onApply={applyMoreFilters}
                onClearAll={() => setDicMoreDraft(Object.fromEntries(lstMoreFilters.map((objFilter) => [objFilter.strKey, ""])))}
              >
                {lstMoreFilters.map((objFilter) => (
                  <Box key={objFilter.strKey}>{renderFilterControl(objFilter, dicMoreDraft, (strKey, strValue) => setDicMoreDraft((dicPrevious) => ({ ...dicPrevious, [strKey]: strValue })))}</Box>
                ))}
              </ReportMoreFilters>
            ) : null}
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => loadRows(dicFilters)} disabled={blnPageLoading} data-controlid={`reports.${objProps.strCsvFileName}.search.button`}>Search</Button>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearFilters} disabled={blnPageLoading} data-controlid={`reports.${objProps.strCsvFileName}.clear.button`}>Clear</Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ alignItems: "center", backgroundColor: "#f8fbff", border: "1px solid rgba(191,219,254,0.7)", borderRadius: "16px", color: "#1f2937", display: "flex", gap: 1, px: 1.5, py: 1.25 }}>
        <InfoOutlinedIcon sx={{ color: "#2b6cb0", fontSize: 20 }} />
        <Typography sx={{ color: "inherit", lineHeight: 1.5 }}>{objProps.strInfo}</Typography>
      </Box>

      <Box className={styles.tableCard} sx={objProps.blnUseMasterStyle || blnCompactLayout ? { p: "0 !important", borderRadius: "10px !important", boxShadow: "none" } : undefined}>
        {!blnRightsLoading && !blnCanView && !strError ? <Alert severity="warning" sx={{ mb: 1.5 }}>This report is not available for your user group.</Alert> : null}
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
          loading={blnPageLoading}
          loadingHeaderSkeleton
          skeletonRowCount={10}
          wrapColumnHeaders={objProps.blnWrapColumnHeaders ?? true}
          getRowSx={objProps.blnUseMasterStyle ? () => dicMasterRowSx : objProps.blnSelectable ? (dicRow) => (setSelectedIds.has(String(dicRow[objProps.strRowIdField])) ? { backgroundColor: "rgba(37, 99, 235, 0.08)" } : {}) : undefined}
          hideRowClickHint
          onRowClick={() => undefined}
          toolbarLeft={(
            <Box className={payrollStyles.listUtilityActions} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
