"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/use-current-user";
import { parseVipGuestsPdf, type ParsedVipGuest } from "@/lib/pms/vip-guests-pdf-parser";
import type { VipTier } from "@/types/domain";

export interface ActionState {
  error?: string;
  success?: boolean;
}

export interface ImportVipGuestsState extends ActionState {
  imported?: number;
  updated?: number;
  warnings?: string[];
}

/** Add a VIP guest profile (§3.2 item 6). */
export async function createVipGuest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const guestName = String(formData.get("guestName") ?? "").trim();
  const vipTier = String(formData.get("vipTier") ?? "VIP") as VipTier;
  const room = String(formData.get("room") ?? "").trim() || null;
  const stayStart = String(formData.get("stayStart") ?? "").trim() || null;
  const stayEnd = String(formData.get("stayEnd") ?? "").trim() || null;
  const preferences = String(formData.get("preferences") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!guestName) {
    return { error: "Guest name is required." };
  }

  const { error } = await supabase.from("vip_guests").insert({
    hotel_id: user.currentHotel.id,
    guest_name: guestName,
    vip_tier: vipTier,
    room,
    stay_start: stayStart,
    stay_end: stayEnd,
    preferences,
    notes,
  });

  if (error) {
    return { error: "Could not add VIP guest. Please try again." };
  }

  revalidatePath("/arrivals");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Update a VIP guest's preferences/notes/tier/stay dates. */
export async function updateVipGuest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const vipTier = String(formData.get("vipTier") ?? "VIP") as VipTier;
  const vipCodeRaw = String(formData.get("vipCode") ?? "none").trim();
  const vipCode = vipCodeRaw && vipCodeRaw !== "none" ? vipCodeRaw : null;
  const room = String(formData.get("room") ?? "").trim() || null;
  const stayStart = String(formData.get("stayStart") ?? "").trim() || null;
  const stayEnd = String(formData.get("stayEnd") ?? "").trim() || null;
  const preferences = String(formData.get("preferences") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!id) return { error: "Missing VIP guest." };

  const { error } = await supabase
    .from("vip_guests")
    .update({
      vip_tier: vipTier,
      vip_code: vipCode,
      room,
      stay_start: stayStart,
      stay_end: stayEnd,
      preferences,
      notes,
    })
    .eq("id", id)
    .eq("hotel_id", user.currentHotel.id);

  if (error) {
    return { error: "Could not update VIP guest. Please try again." };
  }

  revalidatePath("/arrivals");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Upsert parsed "VIP Guests INH" rows into VIP Guest Tracking with
 * `vip_inhouse = true`. Existing guests are matched on (hotel_id,
 * guest_name, room) so re-importing the same report updates room/stay/notes
 * in place rather than duplicating. Tier is taken from `vipTier`, derived
 * from the report's VIP code ("VVIP" code → VVIP tier, every other code →
 * VIP) — an existing VVIP tier is never downgraded by an import, but can be
 * upgraded if the report now shows a "VVIP" code. Note: this only flags guests found
 * in the report — it does not clear `vip_inhouse` for guests who have since
 * checked out; staff can untoggle "In-house" manually. Shared by
 * `importVipGuestsFromPdf` and the combined PMS report importer.
 */
export async function upsertVipGuests(
  supabase: Awaited<ReturnType<typeof createClient>>,
  hotelId: string,
  guests: ParsedVipGuest[]
): Promise<{ imported: number; updated: number }> {
  // Look up existing VIP guests so re-imports update rows in place (matched
  // on guest name + room — this report has no confirmation number).
  const { data: existingRows } = await supabase
    .from("vip_guests")
    .select("id, guest_name, room, vip_tier")
    .eq("hotel_id", hotelId);

  const existingByKey = new Map<string, { id: string; vipTier: VipTier }>();
  for (const row of existingRows ?? []) {
    if (row.room) {
      existingByKey.set(`${row.guest_name.trim().toLowerCase()}|${row.room}`, {
        id: row.id,
        vipTier: row.vip_tier as VipTier,
      });
    }
  }

  let imported = 0;
  let updated = 0;

  for (const g of guests) {
    const key = `${g.guestName.trim().toLowerCase()}|${g.room}`;
    const existing = existingByKey.get(key);

    if (existing) {
      const updateFields: Record<string, unknown> = {
        room: g.room,
        stay_start: g.stayStart,
        stay_end: g.stayEnd,
        vip_code: g.vipCode,
        preferences: g.preferences,
        notes: g.notes,
        vip_inhouse: true,
      };
      if (existing.vipTier !== "VVIP" || g.vipTier === "VVIP") updateFields.vip_tier = g.vipTier;

      const { error } = await supabase.from("vip_guests").update(updateFields).eq("id", existing.id);
      if (!error) updated += 1;
    } else {
      const { error } = await supabase.from("vip_guests").insert({
        hotel_id: hotelId,
        guest_name: g.guestName,
        vip_tier: g.vipTier,
        vip_code: g.vipCode,
        room: g.room,
        stay_start: g.stayStart,
        stay_end: g.stayEnd,
        preferences: g.preferences,
        notes: g.notes,
        vip_inhouse: true,
      });
      if (!error) imported += 1;
    }
  }

  return { imported, updated };
}

/**
 * Import a PMS "VIP Guests INH" PDF report (§3.2 item 6) — parses the
 * uploaded report (one record per room/stay window, shared occupants
 * merged) and upserts via `upsertVipGuests`. Kept for direct use; the VIP
 * tab's "Import PDF" now goes through the combined `importPmsReportFromPdf`
 * action in `lib/actions/pms-import.ts`, which also tries this report
 * format.
 */
export async function importVipGuestsFromPdf(
  _prev: ImportVipGuestsState,
  formData: FormData
): Promise<ImportVipGuestsState> {
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
    parsed = await parseVipGuestsPdf(data);
  } catch (err) {
    console.error("importVipGuestsFromPdf: failed to parse PDF", err);
    return { error: "Could not read this PDF. Please check the file and try again." };
  }

  if (parsed.guests.length === 0) {
    return { error: "No VIP in-house guests were recognized in this PDF.", warnings: parsed.warnings };
  }

  const { imported, updated } = await upsertVipGuests(supabase, hotelId, parsed.guests);

  revalidatePath("/arrivals");
  revalidatePath("/dashboard");

  return { success: true, imported, updated, warnings: parsed.warnings };
}

/** Toggle the "VIP inhouse" flag for a VIP guest. */
export async function toggleVipInhouse(vipGuestId: string, vipInhouse: boolean) {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("vip_guests")
    .update({ vip_inhouse: vipInhouse })
    .eq("id", vipGuestId)
    .eq("hotel_id", user.currentHotel.id);

  if (error) return { error: "Could not update VIP guest." };

  revalidatePath("/arrivals");
  revalidatePath("/dashboard");
  return { success: true };
}
