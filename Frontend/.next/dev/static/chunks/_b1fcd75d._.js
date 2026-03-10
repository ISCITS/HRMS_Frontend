(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/common/PremiumDataTable.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>PremiumDataTable
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$PictureAsPdfOutlined$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/PictureAsPdfOutlined.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$Search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/Search.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$TableViewOutlined$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/TableViewOutlined.js [app-client] (ecmascript)");
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
function PremiumDataTable({ columns, rows, rowIdField, defaultPageSize = 8, pageSizeOptions = [
    5,
    10,
    25
], exportFileName = __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].commonDataGrid.defaultExportFileName, showExportOptions = false, emptyMessage = __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].commonDataGrid.emptyMessage, sx }) {
    _s();
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
    const [strSearchTerm, setStrSearchTerm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [strSortDirection, setStrSortDirection] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("asc");
    const [keySortBy, setKeySortBy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [intPage, setIntPage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [intRowsPerPage, setIntRowsPerPage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(defaultPageSize);
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
    const lstFilteredSortedRows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "PremiumDataTable.useMemo[lstFilteredSortedRows]": ()=>{
            // Logical flow:
            // 1) Filter rows by search input against filterable columns.
            // 2) Apply local sort if sort key is selected.
            const lstSearchableColumns = columns.filter({
                "PremiumDataTable.useMemo[lstFilteredSortedRows].lstSearchableColumns": (dicColumn)=>dicColumn.filterable !== false
            }["PremiumDataTable.useMemo[lstFilteredSortedRows].lstSearchableColumns"]);
            const lstFilteredRows = rows.filter({
                "PremiumDataTable.useMemo[lstFilteredSortedRows].lstFilteredRows": (dicRow)=>{
                    if (!strSearchTerm.trim()) {
                        return true;
                    }
                    const strQuery = strSearchTerm.toLowerCase();
                    return lstSearchableColumns.some({
                        "PremiumDataTable.useMemo[lstFilteredSortedRows].lstFilteredRows": (dicColumn)=>{
                            const value = typeof dicColumn.getFilterValue === "function" ? dicColumn.getFilterValue(dicRow) : dicRow[dicColumn.field];
                            if (typeof value === "string" || typeof value === "number") {
                                return String(value).toLowerCase().includes(strQuery);
                            }
                            return false;
                        }
                    }["PremiumDataTable.useMemo[lstFilteredSortedRows].lstFilteredRows"]);
                }
            }["PremiumDataTable.useMemo[lstFilteredSortedRows].lstFilteredRows"]);
            if (!keySortBy) {
                return lstFilteredRows;
            }
            const dicSortColumn = columns.find({
                "PremiumDataTable.useMemo[lstFilteredSortedRows].dicSortColumn": (dicColumn)=>dicColumn.field === keySortBy
            }["PremiumDataTable.useMemo[lstFilteredSortedRows].dicSortColumn"]);
            return [
                ...lstFilteredRows
            ].sort({
                "PremiumDataTable.useMemo[lstFilteredSortedRows]": (dicA, dicB)=>{
                    const valueA = dicSortColumn && typeof dicSortColumn.getSortValue === "function" ? dicSortColumn.getSortValue(dicA) : dicA[keySortBy];
                    const valueB = dicSortColumn && typeof dicSortColumn.getSortValue === "function" ? dicSortColumn.getSortValue(dicB) : dicB[keySortBy];
                    if (typeof valueA !== "string" && typeof valueA !== "number" || typeof valueB !== "string" && typeof valueB !== "number") {
                        return 0;
                    }
                    if (valueA < valueB) {
                        return strSortDirection === "asc" ? -1 : 1;
                    }
                    if (valueA > valueB) {
                        return strSortDirection === "asc" ? 1 : -1;
                    }
                    return 0;
                }
            }["PremiumDataTable.useMemo[lstFilteredSortedRows]"]);
        }
    }["PremiumDataTable.useMemo[lstFilteredSortedRows]"], [
        columns,
        keySortBy,
        rows,
        strSearchTerm,
        strSortDirection
    ]);
    const lstExportColumns = columns.filter((dicColumn)=>dicColumn.exportable !== false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PremiumDataTable.useEffect": ()=>{
            setIntPage(0);
        }
    }["PremiumDataTable.useEffect"], [
        strSearchTerm,
        keySortBy,
        strSortDirection,
        intRowsPerPage
    ]);
    const lstVisibleRows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "PremiumDataTable.useMemo[lstVisibleRows]": ()=>{
            const intStart = intPage * intRowsPerPage;
            return lstFilteredSortedRows.slice(intStart, intStart + intRowsPerPage);
        }
    }["PremiumDataTable.useMemo[lstVisibleRows]"], [
        intPage,
        intRowsPerPage,
        lstFilteredSortedRows
    ]);
    const toCsvCell = (strValue)=>`"${strValue.replace(/"/g, '""')}"`;
    const handleSort = (keyField, intIsSortable)=>{
        if (intIsSortable === false) {
            return;
        }
        if (keySortBy === keyField) {
            setStrSortDirection((strPrev)=>strPrev === "asc" ? "desc" : "asc");
            return;
        }
        setKeySortBy(keyField);
        setStrSortDirection("asc");
    };
    const handleExportExcel = ()=>{
        const strHeader = lstExportColumns.map((dicColumn)=>toCsvCell(dicColumn.headerName)).join(",");
        const strBody = lstFilteredSortedRows.map((dicRow)=>{
            return lstExportColumns.map((dicColumn)=>{
                const value = typeof dicColumn.getSortValue === "function" ? dicColumn.getSortValue(dicRow) : dicRow[dicColumn.field];
                return toCsvCell(toText(value));
            }).join(",");
        }).join("\n");
        const blob = new Blob([
            `\uFEFF${strHeader}\n${strBody}`
        ], {
            type: "text/csv;charset=utf-8;"
        });
        const strUrl = URL.createObjectURL(blob);
        const dicLink = document.createElement("a");
        dicLink.href = strUrl;
        dicLink.download = `${exportFileName}.csv`;
        dicLink.click();
        URL.revokeObjectURL(strUrl);
    };
    const handleExportPdf = ()=>{
        const strHeaderHtml = lstExportColumns.map((dicColumn)=>`<th>${dicColumn.headerName}</th>`).join("");
        const strRowsHtml = lstFilteredSortedRows.map((dicRow)=>{
            const strCells = lstExportColumns.map((dicColumn)=>{
                const value = typeof dicColumn.getSortValue === "function" ? dicColumn.getSortValue(dicRow) : dicRow[dicColumn.field];
                return `<td>${toText(value)}</td>`;
            }).join("");
            return `<tr>${strCells}</tr>`;
        }).join("");
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$Paper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Paper$3e$__["Paper"], {
        sx: {
            p: 3,
            borderRadius: 3,
            backgroundColor: "#ffffff",
            boxShadow: "0 12px 30px rgba(0,0,0,0.06)",
            transition: "all 0.2s ease",
            "&:hover": {
                boxShadow: "0 14px 34px rgba(0,0,0,0.07)"
            },
            ...sx
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
            spacing: 3,
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
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__["TextField"], {
                            value: strSearchTerm,
                            onChange: (event)=>setStrSearchTerm(event.target.value),
                            placeholder: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].commonDataGrid.filterPlaceholder,
                            sx: {
                                width: {
                                    xs: "100%",
                                    sm: 320
                                },
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
                            },
                            InputProps: {
                                startAdornment: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$InputAdornment$2f$InputAdornment$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__InputAdornment$3e$__["InputAdornment"], {
                                    position: "start",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$Search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                        sx: {
                                            color: "#64748b",
                                            fontSize: 18
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/components/common/PremiumDataTable.tsx",
                                        lineNumber: 289,
                                        columnNumber: 19
                                    }, void 0)
                                }, void 0, false, {
                                    fileName: "[project]/components/common/PremiumDataTable.tsx",
                                    lineNumber: 288,
                                    columnNumber: 17
                                }, void 0)
                            }
                        }, void 0, false, {
                            fileName: "[project]/components/common/PremiumDataTable.tsx",
                            lineNumber: 264,
                            columnNumber: 11
                        }, this),
                        showExportOptions ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
                            direction: "row",
                            spacing: 1,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                    variant: "outlined",
                                    size: "small",
                                    startIcon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$TableViewOutlined$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                        sx: {
                                            fontSize: 16
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/components/common/PremiumDataTable.tsx",
                                        lineNumber: 300,
                                        columnNumber: 28
                                    }, void 0),
                                    onClick: handleExportExcel,
                                    sx: {
                                        minHeight: 36,
                                        px: 1.5,
                                        borderRadius: "10px",
                                        color: "#475569",
                                        borderColor: "#cbd5e1",
                                        transition: "all 0.2s ease",
                                        "&:hover": {
                                            backgroundColor: "#f8fafc",
                                            borderColor: "#94a3b8"
                                        }
                                    },
                                    children: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].commonDataGrid.exportExcel
                                }, void 0, false, {
                                    fileName: "[project]/components/common/PremiumDataTable.tsx",
                                    lineNumber: 297,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                    variant: "outlined",
                                    size: "small",
                                    startIcon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$PictureAsPdfOutlined$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                        sx: {
                                            fontSize: 16
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/components/common/PremiumDataTable.tsx",
                                        lineNumber: 317,
                                        columnNumber: 28
                                    }, void 0),
                                    onClick: handleExportPdf,
                                    sx: {
                                        minHeight: 36,
                                        px: 1.5,
                                        borderRadius: "10px",
                                        color: "#475569",
                                        borderColor: "#cbd5e1",
                                        transition: "all 0.2s ease",
                                        "&:hover": {
                                            backgroundColor: "#f8fafc",
                                            borderColor: "#94a3b8"
                                        }
                                    },
                                    children: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].commonDataGrid.exportPdf
                                }, void 0, false, {
                                    fileName: "[project]/components/common/PremiumDataTable.tsx",
                                    lineNumber: 314,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/common/PremiumDataTable.tsx",
                            lineNumber: 296,
                            columnNumber: 13
                        }, this) : null
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/common/PremiumDataTable.tsx",
                    lineNumber: 263,
                    columnNumber: 9
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
                                sx: {
                                    "& th": {
                                        height: 56,
                                        backgroundColor: "#f8fafc",
                                        borderColor: "#e2e8f0"
                                    }
                                },
                                children: columns.map((dicColumn)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableCell$2f$TableCell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableCell$3e$__["TableCell"], {
                                        align: dicColumn.align ?? "left",
                                        sx: {
                                            width: dicColumn.width,
                                            color: "#475569",
                                            fontWeight: 600,
                                            fontSize: 14,
                                            borderBottom: "1px solid #e2e8f0"
                                        },
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableSortLabel$2f$TableSortLabel$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableSortLabel$3e$__["TableSortLabel"], {
                                            active: keySortBy === dicColumn.field,
                                            direction: keySortBy === dicColumn.field ? strSortDirection : "asc",
                                            onClick: ()=>handleSort(dicColumn.field, dicColumn.sortable),
                                            hideSortIcon: dicColumn.sortable === false,
                                            children: dicColumn.headerName
                                        }, void 0, false, {
                                            fileName: "[project]/components/common/PremiumDataTable.tsx",
                                            lineNumber: 350,
                                            columnNumber: 19
                                        }, this)
                                    }, String(dicColumn.field), false, {
                                        fileName: "[project]/components/common/PremiumDataTable.tsx",
                                        lineNumber: 339,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/components/common/PremiumDataTable.tsx",
                                lineNumber: 337,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/common/PremiumDataTable.tsx",
                            lineNumber: 336,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableBody$2f$TableBody$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableBody$3e$__["TableBody"], {
                            children: lstFilteredSortedRows.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableRow$2f$TableRow$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableRow$3e$__["TableRow"], {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableCell$2f$TableCell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableCell$3e$__["TableCell"], {
                                    align: "center",
                                    colSpan: columns.length,
                                    sx: {
                                        py: 4,
                                        color: "#64748b"
                                    },
                                    children: emptyMessage
                                }, void 0, false, {
                                    fileName: "[project]/components/common/PremiumDataTable.tsx",
                                    lineNumber: 365,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/common/PremiumDataTable.tsx",
                                lineNumber: 364,
                                columnNumber: 15
                            }, this) : lstVisibleRows.map((dicRow, intIndex)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableRow$2f$TableRow$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableRow$3e$__["TableRow"], {
                                    hover: true,
                                    sx: {
                                        transition: "all 0.15s ease",
                                        "& td": {
                                            height: 58,
                                            borderBottom: "1px solid #e2e8f0"
                                        },
                                        "&:hover": {
                                            backgroundColor: "rgba(37,99,235,0.04)"
                                        }
                                    },
                                    children: columns.map((dicColumn)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableCell$2f$TableCell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableCell$3e$__["TableCell"], {
                                            align: dicColumn.align ?? "left",
                                            children: typeof dicColumn.renderCell === "function" ? dicColumn.renderCell(dicRow) : dicRow[dicColumn.field]
                                        }, `${String(dicColumn.field)}-${intIndex}`, false, {
                                            fileName: "[project]/components/common/PremiumDataTable.tsx",
                                            lineNumber: 386,
                                            columnNumber: 21
                                        }, this))
                                }, rowIdField ? String(dicRow[rowIdField]) : `${intPage}-${intIndex}`, false, {
                                    fileName: "[project]/components/common/PremiumDataTable.tsx",
                                    lineNumber: 371,
                                    columnNumber: 17
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/components/common/PremiumDataTable.tsx",
                            lineNumber: 362,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/common/PremiumDataTable.tsx",
                    lineNumber: 335,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TablePagination$2f$TablePagination$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TablePagination$3e$__["TablePagination"], {
                    component: "div",
                    count: lstFilteredSortedRows.length,
                    page: intPage,
                    onPageChange: (_, intNextPage)=>setIntPage(intNextPage),
                    rowsPerPage: intRowsPerPage,
                    rowsPerPageOptions: pageSizeOptions,
                    onRowsPerPageChange: (event)=>setIntRowsPerPage(parseInt(event.target.value, 10)),
                    sx: {
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
                    }
                }, void 0, false, {
                    fileName: "[project]/components/common/PremiumDataTable.tsx",
                    lineNumber: 398,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/common/PremiumDataTable.tsx",
            lineNumber: 262,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/common/PremiumDataTable.tsx",
        lineNumber: 249,
        columnNumber: 5
    }, this);
}
_s(PremiumDataTable, "ERN4LFWYvJ+WlJC4h7oZiNElfZA=");
_c = PremiumDataTable;
var _c;
__turbopack_context__.k.register(_c, "PremiumDataTable");
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
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$PremiumDataTable$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/common/PremiumDataTable.tsx [app-client] (ecmascript)");
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
            headerName: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].employees.grid.id,
            getSortValue: (dicRow)=>dicRow.id,
            getFilterValue: (dicRow)=>dicRow.id,
            renderCell: (dicRow)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                    sx: {
                        color: "#94a3b8",
                        fontWeight: 500
                    },
                    children: dicRow.id
                }, void 0, false, {
                    fileName: "[project]/app/(dashboard)/employees/page.tsx",
                    lineNumber: 29,
                    columnNumber: 31
                }, this)
        },
        {
            field: "name",
            headerName: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].employees.grid.name,
            getSortValue: (dicRow)=>dicRow.name,
            getFilterValue: (dicRow)=>dicRow.name,
            renderCell: (dicRow)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                    sx: {
                        color: "#0f172a",
                        fontWeight: 600
                    },
                    children: dicRow.name
                }, void 0, false, {
                    fileName: "[project]/app/(dashboard)/employees/page.tsx",
                    lineNumber: 36,
                    columnNumber: 31
                }, this)
        },
        {
            field: "department",
            headerName: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].employees.grid.department,
            getSortValue: (dicRow)=>dicRow.department,
            getFilterValue: (dicRow)=>dicRow.department,
            renderCell: (dicRow)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                    sx: {
                        color: "#64748b"
                    },
                    children: dicRow.department
                }, void 0, false, {
                    fileName: "[project]/app/(dashboard)/employees/page.tsx",
                    lineNumber: 43,
                    columnNumber: 31
                }, this)
        },
        {
            field: "role",
            headerName: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].employees.grid.role,
            getSortValue: (dicRow)=>dicRow.role,
            getFilterValue: (dicRow)=>dicRow.role,
            renderCell: (dicRow)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                    sx: {
                        color: "#64748b"
                    },
                    children: dicRow.role
                }, void 0, false, {
                    fileName: "[project]/app/(dashboard)/employees/page.tsx",
                    lineNumber: 50,
                    columnNumber: 31
                }, this)
        },
        {
            field: "id",
            headerName: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].employees.grid.action,
            sortable: false,
            filterable: false,
            exportable: false,
            align: "center",
            renderCell: (dicRow)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Tooltip$2f$Tooltip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Tooltip$3e$__["Tooltip"], {
                    title: "View details",
                    arrow: true,
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$IconButton$2f$IconButton$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__IconButton$3e$__["IconButton"], {
                        component: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"],
                        href: `/employees/${dicRow.id}`,
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
                            lineNumber: 73,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/(dashboard)/employees/page.tsx",
                        lineNumber: 61,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/app/(dashboard)/employees/page.tsx",
                    lineNumber: 60,
                    columnNumber: 9
                }, this)
        }
    ];
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
                        lineNumber: 92,
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
                        lineNumber: 95,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/(dashboard)/employees/page.tsx",
                lineNumber: 91,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                variant: "contained",
                href: "/employees/new",
                sx: {
                    alignSelf: "flex-start",
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
                lineNumber: 98,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$PremiumDataTable$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                columns: columns,
                rows: employees,
                rowIdField: "id",
                showExportOptions: true,
                exportFileName: "employees-list"
            }, void 0, false, {
                fileName: "[project]/app/(dashboard)/employees/page.tsx",
                lineNumber: 118,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/(dashboard)/employees/page.tsx",
        lineNumber: 81,
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

//# sourceMappingURL=_b1fcd75d._.js.map