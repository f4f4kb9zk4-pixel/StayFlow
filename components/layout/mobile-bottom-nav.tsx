"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { MOBILE_TABS } from "./nav-items";
import { cn } from "@/lib/utils";

/**
 * Mobile bottom tab bar (§3.4) — fixed, 5 slots, hidden on desktop.
 * Mirrors the iOS/Android pattern staff expect on shared floor devices.
 */
export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)]">
      {MOBILE_TABS.map((tab, idx) => {
        const targetPath = tab.href.split("#")[0];
        const active = pathname === targetPath || pathname.startsWith(`${targetPath}/`);
        return (
          <Link
            key={`${tab.label}-${idx}`}
            href={tab.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <tab.icon className="h-5 w-5" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
