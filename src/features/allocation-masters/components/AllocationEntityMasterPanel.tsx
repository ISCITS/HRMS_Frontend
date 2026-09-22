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
  createInitialAllocationEntityForm,
  toAllocationEntityFormValues,
  type AllocationEntityApiRecord,
  type AllocationEntityFormValues,
  type AllocationEntityTypeApiRecord,
} from "@/features/allocation-masters/services/allocationMasterService";

type PanelMode = "add" | "edit" | "view";

type SearchForm = {
  strCode: string;
  strName: string;
  intAllocationEntityTypeID: number | "";
  strStatus: "All" | "Active" | "Inactive";
};

type ToastState = {
  blnOpen: boolean;
  strMessage: string;
  strSeverity: "success" | "error";
};

type FormErrorKey = "intAllocationEntityTypeID" | "strEntityCode" | "strEntityName" | "dtEffectiveTo";

const lstEntityModuleCodes = ["ALLOCATION_ENTITY", "ALLOCATION_ENTITIES", "MASTER_ALLOCATION_ENTITY"];

const dicEmptySearch: SearchForm = {
  strCode: "",
  strName: "",
  intAllocationEntityTypeID: "",
  strStatus: "All",
};

// Allocation Entity master (e.g. RPL / AZAD / SEC58 under the "Unit" entity type) - the
// buckets an employee's Allocation-Based component entitlement is split across.
export default function AllocationEntityMasterPanel() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("allocation-entity", "Unable to load Allocation Entity labels.");
  const objAccess = useModuleActionAccess(lstEntityModuleCodes);

  const [lstEntities, setLstEntities] = useState<AllocationEntityApiRecord[]>([]);
  const [lstEntityTypes, setLstEntityTypes] = useState<AllocationEntityTypeApiRecord[]>([]);
  const [strMode, setStrMode] = useState<PanelMode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [intEditingID, setIntEditingID] = useState<number | null>(null);
  const [dicForm, setDicForm] = useState<AllocationEntityFormValues>(createInitialAllocationEntityForm());
  const [dicErrors, setDicErrors] = useState<Partial<Record<FormErrorKey, string>>>({});
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

  const dicEntityTypeNameByID = useMemo(() => {
    const dicMap: Record<number, string> = {};
    for (const dicType of lstEntityTypes) {
      dicMap[dicType.intID] = dicType.strTypeName;
    }
    return dicMap;
  }, [lstEntityTypes]);

  async function loadEntities() {
    if (!blnCanView) {
      setLstEntities([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      const lstRecords = await allocationMasterService.listEntities(null, false);
      setLstEntities(lstRecords);
    } catch (objError) {
      showToast(
        objError instanceof Error ? objError.message : t("request_failed", "Unable to load Allocation Entities."),
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
    void loadEntities();
    // The Allocation Entity Type dropdown only ever offers active types, but the grid still
    // resolves names for entities pointing at a now-inactive type, so both lists are loaded.
    allocationMasterService
      .listEntityTypes(false)
      .then((lstRecords) => setLstEntityTypes(lstRecords))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objAccess.blnLoading]);

  const lstActiveEntityTypes = useMemo(
    () => lstEntityTypes.filter((dicType) => dicType.blnIsActive),
    [lstEntityTypes],
  );

  const lstFiltered = useMemo(
    () =>
      lstEntities.filter((dicRecord) => {
        const blnCodeMatch =
          !dicSearchApplied.strCode ||
          dicRecord.strEntityCode.toLowerCase().includes(dicSearchApplied.strCode.toLowerCase());
        const blnNameMatch =
          !dicSearchApplied.strName ||
          dicRecord.strEntityName.toLowerCase().includes(dicSearchApplied.strName.toLowerCase());
        const blnTypeMatch =
          dicSearchApplied.intAllocationEntityTypeID === "" ||
          dicRecord.intAllocationEntityTypeID === dicSearchApplied.intAllocationEntityTypeID;
        const blnStatusMatch =
          dicSearchApplied.strStatus === "All" ||
          (dicSearchApplied.strStatus === "Active" ? dicRecord.blnIsActive : !dicRecord.blnIsActive);
        return blnCodeMatch && blnNameMatch && blnTypeMatch && blnStatusMatch;
      }),
    [dicSearchApplied, lstEntities],
  );

  function openDialog(strNextMode: PanelMode, dicRecord?: AllocationEntityApiRecord) {
    setStrMode(strNextMode);
    setDicErrors({});
    setIntEditingID(dicRecord?.intID ?? null);
    setDicForm(dicRecord ? toAllocationEntityFormValues(dicRecord) : createInitialAllocationEntityForm());
    setBlnDialogOpen(true);
  }

  function validateForm() {
    const dicNextErrors: Partial<Record<FormErrorKey, string>> = {};
    const strCode = dicForm.strEntityCode.trim().toUpperCase();
    const strName = dicForm.strEntityName.trim();

    if (dicForm.intAllocationEntityTypeID === "") {
      dicNextErrors.intAllocationEntityTypeID = t(
        "validation_entity_type_required",
        "Allocation Entity Type is required.",
      );
    }

    if (!strCode) {
      dicNextErrors.strEntityCode = t("validation_code_required", "Entity Code is required.");
    } else if (!/^[A-Z0-9_-]{2,50}$/.test(strCode)) {
      dicNextErrors.strEntityCode = t(
        "validation_code_format",
        "Entity Code must be 2-50 characters (A-Z, 0-9, hyphen or underscore).",
      );
    } else if (
      lstEntities.some(
        (dicRecord) =>
          dicRecord.strEntityCode.toUpperCase() === strCode &&
          dicRecord.intAllocationEntityTypeID === Number(dicForm.intAllocationEntityTypeID) &&
          dicRecord.intID !== intEditingID,
      )
    ) {
      dicNextErrors.strEntityCode = t(
        "validation_code_duplicate",
        "This Entity Code already exists for the selected Allocation Entity Type.",
      );
    }

    if (!strName) {
      dicNextErrors.strEntityName = t("validation_name_required", "Entity Name is required.");
    }

    // Mirrors the backend clsAllocationEntityRequestSchema.validateEntity date check.
    if (
      dicForm.dtEffectiveFrom &&
      dicForm.dtEffectiveTo &&
      dicForm.dtEffectiveTo < dicForm.dtEffectiveFrom
    ) {
      dicNextErrors.dtEffectiveTo = t(
        "validation_effective_to",
        "Effective To date cannot be before Effective From date.",
      );
    }

    setDicErrors(dicNextErrors);
    return Object.keys(dicNextErrors).length === 0;
  }

  async function saveEntity() {
    if (!validateForm()) {
      return;
    }
    setBlnSubmitting(true);
    try {
      if (strMode === "add") {
        await allocationMasterService.createEntity(dicForm);
      } else if (intEditingID) {
        await allocationMasterService.updateEntity(intEditingID, dicForm);
      }
      await loadEntities();
      setBlnDialogOpen(false);
      showToast(
        strMode === "add"
          ? t("save_success", "Allocation Entity created successfully.")
          : t("update_success", "Allocation Entity updated successfully."),
      );
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : t("request_failed", "Request failed."), "error");
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
            testIdPrefix="allocation-entity.list.row"
            rowKey={dicRecord.intID}
            blnCanView={blnCanView}
            blnCanEdit={blnCanEdit}
            onView={() => openDialog("view", dicRecord)}
            onEdit={() => openDialog("edit", dicRecord)}
          />
        ),
        strEntityCode: dicRecord.strEntityCode,
        strEntityName: dicRecord.strEntityName,
        strEntityTypeName: dicEntityTypeNameByID[dicRecord.intAllocationEntityTypeID] ?? "-",
        strExternalReference: dicRecord.strExternalReference ?? "-",
        dtEffectiveFrom: dicRecord.dtEffectiveFrom ?? "-",
        dtEffectiveTo: dicRecord.dtEffectiveTo ?? "-",
        strStatus: (
          <span
            className={`${styles.statusPill} ${dicRecord.blnIsActive ? styles.statusActive : styles.statusInactive}`}
          >
            {dicRecord.blnIsActive ? t("status_active", "Active") : t("status_inactive", "Inactive")}
          </span>
        ),
      })),
    [blnCanEdit, blnCanView, dicEntityTypeNameByID, lstFiltered, t],
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
      { field: "strEntityCode", headerName: t("table_code", "Entity Code") },
      { field: "strEntityName", headerName: t("table_name", "Entity Name") },
      { field: "strEntityTypeName", headerName: t("table_entity_type", "Entity Type") },
      { field: "strExternalReference", headerName: t("table_external_reference", "External Reference") },
      { field: "dtEffectiveFrom", headerName: t("table_effective_from", "Effective From"), width: 140 },
      { field: "dtEffectiveTo", headerName: t("table_effective_to", "Effective To"), width: 140 },
      { field: "strStatus", headerName: t("table_status", "Status"), sortable: false, filterable: false, width: 130 },
    ],
    [t],
  );

  return (
    <Box className={styles.page} sx={{ position: "relative" }}>
      <Box className={styles.topBar}>
        <Button
          data-control-id="allocation-entity.list.back.button"
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
            {t("read_only_mode", "You have view-only access for Allocation Entities.")}
          </Typography>
        ) : null}

        <Box className={styles.allocationEntitySearchRow}>
          <TextField
            inputProps={{ controlId: "allocation-entity.list.search-name.input" }}
            value={dicSearchDraft.strName}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strName: objEvent.target.value }))
            }
            placeholder={t("search_name_placeholder", "Search by Entity Name")}
            fullWidth
          />
          <TextField
            inputProps={{ controlId: "allocation-entity.list.search-code.input" }}
            value={dicSearchDraft.strCode}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strCode: objEvent.target.value.toUpperCase() }))
            }
            placeholder={t("search_code_placeholder", "Search by Entity Code")}
            fullWidth
          />
          <TextField
            select
            inputProps={{ controlId: "allocation-entity.list.search-entity-type.select" }}
            label={t("field_entity_type", "Allocation Entity Type")}
            value={dicSearchDraft.intAllocationEntityTypeID}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({
                ...dicPrevious,
                intAllocationEntityTypeID:
                  objEvent.target.value === "" ? "" : Number(objEvent.target.value),
              }))
            }
            fullWidth
          >
            <MenuItem value="">{t("status_all", "All")}</MenuItem>
            {lstEntityTypes.map((dicType) => (
              <MenuItem key={dicType.intID} value={dicType.intID}>
                {dicType.strTypeName}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            inputProps={{ controlId: "allocation-entity.list.search-status.select" }}
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
              data-control-id="allocation-entity.list.search.button"
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
              data-control-id="allocation-entity.list.clear.button"
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
              {t("access_denied", "Allocation Entity access is not available for your user group.")}
            </Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            testIdPrefix="allocation-entity.list"
            showPaginationSummary
            emptyMessage={t("empty_message", "No Allocation Entities found.")}
            toolbarLeft={
              blnCanAdd ? (
                <Button
                  data-control-id="allocation-entity.list.add.button"
                  className={styles.primaryButton}
                  startIcon={<AddRoundedIcon />}
                  onClick={() => openDialog("add")}
                  disabled={blnLoading || blnSubmitting || objAccess.blnLoading}
                >
                  {t("add_button", "Add Allocation Entity")}
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
        rootTestId="allocation-entity.dialog"
        cancelButtonTestId="allocation-entity.dialog.cancel.button"
        primaryButtonTestId="allocation-entity.dialog.save.button"
        maxWidth="md"
        strTitle={
          strMode === "add"
            ? t("dialog_add_title", "Add Allocation Entity")
            : strMode === "edit"
              ? t("dialog_edit_title", "Edit Allocation Entity")
              : t("dialog_view_title", "View Allocation Entity")
        }
        strSecondaryLabel={strMode === "view" ? t("close", "Close") : t("cancel", "Cancel")}
        strPrimaryLabel={blnSubmitting ? t("saving", "Saving...") : t("save", "Save")}
        onPrimaryAction={saveEntity}
        blnPrimaryDisabled={blnSubmitting}
        blnHidePrimary={strMode === "view" || !(strMode === "add" ? blnCanAdd : blnCanEdit)}
        nodeTitleAction={
          <Box className={styles.switchRow} sx={{ minHeight: "auto", gap: 1, flexWrap: "nowrap" }}>
            <Typography className={styles.switchLabel} sx={{ fontSize: "0.95rem", whiteSpace: "nowrap" }}>
              {t("field_is_active", "Is Active")}
            </Typography>
            <ActiveStatusSwitch
              testId="allocation-entity.dialog.active.switch"
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
                select
                label={t("field_entity_type", "Allocation Entity Type")}
                required
                value={dicForm.intAllocationEntityTypeID}
                inputProps={{ controlId: "allocation-entity.dialog.entity-type.select" }}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const objValue = objEvent.target.value;
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, intAllocationEntityTypeID: undefined }));
                  setDicForm((dicPrevious) => ({
                    ...dicPrevious,
                    intAllocationEntityTypeID: objValue === "" ? "" : Number(objValue),
                  }));
                }}
                error={Boolean(dicErrors.intAllocationEntityTypeID)}
                helperText={dicErrors.intAllocationEntityTypeID}
                sx={{ "& .MuiFormLabel-asterisk": { color: "#dc2626" } }}
                fullWidth
              >
                {lstActiveEntityTypes.map((dicType) => (
                  <MenuItem key={dicType.intID} value={dicType.intID}>
                    {`${dicType.strTypeName} (${dicType.strTypeCode})`}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label={t("field_external_reference", "External Reference")}
                value={dicForm.strExternalReference}
                inputProps={{ controlId: "allocation-entity.dialog.external-reference.input" }}
                disabled={strMode === "view"}
                onChange={(objEvent) =>
                  setDicForm((dicPrevious) => ({ ...dicPrevious, strExternalReference: objEvent.target.value }))
                }
                fullWidth
              />
              <TextField
                label={t("field_name", "Entity Name")}
                required
                value={dicForm.strEntityName}
                inputProps={{ controlId: "allocation-entity.dialog.name.input" }}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value;
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, strEntityName: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, strEntityName: strValue }));
                }}
                error={Boolean(dicErrors.strEntityName)}
                helperText={dicErrors.strEntityName}
                sx={{ "& .MuiFormLabel-asterisk": { color: "#dc2626" } }}
                fullWidth
              />
              <TextField
                label={t("field_code", "Entity Code")}
                required
                value={dicForm.strEntityCode}
                inputProps={{ controlId: "allocation-entity.dialog.code.input" }}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value.toUpperCase();
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, strEntityCode: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, strEntityCode: strValue }));
                }}
                error={Boolean(dicErrors.strEntityCode)}
                helperText={dicErrors.strEntityCode}
                sx={{ "& .MuiFormLabel-asterisk": { color: "#dc2626" } }}
                fullWidth
              />
              <TextField
                label={t("field_effective_from", "Effective From")}
                type="date"
                value={dicForm.dtEffectiveFrom}
                inputProps={{ controlId: "allocation-entity.dialog.effective-from.input" }}
                InputLabelProps={{ shrink: true }}
                disabled={strMode === "view"}
                onChange={(objEvent) =>
                  setDicForm((dicPrevious) => ({ ...dicPrevious, dtEffectiveFrom: objEvent.target.value }))
                }
                fullWidth
              />
              <TextField
                label={t("field_effective_to", "Effective To")}
                type="date"
                value={dicForm.dtEffectiveTo}
                inputProps={{ controlId: "allocation-entity.dialog.effective-to.input" }}
                InputLabelProps={{ shrink: true }}
                disabled={strMode === "view"}
                onChange={(objEvent) => {
                  const strValue = objEvent.target.value;
                  setDicErrors((dicPrevious) => ({ ...dicPrevious, dtEffectiveTo: undefined }));
                  setDicForm((dicPrevious) => ({ ...dicPrevious, dtEffectiveTo: strValue }));
                }}
                error={Boolean(dicErrors.dtEffectiveTo)}
                helperText={dicErrors.dtEffectiveTo}
                fullWidth
              />
            </Box>
            <TextField
              label={t("field_description", "Description")}
              value={dicForm.strDescription}
              inputProps={{ controlId: "allocation-entity.dialog.description.input" }}
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
              inputProps={{ controlId: "allocation-entity.dialog.display-order.input", min: 0 }}
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
