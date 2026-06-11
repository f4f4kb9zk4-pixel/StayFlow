"use client";

import { useState, useTransition } from "react";

import { setFollowUpStatus } from "@/lib/actions/followups";
import { Checkbox } from "@/components/ui/checkbox";

interface FollowUpCheckboxProps {
  id: string;
  completed: boolean;
}

/** Marks a follow-up Pending/Completed (§3.2 item 5). */
export function FollowUpCheckbox({ id, completed }: FollowUpCheckboxProps) {
  const [checked, setChecked] = useState(completed);
  const [, startTransition] = useTransition();

  return (
    <Checkbox
      checked={checked}
      onCheckedChange={(value) => {
        const next = value === true;
        setChecked(next);
        startTransition(() => {
          setFollowUpStatus(id, next ? "Completed" : "Pending");
        });
      }}
    />
  );
}
