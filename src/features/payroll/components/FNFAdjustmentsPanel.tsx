"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import { Box, Button, Checkbox, MenuItem, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import CommonSearchableSelect from "@/Common/components/CommonSearchableSelect";
import { formatCurrency } from "@/features/payroll/components/FNFSettlementPanels";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { fnfSettlementService } from "@/features/payroll/services/fnfSettlementService";
import type { FNFAdjustmentCategory, FNFAdjustmentFormRow, FNFAdjustmentsResponse } from "@/features/payroll/types";
import {
  LST_FNF_ADJUSTMENT_CATEGORIES,
  applyFNFAdjustmentComponent,
  categoryLabel,
  createEmptyFNFAdjustmentRow,
  hasFNFAdjustmentChanges,
  summarizeFNFAdjustments,
  toFNFAdjustmentRows,
  validateFNFAdjustmentRows,
} from "@/features/payroll/utils/fnfAdjustments";

type FNFAdjustmentsPanelProps = {
  /** record_uuid of the settlement. */
  strSettlementID: string;
  /** Settlement status: the list is reloaded when it changes (e.g. after Calculate). */
  strSettlementStatus: string;
  /** User holds the F&F Edit right. */
  blnCanEdit: boolean;
  onSaved: (strMessage: string) => Promise<void> | void;
  onError: (strMessage: string) => void;
};

/**
 * F&F Adjustments: extra amounts HR gives or takes in the settlement against a salary component
 * (reward, ex-gratia, any other perk; or a deduction / recovery), entered the way Payroll Input
 * adjustments are. Saved as their own settlement lines, kept on recalculation, and printed under
 * an "Adjustments" heading in the F&F reports.
 */
export default function FNFAdjustmentsPanel({ strSettlementID, strSettlementStatus, blnCanEdit, onSaved, onError }: FNFAdjustmentsPanelProps) {
  const [objData, setObjData] = useState<FNFAdjustmentsResponse | null>(null);
  const [lstRows, setLstRows] = useState<FNFAdjustmentFormRow[]>([]);
  const [strError, setStrError] = useState("");
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);

  async function load() {
    setBlnLoading(true);
    try {
      const objResult = await fnfSettlementService.getAdjustments(strSettlementID);
      setObjData(objResult);
      setLstRows(toFNFAdjustmentRows(objResult.lstAdjustments));
      setStrError("");
    } catch (objError) {
      onError(objError instanceof Error ? objError.message : "Unable to load F&F adjustments.");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => undefined);
    // Reload when the settlement moves to another status (calculated, approved, ...).
  }, [strSettlementID, strSettlementStatus]);

  const lstComponents = objData?.lstComponents ?? [];
  const blnEditable = Boolean(objData?.blnEditable) && blnCanEdit;
  const blnDirty = useMemo(() => (objData ? hasFNFAdjustmentChanges(lstRows, objData.lstAdjustments) : false), [lstRows, objData]);
  const objSummary = useMemo(() => summarizeFNFAdjustments(lstRows), [lstRows]);
  // A saved adjustment may point to a component that has since been made inactive: keep it selectable.
  const lstComponentOptions = useMemo(() => {
    const lstOptions = lstComponents.map((objComponent) => ({ intID: objComponent.intID, strCode: objComponent.strCode, strLabel: objComponent.strLabel }));
    for (const objSaved of objData?.lstAdjustments ?? []) {
      if (!lstOptions.some((objOption) => objOption.intID === objSaved.intSalaryComponentID)) {
        lstOptions.push({ intID: objSaved.intSalaryComponentID, strCode: objSaved.strComponentCode, strLabel: objSaved.strComponentName });
      }
    }
    return lstOptions;
  }, [lstComponents, objData]);

  function updateRow(strRowKey: string, fnUpdate: (objRow: FNFAdjustmentFormRow) => FNFAdjustmentFormRow) {
    setLstRows((lstCurrent) => lstCurrent.map((objRow) => (objRow.strRowKey === strRowKey ? fnUpdate(objRow) : objRow)));
    setStrError("");
  }

  async function save() {
    const strValidation = validateFNFAdjustmentRows(lstRows, lstComponents);
    if (strValidation) {
      setStrError(strValidation);
      return;
    }
    setBlnSaving(true);
    try {
      const objResult = await fnfSettlementService.saveAdjustments(strSettlementID, lstRows);
      setObjData(objResult);
      setLstRows(toFNFAdjustmentRows(objResult.lstAdjustments));
      await onSaved("F&F adjustments saved. Calculate the settlement to apply them to totals, TDS and the F&F report.");
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to save F&F adjustments.");
    } finally {
      setBlnSaving(false);
    }
  }

  const blnDisabled = !blnEditable || blnSaving;

  return (
    <Box sx={{ borderTop: "1px solid #d9e6ef", pt: 1.25 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75, minHeight: 32, gap: 1, flexWrap: "wrap" }}>
        <Box>
          <Typography sx={{ color: "#0f172a", fontWeight: 800, fontSize: "0.92rem" }}>Adjustments</Typography>
          <Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>
            Extra amounts against a salary component (reward, ex-gratia, other perk or deduction). Shown under &quot;Adjustments&quot; in the F&amp;F report.
          </Typography>
        </Box>
        {blnEditable ? (
          <Stack direction="row" spacing={1}>
            <Button className={styles.secondaryButton} size="small" startIcon={<AddRoundedIcon />} onClick={() => setLstRows((lstCurrent) => [...lstCurrent, createEmptyFNFAdjustmentRow()])} disabled={blnDisabled} controlId="payroll.fnf-settlement.adjustments.add.button">
              Add Adjustment
            </Button>
            {blnDirty ? (
              <Button className={styles.secondaryButton} size="small" startIcon={<UndoRoundedIcon />} onClick={() => { setLstRows(toFNFAdjustmentRows(objData?.lstAdjustments ?? [])); setStrError(""); }} disabled={blnSaving} controlId="payroll.fnf-settlement.adjustments.discard.button">
                Discard
              </Button>
            ) : null}
            <Button className={styles.primaryButton} size="small" variant="contained" startIcon={<SaveRoundedIcon />} onClick={() => save().catch(() => undefined)} disabled={blnDisabled || !blnDirty} controlId="payroll.fnf-settlement.adjustments.save.button">
              {blnSaving ? "Saving..." : "Save Adjustments"}
            </Button>
          </Stack>
        ) : null}
      </Stack>
      {strError ? <Typography color="error" sx={{ fontSize: "0.82rem", mb: 0.75 }}>{strError}</Typography> : null}
      <Box className={styles.tableWrap}>
        <table className={`${styles.table} ${styles.fnfDenseTable}`}>
          <thead>
            <tr>
              <th style={{ minWidth: 220 }}>Component *</th>
              <th style={{ minWidth: 130 }}>Category *</th>
              <th style={{ minWidth: 130 }}>Amount *</th>
              <th style={{ width: 80 }}>Taxable</th>
              <th style={{ minWidth: 200 }}>Remarks</th>
              {blnEditable ? <th className={styles.actionsColumn}>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {blnLoading ? (
              <tr><td colSpan={6} className={styles.emptyState}>Loading adjustments...</td></tr>
            ) : lstRows.length ? (
              lstRows.map((objRow) => (
                <tr key={objRow.strRowKey}>
                  <td>
                    {blnEditable ? (
                      <CommonSearchableSelect
                        label=""
                        value={objRow.intSalaryComponentID}
                        options={lstComponentOptions}
                        onChange={(intValue) => updateRow(objRow.strRowKey, (objCurrent) => applyFNFAdjustmentComponent(objCurrent, intValue === "" ? "" : Number(intValue), lstComponents))}
                        disabled={blnDisabled}
                        placeholder="Select component"
                        fullWidth
                      />
                    ) : (
                      lstComponentOptions.find((objOption) => objOption.intID === objRow.intSalaryComponentID)?.strLabel || "-"
                    )}
                  </td>
                  <td>
                    {blnEditable ? (
                      <TextField select size="small" fullWidth value={objRow.strCategory} disabled={blnDisabled} onChange={(objEvent) => updateRow(objRow.strRowKey, (objCurrent) => ({ ...objCurrent, strCategory: objEvent.target.value as FNFAdjustmentCategory }))}>
                        {LST_FNF_ADJUSTMENT_CATEGORIES.map((objCategory) => <MenuItem key={objCategory.strCode} value={objCategory.strCode}>{objCategory.strLabel}</MenuItem>)}
                      </TextField>
                    ) : (
                      categoryLabel(objRow.strCategory)
                    )}
                  </td>
                  <td>
                    {blnEditable ? (
                      <TextField size="small" fullWidth type="number" inputProps={{ min: 0, step: "0.01" }} placeholder="0.00" value={objRow.strAmount} disabled={blnDisabled} onChange={(objEvent) => updateRow(objRow.strRowKey, (objCurrent) => ({ ...objCurrent, strAmount: objEvent.target.value }))} />
                    ) : (
                      formatCurrency(Number(objRow.strAmount || 0))
                    )}
                  </td>
                  <td>
                    {objRow.strCategory === "addition" ? (
                      <Tooltip title="Counts in taxable income for final TDS. Defaults to the component's setting.">
                        <span><Checkbox size="small" checked={objRow.blnTaxable} disabled={blnDisabled} onChange={(_objEvent, blnChecked) => updateRow(objRow.strRowKey, (objCurrent) => ({ ...objCurrent, blnTaxable: blnChecked }))} /></span>
                      </Tooltip>
                    ) : "-"}
                  </td>
                  <td>
                    {blnEditable ? (
                      <TextField size="small" fullWidth placeholder="e.g. Project completion reward" value={objRow.strRemarks} inputProps={{ maxLength: 500 }} disabled={blnDisabled} onChange={(objEvent) => updateRow(objRow.strRowKey, (objCurrent) => ({ ...objCurrent, strRemarks: objEvent.target.value }))} />
                    ) : (
                      objRow.strRemarks || "-"
                    )}
                  </td>
                  {blnEditable ? (
                    <td className={styles.actionsColumn}>
                      <Button color="error" size="small" startIcon={<DeleteOutlineRoundedIcon />} disabled={blnDisabled} onClick={() => setLstRows((lstCurrent) => lstCurrent.filter((objCurrent) => objCurrent.strRowKey !== objRow.strRowKey))} controlId="payroll.fnf-settlement.adjustments.remove.button" data-row-key={objRow.strRowKey}>
                        Remove
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className={styles.emptyState}>No adjustments.{blnEditable ? " Use Add Adjustment to give a reward or other amount against a salary component." : ""}</td></tr>
            )}
          </tbody>
        </table>
      </Box>
      {lstRows.length ? (
        <Stack direction="row" spacing={3} justifyContent="flex-end" sx={{ pt: 0.75, fontSize: "0.85rem" }}>
          <Typography sx={{ fontSize: "0.85rem", color: "#16a34a" }}>Additions: <strong>{formatCurrency(objSummary.decAdditions)}</strong></Typography>
          <Typography sx={{ fontSize: "0.85rem", color: "#dc2626" }}>Deductions / Recoveries: <strong>{formatCurrency(objSummary.decDeductions)}</strong></Typography>
          <Typography sx={{ fontSize: "0.85rem", color: "#0f172a" }}>Net Adjustment: <strong>{formatCurrency(objSummary.decNet)}</strong></Typography>
        </Stack>
      ) : null}
    </Box>
  );
}
