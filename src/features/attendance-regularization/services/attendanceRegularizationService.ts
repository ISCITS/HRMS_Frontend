"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import { authHelpers } from "@/lib/auth";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";
import type {
  AssignableUser,
  BulkActionResult,
  DateContext,
  ExceptionRecord,
  ExceptionFilters,
  ExceptionList,
  PreviewResult,
  RegularizationDetail,
  RegularizationFormValues,
  RegularizationLookups,
  RegularizationRequest,
  RequestList,
} from "@/features/attendance-regularization/types/AttendanceRegularizationTypes";

const objAction = {
  ess: "ESS_ATT_REG_REQUEST",
  view: "ATT_REG_REQUEST_VIEW",
  onBehalf: "ATT_REG_REQUEST_CREATE_ON_BEHALF",
  approve: "ATT_REG_REQUEST_APPROVE",
  exceptionView: "ATT_EXCEPTION_VIEW",
  exceptionManage: "ATT_EXCEPTION_REVIEW",
  exceptionExport: "ATT_EXCEPTION_EXPORT",
} as const;

async function requestApi<TData>(strPath: string, strMethod: ApiRequestMethod, strMenuAction: string, objBody?: unknown) {
  const objResult = await requestEncryptedApi<TData>({
    strPath: `${ApiRoutePrefix.ApiV1}${strPath}`,
    strMethod,
    objBody,
    strMenuAction,
    blnUseAuthHeader: true,
  });
  return objResult.Data;
}

function toExceptionQuery(objFilters: ExceptionFilters, intPage?: number, intPageSize?: number) {
  const objQuery = new URLSearchParams();
  if (intPage) objQuery.set("page", String(intPage));
  if (intPageSize) objQuery.set("page_size", String(intPageSize));
  if (objFilters.strFromDate) objQuery.set("from_date", objFilters.strFromDate);
  if (objFilters.strToDate) objQuery.set("to_date", objFilters.strToDate);
  if (objFilters.intEmployeeID) objQuery.set("employee_id", String(objFilters.intEmployeeID));
  if (objFilters.intDepartmentID) objQuery.set("department_id", String(objFilters.intDepartmentID));
  if (objFilters.strExceptionTypeCode) objQuery.set("exception_type", objFilters.strExceptionTypeCode);
  if (objFilters.strSeverityCode) objQuery.set("severity", objFilters.strSeverityCode);
  if (objFilters.strExceptionStatus) objQuery.set("status", objFilters.strExceptionStatus);
  if (objFilters.intAssignedToUserID) objQuery.set("assignee_id", String(objFilters.intAssignedToUserID));
  if (objFilters.blnHasRequest !== undefined) objQuery.set("has_request", String(objFilters.blnHasRequest));
  if (objFilters.intMinAgeingDays !== undefined) objQuery.set("min_ageing_days", String(objFilters.intMinAgeingDays));
  if (objFilters.strSortBy) objQuery.set("sort_by", objFilters.strSortBy);
  if (objFilters.strSortDirection) objQuery.set("sort_direction", objFilters.strSortDirection);
  return objQuery;
}

export const attendanceRegularizationService = {
  getEssLookups(intLanguageID?: number) {
    const objQuery = new URLSearchParams();
    if (intLanguageID) objQuery.set("language_id", String(intLanguageID));
    return requestApi<RegularizationLookups>(`/ess/attendance/regularization/lookups?${objQuery}`, ApiRequestMethod.Get, objAction.ess);
  },
  getHrLookups(intLanguageID?: number) {
    const objQuery = new URLSearchParams();
    if (intLanguageID) objQuery.set("language_id", String(intLanguageID));
    return requestApi<RegularizationLookups>(`/attendance/regularization/lookups?${objQuery}`, ApiRequestMethod.Get, objAction.view);
  },
  getManagerLookups(intLanguageID?: number) {
    return this.getEssLookups(intLanguageID);
  },
  listManagerRequests(objFilters: { intPage: number; intPageSize: number; strStatus?: string; strFromDate?: string; strToDate?: string }) {
    const objQuery = new URLSearchParams({ page: String(objFilters.intPage), page_size: String(objFilters.intPageSize) });
    if (objFilters.strStatus) objQuery.set("status", objFilters.strStatus);
    if (objFilters.strFromDate) objQuery.set("from_date", objFilters.strFromDate);
    if (objFilters.strToDate) objQuery.set("to_date", objFilters.strToDate);
    return requestApi<RequestList>(`/ess/attendance/regularization/approvals?${objQuery}`, ApiRequestMethod.Get, objAction.ess);
  },
  getManagerDetail(intRequestID: number) {
    return requestApi<RegularizationDetail>(`/ess/attendance/regularization/approvals/${intRequestID}`, ApiRequestMethod.Get, objAction.ess);
  },
  actionManagerRequest(intRequestID: number, strAction: "approve" | "reject" | "send-back", intRowVersion: number, strReason?: string) {
    return requestApi<RegularizationRequest>(`/ess/attendance/regularization/approvals/${intRequestID}/${strAction}`, ApiRequestMethod.Post, objAction.ess, { intRowVersion, strReason });
  },
  listMyRequests(intPage = 1, intPageSize = 20) {
    return requestApi<RequestList>(`/ess/attendance/regularization/requests?page=${intPage}&page_size=${intPageSize}`, ApiRequestMethod.Get, objAction.ess);
  },
  getMyContext(strWorkDate: string) {
    return requestApi<DateContext>(`/ess/attendance/regularization/context?work_date=${encodeURIComponent(strWorkDate)}`, ApiRequestMethod.Get, objAction.ess);
  },
  preview(strWorkDate: string, objPayload: Omit<RegularizationFormValues, "dtWorkDate">) {
    return requestApi<PreviewResult>(`/ess/attendance/regularization/preview?work_date=${encodeURIComponent(strWorkDate)}`, ApiRequestMethod.Post, objAction.ess, objPayload);
  },
  createDraft(objPayload: RegularizationFormValues) {
    return requestApi<RegularizationRequest>("/ess/attendance/regularization/requests", ApiRequestMethod.Post, objAction.ess, objPayload);
  },
  updateDraft(intRequestID: number, intRowVersion: number, objPayload: RegularizationFormValues) {
    return requestApi<RegularizationRequest>(`/ess/attendance/regularization/requests/${intRequestID}`, ApiRequestMethod.Put, objAction.ess, { ...objPayload, intRowVersion });
  },
  submit(intRequestID: number, intRowVersion: number) {
    return requestApi<RegularizationRequest>(`/ess/attendance/regularization/requests/${intRequestID}/submit`, ApiRequestMethod.Post, objAction.ess, { intRowVersion });
  },
  withdraw(intRequestID: number, intRowVersion: number, strReason: string) {
    return requestApi<RegularizationRequest>(`/ess/attendance/regularization/requests/${intRequestID}/withdraw`, ApiRequestMethod.Post, objAction.ess, { intRowVersion, strReason });
  },
  getMyDetail(intRequestID: number) {
    return requestApi<RegularizationDetail>(`/ess/attendance/regularization/requests/${intRequestID}`, ApiRequestMethod.Get, objAction.ess);
  },
  async uploadAttachment(intRequestID: number, objFile: File) {
    const objFormData = new FormData();
    objFormData.append("objFile", objFile);
    const objConfig: ApiRequestConfig = {
      headers: { Authorization: `Bearer ${authHelpers.getAccessToken() ?? ""}` },
      csrfMenuAction: objAction.ess,
    };
    const objResponse = await axiosInstance.post(`${ApiRoutePrefix.ApiV1}/ess/attendance/regularization/requests/${intRequestID}/attachments`, objFormData, objConfig);
    return objResponse.data;
  },
  deleteAttachment(intRequestID: number, intAttachmentID: number) {
    return requestApi<null>(`/ess/attendance/regularization/requests/${intRequestID}/attachments/${intAttachmentID}`, ApiRequestMethod.Delete, objAction.ess);
  },
  async downloadAttachment(intRequestID: number, intAttachmentID: number, strFileName: string) {
    const objConfig: ApiRequestConfig = {
      responseType: "blob",
      headers: { Authorization: `Bearer ${authHelpers.getAccessToken() ?? ""}` },
      csrfMenuAction: objAction.ess,
    };
    const objResponse = await axiosInstance.get(
      `${ApiRoutePrefix.ApiV1}/ess/attendance/regularization/requests/${intRequestID}/attachments/${intAttachmentID}`,
      objConfig,
    );
    const strUrl = URL.createObjectURL(objResponse.data as Blob);
    const objLink = document.createElement("a");
    objLink.href = strUrl;
    objLink.download = strFileName;
    objLink.click();
    URL.revokeObjectURL(strUrl);
  },
  listHrRequests(objFilters: { intPage: number; intPageSize: number; intEmployeeID?: number; strStatus?: string; strFromDate?: string; strToDate?: string }) {
    const objQuery = new URLSearchParams({ page: String(objFilters.intPage), page_size: String(objFilters.intPageSize) });
    if (objFilters.intEmployeeID) objQuery.set("employee_id", String(objFilters.intEmployeeID));
    if (objFilters.strStatus) objQuery.set("status", objFilters.strStatus);
    if (objFilters.strFromDate) objQuery.set("from_date", objFilters.strFromDate);
    if (objFilters.strToDate) objQuery.set("to_date", objFilters.strToDate);
    return requestApi<RequestList>(`/attendance/regularization/requests?${objQuery}`, ApiRequestMethod.Get, objAction.view);
  },
  getHrDetail(intRequestID: number) {
    return requestApi<RegularizationDetail>(`/attendance/regularization/requests/${intRequestID}`, ApiRequestMethod.Get, objAction.view);
  },
  createOnBehalf(objPayload: RegularizationFormValues & { intEmployeeID: number; strOnBehalfReason: string }) {
    return requestApi<RegularizationRequest>("/attendance/regularization/requests/on-behalf", ApiRequestMethod.Post, objAction.onBehalf, objPayload);
  },
  actionRequest(intRequestID: number, strAction: "approve" | "reject" | "send-back", intRowVersion: number, strReason?: string) {
    return requestApi<RegularizationRequest>(`/attendance/regularization/requests/${intRequestID}/${strAction}`, ApiRequestMethod.Post, objAction.approve, { intRowVersion, strReason });
  },
  listExceptions(objFilters: ExceptionFilters, intPage: number, intPageSize: number) {
    return requestApi<ExceptionList>(`/attendance/exceptions?${toExceptionQuery(objFilters, intPage, intPageSize)}`, ApiRequestMethod.Get, objAction.exceptionView);
  },
  generateExceptions(strFromDate: string, strToDate: string) {
    return requestApi<{ intCreated: number; intUpdated: number }>("/attendance/exceptions/generate", ApiRequestMethod.Post, objAction.exceptionManage, { dtFromDate: strFromDate, dtToDate: strToDate });
  },
  getException(intExceptionID: number) {
    return requestApi<Record<string, unknown>>(`/attendance/exceptions/${intExceptionID}`, ApiRequestMethod.Get, objAction.exceptionView);
  },
  listAssignableUsers(strSearch = "") {
    return requestApi<AssignableUser[]>(`/attendance/exceptions/assignable-users?search=${encodeURIComponent(strSearch)}`, ApiRequestMethod.Get, "ATT_EXCEPTION_ASSIGN");
  },
  exceptionAction(intExceptionID: number, strAction: "assign" | "under-review" | "resolve" | "ignore", objPayload: unknown = {}) {
    return requestApi<ExceptionRecord>(`/attendance/exceptions/${intExceptionID}/${strAction}`, ApiRequestMethod.Post, objAction.exceptionManage, objPayload);
  },
  createFromException(intExceptionID: number, objPayload: RegularizationFormValues) {
    return requestApi<RegularizationRequest | { blnExisting: true; intRequestID: number }>(
      `/attendance/exceptions/${intExceptionID}/regularization`,
      ApiRequestMethod.Post,
      "ATT_EXCEPTION_CREATE_REQUEST",
      objPayload,
    );
  },
  bulkAssign(lstExceptionIDs: number[], intAssignedToUserID: number) {
    return requestApi<BulkActionResult>("/attendance/exceptions-bulk/assign", ApiRequestMethod.Post, "ATT_EXCEPTION_BULK_ASSIGN", { lstExceptionIDs, intAssignedToUserID });
  },
  bulkIgnore(lstExceptionIDs: number[], strIgnoreReason: string) {
    return requestApi<BulkActionResult>("/attendance/exceptions-bulk/ignore", ApiRequestMethod.Post, "ATT_EXCEPTION_BULK_IGNORE", { lstExceptionIDs, strIgnoreReason });
  },
  async exportExceptions(objFilters: ExceptionFilters) {
    const objConfig: ApiRequestConfig = {
      responseType: "blob",
      headers: { Authorization: `Bearer ${authHelpers.getAccessToken() ?? ""}` },
      csrfMenuAction: objAction.exceptionExport,
    };
    const objResponse = await axiosInstance.get(`${ApiRoutePrefix.ApiV1}/attendance/exceptions/export?${toExceptionQuery(objFilters)}`, objConfig);
    const strUrl = URL.createObjectURL(objResponse.data as Blob);
    const objLink = document.createElement("a");
    objLink.href = strUrl;
    objLink.download = "attendance_exceptions.csv";
    objLink.click();
    URL.revokeObjectURL(strUrl);
  },
};
