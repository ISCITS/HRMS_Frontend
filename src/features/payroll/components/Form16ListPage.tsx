"use client";

import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import CommonPayrollDialog from "@/features/payroll/components/CommonPayrollDialog";
import BlockingLoader from "@/components/shared/BlockingLoader";
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

  const blnCanView = canViewAny() || canDoAny("view") || canDoAny("list");
  const blnCanGenerate = blnAdminMode && (canDoAny("add") || canDoAny("generate") || canDoAny("export"));

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
    objRouter.push(`${strRoute}/${objRow.intForm16ID}`);
  }

  async function handleDownload(objRow: Form16ListRecord, blnPrint: boolean) {
    const strKey = `${objRow.intForm16ID}-${blnPrint ? "print" : "download"}`;
    setStrDownloadingKey(strKey);
    setStrActionError("");
    try {
      const strHtml = await form16Service.getDownloadHtml(objRow.intForm16ID);
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
          employee: blnAdminMode ? (
            <>
              <Typography sx={{ fontWeight: 900, fontSize: "0.86rem" }}>{objRow.strEmployeeName || "-"}</Typography>
              <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>{objRow.strEmployeeCode || "-"}</Typography>
            </>
          ) : (
            objRow.strFinancialYearCode
          ),
          financialYear: objRow.strFinancialYearCode,
          form16Number: objRow.strForm16Number,
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
          action: (
            <Stack direction="row" spacing={0.5}>
              <Button size="small" className={styles.compactButton} startIcon={<VisibilityRoundedIcon fontSize="small" />} onClick={() => handleView(objRow)}>
                {t("view", "View")}
              </Button>
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
    () => [
      { field: "action", headerName: t("table_actions", "Actions"), sortable: false, filterable: false, exportable: false, width: 260 },
      { field: "employee", headerName: blnAdminMode ? t("table_employee", "Employee") : t("table_financial_year", "Financial Year"), width: 200, sortable: false },
      { field: "form16Number", headerName: t("table_form16_number", "Certificate No."), width: 220 },
      { field: "period", headerName: t("table_period", "Period"), width: 220, sortable: false },
      { field: "grossSalary", headerName: t("table_gross_salary", "Gross Salary"), align: "right", width: 160, sortAccessor: (dicRow) => dicRow.grossSalarySortValue },
      { field: "taxDeducted", headerName: t("table_tax_deducted", "Tax Deducted"), align: "right", width: 160, sortAccessor: (dicRow) => dicRow.taxDeductedSortValue },
      { field: "status", headerName: t("table_status", "Status"), sortable: false, filterable: false, width: 140 },
    ],
    [t, blnAdminMode]
  );

  return (
    <Box className={styles.page}>
      <Box className={styles.controlsCard}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            select
            size="small"
            label={t("filter_financial_year", "Financial Year")}
            value={strSelectedFinancialYear}
            onChange={(e) => setStrSelectedFinancialYear(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            {lstFinancialYearOptions.map((strFY) => (
              <MenuItem key={strFY} value={strFY}>
                {strFY}
              </MenuItem>
            ))}
          </TextField>
          {blnCanGenerate ? (
            <Button className={styles.primaryButton} startIcon={<AutorenewRoundedIcon />} onClick={openGenerateDialog}>
              {t("generate_button", "Generate Form 16")}
            </Button>
          ) : null}
        </Box>
      </Box>

      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strActionError ? <Alert severity="error">{strActionError}</Alert> : null}
      {!blnCanView && !blnRightsLoading ? (
        <Alert severity="warning">
          {blnAdminMode
            ? t("no_access", "Form 16 access is not available for your user group.")
            : t("ess_no_access", "Form 16 access is not available for your user group.")}
        </Alert>
      ) : null}

      {blnCanView ? (
        <Box className={styles.tableCard}>
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName={blnAdminMode ? "form16-company" : "my-form16"}
            showPaginationSummary
            emptyMessage={t("empty_message", "No Form 16 records found for this selection.")}
            testIdPrefix="form16.list"
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        </Box>
      ) : null}

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
              <TextField
                select
                size="small"
                label={t("employee", "Employee")}
                value={intGenerateEmployeeID}
                onChange={(e) => setIntGenerateEmployeeID(e.target.value ? Number(e.target.value) : "")}
              >
                {lstEmployees.map((objEmployee) => (
                  <MenuItem key={objEmployee.intID} value={objEmployee.intID}>
                    {objEmployee.strFullName} ({objEmployee.strEmployeeCode})
                  </MenuItem>
                ))}
              </TextField>
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

      <BlockingLoader blnOpen={blnLoading || blnRightsLoading} strLabel={t("loading", "Loading Form 16 records...")} />
    </Box>
  );
}
