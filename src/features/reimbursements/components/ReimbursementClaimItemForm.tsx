"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid, MenuItem, Stack, TextField } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

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
  onClose: () => void;
  onSave: (objPayload: ReimbursementClaimItemRequest, intItemID?: number | null) => Promise<void>;
};

function buildStateFromItem(objItem?: ReimbursementClaimItemDto | null): ItemFormState {
  return {
    intReimbursementCategoryID: objItem?.intReimbursementCategoryID ? String(objItem.intReimbursementCategoryID) : "",
    intSalaryComponentID: objItem?.intSalaryComponentID ? String(objItem.intSalaryComponentID) : "",
    dtExpenseDate: toInputDate(objItem?.dtExpenseDate),
    strExpenseDescription: objItem?.strExpenseDescription ?? "",
    decClaimedAmount: objItem?.decClaimedAmount ? String(objItem.decClaimedAmount) : "",
    strTaxTreatment: objItem?.strTaxTreatment ?? "proof_based",
    blnProofRequired: objItem?.blnProofRequired ?? true,
    strEmployeeRemarks: objItem?.strEmployeeRemarks ?? "",
  };
}

export default function ReimbursementClaimItemForm({ objItem, objOptions, blnOpen, blnSaving, onClose, onSave }: ItemFormProps) {
  const [objForm, setObjForm] = useState<ItemFormState>(buildStateFromItem(objItem));

  useEffect(() => {
    setObjForm(buildStateFromItem(objItem));
  }, [objItem, blnOpen]);

  const objSelectedCategory = useMemo(
    () => objOptions.lstCategories.find((objCategory) => String(objCategory.intID) === objForm.intReimbursementCategoryID) ?? null,
    [objForm.intReimbursementCategoryID, objOptions.lstCategories]
  );

  useEffect(() => {
    if (!blnOpen || objItem || objForm.intReimbursementCategoryID || objOptions.lstCategories.length !== 1) {
      return;
    }
    applySelectedCategory(objOptions.lstCategories[0]);
  }, [blnOpen, objItem, objForm.intReimbursementCategoryID, objOptions.lstCategories]);

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
      objItem?.intID
    );
  }

  const blnSaveDisabled = blnSaving || !objForm.decClaimedAmount || (!objForm.intReimbursementCategoryID && !objForm.intSalaryComponentID);

  return (
    <Dialog open={blnOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{objItem ? "Edit Claim Item" : "Add Claim Item"}</DialogTitle>
      <DialogContent sx={{ pt: "12px !important" }}>
        <Stack spacing={1.3}>
          <Grid container spacing={1.2}>
            <Grid item xs={12} md={6}>
              <TextField required select fullWidth size="small" label="Category" value={objForm.intReimbursementCategoryID} onChange={(objEvent) => applySelectedCategory(objOptions.lstCategories.find((objCategory) => String(objCategory.intID) === objEvent.target.value) ?? null)}>
                <MenuItem value="">Select category</MenuItem>
                {objOptions.lstCategories.map((objCategory) => <MenuItem key={objCategory.intID} value={String(objCategory.intID)}>{objCategory.strCategoryName}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField required select fullWidth size="small" label="Payroll component" value={objForm.intSalaryComponentID} onChange={(objEvent) => setObjForm({ ...objForm, intSalaryComponentID: objEvent.target.value })}>
                <MenuItem value="">Select component</MenuItem>
                {objOptions.lstSalaryComponents.map((objComponent) => <MenuItem key={objComponent.intID} value={String(objComponent.intID)}>{objComponent.strComponentName}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" type="date" label="Expense date" InputLabelProps={{ shrink: true }} value={objForm.dtExpenseDate} onChange={(objEvent) => setObjForm({ ...objForm, dtExpenseDate: objEvent.target.value })} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField required fullWidth size="small" type="number" label="Claimed amount" value={objForm.decClaimedAmount} onChange={(objEvent) => setObjForm({ ...objForm, decClaimedAmount: objEvent.target.value })} inputProps={{ min: 0, step: "0.01" }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select fullWidth size="small" label="Tax treatment" value={objForm.strTaxTreatment} onChange={(objEvent) => setObjForm({ ...objForm, strTaxTreatment: objEvent.target.value as ReimbursementTaxTreatment })}>
                <MenuItem value="proof_based">Proof Based</MenuItem>
                <MenuItem value="taxable">Taxable</MenuItem>
                <MenuItem value="exempt">Exempt</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={2} size="small" label="Expense description" value={objForm.strExpenseDescription} onChange={(objEvent) => setObjForm({ ...objForm, strExpenseDescription: objEvent.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={2} size="small" label="Employee remarks" value={objForm.strEmployeeRemarks} onChange={(objEvent) => setObjForm({ ...objForm, strEmployeeRemarks: objEvent.target.value })} />
            </Grid>
          </Grid>
          <FormControlLabel control={<Checkbox checked={objForm.blnProofRequired} onChange={(objEvent) => setObjForm({ ...objForm, blnProofRequired: objEvent.target.checked })} />} label="Proof required for this item" />
          {objSelectedCategory?.decMaxItemAmount ? (
            <TextField size="small" value={`Category item limit: INR ${objSelectedCategory.decMaxItemAmount}`} InputProps={{ readOnly: true }} />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" startIcon={objItem ? <SaveRoundedIcon /> : <AddRoundedIcon />} onClick={() => void saveItem()} disabled={blnSaveDisabled}>
          {objItem ? "Save Item" : "Add Item"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
