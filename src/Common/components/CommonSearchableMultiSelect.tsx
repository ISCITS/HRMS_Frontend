"use client";

import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Autocomplete, Checkbox, Chip, TextField } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";

import type { CommonSearchableSelectOption } from "@/Common/components/CommonSearchableSelect";

type CommonSearchableMultiSelectProps<T extends CommonSearchableSelectOption> = {
  label: string;
  value: Array<T["intID"]>;
  options: T[];
  onChange: (value: Array<T["intID"]>) => void;
  controlId?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  fullWidth?: boolean;
  className?: string;
  sx?: SxProps<Theme>;
  getOptionLabel?: (option: T) => string;
};

const iconUnchecked = <CheckBoxOutlineBlankIcon fontSize="small" />;
const iconChecked = <CheckBoxIcon fontSize="small" />;

// Multi-select counterpart to CommonSearchableSelect: same Autocomplete-based
// type-to-filter box, but with checkboxes per option and chips for the current
// selection, for dropdowns that previously used MUI's `<Select multiple>`.
export default function CommonSearchableMultiSelect<T extends CommonSearchableSelectOption>({
  label,
  value,
  options,
  onChange,
  controlId,
  placeholder,
  disabled = false,
  required = false,
  error = false,
  helperText,
  fullWidth = true,
  className,
  sx,
  getOptionLabel,
}: CommonSearchableMultiSelectProps<T>) {
  const resolveLabel = getOptionLabel ?? ((dicOption: T) => (dicOption.strCode ? `${dicOption.strCode} - ${dicOption.strLabel}` : dicOption.strLabel));
  const lstSelected = options.filter((dicOption) => value.includes(dicOption.intID));

  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      options={options}
      value={lstSelected}
      getOptionLabel={resolveLabel}
      isOptionEqualToValue={(dicA, dicB) => dicA.intID === dicB.intID}
      onChange={(_objEvent, lstOptions) => onChange(lstOptions.map((dicOption) => dicOption.intID))}
      disabled={disabled}
      fullWidth={fullWidth}
      className={className}
      sx={sx}
      renderOption={(objProps, dicOption, { selected }) => {
        const { key, ...objRest } = objProps as typeof objProps & { key?: string };
        return (
          <li key={key ?? dicOption.intID} {...objRest}>
            <Checkbox icon={iconUnchecked} checkedIcon={iconChecked} checked={selected} style={{ marginRight: 8 }} />
            {resolveLabel(dicOption)}
          </li>
        );
      }}
      renderTags={(lstValue, fnGetTagProps) =>
        lstValue.map((dicOption, intIndex) => {
          const { key, ...objRest } = fnGetTagProps({ index: intIndex });
          return <Chip key={key} label={resolveLabel(dicOption)} size="small" {...objRest} />;
        })
      }
      renderInput={(objParams) => (
        <TextField
          {...objParams}
          label={label}
          placeholder={lstSelected.length === 0 ? placeholder : undefined}
          controlId={controlId}
          required={required}
          error={error}
          helperText={helperText}
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

export type { CommonSearchableMultiSelectProps };
