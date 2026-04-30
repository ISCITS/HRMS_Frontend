export function openPayslipHtml(strHtml: string, blnPrint = false) {
  const objBlob = new Blob([strHtml], { type: "text/html;charset=utf-8" });
  const strUrl = URL.createObjectURL(objBlob);
  const objWindow = window.open(strUrl, "_blank", "noopener,noreferrer");

  if (objWindow && blnPrint) {
    objWindow.onload = () => {
      objWindow.focus();
      objWindow.print();
    };
  }

  window.setTimeout(() => URL.revokeObjectURL(strUrl), 30000);
}
