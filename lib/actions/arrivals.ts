"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/use-current-user";
import { parseArrivalsPdf, type ParsedArrival } from "@/lib/pms/arrivals-pdf-parser";
import type { ArrivalStatus, VipTier } from "@/types/domain";

export interface ActionState {
  error?: string;
  success?: boolean;
}

export interface ImportArrivalsState extends ActionState {
  imported?: number;
  updated?: number;
  warnings?: string[];
}

async function nextArrivalNumber(supabase: Awaited<ReturnType<typeof createClient>>, hotelId: string) {
  const { count } = await supabase.from("arrivals").select("id", { count: "exact", head: true }).eq("hotel_id", hotelId);

  return `ARR-${400 + (count ?? 0) + 1}`;
}

/** Add a guest to today's (or a future) Arrival & VIP Board (§3.2 item 7). */
export async function createArrival(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const guestName = String(formData.get("guestName") ?? "").trim();
  const nationality = String(formData.get("nationality") ?? "").trim() || null;
  const room = String(formData.get("room") ?? "").trim() || null;
  const eta = String(formData.get("eta") ?? "").trim() || null;
  const flightNumber = String(formData.get("flightNumber") ?? "").trim() || null;
  const transferType = String(formData.get("transferType") ?? "").trim() || null;
  const vipTier = String(formData.get("vipTier") ?? "Standard") as VipTier;
  const specialRequests = String(formData.get("specialRequests") ?? "").trim() || null;
  const arrivalDate = String(formData.get("arrivalDate") ?? "").trim() || new Date().toISOString().slice(0, 10);

  if (!guestName) {
    return { error: "Guest name is required." };
  }

  const arrivalNumber = await nextArrivalNumber(supabase, user.currentHotel.id);

  const { error } = await supabase.from("arrivals").insert({
    arrival_number: arrivalNumber,
    hotel_id: user.currentHotel.id,
    guest_name: guestName,
    nationality,
    room,
    eta: eta || null,
    flight_number: flightNumber,
    transfer_type: transferType,
    vip_tier: vipTier,
    special_requests: specialRequests,
    status: "Confirmed",
    arrival_date: arrivalDate,
  });

  if (error) {
    return { error: "Could not add arrival. Please try again." };
  }

  revalidatePath("/arrivals");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Update an arrival's status (Confirmed → En Route → Flight Delayed → Arrived). */
export async function updateArrivalStatus(arrivalId: string, status: ArrivalStatus) {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("arrivals")
    .update({ status })
    .eq("id", arrivalId)
    .eq("hotel_id", user.currentHotel.id);

  if (error) return { error: "Could not update arrival status." };

  revalidatePath("/arrivals");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Upsert parsed "Arrivals: Detailed" rows into the Arrival & VIP Board,
 * keyed on (hotel_id, confirmation_number) so re-importing the same report
 * updates existing rows instead of duplicating them. New rows are created
 * with status "Confirmed"; existing rows keep their current status and Room
 * Ready flag so front-desk progress isn't lost on re-import. Shared by
 * `importArrivalsFromPdf` and the combined PMS report importer.
 */
export async function upsertArrivals(
  supabase: Awaited<ReturnType<typeof createClient>>,
  hotelId: string,
  arrivals: ParsedArrival[]
): Promise<{ imported: number; updated: number }> {
  // Look up existing arrivals by Conf. No. so re-imports update rows in
  // place (and keep their arrival_number / status / room_ready).
  const confNumbers = arrivals.map((a) => a.confirmationNumber).filter((c): c is string => Boolean(c));

  const existingByConf = new Map<string, { id: string }>();
  if (confNumbers.length > 0) {
    const { data: existing } = await supabase
      .from("arrivals")
      .select("id, confirmation_number")
      .eq("hotel_id", hotelId)
      .in("confirmation_number", confNumbers);

    for (const row of existing ?? []) {
      if (row.confirmation_number) existingByConf.set(row.confirmation_number, { id: row.id });
    }
  }

  let nextNumber: number | null = null;
  async function allocateArrivalNumber() {
    if (nextNumber === null) {
      const { count } = await supabase
        .from("arrivals")
        .select("id", { count: "exact", head: true })
        .eq("hotel_id", hotelId);
      nextNumber = 400 + (count ?? 0) + 1;
    }
    const n = nextNumber;
    nextNumber += 1;
    return `ARR-${n}`;
  }

  let imported = 0;
  let updated = 0;

  for (const a of arrivals) {
    const existing = a.confirmationNumber ? existingByConf.get(a.confirmationNumber) : undefined;

    const sharedFields = {
      guest_name: a.guestName,
      room: a.room,
      arrival_date: a.arrivalDate,
      departure_date: a.departureDate,
      room_type: a.roomType,
      confirmation_number: a.confirmationNumber,
      nights: a.nights,
      adults: a.adults,
      pms_notes: a.pmsNotes,
      vip_arrival: a.vipArrival,
      notes_summary: a.notesSummary,
    };

    if (existing) {
      const { error } = await supabase.from("arrivals").update(sharedFields).eq("id", existing.id);
      if (!error) updated += 1;
    } else {
      const arrival_number = await allocateArrivalNumber();
      const { error } = await supabase.from("arrivals").insert({
        ...sharedFields,
        hotel_id: hotelId,
        arrival_number,
        vip_tier: a.vipTier as VipTier,
        status: "Confirmed" as ArrivalStatus,
        room_ready: false,
      });
      if (!error) imported += 1;
    }
  }

  return { imported, updated };
}

/**
 * Import a PMS "Arrivals: Detailed" PDF report (§3.2 item 7) — parses the
 * uploaded report and upserts via `upsertArrivals`. Kept for direct use;
 * the VIP tab's "Import PDF" now goes through the combined
 * `importPmsReportFromPdf` action in `lib/actions/pms-import.ts`, which also
 * tries this report format.
 */
export async function importArrivalsFromPdf(
  _prev: ImportArrivalsState,
  formData: FormData
): Promise<ImportArrivalsState> {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const hotelId = user.currentHotel.id;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a PDF file to import." };
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { error: "Please upload a PDF file." };
  }

  let parsed;
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    parsed = await parseArrivalsPdf(data);
  } catch (err) {
    // Log the real error server-side so it shows up in the `npm run dev`
    // terminal — the message shown to the user is intentionally generic.
    console.error("importArrivalsFromPdf: failed to parse PDF", err);
    return { error: "Could not read this PDF. Please check the file and try again." };
  }

  if (parsed.arrivals.length === 0) {
    return { error: "No reservations were recognized in this PDF.", warnings: parsed.warnings };
  }

  const { imported, updated } = await upsertArrivals(supabase, hotelId, parsed.arrivals);

  revalidatePath("/arrivals");
  revalidatePath("/dashboard");

  return { success: true, imported, updated, warnings: parsed.warnings };
}

/** Toggle the "Room Ready" flag for an arrival. */
export async function toggleRoomReady(arrivalId: string, roomReady: boolean) {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("arrivals")
    .update({ room_ready: roomReady })
    .eq("id", arrivalId)
    .eq("hotel_id", user.currentHotel.id);

  if (error) return { error: "Could not update room status." };

  revalidatePath("/arrivals");
  return { success: true };
}

/** Toggle the "VIP arrival" flag for an arrival. */
export async function toggleVipArrival(arrivalId: string, vipArrival: boolean) {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("arrivals")
    .update({ vip_arrival: vipArrival })
    .eq("id", arrivalId)
    .eq("hotel_id", user.currentHotel.id);

  if (error) return { error: "Could not update VIP arrival flag." };

  revalidatePath("/arrivals");
  revalidatePath("/dashboard");
  return { success: true };
}
