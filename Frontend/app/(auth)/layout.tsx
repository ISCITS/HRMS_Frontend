import { Box, Container, Paper, Typography } from "@mui/material";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container maxWidth="sm" sx={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
      <Paper sx={{ width: "100%", p: 4 }}>
        <Box sx={{ mb: 3, textAlign: "center" }}>
          <Typography variant="h4" fontWeight={700}>
            HRMS Portal
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Authentication template screens
          </Typography>
        </Box>
        {children}
      </Paper>
    </Container>
  );
}