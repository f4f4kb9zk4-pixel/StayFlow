import { createClient } from "@/lib/supabase/server";
import type { Department, Profile, UserRole } from "@/types/domain";

export interface StaffMember extends Profile {
  role: UserRole;
  department: Department | null;
}

/**
 * Staff assignable within a hotel (§2.4 user_hotel_roles join profiles) —
 * used for assignee pickers across Guest Cases, Task Board, Incidents.
 */
export async function getHotelStaff(hotelId: string): Promise<StaffMember[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("user_hotel_roles")
    .select("role, department, profiles(id, full_name, avatar_color)")
    .eq("hotel_id", hotelId);

  return (data ?? [])
    .filter((r): r is typeof r & { profiles: { id: string; full_name: string; avatar_color: string | null } } => !!r.profiles)
    .map((r) => ({
      id: r.profiles.id,
      fullName: r.profiles.full_name,
      avatarColor: r.profiles.avatar_color,
      role: r.role,
      department: (r.department as Department | null) ?? null,
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}
