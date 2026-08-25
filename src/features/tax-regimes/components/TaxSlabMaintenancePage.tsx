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
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import styles from "@/components/master/MasterScreen.module.css";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useTaxRegimeLabels } from "@/features/tax-regimes/hooks/useTaxRegimeLabels";
import { createEmptyTaxSlabLine, taxRegimeService, toTaxSlabFormValues } from "@/features/tax-regimes/services/taxRegimeService";
import type { TaxRegimeDetailRecord, TaxSlabLineFormValue } from "@/features/tax-regimes/types";
import { objTaxRegimeCommonTableSx, TaxRegimeActionGroup, TaxRegimeWorkspaceHeader, type TaxRegimeSaveBridge } from "@/features/tax-regimes/components/TaxRegimeWorkspace";

type TaxSlabMaintenancePageProps = {
  intTaxRegimeID: number;
  blnEmbedded?: boolean;
  onSaveBridgeChange?: (objBridge: TaxRegimeSaveBridge) => void;
};

const lstTaxRegimeModuleCodes = ["TAX_REGIME", "TAX_REGIMES", "MASTER_TAX_REGIME", "TAX_SLAB", "TAX_SLABS", "MASTER_TAX_SLAB"];
const lstProfileCodes = ["GENERAL", "SENIOR", "SUPER_SENIOR"];
const lstResidentialStatuses = ["RESIDENT", "NON_RESIDENT", "RNOR"];

export default function TaxSlabMaintenancePage({ intTaxRegimeID, blnEmbedded, onSaveBridgeChange }: TaxSlabMaintenancePageProps) {
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

  const objHandleSaveRef = useRef(handleSave);
  objHandleSaveRef.current = handleSave;

  useEffect(() => {
    if (!onSaveBridgeChange) {
      return;
    }
    onSaveBridgeChange({
      strLabel: blnSaving ? t("saving", "Saving...") : t("save_slabs", "Save Slabs"),
      blnVisible: blnCanSave && !blnLoading && blnCanLoadWorkspace,
      blnDisabled: blnSaving,
      fnSave: () => objHandleSaveRef.current(),
    });
    return () => onSaveBridgeChange(null);
  }, [onSaveBridgeChange, blnCanSave, blnSaving, blnLoading, blnCanLoadWorkspace]);

  const lstTableColumns: CommonTableColumn<Record<string, ReactNode>>[] = [
    { field: "taxYear", headerName: t("tax_year", "Tax Year"), width: 125, sortable: false },
    { field: "profile", headerName: t("slab_profile", "Slab Profile"), width: 130, sortable: false },
    { field: "residentialStatus", headerName: t("residential_status", "Residential Status"), width: 145, sortable: false },
    { field: "ageFrom", headerName: t("age_from", "Age From"), width: 80, sortable: false },
    { field: "ageTo", headerName: t("age_to", "Age To"), width: 80, sortable: false },
    { field: "amountFrom", headerName: t("slab_from_amount", "Slab From Amount"), width: 135, align: "right", sortable: false },
    { field: "amountTo", headerName: t("slab_to_amount", "Slab To Amount"), width: 135, align: "right", sortable: false },
    { field: "taxRate", headerName: t("tax_rate_percent", "Tax Rate %"), width: 95, align: "right", sortable: false },
    { field: "fixedTax", headerName: t("fixed_tax_amount", "Fixed Tax Amount"), width: 120, align: "right", sortable: false },
    { field: "displayOrder", headerName: t("display_order", "Display Order"), width: 95, align: "right", sortable: false },
    { field: "active", headerName: t("active", "Active"), width: 75, align: "center", sortable: false },
    { field: "action", headerName: t("action", "Action"), width: 60, align: "center", sortable: false, exportable: false },
  ];

  const lstTableRows: Record<string, ReactNode>[] = lstSlabs.map((dicLine) => ({
    id: dicLine.strRowID,
    taxYear: (
      <TextField select size="small" fullWidth value={dicLine.strTaxYearCode} onChange={(objEvent) => updateLine(dicLine.strRowID, "strTaxYearCode", objEvent.target.value)} disabled={blnFieldDisabled}>
        {lstFinancialYears.map((strFinancialYearCode) => <MenuItem key={strFinancialYearCode} value={strFinancialYearCode}>{strFinancialYearCode}</MenuItem>)}
      </TextField>
    ),
    profile: (
      <TextField select size="small" fullWidth value={dicLine.strSlabProfileCode} onChange={(objEvent) => updateLine(dicLine.strRowID, "strSlabProfileCode", objEvent.target.value)} disabled={blnFieldDisabled}>
        {lstProfileCodes.map((strProfileCode) => <MenuItem key={strProfileCode} value={strProfileCode}>{strProfileCode}</MenuItem>)}
      </TextField>
    ),
    residentialStatus: (
      <TextField select size="small" fullWidth value={dicLine.strResidentialStatusCode} onChange={(objEvent) => updateLine(dicLine.strRowID, "strResidentialStatusCode", objEvent.target.value)} disabled={blnFieldDisabled}>
        {lstResidentialStatuses.map((strStatusCode) => <MenuItem key={strStatusCode} value={strStatusCode}>{strStatusCode}</MenuItem>)}
      </TextField>
    ),
    ageFrom: <TextField size="small" fullWidth value={dicLine.intAgeFromYears} onChange={(objEvent) => updateLine(dicLine.strRowID, "intAgeFromYears", objEvent.target.value)} disabled={blnFieldDisabled} />,
    ageTo: <TextField size="small" fullWidth value={dicLine.intAgeToYears} onChange={(objEvent) => updateLine(dicLine.strRowID, "intAgeToYears", objEvent.target.value)} disabled={blnFieldDisabled} />,
    amountFrom: <TextField size="small" fullWidth value={dicLine.fltSlabFromAmount} onChange={(objEvent) => updateLine(dicLine.strRowID, "fltSlabFromAmount", objEvent.target.value)} disabled={blnFieldDisabled} inputProps={{ style: { textAlign: "right" } }} />,
    amountTo: <TextField size="small" fullWidth value={dicLine.fltSlabToAmount} onChange={(objEvent) => updateLine(dicLine.strRowID, "fltSlabToAmount", objEvent.target.value)} disabled={blnFieldDisabled} placeholder={t("open_ended", "Open ended")} inputProps={{ style: { textAlign: "right" } }} />,
    taxRate: <TextField size="small" fullWidth value={dicLine.fltTaxRatePercent} onChange={(objEvent) => updateLine(dicLine.strRowID, "fltTaxRatePercent", objEvent.target.value)} disabled={blnFieldDisabled} inputProps={{ style: { textAlign: "right" } }} />,
    fixedTax: <TextField size="small" fullWidth value={dicLine.decFixedTaxAmount} onChange={(objEvent) => updateLine(dicLine.strRowID, "decFixedTaxAmount", objEvent.target.value)} disabled={blnFieldDisabled} inputProps={{ style: { textAlign: "right" } }} />,
    displayOrder: <TextField size="small" fullWidth value={dicLine.intDisplayOrder} onChange={(objEvent) => updateLine(dicLine.strRowID, "intDisplayOrder", objEvent.target.value)} disabled={blnFieldDisabled} inputProps={{ style: { textAlign: "right" } }} />,
    active: <ActiveStatusSwitch blnIsActive={dicLine.blnIsActive} onChange={(blnChecked) => updateLine(dicLine.strRowID, "blnIsActive", blnChecked)} disabled={blnFieldDisabled} />,
    action: <Tooltip title={t("remove_button", "Remove")}><span><IconButton color="error" size="small" aria-label={t("remove_button", "Remove")} onClick={() => handleRemoveLine(dicLine.strRowID)} disabled={blnFieldDisabled}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></span></Tooltip>,
  }));

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
    <Stack spacing={1.5} sx={{ height: "100%", overflow: "auto", pr: 0.5 }}>
      {!blnEmbedded ? (
        <TaxRegimeWorkspaceHeader
          strTitle={t("slab_title", "Tax Slab Maintenance")}
          nodeActions={(
            <TaxRegimeActionGroup>
                <Button className={styles.secondaryButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/payroll/tax-regimes")}>
                  {t("back_to_list", "Back")}
                </Button>
                {blnCanSave ? (
                  <Button className={styles.primaryButton} startIcon={<SaveRoundedIcon />} onClick={handleSave} disabled={blnSaving}>
                    {blnSaving ? t("saving", "Saving...") : t("save_slabs", "Save Slabs")}
                  </Button>
                ) : null}
            </TaxRegimeActionGroup>
          )}
        />
      ) : null}

      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}
      {blnReadOnly ? <Alert severity="info">{t("read_only_mode", "You have view-only access for Tax Regimes and Tax Slabs.")}</Alert> : null}

      <Box>
        <CommonTable<Record<string, ReactNode>>
          columns={lstTableColumns}
          rows={lstTableRows}
          rowIdField="id"
          minTableWidth={1275}
          defaultPageSize={20}
          pageSizeOptions={[10, 20, 50]}
          emptyMessage={t("no_slab_lines", "No slab lines found.")}
          testIdPrefix="tax-regimes.slabs"
          hideRowClickHint
          wrapColumnHeaders={false}
          toolbarLeft={blnCanSave ? <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={handleAddLine} disabled={blnFieldDisabled}>{t("add_slab_line", "Add Slab Line")}</Button> : undefined}
          sx={objTaxRegimeCommonTableSx}
        />
      </Box>
    </Stack>
  );
}
