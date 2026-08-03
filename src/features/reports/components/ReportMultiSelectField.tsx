"use client";

import { Autocomplete, TextField } from "@mui/material";

type ReportMultiSelectFieldProps = {
  label?: string;
  placeholder?: string;
  value: string;
  options: string[];
  onChange: (strValue: string) => void;
  controlId?: string;
};

function splitValue(strValue: string) {
  return strValue
    .split(",")
    .map((strItem) => strItem.trim())
    .filter(Boolean);
}

function joinValue(lstValues: string[]) {
  return Array.from(new Set(lstValues.map((strItem) => strItem.trim()).filter(Boolean))).join(", ");
}

export function getUniqueOptions(lstValues: Array<string | null | undefined>) {
  return Array.from(
    new Set(lstValues.map((strValue) => String(strValue ?? "").trim()).filter(Boolean)),
  ).sort((strLeft, strRight) => strLeft.localeCompare(strRight));
}

export default function ReportMultiSelectField({
  label,
  placeholder,
  value,
  options,
  onChange,
  controlId,
}: ReportMultiSelectFieldProps) {
  return (
    <Autocomplete<string, true, false, true>
      multiple
      freeSolo
      forcePopupIcon
      options={options}
      value={splitValue(value)}
      onChange={(_, lstSelected) => onChange(joinValue(lstSelected))}
      renderInput={(objParams) => (
        <TextField
          {...objParams}
          label={label}
          placeholder={splitValue(value).length ? undefined : placeholder}
          fullWidth
          inputProps={{ ...objParams.inputProps, "data-controlid": controlId }}
        />
      )}
    />
  );
}
