"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi, type ApiEnvelope } from "@/Common/utils/apiErrorHandler";

export type ItDeclarationStatus = "draft" | "submitted" | "approved" | "rejected";
export type ItDeclarationFlowStatus = "NOT_STARTED" | "REGIME_SELECTED" | "IN_PROGRESS" | "SUBMITTED";
export type ItDeclarationRegime = "Old Regime" | "New Regime";

export type ItDeclarationItemDto = {
  intItemID?: number | null;
  strSection: string;
  strDescription: string;
  strMaxLimit: string;
  decDeclaredAmount: number;
  strInvestmentName: string;
  strStatus: "Completed" | "In Progress" | "Not Started";
};

export type ItDeclarationSummaryDto = {
  decGrossSalary: number;
  decExemptions: number;
  decTaxableIncome: number;
  decOldTax: number;
  decNewTax: number;
  decSavings: number;
  strRecommendedRegime: ItDeclarationRegime;
};

export type ItDeclarationDto = {
  intDeclarationID?: number | null;
  strFinancialYearCode: string;
  strFlowStatus: ItDeclarationFlowStatus;
  strSelectedRegime: ItDeclarationRegime | "";
  strDeclarationStatus: ItDeclarationStatus;
  strLastUpdated: string;
  lstItems: ItDeclarationItemDto[];
  objSummary: ItDeclarationSummaryDto;
  objRegimeConfig?: {
    strDefaultRegime: ItDeclarationRegime;
    blnAllowEmployeeOptOut: boolean;
  };
};

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: ApiRequestMethod;
  objBody?: unknown;
  objQueryParams?: Record<string, string | number | boolean | null | undefined>;
  strMenuAction: string;
}) {
  return requestEncryptedApi<TData>({
    strPath: `${ApiRoutePrefix.ApiV1}${objOptions.strPath}`,
    strMethod: objOptions.strMethod,
    objBody: objOptions.objBody,
    objQueryParams: objOptions.objQueryParams,
    strMenuAction: objOptions.strMenuAction,
    blnUseAuthHeader: true,
  });
}

export const itDeclarationService = {
  async getDeclaration(strFinancialYearCode: string): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: "/ess/it-declaration",
      strMethod: ApiRequestMethod.Get,
      objQueryParams: { financial_year_code: strFinancialYearCode },
      strMenuAction: "ESS_IT_DECLARATION_VIEW",
    });
    return objResult.Data;
  },

  async startDeclaration(strFinancialYearCode: string, strRegime: ItDeclarationRegime): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: "/ess/it-declaration/start",
      strMethod: ApiRequestMethod.Post,
      objBody: {
        strFinancialYearCode,
        strSelectedRegime: strRegime,
      },
      strMenuAction: "ESS_IT_DECLARATION_START",
    });
    return objResult.Data;
  },

  async changeRegime(intDeclarationID: number, strRegime: ItDeclarationRegime): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: `/ess/it-declaration/${intDeclarationID}/regime`,
      strMethod: ApiRequestMethod.Post,
      objBody: { strSelectedRegime: strRegime },
      strMenuAction: "ESS_IT_DECLARATION_UPDATE",
    });
    return objResult.Data;
  },

  async saveItem(
    intDeclarationID: number,
    objItem: { intItemID?: number | null; strSection: string; strInvestmentName: string; decDeclaredAmount: number }
  ): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: `/ess/it-declaration/${intDeclarationID}/items/save`,
      strMethod: ApiRequestMethod.Post,
      objBody: objItem,
      strMenuAction: "ESS_IT_DECLARATION_UPDATE",
    });
    return objResult.Data;
  },

  async compareTax(intDeclarationID: number): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: `/ess/it-declaration/${intDeclarationID}/compare`,
      strMethod: ApiRequestMethod.Post,
      strMenuAction: "ESS_IT_DECLARATION_COMPARE",
    });
    return objResult.Data;
  },

  async submitDeclaration(intDeclarationID: number): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: `/ess/it-declaration/${intDeclarationID}/submit`,
      strMethod: ApiRequestMethod.Post,
      strMenuAction: "ESS_IT_DECLARATION_SUBMIT",
    });
    return objResult.Data;
  },

  async withdrawDeclaration(intDeclarationID: number): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: `/ess/it-declaration/${intDeclarationID}/withdraw`,
      strMethod: ApiRequestMethod.Post,
      strMenuAction: "ESS_IT_DECLARATION_WITHDRAW",
    });
    return objResult.Data;
  },
};

export type ItDeclarationEnvelope = ApiEnvelope<ItDeclarationDto>;
