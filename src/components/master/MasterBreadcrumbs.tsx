"use client";

import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import { Breadcrumbs, Typography } from "@mui/material";

type MasterBreadcrumbsProps = {
  strCurrent: string;
};

export default function MasterBreadcrumbs({ strCurrent }: MasterBreadcrumbsProps) {
  return (
    <Breadcrumbs aria-label="breadcrumb" separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />} sx={{ fontSize: 13, py: 0.5, ml: "3px" }}>
      <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>Masters</Typography>
      <Typography component="h1" aria-current="page" sx={{ fontSize: "inherit", fontWeight: 700, color: "#243b53" }}>{strCurrent}</Typography>
    </Breadcrumbs>
  );
}
