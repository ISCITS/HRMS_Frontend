"use client";

import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import { InvestmentOptionApiRecord, masterApiService } from "@/services/master/MasterApiService";

type InvestmentOptionsManagerDialogProps = {
  blnOpen: boolean;
  strSectionCode: string;
  strSectionName: string;
  onClose: () => void;
};

type NewOptionForm = {
  code: string;
  name: string;
  displayOrder: string;
};

const dicEmptyForm: NewOptionForm = { code: "", name: "", displayOrder: "0" };

export default function InvestmentOptionsManagerDialog({
  blnOpen,
  strSectionCode,
  strSectionName,
  onClose,
}: InvestmentOptionsManagerDialogProps) {
  const [lstOptions, setLstOptions] = useState<InvestmentOptionApiRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(false);
  const [strError, setStrError] = useState("");
  const [dicNewForm, setDicNewForm] = useState<NewOptionForm>(dicEmptyForm);
  const [blnAdding, setBlnAdding] = useState(false);
  const [intEditingID, setIntEditingID] = useState<number | null>(null);
  const [dicEditForm, setDicEditForm] = useState<NewOptionForm>(dicEmptyForm);
  const [blnSavingID, setBlnSavingID] = useState<number | null>(null);
  const [intPendingDeleteID, setIntPendingDeleteID] = useState<number | null>(null);

  async function loadOptions() {
    setBlnLoading(true);
    setStrError("");
    try {
      const objResult = await masterApiService.getInvestmentOptions(strSectionCode);
      setLstOptions(objResult.Data);
    } catch (objError) {
      setLstOptions([]);
      setStrError(objError instanceof Error ? objError.message : "Unable to load investment options.");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (!blnOpen || !strSectionCode) {
      return;
    }
    setDicNewForm(dicEmptyForm);
    setIntEditingID(null);
    loadOptions().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blnOpen, strSectionCode]);

  function startEdit(objOption: InvestmentOptionApiRecord) {
    setIntEditingID(objOption.intID);
    setDicEditForm({
      code: objOption.strOptionCode,
      name: objOption.strOptionName,
      displayOrder: String(objOption.intDisplayOrder),
    });
  }

  function cancelEdit() {
    setIntEditingID(null);
  }

  async function addOption() {
    if (!dicNewForm.code.trim() || !dicNewForm.name.trim()) {
      setStrError("Option code and name are required.");
      return;
    }
    setBlnAdding(true);
    setStrError("");
    try {
      await masterApiService.createInvestmentOption({
        strSectionCode,
        strOptionCode: dicNewForm.code.trim(),
        strOptionName: dicNewForm.name.trim(),
        intDisplayOrder: Number(dicNewForm.displayOrder) || 0,
        blnIsActive: true,
      });
      setDicNewForm(dicEmptyForm);
      await loadOptions();
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to add investment option.");
    } finally {
      setBlnAdding(false);
    }
  }

  async function saveEdit(objOption: InvestmentOptionApiRecord) {
    setBlnSavingID(objOption.intID);
    setStrError("");
    try {
      await masterApiService.updateInvestmentOption(objOption.intID, {
        strSectionCode,
        strOptionCode: dicEditForm.code.trim(),
        strOptionName: dicEditForm.name.trim(),
        intDisplayOrder: Number(dicEditForm.displayOrder) || 0,
        blnIsActive: objOption.blnIsActive,
      });
      setIntEditingID(null);
      await loadOptions();
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to update investment option.");
    } finally {
      setBlnSavingID(null);
    }
  }

  async function toggleActive(objOption: InvestmentOptionApiRecord) {
    setBlnSavingID(objOption.intID);
    setStrError("");
    try {
      await masterApiService.bulkInvestmentOptionStatus([objOption.intID], !objOption.blnIsActive);
      await loadOptions();
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to update status.");
    } finally {
      setBlnSavingID(null);
    }
  }

  async function confirmDelete() {
    if (intPendingDeleteID === null) {
      return;
    }
    setBlnSavingID(intPendingDeleteID);
    setStrError("");
    try {
      await masterApiService.bulkInvestmentOptionDelete([intPendingDeleteID]);
      await loadOptions();
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to delete investment option.");
    } finally {
      setBlnSavingID(null);
      setIntPendingDeleteID(null);
    }
  }

  return (
    <>
      <Dialog open={blnOpen} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Investment Options — {strSectionName} ({strSectionCode})
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ color: "#64748b", fontSize: "0.82rem", mb: 1.5 }}>
            These are the investment-name suggestions employees see when declaring an amount under this section on the IT Declaration screen.
          </Typography>
          {strError ? <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setStrError("")}>{strError}</Alert> : null}

          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", mb: 2, pb: 2, borderBottom: "1px solid rgba(226,232,240,0.9)" }}>
            <TextField
              size="small"
              label="Code"
              placeholder="EPF"
              value={dicNewForm.code}
              onChange={(objEvent) => setDicNewForm((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))}
              sx={{ width: 130 }}
            />
            <TextField
              size="small"
              label="Name"
              placeholder="Employee Provident Fund"
              value={dicNewForm.name}
              onChange={(objEvent) => setDicNewForm((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))}
              fullWidth
            />
            <TextField
              size="small"
              label="Order"
              type="number"
              value={dicNewForm.displayOrder}
              onChange={(objEvent) => setDicNewForm((dicPrevious) => ({ ...dicPrevious, displayOrder: objEvent.target.value }))}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 90 }}
            />
            <Button variant="contained" disabled={blnAdding} onClick={addOption} sx={{ height: 40 }}>Add</Button>
          </Box>

          {blnLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress size={24} /></Box>
          ) : lstOptions.length === 0 ? (
            <Typography sx={{ color: "#94a3b8", fontSize: "0.85rem", py: 1 }}>No investment options configured for this section yet.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Order</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Active</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lstOptions.map((objOption) => (
                  <TableRow
                    key={objOption.intID}
                    sx={{ opacity: objOption.blnIsActive ? 1 : 0.6, background: objOption.blnIsActive ? undefined : "#f8fafc" }}
                  >
                    {intEditingID === objOption.intID ? (
                      <>
                        <TableCell>
                          <TextField
                            size="small"
                            value={dicEditForm.code}
                            onChange={(objEvent) => setDicEditForm((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))}
                            sx={{ width: 110 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={dicEditForm.name}
                            onChange={(objEvent) => setDicEditForm((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={dicEditForm.displayOrder}
                            onChange={(objEvent) => setDicEditForm((dicPrevious) => ({ ...dicPrevious, displayOrder: objEvent.target.value }))}
                            sx={{ width: 80 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Switch size="small" checked={objOption.blnIsActive} disabled />
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" variant="contained" disabled={blnSavingID === objOption.intID} onClick={() => saveEdit(objOption)}>Save</Button>
                          <Button size="small" onClick={cancelEdit}>Cancel</Button>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell sx={{ color: "#94a3b8", fontSize: "0.8rem" }}>{objOption.strOptionCode}</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: "#0f172a" }}>{objOption.strOptionName}</TableCell>
                        <TableCell align="right">{objOption.intDisplayOrder}</TableCell>
                        <TableCell align="center">
                          <Switch
                            size="small"
                            checked={objOption.blnIsActive}
                            disabled={blnSavingID === objOption.intID}
                            onChange={() => toggleActive(objOption)}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => startEdit(objOption)}>
                            <EditRoundedIcon fontSize="small" sx={{ color: "var(--app-primary-color)" }} />
                          </IconButton>
                          <IconButton size="small" onClick={() => setIntPendingDeleteID(objOption.intID)} disabled={blnSavingID === objOption.intID}>
                            <DeleteRoundedIcon fontSize="small" sx={{ color: "#DC2626" }} />
                          </IconButton>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
      <CommonConfirmDialog
        blnOpen={intPendingDeleteID !== null}
        strTitle="Delete Investment Option"
        strMessage="Are you sure you want to delete this investment option? Employees will no longer see it as a suggestion for this section."
        strCancelLabel="Cancel"
        strConfirmLabel="Delete"
        blnConfirmDisabled={blnSavingID !== null}
        blnCancelDisabled={blnSavingID !== null}
        onClose={() => setIntPendingDeleteID(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
