import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans-default",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-default",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StayFlow — Hotel Operations OS",
  description:
    "One flow. Every department. The mobile-first operations layer for luxury hotels and resorts.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0F172A",
};

/**
 * Shared root layout for both unauthenticated routes (/login) and the
 * authenticated (app) route group. Hotel-specific white-label branding is
 * NOT applied here — it's injected by ThemeRoot inside (app)/layout.tsx via
 * a wrapper <div>, so unauthenticated routes always render StayFlow's own
 * default look (per §2.7 architecture decision).
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
