"use client";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Autocomplete, TextField } from "@mui/material";
import { useMemo } from "react";

export type EmployeeFilterOption = {
  strValue: string;
  strEmployeeCode: string;
  strEmployeeName: string;
};

type EmployeeFilterSelectProps = {
  lstOptions: EmployeeFilterOption[];
  /** The selected option's strValue ("" = all employees). */
  strValue: string;
  fnOnChange: (strValue: string, objOption: EmployeeFilterOption | null) => void;
  strLabel?: string;
  strPlaceholder?: string;
  strControlId: string;
  blnDisabled?: boolean;
  blnLoading?: boolean;
  intMinWidth?: number;
};

function formatOption(objOption: EmployeeFilterOption) {
  return objOption.strEmployeeName ? `${objOption.strEmployeeCode} - ${objOption.strEmployeeName}` : objOption.strEmployeeCode;
}

/** Employee filter used on list/report screens: a dropdown of employees you can type into to search by code or name. */
export default function EmployeeFilterSelect({
  lstOptions,
  strValue,
  fnOnChange,
  strLabel = "Employee",
  strPlaceholder = "Search employee...",
  strControlId,
  blnDisabled = false,
  blnLoading = false,
  intMinWidth = 220,
}: EmployeeFilterSelectProps) {
  const objSelected = useMemo(() => lstOptions.find((objOption) => objOption.strValue === strValue) ?? null, [lstOptions, strValue]);
  return (
    <Autocomplete
      size="small"
      options={lstOptions}
      value={objSelected}
      loading={blnLoading}
      disabled={blnDisabled}
      getOptionLabel={formatOption}
      isOptionEqualToValue={(objLeft, objRight) => objLeft.strValue === objRight.strValue}
      onChange={(_objEvent, objOption) => fnOnChange(objOption?.strValue ?? "", objOption)}
      fullWidth
      sx={{ minWidth: intMinWidth }}
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
