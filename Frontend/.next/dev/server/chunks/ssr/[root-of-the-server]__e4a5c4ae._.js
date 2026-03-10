module.exports = [
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/app/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/layout.tsx [app-rsc] (ecmascript)"));
}),
"[project]/app/(dashboard)/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/(dashboard)/layout.tsx [app-rsc] (ecmascript)"));
}),
"[project]/src/components/UserMaster/UserMaster.module.css [app-rsc] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "actions": "UserMaster-module__F2U6hW__actions",
  "button": "UserMaster-module__F2U6hW__button",
  "card": "UserMaster-module__F2U6hW__card",
  "content": "UserMaster-module__F2U6hW__content",
  "empty": "UserMaster-module__F2U6hW__empty",
  "error": "UserMaster-module__F2U6hW__error",
  "field": "UserMaster-module__F2U6hW__field",
  "form": "UserMaster-module__F2U6hW__form",
  "ghost": "UserMaster-module__F2U6hW__ghost",
  "grid": "UserMaster-module__F2U6hW__grid",
  "header": "UserMaster-module__F2U6hW__header",
  "input": "UserMaster-module__F2U6hW__input",
  "label": "UserMaster-module__F2U6hW__label",
  "primary": "UserMaster-module__F2U6hW__primary",
  "subtitle": "UserMaster-module__F2U6hW__subtitle",
  "title": "UserMaster-module__F2U6hW__title",
  "wrapper": "UserMaster-module__F2U6hW__wrapper",
});
}),
"[project]/src/components/UserMaster/useUserMaster.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useUserMaster",
    ()=>useUserMaster
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react.js [app-rsc] (ecmascript)");
;
function useUserMaster(dicOptions = {}) {
    const { apiEndpoint = "/api/users", fetchOptions = {}, transformResponse, onSuccess, onError, onUsersChange, onCreate, onUpdate, onDelete } = dicOptions;
    const [lstUsers, setLstUsers] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["useState"])([]);
    const [intIsLoading, setIntIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["useState"])(0);
    const [intIsSubmitting, setIntIsSubmitting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["useState"])(0);
    const [strError, setStrError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["useState"])("");
    const requestJson = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["useCallback"])(async (strUrl, dicInit = {})=>{
        const dicMergedInit = {
            ...fetchOptions,
            ...dicInit,
            headers: {
                "Content-Type": "application/json",
                ...fetchOptions.headers || {},
                ...dicInit.headers || {}
            }
        };
        const dicResponse = await fetch(strUrl, dicMergedInit);
        const strRawBody = await dicResponse.text();
        const dicBody = strRawBody ? JSON.parse(strRawBody) : null;
        if (!dicResponse.ok) {
            const strMessage = dicBody?.message || `Request failed (${dicResponse.status})`;
            throw new Error(strMessage);
        }
        return dicBody;
    }, [
        fetchOptions
    ]);
    const normalizeUsers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["useCallback"])((dicPayload)=>{
        if (typeof transformResponse === "function") {
            return transformResponse(dicPayload);
        }
        if (Array.isArray(dicPayload)) {
            return dicPayload;
        }
        if (Array.isArray(dicPayload?.data)) {
            return dicPayload.data;
        }
        if (Array.isArray(dicPayload?.users)) {
            return dicPayload.users;
        }
        return [];
    }, [
        transformResponse
    ]);
    const loadUsers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        setIntIsLoading(1);
        setStrError("");
        try {
            const dicPayload = await requestJson(apiEndpoint, {
                method: "GET"
            });
            const lstNormalizedUsers = normalizeUsers(dicPayload);
            setLstUsers(lstNormalizedUsers);
            if (typeof onUsersChange === "function") {
                onUsersChange(lstNormalizedUsers);
            }
            if (typeof onSuccess === "function") {
                onSuccess({
                    type: "load",
                    data: lstNormalizedUsers
                });
            }
        } catch (dicError) {
            const strMessage = dicError instanceof Error ? dicError.message : "Failed to load users";
            setStrError(strMessage);
            if (typeof onError === "function") {
                onError({
                    type: "load",
                    error: dicError
                });
            }
        } finally{
            setIntIsLoading(0);
        }
    }, [
        apiEndpoint,
        normalizeUsers,
        onError,
        onSuccess,
        onUsersChange,
        requestJson
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        loadUsers();
    }, [
        loadUsers
    ]);
    const upsertUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["useCallback"])(async (dicUserPayload, strMode = "create")=>{
        setIntIsSubmitting(1);
        setStrError("");
        try {
            const intIsUpdateMode = strMode === "update" ? 1 : 0;
            const strId = dicUserPayload?.id ?? "";
            const strUrl = intIsUpdateMode === 1 ? `${apiEndpoint}/${strId}` : apiEndpoint;
            const dicSavedUser = await requestJson(strUrl, {
                method: intIsUpdateMode === 1 ? "PUT" : "POST",
                body: JSON.stringify(dicUserPayload)
            });
            if (intIsUpdateMode === 1) {
                if (typeof onUpdate === "function") {
                    onUpdate(dicSavedUser);
                }
            } else if (typeof onCreate === "function") {
                onCreate(dicSavedUser);
            }
            if (typeof onSuccess === "function") {
                onSuccess({
                    type: strMode,
                    data: dicSavedUser
                });
            }
            await loadUsers();
            return {
                intIsSuccess: 1,
                data: dicSavedUser
            };
        } catch (dicError) {
            const strMessage = dicError instanceof Error ? dicError.message : "Failed to save user";
            setStrError(strMessage);
            if (typeof onError === "function") {
                onError({
                    type: strMode,
                    error: dicError
                });
            }
            return {
                intIsSuccess: 0,
                error: dicError
            };
        } finally{
            setIntIsSubmitting(0);
        }
    }, [
        apiEndpoint,
        loadUsers,
        onCreate,
        onError,
        onSuccess,
        onUpdate,
        requestJson
    ]);
    const deleteUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["useCallback"])(async (strUserId)=>{
        setIntIsSubmitting(1);
        setStrError("");
        try {
            await requestJson(`${apiEndpoint}/${strUserId}`, {
                method: "DELETE"
            });
            if (typeof onDelete === "function") {
                onDelete(strUserId);
            }
            if (typeof onSuccess === "function") {
                onSuccess({
                    type: "delete",
                    data: {
                        id: strUserId
                    }
                });
            }
            await loadUsers();
            return {
                intIsSuccess: 1
            };
        } catch (dicError) {
            const strMessage = dicError instanceof Error ? dicError.message : "Failed to delete user";
            setStrError(strMessage);
            if (typeof onError === "function") {
                onError({
                    type: "delete",
                    error: dicError
                });
            }
            return {
                intIsSuccess: 0,
                error: dicError
            };
        } finally{
            setIntIsSubmitting(0);
        }
    }, [
        apiEndpoint,
        loadUsers,
        onDelete,
        onError,
        onSuccess,
        requestJson
    ]);
    const dicState = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["useMemo"])(()=>({
            lstUsers,
            intIsLoading,
            intIsSubmitting,
            strError
        }), [
        intIsLoading,
        intIsSubmitting,
        lstUsers,
        strError
    ]);
    return {
        ...dicState,
        loadUsers,
        createUser: (dicUserPayload)=>upsertUser(dicUserPayload, "create"),
        updateUser: (dicUserPayload)=>upsertUser(dicUserPayload, "update"),
        deleteUser
    };
}
}),
"[project]/src/components/UserMaster/UserMaster.jsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>UserMaster
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/src/components/UserMaster/UserMaster.module.css [app-rsc] (css module)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$useUserMaster$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/UserMaster/useUserMaster.js [app-rsc] (ecmascript)");
;
;
;
;
function UserMaster({ apiEndpoint = "/api/users", title = "User Master", subtitle = "Manage user records from a reusable module", fieldMap, onSuccess, onError, onUsersChange, onCreate, onUpdate, onDelete, fetchOptions, transformResponse, className = "" }) {
    const dicFieldMap = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["useMemo"])(()=>({
            id: fieldMap?.id || "id",
            name: fieldMap?.name || "name",
            email: fieldMap?.email || "email",
            role: fieldMap?.role || "role"
        }), [
        fieldMap
    ]);
    const { lstUsers, intIsLoading, intIsSubmitting, strError, createUser, updateUser, deleteUser, loadUsers } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$useUserMaster$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["useUserMaster"])({
        apiEndpoint,
        fetchOptions,
        transformResponse,
        onSuccess,
        onError,
        onUsersChange,
        onCreate,
        onUpdate,
        onDelete
    });
    const [strEditingId, setStrEditingId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["useState"])("");
    const [dicForm, setDicForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["useState"])({
        name: "",
        email: "",
        role: ""
    });
    const resetForm = ()=>{
        setStrEditingId("");
        setDicForm({
            name: "",
            email: "",
            role: ""
        });
    };
    const handleChange = (strField, strValue)=>{
        setDicForm((dicPrev)=>({
                ...dicPrev,
                [strField]: strValue
            }));
    };
    const handleEdit = (dicUser)=>{
        setStrEditingId(String(dicUser[dicFieldMap.id] ?? ""));
        setDicForm({
            name: String(dicUser[dicFieldMap.name] ?? ""),
            email: String(dicUser[dicFieldMap.email] ?? ""),
            role: String(dicUser[dicFieldMap.role] ?? "")
        });
    };
    const handleSubmit = async (event)=>{
        event.preventDefault();
        const dicPayload = {
            [dicFieldMap.name]: dicForm.name,
            [dicFieldMap.email]: dicForm.email,
            [dicFieldMap.role]: dicForm.role
        };
        if (strEditingId) {
            dicPayload[dicFieldMap.id] = strEditingId;
            await updateUser(dicPayload);
            resetForm();
            return;
        }
        await createUser(dicPayload);
        resetForm();
    };
    const handleDelete = async (strUserId)=>{
        await deleteUser(strUserId);
        if (strEditingId === strUserId) {
            resetForm();
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: `${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].wrapper} ${className}`.trim(),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].header,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].title,
                                children: title
                            }, void 0, false, {
                                fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                lineNumber: 120,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].subtitle,
                                children: subtitle
                            }, void 0, false, {
                                fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                lineNumber: 121,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                        lineNumber: 119,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        className: `${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].button} ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].ghost}`,
                        onClick: loadUsers,
                        disabled: intIsLoading === 1,
                        children: intIsLoading === 1 ? "Refreshing..." : "Refresh"
                    }, void 0, false, {
                        fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                        lineNumber: 123,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                lineNumber: 118,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].card,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].content,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].form,
                            onSubmit: handleSubmit,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].field,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].label,
                                            children: "Name"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                            lineNumber: 132,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].input,
                                            value: dicForm.name,
                                            onChange: (event)=>handleChange("name", event.target.value),
                                            required: true
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                            lineNumber: 133,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                    lineNumber: 131,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].field,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].label,
                                            children: "Email"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                            lineNumber: 141,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].input,
                                            type: "email",
                                            value: dicForm.email,
                                            onChange: (event)=>handleChange("email", event.target.value),
                                            required: true
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                            lineNumber: 142,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                    lineNumber: 140,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].field,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].label,
                                            children: "Role"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                            lineNumber: 151,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].input,
                                            value: dicForm.role,
                                            onChange: (event)=>handleChange("role", event.target.value),
                                            required: true
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                            lineNumber: 152,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                    lineNumber: 150,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].actions,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "submit",
                                            className: `${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].button} ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].primary}`,
                                            disabled: intIsSubmitting === 1,
                                            children: intIsSubmitting === 1 ? "Saving..." : strEditingId ? "Update User" : "Create User"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                            lineNumber: 160,
                                            columnNumber: 15
                                        }, this),
                                        strEditingId ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            className: `${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].button} ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].ghost}`,
                                            onClick: resetForm,
                                            children: "Cancel Edit"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                            lineNumber: 164,
                                            columnNumber: 17
                                        }, this) : null
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                    lineNumber: 159,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                            lineNumber: 130,
                            columnNumber: 11
                        }, this),
                        strError ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].error,
                            children: strError
                        }, void 0, false, {
                            fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                            lineNumber: 171,
                            columnNumber: 23
                        }, this) : null
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                    lineNumber: 129,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                lineNumber: 128,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].card,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].content,
                    children: lstUsers.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].empty,
                        children: intIsLoading === 1 ? "Loading users..." : "No users found."
                    }, void 0, false, {
                        fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                        lineNumber: 178,
                        columnNumber: 13
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].grid,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            children: "Name"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                            lineNumber: 183,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            children: "Email"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                            lineNumber: 184,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            children: "Role"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                            lineNumber: 185,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            children: "Actions"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                            lineNumber: 186,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                    lineNumber: 182,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                lineNumber: 181,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                children: lstUsers.map((dicUser)=>{
                                    const strUserId = String(dicUser[dicFieldMap.id]);
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                children: String(dicUser[dicFieldMap.name] ?? "-")
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                                lineNumber: 194,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                children: String(dicUser[dicFieldMap.email] ?? "-")
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                                lineNumber: 195,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                children: String(dicUser[dicFieldMap.role] ?? "-")
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                                lineNumber: 196,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].actions,
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            type: "button",
                                                            className: `${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].button} ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].ghost}`,
                                                            onClick: ()=>handleEdit(dicUser),
                                                            children: "Edit"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                                            lineNumber: 199,
                                                            columnNumber: 27
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            type: "button",
                                                            className: `${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].button} ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$module$2e$css__$5b$app$2d$rsc$5d$__$28$css__module$29$__["default"].ghost}`,
                                                            onClick: ()=>handleDelete(strUserId),
                                                            children: "Delete"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                                            lineNumber: 206,
                                                            columnNumber: 27
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                                    lineNumber: 198,
                                                    columnNumber: 25
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                                lineNumber: 197,
                                                columnNumber: 23
                                            }, this)
                                        ]
                                    }, strUserId, true, {
                                        fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                        lineNumber: 193,
                                        columnNumber: 21
                                    }, this);
                                })
                            }, void 0, false, {
                                fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                                lineNumber: 189,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                        lineNumber: 180,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                    lineNumber: 176,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
                lineNumber: 175,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/UserMaster/UserMaster.jsx",
        lineNumber: 117,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/components/UserMaster/index.js [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$jsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/UserMaster/UserMaster.jsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$useUserMaster$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/UserMaster/useUserMaster.js [app-rsc] (ecmascript)");
;
;
}),
"[project]/src/components/UserMaster/UserMaster.jsx [app-rsc] (ecmascript) <export default as UserMaster>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "UserMaster",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$jsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$jsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/UserMaster/UserMaster.jsx [app-rsc] (ecmascript)");
}),
"[project]/app/(dashboard)/user-master/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>UserMasterPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Box/index.js [app-rsc] (ecmascript) <export default as Box>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Paper$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Paper/index.js [app-rsc] (ecmascript) <export default as Paper>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Stack/index.js [app-rsc] (ecmascript) <export default as Stack>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Typography/index.js [app-rsc] (ecmascript) <export default as Typography>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/components/UserMaster/index.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$jsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__UserMaster$3e$__ = __turbopack_context__.i("[project]/src/components/UserMaster/UserMaster.jsx [app-rsc] (ecmascript) <export default as UserMaster>");
;
;
;
function UserMasterPage() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
        spacing: 3,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__["Box"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                        variant: "h4",
                        fontWeight: 700,
                        children: "User Master"
                    }, void 0, false, {
                        fileName: "[project]/app/(dashboard)/user-master/page.tsx",
                        lineNumber: 8,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                        color: "text.secondary",
                        children: "Manage application user records."
                    }, void 0, false, {
                        fileName: "[project]/app/(dashboard)/user-master/page.tsx",
                        lineNumber: 11,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/(dashboard)/user-master/page.tsx",
                lineNumber: 7,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Paper$3e$__["Paper"], {
                sx: {
                    p: {
                        xs: 2,
                        md: 3
                    },
                    borderRadius: 3,
                    boxShadow: "0 12px 30px rgba(0,0,0,0.06)"
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$UserMaster$2f$UserMaster$2e$jsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__UserMaster$3e$__["UserMaster"], {
                    apiEndpoint: "/api/users"
                }, void 0, false, {
                    fileName: "[project]/app/(dashboard)/user-master/page.tsx",
                    lineNumber: 21,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/(dashboard)/user-master/page.tsx",
                lineNumber: 14,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/(dashboard)/user-master/page.tsx",
        lineNumber: 6,
        columnNumber: 5
    }, this);
}
}),
"[project]/app/(dashboard)/user-master/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/(dashboard)/user-master/page.tsx [app-rsc] (ecmascript)"));
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__e4a5c4ae._.js.map