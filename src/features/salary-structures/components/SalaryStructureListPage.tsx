"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ToggleOnRoundedIcon from "@mui/icons-material/ToggleOnRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Pagination,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import { useSalaryStructureLabels } from "@/features/salary-structures/hooks/useSalaryStructureLabels";
import {
  createCloneForm,
  salaryStructureService
} from "@/features/salary-structures/services/salaryStructureService";
import type {
  SalaryStructureCloneValues,
  SalaryStructureDetailRecord,
  SalaryStructureListRecord
} from "@/features/salary-structures/types";

const lstRowsPerPageOptions = [10, 20, 50];

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

function downloadCsv(strFileName: string, lstRows: SalaryStructureListRecord[]) {
  const lstHeaders = [
    "Code",
    "Structure Name",
    "Scope",
    "Currency",
    "Effective From",
    "Effective To",
    "Components",
    "Status"
  ];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) =>
      [
        dicRow.strStructureCode,
        dicRow.strStructureName,
        dicRow.strScopeLabel,
        dicRow.strCurrencyCode,
        formatDate(dicRow.dtEffectiveFrom),
        formatDate(dicRow.dtEffectiveTo),
        dicRow.intComponentCount,
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

function exportPdf(strTitle: string, lstRows: SalaryStructureListRecord[]) {
  const objWindow = window.open("", "_blank", "width=1400,height=900");
  if (!objWindow) {
    return;
  }

  const strRows = lstRows.map((dicRow) => `
    <tr>
      <td>${dicRow.strStructureCode}</td>
      <td>${dicRow.strStructureName}</td>
      <td>${dicRow.strScopeLabel}</td>
      <td>${dicRow.strCurrencyCode}</td>
      <td>${formatDate(dicRow.dtEffectiveFrom)}</td>
      <td>${formatDate(dicRow.dtEffectiveTo)}</td>
      <td>${dicRow.intComponentCount}</td>
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
              <th>Structure Name</th>
              <th>Scope</th>
              <th>Currency</th>
              <th>Effective From</th>
              <th>Effective To</th>
              <th>Components</th>
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

export default function SalaryStructureListPage() {
  const objRouter = useRouter();
  const { t } = useSalaryStructureLabels();
  const [lstStructures, setLstStructures] = useState<SalaryStructureListRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const [dicSearch, setDicSearch] = useState({
    strName: "",
    strCode: "",
    strStatus: "All"
  });
  const [dicAppliedSearch, setDicAppliedSearch] = useState(dicSearch);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
  const [blnCloneOpen, setBlnCloneOpen] = useState(false);
  const [objCloneSource, setObjCloneSource] = useState<SalaryStructureDetailRecord | null>(null);
  const [dicCloneForm, setDicCloneForm] = useState<SalaryStructureCloneValues | null>(null);
  const [blnCloneSaving, setBlnCloneSaving] = useState(false);

  async function loadStructures() {
    setBlnLoading(true);
    setStrError("");
    try {
      setLstStructures(await salaryStructureService.getSalaryStructures());
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load salary structures.");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    loadStructures().catch(() => undefined);
  }, []);

  const lstFilteredRows = useMemo(() => {
    return lstStructures.filter((dicRow) => {
      const blnNameMatch = !dicAppliedSearch.strName || dicRow.strStructureName.toLowerCase().includes(dicAppliedSearch.strName.toLowerCase());
      const blnCodeMatch = !dicAppliedSearch.strCode || dicRow.strStructureCode.toLowerCase().includes(dicAppliedSearch.strCode.toLowerCase());
      const blnStatusMatch =
        dicAppliedSearch.strStatus === "All" ||
        (dicAppliedSearch.strStatus === "Active" ? dicRow.blnIsActive : !dicRow.blnIsActive);
      return blnNameMatch && blnCodeMatch && blnStatusMatch;
    });
  }, [dicAppliedSearch, lstStructures]);

  const intPageCount = Math.max(1, Math.ceil(lstFilteredRows.length / intRowsPerPage));
  const intResolvedPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intResolvedPage - 1) * intRowsPerPage;
  const lstVisibleRows = lstFilteredRows.slice(intStartIndex, intStartIndex + intRowsPerPage);

  async function handleStatusToggle(dicRow: SalaryStructureListRecord) {
    try {
      await salaryStructureService.setSalaryStructureStatus(dicRow.intID, !dicRow.blnIsActive);
      setStrSuccess(`Salary structure ${!dicRow.blnIsActive ? "activated" : "deactivated"} successfully.`);
      await loadStructures();
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to update salary structure status.");
    }
  }

  async function handleCloneOpen(intSalaryStructureID: number) {
    try {
      setStrError("");
      const dicDetail = await salaryStructureService.getSalaryStructureById(intSalaryStructureID);
      setObjCloneSource(dicDetail);
      setDicCloneForm(createCloneForm(dicDetail));
      setBlnCloneOpen(true);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load salary structure for clone.");
    }
  }

  async function handleCloneSave() {
    if (!objCloneSource || !dicCloneForm) {
      return;
    }
    if (!dicCloneForm.strStructureCode.trim() || !dicCloneForm.strStructureName.trim() || !dicCloneForm.dtEffectiveFrom) {
      setStrError("Clone code, clone name, and effective from date are required.");
      return;
    }
    setBlnCloneSaving(true);
    try {
      const dicRecord = await salaryStructureService.cloneSalaryStructure(objCloneSource.intID, dicCloneForm);
      setBlnCloneOpen(false);
      setStrSuccess("Salary structure cloned successfully.");
      objRouter.push(`/salary-structures/edit/${dicRecord.intID}`);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to clone salary structure.");
    } finally {
      setBlnCloneSaving(false);
    }
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.controlsCard}>
        {strError ? <Alert severity="error" sx={{ mt: 1.25 }} onClose={() => setStrError("")}>{strError}</Alert> : null}
        {strSuccess ? <Alert severity="success" sx={{ mt: 1.25 }} onClose={() => setStrSuccess("")}>{strSuccess}</Alert> : null}

        <Box className={styles.searchRow}>
          <TextField
            value={dicSearch.strName}
            onChange={(objEvent) => setDicSearch((dicPrev) => ({ ...dicPrev, strName: objEvent.target.value }))}
            placeholder={t("search_structure_name", "Search structure name")}
            fullWidth
          />
          <TextField
            value={dicSearch.strCode}
            onChange={(objEvent) => setDicSearch((dicPrev) => ({ ...dicPrev, strCode: objEvent.target.value.toUpperCase() }))}
            placeholder={t("search_structure_code", "Search structure code")}
            fullWidth
          />
          <TextField
            select
            value={dicSearch.strStatus}
            onChange={(objEvent) => setDicSearch((dicPrev) => ({ ...dicPrev, strStatus: objEvent.target.value }))}
            fullWidth
          >
            <MenuItem value="All">{t("all_status", "All Status")}</MenuItem>
            <MenuItem value="Active">{t("status_active", "Active")}</MenuItem>
            <MenuItem value="Inactive">{t("status_inactive", "Inactive")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button
              className={styles.primaryButton}
              startIcon={<SearchRoundedIcon />}
              onClick={() => {
                setDicAppliedSearch(dicSearch);
                setIntPage(1);
              }}
            >
              {t("search_button", "Search")}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                const dicDefaultSearch = { strName: "", strCode: "", strStatus: "All" };
                setDicSearch(dicDefaultSearch);
                setDicAppliedSearch(dicDefaultSearch);
                setIntPage(1);
              }}
            >
              {t("clear_button", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 1 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/salary-structures/add")}>
              {t("add_salary_structure", "Add Salary Structure")}
            </Button>
            <Button
              className={styles.secondaryButton}
              startIcon={<DownloadRoundedIcon />}
              onClick={() => downloadCsv("salary_structures.csv", lstFilteredRows)}
            >
              {t("export_excel", "Export Excel")}
            </Button>
            <Button
              className={styles.secondaryButton}
              startIcon={<DownloadRoundedIcon />}
              onClick={() => exportPdf(t("salary_structure_title", "Salary Structures"), lstFilteredRows)}
            >
              {t("export_pdf", "Export PDF")}
            </Button>
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
                {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFilteredRows.length)} of {lstFilteredRows.length}
              </Typography>
            </Box>
            <Pagination
              count={intPageCount}
              page={intResolvedPage}
              onChange={(_, intNextPage) => setIntPage(intNextPage)}
              size="small"
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        ) : null}
        </Box>

        {blnLoading ? (
          <Box className={styles.emptyState}>
            <CircularProgress size={24} />
            <Typography sx={{ mt: 1 }}>Loading {t("salary_structure_title", "Salary Structures").toLowerCase()}...</Typography>
          </Box>
        ) : (
          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("action", "Action")}</th>
                  <th>{t("code", "Code")}</th>
                  <th>{t("structure_name", "Structure Name")}</th>
                  <th>{t("scope", "Scope")}</th>
                  <th>{t("currency", "Currency")}</th>
                  <th>{t("effective_from", "Effective From")}</th>
                  <th>{t("effective_to", "Effective To")}</th>
                  <th>{t("components", "Components")}</th>
                  <th>{t("status", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {lstFilteredRows.length === 0 ? (
                  <tr>
                    <td className={styles.emptyState} colSpan={9}>
                      {t("no_salary_structures_found", "No salary structures found.")}
                    </td>
                  </tr>
                ) : lstVisibleRows.map((dicRow) => (
                  <tr key={dicRow.intID}>
                    <td>
                      <Box className={styles.actionCell}>
                        <button
                          className={`${styles.iconButton} ${styles.editIcon}`}
                          type="button"
                          onClick={() => objRouter.push(`/salary-structures/edit/${dicRow.intID}`)}
                          title={t("action_edit", "Edit")}
                        >
                          <EditRoundedIcon fontSize="small" />
                        </button>
                        <button
                          className={`${styles.iconButton} ${styles.editIcon}`}
                          type="button"
                          onClick={() => handleCloneOpen(dicRow.intID)}
                          title={t("clone_button", "Clone")}
                        >
                          <ContentCopyRoundedIcon fontSize="small" />
                        </button>
                        <button
                          className={`${styles.iconButton} ${styles.toggleIcon}`}
                          type="button"
                          onClick={() => handleStatusToggle(dicRow)}
                          title={dicRow.blnIsActive ? t("deactivate_button", "Deactivate") : t("activate_button", "Activate")}
                        >
                          <ToggleOnRoundedIcon fontSize="small" />
                        </button>
                      </Box>
                    </td>
                    <td>{dicRow.strStructureCode}</td>
                    <td>{dicRow.strStructureName}</td>
                    <td>{dicRow.strScopeLabel}</td>
                    <td>{dicRow.strCurrencyCode}</td>
                    <td>{formatDate(dicRow.dtEffectiveFrom)}</td>
                    <td>{formatDate(dicRow.dtEffectiveTo)}</td>
                    <td>{dicRow.intComponentCount}</td>
                    <td>
                      <span className={`${styles.statusPill} ${dicRow.blnIsActive ? styles.statusActive : styles.statusInactive}`}>
                        {dicRow.blnIsActive
                          ? t("status_active", "Active")
                          : t("status_inactive", "Inactive")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}
      </Box>

      <Dialog open={blnCloneOpen} onClose={() => !blnCloneSaving && setBlnCloneOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Clone Salary Structure</DialogTitle>
        <DialogContent>
          {dicCloneForm ? (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.92rem" }}>
                Create a new structure by copying component configuration and multilingual text from <strong>{objCloneSource?.strStructureName}</strong>.
              </Typography>
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
                <TextField
                  label="New Structure Code"
                  value={dicCloneForm.strStructureCode}
                  onChange={(objEvent) => setDicCloneForm((dicPrev) => dicPrev ? { ...dicPrev, strStructureCode: objEvent.target.value.toUpperCase() } : dicPrev)}
                  fullWidth
                />
                <TextField
                  label="New Structure Name"
                  value={dicCloneForm.strStructureName}
                  onChange={(objEvent) => setDicCloneForm((dicPrev) => dicPrev ? { ...dicPrev, strStructureName: objEvent.target.value } : dicPrev)}
                  fullWidth
                />
                <TextField
                  label="Effective From"
                  type="date"
                  value={dicCloneForm.dtEffectiveFrom}
                  onChange={(objEvent) => setDicCloneForm((dicPrev) => dicPrev ? { ...dicPrev, dtEffectiveFrom: objEvent.target.value } : dicPrev)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="Effective To"
                  type="date"
                  value={dicCloneForm.dtEffectiveTo}
                  onChange={(objEvent) => setDicCloneForm((dicPrev) => dicPrev ? { ...dicPrev, dtEffectiveTo: objEvent.target.value } : dicPrev)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setBlnCloneOpen(false)} disabled={blnCloneSaving}>{t("cancel_button", "Cancel")}</Button>
          <Button variant="contained" onClick={handleCloneSave} disabled={blnCloneSaving}>
            {blnCloneSaving ? "Cloning..." : "Clone Structure"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
