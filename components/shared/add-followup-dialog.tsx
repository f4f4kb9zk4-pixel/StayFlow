"use client";

import { useActionState, useEffect, useState } from "react";
import { Bell } from "lucide-react";

import { createFollowUp, type ActionState } from "@/lib/actions/followups";
import { DEPARTMENTS, type Department } from "@/types/domain";
import type { StaffMember } from "@/lib/data/staff";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const initialState: ActionState = {};

interface AddFollowUpDialogProps {
  staff: StaffMember[];
  /** Optional link back to the record this follow-up was created from. */
  sourceTable?: string;
  sourceId?: string;
  defaultDepartment?: Department;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
  triggerSize?: "md" | "sm";
}

/**
 * Reusable "Add follow-up" action (§3.2 item 5) — surfaced inline from
 * Cases/Incidents/Tasks/Handover, in addition to the Dashboard.
 */
export function AddFollowUpDialog({
  staff,
  sourceTable,
  sourceId,
  defaultDepartment,
  triggerLabel = "Add follow-up",
  triggerVariant = "outline",
  triggerSize = "sm",
}: AddFollowUpDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createFollowUp, initialState);

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state?.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize}>
          <Bell className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add follow-up</DialogTitle>
          <DialogDescription>Create a reminder for this item.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {sourceTable && <input type="hidden" name="sourceTable" value={sourceTable} />}
          {sourceId && <input type="hidden" name="sourceId" value={sourceId} />}
          <div className="space-y-1.5">
            <Label htmlFor="description">What needs follow-up?</Label>
            <Textarea id="description" name="description" required rows={2} placeholder="e.g. Call guest to confirm late checkout" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dueAt">Due</Label>
              <Input id="dueAt" name="dueAt" type="datetime-local" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="department">Department</Label>
              <Select name="department" defaultValue={defaultDepartment ?? "none"}>
                <SelectTrigger id="department">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">General</SelectItem>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="assigneeId">Assignee</Label>
              <Select name="assigneeId" defaultValue="unassigned">
                <SelectTrigger id="assigneeId">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {staff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {state?.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add follow-up"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
