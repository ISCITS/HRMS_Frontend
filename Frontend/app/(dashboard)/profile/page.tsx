import { Paper, Stack, Typography } from "@mui/material";
import ProfileForm from "@/components/profile/ProfileForm";

export default function ProfilePage() {
  return (
    <Stack spacing={3}>
      <Typography variant="h4" fontWeight={700}>
        Profile
      </Typography>
      <Paper
        sx={{
          p: { xs: 3, sm: 5 },
          backgroundColor: "#ffffff",
          borderRadius: "28px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.06)",
          animation: "profileFadeIn 200ms ease-out",
          "@keyframes profileFadeIn": {
            from: { opacity: 0, transform: "translateY(8px)" },
            to: { opacity: 1, transform: "translateY(0)" }
          }
        }}
      >
        <ProfileForm />
      </Paper>
    </Stack>
  );
}
