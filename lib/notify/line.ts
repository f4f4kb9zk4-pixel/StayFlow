/**
 * LINE Messaging API client (§ "Link LINE for notifications").
 *
 * LINE Notify was discontinued by LINE on 2025-03-31, so notifications are
 * sent via the LINE Messaging API instead, using each hotel's own LINE
 * Official Account:
 *
 *   - `hotels.line_channel_access_token` — long-lived channel access token,
 *     used to authorize push requests.
 *   - `hotels.line_target_id` — the group/room/user id to push to. This is
 *     captured automatically by `app/api/line/webhook/[hotelId]` the first
 *     time the OA is added to a group (or followed by a user) after the
 *     hotel saves its credentials in Settings.
 *
 * Each hotel can connect its own Official Account from Settings → Hotel
 * profile.
 */

const LINE_PUSH_API_URL = "https://api.line.me/v2/bot/message/push";

export interface SendLineMessageResult {
  ok: boolean;
  error?: string;
}

/**
 * Push a plain-text message to `targetId` via the LINE Messaging API using
 * the given channel access token.
 */
export async function sendLineMessage(
  channelAccessToken: string,
  targetId: string,
  message: string
): Promise<SendLineMessageResult> {
  if (!channelAccessToken.trim()) {
    return { ok: false, error: "No LINE channel access token configured." };
  }
  if (!targetId.trim()) {
    return {
      ok: false,
      error: "No LINE chat connected yet — add the StayFlow bot to a LINE group to finish setup.",
    };
  }

  try {
    const res = await fetch(LINE_PUSH_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: targetId,
        messages: [{ type: "text", text: message.slice(0, 5000) }],
      }),
    });

    if (res.ok) return { ok: true };

    if (res.status === 401) {
      return { ok: false, error: "LINE channel access token is invalid or has been revoked." };
    }

    let detail = "";
    try {
      const body = (await res.json()) as { message?: string };
      detail = body.message ?? "";
    } catch {
      // ignore — not all error responses are JSON
    }
    return { ok: false, error: detail || `LINE Messaging API request failed (HTTP ${res.status}).` };
  } catch {
    return { ok: false, error: "Could not reach LINE. Please try again." };
  }
}
