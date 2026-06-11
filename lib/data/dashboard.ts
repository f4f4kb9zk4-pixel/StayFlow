import { createClient } from "@/lib/supabase/server";
import type {
  Incident,
  Task,
  FollowUp,
  Escalation,
  Profile,
} from "@/types/domain";

export { getActiveHandover } from "@/lib/data/handover";

/**
 * Data access for the Dashboard Action Center (§0.1, §3.2 item 5). Five
 * blocks: Operational Alerts, Open Guest Cases, Task Assignments, Pending
 * Follow-Ups, Shift Handover summary. Returns empty arrays/null on missing
 * data so the page renders cleanly before a hotel has any activity.
 */

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

export async function getOperationalAlerts(hotelId: string): Promise<Escalation[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("escalations")
    .select("*")
    .eq("hotel_id", hotelId)
    .in("status", ["Open", "Acknowledged"])
    .order("escalated_at", { ascending: false })
    .limit(5);

  const rows = data ?? [];
  const profiles = await loadProfiles(
    supabase,
    rows.flatMap((r) => [r.escalated_by, r.escalated_to_user])
  );

  return rows.map((r) => ({
    id: r.id,
    hotelId: r.hotel_id,
    sourceTable: r.source_table,
    sourceId: r.source_id,
    escalatedBy: r.escalated_by ? profiles.get(r.escalated_by) ?? null : null,
    escalatedToRole: r.escalated_to_role,
    escalatedToUser: r.escalated_to_user ? profiles.get(r.escalated_to_user) ?? null : null,
    reason: r.reason,
    status: r.status,
    escalatedAt: r.escalated_at,
  }));
}

export async function getOpenIncidents(hotelId: string, limit = 5): Promise<Incident[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("incidents")
    .select("*")
    .eq("hotel_id", hotelId)
    .in("status", ["Pending", "In Progress", "Escalated"])
    .order("priority", { ascending: false })
    .order("reported_at", { ascending: true })
    .limit(limit);

  const rows = data ?? [];
  const profiles = await loadProfiles(supabase, rows.map((r) => r.assigned_to));

  return rows.map((r) => ({
    id: r.id,
    incidentNumber: r.incident_number,
    hotelId: r.hotel_id,
    category: r.category,
    title: r.title,
    room: r.room,
    department: r.department,
    priority: r.priority,
    status: r.status,
    assignedTo: r.assigned_to ? profiles.get(r.assigned_to) ?? null : null,
    reportedAt: r.reported_at,
    recoveryAction: r.recovery_action,
    resolution: r.resolution,
    guestName: r.guest_name,
  }));
}

export async function getMyTasks(
  hotelId: string,
  userId: string,
  department: string | null,
  limit = 5
): Promise<Task[]> {
  const supabase = await createClient();

  let query = supabase
    .from("tasks")
    .select("*")
    .eq("hotel_id", hotelId)
    .neq("column_status", "Completed")
    .order("position", { ascending: true })
    .limit(limit);

  if (department) {
    query = query.or(`assignee_id.eq.${userId},department.eq.${department}`);
  } else {
    query = query.eq("assignee_id", userId);
  }

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

export async function getPendingFollowUps(hotelId: string, limit = 5): Promise<FollowUp[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("hotel_id", hotelId)
    .in("status", ["Pending", "Overdue"])
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(limit);

  const rows = data ?? [];
  const profiles = await loadProfiles(supabase, rows.map((r) => r.assignee_id));

  return rows.map((r) => ({
    id: r.id,
    hotelId: r.hotel_id,
    description: r.description,
    department: r.department,
    dueAt: r.due_at,
    status: r.status,
    assignee: r.assignee_id ? profiles.get(r.assignee_id) ?? null : null,
    sourceTable: r.source_table,
    sourceId: r.source_id,
  }));
}

export interface DashboardCounts {
  openCases: number;
  myTasks: number;
  pendingFollowUps: number;
  activeAlerts: number;
}

/**
 * Lightweight counts (head-only queries) for the Dashboard KPI strip — total
 * open guest cases, total tasks assigned to the user (mirrors `getMyTasks`'
 * filter), pending/overdue follow-ups, and active operational alerts. These
 * are full-table counts (not capped by the `limit` used for the row lists
 * above) so the KPI tiles reflect the true totals.
 */
export async function getDashboardCounts(
  hotelId: string,
  userId: string,
  department: string | null
): Promise<DashboardCounts> {
  const supabase = await createClient();

  let taskQuery = supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("hotel_id", hotelId)
    .neq("column_status", "Completed");

  taskQuery = department
    ? taskQuery.or(`assignee_id.eq.${userId},department.eq.${department}`)
    : taskQuery.eq("assignee_id", userId);

  const [casesRes, tasksRes, followUpsRes, alertsRes] = await Promise.all([
    supabase
      .from("incidents")
      .select("id", { count: "exact", head: true })
      .eq("hotel_id", hotelId)
      .in("status", ["Pending", "In Progress", "Escalated"]),
    taskQuery,
    supabase
      .from("follow_ups")
      .select("id", { count: "exact", head: true })
      .eq("hotel_id", hotelId)
      .in("status", ["Pending", "Overdue"]),
    supabase
      .from("escalations")
      .select("id", { count: "exact", head: true })
      .eq("hotel_id", hotelId)
      .in("status", ["Open", "Acknowledged"]),
  ]);

  return {
    openCases: casesRes.count ?? 0,
    myTasks: tasksRes.count ?? 0,
    pendingFollowUps: followUpsRes.count ?? 0,
    activeAlerts: alertsRes.count ?? 0,
  };
}

