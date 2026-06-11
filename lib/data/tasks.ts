import { createClient } from "@/lib/supabase/server";
import type { Task, Department, Profile } from "@/types/domain";

export interface TaskFilters {
  department?: Department | "All";
}

async function loadProfiles(supabase: Awaited<ReturnType<typeof createClient>>, ids: (string | null | undefined)[]) {
  const uniqueIds = Array.from(new Set(ids.filter((id): id is string => !!id)));
  if (uniqueIds.length === 0) return new Map<string, Profile>();

  const { data } = await supabase.from("profiles").select("id, full_name, avatar_color").in("id", uniqueIds);

  const map = new Map<string, Profile>();
  for (const row of data ?? []) {
    map.set(row.id, { id: row.id, fullName: row.full_name, avatarColor: row.avatar_color });
  }
  return map;
}

/**
 * Task Board (§1.7) — 5-column kanban (New, Assigned, In Progress, Waiting,
 * Completed), optional department filter, ordered by `position` for
 * within-column drag ordering.
 */
export async function getTasks(hotelId: string, filters: TaskFilters = {}): Promise<Task[]> {
  const supabase = await createClient();

  let query = supabase.from("tasks").select("*").eq("hotel_id", hotelId);

  if (filters.department && filters.department !== "All") {
    query = query.eq("department", filters.department);
  }

  query = query.order("position", { ascending: true });

  const { data } = await query;
  const rows = data ?? [];
  const profiles = await loadProfiles(supabase, rows.map((r) => r.assignee_id));

  const taskIds = rows.map((r) => r.id);
  const tagsByTask = new Map<string, string[]>();
  if (taskIds.length > 0) {
    const { data: tagRows } = await supabase.from("task_tags").select("task_id, tag").in("task_id", taskIds);
    for (const t of tagRows ?? []) {
      const list = tagsByTask.get(t.task_id) ?? [];
      list.push(t.tag);
      tagsByTask.set(t.task_id, list);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    taskNumber: r.task_number,
    hotelId: r.hotel_id,
    title: r.title,
    room: r.room,
    department: r.department,
    priority: r.priority,
    columnStatus: r.column_status,
    assignee: r.assignee_id ? profiles.get(r.assignee_id) ?? null : null,
    dueAt: r.due_at,
    position: r.position,
    tags: (tagsByTask.get(r.id) ?? []) as Task["tags"],
  }));
}
