"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/use-current-user";
import type { Department, ShiftType } from "@/types/domain";

export interface ActionState {
  error?: string;
  success?: boolean;
}

async function nextHandoverNumber(supabase: Awaited<ReturnType<typeof createClient>>, hotelId: string) {
  const { count } = await supabase.from("shift_handovers").select("id", { count: "exact", head: true }).eq("hotel_id", hotelId);

  return `H-${100 + (count ?? 0) + 1}`;
}

/** Parse a "task | due time | department" line into a followup record. */
function parseFollowupLine(line: string) {
  const [task, due, department] = line.split("|").map((s) => s.trim());
  if (!task) return null;
  return {
    task,
    due_at: due || null,
    department: (department as Department) || null,
    completed: false,
  };
}

/** Parse a "Department: update text" line into a department update record. */
function parseDeptUpdateLine(line: string) {
  const idx = line.indexOf(":");
  if (idx === -1) return null;
  const department = line.slice(0, idx).trim() as Department;
  const updateText = line.slice(idx + 1).trim();
  if (!department || !updateText) return null;
  return { department, update_text: updateText };
}

/**
 * Start a new shift handover (§1.7, §3.2 item 4). Closes any currently
 * active handover and creates a new one with open cases, follow-ups, and
 * department updates parsed from line-delimited text fields.
 */
export async function createHandover(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const shift = String(formData.get("shift") ?? "") as ShiftType;
  const shiftDate = String(formData.get("shiftDate") ?? "").trim();
  const toUserId = String(formData.get("toUserId") ?? "") || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const openCasesText = String(formData.get("openCases") ?? "");
  const followupsText = String(formData.get("followups") ?? "");
  const deptUpdatesText = String(formData.get("departmentUpdates") ?? "");

  if (!shift || !shiftDate) {
    return { error: "Shift and date are required." };
  }

  // Close any currently active handover.
  await supabase
    .from("shift_handovers")
    .update({ status: "Closed" })
    .eq("hotel_id", user.currentHotel.id)
    .eq("status", "Active");

  const handoverNumber = await nextHandoverNumber(supabase, user.currentHotel.id);

  const { data, error } = await supabase
    .from("shift_handovers")
    .insert({
      handover_number: handoverNumber,
      hotel_id: user.currentHotel.id,
      shift,
      shift_date: shiftDate,
      from_user_id: user.id,
      to_user_id: toUserId === "unassigned" ? null : toUserId,
      handover_time: new Date().toISOString(),
      notes,
      status: "Active",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Could not create handover. Please try again." };
  }

  const openCases = openCasesText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((label) => ({ handover_id: data.id, reference_label: label }));

  const followups = followupsText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseFollowupLine)
    .filter((f): f is NonNullable<ReturnType<typeof parseFollowupLine>> => !!f)
    .map((f) => ({ ...f, handover_id: data.id }));

  const departmentUpdates = deptUpdatesText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseDeptUpdateLine)
    .filter((d): d is NonNullable<ReturnType<typeof parseDeptUpdateLine>> => !!d)
    .map((d) => ({ ...d, handover_id: data.id }));

  await Promise.all([
    openCases.length > 0 ? supabase.from("handover_open_cases").insert(openCases) : Promise.resolve(),
    followups.length > 0 ? supabase.from("handover_followups").insert(followups) : Promise.resolve(),
    departmentUpdates.length > 0 ? supabase.from("handover_department_updates").insert(departmentUpdates) : Promise.resolve(),
  ]);

  revalidatePath("/handover");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Toggle a handover follow-up's completed state. */
export async function toggleFollowup(followupId: string, completed: boolean) {
  const supabase = await createClient();

  const { error } = await supabase.from("handover_followups").update({ completed }).eq("id", followupId);

  if (error) return { error: "Could not update follow-up." };

  revalidatePath("/handover");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Close the active handover without starting a new one. */
export async function closeHandover(handoverId: string) {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("shift_handovers")
    .update({ status: "Closed" })
    .eq("id", handoverId)
    .eq("hotel_id", user.currentHotel.id);

  if (error) return { error: "Could not close handover." };

  revalidatePath("/handover");
  revalidatePath("/dashboard");
  return { success: true };
}
