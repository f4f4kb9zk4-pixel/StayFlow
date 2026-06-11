"use client";

import { useState, useTransition } from "react";

import { toggleVipInhouse } from "@/lib/actions/vip-guests";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/** "VIP inhouse" flag toggle for a VIP guest row (§3.2 item 6). */
export function VipInhouseCheckbox({ vipGuestId, vipInhouse }: { vipGuestId: string; vipInhouse: boolean }) {
  const [, startTransition] = useTransition();
  const [checked, setChecked] = useState(vipInhouse);

  function onCheckedChange(value: boolean | "indeterminate") {
    const next = value === true;
    setChecked(next);
    startTransition(() => {
      toggleVipInhouse(vipGuestId, next);
    });
  }

  return (
    <label className="flex items-center gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      <span className={cn("text-sm", checked ? "text-primary font-medium" : "text-muted-foreground")}>
        {checked ? "In-house" : "Not in-house"}
      </span>
    </label>
  );
}
