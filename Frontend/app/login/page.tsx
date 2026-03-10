"use client";  

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link as MuiLink,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import NextLink from "next/link";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useState } from "react";
import { useRouter } from "next/navigation";
import dicConstant from "@/constants/Constant.json";

type LoginFormValues = {
  userId: string;
  password: string;
};

const clsLoginSchema: yup.ObjectSchema<LoginFormValues> = yup.object({
  userId: yup
    .string()
    .required(dicConstant.login.userIdRequired)
    .min(4, dicConstant.login.userIdMin),
  password: yup
    .string()
    .required(dicConstant.login.passwordRequired)
    .min(6, dicConstant.login.passwordMin)
});

const dicTextFieldSx = {
  "& .MuiFormLabel-asterisk": {
    color: "#ef4444"
  },
  "& .MuiInputLabel-root": {
    transform: "translate(14px, 15px) scale(1)"
  },
  "& .MuiInputLabel-root.MuiInputLabel-shrink": {
    transform: "translate(14px, -9px) scale(0.75)"
  },
  "& .MuiOutlinedInput-root": {
    minHeight: 52,
    borderRadius: "14px",
    alignItems: "center",
    transition: "all 0.2s ease",
    "& input": {
      padding: "14px 14px"
    },
    "& .MuiOutlinedInput-notchedOutline": {
      border: "1px solid #e2e8f0"
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "#cbd5e1"
    },
    "&.Mui-focused": {
      backgroundColor: "#f8fafc"
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "#2563eb"
    }
  }
};

// Renders the premium SaaS login page with schema-based validation and submit feedback.
export default function LoginPage() {
  // Functional responsibility:
  // - Render login UI and validate credentials using React Hook Form + Yup.
  // Inputs:
  // - User-provided userId and password values.
  // Output:
  // - Validated submit flow with loading state and redirect to dashboard.
  // Failure behavior:
  // - Invalid form blocks submission and displays field-level errors.
  const [intIsPasswordHidden, setIntIsPasswordHidden] = useState(1);
  const router = useRouter();

  const {
    control,
    clearErrors,
    handleSubmit,
    formState: { errors, isValid, isSubmitting }
  } = useForm<LoginFormValues>({
    mode: "onChange",
    resolver: yupResolver(clsLoginSchema),
    defaultValues: {
      userId: "",
      password: ""
    }
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (dicFormData) => {
    console.log("Login Form Data:", dicFormData);

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 2000);
    });

    const strAuthCookie = "hrms_auth=1; Path=/; Max-Age=28800; SameSite=Lax";
    document.cookie = strAuthCookie;
    router.push("/dashboard");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 2, sm: 3 },
        py: { xs: 3, sm: 4 },
        backgroundColor: "#f8fafc"
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 1100,
          borderRadius: "28px",
          overflow: "hidden",
          boxShadow: "0 30px 60px rgba(0,0,0,0.08)",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          animation: "loginFadeIn 200ms ease-out",
          "@keyframes loginFadeIn": {
            from: { opacity: 0, transform: "translateY(8px)" },
            to: { opacity: 1, transform: "translateY(0)" }
          }
        }}
      >
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            p: 6,
            position: "relative",
            overflow: "hidden",
            alignItems: "flex-end",
            background: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)"
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 40%)"
            }}
          />

          <Box sx={{ position: "relative", zIndex: 1 }}>
            <Typography sx={{ color: "rgba(255,255,255,0.9)", fontSize: 13, textTransform: "uppercase", letterSpacing: 1, mb: 1 }}>
              HRMS
            </Typography>
            <Typography
              sx={{
                color: "#ffffff",
                fontSize: 32,
                lineHeight: 1.15,
                fontWeight: 700,
                letterSpacing: "-0.2px",
                maxWidth: 360
              }}
            >
              {dicConstant.appShell.title}
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.85)", fontSize: 14, mt: 1.5 }}>
              Secure Workforce Platform
            </Typography>
          </Box>
        </Box>

        <CardContent
          sx={{
            p: { xs: 3, sm: 6 },
            backgroundColor: "#ffffff",
            borderRadius: { md: "24px" },
            boxShadow: "inset 0 1px 2px rgba(15,23,42,0.04)",
            display: "flex",
            alignItems: "center"
          }}
        >
          <Box sx={{ width: "100%", maxWidth: 430, mx: "auto" }}>
            <Typography sx={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2, mb: 1 }}>
              {dicConstant.login.title}
            </Typography>
            <Typography sx={{ fontSize: 15, color: "#64748b", mb: 3 }}>
              {dicConstant.login.subtitle}
            </Typography>

            <Stack component="form" spacing={3} onSubmit={handleSubmit(onSubmit)} noValidate>
              <Controller
                name="userId"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    id="login-user-id"
                    label={dicConstant.login.userIdLabel}
                    fullWidth
                    required
                    autoFocus
                    onChange={(event) => {
                      clearErrors("userId");
                      field.onChange(event);
                    }}
                    error={Boolean(errors.userId)}
                    helperText={errors.userId?.message}
                    inputProps={{ "aria-label": "User ID input", minLength: 4 }}
                    sx={dicTextFieldSx}
                  />
                )}
              />

              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    id="login-password"
                    label={dicConstant.login.passwordLabel}
                    type={intIsPasswordHidden === 1 ? "password" : "text"}
                    fullWidth
                    required
                    onChange={(event) => {
                      clearErrors("password");
                      field.onChange(event);
                    }}
                    error={Boolean(errors.password)}
                    helperText={errors.password?.message}
                    inputProps={{ "aria-label": "Password input", minLength: 6 }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setIntIsPasswordHidden((intPrev) => (intPrev === 1 ? 0 : 1))}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseUp={(event) => event.preventDefault()}
                            edge="end"
                            aria-label={intIsPasswordHidden === 1 ? "Show password" : "Hide password"}
                            aria-pressed={intIsPasswordHidden === 0}
                            aria-controls="login-password"
                            sx={{
                              transition: "all 0.2s ease",
                              "&:focus-visible": {
                                outline: "2px solid #2563eb",
                                outlineOffset: 2
                              }
                            }}
                          >
                            {intIsPasswordHidden === 1 ? (
                              <Visibility fontSize="small" />
                            ) : (
                              <VisibilityOff fontSize="small" />
                            )}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    sx={dicTextFieldSx}
                  />
                )}
              />

              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: -0.5 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      inputProps={{ "aria-label": dicConstant.login.rememberMe }}
                      sx={{ transition: "all 0.2s ease" }}
                    />
                  }
                  label={<Typography sx={{ fontSize: 14, color: "#64748b" }}>{dicConstant.login.rememberMe}</Typography>}
                  sx={{ m: 0 }}
                />
                <MuiLink
                  component={NextLink}
                  href="/forgot-password"
                  underline="none"
                  sx={{
                    fontSize: 13,
                    color: "#64748b",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      textDecoration: "underline",
                      color: "#1d4ed8"
                    },
                    "&:focus-visible": {
                      outline: "2px solid #2563eb",
                      outlineOffset: 3,
                      borderRadius: "4px"
                    }
                  }}
                >
                  {dicConstant.login.forgotPassword}
                </MuiLink>
              </Stack>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={!isValid || isSubmitting}
                sx={{
                  minHeight: 52,
                  borderRadius: "14px",
                  backgroundColor: "#2563eb",
                  fontWeight: 600,
                  boxShadow: "0 6px 16px rgba(37,99,235,0.35)",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    backgroundColor: "#1d4ed8"
                  },
                  "&:active": {
                    transform: "translateY(0)"
                  },
                  "&:focus-visible": {
                    outline: "2px solid #2563eb",
                    outlineOffset: 2
                  }
                }}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? <CircularProgress size={22} color="inherit" /> : dicConstant.login.loginButton}
              </Button>

              {/* <Typography sx={{ textAlign: "center", color: "#64748b", fontSize: 13 }}>
              
              </Typography> */}
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
