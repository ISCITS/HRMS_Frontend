import type { Metadata } from "next";
import "./globals.css";
import "./ESSBanner.css";
import ThemeRegistry from "@/components/shared/ThemeRegistry";
import ThemeModeProvider from "@/components/shared/ThemeModeProvider";
import AppLayoutBoundary from "@/components/layout/AppLayoutBoundary";
import { withBasePath } from "@/lib/basePath";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "HRMS",
  description: "HRMS is a comprehensive human resource management system for managing employees, payroll and organizational workflows efficiently",
  icons: {
    // Next.js does not prepend basePath to metadata icon paths (vercel/next.js#61487),
    // so it is added explicitly here.
    icon: withBasePath("/favicon.svg")
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="app-theme">
      <body>
        {/* Emotion cache + MUI theme providers for all routes */}
        <ThemeRegistry>
          <ThemeModeProvider>
            <AppLayoutBoundary>{children}</AppLayoutBoundary>
          </ThemeModeProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
