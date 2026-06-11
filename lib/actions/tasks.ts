"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/use-current-user";
import type { Department, PriorityLevel, TaskColumn, TaskTag } from "@/types/domain";

export interface ActionState {
  error?: string;
  success?: boolean;
}

async function nextTaskNumber(supabase: Awaited<ReturnType<typeof createClient>>, hotelId: string) {
  const { count } = await supabase.from("tasks").select("id", { count: "exact", head: true }).eq("hotel_id", hotelId);

  return `T-${400 + (count ?? 0) + 1}`;
}

/** Create a new task (Task Board "New" column, §1.7). */
export async function createTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const department = String(formData.get("department") ?? "") as Department;
  const priority = String(formData.get("priority") ?? "medium") as PriorityLevel;
  const room = String(formData.get("room") ?? "").trim() || null;
  const dueAt = String(formData.get("dueAt") ?? "").trim() || null;
  const assigneeId = String(formData.get("assigneeId") ?? "") || null;
  const tags = formData.getAll("tags").map(String) as TaskTag[];

  if (!title || !department) {
    return { error: "Title and department are required." };
  }

  const taskNumber = await nextTaskNumber(supabase, user.currentHotel.id);

  const { count: colCount } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("hotel_id", user.currentHotel.id)
    .eq("column_status", "New");

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      task_number: taskNumber,
      hotel_id: user.currentHotel.id,
      title,
      room,
      department,
      priority,
      column_status: "New",
      assignee_id: assigneeId === "unassigned" ? null : assigneeId,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      position: colCount ?? 0,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Could not create task. Please try again." };
  }

  if (tags.length > 0) {
    await supabase.from("task_tags").insert(tags.map((tag) => ({ task_id: data.id, tag })));
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Move a task to a new column/position (dnd-kit drop handler). */
export async function moveTask(taskId: string, columnStatus: TaskColumn, position: number) {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update({ column_status: columnStatus, position, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("hotel_id", user.currentHotel.id);

  if (error) return { error: "Could not move task." };

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Assign / reassign a task. */
export async function assignTask(taskId: string, assigneeId: string | null) {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update({ assignee_id: assigneeId, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("hotel_id", user.currentHotel.id);

  if (error) return { error: "Could not update assignee." };

  revalidatePath("/tasks");
  return { success: true };
}
