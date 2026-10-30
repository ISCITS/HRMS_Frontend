"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
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
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import styles from "@/components/master/MasterScreen.module.css";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useSalaryStructureLabels } from "@/features/salary-structures/hooks/useSalaryStructureLabels";
import { salaryStructureService } from "@/features/salary-structures/services/salaryStructureService";
import type { SalaryStructureListRecord } from "@/features/salary-structures/types";

type Status = "Active" | "Inactive";
type SearchForm = {
  query: string;
  dtEffectiveFrom: string;
  dtEffectiveTo: string;
  strStatus: "All" | Status;
};
type ToastState = {
  blnOpen: boolean;
  strMessage: string;
  strSeverity: "success" | "error";
};

const dicEmptySearch: SearchForm = { query: "", dtEffectiveFrom: "", dtEffectiveTo: "", strStatus: "All" };
const lstSalaryStructureModuleCodes = ["SALARY_STRUCTURE", "SALARY_STRUCTURES", "MASTER_SALARY_STRUCTURE"];
const intSalaryStructureSkeletonRows = 8;

function parseStatus(strValue: string | null): SearchForm["strStatus"] {
  return strValue === "Active" || strValue === "Inactive" ? strValue : "All";
}

function buildSearchFromParams(objSearchParams: URLSearchParams): SearchForm {
  return {
    query: objSearchParams.get("q") ?? objSearchParams.get("name") ?? objSearchParams.get("code") ?? "",
    dtEffectiveFrom: objSearchParams.get("effective_from") ?? "",
    dtEffectiveTo: objSearchParams.get("effective_to") ?? "",
    strStatus: parseStatus(objSearchParams.get("status")),
  };
}

function buildSalaryStructureListUrl(dicSearch: SearchForm) {
  const objParams = new URLSearchParams();
  const strQuery = dicSearch.query.trim();

  if (strQuery) {
    objParams.set("q", strQuery);
  }
  if (dicSearch.dtEffectiveFrom) {
    objParams.set("effective_from", dicSearch.dtEffectiveFrom);
  }
  if (dicSearch.dtEffectiveTo) {
    objParams.set("effective_to", dicSearch.dtEffectiveTo);
  }
  if (dicSearch.strStatus !== "All") {
    objParams.set("status", dicSearch.strStatus);
  }

  const strUrlQuery = objParams.toString();
  return strUrlQuery ? `/salary-structures?${strUrlQuery}` : "/salary-structures";
}

function formatDate(strDate: string | null) {
  if (!strDate) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(strDate));
}

function SalaryStructureGridSkeleton() {
  return (
    <Box
      data-controlid="salary-structures.list.skeleton"
      sx={{
        border: "1px solid #e8eef5",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: "#fff",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, px: 1.75, py: 1.25, flexWrap: "wrap" }}>
        <Skeleton variant="rounded" width={176} height={36} />
        <Box sx={{ display: "flex", gap: 1.25, alignItems: "center", flexWrap: "wrap" }}>
          <Skeleton variant="rounded" width={64} height={36} />
          <Skeleton variant="text" width={72} height={24} />
          <Skeleton variant="rounded" width={116} height={32} />
        </Box>
      </Box>
      <Box sx={{ minWidth: 1100 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 0.9fr 0.7fr 0.9fr 0.9fr 0.8fr 0.8fr", bgcolor: "#edf3f9", borderTop: "1px solid #e8eef5", borderBottom: "1px solid #d9e3ee" }}>
          {Array.from({ length: 8 }).map((_, intColumn) => (
            <Box key={intColumn} sx={{ px: 2, py: 1 }}>
              <Skeleton variant="text" width={intColumn === 7 ? 76 : 112} height={22} />
            </Box>
          ))}
        </Box>
        {Array.from({ length: intSalaryStructureSkeletonRows }).map((_, intIndex) => (
          <Box
            key={intIndex}
            sx={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 0.9fr 0.7fr 0.9fr 0.9fr 0.8fr 0.8fr",
              borderBottom: "1px solid #edf1f6",
              minHeight: 40,
              alignItems: "center",
            }}
          >
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="68%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${62 + (intIndex % 3) * 8}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width={`${48 + (intIndex % 2) * 10}%`} height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="58%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="46%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="60%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="text" width="54%" height={20} /></Box>
            <Box sx={{ px: 2, py: 0.75 }}><Skeleton variant="rounded" width={72} height={22} /></Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function SalaryStructureListPage() {
  const objRouter = useRouter();
  const strPathname = usePathname();
  const objSearchParams = useSearchParams();
  const { t } = useSalaryStructureLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstSalaryStructureModuleCodes);
  const [lstStructures, setLstStructures] = useState<SalaryStructureListRecord[]>([]);
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [blnLoading, setBlnLoading] = useState(true);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  const strCurrentListRoute = useMemo(() => {
    const strQuery = objSearchParams.toString();
    return strQuery ? `${strPathname}?${strQuery}` : strPathname;
  }, [strPathname, objSearchParams]);

  async function loadStructures() {
    if (!canViewAny()) {
      setLstStructures([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      setLstStructures(await salaryStructureService.getSalaryStructures());
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : "Unable to load salary structures.", "error");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }
    loadStructures().catch(() => undefined);
  }, [blnRightsLoading]);

  useEffect(() => {
    const dicUrlSearch = buildSearchFromParams(objSearchParams);
    setDicSearchDraft(dicUrlSearch);
    setDicSearchApplied(dicUrlSearch);
  }, [objSearchParams]);

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanExport = canDoAny("export");
  const blnReadOnly = isReadOnly();

  const lstFilteredRows = useMemo(() => {
    return lstStructures.filter((dicRow) => {
      const strQuery = dicSearchApplied.query.trim().toLowerCase();
      const blnQueryMatch = !strQuery || dicRow.strStructureName.toLowerCase().includes(strQuery) || dicRow.strStructureCode.toLowerCase().includes(strQuery);
      const strRowEffectiveFrom = dicRow.dtEffectiveFrom ?? "";
      const strRowEffectiveTo = dicRow.dtEffectiveTo ?? "";
      const blnEffectiveFromMatch = !dicSearchApplied.dtEffectiveFrom || strRowEffectiveFrom >= dicSearchApplied.dtEffectiveFrom;
      const blnEffectiveToMatch = !dicSearchApplied.dtEffectiveTo || (strRowEffectiveTo && strRowEffectiveTo <= dicSearchApplied.dtEffectiveTo);
      const blnStatusMatch =
        dicSearchApplied.strStatus === "All" ||
        (dicSearchApplied.strStatus === "Active" ? dicRow.blnIsActive : !dicRow.blnIsActive);
      return blnQueryMatch && blnEffectiveFromMatch && blnEffectiveToMatch && blnStatusMatch;
    });
  }, [dicSearchApplied, lstStructures]);

  const lstTableRows = useMemo(
    () => lstFilteredRows.map((dicRow) => ({
      id: dicRow.intID,
      strRecordUUID: dicRow.strRecordUUID,
      strStructureCode: dicRow.strStructureCode,
      strStructureNameSort: dicRow.strStructureName,
      strStructureName: (
        <Link
          className="app-master-first-column-link"
          component="button"
          type="button"
          underline="none"
          data-controlid="salary-structures.list.row.name.link"
          data-row-key={String(dicRow.intID)}
          onClick={() => objRouter.push(`/salary-structures/edit/${dicRow.strRecordUUID}?backRoute=${encodeURIComponent(strCurrentListRoute)}`)}
        >
          {dicRow.strStructureName}
        </Link>
      ),
      strScopeLabel: dicRow.strScopeLabel,
      strCurrencyCode: dicRow.strCurrencyCode,
      dtEffectiveFrom: formatDate(dicRow.dtEffectiveFrom),
      dtEffectiveTo: formatDate(dicRow.dtEffectiveTo),
      strEffectiveFromSort: dicRow.dtEffectiveFrom,
      strEffectiveToSort: dicRow.dtEffectiveTo ?? "",
      intComponentCount: dicRow.intComponentCount,
      strStatus: (
        <span data-controlid="salary-structures.list.row.status.pill" data-row-key={String(dicRow.intID)} className={`app-master-status-pill ${dicRow.blnIsActive ? "app-master-status-active" : "app-master-status-inactive"}`}>
          {dicRow.blnIsActive ? t("status_active", "Active") : t("status_inactive", "Inactive")}
        </span>
      ),
      strStatusSort: dicRow.blnIsActive ? t("status_active", "Active") : t("status_inactive", "Inactive")
    })),
    [lstFilteredRows, objRouter, strCurrentListRoute, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "strStructureName", headerName: t("structure_name", "Structure Name"), width: 220, sortAccessor: (dicRow) => String(dicRow.strStructureNameSort) },
      { field: "strStructureCode", headerName: t("structure_code", "Structure Code") },
      { field: "strScopeLabel", headerName: t("scope", "Scope") },
      { field: "strCurrencyCode", headerName: t("currency", "Currency") },
      { field: "dtEffectiveFrom", headerName: t("effective_from", "Effective From"), sortAccessor: (dicRow) => dicRow.strEffectiveFromSort },
      { field: "dtEffectiveTo", headerName: t("effective_to", "Effective To"), sortAccessor: (dicRow) => dicRow.strEffectiveToSort },
      { field: "intComponentCount", headerName: t("components", "Components"), align: "right" },
      { field: "strStatus", headerName: t("status", "Status"), filterable: false, width: 140, sortAccessor: (dicRow) => dicRow.strStatusSort }
    ],
    [t]
  );

  function showToast(strMessage: string, strSeverity: ToastState["strSeverity"] = "success") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  function closeToast() {
    setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }));
  }

  function applySearch(dicSearch: SearchForm) {
    const dicNextSearch = {
      ...dicSearch,
      query: dicSearch.query.trim(),
    };
    setDicSearchDraft(dicNextSearch);
    setDicSearchApplied(dicNextSearch);
    objRouter.replace(buildSalaryStructureListUrl(dicNextSearch));
  }

  function handleSearchTextKeyDown(objEvent: KeyboardEvent<HTMLInputElement>) {
    if (objEvent.key === "Enter") {
      objEvent.preventDefault();
      applySearch(dicSearchDraft);
    }
  }

  return (
    <Box className={styles.page} data-controlid="salary-structures.list.page">
      <Box className={styles.topBar}>
        <Button data-controlid="salary-structures.list.back.button" className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>
          {t("back_button", "Back")}
        </Button>
      </Box>

      <Breadcrumbs className="app-breadcrumbs" aria-label="breadcrumb" separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />}>
        <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>{t("breadcrumb_salary", "Salary")}</Typography>
        <Typography component="h1" className="app-breadcrumb-heading" aria-current="page">{t("breadcrumb_salary_structures", "Salary Structures")}</Typography>
      </Breadcrumbs>

      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none", overflowX: "auto" }}>
        {strRightsError ? <Typography data-controlid="salary-structures.list.rights-error.message" sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? (
          <Typography data-controlid="salary-structures.list.read-only.message" sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>
            {t("read_only_mode", "You have view-only access for Salary Structure.")}
          </Typography>
        ) : null}

        <Box
          className={`${styles.searchRow} ${styles.salaryStructureSearchRow}`}
          aria-busy={blnLoading || blnRightsLoading}
          sx={{
            alignItems: "center",
          }}
        >
          <TextField
            className="app-mui-text-field"
            data-controlid="salary-structures.list.search-name.input"
            inputProps={{ "data-controlid": "salary-structures.list.search-name.input" }}
            label={t("search_structure_name_or_code_label", "Search structure name or code")}
            value={dicSearchDraft.query}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, query: objEvent.target.value }))}
            onKeyDown={handleSearchTextKeyDown}
            placeholder={t("search_structure_name_or_code", "Search structure name or code")}
            size="small"
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }}
            disabled={blnLoading || blnRightsLoading}
            fullWidth
          />

          <TextField
            className="app-mui-text-field"
            data-controlid="salary-structures.list.search-effective-from.input"
            inputProps={{ "data-controlid": "salary-structures.list.search-effective-from.input" }}
            label={t("effective_from", "Effective From")}
            type="date"
            value={dicSearchDraft.dtEffectiveFrom}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, dtEffectiveFrom: objEvent.target.value }))}
            onKeyDown={handleSearchTextKeyDown}
            size="small"
            InputLabelProps={{ shrink: true }}
            disabled={blnLoading || blnRightsLoading}
            fullWidth
          />

          <TextField
            className="app-mui-text-field"
            data-controlid="salary-structures.list.search-effective-to.input"
            inputProps={{ "data-controlid": "salary-structures.list.search-effective-to.input" }}
            label={t("effective_to", "Effective To")}
            type="date"
            value={dicSearchDraft.dtEffectiveTo}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, dtEffectiveTo: objEvent.target.value }))}
            onKeyDown={handleSearchTextKeyDown}
            size="small"
            InputLabelProps={{ shrink: true }}
            disabled={blnLoading || blnRightsLoading}
            fullWidth
          />

          <TextField
            className="app-mui-text-field"
            data-controlid="salary-structures.list.search-status.select"
            inputProps={{ "data-controlid": "salary-structures.list.search-status.select" }}
            select
            label={t("status", "Status")}
            value={dicSearchDraft.strStatus}
            onChange={(objEvent) => setDicSearchDraft((dicPrev) => ({ ...dicPrev, strStatus: objEvent.target.value as SearchForm["strStatus"] }))}
            size="small"
            disabled={blnLoading || blnRightsLoading}
            fullWidth
          >
            <MenuItem data-controlid="salary-structures.list.search-status.all.option" value="All">{t("all_status", "All statuses")}</MenuItem>
            <MenuItem data-controlid="salary-structures.list.search-status.active.option" value="Active">{t("status_active", "Active")}</MenuItem>
            <MenuItem data-controlid="salary-structures.list.search-status.inactive.option" value="Inactive">{t("status_inactive", "Inactive")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button
              data-controlid="salary-structures.list.search.button"
              className={styles.primaryButton}
              size="small"
              startIcon={<SearchRoundedIcon />}
              onClick={() => applySearch(dicSearchDraft)}
              disabled={blnLoading || blnRightsLoading}
            >
              {t("search_button", "Search")}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button
              data-controlid="salary-structures.list.clear.button"
              className={styles.secondaryButton}
              size="small"
              startIcon={<ClearRoundedIcon />}
              onClick={() => applySearch(dicEmptySearch)}
              disabled={blnLoading || blnRightsLoading}
            >
              {t("clear_button", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {blnLoading || blnRightsLoading ? (
          <SalaryStructureGridSkeleton />
        ) : !blnCanView ? (
          <Box className={styles.emptyState} data-controlid="salary-structures.list.access-denied.state">
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("access_denied", "Salary structure access is not available for your user group.")}</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>{t("access_denied_help", "Contact your administrator if you need salary structure visibility.")}</Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName="salary_structures"
            showExportOptions={blnCanExport}
            showPaginationSummary
            emptyMessage={t("no_salary_structures_found", "No salary structures found.")}
            toolbarLeft={(
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                {blnCanAdd ? (
                  <Button data-controlid="salary-structures.list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push(`/salary-structures/add?backRoute=${encodeURIComponent(strCurrentListRoute)}`)} disabled={blnLoading || blnRightsLoading}>
                    {t("add_salary_structure", "Add Salary Structure")}
                  </Button>
                ) : null}
              </Box>
            )}
            testIdPrefix="salary-structures.list"
            onRowClick={(dicRow) => {
              if (!blnCanEdit && !blnCanView) return;
              objRouter.push(`/salary-structures/edit/${dicRow.strRecordUUID}?backRoute=${encodeURIComponent(strCurrentListRoute)}`);
            }}
            minTableWidth={1100}
            hideRowClickHint
            getRowSx={() => ({
              "&.MuiTableRow-hover:hover": { backgroundColor: "#f8fbff" },
              "&.MuiTableRow-hover:hover td:nth-of-type(1) .MuiLink-root": { textDecoration: "underline" },
            })}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        )}
      </Box>

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
