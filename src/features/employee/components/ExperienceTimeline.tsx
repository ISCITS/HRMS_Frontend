"use client";

import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import { Box, Collapse, IconButton, Menu, MenuItem, Typography } from "@mui/material";
import { useState, type MouseEvent } from "react";

import type { EmployeeExperienceRecord } from "@/features/employee/types";
import styles from "./ExperienceTimeline.module.css";

type Props = {
  records: EmployeeExperienceRecord[];
  viewOnly: boolean;
  canDelete: boolean;
  onEdit: (record: EmployeeExperienceRecord) => void;
  onDelete: (id: number) => void;
  t: (key: string, fallback: string) => string;
};

function formatMonth(value: string | null, present: string) {
  if (!value) return present;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(date);
}

function formatDuration(record: EmployeeExperienceRecord) {
  const start = new Date(`${record.dtFromDate.slice(0, 10)}T00:00:00`);
  const end = record.dtToDate ? new Date(`${record.dtToDate.slice(0, 10)}T00:00:00`) : new Date();
  if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start) {
    const months = Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth());
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (years && remainingMonths) return `${years} ${years === 1 ? "yr" : "yrs"} ${remainingMonths} mos`;
    if (years) return `${years} ${years === 1 ? "yr" : "yrs"}`;
    return `${remainingMonths} ${remainingMonths === 1 ? "mo" : "mos"}`;
  }
  return record.decTotalYears == null ? "—" : `${record.decTotalYears} yrs`;
}

export default function ExperienceTimeline({ records, viewOnly, canDelete, onEdit, onDelete, t }: Props) {
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; record: EmployeeExperienceRecord } | null>(null);

  if (!records.length) {
    return <Typography className={styles.empty}>{t("experience_empty", "No experience records added yet.")}</Typography>;
  }

  return (
    <Box className={styles.timeline}>
      {[...records].sort((a, b) => b.dtFromDate.localeCompare(a.dtFromDate)).map((record, index) => {
        const expanded = expandedIds.includes(record.intID);
        const initials = record.strCompanyName.trim().split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "?";
        return (
          <Box className={styles.entry} key={record.intID}>
            <span className={`${styles.dot} ${index === 0 ? styles.currentDot : ""}`} aria-hidden="true" />
            <Box className={styles.card}>
              <Box className={styles.summary}>
                <Box className={`${styles.avatar} ${styles[`avatar${index % 3}`]}`}>{initials}</Box>
                <Box className={styles.company}>
                  <Typography className={styles.companyName}>{record.strCompanyName}</Typography>
                  <Typography className={styles.jobTitle}>{record.strJobTitle}</Typography>
                </Box>
                <Box className={styles.metric}>
                  <Typography className={styles.metricLabel}>{t("field_period", "Period")}</Typography>
                  <Typography className={styles.metricValue}>{formatMonth(record.dtFromDate, "")} – {formatMonth(record.dtToDate, t("present", "Present"))}</Typography>
                </Box>
                <Box className={styles.metric}>
                  <Typography className={styles.metricLabel}>{t("field_duration", "Duration")}</Typography>
                  <Typography className={styles.metricValue}>{formatDuration(record)}</Typography>
                </Box>
                <Box className={styles.metric}>
                  <Typography className={styles.metricLabel}>{t("field_last_drawn_salary", "Last drawn salary")}</Typography>
                  <Typography className={styles.metricValue}>{record.decLastDrawnSalary == null ? "—" : `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(record.decLastDrawnSalary)}`}</Typography>
                </Box>
                {!viewOnly ? (
                  <IconButton className={styles.moreButton} size="small" aria-label={`${t("actions", "Actions")}: ${record.strCompanyName}`} onClick={(event: MouseEvent<HTMLButtonElement>) => setMenu({ anchor: event.currentTarget, record })}>
                    <MoreVertRoundedIcon fontSize="small" />
                  </IconButton>
                ) : null}
              </Box>
              <Box className={styles.details}>
                <button className={styles.expandButton} type="button" aria-expanded={expanded} onClick={() => setExpandedIds((ids) => expanded ? ids.filter((id) => id !== record.intID) : [...ids, record.intID])}>
                  <ExpandMoreRoundedIcon className={expanded ? styles.rotated : ""} fontSize="small" />
                  {t("experience_responsibilities_reason", "Responsibilities & reason for leaving")}
                </button>
                <Collapse in={expanded}>
                  <Box className={styles.detailContent}>
                    <Box><Typography className={styles.metricLabel}>{t("field_responsibilities", "Responsibilities")}</Typography><Typography className={styles.detailValue}>{record.strResponsibilities || "—"}</Typography></Box>
                    <Box><Typography className={styles.metricLabel}>{t("field_reason_for_leaving", "Reason for leaving")}</Typography><Typography className={styles.detailValue}>{record.strReasonForLeaving || "—"}</Typography></Box>
                  </Box>
                </Collapse>
              </Box>
            </Box>
          </Box>
        );
      })}
      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
        <MenuItem data-controlid="employee.editor.experience.row.edit.button" data-row-key={menu?.record.intID} onClick={() => { if (menu) onEdit(menu.record); setMenu(null); }}>{t("edit", "Edit")}</MenuItem>
        {canDelete && menu?.record.blnIsActive ? <MenuItem data-controlid="employee.editor.experience.row.delete.button" data-row-key={menu.record.intID} onClick={() => { if (menu) onDelete(menu.record.intID); setMenu(null); }}>{t("delete", "Delete")}</MenuItem> : null}
      </Menu>
    </Box>
  );
}
