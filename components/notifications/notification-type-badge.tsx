import { AlertTriangle, ClipboardList, MessageSquare, Clock, Bell, Star } from "lucide-react";

import type { NotificationType } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<
  NotificationType,
  { label: string; icon: typeof Bell; variant: "danger" | "info" | "warning" | "muted" | "vip" }
> = {
  escalation: { label: "Escalation", icon: AlertTriangle, variant: "danger" },
  task: { label: "Task", icon: ClipboardList, variant: "info" },
  complaint: { label: "Complaint", icon: MessageSquare, variant: "warning" },
  followup: { label: "Follow-Up", icon: Clock, variant: "muted" },
  alert: { label: "Alert", icon: Bell, variant: "warning" },
  vip: { label: "VIP", icon: Star, variant: "vip" },
};

export function notificationTypeConfig(type: NotificationType) {
  return TYPE_CONFIG[type];
}

/** Type pill shown on each notification row (§1.7 Notifications Center). */
export function NotificationTypeBadge({ type }: { type: NotificationType }) {
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className={cn(type === "vip" && "font-semibold")}>
      <Icon className="h-3 w-3" aria-hidden />
      {config.label}
    </Badge>
  );
}
