(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/common/CommonDataGrid.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CommonDataGrid
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$PictureAsPdfOutlined$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/PictureAsPdfOutlined.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$Search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/Search.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$TableViewOutlined$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/TableViewOutlined.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Box/Box.js [app-client] (ecmascript) <export default as Box>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Button/Button.js [app-client] (ecmascript) <export default as Button>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$InputAdornment$2f$InputAdornment$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__InputAdornment$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/InputAdornment/InputAdornment.js [app-client] (ecmascript) <export default as InputAdornment>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$Paper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Paper$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Paper/Paper.js [app-client] (ecmascript) <export default as Paper>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Stack/Stack.js [app-client] (ecmascript) <export default as Stack>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Table$2f$Table$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Table$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Table/Table.js [app-client] (ecmascript) <export default as Table>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableBody$2f$TableBody$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableBody$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/TableBody/TableBody.js [app-client] (ecmascript) <export default as TableBody>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableCell$2f$TableCell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableCell$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/TableCell/TableCell.js [app-client] (ecmascript) <export default as TableCell>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableHead$2f$TableHead$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableHead$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/TableHead/TableHead.js [app-client] (ecmascript) <export default as TableHead>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TablePagination$2f$TablePagination$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TablePagination$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/TablePagination/TablePagination.js [app-client] (ecmascript) <export default as TablePagination>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableRow$2f$TableRow$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableRow$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/TableRow/TableRow.js [app-client] (ecmascript) <export default as TableRow>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableSortLabel$2f$TableSortLabel$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableSortLabel$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/TableSortLabel/TableSortLabel.js [app-client] (ecmascript) <export default as TableSortLabel>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/TextField/TextField.js [app-client] (ecmascript) <export default as TextField>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__ = __turbopack_context__.i("[project]/constants/Constant.json (json)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
function CommonDataGrid({ columns, rows, toolbarLeft, rowIdField, defaultPageSize = 5, pageSizeOptions = [
    5,
    10,
    25
], exportFileName = __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].commonDataGrid.defaultExportFileName, showExportOptions = false, emptyMessage = __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].commonDataGrid.emptyMessage, withPaper = true, sx }) {
    _s();
    // Functional responsibility:
    // - Render a reusable table with client-side filter, sort, pagination, and optional exports.
    // Inputs:
    // - columns/rows define table shape + data.
    // - rowIdField controls stable row keys.
    // - showExportOptions/exportFileName control export UI and file naming.
    // Output:
    // - Renders tabular UI (optionally wrapped in Paper) and export actions.
    // Failure behavior:
    // - If data is empty after filtering, renders emptyMessage row (no exception thrown).
    // - If PDF popup is blocked, export handler safely returns without crashing.
    const [searchTerm, setSearchTerm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [sortBy, setSortBy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [sortDirection, setSortDirection] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("asc");
    const [page, setPage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [rowsPerPage, setRowsPerPage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(defaultPageSize);
    const orderedColumns = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "CommonDataGrid.useMemo[orderedColumns]": ()=>{
            const lstActionColumns = columns.filter({
                "CommonDataGrid.useMemo[orderedColumns].lstActionColumns": (column)=>String(column.field) === "action"
            }["CommonDataGrid.useMemo[orderedColumns].lstActionColumns"]);
            const lstOtherColumns = columns.filter({
                "CommonDataGrid.useMemo[orderedColumns].lstOtherColumns": (column)=>String(column.field) !== "action"
            }["CommonDataGrid.useMemo[orderedColumns].lstOtherColumns"]);
            return [
                ...lstActionColumns,
                ...lstOtherColumns
            ];
        }
    }["CommonDataGrid.useMemo[orderedColumns]"], [
        columns
    ]);
    const filteredAndSortedRows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "CommonDataGrid.useMemo[filteredAndSortedRows]": ()=>{
            // Logical flow:
            // 1) Apply text filtering on filterable columns.
            // 2) Apply sorting on the selected sortable column.
            const searchableColumns = orderedColumns.filter({
                "CommonDataGrid.useMemo[filteredAndSortedRows].searchableColumns": (column)=>column.filterable !== false
            }["CommonDataGrid.useMemo[filteredAndSortedRows].searchableColumns"]);
            const filtered = rows.filter({
                "CommonDataGrid.useMemo[filteredAndSortedRows].filtered": (row)=>{
                    if (!searchTerm.trim()) {
                        return true;
                    }
                    const strQuery = searchTerm.toLowerCase();
                    return searchableColumns.some({
                        "CommonDataGrid.useMemo[filteredAndSortedRows].filtered": (column)=>{
                            const value = row[column.field];
                            if (typeof value === "string" || typeof value === "number") {
                                return String(value).toLowerCase().includes(strQuery);
                            }
                            return false;
                        }
                    }["CommonDataGrid.useMemo[filteredAndSortedRows].filtered"]);
                }
            }["CommonDataGrid.useMemo[filteredAndSortedRows].filtered"]);
            if (!sortBy) {
                return filtered;
            }
            const sorted = [
                ...filtered
            ].sort({
                "CommonDataGrid.useMemo[filteredAndSortedRows].sorted": (a, b)=>{
                    const aValue = a[sortBy];
                    const bValue = b[sortBy];
                    if (typeof aValue !== "string" && typeof aValue !== "number" || typeof bValue !== "string" && typeof bValue !== "number") {
                        return 0;
                    }
                    if (aValue < bValue) {
                        return sortDirection === "asc" ? -1 : 1;
                    }
                    if (aValue > bValue) {
                        return sortDirection === "asc" ? 1 : -1;
                    }
                    return 0;
                }
            }["CommonDataGrid.useMemo[filteredAndSortedRows].sorted"]);
            return sorted;
        }
    }["CommonDataGrid.useMemo[filteredAndSortedRows]"], [
        orderedColumns,
        rows,
        searchTerm,
        sortBy,
        sortDirection
    ]);
    const handleSort = (field, sortable)=>{
        if (sortable === false) {
            return;
        }
        if (sortBy === field) {
            setSortDirection((prev)=>prev === "asc" ? "desc" : "asc");
            return;
        }
        setSortBy(field);
        setSortDirection("asc");
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CommonDataGrid.useEffect": ()=>{
            setPage(0);
        }
    }["CommonDataGrid.useEffect"], [
        searchTerm,
        sortBy,
        sortDirection,
        rowsPerPage
    ]);
    const paginatedRows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "CommonDataGrid.useMemo[paginatedRows]": ()=>{
            // Logical flow:
            // Slice filtered/sorted rows for current page window.
            const intStart = page * rowsPerPage;
            return filteredAndSortedRows.slice(intStart, intStart + rowsPerPage);
        }
    }["CommonDataGrid.useMemo[paginatedRows]"], [
        filteredAndSortedRows,
        page,
        rowsPerPage
    ]);
    const exportColumns = orderedColumns.filter((column)=>column.exportable !== false);
    const toText = (value)=>{
        if (value === null || value === undefined) {
            return "";
        }
        if (typeof value === "string" || typeof value === "number") {
            return String(value);
        }
        if (Array.isArray(value)) {
            return value.map((item)=>toText(item)).join(" ");
        }
        if (/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isValidElement"])(value)) {
            const dicProps = value.props;
            return toText(dicProps.children);
        }
        return "";
    };
    const toCsvCell = (value)=>`"${value.replace(/"/g, '""')}"`;
    const handleExportExcel = ()=>{
        // Output:
        // - Downloads a UTF-8 CSV file (Excel-friendly) containing exported columns + filtered/sorted rows.
        // Failure behavior:
        // - If browser blocks download, no throw from this module.
        const strHeaders = exportColumns.map((column)=>toCsvCell(column.headerName)).join(",");
        const strBody = filteredAndSortedRows.map((row)=>exportColumns.map((column)=>toCsvCell(toText(row[column.field]))).join(",")).join("\n");
        const strCsvContent = `${strHeaders}\n${strBody}`;
        const blob = new Blob([
            `\uFEFF${strCsvContent}`
        ], {
            type: "text/csv;charset=utf-8;"
        });
        const strUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = strUrl;
        link.download = `${exportFileName}.csv`;
        link.click();
        URL.revokeObjectURL(strUrl);
    };
    const handleExportPdf = ()=>{
        // Output:
        // - Opens print-friendly page for PDF save/print.
        // Failure behavior:
        // - If popup blocked (window.open returns null), exits gracefully.
        const strHeaderHtml = exportColumns.map((column)=>`<th>${column.headerName}</th>`).join("");
        const strRowHtml = filteredAndSortedRows.map((row)=>`<tr>${exportColumns.map((column)=>`<td>${toText(row[column.field])}</td>`).join("")}</tr>`).join("");
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
    const table = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
        spacing: 2.5,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
                direction: {
                    xs: "column",
                    sm: "row"
                },
                spacing: 1.5,
                alignItems: {
                    sm: "center"
                },
                justifyContent: "space-between",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__["Box"], {
                        sx: {
                            display: "flex",
                            alignItems: "center",
                            minHeight: 40
                        },
                        children: toolbarLeft
                    }, void 0, false, {
                        fileName: "[project]/components/common/CommonDataGrid.tsx",
                        lineNumber: 242,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
                        direction: {
                            xs: "column",
                            sm: "row"
                        },
                        spacing: 1,
                        alignItems: {
                            sm: "center"
                        },
                        sx: {
                            width: {
                                xs: "100%",
                                sm: "auto"
                            }
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__["TextField"], {
                                placeholder: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].commonDataGrid.filterPlaceholder,
                                value: searchTerm,
                                onChange: (event)=>setSearchTerm(event.target.value),
                                sx: {
                                    minWidth: {
                                        xs: "100%",
                                        sm: 320
                                    },
                                    maxWidth: 420
                                },
                                InputProps: {
                                    startAdornment: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$InputAdornment$2f$InputAdornment$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__InputAdornment$3e$__["InputAdornment"], {
                                        position: "start",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$Search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                            fontSize: "small"
                                        }, void 0, false, {
                                            fileName: "[project]/components/common/CommonDataGrid.tsx",
                                            lineNumber: 252,
                                            columnNumber: 19
                                        }, void 0)
                                    }, void 0, false, {
                                        fileName: "[project]/components/common/CommonDataGrid.tsx",
                                        lineNumber: 251,
                                        columnNumber: 17
                                    }, void 0)
                                }
                            }, void 0, false, {
                                fileName: "[project]/components/common/CommonDataGrid.tsx",
                                lineNumber: 244,
                                columnNumber: 11
                            }, this),
                            showExportOptions ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
                                direction: "row",
                                spacing: 1,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                        variant: "outlined",
                                        size: "small",
                                        startIcon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$TableViewOutlined$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                            fileName: "[project]/components/common/CommonDataGrid.tsx",
                                            lineNumber: 259,
                                            columnNumber: 66
                                        }, void 0),
                                        onClick: handleExportExcel,
                                        children: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].commonDataGrid.exportExcel
                                    }, void 0, false, {
                                        fileName: "[project]/components/common/CommonDataGrid.tsx",
                                        lineNumber: 259,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                        variant: "outlined",
                                        size: "small",
                                        startIcon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$PictureAsPdfOutlined$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                            fileName: "[project]/components/common/CommonDataGrid.tsx",
                                            lineNumber: 262,
                                            columnNumber: 66
                                        }, void 0),
                                        onClick: handleExportPdf,
                                        children: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].commonDataGrid.exportPdf
                                    }, void 0, false, {
                                        fileName: "[project]/components/common/CommonDataGrid.tsx",
                                        lineNumber: 262,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/common/CommonDataGrid.tsx",
                                lineNumber: 258,
                                columnNumber: 13
                            }, this) : null
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/common/CommonDataGrid.tsx",
                        lineNumber: 243,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/common/CommonDataGrid.tsx",
                lineNumber: 241,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Table$2f$Table$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Table$3e$__["Table"], {
                size: "small",
                sx: {
                    borderCollapse: "separate",
                    borderSpacing: 0
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableHead$2f$TableHead$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableHead$3e$__["TableHead"], {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableRow$2f$TableRow$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableRow$3e$__["TableRow"], {
                            children: orderedColumns.map((column)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableCell$2f$TableCell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableCell$3e$__["TableCell"], {
                                    align: column.align ?? "left",
                                    sx: {
                                        width: column.width,
                                        bgcolor: "background.default",
                                        color: "text.secondary",
                                        fontWeight: 600,
                                        borderBottom: "1px solid",
                                        borderColor: "divider"
                                    },
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableSortLabel$2f$TableSortLabel$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableSortLabel$3e$__["TableSortLabel"], {
                                        active: sortBy === column.field,
                                        direction: sortBy === column.field ? sortDirection : "asc",
                                        onClick: ()=>handleSort(column.field, column.sortable),
                                        hideSortIcon: column.sortable === false,
                                        children: column.headerName
                                    }, void 0, false, {
                                        fileName: "[project]/components/common/CommonDataGrid.tsx",
                                        lineNumber: 286,
                                        columnNumber: 17
                                    }, this)
                                }, String(column.field), false, {
                                    fileName: "[project]/components/common/CommonDataGrid.tsx",
                                    lineNumber: 274,
                                    columnNumber: 15
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/components/common/CommonDataGrid.tsx",
                            lineNumber: 272,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/common/CommonDataGrid.tsx",
                        lineNumber: 271,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableBody$2f$TableBody$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableBody$3e$__["TableBody"], {
                        children: filteredAndSortedRows.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableRow$2f$TableRow$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableRow$3e$__["TableRow"], {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableCell$2f$TableCell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableCell$3e$__["TableCell"], {
                                colSpan: orderedColumns.length,
                                align: "center",
                                sx: {
                                    py: 4,
                                    color: "text.secondary"
                                },
                                children: emptyMessage
                            }, void 0, false, {
                                fileName: "[project]/components/common/CommonDataGrid.tsx",
                                lineNumber: 301,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/common/CommonDataGrid.tsx",
                            lineNumber: 300,
                            columnNumber: 13
                        }, this) : paginatedRows.map((row, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableRow$2f$TableRow$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableRow$3e$__["TableRow"], {
                                hover: true,
                                sx: {
                                    "& td": {
                                        borderBottom: "1px solid",
                                        borderColor: "divider"
                                    }
                                },
                                children: orderedColumns.map((column)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableCell$2f$TableCell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableCell$3e$__["TableCell"], {
                                        align: column.align ?? "left",
                                        children: row[column.field]
                                    }, `${String(column.field)}-${index}`, false, {
                                        fileName: "[project]/components/common/CommonDataGrid.tsx",
                                        lineNumber: 318,
                                        columnNumber: 19
                                    }, this))
                            }, rowIdField ? String(row[rowIdField]) : `${page}-${index}`, false, {
                                fileName: "[project]/components/common/CommonDataGrid.tsx",
                                lineNumber: 307,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/components/common/CommonDataGrid.tsx",
                        lineNumber: 298,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/common/CommonDataGrid.tsx",
                lineNumber: 270,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TablePagination$2f$TablePagination$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TablePagination$3e$__["TablePagination"], {
                component: "div",
                count: filteredAndSortedRows.length,
                page: page,
                onPageChange: (_, nextPage)=>setPage(nextPage),
                rowsPerPage: rowsPerPage,
                onRowsPerPageChange: (event)=>{
                    setRowsPerPage(parseInt(event.target.value, 10));
                },
                rowsPerPageOptions: pageSizeOptions,
                sx: {
                    borderTop: "1px solid",
                    borderColor: "divider",
                    pt: 0.5
                }
            }, void 0, false, {
                fileName: "[project]/components/common/CommonDataGrid.tsx",
                lineNumber: 328,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/common/CommonDataGrid.tsx",
        lineNumber: 240,
        columnNumber: 5
    }, this);
    if (!withPaper) {
        return table;
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$Paper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Paper$3e$__["Paper"], {
        sx: {
            p: 3,
            ...sx
        },
        children: table
    }, void 0, false, {
        fileName: "[project]/components/common/CommonDataGrid.tsx",
        lineNumber: 348,
        columnNumber: 5
    }, this);
}
_s(CommonDataGrid, "pNFkGBWZ9JQKqBjuJCyFtrRRTFA=");
_c = CommonDataGrid;
var _c;
__turbopack_context__.k.register(_c, "CommonDataGrid");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/(dashboard)/employees/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>EmployeesPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$VisibilityOutlined$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/VisibilityOutlined.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Box/Box.js [app-client] (ecmascript) <export default as Box>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Button/Button.js [app-client] (ecmascript) <export default as Button>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$IconButton$2f$IconButton$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__IconButton$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/IconButton/IconButton.js [app-client] (ecmascript) <export default as IconButton>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Stack/Stack.js [app-client] (ecmascript) <export default as Stack>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Tooltip$2f$Tooltip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Tooltip$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Tooltip/Tooltip.js [app-client] (ecmascript) <export default as Tooltip>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Typography/Typography.js [app-client] (ecmascript) <export default as Typography>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$CommonDataGrid$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/common/CommonDataGrid.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__ = __turbopack_context__.i("[project]/constants/Constant.json (json)");
"use client";
;
;
;
;
;
;
const employees = [
    {
        id: "E001",
        name: "Ava Johnson",
        department: "Engineering",
        role: "Frontend Developer"
    },
    {
        id: "E002",
        name: "Liam Smith",
        department: "HR",
        role: "HR Executive"
    },
    {
        id: "E003",
        name: "Noah Davis",
        department: "Finance",
        role: "Accountant"
    }
];
function EmployeesPage() {
    const columns = [
        {
            field: "id",
            headerName: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].employees.grid.id
        },
        {
            field: "name",
            headerName: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].employees.grid.name
        },
        {
            field: "department",
            headerName: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].employees.grid.department
        },
        {
            field: "role",
            headerName: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].employees.grid.role
        },
        {
            field: "action",
            headerName: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].employees.grid.action,
            sortable: false,
            filterable: false,
            exportable: false,
            align: "center"
        }
    ];
    const rows = employees.map((dicEmployee)=>({
            id: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                sx: {
                    color: "#94a3b8",
                    fontWeight: 500
                },
                children: dicEmployee.id
            }, void 0, false, {
                fileName: "[project]/app/(dashboard)/employees/page.tsx",
                lineNumber: 42,
                columnNumber: 9
            }, this),
            name: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                sx: {
                    color: "#0f172a",
                    fontWeight: 600
                },
                children: dicEmployee.name
            }, void 0, false, {
                fileName: "[project]/app/(dashboard)/employees/page.tsx",
                lineNumber: 43,
                columnNumber: 11
            }, this),
            department: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                sx: {
                    color: "#64748b"
                },
                children: dicEmployee.department
            }, void 0, false, {
                fileName: "[project]/app/(dashboard)/employees/page.tsx",
                lineNumber: 44,
                columnNumber: 17
            }, this),
            role: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                sx: {
                    color: "#64748b"
                },
                children: dicEmployee.role
            }, void 0, false, {
                fileName: "[project]/app/(dashboard)/employees/page.tsx",
                lineNumber: 45,
                columnNumber: 11
            }, this),
            action: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Tooltip$2f$Tooltip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Tooltip$3e$__["Tooltip"], {
                title: "View details",
                arrow: true,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$IconButton$2f$IconButton$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__IconButton$3e$__["IconButton"], {
                    component: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"],
                    href: `/employees/${dicEmployee.id}`,
                    "aria-label": "View details",
                    size: "small",
                    sx: {
                        width: 34,
                        height: 34,
                        transition: "all 0.2s ease",
                        "&:hover": {
                            backgroundColor: "rgba(37,99,235,0.08)"
                        }
                    },
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$VisibilityOutlined$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        sx: {
                            fontSize: 20,
                            color: "#475569"
                        }
                    }, void 0, false, {
                        fileName: "[project]/app/(dashboard)/employees/page.tsx",
                        lineNumber: 60,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/app/(dashboard)/employees/page.tsx",
                    lineNumber: 48,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/(dashboard)/employees/page.tsx",
                lineNumber: 47,
                columnNumber: 7
            }, this),
            rowId: dicEmployee.id
        }));
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
        spacing: 4,
        sx: {
            animation: "employeesFadeIn 200ms ease-out",
            "@keyframes employeesFadeIn": {
                from: {
                    opacity: 0,
                    transform: "translateY(8px)"
                },
                to: {
                    opacity: 1,
                    transform: "translateY(0)"
                }
            }
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__["Box"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                        sx: {
                            fontSize: {
                                xs: 30,
                                md: 34
                            },
                            fontWeight: 700,
                            lineHeight: 1.15
                        },
                        children: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].employees.pageTitle
                    }, void 0, false, {
                        fileName: "[project]/app/(dashboard)/employees/page.tsx",
                        lineNumber: 79,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                        sx: {
                            color: "#64748b",
                            mt: 1
                        },
                        children: "Manage and monitor your workforce."
                    }, void 0, false, {
                        fileName: "[project]/app/(dashboard)/employees/page.tsx",
                        lineNumber: 82,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/(dashboard)/employees/page.tsx",
                lineNumber: 78,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$CommonDataGrid$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                columns: columns,
                rows: rows,
                rowIdField: "rowId",
                toolbarLeft: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                    variant: "contained",
                    href: "/employees/new",
                    sx: {
                        height: 48,
                        px: 2.5,
                        borderRadius: "14px",
                        backgroundColor: "#2563eb",
                        boxShadow: "0 6px 16px rgba(37,99,235,0.35)",
                        transition: "all 0.15s ease",
                        "&:hover": {
                            transform: "translateY(-1px)",
                            backgroundColor: "#1d4ed8"
                        }
                    },
                    children: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].employees.addButton
                }, void 0, false, {
                    fileName: "[project]/app/(dashboard)/employees/page.tsx",
                    lineNumber: 90,
                    columnNumber: 11
                }, void 0),
                showExportOptions: true,
                exportFileName: "employees-list",
                withPaper: true
            }, void 0, false, {
                fileName: "[project]/app/(dashboard)/employees/page.tsx",
                lineNumber: 85,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/(dashboard)/employees/page.tsx",
        lineNumber: 68,
        columnNumber: 5
    }, this);
}
_c = EmployeesPage;
var _c;
__turbopack_context__.k.register(_c, "EmployeesPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_b7ee9d4a._.js.map