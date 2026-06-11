"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import type { AppNotification } from "@/types/domain";
import { markNotificationRead } from "@/lib/actions/notifications";
import { notificationTypeConfig } from "@/components/notifications/notification-type-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime, cn } from "@/lib/utils";

const SOURCE_LINKS: Record<string, (id: string) => string> = {
  guest_cases: (id) => `/incidents?incident=${id}`,
  incidents: (id) => `/incidents?incident=${id}`,
  vip_guests: (id) => `/arrivals?vip=${id}`,
  arrivals: () => `/arrivals`,
  tasks: () => `/tasks`,
  shift_handovers: () => `/handover`,
  follow_ups: () => `/dashboard#followups`,
  escalations: () => `/dashboard`,
};

function buildSourceHref(sourceTable?: string | null, sourceId?: string | null) {
  if (!sourceTable) return null;
  const builder = SOURCE_LINKS[sourceTable];
  if (!builder) return null;
  return builder(sourceId ?? "");
}

/**
 * Notifications Center feed (§1.7, §3.2 item 10) — unified list across
 * types, unread items highlighted, click marks read and deep-links to the
 * source record where possible.
 */
export function NotificationFeed({
  notifications,
  timezone,
}: {
  notifications: AppNotification[];
  timezone: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  if (notifications.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
        You&rsquo;re all caught up — no notifications.
      </div>
    );
  }

  function onItemClick(n: AppNotification) {
    if (!n.read) {
      startTransition(() => {
        markNotificationRead(n.id);
      });
    }
    const href = buildSourceHref(n.sourceTable, n.sourceId);
    if (href) router.push(href);
  }

  return (
    <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
      {notifications.map((n) => {
        const config = notificationTypeConfig(n.type);
        const Icon = config.icon;
        const clickable = !n.read || !!buildSourceHref(n.sourceTable, n.sourceId);

        return (
          <div
            key={n.id}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={() => onItemClick(n)}
            onKeyDown={(e) => {
              if (clickable && (e.key === "Enter" || e.key === " ")) onItemClick(n);
            }}
            className={cn(
              "flex items-start gap-3 p-3 sm:p-4 transition-colors",
              clickable && "cursor-pointer hover:bg-muted/50",
              !n.read && "bg-gold-dim/30"
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                n.type === "escalation" && "bg-danger/15 text-danger",
                n.type === "task" && "bg-info/15 text-info",
                n.type === "complaint" && "bg-warning/15 text-warning",
                n.type === "followup" && "bg-muted text-muted-foreground",
                n.type === "alert" && "bg-warning/15 text-warning",
                n.type === "vip" && "bg-gold-dim text-primary"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className={cn("text-sm", !n.read ? "font-semibold" : "font-medium")}>{n.title}</p>
                <span className="shrink-0 text-xs text-muted-foreground font-data">
                  {formatRelativeTime(n.createdAt, timezone)}
                </span>
              </div>
              {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <Badge variant={config.variant}>{config.label}</Badge>
                {n.priority && <PriorityBadge priority={n.priority} />}
                {n.department && (
                  <span className="text-xs text-muted-foreground">{n.department}</span>
                )}
              </div>
            </div>

            {!n.read && (
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
            )}
          </div>
        );
      })}
    </div>
  );
}
