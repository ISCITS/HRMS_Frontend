import { PaletteMode } from "@mui/material";
import { createTheme } from "@mui/material/styles";

export type ThemePreset =
  | "ocean"
  | "emerald"
  | "sunset"
  | "violet"
  | "rose"
  | "cyan"
  | "amber"
  | "slate"
  | "indigo"
  | "lime"
  | "vibgyorLight"
  | "softLight";

type PresetColors = {
  lightPrimary: string;
  darkPrimary: string;
  lightSecondary: string;
  darkSecondary: string;
};

const dicPresetMap: Record<ThemePreset, PresetColors> = {
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

export const getTheme = (mode: PaletteMode, preset: ThemePreset = "ocean") => {
  const dicPreset = dicPresetMap[preset];
  const strPrimary = mode === "light" ? dicPreset.lightPrimary : dicPreset.darkPrimary;
  const strSecondary = mode === "light" ? dicPreset.lightSecondary : dicPreset.darkSecondary;

  return createTheme({
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
