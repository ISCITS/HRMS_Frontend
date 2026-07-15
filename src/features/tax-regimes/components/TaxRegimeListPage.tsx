"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import RuleFolderRoundedIcon from "@mui/icons-material/RuleFolderRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Pagination,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonRowActions from "@/components/master/CommonRowActions";
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
const lstRowsPerPageOptions = [10, 20, 50];
const dicEmptySearch: SearchForm = {
  strName: "",
  strCode: "",
  strCountryCode: "",
  strTaxYearCode: "",
  strStatus: "All",
};

function downloadCsv(strFileName: string, lstRows: TaxRegimeListRecord[], t: (strKey: string, strFallback?: string) => string) {
  const lstHeaders = [
    t("regime_code", "Regime Code"),
    t("regime_name", "Regime Name"),
    t("country", "Country"),
    t("tax_year", "Tax Year"),
    t("standard_deduction", "Standard Deduction"),
    t("default_regime", "Default Regime"),
    t("employee_opt_out", "Employee Opt-Out"),
    t("slab_profiles", "Slab Profiles / Slab Count"),
    t("status", "Status"),
  ];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) =>
      [
        dicRow.strRegimeCode,
        dicRow.strRegimeName,
        dicRow.strCountryCode,
        dicRow.strTaxYearCode,
        dicRow.blnStandardDeductionEnabled ? dicRow.decStandardDeductionAmount : 0,
        dicRow.blnIsDefaultRegime ? "Yes" : "No",
        dicRow.blnAllowEmployeeOptOut ? "Yes" : "No",
        `${dicRow.intSlabProfileCount} / ${dicRow.intSlabCount}`,
        dicRow.blnIsActive ? "Active" : "Inactive",
      ]
        .map((strValue) => `"${String(strValue).replace(/"/g, '""')}"`)
        .join(","),
    ),
  ];
  const objBlob = new Blob([lstLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const strUrl = URL.createObjectURL(objBlob);
  const objLink = document.createElement("a");
  objLink.href = strUrl;
  objLink.download = strFileName;
  objLink.click();
  URL.revokeObjectURL(strUrl);
}

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
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
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
          setIntPage(1);
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

  const intPageCount = Math.max(1, Math.ceil(lstFilteredRows.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleRows = lstFilteredRows.slice(intStartIndex, intStartIndex + intRowsPerPage);

  if (blnLoading || blnRightsLoading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: "#64748b" }}>{t("loading_tax_regimes", "Loading tax regimes...")}</Typography>
        </Stack>
      </Box>
    );
  }

  if (!blnCanView) {
    return (
      <Box className={styles.emptyState}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
          {t("access_denied", "Tax regime access is not available for your user group.")}
        </Typography>
        <Typography sx={{ mt: 1, color: "#64748b" }}>
          {t("access_denied_help", "Contact your administrator if you need tax regime visibility.")}
        </Typography>
        {strRightsError ? <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
      </Box>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ height: "100%", overflow: "auto", pr: 0.5 }}>
      <Box className={styles.controlsCard}>
        <Box className={styles.searchRow}>
          <TextField label={t("regime_code", "Regime Code")} value={dicSearchDraft.strCode} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strCode: objEvent.target.value }))} size="small" />
          <TextField label={t("regime_name", "Regime Name")} value={dicSearchDraft.strName} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strName: objEvent.target.value }))} size="small" />
          <TextField label={t("country", "Country")} value={dicSearchDraft.strCountryCode} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strCountryCode: objEvent.target.value }))} size="small" />
          <TextField label={t("tax_year", "Tax Year")} value={dicSearchDraft.strTaxYearCode} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strTaxYearCode: objEvent.target.value }))} size="small" />
          <TextField select label={t("status", "Status")} value={dicSearchDraft.strStatus} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: objEvent.target.value as SearchForm["strStatus"] }))} size="small">
            <MenuItem value="All">{t("all", "All")}</MenuItem>
            <MenuItem value="Active">{t("active", "Active")}</MenuItem>
            <MenuItem value="Inactive">{t("inactive", "Inactive")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); setIntPage(1); }}>
              {t("search", "Search")}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); setIntPage(1); }}>
              {t("clear", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {blnReadOnly ? <Alert severity="info">{t("read_only_mode", "You have view-only access for Tax Regimes.")}</Alert> : null}

      <Box className={styles.tableCard}>
        <BlockingLoader blnOpen={blnSubmitting} strLabel={t("processing", "Processing tax regime request...")} />
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 1 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {blnCanAdd ? (
              <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/payroll/tax-regimes/add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>
                {t("add_tax_regime", "Add Tax Regime")}
              </Button>
            ) : null}
            {blnCanExport ? (
              <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv("tax_regimes.csv", lstFilteredRows, t)} disabled={blnLoading || blnSubmitting || blnRightsLoading}>
                {t("export_excel", "Export Excel")}
              </Button>
            ) : null}
          </Box>

          {lstFilteredRows.length > 0 ? (
            <Box className={styles.paginationBar} sx={{ p: 0, justifyContent: { xs: "flex-start", md: "flex-end" } }}>
              <Box className={styles.paginationInfo}>
                <Typography className={styles.paginationLabel}>{t("rows_per_page", "Rows per page")}</Typography>
                <TextField select size="small" value={String(intRowsPerPage)} onChange={(objEvent) => { setIntRowsPerPage(Number(objEvent.target.value)); setIntPage(1); }} className={styles.rowsPerPageSelect}>
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

        <Box className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("actions", "Actions")}</th>
                <th>{t("regime_code", "Regime Code")}</th>
                <th>{t("regime_name", "Regime Name")}</th>
                <th>{t("country", "Country")}</th>
                <th>{t("tax_year", "Tax Year")}</th>
                <th>{t("standard_deduction", "Standard Deduction")}</th>
                <th>{t("default_regime", "Default Regime")}</th>
                <th>{t("employee_opt_out", "Employee Opt-Out")}</th>
                <th>{t("slab_profiles", "Slab Profiles / Slab Count")}</th>
                <th>{t("status", "Status")}</th>
              </tr>
            </thead>
            <tbody>
              {lstFilteredRows.length === 0 ? (
                <tr>
                  <td className={styles.emptyState} colSpan={10}>{t("no_records", "No tax regimes found.")}</td>
                </tr>
              ) : lstVisibleRows.map((dicRow) => (
                <tr key={dicRow.intID}>
                  <td>
                    <Box className={styles.actionCell}>
                      <CommonRowActions
                        testIdPrefix="tax-regimes.list.row"
                        rowKey={dicRow.intID}
                        blnCanView={blnCanView}
                        blnCanEdit={blnCanEdit}
                        onView={() => objRouter.push(`/payroll/tax-regimes/edit/${dicRow.intID}?mode=view`)}
                        onEdit={blnCanEdit ? () => objRouter.push(`/payroll/tax-regimes/edit/${dicRow.intID}`) : undefined}
                      />
                      <Button variant="outlined" size="small" startIcon={<ReceiptLongRoundedIcon />} onClick={() => objRouter.push(`/payroll/tax-regimes/edit/${dicRow.intID}/slabs`)} sx={{ borderRadius: "10px", textTransform: "none", minWidth: "auto" }}>
                        {t("manage_slabs", "Slabs")}
                      </Button>
                      <Button variant="outlined" size="small" startIcon={<RuleFolderRoundedIcon />} onClick={() => objRouter.push(`/payroll/tax-regimes/edit/${dicRow.intID}`)} sx={{ borderRadius: "10px", textTransform: "none", minWidth: "auto" }}>
                        {t("manage_tax_rules", "Tax Rules")}
                      </Button>
                    </Box>
                  </td>
                  <td>{dicRow.strRegimeCode}</td>
                  <td>
                    <Box>
                      <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>{dicRow.strRegimeName}</Typography>
                      <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>{dicRow.strRegimeTypeDisplay}</Typography>
                    </Box>
                  </td>
                  <td>{dicRow.strCountryCode}</td>
                  <td>{dicRow.strTaxYearCode || "-"}</td>
                  <td>{dicRow.blnStandardDeductionEnabled ? dicRow.decStandardDeductionAmount.toLocaleString() : "-"}</td>
                  <td><span className={`${styles.statusPill} ${dicRow.blnIsDefaultRegime ? styles.statusActive : styles.statusInactive}`}>{dicRow.blnIsDefaultRegime ? t("yes", "Yes") : t("no", "No")}</span></td>
                  <td>{dicRow.blnAllowEmployeeOptOut ? t("yes", "Yes") : t("no", "No")}</td>
                  <td>{dicRow.intSlabProfileCount} / {dicRow.intSlabCount}</td>
                  <td><span className={`${styles.statusPill} ${dicRow.blnIsActive ? styles.statusActive : styles.statusInactive}`}>{dicRow.blnIsActive ? t("active", "Active") : t("inactive", "Inactive")}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Box>
    </Stack>
  );
}
