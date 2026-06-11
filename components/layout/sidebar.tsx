"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS, SETTINGS_ITEM } from "./nav-items";
import { HotelSwitcher } from "./hotel-switcher";
import { canAccess } from "@/lib/auth/permissions";
import type { UserRole } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SidebarProps {
  role: UserRole;
  userName: string;
  productName: string;
  tagline: string;
  logoUrl?: string | null;
  currentHotelId: string;
  hotels: { id: string; name: string }[];
  badgeCounts?: Partial<Record<string, number>>;
}

/**
 * Desktop sidebar (§1.6). Hidden on mobile (md:flex) in favor of the
 * top bar + bottom tab nav (§3.4). Nav items are filtered by role
 * permissions (§2.6) so staff only see modules they can access.
 */
export function Sidebar({
  role,
  userName,
  productName,
  tagline,
  logoUrl,
  currentHotelId,
  hotels,
  badgeCounts = {},
}: SidebarProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => canAccess(role, item.key));
  const showSettings = canAccess(role, "settings");

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-sidebar-border md:bg-sidebar md:shrink-0">
      <div className="flex items-center gap-2 px-4 h-16 border-b border-sidebar-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl || "/logo.svg"} alt={productName} className="h-8 w-8 rounded object-contain" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">{productName}</p>
          <p className="truncate text-xs text-muted-foreground">{tagline}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const count = badgeCounts[item.key];
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-gold-dim text-primary"
                  : "text-sidebar-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {!!count && (
                <Badge variant={active ? "gold" : "muted"} className="ml-auto">
                  {count}
                </Badge>
              )}
            </Link>
          );
        })}

        {showSettings && (
          <>
            <div className="my-2 border-t border-sidebar-border" />
            <Link
              href={SETTINGS_ITEM.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith(SETTINGS_ITEM.href)
                  ? "bg-gold-dim text-primary"
                  : "text-sidebar-foreground hover:bg-muted"
              )}
            >
              <SETTINGS_ITEM.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{SETTINGS_ITEM.label}</span>
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <HotelSwitcher
          userName={userName}
          role={role}
          currentHotelId={currentHotelId}
          hotels={hotels}
        />
      </div>
    </aside>
  );
}
