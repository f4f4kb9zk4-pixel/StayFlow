"use client";

import { useState, useTransition } from "react";

import { toggleRoomReady } from "@/lib/actions/arrivals";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/** "Room Ready" toggle for an arrival row (§1.7 Arrival & VIP Board). */
export function RoomReadyCheckbox({ arrivalId, roomReady }: { arrivalId: string; roomReady: boolean }) {
  const [, startTransition] = useTransition();
  const [checked, setChecked] = useState(roomReady);

  function onCheckedChange(value: boolean | "indeterminate") {
    const next = value === true;
    setChecked(next);
    startTransition(() => {
      toggleRoomReady(arrivalId, next);
    });
  }

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      <span className={cn("text-sm", checked ? "text-success" : "text-muted-foreground")}>
        {checked ? "Ready" : "Not ready"}
      </span>
    </label>
  );
}
