"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Alert, Box, Button } from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BlockingLoader from "@/components/shared/BlockingLoader";
import { DetailPageHeader } from "@/components/master/MasterListUi";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import PayslipHtmlPreview from "@/features/payroll/components/PayslipHtmlPreview";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { payslipService, type PayslipView } from "@/features/payroll/services/payslipService";

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
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnChangingView, setBlnChangingView] = useState(false);
  const [strView, setStrView] = useState<PayslipView>("monthly");
  const [intResultID, setIntResultID] = useState<number | null>(null);

  useEffect(() => {
    let blnCancelled = false;

    async function loadPayslipDocument() {
      setStrError("");
      try {
        // The server returns the latest figures even when this link points to an outdated copy.
        const [strDocumentHtml, dicSummary] = await Promise.all([
          payslipService.getDownloadHtml(strPayslipID, strView),
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
      </DetailPageHeader>
      {strError ? (
        <Alert severity="error">{strError}</Alert>
      ) : (
        <PayslipHtmlPreview
          strHtml={strHtml}
          strView={strView}
          blnViewChanging={blnChangingView}
          onViewChange={(strNext) => {
            setBlnChangingView(true);
            setStrView(strNext);
          }}
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
