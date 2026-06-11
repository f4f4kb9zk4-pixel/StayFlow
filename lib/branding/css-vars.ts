import type { CSSProperties } from "react";

import type { HotelBranding } from "@/types/domain";

/**
 * Curated font lists for the Theme Settings page (§2.7). Keys are the values
 * stored in hotel_branding.font_family_{sans,mono}; values are the Google
 * Fonts family names used to build the stylesheet URL. Lives here (not
 * theme-provider.tsx) so client components (Theme Settings form/preview) can
 * import them without pulling in the server-only Supabase client.
 */
export const SANS_FONT_OPTIONS = ["Inter", "Poppins", "DM Sans", "Playfair Display"] as const;
export const MONO_FONT_OPTIONS = ["JetBrains Mono", "Space Mono", "Playfair Display"] as const;

/**
 * Maps hotel_branding fields onto the CSS variable token system (§1.2).
 * Pure/client-safe — extracted so both the server ThemeRoot and the client
 * Theme Settings live-preview can share the exact same mapping (§2.7).
 */
export function brandingToCssVars(branding: HotelBranding): CSSProperties {
  return {
    "--primary": branding.primaryColor,
    "--accent": branding.accentColor,
    "--ring": branding.primaryColor,
    "--primary-foreground": contrastingForeground(branding.primaryColor),
    "--accent-foreground": contrastingForeground(branding.accentColor),
    "--secondary": branding.secondaryColor,
    "--background": branding.backgroundColor,
    "--navy": branding.backgroundColor,
    "--card": branding.surfaceColor,
    "--navy-light": branding.surfaceColor,
    "--muted": branding.surfaceColor,
    "--popover": branding.surfaceColor,
    "--input-background": branding.surfaceColor,
    "--sidebar": branding.sidebarColor,
    "--radius": branding.borderRadius,
    "--font-sans": `"${branding.fontFamilySans}", var(--font-sans-default), ui-sans-serif, sans-serif`,
    "--font-mono": `"${branding.fontFamilyMono}", var(--font-mono-default), ui-monospace, monospace`,
  } as CSSProperties;
}

/** Naive luminance check so primary/accent text stays readable on brand colors. */
export function contrastingForeground(hex: string): string {
  const value = hex.replace("#", "");
  if (value.length < 6) return "#0F172A";
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0F172A" : "#F8FAFC";
}
