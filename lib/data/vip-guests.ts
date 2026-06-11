import { createClient } from "@/lib/supabase/server";
import type { VipGuest } from "@/types/domain";

export interface VipGuestFilters {
  tier?: VipGuest["vipTier"] | "All";
  search?: string;
  /** When true, only return guests flagged as currently in-house. */
  inhouse?: boolean;
}

function mapVipGuest(r: {
  id: string;
  hotel_id: string;
  guest_name: string;
  vip_tier: VipGuest["vipTier"];
  vip_code?: string | null;
  room: string | null;
  stay_start: string | null;
  stay_end: string | null;
  preferences: string | null;
  notes: string | null;
  vip_inhouse: boolean;
}): VipGuest {
  return {
    id: r.id,
    hotelId: r.hotel_id,
    guestName: r.guest_name,
    vipTier: r.vip_tier,
    vipCode: r.vip_code ?? null,
    room: r.room,
    stayStart: r.stay_start,
    stayEnd: r.stay_end,
    preferences: r.preferences,
    notes: r.notes,
    vipInhouse: r.vip_inhouse,
  };
}

/**
 * VIP Guest Tracking (§3.2 item 6, cross-cutting `vip_guests` table) — list
 * with optional tier filter and name/room search, ordered VVIP first then
 * by current/upcoming stay.
 */
export async function getVipGuests(hotelId: string, filters: VipGuestFilters = {}): Promise<VipGuest[]> {
  const supabase = await createClient();

  let query = supabase.from("vip_guests").select("*").eq("hotel_id", hotelId);

  if (filters.tier && filters.tier !== "All") {
    query = query.eq("vip_tier", filters.tier);
  }

  if (filters.search) {
    query = query.or(`guest_name.ilike.%${filters.search}%,room.ilike.%${filters.search}%`);
  }

  if (filters.inhouse) {
    query = query.eq("vip_inhouse", true);
  }

  query = query.order("vip_tier", { ascending: false }).order("stay_start", { ascending: true, nullsFirst: false });

  const { data } = await query;
  return (data ?? []).map(mapVipGuest);
}

export async function getVipGuest(hotelId: string, vipGuestId: string): Promise<VipGuest | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("vip_guests")
    .select("*")
    .eq("hotel_id", hotelId)
    .eq("id", vipGuestId)
    .maybeSingle();

  return data ? mapVipGuest(data) : null;
}

/** Currently in-house VIP guests (stay window includes today) — for Dashboard prominence. */
export async function getActiveVipGuests(hotelId: string, limit = 5): Promise<VipGuest[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("vip_guests")
    .select("*")
    .eq("hotel_id", hotelId)
    .in("vip_tier", ["VIP", "VVIP"])
    .lte("stay_start", today)
    .gte("stay_end", today)
    .order("vip_tier", { ascending: false })
    .limit(limit);

  return (data ?? []).map(mapVipGuest);
}
