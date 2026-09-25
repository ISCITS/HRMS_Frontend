"use client";

import {
  Alert, Button, Chip, Dialog, DialogContent, DialogTitle, Divider, IconButton, MenuItem, Snackbar, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useEffect, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { employeeMonthlyTaxService, type MonthlyTaxTransaction } from "@/features/payroll/services/employeeMonthlyTaxService";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { buildMonthlyTaxDisplayRows } from "@/features/payroll/utils/monthlyTaxDisplayRows";

const EDITABLE_SOURCE_TYPES = ["OPENING_IMPORT", "MANUAL_ENTRY", "PREVIOUS_EMPLOYER_OPENING", "ADJUSTMENT"];

function formatMonthLabel(strPeriodMonth: string): string {
  const objDate = new Date(`${strPeriodMonth}T00:00:00`);
  return objDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

const SOURCE_LABELS: Record<string, string> = {
  OPENING_IMPORT: "Opening Import",
  MANUAL_ENTRY: "Manual Entry",
  PREVIOUS_EMPLOYER: "Previous Employer",
  PREVIOUS_EMPLOYER_OPENING: "Previous Employer (Opening)",
  REGULAR_PAYROLL: "Regular Payroll",
  SEPARATE_PAYROLL: "Separate Payroll",
  FNF: "Full & Final Settlement",
  ADJUSTMENT: "Adjustment",
};

export default function MonthlyTaxTransactionDetailDialog({
  blnOpen,
  onClose,
  intEmployeeID,
  strEmployeeName,
  strFinancialYearCode,
  strPeriodMonth,
  lstAvailableMonths,
  onPeriodMonthChange,
  blnCanEdit,
  onSaved,
}: {
  blnOpen: boolean;
  onClose: () => void;
  intEmployeeID: number | null;
  strEmployeeName: string | null;
  strFinancialYearCode: string;
  strPeriodMonth: string | null;
  lstAvailableMonths?: string[];
  onPeriodMonthChange?: (strMonth: string) => void;
  blnCanEdit: boolean;
  onSaved?: () => void;
}) {
  const { t } = useModuleLabels("employee_monthly_tax");
  const [lstTransactions, setLstTransactions] = useState<MonthlyTaxTransaction[]>([]);
  const [strError, setStrError] = useState("");
  const [blnLoading, setBlnLoading] = useState(false);
  const [strSourceType, setStrSourceType] = useState("MANUAL_ENTRY");
  const [strTaxable, setStrTaxable] = useState("");
  const [strTds, setStrTds] = useState("");
  const [strRemarks, setStrRemarks] = useState("");
  const [blnSaving, setBlnSaving] = useState(false);
  const [strSaveError, setStrSaveError] = useState("");
  const lstDisplayRows = buildMonthlyTaxDisplayRows(lstTransactions);

  async function loadTransactions() {
    if (!intEmployeeID || !strPeriodMonth) return;
    setBlnLoading(true);
    setStrError("");
    try {
      const lstResult = await employeeMonthlyTaxService.getMonthDetail(intEmployeeID, strFinancialYearCode, strPeriodMonth);
      setLstTransactions(lstResult);
    } catch (objError) {
      setStrError((await createApiRequestError(objError)).message);
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (!blnOpen || !intEmployeeID || !strPeriodMonth) return;
    setStrSourceType("MANUAL_ENTRY");
    setStrTaxable("");
    setStrTds("");
    setStrRemarks("");
    setStrSaveError("");
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blnOpen, intEmployeeID, strFinancialYearCode, strPeriodMonth]);

  async function handleAddEntry() {
    if (!intEmployeeID || !strPeriodMonth) return;
    setBlnSaving(true);
    setStrSaveError("");
    try {
      await employeeMonthlyTaxService.saveTransaction({
        intEmployeeID,
        strFinancialYearCode,
        dtPeriodMonth: strPeriodMonth,
        strSourceType,
        decGrossIncomeAmount: Number(strTaxable) || 0,
        decTaxableIncomeAmount: Number(strTaxable) || 0,
        decTdsAmount: Number(strTds) || 0,
        strRemarks: strRemarks || undefined,
      });
      setStrTaxable("");
      setStrTds("");
      setStrRemarks("");
      await loadTransactions();
      onSaved?.();
    } catch (objError) {
      setStrSaveError((await createApiRequestError(objError)).message);
    } finally {
      setBlnSaving(false);
    }
  }

  return (
    <Dialog open={blnOpen} onClose={onClose} maxWidth="md" fullWidth data-control-id="employee-monthly-tax.detail.dialog">
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>
          {t("transaction_detail_title", "Transaction Detail")}
          {strEmployeeName ? ` - ${strEmployeeName}` : ""}
        </span>
        <IconButton onClick={onClose} controlId="employee-monthly-tax.detail.close.button">
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {lstAvailableMonths && lstAvailableMonths.length > 0 && (
          <TextField
            select
            controlId="employee-monthly-tax.detail.month.select"
            label={t("column_month", "Month")}
            size="small"
            value={strPeriodMonth ?? ""}
            onChange={(objEvent) => onPeriodMonthChange?.(objEvent.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 200, mt: 2, mb: 2 }}
          >
            {lstAvailableMonths.map((strMonth) => (
              <MenuItem key={strMonth} value={strMonth}>
                {formatMonthLabel(strMonth)}
              </MenuItem>
            ))}
          </TextField>
        )}
        {blnLoading && <Typography variant="body2">{t("loading", "Loading...")}</Typography>}
        {strError && <Typography color="error" variant="body2">{strError}</Typography>}
        {!blnLoading && !strError && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("column_source", "Source")}</TableCell>
                <TableCell>{t("column_reference", "Reference")}</TableCell>
                <TableCell align="right">{t("column_gross", "Gross")}</TableCell>
                <TableCell align="right">{t("column_taxable", "Taxable")}</TableCell>
                <TableCell align="right">{t("column_tds", "TDS")}</TableCell>
                <TableCell>{t("column_system", "System?")}</TableCell>
                <TableCell>{t("column_previous_employer", "Previous Employer?")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lstDisplayRows.map((objTxn) => (
                <TableRow key={objTxn.intID} sx={{ opacity: objTxn.blnIsReversed ? 0.5 : 1 }}>
                  <TableCell>
                    {SOURCE_LABELS[objTxn.strSourceType] || objTxn.strSourceType}
                    {objTxn.blnIsReversed && (
                      <Chip size="small" label={t("reversed", "Reversed")} sx={{ ml: 1 }} color="default" />
                    )}
                  </TableCell>
                  <TableCell>{objTxn.strSourceReferenceNo || "-"}</TableCell>
                  <TableCell align="right">{objTxn.decGrossIncomeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell align="right">{objTxn.decTaxableIncomeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell align="right">{objTxn.decTdsAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                    <Chip size="small" label={objTxn.blnIsSystemGenerated ? t("yes", "Yes") : t("no", "No")} color={objTxn.blnIsSystemGenerated ? "success" : undefined} />
                  </TableCell>
                  <TableCell>{objTxn.blnIsPreviousEmployer ? t("yes", "Yes") : t("no", "No")}</TableCell>
                </TableRow>
              ))}
              {lstTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography variant="body2" color="text.secondary">
                      {t("no_transactions", "No transactions recorded for this month.")}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        {blnCanEdit && !blnLoading && !strError && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              {t("add_entry_title", "Add Historical Entry")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t(
                "add_entry_help",
                "System-generated (payroll-run) transactions cannot be edited here - correct those via payroll reprocess instead.",
              )}
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 1 }}>
              <TextField
                select
                controlId="employee-monthly-tax.detail.source-type.select"
                label={t("column_source_type", "Source Type")}
                size="small"
                value={strSourceType}
                onChange={(objEvent) => setStrSourceType(objEvent.target.value)}
                sx={{ minWidth: 200 }}
              >
                {EDITABLE_SOURCE_TYPES.map((strType) => (
                  <MenuItem key={strType} value={strType}>
                    {SOURCE_LABELS[strType] || strType}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label={t("column_taxable", "Taxable")}
                controlId="employee-monthly-tax.detail.taxable.input"
                type="number"
                size="small"
                value={strTaxable}
                onChange={(objEvent) => setStrTaxable(objEvent.target.value)}
              />
              <TextField
                label={t("column_tds", "TDS")}
                controlId="employee-monthly-tax.detail.tds.input"
                type="number"
                size="small"
                value={strTds}
                onChange={(objEvent) => setStrTds(objEvent.target.value)}
              />
              <TextField
                label={t("remarks", "Remarks")}
                controlId="employee-monthly-tax.detail.remarks.input"
                size="small"
                value={strRemarks}
                onChange={(objEvent) => setStrRemarks(objEvent.target.value)}
                sx={{ flexGrow: 1 }}
              />
            </Stack>
            <Button
              variant="contained"
              onClick={handleAddEntry}
              disabled={blnSaving || !strTaxable}
              controlId="employee-monthly-tax.detail.add-entry.button"
            >
              {t("save", "Save")}
            </Button>
          </>
        )}
      </DialogContent>
      <Snackbar open={Boolean(strSaveError)} autoHideDuration={5000} onClose={() => setStrSaveError("")}>
        <Alert severity="error" onClose={() => setStrSaveError("")} componentsProps={{ closeButton: { controlId: "employee-monthly-tax.detail.error.close.button" } }}>
          {strSaveError}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}
