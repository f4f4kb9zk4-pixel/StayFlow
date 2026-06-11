-- ============================================================================
-- StayFlow — Arrivals & VIP: "VIP inhouse" / "VIP arrival" flags
-- ============================================================================
-- Adds two boolean flags that supplement the existing VIP Tier
-- (Standard/VIP/VVIP) system, plus a short auto-extracted notes summary for
-- arrivals imported from PMS reports:
--
--   - vip_guests.vip_inhouse : staff-set flag marking a VIP guest as
--                              currently in-house (separate from the
--                              stay_start/stay_end window), surfaced as a
--                              filter/badge on the VIP Guest Tracking list.
--   - arrivals.vip_arrival   : flag marking today's arrival as VIP-worthy
--                              attention — auto-set on PDF import when the
--                              PMS notes contain VIP-related keywords
--                              (VIP, VVIP, anniversary, allergy, wheelchair,
--                              etc.), and toggleable by staff.
--   - arrivals.notes_summary : short bulleted summary of important info
--                              auto-extracted from pms_notes on PDF import,
--                              shown on the arrival card/detail.
-- ============================================================================

alter table vip_guests
  add column if not exists vip_inhouse boolean not null default false;

alter table arrivals
  add column if not exists vip_arrival boolean not null default false,
  add column if not exists notes_summary text;
