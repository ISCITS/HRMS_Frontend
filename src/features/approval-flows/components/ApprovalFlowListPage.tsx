"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  MenuItem,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useActionRights } from "@/features/security/hooks/useActionRights";
import { approvalFlowService } from "@/features/approval-flows/services/approvalFlowService";
import { lstApprovalFlowModules, type ApprovalFlowRecord } from "@/features/approval-flows/types";

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };
type RowRecord = Record<string, ReactNode> & { intID: number };

function getModuleLabel(strModuleCode: string) {
  return lstApprovalFlowModules.find((objModule) => objModule.strValue === strModuleCode)?.strLabel ?? strModuleCode;
}

function formatDate(strDate: string) {
  const objDate = new Date(strDate);
  if (Number.isNaN(objDate.getTime())) return strDate;
  return objDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ApprovalFlowListPage() {
  const objRouter = useRouter();
  const { canDo, blnLoading: blnRightsLoading } = useActionRights();
  const blnCanEdit = canDo("settings", "EDIT");
  const blnCanView = canDo("settings", "VIEW") || blnCanEdit;

  const [blnLoading, setBlnLoading] = useState(true);
  const [lstFlows, setLstFlows] = useState<ApprovalFlowRecord[]>([]);
  const [strSearch, setStrSearch] = useState("");
  const [strStatus, setStrStatus] = useState("ALL");
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  function showToast(strMessage: string, strSeverity: "success" | "error") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  async function loadFlows() {
    setBlnLoading(true);
    try {
      setLstFlows(await approvalFlowService.listFlows(strSearch, undefined, strStatus));
    } catch {
      showToast("Unable to load approval flows.", "error");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    const objTimer = setTimeout(() => void loadFlows(), strSearch ? 300 : 0);
    return () => clearTimeout(objTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strSearch, strStatus]);

  const lstColumns: CommonTableColumn<RowRecord>[] = [
    {
      field: "strModuleCode",
      headerName: "Module",
      width: 160,
      sortable: true,
    },
    { field: "strWorkflowName", headerName: "Approval Flow Name", sortable: true },
    { field: "objPrimaryApprover", headerName: "Primary Approver" },
    { field: "objAlternateApprover", headerName: "Alternate Approver" },
    { field: "dtEffectiveFrom", headerName: "Effective From", width: 140, sortable: true },
    { field: "blnIsActive", headerName: "Status", width: 110 },
    { field: "strActions", headerName: "Actions", width: 100, sortable: false, exportable: false },
  ];

  const lstDisplayRows: RowRecord[] = lstFlows.map((objRow) => ({
    intID: objRow.intID,
    strModuleCode: (
      <Chip
        size="small"
        label={getModuleLabel(objRow.strModuleCode)}
        variant="outlined"
        color={objRow.strModuleCode === "LEAVE" ? "success" : objRow.strModuleCode === "WORK_ON_HOLIDAY" ? "info" : "primary"}
      />
    ),
    strWorkflowName: objRow.strWorkflowName,
    objPrimaryApprover: (
      <Box>
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>{objRow.objPrimaryApprover?.strFullName ?? "-"}</Typography>
        {objRow.objPrimaryApprover?.strEmployeeCode ? (
          <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>{objRow.objPrimaryApprover.strEmployeeCode}</Typography>
        ) : null}
      </Box>
    ),
    objAlternateApprover: (
      <Box>
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>{objRow.objAlternateApprover?.strFullName ?? "-"}</Typography>
        {objRow.objAlternateApprover?.strEmployeeCode ? (
          <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>{objRow.objAlternateApprover.strEmployeeCode}</Typography>
        ) : null}
      </Box>
    ),
    dtEffectiveFrom: formatDate(objRow.dtEffectiveFrom),
    blnIsActive: (
      <Chip size="small" label={objRow.blnIsActive ? "Active" : "Inactive"} color={objRow.blnIsActive ? "success" : "default"} variant={objRow.blnIsActive ? "filled" : "outlined"} />
    ),
    strActions: (
      <CommonRowActions
        blnCanView={blnCanView}
        blnCanEdit={blnCanEdit}
        rowKey={objRow.intID}
        testIdPrefix="approval-flows.row"
        onView={() => objRouter.push(`/settings/edit/${objRow.intID}?mode=view`)}
        onEdit={() => objRouter.push(`/settings/edit/${objRow.intID}`)}
      />
    ),
  }));

  const blnBusy = blnLoading || blnRightsLoading;

  return (
    <Box className={styles.page}>
      <Box className={styles.tableCard}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1.05rem" }}>Settings</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.86rem", mt: 0.25 }}>
              Configure approval workflows for Leave, Attendance Regularisation and Work on Holiday modules.
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {blnCanEdit ? (
              <button
                type="button"
                className={styles.primaryButton}
                data-controlid="approval-flows.add.button"
                onClick={() => objRouter.push("/settings/add")}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <AddRoundedIcon fontSize="small" /> Add Approval Flow
              </button>
            ) : null}
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", pb: 2 }}>
          <TextField
            size="small"
            placeholder="Search by approver name or code"
            value={strSearch}
            onChange={(objEvent) => setStrSearch(objEvent.target.value)}
            sx={{ minWidth: 280, flex: 1 }}
            controlId="approval-flows.search.input"
          />
          <TextField
            select
            size="small"
            label="Status"
            value={strStatus}
            onChange={(objEvent) => setStrStatus(objEvent.target.value)}
            sx={{ minWidth: 160 }}
            controlId="approval-flows.status.select"
          >
            <MenuItem value="ALL">All Status</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="INACTIVE">Inactive</MenuItem>
          </TextField>
        </Box>

        {blnBusy ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <CommonTable<RowRecord>
            columns={lstColumns}
            rows={lstDisplayRows}
            rowIdField="intID"
            showExportOptions
            exportFileName="approval-flows"
            emptyMessage="No approval flows configured yet."
          />
        )}
      </Box>

      <BlockingLoader blnOpen={false} strLabel="Processing..." intZIndex={1400} />

      <Snackbar
        open={objToast.blnOpen}
        autoHideDuration={4000}
        onClose={() => setObjToast((dicPrev) => ({ ...dicPrev, blnOpen: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity={objToast.strSeverity} variant="filled" sx={{ width: "100%" }} onClose={() => setObjToast((dicPrev) => ({ ...dicPrev, blnOpen: false }))}>
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}