"use client";

import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import SearchIcon from "@mui/icons-material/Search";
import TableViewOutlinedIcon from "@mui/icons-material/TableViewOutlined";
import {
  Box,
  Button,
  InputAdornment,
  MenuItem,
  Paper,
  SxProps,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
  Theme
} from "@mui/material";
import { ReactNode, isValidElement, useEffect, useMemo, useState } from "react";
import dicConstant from "@/constants/Constant.json";

type CellAlign = "left" | "right" | "center";

export type DataGridColumn<T extends Record<string, ReactNode>> = {
  field: keyof T;
  headerName: string;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPageSize);
  const orderedColumns = useMemo(() => {
    const lstActionColumns = columns.filter((column) => String(column.field) === "action");
    const lstOtherColumns = columns.filter((column) => String(column.field) !== "action");
    return [...lstActionColumns, ...lstOtherColumns];
  }, [columns]);

  const filteredAndSortedRows = useMemo(() => {
    /*
    Logical flow:
    1) Apply text filtering on filterable columns.
    2) Apply sorting on the selected sortable column.
    */
    const searchableColumns = orderedColumns.filter((column) => column.filterable !== false);

    const filtered = rows.filter((row) => {
      if (!searchTerm.trim()) {
        return true;
      }
      const strQuery = searchTerm.toLowerCase();
      return searchableColumns.some((column) => {
        const value = row[column.field];
        if (typeof value === "string" || typeof value === "number") {
          return String(value).toLowerCase().includes(strQuery);
        }
        return false;
      });
    });

    if (!sortBy) {
      return filtered;
    }

    const sorted = [...filtered].sort((a, b) => {
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
  }, [orderedColumns, rows, searchTerm, sortBy, sortDirection]);

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
  }, [searchTerm, sortBy, sortDirection, rowsPerPage]);

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
    const strHeaders = exportColumns.map((column) => toCsvCell(column.headerName)).join(",");
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
    const strHeaderHtml = exportColumns.map((column) => `<th>${column.headerName}</th>`).join("");
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
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} justifyContent="space-between">
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }} sx={{ width: { xs: "100%", sm: "auto" } }}>
          <Box sx={{ display: "flex", alignItems: "center", minHeight: 40 }}>{toolbarLeft}</Box>
          {showExportOptions ? (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button variant="outlined" size="small" startIcon={<TableViewOutlinedIcon />} onClick={handleExportExcel}>
                {dicConstant.commonDataGrid.exportExcel}
              </Button>
              <Button variant="outlined" size="small" startIcon={<PictureAsPdfOutlinedIcon />} onClick={handleExportPdf}>
                {dicConstant.commonDataGrid.exportPdf}
              </Button>
            </Stack>
          ) : null}
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} sx={{ width: { xs: "100%", sm: "auto" } }}>
          <TextField
            placeholder={dicConstant.commonDataGrid.filterPlaceholder}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            sx={{ minWidth: { xs: "100%", sm: 320 }, maxWidth: 420 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
                )
              }}
            />
        </Stack>
      </Stack>

      {showPaginationSummary ? (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ sm: "center" }}
          justifyContent="space-between"
          sx={{
            px: 0.25,
            py: 0.5,
            borderRadius: 2,
            backgroundColor: "rgba(248,250,252,0.8)",
            border: "1px solid",
            borderColor: "divider"
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
            <Typography sx={{ fontSize: "0.9rem", color: "text.secondary", fontWeight: 600 }}>
              {dicConstant.common.rowsPerPage}
            </Typography>
            <TextField
              select
              size="small"
              value={String(rowsPerPage)}
              onChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              sx={{ width: 88 }}
            >
              {pageSizeOptions.map((intOption) => (
                <MenuItem key={intOption} value={String(intOption)}>
                  {intOption}
                </MenuItem>
              ))}
            </TextField>
            <Typography sx={{ fontSize: "0.9rem", color: "text.secondary" }}>
              {filteredAndSortedRows.length === 0
                ? `0 ${dicConstant.common.paginationSeparator} 0`
                : `${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, filteredAndSortedRows.length)} ${dicConstant.common.paginationSeparator} ${filteredAndSortedRows.length}`}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
            Page {filteredAndSortedRows.length === 0 ? 0 : page + 1} of {Math.max(1, Math.ceil(filteredAndSortedRows.length / rowsPerPage))}
          </Typography>
        </Stack>
      ) : null}

      <Table size="small" sx={{ borderCollapse: "separate", borderSpacing: 0 }}>
        <TableHead>
          <TableRow>
            {orderedColumns.map((column) => (
              <TableCell
                key={String(column.field)}
                align={column.align ?? "left"}
                sx={{
                  width: column.width,
                  bgcolor: "background.default",
                  color: "text.secondary",
                  fontWeight: 600,
                  borderBottom: "1px solid",
                  borderColor: "divider"
                }}
              >
                <TableSortLabel
                  active={sortBy === column.field}
                  direction={sortBy === column.field ? sortDirection : "asc"}
                  onClick={() => handleSort(column.field, column.sortable)}
                  hideSortIcon={column.sortable === false}
                >
                  {column.headerName}
                </TableSortLabel>
              </TableCell>
            ))}
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
                      borderColor: "divider"
                    }
                  },
                  getRowSx?.(row) ?? {}
                ]}
              >
                {orderedColumns.map((column) => (
                  <TableCell key={`${String(column.field)}-${index}`} align={column.align ?? "left"}>
                    {row[column.field]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <TablePagination
        component="div"
        count={filteredAndSortedRows.length}
        page={page}
        onPageChange={(_, nextPage) => setPage(nextPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
        }}
        rowsPerPageOptions={pageSizeOptions}
        sx={{ borderTop: "1px solid", borderColor: "divider", pt: 0.5 }}
      />
    </Stack>
  );

  if (!withPaper) {
    return table;
  }

  return (
    <Paper sx={{ p: 3, ...sx }}>
      {table}
    </Paper>
  );
}
