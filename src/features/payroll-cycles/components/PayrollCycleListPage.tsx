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
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { payrollCycleService } from "@/features/payroll-cycles/services/payrollCycleService";
import type { PayrollCycleListRecord } from "@/features/payroll-cycles/types";
import { setPayrollScheduleSelectedID } from "@/features/payroll-cycles/utils/payrollScheduleRouteState";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type Status = "Active" | "Inactive";
type SearchForm = {
  strName: string;
  strStatus: "All" | Status;
};
type ToastState = {
  blnOpen: boolean;
  strMessage: string;
  strSeverity: "success" | "error";
};

const lstPayrollCycleModuleCodes = ["PAYROLL_CYCLE", "PAYROLL_CYCLES", "MASTER_PAYROLL_CYCLE"];
const dicEmptySearch: SearchForm = { strName: "", strStatus: "All" };

export default function PayrollCycleListPage() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("payroll-cycles");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstPayrollCycleModuleCodes);
  const [lstCycles, setLstCycles] = useState<PayrollCycleListRecord[]>([]);
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  function openScheduleEditor(intPayrollCycleID: number, strMode: "edit" | "view" = "edit") {
    setPayrollScheduleSelectedID(intPayrollCycleID);
    objRouter.push("/payroll/schedules/edit");
  }

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
      showToast(objError instanceof Error ? objError.message : t("schedule_load_list_failed"), "error");
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
      const blnStatusMatch =
        dicSearchApplied.strStatus === "All" ||
        (dicSearchApplied.strStatus === "Active" ? dicRow.blnIsActive : !dicRow.blnIsActive);
      return blnNameMatch && blnStatusMatch;
    });
  }, [dicSearchApplied, lstCycles]);

  const lstTableRows = useMemo(
    () =>
      lstFilteredRows.map((dicRow) => ({
        id: dicRow.intID,
        action: (
          <CommonRowActions
            testIdPrefix="payroll-cycles.list.row"
            rowKey={dicRow.intID}
            blnCanView={blnCanView}
            blnCanEdit={blnCanEdit}
            onView={() => openScheduleEditor(dicRow.intID, "view")}
            onEdit={blnCanEdit ? () => openScheduleEditor(dicRow.intID, "edit") : undefined}
          />
        ),
        strCycleName: dicRow.strCycleName,
        strPayrollGroup: (
          <Box>
            <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>{dicRow.strPayrollGroupName ?? "-"}</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>{dicRow.strPayrollGroupCode ?? "-"}</Typography>
          </Box>
        ),
        strPeriodType: dicRow.strPeriodType,
        blnIsActive: (
          <span className={`${styles.statusPill} ${dicRow.blnIsActive ? styles.statusActive : styles.statusInactive}`}>
            {dicRow.blnIsActive ? t("active") : t("inactive")}
          </span>
        ),
      })),
    [blnCanEdit, blnCanView, lstFilteredRows, objRouter, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "action", headerName: t("actions"), sortable: false, filterable: false, exportable: false, width: 110 },
      { field: "strCycleName", headerName: t("schedule_name", "Payroll Schedule") },
      { field: "strPayrollGroup", headerName: t("payroll_group"), sortable: false, filterable: false, width: 220 },
      { field: "strPeriodType", headerName: t("period_type") },
      { field: "blnIsActive", headerName: t("status"), sortable: false, filterable: false, width: 130 },
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
          <Typography sx={{ color: "#64748b" }}>{t("schedule_loading_list")}</Typography>
        </Stack>
      </Box>
    );
  }

  if (!blnCanView) {
    return (
      <Box className={styles.emptyState}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
          {t("schedule_access_denied")}
        </Typography>
        <Typography sx={{ mt: 1, color: "#64748b" }}>
          {t("schedule_access_denied_help")}
        </Typography>
        {strRightsError ? <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
      </Box>
    );
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Button controlId="payroll-cycles.list.back.button" className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>
          {t("back_button")}
        </Button>
      </Box>

      <Box className={styles.controlsCard}>
        <Box className={styles.searchRow}>
          <TextField controlId="payroll-cycles.list.cycle-name.input" inputProps={{ "controlId": "payroll-cycles.list.cycle-name.input" }} label={t("schedule_name", "Payroll Schedule")} value={dicSearchDraft.strName} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strName: objEvent.target.value }))} size="small" />
          <TextField controlId="payroll-cycles.list.search-status.select" inputProps={{ "controlId": "payroll-cycles.list.search-status.select" }} select label={t("status")} value={dicSearchDraft.strStatus} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: objEvent.target.value as SearchForm["strStatus"] }))} size="small">
            <MenuItem controlId="payroll-cycles.list.search-status.all.option" value="All">{t("all")}</MenuItem>
            <MenuItem controlId="payroll-cycles.list.search-status.active.option" value="Active">{t("active")}</MenuItem>
            <MenuItem controlId="payroll-cycles.list.search-status.inactive.option" value="Inactive">{t("inactive")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button controlId="payroll-cycles.list.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); }}>
              {t("search")}
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
              {t("clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      {blnReadOnly ? <Alert severity="info">{t("schedule_read_only_mode")}</Alert> : null}

      <Box className={styles.tableCard}>
        <BlockingLoader blnOpen={blnSubmitting} strLabel={t("schedule_processing")} />
        <CommonTable
          columns={lstTableColumns}
          rows={lstTableRows}
          rowIdField="id"
          exportFileName="payroll_cycles"
          showExportOptions={blnCanExport}
          testIdPrefix="payroll-cycles.list"
          showPaginationSummary
          emptyMessage={t("schedule_no_records")}
          toolbarLeft={blnCanAdd ? (
            <Button controlId="payroll-cycles.list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/payroll/schedules/add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>
              {t("schedule_add_button")}
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
