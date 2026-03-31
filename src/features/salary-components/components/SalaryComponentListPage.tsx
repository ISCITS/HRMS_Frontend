"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  MenuItem,
  Pagination,
  Snackbar,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonConfirmDialog from "@/components/master/CommonConfirmDialog";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useSalaryComponentLabels } from "@/features/salary-components/hooks/useSalaryComponentLabels";
import { salaryComponentService } from "@/features/salary-components/services/salaryComponentService";
import type { SalaryComponentListRecord } from "@/features/salary-components/types";

type Status = "Active" | "Inactive";
type SearchForm = {
  code: string;
  name: string;
  status: "All" | Status;
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

const lstRowsPerPageOptions = [10, 20, 50];
const dicEmptySearch: SearchForm = { code: "", name: "", status: "All" };
const lstSalaryComponentModuleCodes = ["SALARY_COMPONENT", "SALARY_COMPONENTS", "MASTER_SALARY_COMPONENT"];

function downloadCsv(strFileName: string, lstRows: SalaryComponentListRecord[]) {
  const lstHeaders = [
    "Code",
    "Component Name",
    "Category",
    "Group",
    "Calc Method",
    "Rounding",
    "Periodicity",
    "Tax Treatment",
    "Manual Override",
    "Declaration",
    "Proof",
    "Dependencies",
    "Status"
  ];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) =>
      [
        dicRow.strComponentCode,
        dicRow.strComponentName,
        dicRow.strComponentCategory,
        dicRow.strComponentGroup ?? "-",
        dicRow.strCalcMethod,
        dicRow.strRoundingRule ?? "-",
        dicRow.strDefaultPeriodicity,
        dicRow.strTaxTreatment ?? "-",
        dicRow.blnAllowManualOverride ? "Yes" : "No",
        dicRow.blnDeclarationRequired ? "Yes" : "No",
        dicRow.blnProofRequired ? "Yes" : "No",
        dicRow.intDependencyCount,
        dicRow.blnIsActive ? "Active" : "Inactive"
      ]
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

function exportPdf(strTitle: string, lstRows: SalaryComponentListRecord[]) {
  const objWindow = window.open("", "_blank", "width=1400,height=900");
  if (!objWindow) {
    return;
  }

  const strRows = lstRows.map((dicRow) => `
    <tr>
      <td>${dicRow.strComponentCode}</td>
      <td>${dicRow.strComponentName}</td>
      <td>${dicRow.strComponentCategory}</td>
      <td>${dicRow.strComponentGroup ?? "-"}</td>
      <td>${dicRow.strCalcMethod}</td>
      <td>${dicRow.strRoundingRule ?? "-"}</td>
      <td>${dicRow.strDefaultPeriodicity}</td>
      <td>${dicRow.strTaxTreatment ?? "-"}</td>
      <td>${dicRow.blnAllowManualOverride ? "Yes" : "No"}</td>
      <td>${dicRow.blnDeclarationRequired ? "Yes" : "No"}</td>
      <td>${dicRow.blnProofRequired ? "Yes" : "No"}</td>
      <td>${dicRow.intDependencyCount}</td>
      <td>${dicRow.blnIsActive ? "Active" : "Inactive"}</td>
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
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
          th { background: #e2e8f0; }
        </style>
      </head>
      <body>
        <h1>${strTitle}</h1>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Component Name</th>
              <th>Category</th>
              <th>Group</th>
              <th>Calc Method</th>
              <th>Rounding</th>
              <th>Periodicity</th>
              <th>Tax Treatment</th>
              <th>Manual Override</th>
              <th>Declaration</th>
              <th>Proof</th>
              <th>Dependencies</th>
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

export default function SalaryComponentListPage() {
  const objRouter = useRouter();
  const { t } = useSalaryComponentLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstSalaryComponentModuleCodes);
  const [lstComponents, setLstComponents] = useState<SalaryComponentListRecord[]>([]);
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [lstSelectedIds, setLstSelectedIds] = useState<number[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  async function loadComponents() {
    if (!canViewAny()) {
      setLstComponents([]);
      setLstSelectedIds([]);
      setIntPage(1);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      setLstComponents(await salaryComponentService.getSalaryComponents());
      setLstSelectedIds([]);
      setIntPage(1);
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : "Unable to load salary components.", "error");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }
    loadComponents().catch(() => undefined);
  }, [blnRightsLoading]);

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanDelete = canDoAny("delete");
  const blnCanExport = canDoAny("export");
  const blnReadOnly = isReadOnly();
  const blnCanChangeStatus = blnCanEdit;

  const lstFilteredRows = useMemo(() => {
    return lstComponents.filter((dicRow) => {
      const blnNameMatch = !dicSearchApplied.name || dicRow.strComponentName.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
      const blnCodeMatch = !dicSearchApplied.code || dicRow.strComponentCode.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
      const blnStatusMatch =
        dicSearchApplied.status === "All" ||
        (dicSearchApplied.status === "Active" ? dicRow.blnIsActive : !dicRow.blnIsActive);
      return blnNameMatch && blnCodeMatch && blnStatusMatch;
    });
  }, [dicSearchApplied, lstComponents]);

  const intPageCount = Math.max(1, Math.ceil(lstFilteredRows.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleRows = lstFilteredRows.slice(intStartIndex, intStartIndex + intRowsPerPage);
  const blnAllVisibleSelected = lstVisibleRows.length > 0 && lstVisibleRows.every((dicRow) => lstSelectedIds.includes(dicRow.intID));
  const blnSomeVisibleSelected = !blnAllVisibleSelected && lstSelectedIds.some((intID) => lstVisibleRows.some((dicRow) => dicRow.intID === intID));

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

  function toggleSelection(intSalaryComponentID: number) {
    setLstSelectedIds((lstPrevious) => lstPrevious.includes(intSalaryComponentID)
      ? lstPrevious.filter((intID) => intID !== intSalaryComponentID)
      : [...lstPrevious, intSalaryComponentID]);
  }

  function toggleSelectAll() {
    if (blnAllVisibleSelected) {
      setLstSelectedIds((lstPrevious) => lstPrevious.filter((intID) => !lstVisibleRows.some((dicRow) => dicRow.intID === intID)));
      return;
    }
    setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstVisibleRows.map((dicRow) => dicRow.intID)])]);
  }

  function bulkUpdateStatus(strStatus: Status) {
    openConfirmDialog({
      strTitle: strStatus === "Active" ? t("confirm_bulk_activate_title", "Activate Salary Components") : t("confirm_bulk_deactivate_title", "Deactivate Salary Components"),
      strMessage: (strStatus === "Active"
        ? t("confirm_bulk_activate_message", "Are you sure you want to activate {count} salary component record(s)?")
        : t("confirm_bulk_deactivate_message", "Are you sure you want to deactivate {count} salary component record(s)?"))
        .replace("{count}", String(lstSelectedIds.length)),
      strConfirmLabel: strStatus === "Active" ? t("bulk_activate", "Activate") : t("bulk_deactivate", "Deactivate"),
      fnOnConfirm: async () => {
        await salaryComponentService.bulkSalaryComponentStatus(lstSelectedIds, strStatus === "Active");
        await loadComponents();
        showToast(strStatus === "Active"
          ? t("bulk_activate_success", "Salary components activated successfully.")
          : t("bulk_deactivate_success", "Salary components deactivated successfully."));
      }
    });
  }

  function bulkDelete() {
    openConfirmDialog({
      strTitle: t("confirm_bulk_delete_title", "Delete Salary Components"),
      strMessage: t("confirm_bulk_delete_message", "Are you sure you want to delete {count} salary component record(s)?")
        .replace("{count}", String(lstSelectedIds.length)),
      strConfirmLabel: t("bulk_delete", "Delete"),
      fnOnConfirm: async () => {
        await salaryComponentService.bulkDeleteSalaryComponents(lstSelectedIds);
        await loadComponents();
        showToast(t("bulk_delete_success", "Salary components deleted successfully."));
      }
    });
  }

  function deleteSalaryComponent(intSalaryComponentID: number) {
    openConfirmDialog({
      strTitle: t("confirm_delete_title", "Delete Salary Component"),
      strMessage: t("confirm_delete_message", "Are you sure you want to delete this salary component record?"),
      strConfirmLabel: t("delete_button", "Delete"),
      fnOnConfirm: async () => {
        await salaryComponentService.deleteSalaryComponent(intSalaryComponentID);
        await loadComponents();
        showToast(t("delete_success", "Salary component deleted successfully."));
      }
    });
  }

  function toggleSalaryComponentStatus(dicRow: SalaryComponentListRecord) {
    const blnNextIsActive = !dicRow.blnIsActive;
    openConfirmDialog({
      strTitle: blnNextIsActive
        ? t("confirm_activate_title", "Activate Salary Component")
        : t("confirm_deactivate_title", "Deactivate Salary Component"),
      strMessage: blnNextIsActive
        ? t("confirm_activate_message", "Are you sure you want to mark this salary component as active?")
        : t("confirm_deactivate_message", "Are you sure you want to mark this salary component as inactive?"),
      strConfirmLabel: blnNextIsActive ? t("activate_button", "Activate") : t("deactivate_button", "Deactivate"),
      fnOnConfirm: async () => {
        await salaryComponentService.setSalaryComponentStatus(dicRow.intID, blnNextIsActive);
        await loadComponents();
        showToast(blnNextIsActive
          ? t("activate_success", "Salary component activated successfully.")
          : t("deactivate_success", "Salary component deactivated successfully."));
      }
    });
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Button className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>
          {t("back_button", "Back")}
        </Button>
      </Box>

      <Box className={styles.controlsCard}>
        {strRightsError ? (
          <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography>
        ) : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? (
          <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>
            {t("read_only_mode", "You have view-only access for Salary Component.")}
          </Typography>
        ) : null}

        <Box className={styles.searchRow}>
          <TextField
            value={dicSearchDraft.name}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, name: objEvent.target.value }))}
            placeholder={t("search_component_name", "Search component name")}
            fullWidth
          />
          <TextField
            value={dicSearchDraft.code}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, code: objEvent.target.value.toUpperCase() }))}
            placeholder={t("search_component_code", "Search component code")}
            fullWidth
          />
          <TextField
            select
            label={t("search_status_label", "Status")}
            value={dicSearchDraft.status}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, status: objEvent.target.value as SearchForm["status"] }))}
            fullWidth
          >
            <MenuItem value="All">{t("all_status", "All Status")}</MenuItem>
            <MenuItem value="Active">{t("status_active", "Active")}</MenuItem>
            <MenuItem value="Inactive">{t("status_inactive", "Inactive")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>
              {t("search_button", "Search")}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicSearchDraft(dicEmptySearch);
                setDicSearchApplied(dicEmptySearch);
                setIntPage(1);
              }}
              disabled={blnLoading || blnSubmitting}
            >
              {t("clear_button", "Clear")}
            </Button>
          </Box>
        </Box>

        {blnSubmitting ? (
          <Box className={styles.bulkBar}>
            <CircularProgress size={20} />
            <Typography className={styles.bulkCount}>{t("bulk_applying_changes", "Applying changes...")}</Typography>
          </Box>
        ) : lstSelectedIds.length > 0 && !blnReadOnly && (blnCanChangeStatus || blnCanDelete) ? (
          <Box className={styles.bulkBar}>
            <Typography className={styles.bulkCount}>{`${lstSelectedIds.length} ${t("bulk_rows_selected", "rows selected")}`}</Typography>
            {blnCanChangeStatus ? <Button className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")} disabled={blnSubmitting}>{t("bulk_activate", "Activate")}</Button> : null}
            {blnCanChangeStatus ? <Button className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")} disabled={blnSubmitting}>{t("bulk_deactivate", "Deactivate")}</Button> : null}
            {blnCanDelete ? <Button className={styles.bulkDelete} onClick={bulkDelete} disabled={blnSubmitting}>{t("bulk_delete", "Delete")}</Button> : null}
          </Box>
        ) : null}
      </Box>

      <Box className={styles.tableCard}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 1 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {blnCanAdd ? <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/salary-components/add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{t("add_component", "Add Component")}</Button> : null}
            {blnCanExport ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv("salary_components.csv", lstFilteredRows)} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{t("export_excel", "Export Excel")}</Button> : null}
            {blnCanExport ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf(t("salary_component_title", "Salary Components"), lstFilteredRows)} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{t("export_pdf", "Export PDF")}</Button> : null}
          </Box>

          {!blnLoading && lstFilteredRows.length > 0 ? (
          <Box className={styles.paginationBar} sx={{ p: 0, justifyContent: { xs: "flex-start", md: "flex-end" } }}>
            <Box className={styles.paginationInfo}>
              <Typography className={styles.paginationLabel}>{t("rows_per_page", "Rows per page")}</Typography>
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
                {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFilteredRows.length)} {t("pagination_separator", "of")} {lstFilteredRows.length}
              </Typography>
            </Box>
            <Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intNextPage) => setIntPage(intNextPage)} size="small" color="primary" showFirstButton showLastButton />
          </Box>
        ) : null}
        </Box>

        {blnLoading || blnRightsLoading ? (
          <Box className={styles.emptyState}>
            <CircularProgress size={24} />
            <Typography sx={{ mt: 1 }}>{t("loading_salary_components", "Loading salary components...")}</Typography>
          </Box>
        ) : !blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("access_denied", "Salary component access is not available for your user group.")}</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>{t("access_denied_help", "Contact your administrator if you need salary component visibility.")}</Typography>
          </Box>
        ) : (
          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th><Checkbox checked={blnAllVisibleSelected} indeterminate={blnSomeVisibleSelected} onChange={toggleSelectAll} /></th>
                  <th>{t("action", "Action")}</th>
                  <th>{t("code", "Code")}</th>
                  <th>{t("component_name", "Component Name")}</th>
                  <th>{t("category", "Category")}</th>
                  <th>{t("group", "Group")}</th>
                  <th>{t("calc_method", "Calc Method")}</th>
                  <th>{t("rounding", "Rounding")}</th>
                  <th>{t("periodicity", "Periodicity")}</th>
                  <th>{t("tax_treatment", "Tax Treatment")}</th>
                  <th>{t("manual_override", "Manual Override")}</th>
                  <th>{t("declaration", "Declaration")}</th>
                  <th>{t("proof", "Proof")}</th>
                  <th>{t("dependencies", "Dependencies")}</th>
                  <th>{t("status", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {lstFilteredRows.length === 0 ? (
                  <tr>
                    <td className={styles.emptyState} colSpan={15}>{t("no_salary_components_found", "No salary components found.")}</td>
                  </tr>
                ) : lstVisibleRows.map((dicRow) => {
                  const blnSelected = lstSelectedIds.includes(dicRow.intID);
                  return (
                  <tr key={dicRow.intID} className={blnSelected ? styles.selectedRow : undefined}>
                    <td><Checkbox checked={blnSelected} onChange={() => toggleSelection(dicRow.intID)} /></td>
                    <td>
                      <CommonRowActions
                        blnCanEdit={blnCanEdit}
                        blnCanDelete={blnCanDelete}
                        blnCanToggle={blnCanChangeStatus}
                        onEdit={() => objRouter.push(`/salary-components/edit/${dicRow.intID}`)}
                        onDelete={() => deleteSalaryComponent(dicRow.intID)}
                        onToggle={() => toggleSalaryComponentStatus(dicRow)}
                      />
                    </td>
                    <td>{dicRow.strComponentCode}</td>
                    <td>{dicRow.strComponentName}</td>
                    <td>{dicRow.strComponentCategory}</td>
                    <td>{dicRow.strComponentGroup ?? "-"}</td>
                    <td>{dicRow.strCalcMethod}</td>
                    <td>{dicRow.strRoundingRule ?? "-"}</td>
                    <td>{dicRow.strDefaultPeriodicity}</td>
                    <td>{dicRow.strTaxTreatment ?? "-"}</td>
                    <td>{dicRow.blnAllowManualOverride ? t("yes", "Yes") : t("no", "No")}</td>
                    <td>{dicRow.blnDeclarationRequired ? t("yes", "Yes") : t("no", "No")}</td>
                    <td>{dicRow.blnProofRequired ? t("yes", "Yes") : t("no", "No")}</td>
                    <td>{dicRow.intDependencyCount}</td>
                    <td>
                      <span className={`${styles.statusPill} ${dicRow.blnIsActive ? styles.statusActive : styles.statusInactive}`}>
                        {dicRow.blnIsActive ? t("status_active", "Active") : t("status_inactive", "Inactive")}
                      </span>
                    </td>
                  </tr>
                );})}
              </tbody>
            </table>
          </Box>
        )}
      </Box>

      <CommonConfirmDialog
        blnOpen={Boolean(objConfirmDialog)}
        strTitle={objConfirmDialog?.strTitle}
        strMessage={objConfirmDialog?.strMessage}
        strCancelLabel={t("cancel_button", "Cancel")}
        strConfirmLabel={objConfirmDialog?.strConfirmLabel ?? t("confirm_button", "Confirm")}
        blnConfirmDisabled={blnSubmitting}
        onClose={closeConfirmDialog}
        onConfirm={executeConfirmedAction}
      />

      <BlockingLoader blnOpen={blnLoading || blnRightsLoading || blnSubmitting} strLabel={blnLoading || blnRightsLoading ? t("loading", "Loading...") : t("processing", "Processing...")} intZIndex={1400} />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
