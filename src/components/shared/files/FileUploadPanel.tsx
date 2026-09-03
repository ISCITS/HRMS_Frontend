"use client";

import { Alert, Box, Divider, Paper, Stack, Typography, type ButtonProps } from "@mui/material";
import { useEffect, useState } from "react";

import FileList from "@/components/shared/files/FileList";
import FileUploadButton from "@/components/shared/files/FileUploadButton";
import { useFileUpload } from "@/hooks/useFileUpload";
import { fileUploadService, type EssSelfServiceFileModule, type FileMetadataDto } from "@/lib/fileUploadService";
import { MAX_UPLOAD_SIZE_LABEL } from "@/lib/fileUploadConstants";

/*
Functional responsibility:
- Self-contained "document manager" panel for the BANK/LOAN/PROFILE self-service modules: lists the
  employee's existing files for a given related-entity, and lets them upload/replace/delete/preview
  through the generic /api/v1/files endpoints (fileUploadService.ts). Built as one orchestration
  component so the Bank Details and Loan/Advance ESS pages don't each re-implement the same
  list/upload/replace/delete wiring around the FileUploadButton/FileList presentational pieces.

Inputs:
- module + relatedEntityId (+ optional relatedEntityType/documentType) identify which document set
  this panel manages. When relatedEntityId is falsy the panel renders `disabledMessage` instead of
  the upload controls (e.g. bank/loan record not saved yet, so there's nothing to attach a file to).

Failure behavior:
- List/upload/replace/delete errors are caught and surfaced as an inline Alert using the same
  catch -> setError -> render pattern used elsewhere in the app (e.g. ProfileForm.tsx).
*/

type FileUploadPanelProps = {
  module: EssSelfServiceFileModule;
  relatedEntityId?: number | null;
  relatedEntityType?: string;
  documentType?: string;
  controlIdPrefix: string;
  title?: string;
  description?: string;
  disabledMessage?: string;
  emptyMessage?: string;
  uploadLabel?: string;
  uploadPresentation?: "button" | "dropzone";
  uploadButtonSx?: ButtonProps["sx"];
  // Read-only mode: still lists existing documents, but hides upload/replace/delete controls
  // (e.g. the caller's edit-rights check failed, or the record itself is locked/read-only).
  readOnly?: boolean;
  // When true, renders as a plain section (divider + no border/shadow) instead of its own Paper
  // card, so it can be embedded inside another card (e.g. under a save button) without a
  // card-inside-a-card look.
  embedded?: boolean;
  // Passed straight through to FileList — "grid" packs two documents per row on wider screens
  // instead of the default single full-width row per document.
  layout?: "stack" | "grid";
};

export default function FileUploadPanel({
  module: strModule,
  relatedEntityId: intRelatedEntityID,
  relatedEntityType: strRelatedEntityType,
  documentType: strDocumentType,
  controlIdPrefix,
  title = "Documents",
  description,
  disabledMessage = "Save the record above before attaching documents.",
  emptyMessage = "No documents uploaded yet.",
  uploadLabel = "Upload Document",
  uploadPresentation = "button",
  uploadButtonSx,
  readOnly = false,
  embedded = false,
  layout = "stack",
}: FileUploadPanelProps) {
  const [lstFiles, setLstFiles] = useState<FileMetadataDto[]>([]);
  const [blnLoadingList, setBlnLoadingList] = useState(false);
  const [strError, setStrError] = useState("");
  const [intBusyFileID, setIntBusyFileID] = useState<number | null>(null);
  const [intReplacingFileID, setIntReplacingFileID] = useState<number | null>(null);
  const objUpload = useFileUpload<FileMetadataDto>();
  const objReplace = useFileUpload<FileMetadataDto>();

  const blnHasRelatedEntity = Boolean(intRelatedEntityID && intRelatedEntityID > 0);

  useEffect(() => {
    if (!blnHasRelatedEntity) {
      setLstFiles([]);
      return;
    }

    let blnMounted = true;
    async function loadFiles() {
      setBlnLoadingList(true);
      setStrError("");
      try {
        const lstResult = await fileUploadService.listFiles({
          strModule,
          intRelatedEntityID,
          strRelatedEntityType,
        });
        if (blnMounted) {
          setLstFiles(lstResult);
        }
      } catch (objError) {
        if (blnMounted) {
          setStrError(objError instanceof Error ? objError.message : "Unable to load uploaded documents.");
        }
      } finally {
        if (blnMounted) {
          setBlnLoadingList(false);
        }
      }
    }

    void loadFiles();
    return () => {
      blnMounted = false;
    };
  }, [blnHasRelatedEntity, strModule, intRelatedEntityID, strRelatedEntityType]);

  async function handleUpload(lstSelectedFiles: File[]) {
    const objFile = lstSelectedFiles[0];
    if (!objFile || !blnHasRelatedEntity) {
      return;
    }
    setStrError("");
    const { objResult, strError: strUploadError } = await objUpload.upload(objFile, (objFileToUpload, fnOnProgress) =>
      fileUploadService.uploadFile({
        objFile: objFileToUpload,
        strModule,
        strDocumentType,
        intRelatedEntityID,
        strRelatedEntityType,
        fnOnProgress,
      })
    );
    if (objResult) {
      setLstFiles((lstPrevious) => [objResult, ...lstPrevious]);
    } else if (strUploadError) {
      setStrError(strUploadError);
    }
  }

  async function handleReplace(objExistingFile: FileMetadataDto, objNewFile: File) {
    setStrError("");
    setIntReplacingFileID(objExistingFile.intFileID);
    try {
      const { objResult, strError: strReplaceError } = await objReplace.upload(objNewFile, (objFileToUpload, fnOnProgress) =>
        fileUploadService.replaceFile(objExistingFile.intFileID, objFileToUpload, fnOnProgress)
      );
      if (objResult) {
        setLstFiles((lstPrevious) => lstPrevious.map((objFile) => (objFile.intFileID === objExistingFile.intFileID ? objResult : objFile)));
      } else if (strReplaceError) {
        setStrError(strReplaceError);
      }
    } finally {
      setIntReplacingFileID(null);
    }
  }

  async function handleDelete(objFile: FileMetadataDto) {
    setStrError("");
    setIntBusyFileID(objFile.intFileID);
    try {
      await fileUploadService.deleteFile(objFile.intFileID);
      setLstFiles((lstPrevious) => lstPrevious.filter((objRow) => objRow.intFileID !== objFile.intFileID));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to delete document.");
    } finally {
      setIntBusyFileID(null);
    }
  }

  async function handlePreview(objFile: FileMetadataDto) {
    setStrError("");
    setIntBusyFileID(objFile.intFileID);
    try {
      await fileUploadService.previewFile(objFile.intFileID);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to open document.");
    } finally {
      setIntBusyFileID(null);
    }
  }

  const nodeFileList = blnLoadingList ? (
    <Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>Loading documents...</Typography>
  ) : (
    <FileList
      lstFiles={lstFiles}
      controlIdPrefix={controlIdPrefix}
      disabled={readOnly}
      emptyMessage={emptyMessage}
      layout={layout}
      intBusyFileID={intBusyFileID}
      intReplacingFileID={intReplacingFileID}
      intReplaceProgress={objReplace.progress}
      onPreview={(objFile) => void handlePreview(objFile)}
      onDelete={readOnly ? undefined : (objFile) => void handleDelete(objFile)}
      onReplace={readOnly ? undefined : (objFile, objNewFile) => void handleReplace(objFile, objNewFile)}
      onReplaceValidationError={(strMessage) => setStrError(strMessage)}
    />
  );

  const nodeUpload = !readOnly ? (
    <Stack spacing={0.4} alignItems="flex-start" sx={{ width: "100%" }}>
      <FileUploadButton
        controlId={`${controlIdPrefix}.upload.button`}
        label={uploadPresentation === "dropzone" ? "Click to upload or drag and drop" : uploadLabel}
        presentation={uploadPresentation}
        sx={uploadButtonSx}
        helperText={uploadPresentation === "dropzone" ? `PDF, JPG or PNG, up to ${MAX_UPLOAD_SIZE_LABEL}.` : undefined}
        isUploading={objUpload.isUploading}
        progress={objUpload.progress}
        onFilesSelected={(lstSelected) => void handleUpload(lstSelected)}
        onValidationError={(strMessage) => setStrError(strMessage)}
      />
      <Typography sx={{ fontSize: "0.7rem", color: "#94a3b8" }}>
        {uploadPresentation === "dropzone" ? "Accepted formats: " : ""}PDF, JPG or PNG, up to {MAX_UPLOAD_SIZE_LABEL}.
      </Typography>
    </Stack>
  ) : null;

  const objContent = (
    <Stack spacing={1.1}>
        {embedded ? <Divider sx={{ my: 0.5 }} /> : null}
        <Stack spacing={0.25}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.94rem" }}>{title}</Typography>
          {description ? <Typography sx={{ fontSize: "0.78rem", color: "#64748b" }}>{description}</Typography> : null}
        </Stack>

        {!blnHasRelatedEntity ? (
          <Alert severity="info" sx={{ borderRadius: "8px" }}>
            {disabledMessage}
          </Alert>
        ) : (
          <>
            {strError ? (
              <Alert severity="error" sx={{ borderRadius: "8px" }} onClose={() => setStrError("")}>
                {strError}
              </Alert>
            ) : null}

            {uploadPresentation === "dropzone" && nodeUpload ? (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.9fr" }, gap: { xs: 1.25, md: 2 }, alignItems: "start" }}>
                {nodeUpload}
                <Stack spacing={0.65} sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: "0.74rem", fontWeight: 700, color: "text.secondary" }}>Document Status</Typography>
                  {nodeFileList}
                </Stack>
              </Box>
            ) : (
              <>
                {nodeFileList}
                {nodeUpload}
              </>
            )}
          </>
        )}
    </Stack>
  );

  if (embedded) {
    return <Box>{objContent}</Box>;
  }

  return (
    <Paper sx={{ p: { xs: 1.5, md: 2 }, borderRadius: "16px", border: "1px solid #e2e8f0" }}>
      {objContent}
    </Paper>
  );
}
