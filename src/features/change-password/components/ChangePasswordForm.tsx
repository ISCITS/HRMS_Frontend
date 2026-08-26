"use client";

import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import * as yup from "yup";

import { useChangePassword } from "@/features/change-password/hooks/useChangePassword";
import { changePasswordService } from "@/features/change-password/services/changePasswordService";
import type { ChangePasswordFormValues, PasswordResetEmployeeOption } from "@/features/change-password/types/ChangePasswordTypes";

const objPasswordRules = {
  blnMinimumLength: (strValue: string) => strValue.length >= 8,
  blnUppercase: (strValue: string) => /[A-Z]/.test(strValue),
  blnLowercase: (strValue: string) => /[a-z]/.test(strValue),
  blnNumber: (strValue: string) => /\d/.test(strValue),
  blnSpecial: (strValue: string) => /[^A-Za-z0-9]/.test(strValue)
};

function createValidationSchema(blnRequireCurrentPassword: boolean): yup.ObjectSchema<ChangePasswordFormValues> {
  return yup.object({
    strCurrentPassword: blnRequireCurrentPassword
      ? yup.string().required("Current password is required.")
      : yup.string().defined(),
    strNewPassword: yup.string()
      .required("New password is required.")
      .min(8, "The new password must contain at least 8 characters.")
      .matches(/[A-Z]/, "The new password must contain at least one uppercase letter.")
      .matches(/[a-z]/, "The new password must contain at least one lowercase letter.")
      .matches(/\d/, "The new password must contain at least one number.")
      .matches(/[^A-Za-z0-9]/, "The new password must contain at least one special character.")
      .test("different-password", "The new password must be different from your current password.", function (strValue) {
        return !strValue || strValue !== this.parent.strCurrentPassword;
      }),
    strConfirmPassword: yup.string()
      .required("Confirm new password is required.")
      .oneOf([yup.ref("strNewPassword")], "The passwords do not match.")
  });
}

type PasswordFieldProps = {
  strName: keyof ChangePasswordFormValues;
  strLabel: string;
  strAutoComplete: string;
  strControlPrefix: string;
  blnVisible: boolean;
  fnToggleVisibility: () => void;
  objRegister: ReturnType<typeof useForm<ChangePasswordFormValues>>["register"];
  strError?: string;
};

function PasswordField(objProps: PasswordFieldProps) {
  const strVisibilityLabel = objProps.blnVisible ? `Hide ${objProps.strLabel}` : `Show ${objProps.strLabel}`;
  return (
    <Box>
      <Typography
        sx={{
          display: "block",
          mb: 1,
          color: "#0f172a",
          fontSize: "0.95rem",
          fontWeight: 600
        }}
      >
        {objProps.strLabel}
      </Typography>
      <TextField
        {...objProps.objRegister(objProps.strName)}
        type={objProps.blnVisible ? "text" : "password"}
        autoComplete={objProps.strAutoComplete}
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        error={Boolean(objProps.strError)}
        helperText={objProps.strError}
        fullWidth
        inputProps={{
          "data-controlid": `${objProps.strControlPrefix}.input`,
          "aria-invalid": Boolean(objProps.strError)
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LockRoundedIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                type="button"
                edge="end"
                aria-label={strVisibilityLabel}
                title={strVisibilityLabel}
                onClick={objProps.fnToggleVisibility}
                data-controlid={`${objProps.strControlPrefix}.visibility.toggle`}
              >
                {objProps.blnVisible ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
              </IconButton>
            </InputAdornment>
          )
        }}
      />
    </Box>
  );
}

type ChangePasswordFormProps = {
  blnAdminResetMode: boolean;
  fnOnEmployeeOptionsLoaded?: () => void;
};

export default function ChangePasswordForm({
  blnAdminResetMode,
  fnOnEmployeeOptionsLoaded
}: ChangePasswordFormProps) {
  const objRouter = useRouter();
  const objSearchParams = useSearchParams();
  const { changePassword, blnSubmitting } = useChangePassword();
  const [blnCurrentVisible, setBlnCurrentVisible] = useState(false);
  const [blnNewVisible, setBlnNewVisible] = useState(false);
  const [blnConfirmVisible, setBlnConfirmVisible] = useState(false);
  const [strServerError, setStrServerError] = useState("");
  const [strSuccessMessage, setStrSuccessMessage] = useState("");
  const [lstEmployees, setLstEmployees] = useState<PasswordResetEmployeeOption[]>([]);
  const [strEmployeeID, setStrEmployeeID] = useState("");
  const [objCurrentEmployeeIdentity, setObjCurrentEmployeeIdentity] = useState({
    lstEmployeeIDs: [] as number[],
    strEmployeeCode: ""
  });
  const [blnLoadingEmployees, setBlnLoadingEmployees] = useState(false);
  function isCurrentEmployee(objEmployee?: PasswordResetEmployeeOption) {
    if (!objEmployee) {
      return false;
    }

    const strEmployeeCode = objEmployee.strEmployeeCode.trim().toUpperCase();
    return objEmployee.blnIsCurrentUser === true
      || objCurrentEmployeeIdentity.lstEmployeeIDs.includes(objEmployee.intEmployeeID)
      || (
        Boolean(strEmployeeCode)
        && strEmployeeCode === objCurrentEmployeeIdentity.strEmployeeCode.trim().toUpperCase()
      );
  }
  const objSelectedEmployee = lstEmployees.find(
    (objEmployee) => objEmployee.intEmployeeID === Number(strEmployeeID)
  );
  const blnSelectedEmployeeIsCurrentUser = blnAdminResetMode
    && isCurrentEmployee(objSelectedEmployee);
  const blnRequireCurrentPassword = !blnAdminResetMode || blnSelectedEmployeeIsCurrentUser;
  const objValidationSchema = useMemo(
    () => createValidationSchema(blnRequireCurrentPassword),
    [blnRequireCurrentPassword]
  );
  const objForm = useForm<ChangePasswordFormValues>({
    resolver: yupResolver(objValidationSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: { strCurrentPassword: "", strNewPassword: "", strConfirmPassword: "" }
  });
  const strNewPassword = useWatch({ control: objForm.control, name: "strNewPassword" }) || "";
  const strRequestedReturnTo = (objSearchParams.get("returnTo") || "").trim();
  const strReturnTo = strRequestedReturnTo.startsWith("/")
    && !strRequestedReturnTo.startsWith("//")
    && !strRequestedReturnTo.startsWith("/profile/change-password")
    ? strRequestedReturnTo
    : "/dashboard";

  useEffect(() => {
    if (!blnAdminResetMode) {
      setLstEmployees([]);
      setStrEmployeeID("");
      setObjCurrentEmployeeIdentity({ lstEmployeeIDs: [], strEmployeeCode: "" });
      return;
    }

    let blnMounted = true;
    setBlnLoadingEmployees(true);
    setStrServerError("");
    Promise.all([
      changePasswordService.getPasswordResetEmployees(),
      changePasswordService.getCurrentEmployeeIdentity()
    ])
      .then(([lstOptions, objIdentity]) => {
        if (blnMounted) {
          setLstEmployees(lstOptions);
          setObjCurrentEmployeeIdentity(objIdentity);
        }
      })
      .catch((objError) => {
        if (blnMounted) {
          setStrServerError(objError instanceof Error && objError.message
            ? objError.message
            : "Unable to load employees.");
        }
      })
      .finally(() => {
        if (blnMounted) {
          setBlnLoadingEmployees(false);
          fnOnEmployeeOptionsLoaded?.();
        }
      });

    return () => {
      blnMounted = false;
    };
  }, [blnAdminResetMode, fnOnEmployeeOptionsLoaded]);

  useEffect(() => {
    if (!blnRequireCurrentPassword) {
      objForm.setValue("strCurrentPassword", "", { shouldDirty: false });
      objForm.clearErrors("strCurrentPassword");
    }
    void objForm.trigger("strCurrentPassword");
  }, [blnRequireCurrentPassword, objForm]);

  async function handleSubmit(objValues: ChangePasswordFormValues) {
    setStrServerError("");
    setStrSuccessMessage("");
    try {
      if (blnAdminResetMode && !strEmployeeID) {
        setStrServerError("Please select an employee.");
        return;
      }
      const objResult = await changePassword(
        objValues,
        blnAdminResetMode && !blnSelectedEmployeeIsCurrentUser
          ? Number(strEmployeeID)
          : undefined
      );
      if (objResult) {
        setStrSuccessMessage(blnAdminResetMode && !blnSelectedEmployeeIsCurrentUser
          ? "Employee password has been reset successfully."
          : "Your password has been changed successfully.");
        objForm.reset();
        if (blnAdminResetMode) {
          setStrEmployeeID("");
        }
      }
    } catch (objError) {
      setStrServerError(objError instanceof Error && objError.message
        ? objError.message
        : (blnAdminResetMode && !blnSelectedEmployeeIsCurrentUser
          ? "Unable to reset the employee password. Please try again."
          : "Unable to change your password. Please try again."));
    }
  }

  const lstPolicyRules = [
    { strLabel: "Minimum 8 characters", blnSatisfied: objPasswordRules.blnMinimumLength(strNewPassword) },
    { strLabel: "One uppercase letter", blnSatisfied: objPasswordRules.blnUppercase(strNewPassword) },
    { strLabel: "One lowercase letter", blnSatisfied: objPasswordRules.blnLowercase(strNewPassword) },
    { strLabel: "One number", blnSatisfied: objPasswordRules.blnNumber(strNewPassword) },
    { strLabel: "One special character", blnSatisfied: objPasswordRules.blnSpecial(strNewPassword) }
  ];

  return (
    <Stack component="form" noValidate spacing={2.25} onSubmit={objForm.handleSubmit(handleSubmit)}>
      {strSuccessMessage ? <Alert severity="success" data-controlid="change-password.success.alert">{strSuccessMessage}</Alert> : null}
      {strServerError ? <Alert severity="error" data-controlid="change-password.error.alert">{strServerError}</Alert> : null}

      {blnAdminResetMode ? (
        <Box>
          <Typography sx={{ display: "block", mb: 1, color: "#0f172a", fontSize: "0.95rem", fontWeight: 600 }}>
            Employee
          </Typography>
          <TextField
            select
            fullWidth
            value={strEmployeeID}
            disabled={blnLoadingEmployees || blnSubmitting}
            onChange={(objEvent) => setStrEmployeeID(objEvent.target.value)}
            inputProps={{ "data-controlid": "change-password.employee.select" }}
            helperText={blnLoadingEmployees
              ? "Loading employees..."
              : (!lstEmployees.length ? "No employees are available for this company." : undefined)}
          >
            <MenuItem value="" disabled>Select an employee</MenuItem>
            {lstEmployees.map((objEmployee) => (
              <MenuItem key={objEmployee.intEmployeeID} value={String(objEmployee.intEmployeeID)}>
                {objEmployee.strEmployeeCode} - {objEmployee.strEmployeeName}
                {isCurrentEmployee(objEmployee) ? " (You)" : ""}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      ) : null}
      {blnRequireCurrentPassword ? (
        <PasswordField
          strName="strCurrentPassword"
          strLabel="Current Password"
          strAutoComplete="current-password"
          strControlPrefix="change-password.current-password"
          blnVisible={blnCurrentVisible}
          fnToggleVisibility={() => setBlnCurrentVisible((blnValue) => !blnValue)}
          objRegister={objForm.register}
          strError={objForm.formState.errors.strCurrentPassword?.message}
        />
      ) : null}
      <Box>
        <PasswordField
          strName="strNewPassword"
          strLabel="New Password"
          strAutoComplete="new-password"
          strControlPrefix="change-password.new-password"
          blnVisible={blnNewVisible}
          fnToggleVisibility={() => setBlnNewVisible((blnValue) => !blnValue)}
          objRegister={objForm.register}
          strError={objForm.formState.errors.strNewPassword?.message}
        />
        <Box
          sx={{
            mt: 1.5,
            p: 2,
            border: "1px solid #dbeafe",
            borderRadius: "6px",
            backgroundColor: "#f8fbff"
          }}
          aria-label="Password requirements"
        >
          <Typography sx={{ mb: 1.25, color: "#2563eb", fontSize: "0.85rem", fontWeight: 700 }}>
            Your password must include:
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
              gridTemplateRows: { sm: "repeat(3, auto)" },
              gridAutoFlow: { sm: "column" },
              columnGap: 3,
              rowGap: 0.75
            }}
          >
            {lstPolicyRules.map((objRule) => (
              <Stack key={objRule.strLabel} direction="row" spacing={0.8} alignItems="center">
                {objRule.blnSatisfied
                  ? <CheckCircleRoundedIcon sx={{ color: "#16a34a", fontSize: 16 }} />
                  : <RadioButtonUncheckedRoundedIcon sx={{ color: "#94a3b8", fontSize: 16 }} />}
                <Typography sx={{ color: objRule.blnSatisfied ? "#15803d" : "#475569", fontSize: "0.8rem" }}>
                  {objRule.strLabel}
                </Typography>
              </Stack>
            ))}
          </Box>
        </Box>
      </Box>
      <PasswordField
        strName="strConfirmPassword"
        strLabel="Confirm New Password"
        strAutoComplete="new-password"
        strControlPrefix="change-password.confirm-password"
        blnVisible={blnConfirmVisible}
        fnToggleVisibility={() => setBlnConfirmVisible((blnValue) => !blnValue)}
        objRegister={objForm.register}
        strError={objForm.formState.errors.strConfirmPassword?.message}
      />

      <Divider sx={{ borderColor: "#e5e7eb" }} />

      <Stack direction={{ xs: "column-reverse", sm: "row" }} spacing={1.25} justifyContent="flex-end">
        <Button
          type="button"
          variant="outlined"
          disabled={blnSubmitting}
          onClick={() => objRouter.push(strReturnTo)}
          data-controlid="change-password.cancel.button"
          sx={{
            minHeight: 42,
            borderRadius: "8px",
            px: 3,
            color: "var(--app-primary-color)",
            borderColor: "var(--app-primary-color)",
            fontWeight: 600,
            "&:hover": {
              borderColor: "var(--app-primary-hover)",
              color: "var(--app-primary-hover)",
              backgroundColor: "var(--app-primary-soft)"
            }
          }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={blnSubmitting || blnLoadingEmployees || !objForm.formState.isValid || (blnAdminResetMode && !strEmployeeID)}
          data-controlid="change-password.submit.button"
          startIcon={blnSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
          sx={{
            minHeight: 42,
            borderRadius: "8px",
            px: 3,
            background: "linear-gradient(135deg, #132a63 0%, #184a8b 100%)",
            boxShadow: "0 10px 20px rgba(24, 74, 139, 0.24)",
            fontWeight: 600,
            "&:hover": {
              background: "linear-gradient(135deg, #132a63 0%, #184a8b 100%)",
              boxShadow: "0 12px 24px rgba(24, 74, 139, 0.30)"
            },
            "&.Mui-disabled": {
              background: "#dddddd",
              color: "#a6a6a6",
              boxShadow: "none"
            }
          }}
        >
          {blnSubmitting
            ? (blnAdminResetMode ? "Resetting Password..." : "Changing Password...")
            : (blnAdminResetMode ? "Reset Password" : "Change Password")}
        </Button>
      </Stack>
    </Stack>
  );
}
