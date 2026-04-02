"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useTaxRegimeLabels } from "@/features/tax-regimes/hooks/useTaxRegimeLabels";
import {
  createInitialTaxRegimeForm,
  taxRegimeService,
  toTaxRegimeFormValues
} from "@/features/tax-regimes/services/taxRegimeService";
import type { TaxRegimeFormOptions, TaxRegimeFormValues } from "@/features/tax-regimes/types";

type TaxRegimeEditorPageProps = {
  strMode: "add" | "edit" | "view";
  intTaxRegimeID?: number;
};

const lstTaxRegimeModuleCodes = ["TAX_REGIME", "TAX_REGIMES", "MASTER_TAX_REGIME", "TAX_SLAB", "TAX_SLABS", "MASTER_TAX_SLAB"];

export default function TaxRegimeEditorPage({ strMode, intTaxRegimeID }: TaxRegimeEditorPageProps) {
  const objRouter = useRouter();
  const { t } = useTaxRegimeLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstTaxRegimeModuleCodes);
  const [objFormOptions, setObjFormOptions] = useState<TaxRegimeFormOptions | null>(null);
  const [dicForm, setDicForm] = useState<TaxRegimeFormValues>(createInitialTaxRegimeForm());
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnForcedViewMode = strMode === "view";
  const blnReadOnly = blnForcedViewMode || (strMode === "edit" && blnCanView && !blnCanEdit);
  const blnCanLoadWorkspace = strMode === "add" ? blnCanAdd : blnCanView;
  const blnCanSave = strMode === "add" ? blnCanAdd : strMode === "edit" ? blnCanEdit : false;
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
        const objOptions = await taxRegimeService.getFormOptions();
        if (!blnMounted) {
          return;
        }
        setObjFormOptions(objOptions);
        if (strMode !== "add" && intTaxRegimeID) {
          const dicDetail = await taxRegimeService.getTaxRegimeById(intTaxRegimeID);
          if (!blnMounted) {
            return;
          }
          setDicForm(toTaxRegimeFormValues(dicDetail));
        } else {
          setDicForm((dicPrevious) => ({
            ...dicPrevious,
            strCountryCode: objOptions.lstCountries[0]?.strCode ?? dicPrevious.strCountryCode
          }));
        }
      } catch (objError) {
        if (blnMounted) {
          setStrError(objError instanceof Error ? objError.message : "Unable to load tax regime workspace.");
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
  }, [blnCanLoadWorkspace, blnRightsLoading, intTaxRegimeID, strMode]);

  const dicCountryByCode = useMemo(() => {
    return new Map((objFormOptions?.lstCountries ?? []).map((dicOption) => [dicOption.strCode ?? String(dicOption.intID), dicOption]));
  }, [objFormOptions]);

  function updateField<TKey extends keyof TaxRegimeFormValues>(strField: TKey, objValue: TaxRegimeFormValues[TKey]) {
    setDicForm((dicPrevious) => ({ ...dicPrevious, [strField]: objValue }));
  }

  async function handleSave() {
    if (!blnCanSave) {
      return;
    }
    if (!dicForm.strRegimeCode.trim() || !dicForm.strRegimeName.trim() || !dicForm.strCountryCode.trim()) {
      setStrError("Regime code, regime name, and country are required.");
      return;
    }
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicSavedRecord = strMode === "edit" && intTaxRegimeID
        ? await taxRegimeService.updateTaxRegime(intTaxRegimeID, dicForm)
        : await taxRegimeService.createTaxRegime(dicForm);
      setDicForm(toTaxRegimeFormValues(dicSavedRecord));
      setStrSuccess(`Tax regime ${strMode === "edit" ? "updated" : "created"} successfully.`);
      if (strMode === "add") {
        objRouter.push(`/payroll/tax-regimes/edit/${dicSavedRecord.intID}`);
      }
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to save tax regime.");
    } finally {
      setBlnSaving(false);
    }
  }

  if (blnLoading || blnRightsLoading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: "#64748b" }}>{t("loading_workspace", "Loading tax regime workspace...")}</Typography>
        </Stack>
      </Box>
    );
  }

  if (!blnCanLoadWorkspace) {
    return (
      <Box className={styles.emptyState}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
          {strMode === "add"
            ? t("access_denied_add", "Tax regime create access is not available for your user group.")
            : t("access_denied", "Tax regime access is not available for your user group.")}
        </Typography>
        <Typography sx={{ mt: 1, color: "#64748b" }}>
          {t("access_denied_help", "Contact your administrator if you need tax regime access.")}
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
          background: "linear-gradient(135deg, #fff9ef 0%, #f4f7ff 55%, #f8fafc 100%)"
        }}
      >
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Box>
              
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <Button className={styles.secondaryButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/payroll/tax-regimes")}>
                {t("back_to_list", "Back to list")}
              </Button>
              {strMode !== "add" && intTaxRegimeID && !blnForcedViewMode ? (
                <Button className={styles.secondaryButton} startIcon={<ReceiptLongRoundedIcon />} onClick={() => objRouter.push(`/payroll/tax-regimes/edit/${intTaxRegimeID}/slabs`)}>
                  {t("manage_slabs", "Manage slabs")}
                </Button>
              ) : null}
              {blnCanSave ? (
                <Button className={styles.primaryButton} startIcon={<SaveRoundedIcon />} onClick={handleSave} disabled={blnSaving}>
                  {blnSaving ? t("saving", "Saving...") : t("save", "Save Tax Regime")}
                </Button>
              ) : null}
            </Stack>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <Paper sx={{ p: 2, borderRadius: "22px", flex: 1, background: "rgba(255,255,255,0.72)", border: "1px solid rgba(148,163,184,0.14)" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("summary_country", "Country")}</Typography>
              <Typography sx={{ mt: 0.75, fontWeight: 800, color: "#0f172a" }}>
                {dicCountryByCode.get(dicForm.strCountryCode)?.strLabel || dicForm.strCountryCode || t("not_selected", "Not selected")}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, borderRadius: "22px", flex: 1, background: "rgba(255,255,255,0.72)", border: "1px solid rgba(148,163,184,0.14)" }}>
              <Typography sx={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("summary_scope", "Future-ready")}</Typography>
              <Typography sx={{ mt: 0.75, fontWeight: 800, color: "#0f172a" }}>
                {t("scope_copy", "Regime header stays reusable across financial-year slab revisions")}
              </Typography>
            </Paper>
          </Stack>
        </Stack>
      </Paper>

      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}
      {blnReadOnly ? <Alert severity="info">{t("read_only_mode", "You have view-only access for Tax Regimes.")}</Alert> : null}

      <Paper
        sx={{
          borderRadius: "24px",
          p: { xs: 2, md: 3 },
          border: "1px solid rgba(187, 213, 232, 0.7)",
          boxShadow: "var(--app-shadow-soft)"
        }}
      >
        <Stack spacing={2.5}>
          <Box>
            <Typography sx={{ color: "#0f172a", fontWeight: 800, fontSize: "1.05rem" }}>{t("basic_information", "Basic Information")}</Typography>
            <Typography sx={{ color: "#64748b", mt: 0.5 }}>
              {t("basic_information_help", "Keep the regime code concise, the name business-friendly, and default the setup to India unless you intentionally prepare another country profile.")}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
              gap: 2
            }}
          >
            <TextField
              label={t("regime_code", "Regime Code")}
              value={dicForm.strRegimeCode}
              onChange={(objEvent) => updateField("strRegimeCode", objEvent.target.value.toUpperCase())}
              disabled={blnFieldDisabled}
              fullWidth
            />

            <TextField
              label={t("regime_name", "Regime Name")}
              value={dicForm.strRegimeName}
              onChange={(objEvent) => updateField("strRegimeName", objEvent.target.value)}
              disabled={blnFieldDisabled}
              fullWidth
            />

            <TextField
              label={t("country", "Country")}
              select
              value={dicForm.strCountryCode}
              onChange={(objEvent) => updateField("strCountryCode", objEvent.target.value)}
              disabled={blnFieldDisabled}
              fullWidth
            >
              {(objFormOptions?.lstCountries ?? []).map((dicOption) => (
                <MenuItem key={dicOption.strCode ?? dicOption.intID} value={dicOption.strCode ?? ""}>
                  {dicOption.strLabel}{dicOption.strCode ? ` (${dicOption.strCode})` : ""}
                </MenuItem>
              ))}
            </TextField>

            <Box sx={{ display: "flex", alignItems: "center" }}>
              <FormControlLabel
                control={<Switch checked={dicForm.blnIsActive} onChange={(objEvent) => updateField("blnIsActive", objEvent.target.checked)} disabled={blnFieldDisabled} />}
                label={dicForm.blnIsActive ? t("active", "Active") : t("inactive", "Inactive")}
              />
            </Box>
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}
