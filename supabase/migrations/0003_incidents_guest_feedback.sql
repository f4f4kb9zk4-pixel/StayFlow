-- ============================================================================
-- StayFlow — Incidents: Guest Feedback Report import
-- Adds the extra fields carried by the Guest Feedback Report so the Incident
-- Tracker can be enriched via PDF import, mirroring the Arrivals PMS import
-- (0002_arrivals_pms_import.sql).
--
-- Status and Department Concerned values from the report ("close", "Pending",
-- "ENG", "S&M , FB", ...) don't map 1:1 onto the existing `incident_status`
-- and `department` enums, so they are intentionally NOT stored in the
-- `status` / `department` columns directly — the import action maps them to
-- the closest enum value instead, and the report's raw text is preserved
-- here for reference.
-- ============================================================================

alter table incidents
  add column if not exists guest_name text,
  add column if not exists source text,           -- e.g. "CHR.COM", "Exotic Voyage Co.,Ltd., (Head Office)"
  add column if not exists case_subtype text,
  add column if not exists details text,          -- guest complaint details (report "Details" column)
  add column if not exists cost numeric,
  add column if not exists currency text,         -- e.g. "THB"
  add column if not exists logged_by text,
  add column if not exists guest_notes text,      -- "Period of stay" / "Nationality" lines from the report
  add column if not exists department_raw text;   -- raw "Department Concerned" text, e.g. "S&M , FB"
