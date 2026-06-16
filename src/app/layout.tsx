import * as React from "react";
import type { Metadata } from "next";
import "./globals.css";
import ThemeRegistry from "@/components/shared/ThemeRegistry";
import ThemeModeProvider from "@/components/shared/ThemeModeProvider";
import AppLayoutBoundary from "@/components/layout/AppLayoutBoundary";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "HRMS Template",
  description: "HRMS template using Next.js App Router and Material UI"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Emotion cache + MUI theme providers for all routes */}
        <ThemeRegistry>
          <ThemeModeProvider>
            <React.Suspense fallback={null}>
              <AppLayoutBoundary>{children}</AppLayoutBoundary>
            </React.Suspense>
          </ThemeModeProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
