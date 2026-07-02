"use client";

import type { InputHTMLAttributes } from "react";
import Switch, { type SwitchProps } from "@mui/material/Switch";

type ActiveStatusSwitchInputProps = InputHTMLAttributes<HTMLInputElement> & {
  controlId?: string;
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
<<<<<<< Updated upstream
  controlId,
=======
  controlId = "active-status-switch.input",
>>>>>>> Stashed changes
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
  const objResolvedInputProps = {
<<<<<<< Updated upstream
    ...inputProps,
    ...(testId ? { "data-testid": testId } : {}),
    controlId: typeof inputProps?.controlId === "string" ? inputProps.controlId : "active-status-switch.input",
=======
    ...objInputProps,
    "data-controlid": objInputProps["data-controlid"] ?? objInputProps.controlId ?? controlId,
>>>>>>> Stashed changes
    "aria-label": strStateLabel,
  } as InputHTMLAttributes<HTMLInputElement>;

  return (
    <Switch
      {...objProps}
<<<<<<< Updated upstream
      controlId={controlId ?? "active-status-switch"}
=======
>>>>>>> Stashed changes
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
            color: blnIsActive ? "#86efac" : "#fca5a5",
            "& + .MuiSwitch-track": {
              opacity: 0.55,
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
