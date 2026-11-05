import { describe, expect, it } from "vitest";

import { getEmbeddedPayslipPdf, hasPayslipYearBlocks, withPayslipToolbar } from "./payslipDocument";

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

  it("finds the client format's PDF inside its page", async () => {
    const strPdfBase64 = btoa("%PDF-1.4 client payslip");
    const strClient = `<!doctype html><html><head></head><body><div class="page">Client</div><script type="application/pdf;base64" id="hrms-payslip-pdf" data-file-name="Payslip_10000009_September_2026.pdf">${strPdfBase64}</script></body></html>`;
    const objEmbedded = getEmbeddedPayslipPdf(strClient);
    expect(objEmbedded?.strFileName).toBe("Payslip_10000009_September_2026.pdf");
    expect(objEmbedded?.objPdf.type).toBe("application/pdf");
    expect(await objEmbedded?.objPdf.text()).toBe("%PDF-1.4 client payslip");
    // The default payslip has none - it is saved as the page.
    expect(getEmbeddedPayslipPdf(DETAILED)).toBeNull();
    // The tab's toolbar downloads that PDF; the client page has no Monthly / Detailed switch.
    const strTab = withPayslipToolbar(strClient, "payslip-10000009.html", undefined, "client");
    expect(strTab).toContain('getElementById("hrms-payslip-pdf")');
    expect(strTab).not.toContain("hrms-payslip-toolbar-monthly\"");
  });

  it("keeps one body tag and the payslip content intact", () => {
    const strHtml = withPayslipToolbar(DETAILED, "payslip.html", undefined, "monthly");
    expect(strHtml.match(/<body/g)).toHaveLength(1);
    expect(strHtml).toContain('<div class="net-bar">Net</div>');
    expect(strHtml.endsWith("</body></html>")).toBe(true);
  });
});
