"use client";

import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
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
      borderRadius: "18px",
      mb: 0.5,
      minHeight: 48,
      alignItems: "center",
      pl: 1.5 + intDepth * 2,
      backgroundColor: blnIsActive ? "rgba(14,116,144,0.12)" : "transparent",
      border: blnIsActive ? "1px solid rgba(14,116,144,0.22)" : "1px solid transparent"
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
                  <WorkspacesRoundedIcon color="primary" />
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
                          {objChild.blnIsHome ? <DashboardRoundedIcon color="primary" /> : <WorkspacesRoundedIcon color="primary" />}
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
              {objItem.blnIsHome ? <DashboardRoundedIcon color="primary" /> : <WorkspacesRoundedIcon color="primary" />}
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
