import { describe, expect, it } from "vitest";

import { hasPayslipYearBlocks, withPayslipToolbar } from "./payslipDocument";

const DETAILED = '<!doctype html><html><head></head><body><div class="net-bar">Net</div><div class="ytd"><div class="ytd-title">Year To Date Summary</div></div></body></html>';
const MONTHLY = '<!doctype html><html><head></head><body><div class="net-bar">Net</div></body></html>';

describe("payslip new-tab toolbar", () => {
  it("recognises a detailed payslip by its year blocks", () => {
    expect(hasPayslipYearBlocks(DETAILED)).toBe(true);
    expect(hasPayslipYearBlocks(MONTHLY)).toBe(false);
  });

  it("adds the Monthly / Detailed switch to a detailed payslip, opening in the chosen view", () => {
    const strMonthly = withPayslipToolbar(DETAILED, "payslip.html", undefined, "monthly");
    expect(strMonthly).toContain('<body class="hrms-monthly-view">');
    expect(strMonthly).toContain("hrms-payslip-toolbar-monthly");
    expect(strMonthly).toContain("hrms-payslip-toolbar-detailed");
    // The year blocks stay in the page - the switch only hides them - and appear after the toolbar.
    expect(strMonthly.indexOf('class="ytd"', strMonthly.indexOf("</script>"))).toBeGreaterThan(0);

    const strDetailed = withPayslipToolbar(DETAILED, "payslip.html", undefined, "detailed");
    expect(strDetailed).toContain("<body>");
    expect(strDetailed).not.toContain('<body class="hrms-monthly-view">');
    expect(strDetailed).toContain("hrms-payslip-toolbar-monthly");
  });

  it("shows no switch when the payslip has nothing yearly to toggle", () => {
    const strHtml = withPayslipToolbar(MONTHLY, "payslip.html", undefined, "monthly");
    expect(strHtml).not.toContain("hrms-payslip-toolbar-monthly\"");
    expect(strHtml).toContain("<body>");
    expect(strHtml).toContain("hrms-payslip-toolbar-print");
  });

  it("shows no switch when the user holds only one view", () => {
    const strHtml = withPayslipToolbar(DETAILED, "payslip.html", undefined, "monthly", false);
    expect(strHtml).not.toContain("hrms-payslip-toolbar-monthly\"");
    // Opens as the detailed payslip it was given - nothing hidden.
    expect(strHtml).toContain("<body>");
  });

  it("keeps one body tag and the payslip content intact", () => {
    const strHtml = withPayslipToolbar(DETAILED, "payslip.html", undefined, "monthly");
    expect(strHtml.match(/<body/g)).toHaveLength(1);
    expect(strHtml).toContain('<div class="net-bar">Net</div>');
    expect(strHtml.endsWith("</body></html>")).toBe(true);
  });
});
