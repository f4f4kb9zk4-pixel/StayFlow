import { getCurrentUser } from "@/lib/auth/use-current-user";
import { getHotelBranding, ThemeRoot } from "@/lib/branding/theme-provider";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

/**
 * Authenticated app shell (§3.2 item 0 / Foundation). Resolves the current
 * user + active hotel, applies white-label branding via ThemeRoot, and
 * renders the responsive nav: sidebar on desktop, top bar + bottom tabs on
 * mobile (§3.4).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const branding = await getHotelBranding(user.currentHotel.id);
  const supabase = await createClient();

  const [{ count: openCases }, { count: activeTasks }, { count: unreadNotifications }] =
    await Promise.all([
      supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .eq("hotel_id", user.currentHotel.id)
        .in("status", ["Pending", "In Progress", "Escalated"]),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("hotel_id", user.currentHotel.id)
        .neq("column_status", "Completed"),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("hotel_id", user.currentHotel.id)
        .eq("read", false)
        .or(`recipient_id.eq.${user.id},recipient_role.eq.${user.currentRole}`),
    ]);

  const hotels = user.hotelRoles.map((hr) => ({ id: hr.hotel.id, name: hr.hotel.name }));

  return (
    <ThemeRoot branding={branding} className="flex flex-col md:flex-row">
      <Sidebar
        role={user.currentRole}
        userName={user.profile.fullName}
        productName={branding.productName}
        tagline={branding.tagline}
        logoUrl={branding.logoUrl}
        currentHotelId={user.currentHotel.id}
        hotels={hotels}
        badgeCounts={{
          incidents: openCases ?? 0,
          tasks: activeTasks ?? 0,
          notifications: unreadNotifications ?? 0,
        }}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          role={user.currentRole}
          userName={user.profile.fullName}
          productName={branding.productName}
          currentHotelId={user.currentHotel.id}
          hotels={hotels}
          notificationCount={unreadNotifications ?? 0}
        />

        <main className="flex-1 min-w-0 pb-16 md:pb-0">{children}</main>
      </div>

      <MobileBottomNav />
    </ThemeRoot>
  );
}
