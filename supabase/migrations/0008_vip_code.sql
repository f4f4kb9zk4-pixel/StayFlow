-- ============================================================================
-- StayFlow — VIP Guest Tracking: store the raw Opera VIP code
-- ============================================================================
-- Adds `vip_guests.vip_code`, the raw VIP code from the PMS "VIP Guests INH"
-- report (e.g. "VIP1".."VIP7", "VIPL", "VIPR", "VVIP"). This is finer-grained
-- than the existing `vip_tier` (Standard/VIP/VVIP) and is shown as a small
-- color-coded badge on the VIP Guest Tracking list/detail so staff can see
-- at a glance which Opera VIP category a guest was imported under.
-- ============================================================================

alter table vip_guests
  add column if not exists vip_code text;
