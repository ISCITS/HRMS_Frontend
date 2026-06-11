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
  size = "medium",
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
      color="primary"
      size={size}
      title={title ?? strStateLabel}
      inputProps={objResolvedInputProps}
      onChange={(_, blnChecked) => onChange?.(blnChecked)}
      sx={sx}
    />
  );
}
