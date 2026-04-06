"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useTaxRegimeLabels } from "@/features/tax-regimes/hooks/useTaxRegimeLabels";
import {
  createEmptyTaxSlabLine,
  taxRegimeService,
  toTaxSlabFormValues
} from "@/features/tax-regimes/services/taxRegimeService";
import type { TaxRegimeDetailRecord, TaxSlabLineFormValue } from "@/features/tax-regimes/types";

type TaxSlabMaintenancePageProps = {
  intTaxRegimeID: number;
};

const lstTaxRegimeModuleCodes = ["TAX_REGIME", "TAX_REGIMES", "MASTER_TAX_REGIME", "TAX_SLAB", "TAX_SLABS", "MASTER_TAX_SLAB"];

function getDefaultFinancialYear(lstFinancialYears: string[], lstRows: TaxSlabLineFormValue[]) {
  return lstRows.at(-1)?.strFinancialYearCode || lstFinancialYears[0] || "";
}

export default function TaxSlabMaintenancePage({ intTaxRegimeID }: TaxSlabMaintenancePageProps) {
  const objRouter = useRouter();
  const { t } = useTaxRegimeLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstTaxRegimeModuleCodes);
  const [objRegime, setObjRegime] = useState<TaxRegimeDetailRecord | null>(null);
  const [lstFinancialYears, setLstFinancialYears] = useState<string[]>([]);
  const [lstSlabs, setLstSlabs] = useState<TaxSlabLineFormValue[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");

  const blnCanView = canViewAny();
  const blnCanEdit = canDoAny("edit");
  const blnReadOnly = blnCanView && !blnCanEdit;
  const blnCanLoadWorkspace = blnCanView;
  const blnCanSave = blnCanEdit;
  const blnFieldDisabled = blnSaving || blnReadOnly || !blnCanSave;

  useEffect(() => {
    let blnMounted = true;

    async function loadData() {
      if (blnRightsLoading) {
        return;
      }
      if (!blnCanLoadWorkspace) {
        if (blnMounted) {
          setBlnLoading(false);
        }
        return;
      }
      setBlnLoading(true);
      setStrError("");
      try {
        const dicWorkspace = await taxRegimeService.getTaxSlabs(intTaxRegimeID);
        if (!blnMounted) {
          return;
        }
        setObjRegime(dicWorkspace.objRegime);
        setLstFinancialYears(dicWorkspace.lstFinancialYears);
        setLstSlabs(toTaxSlabFormValues(dicWorkspace));
      } catch (objError) {
        if (blnMounted) {
          setStrError(objError instanceof Error ? objError.message : t("load_slabs_workspace_failed", "Unable to load tax slab workspace."));
        }
      } finally {
        if (blnMounted) {
          setBlnLoading(false);
        }
      }
    }

    loadData().catch(() => undefined);
    return () => {
      blnMounted = false;
    };
  }, [blnCanLoadWorkspace, blnRightsLoading, intTaxRegimeID]);

  function updateLine(strRowID: string, strField: keyof TaxSlabLineFormValue, objValue: string | boolean) {
    setLstSlabs((lstPrevious) => lstPrevious.map((dicLine) => (
      dicLine.strRowID === strRowID ? { ...dicLine, [strField]: objValue } : dicLine
    )));
  }

  function handleAddLine() {
    setLstSlabs((lstPrevious) => [
      ...lstPrevious,
      createEmptyTaxSlabLine(getDefaultFinancialYear(lstFinancialYears, lstPrevious))
    ]);
  }

  function handleRemoveLine(strRowID: string) {
    setLstSlabs((lstPrevious) => (
      lstPrevious.length === 1 ? lstPrevious : lstPrevious.filter((dicLine) => dicLine.strRowID !== strRowID)
    ));
  }

  async function handleSave() {
    if (!blnCanSave) {
      return;
    }
    if (lstSlabs.length === 0) {
      setStrError(t("validation_slab_row_required", "At least one slab row is required."));
      return;
    }
    const blnHasInvalidRow = lstSlabs.some((dicLine) => (
      !dicLine.strFinancialYearCode.trim() ||
      !dicLine.fltSlabFromAmount.trim() ||
      !dicLine.fltTaxRatePercent.trim()
    ));
    if (blnHasInvalidRow) {
      setStrError(t("validation_slab_required_fields", "Financial year, slab from amount, and tax rate are required for every row."));
      return;
    }
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicWorkspace = await taxRegimeService.saveTaxSlabs(intTaxRegimeID, lstSlabs);
      setObjRegime(dicWorkspace.objRegime);
      setLstFinancialYears(dicWorkspace.lstFinancialYears);
      setLstSlabs(toTaxSlabFormValues(dicWorkspace));
      setStrSuccess(t("save_slabs_success", "Tax slabs saved successfully."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("save_slabs_failed", "Unable to save tax slabs."));
    } finally {
      setBlnSaving(false);
    }
  }

  if (blnLoading || blnRightsLoading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: "#64748b" }}>{t("loading_slabs_workspace", "Loading tax slab workspace...")}</Typography>
        </Stack>
      </Box>
    );
  }

  if (!blnCanLoadWorkspace || !objRegime) {
    return (
      <Box className={styles.emptyState}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
          {t("access_denied_slabs", "Tax slab access is not available for your user group.")}
        </Typography>
        <Typography sx={{ mt: 1, color: "#64748b" }}>
          {t("access_denied_slabs_help", "Contact your administrator if you need tax slab maintenance access.")}
        </Typography>
        {strRightsError ? <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
      </Box>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ height: "100%", overflow: "auto", pr: 0.5 }}>
      <Paper
        sx={{
          borderRadius: "28px",
          p: { xs: 2, md: 3 },
          border: "1px solid rgba(148,163,184,0.18)",
          background: "linear-gradient(135deg, #f8fcff 0%, #f7f8ff 45%, #fff9f0 100%)"
        }}
      >
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: "1.7rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
                {t("slab_title", "Tax Slab Maintenance")}
              </Typography>
              <Typography sx={{ color: "#64748b", mt: 0.75 }}>
                {t("slab_subtitle", "Maintain regime-wise slab lines by financial year, rate, rebate eligibility, and activation state without exposing system metadata.")}
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <Button
                className={styles.secondaryButton}
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => objRouter.push(`/payroll/tax-regimes/edit/${intTaxRegimeID}`)}
                sx={{
                  height: 38,
                  minHeight: 38,
                  py: 0,
                  px: 1.5,
                  fontSize: "0.9rem",
                  whiteSpace: "nowrap",
                  "& .MuiButton-startIcon": {
                    mr: 0.75,
                    "& svg": {
                      fontSize: "1rem"
                    }
                  }
                }}
              >
                {t("back_to_regime", "Back to regime")}
              </Button>
              {blnCanSave ? (
                <Button
                  className={styles.primaryButton}
                  startIcon={<SaveRoundedIcon />}
                  onClick={handleSave}
                  disabled={blnSaving}
                  sx={{
                    height: 38,
                    minHeight: 38,
                    py: 0,
                    px: 1.75,
                    fontSize: "0.9rem",
                    whiteSpace: "nowrap",
                    "& .MuiButton-startIcon": {
                      mr: 0.75,
                      "& svg": {
                        fontSize: "1rem"
                      }
                    }
                  }}
                >
                  {blnSaving ? t("saving", "Saving...") : t("save_slabs", "Save Slabs")}
                </Button>
              ) : null}
            </Stack>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <Paper sx={{ p: 2, borderRadius: "22px", flex: 1, background: "rgba(255,255,255,0.72)", border: "1px solid rgba(148,163,184,0.14)" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("regime_code", "Regime Code")}</Typography>
              <Typography sx={{ mt: 0.75, fontWeight: 800, color: "#0f172a" }}>{objRegime.strRegimeCode}</Typography>
            </Paper>
            <Paper sx={{ p: 2, borderRadius: "22px", flex: 1, background: "rgba(255,255,255,0.72)", border: "1px solid rgba(148,163,184,0.14)" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("regime_name", "Regime Name")}</Typography>
              <Typography sx={{ mt: 0.75, fontWeight: 800, color: "#0f172a" }}>{objRegime.strRegimeName}</Typography>
            </Paper>
            <Paper sx={{ p: 2, borderRadius: "22px", flex: 1, background: "rgba(255,255,255,0.72)", border: "1px solid rgba(148,163,184,0.14)" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("country", "Country")}</Typography>
              <Typography sx={{ mt: 0.75, fontWeight: 800, color: "#0f172a" }}>{objRegime.strCountryCode}</Typography>
            </Paper>
          </Stack>
        </Stack>
      </Paper>

      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}
      {blnReadOnly ? <Alert severity="info">{t("read_only_mode", "You have view-only access for Tax Regimes and Tax Slabs.")}</Alert> : null}

      <Box>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 1.25 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
              {t("slab_lines", "Slab Lines")}
            </Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.9rem", mt: 0.4 }}>
              {t("slab_lines_help", "Keep financial year specific slabs in ascending order. Use an empty Slab To Amount to mark the open-ended last slab for that year.")}
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={handleAddLine} disabled={blnFieldDisabled} sx={{ borderRadius: "12px" }}>
            {t("add_slab_line", "Add Slab Line")}
          </Button>
        </Stack>

        <Box className={styles.tableCard}>
          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("financial_year", "Financial Year")}</th>
                  <th>{t("slab_from_amount", "Slab From Amount")}</th>
                  <th>{t("slab_to_amount", "Slab To Amount")}</th>
                  <th>{t("tax_rate_percent", "Tax Rate %")}</th>
                  <th>{t("rebate_eligible", "Rebate Eligible")}</th>
                  <th>{t("active", "Active")}</th>
                  <th>{t("action", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {lstSlabs.map((dicLine) => (
                  <tr key={dicLine.strRowID}>
                    <td>
                      <TextField
                        select
                        size="small"
                        value={dicLine.strFinancialYearCode}
                        onChange={(objEvent) => updateLine(dicLine.strRowID, "strFinancialYearCode", objEvent.target.value)}
                        disabled={blnFieldDisabled}
                        sx={{ minWidth: 160 }}
                      >
                        {lstFinancialYears.map((strFinancialYearCode) => (
                          <MenuItem key={strFinancialYearCode} value={strFinancialYearCode}>{strFinancialYearCode}</MenuItem>
                        ))}
                      </TextField>
                    </td>
                    <td>
                      <TextField
                        size="small"
                        value={dicLine.fltSlabFromAmount}
                        onChange={(objEvent) => updateLine(dicLine.strRowID, "fltSlabFromAmount", objEvent.target.value)}
                        disabled={blnFieldDisabled}
                        sx={{ minWidth: 150 }}
                      />
                    </td>
                    <td>
                      <TextField
                        size="small"
                        value={dicLine.fltSlabToAmount}
                        onChange={(objEvent) => updateLine(dicLine.strRowID, "fltSlabToAmount", objEvent.target.value)}
                        disabled={blnFieldDisabled}
                        placeholder={t("open_ended", "Open ended")}
                        sx={{ minWidth: 150 }}
                      />
                    </td>
                    <td>
                      <TextField
                        size="small"
                        value={dicLine.fltTaxRatePercent}
                        onChange={(objEvent) => updateLine(dicLine.strRowID, "fltTaxRatePercent", objEvent.target.value)}
                        disabled={blnFieldDisabled}
                        sx={{ minWidth: 140 }}
                      />
                    </td>
                    <td>
                      <Switch
                        checked={dicLine.blnRebateEligible}
                        onChange={(objEvent) => updateLine(dicLine.strRowID, "blnRebateEligible", objEvent.target.checked)}
                        disabled={blnFieldDisabled}
                      />
                    </td>
                    <td>
                      <Switch
                        checked={dicLine.blnIsActive}
                        onChange={(objEvent) => updateLine(dicLine.strRowID, "blnIsActive", objEvent.target.checked)}
                        disabled={blnFieldDisabled}
                      />
                    </td>
                    <td>
                      <Button color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => handleRemoveLine(dicLine.strRowID)} disabled={blnFieldDisabled}>
                        {t("remove_button", "Remove")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Box>
      </Box>
    </Stack>
  );
}
