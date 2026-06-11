import { Suspense } from "react";

import { getCurrentUser } from "@/lib/auth/use-current-user";
import {
  getNotifications,
  getUnreadNotificationCounts,
  type NotificationFilters,
} from "@/lib/data/notifications";
import { PageHeader } from "@/components/shared/page-header";
import { NotificationFilterBar } from "@/components/notifications/notification-filter-bar";
import { NotificationFeed } from "@/components/notifications/notification-feed";

export const metadata = {
  title: "Notifications — StayFlow",
};

interface NotificationsPageProps {
  searchParams: Promise<{ type?: string; unread?: string }>;
}

/**
 * Notifications Center (§1.7, §3.2 item 10) — unified feed across types
 * (escalation, task, complaint, followup, alert, vip), with filter chips
 * showing unread counts and a "Mark all read" action.
 */
export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const hotelId = user.currentHotel.id;

  const filters: NotificationFilters = {
    type: (params.type as NotificationFilters["type"]) ?? "All",
    unreadOnly: params.unread === "1",
  };

  const [notifications, counts] = await Promise.all([
    getNotifications(hotelId, user.id, user.currentRole, filters),
    getUnreadNotificationCounts(hotelId, user.id, user.currentRole),
  ]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <PageHeader title="Notifications" subtitle="Escalations, tasks, follow-ups, and VIP alerts in one feed." />
      <Suspense>
        <NotificationFilterBar counts={counts} />
      </Suspense>
      <NotificationFeed notifications={notifications} timezone={user.currentHotel.timezone} />
    </div>
  );
}
