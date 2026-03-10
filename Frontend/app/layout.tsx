import type { Metadata } from "next";
import "./globals.css";
import ThemeRegistry from "@/components/ThemeRegistry";
import ThemeModeProvider from "@/components/ThemeModeProvider";

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
          <ThemeModeProvider>{children}</ThemeModeProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
