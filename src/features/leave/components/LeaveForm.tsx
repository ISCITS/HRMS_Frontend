"use client";

import { Box, Button, Stack, TextField } from "@mui/material";
import Link from "next/link";
import dicConstant from "@/constants/Constant.json";
import styles from "./LeaveForm.module.css";

// Renders leave application fields and request submission button.
export default function LeaveForm() {
  /*
  Functional responsibility:
  - Render leave request form with type/date/reason inputs.
  
  Inputs:
  - Uses local defaults for leave type and empty values for user entry.
  
  Output:
  - Leave application UI with submit action button.
  
  Failure behavior:
  - No backend call bound yet; submission is UI-only placeholder.
  */
  return (
    <Stack component="form" spacing={3}>
      <Box className={styles.formGrid}>
        <TextField
          id="leave-type"
          select
          SelectProps={{ native: true, inputProps: { "data-testid": "leave.form.type.select" } }}
          label={dicConstant.leave.form.type}
          defaultValue={dicConstant.leave.form.typeCasual}
          fullWidth
        >
          <option value={dicConstant.leave.form.typeCasual}>{dicConstant.leave.form.typeCasual}</option>
          <option value={dicConstant.leave.form.typeSick}>{dicConstant.leave.form.typeSick}</option>
          <option value={dicConstant.leave.form.typeEarned}>{dicConstant.leave.form.typeEarned}</option>
        </TextField>
        <TextField id="leave-start-date" type="date" label={dicConstant.leave.form.startDate} inputProps={{ "data-testid": "leave.form.start-date.input" }} InputLabelProps={{ shrink: true }} fullWidth />
        <TextField id="leave-end-date" type="date" label={dicConstant.leave.form.endDate} inputProps={{ "data-testid": "leave.form.end-date.input" }} InputLabelProps={{ shrink: true }} fullWidth />
        <TextField
          id="leave-reason"
          label={dicConstant.leave.form.reason}
          inputProps={{ "data-testid": "leave.form.reason.input" }}
          multiline
          minRows={3}
          fullWidth
          className={styles.reasonField}
        />
      </Box>
      <Stack direction="row" className={styles.actionsRow}>
        <Button data-testid="leave.form.cancel.button" component={Link} href="/leave" variant="text">
          {dicConstant.common.cancel}
        </Button>
        <Button data-testid="leave.form.submit.button" variant="contained">{dicConstant.leave.form.submit}</Button>
      </Stack>
    </Stack>
  );
}
