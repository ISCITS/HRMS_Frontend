"use client";

import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import KeyboardDoubleArrowDownRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowDownRounded";
import KeyboardDoubleArrowUpRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowUpRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import ViewListRoundedIcon from "@mui/icons-material/ViewListRounded";
import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, MenuItem, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { type InputHTMLAttributes, type ReactNode, useEffect, useMemo, useState } from "react";

import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { normalizeAccessScope } from "@/features/security/utils/accessScope";
import { authHelpers } from "@/lib/auth";
import type { SecurityActionRight, SecurityMenuNode, UserGroupRightSaveItem } from "@/models/SecurityModels";

const objEmptyStateText = {
  en: { title: "No matching rights nodes", subtitle: "Adjust the search filter to continue." },
  hi: {
    title: "\u0915\u094b\u0908 \u092e\u0947\u0932 \u0916\u093e\u0924\u0947 \u0905\u0927\u093f\u0915\u093e\u0930 \u0928\u0939\u0940\u0902 \u092e\u093f\u0932\u0947",
    subtitle: "\u091c\u093e\u0930\u0940 \u0930\u0916\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0916\u094b\u091c \u095e\u093f\u0932\u094d\u091f\u0930 \u092c\u0926\u0932\u0947\u0902\u0964",
  },
} as const;

type UserGroupRightsEditorProps = {
  lstNodes: SecurityMenuNode[];
  blnReadOnly?: boolean;
  blnEmbedded?: boolean;
  onChange: (lstNodes: SecurityMenuNode[]) => void;
};

function normalizeRightsMenuName(objNode: SecurityMenuNode): string {
  const strRoute = (objNode.strRoutePath ?? "").toLowerCase();
  const strMenuCode = objNode.strMenuCode.toLowerCase();
  const strMenuName = objNode.strMenuName;
  if (strRoute.includes("/ess/my-payslip") || strRoute.includes("/ess/my-payslips")) return "Payslips";
  if (strRoute.includes("/hr/it-declaration") || strRoute.includes("/salary/ess-declarations") || strRoute.includes("/salary/it-declaration")) return "IT Declaration";
  if (strRoute.includes("/payroll-cycles") || strRoute.includes("/payroll/cycles")) return strMenuName || "Payroll Schedules";
  if (strRoute.includes("/payroll/runs")) return "Payroll Runs";
  if (strRoute.includes("/payroll/employee-payroll-inputs") || strRoute.includes("/payroll/employee-payroll-input") || strRoute.includes("/payroll/inputs") || strMenuCode.includes("employee_payroll_input")) return "Payroll Input";
  if (strRoute.includes("/payroll/results") || strMenuCode.includes("payroll_result")) return strMenuName || "Payroll Results";
  if (strRoute.includes("/payroll/statutory-rules")) return "Statutory Rules";
  if (strRoute.includes("/payroll/process-log") || strRoute.includes("/payroll-process-logs")) return "Payroll Process Logs";
  if (strRoute.includes("/reports/payroll-register") || strMenuCode.includes("payroll_register")) return "Payroll Register";
  if (strRoute.includes("/reports/salary-register") || strMenuCode.includes("salary_register")) return "Salary Register";
  if (strRoute.includes("/reports/salary-statement") || strMenuCode.includes("salary_statement")) return "Salary Statement";
  if (strRoute.includes("/reports/bank-file") || strMenuCode.includes("bank_file")) return "Bank File";
  if (strRoute.includes("/reports/statutory") || strMenuCode.includes("statutory_report")) return "Statutory Reports";
  if (strRoute.includes("/reports/variable-pay-register") || strMenuCode.includes("variable_pay_register")) return "Variable Pay Register";
  return strMenuName;
}

function collectMenuIDs(lstMenuNodes: SecurityMenuNode[]): number[] {
  return lstMenuNodes.flatMap((objNode) => [objNode.intMenuID, ...collectMenuIDs(objNode.lstChildren)]);
}

function flattenRights(lstMenuNodes: SecurityMenuNode[]): UserGroupRightSaveItem[] {
  return lstMenuNodes.flatMap((objNode) => [
    ...objNode.lstActions.map((objAction) => ({
      intMenuID: objNode.intMenuID,
      intActionID: objAction.intActionID,
      blnIsAllowed: objAction.blnIsAllowed,
      strAccessScope: normalizeAccessScope(objAction.strAccessScope),
      objPolicyJson: objAction.objPolicyJson,
    })),
    ...flattenRights(objNode.lstChildren),
  ]);
}

export function serializeRights(lstMenuNodes: SecurityMenuNode[]): UserGroupRightSaveItem[] {
  const setSeen = new Set<string>();
  return flattenRights(lstMenuNodes).filter((objRight) => {
    if (!objRight.blnIsAllowed) return false;
    const strKey = `${objRight.intMenuID}-${objRight.intActionID}`;
    if (setSeen.has(strKey)) return false;
    setSeen.add(strKey);
    return true;
  });
}

export function clearMenuTreeRights(lstMenuNodes: SecurityMenuNode[]): SecurityMenuNode[] {
  return lstMenuNodes.map((objNode) => ({
    ...objNode,
    blnIsAllowed: false,
    lstActions: objNode.lstActions.map((objAction) => ({ ...objAction, blnIsAllowed: false, strAccessScope: "none", objPolicyJson: null })),
    lstChildren: clearMenuTreeRights(objNode.lstChildren),
  }));
}

function filterNodes(lstMenuNodes: SecurityMenuNode[], strSearch: string): SecurityMenuNode[] {
  if (!strSearch.trim()) return lstMenuNodes;
  const strNeedle = strSearch.trim().toLowerCase();
  return lstMenuNodes
    .map((objNode) => {
      const lstChildren = filterNodes(objNode.lstChildren, strNeedle);
      const blnMenuMatch = objNode.strMenuName.toLowerCase().includes(strNeedle) || objNode.strMenuCode.toLowerCase().includes(strNeedle);
      const blnActionMatch = objNode.lstActions.some((objAction) => objAction.strActionName.toLowerCase().includes(strNeedle) || objAction.strActionCode.toLowerCase().includes(strNeedle));
      return blnMenuMatch || blnActionMatch || lstChildren.length > 0 ? { ...objNode, lstChildren } : null;
    })
    .filter((objNode): objNode is SecurityMenuNode => objNode !== null);
}

function mutateNodeTree(objNode: SecurityMenuNode, blnIsAllowed: boolean): SecurityMenuNode {
  return {
    ...objNode,
    blnIsAllowed,
    lstActions: objNode.lstActions.map((objAction) => ({
      ...objAction,
      blnIsAllowed,
      strAccessScope: blnIsAllowed && normalizeAccessScope(objAction.strAccessScope) === "none" ? "self" : blnIsAllowed ? normalizeAccessScope(objAction.strAccessScope) : "none",
    })),
    lstChildren: objNode.lstChildren.map((objChild) => mutateNodeTree(objChild, blnIsAllowed)),
  };
}

function mapNodeDeep(lstMenuNodes: SecurityMenuNode[], intMenuID: number, fnMutateNode: (objNode: SecurityMenuNode) => SecurityMenuNode): SecurityMenuNode[] {
  return lstMenuNodes.map((objNode) => objNode.intMenuID === intMenuID ? fnMutateNode(objNode) : { ...objNode, lstChildren: mapNodeDeep(objNode.lstChildren, intMenuID, fnMutateNode) });
}

function syncNodeAllowedFromRights(objNode: SecurityMenuNode): SecurityMenuNode {
  const lstChildren = objNode.lstChildren.map(syncNodeAllowedFromRights);
  if (objNode.lstActions.length === 0 && lstChildren.length === 0) {
    return { ...objNode, lstChildren };
  }
  const blnIsAllowed = objNode.lstActions.some((objAction) => objAction.blnIsAllowed) || lstChildren.some((objChild) => objChild.blnIsAllowed);
  return { ...objNode, blnIsAllowed, lstChildren };
}

function updateActionState(lstMenuNodes: SecurityMenuNode[], intMenuID: number, intActionID: number, fnMutateAction: (objAction: SecurityActionRight) => SecurityActionRight): SecurityMenuNode[] {
  return lstMenuNodes.map((objNode) => syncNodeAllowedFromRights((() => {
    if (objNode.intMenuID === intMenuID) {
      const lstActions = objNode.lstActions.map((objAction) => objAction.intActionID === intActionID ? fnMutateAction(objAction) : objAction);
      return { ...objNode, lstActions };
    }
    return { ...objNode, lstChildren: updateActionState(objNode.lstChildren, intMenuID, intActionID, fnMutateAction) };
  })()));
}

function isNodeAllowed(objNode: SecurityMenuNode): boolean {
  return objNode.blnIsAllowed || objNode.lstActions.some((objAction) => objAction.blnIsAllowed) || objNode.lstChildren.some((objChild) => isNodeAllowed(objChild));
}

function findNode(lstMenuNodes: SecurityMenuNode[], intMenuID: number | null): SecurityMenuNode | null {
  if (!intMenuID) return null;
  for (const objNode of lstMenuNodes) {
    if (objNode.intMenuID === intMenuID) return objNode;
    const objChild = findNode(objNode.lstChildren, intMenuID);
    if (objChild) return objChild;
  }
  return null;
}

function findFirstSelectableNode(lstMenuNodes: SecurityMenuNode[]): SecurityMenuNode | null {
  for (const objNode of lstMenuNodes) {
    if (objNode.lstActions.length > 0 || objNode.lstChildren.length === 0) return objNode;
    const objChild = findFirstSelectableNode(objNode.lstChildren);
    if (objChild) return objChild;
  }
  return null;
}

function findBreadcrumb(lstMenuNodes: SecurityMenuNode[], intMenuID: number | null, lstTrail: string[] = []): string[] {
  if (!intMenuID) return [];
  for (const objNode of lstMenuNodes) {
    const lstNextTrail = [...lstTrail, normalizeRightsMenuName(objNode)];
    if (objNode.intMenuID === intMenuID) return lstNextTrail;
    const lstChildTrail = findBreadcrumb(objNode.lstChildren, intMenuID, lstNextTrail);
    if (lstChildTrail.length > 0) return lstChildTrail;
  }
  return [];
}

function getMenuIcon(objNode: SecurityMenuNode, intDepth: number): ReactNode {
  const strValue = `${objNode.strMenuName} ${objNode.strMenuCode} ${objNode.strRoutePath ?? ""}`.toLowerCase();
  const dicIconSx = { fontSize: intDepth === 0 ? 16 : 14, color: "#64748b" };
  if (strValue.includes("dashboard")) return <DashboardRoundedIcon sx={dicIconSx} />;
  if (strValue.includes("people") || strValue.includes("employee") || strValue.includes("user")) return <GroupsRoundedIcon sx={dicIconSx} />;
  if (strValue.includes("payroll") || strValue.includes("salary") || strValue.includes("payslip")) return <PaidRoundedIcon sx={dicIconSx} />;
  if (strValue.includes("leave") || strValue.includes("calendar")) return <CalendarMonthRoundedIcon sx={dicIconSx} />;
  if (strValue.includes("report")) return <AssessmentRoundedIcon sx={dicIconSx} />;
  if (strValue.includes("security") || strValue.includes("right") || strValue.includes("permission")) return <SecurityRoundedIcon sx={dicIconSx} />;
  if (strValue.includes("setting") || strValue.includes("master")) return <SettingsRoundedIcon sx={dicIconSx} />;
  if (strValue.includes("company") || strValue.includes("tenant") || strValue.includes("business")) return <BusinessRoundedIcon sx={dicIconSx} />;
  return <FolderRoundedIcon sx={dicIconSx} />;
}

function RightsTreeNode({
  objNode,
  intDepth = 0,
  intSelectedMenuID,
  objExpandedMenuIDs,
  blnReadOnly,
  fnToggleExpand,
  fnToggleNodeAllowed,
  fnSelectNode,
}: {
  objNode: SecurityMenuNode;
  intDepth?: number;
  intSelectedMenuID: number | null;
  objExpandedMenuIDs: Set<number>;
  blnReadOnly: boolean;
  fnToggleExpand: (intMenuID: number) => void;
  fnToggleNodeAllowed: (intMenuID: number, blnIsAllowed: boolean) => void;
  fnSelectNode: (intMenuID: number) => void;
}) {
  const blnExpanded = objExpandedMenuIDs.has(objNode.intMenuID);
  const blnSelected = intSelectedMenuID === objNode.intMenuID;
  const blnHasChildren = objNode.lstChildren.length > 0;
  return (
    <Box>
      <Box
        onClick={() => fnSelectNode(objNode.intMenuID)}
        sx={{
          display: "grid",
          gridTemplateColumns: "18px 24px minmax(0, 1fr)",
          alignItems: "center",
          gap: 0.35,
          minHeight: 30,
          pl: `${0.5 + intDepth * 1.25}rem`,
          pr: 0.75,
          borderRadius: "5px",
          cursor: "pointer",
          bgcolor: blnSelected ? "#dbeafe" : "transparent",
          color: blnSelected ? "#1e3a8a" : "#334155",
          "&:hover": { bgcolor: blnSelected ? "#dbeafe" : "#f1f5f9" },
        }}
      >
        <Button
          variant="text"
          disabled={!blnHasChildren}
          onClick={(objEvent) => {
            objEvent.stopPropagation();
            fnToggleExpand(objNode.intMenuID);
          }}
          data-control-id={`security.user-group.dialog.rights.menu.${objNode.intMenuID}.expand.button`}
          sx={{ minWidth: 18, width: 18, height: 24, p: 0, color: "#64748b" }}
        >
          {blnHasChildren ? blnExpanded ? <ExpandMoreRoundedIcon sx={{ fontSize: 17 }} /> : <ChevronRightRoundedIcon sx={{ fontSize: 17 }} /> : null}
        </Button>
        <Checkbox
          checked={isNodeAllowed(objNode)}
          disabled={blnReadOnly}
          onClick={(objEvent) => objEvent.stopPropagation()}
          onChange={(objEvent) => {
            fnSelectNode(objNode.intMenuID);
            fnToggleNodeAllowed(objNode.intMenuID, objEvent.target.checked);
          }}
          inputProps={{ "data-control-id": `security.user-group.dialog.rights.menu.${objNode.intMenuID}.checkbox` } as InputHTMLAttributes<HTMLInputElement>}
          sx={{ p: 0.25, color: "#b6c3d1", "&.Mui-checked": { color: "var(--app-primary-color)" } }}
        />
        <Stack direction="row" spacing={0.65} alignItems="center" sx={{ minWidth: 0 }}>
          {getMenuIcon(objNode, intDepth)}
          <Typography noWrap sx={{ fontSize: 12, fontWeight: blnSelected ? 800 : 700 }}>{normalizeRightsMenuName(objNode)}</Typography>
        </Stack>
      </Box>
      {blnExpanded ? objNode.lstChildren.map((objChild) => (
        <RightsTreeNode
          key={objChild.intMenuID}
          objNode={objChild}
          intDepth={intDepth + 1}
          intSelectedMenuID={intSelectedMenuID}
          objExpandedMenuIDs={objExpandedMenuIDs}
          blnReadOnly={blnReadOnly}
          fnToggleExpand={fnToggleExpand}
          fnToggleNodeAllowed={fnToggleNodeAllowed}
          fnSelectNode={fnSelectNode}
        />
      )) : null}
    </Box>
  );
}

export default function UserGroupRightsEditor({ lstNodes, blnReadOnly = false, onChange }: UserGroupRightsEditorProps) {
  const { t } = useModuleLabels("user_group");
  const [strSearch, setStrSearch] = useState("");
  const [strModuleFilter, setStrModuleFilter] = useState("All");
  const [intSelectedMenuID, setIntSelectedMenuID] = useState<number | null>(null);
  const [objExpandedMenuIDs, setObjExpandedMenuIDs] = useState<Set<number>>(new Set());
  const [blnClearConfirmOpen, setBlnClearConfirmOpen] = useState(false);
  const strLanguageCode: "en" | "hi" = authHelpers.getLanguageID() === 2 ? "hi" : "en";
  const lstModuleOptions = useMemo(() => [{ intMenuID: 0, strLabel: "All modules" }, ...lstNodes.map((objNode) => ({ intMenuID: objNode.intMenuID, strLabel: normalizeRightsMenuName(objNode) }))], [lstNodes]);
  const lstModuleFilteredNodes = useMemo(() => {
    if (strModuleFilter === "All") return lstNodes;
    const intModuleID = Number(strModuleFilter);
    const objModule = lstNodes.find((objNode) => objNode.intMenuID === intModuleID);
    return objModule ? [objModule] : lstNodes;
  }, [lstNodes, strModuleFilter]);
  const lstFilteredNodes = useMemo(() => filterNodes(lstModuleFilteredNodes, strSearch), [lstModuleFilteredNodes, strSearch]);
  const objSelectedNode = findNode(lstNodes, intSelectedMenuID) ?? findFirstSelectableNode(lstFilteredNodes);
  const lstBreadcrumb = findBreadcrumb(lstNodes, objSelectedNode?.intMenuID ?? null);
  const dicLabels = {
    searchPlaceholder: t("rights_search_placeholder", "Search menus or actions"),
    allModules: t("rights_all_modules", "All modules"),
    expandAll: t("rights_expand_all", "Expand all"),
    collapseAll: t("rights_collapse_all", "Collapse all"),
    clearAll: t("rights_clear_all", "Clear all"),
    applyPreset: t("rights_apply_preset", "Apply preset"),
    clearConfirmTitle: t("rights_clear_confirm_title", "Clear all permissions?"),
    clearConfirmMessage: t("rights_clear_confirm_message", "This will remove all visible menus and allowed actions from this user group. The change is applied only after saving."),
    cancel: t("cancel_button", "Cancel"),
    confirmClear: t("rights_confirm_clear", "Clear all"),
    hierarchyTitle: t("rights_hierarchy_title", "Menu hierarchy"),
    permissions: t("rights_permissions", "Permissions"),
    allow: t("rights_allow", "Allow"),
    visible: t("rights_visible", "Visible"),
    emptyActions: t("rights_empty_actions", "No actions configured for this menu."),
    saveNote: t("rights_save_note", "Changes affect this user group after saving"),
  };

  useEffect(() => {
    const setAvailableMenuIDs = new Set(collectMenuIDs(lstNodes));
    setObjExpandedMenuIDs((objPrevious) => {
      const objNext = new Set([...objPrevious].filter((intMenuID) => setAvailableMenuIDs.has(intMenuID)));
      return objNext;
    });
  }, [lstNodes]);

  useEffect(() => {
    const setVisibleMenuIDs = new Set(collectMenuIDs(lstFilteredNodes));
    if (!intSelectedMenuID || !setVisibleMenuIDs.has(intSelectedMenuID)) {
      const objFirstNode = findFirstSelectableNode(lstFilteredNodes);
      setIntSelectedMenuID(objFirstNode?.intMenuID ?? null);
    }
  }, [intSelectedMenuID, lstFilteredNodes]);

  function fnToggleAllowed(intMenuID: number, intActionID: number, blnIsAllowed: boolean) {
    onChange(updateActionState(lstNodes, intMenuID, intActionID, (objAction) => ({
      ...objAction,
      blnIsAllowed,
      strAccessScope: blnIsAllowed && normalizeAccessScope(objAction.strAccessScope) === "none" ? "self" : blnIsAllowed ? normalizeAccessScope(objAction.strAccessScope) : "none",
    })));
  }

  function fnToggleNodeAllowed(intMenuID: number, blnIsAllowed: boolean) {
    if (findNode(lstNodes, intMenuID)?.lstChildren.length) {
      setObjExpandedMenuIDs((objPrevious) => new Set([...objPrevious, intMenuID]));
    }
    onChange(mapNodeDeep(lstNodes, intMenuID, (objNode) => mutateNodeTree(objNode, blnIsAllowed)));
  }

  function fnToggleExpand(intMenuID: number) {
    setObjExpandedMenuIDs((objPrevious) => {
      const objNext = new Set(objPrevious);
      if (objNext.has(intMenuID)) objNext.delete(intMenuID);
      else objNext.add(intMenuID);
      return objNext;
    });
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minHeight: 0, height: "100%", overflow: "hidden" }}>
      <Box sx={{ flexShrink: 0, position: "sticky", top: 0, zIndex: 3, display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr) minmax(0, 1fr)", sm: "minmax(0, 1fr) 150px auto" }, gap: 1, alignItems: "center", pb: 1 }}>
        <TextField size="small" className="app-mui-text-field" placeholder={dicLabels.searchPlaceholder} value={strSearch} onChange={(objEvent) => setStrSearch(objEvent.target.value)} inputProps={{ controlId: "security.user-group-rights-editor.search.input" }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ color: "#94a3b8", fontSize: 18 }} /></InputAdornment> }} />
        <TextField select size="small" className="app-mui-text-field" value={strModuleFilter} onChange={(objEvent) => setStrModuleFilter(objEvent.target.value)} inputProps={{ controlId: "security.user-group-rights-editor.module-filter.select" }}>
          {lstModuleOptions.map((objOption) => (
            <MenuItem key={objOption.intMenuID} value={objOption.intMenuID ? String(objOption.intMenuID) : "All"}>{objOption.intMenuID ? objOption.strLabel : dicLabels.allModules}</MenuItem>
          ))}
        </TextField>
        <Button data-control-id="security.user-group-rights-editor.clear-all.button" variant="outlined" disabled={blnReadOnly} onClick={() => setBlnClearConfirmOpen(true)} sx={{ borderRadius: "6px", textTransform: "none", fontWeight: 800, whiteSpace: "nowrap" }}>{dicLabels.clearAll}</Button>
        {/* <Button data-control-id="security.user-group-rights-editor.apply-preset.button" variant="contained" endIcon={<ExpandMoreRoundedIcon />} disabled={blnReadOnly} sx={{ borderRadius: "6px", textTransform: "none", fontWeight: 800, whiteSpace: "nowrap", bgcolor: "#0d6efd" }}>{dicLabels.applyPreset}</Button> */}
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "minmax(0, 40%) minmax(0, 1fr)" }, gridTemplateRows: { xs: "minmax(0, 1fr) minmax(0, 1fr)", sm: "minmax(0, 1fr)" }, gap: 1 }}>
        <Box sx={{ border: "1px solid #dbe7f0", borderRadius: "6px", bgcolor: "#fff", minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.5, flexShrink: 0, px: 1.25, py: 1, borderBottom: "1px solid #e5edf6", background: "linear-gradient(180deg, #f8fbff, #eef4fb)" }}>
            <Typography sx={{ color: "#0f2f4d", fontSize: 14, fontWeight: 900 }}>{dicLabels.hierarchyTitle}</Typography>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title={dicLabels.expandAll}>
                <IconButton size="small" aria-label={dicLabels.expandAll} data-control-id="security.user-group-rights-editor.expand-all.button" onClick={() => setObjExpandedMenuIDs(new Set(collectMenuIDs(lstFilteredNodes)))} sx={{ border: "1px solid #dbe7f0", borderRadius: "4px", p: 0.25 }}>
                  <KeyboardDoubleArrowDownRoundedIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={dicLabels.collapseAll}>
                <IconButton size="small" aria-label={dicLabels.collapseAll} data-control-id="security.user-group-rights-editor.collapse-all.button" onClick={() => setObjExpandedMenuIDs(new Set())} sx={{ border: "1px solid #dbe7f0", borderRadius: "4px", p: 0.25 }}>
                  <KeyboardDoubleArrowUpRoundedIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 0.75 }}>
            {lstFilteredNodes.length === 0 ? (
              <Box sx={{ display: "grid", placeItems: "center", minHeight: 180, px: 2 }}>
                <Stack spacing={0.75} alignItems="center">
                  <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{objEmptyStateText[strLanguageCode].title}</Typography>
                  <Typography sx={{ color: "#64748b", textAlign: "center", fontSize: 12 }}>{objEmptyStateText[strLanguageCode].subtitle}</Typography>
                </Stack>
              </Box>
            ) : lstFilteredNodes.map((objNode) => (
              <RightsTreeNode key={objNode.intMenuID} objNode={objNode} intSelectedMenuID={objSelectedNode?.intMenuID ?? intSelectedMenuID} objExpandedMenuIDs={objExpandedMenuIDs} blnReadOnly={blnReadOnly} fnToggleExpand={fnToggleExpand} fnToggleNodeAllowed={fnToggleNodeAllowed} fnSelectNode={setIntSelectedMenuID} />
            ))}
          </Box>
        </Box>

        <Box sx={{ border: "1px solid #dbe7f0", borderRadius: "6px", bgcolor: "#fff", minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {objSelectedNode ? (
            <>
              <Box sx={{ flexShrink: 0, px: 1.5, py: 1.1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, borderBottom: "1px solid #e5edf6" }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ color: "#0f2f4d", fontSize: 16, fontWeight: 900 }}>{normalizeRightsMenuName(objSelectedNode)}</Typography>
                  <Typography noWrap sx={{ color: "#64748b", fontSize: 11, mt: 0.25 }}>{lstBreadcrumb.join(" / ")}</Typography>
                </Box>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <ActiveStatusSwitch
                    className="app-master-dialog-status-switch"
                    blnIsActive={isNodeAllowed(objSelectedNode)}
                    disabled={blnReadOnly}
                    onChange={(blnChecked) => fnToggleNodeAllowed(objSelectedNode.intMenuID, blnChecked)}
                    controlId={`security.user-group.dialog.rights.menu.${objSelectedNode.intMenuID}.visible.switch`}
                    testId={`security.user-group.dialog.rights.menu.${objSelectedNode.intMenuID}.visible.switch`}
                  />
                  <Typography sx={{ color: "#334155", fontSize: 12, fontWeight: 800 }}>{dicLabels.visible}</Typography>
                </Stack>
              </Box>
              <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 1.25 }}>
                <Box sx={{ border: "1px solid #dbe7f0", borderRadius: "6px", overflow: "hidden" }}>
                  <Box sx={{ position: "sticky", top: 0, zIndex: 1, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 74px", bgcolor: "#f1f5f9", borderBottom: "1px solid #dbe7f0" }}>
                    <Typography sx={{ px: 1.25, py: 0.85, color: "#334155", fontSize: 12, fontWeight: 900 }}>{dicLabels.permissions}</Typography>
                    <Typography sx={{ px: 1.25, py: 0.85, color: "#334155", fontSize: 12, fontWeight: 900, textAlign: "center", borderLeft: "1px solid #dbe7f0" }}>{dicLabels.allow}</Typography>
                  </Box>
                  {objSelectedNode.lstActions.length > 0 ? objSelectedNode.lstActions.map((objAction) => (
                    <Box key={objAction.intActionID} sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 74px", borderTop: "1px solid #edf2f7", minHeight: 34, alignItems: "center" }}>
                      <Typography sx={{ px: 1.25, color: "#334155", fontSize: 12, fontWeight: 650 }}>{objAction.strActionName}</Typography>
                      <Box sx={{ display: "flex", justifyContent: "center", borderLeft: "1px solid #edf2f7" }}>
                      <Checkbox checked={objAction.blnIsAllowed} disabled={blnReadOnly} onChange={(objEvent) => fnToggleAllowed(objSelectedNode.intMenuID, objAction.intActionID, objEvent.target.checked)} inputProps={{ "data-control-id": `security.user-group.dialog.rights.menu.${objSelectedNode.intMenuID}.action.${objAction.intActionID}.checkbox` } as InputHTMLAttributes<HTMLInputElement>} sx={{ p: 0.25, color: "#b6c3d1", "&.Mui-checked": { color: "var(--app-primary-color)" } }} />
                      </Box>
                    </Box>
                  )) : (
                    <Stack spacing={0.75} alignItems="center" sx={{ px: 2, py: 4 }}>
                      <ViewListRoundedIcon sx={{ color: "#94a3b8" }} />
                      <Typography sx={{ color: "#64748b", fontSize: 12 }}>{dicLabels.emptyActions}</Typography>
                    </Stack>
                  )}
                </Box>
              </Box>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ px: 1.5, pb: 1.25, mt: "auto" }}>
                <InfoRoundedIcon sx={{ color: "#64748b", fontSize: 18 }} />
                <Typography sx={{ color: "#64748b", fontSize: 11, fontWeight: 700 }}>{dicLabels.saveNote}</Typography>
              </Stack>
            </>
          ) : null}
        </Box>
      </Box>
      <Dialog open={blnClearConfirmOpen} onClose={(_, strReason) => { if (strReason !== "backdropClick") setBlnClearConfirmOpen(false); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: "1rem", fontWeight: 900, color: "#0f2f4d" }}>{dicLabels.clearConfirmTitle}</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#475569", fontSize: 13 }}>{dicLabels.clearConfirmMessage}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button className="app-btn app-btn-outline" onClick={() => setBlnClearConfirmOpen(false)}>{dicLabels.cancel}</Button>
          <Button
            className="app-btn app-btn-primary"
            onClick={() => {
              onChange(clearMenuTreeRights(lstNodes));
              setStrSearch("");
              setBlnClearConfirmOpen(false);
            }}
          >
            {dicLabels.confirmClear}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
