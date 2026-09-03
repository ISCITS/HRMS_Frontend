"use client";

import { Box, Button, Stack, TextField, MenuItem } from "@mui/material";
import dicConstant from "@/constants/Constant.json";
import styles from "./PayrollRunForm.module.css";

// Renders payroll-run setup fields and action buttons.
export default function PayrollRunForm() {
  /*
  Functional responsibility:
  - Render payroll-run configuration inputs and trigger actions.
  
  Inputs:
  - Uses local default selections for month, department, and pay cycle.
  
  Output:
  - Form UI for payroll generation/preview workflows.
  
  Failure behavior:
  - No API call bound yet; action buttons are placeholders.
  */
  return (
    <Stack component="form" spacing={3}>
      <Box className={styles.formGrid}>
        <TextField select label={dicConstant.payroll.runForm.month} defaultValue={dicConstant.payroll.runForm.monthMarch} controlId="payroll.run-form.month.select" inputProps={{ "controlId": "payroll.run-form.month.select" }} fullWidth>
          <MenuItem value={dicConstant.payroll.runForm.monthMarch}>{dicConstant.payroll.runForm.monthMarch}</MenuItem>
          <MenuItem value={dicConstant.payroll.runForm.monthFebruary}>{dicConstant.payroll.runForm.monthFebruary}</MenuItem>
          <MenuItem value={dicConstant.payroll.runForm.monthJanuary}>{dicConstant.payroll.runForm.monthJanuary}</MenuItem>
        </TextField>
        <TextField select label={dicConstant.payroll.runForm.department} defaultValue={dicConstant.payroll.runForm.departmentAll} controlId="payroll.run-form.department.select" inputProps={{ "controlId": "payroll.run-form.department.select" }} fullWidth>
          <MenuItem value={dicConstant.payroll.runForm.departmentAll}>{dicConstant.payroll.runForm.departmentAll}</MenuItem>
          <MenuItem value={dicConstant.payroll.runForm.departmentEngineering}>{dicConstant.payroll.runForm.departmentEngineering}</MenuItem>
          <MenuItem value={dicConstant.payroll.runForm.departmentHr}>{dicConstant.payroll.runForm.departmentHr}</MenuItem>
          <MenuItem value={dicConstant.payroll.runForm.departmentFinance}>{dicConstant.payroll.runForm.departmentFinance}</MenuItem>
        </TextField>
        <TextField select label={dicConstant.payroll.runForm.cycle} defaultValue={dicConstant.payroll.runForm.cycleMonthly} controlId="payroll.run-form.cycle.select" inputProps={{ "controlId": "payroll.run-form.cycle.select" }} fullWidth>
          <MenuItem value={dicConstant.payroll.runForm.cycleMonthly}>{dicConstant.payroll.runForm.cycleMonthly}</MenuItem>
          <MenuItem value={dicConstant.payroll.runForm.cycleBiWeekly}>{dicConstant.payroll.runForm.cycleBiWeekly}</MenuItem>
        </TextField>
      </Box>
      <TextField
        label={dicConstant.payroll.runForm.note}
        controlId="payroll.run-form.note.input"
        inputProps={{ "controlId": "payroll.run-form.note.input" }}
        fullWidth
        multiline
        minRows={2}
        placeholder={dicConstant.payroll.runForm.notePlaceholder}
      />
      <Stack direction="row" className={styles.actionsRow}>
        <Button variant="contained" controlId="payroll.run-form.generate.button">{dicConstant.payroll.runForm.generateButton}</Button>
        <Button variant="outlined" controlId="payroll.run-form.preview.button">{dicConstant.payroll.runForm.previewButton}</Button>
      </Stack>
    </Stack>
  );
}
