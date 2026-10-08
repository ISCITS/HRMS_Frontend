"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Alert, Box, IconButton, MenuItem, Snackbar, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import masterStyles from "@/components/master/MasterScreen.module.css";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import styles from "@/features/payroll/components/EmployeeMonthlyTaxPage.module.css";
import { employeeMonthlyTaxService, type MonthlyTaxTransaction } from "@/features/payroll/services/employeeMonthlyTaxService";
import { buildMonthlyTaxDisplayRows } from "@/features/payroll/utils/monthlyTaxDisplayRows";

const EDITABLE_SOURCE_TYPES = ["OPENING_IMPORT", "MANUAL_ENTRY", "PREVIOUS_EMPLOYER_OPENING", "ADJUSTMENT"];

function formatMonthLabel(strPeriodMonth: string): string {
  const objDate = new Date(`${strPeriodMonth}T00:00:00`);
  return objDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatAmount(decAmount: number): string {
  return Number(decAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

// Every entry is presented as "Opening Import"; the subheading says what the entry actually is -
// the history category for imported rows (e.g. REGULAR_PAYROLL_HISTORY), otherwise the real
// source plus its reference (e.g. "Regular Payroll · PR-202608-001").
function resolveEntrySubheading(objTxn: MonthlyTaxTransaction): string {
  if (objTxn.strSourceType === "OPENING_IMPORT" && objTxn.strRemarks) {
    return objTxn.strRemarks.split("|")[0].trim();
  }
  const strSource = SOURCE_LABELS[objTxn.strSourceType] || objTxn.strSourceType;
  return objTxn.blnIsSystemGenerated && objTxn.strSourceReferenceNo ? `${strSource} · ${objTxn.strSourceReferenceNo}` : strSource;
}

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
    if (!intEmployeeID || !strPeriodMonth || !strTaxable) return;
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

  const blnShowEntryForm = blnCanEdit && !blnLoading && !strError;

  const nodeContent = (
    <Box sx={{ display: "grid", gap: "14px" }}>
      {lstAvailableMonths && lstAvailableMonths.length > 0 && (
        <TextField
          select
          className="app-mui-text-field"
          controlId="employee-monthly-tax.detail.month.select"
          label={t("column_month", "Month")}
          size="small"
          value={strPeriodMonth ?? ""}
          onChange={(objEvent) => onPeriodMonthChange?.(objEvent.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: { xs: "100%", sm: 240 }, mt: 0.5 }}
        >
          {lstAvailableMonths.map((strMonth) => (
            <MenuItem key={strMonth} value={strMonth}>
              {formatMonthLabel(strMonth)}
            </MenuItem>
          ))}
        </TextField>
      )}

      {blnLoading && <Typography variant="body2">{t("loading", "Loading...")}</Typography>}
      {strError && <Alert severity="error">{strError}</Alert>}
      {!blnLoading && !strError && (
        <Box sx={{ border: "1px solid #e5edf5", borderRadius: "8px", overflowX: "auto" }}>
          <Table size="small" className={styles.taxDetailTable}>
            <TableHead>
              <TableRow>
                <TableCell>{t("column_source", "Source")}</TableCell>
                <TableCell align="right">{t("column_gross", "Gross")}</TableCell>
                <TableCell align="right">{t("column_taxable", "Taxable")}</TableCell>
                <TableCell align="right">{t("column_tds", "TDS")}</TableCell>
                <TableCell>{t("remarks", "Remarks")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lstDisplayRows.map((objTxn) => (
                <TableRow key={objTxn.intID}>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {SOURCE_LABELS.OPENING_IMPORT}
                    <Typography variant="caption" color="text.secondary" component="div">
                      {resolveEntrySubheading(objTxn)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{formatAmount(objTxn.decGrossIncomeAmount)}</TableCell>
                  <TableCell align="right">{formatAmount(objTxn.decTaxableIncomeAmount)}</TableCell>
                  <TableCell align="right">{formatAmount(objTxn.decTdsAmount)}</TableCell>
                  <TableCell sx={{ minWidth: 220, overflowWrap: "anywhere" }}>{objTxn.strRemarks || "-"}</TableCell>
                </TableRow>
              ))}
              {lstDisplayRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="body2" color="text.secondary">
                      {t("no_transactions", "No transactions recorded for this month.")}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      )}

      {blnShowEntryForm && (
        <Box sx={{ display: "grid", gap: "10px", pt: 0.5 }}>
          <Box>
            <Typography className={styles.taxDetailSectionTitle}>{t("add_entry_title", "Add Historical Entry")}</Typography>
            <Typography className={styles.taxDetailSectionHelp} sx={{ mt: 0.25 }}>
              {t(
                "add_entry_help",
                "System-generated (payroll-run) transactions cannot be edited here - correct those via payroll reprocess instead.",
              )}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "grid",
              columnGap: 1.6,
              rowGap: "12px",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
              alignItems: "start",
            }}
          >
            <TextField
              select
              className="app-mui-text-field"
              controlId="employee-monthly-tax.detail.source-type.select"
              label={t("column_source_type", "Source Type")}
              size="small"
              value={strSourceType}
              onChange={(objEvent) => setStrSourceType(objEvent.target.value)}
              fullWidth
            >
              {EDITABLE_SOURCE_TYPES.map((strType) => (
                <MenuItem key={strType} value={strType}>
                  {SOURCE_LABELS[strType] || strType}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              className="app-mui-text-field"
              controlId="employee-monthly-tax.detail.taxable.input"
              label={t("column_taxable", "Taxable")}
              placeholder={t("taxable_placeholder", "Enter taxable amount")}
              type="number"
              size="small"
              required
              value={strTaxable}
              onChange={(objEvent) => setStrTaxable(objEvent.target.value)}
              fullWidth
            />
            <TextField
              className="app-mui-text-field"
              controlId="employee-monthly-tax.detail.tds.input"
              label={t("column_tds", "TDS")}
              placeholder={t("tds_placeholder", "Enter TDS amount")}
              type="number"
              size="small"
              value={strTds}
              onChange={(objEvent) => setStrTds(objEvent.target.value)}
              fullWidth
            />
            <TextField
              className="app-mui-text-field"
              controlId="employee-monthly-tax.detail.remarks.input"
              label={t("remarks", "Remarks")}
              placeholder={t("remarks_placeholder", "Enter remarks")}
              size="small"
              value={strRemarks}
              onChange={(objEvent) => setStrRemarks(objEvent.target.value)}
              fullWidth
              sx={{ gridColumn: "1 / -1" }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );

  return (
    <>
      <CommonMasterDialog
        blnOpen={blnOpen}
        onClose={onClose}
        onDialogClose={(_, strReason) => {
          if (strReason !== "backdropClick") onClose();
        }}
        rootTestId="employee-monthly-tax.detail.dialog"
        cancelButtonTestId="employee-monthly-tax.detail.cancel.button"
        primaryButtonTestId="employee-monthly-tax.detail.add-entry.button"
        strTitle={`${t("transaction_detail_title", "Transaction Detail")}${strEmployeeName ? ` - ${strEmployeeName}` : ""}`}
        nodeTitleAction={
          <IconButton aria-label={t("close", "Close")} onClick={onClose} size="small" sx={{ color: "#94a3b8" }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        }
        nodeFooterStart={
          blnShowEntryForm ? (
            <Typography sx={{ color: "#64748b", fontSize: "11px" }}>
              {t("required_fields_hint", "Required fields are marked")} <Box component="span" sx={{ color: "#dc2626" }}>*</Box>
            </Typography>
          ) : undefined
        }
        strSecondaryLabel={blnShowEntryForm ? t("cancel", "Cancel") : t("close", "Close")}
        strPrimaryLabel={blnSaving ? t("saving", "Saving...") : t("save", "Save")}
        onPrimaryAction={handleAddEntry}
        blnPrimaryDisabled={blnSaving || !strTaxable}
        blnHidePrimary={!blnShowEntryForm}
        titleSx={{ px: 2.25, py: 1.25, fontSize: "16px", fontWeight: 700, maxHeight: 50 }}
        paperClassName={`${masterStyles.departmentDialogPaper} ${styles.taxDetailDialogPaper}`}
        paperSx={{ "& .MuiButton-root": { fontSize: "12px !important", fontWeight: "600 !important" } }}
        maxWidth={false}
        fullWidth={false}
        contentSx={{ overflowX: "hidden", overflowY: "auto", px: "20px", py: "12px", borderColor: "#e5edf5" }}
        nodeContent={nodeContent}
      />
      <Snackbar open={Boolean(strSaveError)} autoHideDuration={5000} onClose={() => setStrSaveError("")}>
        <Alert severity="error" onClose={() => setStrSaveError("")} componentsProps={{ closeButton: { controlId: "employee-monthly-tax.detail.error.close.button" } }}>
          {strSaveError}
        </Alert>
      </Snackbar>
    </>
  );
}
