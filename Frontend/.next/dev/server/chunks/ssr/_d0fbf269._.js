module.exports = [
"[project]/constants/Constant.json (json)", ((__turbopack_context__) => {

__turbopack_context__.v({"common":{"cancel":"Cancel","save":"Save","update":"Update","statusActive":"Active","statusInactive":"Inactive"},"appShell":{"brand":"HRMS","title":"Human Resource Management System","logout":"Logout","logoutDialogTitle":"Confirm Logout","logoutDialogMessage":"Are you sure you want to logout from the application?","logoutConfirmButton":"Confirm Logout","nav":{"dashboard":"Dashboard","employees":"Employees","employeeList":"Employee List","addEmployee":"Add Employee","departmentMaster":"Department Master","departmentMasterInline":"Department Master Inline","leave":"Leave","leaveRequests":"Leave Requests","applyLeave":"Apply Leave","payroll":"Payroll","payrollOverview":"Payroll Overview","runPayroll":"Run Payroll","payslips":"Payslips","attendance":"Attendance","theme":"Theme","profile":"Profile","settings":"Settings"}},"commonDataGrid":{"filterPlaceholder":"Filter records...","emptyMessage":"No records found.","exportExcel":"Excel","exportPdf":"PDF","defaultExportFileName":"grid-data"},"login":{"title":"Sign In","subtitle":"Welcome back. Please login to continue.","userIdLabel":"User ID","passwordLabel":"Password","loginButton":"Login","userIdRequired":"User ID is required.","userIdMin":"User ID must be at least 4 characters.","passwordRequired":"Password is required.","passwordMin":"Password must be at least 6 characters."},"employees":{"pageTitle":"Employees","addButton":"Add Employee","actionView":"View","grid":{"id":"ID","name":"Name","department":"Department","role":"Role","action":"Action"},"form":{"fullName":"Full Name","email":"Email","role":"Role","department":"Department","status":"Status","fullNameRequired":"Full Name is required.","emailRequired":"Email is required.","emailInvalid":"Enter a valid email address.","roleRequired":"Role is required.","departmentRequired":"Department is required.","statusRequired":"Status is required."}},"leave":{"pageTitle":"Leave Management","applyButton":"Apply Leave","actionApprove":"Approve","grid":{"id":"ID","employee":"Employee","type":"Type","status":"Status","action":"Action"},"form":{"type":"Leave Type","startDate":"Start Date","endDate":"End Date","reason":"Reason","submit":"Submit Request","typeCasual":"Casual Leave","typeSick":"Sick Leave","typeEarned":"Earned Leave"}},"attendance":{"pageTitle":"Attendance Tracker","grid":{"date":"Date","status":"Status","checkIn":"Check In","checkOut":"Check Out"}},"payroll":{"runForm":{"month":"Payroll Month","department":"Department","cycle":"Pay Cycle","note":"Processing Note","notePlaceholder":"Optional note for payroll approvers","generateButton":"Generate Payroll","previewButton":"Preview Summary","monthMarch":"March 2026","monthFebruary":"February 2026","monthJanuary":"January 2026","departmentAll":"All Departments","departmentEngineering":"Engineering","departmentHr":"HR","departmentFinance":"Finance","cycleMonthly":"Monthly","cycleBiWeekly":"Bi-Weekly"},"payslips":{"title":"Payslips","download":"Download","grid":{"id":"Payslip ID","employee":"Employee","month":"Month","amount":"Net Amount","status":"Status","action":"Action"}}},"profile":{"fullName":"Full Name","email":"Email","phone":"Phone","designation":"Designation","updateButton":"Update Profile"},"settings":{"description":"Settings in this template are UI-only placeholders.","darkMode":"Enable dark mode","emailNotifications":"Email notifications","attendanceSummary":"Weekly attendance summary","saveButton":"Save Settings"},"theme":{"description":"Select a color theme for the entire website.","applyButton":"Apply Theme","appliedButton":"Applied","presets":{"ocean":"Ocean Blue","emerald":"Emerald Green","sunset":"Sunset Orange","violet":"Violet Purple","rose":"Rose Red","cyan":"Cyan Teal","amber":"Amber Gold","slate":"Slate Gray","indigo":"Indigo Deep","lime":"Lime Green","vibgyorLight":"Light VIBGYOR","softLight":"Soft Light"}},"departments":{"pageTitle":"Department Master","inlinePageTitle":"Department Master (Inline)","addButton":"Add Department","inlineAddButton":"Add Department In Grid","editButton":"Edit","saveDepartment":"Save Department","updateDepartment":"Update Department","dialogAddTitle":"Add Department","dialogEditTitle":"Edit Department","fields":{"code":"Department Code","name":"Department Name","manager":"Manager Name","status":"Status"},"grid":{"id":"ID","code":"Code","name":"Department Name","manager":"Manager","status":"Status","employees":"Employees","action":"Action"},"validation":{"codeRequired":"Department Code is required.","codeFormat":"Code must be 2-20 chars, uppercase letters, numbers, or hyphen.","codeDuplicate":"Department Code already exists.","nameRequired":"Department Name is required.","nameMin":"Department Name must be at least 3 characters.","nameDuplicate":"Department Name already exists.","managerRequired":"Manager Name is required.","managerMin":"Manager Name must be at least 3 characters.","statusRequired":"Status is required."}}});}),
"[project]/components/common/CommonDataGrid.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CommonDataGrid
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$Search$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/Search.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$PictureAsPdfOutlined$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/PictureAsPdfOutlined.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$TableViewOutlined$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/TableViewOutlined.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Button/Button.js [app-ssr] (ecmascript) <export default as Button>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$InputAdornment$2f$InputAdornment$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__InputAdornment$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/InputAdornment/InputAdornment.js [app-ssr] (ecmascript) <export default as InputAdornment>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$Paper$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Paper$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Paper/Paper.js [app-ssr] (ecmascript) <export default as Paper>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Stack/Stack.js [app-ssr] (ecmascript) <export default as Stack>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Table$2f$Table$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Table$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Table/Table.js [app-ssr] (ecmascript) <export default as Table>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableBody$2f$TableBody$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TableBody$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/TableBody/TableBody.js [app-ssr] (ecmascript) <export default as TableBody>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableCell$2f$TableCell$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TableCell$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/TableCell/TableCell.js [app-ssr] (ecmascript) <export default as TableCell>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableHead$2f$TableHead$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TableHead$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/TableHead/TableHead.js [app-ssr] (ecmascript) <export default as TableHead>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TablePagination$2f$TablePagination$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TablePagination$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/TablePagination/TablePagination.js [app-ssr] (ecmascript) <export default as TablePagination>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableRow$2f$TableRow$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TableRow$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/TableRow/TableRow.js [app-ssr] (ecmascript) <export default as TableRow>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableSortLabel$2f$TableSortLabel$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TableSortLabel$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/TableSortLabel/TableSortLabel.js [app-ssr] (ecmascript) <export default as TableSortLabel>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/TextField/TextField.js [app-ssr] (ecmascript) <export default as TextField>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__ = __turbopack_context__.i("[project]/constants/Constant.json (json)");
"use client";
;
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
    const [searchTerm, setSearchTerm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [sortBy, setSortBy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [sortDirection, setSortDirection] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("asc");
    const [page, setPage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const [rowsPerPage, setRowsPerPage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(defaultPageSize);
    const filteredAndSortedRows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        // Logical flow:
        // 1) Apply text filtering on filterable columns.
        // 2) Apply sorting on the selected sortable column.
        const searchableColumns = columns.filter((column)=>column.filterable !== false);
        const filtered = rows.filter((row)=>{
            if (!searchTerm.trim()) {
                return true;
            }
            const query = searchTerm.toLowerCase();
            return searchableColumns.some((column)=>{
                const value = row[column.field];
                if (typeof value === "string" || typeof value === "number") {
                    return String(value).toLowerCase().includes(query);
                }
                return false;
            });
        });
        if (!sortBy) {
            return filtered;
        }
        const sorted = [
            ...filtered
        ].sort((a, b)=>{
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
        });
        return sorted;
    }, [
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
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        setPage(0);
    }, [
        searchTerm,
        sortBy,
        sortDirection,
        rowsPerPage
    ]);
    const paginatedRows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        // Logical flow:
        // Slice filtered/sorted rows for current page window.
        const start = page * rowsPerPage;
        return filteredAndSortedRows.slice(start, start + rowsPerPage);
    }, [
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
        if (/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isValidElement"])(value)) {
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
    const table = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
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
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__["TextField"], {
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
                            startAdornment: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$InputAdornment$2f$InputAdornment$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__InputAdornment$3e$__["InputAdornment"], {
                                position: "start",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$Search$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
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
                    showExportOptions ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
                        direction: "row",
                        spacing: 1,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                variant: "outlined",
                                size: "small",
                                startIcon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$TableViewOutlined$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
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
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                variant: "outlined",
                                size: "small",
                                startIcon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$PictureAsPdfOutlined$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Table$2f$Table$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Table$3e$__["Table"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableHead$2f$TableHead$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TableHead$3e$__["TableHead"], {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableRow$2f$TableRow$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TableRow$3e$__["TableRow"], {
                            children: columns.map((column)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableCell$2f$TableCell$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TableCell$3e$__["TableCell"], {
                                    align: column.align ?? "left",
                                    sx: column.width ? {
                                        width: column.width
                                    } : undefined,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableSortLabel$2f$TableSortLabel$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TableSortLabel$3e$__["TableSortLabel"], {
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
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableBody$2f$TableBody$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TableBody$3e$__["TableBody"], {
                        children: filteredAndSortedRows.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableRow$2f$TableRow$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TableRow$3e$__["TableRow"], {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableCell$2f$TableCell$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TableCell$3e$__["TableCell"], {
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
                        }, this) : paginatedRows.map((row, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableRow$2f$TableRow$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TableRow$3e$__["TableRow"], {
                                hover: true,
                                children: columns.map((column)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TableCell$2f$TableCell$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TableCell$3e$__["TableCell"], {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TablePagination$2f$TablePagination$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TablePagination$3e$__["TablePagination"], {
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$Paper$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Paper$3e$__["Paper"], {
        sx: sx,
        children: table
    }, void 0, false, {
        fileName: "[project]/components/common/CommonDataGrid.tsx",
        lineNumber: 342,
        columnNumber: 10
    }, this);
}
}),
"[project]/components/departments/DepartmentMasterInlinePanel.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DepartmentMasterInlinePanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$EditOutlined$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/EditOutlined.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Button/Button.js [app-ssr] (ecmascript) <export default as Button>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$MenuItem$2f$MenuItem$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MenuItem$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/MenuItem/MenuItem.js [app-ssr] (ecmascript) <export default as MenuItem>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$Paper$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Paper$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Paper/Paper.js [app-ssr] (ecmascript) <export default as Paper>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Stack/Stack.js [app-ssr] (ecmascript) <export default as Stack>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/TextField/TextField.js [app-ssr] (ecmascript) <export default as TextField>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Typography/Typography.js [app-ssr] (ecmascript) <export default as Typography>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$CommonDataGrid$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/common/CommonDataGrid.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
function DepartmentMasterInlinePanel() {
    // Functional responsibility:
    // - Render department master grid with add/edit performed directly in table rows.
    // Inputs:
    // - Local in-memory department list and row editor form states.
    // Output:
    // - Inline editable grid with validated save/cancel actions.
    // Failure behavior:
    // - Invalid/duplicate values block save, show field errors, and focus first invalid input.
    const [lstDepartments, setLstDepartments] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([
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
    const [intNextDepartmentId, setIntNextDepartmentId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(4);
    const [strEditingDepartmentId, setStrEditingDepartmentId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [intIsAddingDepartment, setIntIsAddingDepartment] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const [dicEditValues, setDicEditValues] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        code: "",
        name: "",
        manager: "",
        status: "Active"
    });
    const [dicNewValues, setDicNewValues] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        code: "",
        name: "",
        manager: "",
        status: "Active"
    });
    const [dicFieldErrors, setDicFieldErrors] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({});
    const dicFieldRefs = {
        code: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null),
        name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null),
        manager: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null),
        status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null)
    };
    const validateDepartmentValues = (dicValues, strCurrentDepartmentId)=>{
        const dicErrors = {};
        const strCodeUpper = dicValues.code.trim().toUpperCase();
        const strNameTrimmed = dicValues.name.trim();
        const strManagerTrimmed = dicValues.manager.trim();
        const strCodePattern = /^[A-Z0-9-]{2,20}$/;
        if (!strCodeUpper) {
            dicErrors.code = "Department Code is required.";
        } else if (!strCodePattern.test(strCodeUpper)) {
            dicErrors.code = "Code must be 2-20 chars, uppercase letters, numbers, or hyphen.";
        }
        if (!strNameTrimmed) {
            dicErrors.name = "Department Name is required.";
        } else if (strNameTrimmed.length < 3) {
            dicErrors.name = "Department Name must be at least 3 characters.";
        }
        if (!strManagerTrimmed) {
            dicErrors.manager = "Manager Name is required.";
        } else if (strManagerTrimmed.length < 3) {
            dicErrors.manager = "Manager Name must be at least 3 characters.";
        }
        if (!dicValues.status) {
            dicErrors.status = "Status is required.";
        }
        const intHasCodeDuplicate = lstDepartments.some((dicDepartment)=>dicDepartment.code.toUpperCase() === strCodeUpper && dicDepartment.id !== strCurrentDepartmentId) ? 1 : 0;
        if (intHasCodeDuplicate === 1) {
            dicErrors.code = "Department Code already exists.";
        }
        const intHasNameDuplicate = lstDepartments.some((dicDepartment)=>dicDepartment.name.trim().toLowerCase() === strNameTrimmed.toLowerCase() && dicDepartment.id !== strCurrentDepartmentId) ? 1 : 0;
        if (intHasNameDuplicate === 1) {
            dicErrors.name = "Department Name already exists.";
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
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__["TextField"], {
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
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$MenuItem$2f$MenuItem$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MenuItem$3e$__["MenuItem"], {
                        value: "Active",
                        children: "Active"
                    }, void 0, false, {
                        fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                        lineNumber: 259,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$MenuItem$2f$MenuItem$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MenuItem$3e$__["MenuItem"], {
                        value: "Inactive",
                        children: "Inactive"
                    }, void 0, false, {
                        fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                        lineNumber: 260,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                lineNumber: 241,
                columnNumber: 9
            }, this);
        }
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__["TextField"], {
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
            lineNumber: 266,
            columnNumber: 7
        }, this);
    };
    const lstGridRows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const lstRows = lstDepartments.map((dicDepartment)=>{
            const intIsEditingRow = strEditingDepartmentId === dicDepartment.id ? 1 : 0;
            return {
                id: dicDepartment.id,
                code: intIsEditingRow ? renderEditableTextField("code", dicEditValues, setDicEditValues) : dicDepartment.code,
                name: intIsEditingRow ? renderEditableTextField("name", dicEditValues, setDicEditValues) : dicDepartment.name,
                manager: intIsEditingRow ? renderEditableTextField("manager", dicEditValues, setDicEditValues) : dicDepartment.manager,
                status: intIsEditingRow ? renderEditableTextField("status", dicEditValues, setDicEditValues, 1) : dicDepartment.status,
                employeeCount: dicDepartment.employeeCount,
                action: intIsEditingRow ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
                    direction: "row",
                    spacing: 1,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                            size: "small",
                            variant: "contained",
                            onClick: handleSaveEdit,
                            children: "Save"
                        }, void 0, false, {
                            fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                            lineNumber: 302,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                            size: "small",
                            variant: "outlined",
                            onClick: handleCancelInline,
                            children: "Cancel"
                        }, void 0, false, {
                            fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                            lineNumber: 305,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                    lineNumber: 301,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                    size: "small",
                    variant: "outlined",
                    startIcon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$EditOutlined$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                        fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                        lineNumber: 313,
                        columnNumber: 24
                    }, void 0),
                    onClick: ()=>handleEditClick(dicDepartment),
                    disabled: intIsAddingDepartment === 1,
                    children: "Edit"
                }, void 0, false, {
                    fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                    lineNumber: 310,
                    columnNumber: 11
                }, this)
            };
        });
        if (intIsAddingDepartment === 1) {
            lstRows.unshift({
                id: "NEW",
                code: renderEditableTextField("code", dicNewValues, setDicNewValues),
                name: renderEditableTextField("name", dicNewValues, setDicNewValues),
                manager: renderEditableTextField("manager", dicNewValues, setDicNewValues),
                status: renderEditableTextField("status", dicNewValues, setDicNewValues, 1),
                employeeCount: "-",
                action: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
                    direction: "row",
                    spacing: 1,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                            size: "small",
                            variant: "contained",
                            onClick: handleSaveNew,
                            children: "Save"
                        }, void 0, false, {
                            fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                            lineNumber: 333,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                            size: "small",
                            variant: "outlined",
                            onClick: handleCancelInline,
                            children: "Cancel"
                        }, void 0, false, {
                            fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                            lineNumber: 336,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                    lineNumber: 332,
                    columnNumber: 11
                }, this)
            });
        }
        return lstRows;
    }, [
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
            headerName: "ID",
            sortable: false,
            filterable: false
        },
        {
            field: "code",
            headerName: "Code",
            sortable: false,
            filterable: false
        },
        {
            field: "name",
            headerName: "Department Name",
            sortable: false,
            filterable: false
        },
        {
            field: "manager",
            headerName: "Manager",
            sortable: false,
            filterable: false
        },
        {
            field: "status",
            headerName: "Status",
            sortable: false,
            filterable: false
        },
        {
            field: "employeeCount",
            headerName: "Employees",
            sortable: false,
            filterable: false
        },
        {
            field: "action",
            headerName: "Action",
            sortable: false,
            filterable: false,
            exportable: false
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                variant: "h4",
                fontWeight: 700,
                sx: {
                    mb: 2
                },
                children: "Department Master (Inline)"
            }, void 0, false, {
                fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                lineNumber: 359,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                variant: "contained",
                sx: {
                    mb: 2
                },
                onClick: handleAddClick,
                disabled: intIsAddingDepartment === 1 || Boolean(strEditingDepartmentId),
                children: "Add Department In Grid"
            }, void 0, false, {
                fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                lineNumber: 362,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$Paper$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Paper$3e$__["Paper"], {
                sx: {
                    p: 2.2
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$common$2f$CommonDataGrid$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                    columns: lstGridColumns,
                    rows: lstGridRows,
                    rowIdField: "id",
                    withPaper: false,
                    defaultPageSize: 10
                }, void 0, false, {
                    fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                    lineNumber: 371,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/departments/DepartmentMasterInlinePanel.tsx",
                lineNumber: 370,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
}),
];

//# sourceMappingURL=_d0fbf269._.js.map