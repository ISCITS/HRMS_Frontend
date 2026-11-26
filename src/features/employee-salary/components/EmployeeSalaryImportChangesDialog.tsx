"use client";

import { useMemo, useState } from "react";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  SALARY_IMPORT_SAVE_ACTIONS,
  rowKey,
  type SalaryImportAction,
  type SalaryImportPreviewRow,
} from "@/features/employee-salary/services/employeeSalaryImportService";

type Translate = (strKey: string, strFallback: string) => string;

type Props = {
  blnOpen: boolean;
  lstRows: SalaryImportPreviewRow[];
  setSelectedRows: Set<number>;
  t: Translate;
  onToggle: (intRowKey: number, blnChecked: boolean) => void;
  onToggleMany: (lstRowKeys: number[], blnChecked: boolean) => void;
  onClose: () => void;
};

export function formatImportAmount(decValue: number | null | undefined) {
  if (decValue === null || decValue === undefined) return "-";
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(decValue);
}

export function formatImportDate(strDate: string | null | undefined) {
  if (!strDate) return "-";
  const objDate = new Date(`${strDate.slice(0, 10)}T00:00:00`);
  return Number.isNaN(objDate.getTime())
    ? strDate
    : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(objDate);
}

export function SalaryImportActionChip({ strAction, t }: { strAction: SalaryImportAction; t: Translate }) {
  const dicChip: Record<SalaryImportAction, { strLabel: string; strColor: "success" | "info" | "warning" | "error" | "default" }> = {
    REVISION: { strLabel: t("employee_salary_import_action_revision", "Revision"), strColor: "info" },
    NEW: { strLabel: t("employee_salary_import_action_new", "New salary"), strColor: "success" },
    CORRECTION: { strLabel: t("employee_salary_import_action_correction", "Correction"), strColor: "warning" },
    NO_CHANGE: { strLabel: t("employee_salary_import_action_no_change", "No change"), strColor: "default" },
    ERROR: { strLabel: t("employee_salary_import_action_error", "Error"), strColor: "error" },
  };
  const dicValue = dicChip[strAction];
  return <Chip size="small" color={dicValue.strColor} label={dicValue.strLabel} sx={{ fontWeight: 700 }} />;
}

export default function EmployeeSalaryImportChangesDialog({ blnOpen, lstRows, setSelectedRows, t, onToggle, onToggleMany, onClose }: Props) {
  const [strActionFilter, setStrActionFilter] = useState<"ALL" | "CONFIRM" | SalaryImportAction>("ALL");
  const [strSearch, setStrSearch] = useState("");

  const lstChangeRows = useMemo(() => lstRows.filter((objRow) => SALARY_IMPORT_SAVE_ACTIONS.includes(objRow.strAction)), [lstRows]);
  const lstVisibleRows = useMemo(() => {
    const strNeedle = strSearch.trim().toLowerCase();
    return lstChangeRows.filter((objRow) => {
      const blnActionMatch =
        strActionFilter === "ALL" ||
        (strActionFilter === "CONFIRM" ? objRow.blnNeedsConfirmation : objRow.strAction === strActionFilter);
      const blnSearchMatch =
        !strNeedle ||
        objRow.strEmployeeCode.toLowerCase().includes(strNeedle) ||
        (objRow.strEmployeeName ?? "").toLowerCase().includes(strNeedle);
      return blnActionMatch && blnSearchMatch;
    });
  }, [lstChangeRows, strActionFilter, strSearch]);

  const lstVisibleKeys = lstVisibleRows.map(rowKey);
  const intVisibleSelected = lstVisibleKeys.filter((intKey) => setSelectedRows.has(intKey)).length;
  const intSelected = lstChangeRows.filter((objRow) => setSelectedRows.has(rowKey(objRow))).length;

  return (
    <Dialog open={blnOpen} onClose={onClose} maxWidth="xl" fullWidth data-controlid="employee-salary.import.changes.dialog">
      <DialogTitle sx={{ fontWeight: 800 }}>
        {t("employee_salary_import_changes_title", "Employee-wise changes")}
        <Typography component="span" sx={{ ml: 1.5, color: "text.secondary", fontSize: "0.9rem", fontWeight: 600 }}>
          {intSelected} / {lstChangeRows.length} {t("employee_salary_import_selected", "selected")}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", gap: 1.5, mb: 1.5, flexWrap: "wrap", alignItems: "center" }}>
          <TextField
            size="small"
            select
            label={t("employee_salary_import_filter_action", "Show")}
            value={strActionFilter}
            onChange={(objEvent) => setStrActionFilter(objEvent.target.value as typeof strActionFilter)}
            sx={{ minWidth: 220 }}
            inputProps={{ "data-controlid": "employee-salary.import.changes.filter.select" }}
          >
            <MenuItem value="ALL">{t("employee_salary_import_filter_all", "All changes")}</MenuItem>
            <MenuItem value="CONFIRM">{t("employee_salary_import_filter_confirm", "Needs confirmation")}</MenuItem>
            <MenuItem value="REVISION">{t("employee_salary_import_action_revision", "Revision")}</MenuItem>
            <MenuItem value="NEW">{t("employee_salary_import_action_new", "New salary")}</MenuItem>
            <MenuItem value="CORRECTION">{t("employee_salary_import_action_correction", "Correction")}</MenuItem>
          </TextField>
          <TextField
            size="small"
            placeholder={t("employee_salary_import_search", "Search code or name")}
            value={strSearch}
            onChange={(objEvent) => setStrSearch(objEvent.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18 }} /></InputAdornment> }}
            inputProps={{ "data-controlid": "employee-salary.import.changes.search.input" }}
            sx={{ minWidth: 260 }}
          />
          <Typography variant="body2" color="text.secondary">
            {t("employee_salary_import_changes_help", "Ticked rows are imported. Rows that need confirmation start unticked: tick them only after checking the warning.")}
          </Typography>
        </Box>

        <TableContainer sx={{ maxHeight: "62vh", border: "1px solid #e8eef5", borderRadius: "8px" }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={intVisibleSelected > 0 && intVisibleSelected < lstVisibleKeys.length}
                    checked={lstVisibleKeys.length > 0 && intVisibleSelected === lstVisibleKeys.length}
                    onChange={(objEvent) => onToggleMany(lstVisibleKeys, objEvent.target.checked)}
                    inputProps={{ "aria-label": "select all" }}
                    data-controlid="employee-salary.import.changes.select-all.checkbox"
                  />
                </TableCell>
                <TableCell>{t("employee_salary_import_col_employee", "Employee")}</TableCell>
                <TableCell>{t("employee_salary_import_col_action", "Action")}</TableCell>
                <TableCell>{t("employee_salary_import_col_structure", "Structure")}</TableCell>
                <TableCell>{t("employee_salary_import_col_effective_from", "Effective From")}</TableCell>
                <TableCell>{t("employee_salary_import_col_changes", "Component changes (monthly)")}</TableCell>
                <TableCell align="right">{t("employee_salary_import_col_gross", "Gross monthly")}</TableCell>
                <TableCell>{t("employee_salary_import_col_warnings", "Warnings")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lstVisibleRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    {t("employee_salary_import_no_changes", "No employees match this filter.")}
                  </TableCell>
                </TableRow>
              ) : null}
              {lstVisibleRows.map((objRow) => {
                const intKey = rowKey(objRow);
                const blnStructureChanged = objRow.strCurrentStructureCode !== objRow.strStructureCode;
                return (
                  <TableRow key={intKey} hover sx={{ verticalAlign: "top", bgcolor: objRow.blnNeedsConfirmation ? "#fffbeb" : undefined }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={setSelectedRows.has(intKey)}
                        onChange={(objEvent) => onToggle(intKey, objEvent.target.checked)}
                        data-controlid={`employee-salary.import.changes.row-${intKey}.checkbox`}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>{objRow.strEmployeeName ?? "-"}</Typography>
                      <Typography sx={{ color: "text.secondary", fontSize: "0.78rem" }}>
                        {objRow.strEmployeeCode} · {t("employee_salary_import_row", "Row")} {objRow.intExcelRowNumber ?? "-"}
                      </Typography>
                    </TableCell>
                    <TableCell><SalaryImportActionChip strAction={objRow.strAction} t={t} /></TableCell>
                    <TableCell sx={{ minWidth: 170, fontSize: "0.8rem" }}>
                      {blnStructureChanged && objRow.strCurrentStructureName ? (
                        <>
                          <Box component="span" sx={{ color: "text.secondary", textDecoration: "line-through" }}>{objRow.strCurrentStructureName}</Box>
                          <Box sx={{ fontWeight: 700 }}>→ {objRow.strStructureName}</Box>
                        </>
                      ) : (
                        objRow.strStructureName ?? "-"
                      )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                      {formatImportDate(objRow.dtEffectiveFrom)}
                      {objRow.dtCurrentEffectiveFrom ? (
                        <Typography sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                          {t("employee_salary_import_current_from", "current from")} {formatImportDate(objRow.dtCurrentEffectiveFrom)}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell sx={{ minWidth: 260 }}>
                      {objRow.lstChanges.length === 0 ? (
                        <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                          {t("employee_salary_import_no_pay_change", "No pay component changes")}
                        </Typography>
                      ) : (
                        objRow.lstChanges.map((objChange) => (
                          <Box key={objChange.strComponentCode} sx={{ display: "flex", gap: 0.75, fontSize: "0.8rem", lineHeight: 1.6 }}>
                            <Box component="span" sx={{ fontWeight: 700, minWidth: 110 }}>{objChange.strComponentName}</Box>
                            <Box component="span" sx={{ color: "text.secondary" }}>{formatImportAmount(objChange.decOldMonthly)}</Box>
                            <Box component="span">→</Box>
                            <Box component="span" sx={{ fontWeight: 700, color: (objChange.decNewMonthly ?? 0) >= (objChange.decOldMonthly ?? 0) ? "#15803d" : "#b91c1c" }}>
                              {formatImportAmount(objChange.decNewMonthly)}
                            </Box>
                          </Box>
                        ))
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                      <Box sx={{ color: "text.secondary" }}>{formatImportAmount(objRow.decCurrentGross)}</Box>
                      <Box sx={{ fontWeight: 800 }}>{formatImportAmount(objRow.decNewGross)}</Box>
                      {objRow.decGrossChange !== null ? (
                        <Box sx={{ fontSize: "0.72rem", color: objRow.decGrossChange >= 0 ? "#15803d" : "#b91c1c" }}>
                          {objRow.decGrossChange >= 0 ? "+" : ""}{formatImportAmount(objRow.decGrossChange)}
                        </Box>
                      ) : null}
                    </TableCell>
                    <TableCell sx={{ minWidth: 240 }}>
                      {objRow.lstWarnings.length === 0 ? (
                        <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>-</Typography>
                      ) : (
                        objRow.lstWarnings.map((strWarning) => (
                          <Tooltip key={strWarning} title={strWarning}>
                            <Box sx={{ display: "flex", gap: 0.5, alignItems: "flex-start", fontSize: "0.78rem", color: "#92400e", mb: 0.5 }}>
                              <WarningAmberRoundedIcon sx={{ fontSize: 16, mt: "1px" }} />
                              <span>{strWarning}</span>
                            </Box>
                          </Tooltip>
                        ))
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose} data-controlid="employee-salary.import.changes.done.button">
          {t("employee_salary_import_done", "Done")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
