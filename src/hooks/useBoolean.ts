"use client";

import { useState } from "react";

/*
Functional responsibility:
- Manage a boolean UI state with explicit helper actions.

Inputs:
- Optional initial boolean value.

Output:
- Current value with set, on, off, and toggle helpers.

Failure behavior:
- No failure path; state updates remain local to the consumer.
*/
export function useBoolean(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  return {
    value,
    setValue,
    on: () => setValue(true),
    off: () => setValue(false),
    toggle: () => setValue((previousValue) => !previousValue)
  };
}

