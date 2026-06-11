"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Bell } from "lucide-react";

import { NAV_ITEMS, SETTINGS_ITEM } from "./nav-items";
import { HotelSwitcher } from "./hotel-switcher";
import { canAccess } from "@/lib/auth/permissions";
import type { UserRole } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TopBarProps {
  role: UserRole;
  userName: string;
  productName: string;
  currentHotelId: string;
  hotels: { id: string; name: string }[];
  notificationCount?: number;
}

/**
 * Mobile top bar (§3.4, md:hidden) — hamburger opens the full nav drawer
 * (since the desktop sidebar is hidden on mobile), brand wordmark, and a
 * quick link to Notifications.
 */
export function TopBar({
  role,
  userName,
  productName,
  currentHotelId,
  hotels,
  notificationCount = 0,
}: TopBarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => canAccess(role, item.key));
  const showSettings = canAccess(role, "settings");

  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-sidebar-border bg-sidebar px-3 h-14">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="bg-sidebar w-64 p-0 flex flex-col">
          <SheetHeader className="px-4 h-16 flex flex-row items-center border-b border-sidebar-border">
            <SheetTitle className="text-primary">{productName}</SheetTitle>
          </SheetHeader>
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-gold-dim text-primary" : "text-sidebar-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
            {showSettings && (
              <>
                <div className="my-2 border-t border-sidebar-border" />
                <Link
                  href={SETTINGS_ITEM.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    pathname.startsWith(SETTINGS_ITEM.href)
                      ? "bg-gold-dim text-primary"
                      : "text-sidebar-foreground hover:bg-muted"
                  )}
                >
                  <SETTINGS_ITEM.icon className="h-4 w-4 shrink-0" />
                  {SETTINGS_ITEM.label}
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
        </SheetContent>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="h-6 w-6 rounded" />
          <span className="text-sm font-semibold text-primary">{productName}</span>
        </div>
      </Sheet>

      <Link href="/notifications" className="relative">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>
        {notificationCount > 0 && (
          <Badge variant="danger" className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px]">
            {notificationCount > 9 ? "9+" : notificationCount}
          </Badge>
        )}
      </Link>
    </header>
  );
}
