"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Snackbar,
  TextField,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import { leaveService } from "@/features/leave/services/leaveService";
import { type LeaveLookups, type LeaveTypeEnrichedDto } from "@/features/leave/types";
import { useActionRights } from "@/features/security/hooks/useActionRights";

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };
type SearchForm = {
  name: string;
  code: string;
  category: string;
  paid: "All" | "Paid" | "Unpaid";
  encashable: "All" | "Yes" | "No";
  status: "All" | "Active" | "Inactive";
};
type ConfirmState = { strTitle: string; strMessage: string; strConfirmLabel: string; fnOnConfirm: () => Promise<void> } | null;

const dicEmptySearch: SearchForm = { name: "", code: "", category: "All", paid: "All", encashable: "All", status: "All" };

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
    <span className={`${styles.statusPill} ${blnActive ? styles.statusActive : styles.statusInactive}`}>
      {blnActive ? "Active" : "Inactive"}
    </span>
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
  const [blnSaving, setBlnSaving] = useState(false);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  const [objConfirm, setObjConfirm] = useState<ConfirmState>(null);

  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);

  const lstCategoryOptions = objLookups.LEAVE_CATEGORY ?? [];

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
      const blnName = !dicSearchApplied.name || strName.includes(dicSearchApplied.name.toLowerCase());
      const blnCode = !dicSearchApplied.code || objType.strTypeCode.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
      const blnCategory = dicSearchApplied.category === "All" || objType.strLeaveCategoryCode === dicSearchApplied.category;
      const blnPaid = dicSearchApplied.paid === "All" || (dicSearchApplied.paid === "Paid" ? objType.blnIsPaid : !objType.blnIsPaid);
      const blnEnc =
        dicSearchApplied.encashable === "All" || (dicSearchApplied.encashable === "Yes" ? objType.blnIsEncashable : !objType.blnIsEncashable);
      const blnStatus =
        dicSearchApplied.status === "All" || (dicSearchApplied.status === "Active" ? objType.blnIsActive : !objType.blnIsActive);
      return blnName && blnCode && blnCategory && blnPaid && blnEnc && blnStatus;
    });
  }, [lstTypes, dicSearchApplied]);

  function applySearch(dicSearch: SearchForm) {
    const dicNext = { ...dicSearch, name: dicSearch.name.trim(), code: dicSearch.code.trim() };
    setDicSearchDraft(dicNext);
    setDicSearchApplied(dicNext);
  }

  // ---- Leave type: full-page enterprise editor (create / edit / view) ----
  function openNewType() {
    objRouter.push("/leave/leave-types/new");
  }

  function openTypeDialog(objType: LeaveTypeEnrichedDto, blnView: boolean) {
    objRouter.push(`/leave/leave-types/${objType.intID}`);
  }

  // Double-clicking a row opens the record: edit mode when the user can edit, otherwise read-only
  // view mode. Users with neither right never reach the editor.
  function openTypeByRowId(intID: number) {
    if (!blnCanOpenDetail) return;
    objRouter.push(`/leave/leave-types/${intID}`);
  }

  function confirmDeleteType(objType: LeaveTypeEnrichedDto) {
    setObjConfirm({
      strTitle: "Delete Leave Type",
      strMessage: `Delete "${objType.strDisplayName || objType.strTypeName}"? If it is in use it cannot be deleted and will be deactivated instead.`,
      strConfirmLabel: "Delete",
      fnOnConfirm: async () => {
        await leaveService.deleteEnterpriseLeaveType(objType.intID);
        showToast("Leave type removed successfully.", "success");
        await loadAll();
      },
    });
  }

  async function executeConfirm() {
    if (!objConfirm) return;
    setBlnSaving(true);
    try {
      await objConfirm.fnOnConfirm();
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      showToast(objHandled.message, "error");
    } finally {
      setBlnSaving(false);
      setObjConfirm(null);
    }
  }

  const lstTypeRows = useMemo(
    () =>
      lstFilteredTypes.map((objType) => ({
        id: objType.intID,
        action: (
          <CommonRowActions
            testIdPrefix="leave-types.list.row"
            rowKey={objType.intID}
            blnCanView={blnCanOpenDetail}
            blnCanEdit={blnCanEdit}
            blnCanDelete={blnCanDelete}
            onView={() => openTypeDialog(objType, true)}
            onEdit={() => openTypeDialog(objType, false)}
            onDelete={() => confirmDeleteType(objType)}
          />
        ),
        strTypeCode: objType.strTypeCode,
        strName: objType.strDisplayName || objType.strTypeName,
        strCategory: labelOf("LEAVE_CATEGORY", objType.strLeaveCategoryCode),
        strPaid: objType.blnIsPaid ? "Paid" : "Unpaid",
        strAccrual: objType.strAccrualFrequency ? prettifyCode(objType.strAccrualFrequency) : "-",
        strEntitlement: objType.decEntitlementQty != null ? String(objType.decEntitlementQty) : "-",
        strCarryFwd: objType.blnCarryForwardAllowed == null ? "-" : objType.blnCarryForwardAllowed ? "Yes" : "No",
        strSandwich: objType.blnSandwichRuleEnabled == null ? "-" : objType.blnSandwichRuleEnabled ? "Yes" : "No",
        strEncashable: objType.blnIsEncashable ? "Yes" : "No",
        blnStatus: <StatusPill blnActive={objType.blnIsActive} />,
      })),
    // Rights flags MUST be deps: useActionRights loads async, so without them the action cells
    // memoize while rights are still false (icons hidden) and never recompute once rights arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lstFilteredTypes, objLookups, blnCanOpenDetail, blnCanEdit, blnCanDelete],
  );

  const lstTypeColumns = useMemo<CommonTableColumn<(typeof lstTypeRows)[number]>[]>(
    () => [
      { field: "action", headerName: "Actions", sortable: false, filterable: false, exportable: false, width: 120 },
      { field: "strTypeCode", headerName: "Code", width: 90 },
      { field: "strName", headerName: "Name", width: 180 },
      { field: "strCategory", headerName: "Category", width: 140 },
      { field: "strPaid", headerName: "Paid", width: 100 },
      { field: "strAccrual", headerName: "Accrual", width: 110 },
      { field: "strEntitlement", headerName: "Entitlement", width: 120 },
      { field: "strCarryFwd", headerName: "Carry Fwd", width: 110 },
      { field: "strSandwich", headerName: "Sandwich", width: 110 },
      { field: "strEncashable", headerName: "Encashable", width: 120 },
      { field: "blnStatus", headerName: "Status", sortable: false, width: 110 },
    ],
    [],
  );

  const objTransparentTableSx = { p: 0, boxShadow: "none", background: "transparent" } as const;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, pb: 2 }}>
      {/* Search / filter card */}
      <Box className={styles.controlsCard}>
        <Box
          sx={{
            display: "grid",
            gap: 1.25,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(6, minmax(0, 1fr))" },
            alignItems: "center",
            mt: 1,
          }}
        >
          <TextField
            controlId="leave.search.name.input"
            size="small"
            value={dicSearchDraft.name}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, name: objEvent.target.value }))}
            onKeyDown={(objEvent) => objEvent.key === "Enter" && applySearch(dicSearchDraft)}
            placeholder="Search leave type name"
            fullWidth
          />
          <TextField
            controlId="leave.search.code.input"
            size="small"
            value={dicSearchDraft.code}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, code: objEvent.target.value.toUpperCase() }))}
            onKeyDown={(objEvent) => objEvent.key === "Enter" && applySearch(dicSearchDraft)}
            placeholder="Search leave type code"
            fullWidth
          />
          <TextField
            controlId="leave.search.category.select"
            select
            size="small"
            label="Category"
            value={dicSearchDraft.category}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, category: objEvent.target.value }))}
            fullWidth
          >
            <MenuItem value="All">All Categories</MenuItem>
            {lstCategoryOptions.map((objOption) => (
              <MenuItem key={objOption.strValueCode} value={objOption.strValueCode}>
                {objOption.strDisplayName}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            controlId="leave.search.paid.select"
            select
            size="small"
            label="Paid / Unpaid"
            value={dicSearchDraft.paid}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, paid: objEvent.target.value as SearchForm["paid"] }))}
            fullWidth
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Paid">Paid</MenuItem>
            <MenuItem value="Unpaid">Unpaid</MenuItem>
          </TextField>
          <TextField
            controlId="leave.search.encashable.select"
            select
            size="small"
            label="Encashable"
            value={dicSearchDraft.encashable}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, encashable: objEvent.target.value as SearchForm["encashable"] }))}
            fullWidth
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Yes">Encashable</MenuItem>
            <MenuItem value="No">Not encashable</MenuItem>
          </TextField>
          <TextField
            controlId="leave.search.status.select"
            select
            size="small"
            label="Status"
            value={dicSearchDraft.status}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, status: objEvent.target.value as SearchForm["status"] }))}
            fullWidth
          >
            <MenuItem value="All">All Status</MenuItem>
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Inactive">Inactive</MenuItem>
          </TextField>
          <Box sx={{ display: "flex", gap: 1, gridColumn: "1 / -1", justifyContent: "flex-end" }}>
            <Button controlId="leave.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => applySearch(dicSearchDraft)} disabled={blnLoading}>
              Search
            </Button>
            <Button
              controlId="leave.clear.button"
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicSearchDraft(dicEmptySearch);
                setDicSearchApplied(dicEmptySearch);
              }}
              disabled={blnLoading}
            >
              Clear
            </Button>
          </Box>
        </Box>
      </Box>

      {blnLoading || blnRightsLoading ? (
        <Box sx={{ display: "grid", placeItems: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box className={styles.tableCard} sx={{ flex: "0 0 auto" }}>
          <CommonTable
            columns={lstTypeColumns}
            rows={lstTypeRows}
            rowIdField="id"
            exportFileName="leave_types"
            showExportOptions={blnCanExport}
            showPaginationSummary
            minTableWidth={1226}
            emptyMessage="No leave types found."
            onRowDoubleClick={(dicRow) => openTypeByRowId(dicRow.id)}
            toolbarLeft={
              blnCanAdd ? (
                <Button controlId="leave.type.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={openNewType}>
                  Add Leave Type
                </Button>
              ) : null
            }
            testIdPrefix="leave-types.list"
            sx={objTransparentTableSx}
          />
        </Box>
      )}

      <CommonConfirmDialog
        blnOpen={Boolean(objConfirm)}
        strTitle={objConfirm?.strTitle}
        strMessage={objConfirm?.strMessage}
        strCancelLabel="Cancel"
        strConfirmLabel={objConfirm?.strConfirmLabel ?? "Confirm"}
        blnConfirmDisabled={blnSaving}
        onClose={() => setObjConfirm(null)}
        onConfirm={executeConfirm}
      />

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
