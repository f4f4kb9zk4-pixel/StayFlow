"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/use-current-user";
import { THEME_PRESETS } from "@/lib/branding/presets";

export interface ActionState {
  error?: string;
  success?: boolean;
}

function requireThemeAccess(role: string) {
  if (role !== "general_manager" && role !== "super_admin") {
    return "Only General Managers and Super Admins can edit theme settings.";
  }
  return null;
}

/**
 * Theme Settings save (§2.7) — upserts the full `hotel_branding` row from
 * the form and revalidates every layout so the new tokens apply immediately.
 */
export async function updateHotelBranding(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  const accessError = requireThemeAccess(user.currentRole);
  if (accessError) return { error: accessError };

  const supabase = await createClient();

  const allowUserModeToggle = formData.get("allowUserModeToggle") === "on";

  const { error } = await supabase.from("hotel_branding").upsert({
    hotel_id: user.currentHotel.id,
    product_name: String(formData.get("productName") ?? "").trim() || null,
    tagline: String(formData.get("tagline") ?? "").trim() || null,
    logo_url: String(formData.get("logoUrl") ?? "").trim() || null,
    logo_dark_url: String(formData.get("logoDarkUrl") ?? "").trim() || null,
    favicon_url: String(formData.get("faviconUrl") ?? "").trim() || null,
    dashboard_welcome_image_url: String(formData.get("dashboardWelcomeImageUrl") ?? "").trim() || null,
    primary_color: String(formData.get("primaryColor") ?? "") || null,
    secondary_color: String(formData.get("secondaryColor") ?? "") || null,
    accent_color: String(formData.get("accentColor") ?? "") || null,
    background_color: String(formData.get("backgroundColor") ?? "") || null,
    surface_color: String(formData.get("surfaceColor") ?? "") || null,
    sidebar_color: String(formData.get("sidebarColor") ?? "") || null,
    font_family_sans: String(formData.get("fontFamilySans") ?? "") || null,
    font_family_mono: String(formData.get("fontFamilyMono") ?? "") || null,
    border_radius: String(formData.get("borderRadius") ?? "") || null,
    icon_style: String(formData.get("iconStyle") ?? "") || null,
    background_style: String(formData.get("backgroundStyle") ?? "") || null,
    default_theme_mode: String(formData.get("defaultThemeMode") ?? "") || null,
    allow_user_mode_toggle: allowUserModeToggle,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: "Could not save theme settings. Please try again." };

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * "Reset to preset" (§2.7) — applies one of the 4 starter themes' visual
 * tokens (colors, typography, shape, mode) without touching the hotel's
 * identity fields (product name, tagline, logos).
 */
export async function applyThemePreset(presetId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  const accessError = requireThemeAccess(user.currentRole);
  if (accessError) return { error: accessError };

  const preset = THEME_PRESETS.find((p) => p.id === presetId);
  if (!preset) return { error: "Unknown theme preset." };

  const supabase = await createClient();

  const { error } = await supabase.from("hotel_branding").upsert({
    hotel_id: user.currentHotel.id,
    primary_color: preset.tokens.primaryColor,
    secondary_color: preset.tokens.secondaryColor,
    accent_color: preset.tokens.accentColor,
    background_color: preset.tokens.backgroundColor,
    surface_color: preset.tokens.surfaceColor,
    sidebar_color: preset.tokens.sidebarColor,
    font_family_sans: preset.tokens.fontFamilySans,
    font_family_mono: preset.tokens.fontFamilyMono,
    border_radius: preset.tokens.borderRadius,
    icon_style: preset.tokens.iconStyle,
    background_style: preset.tokens.backgroundStyle,
    default_theme_mode: preset.tokens.defaultThemeMode,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: "Could not apply preset. Please try again." };

  revalidatePath("/", "layout");
  return { success: true };
}
