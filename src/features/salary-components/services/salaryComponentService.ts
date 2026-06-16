import { masterApiService, type SalaryComponentApiRecord } from "@/services/master/MasterApiService";
import type {
  SalaryComponentDetailRecord,
  SalaryComponentFormOptions,
  SalaryComponentFormValues,
  SalaryComponentListRecord,
  SalaryComponentTextFormValue
} from "@/features/salary-components/types";

let intRowIDSequence = 0;

function createRowID() {
  intRowIDSequence += 1;
  return `salary-component-text-row-${intRowIDSequence}`;
}

function formatOptionalText(strValue: string) {
  const strTrimmedValue = strValue.trim();
  return strTrimmedValue ? strTrimmedValue : null;
}

function isReimbursementCategory(strValue: string) {
  return strValue.trim().toLowerCase().replace(/[\s_-]+/g, "") === "reimbursement";
}

function normalizeIntegerList(lstValues: Array<number | string>) {
  return Array.from(
    new Set(
      lstValues
        .map((objValue) => Number(objValue))
        .filter((intValue) => Number.isInteger(intValue) && intValue > 0)
    )
  );
}

function sanitizeDependencyIDs(
  lstValues: Array<number | string>,
  intSalaryComponentID?: number
) {
  return normalizeIntegerList(lstValues).filter(
    (intValue) => !intSalaryComponentID || intValue !== intSalaryComponentID
  );
}

function mapApiRecord(dicRecord: SalaryComponentApiRecord): SalaryComponentDetailRecord {
  const lstDependencyComponentIDs = sanitizeDependencyIDs(
    dicRecord.lstDependencyComponentIDs ?? [],
    dicRecord.intID
  );
  return {
    intID: dicRecord.intID,
    strComponentCode: dicRecord.strComponentCode,
    strComponentName: dicRecord.strComponentName,
    blnIsWages: Boolean(dicRecord.blnIsWages),
    strComponentDescription: dicRecord.strComponentDescription ?? null,
    strComponentCategory: dicRecord.strComponentCategory,
    strComponentGroup: dicRecord.strComponentGroup ?? null,
    strCalcMethod: dicRecord.strCalcMethod,
    strFormulaExpression: dicRecord.strFormulaExpression,
    strRoundingRule: dicRecord.strRoundingRule,
    strDefaultPeriodicity: dicRecord.strDefaultPeriodicity,
    strTaxTreatment: dicRecord.strTaxTreatment,
    blnIncludeInPF: Boolean(dicRecord.blnIncludeInPF),
    blnIncludeInESIC: Boolean(dicRecord.blnIncludeInESIC),
    blnIncludeInGratuity: Boolean(dicRecord.blnIncludeInGratuity),
    blnIncludeInRemuneration: Boolean(dicRecord.blnIncludeInRemuneration ?? true),
    blnIncludeInTaxableIncome: Boolean(dicRecord.blnIncludeInTaxableIncome ?? true),
    blnIncludedInCtc: Boolean(dicRecord.blnIncludedInCtc ?? true),
    blnIncludeInPayslip: Boolean(dicRecord.blnIncludeInPayslip ?? true),
    strPayslipSection: dicRecord.strPayslipSection ?? null,
    intDisplayOrder: Number(dicRecord.intDisplayOrder ?? 10),
    blnIsReimbursement: Boolean(dicRecord.blnIsReimbursement),
    blnIsFlexiBenefit: Boolean(dicRecord.blnIsFlexiBenefit),
    blnIsFlexiBasket: Boolean(dicRecord.blnIsFlexiBasket),
    strFlexiComponentType: dicRecord.strFlexiComponentType ?? null,
    strReimbursementType: dicRecord.strReimbursementType ?? null,
    strSettlementMethod: dicRecord.strSettlementMethod ?? null,
    blnRequiresBills: Boolean(dicRecord.blnRequiresBills),
    blnExpenseDateRequired: Boolean(dicRecord.blnExpenseDateRequired ?? true),
    blnAllowPartialApproval: Boolean(dicRecord.blnAllowPartialApproval ?? dicRecord.blnAllowExcessClaim),
    decAnnualLimitAmount: dicRecord.decAnnualLimitAmount ?? null,
    decMonthlyLimitAmount: dicRecord.decMonthlyLimitAmount ?? null,
    strClaimLimitType: dicRecord.strClaimLimitType ?? null,
    blnAllowExcessClaim: Boolean(dicRecord.blnAllowExcessClaim),
    blnExcessClaimTaxable: Boolean(dicRecord.blnExcessClaimTaxable),
    intResidualComponentID: dicRecord.intResidualComponentID ?? null,
    blnAutoPushToPayroll: Boolean(dicRecord.blnAutoPushToPayroll),
    blnFinanceSettlementRequired: Boolean(dicRecord.blnFinanceSettlementRequired),
    intUsedInSalaryStructures: Number(dicRecord.intUsedInSalaryStructures ?? 0),
    intAssignedEmployees: Number(dicRecord.intAssignedEmployees ?? 0),
    intFormulaReferences: Number(dicRecord.intFormulaReferences ?? 0),
    blnIsEmployerContribution: Boolean(dicRecord.blnIsEmployerContribution),
    blnIsEmployeeDeduction: Boolean(dicRecord.blnIsEmployeeDeduction),
    blnDeclarationRequired: Boolean(dicRecord.blnDeclarationRequired),
    blnProofRequired: Boolean(dicRecord.blnProofRequired),
    blnAllowManualOverride: Boolean(dicRecord.blnAllowManualOverride),
    blnIsActive: Boolean(dicRecord.blnIsActive),
    intDependencyCount: lstDependencyComponentIDs.length,
    lstDependencyComponentIDs,
    lstTexts: (dicRecord.lstTexts ?? []).map((dicText) => ({
      intLanguageID: dicText.intLanguageID,
      strLanguageName: dicText.strLanguageName,
      strComponentName: dicText.strComponentName,
      strComponentDescription: dicText.strComponentDescription
    })),
    lstDependencyComponents: dicRecord.lstDependencyComponents ?? []
  };
}

export function createEmptySalaryComponentTextRow(): SalaryComponentTextFormValue {
  return {
    strRowID: createRowID(),
    intLanguageID: "",
    strLanguageName: "",
    strComponentName: "",
    strComponentDescription: ""
  };
}

export function createInitialSalaryComponentForm(): SalaryComponentFormValues {
  return {
    strComponentCode: "",
    strComponentName: "",
    strComponentDescription: "",
    blnIsWages: true,
    strComponentCategory: "",
    strComponentGroup: "",
    strCalcMethod: "fixed",
    strFormulaExpression: "",
    strRoundingRule: "",
    strDefaultPeriodicity: "monthly",
    strTaxTreatment: "",
    blnIncludeInPF: false,
    blnIncludeInESIC: false,
    blnIncludeInGratuity: false,
    blnIncludeInRemuneration: true,
    blnIncludeInTaxableIncome: true,
    blnIncludedInCtc: true,
    blnIncludeInPayslip: true,
    strPayslipSection: "Earnings",
    strDisplayOrder: "10",
    blnIsFlexiBenefit: false,
    blnIsReimbursement: false,
    strReimbursementType: "none",
    strSettlementMethod: "none",
    blnRequiresBills: false,
    blnExpenseDateRequired: true,
    blnAllowPartialApproval: true,
    strClaimLimitType: "none",
    strAnnualLimitAmount: "",
    strMonthlyLimitAmount: "",
    blnAllowExcessClaim: false,
    blnExcessClaimTaxable: false,
    intResidualComponentID: "",
    blnAutoPushToPayroll: false,
    blnFinanceSettlementRequired: false,
    blnIsEmployerContribution: false,
    blnIsEmployeeDeduction: false,
    blnDeclarationRequired: false,
    blnProofRequired: false,
    blnAllowManualOverride: true,
    blnIsActive: true,
    lstDependencyComponentIDs: [],
    lstTexts: [createEmptySalaryComponentTextRow()]
  };
}

export function toSalaryComponentFormValues(dicRecord: SalaryComponentDetailRecord): SalaryComponentFormValues {
  return {
    strComponentCode: dicRecord.strComponentCode,
    strComponentName: dicRecord.strComponentName,
    strComponentDescription: dicRecord.strComponentDescription ?? "",
    blnIsWages: Boolean(dicRecord.blnIsWages),
    strComponentCategory: dicRecord.strComponentCategory,
    strComponentGroup: dicRecord.strComponentGroup ?? "",
    strCalcMethod: dicRecord.strCalcMethod,
    strFormulaExpression: dicRecord.strFormulaExpression ?? "",
    strRoundingRule: dicRecord.strRoundingRule ?? "",
    strDefaultPeriodicity: dicRecord.strDefaultPeriodicity,
    strTaxTreatment: dicRecord.strTaxTreatment ?? "",
    blnIncludeInPF: Boolean(dicRecord.blnIncludeInPF),
    blnIncludeInESIC: Boolean(dicRecord.blnIncludeInESIC),
    blnIncludeInGratuity: Boolean(dicRecord.blnIncludeInGratuity),
    blnIncludeInRemuneration: Boolean(dicRecord.blnIncludeInRemuneration),
    blnIncludeInTaxableIncome: Boolean(dicRecord.blnIncludeInTaxableIncome),
    blnIncludedInCtc: Boolean(dicRecord.blnIncludedInCtc),
    blnIncludeInPayslip: Boolean(dicRecord.blnIncludeInPayslip),
    strPayslipSection: dicRecord.strPayslipSection ?? "",
    strDisplayOrder: String(dicRecord.intDisplayOrder ?? 10),
    blnIsFlexiBenefit: Boolean(dicRecord.blnIsFlexiBenefit),
    blnIsReimbursement: Boolean(dicRecord.blnIsReimbursement),
    strReimbursementType: (dicRecord.strReimbursementType as SalaryComponentFormValues["strReimbursementType"]) ?? "none",
    strSettlementMethod: (dicRecord.strSettlementMethod as SalaryComponentFormValues["strSettlementMethod"]) ?? "none",
    blnRequiresBills: Boolean(dicRecord.blnRequiresBills),
    blnExpenseDateRequired: Boolean(dicRecord.blnExpenseDateRequired ?? true),
    blnAllowPartialApproval: Boolean(dicRecord.blnAllowPartialApproval ?? dicRecord.blnAllowExcessClaim),
    strClaimLimitType: (dicRecord.strClaimLimitType as SalaryComponentFormValues["strClaimLimitType"]) ?? "none",
    strAnnualLimitAmount: dicRecord.decAnnualLimitAmount != null ? String(dicRecord.decAnnualLimitAmount) : "",
    strMonthlyLimitAmount: dicRecord.decMonthlyLimitAmount != null ? String(dicRecord.decMonthlyLimitAmount) : "",
    blnAllowExcessClaim: Boolean(dicRecord.blnAllowExcessClaim),
    blnExcessClaimTaxable: Boolean(dicRecord.blnExcessClaimTaxable),
    intResidualComponentID: dicRecord.intResidualComponentID ?? "",
    blnAutoPushToPayroll: Boolean(dicRecord.blnAutoPushToPayroll),
    blnFinanceSettlementRequired: Boolean(dicRecord.blnFinanceSettlementRequired),
    blnIsEmployerContribution: Boolean(dicRecord.blnIsEmployerContribution),
    blnIsEmployeeDeduction: Boolean(dicRecord.blnIsEmployeeDeduction),
    blnDeclarationRequired: Boolean(dicRecord.blnDeclarationRequired),
    blnProofRequired: Boolean(dicRecord.blnProofRequired),
    blnAllowManualOverride: Boolean(dicRecord.blnAllowManualOverride),
    blnIsActive: Boolean(dicRecord.blnIsActive),
    lstDependencyComponentIDs: dicRecord.lstDependencyComponentIDs,
    lstTexts: dicRecord.lstTexts.length > 0
      ? dicRecord.lstTexts.map((dicText) => ({
          strRowID: createRowID(),
          intLanguageID: dicText.intLanguageID,
          strLanguageName: dicText.strLanguageName,
          strComponentName: dicText.strComponentName,
          strComponentDescription: dicText.strComponentDescription ?? ""
        }))
      : [createEmptySalaryComponentTextRow()]
  };
}

function toPayload(dicValues: SalaryComponentFormValues, intSalaryComponentID?: number) {
  const blnIsReimbursement = dicValues.blnIsReimbursement || isReimbursementCategory(dicValues.strComponentCategory);
  const blnIsFlexiReimbursement = isReimbursementCategory(dicValues.strComponentCategory) && dicValues.blnIsFlexiBenefit;
  const decAnnualLimitAmount = dicValues.strAnnualLimitAmount.trim() ? Number(dicValues.strAnnualLimitAmount) : null;
  const decMonthlyLimitAmount = dicValues.strMonthlyLimitAmount.trim() ? Number(dicValues.strMonthlyLimitAmount) : null;
  const strClaimLimitType =
    decMonthlyLimitAmount != null && decAnnualLimitAmount != null
      ? "both"
      : decMonthlyLimitAmount != null
        ? "monthly"
        : decAnnualLimitAmount != null
          ? "yearly"
          : dicValues.strClaimLimitType;
  return {
    strComponentCode: dicValues.strComponentCode.trim(),
    strComponentName: dicValues.strComponentName.trim(),
    strComponentDescription: formatOptionalText(dicValues.strComponentDescription),
    blnIsWages: dicValues.blnIsWages,
    strComponentCategory: dicValues.strComponentCategory.trim(),
    strComponentGroup: formatOptionalText(dicValues.strComponentGroup),
    strCalcMethod: dicValues.strCalcMethod.trim(),
    strFormulaExpression: formatOptionalText(dicValues.strFormulaExpression),
    strRoundingRule: formatOptionalText(dicValues.strRoundingRule),
    strDefaultPeriodicity: dicValues.strDefaultPeriodicity.trim(),
    strTaxTreatment: formatOptionalText(dicValues.strTaxTreatment),
    blnIncludeInPF: dicValues.blnIncludeInPF,
    blnIncludeInESIC: dicValues.blnIncludeInESIC,
    blnIncludeInGratuity: dicValues.blnIncludeInGratuity,
    blnIncludeInRemuneration: dicValues.blnIncludeInRemuneration,
    blnIncludeInTaxableIncome: dicValues.blnIncludeInTaxableIncome,
    blnIncludedInCtc: dicValues.blnIncludedInCtc,
    blnIncludeInPayslip: dicValues.blnIncludeInPayslip,
    strPayslipSection: formatOptionalText(dicValues.strPayslipSection),
    intDisplayOrder: Number(dicValues.strDisplayOrder) || 10,
    blnIsFlexiBenefit: dicValues.blnIsFlexiBenefit,
    blnIsReimbursement: blnIsReimbursement,
    strReimbursementType: blnIsReimbursement ? (blnIsFlexiReimbursement ? "ctc_based" : dicValues.strReimbursementType) : "none",
    strSettlementMethod: blnIsReimbursement || dicValues.blnIsFlexiBenefit ? (blnIsReimbursement ? "payroll" : dicValues.strSettlementMethod) : "none",
    blnRequiresBills: dicValues.blnRequiresBills,
    blnExpenseDateRequired: dicValues.blnExpenseDateRequired,
    decAnnualLimitAmount,
    decMonthlyLimitAmount,
    strClaimLimitType,
    blnAllowPartialApproval: dicValues.blnAllowPartialApproval,
    blnAllowExcessClaim: false,
    blnExcessClaimTaxable: false,
    intResidualComponentID: blnIsReimbursement ? null : (dicValues.intResidualComponentID === "" ? null : Number(dicValues.intResidualComponentID)),
    blnAutoPushToPayroll: dicValues.blnAutoPushToPayroll,
    blnFinanceSettlementRequired: dicValues.blnFinanceSettlementRequired,
    decReimbursementMaxClaimMonthlyLimit:
      blnIsReimbursement && (strClaimLimitType === "monthly" || strClaimLimitType === "both")
        ? decMonthlyLimitAmount
        : null,
    decReimbursementMaxClaimYearlyLimit:
      blnIsReimbursement && (strClaimLimitType === "yearly" || strClaimLimitType === "both")
        ? decAnnualLimitAmount
        : null,
    blnIsEmployerContribution: dicValues.blnIsEmployerContribution,
    blnIsEmployeeDeduction: dicValues.blnIsEmployeeDeduction,
    blnDeclarationRequired: dicValues.blnDeclarationRequired,
    blnProofRequired: dicValues.blnProofRequired,
    blnAllowManualOverride: dicValues.blnAllowManualOverride,
    blnIsActive: dicValues.blnIsActive,
    intLanguageID: Number(dicValues.lstTexts[0]?.intLanguageID || 1),
    lstDependencyComponentIDs: sanitizeDependencyIDs(
      dicValues.lstDependencyComponentIDs,
      intSalaryComponentID
    ),
    lstTexts: dicValues.lstTexts
      .filter((dicText) => dicText.intLanguageID !== "" && dicText.strComponentName.trim())
      .map((dicText) => ({
        intLanguageID: Number(dicText.intLanguageID),
        strComponentName: dicText.strComponentName.trim(),
        strComponentDescription: formatOptionalText(dicText.strComponentDescription)
      }))
  };
}

export const salaryComponentService = {
  async getSalaryComponents(): Promise<SalaryComponentListRecord[]> {
    const objResult = await masterApiService.getSalaryComponents();
    return objResult.Data.map((dicRecord) => {
      const dicDetail = mapApiRecord(dicRecord);
      return {
        intID: dicDetail.intID,
        strComponentCode: dicDetail.strComponentCode,
        strComponentName: dicDetail.strComponentName,
        blnIsWages: dicDetail.blnIsWages,
        strComponentCategory: dicDetail.strComponentCategory,
        strComponentGroup: dicDetail.strComponentGroup,
        strCalcMethod: dicDetail.strCalcMethod,
        strRoundingRule: dicDetail.strRoundingRule,
        strDefaultPeriodicity: dicDetail.strDefaultPeriodicity,
        strTaxTreatment: dicDetail.strTaxTreatment,
        blnIncludeInPF: dicDetail.blnIncludeInPF,
        blnIncludeInESIC: dicDetail.blnIncludeInESIC,
        blnIncludeInGratuity: dicDetail.blnIncludeInGratuity,
        blnIncludeInRemuneration: dicDetail.blnIncludeInRemuneration,
        blnIncludeInTaxableIncome: dicDetail.blnIncludeInTaxableIncome,
        blnIncludedInCtc: dicDetail.blnIncludedInCtc,
        blnIncludeInPayslip: dicDetail.blnIncludeInPayslip,
        strPayslipSection: dicDetail.strPayslipSection,
        intDisplayOrder: dicDetail.intDisplayOrder,
        blnIsReimbursement: dicDetail.blnIsReimbursement,
        blnIsFlexiBenefit: dicDetail.blnIsFlexiBenefit,
        blnIsFlexiBasket: Boolean(dicDetail.blnIsFlexiBasket),
        strFlexiComponentType: dicDetail.strFlexiComponentType,
        strReimbursementType: dicDetail.strReimbursementType,
        strSettlementMethod: dicDetail.strSettlementMethod,
        blnRequiresBills: dicDetail.blnRequiresBills,
        blnExpenseDateRequired: Boolean(dicDetail.blnExpenseDateRequired),
        blnAllowPartialApproval: Boolean(dicDetail.blnAllowPartialApproval),
        decAnnualLimitAmount: dicDetail.decAnnualLimitAmount,
        decMonthlyLimitAmount: dicDetail.decMonthlyLimitAmount,
        strClaimLimitType: dicDetail.strClaimLimitType,
        blnAllowExcessClaim: dicDetail.blnAllowExcessClaim,
        blnExcessClaimTaxable: dicDetail.blnExcessClaimTaxable,
        intResidualComponentID: dicDetail.intResidualComponentID,
        blnAutoPushToPayroll: dicDetail.blnAutoPushToPayroll,
        blnFinanceSettlementRequired: dicDetail.blnFinanceSettlementRequired,
        blnIsEmployerContribution: dicDetail.blnIsEmployerContribution,
        blnIsEmployeeDeduction: dicDetail.blnIsEmployeeDeduction,
        blnDeclarationRequired: dicDetail.blnDeclarationRequired,
        blnProofRequired: dicDetail.blnProofRequired,
        blnAllowManualOverride: dicDetail.blnAllowManualOverride,
        blnIsActive: dicDetail.blnIsActive,
        intDependencyCount: dicDetail.intDependencyCount
      };
    });
  },

  async getSalaryComponentById(intSalaryComponentID: number): Promise<SalaryComponentDetailRecord> {
    const objResult = await masterApiService.getSalaryComponent(intSalaryComponentID);
    return mapApiRecord(objResult.Data);
  },

  async getFormOptions(): Promise<SalaryComponentFormOptions> {
    const objResult = await masterApiService.getSalaryComponentFormOptions();
    return {
      ...objResult.Data,
      lstResidualComponents: objResult.Data.lstResidualComponents ?? [],
      lstReimbursementTypes: objResult.Data.lstReimbursementTypes ?? [],
      lstSettlementMethods: objResult.Data.lstSettlementMethods ?? [],
      lstClaimLimitTypes: objResult.Data.lstClaimLimitTypes ?? [],
    };
  },

  async createSalaryComponent(dicValues: SalaryComponentFormValues): Promise<SalaryComponentDetailRecord> {
    const objResult = await masterApiService.createSalaryComponent(toPayload(dicValues));
    return mapApiRecord(objResult.Data);
  },

  async updateSalaryComponent(intSalaryComponentID: number, dicValues: SalaryComponentFormValues): Promise<SalaryComponentDetailRecord> {
    const objResult = await masterApiService.updateSalaryComponent(
      intSalaryComponentID,
      toPayload(dicValues, intSalaryComponentID)
    );
    return mapApiRecord(objResult.Data);
  },

  async translateSalaryComponentText(strText: string, intSourceLanguageID: number, intTargetLanguageID: number) {
    const objResult = await masterApiService.translateMasterText({
      strText,
      intSourceLanguageID,
      intTargetLanguageID,
    });
    return objResult.Data.strTranslatedText;
  },

  async setSalaryComponentStatus(intSalaryComponentID: number, blnIsActive: boolean): Promise<SalaryComponentDetailRecord> {
    const objResult = await masterApiService.setSalaryComponentStatus(intSalaryComponentID, blnIsActive);
    return mapApiRecord(objResult.Data);
  },

  async bulkSalaryComponentStatus(lstIDs: number[], blnIsActive: boolean): Promise<void> {
    await masterApiService.bulkSalaryComponentStatus(lstIDs, blnIsActive);
  },

  async deleteSalaryComponent(intSalaryComponentID: number): Promise<void> {
    await masterApiService.deleteSalaryComponent(intSalaryComponentID);
  },

  async bulkDeleteSalaryComponents(lstIDs: number[]): Promise<void> {
    await masterApiService.bulkSalaryComponentDelete(lstIDs);
  }
};
