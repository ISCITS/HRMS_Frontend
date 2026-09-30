"use client";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Autocomplete, TextField } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";

type CommonSearchableSelectOption = {
  intID: number | string;
  strLabel: string;
  strCode?: string | null;
};

type CommonSearchableSelectProps<T extends CommonSearchableSelectOption> = {
  label: string;
  value: T["intID"] | "";
  options: T[];
  onChange: (value: T["intID"] | "") => void;
  controlId?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  fullWidth?: boolean;
  size?: "small" | "medium";
  showSearchIcon?: boolean;
  className?: string;
  sx?: SxProps<Theme>;
  getOptionLabel?: (option: T) => string;
};

// A searchable stand-in for the plain MUI Select/MenuItem pattern, built on
// Autocomplete so every reference dropdown (department, designation, employee, ...)
// gets type-to-filter for free. Matches the {intID, strLabel, strCode?} option shape
// already used across the app's Autocomplete fields (e.g. Payroll Run, Employee scope).
export default function CommonSearchableSelect<T extends CommonSearchableSelectOption>({
  label,
  value,
  options,
  onChange,
  controlId,
  placeholder,
  searchPlaceholder,
  disabled = false,
  required = false,
  error = false,
  helperText,
  fullWidth = true,
  size = "small",
  showSearchIcon = true,
  className,
  sx,
  getOptionLabel,
}: CommonSearchableSelectProps<T>) {
  const resolveLabel = getOptionLabel ?? ((dicOption: T) => (dicOption.strCode ? `${dicOption.strCode} - ${dicOption.strLabel}` : dicOption.strLabel));
  const dicSelected = options.find((dicOption) => dicOption.intID === value) ?? null;

  return (
    <Autocomplete
      options={options}
      value={dicSelected}
      getOptionLabel={resolveLabel}
      isOptionEqualToValue={(dicA, dicB) => dicA.intID === dicB.intID}
      onChange={(_objEvent, dicOption) => onChange(dicOption ? dicOption.intID : "")}
      disabled={disabled}
      fullWidth={fullWidth}
      size={size}
      className={className}
      sx={sx}
      renderInput={(objParams) => (
        <TextField
          {...objParams}
          label={label}
          size={size}
          placeholder={placeholder ?? searchPlaceholder}
          data-control-id={controlId}
          inputProps={{ ...objParams.inputProps, ...(controlId ? { "data-control-id": controlId } : {}) }}
          required={required}
          error={error}
          helperText={helperText}
          InputProps={{
            ...objParams.InputProps,
            startAdornment: (
              <>
                {showSearchIcon ? <SearchRoundedIcon fontSize="small" sx={{ color: "action.active", ml: 0.5, mr: -0.5 }} /> : null}
                {objParams.InputProps.startAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

export type { CommonSearchableSelectOption, CommonSearchableSelectProps };
