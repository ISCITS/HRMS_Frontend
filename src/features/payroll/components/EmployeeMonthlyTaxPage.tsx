"use client";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import {
  Alert, Box, Button, Chip, CircularProgress, InputAdornment, Pagination, Snackbar, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { Fragment, useEffect, useMemo, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import CommonRowActions from "@/components/master/CommonRowActions";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import styles from "@/features/payroll/components/EmployeeMonthlyTaxPage.module.css";
import MonthlyTaxImportPanel from "@/features/payroll/components/MonthlyTaxImportPanel";
import MonthlyTaxTransactionDetailDialog from "@/features/payroll/components/MonthlyTaxTransactionDetailDialog";
import {
  employeeMonthlyTaxService, type MonthlyTaxMatrixResult, type MonthlyTaxMatrixRow,
} from "@/features/payroll/services/employeeMonthlyTaxService";
import { useActionRights } from "@/features/security/hooks/useActionRights";

const lstPageSizeOptions = [10, 20, 50];

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };

function buildFinancialYearCode(intStartYear: number): string {
  return `${intStartYear}-${String(intStartYear + 1).slice(-2)}`;
}

function buildFinancialYearOptions(): string[] {
  const dtToday = new Date();
  const intCurrentFyStartYear = dtToday.getMonth() >= 3 ? dtToday.getFullYear() : dtToday.getFullYear() - 1;
  return [intCurrentFyStartYear, intCurrentFyStartYear - 1, intCurrentFyStartYear - 2, intCurrentFyStartYear + 1].map(
    buildFinancialYearCode,
  );
}

function normalizeFinancialYearCode(strValue: string): string {
  const strCode = strValue.trim().toUpperCase().replace("/", "-");
  if (!strCode) return "";
  const strWithoutPrefix = strCode.startsWith("FY ") ? strCode.slice(3).trim() : strCode.startsWith("FY") ? strCode.slice(2).trim() : strCode;
  const lstParts = strWithoutPrefix.split("-").map((strPart) => strPart.trim()).filter(Boolean);
  if (lstParts.length !== 2) return strWithoutPrefix;
  const [strStart, strEnd] = lstParts;
  if (!/^\d{4}$/.test(strStart) || !/^\d{2,4}$/.test(strEnd)) return strWithoutPrefix;
  return strEnd.length === 2 ? `${strStart}-${strEnd}` : `${strStart}-${strEnd.slice(-2)}`;
}

function formatMonthShortLabel(strPeriodMonth: string): string {
  const objDate = new Date(`${strPeriodMonth}T00:00:00`);
  return objDate.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

function resolveDefaultEditMonth(objRow: MonthlyTaxMatrixRow, lstMonths: string[]): string | null {
  if (lstMonths.length === 0) return null;
  const dtToday = new Date();
  const strCurrentMonth = `${dtToday.getFullYear()}-${String(dtToday.getMonth() + 1).padStart(2, "0")}-01`;
  if (lstMonths.includes(strCurrentMonth)) return strCurrentMonth;
  const lstMonthsWithData = lstMonths.filter((strMonth) => objRow.dicMonths[strMonth]);
  if (lstMonthsWithData.length > 0) return lstMonthsWithData[lstMonthsWithData.length - 1];
  return lstMonths[0];
}

export default function EmployeeMonthlyTaxPage({
  strInitialFinancialYearCode,
  intInitialEmployeeID,
}: {
  strInitialFinancialYearCode?: string;
  intInitialEmployeeID?: number;
} = {}) {
  const { t } = useModuleLabels("employee_monthly_tax");
  const { canDo } = useActionRights();
  const blnCanEdit = canDo("EMPLOYEE_MONTHLY_TAX", "EDIT") || canDo("EMPLOYEE_MONTHLY_TAX", "ADD");
  const blnCanImport = canDo("EMPLOYEE_MONTHLY_TAX", "IMPORT") || blnCanEdit;

  const [strFinancialYearCode, setStrFinancialYearCode] = useState(strInitialFinancialYearCode || buildFinancialYearOptions()[0]);
  const [strEmployeeSearch, setStrEmployeeSearch] = useState("");
  const [intFilterEmployeeID, setIntFilterEmployeeID] = useState<number | undefined>(intInitialEmployeeID);
  const [objMatrix, setObjMatrix] = useState<MonthlyTaxMatrixResult | null>(null);
  const [blnLoading, setBlnLoading] = useState(false);
  const [strError, setStrError] = useState("");
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  const [blnShowImport, setBlnShowImport] = useState(false);
  const [objDetailTarget, setObjDetailTarget] = useState<{ intEmployeeID: number; strEmployeeName: string; strPeriodMonth: string } | null>(null);
  const [intPage, setIntPage] = useState(0);
  const [intRowsPerPage, setIntRowsPerPage] = useState(lstPageSizeOptions[1]);

  const lstFinancialYearOptions = useMemo(buildFinancialYearOptions, []);
  const strNormalizedFinancialYearCode = useMemo(() => normalizeFinancialYearCode(strFinancialYearCode), [strFinancialYearCode]);

  function showToast(strMessage: string, strSeverity: ToastState["strSeverity"] = "success") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  async function loadMatrix() {
    if (!strNormalizedFinancialYearCode) return;
    setBlnLoading(true);
    setStrError("");
    try {
      const objResult = await employeeMonthlyTaxService.getMatrix(strNormalizedFinancialYearCode, intFilterEmployeeID);
      setObjMatrix(objResult);
    } catch (objError) {
      setObjMatrix(null);
      setStrError((await createApiRequestError(objError)).message);
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    loadMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strNormalizedFinancialYearCode, intFilterEmployeeID]);

  const lstFilteredRows: MonthlyTaxMatrixRow[] = useMemo(() => {
    if (!objMatrix) return [];
    const strSearch = strEmployeeSearch.trim().toLowerCase();
    if (!strSearch) return objMatrix.lstRows;
    return objMatrix.lstRows.filter(
      (objRow) =>
        objRow.strEmployeeCode?.toLowerCase().includes(strSearch) ||
        objRow.strEmployeeName?.toLowerCase().includes(strSearch),
    );
  }, [objMatrix, strEmployeeSearch]);

  useEffect(() => {
    setIntPage(0);
  }, [strEmployeeSearch, strNormalizedFinancialYearCode, intRowsPerPage]);

  const lstPaginatedRows = useMemo(
    () => lstFilteredRows.slice(intPage * intRowsPerPage, intPage * intRowsPerPage + intRowsPerPage),
    [lstFilteredRows, intPage, intRowsPerPage],
  );

  return (
    <Box className={styles.page}>
      <Typography variant="h5" fontWeight={700}>{t("page_title", "Employee Monthly Tax / TDS")}</Typography>
      <Typography variant="body2" color="text.secondary">
        {t(
          "page_subtitle",
          "One continuous financial-year tax history per employee - historical/imported values plus everything payroll (Regular, Separate Payroll, F&F) has generated, month by month.",
        )}
      </Typography>

      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader}>
          <Box className={styles.filtersRow}>
            <TextField
              select
              SelectProps={{ native: true }}
              label={t("financial_year_label", "Financial Year")}
              size="small"
              sx={{ minWidth: 160 }}
              value={strFinancialYearCode}
              onChange={(objEvent) => setStrFinancialYearCode(objEvent.target.value)}
            >
              {lstFinancialYearOptions.map((strCode) => (
                <option key={strCode} value={strCode}>
                  {strCode}
                </option>
              ))}
            </TextField>
            <TextField
              label={t("employee_search_label", "Employee search")}
              placeholder={t("employee_search_placeholder", "Search by code or name")}
              size="small"
              value={strEmployeeSearch}
              onChange={(objEvent) => {
                setStrEmployeeSearch(objEvent.target.value);
                if (intFilterEmployeeID) setIntFilterEmployeeID(undefined);
              }}
              sx={{ minWidth: 240 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          {blnCanImport && (
            <Button
              variant="outlined"
              startIcon={<UploadFileRoundedIcon />}
              onClick={() => setBlnShowImport((blnPrev) => !blnPrev)}
              controlId="employee-monthly-tax.toggle-import.button"
            >
              {blnShowImport ? t("hide_import", "Hide Import") : t("show_import", "Import Excel")}
            </Button>
          )}
        </Box>

        {blnShowImport && <MonthlyTaxImportPanel onImported={loadMatrix} />}
      </Box>

      {blnLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      )}
      {strError && <Alert severity="error">{strError}</Alert>}

      {!blnLoading && !strError && objMatrix && (
        <Box className={styles.tableCard}>
          <Box className={styles.tableWrap}>
            <Table className={styles.table}>
              <TableHead>
                <TableRow>
                  <TableCell rowSpan={2} className={styles.stickyAction}>
                    {t("column_actions", "Actions")}
                  </TableCell>
                  <TableCell rowSpan={2} className={`${styles.stickyEmployee} ${styles.employeeCell}`}>
                    {t("column_employee", "Employee")}
                  </TableCell>
                  {objMatrix.lstMonths.map((strMonth, intIndex) => (
                    <TableCell
                      key={strMonth} colSpan={2}
                      className={intIndex % 2 === 1 ? styles.monthGroupTint : undefined}
                    >
                      {formatMonthShortLabel(strMonth)}
                    </TableCell>
                  ))}
                  <TableCell colSpan={2}>{t("column_fy_total", "FY Total")}</TableCell>
                </TableRow>
                <TableRow>
                  {objMatrix.lstMonths.map((strMonth, intIndex) => (
                    <Fragment key={strMonth}>
                      <TableCell className={intIndex % 2 === 1 ? styles.monthGroupTint : undefined}>
                        {t("column_taxable_short", "Taxable")}
                      </TableCell>
                      <TableCell
                        className={[styles.monthGroupEnd, intIndex % 2 === 1 ? styles.monthGroupTint : ""].join(" ").trim()}
                      >
                        {t("column_tds", "TDS")}
                      </TableCell>
                    </Fragment>
                  ))}
                  <TableCell>{t("column_taxable_short", "Taxable")}</TableCell>
                  <TableCell>{t("column_tds", "TDS")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lstPaginatedRows.map((objRow) => {
                  const strDefaultEditMonth = resolveDefaultEditMonth(objRow, objMatrix.lstMonths);
                  return (
                    <TableRow key={objRow.intEmployeeID}>
                      <TableCell className={styles.stickyAction}>
                        <CommonRowActions
                          testIdPrefix="employee-monthly-tax.list.row"
                          rowKey={objRow.intEmployeeID}
                          blnCanEdit={blnCanEdit && Boolean(strDefaultEditMonth)}
                          editTooltip={t("edit_tooltip", "Edit monthly tax entries")}
                          onEdit={() =>
                            strDefaultEditMonth &&
                            setObjDetailTarget({
                              intEmployeeID: objRow.intEmployeeID,
                              strEmployeeName: objRow.strEmployeeName,
                              strPeriodMonth: strDefaultEditMonth,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className={`${styles.stickyEmployee} ${styles.employeeCell}`}>
                        <div className={styles.employeeCode}>{objRow.strEmployeeCode}</div>
                        <div className={styles.employeeName}>{objRow.strEmployeeName}</div>
                      </TableCell>
                      {objMatrix.lstMonths.map((strMonth, intIndex) => {
                        const objCell = objRow.dicMonths[strMonth];
                        const strTintClass = intIndex % 2 === 1 ? styles.monthGroupTint : "";
                        return (
                          <Fragment key={strMonth}>
                            <TableCell className={strTintClass || undefined}>
                              {objCell ? (
                                <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                                  <span>{objCell.decTaxableIncome.toLocaleString()}</span>
                                  {objCell.blnIsLocked && <Chip size="small" label={t("locked", "Locked")} sx={{ height: 18 }} />}
                                </Stack>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className={[styles.monthGroupEnd, strTintClass].join(" ").trim()}>
                              {objCell ? objCell.decTds.toLocaleString() : "-"}
                            </TableCell>
                          </Fragment>
                        );
                      })}
                      <TableCell>
                        <strong>{objRow.decFyTaxable.toLocaleString()}</strong>
                      </TableCell>
                      <TableCell>
                        <strong>{objRow.decFyTds.toLocaleString()}</strong>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {lstFilteredRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={objMatrix.lstMonths.length * 2 + 4} className={styles.emptyState}>
                      {t("no_rows", "No employees with monthly tax data for this financial year yet.")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>

          {lstFilteredRows.length > 0 && (
            <Box className={styles.paginationBar}>
              <Box className={styles.paginationInfo}>
                <TextField
                  select
                  SelectProps={{ native: true }}
                  size="small"
                  className={styles.rowsPerPageSelect}
                  value={String(intRowsPerPage)}
                  onChange={(objEvent) => setIntRowsPerPage(Number(objEvent.target.value))}
                >
                  {lstPageSizeOptions.map((intOption) => (
                    <option key={intOption} value={intOption}>
                      {intOption}
                    </option>
                  ))}
                </TextField>
                <Typography component="p" className={styles.paginationRange}>
                  {`${intPage * intRowsPerPage + 1}-${Math.min((intPage + 1) * intRowsPerPage, lstFilteredRows.length)} of ${lstFilteredRows.length}`}
                </Typography>
              </Box>
              <Pagination
                size="small"
                color="primary"
                count={Math.max(1, Math.ceil(lstFilteredRows.length / intRowsPerPage))}
                page={intPage + 1}
                onChange={(_objEvent, intNextPage) => setIntPage(intNextPage - 1)}
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </Box>
      )}

      <MonthlyTaxTransactionDetailDialog
        blnOpen={Boolean(objDetailTarget)}
        onClose={() => setObjDetailTarget(null)}
        intEmployeeID={objDetailTarget?.intEmployeeID ?? null}
        strEmployeeName={objDetailTarget?.strEmployeeName ?? null}
        strFinancialYearCode={strNormalizedFinancialYearCode}
        strPeriodMonth={objDetailTarget?.strPeriodMonth ?? null}
        lstAvailableMonths={objMatrix?.lstMonths}
        onPeriodMonthChange={(strMonth) =>
          setObjDetailTarget((objPrev) => (objPrev ? { ...objPrev, strPeriodMonth: strMonth } : objPrev))
        }
        blnCanEdit={blnCanEdit}
        onSaved={() => {
          showToast(t("entry_saved", "Entry saved successfully."));
          loadMatrix();
        }}
      />

      <Snackbar open={objToast.blnOpen} autoHideDuration={4000} onClose={() => setObjToast((objPrev) => ({ ...objPrev, blnOpen: false }))}>
        <Alert severity={objToast.strSeverity} onClose={() => setObjToast((objPrev) => ({ ...objPrev, blnOpen: false }))}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
