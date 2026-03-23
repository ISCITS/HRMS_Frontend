"use client";

import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import WorkspacesRoundedIcon from "@mui/icons-material/WorkspacesRounded";
import { Box, Chip, Collapse, List, ListItemButton, ListItemIcon, ListItemText, Typography } from "@mui/material";
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
      mb: 0.75,
      alignItems: "flex-start",
      pl: 1.5 + intDepth * 2,
      backgroundColor: blnIsActive ? "rgba(14,116,144,0.12)" : "transparent",
      border: blnIsActive ? "1px solid rgba(14,116,144,0.22)" : "1px solid transparent"
    };
  }

  return (
    <Box>
      <Typography variant="overline" sx={{ color: "#64748b", px: 1.5 }}>
        Dynamic navigation
      </Typography>
      <List sx={{ mt: 1 }}>
        {lstMenuItems.map((objItem) => {
          const blnIsActive = objItem.strRoute === strPathname;
          const blnHasChildren = objItem.lstChildren.length > 0;
          const blnHasActiveChild = objItem.lstChildren.some((objChild) => objChild.strRoute === strPathname);
          const blnExpanded = dicExpandedMenus[objItem.strModuleCode] ?? blnHasActiveChild;

          if (blnHasChildren) {
            return (
              <Fragment key={objItem.strModuleCode}>
                <ListItemButton onClick={() => toggleMenu(objItem.strModuleCode)} sx={getButtonStyles(blnHasActiveChild)}>
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>
                    <WorkspacesRoundedIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={objItem.strModuleName}
                    secondary={
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1 }}>
                        {objItem.lstChildren.slice(0, 3).map((objChild) => (
                          <Chip
                            key={objChild.strModuleCode}
                            label={objChild.strModuleName}
                            size="small"
                            sx={{ borderRadius: "10px", backgroundColor: "#ecfeff", color: "#155e75" }}
                          />
                        ))}
                      </Box>
                    }
                    primaryTypographyProps={{ fontWeight: 700, color: "#0f172a" }}
                    secondaryTypographyProps={{ component: "div" }}
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
                          <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>
                            {objChild.blnIsHome ? <DashboardRoundedIcon color="primary" /> : <WorkspacesRoundedIcon color="primary" />}
                          </ListItemIcon>
                          <ListItemText
                            primary={objChild.strModuleName}
                            secondary={
                              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1 }}>
                                {objChild.lstPermissionCodes.slice(0, 3).map((strPermissionCode) => (
                                  <Chip
                                    key={strPermissionCode}
                                    label={strPermissionCode}
                                    size="small"
                                    sx={{ borderRadius: "10px", backgroundColor: "#ecfeff", color: "#155e75" }}
                                  />
                                ))}
                              </Box>
                            }
                            primaryTypographyProps={{ fontWeight: 700, color: "#0f172a" }}
                            secondaryTypographyProps={{ component: "div" }}
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
              <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>
                {objItem.blnIsHome ? <DashboardRoundedIcon color="primary" /> : <WorkspacesRoundedIcon color="primary" />}
              </ListItemIcon>
              <ListItemText
                primary={objItem.strModuleName}
                secondary={
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1 }}>
                    {objItem.lstPermissionCodes.slice(0, 3).map((strPermissionCode) => (
                      <Chip
                        key={strPermissionCode}
                        label={strPermissionCode}
                        size="small"
                        sx={{ borderRadius: "10px", backgroundColor: "#ecfeff", color: "#155e75" }}
                      />
                    ))}
                  </Box>
                }
                primaryTypographyProps={{ fontWeight: 700, color: "#0f172a" }}
                secondaryTypographyProps={{ component: "div" }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}
