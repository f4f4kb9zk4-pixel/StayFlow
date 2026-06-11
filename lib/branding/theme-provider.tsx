import type { ReactNode } from "react";

import { createClient } from "@/lib/supabase/server";
import type { HotelBranding } from "@/types/domain";
import { cn } from "@/lib/utils";
import { brandingToCssVars, SANS_FONT_OPTIONS, MONO_FONT_OPTIONS } from "@/lib/branding/css-vars";

/**
 * Defaults mirror app/globals.css `:root` (the StayFlow source design).
 * Any hotel without a `hotel_branding` row renders with these values —
 * "StayFlow's own" look — per §2.7.
 */
export const DEFAULT_BRANDING: HotelBranding = {
  hotelId: "",
  productName: "StayFlow",
  tagline: "One flow. Every dept.",
  logoUrl: null,
  logoDarkUrl: null,
  faviconUrl: null,
  dashboardWelcomeImageUrl: null,
  primaryColor: "#D4AF37",
  secondaryColor: "#334155",
  accentColor: "#D4AF37",
  backgroundColor: "#0F172A",
  surfaceColor: "#1E293B",
  sidebarColor: "#0B1120",
  fontFamilySans: "Inter",
  fontFamilyMono: "JetBrains Mono",
  borderRadius: "0.5rem",
  iconStyle: "lucide-default",
  backgroundStyle: "solid",
  defaultThemeMode: "dark",
  allowUserModeToggle: true,
};

/**
 * Fetches the hotel's branding row (§2.4 hotel_branding), falling back to
 * StayFlow defaults if none exists yet (new hotel, not yet customized).
 */
export async function getHotelBranding(hotelId: string | null): Promise<HotelBranding> {
  if (!hotelId) return DEFAULT_BRANDING;

  const supabase = await createClient();
  const { data } = await supabase
    .from("hotel_branding")
    .select("*")
    .eq("hotel_id", hotelId)
    .maybeSingle();

  if (!data) return { ...DEFAULT_BRANDING, hotelId };

  return {
    hotelId: data.hotel_id,
    productName: data.product_name ?? DEFAULT_BRANDING.productName,
    tagline: data.tagline ?? DEFAULT_BRANDING.tagline,
    logoUrl: data.logo_url,
    logoDarkUrl: data.logo_dark_url,
    faviconUrl: data.favicon_url,
    dashboardWelcomeImageUrl: data.dashboard_welcome_image_url,
    primaryColor: data.primary_color ?? DEFAULT_BRANDING.primaryColor,
    secondaryColor: data.secondary_color ?? DEFAULT_BRANDING.secondaryColor,
    accentColor: data.accent_color ?? DEFAULT_BRANDING.accentColor,
    backgroundColor: data.background_color ?? DEFAULT_BRANDING.backgroundColor,
    surfaceColor: data.surface_color ?? DEFAULT_BRANDING.surfaceColor,
    sidebarColor: data.sidebar_color ?? DEFAULT_BRANDING.sidebarColor,
    fontFamilySans: data.font_family_sans ?? DEFAULT_BRANDING.fontFamilySans,
    fontFamilyMono: data.font_family_mono ?? DEFAULT_BRANDING.fontFamilyMono,
    borderRadius: data.border_radius ?? DEFAULT_BRANDING.borderRadius,
    iconStyle: (data.icon_style as HotelBranding["iconStyle"]) ?? DEFAULT_BRANDING.iconStyle,
    backgroundStyle:
      (data.background_style as HotelBranding["backgroundStyle"]) ?? DEFAULT_BRANDING.backgroundStyle,
    defaultThemeMode:
      (data.default_theme_mode as HotelBranding["defaultThemeMode"]) ?? DEFAULT_BRANDING.defaultThemeMode,
    allowUserModeToggle: data.allow_user_mode_toggle ?? true,
  };
}

function googleFontHref(branding: HotelBranding) {
  const families = new Set<string>();
  if (SANS_FONT_OPTIONS.includes(branding.fontFamilySans as (typeof SANS_FONT_OPTIONS)[number])) {
    families.add(`family=${branding.fontFamilySans.replace(/ /g, "+")}:wght@300;400;500;600;700`);
  }
  if (MONO_FONT_OPTIONS.includes(branding.fontFamilyMono as (typeof MONO_FONT_OPTIONS)[number])) {
    families.add(`family=${branding.fontFamilyMono.replace(/ /g, "+")}:wght@400;500`);
  }
  if (families.size === 0) return null;
  return `https://fonts.googleapis.com/css2?${Array.from(families).join("&")}&display=swap`;
}

interface ThemeRootProps {
  branding: HotelBranding;
  children: ReactNode;
  className?: string;
}

/**
 * Wraps the authenticated app shell, applying the active hotel's branding
 * as CSS variable overrides + light/dark mode class (§2.7, §3.3). Because
 * every component reads `--primary`, `--background`, `--card`, `--sidebar`,
 * `--radius`, `--font-sans`/`--font-mono` etc. from app/globals.css, this is
 * the only place white-label theming is applied — no per-component branching.
 */
export function ThemeRoot({ branding, children, className }: ThemeRootProps) {
  const fontHref = googleFontHref(branding);
  const mode = branding.defaultThemeMode === "light" ? "light" : "dark";

  return (
    <>
      {fontHref && <link rel="stylesheet" href={fontHref} />}
      <div
        className={cn("min-h-screen bg-background text-foreground", mode, className)}
        style={brandingToCssVars(branding)}
        data-background-style={branding.backgroundStyle}
        data-icon-style={branding.iconStyle}
      >
        {children}
      </div>
    </>
  );
}
