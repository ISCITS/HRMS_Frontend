(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/theme/ThemePalettePanel.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ThemePalettePanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$CheckCircleOutline$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/icons-material/CheckCircleOutline.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Box/Box.js [app-client] (ecmascript) <export default as Box>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Button/Button.js [app-client] (ecmascript) <export default as Button>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$Paper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Paper$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Paper/Paper.js [app-client] (ecmascript) <export default as Paper>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Stack/Stack.js [app-client] (ecmascript) <export default as Stack>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Typography/Typography.js [app-client] (ecmascript) <export default as Typography>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ThemeModeProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ThemeModeProvider.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__ = __turbopack_context__.i("[project]/constants/Constant.json (json)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
const presetOptions = [
    {
        value: "ocean",
        label: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].theme.presets.ocean,
        color: "#0d47a1"
    },
    {
        value: "emerald",
        label: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].theme.presets.emerald,
        color: "#166534"
    },
    {
        value: "sunset",
        label: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].theme.presets.sunset,
        color: "#c2410c"
    },
    {
        value: "violet",
        label: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].theme.presets.violet,
        color: "#5b21b6"
    },
    {
        value: "rose",
        label: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].theme.presets.rose,
        color: "#be123c"
    },
    {
        value: "cyan",
        label: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].theme.presets.cyan,
        color: "#0e7490"
    },
    {
        value: "amber",
        label: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].theme.presets.amber,
        color: "#b45309"
    },
    {
        value: "slate",
        label: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].theme.presets.slate,
        color: "#334155"
    },
    {
        value: "indigo",
        label: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].theme.presets.indigo,
        color: "#3730a3"
    },
    {
        value: "lime",
        label: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].theme.presets.lime,
        color: "#4d7c0f"
    },
    {
        value: "vibgyorLight",
        label: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].theme.presets.vibgyorLight,
        color: "#7c83fd"
    },
    {
        value: "softLight",
        label: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].theme.presets.softLight,
        color: "#3b82f6"
    }
];
function ThemePalettePanel() {
    _s();
    // Functional responsibility:
    // - Render selectable palette cards and apply selected theme preset globally.
    // Inputs:
    // - Reads current preset and setPreset handler from theme context.
    // Output:
    // - Theme-card grid with applied/active state feedback.
    // Failure behavior:
    // - If provider is missing, useThemeMode throws explicit context error.
    const { preset, setPreset } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ThemeModeProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useThemeMode"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
        spacing: 2,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                variant: "body1",
                color: "text.secondary",
                children: __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].theme.description
            }, void 0, false, {
                fileName: "[project]/components/theme/ThemePalettePanel.tsx",
                lineNumber: 38,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
                direction: {
                    xs: "column",
                    sm: "row"
                },
                spacing: 2,
                flexWrap: "wrap",
                children: presetOptions.map((option)=>{
                    const selected = preset === option.value;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$Paper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Paper$3e$__["Paper"], {
                        sx: {
                            p: 2,
                            minWidth: 190,
                            border: selected ? "2px solid" : "1px solid",
                            borderColor: selected ? "primary.main" : "divider"
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
                            spacing: 1.5,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Box$2f$Box$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__["Box"], {
                                    sx: {
                                        height: 48,
                                        borderRadius: 1.5,
                                        backgroundColor: option.color
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/components/theme/ThemePalettePanel.tsx",
                                    lineNumber: 55,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Typography$3e$__["Typography"], {
                                    fontWeight: 700,
                                    children: option.label
                                }, void 0, false, {
                                    fileName: "[project]/components/theme/ThemePalettePanel.tsx",
                                    lineNumber: 56,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Button$2f$Button$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                    variant: selected ? "contained" : "outlined",
                                    startIcon: selected ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$icons$2d$material$2f$CheckCircleOutline$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                        fileName: "[project]/components/theme/ThemePalettePanel.tsx",
                                        lineNumber: 59,
                                        columnNumber: 41
                                    }, void 0) : undefined,
                                    onClick: ()=>setPreset(option.value),
                                    children: selected ? __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].theme.appliedButton : __TURBOPACK__imported__module__$5b$project$5d2f$constants$2f$Constant$2e$json__$28$json$29$__["default"].theme.applyButton
                                }, void 0, false, {
                                    fileName: "[project]/components/theme/ThemePalettePanel.tsx",
                                    lineNumber: 57,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/theme/ThemePalettePanel.tsx",
                            lineNumber: 54,
                            columnNumber: 15
                        }, this)
                    }, option.value, false, {
                        fileName: "[project]/components/theme/ThemePalettePanel.tsx",
                        lineNumber: 45,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/components/theme/ThemePalettePanel.tsx",
                lineNumber: 41,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/theme/ThemePalettePanel.tsx",
        lineNumber: 37,
        columnNumber: 5
    }, this);
}
_s(ThemePalettePanel, "/dNFsNTnM60wt6vs5UqBO9JiVUo=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ThemeModeProvider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useThemeMode"]
    ];
});
_c = ThemePalettePanel;
var _c;
__turbopack_context__.k.register(_c, "ThemePalettePanel");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/node_modules/@mui/material/Paper/index.js [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
'use client';
;
;
;
}),
"[project]/node_modules/@mui/material/Paper/index.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$Paper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"],
    "getPaperUtilityClass",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$paperClasses$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPaperUtilityClass"],
    "paperClasses",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$paperClasses$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Paper/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$Paper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Paper/Paper.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$paperClasses$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Paper/paperClasses.js [app-client] (ecmascript)");
}),
"[project]/node_modules/@mui/material/Typography/index.js [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
'use client';
;
;
;
}),
"[project]/node_modules/@mui/material/Typography/index.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"],
    "getTypographyUtilityClass",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$typographyClasses$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getTypographyUtilityClass"],
    "typographyClasses",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$typographyClasses$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Typography/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$Typography$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Typography/Typography.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Typography$2f$typographyClasses$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Typography/typographyClasses.js [app-client] (ecmascript)");
}),
"[project]/node_modules/@mui/icons-material/CheckCircleOutline.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var _interopRequireDefault = __turbopack_context__.r("[project]/node_modules/@babel/runtime/helpers/interopRequireDefault.js [app-client] (ecmascript)");
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = void 0;
var _createSvgIcon = _interopRequireDefault(__turbopack_context__.r("[project]/node_modules/@mui/icons-material/utils/createSvgIcon.js [app-client] (ecmascript)"));
var _jsxRuntime = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/jsx-runtime.js [app-client] (ecmascript)");
var _default = exports.default = (0, _createSvgIcon.default)(/*#__PURE__*/ (0, _jsxRuntime.jsx)("path", {
    d: "M16.59 7.58 10 14.17l-3.59-3.58L5 12l5 5 8-8zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8"
}), 'CheckCircleOutline');
}),
"[project]/node_modules/@mui/material/Paper/Paper.js [app-client] (ecmascript) <export default as Paper>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Paper",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$Paper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Paper$2f$Paper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Paper/Paper.js [app-client] (ecmascript)");
}),
"[project]/node_modules/@mui/system/esm/createStyled.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>createStyled,
    "shouldForwardProp",
    ()=>shouldForwardProp,
    "systemDefaultTheme",
    ()=>systemDefaultTheme
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$esm$2f$extends$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@babel/runtime/helpers/esm/extends.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$esm$2f$objectWithoutPropertiesLoose$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@babel/runtime/helpers/esm/objectWithoutPropertiesLoose.js [app-client] (ecmascript)");
/* eslint-disable no-underscore-dangle */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$styled$2d$engine$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/styled-engine/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$utils$2f$esm$2f$deepmerge$2f$deepmerge$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/utils/esm/deepmerge/deepmerge.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$utils$2f$esm$2f$capitalize$2f$capitalize$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/utils/esm/capitalize/capitalize.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$utils$2f$esm$2f$getDisplayName$2f$getDisplayName$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/utils/esm/getDisplayName/getDisplayName.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$createTheme$2f$createTheme$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/system/esm/createTheme/createTheme.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$styleFunctionSx$2f$styleFunctionSx$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/system/esm/styleFunctionSx/styleFunctionSx.js [app-client] (ecmascript)");
;
;
const _excluded = [
    "ownerState"
], _excluded2 = [
    "variants"
], _excluded3 = [
    "name",
    "slot",
    "skipVariantsResolver",
    "skipSx",
    "overridesResolver"
];
;
;
;
;
;
;
function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}
// https://github.com/emotion-js/emotion/blob/26ded6109fcd8ca9875cc2ce4564fee678a3f3c5/packages/styled/src/utils.js#L40
function isStringTag(tag) {
    return typeof tag === 'string' && // 96 is one less than the char code
    // for "a" so this is checking that
    // it's a lowercase character
    tag.charCodeAt(0) > 96;
}
function shouldForwardProp(prop) {
    return prop !== 'ownerState' && prop !== 'theme' && prop !== 'sx' && prop !== 'as';
}
function shallowLayer(serialized, layerName) {
    if (layerName && serialized && typeof serialized === 'object' && serialized.styles && !serialized.styles.startsWith('@layer') // only add the layer if it is not already there.
    ) {
        serialized.styles = `@layer ${layerName}{${String(serialized.styles)}}`;
    }
    return serialized;
}
const systemDefaultTheme = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$createTheme$2f$createTheme$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])();
const lowercaseFirstLetter = (string)=>{
    if (!string) {
        return string;
    }
    return string.charAt(0).toLowerCase() + string.slice(1);
};
function resolveTheme({ defaultTheme, theme, themeId }) {
    return isEmpty(theme) ? defaultTheme : theme[themeId] || theme;
}
function defaultOverridesResolver(slot) {
    if (!slot) {
        return null;
    }
    return (props, styles)=>styles[slot];
}
function processStyleArg(callableStyle, _ref, layerName) {
    let { ownerState } = _ref, props = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$esm$2f$objectWithoutPropertiesLoose$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(_ref, _excluded);
    const resolvedStylesArg = typeof callableStyle === 'function' ? callableStyle((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$esm$2f$extends$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])({
        ownerState
    }, props)) : callableStyle;
    if (Array.isArray(resolvedStylesArg)) {
        return resolvedStylesArg.flatMap((resolvedStyle)=>processStyleArg(resolvedStyle, (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$esm$2f$extends$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])({
                ownerState
            }, props), layerName));
    }
    if (!!resolvedStylesArg && typeof resolvedStylesArg === 'object' && Array.isArray(resolvedStylesArg.variants)) {
        const { variants = [] } = resolvedStylesArg, otherStyles = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$esm$2f$objectWithoutPropertiesLoose$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(resolvedStylesArg, _excluded2);
        let result = otherStyles;
        variants.forEach((variant)=>{
            let isMatch = true;
            if (typeof variant.props === 'function') {
                isMatch = variant.props((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$esm$2f$extends$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])({
                    ownerState
                }, props, ownerState));
            } else {
                Object.keys(variant.props).forEach((key)=>{
                    if ((ownerState == null ? void 0 : ownerState[key]) !== variant.props[key] && props[key] !== variant.props[key]) {
                        isMatch = false;
                    }
                });
            }
            if (isMatch) {
                if (!Array.isArray(result)) {
                    result = [
                        result
                    ];
                }
                const variantStyle = typeof variant.style === 'function' ? variant.style((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$esm$2f$extends$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])({
                    ownerState
                }, props, ownerState)) : variant.style;
                result.push(layerName ? shallowLayer((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$styled$2d$engine$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["internal_serializeStyles"])(variantStyle), layerName) : variantStyle);
            }
        });
        return result;
    }
    return layerName ? shallowLayer((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$styled$2d$engine$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["internal_serializeStyles"])(resolvedStylesArg), layerName) : resolvedStylesArg;
}
function createStyled(input = {}) {
    const { themeId, defaultTheme = systemDefaultTheme, rootShouldForwardProp = shouldForwardProp, slotShouldForwardProp = shouldForwardProp } = input;
    const systemSx = (props)=>{
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$styleFunctionSx$2f$styleFunctionSx$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$esm$2f$extends$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])({}, props, {
            theme: resolveTheme((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$esm$2f$extends$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])({}, props, {
                defaultTheme,
                themeId
            }))
        }));
    };
    systemSx.__mui_systemSx = true;
    return (tag, inputOptions = {})=>{
        // Filter out the `sx` style function from the previous styled component to prevent unnecessary styles generated by the composite components.
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$styled$2d$engine$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["internal_processStyles"])(tag, (styles)=>styles.filter((style)=>!(style != null && style.__mui_systemSx)));
        const { name: componentName, slot: componentSlot, skipVariantsResolver: inputSkipVariantsResolver, skipSx: inputSkipSx, // TODO v6: remove `lowercaseFirstLetter()` in the next major release
        // For more details: https://github.com/mui/material-ui/pull/37908
        overridesResolver = defaultOverridesResolver(lowercaseFirstLetter(componentSlot)) } = inputOptions, options = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$esm$2f$objectWithoutPropertiesLoose$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(inputOptions, _excluded3);
        const layerName = componentName && componentName.startsWith('Mui') || !!componentSlot ? 'components' : 'custom';
        // if skipVariantsResolver option is defined, take the value, otherwise, true for root and false for other slots.
        const skipVariantsResolver = inputSkipVariantsResolver !== undefined ? inputSkipVariantsResolver : // TODO v6: remove `Root` in the next major release
        // For more details: https://github.com/mui/material-ui/pull/37908
        componentSlot && componentSlot !== 'Root' && componentSlot !== 'root' || false;
        const skipSx = inputSkipSx || false;
        let label;
        if ("TURBOPACK compile-time truthy", 1) {
            if (componentName) {
                // TODO v6: remove `lowercaseFirstLetter()` in the next major release
                // For more details: https://github.com/mui/material-ui/pull/37908
                label = `${componentName}-${lowercaseFirstLetter(componentSlot || 'Root')}`;
            }
        }
        let shouldForwardPropOption = shouldForwardProp;
        // TODO v6: remove `Root` in the next major release
        // For more details: https://github.com/mui/material-ui/pull/37908
        if (componentSlot === 'Root' || componentSlot === 'root') {
            shouldForwardPropOption = rootShouldForwardProp;
        } else if (componentSlot) {
            // any other slot specified
            shouldForwardPropOption = slotShouldForwardProp;
        } else if (isStringTag(tag)) {
            // for string (html) tag, preserve the behavior in emotion & styled-components.
            shouldForwardPropOption = undefined;
        }
        const defaultStyledResolver = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$styled$2d$engine$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])(tag, (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$esm$2f$extends$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])({
            shouldForwardProp: shouldForwardPropOption,
            label
        }, options));
        const transformStyleArg = (stylesArg)=>{
            // On the server Emotion doesn't use React.forwardRef for creating components, so the created
            // component stays as a function. This condition makes sure that we do not interpolate functions
            // which are basically components used as a selectors.
            if (typeof stylesArg === 'function' && stylesArg.__emotion_real !== stylesArg || (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$utils$2f$esm$2f$deepmerge$2f$deepmerge$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isPlainObject"])(stylesArg)) {
                return (props)=>{
                    const theme = resolveTheme({
                        theme: props.theme,
                        defaultTheme,
                        themeId
                    });
                    return processStyleArg(stylesArg, (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$esm$2f$extends$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])({}, props, {
                        theme
                    }), theme.modularCssLayers ? layerName : undefined);
                };
            }
            return stylesArg;
        };
        const muiStyledResolver = (styleArg, ...expressions)=>{
            let transformedStyleArg = transformStyleArg(styleArg);
            const expressionsWithDefaultTheme = expressions ? expressions.map(transformStyleArg) : [];
            if (componentName && overridesResolver) {
                expressionsWithDefaultTheme.push((props)=>{
                    const theme = resolveTheme((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$esm$2f$extends$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])({}, props, {
                        defaultTheme,
                        themeId
                    }));
                    if (!theme.components || !theme.components[componentName] || !theme.components[componentName].styleOverrides) {
                        return null;
                    }
                    const styleOverrides = theme.components[componentName].styleOverrides;
                    const resolvedStyleOverrides = {};
                    // TODO: v7 remove iteration and use `resolveStyleArg(styleOverrides[slot])` directly
                    Object.entries(styleOverrides).forEach(([slotKey, slotStyle])=>{
                        resolvedStyleOverrides[slotKey] = processStyleArg(slotStyle, (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$esm$2f$extends$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])({}, props, {
                            theme
                        }), theme.modularCssLayers ? 'theme' : undefined);
                    });
                    return overridesResolver(props, resolvedStyleOverrides);
                });
            }
            if (componentName && !skipVariantsResolver) {
                expressionsWithDefaultTheme.push((props)=>{
                    var _theme$components;
                    const theme = resolveTheme((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$esm$2f$extends$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])({}, props, {
                        defaultTheme,
                        themeId
                    }));
                    const themeVariants = theme == null || (_theme$components = theme.components) == null || (_theme$components = _theme$components[componentName]) == null ? void 0 : _theme$components.variants;
                    return processStyleArg({
                        variants: themeVariants
                    }, (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$esm$2f$extends$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])({}, props, {
                        theme
                    }), theme.modularCssLayers ? 'theme' : undefined);
                });
            }
            if (!skipSx) {
                expressionsWithDefaultTheme.push(systemSx);
            }
            const numOfCustomFnsApplied = expressionsWithDefaultTheme.length - expressions.length;
            if (Array.isArray(styleArg) && numOfCustomFnsApplied > 0) {
                const placeholders = new Array(numOfCustomFnsApplied).fill('');
                // If the type is array, than we need to add placeholders in the template for the overrides, variants and the sx styles.
                transformedStyleArg = [
                    ...styleArg,
                    ...placeholders
                ];
                transformedStyleArg.raw = [
                    ...styleArg.raw,
                    ...placeholders
                ];
            }
            const Component = defaultStyledResolver(transformedStyleArg, ...expressionsWithDefaultTheme);
            if ("TURBOPACK compile-time truthy", 1) {
                let displayName;
                if (componentName) {
                    displayName = `${componentName}${(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$utils$2f$esm$2f$capitalize$2f$capitalize$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(componentSlot || '')}`;
                }
                if (displayName === undefined) {
                    displayName = `Styled(${(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$utils$2f$esm$2f$getDisplayName$2f$getDisplayName$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(tag)})`;
                }
                Component.displayName = displayName;
            }
            if (tag.muiName) {
                Component.muiName = tag.muiName;
            }
            return Component;
        };
        if (defaultStyledResolver.withConfig) {
            muiStyledResolver.withConfig = defaultStyledResolver.withConfig;
        }
        return muiStyledResolver;
    };
}
}),
"[project]/node_modules/@mui/system/esm/styled.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$createStyled$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/system/esm/createStyled.js [app-client] (ecmascript)");
;
const styled = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$createStyled$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])();
const __TURBOPACK__default__export__ = styled;
}),
"[project]/node_modules/@mui/system/esm/useThemeProps/getThemeProps.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>getThemeProps
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$utils$2f$esm$2f$resolveProps$2f$resolveProps$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/utils/esm/resolveProps/resolveProps.js [app-client] (ecmascript)");
;
function getThemeProps(params) {
    const { theme, name, props } = params;
    if (!theme || !theme.components || !theme.components[name] || !theme.components[name].defaultProps) {
        return props;
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$utils$2f$esm$2f$resolveProps$2f$resolveProps$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(theme.components[name].defaultProps, props);
}
}),
"[project]/node_modules/@mui/system/esm/useThemeProps/useThemeProps.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>useThemeProps
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$useThemeProps$2f$getThemeProps$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/system/esm/useThemeProps/getThemeProps.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$useTheme$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/system/esm/useTheme.js [app-client] (ecmascript)");
'use client';
;
;
function useThemeProps({ props, name, defaultTheme, themeId }) {
    let theme = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$useTheme$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(defaultTheme);
    if (themeId) {
        theme = theme[themeId] || theme;
    }
    const mergedProps = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$useThemeProps$2f$getThemeProps$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])({
        theme,
        name,
        props
    });
    return mergedProps;
}
}),
"[project]/node_modules/@mui/system/esm/Stack/createStack.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>createStack,
    "style",
    ()=>style
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$esm$2f$objectWithoutPropertiesLoose$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@babel/runtime/helpers/esm/objectWithoutPropertiesLoose.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$esm$2f$extends$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@babel/runtime/helpers/esm/extends.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/prop-types/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$utils$2f$esm$2f$deepmerge$2f$deepmerge$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/utils/esm/deepmerge/deepmerge.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$utils$2f$esm$2f$generateUtilityClass$2f$generateUtilityClass$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/utils/esm/generateUtilityClass/generateUtilityClass.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$utils$2f$esm$2f$composeClasses$2f$composeClasses$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/utils/esm/composeClasses/composeClasses.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$styled$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/system/esm/styled.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$useThemeProps$2f$useThemeProps$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/system/esm/useThemeProps/useThemeProps.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$styleFunctionSx$2f$extendSxProp$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__extendSxProp$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/system/esm/styleFunctionSx/extendSxProp.js [app-client] (ecmascript) <export default as extendSxProp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$createTheme$2f$createTheme$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/system/esm/createTheme/createTheme.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$breakpoints$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/system/esm/breakpoints.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$spacing$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/system/esm/spacing.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-runtime.js [app-client] (ecmascript)");
;
;
const _excluded = [
    "component",
    "direction",
    "spacing",
    "divider",
    "children",
    "className",
    "useFlexGap"
];
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
;
;
;
const defaultTheme = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$createTheme$2f$createTheme$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])();
// widening Theme to any so that the consumer can own the theme structure.
const defaultCreateStyledComponent = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$styled$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])('div', {
    name: 'MuiStack',
    slot: 'Root',
    overridesResolver: (props, styles)=>styles.root
});
function useThemePropsDefault(props) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$useThemeProps$2f$useThemeProps$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])({
        props,
        name: 'MuiStack',
        defaultTheme
    });
}
/**
 * Return an array with the separator React element interspersed between
 * each React node of the input children.
 *
 * > joinChildren([1,2,3], 0)
 * [1,0,2,0,3]
 */ function joinChildren(children, separator) {
    const childrenArray = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Children"].toArray(children).filter(Boolean);
    return childrenArray.reduce((output, child, index)=>{
        output.push(child);
        if (index < childrenArray.length - 1) {
            output.push(/*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cloneElement"](separator, {
                key: `separator-${index}`
            }));
        }
        return output;
    }, []);
}
const getSideFromDirection = (direction)=>{
    return ({
        row: 'Left',
        'row-reverse': 'Right',
        column: 'Top',
        'column-reverse': 'Bottom'
    })[direction];
};
const style = ({ ownerState, theme })=>{
    let styles = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$esm$2f$extends$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])({
        display: 'flex',
        flexDirection: 'column'
    }, (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$breakpoints$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["handleBreakpoints"])({
        theme
    }, (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$breakpoints$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveBreakpointValues"])({
        values: ownerState.direction,
        breakpoints: theme.breakpoints.values
    }), (propValue)=>({
            flexDirection: propValue
        })));
    if (ownerState.spacing) {
        const transformer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$spacing$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createUnarySpacing"])(theme);
        const base = Object.keys(theme.breakpoints.values).reduce((acc, breakpoint)=>{
            if (typeof ownerState.spacing === 'object' && ownerState.spacing[breakpoint] != null || typeof ownerState.direction === 'object' && ownerState.direction[breakpoint] != null) {
                acc[breakpoint] = true;
            }
            return acc;
        }, {});
        const directionValues = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$breakpoints$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveBreakpointValues"])({
            values: ownerState.direction,
            base
        });
        const spacingValues = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$breakpoints$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveBreakpointValues"])({
            values: ownerState.spacing,
            base
        });
        if (typeof directionValues === 'object') {
            Object.keys(directionValues).forEach((breakpoint, index, breakpoints)=>{
                const directionValue = directionValues[breakpoint];
                if (!directionValue) {
                    const previousDirectionValue = index > 0 ? directionValues[breakpoints[index - 1]] : 'column';
                    directionValues[breakpoint] = previousDirectionValue;
                }
            });
        }
        const styleFromPropValue = (propValue, breakpoint)=>{
            if (ownerState.useFlexGap) {
                return {
                    gap: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$spacing$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getValue"])(transformer, propValue)
                };
            }
            return {
                // The useFlexGap={false} implement relies on each child to give up control of the margin.
                // We need to reset the margin to avoid double spacing.
                '& > :not(style):not(style)': {
                    margin: 0
                },
                '& > :not(style) ~ :not(style)': {
                    [`margin${getSideFromDirection(breakpoint ? directionValues[breakpoint] : ownerState.direction)}`]: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$spacing$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getValue"])(transformer, propValue)
                }
            };
        };
        styles = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$utils$2f$esm$2f$deepmerge$2f$deepmerge$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(styles, (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$breakpoints$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["handleBreakpoints"])({
            theme
        }, spacingValues, styleFromPropValue));
    }
    styles = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$breakpoints$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mergeBreakpointsInOrder"])(theme.breakpoints, styles);
    return styles;
};
function createStack(options = {}) {
    const { // This will allow adding custom styled fn (for example for custom sx style function)
    createStyledComponent = defaultCreateStyledComponent, useThemeProps = useThemePropsDefault, componentName = 'MuiStack' } = options;
    const useUtilityClasses = ()=>{
        const slots = {
            root: [
                'root'
            ]
        };
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$utils$2f$esm$2f$composeClasses$2f$composeClasses$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(slots, (slot)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$utils$2f$esm$2f$generateUtilityClass$2f$generateUtilityClass$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(componentName, slot), {});
    };
    const StackRoot = createStyledComponent(style);
    const Stack = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](function Grid(inProps, ref) {
        const themeProps = useThemeProps(inProps);
        const props = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$styleFunctionSx$2f$extendSxProp$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__extendSxProp$3e$__["extendSxProp"])(themeProps); // `color` type conflicts with html color attribute.
        const { component = 'div', direction = 'column', spacing = 0, divider, children, className, useFlexGap = false } = props, other = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$esm$2f$objectWithoutPropertiesLoose$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(props, _excluded);
        const ownerState = {
            direction,
            spacing,
            useFlexGap
        };
        const classes = useUtilityClasses();
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])(StackRoot, (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$babel$2f$runtime$2f$helpers$2f$esm$2f$extends$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])({
            as: component,
            ownerState: ownerState,
            ref: ref,
            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(classes.root, className)
        }, other, {
            children: divider ? joinChildren(children, divider) : children
        }));
    });
    ("TURBOPACK compile-time truthy", 1) ? Stack.propTypes = {
        children: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].node,
        direction: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].oneOfType([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].oneOf([
                'column-reverse',
                'column',
                'row-reverse',
                'row'
            ]),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].arrayOf(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].oneOf([
                'column-reverse',
                'column',
                'row-reverse',
                'row'
            ])),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].object
        ]),
        divider: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].node,
        spacing: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].oneOfType([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].arrayOf(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].oneOfType([
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].number,
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].string
            ])),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].number,
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].object,
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].string
        ]),
        sx: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].oneOfType([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].arrayOf(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].oneOfType([
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].func,
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].object,
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].bool
            ])),
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].func,
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].object
        ])
    } : "TURBOPACK unreachable";
    return Stack;
}
}),
"[project]/node_modules/@mui/system/esm/Stack/createStack.js [app-client] (ecmascript) <export default as createStack>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createStack",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$Stack$2f$createStack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$Stack$2f$createStack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/system/esm/Stack/createStack.js [app-client] (ecmascript)");
}),
"[project]/node_modules/@mui/material/Stack/Stack.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/prop-types/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$Stack$2f$createStack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__createStack$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/system/esm/Stack/createStack.js [app-client] (ecmascript) <export default as createStack>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$styles$2f$styled$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/styles/styled.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$DefaultPropsProvider$2f$DefaultPropsProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/DefaultPropsProvider/DefaultPropsProvider.js [app-client] (ecmascript)");
'use client';
;
;
;
;
const Stack = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$system$2f$esm$2f$Stack$2f$createStack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__createStack$3e$__["createStack"])({
    createStyledComponent: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$styles$2f$styled$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])('div', {
        name: 'MuiStack',
        slot: 'Root',
        overridesResolver: (props, styles)=>styles.root
    }),
    useThemeProps: (inProps)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$DefaultPropsProvider$2f$DefaultPropsProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useDefaultProps"])({
            props: inProps,
            name: 'MuiStack'
        })
});
("TURBOPACK compile-time truthy", 1) ? Stack.propTypes = {
    // ┌────────────────────────────── Warning ──────────────────────────────┐
    // │ These PropTypes are generated from the TypeScript type definitions. │
    // │    To update them, edit the d.ts file and run `pnpm proptypes`.     │
    // └─────────────────────────────────────────────────────────────────────┘
    /**
   * The content of the component.
   */ children: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].node,
    /**
   * The component used for the root node.
   * Either a string to use a HTML element or a component.
   */ component: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].elementType,
    /**
   * Defines the `flex-direction` style property.
   * It is applied for all screen sizes.
   * @default 'column'
   */ direction: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].oneOfType([
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].oneOf([
            'column-reverse',
            'column',
            'row-reverse',
            'row'
        ]),
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].arrayOf(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].oneOf([
            'column-reverse',
            'column',
            'row-reverse',
            'row'
        ])),
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].object
    ]),
    /**
   * Add an element between each child.
   */ divider: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].node,
    /**
   * Defines the space between immediate children.
   * @default 0
   */ spacing: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].oneOfType([
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].arrayOf(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].oneOfType([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].number,
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].string
        ])),
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].number,
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].object,
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].string
    ]),
    /**
   * The system prop, which allows defining system overrides as well as additional CSS styles.
   */ sx: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].oneOfType([
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].arrayOf(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].oneOfType([
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].func,
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].object,
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].bool
        ])),
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].func,
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].object
    ]),
    /**
   * If `true`, the CSS flexbox `gap` is used instead of applying `margin` to children.
   *
   * While CSS `gap` removes the [known limitations](https://mui.com/joy-ui/react-stack/#limitations),
   * it is not fully supported in some browsers. We recommend checking https://caniuse.com/?search=flex%20gap before using this flag.
   *
   * To enable this flag globally, follow the [theme's default props](https://mui.com/material-ui/customization/theme-components/#default-props) configuration.
   * @default false
   */ useFlexGap: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$prop$2d$types$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].bool
} : "TURBOPACK unreachable";
const __TURBOPACK__default__export__ = Stack;
}),
"[project]/node_modules/@mui/material/Stack/Stack.js [app-client] (ecmascript) <export default as Stack>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Stack",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/Stack/Stack.js [app-client] (ecmascript)");
}),
]);

//# sourceMappingURL=_e4806d3f._.js.map