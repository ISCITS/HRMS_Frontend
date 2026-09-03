import { appConfig } from "@/config/app";

/*
Functional responsibility:
- Expose environment-derived runtime values through a single typed surface.

Inputs:
- NEXT_PUBLIC_API_BASE_URL from process.env when present.

Output:
- Typed env object used by services and app config consumers.

Failure behavior:
- Falls back to same-origin requests when NEXT_PUBLIC_API_BASE_URL is not defined.
*/
export const env = {
  apiBaseUrl: appConfig.apiBaseUrl
} as const;

