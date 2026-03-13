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
import { useRouter } from "next/navigation";
import dicConstant from "@/constants/Constant.json";
import styles from "./login.module.css";
import { appRoutes } from "@/config";
import { useBoolean } from "@/hooks";
import { authService } from "@/services";

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

// Renders the premium SaaS login page with schema-based validation and submit feedback.
export default function LoginPage() {
  const passwordVisibility = useBoolean(true);
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
    await authService.login(dicFormData);
    router.push(appRoutes.dashboard);
  };

  return (
    <Box className={styles.pageRoot}>
      <Card elevation={0} className={styles.loginCard}>
        <Box className={styles.heroPanel}>
          <Box className={styles.heroOverlay} />

          <Box className={styles.heroContent}>
            <Typography className={styles.heroEyebrow}>
              HRMS
            </Typography>
            <Typography className={styles.heroTitle}>
              {dicConstant.appShell.title}
            </Typography>
            <Typography className={styles.heroSubtitle}>
              Secure Workforce Platform
            </Typography>
          </Box>
        </Box>

        <CardContent className={styles.formPanel}>
          <Box className={styles.formContainer}>
            <Typography className={styles.pageTitle}>
              {dicConstant.login.title}
            </Typography>
            <Typography className={styles.pageSubtitle}>
              {dicConstant.login.subtitle}
            </Typography>

            <Stack component="form" spacing={3} onSubmit={handleSubmit(onSubmit)} noValidate>
              <Controller
                name="userId"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    className={`${styles.textField} app-mui-text-field`}
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
                  />
                )}
              />

              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    className={`${styles.textField} app-mui-text-field`}
                    id="login-password"
                    label={dicConstant.login.passwordLabel}
                    type={passwordVisibility.value ? "password" : "text"}
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
                            className="app-mui-icon-button"
                            onClick={passwordVisibility.toggle}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseUp={(event) => event.preventDefault()}
                            edge="end"
                            aria-label={passwordVisibility.value ? "Show password" : "Hide password"}
                            aria-pressed={!passwordVisibility.value}
                            aria-controls="login-password"
                          >
                            {passwordVisibility.value ? (
                              <VisibilityOff fontSize="small" />
                            ) : (
                              <Visibility fontSize="small" />
                            )}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                )}
              />

              <Box className={styles.formMetaRow}>
                <FormControlLabel
                  className={styles.formControlLabel}
                  control={
                    <Checkbox
                      className="app-mui-checkbox"
                      size="small"
                      inputProps={{ "aria-label": dicConstant.login.rememberMe }}
                    />
                  }
                  label={<Typography className={styles.rememberLabel}>{dicConstant.login.rememberMe}</Typography>}
                />
                <MuiLink
                  className="app-mui-link-muted"
                  component={NextLink}
                  href="/forgot-password"
                  underline="none"
                >
                  {dicConstant.login.forgotPassword}
                </MuiLink>
              </Box>

              <Button
                className="app-mui-button-primary"
                type="submit"
                fullWidth
                variant="contained"
                disabled={!isValid || isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? <CircularProgress size={22} color="inherit" /> : dicConstant.login.loginButton}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
