"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ToggleOffRoundedIcon from "@mui/icons-material/ToggleOffRounded";
import ToggleOnRoundedIcon from "@mui/icons-material/ToggleOnRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Pagination,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import { useSalaryComponentLabels } from "@/features/salary-components/hooks/useSalaryComponentLabels";
import { salaryComponentService } from "@/features/salary-components/services/salaryComponentService";
import type { SalaryComponentListRecord } from "@/features/salary-components/types";

const lstRowsPerPageOptions = [10, 20, 50];

export default function SalaryComponentListPage() {
  const objRouter = useRouter();
  const { t } = useSalaryComponentLabels();
  const [lstComponents, setLstComponents] = useState<SalaryComponentListRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const [dicSearch, setDicSearch] = useState({
    strName: "",
    strCode: "",
    strStatus: "All"
  });
  const [dicAppliedSearch, setDicAppliedSearch] = useState(dicSearch);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);

  async function loadComponents() {
    setBlnLoading(true);
    setStrError("");
    try {
      setLstComponents(await salaryComponentService.getSalaryComponents());
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load salary components.");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    loadComponents().catch(() => undefined);
  }, []);

  const lstFilteredRows = useMemo(() => {
    return lstComponents.filter((dicRow) => {
      const blnNameMatch = !dicAppliedSearch.strName || dicRow.strComponentName.toLowerCase().includes(dicAppliedSearch.strName.toLowerCase());
      const blnCodeMatch = !dicAppliedSearch.strCode || dicRow.strComponentCode.toLowerCase().includes(dicAppliedSearch.strCode.toLowerCase());
      const blnStatusMatch =
        dicAppliedSearch.strStatus === "All" ||
        (dicAppliedSearch.strStatus === "Active" ? dicRow.blnIsActive : !dicRow.blnIsActive);
      return blnNameMatch && blnCodeMatch && blnStatusMatch;
    });
  }, [dicAppliedSearch, lstComponents]);

  const intPageCount = Math.max(1, Math.ceil(lstFilteredRows.length / intRowsPerPage));
  const intResolvedPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intResolvedPage - 1) * intRowsPerPage;
  const lstVisibleRows = lstFilteredRows.slice(intStartIndex, intStartIndex + intRowsPerPage);

  async function handleStatusToggle(dicRow: SalaryComponentListRecord) {
    try {
      await salaryComponentService.setSalaryComponentStatus(dicRow.intID, !dicRow.blnIsActive);
      setStrSuccess(`Salary component ${!dicRow.blnIsActive ? "activated" : "deactivated"} successfully.`);
      await loadComponents();
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to update salary component status.");
    }
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader}>
          <Box>
            <Typography className={styles.title}>{t("salary_component_title", "Salary Components")}</Typography>
            <Typography sx={{ color: "#64748b", mt: 0.75, maxWidth: 840, fontSize: "0.92rem" }}>
              {t(
                "list_description",
                "Maintain salary component masters with calculation setup, declaration/proof flags, multilingual text, and dependency mapping in one dedicated workspace."
              )}
            </Typography>
          </Box>
          <Box className={styles.headerActions}>
            <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/salary-components/add")}>
              {t("add_component", "Add Component")}
            </Button>
          </Box>
        </Box>

        {strError ? <Alert severity="error" sx={{ mt: 1.25 }} onClose={() => setStrError("")}>{strError}</Alert> : null}
        {strSuccess ? <Alert severity="success" sx={{ mt: 1.25 }} onClose={() => setStrSuccess("")}>{strSuccess}</Alert> : null}

        <Box className={styles.searchRow}>
          <TextField
            value={dicSearch.strName}
            onChange={(objEvent) => setDicSearch((dicPrev) => ({ ...dicPrev, strName: objEvent.target.value }))}
            placeholder={t("search_component_name", "Search component name")}
            fullWidth
          />
          <TextField
            value={dicSearch.strCode}
            onChange={(objEvent) => setDicSearch((dicPrev) => ({ ...dicPrev, strCode: objEvent.target.value.toUpperCase() }))}
            placeholder={t("search_component_code", "Search component code")}
            fullWidth
          />
          <TextField
            select
            value={dicSearch.strStatus}
            onChange={(objEvent) => setDicSearch((dicPrev) => ({ ...dicPrev, strStatus: objEvent.target.value }))}
            fullWidth
          >
            <MenuItem value="All">{t("all_status", "All Status")}</MenuItem>
            <MenuItem value="Active">{t("status_active", "Active")}</MenuItem>
            <MenuItem value="Inactive">{t("status_inactive", "Inactive")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicAppliedSearch(dicSearch); setIntPage(1); }}>
              {t("search_button", "Search")}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                const dicDefaultSearch = { strName: "", strCode: "", strStatus: "All" };
                setDicSearch(dicDefaultSearch);
                setDicAppliedSearch(dicDefaultSearch);
                setIntPage(1);
              }}
            >
              {t("clear_button", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard}>
        {!blnLoading && lstFilteredRows.length > 0 ? (
          <Box className={styles.paginationBar}>
            <Box className={styles.paginationInfo}>
              <Typography className={styles.paginationLabel}>{t("rows_per_page", "Rows per page")}</Typography>
              <TextField
                select
                size="small"
                value={String(intRowsPerPage)}
                onChange={(objEvent) => {
                  setIntRowsPerPage(Number(objEvent.target.value));
                  setIntPage(1);
                }}
                className={styles.rowsPerPageSelect}
              >
                {lstRowsPerPageOptions.map((intOption) => (
                  <MenuItem key={intOption} value={String(intOption)}>{intOption}</MenuItem>
                ))}
              </TextField>
              <Typography className={styles.paginationRange}>
                {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFilteredRows.length)} of {lstFilteredRows.length}
              </Typography>
            </Box>
            <Pagination count={intPageCount} page={intResolvedPage} onChange={(_, intNextPage) => setIntPage(intNextPage)} size="small" color="primary" showFirstButton showLastButton />
          </Box>
        ) : null}

        {blnLoading ? (
          <Box className={styles.emptyState}>
            <CircularProgress size={24} />
            <Typography sx={{ mt: 1 }}>{t("loading_salary_components", "Loading salary components...")}</Typography>
          </Box>
        ) : (
          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("action", "Action")}</th>
                  <th>{t("code", "Code")}</th>
                  <th>{t("component_name", "Component Name")}</th>
                  <th>{t("category", "Category")}</th>
                  <th>{t("group", "Group")}</th>
                  <th>{t("calc_method", "Calc Method")}</th>
                  <th>{t("rounding", "Rounding")}</th>
                  <th>{t("periodicity", "Periodicity")}</th>
                  <th>{t("tax_treatment", "Tax Treatment")}</th>
                  <th>{t("manual_override", "Manual Override")}</th>
                  <th>{t("declaration", "Declaration")}</th>
                  <th>{t("proof", "Proof")}</th>
                  <th>{t("dependencies", "Dependencies")}</th>
                  <th>{t("status", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {lstFilteredRows.length === 0 ? (
                  <tr>
                    <td className={styles.emptyState} colSpan={13}>{t("no_salary_components_found", "No salary components found.")}</td>
                  </tr>
                ) : lstVisibleRows.map((dicRow) => (
                  <tr key={dicRow.intID}>
                    <td>
                      <Stack direction="row" spacing={0.75} className={styles.actionCell}>
                        <Button className={styles.secondaryButton} startIcon={<EditRoundedIcon />} onClick={() => objRouter.push(`/salary-components/edit/${dicRow.intID}`)}>
                          {t("action_edit", "Edit")}
                        </Button>
                        <Button
                          className={dicRow.blnIsActive ? styles.secondaryButton : styles.primaryButton}
                          startIcon={dicRow.blnIsActive ? <ToggleOffRoundedIcon /> : <ToggleOnRoundedIcon />}
                          onClick={() => handleStatusToggle(dicRow)}
                        >
                          {dicRow.blnIsActive ? t("deactivate_button", "Deactivate") : t("activate_button", "Activate")}
                        </Button>
                      </Stack>
                    </td>
                    <td>{dicRow.strComponentCode}</td>
                    <td>{dicRow.strComponentName}</td>
                    <td>{dicRow.strComponentCategory}</td>
                    <td>{dicRow.strComponentGroup ?? "-"}</td>
                    <td>{dicRow.strCalcMethod}</td>
                    <td>{dicRow.strRoundingRule ?? "-"}</td>
                    <td>{dicRow.strDefaultPeriodicity}</td>
                    <td>{dicRow.strTaxTreatment ?? "-"}</td>
                    <td>{dicRow.blnAllowManualOverride ? t("yes", "Yes") : t("no", "No")}</td>
                    <td>{dicRow.blnDeclarationRequired ? t("yes", "Yes") : t("no", "No")}</td>
                    <td>{dicRow.blnProofRequired ? t("yes", "Yes") : t("no", "No")}</td>
                    <td>{dicRow.intDependencyCount}</td>
                    <td>
                      <span className={`${styles.statusPill} ${dicRow.blnIsActive ? styles.statusActive : styles.statusInactive}`}>
                        {dicRow.blnIsActive ? t("status_active", "Active") : t("status_inactive", "Inactive")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}
      </Box>
    </Box>
  );
}
