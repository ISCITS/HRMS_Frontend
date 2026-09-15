"use client";

import { useCallback, useState } from "react";

import {
  ALLOWED_DOCUMENT_EXTENSIONS,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_LABEL,
  getFileExtension,
} from "@/lib/fileUploadConstants";
import type { FileUploadProgressHandler } from "@/lib/fileUploadService";

/*
Functional responsibility:
- Client-side pre-flight validation (extension + size + empty-file) shared by every upload surface
  in the app, plus a small async-lifecycle wrapper (progress/error/isUploading) around whichever
  upload call the caller supplies.

Why the upload function is passed in rather than hard-coded here:
- The generic /api/v1/files/upload endpoint only accepts BANK/LOAN/PROFILE (see fileUploadService.ts).
  Reimbursement/IT-Declaration/Leave proof uploads must keep calling their own existing service
  functions (frozen URLs/fields) — this hook stays agnostic of which network call is used so it can
  wrap either one without duplicating validation/progress/error plumbing.

Failure behavior:
- Validation failures and thrown upload errors are captured into `error` (a friendly string) rather
  than re-thrown, so callers can render it the same way existing catch blocks already do.
*/

export function validateFileForUpload(objFile: File): string | null {
  if (!objFile) {
    return "No file was selected.";
  }
  if (objFile.size <= 0) {
    return "The selected file is empty.";
  }
  if (objFile.size > MAX_UPLOAD_SIZE_BYTES) {
    return `"${objFile.name}" is too large. Maximum allowed size is ${MAX_UPLOAD_SIZE_LABEL}.`;
  }
  const strExtension = getFileExtension(objFile.name);
  if (!strExtension || !(ALLOWED_DOCUMENT_EXTENSIONS as readonly string[]).includes(strExtension)) {
    return `"${objFile.name}" is not a supported file type. Allowed types: ${ALLOWED_DOCUMENT_EXTENSIONS.join(", ")}.`;
  }
  return null;
}

// A plain `TResult | null` return from upload() is not enough for callers to react to a failure
// synchronously: `error` below is React state, so a caller that does
// `await upload(...); if (!result) use(error)` right after the call would read a stale (pre-update)
// closure value, not the just-set message. upload() therefore also returns the error message
// directly on failure so callers can act on it immediately, while `error`/`isUploading`/`progress`
// remain available as normal reactive state for rendering.
export type FileUploadOutcome<TResult> =
  | { objResult: TResult; strError?: undefined }
  | { objResult: null; strError: string };

export type UseFileUploadResult<TResult> = {
  progress: number;
  error: string;
  isUploading: boolean;
  reset: () => void;
  setError: (strMessage: string) => void;
  upload: (
    objFile: File,
    fnUpload: (objFile: File, fnOnProgress: FileUploadProgressHandler) => Promise<TResult>
  ) => Promise<FileUploadOutcome<TResult>>;
};

export function useFileUpload<TResult = unknown>(): UseFileUploadResult<TResult> {
  const [intProgress, setIntProgress] = useState(0);
  const [strError, setStrError] = useState("");
  const [blnIsUploading, setBlnIsUploading] = useState(false);

  const reset = useCallback(() => {
    setIntProgress(0);
    setStrError("");
    setBlnIsUploading(false);
  }, []);

  const upload = useCallback(
    async (
      objFile: File,
      fnUpload: (objFile: File, fnOnProgress: FileUploadProgressHandler) => Promise<TResult>
    ): Promise<FileUploadOutcome<TResult>> => {
      setStrError("");
      const strValidationError = validateFileForUpload(objFile);
      if (strValidationError) {
        setStrError(strValidationError);
        return { objResult: null, strError: strValidationError };
      }

      setBlnIsUploading(true);
      setIntProgress(0);
      try {
        const objResult = await fnUpload(objFile, (intPercentComplete) => setIntProgress(intPercentComplete));
        setIntProgress(100);
        return { objResult };
      } catch (objError) {
        const strMessage = objError instanceof Error ? objError.message : "Unable to upload file.";
        setStrError(strMessage);
        return { objResult: null, strError: strMessage };
      } finally {
        setBlnIsUploading(false);
      }
    },
    []
  );

  return { progress: intProgress, error: strError, isUploading: blnIsUploading, reset, setError: setStrError, upload };
}
