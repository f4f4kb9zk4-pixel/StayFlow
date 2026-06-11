import { createClient } from "@/lib/supabase/server";
import type { AppNotification, NotificationType, UserRole } from "@/types/domain";

export interface NotificationFilters {
  type?: NotificationType | "All";
  unreadOnly?: boolean;
}

function mapNotification(r: any): AppNotification {
  return {
    id: r.id,
    hotelId: r.hotel_id,
    recipientId: r.recipient_id,
    recipientRole: r.recipient_role,
    type: r.type,
    title: r.title,
    body: r.body,
    department: r.department,
    priority: r.priority,
    sourceTable: r.source_table,
    sourceId: r.source_id,
    read: r.read,
    lineDeliveryStatus: r.line_delivery_status,
    createdAt: r.created_at,
  };
}

/**
 * Notifications Center (§1.7, §3.2 item 10) — unified feed of items
 * addressed directly to the user (`recipient_id`) or broadcast to their
 * role (`recipient_role`), newest first.
 */
export async function getNotifications(
  hotelId: string,
  userId: string,
  role: UserRole,
  filters: NotificationFilters = {}
): Promise<AppNotification[]> {
  const supabase = await createClient();

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("hotel_id", hotelId)
    .or(`recipient_id.eq.${userId},recipient_role.eq.${role}`);

  if (filters.type && filters.type !== "All") {
    query = query.eq("type", filters.type);
  }

  if (filters.unreadOnly) {
    query = query.eq("read", false);
  }

  query = query.order("created_at", { ascending: false }).limit(100);

  const { data } = await query;
  return (data ?? []).map(mapNotification);
}

export interface NotificationCounts {
  total: number;
  byType: Record<NotificationType, number>;
}

/**
 * Unread counts for the filter chips' badges (§1.7 "filter chips with
 * unread counts").
 */
export async function getUnreadNotificationCounts(
  hotelId: string,
  userId: string,
  role: UserRole
): Promise<NotificationCounts> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("notifications")
    .select("type")
    .eq("hotel_id", hotelId)
    .eq("read", false)
    .or(`recipient_id.eq.${userId},recipient_role.eq.${role}`);

  const rows = data ?? [];
  const byType = {
    escalation: 0,
    task: 0,
    complaint: 0,
    followup: 0,
    alert: 0,
    vip: 0,
  } as Record<NotificationType, number>;

  for (const row of rows) {
    const type = row.type as NotificationType;
    byType[type] = (byType[type] ?? 0) + 1;
  }

  return { total: rows.length, byType };
}
