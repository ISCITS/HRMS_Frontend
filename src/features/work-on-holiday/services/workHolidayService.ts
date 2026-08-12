"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { createApiRequestError, requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";
import { openBlobUrlInNewTab } from "@/lib/openBlobUrlInNewTab";
import type {
  WorkHolidayAttachment,
  WorkHolidayEarnedCompOffList,
  WorkHolidayEligibilityPreview,
  WorkHolidayList,
  WorkHolidayMutationPayload,
  WorkHolidayRequest,
  WorkHolidayRequestPayload,
} from "@/features/work-on-holiday/types/WorkHolidayTypes";

const strBasePath = `${ApiRoutePrefix.ApiV1}/work-on-holiday`;

async function requestWorkHoliday<TData>(
  strPath: string,
  strMethod: ApiRequestMethod,
  strMenuAction: string,
  objBody?: unknown,
  objQueryParams?: Record<string, string | number | undefined>,
): Promise<TData> {
  const objResult = await requestEncryptedApi<TData>({
    strPath: `${strBasePath}${strPath}`,
    strMethod,
    objBody,
    objQueryParams,
    strMenuAction,
    blnUseAuthHeader: true,
  });
  return objResult.Data;
}

export const workHolidayService = {
  createDraft: (objPayload: WorkHolidayRequestPayload) =>
    requestWorkHoliday<WorkHolidayRequest>("/requests", ApiRequestMethod.Post, "WORK_ON_HOLIDAY_CREATE", objPayload),
  createOnBehalf: (objPayload: WorkHolidayRequestPayload & { intEmployeeID: number; strOnBehalfReason: string }) =>
    requestWorkHoliday<WorkHolidayRequest>("/requests/on-behalf", ApiRequestMethod.Post, "WORK_ON_HOLIDAY_CREATE_ON_BEHALF", objPayload),
  updateDraft: (intRequestID: number, objPayload: WorkHolidayRequestPayload) =>
    requestWorkHoliday<WorkHolidayRequest>(`/requests/${intRequestID}`, ApiRequestMethod.Put, "WORK_ON_HOLIDAY_EDIT", objPayload),
  uploadAttachment: async (intRequestID: number, objFile: File) => {
    const objForm = new FormData();
    objForm.append("objFile", objFile);
    return requestWorkHoliday<{ intID: number; strFileName: string; intFileSizeBytes: number }>(
      `/requests/${intRequestID}/attachments`, ApiRequestMethod.Post, "WORK_ON_HOLIDAY_EDIT", objForm,
    );
  },
  submit: (intRequestID: number, objPayload: WorkHolidayMutationPayload) =>
    requestWorkHoliday<WorkHolidayRequest>(`/requests/${intRequestID}/submit`, ApiRequestMethod.Post, "WORK_ON_HOLIDAY_SUBMIT", objPayload),
  withdraw: (intRequestID: number, objPayload: WorkHolidayMutationPayload) =>
    requestWorkHoliday<WorkHolidayRequest>(`/requests/${intRequestID}/withdraw`, ApiRequestMethod.Post, "WORK_ON_HOLIDAY_WITHDRAW", objPayload),
  listMy: (strStatus?: string, intPage = 1, intPageSize = 20) =>
    requestWorkHoliday<WorkHolidayList>("/my", ApiRequestMethod.Get, "WORK_ON_HOLIDAY_VIEW", undefined, {
      status: strStatus, page: intPage, page_size: intPageSize,
    }),
  listQueue: (intPage = 1, intPageSize = 20) =>
    requestWorkHoliday<WorkHolidayList>("/queue", ApiRequestMethod.Get, "WORK_ON_HOLIDAY_APPROVE", undefined, {
      page: intPage, page_size: intPageSize,
    }),
  listAll: (strStatus?: string, intPage = 1, intPageSize = 20) =>
    requestWorkHoliday<WorkHolidayList>("/all", ApiRequestMethod.Get, "WORK_ON_HOLIDAY_VIEW_ALL", undefined, {
      status: strStatus, page: intPage, page_size: intPageSize,
    }),
  getDetail: (intRequestID: number) =>
    requestWorkHoliday<WorkHolidayRequest>(`/requests/${intRequestID}`, ApiRequestMethod.Get, "WORK_ON_HOLIDAY_VIEW"),
  async previewReviewAttachment(intRequestID: number, intAttachmentID: number): Promise<void> {
    try {
      const objResponse = await axiosInstance.request<Blob>({
        method: ApiRequestMethod.Get,
        url: `${strBasePath}/requests/${intRequestID}/attachments/${intAttachmentID}`,
        responseType: "blob",
        csrfMenuAction: "WORK_ON_HOLIDAY_VIEW",
      } as ApiRequestConfig);
      const strUrl = URL.createObjectURL(objResponse.data);
      openBlobUrlInNewTab(strUrl);
      window.setTimeout(() => URL.revokeObjectURL(strUrl), 30000);
    } catch (objError) {
      throw await createApiRequestError(objError);
    }
  },
  uploadReviewAttachment: async (intRequestID: number, objFile: File) => {
    const objForm = new FormData();
    objForm.append("objFile", objFile);
    return requestWorkHoliday<WorkHolidayAttachment>(
      `/requests/${intRequestID}/attachments/review`, ApiRequestMethod.Post, "WORK_ON_HOLIDAY_APPROVE", objForm,
    );
  },
  deleteReviewAttachment: (intRequestID: number, intAttachmentID: number) =>
    requestWorkHoliday<null>(`/requests/${intRequestID}/attachments/${intAttachmentID}`, ApiRequestMethod.Delete, "WORK_ON_HOLIDAY_APPROVE"),
  decide: (intRequestID: number, strDecision: "approve" | "reject" | "send-back", objPayload: WorkHolidayMutationPayload) =>
    requestWorkHoliday<WorkHolidayRequest>(`/requests/${intRequestID}/${strDecision}`, ApiRequestMethod.Post, `WORK_ON_HOLIDAY_${strDecision.replace("-", "_").toUpperCase()}`, objPayload),
  verifyAttendance: (intRequestID: number, objPayload: WorkHolidayMutationPayload & { decVerifiedHours: number; blnVerified: boolean }) =>
    requestWorkHoliday<WorkHolidayRequest>(`/requests/${intRequestID}/verify-attendance`, ApiRequestMethod.Post, "WORK_ON_HOLIDAY_VERIFY", objPayload),
  postCredit: (intRequestID: number, objPayload: WorkHolidayMutationPayload & { blnAttendanceCredit: boolean; blnCompOffCredit: boolean }) =>
    requestWorkHoliday<WorkHolidayRequest>(`/requests/${intRequestID}/post-credit`, ApiRequestMethod.Post, "WORK_ON_HOLIDAY_POST", objPayload),
  reprocess: (intRequestID: number, objPayload: WorkHolidayMutationPayload & { blnAttendanceCredit: boolean; blnCompOffCredit: boolean }) =>
    requestWorkHoliday<WorkHolidayRequest>(`/requests/${intRequestID}/reprocess`, ApiRequestMethod.Post, "WORK_ON_HOLIDAY_POST", objPayload),
  reverse: (intRequestID: number, objPayload: WorkHolidayMutationPayload) =>
    requestWorkHoliday<WorkHolidayRequest>(`/requests/${intRequestID}/reverse`, ApiRequestMethod.Post, "WORK_ON_HOLIDAY_REVERSE", objPayload),
  listCompOffEarned: (intPage = 1, intPageSize = 100) =>
    requestWorkHoliday<WorkHolidayEarnedCompOffList>(
      "/comp-off-earned", ApiRequestMethod.Get, "WORK_ON_HOLIDAY_VIEW", undefined,
      { page: intPage, page_size: intPageSize },
    ),
  getEligibilityPreview: (strWorkDate: string) =>
    requestWorkHoliday<WorkHolidayEligibilityPreview>(
      "/eligibility-preview", ApiRequestMethod.Get, "WORK_ON_HOLIDAY_VIEW", undefined,
      { work_date: strWorkDate },
    ),
};
