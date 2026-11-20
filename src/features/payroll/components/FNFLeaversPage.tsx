"use client";

import PersonOffRoundedIcon from "@mui/icons-material/PersonOffRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, Checkbox, Chip, MenuItem, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type InputHTMLAttributes, type ReactNode } from "react";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { MasterBreadcrumbs } from "@/components/master/MasterListUi";
import styles from "@/components/master/MasterScreen.module.css";
import FNFModuleTabs from "@/features/payroll/components/FNFModuleTabs";
import { formatCurrency } from "@/features/payroll/components/FNFSettlementPanels";
import { useFNFRights } from "@/features/payroll/hooks/useFNFRights";
import { fnfSettlementService } from "@/features/payroll/services/fnfSettlementService";
import type { FNFLeaverRow, FNFLeaversResponse } from "@/features/payroll/types";

const lstEmployeeStatuses = [
  { strValue: "All", strLabel: "All" },
  { strValue: "active", strLabel: "Still Active" },
  { strValue: "inactive", strLabel: "Inactive" },
];

type LeaverTableRow = Omit<FNFLeaverRow, "blnIsInactive" | "decNetPayable" | "decNetRecoverable"> & {
  id: string;
  select: ReactNode;
  strNetPayable: string;
  strNetRecoverable: string;
};

/** Leavers whose F&F is finalized and given (paid or recovered): the list to download whenever a
 * leavers list is needed, and where those still Active are set Inactive. */
export default function FNFLeaversPage() {
  const objRouter = useRouter();
  const { blnLoading: blnRightsLoading, can, canView } = useFNFRights();
  const [dicFilters, setDicFilters] = useState({ lwd_from: "", lwd_to: "", employee_status: "All" });
  const [objData, setObjData] = useState<FNFLeaversResponse | null>(null);
  const [lstSelectedIDs, setLstSelectedIDs] = useState<number[]>([]);
  const [blnConfirmOpen, setBlnConfirmOpen] = useState(false);
  const [blnSaving, setBlnSaving] = useState(false);
  const [blnLoading, setBlnLoading] = useState(false);
  const [strError, setStrError] = useState("");
  const [strInfo, setStrInfo] = useState("");
  const blnCanView = canView();
  const blnCanExport = can("export");
  const blnCanSetInactive = can("set_inactive");

  async function loadLeavers() {
    setBlnLoading(true);
    setStrError("");
    try {
      setObjData(await fnfSettlementService.getLeavers(dicFilters));
      setLstSelectedIDs([]);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load the leavers list.");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => { if (!blnRightsLoading && blnCanView) loadLeavers().catch(() => undefined); }, [blnRightsLoading, blnCanView]);

  const lstSelectableIDs = useMemo(() => (objData?.lstRows || []).filter((objRow) => !objRow.blnIsInactive).map((objRow) => objRow.intSettlementID), [objData]);
  const blnAllSelected = lstSelectableIDs.length > 0 && lstSelectableIDs.every((intID) => lstSelectedIDs.includes(intID));
  const blnSomeSelected = lstSelectedIDs.length > 0 && !blnAllSelected;

  function toggleSelection(intID: number) {
    setLstSelectedIDs((lst) => (lst.includes(intID) ? lst.filter((intItem) => intItem !== intID) : [...lst, intID]));
  }

  function toggleSelectAll() {
    setLstSelectedIDs(blnAllSelected ? [] : lstSelectableIDs);
  }

  async function handleSetInactive() {
    setBlnSaving(true);
    setStrError("");
    setStrInfo("");
    try {
      const objResult = await fnfSettlementService.setLeaversInactive(lstSelectedIDs);
      const strSkipped = objResult.lstSkipped.length
        ? ` Skipped ${objResult.intSkipped}: ${objResult.lstSkipped.map((objItem) => `${objItem.strEmployeeCode || objItem.intSettlementID} (${objItem.strReason})`).join(", ")}`
        : "";
      setStrInfo(`${objResult.intUpdated} employee(s) set Inactive with date of exit = last working date.${strSkipped}`);
      setBlnConfirmOpen(false);
      await loadLeavers();
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to set the selected leavers Inactive.");
    } finally {
      setBlnSaving(false);
    }
  }

  const lstColumns = useMemo<CommonTableColumn<LeaverTableRow>[]>(() => [
    ...(blnCanSetInactive ? [{
      field: "select" as const,
      headerName: <Checkbox controlId="payroll.fnf-leavers.select-all.checkbox" checked={blnAllSelected} indeterminate={blnSomeSelected} disabled={!lstSelectableIDs.length} onChange={toggleSelectAll} inputProps={{ "data-control-id": "payroll.fnf-leavers.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>} />,
      sortable: false, filterable: false, exportable: false, width: 56,
    }] : []),
    { field: "strEmployeeCode", headerName: "Employee Code", width: 120 },
    { field: "strEmployeeName", headerName: "Employee", width: 180 },
    { field: "strDepartment", headerName: "Department", width: 140 },
    { field: "strDesignation", headerName: "Designation", width: 140 },
    { field: "strLocation", headerName: "Location", width: 140 },
    { field: "dtDateOfJoining", headerName: "Date of Joining", width: 115 },
    { field: "dtLastWorkingDate", headerName: "Last Working Date", width: 120 },
    { field: "dtDateOfExit", headerName: "Date of Exit", width: 110 },
    { field: "strExitType", headerName: "Exit Type", width: 120 },
    { field: "strExitReason", headerName: "Exit Reason", width: 160 },
    { field: "strSettlementNumber", headerName: "Settlement #", width: 120 },
    { field: "strSettlementStatus", headerName: "F&F Status", width: 100 },
    { field: "strNetPayable", headerName: "Net Paid", width: 110, align: "right" },
    { field: "strNetRecoverable", headerName: "Net Recovered", width: 115, align: "right" },
    { field: "dtPaidOn", headerName: "Paid / Recovered On", width: 130 },
    { field: "strPaymentReferenceNo", headerName: "Reference", width: 130 },
    { field: "strEmploymentStatus", headerName: "Employee Status", width: 120 },
  ], [blnCanSetInactive, blnAllSelected, blnSomeSelected, lstSelectableIDs]);

  const lstRows = useMemo<LeaverTableRow[]>(() => (objData?.lstRows || []).map((objRow) => {
    const { blnIsInactive, decNetPayable, decNetRecoverable, ...objRest } = objRow;
    return {
      ...objRest,
      id: String(objRow.intSettlementID),
      dtPaidOn: objRow.dtPaidOn ? objRow.dtPaidOn.slice(0, 10) : "",
      strNetPayable: decNetPayable ? formatCurrency(decNetPayable) : "",
      strNetRecoverable: decNetRecoverable ? formatCurrency(decNetRecoverable) : "",
      select: blnIsInactive ? null : (
        <Checkbox
          controlId={`payroll.fnf-leavers.row.${objRow.intSettlementID}.select.checkbox`}
          checked={lstSelectedIDs.includes(objRow.intSettlementID)}
          onClick={(objEvent) => objEvent.stopPropagation()}
          onChange={() => toggleSelection(objRow.intSettlementID)}
          inputProps={{ "data-control-id": `payroll.fnf-leavers.row.${objRow.intSettlementID}.select.checkbox` } as InputHTMLAttributes<HTMLInputElement>}
        />
      ),
    };
  }), [objData, lstSelectedIDs]);

  if (!blnRightsLoading && !blnCanView) return <Alert severity="error">You do not have access to the F&amp;F leavers list.</Alert>;

  return (
    <Box className={styles.page} data-controlid="payroll.fnf-leavers.page">
      <MasterBreadcrumbs
        strSection="Employee Services"
        strTitle="Leavers"
        lstNotices={[
          { strKey: "error", strSeverity: "error", objMessage: strError, fnDismiss: () => setStrError("") },
          { strKey: "info", strSeverity: "info", objMessage: strInfo, fnDismiss: () => setStrInfo("") },
        ]}
      />
      <FNFModuleTabs strActive="leavers" />
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mb: 2 }}>
        <TextField size="small" type="date" label="LWD from" InputLabelProps={{ shrink: true }} value={dicFilters.lwd_from} onChange={(e) => setDicFilters((d) => ({ ...d, lwd_from: e.target.value }))} controlId="payroll.fnf-leavers.lwd-from.input" />
        <TextField size="small" type="date" label="LWD to" InputLabelProps={{ shrink: true }} value={dicFilters.lwd_to} onChange={(e) => setDicFilters((d) => ({ ...d, lwd_to: e.target.value }))} controlId="payroll.fnf-leavers.lwd-to.input" />
        <TextField size="small" select label="Employee status" value={dicFilters.employee_status} onChange={(e) => setDicFilters((d) => ({ ...d, employee_status: e.target.value }))} sx={{ minWidth: 160 }} controlId="payroll.fnf-leavers.employee-status.select">
          {lstEmployeeStatuses.map((objStatus) => <MenuItem key={objStatus.strValue} value={objStatus.strValue}>{objStatus.strLabel}</MenuItem>)}
        </TextField>
        <Button variant="contained" startIcon={<SearchRoundedIcon />} onClick={() => loadLeavers().catch(() => undefined)} disabled={blnLoading} controlId="payroll.fnf-leavers.search.button">Show</Button>
        <Box sx={{ flex: 1 }} />
        {blnCanSetInactive ? (
          <Button variant="outlined" color="warning" startIcon={<PersonOffRoundedIcon />} disabled={!lstSelectedIDs.length || blnSaving} onClick={() => setBlnConfirmOpen(true)} controlId="payroll.fnf-leavers.set-inactive.button">
            Set Inactive{lstSelectedIDs.length ? ` (${lstSelectedIDs.length})` : ""}
          </Button>
        ) : null}
      </Box>
      {objData ? (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", mb: 1.5 }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.85rem", mr: 0.5 }}>F&amp;F finalized and given (paid or recovered):</Typography>
          <Chip size="small" label={`Total ${objData.intTotal}`} />
          <Chip size="small" color="warning" variant="outlined" label={`Still Active ${objData.intActive}`} />
          <Chip size="small" color="success" variant="outlined" label={`Inactive ${objData.intInactive}`} />
        </Box>
      ) : null}
      <CommonTable
        columns={lstColumns}
        rows={lstRows}
        rowIdField="id"
        exportFileName="fnf_leavers"
        showExportOptions={blnCanExport}
        emptyMessage={blnLoading ? "Loading..." : "No leavers with a paid or recovered F&F for the selected filters."}
        testIdPrefix="payroll.fnf-leavers"
        showPaginationSummary
        onRowClick={(objRow) => { if (objRow.strRecordUUID) objRouter.push(`/payroll/fnf-settlements/${objRow.strRecordUUID}`); }}
        minTableWidth={2200}
      />
      <CommonConfirmDialog
        blnOpen={blnConfirmOpen}
        strTitle="Set leavers Inactive"
        strMessage={`${lstSelectedIDs.length} employee(s) will be set Inactive, with date of exit set to their last working date. Their F&F is already paid or recovered.`}
        strCancelLabel="Cancel"
        strConfirmLabel={blnSaving ? "Updating..." : "Set Inactive"}
        blnConfirmDisabled={blnSaving}
        blnCancelDisabled={blnSaving}
        onClose={() => setBlnConfirmOpen(false)}
        onConfirm={() => handleSetInactive().catch(() => undefined)}
        rootControlId="payroll.fnf-leavers.confirm.dialog"
        confirmButtonControlId="payroll.fnf-leavers.confirm.button"
        cancelButtonControlId="payroll.fnf-leavers.cancel.button"
      />
    </Box>
  );
}
