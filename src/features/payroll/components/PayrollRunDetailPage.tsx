"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { payrollRunService } from "@/features/payroll/services/payrollRunService";
import type {
  PayrollRunDetailRecord,
  PayrollRunStatus,
} from "@/features/payroll/types";

type PayrollRunDetailPageProps = {
  intRunID: number;
};

function formatDateTime(strDate: string | null) {
  if (!strDate) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(strDate));
}

function formatMonth(strDate: string) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(strDate));
}

function getStatusPillSx(strStatus: string) {
  const dicToneByStatus: Record<string, { background: string; color: string }> = {
    Open: { background: "#2563eb", color: "#fff" },
    Submitted: { background: "#ea580c", color: "#fff" },
    Approved: { background: "#16a34a", color: "#fff" },
    Processed: { background: "#0f766e", color: "#fff" },
    Closed: { background: "#475569", color: "#fff" },
  };
  return dicToneByStatus[strStatus] ?? { background: "#2563eb", color: "#fff" };
}

function SummaryCard({
  strLabel,
  strValue,
}: {
  strLabel: string;
  strValue: string;
}) {
  return (
    <Box
      sx={{
        border: "1px solid #d9e6ef",
        borderRadius: 3,
        background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
        p: 2,
      }}
    >
      <Typography sx={{ color: "#64748b", fontSize: "0.84rem", mb: 0.6 }}>
        {strLabel}
      </Typography>
      <Typography sx={{ color: "#0f172a", fontSize: "1.45rem", fontWeight: 800 }}>
        {strValue}
      </Typography>
    </Box>
  );
}

export default function PayrollRunDetailPage({
  intRunID,
}: PayrollRunDetailPageProps) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("payroll-runs");
  const { t: tCommon } = useModuleLabels("common");
  const [objRun, setObjRun] = useState<PayrollRunDetailRecord | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const [strRunStatus, setStrRunStatus] = useState<PayrollRunStatus>("Open");
  const [blnIsLocked, setBlnIsLocked] = useState(false);

  useEffect(() => {
    let blnMounted = true;

    async function loadRun() {
      setBlnLoading(true);
      setStrError("");
      try {
        const dicRun = await payrollRunService.getPayrollRunById(intRunID);
        if (!blnMounted) {
          return;
        }
        setObjRun(dicRun);
        setStrRunStatus(dicRun.strRunStatus);
        setBlnIsLocked(dicRun.blnIsLocked);
      } catch (objError) {
        if (blnMounted) {
          setStrError(
            objError instanceof Error
              ? objError.message
              : "Unable to load payroll run."
          );
        }
      } finally {
        if (blnMounted) {
          setBlnLoading(false);
        }
      }
    }

    loadRun().catch(() => undefined);
    return () => {
      blnMounted = false;
    };
  }, [intRunID]);

  async function saveStatus() {
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const dicRun = await payrollRunService.updatePayrollRunStatus(
        intRunID,
        strRunStatus,
        blnIsLocked
      );
      setObjRun(dicRun);
      setStrSuccess(t("status_update_success", "Payroll run status updated successfully."));
    } catch (objError) {
      setStrError(
        objError instanceof Error
          ? objError.message
          : "Unable to update payroll run status."
      );
    } finally {
      setBlnSaving(false);
    }
  }

  if (blnLoading) {
    return <BlockingLoader strLabel={t("loading_run", "Loading payroll run...")} />;
  }

  if (!objRun) {
    return (
      <Box className={styles.page}>
        <Alert severity="error">{strError || t("not_found", "Payroll run not found.")}</Alert>
      </Box>
    );
  }

  return (
    <Box className={styles.page} sx={{ overflowY: "auto", height: "auto" }}>
      <Typography className={styles.breadcrumbs}>
        {t("breadcrumbs_detail", "Payroll / Payroll Runs / Detail")}
      </Typography>
      <Box className={styles.topBar}>
        <Button
          className={styles.secondaryButton}
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => objRouter.push("/payroll/runs")}
        >
          {t("back_to_list", "Back to List")}
        </Button>
      </Box>

      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader}>
          <Typography className={styles.title}>{objRun.strRunName}</Typography>
          <span className={styles.statusPill} style={getStatusPillSx(objRun.strRunStatus)}>
            {objRun.strRunStatus}
          </span>
        </Box>
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" },
            mt: 1.5,
          }}
        >
          <SummaryCard strLabel={t("run_code", "Run Code")} strValue={objRun.strRunCode} />
          <SummaryCard strLabel={t("payroll_month", "Payroll Month")} strValue={formatMonth(objRun.dtPayrollMonth)} />
          <SummaryCard strLabel={t("inputs", "Inputs")} strValue={String(objRun.dicSummary.intInputCount)} />
          <SummaryCard strLabel={t("locked_inputs", "Locked Inputs")} strValue={String(objRun.dicSummary.intLockedCount)} />
        </Box>
      </Box>

      <Box className={styles.tableCard} sx={{ p: 2, gap: 2 }}>
        {strError ? <Alert severity="error">{strError}</Alert> : null}
        {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}

        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          }}
        >
          <Box
            sx={{
              border: "1px solid #d9e6ef",
              borderRadius: 3,
              background: "#fff",
              p: 2,
            }}
          >
            <Typography sx={{ color: "#173b63", fontWeight: 800, mb: 1.5 }}>
              {t("summary_title", "Run Summary")}
            </Typography>
            <Stack spacing={1}>
              <Typography>{t("draft_count", "Draft Inputs")}: {objRun.dicSummary.intDraftCount}</Typography>
              <Typography>{t("submitted_count", "Submitted Inputs")}: {objRun.dicSummary.intSubmittedCount}</Typography>
              <Typography>{t("total_lwp", "Total LWP Days")}: {objRun.dicSummary.decTotalLwpDays}</Typography>
              <Typography>{t("total_lop", "Total LOP Days")}: {objRun.dicSummary.decTotalLopDays}</Typography>
            </Stack>
          </Box>

          <Box
            sx={{
              border: "1px solid #d9e6ef",
              borderRadius: 3,
              background: "#fff",
              p: 2,
            }}
          >
            <Typography sx={{ color: "#173b63", fontWeight: 800, mb: 1.5 }}>
              {t("status_title", "Status Update")}
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                select
                label={t("status", "Status")}
                value={strRunStatus}
                onChange={(objEvent) =>
                  setStrRunStatus(objEvent.target.value as PayrollRunStatus)
                }
                fullWidth
              >
                <MenuItem value="Open">{t("status_open", "Open")}</MenuItem>
                <MenuItem value="Submitted">{t("status_submitted", "Submitted")}</MenuItem>
                <MenuItem value="Approved">{t("status_approved", "Approved")}</MenuItem>
                <MenuItem value="Processed">{t("status_processed", "Processed")}</MenuItem>
                <MenuItem value="Closed">{t("status_closed", "Closed")}</MenuItem>
              </TextField>
              <Box className={styles.switchRow}>
                <Typography>{t("locked", "Locked")}</Typography>
                <Switch
                  checked={blnIsLocked}
                  onChange={(_, blnChecked) => setBlnIsLocked(blnChecked)}
                />
              </Box>
              <Button
                className={styles.primaryButton}
                onClick={saveStatus}
                disabled={blnSaving}
              >
                {blnSaving ? tCommon("processing", "Processing...") : tCommon("save", "Save")}
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box
          sx={{
            border: "1px solid #d9e6ef",
            borderRadius: 3,
            background: "#fff",
            p: 2,
          }}
        >
          <Typography sx={{ color: "#173b63", fontWeight: 800, mb: 1.5 }}>
            {t("meta_title", "Run Timeline")}
          </Typography>
          <Stack spacing={1}>
            <Typography>{t("created_on", "Created On")}: {formatDateTime(objRun.dtAddedOn)}</Typography>
            <Typography>{t("modified_on", "Last Modified On")}: {formatDateTime(objRun.dtLastModifiedOn)}</Typography>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
