"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Box, Button, Stack, Tab, Tabs } from "@mui/material";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import TaxRegimeEditorPage from "@/features/tax-regimes/components/TaxRegimeEditorPage";
import TaxSlabMaintenancePage from "@/features/tax-regimes/components/TaxSlabMaintenancePage";
import type { TaxRegimeSaveBridge } from "@/features/tax-regimes/components/TaxRegimeWorkspace";
import { useTaxRegimeLabels } from "@/features/tax-regimes/hooks/useTaxRegimeLabels";

type TaxRegimeWorkspaceTabsProps = {
  strMode: "add" | "edit" | "view";
  /** record_uuid from the URL; the internal id is never routed on. */
  strTaxRegimeID?: string;
};

export default function TaxRegimeWorkspaceTabs({ strMode, strTaxRegimeID }: TaxRegimeWorkspaceTabsProps) {
  const objRouter = useRouter();
  const { t } = useTaxRegimeLabels();
  const objSearchParams = useSearchParams();
  const strTabParam = objSearchParams.get("tab");

  const [intActiveTab, setIntActiveTab] = useState(() => {
    if (!strTaxRegimeID) {
      return 0;
    }
    if (strTabParam === "slabs") return 1;
    return 0;
  });
  const [objSaveBridge, setObjSaveBridge] = useState<TaxRegimeSaveBridge>(null);

  const strRegimeTabLabel = strMode === "add"
    ? t("add_tax_regime", "Add Tax Regime")
    : strMode === "view"
      ? t("view_tax_regime", "View Tax Regime")
      : t("edit_tax_regime", "Edit Tax Regime");

  function handleTabChange(intNextTab: number) {
    setObjSaveBridge(null);
    setIntActiveTab(intNextTab);
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box className={styles.controlsCard} sx={{ flex: "0 0 auto", p: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" sx={{ pr: 1.5 }}>
          <Tabs value={intActiveTab} onChange={(_, intNextTab) => handleTabChange(intNextTab)} sx={{ minHeight: 44, px: 1 }}>
            <Tab label={strRegimeTabLabel} />
            <Tab label={t("manage_slabs", "Manage Slabs")} disabled={!strTaxRegimeID} />
          </Tabs>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
            <Button className={styles.secondaryButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/payroll/tax-regimes")}>
              {t("back_to_list", "Back")}
            </Button>
            {objSaveBridge?.blnVisible ? (
              <Button className={styles.primaryButton} startIcon={<SaveRoundedIcon />} onClick={objSaveBridge.fnSave} disabled={objSaveBridge.blnDisabled}>
                {objSaveBridge.strLabel}
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ flex: "1 1 auto", minHeight: 0 }}>
        {intActiveTab === 0 ? (
          <TaxRegimeEditorPage strMode={strMode} strTaxRegimeID={strTaxRegimeID} blnEmbedded onSaveBridgeChange={setObjSaveBridge} />
        ) : null}
        {intActiveTab === 1 && strTaxRegimeID ? (
          <TaxSlabMaintenancePage strTaxRegimeID={strTaxRegimeID} blnEmbedded onSaveBridgeChange={setObjSaveBridge} />
        ) : null}
      </Box>
    </Box>
  );
}
