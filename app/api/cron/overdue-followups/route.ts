import { NextRequest, NextResponse } from "next/server";

import { checkOverdueFollowUps } from "@/lib/notify/overdue-followups";

/**
 * Scheduled job (§ "overdue tasks" notifications) — flips "Pending"
 * follow-ups past their `due_at` to "Overdue", notifies in-app, and pushes
 * a LINE summary per hotel that has LINE connected.
 *
 * Trigger this on a schedule (e.g. every 15–30 minutes) via Vercel Cron or
 * any external scheduler hitting this URL. If `CRON_SECRET` is set, the
 * request must include `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await checkOverdueFollowUps();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("overdue-followups cron failed", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
