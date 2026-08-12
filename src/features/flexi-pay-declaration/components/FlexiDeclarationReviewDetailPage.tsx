"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import ThumbDownAltOutlinedIcon from "@mui/icons-material/ThumbDownAltOutlined";
import ReplyOutlinedIcon from "@mui/icons-material/ReplyOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PublishedWithChangesOutlinedIcon from "@mui/icons-material/PublishedWithChangesOutlined";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Snackbar, Stack, TextField, Typography, Chip } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import BlockingLoader from "@/components/shared/BlockingLoader";
import FileRowActions from "@/components/shared/files/FileRowActions";
import FileUploadButton from "@/components/shared/files/FileUploadButton";
import {
  hrFlexiDeclarationReviewService,
  type FlexiDeclarationContextRecord,
  type FlexiDeclarationLineRecord,
} from "@/features/flexi-pay-declaration/services/flexiPayDeclarationService";
import { openBlobUrlInNewTab } from "@/lib/openBlobUrlInNewTab";

type Props = { intDeclarationID: number };
type ConfirmAction = "return" | "reject" | "lock" | "release" | null;

const objInrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function base64ToObjectUrl(strBase64: string, strMimeType: string): string {
  const strBinary = atob(strBase64);
  const bytArray = new Uint8Array(strBinary.length);
  for (let intIndex = 0; intIndex < strBinary.length; intIndex += 1) {
    bytArray[intIndex] = strBinary.charCodeAt(intIndex);
  }
  return URL.createObjectURL(new Blob([bytArray], { type: strMimeType || "application/octet-stream" }));
}

function formatStatus(strStatus?: string | null) {
  return String(strStatus || "submitted")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (strChar) => strChar.toUpperCase());
}

function getStatusColor(strStatus?: string | null): "default" | "warning" | "success" | "error" {
  const strValue = String(strStatus || "").toLowerCase();
  if (["approved", "locked"].includes(strValue)) return "success";
  if (strValue === "submitted") return "warning";
  if (["returned", "rejected"].includes(strValue)) return "error";
  return "default";
}

export default function FlexiDeclarationReviewDetailPage({ intDeclarationID }: Props) {
  const objRouter = useRouter();
  const [objDetail, setObjDetail] = useState<FlexiDeclarationContextRecord | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [strToast, setStrToast] = useState("");
  const [dicApprovedAmounts, setDicApprovedAmounts] = useState<Record<number, string>>({});
  const [strConfirm, setStrConfirm] = useState<ConfirmAction>(null);
  const [strReason, setStrReason] = useState("");
  const [strDialogError, setStrDialogError] = useState("");
  const [blnApproving, setBlnApproving] = useState(false);
  const [intUploadingComponentID, setIntUploadingComponentID] = useState<number | null>(null);
  const [intBusyComponentID, setIntBusyComponentID] = useState<number | null>(null);

  async function loadData() {
    setBlnLoading(true);
    setStrError("");
    try {
      const objFetched = await hrFlexiDeclarationReviewService.getDetail(intDeclarationID);
      setObjDetail(objFetched);
      setDicApprovedAmounts(
        Object.fromEntries(
          (objFetched.lstDeclarationLines || []).map((objLine) => [
            objLine.intSalaryComponentID,
            String(objLine.decDraftApprovedAnnual ?? objLine.decDraftDeclaredAnnual ?? 0),
          ])
        )
      );
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load flexi declaration detail.");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intDeclarationID]);

  const strWorkflowStatus = String(objDetail?.objDeclaration?.strWorkflowStatus || "").toLowerCase();
  const blnCanApprove = strWorkflowStatus === "submitted";
  const blnCanReturnOrReject = strWorkflowStatus === "submitted";
  const blnCanLock = strWorkflowStatus === "approved";
  const blnCanRelease = strWorkflowStatus === "locked";

  const lstLines = useMemo(() => objDetail?.lstDeclarationLines || [], [objDetail]);

  async function previewProof(intSalaryComponentID: number) {
    try {
      const objPreview = await hrFlexiDeclarationReviewService.previewProof(intDeclarationID, intSalaryComponentID);
      const strUrl = base64ToObjectUrl(objPreview.strBase64Content, objPreview.strMimeType);
      openBlobUrlInNewTab(strUrl);
      window.setTimeout(() => URL.revokeObjectURL(strUrl), 60_000);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to view uploaded proof.");
    }
  }

  async function uploadProof(intSalaryComponentID: number, objFile: File) {
    setIntUploadingComponentID(intSalaryComponentID);
    setStrError("");
    try {
      await hrFlexiDeclarationReviewService.uploadProof(intDeclarationID, intSalaryComponentID, objFile);
      await loadData();
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to upload proof.");
    } finally {
      setIntUploadingComponentID(null);
    }
  }

  async function deleteProof(intSalaryComponentID: number) {
    setIntBusyComponentID(intSalaryComponentID);
    setStrError("");
    try {
      await hrFlexiDeclarationReviewService.deleteProof(intDeclarationID, intSalaryComponentID);
      await loadData();
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to delete proof.");
    } finally {
      setIntBusyComponentID(null);
    }
  }

  async function handleApprove() {
    setBlnApproving(true);
    setStrError("");
    try {
      await hrFlexiDeclarationReviewService.approve(intDeclarationID, {
        lstItems: lstLines.map((objLine) => ({
          intSalaryComponentID: objLine.intSalaryComponentID,
          decApprovedAmountAnnual: Number(dicApprovedAmounts[objLine.intSalaryComponentID] || 0),
        })),
      });
      setStrToast("Declaration approved successfully.");
      await loadData();
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to approve declaration.");
    } finally {
      setBlnApproving(false);
    }
  }

  async function confirmAction() {
    if (!strConfirm) return;
    if (["return", "reject"].includes(strConfirm) && !strReason.trim()) {
      setStrDialogError("Remarks are required.");
      return;
    }
    try {
      if (strConfirm === "return") await hrFlexiDeclarationReviewService.returnForCorrection(intDeclarationID, strReason.trim());
      if (strConfirm === "reject") await hrFlexiDeclarationReviewService.reject(intDeclarationID, strReason.trim());
      if (strConfirm === "lock") await hrFlexiDeclarationReviewService.lock(intDeclarationID, strReason.trim() || undefined);
      if (strConfirm === "release") await hrFlexiDeclarationReviewService.release(intDeclarationID, strReason.trim() || undefined);
      setStrConfirm(null);
      setStrReason("");
      setStrDialogError("");
      setStrToast("Action completed successfully.");
      await loadData();
    } catch (objError) {
      setStrDialogError(objError instanceof Error ? objError.message : "Unable to complete this action.");
    }
  }

  if (blnLoading) return <BlockingLoader blnOpen strLabel="Loading flexi declaration detail..." />;
  if (!objDetail) return <Alert severity="error">{strError || "Declaration not found."}</Alert>;

  const strEmployeeName = objDetail.objEmployeeSummary?.strEmployeeName || "-";
  const strEmployeeCode = objDetail.objEmployeeSummary?.strEmployeeCode || "-";

  return (
    <Stack spacing={1.4}>
      <Paper sx={{ p: 1.35, borderRadius: "8px", border: "1px solid #bbf7d0", backgroundColor: "#f0fdf4", boxShadow: "0 3px 10px rgba(15,23,42,0.04)" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
          <Stack spacing={0.35}>
            <Typography sx={{ fontWeight: 900, color: "#0f172a", fontSize: "1.08rem" }}>{strEmployeeName} ({strEmployeeCode})</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>FY: {objDetail.strFinancialYearCode}</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap justifyContent={{ xs: "flex-start", md: "flex-end" }}>
            <Chip size="small" color={getStatusColor(strWorkflowStatus)} label={formatStatus(strWorkflowStatus)} />
            {blnCanApprove ? (
              <Button size="small" variant="contained" startIcon={<ThumbUpAltOutlinedIcon />} disabled={blnApproving} onClick={() => void handleApprove()} controlId="flexi-declaration.review.approve.button">Approve</Button>
            ) : null}
            {blnCanReturnOrReject ? (
              <Button size="small" variant="outlined" startIcon={<ReplyOutlinedIcon />} onClick={() => setStrConfirm("return")} controlId="flexi-declaration.review.return.button">Return</Button>
            ) : null}
            {blnCanReturnOrReject ? (
              <Button size="small" variant="outlined" color="error" startIcon={<ThumbDownAltOutlinedIcon />} onClick={() => setStrConfirm("reject")} controlId="flexi-declaration.review.reject.button">Reject</Button>
            ) : null}
            {blnCanLock ? (
              <Button size="small" variant="outlined" startIcon={<LockOutlinedIcon />} onClick={() => setStrConfirm("lock")} controlId="flexi-declaration.review.lock.button">Lock</Button>
            ) : null}
            {blnCanRelease ? (
              <Button size="small" variant="outlined" startIcon={<PublishedWithChangesOutlinedIcon />} onClick={() => setStrConfirm("release")} controlId="flexi-declaration.review.release.button">Release</Button>
            ) : null}
            <Button size="small" variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/payroll/flexi-declaration-review")} controlId="flexi-declaration.review-detail.back.button">Back</Button>
          </Stack>
        </Stack>
      </Paper>
      {strError ? <Alert severity="error" onClose={() => setStrError("")}>{strError}</Alert> : null}

      <Stack spacing={1.1}>
        {lstLines.map((objLine: FlexiDeclarationLineRecord) => (
          <Paper key={objLine.intSalaryComponentID} sx={{ p: 1.2, borderRadius: "8px", border: "1px solid #dbe3ef", boxShadow: "0 3px 10px rgba(15,23,42,0.04)" }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.2}>
              <Stack spacing={0.4} sx={{ minWidth: 220 }}>
                <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>{objLine.strComponentName || objLine.strComponentCode}</Typography>
                <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>
                  Declared: {objInrFormatter.format(Number(objLine.decDraftDeclaredAnnual || 0))}
                </Typography>
                {objLine.strDeclarationItemRemarks ? <Typography sx={{ color: "#b45309", fontSize: "0.78rem" }}>{objLine.strDeclarationItemRemarks}</Typography> : null}
              </Stack>
              <Stack spacing={0.6} sx={{ flex: 1, minWidth: 0 }}>
                {blnCanApprove ? (
                  <TextField
                    size="small"
                    label="Approved amount"
                    type="number"
                    value={dicApprovedAmounts[objLine.intSalaryComponentID] ?? "0"}
                    onChange={(e) => setDicApprovedAmounts((current) => ({ ...current, [objLine.intSalaryComponentID]: e.target.value }))}
                    inputProps={{ min: 0, step: "0.01" }}
                    sx={{ maxWidth: 220 }}
                    controlId={`flexi-declaration.review.approved-amount.${objLine.intSalaryComponentID}.input`}
                  />
                ) : null}
                {objLine.blnProofUploaded ? (
                  <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" spacing={0.8} sx={{ border: "1px solid #dbe3ef", borderRadius: "8px", px: 1, py: 0.6 }}>
                    <Typography title={objLine.strProofFileName || ""} sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                      {objLine.strProofFileName || "Proof document"}
                    </Typography>
                    <FileRowActions
                      strFileName={objLine.strProofFileName || "proof"}
                      controlIdPrefix={`flexi-declaration.review.proof.${objLine.intSalaryComponentID}`}
                      busy={intBusyComponentID === objLine.intSalaryComponentID}
                      onPreview={() => void previewProof(objLine.intSalaryComponentID)}
                      onReplace={(objNewFile) => void uploadProof(objLine.intSalaryComponentID, objNewFile)}
                      onDelete={() => void deleteProof(objLine.intSalaryComponentID)}
                      isReplacing={intUploadingComponentID === objLine.intSalaryComponentID}
                    />
                  </Stack>
                ) : (
                  <Box>
                    <FileUploadButton
                      controlId={`flexi-declaration.review.proof.${objLine.intSalaryComponentID}.upload.button`}
                      label="Upload Proof"
                      isUploading={intUploadingComponentID === objLine.intSalaryComponentID}
                      onFilesSelected={(lstSelected) => lstSelected[0] && void uploadProof(objLine.intSalaryComponentID, lstSelected[0])}
                      onValidationError={(strMessage) => setStrError(strMessage)}
                    />
                  </Box>
                )}
              </Stack>
            </Stack>
          </Paper>
        ))}
        {lstLines.length === 0 ? <Alert severity="info">No declaration lines found.</Alert> : null}
      </Stack>

      <Dialog open={Boolean(strConfirm)} onClose={() => setStrConfirm(null)} maxWidth="sm" fullWidth controlId="flexi-declaration.review-detail.confirm.dialog">
        <DialogTitle>Confirm Action</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>Please confirm this action.</Typography>
          {(strConfirm === "return" || strConfirm === "reject") ? (
            <TextField fullWidth size="small" label="Remarks" value={strReason} onChange={(e) => setStrReason(e.target.value)} multiline minRows={3} controlId="flexi-declaration.review-detail.confirm.remarks.input" />
          ) : null}
          {strDialogError ? <Alert severity="error" onClose={() => setStrDialogError("")} sx={{ mt: 1 }}>{strDialogError}</Alert> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStrConfirm(null)} controlId="flexi-declaration.review-detail.confirm.cancel.button">Cancel</Button>
          <Button variant="contained" onClick={() => void confirmAction()} controlId="flexi-declaration.review-detail.confirm.submit.button">Confirm</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(strToast)} autoHideDuration={2200} onClose={() => setStrToast("")} message={strToast} />
    </Stack>
  );
}
