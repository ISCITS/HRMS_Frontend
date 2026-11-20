"use client";

import { useEffect } from "react";

// App-wide "press Enter to search": when Enter is pressed in a plain input that sits inside a
// filter row, the row's Search button is clicked. Screens that already handle Enter themselves
// call preventDefault first, so this never double-fires.
const strSearchButtonSelector = [
  '[data-control-id$="search.button"]',
  '[data-controlid$="search.button"]',
  '[controlid$="search.button"]',
  '[data-testid$="search.button"]',
  '[data-control-id$="show-report.button"]',
  '[data-controlid$="show-report.button"]',
  '[controlid$="show-report.button"]',
].join(",");

const setNonTextInputTypes = new Set(["checkbox", "radio", "file", "button", "submit", "reset", "range", "color", "hidden"]);
const intMaxAncestorDepth = 6;

// Some screens have no control id on their Search button; those are recognised by the Search icon
// MUI renders inside the button (input-adornment icons are not inside a button, so they never match).
function findIconSearchButton(objScope: HTMLElement): HTMLButtonElement | null {
  const objIcon = objScope.querySelector<SVGElement>('.MuiButton-startIcon [data-testid="SearchRoundedIcon"], button [data-testid="SearchRoundedIcon"]');
  return (objIcon?.closest("button") as HTMLButtonElement | null) ?? null;
}

function findSearchButton(objInput: HTMLElement): HTMLButtonElement | null {
  let objNode: HTMLElement | null = objInput.parentElement;
  for (let intDepth = 0; objNode && intDepth < intMaxAncestorDepth; intDepth += 1) {
    const objButton = objNode.querySelector<HTMLButtonElement>(strSearchButtonSelector) ?? findIconSearchButton(objNode);
    if (objButton) {
      return objButton;
    }
    objNode = objNode.parentElement;
  }
  return null;
}

export function useSearchOnEnter() {
  useEffect(() => {
    function handleKeyDown(objEvent: KeyboardEvent) {
      if (objEvent.key !== "Enter" || objEvent.defaultPrevented || objEvent.isComposing) return;
      if (objEvent.shiftKey || objEvent.ctrlKey || objEvent.altKey || objEvent.metaKey) return;
      const objTarget = objEvent.target;
      if (!(objTarget instanceof HTMLInputElement)) return;
      if (setNonTextInputTypes.has(objTarget.type)) return;
      if (objTarget.getAttribute("role") === "combobox" || objTarget.getAttribute("aria-expanded") === "true") return;
      // Dialogs, popovers and real forms keep their own Enter behaviour.
      if (objTarget.closest('form, [role="dialog"], [role="presentation"], .MuiPopover-root, .MuiModal-root')) return;
      const objButton = findSearchButton(objTarget);
      if (!objButton || objButton.disabled || objButton.getAttribute("aria-disabled") === "true") return;
      objEvent.preventDefault();
      objButton.click();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
}
