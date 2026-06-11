"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { createIncident, type ActionState } from "@/lib/actions/incidents";
import { DEPARTMENTS, INCIDENT_CATEGORIES, PRIORITY_LEVELS } from "@/types/domain";
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

/** "Log Incident" action (§1.7, §3.2 item 9). */
export function NewIncidentDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createIncident, initialState);

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state?.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Log Incident
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Log incident / case</DialogTitle>
          <DialogDescription>
            Record a security, guest complaint, maintenance, or F&amp;B incident for tracking and follow-up.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-3">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required placeholder="e.g. Pool gate left unlocked overnight, Noise complaint" />
            </div>
            <div className="space-y-1.5 col-span-3">
              <Label htmlFor="guestName">Guest name (optional)</Label>
              <Input id="guestName" name="guestName" placeholder="e.g. Mr. Somchai" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="periodOfStay">Period of stay (optional)</Label>
              <Input id="periodOfStay" name="periodOfStay" placeholder="e.g. 10 Jun - 12 Jun 2026" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nationality">Nationality (optional)</Label>
              <Input id="nationality" name="nationality" placeholder="e.g. Thai" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location (optional)</Label>
              <Input id="location" name="location" placeholder="e.g. Lobby, Pool deck" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Select name="category" required defaultValue="Guest Complaint">
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INCIDENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="room">Room</Label>
              <Input id="room" name="room" placeholder="e.g. Pool deck" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="department">Department</Label>
              <Select name="department" defaultValue="none">
                <SelectTrigger id="department">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priority">Priority</Label>
              <Select name="priority" required defaultValue="medium">
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_LEVELS.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="source">Source (optional)</Label>
              <Input id="source" name="source" placeholder="e.g. Booking.com, Walk-in" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="caseSubtype">Case subtype (optional)</Label>
              <Input id="caseSubtype" name="caseSubtype" placeholder="e.g. Cleanliness" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loggedBy">Logged by (optional)</Label>
              <Input id="loggedBy" name="loggedBy" placeholder="e.g. Front Office" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cost">Cost (optional)</Label>
              <Input id="cost" name="cost" inputMode="decimal" placeholder="e.g. 500" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency (optional)</Label>
              <Input id="currency" name="currency" placeholder="e.g. THB" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="departmentRaw">Dept. concerned (optional)</Label>
              <Input id="departmentRaw" name="departmentRaw" placeholder="e.g. S&M, FB" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reportedDate">Reported date (optional)</Label>
              <Input id="reportedDate" name="reportedDate" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reportedTime">Reported time (optional)</Label>
              <Input id="reportedTime" name="reportedTime" type="time" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="details">Details (optional)</Label>
            <Textarea id="details" name="details" rows={2} placeholder="Full description of the case" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Initial notes</Label>
            <Textarea id="notes" name="notes" rows={2} placeholder="What happened?" />
          </div>
          {state?.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Logging…" : "Log incident"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
