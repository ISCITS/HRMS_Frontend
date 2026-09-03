"use client";

const strPayrollScheduleEditStateKey = "hrms_payroll_schedule_selected_id";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function setPayrollScheduleSelectedID(intPayrollCycleID: number) {
  if (!isBrowser()) {
    return;
  }
  window.sessionStorage.setItem(strPayrollScheduleEditStateKey, String(intPayrollCycleID));
}

export function getPayrollScheduleSelectedID() {
  if (!isBrowser()) {
    return null;
  }
  const strValue = window.sessionStorage.getItem(strPayrollScheduleEditStateKey);
  if (!strValue) {
    return null;
  }
  const intValue = Number(strValue);
  return Number.isFinite(intValue) && intValue > 0 ? intValue : null;
}

export function clearPayrollScheduleSelectedID() {
  if (!isBrowser()) {
    return;
  }
  window.sessionStorage.removeItem(strPayrollScheduleEditStateKey);
}
