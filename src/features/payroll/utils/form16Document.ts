function createForm16Url(strHtml: string) {
  const objBlob = new Blob([strHtml], { type: "text/html;charset=utf-8" });
  return URL.createObjectURL(objBlob);
}

export function buildForm16FileName(...lstParts: Array<string | number | null | undefined>) {
  const strBaseName = lstParts
    .map((strPart) => String(strPart ?? "").trim())
    .filter(Boolean)
    .join("-");
  const strSafeName = (strBaseName || "form16")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${strSafeName || "form16"}.html`;
}

export function downloadForm16Html(strHtml: string, strFileName: string) {
  const strUrl = createForm16Url(strHtml);
  const objLink = document.createElement("a");

  objLink.href = strUrl;
  objLink.download = strFileName;
  objLink.style.display = "none";
  document.body.appendChild(objLink);
  objLink.click();
  objLink.remove();

  window.setTimeout(() => URL.revokeObjectURL(strUrl), 1000);
}

export function printForm16Html(strHtml: string) {
  const strUrl = createForm16Url(strHtml);
  const objWindow = window.open(strUrl, "_blank", "noopener,noreferrer");

  if (objWindow) {
    objWindow.onload = () => {
      objWindow.focus();
      objWindow.print();
    };
  }

  window.setTimeout(() => URL.revokeObjectURL(strUrl), 30000);
}

export function buildFinancialYearOptions(intCount = 6): string[] {
  const dtNow = new Date();
  const intCurrentStartYear = dtNow.getMonth() >= 3 ? dtNow.getFullYear() : dtNow.getFullYear() - 1;
  return Array.from({ length: intCount }, (_, intIndex) => {
    const intStartYear = intCurrentStartYear - intIndex;
    return `${intStartYear}-${String(intStartYear + 1).slice(-2)}`;
  });
}
