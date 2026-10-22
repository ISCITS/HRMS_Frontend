"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Link, MenuItem, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { MasterAddColumnsControl, MasterBreadcrumbs, MasterGridSkeleton, type MasterOptionalColumn } from "@/components/master/MasterListUi";
import styles from "@/components/master/MasterScreen.module.css";
import FNFModuleTabs from "@/features/payroll/components/FNFModuleTabs";
import { formatCurrency } from "@/features/payroll/components/FNFSettlementPanels";
import { useFNFRights } from "@/features/payroll/hooks/useFNFRights";
import { fnfSettlementService } from "@/features/payroll/services/fnfSettlementService";
import type { FNFPayslipEmployeeOption, FNFReportRow, FNFSettlementRecord } from "@/features/payroll/types";

const dicEmptySearch = { strLwdFrom: "", strLwdTo: "", strStatus: "All", intEmployeeID: 0, strDepartment: "" };
const lstStatuses = ["draft", "calculated", "under_review", "released", "approved", "locked", "paid", "recovered", "cancelled"];

function formatDate(strValue?: string | null) {
  if (!strValue) return "-";
  const objDate = new Date(strValue.length <= 10 ? `${strValue}T00:00:00` : strValue);
  return Number.isNaN(objDate.getTime()) ? strValue : objDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatStatus(strStatus?: string | null) {
  return (strStatus || "-").replace(/_/g, " ").replace(/\b\w/g, (strChar) => strChar.toUpperCase());
}

function statusPill(strStatus: string) {
  const blnClosed = ["cancelled"].includes(strStatus);
  return <span className={`app-master-status-pill ${blnClosed ? "app-master-status-inactive" : "app-master-status-active"}`}>{formatStatus(strStatus)}</span>;
}

type AmountKey = { [K in keyof FNFReportRow]: FNFReportRow[K] extends number ? K : never }[keyof FNFReportRow];

// Optional columns ("Add columns"): every remaining field of the settlement.
type OptionalKey =
  | "designation" | "dateOfJoining" | "exitType" | "exitReason" | "resignationDate" | "settlementNumber" | "settlementDate" | "servicePeriod"
  | "noticeDays" | "leaveDays" | AmountKey | "blockingIssues" | "approvedOn" | "paidOn" | "paymentReference" | "payslipNumber" | "payslipStatus" | "createdOn";

const lstAmountColumns: { strKey: AmountKey; strLabel: string }[] = [
  { strKey: "decSalaryEarned", strLabel: "Salary Earned" },
  { strKey: "decLeaveEncashment", strLabel: "Leave Encashment" },
  { strKey: "decNoticePay", strLabel: "Notice Pay" },
  { strKey: "decGratuity", strLabel: "Gratuity" },
  { strKey: "decReimbursement", strLabel: "Reimbursement" },
  { strKey: "decOtherEarnings", strLabel: "Other Earnings" },
  { strKey: "decNoticeRecovery", strLabel: "Notice Recovery" },
  { strKey: "decLoanRecovery", strLabel: "Loan Recovery" },
  { strKey: "decExcessSalaryRecovery", strLabel: "Excess Salary Recovery" },
  { strKey: "decExcessLeaveRecovery", strLabel: "Excess Leave Recovery" },
  { strKey: "decOtherRecoveries", strLabel: "Other Recoveries" },
  { strKey: "decOtherDeductions", strLabel: "Other Deductions" },
  { strKey: "decPf", strLabel: "PF" },
  { strKey: "decEsi", strLabel: "ESI" },
  { strKey: "decPt", strLabel: "PT" },
  { strKey: "decLwf", strLabel: "LWF" },
  { strKey: "decOtherStatutory", strLabel: "Other Statutory" },
  { strKey: "decTaxableIncome", strLabel: "Taxable Income" },
];

const lstOptionalColumns: MasterOptionalColumn<OptionalKey>[] = [
  { strKey: "designation", strLabel: "Designation" },
  { strKey: "dateOfJoining", strLabel: "Date of Joining" },
  { strKey: "exitType", strLabel: "Exit Type" },
  { strKey: "exitReason", strLabel: "Exit Reason" },
  { strKey: "resignationDate", strLabel: "Resignation Date" },
  { strKey: "settlementNumber", strLabel: "Settlement No." },
  { strKey: "settlementDate", strLabel: "Settlement Date" },
  { strKey: "servicePeriod", strLabel: "Service Period" },
  { strKey: "noticeDays", strLabel: "Notice Days (Period / Served / Shortfall)" },
  { strKey: "leaveDays", strLabel: "Leave Days Encashed" },
  ...lstAmountColumns,
  { strKey: "blockingIssues", strLabel: "Blocking Issues" },
  { strKey: "approvedOn", strLabel: "Approved On" },
  { strKey: "paidOn", strLabel: "Paid On" },
  { strKey: "paymentReference", strLabel: "Payment Reference" },
  { strKey: "payslipNumber", strLabel: "F&F Payslip No." },
  { strKey: "payslipStatus", strLabel: "F&F Payslip Status" },
  { strKey: "createdOn", strLabel: "Created On" },
];

const lstSummaryTotals: { strKey: string; strLabel: string }[] = [
  { strKey: "decTotalEarnings", strLabel: "Total Earnings" },
  { strKey: "decTotalRecoveries", strLabel: "Total Recoveries" },
  { strKey: "decTotalStatutory", strLabel: "Statutory" },
  { strKey: "decTds", strLabel: "TDS" },
  { strKey: "decNetPayable", strLabel: "Net Payable" },
  { strKey: "decNetRecoverable", strLabel: "Net Recoverable" },
];

// ---------------------------------------------------------------- detail dialog helpers
function humanize(strKey: string) {
  return strKey.replace(/^(str|dec|dt|int|bln|dic|lst|obj)(?=[A-Z])/, "").replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^\w/, (strChar) => strChar.toUpperCase());
}

function formatValue(objValue: unknown): string {
  if (objValue === null || objValue === undefined || objValue === "") return "-";
  if (typeof objValue === "boolean") return objValue ? "Yes" : "No";
  if (typeof objValue === "number") return Number.isInteger(objValue) ? String(objValue) : objValue.toFixed(2);
  if (typeof objValue === "object") return JSON.stringify(objValue);
  return String(objValue);
}

const cellSx = { borderBottom: "1px solid #e2e8f0", p: 0.75, fontSize: "0.82rem", textAlign: "left", verticalAlign: "top" } as const;

/** Renders any snapshot section: a list of records as a table, a record as label/value pairs. */
function SnapshotSection({ strTitle, objValue }: { strTitle: string; objValue: unknown }) {
  if (objValue === null || objValue === undefined || (Array.isArray(objValue) && !objValue.length)) return null;
  let objBody: ReactNode;
  if (Array.isArray(objValue) && objValue.every((objItem) => objItem && typeof objItem === "object" && !Array.isArray(objItem))) {
    const lstKeys = Array.from(new Set(objValue.flatMap((objItem) => Object.keys(objItem as Record<string, unknown>))));
    objBody = (
      <Box sx={{ overflowX: "auto" }}>
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{lstKeys.map((strKey) => <Box component="th" key={strKey} sx={{ ...cellSx, fontWeight: 700 }}>{humanize(strKey)}</Box>)}</tr></thead>
          <tbody>{objValue.map((objItem, intIndex) => <tr key={intIndex}>{lstKeys.map((strKey) => <Box component="td" key={strKey} sx={cellSx}>{formatValue((objItem as Record<string, unknown>)[strKey])}</Box>)}</tr>)}</tbody>
        </Box>
      </Box>
    );
  } else if (objValue && typeof objValue === "object" && !Array.isArray(objValue)) {
    objBody = (
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 1 }}>
        {Object.entries(objValue as Record<string, unknown>).map(([strKey, objItem]) => (
          <Box key={strKey}><Typography sx={{ color: "#64748b", fontSize: "0.75rem" }}>{humanize(strKey)}</Typography><Typography sx={{ fontSize: "0.85rem", wordBreak: "break-word" }}>{formatValue(objItem)}</Typography></Box>
        ))}
      </Box>
    );
  } else {
    objBody = <Typography sx={{ fontSize: "0.85rem" }}>{formatValue(objValue)}</Typography>;
  }
  return (
    <Box sx={{ borderTop: "1px solid #d9e6ef", pt: 1.5, mt: 1.5 }}>
      <Typography sx={{ fontWeight: 800, mb: 1 }}>{strTitle}</Typography>
      {objBody}
    </Box>
  );
}

function FNFReportDetailDialog({ objRow, onClose }: { objRow: FNFReportRow | null; onClose: () => void }) {
  const objRouter = useRouter();
  const [objSettlement, setObjSettlement] = useState<FNFSettlementRecord | null>(null);
  const [strError, setStrError] = useState("");
  const [blnLoading, setBlnLoading] = useState(false);

  useEffect(() => {
    if (!objRow) return;
    setObjSettlement(null);
    setStrError("");
    setBlnLoading(true);
    fnfSettlementService.getSettlement(objRow.strRecordUUID)
      .then(setObjSettlement)
      .catch((objError) => setStrError(objError instanceof Error ? objError.message : "Unable to load the settlement."))
      .finally(() => setBlnLoading(false));
  }, [objRow]);

  const dicSnapshot = (objSettlement?.objCalculationSnapshot || {}) as Record<string, unknown>;
  const lstSummary: [string, string][] = objRow ? [
    ["Employee", `${objRow.strEmployeeCode} - ${objRow.strEmployeeName}`], ["Department", objRow.strDepartmentName || "-"], ["Designation", objRow.strDesignationName || "-"],
    ["Date of Joining", formatDate(objRow.dtDateOfJoining)], ["Resignation Date", formatDate(objRow.dtResignationDate)], ["Last Working Date", formatDate(objRow.dtLastWorkingDate)],
    ["Exit Type", formatStatus(objRow.strExitType)], ["Service Period", objRow.strServicePeriod || "-"], ["Status", formatStatus(objRow.strSettlementStatus)],
    ["Notice (Period / Served / Shortfall)", `${objRow.decNoticePeriodDays} / ${objRow.decNoticeServedDays} / ${objRow.decNoticeShortfallDays}`], ["Leave Days Encashed", String(objRow.decLeaveEncashedDays)], ["Taxable Income", formatCurrency(objRow.decTaxableIncome)],
    ["Total Earnings", formatCurrency(objRow.decTotalEarnings)], ["Total Recoveries", formatCurrency(objRow.decTotalRecoveries)], ["Statutory", formatCurrency(objRow.decTotalStatutory)],
    ["TDS", formatCurrency(objRow.decTds)], ["Net Payable", formatCurrency(objRow.decNetPayable)], ["Net Recoverable", formatCurrency(objRow.decNetRecoverable)],
  ] : [];

  return (
    <Dialog open={Boolean(objRow)} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>{objRow ? `F&F detail - ${objRow.strEmployeeName} (${objRow.strSettlementNumber})` : ""}</DialogTitle>
      <DialogContent dividers>
        {strError ? <Alert severity="error" sx={{ mb: 1.5 }}>{strError}</Alert> : null}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 1.25 }}>
          {lstSummary.map(([strLabel, strValue]) => (
            <Box key={strLabel}><Typography sx={{ color: "#64748b", fontSize: "0.75rem" }}>{strLabel}</Typography><Typography sx={{ fontSize: "0.9rem", fontWeight: 600 }}>{strValue}</Typography></Box>
          ))}
        </Box>
        {blnLoading ? <Typography sx={{ color: "#64748b", mt: 2 }}>Loading settlement lines...</Typography> : null}
        {objSettlement ? (
          <>
            <SnapshotSection strTitle="Settlement lines (with working)" objValue={(objSettlement.lstLines || []).map((objLine) => ({
              Type: objLine.strRecoveryType ? `${objLine.strLineType} / ${objLine.strRecoveryType}` : objLine.strLineType,
              Code: objLine.strLineCode, Name: objLine.strLineName, Basis: objLine.strCalculationBasis, Days: objLine.decCalculationDays, Rate: objLine.decRateAmount,
              Amount: objLine.decAmount, Taxable: objLine.decTaxableAmount, Override: objLine.blnIsManualOverride, Working: objLine.strRemarks,
            }))} />
            <SnapshotSection strTitle="Salary months" objValue={dicSnapshot.salary_months} />
            <SnapshotSection strTitle="Leave encashment" objValue={dicSnapshot.leave_detail} />
            <SnapshotSection strTitle="Notice pay / recovery" objValue={dicSnapshot.notice_detail} />
            <SnapshotSection strTitle="Gratuity" objValue={dicSnapshot.gratuity_detail} />
            <SnapshotSection strTitle="Nominees" objValue={dicSnapshot.nominees} />
            <SnapshotSection strTitle="Validations" objValue={dicSnapshot.validations} />
            <SnapshotSection strTitle="Audit trail" objValue={(objSettlement.lstAudit || []).map((objAudit) => ({
              Action: objAudit.strActionCode, From: formatStatus(objAudit.strFromStatus), To: formatStatus(objAudit.strToStatus), On: formatDate(objAudit.dtActionOn), Remarks: objAudit.strRemarks,
            }))} />
          </>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} controlId="payroll.fnf-report.detail.close.button">Close</Button>
        {objRow ? <Button className="app-btn app-btn-primary" startIcon={<OpenInNewRoundedIcon />} onClick={() => objRouter.push(`/payroll/fnf-settlements/${objRow.strRecordUUID}`)} controlId="payroll.fnf-report.detail.open.button">Open Settlement</Button> : null}
      </DialogActions>
    </Dialog>
  );
}

// ---------------------------------------------------------------- page
export default function FNFReportPage() {
  const { blnLoading: blnRightsLoading, can, canView } = useFNFRights();
  const blnCanView = canView();
  const blnCanExport = can("export");
  const [lstEmployees, setLstEmployees] = useState<FNFPayslipEmployeeOption[]>([]);
  const [dicSearchDraft, setDicSearchDraft] = useState(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState(dicEmptySearch);
  const [lstRows, setLstRows] = useState<FNFReportRow[]>([]);
  const [dicTotals, setDicTotals] = useState<Record<string, number>>({});
  const [lstVisibleOptional, setLstVisibleOptional] = useState<OptionalKey[]>([]);
  const [objDetailRow, setObjDetailRow] = useState<FNFReportRow | null>(null);
  const [blnLoading, setBlnLoading] = useState(false);
  const [strError, setStrError] = useState("");
  const objDraftEmployee = useMemo(() => lstEmployees.find((objEmployee) => objEmployee.intEmployeeID === dicSearchDraft.intEmployeeID) || null, [lstEmployees, dicSearchDraft.intEmployeeID]);

  useEffect(() => {
    if (blnRightsLoading || !blnCanView) return;
    fnfSettlementService.listPayslipEmployees().then(setLstEmployees).catch(() => setLstEmployees([]));
  }, [blnRightsLoading, blnCanView]);

  useEffect(() => {
    if (blnRightsLoading || !blnCanView) return;
    setBlnLoading(true);
    setStrError("");
    fnfSettlementService.getReport({
      lwd_from: dicSearchApplied.strLwdFrom, lwd_to: dicSearchApplied.strLwdTo, status: dicSearchApplied.strStatus,
      employee_id: dicSearchApplied.intEmployeeID || "", department: dicSearchApplied.strDepartment.trim(),
    })
      .then((objResponse) => { setLstRows(objResponse.lstRows); setDicTotals(objResponse.dicTotals || {}); })
      .catch((objError) => setStrError(objError instanceof Error ? objError.message : "Unable to load the F&F report."))
      .finally(() => setBlnLoading(false));
  }, [blnRightsLoading, blnCanView, dicSearchApplied]);

  const lstTableRows = useMemo(() => lstRows.map((objRow) => {
    const dicAmounts = Object.fromEntries(lstAmountColumns.map((objColumn) => [objColumn.strKey, formatCurrency(objRow[objColumn.strKey])]));
    return {
      ...dicAmounts,
      id: objRow.strRecordUUID,
      employeeNameText: objRow.strEmployeeName,
      employeeName: (
        <Link component="button" type="button" underline="none" className="app-mui-link-muted app-master-first-column-link"
          data-control-id="payroll.fnf-report.list.row.employee.link"
          onClick={(objEvent) => {
            objEvent.stopPropagation();
            if (window.getSelection()?.toString()) return;
            setObjDetailRow(objRow);
          }}>
          {objRow.strEmployeeName}
        </Link>
      ),
      employeeCode: objRow.strEmployeeCode,
      department: objRow.strDepartmentName || "-",
      lastWorkingDate: formatDate(objRow.dtLastWorkingDate),
      status: statusPill(objRow.strSettlementStatus),
      statusText: formatStatus(objRow.strSettlementStatus),
      totalEarnings: formatCurrency(objRow.decTotalEarnings),
      totalRecoveries: formatCurrency(objRow.decTotalRecoveries),
      statutory: formatCurrency(objRow.decTotalStatutory),
      tds: formatCurrency(objRow.decTds),
      netPayable: formatCurrency(objRow.decNetPayable),
      netRecoverable: formatCurrency(objRow.decNetRecoverable),
      designation: objRow.strDesignationName || "-",
      dateOfJoining: formatDate(objRow.dtDateOfJoining),
      exitType: formatStatus(objRow.strExitType),
      exitReason: objRow.strExitReason || "-",
      resignationDate: formatDate(objRow.dtResignationDate),
      settlementNumber: objRow.strSettlementNumber,
      settlementDate: formatDate(objRow.dtSettlementDate),
      servicePeriod: objRow.strServicePeriod || "-",
      noticeDays: `${objRow.decNoticePeriodDays} / ${objRow.decNoticeServedDays} / ${objRow.decNoticeShortfallDays}`,
      leaveDays: objRow.decLeaveEncashedDays,
      blockingIssues: objRow.intBlockingIssues,
      approvedOn: formatDate(objRow.dtApprovedOn),
      paidOn: formatDate(objRow.dtPaidOn),
      paymentReference: objRow.strPaymentReferenceNo || "-",
      payslipNumber: objRow.strPayslipNumber || "-",
      payslipStatus: objRow.strPayslipStatus || "-",
      createdOn: formatDate(objRow.dtAddedOn),
    };
  }), [lstRows]);

  type TableRow = (typeof lstTableRows)[number];
  const dicRowsByID = useMemo(() => new Map(lstRows.map((objRow) => [objRow.strRecordUUID, objRow])), [lstRows]);
  const lstColumns = useMemo<CommonTableColumn<TableRow>[]>(() => {
    const amountSort = (strKey: AmountKey) => (row: TableRow) => dicRowsByID.get(row.id)?.[strKey] ?? 0;
    const lstDefault: CommonTableColumn<TableRow>[] = [
      { field: "employeeName", headerName: "Employee Name", sortAccessor: (row) => row.employeeNameText },
      { field: "employeeCode", headerName: "Employee Code" },
      { field: "department", headerName: "Department" },
      { field: "lastWorkingDate", headerName: "Last Working Date", sortAccessor: (row) => dicRowsByID.get(row.id)?.dtLastWorkingDate ?? "" },
      { field: "status", headerName: "Status", sortAccessor: (row) => row.statusText },
      { field: "totalEarnings", headerName: "Total Earnings", sortAccessor: amountSort("decTotalEarnings") },
      { field: "totalRecoveries", headerName: "Total Recoveries", sortAccessor: amountSort("decTotalRecoveries") },
      { field: "statutory", headerName: "Statutory", sortAccessor: amountSort("decTotalStatutory") },
      { field: "tds", headerName: "TDS", sortAccessor: amountSort("decTds") },
      { field: "netPayable", headerName: "Net Payable", sortAccessor: amountSort("decNetPayable") },
      { field: "netRecoverable", headerName: "Net Recoverable", sortAccessor: amountSort("decNetRecoverable") },
    ];
    const lstOptional = lstOptionalColumns
      .filter((objColumn) => lstVisibleOptional.includes(objColumn.strKey))
      .map((objColumn): CommonTableColumn<TableRow> => {
        const blnAmount = lstAmountColumns.some((objAmount) => objAmount.strKey === objColumn.strKey);
        return { field: objColumn.strKey as keyof TableRow & string, headerName: objColumn.strLabel, ...(blnAmount ? { sortAccessor: amountSort(objColumn.strKey as AmountKey) } : {}) };
      });
    return [...lstDefault, ...lstOptional];
  }, [lstVisibleOptional, dicRowsByID]);

  if (!blnRightsLoading && !blnCanView) return <Alert severity="error">You do not have access to the F&amp;F report.</Alert>;

  return (
    <Box className={`${styles.page} app-master-page-relative`} data-controlid="payroll.fnf-report.page">
      <MasterBreadcrumbs strSection="Employee Services" strTitle="F&F Report" />
      <FNFModuleTabs strActive="report" />
      {strError ? <Alert severity="error">{strError}</Alert> : null}

      <Box className="app-master-search-panel">
        <Box className={`${styles.searchRow} app-master-search-row-centered`}>
          <TextField className="app-mui-text-field" type="date" label="LWD From" InputLabelProps={{ shrink: true }} value={dicSearchDraft.strLwdFrom} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strLwdFrom: objEvent.target.value }))} size="small" fullWidth controlId="payroll.fnf-report.search-lwd-from.input" />
          <TextField className="app-mui-text-field" type="date" label="LWD To" InputLabelProps={{ shrink: true }} value={dicSearchDraft.strLwdTo} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strLwdTo: objEvent.target.value }))} size="small" fullWidth controlId="payroll.fnf-report.search-lwd-to.input" />
          <TextField className="app-mui-text-field" select label="Status" value={dicSearchDraft.strStatus} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: objEvent.target.value }))} size="small" fullWidth controlId="payroll.fnf-report.search-status.select">
            <MenuItem value="All">All</MenuItem>
            {lstStatuses.map((strStatus) => <MenuItem key={strStatus} value={strStatus}>{formatStatus(strStatus)}</MenuItem>)}
          </TextField>
          <Autocomplete
            options={lstEmployees}
            value={objDraftEmployee}
            getOptionLabel={(objOption) => objOption?.strLabel || ""}
            isOptionEqualToValue={(objOption, objValue) => objOption.intEmployeeID === objValue.intEmployeeID}
            onChange={(_, objValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, intEmployeeID: objValue?.intEmployeeID || 0 }))}
            renderInput={(params) => <TextField {...params} className="app-mui-text-field" label="Employee" placeholder="All employees" size="small" controlId="payroll.fnf-report.search-employee.input" />}
            sx={{ minWidth: 240 }}
          />
          <TextField className="app-mui-text-field" label="Department" value={dicSearchDraft.strDepartment} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strDepartment: objEvent.target.value }))} size="small" fullWidth controlId="payroll.fnf-report.search-department.input" />
          <Box className={styles.searchActions}><Button data-control-id="payroll.fnf-report.search.button" className="app-btn app-btn-primary" size="small" startIcon={<SearchRoundedIcon />} onClick={() => setDicSearchApplied(dicSearchDraft)}>Search</Button></Box>
          <Box className={styles.searchActions}><Button data-control-id="payroll.fnf-report.clear.button" className="app-btn app-btn-outline" size="small" startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); }}>Clear</Button></Box>
        </Box>
        {lstRows.length ? (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(7, minmax(0, 1fr))" }, gap: 1, mt: 1.5 }}>
            <Box><Typography sx={{ color: "#64748b", fontSize: "0.75rem" }}>Settlements</Typography><Typography sx={{ fontWeight: 800 }}>{lstRows.length}</Typography></Box>
            {lstSummaryTotals.map((objTotal) => (
              <Box key={objTotal.strKey}><Typography sx={{ color: "#64748b", fontSize: "0.75rem" }}>{objTotal.strLabel}</Typography><Typography sx={{ fontWeight: 800 }}>{formatCurrency(dicTotals[objTotal.strKey])}</Typography></Box>
            ))}
          </Box>
        ) : null}
      </Box>

      <Box className="app-master-table-panel app-master-page-relative">
        {blnLoading || blnRightsLoading ? <MasterGridSkeleton strControlId="payroll.fnf-report.list.skeleton" intColumns={11} /> : (
          <CommonTable
            columns={lstColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName="fnf_report"
            exportButtonClassName="app-btn app-btn-outline"
            showExportOptions={blnCanExport}
            testIdPrefix="payroll.fnf-report.list"
            showPaginationSummary
            hideRowClickHint
            minTableWidth={1300}
            emptyMessage="No F&F settlements match the filters."
            className="app-master-common-table-reset"
            toolbarAfterExport={<MasterAddColumnsControl strControlPrefix="payroll.fnf-report.list" lstColumns={lstOptionalColumns} lstVisibleKeys={lstVisibleOptional} onChange={setLstVisibleOptional} />}
          />
        )}
      </Box>
      <FNFReportDetailDialog objRow={objDetailRow} onClose={() => setObjDetailRow(null)} />
    </Box>
  );
}
