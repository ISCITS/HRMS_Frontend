"use client";

import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { itDeclarationService, type ItDeclarationDashboardCardDto, type ItDeclarationRegime } from "@/features/it-declaration/services/itDeclarationService";
import ITDeclarationStatusBadge from "@/features/it-declaration/components/ITDeclarationStatusBadge";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import styles from "@/components/master/MasterScreen.module.css";

function formatCurrency(decValue: number) {
  return `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(decValue || 0)}`;
}

function formatDateLabel(strDate?: string | null) {
  if (!strDate) return "-";
  const objDate = new Date(strDate);
  if (Number.isNaN(objDate.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(objDate);
}

function normalizeFinancialYearCode(strValue?: string | null) {
  const strCode = String(strValue || "").trim().toUpperCase().replace("/", "-");
  if (!strCode) return "";
  const strWithoutPrefix = strCode.startsWith("FY ") ? strCode.slice(3).trim() : (strCode.startsWith("FY") ? strCode.slice(2).trim() : strCode);
  const lstParts = strWithoutPrefix.split("-").map((strPart) => strPart.trim()).filter(Boolean);
  if (lstParts.length !== 2) return strWithoutPrefix;
  const [strStart, strEnd] = lstParts;
  if (!/^\d{4}$/.test(strStart) || !/^\d{2,4}$/.test(strEnd)) return strWithoutPrefix;
  if (strEnd.length === 2) return `${strStart}-${strEnd}`;
  return `${strStart}-${strEnd.slice(-2)}`;
}

function getCurrentFinancialYearCode() {
  const objNow = new Date();
  const intYear = objNow.getFullYear();
  const intMonth = objNow.getMonth();
  const intFyStartYear = intMonth >= 3 ? intYear : intYear - 1;
  return `${intFyStartYear}-${String(intFyStartYear + 1).slice(-2)}`;
}

function getNextFinancialYearCode() {
  const strCurrentFy = getCurrentFinancialYearCode();
  const intStartYear = Number(strCurrentFy.split("-")[0] || new Date().getFullYear());
  return `${intStartYear + 1}-${String(intStartYear + 2).slice(-2)}`;
}

function canEditDeclarationByStatus(strStatus?: string | null) {
  const strNormalized = String(strStatus || "").trim().toLowerCase();
  return ["draft", "released", "rejected", "resubmitted"].includes(strNormalized);
}

export default function SalaryEssDeclarationsPage() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("it-declaration");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess([
    "ESS_DECLARATIONS",
  ]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [strCurrentFy, setStrCurrentFy] = useState("");
  const [lstRows, setLstRows] = useState<ItDeclarationDashboardCardDto[]>([]);
  const [strBusyKey, setStrBusyKey] = useState("");
  const [blnAddDialogOpen, setBlnAddDialogOpen] = useState(false);
  const [strAddFy, setStrAddFy] = useState("");
  const [strAddRegime, setStrAddRegime] = useState<ItDeclarationRegime>("Old Regime");
  const [strSearchFy, setStrSearchFy] = useState("");
  const [strSearchRegime, setStrSearchRegime] = useState("");
  const [strSearchStatus, setStrSearchStatus] = useState("All");
  const [dicAppliedFilters, setDicAppliedFilters] = useState({ fy: "", regime: "", status: "All" });
  const blnCanView = canViewAny() || canDoAny("view") || canDoAny("list");
  const blnCanAdd = canDoAny("add") || canDoAny("start") || canDoAny("create");
  const blnCanEdit = canDoAny("edit") || canDoAny("update");

  const getRegimeLabel = (strRegime: string) => {
    if (strRegime === "Old Regime") return t("old_regime", "Old Regime");
    if (strRegime === "New Regime") return t("new_regime", "New Regime");
    return strRegime;
  };

  const getStatusLabel = (strStatus?: string | null) => {
    const strNormalized = String(strStatus || "draft").trim().toLowerCase();
    if (strNormalized === "draft") return t("draft", "Draft");
    if (strNormalized === "submitted") return t("submitted", "Submitted");
    if (strNormalized === "under_review") return t("under_review", "Under Review");
    if (strNormalized === "released") return t("released", "Released");
    if (strNormalized === "resubmitted") return t("resubmitted", "Resubmitted");
    if (strNormalized === "approved") return t("approved", "Approved");
    if (strNormalized === "locked") return t("locked", "Locked");
    if (strNormalized === "rejected") return t("rejected", "Rejected");
    return String(strStatus || t("draft", "Draft"));
  };

  function mapDeclarationToDashboardCard(objDeclaration: Awaited<ReturnType<typeof itDeclarationService.getDeclaration>>, strFallbackFy: string): ItDeclarationDashboardCardDto | null {
    if (!objDeclaration?.intDeclarationID) return null;
    const decDeclaredAmount = (objDeclaration.lstItems || []).reduce(
      (decTotal, objItem) => decTotal + Number(objItem.decDeclaredAmount || 0),
      0,
    );
    const strStatus = String(objDeclaration.strDeclarationStatus || "draft").toLowerCase();
    return {
      intDeclarationID: objDeclaration.intDeclarationID,
      strFinancialYearCode: normalizeFinancialYearCode(objDeclaration.strFinancialYearCode || strFallbackFy),
      strTaxRegime: objDeclaration.strSelectedRegime || "Old Regime",
      strStatus,
      decDeclaredAmount,
      decApprovedAmount: 0,
      strLastUpdated: objDeclaration.strLastUpdated || null,
      blnReadOnly: !["draft", "released", "resubmitted"].includes(strStatus),
      strPrimaryAction: ["draft", "released", "resubmitted"].includes(strStatus) ? "continue" : "view",
    };
  }

  async function loadDashboard() {
    if (!blnCanView) {
      setLstRows([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    setStrError("");
    try {
      const objData = await itDeclarationService.getDashboard();
      const strResolvedCurrentFy = normalizeFinancialYearCode(objData.strCurrentFinancialYearCode || getCurrentFinancialYearCode());
      setStrCurrentFy(strResolvedCurrentFy);

      const intStartYear = Number(strResolvedCurrentFy.split("-")[0] || new Date().getFullYear());
      const lstFyFromDashboard = (objData.lstDeclarations || [])
        .map((objRow) => normalizeFinancialYearCode(objRow.strFinancialYearCode))
        .filter(Boolean);
      const lstFyCandidates = Array.from(new Set<string>([
        ...lstFyFromDashboard,
        strResolvedCurrentFy,
        `${intStartYear - 1}-${String(intStartYear).slice(-2)}`,
        `${intStartYear - 2}-${String(intStartYear - 1).slice(-2)}`,
      ]));

      const lstDeclarations = await Promise.allSettled(
        lstFyCandidates.map((strFy) => itDeclarationService.getDeclaration(strFy))
      );
      const lstRecovered: ItDeclarationDashboardCardDto[] = [];
      for (let intIndex = 0; intIndex < lstDeclarations.length; intIndex += 1) {
        const objResult = lstDeclarations[intIndex];
        if (objResult.status !== "fulfilled") continue;
        const objCard = mapDeclarationToDashboardCard(objResult.value, lstFyCandidates[intIndex]);
        if (objCard) lstRecovered.push(objCard);
      }

      const dicByKey = new Map<string, ItDeclarationDashboardCardDto>();
      for (const objRow of lstRecovered) {
        dicByKey.set(`${objRow.intDeclarationID}-${normalizeFinancialYearCode(objRow.strFinancialYearCode)}`, objRow);
      }
      setLstRows(Array.from(dicByKey.values()).sort((a, b) => b.strFinancialYearCode.localeCompare(a.strFinancialYearCode)));
      return;
    } catch (objError) {
      const strFallbackFy = normalizeFinancialYearCode(getCurrentFinancialYearCode());
      setStrCurrentFy(strFallbackFy);
      let blnFallbackBound = false;
      try {
        const intStartYear = Number(strFallbackFy.split("-")[0] || new Date().getFullYear());
        const lstFyCandidates = [
          `${intStartYear}-${String(intStartYear + 1).slice(-2)}`,
          `${intStartYear - 1}-${String(intStartYear).slice(-2)}`,
          `${intStartYear - 2}-${String(intStartYear - 1).slice(-2)}`,
        ];
        const lstRecovered: ItDeclarationDashboardCardDto[] = [];
        for (const strFy of lstFyCandidates) {
          try {
            const objLegacy = await itDeclarationService.getDeclaration(strFy);
            const objCard = mapDeclarationToDashboardCard(objLegacy, strFy);
            if (objCard) {
              lstRecovered.push(objCard);
            }
          } catch {
            // Ignore missing FY declarations.
          }
        }
        const dicByKey = new Map<string, ItDeclarationDashboardCardDto>();
        for (const objRow of lstRecovered) {
          dicByKey.set(`${objRow.intDeclarationID}-${normalizeFinancialYearCode(objRow.strFinancialYearCode)}`, objRow);
        }
        setLstRows(Array.from(dicByKey.values()).sort((a, b) => b.strFinancialYearCode.localeCompare(a.strFinancialYearCode)));
        blnFallbackBound = true;
      } catch {
        setLstRows([]);
      }
      if (!blnFallbackBound) {
        setStrError(
          objError instanceof Error
            ? objError.message
            : t("unable_load_it_declaration_dashboard", "Unable to load IT declaration dashboard.")
        );
      }
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }
    void loadDashboard();
  }, [blnRightsLoading, blnCanView]);

  const lstCurrentFyRows = useMemo(
    () => lstRows.filter((objRow) => strCurrentFy && normalizeFinancialYearCode(objRow.strFinancialYearCode) === normalizeFinancialYearCode(strCurrentFy)),
    [lstRows, strCurrentFy]
  );
  const lstFilteredRows = useMemo(() => {
    const strFy = dicAppliedFilters.fy.trim().toLowerCase();
    const strRegime = dicAppliedFilters.regime.trim().toLowerCase();
    const strStatus = dicAppliedFilters.status.trim().toLowerCase();
    return lstRows.filter((objRow) => {
      const blnFy = !strFy || normalizeFinancialYearCode(objRow.strFinancialYearCode).toLowerCase().includes(strFy);
      const blnRegime = !strRegime || objRow.strTaxRegime.toLowerCase().includes(strRegime);
      const blnStatus = strStatus === "all" || (objRow.strStatus || "").toLowerCase() === strStatus;
      return blnFy && blnRegime && blnStatus;
    });
  }, [lstRows, dicAppliedFilters]);
  const lstFyOptions = useMemo(() => {
    const strResolvedCurrentFy = normalizeFinancialYearCode(strCurrentFy || getCurrentFinancialYearCode());
    return [
      strResolvedCurrentFy,
      normalizeFinancialYearCode(getNextFinancialYearCode()),
    ].filter(Boolean);
  }, [strCurrentFy]);

  const setDeclaredFy = useMemo(() => {
    const setData = new Set<string>();
    for (const objRow of lstRows) {
      setData.add(normalizeFinancialYearCode(objRow.strFinancialYearCode));
    }
    return setData;
  }, [lstRows]);

  async function openDeclaration(strFinancialYearCode: string, strRegime: string) {
    const strRegimeValue: ItDeclarationRegime = strRegime.toLowerCase().includes("new") ? "New Regime" : "Old Regime";
    objRouter.push(`/salary/it-declaration?fy=${encodeURIComponent(strFinancialYearCode)}&regime=${encodeURIComponent(strRegimeValue)}`);
  }

  async function openCompare(strFinancialYearCode: string, strRegime: string) {
    const strRegimeValue: ItDeclarationRegime = strRegime.toLowerCase().includes("new") ? "New Regime" : "Old Regime";
    objRouter.push(`/salary/it-declaration?fy=${encodeURIComponent(strFinancialYearCode)}&regime=${encodeURIComponent(strRegimeValue)}&compare=1`);
  }

  async function createDeclaration(strRegime: ItDeclarationRegime, strFinancialYearCode?: string) {
    const strFy = strFinancialYearCode || strCurrentFy;
    if (!strFy) return;
    const strKey = `create-${strRegime}-${strFy}`;
    setStrBusyKey(strKey);
    setStrError("");
    try {
      await itDeclarationService.startDeclaration(strFy, strRegime);
      await openDeclaration(strFy, strRegime);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("unable_create_it_declaration", "Unable to create IT declaration."));
    } finally {
      setStrBusyKey("");
    }
  }

  function openAddDeclarationDialog() {
    setStrAddRegime("Old Regime");
    const strDefaultFy = lstFyOptions.find((strFy) => !setDeclaredFy.has(strFy))
      || (lstFyOptions[0] || strCurrentFy || getCurrentFinancialYearCode());
    setStrAddFy(strDefaultFy);
    setBlnAddDialogOpen(true);
  }

  async function createFromDialog() {
    if (!strAddFy) return;
    const strNormalizedFy = normalizeFinancialYearCode(strAddFy);
    const objExistingDeclaration = lstRows.find(
      (objRow) => normalizeFinancialYearCode(objRow.strFinancialYearCode) === strNormalizedFy
    );
    if (objExistingDeclaration) {
      await openDeclaration(objExistingDeclaration.strFinancialYearCode, objExistingDeclaration.strTaxRegime);
      return;
    }
    await createDeclaration(strAddRegime, strNormalizedFy);
  }

  const lstGridRows = useMemo(() => {
    return lstFilteredRows.map((objRow) => ({
      id: objRow.intDeclarationID,
      fy: objRow.strFinancialYearCode,
      regime: getRegimeLabel(objRow.strTaxRegime),
      status: (
        <ITDeclarationStatusBadge strStatus={String(objRow.strStatus || "draft")} strLabel={getStatusLabel(objRow.strStatus)} />
      ),
      declared: formatCurrency(objRow.decDeclaredAmount),
      approved: formatCurrency(objRow.decApprovedAmount),
      lastUpdated: formatDateLabel(objRow.strLastUpdated),
      action: (() => {
        const blnRowGoesToEdit = blnCanEdit && canEditDeclarationByStatus(objRow.strStatus);
        return (
          <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap justifyContent="center">
            <Button
              controlId={`salary.ess-declarations.row.${blnRowGoesToEdit ? "edit" : "view"}.button`}
              data-row-key={objRow.intDeclarationID}
              size="small"
              variant="outlined"
              onClick={() => void openDeclaration(objRow.strFinancialYearCode, objRow.strTaxRegime)}
            >
              {blnRowGoesToEdit ? t("continue", "Continue") : t("view", "View")}
            </Button>
          </Stack>
        );
      })(),
    }));
  }, [blnCanEdit, lstFilteredRows, strBusyKey, t]);

  const lstColumns: CommonTableColumn<(typeof lstGridRows)[number]>[] = [
    { field: "action", headerName: t("action", "Action"), width: 120, sortable: false, exportable: false, align: "center" },
    { field: "fy", headerName: t("fy", "FY"), width: 160 },
    { field: "regime", headerName: t("regime", "Regime"), width: 180 },
    { field: "status", headerName: t("status", "Status"), width: 140, sortable: false },
    { field: "declared", headerName: t("declared", "Declared"), width: 150, align: "right" },
    { field: "approved", headerName: t("approved", "Approved"), width: 150, align: "right" },
    { field: "lastUpdated", headerName: t("last_updated", "Last Updated"), width: 160 },
  ];

  if (blnLoading || blnRightsLoading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "40vh" }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!blnCanView) {
    return (
      <Box className={styles.page}>
        <Alert severity="warning">
          {strRightsError || t("access_not_available", "IT declaration access is not available for your user group.")}
        </Alert>
      </Box>
    );
  }

  return (
    <Box className={styles.page}>
      {strRightsError ? <Alert severity="warning">{strRightsError}</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}

      <Paper className={styles.controlsCard} sx={{ p: 1.2, borderRadius: "10px", border: "1px solid #dbe3ef" }}>
        <Box className={styles.searchRow}>
          <TextField
            controlId="salary.ess-declarations.search.financial-year.input"
            value={strSearchFy}
            onChange={(objEvent) => setStrSearchFy(objEvent.target.value)}
            placeholder={t("search_fy", "Search FY")}
            size="small"
            fullWidth
          />
          <TextField
            controlId="salary.ess-declarations.search.regime.input"
            value={strSearchRegime}
            onChange={(objEvent) => setStrSearchRegime(objEvent.target.value)}
            placeholder={t("search_regime", "Search Regime")}
            size="small"
            fullWidth
          />
          <TextField
            controlId="salary.ess-declarations.search.status.select"
            select
            value={strSearchStatus}
            onChange={(objEvent) => setStrSearchStatus(objEvent.target.value)}
            size="small"
            fullWidth
          >
            <MenuItem value="All">{t("all", "All")}</MenuItem>
            <MenuItem value="draft">{t("draft", "Draft")}</MenuItem>
            <MenuItem value="submitted">{t("submitted", "Submitted")}</MenuItem>
            <MenuItem value="under_review">{t("under_review", "Under Review")}</MenuItem>
            <MenuItem value="released">{t("released", "Released")}</MenuItem>
            <MenuItem value="resubmitted">{t("resubmitted", "Resubmitted")}</MenuItem>
            <MenuItem value="approved">{t("approved", "Approved")}</MenuItem>
            <MenuItem value="locked">{t("locked", "Locked")}</MenuItem>
            <MenuItem value="rejected">{t("rejected", "Rejected")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button
              controlId="salary.ess-declarations.search.button"
              className={styles.primaryButton}
              variant="contained"
              startIcon={<SearchRoundedIcon />}
              onClick={() => setDicAppliedFilters({ fy: strSearchFy, regime: strSearchRegime, status: strSearchStatus })}
            >
              {t("search", "Search")}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button
              controlId="salary.ess-declarations.clear.button"
              className={styles.secondaryButton}
              variant="outlined"
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setStrSearchFy("");
                setStrSearchRegime("");
                setStrSearchStatus("All");
                setDicAppliedFilters({ fy: "", regime: "", status: "All" });
              }}
            >
              {t("clear", "Clear")}
            </Button>
          </Box>
        </Box>
      </Paper>

      <Box className={styles.tableCard}>
        <CommonTable
          columns={lstColumns}
          rows={lstGridRows}
          rowIdField={"id"}
          toolbarLeft={blnCanAdd ? (
            <Button controlId="salary.ess-declarations.add.button" className={styles.primaryButton} variant="contained" startIcon={<AddCircleOutlineRoundedIcon />} onClick={openAddDeclarationDialog}>
              {t("add_declaration", "Add Declaration")}
            </Button>
          ) : undefined}
          showExportOptions
          showPaginationSummary
          exportFileName="it-declaration-list"
          emptyMessage={t("no_it_declarations_found", "No IT declarations found for this employee.")}
          withPaper={false}
        />
      </Box>

      {strCurrentFy && lstCurrentFyRows.length === 0 ? (
        <Alert severity="info">{t("no_declaration_started_current_fy", "No declaration started for current FY")} {strCurrentFy}. {t("use_add_declaration", "Use Add Declaration.")}</Alert>
      ) : null}

      <Dialog open={blnAddDialogOpen} onClose={() => setBlnAddDialogOpen(false)} maxWidth="xs" fullWidth controlId="salary.ess-declarations.add.dialog">
        <DialogTitle>{t("add_declaration", "Add Declaration")}</DialogTitle>
        <DialogContent sx={{ pt: "12px !important" }}>
          <Stack spacing={1.2}>
            <TextField
              controlId="salary.ess-declarations.add.financial-year.select"
              select
              label={t("financial_year", "Financial Year")}
              value={strAddFy}
              onChange={(objEvent) => setStrAddFy(objEvent.target.value)}
              size="small"
              fullWidth
            >
              {lstFyOptions.map((strFy) => (
                <MenuItem key={strFy} value={strFy} disabled={setDeclaredFy.has(strFy)}>
                  {strFy} {setDeclaredFy.has(strFy) ? t("already_declared", "(Already declared)") : ""}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              controlId="salary.ess-declarations.add.regime.select"
              select
              label={t("tax_regime", "Tax Regime")}
              value={strAddRegime}
              onChange={(objEvent) => setStrAddRegime(objEvent.target.value as ItDeclarationRegime)}
              size="small"
              fullWidth
            >
              <MenuItem value="Old Regime">
                {t("old_regime", "Old Regime")}
              </MenuItem>
              <MenuItem value="New Regime">
                {t("new_regime", "New Regime")}
              </MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button controlId="salary.ess-declarations.add.cancel.button" onClick={() => setBlnAddDialogOpen(false)}>{t("cancel", "Cancel")}</Button>
          <Button
            controlId="salary.ess-declarations.add.confirm.button"
            variant="contained"
            disabled={!strAddFy || !!strBusyKey}
            onClick={() => void createFromDialog()}
          >
            {t("create", "Create")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
