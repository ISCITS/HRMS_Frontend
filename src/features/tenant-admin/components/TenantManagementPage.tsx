"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Box,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import TenantAdminShell from "@/features/tenant-admin/components/TenantAdminShell";
import type { TenantManagementListItem } from "@/models/TenantAdministrationModels";
import { authHelpers } from "@/lib/auth";
import { tenantAdministrationService } from "@/services";

const lstSortOptions = [
  { strValue: "updated_on:desc", strLabel: "Recently Updated" },
  { strValue: "created_on:desc", strLabel: "Recently Created" },
  { strValue: "tenant_name:asc", strLabel: "Tenant Name A-Z" },
  { strValue: "tenant_name:desc", strLabel: "Tenant Name Z-A" },
];

export default function TenantManagementPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TenantManagementPageContent />
    </Suspense>
  );
}

function TenantManagementPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [strSearch, setStrSearch] = useState(searchParams.get("search") ?? "");
  const [strStatus, setStrStatus] = useState(searchParams.get("status") ?? "");
  const [strSort, setStrSort] = useState(searchParams.get("sort") ?? "updated_on:desc");
  const [lstTenants, setLstTenants] = useState<TenantManagementListItem[]>([]);
  const [strError, setStrError] = useState("");
  const [blnLoading, setBlnLoading] = useState(true);

  const objSort = useMemo(() => {
    const [strSortBy, strSortDirection] = strSort.split(":");
    return {
      strSortBy: strSortBy || "updated_on",
      strSortDirection: strSortDirection || "desc",
    };
  }, [strSort]);

  useEffect(() => {
    let blnActive = true;
    setBlnLoading(true);
    tenantAdministrationService.listTenants({
      search: strSearch || undefined,
      status: strStatus || undefined,
      sortBy: objSort.strSortBy,
      sortDirection: objSort.strSortDirection,
    })
      .then((objResult) => {
        if (blnActive) {
          setLstTenants(objResult.Data);
          setStrError("");
        }
      })
      .catch((objError) => {
        if (!blnActive) {
          return;
        }
        const strMessage = objError instanceof Error ? objError.message : "Unable to load tenants.";
        if (/access|required|unauthorized/i.test(strMessage)) {
          authHelpers.clearSession();
          router.replace("/HRMS/Administrator/login");
          return;
        }
        setStrError(strMessage);
      })
      .finally(() => {
        if (blnActive) {
          setBlnLoading(false);
        }
      });

    return () => {
      blnActive = false;
    };
  }, [objSort.strSortBy, objSort.strSortDirection, router, strSearch, strStatus]);

  return (
    <TenantAdminShell>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Manage Tenant</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Browse tenant records, review configuration posture, and double-click any row to open edit mode in the same onboarding layout.
          </Typography>
        </Box>

        <Paper
          sx={{
            p: 2.5,
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
            backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%)",
          }}
        >
          <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
            <TextField label="Search tenant" inputProps={{ "data-testid": "tenant-management.list.search.input" }} value={strSearch} onChange={(e) => setStrSearch(e.target.value)} fullWidth />
            <TextField select label="Status" inputProps={{ "data-testid": "tenant-management.list.status.select" }} value={strStatus} onChange={(e) => setStrStatus(e.target.value)} sx={{ minWidth: 180 }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
            <TextField select label="Sort" inputProps={{ "data-testid": "tenant-management.list.sort.select" }} value={strSort} onChange={(e) => setStrSort(e.target.value)} sx={{ minWidth: 220 }}>
              {lstSortOptions.map((dicOption) => (
                <MenuItem key={dicOption.strValue} value={dicOption.strValue}>{dicOption.strLabel}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </Paper>

        {strError ? <Alert severity="error">{strError}</Alert> : null}

        <Paper
          sx={{
            borderRadius: 1.5,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
            backgroundColor: "background.paper",
          }}
        >
          {blnLoading ? (
            <Box sx={{ minHeight: 240, display: "grid", placeItems: "center" }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead
                  sx={{
                    backgroundColor: "rgba(15, 23, 42, 0.04)",
                  }}
                >
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, letterSpacing: 0.2 }}>Tenant Name</TableCell>
                    <TableCell sx={{ fontWeight: 700, letterSpacing: 0.2 }}>Tenant Code</TableCell>
                    <TableCell sx={{ fontWeight: 700, letterSpacing: 0.2 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, letterSpacing: 0.2 }}>Default Language</TableCell>
                    <TableCell sx={{ fontWeight: 700, letterSpacing: 0.2 }}>Auth Mode</TableCell>
                    <TableCell sx={{ fontWeight: 700, letterSpacing: 0.2 }}>MFA Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, letterSpacing: 0.2 }}>Created Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, letterSpacing: 0.2 }}>Updated Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lstTenants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <Typography color="text.secondary">No tenants found for the current filter.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : lstTenants.map((objTenant) => (
                    <TableRow
                      key={objTenant.intTenantID}
                      data-testid="tenant-management.list.row"
                      data-row-key={String(objTenant.intTenantID)}
                      hover
                      onDoubleClick={() => router.push(`/HRMS/Administrator/tenants/${objTenant.intTenantID}`)}
                      sx={{
                        cursor: "pointer",
                        transition: "background-color 160ms ease, transform 160ms ease",
                        "&:nth-of-type(even)": {
                          backgroundColor: "rgba(15, 23, 42, 0.015)",
                        },
                        "&:hover": {
                          backgroundColor: "rgba(2, 132, 199, 0.08)",
                        },
                      }}
                    >
                      <TableCell>{objTenant.strTenantName}</TableCell>
                      <TableCell>{objTenant.strTenantCode}</TableCell>
                      <TableCell sx={{ textTransform: "capitalize" }}>{objTenant.strTenantStatus}</TableCell>
                      <TableCell>{objTenant.objDefaultLanguage?.strLabel ?? "-"}</TableCell>
                      <TableCell>{objTenant.strAuthMode ?? "-"}</TableCell>
                      <TableCell>{objTenant.strMfaStatus ?? "-"}</TableCell>
                      <TableCell>{objTenant.dtCreatedOn ? new Date(objTenant.dtCreatedOn).toLocaleString() : "-"}</TableCell>
                      <TableCell>{objTenant.dtUpdatedOn ? new Date(objTenant.dtUpdatedOn).toLocaleString() : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Stack>
    </TenantAdminShell>
  );
}
