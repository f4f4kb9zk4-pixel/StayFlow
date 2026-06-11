-- ============================================================================
-- Merge Guest Cases into Incidents — Step 1: extend incident_status enum
-- ============================================================================
-- Adds the two `case_status` values that aren't already part of
-- `incident_status` so that migrated guest_cases rows can keep their status.
--
-- IMPORTANT: Postgres does not allow a newly added enum value to be used
-- (e.g. cast to / compared against) within the same transaction that adds
-- it. Run this file FIRST as its own statement/run in the Supabase SQL
-- editor, let it complete, and only THEN run
-- 0005_merge_guest_cases_step2_data.sql.

alter type incident_status add value if not exists 'Pending';
alter type incident_status add value if not exists 'In Progress';
