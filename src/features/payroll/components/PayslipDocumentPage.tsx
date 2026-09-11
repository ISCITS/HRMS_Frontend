"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Alert, Box, Button } from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import PayslipHtmlPreview from "@/features/payroll/components/PayslipHtmlPreview";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { payslipService } from "@/features/payroll/services/payslipService";

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
  const [intResultID, setIntResultID] = useState<number | null>(null);

  useEffect(() => {
    let blnCancelled = false;

    async function loadPayslipDocument() {
      setBlnLoading(true);
      setStrError("");
      try {
        const [strDocumentHtml, dicSummary] = await Promise.all([
          payslipService.getDownloadHtml(strPayslipID),
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
        }
      }
    }

    loadPayslipDocument().catch(() => undefined);

    return () => {
      blnCancelled = true;
    };
  }, [strPayslipID, t]);

  if (blnLoading) {
    return <BlockingLoader blnOpen strLabel={t("loading_payslip", "Loading payslip...")} />;
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar} style={{ justifyContent: "flex-end" }}>
        <Button
          className={styles.secondaryButton}
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => objRouter.push(strBackRoute || "/ess/my-payslips")}
        >
          {t("back_button", "Back")}
        </Button>
      </Box>
      {strError ? (
        <Alert severity="error">{strError}</Alert>
      ) : (
        <PayslipHtmlPreview
          strHtml={strHtml}
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
