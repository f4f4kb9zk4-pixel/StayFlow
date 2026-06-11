-- ============================================================================
-- Merge Guest Cases into Incidents — Step 2: migrate data
-- ============================================================================
-- Run this AFTER 0004_merge_guest_cases_step1_enum.sql has completed
-- (separately, in its own run) so the new enum values are visible.
--
-- This migrates every `guest_cases` row into `incidents` (preserving the
-- original id so existing references keep working), migrates
-- `guest_case_events` into `incident_events`, remaps the legacy
-- 'Under Investigation' incident status to 'Pending', repoints
-- `handover_open_cases`, and updates `source_table` references in
-- `follow_ups` / `escalations` / `notifications` from 'guest_cases' to
-- 'incidents'.
--
-- The `guest_cases` and `guest_case_events` tables are intentionally left in
-- place (not dropped) for rollback safety. The app no longer reads from
-- them after this migration.

-- 2a. Migrate guest_cases -> incidents (id preserved).
insert into incidents (
  id, incident_number, hotel_id, category, title, room, department, priority, status,
  assigned_to, reported_at, recovery_action, resolution, guest_name
)
select
  gc.id,
  gc.case_number,
  gc.hotel_id,
  'Guest Complaint'::incident_category,
  gc.case_type,
  gc.room,
  gc.department,
  gc.priority,
  gc.status::text::incident_status,
  gc.assignee_id,
  gc.created_at,
  gc.recovery_action,
  gc.resolution,
  gc.guest_name
from guest_cases gc
where not exists (select 1 from incidents i where i.id = gc.id);

-- 2b. Migrate guest_case_events -> incident_events (id preserved).
insert into incident_events (id, incident_id, occurred_at, message, created_by)
select gce.id, gce.case_id, gce.occurred_at, gce.message, gce.created_by
from guest_case_events gce
where not exists (select 1 from incident_events ie where ie.id = gce.id);

-- 2c. The unified status list drops "Under Investigation" — fold any
-- existing incidents into "Pending".
update incidents set status = 'Pending' where status = 'Under Investigation';

-- 2d. Point handover_open_cases at the migrated incident rows.
update handover_open_cases
set incident_id = guest_case_id
where guest_case_id is not null and incident_id is null;

-- 2e. Repoint cross-cutting source_table references.
update follow_ups set source_table = 'incidents' where source_table = 'guest_cases';
update escalations set source_table = 'incidents' where source_table = 'guest_cases';
update notifications set source_table = 'incidents' where source_table = 'guest_cases';
