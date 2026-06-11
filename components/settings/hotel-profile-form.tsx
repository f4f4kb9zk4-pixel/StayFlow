"use client";

import { useActionState } from "react";

import {
  updateHotelProfile,
  disconnectLineNotify,
  sendLineTestNotification,
  type ActionState,
  type LineTestState,
} from "@/lib/actions/settings";
import type { HotelSummary } from "@/lib/auth/use-current-user";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const initialState: ActionState = {};
const initialTestState: LineTestState = {};

interface HotelProfileFormProps {
  hotel: HotelSummary & {
    totalRooms: number;
    lineChannelAccessToken: string | null;
    lineTargetId: string | null;
  };
  readOnly: boolean;
}

/**
 * Hotel profile card (§1.7, §3.2 item 11) — name, locale, timezone, room
 * count, and the LINE Messaging API connection used for escalation,
 * overdue task, and other StayFlow alerts.
 */
export function HotelProfileForm({ hotel, readOnly }: HotelProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateHotelProfile, initialState);
  const [testState, testAction, testPending] = useActionState(
    async (_prev: LineTestState) => sendLineTestNotification(),
    initialTestState
  );
  const [disconnectState, disconnectAction, disconnectPending] = useActionState(
    async (_prev: ActionState) => disconnectLineNotify(),
    initialState
  );

  const tokenConnected = hotel.lineChannelAccessToken && !disconnectState?.success;
  const chatLinked = hotel.lineTargetId && !disconnectState?.success;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const webhookUrl = `${appUrl}/api/line/webhook/${hotel.id}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hotel profile</CardTitle>
        <CardDescription>Property identity, locale, and LINE connection.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Hotel name</Label>
              <Input id="name" name="name" defaultValue={hotel.name} required disabled={readOnly} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="totalRooms">Total rooms</Label>
              <Input
                id="totalRooms"
                name="totalRooms"
                type="number"
                min={0}
                defaultValue={hotel.totalRooms}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" name="timezone" defaultValue={hotel.timezone} disabled={readOnly} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="locale">Locale</Label>
              <Input id="locale" name="locale" defaultValue={hotel.locale} disabled={readOnly} />
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <div>
              <p className="text-sm font-medium">LINE notifications</p>
              <p className="text-xs text-muted-foreground">
                StayFlow forwards escalations, overdue tasks, and other alerts to a LINE
                group/chat via your hotel&apos;s LINE Official Account (LINE Notify was
                discontinued in 2025).
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lineChannelAccessToken">Channel access token</Label>
                <Input
                  id="lineChannelAccessToken"
                  name="lineChannelAccessToken"
                  type="password"
                  placeholder={tokenConnected ? "•••••••••••••••• (saved)" : "Not set"}
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lineChannelSecret">Channel secret</Label>
                <Input
                  id="lineChannelSecret"
                  name="lineChannelSecret"
                  type="password"
                  placeholder={tokenConnected ? "•••••••••••••••• (saved)" : "Not set"}
                  disabled={readOnly}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Get these from the{" "}
              <span className="font-data">LINE Developers</span> console for your hotel&apos;s
              Messaging API channel, then save. After saving, set this channel&apos;s webhook URL
              to:
            </p>
            <Input readOnly value={webhookUrl} className="font-data text-xs" onFocus={(e) => e.target.select()} />
            <p className="text-xs text-muted-foreground">
              Then add the StayFlow Official Account to the LINE group/chat that should receive
              alerts — StayFlow links to it automatically the first time it joins.
            </p>
            <p className="text-sm">
              {chatLinked ? (
                <span className="text-success">✓ Connected to a LINE chat</span>
              ) : tokenConnected ? (
                <span className="text-warning">
                  Credentials saved — waiting for the bot to be added to a LINE chat.
                </span>
              ) : (
                <span className="text-muted-foreground">Not connected.</span>
              )}
            </p>
          </div>

          {state?.error && <p className="text-sm text-danger">{state.error}</p>}
          {state?.success && <p className="text-sm text-success">Saved.</p>}
          {!readOnly && (
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          )}
        </form>

        {!readOnly && (
          <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center gap-3">
            <form action={testAction}>
              <Button type="submit" variant="outline" size="sm" disabled={testPending || !chatLinked}>
                {testPending ? "Sending…" : "Send test message"}
              </Button>
            </form>
            {tokenConnected && (
              <form action={disconnectAction}>
                <Button type="submit" variant="ghost" size="sm" disabled={disconnectPending}>
                  {disconnectPending ? "Disconnecting…" : "Disconnect LINE"}
                </Button>
              </form>
            )}
            {testState?.error && <p className="text-sm text-danger">{testState.error}</p>}
            {testState?.message && <p className="text-sm text-success">{testState.message}</p>}
            {disconnectState?.error && <p className="text-sm text-danger">{disconnectState.error}</p>}
            {disconnectState?.success && <p className="text-sm text-success">Disconnected.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
