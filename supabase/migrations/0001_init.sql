-- ============================================================================
-- StayFlow — Initial schema migration
-- Hotel Operations OS — multi-tenant, white-label, mobile-first
-- See StayFlow-Architecture-Plan.md §2.4 / §2.5 for design rationale.
-- ============================================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ============================================================================
-- TENANCY & IDENTITY
-- ============================================================================

create table organizations (              -- parent brand (for groups w/ multiple hotels)
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table hotels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  slug text unique not null,
  timezone text not null default 'Asia/Bangkok',
  locale text not null default 'th-TH',     -- 'th-TH' | 'en-US' (UI language default)
  total_rooms int not null default 0,
  line_channel_access_token text,           -- LINE Messaging API (Official Account) credential
  created_at timestamptz default now()
);

create table hotel_branding (             -- white-label theme — see §2.7 Theme System
  hotel_id uuid primary key references hotels(id) on delete cascade,

  -- Identity
  product_name text default 'StayFlow',
  tagline text default 'One flow. Every dept.',
  logo_url text,                          -- light-mode logo
  logo_dark_url text,                     -- optional dark-mode variant
  favicon_url text,
  dashboard_welcome_image_url text,       -- hero image on dashboard / login

  -- Color tokens (map 1:1 onto existing CSS variables)
  primary_color text default '#D4AF37',
  secondary_color text default '#334155',
  accent_color text default '#D4AF37',
  background_color text default '#0F172A',
  surface_color text default '#1E293B',   -- maps to --card
  sidebar_color text default '#0B1120',

  -- Typography
  font_family_sans text default 'Inter',
  font_family_mono text default 'JetBrains Mono',

  -- Shape & iconography
  border_radius text default '0.5rem',    -- maps to --radius (e.g. '0.25rem' sharp, '1rem' soft)
  icon_style text default 'lucide-default' check (icon_style in ('lucide-default','rounded','sharp')),

  -- Background style
  background_style text default 'solid' check (background_style in ('solid','subtle-gradient','pattern')),

  -- Mode support
  default_theme_mode text default 'dark' check (default_theme_mode in ('dark','light')),
  allow_user_mode_toggle boolean not null default true,

  updated_at timestamptz default now()
);

create type user_role as enum (
  'super_admin',     -- cross-hotel / org level
  'general_manager',
  'duty_manager',
  'front_office',
  'housekeeping',
  'engineering',
  'fnb',
  'security',
  'concierge',
  'staff'
);

create table profiles (                   -- extends auth.users
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  avatar_color text,
  default_hotel_id uuid references hotels(id),
  line_user_id text,                      -- bound via LINE Login during onboarding
  line_notifications_enabled boolean not null default true,
  preferred_locale text default 'th-TH',
  created_at timestamptz default now()
);

create table user_hotel_roles (           -- many-to-many: user x hotel x role
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  hotel_id uuid references hotels(id) on delete cascade,
  role user_role not null,
  department text,                        -- Front Office, Housekeeping, Engineering, F&B, Security, Concierge
  unique (user_id, hotel_id)
);

-- ============================================================================
-- SHARED ENUMS
-- ============================================================================

create type priority_level as enum ('low','medium','high','critical');
create type department as enum ('Front Office','Housekeeping','Engineering','F&B','Security','Concierge','Finance');
create type vip_tier as enum ('Standard','VIP','VVIP');

-- ============================================================================
-- CROSS-CUTTING: VIP TRACKING
-- VIP status follows the GUEST across their whole stay, not just arrival day —
-- referenced from arrivals, guest_cases, incidents, and tasks.
-- ============================================================================

create table vip_guests (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id),
  guest_name text not null,
  vip_tier vip_tier not null default 'VIP',
  room text,
  stay_start date,
  stay_end date,
  preferences text,           -- e.g. "High floor preference, Japanese newspapers"
  notes text,
  created_at timestamptz default now()
);

-- ============================================================================
-- CROSS-CUTTING: FOLLOW-UP REMINDERS
-- A first-class entity. Any module can spawn a follow-up via source_table/source_id.
-- ============================================================================

create type followup_status as enum ('Pending','Completed','Overdue');

create table follow_ups (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id),
  description text not null,
  department department,
  due_at timestamptz,
  status followup_status not null default 'Pending',
  assignee_id uuid references profiles(id),
  created_by uuid references profiles(id),
  source_table text,          -- 'guest_cases' | 'incidents' | 'tasks' | 'shift_handovers' | 'arrivals'
  source_id uuid,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- ============================================================================
-- CROSS-CUTTING: ESCALATIONS
-- Escalation is a workflow event, not just a status value — tracks who escalated,
-- to whom, and whether it's been acknowledged/resolved (feeds the dashboard's
-- Operational Alerts panel and Notifications).
-- ============================================================================

create type escalation_status as enum ('Open','Acknowledged','Resolved');

create table escalations (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id),
  source_table text not null,        -- 'guest_cases' | 'incidents' | 'tasks'
  source_id uuid not null,
  escalated_by uuid references profiles(id),
  escalated_to_role user_role,       -- e.g. 'general_manager'
  escalated_to_user uuid references profiles(id),
  reason text,
  status escalation_status not null default 'Open',
  escalated_at timestamptz default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);

-- ============================================================================
-- GUEST CASES
-- ============================================================================

create type case_status as enum ('Pending','In Progress','Escalated','Resolved','Closed');

create table guest_cases (
  id uuid primary key default gen_random_uuid(),
  case_number text not null,              -- e.g. GC-2241 (generated, per-hotel sequence)
  hotel_id uuid not null references hotels(id),
  room text,
  guest_name text not null,
  case_type text not null,                -- "F&B Delay", "Access Card", "VIP Setup"...
  department department not null,
  priority priority_level not null default 'medium',
  status case_status not null default 'Pending',
  assignee_id uuid references profiles(id),
  resolution text,
  recovery_action text,                   -- compensation/recovery gesture
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (hotel_id, case_number)
);

create table guest_case_events (          -- timeline entries
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references guest_cases(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  message text not null,
  created_by uuid references profiles(id)
);

-- ============================================================================
-- TASK BOARD
-- ============================================================================

create type task_column as enum ('New','Assigned','In Progress','Waiting','Completed');

create table tasks (
  id uuid primary key default gen_random_uuid(),
  task_number text not null,              -- e.g. T-412
  hotel_id uuid not null references hotels(id),
  title text not null,
  room text,
  department department not null,
  priority priority_level not null default 'medium',
  column_status task_column not null default 'New',
  assignee_id uuid references profiles(id),
  due_at timestamptz,
  position int not null default 0,        -- for drag/drop ordering within column
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (hotel_id, task_number)
);

create table task_tags (
  task_id uuid references tasks(id) on delete cascade,
  tag text not null,                      -- Urgent, Overdue, VIP, Blocked, Evening, Aesthetic, Maintenance...
  primary key (task_id, tag)
);

-- ============================================================================
-- SHIFT HANDOVER
-- ============================================================================

create type shift_type as enum ('Morning','Afternoon','Evening','Night');
create type handover_status as enum ('Active','Closed');

create table shift_handovers (
  id uuid primary key default gen_random_uuid(),
  handover_number text not null,          -- HO-088
  hotel_id uuid not null references hotels(id),
  shift shift_type not null,
  shift_date date not null,
  from_user_id uuid references profiles(id),
  to_user_id uuid references profiles(id),
  handover_time time not null,
  notes text,
  status handover_status not null default 'Active',
  created_at timestamptz default now(),
  unique (hotel_id, handover_number)
);

-- ============================================================================
-- INCIDENT TRACKER
-- (created before handover_open_cases so it can be referenced)
-- ============================================================================

create type incident_category as enum ('Security','Guest Complaint','Maintenance','F&B');
create type incident_status as enum ('Under Investigation','Escalated','Resolved','Closed');

create table incidents (
  id uuid primary key default gen_random_uuid(),
  incident_number text not null,          -- INC-085
  hotel_id uuid not null references hotels(id),
  category incident_category not null,
  title text not null,
  room text,
  department department,
  priority priority_level not null default 'medium',
  status incident_status not null default 'Under Investigation',
  assigned_to uuid references profiles(id),
  reported_at timestamptz not null default now(),
  recovery_action text,
  resolution text,
  unique (hotel_id, incident_number)
);

create table incident_events (            -- timeline
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references incidents(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  message text not null,
  created_by uuid references profiles(id)
);

-- ============================================================================
-- SHIFT HANDOVER — child tables (after guest_cases / incidents exist)
-- ============================================================================

create table handover_open_cases (        -- references guest_cases or incidents at time of handover
  id uuid primary key default gen_random_uuid(),
  handover_id uuid references shift_handovers(id) on delete cascade,
  reference_label text not null,          -- "GC-2241 — Noise complaint Room 812 (Escalated)"
  guest_case_id uuid references guest_cases(id),
  incident_id uuid references incidents(id)
);

create table handover_followups (
  id uuid primary key default gen_random_uuid(),
  handover_id uuid references shift_handovers(id) on delete cascade,
  task text not null,
  due_at time,
  department department,
  completed boolean default false
);

create table handover_department_updates (
  id uuid primary key default gen_random_uuid(),
  handover_id uuid references shift_handovers(id) on delete cascade,
  department department not null,
  update_text text not null
);

-- ============================================================================
-- ARRIVALS & VIP BOARD
-- (vip_tier enum is defined once, above, under SHARED ENUMS)
-- ============================================================================

create type arrival_status as enum ('Confirmed','En Route','Flight Delayed','Arrived');

create table arrivals (
  id uuid primary key default gen_random_uuid(),
  arrival_number text not null,           -- ARR-446
  hotel_id uuid not null references hotels(id),
  guest_name text not null,
  nationality text,
  room text,
  eta time,
  flight_number text,
  transfer_type text,                     -- "Private", "Shuttle"...
  vip_tier vip_tier not null default 'Standard',
  vip_guest_id uuid references vip_guests(id),
  room_ready boolean not null default false,
  special_requests text,
  status arrival_status not null default 'Confirmed',
  arrival_date date not null default current_date,
  created_at timestamptz default now(),
  unique (hotel_id, arrival_number)
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

create type notification_type as enum ('escalation','task','complaint','followup','alert','vip');

create table notifications (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id),
  recipient_id uuid references profiles(id),  -- null = broadcast to hotel/role
  recipient_role user_role,
  type notification_type not null,
  title text not null,
  body text,
  department department,
  priority priority_level,
  source_table text,                      -- 'guest_cases' | 'tasks' | 'incidents' | ...
  source_id uuid,
  read boolean not null default false,
  line_delivery_status text,              -- null | 'sent' | 'failed' | 'skipped' (no LINE bound)
  created_at timestamptz default now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index on guest_cases (hotel_id, status);
create index on tasks (hotel_id, column_status);
create index on incidents (hotel_id, status);
create index on arrivals (hotel_id, arrival_date);
create index on notifications (hotel_id, recipient_id, read);
create index on follow_ups (hotel_id, status, due_at);
create index on escalations (hotel_id, status);
create index on vip_guests (hotel_id, vip_tier);
create index on user_hotel_roles (user_id, hotel_id);

-- ============================================================================
-- ROW-LEVEL SECURITY (§2.5)
-- ============================================================================

create or replace function current_user_hotel_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select hotel_id from user_hotel_roles where user_id = auth.uid();
$$;

create or replace function current_user_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_hotel_roles
    where user_id = auth.uid() and role = 'super_admin'
  );
$$;

-- Enable RLS on every tenant-scoped table
alter table hotels enable row level security;
alter table hotel_branding enable row level security;
alter table profiles enable row level security;
alter table user_hotel_roles enable row level security;
alter table vip_guests enable row level security;
alter table follow_ups enable row level security;
alter table escalations enable row level security;
alter table guest_cases enable row level security;
alter table guest_case_events enable row level security;
alter table tasks enable row level security;
alter table task_tags enable row level security;
alter table shift_handovers enable row level security;
alter table handover_open_cases enable row level security;
alter table handover_followups enable row level security;
alter table handover_department_updates enable row level security;
alter table arrivals enable row level security;
alter table incidents enable row level security;
alter table incident_events enable row level security;
alter table notifications enable row level security;

-- Tenant isolation: read access scoped to the user's hotels (or super_admin = all)
create policy "tenant_isolation_select" on hotels
  for select using (id = any (select current_user_hotel_ids()) or current_user_is_super_admin());

create policy "tenant_isolation_select" on hotel_branding
  for select using (hotel_id = any (select current_user_hotel_ids()) or current_user_is_super_admin());

create policy "tenant_isolation_all" on vip_guests
  for all using (hotel_id = any (select current_user_hotel_ids()) or current_user_is_super_admin());

create policy "tenant_isolation_all" on follow_ups
  for all using (hotel_id = any (select current_user_hotel_ids()) or current_user_is_super_admin());

create policy "tenant_isolation_all" on escalations
  for all using (hotel_id = any (select current_user_hotel_ids()) or current_user_is_super_admin());

create policy "tenant_isolation_all" on guest_cases
  for all using (hotel_id = any (select current_user_hotel_ids()) or current_user_is_super_admin());

create policy "tenant_isolation_all" on tasks
  for all using (hotel_id = any (select current_user_hotel_ids()) or current_user_is_super_admin());

create policy "tenant_isolation_all" on shift_handovers
  for all using (hotel_id = any (select current_user_hotel_ids()) or current_user_is_super_admin());

create policy "tenant_isolation_all" on arrivals
  for all using (hotel_id = any (select current_user_hotel_ids()) or current_user_is_super_admin());

create policy "tenant_isolation_all" on incidents
  for all using (hotel_id = any (select current_user_hotel_ids()) or current_user_is_super_admin());

create policy "tenant_isolation_all" on notifications
  for all using (
    hotel_id = any (select current_user_hotel_ids()) or current_user_is_super_admin()
  );

-- Child tables: scoped via parent join
create policy "tenant_isolation_via_case" on guest_case_events
  for all using (
    exists (select 1 from guest_cases gc where gc.id = case_id
      and (gc.hotel_id = any (select current_user_hotel_ids()) or current_user_is_super_admin()))
  );

create policy "tenant_isolation_via_incident" on incident_events
  for all using (
    exists (select 1 from incidents i where i.id = incident_id
      and (i.hotel_id = any (select current_user_hotel_ids()) or current_user_is_super_admin()))
  );

create policy "tenant_isolation_via_task" on task_tags
  for all using (
    exists (select 1 from tasks t where t.id = task_id
      and (t.hotel_id = any (select current_user_hotel_ids()) or current_user_is_super_admin()))
  );

create policy "tenant_isolation_via_handover" on handover_open_cases
  for all using (
    exists (select 1 from shift_handovers h where h.id = handover_id
      and (h.hotel_id = any (select current_user_hotel_ids()) or current_user_is_super_admin()))
  );

create policy "tenant_isolation_via_handover" on handover_followups
  for all using (
    exists (select 1 from shift_handovers h where h.id = handover_id
      and (h.hotel_id = any (select current_user_hotel_ids()) or current_user_is_super_admin()))
  );

create policy "tenant_isolation_via_handover" on handover_department_updates
  for all using (
    exists (select 1 from shift_handovers h where h.id = handover_id
      and (h.hotel_id = any (select current_user_hotel_ids()) or current_user_is_super_admin()))
  );

-- Profiles & roles: users can read their own profile + roles; admins can read all within their hotels
create policy "self_or_admin_select" on profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1 from user_hotel_roles uhr
      where uhr.user_id = profiles.id
        and uhr.hotel_id = any (select current_user_hotel_ids())
    )
    or current_user_is_super_admin()
  );

create policy "self_update" on profiles
  for update using (id = auth.uid());

create policy "tenant_isolation_select" on user_hotel_roles
  for select using (
    user_id = auth.uid()
    or hotel_id = any (select current_user_hotel_ids())
    or current_user_is_super_admin()
  );

-- NOTE: write policies for role/department-scoped permissions (e.g. only
-- housekeeping + managers can update housekeeping tasks; only duty_manager /
-- general_manager can resolve escalated incidents) are intentionally left as
-- a follow-up once §2.6's role matrix is confirmed. The policies above
-- establish baseline tenant isolation only.
