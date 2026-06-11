"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { createVipGuest, type ActionState } from "@/lib/actions/vip-guests";
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

/** "Add VIP guest" action (§3.2 item 6, Arrival & VIP Board). */
export function NewVipGuestDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createVipGuest, initialState);

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state?.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Add VIP guest
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add VIP guest</DialogTitle>
          <DialogDescription>
            Track a VIP/VVIP guest profile and stay so the team can prepare in advance.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="guestName">Guest name</Label>
              <Input id="guestName" name="guestName" required placeholder="e.g. Mr. & Mrs. Sato" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vipTier">VIP tier</Label>
              <Select name="vipTier" required defaultValue="VIP">
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
              <Label htmlFor="room">Room</Label>
              <Input id="room" name="room" placeholder="e.g. 1204" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stayStart">Stay start</Label>
              <Input id="stayStart" name="stayStart" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stayEnd">Stay end</Label>
              <Input id="stayEnd" name="stayEnd" type="date" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="preferences">Preferences</Label>
            <Textarea
              id="preferences"
              name="preferences"
              rows={2}
              placeholder="e.g. Late checkout, extra pillows, allergic to shellfish…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} placeholder="Anything else the team should know…" />
          </div>
          {state?.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add VIP guest"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
