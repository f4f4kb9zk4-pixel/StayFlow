import { createClient } from "@/lib/supabase/server";
import type { ShiftHandover, Profile } from "@/types/domain";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function loadProfiles(supabase: SupabaseClient, ids: (string | null | undefined)[]) {
  const uniqueIds = Array.from(new Set(ids.filter((id): id is string => !!id)));
  if (uniqueIds.length === 0) return new Map<string, Profile>();

  const { data } = await supabase.from("profiles").select("id, full_name, avatar_color").in("id", uniqueIds);

  const map = new Map<string, Profile>();
  for (const row of data ?? []) {
    map.set(row.id, { id: row.id, fullName: row.full_name, avatarColor: row.avatar_color });
  }
  return map;
}

// Row shape returned from `shift_handovers` select("*")
type HandoverRow = {
  id: string;
  handover_number: string;
  hotel_id: string;
  shift: ShiftHandover["shift"];
  shift_date: string;
  from_user_id: string | null;
  to_user_id: string | null;
  handover_time: string;
  notes: string | null;
  status: ShiftHandover["status"];
};

async function attachDetails(supabase: SupabaseClient, handover: HandoverRow): Promise<ShiftHandover> {
  const [{ data: openCases }, { data: followups }, { data: deptUpdates }, profiles] = await Promise.all([
    supabase.from("handover_open_cases").select("*").eq("handover_id", handover.id),
    supabase.from("handover_followups").select("*").eq("handover_id", handover.id),
    supabase.from("handover_department_updates").select("*").eq("handover_id", handover.id),
    loadProfiles(supabase, [handover.from_user_id, handover.to_user_id]),
  ]);

  return {
    id: handover.id,
    handoverNumber: handover.handover_number,
    hotelId: handover.hotel_id,
    shift: handover.shift,
    shiftDate: handover.shift_date,
    fromUser: handover.from_user_id ? profiles.get(handover.from_user_id) ?? null : null,
    toUser: handover.to_user_id ? profiles.get(handover.to_user_id) ?? null : null,
    handoverTime: handover.handover_time,
    notes: handover.notes,
    status: handover.status,
    openCases: (openCases ?? []).map((o) => ({ id: o.id, referenceLabel: o.reference_label })),
    followups: (followups ?? []).map((f) => ({
      id: f.id,
      task: f.task,
      dueAt: f.due_at,
      department: f.department,
      completed: f.completed,
    })),
    departmentUpdates: (deptUpdates ?? []).map((d) => ({
      id: d.id,
      department: d.department,
      updateText: d.update_text,
    })),
  };
}

/**
 * Shift Handover (§1.7, §3.2 item 4) — the most recent handover with
 * status "Active", including open cases, follow-ups, and department
 * updates. Returns null if there is none yet.
 */
export async function getActiveHandover(hotelId: string): Promise<ShiftHandover | null> {
  const supabase = await createClient();

  const { data: handover } = await supabase
    .from("shift_handovers")
    .select("*")
    .eq("hotel_id", hotelId)
    .eq("status", "Active")
    .order("handover_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!handover) return null;

  return attachDetails(supabase, handover);
}

/** Past (closed) handovers, most recent first — for the handover history list. */
export async function getHandoverHistory(hotelId: string, limit = 10): Promise<ShiftHandover[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("shift_handovers")
    .select("*")
    .eq("hotel_id", hotelId)
    .eq("status", "Closed")
    .order("handover_time", { ascending: false })
    .limit(limit);

  return Promise.all((data ?? []).map((row) => attachDetails(supabase, row)));
}

/** Single handover by id — for viewing a past handover's full detail. */
export async function getHandover(hotelId: string, handoverId: string): Promise<ShiftHandover | null> {
  const supabase = await createClient();

  const { data: handover } = await supabase
    .from("shift_handovers")
    .select("*")
    .eq("hotel_id", hotelId)
    .eq("id", handoverId)
    .maybeSingle();

  if (!handover) return null;

  return attachDetails(supabase, handover);
}
