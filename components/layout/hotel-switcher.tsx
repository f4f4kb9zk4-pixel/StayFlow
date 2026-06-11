"use client";

import { ChevronsUpDown, Building2, Check, LogOut } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AvatarInitials } from "@/components/shared/avatar-initials";
import { setActiveHotel } from "@/lib/actions/hotel";
import { signOut } from "@/lib/actions/auth";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import type { UserRole } from "@/types/domain";
import { cn } from "@/lib/utils";

interface HotelOption {
  id: string;
  name: string;
}

interface HotelSwitcherProps {
  userName: string;
  role: UserRole;
  currentHotelId: string;
  hotels: HotelOption[];
  className?: string;
}

/**
 * User profile footer (§1.6 sidebar) — shows the active user, their role,
 * and (when assigned to multiple properties) a hotel switcher that sets
 * the stayflow_hotel_id cookie used by getCurrentUser() (§3.3).
 */
export function HotelSwitcher({ userName, role, currentHotelId, hotels, className }: HotelSwitcherProps) {
  const currentHotel = hotels.find((h) => h.id === currentHotelId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-muted transition-colors",
            className
          )}
        >
          <AvatarInitials name={userName} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
          </div>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {currentHotel && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5" />
              {currentHotel.name}
            </DropdownMenuLabel>
            {hotels.length > 1 && <DropdownMenuSeparator />}
          </>
        )}
        {hotels.length > 1 &&
          hotels.map((hotel) => (
            <form key={hotel.id} action={setActiveHotel.bind(null, hotel.id)}>
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full justify-between">
                  <span className="truncate">{hotel.name}</span>
                  {hotel.id === currentHotelId && <Check className="h-4 w-4 text-primary" />}
                </button>
              </DropdownMenuItem>
            </form>
          ))}
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full text-danger">
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
