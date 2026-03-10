"use client";

import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import SearchIcon from "@mui/icons-material/Search";
import TableViewOutlinedIcon from "@mui/icons-material/TableViewOutlined";
import {
  Button,
  InputAdornment,
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
  Theme
} from "@mui/material";
import { ReactNode, isValidElement, useEffect, useMemo, useState } from "react";
import dicConstant from "@/constants/Constant.json";

type CellAlign = "left" | "right" | "center";

export type PremiumDataTableColumn<T extends Record<string, unknown>> = {
  field: keyof T;
  headerName: string;
  align?: CellAlign;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
  renderCell?: (dicRow: T) => ReactNode;
  getSortValue?: (dicRow: T) => string | number;
  getFilterValue?: (dicRow: T) => string | number;
};

type PremiumDataTableProps<T extends Record<string, unknown>> = {
  columns: PremiumDataTableColumn<T>[];
  rows: T[];
  rowIdField?: keyof T;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  exportFileName?: string;
  showExportOptions?: boolean;
  emptyMessage?: string;
  sx?: SxProps<Theme>;
};

// Provides a premium SaaS data table with filter, sort, export, and pagination.
export default function PremiumDataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  rowIdField,
  defaultPageSize = 8,
  pageSizeOptions = [5, 10, 25],
  exportFileName = dicConstant.commonDataGrid.defaultExportFileName,
  showExportOptions = false,
  emptyMessage = dicConstant.commonDataGrid.emptyMessage,
  sx
}: PremiumDataTableProps<T>) {
  // Functional responsibility:
  // - Render premium table UI while preserving common grid capabilities.
  // Inputs:
  // - columns/rows/rowIdField for table binding.
  // - export/search/pagination options for behavior tuning.
  // Output:
  // - Styled enterprise-grade table with interactions.
  // Failure behavior:
  // - Empty states render gracefully.
  // - Export popup/download failures exit without crash.
  const [strSearchTerm, setStrSearchTerm] = useState("");
  const [strSortDirection, setStrSortDirection] = useState<"asc" | "desc">("asc");
  const [keySortBy, setKeySortBy] = useState<keyof T | null>(null);
  const [intPage, setIntPage] = useState(0);
  const [intRowsPerPage, setIntRowsPerPage] = useState(defaultPageSize);
  const orderedColumns = useMemo(() => {
    const lstActionColumns = columns.filter((dicColumn) => String(dicColumn.field) === "action");
    const lstOtherColumns = columns.filter((dicColumn) => String(dicColumn.field) !== "action");
    return [...lstActionColumns, ...lstOtherColumns];
  }, [columns]);

  const toText = (value: unknown): string => {
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

  const lstFilteredSortedRows = useMemo(() => {
    // Logical flow:
    // 1) Filter rows by search input against filterable columns.
    // 2) Apply local sort if sort key is selected.
    const lstSearchableColumns = orderedColumns.filter((dicColumn) => dicColumn.filterable !== false);

    const lstFilteredRows = rows.filter((dicRow) => {
      if (!strSearchTerm.trim()) {
        return true;
      }
      const strQuery = strSearchTerm.toLowerCase();

      return lstSearchableColumns.some((dicColumn) => {
        const value =
          typeof dicColumn.getFilterValue === "function"
            ? dicColumn.getFilterValue(dicRow)
            : (dicRow[dicColumn.field] as unknown);
        if (typeof value === "string" || typeof value === "number") {
          return String(value).toLowerCase().includes(strQuery);
        }
        return false;
      });
    });

    if (!keySortBy) {
      return lstFilteredRows;
    }

    const dicSortColumn = orderedColumns.find((dicColumn) => dicColumn.field === keySortBy);

    return [...lstFilteredRows].sort((dicA, dicB) => {
      const valueA =
        dicSortColumn && typeof dicSortColumn.getSortValue === "function"
          ? dicSortColumn.getSortValue(dicA)
          : (dicA[keySortBy] as unknown);
      const valueB =
        dicSortColumn && typeof dicSortColumn.getSortValue === "function"
          ? dicSortColumn.getSortValue(dicB)
          : (dicB[keySortBy] as unknown);

      if ((typeof valueA !== "string" && typeof valueA !== "number") || (typeof valueB !== "string" && typeof valueB !== "number")) {
        return 0;
      }
      if (valueA < valueB) {
        return strSortDirection === "asc" ? -1 : 1;
      }
      if (valueA > valueB) {
        return strSortDirection === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [orderedColumns, keySortBy, rows, strSearchTerm, strSortDirection]);

  const lstExportColumns = orderedColumns.filter((dicColumn) => dicColumn.exportable !== false);

  useEffect(() => {
    setIntPage(0);
  }, [strSearchTerm, keySortBy, strSortDirection, intRowsPerPage]);

  const lstVisibleRows = useMemo(() => {
    const intStart = intPage * intRowsPerPage;
    return lstFilteredSortedRows.slice(intStart, intStart + intRowsPerPage);
  }, [intPage, intRowsPerPage, lstFilteredSortedRows]);

  const toCsvCell = (strValue: string) => `"${strValue.replace(/"/g, '""')}"`;

  const handleSort = (keyField: keyof T, intIsSortable: boolean | undefined) => {
    if (intIsSortable === false) {
      return;
    }
    if (keySortBy === keyField) {
      setStrSortDirection((strPrev) => (strPrev === "asc" ? "desc" : "asc"));
      return;
    }
    setKeySortBy(keyField);
    setStrSortDirection("asc");
  };

  const handleExportExcel = () => {
    const strHeader = lstExportColumns.map((dicColumn) => toCsvCell(dicColumn.headerName)).join(",");
    const strBody = lstFilteredSortedRows
      .map((dicRow) => {
        return lstExportColumns
          .map((dicColumn) => {
            const value =
              typeof dicColumn.getSortValue === "function"
                ? dicColumn.getSortValue(dicRow)
                : (dicRow[dicColumn.field] as unknown);
            return toCsvCell(toText(value));
          })
          .join(",");
      })
      .join("\n");

    const blob = new Blob([`\uFEFF${strHeader}\n${strBody}`], { type: "text/csv;charset=utf-8;" });
    const strUrl = URL.createObjectURL(blob);
    const dicLink = document.createElement("a");
    dicLink.href = strUrl;
    dicLink.download = `${exportFileName}.csv`;
    dicLink.click();
    URL.revokeObjectURL(strUrl);
  };

  const handleExportPdf = () => {
    const strHeaderHtml = lstExportColumns.map((dicColumn) => `<th>${dicColumn.headerName}</th>`).join("");
    const strRowsHtml = lstFilteredSortedRows
      .map((dicRow) => {
        const strCells = lstExportColumns
          .map((dicColumn) => {
            const value =
              typeof dicColumn.getSortValue === "function"
                ? dicColumn.getSortValue(dicRow)
                : (dicRow[dicColumn.field] as unknown);
            return `<td>${toText(value)}</td>`;
          })
          .join("");
        return `<tr>${strCells}</tr>`;
      })
      .join("");

    const dicWindow = window.open("", "_blank", "width=1000,height=700");
    if (!dicWindow) {
      return;
    }

    dicWindow.document.write(`
      <html>
        <head>
          <title>${exportFileName}</title>
          <style>
            body { font-family: Inter, Arial, sans-serif; padding: 24px; color: #0f172a; }
            h2 { margin: 0 0 16px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f8fafc; color: #475569; }
          </style>
        </head>
        <body>
          <h2>${exportFileName}</h2>
          <table>
            <thead><tr>${strHeaderHtml}</tr></thead>
            <tbody>${strRowsHtml}</tbody>
          </table>
        </body>
      </html>
    `);
    dicWindow.document.close();
    dicWindow.focus();
    dicWindow.print();
  };

  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 3,
        backgroundColor: "#ffffff",
        boxShadow: "0 12px 30px rgba(0,0,0,0.06)",
        transition: "all 0.2s ease",
        "&:hover": {
          boxShadow: "0 14px 34px rgba(0,0,0,0.07)"
        },
        ...sx
      }}
    >
      <Stack spacing={3}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} justifyContent="space-between">
          <TextField
            value={strSearchTerm}
            onChange={(event) => setStrSearchTerm(event.target.value)}
            placeholder={dicConstant.commonDataGrid.filterPlaceholder}
            sx={{
              width: { xs: "100%", sm: 320 },
              "& .MuiOutlinedInput-root": {
                height: 44,
                borderRadius: "12px",
                transition: "all 0.2s ease",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#e2e8f0"
                },
                "&.Mui-focused": {
                  backgroundColor: "#f8fafc",
                  boxShadow: "0 0 0 3px rgba(37,99,235,0.2)"
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#2563eb"
                }
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#64748b", fontSize: 18 }} />
                </InputAdornment>
              )
            }}
          />

          {showExportOptions ? (
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<TableViewOutlinedIcon sx={{ fontSize: 16 }} />}
                onClick={handleExportExcel}
                sx={{
                  minHeight: 36,
                  px: 1.5,
                  borderRadius: "10px",
                  color: "#475569",
                  borderColor: "#cbd5e1",
                  transition: "all 0.2s ease",
                  "&:hover": { backgroundColor: "#f8fafc", borderColor: "#94a3b8" }
                }}
              >
                {dicConstant.commonDataGrid.exportExcel}
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<PictureAsPdfOutlinedIcon sx={{ fontSize: 16 }} />}
                onClick={handleExportPdf}
                sx={{
                  minHeight: 36,
                  px: 1.5,
                  borderRadius: "10px",
                  color: "#475569",
                  borderColor: "#cbd5e1",
                  transition: "all 0.2s ease",
                  "&:hover": { backgroundColor: "#f8fafc", borderColor: "#94a3b8" }
                }}
              >
                {dicConstant.commonDataGrid.exportPdf}
              </Button>
            </Stack>
          ) : null}
        </Stack>

        <Table size="small" sx={{ borderCollapse: "separate", borderSpacing: 0 }}>
          <TableHead>
            <TableRow sx={{ "& th": { height: 56, backgroundColor: "#f8fafc", borderColor: "#e2e8f0" } }}>
              {orderedColumns.map((dicColumn) => (
                <TableCell
                  key={String(dicColumn.field)}
                  align={dicColumn.align ?? "left"}
                  sx={{
                    width: dicColumn.width,
                    color: "#475569",
                    fontWeight: 600,
                    fontSize: 14,
                    borderBottom: "1px solid #e2e8f0"
                  }}
                >
                  <TableSortLabel
                    active={keySortBy === dicColumn.field}
                    direction={keySortBy === dicColumn.field ? strSortDirection : "asc"}
                    onClick={() => handleSort(dicColumn.field, dicColumn.sortable)}
                    hideSortIcon={dicColumn.sortable === false}
                  >
                    {dicColumn.headerName}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {lstFilteredSortedRows.length === 0 ? (
              <TableRow>
                <TableCell align="center" colSpan={orderedColumns.length} sx={{ py: 4, color: "#64748b" }}>
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              lstVisibleRows.map((dicRow, intIndex) => (
                <TableRow
                  key={rowIdField ? String(dicRow[rowIdField]) : `${intPage}-${intIndex}`}
                  hover
                  sx={{
                    transition: "all 0.15s ease",
                    "& td": {
                      height: 58,
                      borderBottom: "1px solid #e2e8f0"
                    },
                    "&:hover": {
                      backgroundColor: "rgba(37,99,235,0.04)"
                    }
                  }}
                >
                  {orderedColumns.map((dicColumn) => (
                    <TableCell key={`${String(dicColumn.field)}-${intIndex}`} align={dicColumn.align ?? "left"}>
                      {typeof dicColumn.renderCell === "function"
                        ? dicColumn.renderCell(dicRow)
                        : (dicRow[dicColumn.field] as ReactNode)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={lstFilteredSortedRows.length}
          page={intPage}
          onPageChange={(_, intNextPage) => setIntPage(intNextPage)}
          rowsPerPage={intRowsPerPage}
          rowsPerPageOptions={pageSizeOptions}
          onRowsPerPageChange={(event) => setIntRowsPerPage(parseInt(event.target.value, 10))}
          sx={{
            borderTop: "1px solid #e2e8f0",
            pt: 0.5,
            "& .MuiTablePagination-toolbar": {
              justifyContent: "flex-end",
              color: "#64748b",
              fontWeight: 400
            },
            "& .MuiIconButton-root": {
              transition: "all 0.2s ease",
              "&:hover": {
                backgroundColor: "#f1f5f9"
              }
            }
          }}
        />
      </Stack>
    </Paper>
  );
}
