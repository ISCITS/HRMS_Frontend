"use client";

import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { formatCurrency } from "@/features/payroll/components/FNFSettlementPanels";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { fnfSettlementService } from "@/features/payroll/services/fnfSettlementService";
import type { FNFSettlementRecord } from "@/features/payroll/types";
import {
  findFNFBonusOverrideLine,
  formatFNFBonusMonth,
  isFNFBonusEditable,
  readFNFBonusDetail,
  validateFNFBonusOverride,
} from "@/features/payroll/utils/fnfBonus";

type FNFBonusPanelProps = {
  objSettlement: FNFSettlementRecord;
  /** record_uuid of the settlement. */
  strSettlementID: string;
  /** User holds the F&F Edit right. */
  blnCanEdit: boolean;
  onSaved: (strMessage: string) => Promise<void> | void;
  onError: (strMessage: string) => void;
};

type OverrideForm = { strAmount: string; strReason: string; blnTaxable: boolean };

function SummaryItem({ strLabel, strValue, strColor }: { strLabel: string; strValue: string; strColor?: string }) {
  return (
    <Box className={styles.fnfSummaryItem}>
      <Typography className={styles.fnfSummaryLabel}>{strLabel}</Typography>
      <Typography className={styles.fnfSummaryValue} sx={strColor ? { color: strColor } : undefined} title={strValue}>{strValue}</Typography>
    </Box>
  );
}

/**
 * Bonus FNF: the bonus calculated on Calculate (bonus year start or joining to the last working date,
 * prorated by the days paid each month, less bonus already paid) with its month-by-month working,
 * and HR's override of the amount.
 */
export default function FNFBonusPanel({ objSettlement, strSettlementID, blnCanEdit, onSaved, onError }: FNFBonusPanelProps) {
  const [objForm, setObjForm] = useState<OverrideForm | null>(null);
  const [strFormError, setStrFormError] = useState("");
  const [blnSaving, setBlnSaving] = useState(false);

  const objDetail = readFNFBonusDetail(objSettlement.objCalculationSnapshot as Record<string, unknown> | null | undefined);
  const objOverrideLine = findFNFBonusOverrideLine(objSettlement.lstLines);
  const blnEditable = blnCanEdit && isFNFBonusEditable(objSettlement.strSettlementStatus);
  const decCalculated = Number(objDetail?.amount ?? 0);
  const lstMonths = objDetail?.months ?? [];

  function openOverride() {
    setObjForm({
      strAmount: objOverrideLine ? String(objOverrideLine.decAmount ?? 0) : String(decCalculated),
      strReason: objOverrideLine?.strOverrideReason || "",
      blnTaxable: objOverrideLine ? Number(objOverrideLine.decTaxableAmount || 0) > 0 || Number(objOverrideLine.decAmount || 0) === 0 : true,
    });
    setStrFormError("");
  }

  async function saveOverride() {
    if (!objForm) return;
    const strValidation = validateFNFBonusOverride(objForm.strAmount, objForm.strReason);
    if (strValidation) {
      setStrFormError(strValidation);
      return;
    }
    setBlnSaving(true);
    try {
      await fnfSettlementService.saveBonusOverride(strSettlementID, { decAmount: Number(objForm.strAmount.trim()), strReason: objForm.strReason, blnTaxable: objForm.blnTaxable });
      setObjForm(null);
      await onSaved("Bonus override saved. Calculate the settlement to apply it to totals, TDS and the F&F report.");
    } catch (objError) {
      setStrFormError(objError instanceof Error ? objError.message : "Unable to save the bonus override.");
    } finally {
      setBlnSaving(false);
    }
  }

  async function removeOverride() {
    setBlnSaving(true);
    try {
      await fnfSettlementService.removeBonusOverride(strSettlementID);
      await onSaved("Bonus override removed. Calculate the settlement to apply the calculated bonus.");
    } catch (objError) {
      onError(objError instanceof Error ? objError.message : "Unable to remove the bonus override.");
    } finally {
      setBlnSaving(false);
    }
  }

  const strDaysPaid = objDetail?.total_paid_days != null ? `${objDetail.total_paid_days} days` : "-";
  const strBasis = objDetail?.basis === "PERCENT_OF_WAGES"
    ? `${objDetail.rate_percent ?? 0}% of wages${objDetail.wage_ceiling ? ` (cap ${formatCurrency(objDetail.wage_ceiling)})` : ""}`
    : `Salary structure${objDetail?.bonus_components?.length ? ` (${objDetail.bonus_components.join(", ")})` : ""}`;

  return (
    <Box sx={{ borderTop: "1px solid #d9e6ef", pt: 1.25 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75, minHeight: 32, gap: 1, flexWrap: "wrap" }}>
        <Typography sx={{ color: "#0f172a", fontWeight: 800, fontSize: "0.92rem" }}>Bonus</Typography>
        {blnEditable ? (
          <Stack direction="row" spacing={1}>
            {objOverrideLine ? (
              <Button className={styles.secondaryButton} size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => void removeOverride()} disabled={blnSaving} controlId="payroll.fnf-settlement.bonus.remove-override.button">
                Remove Override
              </Button>
            ) : null}
            <Button className={styles.secondaryButton} size="small" startIcon={<EditRoundedIcon />} onClick={openOverride} disabled={blnSaving} controlId="payroll.fnf-settlement.bonus.override.button">
              {objOverrideLine ? "Edit Override" : "Override Bonus"}
            </Button>
          </Stack>
        ) : null}
      </Stack>

      {objOverrideLine ? (
        <Alert severity="warning" sx={{ py: 0, mb: 1 }}>
          Bonus overridden to <strong>{formatCurrency(Number(objOverrideLine.decAmount || 0))}</strong>
          {objOverrideLine.strOverrideReason ? ` - ${objOverrideLine.strOverrideReason}` : ""}. The calculated bonus is shown below for reference.
        </Alert>
      ) : null}

      {!objDetail ? (
        <Typography sx={{ color: "#64748b", fontSize: "0.84rem" }}>Calculate the settlement to see the bonus.</Typography>
      ) : (
        <>
          <Box className={styles.fnfSummaryGrid}>
            <SummaryItem strLabel="Bonus Period" strValue={objDetail.period_from && objDetail.period_to ? `${objDetail.period_from} to ${objDetail.period_to}` : "-"} />
            <SummaryItem strLabel="Monthly Bonus From" strValue={strBasis} />
            <SummaryItem strLabel="Days Paid" strValue={strDaysPaid} />
            <SummaryItem strLabel="Bonus Earned" strValue={formatCurrency(Number(objDetail.gross_bonus ?? 0))} />
            <SummaryItem strLabel="Less Already Paid" strValue={formatCurrency(Number(objDetail.already_paid ?? 0))} />
            <SummaryItem strLabel="Calculated Bonus" strValue={formatCurrency(decCalculated)} strColor="#16a34a" />
          </Box>
          {objDetail.eligible === false && objDetail.reason ? (
            <Typography sx={{ color: "#b45309", fontSize: "0.82rem", mt: 0.75 }}>{objDetail.reason}</Typography>
          ) : null}
          {lstMonths.length ? (
            <Box className={styles.tableWrap} sx={{ mt: 1 }}>
              <table className={`${styles.table} ${styles.fnfDenseTable}`}>
                <thead><tr><th>Month</th><th>Monthly Bonus</th><th>Days Paid</th><th>Days From</th><th>Bonus</th></tr></thead>
                <tbody>
                  {lstMonths.map((objMonth) => (
                    <tr key={objMonth.month}>
                      <td>{formatFNFBonusMonth(objMonth.month)}</td>
                      <td>{formatCurrency(objMonth.monthly_bonus)}</td>
                      <td>{objMonth.paid_days} / {objMonth.calendar_days}</td>
                      <td>{objMonth.days_source}</td>
                      <td>{formatCurrency(objMonth.bonus)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          ) : null}
        </>
      )}

      <Dialog open={Boolean(objForm)} onClose={() => (blnSaving ? undefined : setObjForm(null))} fullWidth maxWidth="xs">
        <DialogTitle>Override Bonus</DialogTitle>
        <DialogContent>
          {objForm ? (
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Typography sx={{ color: "#475569", fontSize: "0.84rem" }}>Calculated bonus: {formatCurrency(decCalculated)}</Typography>
              <TextField
                label="Bonus Amount"
                value={objForm.strAmount}
                onChange={(objEvent) => { setObjForm({ ...objForm, strAmount: objEvent.target.value }); setStrFormError(""); }}
                inputProps={{ inputMode: "decimal", "data-controlid": "payroll.fnf-settlement.bonus.override-amount.input" }}
                helperText="Enter 0 to pay no bonus."
                required
                fullWidth
              />
              <TextField
                label="Reason"
                value={objForm.strReason}
                onChange={(objEvent) => { setObjForm({ ...objForm, strReason: objEvent.target.value }); setStrFormError(""); }}
                inputProps={{ maxLength: 300, "data-controlid": "payroll.fnf-settlement.bonus.override-reason.input" }}
                required
                multiline
                minRows={2}
                fullWidth
              />
              <FormControlLabel
                control={<Checkbox checked={objForm.blnTaxable} onChange={(_, blnChecked) => setObjForm({ ...objForm, blnTaxable: blnChecked })} inputProps={{ "data-controlid": "payroll.fnf-settlement.bonus.override-taxable.checkbox" } as never} />}
                label={<Typography sx={{ fontSize: "0.85rem" }}>Taxable</Typography>}
              />
              {strFormError ? <Alert severity="error" sx={{ py: 0 }}>{strFormError}</Alert> : null}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setObjForm(null)} disabled={blnSaving} controlId="payroll.fnf-settlement.bonus.override-cancel.button">Cancel</Button>
          <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={() => void saveOverride()} disabled={blnSaving} controlId="payroll.fnf-settlement.bonus.override-save.button">
            {blnSaving ? "Saving..." : "Save Override"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
