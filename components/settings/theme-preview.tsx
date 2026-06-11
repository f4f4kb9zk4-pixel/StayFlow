"use client";

import { Bell, Home, ClipboardList, Star, Settings } from "lucide-react";

import type { HotelBranding } from "@/types/domain";
import { brandingToCssVars } from "@/lib/branding/css-vars";
import { cn } from "@/lib/utils";

interface ThemePreviewProps {
  branding: HotelBranding;
}

const NAV_ITEMS = [
  { icon: Home, label: "Dashboard", active: true },
  { icon: ClipboardList, label: "Tasks", active: false },
  { icon: Star, label: "VIP Guests", active: false },
  { icon: Settings, label: "Settings", active: false },
];

/**
 * Live preview of the app shell using the in-progress theme tokens (§2.7).
 * Mirrors ThemeRoot's CSS-variable approach at a smaller scale so admins can
 * see color, type, shape, and mode changes before saving.
 */
export function ThemePreview({ branding }: ThemePreviewProps) {
  const mode = branding.defaultThemeMode === "light" ? "light" : "dark";

  return (
    <div
      className={cn("rounded-lg border border-border overflow-hidden", mode)}
      style={brandingToCssVars(branding)}
      data-background-style={branding.backgroundStyle}
      data-icon-style={branding.iconStyle}
    >
      <div className="flex h-72 bg-background text-foreground text-xs">
        {/* Sidebar */}
        <div className="w-24 shrink-0 bg-sidebar p-2 flex flex-col gap-2">
          <div className="font-semibold text-[11px] truncate" style={{ color: "var(--primary)" }}>
            {branding.productName || "StayFlow"}
          </div>
          <div className="flex flex-col gap-1 mt-1">
            {NAV_ITEMS.map((item) => (
              <div
                key={item.label}
                className={cn(
                  "flex items-center gap-1.5 px-1.5 py-1 text-[10px]",
                  item.active ? "bg-primary/15 text-primary" : "text-muted-foreground"
                )}
                style={{ borderRadius: "var(--radius)" }}
              >
                <item.icon className="h-3 w-3 shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar */}
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="font-medium truncate">{branding.tagline || "One flow. Every dept."}</div>
            <Bell className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {/* Body */}
          <div className="flex-1 p-3 space-y-2 overflow-hidden">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-card p-2" style={{ borderRadius: "var(--radius)" }}>
                <p className="text-muted-foreground text-[10px]">Open tasks</p>
                <p className="text-base font-semibold mt-0.5">12</p>
              </div>
              <div className="bg-card p-2" style={{ borderRadius: "var(--radius)" }}>
                <p className="text-muted-foreground text-[10px]">VIP arrivals</p>
                <p className="text-base font-semibold mt-0.5">3</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="px-2.5 py-1 text-[10px] font-medium"
                style={{
                  borderRadius: "var(--radius)",
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                Primary action
              </button>
              <button
                className="px-2.5 py-1 text-[10px] font-medium"
                style={{
                  borderRadius: "var(--radius)",
                  backgroundColor: "var(--accent)",
                  color: "var(--accent-foreground)",
                }}
              >
                Accent
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className="px-1.5 py-0.5 text-[9px] font-medium bg-success/15 text-success"
                style={{ borderRadius: "var(--radius)" }}
              >
                On track
              </span>
              <span
                className="px-1.5 py-0.5 text-[9px] font-medium bg-warning/15 text-warning"
                style={{ borderRadius: "var(--radius)" }}
              >
                Due soon
              </span>
              <span
                className="px-1.5 py-0.5 text-[9px] font-medium"
                style={{
                  borderRadius: "var(--radius)",
                  backgroundColor: "var(--accent)",
                  color: "var(--accent-foreground)",
                }}
              >
                VIP
              </span>
            </div>

            <div className="bg-card p-2 space-y-1" style={{ borderRadius: "var(--radius)" }}>
              <p className="font-medium">Sample card</p>
              <p className="text-muted-foreground text-[10px]">
                Body text in {branding.fontFamilySans || "Inter"}, code in {branding.fontFamilyMono || "JetBrains Mono"}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
