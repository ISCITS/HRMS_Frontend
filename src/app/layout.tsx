import { Suspense } from "react";
import type { Metadata } from "next";
import "./globals.css";
import ThemeRegistry from "@/components/shared/ThemeRegistry";
import ThemeModeProvider from "@/components/shared/ThemeModeProvider";
import AppLayoutBoundary from "@/components/layout/AppLayoutBoundary";

export const metadata: Metadata = {
  title: "HRMS",
  description: "HRMS is a comprehensive human resource management system for managing employees, payroll and organizational workflows efficiently",
  icons: {
    icon: "/favicon.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Emotion cache + MUI theme providers for all routes */}
        <ThemeRegistry>
          <ThemeModeProvider>
            <Suspense fallback={null}>
              <AppLayoutBoundary>{children}</AppLayoutBoundary>
            </Suspense>
          </ThemeModeProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
