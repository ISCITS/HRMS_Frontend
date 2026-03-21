"use client";

import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import WorkspacesRoundedIcon from "@mui/icons-material/WorkspacesRounded";
import { Box, Chip, List, ListItemButton, ListItemIcon, ListItemText, Typography } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { MenuItem } from "@/models/AuthModels";

type DynamicMenuProps = {
  lstMenuItems: MenuItem[];
  onNavigate?: () => void;
};

export default function DynamicMenu({ lstMenuItems, onNavigate }: DynamicMenuProps) {
  const strPathname = usePathname();

  return (
    <Box>
      <Typography variant="overline" sx={{ color: "#64748b", px: 1.5 }}>
        Dynamic navigation
      </Typography>
      <List sx={{ mt: 1 }}>
        {lstMenuItems.map((objItem) => {
          const blnIsActive = strPathname === objItem.strRoute;
          return (
            <ListItemButton
              key={objItem.strRoute}
              component={Link}
              href={objItem.strRoute}
              onClick={onNavigate}
              sx={{
                borderRadius: "18px",
                mb: 0.75,
                alignItems: "flex-start",
                backgroundColor: blnIsActive ? "rgba(14,116,144,0.12)" : "transparent",
                border: blnIsActive ? "1px solid rgba(14,116,144,0.22)" : "1px solid transparent"
              }}
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
