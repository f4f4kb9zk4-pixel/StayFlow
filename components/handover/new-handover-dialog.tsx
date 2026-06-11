"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { createHandover, type ActionState } from "@/lib/actions/handover";
import { SHIFT_TYPES } from "@/types/domain";
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

interface NewHandoverDialogProps {
  staff: StaffMember[];
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

/** "Start New Handover" action (§1.7). */
export function NewHandoverDialog({ staff }: NewHandoverDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createHandover, initialState);

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state?.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Start New Handover
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start shift handover</DialogTitle>
          <DialogDescription>
            Summarize open items for the next shift. This closes any currently active handover.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="shift">Shift</Label>
              <Select name="shift" required defaultValue="Morning">
                <SelectTrigger id="shift">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shiftDate">Date</Label>
              <Input id="shiftDate" name="shiftDate" type="date" required defaultValue={todayDate()} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="toUserId">Handing over to</Label>
              <Select name="toUserId" defaultValue="unassigned">
                <SelectTrigger id="toUserId">
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

          <div className="space-y-1.5">
            <Label htmlFor="notes">General notes</Label>
            <Textarea id="notes" name="notes" rows={2} placeholder="Anything the next shift should know…" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="openCases">Open cases / incidents (one per line)</Label>
            <Textarea
              id="openCases"
              name="openCases"
              rows={2}
              placeholder={"GC-2204 · Mr. Tanaka — AC repair in progress\nIN-118 · Pool area slippery floor"}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="followups">Follow-ups (one per line: task | due time | department)</Label>
            <Textarea
              id="followups"
              name="followups"
              rows={2}
              placeholder={"Call Mr. Tanaka re: AC repair | 18:00 | Engineering\nConfirm late checkout for room 1204 | | Front Office"}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="departmentUpdates">Department updates (one per line: Department: update)</Label>
            <Textarea
              id="departmentUpdates"
              name="departmentUpdates"
              rows={2}
              placeholder={"Housekeeping: Floor 5 deep clean in progress\nF&B: Low on champagne, reorder placed"}
            />
          </div>

          {state?.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Starting…" : "Start handover"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
