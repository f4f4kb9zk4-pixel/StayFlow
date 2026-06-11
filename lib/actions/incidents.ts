"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/use-current-user";
import { notifyHotel } from "@/lib/notify/notify";
import { getIncident, getIncidentsForReport } from "@/lib/data/incidents";
import { fromDatetimeLocalValue } from "@/lib/utils";
import { parseGuestFeedbackPdf } from "@/lib/pms/guest-feedback-pdf-parser";
import {
  buildGuestFeedbackReportPdf,
  incidentToReportRow,
  formatReportDate,
  formatYmdLabel,
} from "@/lib/pms/guest-feedback-pdf-builder";
import type { Department, IncidentCategory, IncidentStatus, PriorityLevel } from "@/types/domain";

export interface ActionState {
  error?: string;
  success?: boolean;
}

export interface ImportGuestFeedbackState extends ActionState {
  imported?: number;
  updated?: number;
  warnings?: string[];
}

/** Generates the next per-hotel incident number, e.g. INC-085. */
async function nextIncidentNumber(supabase: Awaited<ReturnType<typeof createClient>>, hotelId: string) {
  const { count } = await supabase
    .from("incidents")
    .select("id", { count: "exact", head: true })
    .eq("hotel_id", hotelId);

  return `INC-${80 + (count ?? 0) + 1}`;
}

async function logEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  incidentId: string,
  message: string,
  userId: string
) {
  await supabase.from("incident_events").insert({
    incident_id: incidentId,
    message,
    created_by: userId,
    occurred_at: new Date().toISOString(),
  });
}

/** Log a new incident (§1.7 "Log Incident" action). */
export async function createIncident(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "") as IncidentCategory;
  const department = String(formData.get("department") ?? "") || null;
  const priority = String(formData.get("priority") ?? "medium") as PriorityLevel;
  const room = String(formData.get("room") ?? "").trim() || null;
  const guestName = String(formData.get("guestName") ?? "").trim() || null;
  const periodOfStay = String(formData.get("periodOfStay") ?? "").trim() || null;
  const nationality = String(formData.get("nationality") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const source = String(formData.get("source") ?? "").trim() || null;
  const caseSubtype = String(formData.get("caseSubtype") ?? "").trim() || null;
  const loggedBy = String(formData.get("loggedBy") ?? "").trim() || null;
  const costRaw = String(formData.get("cost") ?? "").trim();
  const currency = String(formData.get("currency") ?? "").trim() || null;
  const departmentRaw = String(formData.get("departmentRaw") ?? "").trim() || null;
  const reportedDate = String(formData.get("reportedDate") ?? "").trim();
  const reportedTime = String(formData.get("reportedTime") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim();

  if (!title || !category) {
    return { error: "Title and category are required." };
  }

  let cost: number | null = null;
  if (costRaw) {
    const parsedCost = Number(costRaw.replace(/,/g, ""));
    if (!Number.isFinite(parsedCost)) return { error: "Cost must be a number." };
    cost = parsedCost;
  }

  let reportedAt: string | undefined;
  if (reportedDate && reportedTime) {
    const parsed = fromDatetimeLocalValue(`${reportedDate}T${reportedTime}`, user.currentHotel.timezone);
    if (!parsed) return { error: "Invalid reported date/time." };
    reportedAt = parsed;
  } else if (reportedDate || reportedTime) {
    return { error: "Please provide both reported date and time." };
  }

  const incidentNumber = await nextIncidentNumber(supabase, user.currentHotel.id);

  const { data, error } = await supabase
    .from("incidents")
    .insert({
      incident_number: incidentNumber,
      hotel_id: user.currentHotel.id,
      category,
      title,
      room,
      department: department && department !== "none" ? (department as Department) : null,
      priority,
      status: "Pending",
      guest_name: guestName,
      period_of_stay: periodOfStay,
      nationality,
      location,
      source,
      case_subtype: caseSubtype,
      logged_by: loggedBy,
      cost,
      currency,
      department_raw: departmentRaw,
      details,
      ...(reportedAt ? { reported_at: reportedAt } : {}),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Could not log incident. Please try again." };
  }

  await logEvent(supabase, data.id, notes || `Incident logged by ${user.profile.fullName}.`, user.id);

  revalidatePath("/incidents");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Update incident status (§1.7 "Update Incident" action). */
export async function updateIncidentStatus(incidentId: string, status: IncidentStatus) {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("incidents")
    .update({ status })
    .eq("id", incidentId)
    .eq("hotel_id", user.currentHotel.id);

  if (error) return { error: "Could not update status." };

  await logEvent(supabase, incidentId, `Status changed to "${status}" by ${user.profile.fullName}.`, user.id);

  revalidatePath("/incidents");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Assign / reassign an incident to a staff member. */
export async function assignIncident(incidentId: string, assigneeId: string | null) {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("incidents")
    .update({ assigned_to: assigneeId })
    .eq("id", incidentId)
    .eq("hotel_id", user.currentHotel.id);

  if (error) return { error: "Could not update assignee." };

  revalidatePath("/incidents");
  return { success: true };
}

/**
 * Update an incident's editable details — title, guest info, classification,
 * and the report-export fields (period of stay, nationality, location,
 * details). Used to correct or fill in fields pulled in from an imported
 * Guest Feedback Report PDF.
 */
export async function updateIncidentGuestDetails(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const incidentId = String(formData.get("incidentId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const guestName = String(formData.get("guestName") ?? "").trim() || null;
  const room = String(formData.get("room") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "") as IncidentCategory;
  const departmentSelect = String(formData.get("department") ?? "");
  const priority = String(formData.get("priority") ?? "") as PriorityLevel;
  const periodOfStay = String(formData.get("periodOfStay") ?? "").trim() || null;
  const nationality = String(formData.get("nationality") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const details = String(formData.get("details") ?? "").trim() || null;
  const source = String(formData.get("source") ?? "").trim() || null;
  const caseSubtype = String(formData.get("caseSubtype") ?? "").trim() || null;
  const costRaw = String(formData.get("cost") ?? "").trim();
  const currency = String(formData.get("currency") ?? "").trim() || null;
  const departmentRaw = String(formData.get("departmentRaw") ?? "").trim() || null;
  const loggedBy = String(formData.get("loggedBy") ?? "").trim() || null;
  const reportedDate = String(formData.get("reportedDate") ?? "").trim();
  const reportedTime = String(formData.get("reportedTime") ?? "").trim();

  if (!incidentId) return { error: "Missing incident." };
  if (!title) return { error: "Title is required." };
  if (!category) return { error: "Category is required." };

  let cost: number | null = null;
  if (costRaw) {
    const parsedCost = Number(costRaw.replace(/,/g, ""));
    if (!Number.isFinite(parsedCost)) return { error: "Cost must be a number." };
    cost = parsedCost;
  }

  let reportedAt: string | undefined;
  if (reportedDate && reportedTime) {
    const parsed = fromDatetimeLocalValue(`${reportedDate}T${reportedTime}`, user.currentHotel.timezone);
    if (!parsed) return { error: "Invalid reported date/time." };
    reportedAt = parsed;
  } else if (reportedDate || reportedTime) {
    return { error: "Please provide both reported date and time." };
  }

  const department = departmentSelect && departmentSelect !== "none" ? (departmentSelect as Department) : null;

  const { error } = await supabase
    .from("incidents")
    .update({
      title,
      guest_name: guestName,
      room,
      category,
      department,
      priority: priority || undefined,
      period_of_stay: periodOfStay,
      nationality,
      location,
      details,
      source,
      case_subtype: caseSubtype,
      cost,
      currency,
      department_raw: departmentRaw,
      logged_by: loggedBy,
      reported_at: reportedAt,
    })
    .eq("id", incidentId)
    .eq("hotel_id", user.currentHotel.id);

  if (error) return { error: "Could not save incident details." };

  revalidatePath("/incidents");
  return { success: true };
}

/** Update the recovery action / resolution fields. */
export async function updateIncidentRecovery(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const incidentId = String(formData.get("incidentId") ?? "");
  const recoveryAction = String(formData.get("recoveryAction") ?? "").trim();
  const resolution = String(formData.get("resolution") ?? "").trim();

  if (!incidentId) return { error: "Missing incident." };

  const { error } = await supabase
    .from("incidents")
    .update({
      recovery_action: recoveryAction || null,
      resolution: resolution || null,
    })
    .eq("id", incidentId)
    .eq("hotel_id", user.currentHotel.id);

  if (error) return { error: "Could not save recovery details." };

  await logEvent(supabase, incidentId, `Recovery / resolution updated by ${user.profile.fullName}.`, user.id);

  revalidatePath("/incidents");
  return { success: true };
}

/** Add a free-text timeline note. */
export async function addIncidentNote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const incidentId = String(formData.get("incidentId") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  if (!incidentId || !message) return { error: "Note cannot be empty." };

  await logEvent(supabase, incidentId, message, user.id);

  revalidatePath("/incidents");
  return { success: true };
}

/**
 * "Escalate to GM" action (§1.7, §3.2 item 9) — sets status to Escalated,
 * creates an `escalations` record for the General Manager, and pushes a
 * notification (LINE push handled downstream by the notifications worker).
 */
export async function escalateIncident(incidentId: string) {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("incidents")
    .update({ status: "Escalated" })
    .eq("id", incidentId)
    .eq("hotel_id", user.currentHotel.id);

  if (error) return { error: "Could not escalate incident." };

  await logEvent(supabase, incidentId, `Escalated to General Manager by ${user.profile.fullName}.`, user.id);

  await supabase.from("escalations").insert({
    hotel_id: user.currentHotel.id,
    source_table: "incidents",
    source_id: incidentId,
    escalated_by: user.id,
    escalated_to_role: "general_manager",
    reason: `Incident escalated by ${user.profile.fullName}`,
    status: "Open",
  });

  await notifyHotel(supabase, user.currentHotel.id, {
    recipient_role: "general_manager",
    type: "escalation",
    title: "Incident escalated",
    body: `An incident was escalated by ${user.profile.fullName}.`,
    source_table: "incidents",
    source_id: incidentId,
    priority: "high",
  });

  revalidatePath("/incidents");
  revalidatePath("/dashboard");
  return { success: true };
}

// ============================================================================
// Guest Feedback Report PDF import
// ============================================================================

// Report status text → IncidentStatus. "close"/"closed" map to "Closed"
// rather than "Resolved" since the report doesn't distinguish the two and
// "Closed" is the more conservative (terminal) state.
const FEEDBACK_STATUS_MAP: Record<string, IncidentStatus> = {
  close: "Closed",
  closed: "Closed",
  resolved: "Resolved",
  pending: "Pending",
  "under investigation": "Pending",
  open: "Pending",
  "in progress": "In Progress",
  escalated: "Escalated",
};

// "Department Concerned" tokens (e.g. "ENG", "S&M , FB") → Department. Codes
// with no equivalent in the `Department` enum (e.g. "S&M") are skipped — the
// raw text is preserved in `department_raw`.
const FEEDBACK_DEPARTMENT_MAP: Record<string, Department> = {
  eng: "Engineering",
  engineering: "Engineering",
  fb: "F&B",
  "f&b": "F&B",
  fo: "Front Office",
  "front office": "Front Office",
  hk: "Housekeeping",
  housekeeping: "Housekeeping",
  sec: "Security",
  security: "Security",
  concierge: "Concierge",
  fin: "Finance",
  finance: "Finance",
};

const FEEDBACK_MAINTENANCE_RE = /water|leak|drainage|aircon|air[\s-]?con|electrical|plumbing|maintenance|noise/i;
const FEEDBACK_FB_RE = /menu|food|breakfast|dinner|lunch|restaurant|buffet|beverage|\bbar\b/i;

function mapFeedbackStatus(raw: string | null): IncidentStatus {
  if (!raw) return "Pending";
  return FEEDBACK_STATUS_MAP[raw.trim().toLowerCase()] ?? "Pending";
}

function mapFeedbackDepartment(raw: string | null): Department | null {
  if (!raw) return null;
  const tokens = raw
    .split(/[,&]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  for (const token of tokens) {
    if (FEEDBACK_DEPARTMENT_MAP[token]) return FEEDBACK_DEPARTMENT_MAP[token];
  }
  return null;
}

function mapFeedbackCategory(caseType: string | null, caseSubtype: string | null): IncidentCategory {
  const text = `${caseType ?? ""} ${caseSubtype ?? ""}`;
  if (FEEDBACK_MAINTENANCE_RE.test(text)) return "Maintenance";
  if (FEEDBACK_FB_RE.test(text)) return "F&B";
  return "Guest Complaint";
}

function buildFeedbackTitle(caseType: string | null, caseSubtype: string | null): string {
  if (caseType && caseSubtype && caseType !== caseSubtype) return `${caseType} – ${caseSubtype}`;
  return caseType ?? caseSubtype ?? "Guest feedback case";
}

function buildGuestNotes(periodOfStay: string | null, nationality: string | null): string | null {
  const lines: string[] = [];
  if (periodOfStay) lines.push(`Period of stay: ${periodOfStay}`);
  if (nationality) lines.push(`Nationality: ${nationality}`);
  return lines.length > 0 ? lines.join("\n") : null;
}

/**
 * Combine the report date and a case's "Time" cell into an ISO timestamp.
 * Guest Feedback Reports don't carry timezone info; StayFlow currently
 * targets Thailand-based hotels, so times are interpreted as Asia/Bangkok
 * (UTC+7).
 */
function buildFeedbackReportedAt(reportDate: string | null, time: string | null): string {
  const date = reportDate ?? new Date().toISOString().slice(0, 10);
  const t = time && /^\d{1,2}:\d{2}$/.test(time) ? time.padStart(5, "0") : "00:00";
  const parsed = new Date(`${date}T${t}:00+07:00`);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

/**
 * Import a "Guest Feedback Report" PDF (Incident Tracker) — parses the
 * uploaded report and creates one incident per case, pre-filling guest
 * details, source, cost, status and department from the report. Re-running
 * the import is safe: a case is matched against an existing incident on
 * (hotel_id, room, reported_at) and updated in place rather than duplicated.
 */
export async function importGuestFeedbackFromPdf(
  _prev: ImportGuestFeedbackState,
  formData: FormData
): Promise<ImportGuestFeedbackState> {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const hotelId = user.currentHotel.id;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a PDF file to import." };
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { error: "Please upload a PDF file." };
  }

  let parsed;
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    parsed = await parseGuestFeedbackPdf(data);
  } catch (err) {
    console.error("importGuestFeedbackFromPdf: failed to parse PDF", err);
    return { error: "Could not read this PDF. Please check the file and try again." };
  }

  if (parsed.cases.length === 0) {
    return { error: "No guest feedback cases were recognized in this PDF.", warnings: parsed.warnings };
  }

  let nextNumber: number | null = null;
  async function allocateIncidentNumber() {
    if (nextNumber === null) {
      const { count } = await supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .eq("hotel_id", hotelId);
      nextNumber = 80 + (count ?? 0) + 1;
    }
    const n = nextNumber;
    nextNumber += 1;
    return `INC-${n}`;
  }

  let imported = 0;
  let updated = 0;
  const warnings = [...parsed.warnings];

  for (const c of parsed.cases) {
    const reportedAt = buildFeedbackReportedAt(parsed.reportDate, c.time);

    const sharedFields = {
      category: mapFeedbackCategory(c.caseType, c.caseSubtype),
      title: buildFeedbackTitle(c.caseType, c.caseSubtype),
      room: c.room,
      department: mapFeedbackDepartment(c.department),
      status: mapFeedbackStatus(c.status),
      resolution: c.resolution,
      guest_name: c.guestName,
      source: c.source,
      case_subtype: c.caseSubtype,
      details: c.details,
      cost: c.cost,
      currency: c.currency,
      logged_by: c.loggedBy,
      guest_notes: buildGuestNotes(c.periodOfStay, c.nationality),
      department_raw: c.department,
      period_of_stay: c.periodOfStay,
      nationality: c.nationality,
      location: c.location,
      reported_at: reportedAt,
    };

    // Re-importing the same report should update the matching case rather
    // than create a duplicate.
    const { data: existing } = await supabase
      .from("incidents")
      .select("id")
      .eq("hotel_id", hotelId)
      .eq("room", c.room)
      .eq("reported_at", reportedAt)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("incidents").update(sharedFields).eq("id", existing.id);
      if (!error) {
        updated += 1;
      } else {
        warnings.push(`Room ${c.room ?? "?"}: could not update (${error.message}).`);
      }
    } else {
      const incident_number = await allocateIncidentNumber();
      const { data: inserted, error } = await supabase
        .from("incidents")
        .insert({
          ...sharedFields,
          incident_number,
          hotel_id: hotelId,
          priority: "medium" as PriorityLevel,
        })
        .select("id")
        .single();

      if (!error && inserted) {
        imported += 1;
        await logEvent(
          supabase,
          inserted.id,
          `Imported from Guest Feedback Report (${parsed.reportDate ?? "unknown date"}).`,
          user.id
        );
      } else {
        warnings.push(`Room ${c.room ?? "?"}: could not import (${error?.message ?? "unknown error"}).`);
      }
    }
  }

  revalidatePath("/incidents");
  revalidatePath("/dashboard");

  return { success: true, imported, updated, warnings };
}

// ============================================================================
// Guest Feedback Report PDF export
// ============================================================================

export interface ExportPdfResult {
  filename: string;
  /** Base64-encoded PDF bytes (server actions can't return raw Buffers). */
  base64: string;
}

export type ExportPdfResponse = ExportPdfResult | { error: string };

/**
 * Export a single incident as a Guest Feedback Report-style PDF — same grid
 * layout as the imported report, with a one-row table for this incident.
 */
export async function exportIncidentReportPdf(incidentId: string): Promise<ExportPdfResponse> {
  const user = await getCurrentUser();
  const timezone = user.currentHotel.timezone;

  const incident = await getIncident(user.currentHotel.id, incidentId);
  if (!incident) return { error: "Incident not found." };

  const pdf = buildGuestFeedbackReportPdf({
    hotelName: user.currentHotel.name,
    reportDateLabel: formatReportDate(new Date(incident.reportedAt), timezone),
    subtitle: `Incident ${incident.incidentNumber}`,
    rows: [incidentToReportRow(incident, timezone)],
  });

  return {
    filename: `Guest-Feedback-Report-${incident.incidentNumber}.pdf`,
    base64: pdf.toString("base64"),
  };
}

/**
 * Export all incidents reported within `[from, to]` (inclusive,
 * "YYYY-MM-DD", evaluated in the hotel's local timezone) as a multi-row
 * Guest Feedback Report PDF, mirroring the imported report's layout.
 */
export async function exportGuestFeedbackReportPdf(from: string, to: string): Promise<ExportPdfResponse> {
  const user = await getCurrentUser();
  const timezone = user.currentHotel.timezone;

  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return { error: "Please choose a valid date range." };
  }
  if (from > to) {
    return { error: "Start date must be before end date." };
  }

  const incidents = await getIncidentsForReport(user.currentHotel.id, from, to, timezone);
  if (incidents.length === 0) {
    return { error: "No incidents were logged in this date range." };
  }

  const reportDateLabel =
    from === to ? formatYmdLabel(from) : `${formatYmdLabel(from)} - ${formatYmdLabel(to)}`;

  const pdf = buildGuestFeedbackReportPdf({
    hotelName: user.currentHotel.name,
    reportDateLabel,
    rows: incidents.map((incident) => incidentToReportRow(incident, timezone)),
  });

  return {
    filename: `Guest-Feedback-Report-${from}_to_${to}.pdf`,
    base64: pdf.toString("base64"),
  };
}
