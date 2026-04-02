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
  Pagination,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonRowActions from "@/components/master/CommonRowActions";
import CommonPayrollDialog from "@/features/payroll/components/CommonPayrollDialog";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { employeePayrollInputService } from "@/features/payroll/services/employeePayrollInputService";
import type {
  EmployeePayrollInputDetailRecord,
  EmployeePayrollInputListRecord,
} from "@/features/payroll/types";

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
const lstRowsPerPageOptions = [10, 20, 50];

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

function downloadCsv(strFileName: string, lstRows: EmployeePayrollInputListRecord[]) {
  const lstHeaders = [
    "Employee Code",
    "Employee Name",
    "Payroll Run",
    "Payroll Month",
    "LWP",
    "LOP",
    "Status",
    "Locked",
  ];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) =>
      [
        dicRow.strEmployeeCode,
        dicRow.strEmployeeName,
        dicRow.strRunName,
        dicRow.dtPayrollMonth ?? "",
        dicRow.decLwpDays ?? "",
        dicRow.decLopDays ?? "",
        dicRow.strStatus,
        dicRow.blnIsLocked ? "Yes" : "No",
      ]
        .map((strValue) => `"${String(strValue).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];
  const objBlob = new Blob([lstLines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const strUrl = URL.createObjectURL(objBlob);
  const objLink = document.createElement("a");
  objLink.href = strUrl;
  objLink.download = strFileName;
  objLink.click();
  URL.revokeObjectURL(strUrl);
}

function exportPdf(strTitle: string, lstRows: EmployeePayrollInputListRecord[]) {
  const objWindow = window.open("", "_blank", "width=1200,height=800");
  if (!objWindow) {
    return;
  }
  const strRows = lstRows
    .map(
      (dicRow) => `
    <tr>
      <td>${dicRow.strEmployeeCode}</td>
      <td>${dicRow.strEmployeeName}</td>
      <td>${dicRow.strRunName}</td>
      <td>${dicRow.dtPayrollMonth ?? "-"}</td>
      <td>${dicRow.decLwpDays ?? "-"}</td>
      <td>${dicRow.decLopDays ?? "-"}</td>
      <td>${dicRow.strStatus}</td>
    </tr>
  `
    )
    .join("");
  objWindow.document.write(`
    <html>
      <head>
        <title>${strTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
          th { background: #e2e8f0; }
        </style>
      </head>
      <body>
        <h1>${strTitle}</h1>
        <table>
          <thead>
            <tr>
              <th>Employee Code</th>
              <th>Employee Name</th>
              <th>Payroll Run</th>
              <th>Payroll Month</th>
              <th>LWP</th>
              <th>LOP</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${strRows}</tbody>
        </table>
      </body>
    </html>
  `);
  objWindow.document.close();
  objWindow.focus();
  objWindow.print();
}

export default function EmployeePayrollInputListPage() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("employee-payroll-input");
  const [lstInputs, setLstInputs] = useState<EmployeePayrollInputListRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [dicSearchDraft, setDicSearchDraft] =
    useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] =
    useState<SearchForm>(dicEmptySearch);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
  const [objPreviewRecord, setObjPreviewRecord] =
    useState<EmployeePayrollInputDetailRecord | null>(null);
  const [objToast, setObjToast] = useState<ToastState>({
    blnOpen: false,
    strMessage: "",
    strSeverity: "success",
  });

  async function loadInputs(objFilters: SearchForm = dicSearchApplied) {
    setBlnLoading(true);
    setStrError("");
    try {
      setLstInputs(
        await employeePayrollInputService.getEmployeePayrollInputs(objFilters)
      );
      setIntPage(1);
    } catch (objError) {
      setStrError(
        objError instanceof Error
          ? objError.message
          : "Unable to load employee payroll inputs."
      );
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    loadInputs().catch(() => undefined);
  }, []);

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

  const intPageCount = Math.max(1, Math.ceil(lstFilteredRows.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleRows = lstFilteredRows.slice(
    intStartIndex,
    intStartIndex + intRowsPerPage
  );

  function showToast(
    strMessage: string,
    strSeverity: ToastState["strSeverity"] = "success"
  ) {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  async function openPreview(intInputID: number) {
    try {
      setObjPreviewRecord(
        await employeePayrollInputService.getEmployeePayrollInputById(intInputID)
      );
    } catch (objError) {
      showToast(
        objError instanceof Error
          ? objError.message
          : "Unable to load employee payroll input.",
        "error"
      );
    }
  }

  if (blnLoading) {
    return (
      <BlockingLoader
        strLabel={t(
          "loading_employee_payroll_inputs",
          "Loading employee payroll inputs..."
        )}
      />
    );
  }

  return (
    <Box className={styles.page}>
      <Typography className={`${styles.breadcrumbs} ${styles.hiddenHeader}`}>
        {t("breadcrumbs", "Payroll / Employee Payroll Input")}
      </Typography>

      <Box className={`${styles.topBar} ${styles.hiddenHeader}`}>
        <Button
          className={styles.secondaryButton}
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => objRouter.push("/payroll")}
        >
          {t("back_button", "Back to Payroll")}
        </Button>
      </Box>

      <Box className={styles.controlsCard}>
        <Box className={styles.searchRow}>
          <TextField
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
        <Box className={styles.listUtilityBar}>
          <Box className={styles.listUtilityActions}>
            <Button
              className={styles.primaryButton}
              startIcon={<AddRoundedIcon />}
              onClick={() => objRouter.push("/payroll/employee-payroll-inputs/new")}
            >
              {t("add_button", "Add Payroll Input")}
            </Button>
            <Button
              className={styles.secondaryButton}
              startIcon={<DownloadRoundedIcon />}
              onClick={() =>
                downloadCsv("employee-payroll-inputs.csv", lstFilteredRows)
              }
            >
              {t("export_csv", "Export CSV")}
            </Button>
            <Button
              className={styles.secondaryButton}
              startIcon={<DownloadRoundedIcon />}
              onClick={() =>
                exportPdf("Employee Payroll Input", lstFilteredRows)
              }
            >
              {t("export_pdf", "Export PDF")}
            </Button>
          </Box>

          <Box className={styles.paginationBar} sx={{ p: 0 }}>
            <Box className={styles.paginationInfo}>
              <Typography>{t("rows_per_page", "Rows per page")}</Typography>
              <TextField
                select
                size="small"
                value={intRowsPerPage}
                onChange={(objEvent) => {
                  setIntRowsPerPage(Number(objEvent.target.value));
                  setIntPage(1);
                }}
                className={styles.rowsPerPageSelect}
                sx={{ width: 92 }}
              >
                {lstRowsPerPageOptions.map((intOption) => (
                  <MenuItem key={intOption} value={intOption}>
                    {intOption}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Pagination
              count={intPageCount}
              page={intCurrentPage}
              onChange={(_, intValue) => setIntPage(intValue)}
              color="primary"
            />
          </Box>
        </Box>

        {strError ? <Alert severity="error" sx={{ mb: 1.5 }}>{strError}</Alert> : null}
        <Box className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("employee_code", "Employee Code")}</th>
                <th>{t("employee_name", "Employee Name")}</th>
                <th>{t("payroll_run", "Payroll Run")}</th>
                <th>{t("payroll_month", "Payroll Month")}</th>
                <th>{t("lwp_days", "LWP")}</th>
                <th>{t("lop_days", "LOP")}</th>
                <th>{t("status", "Status")}</th>
                <th>{t("actions", "Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {lstVisibleRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyState}>
                    {t(
                      "empty_message",
                      "No employee payroll inputs found for the current filters."
                    )}
                  </td>
                </tr>
              ) : null}
              {lstVisibleRows.map((dicRow) => (
                <tr key={dicRow.intID}>
                  <td>{dicRow.strEmployeeCode}</td>
                  <td>{dicRow.strEmployeeName}</td>
                  <td>{dicRow.strRunName}</td>
                  <td>{formatDate(dicRow.dtPayrollMonth)}</td>
                  <td>{formatNumber(dicRow.decLwpDays)}</td>
                  <td>{formatNumber(dicRow.decLopDays)}</td>
                  <td>
                    <span
                      className={`${styles.statusPill} ${
                        dicRow.strStatus === "Locked"
                          ? styles.statusInactive
                          : styles.statusActive
                      }`}
                    >
                      {dicRow.strStatus}
                    </span>
                  </td>
                  <td>
                    <CommonRowActions
                      blnCanView
                      blnCanEdit={!dicRow.blnIsLocked}
                      onView={() => openPreview(dicRow.intID).catch(() => undefined)}
                      onEdit={() =>
                        objRouter.push(
                          `/payroll/employee-payroll-inputs/${dicRow.intID}/edit`
                        )
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>

      </Box>

      <CommonPayrollDialog
        blnOpen={Boolean(objPreviewRecord)}
        onClose={() => setObjPreviewRecord(null)}
        strTitle={objPreviewRecord?.strEmployeeName ?? t("preview_title", "Payroll Input")}
        strSecondaryLabel={t("close", "Close")}
        blnHidePrimary
        nodeContent={
          objPreviewRecord ? (
            <Stack spacing={2}>
              <Box>
                <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                  {t("employee", "Employee")}
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {objPreviewRecord.strEmployeeName} ({objPreviewRecord.strEmployeeCode})
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                  {t("payroll_run", "Payroll Run")}
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {objPreviewRecord.strRunName} ({objPreviewRecord.strRunCode})
                </Typography>
              </Box>
              <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: "1fr 1fr" }}>
                <Box>
                  <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                    {t("lwp_days", "LWP")}
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {formatNumber(objPreviewRecord.decLwpDays)}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                    {t("lop_days", "LOP")}
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {formatNumber(objPreviewRecord.decLopDays)}
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                  {t("remarks", "Remarks")}
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {objPreviewRecord.strRemarks || "-"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ color: "#64748b", fontSize: "0.82rem", mb: 0.75 }}>
                  {t("input_lines", "Input Lines")}
                </Typography>
                <Box sx={{ border: "1px solid #d9e6ef", borderRadius: 2, overflow: "hidden" }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>{t("component", "Component")}</th>
                        <th>{t("line_type", "Line Type")}</th>
                        <th>{t("amount", "Amount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {objPreviewRecord.lstLines.length === 0 ? (
                        <tr>
                          <td colSpan={3} className={styles.emptyState}>
                            {t("no_lines", "No payroll input lines recorded.")}
                          </td>
                        </tr>
                      ) : null}
                      {objPreviewRecord.lstLines.map((dicLine) => (
                        <tr key={dicLine.intID}>
                          <td>{dicLine.strComponentName || dicLine.strComponentCode}</td>
                          <td>{dicLine.strLineType}</td>
                          <td>{formatNumber(dicLine.decAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              </Box>
            </Stack>
          ) : null
        }
      />

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
