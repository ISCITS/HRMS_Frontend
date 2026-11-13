"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { useMemo, useState, type ReactNode } from "react";

import PageNotices from "@/Common/components/PageNotices";
import type { CommonTableColumn } from "@/Common/components/CommonTable";
import CommonTable from "@/Common/components/CommonTable";
import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { payrollRunService } from "@/features/payroll/services/payrollRunService";
import type { ArrearRegisterRow } from "@/features/payroll/types";

function getCurrentMonth() {
  const objDate = new Date();
  return `${objDate.getFullYear()}-${String(objDate.getMonth() + 1).padStart(2, "0")}`;
}

/** April of the current financial year (Form 10E is per financial year). */
function getFinancialYearStartMonth() {
  const objDate = new Date();
  const intYear = objDate.getMonth() + 1 >= 4 ? objDate.getFullYear() : objDate.getFullYear() - 1;
  return `${intYear}-04`;
}

function money(decValue: number | null | undefined): string {
  if (decValue === null || decValue === undefined) return "";
  return Number(decValue).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Arrear Register (arrear automation): employee x original month x item for the payroll runs
 * of a month range, with a CSV download. Shown inside the Salary Register report for users
 * with the "report_arrear_register" right on the Salary Register menu.
 */
export default function ArrearRegisterReport() {
  const [strFromMonth, setStrFromMonth] = useState(getFinancialYearStartMonth());
  const [strToMonth, setStrToMonth] = useState(getCurrentMonth());
  const [lstRows, setLstRows] = useState<ArrearRegisterRow[]>([]);
  const [blnLoading, setBlnLoading] = useState(false);
  const [blnDownloading, setBlnDownloading] = useState(false);
  const [blnHasSearched, setBlnHasSearched] = useState(false);
  const [strError, setStrError] = useState("");
  const strRangeError = strFromMonth && strToMonth && strFromMonth > strToMonth ? "From month cannot be after To month." : "";
  const blnRangeValid = Boolean(strFromMonth && strToMonth && !strRangeError);

  async function loadReport() {
    if (!blnRangeValid) return;
    setStrError("");
    setBlnLoading(true);
    try {
      setLstRows(await payrollRunService.getArrearRegister(strFromMonth, strToMonth));
      setBlnHasSearched(true);
    } catch (objError) {
      setStrError((await createApiRequestError(objError)).message);
      setLstRows([]);
    } finally {
      setBlnLoading(false);
    }
  }

  async function downloadCsv() {
    if (!blnRangeValid) return;
    setStrError("");
    setBlnDownloading(true);
    try {
      await payrollRunService.downloadArrearRegisterRange(strFromMonth, strToMonth);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to download the arrear register.");
    } finally {
      setBlnDownloading(false);
    }
  }

  function clearFilters() {
    setStrFromMonth(getFinancialYearStartMonth());
    setStrToMonth(getCurrentMonth());
    setLstRows([]);
    setBlnHasSearched(false);
    setStrError("");
  }

  const lstColumns = useMemo<CommonTableColumn<Record<string, ReactNode>>[]>(() => [
    { field: "strPaidMonth", headerName: "Payroll Month", width: 120 },
    { field: "strRunCode", headerName: "Paid in Run", width: 130 },
    { field: "strEmployeeCode", headerName: "Employee No", width: 120 },
    { field: "strEmployeeName", headerName: "Employee Name", width: 190 },
    { field: "strOriginalMonth", headerName: "Original Month", width: 120 },
    { field: "strOriginalFy", headerName: "FY of Original Month", width: 120 },
    { field: "strItem", headerName: "Item", width: 170 },
    { field: "strTriggerType", headerName: "Trigger", width: 150 },
    { field: "strDays", headerName: "Paid / Calendar Days", width: 130, align: "right" },
    { field: "decPaidRate", headerName: "Old Rate", width: 120, align: "right" },
    { field: "decCorrectRate", headerName: "New Rate", width: 120, align: "right" },
    { field: "decPaidAmount", headerName: "Paid", width: 120, align: "right" },
    { field: "decCorrectAmount", headerName: "Correct", width: 120, align: "right" },
    { field: "decAlreadyArrearedAmount", headerName: "Already Paid as Arrear", width: 140, align: "right" },
    { field: "decArrearAmount", headerName: "Arrear", width: 120, align: "right" },
    { field: "strStatus", headerName: "Status", width: 140 },
  ], []);

  const lstDisplayRows = useMemo(() => lstRows.map((dicRow): Record<string, ReactNode> => ({
    __rowid: String(dicRow.intID),
    strPaidMonth: dicRow.strPaidMonth,
    strRunCode: dicRow.strRunCode,
    strEmployeeCode: dicRow.strEmployeeCode,
    strEmployeeName: dicRow.strEmployeeName,
    strOriginalMonth: dicRow.strOriginalMonth,
    strOriginalFy: dicRow.strOriginalFy,
    strItem: dicRow.strItem,
    strTriggerType: dicRow.strTriggerType,
    strDays: dicRow.strLineKind === "earning" ? `${dicRow.decPaidDays} / ${dicRow.decCalendarDays}` : "",
    decPaidRate: money(dicRow.decPaidRate),
    decCorrectRate: money(dicRow.decCorrectRate),
    decPaidAmount: money(dicRow.decPaidAmount),
    decCorrectAmount: money(dicRow.decCorrectAmount),
    decAlreadyArrearedAmount: dicRow.decAlreadyArrearedAmount ? money(dicRow.decAlreadyArrearedAmount) : "",
    decArrearAmount: money(dicRow.decArrearAmount),
    strStatus: dicRow.strStatus,
  })), [lstRows]);

  const decTotalArrear = useMemo(
    () => lstRows.filter((dicRow) => dicRow.strLineKind === "earning").reduce((decSum, dicRow) => decSum + Number(dicRow.decArrearAmount || 0), 0),
    [lstRows],
  );
  const intEmployeeCount = useMemo(() => new Set(lstRows.map((dicRow) => dicRow.strEmployeeCode)).size, [lstRows]);

  return (
    <>
      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Box className={styles.reportSearchPanelRow}>
          <Box className={styles.reportSearchField} sx={{ flex: "0 1 190px", minWidth: 170 }}>
            <TextField
              className="app-mui-text-field"
              type="month"
              label="From Month"
              value={strFromMonth}
              onChange={(objEvent) => setStrFromMonth(objEvent.target.value)}
              disabled={blnLoading}
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputProps={{ "data-controlid": "reports.arrear-register.from-month" }}
            />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flex: "0 1 190px", minWidth: 170 }}>
            <TextField
              className="app-mui-text-field"
              type="month"
              label="To Month"
              value={strToMonth}
              onChange={(objEvent) => setStrToMonth(objEvent.target.value)}
              disabled={blnLoading}
              error={Boolean(strRangeError)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputProps={{ "data-controlid": "reports.arrear-register.to-month" }}
            />
          </Box>
          <Box className={styles.searchActions} sx={{ flex: "0 0 auto", ml: "auto" }}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => void loadReport()} disabled={blnLoading || !blnRangeValid} data-controlid="reports.arrear-register.search.button" sx={{ whiteSpace: "nowrap" }}>Search</Button>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearFilters} disabled={blnLoading} data-controlid="reports.arrear-register.clear.button" sx={{ whiteSpace: "nowrap" }}>Clear</Button>
          </Box>
        </Box>
      </Box>

      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography sx={{ color: "#48638d", fontSize: "0.85rem" }}>
          Arrears of the payroll runs whose payroll month is in the selected range: one row per employee, original month and item (earning, PF / ESI on arrears). Useful for Form 10E (relief under section 89).
        </Typography>
        <PageNotices
          strControlId="reports.arrear-register.notices"
          lstNotices={[
            { strKey: "range-error", strSeverity: "warning", objMessage: strRangeError },
            { strKey: "error", strSeverity: "error", objMessage: strError, fnDismiss: () => setStrError("") },
          ]}
        />
      </Stack>

      <Box className={styles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <CommonTable
          columns={lstColumns}
          rows={lstDisplayRows}
          rowIdField="__rowid"
          defaultPageSize={20}
          pageSizeOptions={[20, 50, 100]}
          emptyMessage={blnHasSearched ? "No arrears in the payroll runs of the selected months." : "Select the months and search to see the arrear register."}
          showPaginationSummary
          withPaper={false}
          wrapColumnHeaders
          loading={blnLoading}
          loadingHeaderSkeleton
          skeletonRowCount={10}
          hideRowClickHint
          onRowClick={() => undefined}
          toolbarLeft={(
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
              <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => void downloadCsv()} disabled={blnDownloading || !blnRangeValid} data-controlid="reports.arrear-register.download.button" sx={{ whiteSpace: "nowrap" }}>
                {blnDownloading ? "Downloading..." : "Download CSV"}
              </Button>
              {lstRows.length ? (
                <Typography sx={{ color: "#48638d", fontSize: "0.85rem" }}>
                  {intEmployeeCount} employee(s) - earning arrears {money(decTotalArrear)}
                </Typography>
              ) : null}
            </Box>
          )}
          sx={{ p: 0, boxShadow: "none", background: "transparent" }}
        />
      </Box>
    </>
  );
}
