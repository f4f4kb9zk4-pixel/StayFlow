-- ============================================================================
-- StayFlow — LINE Notify integration
-- ============================================================================
-- Adds `hotels.line_notify_token`, a per-hotel LINE Notify access token used
-- to forward various app notifications (escalations, overdue follow-ups,
-- etc.) to a LINE group/chat. This is separate from the existing
-- `line_channel_access_token` (LINE Messaging API / Official Account
-- credential, currently unused) — LINE Notify is a single-token broadcast
-- to whichever chat the token was issued for, with no per-user binding.
-- ============================================================================

alter table hotels
  add column if not exists line_notify_token text;
