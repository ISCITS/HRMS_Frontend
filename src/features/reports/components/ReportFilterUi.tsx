"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Autocomplete, Box, Button, Divider, IconButton, Popover, TextField, Typography } from "@mui/material";
import { type ReactNode, useState } from "react";

import styles from "@/features/payroll/components/PayrollScreen.module.css";

// Shared filter pieces for report screens, matching the TDS Register layout:
// a few primary filters inline, everything else behind a "More filters" popover.

export function SingleSelectFilter({
  strLabel,
  strValue,
  lstOptions,
  strPlaceholder,
  strControlId,
  fnOnChange,
  blnDisabled = false,
}: {
  strLabel: string;
  strValue: string;
  lstOptions: string[];
  strPlaceholder: string;
  strControlId: string;
  fnOnChange: (strValue: string) => void;
  blnDisabled?: boolean;
}) {
  return (
    <Autocomplete
      freeSolo
      size="small"
      options={lstOptions}
      value={strValue}
      disabled={blnDisabled}
      onInputChange={(_objEvent, strNextValue) => fnOnChange(strNextValue)}
      onChange={(_objEvent, strNextValue) => fnOnChange(String(strNextValue ?? ""))}
      renderInput={(objParams) => (
        <TextField
          {...objParams}
          className="app-mui-text-field"
          label={strLabel}
          placeholder={strPlaceholder}
          InputLabelProps={{ shrink: true }}
          inputProps={{ ...objParams.inputProps, "data-controlid": strControlId }}
          InputProps={{
            ...objParams.InputProps,
            startAdornment: (
              <>
                <SearchRoundedIcon fontSize="small" sx={{ color: "action.active", ml: 0.5, mr: -0.5 }} />
                {objParams.InputProps.startAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

export function ReportMoreFilters({
  strControlPrefix,
  intActiveCount = 0,
  blnDisabled = false,
  onOpen,
  onApply,
  onClearAll,
  children,
}: {
  strControlPrefix: string;
  intActiveCount?: number;
  blnDisabled?: boolean;
  // Called when the popover opens so the caller can seed its draft values from the applied filters.
  onOpen: () => void;
  onApply: () => void;
  onClearAll: () => void;
  children: ReactNode;
}) {
  const [objAnchor, setObjAnchor] = useState<HTMLElement | null>(null);
  const blnOpen = Boolean(objAnchor);

  return (
    <>
      <Button
        className={styles.secondaryButton}
        startIcon={<FilterListRoundedIcon />}
        onClick={(objEvent) => {
          onOpen();
          setObjAnchor(objEvent.currentTarget);
        }}
        aria-expanded={blnOpen}
        aria-haspopup="dialog"
        disabled={blnDisabled}
        controlId={`${strControlPrefix}.more-filters.button`}
      >
        More filters{intActiveCount > 0 ? " •" : ""}
      </Button>
      <Popover
        open={blnOpen}
        keepMounted
        anchorEl={objAnchor}
        onClose={() => setObjAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              width: 374,
              maxWidth: "calc(100vw - 24px)",
              border: "1px solid #d8e2ef",
              borderRadius: "22px",
              boxShadow: "0 18px 42px rgba(15, 23, 42, 0.18)",
              overflow: "hidden",
            },
          },
        }}
      >
        <Box data-controlid={`${strControlPrefix}.more-filters.panel`}>
          <Box sx={{ px: 2.5, pt: 2.25, pb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>More filters</Typography>
            <IconButton size="small" onClick={() => setObjAnchor(null)} aria-label="Close more filters" data-controlid={`${strControlPrefix}.more-filters.close.button`} sx={{ color: "#64748b" }}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Box>
          <Box sx={{ px: 2.5, pb: 2, display: "grid", gap: 1.5 }}>{children}</Box>
          <Divider />
          <Box sx={{ px: 2.5, py: 1.75, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.25 }}>
            <Button onClick={onClearAll} disabled={blnDisabled} data-controlid={`${strControlPrefix}.more-filters.clear-all.button`} sx={{ px: 0, minWidth: 0, fontWeight: 700, textTransform: "none", color: "var(--app-primary-color)", "&:hover": { backgroundColor: "var(--app-primary-soft)" } }}>
              Clear all
            </Button>
            <Box sx={{ display: "flex", gap: 1.25 }}>
              <Button className={styles.secondaryButton} onClick={() => setObjAnchor(null)} disabled={blnDisabled} data-controlid={`${strControlPrefix}.more-filters.cancel.button`}>Cancel</Button>
              <Button
                className={styles.primaryButton}
                onClick={() => {
                  setObjAnchor(null);
                  onApply();
                }}
                disabled={blnDisabled}
                data-controlid={`${strControlPrefix}.more-filters.apply.button`}
              >
                Apply
              </Button>
            </Box>
          </Box>
        </Box>
      </Popover>
    </>
  );
}
