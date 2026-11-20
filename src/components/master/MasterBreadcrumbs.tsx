"use client";

import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import { Breadcrumbs, Typography } from "@mui/material";

type MasterBreadcrumbsProps = {
  strCurrent: string;
};

export default function MasterBreadcrumbs({ strCurrent }: MasterBreadcrumbsProps) {
  return (
    <Breadcrumbs className="app-breadcrumbs app-breadcrumbs-master" aria-label="breadcrumb" separator={<NavigateNextRoundedIcon className="app-breadcrumb-separator-icon" />}>
      <Typography className="app-breadcrumb-label">Masters</Typography>
      <Typography component="h1" className="app-breadcrumb-heading" aria-current="page">{strCurrent}</Typography>
    </Breadcrumbs>
  );
}
