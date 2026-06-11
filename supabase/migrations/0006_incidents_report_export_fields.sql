-- ============================================================================
-- StayFlow — Incidents: Guest Feedback Report export fields
-- ============================================================================
-- Adds the remaining Guest Feedback Report columns that aren't yet captured
-- when a case is logged directly in StayFlow (0003 added guest_name, source,
-- case_subtype, details, cost, currency, logged_by, guest_notes,
-- department_raw from PDF import). These three let a case logged manually in
-- StayFlow be exported as a report row identical to an imported one:
--
--   - period_of_stay : e.g. "10 Jun - 12 Jun 2026" (report "Period of stay" line)
--   - nationality     : e.g. "Thai" (report "Nationality" line)
--   - location        : finer-grained location within the hotel, e.g.
--                        "Lobby", "Pool deck" — distinct from `room`.
--
-- Existing rows imported via 0003/PDF import keep period_of_stay/nationality
-- folded into `guest_notes` as free text; new imports and manually-logged
-- cases populate these columns directly going forward.
-- ============================================================================

alter table incidents
  add column if not exists period_of_stay text,
  add column if not exists nationality text,
  add column if not exists location text;
