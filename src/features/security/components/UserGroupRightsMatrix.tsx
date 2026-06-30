"use client";

import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import type { SecurityActionRight, SecurityMenuNode, UserGroupRightSaveItem } from "@/models/SecurityModels";
import { securityApiService } from "@/features/security/services/securityApiService";
import { normalizeAccessScope } from "@/features/security/utils/accessScope";

const lstScopes = ["none", "self", "team", "custom", "all"];

type UserGroupRightsMatrixProps = {
  intUserGroupID: number;
  strGroupName?: string;
  strGroupCode?: string;
  blnEmbedded?: boolean;
  blnReadOnly?: boolean;
};

function collectMenuIDs(lstNodes: SecurityMenuNode[]): number[] {
  const lstIDs: number[] = [];
  for (const objNode of lstNodes) {
    lstIDs.push(objNode.intMenuID);
    lstIDs.push(...collectMenuIDs(objNode.lstChildren));
  }
  return lstIDs;
}

function flattenRights(lstNodes: SecurityMenuNode[]): UserGroupRightSaveItem[] {
  const lstRights: UserGroupRightSaveItem[] = [];
  for (const objNode of lstNodes) {
    for (const objAction of objNode.lstActions) {
      lstRights.push({
        intMenuID: objNode.intMenuID,
        intActionID: objAction.intActionID,
        blnIsAllowed: objAction.blnIsAllowed,
        strAccessScope: normalizeAccessScope(objAction.strAccessScope),
        objPolicyJson: objAction.objPolicyJson,
      });
    }
    lstRights.push(...flattenRights(objNode.lstChildren));
  }
  return lstRights;
}

function countAllowedActions(lstNodes: SecurityMenuNode[]): number {
  return flattenRights(lstNodes).filter((objRight) => objRight.blnIsAllowed).length;
}

function mapNodeDeep(
  lstNodes: SecurityMenuNode[],
  intMenuID: number,
  fnMutateNode: (objNode: SecurityMenuNode) => SecurityMenuNode,
): SecurityMenuNode[] {
  return lstNodes.map((objNode) => {
    if (objNode.intMenuID === intMenuID) {
      return fnMutateNode(objNode);
    }

    return {
      ...objNode,
      lstChildren: mapNodeDeep(objNode.lstChildren, intMenuID, fnMutateNode),
    };
  });
}

function isNodeAllowed(objNode: SecurityMenuNode): boolean {
  return (
    objNode.blnIsAllowed ||
    objNode.lstActions.some((objAction) => objAction.blnIsAllowed) ||
    objNode.lstChildren.some((objChild) => isNodeAllowed(objChild))
  );
}

function mutateNodeTree(objNode: SecurityMenuNode, blnIsAllowed: boolean): SecurityMenuNode {
  return {
    ...objNode,
    blnIsAllowed,
    lstActions: objNode.lstActions.map((objAction) => ({
      ...objAction,
      blnIsAllowed,
      strAccessScope: blnIsAllowed ? (normalizeAccessScope(objAction.strAccessScope) === "none" ? "self" : normalizeAccessScope(objAction.strAccessScope)) : "none",
    })),
    lstChildren: objNode.lstChildren.map((objChild) => mutateNodeTree(objChild, blnIsAllowed)),
  };
}

function updateActionState(
  lstNodes: SecurityMenuNode[],
  intMenuID: number,
  intActionID: number,
  fnMutate: (objAction: SecurityActionRight) => SecurityActionRight,
): SecurityMenuNode[] {
  return lstNodes.map((objNode) => {
    if (objNode.intMenuID === intMenuID) {
      return {
        ...objNode,
        lstActions: objNode.lstActions.map((objAction) =>
          objAction.intActionID === intActionID ? fnMutate(objAction) : objAction,
        ),
      };
    }

    return {
      ...objNode,
      lstChildren: updateActionState(objNode.lstChildren, intMenuID, intActionID, fnMutate),
    };
  });
}

function filterNodes(lstNodes: SecurityMenuNode[], strSearch: string): SecurityMenuNode[] {
  if (!strSearch.trim()) {
    return lstNodes;
  }

  const strNeedle = strSearch.trim().toLowerCase();
  return lstNodes
    .map((objNode) => {
      const lstChildren = filterNodes(objNode.lstChildren, strNeedle);
      const blnMenuMatch =
        objNode.strMenuName.toLowerCase().includes(strNeedle) || objNode.strMenuCode.toLowerCase().includes(strNeedle);
      const blnActionMatch = objNode.lstActions.some(
        (objAction) =>
          objAction.strActionName.toLowerCase().includes(strNeedle) ||
          objAction.strActionCode.toLowerCase().includes(strNeedle),
      );

      if (blnMenuMatch || blnActionMatch || lstChildren.length > 0) {
        return {
          ...objNode,
          lstChildren,
        };
      }

      return null;
    })
    .filter((objNode): objNode is SecurityMenuNode => objNode !== null);
}

function renderActionRow(
  objNode: SecurityMenuNode,
  objAction: SecurityActionRight,
  intDepth: number,
  fnToggleAllowed: (intMenuID: number, intActionID: number, blnIsAllowed: boolean) => void,
  fnChangeScope: (intMenuID: number, intActionID: number, strScope: string) => void,
  blnReadOnly: boolean,
) {
  return (
    <Box
      key={`${objNode.intMenuID}-${objAction.intActionID}`}
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 140px" },
        gap: 1.25,
        alignItems: "center",
        px: 2,
        py: 1.1,
        borderTop: "1px solid #edf2f7",
        background: "rgba(248,250,252,0.55)",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, pl: `${intDepth * 18 + 16}px`, minWidth: 0 }}>
        <Chip
          label={objAction.strActionCategory}
          size="small"
          sx={{ height: 22, fontWeight: 700, bgcolor: "rgba(37,99,235,0.1)", color: "#1d4ed8" }}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>{objAction.strActionName}</Typography>
          <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>{objAction.strActionCode}</Typography>
        </Box>
        <Switch
          checked={objAction.blnIsAllowed}
          disabled={blnReadOnly}
          onChange={(objEvent) => fnToggleAllowed(objNode.intMenuID, objAction.intActionID, objEvent.target.checked)}
        />
      </Box>
      <TextField
        select
        size="small"
        value={normalizeAccessScope(objAction.strAccessScope)}
        disabled={blnReadOnly}
        onChange={(objEvent) => fnChangeScope(objNode.intMenuID, objAction.intActionID, objEvent.target.value)}
      >
        {lstScopes.map((strScope) => (
          <MenuItem key={strScope} value={strScope}>
            {strScope}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  );
}

function renderNodeRows(
  objNode: SecurityMenuNode,
  objExpandedMenuIDs: Set<number>,
  fnToggleExpand: (intMenuID: number) => void,
  fnToggleNodeAllowed: (intMenuID: number, blnIsAllowed: boolean) => void,
  fnToggleAllowed: (intMenuID: number, intActionID: number, blnIsAllowed: boolean) => void,
  fnChangeScope: (intMenuID: number, intActionID: number, strScope: string) => void,
  blnReadOnly: boolean,
  intDepth = 0,
) {
  const blnExpanded = objExpandedMenuIDs.has(objNode.intMenuID);
  const blnNodeChecked = isNodeAllowed(objNode);

  return (
    <Box key={objNode.intMenuID} sx={{ borderTop: intDepth === 0 ? "none" : "1px solid #edf2f7" }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 140px" },
          gap: 1.25,
          alignItems: "center",
          px: 2,
          py: 1.35,
          background: intDepth === 0 ? "rgba(241,245,249,0.92)" : "rgba(248,250,252,0.88)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, pl: `${intDepth * 18}px`, minWidth: 0 }}>
          <Button
            variant="text"
            onClick={() => fnToggleExpand(objNode.intMenuID)}
            startIcon={blnExpanded ? <ExpandMoreRoundedIcon /> : <ChevronRightRoundedIcon />}
            sx={{
              minWidth: 0,
              px: 0.5,
              color: "#334155",
              textTransform: "none",
              justifyContent: "flex-start",
              fontWeight: 700,
            }}
          >
            {objNode.strMenuName}
          </Button>
          <Chip
            label={objNode.intMenuLevel === 0 ? "Main Menu" : objNode.lstChildren.length > 0 ? "Sub Menu" : "Module"}
            size="small"
            sx={{ height: 22, fontWeight: 700, bgcolor: "rgba(15,23,42,0.08)", color: "#334155" }}
          />
          <Typography sx={{ color: "#64748b", fontSize: "0.82rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {objNode.strRoutePath || objNode.strMenuCode}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: { xs: "flex-start", md: "flex-end" } }}>
          <Switch
            checked={blnNodeChecked}
            disabled={blnReadOnly}
            onChange={(objEvent) => fnToggleNodeAllowed(objNode.intMenuID, objEvent.target.checked)}
          />
        </Box>
      </Box>

      {blnExpanded ? (
        <>
          {objNode.lstActions.map((objAction) =>
            renderActionRow(objNode, objAction, intDepth, fnToggleAllowed, fnChangeScope, blnReadOnly),
          )}
          {objNode.lstChildren.map((objChild) =>
            renderNodeRows(
              objChild,
              objExpandedMenuIDs,
              fnToggleExpand,
              fnToggleNodeAllowed,
              fnToggleAllowed,
              fnChangeScope,
              blnReadOnly,
              intDepth + 1,
            ),
          )}
        </>
      ) : null}
    </Box>
  );
}

export default function UserGroupRightsMatrix({
  intUserGroupID,
  strGroupName,
  strGroupCode,
  blnEmbedded = false,
  blnReadOnly = false,
}: UserGroupRightsMatrixProps) {
  const [lstNodes, setLstNodes] = useState<SecurityMenuNode[]>([]);
  const [lstInitialNodes, setLstInitialNodes] = useState<SecurityMenuNode[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strSearch, setStrSearch] = useState("");
  const [objExpandedMenuIDs, setObjExpandedMenuIDs] = useState<Set<number>>(new Set());
  const [objToast, setObjToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  async function loadRights() {
    setBlnLoading(true);
    try {
      const lstResult = await securityApiService.getUserGroupRights(intUserGroupID);
      setLstNodes(lstResult);
      setLstInitialNodes(lstResult);
      setObjExpandedMenuIDs(new Set(collectMenuIDs(lstResult)));
    } catch (objError) {
      setObjToast({
        open: true,
        message: objError instanceof Error ? objError.message : "Unable to load rights.",
        severity: "error",
      });
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    loadRights().catch(() => undefined);
  }, [intUserGroupID]);

  const lstFilteredNodes = useMemo(() => filterNodes(lstNodes, strSearch), [lstNodes, strSearch]);
  const intAllowedCount = useMemo(() => countAllowedActions(lstNodes), [lstNodes]);
  const intTotalActions = useMemo(() => flattenRights(lstNodes).length, [lstNodes]);

  function fnToggleAllowed(intMenuID: number, intActionID: number, blnIsAllowed: boolean) {
    setLstNodes((lstPrevious) =>
      updateActionState(lstPrevious, intMenuID, intActionID, (objAction) => ({
        ...objAction,
        blnIsAllowed,
        strAccessScope: blnIsAllowed ? (normalizeAccessScope(objAction.strAccessScope) === "none" ? "self" : normalizeAccessScope(objAction.strAccessScope)) : "none",
      })),
    );
  }

  function fnChangeScope(intMenuID: number, intActionID: number, strScope: string) {
    setLstNodes((lstPrevious) =>
      updateActionState(lstPrevious, intMenuID, intActionID, (objAction) => ({
        ...objAction,
        strAccessScope: normalizeAccessScope(strScope),
        blnIsAllowed: normalizeAccessScope(strScope) !== "none",
      })),
    );
  }

  function fnToggleNodeAllowed(intMenuID: number, blnIsAllowed: boolean) {
    setLstNodes((lstPrevious) => mapNodeDeep(lstPrevious, intMenuID, (objNode) => mutateNodeTree(objNode, blnIsAllowed)));
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

  async function saveRights() {
    setBlnSaving(true);
    try {
      await securityApiService.saveUserGroupRights(intUserGroupID, flattenRights(lstNodes));
      setObjToast({ open: true, message: "Menu and action rights saved successfully.", severity: "success" });
      await loadRights();
    } catch (objError) {
      setObjToast({
        open: true,
        message: objError instanceof Error ? objError.message : "Unable to save rights.",
        severity: "error",
      });
    } finally {
      setBlnSaving(false);
    }
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        minHeight: 0,
        height: "100%",
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: blnEmbedded ? "1fr" : { xs: "1fr", xl: "minmax(260px, 340px) minmax(0, 1fr)" },
          gap: 1.5,
        }}
      >
        {!blnEmbedded ? (
        <Box
          sx={{
            borderRadius: 4,
            border: "1px solid #dbe7f0",
            background: "linear-gradient(180deg, rgba(239,246,255,0.88) 0%, rgba(255,255,255,0.96) 100%)",
            p: 2,
          }}
        >
          <Typography sx={{ fontSize: "0.82rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Selected Group
          </Typography>
          <Typography sx={{ mt: 0.8, fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
            {strGroupName || "User Group"}
          </Typography>
          <Typography sx={{ mt: 0.35, color: "#64748b", fontWeight: 600 }}>
            {strGroupCode || `Group #${intUserGroupID}`}
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
            <Chip label={`${intAllowedCount} allowed`} sx={{ fontWeight: 700, bgcolor: "rgba(14,165,233,0.12)", color: "#0369a1" }} />
            <Chip label={`${intTotalActions} actions`} sx={{ fontWeight: 700, bgcolor: "rgba(15,23,42,0.08)", color: "#334155" }} />
          </Stack>
        </Box>
        ) : null}

        <Box
          sx={{
            borderRadius: 4,
            border: "1px solid #dbe7f0",
            backgroundColor: "#fff",
            p: 1.5,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) auto auto auto auto" },
            gap: 1.25,
            alignItems: "center",
          }}
        >
          <TextField
            controlId="security.user-group-rights-matrix.search.input"
            placeholder="Search menu, module, or action"
            value={strSearch}
            onChange={(objEvent) => setStrSearch(objEvent.target.value)}
            InputProps={{
              startAdornment: <SearchRoundedIcon sx={{ mr: 1, color: "#64748b" }} />,
            }}
          />
          <Button
            controlId="security.user-group-rights-matrix.expand-all.button"
            variant="outlined"
            startIcon={<ExpandMoreRoundedIcon />}
            onClick={() => setObjExpandedMenuIDs(new Set(collectMenuIDs(lstNodes)))}
            sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 700 }}
          >
            Expand All
          </Button>
          <Button
            controlId="security.user-group-rights-matrix.collapse-all.button"
            variant="outlined"
            startIcon={<ExpandLessRoundedIcon />}
            onClick={() => setObjExpandedMenuIDs(new Set())}
            sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 700 }}
          >
            Collapse All
          </Button>
          <Button
            controlId="security.user-group-rights-matrix.reset.button"
            variant="outlined"
            startIcon={<RestartAltRoundedIcon />}
            disabled={blnReadOnly}
            onClick={() => {
              setLstNodes(lstInitialNodes);
              setStrSearch("");
              setObjExpandedMenuIDs(new Set(collectMenuIDs(lstInitialNodes)));
            }}
            sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 700 }}
          >
            Reset
          </Button>
          <Button
            controlId="security.user-group-rights-matrix.save.button"
            variant="contained"
            startIcon={<SaveRoundedIcon />}
            disabled={blnReadOnly}
            onClick={saveRights}
            sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 700 }}
          >
            {blnReadOnly ? "View Only" : "Save Rights"}
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          borderRadius: 4,
          border: "1px solid #dbe7f0",
          backgroundColor: "#fff",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 140px" },
            gap: 1.25,
            px: 2,
            py: 1.4,
            borderBottom: "1px solid #dbe7f0",
            background: "linear-gradient(180deg, rgba(248,250,252,0.98), rgba(241,245,249,0.92))",
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <TuneRoundedIcon sx={{ color: "#1d4ed8" }} />
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>Menu / Action Hierarchy</Typography>
          </Stack>
          <Typography sx={{ fontWeight: 800, color: "#334155", textAlign: { xs: "left", md: "center" } }}>
            Access Scope
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          {lstFilteredNodes.length === 0 && !blnLoading ? (
            <Box sx={{ display: "grid", placeItems: "center", minHeight: 220, px: 3 }}>
              <Stack spacing={1} alignItems="center">
                <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>No matching rights nodes</Typography>
                <Typography sx={{ color: "#64748b", textAlign: "center" }}>
                  Adjust the search filter or reset the current rights state.
                </Typography>
              </Stack>
            </Box>
          ) : (
            lstFilteredNodes.map((objNode) =>
              renderNodeRows(
                objNode,
                objExpandedMenuIDs,
                fnToggleExpand,
                fnToggleNodeAllowed,
                fnToggleAllowed,
                fnChangeScope,
                blnReadOnly,
              ),
            )
          )}
        </Box>
      </Box>

      <BlockingLoader blnOpen={blnLoading || blnSaving} strLabel={blnLoading ? "Loading rights..." : "Saving rights..."} />
      <Snackbar open={objToast.open} autoHideDuration={3000} onClose={() => setObjToast((objPrevious) => ({ ...objPrevious, open: false }))}>
        <Alert severity={objToast.severity} variant="filled">
          {objToast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
