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
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useVersionLogLabels } from "@/features/version-logs/hooks/useVersionLogLabels";
import {
  createInitialVersionLogFilters,
  versionLogService
} from "@/features/version-logs/services/versionLogService";
import type { VersionLogListRecord } from "@/features/version-logs/types";

type VersionLogFilters = ReturnType<typeof createInitialVersionLogFilters>;
type ToastState = {
  blnOpen: boolean;
  strMessage: string;
  strSeverity: "success" | "error";
};

const lstModuleCodes = ["VERSION_LOG", "VERSION_LOGS", "MASTER_VERSION_LOG", "VERSION_LOG_MASTER"];

function formatDate(strValue: string | null | undefined) {
  if (!strValue) {
    return "-";
  }
  const objDate = new Date(strValue);
  if (Number.isNaN(objDate.getTime())) {
    return strValue;
  }
  return objDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatDateTime(strValue: string | null | undefined) {
  if (!strValue) {
    return "-";
  }
  const objDate = new Date(strValue);
  if (Number.isNaN(objDate.getTime())) {
    return strValue;
  }
  return objDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function VersionLogListPage() {
  const objRouter = useRouter();
  const { t } = useVersionLogLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstModuleCodes);
  const [lstVersionLogs, setLstVersionLogs] = useState<VersionLogListRecord[]>([]);
  const [dicSearchDraft, setDicSearchDraft] = useState<VersionLogFilters>(createInitialVersionLogFilters());
  const [dicSearchApplied, setDicSearchApplied] = useState<VersionLogFilters>(createInitialVersionLogFilters());
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  async function loadVersionLogs() {
    if (!canViewAny()) {
      setLstVersionLogs([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    try {
      setLstVersionLogs(await versionLogService.getVersionLogs(dicSearchApplied));
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : "Unable to load version logs.", "error");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }
    loadVersionLogs().catch(() => undefined);
  }, [blnRightsLoading, dicSearchApplied]);

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanExport = canDoAny("export");
  const blnReadOnly = isReadOnly();

  const lstTableRows = useMemo(
    () =>
      lstVersionLogs.map((dicRow) => ({
        id: dicRow.intID,
        action: (
          <CommonRowActions
            blnCanView={blnCanView}
            blnCanEdit={blnCanEdit}
            onView={() => objRouter.push(`/version-logs/edit/${dicRow.intID}?mode=view`)}
            onEdit={blnCanEdit ? () => objRouter.push(`/version-logs/edit/${dicRow.intID}`) : undefined}
          />
        ),
        strVersionCode: dicRow.strVersionCode,
        strVersionName: dicRow.strVersionName,
        dtReleaseDate: formatDate(dicRow.dtReleaseDate),
        strReleaseNotes: (
          <Box sx={{ whiteSpace: "normal", minWidth: 280, maxWidth: 520, lineHeight: 1.45 }}>
            {dicRow.strReleaseNotes ?? "-"}
          </Box>
        ),
        blnIsActive: (
          <span className={`${styles.statusPill} ${dicRow.blnIsActive ? styles.statusActive : styles.statusInactive}`}>
            {dicRow.blnIsActive ? t("active", "Active") : t("inactive", "Inactive")}
          </span>
        ),
        dtUpdatedOn: formatDateTime(dicRow.dtUpdatedOn),
      })),
    [blnCanEdit, blnCanView, lstVersionLogs, objRouter, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "action", headerName: t("actions", "Actions"), sortable: false, filterable: false, exportable: false, width: 110 },
      { field: "strVersionCode", headerName: t("version_code", "Version Code") },
      { field: "strVersionName", headerName: t("version_name", "Version Name") },
      { field: "dtReleaseDate", headerName: t("release_date", "Release Date") },
      { field: "strReleaseNotes", headerName: t("release_notes", "Release Notes"), sortable: false, filterable: false, width: 360 },
      { field: "blnIsActive", headerName: t("status", "Status"), sortable: false, filterable: false, width: 130 },
      { field: "dtUpdatedOn", headerName: t("updated_on", "Updated On") },
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
          <Typography sx={{ color: "#64748b" }}>{t("loading_version_logs", "Loading version logs...")}</Typography>
        </Stack>
      </Box>
    );
  }

  if (!blnCanView) {
    return (
      <Box className={styles.emptyState}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
          {t("access_denied", "Version log access is not available for your user group.")}
        </Typography>
        <Typography sx={{ mt: 1, color: "#64748b" }}>
          {t("access_denied_help", "Contact your administrator if you need version log visibility.")}
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
          <TextField
            label={t("version_code", "Version Code")}
            value={dicSearchDraft.strSearchCode}
            onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchCode: objEvent.target.value.toUpperCase() }))}
            size="small"
          />
          <TextField
            label={t("version_name", "Version Name")}
            value={dicSearchDraft.strSearchName}
            onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchName: objEvent.target.value }))}
            size="small"
          />
          <TextField
            select
            label={t("status", "Status")}
            value={dicSearchDraft.strStatus}
            onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: objEvent.target.value as VersionLogFilters["strStatus"] }))}
            size="small"
          >
            <MenuItem value="All">{t("all", "All")}</MenuItem>
            <MenuItem value="Active">{t("active", "Active")}</MenuItem>
            <MenuItem value="Inactive">{t("inactive", "Inactive")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => setDicSearchApplied({ ...dicSearchDraft })}>
              {t("search", "Search")}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                const dicReset = createInitialVersionLogFilters();
                setDicSearchDraft(dicReset);
                setDicSearchApplied(dicReset);
              }}
            >
              {t("clear", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      {blnReadOnly ? <Alert severity="info">{t("read_only_mode", "You have view-only access for Version Logs.")}</Alert> : null}

      <Box className={styles.tableCard}>
        <BlockingLoader blnOpen={blnSubmitting} strLabel={t("processing", "Processing version log request...")} />
        <CommonTable
          columns={lstTableColumns}
          rows={lstTableRows}
          rowIdField="id"
          defaultPageSize={10}
          pageSizeOptions={[10, 20, 50]}
          exportFileName="version_logs"
          showExportOptions={blnCanExport}
          showPaginationSummary
          emptyMessage={t("empty_message", "No version logs found.")}
          toolbarLeft={blnCanAdd ? (
            <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/version-logs/add")}>
              {t("add_version_log", "Add Version Log")}
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
