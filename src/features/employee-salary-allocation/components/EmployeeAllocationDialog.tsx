"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import {
  allocationMasterService,
  type AllocationEntityApiRecord,
} from "@/features/allocation-masters/services/allocationMasterService";
import {
  employeeAllocationService,
  type EmployeeAllocationRecord,
} from "@/features/employee-salary-allocation/services/employeeAllocationService";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type EmployeeAllocationDialogProps = {
  blnOpen: boolean;
  onClose: () => void;
  intEmployeeSalaryComponentID: number | null;
  strEmployeeName?: string | null;
  strEmployeeCode?: string | null;
  onSaved?: () => void;
};

const lstEmployeeSalaryModuleCodes = ["EMPLOYEE_SALARY", "EMPLOYEE_SALARIES"];

// The backend accepts a total within 0.0001 of 100; the UI uses the same tolerance so the
// Save button never enables on a payload the backend would reject.
const TOTAL_TOLERANCE = 0.0001;

function formatAmount(decValue: number) {
  return decValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Configure how one employee's Allocation-Based salary component entitlement is split
// across the Allocation Entities of the component's Allocation Entity Type.
export default function EmployeeAllocationDialog({
  blnOpen,
  onClose,
  intEmployeeSalaryComponentID,
  strEmployeeName,
  strEmployeeCode,
  onSaved,
}: EmployeeAllocationDialogProps) {
  const { t } = useModuleLabels("employee-salary-allocation", "Unable to load Employee Allocation labels.");
  const objAccess = useModuleActionAccess(lstEmployeeSalaryModuleCodes);
  const blnCanEdit = objAccess.canDoAny("edit") || objAccess.canDoAny("add") || objAccess.canDoAny("save");

  const [objAllocation, setObjAllocation] = useState<EmployeeAllocationRecord | null>(null);
  const [lstEntities, setLstEntities] = useState<AllocationEntityApiRecord[]>([]);
  const [dicPercentByEntityID, setDicPercentByEntityID] = useState<Record<number, string>>({});
  const [dicRemarksByEntityID, setDicRemarksByEntityID] = useState<Record<number, string>>({});
  const [blnBusy, setBlnBusy] = useState(false);
  const [strError, setStrError] = useState<string | null>(null);
  const [strSuccess, setStrSuccess] = useState<string | null>(null);

  async function loadAllocation() {
    if (!intEmployeeSalaryComponentID) return;
    setBlnBusy(true);
    setStrError(null);
    setStrSuccess(null);
    try {
      const objRecord = await employeeAllocationService.getAllocation(intEmployeeSalaryComponentID);
      setObjAllocation(objRecord);

      const lstActiveEntities = objRecord.intAllocationEntityTypeID
        ? await allocationMasterService.listEntities(objRecord.intAllocationEntityTypeID, true)
        : [];
      setLstEntities(lstActiveEntities);

      const dicPercent: Record<number, string> = {};
      const dicRemarks: Record<number, string> = {};
      for (const dicRow of objRecord.lstAllocations) {
        dicPercent[dicRow.intAllocationEntityID] = dicRow.decAllocationPercent;
        dicRemarks[dicRow.intAllocationEntityID] = dicRow.strRemarks ?? "";
      }
      setDicPercentByEntityID(dicPercent);
      setDicRemarksByEntityID(dicRemarks);
    } catch (objErr) {
      setStrError(
        (objErr as Error)?.message ?? t("load_failed", "Unable to load the allocation for this salary component."),
      );
      setObjAllocation(null);
      setLstEntities([]);
    } finally {
      setBlnBusy(false);
    }
  }

  useEffect(() => {
    if (!blnOpen || !intEmployeeSalaryComponentID || objAccess.blnLoading) {
      return;
    }
    setStrError(null);
    setStrSuccess(null);
    void loadAllocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blnOpen, objAccess.blnLoading, intEmployeeSalaryComponentID]);

  const decBaseAmount = useMemo(() => {
    const decParsed = Number(objAllocation?.decBaseAmountMonthly ?? "");
    return Number.isFinite(decParsed) ? decParsed : 0;
  }, [objAllocation]);

  // Entities that already carry a saved allocation but are no longer active must stay visible,
  // otherwise saving would silently drop them and break the 100% total.
  const lstVisibleEntities = useMemo(() => {
    const lstRows = [...lstEntities];
    const setKnownIDs = new Set(lstRows.map((dicEntity) => dicEntity.intID));
    for (const dicRow of objAllocation?.lstAllocations ?? []) {
      if (!setKnownIDs.has(dicRow.intAllocationEntityID)) {
        lstRows.push({
          intID: dicRow.intAllocationEntityID,
          intAllocationEntityTypeID: objAllocation?.intAllocationEntityTypeID ?? 0,
          strEntityCode: "-",
          strEntityName: `#${dicRow.intAllocationEntityID}`,
          strDescription: null,
          strExternalReference: null,
          dtEffectiveFrom: null,
          dtEffectiveTo: null,
          blnIsActive: false,
          intDisplayOrder: 9999,
        });
      }
    }
    return lstRows;
  }, [lstEntities, objAllocation]);

  function percentFor(intEntityID: number) {
    return dicPercentByEntityID[intEntityID] ?? "";
  }

  function numericPercentFor(intEntityID: number) {
    const decParsed = Number(percentFor(intEntityID));
    return Number.isFinite(decParsed) ? decParsed : 0;
  }

  const decTotalPercent = useMemo(
    () =>
      lstVisibleEntities.reduce((decSum, dicEntity) => {
        const decParsed = Number(dicPercentByEntityID[dicEntity.intID] ?? "");
        return decSum + (Number.isFinite(decParsed) ? decParsed : 0);
      }, 0),
    [dicPercentByEntityID, lstVisibleEntities],
  );

  const blnTotalIsValid = Math.abs(decTotalPercent - 100) <= TOTAL_TOLERANCE;

  async function handleSave() {
    if (!intEmployeeSalaryComponentID) return;
    const lstAllocations = lstVisibleEntities
      .map((dicEntity) => ({
        intAllocationEntityID: dicEntity.intID,
        decAllocationPercent: numericPercentFor(dicEntity.intID),
        strRemarks: dicRemarksByEntityID[dicEntity.intID]?.trim() || null,
      }))
      // The backend requires decAllocationPercent > 0 on every row, so blank/zero rows are dropped.
      .filter((dicRow) => dicRow.decAllocationPercent > 0);

    if (lstAllocations.length === 0) {
      setStrError(t("no_rows", "Enter an allocation percentage for at least one entity."));
      return;
    }

    setBlnBusy(true);
    setStrError(null);
    setStrSuccess(null);
    try {
      const objRecord = await employeeAllocationService.saveAllocation(intEmployeeSalaryComponentID, lstAllocations);
      setObjAllocation(objRecord);
      const dicPercent: Record<number, string> = {};
      const dicRemarks: Record<number, string> = {};
      for (const dicRow of objRecord.lstAllocations) {
        dicPercent[dicRow.intAllocationEntityID] = dicRow.decAllocationPercent;
        dicRemarks[dicRow.intAllocationEntityID] = dicRow.strRemarks ?? "";
      }
      setDicPercentByEntityID(dicPercent);
      setDicRemarksByEntityID(dicRemarks);
      setStrSuccess(t("save_success", "Employee allocation saved successfully."));
      onSaved?.();
    } catch (objErr) {
      // Surfaces the backend's "Active allocations must total exactly 100.0000%" message verbatim.
      setStrError((objErr as Error)?.message ?? t("save_failed", "Unable to save the employee allocation."));
    } finally {
      setBlnBusy(false);
    }
  }

  const strEmployeeLabel = [strEmployeeName, strEmployeeCode].filter(Boolean).join(" - ");

  return (
    <Dialog open={blnOpen} onClose={onClose} maxWidth="md" fullWidth data-control-id="employee-allocation.dialog">
      <BlockingLoader blnOpen={blnBusy} strLabel={t("working", "Please wait...")} />

      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>
          {t("page_title", "Employee Allocation")}
          {strEmployeeLabel ? ` - ${strEmployeeLabel}` : ""}
        </span>
        <IconButton onClick={onClose} data-control-id="employee-allocation.header.close.button">
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          {strError ? (
            <Alert severity="error" onClose={() => setStrError(null)}>
              {strError}
            </Alert>
          ) : null}
          {strSuccess ? (
            <Alert severity="success" onClose={() => setStrSuccess(null)}>
              {strSuccess}
            </Alert>
          ) : null}

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            <Chip label={`${t("salary_component", "Salary Component")}: ${objAllocation?.intSalaryComponentID ?? "-"}`} />
            <Chip
              label={`${t("entity_type", "Allocation Entity Type")}: ${objAllocation?.intAllocationEntityTypeID ?? "-"}`}
            />
            <Chip
              color="primary"
              label={`${t("base_amount", "Base Monthly Amount")}: ${
                objAllocation?.decBaseAmountMonthly != null ? formatAmount(decBaseAmount) : "-"
              }`}
            />
          </Box>
          {objAllocation && objAllocation.intAllocationEntityTypeID == null ? (
            <Alert severity="warning">
              {t(
                "no_entity_type",
                "This salary component has no Allocation Entity Type configured, so there is nothing to allocate across.",
              )}
            </Alert>
          ) : null}

          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
            <Typography variant="subtitle1" fontWeight={700}>
              {t("allocation_grid", "Allocation Split")}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshRoundedIcon />}
              onClick={() => void loadAllocation()}
              disabled={blnBusy}
              data-control-id="employee-allocation.grid.refresh.button"
            >
              {t("refresh", "Refresh")}
            </Button>
          </Stack>

          <TableContainer sx={{ maxHeight: 420 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>{t("entity_code", "Entity Code")}</TableCell>
                  <TableCell>{t("entity_name", "Entity Name")}</TableCell>
                  <TableCell align="right">{t("allocation_percent", "Allocation %")}</TableCell>
                  <TableCell align="right">{t("illustrative_share", "Illustrative Base Share")}</TableCell>
                  <TableCell>{t("remarks", "Remarks")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lstVisibleEntities.map((dicEntity) => {
                  const decPercent = numericPercentFor(dicEntity.intID);
                  const decShare = (decBaseAmount * decPercent) / 100;
                  return (
                    <TableRow key={dicEntity.intID} hover>
                      <TableCell>{dicEntity.strEntityCode}</TableCell>
                      <TableCell>
                        {dicEntity.strEntityName}
                        {!dicEntity.blnIsActive ? (
                          <Chip size="small" sx={{ ml: 1 }} color="warning" label={t("inactive", "Inactive")} />
                        ) : null}
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={percentFor(dicEntity.intID)}
                          onChange={(objEvent) =>
                            setDicPercentByEntityID((dicPrevious) => ({
                              ...dicPrevious,
                              [dicEntity.intID]: objEvent.target.value,
                            }))
                          }
                          disabled={!blnCanEdit || blnBusy}
                          inputProps={{
                            controlId: `employee-allocation.grid.percent-${dicEntity.intID}.input`,
                            min: 0,
                            max: 100,
                            step: "0.0001",
                            style: { textAlign: "right" },
                          }}
                          sx={{ width: 140 }}
                        />
                      </TableCell>
                      <TableCell align="right">{formatAmount(decShare)}</TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={dicRemarksByEntityID[dicEntity.intID] ?? ""}
                          onChange={(objEvent) =>
                            setDicRemarksByEntityID((dicPrevious) => ({
                              ...dicPrevious,
                              [dicEntity.intID]: objEvent.target.value,
                            }))
                          }
                          disabled={!blnCanEdit || blnBusy}
                          inputProps={{ controlId: `employee-allocation.grid.remarks-${dicEntity.intID}.input` }}
                          fullWidth
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {lstVisibleEntities.length === 0 && !blnBusy ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      {t("no_entities", "No active Allocation Entities found for this component's entity type.")}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} sx={{ fontWeight: 800 }}>
                    {t("total", "Total")}
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      size="small"
                      color={blnTotalIsValid ? "success" : "error"}
                      label={`${decTotalPercent.toFixed(4)} %`}
                      data-control-id="employee-allocation.grid.total.chip"
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    {formatAmount((decBaseAmount * decTotalPercent) / 100)}
                  </TableCell>
                  <TableCell>
                    {blnTotalIsValid ? null : (
                      <Typography sx={{ color: "#dc2626", fontSize: "0.8rem", fontWeight: 700 }}>
                        {t("total_must_be_100", "Active allocations must total exactly 100.0000%.")}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} data-control-id="employee-allocation.footer.close.button">
          {t("close", "Close")}
        </Button>
        {blnCanEdit ? (
          <Button
            variant="contained"
            startIcon={<SaveRoundedIcon />}
            onClick={() => void handleSave()}
            disabled={blnBusy || !blnTotalIsValid || lstVisibleEntities.length === 0}
            data-control-id="employee-allocation.grid.save.button"
          >
            {t("save", "Save Allocation")}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
