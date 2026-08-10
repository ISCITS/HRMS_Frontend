"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import type { ApplicationSettingDto, ApplicationSettingSaveRequest } from "@/features/settings/types";

const SETTINGS_VIEW = "SETTINGS_VIEW";
const SETTINGS_EDIT = "SETTINGS_EDIT";

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: ApiRequestMethod;
  objBody?: unknown;
  strMenuAction: string;
}) {
  return requestEncryptedApi<TData>({
    strPath: `${ApiRoutePrefix.ApiV1}${objOptions.strPath}`,
    strMethod: objOptions.strMethod,
    objBody: objOptions.objBody,
    strMenuAction: objOptions.strMenuAction,
    blnUseAuthHeader: true,
  });
}

export const settingsService = {
  // ---- HR / Admin: Leave settings (tblapplication_setting, module LEAVE) ----
  async listLeaveSettings(): Promise<ApplicationSettingDto[]> {
    const objResult = await requestApi<ApplicationSettingDto[]>({
      strPath: "/settings/leave",
      strMethod: ApiRequestMethod.Get,
      strMenuAction: SETTINGS_VIEW,
    });
    return objResult.Data ?? [];
  },

  async saveLeaveSetting(objPayload: ApplicationSettingSaveRequest): Promise<ApplicationSettingDto> {
    const objResult = await requestApi<ApplicationSettingDto>({
      strPath: "/settings/leave",
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: SETTINGS_EDIT,
    });
    return objResult.Data as ApplicationSettingDto;
  },
};
