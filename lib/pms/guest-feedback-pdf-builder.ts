/**
 * Guest Feedback Report PDF builder — the export counterpart to
 * `guest-feedback-pdf-parser.ts`. Renders one or many `Incident` rows into a
 * landscape grid that mirrors the imported "Guest Feedback Report" layout
 * (same column x-ranges, header labels, and "Total case : N" footer), so a
 * case logged directly in StayFlow can be exported looking like the original
 * PMS report.
 *
 * Built on the dependency-free `pdf-writer` (see that file for the
 * WinAnsi/Helvetica-only limitation — Thai text is rendered as "?").
 */

import type { Incident } from "@/types/domain";
import { PdfDocument, wrapText } from "./pdf-writer";

// A4 landscape.
const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;

// Same column x-ranges as guest-feedback-pdf-parser.ts's COLUMNS, so the
// exported grid lines up with the imported one.
const COLUMNS: { key: string; label: string; x0: number; x1: number }[] = [
  { key: "room", label: "Room No.", x0: 19.7, x1: 62.5 },
  { key: "guestName", label: "Guest Name", x0: 62.5, x1: 167.8 },
  { key: "source", label: "Source", x0: 167.8, x1: 205.8 },
  { key: "time", label: "Time", x0: 205.8, x1: 243.1 },
  { key: "caseType", label: "Case Type", x0: 243.1, x1: 286.4 },
  { key: "caseSubtype", label: "Case Subtype", x0: 286.4, x1: 329.7 },
  { key: "location", label: "Location", x0: 329.7, x1: 369.6 },
  { key: "details", label: "Details", x0: 369.6, x1: 549.3 },
  { key: "resolution", label: "Resolution", x0: 549.3, x1: 697.9 },
  { key: "cost", label: "Cost", x0: 697.9, x1: 727.7 },
  { key: "status", label: "Status", x0: 727.7, x1: 757.4 },
  { key: "department", label: "Department Concerned", x0: 757.4, x1: 791.2 },
  { key: "loggedBy", label: "Logged By", x0: 791.2, x1: 820.9 },
];

const TABLE_LEFT = COLUMNS[0].x0;
const TABLE_RIGHT = COLUMNS[COLUMNS.length - 1].x1;
const TABLE_TOP = 70;
const PAGE_BOTTOM_MARGIN = 36;

const HEADER_ROW_HEIGHT = 26;
const BODY_FONT_SIZE = 6.5;
const HEADER_FONT_SIZE = 6.5;
const LINE_HEIGHT = 8.5;
const CELL_PAD_X = 3;
const CELL_PAD_Y = 4;
const MIN_ROW_HEIGHT = 18;

export interface ReportRow {
  room: string;
  guestNameLines: string[]; // guest name + "Period of stay : ..." + "Nationality : ..."
  source: string;
  time: string;
  caseType: string;
  caseSubtype: string;
  location: string;
  details: string;
  resolution: string;
  cost: string;
  status: string;
  department: string;
  loggedBy: string;
}

/** Format a Date as "DD/Mon/YYYY" (matches the imported report's date format). */
export function formatReportDate(date: Date, timezone = "Asia/Bangkok"): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")}`;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Format a "YYYY-MM-DD" string as "DD/Mon/YYYY" without any timezone conversion. */
export function formatYmdLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const month = MONTH_NAMES[(m - 1 + 12) % 12] ?? "";
  return `${String(d).padStart(2, "0")}/${month}/${y}`;
}

/** Format a Date as "HH:mm" (24h, matches the imported report's time format). */
export function formatReportTime(date: Date, timezone = "Asia/Bangkok"): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * Split an incident's title back into "Case Type" / "Case Subtype" for the
 * report grid. Imported incidents have `title = "{caseType} – {caseSubtype}"`
 * (see `buildFeedbackTitle`); this reverses that when `caseSubtype` is set
 * and matches the title's suffix, otherwise the whole title is the case
 * type and `caseSubtype` (if any) is shown as-is.
 */
function splitCaseType(incident: Incident): { caseType: string; caseSubtype: string } {
  const subtype = incident.caseSubtype?.trim() || "";
  const title = incident.title ?? "";
  const suffix = ` – ${subtype}`;
  if (subtype && title.endsWith(suffix)) {
    return { caseType: title.slice(0, -suffix.length), caseSubtype: subtype };
  }
  return { caseType: title, caseSubtype: subtype };
}

function formatCost(cost: number | null | undefined, currency: string | null | undefined): string {
  if (cost == null) return "";
  return `${cost.toLocaleString("en-US")}${currency ?? "THB"}`;
}

/** Map an `Incident` to a report grid row. */
export function incidentToReportRow(incident: Incident, timezone = "Asia/Bangkok"): ReportRow {
  const { caseType, caseSubtype } = splitCaseType(incident);

  const guestNameLines: string[] = [];
  if (incident.guestName) guestNameLines.push(incident.guestName);
  if (incident.periodOfStay) guestNameLines.push(`Period of stay : ${incident.periodOfStay}`);
  if (incident.nationality) guestNameLines.push(`Nationality : ${incident.nationality}`);

  return {
    room: incident.room ?? "",
    guestNameLines,
    source: incident.source ?? "StayFlow",
    time: formatReportTime(new Date(incident.reportedAt), timezone),
    caseType,
    caseSubtype,
    location: incident.location ?? "",
    details: incident.details ?? incident.title ?? "",
    resolution: incident.resolution ?? "",
    cost: formatCost(incident.cost, incident.currency),
    status: incident.status,
    department: incident.departmentRaw ?? incident.department ?? "",
    loggedBy: incident.loggedBy ?? incident.assignedTo?.fullName ?? "",
  };
}

interface PreparedRow {
  cellLines: Record<string, string[]>;
  height: number;
}

const cellWidth = (col: (typeof COLUMNS)[number]) => col.x1 - col.x0 - 2 * CELL_PAD_X;

function prepareRow(row: ReportRow): PreparedRow {
  const cellLines: Record<string, string[]> = {};
  let maxLines = 1;

  for (const col of COLUMNS) {
    const w = cellWidth(col);
    let lines: string[];
    if (col.key === "guestName") {
      lines = row.guestNameLines.flatMap((l) => wrapText(l, w, BODY_FONT_SIZE) || [""]);
    } else {
      const value = (row as unknown as Record<string, string>)[col.key] ?? "";
      lines = wrapText(value, w, BODY_FONT_SIZE);
    }
    cellLines[col.key] = lines;
    maxLines = Math.max(maxLines, lines.length);
  }

  const height = Math.max(MIN_ROW_HEIGHT, maxLines * LINE_HEIGHT + 2 * CELL_PAD_Y);
  return { cellLines, height };
}

export interface GuestFeedbackReportOptions {
  hotelName: string;
  /** Header date label, e.g. "10/Jun/2026" or "10/Jun/2026 - 12/Jun/2026". */
  reportDateLabel: string;
  /** Optional second header line, e.g. "Incident INC-091" for single exports. */
  subtitle?: string;
  rows: ReportRow[];
}

/**
 * Render a Guest Feedback Report PDF for one or many rows, mirroring the
 * imported report's grid layout (column positions, header labels, and
 * "Total case : N" footer).
 */
export function buildGuestFeedbackReportPdf(opts: GuestFeedbackReportOptions): Buffer {
  const prepared = opts.rows.map(prepareRow);

  // Pre-paginate so we know the total page count for "Page X of Y".
  const pages: PreparedRow[][] = [];
  let current: PreparedRow[] = [];
  let y = TABLE_TOP + HEADER_ROW_HEIGHT;
  for (const row of prepared) {
    if (y + row.height > PAGE_HEIGHT - PAGE_BOTTOM_MARGIN && current.length > 0) {
      pages.push(current);
      current = [];
      y = TABLE_TOP + HEADER_ROW_HEIGHT;
    }
    current.push(row);
    y += row.height;
  }
  pages.push(current); // always at least one page, even with zero rows
  const totalPages = pages.length;

  const doc = new PdfDocument();

  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    const page = doc.addPage(PAGE_WIDTH, PAGE_HEIGHT);

    // Title block.
    page.drawText("Guest Feedback Report", TABLE_LEFT, 22, 14, "helvetica-bold");
    page.drawText(opts.hotelName, TABLE_LEFT, 38, 10);
    let dateLineY = 52;
    if (opts.subtitle) {
      page.drawText(opts.subtitle, TABLE_LEFT, 52, 9, "helvetica-bold");
      dateLineY = 64;
    }
    page.drawText(`Date: ${opts.reportDateLabel}`, TABLE_LEFT, dateLineY, 9);
    page.drawText(`Page ${pageNum + 1} of ${totalPages}`, TABLE_RIGHT - 70, dateLineY, 9);

    // Header row.
    const headerTop = TABLE_TOP;
    page.drawRect(TABLE_LEFT, headerTop, TABLE_RIGHT - TABLE_LEFT, HEADER_ROW_HEIGHT, 0.5, 0.85);
    for (const col of COLUMNS) {
      const w = cellWidth(col);
      const lines = wrapText(col.label, w, HEADER_FONT_SIZE, "helvetica-bold");
      lines.forEach((line, i) => {
        page.drawText(line, col.x0 + CELL_PAD_X, headerTop + CELL_PAD_Y + 2 + i * LINE_HEIGHT, HEADER_FONT_SIZE, "helvetica-bold");
      });
    }

    // Body rows.
    let rowTop = headerTop + HEADER_ROW_HEIGHT;
    const rowsOnPage = pages[pageNum];
    for (const prep of rowsOnPage) {
      const h = prep.height;
      page.drawRect(TABLE_LEFT, rowTop, TABLE_RIGHT - TABLE_LEFT, h, 0.5);
      for (const col of COLUMNS) {
        const lines = prep.cellLines[col.key];
        lines.forEach((line, i) => {
          page.drawText(line, col.x0 + CELL_PAD_X, rowTop + CELL_PAD_Y + 5 + i * LINE_HEIGHT, BODY_FONT_SIZE);
        });
      }
      rowTop += h;
    }

    // Column separators for this page (header + body together).
    const tableBottom = rowTop;
    for (const col of COLUMNS) {
      page.drawLine(col.x0, headerTop, col.x0, tableBottom, 0.5);
    }
    page.drawLine(TABLE_RIGHT, headerTop, TABLE_RIGHT, tableBottom, 0.5);

    // Footer on the last page.
    if (pageNum === totalPages - 1) {
      page.drawText(`Total case : ${opts.rows.length}`, TABLE_LEFT, tableBottom + 16, 9, "helvetica-bold");
    }
  }

  return doc.build();
}
