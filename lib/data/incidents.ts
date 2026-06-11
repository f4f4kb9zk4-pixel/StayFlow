import { createClient } from "@/lib/supabase/server";
import type { Incident, IncidentEvent, IncidentCategory, IncidentStatus, Profile } from "@/types/domain";

export interface IncidentFilters {
  status?: IncidentStatus | "All";
  category?: IncidentCategory | "All";
  search?: string;
}

async function loadProfiles(supabase: Awaited<ReturnType<typeof createClient>>, ids: (string | null | undefined)[]) {
  const uniqueIds = Array.from(new Set(ids.filter((id): id is string => !!id)));
  if (uniqueIds.length === 0) return new Map<string, Profile>();

  const { data } = await supabase.from("profiles").select("id, full_name, avatar_color").in("id", uniqueIds);

  const map = new Map<string, Profile>();
  for (const row of data ?? []) {
    map.set(row.id, { id: row.id, fullName: row.full_name, avatarColor: row.avatar_color });
  }
  return map;
}

const PERIOD_NOTE_RE = /^Period of stay\s*:\s*(.+)$/im;
const NATIONALITY_NOTE_RE = /^Nationality\s*:\s*(.+)$/im;

/**
 * Older imported incidents (before `period_of_stay`/`nationality` columns
 * existed) only have this info embedded in `guest_notes` as
 * "Period of stay: ..." / "Nationality: ..." lines. Fall back to parsing
 * those so the report-export fields are pre-filled from the original import
 * even for incidents logged before the dedicated columns were added.
 */
function fallbackFromGuestNotes(guestNotes: string | null, re: RegExp): string | null {
  if (!guestNotes) return null;
  const m = re.exec(guestNotes);
  return m ? m[1].trim() : null;
}

function mapIncident(r: any, profiles: Map<string, Profile>): Incident {
  return {
    id: r.id,
    incidentNumber: r.incident_number,
    hotelId: r.hotel_id,
    category: r.category,
    title: r.title,
    room: r.room,
    department: r.department,
    priority: r.priority,
    status: r.status,
    assignedTo: r.assigned_to ? profiles.get(r.assigned_to) ?? null : null,
    reportedAt: r.reported_at,
    recoveryAction: r.recovery_action,
    resolution: r.resolution,
    guestName: r.guest_name,
    source: r.source,
    caseSubtype: r.case_subtype,
    details: r.details,
    cost: r.cost,
    currency: r.currency,
    loggedBy: r.logged_by,
    guestNotes: r.guest_notes,
    departmentRaw: r.department_raw,
    periodOfStay: r.period_of_stay ?? fallbackFromGuestNotes(r.guest_notes, PERIOD_NOTE_RE),
    nationality: r.nationality ?? fallbackFromGuestNotes(r.guest_notes, NATIONALITY_NOTE_RE),
    location: r.location,
  };
}

/**
 * Incident Tracker (§1.7, §3.2 item 9) — searchable list with status and
 * category filters across Security / Guest Complaint / Maintenance / F&B.
 */
export async function getIncidents(hotelId: string, filters: IncidentFilters = {}): Promise<Incident[]> {
  const supabase = await createClient();

  let query = supabase.from("incidents").select("*").eq("hotel_id", hotelId);

  if (filters.status && filters.status !== "All") {
    query = query.eq("status", filters.status);
  }

  if (filters.category && filters.category !== "All") {
    query = query.eq("category", filters.category);
  }

  if (filters.search) {
    const term = filters.search.trim();
    if (term) {
      query = query.or(
        `title.ilike.%${term}%,incident_number.ilike.%${term}%,room.ilike.%${term}%,guest_name.ilike.%${term}%`
      );
    }
  }

  query = query.order("priority", { ascending: false }).order("reported_at", { ascending: false });

  const { data } = await query;
  const rows = data ?? [];
  const profiles = await loadProfiles(supabase, rows.map((r) => r.assigned_to));

  return rows.map((r) => mapIncident(r, profiles));
}

export async function getIncident(hotelId: string, incidentId: string): Promise<Incident | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("incidents")
    .select("*")
    .eq("hotel_id", hotelId)
    .eq("id", incidentId)
    .maybeSingle();

  if (!data) return null;

  const profiles = await loadProfiles(supabase, [data.assigned_to]);
  return mapIncident(data, profiles);
}

/**
 * Incidents reported within `[from, to]` (inclusive, "YYYY-MM-DD"), evaluated
 * in the hotel's local timezone — used by the Guest Feedback Report export.
 */
export async function getIncidentsForReport(
  hotelId: string,
  from: string,
  to: string,
  timezone: string
): Promise<Incident[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("incidents")
    .select("*")
    .eq("hotel_id", hotelId)
    .order("reported_at", { ascending: true });

  const rows = data ?? [];
  const profiles = await loadProfiles(supabase, rows.map((r) => r.assigned_to));
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });

  return rows
    .map((r) => mapIncident(r, profiles))
    .filter((incident) => {
      const ymd = fmt.format(new Date(incident.reportedAt));
      return ymd >= from && ymd <= to;
    });
}

export async function getIncidentEvents(incidentId: string): Promise<IncidentEvent[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("incident_events")
    .select("*")
    .eq("incident_id", incidentId)
    .order("occurred_at", { ascending: false });

  const rows = data ?? [];
  const profiles = await loadProfiles(supabase, rows.map((r) => r.created_by));

  return rows.map((r) => ({
    id: r.id,
    incidentId: r.incident_id,
    occurredAt: r.occurred_at,
    message: r.message,
    createdBy: r.created_by ? profiles.get(r.created_by) ?? null : null,
  }));
}
