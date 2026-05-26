"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { usePayrollCycleLabels } from "@/features/payroll-cycles/hooks/usePayrollCycleLabels";
import { payrollCycleService } from "@/features/payroll-cycles/services/payrollCycleService";
import type { PayrollCycleListRecord } from "@/features/payroll-cycles/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type Status = "Active" | "Inactive";
type SearchForm = {
  strName: string;
  strCode: string;
  strStatus: "All" | Status;
};
type ToastState = {
  blnOpen: boolean;
  strMessage: string;
  strSeverity: "success" | "error";
};

const lstPayrollCycleModuleCodes = ["PAYROLL_CYCLE", "PAYROLL_CYCLES", "MASTER_PAYROLL_CYCLE"];
const dicEmptySearch: SearchForm = { strName: "", strCode: "", strStatus: "All" };

function formatCutoffDay(intCutoffDay: number | null) {
  return intCutoffDay ? `Day ${intCutoffDay}` : "-";
}

export default function PayrollCycleListPage() {
  const objRouter = useRouter();
  const { t } = usePayrollCycleLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstPayrollCycleModuleCodes);
  const [lstCycles, setLstCycles] = useState<PayrollCycleListRecord[]>([]);
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  async function loadPayrollCycles() {
    if (!canViewAny()) {
      setLstCycles([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      setLstCycles(await payrollCycleService.getPayrollCycles());
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : "Unable to load payroll cycles.", "error");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }
    loadPayrollCycles().catch(() => undefined);
  }, [blnRightsLoading]);

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanExport = canDoAny("export");
  const blnReadOnly = isReadOnly();

  const lstFilteredRows = useMemo(() => {
    return lstCycles.filter((dicRow) => {
      const blnNameMatch = !dicSearchApplied.strName || dicRow.strCycleName.toLowerCase().includes(dicSearchApplied.strName.toLowerCase());
      const blnCodeMatch = !dicSearchApplied.strCode || dicRow.strCycleCode.toLowerCase().includes(dicSearchApplied.strCode.toLowerCase());
      const blnStatusMatch =
        dicSearchApplied.strStatus === "All" ||
        (dicSearchApplied.strStatus === "Active" ? dicRow.blnIsActive : !dicRow.blnIsActive);
      return blnNameMatch && blnCodeMatch && blnStatusMatch;
    });
  }, [dicSearchApplied, lstCycles]);

  const lstTableRows = useMemo(
    () =>
      lstFilteredRows.map((dicRow) => ({
        id: dicRow.intID,
        action: (
          <CommonRowActions
            blnCanView={blnCanView}
            blnCanEdit={blnCanEdit}
            onView={() => objRouter.push(`/payroll/cycles/edit/${dicRow.intID}?mode=view`)}
            onEdit={blnCanEdit ? () => objRouter.push(`/payroll/cycles/edit/${dicRow.intID}`) : undefined}
          />
        ),
        strCycleCode: dicRow.strCycleCode,
        strCycleName: dicRow.strCycleName,
        strPayrollGroup: (
          <Box>
            <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>{dicRow.strPayrollGroupName ?? "-"}</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>{dicRow.strPayrollGroupCode ?? "-"}</Typography>
          </Box>
        ),
        strPeriodType: dicRow.strPeriodType,
        strCutoffDay: formatCutoffDay(dicRow.intCutoffDay),
        blnIsActive: (
          <span className={`${styles.statusPill} ${dicRow.blnIsActive ? styles.statusActive : styles.statusInactive}`}>
            {dicRow.blnIsActive ? t("active", "Active") : t("inactive", "Inactive")}
          </span>
        ),
      })),
    [blnCanEdit, blnCanView, lstFilteredRows, objRouter, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "action", headerName: t("actions", "Actions"), sortable: false, filterable: false, exportable: false, width: 110 },
      { field: "strCycleCode", headerName: t("cycle_code", "Cycle Code") },
      { field: "strCycleName", headerName: t("cycle_name", "Cycle Name") },
      { field: "strPayrollGroup", headerName: t("payroll_group", "Payroll Group"), sortable: false, filterable: false, width: 220 },
      { field: "strPeriodType", headerName: t("period_type", "Period Type") },
      { field: "strCutoffDay", headerName: t("cutoff_day", "Cutoff Day") },
      { field: "blnIsActive", headerName: t("status", "Status"), sortable: false, filterable: false, width: 130 },
    ],
    [t]
  );

  function showToast(strMessage: string, strSeverity: ToastState["strSeverity"] = "success") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  function closeToast() {
    setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }));
  }

  if (blnLoading || blnRightsLoading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: "#64748b" }}>{t("loading_payroll_cycles", "Loading payroll cycles...")}</Typography>
        </Stack>
      </Box>
    );
  }

  if (!blnCanView) {
    return (
      <Box className={styles.emptyState}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
          {t("access_denied", "Payroll cycle access is not available for your user group.")}
        </Typography>
        <Typography sx={{ mt: 1, color: "#64748b" }}>
          {t("access_denied_help", "Contact your administrator if you need payroll cycle visibility.")}
        </Typography>
        {strRightsError ? <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
      </Box>
    );
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Button className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>
          {t("back_button", "Back")}
        </Button>
      </Box>

      <Box className={styles.controlsCard}>
        <Box className={styles.searchRow}>
          <TextField label={t("cycle_code", "Cycle Code")} value={dicSearchDraft.strCode} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strCode: objEvent.target.value }))} size="small" />
          <TextField label={t("cycle_name", "Cycle Name")} value={dicSearchDraft.strName} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strName: objEvent.target.value }))} size="small" />
          <TextField select label={t("status", "Status")} value={dicSearchDraft.strStatus} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: objEvent.target.value as SearchForm["strStatus"] }))} size="small">
            <MenuItem value="All">{t("all", "All")}</MenuItem>
            <MenuItem value="Active">{t("active", "Active")}</MenuItem>
            <MenuItem value="Inactive">{t("inactive", "Inactive")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); }}>
              {t("search", "Search")}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicSearchDraft(dicEmptySearch);
                setDicSearchApplied(dicEmptySearch);
              }}
            >
              {t("clear", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      {blnReadOnly ? <Alert severity="info">{t("read_only_mode", "You have view-only access for Payroll Cycles.")}</Alert> : null}

      <Box className={styles.tableCard}>
        <BlockingLoader blnOpen={blnSubmitting} strLabel={t("processing", "Processing payroll cycle request...")} />
        <CommonTable
          columns={lstTableColumns}
          rows={lstTableRows}
          rowIdField="id"
          defaultPageSize={10}
          pageSizeOptions={[10, 20, 50]}
          exportFileName="payroll_cycles"
          showExportOptions={blnCanExport}
          showPaginationSummary
          emptyMessage={t("no_records", "No payroll cycles found.")}
          toolbarLeft={blnCanAdd ? (
            <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/payroll/cycles/add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>
              {t("add_payroll_cycle", "Add Payroll Cycle")}
            </Button>
          ) : undefined}
          sx={{ p: 0, boxShadow: "none", background: "transparent" }}
        />
      </Box>

      <Snackbar open={objToast.blnOpen} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
