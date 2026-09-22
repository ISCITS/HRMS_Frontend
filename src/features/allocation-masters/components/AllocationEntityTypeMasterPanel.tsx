"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, MenuItem, Snackbar, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import CommonMasterDialog from "@/Common/components/CommonMasterDialog";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
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
  const objRouter = useRouter();
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
        action: (
          <CommonRowActions
            testIdPrefix="allocation-entity-type.list.row"
            rowKey={dicRecord.intID}
            blnCanView={blnCanView}
            blnCanEdit={blnCanEdit}
            onView={() => openDialog("view", dicRecord)}
            onEdit={() => openDialog("edit", dicRecord)}
          />
        ),
        strTypeCode: dicRecord.strTypeCode,
        strTypeName: dicRecord.strTypeName,
        strDescription: dicRecord.strDescription ?? "-",
        intDisplayOrder: dicRecord.intDisplayOrder,
        strStatus: (
          <span
            className={`${styles.statusPill} ${dicRecord.blnIsActive ? styles.statusActive : styles.statusInactive}`}
          >
            {dicRecord.blnIsActive ? t("status_active", "Active") : t("status_inactive", "Inactive")}
          </span>
        ),
      })),
    [blnCanEdit, blnCanView, lstFiltered, t],
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      {
        field: "action",
        headerName: t("table_actions", "Actions"),
        sortable: false,
        filterable: false,
        exportable: false,
        width: 130,
      },
      { field: "strTypeCode", headerName: t("table_code", "Type Code") },
      { field: "strTypeName", headerName: t("table_name", "Type Name") },
      { field: "strDescription", headerName: t("table_description", "Description") },
      { field: "intDisplayOrder", headerName: t("table_display_order", "Display Order"), width: 130 },
      { field: "strStatus", headerName: t("table_status", "Status"), sortable: false, filterable: false, width: 130 },
    ],
    [t],
  );

  return (
    <Box className={styles.page} sx={{ position: "relative" }}>
      <Box className={styles.topBar}>
        <Button
          data-control-id="allocation-entity-type.list.back.button"
          className={styles.backButton}
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => objRouter.back()}
        >
          {t("back_button", "Back")}
        </Button>
      </Box>

      <Box className={styles.controlsCard}>
        {objAccess.strError ? (
          <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{objAccess.strError}</Typography>
        ) : null}
        {!objAccess.blnLoading && blnCanView && objAccess.isReadOnly() ? (
          <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>
            {t("read_only_mode", "You have view-only access for Allocation Entity Types.")}
          </Typography>
        ) : null}

        <Box className={styles.searchRow}>
          <TextField
            inputProps={{ controlId: "allocation-entity-type.list.search-name.input" }}
            value={dicSearchDraft.strName}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strName: objEvent.target.value }))
            }
            placeholder={t("search_name_placeholder", "Search by Type Name")}
            fullWidth
          />
          <TextField
            inputProps={{ controlId: "allocation-entity-type.list.search-code.input" }}
            value={dicSearchDraft.strCode}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strCode: objEvent.target.value.toUpperCase() }))
            }
            placeholder={t("search_code_placeholder", "Search by Type Code")}
            fullWidth
          />
          <TextField
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
              disabled={blnLoading || blnSubmitting}
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
              disabled={blnLoading || blnSubmitting}
            >
              {t("clear", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard}>
        {!blnCanView && !objAccess.blnLoading && !blnLoading ? (
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
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        )}
      </Box>

      <CommonMasterDialog
        blnOpen={blnDialogOpen}
        onClose={() => setBlnDialogOpen(false)}
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
        nodeTitleAction={
          <Box className={styles.switchRow} sx={{ minHeight: "auto", gap: 1, flexWrap: "nowrap" }}>
            <Typography className={styles.switchLabel} sx={{ fontSize: "0.95rem", whiteSpace: "nowrap" }}>
              {t("field_is_active", "Is Active")}
            </Typography>
            <ActiveStatusSwitch
              testId="allocation-entity-type.dialog.active.switch"
              blnIsActive={dicForm.blnIsActive}
              disabled={strMode === "view"}
              onChange={(blnChecked) => setDicForm((dicPrevious) => ({ ...dicPrevious, blnIsActive: blnChecked }))}
            />
          </Box>
        }
        nodeContent={
          <Box sx={{ display: "grid", gap: 2, pt: 0.5 }}>
            <Box
              sx={{
                display: "grid",
                gap: 1.6,
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                alignItems: "start",
              }}
            >
              <TextField
                label={t("field_name", "Type Name")}
                required
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
                sx={{ "& .MuiFormLabel-asterisk": { color: "#dc2626" } }}
                fullWidth
              />
              <TextField
                label={t("field_code", "Type Code")}
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
                sx={{ "& .MuiFormLabel-asterisk": { color: "#dc2626" } }}
                fullWidth
              />
            </Box>
            <TextField
              label={t("field_description", "Description")}
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
            <TextField
              label={t("field_display_order", "Display Order")}
              type="number"
              value={dicForm.strDisplayOrder}
              inputProps={{ controlId: "allocation-entity-type.dialog.display-order.input", min: 0 }}
              disabled={strMode === "view"}
              onChange={(objEvent) =>
                setDicForm((dicPrevious) => ({ ...dicPrevious, strDisplayOrder: objEvent.target.value }))
              }
              sx={{ maxWidth: 220 }}
            />
          </Box>
        }
      />

      <BlockingLoader
        blnOpen={blnSubmitting || ((blnLoading || objAccess.blnLoading) && !blnDialogOpen)}
        strLabel={blnLoading || objAccess.blnLoading ? t("loading", "Loading...") : t("processing", "Processing...")}
        intZIndex={1400}
        blnLocal
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
