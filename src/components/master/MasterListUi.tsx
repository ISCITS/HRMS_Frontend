"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import ViewColumnRoundedIcon from "@mui/icons-material/ViewColumnRounded";
import { Box, Breadcrumbs, Button, Checkbox, IconButton, Menu, MenuItem, Popover, Skeleton, Typography } from "@mui/material";
import { useState, type KeyboardEvent, type ReactNode } from "react";

import styles from "@/components/master/MasterScreen.module.css";

// Shared building blocks for list screens styled like the Department master:
// breadcrumb header, skeleton grid and the compact search-row grid.

type MasterBreadcrumbsProps = {
  strSection: string;
  strTitle: string;
};

export function MasterBreadcrumbs({ strSection, strTitle }: MasterBreadcrumbsProps) {
  return (
    <Breadcrumbs className="app-breadcrumbs" aria-label="breadcrumb" separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />} sx={{ ml: "3px" }}>
      <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>{strSection}</Typography>
      <Typography component="h1" className="app-breadcrumb-heading" aria-current="page">{strTitle}</Typography>
    </Breadcrumbs>
  );
}

type MasterStatusPillProps = {
  blnActive: boolean;
  strActiveLabel?: string;
  strInactiveLabel?: string;
};

export function MasterStatusPill({ blnActive, strActiveLabel = "Active", strInactiveLabel = "Inactive" }: MasterStatusPillProps) {
  return (
    <span className={`app-master-status-pill ${blnActive ? "app-master-status-active" : "app-master-status-inactive"}`}>
      {blnActive ? strActiveLabel : strInactiveLabel}
    </span>
  );
}

type MasterGridSkeletonProps = {
  strControlId: string;
  intColumns: number;
  intRows?: number;
};

export function MasterGridSkeleton({ strControlId, intColumns, intRows = 8 }: MasterGridSkeletonProps) {
  const strTemplate = `repeat(${intColumns}, 1fr)`;
  return (
    <Box data-control-id={strControlId} sx={{ border: "1px solid #e8eef5", borderRadius: "8px", overflow: "hidden", backgroundColor: "#fff" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, px: 1.75, py: 1.25, flexWrap: "wrap" }}>
        <Skeleton variant="rounded" width={142} height={36} />
        <Box sx={{ display: "flex", gap: 1.25, alignItems: "center", flexWrap: "wrap" }}>
          <Skeleton variant="rounded" width={64} height={36} />
          <Skeleton variant="text" width={72} height={24} />
          <Skeleton variant="rounded" width={116} height={32} />
        </Box>
      </Box>
      <Box sx={{ minWidth: 800, overflow: "hidden" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: strTemplate, bgcolor: "#edf3f9", borderTop: "1px solid #e8eef5", borderBottom: "1px solid #d9e3ee" }}>
          {Array.from({ length: intColumns }).map((_, intColumn) => (
            <Box key={intColumn} sx={{ px: 2, py: 1 }}><Skeleton variant="text" width={90} height={22} /></Box>
          ))}
        </Box>
        {Array.from({ length: intRows }).map((_, intRow) => (
          <Box key={intRow} sx={{ display: "grid", gridTemplateColumns: strTemplate, borderBottom: "1px solid #edf1f6", minHeight: 40, alignItems: "center" }}>
            {Array.from({ length: intColumns }).map((__, intColumn) => (
              <Box key={intColumn} sx={{ px: 2, py: 0.75 }}>
                <Skeleton variant="text" width={`${46 + ((intRow + intColumn) % 3) * 14}%`} height={20} />
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// Enter inside a search input runs the search. Ignores dropdowns (Enter picks an option / opens the
// menu there), multiline fields and anything that has already handled the key.
export function onSearchEnter(fnSearch: () => void) {
  return (objEvent: KeyboardEvent<HTMLElement>) => {
    if (objEvent.key !== "Enter" || objEvent.defaultPrevented || objEvent.nativeEvent.isComposing) return;
    const objTarget = objEvent.target as HTMLElement;
    if (objTarget.tagName !== "INPUT") return;
    if (objTarget.getAttribute("role") === "combobox" || objTarget.getAttribute("aria-expanded") === "true") return;
    objEvent.preventDefault();
    fnSearch();
  };
}

// Link-style first-column cell: grey text, blue + underline on row hover (matches Department master).
export const dicMasterNameLinkSx = {
  cursor: "pointer",
  textAlign: "left",
  textUnderlineOffset: "3px",
  userSelect: "text",
  WebkitUserSelect: "text",
  "&&:hover": { color: "#0066df", textDecoration: "underline" },
  "&:focus-visible": { outline: "2px solid #0066df", outlineOffset: 3 },
} as const;

export const dicMasterRowSx = {
  backgroundColor: "#fff",
  "&.MuiTableRow-hover:hover": { backgroundColor: "#f8fbff" },
  "&.MuiTableRow-hover:hover td:first-of-type .MuiLink-root": { textDecoration: "underline", color: "#0066df" },
} as const;

// Same as dicMasterRowSx but for screens whose first column is a checkbox, so the name link is not in the first td.
export const dicMasterRowSxAnyColumn = {
  backgroundColor: "#fff",
  "&.MuiTableRow-hover:hover": { backgroundColor: "#f8fbff" },
  "&.MuiTableRow-hover:hover td .MuiLink-root": { textDecoration: "underline", color: "#0066df" },
} as const;

type MasterMoreFiltersProps = {
  strControlPrefix: string;
  intActiveCount: number;
  blnDisabled?: boolean;
  onApply: () => void;
  onClearAll: () => void;
  // Called when the popup is dismissed without applying, so the screen can reset its draft values.
  onCancel?: () => void;
  children: ReactNode;
};

// "More filters" button + popup matching the Employee master: fields stacked full width, "Clear all"
// on the left of the footer, Cancel / Apply on the right, "•" on the button while a filter is active.
export function MasterMoreFilters({ strControlPrefix, intActiveCount, blnDisabled = false, onApply, onClearAll, onCancel, children }: MasterMoreFiltersProps) {
  const [objAnchor, setObjAnchor] = useState<HTMLElement | null>(null);

  function cancel() {
    onCancel?.();
    setObjAnchor(null);
  }

  return (
    <>
      <Button
        data-control-id={`${strControlPrefix}.more-filters.button`}
        className={styles.secondaryButton}
        startIcon={<FilterListRoundedIcon />}
        onClick={(objEvent) => setObjAnchor(objEvent.currentTarget)}
        aria-expanded={Boolean(objAnchor)}
        disabled={blnDisabled}
        sx={{ whiteSpace: "nowrap" }}
      >
        More filters{intActiveCount > 0 ? " •" : ""}
      </Button>
      <Popover
        open={Boolean(objAnchor)}
        anchorEl={objAnchor}
        onClose={cancel}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        PaperProps={{ className: styles.employeeMoreFilters, "data-control-id": `${strControlPrefix}.more-filters.popover` } as object}
      >
        <Box className={styles.employeeMoreFiltersHeader}>
          <Typography fontWeight={700}>More filters</Typography>
          <IconButton data-control-id={`${strControlPrefix}.more-filters.close.button`} aria-label="Close" size="small" onClick={cancel}><ClearRoundedIcon fontSize="small" /></IconButton>
        </Box>
        <Box onKeyDown={onSearchEnter(() => { setObjAnchor(null); onApply(); })} sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {children}
        </Box>
        <Box className={styles.employeeMoreFiltersActions}>
          <Button data-control-id={`${strControlPrefix}.more-filters.clear-all.button`} className={styles.employeeMoreFiltersClear} onClick={onClearAll}>Clear all</Button>
          <Box className={styles.employeeMoreFiltersActionButtons}>
            <Button data-control-id={`${strControlPrefix}.more-filters.cancel.button`} className={styles.secondaryButton} onClick={cancel}>Cancel</Button>
            <Button data-control-id={`${strControlPrefix}.more-filters.apply.button`} className={styles.primaryButton} onClick={() => { setObjAnchor(null); onApply(); }}>Apply</Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
}

export type MasterOptionalColumn<TKey extends string> = {
  strKey: TKey;
  strLabel: string;
};

type MasterAddColumnsControlProps<TKey extends string> = {
  strControlPrefix: string;
  lstColumns: MasterOptionalColumn<TKey>[];
  lstVisibleKeys: TKey[];
  onChange: (lstVisibleKeys: TKey[]) => void;
  strButtonLabel?: string;
  blnDisabled?: boolean;
};

// "Add columns" button for the grid toolbar (pass as CommonTable's toolbarAfterExport). Optional
// columns stay hidden until ticked here, same as the Salary Component list.
export function MasterAddColumnsControl<TKey extends string>({
  strControlPrefix,
  lstColumns,
  lstVisibleKeys,
  onChange,
  strButtonLabel = "Add columns",
  blnDisabled = false,
}: MasterAddColumnsControlProps<TKey>) {
  const [objAnchor, setObjAnchor] = useState<HTMLElement | null>(null);
  const strButtonId = `${strControlPrefix.replace(/\./g, "-")}-add-columns-button`;

  function toggleColumn(strKey: TKey) {
    onChange(lstVisibleKeys.includes(strKey) ? lstVisibleKeys.filter((strVisible) => strVisible !== strKey) : [...lstVisibleKeys, strKey]);
  }

  return (
    <>
      <Button
        id={strButtonId}
        data-controlid={`${strControlPrefix}.add-columns.button`}
        className={styles.secondaryButton}
        startIcon={<ViewColumnRoundedIcon />}
        onClick={(objEvent) => setObjAnchor(objEvent.currentTarget)}
        disabled={blnDisabled}
        sx={{ borderRadius: "8px !important", minHeight: "36px !important" }}
      >
        {strButtonLabel}
      </Button>
      <Menu anchorEl={objAnchor} open={Boolean(objAnchor)} onClose={() => setObjAnchor(null)} MenuListProps={{ "aria-labelledby": strButtonId }}>
        {lstColumns.map((objColumn) => (
          <MenuItem key={objColumn.strKey} data-controlid={`${strControlPrefix}.add-columns.${objColumn.strKey}.option`} onClick={() => toggleColumn(objColumn.strKey)}>
            <Checkbox size="small" checked={lstVisibleKeys.includes(objColumn.strKey)} inputProps={{ "aria-label": objColumn.strLabel }} sx={{ p: 0.5, mr: 1 }} />
            {objColumn.strLabel}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
