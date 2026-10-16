function createPayslipUrl(strHtml: string) {
  const objBlob = new Blob([strHtml], { type: "text/html;charset=utf-8" });
  return URL.createObjectURL(objBlob);
}

export function buildPayslipFileName(...lstParts: Array<string | number | null | undefined>) {
  const strBaseName = lstParts
    .map((strPart) => String(strPart ?? "").trim())
    .filter(Boolean)
    .join("-");
  const strSafeName = (strBaseName || "payslip")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${strSafeName || "payslip"}.html`;
}

export function downloadPayslipHtml(strHtml: string, strFileName: string) {
  const strUrl = createPayslipUrl(strHtml);
  const objLink = document.createElement("a");

  objLink.href = strUrl;
  objLink.download = strFileName;
  objLink.style.display = "none";
  document.body.appendChild(objLink);
  objLink.click();
  objLink.remove();

  window.setTimeout(() => URL.revokeObjectURL(strUrl), 1000);
}

const PAYSLIP_TOOLBAR_ID = "hrms-payslip-toolbar";

// Sticky Print / Download bar for the payslip opened in a new tab. Hidden when printing, and stripped
// from the copy the Download button saves, so neither the paper nor the file carries it.
function escapeHtmlAttribute(strValue: string) {
  return strValue.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildPayslipToolbar(strFileName: string, strTaxInformationUrl?: string) {
  // The blob tab has no app origin for relative links, so the tax page link is made absolute here.
  const strTaxLink = strTaxInformationUrl
    ? `<a class="hrms-tax-info" href="${escapeHtmlAttribute(new URL(strTaxInformationUrl, window.location.origin).href)}" target="_blank" rel="noopener noreferrer" title="Tax Information"><span class="hrms-tax-info-icon">i</span>Tax Information</a>`
    : "";
  const strSafeFileName = JSON.stringify(strFileName).replace(/</g, "\\u003c");
  return `
<div id="${PAYSLIP_TOOLBAR_ID}">
  <style>
    #${PAYSLIP_TOOLBAR_ID} { position: sticky; top: 0; z-index: 1000; display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 10px 16px; background: #f6f8fc; border-bottom: 1px solid #dce4ef; font-family: Arial, Helvetica, sans-serif; }
    #${PAYSLIP_TOOLBAR_ID} button { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; }
    #${PAYSLIP_TOOLBAR_ID} .hrms-primary { background: #0b5ed7; border: 1px solid #0b5ed7; color: #fff; }
    #${PAYSLIP_TOOLBAR_ID} .hrms-secondary { background: #fff; border: 1px solid #8fb8f9; color: #0b5ed7; }
    #${PAYSLIP_TOOLBAR_ID} .hrms-tax-info { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; margin-right: auto; border-radius: 8px; border: 1px solid #8fb8f9; background: #fff; color: #0b5ed7; font-size: 13px; font-weight: 700; text-decoration: none; }
    #${PAYSLIP_TOOLBAR_ID} .hrms-tax-info-icon { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid currentColor; font: italic 700 12px Georgia, serif; }
    @media print { #${PAYSLIP_TOOLBAR_ID} { display: none !important; } }
  </style>
  ${strTaxLink}
  <button type="button" class="hrms-secondary" id="${PAYSLIP_TOOLBAR_ID}-download">&#x2B07; Download</button>
  <button type="button" class="hrms-primary" id="${PAYSLIP_TOOLBAR_ID}-print">&#x1F5B6; Print</button>
  <script>
    (function () {
      var strToolbarId = "${PAYSLIP_TOOLBAR_ID}";
      document.getElementById(strToolbarId + "-print").addEventListener("click", function () { window.print(); });
      document.getElementById(strToolbarId + "-download").addEventListener("click", function () {
        var objCopy = document.documentElement.cloneNode(true);
        var objToolbar = objCopy.querySelector("#" + strToolbarId);
        if (objToolbar) objToolbar.remove();
        var objBlob = new Blob(["<!DOCTYPE html>\\n" + objCopy.outerHTML], { type: "text/html;charset=utf-8" });
        var strUrl = URL.createObjectURL(objBlob);
        var objLink = document.createElement("a");
        objLink.href = strUrl;
        objLink.download = ${strSafeFileName};
        document.body.appendChild(objLink);
        objLink.click();
        objLink.remove();
        setTimeout(function () { URL.revokeObjectURL(strUrl); }, 1000);
      });
    })();
  </script>
</div>`;
}

function withPayslipToolbar(strHtml: string, strFileName: string, strTaxInformationUrl?: string) {
  const strToolbar = buildPayslipToolbar(strFileName, strTaxInformationUrl);
  const objBodyMatch = /<body[^>]*>/i.exec(strHtml);
  if (!objBodyMatch) {
    return strToolbar + strHtml;
  }
  const intInsertAt = objBodyMatch.index + objBodyMatch[0].length;
  return strHtml.slice(0, intInsertAt) + strToolbar + strHtml.slice(intInsertAt);
}

// Opens the payslip in a new tab with its own toolbar: Tax Information (when a URL is given), Download
// and Print. (The tab is opened with noopener, so this page cannot drive window.print() there - the
// toolbar does it instead.) The toolbar is hidden on paper and stripped from the downloaded copy.
export function printPayslipHtml(strHtml: string, strFileName = "payslip.html", strTaxInformationUrl?: string) {
  const strUrl = createPayslipUrl(withPayslipToolbar(strHtml, strFileName, strTaxInformationUrl));
  window.open(strUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(strUrl), 30000);
}
