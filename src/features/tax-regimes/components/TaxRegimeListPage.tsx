"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Pagination,
  Snackbar,
  Stack,
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
import { useTaxRegimeLabels } from "@/features/tax-regimes/hooks/useTaxRegimeLabels";
import { taxRegimeService } from "@/features/tax-regimes/services/taxRegimeService";
import type { TaxRegimeListRecord } from "@/features/tax-regimes/types";

type Status = "Active" | "Inactive";
type SearchForm = {
  strName: string;
  strCode: string;
  strStatus: "All" | Status;
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

const lstTaxRegimeModuleCodes = ["TAX_REGIME", "TAX_REGIMES", "MASTER_TAX_REGIME", "TAX_SLAB", "TAX_SLABS", "MASTER_TAX_SLAB"];
const lstRowsPerPageOptions = [10, 20, 50];
const dicEmptySearch: SearchForm = { strName: "", strCode: "", strStatus: "All" };

function downloadCsv(strFileName: string, lstRows: TaxRegimeListRecord[]) {
  const lstHeaders = ["Regime Code", "Regime Name", "Country", "Slabs", "Status"];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) =>
      [
        dicRow.strRegimeCode,
        dicRow.strRegimeName,
        dicRow.strCountryCode,
        dicRow.intSlabCount,
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

function exportPdf(strTitle: string, lstRows: TaxRegimeListRecord[]) {
  const objWindow = window.open("", "_blank", "width=1200,height=800");
  if (!objWindow) {
    return;
  }

  const strRows = lstRows.map((dicRow) => `
    <tr>
      <td>${dicRow.strRegimeCode}</td>
      <td>${dicRow.strRegimeName}</td>
      <td>${dicRow.strCountryCode}</td>
      <td>${dicRow.intSlabCount}</td>
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
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
          th { background: #e2e8f0; }
        </style>
      </head>
      <body>
        <h1>${strTitle}</h1>
        <table>
          <thead>
            <tr>
              <th>Regime Code</th>
              <th>Regime Name</th>
              <th>Country</th>
              <th>Slabs</th>
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

export default function TaxRegimeListPage() {
  const objRouter = useRouter();
  const { t } = useTaxRegimeLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstTaxRegimeModuleCodes);
  const [lstRegimes, setLstRegimes] = useState<TaxRegimeListRecord[]>([]);
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  async function loadTaxRegimes() {
    if (!canViewAny()) {
      setLstRegimes([]);
      setIntPage(1);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      setLstRegimes(await taxRegimeService.getTaxRegimes());
      setIntPage(1);
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : t("load_tax_regimes_failed", "Unable to load tax regimes."), "error");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }
    loadTaxRegimes().catch(() => undefined);
  }, [blnRightsLoading]);

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanExport = canDoAny("export");
  const blnReadOnly = isReadOnly();

  const lstFilteredRows = useMemo(() => {
    return lstRegimes.filter((dicRow) => {
      const blnNameMatch = !dicSearchApplied.strName || dicRow.strRegimeName.toLowerCase().includes(dicSearchApplied.strName.toLowerCase());
      const blnCodeMatch = !dicSearchApplied.strCode || dicRow.strRegimeCode.toLowerCase().includes(dicSearchApplied.strCode.toLowerCase());
      const blnStatusMatch =
        dicSearchApplied.strStatus === "All" ||
        (dicSearchApplied.strStatus === "Active" ? dicRow.blnIsActive : !dicRow.blnIsActive);
      return blnNameMatch && blnCodeMatch && blnStatusMatch;
    });
  }, [dicSearchApplied, lstRegimes]);

  const intPageCount = Math.max(1, Math.ceil(lstFilteredRows.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleRows = lstFilteredRows.slice(intStartIndex, intStartIndex + intRowsPerPage);

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
      showToast(objError instanceof Error ? objError.message : t("request_failed", "Request failed."), "error");
    } finally {
      setBlnSubmitting(false);
      closeConfirmDialog();
    }
  }

  function toggleStatus(dicRow: TaxRegimeListRecord) {
    openConfirmDialog({
      strTitle: dicRow.blnIsActive ? t("deactivate_title", "Deactivate Tax Regime") : t("activate_title", "Activate Tax Regime"),
      strMessage: dicRow.blnIsActive
        ? t("deactivate_message", "Are you sure you want to mark this tax regime as inactive?")
        : t("activate_message", "Are you sure you want to mark this tax regime as active?"),
      strConfirmLabel: dicRow.blnIsActive ? t("deactivate", "Deactivate") : t("activate", "Activate"),
      fnOnConfirm: async () => {
        await taxRegimeService.setTaxRegimeStatus(dicRow.intID, !dicRow.blnIsActive);
        await loadTaxRegimes();
        showToast(t("status_updated", "Tax regime status updated successfully."));
      }
    });
  }

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
            <Button
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicSearchDraft(dicEmptySearch);
                setDicSearchApplied(dicEmptySearch);
                setIntPage(1);
              }}
            >
              {t("clear", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

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
              <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv("tax_regimes.csv", lstFilteredRows)} disabled={blnLoading || blnSubmitting || blnRightsLoading}>
                {t("export_excel", "Export Excel")}
              </Button>
            ) : null}
            {blnCanExport ? (
              <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf(t("tax_regimes_title", "Tax Regimes"), lstFilteredRows)} disabled={blnLoading || blnSubmitting || blnRightsLoading}>
                {t("export_pdf", "Export PDF")}
              </Button>
            ) : null}
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

        <Box className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("actions", "Actions")}</th>
                <th>{t("regime_code", "Regime Code")}</th>
                <th>{t("regime_name", "Regime Name")}</th>
                <th>{t("country", "Country")}</th>
                <th>{t("slabs", "Slabs")}</th>
                <th>{t("status", "Status")}</th>
              </tr>
            </thead>
            <tbody>
              {lstFilteredRows.length === 0 ? (
                <tr>
                  <td className={styles.emptyState} colSpan={6}>{t("no_records", "No tax regimes found.")}</td>
                </tr>
              ) : lstVisibleRows.map((dicRow) => (
                <tr key={dicRow.intID}>
                  <td>
                    <Box className={styles.actionCell}>
                      <CommonRowActions
                        blnCanView={blnCanView}
                        blnCanEdit={blnCanEdit}
                        blnCanToggle={blnCanEdit}
                        onView={() => objRouter.push(`/payroll/tax-regimes/edit/${dicRow.intID}?mode=view`)}
                        onEdit={blnCanEdit ? () => objRouter.push(`/payroll/tax-regimes/edit/${dicRow.intID}`) : undefined}
                        onToggle={blnCanEdit ? () => toggleStatus(dicRow) : undefined}
                      />
                      {(blnCanView || blnCanEdit) ? (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<ReceiptLongRoundedIcon />}
                          onClick={() => objRouter.push(`/payroll/tax-regimes/edit/${dicRow.intID}/slabs`)}
                          sx={{ borderRadius: "10px", textTransform: "none", minWidth: "auto" }}
                        >
                          {t("manage_slabs", "Slabs")}
                        </Button>
                      ) : null}
                    </Box>
                  </td>
                  <td>{dicRow.strRegimeCode}</td>
                  <td>
                    <Box>
                      <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>{dicRow.strRegimeName}</Typography>
                      <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>
                        {dicRow.strCountryCode === "IN"
                          ? t("india_first_hint", "India-first regime design")
                          : t("country_ready_hint", "Country-ready regime design")}
                      </Typography>
                    </Box>
                  </td>
                  <td>{dicRow.strCountryCode}</td>
                  <td>{dicRow.intSlabCount}</td>
                  <td>
                    <span className={`${styles.statusPill} ${dicRow.blnIsActive ? styles.statusActive : styles.statusInactive}`}>
                      {dicRow.blnIsActive ? t("active", "Active") : t("inactive", "Inactive")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Box>

      <CommonConfirmDialog
        blnOpen={Boolean(objConfirmDialog)}
        strTitle={objConfirmDialog?.strTitle ?? ""}
        strMessage={objConfirmDialog?.strMessage ?? ""}
        strCancelLabel={t("cancel", "Cancel")}
        strConfirmLabel={objConfirmDialog?.strConfirmLabel ?? t("confirm", "Confirm")}
        blnConfirmDisabled={blnSubmitting}
        blnCancelDisabled={blnSubmitting}
        onClose={closeConfirmDialog}
        onConfirm={executeConfirmedAction}
      />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
