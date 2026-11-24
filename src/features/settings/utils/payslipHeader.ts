import type { PayslipHeaderFieldDto, PayslipHeaderLimits, PayslipHeaderLine, PayslipHeaderStyle } from "@/features/settings/types";

/** Mirrors backend PayrollDocumentHeader (resolve / validate) so the screen previews and checks the
 * header as the payslip will print it, before saving. */

export const CUSTOM_TEXT_FIELD = "custom.text";
const FIELD_SEPARATOR = ", ";

export type ResolvedHeaderLine = { strText: string; strStyle: PayslipHeaderStyle };

export function createHeaderLine(strStyle: PayslipHeaderStyle = "normal"): PayslipHeaderLine {
  return { lstFields: [], lstFallbackFields: [], strCustomText: "", strStyle };
}

export function cloneHeaderLines(lstLines: PayslipHeaderLine[]): PayslipHeaderLine[] {
  return lstLines.map((objLine) => ({ ...objLine, lstFields: [...objLine.lstFields], lstFallbackFields: [...objLine.lstFallbackFields] }));
}

export function sameHeaderLines(lstLeft: PayslipHeaderLine[], lstRight: PayslipHeaderLine[]): boolean {
  return JSON.stringify(lstLeft) === JSON.stringify(lstRight);
}

export function moveHeaderLine(lstLines: PayslipHeaderLine[], intIndex: number, intDirection: -1 | 1): PayslipHeaderLine[] {
  const intTarget = intIndex + intDirection;
  if (intTarget < 0 || intTarget >= lstLines.length) return lstLines;
  const lstNext = [...lstLines];
  [lstNext[intIndex], lstNext[intTarget]] = [lstNext[intTarget], lstNext[intIndex]];
  return lstNext;
}

export function usesCustomText(objLine: PayslipHeaderLine): boolean {
  return objLine.lstFields.includes(CUSTOM_TEXT_FIELD) || objLine.lstFallbackFields.includes(CUSTOM_TEXT_FIELD);
}

/** "Sample value" per field (without the prefix, which is added when printing). */
function sampleValues(lstFields: PayslipHeaderFieldDto[]): Record<string, string> {
  return Object.fromEntries(
    lstFields.map((objField) => [
      objField.strKey,
      objField.strPrefix && objField.strSample.startsWith(objField.strPrefix) ? objField.strSample.slice(objField.strPrefix.length) : objField.strSample,
    ]),
  );
}

function joinFields(lstKeys: string[], dicValues: Record<string, string>, dicPrefix: Record<string, string>, strCustomText: string): string {
  return lstKeys
    .map((strKey) => {
      const strValue = (strKey === CUSTOM_TEXT_FIELD ? strCustomText : dicValues[strKey] ?? "").trim();
      return strValue ? `${dicPrefix[strKey] ?? ""}${strValue}` : "";
    })
    .filter(Boolean)
    .join(FIELD_SEPARATOR);
}

/**
 * The header as printed. dicValues: the field values (an employee's, or the catalogue samples when
 * omitted); lstEmptyFields: fields to treat as empty, to preview the fallback (e.g. an employee
 * with no allocation entity).
 */
export function resolveHeaderLines(
  lstLines: PayslipHeaderLine[],
  lstFields: PayslipHeaderFieldDto[],
  dicValues?: Record<string, string>,
  lstEmptyFields: string[] = [],
): ResolvedHeaderLine[] {
  const dicSource = { ...(dicValues ?? sampleValues(lstFields)) };
  lstEmptyFields.forEach((strKey) => {
    dicSource[strKey] = "";
  });
  const dicPrefix = Object.fromEntries(lstFields.map((objField) => [objField.strKey, objField.strPrefix ?? ""]));
  return lstLines
    .map((objLine) => {
      const strCustomText = objLine.strCustomText.trim();
      const strText =
        joinFields(objLine.lstFields, dicSource, dicPrefix, strCustomText) ||
        joinFields(objLine.lstFallbackFields, dicSource, dicPrefix, strCustomText);
      return { strText, strStyle: objLine.strStyle };
    })
    .filter((objLine) => objLine.strText);
}

/** The first problem that would stop the save (same rules as the backend), or null. */
export function validateHeaderLines(lstLines: PayslipHeaderLine[], objLimits: PayslipHeaderLimits): string | null {
  if (lstLines.length === 0) return "Keep at least one header line.";
  if (lstLines.length > objLimits.intMaxLines) return `The header can have at most ${objLimits.intMaxLines} lines.`;
  for (const [intIndex, objLine] of lstLines.entries()) {
    const strLine = `Header line ${intIndex + 1}`;
    if (objLine.lstFields.length === 0) return `${strLine}: choose at least one field.`;
    if (objLine.lstFields.length > objLimits.intMaxFieldsPerLine || objLine.lstFallbackFields.length > objLimits.intMaxFieldsPerLine) {
      return `${strLine}: at most ${objLimits.intMaxFieldsPerLine} fields.`;
    }
    if (usesCustomText(objLine) && !objLine.strCustomText.trim()) return `${strLine}: enter the custom text.`;
    if (objLine.strCustomText.trim().length > objLimits.intMaxCustomTextLength) {
      return `${strLine}: custom text can be at most ${objLimits.intMaxCustomTextLength} characters.`;
    }
  }
  return null;
}

/** The layout as it is sent: custom text cleared on lines that do not print it. */
export function toSaveHeaderLines(lstLines: PayslipHeaderLine[]): PayslipHeaderLine[] {
  return lstLines.map((objLine) => ({
    lstFields: [...objLine.lstFields],
    lstFallbackFields: [...objLine.lstFallbackFields],
    strCustomText: usesCustomText(objLine) ? objLine.strCustomText.trim() : "",
    strStyle: objLine.strStyle,
  }));
}

/** Fields that belong to the employee's allocation entity (to preview "no entity"). */
export function entityFieldKeys(lstFields: PayslipHeaderFieldDto[]): string[] {
  return lstFields.filter((objField) => objField.strKey.startsWith("entity.")).map((objField) => objField.strKey);
}
