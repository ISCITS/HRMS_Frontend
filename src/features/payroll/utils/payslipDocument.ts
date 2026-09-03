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

export function printPayslipHtml(strHtml: string) {
  const strUrl = createPayslipUrl(strHtml);
  const objWindow = window.open(strUrl, "_blank", "noopener,noreferrer");

  if (objWindow) {
    objWindow.onload = () => {
      objWindow.focus();
      objWindow.print();
    };
  }

  window.setTimeout(() => URL.revokeObjectURL(strUrl), 30000);
}
