"use client";

import { useState, useTransition } from "react";

import { toggleFollowup } from "@/lib/actions/handover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, formatDateTime } from "@/lib/utils";

interface FollowupItem {
  id: string;
  task: string;
  dueAt?: string | null;
  department?: string | null;
  completed: boolean;
}

interface FollowupChecklistProps {
  followups: FollowupItem[];
  timezone: string;
}

/** Checkbox list of handover follow-ups (§1.7) — toggling persists immediately. */
export function FollowupChecklist({ followups, timezone }: FollowupChecklistProps) {
  const [items, setItems] = useState(followups);
  const [, startTransition] = useTransition();

  function onToggle(id: string, completed: boolean) {
    setItems((current) => current.map((f) => (f.id === id ? { ...f, completed } : f)));
    startTransition(() => {
      toggleFollowup(id, completed);
    });
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No follow-ups for this shift.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-2">
          <Checkbox
            checked={item.completed}
            onCheckedChange={(checked) => onToggle(item.id, checked === true)}
            className="mt-0.5"
          />
          <div className="min-w-0">
            <p className={cn("text-sm", item.completed && "line-through text-muted-foreground")}>{item.task}</p>
            <p className="text-xs text-muted-foreground font-data">
              {item.department ?? "General"}
              {item.dueAt && ` · Due ${formatDateTime(item.dueAt, timezone)}`}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
