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
import { Collapse, List, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";

import type { MenuItem } from "@/models/AuthModels";

type DynamicMenuProps = {
  lstMenuItems: MenuItem[];
  onNavigate?: () => void;
};

const objMenuIconSx = { color: "#f97316" };

function getMenuIcon(objItem: MenuItem) {
  if (objItem.blnIsHome) {
    return <DashboardRoundedIcon sx={objMenuIconSx} />;
  }

  const strRoute = (objItem.strRoute ?? "").toLowerCase();
  const strModuleName = objItem.strModuleName.toLowerCase();
  const strModuleCode = objItem.strModuleCode.toLowerCase();
  const strLookupKey = `${strModuleCode} ${strModuleName} ${strRoute}`;

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
  const dicDefaultExpanded = useMemo(
    () =>
      Object.fromEntries(
        lstMenuItems
          .filter((objItem) => objItem.lstChildren.length > 0)
          .map((objItem) => [
            objItem.strModuleCode,
            objItem.lstChildren.some((objChild) => objChild.strRoute === strPathname),
          ]),
      ),
    [lstMenuItems, strPathname],
  );
  const [dicExpandedMenus, setDicExpandedMenus] = useState<Record<string, boolean>>(dicDefaultExpanded);

  useEffect(() => {
    setDicExpandedMenus((dicPrevious) => ({
      ...dicPrevious,
      ...Object.fromEntries(
        lstMenuItems
          .filter((objItem) => objItem.lstChildren.some((objChild) => objChild.strRoute === strPathname))
          .map((objItem) => [objItem.strModuleCode, true]),
      ),
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
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
      borderTopRightRadius: "18px",
      borderBottomRightRadius: "18px",
      mb: 0.5,
      minHeight: 48,
      alignItems: "center",
      pl: 1.5 + intDepth * 2,
      backgroundColor: blnIsActive ? "var(--app-primary-soft)" : "transparent",
      border: blnIsActive ? "1px solid var(--app-primary-border)" : "1px solid transparent"
    };
  }

  return (
    <List sx={{ mt: 0 }}>
      {lstMenuItems.map((objItem) => {
        const blnIsActive = objItem.strRoute === strPathname;
        const blnHasChildren = objItem.lstChildren.length > 0;
        const blnHasActiveChild = objItem.lstChildren.some((objChild) => objChild.strRoute === strPathname);
        const blnExpanded = dicExpandedMenus[objItem.strModuleCode] ?? blnHasActiveChild;

        if (blnHasChildren) {
          return (
            <Fragment key={objItem.strModuleCode}>
              <ListItemButton onClick={() => toggleMenu(objItem.strModuleCode)} sx={getButtonStyles(blnHasActiveChild)}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {getMenuIcon(objItem)}
                </ListItemIcon>
                <ListItemText
                  primary={objItem.strModuleName}
                  primaryTypographyProps={{ fontWeight: 700, color: "#0f172a" }}
                />
                {blnExpanded ? <ExpandLessRoundedIcon color="primary" /> : <ExpandMoreRoundedIcon color="primary" />}
              </ListItemButton>

              <Collapse in={blnExpanded} timeout="auto" unmountOnExit>
                <List disablePadding sx={{ mt: 0.25 }}>
                  {objItem.lstChildren.map((objChild) => {
                    const blnIsChildActive = objChild.strRoute === strPathname;
                    return (
                      <ListItemButton
                        key={objChild.strModuleCode}
                        component={Link}
                        href={objChild.strRoute ?? "#"}
                        onClick={onNavigate}
                        sx={getButtonStyles(blnIsChildActive, 1)}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {getMenuIcon(objChild)}
                        </ListItemIcon>
                        <ListItemText
                          primary={objChild.strModuleName}
                          primaryTypographyProps={{ fontWeight: 700, color: "#0f172a" }}
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
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
            sx={getButtonStyles(blnIsActive)}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {getMenuIcon(objItem)}
            </ListItemIcon>
            <ListItemText
              primary={objItem.strModuleName}
              primaryTypographyProps={{ fontWeight: 700, color: "#0f172a" }}
            />
          </ListItemButton>
        );
      })}
    </List>
  );
}
