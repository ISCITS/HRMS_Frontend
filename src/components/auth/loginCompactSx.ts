import type { SxProps, Theme } from "@mui/material/styles";

export const loginCompactSx: SxProps<Theme> = {
  height: "100dvh",
  overflow: "hidden",
  paddingBlock: "clamp(20px, 4.8vh, 76px)",
  "& .login-shell": {
    width: "min(1370px, 100%)",
    height: "min(790px, calc(100dvh - clamp(40px, 8vh, 118px)))",
    gap: "clamp(54px, 7.4vw, 112px)",
  },
  "& .login-hero-panel": {
    gap: "clamp(28px, 5vh, 72px)",
    justifyContent: "flex-start",
  },
  "& .login-hero-content": {
    maxWidth: 560,
    pb: 0,
    mt: "auto",
    mb: "auto",
  },
  "& .login-hero-title": {
    fontSize: "clamp(3rem, min(4.6vw, 8.7vh), 4.3rem)",
    fontWeight: 700,
    lineHeight: 1.03,
  },
  "& .login-hero-copy": {
    mt: "clamp(20px, 2.7vh, 30px)",
    mb: "clamp(24px, 4.3vh, 42px)",
    fontSize: "clamp(1.12rem, min(1.55vw, 2.45vh), 1.55rem)",
    fontWeight: 500,
  },
  "& .login-form-card": {
    width: "min(100%, 565px)",
    p: "clamp(34px, 4.2vh, 46px) clamp(44px, 4.6vw, 62px)",
    borderRadius: "28px",
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
    fontSize: "clamp(2rem, min(3.1vw, 5.6vh), 2.8rem)",
  },
  "& .login-welcome-subtitle": {
    mt: "18px",
    fontSize: "clamp(1rem, min(1.22vw, 2vh), 1.16rem)",
    fontWeight: 400,
  },
  "& .login-form-stack": {
    mt: "24px",
    gap: "clamp(14px, 2vh, 20px)",
  },
  "& .login-form-card .MuiOutlinedInput-root": {
    minHeight: "66px",
    borderRadius: "14px",
  },
  "& .login-form-card .MuiInputBase-input": {
    fontSize: "1.22rem",
    fontWeight: 500,
  },
  "& .login-form-card .MuiInputLabel-root": {
    fontSize: "1rem",
    fontWeight: 700,
  },
  "& .login-input-icon": {
    fontSize: "33px !important",
  },
  "& .login-primary-button.MuiButton-root": {
    minHeight: "64px",
    fontSize: "1.45rem",
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
