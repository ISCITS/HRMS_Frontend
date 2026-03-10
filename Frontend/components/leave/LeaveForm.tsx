"use client";

import { Box, Button, Stack, TextField } from "@mui/material";
import Link from "next/link";
import dicConstant from "@/constants/Constant.json";

// Renders leave application fields and request submission button.
export default function LeaveForm() {
  // Functional responsibility:
  // - Render leave request form with type/date/reason inputs.
  // Inputs:
  // - Uses local defaults for leave type and empty values for user entry.
  // Output:
  // - Leave application UI with submit action button.
  // Failure behavior:
  // - No backend call bound yet; submission is UI-only placeholder.
  return (
    <Stack component="form" spacing={3}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 3
        }}
      >
        <TextField
          id="leave-type"
          select
          SelectProps={{ native: true }}
          label={dicConstant.leave.form.type}
          defaultValue={dicConstant.leave.form.typeCasual}
          fullWidth
        >
          <option value={dicConstant.leave.form.typeCasual}>{dicConstant.leave.form.typeCasual}</option>
          <option value={dicConstant.leave.form.typeSick}>{dicConstant.leave.form.typeSick}</option>
          <option value={dicConstant.leave.form.typeEarned}>{dicConstant.leave.form.typeEarned}</option>
        </TextField>
        <TextField id="leave-start-date" type="date" label={dicConstant.leave.form.startDate} InputLabelProps={{ shrink: true }} fullWidth />
        <TextField id="leave-end-date" type="date" label={dicConstant.leave.form.endDate} InputLabelProps={{ shrink: true }} fullWidth />
        <TextField
          id="leave-reason"
          label={dicConstant.leave.form.reason}
          multiline
          minRows={3}
          fullWidth
          sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}
        />
      </Box>
      <Stack direction="row" spacing={1.5} justifyContent="flex-end">
        <Button component={Link} href="/leave" variant="text">
          {dicConstant.common.cancel}
        </Button>
        <Button variant="contained">{dicConstant.leave.form.submit}</Button>
      </Stack>
    </Stack>
  );
}
