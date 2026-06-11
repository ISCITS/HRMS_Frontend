"use client";

import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import {
  Box,
  Button,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { authHelpers } from "@/lib/auth";
import type { SecurityActionRight, SecurityMenuNode, UserGroupRightSaveItem } from "@/models/SecurityModels";

const objEmptyStateText = {
  en: {
    title: "No matching rights nodes",
    subtitle: "Adjust the search filter to continue.",
  },
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

  if (strRoute.includes("/ess/my-payslip") || strRoute.includes("/ess/my-payslips")) {
    return "Payslips";
  }
  if (strRoute.includes("/hr/it-declaration") || strRoute.includes("/salary/ess-declarations") || strRoute.includes("/salary/it-declaration")) {
    return "IT Declaration";
  }
  if (strRoute.includes("/payroll-cycles") || strRoute.includes("/payroll/cycles")) {
    return strMenuName || "Payroll Schedules";
  }
  if (strRoute.includes("/payroll/runs")) {
    return "Payroll Runs";
  }
  if (
    strRoute.includes("/payroll/employee-payroll-inputs") ||
    strRoute.includes("/payroll/employee-payroll-input") ||
    strRoute.includes("/payroll/inputs") ||
    strMenuCode.includes("employee_payroll_input")
  ) {
    return "Payroll Input";
  }
  if (strRoute.includes("/payroll/results") || strMenuCode.includes("payroll_result")) {
    return "Payroll Results";
  }
  if (strRoute.includes("/payroll/statutory-rules")) {
    return "Statutory Rules";
  }
  if (strRoute.includes("/payroll/process-log") || strRoute.includes("/payroll-process-logs")) {
    return "Payroll Process Logs";
  }
  if (strRoute.includes("/reports/payroll-register") || strMenuCode.includes("payroll_register")) {
    return "Payroll Register";
  }
  if (strRoute.includes("/reports/bank-file") || strMenuCode.includes("bank_file")) {
    return "Bank File";
  }
  if (strRoute.includes("/reports/statutory") || strMenuCode.includes("statutory_report")) {
    return "Statutory Reports";
  }

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
      strAccessScope: objAction.strAccessScope,
      objPolicyJson: objAction.objPolicyJson,
    })),
    ...flattenRights(objNode.lstChildren),
  ]);
}

export function serializeRights(lstMenuNodes: SecurityMenuNode[]): UserGroupRightSaveItem[] {
  const setSeen = new Set<string>();
  return flattenRights(lstMenuNodes).filter((objRight) => {
    if (!objRight.blnIsAllowed) {
      return false;
    }
    const strKey = `${objRight.intMenuID}-${objRight.intActionID}`;
    if (setSeen.has(strKey)) {
      return false;
    }
    setSeen.add(strKey);
    return true;
  });
}

export function clearMenuTreeRights(lstMenuNodes: SecurityMenuNode[]): SecurityMenuNode[] {
  return lstMenuNodes.map((objNode) => ({
    ...objNode,
    blnIsAllowed: false,
    lstActions: objNode.lstActions.map((objAction) => ({
      ...objAction,
      blnIsAllowed: false,
      strAccessScope: "none",
      objPolicyJson: null,
    })),
    lstChildren: clearMenuTreeRights(objNode.lstChildren),
  }));
}

function filterNodes(lstMenuNodes: SecurityMenuNode[], strSearch: string): SecurityMenuNode[] {
  if (!strSearch.trim()) {
    return lstMenuNodes;
  }

  const strNeedle = strSearch.trim().toLowerCase();
  return lstMenuNodes
    .map((objNode) => {
      const lstChildren = filterNodes(objNode.lstChildren, strNeedle);
      const blnMenuMatch =
        objNode.strMenuName.toLowerCase().includes(strNeedle) ||
        objNode.strMenuCode.toLowerCase().includes(strNeedle);
      const blnActionMatch = objNode.lstActions.some(
        (objAction) =>
          objAction.strActionName.toLowerCase().includes(strNeedle) ||
          objAction.strActionCode.toLowerCase().includes(strNeedle),
      );

      return blnMenuMatch || blnActionMatch || lstChildren.length > 0
        ? { ...objNode, lstChildren }
        : null;
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
      strAccessScope:
        blnIsAllowed && objAction.strAccessScope === "none"
          ? "self"
          : blnIsAllowed
            ? objAction.strAccessScope
            : "none",
    })),
    lstChildren: objNode.lstChildren.map((objChild) => mutateNodeTree(objChild, blnIsAllowed)),
  };
}

function mapNodeDeep(
  lstMenuNodes: SecurityMenuNode[],
  intMenuID: number,
  fnMutateNode: (objNode: SecurityMenuNode) => SecurityMenuNode,
): SecurityMenuNode[] {
  return lstMenuNodes.map((objNode) =>
    objNode.intMenuID === intMenuID
      ? fnMutateNode(objNode)
      : { ...objNode, lstChildren: mapNodeDeep(objNode.lstChildren, intMenuID, fnMutateNode) },
  );
}

function isNodeFullyAllowed(objNode: SecurityMenuNode): boolean {
  if (objNode.lstChildren.length > 0) {
    return objNode.lstChildren.every((objChild) => isNodeFullyAllowed(objChild));
  }

  return objNode.blnIsAllowed;
}

function updateActionState(
  lstMenuNodes: SecurityMenuNode[],
  intMenuID: number,
  intActionID: number,
  fnMutateAction: (objAction: SecurityActionRight) => SecurityActionRight,
): SecurityMenuNode[] {
  return lstMenuNodes.map((objNode) => {
    if (objNode.intMenuID === intMenuID) {
      return {
        ...objNode,
        lstActions: objNode.lstActions.map((objAction) =>
          objAction.intActionID === intActionID ? fnMutateAction(objAction) : objAction,
        ),
      };
    }

    return {
      ...objNode,
      lstChildren: updateActionState(objNode.lstChildren, intMenuID, intActionID, fnMutateAction),
    };
  });
}

function renderActionRow(
  objNode: SecurityMenuNode,
  objAction: SecurityActionRight,
  intDepth: number,
  blnReadOnly: boolean,
  fnToggleAllowed: (intMenuID: number, intActionID: number, blnIsAllowed: boolean) => void,
) {
  return (
    <Box
      key={`${objNode.intMenuID}-${objAction.intActionID}`}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 0.75,
        px: 2,
        py: 0.65,
        borderTop: "1px solid #edf2f7",
        background: "rgba(248,250,252,0.55)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 0.75,
          pl: `${intDepth * 18 + 12}px`,
          minWidth: 0,
          width: "100%",
        }}
      >
        <Typography sx={{ fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
          {objAction.strActionName}
        </Typography>
        <Switch
          checked={objAction.blnIsAllowed}
          disabled={blnReadOnly}
          onChange={(objEvent) => fnToggleAllowed(objNode.intMenuID, objAction.intActionID, objEvent.target.checked)}
          size="small"
          sx={{ ml: 1 }}
        />
      </Box>
    </Box>
  );
}

function renderNodeRows(
  objNode: SecurityMenuNode,
  objExpandedMenuIDs: Set<number>,
  blnReadOnly: boolean,
  strLanguageCode: "en" | "hi",
  fnToggleExpand: (intMenuID: number) => void,
  fnToggleNodeAllowed: (intMenuID: number, blnIsAllowed: boolean) => void,
  fnToggleAllowed: (intMenuID: number, intActionID: number, blnIsAllowed: boolean) => void,
  intDepth = 0,
) {
  const blnExpanded = objExpandedMenuIDs.has(objNode.intMenuID);
  const blnNodeChecked = isNodeFullyAllowed(objNode);
  const strNormalizedMenuName = normalizeRightsMenuName(objNode);

  return (
    <Box key={objNode.intMenuID} sx={{ borderTop: intDepth === 0 ? "none" : "1px solid #edf2f7" }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 140px" },
          gap: 1.25,
          alignItems: "center",
          px: 2,
          py: 0.9,
          background: intDepth === 0 ? "rgba(241,245,249,0.92)" : "rgba(248,250,252,0.88)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, pl: `${intDepth * 18}px`, minWidth: 0 }}>
          <Button
            variant="text"
            onClick={() => fnToggleExpand(objNode.intMenuID)}
            startIcon={blnExpanded ? <ExpandMoreRoundedIcon /> : <ChevronRightRoundedIcon />}
            sx={{
              minWidth: 0,
              px: 0.25,
              py: 0.15,
              color: "#334155",
              textTransform: "none",
              justifyContent: "flex-start",
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            {strNormalizedMenuName}
          </Button>
        </Box>
        <Box sx={{ display: "flex", justifyContent: { xs: "flex-start", md: "flex-end" } }}>
          <Switch
            checked={blnNodeChecked}
            disabled={blnReadOnly}
            onChange={(objEvent) => fnToggleNodeAllowed(objNode.intMenuID, objEvent.target.checked)}
            size="small"
          />
        </Box>
      </Box>

      {blnExpanded ? (
        <>
          {objNode.lstActions.map((objAction) =>
            renderActionRow(
              objNode,
              objAction,
              intDepth,
              blnReadOnly,
              fnToggleAllowed,
            ),
          )}
          {objNode.lstChildren.map((objChild) =>
            renderNodeRows(
              objChild,
              objExpandedMenuIDs,
              blnReadOnly,
              strLanguageCode,
              fnToggleExpand,
              fnToggleNodeAllowed,
              fnToggleAllowed,
              intDepth + 1,
            ),
          )}
        </>
      ) : null}
    </Box>
  );
}

export default function UserGroupRightsEditor({
  lstNodes,
  blnReadOnly = false,
  blnEmbedded = false,
  onChange,
}: UserGroupRightsEditorProps) {
  const { t } = useModuleLabels("user_group");
  const [strSearch, setStrSearch] = useState("");
  const [objExpandedMenuIDs, setObjExpandedMenuIDs] = useState<Set<number>>(new Set());
  const strLanguageCode: "en" | "hi" = authHelpers.getLanguageID() === 2 ? "hi" : "en";
  const lstFilteredNodes = useMemo(() => filterNodes(lstNodes, strSearch), [lstNodes, strSearch]);
  const dicLabels = {
    searchPlaceholder: t("rights_search_placeholder", "Search menu, module, or action"),
    expandAll: t("rights_expand_all", "Expand All"),
    collapseAll: t("rights_collapse_all", "Collapse All"),
    reset: t("rights_reset", "Reset"),
    panelTitle: t("rights_panel_title", "Menu / Action Hierarchy"),
  };

  useEffect(() => {
    const setAvailableMenuIDs = new Set(collectMenuIDs(lstNodes));
    setObjExpandedMenuIDs((objPrevious) => {
      const objNext = new Set(
        [...objPrevious].filter((intMenuID) => setAvailableMenuIDs.has(intMenuID)),
      );
      if (objNext.size === objPrevious.size) {
        return objPrevious;
      }
      return objNext;
    });
  }, [lstNodes]);

  function fnToggleAllowed(intMenuID: number, intActionID: number, blnIsAllowed: boolean) {
    onChange(
      updateActionState(lstNodes, intMenuID, intActionID, (objAction) => ({
        ...objAction,
        blnIsAllowed,
        strAccessScope:
          blnIsAllowed && objAction.strAccessScope === "none"
            ? "self"
            : blnIsAllowed
              ? objAction.strAccessScope
              : "none",
      })),
    );
  }

  function fnToggleNodeAllowed(intMenuID: number, blnIsAllowed: boolean) {
    onChange(mapNodeDeep(lstNodes, intMenuID, (objNode) => mutateNodeTree(objNode, blnIsAllowed)));
  }

  function fnToggleExpand(intMenuID: number) {
    setObjExpandedMenuIDs((objPrevious) => {
      const objNext = new Set(objPrevious);
      if (objNext.has(intMenuID)) {
        objNext.delete(intMenuID);
      } else {
        objNext.add(intMenuID);
      }
      return objNext;
    });
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, minHeight: 0, height: "100%" }}>
      <Box
        sx={{
          borderRadius: 0,
          border: "1px solid #dbe7f0",
          backgroundColor: "#fff",
          p: 1.5,
          display: blnEmbedded ? "none" : "grid",
          gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) auto auto auto" },
          gap: 1.25,
          alignItems: "center",
        }}
      >
        <TextField
          data-testid="security.user-group-rights-editor.search.input"
          placeholder={dicLabels.searchPlaceholder}
          value={strSearch}
          onChange={(objEvent) => setStrSearch(objEvent.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon sx={{ color: "#64748b" }} />
              </InputAdornment>
            ),
          }}
        />
        <Button
          data-testid="security.user-group-rights-editor.expand-all.button"
          variant="outlined"
          startIcon={<ExpandMoreRoundedIcon />}
          onClick={() => setObjExpandedMenuIDs(new Set(collectMenuIDs(lstNodes)))}
          sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 700 }}
        >
          {dicLabels.expandAll}
        </Button>
        <Button
          data-testid="security.user-group-rights-editor.collapse-all.button"
          variant="outlined"
          startIcon={<ExpandLessRoundedIcon />}
          onClick={() => setObjExpandedMenuIDs(new Set())}
          sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 700 }}
        >
          {dicLabels.collapseAll}
        </Button>
        <Button
          data-testid="security.user-group-rights-editor.reset.button"
          variant="outlined"
          startIcon={<RestartAltRoundedIcon />}
          disabled={blnReadOnly}
          onClick={() => {
            onChange(clearMenuTreeRights(lstNodes));
            setStrSearch("");
          }}
          sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 700 }}
        >
          {dicLabels.reset}
        </Button>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          borderRadius: 0,
          border: "1px solid #dbe7f0",
          backgroundColor: "#fff",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: 2,
            py: 1.4,
            borderBottom: "1px solid #dbe7f0",
            background: "linear-gradient(180deg, rgba(248,250,252,0.98), rgba(241,245,249,0.92))",
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <TuneRoundedIcon sx={{ color: "#1d4ed8" }} />
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{dicLabels.panelTitle}</Typography>
          </Stack>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          {lstFilteredNodes.length === 0 ? (
            <Box sx={{ display: "grid", placeItems: "center", minHeight: 220, px: 3 }}>
              <Stack spacing={1} alignItems="center">
                <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
                  {objEmptyStateText[strLanguageCode].title}
                </Typography>
                <Typography sx={{ color: "#64748b", textAlign: "center" }}>
                  {objEmptyStateText[strLanguageCode].subtitle}
                </Typography>
              </Stack>
            </Box>
          ) : (
            lstFilteredNodes.map((objNode) =>
              renderNodeRows(
                objNode,
                objExpandedMenuIDs,
                blnReadOnly,
                strLanguageCode,
                fnToggleExpand,
                fnToggleNodeAllowed,
                fnToggleAllowed,
              ),
            )
          )}
        </Box>
      </Box>
    </Box>
  );
}

