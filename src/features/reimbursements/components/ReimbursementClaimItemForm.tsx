"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState, type InputHTMLAttributes } from "react";

import { toInputDate } from "@/features/reimbursements/formatters";
import ReimbursementClaimStatusBadge from "@/features/reimbursements/components/ReimbursementClaimStatusBadge";
import { reimbursementService } from "@/features/reimbursements/services/reimbursementService";
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
  blnReadOnly?: boolean;
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

function openPreviewInNewTab(strMimeType: string, strBase64Content: string) {
  const strUrl = `data:${strMimeType || "application/octet-stream"};base64,${strBase64Content}`;
  window.open(strUrl, "_blank", "noopener,noreferrer");
}

function openLocalFileInNewTab(objFile: File) {
  const strUrl = URL.createObjectURL(objFile);
  window.open(strUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(strUrl), 30000);
}

function getReimbursementTypeLabel(strComponentName?: string | null) {
  return (strComponentName || "").replace(/\s*#\d+\s*$/u, "").trim() || "Reimbursement Type";
}

function isSupportingDocumentRequired(objComponent?: ReimbursementOptionsDto["lstSalaryComponents"][number] | null, blnFallbackProofRequired = false) {
  return Boolean(objComponent?.blnDeclarationRequired ?? objComponent?.blnProofRequired ?? blnFallbackProofRequired);
}

export default function ReimbursementClaimItemForm({ intClaimID, objItem, objOptions, blnOpen, blnSaving, blnReadOnly = false, onClose, onSave, onDeleteProof }: ItemFormProps) {
  const [objForm, setObjForm] = useState<ItemFormState>(buildStateFromItem(objItem));
  const [objProofFile, setObjProofFile] = useState<File | null>(null);
  const [intPreviewingProofID, setIntPreviewingProofID] = useState<number | null>(null);
  const [intDeletingProofID, setIntDeletingProofID] = useState<number | null>(null);
  const [strProofError, setStrProofError] = useState("");

  useEffect(() => {
    setObjForm(buildStateFromItem(objItem));
    setObjProofFile(null);
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
      blnSelectedComponentProofRequired ? objProofFile : null
    );
  }

  async function viewProof(objProof: ReimbursementProofDto) {
    if (!intClaimID || !objItem?.intID) {
      setStrProofError("Save the claim item before viewing proof.");
      return;
    }

    setIntPreviewingProofID(objProof.intID);
    setStrProofError("");
    try {
      const objPreview = await reimbursementService.previewProof(intClaimID, objItem.intID, objProof.intID);
      openPreviewInNewTab(objPreview.strMimeType, objPreview.strBase64Content);
    } catch (objError) {
      setStrProofError(objError instanceof Error ? objError.message : "Unable to open proof file.");
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
      setStrProofError(objError instanceof Error ? objError.message : "Unable to delete proof file.");
    } finally {
      setIntDeletingProofID(null);
    }
  }

  const objSelectedSalaryComponent = objOptions.lstSalaryComponents.find((dicComponent) => String(dicComponent.intID) === objForm.intSalaryComponentID) ?? null;
  const blnSelectedComponentProofRequired = isSupportingDocumentRequired(objSelectedSalaryComponent, objForm.blnProofRequired);
  const objReadOnlyProps = { readOnly: blnReadOnly };
  const blnProofUploadRequired = blnSelectedComponentProofRequired && !objItem?.lstProofs?.length;
  const blnSaveDisabled = blnReadOnly || blnSaving || !objForm.decClaimedAmount || !objForm.intSalaryComponentID || (blnProofUploadRequired && !objProofFile);
  const lstExistingProofs = objItem?.lstProofs ?? [];
  const objSmallActionButtonSx = { minHeight: 30, px: 1.15, py: 0.25, borderRadius: "8px", fontSize: "0.75rem", textTransform: "none" };
  const objSmallProofButtonSx = { ...objSmallActionButtonSx, fontWeight: 700, whiteSpace: "nowrap" };

  return (
    <Dialog open={blnOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1.4, px: 3.2 }}>{blnReadOnly ? "View Claim Item" : objItem ? "Edit Claim Item" : "Add Claim Item"}</DialogTitle>
      <DialogContent sx={{ pt: "6px !important", pl: "15.6px", pr: "27.6px" }}>
        <Stack spacing={1.3}>
          <Grid container spacing={1.2}>
            <Grid item xs={12} md={6}>
              <TextField required select fullWidth size="small" label="Reimbursement Type" data-testid="reimbursements.claim-item.payroll-component.select" inputProps={{ "data-testid": "reimbursements.claim-item.payroll-component.select" }} value={objForm.intSalaryComponentID} disabled={blnReadOnly} onChange={(objEvent) => applySelectedSalaryComponent(objEvent.target.value)} InputProps={objReadOnlyProps} SelectProps={{ readOnly: blnReadOnly }}>
                <MenuItem value="">Reimbursement Type</MenuItem>
                {objOptions.lstSalaryComponents.map((objComponent) => <MenuItem data-testid="reimbursements.claim-item.payroll-component.option" data-option-key={objComponent.intID} key={objComponent.intID} value={String(objComponent.intID)}>{getReimbursementTypeLabel(objComponent.strComponentName)}</MenuItem>)}
              </TextField>
              <Typography data-testid="reimbursements.claim-item.supporting-document.label" sx={{ mt: 0.45, color: "#94a3b8", fontSize: "0.74rem", fontWeight: 400 }}>
                Supporting Document:{" "}
                <Typography component="span" sx={{ color: blnSelectedComponentProofRequired ? "#dc2626" : "#64748b", fontSize: "inherit", fontWeight: 400 }}>
                  {blnSelectedComponentProofRequired ? "Required" : "Optional"}
                </Typography>
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField required fullWidth size="small" type="date" data-testid="reimbursements.claim-item.expense-date.input" inputProps={{ "data-testid": "reimbursements.claim-item.expense-date.input" }} label="Expense Date" InputLabelProps={{ shrink: true }} value={objForm.dtExpenseDate} disabled={blnReadOnly} onChange={(objEvent) => setObjForm({ ...objForm, dtExpenseDate: objEvent.target.value })} InputProps={objReadOnlyProps} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField required fullWidth size="small" type="number" data-testid="reimbursements.claim-item.claimed-amount.input" label="Claimed Amount" value={objForm.decClaimedAmount} disabled={blnReadOnly} onChange={(objEvent) => setObjForm({ ...objForm, decClaimedAmount: objEvent.target.value })} inputProps={{ min: 0, step: "0.01", readOnly: blnReadOnly, "data-testid": "reimbursements.claim-item.claimed-amount.input" }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={2} size="small" data-testid="reimbursements.claim-item.expense-description.input" inputProps={{ "data-testid": "reimbursements.claim-item.expense-description.input" }} label="Expense Description" value={objForm.strExpenseDescription} disabled={blnReadOnly} onChange={(objEvent) => setObjForm({ ...objForm, strExpenseDescription: objEvent.target.value })} InputProps={objReadOnlyProps} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={2} size="small" data-testid="reimbursements.claim-item.employee-remarks.input" inputProps={{ "data-testid": "reimbursements.claim-item.employee-remarks.input" }} label="Employee Remarks" value={objForm.strEmployeeRemarks} disabled={blnReadOnly} onChange={(objEvent) => setObjForm({ ...objForm, strEmployeeRemarks: objEvent.target.value })} InputProps={objReadOnlyProps} />
            </Grid>
          </Grid>
          {strProofError ? <Alert severity="error" sx={{ borderRadius: "8px" }}>{strProofError}</Alert> : null}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between">
            <FormControlLabel control={<Checkbox checked={blnSelectedComponentProofRequired} disabled={blnReadOnly || !blnSelectedComponentProofRequired} onChange={(objEvent) => setObjForm({ ...objForm, blnProofRequired: objEvent.target.checked })} inputProps={{ "data-testid": "reimbursements.claim-item.proof-required.checkbox" } as InputHTMLAttributes<HTMLInputElement>} />} label={<Typography component="span" sx={{ fontSize: "0.86rem" }}>Proof required for this item{blnSelectedComponentProofRequired ? <Typography component="span" aria-hidden="true" sx={{ color: "#d32f2f", ml: 0.3 }}>*</Typography> : null}</Typography>} />
            {blnSelectedComponentProofRequired && !blnReadOnly ? (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={0.8} alignItems={{ xs: "flex-start", sm: "center" }} sx={{ ml: { sm: "auto" } }}>
                {objProofFile ? (
                  <Stack direction="row" spacing={0.6} alignItems="center">
                    <Typography title={objProofFile.name} sx={{ fontSize: "0.78rem", color: "#475569", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{objProofFile.name}</Typography>
                    <Button size="small" variant="text" startIcon={<VisibilityRoundedIcon />} onClick={() => openLocalFileInNewTab(objProofFile)} sx={objSmallProofButtonSx}>View</Button>
                    <Button size="small" variant="text" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => setObjProofFile(null)} sx={objSmallProofButtonSx}>Delete</Button>
                  </Stack>
                ) : null}
                <Button data-testid="reimbursements.claim-item.upload-proof.button" size="small" variant="outlined" component="label" sx={objSmallProofButtonSx}>
                  Upload Proof
                  <input hidden data-testid="reimbursements.claim-item.upload-proof.input" type="file" onChange={(objEvent) => setObjProofFile(objEvent.target.files?.[0] ?? null)} />
                </Button>
              </Stack>
            ) : null}
          </Stack>
          {lstExistingProofs.length ? (
            <Stack spacing={0.75}>
              {lstExistingProofs.map((objProof) => (
                <Stack key={objProof.intID} direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" spacing={0.8} sx={{ border: "1px solid #dbe3ef", borderRadius: "8px", px: 1, py: 0.75 }}>
                  <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0 }}>
                    <InsertDriveFileOutlinedIcon sx={{ color: "#2563eb", fontSize: 20, flexShrink: 0 }} />
                    <Stack sx={{ minWidth: 0 }}>
                      <Typography title={objProof.strFileName || "Proof document"} sx={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{objProof.strFileName || "Proof document"}</Typography>
                      <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>{[objProof.strFileMimeType, formatFileSize(objProof.intFileSizeBytes)].filter(Boolean).join(" | ") || "Uploaded proof"}</Typography>
                    </Stack>
                  </Stack>
                  <Stack direction="row" spacing={0.6} alignItems="center" justifyContent={{ xs: "flex-start", sm: "flex-end" }}>
                    <ReimbursementClaimStatusBadge strStatus={objProof.strVerificationStatus} />
                    <Button data-testid="reimbursements.claim-item.view-proof.button" data-proof-id={objProof.intID} size="small" variant="outlined" startIcon={<VisibilityRoundedIcon />} disabled={intPreviewingProofID === objProof.intID} onClick={() => void viewProof(objProof)} sx={objSmallProofButtonSx}>
                      {intPreviewingProofID === objProof.intID ? "Opening..." : "View"}
                    </Button>
                    {!blnReadOnly && onDeleteProof ? (
                      <Button data-testid="reimbursements.claim-item.delete-proof.button" data-proof-id={objProof.intID} size="small" variant="outlined" color="error" startIcon={<DeleteOutlineRoundedIcon />} disabled={blnSaving || intDeletingProofID === objProof.intID} onClick={() => void deleteProof(objProof)} sx={objSmallProofButtonSx}>
                        {intDeletingProofID === objProof.intID ? "Deleting..." : "Delete"}
                      </Button>
                    ) : null}
                  </Stack>
                </Stack>
              ))}
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3.2, pt: 1.4, pb: 2.2 }}>
        <Button data-testid="reimbursements.claim-item.close.button" size="small" onClick={onClose} variant={blnReadOnly ? "contained" : "text"} sx={{ ...objSmallActionButtonSx, fontWeight: 700 }}>{blnReadOnly ? "Close" : "Cancel"}</Button>
        {!blnReadOnly ? <Button data-testid="reimbursements.claim-item.save.button" size="small" variant="contained" startIcon={objItem ? <SaveRoundedIcon /> : <AddRoundedIcon />} onClick={() => void saveItem()} disabled={blnSaveDisabled} sx={{ ...objSmallActionButtonSx, fontWeight: 800 }}>
          {objItem ? "Save Claim Item" : "Add Claim Item"}
        </Button> : null}
      </DialogActions>
    </Dialog>
  );
}
