import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole, Department } from "@/types/domain";

export interface HotelSummary {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  locale: string;
}

export interface CurrentUser {
  id: string;
  email: string | null;
  profile: Profile;
  /** All hotels (+ role/department) the user has access to. */
  hotelRoles: {
    hotel: HotelSummary;
    role: UserRole;
    department: Department | null;
  }[];
  /** The active hotel for this request (cookie override > default_hotel_id > first role). */
  currentHotel: HotelSummary;
  currentRole: UserRole;
  currentDepartment: Department | null;
}

const HOTEL_COOKIE = "stayflow_hotel_id";

/**
 * Resolves the authenticated user, their profile, all hotel/role
 * assignments (§2.4 user_hotel_roles), and the active hotel for this
 * request (§3.3 hotel context). Redirects to /login if unauthenticated.
 *
 * Use this at the top of (app) layout/pages — RLS still enforces tenant
 * isolation independently, this just resolves UI context.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const { data: roleRows } = await supabase
    .from("user_hotel_roles")
    .select("role, department, hotels(id, name, slug, timezone, locale)")
    .eq("user_id", user.id);

  const hotelRoles = (roleRows ?? [])
    .filter((r): r is typeof r & { hotels: HotelSummary } => !!r.hotels)
    .map((r) => ({
      hotel: r.hotels as unknown as HotelSummary,
      role: r.role,
      department: (r.department as Department | null) ?? null,
    }));

  if (hotelRoles.length === 0) {
    // No hotel assignment yet — surface a friendly state rather than crashing.
    redirect("/login?error=no_hotel_access");
  }

  const cookieStore = await cookies();
  const cookieHotelId = cookieStore.get(HOTEL_COOKIE)?.value;

  const active =
    hotelRoles.find((hr) => hr.hotel.id === cookieHotelId) ??
    hotelRoles.find((hr) => hr.hotel.id === profileRow?.default_hotel_id) ??
    hotelRoles[0];

  const profile: Profile = {
    id: user.id,
    fullName: profileRow?.full_name ?? user.email ?? "Unknown",
    avatarColor: profileRow?.avatar_color ?? null,
    role: active.role,
    department: active.department,
  };

  return {
    id: user.id,
    email: user.email ?? null,
    profile,
    hotelRoles,
    currentHotel: active.hotel,
    currentRole: active.role,
    currentDepartment: active.department,
  };
}

export { HOTEL_COOKIE };
