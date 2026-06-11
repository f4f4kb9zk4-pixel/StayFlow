"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { createArrival, type ActionState } from "@/lib/actions/arrivals";
import { VIP_TIERS } from "@/types/domain";
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

function todayDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

/** "Add Arrival" action (§3.2 item 7, Arrival & VIP Board). */
export function NewArrivalDialog({ date }: { date: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createArrival, initialState);

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state?.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Add Arrival
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add arrival</DialogTitle>
          <DialogDescription>
            Add an expected guest to the Arrival &amp; VIP Board.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="arrivalDate" value={date} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="guestName">Guest name</Label>
              <Input id="guestName" name="guestName" required placeholder="e.g. Mr. Tanaka" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nationality">Nationality</Label>
              <Input id="nationality" name="nationality" placeholder="e.g. Japan" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="room">Room</Label>
              <Input id="room" name="room" placeholder="e.g. 812" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eta">ETA</Label>
              <Input id="eta" name="eta" type="time" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vipTier">VIP tier</Label>
              <Select name="vipTier" required defaultValue="Standard">
                <SelectTrigger id="vipTier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIP_TIERS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flightNumber">Flight number</Label>
              <Input id="flightNumber" name="flightNumber" placeholder="e.g. TG620" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="transferType">Transfer</Label>
              <Input id="transferType" name="transferType" placeholder="e.g. Private, Shuttle" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="specialRequests">Special requests</Label>
            <Textarea
              id="specialRequests"
              name="specialRequests"
              rows={2}
              placeholder="e.g. Early check-in, airport flowers…"
            />
          </div>
          {state?.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add arrival"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
