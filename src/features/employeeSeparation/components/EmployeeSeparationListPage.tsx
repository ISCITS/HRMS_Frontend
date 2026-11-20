"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import NoteAddRoundedIcon from "@mui/icons-material/NoteAddRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SouthRoundedIcon from "@mui/icons-material/SouthRounded";
import NorthRoundedIcon from "@mui/icons-material/NorthRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Box, Button, IconButton, InputAdornment, Link, MenuItem, Pagination, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { MasterBreadcrumbs, MasterGridSkeleton, MasterMoreFilters, dicMasterRowSx, onSearchEnter } from "@/components/master/MasterListUi";
import styles from "@/components/master/MasterScreen.module.css";
import { CancelSeparationDialog, SeparationHistoryDialog } from "@/features/employeeSeparation/components/SeparationDialogs";
import { SeparationFnfStatusBadge, SeparationStatusBadge } from "@/features/employeeSeparation/components/SeparationStatusBadge";
import { useSeparationRights } from "@/features/employeeSeparation/hooks/useSeparationRights";
import { employeeSeparationService } from "@/features/employeeSeparation/services/employeeSeparationService";
import type { SeparationDetail, SeparationListQuery, SeparationLookups, SeparationRow } from "@/features/employeeSeparation/types";
import { formatDisplayDate } from "@/features/employeeSeparation/utils";
import { useFNFRights } from "@/features/payroll/hooks/useFNFRights";

const STR_ROUTE = "/employee-separations";
const lstPageSizes = [25, 50, 100];
// "" = default view (everything except cancelled), as on the server.
const lstStatusFilters = [
  { strValue: "", strLabel: "Active & Completed" },
  { strValue: "ACTIVATED", strLabel: "Active" },
  { strValue: "COMPLETED", strLabel: "Completed" },
  { strValue: "CANCELLED", strLabel: "Cancelled" },
  { strValue: "ALL", strLabel: "All" },
];
const lstSortOptions = [
  { strValue: "activated_on", strLabel: "Activation date" },
  { strValue: "last_working_date", strLabel: "Last working date" },
  { strValue: "resignation_date", strLabel: "Resignation date" },
  { strValue: "exclusion_from_month", strLabel: "Payroll exclusion month" },
  { strValue: "employee_code", strLabel: "Employee code" },
  { strValue: "employee_name", strLabel: "Employee name" },
  { strValue: "separation_type", strLabel: "Separation type" },
  { strValue: "status", strLabel: "Separation status" },
];

const dicEmptyFilters = {
  search: "", status: "", fnf_status: "", department_id: "", location_id: "",
  lwd_from: "", lwd_to: "", activation_from: "", activation_to: "", exclusion_month: "",
};
type SeparationFilters = typeof dicEmptyFilters;
const lstMoreFilterKeys = ["department_id", "location_id", "lwd_from", "lwd_to", "activation_from", "activation_to", "exclusion_month"] as const;

type GridRow = {
  id: number;
  strEmployee: ReactNode;
  strUnit: ReactNode;
  strType: ReactNode;
  dtResignation: ReactNode;
  dtLwd: ReactNode;
  dtActivation: ReactNode;
  strExclusion: ReactNode;
  strStatus: ReactNode;
  strFnfStatus: ReactNode;
  objActions: ReactNode;
  strRecordUUID: string;
};

function ActionIcon({ strTitle, strControlId, blnDisabled, onClick, children }: { strTitle: string; strControlId: string; blnDisabled?: boolean; onClick: () => void; children: ReactNode }) {
  // Disabled buttons do not fire hover events; the span keeps the explanatory tooltip working.
  return (
    <Tooltip title={strTitle} arrow>
      <span>
        <IconButton size="small" aria-label={strTitle} disabled={blnDisabled} onClick={(objEvent) => { objEvent.stopPropagation(); onClick(); }} controlId={strControlId}>
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default function EmployeeSeparationListPage() {
  const objRouter = useRouter();
  const { blnLoading: blnRightsLoading, can, canView } = useSeparationRights();
  const objFnfRights = useFNFRights();
  const blnCanView = canView();
  const blnCanAdd = can("add");
  const blnCanCancel = can("cancel");
  const blnCanExport = can("export");
  const blnCanCreateFnf = objFnfRights.can("add");
  const blnCanOpenFnf = objFnfRights.canView() || objFnfRights.can("edit");

  const [dicFilters, setDicFilters] = useState<SeparationFilters>(dicEmptyFilters);
  const [dicApplied, setDicApplied] = useState<SeparationFilters>(dicEmptyFilters);
  const [dicMoreSnapshot, setDicMoreSnapshot] = useState<SeparationFilters | null>(null);
  const [intPage, setIntPage] = useState(1);
  const [intPageSize, setIntPageSize] = useState(25);
  const [strSort, setStrSort] = useState("activated_on");
  const [strDirection, setStrDirection] = useState<"asc" | "desc">("desc");
  const [lstRows, setLstRows] = useState<SeparationRow[]>([]);
  const [intTotal, setIntTotal] = useState(0);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [objSuccess, setObjSuccess] = useState<ReactNode>(null);
  const [strHighlightUUID, setStrHighlightUUID] = useState("");
  const [objLookups, setObjLookups] = useState<SeparationLookups | null>(null);
  const [objCancelTarget, setObjCancelTarget] = useState<SeparationRow | null>(null);
  const [objHistoryTarget, setObjHistoryTarget] = useState<SeparationRow | null>(null);
  const intRequestSeq = useRef(0);
  const blnBusy = blnLoading || blnRightsLoading;

  async function loadRows() {
    if (!blnCanView) {
      setBlnLoading(false);
      return;
    }
    const intSeq = ++intRequestSeq.current;
    setBlnLoading(true);
    setStrError("");
    const dicQuery: SeparationListQuery = { ...dicApplied, page: intPage, page_size: intPageSize, sort: strSort, direction: strDirection };
    try {
      const objResult = await employeeSeparationService.listSeparations(dicQuery);
      if (intSeq !== intRequestSeq.current) return; // a newer request superseded this one
      setLstRows(objResult.lstRows);
      setIntTotal(objResult.intTotal);
    } catch (objError) {
      if (intSeq === intRequestSeq.current) setStrError(objError instanceof Error ? objError.message : "Unable to load separations.");
    } finally {
      if (intSeq === intRequestSeq.current) setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (!blnRightsLoading) void loadRows();
  }, [blnRightsLoading, blnCanView, dicApplied, intPage, intPageSize, strSort, strDirection]);

  useEffect(() => {
    if (blnRightsLoading || !blnCanView) return;
    employeeSeparationService.getLookups().then(setObjLookups).catch(() => setObjLookups(null));
  }, [blnRightsLoading, blnCanView]);

  // Returning from Add Separation: ?created=<uuid> -> confirmation with the optional Create F&F step.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const strCreated = new URLSearchParams(window.location.search).get("created");
    if (!strCreated) return;
    setStrHighlightUUID(strCreated);
    window.history.replaceState(null, "", STR_ROUTE);
    employeeSeparationService.getSeparation(strCreated).then((objDetail: SeparationDetail) => {
      setObjSuccess(
        <Stack spacing={1}>
          <span>
            Separation activated for {objDetail.strEmployeeCode} - {objDetail.strEmployeeName}. Regular payroll is excluded from {objDetail.strExclusionFromMonthLabel}.
          </span>
          {objDetail.blnCanCreateFNF && blnCanCreateFnf ? (
            <Box>
              <Button size="small" variant="contained" startIcon={<NoteAddRoundedIcon />} onClick={() => objRouter.push(`/payroll/fnf-settlements/new?employee_id=${objDetail.intEmployeeID}`)} controlId="employee-separations.created.create-fnf.button">
                Create F&F Settlement
              </Button>
            </Box>
          ) : null}
        </Stack>,
      );
    }).catch(() => undefined);
  }, [blnCanCreateFnf]);

  function applyFilters(dicNext: SeparationFilters = dicFilters) {
    setIntPage(1);
    setDicApplied({ ...dicNext });
  }

  function openDetail(strRecordUUID: string) {
    objRouter.push(`${STR_ROUTE}/${strRecordUUID}`);
  }

  const lstColumns = useMemo<CommonTableColumn<GridRow>[]>(() => [
    { field: "strEmployee", headerName: "Employee", width: 210, sortable: false, filterable: false },
    { field: "strUnit", headerName: "Unit", width: 150, sortable: false, filterable: false },
    { field: "strType", headerName: "Separation Type", width: 140, sortable: false, filterable: false },
    { field: "dtResignation", headerName: "Resignation Date", width: 125, sortable: false, filterable: false },
    { field: "dtLwd", headerName: "Last Working Date", width: 130, sortable: false, filterable: false },
    { field: "dtActivation", headerName: "Activation Date", width: 125, sortable: false, filterable: false },
    { field: "strExclusion", headerName: "Payroll Exclusion From", width: 150, sortable: false, filterable: false },
    { field: "strStatus", headerName: "Separation Status", width: 135, sortable: false, filterable: false, exportable: true },
    { field: "strFnfStatus", headerName: "F&F Status", width: 125, sortable: false, filterable: false },
    { field: "objActions", headerName: "Actions", width: 170, sortable: false, filterable: false, exportable: false },
  ], []);

  const lstGridRows = useMemo<GridRow[]>(() => lstRows.map((objRow) => {
    const strFnfReason = objRow.blnCanOpenFNF ? "Open F&F settlement" : objRow.strActionStatus !== "ACTIVATED" ? `Separation is ${objRow.strActionStatusLabel.toLowerCase()}` : "Create F&F settlement";
    return {
      id: objRow.intID,
      strRecordUUID: objRow.strRecordUUID,
      strEmployee: (
        <Box>
          <Link className="app-master-first-column-link" component="button" type="button" underline="none" data-controlid="employee-separations.row.employee.link" data-row-key={String(objRow.intID)} onClick={(objEvent) => { objEvent.stopPropagation(); openDetail(objRow.strRecordUUID); }}>
            {objRow.strEmployeeCode}
          </Link>
          <Typography variant="body2" sx={{ color: "#475569" }}>{objRow.strEmployeeName}</Typography>
        </Box>
      ),
      strUnit: objRow.strLocationName || "-",
      strType: objRow.strSeparationTypeLabel,
      dtResignation: formatDisplayDate(objRow.dtResignationDate),
      dtLwd: formatDisplayDate(objRow.dtLastWorkingDate),
      dtActivation: formatDisplayDate(objRow.dtActivatedOn),
      strExclusion: objRow.strExclusionFromMonthLabel || "-",
      strStatus: <SeparationStatusBadge strStatus={objRow.strActionStatus} />,
      strFnfStatus: <SeparationFnfStatusBadge strStatus={objRow.strFnfStatus} />,
      objActions: (
        <Stack direction="row" spacing={0.25}>
          <ActionIcon strTitle="View separation" strControlId="employee-separations.row.view.button" onClick={() => openDetail(objRow.strRecordUUID)}><VisibilityRoundedIcon fontSize="small" /></ActionIcon>
          {objRow.blnCanOpenFNF ? (
            <ActionIcon strTitle={blnCanOpenFnf ? strFnfReason : "No F&F access"} strControlId="employee-separations.row.open-fnf.button" blnDisabled={!blnCanOpenFnf || !objRow.objSettlement?.strRecordUUID} onClick={() => objRouter.push(`/payroll/fnf-settlements/${objRow.objSettlement?.strRecordUUID}`)}><OpenInNewRoundedIcon fontSize="small" /></ActionIcon>
          ) : (
            <ActionIcon strTitle={!blnCanCreateFnf ? "No right to create F&F settlements" : strFnfReason} strControlId="employee-separations.row.create-fnf.button" blnDisabled={!blnCanCreateFnf || !objRow.blnCanCreateFNF} onClick={() => objRouter.push(`/payroll/fnf-settlements/new?employee_id=${objRow.intEmployeeID}`)}><NoteAddRoundedIcon fontSize="small" /></ActionIcon>
          )}
          {blnCanCancel ? (
            <ActionIcon strTitle={objRow.blnCanCancel ? "Cancel separation" : objRow.strCancelBlockedReason || "Cannot be cancelled"} strControlId="employee-separations.row.cancel.button" blnDisabled={!objRow.blnCanCancel} onClick={() => setObjCancelTarget(objRow)}><BlockRoundedIcon fontSize="small" /></ActionIcon>
          ) : null}
          <ActionIcon strTitle="View history" strControlId="employee-separations.row.history.button" onClick={() => setObjHistoryTarget(objRow)}><HistoryRoundedIcon fontSize="small" /></ActionIcon>
        </Stack>
      ),
    };
  }), [lstRows, blnCanCancel, blnCanCreateFnf, blnCanOpenFnf]);

  const intPageCount = Math.max(1, Math.ceil(intTotal / intPageSize));
  const intFrom = intTotal === 0 ? 0 : (intPage - 1) * intPageSize + 1;
  const intTo = Math.min(intPage * intPageSize, intTotal);
  const blnMoreActive = lstMoreFilterKeys.some((strKey) => dicFilters[strKey] !== "");

  return (
    <Box className={styles.page} data-controlid="employee-separations.list.page">
      <MasterBreadcrumbs
        strSection="Employee Services"
        strTitle="Employee Separation"
        lstNotices={[
          { strKey: "error", strSeverity: "error", objMessage: strError, fnDismiss: () => setStrError("") },
          { strKey: "created", strSeverity: "success", objMessage: objSuccess, fnDismiss: () => setObjSuccess(null) },
        ]}
      />

      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Box className={styles.compactSearchRow} aria-busy={blnBusy} onKeyDown={onSearchEnter(() => { if (!blnBusy) applyFilters(); })}>
          <TextField className="app-mui-text-field" size="small" label="Employee" placeholder="Code or name" disabled={blnBusy} value={dicFilters.search} onChange={(e) => setDicFilters((d) => ({ ...d, search: e.target.value }))}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }} controlId="employee-separations.search.input" />
          <TextField className="app-mui-text-field" size="small" select label="Separation Status" disabled={blnBusy} value={dicFilters.status} onChange={(e) => setDicFilters((d) => ({ ...d, status: e.target.value }))} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} controlId="employee-separations.status.select">
            {lstStatusFilters.map((objOption) => <MenuItem key={objOption.strValue || "default"} value={objOption.strValue}>{objOption.strLabel}</MenuItem>)}
          </TextField>
          <TextField className="app-mui-text-field" size="small" select label="F&F Status" disabled={blnBusy} value={dicFilters.fnf_status} onChange={(e) => setDicFilters((d) => ({ ...d, fnf_status: e.target.value }))} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} controlId="employee-separations.fnf-status.select">
            <MenuItem value="">All</MenuItem>
            {(objLookups?.lstFnfStatuses || []).map((objOption) => <MenuItem key={objOption.strCode} value={objOption.strCode}>{objOption.strLabel}</MenuItem>)}
          </TextField>
          <MasterMoreFilters
            strControlPrefix="employee-separations"
            blnHasActiveFilters={blnMoreActive}
            blnDisabled={blnBusy}
            onOpen={() => setDicMoreSnapshot(dicFilters)}
            onCancel={() => { if (dicMoreSnapshot) setDicFilters(dicMoreSnapshot); }}
            onClearAll={() => setDicFilters((d) => { const dicNext = { ...d }; lstMoreFilterKeys.forEach((strKey) => { dicNext[strKey] = ""; }); return dicNext; })}
            onApply={() => applyFilters()}
          >
            <TextField className="app-mui-text-field" fullWidth size="small" select label="Department" value={dicFilters.department_id} onChange={(e) => setDicFilters((d) => ({ ...d, department_id: e.target.value }))} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} controlId="employee-separations.department.select">
              <MenuItem value="">All</MenuItem>
              {(objLookups?.lstDepartments || []).map((objOption) => <MenuItem key={objOption.intID} value={String(objOption.intID)}>{objOption.strLabel}</MenuItem>)}
            </TextField>
            <TextField className="app-mui-text-field" fullWidth size="small" select label="Unit" value={dicFilters.location_id} onChange={(e) => setDicFilters((d) => ({ ...d, location_id: e.target.value }))} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} controlId="employee-separations.unit.select">
              <MenuItem value="">All</MenuItem>
              {(objLookups?.lstLocations || []).map((objOption) => <MenuItem key={objOption.intID} value={String(objOption.intID)}>{objOption.strLabel}</MenuItem>)}
            </TextField>
            <TextField className="app-mui-text-field" fullWidth size="small" type="date" label="LWD From" InputLabelProps={{ shrink: true }} value={dicFilters.lwd_from} onChange={(e) => setDicFilters((d) => ({ ...d, lwd_from: e.target.value }))} controlId="employee-separations.lwd-from.input" />
            <TextField className="app-mui-text-field" fullWidth size="small" type="date" label="LWD To" InputLabelProps={{ shrink: true }} value={dicFilters.lwd_to} onChange={(e) => setDicFilters((d) => ({ ...d, lwd_to: e.target.value }))} controlId="employee-separations.lwd-to.input" />
            <TextField className="app-mui-text-field" fullWidth size="small" type="date" label="Activated From" InputLabelProps={{ shrink: true }} value={dicFilters.activation_from} onChange={(e) => setDicFilters((d) => ({ ...d, activation_from: e.target.value }))} controlId="employee-separations.activation-from.input" />
            <TextField className="app-mui-text-field" fullWidth size="small" type="date" label="Activated To" InputLabelProps={{ shrink: true }} value={dicFilters.activation_to} onChange={(e) => setDicFilters((d) => ({ ...d, activation_to: e.target.value }))} controlId="employee-separations.activation-to.input" />
            <TextField className="app-mui-text-field" fullWidth size="small" type="month" label="Payroll Exclusion Month" InputLabelProps={{ shrink: true }} value={dicFilters.exclusion_month} onChange={(e) => setDicFilters((d) => ({ ...d, exclusion_month: e.target.value }))} controlId="employee-separations.exclusion-month.input" />
          </MasterMoreFilters>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => applyFilters()} disabled={blnBusy} controlId="employee-separations.search.button">Search</Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicFilters(dicEmptyFilters); applyFilters(dicEmptyFilters); }} disabled={blnBusy} controlId="employee-separations.clear.button">Clear</Button>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {blnRightsLoading || (blnLoading && lstRows.length === 0) ? (
          <MasterGridSkeleton strControlId="employee-separations.list.skeleton" intColumns={9} />
        ) : !blnCanView ? (
          <Box className={styles.emptyState} data-controlid="employee-separations.list.access-denied.state">
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>Employee Separation access is not available for your user group.</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>Contact your administrator if you need access.</Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstColumns}
            rows={lstGridRows}
            loading={blnLoading}
            toolbarLeft={blnCanAdd ? (
              <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push(`${STR_ROUTE}/new`)} controlId="employee-separations.add.button">Add Separation</Button>
            ) : undefined}
            toolbarAfterExport={(
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
                <TextField size="small" select label="Sort by" value={strSort} onChange={(e) => { setStrSort(e.target.value); setIntPage(1); }} sx={{ minWidth: 190 }} controlId="employee-separations.sort.select">
                  {lstSortOptions.map((objOption) => <MenuItem key={objOption.strValue} value={objOption.strValue}>{objOption.strLabel}</MenuItem>)}
                </TextField>
                <Tooltip title={strDirection === "desc" ? "Newest / highest first" : "Oldest / lowest first"} arrow>
                  <IconButton size="small" aria-label="Toggle sort direction" onClick={() => setStrDirection((s) => (s === "desc" ? "asc" : "desc"))} controlId="employee-separations.sort-direction.button">
                    {strDirection === "desc" ? <SouthRoundedIcon fontSize="small" /> : <NorthRoundedIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
                <TextField size="small" select label="Per page" value={String(intPageSize)} onChange={(e) => { setIntPageSize(Number(e.target.value)); setIntPage(1); }} sx={{ width: 90 }} controlId="employee-separations.page-size.select">
                  {lstPageSizes.map((intSize) => <MenuItem key={intSize} value={String(intSize)}>{intSize}</MenuItem>)}
                </TextField>
                <Typography variant="body2" sx={{ color: "#475569", whiteSpace: "nowrap" }} data-controlid="employee-separations.count.label">{intFrom}-{intTo} of {intTotal}</Typography>
                <Pagination size="small" shape="rounded" color="primary" count={intPageCount} page={Math.min(intPage, intPageCount)} onChange={(_, intNext) => setIntPage(intNext)} data-controlid="employee-separations.pagination" />
              </Stack>
            )}
            rowIdField="id"
            defaultPageSize={lstPageSizes[lstPageSizes.length - 1]}
            exportFileName="employee_separations"
            showExportOptions={blnCanExport}
            emptyMessage="No separations found."
            testIdPrefix="employee-separations.list"
            onRowClick={(objRow) => openDetail(objRow.strRecordUUID)}
            minTableWidth={1450}
            hideRowClickHint
            getRowSx={(objRow) => (objRow.strRecordUUID === strHighlightUUID ? { ...dicMasterRowSx, backgroundColor: "#eff6ff" } : dicMasterRowSx)}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        )}
      </Box>

      <CancelSeparationDialog
        strSeparationID={objCancelTarget?.strRecordUUID ?? null}
        strEmployeeLabel={objCancelTarget ? `${objCancelTarget.strEmployeeCode} - ${objCancelTarget.strEmployeeName} (LWD ${formatDisplayDate(objCancelTarget.dtLastWorkingDate)})` : ""}
        onClose={(blnChanged) => { setObjCancelTarget(null); if (blnChanged) { setObjSuccess("Separation cancelled. The employee is back on regular payroll processing."); void loadRows(); } }}
      />
      <SeparationHistoryDialog
        strSeparationID={objHistoryTarget?.strRecordUUID ?? null}
        strEmployeeLabel={objHistoryTarget ? `${objHistoryTarget.strEmployeeCode} - ${objHistoryTarget.strEmployeeName}` : ""}
        onClose={() => setObjHistoryTarget(null)}
      />
    </Box>
  );
}
