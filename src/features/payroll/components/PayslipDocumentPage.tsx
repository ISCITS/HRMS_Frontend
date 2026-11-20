"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import { Alert, Box, Button } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import BlockingLoader from "@/components/shared/BlockingLoader";
import { DetailPageHeader } from "@/components/master/MasterListUi";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import PayslipHtmlPreview from "@/features/payroll/components/PayslipHtmlPreview";
import { usePayslipViewChooser } from "@/features/payroll/components/PayslipViewChooser";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { payslipService, type PayslipDocumentView } from "@/features/payroll/services/payslipService";
import { buildPayslipFileName, downloadPayslipHtml } from "@/features/payroll/utils/payslipDocument";
import { getPayslipSwitchView } from "@/features/payroll/utils/payslipViewChoice";

type PayslipDocumentPageProps = {
  /** record_uuid from the URL; the internal id is never routed on. */
  strPayslipID: string;
  strBackRoute?: string;
};

export default function PayslipDocumentPage({ strPayslipID, strBackRoute }: PayslipDocumentPageProps) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("payslips");
  const [strHtml, setStrHtml] = useState("");
  const [strError, setStrError] = useState("");
  const [blnLoading, setBlnLoading] = useState(false);
  const [blnChangingView, setBlnChangingView] = useState(false);
  // null until the user answers "which payslip do you want to see?".
  const [strView, setStrView] = useState<PayslipDocumentView | null>(null);
  const [intResultID, setIntResultID] = useState<number | null>(null);
  const { choosePayslipView, blnCanSwitchView, objPayslipViewChooser } = usePayslipViewChooser();
  const refViewAsked = useRef(false);

  async function askPayslipView() {
    try {
      const strChosen = await choosePayslipView({ blnClientFormat: true });
      if (strChosen) {
        setBlnLoading(true);
        setStrView(strChosen);
      }
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("unable_to_load_payslip", "Unable to load payslip document."));
    }
  }

  useEffect(() => {
    if (refViewAsked.current) {
      return;
    }
    refViewAsked.current = true;
    void askPayslipView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!strView) {
      return;
    }
    let blnCancelled = false;
    const strChosenView = strView;

    async function loadPayslipDocument() {
      setStrError("");
      try {
        // The server returns the latest figures even when this link points to an outdated copy.
        const [strDocumentHtml, dicSummary] = await Promise.all([
          payslipService.getDownloadHtml(strPayslipID, strChosenView),
          payslipService.getPayslipSummary(strPayslipID).catch(() => null),
        ]);
        if (!blnCancelled) {
          setStrHtml(strDocumentHtml);
          setIntResultID(dicSummary?.intEmployeePayrollResultID ?? null);
        }
      } catch (objError) {
        if (!blnCancelled) {
          setStrError(objError instanceof Error ? objError.message : t("unable_to_load_payslip", "Unable to load payslip document."));
        }
      } finally {
        if (!blnCancelled) {
          setBlnLoading(false);
          setBlnChangingView(false);
        }
      }
    }

    loadPayslipDocument().catch(() => undefined);

    return () => {
      blnCancelled = true;
    };
  }, [strPayslipID, strView, t]);

  if (blnLoading) {
    return <BlockingLoader blnOpen strLabel={t("loading_payslip", "Preparing latest payslip...")} />;
  }

  return (
    <Box className={styles.page}>
      <DetailPageHeader
        strSection={t("breadcrumb_ess", "ESS")}
        strListTitle={t("ess_header_title", "My Payslips")}
        strListHref={strBackRoute || "/ess/my-payslips"}
        strCurrent={t("breadcrumb_document", "Document")}
      >
        <Button
          className={styles.secondaryButton}
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => objRouter.push(strBackRoute || "/ess/my-payslips")}
        >
          {t("back_button", "Back")}
        </Button>
        {strHtml ? (
          // The client format saves as a PDF, the default format as the page.
          <Button
            className={styles.secondaryButton}
            startIcon={<DownloadRoundedIcon />}
            onClick={() => downloadPayslipHtml(strHtml, buildPayslipFileName("payslip", strPayslipID))}
            data-controlid="payslip.document.download.button"
          >
            {t("download_button", "Download")}
          </Button>
        ) : null}
      </DetailPageHeader>
      {objPayslipViewChooser}
      {strError ? (
        <Alert severity="error">{strError}</Alert>
      ) : !strHtml ? (
        <Box>
          <Button className={styles.secondaryButton} onClick={() => void askPayslipView()} data-controlid="payslip.document.open.button">
            {t("open_payslip", "Open payslip")}
          </Button>
        </Box>
      ) : (
        <PayslipHtmlPreview
          strHtml={strHtml}
          strView={getPayslipSwitchView(strView, blnCanSwitchView)}
          blnViewChanging={blnChangingView}
          onViewChange={getPayslipSwitchView(strView, blnCanSwitchView) ? (strNext) => {
            setBlnChangingView(true);
            setStrView(strNext);
          } : undefined}
          strTaxInformationUrl={
            intResultID
              ? `/reports/payslips/${intResultID}/tax-information?backRoute=${encodeURIComponent(
                  strBackRoute || "/ess/my-payslips"
                )}`
              : undefined
          }
        />
      )}
    </Box>
  );
}
