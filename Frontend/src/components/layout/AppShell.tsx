"use client";

import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import CloseIcon from "@mui/icons-material/Close";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import PlayCircleOutlineOutlinedIcon from "@mui/icons-material/PlayCircleOutlineOutlined";
import TimeToLeaveOutlinedIcon from "@mui/icons-material/TimeToLeaveOutlined";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import WalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import {
  AppBar,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography
} from "@mui/material";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import dicConstant from "@/constants/Constant.json";

const drawerWidth = 264;

type MenuChild = {
  label: string;
  href: string;
  icon: ReactNode;
};

type MenuItem = {
  label: string;
  href?: string;
  icon: ReactNode;
  submenuKey?: "employees" | "leave" | "payroll";
  children?: MenuChild[];
};

type MenuGroup = {
  strLabel: string;
  lstItems: MenuItem[];
};

const lstMainItems: MenuItem[] = [
  { label: dicConstant.appShell.nav.dashboard, href: "/dashboard", icon: <DashboardOutlinedIcon /> }
];

const lstManagementItems: MenuItem[] = [
  {
    label: dicConstant.appShell.nav.employees,
    submenuKey: "employees",
    icon: <GroupOutlinedIcon />,
    children: [
      { label: dicConstant.appShell.nav.employeeList, href: "/employees", icon: <BadgeOutlinedIcon fontSize="small" /> },
      { label: dicConstant.appShell.nav.addEmployee, href: "/employees/new", icon: <PersonAddAltOutlinedIcon fontSize="small" /> },
      { label: dicConstant.appShell.nav.departmentMaster, href: "/departments", icon: <BusinessOutlinedIcon fontSize="small" /> },
      { label: dicConstant.appShell.nav.departmentMasterInline, href: "/departments-inline", icon: <ViewListOutlinedIcon fontSize="small" /> }
    ]
  },
  {
    label: dicConstant.appShell.nav.leave,
    submenuKey: "leave",
    icon: <TimeToLeaveOutlinedIcon />,
    children: [
      { label: dicConstant.appShell.nav.leaveRequests, href: "/leave", icon: <EventNoteOutlinedIcon fontSize="small" /> },
      { label: dicConstant.appShell.nav.applyLeave, href: "/leave/apply", icon: <EventAvailableOutlinedIcon fontSize="small" /> }
    ]
  },
  {
    label: dicConstant.appShell.nav.payroll,
    submenuKey: "payroll",
    icon: <PaymentsOutlinedIcon />,
    children: [
      { label: dicConstant.appShell.nav.payrollOverview, href: "/payroll", icon: <WalletOutlinedIcon fontSize="small" /> },
      { label: dicConstant.appShell.nav.runPayroll, href: "/payroll/run", icon: <PlayCircleOutlineOutlinedIcon fontSize="small" /> },
      { label: dicConstant.appShell.nav.payslips, href: "/payroll/payslips", icon: <DescriptionOutlinedIcon fontSize="small" /> }
    ]
  },
  { label: dicConstant.appShell.nav.attendance, href: "/attendance", icon: <AssignmentTurnedInOutlinedIcon /> },
  { label: dicConstant.appShell.nav.profile, href: "/profile", icon: <PersonOutlineOutlinedIcon /> }
];

const lstNavGroups: MenuGroup[] = [
  { strLabel: "MAIN", lstItems: lstMainItems },
  { strLabel: "MANAGEMENT", lstItems: lstManagementItems }
];

type NavItemRowProps = {
  strLabel: string;
  icon: ReactNode;
  intIsActive: 0 | 1;
  href?: string;
  onClick: () => void;
  endAdornment?: ReactNode;
  intIsSubItem?: 0 | 1;
  intIsLogout?: 0 | 1;
};

// Renders one reusable sidebar navigation row with active/hover variants.
function NavItemRow({
  strLabel,
  icon,
  intIsActive,
  href,
  onClick,
  endAdornment,
  intIsSubItem = 0,
  intIsLogout = 0
}: NavItemRowProps) {
  const dicBaseSx = {
    mx: intIsSubItem === 1 ? 2 : 1,
    px: 1.5,
    pl: intIsSubItem === 1 ? 4.25 : 1.5,
    minHeight: intIsSubItem === 1 ? 40 : 44,
    borderRadius: "8px",
    borderLeft: intIsActive === 1 ? "3px solid #2563eb" : "3px solid transparent",
    backgroundColor: intIsActive === 1 ? "rgba(37,99,235,0.08)" : "transparent",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: intIsLogout === 1 ? "rgba(239,68,68,0.08)" : "rgba(37,99,235,0.05)",
      transform: "scale(1.01)"
    }
  } as const;

  const dicTextColor = intIsLogout === 1 ? "#475569" : intIsSubItem === 1 ? "#475569" : "#334155";
  const dicIconColor = intIsLogout === 1 ? "#64748b" : intIsActive === 1 ? "primary.main" : "#64748b";

  if (href) {
    return (
      <ListItemButton component={Link} href={href} selected={intIsActive === 1} onClick={onClick} sx={dicBaseSx}>
        <ListItemIcon sx={{ color: dicIconColor, minWidth: intIsSubItem === 1 ? 30 : 36, transition: "all 0.2s ease" }}>
          {icon}
        </ListItemIcon>
        <ListItemText primary={strLabel} primaryTypographyProps={{ fontWeight: intIsActive === 1 ? 600 : 500, fontSize: 14, color: dicTextColor }} />
        {endAdornment}
      </ListItemButton>
    );
  }

  return (
    <ListItemButton selected={intIsActive === 1} onClick={onClick} sx={dicBaseSx}>
      <ListItemIcon sx={{ color: dicIconColor, minWidth: intIsSubItem === 1 ? 30 : 36, transition: "all 0.2s ease" }}>
        {icon}
      </ListItemIcon>
      <ListItemText primary={strLabel} primaryTypographyProps={{ fontWeight: intIsActive === 1 ? 600 : 500, fontSize: 14, color: dicTextColor }} />
      {endAdornment}
    </ListItemButton>
  );
}

// Provides the main app chrome with responsive sidebar navigation and top bar.
export default function AppShell({ children }: { children: ReactNode }) {
  /*
  Functional responsibility:
  - Provide primary application shell: app bar, responsive drawer, and nested content area.
  
  Inputs:
  - children route content rendered in main panel.
  
  Output:
  - Responsive navigation with submenu state and theme-toggle interaction.
  
  Failure behavior:
  - Unknown routes simply result in no selected nav item; shell still renders.
  */
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [intIsLogoutDialogOpen, setIntIsLogoutDialogOpen] = useState(0);
  const [openSubmenus, setOpenSubmenus] = useState({
    employees:
      pathname.startsWith("/employees") ||
      pathname.startsWith("/departments") ||
      pathname.startsWith("/departments-inline"),
    leave: pathname.startsWith("/leave"),
    payroll: pathname.startsWith("/payroll")
  });
  useEffect(() => {
    if (
      pathname.startsWith("/employees") ||
      pathname.startsWith("/departments") ||
      pathname.startsWith("/departments-inline")
    ) {
      setOpenSubmenus((prev) => ({ ...prev, employees: true }));
    }
    if (pathname.startsWith("/leave")) {
      setOpenSubmenus((prev) => ({ ...prev, leave: true }));
    }
    if (pathname.startsWith("/payroll")) {
      setOpenSubmenus((prev) => ({ ...prev, payroll: true }));
    }
  }, [pathname]);

  const toggleSubmenu = (key: "employees" | "leave" | "payroll") => {
    setOpenSubmenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isChildActive = (href: string) => pathname === href;
  const isParentActive = (children: MenuChild[]) => children.some((child) => pathname.startsWith(child.href));
  const strLogoutPath = "/logout";

  const handleLogoutClick = () => {
    setIntIsLogoutDialogOpen(1);
  };

  const handleLogoutCancel = () => {
    setIntIsLogoutDialogOpen(0);
  };

  const handleLogoutConfirm = () => {
    setIntIsLogoutDialogOpen(0);
    setMobileOpen(false);
    router.push(strLogoutPath);
  };

  const drawerContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "#ffffff" }}>
      <Toolbar sx={{ display: "flex", justifyContent: "space-between", px: 2.25 }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <ApartmentOutlinedIcon sx={{ mr: 1, color: "primary.main" }} />
          <Typography variant="h6" fontWeight={700}>
            {dicConstant.appShell.brand}
          </Typography>
        </Box>
        <IconButton
          aria-label="Close navigation menu"
          onClick={() => {
            setMobileOpen(false);
            setDesktopOpen(false);
          }}
          sx={{ display: { xs: "inline-flex", md: "inline-flex" } }}
        >
          <CloseIcon />
        </IconButton>
      </Toolbar>

      <Box sx={{ flex: 1, overflowY: "auto", pb: 1 }}>
        <List sx={{ pt: 0.5 }}>
          {lstNavGroups.map((dicGroup, intGroupIndex) => (
            <Box key={dicGroup.strLabel} sx={{ mt: intGroupIndex === 0 ? 0 : 2.5 }}>
              <Typography sx={{ px: 2, mb: 1, fontSize: 11, letterSpacing: 1, color: "#94a3b8", fontWeight: 700 }}>
                {dicGroup.strLabel}
              </Typography>

              {dicGroup.lstItems.map((dicItem) => {
                if (!dicItem.children) {
                  const intIsActive = pathname === dicItem.href ? 1 : 0;
                  return (
                    <NavItemRow
                      key={dicItem.label}
                      strLabel={dicItem.label}
                      icon={dicItem.icon}
                      href={dicItem.href}
                      intIsActive={intIsActive as 0 | 1}
                      onClick={() => setMobileOpen(false)}
                    />
                  );
                }

                const submenuKey = dicItem.submenuKey as "employees" | "leave" | "payroll";
                const intIsOpen = openSubmenus[submenuKey] ? 1 : 0;
                const intIsActive = isParentActive(dicItem.children) ? 1 : 0;

                return (
                  <Box key={dicItem.label}>
                    <NavItemRow
                      strLabel={dicItem.label}
                      icon={dicItem.icon}
                      intIsActive={intIsActive as 0 | 1}
                      onClick={() => toggleSubmenu(submenuKey)}
                      endAdornment={intIsOpen === 1 ? <ExpandLess sx={{ color: "#64748b" }} /> : <ExpandMore sx={{ color: "#64748b" }} />}
                    />

                    <Collapse in={intIsOpen === 1} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding sx={{ mt: 0.25 }}>
                        {dicItem.children.map((dicChild) => {
                          const intIsChildActive = isChildActive(dicChild.href) ? 1 : 0;
                          return (
                            <NavItemRow
                              key={dicChild.href}
                              strLabel={dicChild.label}
                              icon={dicChild.icon}
                              href={dicChild.href}
                              intIsActive={intIsChildActive as 0 | 1}
                              intIsSubItem={1}
                              onClick={() => setMobileOpen(false)}
                            />
                          );
                        })}
                      </List>
                    </Collapse>
                  </Box>
                );
              })}
            </Box>
          ))}
        </List>
      </Box>

      <Box sx={{ py: 0.4, px: 0.8, bgcolor: "#ffffff" }}>
        <List disablePadding>
          <NavItemRow
            strLabel={dicConstant.appShell.logout}
            icon={<LogoutOutlinedIcon />}
            intIsActive={0}
            intIsLogout={1}
            onClick={handleLogoutClick}
          />
        </List>
      </Box>

      <Dialog
        open={Boolean(intIsLogoutDialogOpen)}
        onClose={handleLogoutCancel}
        aria-labelledby="logout-confirm-title"
        aria-describedby="logout-confirm-description"
      >
        <DialogTitle id="logout-confirm-title">{dicConstant.appShell.logoutDialogTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText id="logout-confirm-description">{dicConstant.appShell.logoutDialogMessage}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLogoutCancel}>{dicConstant.common.cancel}</Button>
          <Button onClick={handleLogoutConfirm} color="error" variant="contained" autoFocus>
            {dicConstant.appShell.logoutConfirmButton}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Top bar with title and mobile/desktop nav triggers */}
      <AppBar
        position="fixed"
        color="inherit"
        sx={{
          width: { md: desktopOpen ? `calc(100% - ${drawerWidth}px)` : "100%" },
          ml: { md: desktopOpen ? `${drawerWidth}px` : 0 },
          transition: "all 0.2s ease",
          boxShadow: "none",
          borderBottom: "none"
        }}
      >
        <Toolbar sx={{ minHeight: 72 }}>
          <Box sx={{ width: 48, display: "flex", justifyContent: "flex-start" }}>
            <IconButton edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ display: { md: "none" } }}>
              <MenuIcon />
            </IconButton>
            <IconButton edge="start" onClick={() => setDesktopOpen((prev) => !prev)} sx={{ display: { xs: "none", md: "inline-flex" } }}>
              <MenuIcon />
            </IconButton>
          </Box>
          <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center" }}>
            <Typography variant="h6" sx={{ textAlign: "center", letterSpacing: 0.2 }}>
              {dicConstant.appShell.title}
            </Typography>
          </Box>
          <Box sx={{ width: 48 }} />
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: desktopOpen ? drawerWidth : 0 }, flexShrink: { md: 0 } }}>
        {/* Temporary drawer on small screens */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderRadius: 0,
              backgroundColor: "#ffffff",
              borderRight: "none"
            }
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Permanent drawer on desktop */}
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", md: desktopOpen ? "block" : "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderRadius: 0,
              backgroundColor: "#ffffff",
              borderRight: "none"
            }
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          boxSizing: "border-box",
          p: { xs: 1.5, sm: 2, md: 2.5 },
          width: { md: desktopOpen ? `calc(100% - ${drawerWidth}px)` : "100%" },
          minHeight: "100vh",
          overflowX: "hidden",
          transition: "all 0.2s ease"
        }}
      >
        <Toolbar sx={{ minHeight: 72 }} />
        {children}
      </Box>
    </Box>
  );
}
