"use client";

import type { InputHTMLAttributes } from "react";
import Switch, { type SwitchProps } from "@mui/material/Switch";

type ActiveStatusSwitchInputProps = InputHTMLAttributes<HTMLInputElement> & {
  controlId?: string;
  "data-control-id"?: string;
  "data-controlid"?: string;
};

type ActiveStatusSwitchProps = Omit<SwitchProps, "checked" | "onChange" | "color"> & {
  blnIsActive: boolean;
  onChange?: (blnIsActive: boolean) => void;
  controlId?: string;
  testId?: string;
};

export default function ActiveStatusSwitch({
  blnIsActive,
  controlId = "active-status-switch.input",
  disabled,
  onChange,
  inputProps,
  title,
  size,
  sx,
  testId,
  ...objProps
}: ActiveStatusSwitchProps) {
  const strStateLabel = blnIsActive ? "Active ON" : "Inactive OFF";
  const objInputProps = (inputProps ?? {}) as ActiveStatusSwitchInputProps;
  const { controlId: strInputControlId, ...objInputPropsWithoutControlId } = objInputProps;
  const objResolvedInputProps = {
    ...objInputPropsWithoutControlId,
    "data-control-id": objInputProps["data-control-id"] ?? testId ?? strInputControlId ?? controlId,
    "data-controlid": objInputProps["data-controlid"] ?? testId ?? strInputControlId ?? controlId,
    "aria-label": strStateLabel,
  } as InputHTMLAttributes<HTMLInputElement>;

  return (
    <Switch
      {...objProps}
      checked={blnIsActive}
      disabled={disabled}
      color="primary"
      size={size}
      title={title ?? strStateLabel}
      inputProps={objResolvedInputProps}
      onChange={(_, blnChecked) => onChange?.(blnChecked)}
      sx={{
        "& .MuiSwitch-switchBase": {
          color: "#dc2626",
          transitionDuration: "180ms",
          "&.Mui-checked": {
            color: "#16a34a",
            "& + .MuiSwitch-track": {
              backgroundColor: "#16a34a",
              opacity: 1,
            },
          },
          "&.Mui-disabled": {
            // Read unmistakably as "locked": grey, not a pale green/red that
            // looks like a live control the user just cannot make respond.
            color: "#cbd5e1",
            "& + .MuiSwitch-track": {
              backgroundColor: "#cbd5e1 !important",
              opacity: 0.7,
            },
          },
        },
        "& .MuiSwitch-thumb": {
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.22)",
        },
        "& .MuiSwitch-track": {
          backgroundColor: "#dc2626",
          opacity: 1,
        },
        ...sx,
      }}
    />
  );
}
