"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ViewColumnRoundedIcon from "@mui/icons-material/ViewColumnRounded";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Checkbox,
  CircularProgress,
  InputAdornment,
  Link,
  Menu,
  MenuItem,
  Skeleton,
  Snackbar,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState, type InputHTMLAttributes, type KeyboardEvent, type MouseEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useSalaryComponentLabels } from "@/features/salary-components/hooks/useSalaryComponentLabels";
import { salaryComponentService } from "@/features/salary-components/services/salaryComponentService";
import type { SalaryComponentListRecord } from "@/features/salary-components/types";

type Status = "Active" | "Inactive";
type SearchForm = {
  query: string;
  category: string;
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
type OptionalColumnKey = "pfEsic" | "declaration";

const dicEmptySearch: SearchForm = { query: "", category: "All", status: "All" };
const lstSalaryComponentModuleCodes = ["SALARY_COMPONENT", "SALARY_COMPONENTS", "MASTER_SALARY_COMPONENT"];
const intSalaryComponentSkeletonRows = 8;
const lstOptionalColumnKeys: OptionalColumnKey[] = ["pfEsic", "declaration"];

function parseStatus(strValue: string | null): SearchForm["status"] {
  return strValue === "Active" || strValue === "Inactive" ? strValue : "All";
}

function buildSearchFromParams(objSearchParams: URLSearchParams): SearchForm {
  return {
    query: objSearchParams.get("q") ?? objSearchParams.get("name") ?? objSearchParams.get("code") ?? "",
    category: objSearchParams.get("category") ?? "All",
    status: parseStatus(objSearchParams.get("status")),
  };
}

function buildSalaryComponentListUrl(dicSearch: SearchForm) {
  const objParams = new URLSearchParams();
  const strQuery = dicSearch.query.trim();

  if (strQuery) {
    objParams.set("q", strQuery);
  }
  if (dicSearch.category !== "All") {
    objParams.set("category", dicSearch.category);
  }
  if (dicSearch.status !== "All") {
    objParams.set("status", dicSearch.status);
  }

  const strUrlQuery = objParams.toString();
  return strUrlQuery ? `/salary-components?${strUrlQuery}` : "/salary-components";
}

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

function SalaryComponentGridSkeleton() {
  return (
    <Box
      data-controlid="salary-components.list.skeleton"
      sx={{
        border: "1px solid #e8eef5",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: "#fff",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, px: 1.75, py: 1.25, flexWrap: "wrap" }}>
        <Skeleton variant="rounded" width={142} height={36} />
        <Box sx={{ display: "flex", gap: 1.25, alignItems: "center", flexWrap: "wrap" }}>
          <Skeleton variant="rounded" width={64} height={36} />
          <Skeleton variant="text" width={72} height={24} />
          <Skeleton variant="rounded" width={116} height={32} />
        </Box>
      </Box>
      <Box sx={{ minWidth: 1200 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "48px 1.5fr 1fr 1fr 1fr 0.9fr 0.9fr 0.8fr 0.8fr 0.8fr", bgcolor: "#edf3f9", borderTop: "1px solid #e8eef5", borderBottom: "1px solid #d9e3ee" }}>
          {Array.from({ length: 10 }).map((_, intColumn) => (
            <Box key={intColumn} sx={{ px: 2, py: 1 }}>
              <Skeleton variant="text" width={intColumn === 0 ? 18 : intColumn === 9 ? 74 : 112} height={22} />
            </Box>
          ))}
        </Box>
        {Array.from({ length: intSalaryComponentSkeletonRows }).map((_, intIndex) => (
          <Box
            key={intIndex}
            sx={{
              display: "grid",
              gridTemplateColumns: "48px 1.5fr 1fr 1fr 1fr 0.9fr 0.9fr 0.8fr 0.8fr 0.8fr",
              borderBottom: "1px solid #edf1f6",
              minHeight: 40,
              alignItems: "center",
            }}
          >
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="rounded" width={18} height={18} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${62 + (intIndex % 3) * 8}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${44 + (intIndex % 2) * 10}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="58%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="52%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="48%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="56%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="46%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="54%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="rounded" width={72} height={22} /></Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function SalaryComponentListPage() {
  const objRouter = useRouter();
  const strPathname = usePathname();
  const objSearchParams = useSearchParams();
  const { t } = useSalaryComponentLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstSalaryComponentModuleCodes);
  const [lstComponents, setLstComponents] = useState<SalaryComponentListRecord[]>([]);
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [lstSelectedIds, setLstSelectedIds] = useState<number[]>([]);
  const [lstVisibleOptionalColumns, setLstVisibleOptionalColumns] = useState<OptionalColumnKey[]>([]);
  const [objAddColumnsAnchor, setObjAddColumnsAnchor] = useState<HTMLElement | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  const strCurrentListRoute = useMemo(() => {
    const strQuery = objSearchParams.toString();
    return strQuery ? `${strPathname}?${strQuery}` : strPathname;
  }, [strPathname, objSearchParams]);

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

  useEffect(() => {
    const dicUrlSearch = buildSearchFromParams(objSearchParams);
    setDicSearchDraft(dicUrlSearch);
    setDicSearchApplied(dicUrlSearch);
  }, [objSearchParams]);

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanDelete = canDoAny("delete");
  const blnCanExport = canDoAny("export");
  const blnReadOnly = isReadOnly();

  const lstFilteredRows = useMemo(() => {
    return lstComponents.filter((dicRow) => {
      const strQuery = dicSearchApplied.query.trim().toLowerCase();
      const blnQueryMatch = !strQuery || dicRow.strComponentName.toLowerCase().includes(strQuery) || dicRow.strComponentCode.toLowerCase().includes(strQuery);
      const blnCategoryMatch = dicSearchApplied.category === "All" || getCategoryLabel(dicRow.strComponentCategory) === dicSearchApplied.category;
      const blnStatusMatch =
        dicSearchApplied.status === "All" ||
        (dicSearchApplied.status === "Active" ? dicRow.blnIsActive : !dicRow.blnIsActive);
      return blnQueryMatch && blnCategoryMatch && blnStatusMatch;
    });
  }, [dicSearchApplied, lstComponents]);
  const lstCategoryFilterOptions = useMemo(
    () => Array.from(new Set(lstComponents.map((dicRow) => getCategoryLabel(dicRow.strComponentCategory)).filter(Boolean))).sort(),
    [lstComponents]
  );
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

  function applySearch(dicSearch: SearchForm) {
    const dicNextSearch = {
      ...dicSearch,
      query: dicSearch.query.trim(),
    };
    setDicSearchDraft(dicNextSearch);
    setDicSearchApplied(dicNextSearch);
    objRouter.replace(buildSalaryComponentListUrl(dicNextSearch));
  }

  function handleSearchTextKeyDown(objEvent: KeyboardEvent<HTMLInputElement>) {
    if (objEvent.key === "Enter") {
      objEvent.preventDefault();
      applySearch(dicSearchDraft);
    }
  }

  function handleAddColumnsClick(objEvent: MouseEvent<HTMLButtonElement>) {
    setObjAddColumnsAnchor(objEvent.currentTarget);
  }

  function closeAddColumnsMenu() {
    setObjAddColumnsAnchor(null);
  }

  function toggleOptionalColumn(strColumnKey: OptionalColumnKey) {
    setLstVisibleOptionalColumns((lstPrevious) => (
      lstPrevious.includes(strColumnKey)
        ? lstPrevious.filter((strKey) => strKey !== strColumnKey)
        : [...lstPrevious, strColumnKey]
    ));
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

  const lstTableRows = useMemo(
    () =>
      lstFilteredRows.map((dicRow) => {
        const blnSelected = lstSelectedIds.includes(dicRow.intID);
        return {
          id: dicRow.intID,
          select: <Checkbox data-controlid="salary-components.list.row.select.checkbox" data-row-key={String(dicRow.intID)} inputProps={{ "data-controlid": "salary-components.list.row.select.checkbox", "data-row-key": String(dicRow.intID) } as InputHTMLAttributes<HTMLInputElement>} checked={blnSelected} onChange={() => toggleSelection(dicRow.intID)} />,
          strRecordUUID: dicRow.strRecordUUID,
          strComponentNameSort: dicRow.strComponentName,
          strComponentName: (
            <Link
              className="app-master-first-column-link"
              component="button"
              type="button"
              underline="none"
              data-controlid="salary-components.list.row.name.link"
              data-row-key={String(dicRow.intID)}
              onClick={() => objRouter.push(`/salary-components/${blnCanEdit ? "edit" : "view"}/${dicRow.strRecordUUID}?backRoute=${encodeURIComponent(strCurrentListRoute)}`)}
            >
              {dicRow.strComponentName}
            </Link>
          ),
          strComponentCode: dicRow.strComponentCode,
          strComponentCategory: getCategoryLabel(dicRow.strComponentCategory),
          strComponentGroup: dicRow.strComponentGroup ?? "-",
          strCalcMethod: dicRow.strCalcMethod,
          strTaxTreatment: getTaxTreatmentLabel(dicRow.strTaxTreatment),
          strPfEsic: getPfEsicLabel(dicRow.blnIncludeInPF, dicRow.blnIncludeInESIC),
          blnDeclarationRequired: dicRow.blnDeclarationRequired ? t("yes", "Yes") : t("no", "No"),
          strStatus: dicRow.blnIsActive ? t("status_active", "Active") : t("status_inactive", "Inactive"),
          intStatusSort: dicRow.blnIsActive ? 1 : 0,
          blnIsActive: (
            <span data-controlid="salary-components.list.row.status.pill" data-row-key={String(dicRow.intID)} className={`app-master-status-pill ${dicRow.blnIsActive ? "app-master-status-active" : "app-master-status-inactive"}`}>
              {dicRow.blnIsActive ? t("status_active", "Active") : t("status_inactive", "Inactive")}
            </span>
          ),
        };
      }),
    [blnCanEdit, lstFilteredRows, lstSelectedIds, objRouter, strCurrentListRoute, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => {
      const lstBaseColumns: CommonTableColumn<(typeof lstTableRows)[number]>[] = [
      {
        field: "select",
        headerName: (
          <Checkbox
            data-controlid="salary-components.list.select-all.checkbox"
            checked={blnAllFilteredSelected}
            indeterminate={blnSomeFilteredSelected}
            onChange={toggleSelectAll}
            disabled={lstFilteredRows.length === 0}
            inputProps={{ "data-controlid": "salary-components.list.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>}
          />
        ),
        sortable: false,
        filterable: false,
        exportable: false,
        width: 56
      },
      { field: "strComponentName", headerName: t("component_name", "Component Name"), width: 220, sortAccessor: (dicRow) => String(dicRow.strComponentNameSort) },
      { field: "strComponentCode", headerName: t("component_code", "Component Code") },
      { field: "strComponentCategory", headerName: t("category", "Category") },
      { field: "strComponentGroup", headerName: t("payroll_group", "Payroll Group") },
      { field: "strCalcMethod", headerName: t("calc_method", "Calc Method") },
      { field: "strTaxTreatment", headerName: t("tax_treatment", "Tax Treatment") },
      { field: "blnIsActive", headerName: t("status", "Status"), filterable: false, width: 130, sortAccessor: (dicRow) => Number(dicRow.intStatusSort) },
      ];
      const lstOptionalColumns: CommonTableColumn<(typeof lstTableRows)[number]>[] = [];
      if (lstVisibleOptionalColumns.includes("pfEsic")) {
        lstOptionalColumns.push({ field: "strPfEsic", headerName: t("pf_esic", "PF / ESIC") });
      }
      if (lstVisibleOptionalColumns.includes("declaration")) {
        lstOptionalColumns.push({ field: "blnDeclarationRequired", headerName: t("declaration", "Declaration") });
      }
      return [...lstBaseColumns, ...lstOptionalColumns];
    },
    [blnAllFilteredSelected, blnSomeFilteredSelected, lstFilteredRows.length, lstVisibleOptionalColumns, t]
  );
  const dicOptionalColumnLabels: Record<OptionalColumnKey, string> = {
    pfEsic: t("pf_esic", "PF / ESIC"),
    declaration: t("declaration", "Declaration"),
  };
  const nodeAddColumnsControl = (
    <>
      <Button
        id="salary-components-add-columns-button"
        data-controlid="salary-components.list.add-columns.button"
        className={styles.secondaryButton}
        startIcon={<ViewColumnRoundedIcon />}
        onClick={handleAddColumnsClick}
        disabled={blnLoading || blnRightsLoading || blnSubmitting}
        sx={{ borderRadius: "8px !important", minHeight: "36px !important" }}
      >
        {t("add_columns", "Add columns")}
      </Button>
      <Menu
        id="salary-components-add-columns-menu"
        anchorEl={objAddColumnsAnchor}
        open={Boolean(objAddColumnsAnchor)}
        onClose={closeAddColumnsMenu}
        MenuListProps={{ "aria-labelledby": "salary-components-add-columns-button" }}
      >
        {lstOptionalColumnKeys.map((strColumnKey) => (
          <MenuItem
            key={strColumnKey}
            data-controlid={`salary-components.list.add-columns.${strColumnKey}.option`}
            onClick={() => toggleOptionalColumn(strColumnKey)}
          >
            <Checkbox
              size="small"
              checked={lstVisibleOptionalColumns.includes(strColumnKey)}
              inputProps={{ "aria-label": dicOptionalColumnLabels[strColumnKey] }}
              sx={{ p: 0.5, mr: 1 }}
            />
            {dicOptionalColumnLabels[strColumnKey]}
          </MenuItem>
        ))}
      </Menu>
    </>
  );

  return (
    <Box className={styles.page} data-controlid="salary-components.list.page">
      <Box className={styles.topBar}>
        <Button data-controlid="salary-components.list.back.button" className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>
          {t("back_button", "Back")}
        </Button>
      </Box>

      <Breadcrumbs className="app-breadcrumbs" aria-label="breadcrumb" separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />}>
        <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>{t("breadcrumb_salary", "Salary")}</Typography>
        <Typography component="h1" className="app-breadcrumb-heading" aria-current="page">{t("breadcrumb_salary_components", "Salary Components")}</Typography>
      </Breadcrumbs>

      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {strRightsError ? (
          <Typography data-controlid="salary-components.list.rights-error.message" sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography>
        ) : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? (
          <Typography data-controlid="salary-components.list.read-only.message" sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>
            {t("read_only_mode", "You have view-only access for Salary Component.")}
          </Typography>
        ) : null}

        <Box
          className={styles.searchRow}
          aria-busy={blnLoading || blnRightsLoading}
          sx={{
            gridTemplateColumns: "minmax(260px, 1.4fr) minmax(180px, 0.85fr) minmax(150px, 0.7fr) auto auto",
            alignItems: "center",
            "& .MuiButton-root": { alignSelf: "center" },
          }}
        >
          <TextField
            className="app-mui-text-field"
            data-controlid="salary-components.list.search-name.input"
            inputProps={{ "data-controlid": "salary-components.list.search-name.input" }}
            label={t("search_component_name_or_code_label", "Search component name or code")}
            value={dicSearchDraft.query}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, query: objEvent.target.value }))}
            onKeyDown={handleSearchTextKeyDown}
            placeholder={t("search_component_name_or_code", "Search component name or code")}
            size="small"
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }}
            disabled={blnLoading || blnRightsLoading || blnSubmitting}
            fullWidth
          />
          <TextField
            className="app-mui-text-field"
            data-controlid="salary-components.list.search-category.select"
            inputProps={{ "data-controlid": "salary-components.list.search-category.select" }}
            select
            label={t("category", "Category")}
            value={dicSearchDraft.category}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, category: objEvent.target.value }))}
            size="small"
            disabled={blnLoading || blnRightsLoading || blnSubmitting}
            fullWidth
          >
            <MenuItem data-controlid="salary-components.list.search-category.all.option" value="All">{t("all_categories", "All categories")}</MenuItem>
            {lstCategoryFilterOptions.map((strCategory) => (
              <MenuItem key={strCategory} data-controlid="salary-components.list.search-category.option" value={strCategory}>{strCategory}</MenuItem>
            ))}
          </TextField>
          <TextField
            className="app-mui-text-field"
            data-controlid="salary-components.list.search-status.select"
            inputProps={{ "data-controlid": "salary-components.list.search-status.select" }}
            select
            label={t("status", "Status")}
            value={dicSearchDraft.status}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, status: objEvent.target.value as SearchForm["status"] }))}
            size="small"
            disabled={blnLoading || blnRightsLoading || blnSubmitting}
            fullWidth
          >
            <MenuItem data-controlid="salary-components.list.search-status.all.option" value="All">{t("all_status", "All statuses")}</MenuItem>
            <MenuItem data-controlid="salary-components.list.search-status.active.option" value="Active">{t("status_active", "Active")}</MenuItem>
            <MenuItem data-controlid="salary-components.list.search-status.inactive.option" value="Inactive">{t("status_inactive", "Inactive")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button data-controlid="salary-components.list.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => applySearch(dicSearchDraft)} disabled={blnLoading || blnRightsLoading || blnSubmitting}>
              {t("search_button", "Search")}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button
              data-controlid="salary-components.list.clear.button"
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                applySearch(dicEmptySearch);
              }}
              disabled={blnLoading || blnRightsLoading || blnSubmitting}
            >
              {t("clear_button", "Clear")}
            </Button>
          </Box>
        </Box>

        {blnSubmitting ? (
          <Box className={styles.bulkBar} data-controlid="salary-components.list.bulk-processing.state">
            <CircularProgress size={20} />
            <Typography className={styles.bulkCount}>{t("bulk_applying_changes", "Applying changes...")}</Typography>
          </Box>
        ) : lstSelectedIds.length > 0 && !blnReadOnly && (blnCanEdit || blnCanDelete) ? (
          <Box className={styles.bulkBar} data-controlid="salary-components.list.bulk-actions.bar">
            <Typography className={styles.bulkCount}>{`${lstSelectedIds.length} ${t("bulk_rows_selected", "rows selected")}`}</Typography>
            {blnCanEdit ? <Button data-controlid="salary-components.list.bulk-activate.button" className={styles.bulkActivate} onClick={() => bulkUpdateStatus("Active")} disabled={blnSubmitting}>{t("bulk_activate", "Activate")}</Button> : null}
            {blnCanEdit ? <Button data-controlid="salary-components.list.bulk-deactivate.button" className={styles.bulkDeactivate} onClick={() => bulkUpdateStatus("Inactive")} disabled={blnSubmitting}>{t("bulk_deactivate", "Deactivate")}</Button> : null}
            {blnCanDelete ? <Button data-controlid="salary-components.list.bulk-delete.button" className={styles.bulkDelete} onClick={bulkDelete} disabled={blnSubmitting}>{t("bulk_delete", "Delete")}</Button> : null}
          </Box>
        ) : null}
      </Box>

      <Box className={styles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {(blnLoading || blnRightsLoading) ? (
          <SalaryComponentGridSkeleton />
        ) : !blnCanView ? (
          <Box className={styles.emptyState} data-controlid="salary-components.list.access-denied.state">
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("access_denied", "Salary component access is not available for your user group.")}</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>{t("access_denied_help", "Contact your administrator if you need salary component visibility.")}</Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName="salary_components"
            showExportOptions={blnCanExport}
            showPaginationSummary
            emptyMessage={t("no_salary_components_found", "No salary components found.")}
            toolbarLeft={(
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                {blnCanAdd ? <Button data-controlid="salary-components.list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push(`/salary-components/add?backRoute=${encodeURIComponent(strCurrentListRoute)}`)} disabled={blnLoading || blnSubmitting || blnRightsLoading}>{t("add_component", "Add Component")}</Button> : null}
              </Box>
            )}
            toolbarAfterExport={nodeAddColumnsControl}
            testIdPrefix="salary-components.list"
            onRowClick={(dicRow) => {
              if (blnSubmitting || (!blnCanEdit && !blnCanView)) return;
              objRouter.push(`/salary-components/${blnCanEdit ? "edit" : "view"}/${dicRow.strRecordUUID}?backRoute=${encodeURIComponent(strCurrentListRoute)}`);
            }}
            minTableWidth={1200}
            hideRowClickHint
            getRowSx={(dicRow) => ({
              backgroundColor: lstSelectedIds.includes(dicRow.id) ? "rgba(37, 99, 235, 0.08)" : "#fff",
              "&.MuiTableRow-hover:hover": { backgroundColor: "#f8fbff" },
              "&.MuiTableRow-hover:hover td:first-of-type .MuiLink-root": { textDecoration: "underline" },
            })}
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

      <BlockingLoader blnOpen={blnSubmitting} strLabel={t("processing", "Processing...")} intZIndex={1400} blnLocal />

      <Snackbar data-controlid="salary-components.list.toast" open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert data-controlid="salary-components.list.toast.alert" onClose={closeToast} severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
