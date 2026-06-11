import { Badge } from "@/components/ui/badge";
import type { PriorityLevel } from "@/types/domain";
import { cn } from "@/lib/utils";

const PRIORITY_CONFIG: Record<
  PriorityLevel,
  { label: string; variant: "danger" | "warning" | "info" | "muted" }
> = {
  critical: { label: "Critical", variant: "danger" },
  high: { label: "High", variant: "warning" },
  medium: { label: "Medium", variant: "info" },
  low: { label: "Low", variant: "muted" },
};

/**
 * Priority pill — "●" prefix for critical per §1.4.
 */
export function PriorityBadge({ priority }: { priority: PriorityLevel }) {
  const config = PRIORITY_CONFIG[priority];
  return (
    <Badge variant={config.variant} className={cn(priority === "critical" && "font-semibold")}>
      {priority === "critical" && <span aria-hidden>●</span>}
      {config.label}
    </Badge>
  );
}
