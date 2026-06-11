import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const VARIANT_CLASSES = {
  default: "",
  gold: "border-gold-border",
  success: "border-success/40",
  warning: "border-warning/40",
  danger: "border-danger/40",
};

const ICON_VARIANT_CLASSES = {
  default: "bg-muted text-foreground",
  gold: "bg-gold-dim text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
};

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  variant?: keyof typeof VARIANT_CLASSES;
  className?: string;
}

/**
 * KPI tile (§1.4). Reserved for the optional future "Insights" tab and for
 * compact stat rows (e.g. Arrivals & VIP Board stat tiles, §1.7) — the
 * Dashboard Action Center itself (§0.1) does not use a KPI grid in v1.
 */
export function StatCard({ label, value, sub, icon: Icon, variant = "default", className }: StatCardProps) {
  return (
    <Card className={cn("p-4 flex items-center justify-between", VARIANT_CLASSES[variant], className)}>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold mt-1 font-data">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
      {Icon && (
        <div className={cn("rounded-md p-2", ICON_VARIANT_CLASSES[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      )}
    </Card>
  );
}
