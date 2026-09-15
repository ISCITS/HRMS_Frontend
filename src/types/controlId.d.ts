// controlId is used app-wide as a stable per-control identifier for QA/automation hooks.
// Declaring it on React.Attributes merges it into every JSX element's props (both MUI
// components and native DOM tags), matching how it's already used across ~75 files.
import "react";

declare module "react" {
  interface Attributes {
    controlId?: string;
  }
}
