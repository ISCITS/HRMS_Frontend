import type { SxProps, Theme } from "@mui/material/styles";

export const loginCompactSx: SxProps<Theme> = {
  height: "100dvh",
  overflow: "hidden",
  paddingBlock: "clamp(20px, 4.8vh, 76px)",
  "& .login-shell": {
    width: "min(1370px, 100%)",
    height: "min(760px, calc(100dvh - clamp(40px, 8vh, 118px)))",
    gap: "clamp(48px, 6.6vw, 104px)",
  },
  "& .login-hero-panel": {
    gap: "clamp(28px, 5vh, 72px)",
    justifyContent: "flex-start",
  },
  "& .login-hero-content": {
    maxWidth: 520,
    pb: 0,
    mt: "auto",
    mb: "auto",
  },
  "& .login-hero-title": {
    fontSize: "clamp(3rem, min(4.25vw, 8vh), 4rem)",
    fontWeight: 700,
    lineHeight: 1.03,
  },
  "& .login-hero-copy": {
    mt: "clamp(18px, 2.45vh, 26px)",
    mb: "clamp(22px, 3.8vh, 36px)",
    fontSize: "clamp(1.06rem, min(1.32vw, 2.2vh), 1.32rem)",
    fontWeight: 500,
  },
  "& .login-form-card": {
    width: "min(100%, 535px)",
    minHeight: "min(620px, calc(100dvh - 56px))",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    p: "clamp(78px, 9vh, 96px) clamp(42px, 4vw, 54px) clamp(58px, 7vh, 78px)",
    borderRadius: "24px",
  },
  "& .login-form-panel": {
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  "& .login-form-intro": {
    mb: "clamp(10px, 1.5vh, 14px)",
  },
  "& .login-welcome-title, & .login-title, & .login-portal-choice-title": {
    fontWeight: 700,
  },
  "& .login-welcome-title": {
    fontSize: "clamp(1.86rem, min(2.7vw, 5vh), 2.45rem)",
  },
  "& .login-welcome-subtitle": {
    mt: "16px",
    fontSize: "clamp(0.94rem, min(1.05vw, 1.8vh), 1.06rem)",
    fontWeight: 400,
  },
  "& .login-form-stack": {
    mt: "22px",
    gap: "clamp(14px, 1.9vh, 18px)",
  },
  "& .login-form-card .MuiOutlinedInput-root": {
    minHeight: "58px",
    borderRadius: "14px",
  },
  "& .login-form-card .MuiInputBase-input": {
    fontSize: "1rem",
    fontWeight: 500,
  },
  "& .login-form-card .MuiInputLabel-root": {
    fontSize: "1rem",
    fontWeight: 700,
  },
  "& .login-input-icon": {
    fontSize: "30px !important",
  },
  "& .login-primary-button.MuiButton-root": {
    minHeight: "58px",
    fontSize: "1.25rem",
    fontWeight: 600,
  },
  "& .login-helper-links": {
    pt: "20px",
  },
  "@media (max-width: 760px)": {
    padding: "6px",
    "& .login-shell": {
      height: "calc(100dvh - 12px)",
      gap: "8px",
    },
    "& .login-hero-title": {
      fontSize: "clamp(1.55rem, 7.8vw, 2.2rem)",
    },
    "& .login-hero-copy": {
      fontSize: "0.76rem",
    },
    "& .login-form-card": {
      p: "44px 12px 14px",
    },
  },
};

export const loginTextFieldSx: SxProps<Theme> = {
  "--login-label-start": "57px",
  "& .MuiOutlinedInput-root": {
    minHeight: "64px",
    borderRadius: "14px",
    alignItems: "center",
  },
  "& .MuiInputAdornment-root.MuiInputAdornment-positionStart": {
    width: "48px",
    marginRight: 0,
    justifyContent: "center",
  },
  "& .MuiInputBase-input": {
    height: "auto",
    paddingTop: "23px",
    paddingBottom: "8px",
    paddingLeft: 0,
    fontSize: "1.04rem",
    fontWeight: 500,
    lineHeight: 1.2,
  },
  "& .MuiInputLabel-root": {
    left: 0,
    top: 0,
    transform: "translate(var(--login-label-start), 22px) scale(1)",
    transformOrigin: "top left",
    maxWidth: "calc(100% - 96px)",
    overflow: "visible",
    fontSize: "1.04rem",
    fontWeight: 700,
    lineHeight: 1.1,
  },
  "& .MuiInputLabel-root.MuiInputLabel-shrink, & .MuiInputLabel-root.Mui-focused, & .MuiInputLabel-root.MuiFormLabel-filled": {
    transform: "translate(var(--login-label-start), 8px) scale(1)",
    fontSize: "0.84rem",
  },
  "& .MuiOutlinedInput-notchedOutline legend": {
    width: 0,
    maxWidth: 0,
    padding: 0,
  },
  "& .MuiOutlinedInput-notchedOutline legend > span": {
    display: "none",
  },
};

export const loginInputRootSx: SxProps<Theme> = {
  minHeight: "64px",
  borderRadius: "14px",
  alignItems: "center",
};
