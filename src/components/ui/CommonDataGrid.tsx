"use client";

import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
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
import { ReactNode, isValidElement, useEffect, useMemo, useState } from "react";
import dicConstant from "@/constants/Constant.json";
import styles from "@/components/master/MasterScreen.module.css";

type CellAlign = "left" | "right" | "center";

export type DataGridColumn<T extends Record<string, ReactNode>> = {
  field: keyof T;
  headerName: ReactNode;
  align?: CellAlign;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
};

export type CommonDataGridProps<T extends Record<string, ReactNode>> = {
  columns: DataGridColumn<T>[];
  rows: T[];
  toolbarLeft?: ReactNode;
  getRowSx?: (row: T) => SxProps<Theme>;
  rowIdField?: keyof T;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  exportFileName?: string;
  showExportOptions?: boolean;
  showPaginationSummary?: boolean;
  emptyMessage?: string;
  withPaper?: boolean;
  sx?: SxProps<Theme>;
};

// Renders a generic client-side data grid with filter, sort, pagination, and optional export.
export default function CommonDataGrid<T extends Record<string, ReactNode>>({
  columns,
  rows,
  toolbarLeft,
  getRowSx,
  rowIdField,
  defaultPageSize = 5,
  pageSizeOptions = [5, 10, 25],
  exportFileName = dicConstant.commonDataGrid.defaultExportFileName,
  showExportOptions = false,
  showPaginationSummary = false,
  emptyMessage = dicConstant.commonDataGrid.emptyMessage,
  withPaper = true,
  sx
}: CommonDataGridProps<T>) {
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

    return [...columns].sort((objLeft, objRight) => getColumnPriority(objLeft) - getColumnPriority(objRight));
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
      const aValue = a[sortBy];
      const bValue = b[sortBy];

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
  }, [rows, sortBy, sortDirection]);

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
    <Stack spacing={2.5} sx={{ minHeight: 0, height: "100%" }}>
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={1.5}
        alignItems={{ lg: "center" }}
        justifyContent="space-between"
        sx={{ px: 1.5, pt: 1.25 }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }} sx={{ width: { xs: "100%", lg: "auto" } }}>
          <Box sx={{ display: "flex", alignItems: "center", minHeight: 40 }}>{toolbarLeft}</Box>
          {showExportOptions ? (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={handleExportExcel}>
                {dicConstant.common.exportExcel}
              </Button>
              <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={handleExportPdf}>
                {dicConstant.common.exportPdf}
              </Button>
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
              <Typography className={styles.paginationLabel}>
                {dicConstant.common.rowsPerPage}
              </Typography>
              <TextField
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
                  <MenuItem key={intOption} value={String(intOption)}>
                    {intOption}
                  </MenuItem>
                ))}
              </TextField>
              <Typography className={styles.paginationRange}>
                {filteredAndSortedRows.length === 0
                  ? `0 ${dicConstant.common.paginationSeparator} 0`
                  : `${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, filteredAndSortedRows.length)} ${dicConstant.common.paginationSeparator} ${filteredAndSortedRows.length}`}
              </Typography>
            </Box>
            <Pagination
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
          size="small"
          stickyHeader
          sx={{
            borderCollapse: "separate",
            borderSpacing: 0,
            minWidth: Math.max(intMinimumTableWidth, 980),
            width: "100%"
          }}
        >
          <TableHead>
            <TableRow>
              {orderedColumns.map((column) => {
                const strField = String(column.field);
                const strAlign = column.align ?? (strField === "select" || strField === "action" || strField === "rowActions" ? "center" : "left");
                return (
                  <TableCell
                    key={String(column.field)}
                    align={strAlign}
                    sx={{
                      width: column.width,
                      bgcolor: "background.paper",
                      color: "text.secondary",
                      fontWeight: 600,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      whiteSpace: "nowrap",
                      verticalAlign: "middle"
                    }}
                  >
                    {column.sortable === false ? (
                      <Box sx={{ display: "inline-flex", alignItems: "center", justifyContent: strAlign === "center" ? "center" : "flex-start", width: "100%" }}>
                        {column.headerName}
                      </Box>
                    ) : (
                      <TableSortLabel
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
          <TableBody>
            {filteredAndSortedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={orderedColumns.length} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row, index) => (
                <TableRow
                  key={rowIdField ? String(row[rowIdField]) : `${page}-${index}`}
                  hover
                  sx={[
                    {
                      "& td": {
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        verticalAlign: "middle",
                        whiteSpace: "nowrap"
                      }
                    },
                    getRowSx?.(row) ?? {}
                  ]}
                >
                  {orderedColumns.map((column) => {
                    const strField = String(column.field);
                    const strAlign = column.align ?? (strField === "select" || strField === "action" || strField === "rowActions" ? "center" : "left");
                    return (
                      <TableCell key={`${String(column.field)}-${index}`} align={strAlign}>
                        {row[column.field]}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
