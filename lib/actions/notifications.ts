"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/use-current-user";

/** Mark a single notification as read (§1.7 "per-item read/unread state"). */
export async function markNotificationRead(notificationId: string) {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("hotel_id", user.currentHotel.id);

  if (error) return { error: "Could not update notification." };

  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return { success: true };
}

/** "Mark all read" action (§1.7). */
export async function markAllNotificationsRead() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("hotel_id", user.currentHotel.id)
    .eq("read", false)
    .or(`recipient_id.eq.${user.id},recipient_role.eq.${user.currentRole}`);

  if (error) return { error: "Could not update notifications." };

  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return { success: true };
}
