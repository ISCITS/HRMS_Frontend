"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import NoteAddRoundedIcon from "@mui/icons-material/NoteAddRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { Alert, Box, Button, CircularProgress, Stack, Tooltip, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DetailPageHeader } from "@/components/master/MasterListUi";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { CancelSeparationDialog, SeparationHistoryList } from "@/features/employeeSeparation/components/SeparationDialogs";
import { SeparationFnfStatusBadge, SeparationStatusBadge } from "@/features/employeeSeparation/components/SeparationStatusBadge";
import { useSeparationRights } from "@/features/employeeSeparation/hooks/useSeparationRights";
import { employeeSeparationService } from "@/features/employeeSeparation/services/employeeSeparationService";
import type { SeparationDetail } from "@/features/employeeSeparation/types";
import { formatDisplayDate, formatDisplayDateTime } from "@/features/employeeSeparation/utils";
import { useFNFRights } from "@/features/payroll/hooks/useFNFRights";

const STR_ROUTE = "/employee-separations";

function Field({ strLabel, children }: { strLabel: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography sx={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 600 }}>{strLabel}</Typography>
      <Box sx={{ color: "#0f172a", fontSize: "0.92rem", mt: 0.25 }}>{children || "-"}</Box>
    </Box>
  );
}

function Section({ strTitle, children }: { strTitle: string; children: React.ReactNode }) {
  return (
    <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, p: 2 }}>
      <Typography component="h3" sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>{strTitle}</Typography>
      {children}
    </Box>
  );
}

const dicGridSx = { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2 };

export default function EmployeeSeparationDetailPage({ strSeparationID }: { strSeparationID: string }) {
  const objRouter = useRouter();
  const { blnLoading: blnRightsLoading, can, canView } = useSeparationRights();
  const objFnfRights = useFNFRights();
  const [objDetail, setObjDetail] = useState<SeparationDetail | null>(null);
  const [strError, setStrError] = useState("");
  const [blnCancelOpen, setBlnCancelOpen] = useState(false);

  function load() {
    setStrError("");
    employeeSeparationService.getSeparation(strSeparationID)
      .then(setObjDetail)
      .catch((objError) => setStrError(objError instanceof Error ? objError.message : "Unable to load the separation."));
  }

  useEffect(() => { if (!blnRightsLoading && canView()) load(); }, [strSeparationID, blnRightsLoading]);

  const objSettlement = objDetail?.objSettlement;
  const blnCanCreateFnf = objFnfRights.can("add") && Boolean(objDetail?.blnCanCreateFNF);

  return (
    <Box className={styles.page} data-controlid="employee-separations.detail.page">
      <DetailPageHeader
        strSection="Employee Services"
        strListTitle="Employee Separation"
        strListHref={STR_ROUTE}
        strCurrent={objDetail ? `${objDetail.strEmployeeCode} - ${objDetail.strEmployeeName}` : "View"}
        objCurrentAdornment={objDetail ? <SeparationStatusBadge strStatus={objDetail.strActionStatus} /> : undefined}
        lstNotices={[{ strKey: "error", strSeverity: "error", objMessage: strError, fnDismiss: () => setStrError("") }]}
      >
        <Button className={styles.secondaryButton} variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push(STR_ROUTE)} controlId="employee-separations.detail.back.button">Back</Button>
        {objDetail && objSettlement?.strRecordUUID ? (
          <Button variant="outlined" startIcon={<OpenInNewRoundedIcon />} disabled={!(objFnfRights.canView() || objFnfRights.can("edit"))} onClick={() => objRouter.push(`/payroll/fnf-settlements/${objSettlement.strRecordUUID}`)} controlId="employee-separations.detail.open-fnf.button">Open F&amp;F</Button>
        ) : null}
        {objDetail && !objSettlement ? (
          <Tooltip title={blnCanCreateFnf ? "Opens the F&F wizard with this employee selected" : objDetail.strActionStatus !== "ACTIVATED" ? `Separation is ${objDetail.strActionStatusLabel.toLowerCase()}` : "No right to create F&F settlements"} arrow>
            <span><Button className={styles.primaryButton} startIcon={<NoteAddRoundedIcon />} disabled={!blnCanCreateFnf} onClick={() => objRouter.push(`/payroll/fnf-settlements/new?employee_id=${objDetail.intEmployeeID}`)} controlId="employee-separations.detail.create-fnf.button">Create F&amp;F</Button></span>
          </Tooltip>
        ) : null}
        {objDetail && can("cancel") ? (
          <Tooltip title={objDetail.blnCanCancel ? "Cancel this separation" : objDetail.strCancelBlockedReason || "Cannot be cancelled"} arrow>
            <span><Button color="error" variant="outlined" startIcon={<BlockRoundedIcon />} disabled={!objDetail.blnCanCancel} onClick={() => setBlnCancelOpen(true)} controlId="employee-separations.detail.cancel.button">Cancel Separation</Button></span>
          </Tooltip>
        ) : null}
      </DetailPageHeader>

      {!blnRightsLoading && !canView() ? <Alert severity="warning">Employee Separation access is not available for your user group.</Alert> : null}
      {!objDetail && !strError && canView() ? <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box> : null}

      {objDetail ? (
        <Box className={styles.tableCard} sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Section strTitle="Employee">
              <Box sx={dicGridSx}>
                <Field strLabel="Employee">{`${objDetail.strEmployeeCode} - ${objDetail.strEmployeeName}`}</Field>
                <Field strLabel="Unit">{objDetail.strLocationName}</Field>
                <Field strLabel="Department">{objDetail.strDepartmentName}</Field>
                <Field strLabel="Date of joining">{formatDisplayDate(objDetail.dtDateOfJoining)}</Field>
                {/* Employment status is the master's; separation never changes it. */}
                <Field strLabel="Employment status">{objDetail.strEmploymentStatus}</Field>
                <Field strLabel="Payroll processing">{objDetail.strPayrollProcessingStatus === "FNF_ACTIVATED" ? "F&F activated" : "Regular"}</Field>
              </Box>
            </Section>
            <Section strTitle="Separation">
              <Box sx={dicGridSx}>
                <Field strLabel="Separation type">{objDetail.strSeparationTypeLabel}</Field>
                <Field strLabel="Reason">{objDetail.strSeparationReason}</Field>
                <Field strLabel="Resignation date">{formatDisplayDate(objDetail.dtResignationDate)}</Field>
                <Field strLabel="Last working date">{formatDisplayDate(objDetail.dtLastWorkingDate)}</Field>
                <Field strLabel="Activated on">{formatDisplayDateTime(objDetail.dtActivatedOn)}</Field>
                <Field strLabel="Separation status"><SeparationStatusBadge strStatus={objDetail.strActionStatus} /></Field>
                <Field strLabel="Remarks">{objDetail.strRemarks}</Field>
                {objDetail.strActionStatus === "CANCELLED" ? (
                  <Field strLabel="Cancelled">{`${formatDisplayDateTime(objDetail.dtCancelledOn)} - ${objDetail.strCancellationReason ?? ""}`}</Field>
                ) : null}
              </Box>
            </Section>
            <Section strTitle="Payroll impact">
              <Box sx={dicGridSx}>
                <Field strLabel="Policy applied">{objDetail.strExclusionPolicyLabel}{objDetail.objPolicySnapshot?.blnOverridden ? " (HR override)" : ""}</Field>
                <Field strLabel="Regular payroll excluded from">{objDetail.strExclusionFromMonthLabel}</Field>
                <Field strLabel="F&F status"><SeparationFnfStatusBadge strStatus={objDetail.strFnfStatus} /></Field>
                <Field strLabel="F&F settlement">{objSettlement ? objSettlement.strSettlementNumber || `#${objSettlement.intID}` : "Not created"}</Field>
              </Box>
            </Section>
            <Section strTitle="History">
              <SeparationHistoryList lstHistory={objDetail.lstHistory} />
            </Section>
          </Stack>
        </Box>
      ) : null}

      <CancelSeparationDialog
        strSeparationID={blnCancelOpen && objDetail ? objDetail.strRecordUUID : null}
        strEmployeeLabel={objDetail ? `${objDetail.strEmployeeCode} - ${objDetail.strEmployeeName} (LWD ${formatDisplayDate(objDetail.dtLastWorkingDate)})` : ""}
        onClose={(blnChanged) => { setBlnCancelOpen(false); if (blnChanged) load(); }}
      />
    </Box>
  );
}
