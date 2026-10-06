"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Breadcrumbs, Button, IconButton, InputAdornment, Link, MenuItem, Snackbar, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";

import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import { onSearchEnter } from "@/components/master/MasterListUi";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import {
  AllocationGridSkeleton,
  dicActiveSwitchSx,
  focusField,
} from "@/features/allocation-masters/components/allocationMasterUi";
import {
  allocationMasterService,
  createInitialAllocationEntityTypeForm,
  toAllocationEntityTypeFormValues,
  type AllocationEntityTypeApiRecord,
  type AllocationEntityTypeFormValues,
} from "@/features/allocation-masters/services/allocationMasterService";

type PanelMode = "add" | "edit" | "view";

type SearchForm = {
  strCode: string;
  strName: string;
  strStatus: "All" | "Active" | "Inactive";
};

type ToastState = {
  blnOpen: boolean;
  strMessage: string;
  strSeverity: "success" | "error";
};

const lstEntityTypeModuleCodes = [
  "ALLOCATION_ENTITY_TYPE",
  "ALLOCATION_ENTITY_TYPES",
  "MASTER_ALLOCATION_ENTITY_TYPE",
];

const dicEmptySearch: SearchForm = { strCode: "", strName: "", strStatus: "All" };

// Allocation Entity Type master (e.g. "Unit", "Region") - the grouping dimension whose
// entities an Allocation-Based salary component is split across.
export default function AllocationEntityTypeMasterPanel() {
  const objNameRef = useRef<HTMLDivElement>(null);
  const objCodeRef = useRef<HTMLDivElement>(null);
  const { t } = useModuleLabels("allocation-entity-type", "Unable to load Allocation Entity Type labels.");
  const objAccess = useModuleActionAccess(lstEntityTypeModuleCodes);

  const [lstEntityTypes, setLstEntityTypes] = useState<AllocationEntityTypeApiRecord[]>([]);
  const [strMode, setStrMode] = useState<PanelMode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [intEditingID, setIntEditingID] = useState<number | null>(null);
  const [dicForm, setDicForm] = useState<AllocationEntityTypeFormValues>(createInitialAllocationEntityTypeForm());
  const [dicErrors, setDicErrors] = useState<Partial<Record<"strTypeCode" | "strTypeName", string>>>({});
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  const blnCanView = objAccess.canViewAny();
  const blnCanAdd = objAccess.canDoAny("add");
  const blnCanEdit = objAccess.canDoAny("edit");
  const blnSearchPanelFrozen = blnLoading || blnSubmitting || objAccess.blnLoading;

  function showToast(strMessage: string, strSeverity: ToastState["strSeverity"] = "success") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  async function loadEntityTypes() {
    if (!blnCanView) {
      setLstEntityTypes([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      const lstRecords = await allocationMasterService.listEntityTypes(false);
      setLstEntityTypes(lstRecords);
    } catch (objError) {
      showToast(
        objError instanceof Error
          ? objError.message
          : t("request_failed", "Unable to load Allocation Entity Types."),
        "error",
      );
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (objAccess.blnLoading) {
      return;
    }
    void loadEntityTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objAccess.blnLoading]);

  const lstFiltered = useMemo(
    () =>
      lstEntityTypes.filter((dicRecord) => {
        const blnCodeMatch =
          !dicSearchApplied.strCode ||
          dicRecord.strTypeCode.toLowerCase().includes(dicSearchApplied.strCode.toLowerCase());
        const blnNameMatch =
          !dicSearchApplied.strName ||
          dicRecord.strTypeName.toLowerCase().includes(dicSearchApplied.strName.toLowerCase());
        const blnStatusMatch =
          dicSearchApplied.strStatus === "All" ||
          (dicSearchApplied.strStatus === "Active" ? dicRecord.blnIsActive : !dicRecord.blnIsActive);
        return blnCodeMatch && blnNameMatch && blnStatusMatch;
      }),
    [dicSearchApplied, lstEntityTypes],
  );

  function openDialog(strNextMode: PanelMode, dicRecord?: AllocationEntityTypeApiRecord) {
    setStrMode(strNextMode);
    setDicErrors({});
    setIntEditingID(dicRecord?.intID ?? null);
    setDicForm(
      dicRecord ? toAllocationEntityTypeFormValues(dicRecord) : createInitialAllocationEntityTypeForm(),
    );
    setBlnDialogOpen(true);
  }

  function validateForm() {
    const dicNextErrors: Partial<Record<"strTypeCode" | "strTypeName", string>> = {};
    const strCode = dicForm.strTypeCode.trim().toUpperCase();
    const strName = dicForm.strTypeName.trim();

    if (!strCode) {
      dicNextErrors.strTypeCode = t("validation_code_required", "Type Code is required.");
    } else if (!/^[A-Z0-9_-]{2,50}$/.test(strCode)) {
      dicNextErrors.strTypeCode = t(
        "validation_code_format",
        "Type Code must be 2-50 characters (A-Z, 0-9, hyphen or underscore).",
      );
    } else if (
      lstEntityTypes.some(
        (dicRecord) => dicRecord.strTypeCode.toUpperCase() === strCode && dicRecord.intID !== intEditingID,
      )
    ) {
      dicNextErrors.strTypeCode = t("validation_code_duplicate", "This Type Code already exists.");
    }

    if (!strName) {
      dicNextErrors.strTypeName = t("validation_name_required", "Type Name is required.");
    }

    setDicErrors(dicNextErrors);
    // Send the user straight to the first field that needs fixing.
    if (dicNextErrors.strTypeName) {
      focusField(objNameRef.current);
    } else if (dicNextErrors.strTypeCode) {
      focusField(objCodeRef.current);
    }
    return Object.keys(dicNextErrors).length === 0;
  }

  async function saveEntityType() {
    if (!validateForm()) {
      return;
    }
    setBlnSubmitting(true);
    try {
      if (strMode === "add") {
        await allocationMasterService.createEntityType(dicForm);
      } else if (intEditingID) {
        await allocationMasterService.updateEntityType(intEditingID, dicForm);
      }
      await loadEntityTypes();
      setBlnDialogOpen(false);
      showToast(
        strMode === "add"
          ? t("save_success", "Allocation Entity Type created successfully.")
          : t("update_success", "Allocation Entity Type updated successfully."),
      );
    } catch (objError) {
      showToast(
        objError instanceof Error ? objError.message : t("request_failed", "Request failed."),
        "error",
      );
    } finally {
      setBlnSubmitting(false);
    }
  }

  const lstTableRows = useMemo(
    () =>
      lstFiltered.map((dicRecord) => ({
        id: String(dicRecord.intID),
        strTypeNameText: dicRecord.strTypeName,
        strTypeName: (
          <Link
            component="button"
            type="button"
            underline="none"
            disabled={!blnCanView && !blnCanEdit}
            className="app-master-first-column-link" data-control-id="allocation-entity-type.list.row.name.button"
            onClick={(objEvent) => {
              if (window.getSelection()?.toString()) {
                objEvent.stopPropagation();
                return;
              }
              openDialog(blnCanEdit ? "edit" : "view", dicRecord);
            }}
            sx={{ cursor: "pointer", textAlign: "left", textUnderlineOffset: "3px", userSelect: "text", WebkitUserSelect: "text", "&&:hover": { color: "#0066df", textDecoration: "underline" }, "&:focus-visible": { outline: "2px solid #0066df", outlineOffset: 3 } }}
          >
            {dicRecord.strTypeName}
          </Link>
        ),
        strTypeCode: dicRecord.strTypeCode,
        strStatusText: dicRecord.blnIsActive ? "Active" : "Inactive",
        strDescription: dicRecord.strDescription ?? "-",
        intDisplayOrder: dicRecord.intDisplayOrder,
        strStatus: (
          <span
            className={`app-master-status-pill ${dicRecord.blnIsActive ? "app-master-status-active" : "app-master-status-inactive"}`}
          >
            {dicRecord.blnIsActive ? t("status_active", "Active") : t("status_inactive", "Inactive")}
          </span>
        ),
      })),
    [blnCanEdit, blnCanView, lstFiltered, t],
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "strTypeName", headerName: t("table_name", "Type Name"), sortAccessor: (row) => row.strTypeNameText },
      { field: "strTypeCode", headerName: t("table_code", "Type Code") },
      { field: "strDescription", headerName: t("table_description", "Description") },
      { field: "intDisplayOrder", headerName: t("table_display_order", "Display Order"), width: 130 },
      { field: "strStatus", headerName: t("table_status", "Status"), filterable: false, width: 130, sortAccessor: (row) => row.strStatusText },
    ],
    [t],
  );

  return (
    <Box className={styles.page} sx={{ position: "relative" }}>
      <Breadcrumbs className="app-breadcrumbs" aria-label="breadcrumb" separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />} sx={{ ml: "3px" }}>
        <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>{t("breadcrumb_masters", "Masters")}</Typography>
        <Typography component="h1" className="app-breadcrumb-heading" aria-current="page">{t("breadcrumb_allocation_entity_types", "Allocation Entity Types")}</Typography>
      </Breadcrumbs>

      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {objAccess.strError ? (
          <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{objAccess.strError}</Typography>
        ) : null}
        {!objAccess.blnLoading && blnCanView && objAccess.isReadOnly() ? (
          <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>
            {t("read_only_mode", "You have view-only access for Allocation Entity Types.")}
          </Typography>
        ) : null}

        <Box
          className={styles.searchRow}
          onKeyDown={onSearchEnter(() => { if (!blnSearchPanelFrozen) setDicSearchApplied(dicSearchDraft); })}
          aria-busy={blnSearchPanelFrozen}
          sx={{ alignItems: "center", "& .MuiButton-root": { alignSelf: "center" } }}
        >
          <TextField
            className="app-mui-text-field"
            id="allocation-entity-type-search-name"
            inputProps={{ controlId: "allocation-entity-type.list.search-name.input" }}
            label={t("table_name", "Type Name")}
            value={dicSearchDraft.strName}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strName: objEvent.target.value }))
            }
            placeholder={t("search_name_placeholder", "Search by Type Name")}
            size="small"
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }}
            disabled={blnSearchPanelFrozen}
            fullWidth
          />
          <TextField
            className="app-mui-text-field"
            id="allocation-entity-type-search-code"
            inputProps={{ controlId: "allocation-entity-type.list.search-code.input" }}
            label={t("table_code", "Type Code")}
            value={dicSearchDraft.strCode}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strCode: objEvent.target.value.toUpperCase() }))
            }
            placeholder={t("search_code_placeholder", "Search by Type Code")}
            size="small"
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }}
            disabled={blnSearchPanelFrozen}
            fullWidth
          />
          <TextField
            className="app-mui-text-field"
            id="allocation-entity-type-search-status"
            select
            inputProps={{ controlId: "allocation-entity-type.list.search-status.select" }}
            label={t("search_status_placeholder", "Status")}
            value={dicSearchDraft.strStatus}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({
                ...dicPrevious,
                strStatus: objEvent.target.value as SearchForm["strStatus"],
              }))
            }
            size="small"
            disabled={blnSearchPanelFrozen}
            fullWidth
          >
            <MenuItem value="All">{t("status_all", "All")}</MenuItem>
            <MenuItem value="Active">{t("status_active", "Active")}</MenuItem>
            <MenuItem value="Inactive">{t("status_inactive", "Inactive")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button
              data-control-id="allocation-entity-type.list.search.button"
              className={styles.primaryButton}
              startIcon={<SearchRoundedIcon />}
              onClick={() => setDicSearchApplied(dicSearchDraft)}
              disabled={blnSearchPanelFrozen}
            >
              {t("search", "Search")}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button
              data-control-id="allocation-entity-type.list.clear.button"
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicSearchDraft(dicEmptySearch);
                setDicSearchApplied(dicEmptySearch);
              }}
              disabled={blnSearchPanelFrozen}
            >
              {t("clear", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {(blnLoading || objAccess.blnLoading) && !blnDialogOpen ? (
          <AllocationGridSkeleton strControlId="allocation-entity-type.list.skeleton" intColumns={5} />
        ) : !blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
              {t("access_denied", "Allocation Entity Type access is not available for your user group.")}
            </Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            testIdPrefix="allocation-entity-type.list"
            showPaginationSummary
            hideRowClickHint
            onRowClick={(dicRow) => {
              if (objAccess.blnLoading || blnLoading || blnSubmitting || !blnCanView) return;
              const dicRecord = lstEntityTypes.find((dicItem) => String(dicItem.intID) === dicRow.id);
              if (dicRecord) openDialog(blnCanEdit ? "edit" : "view", dicRecord);
            }}
            emptyMessage={t("empty_message", "No Allocation Entity Types found.")}
            toolbarLeft={
              blnCanAdd ? (
                <Button
                  data-control-id="allocation-entity-type.list.add.button"
                  className={styles.primaryButton}
                  startIcon={<AddRoundedIcon />}
                  onClick={() => openDialog("add")}
                  disabled={blnLoading || blnSubmitting || objAccess.blnLoading}
                >
                  {t("add_button", "Add Allocation Entity Type")}
                </Button>
              ) : null
            }
            getRowSx={() => ({
              backgroundColor: "#fff",
              "&.MuiTableRow-hover:hover": { backgroundColor: "#f8fbff" },
              "&.MuiTableRow-hover:hover td:first-of-type .MuiLink-root": { textDecoration: "underline" },
            })}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        )}
        <BlockingLoader blnOpen={blnSubmitting} strLabel={t("processing", "Processing...")} intZIndex={1400} blnLocal />
      </Box>

      <CommonMasterDialog
        blnOpen={blnDialogOpen}
        onClose={() => setBlnDialogOpen(false)}
        onDialogClose={(_, strReason) => {
          if (strReason !== "backdropClick") setBlnDialogOpen(false);
        }}
        rootTestId="allocation-entity-type.dialog"
        cancelButtonTestId="allocation-entity-type.dialog.cancel.button"
        primaryButtonTestId="allocation-entity-type.dialog.save.button"
        strTitle={
          strMode === "add"
            ? t("dialog_add_title", "Add Allocation Entity Type")
            : strMode === "edit"
              ? t("dialog_edit_title", "Edit Allocation Entity Type")
              : t("dialog_view_title", "View Allocation Entity Type")
        }
        strSecondaryLabel={strMode === "view" ? t("close", "Close") : t("cancel", "Cancel")}
        strPrimaryLabel={blnSubmitting ? t("saving", "Saving...") : t("save", "Save")}
        onPrimaryAction={saveEntityType}
        blnPrimaryDisabled={blnSubmitting}
        blnHidePrimary={strMode === "view" || !(strMode === "add" ? blnCanAdd : blnCanEdit)}
        paperClassName={styles.departmentDialogPaper}
        maxWidth={false}
        fullWidth={false}
        paperSx={{ "& .MuiButton-root": { fontSize: "12px !important", fontWeight: "600 !important" } }}
        titleSx={{ px: 2.25, py: 1.25, fontSize: "16px", fontWeight: 700, maxHeight: 50 }}
        contentSx={{ overflowX: "hidden", overflowY: "auto", px: "20px", py: "12px", borderColor: "#e5edf5" }}
        nodeFooterStart={<Typography sx={{ color: "#64748b", fontSize: "11px" }}>{t("required_fields_hint", "Required fields are marked")} <Box component="span" sx={{ color: "#dc2626" }}>*</Box></Typography>}
        nodeTitleAction={
          <Box className={styles.switchRow} sx={{ minHeight: "auto", gap: 1, flexWrap: "nowrap" }}>
            <ActiveStatusSwitch
              testId="allocation-entity-type.dialog.active.switch"
              blnIsActive={dicForm.blnIsActive}
              disabled={strMode === "view"}
              sx={dicActiveSwitchSx}
              onChange={(blnChecked) => setDicForm((dicPrevious) => ({ ...dicPrevious, blnIsActive: blnChecked }))}
            />
            <Typography className={styles.switchLabel} sx={{ fontSize: "12px !important", fontWeight: "600 !important", whiteSpace: "nowrap" }}>
              {t("status_active", "Active")}
            </Typography>
            <IconButton aria-label={t("close", "Close")} onClick={() => setBlnDialogOpen(false)} size="small" sx={{ ml: 1, color: "#94a3b8" }}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Box>
        }
        nodeContent={
          <Box sx={{ display: "grid", gap: "12px" }}>
            <Box
              sx={{
                display: "grid",
                columnGap: 1.6,
                rowGap: "12px",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                alignItems: "start",
              }}
            >
              {strMode === "add" ? (
                <Box sx={{ gridColumn: "1 / -1" }}>
                  <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{t("basic_information", "Basic Information")}</Typography>
                  <Typography sx={{ fontSize: "11px", color: "#64748b", mt: 0.25, mb: 1 }}>
                    {t("basic_information_help", "Create a new allocation entity type.")}
                  </Typography>
                </Box>
              ) : null}
              <TextField
                className="app-mui-text-field"
                ref={objNameRef}
                label={t("field_name", "Type Name")}
                placeholder={t("dialog_name_placeholder", "Enter type name")}
                size="small"
                required
                autoFocus={strMode !== "view"}
                value={dicForm.strTypeName}
                inputProps={{ controlId: "allocation-entity-type.dialog.name.input" }}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value;
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, strTypeName: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, strTypeName: strValue }));
                }}
                error={Boolean(dicErrors.strTypeName)}
                helperText={dicErrors.strTypeName}
                fullWidth
              />
              <TextField
                className="app-mui-text-field"
                ref={objCodeRef}
                label={t("field_code", "Type Code")}
                placeholder={t("dialog_code_placeholder", "Enter type code")}
                size="small"
                required
                value={dicForm.strTypeCode}
                inputProps={{ controlId: "allocation-entity-type.dialog.code.input" }}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value.toUpperCase();
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, strTypeCode: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, strTypeCode: strValue }));
                }}
                error={Boolean(dicErrors.strTypeCode)}
                helperText={dicErrors.strTypeCode}
                fullWidth
              />
              <Box sx={{ gridColumn: "1 / -1" }}>
                <TextField
                  className="app-mui-text-field"
                  label={t("field_description", "Description")}
                  size="small"
                  value={dicForm.strDescription}
                  inputProps={{ controlId: "allocation-entity-type.dialog.description.input" }}
                  disabled={strMode === "view"}
                  onChange={(objEvent) =>
                    setDicForm((dicPrevious) => ({ ...dicPrevious, strDescription: objEvent.target.value }))
                  }
                  multiline
                  minRows={2}
                  fullWidth
                />
              </Box>
              <TextField
                className="app-mui-text-field"
                label={t("field_display_order", "Display Order")}
                type="number"
                size="small"
                value={dicForm.strDisplayOrder}
                inputProps={{ controlId: "allocation-entity-type.dialog.display-order.input", min: 0 }}
                disabled={strMode === "view"}
                onChange={(objEvent) =>
                  setDicForm((dicPrevious) => ({ ...dicPrevious, strDisplayOrder: objEvent.target.value }))
                }
                fullWidth
              />
            </Box>
          </Box>
        }
      />

      <Snackbar
        open={objToast.blnOpen}
        autoHideDuration={3500}
        onClose={() => setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }))}
          severity={objToast.strSeverity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
