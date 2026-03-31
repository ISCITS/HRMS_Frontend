"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ToggleOnRoundedIcon from "@mui/icons-material/ToggleOnRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Pagination,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import { useSalaryComponentLabels } from "@/features/salary-components/hooks/useSalaryComponentLabels";
import { salaryComponentService } from "@/features/salary-components/services/salaryComponentService";
import type { SalaryComponentListRecord } from "@/features/salary-components/types";

const lstRowsPerPageOptions = [10, 20, 50];

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
  const [lstComponents, setLstComponents] = useState<SalaryComponentListRecord[]>([]);
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

  async function loadComponents() {
    setBlnLoading(true);
    setStrError("");
    try {
      setLstComponents(await salaryComponentService.getSalaryComponents());
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load salary components.");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    loadComponents().catch(() => undefined);
  }, []);

  const lstFilteredRows = useMemo(() => {
    return lstComponents.filter((dicRow) => {
      const blnNameMatch = !dicAppliedSearch.strName || dicRow.strComponentName.toLowerCase().includes(dicAppliedSearch.strName.toLowerCase());
      const blnCodeMatch = !dicAppliedSearch.strCode || dicRow.strComponentCode.toLowerCase().includes(dicAppliedSearch.strCode.toLowerCase());
      const blnStatusMatch =
        dicAppliedSearch.strStatus === "All" ||
        (dicAppliedSearch.strStatus === "Active" ? dicRow.blnIsActive : !dicRow.blnIsActive);
      return blnNameMatch && blnCodeMatch && blnStatusMatch;
    });
  }, [dicAppliedSearch, lstComponents]);

  const intPageCount = Math.max(1, Math.ceil(lstFilteredRows.length / intRowsPerPage));
  const intResolvedPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intResolvedPage - 1) * intRowsPerPage;
  const lstVisibleRows = lstFilteredRows.slice(intStartIndex, intStartIndex + intRowsPerPage);

  async function handleStatusToggle(dicRow: SalaryComponentListRecord) {
    try {
      await salaryComponentService.setSalaryComponentStatus(dicRow.intID, !dicRow.blnIsActive);
      setStrSuccess(`Salary component ${!dicRow.blnIsActive ? "activated" : "deactivated"} successfully.`);
      await loadComponents();
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to update salary component status.");
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
            placeholder={t("search_component_name", "Search component name")}
            fullWidth
          />
          <TextField
            value={dicSearch.strCode}
            onChange={(objEvent) => setDicSearch((dicPrev) => ({ ...dicPrev, strCode: objEvent.target.value.toUpperCase() }))}
            placeholder={t("search_component_code", "Search component code")}
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
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicAppliedSearch(dicSearch); setIntPage(1); }}>
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
            <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/salary-components/add")}>
              {t("add_component", "Add Component")}
            </Button>
            <Button
              className={styles.secondaryButton}
              startIcon={<DownloadRoundedIcon />}
              onClick={() => downloadCsv("salary_components.csv", lstFilteredRows)}
            >
              {t("export_excel", "Export Excel")}
            </Button>
            <Button
              className={styles.secondaryButton}
              startIcon={<DownloadRoundedIcon />}
              onClick={() => exportPdf(t("salary_component_title", "Salary Components"), lstFilteredRows)}
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
            <Pagination count={intPageCount} page={intResolvedPage} onChange={(_, intNextPage) => setIntPage(intNextPage)} size="small" color="primary" showFirstButton showLastButton />
          </Box>
        ) : null}
        </Box>

        {blnLoading ? (
          <Box className={styles.emptyState}>
            <CircularProgress size={24} />
            <Typography sx={{ mt: 1 }}>{t("loading_salary_components", "Loading salary components...")}</Typography>
          </Box>
        ) : (
          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
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
                    <td className={styles.emptyState} colSpan={13}>{t("no_salary_components_found", "No salary components found.")}</td>
                  </tr>
                ) : lstVisibleRows.map((dicRow) => (
                  <tr key={dicRow.intID}>
                    <td>
                      <Box className={styles.actionCell}>
                        <button
                          className={`${styles.iconButton} ${styles.editIcon}`}
                          type="button"
                          onClick={() => objRouter.push(`/salary-components/edit/${dicRow.intID}`)}
                          title={t("action_edit", "Edit")}
                        >
                          <EditRoundedIcon fontSize="small" />
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
                ))}
              </tbody>
            </table>
          </Box>
        )}
      </Box>
    </Box>
  );
}
