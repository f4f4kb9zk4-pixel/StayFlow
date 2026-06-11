import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Per-hotel LINE Messaging API webhook (§ "Link LINE for notifications").
 *
 * Each hotel's LINE Official Account is configured (in the LINE Developers
 * console) to send webhook events to
 * `https://<app>/api/line/webhook/<hotelId>`. We use this purely to learn
 * which group/room/user to push notifications to:
 *
 *   - "join" (OA added to a group/room) or "follow" (1:1 chat started) →
 *     save the source id as `hotels.line_target_id`.
 *   - "leave" / "unfollow" → clear `line_target_id` if it matches, so a
 *     removed bot doesn't keep "succeeding" silently.
 *
 * Requests are verified against `hotels.line_channel_secret` using LINE's
 * HMAC-SHA256 `x-line-signature` scheme before anything is read from the
 * payload.
 */

interface LineEventSource {
  type: "user" | "group" | "room";
  userId?: string;
  groupId?: string;
  roomId?: string;
}

interface LineEvent {
  type: string;
  source?: LineEventSource;
}

interface LineWebhookPayload {
  events?: LineEvent[];
}

function sourceTargetId(source?: LineEventSource): string | null {
  if (!source) return null;
  return source.groupId ?? source.roomId ?? source.userId ?? null;
}

function verifySignature(body: string, secret: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest("base64");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

export async function POST(req: NextRequest, context: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = await context.params;
  const body = await req.text();
  const signature = req.headers.get("x-line-signature");

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const { data: hotel } = await admin
    .from("hotels")
    .select("line_channel_secret, line_target_id")
    .eq("id", hotelId)
    .maybeSingle();

  if (!hotel?.line_channel_secret || !verifySignature(body, hotel.line_channel_secret, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  let payload: LineWebhookPayload;
  try {
    payload = JSON.parse(body) as LineWebhookPayload;
  } catch {
    return NextResponse.json({ ok: true });
  }

  for (const event of payload.events ?? []) {
    const targetId = sourceTargetId(event.source);
    if (!targetId) continue;

    if (event.type === "join" || event.type === "follow") {
      await admin.from("hotels").update({ line_target_id: targetId }).eq("id", hotelId);
    } else if (event.type === "leave" || event.type === "unfollow") {
      if (hotel.line_target_id === targetId) {
        await admin.from("hotels").update({ line_target_id: null }).eq("id", hotelId);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
