"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import { useEmployeeSalaryLabels } from "@/features/employee-salary/hooks/useEmployeeSalaryLabels";
import { employeeSalaryService } from "@/features/employee-salary/services/employeeSalaryService";
import type {
  EmployeeSalaryComponentLine,
  EmployeeSalaryDetailRecord,
  EmployeeSalaryFormOptions,
  EmployeeSalaryHistoryRecord,
  EmployeeSalaryRevisionFormValues
} from "@/features/employee-salary/types";

type EmployeeSalaryDetailPageProps = {
  intEmployeeID: number;
};

const lstRowsPerPageOptions = [10, 20, 50];

function formatCurrency(decValue: number | null, strCurrencyCode = "INR") {
  if (decValue === null) {
    return "-";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: strCurrencyCode,
    maximumFractionDigits: 0
  }).format(decValue);
}

function formatDate(strDate: string | null) {
  if (!strDate) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(strDate));
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

type ComponentGridRow = {
  intEmployeeSalaryComponentID: number;
  strComponentName: string;
  strCategory: string;
  strValueType: string;
  strMonthly: string;
  strAnnual: string;
  blnIsOverride: boolean;
  strOverride: string;
  strRemarks: string;
};

type HistoryGridRow = {
  intEmployeeSalaryStructureID: number;
  strStructure: string;
  strEffectiveFrom: string;
  strEffectiveTo: string;
  strGrossMonthly: string;
  strCtcAnnual: string;
  blnIsCurrent: boolean;
  strCurrent: string;
  strReason: string;
};

function buildRevisionForm(
  objDetail: EmployeeSalaryDetailRecord | null,
  fnTranslate?: (strKey: string, strFallback: string) => string
): EmployeeSalaryRevisionFormValues {
  return {
    intSalaryStructureID: objDetail?.objAssignedStructure?.intSalaryStructureID ?? "",
    dtEffectiveFrom: getTodayDateString(),
    strRevisionReason: "",
    lstOverrides: (objDetail?.lstComponentLines ?? []).map((dicLine) => ({
      intSalaryComponentID: dicLine.intSalaryComponentID,
      strComponentName:
        dicLine.strComponentName ??
        dicLine.strComponentCode ??
        `${fnTranslate?.("employee_salary_component", "Component") ?? "Component"} ${dicLine.intSalaryComponentID}`,
      blnAllowManualOverride: dicLine.blnAllowManualOverride,
      decAmountMonthly: "",
      decAmountAnnual: "",
      decPercentageValue: "",
      strRemarks: ""
    }))
  };
}

export default function EmployeeSalaryDetailPage({ intEmployeeID }: EmployeeSalaryDetailPageProps) {
  const objRouter = useRouter();
  const { t } = useEmployeeSalaryLabels();
  const [objDetail, setObjDetail] = useState<EmployeeSalaryDetailRecord | null>(null);
  const [objFormOptions, setObjFormOptions] = useState<EmployeeSalaryFormOptions | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const [dicRevisionForm, setDicRevisionForm] = useState<EmployeeSalaryRevisionFormValues>(buildRevisionForm(null));
  const [intComponentPage, setIntComponentPage] = useState(1);
  const [intComponentRowsPerPage, setIntComponentRowsPerPage] = useState(10);
  const [intHistoryPage, setIntHistoryPage] = useState(1);
  const [intHistoryRowsPerPage, setIntHistoryRowsPerPage] = useState(10);

  useEffect(() => {
    let blnMounted = true;
    async function loadData() {
      setBlnLoading(true);
      setStrError("");
      try {
        const [dicDetail, dicFormOptions] = await Promise.all([
          employeeSalaryService.getEmployeeSalaryDetail(intEmployeeID),
          employeeSalaryService.getFormOptions()
        ]);
        if (!blnMounted) {
          return;
        }
        setObjDetail(dicDetail);
        setObjFormOptions(dicFormOptions);
        setDicRevisionForm(buildRevisionForm(dicDetail));
      } catch (objError) {
        if (blnMounted) {
          setStrError(
            objError instanceof Error
              ? objError.message
              : t("employee_salary_load_detail_failed", "Unable to load employee salary detail.")
          );
        }
      } finally {
        if (blnMounted) {
          setBlnLoading(false);
        }
      }
    }
    loadData().catch(() => undefined);
    return () => {
      blnMounted = false;
    };
  }, [intEmployeeID]);

  const lstComponentRows: ComponentGridRow[] = useMemo(() => {
    const strCurrencyCode = objDetail?.objAssignedStructure?.strCurrencyCode ?? "INR";
    return (objDetail?.lstComponentLines ?? []).map((dicLine: EmployeeSalaryComponentLine) => ({
      intEmployeeSalaryComponentID: dicLine.intEmployeeSalaryComponentID,
      strComponentName: dicLine.strComponentName ?? dicLine.strComponentCode ?? "-",
      strCategory: dicLine.strComponentCategory ?? "-",
      strValueType: dicLine.strComponentValueType,
      strMonthly: formatCurrency(dicLine.decAmountMonthly, strCurrencyCode),
      strAnnual: formatCurrency(dicLine.decAmountAnnual, strCurrencyCode),
      blnIsOverride: dicLine.blnIsOverride,
      strOverride: dicLine.blnIsOverride
        ? t("employee_salary_override", "Override")
        : t("employee_salary_structure_source", "Structure"),
      strRemarks: dicLine.strRemarks ?? "-"
    }));
  }, [objDetail, t]);

  const lstHistoryRows: HistoryGridRow[] = useMemo(() => {
    const strCurrencyCode = objDetail?.objAssignedStructure?.strCurrencyCode ?? "INR";
    return (objDetail?.lstRevisionHistory ?? []).map((dicRow: EmployeeSalaryHistoryRecord) => ({
      intEmployeeSalaryStructureID: dicRow.intEmployeeSalaryStructureID,
      strStructure: dicRow.strStructureName ?? dicRow.strStructureCode ?? "-",
      strEffectiveFrom: formatDate(dicRow.dtEffectiveFrom),
      strEffectiveTo: formatDate(dicRow.dtEffectiveTo),
      strGrossMonthly: formatCurrency(dicRow.decGrossMonthly, strCurrencyCode),
      strCtcAnnual: formatCurrency(dicRow.decCtcAnnual, strCurrencyCode),
      blnIsCurrent: dicRow.blnIsCurrent,
      strCurrent: dicRow.blnIsCurrent
        ? t("employee_salary_current", "Current")
        : t("employee_salary_history", "History"),
      strReason: dicRow.strRevisionReason ?? "-"
    }));
  }, [objDetail, t]);

  const intComponentPageCount = Math.max(1, Math.ceil(lstComponentRows.length / intComponentRowsPerPage));
  const intResolvedComponentPage = Math.min(intComponentPage, intComponentPageCount);
  const intComponentStartIndex = (intResolvedComponentPage - 1) * intComponentRowsPerPage;
  const lstVisibleComponentRows = lstComponentRows.slice(intComponentStartIndex, intComponentStartIndex + intComponentRowsPerPage);

  const intHistoryPageCount = Math.max(1, Math.ceil(lstHistoryRows.length / intHistoryRowsPerPage));
  const intResolvedHistoryPage = Math.min(intHistoryPage, intHistoryPageCount);
  const intHistoryStartIndex = (intResolvedHistoryPage - 1) * intHistoryRowsPerPage;
  const lstVisibleHistoryRows = lstHistoryRows.slice(intHistoryStartIndex, intHistoryStartIndex + intHistoryRowsPerPage);

  async function handleSaveRevision() {
    if (dicRevisionForm.intSalaryStructureID === "") {
      setStrError(t("employee_salary_structure_required", "Salary structure is required."));
      return;
    }
    if (!dicRevisionForm.dtEffectiveFrom) {
      setStrError(t("employee_salary_effective_from_required", "Effective from date is required."));
      return;
    }
    setBlnSaving(true);
    setStrError("");
    try {
      const dicSavedDetail = await employeeSalaryService.createRevision(intEmployeeID, dicRevisionForm);
      setObjDetail(dicSavedDetail);
      setDicRevisionForm(buildRevisionForm(dicSavedDetail));
      setStrSuccess(
        t("employee_salary_revision_saved_success", "Employee salary revision saved successfully.")
      );
      setBlnDialogOpen(false);
    } catch (objError) {
      setStrError(
        objError instanceof Error
          ? objError.message
          : t("employee_salary_save_revision_failed", "Unable to save salary revision.")
      );
    } finally {
      setBlnSaving(false);
    }
  }

  if (blnLoading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: "#64748b" }}>
            {t("employee_salary_loading_workspace", "Loading employee salary workspace...")}
          </Typography>
        </Stack>
      </Box>
    );
  }

  const strCurrencyCode = objDetail?.objAssignedStructure?.strCurrencyCode ?? "INR";

  return (
    <Stack spacing={2.5} sx={{ height: "100%", overflow: "auto", pr: 0.5 }}>
      <Paper
        sx={{
          borderRadius: "28px",
          p: { xs: 2, md: 3 },
          border: "1px solid rgba(148,163,184,0.18)",
          background: "linear-gradient(135deg, #f8fbff 0%, #eef6ff 46%, #f8fafc 100%)"
        }}
      >
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: "1.7rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
                {t("employee_salary_detail_title", "Employee Salary Detail")}
              </Typography>
              <Typography sx={{ color: "#64748b", mt: 0.75 }}>
                {objDetail?.objEmployeeSummary.strEmployeeName} ({objDetail?.objEmployeeSummary.strEmployeeCode})
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => objRouter.push("/employee-salary")}
                sx={{
                  borderRadius: "14px",
                  height: 40,
                  minHeight: 40,
                  py: 0,
                  px: 1.75,
                  fontSize: "0.92rem",
                  lineHeight: 1.1,
                  "& .MuiButton-startIcon": {
                    mr: 0.75,
                    "& svg": {
                      fontSize: "1.05rem"
                    }
                  }
                }}
              >
                {t("employee_salary_back_button", "Back")}
              </Button>
              <Button
                variant="contained"
                startIcon={<HistoryRoundedIcon />}
                onClick={() => setBlnDialogOpen(true)}
                sx={{
                  borderRadius: "14px",
                  height: 40,
                  minHeight: 40,
                  py: 0,
                  px: 2,
                  fontSize: "0.92rem",
                  lineHeight: 1.1,
                  "& .MuiButton-startIcon": {
                    mr: 0.75,
                    "& svg": {
                      fontSize: "1.05rem"
                    }
                  }
                }}
              >
                {t("employee_salary_assign_revise_salary", "Assign / Revise Salary")}
              </Button>
            </Stack>
          </Stack>

          {strError ? <Alert severity="error" onClose={() => setStrError("")}>{strError}</Alert> : null}
          {strSuccess ? <Alert severity="success" onClose={() => setStrSuccess("")}>{strSuccess}</Alert> : null}
        </Stack>
      </Paper>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", xl: "1.3fr 1fr" } }}>
        <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>
            1. {t("employee_salary_employee_summary", "Employee Summary")}
          </Typography>
          <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
            <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_employee", "Employee")}</Typography><Typography sx={{ fontWeight: 700 }}>{objDetail?.objEmployeeSummary.strEmployeeName}</Typography></Box>
            <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_code", "Code")}</Typography><Typography sx={{ fontWeight: 700 }}>{objDetail?.objEmployeeSummary.strEmployeeCode}</Typography></Box>
            <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_email", "Email")}</Typography><Typography sx={{ fontWeight: 700 }}>{objDetail?.objEmployeeSummary.strWorkEmail ?? "-"}</Typography></Box>
            <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_employment_status", "Employment Status")}</Typography><Typography sx={{ fontWeight: 700 }}>{objDetail?.objEmployeeSummary.strEmploymentStatus}</Typography></Box>
          </Box>
        </Paper>

        <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>
            2. {t("employee_salary_current_salary_snapshot", "Current Salary Snapshot")}
          </Typography>
          <Box sx={{ display: "grid", gap: 1.25 }}>
            <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_gross_monthly", "Gross Monthly")}</Typography><Typography sx={{ fontWeight: 700 }}>{formatCurrency(objDetail?.objCurrentSalarySnapshot?.decGrossMonthly ?? null, strCurrencyCode)}</Typography></Box>
            <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_ctc_annual", "CTC Annual")}</Typography><Typography sx={{ fontWeight: 700 }}>{formatCurrency(objDetail?.objCurrentSalarySnapshot?.decCtcAnnual ?? null, strCurrencyCode)}</Typography></Box>
            <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_current_since", "Current Since")}</Typography><Typography sx={{ fontWeight: 700 }}>{formatDate(objDetail?.objCurrentSalarySnapshot?.dtEffectiveFrom ?? null)}</Typography></Box>
          </Box>
        </Paper>
      </Box>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>
          3. {t("employee_salary_assigned_structure", "Assigned Structure")}
        </Typography>
        <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" } }}>
          <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_structure", "Structure")}</Typography><Typography sx={{ fontWeight: 700 }}>{objDetail?.objAssignedStructure?.strStructureName ?? t("employee_salary_not_assigned", "Not assigned")}</Typography></Box>
          <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_code", "Code")}</Typography><Typography sx={{ fontWeight: 700 }}>{objDetail?.objAssignedStructure?.strStructureCode ?? "-"}</Typography></Box>
          <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_currency", "Currency")}</Typography><Typography sx={{ fontWeight: 700 }}>{objDetail?.objAssignedStructure?.strCurrencyCode ?? "-"}</Typography></Box>
          <Box><Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("employee_salary_effective_from", "Effective From")}</Typography><Typography sx={{ fontWeight: 700 }}>{formatDate(objDetail?.objAssignedStructure?.dtEffectiveFrom ?? null)}</Typography></Box>
        </Box>
      </Paper>

      <Box>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.25 }}>
          4. {t("employee_salary_component_lines", "Component Lines")}
        </Typography>
        <Box className={styles.tableCard}>
          {lstComponentRows.length > 0 ? (
            <Box className={styles.paginationBar}>
              <Box className={styles.paginationInfo}>
                <Typography className={styles.paginationLabel}>{t("employee_salary_rows_per_page", "Rows per page")}</Typography>
                <TextField
                  select
                  size="small"
                  value={String(intComponentRowsPerPage)}
                  onChange={(objEvent) => {
                    setIntComponentRowsPerPage(Number(objEvent.target.value));
                    setIntComponentPage(1);
                  }}
                  className={styles.rowsPerPageSelect}
                >
                  {lstRowsPerPageOptions.map((intOption) => (
                    <MenuItem key={intOption} value={String(intOption)}>{intOption}</MenuItem>
                  ))}
                </TextField>
                <Typography className={styles.paginationRange}>
                  {intComponentStartIndex + 1}-{Math.min(intComponentStartIndex + intComponentRowsPerPage, lstComponentRows.length)} of {lstComponentRows.length}
                </Typography>
              </Box>
              <Pagination
                count={intComponentPageCount}
                page={intResolvedComponentPage}
                onChange={(_, intNextPage) => setIntComponentPage(intNextPage)}
                size="small"
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          ) : null}

          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("employee_salary_component", "Component")}</th>
                  <th>{t("employee_salary_category", "Category")}</th>
                  <th>{t("employee_salary_value_type", "Value Type")}</th>
                  <th>{t("employee_salary_monthly", "Monthly")}</th>
                  <th>{t("employee_salary_annual", "Annual")}</th>
                  <th>{t("employee_salary_source", "Source")}</th>
                  <th>{t("employee_salary_remarks", "Remarks")}</th>
                </tr>
              </thead>
              <tbody>
                {lstComponentRows.length === 0 ? (
                  <tr>
                    <td className={styles.emptyState} colSpan={7}>{t("employee_salary_no_component_lines_found", "No salary component lines found.")}</td>
                  </tr>
                ) : lstVisibleComponentRows.map((dicRow) => (
                  <tr key={dicRow.intEmployeeSalaryComponentID}>
                    <td>{dicRow.strComponentName}</td>
                    <td>{dicRow.strCategory}</td>
                    <td>{dicRow.strValueType}</td>
                    <td>{dicRow.strMonthly}</td>
                    <td>{dicRow.strAnnual}</td>
                    <td>
                      <span className={`${styles.statusPill} ${dicRow.blnIsOverride ? styles.statusInactive : styles.statusActive}`}>
                        {dicRow.strOverride}
                      </span>
                    </td>
                    <td>{dicRow.strRemarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Box>
      </Box>

      <Box>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.25 }}>
          5. {t("employee_salary_revision_history", "Revision History")}
        </Typography>
        <Box className={styles.tableCard}>
          {lstHistoryRows.length > 0 ? (
            <Box className={styles.paginationBar}>
              <Box className={styles.paginationInfo}>
                <Typography className={styles.paginationLabel}>{t("employee_salary_rows_per_page", "Rows per page")}</Typography>
                <TextField
                  select
                  size="small"
                  value={String(intHistoryRowsPerPage)}
                  onChange={(objEvent) => {
                    setIntHistoryRowsPerPage(Number(objEvent.target.value));
                    setIntHistoryPage(1);
                  }}
                  className={styles.rowsPerPageSelect}
                >
                  {lstRowsPerPageOptions.map((intOption) => (
                    <MenuItem key={intOption} value={String(intOption)}>{intOption}</MenuItem>
                  ))}
                </TextField>
                <Typography className={styles.paginationRange}>
                  {intHistoryStartIndex + 1}-{Math.min(intHistoryStartIndex + intHistoryRowsPerPage, lstHistoryRows.length)} of {lstHistoryRows.length}
                </Typography>
              </Box>
              <Pagination
                count={intHistoryPageCount}
                page={intResolvedHistoryPage}
                onChange={(_, intNextPage) => setIntHistoryPage(intNextPage)}
                size="small"
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          ) : null}

          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("employee_salary_structure", "Structure")}</th>
                  <th>{t("employee_salary_effective_from", "Effective From")}</th>
                  <th>{t("employee_salary_effective_to", "Effective To")}</th>
                  <th>{t("employee_salary_gross_monthly", "Gross Monthly")}</th>
                  <th>{t("employee_salary_ctc_annual", "CTC Annual")}</th>
                  <th>{t("employee_salary_record_type", "Record Type")}</th>
                  <th>{t("employee_salary_revision_reason", "Revision Reason")}</th>
                </tr>
              </thead>
              <tbody>
                {lstHistoryRows.length === 0 ? (
                  <tr>
                    <td className={styles.emptyState} colSpan={7}>{t("employee_salary_no_revisions_found", "No salary revisions found.")}</td>
                  </tr>
                ) : lstVisibleHistoryRows.map((dicRow) => (
                  <tr key={dicRow.intEmployeeSalaryStructureID}>
                    <td>{dicRow.strStructure}</td>
                    <td>{dicRow.strEffectiveFrom}</td>
                    <td>{dicRow.strEffectiveTo}</td>
                    <td>{dicRow.strGrossMonthly}</td>
                    <td>{dicRow.strCtcAnnual}</td>
                    <td>
                      <span className={`${styles.statusPill} ${dicRow.blnIsCurrent ? styles.statusActive : styles.statusInactive}`}>
                        {dicRow.blnIsCurrent
                          ? t("employee_salary_current", "Current")
                          : t("employee_salary_history", "History")}
                      </span>
                    </td>
                    <td>{dicRow.strReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Box>
      </Box>

      <Dialog open={blnDialogOpen} onClose={() => !blnSaving && setBlnDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{t("employee_salary_dialog_title", "Assign / Revise Salary")}</DialogTitle>
        <DialogContent sx={{ pb: 3 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
              <TextField
                select
                label={t("employee_salary_structure_field", "Salary structure")}
                value={dicRevisionForm.intSalaryStructureID}
                onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({
                  ...dicPrev,
                  intSalaryStructureID: objEvent.target.value ? Number(objEvent.target.value) : ""
                }))}
              >
                <MenuItem value="">{t("employee_salary_select", "Select")}</MenuItem>
                {(objFormOptions?.lstSalaryStructures ?? []).map((dicOption) => (
                  <MenuItem key={dicOption.intID} value={dicOption.intID}>
                    {dicOption.strCode ? `${dicOption.strCode} - ${dicOption.strLabel}` : dicOption.strLabel}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                type="date"
                label={t("employee_salary_effective_from_field", "Effective from")}
                value={dicRevisionForm.dtEffectiveFrom}
                onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({ ...dicPrev, dtEffectiveFrom: objEvent.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <TextField
              label={t("employee_salary_revision_reason_field", "Revision reason")}
              value={dicRevisionForm.strRevisionReason}
              onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({ ...dicPrev, strRevisionReason: objEvent.target.value }))}
              multiline
              minRows={2}
            />

            <Paper sx={{ borderRadius: "20px", border: "1px solid rgba(148,163,184,0.18)", p: 2 }}>
              <Typography sx={{ fontWeight: 700, mb: 1.5 }}>{t("employee_salary_override_handling", "Override handling")}</Typography>
              <Typography sx={{ color: "#64748b", fontSize: "0.85rem", mb: 1.5 }}>
                {t(
                  "employee_salary_override_help",
                  "Only components marked for manual override can be edited here. Leave values unchanged if the revision should inherit structure defaults."
                )}
              </Typography>
              <Stack spacing={1.5}>
                {dicRevisionForm.lstOverrides.map((dicOverride, intIndex) => (
                  <Box
                    key={dicOverride.intSalaryComponentID}
                    sx={{
                      display: "grid",
                      gap: 1,
                      gridTemplateColumns: { xs: "1fr", lg: "1.2fr 1fr 1fr 1fr 1.2fr" },
                      p: 1.5,
                      borderRadius: "16px",
                      bgcolor: dicOverride.blnAllowManualOverride ? "#f8fafc" : "#f8fafc",
                      border: "1px solid rgba(148,163,184,0.14)"
                    }}
                  >
                    <TextField label={t("employee_salary_component", "Component")} value={dicOverride.strComponentName} disabled />
                    <TextField
                      label={t("employee_salary_monthly", "Monthly")}
                      value={dicOverride.decAmountMonthly}
                      disabled={!dicOverride.blnAllowManualOverride}
                      onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({
                        ...dicPrev,
                        lstOverrides: dicPrev.lstOverrides.map((dicRow, intRowIndex) => intRowIndex === intIndex ? { ...dicRow, decAmountMonthly: objEvent.target.value } : dicRow)
                      }))}
                    />
                    <TextField
                      label={t("employee_salary_annual", "Annual")}
                      value={dicOverride.decAmountAnnual}
                      disabled={!dicOverride.blnAllowManualOverride}
                      onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({
                        ...dicPrev,
                        lstOverrides: dicPrev.lstOverrides.map((dicRow, intRowIndex) => intRowIndex === intIndex ? { ...dicRow, decAmountAnnual: objEvent.target.value } : dicRow)
                      }))}
                    />
                    <TextField
                      label={t("employee_salary_percentage_value", "% Value")}
                      value={dicOverride.decPercentageValue}
                      disabled={!dicOverride.blnAllowManualOverride}
                      onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({
                        ...dicPrev,
                        lstOverrides: dicPrev.lstOverrides.map((dicRow, intRowIndex) => intRowIndex === intIndex ? { ...dicRow, decPercentageValue: objEvent.target.value } : dicRow)
                      }))}
                    />
                    <TextField
                      label={t("employee_salary_remarks", "Remarks")}
                      value={dicOverride.strRemarks}
                      disabled={!dicOverride.blnAllowManualOverride}
                      onChange={(objEvent) => setDicRevisionForm((dicPrev) => ({
                        ...dicPrev,
                        lstOverrides: dicPrev.lstOverrides.map((dicRow, intRowIndex) => intRowIndex === intIndex ? { ...dicRow, strRemarks: objEvent.target.value } : dicRow)
                      }))}
                    />
                  </Box>
                ))}
              </Stack>
            </Paper>

            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button variant="outlined" onClick={() => setBlnDialogOpen(false)} disabled={blnSaving} sx={{ borderRadius: "14px" }}>
                {t("employee_salary_cancel_button", "Cancel")}
              </Button>
              <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={handleSaveRevision} disabled={blnSaving} sx={{ borderRadius: "14px" }}>
                {blnSaving
                  ? t("employee_salary_saving", "Saving...")
                  : t("employee_salary_save_revision", "Save Revision")}
              </Button>
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
