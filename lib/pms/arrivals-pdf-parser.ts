/**
 * PMS "Arrivals: Detailed" report importer (§3.2 item 7, Arrival & VIP Board).
 *
 * Opera-style `res_detail` PDF reports do not store text in visual reading
 * order — the underlying content stream can interleave columns/rows. To
 * reconstruct the report as a table we read each text item's position
 * (`transform` matrix from pdf.js `getTextContent()`), cluster items into
 * rows by their y-coordinate, and sort each row's items by x-coordinate.
 *
 * From the reconstructed lines we then pattern-match each reservation's
 * "main" row (room, guest name, company/TA, arrival & departure dates, room
 * type, Adl./Chl./Rms.) plus the following "Conf No. / VIP" row, and collect
 * any remaining free-text lines (Reservation/Profile/General Notes, Traces,
 * Specials, Share with:, Routing Instruction, etc.) as `pmsNotes` until the
 * next reservation's main row begins.
 *
 * This is a best-effort parser tailored to the Centara/Opera "Arrivals:
 * Detailed" layout observed in practice. Re-running the import is safe —
 * results are upserted on (hotel_id, confirmation_number).
 */

export interface ParsedArrival {
  room: string | null;
  guestName: string;
  isRepeatGuest: boolean;
  company: string | null;
  arrivalDate: string; // YYYY-MM-DD
  departureDate: string | null; // YYYY-MM-DD
  roomType: string | null;
  adults: number | null;
  children: number | null;
  rooms: number | null;
  nights: number | null;
  confirmationNumber: string | null;
  vipTier: "Standard" | "VIP";
  pmsNotes: string | null;
  /** Auto-detected from `pmsNotes` (VIP/VVIP, anniversary, allergy, wheelchair, etc.) or a VIP code on the Conf. No. row. */
  vipArrival: boolean;
  /** Short bulleted summary of important info auto-extracted from `pmsNotes`. */
  notesSummary: string | null;
}

export interface ParseArrivalsResult {
  hotelName: string | null;
  reportDate: string | null; // YYYY-MM-DD, from the report header
  arrivals: ParsedArrival[];
  warnings: string[];
}

const BOILERPLATE_PATTERNS: RegExp[] = [
  /^Centara /,
  /^Arrivals: Detailed/,
  /^\d{1,2}:\d{2}$/,
  /^Room Name Company/,
  /^No\. Type Code Code Status/,
  /^Travel Agent$/,
  /^Source$/,
  /^Conf No\. VIP/,
  /^Room # of Arrival/,
  /^Filter Arrival from Date/,
  /^Room Class All Room Types/,
  /^Market Code All Source/,
  /^From Arrival Time/,
  /^Include Pseudo Rooms/,
  /^Comment Type All Including/,
  /^Arrival Date Total/,
  /^Grand Total/,
];

const ARRIVAL_DATE_HEADER_RE = /^Arrival Date (\d{2}\/\d{2}\/\d{2})$/;

// Room No., optional repeat-guest "*", guest name (+ optional company/TA),
// Arr. Date, Dep. Date, Room Type, Adl., Chl., Rms., then the rest of the row.
const MAIN_ROW_RE =
  /^(\d{4})\s+(\*)?(.+?)\s+(\d{2}\/\d{2}\/\d{2})\s+(\d{2}\/\d{2}\/\d{2})\s+([A-Z0-9]{4,6})\s+(\d+)\s+(\d+)\s+(\d+)\s*(.*)$/;

// 9-digit Conf No., optionally followed by a VIP code (VIPL, VIP4, VIPR, ...)
const CONF_ROW_RE = /^(\d{9})(?:\s+(VIP\S*))?/;

/** Convert a PMS DD/MM/YY date to an ISO YYYY-MM-DD date (assumes 20YY). */
function toIsoDate(ddmmyy: string): string {
  const [dd, mm, yy] = ddmmyy.split("/");
  return `20${yy}-${mm}-${dd}`;
}

function nightsBetween(arrivalIso: string, departureIso: string): number | null {
  const arr = new Date(arrivalIso);
  const dep = new Date(departureIso);
  if (Number.isNaN(arr.getTime()) || Number.isNaN(dep.getTime())) return null;
  const diffMs = dep.getTime() - arr.getTime();
  const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return nights >= 0 ? nights : null;
}

/**
 * Format a "Last,First[,Title]" PMS name as "First Last [Title]". Falls back
 * to the raw string if it doesn't look like a comma-separated name.
 */
function formatGuestName(raw: string): string {
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const [last, first, title] = parts;
    return [first, last, title].filter(Boolean).join(" ");
  }
  return raw.trim();
}

/** Split "<name> T- <company/travel agent>" into its two parts. */
function splitNameAndCompany(raw: string): { name: string; company: string | null } {
  const idx = raw.indexOf(" T- ");
  if (idx === -1) return { name: raw.trim(), company: null };
  return { name: raw.slice(0, idx).trim(), company: raw.slice(idx + 1).trim() };
}

function isBoilerplate(line: string): boolean {
  return BOILERPLATE_PATTERNS.some((re) => re.test(line));
}

// Keywords in PMS reservation/profile notes that signal a guest deserves
// extra attention on arrival — VIP codes, special occasions, accessibility
// or dietary needs, VVIP-adjacent affiliations, etc.
const VIP_KEYWORD_RE =
  /\b(VVIP|VIP\S*|anniversary|honeymoon|birthday|wedding|allerg\w*|wheelchair|accessib\w*|disab\w*|celebrat\w*|repeat guest|long\s*stay|complain\w*|embassy|ambassador|owner'?s?|shareholder|press|media|government)\b/i;

/**
 * Scan an arrival's `pmsNotes` for VIP-related keywords (VIP/VVIP codes,
 * special occasions, accessibility/dietary needs, etc.). Returns whether the
 * "VIP arrival" flag should be auto-set, and a short bulleted summary of the
 * matching note lines to surface on the arrival card/detail.
 */
function summarizeNotes(pmsNotes: string | null): { vipArrival: boolean; notesSummary: string | null } {
  if (!pmsNotes) return { vipArrival: false, notesSummary: null };

  const lines = pmsNotes
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const matches: string[] = [];
  for (const line of lines) {
    if (VIP_KEYWORD_RE.test(line)) {
      matches.push(line);
      if (matches.length >= 5) break;
    }
  }

  if (matches.length === 0) return { vipArrival: false, notesSummary: null };

  const joined = matches.map((l) => `• ${l}`).join("\n");
  return {
    vipArrival: true,
    notesSummary: joined.length > 600 ? `${joined.slice(0, 600)}…` : joined,
  };
}

/**
 * Reconstruct row-major text lines from a PDF buffer using pdf.js position
 * data. Groups text items by y-coordinate (rows) with a small tolerance,
 * then orders items within a row by x-coordinate. Adjacent items are joined
 * without a space when they're touching (small x-gap), matching how the
 * source PDF visually renders adjacent codes (e.g. "BARGR" + "PROP").
 */
async function extractLines(data: Uint8Array): Promise<string[]> {
  // Use the legacy build for Node.js (server actions run in a Node runtime).
  // pdfjs-dist doesn't ship type declarations for this subpath, so import it
  // dynamically as `any`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // pdf.js needs to know where its worker script lives. In a Next.js server
  // action the relative dynamic import pdf.js normally uses to load the
  // worker doesn't survive webpack bundling ("Setting up fake worker
  // failed: Cannot find module '.../pdf.worker.mjs'"), so resolve the real
  // on-disk path via Node's `require.resolve` and hand it to pdf.js
  // explicitly.
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    const { createRequire } = await import("module");
    const nodeRequire = createRequire(import.meta.url);
    pdfjsLib.GlobalWorkerOptions.workerSrc = nodeRequire.resolve(
      "pdfjs-dist/legacy/build/pdf.worker.mjs"
    );
  }

  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;

  const lines: string[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    interface Item {
      str: string;
      x: number;
      y: number;
      width: number;
    }

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

    // Sort top-to-bottom (pdf.js y increases upward), then left-to-right.
    items.sort((a, b) => b.y - a.y || a.x - b.x);

    const rows: Item[][] = [];
    for (const item of items) {
      const lastRow = rows[rows.length - 1];
      if (lastRow && Math.abs(lastRow[0].y - item.y) < 2.5) {
        lastRow.push(item);
      } else {
        rows.push([item]);
      }
    }

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

    await page.cleanup();
  }

  return lines;
}

/**
 * Parse an Opera-style "Arrivals: Detailed" PMS PDF report into structured
 * reservation rows ready to be upserted into the `arrivals` table.
 */
export async function parseArrivalsPdf(data: Uint8Array): Promise<ParseArrivalsResult> {
  const allLines = await extractLines(data);
  const warnings: string[] = [];

  let hotelName: string | null = null;
  let reportDate: string | null = null;

  const filtered: string[] = [];
  for (const line of allLines) {
    const dateHeader = ARRIVAL_DATE_HEADER_RE.exec(line);
    if (dateHeader) {
      reportDate = toIsoDate(dateHeader[1]);
      continue;
    }
    if (isBoilerplate(line)) continue;
    filtered.push(line);
  }

  // First non-boilerplate line is typically "<Hotel Name> DD/MM/YY".
  if (filtered.length > 0) {
    const m = /^(.*?)\s+\d{2}\/\d{2}\/\d{2}$/.exec(filtered[0]);
    if (m) {
      hotelName = m[1].trim();
      filtered.shift();
    }
  }

  const arrivals: ParsedArrival[] = [];
  let i = 0;

  while (i < filtered.length) {
    const line = filtered[i];
    const main = MAIN_ROW_RE.exec(line);
    if (!main) {
      i += 1;
      continue;
    }

    const [, room, star, nameAndCompany, arr, dep, roomType, adl, chl, rms] = main;
    const { name, company } = splitNameAndCompany(nameAndCompany);

    const arrivalDate = toIsoDate(arr);
    const departureDate = toIsoDate(dep);

    const parsed: ParsedArrival = {
      room: String(parseInt(room, 10)),
      guestName: formatGuestName(name),
      isRepeatGuest: Boolean(star),
      company,
      arrivalDate,
      departureDate,
      roomType,
      adults: Number(adl),
      children: Number(chl),
      rooms: Number(rms),
      nights: nightsBetween(arrivalDate, departureDate),
      confirmationNumber: null,
      vipTier: "Standard",
      pmsNotes: null,
      vipArrival: false,
      notesSummary: null,
    };

    i += 1;

    // Look ahead for the "Conf No. [VIP] ..." row, which usually follows
    // immediately but can be preceded by a stray continuation line (e.g. a
    // wrapped "Share with:" name). Anything before it becomes a note.
    const noteLines: string[] = [];
    while (i < filtered.length && !MAIN_ROW_RE.test(filtered[i])) {
      const conf = CONF_ROW_RE.exec(filtered[i]);
      if (conf) {
        parsed.confirmationNumber = conf[1];
        if (conf[2]) parsed.vipTier = "VIP";
        i += 1;
        break;
      }
      noteLines.push(filtered[i]);
      i += 1;
    }

    // Collect remaining free-text lines (notes, traces, share with, etc.)
    // until the next reservation's main row.
    while (i < filtered.length && !MAIN_ROW_RE.test(filtered[i])) {
      noteLines.push(filtered[i]);
      i += 1;
    }

    if (noteLines.length > 0) {
      const joined = noteLines.join("\n").trim();
      parsed.pmsNotes = joined.length > 4000 ? `${joined.slice(0, 4000)}…` : joined;
    }

    const { vipArrival, notesSummary } = summarizeNotes(parsed.pmsNotes);
    parsed.vipArrival = vipArrival || parsed.vipTier === "VIP";
    parsed.notesSummary = notesSummary;

    arrivals.push(parsed);
  }

  if (arrivals.length === 0) {
    warnings.push("No reservation rows could be recognized in this PDF.");
  }

  return { hotelName, reportDate, arrivals, warnings };
}
