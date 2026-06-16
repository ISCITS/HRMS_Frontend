"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  MenuItem,
  Snackbar,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
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

const dicEmptySearch: SearchForm = { code: "", name: "", status: "All" };
const lstSalaryComponentModuleCodes = ["SALARY_COMPONENT", "SALARY_COMPONENTS", "MASTER_SALARY_COMPONENT"];

function normalizeSelectToken(strValue: string) {
  return strValue.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function getCategoryLabel(strValue: string) {
  switch (normalizeSelectToken(strValue)) {
    case "earning":
      return "Earning";
    case "deduction":
      return "Deduction";
    case "employer":
    case "employercontribution":
    case "contribution":
      return "Employer Contribution";
    case "flexibasket":
      return "Flexi Basket";
    case "reimbursement":
      return "Reimbursement";
    default:
      return strValue;
  }
}

function getTaxTreatmentLabel(strValue: string | null) {
  if (!strValue) {
    return "-";
  }
  switch (normalizeSelectToken(strValue)) {
    case "taxable":
      return "Taxable";
    case "exempt":
      return "Exempt";
    case "partialexempt":
      return "Partially Exempt";
    case "pretax":
      return "Pre-Tax Deduction";
    case "nontaxable":
    case "nontax":
      return "Non-Taxable";
    case "deferred":
      return "Deferred";
    default:
      return strValue;
  }
}

function getPfEsicLabel(blnIncludeInPF: boolean, blnIncludeInESIC: boolean) {
  if (blnIncludeInPF && blnIncludeInESIC) {
    return "PF / ESIC";
  }
  if (blnIncludeInPF) {
    return "PF";
  }
  if (blnIncludeInESIC) {
    return "ESIC";
  }
  return "-";
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
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  async function loadComponents() {
    if (!canViewAny()) {
      setLstComponents([]);
      setLstSelectedIds([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      setLstComponents(await salaryComponentService.getSalaryComponents());
      setLstSelectedIds([]);
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
  const blnAllFilteredSelected = lstFilteredRows.length > 0 && lstFilteredRows.every((dicRow) => lstSelectedIds.includes(dicRow.intID));
  const blnSomeFilteredSelected = !blnAllFilteredSelected && lstFilteredRows.some((dicRow) => lstSelectedIds.includes(dicRow.intID));

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
    if (blnAllFilteredSelected) {
      setLstSelectedIds((lstPrevious) => lstPrevious.filter((intID) => !lstFilteredRows.some((dicRow) => dicRow.intID === intID)));
      return;
    }
    setLstSelectedIds((lstPrevious) => [...new Set([...lstPrevious, ...lstFilteredRows.map((dicRow) => dicRow.intID)])]);
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

  const lstTableRows = useMemo(
    () =>
      lstFilteredRows.map((dicRow) => {
        const blnSelected = lstSelectedIds.includes(dicRow.intID);
        return {
          id: dicRow.intID,
          select: <Checkbox inputProps={{ "data-testid": "salary-components.list.row.select.checkbox", "data-row-key": String(dicRow.intID) } as InputHTMLAttributes<HTMLInputElement>} checked={blnSelected} onChange={() => toggleSelection(dicRow.intID)} />,
          action: (
            <CommonRowActions
              testIdPrefix="salary-components.list.row"
              rowKey={dicRow.intID}
              blnCanEdit={blnCanEdit}
              blnCanDelete={blnCanDelete}
              onEdit={() => objRouter.push(`/salary-components/edit/${dicRow.intID}`)}
              onDelete={() => deleteSalaryComponent(dicRow.intID)}
            />
          ),
          strComponentName: dicRow.strComponentName,
          strComponentCategory: getCategoryLabel(dicRow.strComponentCategory),
          strComponentGroup: dicRow.strComponentGroup ?? "-",
          strCalcMethod: dicRow.strCalcMethod,
          strTaxTreatment: getTaxTreatmentLabel(dicRow.strTaxTreatment),
          strPfEsic: getPfEsicLabel(dicRow.blnIncludeInPF, dicRow.blnIncludeInESIC),
          blnDeclarationRequired: dicRow.blnDeclarationRequired ? t("yes", "Yes") : t("no", "No"),
          blnIsActive: (
            <span className={`${styles.statusPill} ${dicRow.blnIsActive ? styles.statusActive : styles.statusInactive}`}>
              {dicRow.blnIsActive ? t("status_active", "Active") : t("status_inactive", "Inactive")}
            </span>
          ),
        };
      }),
    [blnCanDelete, blnCanEdit, lstFilteredRows, lstSelectedIds, objRouter, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      {
        field: "select",
        headerName: (
          <Checkbox
            data-testid="salary-components.list.select-all.checkbox"
            checked={blnAllFilteredSelected}
            indeterminate={blnSomeFilteredSelected}
            onChange={toggleSelectAll}
            disabled={lstFilteredRows.length === 0}
            inputProps={{ "data-testid": "salary-components.list.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>}
          />
        ),
        sortable: false,
        filterable: false,
        exportable: false,
        width: 56
      },
      { field: "action", headerName: t("actions", "Actions"), sortable: false, filterable: false, exportable: false, width: 110 },
      { field: "strComponentName", headerName: t("component_name", "Component Name") },
      { field: "strComponentCategory", headerName: t("category", "Category") },
      { field: "strComponentGroup", headerName: t("payroll_group", "Payroll Group") },
      { field: "strCalcMethod", headerName: t("calc_method", "Calc Method") },
      { field: "strTaxTreatment", headerName: t("tax_treatment", "Tax Treatment") },
      { field: "strPfEsic", headerName: t("pf_esic", "PF / ESIC") },
      { field: "blnDeclarationRequired", headerName: t("declaration", "Declaration") },
      { field: "blnIsActive", headerName: t("status", "Status"), sortable: false, filterable: false, width: 130 },
    ],
    [blnAllFilteredSelected, blnSomeFilteredSelected, lstFilteredRows.length, t]
  );

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Button data-testid="salary-components.list.back.button" className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>
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
            data-testid="salary-components.list.search-name.input"
            inputProps={{ "data-testid": "salary-components.list.search-name.input" }}
            value={dicSearchDraft.name}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, name: objEvent.target.value }))}
            placeholder={t("search_component_name", "Search component name")}
            fullWidth
          />
          <TextField
            data-testid="salary-components.list.search-code.input"
            inputProps={{ "data-testid": "salary-components.list.search-code.input" }}
            value={dicSearchDraft.code}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, code: objEvent.target.value.toUpperCase() }))}
            placeholder={t("search_component_code", "Search component code")}
            fullWidth
          />
          <TextField
            data-testid="salary-components.list.search-status.select"
            inputProps={{ "data-testid": "salary-components.list.search-status.select" }}
            select
            label={t("search_status_label", "Status")}
            value={dicSearchDraft.status}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, status: objEvent.target.value as SearchForm["status"] }))}
            fullWidth
          >
            <MenuItem data-testid="salary-components.list.search-status.all.option" value="All">{t("all_status", "All Status")}</MenuItem>
            <MenuItem data-testid="salary-components.list.search-status.active.option" value="Active">{t("status_active", "Active")}</MenuItem>
            <MenuItem data-testid="salary-components.list.search-status.inactive.option" value="Inactive">{t("status_inactive", "Inactive")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button data-testid="salary-components.list.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); }} disabled={blnLoading || blnSubmitting}>
              {t("search_button", "Search")}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button
              data-testid="salary-components.list.clear.button"
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicSearchDraft(dicEmptySearch);
                setDicSearchApplied(dicEmptySearch);
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
        ) : lstSelectedIds.length > 0 && !blnReadOnly && (blnCanEdit || blnCanDelete) ? (
          <Box className={styles.bulkBar}>
            <Typography className={styles.bulkCount}>{`${lstSelectedIds.length} ${t("bulk_rows_selected", "rows selected")}`}</Typography>
            {blnCanEdit ? <Button data-testid="salary-components.list.bulk-activate.button" className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")} disabled={blnSubmitting}>{t("bulk_activate", "Activate")}</Button> : null}
            {blnCanEdit ? <Button data-testid="salary-components.list.bulk-deactivate.button" className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")} disabled={blnSubmitting}>{t("bulk_deactivate", "Deactivate")}</Button> : null}
            {blnCanDelete ? <Button data-testid="salary-components.list.bulk-delete.button" className={styles.bulkDelete} onClick={bulkDelete} disabled={blnSubmitting}>{t("bulk_delete", "Delete")}</Button> : null}
          </Box>
        ) : null}
      </Box>

      <Box className={styles.tableCard}>
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
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            defaultPageSize={10}
            pageSizeOptions={[10, 20, 50]}
            exportFileName="salary_components"
            showExportOptions={blnCanExport}
            showPaginationSummary
            emptyMessage={t("no_salary_components_found", "No salary components found.")}
            toolbarLeft={(
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                {blnCanAdd ? <Button data-testid="salary-components.list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/salary-components/add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{t("add_component", "Add Component")}</Button> : null}
              </Box>
            )}
            testIdPrefix="salary-components.list"
            getRowSx={(dicRow) => lstSelectedIds.includes(dicRow.id) ? { backgroundColor: "rgba(37, 99, 235, 0.08)" } : {}}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
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
