"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, MenuItem, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { MasterBreadcrumbs } from "@/components/master/MasterListUi";
import styles from "@/components/master/MasterScreen.module.css";
import FNFModuleTabs from "@/features/payroll/components/FNFModuleTabs";
import { formatCurrency } from "@/features/payroll/components/FNFSettlementPanels";
import { fnfSettlementService } from "@/features/payroll/services/fnfSettlementService";
import type { FNFPaymentAdviceRow, FNFRegisterResponse, FNFRegisterRow } from "@/features/payroll/types";
import { useFNFRights } from "@/features/payroll/hooks/useFNFRights";

const lstStatuses = ["All", "calculated", "under_review", "approved", "locked", "paid", "recovered"];
const lstAmountColumns: { field: keyof FNFRegisterRow; headerName: string }[] = [
  { field: "decTotalEarnings", headerName: "Earnings" },
  { field: "decTotalRecoveries", headerName: "Recoveries" },
  { field: "decTotalDeductions", headerName: "Deductions" },
  { field: "decPfEmployee", headerName: "PF (Employee)" },
  { field: "decPfEmployer", headerName: "PF (Employer)" },
  { field: "decEsiEmployee", headerName: "ESI (Employee)" },
  { field: "decEsiEmployer", headerName: "ESI (Employer)" },
  { field: "decPt", headerName: "PT" },
  { field: "decLwf", headerName: "LWF" },
  { field: "decTds", headerName: "TDS" },
  { field: "decNetPayable", headerName: "Net Payable" },
  { field: "decNetRecoverable", headerName: "Net Recoverable" },
];

function getMonthBounds() {
  const objToday = new Date();
  const strFrom = new Date(objToday.getFullYear(), objToday.getMonth(), 1).toISOString().slice(0, 10);
  const strTo = new Date(objToday.getFullYear(), objToday.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { strFrom, strTo };
}

function toCsvValue(objValue: unknown) {
  const strValue = objValue === null || objValue === undefined ? "" : String(objValue);
  return /[",\n]/.test(strValue) ? `"${strValue.replace(/"/g, '""')}"` : strValue;
}

function downloadPaymentAdvice(lstRows: FNFPaymentAdviceRow[]) {
  const lstHeader = ["Settlement", "Employee Code", "Employee Name", "Account Holder", "Account Number", "IFSC", "Branch", "Amount", "Narration", "Issue"];
  const lstLines = lstRows.map((objRow) => [objRow.strSettlementNumber, objRow.strEmployeeCode, objRow.strEmployeeName, objRow.strAccountHolderName, objRow.strAccountNumber, objRow.strIfscCode, objRow.strBranchName, objRow.decAmount.toFixed(2), objRow.strNarration, objRow.strIssue].map(toCsvValue).join(","));
  const objBlob = new Blob([[lstHeader.join(","), ...lstLines].join("\n")], { type: "text/csv;charset=utf-8" });
  const objLink = document.createElement("a");
  objLink.href = URL.createObjectURL(objBlob);
  objLink.download = `fnf_payment_advice_${new Date().toISOString().slice(0, 10)}.csv`;
  objLink.click();
  URL.revokeObjectURL(objLink.href);
}

export default function FNFRegisterPage() {
  const objRouter = useRouter();
  const { blnLoading: blnRightsLoading, can, canView } = useFNFRights();
  const { strFrom, strTo } = getMonthBounds();
  const [dicFilters, setDicFilters] = useState({ lwd_from: strFrom, lwd_to: strTo, status: "All" });
  const [objRegister, setObjRegister] = useState<FNFRegisterResponse | null>(null);
  const [strError, setStrError] = useState("");
  const [strInfo, setStrInfo] = useState("");
  const [blnLoading, setBlnLoading] = useState(false);
  const blnCanView = canView();
  const blnCanDownloadAdvice = can("mark_paid");
  const blnCanExport = can("export");

  async function loadRegister() {
    setBlnLoading(true);
    setStrError("");
    try {
      setObjRegister(await fnfSettlementService.getRegister(dicFilters));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load the F&F register.");
    } finally {
      setBlnLoading(false);
    }
  }

  async function handlePaymentAdvice() {
    setStrError("");
    setStrInfo("");
    try {
      const objAdvice = await fnfSettlementService.getPaymentAdvice();
      if (!objAdvice.lstRows.length) {
        setStrInfo("No locked settlements are waiting for payment.");
        return;
      }
      downloadPaymentAdvice(objAdvice.lstRows);
      setStrInfo(`Payment advice downloaded: ${objAdvice.lstRows.length} settlement(s), total ${formatCurrency(objAdvice.decTotal)}.${objAdvice.intIssueCount ? ` ${objAdvice.intIssueCount} row(s) have bank detail issues - see the Issue column.` : ""}`);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to prepare the payment advice.");
    }
  }

  useEffect(() => { if (!blnRightsLoading && blnCanView) loadRegister().catch(() => undefined); }, [blnRightsLoading, blnCanView]);

  const lstColumns = useMemo<CommonTableColumn<FNFRegisterRow & { id: string }>[]>(() => [
    { field: "strSettlementNumber", headerName: "Settlement #", width: 120 },
    { field: "strEmployeeCode", headerName: "Employee Code", width: 120 },
    { field: "strEmployeeName", headerName: "Employee", width: 170 },
    { field: "strExitType", headerName: "Exit Type", width: 120 },
    { field: "dtLastWorkingDate", headerName: "LWD", width: 110 },
    { field: "strSettlementStatus", headerName: "Status", width: 110 },
    ...lstAmountColumns.map((objColumn) => ({ field: objColumn.field, headerName: objColumn.headerName, width: 120 })),
    { field: "dtPaidOn", headerName: "Paid On", width: 110 },
    { field: "strPaymentReferenceNo", headerName: "Reference", width: 130 },
  ], []);
  const lstRows = useMemo(() => (objRegister?.lstRows || []).map((objRow, intIndex) => ({ ...objRow, id: `${objRow.strSettlementNumber}-${intIndex}`, dtPaidOn: objRow.dtPaidOn ? objRow.dtPaidOn.slice(0, 10) : "" })), [objRegister]);

  if (!blnRightsLoading && !blnCanView) return <Alert severity="error">You do not have access to the F&amp;F register.</Alert>;

  return (
    <Box className={styles.page} data-controlid="payroll.fnf-register.page">
      <MasterBreadcrumbs strSection="Employee Services" strTitle="F&F Register" />
      <FNFModuleTabs strActive="register" />
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strInfo ? <Alert severity="info">{strInfo}</Alert> : null}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mb: 2 }}>
        <TextField size="small" type="date" label="LWD from" InputLabelProps={{ shrink: true }} value={dicFilters.lwd_from} onChange={(e) => setDicFilters((d) => ({ ...d, lwd_from: e.target.value }))} controlId="payroll.fnf-register.lwd-from.input" />
        <TextField size="small" type="date" label="LWD to" InputLabelProps={{ shrink: true }} value={dicFilters.lwd_to} onChange={(e) => setDicFilters((d) => ({ ...d, lwd_to: e.target.value }))} controlId="payroll.fnf-register.lwd-to.input" />
        <TextField size="small" select label="Status" value={dicFilters.status} onChange={(e) => setDicFilters((d) => ({ ...d, status: e.target.value }))} sx={{ minWidth: 160 }} controlId="payroll.fnf-register.status.select">
          {lstStatuses.map((strStatus) => <MenuItem key={strStatus} value={strStatus}>{strStatus}</MenuItem>)}
        </TextField>
        <Button variant="contained" startIcon={<SearchRoundedIcon />} onClick={() => loadRegister().catch(() => undefined)} disabled={blnLoading} controlId="payroll.fnf-register.search.button">Show</Button>
        <Box sx={{ flex: 1 }} />
        {blnCanDownloadAdvice ? <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={() => handlePaymentAdvice().catch(() => undefined)} controlId="payroll.fnf-register.payment-advice.button">Download Payment Advice</Button> : null}
        <Button variant="text" startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/payroll/fnf-settlements")} controlId="payroll.fnf-register.back.button">Back to Settlements</Button>
      </Box>
      {objRegister && lstRows.length ? (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mb: 2 }}>
          {lstAmountColumns.filter((objColumn) => ["decTotalEarnings", "decTds", "decNetPayable", "decNetRecoverable"].includes(objColumn.field)).map((objColumn) => (
            <Box key={objColumn.field}><Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>Total {objColumn.headerName}</Typography><Typography sx={{ fontWeight: 800 }}>{formatCurrency(objRegister.dicTotals[objColumn.field] || 0)}</Typography></Box>
          ))}
        </Box>
      ) : null}
      <CommonTable
        columns={lstColumns}
        rows={lstRows}
        rowIdField="id"
        exportFileName="fnf_register"
        showExportOptions={blnCanExport}
        emptyMessage={blnLoading ? "Loading..." : "No settlements for the selected period."}
        testIdPrefix="payroll.fnf-register"
        showPaginationSummary
        onRowClick={(objRow) => { if (objRow.strRecordUUID) objRouter.push(`/payroll/fnf-settlements/${objRow.strRecordUUID}`); }}
        minTableWidth={1900}
      />
    </Box>
  );
}
