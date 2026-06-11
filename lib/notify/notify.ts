import type { createClient } from "@/lib/supabase/server";
import { sendLineMessage } from "@/lib/notify/line";
import type { Database } from "@/types/database.types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

export interface NotifyHotelInput extends Omit<NotificationInsert, "hotel_id" | "line_delivery_status"> {
  /**
   * Optional override for the message pushed to LINE — defaults to
   * "<title>\n<body>". Pass `null` to skip the LINE push for this
   * notification even if the hotel has LINE Notify connected.
   */
  lineMessage?: string | null;
}

/**
 * Create an in-app notification and, if the hotel has LINE Messaging API
 * connected (Settings → Hotel profile — channel access token + a LINE chat
 * linked via the webhook), forward it to LINE too. This is the shared entry
 * point for "various notifications" (escalations, overdue follow-ups, etc.)
 * so LINE delivery stays consistent across call sites.
 *
 * Failures to reach LINE never block the in-app notification — they're
 * recorded on `notifications.line_delivery_status` for visibility.
 */
export async function notifyHotel(
  supabase: SupabaseServerClient,
  hotelId: string,
  notification: NotifyHotelInput
): Promise<{ error?: string }> {
  const { lineMessage, ...fields } = notification;

  const { data: hotel } = await supabase
    .from("hotels")
    .select("line_channel_access_token, line_target_id")
    .eq("id", hotelId)
    .maybeSingle();

  const token = hotel?.line_channel_access_token ?? null;
  const targetId = hotel?.line_target_id ?? null;

  let lineDeliveryStatus: string | null = null;
  if (token && targetId && lineMessage !== null) {
    const message = lineMessage ?? `${fields.title}${fields.body ? `\n${fields.body}` : ""}`;
    const result = await sendLineMessage(token, targetId, message);
    lineDeliveryStatus = result.ok ? "sent" : "failed";
  } else if (!token || !targetId) {
    lineDeliveryStatus = "skipped";
  }

  const { error } = await supabase.from("notifications").insert({
    ...fields,
    hotel_id: hotelId,
    line_delivery_status: lineDeliveryStatus,
  });

  if (error) return { error: "Could not create notification." };
  return {};
}
