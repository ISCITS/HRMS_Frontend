"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Autocomplete, Box, Button, MenuItem, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";

import CommonRowActions from "@/components/master/CommonRowActions";
import BlockingLoader from "@/components/shared/BlockingLoader";
import CommonDataGrid, { type DataGridColumn } from "@/components/ui/CommonDataGrid";
import FNFStatusBadge from "@/features/payroll/components/FNFStatusBadge";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { fnfSettlementService } from "@/features/payroll/services/fnfSettlementService";
import type { FNFEmployeeOption, FNFSettlementRecord, FNFSettlementStatus } from "@/features/payroll/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { formatCurrency } from "@/features/payroll/components/FNFSettlementPanels";

const lstModuleCodes = ["PAYROLL_FNF_SETTLEMENTS", "PAYROLL_FNF", "FNF_SETTLEMENTS"];
const lstStatuses: Array<"All" | FNFSettlementStatus> = ["All", "draft", "calculated", "under_review", "released", "approved", "locked", "paid", "recovered", "cancelled"];
const strPageBannerTitle = "FNF Settlements";
const lstEditableStatuses: FNFSettlementStatus[] = ["draft", "calculated", "under_review", "released", "approved"];

type FNFSettlementGridRow = {
  id: number;
  action: ReactNode;
  strSettlementNumber: ReactNode;
  strEmployee: ReactNode;
  strDepartment: ReactNode;
  dtLastWorkingDate: ReactNode;
  dtSettlementMonth: ReactNode;
  decNetAmount: ReactNode;
  strSettlementStatus: ReactNode;
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
  const [dicFilters, setDicFilters] = useState({ employee_code: "", department: "", settlement_month: "", status: "All", exit_type: "", lwd_from: "", lwd_to: "", payable_type: "All" });
  const blnHasViewRight = canViewAny() || canDoAny("view");
  const blnCanView = blnHasViewRight || canDoAny("edit");
  const blnCanCreate = canDoAny("create") || canDoAny("add");
  const blnCanEdit = canDoAny("edit");
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

  const lstTableColumns = useMemo<DataGridColumn<FNFSettlementGridRow>[]>(() => [
    { field: "action", headerName: "Actions", width: 116, sortable: false, exportable: false, align: "center" },
    { field: "strEmployee", headerName: "Employee", width: 170 },
    { field: "strDepartment", headerName: "Department", width: 160 },
    { field: "dtLastWorkingDate", headerName: "LWD", width: 130 },
    { field: "dtSettlementMonth", headerName: "Settlement Month", width: 150 },
    { field: "decNetAmount", headerName: "Net Amount", width: 140, align: "right" },
    { field: "strSettlementStatus", headerName: "Status", width: 140, sortable: false },
    { field: "dtAddedOn", headerName: "Created", width: 160 },
    { field: "dtLastModifiedOn", headerName: "Updated", width: 160 },
  ], []);

  const lstTableRows = useMemo<FNFSettlementGridRow[]>(() => lstFiltered.map((row) => ({
    id: row.intID,
    action: (
      <CommonRowActions
        testIdPrefix="payroll.fnf-settlements.row"
        rowKey={row.intID}
        blnCanView={blnHasViewRight}
        blnCanEdit={blnCanEdit && lstEditableStatuses.includes(row.strSettlementStatus)}
        onView={() => objRouter.push(`/payroll/fnf-settlements/${row.intID}?mode=view`)}
        onEdit={() => objRouter.push(`/payroll/fnf-settlements/${row.intID}`)}
      />
    ),
    strSettlementNumber: row.strSettlementNumber || row.intID,
    strEmployee: row.strEmployeeCode || row.intEmployeeID,
    strDepartment: row.strDepartmentName || "-",
    dtLastWorkingDate: row.dtLastWorkingDate || "-",
    dtSettlementMonth: row.dtSettlementMonth || "-",
    decNetAmount: formatCurrency((row.decNetPayableAmount || 0) || -(row.decNetRecoverableAmount || 0)),
    strSettlementStatus: <FNFStatusBadge strStatus={row.strSettlementStatus} />,
    dtAddedOn: row.dtAddedOn || "-",
    dtLastModifiedOn: row.dtLastModifiedOn || "-",
  })), [blnCanEdit, blnCanView, lstFiltered, objRouter]);

  return (
    <Box className={styles.page}>
      <Typography className={`${styles.breadcrumbs} ${styles.hiddenHeader}`}>
        {strPageBannerTitle}
      </Typography>

      <Box className={styles.controlsCard}>
        <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", mt: 1 }}>
          <Autocomplete
            size="small"
            options={lstEmployeeOptions}
            value={objSelectedEmployee}
            loading={blnEmployeeOptionsLoading}
            getOptionLabel={(objOption) => objOption?.strLabel || ""}
            isOptionEqualToValue={(objOption, objValue) => objOption.strEmployeeCode === objValue.strEmployeeCode}
            onChange={(_, objValue) => setDicFilters((d) => ({ ...d, employee_code: objValue?.strEmployeeCode || "" }))}
            renderInput={(params) => <TextField {...params} label="Employee Code" inputProps={{ ...params.inputProps, "controlId": "payroll.fnf-settlements.employee-code.input" }} controlId="payroll.fnf-settlements.employee-code.input" />}
          />
          <TextField size="small" label="Department" inputProps={{ "controlId": "payroll.fnf-settlements.department.input" }} value={dicFilters.department} onChange={(e) => setDicFilters((d) => ({ ...d, department: e.target.value }))} controlId="payroll.fnf-settlements.department.input" />
          <TextField size="small" type="month" label="Settlement Month" inputProps={{ "controlId": "payroll.fnf-settlements.month.input" }} InputLabelProps={{ shrink: true }} value={dicFilters.settlement_month} onChange={(e) => setDicFilters((d) => ({ ...d, settlement_month: e.target.value }))} controlId="payroll.fnf-settlements.month.input" />
          <TextField size="small" select label="Status" inputProps={{ "controlId": "payroll.fnf-settlements.status.select" }} value={dicFilters.status} onChange={(e) => setDicFilters((d) => ({ ...d, status: e.target.value }))} controlId="payroll.fnf-settlements.status.select">{lstStatuses.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField>
          <TextField size="small" select label="Payable / Recoverable" value={dicFilters.payable_type} onChange={(e) => setDicFilters((d) => ({ ...d, payable_type: e.target.value }))} controlId="payroll.fnf-settlements.payable-type.select">{["All", "payable", "recoverable"].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField>
          <TextField size="small" label="Exit Type" inputProps={{ "controlId": "payroll.fnf-settlements.exit-type.input" }} value={dicFilters.exit_type} onChange={(e) => setDicFilters((d) => ({ ...d, exit_type: e.target.value }))} controlId="payroll.fnf-settlements.exit-type.input" />
          <TextField size="small" type="date" label="LWD From" inputProps={{ "controlId": "payroll.fnf-settlements.lwd-from.input" }} InputLabelProps={{ shrink: true }} value={dicFilters.lwd_from} onChange={(e) => setDicFilters((d) => ({ ...d, lwd_from: e.target.value }))} controlId="payroll.fnf-settlements.lwd-from.input" />
          <TextField size="small" type="date" label="LWD To" inputProps={{ "controlId": "payroll.fnf-settlements.lwd-to.input" }} InputLabelProps={{ shrink: true }} value={dicFilters.lwd_to} onChange={(e) => setDicFilters((d) => ({ ...d, lwd_to: e.target.value }))} controlId="payroll.fnf-settlements.lwd-to.input" />
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Button className={styles.primaryButton} size="small" startIcon={<SearchRoundedIcon />} onClick={() => loadRows()} controlId="payroll.fnf-settlements.search.button">Search</Button>
            <Button className={styles.secondaryButton} size="small" startIcon={<ClearRoundedIcon />} onClick={() => setDicFilters({ employee_code: "", department: "", settlement_month: "", status: "All", exit_type: "", lwd_from: "", lwd_to: "", payable_type: "All" })} controlId="payroll.fnf-settlements.clear.button">Clear</Button>
          </Box>
        </Box>
      </Box>
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      <Box className={styles.tableCard}>
        <CommonDataGrid
          columns={lstTableColumns}
          rows={lstTableRows}
          toolbarLeft={blnCanCreate ? <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/payroll/fnf-settlements/new")} controlId="payroll.fnf-settlements.new.button">New Settlement</Button> : null}
          rowIdField="id"
          emptyMessage="No FNF settlements found."
          testIdPrefix="payroll.fnf-settlements.list"
          showPaginationSummary
          sx={{ p: 0, boxShadow: "none", background: "transparent" }}
        />
      </Box>
      <BlockingLoader blnOpen={blnLoading || blnRightsLoading} strLabel="Loading FNF settlements..." />
    </Box>
  );
}
