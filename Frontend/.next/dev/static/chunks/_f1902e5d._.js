(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/constants/Constant.json (json)", ((__turbopack_context__) => {

__turbopack_context__.v({"common":{"cancel":"Cancel","save":"Save","update":"Update","statusActive":"Active","statusInactive":"Inactive"},"appShell":{"brand":"HRMS","title":"Human Resource Management System","logout":"Logout","logoutDialogTitle":"Confirm Logout","logoutDialogMessage":"Are you sure you want to logout from the application?","logoutConfirmButton":"Confirm Logout","nav":{"dashboard":"Dashboard","employees":"Employees","employeeList":"Employee List","addEmployee":"Add Employee","userMaster":"User Master","departmentMaster":"Department Master","departmentMasterInline":"Department Master Inline","leave":"Leave","leaveRequests":"Leave Requests","applyLeave":"Apply Leave","payroll":"Payroll","payrollOverview":"Payroll Overview","runPayroll":"Run Payroll","payslips":"Payslips","attendance":"Attendance","theme":"Theme","profile":"Profile","settings":"Settings"}},"commonDataGrid":{"filterPlaceholder":"Filter records...","emptyMessage":"No records found.","exportExcel":"Excel","exportPdf":"PDF","defaultExportFileName":"grid-data"},"login":{"title":"Sign In","subtitle":"Welcome back. Please login to continue.","userIdLabel":"User ID","passwordLabel":"Password","loginButton":"Login","userIdRequired":"User ID is required.","userIdMin":"User ID must be at least 4 characters.","passwordRequired":"Password is required.","passwordMin":"Password must be at least 6 characters.","imageAlt":"HRMS illustration for login screen","rememberMe":"Remember me","forgotPassword":"Forgot Password?"},"employees":{"pageTitle":"Employees","addButton":"Add Employee","actionView":"View","grid":{"id":"ID","name":"Name","department":"Department","role":"Role","action":"Action"},"form":{"fullName":"Full Name","email":"Email","role":"Role","department":"Department","status":"Status","fullNameRequired":"Full Name is required.","emailRequired":"Email is required.","emailInvalid":"Enter a valid email address.","roleRequired":"Role is required.","departmentRequired":"Department is required.","statusRequired":"Status is required."}},"leave":{"pageTitle":"Leave Management","applyButton":"Apply Leave","actionApprove":"Approve","grid":{"id":"ID","employee":"Employee","type":"Type","status":"Status","action":"Action"},"form":{"type":"Leave Type","startDate":"Start Date","endDate":"End Date","reason":"Reason","submit":"Submit Request","typeCasual":"Casual Leave","typeSick":"Sick Leave","typeEarned":"Earned Leave"}},"attendance":{"pageTitle":"Attendance Tracker","grid":{"date":"Date","status":"Status","checkIn":"Check In","checkOut":"Check Out"}},"payroll":{"runForm":{"month":"Payroll Month","department":"Department","cycle":"Pay Cycle","note":"Processing Note","notePlaceholder":"Optional note for payroll approvers","generateButton":"Generate Payroll","previewButton":"Preview Summary","monthMarch":"March 2026","monthFebruary":"February 2026","monthJanuary":"January 2026","departmentAll":"All Departments","departmentEngineering":"Engineering","departmentHr":"HR","departmentFinance":"Finance","cycleMonthly":"Monthly","cycleBiWeekly":"Bi-Weekly"},"payslips":{"title":"Payslips","download":"Download","grid":{"id":"Payslip ID","employee":"Employee","month":"Month","amount":"Net Amount","status":"Status","action":"Action"}}},"profile":{"fullName":"Full Name","email":"Email","phone":"Phone","designation":"Designation","updateButton":"Update Profile","sectionPersonal":"Personal Information","sectionWork":"Work Information","sectionSecurity":"Security Settings","changePhoto":"Change photo","twoFactor":"Two-factor authentication","twoFactorStatus":"Disabled (placeholder)","lastLogin":"Last login: Today at 09:12 AM"},"settings":{"description":"Settings in this template are UI-only placeholders.","darkMode":"Enable dark mode","emailNotifications":"Email notifications","attendanceSummary":"Weekly attendance summary","saveButton":"Save Settings"},"theme":{"description":"Select a color theme for the entire website.","applyButton":"Apply Theme","appliedButton":"Applied","presets":{"ocean":"Ocean Blue","emerald":"Emerald Green","sunset":"Sunset Orange","violet":"Violet Purple","rose":"Rose Red","cyan":"Cyan Teal","amber":"Amber Gold","slate":"Slate Gray","indigo":"Indigo Deep","lime":"Lime Green","vibgyorLight":"Light VIBGYOR","softLight":"Soft Light"}},"departments":{"pageTitle":"Department Master","inlinePageTitle":"Department Master (Inline)","addButton":"Add Department","inlineAddButton":"Add Department In Grid","editButton":"Edit","saveDepartment":"Save","updateDepartment":"Update Department","dialogAddTitle":"Add Department","dialogEditTitle":"Edit Department","fields":{"code":"Department Code","name":"Department Name","manager":"Manager Name","status":"Status"},"grid":{"id":"ID","code":"Code","name":"Department Name","manager":"Manager","status":"Status","employees":"Employees","action":"Action"},"validation":{"codeRequired":"Department Code is required.","codeFormat":"Code must be 2-20 chars, uppercase letters, numbers, or hyphen.","codeDuplicate":"Department Code already exists.","nameRequired":"Department Name is required.","nameMin":"Department Name must be at least 3 characters.","nameDuplicate":"Department Name already exists.","managerRequired":"Manager Name is required.","managerMin":"Manager Name must be at least 3 characters.","statusRequired":"Status is required."}}});}),
"[project]/app/login/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>LoginPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$Visibility$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/Visibility.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$VisibilityOff$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/VisibilityOff.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Box/Box.js [app-client] (ecmascript) <export default as Box>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Button/Button.js [app-client] (ecmascript) <export default as Button>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Card$2f$Card$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Card$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Card/Card.js [app-client] (ecmascript) <export default as Card>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$CardContent$2f$CardContent$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CardContent$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/CardContent/CardContent.js [app-client] (ecmascript) <export default as CardContent>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Checkbox$2f$Checkbox$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Checkbox$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Checkbox/Checkbox.js [app-client] (ecmascript) <export default as Checkbox>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$CircularProgress$2f$CircularProgress$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CircularProgress$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/CircularProgress/CircularProgress.js [app-client] (ecmascript) <export default as CircularProgress>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$FormControlLabel$2f$FormControlLabel$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FormControlLabel$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/FormControlLabel/FormControlLabel.js [app-client] (ecmascript) <export default as FormControlLabel>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$IconButton$2f$IconButton$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__IconButton$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/IconButton/IconButton.js [app-client] (ecmascript) <export default as IconButton>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$InputAdornment$2f$InputAdornment$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__InputAdornment$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/InputAdornment/InputAdornment.js [app-client] (ecmascript) <export default as InputAdornment>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Link$2f$Link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Link$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Link/Link.js [app-client] (ecmascript) <export default as Link>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Stack/Stack.js [app-client] (ecmascript) <export default as Stack>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/TextField/TextField.js [app-client] (ecmascript) <export default as TextField>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Typography/Typography.js [app-client] (ecmascript) <export default as Typography>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hook$2d$form$2f$dist$2f$index$2e$esm$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-hook-form/dist/index.esm.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$hookform$2f$resolvers$2f$yup$2f$dist$2f$yup$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@hookform/resolvers/yup/dist/yup.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$yup$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/yup/index.esm.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
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
;
;
;
;
const clsLoginSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$yup$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["object"]({
    userId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$yup$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["string"]().required(__TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].login.userIdRequired).min(4, __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].login.userIdMin),
    password: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$yup$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["string"]().required(__TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].login.passwordRequired).min(6, __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].login.passwordMin)
});
const dicTextFieldSx = {
    "& .MuiFormLabel-asterisk": {
        color: "#ef4444"
    },
    "& .MuiInputLabel-root": {
        transform: "translate(14px, 15px) scale(1)"
    },
    "& .MuiInputLabel-root.MuiInputLabel-shrink": {
        transform: "translate(14px, -9px) scale(0.75)"
    },
    "& .MuiOutlinedInput-root": {
        minHeight: 52,
        borderRadius: "14px",
        alignItems: "center",
        transition: "all 0.2s ease",
        "& input": {
            padding: "14px 14px"
        },
        "& .MuiOutlinedInput-notchedOutline": {
            border: "1px solid #e2e8f0"
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#cbd5e1"
        },
        "&.Mui-focused": {
            backgroundColor: "#f8fafc"
        },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#2563eb"
        }
    }
};
function LoginPage() {
    _s();
    // Functional responsibility:
    // - Render login UI and validate credentials using React Hook Form + Yup.
    // Inputs:
    // - User-provided userId and password values.
    // Output:
    // - Validated submit flow with loading state and redirect to dashboard.
    // Failure behavior:
    // - Invalid form blocks submission and displays field-level errors.
    const [intIsPasswordHidden, setIntIsPasswordHidden] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(1);
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const { control, clearErrors, handleSubmit, formState: { errors, isValid, isSubmitting } } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hook$2d$form$2f$dist$2f$index$2e$esm$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useForm"])({
        mode: "onChange",
        resolver: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$hookform$2f$resolvers$2f$yup$2f$dist$2f$yup$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["yupResolver"])(clsLoginSchema),
        defaultValues: {
            userId: "",
            password: ""
        }
    });
    const onSubmit = async (dicFormData)=>{
        console.log("Login Form Data:", dicFormData);
        await new Promise((resolve)=>{
            setTimeout(()=>{
                resolve();
            }, 2000);
        });
        const strAuthCookie = "hrms_auth=1; Path=/; Max-Age=28800; SameSite=Lax";
        document.cookie = strAuthCookie;
        router.push("/dashboard");
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__["Box"], {
        sx: {
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            px: {
                xs: 2,
                sm: 3
            },
            py: {
                xs: 3,
                sm: 4
            },
            backgroundColor: "#f8fafc"
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Card$2f$Card$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Card$3e$__["Card"], {
            elevation: 0,
            sx: {
                width: "100%",
                maxWidth: 1100,
                borderRadius: "28px",
                overflow: "hidden",
                boxShadow: "0 30px 60px rgba(0,0,0,0.08)",
                display: "grid",
                gridTemplateColumns: {
                    xs: "1fr",
                    md: "1fr 1fr"
                },
                animation: "loginFadeIn 200ms ease-out",
                "@keyframes loginFadeIn": {
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
                    sx: {
                        display: {
                            xs: "none",
                            md: "flex"
                        },
                        p: 6,
                        position: "relative",
                        overflow: "hidden",
                        alignItems: "flex-end",
                        background: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)"
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__["Box"], {
                            sx: {
                                position: "absolute",
                                inset: 0,
                                background: "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 40%)"
                            }
                        }, void 0, false, {
                            fileName: "[project]/app/login/page.tsx",
                            lineNumber: 157,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__["Box"], {
                            sx: {
                                position: "relative",
                                zIndex: 1
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                                    sx: {
                                        color: "rgba(255,255,255,0.9)",
                                        fontSize: 13,
                                        textTransform: "uppercase",
                                        letterSpacing: 1,
                                        mb: 1
                                    },
                                    children: "HRMS"
                                }, void 0, false, {
                                    fileName: "[project]/app/login/page.tsx",
                                    lineNumber: 166,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                                    sx: {
                                        color: "#ffffff",
                                        fontSize: 32,
                                        lineHeight: 1.15,
                                        fontWeight: 700,
                                        letterSpacing: "-0.2px",
                                        maxWidth: 360
                                    },
                                    children: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].appShell.title
                                }, void 0, false, {
                                    fileName: "[project]/app/login/page.tsx",
                                    lineNumber: 169,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                                    sx: {
                                        color: "rgba(255,255,255,0.85)",
                                        fontSize: 14,
                                        mt: 1.5
                                    },
                                    children: "Secure Workforce Platform"
                                }, void 0, false, {
                                    fileName: "[project]/app/login/page.tsx",
                                    lineNumber: 181,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/login/page.tsx",
                            lineNumber: 165,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/login/page.tsx",
                    lineNumber: 147,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$CardContent$2f$CardContent$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CardContent$3e$__["CardContent"], {
                    sx: {
                        p: {
                            xs: 3,
                            sm: 6
                        },
                        backgroundColor: "#ffffff",
                        borderRadius: {
                            md: "24px"
                        },
                        boxShadow: "inset 0 1px 2px rgba(15,23,42,0.04)",
                        display: "flex",
                        alignItems: "center"
                    },
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__["Box"], {
                        sx: {
                            width: "100%",
                            maxWidth: 430,
                            mx: "auto"
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                                sx: {
                                    fontSize: 32,
                                    fontWeight: 700,
                                    lineHeight: 1.2,
                                    mb: 1
                                },
                                children: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].login.title
                            }, void 0, false, {
                                fileName: "[project]/app/login/page.tsx",
                                lineNumber: 198,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                                sx: {
                                    fontSize: 15,
                                    color: "#64748b",
                                    mb: 3
                                },
                                children: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].login.subtitle
                            }, void 0, false, {
                                fileName: "[project]/app/login/page.tsx",
                                lineNumber: 201,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
                                component: "form",
                                spacing: 3,
                                onSubmit: handleSubmit(onSubmit),
                                noValidate: true,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hook$2d$form$2f$dist$2f$index$2e$esm$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Controller"], {
                                        name: "userId",
                                        control: control,
                                        render: ({ field })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__["TextField"], {
                                                ...field,
                                                id: "login-user-id",
                                                label: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].login.userIdLabel,
                                                fullWidth: true,
                                                required: true,
                                                autoFocus: true,
                                                onChange: (event)=>{
                                                    clearErrors("userId");
                                                    field.onChange(event);
                                                },
                                                error: Boolean(errors.userId),
                                                helperText: errors.userId?.message,
                                                inputProps: {
                                                    "aria-label": "User ID input",
                                                    minLength: 4
                                                },
                                                sx: dicTextFieldSx
                                            }, void 0, false, {
                                                fileName: "[project]/app/login/page.tsx",
                                                lineNumber: 210,
                                                columnNumber: 19
                                            }, void 0)
                                    }, void 0, false, {
                                        fileName: "[project]/app/login/page.tsx",
                                        lineNumber: 206,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hook$2d$form$2f$dist$2f$index$2e$esm$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Controller"], {
                                        name: "password",
                                        control: control,
                                        render: ({ field })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$TextField$2f$TextField$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TextField$3e$__["TextField"], {
                                                ...field,
                                                id: "login-password",
                                                label: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].login.passwordLabel,
                                                type: intIsPasswordHidden === 1 ? "password" : "text",
                                                fullWidth: true,
                                                required: true,
                                                onChange: (event)=>{
                                                    clearErrors("password");
                                                    field.onChange(event);
                                                },
                                                error: Boolean(errors.password),
                                                helperText: errors.password?.message,
                                                inputProps: {
                                                    "aria-label": "Password input",
                                                    minLength: 6
                                                },
                                                InputProps: {
                                                    endAdornment: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$InputAdornment$2f$InputAdornment$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__InputAdornment$3e$__["InputAdornment"], {
                                                        position: "end",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$IconButton$2f$IconButton$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__IconButton$3e$__["IconButton"], {
                                                            onClick: ()=>setIntIsPasswordHidden((intPrev)=>intPrev === 1 ? 0 : 1),
                                                            onMouseDown: (event)=>event.preventDefault(),
                                                            onMouseUp: (event)=>event.preventDefault(),
                                                            edge: "end",
                                                            "aria-label": intIsPasswordHidden === 1 ? "Show password" : "Hide password",
                                                            "aria-pressed": intIsPasswordHidden === 0,
                                                            "aria-controls": "login-password",
                                                            sx: {
                                                                transition: "all 0.2s ease",
                                                                "&:focus-visible": {
                                                                    outline: "2px solid #2563eb",
                                                                    outlineOffset: 2
                                                                }
                                                            },
                                                            children: intIsPasswordHidden === 1 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$Visibility$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                fontSize: "small"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/login/page.tsx",
                                                                lineNumber: 267,
                                                                columnNumber: 31
                                                            }, void 0) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$VisibilityOff$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                fontSize: "small"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/login/page.tsx",
                                                                lineNumber: 269,
                                                                columnNumber: 31
                                                            }, void 0)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/login/page.tsx",
                                                            lineNumber: 250,
                                                            columnNumber: 27
                                                        }, void 0)
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/login/page.tsx",
                                                        lineNumber: 249,
                                                        columnNumber: 25
                                                    }, void 0)
                                                },
                                                sx: dicTextFieldSx
                                            }, void 0, false, {
                                                fileName: "[project]/app/login/page.tsx",
                                                lineNumber: 233,
                                                columnNumber: 19
                                            }, void 0)
                                    }, void 0, false, {
                                        fileName: "[project]/app/login/page.tsx",
                                        lineNumber: 229,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
                                        direction: "row",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        sx: {
                                            mt: -0.5
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$FormControlLabel$2f$FormControlLabel$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FormControlLabel$3e$__["FormControlLabel"], {
                                                control: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Checkbox$2f$Checkbox$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Checkbox$3e$__["Checkbox"], {
                                                    size: "small",
                                                    inputProps: {
                                                        "aria-label": __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].login.rememberMe
                                                    },
                                                    sx: {
                                                        transition: "all 0.2s ease"
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/app/login/page.tsx",
                                                    lineNumber: 283,
                                                    columnNumber: 21
                                                }, void 0),
                                                label: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                                                    sx: {
                                                        fontSize: 14,
                                                        color: "#64748b"
                                                    },
                                                    children: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].login.rememberMe
                                                }, void 0, false, {
                                                    fileName: "[project]/app/login/page.tsx",
                                                    lineNumber: 289,
                                                    columnNumber: 26
                                                }, void 0),
                                                sx: {
                                                    m: 0
                                                }
                                            }, void 0, false, {
                                                fileName: "[project]/app/login/page.tsx",
                                                lineNumber: 281,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Link$2f$Link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Link$3e$__["Link"], {
                                                component: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"],
                                                href: "/forgot-password",
                                                underline: "none",
                                                sx: {
                                                    fontSize: 13,
                                                    color: "#64748b",
                                                    transition: "all 0.2s ease",
                                                    "&:hover": {
                                                        textDecoration: "underline",
                                                        color: "#1d4ed8"
                                                    },
                                                    "&:focus-visible": {
                                                        outline: "2px solid #2563eb",
                                                        outlineOffset: 3,
                                                        borderRadius: "4px"
                                                    }
                                                },
                                                children: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].login.forgotPassword
                                            }, void 0, false, {
                                                fileName: "[project]/app/login/page.tsx",
                                                lineNumber: 292,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/login/page.tsx",
                                        lineNumber: 280,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                        type: "submit",
                                        fullWidth: true,
                                        variant: "contained",
                                        disabled: !isValid || isSubmitting,
                                        sx: {
                                            minHeight: 52,
                                            borderRadius: "14px",
                                            backgroundColor: "#2563eb",
                                            fontWeight: 600,
                                            boxShadow: "0 6px 16px rgba(37,99,235,0.35)",
                                            transition: "all 0.15s ease",
                                            "&:hover": {
                                                transform: "translateY(-1px)",
                                                backgroundColor: "#1d4ed8"
                                            },
                                            "&:active": {
                                                transform: "translateY(0)"
                                            },
                                            "&:focus-visible": {
                                                outline: "2px solid #2563eb",
                                                outlineOffset: 2
                                            }
                                        },
                                        "aria-busy": isSubmitting,
                                        children: isSubmitting ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$CircularProgress$2f$CircularProgress$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CircularProgress$3e$__["CircularProgress"], {
                                            size: 22,
                                            color: "inherit"
                                        }, void 0, false, {
                                            fileName: "[project]/app/login/page.tsx",
                                            lineNumber: 341,
                                            columnNumber: 33
                                        }, this) : __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].login.loginButton
                                    }, void 0, false, {
                                        fileName: "[project]/app/login/page.tsx",
                                        lineNumber: 315,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/login/page.tsx",
                                lineNumber: 205,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/login/page.tsx",
                        lineNumber: 197,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/app/login/page.tsx",
                    lineNumber: 187,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/app/login/page.tsx",
            lineNumber: 130,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/login/page.tsx",
        lineNumber: 119,
        columnNumber: 5
    }, this);
}
_s(LoginPage, "Wx9sdUlYwlqI9m9LDgGRvsRm9zA=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hook$2d$form$2f$dist$2f$index$2e$esm$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useForm"]
    ];
});
_c = LoginPage;
var _c;
__turbopack_context__.k.register(_c, "LoginPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_f1902e5d._.js.map