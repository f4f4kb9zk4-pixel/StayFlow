import { createClient } from "@/lib/supabase/server";
import type { Arrival, ArrivalStatus } from "@/types/domain";

export interface ArrivalFilters {
  status?: ArrivalStatus | "All";
  /** YYYY-MM-DD, defaults to today (Asia/Bangkok) */
  date?: string;
  search?: string;
  /** When true, only return arrivals flagged for VIP attention. */
  vipArrival?: boolean;
}

function todayDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

function mapArrival(r: {
  id: string;
  arrival_number: string;
  hotel_id: string;
  guest_name: string;
  nationality: string | null;
  room: string | null;
  eta: string | null;
  flight_number: string | null;
  transfer_type: string | null;
  vip_tier: Arrival["vipTier"];
  vip_guest_id: string | null;
  room_ready: boolean;
  special_requests: string | null;
  status: ArrivalStatus;
  arrival_date: string;
  departure_date?: string | null;
  room_type?: string | null;
  confirmation_number?: string | null;
  nights?: number | null;
  adults?: number | null;
  pms_notes?: string | null;
  vip_arrival: boolean;
  notes_summary?: string | null;
}): Arrival {
  return {
    id: r.id,
    arrivalNumber: r.arrival_number,
    hotelId: r.hotel_id,
    guestName: r.guest_name,
    nationality: r.nationality,
    room: r.room,
    eta: r.eta,
    flightNumber: r.flight_number,
    transferType: r.transfer_type,
    vipTier: r.vip_tier,
    vipGuestId: r.vip_guest_id,
    roomReady: r.room_ready,
    specialRequests: r.special_requests,
    status: r.status,
    arrivalDate: r.arrival_date,
    departureDate: r.departure_date ?? null,
    roomType: r.room_type ?? null,
    confirmationNumber: r.confirmation_number ?? null,
    nights: r.nights ?? null,
    adults: r.adults ?? null,
    pmsNotes: r.pms_notes ?? null,
    vipArrival: r.vip_arrival,
    notesSummary: r.notes_summary ?? null,
  };
}

/**
 * Arrival & VIP Board (§3.2 item 7) — today's arrivals by default, with
 * optional status filter and guest/room search. Ordered by ETA.
 */
export async function getArrivals(hotelId: string, filters: ArrivalFilters = {}): Promise<Arrival[]> {
  const supabase = await createClient();

  let query = supabase
    .from("arrivals")
    .select("*")
    .eq("hotel_id", hotelId)
    .eq("arrival_date", filters.date ?? todayDate());

  if (filters.status && filters.status !== "All") {
    query = query.eq("status", filters.status);
  }

  if (filters.search) {
    query = query.or(`guest_name.ilike.%${filters.search}%,room.ilike.%${filters.search}%`);
  }

  if (filters.vipArrival) {
    query = query.eq("vip_arrival", true);
  }

  query = query.order("eta", { ascending: true, nullsFirst: false });

  const { data } = await query;
  return (data ?? []).map(mapArrival);
}

export async function getArrival(hotelId: string, arrivalId: string): Promise<Arrival | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("arrivals")
    .select("*")
    .eq("hotel_id", hotelId)
    .eq("id", arrivalId)
    .maybeSingle();

  return data ? mapArrival(data) : null;
}

export interface ArrivalStats {
  total: number;
  vvip: number;
  vip: number;
  arrived: number;
  delayed: number;
}

/** Stat tiles for the Arrival & VIP Board (§1.7): VVIP, VIP, Arrived, Delayed counts for the day. */
export async function getArrivalStats(hotelId: string, date?: string): Promise<ArrivalStats> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("arrivals")
    .select("vip_tier, status")
    .eq("hotel_id", hotelId)
    .eq("arrival_date", date ?? todayDate());

  const rows = data ?? [];
  return {
    total: rows.length,
    vvip: rows.filter((r) => r.vip_tier === "VVIP").length,
    vip: rows.filter((r) => r.vip_tier === "VIP").length,
    arrived: rows.filter((r) => r.status === "Arrived").length,
    delayed: rows.filter((r) => r.status === "Flight Delayed").length,
  };
}
