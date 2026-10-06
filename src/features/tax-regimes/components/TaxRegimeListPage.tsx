"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  InputAdornment,
  Link,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { MasterBreadcrumbs, MasterGridSkeleton, MasterMoreFilters, MasterStatusPill, dicMasterRowSx, onSearchEnter } from "@/components/master/MasterListUi";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useTaxRegimeLabels } from "@/features/tax-regimes/hooks/useTaxRegimeLabels";
import { taxRegimeService } from "@/features/tax-regimes/services/taxRegimeService";
import type { TaxRegimeListRecord } from "@/features/tax-regimes/types";

type Status = "Active" | "Inactive";
type SearchForm = {
  strName: string;
  strCode: string;
  strCountryCode: string;
  strTaxYearCode: string;
  strStatus: "All" | Status;
};

const lstTaxRegimeModuleCodes = ["TAX_REGIME", "TAX_REGIMES", "MASTER_TAX_REGIME", "TAX_SLAB", "TAX_SLABS", "MASTER_TAX_SLAB"];
const dicEmptySearch: SearchForm = {
  strName: "",
  strCode: "",
  strCountryCode: "",
  strTaxYearCode: "",
  strStatus: "All",
};

function matchesSearch(dicRow: TaxRegimeListRecord, dicSearch: SearchForm) {
  const strName = dicSearch.strName.trim().toLowerCase();
  const strCode = dicSearch.strCode.trim().toLowerCase();
  const strCountryCode = dicSearch.strCountryCode.trim().toLowerCase();
  const strTaxYearCode = dicSearch.strTaxYearCode.trim().toLowerCase();
  const blnNameMatch = !strName || dicRow.strRegimeName.toLowerCase().includes(strName);
  const blnCodeMatch = !strCode || dicRow.strRegimeCode.toLowerCase().includes(strCode);
  const blnCountryMatch = !strCountryCode || dicRow.strCountryCode.toLowerCase().includes(strCountryCode);
  const blnYearMatch = !strTaxYearCode || dicRow.strTaxYearCode.toLowerCase().includes(strTaxYearCode);
  const blnStatusMatch = dicSearch.strStatus === "All" || (dicSearch.strStatus === "Active" ? dicRow.blnIsActive : !dicRow.blnIsActive);
  return blnNameMatch && blnCodeMatch && blnCountryMatch && blnYearMatch && blnStatusMatch;
}

export default function TaxRegimeListPage() {
  const objRouter = useRouter();
  const { t } = useTaxRegimeLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstTaxRegimeModuleCodes);
  const [lstRegimes, setLstRegimes] = useState<TaxRegimeListRecord[]>([]);
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [strError, setStrError] = useState("");
  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanExport = canDoAny("export");
  const blnReadOnly = isReadOnly();

  useEffect(() => {
    if (blnRightsLoading || !blnCanView) {
      setBlnLoading(blnRightsLoading);
      return;
    }
    let blnMounted = true;
    async function loadTaxRegimes() {
      setBlnLoading(true);
      setStrError("");
      try {
        const lstRecords = await taxRegimeService.getTaxRegimes();
        if (blnMounted) {
          setLstRegimes(lstRecords);
        }
      } catch (objError) {
        if (blnMounted) {
          setStrError(objError instanceof Error ? objError.message : t("load_tax_regimes_failed", "Unable to load tax regimes."));
        }
      } finally {
        if (blnMounted) {
          setBlnLoading(false);
        }
      }
    }
    loadTaxRegimes().catch(() => undefined);
    return () => {
      blnMounted = false;
    };
  }, [blnRightsLoading, blnCanView]);

  const lstFilteredRows = useMemo(
    () => lstRegimes.filter((dicRow) => matchesSearch(dicRow, dicSearchApplied)),
    [dicSearchApplied, lstRegimes],
  );

  function openRegime(strRecordUUID: string) {
    objRouter.push(`/payroll/tax-regimes/edit/${strRecordUUID}`);
  }

  const lstTableRows = useMemo(
    () =>
      lstFilteredRows.map((dicRow) => ({
        id: dicRow.intID,
        strRecordUUID: dicRow.strRecordUUID,
        strRegimeCodeSort: dicRow.strRegimeCode,
        strRegimeCode: (
          <Link
            className="app-master-first-column-link"
            component="button"
            type="button"
            underline="none"
            data-controlid="tax-regimes.list.row.code.link"
            data-row-key={String(dicRow.intID)}
            onClick={(objEvent) => { objEvent.stopPropagation(); openRegime(dicRow.strRecordUUID); }}
          >
            {dicRow.strRegimeCode}
          </Link>
        ),
        strRegimeName: (
          <Box>
            <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>{dicRow.strRegimeName}</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>{dicRow.strRegimeTypeDisplay}</Typography>
          </Box>
        ),
        strCountryCode: dicRow.strCountryCode,
        strTaxYearCode: dicRow.strTaxYearCode || "-",
        decStandardDeductionAmount: dicRow.blnStandardDeductionEnabled ? dicRow.decStandardDeductionAmount.toLocaleString() : "-",
        decStandardDeductionAmountSortValue: dicRow.blnStandardDeductionEnabled ? Number(dicRow.decStandardDeductionAmount ?? 0) : 0,
        blnIsDefaultRegime: <MasterStatusPill blnActive={dicRow.blnIsDefaultRegime} strActiveLabel={t("yes", "Yes")} strInactiveLabel={t("no", "No")} />,
        blnAllowEmployeeOptOut: dicRow.blnAllowEmployeeOptOut ? t("yes", "Yes") : t("no", "No"),
        intSlabProfiles: `${dicRow.intSlabProfileCount} / ${dicRow.intSlabCount}`,
        blnIsActive: <MasterStatusPill blnActive={dicRow.blnIsActive} strActiveLabel={t("active", "Active")} strInactiveLabel={t("inactive", "Inactive")} />,
      })),
    [lstFilteredRows, objRouter, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "strRegimeCode", headerName: t("regime_code", "Regime Code"), width: 130, sortAccessor: (dicRow) => dicRow.strRegimeCodeSort },
      { field: "strRegimeName", headerName: t("regime_name", "Regime Name"), sortable: false, filterable: false, width: 130 },
      { field: "strCountryCode", headerName: t("country", "Country"), width: 130 },
      { field: "strTaxYearCode", headerName: t("tax_year", "Tax Year") },
      { field: "decStandardDeductionAmount", headerName: t("standard_deduction", "Standard Deduction"), align: "right", sortAccessor: (dicRow) => dicRow.decStandardDeductionAmountSortValue },
      { field: "blnIsDefaultRegime", headerName: t("default_regime", "Default Regime"), sortable: false, filterable: false, width: 150 },
      { field: "blnAllowEmployeeOptOut", headerName: t("employee_opt_out", "Employee Opt-Out") },
      { field: "intSlabProfiles", headerName: t("slab_profiles", "Slab Profiles / Slab Count") },
      { field: "blnIsActive", headerName: t("status", "Status"), sortable: false, filterable: false, width: 130 },
    ],
    [t]
  );

  const blnBusy = blnLoading || blnRightsLoading;
  const intActiveMoreFilters = (dicSearchDraft.strCountryCode.trim() ? 1 : 0) + (dicSearchDraft.strTaxYearCode.trim() ? 1 : 0);

  function applySearch() {
    if (blnBusy) return;
    setDicSearchApplied(dicSearchDraft);
  }

  return (
    <Box className={styles.page}>
      <MasterBreadcrumbs strSection={t("breadcrumb_section", "Payroll")} strTitle={t("breadcrumb_title", "Tax Regimes")} />

      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Box
          className={styles.searchRow}
          aria-busy={blnBusy}
          onKeyDown={onSearchEnter(applySearch)}
          sx={{
            alignItems: "center",
            "&&": { gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "minmax(160px, 1fr) minmax(200px, 1.3fr) minmax(150px, 0.8fr) max-content max-content max-content" } },
            "& .MuiButton-root": { alignSelf: "center", whiteSpace: "nowrap" },
          }}
        >
          <TextField className="app-mui-text-field" label={t("regime_code", "Regime Code")} value={dicSearchDraft.strCode} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strCode: objEvent.target.value }))} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }} size="small" disabled={blnBusy} fullWidth />
          <TextField className="app-mui-text-field" label={t("regime_name", "Regime Name")} value={dicSearchDraft.strName} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strName: objEvent.target.value }))} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }} size="small" disabled={blnBusy} fullWidth />
          <TextField className="app-mui-text-field" select label={t("status", "Status")} value={dicSearchDraft.strStatus} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: objEvent.target.value as SearchForm["strStatus"] }))} size="small" disabled={blnBusy} fullWidth>
            <MenuItem value="All">{t("all", "All")}</MenuItem>
            <MenuItem value="Active">{t("active", "Active")}</MenuItem>
            <MenuItem value="Inactive">{t("inactive", "Inactive")}</MenuItem>
          </TextField>
          <MasterMoreFilters
            strControlPrefix="tax-regimes.list"
            intActiveCount={intActiveMoreFilters}
            blnDisabled={blnBusy}
            onApply={applySearch}
            onClearAll={() => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strCountryCode: "", strTaxYearCode: "" }))}
            onCancel={() => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strCountryCode: dicSearchApplied.strCountryCode, strTaxYearCode: dicSearchApplied.strTaxYearCode }))}
          >
            <TextField className="app-mui-text-field" label={t("country", "Country")} value={dicSearchDraft.strCountryCode} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strCountryCode: objEvent.target.value }))} size="small" fullWidth />
            <TextField className="app-mui-text-field" label={t("tax_year", "Tax Year")} value={dicSearchDraft.strTaxYearCode} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strTaxYearCode: objEvent.target.value }))} size="small" fullWidth />
          </MasterMoreFilters>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={applySearch} disabled={blnBusy}>
              {t("search", "Search")}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); }} disabled={blnBusy}>
              {t("clear", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strRightsError && !blnCanView && !blnBusy ? <Alert severity="warning">{strRightsError}</Alert> : null}
      {blnReadOnly ? <Alert severity="info">{t("read_only_mode", "You have view-only access for Tax Regimes.")}</Alert> : null}

      <Box className={styles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <BlockingLoader blnOpen={blnSubmitting} strLabel={t("processing", "Processing tax regime request...")} />
        {blnBusy ? (
          <MasterGridSkeleton strControlId="tax-regimes.list.skeleton" intColumns={9} />
        ) : !blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
              {t("access_denied", "Tax regime access is not available for your user group.")}
            </Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>
              {t("access_denied_help", "Contact your administrator if you need tax regime visibility.")}
            </Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName="tax_regimes"
            showExportOptions={blnCanExport}
            showPaginationSummary
            emptyMessage={t("no_records", "No tax regimes found.")}
            testIdPrefix="tax-regimes.list"
            toolbarLeft={blnCanAdd ? (
              <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/payroll/tax-regimes/add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>
                {t("add_tax_regime", "Add Tax Regime")}
              </Button>
            ) : undefined}
            onRowClick={(dicRow) => openRegime(dicRow.strRecordUUID)}
            minTableWidth={1250}
            hideRowClickHint
            getRowSx={() => dicMasterRowSx}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        )}
      </Box>
    </Box>
  );
}
