"use client";

import { useCallback, useEffect, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { leaveService } from "@/features/leave/services/leaveService";
import type {
  LeaveApplicationDto,
  LeaveApplyRequest,
  LeaveBalanceDto,
  LeaveDraftRequest,
  LeavePreviewDto,
  LeaveTypeAggregate,
  LeaveTypeDto,
} from "@/features/leave/types";

export function useEssLeaveApplication() {
  const [lstTypes, setLstTypes] = useState<LeaveTypeDto[]>([]);
  const [lstBalances, setLstBalances] = useState<LeaveBalanceDto[]>([]);
  const [lstApplications, setLstApplications] = useState<LeaveApplicationDto[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strLoadError, setStrLoadError] = useState<string | null>(null);

  const fnLoadAll = useCallback(async () => {
    setBlnLoading(true);
    setStrLoadError(null);
    try {
      const [lstTypeResult, lstBalanceResult, lstApplicationResult] = await Promise.all([
        leaveService.getEssLeaveTypes(),
        leaveService.getMyBalances(),
        leaveService.listMyApplications(),
      ]);
      setLstTypes(lstTypeResult);
      setLstBalances(lstBalanceResult);
      setLstApplications(lstApplicationResult);
      return lstTypeResult;
    } catch (objError) {
      setStrLoadError((await createApiRequestError(objError)).message);
      return [];
    } finally {
      setBlnLoading(false);
    }
  }, []);

  useEffect(() => {
    void fnLoadAll();
  }, [fnLoadAll]);

  const fnPreview = useCallback(async (objPayload: LeaveApplyRequest, intApplicationID?: number | null) => {
    return leaveService.previewMyLeave(objPayload, intApplicationID);
  }, []);

  const fnGetPolicy = useCallback(async (intLeaveTypeID: number): Promise<LeaveTypeAggregate> => {
    return leaveService.getLeaveTypeAggregate(intLeaveTypeID);
  }, []);

  const fnGetApplication = useCallback(async (intApplicationID: number) => {
    return leaveService.getMyLeaveApplication(intApplicationID);
  }, []);

  const fnPersistDraft = useCallback(async (
    objEditing: LeaveApplicationDto | null,
    objPayload: LeaveDraftRequest,
    lstFiles: File[],
    fnOnFileProgress?: (intFileIndex: number, intPercent: number) => void,
  ) => {
    let objDraft = objEditing
      ? await leaveService.updateMyLeaveDraft(objEditing.intID, objPayload)
      : await leaveService.createMyLeaveDraft(objPayload);
    for (const [intFileIndex, objFile] of lstFiles.entries()) {
      await leaveService.uploadMyLeaveAttachment(objDraft.intID, objFile, (intPercent) => fnOnFileProgress?.(intFileIndex, intPercent));
    }
    if (lstFiles.length > 0) {
      objDraft = await leaveService.getMyLeaveApplication(objDraft.intID);
    }
    return objDraft;
  }, []);

  const fnSubmitDraft = useCallback(async (intApplicationID: number, intVersionNo?: number) => {
    return leaveService.submitMyLeaveDraft(intApplicationID, intVersionNo);
  }, []);

  const fnWithdraw = useCallback(async (intApplicationID: number, strReason: string) => {
    return leaveService.withdrawMyLeaveApplication(intApplicationID, strReason);
  }, []);

  // Withdraw an already-approved, not-yet-started leave: routes a withdrawal request back through the
  // same approval chain (distinct from the pending-leave withdraw above).
  const fnRequestWithdrawal = useCallback(async (intApplicationID: number, strReason: string) => {
    return leaveService.requestApprovedLeaveWithdrawal(intApplicationID, strReason);
  }, []);

  const fnDeleteAttachment = useCallback(async (intApplicationID: number, intAttachmentID: number) => {
    await leaveService.deleteMyLeaveAttachment(intApplicationID, intAttachmentID);
  }, []);

  const fnPreviewAttachment = useCallback(async (intApplicationID: number, intAttachmentID: number) => {
    await leaveService.previewMyLeaveAttachment(intApplicationID, intAttachmentID);
  }, []);

  // Replace = delete the existing attachment then upload the newly picked file in its place;
  // reuses the same delete/upload endpoints already wired above (no new backend call).
  const fnReplaceAttachment = useCallback(async (
    intApplicationID: number,
    intAttachmentID: number,
    objNewFile: File,
    fnOnProgress?: (intPercent: number) => void,
  ) => {
    await leaveService.deleteMyLeaveAttachment(intApplicationID, intAttachmentID);
    await leaveService.uploadMyLeaveAttachment(intApplicationID, objNewFile, fnOnProgress);
    return leaveService.getMyLeaveApplication(intApplicationID);
  }, []);

  return {
    lstTypes,
    lstBalances,
    lstApplications,
    blnLoading,
    strLoadError,
    fnLoadAll,
    fnPreview,
    fnGetPolicy,
    fnGetApplication,
    fnPersistDraft,
    fnSubmitDraft,
    fnWithdraw,
    fnRequestWithdrawal,
    fnDeleteAttachment,
    fnPreviewAttachment,
    fnReplaceAttachment,
  };
}
