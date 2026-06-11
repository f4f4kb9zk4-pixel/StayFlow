import { Badge, type BadgeProps } from "@/components/ui/badge";

/**
 * Generic status badge — maps any module's status string to a badge
 * variant. Extend STATUS_VARIANTS as new statuses are introduced.
 */
const STATUS_VARIANTS: Record<string, BadgeProps["variant"]> = {
  // Guest Cases / Incidents
  Pending: "muted",
  "In Progress": "info",
  Escalated: "danger",
  Resolved: "success",
  Closed: "muted",
  "Under Investigation": "warning",

  // Task Board
  New: "muted",
  Assigned: "info",
  Waiting: "warning",
  Completed: "success",

  // Shift Handover
  Active: "info",

  // Arrivals
  Confirmed: "muted",
  "En Route": "info",
  "Flight Delayed": "warning",
  Arrived: "success",

  // Follow-ups / escalations
  Overdue: "danger",
  Open: "danger",
  Acknowledged: "warning",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANTS[status] ?? "muted"}>{status}</Badge>;
}
