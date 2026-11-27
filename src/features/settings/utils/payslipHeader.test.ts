import { describe, expect, it } from "vitest";

import type { PayslipHeaderFieldDto, PayslipHeaderLimits, PayslipHeaderLine } from "@/features/settings/types";
import {
  cloneHeaderLines,
  createHeaderLine,
  entityFieldKeys,
  moveHeaderLine,
  resolveHeaderLines,
  sameHeaderLines,
  toSaveHeaderLines,
  usesCustomText,
  validateHeaderLines,
} from "@/features/settings/utils/payslipHeader";

const lstFields: PayslipHeaderFieldDto[] = [
  { strKey: "company.name", strLabel: "Company Name", strGroup: "Company", strSample: "Sample Company Private Limited" },
  { strKey: "company.address", strLabel: "Company Registered Address", strGroup: "Company", strSample: "Plot 1, Sample City" },
  { strKey: "company.pan", strLabel: "Company PAN", strGroup: "Company", strSample: "PAN: AAACS1234A", strPrefix: "PAN: " },
  { strKey: "entity.name", strLabel: "Entity Name", strGroup: "Allocation Entity", strSample: "SEC 58" },
  { strKey: "entity.address_line_1", strLabel: "Entity Address 1", strGroup: "Allocation Entity", strSample: "B-103, Sector-5" },
  { strKey: "entity.address_line_2", strLabel: "Entity Address 2", strGroup: "Allocation Entity", strSample: "Noida 201301" },
  { strKey: "custom.text", strLabel: "Custom Text", strGroup: "Other", strSample: "" },
];
const objLimits: PayslipHeaderLimits = { intMaxLines: 8, intMaxFieldsPerLine: 4, intMaxCustomTextLength: 200 };

function line(lstLineFields: string[], strStyle: PayslipHeaderLine["strStyle"] = "normal", lstFallbackFields: string[] = [], strCustomText = ""): PayslipHeaderLine {
  return { lstFields: lstLineFields, lstFallbackFields, strCustomText, strStyle };
}

describe("resolveHeaderLines", () => {
  it("prints sample values, joins fields on a line and keeps prefixes once", () => {
    expect(
      resolveHeaderLines([line(["company.name"], "heading"), line(["entity.address_line_1", "entity.address_line_2"], "bold"), line(["company.pan"])], lstFields),
    ).toEqual([
      { strText: "Sample Company Private Limited", strStyle: "heading" },
      { strText: "B-103, Sector-5, Noida 201301", strStyle: "bold" },
      { strText: "PAN: AAACS1234A", strStyle: "normal" },
    ]);
  });

  it("uses the fallback when the employee has no allocation entity and drops lines left empty", () => {
    const lstLines = [line(["entity.address_line_1", "entity.address_line_2"], "normal", ["company.address"]), line(["entity.name"])];
    expect(resolveHeaderLines(lstLines, lstFields, undefined, entityFieldKeys(lstFields))).toEqual([
      { strText: "Plot 1, Sample City", strStyle: "normal" },
    ]);
  });

  it("prints custom text and real values when given", () => {
    expect(
      resolveHeaderLines([line(["custom.text", "entity.name"], "bold", [], " Site ")], lstFields, { "entity.name": "Gr Noida" }),
    ).toEqual([{ strText: "Site, Gr Noida", strStyle: "bold" }]);
  });
});

describe("validateHeaderLines", () => {
  it("accepts a normal layout", () => {
    expect(validateHeaderLines([line(["company.name"], "heading"), line(["entity.address_line_1"], "normal", ["company.address"])], objLimits)).toBeNull();
  });

  it.each([
    [[], "at least one header line"],
    [[line([])], "choose at least one field"],
    [[line(["custom.text"])], "enter the custom text"],
    [[line(["company.name", "company.address", "company.pan", "entity.name", "entity.address_line_1"])], "at most 4 fields"],
    [Array.from({ length: 9 }, () => line(["company.name"])), "at most 8 lines"],
    [[line(["custom.text"], "normal", [], "x".repeat(201))], "at most 200 characters"],
  ])("rejects %#", (lstLines, strMessage) => {
    expect(validateHeaderLines(lstLines as PayslipHeaderLine[], objLimits)).toContain(strMessage);
  });
});

describe("editing helpers", () => {
  it("moves a line up and down, ignoring moves past the ends", () => {
    const lstLines = [line(["company.name"]), line(["entity.name"]), line(["company.pan"])];
    expect(moveHeaderLine(lstLines, 2, -1).map((objLine) => objLine.lstFields[0])).toEqual(["company.name", "company.pan", "entity.name"]);
    expect(moveHeaderLine(lstLines, 0, -1)).toBe(lstLines);
    expect(moveHeaderLine(lstLines, 2, 1)).toBe(lstLines);
  });

  it("clones deeply and compares by content", () => {
    const lstLines = [line(["company.name"], "heading")];
    const lstCopy = cloneHeaderLines(lstLines);
    lstCopy[0].lstFields.push("entity.name");
    expect(lstLines[0].lstFields).toEqual(["company.name"]);
    expect(sameHeaderLines(lstLines, cloneHeaderLines(lstLines))).toBe(true);
    expect(sameHeaderLines(lstLines, lstCopy)).toBe(false);
  });

  it("sends custom text only for lines that print it", () => {
    expect(toSaveHeaderLines([line(["company.name"], "heading", [], "left over")])[0].strCustomText).toBe("");
    expect(toSaveHeaderLines([line(["company.name"], "normal", ["custom.text"], "  Head Office ")])[0].strCustomText).toBe("Head Office");
    expect(usesCustomText(line(["company.name"], "normal", ["custom.text"]))).toBe(true);
  });

  it("creates an empty normal line and lists the entity fields", () => {
    expect(createHeaderLine()).toEqual({ lstFields: [], lstFallbackFields: [], strCustomText: "", strStyle: "normal" });
    expect(entityFieldKeys(lstFields)).toEqual(["entity.name", "entity.address_line_1", "entity.address_line_2"]);
  });
});
