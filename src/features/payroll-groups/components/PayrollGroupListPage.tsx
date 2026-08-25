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
import { payrollGroupService } from "@/features/payroll-groups/services/payrollGroupService";
import type { PayrollGroupListRecord } from "@/features/payroll-groups/types";
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

const lstPayrollGroupModuleCodes = ["PAYROLL_GROUP", "PAYROLL_GROUPS", "MASTER_PAYROLL_GROUP"];
const dicEmptySearch: SearchForm = { strName: "", strStatus: "All" };

export default function PayrollGroupListPage() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("payroll-groups");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstPayrollGroupModuleCodes);
  const [lstGroups, setLstGroups] = useState<PayrollGroupListRecord[]>([]);
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting] = useState(false);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  function openGroupEditor(intPayrollGroupID: number, strMode: "edit" | "view" = "edit") {
    objRouter.push(`/masters/payroll-groups/edit/${intPayrollGroupID}${strMode === "view" ? "?mode=view" : ""}`);
  }

  async function loadPayrollGroups() {
    if (!canViewAny()) {
      setLstGroups([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      setLstGroups(await payrollGroupService.getPayrollGroups());
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : t("group_load_list_failed", "Unable to load payroll groups."), "error");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }
    loadPayrollGroups().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blnRightsLoading]);

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanExport = canDoAny("export");
  const blnReadOnly = isReadOnly();

  const lstFilteredRows = useMemo(() => {
    return lstGroups.filter((dicRow) => {
      const blnNameMatch = !dicSearchApplied.strName || dicRow.strPayrollGroupName.toLowerCase().includes(dicSearchApplied.strName.toLowerCase());
      const blnStatusMatch =
        dicSearchApplied.strStatus === "All" ||
        (dicSearchApplied.strStatus === "Active" ? dicRow.blnIsActive : !dicRow.blnIsActive);
      return blnNameMatch && blnStatusMatch;
    });
  }, [dicSearchApplied, lstGroups]);

  const lstTableRows = useMemo(
    () =>
      lstFilteredRows.map((dicRow) => ({
        id: dicRow.intID,
        action: (
          <CommonRowActions
            testIdPrefix="payroll-groups.list.row"
            rowKey={dicRow.intID}
            blnCanView={blnCanView}
            blnCanEdit={blnCanEdit}
            onView={() => openGroupEditor(dicRow.intID, "view")}
            onEdit={blnCanEdit ? () => openGroupEditor(dicRow.intID, "edit") : undefined}
          />
        ),
        strPayrollGroupName: dicRow.strPayrollGroupName,
        strDescription: dicRow.strDescription || "-",
        blnIsActive: (
          <span className={`${styles.statusPill} ${dicRow.blnIsActive ? styles.statusActive : styles.statusInactive}`}>
            {dicRow.blnIsActive ? t("active", "Active") : t("inactive", "Inactive")}
          </span>
        ),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [blnCanEdit, blnCanView, lstFilteredRows, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "action", headerName: t("actions", "Actions"), sortable: false, filterable: false, exportable: false, width: 110 },
      { field: "strPayrollGroupName", headerName: t("payroll_group_name", "Payroll Group Name") },
      { field: "strDescription", headerName: t("description", "Description"), width: 260 },
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
          <Typography sx={{ color: "#64748b" }}>{t("group_loading_list", "Loading payroll groups...")}</Typography>
        </Stack>
      </Box>
    );
  }

  if (!blnCanView) {
    return (
      <Box className={styles.emptyState}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
          {t("group_access_denied", "You do not have access to Payroll Groups.")}
        </Typography>
        <Typography sx={{ mt: 1, color: "#64748b" }}>
          {t("group_access_denied_help", "Contact your administrator if you believe this is a mistake.")}
        </Typography>
        {strRightsError ? <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
      </Box>
    );
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Button controlId="payroll-groups.list.back.button" className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>
          {t("back_button", "Back")}
        </Button>
      </Box>

      <Box className={styles.controlsCard}>
        <Box className={styles.searchRow}>
          <TextField controlId="payroll-groups.list.name.input" label={t("payroll_group_name", "Payroll Group Name")} value={dicSearchDraft.strName} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strName: objEvent.target.value }))} size="small" />
          <TextField controlId="payroll-groups.list.search-status.select" inputProps={{ "controlId": "payroll-groups.list.search-status.select" }} select label={t("status", "Status")} value={dicSearchDraft.strStatus} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: objEvent.target.value as SearchForm["strStatus"] }))} size="small">
            <MenuItem value="All">{t("all", "All")}</MenuItem>
            <MenuItem value="Active">{t("active", "Active")}</MenuItem>
            <MenuItem value="Inactive">{t("inactive", "Inactive")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button controlId="payroll-groups.list.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); }}>
              {t("search", "Search")}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button
              controlId="payroll-groups.list.clear.button"
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

      {blnReadOnly ? <Alert severity="info">{t("group_read_only_mode", "You have view-only access to Payroll Groups.")}</Alert> : null}

      <Box className={styles.tableCard}>
        <BlockingLoader blnOpen={blnSubmitting} strLabel={t("group_processing", "Processing...")} />
        <CommonTable
          columns={lstTableColumns}
          rows={lstTableRows}
          rowIdField="id"
          exportFileName="payroll_groups"
          showExportOptions={blnCanExport}
          testIdPrefix="payroll-groups.list"
          showPaginationSummary
          emptyMessage={t("group_no_records", "No payroll groups found.")}
          toolbarLeft={blnCanAdd ? (
            <Button controlId="payroll-groups.list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/masters/payroll-groups/add")} disabled={blnLoading || blnRightsLoading}>
              {t("group_add_button", "Add Payroll Group")}
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
