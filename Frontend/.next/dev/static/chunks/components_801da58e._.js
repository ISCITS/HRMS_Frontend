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
"[project]/components/departments/DepartmentMasterInlinePanel.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DepartmentMasterInlinePanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$EditOutlined$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/EditOutlined.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Button/Button.js [app-client] (ecmascript) <export default as Button>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$MenuItem$2f$MenuItem$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MenuItem$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/MenuItem/MenuItem.js [app-client] (ecmascript) <export default as MenuItem>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$Paper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Paper$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Paper/Paper.js [app-client] (ecmascript) <export default as Paper>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Stack/Stack.js [app-client] (ecmascript) <export default as Stack>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/TextField/TextField.js [app-client] (ecmascript) <export default as TextField>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Typography/Typography.js [app-client] (ecmascript) <export default as Typography>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$CommonDataGrid$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/common/CommonDataGrid.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__ = __turbopack_context__.i("[project]/constants/Constant.json (json)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
function DepartmentMasterInlinePanel() {
    _s();
    // Functional responsibility:
    // - Render department master grid with add/edit performed directly in table rows.
    // Inputs:
    // - Local in-memory department list and row editor form states.
    // Output:
    // - Inline editable grid with validated save/cancel actions.
    // Failure behavior:
    // - Invalid/duplicate values block save, show field errors, and focus first invalid input.
    const [lstDepartments, setLstDepartments] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([
        {
            id: "D001",
            code: "ENG",
            name: "Engineering",
            manager: "Ava Johnson",
            status: "Active",
            employeeCount: 42
        },
        {
            id: "D002",
            code: "HRA",
            name: "Human Resources",
            manager: "Liam Smith",
            status: "Active",
            employeeCount: 11
        },
        {
            id: "D003",
            code: "FIN",
            name: "Finance",
            manager: "Noah Davis",
            status: "Active",
            employeeCount: 9
        }
    ]);
    const [intNextDepartmentId, setIntNextDepartmentId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(4);
    const [strEditingDepartmentId, setStrEditingDepartmentId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [intIsAddingDepartment, setIntIsAddingDepartment] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [dicEditValues, setDicEditValues] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        code: "",
        name: "",
        manager: "",
        status: "Active"
    });
    const [dicNewValues, setDicNewValues] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        code: "",
        name: "",
        manager: "",
        status: "Active"
    });
    const [dicFieldErrors, setDicFieldErrors] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const dicFieldRefs = {
        code: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null),
        name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null),
        manager: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null),
        status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null)
    };
    const validateDepartmentValues = (dicValues, strCurrentDepartmentId)=>{
        const dicErrors = {};
        const strCodeUpper = dicValues.code.trim().toUpperCase();
        const strNameTrimmed = dicValues.name.trim();
        const strManagerTrimmed = dicValues.manager.trim();
        const strCodePattern = /^[A-Z0-9-]{2,20}$/;
        if (!strCodeUpper) {
            dicErrors.code = __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].departments.validation.codeRequired;
        } else if (!strCodePattern.test(strCodeUpper)) {
            dicErrors.code = __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].departments.validation.codeFormat;
        }
        if (!strNameTrimmed) {
            dicErrors.name = __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].departments.validation.nameRequired;
        } else if (strNameTrimmed.length < 3) {
            dicErrors.name = __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].departments.validation.nameMin;
        }
        if (!strManagerTrimmed) {
            dicErrors.manager = __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].departments.validation.managerRequired;
        } else if (strManagerTrimmed.length < 3) {
            dicErrors.manager = __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].departments.validation.managerMin;
        }
        if (!dicValues.status) {
            dicErrors.status = __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].departments.validation.statusRequired;
        }
        const intHasCodeDuplicate = lstDepartments.some((dicDepartment)=>dicDepartment.code.toUpperCase() === strCodeUpper && dicDepartment.id !== strCurrentDepartmentId) ? 1 : 0;
        if (intHasCodeDuplicate === 1) {
            dicErrors.code = __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].departments.validation.codeDuplicate;
        }
        const intHasNameDuplicate = lstDepartments.some((dicDepartment)=>dicDepartment.name.trim().toLowerCase() === strNameTrimmed.toLowerCase() && dicDepartment.id !== strCurrentDepartmentId) ? 1 : 0;
        if (intHasNameDuplicate === 1) {
            dicErrors.name = __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].departments.validation.nameDuplicate;
        }
        return dicErrors;
    };
    const focusFirstInvalidField = (dicErrors)=>{
        const lstErrorPriority = [
            "code",
            "name",
            "manager",
            "status"
        ];
        const strFirstInvalidField = lstErrorPriority.find((strField)=>Boolean(dicErrors[strField]));
        if (strFirstInvalidField) {
            dicFieldRefs[strFirstInvalidField].current?.focus();
        }
    };
    const handleAddClick = ()=>{
        setStrEditingDepartmentId("");
        setIntIsAddingDepartment(1);
        setDicFieldErrors({});
        setDicNewValues({
            code: "",
            name: "",
            manager: "",
            status: "Active"
        });
    };
    const handleEditClick = (dicDepartment)=>{
        setIntIsAddingDepartment(0);
        setDicFieldErrors({});
        setStrEditingDepartmentId(dicDepartment.id);
        setDicEditValues({
            code: dicDepartment.code,
            name: dicDepartment.name,
            manager: dicDepartment.manager,
            status: dicDepartment.status
        });
    };
    const handleCancelInline = ()=>{
        setIntIsAddingDepartment(0);
        setStrEditingDepartmentId("");
        setDicFieldErrors({});
    };
    const handleSaveNew = ()=>{
        const dicErrors = validateDepartmentValues(dicNewValues, "");
        setDicFieldErrors(dicErrors);
        if (Object.keys(dicErrors).length > 0) {
            focusFirstInvalidField(dicErrors);
            return;
        }
        const strNewDepartmentId = `D${String(intNextDepartmentId).padStart(3, "0")}`;
        const dicNewRecord = {
            id: strNewDepartmentId,
            code: dicNewValues.code.trim().toUpperCase(),
            name: dicNewValues.name.trim(),
            manager: dicNewValues.manager.trim(),
            status: dicNewValues.status,
            employeeCount: 0
        };
        setLstDepartments((lstPrev)=>[
                dicNewRecord,
                ...lstPrev
            ]);
        setIntNextDepartmentId((intPrev)=>intPrev + 1);
        setIntIsAddingDepartment(0);
        setDicFieldErrors({});
    };
    const handleSaveEdit = ()=>{
        const dicErrors = validateDepartmentValues(dicEditValues, strEditingDepartmentId);
        setDicFieldErrors(dicErrors);
        if (Object.keys(dicErrors).length > 0) {
            focusFirstInvalidField(dicErrors);
            return;
        }
        setLstDepartments((lstPrev)=>lstPrev.map((dicDepartment)=>{
                if (dicDepartment.id !== strEditingDepartmentId) {
                    return dicDepartment;
                }
                return {
                    ...dicDepartment,
                    code: dicEditValues.code.trim().toUpperCase(),
                    name: dicEditValues.name.trim(),
                    manager: dicEditValues.manager.trim(),
                    status: dicEditValues.status
                };
            }));
        setStrEditingDepartmentId("");
        setDicFieldErrors({});
    };
    const renderEditableTextField = (strField, dicValues, setDicValues, intIsStatusField = 0)=>{
        const clearInlineFieldError = (strErrorField)=>{
            if (!dicFieldErrors[strErrorField]) {
                return;
            }
            setDicFieldErrors((dicPrev)=>({
                    ...dicPrev,
                    [strErrorField]: ""
                }));
        };
        if (intIsStatusField === 1) {
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__["TextField"], {
                id: `department-inline-${strField}`,
                select: true,
                fullWidth: true,
                value: dicValues[strField],
                onChange: (event)=>{
                    clearInlineFieldError(strField);
                    setDicValues((dicPrev)=>({
                            ...dicPrev,
                            [strField]: event.target.value
                        }));
                },
                error: Boolean(dicFieldErrors[strField]),
                helperText: dicFieldErrors[strField],
                inputRef: dicFieldRefs[strField],
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$MenuItem$2f$MenuItem$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MenuItem$3e$__["MenuItem"], {
                        value: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].common.statusActive,
                        children: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].common.statusActive
                    }, void 0, false, {
                        fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                        lineNumber: 260,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$MenuItem$2f$MenuItem$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MenuItem$3e$__["MenuItem"], {
                        value: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].common.statusInactive,
                        children: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].common.statusInactive
                    }, void 0, false, {
                        fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                        lineNumber: 261,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                lineNumber: 242,
                columnNumber: 9
            }, this);
        }
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__["TextField"], {
            id: `department-inline-${strField}`,
            fullWidth: true,
            value: dicValues[strField],
            onChange: (event)=>{
                clearInlineFieldError(strField);
                setDicValues((dicPrev)=>({
                        ...dicPrev,
                        [strField]: strField === "code" ? event.target.value.toUpperCase() : event.target.value
                    }));
            },
            error: Boolean(dicFieldErrors[strField]),
            helperText: dicFieldErrors[strField],
            inputRef: dicFieldRefs[strField]
        }, void 0, false, {
            fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
            lineNumber: 267,
            columnNumber: 7
        }, this);
    };
    const lstGridRows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "DepartmentMasterInlinePanel.useMemo[lstGridRows]": ()=>{
            const lstRows = lstDepartments.map({
                "DepartmentMasterInlinePanel.useMemo[lstGridRows].lstRows": (dicDepartment)=>{
                    const intIsEditingRow = strEditingDepartmentId === dicDepartment.id ? 1 : 0;
                    return {
                        id: dicDepartment.id,
                        code: intIsEditingRow ? renderEditableTextField("code", dicEditValues, setDicEditValues) : dicDepartment.code,
                        name: intIsEditingRow ? renderEditableTextField("name", dicEditValues, setDicEditValues) : dicDepartment.name,
                        manager: intIsEditingRow ? renderEditableTextField("manager", dicEditValues, setDicEditValues) : dicDepartment.manager,
                        status: intIsEditingRow ? renderEditableTextField("status", dicEditValues, setDicEditValues, 1) : dicDepartment.status,
                        employeeCount: dicDepartment.employeeCount,
                        action: intIsEditingRow ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
                            direction: "row",
                            spacing: 1,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                    size: "small",
                                    variant: "contained",
                                    onClick: handleSaveEdit,
                                    children: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].common.save
                                }, void 0, false, {
                                    fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                                    lineNumber: 303,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                    size: "small",
                                    variant: "outlined",
                                    onClick: handleCancelInline,
                                    children: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].common.cancel
                                }, void 0, false, {
                                    fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                                    lineNumber: 306,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                            lineNumber: 302,
                            columnNumber: 11
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                            size: "small",
                            variant: "outlined",
                            startIcon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$EditOutlined$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                                lineNumber: 314,
                                columnNumber: 24
                            }, void 0),
                            onClick: {
                                "DepartmentMasterInlinePanel.useMemo[lstGridRows].lstRows": ()=>handleEditClick(dicDepartment)
                            }["DepartmentMasterInlinePanel.useMemo[lstGridRows].lstRows"],
                            disabled: intIsAddingDepartment === 1,
                            children: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].departments.editButton
                        }, void 0, false, {
                            fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                            lineNumber: 311,
                            columnNumber: 11
                        }, this)
                    };
                }
            }["DepartmentMasterInlinePanel.useMemo[lstGridRows].lstRows"]);
            if (intIsAddingDepartment === 1) {
                lstRows.unshift({
                    id: "NEW",
                    code: renderEditableTextField("code", dicNewValues, setDicNewValues),
                    name: renderEditableTextField("name", dicNewValues, setDicNewValues),
                    manager: renderEditableTextField("manager", dicNewValues, setDicNewValues),
                    status: renderEditableTextField("status", dicNewValues, setDicNewValues, 1),
                    employeeCount: "-",
                    action: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
                        direction: "row",
                        spacing: 1,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                size: "small",
                                variant: "contained",
                                onClick: handleSaveNew,
                                children: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].common.save
                            }, void 0, false, {
                                fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                                lineNumber: 334,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                size: "small",
                                variant: "outlined",
                                onClick: handleCancelInline,
                                children: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].common.cancel
                            }, void 0, false, {
                                fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                                lineNumber: 337,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                        lineNumber: 333,
                        columnNumber: 11
                    }, this)
                });
            }
            return lstRows;
        }
    }["DepartmentMasterInlinePanel.useMemo[lstGridRows]"], [
        lstDepartments,
        strEditingDepartmentId,
        dicEditValues,
        intIsAddingDepartment,
        dicNewValues,
        dicFieldErrors
    ]);
    const lstGridColumns = [
        {
            field: "id",
            headerName: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].departments.grid.id,
            sortable: false,
            filterable: false
        },
        {
            field: "code",
            headerName: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].departments.grid.code,
            sortable: false,
            filterable: false
        },
        {
            field: "name",
            headerName: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].departments.grid.name,
            sortable: false,
            filterable: false
        },
        {
            field: "manager",
            headerName: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].departments.grid.manager,
            sortable: false,
            filterable: false
        },
        {
            field: "status",
            headerName: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].departments.grid.status,
            sortable: false,
            filterable: false
        },
        {
            field: "employeeCount",
            headerName: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].departments.grid.employees,
            sortable: false,
            filterable: false
        },
        {
            field: "action",
            headerName: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].departments.grid.action,
            sortable: false,
            filterable: false,
            exportable: false
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                variant: "h4",
                fontWeight: 700,
                sx: {
                    mb: 3
                },
                children: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].departments.inlinePageTitle
            }, void 0, false, {
                fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                lineNumber: 360,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$Paper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Paper$3e$__["Paper"], {
                sx: {
                    p: 3
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$CommonDataGrid$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    columns: lstGridColumns,
                    rows: lstGridRows,
                    rowIdField: "id",
                    withPaper: false,
                    defaultPageSize: 10,
                    toolbarLeft: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                        variant: "contained",
                        onClick: handleAddClick,
                        disabled: intIsAddingDepartment === 1 || Boolean(strEditingDepartmentId),
                        children: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].departments.inlineAddButton
                    }, void 0, false, {
                        fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                        lineNumber: 371,
                        columnNumber: 13
                    }, void 0)
                }, void 0, false, {
                    fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                    lineNumber: 364,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                lineNumber: 363,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s(DepartmentMasterInlinePanel, "RmUY2HavkY3vthxvtoPETTZhTSU=");
_c = DepartmentMasterInlinePanel;
var _c;
__turbopack_context__.k.register(_c, "DepartmentMasterInlinePanel");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=components_801da58e._.js.map