"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  InputAdornment,
  Link,
  MenuItem,
  Skeleton,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import CommonSearchableSelect from "@/Common/components/CommonSearchableSelect";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import styles from "@/components/master/MasterScreen.module.css";
import { leaveService } from "@/features/leave/services/leaveService";
import { type LeaveLookups, type LeaveTypeEnrichedDto } from "@/features/leave/types";
import { useActionRights } from "@/features/security/hooks/useActionRights";

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };
type SearchForm = {
  query: string;
  category: string;
  paid: "All" | "Paid" | "Unpaid";
  encashable: "All" | "Yes" | "No";
  status: "All" | "Active" | "Inactive";
};

const dicEmptySearch: SearchForm = { query: "", category: "All", paid: "All", encashable: "All", status: "All" };
const intLeaveTypeSkeletonRows = 8;

function prettifyCode(strCode: string | null | undefined): string {
  return (
    (strCode ?? "")
      .toLowerCase()
      .split("_")
      .filter(Boolean)
      .map((strWord) => strWord.charAt(0).toUpperCase() + strWord.slice(1))
      .join(" ") || "-"
  );
}

function StatusPill({ blnActive }: { blnActive: boolean }) {
  return (
    <span className={`app-master-status-pill ${blnActive ? "app-master-status-active" : "app-master-status-inactive"}`}>
      {blnActive ? "Active" : "Inactive"}
    </span>
  );
}

function LeaveTypeGridSkeleton() {
  return (
    <Box
      data-controlid="leave-types.list.skeleton"
      sx={{
        border: "1px solid #e8eef5",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: "#fff",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, px: 1.75, py: 1.25, flexWrap: "wrap" }}>
        <Skeleton variant="rounded" width={130} height={36} />
        <Box sx={{ display: "flex", gap: 1.25, alignItems: "center", flexWrap: "wrap" }}>
          <Skeleton variant="rounded" width={64} height={36} />
          <Skeleton variant="text" width={72} height={24} />
          <Skeleton variant="rounded" width={116} height={32} />
        </Box>
      </Box>
      <Box sx={{ minWidth: 1256 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "220px 120px 140px 100px 110px 120px 110px 110px 120px 110px", bgcolor: "#edf3f9", borderTop: "1px solid #e8eef5", borderBottom: "1px solid #d9e3ee" }}>
          {Array.from({ length: 10 }).map((_, intColumn) => (
            <Box key={intColumn} sx={{ px: 2, py: 1 }}>
              <Skeleton variant="text" width={intColumn === 9 ? 74 : 104} height={22} />
            </Box>
          ))}
        </Box>
        {Array.from({ length: intLeaveTypeSkeletonRows }).map((_, intIndex) => (
          <Box
            key={intIndex}
            sx={{
              display: "grid",
              gridTemplateColumns: "220px 120px 140px 100px 110px 120px 110px 110px 120px 110px",
              borderBottom: "1px solid #edf1f6",
              minHeight: 40,
              alignItems: "center",
            }}
          >
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${62 + (intIndex % 3) * 8}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${52 + (intIndex % 2) * 10}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="58%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="54%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="64%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="48%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="42%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="50%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="56%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="rounded" width={72} height={22} /></Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function LeaveTypesPanel() {
  const objRouter = useRouter();
  const { canDo, blnLoading: blnRightsLoading } = useActionRights();
  // Gate every action against the Leave Types menu's own granular rights so the UI matches what
  // the backend now enforces (edit OFF -> no edit, etc.).
  const blnCanAdd = canDo("leave_types", "ADD");
  const blnCanEdit = canDo("leave_types", "EDIT");
  const blnCanDelete = canDo("leave_types", "DELETE");
  const blnCanExport = canDo("leave_types", "EXPORT");
  const blnCanView = canDo("leave_types", "VIEW");
  // A VIEW-only user can still open a record — read-only. Edit/delete rights imply the record can
  // be opened too, so any of the three enables the row-open (eye) action and the row double-click.
  const blnCanOpenDetail = blnCanView || blnCanEdit || blnCanDelete;
  const [lstTypes, setLstTypes] = useState<LeaveTypeEnrichedDto[]>([]);
  const [objLookups, setObjLookups] = useState<LeaveLookups>({});
  const [blnLoading, setBlnLoading] = useState(true);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const blnSearchDisabled = blnLoading || blnRightsLoading;

  const lstCategoryOptions = objLookups.LEAVE_CATEGORY ?? [];
  const lstCategorySelectOptions = useMemo(
    () => [{ intID: "All", strLabel: "All Categories" }, ...lstCategoryOptions.map((objOption) => ({ intID: objOption.strValueCode, strLabel: objOption.strDisplayName }))],
    [lstCategoryOptions],
  );

  function labelOf(strDomain: string, strCode: string | null | undefined): string {
    if (!strCode) return "-";
    return objLookups[strDomain]?.find((objOption) => objOption.strValueCode === strCode)?.strDisplayName ?? prettifyCode(strCode);
  }

  function showToast(strMessage: string, strSeverity: "success" | "error") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  async function loadAll() {
    setBlnLoading(true);
    try {
      const [lstTypeResult, objLookupResult] = await Promise.all([
        leaveService.listEnterpriseLeaveTypes(),
        leaveService.getLeaveLookups(),
      ]);
      setLstTypes(lstTypeResult);
      setObjLookups(objLookupResult);
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const lstFilteredTypes = useMemo(() => {
    return lstTypes.filter((objType) => {
      const strName = (objType.strDisplayName || objType.strTypeName).toLowerCase();
      const strCode = objType.strTypeCode.toLowerCase();
      const strQuery = dicSearchApplied.query.trim().toLowerCase();
      const blnQuery = !strQuery || strName.includes(strQuery) || strCode.includes(strQuery);
      const blnCategory = dicSearchApplied.category === "All" || objType.strLeaveCategoryCode === dicSearchApplied.category;
      const blnPaid = dicSearchApplied.paid === "All" || (dicSearchApplied.paid === "Paid" ? objType.blnIsPaid : !objType.blnIsPaid);
      const blnEnc =
        dicSearchApplied.encashable === "All" || (dicSearchApplied.encashable === "Yes" ? objType.blnIsEncashable : !objType.blnIsEncashable);
      const blnStatus =
        dicSearchApplied.status === "All" || (dicSearchApplied.status === "Active" ? objType.blnIsActive : !objType.blnIsActive);
      return blnQuery && blnCategory && blnPaid && blnEnc && blnStatus;
    });
  }, [lstTypes, dicSearchApplied]);

  function applySearch(dicSearch: SearchForm) {
    const dicNext = { ...dicSearch, query: dicSearch.query.trim() };
    setDicSearchDraft(dicNext);
    setDicSearchApplied(dicNext);
  }

  // ---- Leave type: full-page enterprise editor (create / edit / view) ----
  function openNewType() {
    objRouter.push("/leave/leave-types/new");
  }

  function openTypeDialog(objType: LeaveTypeEnrichedDto) {
    objRouter.push(`/leave/leave-types/${objType.strRecordUUID}`);
  }

  // Double-clicking a row opens the record: edit mode when the user can edit, otherwise read-only
  // view mode. Users with neither right never reach the editor.
  function openTypeByRowId(strRecordUUID: string) {
    if (!blnCanOpenDetail) return;
    objRouter.push(`/leave/leave-types/${strRecordUUID}`);
  }

  const lstTypeRows = useMemo(
    () =>
      lstFilteredTypes.map((objType) => ({
        id: objType.intID,
        strRecordUUID: objType.strRecordUUID,
        strNameSort: objType.strDisplayName || objType.strTypeName,
        strName: (
          <Link
            className="app-master-first-column-link"
            component="button"
            type="button"
            underline="none"
            data-controlid="leave-types.list.row.name.link"
            data-row-key={String(objType.intID)}
            onClick={() => openTypeDialog(objType)}
            sx={{ color: "inherit", fontWeight: 700, lineHeight: 1.25, textAlign: "left" }}
          >
            {objType.strDisplayName || objType.strTypeName}
          </Link>
        ),
        strTypeCode: objType.strTypeCode,
        strCategory: labelOf("LEAVE_CATEGORY", objType.strLeaveCategoryCode),
        strPaid: objType.blnIsPaid ? "Paid" : "Unpaid",
        strAccrual: objType.strAccrualFrequency ? prettifyCode(objType.strAccrualFrequency) : "-",
        strEntitlement: objType.decEntitlementQty != null ? String(objType.decEntitlementQty) : "-",
        strCarryFwd: objType.blnCarryForwardAllowed == null ? "-" : objType.blnCarryForwardAllowed ? "Yes" : "No",
        strSandwich: objType.blnSandwichRuleEnabled == null ? "-" : objType.blnSandwichRuleEnabled ? "Yes" : "No",
        strEncashable: objType.blnIsEncashable ? "Yes" : "No",
        intStatusSort: objType.blnIsActive ? 1 : 0,
        blnStatus: <StatusPill blnActive={objType.blnIsActive} />,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lstFilteredTypes, objLookups],
  );

  const lstTypeColumns = useMemo<CommonTableColumn<(typeof lstTypeRows)[number]>[]>(
    () => [
      { field: "strName", headerName: "Leave Name", width: 220, sortAccessor: (dicRow) => String(dicRow.strNameSort) },
      { field: "strTypeCode", headerName: "Leave Code", width: 120 },
      { field: "strCategory", headerName: "Category", width: 140 },
      { field: "strPaid", headerName: "Paid", width: 100 },
      { field: "strAccrual", headerName: "Accrual", width: 110 },
      { field: "strEntitlement", headerName: "Entitlement", width: 120 },
      { field: "strCarryFwd", headerName: "Carry Fwd", width: 110 },
      { field: "strSandwich", headerName: "Sandwich", width: 110 },
      { field: "strEncashable", headerName: "Encashable", width: 120 },
      { field: "blnStatus", headerName: "Status", width: 110, sortAccessor: (dicRow) => Number(dicRow.intStatusSort) },
    ],
    [],
  );

  const objTransparentTableSx = { p: 0, boxShadow: "none", background: "transparent" } as const;

  return (
    <Box className={styles.page} data-controlid="leave-types.list.page">
      <Breadcrumbs className="app-breadcrumbs" aria-label="breadcrumb" separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />}>
        <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>Leave Management</Typography>
        <Typography component="h1" className="app-breadcrumb-heading" aria-current="page">Leave Types</Typography>
      </Breadcrumbs>

      {/* Search / filter card */}
      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Box
          className={styles.searchRow}
          sx={{
            gridTemplateColumns: "minmax(300px, 1.6fr) repeat(4, minmax(150px, 1fr)) auto auto !important",
            alignItems: "center",
            overflowX: "auto",
            pt: 1.25,
            pb: 0.5,
            "& .MuiButton-root": { alignSelf: "center" },
            "& > *": { minWidth: 0 },
            "& .MuiInputBase-root": { height: 40 },
          }}
        >
          <TextField
            className="app-mui-text-field"
            controlId="leave.search.query.input"
            size="small"
            label="Search by leave name or code"
            value={dicSearchDraft.query}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, query: objEvent.target.value }))}
            onKeyDown={(objEvent) => {
              if (objEvent.key === "Enter") {
                objEvent.preventDefault();
                applySearch(dicSearchDraft);
              }
            }}
            placeholder="Search by leave name or code"
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }}
            disabled={blnSearchDisabled}
            fullWidth
          />
          <CommonSearchableSelect
            className="app-mui-text-field"
            controlId="leave.search.category.select"
            label="Category"
            value={dicSearchDraft.category}
            options={lstCategorySelectOptions}
            onChange={(strValue) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, category: strValue === "" ? "All" : String(strValue) }))}
            disabled={blnSearchDisabled}
            fullWidth
          />
          <TextField
            className="app-mui-text-field"
            controlId="leave.search.paid.select"
            select
            size="small"
            label="Paid / Unpaid"
            value={dicSearchDraft.paid}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, paid: objEvent.target.value as SearchForm["paid"] }))}
            disabled={blnSearchDisabled}
            fullWidth
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Paid">Paid</MenuItem>
            <MenuItem value="Unpaid">Unpaid</MenuItem>
          </TextField>
          <TextField
            className="app-mui-text-field"
            controlId="leave.search.encashable.select"
            select
            size="small"
            label="Encashable"
            value={dicSearchDraft.encashable}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, encashable: objEvent.target.value as SearchForm["encashable"] }))}
            disabled={blnSearchDisabled}
            fullWidth
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Yes">Encashable</MenuItem>
            <MenuItem value="No">Not encashable</MenuItem>
          </TextField>
          <TextField
            className="app-mui-text-field"
            controlId="leave.search.status.select"
            select
            size="small"
            label="Status"
            value={dicSearchDraft.status}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, status: objEvent.target.value as SearchForm["status"] }))}
            disabled={blnSearchDisabled}
            fullWidth
          >
            <MenuItem value="All">All Status</MenuItem>
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Inactive">Inactive</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button controlId="leave.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => applySearch(dicSearchDraft)} disabled={blnSearchDisabled}>
              Search
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button
              controlId="leave.clear.button"
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicSearchDraft(dicEmptySearch);
                setDicSearchApplied(dicEmptySearch);
              }}
              disabled={blnSearchDisabled}
            >
              Clear
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {blnLoading || blnRightsLoading ? (
          <LeaveTypeGridSkeleton />
        ) : (
          <CommonTable
            columns={lstTypeColumns}
            rows={lstTypeRows}
            rowIdField="id"
            exportFileName="leave_types"
            showExportOptions={blnCanExport}
            showPaginationSummary
            minTableWidth={1256}
            emptyMessage="No leave types found."
            onRowClick={(dicRow) => openTypeByRowId(dicRow.strRecordUUID)}
            toolbarLeft={
              blnCanAdd ? (
                <Button controlId="leave.type.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={openNewType}>
                  Add Leave Type
                </Button>
              ) : null
            }
            testIdPrefix="leave-types.list"
            hideRowClickHint
            getRowSx={() => ({
              backgroundColor: "#fff",
              "&.MuiTableRow-hover:hover": { backgroundColor: "#f8fbff" },
              "&.MuiTableRow-hover:hover td:first-of-type .MuiLink-root": { color: "#0066df", textDecoration: "underline" },
            })}
            sx={objTransparentTableSx}
          />
        )}
      </Box>

      <Snackbar
        open={objToast.blnOpen}
        autoHideDuration={5000}
        onClose={() => setObjToast((objPrev) => ({ ...objPrev, blnOpen: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={objToast.strSeverity} variant="filled" onClose={() => setObjToast((objPrev) => ({ ...objPrev, blnOpen: false }))}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
