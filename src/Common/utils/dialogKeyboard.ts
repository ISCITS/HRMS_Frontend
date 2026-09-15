"use client";

import type { KeyboardEvent } from "react";

import { UiKeyboardKey } from "@/Common/enums/AppEnums";

export function handleSingleDialogActionEnter(objEvent: KeyboardEvent<HTMLElement>) {
  if (objEvent.key !== UiKeyboardKey.Enter) {
    return;
  }

  const objDialogRoot = objEvent.currentTarget as HTMLElement;
  const lstActionButtons = Array.from(
    objDialogRoot.querySelectorAll<HTMLButtonElement>(".MuiDialogActions-root button"),
  ).filter((objButton) => !objButton.disabled && objButton.offsetParent !== null);

  if (lstActionButtons.length !== 1) {
    return;
  }

  objEvent.preventDefault();
  lstActionButtons[0].click();
}
