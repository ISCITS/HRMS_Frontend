"use client";

import DownloadIcon from "@mui/icons-material/Download";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { type ChangeEvent, useEffect, useRef, useState } from "react";

import { DottedLoader } from "@/components/shared/BlockingLoader";
import {
  arrearImportService,
  type ArrearImportPreview,
  type ArrearImportStatus,
} from "@/features/payroll/services/arrearImportService";

type Props = {
  blnOpen: boolean;
  strRunID: string;
  strRunLabel: string;
  onClose: () => void;
  /** Reprocess the employees whose imported arrears changed. */
  onImported: (lstEmployeeIDs: number[], strReason: string) => Promise<void>;
};

const STATUTORY_TEXT: Record<string, string> = {
  CALCULATE: "PF / ESI: the system calculates them for each arrear's own month.",
  FROM_FILE: "PF / ESI: taken from the PF / ESI columns of the file.",
  CURRENT_MONTH: "Imported lines are treated as current-month lines.",
};

function money(decValue: number | null | undefined): string {
  return decValue === null || decValue === undefined ? "" : Number(decValue).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Payroll run > Import Arrears: template -> upload and preview (nothing saved) -> import -> undo. */
export default function PayrollRunArrearImportDialog({ blnOpen, strRunID, strRunLabel, onClose, onImported }: Props) {
  const objFileInputRef = useRef<HTMLInputElement | null>(null);
  const [objStatus, setObjStatus] = useState<ArrearImportStatus | null>(null);
  const [objFile, setObjFile] = useState<File | null>(null);
  const [objPreview, setObjPreview] = useState<ArrearImportPreview | null>(null);
  const [strError, setStrError] = useState("");
  const [strInfo, setStrInfo] = useState("");
  const [blnBusy, setBlnBusy] = useState(false);

  async function loadStatus() {
    try {
      setObjStatus(await arrearImportService.getStatus(strRunID));
    } catch (objError) {
      setStrError((objError as Error).message);
    }
  }

  useEffect(() => {
    if (!blnOpen) return;
    setObjFile(null);
    setObjPreview(null);
    setStrError("");
    setStrInfo("");
    void loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blnOpen, strRunID]);

  async function run(fnWork: () => Promise<void>) {
    setBlnBusy(true);
    setStrError("");
    try {
      await fnWork();
    } catch (objError) {
      setStrError((objError as Error).message);
    } finally {
      setBlnBusy(false);
    }
  }

  function handleFileSelected(objEvent: ChangeEvent<HTMLInputElement>) {
    const objSelected = objEvent.target.files?.[0] ?? null;
    objEvent.target.value = "";
    if (!objSelected) return;
    setObjFile(objSelected);
    void run(async () => setObjPreview(await arrearImportService.preview(strRunID, objSelected)));
  }

  function downloadErrorRows() {
    if (!objPreview) return;
    const lstLines = [
      ["Sheet", "Row", "Employee Code", "For Month", "Component Code", "Amount", "Problem"].join(","),
      ...objPreview.lstRows
        .filter((objRow) => objRow.strStatus === "Error")
        .map((objRow) =>
          [objRow.strSheet, objRow.intExcelRowNumber, objRow.strEmployeeCode, objRow.strRawMonth, objRow.strComponentCode, objRow.decAmount ?? "", objRow.lstMessages.join(" | ")]
            .map((objValue) => `"${String(objValue).replace(/"/g, '""')}"`)
            .join(","),
        ),
    ];
    const objUrl = URL.createObjectURL(new Blob([lstLines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const objAnchor = document.createElement("a");
    objAnchor.href = objUrl;
    objAnchor.download = "arrear_import_errors.csv";
    objAnchor.click();
    URL.revokeObjectURL(objUrl);
  }

  function handleImport() {
    if (!objFile) return;
    void run(async () => {
      const objResult = await arrearImportService.commit(strRunID, objFile);
      setObjPreview(null);
      setObjFile(null);
      setStrInfo(`${objResult.intCreatedLineCount} line(s) imported. Reprocessing ${objResult.lstEmployeeIDs.length} employee(s)...`);
      await onImported(objResult.lstEmployeeIDs, "Arrears imported from Excel.");
      setStrInfo(`${objResult.intCreatedLineCount} line(s) imported and ${objResult.lstEmployeeIDs.length} employee(s) reprocessed.`);
      await loadStatus();
    });
  }

  function handleUndo(intBatchID: number) {
    void run(async () => {
      const objResult = await arrearImportService.undo(strRunID, intBatchID);
      await onImported(objResult.lstEmployeeIDs, "Arrear import undone.");
      setStrInfo("Import undone and the employees reprocessed.");
      await loadStatus();
    });
  }

  return (
    <Dialog open={blnOpen} onClose={() => !blnBusy && onClose()} maxWidth="lg" fullWidth data-controlid="payroll.run-detail.arrear-import.dialog">
      <DialogTitle sx={{ fontWeight: 800 }}>Import Arrears - {strRunLabel}</DialogTitle>
      <DialogContent dividers>
        {objStatus && !objStatus.blnImportEnabled ? <Alert severity="warning" sx={{ mb: 2 }}>{objStatus.strDisabledReason}</Alert> : null}
        <Alert severity="info" sx={{ mb: 2 }}>
          Fill one row per employee and month (one column per component), or one row per employee, month and component. Positive = arrear, negative = recovery.
          Nothing is saved until you press Import. {objStatus ? STATUTORY_TEXT[objStatus.strImportStatutory] : ""}{" "}
          {objStatus?.strImportMode === "REPLACE_BATCH" ? "Importing again replaces the earlier import of this run." : "Importing again adds to the earlier import."}
        </Alert>
        <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
          <Button variant="outlined" startIcon={<DownloadIcon />} disabled={blnBusy || !objStatus?.blnImportEnabled} onClick={() => void run(() => arrearImportService.downloadTemplate(strRunID))} data-controlid="payroll.run-detail.arrear-import.template.button">
            Download Template
          </Button>
          <Button variant="contained" startIcon={<UploadFileIcon />} disabled={blnBusy || !objStatus?.blnImportEnabled} onClick={() => objFileInputRef.current?.click()} data-controlid="payroll.run-detail.arrear-import.upload.button">
            Upload Sheet
          </Button>
          <input ref={objFileInputRef} type="file" accept=".xlsx" hidden onChange={handleFileSelected} />
          {objFile ? <Typography variant="body2" color="text.secondary">{objFile.name}</Typography> : null}
          {blnBusy ? <DottedLoader /> : null}
        </Box>
        {strError ? <Alert severity="error" sx={{ mb: 2 }} onClose={() => setStrError("")}>{strError}</Alert> : null}
        {strInfo ? <Alert severity="success" sx={{ mb: 2 }}>{strInfo}</Alert> : null}

        {objPreview ? (
          <>
            <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
              <Chip label={`Rows: ${objPreview.intRowCount}`} />
              <Chip color="success" label={`Valid: ${objPreview.intValidRowCount}`} />
              <Chip color="error" label={`Errors: ${objPreview.intErrorRowCount}`} />
              <Chip label={`Employees: ${objPreview.intEmployeeCount}`} />
              <Chip color="primary" label={`Arrears: ${money(objPreview.decArrearTotal)}`} />
              {objPreview.decRecoveryTotal ? <Chip color="warning" label={`Recoveries: ${money(objPreview.decRecoveryTotal)}`} /> : null}
              {objPreview.intErrorRowCount ? <Button size="small" onClick={downloadErrorRows}>Download error rows</Button> : null}
            </Box>
            {objPreview.blnSameFileImported ? <Alert severity="warning" sx={{ mb: 1 }}>This same file was already imported into this run.</Alert> : null}
            <Box sx={{ maxHeight: 420, overflow: "auto" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Row</TableCell>
                    <TableCell>Employee</TableCell>
                    <TableCell>For month</TableCell>
                    <TableCell>Component</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">PF (file)</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {objPreview.lstRows.map((objRow) => (
                    <TableRow key={`${objRow.strSheet}-${objRow.intExcelRowNumber}-${objRow.strComponentCode}`}>
                      <TableCell>{objRow.strSheet === "Arrears_Long" ? "L" : "W"}{objRow.intExcelRowNumber}</TableCell>
                      <TableCell>{objRow.strEmployeeCode} {objRow.strEmployeeName ? `- ${objRow.strEmployeeName}` : ""}</TableCell>
                      <TableCell>{objRow.strRawMonth}</TableCell>
                      <TableCell>{objRow.strComponentCode}</TableCell>
                      <TableCell align="right">{money(objRow.decAmount)}</TableCell>
                      <TableCell align="right">{money(objRow.decPfEmployee)}</TableCell>
                      <TableCell>
                        <Chip size="small" color={objRow.strStatus === "Error" ? "error" : objRow.strStatus === "Warning" ? "warning" : "success"} label={objRow.strStatus} />
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.75rem" }}>{objRow.lstMessages.join(" ")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </>
        ) : null}

        {objStatus?.lstBatches?.length ? (
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Imports of this run</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>File</TableCell>
                  <TableCell>Imported on</TableCell>
                  <TableCell align="right">Lines</TableCell>
                  <TableCell align="right">Arrears</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {objStatus.lstBatches.map((objBatch) => (
                  <TableRow key={objBatch.intBatchID}>
                    <TableCell>{objBatch.strFileName ?? "-"}</TableCell>
                    <TableCell>{objBatch.dtAddedOn ? new Date(objBatch.dtAddedOn).toLocaleString("en-IN") : "-"}</TableCell>
                    <TableCell align="right">{objBatch.intCreatedLineCount}</TableCell>
                    <TableCell align="right">{money(objBatch.decTotalArrearAmount)}</TableCell>
                    <TableCell>{objBatch.strStatus === "COMMITTED" ? "Active" : objBatch.strStatus === "REPLACED" ? "Replaced" : "Undone"}</TableCell>
                    <TableCell align="right">
                      {objBatch.strStatus === "COMMITTED" && objStatus.blnImportEnabled ? (
                        <Button size="small" startIcon={<UndoRoundedIcon />} disabled={blnBusy} onClick={() => handleUndo(objBatch.intBatchID)}>
                          Undo
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={blnBusy}>Close</Button>
        <Button variant="contained" onClick={handleImport} disabled={blnBusy || !objPreview || objPreview.intValidRowCount === 0} data-controlid="payroll.run-detail.arrear-import.confirm.button">
          Import {objPreview ? `(${objPreview.intValidRowCount})` : ""}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
