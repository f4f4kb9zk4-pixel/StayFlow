"use client";

import { useActionState, useState, useTransition } from "react";

import { updateHotelBranding, applyThemePreset, type ActionState } from "@/lib/actions/branding";
import {
  THEME_PRESETS,
  BORDER_RADIUS_OPTIONS,
  ICON_STYLE_OPTIONS,
  BACKGROUND_STYLE_OPTIONS,
} from "@/lib/branding/presets";
import { SANS_FONT_OPTIONS, MONO_FONT_OPTIONS } from "@/lib/branding/css-vars";
import type { HotelBranding } from "@/types/domain";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemePreview } from "@/components/settings/theme-preview";

const initialState: ActionState = {};

interface ThemeFormProps {
  branding: HotelBranding;
  readOnly: boolean;
}

/** Theme Settings (§2.7, §3.2 item 11) — identity, colors, typography, shape, mode, with live preview. */
export function ThemeForm({ branding, readOnly }: ThemeFormProps) {
  const [state, formAction, pending] = useActionState(updateHotelBranding, initialState);
  const [tokens, setTokens] = useState<HotelBranding>(branding);
  const [presetPending, startPresetTransition] = useTransition();
  const [appliedPreset, setAppliedPreset] = useState<string | null>(null);

  function set<K extends keyof HotelBranding>(key: K, value: HotelBranding[K]) {
    setTokens((prev) => ({ ...prev, [key]: value }));
  }

  function applyPreset(presetId: string) {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setTokens((prev) => ({ ...prev, ...preset.tokens }));
    setAppliedPreset(presetId);
    startPresetTransition(() => {
      applyThemePreset(presetId);
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
      <form action={formAction} className="space-y-4 min-w-0">
        <Card>
          <CardHeader>
            <CardTitle>Starter themes</CardTitle>
            <CardDescription>
              Apply a preset as a starting point. Colors, typography, shape, and mode are replaced — your
              identity (name, tagline, logos) is kept.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {THEME_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="rounded-md border border-border p-3 space-y-2"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <div className="flex items-center gap-1.5">
                    {[preset.tokens.primaryColor, preset.tokens.accentColor, preset.tokens.backgroundColor].map(
                      (c, i) => (
                        <span
                          key={i}
                          className="h-4 w-4 rounded-full border border-border"
                          style={{ backgroundColor: c }}
                        />
                      )
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{preset.name}</p>
                    <p className="text-xs text-muted-foreground">{preset.mood}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={readOnly || presetPending}
                    onClick={() => applyPreset(preset.id)}
                  >
                    {appliedPreset === preset.id && presetPending ? "Applying…" : "Apply preset"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Brand identity</CardTitle>
            <CardDescription>Product name, tagline, and image assets shown across the app.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="productName">Product name</Label>
              <Input id="productName" name="productName" defaultValue={branding.productName} disabled={readOnly} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tagline">Tagline</Label>
              <Input id="tagline" name="tagline" defaultValue={branding.tagline} disabled={readOnly} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input id="logoUrl" name="logoUrl" defaultValue={branding.logoUrl ?? ""} disabled={readOnly} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logoDarkUrl">Logo URL (dark mode)</Label>
              <Input
                id="logoDarkUrl"
                name="logoDarkUrl"
                defaultValue={branding.logoDarkUrl ?? ""}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="faviconUrl">Favicon URL</Label>
              <Input id="faviconUrl" name="faviconUrl" defaultValue={branding.faviconUrl ?? ""} disabled={readOnly} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dashboardWelcomeImageUrl">Dashboard welcome image URL</Label>
              <Input
                id="dashboardWelcomeImageUrl"
                name="dashboardWelcomeImageUrl"
                defaultValue={branding.dashboardWelcomeImageUrl ?? ""}
                disabled={readOnly}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Colors</CardTitle>
            <CardDescription>Drive --primary, --accent, --background, --card, and --sidebar tokens.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ColorField
              label="Primary"
              name="primaryColor"
              value={tokens.primaryColor}
              onChange={(v) => set("primaryColor", v)}
              disabled={readOnly}
            />
            <ColorField
              label="Secondary"
              name="secondaryColor"
              value={tokens.secondaryColor}
              onChange={(v) => set("secondaryColor", v)}
              disabled={readOnly}
            />
            <ColorField
              label="Accent"
              name="accentColor"
              value={tokens.accentColor}
              onChange={(v) => set("accentColor", v)}
              disabled={readOnly}
            />
            <ColorField
              label="Background"
              name="backgroundColor"
              value={tokens.backgroundColor}
              onChange={(v) => set("backgroundColor", v)}
              disabled={readOnly}
            />
            <ColorField
              label="Surface (cards)"
              name="surfaceColor"
              value={tokens.surfaceColor}
              onChange={(v) => set("surfaceColor", v)}
              disabled={readOnly}
            />
            <ColorField
              label="Sidebar"
              name="sidebarColor"
              value={tokens.sidebarColor}
              onChange={(v) => set("sidebarColor", v)}
              disabled={readOnly}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Typography</CardTitle>
            <CardDescription>Fonts loaded from Google Fonts for body text and data/code.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fontFamilySans">Body font</Label>
              <Select
                value={tokens.fontFamilySans}
                onValueChange={(v) => set("fontFamilySans", v)}
                disabled={readOnly}
              >
                <SelectTrigger id="fontFamilySans">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SANS_FONT_OPTIONS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="fontFamilySans" value={tokens.fontFamilySans} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fontFamilyMono">Data / mono font</Label>
              <Select
                value={tokens.fontFamilyMono}
                onValueChange={(v) => set("fontFamilyMono", v)}
                disabled={readOnly}
              >
                <SelectTrigger id="fontFamilyMono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONO_FONT_OPTIONS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="fontFamilyMono" value={tokens.fontFamilyMono} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shape &amp; mode</CardTitle>
            <CardDescription>Corner roundness, icon style, background treatment, and color mode.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="borderRadius">Corner roundness</Label>
              <Select value={tokens.borderRadius} onValueChange={(v) => set("borderRadius", v)} disabled={readOnly}>
                <SelectTrigger id="borderRadius">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BORDER_RADIUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="borderRadius" value={tokens.borderRadius} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="iconStyle">Icon style</Label>
              <Select
                value={tokens.iconStyle}
                onValueChange={(v) => set("iconStyle", v as HotelBranding["iconStyle"])}
                disabled={readOnly}
              >
                <SelectTrigger id="iconStyle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_STYLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="iconStyle" value={tokens.iconStyle} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="backgroundStyle">Background style</Label>
              <Select
                value={tokens.backgroundStyle}
                onValueChange={(v) => set("backgroundStyle", v as HotelBranding["backgroundStyle"])}
                disabled={readOnly}
              >
                <SelectTrigger id="backgroundStyle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BACKGROUND_STYLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="backgroundStyle" value={tokens.backgroundStyle} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="defaultThemeMode">Default mode</Label>
              <Select
                value={tokens.defaultThemeMode}
                onValueChange={(v) => set("defaultThemeMode", v as HotelBranding["defaultThemeMode"])}
                disabled={readOnly}
              >
                <SelectTrigger id="defaultThemeMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="defaultThemeMode" value={tokens.defaultThemeMode} />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2 pt-1">
              <Checkbox
                id="allowUserModeToggle"
                name="allowUserModeToggle"
                defaultChecked={branding.allowUserModeToggle}
                disabled={readOnly}
              />
              <Label htmlFor="allowUserModeToggle" className="font-normal">
                Allow staff to switch between light and dark mode themselves
              </Label>
            </div>
          </CardContent>
        </Card>

        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        {state?.success && <p className="text-sm text-success">Theme saved.</p>}
        {!readOnly && (
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save theme"}
          </Button>
        )}
      </form>

      <div className="lg:sticky lg:top-4 space-y-2">
        <p className="text-sm font-medium">Live preview</p>
        <ThemePreview branding={tokens} />
        <p className="text-xs text-muted-foreground">
          Preview updates as you edit. Save to apply across the app for all staff.
        </p>
      </div>
    </div>
  );
}

function ColorField({
  label,
  name,
  value,
  onChange,
  disabled,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} color picker`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-9 w-9 shrink-0 rounded-md border border-border bg-transparent p-1 disabled:opacity-50"
        />
        <Input
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="font-mono text-sm"
        />
      </div>
    </div>
  );
}
