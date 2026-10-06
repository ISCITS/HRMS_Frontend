"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Autocomplete, Box, Button, InputAdornment, Link, MenuItem, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";

import CommonSearchableSelect from "@/Common/components/CommonSearchableSelect";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { MasterAddColumnsControl, MasterBreadcrumbs, MasterGridSkeleton, dicMasterRowSx, onSearchEnter, type MasterOptionalColumn } from "@/components/master/MasterListUi";
import styles from "@/components/master/MasterScreen.module.css";
import FNFStatusBadge from "@/features/payroll/components/FNFStatusBadge";
import { fnfSettlementService } from "@/features/payroll/services/fnfSettlementService";
import type { FNFEmployeeOption, FNFSettlementRecord, FNFSettlementStatus } from "@/features/payroll/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { formatCurrency } from "@/features/payroll/components/FNFSettlementPanels";

const lstModuleCodes = ["PAYROLL_FNF_SETTLEMENTS", "PAYROLL_FNF", "FNF_SETTLEMENTS"];
const lstStatuses: Array<"All" | FNFSettlementStatus> = ["All", "draft", "calculated", "under_review", "released", "approved", "locked", "paid", "recovered", "cancelled"];
const dicEmptyFilters = { employee_code: "", department: "", settlement_month: "", status: "All", exit_type: "", lwd_from: "", lwd_to: "", payable_type: "All" };

type OptionalColumnKey = "exitType" | "addedOn" | "lastModifiedOn";
const lstOptionalColumns: MasterOptionalColumn<OptionalColumnKey>[] = [
  { strKey: "exitType", strLabel: "Exit Type" },
  { strKey: "addedOn", strLabel: "Created" },
  { strKey: "lastModifiedOn", strLabel: "Updated" },
];

type FNFSettlementGridRow = {
  id: number;
  strRecordUUID: string;
  strSettlementNumber: ReactNode;
  strSettlementNumberSort: string;
  strEmployee: ReactNode;
  strDepartment: ReactNode;
  dtLastWorkingDate: ReactNode;
  dtSettlementMonth: ReactNode;
  decNetAmount: ReactNode;
  decNetAmountSort: number;
  strSettlementStatus: ReactNode;
  strSettlementStatusSort: string;
  strExitType: ReactNode;
  dtAddedOn: ReactNode;
  dtLastModifiedOn: ReactNode;
};

export default function FNFSettlementListPage() {
  const objRouter = useRouter();
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny } = useModuleActionAccess(lstModuleCodes);
  const [lstRows, setLstRows] = useState<FNFSettlementRecord[]>([]);
  const [lstEmployeeOptions, setLstEmployeeOptions] = useState<FNFEmployeeOption[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnEmployeeOptionsLoading, setBlnEmployeeOptionsLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [dicFilters, setDicFilters] = useState(dicEmptyFilters);
  const [lstVisibleOptionalColumns, setLstVisibleOptionalColumns] = useState<OptionalColumnKey[]>([]);
  const blnHasViewRight = canViewAny() || canDoAny("view");
  const blnCanView = blnHasViewRight || canDoAny("edit");
  const blnCanCreate = canDoAny("create") || canDoAny("add");
  const blnCanExport = canDoAny("export");
  const blnBusy = blnLoading || blnRightsLoading;
  const objSelectedEmployee = useMemo(() => lstEmployeeOptions.find((objEmployee) => objEmployee.strEmployeeCode === dicFilters.employee_code) || null, [lstEmployeeOptions, dicFilters.employee_code]);

  async function loadRows() {
    if (!blnCanView) {
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    setStrError("");
    try {
      setLstRows(await fnfSettlementService.listSettlements({ status: dicFilters.status, employee_code: dicFilters.employee_code, department: dicFilters.department, settlement_month: dicFilters.settlement_month, lwd_from: dicFilters.lwd_from, lwd_to: dicFilters.lwd_to, payable_type: dicFilters.payable_type }));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load FNF settlements.");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => { if (!blnRightsLoading) loadRows().catch(() => undefined); }, [blnRightsLoading, blnCanView]);
  useEffect(() => {
    if (blnRightsLoading || !blnCanView) return;
    setBlnEmployeeOptionsLoading(true);
    fnfSettlementService.listEmployeeOptions()
      .then(setLstEmployeeOptions)
      .catch(() => setLstEmployeeOptions([]))
      .finally(() => setBlnEmployeeOptionsLoading(false));
  }, [blnRightsLoading, blnCanView]);

  const lstFiltered = useMemo(() => lstRows.filter((row) => {
    const strLwd = row.dtLastWorkingDate || "";
    return (!dicFilters.exit_type || row.strExitType.toLowerCase().includes(dicFilters.exit_type.toLowerCase()))
      && (!dicFilters.settlement_month || (row.dtSettlementMonth || "").startsWith(dicFilters.settlement_month))
      && (!dicFilters.lwd_from || strLwd >= dicFilters.lwd_from)
      && (!dicFilters.lwd_to || strLwd <= dicFilters.lwd_to);
  }), [lstRows, dicFilters]);

  function openSettlement(strRecordUUID: string) {
    objRouter.push(`/payroll/fnf-settlements/${strRecordUUID}`);
  }

  const lstTableColumns = useMemo<CommonTableColumn<FNFSettlementGridRow>[]>(() => {
    const lstColumns: CommonTableColumn<FNFSettlementGridRow>[] = [
      { field: "strSettlementNumber", headerName: "Settlement #", width: 160, sortAccessor: (row) => row.strSettlementNumberSort },
      { field: "strEmployee", headerName: "Employee", width: 170 },
      { field: "strDepartment", headerName: "Department", width: 160 },
      { field: "dtLastWorkingDate", headerName: "LWD", width: 130 },
      { field: "dtSettlementMonth", headerName: "Settlement Month", width: 150 },
      { field: "decNetAmount", headerName: "Net Amount", width: 140, align: "right", sortAccessor: (row) => row.decNetAmountSort },
      { field: "strSettlementStatus", headerName: "Status", width: 140, filterable: false, sortAccessor: (row) => row.strSettlementStatusSort },
    ];
    if (lstVisibleOptionalColumns.includes("exitType")) lstColumns.push({ field: "strExitType", headerName: "Exit Type", width: 140 });
    if (lstVisibleOptionalColumns.includes("addedOn")) lstColumns.push({ field: "dtAddedOn", headerName: "Created", width: 160 });
    if (lstVisibleOptionalColumns.includes("lastModifiedOn")) lstColumns.push({ field: "dtLastModifiedOn", headerName: "Updated", width: 160 });
    return lstColumns;
  }, [lstVisibleOptionalColumns]);

  const lstTableRows = useMemo<FNFSettlementGridRow[]>(() => lstFiltered.map((row) => {
    const strSettlementNumber = String(row.strSettlementNumber || row.intID);
    const decNetAmount = (row.decNetPayableAmount || 0) || -(row.decNetRecoverableAmount || 0);
    return {
      id: row.intID,
      strRecordUUID: row.strRecordUUID,
      strSettlementNumber: (
        <Link
          className="app-master-first-column-link"
          component="button"
          type="button"
          underline="none"
          data-controlid="payroll.fnf-settlements.row.number.link"
          data-row-key={String(row.intID)}
          onClick={(objEvent) => { objEvent.stopPropagation(); openSettlement(row.strRecordUUID); }}
        >
          {strSettlementNumber}
        </Link>
      ),
      strSettlementNumberSort: strSettlementNumber,
      strEmployee: row.strEmployeeCode || row.intEmployeeID,
      strDepartment: row.strDepartmentName || "-",
      dtLastWorkingDate: row.dtLastWorkingDate || "-",
      dtSettlementMonth: row.dtSettlementMonth || "-",
      decNetAmount: formatCurrency(decNetAmount),
      decNetAmountSort: decNetAmount,
      strSettlementStatus: <FNFStatusBadge strStatus={row.strSettlementStatus} />,
      strSettlementStatusSort: row.strSettlementStatus,
      strExitType: row.strExitType || "-",
      dtAddedOn: row.dtAddedOn || "-",
      dtLastModifiedOn: row.dtLastModifiedOn || "-",
    };
  }), [lstFiltered, objRouter]);

  return (
    <Box className={styles.page} data-controlid="payroll.fnf-settlements.list.page">
      <MasterBreadcrumbs strSection="Employee Services" strTitle="Full & Final Settlement" />

      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Box className={styles.multiFilterSearchRow} aria-busy={blnBusy} onKeyDown={onSearchEnter(() => { if (!blnBusy) void loadRows(); })}>
          <Autocomplete
            size="small"
            options={lstEmployeeOptions}
            value={objSelectedEmployee}
            loading={blnEmployeeOptionsLoading}
            disabled={blnBusy}
            getOptionLabel={(objOption) => objOption?.strLabel || ""}
            isOptionEqualToValue={(objOption, objValue) => objOption.strEmployeeCode === objValue.strEmployeeCode}
            onChange={(_, objValue) => setDicFilters((d) => ({ ...d, employee_code: objValue?.strEmployeeCode || "" }))}
            renderInput={(params) => <TextField {...params} className="app-mui-text-field" label="Employee Code" placeholder="Search employee..." inputProps={{ ...params.inputProps, "controlId": "payroll.fnf-settlements.employee-code.input" }} controlId="payroll.fnf-settlements.employee-code.input"
              InputProps={{ ...params.InputProps, startAdornment: (<><InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment>{params.InputProps.startAdornment}</>) }} />}
          />
          <TextField className="app-mui-text-field" size="small" label="Department" disabled={blnBusy} inputProps={{ "controlId": "payroll.fnf-settlements.department.input" }} value={dicFilters.department} onChange={(e) => setDicFilters((d) => ({ ...d, department: e.target.value }))} controlId="payroll.fnf-settlements.department.input" />
          <TextField className="app-mui-text-field" size="small" type="month" label="Settlement Month" disabled={blnBusy} inputProps={{ "controlId": "payroll.fnf-settlements.month.input" }} InputLabelProps={{ shrink: true }} value={dicFilters.settlement_month} onChange={(e) => setDicFilters((d) => ({ ...d, settlement_month: e.target.value }))} controlId="payroll.fnf-settlements.month.input" />
          <CommonSearchableSelect
            controlId="payroll.fnf-settlements.status.select"
            label="Status"
            value={dicFilters.status}
            options={lstStatuses.map((s) => ({ intID: s as string, strLabel: s }))}
            onChange={(strValue) => setDicFilters((d) => ({ ...d, status: strValue || "All" }))}
          />
          <TextField className="app-mui-text-field" size="small" select label="Payable / Recoverable" disabled={blnBusy} value={dicFilters.payable_type} onChange={(e) => setDicFilters((d) => ({ ...d, payable_type: e.target.value }))} controlId="payroll.fnf-settlements.payable-type.select">{["All", "payable", "recoverable"].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField>
          <TextField className="app-mui-text-field" size="small" label="Exit Type" disabled={blnBusy} inputProps={{ "controlId": "payroll.fnf-settlements.exit-type.input" }} value={dicFilters.exit_type} onChange={(e) => setDicFilters((d) => ({ ...d, exit_type: e.target.value }))} controlId="payroll.fnf-settlements.exit-type.input" />
          <TextField className="app-mui-text-field" size="small" type="date" label="LWD From" disabled={blnBusy} inputProps={{ "controlId": "payroll.fnf-settlements.lwd-from.input" }} InputLabelProps={{ shrink: true }} value={dicFilters.lwd_from} onChange={(e) => setDicFilters((d) => ({ ...d, lwd_from: e.target.value }))} controlId="payroll.fnf-settlements.lwd-from.input" />
          <TextField className="app-mui-text-field" size="small" type="date" label="LWD To" disabled={blnBusy} inputProps={{ "controlId": "payroll.fnf-settlements.lwd-to.input" }} InputLabelProps={{ shrink: true }} value={dicFilters.lwd_to} onChange={(e) => setDicFilters((d) => ({ ...d, lwd_to: e.target.value }))} controlId="payroll.fnf-settlements.lwd-to.input" />
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => loadRows()} disabled={blnBusy} controlId="payroll.fnf-settlements.search.button">Search</Button>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => setDicFilters(dicEmptyFilters)} disabled={blnBusy} controlId="payroll.fnf-settlements.clear.button">Clear</Button>
          </Box>
        </Box>
      </Box>

      {strError ? <Alert severity="error">{strError}</Alert> : null}

      <Box className={styles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {blnBusy ? (
          <MasterGridSkeleton strControlId="payroll.fnf-settlements.list.skeleton" intColumns={7} />
        ) : !blnCanView ? (
          <Box className={styles.emptyState} data-controlid="payroll.fnf-settlements.list.access-denied.state">
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>FNF settlement access is not available for your user group.</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>Contact your administrator if you need FNF settlement visibility.</Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            toolbarLeft={blnCanCreate ? <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/payroll/fnf-settlements/new")} controlId="payroll.fnf-settlements.new.button">New Settlement</Button> : null}
            toolbarAfterExport={(
              <MasterAddColumnsControl strControlPrefix="payroll.fnf-settlements.list" lstColumns={lstOptionalColumns} lstVisibleKeys={lstVisibleOptionalColumns} onChange={setLstVisibleOptionalColumns} />
            )}
            rowIdField="id"
            exportFileName="fnf_settlements"
            showExportOptions={blnCanExport}
            emptyMessage="No FNF settlements found."
            testIdPrefix="payroll.fnf-settlements.list"
            showPaginationSummary
            onRowClick={(row) => openSettlement(row.strRecordUUID)}
            minTableWidth={1050}
            hideRowClickHint
            getRowSx={() => dicMasterRowSx}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        )}
      </Box>
    </Box>
  );
}
