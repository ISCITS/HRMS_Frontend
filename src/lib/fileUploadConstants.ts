// Shared client-side rules for the centralized file/document upload feature.
// Mirrors the server-side validation in the backend file service (extensions, size, empty-file
// rejection) so the UI can reject obviously-bad files before spending a round trip — the server
// remains authoritative (magic-byte content verification cannot be done reliably client-side).

export const ALLOWED_DOCUMENT_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"] as const;

export type AllowedDocumentExtension = (typeof ALLOWED_DOCUMENT_EXTENSIONS)[number];

export const MAX_UPLOAD_SIZE_KB = 500;

export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_KB * 1024;

// Kept for any code that still displays a MB-based label; prefer MAX_UPLOAD_SIZE_LABEL for UI text.
export const MAX_UPLOAD_SIZE_MB = MAX_UPLOAD_SIZE_KB / 1024;

export const MAX_UPLOAD_SIZE_LABEL = `${MAX_UPLOAD_SIZE_KB} KB`;

// Ready-to-use value for an <input type="file" accept="..."> attribute.
export const ALLOWED_DOCUMENT_ACCEPT = ALLOWED_DOCUMENT_EXTENSIONS.join(",");

export function getFileExtension(strFileName: string): string {
  const intDotIndex = strFileName.lastIndexOf(".");
  if (intDotIndex < 0 || intDotIndex === strFileName.length - 1) {
    return "";
  }
  return strFileName.slice(intDotIndex).toLowerCase();
}
