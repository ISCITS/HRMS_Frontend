"use client";

import { useRef, useState } from "react";

import { changePasswordService } from "@/features/change-password/services/changePasswordService";
import type { ChangePasswordFormValues } from "@/features/change-password/types/ChangePasswordTypes";

export function useChangePassword() {
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const objSubmissionRef = useRef(false);

  async function changePassword(objValues: ChangePasswordFormValues, intEmployeeID?: number) {
    if (objSubmissionRef.current) {
      return null;
    }
    objSubmissionRef.current = true;
    setBlnSubmitting(true);
    try {
      return await changePasswordService.changePassword(objValues, intEmployeeID);
    } finally {
      objSubmissionRef.current = false;
      setBlnSubmitting(false);
    }
  }

  return { changePassword, blnSubmitting };
}
