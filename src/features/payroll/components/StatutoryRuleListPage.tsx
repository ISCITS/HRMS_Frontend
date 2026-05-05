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
  CircularProgress,
  MenuItem,
  Pagination,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonRowActions from "@/components/master/CommonRowActions";
import CommonPayrollDialog from "@/features/payroll/components/CommonPayrollDialog";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import {
  statutoryRuleService,
} from "@/features/payroll/services/statutoryRuleService";
import type { StatutoryRuleDetailRecord, StatutoryRuleListRecord } from "@/features/payroll/types";

type SearchForm = {
  strSearchCode: string;
  strScopeType: "all" | "tenant" | "company";
  strStatus: "All" | "Active" | "Inactive";
};

type ToastState = {
  blnOpen: boolean;
  strMessage: string;
  strSeverity: "success" | "error";
};

const dicEmptySearch: SearchForm = {
  strSearchCode: "",
  strScopeType: "all",
  strStatus: "All",
};
const lstRowsPerPageOptions = [10, 20, 50];

function formatDate(strDate: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(strDate));
}

function formatJson(objValue: unknown) {
  if (!objValue) {
    return "No advanced JSON config";
  }
  return JSON.stringify(objValue, null, 2);
}

function downloadCsv(strFileName: string, lstRows: StatutoryRuleListRecord[]) {
  const lstHeaders = ["Rule", "Scope", "Effective From", "Numeric Value", "Status"];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) =>
      [
        dicRow.strRuleCode,
        dicRow.strScopeLabel,
        dicRow.dtEffectiveFrom,
        dicRow.decRuleValue ?? "",
        dicRow.blnIsActive ? "Active" : "Inactive",
      ]
        .map((strValue) => `"${String(strValue).replace(/"/g, '""')}"`)
        .join(",")
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

function exportPdf(strTitle: string, lstRows: StatutoryRuleListRecord[]) {
  const objWindow = window.open("", "_blank", "width=1200,height=800");
  if (!objWindow) {
    return;
  }
  const strRows = lstRows
    .map(
      (dicRow) => `
    <tr>
      <td>${dicRow.strRuleCode}</td>
      <td>${dicRow.strRuleLabel}</td>
      <td>${dicRow.strScopeLabel}</td>
      <td>${dicRow.dtEffectiveFrom}</td>
      <td>${dicRow.decRuleValue ?? "-"}</td>
      <td>${dicRow.blnIsActive ? "Active" : "Inactive"}</td>
    </tr>
  `
    )
    .join("");
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
              <th>Rule Code</th>
              <th>Rule</th>
              <th>Scope</th>
              <th>Effective From</th>
              <th>Numeric Value</th>
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

export default function StatutoryRuleListPage() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("statutory-rules");
  const [lstRules, setLstRules] = useState<StatutoryRuleListRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
  const [objPreviewRule, setObjPreviewRule] = useState<StatutoryRuleDetailRecord | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  async function loadRules(objFilters: SearchForm = dicSearchApplied) {
    setBlnLoading(true);
    setStrError("");
    try {
      setLstRules(
        await statutoryRuleService.getStatutoryRules({
          strSearchCode: objFilters.strSearchCode,
          strScopeType: objFilters.strScopeType,
          strStatus: objFilters.strStatus,
        })
      );
      setIntPage(1);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load statutory rules.");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    loadRules().catch(() => undefined);
  }, []);

  const lstFilteredRows = useMemo(() => {
    return lstRules.filter((dicRow) => {
      const blnCodeMatch =
        !dicSearchApplied.strSearchCode ||
        dicRow.strRuleCode.toLowerCase().includes(dicSearchApplied.strSearchCode.toLowerCase()) ||
        dicRow.strRuleLabel.toLowerCase().includes(dicSearchApplied.strSearchCode.toLowerCase());
      const blnScopeMatch =
        dicSearchApplied.strScopeType === "all" || dicRow.strScopeType === dicSearchApplied.strScopeType;
      const blnStatusMatch =
        dicSearchApplied.strStatus === "All" ||
        (dicSearchApplied.strStatus === "Active" ? dicRow.blnIsActive : !dicRow.blnIsActive);
      return blnCodeMatch && blnScopeMatch && blnStatusMatch;
    });
  }, [dicSearchApplied, lstRules]);

  const intPageCount = Math.max(1, Math.ceil(lstFilteredRows.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleRows = lstFilteredRows.slice(intStartIndex, intStartIndex + intRowsPerPage);
  const strRangeLabel =
    lstFilteredRows.length === 0
      ? `0 ${t("pagination_separator", "of")} 0`
      : `${intStartIndex + 1}-${Math.min(intStartIndex + intRowsPerPage, lstFilteredRows.length)} ${t("pagination_separator", "of")} ${lstFilteredRows.length}`;

  function showToast(strMessage: string, strSeverity: ToastState["strSeverity"] = "success") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  function closeToast() {
    setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }));
  }

  async function openPreview(intRuleID: number) {
    try {
      setObjPreviewRule(await statutoryRuleService.getStatutoryRuleById(intRuleID));
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : "Unable to load statutory rule.", "error");
    }
  }

  if (blnLoading) {
    return <BlockingLoader blnOpen strLabel={t("loading_rules", "Loading statutory rules...")} />;
  }

  return (
    <Box className={styles.page}>
      <Typography className={`${styles.breadcrumbs} ${styles.hiddenHeader}`}>{t("breadcrumbs", "Payroll / Statutory Rules")}</Typography>
      <Box className={`${styles.topBar} ${styles.hiddenHeader}`}>
        <Button className={styles.secondaryButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/payroll")}>
          {t("back_button", "Back to Payroll")}
        </Button>
      </Box>

      <Box className={styles.controlsCard}>
        <Box className={styles.searchRow}>
          <TextField
            value={dicSearchDraft.strSearchCode}
            onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchCode: objEvent.target.value }))}
            placeholder={t("search_code_placeholder", "Search by rule code")}
            fullWidth
          />
          <TextField
            select
            value={dicSearchDraft.strScopeType}
            onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strScopeType: objEvent.target.value as SearchForm["strScopeType"] }))}
            fullWidth
          >
            <MenuItem value="all">{t("scope_all", "All scopes")}</MenuItem>
            <MenuItem value="tenant">{t("scope_tenant", "Tenant-wide")}</MenuItem>
            <MenuItem value="company">{t("scope_company", "Company-specific")}</MenuItem>
          </TextField>
          <TextField
            select
            value={dicSearchDraft.strStatus}
            onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: objEvent.target.value as SearchForm["strStatus"] }))}
            fullWidth
          >
            <MenuItem value="All">{t("status_all", "All statuses")}</MenuItem>
            <MenuItem value="Active">{t("status_active", "Active")}</MenuItem>
            <MenuItem value="Inactive">{t("status_inactive", "Inactive")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button
              className={styles.primaryButton}
              startIcon={<SearchRoundedIcon />}
              onClick={() => {
                setDicSearchApplied(dicSearchDraft);
                loadRules(dicSearchDraft).catch(() => undefined);
              }}
            >
              {t("search", "Search")}
            </Button>
            <Button
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicSearchDraft(dicEmptySearch);
                setDicSearchApplied(dicEmptySearch);
                loadRules(dicEmptySearch).catch(() => undefined);
              }}
            >
              {t("clear", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard}>
        <Box className={styles.listUtilityBar}>
          <Box className={styles.listUtilityActions}>
            <Button
              className={styles.primaryButton}
              startIcon={<AddRoundedIcon />}
              onClick={() => objRouter.push("/payroll/statutory-rules/new")}
            >
              {t("add_button", "Add Rule")}
            </Button>
            <Button
              className={styles.secondaryButton}
              startIcon={<DownloadRoundedIcon />}
              onClick={() => downloadCsv("statutory-rules.csv", lstFilteredRows)}
            >
              {t("export_excel", "Export Excel")}
            </Button>
            <Button
              className={styles.secondaryButton}
              startIcon={<DownloadRoundedIcon />}
              onClick={() => exportPdf("Statutory Rules", lstFilteredRows)}
            >
              {t("export_pdf", "Export PDF")}
            </Button>
          </Box>

          <Box className={styles.paginationBar} sx={{ p: 0 }}>
            <Box className={styles.paginationInfo}>
              <Typography>{t("rows_per_page", "Rows per page")}</Typography>
              <TextField
                select
                size="small"
                value={intRowsPerPage}
                onChange={(objEvent) => {
                  setIntRowsPerPage(Number(objEvent.target.value));
                  setIntPage(1);
                }}
                className={styles.rowsPerPageSelect}
                sx={{ width: 92 }}
              >
                {lstRowsPerPageOptions.map((intOption) => (
                  <MenuItem key={intOption} value={intOption}>
                    {intOption}
                  </MenuItem>
                ))}
              </TextField>
              <Typography className={styles.paginationRange}>{strRangeLabel}</Typography>
            </Box>
            <Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intValue) => setIntPage(intValue)} color="primary" size="small" showFirstButton showLastButton />
          </Box>
        </Box>

        {strError ? <Alert severity="error" sx={{ mb: 1.5 }}>{strError}</Alert> : null}
        <Box className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.actionsColumn}>{t("actions", "Actions")}</th>
                <th>{t("rule_code", "Rule Code")}</th>
                <th>{t("rule_name", "Rule")}</th>
                <th>{t("scope", "Scope")}</th>
                <th>{t("effective_from", "Effective From")}</th>
                <th>{t("numeric_value", "Numeric Value")}</th>
                <th>{t("status", "Status")}</th>
              </tr>
            </thead>
            <tbody>
              {lstVisibleRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyState}>
                    {t("empty_message", "No statutory rules found for the current filters.")}
                  </td>
                </tr>
              ) : null}
              {lstVisibleRows.map((dicRow) => (
                <tr key={dicRow.intID}>
                  <td className={styles.actionsColumn}>
                    <Box className={styles.actionCell}>
                      <CommonRowActions
                        blnCanView
                        blnCanEdit
                        onView={() => openPreview(dicRow.intID).catch(() => undefined)}
                        onEdit={() => objRouter.push(`/payroll/statutory-rules/${dicRow.intID}/edit`)}
                      />
                    </Box>
                  </td>
                  <td>{dicRow.strRuleCode}</td>
                  <td>{dicRow.strRuleLabel}</td>
                  <td>{dicRow.strScopeLabel}</td>
                  <td>{formatDate(dicRow.dtEffectiveFrom)}</td>
                  <td>{dicRow.decRuleValue ?? "-"}</td>
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

      </Box>

      <CommonPayrollDialog
        blnOpen={Boolean(objPreviewRule)}
        onClose={() => setObjPreviewRule(null)}
        strTitle={objPreviewRule?.strRuleLabel ?? t("preview_title", "Statutory Rule")}
        strSecondaryLabel={t("close", "Close")}
        blnHidePrimary
        nodeContent={objPreviewRule ? (
          <Stack spacing={2}>
            <Box>
              <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("rule_code", "Rule Code")}</Typography>
              <Typography sx={{ fontWeight: 700 }}>{objPreviewRule.strRuleCode}</Typography>
            </Box>
            <Box>
              <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("scope", "Scope")}</Typography>
              <Typography sx={{ fontWeight: 700 }}>{objPreviewRule.strScopeLabel}</Typography>
            </Box>
            <Box>
              <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("effective_from", "Effective From")}</Typography>
              <Typography sx={{ fontWeight: 700 }}>{formatDate(objPreviewRule.dtEffectiveFrom)}</Typography>
            </Box>
            <Box>
              <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("numeric_value", "Numeric Value")}</Typography>
              <Typography sx={{ fontWeight: 700 }}>{objPreviewRule.decRuleValue ?? "-"}</Typography>
            </Box>
            <Box>
              <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("advanced_json_config", "Advanced JSON Config")}</Typography>
              <Box
                component="pre"
                sx={{
                  mt: 0.75,
                  mb: 0,
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: "#f8fafc",
                  border: "1px solid #d9e6ef",
                  overflowX: "auto",
                  fontSize: "0.82rem",
                }}
              >
                {formatJson(objPreviewRule.objRuleConfig)}
              </Box>
            </Box>
          </Stack>
        ) : <CircularProgress size={20} />}
      />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3200} onClose={closeToast}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
