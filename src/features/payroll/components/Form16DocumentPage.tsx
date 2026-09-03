"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import { Alert, Box, Button } from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import Form16HtmlPreview from "@/features/payroll/components/Form16HtmlPreview";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { form16Service } from "@/features/payroll/services/form16Service";
import { buildForm16FileName, downloadForm16Html, printForm16Html } from "@/features/payroll/utils/form16Document";

type Form16DocumentPageProps = {
  /** record_uuid from the URL; the internal id is never routed on. */
  strForm16ID: string;
  strBackRoute?: string;
};

export default function Form16DocumentPage({ strForm16ID, strBackRoute }: Form16DocumentPageProps) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("form16");
  const [strHtml, setStrHtml] = useState("");
  const [strError, setStrError] = useState("");
  const [blnLoading, setBlnLoading] = useState(true);

  useEffect(() => {
    let blnCancelled = false;

    async function loadForm16Document() {
      setBlnLoading(true);
      setStrError("");
      try {
        const strDocumentHtml = await form16Service.getDownloadHtml(strForm16ID);
        if (!blnCancelled) {
          setStrHtml(strDocumentHtml);
        }
      } catch (objError) {
        if (!blnCancelled) {
          setStrError(
            objError instanceof Error ? objError.message : t("unable_to_load_form16", "Unable to load Form 16 document.")
          );
        }
      } finally {
        if (!blnCancelled) {
          setBlnLoading(false);
        }
      }
    }

    loadForm16Document().catch(() => undefined);

    return () => {
      blnCancelled = true;
    };
  }, [strForm16ID, t]);

  if (blnLoading) {
    return <BlockingLoader blnOpen strLabel={t("loading_form16", "Loading Form 16...")} />;
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar} style={{ justifyContent: "space-between" }}>
        <Button
          className={styles.secondaryButton}
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => objRouter.push(strBackRoute || "/ess/my-form16")}
        >
          {t("back_button", "Back")}
        </Button>
        {strHtml ? (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              className={styles.secondaryButton}
              startIcon={<PrintRoundedIcon />}
              onClick={() => printForm16Html(strHtml)}
            >
              {t("print_button", "Print")}
            </Button>
            <Button
              className={styles.primaryButton}
              startIcon={<DownloadRoundedIcon />}
              onClick={() => downloadForm16Html(strHtml, buildForm16FileName("form16", strForm16ID))}
            >
              {t("download_button", "Download")}
            </Button>
          </Box>
        ) : null}
      </Box>
      {strError ? <Alert severity="error">{strError}</Alert> : <Form16HtmlPreview strHtml={strHtml} />}
    </Box>
  );
}
