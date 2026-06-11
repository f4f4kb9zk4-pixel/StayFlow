"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/use-current-user";
import type { Department } from "@/types/domain";

export interface ActionState {
  error?: string;
  success?: boolean;
}

/**
 * Create a follow-up (§3.2 item 5, cross-cutting `follow_ups` table).
 * Can be called as a standalone reminder, or linked to a source record
 * (`sourceTable`/`sourceId`) from Cases/Incidents/Tasks/Handover.
 */
export async function createFollowUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const description = String(formData.get("description") ?? "").trim();
  const department = String(formData.get("department") ?? "") as Department | "none" | "";
  const dueAt = String(formData.get("dueAt") ?? "").trim() || null;
  const assigneeId = String(formData.get("assigneeId") ?? "") || null;
  const sourceTable = String(formData.get("sourceTable") ?? "") || null;
  const sourceId = String(formData.get("sourceId") ?? "") || null;

  if (!description) {
    return { error: "Description is required." };
  }

  const { error } = await supabase.from("follow_ups").insert({
    hotel_id: user.currentHotel.id,
    description,
    department: department && department !== "none" ? department : null,
    due_at: dueAt ? new Date(dueAt).toISOString() : null,
    status: "Pending",
    assignee_id: assigneeId === "unassigned" ? null : assigneeId,
    created_by: user.id,
    source_table: sourceTable,
    source_id: sourceId,
  });

  if (error) {
    return { error: "Could not create follow-up. Please try again." };
  }

  revalidatePath("/dashboard");
  if (sourceTable === "guest_cases" || sourceTable === "incidents") revalidatePath("/incidents");
  return { success: true };
}

/** Mark a follow-up complete (or back to pending). */
export async function setFollowUpStatus(followUpId: string, status: "Pending" | "Completed") {
  const supabase = await createClient();

  const { error } = await supabase
    .from("follow_ups")
    .update({ status, completed_at: status === "Completed" ? new Date().toISOString() : null })
    .eq("id", followUpId);

  if (error) return { error: "Could not update follow-up." };

  revalidatePath("/dashboard");
  return { success: true };
}
