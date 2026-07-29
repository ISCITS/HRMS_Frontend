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
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import styles from "@/components/master/MasterScreen.module.css";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useTaxRegimeLabels } from "@/features/tax-regimes/hooks/useTaxRegimeLabels";
import { createEmptyTaxSlabLine, taxRegimeService, toTaxSlabFormValues } from "@/features/tax-regimes/services/taxRegimeService";
import type { TaxRegimeDetailRecord, TaxSlabLineFormValue } from "@/features/tax-regimes/types";

type TaxSlabMaintenancePageProps = {
  intTaxRegimeID: number;
};

const lstTaxRegimeModuleCodes = ["TAX_REGIME", "TAX_REGIMES", "MASTER_TAX_REGIME", "TAX_SLAB", "TAX_SLABS", "MASTER_TAX_SLAB"];
const lstProfileCodes = ["GENERAL", "SENIOR", "SUPER_SENIOR"];
const lstResidentialStatuses = ["RESIDENT", "NON_RESIDENT", "RNOR"];

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
    setLstSlabs((lstPrevious) => lstPrevious.map((dicLine) => dicLine.strRowID === strRowID ? { ...dicLine, [strField]: objValue } : dicLine));
  }

  function handleAddLine() {
    setLstSlabs((lstPrevious) => [...lstPrevious, createEmptyTaxSlabLine(objRegime?.strTaxYearCode || lstFinancialYears[0] || "")]);
  }

  function handleRemoveLine(strRowID: string) {
    setLstSlabs((lstPrevious) => lstPrevious.length === 1 ? lstPrevious : lstPrevious.filter((dicLine) => dicLine.strRowID !== strRowID));
  }

  async function handleSave() {
    if (!blnCanSave) {
      return;
    }
    if (lstSlabs.length === 0) {
      setStrError(t("validation_slab_row_required", "At least one slab row is required."));
      return;
    }
    if (lstSlabs.some((dicLine) => !dicLine.strTaxYearCode.trim() || !dicLine.strSlabProfileCode.trim() || !dicLine.fltSlabFromAmount.trim() || !dicLine.fltTaxRatePercent.trim())) {
      setStrError(t("validation_slab_required_fields", "Tax year, profile, slab from amount, and tax rate are required for every row."));
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
      <Paper sx={{ borderRadius: "28px", p: { xs: 2, md: 3 }, border: "1px solid rgba(148,163,184,0.18)", background: "linear-gradient(135deg, #f8fcff 0%, #f7f8ff 45%, #fff9f0 100%)" }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: "1.7rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
                {t("slab_title", "Tax Slab Maintenance")}
              </Typography>
              <Typography sx={{ color: "#64748b", mt: 0.75 }}>
                {t("slab_subtitle", "Maintain tax-year and profile-specific slab bands using continuous boundaries. Rebate eligibility is handled separately at regime level.")}
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <Button className={styles.secondaryButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push(`/payroll/tax-regimes/edit/${intTaxRegimeID}`)}>
                {t("back_to_regime", "Back to regime")}
              </Button>
              {blnCanSave ? (
                <Button className={styles.primaryButton} startIcon={<SaveRoundedIcon />} onClick={handleSave} disabled={blnSaving}>
                  {blnSaving ? t("saving", "Saving...") : t("save_slabs", "Save Slabs")}
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}
      {blnReadOnly ? <Alert severity="info">{t("read_only_mode", "You have view-only access for Tax Regimes and Tax Slabs.")}</Alert> : null}

      <Box>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 1.25 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("slab_lines", "Slab Lines")}</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.9rem", mt: 0.4 }}>
              {t("slab_lines_help", "Use lower-inclusive and upper-exclusive boundaries. Only the final slab in one profile should remain open-ended.")}
            </Typography>
          </Box>
          <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={handleAddLine} disabled={blnFieldDisabled}>
            {t("add_slab_line", "Add Slab Line")}
          </Button>
        </Stack>

        <Box className={styles.tableCard}>
          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("tax_year", "Tax Year")}</th>
                  <th>{t("slab_profile", "Slab Profile")}</th>
                  <th>{t("residential_status", "Residential Status")}</th>
                  <th>{t("age_from", "Age From")}</th>
                  <th>{t("age_to", "Age To")}</th>
                  <th>{t("slab_from_amount", "Slab From Amount")}</th>
                  <th>{t("slab_to_amount", "Slab To Amount")}</th>
                  <th>{t("tax_rate_percent", "Tax Rate %")}</th>
                  <th>{t("fixed_tax_amount", "Fixed Tax Amount")}</th>
                  <th>{t("display_order", "Display Order")}</th>
                  <th>{t("active", "Active")}</th>
                  <th>{t("action", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {lstSlabs.map((dicLine) => (
                  <tr key={dicLine.strRowID}>
                    <td>
                      <TextField select size="small" value={dicLine.strTaxYearCode} onChange={(objEvent) => updateLine(dicLine.strRowID, "strTaxYearCode", objEvent.target.value)} disabled={blnFieldDisabled} sx={{ minWidth: 140 }}>
                        {lstFinancialYears.map((strFinancialYearCode) => (
                          <MenuItem key={strFinancialYearCode} value={strFinancialYearCode}>{strFinancialYearCode}</MenuItem>
                        ))}
                      </TextField>
                    </td>
                    <td>
                      <TextField select size="small" value={dicLine.strSlabProfileCode} onChange={(objEvent) => updateLine(dicLine.strRowID, "strSlabProfileCode", objEvent.target.value)} disabled={blnFieldDisabled} sx={{ minWidth: 140 }}>
                        {lstProfileCodes.map((strProfileCode) => (
                          <MenuItem key={strProfileCode} value={strProfileCode}>{strProfileCode}</MenuItem>
                        ))}
                      </TextField>
                    </td>
                    <td>
                      <TextField select size="small" value={dicLine.strResidentialStatusCode} onChange={(objEvent) => updateLine(dicLine.strRowID, "strResidentialStatusCode", objEvent.target.value)} disabled={blnFieldDisabled} sx={{ minWidth: 150 }}>
                        {lstResidentialStatuses.map((strStatusCode) => (
                          <MenuItem key={strStatusCode} value={strStatusCode}>{strStatusCode}</MenuItem>
                        ))}
                      </TextField>
                    </td>
                    <td><TextField size="small" value={dicLine.intAgeFromYears} onChange={(objEvent) => updateLine(dicLine.strRowID, "intAgeFromYears", objEvent.target.value)} disabled={blnFieldDisabled} sx={{ minWidth: 90 }} /></td>
                    <td><TextField size="small" value={dicLine.intAgeToYears} onChange={(objEvent) => updateLine(dicLine.strRowID, "intAgeToYears", objEvent.target.value)} disabled={blnFieldDisabled} sx={{ minWidth: 90 }} /></td>
                    <td><TextField size="small" value={dicLine.fltSlabFromAmount} onChange={(objEvent) => updateLine(dicLine.strRowID, "fltSlabFromAmount", objEvent.target.value)} disabled={blnFieldDisabled} sx={{ minWidth: 140 }} /></td>
                    <td><TextField size="small" value={dicLine.fltSlabToAmount} onChange={(objEvent) => updateLine(dicLine.strRowID, "fltSlabToAmount", objEvent.target.value)} disabled={blnFieldDisabled} placeholder={t("open_ended", "Open ended")} sx={{ minWidth: 140 }} /></td>
                    <td><TextField size="small" value={dicLine.fltTaxRatePercent} onChange={(objEvent) => updateLine(dicLine.strRowID, "fltTaxRatePercent", objEvent.target.value)} disabled={blnFieldDisabled} sx={{ minWidth: 110 }} /></td>
                    <td><TextField size="small" value={dicLine.decFixedTaxAmount} onChange={(objEvent) => updateLine(dicLine.strRowID, "decFixedTaxAmount", objEvent.target.value)} disabled={blnFieldDisabled} sx={{ minWidth: 120 }} /></td>
                    <td><TextField size="small" value={dicLine.intDisplayOrder} onChange={(objEvent) => updateLine(dicLine.strRowID, "intDisplayOrder", objEvent.target.value)} disabled={blnFieldDisabled} sx={{ minWidth: 110 }} /></td>
                    <td><ActiveStatusSwitch blnIsActive={dicLine.blnIsActive} onChange={(blnChecked) => updateLine(dicLine.strRowID, "blnIsActive", blnChecked)} disabled={blnFieldDisabled} /></td>
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
