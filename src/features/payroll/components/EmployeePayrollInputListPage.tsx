"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { employeePayrollInputService } from "@/features/payroll/services/employeePayrollInputService";
import type {
  EmployeePayrollInputListRecord,
} from "@/features/payroll/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type SearchForm = {
  strSearchEmployee: string;
  strSearchRun: string;
  strStatus: "All" | "Draft" | "Submitted" | "Locked";
};

type ToastState = {
  blnOpen: boolean;
  strMessage: string;
  strSeverity: "success" | "error";
};

const dicEmptySearch: SearchForm = {
  strSearchEmployee: "",
  strSearchRun: "",
  strStatus: "All",
};
const lstEmployeePayrollInputModuleCodes = ["EMPLOYEE_PAYROLL_INPUT", "EMPLOYEE_PAYROLL_INPUTS", "PAYROLL_INPUT", "PAYROLL_INPUTS"];
function formatDate(strDate: string | null) {
  if (!strDate) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(strDate));
}

function formatNumber(decValue: number | null) {
  if (decValue === null) {
    return "-";
  }
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(decValue);
}

export default function EmployeePayrollInputListPage() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("employee-payroll-input");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstEmployeePayrollInputModuleCodes);
  const [lstInputs, setLstInputs] = useState<EmployeePayrollInputListRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [dicSearchDraft, setDicSearchDraft] =
    useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [objToast, setObjToast] = useState<ToastState>({
    blnOpen: false,
    strMessage: "",
    strSeverity: "success",
  });
  const blnCanView = canViewAny() || canDoAny("list");
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnCanExport = canDoAny("export");

  async function loadInputs(objFilters: SearchForm = dicSearchApplied) {
    if (!blnCanView) {
      setLstInputs([]);
      setBlnLoading(false);
      return;
    }

    setBlnLoading(true);
    setStrError("");
    try {
      setLstInputs(
        await employeePayrollInputService.getEmployeePayrollInputs(objFilters)
      );
    } catch (objError) {
      setStrError(
        objError instanceof Error
          ? objError.message
          : "Unable to load payroll inputs."
      );
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }

    loadInputs().catch(() => undefined);
  }, [blnRightsLoading, blnCanView]);

  const lstFilteredRows = useMemo(() => {
    return lstInputs.filter((dicRow) => {
      const strEmployeeSearch = dicSearchApplied.strSearchEmployee.toLowerCase();
      const strRunSearch = dicSearchApplied.strSearchRun.toLowerCase();
      const blnEmployeeMatch =
        !strEmployeeSearch ||
        dicRow.strEmployeeCode.toLowerCase().includes(strEmployeeSearch) ||
        dicRow.strEmployeeName.toLowerCase().includes(strEmployeeSearch);
      const blnRunMatch =
        !strRunSearch ||
        dicRow.strRunCode.toLowerCase().includes(strRunSearch) ||
        dicRow.strRunName.toLowerCase().includes(strRunSearch);
      const blnStatusMatch =
        dicSearchApplied.strStatus === "All" ||
        dicRow.strStatus === dicSearchApplied.strStatus;
      return blnEmployeeMatch && blnRunMatch && blnStatusMatch;
    });
  }, [dicSearchApplied, lstInputs]);

  function showToast(
    strMessage: string,
    strSeverity: ToastState["strSeverity"] = "success"
  ) {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  function navigateToFullScreen(strPath: string) {
    window.location.assign(strPath);
  }

  const lstTableRows = useMemo(
    () =>
      lstFilteredRows.map((dicRow) => ({
        id: dicRow.intID,
        action: (
          <CommonRowActions
            testIdPrefix="employee-payroll-inputs.list.row"
            rowKey={dicRow.intID}
            blnCanView={blnCanView}
            blnCanEdit={blnCanEdit && !dicRow.blnIsLocked}
            onView={() =>
              navigateToFullScreen(`/payroll/employee-payroll-inputs/${dicRow.intID}/edit?mode=view`)
            }
            onEdit={blnCanEdit ? () => navigateToFullScreen(`/payroll/employee-payroll-inputs/${dicRow.intID}/edit`) : undefined}
          />
        ),
        strEmployeeName: dicRow.strEmployeeName,
        strEmployeeCode: dicRow.strEmployeeCode,
        strRunName: dicRow.strRunName,
        dtPayrollMonth: formatDate(dicRow.dtPayrollMonth),
        decLwpDays: formatNumber(dicRow.decLwpDays),
        decLopDays: formatNumber(dicRow.decLopDays),
        strStatus: (
          <span className={`${styles.statusPill} ${dicRow.strStatus === "Locked" ? styles.statusInactive : styles.statusActive}`}>
            {dicRow.strStatus}
          </span>
        ),
      })),
    [blnCanEdit, blnCanView, lstFilteredRows]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "action", headerName: t("actions", "Actions"), sortable: false, filterable: false, exportable: false, width: 110 },
      { field: "strEmployeeName", headerName: t("employee_name", "Employee Name") },
      { field: "strEmployeeCode", headerName: t("employee_code", "Employee Code") },
      { field: "strRunName", headerName: t("payroll_run", "Payroll Run") },
      { field: "dtPayrollMonth", headerName: t("payroll_month", "Payroll Month") },
      { field: "decLwpDays", headerName: t("lwp_days", "LWP"), align: "right" },
      { field: "decLopDays", headerName: t("lop_days", "LOP"), align: "right" },
      { field: "strStatus", headerName: t("status", "Status"), sortable: false, filterable: false, width: 130 },
    ],
    [t]
  );

  if (blnLoading || blnRightsLoading) {
    return (
      <BlockingLoader
        blnOpen
        strLabel={t(
          "loading_employee_payroll_inputs",
          "Loading payroll inputs..."
        )}
      />
    );
  }

  return (
    <Box className={styles.page}>
      <Typography className={`${styles.breadcrumbs} ${styles.hiddenHeader}`}>
        {t("breadcrumbs", "Payroll / Payroll Input")}
      </Typography>

      <Box className={`${styles.topBar} ${styles.hiddenHeader}`}>
        <Button
          controlId="employee-payroll-input.list.back.button"
          className={styles.secondaryButton}
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => objRouter.push("/payroll")}
        >
          {t("back_button", "Back to Payroll")}
        </Button>
      </Box>

      <Box className={styles.controlsCard}>
        <Box className={`${styles.searchRow} ${styles.employeePayrollInputSearchRow}`}>
          <TextField
            controlId="employee-payroll-input.list.employee-search.input"
            value={dicSearchDraft.strSearchEmployee}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({
                ...dicPrevious,
                strSearchEmployee: objEvent.target.value,
              }))
            }
            placeholder={t(
              "employee_search_placeholder",
              "Search by employee code or name"
            )}
            fullWidth
          />
          <TextField
            value={dicSearchDraft.strSearchRun}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({
                ...dicPrevious,
                strSearchRun: objEvent.target.value,
              }))
            }
            placeholder={t("run_search_placeholder", "Search by payroll run")}
            fullWidth
          />
          <TextField
            select
            value={dicSearchDraft.strStatus}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({
                ...dicPrevious,
                strStatus: objEvent.target.value as SearchForm["strStatus"],
              }))
            }
            fullWidth
          >
            <MenuItem value="All">{t("status_all", "All statuses")}</MenuItem>
            <MenuItem value="Draft">{t("status_draft", "Draft")}</MenuItem>
            <MenuItem value="Submitted">{t("status_submitted", "Submitted")}</MenuItem>
            <MenuItem value="Locked">{t("status_locked", "Locked")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button
              controlId="employee-payroll-input.list.search.button"
              className={styles.primaryButton}
              startIcon={<SearchRoundedIcon />}
              onClick={() => {
                setDicSearchApplied(dicSearchDraft);
                loadInputs(dicSearchDraft).catch(() => undefined);
              }}
            >
              {t("search", "Search")}
            </Button>
            <Button
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicSearchDraft(dicEmptySearch);
                setDicSearchApplied(dicEmptySearch);
                loadInputs(dicEmptySearch).catch(() => undefined);
              }}
            >
              {t("clear", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard}>
        {strRightsError ? <Alert severity="warning" sx={{ mb: 1.5 }}>{strRightsError}</Alert> : null}
        {strError ? <Alert severity="error" sx={{ mb: 1.5 }}>{strError}</Alert> : null}
        {!blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("access_denied", "Payroll input access is not available for your user group.")}</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>{t("access_denied_help", "Contact your administrator if you need payroll input visibility.")}</Typography>
          </Box>
        ) : null}
        {blnCanView ? (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            defaultPageSize={10}
            pageSizeOptions={[10, 20, 50]}
            exportFileName="employee-payroll-inputs"
            showExportOptions={blnCanExport}
            showPaginationSummary
            emptyMessage={t("empty_message", "No payroll inputs found for the current filters.")}
            testIdPrefix="employee-payroll-input.list"
            toolbarLeft={blnCanAdd ? (
              <Button
                controlId="employee-payroll-input.list.add.button"
                className={styles.primaryButton}
                startIcon={<AddRoundedIcon />}
                onClick={() => navigateToFullScreen("/payroll/employee-payroll-inputs/new")}
              >
                {t("employee_payroll_input_add_button", "Add Payroll Input")}
              </Button>
            ) : undefined}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        ) : null}

      </Box>

      <Snackbar
        open={objToast.blnOpen}
        autoHideDuration={3200}
        onClose={() =>
          setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }))
        }
      >
        <Alert severity={objToast.strSeverity} variant="filled">
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
