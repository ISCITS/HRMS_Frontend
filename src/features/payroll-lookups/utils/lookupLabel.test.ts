import { humanizeLookupCode, resolveLookupDisplayLabel } from "@/features/payroll-lookups/utils/lookupLabel";

function assertEqual(objActual: unknown, objExpected: unknown, strMessage: string) {
  if (objActual !== objExpected) {
    throw new Error(`${strMessage}: expected '${String(objExpected)}' but received '${String(objActual)}'.`);
  }
}

export function testResolveLookupDisplayLabelPrefersTranslatedText() {
  assertEqual(
    resolveLookupDisplayLabel({
      strDisplayName: "कमाई",
      strLegacyValue: "Earning",
      strValueCode: "EARNING",
    }),
    "कमाई",
    "Translated display name should win"
  );
}

export function testResolveLookupDisplayLabelFallsBackToEnglishOrLegacyText() {
  assertEqual(
    resolveLookupDisplayLabel({
      strDisplayName: "",
      strLegacyValue: "Employer Contribution",
      strValueCode: "EMPLOYER_CONTRIBUTION",
    }),
    "Employer Contribution",
    "Legacy/English label should be used when translated text is missing"
  );
}

export function testResolveLookupDisplayLabelHumanizesCodeAsLastResort() {
  assertEqual(
    resolveLookupDisplayLabel({
      strDisplayName: "",
      strLegacyValue: "",
      strValueCode: "NON_CTC_BASED",
    }),
    "Non Ctc Based",
    "Value code should be humanized only as a final fallback"
  );
}
