/**
 * "Guest Feedback Report" PDF importer (Incident Tracker).
 *
 * Unlike the Arrivals "res_detail" report (a row-per-line table), the Guest
 * Feedback Report is a true grid: each case occupies a tall row spanning
 * several lines, with up to 13 columns (Room No., Guest Name, Source, Time,
 * Case Type, Case Subtype, Location, Details, Resolution, Cost, Status,
 * Department Concerned, Logged By). Cell text wraps across multiple lines
 * within the same row.
 *
 * pdf.js `getTextContent()` only gives us each text item's position
 * (`transform` matrix → x/y, pdf.js y increases upward) — it does not expose
 * the table's border rectangles. We therefore reconstruct the grid using
 * hardcoded column x-ranges (derived from the report's actual cell borders)
 * and detect row boundaries from the "Room No." column: each case's room
 * number is roughly vertically centered in its row, so the midpoint between
 * two consecutive room-number y-positions approximates the boundary between
 * those rows. The header row's bottom and the "Total case : N" footer's top
 * (when present) bound the first and last rows.
 *
 * This is a best-effort parser tailored to this report layout. Re-running
 * the import is safe — see `importGuestFeedbackFromPdf`.
 */

export interface ParsedFeedbackCase {
  room: string | null;
  guestName: string | null;
  periodOfStay: string | null;
  nationality: string | null;
  source: string | null;
  time: string | null;
  caseType: string | null;
  caseSubtype: string | null;
  location: string | null;
  details: string | null;
  resolution: string | null;
  cost: number | null;
  currency: string | null;
  status: string | null;
  department: string | null;
  loggedBy: string | null;
}

export interface ParseGuestFeedbackResult {
  reportDate: string | null; // YYYY-MM-DD, from the report header
  cases: ParsedFeedbackCase[];
  warnings: string[];
}

interface Item {
  str: string;
  x: number;
  y: number;
  width: number;
}

// Column x-ranges (points), derived from the report's table border
// rectangles. [start, end) — a column run from roughly start to end.
const COLUMNS: Record<string, [number, number]> = {
  room: [19.7, 62.5],
  guestName: [62.5, 167.8],
  source: [167.8, 205.8],
  time: [205.8, 243.1],
  caseType: [243.1, 286.4],
  caseSubtype: [286.4, 329.7],
  location: [329.7, 369.6],
  details: [369.6, 549.3],
  resolution: [549.3, 697.9],
  cost: [697.9, 727.7],
  status: [727.7, 757.4],
  department: [757.4, 791.2],
  loggedBy: [791.2, 820.9],
};

// Distinctive header labels used to find the header row's y-position.
const HEADER_MARKERS = new Set(["Resolution", "Subtype", "Concerned", "Logged"]);

const MONTHS: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

const DATE_RE = /^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/;
const PERIOD_RE = /^Period of stay\s*:\s*(.+)$/i;
const NATIONALITY_RE = /^Nationality\s*:\s*(.+)$/i;
const COST_RE = /^([\d,]+(?:\.\d+)?)\s*([A-Za-z]{2,5})?$/;

/** Parse a "DD/Mon/YYYY" report date into "YYYY-MM-DD". */
function parseReportDate(raw: string): string | null {
  const m = DATE_RE.exec(raw);
  if (!m) return null;
  const [, dd, mon, yyyy] = m;
  const mm = MONTHS[mon.toLowerCase()];
  if (!mm) return null;
  return `${yyyy}-${mm}-${dd.padStart(2, "0")}`;
}

/**
 * Group a set of text items (already scoped to a single cell) into lines by
 * y-coordinate, ordering lines top-to-bottom and items within a line
 * left-to-right, joining with a space wherever there's a visible x-gap.
 */
function linesFromItems(items: Item[], tolerance = 2.5): string[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);

  const rows: Item[][] = [];
  for (const item of sorted) {
    const lastRow = rows[rows.length - 1];
    if (lastRow && Math.abs(lastRow[0].y - item.y) < tolerance) {
      lastRow.push(item);
    } else {
      rows.push([item]);
    }
  }

  const lines: string[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
    let text = "";
    let prevEndX: number | null = null;
    for (const item of row) {
      if (prevEndX !== null) {
        const gap = item.x - prevEndX;
        text += gap > 1 ? " " : "";
      }
      text += item.str;
      prevEndX = item.x + item.width;
    }
    const trimmed = text.replace(/\s+/g, " ").trim();
    if (trimmed) lines.push(trimmed);
  }

  return lines;
}

/** Join cell lines into a single text value, or null if empty. */
function joinLines(lines: string[]): string | null {
  const joined = lines.join(" ").replace(/\s+/g, " ").trim();
  return joined || null;
}

/** Parse a "3,000THB"-style cost cell into amount + currency. */
function parseCost(raw: string | null): { cost: number | null; currency: string | null } {
  if (!raw) return { cost: null, currency: null };
  const m = COST_RE.exec(raw.replace(/\s+/g, ""));
  if (!m) return { cost: null, currency: null };
  const amount = Number(m[1].replace(/,/g, ""));
  return { cost: Number.isFinite(amount) ? amount : null, currency: m[2] ?? null };
}

/**
 * Extract raw text items (with position) from every page of the PDF using
 * pdf.js. Returns one array of items per page, in pdf.js coordinates (y
 * increases upward, origin at bottom-left).
 */
async function extractPages(data: Uint8Array): Promise<Item[][]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // See arrivals-pdf-parser.ts for why this is necessary in a Next.js
  // server action ("Setting up fake worker failed").
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    const { createRequire } = await import("module");
    const nodeRequire = createRequire(import.meta.url);
    pdfjsLib.GlobalWorkerOptions.workerSrc = nodeRequire.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
  }

  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;

  const pages: Item[][] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    const items: Item[] = [];
    for (const raw of content.items) {
      const it = raw as { str?: string; transform?: number[]; width?: number };
      if (!it.str || !it.str.trim() || !it.transform) continue;
      items.push({
        str: it.str,
        x: it.transform[4],
        y: it.transform[5],
        width: it.width ?? 0,
      });
    }

    pages.push(items);
    await page.cleanup();
  }

  return pages;
}

/**
 * Parse a "Guest Feedback Report" PDF into structured per-case rows ready to
 * be upserted into the `incidents` table.
 */
export async function parseGuestFeedbackPdf(data: Uint8Array): Promise<ParseGuestFeedbackResult> {
  const pages = await extractPages(data);
  const warnings: string[] = [];
  let reportDate: string | null = null;
  const cases: ParsedFeedbackCase[] = [];

  for (const items of pages) {
    if (reportDate === null) {
      for (const item of items) {
        const parsed = parseReportDate(item.str.trim());
        if (parsed) {
          reportDate = parsed;
          break;
        }
      }
    }

    // Header row: bounded above by the topmost header label, so any item
    // strictly below it is part of the table body or footer.
    let headerY = Infinity;
    for (const item of items) {
      if (HEADER_MARKERS.has(item.str.trim())) {
        headerY = Math.min(headerY, item.y);
      }
    }

    // Footer: "Total case : N" line, left-aligned under the table.
    let footerY = -Infinity;
    for (const item of items) {
      if (item.str.trim() === "Total" && item.x < 30) {
        footerY = Math.max(footerY, item.y);
      }
    }

    const bodyItems = items.filter((it) => it.y < headerY && it.y > footerY);

    // Room No. anchors — one per case, ordered top to bottom (descending y).
    const [roomMin, roomMax] = COLUMNS.room;
    const anchors = bodyItems
      .filter((it) => it.x >= roomMin && it.x < roomMax && /^\d{1,5}$/.test(it.str.trim()))
      .sort((a, b) => b.y - a.y);

    if (anchors.length === 0) continue;

    // y-boundaries: [headerY, mid(0,1), mid(1,2), ..., footerY]
    const boundaries: number[] = [headerY];
    for (let i = 0; i < anchors.length - 1; i++) {
      boundaries.push((anchors[i].y + anchors[i + 1].y) / 2);
    }
    boundaries.push(footerY);

    for (let i = 0; i < anchors.length; i++) {
      const yTop = boundaries[i];
      const yBottom = boundaries[i + 1];
      const rowItems = bodyItems.filter((it) => it.y > yBottom && it.y <= yTop);

      const cell = (col: keyof typeof COLUMNS): Item[] => {
        const [min, max] = COLUMNS[col];
        return rowItems.filter((it) => it.x >= min && it.x < max);
      };

      const guestNameLines = linesFromItems(cell("guestName"));
      let periodOfStay: string | null = null;
      let nationality: string | null = null;
      const nameLines: string[] = [];
      for (const line of guestNameLines) {
        const period = PERIOD_RE.exec(line);
        const nat = NATIONALITY_RE.exec(line);
        if (period) {
          periodOfStay = period[1].trim();
        } else if (nat) {
          nationality = nat[1].trim();
        } else {
          nameLines.push(line);
        }
      }

      const { cost, currency } = parseCost(joinLines(linesFromItems(cell("cost"))));

      cases.push({
        room: anchors[i].str.trim(),
        guestName: joinLines(nameLines),
        periodOfStay,
        nationality,
        source: joinLines(linesFromItems(cell("source"))),
        time: joinLines(linesFromItems(cell("time"))),
        caseType: joinLines(linesFromItems(cell("caseType"))),
        caseSubtype: joinLines(linesFromItems(cell("caseSubtype"))),
        location: joinLines(linesFromItems(cell("location"))),
        details: joinLines(linesFromItems(cell("details"))),
        resolution: joinLines(linesFromItems(cell("resolution"))),
        cost,
        currency,
        status: joinLines(linesFromItems(cell("status"))),
        department: joinLines(linesFromItems(cell("department"))),
        loggedBy: joinLines(linesFromItems(cell("loggedBy"))),
      });
    }
  }

  if (cases.length === 0) {
    warnings.push("No guest feedback cases were recognized in this PDF.");
  }

  return { reportDate, cases, warnings };
}
