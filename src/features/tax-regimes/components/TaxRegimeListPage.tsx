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
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
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

  const lstTableRows = useMemo(
    () =>
      lstFilteredRows.map((dicRow) => ({
        id: dicRow.intID,
        action: (
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
        ),
        strRegimeCode: dicRow.strRegimeCode,
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
        blnIsDefaultRegime: (
          <span className={`${styles.statusPill} ${dicRow.blnIsDefaultRegime ? styles.statusActive : styles.statusInactive}`}>
            {dicRow.blnIsDefaultRegime ? t("yes", "Yes") : t("no", "No")}
          </span>
        ),
        blnAllowEmployeeOptOut: dicRow.blnAllowEmployeeOptOut ? t("yes", "Yes") : t("no", "No"),
        intSlabProfiles: `${dicRow.intSlabProfileCount} / ${dicRow.intSlabCount}`,
        blnIsActive: (
          <span className={`${styles.statusPill} ${dicRow.blnIsActive ? styles.statusActive : styles.statusInactive}`}>
            {dicRow.blnIsActive ? t("active", "Active") : t("inactive", "Inactive")}
          </span>
        ),
      })),
    [blnCanEdit, blnCanView, lstFilteredRows, objRouter, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "action", headerName: t("actions", "Actions"), sortable: false, filterable: false, exportable: false, width: 280 },
      { field: "strRegimeCode", headerName: t("regime_code", "Regime Code"), width: 130 },
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

  if (blnLoading || blnRightsLoading) {
    return <BlockingLoader blnOpen strLabel={t("loading_tax_regimes", "Loading tax regimes...")} />;
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
        <Box
          className={styles.searchRow}
          sx={{
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(180px, 0.75fr) repeat(4, minmax(170px, 1fr))",
            },
          }}
        >
          <TextField label={t("regime_code", "Regime Code")} value={dicSearchDraft.strCode} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strCode: objEvent.target.value }))} size="small" fullWidth />
          <TextField label={t("regime_name", "Regime Name")} value={dicSearchDraft.strName} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strName: objEvent.target.value }))} size="small" fullWidth />
          <TextField label={t("country", "Country")} value={dicSearchDraft.strCountryCode} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strCountryCode: objEvent.target.value }))} size="small" fullWidth />
          <TextField label={t("tax_year", "Tax Year")} value={dicSearchDraft.strTaxYearCode} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strTaxYearCode: objEvent.target.value }))} size="small" fullWidth />
          <TextField select label={t("status", "Status")} value={dicSearchDraft.strStatus} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: objEvent.target.value as SearchForm["strStatus"] }))} size="small" fullWidth>
            <MenuItem value="All">{t("all", "All")}</MenuItem>
            <MenuItem value="Active">{t("active", "Active")}</MenuItem>
            <MenuItem value="Inactive">{t("inactive", "Inactive")}</MenuItem>
          </TextField>
          <Box
            className={styles.searchActions}
            sx={{
              gridColumn: { xs: "auto", md: "auto" },
              flexWrap: "nowrap",
              alignItems: "center",
            }}
          >
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); }}>
              {t("search", "Search")}
            </Button>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); }}>
              {t("clear", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {blnReadOnly ? <Alert severity="info">{t("read_only_mode", "You have view-only access for Tax Regimes.")}</Alert> : null}

      <Box className={styles.tableCard}>
        <BlockingLoader blnOpen={blnSubmitting} strLabel={t("processing", "Processing tax regime request...")} />
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
          sx={{ p: 0, boxShadow: "none", background: "transparent" }}
        />
      </Box>
    </Stack>
  );
}
