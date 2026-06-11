"use client";

import { useState, useTransition } from "react";

import type { ArrivalStatus } from "@/types/domain";
import { ARRIVAL_STATUSES } from "@/types/domain";
import { updateArrivalStatus } from "@/lib/actions/arrivals";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Inline status control for an arrival row (§1.7 Arrival & VIP Board). */
export function ArrivalStatusSelect({ arrivalId, status }: { arrivalId: string; status: ArrivalStatus }) {
  const [, startTransition] = useTransition();
  const [value, setValue] = useState<ArrivalStatus>(status);

  function onChange(next: string) {
    const nextStatus = next as ArrivalStatus;
    setValue(nextStatus);
    startTransition(() => {
      updateArrivalStatus(arrivalId, nextStatus);
    });
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[140px] text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ARRIVAL_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
