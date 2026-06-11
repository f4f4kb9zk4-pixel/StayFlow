"use client";

import { useActionState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import type { VipGuest } from "@/types/domain";
import { VIP_TIERS, VIP_CODES } from "@/types/domain";
import { updateVipGuest, type ActionState } from "@/lib/actions/vip-guests";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { VipTierBadge } from "@/components/vip/vip-tier-badge";
import { nightsBetween } from "@/lib/utils";

interface VipGuestDetailSheetProps {
  vipGuest: VipGuest | null;
  /** search param key used to select this guest, e.g. "vip" */
  paramKey?: string;
}

const initialState: ActionState = {};

/**
 * VIP guest detail/edit drawer (§3.2 item 6) — tier, room, stay dates,
 * preferences and notes so the team can prepare ahead of arrival.
 */
export function VipGuestDetailSheet({ vipGuest, paramKey = "vip" }: VipGuestDetailSheetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const open = !!vipGuest;

  function close() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(paramKey);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent side="right" className="flex flex-col gap-4">
        {vipGuest && <VipGuestDetailBody vipGuest={vipGuest} />}
      </SheetContent>
    </Sheet>
  );
}

function VipGuestDetailBody({ vipGuest }: { vipGuest: VipGuest }) {
  const [state, formAction, pending] = useActionState(updateVipGuest, initialState);
  const nights = nightsBetween(vipGuest.stayStart, vipGuest.stayEnd);

  return (
    <>
      <SheetHeader>
        <SheetTitle>{vipGuest.guestName}</SheetTitle>
        <SheetDescription className="flex items-center gap-2">
          <VipTierBadge tier={vipGuest.vipTier} code={vipGuest.vipCode} />
          {vipGuest.room && <span>Room {vipGuest.room}</span>}
          {nights !== null && (
            <span>
              · {nights} night{nights === 1 ? "" : "s"}
            </span>
          )}
        </SheetDescription>
      </SheetHeader>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={vipGuest.id} />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="vipTier">VIP tier</Label>
            <Select name="vipTier" required defaultValue={vipGuest.vipTier}>
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
            <Label htmlFor="vipCode">VIP code</Label>
            <Select name="vipCode" defaultValue={vipGuest.vipCode ?? "none"}>
              <SelectTrigger id="vipCode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {VIP_CODES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="room">Room</Label>
            <Input id="room" name="room" defaultValue={vipGuest.room ?? ""} placeholder="e.g. 1204" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stayStart">Stay start</Label>
            <Input id="stayStart" name="stayStart" type="date" defaultValue={vipGuest.stayStart ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stayEnd">Stay end</Label>
            <Input id="stayEnd" name="stayEnd" type="date" defaultValue={vipGuest.stayEnd ?? ""} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="preferences">Preferences</Label>
          <Textarea
            id="preferences"
            name="preferences"
            rows={3}
            defaultValue={vipGuest.preferences ?? ""}
            placeholder="e.g. Late checkout, extra pillows, allergic to shellfish…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={vipGuest.notes ?? ""}
            placeholder="Anything else the team should know…"
          />
        </div>
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </>
  );
}
