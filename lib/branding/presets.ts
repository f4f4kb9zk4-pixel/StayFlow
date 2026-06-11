import type { HotelBranding } from "@/types/domain";

export type ThemeTokens = Pick<
  HotelBranding,
  | "primaryColor"
  | "secondaryColor"
  | "accentColor"
  | "backgroundColor"
  | "surfaceColor"
  | "sidebarColor"
  | "fontFamilySans"
  | "fontFamilyMono"
  | "borderRadius"
  | "iconStyle"
  | "backgroundStyle"
  | "defaultThemeMode"
>;

export interface ThemePreset {
  id: string;
  name: string;
  mood: string;
  tokens: ThemeTokens;
}

/**
 * The 4 starter theme presets (§2.7 table). "Reset to preset" applies these
 * visual tokens only — identity fields (product name, tagline, logos) are
 * left untouched so a hotel's branding survives a skin change.
 */
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "luxury-resort",
    name: "Luxury Resort",
    mood: "Opulent, evening, exclusive",
    tokens: {
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
    },
  },
  {
    id: "business-hotel",
    name: "Business Hotel",
    mood: "Crisp, efficient, corporate",
    tokens: {
      primaryColor: "#2563EB",
      secondaryColor: "#334155",
      accentColor: "#0EA5E9",
      backgroundColor: "#F8FAFC",
      surfaceColor: "#FFFFFF",
      sidebarColor: "#0F172A",
      fontFamilySans: "Inter",
      fontFamilyMono: "JetBrains Mono",
      borderRadius: "0.25rem",
      iconStyle: "sharp",
      backgroundStyle: "solid",
      defaultThemeMode: "light",
    },
  },
  {
    id: "boutique-hotel",
    name: "Boutique Hotel",
    mood: "Warm, characterful, intimate",
    tokens: {
      primaryColor: "#B5654A",
      secondaryColor: "#4A3A30",
      accentColor: "#D9A05B",
      backgroundColor: "#1C1410",
      surfaceColor: "#2A1F1A",
      sidebarColor: "#140E0B",
      fontFamilySans: "Poppins",
      fontFamilyMono: "Playfair Display",
      borderRadius: "0.75rem",
      iconStyle: "rounded",
      backgroundStyle: "subtle-gradient",
      defaultThemeMode: "dark",
    },
  },
  {
    id: "modern-lifestyle",
    name: "Modern Lifestyle",
    mood: "Bright, energetic, design-forward",
    tokens: {
      primaryColor: "#7C3AED",
      secondaryColor: "#71717A",
      accentColor: "#F472B6",
      backgroundColor: "#FFFFFF",
      surfaceColor: "#F4F4F5",
      sidebarColor: "#18181B",
      fontFamilySans: "DM Sans",
      fontFamilyMono: "Space Mono",
      borderRadius: "1rem",
      iconStyle: "rounded",
      backgroundStyle: "subtle-gradient",
      defaultThemeMode: "light",
    },
  },
];

export const BORDER_RADIUS_OPTIONS = [
  { value: "0.125rem", label: "Sharp" },
  { value: "0.25rem", label: "Crisp" },
  { value: "0.5rem", label: "Default" },
  { value: "0.75rem", label: "Soft" },
  { value: "1rem", label: "Rounded" },
  { value: "1.25rem", label: "Very rounded" },
] as const;

export const ICON_STYLE_OPTIONS = [
  { value: "lucide-default", label: "Default" },
  { value: "rounded", label: "Rounded" },
  { value: "sharp", label: "Sharp / minimal" },
] as const;

export const BACKGROUND_STYLE_OPTIONS = [
  { value: "solid", label: "Solid" },
  { value: "subtle-gradient", label: "Subtle gradient" },
  { value: "pattern", label: "Pattern overlay" },
] as const;
