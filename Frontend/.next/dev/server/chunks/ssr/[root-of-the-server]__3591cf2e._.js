module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[project]/components/ThemeRegistry.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ThemeRegistry
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$emotion$2f$cache$2f$dist$2f$emotion$2d$cache$2e$development$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@emotion/cache/dist/emotion-cache.development.esm.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$emotion$2f$react$2f$dist$2f$emotion$2d$element$2d$782f682d$2e$development$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__C__as__CacheProvider$3e$__ = __turbopack_context__.i("[project]/node_modules/@emotion/react/dist/emotion-element-782f682d.development.esm.js [app-ssr] (ecmascript) <export C as CacheProvider>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
function ThemeRegistry({ options, children }) {
    // Functional responsibility:
    // - Provide Emotion cache compatible with Next.js App Router SSR.
    // Inputs:
    // - optional cache options and children tree.
    // Output:
    // - Injects collected Emotion styles into SSR HTML and renders children in CacheProvider.
    // Failure behavior:
    // - If no styles were inserted in current render, returns null style tag safely.
    // Tracks Emotion styles generated during server render and injects them into HTML.
    const [{ cache, flush }] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>{
        const cache = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$emotion$2f$cache$2f$dist$2f$emotion$2d$cache$2e$development$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])({
            key: "mui",
            prepend: true,
            ...options
        });
        cache.compat = true;
        const prevInsert = cache.insert;
        let inserted = [];
        cache.insert = (...args)=>{
            const serialized = args[1];
            if (cache.inserted[serialized.name] === undefined) {
                inserted.push(serialized.name);
            }
            return prevInsert(...args);
        };
        const flush = ()=>{
            const prevInserted = inserted;
            inserted = [];
            return prevInserted;
        };
        return {
            cache,
            flush
        };
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useServerInsertedHTML"])(()=>{
        const names = flush();
        if (names.length === 0) {
            return null;
        }
        let styles = "";
        names.forEach((name)=>{
            styles += cache.inserted[name];
        });
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("style", {
            "data-emotion": `${cache.key} ${names.join(" ")}`,
            dangerouslySetInnerHTML: {
                __html: styles
            }
        }, cache.key, false, {
            fileName: "[project]/components/ThemeRegistry.tsx",
            lineNumber: 59,
            columnNumber: 7
        }, this);
    });
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$emotion$2f$react$2f$dist$2f$emotion$2d$element$2d$782f682d$2e$development$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__C__as__CacheProvider$3e$__["CacheProvider"], {
        value: cache,
        children: children
    }, void 0, false, {
        fileName: "[project]/components/ThemeRegistry.tsx",
        lineNumber: 67,
        columnNumber: 10
    }, this);
}
}),
"[project]/lib/theme.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getTheme",
    ()=>getTheme
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$styles$2f$createTheme$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__createTheme$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/styles/createTheme.js [app-ssr] (ecmascript) <export default as createTheme>");
;
const dicPresetMap = {
    ocean: {
        lightPrimary: "#2563eb",
        darkPrimary: "#93c5fd",
        lightSecondary: "#1d4ed8",
        darkSecondary: "#bfdbfe"
    },
    emerald: {
        lightPrimary: "#166534",
        darkPrimary: "#86efac",
        lightSecondary: "#0f766e",
        darkSecondary: "#99f6e4"
    },
    sunset: {
        lightPrimary: "#c2410c",
        darkPrimary: "#fdba74",
        lightSecondary: "#be123c",
        darkSecondary: "#fda4af"
    },
    violet: {
        lightPrimary: "#5b21b6",
        darkPrimary: "#c4b5fd",
        lightSecondary: "#7c3aed",
        darkSecondary: "#ddd6fe"
    },
    rose: {
        lightPrimary: "#be123c",
        darkPrimary: "#fda4af",
        lightSecondary: "#9f1239",
        darkSecondary: "#fecdd3"
    },
    cyan: {
        lightPrimary: "#0e7490",
        darkPrimary: "#67e8f9",
        lightSecondary: "#155e75",
        darkSecondary: "#a5f3fc"
    },
    amber: {
        lightPrimary: "#b45309",
        darkPrimary: "#fcd34d",
        lightSecondary: "#92400e",
        darkSecondary: "#fde68a"
    },
    slate: {
        lightPrimary: "#334155",
        darkPrimary: "#cbd5e1",
        lightSecondary: "#475569",
        darkSecondary: "#e2e8f0"
    },
    indigo: {
        lightPrimary: "#3730a3",
        darkPrimary: "#a5b4fc",
        lightSecondary: "#4338ca",
        darkSecondary: "#c7d2fe"
    },
    lime: {
        lightPrimary: "#4d7c0f",
        darkPrimary: "#bef264",
        lightSecondary: "#3f6212",
        darkSecondary: "#d9f99d"
    },
    vibgyorLight: {
        lightPrimary: "#7c83fd",
        darkPrimary: "#c7d2fe",
        lightSecondary: "#ff9f68",
        darkSecondary: "#fed7aa"
    },
    softLight: {
        lightPrimary: "#3b82f6",
        darkPrimary: "#93c5fd",
        lightSecondary: "#14b8a6",
        darkSecondary: "#99f6e4"
    }
};
const getTheme = (mode, preset = "ocean")=>{
    const dicPreset = dicPresetMap[preset];
    const strPrimary = mode === "light" ? dicPreset.lightPrimary : dicPreset.darkPrimary;
    const strSecondary = mode === "light" ? dicPreset.lightSecondary : dicPreset.darkSecondary;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$styles$2f$createTheme$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__createTheme$3e$__["createTheme"])({
        palette: {
            mode,
            primary: {
                main: strPrimary,
                dark: "#1d4ed8",
                light: "#60a5fa"
            },
            secondary: {
                main: strSecondary
            },
            success: {
                main: "#16a34a"
            },
            warning: {
                main: "#f59e0b"
            },
            error: {
                main: "#ef4444"
            },
            divider: mode === "light" ? "#e2e8f0" : "#334155",
            text: {
                primary: mode === "light" ? "#0f172a" : "#e2e8f0",
                secondary: mode === "light" ? "#64748b" : "#94a3b8"
            },
            background: {
                default: mode === "light" ? "#f8fafc" : "#0b1220",
                paper: mode === "light" ? "#ffffff" : "#111827"
            }
        },
        shape: {
            borderRadius: 22
        },
        spacing: 8,
        typography: {
            fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif",
            h4: {
                fontWeight: 700
            },
            h5: {
                fontWeight: 700
            },
            h6: {
                fontWeight: 700
            }
        },
        components: {
            MuiCssBaseline: {
                styleOverrides: {
                    body: {
                        backgroundColor: mode === "light" ? "#f8fafc" : "#0b1220"
                    }
                }
            },
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        backgroundColor: mode === "light" ? "#ffffff" : "#111827",
                        color: mode === "light" ? "#0f172a" : "#e2e8f0",
                        borderRadius: 0,
                        boxShadow: "0 6px 20px rgba(15, 23, 42, 0.05)",
                        borderBottom: `1px solid ${mode === "light" ? "#e2e8f0" : "#334155"}`
                    }
                }
            },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        borderRadius: 24,
                        border: `1px solid ${mode === "light" ? "#e2e8f0" : "#334155"}`,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.06)"
                    }
                }
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        borderRadius: 24,
                        border: `1px solid ${mode === "light" ? "#e2e8f0" : "#334155"}`,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.06)"
                    }
                }
            },
            MuiCardContent: {
                styleOverrides: {
                    root: {
                        padding: 24,
                        "&:last-child": {
                            paddingBottom: 24
                        }
                    }
                }
            },
            MuiButton: {
                defaultProps: {
                    disableElevation: true
                },
                styleOverrides: {
                    root: {
                        borderRadius: 12,
                        textTransform: "none",
                        fontWeight: 600,
                        padding: "10px 16px"
                    },
                    containedPrimary: {
                        backgroundColor: "#2563eb",
                        "&:hover": {
                            backgroundColor: "#1d4ed8"
                        }
                    },
                    outlined: {
                        borderColor: mode === "light" ? "#cbd5e1" : "#475569",
                        color: mode === "light" ? "#334155" : "#cbd5e1",
                        "&:hover": {
                            borderColor: mode === "light" ? "#94a3b8" : "#64748b",
                            backgroundColor: mode === "light" ? "rgba(148,163,184,0.08)" : "rgba(148,163,184,0.12)"
                        }
                    }
                }
            },
            MuiDrawer: {
                styleOverrides: {
                    paper: {
                        backgroundColor: mode === "light" ? "#ffffff" : "#111827",
                        borderRight: `1px solid ${mode === "light" ? "#e2e8f0" : "#334155"}`
                    }
                }
            },
            MuiListItemButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 12,
                        transition: "all 0.2s ease"
                    }
                }
            },
            MuiTextField: {
                defaultProps: {
                    size: "small",
                    variant: "outlined"
                }
            },
            MuiFormLabel: {
                styleOverrides: {
                    asterisk: {
                        color: "#ef4444"
                    }
                }
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        borderRadius: 12
                    }
                }
            }
        }
    });
};
}),
"[project]/components/ThemeModeProvider.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ThemeModeProvider,
    "useThemeMode",
    ()=>useThemeMode
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$CssBaseline$2f$CssBaseline$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CssBaseline$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/CssBaseline/CssBaseline.js [app-ssr] (ecmascript) <export default as CssBaseline>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$styles$2f$ThemeProvider$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ThemeProvider$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/styles/ThemeProvider.js [app-ssr] (ecmascript) <export default as ThemeProvider>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/theme.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
const ThemeModeContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function useThemeMode() {
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(ThemeModeContext);
    if (!context) {
        throw new Error("useThemeMode must be used within ThemeModeProvider");
    }
    return context;
}
function ThemeModeProvider({ children }) {
    // Functional responsibility:
    // - Own global theme state (mode + preset) and expose it via context.
    // Inputs:
    // - children UI tree to be wrapped.
    // Output:
    // - Renders ThemeProvider + CssBaseline with computed MUI theme.
    // Failure behavior:
    // - If consumer uses useThemeMode outside provider, hook throws explicit error.
    const [preset, setPreset] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("ocean");
    const value = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>({
            preset,
            setPreset
        }), [
        preset
    ]);
    const theme = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$theme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getTheme"])("light", preset), [
        preset
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ThemeModeContext.Provider, {
        value: value,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$styles$2f$ThemeProvider$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ThemeProvider$3e$__["ThemeProvider"], {
            theme: theme,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$CssBaseline$2f$CssBaseline$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CssBaseline$3e$__["CssBaseline"], {}, void 0, false, {
                    fileName: "[project]/components/ThemeModeProvider.tsx",
                    lineNumber: 52,
                    columnNumber: 9
                }, this),
                children
            ]
        }, void 0, true, {
            fileName: "[project]/components/ThemeModeProvider.tsx",
            lineNumber: 51,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/ThemeModeProvider.tsx",
        lineNumber: 49,
        columnNumber: 5
    }, this);
}
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/dynamic-access-async-storage.external.js [external] (next/dist/server/app-render/dynamic-access-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/dynamic-access-async-storage.external.js", () => require("next/dist/server/app-render/dynamic-access-async-storage.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__3591cf2e._.js.map