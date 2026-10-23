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
  Snackbar,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DottedLoader } from "@/components/shared/BlockingLoader";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { MasterBreadcrumbs, MasterGridSkeleton, MasterStatusPill, dicMasterRowSx, onSearchEnter } from "@/components/master/MasterListUi";
import masterStyles from "@/components/master/MasterScreen.module.css";
import CommonPayrollDialog from "@/features/payroll/components/CommonPayrollDialog";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
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
const lstStatutoryRuleModuleCodes = ["STATUTORY_RULE", "STATUTORY_RULES", "PAYROLL_STATUTORY_RULE", "PAYROLL_STATUTORY_RULES"];

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

export default function StatutoryRuleListPage() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("statutory-rules");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstStatutoryRuleModuleCodes);
  const [lstRules, setLstRules] = useState<StatutoryRuleListRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [objPreviewRule, setObjPreviewRule] = useState<StatutoryRuleDetailRecord | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  const blnCanView = canViewAny() || canDoAny("list");
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanExport = canDoAny("export");
  const blnBusy = blnLoading || blnRightsLoading;

  async function loadRules(objFilters: SearchForm = dicSearchApplied) {
    if (!blnCanView) {
      setLstRules([]);
      setBlnLoading(false);
      return;
    }

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
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load statutory rules.");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }

    loadRules().catch(() => undefined);
  }, [blnRightsLoading, blnCanView]);

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

  // Edit when the user may, otherwise the read-only preview.
  function openRule(intRuleID: number) {
    if (blnCanEdit) {
      objRouter.push(`/payroll/statutory-rules/${intRuleID}/edit`);
      return;
    }
    openPreview(intRuleID).catch(() => undefined);
  }

  function applySearch() {
    if (blnBusy) return;
    setDicSearchApplied(dicSearchDraft);
    loadRules(dicSearchDraft).catch(() => undefined);
  }

  const lstTableRows = useMemo(
    () =>
      lstFilteredRows.map((dicRow) => ({
        id: dicRow.intID,
        strRuleCodeSort: dicRow.strRuleCode,
        strRuleCode: (
          <Link
            className="app-master-first-column-link"
            component="button"
            type="button"
            underline="none"
            data-controlid="statutory-rules.list.row.code.link"
            data-row-key={String(dicRow.intID)}
            onClick={(objEvent) => { objEvent.stopPropagation(); openRule(dicRow.intID); }}
          >
            {dicRow.strRuleCode}
          </Link>
        ),
        strRuleLabel: dicRow.strRuleLabel,
        strScopeLabel: dicRow.strScopeLabel,
        dtEffectiveFrom: formatDate(dicRow.dtEffectiveFrom),
        dtEffectiveFromSort: dicRow.dtEffectiveFrom ? new Date(dicRow.dtEffectiveFrom).getTime() : 0,
        decRuleValue: dicRow.decRuleValue ?? "-",
        strStatusText: dicRow.blnIsActive ? "Active" : "Inactive",
        blnIsActive: <MasterStatusPill blnActive={dicRow.blnIsActive} strActiveLabel={t("status_active", "Active")} strInactiveLabel={t("status_inactive", "Inactive")} />,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [blnCanEdit, lstFilteredRows, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "strRuleCode", headerName: t("rule_code", "Rule Code"), width: 180, sortAccessor: (dicRow) => dicRow.strRuleCodeSort },
      { field: "strRuleLabel", headerName: t("rule_name", "Rule") },
      { field: "strScopeLabel", headerName: t("scope", "Scope"), width: 160 },
      { field: "dtEffectiveFrom", headerName: t("effective_from", "Effective From"), width: 150, sortAccessor: (dicRow) => dicRow.dtEffectiveFromSort },
      { field: "decRuleValue", headerName: t("numeric_value", "Numeric Value"), width: 150, align: "right" },
      { field: "blnIsActive", headerName: t("status", "Status"), filterable: false, width: 130, sortAccessor: (dicRow) => dicRow.strStatusText },
    ],
    [t]
  );

  return (
    <Box className={masterStyles.page}>
      <MasterBreadcrumbs strSection={t("breadcrumb_section", "Payroll")} strTitle={t("breadcrumb_title", "Statutory Rules")} />

      <Box className={masterStyles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Box
          className={masterStyles.searchRow}
          aria-busy={blnBusy}
          onKeyDown={onSearchEnter(applySearch)}
          sx={{
            alignItems: "center",
            "&&": { gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "minmax(220px, 1.4fr) minmax(160px, 0.8fr) minmax(160px, 0.8fr) max-content max-content" } },
            "& .MuiButton-root": { alignSelf: "center", whiteSpace: "nowrap" },
          }}
        >
          <TextField
            className="app-mui-text-field"
            size="small"
            controlId="statutory-rules.list.search-code.input"
            label={t("rule_code", "Rule Code")}
            value={dicSearchDraft.strSearchCode}
            onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchCode: objEvent.target.value }))}
            placeholder={t("search_code_placeholder", "Search by rule code")}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#94a3b8" }} /></InputAdornment> }}
            disabled={blnBusy}
            fullWidth
          />
          <TextField
            className="app-mui-text-field"
            size="small"
            select
            label={t("scope", "Scope")}
            value={dicSearchDraft.strScopeType}
            onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strScopeType: objEvent.target.value as SearchForm["strScopeType"] }))}
            disabled={blnBusy}
            fullWidth
          >
            <MenuItem value="all">{t("scope_all", "All scopes")}</MenuItem>
            <MenuItem value="tenant">{t("scope_tenant", "Tenant-wide")}</MenuItem>
            <MenuItem value="company">{t("scope_company", "Company-specific")}</MenuItem>
          </TextField>
          <TextField
            className="app-mui-text-field"
            size="small"
            select
            label={t("status", "Status")}
            value={dicSearchDraft.strStatus}
            onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: objEvent.target.value as SearchForm["strStatus"] }))}
            disabled={blnBusy}
            fullWidth
          >
            <MenuItem value="All">{t("status_all", "All statuses")}</MenuItem>
            <MenuItem value="Active">{t("status_active", "Active")}</MenuItem>
            <MenuItem value="Inactive">{t("status_inactive", "Inactive")}</MenuItem>
          </TextField>
          <Box className={masterStyles.searchActions}>
            <Button controlId="statutory-rules.list.search.button" className={masterStyles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={applySearch} disabled={blnBusy}>
              {t("search", "Search")}
            </Button>
          </Box>
          <Box className={masterStyles.searchActions}>
            <Button
              controlId="statutory-rules.list.clear.button"
              className={masterStyles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicSearchDraft(dicEmptySearch);
                setDicSearchApplied(dicEmptySearch);
                loadRules(dicEmptySearch).catch(() => undefined);
              }}
              disabled={blnBusy}
            >
              {t("clear", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      {strRightsError ? <Alert severity="warning">{strRightsError}</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}

      <Box className={masterStyles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {blnBusy ? (
          <MasterGridSkeleton strControlId="statutory-rules.list.skeleton" intColumns={6} />
        ) : !blnCanView ? (
          <Box className={masterStyles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("access_denied", "Statutory rule access is not available for your user group.")}</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>{t("access_denied_help", "Contact your administrator if you need statutory rule visibility.")}</Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName="statutory-rules"
            showExportOptions={blnCanExport}
            showPaginationSummary
            emptyMessage={t("empty_message", "No statutory rules found for the current filters.")}
            testIdPrefix="statutory-rules.list"
            toolbarLeft={blnCanAdd ? (
              <Button
                controlId="statutory-rules.list.add.button"
                className={masterStyles.primaryButton}
                startIcon={<AddRoundedIcon />}
                onClick={() => objRouter.push("/payroll/statutory-rules/new")}
              >
                {t("add_button", "Add Rule")}
              </Button>
            ) : undefined}
            onRowClick={(dicRow) => openRule(dicRow.id)}
            minTableWidth={900}
            hideRowClickHint
            getRowSx={() => dicMasterRowSx}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        )}
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
        ) : <DottedLoader intSize={20} />}
      />

      <Snackbar open={objToast.blnOpen} autoHideDuration={3200} onClose={closeToast}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
