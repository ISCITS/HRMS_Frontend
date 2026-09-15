export type ItDeclarationFlowStatus = "NOT_STARTED" | "REGIME_SELECTED" | "IN_PROGRESS" | "SUBMITTED";
export type ItDeclarationRegime = "Old Regime" | "New Regime";

export type ItDeclarationItemDto = {
  intItemID?: number | null;
  intCategoryID: number;
  strSection: string;
  strDescription: string;
  strMaxLimit: string;
  decDeclaredAmount: number;
  strInvestmentName: string;
  strStatus: "Completed" | "In Progress" | "Not Started";
};

export type ItDeclarationSummaryDto = {
  decGrossSalary: number;
  decDeclaredTotal: number;
  decTaxableIncome: number;
  decOldTax: number;
  decNewTax: number;
  decSavings: number;
  strRecommendedRegime: ItDeclarationRegime;
};

export type ItDeclarationDetailDto = {
  intDeclarationID: number | null;
  strFlowStatus: ItDeclarationFlowStatus;
  strSelectedRegime: ItDeclarationRegime | "";
  strLastUpdated: string;
  lstItems: ItDeclarationItemDto[];
  objSummary: ItDeclarationSummaryDto;
};

export type StartItDeclarationRequest = {
  strFinancialYearCode: string;
  strRegime: ItDeclarationRegime;
};

export type SaveItDeclarationItemRequest = {
  intCategoryID: number;
  strInvestmentName: string;
  decDeclaredAmount: number;
};

