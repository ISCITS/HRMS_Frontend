"use client";

import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import GradeRoundedIcon from "@mui/icons-material/GradeRounded";
import Groups2RoundedIcon from "@mui/icons-material/Groups2Rounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import SourceRoundedIcon from "@mui/icons-material/SourceRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import WorkspacesRoundedIcon from "@mui/icons-material/WorkspacesRounded";
import { Box, Collapse, List, ListItemButton, ListItemIcon, ListItemText, Typography } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, type ReactNode, useEffect, useMemo, useState } from "react";

import type { MenuItem } from "@/models/AuthModels";

type DynamicMenuProps = {
  lstMenuItems: MenuItem[];
  onNavigate?: () => void;
};

const objMenuIconSx = { color: "inherit" };

function getMenuIcon(objItem: MenuItem) {
  const strIconName = (objItem as MenuItem & { strIconName?: string | null }).strIconName?.toLowerCase() ?? "";
  if (objItem.blnIsHome) {
    return <DashboardRoundedIcon sx={objMenuIconSx} />;
  }

  const strRoute = (objItem.strRoute ?? "").toLowerCase();
  const strModuleName = objItem.strModuleName.toLowerCase();
  const strModuleCode = objItem.strModuleCode.toLowerCase();
  const strLookupKey = `${strIconName} ${strModuleCode} ${strModuleName} ${strRoute}`;

  if (strLookupKey.includes("bank")) {
    return <AccountBalanceRoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("location")) {
    return <LocationOnRoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("country") || strLookupKey.includes("state")) {
    return <PublicRoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("grade")) {
    return <GradeRoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("cost center") || strLookupKey.includes("cost-center") || strLookupKey.includes("costcenter")) {
    return <AccountTreeRoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("department")) {
    return <ApartmentRoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("designation")) {
    return <BadgeRoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("payroll")) {
    return <PaymentsRoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("employee") || strLookupKey.includes("user")) {
    return <Groups2RoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("profile")) {
    return <PersonRoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("report")) {
    return <SourceRoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("setting")) {
    return <SettingsRoundedIcon sx={objMenuIconSx} />;
  }

  if (strLookupKey.includes("theme")) {
    return <TuneRoundedIcon sx={objMenuIconSx} />;
  }

  return <WorkspacesRoundedIcon sx={objMenuIconSx} />;
}

export default function DynamicMenu({ lstMenuItems, onNavigate }: DynamicMenuProps) {
  const strPathname = usePathname();
  function hasActiveDescendant(objItem: MenuItem): boolean {
    return objItem.lstChildren.some(
      (objChild) => objChild.strRoute === strPathname || hasActiveDescendant(objChild),
    );
  }

  function collectExpandableDefaults(lstItems: MenuItem[]): Record<string, boolean> {
    return Object.fromEntries(
      lstItems.flatMap((objItem) => {
        if (objItem.lstChildren.length === 0) {
          return [];
        }

        return [
          [objItem.strModuleCode, hasActiveDescendant(objItem)],
          ...Object.entries(collectExpandableDefaults(objItem.lstChildren)),
        ];
      }),
    );
  }

  const dicDefaultExpanded = useMemo(
    () => collectExpandableDefaults(lstMenuItems),
    [lstMenuItems, strPathname],
  );
  const [dicExpandedMenus, setDicExpandedMenus] = useState<Record<string, boolean>>(dicDefaultExpanded);

  useEffect(() => {
    setDicExpandedMenus((dicPrevious) => ({
      ...dicPrevious,
      ...collectExpandableDefaults(lstMenuItems),
    }));
  }, [lstMenuItems, strPathname]);

  function toggleMenu(strModuleCode: string) {
    setDicExpandedMenus((dicPrevious) => ({
      ...dicPrevious,
      [strModuleCode]: !dicPrevious[strModuleCode],
    }));
  }

  function getButtonStyles(blnIsActive: boolean, intDepth = 0) {
    return {
      borderRadius: "18px",
      mb: 0.5,
      minHeight: intDepth === 0 ? 50 : 44,
      alignItems: "center",
      pl: 1.5 + intDepth * 2,
      pr: 1.25,
      background: blnIsActive
        ? "linear-gradient(135deg, rgba(219,234,254,0.92), rgba(224,242,254,0.88))"
        : "transparent",
      border: blnIsActive ? "1px solid rgba(96, 165, 250, 0.28)" : "1px solid transparent",
      boxShadow: blnIsActive ? "0 10px 24px rgba(59, 130, 246, 0.12)" : "none",
      transition: "all 160ms ease",
      "&:hover": {
        background: blnIsActive
          ? "linear-gradient(135deg, rgba(219,234,254,0.96), rgba(224,242,254,0.92))"
          : "rgba(241,245,249,0.9)"
      }
    };
  }

  function renderMenuItem(objItem: MenuItem, intDepth = 0): ReactNode {
    const blnIsActive = objItem.strRoute === strPathname;
    const blnHasChildren = objItem.lstChildren.length > 0;
    const blnHasActiveChild = hasActiveDescendant(objItem);
    const blnExpanded = dicExpandedMenus[objItem.strModuleCode] ?? blnHasActiveChild;

    if (blnHasChildren) {
      return (
        <Fragment key={`${objItem.strModuleCode}-${intDepth}`}>
          <ListItemButton onClick={() => toggleMenu(objItem.strModuleCode)} sx={getButtonStyles(blnHasActiveChild, intDepth)}>
            <ListItemIcon sx={{ minWidth: 38, color: blnHasActiveChild ? "#2563eb" : "#64748b" }}>
              {getMenuIcon(objItem)}
            </ListItemIcon>
            <ListItemText
              primary={objItem.strModuleName}
              primaryTypographyProps={{
                fontWeight: 700,
                color: "#0f172a",
                fontSize: intDepth === 0 ? "0.96rem" : "0.9rem",
              }}
            />
            {blnExpanded ? <ExpandLessRoundedIcon sx={{ color: "#2563eb" }} /> : <ExpandMoreRoundedIcon sx={{ color: "#2563eb" }} />}
          </ListItemButton>

          <Collapse in={blnExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ position: "relative", ml: intDepth === 0 ? 1.25 : 0.5, mt: 0.25, mb: 0.5 }}>
              <List disablePadding>
                {objItem.lstChildren.map((objChild) => renderMenuItem(objChild, intDepth + 1))}
              </List>
            </Box>
          </Collapse>
        </Fragment>
      );
    }

    return (
      <ListItemButton
        key={objItem.strRoute ?? objItem.strModuleCode}
        component={Link}
        href={objItem.strRoute ?? "#"}
        onClick={onNavigate}
        sx={getButtonStyles(blnIsActive, intDepth)}
      >
        <ListItemIcon sx={{ minWidth: 38, color: blnIsActive ? "#2563eb" : "#64748b" }}>
          {getMenuIcon(objItem)}
        </ListItemIcon>
        <ListItemText
          primary={objItem.strModuleName}
          primaryTypographyProps={{
            fontWeight: blnIsActive ? 700 : 600,
            color: intDepth === 0 ? "#0f172a" : "#334155",
            fontSize: intDepth === 0 ? "0.96rem" : "0.9rem",
          }}
        />
      </ListItemButton>
    );
  }

  return (
    <List sx={{ mt: 0 }}>
      {lstMenuItems.map((objItem) => renderMenuItem(objItem))}
    </List>
  );
}
