"use client";

import type { InputHTMLAttributes } from "react";
import Switch, { type SwitchProps } from "@mui/material/Switch";

type ActiveStatusSwitchProps = Omit<SwitchProps, "checked" | "onChange" | "color"> & {
  blnIsActive: boolean;
  onChange?: (blnIsActive: boolean) => void;
  testId?: string;
};

export default function ActiveStatusSwitch({
  blnIsActive,
  disabled,
  onChange,
  inputProps,
  testId,
  title,
  size = "small",
  sx,
  ...objProps
}: ActiveStatusSwitchProps) {
  const strStateLabel = blnIsActive ? "Active ON" : "Inactive OFF";
  const strResolvedTestId = testId ?? "shared.active-status.switch";
  const objResolvedInputProps = {
    "data-testid": strResolvedTestId,
    "aria-label": strStateLabel,
    ...inputProps,
  } as InputHTMLAttributes<HTMLInputElement>;

  return (
    <Switch
      {...objProps}
      data-testid={strResolvedTestId}
      checked={blnIsActive}
      disabled={disabled}
      size={size}
      title={title ?? strStateLabel}
      inputProps={objResolvedInputProps}
      onChange={(_, blnChecked) => onChange?.(blnChecked)}
      sx={{
        width: size === "small" ? 42 : 58,
        height: size === "small" ? 26 : 34,
        padding: 0,
        "& .MuiSwitch-switchBase": {
          padding: size === "small" ? "3px" : "4px",
          color: "#dc2626",
          transitionDuration: "180ms",
          "&.Mui-checked": {
            color: "#16a34a",
            transform: size === "small" ? "translateX(16px)" : "translateX(24px)",
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
          height: size === "small" ? 20 : 26,
          width: size === "small" ? 20 : 26,
        },
        "& .MuiSwitch-track": {
          backgroundColor: "#dc2626",
          borderRadius: 999,
          opacity: 1,
        },
        ...sx,
      }}
    />
  );
}
