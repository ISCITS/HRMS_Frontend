(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/constants/Constant.json (json)", ((__turbopack_context__) => {

__turbopack_context__.v({"common":{"cancel":"Cancel","save":"Save","update":"Update","statusActive":"Active","statusInactive":"Inactive"},"appShell":{"brand":"HRMS","title":"Human Resource Management System","logout":"Logout","logoutDialogTitle":"Confirm Logout","logoutDialogMessage":"Are you sure you want to logout from the application?","logoutConfirmButton":"Confirm Logout","nav":{"dashboard":"Dashboard","employees":"Employees","employeeList":"Employee List","addEmployee":"Add Employee","departmentMaster":"Department Master","departmentMasterInline":"Department Master Inline","leave":"Leave","leaveRequests":"Leave Requests","applyLeave":"Apply Leave","payroll":"Payroll","payrollOverview":"Payroll Overview","runPayroll":"Run Payroll","payslips":"Payslips","attendance":"Attendance","theme":"Theme","profile":"Profile","settings":"Settings"}},"commonDataGrid":{"filterPlaceholder":"Filter records...","emptyMessage":"No records found.","exportExcel":"Excel","exportPdf":"PDF","defaultExportFileName":"grid-data"},"login":{"title":"Sign In","subtitle":"Welcome back. Please login to continue.","userIdLabel":"User ID","passwordLabel":"Password","loginButton":"Login","userIdRequired":"User ID is required.","userIdMin":"User ID must be at least 4 characters.","passwordRequired":"Password is required.","passwordMin":"Password must be at least 6 characters."},"employees":{"pageTitle":"Employees","addButton":"Add Employee","actionView":"View","grid":{"id":"ID","name":"Name","department":"Department","role":"Role","action":"Action"},"form":{"fullName":"Full Name","email":"Email","role":"Role","department":"Department","status":"Status","fullNameRequired":"Full Name is required.","emailRequired":"Email is required.","emailInvalid":"Enter a valid email address.","roleRequired":"Role is required.","departmentRequired":"Department is required.","statusRequired":"Status is required."}},"leave":{"pageTitle":"Leave Management","applyButton":"Apply Leave","actionApprove":"Approve","grid":{"id":"ID","employee":"Employee","type":"Type","status":"Status","action":"Action"},"form":{"type":"Leave Type","startDate":"Start Date","endDate":"End Date","reason":"Reason","submit":"Submit Request","typeCasual":"Casual Leave","typeSick":"Sick Leave","typeEarned":"Earned Leave"}},"attendance":{"pageTitle":"Attendance Tracker","grid":{"date":"Date","status":"Status","checkIn":"Check In","checkOut":"Check Out"}},"payroll":{"runForm":{"month":"Payroll Month","department":"Department","cycle":"Pay Cycle","note":"Processing Note","notePlaceholder":"Optional note for payroll approvers","generateButton":"Generate Payroll","previewButton":"Preview Summary","monthMarch":"March 2026","monthFebruary":"February 2026","monthJanuary":"January 2026","departmentAll":"All Departments","departmentEngineering":"Engineering","departmentHr":"HR","departmentFinance":"Finance","cycleMonthly":"Monthly","cycleBiWeekly":"Bi-Weekly"},"payslips":{"title":"Payslips","download":"Download","grid":{"id":"Payslip ID","employee":"Employee","month":"Month","amount":"Net Amount","status":"Status","action":"Action"}}},"profile":{"fullName":"Full Name","email":"Email","phone":"Phone","designation":"Designation","updateButton":"Update Profile"},"settings":{"description":"Settings in this template are UI-only placeholders.","darkMode":"Enable dark mode","emailNotifications":"Email notifications","attendanceSummary":"Weekly attendance summary","saveButton":"Save Settings"},"theme":{"description":"Select a color theme for the entire website.","applyButton":"Apply Theme","appliedButton":"Applied","presets":{"ocean":"Ocean Blue","emerald":"Emerald Green","sunset":"Sunset Orange","violet":"Violet Purple","rose":"Rose Red","cyan":"Cyan Teal","amber":"Amber Gold","slate":"Slate Gray","indigo":"Indigo Deep","lime":"Lime Green","vibgyorLight":"Light VIBGYOR","softLight":"Soft Light"}},"departments":{"pageTitle":"Department Master","inlinePageTitle":"Department Master (Inline)","addButton":"Add Department","inlineAddButton":"Add Department In Grid","editButton":"Edit","saveDepartment":"Save Department","updateDepartment":"Update Department","dialogAddTitle":"Add Department","dialogEditTitle":"Edit Department","fields":{"code":"Department Code","name":"Department Name","manager":"Manager Name","status":"Status"},"grid":{"id":"ID","code":"Code","name":"Department Name","manager":"Manager","status":"Status","employees":"Employees","action":"Action"},"validation":{"codeRequired":"Department Code is required.","codeFormat":"Code must be 2-20 chars, uppercase letters, numbers, or hyphen.","codeDuplicate":"Department Code already exists.","nameRequired":"Department Name is required.","nameMin":"Department Name must be at least 3 characters.","nameDuplicate":"Department Name already exists.","managerRequired":"Manager Name is required.","managerMin":"Manager Name must be at least 3 characters.","statusRequired":"Status is required."}}});}),
"[project]/components/common/CommonDataGrid.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CommonDataGrid
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$Search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/Search.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$PictureAsPdfOutlined$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/PictureAsPdfOutlined.js [app-client] (ecmascript)");
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
function CommonDataGrid({ columns, rows, rowIdField, defaultPageSize = 5, pageSizeOptions = [
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
    const filteredAndSortedRows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "CommonDataGrid.useMemo[filteredAndSortedRows]": ()=>{
            // Logical flow:
            // 1) Apply text filtering on filterable columns.
            // 2) Apply sorting on the selected sortable column.
            const searchableColumns = columns.filter({
                "CommonDataGrid.useMemo[filteredAndSortedRows].searchableColumns": (column)=>column.filterable !== false
            }["CommonDataGrid.useMemo[filteredAndSortedRows].searchableColumns"]);
            const filtered = rows.filter({
                "CommonDataGrid.useMemo[filteredAndSortedRows].filtered": (row)=>{
                    if (!searchTerm.trim()) {
                        return true;
                    }
                    const query = searchTerm.toLowerCase();
                    return searchableColumns.some({
                        "CommonDataGrid.useMemo[filteredAndSortedRows].filtered": (column)=>{
                            const value = row[column.field];
                            if (typeof value === "string" || typeof value === "number") {
                                return String(value).toLowerCase().includes(query);
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
        columns,
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
            const start = page * rowsPerPage;
            return filteredAndSortedRows.slice(start, start + rowsPerPage);
        }
    }["CommonDataGrid.useMemo[paginatedRows]"], [
        filteredAndSortedRows,
        page,
        rowsPerPage
    ]);
    const exportColumns = columns.filter((column)=>column.exportable !== false);
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
            const props = value.props;
            return toText(props.children);
        }
        return "";
    };
    const toCsvCell = (value)=>`"${value.replace(/"/g, "\"\"")}"`;
    const handleExportExcel = ()=>{
        // Output:
        // - Downloads a UTF-8 CSV file (Excel-friendly) containing exported columns + filtered/sorted rows.
        // Failure behavior:
        // - If browser blocks download, no throw from this module.
        const headers = exportColumns.map((column)=>toCsvCell(column.headerName)).join(",");
        const body = filteredAndSortedRows.map((row)=>exportColumns.map((column)=>toCsvCell(toText(row[column.field]))).join(",")).join("\n");
        const csvContent = `${headers}\n${body}`;
        const blob = new Blob([
            `\uFEFF${csvContent}`
        ], {
            type: "text/csv;charset=utf-8;"
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${exportFileName}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };
    const handleExportPdf = ()=>{
        // Output:
        // - Opens print-friendly page for PDF save/print.
        // Failure behavior:
        // - If popup blocked (window.open returns null), exits gracefully.
        const headerHtml = exportColumns.map((column)=>`<th>${column.headerName}</th>`).join("");
        const rowHtml = filteredAndSortedRows.map((row)=>`<tr>${exportColumns.map((column)=>`<td>${toText(row[column.field])}</td>`).join("")}</tr>`).join("");
        const printWindow = window.open("", "_blank", "width=1000,height=700");
        if (!printWindow) {
            return;
        }
        printWindow.document.write(`
      <html>
        <head>
          <title>${exportFileName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h2 { margin: 0 0 16px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d0d7de; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f2f4f7; }
          </style>
        </head>
        <body>
          <h2>${exportFileName}</h2>
          <table>
            <thead><tr>${headerHtml}</tr></thead>
            <tbody>${rowHtml}</tbody>
          </table>
        </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };
    const table = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
                direction: {
                    xs: "column",
                    sm: "row"
                },
                spacing: 1.2,
                alignItems: {
                    sm: "center"
                },
                justifyContent: "space-between",
                sx: {
                    mt: 1,
                    mb: 1.5
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
                            }
                        },
                        InputProps: {
                            startAdornment: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$InputAdornment$2f$InputAdornment$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__InputAdornment$3e$__["InputAdornment"], {
                                position: "start",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$Search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    fontSize: "small"
                                }, void 0, false, {
                                    fileName: "[project]/components/common/CommonDataGrid.tsx",
                                    lineNumber: 254,
                                    columnNumber: 17
                                }, void 0)
                            }, void 0, false, {
                                fileName: "[project]/components/common/CommonDataGrid.tsx",
                                lineNumber: 253,
                                columnNumber: 15
                            }, void 0)
                        }
                    }, void 0, false, {
                        fileName: "[project]/components/common/CommonDataGrid.tsx",
                        lineNumber: 246,
                        columnNumber: 9
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
                                    lineNumber: 264,
                                    columnNumber: 26
                                }, void 0),
                                onClick: handleExportExcel,
                                children: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].commonDataGrid.exportExcel
                            }, void 0, false, {
                                fileName: "[project]/components/common/CommonDataGrid.tsx",
                                lineNumber: 261,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                variant: "outlined",
                                size: "small",
                                startIcon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$PictureAsPdfOutlined$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                    fileName: "[project]/components/common/CommonDataGrid.tsx",
                                    lineNumber: 272,
                                    columnNumber: 26
                                }, void 0),
                                onClick: handleExportPdf,
                                children: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].commonDataGrid.exportPdf
                            }, void 0, false, {
                                fileName: "[project]/components/common/CommonDataGrid.tsx",
                                lineNumber: 269,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/common/CommonDataGrid.tsx",
                        lineNumber: 260,
                        columnNumber: 11
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/components/common/CommonDataGrid.tsx",
                lineNumber: 239,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Table$2f$Table$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Table$3e$__["Table"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableHead$2f$TableHead$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableHead$3e$__["TableHead"], {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableRow$2f$TableRow$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableRow$3e$__["TableRow"], {
                            children: columns.map((column)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableCell$2f$TableCell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableCell$3e$__["TableCell"], {
                                    align: column.align ?? "left",
                                    sx: column.width ? {
                                        width: column.width
                                    } : undefined,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableSortLabel$2f$TableSortLabel$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableSortLabel$3e$__["TableSortLabel"], {
                                        active: sortBy === column.field,
                                        direction: sortBy === column.field ? sortDirection : "asc",
                                        onClick: ()=>handleSort(column.field, column.sortable),
                                        hideSortIcon: column.sortable === false,
                                        children: column.headerName
                                    }, void 0, false, {
                                        fileName: "[project]/components/common/CommonDataGrid.tsx",
                                        lineNumber: 289,
                                        columnNumber: 17
                                    }, this)
                                }, String(column.field), false, {
                                    fileName: "[project]/components/common/CommonDataGrid.tsx",
                                    lineNumber: 284,
                                    columnNumber: 15
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/components/common/CommonDataGrid.tsx",
                            lineNumber: 282,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/common/CommonDataGrid.tsx",
                        lineNumber: 281,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableBody$2f$TableBody$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableBody$3e$__["TableBody"], {
                        children: filteredAndSortedRows.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableRow$2f$TableRow$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableRow$3e$__["TableRow"], {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableCell$2f$TableCell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableCell$3e$__["TableCell"], {
                                colSpan: columns.length,
                                align: "center",
                                children: emptyMessage
                            }, void 0, false, {
                                fileName: "[project]/components/common/CommonDataGrid.tsx",
                                lineNumber: 304,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/common/CommonDataGrid.tsx",
                            lineNumber: 303,
                            columnNumber: 13
                        }, this) : paginatedRows.map((row, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableRow$2f$TableRow$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableRow$3e$__["TableRow"], {
                                hover: true,
                                children: columns.map((column)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableCell$2f$TableCell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TableCell$3e$__["TableCell"], {
                                        align: column.align ?? "left",
                                        children: row[column.field]
                                    }, `${String(column.field)}-${index}`, false, {
                                        fileName: "[project]/components/common/CommonDataGrid.tsx",
                                        lineNumber: 315,
                                        columnNumber: 19
                                    }, this))
                            }, rowIdField ? String(row[rowIdField]) : `${page}-${index}`, false, {
                                fileName: "[project]/components/common/CommonDataGrid.tsx",
                                lineNumber: 310,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/components/common/CommonDataGrid.tsx",
                        lineNumber: 301,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/common/CommonDataGrid.tsx",
                lineNumber: 280,
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
                rowsPerPageOptions: pageSizeOptions
            }, void 0, false, {
                fileName: "[project]/components/common/CommonDataGrid.tsx",
                lineNumber: 324,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
    if (!withPaper) {
        return table;
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$Paper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Paper$3e$__["Paper"], {
        sx: sx,
        children: table
    }, void 0, false, {
        fileName: "[project]/components/common/CommonDataGrid.tsx",
        lineNumber: 342,
        columnNumber: 10
    }, this);
}
_s(CommonDataGrid, "EZ/+7Qy/JWmeiZUDsoYNWi6QX+E=");
_c = CommonDataGrid;
var _c;
__turbopack_context__.k.register(_c, "CommonDataGrid");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/departments/DepartmentMasterPanel.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DepartmentMasterPanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$EditOutlined$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/EditOutlined.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Button/Button.js [app-client] (ecmascript) <export default as Button>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Dialog$2f$Dialog$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Dialog$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Dialog/Dialog.js [app-client] (ecmascript) <export default as Dialog>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$DialogActions$2f$DialogActions$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DialogActions$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/DialogActions/DialogActions.js [app-client] (ecmascript) <export default as DialogActions>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$DialogContent$2f$DialogContent$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DialogContent$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/DialogContent/DialogContent.js [app-client] (ecmascript) <export default as DialogContent>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$DialogTitle$2f$DialogTitle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DialogTitle$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/DialogTitle/DialogTitle.js [app-client] (ecmascript) <export default as DialogTitle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$MenuItem$2f$MenuItem$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MenuItem$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/MenuItem/MenuItem.js [app-client] (ecmascript) <export default as MenuItem>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$Paper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Paper$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Paper/Paper.js [app-client] (ecmascript) <export default as Paper>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Stack/Stack.js [app-client] (ecmascript) <export default as Stack>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/TextField/TextField.js [app-client] (ecmascript) <export default as TextField>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Typography/Typography.js [app-client] (ecmascript) <export default as Typography>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$hookform$2f$resolvers$2f$yup$2f$dist$2f$yup$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@hookform/resolvers/yup/dist/yup.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hook$2d$form$2f$dist$2f$index$2e$esm$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-hook-form/dist/index.esm.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$yup$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/yup/index.esm.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$CommonDataGrid$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/common/CommonDataGrid.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
const clsDepartmentSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$yup$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["object"]({
    code: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$yup$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["string"]().required("Department Code is required.").matches(/^[A-Z0-9-]{2,20}$/, "Code must be 2-20 chars, uppercase letters, numbers, or hyphen."),
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$yup$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["string"]().required("Department Name is required.").min(3, "Department Name must be at least 3 characters."),
    manager: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$yup$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["string"]().required("Manager Name is required.").min(3, "Manager Name must be at least 3 characters."),
    status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$yup$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mixed"]().oneOf([
        "Active",
        "Inactive"
    ]).required("Status is required.")
});
function DepartmentMasterPanel() {
    _s();
    // Functional responsibility:
    // - Provide department master CRUD-like UX for add/edit on a grid-backed list.
    // Inputs:
    // - Uses in-memory department list state and dialog form values.
    // Output:
    // - Renders searchable/sortable/paginated department grid + add/edit dialog.
    // Failure behavior:
    // - Invalid/duplicate form data blocks save and shows field-level errors with focus priority.
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
    const [intIsDialogOpen, setIntIsDialogOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [strDialogMode, setStrDialogMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("add");
    const [strEditingDepartmentId, setStrEditingDepartmentId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const { control, handleSubmit, reset, setError, clearErrors, setFocus, formState: { errors, isSubmitting } } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hook$2d$form$2f$dist$2f$index$2e$esm$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useForm"])({
        resolver: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$hookform$2f$resolvers$2f$yup$2f$dist$2f$yup$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["yupResolver"])(clsDepartmentSchema),
        defaultValues: {
            code: "",
            name: "",
            manager: "",
            status: "Active"
        }
    });
    const openAddDialog = ()=>{
        setStrDialogMode("add");
        setStrEditingDepartmentId("");
        reset({
            code: "",
            name: "",
            manager: "",
            status: "Active"
        });
        setIntIsDialogOpen(1);
    };
    const openEditDialog = (dicDepartment)=>{
        setStrDialogMode("edit");
        setStrEditingDepartmentId(dicDepartment.id);
        reset({
            code: dicDepartment.code,
            name: dicDepartment.name,
            manager: dicDepartment.manager,
            status: dicDepartment.status
        });
        setIntIsDialogOpen(1);
    };
    const closeDialog = ()=>{
        setIntIsDialogOpen(0);
    };
    const onValidSubmit = async (dicFormData)=>{
        const strCodeUpper = dicFormData.code.trim().toUpperCase();
        const strNameTrimmed = dicFormData.name.trim();
        const strManagerTrimmed = dicFormData.manager.trim();
        const intHasCodeDuplicate = lstDepartments.some((dicDepartment)=>dicDepartment.code.toUpperCase() === strCodeUpper && dicDepartment.id !== strEditingDepartmentId) ? 1 : 0;
        if (intHasCodeDuplicate === 1) {
            setError("code", {
                message: "Department Code already exists."
            });
            setFocus("code");
            return;
        }
        const intHasNameDuplicate = lstDepartments.some((dicDepartment)=>dicDepartment.name.trim().toLowerCase() === strNameTrimmed.toLowerCase() && dicDepartment.id !== strEditingDepartmentId) ? 1 : 0;
        if (intHasNameDuplicate === 1) {
            setError("name", {
                message: "Department Name already exists."
            });
            setFocus("name");
            return;
        }
        if (strDialogMode === "add") {
            const strNewDepartmentId = `D${String(intNextDepartmentId).padStart(3, "0")}`;
            const dicNewDepartment = {
                id: strNewDepartmentId,
                code: strCodeUpper,
                name: strNameTrimmed,
                manager: strManagerTrimmed,
                status: dicFormData.status,
                employeeCount: 0
            };
            setLstDepartments((lstPrev)=>[
                    dicNewDepartment,
                    ...lstPrev
                ]);
            setIntNextDepartmentId((intPrev)=>intPrev + 1);
            closeDialog();
            return;
        }
        setLstDepartments((lstPrev)=>lstPrev.map((dicDepartment)=>{
                if (dicDepartment.id !== strEditingDepartmentId) {
                    return dicDepartment;
                }
                return {
                    ...dicDepartment,
                    code: strCodeUpper,
                    name: strNameTrimmed,
                    manager: strManagerTrimmed,
                    status: dicFormData.status
                };
            }));
        closeDialog();
    };
    const onInvalidSubmit = (dicErrors)=>{
        const lstErrorPriority = [
            "code",
            "name",
            "manager",
            "status"
        ];
        const strFirstErrorField = lstErrorPriority.find((strField)=>Boolean(dicErrors[strField]));
        if (strFirstErrorField) {
            setFocus(strFirstErrorField);
        }
    };
    const lstGridRows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "DepartmentMasterPanel.useMemo[lstGridRows]": ()=>lstDepartments.map({
                "DepartmentMasterPanel.useMemo[lstGridRows]": (dicDepartment)=>({
                        ...dicDepartment,
                        action: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                            size: "small",
                            variant: "outlined",
                            startIcon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$EditOutlined$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                fileName: "[project]/components/departments/DepartmentMasterPanel.tsx",
                                lineNumber: 206,
                                columnNumber: 24
                            }, void 0),
                            onClick: {
                                "DepartmentMasterPanel.useMemo[lstGridRows]": ()=>openEditDialog(dicDepartment)
                            }["DepartmentMasterPanel.useMemo[lstGridRows]"],
                            children: "Edit"
                        }, void 0, false, {
                            fileName: "[project]/components/departments/DepartmentMasterPanel.tsx",
                            lineNumber: 203,
                            columnNumber: 11
                        }, this)
                    })
            }["DepartmentMasterPanel.useMemo[lstGridRows]"])
    }["DepartmentMasterPanel.useMemo[lstGridRows]"], [
        lstDepartments
    ]);
    const lstGridColumns = [
        {
            field: "id",
            headerName: "ID"
        },
        {
            field: "code",
            headerName: "Code"
        },
        {
            field: "name",
            headerName: "Department Name"
        },
        {
            field: "manager",
            headerName: "Manager"
        },
        {
            field: "status",
            headerName: "Status"
        },
        {
            field: "employeeCount",
            headerName: "Employees"
        },
        {
            field: "action",
            headerName: "Action",
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
                    mb: 2
                },
                children: "Department Master"
            }, void 0, false, {
                fileName: "[project]/components/departments/DepartmentMasterPanel.tsx",
                lineNumber: 228,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                variant: "contained",
                onClick: openAddDialog,
                sx: {
                    mb: 2
                },
                children: "Add Department"
            }, void 0, false, {
                fileName: "[project]/components/departments/DepartmentMasterPanel.tsx",
                lineNumber: 231,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$Paper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Paper$3e$__["Paper"], {
                sx: {
                    p: 2.2
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$CommonDataGrid$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    columns: lstGridColumns,
                    rows: lstGridRows,
                    rowIdField: "id",
                    withPaper: false,
                    showExportOptions: true,
                    exportFileName: "department-master"
                }, void 0, false, {
                    fileName: "[project]/components/departments/DepartmentMasterPanel.tsx",
                    lineNumber: 235,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/departments/DepartmentMasterPanel.tsx",
                lineNumber: 234,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Dialog$2f$Dialog$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Dialog$3e$__["Dialog"], {
                open: Boolean(intIsDialogOpen),
                onClose: closeDialog,
                fullWidth: true,
                maxWidth: "sm",
                "aria-labelledby": "department-dialog-title",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$DialogTitle$2f$DialogTitle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DialogTitle$3e$__["DialogTitle"], {
                        id: "department-dialog-title",
                        children: strDialogMode === "add" ? "Add Department" : "Edit Department"
                    }, void 0, false, {
                        fileName: "[project]/components/departments/DepartmentMasterPanel.tsx",
                        lineNumber: 252,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$DialogContent$2f$DialogContent$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DialogContent$3e$__["DialogContent"], {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
                            spacing: 2,
                            sx: {
                                mt: 1
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hook$2d$form$2f$dist$2f$index$2e$esm$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Controller"], {
                                    name: "code",
                                    control: control,
                                    render: ({ field })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__["TextField"], {
                                            ...field,
                                            id: "department-code",
                                            label: "Department Code",
                                            required: true,
                                            fullWidth: true,
                                            onChange: (event)=>{
                                                clearErrors("code");
                                                field.onChange(event.target.value.toUpperCase());
                                            },
                                            error: Boolean(errors.code),
                                            helperText: errors.code?.message
                                        }, void 0, false, {
                                            fileName: "[project]/components/departments/DepartmentMasterPanel.tsx",
                                            lineNumber: 261,
                                            columnNumber: 17
                                        }, void 0)
                                }, void 0, false, {
                                    fileName: "[project]/components/departments/DepartmentMasterPanel.tsx",
                                    lineNumber: 257,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hook$2d$form$2f$dist$2f$index$2e$esm$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Controller"], {
                                    name: "name",
                                    control: control,
                                    render: ({ field })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__["TextField"], {
                                            ...field,
                                            id: "department-name",
                                            label: "Department Name",
                                            required: true,
                                            fullWidth: true,
                                            onChange: (event)=>{
                                                clearErrors("name");
                                                field.onChange(event);
                                            },
                                            error: Boolean(errors.name),
                                            helperText: errors.name?.message
                                        }, void 0, false, {
                                            fileName: "[project]/components/departments/DepartmentMasterPanel.tsx",
                                            lineNumber: 280,
                                            columnNumber: 17
                                        }, void 0)
                                }, void 0, false, {
                                    fileName: "[project]/components/departments/DepartmentMasterPanel.tsx",
                                    lineNumber: 276,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hook$2d$form$2f$dist$2f$index$2e$esm$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Controller"], {
                                    name: "manager",
                                    control: control,
                                    render: ({ field })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__["TextField"], {
                                            ...field,
                                            id: "department-manager",
                                            label: "Manager Name",
                                            required: true,
                                            fullWidth: true,
                                            onChange: (event)=>{
                                                clearErrors("manager");
                                                field.onChange(event);
                                            },
                                            error: Boolean(errors.manager),
                                            helperText: errors.manager?.message
                                        }, void 0, false, {
                                            fileName: "[project]/components/departments/DepartmentMasterPanel.tsx",
                                            lineNumber: 299,
                                            columnNumber: 17
                                        }, void 0)
                                }, void 0, false, {
                                    fileName: "[project]/components/departments/DepartmentMasterPanel.tsx",
                                    lineNumber: 295,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hook$2d$form$2f$dist$2f$index$2e$esm$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Controller"], {
                                    name: "status",
                                    control: control,
                                    render: ({ field })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__["TextField"], {
                                            ...field,
                                            id: "department-status",
                                            label: "Status",
                                            select: true,
                                            required: true,
                                            fullWidth: true,
                                            onChange: (event)=>{
                                                clearErrors("status");
                                                field.onChange(event);
                                            },
                                            error: Boolean(errors.status),
                                            helperText: errors.status?.message,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$MenuItem$2f$MenuItem$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MenuItem$3e$__["MenuItem"], {
                                                    value: "Active",
                                                    children: "Active"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/departments/DepartmentMasterPanel.tsx",
                                                    lineNumber: 332,
                                                    columnNumber: 19
                                                }, void 0),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$MenuItem$2f$MenuItem$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MenuItem$3e$__["MenuItem"], {
                                                    value: "Inactive",
                                                    children: "Inactive"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/departments/DepartmentMasterPanel.tsx",
                                                    lineNumber: 333,
                                                    columnNumber: 19
                                                }, void 0)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/departments/DepartmentMasterPanel.tsx",
                                            lineNumber: 318,
                                            columnNumber: 17
                                        }, void 0)
                                }, void 0, false, {
                                    fileName: "[project]/components/departments/DepartmentMasterPanel.tsx",
                                    lineNumber: 314,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/departments/DepartmentMasterPanel.tsx",
                            lineNumber: 256,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/departments/DepartmentMasterPanel.tsx",
                        lineNumber: 255,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$DialogActions$2f$DialogActions$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DialogActions$3e$__["DialogActions"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                onClick: closeDialog,
                                children: "Cancel"
                            }, void 0, false, {
                                fileName: "[project]/components/departments/DepartmentMasterPanel.tsx",
                                lineNumber: 340,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                onClick: handleSubmit(onValidSubmit, onInvalidSubmit),
                                variant: "contained",
                                disabled: isSubmitting,
                                children: strDialogMode === "add" ? "Save Department" : "Update Department"
                            }, void 0, false, {
                                fileName: "[project]/components/departments/DepartmentMasterPanel.tsx",
                                lineNumber: 341,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/departments/DepartmentMasterPanel.tsx",
                        lineNumber: 339,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/departments/DepartmentMasterPanel.tsx",
                lineNumber: 245,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s(DepartmentMasterPanel, "5qzk4fv8QGwqhq/Hv5XI+VPk570=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hook$2d$form$2f$dist$2f$index$2e$esm$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useForm"]
    ];
});
_c = DepartmentMasterPanel;
var _c;
__turbopack_context__.k.register(_c, "DepartmentMasterPanel");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_f0a3ec49._.js.map