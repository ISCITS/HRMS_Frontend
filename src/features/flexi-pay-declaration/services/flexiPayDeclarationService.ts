"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi } from "@/Common/utils/apiErrorHandler";

type FlexiDeclarationItemPayload = {
  intSalaryComponentID: number;
  decDeclaredAmountAnnual: number;
  strRemarks?: string | null;
  objProof?: FlexiProofPayload | null;
  blnClearProof?: boolean;
};

export type FlexiProofPayload = {
  strFileName: string;
  strContentType: string;
  intFileSizeBytes: number;
  strBase64Content: string;
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
  intApplicableForWhichTaxRegime?: number | null;
  strComponentApplicableRegime?: string | null;
  strComponentApplicableRegimeLabel?: string | null;
  strEligibilityApplicableRegime?: string | null;
  strEligibilityApplicableRegimeLabel?: string | null;
  intPayslipSectionID?: number | null;
  strPayslipSection?: string | null;
  intLwpTreatmentID?: number | null;
  strLwpTreatment?: string | null;
  strLwpTreatmentCode?: string | null;
  intLwpReducedAmountHandlingID?: number | null;
  strLwpReducedAmountHandling?: string | null;
  strLwpReducedAmountHandlingCode?: string | null;
  blnIsLwpProrated?: boolean | null;
  strStructureApplicableRegime?: string | null;
  strApplicableRegime?: string | null;
  strEmployeeApplicableRegime?: string | null;
  strEmployeeTaxRegimeCode?: string | null;
  strEmployeeTaxRegimeLabel?: string | null;
  decAnnualLimit?: number | null;
  decMonthlyLimit?: number | null;
  decEffectiveAnnualCap?: number | null;
  decEffectiveMonthlyCap?: number | null;
  decEffectiveMultiplier?: number | null;
  decAllocationAnnual?: number | null;
  decAllocationMonthly?: number | null;
  blnProofRequired?: boolean | null;
  strTaxTreatment?: string | null;
  decBalanceAnnual?: number | null;
  decDraftDeclaredAnnual?: number | null;
  decDraftApprovedAnnual?: number | null;
  strDeclarationItemStatus?: string | null;
  strDeclarationItemRemarks?: string | null;
  strProofFileName?: string | null;
  strProofContentType?: string | null;
  intProofFileSizeBytes?: number | null;
  dtProofUploadedOn?: string | null;
  blnProofUploaded?: boolean | null;
  blnEligible?: boolean | null;
  blnRegimeEligible?: boolean | null;
  blnEligibilityDetailsSatisfied?: boolean | null;
  strEligibilityReason?: string | null;
  strEligibilityDetailsReason?: string | null;
  strRegimeEligibilityReason?: string | null;
  strIneligibleBehavior?: string | null;
  decMonthlyImpact?: number | null;
  lstEligibilityRules?: Record<string, unknown>[];
  lstRuleEvaluations?: Record<string, unknown>[];
  objRegimeEvaluation?: Record<string, unknown> | null;
};

export type FlexiSelectedTaxRegimeRecord = {
  intDeclarationID?: number | null;
  intTaxRegimeID?: number | null;
  strFinancialYearCode?: string | null;
  strTaxRegimeCode?: string | null;
  strTaxRegimeName?: string | null;
  strTaxRegimeLabel?: string | null;
  strApplicableRegime?: string | null;
  strDeclarationStatus?: string | null;
  blnIsSelected?: boolean | null;
};

export type FlexiEligibilityQuestionRecord = {
  strQuestionCode: string;
  strQuestionLabel: string;
  strAnswerType: "boolean" | "number" | "text" | "select";
  strHint?: string | null;
  strHelpText?: string | null;
  strGroupCode?: string | null;
  strGroupLabel?: string | null;
  strValueUnit?: string | null;
  decMinValue?: number | null;
  decMaxValue?: number | null;
  blnIsRequired?: boolean | null;
  blnIsEmployeeEditable?: boolean | null;
  blnIsDisabled?: boolean | null;
  blnShowInfoIcon?: boolean | null;
  strDisabledReason?: string | null;
  strInfoMessage?: string | null;
  strApplicableRegime?: string | null;
  lstLinkedComponentIDs?: number[];
  objOptionJson?: unknown;
  objAnswerValue?: string | number | boolean | null;
  blnAnswerValid?: boolean | null;
  strValidationMessage?: string | null;
  decEffectiveMultiplier?: number | null;
};

export type FlexiDeclarationContextRecord = {
  strFinancialYearCode: string;
  objDeclaration?: FlexiDeclarationRecord | null;
  objSelectedTaxRegime?: FlexiSelectedTaxRegimeRecord | null;
  strTaxRegime?: string | null;
  strTaxRegimeCode?: string | null;
  strSelectedTaxRegime?: string | null;
  blnCanDeclare: boolean;
  strIneligibilityReason?: string | null;
  objEmployeeSummary?: {
    intEmployeeID: number;
    strEmployeeCode?: string | null;
    strEmployeeName?: string | null;
  } | null;
  objAssignedStructure?: {
    intSalaryStructureID?: number | null;
    strStructureName?: string | null;
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
  salary_impact_summary?: {
    decAnnualCtc?: number | null;
    decGrossMonthly?: number | null;
    decFlexiBasketAvailableAnnual?: number | null;
    decDeclaredFlexiAnnual?: number | null;
    decResidualTaxableBalanceAnnual?: number | null;
    objResidualComponent?: {
      strComponentCode?: string | null;
      strComponentName?: string | null;
    } | null;
    decEstimatedMonthlyPayrollImpact?: number | null;
  } | null;
  validation_messages?: string[];
  eligible_components?: FlexiDeclarationLineRecord[];
  ineligible_components_with_reason?: FlexiDeclarationLineRecord[];
  history_count?: number | null;
  declaration_status?: string | null;
  blnHasHiddenComponents?: boolean | null;
  blnHasEligibilityQuestions?: boolean | null;
  strEligibilityQuestionsMessage?: string | null;
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

export type FlexiDeclarationSummaryRecord = {
  strFinancialYearCode: string;
  blnCanDeclare: boolean;
  strIneligibilityReason?: string | null;
  objDeclaration?: FlexiDeclarationRecord | null;
  objEmployeeSummary?: {
    intEmployeeID: number;
    strEmployeeCode?: string | null;
    strEmployeeName?: string | null;
  } | null;
  objAssignedStructure?: {
    intSalaryStructureID?: number | null;
    strSalaryStructureName?: string | null;
    strCurrencyCode?: string | null;
    dtEffectiveFrom?: string | null;
  } | null;
  objFlexiAllocation?: {
    blnHasFlexiBasket?: boolean;
    decFlexiBasketAvailableAnnual?: number | null;
    decResidualTaxableAllowanceAnnual?: number | null;
    strResidualComponentName?: string | null;
  } | null;
  decDeclaredFlexiAnnual?: number | null;
  decResidualTaxableBalanceAnnual?: number | null;
  intHistoryCount?: number | null;
  intItemCount?: number | null;
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
  async getCurrentSummary(strFinancialYearCode: string): Promise<FlexiDeclarationSummaryRecord> {
    const objResult = await requestApi<FlexiDeclarationSummaryRecord>({
      strPath: `/ess/flexi-declaration/summary?financial_year_code=${encodeURIComponent(strFinancialYearCode)}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: strEssFlexiMenuAction,
    });
    return objResult.Data;
  },

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

  async evaluate(
    strFinancialYearCode: string,
    lstItems: FlexiDeclarationItemPayload[],
    strRemarks?: string | null,
    objEligibilityAnswers?: Record<string, string | number | boolean | null>,
  ): Promise<FlexiDeclarationContextRecord> {
    const objResult = await requestApi<FlexiDeclarationContextRecord>({
      strPath: "/ess/flexi-declaration/evaluate",
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

  async release(intDeclarationID: number, strRemarks?: string | null): Promise<FlexiDeclarationContextRecord> {
    const objResult = await requestApi<FlexiDeclarationContextRecord>({
      strPath: `/hr/flexi-declarations/${intDeclarationID}/release`,
      strMethod: ApiRequestMethod.Post,
      objBody: { strRemarks: strRemarks?.trim() || null },
      strMenuAction: strPayrollFlexiMenuAction,
    });
    return objResult.Data;
  },
};
