"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, MenuItem, Snackbar, TextField, Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import { useEmployeeOptions } from "@/features/leave-plan/hooks/useEmployeeLeavePlan";
import { leavePlanService } from "@/features/leave-plan/services/leavePlanService";
import type { LeavePlan } from "@/features/leave-plan/types/LeavePlanTypes";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useActionRights } from "@/features/security/hooks/useActionRights";

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };
type BulkAssignState = { blnOpen: boolean; intLeavePlanID: number; dtEffectiveFrom: string; intLeaveYear: number; strReason: string; blnReplace: boolean };

const strToday = new Date().toISOString().slice(0, 10);
const intCurrentYear = new Date().getFullYear();
const objBulkDefaults: BulkAssignState = { blnOpen: false, intLeavePlanID: 0, dtEffectiveFrom: strToday, intLeaveYear: intCurrentYear, strReason: "", blnReplace: false };

function formatDate(strValue: string | null | undefined): string {
  if (!strValue) return "—";
  const objDate = new Date(`${strValue.slice(0, 10)}T00:00:00`);
  return Number.isNaN(objDate.getTime()) ? strValue : new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(objDate);
}

function StatusPill({ strStatus }: { strStatus: string }) {
  const blnActive = (strStatus || "").trim().toLowerCase() === "active";
  return <span className={`${styles.statusPill} ${blnActive ? styles.statusActive : styles.statusInactive}`}>{strStatus || "—"}</span>;
}

export default function EmployeeLeaveAssignmentPanel() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("employee_leave_plan");
  const { canDo, blnLoading: blnRightsLoading } = useActionRights();
  const { lstEmployees, blnLoading, strError } = useEmployeeOptions();
  const [strSearchDraft, setStrSearchDraft] = useState("");
  const [strSearchApplied, setStrSearchApplied] = useState("");
  const [lstSelectedIds, setLstSelectedIds] = useState<number[]>([]);
  const [lstPlans, setLstPlans] = useState<LeavePlan[]>([]);
  const [objBulk, setObjBulk] = useState<BulkAssignState>(objBulkDefaults);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });
  // The Employee Leave Assignment menu grants the generic action set (view/edit/add/...);
  // older ESS-style setups use the compound LEAVE_VIEW/LEAVE_MANAGE codes, so accept either.
  const blnCanView = canDo("EMPLOYEE_LEAVE_ASSIGNMENT", "VIEW") || canDo("EMPLOYEE_LEAVE_ASSIGNMENT", "LEAVE_VIEW");
  const blnCanManage = canDo("EMPLOYEE_LEAVE_ASSIGNMENT", "EDIT") || canDo("EMPLOYEE_LEAVE_ASSIGNMENT", "ADD") || canDo("EMPLOYEE_LEAVE_ASSIGNMENT", "LEAVE_MANAGE");

  useEffect(() => {
    if (!blnCanManage) return;
    let blnMounted = true;
    leavePlanService.listPlans().then((lstResult) => { if (blnMounted) setLstPlans(lstResult); }).catch(() => { if (blnMounted) setLstPlans([]); });
    return () => { blnMounted = false; };
  }, [blnCanManage]);

  const lstFiltered = useMemo(() => {
    const strNeedle = strSearchApplied.trim().toLowerCase();
    return lstEmployees.filter((objEmployee) => !strNeedle || `${objEmployee.strEmployeeCode} ${objEmployee.strFullName} ${objEmployee.strDepartmentName ?? ""}`.toLowerCase().includes(strNeedle));
  }, [lstEmployees, strSearchApplied]);

  const blnAllSelected = lstFiltered.length > 0 && lstFiltered.every((objEmployee) => lstSelectedIds.includes(objEmployee.intID));
  const blnSomeSelected = !blnAllSelected && lstFiltered.some((objEmployee) => lstSelectedIds.includes(objEmployee.intID));

  function showToast(strMessage: string, strSeverity: ToastState["strSeverity"] = "success") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  function toggleSelection(intID: number) {
    setLstSelectedIds((lstPrev) => (lstPrev.includes(intID) ? lstPrev.filter((intValue) => intValue !== intID) : [...lstPrev, intID]));
  }

  function toggleSelectAll() {
    if (blnAllSelected) {
      setLstSelectedIds((lstPrev) => lstPrev.filter((intID) => !lstFiltered.some((objEmployee) => objEmployee.intID === intID)));
      return;
    }
    setLstSelectedIds((lstPrev) => [...new Set([...lstPrev, ...lstFiltered.map((objEmployee) => objEmployee.intID)])]);
  }

  async function submitBulkAssign() {
    if (!objBulk.intLeavePlanID) {
      showToast(t("bulk_select_plan", "Select a Leave Plan to assign."), "error");
      return;
    }
    setBlnSubmitting(true);
    let intAssigned = 0;
    const lstFailureReasons: string[] = [];
    await Promise.all(
      lstSelectedIds.map(async (intEmployeeID) => {
        const objPayload = {
          intEmployeeID,
          intLeavePlanID: objBulk.intLeavePlanID,
          intLeaveYear: objBulk.intLeaveYear,
          dtEffectiveFrom: objBulk.dtEffectiveFrom,
          dtEffectiveTo: null,
          blnInitializeBalances: true,
          strAssignmentReason: objBulk.strReason.trim() || t("bulk_assignment_reason", "Bulk Leave Plan assignment"),
          lstOpeningBalances: [],
        };
        try {
          await leavePlanService.assignPlan(intEmployeeID, objPayload, false);
          intAssigned += 1;
        } catch (objAssignError) {
          if (objBulk.blnReplace) {
            try {
              await leavePlanService.assignPlan(intEmployeeID, objPayload, true);
              intAssigned += 1;
              return;
            } catch (objReplaceError) {
              lstFailureReasons.push((await createApiRequestError(objReplaceError)).message);
              return;
            }
          }
          lstFailureReasons.push((await createApiRequestError(objAssignError)).message);
        }
      }),
    );
    setBlnSubmitting(false);
    if (lstFailureReasons.length === 0) {
      setObjBulk(objBulkDefaults);
      setLstSelectedIds([]);
      showToast(t("bulk_assign_success", "Leave Plan assigned to {ok} employee(s).").replace("{ok}", String(intAssigned)), "success");
      return;
    }
    // Surface the real backend reason(s) instead of a generic message, and hint at "Replace"
    // when an employee is skipped only because they already hold an active plan. The dialog and
    // selection are kept intact so the user can enable "Replace" (or use Edit) and retry.
    const lstDistinctReasons = Array.from(new Set(lstFailureReasons));
    const blnAlreadyAssigned = lstFailureReasons.some((strReason) => /already/i.test(strReason));
    const strTip = blnAlreadyAssigned && !objBulk.blnReplace
      ? ` ${t("bulk_assign_replace_tip", "Enable 'Replace' below (or use the Edit action) to change an existing assignment.")}`
      : "";
    showToast(
      `${t("bulk_assign_partial", "Assigned {ok} employee(s); {fail} skipped.").replace("{ok}", String(intAssigned)).replace("{fail}", String(lstFailureReasons.length))} ${lstDistinctReasons.join(" ")}${strTip}`,
      "error",
    );
  }

  const lstRows = useMemo(
    () =>
      lstFiltered.map((objEmployee) => ({
        id: objEmployee.intID,
        select: (
          <Checkbox
            checked={lstSelectedIds.includes(objEmployee.intID)}
            onChange={() => toggleSelection(objEmployee.intID)}
            inputProps={{ "data-control-id": "employee-leave-plan.list.row.select.checkbox", "data-row-key": String(objEmployee.intID) } as InputHTMLAttributes<HTMLInputElement>}
          />
        ),
        action: (
          <CommonRowActions
            testIdPrefix={`employee-leave-plan.list.row.${objEmployee.intID}`}
            rowKey={objEmployee.intID}
            blnCanView
            blnCanEdit={blnCanManage}
            onView={() => objRouter.push(`/leave/plan-assignments/${objEmployee.intID}?mode=view`)}
            onEdit={() => objRouter.push(`/leave/plan-assignments/${objEmployee.intID}`)}
          />
        ),
        strEmployeeCode: objEmployee.strEmployeeCode,
        strFullName: objEmployee.strFullName,
        strDepartmentName: objEmployee.strDepartmentName ?? "—",
        strDesignationName: objEmployee.strDesignationName ?? "—",
        strJoiningDate: formatDate(objEmployee.dtDateOfJoining),
        blnStatus: <StatusPill strStatus={objEmployee.strEmploymentStatus} />,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lstFiltered, blnCanManage, lstSelectedIds],
  );

  const lstColumns = useMemo<CommonTableColumn<(typeof lstRows)[number]>[]>(
    () => [
      {
        field: "select",
        headerName: (
          <Checkbox
            checked={blnAllSelected}
            indeterminate={blnSomeSelected}
            onChange={toggleSelectAll}
            disabled={lstFiltered.length === 0}
            inputProps={{ "data-control-id": "employee-leave-plan.list.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>}
          />
        ),
        sortable: false,
        filterable: false,
        exportable: false,
        width: 56,
      },
      { field: "action", headerName: t("table_actions", "Actions"), sortable: false, filterable: false, exportable: false, width: 110 },
      { field: "strEmployeeCode", headerName: t("table_employee_code", "Employee Code"), width: 140 },
      { field: "strFullName", headerName: t("table_employee_name", "Employee Name"), width: 200 },
      { field: "strDepartmentName", headerName: t("table_department", "Department"), width: 180 },
      { field: "strDesignationName", headerName: t("table_designation", "Designation"), width: 170 },
      { field: "strJoiningDate", headerName: t("table_joining_date", "Joining Date"), width: 140 },
      { field: "blnStatus", headerName: t("table_status", "Status"), sortable: false, width: 120 },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, blnAllSelected, blnSomeSelected, lstFiltered.length],
  );

  const objTransparentTableSx = { p: 0, boxShadow: "none", background: "transparent" } as const;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, pb: 2 }}>
      {/* Search / filter card */}
      <Box className={styles.controlsCard}>
        <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, alignItems: "center", mt: 1 }}>
          <TextField
            size="small"
            value={strSearchDraft}
            onChange={(objEvent) => setStrSearchDraft(objEvent.target.value)}
            onKeyDown={(objEvent) => objEvent.key === "Enter" && setStrSearchApplied(strSearchDraft)}
            placeholder={t("employee_search", "Search employee by code, name, or department")}
            inputProps={{ "data-control-id": "employee-leave-plan.list.search.input" }}
            fullWidth
            sx={{ gridColumn: { xs: "auto", sm: "1 / -1", lg: "span 2" } }}
          />
          <Box sx={{ display: "flex", gap: 1, gridColumn: { xs: "auto", sm: "1 / -1", lg: "auto" }, justifyContent: { sm: "flex-end" } }}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => setStrSearchApplied(strSearchDraft)} disabled={blnLoading} data-control-id="employee-leave-plan.list.search.button">
              {t("search", "Search")}
            </Button>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setStrSearchDraft(""); setStrSearchApplied(""); }} disabled={blnLoading} data-control-id="employee-leave-plan.list.clear.button">
              {t("clear", "Clear")}
            </Button>
          </Box>
        </Box>
        {blnCanManage && lstSelectedIds.length > 0 ? (
          <Box className={styles.bulkBar} data-control-id="employee-leave-plan.list.bulk-actions.bar">
            <Typography className={styles.bulkCount}>{`${lstSelectedIds.length} ${t("bulk_rows_selected", "rows selected")}`}</Typography>
            <Button className={styles.bulkActivate} onClick={() => setObjBulk({ ...objBulkDefaults, blnOpen: true })} disabled={blnSubmitting} data-control-id="employee-leave-plan.list.bulk-assign.button">
              {t("bulk_assign", "Assign Leave Plan")}
            </Button>
          </Box>
        ) : null}
      </Box>

      {strError ? <Alert severity="error">{strError}</Alert> : null}

      {blnLoading || blnRightsLoading ? (
        <Box sx={{ display: "grid", placeItems: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : !blnCanView ? (
        <Alert severity="warning">{t("access_denied", "Leave assignment access is not available for your user group.")}</Alert>
      ) : (
        <Box className={styles.tableCard} sx={{ flex: "0 0 auto" }}>
          <CommonTable
            columns={lstColumns}
            rows={lstRows}
            rowIdField="id"
            defaultPageSize={10}
            pageSizeOptions={[10, 20, 50]}
            exportFileName="employee_leave_plan_assignments"
            showExportOptions
            showPaginationSummary
            minTableWidth={1116}
            getRowSx={(dicRow) => (lstSelectedIds.includes(dicRow.id) ? { backgroundColor: "rgba(37, 99, 235, 0.08)" } : {})}
            emptyMessage={t("empty_message", "No employees found.")}
            toolbarLeft={
              blnCanManage ? (
                <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => setObjBulk({ ...objBulkDefaults, blnOpen: true })} data-control-id="employee-leave-plan.list.assign.button">
                  {t("bulk_assign", "Assign Leave Plan")}
                </Button>
              ) : undefined
            }
            testIdPrefix="employee-leave-plan.list"
            sx={objTransparentTableSx}
          />
        </Box>
      )}

      {/* Bulk assign dialog */}
      <Dialog open={objBulk.blnOpen} onClose={() => !blnSubmitting && setObjBulk(objBulkDefaults)} maxWidth="sm" fullWidth PaperProps={{ "data-control-id": "employee-leave-plan.bulk-assign.dialog" } as Record<string, string>}>
        <DialogTitle sx={{ fontWeight: 800 }}>{t("bulk_assign_title", "Assign Leave Plan")}</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: "12px !important" }}>
          <Typography sx={{ fontSize: "0.85rem", color: "#475569" }}>
            {t("bulk_assign_help", "Assign the selected Leave Plan to {count} employee(s). Balances are initialized from the plan.").replace("{count}", String(lstSelectedIds.length))}
          </Typography>
          {lstSelectedIds.length === 0 ? (
            <Alert severity="info" data-control-id="employee-leave-plan.bulk-assign.no-selection">{t("bulk_assign_no_selection", "Select one or more employees from the list first, then choose a plan to assign.")}</Alert>
          ) : null}
          <TextField select size="small" label={t("select_plan", "Leave Plan")} value={objBulk.intLeavePlanID || ""} onChange={(objEvent) => setObjBulk((objPrev) => ({ ...objPrev, intLeavePlanID: Number(objEvent.target.value) }))} inputProps={{ "data-control-id": "employee-leave-plan.bulk-assign.plan.select" }}>
            <MenuItem value="">{t("select_plan_placeholder", "Select Plan")}</MenuItem>
            {lstPlans.filter((objPlan) => objPlan.blnIsActive).map((objPlan) => (
              <MenuItem key={objPlan.intID} value={objPlan.intID}>{objPlan.strPlanCode} - {objPlan.strDisplayName || objPlan.strPlanName}</MenuItem>
            ))}
          </TextField>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <TextField type="date" size="small" label={t("effective_from", "Effective From")} value={objBulk.dtEffectiveFrom} onChange={(objEvent) => setObjBulk((objPrev) => ({ ...objPrev, dtEffectiveFrom: objEvent.target.value }))} InputLabelProps={{ shrink: true }} inputProps={{ "data-control-id": "employee-leave-plan.bulk-assign.effective-from.input" }} />
            <TextField type="number" size="small" label={t("leave_year", "Leave Year")} value={objBulk.intLeaveYear} onChange={(objEvent) => setObjBulk((objPrev) => ({ ...objPrev, intLeaveYear: Number(objEvent.target.value) }))} inputProps={{ "data-control-id": "employee-leave-plan.bulk-assign.year.input", min: 2001, max: 2999 }} />
          </Box>
          <TextField size="small" label={t("assignment_reason", "Assignment Reason")} value={objBulk.strReason} onChange={(objEvent) => setObjBulk((objPrev) => ({ ...objPrev, strReason: objEvent.target.value }))} inputProps={{ "data-control-id": "employee-leave-plan.bulk-assign.reason.input", maxLength: 500 }} />
          <FormControlLabel
            control={<Checkbox checked={objBulk.blnReplace} onChange={(_, blnValue) => setObjBulk((objPrev) => ({ ...objPrev, blnReplace: blnValue }))} inputProps={{ "data-control-id": "employee-leave-plan.bulk-assign.replace.checkbox" } as InputHTMLAttributes<HTMLInputElement>} />}
            label={t("bulk_assign_replace", "Replace an employee's existing active plan (if any)")}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setObjBulk(objBulkDefaults)} disabled={blnSubmitting} data-control-id="employee-leave-plan.bulk-assign.cancel.button">{t("cancel", "Cancel")}</Button>
          <Button variant="contained" onClick={() => void submitBulkAssign()} disabled={blnSubmitting || !objBulk.intLeavePlanID || lstSelectedIds.length === 0} data-control-id="employee-leave-plan.bulk-assign.confirm.button">
            {blnSubmitting ? t("assigning", "Assigning...") : t("assign", "Assign")}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={objToast.blnOpen} autoHideDuration={5000} onClose={() => setObjToast((objPrev) => ({ ...objPrev, blnOpen: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={objToast.strSeverity} variant="filled" onClose={() => setObjToast((objPrev) => ({ ...objPrev, blnOpen: false }))}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
