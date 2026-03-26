"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ToggleOnRoundedIcon from "@mui/icons-material/ToggleOnRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Pagination,
  Snackbar,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import dicConstant from "@/constants/Constant.json";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { LocationApiRecord, LocationFormOptionsApiRecord, masterApiService } from "@/services/master/MasterApiService";

type LocationStatus = "Active" | "Inactive";
type LocationMode = "add" | "edit" | "view";

type LocationRecord = {
  id: string;
  code: string;
  name: string;
  intStateID: number | "";
  strStateName: string;
  strCityName: string;
  status: LocationStatus;
};

type LocationForm = {
  code: string;
  name: string;
  intStateID: number | "";
  strCityName: string;
  status: LocationStatus;
};

type SearchForm = {
  code: string;
  name: string;
  status: "All" | LocationStatus;
};

type ConfirmDialogState = {
  strTitle: string;
  strMessage: string;
  strConfirmLabel: string;
  fnOnConfirm: () => Promise<void>;
};

type ToastState = {
  blnOpen: boolean;
  strMessage: string;
  strSeverity: "success" | "error";
};

const dicEmptyForm: LocationForm = { code: "", name: "", intStateID: "", strCityName: "", status: "Active" };
const dicEmptySearch: SearchForm = { code: "", name: "", status: "All" };
const lstRowsPerPageOptions = [10, 20, 50];

function mapLocationRecord(dicRecord: LocationApiRecord): LocationRecord {
  return {
    id: String(dicRecord.intID),
    code: dicRecord.strLocationCode,
    name: dicRecord.strLocationName,
    intStateID: dicRecord.intStateID ?? "",
    strStateName: dicRecord.strStateName ?? "",
    strCityName: dicRecord.strCityName ?? "",
    status: dicRecord.blnIsActive ? "Active" : "Inactive"
  };
}

function downloadCsv(strFileName: string, lstRows: LocationRecord[]) {
  const lstHeaders = ["Location Name", "Location Code", "State", "City", "Status"];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) =>
      [dicRow.name, dicRow.code, dicRow.strStateName, dicRow.strCityName, dicRow.status]
        .map((strValue) => `"${String(strValue).replace(/"/g, '""')}"`)
        .join(",")
    )
  ];
  const objBlob = new Blob([lstLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const strUrl = URL.createObjectURL(objBlob);
  const objLink = document.createElement("a");
  objLink.href = strUrl;
  objLink.download = strFileName;
  objLink.click();
  URL.revokeObjectURL(strUrl);
}

function exportPdf(strTitle: string, lstRows: LocationRecord[]) {
  const objWindow = window.open("", "_blank", "width=1200,height=800");
  if (!objWindow) {
    return;
  }

  const strRows = lstRows.map((dicRow) => `
    <tr>
      <td>${dicRow.name}</td>
      <td>${dicRow.code}</td>
      <td>${dicRow.strStateName}</td>
      <td>${dicRow.strCityName}</td>
      <td>${dicRow.status}</td>
    </tr>
  `).join("");

  objWindow.document.write(`
    <html>
      <head>
        <title>${strTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
          th { background: #e2e8f0; }
        </style>
      </head>
      <body>
        <h1>${strTitle}</h1>
        <table>
          <thead>
            <tr>
              <th>Location Name</th>
              <th>Location Code</th>
              <th>State</th>
              <th>City</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${strRows}</tbody>
        </table>
      </body>
    </html>
  `);
  objWindow.document.close();
  objWindow.focus();
  objWindow.print();
}

export default function LocationMasterPanel() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("location");
  const [lstLocations, setLstLocations] = useState<LocationRecord[]>([]);
  const [objFormOptions, setObjFormOptions] = useState<LocationFormOptionsApiRecord | null>(null);
  const [strMode, setStrMode] = useState<LocationMode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strEditingLocationId, setStrEditingLocationId] = useState("");
  const [dicForm, setDicForm] = useState<LocationForm>(dicEmptyForm);
  const [dicErrors, setDicErrors] = useState<Partial<Record<keyof LocationForm, string>>>({});
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [lstSelectedIds, setLstSelectedIds] = useState<string[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  const dicCommonLabels = {
    cancel: t("cancel", dicConstant.common.cancel),
    clear: t("clear", dicConstant.common.clear),
    exportExcel: t("export_excel", dicConstant.common.exportExcel),
    exportPdf: t("export_pdf", dicConstant.common.exportPdf),
    search: t("search", dicConstant.common.search),
    statusActive: t("status_active", dicConstant.common.statusActive),
    statusInactive: t("status_inactive", dicConstant.common.statusInactive),
    rowsPerPage: t("rows_per_page", dicConstant.common.rowsPerPage),
    paginationSeparator: t("pagination_separator", dicConstant.common.paginationSeparator),
    loading: t("loading", "Loading..."),
    processing: t("processing", "Processing..."),
  };
  const dicModuleLabels = {
    breadcrumbs: t("breadcrumbs", "Admin / Master / Locations"),
    pageTitle: t("page_title", dicConstant.locations.pageTitle),
    backButton: t("back_button", dicConstant.locations.backButton),
    addButton: t("add_button", dicConstant.locations.addButton),
    searchNamePlaceholder: t("search_name_placeholder", "Search Location Name"),
    searchCodePlaceholder: t("search_code_placeholder", "Search Location Code"),
    searchStatusPlaceholder: t("search_status_placeholder", "Status"),
    tableName: t("table_name", "Location Name"),
    tableCode: t("table_code", "Location Code"),
    tableState: t("table_state", "State"),
    tableCity: t("table_city", "City"),
    tableStatus: t("table_status", "Status"),
    tableActions: t("table_actions", "Actions"),
    loadingRecords: t("loading_records", "Loading locations..."),
    emptyMessage: t("empty_message", "No location records found."),
  };

  async function loadLocations() {
    setBlnLoading(true);
    try {
      const [objListResult, objOptionResult] = await Promise.all([
        masterApiService.getLocations(),
        masterApiService.getLocationFormOptions()
      ]);
      setLstLocations(objListResult.Data.map(mapLocationRecord));
      setObjFormOptions(objOptionResult.Data);
      setLstSelectedIds([]);
      setIntPage(1);
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    loadLocations().catch(() => undefined);
  }, []);

  const lstFilteredLocations = useMemo(() => lstLocations.filter((dicLocation) => {
    const blnCodeMatch = !dicSearchApplied.code || dicLocation.code.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
    const blnNameMatch = !dicSearchApplied.name || dicLocation.name.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
    const blnStatusMatch = dicSearchApplied.status === "All" || dicLocation.status === dicSearchApplied.status;
    return blnCodeMatch && blnNameMatch && blnStatusMatch;
  }), [dicSearchApplied, lstLocations]);

  const intPageCount = Math.max(1, Math.ceil(lstFilteredLocations.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleLocations = lstFilteredLocations.slice(intStartIndex, intStartIndex + intRowsPerPage);
  const blnAllVisibleSelected = lstVisibleLocations.length > 0 && lstVisibleLocations.every((dicLocation) => lstSelectedIds.includes(dicLocation.id));
  const blnSomeVisibleSelected = !blnAllVisibleSelected && lstSelectedIds.some((strId) => lstVisibleLocations.some((dicLocation) => dicLocation.id === strId));

  function openDialog(strNextMode: LocationMode, dicLocation?: LocationRecord) {
    setStrMode(strNextMode);
    setStrEditingLocationId(dicLocation?.id ?? "");
    setDicErrors({});
    setDicForm(dicLocation ? {
      code: dicLocation.code,
      name: dicLocation.name,
      intStateID: dicLocation.intStateID,
      strCityName: dicLocation.strCityName,
      status: dicLocation.status
    } : dicEmptyForm);
    setBlnDialogOpen(true);
  }

  function closeDialog() {
    setBlnDialogOpen(false);
  }

  function showToast(strMessage: string, strSeverity: ToastState["strSeverity"] = "success") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  function closeToast() {
    setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }));
  }

  function openConfirmDialog(objDialog: ConfirmDialogState) {
    setObjConfirmDialog(objDialog);
  }

  function closeConfirmDialog() {
    setObjConfirmDialog(null);
  }

  async function executeConfirmedAction() {
    if (!objConfirmDialog) {
      return;
    }
    setBlnSubmitting(true);
    try {
      await objConfirmDialog.fnOnConfirm();
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : "Request failed.", "error");
    } finally {
      setBlnSubmitting(false);
      closeConfirmDialog();
    }
  }

  function validateForm() {
    const dicNextErrors: Partial<Record<keyof LocationForm, string>> = {};
    const strCode = dicForm.code.trim().toUpperCase();
    const strName = dicForm.name.trim();
    const strCityName = dicForm.strCityName.trim();

    if (!strName) {
      dicNextErrors.name = dicConstant.locations.validation.nameRequired;
    } else if (strName.length < 3) {
      dicNextErrors.name = dicConstant.locations.validation.nameMin;
    }

    if (!strCode) {
      dicNextErrors.code = dicConstant.locations.validation.codeRequired;
    } else if (!/^[A-Z0-9/& _.-]{2,50}$/.test(strCode)) {
      dicNextErrors.code = dicConstant.locations.validation.codeFormat;
    }

    if (strCityName.length > 100) {
      dicNextErrors.strCityName = dicConstant.locations.validation.cityMax;
    }

    if (lstLocations.some((dicLocation) => dicLocation.code.toUpperCase() === strCode && dicLocation.id !== strEditingLocationId)) {
      dicNextErrors.code = dicConstant.locations.validation.codeDuplicate;
    }

    if (lstLocations.some((dicLocation) => dicLocation.name.trim().toLowerCase() === strName.toLowerCase() && dicLocation.id !== strEditingLocationId)) {
      dicNextErrors.name = dicConstant.locations.validation.nameDuplicate;
    }

    setDicErrors(dicNextErrors);
    return Object.keys(dicNextErrors).length === 0;
  }

  function saveLocation() {
    if (!validateForm()) {
      return;
    }

    const objBody = {
      strLocationCode: dicForm.code.trim().toUpperCase(),
      strLocationName: dicForm.name.trim(),
      intStateID: dicForm.intStateID === "" ? null : Number(dicForm.intStateID),
      strCityName: dicForm.strCityName.trim() || null,
      blnIsActive: dicForm.status === "Active"
    };
    const objRequest = strMode === "add"
      ? masterApiService.createLocation(objBody)
      : masterApiService.updateLocation(Number(strEditingLocationId), objBody);

    setBlnSubmitting(true);
    objRequest
      .then(() => loadLocations())
      .then(() => {
        closeDialog();
        showToast(strMode === "add" ? "Location saved successfully." : "Location updated successfully.");
      })
      .catch((objError) => showToast(objError instanceof Error ? objError.message : "Request failed.", "error"))
      .finally(() => setBlnSubmitting(false));
  }

  function toggleSelection(strLocationId: string) {
    setLstSelectedIds((lstPrevious) => lstPrevious.includes(strLocationId)
      ? lstPrevious.filter((strId) => strId !== strLocationId)
      : [...lstPrevious, strLocationId]);
  }

  function toggleSelectAll() {
    if (blnAllVisibleSelected) {
      setLstSelectedIds((lstPrevious) => lstPrevious.filter((strId) => !lstVisibleLocations.some((dicLocation) => dicLocation.id === strId)));
      return;
    }
    setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstVisibleLocations.map((dicLocation) => dicLocation.id)])]);
  }

  function bulkUpdateStatus(strStatus: LocationStatus) {
    openConfirmDialog({
      strTitle: `${strStatus === "Active" ? "Bulk Activate" : "Bulk Deactivate"} Locations`,
      strMessage: `Are you sure you want to mark ${lstSelectedIds.length} selected location record(s) as ${strStatus.toLowerCase()}?`,
      strConfirmLabel: strStatus === "Active" ? "Bulk Activate" : "Bulk Deactivate",
      fnOnConfirm: async () => {
        await masterApiService.bulkLocationStatus(lstSelectedIds.map(Number), strStatus === "Active");
        await loadLocations();
        showToast(strStatus === "Active" ? "Selected location records activated successfully." : "Selected location records deactivated successfully.");
      }
    });
  }

  function bulkDelete() {
    openConfirmDialog({
      strTitle: "Bulk Delete Locations",
      strMessage: `Are you sure you want to delete ${lstSelectedIds.length} selected location record(s)?`,
      strConfirmLabel: "Bulk Delete",
      fnOnConfirm: async () => {
        await masterApiService.bulkLocationDelete(lstSelectedIds.map(Number));
        await loadLocations();
        showToast("Selected location records deleted successfully.");
      }
    });
  }

  function deleteLocation(strLocationId: string) {
    openConfirmDialog({
      strTitle: "Delete Location",
      strMessage: "Are you sure you want to delete this location record?",
      strConfirmLabel: "Delete",
      fnOnConfirm: async () => {
        await masterApiService.bulkLocationDelete([Number(strLocationId)]);
        await loadLocations();
        showToast("Location deleted successfully.");
      }
    });
  }

  function toggleLocationStatus(strLocationId: string) {
    const objLocation = lstLocations.find((dicItem) => dicItem.id === strLocationId);
    if (!objLocation) {
      return;
    }
    const strNextStatus = objLocation.status === "Active" ? "Inactive" : "Active";
    openConfirmDialog({
      strTitle: `${strNextStatus === "Active" ? "Activate" : "Deactivate"} Location`,
      strMessage: `Are you sure you want to mark this location as ${strNextStatus.toLowerCase()}?`,
      strConfirmLabel: strNextStatus === "Active" ? "Activate" : "Deactivate",
      fnOnConfirm: async () => {
        await masterApiService.bulkLocationStatus([Number(strLocationId)], strNextStatus === "Active");
        await loadLocations();
        showToast(strNextStatus === "Active" ? "Location activated successfully." : "Location deactivated successfully.");
      }
    });
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Button className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicModuleLabels.backButton}</Button>
      </Box>

      <Box className={styles.controlsCard}>
        <Box className={styles.searchRow}>
          <TextField value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicModuleLabels.searchNamePlaceholder} fullWidth />
          <TextField value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicModuleLabels.searchCodePlaceholder} fullWidth />
          <TextField select value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth>
            <MenuItem value="All">{dicModuleLabels.searchStatusPlaceholder}</MenuItem>
            <MenuItem value="Active">{dicCommonLabels.statusActive}</MenuItem>
            <MenuItem value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}><Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.search}</Button></Box>
          <Box className={styles.searchActions}><Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.clear}</Button></Box>
        </Box>
      </Box>

      {blnSubmitting ? (
        <Box className={styles.bulkBar}>
          <CircularProgress size={20} />
          <Typography className={styles.bulkCount}>{t("bulk_applying_changes", "Applying changes...")}</Typography>
        </Box>
      ) : lstSelectedIds.length > 0 ? (
        <Box className={styles.bulkBar}>
          <Typography className={styles.bulkCount}>{lstSelectedIds.length} {t("bulk_rows_selected", "row(s) selected")}</Typography>
          <Button className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")} disabled={blnSubmitting}>{t("bulk_activate", "Bulk Activate")}</Button>
          <Button className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")} disabled={blnSubmitting}>{t("bulk_deactivate", "Bulk Deactivate")}</Button>
          <Button className={styles.bulkDelete} onClick={bulkDelete} disabled={blnSubmitting}>{t("bulk_delete", "Bulk Delete")}</Button>
        </Box>
      ) : null}

      <Box className={styles.tableCard}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 1 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting}>{dicModuleLabels.addButton}</Button>
            <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv("location-master.xls", lstFilteredLocations)} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.exportExcel}</Button>
            <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf(dicModuleLabels.pageTitle, lstFilteredLocations)} disabled={blnLoading || blnSubmitting}>{dicCommonLabels.exportPdf}</Button>
          </Box>

          {!blnLoading && lstFilteredLocations.length > 0 ? (
          <Box className={styles.paginationBar} sx={{ p: 0, justifyContent: { xs: "flex-start", md: "flex-end" } }}>
            <Box className={styles.paginationInfo}>
              <Typography className={styles.paginationLabel}>{dicCommonLabels.rowsPerPage}</Typography>
              <TextField
                select
                size="small"
                value={String(intRowsPerPage)}
                onChange={(objEvent) => {
                  setIntRowsPerPage(Number(objEvent.target.value));
                  setIntPage(1);
                }}
                className={styles.rowsPerPageSelect}
              >
                {lstRowsPerPageOptions.map((intOption) => (
                  <MenuItem key={intOption} value={String(intOption)}>{intOption}</MenuItem>
                ))}
              </TextField>
              <Typography className={styles.paginationRange}>
                {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFilteredLocations.length)} {dicCommonLabels.paginationSeparator} {lstFilteredLocations.length}
              </Typography>
            </Box>
            <Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intNextPage) => setIntPage(intNextPage)} size="small" color="primary" showFirstButton showLastButton />
          </Box>
        ) : null}
        </Box>
        {blnLoading ? (
          <Box className={styles.emptyState}>
            <CircularProgress size={24} />
            <Typography sx={{ mt: 1 }}>{dicModuleLabels.loadingRecords}</Typography>
          </Box>
        ) : (
          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th><Checkbox checked={blnAllVisibleSelected} indeterminate={blnSomeVisibleSelected} onChange={toggleSelectAll} /></th>
                  <th>{dicModuleLabels.tableActions}</th>
                  <th>{dicModuleLabels.tableName}</th>
                  <th>{dicModuleLabels.tableCode}</th>
                  <th>{dicModuleLabels.tableState}</th>
                  <th>{dicModuleLabels.tableCity}</th>
                  <th>{dicModuleLabels.tableStatus}</th>
                </tr>
              </thead>
              <tbody>
                {lstFilteredLocations.length === 0 ? (
                  <tr><td className={styles.emptyState} colSpan={7}>{dicModuleLabels.emptyMessage}</td></tr>
                ) : lstVisibleLocations.map((dicLocation) => {
                  const blnSelected = lstSelectedIds.includes(dicLocation.id);
                  return (
                    <tr key={dicLocation.id} className={blnSelected ? styles.selectedRow : undefined}>
                      <td><Checkbox checked={blnSelected} onChange={() => toggleSelection(dicLocation.id)} /></td>
                      <td>
                        <Box className={styles.actionCell}>
                          <button className={`${styles.iconButton} ${styles.viewIcon}`} type="button" onClick={() => openDialog("view", dicLocation)}><VisibilityRoundedIcon fontSize="small" /></button>
                          <button className={`${styles.iconButton} ${styles.editIcon}`} type="button" onClick={() => openDialog("edit", dicLocation)}><EditRoundedIcon fontSize="small" /></button>
                          <button className={`${styles.iconButton} ${styles.deleteIcon}`} type="button" onClick={() => deleteLocation(dicLocation.id)}><DeleteRoundedIcon fontSize="small" /></button>
                          <button className={`${styles.iconButton} ${styles.toggleIcon}`} type="button" onClick={() => toggleLocationStatus(dicLocation.id)}><ToggleOnRoundedIcon fontSize="small" /></button>
                        </Box>
                      </td>
                      <td>{dicLocation.name}</td>
                      <td>{dicLocation.code}</td>
                      <td>{dicLocation.strStateName || "-"}</td>
                      <td>{dicLocation.strCityName || "-"}</td>
                      <td><span className={`${styles.statusPill} ${dicLocation.status === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicLocation.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        )}
      </Box>

      <Dialog open={blnDialogOpen} onClose={closeDialog} fullWidth maxWidth="sm" PaperProps={{ className: styles.compactDialogPaper }}>
        <DialogTitle>{strMode === "add" ? dicConstant.locations.dialogAddTitle : strMode === "edit" ? dicConstant.locations.dialogEditTitle : t("dialog_view_title", "View Location")}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "grid", gap: 2.25, pt: 1 }}>
            <TextField label={dicConstant.locations.fields.code} value={dicForm.code} onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} error={Boolean(dicErrors.code)} helperText={dicErrors.code} fullWidth disabled={strMode === "view"} />
            <TextField label={dicConstant.locations.fields.name} value={dicForm.name} onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} error={Boolean(dicErrors.name)} helperText={dicErrors.name} fullWidth disabled={strMode === "view"} />
            <TextField
              label={dicConstant.locations.fields.state}
              select
              value={dicForm.intStateID === "" ? "" : String(dicForm.intStateID)}
              onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, intStateID: objEvent.target.value ? Number(objEvent.target.value) : "" }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
              disabled={strMode === "view"}
            >
              <MenuItem value="">None</MenuItem>
              {(objFormOptions?.lstStates ?? []).map((dicState) => (
                <MenuItem key={dicState.intID} value={String(dicState.intID)}>
                  {dicState.strLabel}{dicState.strCode ? ` (${dicState.strCode})` : ""}
                </MenuItem>
              ))}
            </TextField>
            <TextField label={dicConstant.locations.fields.city} value={dicForm.strCityName} onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, strCityName: objEvent.target.value }))} error={Boolean(dicErrors.strCityName)} helperText={dicErrors.strCityName} fullWidth disabled={strMode === "view"} />
            <TextField
              label={dicConstant.locations.fields.status}
              select
              value={dicForm.status}
              onChange={(objEvent) => setDicForm((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as LocationStatus }))}
              InputLabelProps={{ shrink: true }}
              sx={{ mt: 0.5 }}
              fullWidth
              disabled={strMode === "view"}
            >
              <MenuItem value="Active">{dicCommonLabels.statusActive}</MenuItem>
              <MenuItem value="Inactive">{dicCommonLabels.statusInactive}</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button className={styles.secondaryButton} onClick={closeDialog}>{strMode === "view" ? t("close", "Close") : dicCommonLabels.cancel}</Button>
          {strMode !== "view" ? (
            <Button className={styles.primaryButton} onClick={saveLocation} disabled={blnSubmitting}>
              {blnSubmitting ? t("saving", "Saving...") : strMode === "add" ? t("save", dicConstant.common.save) : t("update", dicConstant.common.update)}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(objConfirmDialog)} onClose={closeConfirmDialog} PaperProps={{ className: styles.confirmDialogPaper }}>
        <DialogTitle className={styles.confirmDialogTitle}>{objConfirmDialog?.strTitle}</DialogTitle>
        <DialogContent className={styles.confirmDialogContent}>
          <Typography className={styles.confirmDialogMessage}>{objConfirmDialog?.strMessage}</Typography>
        </DialogContent>
        <DialogActions className={styles.confirmDialogActions}>
          <Button className={styles.textAction} onClick={closeConfirmDialog} disabled={blnSubmitting}>{dicCommonLabels.cancel}</Button>
          <Button className={styles.primaryButton} onClick={executeConfirmedAction} disabled={blnSubmitting}>
            {blnSubmitting ? dicCommonLabels.processing : objConfirmDialog?.strConfirmLabel ?? t("confirm_button", "Confirm")}
          </Button>
        </DialogActions>
      </Dialog>

      <BlockingLoader blnOpen={blnLoading || blnSubmitting} strLabel={blnLoading ? dicCommonLabels.loading : dicCommonLabels.processing} intZIndex={1400} />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
