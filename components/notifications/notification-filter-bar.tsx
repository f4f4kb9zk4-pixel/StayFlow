"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { CheckCheck } from "lucide-react";

import type { NotificationType } from "@/types/domain";
import type { NotificationCounts } from "@/lib/data/notifications";
import { markAllNotificationsRead } from "@/lib/actions/notifications";
import { notificationTypeConfig } from "@/components/notifications/notification-type-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TYPES: NotificationType[] = ["escalation", "task", "complaint", "followup", "alert", "vip"];

/**
 * Notifications Center filter row (§1.7, §3.2 item 10) — type filter chips
 * with unread counts, an "Unread only" toggle, and "Mark all read".
 */
export function NotificationFilterBar({ counts }: { counts: NotificationCounts }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const activeType = searchParams.get("type") ?? "All";
  const unreadOnly = searchParams.get("unread") === "1";

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  function onMarkAllRead() {
    startTransition(() => {
      markAllNotificationsRead();
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setParam("type", null)}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors border",
            activeType === "All"
              ? "bg-gold-dim text-primary border-gold-border"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          All
          {counts.total > 0 && (
            <Badge variant="muted" className="ml-1.5 align-middle">
              {counts.total}
            </Badge>
          )}
        </button>
        {TYPES.map((type) => {
          const config = notificationTypeConfig(type);
          const count = counts.byType[type] ?? 0;
          return (
            <button
              key={type}
              onClick={() => setParam("type", type)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors border",
                activeType === type
                  ? "bg-gold-dim text-primary border-gold-border"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {config.label}
              {count > 0 && (
                <Badge variant="muted" className="ml-1.5 align-middle">
                  {count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setParam("unread", unreadOnly ? null : "1")}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors border",
            unreadOnly
              ? "bg-gold-dim text-primary border-gold-border"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          Unread only
        </button>
        <Button variant="outline" size="sm" onClick={onMarkAllRead} disabled={pending || counts.total === 0}>
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </Button>
      </div>
    </div>
  );
}
