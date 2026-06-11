"use client";

import { useState, useTransition } from "react";

import { toggleVipArrival } from "@/lib/actions/arrivals";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/** "VIP arrival" flag toggle for an arrival row (§1.7 Arrival & VIP Board). */
export function VipArrivalCheckbox({ arrivalId, vipArrival }: { arrivalId: string; vipArrival: boolean }) {
  const [, startTransition] = useTransition();
  const [checked, setChecked] = useState(vipArrival);

  function onCheckedChange(value: boolean | "indeterminate") {
    const next = value === true;
    setChecked(next);
    startTransition(() => {
      toggleVipArrival(arrivalId, next);
    });
  }

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      <span className={cn("text-sm", checked ? "text-primary font-medium" : "text-muted-foreground")}>
        {checked ? "VIP arrival" : "Mark VIP"}
      </span>
    </label>
  );
}
