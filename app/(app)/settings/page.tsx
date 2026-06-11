import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/use-current-user";
import { canAccess, canEdit, ROLE_LABELS } from "@/lib/auth/permissions";
import { getHotelStaff } from "@/lib/data/staff";
import { getHotelBranding } from "@/lib/branding/theme-provider";
import { PageHeader } from "@/components/shared/page-header";
import { HotelProfileForm } from "@/components/settings/hotel-profile-form";
import { StaffTable } from "@/components/settings/staff-table";
import { ThemeForm } from "@/components/settings/theme-form";

export const metadata = {
  title: "Settings — StayFlow",
};

/**
 * Settings / Admin (§1.7, §3.2 item 11) — hotel profile, user & role
 * management, and Theme Settings (§2.7), gated by the "settings" module
 * permission. Theme editing is further restricted to GM/Super Admin.
 */
export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!canAccess(user.currentRole, "settings")) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const hotelId = user.currentHotel.id;

  const [{ data: hotelRow }, staff, branding] = await Promise.all([
    supabase
      .from("hotels")
      .select("total_rooms, line_channel_access_token, line_target_id")
      .eq("id", hotelId)
      .maybeSingle(),
    getHotelStaff(hotelId),
    getHotelBranding(hotelId),
  ]);

  const readOnly = !canEdit(user.currentRole, "settings");
  const themeReadOnly = user.currentRole !== "general_manager" && user.currentRole !== "super_admin";

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Settings"
        subtitle={`Hotel profile, users, and theme. Signed in as ${ROLE_LABELS[user.currentRole]}.`}
      />

      <HotelProfileForm
        hotel={{
          ...user.currentHotel,
          totalRooms: hotelRow?.total_rooms ?? 0,
          lineChannelAccessToken: hotelRow?.line_channel_access_token ?? null,
          lineTargetId: hotelRow?.line_target_id ?? null,
        }}
        readOnly={readOnly}
      />

      <StaffTable staff={staff} readOnly={readOnly} />

      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Theme</h2>
        <p className="text-sm text-muted-foreground">
          White-label appearance for this hotel (§2.7). Only General Managers and Super Admins can edit.
        </p>
      </div>
      <ThemeForm branding={branding} readOnly={themeReadOnly} />
    </div>
  );
}
