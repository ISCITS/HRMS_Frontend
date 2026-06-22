"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi } from "@/Common/utils/apiErrorHandler";

type FlexiDeclarationItemPayload = {
  intSalaryComponentID: number;
  decDeclaredAmountAnnual: number;
  strRemarks?: string | null;
};

export type FlexiDeclarationRecord = {
  intDeclarationID: number;
  strFinancialYearCode: string;
  strDeclarationKind: string;
  strWorkflowStatus: string;
  dtSubmittedOn?: string | null;
  dtApprovedOn?: string | null;
  strRemarks?: string | null;
};

export type FlexiDeclarationLineRecord = {
  intSalaryComponentID: number;
  strComponentCode?: string | null;
  strComponentName?: string | null;
  decAnnualLimit?: number | null;
  decMonthlyLimit?: number | null;
  decAllocationAnnual?: number | null;
  decAllocationMonthly?: number | null;
  blnProofRequired?: boolean | null;
  strTaxTreatment?: string | null;
  decBalanceAnnual?: number | null;
  decDraftDeclaredAnnual?: number | null;
  decDraftApprovedAnnual?: number | null;
  strDeclarationItemStatus?: string | null;
  strDeclarationItemRemarks?: string | null;
  blnEligible?: boolean | null;
  strEligibilityReason?: string | null;
};

export type FlexiEligibilityQuestionRecord = {
  strQuestionCode: string;
  strQuestionLabel: string;
  strAnswerType: "boolean" | "number" | "text";
  strHint?: string | null;
  objAnswerValue?: string | number | boolean | null;
};

export type FlexiDeclarationContextRecord = {
  strFinancialYearCode: string;
  objDeclaration?: FlexiDeclarationRecord | null;
  blnCanDeclare: boolean;
  strIneligibilityReason?: string | null;
  objEmployeeSummary?: {
    intEmployeeID: number;
    strEmployeeCode?: string | null;
    strEmployeeName?: string | null;
  } | null;
  objAssignedStructure?: {
    intSalaryStructureID?: number | null;
    strSalaryStructureName?: string | null;
    strCurrencyCode?: string | null;
  } | null;
  objCurrentSalarySnapshot?: Record<string, unknown> | null;
  objFlexiAllocation?: {
    blnHasFlexiBasket?: boolean;
    decFlexiBasketAvailableAnnual?: number | null;
    decResidualTaxableAllowanceAnnual?: number | null;
    strResidualComponentName?: string | null;
    lstAvailableComponents?: Array<{
      intSalaryComponentID: number;
      strComponentCode?: string | null;
      strComponentName?: string | null;
    }>;
  } | null;
  lstComponentLines?: Array<Record<string, unknown>>;
  lstEligibilityQuestions?: FlexiEligibilityQuestionRecord[];
  objEligibilityAnswers?: Record<string, string | number | boolean | null>;
  lstDeclarationLines: FlexiDeclarationLineRecord[];
};

export type FlexiDeclarationHistoryRecord = {
  intDeclarationID: number;
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  strFinancialYearCode: string;
  strWorkflowStatus: string;
  dtSubmittedOn?: string | null;
  decDeclaredTotalAnnual: number;
  decApprovedTotalAnnual: number;
  intItemCount: number;
  strRemarks?: string | null;
};

export type HrFlexiDeclarationApprovePayload = {
  lstItems: Array<{
    intSalaryComponentID: number;
    decApprovedAmountAnnual: number;
    strRemarks?: string | null;
  }>;
  strRemarks?: string | null;
};

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

const strEssFlexiMenuAction = "ESS_FLEXI_PAY_DECLARATION";
const strPayrollFlexiMenuAction = "ESS_FLEXI_PAY_DECLARATION";

function buildSavePayload(
  strFinancialYearCode: string,
  lstItems: FlexiDeclarationItemPayload[],
  strRemarks?: string | null,
  objEligibilityAnswers?: Record<string, string | number | boolean | null>,
) {
  return {
    strFinancialYearCode,
    lstItems,
    objEligibilityAnswers: objEligibilityAnswers || {},
    strRemarks: strRemarks?.trim() || null,
  };
}

export const flexiPayDeclarationService = {
  async getCurrentDeclaration(strFinancialYearCode: string): Promise<FlexiDeclarationContextRecord> {
    const objResult = await requestApi<FlexiDeclarationContextRecord>({
      strPath: `/ess/flexi-declaration/current?financial_year_code=${encodeURIComponent(strFinancialYearCode)}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: strEssFlexiMenuAction,
    });
    return objResult.Data;
  },

  async saveDraft(
    strFinancialYearCode: string,
    lstItems: FlexiDeclarationItemPayload[],
    strRemarks?: string | null,
    objEligibilityAnswers?: Record<string, string | number | boolean | null>,
  ): Promise<FlexiDeclarationContextRecord> {
    const objResult = await requestApi<FlexiDeclarationContextRecord>({
      strPath: "/ess/flexi-declaration/save-draft",
      strMethod: ApiRequestMethod.Post,
      objBody: buildSavePayload(strFinancialYearCode, lstItems, strRemarks, objEligibilityAnswers),
      strMenuAction: strEssFlexiMenuAction,
    });
    return objResult.Data;
  },

  async submit(
    strFinancialYearCode: string,
    lstItems: FlexiDeclarationItemPayload[],
    strRemarks?: string | null,
    objEligibilityAnswers?: Record<string, string | number | boolean | null>,
  ): Promise<FlexiDeclarationContextRecord> {
    const objResult = await requestApi<FlexiDeclarationContextRecord>({
      strPath: "/ess/flexi-declaration/submit",
      strMethod: ApiRequestMethod.Post,
      objBody: buildSavePayload(strFinancialYearCode, lstItems, strRemarks, objEligibilityAnswers),
      strMenuAction: strEssFlexiMenuAction,
    });
    return objResult.Data;
  },

  async copyPreviousYear(strFinancialYearCode: string): Promise<FlexiDeclarationContextRecord> {
    const objResult = await requestApi<FlexiDeclarationContextRecord>({
      strPath: `/ess/flexi-declaration/copy-previous-year?financial_year_code=${encodeURIComponent(strFinancialYearCode)}`,
      strMethod: ApiRequestMethod.Post,
      strMenuAction: strEssFlexiMenuAction,
    });
    return objResult.Data;
  },

  async withdraw(strFinancialYearCode: string, strRemarks?: string | null): Promise<FlexiDeclarationContextRecord> {
    const objResult = await requestApi<FlexiDeclarationContextRecord>({
      strPath: `/ess/flexi-declaration/withdraw?financial_year_code=${encodeURIComponent(strFinancialYearCode)}`,
      strMethod: ApiRequestMethod.Post,
      objBody: { strRemarks: strRemarks?.trim() || null },
      strMenuAction: strEssFlexiMenuAction,
    });
    return objResult.Data;
  },

  async cancel(strFinancialYearCode: string, strRemarks?: string | null): Promise<FlexiDeclarationContextRecord> {
    const objResult = await requestApi<FlexiDeclarationContextRecord>({
      strPath: `/ess/flexi-declaration/cancel?financial_year_code=${encodeURIComponent(strFinancialYearCode)}`,
      strMethod: ApiRequestMethod.Post,
      objBody: { strRemarks: strRemarks?.trim() || null },
      strMenuAction: strEssFlexiMenuAction,
    });
    return objResult.Data;
  },

  async getHistory(): Promise<FlexiDeclarationHistoryRecord[]> {
    const objResult = await requestApi<FlexiDeclarationHistoryRecord[]>({
      strPath: "/ess/flexi-declaration/history",
      strMethod: ApiRequestMethod.Get,
      strMenuAction: strEssFlexiMenuAction,
    });
    return objResult.Data;
  },
};

export const hrFlexiDeclarationReviewService = {
  async getList(strWorkflowStatus = "submitted"): Promise<FlexiDeclarationHistoryRecord[]> {
    const objResult = await requestApi<FlexiDeclarationHistoryRecord[]>({
      strPath: `/hr/flexi-declarations?workflow_status=${encodeURIComponent(strWorkflowStatus)}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: strPayrollFlexiMenuAction,
    });
    return objResult.Data;
  },

  async getDetail(intDeclarationID: number): Promise<FlexiDeclarationContextRecord> {
    const objResult = await requestApi<FlexiDeclarationContextRecord>({
      strPath: `/hr/flexi-declarations/${intDeclarationID}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: strPayrollFlexiMenuAction,
    });
    return objResult.Data;
  },

  async approve(intDeclarationID: number, objPayload: HrFlexiDeclarationApprovePayload): Promise<FlexiDeclarationContextRecord> {
    const objResult = await requestApi<FlexiDeclarationContextRecord>({
      strPath: `/hr/flexi-declarations/${intDeclarationID}/approve`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: strPayrollFlexiMenuAction,
    });
    return objResult.Data;
  },

  async returnForCorrection(intDeclarationID: number, strRemarks: string): Promise<FlexiDeclarationContextRecord> {
    const objResult = await requestApi<FlexiDeclarationContextRecord>({
      strPath: `/hr/flexi-declarations/${intDeclarationID}/return`,
      strMethod: ApiRequestMethod.Post,
      objBody: { strRemarks },
      strMenuAction: strPayrollFlexiMenuAction,
    });
    return objResult.Data;
  },

  async reject(intDeclarationID: number, strRemarks: string): Promise<FlexiDeclarationContextRecord> {
    const objResult = await requestApi<FlexiDeclarationContextRecord>({
      strPath: `/hr/flexi-declarations/${intDeclarationID}/reject`,
      strMethod: ApiRequestMethod.Post,
      objBody: { strRemarks },
      strMenuAction: strPayrollFlexiMenuAction,
    });
    return objResult.Data;
  },

  async lock(intDeclarationID: number, strRemarks?: string | null): Promise<FlexiDeclarationContextRecord> {
    const objResult = await requestApi<FlexiDeclarationContextRecord>({
      strPath: `/hr/flexi-declarations/${intDeclarationID}/lock`,
      strMethod: ApiRequestMethod.Post,
      objBody: { strRemarks: strRemarks?.trim() || null },
      strMenuAction: strPayrollFlexiMenuAction,
    });
    return objResult.Data;
  },
};
