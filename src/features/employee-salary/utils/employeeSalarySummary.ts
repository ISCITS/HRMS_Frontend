"use client";

type EmployeeSalarySummaryComponentLine = {
  strComponentCode?: string | null;
  strComponentName?: string | null;
  strComponentCategory?: string | null;
  blnIsFlexiBenefit?: boolean;
  blnIsFlexiBasket?: boolean;
  blnIncludedInCtc?: boolean;
  decAmountMonthly?: number | null;
  decAmountAnnual?: number | null;
};

type EmployeeSalarySummarySource = {
  lstComponentLines?: EmployeeSalarySummaryComponentLine[];
  objCurrentSalarySnapshot?: {
    decFlexiBasketAnnualAmount?: number | null;
  } | null;
  objFlexiAllocation?: {
    blnHasFlexiBasket?: boolean;
    decFlexiBasketAvailableAnnual?: number | null;
    decFlexiBasketAvailableMonthly?: number | null;
    decBalanceFlexiAnnual?: number | null;
    decAllocatedFlexiAnnual?: number | null;
    strResidualComponentName?: string | null;
  } | null;
};

export type EmployeeSalaryBaseSummaryMetrics = {
  blnHasFlexiBucket: boolean;
  decAnnualCtc: number;
  decGrossMonthly: number;
  decBasicAnnual: number;
  decHraAnnual: number;
  decEmployerContributionAnnual: number;
  decFlexiBucketAnnual: number;
  decFlexiBucketMonthly: number;
  strResidualComponentName: string;
};

export type EmployeeSalaryFixedRow = {
  strLabel: string;
  decAnnual: number;
};

function getNumberValue(objValue: number | string | null | undefined) {
  if (objValue === null || typeof objValue === "undefined" || objValue === "") {
    return 0;
  }
  const decValue = typeof objValue === "number" ? objValue : Number(String(objValue).replace(/,/g, ""));
  return Number.isFinite(decValue) ? decValue : 0;
}

function normalizeSelectToken(strValue: string | null | undefined) {
  return String(strValue || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function isFlexiPayComponentName(strValue: string) {
  const strToken = normalizeSelectToken(strValue);
  return strToken === "flexipay" || strToken === "flexibucket";
}

function isResidualTaxableComponentName(strValue: string) {
  return normalizeSelectToken(strValue).includes("residualtaxable");
}

function isBasicComponentName(strValue: string) {
  return normalizeSelectToken(strValue).includes("basic");
}

function isHraComponentName(strValue: string) {
  const strToken = normalizeSelectToken(strValue);
  return strToken === "hra" || strToken.includes("houserentallowance");
}

function isEmployerPfComponent(dicLine: Pick<EmployeeSalarySummaryComponentLine, "strComponentName" | "strComponentCode" | "strComponentCategory">) {
  const strName = normalizeSelectToken(dicLine.strComponentName ?? dicLine.strComponentCode ?? "");
  const strCategory = normalizeSelectToken(dicLine.strComponentCategory ?? "");
  return strName.includes("pf") && (strName.includes("employer") || strCategory.includes("employer"));
}

function isEmployerContributionCategory(strCategory: string | null | undefined) {
  return normalizeSelectToken(strCategory ?? "").includes("employer");
}

function isDeductionCategory(strCategory: string | null | undefined) {
  return normalizeSelectToken(strCategory ?? "").includes("deduction");
}

function isInformationCategory(strCategory: string | null | undefined) {
  return normalizeSelectToken(strCategory ?? "").includes("information");
}

function isFlexiBucketLine(dicLine: Pick<EmployeeSalarySummaryComponentLine, "blnIsFlexiBasket" | "strComponentCode" | "strComponentName">) {
  return Boolean(
    dicLine.blnIsFlexiBasket ||
    isFlexiPayComponentName(dicLine.strComponentName ?? dicLine.strComponentCode ?? "")
  );
}

function isFlexiAllocationLine(dicLine: Pick<EmployeeSalarySummaryComponentLine, "blnIsFlexiBenefit" | "strComponentCode" | "strComponentCategory" | "strComponentName">) {
  const strCategory = normalizeSelectToken(dicLine.strComponentCategory ?? "");
  const strCode = normalizeSelectToken(dicLine.strComponentCode ?? "");
  return Boolean(
    dicLine.blnIsFlexiBenefit ||
    strCategory.includes("reimbursement") ||
    strCode.includes("flexi")
  ) && !isFlexiBucketLine(dicLine);
}

function isNonCtcReimbursementLine(dicLine: Pick<EmployeeSalarySummaryComponentLine, "blnIncludedInCtc" | "strComponentCategory" | "blnIsFlexiBasket" | "strComponentCode" | "strComponentName">) {
  const strCategory = normalizeSelectToken(dicLine.strComponentCategory ?? "");
  return strCategory.includes("reimbursement") && dicLine.blnIncludedInCtc === false && !isFlexiBucketLine(dicLine);
}

function isCtcIncludedEarning(dicLine: EmployeeSalarySummaryComponentLine) {
  return !isFlexiBucketLine(dicLine) &&
    !isFlexiAllocationLine(dicLine) &&
    !isResidualTaxableComponentName(dicLine.strComponentName ?? dicLine.strComponentCode ?? "") &&
    !isEmployerContributionCategory(dicLine.strComponentCategory) &&
    !isDeductionCategory(dicLine.strComponentCategory) &&
    !isInformationCategory(dicLine.strComponentCategory) &&
    !isNonCtcReimbursementLine(dicLine) &&
    dicLine.blnIncludedInCtc !== false;
}

function getEmployeeFlexiBucketAmounts(objSource: EmployeeSalarySummarySource | null) {
  const decAnnualAmount =
    getNumberValue(objSource?.objFlexiAllocation?.decFlexiBasketAvailableAnnual) ||
    getNumberValue(objSource?.objCurrentSalarySnapshot?.decFlexiBasketAnnualAmount) ||
    getNumberValue(objSource?.objFlexiAllocation?.decBalanceFlexiAnnual) + getNumberValue(objSource?.objFlexiAllocation?.decAllocatedFlexiAnnual);
  const decMonthlyAmount =
    getNumberValue(objSource?.objFlexiAllocation?.decFlexiBasketAvailableMonthly) ||
    (decAnnualAmount > 0 ? decAnnualAmount / 12 : 0);
  return {
    decAnnualAmount,
    decMonthlyAmount,
  };
}

export function calculateEmployeeSalaryBaseSummaryMetrics(objSource: EmployeeSalarySummarySource | null): EmployeeSalaryBaseSummaryMetrics {
  const lstComponentLines = objSource?.lstComponentLines ?? [];
  const { decAnnualAmount: decFlexiBucketAnnual, decMonthlyAmount: decFlexiBucketMonthly } = getEmployeeFlexiBucketAmounts(objSource);
  const decEmployerContributionAnnual = lstComponentLines.reduce((decTotal, dicLine) => {
    if (!isEmployerContributionCategory(dicLine.strComponentCategory) && !isEmployerPfComponent(dicLine)) {
      return decTotal;
    }
    if (dicLine.blnIncludedInCtc === false) {
      return decTotal;
    }
    return decTotal + getNumberValue(dicLine.decAmountAnnual);
  }, 0);
  const decCtcIncludedEarningsAnnual = lstComponentLines.reduce((decTotal, dicLine) => (
    isCtcIncludedEarning(dicLine) ? decTotal + getNumberValue(dicLine.decAmountAnnual) : decTotal
  ), 0);
  const decPayableEarningsMonthly = lstComponentLines.reduce((decTotal, dicLine) => {
    if (!isCtcIncludedEarning(dicLine)) {
      return decTotal;
    }
    return decTotal + getNumberValue(dicLine.decAmountMonthly);
  }, 0);
  const decBasicAnnual = lstComponentLines.reduce((decTotal, dicLine) => (
    isBasicComponentName(dicLine.strComponentName ?? dicLine.strComponentCode ?? "")
      ? decTotal + getNumberValue(dicLine.decAmountAnnual)
      : decTotal
  ), 0);
  const decHraAnnual = lstComponentLines.reduce((decTotal, dicLine) => (
    isHraComponentName(dicLine.strComponentName ?? dicLine.strComponentCode ?? "")
      ? decTotal + getNumberValue(dicLine.decAmountAnnual)
      : decTotal
  ), 0);

  return {
    blnHasFlexiBucket: decFlexiBucketAnnual > 0,
    decAnnualCtc: decCtcIncludedEarningsAnnual + decEmployerContributionAnnual + decFlexiBucketAnnual,
    decGrossMonthly: decPayableEarningsMonthly + decFlexiBucketMonthly,
    decBasicAnnual,
    decHraAnnual,
    decEmployerContributionAnnual,
    decFlexiBucketAnnual,
    decFlexiBucketMonthly,
    strResidualComponentName: objSource?.objFlexiAllocation?.strResidualComponentName || "-",
  };
}

export function buildEmployeeSalaryFixedRows(
  dicBaseSummaryMetrics: EmployeeSalaryBaseSummaryMetrics,
  decResidualTaxableAnnual: number,
) {
  return [
    { strLabel: "Basic Salary", decAnnual: dicBaseSummaryMetrics.decBasicAnnual },
    { strLabel: "HRA", decAnnual: dicBaseSummaryMetrics.decHraAnnual },
    { strLabel: "Employer Contribution", decAnnual: dicBaseSummaryMetrics.decEmployerContributionAnnual },
    { strLabel: "Flexi Bucket", decAnnual: dicBaseSummaryMetrics.decFlexiBucketAnnual },
    { strLabel: "Residual Taxable Preview", decAnnual: decResidualTaxableAnnual },
  ].filter((dicRow): dicRow is EmployeeSalaryFixedRow => dicRow.decAnnual > 0);
}
