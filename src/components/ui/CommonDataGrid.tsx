"use client";

import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  Box,
  Button,
  MenuItem,
  Pagination,
  Paper,
  SxProps,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
  Theme
} from "@mui/material";
import { ReactNode, isValidElement, useEffect, useMemo, useState, type MouseEvent } from "react";
import dicConstant from "@/constants/Constant.json";
import styles from "@/components/master/MasterScreen.module.css";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";

type CellAlign = "left" | "right" | "center";

const strBulkActionSelector = ["bulk-activate", "bulk-deactivate", "bulk-delete"]
  .flatMap((strAction) => [
    `& [data-controlid*=".${strAction}.button"]`,
    `& [data-control-id*=".${strAction}.button"]`,
    `& [controlid*=".${strAction}.button"]`,
    `& [data-testid*=".${strAction}.button"]`
  ])
  .join(", ");

export type DataGridColumn<T extends Record<string, ReactNode>> = {
  field: keyof T;
  headerName: ReactNode;
  align?: CellAlign;
  width?: number;
  sortable?: boolean;
  sortAccessor?: (row: T) => string | number;
  filterable?: boolean;
  exportable?: boolean;
  /** @deprecated Text wrapping is now the default behavior for all columns. */
  blnWrapText?: boolean;
};

export type CommonDataGridProps<T extends Record<string, ReactNode>> = {
  columns: DataGridColumn<T>[];
  rows: T[];
  toolbarLeft?: ReactNode;
  footerContent?: ReactNode;
  hideToolbar?: boolean;
  minTableWidth?: number;
  getRowSx?: (row: T) => SxProps<Theme> | undefined;
  onRowDoubleClick?: (row: T, event: MouseEvent<HTMLTableRowElement>) => void;
  rowIdField?: keyof T;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  exportFileName?: string;
  showExportOptions?: boolean;
  showPaginationSummary?: boolean;
  emptyMessage?: string;
  withPaper?: boolean;
  sx?: SxProps<Theme>;
  testIdPrefix?: string;
  hideRowClickHint?: boolean;
  wrapColumnHeaders?: boolean;
};

// Renders a generic client-side data grid with filter, sort, pagination, and optional export.
export default function CommonDataGrid<T extends Record<string, ReactNode>>({
  columns,
  rows,
  toolbarLeft,
  footerContent,
  hideToolbar = false,
  minTableWidth = 980,
  getRowSx,
  onRowDoubleClick,
  rowIdField,
  defaultPageSize = 20,
  pageSizeOptions = [10, 20, 50],
  exportFileName = dicConstant.commonDataGrid.defaultExportFileName,
  showExportOptions = false,
  showPaginationSummary = false,
  emptyMessage = dicConstant.commonDataGrid.emptyMessage,
  withPaper = true,
  sx,
  testIdPrefix = "common-data-grid",
  hideRowClickHint = false,
  wrapColumnHeaders = true
}: CommonDataGridProps<T>) {
  const { t } = useModuleLabels("common_data_grid");
  /*
  Functional responsibility:
  - Render a reusable table with client-side filter, sort, pagination, and optional exports.
  
  Inputs:
  - columns/rows define table shape + data.
  - rowIdField controls stable row keys.
  - showExportOptions/exportFileName control export UI and file naming.
  
  Output:
  - Renders tabular UI (optionally wrapped in Paper) and export actions.
  
  Failure behavior:
  - If data is empty after filtering, renders emptyMessage row (no exception thrown).
  - If PDF popup is blocked, export handler safely returns without crashing.
  */
  const [sortBy, setSortBy] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPageSize);
  const strExportExcelLabel = t("export_excel", dicConstant.common.exportExcel);
  const strExportPdfLabel = t("export_pdf", dicConstant.common.exportPdf);
  const strPaginationSeparator = t("pagination_separator", dicConstant.common.paginationSeparator);
  const strRowDoubleClickHint = t("row_double_click_tooltip", "Double-click on a row to open details");
  const strResolvedEmptyMessage = emptyMessage || t("empty_message", dicConstant.commonDataGrid.emptyMessage);
  const orderedColumns = useMemo(() => {
    const getColumnPriority = (column: DataGridColumn<T>) => {
      const strField = String(column.field);
      if (strField === "select") {
        return 0;
      }
      if (strField === "action" || strField === "rowActions") {
        return 1;
      }
      return 2;
    };

    return columns
      .filter((column) => String(column.field) !== "select")
      .sort((objLeft, objRight) => getColumnPriority(objLeft) - getColumnPriority(objRight));
  }, [columns]);
  const intMinimumTableWidth = useMemo(
    () => orderedColumns.reduce((intTotal, column) => intTotal + (column.width ?? 160), 0),
    [orderedColumns]
  );

  const filteredAndSortedRows = useMemo(() => {
    /*
    Logical flow:
    Apply sorting on the selected sortable column.
    */
    if (!sortBy) {
      return rows;
    }

    const sorted = [...rows].sort((a, b) => {
      const sortColumn = orderedColumns.find((column) => column.field === sortBy);
      const aValue = sortColumn?.sortAccessor ? sortColumn.sortAccessor(a) : a[sortBy];
      const bValue = sortColumn?.sortAccessor ? sortColumn.sortAccessor(b) : b[sortBy];

      if (
        (typeof aValue !== "string" && typeof aValue !== "number") ||
        (typeof bValue !== "string" && typeof bValue !== "number")
      ) {
        return 0;
      }

      if (aValue < bValue) {
        return sortDirection === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === "asc" ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [orderedColumns, rows, sortBy, sortDirection]);

  const handleSort = (field: keyof T, sortable: boolean | undefined) => {
    if (sortable === false) {
      return;
    }
    if (sortBy === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(field);
    setSortDirection("asc");
  };

  const findAvailableRowAction = (objRow: HTMLTableRowElement, strAction: "edit" | "view") => {
    const strSelector = [
      `[data-controlid$=".${strAction}.button"]`,
      `[data-control-id$=".${strAction}.button"]`,
      `[controlid$=".${strAction}.button"]`
    ].join(", ");

    return Array.from(objRow.querySelectorAll<HTMLElement>(strSelector)).find((objAction) => {
      const blnDisabled = objAction instanceof HTMLButtonElement && objAction.disabled;
      return !blnDisabled && objAction.getAttribute("aria-disabled") !== "true";
    });
  };

  const handleRowDoubleClick = (row: T, objEvent: MouseEvent<HTMLTableRowElement>) => {
    const objTarget = objEvent.target as HTMLElement;
    if (objTarget.closest("button, input, a, [role='button']")) {
      return;
    }

    const objRow = objEvent.currentTarget;
    const objPreferredAction = findAvailableRowAction(objRow, "edit") ?? findAvailableRowAction(objRow, "view");
    if (objPreferredAction) {
      objPreferredAction.click();
      return;
    }

    onRowDoubleClick?.(row, objEvent);
  };

  useEffect(() => {
    setPage(0);
  }, [sortBy, sortDirection, rowsPerPage]);

  const paginatedRows = useMemo(() => {
    /*
    Logical flow:
    Slice filtered/sorted rows for current page window.
    */
    const intStart = page * rowsPerPage;
    return filteredAndSortedRows.slice(intStart, intStart + rowsPerPage);
  }, [filteredAndSortedRows, page, rowsPerPage]);

  const exportColumns = orderedColumns.filter((column) => column.exportable !== false);

  const toText = (value: ReactNode): string => {
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
    if (Array.isArray(value)) {
      return value.map((item) => toText(item)).join(" ");
    }
    if (isValidElement(value)) {
      const dicProps = value.props as { children?: ReactNode };
      return toText(dicProps.children);
    }
    return "";
  };

  const toCsvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const handleExportExcel = () => {
    /*
    Output:
    - Downloads a UTF-8 CSV file (Excel-friendly) containing exported columns + filtered/sorted rows.
    
    Failure behavior:
    - If browser blocks download, no throw from this module.
    */
    const strHeaders = exportColumns.map((column) => toCsvCell(toText(column.headerName))).join(",");
    const strBody = filteredAndSortedRows
      .map((row) => exportColumns.map((column) => toCsvCell(toText(row[column.field]))).join(","))
      .join("\n");
    const strCsvContent = `${strHeaders}\n${strBody}`;
    const blob = new Blob([`\uFEFF${strCsvContent}`], { type: "text/csv;charset=utf-8;" });
    const strUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = strUrl;
    link.download = `${exportFileName}.csv`;
    link.click();
    URL.revokeObjectURL(strUrl);
  };

  const handleExportPdf = () => {
    /*
    Output:
    - Opens print-friendly page for PDF save/print.
    
    Failure behavior:
    - If popup blocked (window.open returns null), exits gracefully.
    */
    const strHeaderHtml = exportColumns.map((column) => `<th>${toText(column.headerName)}</th>`).join("");
    const strRowHtml = filteredAndSortedRows
      .map((row) => `<tr>${exportColumns.map((column) => `<td>${toText(row[column.field])}</td>`).join("")}</tr>`)
      .join("");

    const dicPrintWindow = window.open("", "_blank", "width=1000,height=700");
    if (!dicPrintWindow) {
      return;
    }

    dicPrintWindow.document.write(`
      <html>
        <head>
          <title>${exportFileName}</title>
          <style>
            body { font-family: Inter, Arial, sans-serif; padding: 24px; color: #0f172a; }
            h2 { margin: 0 0 16px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h2>${exportFileName}</h2>
          <table>
            <thead><tr>${strHeaderHtml}</tr></thead>
            <tbody>${strRowHtml}</tbody>
          </table>
        </body>
      </html>
    `);
    dicPrintWindow.document.close();
    dicPrintWindow.focus();
    dicPrintWindow.print();
  };

  const table = (
    <Stack
      spacing={2.5}
      sx={{
        minHeight: 0,
        height: "100%",
        [strBulkActionSelector]: { display: "none" }
      }}
    >
      {(!hideToolbar || showPaginationSummary) ? (
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={1.5}
          alignItems={{ lg: "center" }}
          justifyContent="space-between"
          sx={{ px: 1.5, pt: 1.25 }}
        >
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }} sx={{ width: { xs: "100%", lg: "auto" } }}>
            {toolbarLeft ? <Box sx={{ display: "flex", alignItems: "center", minHeight: 40 }}>{toolbarLeft}</Box> : null}
            {!hideToolbar && showExportOptions ? (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button data-controlid={`${testIdPrefix}.export-excel.button`} className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={handleExportExcel}>
                  {strExportExcelLabel}
                </Button>
                <Button data-controlid={`${testIdPrefix}.export-pdf.button`} className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={handleExportPdf}>
                  {strExportPdfLabel}
                </Button>
              </Stack>
            ) : null}
            {!hideToolbar && !hideRowClickHint ? (
              <Stack
                direction="row"
                spacing={0.75}
                alignItems="center"
                sx={{ color: "text.secondary", minHeight: 40 }}
              >
                <InfoOutlinedIcon sx={{ fontSize: 18, flexShrink: 0 }} aria-hidden="true" />
                <Typography
                  variant="body2"
                  sx={{ fontSize: "13px", fontWeight: 400, color: "#64748b" }}
                >
                  {strRowDoubleClickHint}
                </Typography>
              </Stack>
            ) : null}
          </Stack>
          {showPaginationSummary ? (
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="center"
              justifyContent={{ xs: "flex-start", lg: "flex-end" }}
              sx={{ width: { xs: "100%", lg: "auto" }, flexWrap: "wrap" }}
            >
              <Box className={styles.paginationInfo}>
                <TextField
                  data-controlid={`${testIdPrefix}.rows-per-page.select`}
                  className={styles.rowsPerPageSelect}
                  select
                  size="small"
                  value={String(rowsPerPage)}
                  onChange={(event) => {
                    setRowsPerPage(parseInt(event.target.value, 10));
                    setPage(0);
                  }}
                  sx={{ width: 86 }}
                >
                  {pageSizeOptions.map((intOption) => (
                    <MenuItem key={intOption} value={String(intOption)} data-controlid={`${testIdPrefix}.rows-per-page.${intOption}.option`}>
                      {intOption}
                    </MenuItem>
                  ))}
                </TextField>
                <Typography className={styles.paginationRange}>
                  {filteredAndSortedRows.length === 0
                    ? `0 ${strPaginationSeparator} 0`
                    : `${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, filteredAndSortedRows.length)} ${strPaginationSeparator} ${filteredAndSortedRows.length}`}
                </Typography>
              </Box>
              <Pagination
                data-controlid={`${testIdPrefix}.pagination`}
                className={styles.paginationBar}
                count={Math.max(1, Math.ceil(filteredAndSortedRows.length / rowsPerPage))}
                page={filteredAndSortedRows.length === 0 ? 1 : page + 1}
                onChange={(_, intNextPage) => setPage(intNextPage - 1)}
                size="small"
                color="primary"
                showFirstButton
                showLastButton
              />
            </Stack>
          ) : null}
        </Stack>
      ) : null}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowX: "auto",
          overflowY: "auto",
          scrollbarGutter: "stable",
        }}
      >
        <Table
          data-controlid={`${testIdPrefix}.table`}
          size="small"
          stickyHeader
          sx={{
            borderCollapse: "separate",
            borderSpacing: 0,
            minWidth: Math.max(intMinimumTableWidth, minTableWidth),
            width: "100%",
            tableLayout: "fixed"
          }}
        >
          <colgroup>
            {orderedColumns.map((column) => (
              <col key={`col-${String(column.field)}`} style={column.width ? { width: `${column.width}px` } : undefined} />
            ))}
          </colgroup>
          <TableHead data-controlid={`${testIdPrefix}.table.head`}>
            <TableRow data-controlid={`${testIdPrefix}.table.header-row`}>
              {orderedColumns.map((column) => {
                const strField = String(column.field);
                const strAlign = column.align ?? (strField === "select" || strField === "action" || strField === "rowActions" ? "center" : "left");
                return (
                  <TableCell
                    key={String(column.field)}
                    align={strAlign}
                    data-controlid={`${testIdPrefix}.header.${strField}.cell`}
                    sx={{
                      width: column.width,
                      bgcolor: "background.paper",
                      color: "text.secondary",
                      fontWeight: 700,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      whiteSpace: wrapColumnHeaders ? "normal" : "nowrap",
                      overflowWrap: wrapColumnHeaders ? "anywhere" : "normal",
                      verticalAlign: "middle",
                      px: 1,
                      py: 0.5,
                      "& .MuiTableSortLabel-root": {
                        fontWeight: 700,
                        maxWidth: "100%",
                        whiteSpace: wrapColumnHeaders ? "normal" : "nowrap"
                      },
                      "& .MuiTableSortLabel-icon": {
                        flexShrink: 0
                      }
                    }}
                  >
                    {column.sortable === false ? (
                      <Box sx={{ display: "inline-flex", alignItems: "center", justifyContent: strAlign === "center" ? "center" : "flex-start", width: "100%" }}>
                        {column.headerName}
                      </Box>
                    ) : (
                      <TableSortLabel
                        data-controlid={`${testIdPrefix}.header.${strField}.sort.button`}
                        active={sortBy === column.field}
                        direction={sortBy === column.field ? sortDirection : "asc"}
                        onClick={() => handleSort(column.field, column.sortable)}
                        hideSortIcon={false}
                      >
                        {column.headerName}
                      </TableSortLabel>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody data-controlid={`${testIdPrefix}.table.body`}>
            {filteredAndSortedRows.length === 0 ? (
              <TableRow data-controlid={`${testIdPrefix}.table.empty-row`}>
                <TableCell data-controlid={`${testIdPrefix}.table.empty-state`} colSpan={orderedColumns.length} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  {strResolvedEmptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row, index) => {
                const strRowKey = rowIdField ? String(row[rowIdField]) : `${page}-${index}`;
                return (
                  <TableRow
                    key={strRowKey}
                    data-controlid={`${testIdPrefix}.row`}
                    data-row-key={strRowKey}
                    hover
                    onDoubleClick={(objEvent) => handleRowDoubleClick(row, objEvent)}
                    sx={[
                      {
                        height: 50,
                        "& td": {
                          borderBottom: "1px solid",
                          borderColor: "divider",
                          verticalAlign: "middle"
                        }
                      },
                      getRowSx?.(row) ?? {}
                    ] as SxProps<Theme>}
                  >
                    {orderedColumns.map((column) => {
                      const strField = String(column.field);
                      const blnIsActionColumn = strField === "action" || strField === "rowActions";
                      const strAlign = column.align ?? (strField === "select" || blnIsActionColumn ? "center" : "left");
                      return (
                        <TableCell
                          key={`${String(column.field)}-${index}`}
                          align={strAlign}
                          data-controlid={`${testIdPrefix}.row.${strField}.cell`}
                          data-row-key={strRowKey}
                          sx={{
                            whiteSpace: "normal",
                            overflowWrap: "anywhere",
                            px: 1,
                            py: 0.5,
                            ...(blnIsActionColumn ? {
                              overflowWrap: "normal",
                              whiteSpace: "nowrap",
                              "& .MuiIconButton-root": {
                                flexShrink: 0
                              },
                              "& .MuiSvgIcon-root": {
                                display: "block"
                              }
                            } : {})
                          }}
                        >
                          {blnIsActionColumn ? (
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: strAlign === "right" ? "flex-end" : strAlign === "center" ? "center" : "flex-start", width: "100%" }}>
                              {row[column.field]}
                            </Box>
                          ) : row[column.field]}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {footerContent ? (
          <Box sx={{ position: "sticky", bottom: 0, bgcolor: "background.paper", zIndex: 2 }}>
            {footerContent}
          </Box>
        ) : null}
      </Box>

    </Stack>
  );

  if (!withPaper) {
    return table;
  }

  return (
    <Paper sx={{ p: 3, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", ...sx }}>
      {table}
    </Paper>
  );
}
