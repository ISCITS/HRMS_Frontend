"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Snackbar, Stack, TextField, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import BlockingLoader from "@/components/shared/BlockingLoader";
import ITDeclarationActionBar from "@/features/it-declaration/components/ITDeclarationActionBar";
import ITDeclarationItemReviewPanel from "@/features/it-declaration/components/ITDeclarationItemReviewPanel";
import ITDeclarationStatusBadge from "@/features/it-declaration/components/ITDeclarationStatusBadge";
import {
  hrItDeclarationReviewService,
  type HrItDeclarationDetailRecord,
  type HrItDeclarationItemRecord,
  type HrItDeclarationProofRecord,
} from "@/features/it-declaration/services/itDeclarationService";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { masterApiService, type EssDeclarationCategoryApiRecord } from "@/services/master/MasterApiService";
import { openBlobUrlInNewTab } from "@/lib/openBlobUrlInNewTab";

type Props = { intDeclarationID: number };
type ConfirmAction = "approve_all" | "reject" | "release" | "lock" | null;
type DeclarationSectionGroup = {
  strSection: string;
  strDescription: string;
  lstItems: HrItDeclarationItemRecord[];
  lstProofs: HrItDeclarationProofRecord[];
  decMaxLimitAmount: number | null;
  strMaxLimitAppliedAt: string;
  decDeclaredAmount: number;
  decApprovedAmount: number;
};

type CategoryRule = {
  strSection: string;
  decMaxLimitAmount: number | null;
  strMaxLimitAppliedAt: string;
  blnProofRequired: boolean;
};

const objInrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function normalizeReviewStatus(strStatus?: string | null) {
  return String(strStatus || "").trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeDeclarationSection(strSection?: string | null) {
  return String(strSection || "")
    .trim()
    .toUpperCase()
    .replace(/^SEC[_\s-]*/, "")
    .replace(/[^A-Z0-9]/g, "");
}

function base64ToObjectUrl(strBase64: string, strMimeType: string): string {
  const strBinary = atob(strBase64);
  const bytArray = new Uint8Array(strBinary.length);
  for (let intIndex = 0; intIndex < strBinary.length; intIndex += 1) {
    bytArray[intIndex] = strBinary.charCodeAt(intIndex);
  }
  return URL.createObjectURL(new Blob([bytArray], { type: strMimeType || "application/octet-stream" }));
}

function parseMaxLimit(objValue: unknown) {
  if (typeof objValue === "number") return Number.isFinite(objValue) ? objValue : null;
  const strDigits = String(objValue || "").replace(/[^0-9.]/g, "");
  const decParsed = Number(strDigits);
  return Number.isFinite(decParsed) ? decParsed : null;
}

function resolveMaxLimitAmount(objRecord: Record<string, unknown>) {
  return parseMaxLimit(
    objRecord.decMaxLimitAmount ??
    objRecord.decMaxLimit ??
    objRecord.strMaxLimitAmount ??
    objRecord.maxLimitAmount ??
    objRecord.max_limit_amount ??
    objRecord.maximum_limit_amount ??
    objRecord.max_limit ??
    objRecord.strMaxLimit
  );
}

function getItemMaxLimit(objItem: HrItDeclarationItemRecord) {
  return objItem.decMaxLimitAmount ?? objItem.decMaxEligibleAmount ?? parseMaxLimit(objItem.strMaxLimit);
}

function normalizeMaxLimitAppliedAt(objValue: unknown) {
  const strValue = String(objValue || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return strValue === "APPROVAL_LEVEL" ? "APPROVAL_LEVEL" : "ENTRY_LEVEL";
}

function resolveBooleanFlag(objValue: unknown, blnDefault = false) {
  if (typeof objValue === "boolean") return objValue;
  if (typeof objValue === "number") return objValue !== 0;
  if (typeof objValue === "string") {
    const strValue = objValue.trim().toLowerCase();
    if (["true", "1", "yes", "y", "active"].includes(strValue)) return true;
    if (["false", "0", "no", "n", "inactive"].includes(strValue)) return false;
  }
  return blnDefault;
}

function resolveCategoryRows(objData: unknown) {
  if (Array.isArray(objData)) return objData;
  if (!objData || typeof objData !== "object") return [];
  const objValue = objData as Record<string, unknown>;
  for (const strKey of ["lstCategories", "lstRecords", "items", "rows", "records", "results", "data", "Data"]) {
    if (Array.isArray(objValue[strKey])) return objValue[strKey];
  }
  return [];
}

function mapCategoryRule(objCategory: EssDeclarationCategoryApiRecord): CategoryRule {
  const objCategoryRecord = objCategory as unknown as Record<string, unknown>;
  const strSection = String(objCategory.strCategoryCode ?? objCategoryRecord.strCode ?? objCategoryRecord.category_code ?? "").trim().toUpperCase();
  const decMaxLimitAmount = resolveMaxLimitAmount(objCategoryRecord);
  return {
    strSection,
    decMaxLimitAmount,
    strMaxLimitAppliedAt: normalizeMaxLimitAppliedAt(objCategory.strMaxLimitAppliedAt ?? objCategoryRecord.strMaximumLimitAppliedAt ?? objCategoryRecord.max_limit_applied_at ?? objCategoryRecord.maximum_limit_applied_at),
    blnProofRequired: resolveBooleanFlag(objCategory.blnProofRequired ?? objCategoryRecord.blnIsProofRequired ?? objCategoryRecord.proof_required),
  };
}

function countItemsByStatus(lstItems: HrItDeclarationItemRecord[], lstStatuses: string[]) {
  const setStatuses = new Set(lstStatuses);
  return lstItems.filter((objItem) => setStatuses.has(normalizeReviewStatus(objItem.strItemStatus))).length;
}

function SectionStat({ strLabel, strValue, strTone = "default" }: { strLabel: string; strValue: string; strTone?: "default" | "success" | "warning" | "danger" }) {
  const dicTone = {
    default: { backgroundColor: "#ffffff", borderColor: "#e2e8f0", color: "#0f172a" },
    success: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0", color: "#166534" },
    warning: { backgroundColor: "#fff7ed", borderColor: "#fed7aa", color: "#9a3412" },
    danger: { backgroundColor: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" },
  }[strTone];
  return (
    <Box sx={{ minWidth: 94, px: 1, py: 0.65, borderRadius: "8px", border: `1px solid ${dicTone.borderColor}`, backgroundColor: dicTone.backgroundColor }}>
      <Typography sx={{ color: "#64748b", fontSize: "0.68rem", fontWeight: 800 }}>{strLabel}</Typography>
      <Typography sx={{ color: dicTone.color, fontSize: "0.9rem", fontWeight: 900 }}>{strValue}</Typography>
    </Box>
  );
}

function SummaryMetric({ strLabel, strValue, objIcon }: { strLabel: string; strValue: string; objIcon: ReactNode }) {
  return (
    <Paper sx={{ p: 1.2, borderRadius: "8px", border: "1px solid #dbe3ef", boxShadow: "0 3px 10px rgba(15,23,42,0.04)", backgroundColor: "#ffffff" }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Stack sx={{ width: 34, height: 34, borderRadius: "8px", backgroundColor: "#eff6ff", color: "#1d4ed8" }} alignItems="center" justifyContent="center">
          {objIcon}
        </Stack>
        <Stack>
          <Typography sx={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 700 }}>{strLabel}</Typography>
          <Typography sx={{ fontSize: "0.98rem", color: "#0f172a", fontWeight: 800 }}>{strValue}</Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}

function formatDetailValue(objValue: unknown) {
  if (objValue == null || objValue === "") return "-";
  if (typeof objValue === "number") return Number.isFinite(objValue) ? objInrFormatter.format(objValue) : "-";
  if (typeof objValue === "boolean") return objValue ? "Yes" : "No";
  if (typeof objValue === "object") return JSON.stringify(objValue);
  return String(objValue);
}

function formatDetailLabel(strKey: string) {
  return strKey
    .replace(/^str|^int|^dec|^bln|^dt/, "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/\b\w/g, (strChar) => strChar.toUpperCase());
}

function DeclarationDetailPanel({ strTitle, objDetails }: { strTitle: string; objDetails: Record<string, unknown> }) {
  const lstEntries = Object.entries(objDetails).filter(([, objValue]) => objValue != null && objValue !== "");
  if (!lstEntries.length) return null;
  return (
    <Paper sx={{ px: 1, py: 1.2, borderRadius: "8px", border: "1px solid #dbe3ef", boxShadow: "0 3px 10px rgba(15,23,42,0.04)", backgroundColor: "#ffffff" }}>
      <Typography sx={{ fontWeight: 900, color: "#0f172a", mb: 1 }}>{strTitle}</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 1 }}>
        {lstEntries.map(([strKey, objValue]) => (
          <Box key={strKey} sx={{ px: 1, py: 0.8, borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
            <Typography sx={{ color: "#64748b", fontSize: "0.72rem", fontWeight: 800 }}>{formatDetailLabel(strKey)}</Typography>
            <Typography sx={{ color: "#0f172a", fontSize: "0.88rem", fontWeight: 800, overflowWrap: "anywhere" }}>{formatDetailValue(objValue)}</Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

export default function ITDeclarationReviewDetailPage({ intDeclarationID }: Props) {
  const objRouter = useRouter();
  const { blnLoading: blnRightsLoading, canDoAny, objRights } = useModuleActionAccess([
    "it_declaration_review",
    "PAYROLL_IT_DECLARATION_REVIEW",
    "PAYROLL_IT_DECLARATION",
  ]);
  const [objDetail, setObjDetail] = useState<HrItDeclarationDetailRecord | null>(null);
  const [lstCategoryRules, setLstCategoryRules] = useState<CategoryRule[] | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [strToast, setStrToast] = useState("");
  const [strReason, setStrReason] = useState("");
  const [strDialogError, setStrDialogError] = useState("");
  const [strConfirm, setStrConfirm] = useState<ConfirmAction>(null);
  const [blnDismissNotFound, setBlnDismissNotFound] = useState(false);
  const [blnDismissNoItems, setBlnDismissNoItems] = useState(false);
  const objHeaderControlSx = {
    height: 34,
    minHeight: 34,
    px: 1.5,
    py: 0.5,
    borderRadius: "8px",
    textTransform: "none",
    fontWeight: 700,
    fontSize: "0.76rem",
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    alignSelf: "stretch",
    "& .MuiButton-startIcon": {
      marginRight: "6px",
    },
    "& .MuiSvgIcon-root": {
      fontSize: "1.1rem",
    },
  } as const;

  function hasPermissionCode(strCode: string) {
    const strNormalized = strCode.trim().toUpperCase();
    return Object.entries(objRights.dicAllowedActions || {}).some(([strModuleCode, lstActions]) =>
      strModuleCode.trim().toUpperCase() === strNormalized ||
      lstActions.some((strAction) => strAction.trim().toUpperCase() === strNormalized)
    );
  }

  const blnCanApprove = canDoAny("approve") || hasPermissionCode("PAYROLL_IT_DECLARATION_APPROVE");
  const blnCanReject = canDoAny("reject") || hasPermissionCode("PAYROLL_IT_DECLARATION_REJECT") || blnCanApprove;
  const blnCanReview = canDoAny("review") || canDoAny("edit") || hasPermissionCode("PAYROLL_IT_DECLARATION_REVIEW");
  const blnCanRelease = canDoAny("release") || hasPermissionCode("PAYROLL_IT_DECLARATION_RELEASE");
  const blnCanLock = canDoAny("lock") || hasPermissionCode("PAYROLL_IT_DECLARATION_LOCK");
  const strDeclarationStatus = String(objDetail?.strStatus || "").toLowerCase();
  const blnLocked = Boolean(objDetail?.blnLocked || objDetail?.strStatus?.toLowerCase() === "locked");
  const blnReviewEditable = ["under_review"].includes(strDeclarationStatus);
  const blnSubmittedPendingReview = strDeclarationStatus === "submitted";
  const blnDraftPendingReview = strDeclarationStatus === "draft";
  const blnItemActionsAllowedStatus = blnReviewEditable || blnSubmittedPendingReview || blnDraftPendingReview;
  const blnCanApproveHeader = !blnLocked && blnCanApprove;
  const blnCanRejectHeader = !blnLocked && blnCanReject;
  const blnCanReleaseHeader = !blnLocked && (blnCanRelease || blnCanReview);
  const blnCanLockHeader = !blnLocked && (blnCanLock || blnCanReview) && ["approved", "partially_approved"].includes(strDeclarationStatus);

  async function loadData() {
    setBlnLoading(true);
    setStrError("");
    try {
      const [objFetched, lstRules] = await Promise.all([
        hrItDeclarationReviewService.getDetail(intDeclarationID),
        loadCategoryRules(),
      ]);
      setObjDetail(objFetched);
      setLstCategoryRules(lstRules);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load declaration detail.");
    } finally {
      setBlnLoading(false);
    }
  }

  async function loadCategoryRules() {
    const lstActionFallbacks = [
      "MASTER_ESS_DECLARATION_CATEGORY_LIST",
      "MASTER_TAX_DECLARATION_COMPONENT_LIST",
      "TAX_DECLARATION_COMPONENT_LIST",
      "TAX_DECLARATION_COMPONENT_VIEW",
      "ESS_IT_DECLARATION_VIEW",
    ];
    const lstAttempts: Array<{ strSource: "ess" | "tax"; strMenuAction: string }> = [
      ...lstActionFallbacks.map((strMenuAction) => ({ strSource: "ess" as const, strMenuAction })),
      ...lstActionFallbacks.map((strMenuAction) => ({ strSource: "tax" as const, strMenuAction })),
    ];
    for (const dicAttempt of lstAttempts) {
      try {
        const objResult = dicAttempt.strSource === "tax"
          ? await masterApiService.getTaxDeclarationComponents(dicAttempt.strMenuAction)
          : await masterApiService.getEssDeclarationCategoriesWithAction(dicAttempt.strMenuAction);
        const lstRows = resolveCategoryRows(objResult.Data);
        if (lstRows.length > 0) {
          return lstRows
            .filter((objRecord) => resolveBooleanFlag((objRecord as Record<string, unknown>).blnIsActive ?? (objRecord as Record<string, unknown>).is_active, true))
            .map((objRecord) => mapCategoryRule(objRecord as EssDeclarationCategoryApiRecord))
            .filter((objRule) => objRule.strSection);
        }
      } catch {
        continue;
      }
    }
    return null;
  }

  useEffect(() => {
    if (blnRightsLoading) return;
    void loadData();
  }, [blnRightsLoading, intDeclarationID]);

  async function handleItemAction(intItemID: number, strAction: "approve" | "reject", objPayload?: { strRemarks?: string; decApprovedAmount?: number }) {
    if (!intItemID) return;
    if (blnLocked) {
      setStrError("Locked declaration cannot be modified.");
      return;
    }
    if (!blnItemActionsAllowedStatus) {
      setStrError("Item actions are not allowed in the current declaration status.");
      return;
    }
    if (blnSubmittedPendingReview || blnDraftPendingReview) {
      try {
        await hrItDeclarationReviewService.startReview(intDeclarationID);
        await loadData();
      } catch (objError) {
        setStrError(objError instanceof Error ? objError.message : "Unable to start review.");
        return;
      }
    }
    if (strAction === "reject" && !objPayload?.strRemarks) {
      setStrError("Remarks are required.");
      return;
    }
    try {
      await hrItDeclarationReviewService.reviewItem(intDeclarationID, intItemID, strAction, objPayload);
      setStrToast("Action completed successfully.");
      await loadData();
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to complete item action.");
    }
  }

  async function previewProof(intProofID: number) {
    if (!objDetail) return;
    try {
      const objPreview = await hrItDeclarationReviewService.previewProofByID(objDetail.intDeclarationID, intProofID);
      const strUrl = base64ToObjectUrl(objPreview.strBase64Content, objPreview.strMimeType);
      openBlobUrlInNewTab(strUrl);
      window.setTimeout(() => URL.revokeObjectURL(strUrl), 60_000);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to view uploaded proof.");
    }
  }

  async function uploadProof(intItemID: number, objFile: File) {
    if (!objDetail) return;
    await hrItDeclarationReviewService.uploadProof(objDetail.intDeclarationID, intItemID, objFile);
    await loadData();
  }

  async function replaceProof(intItemID: number, intProofID: number, objFile: File) {
    if (!objDetail) return;
    await hrItDeclarationReviewService.uploadProof(objDetail.intDeclarationID, intItemID, objFile);
    await hrItDeclarationReviewService.deleteProofByID(objDetail.intDeclarationID, intItemID, intProofID);
    await loadData();
  }

  async function deleteProof(intItemID: number, intProofID: number) {
    if (!objDetail) return;
    await hrItDeclarationReviewService.deleteProofByID(objDetail.intDeclarationID, intItemID, intProofID);
    await loadData();
  }

  async function confirmAction() {
    if (!objDetail || !strConfirm) return;
    if (["reject", "release"].includes(strConfirm) && !strReason.trim()) {
      setStrDialogError("Remarks are required.");
      return;
    }
    try {
      if (["approve_all", "reject"].includes(strConfirm) && ["draft", "submitted"].includes(strDeclarationStatus)) {
        await hrItDeclarationReviewService.startReview(objDetail.intDeclarationID);
      }
      if (strConfirm === "approve_all") await hrItDeclarationReviewService.reviewHeader(objDetail.intDeclarationID, "approve");
      if (strConfirm === "reject") await hrItDeclarationReviewService.reviewHeader(objDetail.intDeclarationID, "reject", { strRemarks: strReason.trim() });
      if (strConfirm === "release") await hrItDeclarationReviewService.release(objDetail.intDeclarationID, { strRemarks: strReason.trim() });
      if (strConfirm === "lock") await hrItDeclarationReviewService.lock(objDetail.intDeclarationID, { strRemarks: strReason.trim() || undefined });
      setStrConfirm(null);
      setStrReason("");
      setStrDialogError("");
      setStrToast("Action completed successfully.");
      await loadData();
    } catch (objError) {
      setStrDialogError(objError instanceof Error ? objError.message : "Unable to complete this action.");
    }
  }

  const lstProofs = useMemo(() => objDetail?.lstProofs || [], [objDetail]);
  const dicCategoryRuleBySection = useMemo(
    () => new Map((lstCategoryRules ?? []).map((objRule) => [normalizeDeclarationSection(objRule.strSection), objRule])),
    [lstCategoryRules]
  );
  const lstItems = useMemo(
    // Note: intentionally not filtering by lstCategoryRules here - that list is
    // sourced from a separate ESS category master whose code doesn't reliably
    // correspond to an item's section code (e.g. HRA's category_code "HRA" vs
    // its section_code "10(13A)"), so using it as an inclusion filter silently
    // dropped legitimately declared/approved items from this review screen.
    // lstCategoryRules is still used below for max-limit lookups.
    () => (objDetail?.lstItems || []).filter((objItem) => Number(objItem.decDeclaredAmount || 0) > 0),
    [objDetail]
  );
  const lstSectionGroups = useMemo<DeclarationSectionGroup[]>(() => {
    const dicGroups = new Map<string, DeclarationSectionGroup>();
    for (const objItem of lstItems) {
      const strSection = objItem.strSection || "Other";
      const objRule = dicCategoryRuleBySection.get(normalizeDeclarationSection(strSection));
      const strItemDescription = objItem.strDescription || "";
      const strDescription = strItemDescription.toLowerCase().includes(strSection.toLowerCase()) || strItemDescription.toLowerCase().includes("section")
        ? strItemDescription
        : "";
      const strKey = strSection;
      const objExisting = dicGroups.get(strKey) ?? {
        strSection,
        strDescription,
        lstItems: [],
        lstProofs: [],
        decMaxLimitAmount: null,
        strMaxLimitAppliedAt: "ENTRY_LEVEL",
        decDeclaredAmount: 0,
        decApprovedAmount: 0,
      };
      objExisting.decMaxLimitAmount = objExisting.decMaxLimitAmount ?? objRule?.decMaxLimitAmount ?? getItemMaxLimit(objItem) ?? null;
      objExisting.strMaxLimitAppliedAt = normalizeMaxLimitAppliedAt(objRule?.strMaxLimitAppliedAt ?? objItem.strMaxLimitAppliedAt);
      const lstItemProofs = lstProofs.filter((objProof) => objProof.intItemID === objItem.intItemID);
      objExisting.lstItems.push(objItem);
      objExisting.lstProofs.push(...lstItemProofs);
      objExisting.decDeclaredAmount += Number(objItem.decDeclaredAmount || 0);
      objExisting.decApprovedAmount += Number(objItem.decApprovedAmount || 0);
      dicGroups.set(strKey, objExisting);
    }
    return Array.from(dicGroups.values());
  }, [lstItems, lstProofs, dicCategoryRuleBySection]);

  if (blnLoading || blnRightsLoading) return <BlockingLoader blnOpen strLabel="Loading IT declaration detail..." />;
  if (!objDetail) return blnDismissNotFound ? null : <Alert severity="error" onClose={() => setBlnDismissNotFound(true)}>{strError || "Declaration not found."}</Alert>;

  return (
    <Stack spacing={1.4}>
      <Paper sx={{ p: 1.35, borderRadius: "8px", border: "1px solid #bbf7d0", backgroundColor: "#f0fdf4", boxShadow: "0 3px 10px rgba(15,23,42,0.04)" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
          <Stack spacing={0.35}>
            <Typography sx={{ fontWeight: 900, color: "#0f172a", fontSize: "1.08rem" }}>{objDetail.strEmployeeName} ({objDetail.strEmployeeCode})</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
              FY: {objDetail.strFinancialYearCode} | Regime: {objDetail.strTaxRegime} | Declaration Ref: {objDetail.strDeclarationCode || "-"}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: "flex-start", md: "flex-end" }} flexWrap="wrap" useFlexGap>
            <Stack direction="row" spacing={1} alignItems="center">
              <ITDeclarationStatusBadge strStatus={objDetail.strStatus} />
            </Stack>
            <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" justifyContent={{ xs: "flex-start", md: "flex-end" }} alignItems="stretch">
              <ITDeclarationActionBar
                blnLocked={blnLocked}
                blnCanRelease={blnCanReleaseHeader}
                blnCanLock={blnCanLockHeader}
                blnCanApprove={blnCanApproveHeader}
                blnCanReject={blnCanRejectHeader}
                fnApproveAll={() => setStrConfirm("approve_all")}
                fnRejectHeader={() => setStrConfirm("reject")}
                fnRelease={() => setStrConfirm("release")}
                fnLock={() => setStrConfirm("lock")}
              />
            </Stack>
            <Button size="small" variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/payroll/it-declaration-review")} controlId="it-declaration.review-detail.back.button" sx={objHeaderControlSx}>Back</Button>
          </Stack>
        </Stack>
      </Paper>
      {strError ? <Alert severity="error" onClose={() => setStrError("")}>{strError}</Alert> : null}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }, gap: 1.1 }}>
        <SummaryMetric strLabel="Total Declared Amount" strValue={objInrFormatter.format(Number(objDetail.decDeclaredTotalAmount || 0))} objIcon={<ReceiptLongOutlinedIcon fontSize="small" />} />
        <SummaryMetric strLabel="Total Approved Amount" strValue={objInrFormatter.format(Number(objDetail.decApprovedTotalAmount || 0))} objIcon={<PaymentsOutlinedIcon fontSize="small" />} />
        <SummaryMetric strLabel="Proof Pending" strValue={`${objDetail.intProofPendingCount || 0}`} objIcon={<FactCheckOutlinedIcon fontSize="small" />} />
        <SummaryMetric strLabel="Total Declaration Items" strValue={`${lstItems.length}`} objIcon={<AccountBalanceWalletOutlinedIcon fontSize="small" />} />
      </Box>

      <Stack spacing={1.1}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={1}>
          <Box>
            <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>Deduction Review ({lstItems.length} items)</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{lstSectionGroups.length} deduction sections with declared rows and proof actions.</Typography>
          </Box>
        </Stack>

        {lstSectionGroups.map((objGroup) => {
          const intApprovedCount = countItemsByStatus(objGroup.lstItems, ["approved"]);
          const intRejectedCount = countItemsByStatus(objGroup.lstItems, ["rejected"]);
          const intProofPendingCount = countItemsByStatus(objGroup.lstItems, ["proof_pending"]);
          const intPendingCount = objGroup.lstItems.length - intApprovedCount - intRejectedCount - intProofPendingCount;
          return (
          <Paper key={`${objGroup.strSection}-${objGroup.strDescription}`} sx={{ border: "1px solid #fed7aa", borderRadius: "8px", overflow: "hidden", boxShadow: "0 3px 10px rgba(15,23,42,0.04)", backgroundColor: "#ffffff" }}>
            <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" spacing={1.2} sx={{ px: 1.2, py: 1, backgroundColor: "#fff7ed", borderBottom: "1px solid #fdba74" }}>
              <Box sx={{ minWidth: 220 }}>
                <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>{objGroup.strDescription ? `${objGroup.strSection} - ${objGroup.strDescription}` : objGroup.strSection}</Typography>
                <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>{objGroup.lstItems.length} declared row{objGroup.lstItems.length === 1 ? "" : "s"} | {objGroup.lstProofs.length} uploaded proof{objGroup.lstProofs.length === 1 ? "" : "s"}</Typography>
              </Box>
              <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" justifyContent={{ xs: "flex-start", lg: "flex-end" }}>
                <SectionStat strLabel="Declared" strValue={objInrFormatter.format(objGroup.decDeclaredAmount)} />
                {objGroup.decMaxLimitAmount != null ? <SectionStat strLabel="Max Limit" strValue={objInrFormatter.format(objGroup.decMaxLimitAmount)} /> : null}
                <SectionStat strLabel="Approved" strValue={objInrFormatter.format(objGroup.decApprovedAmount)} strTone={objGroup.decApprovedAmount > 0 ? "success" : "default"} />
                <SectionStat strLabel="Pending" strValue={`${Math.max(0, intPendingCount)}`} strTone={intPendingCount > 0 ? "warning" : "default"} />
                <SectionStat strLabel="Proof Pending" strValue={`${intProofPendingCount}`} strTone={intProofPendingCount > 0 ? "warning" : "default"} />
                <SectionStat strLabel="Rejected" strValue={`${intRejectedCount}`} strTone={intRejectedCount > 0 ? "danger" : "default"} />
              </Stack>
            </Stack>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                gap: 1.3,
                p: 1,
                alignItems: "stretch",
              }}
            >
              {objGroup.lstItems.map((objItem, intIndex) => {
                const intCurrentItemID = objItem.intItemID ?? 0;
                const lstItemProofs = lstProofs.filter((objProof) => objProof.intItemID === intCurrentItemID);
                const objItemWithSectionRule = {
                  ...objItem,
                  decMaxLimitAmount: objGroup.decMaxLimitAmount ?? objItem.decMaxLimitAmount ?? objItem.decMaxEligibleAmount,
                  strMaxLimitAppliedAt: objGroup.strMaxLimitAppliedAt ?? objItem.strMaxLimitAppliedAt,
                  blnProofRequired: dicCategoryRuleBySection.get(normalizeDeclarationSection(objItem.strSection))?.blnProofRequired ?? objItem.blnProofRequired,
                };
                return (
                  <ITDeclarationItemReviewPanel
                    key={objItem.intItemID ?? `it-item-${intIndex}-${objItem.strSection}-${objItem.strInvestmentName}`}
                    objItem={objItemWithSectionRule}
                    blnLocked={blnLocked || !blnItemActionsAllowedStatus}
                    blnCanApprove={blnCanApprove}
                    blnCanReject={blnCanReject}
                    lstProofs={lstItemProofs}
                    decSectionMaxLimit={objGroup.decMaxLimitAmount}
                    decOtherApprovedAmount={Math.max(0, objGroup.decApprovedAmount - Number(objItem.decApprovedAmount || 0))}
                    fnPreviewProof={(intProofID) => void previewProof(intProofID)}
                    fnUploadProof={(objFile) => uploadProof(intCurrentItemID, objFile)}
                    fnReplaceProof={(intProofID, objFile) => replaceProof(intCurrentItemID, intProofID, objFile)}
                    fnDeleteProof={(intProofID) => deleteProof(intCurrentItemID, intProofID)}
                    fnAction={(strAction, objPayload) => handleItemAction(objItem.intItemID ?? 0, strAction, objPayload)}
                  />
                );
              })}
            </Box>
          </Paper>
          );
        })}
        {lstItems.length === 0 && !blnDismissNoItems ? <Alert severity="info" onClose={() => setBlnDismissNoItems(true)}>No declaration items found.</Alert> : null}
      </Stack>

      {objDetail.objHraDetails ? <DeclarationDetailPanel strTitle="HRA Details" objDetails={objDetail.objHraDetails} /> : null}
      {objDetail.objHomeLoanDetails ? <DeclarationDetailPanel strTitle="Home Loan Details" objDetails={objDetail.objHomeLoanDetails} /> : null}
      {objDetail.objPreviousEmployerDetails ? <DeclarationDetailPanel strTitle="Previous Employer Details" objDetails={objDetail.objPreviousEmployerDetails} /> : null}

      <Dialog open={Boolean(strConfirm)} onClose={() => setStrConfirm(null)} maxWidth="sm" fullWidth controlId="it-declaration.review-detail.confirm.dialog">
        <DialogTitle>Confirm Action</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>Please confirm this action.</Typography>
          {(strConfirm === "reject" || strConfirm === "release") ? (
            <TextField fullWidth size="small" label="Remarks" value={strReason} onChange={(e) => setStrReason(e.target.value)} multiline minRows={3} controlId="it-declaration.review-detail.confirm.remarks.input" />
          ) : null}
          {strDialogError ? <Alert severity="error" onClose={() => setStrDialogError("")} sx={{ mt: 1 }}>{strDialogError}</Alert> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStrConfirm(null)} controlId="it-declaration.review-detail.confirm.cancel.button">Cancel</Button>
          <Button variant="contained" onClick={() => void confirmAction()} controlId="it-declaration.review-detail.confirm.submit.button">Confirm</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(strToast)} autoHideDuration={2200} onClose={() => setStrToast("")} message={strToast} />
    </Stack>
  );
}
