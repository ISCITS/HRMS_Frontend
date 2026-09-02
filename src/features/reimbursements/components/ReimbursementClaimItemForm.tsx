"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import PieChartOutlineOutlinedIcon from "@mui/icons-material/PieChartOutlineOutlined";
import RequestQuoteOutlinedIcon from "@mui/icons-material/RequestQuoteOutlined";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState, type ReactNode } from "react";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import FileRowActions from "@/components/shared/files/FileRowActions";
import FileUploadButton from "@/components/shared/files/FileUploadButton";
import { formatCurrency, toInputDate, translateKnownReimbursementText } from "@/features/reimbursements/formatters";
import ReimbursementClaimStatusBadge from "@/features/reimbursements/components/ReimbursementClaimStatusBadge";
import { useReimbursementLabels } from "@/features/reimbursements/hooks/useReimbursementLabels";
import { reimbursementService } from "@/features/reimbursements/services/reimbursementService";
import { openBlobUrlInNewTab } from "@/lib/openBlobUrlInNewTab";
import type {
  ReimbursementClaimItemDto,
  ReimbursementClaimItemRequest,
  ReimbursementOptionsDto,
  ReimbursementProofDto,
  ReimbursementTaxTreatment,
} from "@/features/reimbursements/types";

type ItemFormState = {
  intSalaryComponentID: string;
  dtExpenseDate: string;
  strExpenseDescription: string;
  decClaimedAmount: string;
  strTaxTreatment: ReimbursementTaxTreatment;
  blnProofRequired: boolean;
  strEmployeeRemarks: string;
};

type ItemFormProps = {
  intClaimID?: number | null;
  objItem?: ReimbursementClaimItemDto | null;
  objOptions: ReimbursementOptionsDto;
  blnOpen: boolean;
  blnSaving: boolean;
  intUploadProgress?: number;
  blnReadOnly?: boolean;
  intEmployeeID?: number | null;
  onClose: () => void;
  onSave: (objPayload: ReimbursementClaimItemRequest, intItemID?: number | null, objProofFile?: File | null) => Promise<void>;
  onDeleteProof?: (intItemID: number, intProofID: number) => Promise<void>;
};

function buildStateFromItem(objItem?: ReimbursementClaimItemDto | null): ItemFormState {
  return {
    intSalaryComponentID: objItem?.intSalaryComponentID ? String(objItem.intSalaryComponentID) : "",
    dtExpenseDate: toInputDate(objItem?.dtExpenseDate) || new Date().toISOString().slice(0, 10),
    strExpenseDescription: objItem?.strExpenseDescription ?? "",
    decClaimedAmount: objItem?.decClaimedAmount ? String(objItem.decClaimedAmount) : "",
    strTaxTreatment: objItem?.strTaxTreatment ?? "proof_based",
    blnProofRequired: objItem?.blnProofRequired ?? false,
    strEmployeeRemarks: objItem?.strEmployeeRemarks ?? "",
  };
}

function formatFileSize(intBytes?: number | null) {
  if (!intBytes) return "";
  if (intBytes < 1024) return `${intBytes} B`;
  if (intBytes < 1024 * 1024) return `${Math.ceil(intBytes / 1024)} KB`;
  return `${(intBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function openBlobInNewTab(objBlob: Blob) {
  const strUrl = URL.createObjectURL(objBlob);
  openBlobUrlInNewTab(strUrl);
  window.setTimeout(() => URL.revokeObjectURL(strUrl), 30000);
}

function openLocalFileInNewTab(objFile: File) {
  const strUrl = URL.createObjectURL(objFile);
  openBlobUrlInNewTab(strUrl);
  window.setTimeout(() => URL.revokeObjectURL(strUrl), 30000);
}

function getReimbursementTypeLabel(strComponentName?: string | null) {
  return (strComponentName || "").replace(/\s*#\d+\s*$/u, "").trim() || "Reimbursement Type";
}

function isSupportingDocumentRequired(objComponent?: ReimbursementOptionsDto["lstSalaryComponents"][number] | null, blnFallbackProofRequired = false) {
  return Boolean(objComponent?.blnDeclarationRequired ?? objComponent?.blnProofRequired ?? blnFallbackProofRequired);
}

function formatChoiceLabel(strValue?: string | null) {
  return (strValue || "-")
    .split("_")
    .map((strPart) => strPart.charAt(0).toUpperCase() + strPart.slice(1))
    .join(" ");
}

function getDisplayAmount(decItemValue?: number | null, decOptionValue?: number | null) {
  if (decItemValue != null && decItemValue > 0) return decItemValue;
  if (decOptionValue != null) return decOptionValue;
  return decItemValue ?? 0;
}

function ComponentInfoMetric({ strLabel, strValue, objIcon, strIconColor, strIconBackground, blnAccent = false }: { strLabel: string; strValue: string; objIcon: ReactNode; strIconColor: string; strIconBackground: string; blnAccent?: boolean }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.35, minWidth: 0 }}>
      <Box sx={{ width: 42, height: 42, borderRadius: "50%", bgcolor: strIconBackground, color: strIconColor, display: "grid", placeItems: "center", flexShrink: 0, "& svg": { fontSize: 22 } }}>
        {objIcon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: "#64748b", fontSize: "0.74rem", fontWeight: 700, lineHeight: 1.25 }}>{strLabel}</Typography>
        <Typography sx={{ mt: 0.35, color: blnAccent ? "#1668dc" : "#0f172a", fontSize: "0.92rem", fontWeight: 900, lineHeight: 1.2, overflowWrap: "anywhere" }}>{strValue}</Typography>
      </Box>
    </Box>
  );
}

export default function ReimbursementClaimItemForm({ intClaimID, objItem, objOptions, blnOpen, blnSaving, intUploadProgress = 0, blnReadOnly = false, intEmployeeID = null, onClose, onSave, onDeleteProof }: ItemFormProps) {
  const { t } = useReimbursementLabels();
  const [objForm, setObjForm] = useState<ItemFormState>(buildStateFromItem(objItem));
  const [objProofFile, setObjProofFile] = useState<File | null>(null);
  const [objProofToDelete, setObjProofToDelete] = useState<ReimbursementProofDto | null>(null);
  const [intPreviewingProofID, setIntPreviewingProofID] = useState<number | null>(null);
  const [intDeletingProofID, setIntDeletingProofID] = useState<number | null>(null);
  const [strProofError, setStrProofError] = useState("");

  useEffect(() => {
    setObjForm(buildStateFromItem(objItem));
    setObjProofFile(null);
    setObjProofToDelete(null);
    setIntPreviewingProofID(null);
    setIntDeletingProofID(null);
    setStrProofError("");
  }, [objItem, blnOpen]);

  useEffect(() => {
    if (!blnOpen || blnReadOnly || objItem || objForm.intSalaryComponentID || objOptions.lstSalaryComponents.length !== 1) {
      return;
    }
    applySelectedSalaryComponent(String(objOptions.lstSalaryComponents[0].intID));
  }, [blnOpen, blnReadOnly, objItem, objForm.intSalaryComponentID, objOptions.lstSalaryComponents]);

  function applySelectedSalaryComponent(strSalaryComponentID: string) {
    const objComponent = objOptions.lstSalaryComponents.find((dicComponent) => String(dicComponent.intID) === strSalaryComponentID) ?? null;
    // Purpose: Copies payroll component tax defaults and derives proof requirement from reimbursement setup.
    const blnProofRequired = isSupportingDocumentRequired(objComponent);
    setObjForm((objCurrent) => ({
      ...objCurrent,
      intSalaryComponentID: strSalaryComponentID,
      strTaxTreatment: objComponent?.strTaxTreatment ?? objCurrent.strTaxTreatment,
      blnProofRequired,
    }));
  }

  async function saveItem() {
    // Purpose: Normalizes form strings into the backend item payload and enforces required client-side fields.
    const decClaimedAmount = Number(objForm.decClaimedAmount);
    const intComponentID = objForm.intSalaryComponentID ? Number(objForm.intSalaryComponentID) : null;
    if (!Number.isFinite(decClaimedAmount) || decClaimedAmount <= 0) return;
    if (blnSelectedComponentProofRequired && !objProofFile && !objItem?.lstProofs?.length) return;
    await onSave(
      {
        intSalaryComponentID: intComponentID && intComponentID > 0 ? intComponentID : null,
        dtExpenseDate: objForm.dtExpenseDate || null,
        strExpenseDescription: objForm.strExpenseDescription.trim() || null,
        decClaimedAmount,
        strTaxTreatment: objForm.strTaxTreatment,
        blnProofRequired: blnSelectedComponentProofRequired,
        strEmployeeRemarks: objForm.strEmployeeRemarks.trim() || null,
      },
      objItem?.intID,
      objProofFile
    );
  }

  async function viewProof(objProof: ReimbursementProofDto) {
    if (!intClaimID) {
      setStrProofError(t("save_claim_item_before_viewing_proof", "Save the claim item before viewing proof."));
      return;
    }

    setIntPreviewingProofID(objProof.intID);
    setStrProofError("");
    try {
      const objPreview = objItem?.intID
        ? await reimbursementService.previewProof(intClaimID, objItem.intID, objProof.intID, intEmployeeID)
        : await reimbursementService.previewProofByID(intClaimID, objProof.intID, intEmployeeID);
      openBlobInNewTab(objPreview);
    } catch (objError) {
      setStrProofError(objError instanceof Error ? objError.message : t("unable_open_proof_file", "Unable to open proof file."));
    } finally {
      setIntPreviewingProofID(null);
    }
  }

  async function deleteProof(objProof: ReimbursementProofDto) {
    if (!objItem?.intID || !onDeleteProof) {
      return;
    }

    setIntDeletingProofID(objProof.intID);
    setStrProofError("");
    try {
      await onDeleteProof(objItem.intID, objProof.intID);
    } catch (objError) {
      setStrProofError(objError instanceof Error ? objError.message : t("unable_delete_proof_file", "Unable to delete proof file."));
    } finally {
      setIntDeletingProofID(null);
    }
  }

  async function confirmDeleteProof() {
    if (!objProofToDelete) {
      return;
    }

    // Purpose: Existing proofs are deleted only after the user confirms the destructive action.
    await deleteProof(objProofToDelete);
    setObjProofToDelete(null);
  }

  // Replace = delete the existing proof (reimbursementService.deleteProof, same as the Delete
  // action above) then queue the newly picked file the same way "Upload Proof" already does —
  // it's uploaded via reimbursementService.uploadProof through the existing onSave(objProofFile)
  // flow once the user clicks Save, so no new call target is introduced.
  async function replaceProof(objProof: ReimbursementProofDto, objNewFile: File) {
    if (!objItem?.intID || !onDeleteProof) {
      return;
    }

    setIntDeletingProofID(objProof.intID);
    setStrProofError("");
    try {
      await onDeleteProof(objItem.intID, objProof.intID);
      setObjProofFile(objNewFile);
    } catch (objError) {
      setStrProofError(objError instanceof Error ? objError.message : t("unable_replace_proof_file", "Unable to replace proof file."));
    } finally {
      setIntDeletingProofID(null);
    }
  }

  const objSelectedSalaryComponent = objOptions.lstSalaryComponents.find((dicComponent) => String(dicComponent.intID) === objForm.intSalaryComponentID) ?? null;
  const blnSelectedComponentProofRequired = isSupportingDocumentRequired(objSelectedSalaryComponent, objForm.blnProofRequired);
  const strReimbursementType = objItem?.strReimbursementType ?? objSelectedSalaryComponent?.strReimbursementType ?? "ctc_based";
  const strSettlementMode = objItem?.strSettlementMode ?? objSelectedSalaryComponent?.strSettlementMode ?? (strReimbursementType === "non_ctc_based" ? "finance" : "payroll");
  const decAnnualLimit = getDisplayAmount(objItem?.decAnnualLimit, objSelectedSalaryComponent?.decAnnualLimit);
  const decMonthlyLimit = getDisplayAmount(objItem?.decMonthlyLimit, objSelectedSalaryComponent?.decMonthlyLimit);
  const decAllocatedLimit = getDisplayAmount(objItem?.decAllocatedLimit, objSelectedSalaryComponent?.decAllocatedLimit);
  const decAlreadyClaimed = getDisplayAmount(objItem?.decAlreadyClaimed, objSelectedSalaryComponent?.decAlreadyClaimed);
  const decBalanceAvailable = getDisplayAmount(
    objItem?.decBalanceAvailable ?? objItem?.decEligibleBalance,
    objSelectedSalaryComponent?.decBalanceAvailable
  ) || Math.max(decAllocatedLimit - decAlreadyClaimed, 0);
  const objReadOnlyProps = { readOnly: blnReadOnly };
  const blnProofUploadRequired = blnSelectedComponentProofRequired && !objItem?.lstProofs?.length;
  const blnSaveDisabled = blnReadOnly || blnSaving || !objForm.decClaimedAmount || !objForm.intSalaryComponentID || (blnProofUploadRequired && !objProofFile);
  const lstExistingProofs = objItem?.lstProofs ?? [];
  const objSmallActionButtonSx = { minHeight: 30, px: 1.15, py: 0.25, borderRadius: "8px", fontSize: "0.75rem", textTransform: "none" };
  const objSmallProofButtonSx = { ...objSmallActionButtonSx, fontWeight: 700, whiteSpace: "nowrap" };
  const lstComponentInfoMetrics = [
    { strLabel: t("reimbursement_type", "Reimbursement Type"), strValue: translateKnownReimbursementText(formatChoiceLabel(strReimbursementType), t), objIcon: <DescriptionOutlinedIcon />, strIconColor: "#2563eb", strIconBackground: "#eaf2ff", blnAccent: true },
    { strLabel: t("annual_limit", "Annual Limit"), strValue: formatCurrency(decAnnualLimit), objIcon: <CalendarMonthOutlinedIcon />, strIconColor: "#2563eb", strIconBackground: "#eaf2ff" },
    { strLabel: t("monthly_limit", "Monthly Limit"), strValue: formatCurrency(decMonthlyLimit), objIcon: <EventNoteOutlinedIcon />, strIconColor: "#0f9f8f", strIconBackground: "#e1f7f3" },
    { strLabel: t("allocated_limit", "Allocated Limit"), strValue: formatCurrency(decAllocatedLimit), objIcon: <PieChartOutlineOutlinedIcon />, strIconColor: "#5b5ce2", strIconBackground: "#eeeeff" },
    { strLabel: t("already_claimed", "Already Claimed"), strValue: formatCurrency(decAlreadyClaimed), objIcon: <RequestQuoteOutlinedIcon />, strIconColor: "#ef4f62", strIconBackground: "#ffecee" },
    { strLabel: t("balance_available", "Balance Available"), strValue: formatCurrency(decBalanceAvailable), objIcon: <AccountBalanceWalletOutlinedIcon />, strIconColor: "#dd8a00", strIconBackground: "#fff3d8", blnAccent: true },
    { strLabel: t("proof_required", "Proof Required"), strValue: blnSelectedComponentProofRequired ? t("yes", "Yes") : t("no", "No"), objIcon: <VerifiedUserOutlinedIcon />, strIconColor: "#16a566", strIconBackground: "#e1f7e9" },
    { strLabel: t("settlement_method", "Settlement Method"), strValue: translateKnownReimbursementText(formatChoiceLabel(strSettlementMode), t), objIcon: <AccountBalanceOutlinedIcon />, strIconColor: "#7048d8", strIconBackground: "#f0eaff" },
  ];

  return (
    <>
      <Dialog open={blnOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1.4, px: 3.2 }}>{blnReadOnly ? t("view_claim_item", "View Claim Item") : objItem ? t("edit_claim_item", "Edit Claim Item") : t("add_claim_item", "Add Claim Item")}</DialogTitle>
      <DialogContent sx={{ pt: "6px !important", pl: "15.6px", pr: "27.6px" }}>
        <Stack spacing={1.3}>
          <Grid container spacing={1.2}>
            <Grid item xs={12} md={6}>
              <TextField required select fullWidth size="small" label={t("reimbursement_type", "Reimbursement Type")} controlId="reimbursements.claim-item.payroll-component.select" inputProps={{ "controlId": "reimbursements.claim-item.payroll-component.select" }} value={objForm.intSalaryComponentID} disabled={blnReadOnly} onChange={(objEvent) => applySelectedSalaryComponent(objEvent.target.value)} InputProps={objReadOnlyProps} SelectProps={{ readOnly: blnReadOnly }}>
                <MenuItem value="">{t("reimbursement_type", "Reimbursement Type")}</MenuItem>
                {objOptions.lstSalaryComponents.map((objComponent) => <MenuItem controlId="reimbursements.claim-item.payroll-component.option" data-option-key={objComponent.intID} key={objComponent.intID} value={String(objComponent.intID)}>{translateKnownReimbursementText(getReimbursementTypeLabel(objComponent.strComponentName), t)}</MenuItem>)}
              </TextField>
              <Typography controlId="reimbursements.claim-item.supporting-document.label" sx={{ mt: 0.45, color: "#94a3b8", fontSize: "0.74rem", fontWeight: 400 }}>
                {t("supporting_document", "Supporting Document")}:{" "}
                <Typography component="span" sx={{ color: blnSelectedComponentProofRequired ? "#dc2626" : "#64748b", fontSize: "inherit", fontWeight: 400 }}>
                  {blnSelectedComponentProofRequired ? t("required", "Required") : t("optional", "Optional")}
                </Typography>
              </Typography>
            </Grid>
         
            <Grid item xs={12} md={3}>
              <TextField required fullWidth size="small" type="date" controlId="reimbursements.claim-item.expense-date.input" inputProps={{ "controlId": "reimbursements.claim-item.expense-date.input" }} label={t("expense_date", "Expense Date")} InputLabelProps={{ shrink: true }} value={objForm.dtExpenseDate} disabled={blnReadOnly} onChange={(objEvent) => setObjForm({ ...objForm, dtExpenseDate: objEvent.target.value })} InputProps={objReadOnlyProps} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField required fullWidth size="small" type="number" controlId="reimbursements.claim-item.claimed-amount.input" label={t("claimed_amount", "Claimed Amount")} value={objForm.decClaimedAmount} disabled={blnReadOnly} onChange={(objEvent) => setObjForm({ ...objForm, decClaimedAmount: objEvent.target.value })} inputProps={{ min: 0, step: "0.01", readOnly: blnReadOnly, "controlId": "reimbursements.claim-item.claimed-amount.input" }} />
            </Grid>
            {objSelectedSalaryComponent || objItem ? (
              <Grid item xs={12}>
                <Box controlId="reimbursements.claim-item.component-info.panel" sx={{ border: "1px solid #d8e2f0", borderRadius: "14px", px: { xs: 1.25, sm: 1.8 }, py: 1.7, bgcolor: "#fbfdff", boxShadow: "0 1px 4px rgba(15, 23, 42, 0.03)" }}>
                  <Grid container rowSpacing={2.4}>
                    {lstComponentInfoMetrics.map((objMetric, intIndex) => (
                      <Grid
                        item
                        xs={6}
                        md={3}
                        key={objMetric.strLabel}
                        sx={{
                          minWidth: 0,
                          px: { xs: 1, sm: 1.5 },
                          borderRight: {
                            xs: intIndex % 2 === 0 ? "1px solid #e3eaf3" : "none",
                            md: intIndex % 4 !== 3 ? "1px solid #e3eaf3" : "none",
                          },
                        }}
                      >
                        <ComponentInfoMetric {...objMetric} />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Grid>
            ) : null}
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={2} size="small" controlId="reimbursements.claim-item.expense-description.input" inputProps={{ "controlId": "reimbursements.claim-item.expense-description.input" }} label={t("expense_description", "Expense Description")} value={objForm.strExpenseDescription} disabled={blnReadOnly} onChange={(objEvent) => setObjForm({ ...objForm, strExpenseDescription: objEvent.target.value })} InputProps={objReadOnlyProps} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={2} size="small" controlId="reimbursements.claim-item.employee-remarks.input" inputProps={{ "controlId": "reimbursements.claim-item.employee-remarks.input" }} label={t("employee_remarks", "Employee Remarks")} value={objForm.strEmployeeRemarks} disabled={blnReadOnly} onChange={(objEvent) => setObjForm({ ...objForm, strEmployeeRemarks: objEvent.target.value })} InputProps={objReadOnlyProps} />
            </Grid>
            {lstExistingProofs.length ? (
              <Grid item xs={12}>
                <Box sx={{ display: "grid", gap: 0.75, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                  {lstExistingProofs.map((objProof) => (
                    <Stack key={objProof.intID} direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" spacing={0.8} sx={{ border: "1px solid #dbe3ef", borderRadius: "8px", px: 1, py: 0.75, minWidth: 0 }}>
                      <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0 }}>
                        <InsertDriveFileOutlinedIcon sx={{ color: "#2563eb", fontSize: 20, flexShrink: 0 }} />
                        <Stack sx={{ minWidth: 0 }}>
                          <Typography title={objProof.strFileName || t("proof_document", "Proof document")} sx={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{objProof.strFileName || t("proof_document", "Proof document")}</Typography>
                          <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>{[objProof.strFileMimeType, formatFileSize(objProof.intFileSizeBytes)].filter(Boolean).join(" | ") || t("uploaded_proof", "Uploaded proof")}</Typography>
                        </Stack>
                      </Stack>
                      <Stack direction="row" spacing={0.6} alignItems="center" justifyContent={{ xs: "flex-start", sm: "flex-end" }}>
                        <ReimbursementClaimStatusBadge strStatus={objProof.strVerificationStatus} />
                        <FileRowActions
                          strFileName={objProof.strFileName || t("proof_document", "Proof document")}
                          controlIdPrefix={`reimbursements.claim-item.proof.${objProof.intID}`}
                          disabled={blnReadOnly}
                          busy={intPreviewingProofID === objProof.intID || intDeletingProofID === objProof.intID}
                          onPreview={() => void viewProof(objProof)}
                          onReplace={onDeleteProof ? (objNewFile) => void replaceProof(objProof, objNewFile) : undefined}
                          onDelete={onDeleteProof ? () => setObjProofToDelete(objProof) : undefined}
                        />
                      </Stack>
                    </Stack>
                  ))}
                </Box>
              </Grid>
            ) : null}
          </Grid>
          {strProofError ? <Alert severity="error" sx={{ borderRadius: "8px" }}>{strProofError}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3.2, pt: 1.4, pb: 2.2 }}>
        <Button controlId="reimbursements.claim-item.close.button" 
        size="small" 
        onClick={onClose} 
        variant={blnReadOnly ? "contained" : "outlined"} 
        sx={{ ...objSmallActionButtonSx, fontWeight: 700 }}>{blnReadOnly ? t("close", "Close") : t("cancel", "Cancel")}
        </Button>
        {!blnReadOnly ? (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={0.8} alignItems={{ xs: "flex-start", sm: "center" }} sx={{ ml: { sm: "auto" } }}>
            {objProofFile && !(blnSaving && intUploadProgress > 0) ? (
              <Stack direction="row" spacing={0.6} alignItems="center">
                <Typography title={objProofFile.name} sx={{ fontSize: "0.78rem", color: "#475569", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{objProofFile.name}</Typography>
                <FileRowActions
                  strFileName={objProofFile.name}
                  controlIdPrefix="reimbursements.claim-item.queued-proof"
                  onPreview={() => openLocalFileInNewTab(objProofFile)}
                  onDelete={() => setObjProofFile(null)}
                />
              </Stack>
            ) : null}
            <FileUploadButton
              controlId="reimbursements.claim-item.upload-proof.button"
              label={t("upload_proof", "Upload Proof")}
              replaceLabel={t("upload_proof", "Upload Proof")}
              hasExistingFile={false}
              isUploading={blnSaving && Boolean(objProofFile) && intUploadProgress > 0}
              progress={intUploadProgress}
              onFilesSelected={(lstSelected) => { setObjProofFile(lstSelected[0] ?? null); setStrProofError(""); }}
              onValidationError={(strMessage) => setStrProofError(strMessage)}
              sx={objSmallProofButtonSx}
            />
          </Stack>
        ) : null}

        {!blnReadOnly ? <Button controlId="reimbursements.claim-item.save.button" size="small" variant="contained" startIcon={objItem ? <SaveRoundedIcon /> : <AddRoundedIcon />} onClick={() => void saveItem()} disabled={blnSaveDisabled} sx={{ ...objSmallActionButtonSx, fontWeight: 800 }}>
          {objItem ? t("save_claim_item", "Save Claim Item") : t("add_claim_item", "Add Claim Item")}
        </Button> : null}
      </DialogActions>
      </Dialog>
      <CommonConfirmDialog
        rootControlId="reimbursements.claim-item.delete-proof.dialog"
        blnOpen={Boolean(objProofToDelete)}
        strTitle={t("confirm_delete_attachment_title", "Delete Attachment?")}
        strMessage={t("confirm_delete_attachment_message", "Are you sure you want to delete {fileName}? This action cannot be undone.").replace(
          "{fileName}",
          objProofToDelete?.strFileName || t("this_attachment", "this attachment")
        )}
        strCancelLabel={t("cancel", "Cancel")}
        strConfirmLabel={t("delete", "Delete")}
        blnConfirmDisabled={Boolean(intDeletingProofID)}
        blnCancelDisabled={Boolean(intDeletingProofID)}
        onClose={() => !intDeletingProofID && setObjProofToDelete(null)}
        onConfirm={() => void confirmDeleteProof()}
        cancelButtonControlId="reimbursements.claim-item.delete-proof.cancel.button"
        confirmButtonControlId="reimbursements.claim-item.delete-proof.confirm.button"
        messageControlId="reimbursements.claim-item.delete-proof.message"
      />
    </>
  );
}
