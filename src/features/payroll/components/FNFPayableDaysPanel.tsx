"use client";

import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { fnfSettlementService } from "@/features/payroll/services/fnfSettlementService";
import type { FNFPayableDaysResponse } from "@/features/payroll/types";
import {
  type FNFPayableDaysFormRow,
  buildFNFPayableDaysPayload,
  describeFNFDaysSource,
  formatFNFPayableMonth,
  hasFNFPayableDaysChanges,
  maxFNFPayableDays,
  toFNFPayableDaysRows,
  validateFNFPayableDaysRows,
} from "@/features/payroll/utils/fnfPayableDays";

type FNFPayableDaysPanelProps = {
  /** record_uuid of the settlement. */
  strSettlementID: string;
  /** Settlement status: reloaded when it changes (e.g. after Calculate). */
  strSettlementStatus: string;
  /** User holds the F&F Edit right. */
  blnCanEdit: boolean;
  onSaved: (strMessage: string) => Promise<void> | void;
  onError: (strMessage: string) => void;
};

/**
 * F&F Payable Days: payable days per salary month entered by HR (e.g. from the client's F&F sheet).
 * Calculate uses them instead of attendance for that month; a blank month uses attendance.
 */
export default function FNFPayableDaysPanel({ strSettlementID, strSettlementStatus, blnCanEdit, onSaved, onError }: FNFPayableDaysPanelProps) {
  const [objData, setObjData] = useState<FNFPayableDaysResponse | null>(null);
  const [lstRows, setLstRows] = useState<FNFPayableDaysFormRow[]>([]);
  const [strError, setStrError] = useState("");
  const [blnSaving, setBlnSaving] = useState(false);

  async function load() {
    try {
      const objResult = await fnfSettlementService.getPayableDays(strSettlementID);
      setObjData(objResult);
      setLstRows(toFNFPayableDaysRows(objResult));
      setStrError("");
    } catch (objError) {
      onError(objError instanceof Error ? objError.message : "Unable to load F&F payable days.");
    }
  }

  useEffect(() => {
    load().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strSettlementID, strSettlementStatus]);

  const blnEditable = Boolean(objData?.blnEditable) && blnCanEdit;
  const blnDirty = useMemo(() => (objData ? hasFNFPayableDaysChanges(lstRows, objData.lstPayableDays) : false), [lstRows, objData]);

  function updateRow(strMonth: string, objChange: Partial<FNFPayableDaysFormRow>) {
    setLstRows((lstCurrent) => lstCurrent.map((objRow) => (objRow.dtMonth === strMonth ? { ...objRow, ...objChange } : objRow)));
    setStrError("");
  }

  async function save() {
    const strValidation = validateFNFPayableDaysRows(lstRows, objData?.dtLastWorkingDate ?? null);
    if (strValidation) {
      setStrError(strValidation);
      return;
    }
    setBlnSaving(true);
    try {
      const objResult = await fnfSettlementService.savePayableDays(strSettlementID, buildFNFPayableDaysPayload(lstRows));
      setObjData(objResult);
      setLstRows(toFNFPayableDaysRows(objResult));
      await onSaved("Payable days saved. Calculate the settlement to apply them.");
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to save payable days.");
    } finally {
      setBlnSaving(false);
    }
  }

  if (!objData) return null;

  return (
    <Box sx={{ borderTop: "1px solid #d9e6ef", pt: 1.25 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75, minHeight: 32, gap: 1, flexWrap: "wrap" }}>
        <Typography sx={{ color: "#0f172a", fontWeight: 800, fontSize: "0.92rem" }}>Payable Days</Typography>
        {blnEditable ? (
          <Stack direction="row" spacing={1}>
            <Button className={styles.secondaryButton} size="small" startIcon={<UndoRoundedIcon />} onClick={() => setLstRows(toFNFPayableDaysRows(objData))} disabled={blnSaving || !blnDirty} controlId="payroll.fnf-settlement.payable-days.undo.button">
              Undo
            </Button>
            <Button className={styles.secondaryButton} size="small" startIcon={<SaveRoundedIcon />} onClick={() => void save()} disabled={blnSaving || !blnDirty} controlId="payroll.fnf-settlement.payable-days.save.button">
              {blnSaving ? "Saving..." : "Save Payable Days"}
            </Button>
          </Stack>
        ) : null}
      </Stack>
      <Box className={styles.tableWrap}>
        <table className={`${styles.table} ${styles.fnfDenseTable}`}>
          <thead>
            <tr><th>Month</th><th>Days Used in Last Calculation</th><th>Payable Days (blank = attendance)</th><th>Remarks</th></tr>
          </thead>
          <tbody>
            {lstRows.map((objRow) => (
              <tr key={objRow.dtMonth}>
                <td>{formatFNFPayableMonth(objRow.dtMonth)}</td>
                <td>{objRow.decUsedDays != null ? `${objRow.decUsedDays} (${describeFNFDaysSource(objRow.strUsedSource)})` : "-"}</td>
                <td>
                  {blnEditable ? (
                    <TextField
                      size="small"
                      value={objRow.strDays}
                      onChange={(objEvent) => updateRow(objRow.dtMonth, { strDays: objEvent.target.value })}
                      placeholder={`0 - ${maxFNFPayableDays(objRow.dtMonth, objData.dtLastWorkingDate)}`}
                      inputProps={{ inputMode: "decimal", "data-controlid": `payroll.fnf-settlement.payable-days.${objRow.dtMonth}.days.input` }}
                      sx={{ width: 110 }}
                    />
                  ) : (objRow.strDays || "-")}
                </td>
                <td>
                  {blnEditable ? (
                    <TextField
                      size="small"
                      value={objRow.strRemarks}
                      onChange={(objEvent) => updateRow(objRow.dtMonth, { strRemarks: objEvent.target.value })}
                      inputProps={{ maxLength: 500, "data-controlid": `payroll.fnf-settlement.payable-days.${objRow.dtMonth}.remarks.input` }}
                      fullWidth
                    />
                  ) : (objRow.strRemarks || "-")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
      {strError ? <Alert severity="error" sx={{ py: 0, mt: 1 }}>{strError}</Alert> : null}
    </Box>
  );
}
