/**
 * Opens a blob/object URL in a new tab via a real anchor click rather than window.open().
 *
 * window.open() called after an `await` (i.e. after fetching/decoding the file content first)
 * breaks the browser's "direct user gesture" chain, so most browsers silently popup-block it -
 * the click appears to do nothing, with no visible error. A programmatic anchor click is not
 * subject to that same block, so this is the safe way to open a just-fetched file for preview.
 */
export function openBlobUrlInNewTab(strUrl: string): void {
  const objAnchor = document.createElement("a");
  objAnchor.href = strUrl;
  objAnchor.target = "_blank";
  objAnchor.rel = "noopener noreferrer";
  document.body.appendChild(objAnchor);
  objAnchor.click();
  document.body.removeChild(objAnchor);
}
