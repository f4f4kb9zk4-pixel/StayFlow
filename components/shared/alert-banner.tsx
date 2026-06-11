import * as React from "react";
import { AlertTriangle, Info, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const VARIANT_STYLES: Record<
  "danger" | "warning" | "info",
  { icon: LucideIcon; classes: string }
> = {
  danger: {
    icon: AlertTriangle,
    classes: "border-danger/40 bg-danger/10 text-danger",
  },
  warning: {
    icon: AlertTriangle,
    classes: "border-warning/40 bg-warning/10 text-warning",
  },
  info: {
    icon: Info,
    classes: "border-info/40 bg-info/10 text-info",
  },
};

interface AlertBannerProps {
  variant?: "danger" | "warning" | "info";
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Inline dashboard alert banner (§1.4) — used by the Operational Alerts
 * block on the Action Center (§0.1) for active escalations / urgent issues.
 */
export function AlertBanner({
  variant = "warning",
  title,
  description,
  action,
  className,
}: AlertBannerProps) {
  const { icon: Icon, classes } = VARIANT_STYLES[variant];
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3",
        classes,
        className
      )}
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
