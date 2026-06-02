"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Grid, IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import ReimbursementClaimItemForm from "@/features/reimbursements/components/ReimbursementClaimItemForm";
import ReimbursementClaimStatusBadge from "@/features/reimbursements/components/ReimbursementClaimStatusBadge";
import ReimbursementClaimSummaryCard from "@/features/reimbursements/components/ReimbursementClaimSummaryCard";
import { formatCurrency, formatDateLabel, toInputDate } from "@/features/reimbursements/formatters";
import { canEditReimbursementClaim, canWithdrawReimbursementClaim, getMissingProofItems } from "@/features/reimbursements/rules";
import { reimbursementService } from "@/features/reimbursements/services/reimbursementService";
import type { ReimbursementCategoryOption, ReimbursementClaimDto, ReimbursementClaimItemDto, ReimbursementClaimItemRequest, ReimbursementClaimRequest, ReimbursementOptionsDto, ReimbursementSalaryComponentOption } from "@/features/reimbursements/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type EditorMode = "create" | "edit" | "detail";

type HeaderFormState = {
  strClaimTitle: string;
  strFinancialYearCode: string;
  dtClaimDate: string;
  strEmployeeRemarks: string;
};

const objEmptyOptions: ReimbursementOptionsDto = { lstCategories: [], lstSalaryComponents: [] };
const lstReimbursementModuleCodes = ["REIMBURSEMENT", "REIMBURSEMENTS", "ESS_REIMBURSEMENT", "ESS_REIMBURSEMENTS"];

function getErrorMessage(objError: unknown) {
  return objError instanceof Error ? objError.message : "Unable to process reimbursement request.";
}

function buildHeaderState(objClaim?: ReimbursementClaimDto | null): HeaderFormState {
  return {
    strClaimTitle: objClaim?.strClaimTitle ?? "",
    strFinancialYearCode: objClaim?.strFinancialYearCode ?? getCurrentFinancialYearCode(),
    dtClaimDate: toInputDate(objClaim?.dtClaimDate) || new Date().toISOString().slice(0, 10),
    strEmployeeRemarks: objClaim?.strEmployeeRemarks ?? "",
  };
}

function getCurrentFinancialYearCode() {
  const objToday = new Date();
  const intCalendarYear = objToday.getFullYear();
  const intStartYear = objToday.getMonth() >= 3 ? intCalendarYear : intCalendarYear - 1;
  return `${intStartYear}-${intStartYear + 1}`;
}

function getFinancialYearOptions() {
  const strCurrentYear = getCurrentFinancialYearCode();
  const intCurrentStartYear = Number(strCurrentYear.slice(0, 4));
  return [`${intCurrentStartYear - 1}-${intCurrentStartYear}`, strCurrentYear];
}

function normalizeHeaderValue(strValue?: string | null) {
  return (strValue ?? "").trim();
}

export default function ReimbursementClaimEditorPage({ intClaimID, strMode }: { intClaimID?: number | null; strMode: EditorMode }) {
  const objRouter = useRouter();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstReimbursementModuleCodes);
  const [objClaim, setObjClaim] = useState<ReimbursementClaimDto | null>(null);
  const [objOptions, setObjOptions] = useState<ReimbursementOptionsDto>(objEmptyOptions);
  const [objHeader, setObjHeader] = useState<HeaderFormState>(buildHeaderState());
  const [objEditingItem, setObjEditingItem] = useState<ReimbursementClaimItemDto | null>(null);
  const [objDeletingItem, setObjDeletingItem] = useState<ReimbursementClaimItemDto | null>(null);
  const [blnViewingItem, setBlnViewingItem] = useState(false);
  const [blnItemDialogOpen, setBlnItemDialogOpen] = useState(false);
  const [blnLoading, setBlnLoading] = useState(strMode !== "create");
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");

  const blnCanView = canViewAny() || canDoAny("list");
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanSubmit = canDoAny("submit");
  const blnExistingClaim = Boolean(objClaim?.intID);
  const blnEditable = (strMode === "create" ? blnCanAdd : blnCanEdit) && (strMode === "create" || canEditReimbursementClaim(objClaim?.strClaimStatus));
  const blnReadOnly = strMode === "detail" || !blnEditable;
  const lstMissingProofItems = useMemo(() => getMissingProofItems(objClaim), [objClaim]);
  const lstFinancialYearOptions = useMemo(() => {
    const lstOptions = getFinancialYearOptions();
    if (objHeader.strFinancialYearCode && !lstOptions.includes(objHeader.strFinancialYearCode)) {
      return [objHeader.strFinancialYearCode, ...lstOptions];
    }
    return lstOptions;
  }, [objHeader.strFinancialYearCode]);
  const strPageTitle = normalizeHeaderValue(objHeader.strClaimTitle)
    || normalizeHeaderValue(objClaim?.strClaimTitle)
    || (objClaim?.intID ? `Reimbursement Claim #${objClaim.intID}` : "New Reimbursement Claim");
  const blnHeaderDirty = useMemo(() => {
    if (!objClaim) return false;
    return (
      normalizeHeaderValue(objHeader.strClaimTitle) !== normalizeHeaderValue(objClaim.strClaimTitle) ||
      normalizeHeaderValue(objHeader.strFinancialYearCode) !== normalizeHeaderValue(objClaim.strFinancialYearCode) ||
      normalizeHeaderValue(objHeader.dtClaimDate) !== normalizeHeaderValue(toInputDate(objClaim.dtClaimDate)) ||
      normalizeHeaderValue(objHeader.strEmployeeRemarks) !== normalizeHeaderValue(objClaim.strEmployeeRemarks)
    );
  }, [objClaim, objHeader]);
  const objEffectiveOptions = useMemo<ReimbursementOptionsDto>(() => {
    const lstCategories = [...objOptions.lstCategories];
    const lstSalaryComponents = [...objOptions.lstSalaryComponents];
    const setCategoryIDs = new Set(lstCategories.map((objCategory) => objCategory.intID));
    const setComponentIDs = new Set(lstSalaryComponents.map((objComponent) => objComponent.intID));

    (objClaim?.lstItems ?? []).forEach((objItem) => {
      if (objItem.intReimbursementCategoryID && !setCategoryIDs.has(objItem.intReimbursementCategoryID)) {
        const objCategory: ReimbursementCategoryOption = {
          intID: objItem.intReimbursementCategoryID,
          strCategoryCode: `CATEGORY_${objItem.intReimbursementCategoryID}`,
          strCategoryName: objItem.strExpenseDescription || `Category #${objItem.intReimbursementCategoryID}`,
          intSalaryComponentID: objItem.intSalaryComponentID ?? null,
          strTaxTreatment: objItem.strTaxTreatment ?? "proof_based",
          blnProofRequired: objItem.blnProofRequired,
          decMaxClaimAmount: null,
          decMaxItemAmount: null,
        };
        lstCategories.push(objCategory);
        setCategoryIDs.add(objCategory.intID);
      }

      if (objItem.intSalaryComponentID && !setComponentIDs.has(objItem.intSalaryComponentID)) {
        const objComponent: ReimbursementSalaryComponentOption = {
          intID: objItem.intSalaryComponentID,
          strComponentCode: `COMPONENT_${objItem.intSalaryComponentID}`,
          strComponentName: `Payroll Component #${objItem.intSalaryComponentID}`,
          strTaxTreatment: objItem.strTaxTreatment ?? "proof_based",
          blnProofRequired: objItem.blnProofRequired,
        };
        lstSalaryComponents.push(objComponent);
        setComponentIDs.add(objComponent.intID);
      }
    });

    return { lstCategories, lstSalaryComponents };
  }, [objClaim?.lstItems, objOptions.lstCategories, objOptions.lstSalaryComponents]);

  useEffect(() => {
    let blnMounted = true;

    async function loadEditor() {
      if (blnRightsLoading || (!blnCanView && !blnCanAdd && !blnCanEdit)) {
        setBlnLoading(false);
        return;
      }

      // Purpose: Binds claim detail first so the edit form is not blocked by option lookup failures.
      setBlnLoading(true);
      setStrError("");

      try {
        const objLoadedClaim = intClaimID ? await reimbursementService.getClaim(intClaimID) : null;
        if (!blnMounted) return;
        setObjClaim(objLoadedClaim);
        setObjHeader(buildHeaderState(objLoadedClaim));
      } catch (objError) {
        if (!blnMounted) return;
        setStrError(getErrorMessage(objError));
      } finally {
        if (blnMounted) setBlnLoading(false);
      }

      try {
        const objLoadedOptions = await reimbursementService.getOptions();
        if (!blnMounted) return;
        setObjOptions(objLoadedOptions);
      } catch (objError) {
        if (!blnMounted) return;
        setObjOptions(objEmptyOptions);
        setStrError((strCurrent) => strCurrent || getErrorMessage(objError));
      }
    }

    void loadEditor();

    return () => {
      blnMounted = false;
    };
  }, [intClaimID, strMode, blnRightsLoading, blnCanView, blnCanAdd, blnCanEdit]);

  function buildClaimPayload(): ReimbursementClaimRequest {
    // Purpose: Converts header fields into the ESS claim create/update payload.
    return {
      strClaimTitle: objHeader.strClaimTitle.trim() || null,
      strFinancialYearCode: objHeader.strFinancialYearCode.trim() || null,
      dtClaimDate: objHeader.dtClaimDate || null,
      strEmployeeRemarks: objHeader.strEmployeeRemarks.trim() || null,
    };
  }

  async function saveHeader(options?: { blnSilent?: boolean }) {
    if (!blnEditable) {
      return null;
    }

    // Purpose: Creates the draft claim or persists editable header changes before item work continues.
    setBlnSaving(true);
    setStrError("");
    try {
      const objSavedClaim = objClaim
        ? await reimbursementService.updateClaim(objClaim.intID, buildClaimPayload())
        : await reimbursementService.createClaim(buildClaimPayload());
      setObjClaim(objSavedClaim);
      setObjHeader(buildHeaderState(objSavedClaim));
      if (!options?.blnSilent) {
        setStrSuccess("Claim draft saved.");
      }
      if (strMode === "create") {
        window.history.replaceState(null, "", `/ess/reimbursements/${objSavedClaim.intID}/edit`);
      }
      return objSavedClaim;
    } catch (objError) {
      setStrError(getErrorMessage(objError));
      return null;
    } finally {
      setBlnSaving(false);
    }
  }

  async function openAddItemDialog() {
    setObjEditingItem(null);
    setBlnViewingItem(false);
    setBlnItemDialogOpen(true);
  }

  async function saveItem(objPayload: ReimbursementClaimItemRequest, intItemID?: number | null, objProofFile?: File | null) {
    if (!blnEditable) {
      return;
    }

    // Purpose: Saves an item against the persisted draft/released claim and refreshes claim totals.
    setBlnSaving(true);
    setStrError("");
    try {
      let objClaimForSave = objClaim;
      if (!objClaimForSave?.intID) {
        objClaimForSave = await reimbursementService.createClaim(buildClaimPayload());
        setObjClaim(objClaimForSave);
        setObjHeader(buildHeaderState(objClaimForSave));
        if (strMode === "create") {
          window.history.replaceState(null, "", `/ess/reimbursements/${objClaimForSave.intID}/edit`);
        }
      } else if (blnHeaderDirty) {
        const objSavedHeader = await reimbursementService.updateClaim(objClaimForSave.intID, buildClaimPayload());
        setObjClaim(objSavedHeader);
        setObjHeader(buildHeaderState(objSavedHeader));
        objClaimForSave = objSavedHeader;
      }
      const objUpdatedClaim = await reimbursementService.saveItem(objClaimForSave.intID, objPayload, intItemID);
      let objFinalClaim = objUpdatedClaim;
      if (objProofFile) {
        const setPreviousItemIDs = new Set((objClaimForSave.lstItems ?? []).map((objItem) => objItem.intID));
        const objSavedItem = intItemID
          ? objUpdatedClaim.lstItems?.find((objItem) => objItem.intID === intItemID)
          : objUpdatedClaim.lstItems?.find((objItem) => !setPreviousItemIDs.has(objItem.intID)) ?? objUpdatedClaim.lstItems?.at(-1);
        if (objSavedItem?.intID) {
          objFinalClaim = await reimbursementService.uploadProof(objClaimForSave.intID, objSavedItem.intID, objProofFile);
        }
      }
      setObjClaim(objFinalClaim);
      setObjHeader(buildHeaderState({ ...objFinalClaim, strClaimTitle: objFinalClaim.strClaimTitle ?? objClaimForSave.strClaimTitle }));
      setBlnItemDialogOpen(false);
      setObjEditingItem(null);
      setBlnViewingItem(false);
      setStrSuccess("Claim item saved.");
    } catch (objError) {
      setStrError(getErrorMessage(objError));
    } finally {
      setBlnSaving(false);
    }
  }

  async function deleteItem(intItemID: number) {
    if (!blnEditable) {
      return;
    }

    // Purpose: Removes an editable item and refreshes reimbursement totals.
    if (!objClaim?.intID) return;
    setBlnSaving(true);
    setStrError("");
    try {
      setObjClaim(await reimbursementService.deleteItem(objClaim.intID, intItemID));
      setObjDeletingItem(null);
      setStrSuccess("Claim item deleted.");
    } catch (objError) {
      setStrError(getErrorMessage(objError));
    } finally {
      setBlnSaving(false);
    }
  }

  async function uploadProof(intItemID: number, objFile: File) {
    // Purpose: Adds employee proof to an editable item before submission.
    if (!objClaim?.intID) return;
    setObjClaim(await reimbursementService.uploadProof(objClaim.intID, intItemID, objFile));
    setStrSuccess("Proof uploaded.");
  }

  async function deleteProof(intItemID: number, intProofID: number) {
    // Purpose: Deletes a proof from an editable item when the employee replaces or corrects evidence.
    if (!objClaim?.intID) return;
    setObjClaim(await reimbursementService.deleteProof(objClaim.intID, intItemID, intProofID));
    setStrSuccess("Proof deleted.");
  }

  async function submitClaim() {
    if (!blnCanSubmit) {
      return;
    }

    // Purpose: Submits only complete claims with at least one item and all required proofs attached.
    if (!objClaim?.intID) return;
    if ((objClaim.lstItems ?? []).length === 0) {
      setStrError("Add at least one reimbursement item before submitting.");
      return;
    }
    if (lstMissingProofItems.length > 0) {
      setStrError("Upload proof for every proof-required item before submitting.");
      return;
    }
    setBlnSaving(true);
    setStrError("");
    try {
      const objSubmittedClaim = await reimbursementService.submitClaim(objClaim.intID);
      setObjClaim(objSubmittedClaim);
      setObjHeader(buildHeaderState(objSubmittedClaim));
      setStrSuccess("Claim submitted for review.");
      objRouter.replace(`/ess/reimbursements/${objSubmittedClaim.intID}`);
    } catch (objError) {
      setStrError(getErrorMessage(objError));
    } finally {
      setBlnSaving(false);
    }
  }

  async function withdrawClaim() {
    // Purpose: Withdraws a submitted/resubmitted claim before HR review starts.
    if (!objClaim?.intID) return;
    setBlnSaving(true);
    setStrError("");
    try {
      const objWithdrawnClaim = await reimbursementService.withdrawClaim(objClaim.intID);
      setObjClaim(objWithdrawnClaim);
      setObjHeader(buildHeaderState(objWithdrawnClaim));
      setStrSuccess("Claim moved back to draft.");
    } catch (objError) {
      setStrError(getErrorMessage(objError));
    } finally {
      setBlnSaving(false);
    }
  }

  const dicCategoryNameByID = useMemo(
    () => new Map(objEffectiveOptions.lstCategories.map((objCategory) => [objCategory.intID, objCategory.strCategoryName])),
    [objEffectiveOptions.lstCategories]
  );
  const dicComponentNameByID = useMemo(
    () => new Map(objEffectiveOptions.lstSalaryComponents.map((objComponent) => [objComponent.intID, objComponent.strComponentName])),
    [objEffectiveOptions.lstSalaryComponents]
  );

  return (
    <Stack spacing={1.4}>
      <BlockingLoader blnOpen={blnLoading || blnRightsLoading} strLabel="Loading reimbursement claim..." />
      <Paper sx={{ p: 0.9, borderRadius: "12px", border: "1px solid rgba(37, 99, 235, 0.2)", background: "linear-gradient(100deg, #0f4b8b 0%, #0d6ca1 64%, #0d7f9c 100%)", color: "#f8fcff" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} gap={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton size="small" onClick={() => objRouter.push("/ess/reimbursements")} aria-label="Back to claims" data-testid="reimbursements.claim-editor.back.icon-button" sx={{ color: "#f8fcff", "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" } }}><ArrowBackRoundedIcon fontSize="small" /></IconButton>
            <ReceiptLongOutlinedIcon sx={{ fontSize: 20 }} />
            <Box>
              <Typography sx={{ color: "#f8fcff", fontWeight: 800, fontSize: "1rem" }}>{strPageTitle}</Typography>
              <Typography sx={{ color: "rgba(239,252,255,0.92)", fontSize: "0.74rem" }}>{blnReadOnly ? "View claim details and reviewer/payroll status." : "Save a draft, add expense items, upload proof, and submit."}</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={0.8} flexWrap="wrap" justifyContent={{ xs: "flex-start", md: "flex-end" }} alignItems="center">
            {objClaim ? <ReimbursementClaimStatusBadge strStatus={objClaim.strClaimStatus} size="medium" /> : null}
            {blnReadOnly && blnCanEdit && objClaim && canEditReimbursementClaim(objClaim.strClaimStatus) ? (
              <Button variant="contained" size="small" startIcon={<EditRoundedIcon />} onClick={() => objRouter.push(`/ess/reimbursements/${objClaim.intID}/edit`)} sx={{ minHeight: 30, borderRadius: "8px", backgroundColor: "#0b3f73", color: "#ffffff", fontWeight: 700, fontSize: "0.76rem", textTransform: "none", boxShadow: "none", "&:hover": { backgroundColor: "#0a355f", boxShadow: "none" } }}>Edit</Button>
            ) : null}
            {!blnReadOnly ? (
              <Button variant="contained" size="small" startIcon={<SaveRoundedIcon />} onClick={() => void saveHeader()} disabled={blnSaving} data-testid="reimbursements.claim-editor.save-draft.button" sx={{ minHeight: 30, borderRadius: "8px", backgroundColor: "#0b3f73", color: "#ffffff", fontWeight: 700, fontSize: "0.76rem", textTransform: "none", boxShadow: "none", "&:hover": { backgroundColor: "#0a355f", boxShadow: "none" }, "&.Mui-disabled": { backgroundColor: "rgba(11,63,115,0.42)", color: "rgba(255,255,255,0.58)" } }}>Save Draft</Button>
            ) : null}
            {objClaim && canWithdrawReimbursementClaim(objClaim.strClaimStatus) ? (
              <Button variant="outlined" size="small" startIcon={<UndoRoundedIcon />} onClick={() => void withdrawClaim()} disabled={blnSaving} data-testid="reimbursements.claim-editor.withdraw.button" sx={{ minHeight: 30, borderRadius: "8px", borderColor: "#f59e0b", color: "#f59e0b", fontWeight: 800, fontSize: "0.76rem", textTransform: "none", "&:hover": { borderColor: "#d97706", backgroundColor: "rgba(245,158,11,0.08)" }, "&.Mui-disabled": { borderColor: "rgba(245,158,11,0.34)", color: "rgba(245,158,11,0.48)" } }}>Withdraw</Button>
            ) : null}
            {!blnReadOnly && blnCanSubmit && objClaim ? (
              <Button variant="contained" size="small" startIcon={<SendRoundedIcon />} onClick={() => void submitClaim()} disabled={blnSaving} data-testid="reimbursements.claim-editor.submit.button" sx={{ minHeight: 30, borderRadius: "8px", backgroundColor: "#f59e0b", color: "#111827", fontWeight: 800, fontSize: "0.76rem", textTransform: "none", boxShadow: "none", "&:hover": { backgroundColor: "#d97706", boxShadow: "none" }, "&.Mui-disabled": { backgroundColor: "rgba(245,158,11,0.38)", color: "rgba(17,24,39,0.52)" } }}>Submit</Button>
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      {strRightsError ? <Alert severity="warning" sx={{ borderRadius: "8px" }}>{strRightsError}</Alert> : null}
      {!blnCanView && !blnCanAdd && !blnCanEdit ? <Alert severity="warning" sx={{ borderRadius: "8px" }}>Reimbursement access is not available for your user group.</Alert> : null}
      {strError ? <Alert severity="error" sx={{ borderRadius: "8px" }}>{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success" onClose={() => setStrSuccess("")} sx={{ borderRadius: "8px" }}>{strSuccess}</Alert> : null}
      {objClaim ? <ReimbursementClaimSummaryCard objClaim={objClaim} /> : null}
      {objClaim?.strReviewerRemarks ? <Alert severity={objClaim.strClaimStatus === "rejected" ? "error" : "info"} sx={{ borderRadius: "8px" }}>{objClaim.strReviewerRemarks}</Alert> : null}

      <Paper sx={{ p: 1.2, borderRadius: "8px", border: "1px solid #dbe3ef" }}>
        <Grid container spacing={1.2}>
          <Grid item xs={12} md={4}>
            <TextField fullWidth size="small" label="Claim title" value={objHeader.strClaimTitle} onChange={(objEvent) => setObjHeader({ ...objHeader, strClaimTitle: objEvent.target.value })} InputProps={{ readOnly: blnReadOnly }} data-testid="reimbursements.claim-editor.title.input" />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField select fullWidth size="small" label="Financial year" value={objHeader.strFinancialYearCode} onChange={(objEvent) => setObjHeader({ ...objHeader, strFinancialYearCode: objEvent.target.value })} InputProps={{ readOnly: blnReadOnly }} SelectProps={{ readOnly: blnReadOnly }} data-testid="reimbursements.claim-editor.financial-year.select">
              {lstFinancialYearOptions.map((strFinancialYear) => <MenuItem key={strFinancialYear} value={strFinancialYear}>{strFinancialYear}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth type="date" size="small" label="Claim date" InputLabelProps={{ shrink: true }} value={objHeader.dtClaimDate} onChange={(objEvent) => setObjHeader({ ...objHeader, dtClaimDate: objEvent.target.value })} InputProps={{ readOnly: blnReadOnly }} data-testid="reimbursements.claim-editor.claim-date.input" />
          </Grid>
          <Grid item xs={12} md={2}>
            <Stack spacing={0.35} sx={{ minHeight: 40, justifyContent: "center" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.72rem", fontWeight: 700 }}>Mode</Typography>
              <Typography sx={{ color: "#0f172a", fontSize: "0.88rem", fontWeight: 800 }}>{blnReadOnly ? "Read only" : "Editable"}</Typography>
            </Stack>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline minRows={2} size="small" label="Employee remarks" value={objHeader.strEmployeeRemarks} onChange={(objEvent) => setObjHeader({ ...objHeader, strEmployeeRemarks: objEvent.target.value })} InputProps={{ readOnly: blnReadOnly }} data-testid="reimbursements.claim-editor.employee-remarks.input" />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ borderRadius: "8px", border: "1px solid #dbe3ef", overflow: "hidden" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.1 }}>
          <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>Claim Items</Typography>
          {!blnReadOnly ? (
            <Button variant="contained" size="small" startIcon={<AddRoundedIcon />} onClick={() => void openAddItemDialog()} disabled={blnSaving} data-testid="reimbursements.claim-editor.add-item.button" sx={{ textTransform: "none", fontWeight: 800, borderRadius: "8px" }}>Add Item</Button>
          ) : null}
        </Stack>
        {!blnExistingClaim ? <Alert severity="info" sx={{ mx: 1.1, mb: 1.1, borderRadius: "8px" }}>Claim number will be generated when you save the first item or save the draft.</Alert> : null}
        <TableContainer>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead sx={{ backgroundColor: "#f8fafc" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Item</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Claimed</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Approved</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Proof</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(objClaim?.lstItems ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={7}><Typography sx={{ py: 2.5, textAlign: "center", color: "#64748b" }}>No items added yet.</Typography></TableCell></TableRow>
              ) : null}
              {(objClaim?.lstItems ?? []).map((objItem) => {
                const strCategory = objItem.intReimbursementCategoryID ? dicCategoryNameByID.get(objItem.intReimbursementCategoryID) : null;
                const strComponent = objItem.intSalaryComponentID ? dicComponentNameByID.get(objItem.intSalaryComponentID) : null;
                return (
                  <TableRow key={objItem.intID} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 800 }}>{strCategory || strComponent || objItem.strExpenseDescription || `Item #${objItem.intID}`}</Typography>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>{objItem.strExpenseDescription || objItem.strEmployeeRemarks || "-"}</Typography>
                      {objItem.strReviewerRemarks ? <Typography sx={{ fontSize: "0.75rem", color: "#b45309" }}>{objItem.strReviewerRemarks}</Typography> : null}
                    </TableCell>
                    <TableCell>{formatDateLabel(objItem.dtExpenseDate)}</TableCell>
                    <TableCell><ReimbursementClaimStatusBadge strStatus={objItem.strItemStatus} /></TableCell>
                    <TableCell align="right">{formatCurrency(objItem.decClaimedAmount)}</TableCell>
                    <TableCell align="right">{formatCurrency(objItem.decApprovedAmount)}</TableCell>
                    <TableCell sx={{ minWidth: 260 }}>
                      <Typography sx={{ fontSize: "0.78rem", color: "#475569", fontWeight: 700 }}>
                        {objItem.lstProofs?.length ? `${objItem.lstProofs.length} proof${objItem.lstProofs.length === 1 ? "" : "s"} uploaded` : objItem.blnProofRequired ? "Proof required" : "Not required"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                        <Stack direction="row" spacing={0.4} justifyContent="flex-end">
                          <IconButton size="small" onClick={() => { setObjEditingItem(objItem); setBlnViewingItem(true); setBlnItemDialogOpen(true); }} aria-label="View item" data-testid="reimbursements.claim-editor.item.view.icon-button" data-row-key={objItem.intID}><VisibilityRoundedIcon fontSize="small" /></IconButton>
                          {!blnReadOnly ? <IconButton size="small" onClick={() => { setObjEditingItem(objItem); setBlnViewingItem(false); setBlnItemDialogOpen(true); }} aria-label="Edit item" data-testid="reimbursements.claim-editor.item.edit.icon-button" data-row-key={objItem.intID}><EditRoundedIcon fontSize="small" /></IconButton> : null}
                          {!blnReadOnly ? <IconButton size="small" onClick={() => setObjDeletingItem(objItem)} aria-label="Delete item" data-testid="reimbursements.claim-editor.item.delete.icon-button" data-row-key={objItem.intID}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton> : null}
                        </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <ReimbursementClaimItemForm objItem={objEditingItem} objOptions={objEffectiveOptions} blnOpen={blnItemDialogOpen} blnSaving={blnSaving} blnReadOnly={blnViewingItem} onClose={() => { setBlnItemDialogOpen(false); setObjEditingItem(null); setBlnViewingItem(false); }} onSave={saveItem} />
      <Dialog open={Boolean(objDeletingItem)} onClose={() => setObjDeletingItem(null)} maxWidth="xs" fullWidth data-testid="reimbursements.claim-editor.delete-item.dialog">
        <DialogTitle>Delete Claim Item</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this claim item?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setObjDeletingItem(null)} variant="outlined" data-testid="reimbursements.claim-editor.delete-item.cancel.button" sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}>Cancel</Button>
          <Button onClick={() => objDeletingItem ? void deleteItem(objDeletingItem.intID) : undefined} variant="contained" color="error" disabled={blnSaving} data-testid="reimbursements.claim-editor.delete-item.confirm.button" sx={{ textTransform: "none", fontWeight: 800, borderRadius: "8px" }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
