import type { EmployeeSalaryOverrideFormValue, EmployeeSalaryStructureComponentOption } from "@/features/employee-salary/types";

type PreviewComponentLine = {
  intSalaryComponentID: number;
  decAmountMonthly?: number | null;
  decAmountAnnual?: number | null;
  decPercentageValue?: number | null;
};

function formatOptionalDefaultValue(objValue: number | string | null | undefined) {
  if (objValue === null || typeof objValue === "undefined" || objValue === "") {
    return "";
  }
  const decValue = Number(objValue);
  if (!Number.isFinite(decValue)) {
    return "";
  }
  const decNearestInteger = Math.round(decValue);
  if (Math.abs(decValue - decNearestInteger) < 0.05) {
    return String(decNearestInteger);
  }
  const decRoundedValue = Math.round((decValue + Number.EPSILON) * 100) / 100;
  return decRoundedValue.toFixed(2).replace(/\.00$/, "").replace(/(\.\d*[1-9])0$/, "$1");
}

function parseOptionalAmount(strValue: string | null | undefined) {
  const strNormalizedValue = String(strValue ?? "").replace(/,/g, "");
  const decValue = Number(strNormalizedValue);
  return strNormalizedValue.trim() && Number.isFinite(decValue) ? decValue : null;
}

function normalizeSelectToken(strValue: string | null | undefined) {
  return String(strValue ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function sanitizeFormulaVariable(strCode: string) {
  return strCode.replace(/[^A-Za-z0-9_]/g, "_");
}

function evaluateFormulaExpression(strExpression: string, dicVariables: Record<string, number>) {
  const lstTokens = strExpression.match(/[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?|[()+\-*/]/g);
  if (!lstTokens) {
    return null;
  }
  const arrTokens = lstTokens;

  let intIndex = 0;

  function peekToken() {
    return arrTokens[intIndex] ?? null;
  }

  function consumeToken() {
    const strToken = arrTokens[intIndex];
    intIndex += 1;
    return strToken;
  }

  function parsePrimary(): number {
    const strToken = peekToken();
    if (!strToken) {
      throw new Error("Unexpected end of expression.");
    }
    if (strToken === "(") {
      consumeToken();
      const fltValue = parseExpression();
      if (peekToken() !== ")") {
        throw new Error("Missing closing bracket.");
      }
      consumeToken();
      return fltValue;
    }
    if (strToken === "+") {
      consumeToken();
      return parsePrimary();
    }
    if (strToken === "-") {
      consumeToken();
      return -parsePrimary();
    }
    if (/^\d/.test(strToken)) {
      consumeToken();
      return Number(strToken);
    }
    if (/^[A-Za-z_]/.test(strToken)) {
      const strName = consumeToken();
      if (typeof dicVariables[strName] === "undefined") {
        throw new Error("Unknown variable.");
      }
      return dicVariables[strName];
    }
    throw new Error("Unexpected formula expression.");
  }

  function parseFactor() {
    let fltValue = parsePrimary();
    while (peekToken() === "*" || peekToken() === "/") {
      const strOperator = consumeToken();
      const fltNextValue = parsePrimary();
      fltValue = strOperator === "*" ? fltValue * fltNextValue : fltValue / fltNextValue;
    }
    return fltValue;
  }

  function parseExpression() {
    let fltValue = parseFactor();
    while (peekToken() === "+" || peekToken() === "-") {
      const strOperator = consumeToken();
      const fltNextValue = parseFactor();
      fltValue = strOperator === "+" ? fltValue + fltNextValue : fltValue - fltNextValue;
    }
    return fltValue;
  }

  try {
    const fltValue = parseExpression();
    return intIndex === arrTokens.length && Number.isFinite(fltValue) ? fltValue : null;
  } catch {
    return null;
  }
}

export function usesAutoCalculatedOverrideValue(strValueSource: string | null | undefined) {
  const strNormalizedValueSource = String(strValueSource ?? "").trim().toLowerCase();
  return strNormalizedValueSource.includes("percent") || strNormalizedValueSource.includes("formula");
}

export function usesFixedOverrideValue(strValueSource: string | null | undefined) {
  const strNormalizedValueSource = String(strValueSource ?? "").trim().toLowerCase();
  return strNormalizedValueSource.includes("fixed");
}

function isWageComponent(dicComponent: EmployeeSalaryStructureComponentOption) {
  if (typeof dicComponent.blnIsWages === "boolean") {
    return dicComponent.blnIsWages;
  }
  const strToken = normalizeSelectToken(dicComponent.strComponentName ?? dicComponent.strComponentCode ?? "");
  return strToken.includes("basic") || strToken.includes("wage");
}

function recalculateDerivedOverrideRows(
  lstOverrides: EmployeeSalaryOverrideFormValue[],
  lstStructureComponents: EmployeeSalaryStructureComponentOption[] = []
) {
  const mapStructureComponentByID = new Map(
    lstStructureComponents.map((dicComponent) => [dicComponent.intSalaryComponentID, dicComponent])
  );
  const dicComputedMonthlyByComponentID = new Map<number, number>();
  const dicFormulaVariables: Record<string, number> = {};
  const dicFormulaAggregates = {
    wageMonthly: 0,
    nonWageMonthly: 0,
    ctcAnnual: 0,
    grossAnnual: 0,
  };

  function setFormulaVariable(strName: string, fltValue: number) {
    dicFormulaVariables[strName] = fltValue;
    dicFormulaVariables[strName.toLowerCase()] = fltValue;
  }

  function updateStatutoryFormulaVariables() {
    const decMinimumRequiredMonthly = dicFormulaAggregates.ctcAnnual > 0
      ? (dicFormulaAggregates.ctcAnnual * 0.5) / 12
      : 0;
    const decShortfallMonthly = Math.max(decMinimumRequiredMonthly - dicFormulaAggregates.wageMonthly, 0);
    setFormulaVariable("WAGE_TOTAL", Number(dicFormulaAggregates.wageMonthly.toFixed(2)));
    setFormulaVariable("NON_WAGE_TOTAL", Number(dicFormulaAggregates.nonWageMonthly.toFixed(2)));
    setFormulaVariable("MINIMUM_REQUIRED_WAGE", Number(decMinimumRequiredMonthly.toFixed(2)));
    setFormulaVariable("DEEMED_WAGE", Number((dicFormulaAggregates.wageMonthly + decShortfallMonthly).toFixed(2)));
    setFormulaVariable("DEEMED_WAGE_BASE", Number((dicFormulaAggregates.wageMonthly + decShortfallMonthly).toFixed(2)));
    setFormulaVariable("DEEMED_WAGE_SHORTFALL", Number(decShortfallMonthly.toFixed(2)));
    setFormulaVariable("CTC_ANNUAL", Number(dicFormulaAggregates.ctcAnnual.toFixed(2)));
    setFormulaVariable("GROSS_ANNUAL", Number(dicFormulaAggregates.grossAnnual.toFixed(2)));
  }

  updateStatutoryFormulaVariables();

  const mapOverrideByComponentID = new Map(
    lstOverrides.map((dicOverride) => [dicOverride.intSalaryComponentID, dicOverride])
  );

  const lstCalculatedOverrides = [...lstOverrides]
    .sort((dicLeft, dicRight) => {
      const intLeftOrder = mapStructureComponentByID.get(dicLeft.intSalaryComponentID)?.intLineOrder ?? 0;
      const intRightOrder = mapStructureComponentByID.get(dicRight.intSalaryComponentID)?.intLineOrder ?? 0;
      return intLeftOrder - intRightOrder || dicLeft.intSalaryComponentID - dicRight.intSalaryComponentID;
    })
    .map((dicOverride) => {
      const dicStructureComponent = mapStructureComponentByID.get(dicOverride.intSalaryComponentID);
      const strValueSource = normalizeSelectToken(dicOverride.strValueSource);
      let decCalculatedMonthly = parseOptionalAmount(dicOverride.decAmountMonthly);

      if (strValueSource === "fixed") {
        const decAnnualAmount = parseOptionalAmount(dicOverride.decAmountAnnual);
        decCalculatedMonthly = decAnnualAmount !== null
          ? decAnnualAmount / 12
          : parseOptionalAmount(dicOverride.decAmountMonthly);
      } else if (strValueSource === "percentage") {
        const decPercentageValue =
          parseOptionalAmount(dicOverride.decPercentageValue) ??
          parseOptionalAmount(dicOverride.strDefaultPercentage);
        const intBasisComponentID = dicStructureComponent?.intBasisComponentID ?? null;
        const decBasisAmount = intBasisComponentID
          ? dicComputedMonthlyByComponentID.get(intBasisComponentID)
          : undefined;
        decCalculatedMonthly = decPercentageValue !== null && decBasisAmount !== undefined
          ? (decBasisAmount * decPercentageValue) / 100
          : null;
      } else if (strValueSource === "formula") {
        const strFormulaExpression = dicOverride.strFormulaExpression || dicStructureComponent?.strFormulaExpression || "";
        decCalculatedMonthly = strFormulaExpression.trim()
          ? evaluateFormulaExpression(strFormulaExpression, dicFormulaVariables)
          : null;
      }

      const dicNextOverride = usesAutoCalculatedOverrideValue(dicOverride.strValueSource)
        ? {
            ...dicOverride,
            decAmountMonthly: decCalculatedMonthly !== null ? formatOptionalDefaultValue(decCalculatedMonthly) : "",
            decAmountAnnual: decCalculatedMonthly !== null ? formatOptionalDefaultValue(decCalculatedMonthly * 12) : "",
            strDefaultMonthly: decCalculatedMonthly !== null ? formatOptionalDefaultValue(decCalculatedMonthly) : dicOverride.strDefaultMonthly,
            strDefaultAnnual: decCalculatedMonthly !== null ? formatOptionalDefaultValue(decCalculatedMonthly * 12) : dicOverride.strDefaultAnnual,
          }
        : {
            ...dicOverride,
            decAmountMonthly: decCalculatedMonthly !== null ? formatOptionalDefaultValue(decCalculatedMonthly) : dicOverride.decAmountMonthly,
          };

      const decResolvedMonthly = parseOptionalAmount(dicNextOverride.decAmountMonthly);
      const dicResolvedStructureComponent = mapStructureComponentByID.get(dicNextOverride.intSalaryComponentID);
      if (decResolvedMonthly !== null) {
        dicComputedMonthlyByComponentID.set(dicNextOverride.intSalaryComponentID, decResolvedMonthly);
        const strRawCode = dicResolvedStructureComponent?.strComponentCode?.trim() ?? "";
        const strFallbackName = dicNextOverride.strComponentName.trim();
        const strSanitizedCode = sanitizeFormulaVariable(strRawCode);
        const strSanitizedName = sanitizeFormulaVariable(strFallbackName);
        if (strRawCode) {
          dicFormulaVariables[strRawCode] = decResolvedMonthly;
          dicFormulaVariables[strRawCode.toLowerCase()] = decResolvedMonthly;
        }
        if (strSanitizedCode) {
          dicFormulaVariables[strSanitizedCode] = decResolvedMonthly;
          dicFormulaVariables[strSanitizedCode.toLowerCase()] = decResolvedMonthly;
        }
        if (strFallbackName) {
          dicFormulaVariables[strFallbackName] = decResolvedMonthly;
          dicFormulaVariables[strFallbackName.toLowerCase()] = decResolvedMonthly;
        }
        if (strSanitizedName) {
          dicFormulaVariables[strSanitizedName] = decResolvedMonthly;
          dicFormulaVariables[strSanitizedName.toLowerCase()] = decResolvedMonthly;
        }
        if (dicResolvedStructureComponent?.blnIncludedInCtc !== false) {
          dicFormulaAggregates.ctcAnnual += decResolvedMonthly * 12;
          if (dicResolvedStructureComponent && isWageComponent(dicResolvedStructureComponent)) {
            dicFormulaAggregates.wageMonthly += decResolvedMonthly;
          } else {
            dicFormulaAggregates.nonWageMonthly += decResolvedMonthly;
          }
        }
        if (
          dicResolvedStructureComponent &&
          normalizeSelectToken(dicResolvedStructureComponent.strComponentCategory) !== "deduction" &&
          normalizeSelectToken(dicResolvedStructureComponent.strComponentCategory) !== "information"
        ) {
          dicFormulaAggregates.grossAnnual += decResolvedMonthly * 12;
        }
        updateStatutoryFormulaVariables();
      }
      mapOverrideByComponentID.set(dicNextOverride.intSalaryComponentID, dicNextOverride);
      return dicNextOverride;
    });

  return lstOverrides.map((dicOverride) => mapOverrideByComponentID.get(dicOverride.intSalaryComponentID) ?? dicOverride)
    .map((dicOverride) => {
      const dicCalculatedOverride = lstCalculatedOverrides.find((dicCalculated) => dicCalculated.intSalaryComponentID === dicOverride.intSalaryComponentID);
      return dicCalculatedOverride ?? dicOverride;
    });
}

export function syncCalculatedOverrideRowsFromPreview(
  lstOverrides: EmployeeSalaryOverrideFormValue[],
  lstPreviewComponentLines: PreviewComponentLine[] = [],
  lstStructureComponents: EmployeeSalaryStructureComponentOption[] = []
) {
  const mapPreviewComponentByID = new Map(
    lstPreviewComponentLines.map((dicLine) => [dicLine.intSalaryComponentID, dicLine])
  );

  return recalculateDerivedOverrideRows(lstOverrides, lstStructureComponents).map((dicOverride) => {
    if (!usesAutoCalculatedOverrideValue(dicOverride.strValueSource)) {
      return dicOverride;
    }
    const dicPreviewLine = mapPreviewComponentByID.get(dicOverride.intSalaryComponentID);
    if (!dicPreviewLine) {
      return dicOverride;
    }
    const decPreviewMonthly =
      dicPreviewLine.decAmountMonthly ??
      (dicPreviewLine.decAmountAnnual != null ? Number(dicPreviewLine.decAmountAnnual) / 12 : null);
    const decPreviewAnnual =
      dicPreviewLine.decAmountAnnual ??
      (decPreviewMonthly != null ? Number(decPreviewMonthly) * 12 : null);
    if (decPreviewAnnual === null && decPreviewMonthly === null) {
      return dicOverride;
    }
    return {
      ...dicOverride,
      decAmountMonthly: formatOptionalDefaultValue(decPreviewMonthly),
      decAmountAnnual: formatOptionalDefaultValue(decPreviewAnnual),
      strDefaultMonthly: formatOptionalDefaultValue(decPreviewMonthly),
      strDefaultAnnual: formatOptionalDefaultValue(decPreviewAnnual),
      strDefaultPercentage: formatOptionalDefaultValue(
        dicPreviewLine.decPercentageValue ?? parseOptionalAmount(dicOverride.strDefaultPercentage)
      ),
    };
  });
}
