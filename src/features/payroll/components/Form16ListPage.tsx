"use client";

import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import CommonPayrollDialog from "@/features/payroll/components/CommonPayrollDialog";
import { MasterAddColumnsControl, MasterBreadcrumbs, MasterGridSkeleton, dicMasterRowSx, type MasterOptionalColumn } from "@/components/master/MasterListUi";
import masterStyles from "@/components/master/MasterScreen.module.css";
import { employeeService } from "@/features/employee/services/employeeService";
import type { EmployeeListRecord } from "@/features/employee/types";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { form16Service } from "@/features/payroll/services/form16Service";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import type { Form16GenerateCompanySummary, Form16GenerateResultRow, Form16ListRecord } from "@/features/payroll/types";
import { buildFinancialYearOptions, buildForm16FileName, downloadForm16Html, printForm16Html } from "@/features/payroll/utils/form16Document";

const lstAdminModuleHints = ["FORM16", "FORM_16", "PAYROLL_FORM16", "REPORT_FORM16"];
const lstEssModuleHints = ["MY_FORM16", "MY_FORM_16", "ESS_MY_FORM16"];

function formatCurrency(decValue?: number | null) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(decValue || 0)
  );
}

function statusChipColor(strStatus: string): { bg: string; fg: string } {
  switch (strStatus) {
    case "FINALIZED":
      return { bg: "#e6f4ea", fg: "#166534" };
    case "REISSUED":
      return { bg: "#fef3c7", fg: "#92400e" };
    case "DRAFT":
      return { bg: "#e0e7ff", fg: "#3730a3" };
    default:
      return { bg: "#f1f5f9", fg: "#475569" };
  }
}

type OptionalColumnKey = "period";

type Form16ListPageProps = {
  blnAdminMode?: boolean;
};

export default function Form16ListPage({ blnAdminMode = false }: Form16ListPageProps) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("form16");
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny } = useModuleActionAccess(
    blnAdminMode ? lstAdminModuleHints : lstEssModuleHints
  );

  const lstFinancialYearOptions = useMemo(() => buildFinancialYearOptions(), []);
  const [strSelectedFinancialYear, setStrSelectedFinancialYear] = useState(lstFinancialYearOptions[0] ?? "");
  const [lstRows, setLstRows] = useState<Form16ListRecord[]>([]);
  const [lstEmployees, setLstEmployees] = useState<EmployeeListRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [strActionError, setStrActionError] = useState("");
  const [strDownloadingKey, setStrDownloadingKey] = useState<string | null>(null);

  const [blnGenerateDialogOpen, setBlnGenerateDialogOpen] = useState(false);
  const [strGenerateFinancialYear, setStrGenerateFinancialYear] = useState(lstFinancialYearOptions[0] ?? "");
  const [strGenerateScope, setStrGenerateScope] = useState<"single" | "company">("single");
  const [intGenerateEmployeeID, setIntGenerateEmployeeID] = useState<number | "">("");
  const [blnGenerateReissue, setBlnGenerateReissue] = useState(false);
  const [strReissueReason, setStrReissueReason] = useState("");
  const [blnGenerating, setBlnGenerating] = useState(false);
  const [objGenerateSummary, setObjGenerateSummary] = useState<Form16GenerateCompanySummary | null>(null);
  const [lstVisibleOptionalColumns, setLstVisibleOptionalColumns] = useState<OptionalColumnKey[]>([]);

  const blnCanView = canViewAny() || canDoAny("view") || canDoAny("list");
  const blnCanGenerate = blnAdminMode && (canDoAny("add") || canDoAny("generate") || canDoAny("export"));
  const blnBusy = blnLoading || blnRightsLoading;
  const lstOptionalColumns: MasterOptionalColumn<OptionalColumnKey>[] = [
    { strKey: "period", strLabel: t("table_period", "Period") },
  ];

  async function loadRows(strFinancialYearCode = strSelectedFinancialYear) {
    if (!blnCanView) {
      setLstRows([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    setStrError("");
    try {
      const lstResult = blnAdminMode
        ? await form16Service.listForCompany(strFinancialYearCode)
        : await form16Service.listMine();
      setLstRows(lstResult);
    } catch (objError) {
      setStrError(
        objError instanceof Error ? objError.message : t("error_load_list", "Unable to load Form 16 records.")
      );
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) return;
    void loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blnRightsLoading, blnCanView, strSelectedFinancialYear]);

  useEffect(() => {
    if (blnRightsLoading || !blnCanGenerate) return;
    employeeService
      .getEmployees()
      .then((lstResult) => setLstEmployees(lstResult.filter((objEmployee) => !objEmployee.blnIsPartialSave)))
      .catch(() => setLstEmployees([]));
  }, [blnRightsLoading, blnCanGenerate]);

  async function handleView(objRow: Form16ListRecord) {
    const strRoute = blnAdminMode ? "/reports/form16/document" : "/ess/my-form16/document";
    objRouter.push(`${strRoute}/${objRow.strRecordUUID}`);
  }

  async function handleDownload(objRow: Form16ListRecord, blnPrint: boolean) {
    const strKey = `${objRow.intForm16ID}-${blnPrint ? "print" : "download"}`;
    setStrDownloadingKey(strKey);
    setStrActionError("");
    try {
      const strHtml = await form16Service.getDownloadHtml(objRow.strRecordUUID);
      if (blnPrint) {
        printForm16Html(strHtml);
      } else {
        downloadForm16Html(strHtml, buildForm16FileName("form16", objRow.strEmployeeCode, objRow.strFinancialYearCode));
      }
    } catch (objError) {
      setStrActionError(
        objError instanceof Error ? objError.message : t("error_download", "Unable to download Form 16 document.")
      );
    } finally {
      setStrDownloadingKey(null);
    }
  }

  function openGenerateDialog() {
    setStrGenerateFinancialYear(strSelectedFinancialYear || lstFinancialYearOptions[0] || "");
    setStrGenerateScope("single");
    setIntGenerateEmployeeID("");
    setBlnGenerateReissue(false);
    setStrReissueReason("");
    setObjGenerateSummary(null);
    setBlnGenerateDialogOpen(true);
  }

  async function handleGenerateSubmit() {
    setBlnGenerating(true);
    setStrActionError("");
    try {
      const objResult = await form16Service.generate({
        strFinancialYearCode: strGenerateFinancialYear,
        blnCompanyWide: strGenerateScope === "company",
        intEmployeeID: strGenerateScope === "single" && intGenerateEmployeeID ? Number(intGenerateEmployeeID) : undefined,
        blnReissue: blnGenerateReissue,
        strReissueReason: blnGenerateReissue ? strReissueReason : undefined,
      });
      if ("lstResults" in objResult) {
        setObjGenerateSummary(objResult);
      } else {
        setObjGenerateSummary({
          intGeneratedCount: 1,
          intFailedCount: 0,
          lstResults: [
            {
              intEmployeeID: intGenerateEmployeeID ? Number(intGenerateEmployeeID) : 0,
              blnSuccess: true,
              intForm16ID: objResult.intForm16ID,
              strForm16Number: objResult.strForm16Number,
              strEmployeeName: objResult.dicEmployee?.strEmployeeName ?? null,
              strMessage: null,
            },
          ],
        });
      }
      await loadRows(strGenerateFinancialYear);
    } catch (objError) {
      setStrActionError(
        objError instanceof Error ? objError.message : t("error_generate", "Unable to generate Form 16.")
      );
    } finally {
      setBlnGenerating(false);
    }
  }

  const lstTableRows = useMemo(
    () =>
      lstRows.map((objRow) => {
        const objColor = statusChipColor(objRow.strGenerationStatus);
        return {
          id: objRow.intForm16ID,
          strRecordUUID: objRow.strRecordUUID,
          employee: blnAdminMode ? (
            <>
              <Typography sx={{ fontWeight: 900, fontSize: "0.86rem" }}>{objRow.strEmployeeName || "-"}</Typography>
              <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>{objRow.strEmployeeCode || "-"}</Typography>
            </>
          ) : (
            objRow.strFinancialYearCode
          ),
          financialYear: objRow.strFinancialYearCode,
          form16Number: (
            <Link
              className="app-master-first-column-link"
              component="button"
              type="button"
              underline="none"
              data-controlid="form16.list.row.number.link"
              data-row-key={String(objRow.intForm16ID)}
              onClick={(objEvent) => {
                objEvent.stopPropagation();
                void handleView(objRow);
              }}
            >
              {objRow.strForm16Number || "-"}
            </Link>
          ),
          form16NumberSortValue: objRow.strForm16Number || "",
          employeeSortValue: blnAdminMode ? objRow.strEmployeeName || "" : objRow.strFinancialYearCode || "",
          period: `${(objRow.dtPeriodStart || "-").slice(0, 10)} to ${(objRow.dtPeriodEnd || "-").slice(0, 10)}`,
          grossSalary: formatCurrency(objRow.decGrossSalary),
          grossSalarySortValue: Number(objRow.decGrossSalary || 0),
          taxDeducted: formatCurrency(objRow.decTotalTaxDeducted),
          taxDeductedSortValue: Number(objRow.decTotalTaxDeducted || 0),
          status: (
            <Chip
              size="small"
              label={t(`status_${objRow.strGenerationStatus.toLowerCase()}`, objRow.strGenerationStatus)}
              sx={{ backgroundColor: objColor.bg, color: objColor.fg, fontWeight: 800 }}
            />
          ),
          statusSortValue: objRow.strGenerationStatus || "",
          action: (
            <Stack direction="row" spacing={0.5} onClick={(objEvent) => objEvent.stopPropagation()}>
              <Button
                size="small"
                className={styles.compactButton}
                startIcon={<DownloadRoundedIcon fontSize="small" />}
                disabled={strDownloadingKey === `${objRow.intForm16ID}-download`}
                onClick={() => handleDownload(objRow, false)}
              >
                {t("download", "Download")}
              </Button>
              <Button
                size="small"
                className={styles.compactButton}
                startIcon={<PrintRoundedIcon fontSize="small" />}
                disabled={strDownloadingKey === `${objRow.intForm16ID}-print`}
                onClick={() => handleDownload(objRow, true)}
              >
                {t("print", "Print")}
              </Button>
            </Stack>
          ),
        };
      }),
    [lstRows, blnAdminMode, strDownloadingKey, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => {
      const lstColumns: CommonTableColumn<(typeof lstTableRows)[number]>[] = [
        { field: "form16Number", headerName: t("table_form16_number", "Certificate No."), width: 220, filterable: false, sortAccessor: (dicRow) => String(dicRow.form16NumberSortValue) },
        { field: "employee", headerName: blnAdminMode ? t("table_employee", "Employee") : t("table_financial_year", "Financial Year"), width: 200, sortAccessor: (dicRow) => String(dicRow.employeeSortValue) },
        { field: "grossSalary", headerName: t("table_gross_salary", "Gross Salary"), align: "right", width: 160, sortAccessor: (dicRow) => dicRow.grossSalarySortValue },
        { field: "taxDeducted", headerName: t("table_tax_deducted", "Tax Deducted"), align: "right", width: 160, sortAccessor: (dicRow) => dicRow.taxDeductedSortValue },
        { field: "status", headerName: t("table_status", "Status"), filterable: false, width: 140, sortAccessor: (dicRow) => String(dicRow.statusSortValue) },
      ];
      if (lstVisibleOptionalColumns.includes("period")) {
        lstColumns.push({ field: "period", headerName: t("table_period", "Period"), width: 220, sortable: false });
      }
      lstColumns.push({ field: "action", headerName: t("table_actions", "Actions"), sortable: false, filterable: false, exportable: false, width: 200 });
      return lstColumns;
    },
    [t, blnAdminMode, lstVisibleOptionalColumns]
  );

  return (
    <Box className={masterStyles.page} data-controlid="form16.list.page">
      <MasterBreadcrumbs
        strSection={blnAdminMode ? t("breadcrumb_reports", "Reports") : t("breadcrumb_payroll_benefits", "Payroll & Benefits")}
        strTitle={blnAdminMode ? t("breadcrumb_form16", "Form 16") : t("breadcrumb_my_form16", "My Form 16")}
      />
      <Box className={masterStyles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Box className={masterStyles.searchRow} aria-busy={blnBusy} sx={{ gridTemplateColumns: "minmax(180px, 240px)", alignItems: "center" }}>
          <TextField
            className="app-mui-text-field"
            select
            size="small"
            label={t("filter_financial_year", "Financial Year")}
            value={strSelectedFinancialYear}
            onChange={(e) => setStrSelectedFinancialYear(e.target.value)}
            disabled={blnBusy}
            fullWidth
            inputProps={{ "data-controlid": "form16.list.financial-year.select" }}
          >
            {lstFinancialYearOptions.map((strFY) => (
              <MenuItem key={strFY} value={strFY}>
                {strFY}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Box>

      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strActionError ? <Alert severity="error">{strActionError}</Alert> : null}

      <Box className={masterStyles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {blnBusy ? (
          <MasterGridSkeleton strControlId="form16.list.skeleton" intColumns={6} />
        ) : !blnCanView ? (
          <Alert severity="warning" sx={{ m: 2 }}>
            {blnAdminMode
              ? t("no_access", "Form 16 access is not available for your user group.")
              : t("ess_no_access", "Form 16 access is not available for your user group.")}
          </Alert>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName={blnAdminMode ? "form16-company" : "my-form16"}
            showPaginationSummary
            emptyMessage={t("empty_message", "No Form 16 records found for this selection.")}
            testIdPrefix="form16.list"
            toolbarLeft={blnCanGenerate ? (
              <Button className={masterStyles.primaryButton} startIcon={<AutorenewRoundedIcon />} onClick={openGenerateDialog} data-controlid="form16.list.generate.button">
                {t("generate_button", "Generate Form 16")}
              </Button>
            ) : undefined}
            toolbarAfterExport={(
              <MasterAddColumnsControl
                strControlPrefix="form16.list"
                strButtonLabel={t("add_columns", "Add columns")}
                lstColumns={lstOptionalColumns}
                lstVisibleKeys={lstVisibleOptionalColumns}
                onChange={setLstVisibleOptionalColumns}
              />
            )}
            onRowClick={(dicRow) => {
              const objRow = lstRows.find((objCandidate) => objCandidate.intForm16ID === dicRow.id);
              if (objRow) void handleView(objRow);
            }}
            hideRowClickHint
            minTableWidth={1000}
            getRowSx={() => dicMasterRowSx}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        )}
      </Box>

      <CommonPayrollDialog
        blnOpen={blnGenerateDialogOpen}
        strTitle={t("generate_dialog_title", "Generate Form 16")}
        onClose={() => setBlnGenerateDialogOpen(false)}
        strSecondaryLabel={t("close", "Close")}
        strPrimaryLabel={blnGenerating ? t("generating", "Generating...") : t("generate_button", "Generate")}
        onPrimaryAction={handleGenerateSubmit}
        blnPrimaryDisabled={blnGenerating || (strGenerateScope === "single" && !intGenerateEmployeeID)}
        maxWidth="sm"
        nodeContent={
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              size="small"
              label={t("financial_year", "Financial Year")}
              value={strGenerateFinancialYear}
              onChange={(e) => setStrGenerateFinancialYear(e.target.value)}
            >
              {lstFinancialYearOptions.map((strFY) => (
                <MenuItem key={strFY} value={strFY}>
                  {strFY}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label={t("scope", "Scope")}
              value={strGenerateScope}
              onChange={(e) => setStrGenerateScope(e.target.value as "single" | "company")}
            >
              <MenuItem value="company">{t("scope_company", "Entire company")}</MenuItem>
              <MenuItem value="single">{t("scope_single", "Single employee")}</MenuItem>
            </TextField>
            {strGenerateScope === "single" ? (
              <Autocomplete
                size="small"
                options={lstEmployees}
                value={lstEmployees.find((objEmployee) => objEmployee.intID === intGenerateEmployeeID) ?? null}
                getOptionLabel={(objEmployee) => `${objEmployee.strFullName} (${objEmployee.strEmployeeCode})`}
                isOptionEqualToValue={(objA, objB) => objA.intID === objB.intID}
                onChange={(_e, objEmployee) => setIntGenerateEmployeeID(objEmployee ? objEmployee.intID : "")}
                renderInput={(params) => (
                  <TextField {...params} label={t("employee", "Employee")} placeholder={t("search_employee", "Search employee...")}
                    InputProps={{ ...params.InputProps, startAdornment: (<><SearchRoundedIcon fontSize="small" sx={{ color: "action.active", ml: 0.5, mr: -0.5 }} />{params.InputProps.startAdornment}</>) }} />
                )}
              />
            ) : null}
            <FormControlLabel
              control={<Checkbox checked={blnGenerateReissue} onChange={(e) => setBlnGenerateReissue(e.target.checked)} />}
              label={t("reissue_checkbox", "Reissue (after a payroll correction)")}
            />
            {blnGenerateReissue ? (
              <TextField
                size="small"
                multiline
                minRows={2}
                label={t("reissue_reason", "Reissue reason")}
                value={strReissueReason}
                onChange={(e) => setStrReissueReason(e.target.value)}
              />
            ) : null}
            {objGenerateSummary ? (
              <Box sx={{ border: "1px solid #d8e3f1", borderRadius: 1, p: 1.5 }}>
                <Typography sx={{ fontWeight: 800, fontSize: "0.85rem", mb: 1 }}>
                  {t("generate_result", "Result")}: {objGenerateSummary.intGeneratedCount} {t("succeeded", "succeeded")},{" "}
                  {objGenerateSummary.intFailedCount} {t("failed", "failed")}
                </Typography>
                <Stack spacing={0.5} sx={{ maxHeight: 180, overflowY: "auto" }}>
                  {objGenerateSummary.lstResults.map((objResultRow: Form16GenerateResultRow) => (
                    <Typography
                      key={objResultRow.intEmployeeID}
                      sx={{ fontSize: "0.78rem", color: objResultRow.blnSuccess ? "#166534" : "#b91c1c" }}
                    >
                      {objResultRow.blnSuccess
                        ? `✓ ${objResultRow.strEmployeeName || objResultRow.intEmployeeID} - ${objResultRow.strForm16Number}`
                        : `✗ ${objResultRow.intEmployeeID} - ${objResultRow.strMessage}`}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            ) : null}
          </Stack>
        }
      />
    </Box>
  );
}
