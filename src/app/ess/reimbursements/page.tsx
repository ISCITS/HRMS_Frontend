import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import {
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

type ClaimRecord = {
  strClaimID: string;
  strCategory: string;
  strDate: string;
  strAmount: string;
  strStatus: "Pending" | "Approved" | "Rejected" | "Reimbursed";
  strNextApprover: string;
};

const lstClaims: ClaimRecord[] = [
  {
    strClaimID: "CLM-2026-0418",
    strCategory: "Travel",
    strDate: "18 Apr 2026",
    strAmount: "INR 3,450",
    strStatus: "Pending",
    strNextApprover: "R&D Manager",
  },
  {
    strClaimID: "CLM-2026-0407",
    strCategory: "Medical",
    strDate: "07 Apr 2026",
    strAmount: "INR 2,800",
    strStatus: "Approved",
    strNextApprover: "Finance Processing",
  },
  {
    strClaimID: "CLM-2026-0326",
    strCategory: "Food",
    strDate: "26 Mar 2026",
    strAmount: "INR 1,120",
    strStatus: "Reimbursed",
    strNextApprover: "Completed",
  },
  {
    strClaimID: "CLM-2026-0315",
    strCategory: "Internet",
    strDate: "15 Mar 2026",
    strAmount: "INR 900",
    strStatus: "Rejected",
    strNextApprover: "Completed",
  },
];

function getStatusColor(strStatus: ClaimRecord["strStatus"]) {
  if (strStatus === "Approved" || strStatus === "Reimbursed") {
    return "success";
  }
  if (strStatus === "Pending") {
    return "warning";
  }
  return "error";
}

function KpiCard({ strLabel, strValue, strAccent }: { strLabel: string; strValue: string; strAccent: string }) {
  return (
    <Paper
      sx={{
        p: 1.35,
        borderRadius: "14px",
        border: "1px solid rgba(148,163,184,0.24)",
        background: "linear-gradient(180deg, rgba(248,250,252,0.9), rgba(241,245,249,0.8))",
      }}
    >
      <Typography sx={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 700 }}>{strLabel}</Typography>
      <Typography sx={{ fontSize: "1.1rem", color: strAccent, fontWeight: 800, mt: 0.2 }}>{strValue}</Typography>
    </Paper>
  );
}

export default function EssReimbursementsPage() {
  return (
    <Stack spacing={1.5}>
      <Paper
        sx={{
          p: { xs: 1.5, md: 2 },
          borderRadius: "20px",
          border: "1px solid rgba(148,163,184,0.22)",
          background: "linear-gradient(135deg, #0b3f70 0%, #0a66a3 52%, #0e7490 100%)",
          color: "white",
          boxShadow: "0 14px 28px rgba(2, 6, 23, 0.18)",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                backgroundColor: "rgba(255,255,255,0.2)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <ReceiptLongRoundedIcon />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: "1rem" }}>Reimbursement & Claims</Typography>
              <Typography sx={{ fontSize: "0.82rem", color: "rgba(241,245,249,0.92)" }}>
                Static UI for R&D phase. Dynamic data integration will follow.
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<UploadFileRoundedIcon />}
              sx={{
                borderRadius: "10px",
                textTransform: "none",
                fontWeight: 700,
                color: "#0f172a",
                backgroundColor: "#f8fafc",
                "&:hover": { backgroundColor: "#e2e8f0" },
              }}
            >
              Upload Bill
            </Button>
            <Button
              variant="contained"
              startIcon={<VerifiedRoundedIcon />}
              sx={{
                borderRadius: "10px",
                textTransform: "none",
                fontWeight: 700,
                color: "#0f172a",
                backgroundColor: "#dbeafe",
                "&:hover": { backgroundColor: "#bfdbfe" },
              }}
            >
              New Claim
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={1.25}>
        <Grid item xs={6} md={3}><KpiCard strLabel="Pending Claims" strValue="3" strAccent="#b45309" /></Grid>
        <Grid item xs={6} md={3}><KpiCard strLabel="Approved This Month" strValue="5" strAccent="#166534" /></Grid>
        <Grid item xs={6} md={3}><KpiCard strLabel="Rejected This Month" strValue="1" strAccent="#b91c1c" /></Grid>
        <Grid item xs={6} md={3}><KpiCard strLabel="Reimbursed Amount" strValue="INR 24,570" strAccent="#1d4ed8" /></Grid>
      </Grid>

      <Paper sx={{ p: 1.5, borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 10px 20px rgba(15,23,42,0.05)" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 1.25 }}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.96rem" }}>My Claims</Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap">
            <Chip size="small" label="All Claims" color="primary" />
            <Chip size="small" label="Travel" variant="outlined" />
            <Chip size="small" label="Medical" variant="outlined" />
            <Chip size="small" label="Food" variant="outlined" />
          </Stack>
        </Stack>
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Claim ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Next Approver</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lstClaims.map((objClaim) => (
              <TableRow key={objClaim.strClaimID} hover>
                <TableCell sx={{ fontWeight: 700, color: "#1d4ed8" }}>{objClaim.strClaimID}</TableCell>
                <TableCell>{objClaim.strCategory}</TableCell>
                <TableCell>{objClaim.strDate}</TableCell>
                <TableCell>{objClaim.strAmount}</TableCell>
                <TableCell>
                  <Chip size="small" label={objClaim.strStatus} color={getStatusColor(objClaim.strStatus)} />
                </TableCell>
                <TableCell>{objClaim.strNextApprover}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 1.5, borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 10px 20px rgba(15,23,42,0.05)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.96rem", mb: 0.8 }}>
          Selected Claim Timeline (Static)
        </Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <Chip label="Submitted 18 Apr 2026, 10:15 AM" color="info" variant="outlined" />
          <Chip label="Manager Review Pending" color="warning" />
          <Chip label="Finance Payout Pending" variant="outlined" />
        </Stack>
        <Divider sx={{ my: 1.2 }} />
        <Typography sx={{ fontSize: "0.85rem", color: "#334155" }}>
          Note: This is a static UX shell. Buttons and filters are intentionally non-persistent until backend APIs are linked.
        </Typography>
      </Paper>
    </Stack>
  );
}
