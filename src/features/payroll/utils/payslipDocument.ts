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

// The client-format payslip page carries its own PDF (built by the server from the same figures) in
// this element; Download saves that PDF instead of the page.
const PAYSLIP_PDF_ELEMENT_ID = "hrms-payslip-pdf";

export function getEmbeddedPayslipPdf(strHtml: string): { objPdf: Blob; strFileName: string } | null {
  const objMatch = new RegExp(`<script([^>]*)id="${PAYSLIP_PDF_ELEMENT_ID}"([^>]*)>([^<]*)</script>`).exec(strHtml);
  const strBase64 = objMatch?.[3].trim();
  if (!objMatch || !strBase64) {
    return null;
  }
  const strBinary = atob(strBase64);
  const arrBytes = new Uint8Array(strBinary.length);
  for (let intIndex = 0; intIndex < strBinary.length; intIndex += 1) {
    arrBytes[intIndex] = strBinary.charCodeAt(intIndex);
  }
  const strFileName = /data-file-name="([^"]*)"/.exec(objMatch[1] + objMatch[2])?.[1].replace(/&amp;/g, "&");
  return {
    objPdf: new Blob([arrBytes], { type: "application/pdf" }),
    strFileName: strFileName || "payslip.pdf",
  };
}

/** Saves the payslip: the client format as its PDF, the default format as the page. */
export function downloadPayslipHtml(strHtml: string, strFileName: string) {
  const objEmbeddedPdf = getEmbeddedPayslipPdf(strHtml);
  if (objEmbeddedPdf) {
    downloadPayslipUrl(URL.createObjectURL(objEmbeddedPdf.objPdf), strFileName.replace(/\.html$/i, "") + ".pdf");
    return;
  }
  downloadPayslipUrl(createPayslipUrl(strHtml), strFileName);
}

function downloadPayslipUrl(strUrl: string, strFileName: string) {
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

// The detailed payslip is the monthly one plus these Year To Date / Annual Tax Summary blocks, so the
// tab's Monthly / Detailed switch only hides or shows them - no second request.
const PAYSLIP_YEAR_BLOCK_CLASS = "ytd";
const PAYSLIP_MONTHLY_CLASS = "hrms-monthly-view";

export function hasPayslipYearBlocks(strHtml: string) {
  return strHtml.includes(`class="${PAYSLIP_YEAR_BLOCK_CLASS}"`);
}

function buildPayslipToolbar(strFileName: string, strTaxInformationUrl?: string, blnViewSwitch = false) {
  // The blob tab has no app origin for relative links, so the tax page link is made absolute here.
  const strTaxLink = strTaxInformationUrl
    ? `<a class="hrms-tax-info" href="${escapeHtmlAttribute(new URL(strTaxInformationUrl, window.location.origin).href)}" target="_blank" rel="noopener noreferrer" title="Tax Information"><span class="hrms-tax-info-icon">i</span>Tax Information</a>`
    : "";
  const strViewSwitch = blnViewSwitch
    ? `<span class="hrms-view" role="group" aria-label="Payslip view"><button type="button" id="${PAYSLIP_TOOLBAR_ID}-monthly">Monthly</button><button type="button" id="${PAYSLIP_TOOLBAR_ID}-detailed">Detailed (YTD &amp; annual)</button></span>`
    : "";
  const strSafeFileName = JSON.stringify(strFileName).replace(/</g, "\\u003c");
  return `
<div id="${PAYSLIP_TOOLBAR_ID}">
  <style>
    .${PAYSLIP_MONTHLY_CLASS} .${PAYSLIP_YEAR_BLOCK_CLASS} { display: none !important; }
    #${PAYSLIP_TOOLBAR_ID} .hrms-view { display: inline-flex; margin-right: auto; border: 1px solid #8fb8f9; border-radius: 8px; overflow: hidden; }
    #${PAYSLIP_TOOLBAR_ID} .hrms-view button { border: 0; border-radius: 0; background: #fff; color: #0b5ed7; }
    #${PAYSLIP_TOOLBAR_ID} .hrms-view button[aria-pressed="true"] { background: #0b5ed7; color: #fff; }
    #${PAYSLIP_TOOLBAR_ID} { position: sticky; top: 0; z-index: 1000; display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 10px 16px; background: #f6f8fc; border-bottom: 1px solid #dce4ef; font-family: Arial, Helvetica, sans-serif; }
    #${PAYSLIP_TOOLBAR_ID} button { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; }
    #${PAYSLIP_TOOLBAR_ID} .hrms-primary { background: #0b5ed7; border: 1px solid #0b5ed7; color: #fff; }
    #${PAYSLIP_TOOLBAR_ID} .hrms-secondary { background: #fff; border: 1px solid #8fb8f9; color: #0b5ed7; }
    #${PAYSLIP_TOOLBAR_ID} .hrms-tax-info { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; margin-right: auto; border-radius: 8px; border: 1px solid #8fb8f9; background: #fff; color: #0b5ed7; font-size: 13px; font-weight: 700; text-decoration: none; }
    #${PAYSLIP_TOOLBAR_ID} .hrms-tax-info-icon { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid currentColor; font: italic 700 12px Georgia, serif; }
    @media print { #${PAYSLIP_TOOLBAR_ID} { display: none !important; } }
  </style>
  ${strViewSwitch}
  ${strTaxLink}
  <button type="button" class="hrms-secondary" id="${PAYSLIP_TOOLBAR_ID}-download">&#x2B07; Download</button>
  <button type="button" class="hrms-primary" id="${PAYSLIP_TOOLBAR_ID}-print">&#x1F5B6; Print</button>
  <script>
    (function () {
      var strToolbarId = "${PAYSLIP_TOOLBAR_ID}";
      var strMonthlyClass = "${PAYSLIP_MONTHLY_CLASS}";
      var objMonthly = document.getElementById(strToolbarId + "-monthly");
      var objDetailed = document.getElementById(strToolbarId + "-detailed");
      function showView(blnMonthly) {
        document.body.classList.toggle(strMonthlyClass, blnMonthly);
        objMonthly.setAttribute("aria-pressed", String(blnMonthly));
        objDetailed.setAttribute("aria-pressed", String(!blnMonthly));
      }
      if (objMonthly && objDetailed) {
        objMonthly.addEventListener("click", function () { showView(true); });
        objDetailed.addEventListener("click", function () { showView(false); });
        showView(document.body.classList.contains(strMonthlyClass));
      }
      document.getElementById(strToolbarId + "-print").addEventListener("click", function () { window.print(); });
      function saveFile(objBlob, strName) {
        var strUrl = URL.createObjectURL(objBlob);
        var objLink = document.createElement("a");
        objLink.href = strUrl;
        objLink.download = strName;
        document.body.appendChild(objLink);
        objLink.click();
        objLink.remove();
        setTimeout(function () { URL.revokeObjectURL(strUrl); }, 1000);
      }
      document.getElementById(strToolbarId + "-download").addEventListener("click", function () {
        // Client format: the page carries its PDF - save that.
        var objPdf = document.getElementById("${PAYSLIP_PDF_ELEMENT_ID}");
        if (objPdf && objPdf.textContent.trim()) {
          var strBinary = atob(objPdf.textContent.trim());
          var arrBytes = new Uint8Array(strBinary.length);
          for (var intIndex = 0; intIndex < strBinary.length; intIndex++) arrBytes[intIndex] = strBinary.charCodeAt(intIndex);
          saveFile(new Blob([arrBytes], { type: "application/pdf" }), ${strSafeFileName}.replace(/\\.html$/i, "") + ".pdf");
          return;
        }
        var objCopy = document.documentElement.cloneNode(true);
        var objToolbar = objCopy.querySelector("#" + strToolbarId);
        if (objToolbar) objToolbar.remove();
        // The saved file keeps only the view on screen.
        var objBody = objCopy.querySelector("body");
        if (objBody && objBody.classList.contains(strMonthlyClass)) {
          objCopy.querySelectorAll(".${PAYSLIP_YEAR_BLOCK_CLASS}").forEach(function (objBlock) { objBlock.remove(); });
          objBody.classList.remove(strMonthlyClass);
        }
        saveFile(new Blob(["<!DOCTYPE html>\\n" + objCopy.outerHTML], { type: "text/html;charset=utf-8" }), ${strSafeFileName});
      });
    })();
  </script>
</div>`;
}

export function withPayslipToolbar(
  strHtml: string,
  strFileName: string,
  strTaxInformationUrl?: string,
  strInitialView: "monthly" | "detailed" | "client" = "detailed",
  blnAllowViewSwitch = true,
) {
  // Only offered when the user holds both views (see usePayslipViewChooser).
  const blnViewSwitch = blnAllowViewSwitch && hasPayslipYearBlocks(strHtml);
  const strToolbar = buildPayslipToolbar(strFileName, strTaxInformationUrl, blnViewSwitch);
  const objBodyMatch = /<body([^>]*)>/i.exec(strHtml);
  if (!objBodyMatch) {
    return strToolbar + strHtml;
  }
  // Start in the requested view; the toolbar script reads this class.
  const strBodyTag = blnViewSwitch && strInitialView === "monthly"
    ? `<body class="${PAYSLIP_MONTHLY_CLASS}"${objBodyMatch[1]}>`
    : objBodyMatch[0];
  const intBodyEnd = objBodyMatch.index + objBodyMatch[0].length;
  return strHtml.slice(0, objBodyMatch.index) + strBodyTag + strToolbar + strHtml.slice(intBodyEnd);
}

// Opens the payslip in a new tab with its own toolbar: Monthly / Detailed switch (when given a detailed
// payslip), Tax Information (when a URL is given), Download and Print. (The tab is opened with noopener,
// so this page cannot drive window.print() there - the toolbar does it instead.) The toolbar is hidden on
// paper and stripped from the downloaded copy.
export function printPayslipHtml(
  strHtml: string,
  strFileName = "payslip.html",
  strTaxInformationUrl?: string,
  strInitialView: "monthly" | "detailed" | "client" = "detailed",
  blnAllowViewSwitch = true,
) {
  const strUrl = createPayslipUrl(
    withPayslipToolbar(strHtml, strFileName, strTaxInformationUrl, strInitialView, blnAllowViewSwitch),
  );
  window.open(strUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(strUrl), 30000);
}
