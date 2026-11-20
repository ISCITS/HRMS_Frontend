"use client";

import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";

import type { Form12Register } from "@/features/reports/services/form12ReportService";
import { buildNumberRow, fmtDays, getLeaveTotal, lstLeaveKeys, ordinal } from "@/features/reports/utils/form12Grid";

type GridProps = { dicRegister: Form12Register };

// The register is laid out like the client's printed Form 12: plain black grid, no colour coding.
const strBorder = "1px solid #1f2937";
const intHeadHeight = 46;
const dicHeadCell = { backgroundColor: "#e5e7eb", border: strBorder, fontSize: 11, fontWeight: 700, lineHeight: 1.15, px: 0.5, py: 0.5, textAlign: "center", whiteSpace: "normal" } as const;
const dicBodyCell = { border: strBorder, fontSize: 11, lineHeight: 1.2, px: 0.5, py: 0.25, textAlign: "center", whiteSpace: "nowrap" } as const;
const lstSummaryLabels = ["P", "HALF DAY", "OD", "COWIN", "ACTUAL P", "WO", "NH/HD", "WHF", "ABSENT", ...lstLeaveKeys, "TOTAL DAYS"];
const lstTailLabels = ["Total number of weekly holidays", "Date(s) of compensatory holidays", "Remarks"];
const lstFixedLabels = ["S.No", "Emp Code", "Name of Adult Worker", "Father's Name", "Nature of work", "Department", "Shift"];

// Sticky left columns keep S.No, code and name visible while the day columns scroll.
const dicStickySerial = { left: 0, minWidth: 44, position: "sticky", zIndex: 2 } as const;
const dicStickyCode = { left: 44, minWidth: 82, position: "sticky", zIndex: 2 } as const;
const dicStickyName = { left: 126, minWidth: 190, position: "sticky", textAlign: "left", zIndex: 2 } as const;

const dicBlockCell = { border: strBorder, fontSize: 12, px: 1, py: 0.25, textAlign: "center" } as const;

function BlockTable({ lstHead, lstRows, intMinWidth }: { lstHead: string[][]; lstRows: string[][]; intMinWidth: number }) {
  return (
    <Table size="small" sx={{ borderCollapse: "collapse", minWidth: intMinWidth, width: "auto" }}>
      <TableHead>
        {lstHead.map((lstCells, intRow) => (
          <TableRow key={intRow}>
            {lstCells.map((strCell, intCol) => (
              <TableCell key={intCol} colSpan={lstCells.length === 1 ? 2 : 1} sx={{ ...dicBlockCell, backgroundColor: "#e5e7eb", fontWeight: 700 }}>{strCell}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableHead>
      <TableBody>
        {lstRows.map((lstCells, intRow) => (
          <TableRow key={intRow}>
            {lstCells.map((strCell, intCol) => <TableCell key={intCol} sx={dicBlockCell}>{strCell}</TableCell>)}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Factory line, commencement table, form title, month box, rest period and completion tables.
function Form12HeaderBlock({ dicRegister }: GridProps) {
  const dicHeader = dicRegister.dicHeader;
  return (
    <Box sx={{ mb: 1.5 }} data-testid="reports.form12.header">
      <Typography sx={{ fontWeight: 700, mb: 1 }}>{`Name of the Factory or Department :- ${dicHeader.strFactoryName || "-"}`}</Typography>
      <Box sx={{ alignItems: "flex-start", display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "space-between" }}>
        <BlockTable lstHead={[["Time of Commencement of work"]]} lstRows={dicHeader.lstCommencementRows} intMinWidth={300} />
        <Box sx={{ flex: "1 1 280px", textAlign: "center" }}>
          <Typography sx={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2 }}>Form No. 12</Typography>
          <Typography sx={{ fontWeight: 700, mt: 0.5 }}>{dicHeader.strRuleTitle}</Typography>
          <Typography sx={{ fontSize: 12, mt: 0.5 }}>{dicHeader.strActLine}</Typography>
        </Box>
        <Box>
          <Box sx={{ border: strBorder, fontSize: 12, fontWeight: 700, mb: 1, px: 1, py: 0.25 }}>{dicHeader.strMonthLabel}</Box>
          <Box sx={{ alignItems: "flex-start", display: "flex", gap: 1 }}>
            <BlockTable lstHead={[["Rest Period"], ["From", "To"]]} lstRows={dicHeader.lstRestRows} intMinWidth={200} />
            <BlockTable lstHead={[["Time of Completion"]]} lstRows={dicHeader.lstCompletionLines.map((strLine) => [strLine])} intMinWidth={120} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export function Form12RegisterGrid({ dicRegister }: GridProps) {
  const lstDayIndexes = Array.from({ length: dicRegister.intDaysInMonth }, (_, intIndex) => intIndex);
  const dicNumbers = buildNumberRow(dicRegister.intDaysInMonth);
  const intColumns = lstFixedLabels.length + dicRegister.intDaysInMonth + lstSummaryLabels.length + lstTailLabels.length;
  const dicNumberCell = { ...dicHeadCell, fontWeight: 600, py: 0.25, top: intHeadHeight } as const;
  return (
    <Box data-testid="reports.form12.register">
      <Form12HeaderBlock dicRegister={dicRegister} />
      <TableContainer sx={{ maxHeight: "70vh" }} data-testid="reports.form12.register.table">
        <Table size="small" stickyHeader sx={{ borderCollapse: "separate", borderSpacing: 0 }}>
          <TableHead>
            <TableRow>
              {lstFixedLabels.map((strLabel, intIndex) => (
                <TableCell key={strLabel} sx={{
                  ...dicHeadCell, height: intHeadHeight,
                  ...(intIndex === 0 ? { ...dicStickySerial, zIndex: 4 } : intIndex === 1 ? { ...dicStickyCode, zIndex: 4 } : intIndex === 2 ? { ...dicStickyName, textAlign: "center", zIndex: 4 } : {}),
                }}>
                  {strLabel}
                </TableCell>
              ))}
              {lstDayIndexes.map((intIndex) => <TableCell key={intIndex} sx={{ ...dicHeadCell, height: intHeadHeight, minWidth: 30 }}>{ordinal(intIndex + 1)}</TableCell>)}
              {lstSummaryLabels.map((strLabel) => <TableCell key={strLabel} sx={{ ...dicHeadCell, height: intHeadHeight, minWidth: 40 }}>{strLabel}</TableCell>)}
              {lstTailLabels.map((strLabel) => <TableCell key={strLabel} sx={{ ...dicHeadCell, height: intHeadHeight, minWidth: 110 }}>{strLabel}</TableCell>)}
            </TableRow>
            <TableRow data-testid="reports.form12.register.numbers">
              {dicNumbers.lstFixed.map((strNumber, intIndex) => (
                <TableCell key={intIndex} sx={{
                  ...dicNumberCell,
                  ...(intIndex === 0 ? { ...dicStickySerial, zIndex: 4 } : intIndex === 1 ? { ...dicStickyCode, zIndex: 4 } : intIndex === 2 ? { ...dicStickyName, textAlign: "center", zIndex: 4 } : {}),
                }}>
                  {strNumber}
                </TableCell>
              ))}
              {dicNumbers.lstDays.map((strNumber) => <TableCell key={strNumber} sx={dicNumberCell}>{strNumber}</TableCell>)}
              {dicNumbers.lstSummary.map((dicCell) => <TableCell key={dicCell.strText} colSpan={dicCell.intSpan} sx={dicNumberCell}>{dicCell.strText}</TableCell>)}
              {dicNumbers.lstTail.map((strNumber) => <TableCell key={strNumber} sx={dicNumberCell}>{strNumber}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {dicRegister.lstGroups.length === 0 ? (
              <TableRow><TableCell colSpan={intColumns} sx={{ ...dicBodyCell, py: 2 }}>No employees match the selected filters.</TableCell></TableRow>
            ) : null}
            {dicRegister.lstGroups.map((dicGroup) => [
              <TableRow key={`g-${dicGroup.strGroup}`}>
                <TableCell colSpan={intColumns} sx={{ ...dicBodyCell, backgroundColor: "#e5e7eb", fontWeight: 700, textAlign: "left" }}>
                  {dicGroup.strLabel} ({dicGroup.lstRows.length})
                </TableCell>
              </TableRow>,
              ...dicGroup.lstRows.map((dicRow) => (
                <TableRow key={dicRow.intEmployeeID} hover>
                  <TableCell sx={{ ...dicBodyCell, ...dicStickySerial, backgroundColor: "#fff" }}>{dicRow.intSerial}</TableCell>
                  <TableCell sx={{ ...dicBodyCell, ...dicStickyCode, backgroundColor: "#fff" }}>{dicRow.strEmployeeCode}</TableCell>
                  <TableCell sx={{ ...dicBodyCell, ...dicStickyName, backgroundColor: "#fff", fontWeight: 600 }}>{dicRow.strName}</TableCell>
                  <TableCell sx={dicBodyCell}>{dicRow.strFatherName}</TableCell>
                  <TableCell sx={dicBodyCell}>{dicRow.strDesignation}</TableCell>
                  <TableCell sx={dicBodyCell}>{dicRow.strDepartment}</TableCell>
                  <TableCell sx={dicBodyCell}>{dicRow.strShift}</TableCell>
                  {dicRow.lstDays.map((strCode, intIndex) => <TableCell key={intIndex} sx={dicBodyCell}>{strCode}</TableCell>)}
                  {[
                    fmtDays(dicRow.dicTotals.decPresent), fmtDays(dicRow.dicTotals.decHalfDay), fmtDays(dicRow.dicTotals.decOnDuty),
                    fmtDays(dicRow.dicTotals.decCowin), fmtDays(dicRow.dicTotals.decActualPresent), fmtDays(dicRow.dicTotals.decWeeklyOff),
                    fmtDays(dicRow.dicTotals.decHoliday), fmtDays(dicRow.dicTotals.decWorkedOnHoliday, true), fmtDays(dicRow.dicTotals.decAbsent),
                    ...lstLeaveKeys.map((strKey) => fmtDays(getLeaveTotal(dicRow.dicTotals, strKey))),
                    fmtDays(dicRow.dicTotals.decTotalDays),
                  ].map((strValue, intIndex) => (
                    <TableCell key={intIndex} sx={{ ...dicBodyCell, fontWeight: intIndex === lstSummaryLabels.length - 1 ? 700 : 400 }}>{strValue}</TableCell>
                  ))}
                  {lstTailLabels.map((strLabel) => <TableCell key={strLabel} sx={dicBodyCell} />)}
                </TableRow>
              )),
            ])}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export function Form12PayableGrid({ dicRegister }: GridProps) {
  const strPeriod = `${dicRegister.strMonthName.slice(0, 3).toUpperCase()},${String(dicRegister.intYear).slice(-2)}`;
  const lstLabels = ["SL", "Code", "Name", "Present", ...lstLeaveKeys, "Total days"];
  return (
    <Box data-testid="reports.form12.payable.table">
      <Typography sx={{ fontWeight: 700, mb: 1 }}>{`${dicRegister.dicHeader.strFactoryName} ATTN (${strPeriod})`.trim()}</Typography>
      <TableContainer sx={{ maxHeight: "70vh" }}>
        <Table size="small" stickyHeader sx={{ borderCollapse: "separate", borderSpacing: 0, maxWidth: 820 }}>
          <TableHead>
            <TableRow>{lstLabels.map((strLabel) => <TableCell key={strLabel} sx={dicHeadCell}>{strLabel}</TableCell>)}</TableRow>
          </TableHead>
          <TableBody>
            {dicRegister.lstGroups.length === 0 ? (
              <TableRow><TableCell colSpan={lstLabels.length} sx={{ ...dicBodyCell, py: 2 }}>No employees match the selected filters.</TableCell></TableRow>
            ) : null}
            {dicRegister.lstGroups.map((dicGroup) => [
              <TableRow key={`g-${dicGroup.strGroup}`}>
                <TableCell colSpan={lstLabels.length} sx={{ ...dicBodyCell, backgroundColor: "#e5e7eb", fontWeight: 700, textAlign: "left" }}>{dicGroup.strLabel}</TableCell>
              </TableRow>,
              ...dicGroup.lstRows.map((dicRow) => (
                <TableRow key={dicRow.intEmployeeID} hover>
                  <TableCell sx={dicBodyCell}>{dicRow.intSerial}</TableCell>
                  <TableCell sx={dicBodyCell}>{dicRow.strEmployeeCode}</TableCell>
                  <TableCell sx={{ ...dicBodyCell, textAlign: "left" }}>{dicRow.strName}</TableCell>
                  <TableCell sx={dicBodyCell}>{fmtDays(dicRow.dicTotals.decActualPresent)}</TableCell>
                  {lstLeaveKeys.map((strKey) => <TableCell key={strKey} sx={dicBodyCell}>{fmtDays(getLeaveTotal(dicRow.dicTotals, strKey))}</TableCell>)}
                  <TableCell sx={{ ...dicBodyCell, fontWeight: 700 }}>{fmtDays(dicRow.dicTotals.decTotalDays)}</TableCell>
                </TableRow>
              )),
            ])}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
