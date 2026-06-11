import { createAdminClient } from "@/lib/supabase/admin";
import { sendLineMessage } from "@/lib/notify/line";
import { formatDate } from "@/lib/utils";

export interface OverdueFollowUpsResult {
  hotelsChecked: number;
  overdueFound: number;
}

const LINE_SUMMARY_LIMIT = 10;

/**
 * Find `follow_ups` that are still "Pending" but past their `due_at`, flip
 * them to "Overdue", create an in-app notification for each, and push one
 * combined LINE message per affected hotel (if LINE is connected — see
 * Settings → Hotel profile).
 *
 * Intended to run on a schedule via `app/api/cron/overdue-followups`. Uses
 * the admin client since this runs outside any user session and spans all
 * hotels.
 */
export async function checkOverdueFollowUps(): Promise<OverdueFollowUpsResult> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: rows } = await admin
    .from("follow_ups")
    .select("id, hotel_id, description, department, due_at, assignee_id")
    .eq("status", "Pending")
    .not("due_at", "is", null)
    .lt("due_at", nowIso);

  const overdue = rows ?? [];
  if (overdue.length === 0) return { hotelsChecked: 0, overdueFound: 0 };

  const byHotel = new Map<string, typeof overdue>();
  for (const row of overdue) {
    const list = byHotel.get(row.hotel_id) ?? [];
    list.push(row);
    byHotel.set(row.hotel_id, list);
  }

  for (const [hotelId, items] of byHotel) {
    const ids = items.map((i) => i.id);

    await admin.from("follow_ups").update({ status: "Overdue" }).in("id", ids);

    await admin.from("notifications").insert(
      items.map((item) => ({
        hotel_id: hotelId,
        recipient_id: item.assignee_id,
        type: "followup" as const,
        title: "Follow-up overdue",
        body: item.description,
        department: item.department,
        priority: "high" as const,
        source_table: "follow_ups",
        source_id: item.id,
        line_delivery_status: "skipped",
      }))
    );

    const { data: hotel } = await admin
      .from("hotels")
      .select("line_channel_access_token, line_target_id")
      .eq("id", hotelId)
      .maybeSingle();

    const token = hotel?.line_channel_access_token ?? null;
    const targetId = hotel?.line_target_id ?? null;
    if (token && targetId) {
      const lines = items
        .slice(0, LINE_SUMMARY_LIMIT)
        .map((i) => `• ${i.description}${i.due_at ? ` (due ${formatDate(i.due_at)})` : ""}`);
      const more = items.length > LINE_SUMMARY_LIMIT ? `\n…and ${items.length - LINE_SUMMARY_LIMIT} more` : "";
      const header = `⏰ ${items.length} follow-up${items.length === 1 ? " is" : "s are"} overdue:`;
      await sendLineMessage(token, targetId, `${header}\n${lines.join("\n")}${more}`);
    }
  }

  return { hotelsChecked: byHotel.size, overdueFound: overdue.length };
}
