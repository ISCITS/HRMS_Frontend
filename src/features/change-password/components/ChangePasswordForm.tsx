"use client";

import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {
  yupResolver } from "@hookform/resolvers/yup";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import * as yup from "yup";
import { DottedLoader } from "@/components/shared/BlockingLoader";

import CommonSearchableSelect from "@/Common/components/CommonSearchableSelect";
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
    <Box sx={{ pt: 0.5 }}>
      <TextField
        {...objProps.objRegister(objProps.strName)}
        className="app-mui-text-field"
        label={objProps.strLabel}
        required
        size="small"
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
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                type="button"
                edge="end"
                size="small"
                aria-label={strVisibilityLabel}
                title={strVisibilityLabel}
                onClick={objProps.fnToggleVisibility}
                data-controlid={`${objProps.strControlPrefix}.visibility.toggle`}
                sx={{
                  width: 30,
                  height: 30,
                  mr: -0.25,
                  p: 0,
                  color: "var(--app-primary-color)",
                  backgroundColor: "transparent",
                  "&:hover": {
                    backgroundColor: "var(--app-primary-soft)"
                  }
                }}
              >
                {objProps.blnVisible ? <VisibilityOffRoundedIcon sx={{ fontSize: "1.5rem" }} /> : <VisibilityRoundedIcon sx={{ fontSize: "1.5rem" }} />}
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
    strEmployeeCode: "",
    strEmployeeName: "",
    strEmailAddress: ""
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
  const lstEmployeeSelectOptions = useMemo(
    () => lstEmployees.map((objEmployee) => ({
      intID: String(objEmployee.intEmployeeID),
      strLabel: [
        objEmployee.strEmployeeName,
        objEmployee.strEmployeeCode,
        objEmployee.strEmailAddress
      ].filter(Boolean).join(" - ") + (isCurrentEmployee(objEmployee) ? " (You)" : "")
    })),
    [lstEmployees, objCurrentEmployeeIdentity]
  );
  const blnSelectedEmployeeIsCurrentUser = blnAdminResetMode
    && isCurrentEmployee(objSelectedEmployee);
  const blnRequireCurrentPassword = !blnAdminResetMode || blnSelectedEmployeeIsCurrentUser;
  const objPreviousRequireCurrentPassword = useRef(blnRequireCurrentPassword);
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
  const strCurrentPasswordError = objForm.formState.touchedFields.strCurrentPassword
    || objForm.formState.submitCount > 0
    ? objForm.formState.errors.strCurrentPassword?.message
    : undefined;
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
      setBlnLoadingEmployees(true);
      changePasswordService.getCurrentEmployeeIdentity()
        .then((objIdentity) => setObjCurrentEmployeeIdentity(objIdentity))
        .catch(() => setObjCurrentEmployeeIdentity({ lstEmployeeIDs: [], strEmployeeCode: "", strEmployeeName: "", strEmailAddress: "" }))
        .finally(() => {
          setBlnLoadingEmployees(false);
          fnOnEmployeeOptionsLoaded?.();
        });
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
    const blnRequirementChanged = objPreviousRequireCurrentPassword.current !== blnRequireCurrentPassword;
    objPreviousRequireCurrentPassword.current = blnRequireCurrentPassword;

    if (!blnRequireCurrentPassword) {
      objForm.setValue("strCurrentPassword", "", { shouldDirty: false });
      objForm.clearErrors("strCurrentPassword");
    } else if (blnRequirementChanged) {
      void objForm.trigger("strCurrentPassword");
    }
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

  const strSelfEmployeeLabel = [
    objCurrentEmployeeIdentity.strEmployeeName || "Current Employee",
    objCurrentEmployeeIdentity.strEmployeeCode,
    objCurrentEmployeeIdentity.strEmailAddress
  ].filter(Boolean).join(" - ");
  const strSelfEmployeeInitials = (objCurrentEmployeeIdentity.strEmployeeName || objCurrentEmployeeIdentity.strEmployeeCode || "ME")
    .split(/\s+/)
    .map((strPart) => strPart.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Stack component="form" noValidate spacing={1.5} onSubmit={objForm.handleSubmit(handleSubmit)}>
      {strSuccessMessage ? <Alert severity="success" data-controlid="change-password.success.alert">{strSuccessMessage}</Alert> : null}
      {strServerError ? <Alert severity="error" data-controlid="change-password.error.alert">{strServerError}</Alert> : null}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 310px" }, gap: { xs: 2, md: 3 }, alignItems: "stretch" }}>
        <Stack spacing={2.25}>
          {blnAdminResetMode ? (
            <Box sx={{ pt: 0.5 }}>
              <CommonSearchableSelect
                className="app-mui-text-field"
                label="Employee"
                placeholder="Search employee"
                fullWidth
                value={strEmployeeID}
                options={lstEmployeeSelectOptions}
                disabled={blnLoadingEmployees || blnSubmitting}
                onChange={(strValue) => setStrEmployeeID(strValue ? String(strValue) : "")}
                controlId="change-password.employee.select"
                helperText={blnLoadingEmployees
                  ? "Loading employees..."
                  : (!lstEmployees.length ? "No employees are available for this company." : undefined)}
              />
            </Box>
          ) : (
            <Box>
              <Typography component="label" sx={{ display: "block", mb: 0.75, color: "#0f172a", fontSize: "0.78rem", fontWeight: 800 }}>
                Employee
              </Typography>
              <TextField
                className="app-mui-text-field"
                value={strSelfEmployeeLabel}
                size="small"
                fullWidth
                disabled
                InputProps={{
                  readOnly: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <Avatar sx={{ width: 24, height: 24, fontSize: "0.72rem", fontWeight: 800, bgcolor: "var(--app-primary-soft)", color: "var(--app-primary-color)" }}>
                        {strSelfEmployeeInitials}
                      </Avatar>
                    </InputAdornment>
                  )
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "#f5f7fb"
                  },
                  "& .MuiInputBase-input.Mui-disabled": {
                    WebkitTextFillColor: "#0f172a",
                    fontWeight: 700
                  },
                  "& .MuiAvatar-root": {
                    opacity: 1
                  }
                }}
                inputProps={{ "data-controlid": "change-password.employee.current.input" }}
              />
            </Box>
          )}
          {blnRequireCurrentPassword ? (
            <PasswordField
              strName="strCurrentPassword"
              strLabel="Current Password"
              strAutoComplete="current-password"
              strControlPrefix="change-password.current-password"
              blnVisible={blnCurrentVisible}
              fnToggleVisibility={() => setBlnCurrentVisible((blnValue) => !blnValue)}
              objRegister={objForm.register}
              strError={strCurrentPasswordError}
            />
          ) : null}
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
        </Stack>

        <Box sx={{ p: 2.25, borderRadius: "8px", backgroundColor: "#f8fbff", border: "1px solid #e5edf5" }} aria-label="Password requirements">
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <InfoOutlinedIcon sx={{ color: "var(--app-primary-color)", fontSize: 24 }} />
            <Typography sx={{ color: "#0f172a", fontSize: "0.92rem", fontWeight: 800, lineHeight: "24px" }}>
              Password rules
            </Typography>
          </Stack>
          <Stack spacing={1.25}>
            {lstPolicyRules.map((objRule) => (
              <Stack key={objRule.strLabel} direction="row" spacing={1} alignItems="center">
                {objRule.blnSatisfied
                  ? <CheckCircleRoundedIcon sx={{ color: "#2f7e3d", fontSize: 18 }} />
                  : <RadioButtonUncheckedRoundedIcon sx={{ color: "var(--app-primary-color)", fontSize: 18 }} />}
                <Typography sx={{ color: "#475569", fontSize: "0.82rem", fontWeight: 600 }}>
                  {objRule.strLabel}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Box>

      <Divider sx={{ borderColor: "#e5e7eb", mt: 0.25 }} />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" sx={{ mt: -0.25 }}>
        <Typography className="app-master-dialog-required-fields">
          Required fields are marked <Box component="span" className="app-master-dialog-required-asterisk">*</Box>{" "}
        </Typography>

        <Stack direction={{ xs: "column-reverse", sm: "row" }} spacing={1} justifyContent="flex-end">
          <Button
            type="button"
            variant="outlined"
            size="small"
            className="app-btn app-btn-outline"
            disabled={blnSubmitting}
            onClick={() => objRouter.push(strReturnTo)}
            data-controlid="change-password.cancel.button"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            size="small"
            className="app-btn app-btn-primary"
            disabled={blnSubmitting || blnLoadingEmployees || !objForm.formState.isValid || (blnAdminResetMode && !strEmployeeID)}
            data-controlid="change-password.submit.button"
            startIcon={blnSubmitting ? <DottedLoader intSize={18} color="inherit" /> : undefined}
          >
            {blnSubmitting
              ? (blnAdminResetMode ? "Resetting Password..." : "Changing Password...")
              : (blnAdminResetMode ? "Reset Password" : "Change Password")}
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}
