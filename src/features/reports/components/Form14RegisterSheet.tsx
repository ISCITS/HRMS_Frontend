"use client";

import { Box, Typography } from "@mui/material";

import type { Form14Register } from "@/features/reports/services/form14ReportService";
import {
  buildForm14Footer,
  buildForm14Grid,
  buildForm14HeaderBlocks,
  form14SeparatePageNote,
} from "@/features/reports/utils/form14Grid";

type Form14RegisterSheetProps = {
  dicRegister: Form14Register;
  blnShowAdditional: boolean;
};

const strBorder = "1px solid #1f2937";
const strTint = "#eef2ff";

const dicCellSx = {
  border: strBorder,
  fontSize: 11,
  lineHeight: 1.25,
  px: 0.5,
  py: 0.4,
  textAlign: "center",
  verticalAlign: "middle",
} as const;

// The printed Form 14 page for one worker, built from the same grid model as the PDF/Excel export.
export default function Form14RegisterSheet({ dicRegister, blnShowAdditional }: Form14RegisterSheetProps) {
  const dicGrid = buildForm14Grid(dicRegister, blnShowAdditional);
  const dicFooter = buildForm14Footer(dicRegister);
  const dicBlocks = buildForm14HeaderBlocks(dicRegister);
  const intTotalCols = dicGrid.intStatutoryCols + dicGrid.intAdditionalCols;
  const blnAdditional = dicGrid.intAdditionalCols > 0;

  function groupAt(intColumn: number) {
    return dicGrid.lstGroups.find((lstGroup) => lstGroup[1] === intColumn);
  }

  function isCoveredByGroup(intColumn: number) {
    return dicGrid.lstGroups.some((lstGroup) => intColumn > lstGroup[1] && intColumn <= lstGroup[2]);
  }

  return (
    <Box sx={{ color: "#111827", minWidth: 0 }} data-form14-sheet="true">
      <Box sx={{ border: strBorder, display: "grid", gridTemplateColumns: { xs: "1fr", md: "27% 40% 33%" } }}>
        <Box sx={{ p: 1 }}>
          {dicBlocks.lstLeft.map(([strLabel, strValue]) => (
            <Typography key={strLabel} sx={{ fontSize: 12 }}>{strLabel}: <strong>{strValue}</strong></Typography>
          ))}
        </Box>
        <Box sx={{ p: 1, textAlign: "center" }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700 }}>{dicFooter.strCentre1}</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{dicFooter.strCentre2}</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{dicFooter.strCentre3}</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{dicFooter.strCentre4}</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{dicFooter.strCentre5}</Typography>
        </Box>
        <Box sx={{ p: 1 }}>
          {dicBlocks.lstRight.map(([strLabel, strValue]) => (
            <Typography key={strLabel} sx={{ fontSize: 12 }}>{strLabel}: <strong>{strValue}</strong></Typography>
          ))}
        </Box>
      </Box>

      <Box sx={{ mt: 1, overflowX: "auto" }}>
        <Box component="table" sx={{ borderCollapse: "collapse", minWidth: blnAdditional ? 1500 : 1100, width: "100%" }}>
          <thead>
            <tr style={{ background: "#e5e7eb" }}>
              {Array.from({ length: intTotalCols }, (_, intColumn) => {
                if (isCoveredByGroup(intColumn)) {
                  return null;
                }
                const lstGroup = groupAt(intColumn);
                if (lstGroup) {
                  return <Box component="th" key={`g${intColumn}`} colSpan={lstGroup[2] - lstGroup[1] + 1} sx={{ ...dicCellSx, fontWeight: 700 }}>{lstGroup[0]}</Box>;
                }
                if (blnAdditional && intColumn === dicGrid.intStatutoryCols) {
                  return <Box component="th" key="add" colSpan={dicGrid.intAdditionalCols} sx={{ ...dicCellSx, background: strTint, fontWeight: 700 }}>{dicGrid.strAdditionalTitle}</Box>;
                }
                if (blnAdditional && intColumn > dicGrid.intStatutoryCols) {
                  return null;
                }
                return <Box component="th" key={`g${intColumn}`} sx={dicCellSx} />;
              })}
            </tr>
            <tr style={{ background: "#e5e7eb" }}>
              {dicGrid.lstLabels.map((strLabel, intColumn) => (
                <Box component="th" key={`l${intColumn}`} sx={{ ...dicCellSx, fontWeight: 700, ...(intColumn >= dicGrid.intStatutoryCols ? { background: strTint } : {}) }}>{strLabel}</Box>
              ))}
            </tr>
            <tr style={{ background: "#e5e7eb" }}>
              {dicGrid.lstNumbers.map((strNumber, intColumn) => (
                <Box component="th" key={`n${intColumn}`} sx={{ ...dicCellSx, fontWeight: 700, ...(intColumn >= dicGrid.intStatutoryCols ? { background: strTint } : {}) }}>{strNumber}</Box>
              ))}
            </tr>
          </thead>
          <tbody>
            {dicGrid.lstBody.map((lstRow, intRow) => (
              <tr key={intRow}>
                {lstRow.map((strValue, intColumn) => (
                  <Box component="td" key={intColumn} sx={{ ...dicCellSx, ...(intColumn >= dicGrid.intStatutoryCols ? { background: strTint } : {}) }}>{strValue}</Box>
                ))}
              </tr>
            ))}
            <tr style={{ background: "#f3f4f6" }}>
              {dicGrid.lstTotals.map((strValue, intColumn) => (
                <Box component="td" key={intColumn} sx={{ ...dicCellSx, fontWeight: 700, ...(intColumn >= dicGrid.intStatutoryCols ? { background: strTint } : {}) }}>{strValue}</Box>
              ))}
            </tr>
          </tbody>
        </Box>
      </Box>

      <Box sx={{ border: strBorder, display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, mt: 1 }}>
        {[dicFooter.strQualifying, dicFooter.strEarned, dicFooter.strCarry].map((strText) => (
          <Typography key={strText} sx={{ borderRight: strBorder, fontSize: 12, fontWeight: 600, p: 1 }}>{strText}</Typography>
        ))}
      </Box>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "1fr 1fr", mt: 1 }}>
        <Box sx={{ borderTop: strBorder, mt: 5, pt: 0.5 }}>
          <Typography sx={{ fontSize: 12 }}>Signature of employee (leave book received)</Typography>
        </Box>
        <Box sx={{ borderTop: strBorder, mt: 5, pt: 0.5 }}>
          <Typography sx={{ fontSize: 12 }}>Signature of Manager / Occupier</Typography>
        </Box>
      </Box>
      <Typography sx={{ color: "#4b5563", fontSize: 11, mt: 0.5 }}>{form14SeparatePageNote}</Typography>
    </Box>
  );
}
