"use client";

import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";

import type { Form12Register } from "@/features/reports/services/form12ReportService";
import { fmtDays, getDayCodeStyle, getLeaveTotal, isSundayIndex, lstLeaveKeys } from "@/features/reports/utils/form12Grid";

type GridProps = { dicRegister: Form12Register };

const strBorder = "1px solid #cbd5e1";
const dicHeadCell = { backgroundColor: "#f1f5f9", border: strBorder, fontSize: 11, fontWeight: 700, lineHeight: 1.2, px: 0.5, py: 0.5, textAlign: "center", whiteSpace: "nowrap" } as const;
const dicBodyCell = { border: strBorder, fontSize: 11, lineHeight: 1.2, px: 0.5, py: 0.25, textAlign: "center", whiteSpace: "nowrap" } as const;
const lstSummaryLabels = ["P", "Half day", "OD", "COWIN", "Actual P", "WO", "NH/HD", "WHF", "Absent", ...lstLeaveKeys, "Total days"];

// Sticky left columns keep code and name visible while the 31 day columns scroll.
const dicStickyCode = { left: 0, minWidth: 82, position: "sticky", zIndex: 2 } as const;
const dicStickyName = { left: 82, minWidth: 170, position: "sticky", textAlign: "left", zIndex: 2 } as const;

export function Form12RegisterGrid({ dicRegister }: GridProps) {
  const lstDayIndexes = Array.from({ length: dicRegister.intDaysInMonth }, (_, intIndex) => intIndex);
  const intColumns = 2 + 3 + dicRegister.intDaysInMonth + lstSummaryLabels.length;
  return (
    <TableContainer sx={{ maxHeight: "70vh" }} data-testid="reports.form12.register.table">
      <Table size="small" stickyHeader sx={{ borderCollapse: "separate", borderSpacing: 0 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ ...dicHeadCell, ...dicStickyCode, zIndex: 4 }} rowSpan={2}>Emp code</TableCell>
            <TableCell sx={{ ...dicHeadCell, ...dicStickyName, textAlign: "center", zIndex: 4 }} rowSpan={2}>Name</TableCell>
            <TableCell sx={dicHeadCell} rowSpan={2}>Father&apos;s name</TableCell>
            <TableCell sx={dicHeadCell} rowSpan={2}>Nature of work</TableCell>
            <TableCell sx={dicHeadCell} rowSpan={2}>Shift</TableCell>
            {lstDayIndexes.map((intIndex) => (
              <TableCell key={intIndex} sx={{ ...dicHeadCell, backgroundColor: isSundayIndex(dicRegister.intYear, dicRegister.intMonth, intIndex) ? "#e2e8f0" : dicHeadCell.backgroundColor, minWidth: 28 }}>
                {intIndex + 1}
              </TableCell>
            ))}
            {lstSummaryLabels.map((strLabel) => <TableCell key={strLabel} sx={dicHeadCell} rowSpan={2}>{strLabel}</TableCell>)}
          </TableRow>
          <TableRow>
            {lstDayIndexes.map((intIndex) => (
              <TableCell key={intIndex} sx={{ ...dicHeadCell, fontWeight: 500, top: 26 }}>{dicRegister.lstWeekdays[intIndex]}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {dicRegister.lstGroups.length === 0 ? (
            <TableRow><TableCell colSpan={intColumns} sx={{ ...dicBodyCell, py: 2 }}>No employees match the selected filters.</TableCell></TableRow>
          ) : null}
          {dicRegister.lstGroups.map((dicGroup) => [
            <TableRow key={`g-${dicGroup.strGroup}`}>
              <TableCell colSpan={intColumns} sx={{ ...dicBodyCell, backgroundColor: "#e2e8f0", fontWeight: 700, textAlign: "left" }}>
                {dicGroup.strLabel} ({dicGroup.lstRows.length})
              </TableCell>
            </TableRow>,
            ...dicGroup.lstRows.map((dicRow) => (
              <TableRow key={dicRow.intEmployeeID} hover>
                <TableCell sx={{ ...dicBodyCell, ...dicStickyCode, backgroundColor: "#fff" }}>{dicRow.strEmployeeCode}</TableCell>
                <TableCell sx={{ ...dicBodyCell, ...dicStickyName, backgroundColor: "#fff", fontWeight: 600 }}>{dicRow.strName}</TableCell>
                <TableCell sx={dicBodyCell}>{dicRow.strFatherName}</TableCell>
                <TableCell sx={dicBodyCell}>{dicRow.strDesignation}</TableCell>
                <TableCell sx={dicBodyCell}>{dicRow.strShift}</TableCell>
                {dicRow.lstDays.map((strCode, intIndex) => {
                  const dicStyle = getDayCodeStyle(strCode);
                  return (
                    <TableCell
                      key={intIndex}
                      sx={{
                        ...dicBodyCell,
                        backgroundColor: dicStyle?.strBackground ?? (isSundayIndex(dicRegister.intYear, dicRegister.intMonth, intIndex) ? "#f8fafc" : undefined),
                        color: dicStyle?.strColor,
                        fontWeight: dicStyle ? 600 : 400,
                      }}
                    >
                      {strCode}
                    </TableCell>
                  );
                })}
                {[
                  fmtDays(dicRow.dicTotals.decPresent), fmtDays(dicRow.dicTotals.decHalfDay), fmtDays(dicRow.dicTotals.decOnDuty),
                  fmtDays(dicRow.dicTotals.decCowin), fmtDays(dicRow.dicTotals.decActualPresent), fmtDays(dicRow.dicTotals.decWeeklyOff),
                  fmtDays(dicRow.dicTotals.decHoliday), fmtDays(dicRow.dicTotals.decWorkedOnHoliday, true), fmtDays(dicRow.dicTotals.decAbsent),
                  ...lstLeaveKeys.map((strKey) => fmtDays(getLeaveTotal(dicRow.dicTotals, strKey))),
                  fmtDays(dicRow.dicTotals.decTotalDays),
                ].map((strValue, intIndex) => (
                  <TableCell key={intIndex} sx={{ ...dicBodyCell, fontWeight: intIndex === lstSummaryLabels.length - 1 ? 700 : 400 }}>{strValue}</TableCell>
                ))}
              </TableRow>
            )),
          ])}
        </TableBody>
      </Table>
    </TableContainer>
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
                <TableCell colSpan={lstLabels.length} sx={{ ...dicBodyCell, backgroundColor: "#e2e8f0", fontWeight: 700, textAlign: "left" }}>{dicGroup.strLabel}</TableCell>
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
