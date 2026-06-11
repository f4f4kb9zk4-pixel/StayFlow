-- ============================================================================
-- StayFlow — switch LINE notifications from LINE Notify to LINE Messaging API
-- ============================================================================
-- LINE Notify was discontinued by LINE on 2025-03-31, so the single-token
-- approach added in 0009 (`hotels.line_notify_token`) no longer works. This
-- replaces it with LINE Messaging API support, built on the
-- `hotels.line_channel_access_token` column that already existed (but was
-- unused) since 0001:
--
--   - line_channel_access_token: long-lived channel access token for the
--     hotel's LINE Official Account, used to push messages.
--   - line_channel_secret: channel secret, used to verify webhook
--     signatures from LINE for this hotel.
--   - line_target_id: the group/room/user id StayFlow pushes messages to.
--     Captured automatically via the LINE webhook when the OA is added to
--     a group (or followed by a user) — see app/api/line/webhook/[hotelId].
-- ============================================================================

alter table hotels
  add column if not exists line_channel_secret text,
  add column if not exists line_target_id text;

alter table hotels
  drop column if exists line_notify_token;
