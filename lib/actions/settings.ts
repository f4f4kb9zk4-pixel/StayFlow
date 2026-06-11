"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/use-current-user";
import { canEdit, ASSIGNABLE_ROLES } from "@/lib/auth/permissions";
import { sendLineMessage } from "@/lib/notify/line";
import type { Department, UserRole } from "@/types/domain";

export interface ActionState {
  error?: string;
  success?: boolean;
}

/**
 * Hotel profile (§1.7, §3.2 item 11) — name, locale, timezone, room count,
 * and the LINE Messaging API credentials used to forward notifications to
 * LINE. The LINE credential fields are password inputs that render blank
 * even when already saved, so an empty submission leaves the existing
 * values untouched — clearing them requires the dedicated "Disconnect"
 * action.
 */
export async function updateHotelProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!canEdit(user.currentRole, "settings")) {
    return { error: "You don't have permission to edit hotel settings." };
  }

  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();
  const locale = String(formData.get("locale") ?? "").trim();
  const totalRooms = Number(formData.get("totalRooms") ?? 0);
  const lineChannelAccessToken = String(formData.get("lineChannelAccessToken") ?? "").trim();
  const lineChannelSecret = String(formData.get("lineChannelSecret") ?? "").trim();

  if (!name) return { error: "Hotel name is required." };

  const update: Record<string, unknown> = {
    name,
    timezone: timezone || "Asia/Bangkok",
    locale: locale || "th-TH",
    total_rooms: Number.isFinite(totalRooms) ? totalRooms : 0,
  };
  if (lineChannelAccessToken) update.line_channel_access_token = lineChannelAccessToken;
  if (lineChannelSecret) update.line_channel_secret = lineChannelSecret;

  const { error } = await supabase.from("hotels").update(update).eq("id", user.currentHotel.id);

  if (error) return { error: "Could not save hotel profile." };

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Disconnect LINE for the current hotel — clears the channel access token,
 * channel secret, and the linked chat (`line_target_id`). Re-connecting
 * means re-entering the credentials and re-adding the bot to a LINE chat.
 */
export async function disconnectLineNotify() {
  const user = await getCurrentUser();
  if (!canEdit(user.currentRole, "settings")) {
    return { error: "You don't have permission to edit hotel settings." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("hotels")
    .update({ line_channel_access_token: null, line_channel_secret: null, line_target_id: null })
    .eq("id", user.currentHotel.id);

  if (error) return { error: "Could not disconnect LINE." };

  revalidatePath("/settings");
  return { success: true };
}

export interface LineTestState extends ActionState {
  message?: string;
}

/**
 * Send a test message via the LINE Messaging API using the hotel's saved
 * channel access token and linked chat, so staff can confirm the
 * connection from Settings without waiting for a real notification.
 */
export async function sendLineTestNotification(): Promise<LineTestState> {
  const user = await getCurrentUser();
  if (!canEdit(user.currentRole, "settings")) {
    return { error: "You don't have permission to edit hotel settings." };
  }

  const supabase = await createClient();
  const { data: hotel } = await supabase
    .from("hotels")
    .select("line_channel_access_token, line_target_id")
    .eq("id", user.currentHotel.id)
    .maybeSingle();

  const token = hotel?.line_channel_access_token ?? null;
  if (!token) return { error: "Connect a LINE channel access token first, then save and try again." };

  const targetId = hotel?.line_target_id ?? null;
  if (!targetId) {
    return {
      error:
        "No LINE chat linked yet — add the StayFlow bot to a LINE group/chat (see webhook setup below), then try again.",
    };
  }

  const result = await sendLineMessage(
    token,
    targetId,
    `StayFlow is connected to this LINE chat. Test message from ${user.profile.fullName}.`
  );
  if (!result.ok) return { error: result.error ?? "Could not send test message." };

  return { success: true, message: "Test message sent — check this chat in LINE." };
}

/**
 * User & role management (§1.7, §3.2 item 11) — update a staff member's
 * role and department for the current hotel.
 */
export async function updateStaffRole(userId: string, role: UserRole, department: Department | null) {
  const user = await getCurrentUser();
  if (!canEdit(user.currentRole, "settings")) {
    return { error: "You don't have permission to manage users." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("user_hotel_roles")
    .update({ role, department })
    .eq("hotel_id", user.currentHotel.id)
    .eq("user_id", userId);

  if (error) return { error: "Could not update user." };

  revalidatePath("/settings");
  return { success: true };
}

/**
 * Add a new staff account directly from Settings (§3.2 item 11). Creates the
 * `auth.users` row via the Supabase Admin API with a temporary password set
 * by the admin, plus matching `profiles` and `user_hotel_roles` rows for the
 * current hotel.
 *
 * Restricted to roles in `ASSIGNABLE_ROLES` — Super Admin accounts cannot be
 * created through this form, to prevent privilege escalation.
 */
export async function createStaffUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!canEdit(user.currentRole, "settings")) {
    return { error: "You don't have permission to manage users." };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;
  const departmentRaw = String(formData.get("department") ?? "");
  const department = departmentRaw && departmentRaw !== "none" ? (departmentRaw as Department) : null;

  if (!fullName) return { error: "Name is required." };
  if (!email) return { error: "Email is required." };
  if (password.length < 8) return { error: "Temporary password must be at least 8 characters." };
  if (!role || !ASSIGNABLE_ROLES.includes(role)) {
    return { error: "Invalid role." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "User creation isn't configured yet. Add SUPABASE_SERVICE_ROLE_KEY to the environment." };
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created?.user) {
    return { error: createError?.message ?? "Could not create user." };
  }

  const newUserId = created.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: newUserId,
    full_name: fullName,
    default_hotel_id: user.currentHotel.id,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(newUserId);
    return { error: "Could not create user profile." };
  }

  const { error: roleError } = await admin.from("user_hotel_roles").insert({
    user_id: newUserId,
    hotel_id: user.currentHotel.id,
    role,
    department,
  });

  if (roleError) {
    await admin.auth.admin.deleteUser(newUserId);
    return { error: "Could not assign user role." };
  }

  revalidatePath("/settings");
  return { success: true };
}
