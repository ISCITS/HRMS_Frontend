"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Autocomplete, Box, Button, Checkbox, Link, MenuItem, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { MasterBreadcrumbs, MasterGridSkeleton } from "@/components/master/MasterListUi";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import FNFModuleTabs from "@/features/payroll/components/FNFModuleTabs";
import { formatCurrency } from "@/features/payroll/components/FNFSettlementPanels";
import { useFNFRights } from "@/features/payroll/hooks/useFNFRights";
import { fnfSettlementService } from "@/features/payroll/services/fnfSettlementService";
import type { FNFPayslipDocument, FNFPayslipEmployeeOption, FNFPayslipRecord, FNFRegularPayslipRecord } from "@/features/payroll/types";
import { downloadPayslipHtml, printPayslipHtml } from "@/features/payroll/utils/payslipDocument";

type PeriodPreset = "1" | "3" | "6" | "custom";
const dicEmptySearch = { intEmployeeID: 0, strVersion: "latest", strGeneratedFrom: "", strGeneratedTo: "" };

function formatDate(strValue?: string | null) {
  if (!strValue) return "-";
  const objDate = new Date(strValue.length <= 10 ? `${strValue}T00:00:00` : strValue);
  return Number.isNaN(objDate.getTime()) ? strValue : objDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatMonth(strValue?: string | null) {
  if (!strValue) return "-";
  const objDate = new Date(`${strValue.slice(0, 10)}T00:00:00`);
  return Number.isNaN(objDate.getTime()) ? strValue : objDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

/** "YYYY-MM" of the month nBack months before the month of strDate. */
function monthBefore(strDate: string, intBack: number) {
  const objDate = new Date(`${strDate.slice(0, 10)}T00:00:00`);
  const objMonth = new Date(objDate.getFullYear(), objDate.getMonth() - intBack, 1);
  return `${objMonth.getFullYear()}-${String(objMonth.getMonth() + 1).padStart(2, "0")}`;
}

function statusPill(strStatus: string) {
  const blnCurrent = strStatus === "Generated";
  return <span className={`app-master-status-pill ${blnCurrent ? "app-master-status-active" : "app-master-status-inactive"}`}>{strStatus === "Generated" ? "Current" : strStatus}</span>;
}

export default function FNFPayslipsPage() {
  const { blnLoading: blnRightsLoading, can, canView } = useFNFRights();
  const blnCanView = canView();
  const blnCanExport = can("export");
  const [lstEmployees, setLstEmployees] = useState<FNFPayslipEmployeeOption[]>([]);
  const [dicSearchDraft, setDicSearchDraft] = useState(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState(dicEmptySearch);
  const [lstPayslips, setLstPayslips] = useState<FNFPayslipRecord[]>([]);
  const [lstSelectedFNF, setLstSelectedFNF] = useState<string[]>([]);
  const [lstRegular, setLstRegular] = useState<FNFRegularPayslipRecord[]>([]);
  const [lstSelectedRegular, setLstSelectedRegular] = useState<string[]>([]);
  const [strPeriod, setStrPeriod] = useState<PeriodPreset>("3");
  const [strFromMonth, setStrFromMonth] = useState("");
  const [strToMonth, setStrToMonth] = useState("");
  const [blnLoading, setBlnLoading] = useState(false);
  const [blnRegularLoading, setBlnRegularLoading] = useState(false);
  const [blnBusy, setBlnBusy] = useState(false);
  const [strError, setStrError] = useState("");
  const [strInfo, setStrInfo] = useState("");
  const objSelectedEmployee = useMemo(() => lstEmployees.find((objEmployee) => objEmployee.intEmployeeID === dicSearchApplied.intEmployeeID) || null, [lstEmployees, dicSearchApplied.intEmployeeID]);
  const objDraftEmployee = useMemo(() => lstEmployees.find((objEmployee) => objEmployee.intEmployeeID === dicSearchDraft.intEmployeeID) || null, [lstEmployees, dicSearchDraft.intEmployeeID]);
  const strExitAnchor = objSelectedEmployee ? (objSelectedEmployee.dtResignationDate || objSelectedEmployee.dtLastWorkingDate) : "";

  useEffect(() => {
    if (blnRightsLoading || !blnCanView) return;
    fnfSettlementService.listPayslipEmployees().then(setLstEmployees).catch(() => setLstEmployees([]));
  }, [blnRightsLoading, blnCanView]);

  useEffect(() => {
    if (blnRightsLoading || !blnCanView) return;
    setBlnLoading(true);
    setStrError("");
    setLstSelectedFNF([]);
    fnfSettlementService.listPayslips({
      employee_id: dicSearchApplied.intEmployeeID || "", latest_only: dicSearchApplied.strVersion === "latest",
      generated_from: dicSearchApplied.strGeneratedFrom, generated_to: dicSearchApplied.strGeneratedTo,
    })
      .then(setLstPayslips)
      .catch((objError) => setStrError(objError instanceof Error ? objError.message : "Unable to load F&F payslips."))
      .finally(() => setBlnLoading(false));
  }, [blnRightsLoading, blnCanView, dicSearchApplied]);

  // Period preset -> month range before resignation (or last working date).
  useEffect(() => {
    if (!strExitAnchor || strPeriod === "custom") return;
    const intMonths = Number(strPeriod);
    setStrToMonth(monthBefore(strExitAnchor, 1));
    setStrFromMonth(monthBefore(strExitAnchor, intMonths));
  }, [strExitAnchor, strPeriod]);

  async function loadRegular() {
    if (!objSelectedEmployee || !strFromMonth || !strToMonth) return;
    setBlnRegularLoading(true);
    setStrError("");
    setLstSelectedRegular([]);
    try {
      setLstRegular(await fnfSettlementService.listRegularPayslips(objSelectedEmployee.intEmployeeID, `${strFromMonth}-01`, `${strToMonth}-01`));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load regular payslips.");
    } finally {
      setBlnRegularLoading(false);
    }
  }

  useEffect(() => {
    if (objSelectedEmployee && strFromMonth && strToMonth && strPeriod !== "custom") loadRegular().catch(() => undefined);
    if (!objSelectedEmployee) setLstRegular([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objSelectedEmployee, strFromMonth, strToMonth]);

  async function runDocument(fnLoad: () => Promise<FNFPayslipDocument>, blnDownload: boolean) {
    setBlnBusy(true);
    setStrError("");
    setStrInfo("");
    try {
      const objDocument = await fnLoad();
      if (blnDownload) downloadPayslipHtml(objDocument.strHtml, objDocument.strFileName);
      else printPayslipHtml(objDocument.strHtml, objDocument.strFileName);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to open the payslip.");
    } finally {
      setBlnBusy(false);
    }
  }

  function downloadSelection(lstFNF: string[], lstRegularIDs: string[]) {
    runDocument(() => fnfSettlementService.getPayslipBundle(lstFNF, lstRegularIDs), true).catch(() => undefined);
  }

  function toggle(lstCurrent: string[], strID: string) {
    return lstCurrent.includes(strID) ? lstCurrent.filter((strItem) => strItem !== strID) : [...lstCurrent, strID];
  }

  const strLatestFNFForEmployee = useMemo(() => lstPayslips.find((objRow) => objRow.intEmployeeID === objSelectedEmployee?.intEmployeeID && objRow.strPayslipStatus !== "Superseded")?.strRecordUUID, [lstPayslips, objSelectedEmployee]);

  // ------------------------------------------------------------------ F&F payslips grid
  const lstFNFRows = useMemo(() => lstPayslips.map((objRow) => ({
    id: objRow.strRecordUUID,
    select: <Checkbox inputProps={{ "controlId": "payroll.fnf-payslips.list.row.select.checkbox", "data-row-key": objRow.strRecordUUID } as InputHTMLAttributes<HTMLInputElement>} checked={lstSelectedFNF.includes(objRow.strRecordUUID)} onChange={() => setLstSelectedFNF((lstCurrent) => toggle(lstCurrent, objRow.strRecordUUID))} />,
    payslipNumberText: objRow.strPayslipNumber,
    payslipNumber: (
      <Link component="button" type="button" underline="none" className="app-mui-link-muted app-master-first-column-link" disabled={!blnCanExport}
        data-control-id="payroll.fnf-payslips.list.row.number.link"
        onClick={(objEvent) => {
          objEvent.stopPropagation();
          if (window.getSelection()?.toString()) return;
          runDocument(() => fnfSettlementService.getPayslipDocument(objRow.strRecordUUID), false).catch(() => undefined);
        }}>
        {objRow.strPayslipNumber}
      </Link>
    ),
    employeeName: objRow.strEmployeeName,
    employeeCode: objRow.strEmployeeCode,
    department: objRow.strDepartmentName || "-",
    settlementNumber: objRow.strSettlementNumber,
    lastWorkingDate: formatDate(objRow.dtLastWorkingDate),
    netPay: objRow.decNetRecoverableAmount > 0 ? `- ${formatCurrency(objRow.decNetRecoverableAmount)}` : formatCurrency(objRow.decNetPayAmount),
    netPaySort: objRow.decNetPayAmount - objRow.decNetRecoverableAmount,
    generatedOn: formatDate(objRow.dtGeneratedOn),
    generatedOnSort: objRow.dtGeneratedOn,
    status: statusPill(objRow.strPayslipStatus),
    statusText: objRow.strPayslipStatus,
  })), [lstPayslips, lstSelectedFNF, blnCanExport]);

  const blnAllFNFSelected = lstFNFRows.length > 0 && lstSelectedFNF.length === lstFNFRows.length;
  const lstFNFColumns = useMemo<CommonTableColumn<(typeof lstFNFRows)[number]>[]>(() => [
    {
      field: "select",
      headerName: <Checkbox inputProps={{ "controlId": "payroll.fnf-payslips.list.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>} checked={blnAllFNFSelected} indeterminate={lstSelectedFNF.length > 0 && !blnAllFNFSelected} onChange={() => setLstSelectedFNF(blnAllFNFSelected ? [] : lstFNFRows.map((objRow) => objRow.id))} disabled={!lstFNFRows.length} />,
      sortable: false, filterable: false, exportable: false, width: 56,
    },
    { field: "payslipNumber", headerName: "Payslip No.", sortAccessor: (row) => row.payslipNumberText },
    { field: "employeeName", headerName: "Employee Name" },
    { field: "employeeCode", headerName: "Employee Code" },
    { field: "department", headerName: "Department" },
    { field: "settlementNumber", headerName: "Settlement No." },
    { field: "lastWorkingDate", headerName: "Last Working Date" },
    { field: "netPay", headerName: "Net Pay", sortAccessor: (row) => row.netPaySort },
    { field: "generatedOn", headerName: "Generated On", sortAccessor: (row) => row.generatedOnSort },
    { field: "status", headerName: "Status", sortable: false, filterable: false },
  ], [blnAllFNFSelected, lstFNFRows, lstSelectedFNF.length]);

  // ------------------------------------------------------------------ regular payslips grid
  const lstRegularRows = useMemo(() => lstRegular.map((objRow) => ({
    id: objRow.strRecordUUID,
    select: <Checkbox inputProps={{ "controlId": "payroll.fnf-payslips.regular.row.select.checkbox", "data-row-key": objRow.strRecordUUID } as InputHTMLAttributes<HTMLInputElement>} checked={lstSelectedRegular.includes(objRow.strRecordUUID)} onChange={() => setLstSelectedRegular((lstCurrent) => toggle(lstCurrent, objRow.strRecordUUID))} />,
    payslipNumberText: objRow.strPayslipNumber,
    payslipNumber: (
      <Link component="button" type="button" underline="none" className="app-mui-link-muted app-master-first-column-link" disabled={!blnCanExport}
        data-control-id="payroll.fnf-payslips.regular.row.number.link"
        onClick={(objEvent) => {
          objEvent.stopPropagation();
          if (window.getSelection()?.toString()) return;
          runDocument(() => fnfSettlementService.getRegularPayslipDocument(objRow.strRecordUUID), false).catch(() => undefined);
        }}>
        {objRow.strPayslipNumber}
      </Link>
    ),
    payrollMonth: formatMonth(objRow.dtPayrollMonth),
    payrollMonthSort: objRow.dtPayrollMonth,
    runCode: objRow.strRunCode,
    grossEarnings: formatCurrency(objRow.decGrossAmount),
    grossSort: objRow.decGrossAmount,
    netPay: formatCurrency(objRow.decNetPayAmount),
    netPaySort: objRow.decNetPayAmount,
    generatedOn: formatDate(objRow.dtGeneratedOn),
    status: statusPill(objRow.strPayslipStatus === "Generated" ? "Generated" : objRow.strPayslipStatus),
  })), [lstRegular, lstSelectedRegular, blnCanExport]);

  const blnAllRegularSelected = lstRegularRows.length > 0 && lstSelectedRegular.length === lstRegularRows.length;
  const lstRegularColumns = useMemo<CommonTableColumn<(typeof lstRegularRows)[number]>[]>(() => [
    {
      field: "select",
      headerName: <Checkbox inputProps={{ "controlId": "payroll.fnf-payslips.regular.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>} checked={blnAllRegularSelected} indeterminate={lstSelectedRegular.length > 0 && !blnAllRegularSelected} onChange={() => setLstSelectedRegular(blnAllRegularSelected ? [] : lstRegularRows.map((objRow) => objRow.id))} disabled={!lstRegularRows.length} />,
      sortable: false, filterable: false, exportable: false, width: 56,
    },
    { field: "payslipNumber", headerName: "Payslip No.", sortAccessor: (row) => row.payslipNumberText },
    { field: "payrollMonth", headerName: "Payroll Month", sortAccessor: (row) => row.payrollMonthSort },
    { field: "runCode", headerName: "Payroll Run" },
    { field: "grossEarnings", headerName: "Gross Earnings", sortAccessor: (row) => row.grossSort },
    { field: "netPay", headerName: "Net Pay", sortAccessor: (row) => row.netPaySort },
    { field: "generatedOn", headerName: "Generated On" },
    { field: "status", headerName: "Status", sortable: false, filterable: false },
  ], [blnAllRegularSelected, lstRegularRows, lstSelectedRegular.length]);

  if (!blnRightsLoading && !blnCanView) return <Alert severity="error">You do not have access to F&amp;F payslips.</Alert>;

  return (
    <Box className={`${styles.page} app-master-page-relative`} data-controlid="payroll.fnf-payslips.page">
      <MasterBreadcrumbs strSection="Employee Services" strTitle="F&F Payslips" />
      <FNFModuleTabs strActive="payslips" />
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strInfo ? <Alert severity="info">{strInfo}</Alert> : null}

      <Box className="app-master-search-panel">
        <Box className={`${styles.searchRow} app-master-search-row-centered`}>
          <Autocomplete
            options={lstEmployees}
            value={objDraftEmployee}
            getOptionLabel={(objOption) => objOption?.strLabel || ""}
            isOptionEqualToValue={(objOption, objValue) => objOption.intEmployeeID === objValue.intEmployeeID}
            onChange={(_, objValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, intEmployeeID: objValue?.intEmployeeID || 0 }))}
            renderInput={(params) => <TextField {...params} className="app-mui-text-field" label="Employee" placeholder="All employees" size="small" controlId="payroll.fnf-payslips.list.search-employee.input" />}
            sx={{ minWidth: 260 }}
          />
          <TextField className="app-mui-text-field" select label="Version" value={dicSearchDraft.strVersion} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strVersion: objEvent.target.value }))} size="small" fullWidth controlId="payroll.fnf-payslips.list.search-version.select">
            <MenuItem value="latest">Latest only</MenuItem>
            <MenuItem value="all">All versions</MenuItem>
          </TextField>
          <TextField className="app-mui-text-field" type="date" label="Generated From" InputLabelProps={{ shrink: true }} value={dicSearchDraft.strGeneratedFrom} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strGeneratedFrom: objEvent.target.value }))} size="small" fullWidth controlId="payroll.fnf-payslips.list.search-from.input" />
          <TextField className="app-mui-text-field" type="date" label="Generated To" InputLabelProps={{ shrink: true }} value={dicSearchDraft.strGeneratedTo} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strGeneratedTo: objEvent.target.value }))} size="small" fullWidth controlId="payroll.fnf-payslips.list.search-to.input" />
          <Box className={styles.searchActions}><Button data-control-id="payroll.fnf-payslips.list.search.button" className="app-btn app-btn-primary" size="small" startIcon={<SearchRoundedIcon />} onClick={() => setDicSearchApplied(dicSearchDraft)}>Search</Button></Box>
          <Box className={styles.searchActions}><Button data-control-id="payroll.fnf-payslips.list.clear.button" className="app-btn app-btn-outline" size="small" startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); }}>Clear</Button></Box>
        </Box>
        {lstSelectedFNF.length > 0 && blnCanExport ? (
          <Box className={styles.bulkBar}>
            <Typography className={styles.bulkCount}>{`${lstSelectedFNF.length} row(s) selected`}</Typography>
            <Button data-control-id="payroll.fnf-payslips.list.bulk-download.button" className="app-btn app-btn-outline" startIcon={<DownloadRoundedIcon />} onClick={() => downloadSelection(lstSelectedFNF, [])} disabled={blnBusy}>Download Selected</Button>
          </Box>
        ) : null}
      </Box>

      <Box className="app-master-table-panel app-master-page-relative">
        {blnLoading || blnRightsLoading ? <MasterGridSkeleton strControlId="payroll.fnf-payslips.list.skeleton" intColumns={9} /> : (
          <CommonTable
            columns={lstFNFColumns}
            rows={lstFNFRows}
            rowIdField="id"
            exportFileName="fnf_payslips"
            exportButtonClassName="app-btn app-btn-outline"
            showExportOptions={blnCanExport}
            testIdPrefix="payroll.fnf-payslips.list"
            showPaginationSummary
            hideRowClickHint
            minTableWidth={1100}
            emptyMessage="No F&F payslips yet. Open a calculated settlement and click Generate Payslip."
            className="app-master-common-table-reset"
          />
        )}
      </Box>

      {objSelectedEmployee ? (
        <Box className="app-master-search-panel" sx={{ mt: 2 }}>
          <Typography sx={{ fontWeight: 800, mb: 1 }}>
            Regular payslips before exit - {objSelectedEmployee.strLabel}
            <Typography component="span" sx={{ color: "#64748b", fontWeight: 400, ml: 1, fontSize: "0.85rem" }}>
              (resigned {formatDate(objSelectedEmployee.dtResignationDate)}, last working date {formatDate(objSelectedEmployee.dtLastWorkingDate)})
            </Typography>
          </Typography>
          <Box className={`${styles.searchRow} app-master-search-row-centered`}>
            <TextField className="app-mui-text-field" select label="Period" value={strPeriod} onChange={(objEvent) => setStrPeriod(objEvent.target.value as PeriodPreset)} size="small" fullWidth controlId="payroll.fnf-payslips.regular.period.select">
              <MenuItem value="1">Last 1 month before resignation</MenuItem>
              <MenuItem value="3">Last 3 months before resignation</MenuItem>
              <MenuItem value="6">Last 6 months before resignation</MenuItem>
              <MenuItem value="custom">Custom range</MenuItem>
            </TextField>
            <TextField className="app-mui-text-field" type="month" label="From Month" InputLabelProps={{ shrink: true }} value={strFromMonth} onChange={(objEvent) => { setStrPeriod("custom"); setStrFromMonth(objEvent.target.value); }} size="small" fullWidth controlId="payroll.fnf-payslips.regular.from-month.input" />
            <TextField className="app-mui-text-field" type="month" label="To Month" InputLabelProps={{ shrink: true }} value={strToMonth} onChange={(objEvent) => { setStrPeriod("custom"); setStrToMonth(objEvent.target.value); }} size="small" fullWidth controlId="payroll.fnf-payslips.regular.to-month.input" />
            <Box className={styles.searchActions}><Button data-control-id="payroll.fnf-payslips.regular.show.button" className="app-btn app-btn-primary" size="small" startIcon={<SearchRoundedIcon />} onClick={() => loadRegular().catch(() => undefined)} disabled={blnRegularLoading || !strFromMonth || !strToMonth}>Show</Button></Box>
          </Box>
          {blnCanExport && lstRegularRows.length ? (
            <Box className={styles.bulkBar}>
              <Typography className={styles.bulkCount}>{lstSelectedRegular.length ? `${lstSelectedRegular.length} row(s) selected` : `${lstRegularRows.length} payslip(s) in this period`}</Typography>
              <Button data-control-id="payroll.fnf-payslips.regular.download-selected.button" className="app-btn app-btn-outline" startIcon={<DownloadRoundedIcon />} onClick={() => downloadSelection([], lstSelectedRegular)} disabled={blnBusy || !lstSelectedRegular.length}>Download Selected</Button>
              <Button data-control-id="payroll.fnf-payslips.regular.download-all.button" className="app-btn app-btn-outline" startIcon={<DownloadRoundedIcon />} onClick={() => downloadSelection([], lstRegularRows.map((objRow) => objRow.id))} disabled={blnBusy}>Download All</Button>
              {strLatestFNFForEmployee ? (
                <Button data-control-id="payroll.fnf-payslips.regular.download-with-fnf.button" className="app-btn app-btn-primary" startIcon={<DownloadRoundedIcon />} onClick={() => downloadSelection([strLatestFNFForEmployee], lstSelectedRegular.length ? lstSelectedRegular : lstRegularRows.map((objRow) => objRow.id))} disabled={blnBusy}>Download with F&amp;F Payslip</Button>
              ) : null}
            </Box>
          ) : null}
          <Box className="app-master-table-panel app-master-page-relative" sx={{ mt: 1 }}>
            {blnRegularLoading ? <MasterGridSkeleton strControlId="payroll.fnf-payslips.regular.skeleton" intColumns={7} /> : (
              <CommonTable
                columns={lstRegularColumns}
                rows={lstRegularRows}
                rowIdField="id"
                exportFileName="regular_payslips_before_exit"
                exportButtonClassName="app-btn app-btn-outline"
                showExportOptions={blnCanExport}
                testIdPrefix="payroll.fnf-payslips.regular"
                showPaginationSummary
                hideRowClickHint
                minTableWidth={900}
                emptyMessage="No generated payslips for this employee in the selected months."
                className="app-master-common-table-reset"
              />
            )}
          </Box>
        </Box>
      ) : (
        <Typography sx={{ color: "#64748b", mt: 2 }}>Select an employee and click Search to also see their regular payslips before resignation.</Typography>
      )}
      <BlockingLoader blnOpen={blnBusy} strLabel="Preparing payslip..." />
    </Box>
  );
}
