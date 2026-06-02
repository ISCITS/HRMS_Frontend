"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";

import { toInputDate } from "@/features/reimbursements/formatters";
import type {
  ReimbursementCategoryOption,
  ReimbursementClaimItemDto,
  ReimbursementClaimItemRequest,
  ReimbursementOptionsDto,
  ReimbursementTaxTreatment,
} from "@/features/reimbursements/types";

type ItemFormState = {
  intReimbursementCategoryID: string;
  intSalaryComponentID: string;
  dtExpenseDate: string;
  strExpenseDescription: string;
  decClaimedAmount: string;
  strTaxTreatment: ReimbursementTaxTreatment;
  blnProofRequired: boolean;
  strEmployeeRemarks: string;
};

type ItemFormProps = {
  objItem?: ReimbursementClaimItemDto | null;
  objOptions: ReimbursementOptionsDto;
  blnOpen: boolean;
  blnSaving: boolean;
  blnReadOnly?: boolean;
  onClose: () => void;
  onSave: (objPayload: ReimbursementClaimItemRequest, intItemID?: number | null, objProofFile?: File | null) => Promise<void>;
};

function buildStateFromItem(objItem?: ReimbursementClaimItemDto | null): ItemFormState {
  return {
    intReimbursementCategoryID: objItem?.intReimbursementCategoryID ? String(objItem.intReimbursementCategoryID) : "",
    intSalaryComponentID: objItem?.intSalaryComponentID ? String(objItem.intSalaryComponentID) : "",
    dtExpenseDate: toInputDate(objItem?.dtExpenseDate) || new Date().toISOString().slice(0, 10),
    strExpenseDescription: objItem?.strExpenseDescription ?? "",
    decClaimedAmount: objItem?.decClaimedAmount ? String(objItem.decClaimedAmount) : "",
    strTaxTreatment: objItem?.strTaxTreatment ?? "proof_based",
    blnProofRequired: objItem?.blnProofRequired ?? true,
    strEmployeeRemarks: objItem?.strEmployeeRemarks ?? "",
  };
}

export default function ReimbursementClaimItemForm({ objItem, objOptions, blnOpen, blnSaving, blnReadOnly = false, onClose, onSave }: ItemFormProps) {
  const [objForm, setObjForm] = useState<ItemFormState>(buildStateFromItem(objItem));
  const [objProofFile, setObjProofFile] = useState<File | null>(null);

  useEffect(() => {
    setObjForm(buildStateFromItem(objItem));
    setObjProofFile(null);
  }, [objItem, blnOpen]);

  const objSelectedCategory = useMemo(
    () => objOptions.lstCategories.find((objCategory) => String(objCategory.intID) === objForm.intReimbursementCategoryID) ?? null,
    [objForm.intReimbursementCategoryID, objOptions.lstCategories]
  );

  useEffect(() => {
    if (!blnOpen || blnReadOnly || objItem || objForm.intReimbursementCategoryID || objOptions.lstCategories.length !== 1) {
      return;
    }
    applySelectedCategory(objOptions.lstCategories[0]);
  }, [blnOpen, blnReadOnly, objItem, objForm.intReimbursementCategoryID, objOptions.lstCategories]);

  function applySelectedCategory(objCategory: ReimbursementCategoryOption | null) {
    // Purpose: Copies category-level tax/proof/payroll defaults into the item draft for consistent payroll mapping.
    setObjForm((objCurrent) => ({
      ...objCurrent,
      intReimbursementCategoryID: objCategory ? String(objCategory.intID) : "",
      intSalaryComponentID: objCategory?.intSalaryComponentID ? String(objCategory.intSalaryComponentID) : objCurrent.intSalaryComponentID,
      strTaxTreatment: objCategory?.strTaxTreatment ?? objCurrent.strTaxTreatment,
      blnProofRequired: objCategory?.blnProofRequired ?? objCurrent.blnProofRequired,
    }));
  }

  async function saveItem() {
    // Purpose: Normalizes form strings into the backend item payload and enforces required client-side fields.
    const decClaimedAmount = Number(objForm.decClaimedAmount);
    const intCategoryID = objForm.intReimbursementCategoryID ? Number(objForm.intReimbursementCategoryID) : null;
    const intComponentID = objForm.intSalaryComponentID ? Number(objForm.intSalaryComponentID) : null;
    if (!Number.isFinite(decClaimedAmount) || decClaimedAmount <= 0) return;
    await onSave(
      {
        intReimbursementCategoryID: intCategoryID && intCategoryID > 0 ? intCategoryID : null,
        intSalaryComponentID: intComponentID && intComponentID > 0 ? intComponentID : null,
        dtExpenseDate: objForm.dtExpenseDate || null,
        strExpenseDescription: objForm.strExpenseDescription.trim() || null,
        decClaimedAmount,
        strTaxTreatment: objForm.strTaxTreatment,
        blnProofRequired: objForm.blnProofRequired,
        strEmployeeRemarks: objForm.strEmployeeRemarks.trim() || null,
      },
      objItem?.intID,
      objForm.blnProofRequired ? objProofFile : null
    );
  }

  const objReadOnlyProps = { readOnly: blnReadOnly };
  const blnSaveDisabled = blnReadOnly || blnSaving || !objForm.decClaimedAmount || (!objForm.intReimbursementCategoryID && !objForm.intSalaryComponentID);

  return (
    <Dialog open={blnOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{blnReadOnly ? "View Claim Item" : objItem ? "Edit Claim Item" : "Add Claim Item"}</DialogTitle>
      <DialogContent sx={{ pt: "12px !important" }}>
        <Stack spacing={1.3}>
          <Grid container spacing={1.2}>
            <Grid item xs={12} md={6}>
              <TextField data-testid="reimbursements.claim-item.category.select" required select fullWidth size="small" label="Category" value={objForm.intReimbursementCategoryID} disabled={blnReadOnly} onChange={(objEvent) => applySelectedCategory(objOptions.lstCategories.find((objCategory) => String(objCategory.intID) === objEvent.target.value) ?? null)} InputProps={objReadOnlyProps} SelectProps={{ readOnly: blnReadOnly }}>
                <MenuItem value="">Select category</MenuItem>
                {objOptions.lstCategories.map((objCategory) => <MenuItem key={objCategory.intID} value={String(objCategory.intID)}>{objCategory.strCategoryName}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField required select fullWidth size="small" label="Payroll component" data-testid="reimbursements.claim-item.payroll-component.select" inputProps={{ "data-testid": "reimbursements.claim-item.payroll-component.select" }} value={objForm.intSalaryComponentID} disabled={blnReadOnly} onChange={(objEvent) => setObjForm({ ...objForm, intSalaryComponentID: objEvent.target.value })} InputProps={objReadOnlyProps} SelectProps={{ readOnly: blnReadOnly }}>
                <MenuItem value="">Select component</MenuItem>
                {objOptions.lstSalaryComponents.map((objComponent) => <MenuItem data-testid="reimbursements.claim-item.payroll-component.option" data-option-key={objComponent.intID} key={objComponent.intID} value={String(objComponent.intID)}>{objComponent.strComponentName}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" type="date" data-testid="reimbursements.claim-item.expense-date.input" inputProps={{ "data-testid": "reimbursements.claim-item.expense-date.input" }} label="Expense date" InputLabelProps={{ shrink: true }} value={objForm.dtExpenseDate} disabled={blnReadOnly} onChange={(objEvent) => setObjForm({ ...objForm, dtExpenseDate: objEvent.target.value })} InputProps={objReadOnlyProps} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField required fullWidth size="small" type="number" data-testid="reimbursements.claim-item.claimed-amount.input" label="Claimed amount" value={objForm.decClaimedAmount} disabled={blnReadOnly} onChange={(objEvent) => setObjForm({ ...objForm, decClaimedAmount: objEvent.target.value })} inputProps={{ min: 0, step: "0.01", readOnly: blnReadOnly, "data-testid": "reimbursements.claim-item.claimed-amount.input" }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={2} size="small" data-testid="reimbursements.claim-item.expense-description.input" inputProps={{ "data-testid": "reimbursements.claim-item.expense-description.input" }} label="Expense description" value={objForm.strExpenseDescription} disabled={blnReadOnly} onChange={(objEvent) => setObjForm({ ...objForm, strExpenseDescription: objEvent.target.value })} InputProps={objReadOnlyProps} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={2} size="small" data-testid="reimbursements.claim-item.employee-remarks.input" inputProps={{ "data-testid": "reimbursements.claim-item.employee-remarks.input" }} label="Employee remarks" value={objForm.strEmployeeRemarks} disabled={blnReadOnly} onChange={(objEvent) => setObjForm({ ...objForm, strEmployeeRemarks: objEvent.target.value })} InputProps={objReadOnlyProps} />
            </Grid>
          </Grid>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between">
            <FormControlLabel control={<Checkbox checked={objForm.blnProofRequired} disabled={blnReadOnly} onChange={(objEvent) => setObjForm({ ...objForm, blnProofRequired: objEvent.target.checked })} inputProps={{ "data-testid": "reimbursements.claim-item.proof-required.checkbox" } as InputHTMLAttributes<HTMLInputElement>} />} label="Proof required for this item" />
            {objForm.blnProofRequired && !blnReadOnly ? (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={0.8} alignItems={{ xs: "flex-start", sm: "center" }} sx={{ ml: { sm: "auto" } }}>
                {objProofFile ? <Typography sx={{ fontSize: "0.78rem", color: "#475569", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{objProofFile.name}</Typography> : null}
                <Button data-testid="reimbursements.claim-item.upload-proof.button" variant="outlined" component="label" sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px", whiteSpace: "nowrap" }}>
                  Upload Proof
                  <input hidden data-testid="reimbursements.claim-item.upload-proof.input" type="file" onChange={(objEvent) => setObjProofFile(objEvent.target.files?.[0] ?? null)} />
                </Button>
              </Stack>
            ) : null}
            {objForm.blnProofRequired && blnReadOnly && objItem?.lstProofs?.length ? (
              <Typography sx={{ fontSize: "0.78rem", color: "#475569", fontWeight: 700 }}>{objItem.lstProofs.length} proof{objItem.lstProofs.length === 1 ? "" : "s"} uploaded</Typography>
            ) : null}
          </Stack>
          {objSelectedCategory?.decMaxItemAmount ? (
            <TextField size="small" value={`Category item limit: INR ${objSelectedCategory.decMaxItemAmount}`} InputProps={{ readOnly: true }} />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button data-testid="reimbursements.claim-item.close.button" onClick={onClose} variant={blnReadOnly ? "contained" : "text"} sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}>{blnReadOnly ? "Close" : "Cancel"}</Button>
        {!blnReadOnly ? <Button data-testid="reimbursements.claim-item.save.button" variant="contained" startIcon={objItem ? <SaveRoundedIcon /> : <AddRoundedIcon />} onClick={() => void saveItem()} disabled={blnSaveDisabled}>
          {objItem ? "Save Item" : "Add Item"}
        </Button> : null}
      </DialogActions>
    </Dialog>
  );
}
